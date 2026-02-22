/**
 * init.ts - Initialize project structure for CC-Workflow
 *
 * Creates:
 *   .ideal/                   Configuration directory
 *   .ideal/worktree.yaml      Worktree configuration
 *   .ideal/.version           CLI version marker
 *   .claude/hooks/            Hook scripts directory
 *   .claude/hooks/inject-context.py
 *   .claude/hooks/verify-loop.py
 *   .claude/settings.json     Claude Code settings (if not exists)
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { execSync } from 'child_process';

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
  NC: '\x1b[0m', // No Color
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
 * Check if current directory is a git repository
 */
function isGitRepository(): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get template content - embedded in code for portability
 */
function getWorktreeYamlTemplate(): string {
  return `# =============================================================================
# CC-Workflow Worktree Configuration
# =============================================================================
# This file configures git worktree management for isolated development
# environments. Each requirement gets its own worktree for context isolation.
#
# Usage:
#   Create worktree: ideal worktree create <requirement-name>
#   Remove worktree: ideal worktree remove <requirement-name>
# =============================================================================

# Worktree storage directory (relative to project root)
# All worktrees will be created as subdirectories under this path
# Example: ../ideal-worktrees/2026-02-22-user-auth/
worktree_dir: ../ideal-worktrees

# Environment files to copy into new worktrees
# These files are copied from the main repository to each new worktree
# Use this for: .env files, IDE settings, developer credentials, etc.
copy:
  - .env
  - .ideal/.developer

# Initialization commands to run after worktree creation
# These commands are executed in the new worktree directory
# Use this for: dependency installation, build setup, etc.
post_create:
  - pnpm install --frozen-lockfile

# Verification commands for Ralph Loop (code quality checks)
# These commands are run to verify code quality before committing
# Used by check Agent during the implement-check-debug cycle
verify:
  - pnpm lint
  - pnpm typecheck
  - pnpm test

# =============================================================================
# Configuration Notes:
# =============================================================================
# 1. worktree_dir: Should be outside the main repository to avoid conflicts
# 2. copy: Files must exist in the main repo or will be skipped with a warning
# 3. post_create: Commands run sequentially; failure stops the process
# 4. verify: Commands should exit with 0 on success, non-zero on failure
# =============================================================================
`;
}

/**
 * Get inject-context.py template content
 */
