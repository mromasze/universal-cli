import { Translation } from '../types/index.js';

export const pl: Translation = {
  welcome: {
    title: 'UNIVERSAL CLI',
    subtitle: 'Twój Lokalny Asystent AI',
    model: 'Model',
    url: 'URL',
    helpHint: 'Wpisz wiadomość lub użyj komendy (np. /help)',
  },
  chat: {
    user: 'Ty',
    ai: 'AI',
    inputPlaceholder: 'Napisz coś...',
    generating: 'Generowanie odpowiedzi...',
    error: 'Błąd',
    apiErrorDetails: 'Szczegóły',
    exitMessage: 'Zakończono sesję.',
  },
  commands: {
    helpDesc: 'Wyświetla listę dostępnych komend',
    byeDesc: 'Kończy sesję i zamyka program',
    welcomeDesc: 'Wyświetla ekran powitalny',
    configDesc: 'Edytuj konfigurację',
    availableCommands: 'Dostępne komendy',
    byeMessage: '👋 Do zobaczenia! Dziękujemy za korzystanie z Universal CLI.',
  },
};
