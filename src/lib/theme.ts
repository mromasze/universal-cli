import chalk, { type ChalkInstance } from 'chalk';
import { configManager } from './configManager.js';
import { ThemeName } from '../types/index.js';
import colors from './colors.json' with { type: 'json' };

const { palettes } = colors as any;

interface ThemeColors {
  user: ChalkInstance;
  ai: ChalkInstance;
  system: ChalkInstance;
  error: ChalkInstance;
  highlight: ChalkInstance;
}

// Helper to convert hex colors to Chalk instances
const hexToChalk = (hex: string): ChalkInstance => {
  return chalk.hex(hex);
};

const themes: Record<ThemeName, ThemeColors> = {
  default: {
    user: hexToChalk(palettes['default'].user),
    ai: hexToChalk(palettes['default'].ai),
    system: hexToChalk(palettes['default'].system),
    error: hexToChalk(palettes['default'].error),
    highlight: hexToChalk(palettes['default'].highlight),
  },
  matrix: {
    user: hexToChalk(palettes['matrix'].user),
    ai: hexToChalk(palettes['matrix'].ai),
    system: hexToChalk(palettes['matrix'].system),
    error: hexToChalk(palettes['matrix'].error),
    highlight: hexToChalk(palettes['matrix'].highlight),
  },
  sunset: {
    user: hexToChalk(palettes['sunset'].user),
    ai: hexToChalk(palettes['sunset'].ai),
    system: hexToChalk(palettes['sunset'].system),
    error: hexToChalk(palettes['sunset'].error),
    highlight: hexToChalk(palettes['sunset'].highlight),
  },
  ocean: {
    user: hexToChalk(palettes['ocean'].user),
    ai: hexToChalk(palettes['ocean'].ai),
    system: hexToChalk(palettes['ocean'].system),
    error: hexToChalk(palettes['ocean'].error),
    highlight: hexToChalk(palettes['ocean'].highlight),
  },
  dark_mode: {
    user: hexToChalk(palettes['dark_mode'].user),
    ai: hexToChalk(palettes['dark_mode'].ai),
    system: hexToChalk(palettes['dark_mode'].system),
    error: hexToChalk(palettes['dark_mode'].error),
    highlight: hexToChalk(palettes['dark_mode'].highlight),
  },
  monochrome: {
    user: hexToChalk(palettes['monochrome'].user),
    ai: hexToChalk(palettes['monochrome'].ai),
    system: hexToChalk(palettes['monochrome'].system),
    error: hexToChalk(palettes['monochrome'].error),
    highlight: hexToChalk(palettes['monochrome'].highlight),
  }
};

export const getTheme = () => {
  const themeName = configManager.getConfig().theme;
  return themes[themeName] || themes.default;
};
