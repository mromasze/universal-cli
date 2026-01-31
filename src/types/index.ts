export type Language = 'pl' | 'en';
export type ThemeName = 'default' | 'matrix' | 'sunset';

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface UserConfig {
  language: Language;
  theme: ThemeName;
  api: ApiConfig;
  systemPrompt: string;
}

export interface Translation {
  welcome: {
    title: string;
    subtitle: string;
    model: string;
    url: string;
    helpHint: string;
  };
  chat: {
    user: string;
    ai: string;
    inputPlaceholder: string;
    generating: string;
    error: string;
    apiErrorDetails: string;
    exitMessage: string;
  };
  commands: {
    helpDesc: string;
    byeDesc: string;
    welcomeDesc: string;
    configDesc: string;
    availableCommands: string;
    byeMessage: string;
  };
}
