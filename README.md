# Universal LLM CLI

A powerful, universal Command Line Interface for interacting with local LLMs (via **Ollama**) and OpenAI-compatible APIs directly from your terminal. 

It features a "Clean Architecture" design, filesystem access tools (Agentic capabilities), and persistent configuration.

## Features

*   **Universal Compatibility**: Works out-of-the-box with Ollama, but can be configured for OpenAI, Claude, Mistral, etc.
*   **Agentic Capabilities**: The model can list, read, and write files in your project (safe mode with scoped permissions).
*   **Persistent Config**: Remembers your settings (URL, model, system prompt) across sessions.
*   **Slash Commands**: Built-in commands like `/help`, `/config`, `/set`, `/lang`.
*   **Themes & i18n**: Supports English/Polish and multiple color themes.
*   **Project Context**: Open the CLI in a specific project folder using `-p <path>`.

## Installation

```bash
npm install -g universal-llm-cli
```

Or run directly without installing:

```bash
npx universal-llm-cli
```

## Quick Start

1.  **Start the CLI**:
    ```bash
    unicli
    ```
2.  **Configure (if not using default Ollama)**:
    ```bash
    /set url https://api.openai.com/v1
    /set key sk-proj-...
    /set model gpt-4o
    ```
3.  **Chat**: Just type your message.
4.  **Use Tools**: Ask the model to do something with files:
    > "List files in src/ and create a new README.md with a summary."

## Configuration

Configuration is stored in `~/.universal-cli-config.json`.
You can view it using `/config`.

## Commands

*   `/help` - Show available commands
*   `/config` - Show current configuration
*   `/set <key> <value>` - Update config (url, model, key, system)
*   `/lang <pl|en>` - Change interface language
*   `/bye` - Exit

## License

MIT
