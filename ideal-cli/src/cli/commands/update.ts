/**
 * update.ts - Update template files and hook scripts
 *
 * Options:
 *   --dry-run    Show what would be updated without making changes
 *   -f, --force  Force update all files (ignore hash check)
 *
 * Logic:
 *   1. Read current CLI version
 *   2. Read installed version from .ideal/.version
 *   3. Calculate hash of existing template files
 *   4. Compare with embedded templates
 *   5. Update files if different (or --force)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { createHash } from 'crypto';

// CLI version from package.json
const packageJsonPath = resolve(__dirname, '../../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const CLI_VERSION = packageJson.version;

// ANSI color codes
const COLORS = {
  RED: '\x1b[0;31m',
  GREEN: '\x1b[0;32m',
  YELLOW: '\x1b[1;33m',
  BLUE: '\x1b[0;34m',
  CYAN: '\x1b[0;36m',
  NC: '\x1b[0m',
};

/**
 * Log informational message
 */
function logInfo(message: string): void {
  console.log(`${COLORS.BLUE}[INFO]${COLORS.NC} ${message}`);
}

/**
 * Log success message
 */
function logSuccess(message: string): void {
  console.log(`${COLORS.GREEN}[SUCCESS]${COLORS.NC} ${message}`);
}

/**
 * Log error message
 */
function logError(message: string): void {
  console.log(`${COLORS.RED}[ERROR]${COLORS.NC} ${message}`);
}

/**
 * Log dry-run message
 */
function logDryRun(message: string): void {
  console.log(`${COLORS.CYAN}[DRY-RUN]${COLORS.NC} ${message}`);
}

/**
 * Template file definitions
 */
interface TemplateFile {
  path: string;           // Relative path from project root
  content: () => string;  // Function to get template content
  description: string;    // Human-readable description
}

/**
 * Get inject-context.py template (same as init.ts)
 */
