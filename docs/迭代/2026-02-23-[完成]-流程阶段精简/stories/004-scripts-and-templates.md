---
story_id: 004
title: 脚本和模板更新
status: pending
depends_on: [001]
---

# Story 004: 脚本和模板更新

## 上下文

### 需求来源
> 来源：P1-需求文档.md#2.1 涉及模块

| 模块名称 | 当前职责 | 重构后职责 |
|----------|----------|------------|
| 脚本文件 | flow-state.py, generate-flow-status.py | 更新阶段逻辑 |

### 技术方案
> 来源：P3-技术方案.md#5.2 脚本接口变更

| 脚本 | 变更内容 |
|------|----------|
| `flow-state.py` | MAX_PHASE = 15, 阶段判断逻辑更新 |
| `generate-flow-status.py` | 模板中阶段列表更新 |

### 相关代码

- `.claude/skills/ideal-flow-control/scripts/flow-state.py`
- `.claude/skills/ideal-requirement/scripts/generate-flow-status.py`
- `.claude/skills/ideal-init/references/templates/flow-status.md.tmpl`

依赖 Story 001 完成的 flow-state-spec.md 作为参考。

## 任务清单

### 脚本更新
- [ ] 任务 1: 更新 flow-state.py (MAX_PHASE = 15)
- [ ] 任务 2: 更新 generate-flow-status.py (阶段列表)
- [ ] 任务 3: 验证脚本功能

### 模板更新
- [ ] 任务 4: 更新 flow-status.md.tmpl (P13-P15)
- [ ] 任务 5: 验证模板可用性

## 验收标准

### 功能验收
- [ ] flow-state.py 中 MAX_PHASE = 15
- [ ] generate-flow-status.py 生成的模板正确
- [ ] flow-status.md.tmpl 包含 P1-P15 阶段列表

### 质量验收
- [ ] 脚本执行无错误
- [ ] 模板格式正确

## 实现笔记

<!-- 由 Claude 在执行过程中填写 -->
