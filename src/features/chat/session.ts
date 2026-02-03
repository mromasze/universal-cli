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
  const osInfo = `Operating System: ${os.type()} ${os.release()} (${os.platform()})`;
  const history: any[] = [
    { role: 'system', content: `${EXPERT_SYSTEM_PROMPT}\n\nUser Environment: ${osInfo}` }
  ];

  const username = os.userInfo().username || 'User';

  while (true) {
    const conf = configManager.getConfig();
    const client = createClient();
    const t = configManager.t.chat;
    const currentTheme = getTheme();
    
    // UI Elements Calculation
    // Zmniejszamy szerokość o 2 znaki, aby uniknąć zawijania wierszy w niektórych terminalach,
    // co psuje obliczenia pozycji kursora (moveCursor).
    const width = (process.stdout.columns || 80) - 2;
    const usedTokens = estimateTokens(history);
    const usagePercent = Math.round((usedTokens / MAX_CONTEXT_TOKENS) * 100);
    
    // Status Line Calculation
    // Format: PATH: <path>  USER: <user>  MODEL: <model>  CTX: <ctx>
    // Labels + Spacing
    const labelPath = 'PATH: ';
    const labelUser = '  USER: ';
    const labelModel = '  MODEL: ';
    const labelCtx = '  CTX: ';
    
    const ctxString = `${usedTokens}/${MAX_CONTEXT_TOKENS} (${usagePercent}%)`;
    
    // Calculate static length (labels + other values)
    const staticLength = labelPath.length + 
                         labelUser.length + username.length + 
                         labelModel.length + conf.api.model.length + 
                         labelCtx.length + ctxString.length;
                         
    // Available space for path
    const availableForPath = width - staticLength;
    
    // Truncate path if needed
    const displayPath = availableForPath > 10 
        ? truncateMiddle(absolutePath, availableForPath) 
        : truncateMiddle(absolutePath, 10); // Fallback min length

    const statusPath = chalk.blue(displayPath);
    const statusUser = chalk.green(username);
    const statusModel = chalk.magenta(conf.api.model);
    const statusContext = chalk.yellow(ctxString);
    
    const statusLine = `${chalk.dim('PATH:')} ${statusPath}  ${chalk.dim('USER:')} ${statusUser}  ${chalk.dim('MODEL:')} ${statusModel}  ${chalk.dim('CTX:')} ${statusContext}`;

    // Boxed Input
    const topBorder = chalk.dim('╭' + '─'.repeat(width - 2) + '╮');
    const bottomBorder = chalk.dim('╰' + '─'.repeat(width - 2) + '╯');
    const promptPrefix = chalk.dim('│ ');

    // Rendering Frame
    if (process.stdout.isTTY) {
        // 1. Reserve space (scrolls terminal if needed)
        // Top + Input + Bottom + Status = 4 lines
        process.stdout.write('\n'.repeat(4));
        process.stdout.moveCursor(0, -4);

        // 2. Draw UI
        console.log(topBorder);
        // Save cursor position at the start of the input line
        process.stdout.write('\x1B7'); 
        console.log(''); // Placeholder for input line
        console.log(bottomBorder);
        console.log(statusLine);
        
        // Restore cursor to the input line
        process.stdout.write('\x1B8');
    } else {
        // Fallback for non-TTY
        console.log(statusLine);
        console.log(topBorder);
    }

    const rl = readline.createInterface({ input, output, completer });
    
    // Obsługa Ctrl+C
    rl.on('SIGINT', () => {
        rl.close();
        if (process.stdout.isTTY) {
            // Move cursor down past the status line to exit cleanly
            // Input -> Bottom -> Status -> Clean
            process.stdout.moveCursor(0, 3);
        }
        console.log('\n' + chalk.yellow('Goodbye! 👋'));
        process.exit(0);
    });

    try {
      const userMessage = await rl.question(promptPrefix);
      rl.close();
      
      if (process.stdout.isTTY) {
          // User hit enter. Cursor moves to next line (Bottom Border line).
          // We need to jump over Bottom Border and Status Line.
          // Current: Start of Bottom Border line.
          // Target: Line AFTER Status Line.
          // Move down 2 lines: 1 (Bottom) + 1 (Status)
          process.stdout.moveCursor(0, 2);
      } else {
          console.log(bottomBorder);
      }

      if (!userMessage.trim()) continue;

      if (slashHandler.hasCommand(userMessage)) {
        await slashHandler.execute(userMessage);
        continue;
      }

      history.push({ role: 'user', content: userMessage });
      
      let keepProcessing = true;
      
      while (keepProcessing) {
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
                 const index = tc.index;
                 if (!toolCallsBuffer[index]) {
                   toolCallsBuffer[index] = { id: tc.id || '', type: tc.type || 'function', function: { name: '', arguments: '' } };
                 }
                 if (tc.id) toolCallsBuffer[index].id = tc.id;
                 if (tc.function?.name) toolCallsBuffer[index].function.name += tc.function.name;
                 if (tc.function?.arguments) toolCallsBuffer[index].function.arguments += tc.function.arguments;
               }
            }
          }

          if (fullContent) process.stdout.write('\n\n');
          else spinner.stop();

          const message: any = { role: 'assistant', content: fullContent || null };
          
          if (toolCallsBuffer.length > 0) {
            message.tool_calls = toolCallsBuffer;
            history.push(message);

            console.log(currentTheme.system(`[Executing ${toolCallsBuffer.length} tool(s)...]`));

            for (const toolCall of toolCallsBuffer) {
               const rawName = toolCall.function.name;
               let args = {};
               try {
                 args = JSON.parse(toolCall.function.arguments);
               } catch (e) {
                 console.error(currentTheme.error(`Failed to parse arguments for ${rawName}`));
               }

               console.log(currentTheme.highlight(` > ${rawName}(${JSON.stringify(args)})`));
               
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