function getInjectContextPyTemplate(): string {
  // This is the same template as in init.ts
  return `#!/usr/bin/env python3
"""
Claude Code Hook: inject-context.py
Automatically inject context into sub-Agent prompts

Trigger: PreToolUse - Task tool call
Logic:
1. Detect subagent_type (implement, check, debug, research)
2. Read .current-task to locate current requirement directory
3. Read corresponding jsonl file
4. Inject all file contents into sub-Agent prompt

Output format (Claude Code Hook spec):
{
  "prompt": "original prompt + injected context"
}
"""

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, List, Dict, Any

SUPPORTED_SUBAGENT_TYPES = {"implement", "check", "debug", "research"}


@dataclass
class ContextEntry:
    file: str
    type: str = "file"
    pattern: str = "*"
    reason: str = ""


def read_stdin_json() -> Dict[str, Any]:
    try:
        return json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Error: Failed to parse stdin JSON: {e}", file=sys.stderr)
        return {}


def find_repo_root(start_path: Optional[Path] = None) -> Optional[Path]:
    if start_path is None:
        start_path = Path.cwd()
    current = start_path.resolve()
    while current != current.parent:
        if (current / ".git").exists():
            return current
        current = current.parent
    if (current / ".git").exists():
        return current
    return None


def get_current_task(repo_root: Path) -> Optional[str]:
    current_task_file = repo_root / ".current-task"
    if not current_task_file.exists():
        return None
    try:
        content = current_task_file.read_text(encoding="utf-8").strip()
        if content:
            return content
    except Exception as e:
        print(f"Warning: Failed to read .current-task: {e}", file=sys.stderr)
    return None


def read_jsonl_entries(jsonl_path: Path) -> List[ContextEntry]:
    entries = []
    if not jsonl_path.exists():
        return entries
    try:
        with open(jsonl_path, "r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                try:
                    data = json.loads(line)
                    entry = ContextEntry(
                        file=data.get("file", ""),
                        type=data.get("type", "file"),
                        pattern=data.get("pattern", "*"),
                        reason=data.get("reason", "")
                    )
                    if entry.file:
                        entries.append(entry)
                except json.JSONDecodeError as e:
                    print(f"Warning: Skipping invalid JSON at line {line_num}: {e}", file=sys.stderr)
    except Exception as e:
        print(f"Warning: Failed to read JSONL file: {e}", file=sys.stderr)
    return entries


def read_file_content(file_path: Path, max_size: int = 100000) -> Optional[str]:
    if not file_path.exists():
        return None
    if not file_path.is_file():
        return None
    try:
        file_size = file_path.stat().st_size
        if file_size > max_size:
            content = file_path.read_text(encoding="utf-8")
            return content[:max_size] + f"\\n... [File truncated, original size: {file_size} bytes]"
        return file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return None
    except Exception:
        return None


def read_directory_contents(dir_path: Path, pattern: str = "*", max_files: int = 50) -> Dict[str, str]:
    contents = {}
    if not dir_path.exists() or not dir_path.is_dir():
        return contents
    try:
        files = list(dir_path.glob(pattern))
        for i, file_path in enumerate(files):
            if i >= max_files:
                break
            if file_path.is_file():
                content = read_file_content(file_path)
                if content is not None:
                    relative_path = file_path.relative_to(dir_path)
                    contents[str(relative_path)] = content
    except Exception:
        pass
    return contents


def build_context(repo_root: Path, entries: List[ContextEntry]) -> str:
    context_parts = ["\\n\\n---\\n## Auto-injected Context\\n"]
    for entry in entries:
        full_path = repo_root / entry.file
        if entry.type == "directory":
            contents = read_directory_contents(full_path, entry.pattern)
            if contents:
                context_parts.append(f"\\n### Directory: {entry.file}/")
                if entry.reason:
                    context_parts.append(f"*Reason: {entry.reason}*")
                context_parts.append("")
                for rel_path, content in contents.items():
                    context_parts.append(f"#### {entry.file}/{rel_path}")
                    context_parts.append("\`\`\`")
                    context_parts.append(content)
                    context_parts.append("\`\`\`")
                    context_parts.append("")
        else:
            content = read_file_content(full_path)
            if content is not None:
                context_parts.append(f"\\n### File: {entry.file}")
                if entry.reason:
                    context_parts.append(f"*Reason: {entry.reason}*")
                context_parts.append("")
                context_parts.append("\`\`\`")
                context_parts.append(content)
                context_parts.append("\`\`\`")
                context_parts.append("")
    context_parts.append("\\n---\\n*Above content auto-injected by Claude Code Hook*\\n")
    return "\\n".join(context_parts)


def process_hook(input_data: Dict[str, Any]) -> Dict[str, Any]:
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    original_prompt = input_data.get("prompt", "")
    if tool_name != "Task":
        return {"prompt": original_prompt}
    subagent_type = tool_input.get("subagent_type", "")
    if not subagent_type:
        return {"prompt": original_prompt}
    if subagent_type not in SUPPORTED_SUBAGENT_TYPES:
        return {"prompt": original_prompt}
    repo_root = find_repo_root()
    if repo_root is None:
        return {"prompt": original_prompt}
    task_dir = get_current_task(repo_root)
    if task_dir is None:
        return {"prompt": original_prompt}
    jsonl_path = repo_root / task_dir / "context.jsonl"
    entries = read_jsonl_entries(jsonl_path)
    if not entries:
        return {"prompt": original_prompt}
    context = build_context(repo_root, entries)
    return {"prompt": original_prompt + context}


def main():
    input_data = read_stdin_json()
    if not input_data:
        sys.exit(0)
    output_data = process_hook(input_data)
    print(json.dumps(output_data, ensure_ascii=False))


if __name__ == "__main__":
    main()
`;
}

/**
 * Get verify-loop.py template
 */
