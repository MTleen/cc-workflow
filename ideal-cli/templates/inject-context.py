#!/usr/bin/env python3
"""
Claude Code Hook: inject-context.py
自动注入上下文到子 Agent 的 prompt

触发时机: PreToolUse - Task 工具调用前
核心逻辑:
1. 检测 subagent_type（implement、check、debug、research）
2. 读取 .current-task 定位当前需求目录
3. 读取对应的 jsonl 文件
4. 注入所有文件内容到子 Agent 的 prompt

输出格式（Claude Code Hook 规范）:
{
  "prompt": "原始 prompt + 注入的上下文内容"
}
"""

import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, List, Dict, Any


# 支持的 subagent 类型
SUPPORTED_SUBAGENT_TYPES = {
    "implement",
    "check",
    "debug",
    "research"
}


@dataclass
class ContextEntry:
    """JSONL 配置条目数据结构"""
    file: str  # 文件路径（相对或绝对）
    type: str = "file"  # 类型: file 或 directory
    pattern: str = "*"  # 目录时的 glob 模式
    reason: str = ""  # 注入原因说明


@dataclass
class HookInput:
    """Hook 输入数据结构"""
    tool_name: str
    tool_input: Dict[str, Any]
    prompt: str = ""


@dataclass
class HookOutput:
    """Hook 输出数据结构"""
    prompt: str


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

    Args:
        start_path: 起始路径，默认为当前工作目录

    Returns:
        仓库根目录路径，未找到返回 None
    """
    if start_path is None:
        start_path = Path.cwd()

    current = start_path.resolve()

    while current != current.parent:
        git_dir = current / ".git"
        if git_dir.exists():
            return current
        current = current.parent

    # 检查根目录
    if (current / ".git").exists():
        return current

    return None


def get_current_task(repo_root: Path) -> Optional[str]:
    """
    读取 .current-task 文件，获取当前需求目录路径

    文件格式: 单行路径（相对于仓库根目录）

    Args:
        repo_root: 仓库根目录

    Returns:
        当前需求目录路径，文件不存在返回 None
    """
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
    """
    读取 JSONL 配置文件

    Args:
        jsonl_path: JSONL 文件路径

    Returns:
        ContextEntry 列表，解析失败的行会被跳过
    """
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
    """
    读取文件内容

    Args:
        file_path: 文件路径
        max_size: 最大文件大小（字节），超过则截断

    Returns:
        文件内容，读取失败返回 None
    """
    if not file_path.exists():
        print(f"Warning: File not found: {file_path}", file=sys.stderr)
        return None

    if not file_path.is_file():
        return None

    try:
        # 检查文件大小
        file_size = file_path.stat().st_size
        if file_size > max_size:
            content = file_path.read_text(encoding="utf-8")
            return content[:max_size] + f"\n... [文件过大，已截断，原始大小: {file_size} 字节]"
        return file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        print(f"Warning: Binary file skipped: {file_path}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Warning: Failed to read file {file_path}: {e}", file=sys.stderr)
        return None


def read_directory_contents(dir_path: Path, pattern: str = "*", max_files: int = 50) -> Dict[str, str]:
    """
    读取目录下所有匹配文件的内容

    Args:
        dir_path: 目录路径
        pattern: glob 匹配模式
        max_files: 最大文件数量

    Returns:
        {相对路径: 内容} 字典
    """
    contents = {}

    if not dir_path.exists() or not dir_path.is_dir():
        print(f"Warning: Directory not found: {dir_path}", file=sys.stderr)
        return contents

    try:
        files = list(dir_path.glob(pattern))
        for i, file_path in enumerate(files):
            if i >= max_files:
                print(f"Warning: Max files limit reached ({max_files}), some files skipped", file=sys.stderr)
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
    """
    构建注入上下文内容

    Args:
        repo_root: 仓库根目录
        entries: ContextEntry 列表

    Returns:
        格式化的上下文字符串
    """
    context_parts = []
    context_parts.append("\n\n---\n## 自动注入的上下文\n")

    for entry in entries:
        full_path = repo_root / entry.file

        if entry.type == "directory":
            contents = read_directory_contents(full_path, entry.pattern)
            if contents:
                context_parts.append(f"\n### 目录: {entry.file}/")
                if entry.reason:
                    context_parts.append(f"*原因: {entry.reason}*")
                context_parts.append("")

                for rel_path, content in contents.items():
                    context_parts.append(f"#### {entry.file}/{rel_path}")
                    context_parts.append("```")
                    context_parts.append(content)
                    context_parts.append("```")
                    context_parts.append("")
        else:
            content = read_file_content(full_path)
            if content is not None:
                context_parts.append(f"\n### 文件: {entry.file}")
                if entry.reason:
                    context_parts.append(f"*原因: {entry.reason}*")
                context_parts.append("")
                context_parts.append("```")
                context_parts.append(content)
                context_parts.append("```")
                context_parts.append("")

    context_parts.append("\n---\n*以上内容由 Claude Code Hook 自动注入*\n")

    return "\n".join(context_parts)


def inject_to_prompt(original_prompt: str, context: str) -> str:
    """
    将上下文注入到原始 prompt

    Args:
        original_prompt: 原始 prompt
        context: 要注入的上下文

    Returns:
        注入后的 prompt
    """
    return original_prompt + context


def get_jsonl_path_for_subagent(subagent_type: str, task_dir: str) -> Optional[str]:
    """
    根据 subagent 类型获取对应的 jsonl 文件名

    Args:
        subagent_type: subagent 类型
        task_dir: 当前需求目录

    Returns:
        jsonl 文件名
    """
    # 所有 subagent 类型都使用同一个 context.jsonl
    # 未来可以根据不同类型使用不同的配置文件
    return "context.jsonl"


def process_hook(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    处理 Hook 逻辑

    Args:
        input_data: Hook 输入数据

    Returns:
        Hook 输出数据
    """
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    original_prompt = input_data.get("prompt", "")

    # 1. 只拦截 Task 工具
    if tool_name != "Task":
        # 不拦截，返回原始数据
        return {"prompt": original_prompt}

    # 2. 检测 subagent_type
    subagent_type = tool_input.get("subagent_type", "")
    if not subagent_type:
        # 没有 subagent_type，不处理
        return {"prompt": original_prompt}

    # 3. 验证 subagent_type 是否支持
    if subagent_type not in SUPPORTED_SUBAGENT_TYPES:
        print(f"Info: Unsupported subagent_type '{subagent_type}', skipping context injection", file=sys.stderr)
        return {"prompt": original_prompt}

    # 4. 查找仓库根目录
    repo_root = find_repo_root()
    if repo_root is None:
        print("Warning: Could not find repository root (.git directory)", file=sys.stderr)
        return {"prompt": original_prompt}

    # 5. 读取当前任务目录
    task_dir = get_current_task(repo_root)
    if task_dir is None:
        print("Info: No .current-task file found, skipping context injection", file=sys.stderr)
        return {"prompt": original_prompt}

    # 6. 获取并读取 jsonl 配置文件
    jsonl_filename = get_jsonl_path_for_subagent(subagent_type, task_dir)
    jsonl_path = repo_root / task_dir / jsonl_filename

    entries = read_jsonl_entries(jsonl_path)
    if not entries:
        print(f"Info: No context entries found in {jsonl_path}", file=sys.stderr)
        return {"prompt": original_prompt}

    # 7. 构建并注入上下文
    context = build_context(repo_root, entries)
    injected_prompt = inject_to_prompt(original_prompt, context)

    print(f"Info: Injected context from {len(entries)} entries for subagent_type '{subagent_type}'", file=sys.stderr)

    return {"prompt": injected_prompt}


def main():
    """主函数"""
    # 读取 stdin JSON
    input_data = read_stdin_json()

    if not input_data:
        # 无法解析输入，不做任何修改
        print("Error: No valid input received", file=sys.stderr)
        sys.exit(0)  # 返回 0 表示不阻断

    # 处理 Hook
    output_data = process_hook(input_data)

    # 输出结果 JSON
    print(json.dumps(output_data, ensure_ascii=False))


if __name__ == "__main__":
    main()
