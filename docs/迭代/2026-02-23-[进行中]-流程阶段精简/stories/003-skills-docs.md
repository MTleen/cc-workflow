---
story_id: 003
title: Skills 文档更新
status: pending
depends_on: [001]
---

# Story 003: Skills 文档更新

## 上下文

### 需求来源
> 来源：P1-需求文档.md#2.1 涉及模块

| 模块名称 | 当前职责 | 重构后职责 |
|----------|----------|------------|
| `ideal-wiki` | P15 维基更新 | P13 维基更新 |
| `ideal-requirement` | 需求收集（含阶段引用） | 更新阶段引用 |
| `ideal-init` | 初始化流程状态 | 更新流程状态模板 |

### 技术方案
> 来源：P3-技术方案.md#2.2 涉及文件目录结构

需要更新的 Skills：
- `.claude/skills/ideal-flow-control/SKILL.md`
- `.claude/skills/ideal-wiki/SKILL.md`
- `.claude/skills/ideal-requirement/SKILL.md`
- `.claude/skills/ideal-init/SKILL.md`
- 其他相关 Skills

### 相关代码

依赖 Story 001 完成的 flow-state-spec.md 作为参考。

## 任务清单

- [ ] 任务 1: 更新 ideal-wiki/SKILL.md (P15 → P13)
- [ ] 任务 2: 更新 ideal-requirement/SKILL.md
- [ ] 任务 3: 更新 ideal-init/SKILL.md
- [ ] 任务 4: 更新 ideal-flow-control/SKILL.md
- [ ] 任务 5: 检查并更新其他 Skills 中的阶段引用

## 验收标准

### 功能验收
- [ ] ideal-wiki 中阶段引用为 P13
- [ ] 所有 Skills 中阶段引用与新编号一致
- [ ] 无遗漏的旧阶段引用

### 质量验收
- [ ] 文档格式正确
- [ ] 阶段描述准确

## 实现笔记

<!-- 由 Claude 在执行过程中填写 -->
