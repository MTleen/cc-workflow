#!/usr/bin/env python3
"""
Claude Code Hook: verify-loop.py
Ralph Loop 质量控制 - 在子 Agent 尝试停止时执行验证

触发时机: SubagentStop - Check Agent 尝试停止时
核心逻辑:
1. 检查 worktree.yaml 的 verify 命令配置
2. 执行验证命令（pnpm lint、pnpm typecheck、pnpm test）
3. 全部通过 → 允许停止
4. 任一失败 → 阻止停止，要求继续修复
5. 最多 5 次循环，防止无限循环

输出格式（Claude Code Hook 规范）:
{
  "decision": "allow" | "block",
  "reason": "..."
}
"""

import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple


# Ralph Loop 配置
MAX_ITERATIONS = 5
TIMEOUT_MINUTES = 30
COMMAND_TIMEOUT_SECONDS = 120
MAX_OUTPUT_LENGTH = 500


@dataclass
class VerifyState:
    """循环状态数据结构"""
    task: str
    iteration: int = 0
    started_at: str = ""

    def __post_init__(self):
        if not self.started_at:
            self.started_at = datetime.now().isoformat()


def read_stdin_json() -> Dict[str, Any]:
    """从 stdin 读取 JSON 数据"""
    try:
        return json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Error: Failed to parse stdin JSON: {e}", file=sys.stderr)
        return {}


def find_repo_root(start_path: Optional[Path] = None) -> Optional[Path]:
    """
    向上查找 .git 目录，定位仓库根目录
    """
    if start_path is None:
        start_path = Path.cwd()

    current = start_path.resolve()

    while current != current.parent:
        git_dir = current / ".git"
        if git_dir.exists():
            return current
        current = current.parent

    if (current / ".git").exists():
        return current

    return None


def parse_yaml_simple(yaml_content: str) -> Dict[str, Any]:
    """
    简单的 YAML 解析（不使用外部库）

    支持基本的键值对和列表格式
    """
    result = {}
    current_key = None
    current_list = None

    for line in yaml_content.split('\n'):
        # 跳过注释和空行
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            continue

        # 检测列表项
        if stripped.startswith('- '):
            if current_key and current_key in result:
                if not isinstance(result[current_key], list):
                    result[current_key] = []
                result[current_key].append(stripped[2:])
            continue

        # 检测键值对
        if ':' in line and not line.startswith(' '):
            current_key = None
            current_list = None
            key, _, value = line.partition(':')
            key = key.strip()
            value = value.strip()
            if value:
                result[key] = value
            else:
                result[key] = []
                current_key = key
        elif ':' in line and line.startswith(' ') and current_key:
            # 嵌套键值对，保持当前 key
            pass

    return result


def get_verify_commands(repo_root: Path) -> List[str]:
    """
    从 worktree.yaml 读取 verify 命令列表

    Args:
        repo_root: 仓库根目录

    Returns:
        验证命令列表，配置不存在时返回空列表
    """
    worktree_yaml = repo_root / ".ideal" / "worktree.yaml"

    if not worktree_yaml.exists():
        return []

    try:
        content = worktree_yaml.read_text(encoding="utf-8")
        parsed = parse_yaml_simple(content)

        verify = parsed.get("verify", [])
        if isinstance(verify, str):
            # 单个命令
            return [verify] if verify else []
        return verify
    except Exception as e:
        print(f"Warning: Failed to read worktree.yaml: {e}", file=sys.stderr)
        return []


def run_verify_commands(commands: List[str], cwd: Optional[Path] = None) -> Tuple[bool, str]:
    """
    执行验证命令列表

    Args:
        commands: 验证命令列表
        cwd: 工作目录

    Returns:
        (是否全部通过, 消息)
    """
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
                # 命令失败
                error_output = result.stderr or result.stdout
                if len(error_output) > MAX_OUTPUT_LENGTH:
                    error_output = error_output[:MAX_OUTPUT_LENGTH] + "..."

                return False, f"Command '{cmd}' failed:\n{error_output}"

        except subprocess.TimeoutExpired:
            return False, f"Command '{cmd}' timed out after {COMMAND_TIMEOUT_SECONDS}s"
        except Exception as e:
            return False, f"Command '{cmd}' error: {str(e)}"

    return True, f"All {len(commands)} verify commands passed"


