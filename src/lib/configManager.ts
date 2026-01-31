import fs from 'fs';
import path from 'path';
import os from 'os';
import { UserConfig, Language, Translation, ApiConfig } from '../types/index.js';
import { pl } from '../locales/pl.js';
import { en } from '../locales/en.js';

const CONFIG_FILENAME = '.universal-cli-config.json';
const CONFIG_PATH = path.join(os.homedir(), CONFIG_FILENAME);

const DEFAULT_CONFIG: UserConfig = {
  language: 'en', // Domyślny angielski dla "światowego" repo
  theme: 'default',
  api: {
    baseUrl: 'http://localhost:11434/v1',
    apiKey: 'ollama',
    model: 'llama3'
  },
  systemPrompt: 'You are a helpful AI assistant in the terminal.'
};

class ConfigManager {
  private config: UserConfig;
  private translations: Record<Language, Translation> = { pl, en };

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): UserConfig {
    try {
      if (!fs.existsSync(CONFIG_PATH)) {
        this.saveConfig(DEFAULT_CONFIG);
        return DEFAULT_CONFIG;
      }
      const rawData = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(rawData) };
    } catch (error) {
      console.error('Błąd ładowania konfiguracji, przywracanie domyślnej.', error);
      return DEFAULT_CONFIG;
    }
  }

  public saveConfig(newConfig: UserConfig): void {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
      this.config = newConfig;
    } catch (error) {
      console.error('Błąd zapisu konfiguracji:', error);
    }
  }

  public getConfig(): UserConfig {
    return this.config;
  }

  public setApiConfig(partialApi: Partial<ApiConfig>) {
    if (partialApi.baseUrl) {
        // Normalizacja URL: usuń końcowy slash, oraz /chat /completions
        let url = partialApi.baseUrl.trim();
        while (url.endsWith('/') || url.endsWith('\\')) url = url.slice(0, -1);
        if (url.endsWith('/chat/completions')) url = url.replace(/\/chat\/completions$/, '');
        else if (url.endsWith('/chat')) url = url.replace(/\/chat$/, '');
        
        partialApi.baseUrl = url;
    }
    this.config.api = { ...this.config.api, ...partialApi };
    this.saveConfig(this.config);
  }

  public setSystemPrompt(prompt: string) {
    this.config.systemPrompt = prompt;
    this.saveConfig(this.config);
  }

  public get t(): Translation {
    return this.translations[this.config.language];
  }

  public setLanguage(lang: Language) {
    this.config.language = lang;
    this.saveConfig(this.config);
  }
}

export const configManager = new ConfigManager();
