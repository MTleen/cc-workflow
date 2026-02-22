/**
 * worktree.ts - Manage git worktrees for CC-Workflow
 *
 * Subcommands:
 *   list                 List all worktrees
 *   create <name>        Create a new worktree
 *   remove <name>        Remove a worktree
 *     --force            Skip confirmation prompts
 *     --delete-branch    Also delete the associated git branch
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

// ANSI color codes
const COLORS = {
  RED: '\x1b[0;31m',
  GREEN: '\x1b[0;32m',
  YELLOW: '\x1b[1;33m',
  BLUE: '\x1b[0;34m',
  CYAN: '\x1b[0;36m',
  BOLD: '\x1b[1m',
  NC: '\x1b[0m',
};

/**
 * Log informational message
 */
function logInfo(message: string): void {
  console.log(`${COLORS.BLUE}[INFO]${COLORS.NC} ${message}`);
}

/**
 * Log warning message
 */
function logWarning(message: string): void {
  console.log(`${COLORS.YELLOW}[WARNING]${COLORS.NC} ${message}`);
}

/**
 * Log error message
 */
function logError(message: string): void {
  console.log(`${COLORS.RED}[ERROR]${COLORS.NC} ${message}`);
}

/**
 * Worktree info structure
 */
interface WorktreeInfo {
  path: string;
  branch: string;
  commit: string;
  isMain: boolean;
}

/**
 * Parse git worktree list --porcelain output
 */
function parseWorktreeList(output: string): WorktreeInfo[] {
  const worktrees: WorktreeInfo[] = [];
  const blocks = output.split('\n\n');

  for (const block of blocks) {
    if (!block.trim()) continue;

    const lines = block.split('\n');
    let path = '';
    let branch = '';
    let commit = '';

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        path = line.substring(9);
      } else if (line.startsWith('HEAD ')) {
        commit = line.substring(5);
      } else if (line.startsWith('branch ')) {
        branch = line.substring(7);
      }
    }

    if (path) {
      // Determine if this is the main worktree
      const isMain = !branch || branch === 'refs/heads/main' || branch === 'refs/heads/master' || !branch.includes('/');

      // Extract branch name from ref
      let branchName = branch;
      if (branch.startsWith('refs/heads/')) {
        branchName = branch.substring(11);
      } else if (!branch) {
        branchName = '(detached)';
      }

      worktrees.push({
        path,
        branch: branchName,
        commit: commit.substring(0, 7),
        isMain
      });
    }
  }

  return worktrees;
}

/**
 * List all worktrees
 */
