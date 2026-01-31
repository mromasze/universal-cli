import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import os from 'os';
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

export async function startChatSession(projectPath: string = '.') {
  // Sprawdź czy skonfigurowany, jeśli nie -> uruchom wizard
  if (!configManager.getConfig().isConfigured) {
      await runWizard();
  }

  const slashHandler = new SlashCommandHandler();
  const fsTools = new FileSystemTools(projectPath);
  
  await slashHandler.getWelcomeCommand()();
  await checkUpdate(); // Sprawdź aktualizacje
  
  const theme = getTheme();
  console.log(theme.system(`📂 Working Directory: ${chalk.bold(fsTools.rootDir)}`));
  console.log(theme.system(`   (All file operations will be relative to this path)\n`));

  const completer = (line: string): [string[], string] => {
    const hits = slashHandler.getCommandNames().filter((c) => c.startsWith(line));
    return [hits.length ? hits : slashHandler.getCommandNames(), line];
  };

  // Hardcoded System Prompt
  const history: any[] = [
    { role: 'system', content: EXPERT_SYSTEM_PROMPT }
  ];

  const username = os.userInfo().username || 'User';

  while (true) {
    const conf = configManager.getConfig();
    const client = createClient();
    const t = configManager.t.chat;
    const currentTheme = getTheme();
    
    const pathInfo = projectPath !== '.' ? chalk.gray(`[${projectPath}] `) : '';
    // Używamy nazwy użytkownika systemu zamiast tłumaczenia
    const promptPrefix = `${pathInfo}${currentTheme.user(`${username} > `)}`;

    const rl = readline.createInterface({ input, output, completer });

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
                 process.stdout.write(currentTheme.ai(`${t.ai} > `));
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
