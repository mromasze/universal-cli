import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import os from 'os';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import OpenAI from 'openai';
import { createClient } from '../../lib/client.js';
import { SlashCommandHandler } from './slashCommands.js';
import { configManager } from '../../lib/configManager.js';
import { getTheme } from '../../lib/theme.js';
import { FileSystemTools, tools as fsToolsDefinitions } from '../tools/fileSystem.js';
import { runWizard } from '../onboarding/wizard.js';
import { EXPERT_SYSTEM_PROMPT } from '../../lib/systemPrompt.js';
import { checkUpdate } from '../../lib/updateChecker.js';

const MAX_CONTEXT_TOKENS = 128000; // Przybliżona wartość domyślna

function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[mK]/g, '');
}

function truncateMiddle(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  const partLength = Math.floor((maxLength - 3) / 2);
  return str.substring(0, partLength) + '...' + str.substring(str.length - partLength);
}

// Prosta estymacja tokenów (4 znaki ~= 1 token)
function estimateTokens(history: any[]): number {
  const text = JSON.stringify(history);
  return Math.ceil(text.length / 4);
}

export async function startChatSession(projectPath: string = '.') {
  // Sprawdź czy skonfigurowany, jeśli nie -> uruchom wizard
  if (!configManager.getConfig().isConfigured) {
      await runWizard();
  }

  const slashHandler = new SlashCommandHandler();
  // Resolve absolute path for display
  const absolutePath = path.resolve(projectPath);
  const fsTools = new FileSystemTools(projectPath);
  
  await slashHandler.getWelcomeCommand()();
  await checkUpdate(); // Sprawdź aktualizacje
  
  const theme = getTheme();

  const completer = (line: string): [string[], string] => {
    const hits = slashHandler.getCommandNames().filter((c) => c.startsWith(line));
    return [hits.length ? hits : slashHandler.getCommandNames(), line];
  };

  // Hardcoded System Prompt
  const osInfo = `Operating System: ${os.type()} ${os.release()} (${os.platform()})\nShell: ${process.env.SHELL || 'Unknown'}\nNode.js Version: ${process.version}\nCurrent Working Directory: ${absolutePath}`;
  const history: any[] = [
    { role: 'system', content: `${EXPERT_SYSTEM_PROMPT}\n\nSystem Context:\n${osInfo}` }
  ];

  const username = os.userInfo().username || 'User';

  while (true) {
    const conf = configManager.getConfig();
    const client = createClient();
    const t = configManager.t.chat;
    const currentTheme = getTheme();
    
    // UI Elements Calculation
    const width = Math.max((process.stdout.columns || 80) - 2, 40);
    const usedTokens = estimateTokens(history);
    const usagePercent = Math.round((usedTokens / MAX_CONTEXT_TOKENS) * 100);

    const ctxString = `${usedTokens}/${MAX_CONTEXT_TOKENS} (${usagePercent}%)`;
    
    // Status Layout Calculation
    // Static length of labels and fixed chars:
    // "╭─ PATH: " (9) + " USER: " (7) + " MODEL: " (8) + " CTX: " (6) + " ─...╮" (variable)
    // We estimate the static overhead to calculate available space for the path.
    const staticTextLen = 9 + 7 + username.length + 8 + conf.api.model.length + 6 + ctxString.length + 2; 
    const availableForPath = width - staticTextLen;
    
    const displayPath = availableForPath > 10 
        ? truncateMiddle(absolutePath, availableForPath) 
        : truncateMiddle(path.basename(absolutePath), Math.max(10, availableForPath));

    // Calculate padding for the top border
    const currentContentLen = 9 + displayPath.length + 7 + username.length + 8 + conf.api.model.length + 6 + ctxString.length + 1;
    const paddingLen = Math.max(0, width - currentContentLen - 1);

    // Boxed Input Components
    const topBorder = currentTheme.system.dim('╭─') + 
                      currentTheme.system.dim(' PATH: ') + currentTheme.highlight(displayPath) +
                      currentTheme.system.dim(' USER: ') + currentTheme.user(username) + 
                      currentTheme.system.dim(' MODEL: ') + currentTheme.ai(conf.api.model) +
                      currentTheme.system.dim(' CTX: ') + currentTheme.system(ctxString) + 
                      currentTheme.system.dim(' ' + '─'.repeat(paddingLen) + '╮');

    const promptPrefix = currentTheme.system.dim('╰─> ');

    // Rendering
    console.log('');
    console.log(topBorder);
    
    // Wymuś przewinięcie terminala, co naprawia ucięty kursor i brak odstępu
    console.log('');
    process.stdout.write('\\x1b[1A');

    const rl = readline.createInterface({ input, output, completer });
    
    // Obsługa Ctrl+C
    rl.on('SIGINT', () => {
        rl.close();
        console.log('\n' + chalk.yellow('Goodbye! 👋'));
        process.exit(0);
    });

    try {
      const userMessage = await rl.question(promptPrefix);
      rl.close();

      if (!userMessage.trim()) continue;

      if (slashHandler.hasCommand(userMessage)) {
        await slashHandler.execute(userMessage);
        continue;
      }

      history.push({ role: 'user', content: userMessage });
      
      let keepProcessing = true;
      let toolLoopCount = 0;
      const MAX_TOOL_LOOPS = 40;
      let lastToolCallSignature = '';
      let consecutiveIdenticalCalls = 0;
      
      while (keepProcessing) {
        toolLoopCount++;
        if (toolLoopCount > MAX_TOOL_LOOPS) {
            console.log(currentTheme.error(`\n[System] Maximum tool execution loop limit reached (${MAX_TOOL_LOOPS}). Interrupting to prevent infinite loops.`));
            history.push({ role: 'system', content: `Error: You have reached the maximum number of consecutive tool calls (${MAX_TOOL_LOOPS}). Please stop calling tools and provide a summary of what you found or ask the user for clarification.` });
            break;
        }

        if (consecutiveIdenticalCalls > 3) {
            console.log(currentTheme.error(`\n[System] Detected identical consecutive tool calls. Interrupting to prevent infinite loops.`));
            history.push({ role: 'system', content: `Error: You are making the exact same tool calls repeatedly. Please stop calling tools and provide a summary of what you found or ask the user for clarification.` });
            break;
        }

        const spinner = ora(t.generating).start();

        try {
          const stream = await client.chat.completions.create({
            model: conf.api.model,
            messages: history as any,
            tools: fsToolsDefinitions,
            stream: true,
          });

          let fullContent = '';
          let toolCallsBuffer: any[] = [];
          
          let isFirstChunk = true;

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            
            if (delta?.content) {
              if (isFirstChunk) {
                 spinner.stop();
                 // AI response header
                 process.stdout.write('\n' + currentTheme.ai(`${t.ai} > `));
                 isFirstChunk = false;
              }
              // Kolorujemy każdy fragment odpowiedzi
              process.stdout.write(currentTheme.ai(delta.content));
              fullContent += delta.content;
            }

            if (delta?.tool_calls) {
               if (isFirstChunk) { spinner.text = 'Analyzing...'; isFirstChunk = false; }
               
               for (const tc of delta.tool_calls) {
                 const streamIndex = tc.index ?? 0;
                 let targetEntry = undefined;

                 if (tc.id) {
                     targetEntry = toolCallsBuffer.find(t => t.id === tc.id);
                 }

                 if (!targetEntry) {
                     for (let i = toolCallsBuffer.length - 1; i >= 0; i--) {
                         if (toolCallsBuffer[i]._streamIndex === streamIndex) {
                             targetEntry = toolCallsBuffer[i];
                             break;
                         }
                     }
                     if (targetEntry && tc.id && targetEntry.id && targetEntry.id !== tc.id) {
                         targetEntry = undefined;
                     }
                 }

                 if (!targetEntry) {
                     targetEntry = { id: tc.id || '', type: tc.type || 'function', function: { name: '', arguments: '' }, _streamIndex: streamIndex };
                     toolCallsBuffer.push(targetEntry);
                 }

                 if (tc.id && !targetEntry.id) targetEntry.id = tc.id;
                 
                 if (tc.function?.name) {
                   const currentName = targetEntry.function.name;
                   const newNamePart = tc.function.name;
                   if (currentName !== newNamePart && !currentName.endsWith(newNamePart)) {
                     targetEntry.function.name += newNamePart;
                   }
                 }
                 if (tc.function?.arguments) targetEntry.function.arguments += tc.function.arguments;
               }
            }
          }

          if (fullContent) process.stdout.write('\n\n');
          else spinner.stop();

          const message: any = { role: 'assistant', content: fullContent || null };
          
          if (toolCallsBuffer.length > 0) {
            // Clean up internal properties like _streamIndex before adding to history
            const cleanToolCalls = toolCallsBuffer.map(t => ({ id: t.id, type: t.type, function: t.function }));
            message.tool_calls = cleanToolCalls;
            history.push(message);

            const currentSignature = JSON.stringify(cleanToolCalls.map(t => t.function));
            if (currentSignature === lastToolCallSignature) {
                consecutiveIdenticalCalls++;
            } else {
                consecutiveIdenticalCalls = 0;
                lastToolCallSignature = currentSignature;
            }

            console.log(currentTheme.system(`[Executing ${toolCallsBuffer.length} tool(s)...]`));

            for (const toolCall of toolCallsBuffer) {
               const rawName = toolCall.function.name;
               let args = {};
               try {
                 args = JSON.parse(toolCall.function.arguments);
               } catch (e) {
                 console.error(currentTheme.error(`Failed to parse arguments for ${rawName}`));
               }

               const displayArgsObj = { ...args } as any;
               for (const key in displayArgsObj) {
                 if (typeof displayArgsObj[key] === 'string' && displayArgsObj[key].length > 50) {
                   displayArgsObj[key] = displayArgsObj[key].substring(0, 50) + '...';
                 }
               }
               console.log(currentTheme.highlight(` > ${rawName}(${JSON.stringify(displayArgsObj)})`));
               
               const result = await fsTools.execute(rawName, args);
               
               history.push({
                 role: 'tool',
                 tool_call_id: toolCall.id || 'call_' + Math.random().toString(36).substr(2, 9),
                 content: result
               });
            }
          } else {
            history.push(message);
            keepProcessing = false;
          }

        } catch (apiError: any) {
          spinner.fail(t.error);
          console.error(currentTheme.error(`${t.apiErrorDetails}: ${apiError.message}`));
          // W przypadku błędu API przerywamy pętlę narzędzi, ale NIE pętlę główną
          keepProcessing = false;
        }
      }

    } catch (error: any) {
      rl.close();
      // DEBUG: Sprawdźmy co naprawdę się dzieje
      console.error(chalk.bgRed.white(` [CRITICAL ERROR] Code: ${error.code}, Message: ${error.message} `));
      
      if (error.code === 'EPIPE' || error.message === 'closed') {
          console.log(chalk.yellow('Próba reanimacji sesji...'));
          // Restart loop
      } else {
          // If it's another error, maybe we should break or just log?
          // For now, let's keep running to avoid crash.
      }
    }
  }
}
