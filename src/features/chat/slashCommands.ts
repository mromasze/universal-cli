import chalk from 'chalk';
import { configManager } from '../../lib/configManager.js';
import { getTheme } from '../../lib/theme.js';
import { Language } from '../../types/index.js';

type CommandAction = (args: string[]) => void | Promise<void>;

interface SlashCommand {
  description: () => string; // Dynamic description for i18n
  execute: CommandAction;
}

export class SlashCommandHandler {
  private commands: Map<string, SlashCommand> = new Map();

  constructor() {
    this.registerCommands();
  }

  private registerCommands() {
    this.commands.set('/help', {
      description: () => configManager.t.commands.helpDesc,
      execute: () => this.showHelp(),
    });

    this.commands.set('/bye', {
      description: () => configManager.t.commands.byeDesc,
      execute: () => {
        const theme = getTheme();
        console.log(theme.system(configManager.t.commands.byeMessage));
        process.exit(0);
      },
    });

    this.commands.set('/welcome', {
      description: () => configManager.t.commands.welcomeDesc,
      execute: () => {
        const theme = getTheme();
        const t = configManager.t.welcome;
        const conf = configManager.getConfig();

        console.log(theme.system('='.repeat(50)));
        console.log(theme.system.bold(` 🤖  ${t.title}  -  ${t.subtitle}`));
        console.log(theme.system('='.repeat(50)));
        console.log(chalk.gray(` ${t.model}: ${chalk.white(conf.api.model)}`));
        console.log(chalk.gray(` ${t.url}:   ${chalk.white(conf.api.baseUrl)}`));
        console.log(chalk.gray(`
 ${t.helpHint}`));
        console.log('');
      },
    });

    // Komenda do szybkiej zmiany języka: /lang pl
    this.commands.set('/lang', {
        description: () => 'Change language (pl/en)',
        execute: (args) => {
            const newLang = args[0] as Language;
            if (['pl', 'en'].includes(newLang)) {
                configManager.setLanguage(newLang);
                console.log(getTheme().system(`Language changed to: ${newLang.toUpperCase()}`));
            } else {
                console.log(getTheme().error('Usage: /lang [pl|en]'));
            }
        }
    });

    this.commands.set('/config', {
        description: () => configManager.t.commands.configDesc || 'Show current configuration',
        execute: () => {
            const c = configManager.getConfig();
            const theme = getTheme();
            const displayConfig = {
                ...c,
                api: {
                    ...c.api,
                    apiKey: c.api.apiKey && c.api.apiKey.length > 4 ? `${c.api.apiKey.substring(0, 3)}***` : '(hidden)'
                }
            };
            console.log(theme.system(JSON.stringify(displayConfig, null, 2)));
        }
    });

    this.commands.set('/set', {
        description: () => 'Set config: /set [url|model|key|system] <value>',
        execute: (args) => {
            const theme = getTheme();
            if (args.length < 2) {
                 console.log(theme.error('Usage: /set [url|model|key|system] <value>'));
                 return;
            }
            const [key, ...valueParts] = args;
            const value = valueParts.join(' ');

            switch(key.toLowerCase()) {
                case 'url':
                    configManager.setApiConfig({ baseUrl: value });
                    console.log(theme.system(`Updated Base URL to: ${value}`));
                    break;
                case 'model':
                    configManager.setApiConfig({ model: value });
                    console.log(theme.system(`Updated Model to: ${value}`));
                    break;
                case 'key':
                    configManager.setApiConfig({ apiKey: value });
                    console.log(theme.system(`Updated API Key.`));
                    break;
                default:
                    console.log(theme.error('Unknown setting. Use: url, model, key'));
            }
        }
    });
    
    // Aliasy
    this.commands.set('/exit', this.commands.get('/bye')!);
    this.commands.set('/quit', this.commands.get('/bye')!);
  }

  public getCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  public hasCommand(input: string): boolean {
    const cmd = input.split(' ')[0].toLowerCase();
    return this.commands.has(cmd);
  }

  public async execute(input: string): Promise<boolean> {
    const args = input.split(' ');
    const cmdName = args[0].toLowerCase();
    const command = this.commands.get(cmdName);
    const cmdArgs = args.slice(1);

    if (command) {
      await command.execute(cmdArgs);
      return true;
    }
    return false;
  }

  public getWelcomeCommand(): () => void | Promise<void> {
      return () => this.commands.get('/welcome')!.execute([]);
  }

  private showHelp() {
    const theme = getTheme();
    console.log(theme.highlight(`
${configManager.t.commands.availableCommands}:`));
    this.commands.forEach((cmd, key) => {
      if (['/exit', '/quit'].includes(key)) return;
      console.log(`  ${theme.user(key.padEnd(10))} - ${cmd.description()}`);
    });
    console.log('');
  }
}