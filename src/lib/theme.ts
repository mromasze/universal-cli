import chalk from 'chalk';
import { configManager } from './configManager.js';
import { ThemeName } from '../types/index.js';

interface ThemeColors {
  user: any; // chalk function
  ai: any;
  system: any;
  error: any;
  highlight: any;
}

const themes: Record<ThemeName, ThemeColors> = {
  default: {
    user: chalk.green,
    ai: chalk.magenta,
    system: chalk.blue,
    error: chalk.red,
    highlight: chalk.cyan,
  },
  matrix: {
    user: chalk.greenBright,
    ai: chalk.green,
    system: chalk.white,
    error: chalk.redBright,
    highlight: chalk.green.bold,
  },
  sunset: {
    user: chalk.yellow,
    ai: chalk.magentaBright,
    system: chalk.redBright,
    error: chalk.red.bold,
    highlight: chalk.hex('#FFA500'), // Orange
  }
};

export const getTheme = () => {
  const themeName = configManager.getConfig().theme;
  return themes[themeName] || themes.default;
};
