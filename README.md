# Claude Hooks CLI

A TypeScript CLI tool for managing Claude Code hooks using commander and prompts.

## Features

- 🔍 **Smart Directory Discovery**: Automatically finds `.claude` directories from current directory up to home directory
- 📝 **Interactive Prompts**: User-friendly selection menus for choosing directories and hooks
- 🛠️ **Install/Uninstall Commands**: Easy management of Claude Code hooks
- 📁 **Settings Management**: Works with `settings.local.json` files for project-specific configurations

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Run the CLI:
```bash
npm start
```

## Usage

### Install Hooks

```bash
npm start install
```

This command will:
1. Search for existing `.claude` directories from current directory up to home directory
2. If no directories found, create one in the current directory
3. If directories found, prompt you to select which one to install hooks in
4. Install sample hooks to the selected directory's `settings.local.json`

### Uninstall Hooks

```bash
npm start uninstall
```

This command will:
1. Find all directories with existing hooks
2. Prompt you to select which directory to uninstall from
3. Show current hooks and let you select which ones to remove
4. Update the `settings.local.json` file accordingly

## Hook Configuration

The CLI works with Claude Code hook configurations in this format:

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolPattern",
        "hooks": [
          {
            "type": "command",
            "command": "your-command-here"
          }
        ]
      }
    ]
  }
}
```

## Sample Hooks

The CLI installs these sample hooks by default:

- **onFileOpen**: Triggers when TypeScript files are opened
- **onFileSave**: Triggers when JavaScript files are saved

## Development

### Running in Development Mode

```bash
npm run dev
```

### Building

```bash
npm run build
```

## Project Structure

```
src/
├── index.ts              # Main CLI entry point
├── types.ts              # TypeScript type definitions
├── commands/
│   ├── install.ts        # Install command implementation
│   └── uninstall.ts      # Uninstall command implementation
└── utils/
    └── claude-directory.ts # Directory and file management utilities
```

## Dependencies

- **commander**: CLI framework
- **prompts**: Interactive prompts
- **chalk**: Colored console output

## License

ISC 