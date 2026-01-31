import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { getTheme } from './theme.js';

const PACKAGE_NAME = 'universal-llm-cli';

export async function checkUpdate() {
  try {
    // 1. Pobierz obecną wersję z package.json
    // Musimy znaleźć package.json względem tego pliku (dist/lib/updateChecker.js -> ../../package.json)
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const packageJsonPath = path.resolve(__dirname, '../../package.json');
    
    const pkgContent = await fs.readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(pkgContent);
    const currentVersion = pkg.version;

    // 2. Pobierz najnowszą wersję z NPM (timeout 1.5s żeby nie zamulać startu)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`https://registry.npmjs.org/${PACKAGE_NAME}/latest`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return;

    const data = await res.json() as { version: string };
    const latestVersion = data.version;

    // 3. Porównanie wersji
    if (isNewer(latestVersion, currentVersion)) {
      const theme = getTheme();
      const msg = [
        chalk.yellow('╭──────────────────────────────────────────────────╮'),
        chalk.yellow('│                                                  │'),
        chalk.yellow(`│   Update available! ${chalk.gray(currentVersion)} → ${chalk.green(latestVersion)}                  │`),
        chalk.yellow('│                                                  │'),
        chalk.yellow(`│   Run: ${chalk.cyan('npm install -g ' + PACKAGE_NAME)}       │`),
        chalk.yellow('│                                                  │'),
        chalk.yellow('╰──────────────────────────────────────────────────╯'),
      ].join('\n');

      console.log('\n' + msg + '\n');
    }

  } catch (error) {
    // Cicho ignorujemy błędy
  }
}

function isNewer(latest: string, current: string): boolean {
    const l = latest.split('.').map(Number);
    const c = current.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
        const lv = l[i] || 0;
        const cv = c[i] || 0;
        if (lv > cv) return true;
        if (lv < cv) return false;
    }
    return false; // są równe
}
