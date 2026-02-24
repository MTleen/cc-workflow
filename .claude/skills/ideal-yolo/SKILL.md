# ideal-yolo Skill

## 概述

YOLO 模式自动化执行引擎，支持从 P3 到 P14 阶段的全自动执行。

## 功能

- **自动执行**：P2 评审通过后，自动执行 P3-P14 阶段
- **自动评审**：AI 自动进行阶段评审并记录结果
- **熔断机制**：异常检测（连续失败、测试失败、重复错误）自动暂停
- **中断恢复**：支持断点续传，从中断点继续执行
- **审计日志**：完整记录执行过程和评审结果

## 使用方式

### 启用 YOLO 模式

在 P2 评审通过后，系统会询问是否启用 YOLO 模式：

```
用户选择 "是" → 启用 YOLO 模式
用户选择 "否" → 继续传统人工评审流程
```

### 命令

```bash
# 启用 YOLO 模式
python3 .claude/skills/ideal-yolo/scripts/yolo_control.py --action enable --state-file <path>

# 检查状态
python3 .claude/skills/ideal-yolo/scripts/yolo_control.py --action status --state-file <path>

# 恢复执行
python3 .claude/skills/ideal-yolo/scripts/yolo_resume.py --action resume --state-file <path>
```

## 模块结构

```
.claude/skills/ideal-yolo/
├── SKILL.md                    # Skill 定义（本文件）
├── scripts/
│   ├── yolo_state.py          # M1 状态管理
│   ├── yolo_logger.py         # M2 审计日志
│   ├── yolo_control.py        # M3 模式控制
│   ├── yolo_review.py         # M4 自动评审
│   ├── yolo_orchestrator.py   # M5 阶段编排
│   ├── yolo_ralph.py          # M6 Ralph Loop 集成
│   ├── yolo_circuit.py        # M7 熔断机制
│   └── yolo_resume.py         # M8 中断恢复
├── references/
│   ├── review-standards.md    # 评审标准
│   └── recovery-protocol.md   # 恢复协议
└── templates/
    └── audit-log.md           # 审计日志模板

.claude/ralph/
├── ralph-loop.sh              # 主循环脚本
├── PROMPT.md                  # 执行提示（动态生成）
└── hooks/
    ├── pre-phase.sh           # 前置钩子
    ├── post-phase.sh          # 后置钩子
    ├── on-error.sh            # 错误钩子
    └── on-complete.sh         # 完成钩子
```

## 阶段编排

| 当前阶段 | 执行 Skill | 评审阶段 | 评审方式 |
|----------|-----------|----------|----------|
| P3 | ideal-dev-solution | P4 | 自动评审 |
| P5 | ideal-dev-plan | P6 | 自动评审 |
| P7 | ideal-test-case | P8 | 自动评审 |
| P9 | ideal-dev-exec | P10 | 自动评审 |
| P11 | ideal-test-exec | P12 | 自动评审 |
| P13 | ideal-wiki | P14 | 自动评审 |

## 熔断条件

| 异常类型 | 阈值 | 处理方式 |
|----------|------|----------|
| 评审失败 | 连续 3 次不通过 | 暂停执行，等待用户介入 |
| 测试失败 | 通过率 < 80% | 暂停执行，等待用户介入 |
| 重复错误 | 同一错误重复 5 次 | 暂停执行，等待用户介入 |

## 审计日志

日志存储位置：`docs/迭代/{需求名}/yolo-logs/`

日志内容：
- 执行时间戳
- 阶段名称和编号
- 评审意见（包含通过/不通过判定）
- 修改建议（如有）
- 执行结果
- Token 消耗统计

## 恢复机制

1. 检测到中断后，记录当前状态到流程状态文件
2. 等待恢复条件满足
3. 自动重新启动 Ralph Loop，从上次中断点继续执行
4. 重置熔断计数器

## 依赖

- Python 3.8+
- PyYAML
- pytest（测试）
