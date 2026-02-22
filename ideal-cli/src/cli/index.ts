#!/usr/bin/env node
/**
 * ideal-cli - CLI tool for CC-Workflow project management
 *
 * Usage:
 *   ideal init                    Initialize project structure
 *   ideal update                  Update template files and hooks
 *   ideal worktree list           List all worktrees
 *   ideal worktree create <name>  Create a new worktree
 *   ideal worktree remove <name>  Remove a worktree
 *   ideal --help                  Show help
 *   ideal --version               Show version
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Import command handlers
import { initCommand } from './commands/init';
import { updateCommand } from './commands/update';
import { worktreeCommand } from './commands/worktree';

// CLI version from package.json
const packageJsonPath = resolve(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
ideal-cli - CLI tool for CC-Workflow project management

Usage:
  ideal <command> [options]

Commands:
  init                    Initialize project structure (.ideal/, hooks, templates)
  update [options]        Update template files and hooks
    --dry-run             Show what would be updated without making changes
    -f, --force           Force update all files

  worktree <subcommand>   Manage git worktrees
    list                  List all worktrees
    create <name>         Create a new worktree for a requirement
    remove <name>         Remove a worktree
      --force             Skip confirmation prompts
      --delete-branch     Also delete the associated git branch

Options:
  -h, --help              Show this help message
  -v, --version           Show version number

Examples:
  ideal init
  ideal update --dry-run
  ideal worktree list
  ideal worktree create 2026-02-22-user-auth
  ideal worktree remove 2026-02-22-user-auth --force

For more information, visit:
https://github.com/anthropic/cc-workflow
`);
}

/**
 * Main CLI entry point
 */
function main(): void {
  // Get command line arguments
  const args = process.argv.slice(2);

  // No arguments - show help
  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  // Parse first argument
  const command = args[0];

  // Handle global options
  if (command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  if (command === '--version' || command === '-v') {
    console.log(`ideal-cli v${VERSION}`);
    process.exit(0);
  }

  // Route to command handlers
  const commandArgs = args.slice(1);

  switch (command) {
    case 'init':
      initCommand(commandArgs);
      break;

    case 'update':
      updateCommand(commandArgs);
      break;

    case 'worktree':
      worktreeCommand(commandArgs);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "ideal --help" for usage information.');
      process.exit(1);
  }
}

// Run CLI
main();