function getInjectContextPyTemplate(): string {
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

# Supported subagent types
SUPPORTED_SUBAGENT_TYPES = {"implement", "check", "debug", "research"}


@dataclass
class ContextEntry:
    """JSONL configuration entry data structure"""
    file: str
    type: str = "file"
    pattern: str = "*"
    reason: str = ""


def read_stdin_json() -> Dict[str, Any]:
    """Read JSON data from stdin"""
    try:
        return json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Error: Failed to parse stdin JSON: {e}", file=sys.stderr)
        return {}


def find_repo_root(start_path: Optional[Path] = None) -> Optional[Path]:
    """Find repository root by looking for .git directory"""
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
    """Read .current-task file to get current requirement directory"""
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
    """Read JSONL configuration file"""
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
    """Read file content with size limit"""
    if not file_path.exists():
        print(f"Warning: File not found: {file_path}", file=sys.stderr)
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
        print(f"Warning: Binary file skipped: {file_path}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Warning: Failed to read file {file_path}: {e}", file=sys.stderr)
        return None


def read_directory_contents(dir_path: Path, pattern: str = "*", max_files: int = 50) -> Dict[str, str]:
    """Read all matching files in a directory"""
    contents = {}

    if not dir_path.exists() or not dir_path.is_dir():
        print(f"Warning: Directory not found: {dir_path}", file=sys.stderr)
        return contents

    try:
        files = list(dir_path.glob(pattern))
        for i, file_path in enumerate(files):
            if i >= max_files:
                print(f"Warning: Max files limit reached ({max_files})", file=sys.stderr)
                break

            if file_path.is_file():
                content = read_file_content(file_path)
                if content is not None:
                    relative_path = file_path.relative_to(dir_path)
                    contents[str(relative_path)] = content
    except Exception as e:
        print(f"Warning: Failed to read directory {dir_path}: {e}", file=sys.stderr)

    return contents


def build_context(repo_root: Path, entries: List[ContextEntry]) -> str:
    """Build injected context content"""
    context_parts = []
    context_parts.append("\\n\\n---\\n## Auto-injected Context\\n")

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


def inject_to_prompt(original_prompt: str, context: str) -> str:
    """Inject context into original prompt"""
    return original_prompt + context


def get_jsonl_path_for_subagent(subagent_type: str, task_dir: str) -> str:
    """Get jsonl filename for subagent type"""
    return "context.jsonl"


def process_hook(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """Process hook logic"""
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    original_prompt = input_data.get("prompt", "")

    # Only intercept Task tool
    if tool_name != "Task":
        return {"prompt": original_prompt}

    # Detect subagent_type
    subagent_type = tool_input.get("subagent_type", "")
    if not subagent_type:
        return {"prompt": original_prompt}

    # Validate subagent_type
    if subagent_type not in SUPPORTED_SUBAGENT_TYPES:
        print(f"Info: Unsupported subagent_type '{subagent_type}'", file=sys.stderr)
        return {"prompt": original_prompt}

    # Find repository root
    repo_root = find_repo_root()
    if repo_root is None:
        print("Warning: Could not find repository root", file=sys.stderr)
        return {"prompt": original_prompt}

    # Read current task directory
    task_dir = get_current_task(repo_root)
    if task_dir is None:
        print("Info: No .current-task file found", file=sys.stderr)
        return {"prompt": original_prompt}

    # Get and read jsonl configuration
    jsonl_filename = get_jsonl_path_for_subagent(subagent_type, task_dir)
    jsonl_path = repo_root / task_dir / jsonl_filename

    entries = read_jsonl_entries(jsonl_path)
    if not entries:
        print(f"Info: No context entries found in {jsonl_path}", file=sys.stderr)
        return {"prompt": original_prompt}

    # Build and inject context
    context = build_context(repo_root, entries)
    injected_prompt = inject_to_prompt(original_prompt, context)

    print(f"Info: Injected context from {len(entries)} entries", file=sys.stderr)

    return {"prompt": injected_prompt}


def main():
    """Main function"""
    input_data = read_stdin_json()

    if not input_data:
        print("Error: No valid input received", file=sys.stderr)
        sys.exit(0)

    output_data = process_hook(input_data)
    print(json.dumps(output_data, ensure_ascii=False))


if __name__ == "__main__":
    main()
`;
}

/**
 * Get verify-loop.py template content
 */
function getVerifyLoopPyTemplate(): string {
  return `#!/usr/bin/env python3
"""
Claude Code Hook: verify-loop.py
Ralph Loop quality control - Execute verification when sub-Agent attempts to stop

Trigger: SubagentStop - Check Agent attempts to stop
Logic:
1. Check worktree.yaml verify commands
2. Execute verification (pnpm lint, typecheck, test)
3. All pass -> allow stop
4. Any fail -> block stop, require continued fixes
5. Max 5 iterations to prevent infinite loops

Output format (Claude Code Hook spec):
{
  "decision": "allow" | "block",
  "reason": "..."
}
"""

import json
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

# Ralph Loop configuration
MAX_ITERATIONS = 5
TIMEOUT_MINUTES = 30
COMMAND_TIMEOUT_SECONDS = 120
MAX_OUTPUT_LENGTH = 500


@dataclass
class VerifyState:
    """Loop state data structure"""
    task: str
    iteration: int = 0
    started_at: str = ""

    def __post_init__(self):
        if not self.started_at:
            self.started_at = datetime.now().isoformat()


def read_stdin_json() -> Dict[str, Any]:
    """Read JSON data from stdin"""
    try:
        return json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Error: Failed to parse stdin JSON: {e}", file=sys.stderr)
        return {}


def find_repo_root(start_path: Optional[Path] = None) -> Optional[Path]:
    """Find repository root by looking for .git directory"""
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
    """Simple YAML parser (no external dependencies)"""
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
    """Read verify commands from worktree.yaml"""
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
    except Exception as e:
        print(f"Warning: Failed to read worktree.yaml: {e}", file=sys.stderr)
        return []


def run_verify_commands(commands: List[str], cwd: Optional[Path] = None) -> Tuple[bool, str]:
    """Execute verification commands"""
    if not commands:
        return True, "No verify commands configured"

    work_dir = str(cwd) if cwd else None

    for cmd in commands:
        try:
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=COMMAND_TIMEOUT_SECONDS,
                cwd=work_dir
            )

            if result.returncode != 0:
                error_output = result.stderr or result.stdout
                if len(error_output) > MAX_OUTPUT_LENGTH:
                    error_output = error_output[:MAX_OUTPUT_LENGTH] + "..."
                return False, f"Command '{cmd}' failed:\\n{error_output}"

        except subprocess.TimeoutExpired:
            return False, f"Command '{cmd}' timed out after {COMMAND_TIMEOUT_SECONDS}s"
        except Exception as e:
            return False, f"Command '{cmd}' error: {str(e)}"

    return True, f"All {len(commands)} verify commands passed"


def get_state_file_path(repo_root: Path) -> Path:
    """Get state file path"""
    return repo_root / ".ideal" / ".verify-state.json"


def load_state(repo_root: Path, task: str) -> VerifyState:
    """Load loop state"""
    state_file = get_state_file_path(repo_root)

    if state_file.exists():
        try:
            data = json.loads(state_file.read_text(encoding="utf-8"))
            if data.get("task") == task:
                return VerifyState(
                    task=data.get("task", task),
                    iteration=data.get("iteration", 0),
                    started_at=data.get("started_at", "")
                )
        except Exception as e:
            print(f"Warning: Failed to load state: {e}", file=sys.stderr)

    return VerifyState(task=task)


def save_state(repo_root: Path, state: VerifyState) -> None:
    """Save loop state"""
    state_file = get_state_file_path(repo_root)
    state_file.parent.mkdir(parents=True, exist_ok=True)

    try:
        state_file.write_text(
            json.dumps({
                "task": state.task,
                "iteration": state.iteration,
                "started_at": state.started_at
            }, indent=2),
            encoding="utf-8"
        )
    except Exception as e:
        print(f"Warning: Failed to save state: {e}", file=sys.stderr)


def check_timeout(state: VerifyState) -> bool:
    """Check if timeout exceeded"""
    if not state.started_at:
        return False

    try:
        started = datetime.fromisoformat(state.started_at)
        now = datetime.now()
        elapsed = now - started
        return elapsed > timedelta(minutes=TIMEOUT_MINUTES)
    except Exception:
        return False


def clear_state(repo_root: Path) -> None:
    """Clear state file"""
    state_file = get_state_file_path(repo_root)
    if state_file.exists():
        try:
            state_file.unlink()
        except Exception:
            pass


def process_hook(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """Process hook logic"""
    subagent_type = input_data.get("subagent_type", "")

    # Only intercept check agent
    if subagent_type != "check":
        return {"decision": "allow", "reason": "Not a check agent"}

    # Find repository root
    repo_root = find_repo_root()
    if repo_root is None:
        return {"decision": "allow", "reason": "Could not find repository root"}

    # Get current task
    current_task_file = repo_root / ".current-task"
    task = "unknown"
    if current_task_file.exists():
        try:
            task = current_task_file.read_text(encoding="utf-8").strip() or "unknown"
        except Exception:
            pass

    # Load state
    state = load_state(repo_root, task)

    # Check timeout
    if check_timeout(state):
        clear_state(repo_root)
        return {"decision": "allow", "reason": f"Timeout ({TIMEOUT_MINUTES} min) exceeded"}

    # Check iteration count
    if state.iteration >= MAX_ITERATIONS:
        clear_state(repo_root)
        return {"decision": "allow", "reason": f"Max iterations ({MAX_ITERATIONS}) reached"}

    # Get verify commands
    verify_commands = get_verify_commands(repo_root)

    if not verify_commands:
        return {"decision": "allow", "reason": "No verify commands configured"}

    # Execute verification
    passed, message = run_verify_commands(verify_commands, cwd=repo_root)

    if passed:
        clear_state(repo_root)
        return {"decision": "allow", "reason": message}
    else:
        state.iteration += 1
        save_state(repo_root, state)
        return {
            "decision": "block",
            "reason": f"Verification failed (iteration {state.iteration}/{MAX_ITERATIONS}): {message}"
        }


def main():
    """Main function"""
    input_data = read_stdin_json()

    if not input_data:
        print("Error: No valid input received", file=sys.stderr)
        print(json.dumps({"decision": "allow", "reason": "Invalid input"}))
        sys.exit(0)

    output_data = process_hook(input_data)
    print(json.dumps(output_data, ensure_ascii=False))


if __name__ == "__main__":
    main()
`;
}

/**
 * Get Claude settings.json template
 */
function getSettingsJsonTemplate(): string {
  return JSON.stringify({
    hooks: {
      PreToolUse: [
        {
          matcher: "Task",
          hooks: [".claude/hooks/inject-context.py"]
        }
      ],
      SubagentStop: [
        {
          matcher: "check",
          hooks: [".claude/hooks/verify-loop.py"]
        }
      ]
    }
  }, null, 2);
}

/**
 * Create directory if it doesn't exist
 */
function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    logSuccess(`Created directory: ${dirPath}`);
  }
}

/**
 * Write file if it doesn't exist
 */
function writeFileIfNotExists(filePath: string, content: string): boolean {
  if (existsSync(filePath)) {
    logWarning(`File exists, skipping: ${filePath}`);
    return false;
  }

  writeFileSync(filePath, content, 'utf-8');
  logSuccess(`Created file: ${filePath}`);
  return true;
}

/**
 * init command handler
 */
export function initCommand(_args: string[]): void {
  logInfo('Initializing CC-Workflow project structure...');

  // Check if we're in a git repository
  if (!isGitRepository()) {
    logError('Current directory is not a git repository');
    logInfo('Please run "git init" first or navigate to a git repository');
    process.exit(1);
  }

  // Get project root (current working directory)
  const projectRoot = process.cwd();

  // Create .ideal/ directory
  const idealDir = join(projectRoot, '.ideal');
  ensureDir(idealDir);

  // Create .ideal/worktree.yaml
  const worktreeYamlPath = join(idealDir, 'worktree.yaml');
  writeFileIfNotExists(worktreeYamlPath, getWorktreeYamlTemplate());

  // Create .ideal/.version
  const versionPath = join(idealDir, '.version');
  writeFileIfNotExists(versionPath, `ideal-cli v${CLI_VERSION}\n`);

  // Create .claude/hooks/ directory
  const hooksDir = join(projectRoot, '.claude', 'hooks');
  ensureDir(hooksDir);

  // Create inject-context.py
  const injectContextPath = join(hooksDir, 'inject-context.py');
  writeFileIfNotExists(injectContextPath, getInjectContextPyTemplate());

  // Create verify-loop.py
  const verifyLoopPath = join(hooksDir, 'verify-loop.py');
  writeFileIfNotExists(verifyLoopPath, getVerifyLoopPyTemplate());

  // Create/update .claude/settings.json
  const settingsPath = join(projectRoot, '.claude', 'settings.json');
  if (!existsSync(settingsPath)) {
    ensureDir(dirname(settingsPath));
    writeFileSync(settingsPath, getSettingsJsonTemplate(), 'utf-8');
    logSuccess(`Created file: ${settingsPath}`);
  } else {
    logWarning(`File exists, skipping: ${settingsPath}`);
    logInfo('If you want to enable hooks, manually merge the hook configuration');
  }

  // Summary
  console.log('');
  console.log('========================================');
  logSuccess('CC-Workflow project initialized!');
  console.log('========================================');
  console.log('');
  console.log('Created structure:');
  console.log('  .ideal/');
  console.log('    worktree.yaml      - Worktree configuration');
  console.log('    .version           - CLI version marker');
  console.log('  .claude/');
  console.log('    hooks/');
  console.log('      inject-context.py - Context injection hook');
  console.log('      verify-loop.py    - Ralph Loop verification hook');
  console.log('    settings.json      - Claude Code settings');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Edit .ideal/worktree.yaml to customize your project');
  console.log('  2. Run "ideal worktree create <name>" to create your first worktree');
  console.log('');
}