function listWorktrees(): void {
  logInfo('Listing git worktrees...');

  try {
    const output = execSync('git worktree list --porcelain', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const worktrees = parseWorktreeList(output);

    if (worktrees.length === 0) {
      logWarning('No worktrees found');
      return;
    }

    console.log('');
    console.log(`${COLORS.BOLD}Worktrees:${COLORS.NC}`);
    console.log('');

    // Calculate column widths
    const maxWidths = {
      path: Math.max(...worktrees.map(w => w.path.length), 10),
      branch: Math.max(...worktrees.map(w => w.branch.length), 6),
      commit: 7
    };

    // Print header
    const header = [
      'PATH'.padEnd(maxWidths.path),
      'BRANCH'.padEnd(maxWidths.branch),
      'COMMIT'
    ].join('  ');

    console.log(`  ${COLORS.BOLD}${header}${COLORS.NC}`);
    console.log(`  ${'─'.repeat(maxWidths.path)}  ${'─'.repeat(maxWidths.branch)}  ${'─'.repeat(7)}`);

    // Print worktrees
    for (const wt of worktrees) {
      const marker = wt.isMain ? `${COLORS.CYAN}*${COLORS.NC}` : ' ';
      const path = wt.path.padEnd(maxWidths.path);
      const branch = wt.branch.padEnd(maxWidths.branch);

      console.log(`${marker} ${path}  ${branch}  ${wt.commit}`);
    }

    console.log('');
    console.log(`Total: ${worktrees.length} worktree(s)`);

  } catch (e) {
    logError(`Failed to list worktrees: ${e}`);
    process.exit(1);
  }
}

/**
 * Find project root by looking for .git directory
 */
function findProjectRoot(): string | null {
  try {
    const output = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return output.trim();
  } catch {
    return null;
  }
}

/**
 * Check if project is initialized
 */
function isInitialized(projectRoot: string): boolean {
  return existsSync(join(projectRoot, '.ideal', 'worktree.yaml'));
}

/**
 * Get worktree scripts path
 */
function getScriptsPath(projectRoot: string): string {
  return join(projectRoot, '.claude', 'scripts');
}

/**
 * Create a new worktree
 */
function createWorktree(name: string, branchName?: string): void {
  const projectRoot = findProjectRoot();

  if (!projectRoot) {
    logError('Not in a git repository');
    process.exit(1);
  }

  if (!isInitialized(projectRoot)) {
    logError('Project not initialized');
    logInfo('Run "ideal init" first');
    process.exit(1);
  }

  logInfo(`Creating worktree: ${name}`);
  logInfo(`Project root: ${projectRoot}`);

  // Find the worktree-create.sh script
  const scriptsPath = getScriptsPath(projectRoot);
  const createScript = join(scriptsPath, 'worktree-create.sh');

  if (!existsSync(createScript)) {
    logError(`Worktree create script not found: ${createScript}`);
    logInfo('Make sure .claude/scripts/worktree-create.sh exists');
    process.exit(1);
  }

  // Build command
  let command = `"${createScript}" "${name}"`;
  if (branchName) {
    command += ` "${branchName}"`;
  }

  try {
    // Execute the script
    execSync(command, {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: 'inherit'  // Pass through all output
    });
  } catch (e) {
    // Error already printed by the script
    process.exit(1);
  }
}

/**
 * Remove a worktree
 */
function removeWorktree(name: string, force: boolean, deleteBranch: boolean): void {
  const projectRoot = findProjectRoot();

  if (!projectRoot) {
    logError('Not in a git repository');
    process.exit(1);
  }

  if (!isInitialized(projectRoot)) {
    logError('Project not initialized');
    logInfo('Run "ideal init" first');
    process.exit(1);
  }

  logInfo(`Removing worktree: ${name}`);
  logInfo(`Project root: ${projectRoot}`);

  // Find the worktree-remove.sh script
  const scriptsPath = getScriptsPath(projectRoot);
  const removeScript = join(scriptsPath, 'worktree-remove.sh');

  if (!existsSync(removeScript)) {
    logError(`Worktree remove script not found: ${removeScript}`);
    logInfo('Make sure .claude/scripts/worktree-remove.sh exists');
    process.exit(1);
  }

  // Build command
  let command = `"${removeScript}" "${name}"`;
  if (force) {
    command += ' --force';
  }
  if (deleteBranch) {
    command += ' --delete-branch';
  }

  try {
    // Execute the script
    execSync(command, {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: 'inherit'  // Pass through all output
    });
  } catch (e) {
    // Error already printed by the script
    process.exit(1);
  }
}

/**
 * Print worktree subcommand help
 */
function printWorktreeHelp(): void {
  console.log(`
Manage git worktrees for CC-Workflow

Usage:
  ideal worktree <subcommand> [options]

Subcommands:
  list                          List all worktrees
  create <name> [branch]        Create a new worktree
    name                        Requirement name (e.g., 2026-02-22-user-auth)
    branch                      Optional branch name (default: feature/<name>)

  remove <name> [options]       Remove a worktree
    name                        Requirement name to remove
    --force                     Skip confirmation prompts
    --delete-branch             Also delete the associated git branch

Options:
  -h, --help                    Show this help message

Examples:
  ideal worktree list
  ideal worktree create 2026-02-22-user-auth
  ideal worktree create 2026-02-22-user-auth feature/auth-rewrite
  ideal worktree remove 2026-02-22-user-auth
  ideal worktree remove 2026-02-22-user-auth --force --delete-branch
`);
}

/**
 * worktree command handler
 */
export function worktreeCommand(args: string[]): void {
  // No subcommand - show help
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printWorktreeHelp();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case 'list':
      if (subArgs.includes('--help') || subArgs.includes('-h')) {
        console.log('Usage: ideal worktree list');
        process.exit(0);
      }
      listWorktrees();
      break;

    case 'create':
      if (subArgs.length === 0 || subArgs.includes('--help') || subArgs.includes('-h')) {
        console.log('Usage: ideal worktree create <name> [branch]');
        console.log('');
        console.log('Arguments:');
        console.log('  name    Requirement name (e.g., 2026-02-22-user-auth)');
        console.log('  branch  Optional branch name (default: feature/<name>)');
        process.exit(subArgs.includes('--help') || subArgs.includes('-h') ? 0 : 1);
      }
      createWorktree(subArgs[0], subArgs[1]);
      break;

    case 'remove':
    case 'rm':
      if (subArgs.length === 0 || subArgs.includes('--help') || subArgs.includes('-h')) {
        console.log('Usage: ideal worktree remove <name> [options]');
        console.log('');
        console.log('Arguments:');
        console.log('  name           Requirement name to remove');
        console.log('');
        console.log('Options:');
        console.log('  --force        Skip confirmation prompts');
        console.log('  --delete-branch  Also delete the associated git branch');
        process.exit(subArgs.includes('--help') || subArgs.includes('-h') ? 0 : 1);
      }
      {
        const name = subArgs[0];
        const force = subArgs.includes('--force');
        const deleteBranch = subArgs.includes('--delete-branch');
        removeWorktree(name, force, deleteBranch);
      }
      break;

    default:
      logError(`Unknown subcommand: ${subcommand}`);
      console.log('');
      printWorktreeHelp();
      process.exit(1);
  }
}
