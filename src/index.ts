#!/usr/bin/env node
import { Command } from 'commander';
import { chatCommand } from './commands/chatCommand.js';

const program = new Command();

program
  .name('universal-cli')
  .description('CLI dla lokalnych modeli LLM (Ollama itp.)')
  .version('0.0.1');

// Rejestracja komend
program.addCommand(chatCommand);

// Domyślna akcja jeśli nie podano komendy
if (!process.argv.slice(2).length) {
    program.help();
}

program.parse(process.argv);