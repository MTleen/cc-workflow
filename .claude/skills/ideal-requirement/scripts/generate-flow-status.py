#!/usr/bin/env python3
"""
Generate flow status file for requirement tracking.

Creates or updates 流程状态.md with current phase and status.
"""

import sys
from datetime import datetime
from pathlib import Path


def generate_flow_status(output_dir: str, requirement_name: str, phase: str = "P1") -> str:
    """Generate flow status file content."""

    timestamp = datetime.now().strftime("%Y-%m-%d")

    content = f"""---
需求名称: {requirement_name}
创建时间: {timestamp}
---

# 流程状态

## 当前状态

current_phase: {phase}
phase_status: completed

## 阶段详情

| 阶段 | 状态 | 开始时间 | 完成时间 |
|------|------|----------|----------|
| P1 需求编写 | ✅ 已完成 | {timestamp} | {timestamp} |
| P2 需求评审 | ⏳ 待开始 | - | - |
| P3 技术方案 | ⏳ 待开始 | - | - |
| P4 方案评审 | ⏳ 待开始 | - | - |
| P5 计划生成 | ⏳ 待开始 | - | - |
| P6 计划评审 | ⏳ 待开始 | - | - |
| P7 测试用例 | ⏳ 待开始 | - | - |
| P8 用例评审 | ⏳ 待开始 | - | - |
| P9 开发执行 | ⏳ 待开始 | - | - |
| P10 代码评审 | ⏳ 待开始 | - | - |
| P11 测试执行 | ⏳ 待开始 | - | - |
| P12 测试评审 | ⏳ 待开始 | - | - |
| P13 上线评审 | ⏳ 待开始 | - | - |
| P14 部署上线 | ⏳ 待开始 | - | - |
| P15 维基更新 | ⏳ 待开始 | - | - |
| P16 维基评审 | ⏳ 待开始 | - | - |

## 下一步

当前阶段已完成，等待进入 **P2 需求评审**阶段。
请通知评审人员查看 `P1-需求文档.md`。

---

*最后更新: {timestamp}*
"""

    return content


def main():
    if len(sys.argv) < 3:
        print("Usage: python generate-flow-status.py <output_dir> <requirement_name> [phase]")
        print("Example: python generate-flow-status.py docs/迭代/用户登录 用户登录 P1")
        sys.exit(1)

    output_dir = sys.argv[1]
    requirement_name = sys.argv[2]
    phase = sys.argv[3] if len(sys.argv) > 3 else "P1"

    output_path = Path(output_dir) / "流程状态.md"

    # Create directory if needed
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Generate content
    content = generate_flow_status(output_dir, requirement_name, phase)

    # Write file
    output_path.write_text(content)

    print(f"✅ Generated: {output_path}")
    print(f"   Phase: {phase}")
    print(f"   Status: completed")
    print(f"   Next: P2 需求评审")


if __name__ == "__main__":
    main()
