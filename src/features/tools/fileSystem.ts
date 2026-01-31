import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';

// Definicje narzędzi dla OpenAI
export const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'List files in a directory. Use this to explore the project structure.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to the directory (e.g. "." for root, "src" for src folder).',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the content of a file. Use this to examine code or text files.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to the file (e.g. "src/index.ts").',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write content to a file. Use this to create new files or overwrite existing ones completely.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to the file.',
          },
          content: {
            type: 'string',
            description: 'The full content to write to the file.',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
];

// Implementacja (Executor)
export class FileSystemTools {
  public rootDir: string;

  constructor(userPath: string) {
    // Rozwiązujemy ścieżkę względem katalogu uruchomienia (process.cwd())
    // Jeśli user podał kropkę '.', to jest to dokładnie process.cwd()
    this.rootDir = path.resolve(process.cwd(), userPath);
  }

  private resolvePath(relativePath: string): string {
    const resolved = path.resolve(this.rootDir, relativePath);
    if (!resolved.startsWith(this.rootDir)) {
      throw new Error(`Access denied: Path ${relativePath} is outside of allowed root: ${this.rootDir}`);
    }
    return resolved;
  }

  async listFiles(relPath: string = '.'): Promise<string> {
    try {
      const fullPath = this.resolvePath(relPath);
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      
      const list = entries.map(entry => {
        const type = entry.isDirectory() ? '[DIR]' : '[FILE]';
        return `${type} ${entry.name}`;
      }).join('\n');
      
      return list || '(empty directory)';
    } catch (error: any) {
      return `Error listing files at ${this.resolvePath(relPath)}: ${error.message}`;
    }
  }

  async readFile(relPath: string): Promise<string> {
    try {
      const fullPath = this.resolvePath(relPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return content;
    } catch (error: any) {
      return `Error reading file ${this.resolvePath(relPath)}: ${error.message}`;
    }
  }

  async writeFile(relPath: string, content: string): Promise<string> {
    try {
      const fullPath = this.resolvePath(relPath);
      // Upewnij się, że katalog istnieje
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      return `Successfully wrote to ${fullPath}`;
    } catch (error: any) {
      return `Error writing file to ${this.resolvePath(relPath)}: ${error.message}`;
    }
  }

  // Główny dispatcher
  async execute(name: string, args: any): Promise<string> {
    // Sanitizacja nazwy funkcji (naprawa błędu dublowania nazw przez niektóre modele)
    let cleanName = name;
    if (name.includes('write_file')) cleanName = 'write_file';
    else if (name.includes('read_file')) cleanName = 'read_file';
    else if (name.includes('list_files')) cleanName = 'list_files';

    switch (cleanName) {
      case 'list_files':
        return this.listFiles(args.path);
      case 'read_file':
        return this.readFile(args.path);
      case 'write_file':
        return this.writeFile(args.path, args.content);
      default:
        return `Unknown tool: ${name}`;
    }
  }
}