function getVerifyLoopPyTemplate(): string {
  return `#!/usr/bin/env python3
"""
Claude Code Hook: verify-loop.py
Ralph Loop quality control

Trigger: SubagentStop - Check Agent attempts to stop
"""

import json
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

MAX_ITERATIONS = 5
TIMEOUT_MINUTES = 30
COMMAND_TIMEOUT_SECONDS = 120
MAX_OUTPUT_LENGTH = 500


@dataclass
class VerifyState:
    task: str
    iteration: int = 0
    started_at: str = ""
    def __post_init__(self):
        if not self.started_at:
            self.started_at = datetime.now().isoformat()


def read_stdin_json() -> Dict[str, Any]:
    try:
        return json.load(sys.stdin)
    except json.JSONDecodeError:
        return {}


def find_repo_root(start_path: Optional[Path] = None) -> Optional[Path]:
    if start_path is None:
        start_path = Path.cwd()
    current = start_path.resolve()
    while current != current.parent:
        if (current / ".git").exists():
            return current
        current = current.parent
    if (current / ".git").exists():
        return current
    return None


def parse_yaml_simple(yaml_content: str) -> Dict[str, Any]:
    result = {}
    current_key = None
    for line in yaml_content.split('\\n'):
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            continue
        if stripped.startswith('- '):
            if current_key and current_key in result:
                if not isinstance(result[current_key], list):
                    result[current_key] = []
                result[current_key].append(stripped[2:])
            continue
        if ':' in line and not line.startswith(' '):
            current_key = None
            key, _, value = line.partition(':')
            key = key.strip()
            value = value.strip()
            if value:
                result[key] = value
            else:
                result[key] = []
                current_key = key
    return result


def get_verify_commands(repo_root: Path) -> List[str]:
    worktree_yaml = repo_root / ".ideal" / "worktree.yaml"
    if not worktree_yaml.exists():
        return []
    try:
        content = worktree_yaml.read_text(encoding="utf-8")
        parsed = parse_yaml_simple(content)
        verify = parsed.get("verify", [])
        if isinstance(verify, str):
            return [verify] if verify else []
        return verify
    except Exception:
        return []


def run_verify_commands(commands: List[str], cwd: Optional[Path] = None) -> Tuple[bool, str]:
    if not commands:
        return True, "No verify commands configured"
    work_dir = str(cwd) if cwd else None
    for cmd in commands:
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=COMMAND_TIMEOUT_SECONDS, cwd=work_dir)
            if result.returncode != 0:
                error_output = result.stderr or result.stdout
                if len(error_output) > MAX_OUTPUT_LENGTH:
                    error_output = error_output[:MAX_OUTPUT_LENGTH] + "..."
                return False, f"Command '{cmd}' failed:\\n{error_output}"
        except subprocess.TimeoutExpired:
            return False, f"Command '{cmd}' timed out"
        except Exception as e:
            return False, f"Command '{cmd}' error: {str(e)}"
    return True, f"All {len(commands)} verify commands passed"


def get_state_file_path(repo_root: Path) -> Path:
    return repo_root / ".ideal" / ".verify-state.json"


def load_state(repo_root: Path, task: str) -> VerifyState:
    state_file = get_state_file_path(repo_root)
    if state_file.exists():
        try:
            data = json.loads(state_file.read_text(encoding="utf-8"))
            if data.get("task") == task:
                return VerifyState(task=data.get("task", task), iteration=data.get("iteration", 0), started_at=data.get("started_at", ""))
        except Exception:
            pass
    return VerifyState(task=task)


def save_state(repo_root: Path, state: VerifyState) -> None:
    state_file = get_state_file_path(repo_root)
    state_file.parent.mkdir(parents=True, exist_ok=True)
    try:
        state_file.write_text(json.dumps({"task": state.task, "iteration": state.iteration, "started_at": state.started_at}, indent=2), encoding="utf-8")
    except Exception:
        pass


def check_timeout(state: VerifyState) -> bool:
    if not state.started_at:
        return False
    try:
        started = datetime.fromisoformat(state.started_at)
        elapsed = datetime.now() - started
        return elapsed > timedelta(minutes=TIMEOUT_MINUTES)
    except Exception:
        return False


def clear_state(repo_root: Path) -> None:
    state_file = get_state_file_path(repo_root)
    if state_file.exists():
        try:
            state_file.unlink()
        except Exception:
            pass


def process_hook(input_data: Dict[str, Any]) -> Dict[str, Any]:
    subagent_type = input_data.get("subagent_type", "")
    if subagent_type != "check":
        return {"decision": "allow", "reason": "Not a check agent"}
    repo_root = find_repo_root()
    if repo_root is None:
        return {"decision": "allow", "reason": "Could not find repository root"}
    current_task_file = repo_root / ".current-task"
    task = "unknown"
    if current_task_file.exists():
        try:
            task = current_task_file.read_text(encoding="utf-8").strip() or "unknown"
        except Exception:
            pass
    state = load_state(repo_root, task)
    if check_timeout(state):
        clear_state(repo_root)
        return {"decision": "allow", "reason": f"Timeout ({TIMEOUT_MINUTES} min) exceeded"}
    if state.iteration >= MAX_ITERATIONS:
        clear_state(repo_root)
        return {"decision": "allow", "reason": f"Max iterations ({MAX_ITERATIONS}) reached"}
    verify_commands = get_verify_commands(repo_root)
    if not verify_commands:
        return {"decision": "allow", "reason": "No verify commands configured"}
    passed, message = run_verify_commands(verify_commands, cwd=repo_root)
    if passed:
        clear_state(repo_root)
        return {"decision": "allow", "reason": message}
    else:
        state.iteration += 1
        save_state(repo_root, state)
        return {"decision": "block", "reason": f"Verification failed (iteration {state.iteration}/{MAX_ITERATIONS}): {message}"}


def main():
    input_data = read_stdin_json()
    if not input_data:
        print(json.dumps({"decision": "allow", "reason": "Invalid input"}))
        sys.exit(0)
    output_data = process_hook(input_data)
    print(json.dumps(output_data, ensure_ascii=False))


if __name__ == "__main__":
    main()
`;
}

