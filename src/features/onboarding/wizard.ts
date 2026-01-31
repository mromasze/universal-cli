import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import OpenAI from 'openai';
import { configManager } from '../../lib/configManager.js';
import { Language } from '../../types/index.js';

export async function runWizard() {
  console.clear();
  console.log(chalk.bold.blue('=========================================='));
  console.log(chalk.bold.blue('   Witamy w Universal CLI (v0.0.2)        '));
  console.log(chalk.bold.blue('=========================================='));
  console.log(chalk.gray('Wygląda na to, że uruchamiasz to narzędzie po raz pierwszy.'));
  console.log(chalk.gray('Skonfigurujmy je razem.\n'));

  // 1. Wybór języka
  const lang = await select({
    message: 'Wybierz język / Select language:',
    choices: [
      { name: 'Polski', value: 'pl' },
      { name: 'English', value: 'en' },
    ],
  }) as Language;

  configManager.setLanguage(lang);
  const t = lang === 'pl' ? {
      provider: 'Wybierz dostawcę AI:',
      url: 'Podaj adres API Base URL:',
      model: 'Wybierz model:',
      modelManual: 'Podaj nazwę modelu (nie udało się pobrać listy):',
      key: 'Podaj klucz API:',
      checking: 'Sprawdzanie połączenia i pobieranie modeli...', 
      success: 'Konfiguracja zakończona! Uruchamiam czat...', 
      connError: 'Błąd połączenia. Sprawdź URL lub czy Ollama działa.',
      fetchError: 'Ostrzeżenie: Nie udało się pobrać listy modeli.',
  } : {
      provider: 'Select AI Provider:',
      url: 'Enter API Base URL:',
      model: 'Select Model:',
      modelManual: 'Enter Model Name (failed to fetch list):',
      key: 'Enter API Key:',
      checking: 'Verifying connection and fetching models...', 
      success: 'Configuration saved! Starting chat...', 
      connError: 'Connection error. Check URL or ensure Ollama is running.',
      fetchError: 'Warning: Could not fetch model list.',
  };

  // 2. Wybór providera
  const provider = await select({
    message: t.provider,
    choices: [
      { name: 'Ollama (Local)', value: 'ollama' },
      { name: 'OpenAI Compatible (Local/Remote)', value: 'custom' },
      { name: 'OpenAI (Official)', value: 'openai' },
    ],
  });

  let defaultUrl = 'http://localhost:11434/v1';
  let defaultKey = 'ollama';

  if (provider === 'openai') {
      defaultUrl = 'https://api.openai.com/v1';
      defaultKey = ''; // Wymuś wpisanie klucza
  } else if (provider === 'custom') {
      defaultUrl = 'http://localhost:1234/v1'; // Np. LM Studio
  }

  // 3. Konfiguracja API
  const baseUrlRaw = await input({
    message: t.url,
    default: defaultUrl,
  });
  
  // Normalizacja URL
  let baseUrl = baseUrlRaw.trim();
  while (baseUrl.endsWith('/') || baseUrl.endsWith('\\')) baseUrl = baseUrl.slice(0, -1);
  if (baseUrl.endsWith('/chat/completions')) baseUrl = baseUrl.replace(new RegExp('/chat/completions$'), '');
  else if (baseUrl.endsWith('/chat')) baseUrl = baseUrl.replace(new RegExp('/chat$'), '');

  const apiKey = await input({
    message: t.key,
    default: defaultKey,
    // Walidacja: wymagaj klucza dla OpenAI
    validate: (value) => {
        if (provider === 'openai' && (!value || value.length < 5)) return 'API Key is required for OpenAI';
        return true;
    }
  });

  // 4. Weryfikacja i pobranie modeli
  let model = '';
  const spinner = ora(t.checking).start();
  
  try {
      const client = new OpenAI({
          baseURL: baseUrl,
          apiKey: apiKey,
          timeout: 5000 // 5s timeout
      });

      const list = await client.models.list();
      spinner.succeed();

      // Sortowanie modeli
      const modelChoices = list.data
          .map(m => ({ name: m.id, value: m.id }))
          .sort((a, b) => a.name.localeCompare(b.name));
      
      if (modelChoices.length === 0) throw new Error('No models found');

      model = await select({
          message: t.model,
          choices: modelChoices,
          pageSize: 10
      });

  } catch (error: any) {
      spinner.fail(t.fetchError);
      console.log(chalk.red(`Error: ${error.message}`));
      if (error.code === 'ECONNREFUSED') {
          console.log(chalk.yellow(t.connError));
      }

      // Fallback do ręcznego wpisania
      model = await input({
          message: t.modelManual,
          default: provider === 'ollama' ? 'llama3' : 'gpt-4o',
      });
  }

  // Zapis
  configManager.setApiConfig({
      baseUrl,
      model,
      apiKey
  });
  
  configManager.markAsConfigured();
  
  console.log(chalk.green(`\n✔ ${t.success}\n`));
  await new Promise(r => setTimeout(r, 1500));
  console.clear();
}