def get_state_file_path(repo_root: Path) -> Path:
    """获取状态文件路径"""
    return repo_root / ".ideal" / ".verify-state.json"


def load_state(repo_root: Path, task: str) -> VerifyState:
    """
    加载循环状态

    Args:
        repo_root: 仓库根目录
        task: 当前任务标识

    Returns:
        VerifyState 实例
    """
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

    # 返回新状态
    return VerifyState(task=task)


def save_state(repo_root: Path, state: VerifyState) -> None:
    """
    保存循环状态

    Args:
        repo_root: 仓库根目录
        state: 要保存的状态
    """
    state_file = get_state_file_path(repo_root)

    # 确保目录存在
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
    """
    检查是否超时

    Args:
        state: 当前状态

    Returns:
        是否超时
    """
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
    """清除状态文件"""
    state_file = get_state_file_path(repo_root)
    if state_file.exists():
        try:
            state_file.unlink()
        except Exception:
            pass


def process_hook(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    处理 Hook 逻辑

    Args:
        input_data: Hook 输入数据

    Returns:
        Hook 输出数据（decision 和 reason）
    """
    # 获取 subagent_type
    subagent_type = input_data.get("subagent_type", "")

    # 只拦截 check agent
    if subagent_type != "check":
        # 非 check agent，直接放行
        return {"decision": "allow", "reason": "Not a check agent, allowing stop"}

    # 查找仓库根目录
    repo_root = find_repo_root()
    if repo_root is None:
        return {"decision": "allow", "reason": "Could not find repository root"}

    # 获取当前任务
    current_task_file = repo_root / ".current-task"
    task = "unknown"
    if current_task_file.exists():
        try:
            task = current_task_file.read_text(encoding="utf-8").strip() or "unknown"
        except Exception:
            pass

    # 加载状态
    state = load_state(repo_root, task)

    # 检查超时
    if check_timeout(state):
        clear_state(repo_root)
        return {
            "decision": "allow",
            "reason": f"Timeout ({TIMEOUT_MINUTES} minutes) exceeded, allowing stop"
        }

    # 检查迭代次数
    if state.iteration >= MAX_ITERATIONS:
        clear_state(repo_root)
        return {
            "decision": "allow",
            "reason": f"Max iterations ({MAX_ITERATIONS}) reached, allowing stop"
        }

    # 获取验证命令
    verify_commands = get_verify_commands(repo_root)

    if not verify_commands:
        # 没有配置验证命令，放行
        return {"decision": "allow", "reason": "No verify commands configured"}

    # 执行验证命令
    passed, message = run_verify_commands(verify_commands, cwd=repo_root)

    if passed:
        # 验证通过，清除状态并放行
        clear_state(repo_root)
        return {"decision": "allow", "reason": message}
    else:
        # 验证失败，递增迭代次数
        state.iteration += 1
        save_state(repo_root, state)

        return {
            "decision": "block",
            "reason": f"Verification failed (iteration {state.iteration}/{MAX_ITERATIONS}): {message}"
        }


def main():
    """主函数"""
    # 读取 stdin JSON
    input_data = read_stdin_json()

    if not input_data:
        # 无法解析输入，允许停止
        print("Error: No valid input received", file=sys.stderr)
        print(json.dumps({"decision": "allow", "reason": "Invalid input"}))
        sys.exit(0)

    # 处理 Hook
    output_data = process_hook(input_data)

    # 输出结果 JSON
    print(json.dumps(output_data, ensure_ascii=False))


if __name__ == "__main__":
    main()