/**
 * List of template files to update
 */
const TEMPLATE_FILES: TemplateFile[] = [
  {
    path: '.claude/hooks/inject-context.py',
    content: getInjectContextPyTemplate,
    description: 'Context injection hook'
  },
  {
    path: '.claude/hooks/verify-loop.py',
    content: getVerifyLoopPyTemplate,
    description: 'Ralph Loop verification hook'
  }
];

/**
 * Calculate SHA256 hash of content
 */
function calculateHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Check if .ideal directory exists
 */
function isInitialized(projectRoot: string): boolean {
  return existsSync(join(projectRoot, '.ideal'));
}

/**
 * Read installed version
 */
function getInstalledVersion(projectRoot: string): string | null {
  const versionPath = join(projectRoot, '.ideal', '.version');
  if (!existsSync(versionPath)) {
    return null;
  }
  try {
    const content = readFileSync(versionPath, 'utf-8').trim();
    const match = content.match(/v(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Backup a file before updating
 */
function backupFile(filePath: string): string | null {
  if (!existsSync(filePath)) {
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const backupPath = `${filePath}.backup-${timestamp}`;

  try {
    renameSync(filePath, backupPath);
    return backupPath;
  } catch {
    return null;
  }
}

/**
 * Update a single file
 */
interface UpdateResult {
  path: string;
  status: 'created' | 'updated' | 'skipped' | 'unchanged' | 'error';
  message: string;
  backupPath?: string;
}

/**
 * Process a single template file
 */
function processTemplateFile(
  projectRoot: string,
  template: TemplateFile,
  force: boolean,
  dryRun: boolean
): UpdateResult {
  const filePath = join(projectRoot, template.path);
  const newContent = template.content();
  const newHash = calculateHash(newContent);

  // Check if file exists
  if (!existsSync(filePath)) {
    // File doesn't exist - create it
    if (dryRun) {
      return { path: template.path, status: 'created', message: 'Would create new file' };
    }

    // Ensure directory exists
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    try {
      writeFileSync(filePath, newContent, 'utf-8');
      return { path: template.path, status: 'created', message: 'Created new file' };
    } catch (e) {
      return { path: template.path, status: 'error', message: `Failed to create: ${e}` };
    }
  }

  // File exists - compare content
  try {
    const existingContent = readFileSync(filePath, 'utf-8');
    const existingHash = calculateHash(existingContent);

    if (existingHash === newHash && !force) {
      return { path: template.path, status: 'unchanged', message: 'File unchanged' };
    }

    if (dryRun) {
      return {
        path: template.path,
        status: 'updated',
        message: force ? 'Would update (forced)' : 'Would update (content differs)'
      };
    }

    // Backup and update
    const backupPath = backupFile(filePath);
    writeFileSync(filePath, newContent, 'utf-8');

    return {
      path: template.path,
      status: 'updated',
      message: force ? 'Updated (forced)' : 'Updated (content differs)',
      backupPath: backupPath || undefined
    };
  } catch (e) {
    return { path: template.path, status: 'error', message: `Failed to update: ${e}` };
  }
}

/**
 * Update version file
 */
function updateVersionFile(projectRoot: string, dryRun: boolean): UpdateResult {
  const versionPath = join(projectRoot, '.ideal', '.version');
  const newContent = `ideal-cli v${CLI_VERSION}\n`;

  if (!existsSync(versionPath)) {
    if (dryRun) {
      return { path: '.ideal/.version', status: 'created', message: 'Would create version file' };
    }
    writeFileSync(versionPath, newContent, 'utf-8');
    return { path: '.ideal/.version', status: 'created', message: 'Created version file' };
  }

  try {
    const existingContent = readFileSync(versionPath, 'utf-8');
    if (existingContent.trim() === newContent.trim()) {
      return { path: '.ideal/.version', status: 'unchanged', message: 'Version unchanged' };
    }

    if (dryRun) {
      return { path: '.ideal/.version', status: 'updated', message: `Would update to v${CLI_VERSION}` };
    }

    writeFileSync(versionPath, newContent, 'utf-8');
    return { path: '.ideal/.version', status: 'updated', message: `Updated to v${CLI_VERSION}` };
  } catch (e) {
    return { path: '.ideal/.version', status: 'error', message: `Failed to update: ${e}` };
  }
}

/**
 * Print update summary
 */
function printSummary(results: UpdateResult[], dryRun: boolean): void {
  const created = results.filter(r => r.status === 'created');
  const updated = results.filter(r => r.status === 'updated');
  const unchanged = results.filter(r => r.status === 'unchanged');
  const skipped = results.filter(r => r.status === 'skipped');
  const errors = results.filter(r => r.status === 'error');

  console.log('');
  console.log('========================================');
  if (dryRun) {
    logInfo('Dry-run complete - no changes made');
  } else {
    logSuccess('Update complete!');
  }
  console.log('========================================');
  console.log('');

  if (created.length > 0) {
    console.log('Created:');
    created.forEach(r => console.log(`  + ${r.path}`));
    console.log('');
  }

  if (updated.length > 0) {
    console.log('Updated:');
    updated.forEach(r => {
      console.log(`  * ${r.path} - ${r.message}`);
      if (r.backupPath) {
        console.log(`    Backup: ${r.backupPath}`);
      }
    });
    console.log('');
  }

  if (unchanged.length > 0) {
    console.log('Unchanged:');
    unchanged.forEach(r => console.log(`  = ${r.path}`));
    console.log('');
  }

  if (skipped.length > 0) {
    console.log('Skipped:');
    skipped.forEach(r => console.log(`  - ${r.path}: ${r.message}`));
    console.log('');
  }

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(r => console.log(`  ! ${r.path}: ${r.message}`));
    console.log('');
  }

  console.log(`Summary: ${created.length} created, ${updated.length} updated, ${unchanged.length} unchanged, ${errors.length} errors`);
}

/**
 * update command handler
 */
export function updateCommand(args: string[]): void {
  // Parse options
  let dryRun = false;
  let force = false;

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: ideal update [options]');
      console.log('');
      console.log('Options:');
      console.log('  --dry-run       Show what would be updated without making changes');
      console.log('  -f, --force     Force update all files (ignore hash check)');
      console.log('  -h, --help      Show this help message');
      process.exit(0);
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '-f' || arg === '--force') {
      force = true;
    } else {
      logError(`Unknown option: ${arg}`);
      console.log('Usage: ideal update [--dry-run] [-f, --force]');
      process.exit(1);
    }
  }

  const projectRoot = process.cwd();

  // Check if project is initialized
  if (!isInitialized(projectRoot)) {
    logError('Project not initialized');
    logInfo('Run "ideal init" first');
    process.exit(1);
  }

  // Get versions
  const installedVersion = getInstalledVersion(projectRoot);

  logInfo(`CLI version: ${CLI_VERSION}`);
  logInfo(`Installed version: ${installedVersion || 'unknown'}`);
  console.log('');

  if (dryRun) {
    logInfo('Dry-run mode: showing what would be updated');
    console.log('');
  }

  // Process template files
  const results: UpdateResult[] = [];

  for (const template of TEMPLATE_FILES) {
    logInfo(`Processing: ${template.path}`);
    const result = processTemplateFile(projectRoot, template, force, dryRun);
    results.push(result);

    switch (result.status) {
      case 'created':
        dryRun ? logDryRun(`Would create: ${result.path}`) : logSuccess(`Created: ${result.path}`);
        break;
      case 'updated':
        dryRun ? logDryRun(`Would update: ${result.path}`) : logSuccess(`Updated: ${result.path}`);
        break;
      case 'unchanged':
        logInfo(`Unchanged: ${result.path}`);
        break;
      case 'error':
        logError(`${result.path}: ${result.message}`);
        break;
    }
  }

  // Update version file
  logInfo('Processing: .ideal/.version');
  const versionResult = updateVersionFile(projectRoot, dryRun);
  results.push(versionResult);

  if (versionResult.status === 'updated') {
    dryRun ? logDryRun(`Would update: ${versionResult.path}`) : logSuccess(`Updated: ${versionResult.path}`);
  } else if (versionResult.status === 'created') {
    dryRun ? logDryRun(`Would create: ${versionResult.path}`) : logSuccess(`Created: ${versionResult.path}`);
  }

  // Print summary
  printSummary(results, dryRun);

  // Exit with error if any errors occurred
  const errorCount = results.filter(r => r.status === 'error').length;
  if (errorCount > 0) {
    process.exit(1);
  }
}
