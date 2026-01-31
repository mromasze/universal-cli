import { Translation } from '../types/index.js';

export const en: Translation = {
  welcome: {
    title: 'UNIVERSAL CLI',
    subtitle: 'Your Local AI Assistant',
    model: 'Model',
    url: 'URL',
    helpHint: 'Type a message or use a command (e.g. /help)',
  },
  chat: {
    user: 'You',
    ai: 'AI',
    inputPlaceholder: 'Type something...',
    generating: 'Generating response...',
    error: 'Error',
    apiErrorDetails: 'Details',
    exitMessage: 'Session ended.',
  },
  commands: {
    helpDesc: 'Shows a list of available commands',
    byeDesc: 'Ends session and exits',
    welcomeDesc: 'Shows the welcome screen',
    configDesc: 'Edit configuration',
    availableCommands: 'Available commands',
    byeMessage: '👋 See you later! Thanks for using Universal CLI.',
  },
};
