import { Command } from 'commander';
import { startChatSession } from '../features/chat/session.js';

export const chatCommand = new Command('chat')
  .description('Rozpocznij interaktywną sesję czatu z modelem')
  .option('-p, --project-path <path>', 'Ścieżka do projektu (domyślnie obecny katalog)', '.')
  .action(async (options) => {
    await startChatSession(options.projectPath);
  });
