---
story_id: "005"
title: 阶段编排模块
status: pending
depends_on: ["001", "002"]
---

# Story 005: 阶段编排模块

## 上下文

### 需求来源
> 来源：P1-需求文档.md#三、功能需求

**F002 自动化执行引擎**：集成 Ralph Loop 实现 P3-P14 自动执行

执行范围：
- 起始阶段：P3（技术方案）
- 结束阶段：P14（维基评审）
- 最终确认：P15 由用户手动确认

### 技术方案
> 来源：P3-技术方案.md#三、功能模块设计

**M002 阶段编排**：按顺序调度和执行 P3-P14 阶段

编排规则：
| 当前阶段 | 执行 Skill | 评审阶段 | 评审方式 |
|----------|-----------|----------|----------|
| P3 | ideal-dev-solution | P4 | 自动评审 |
| P5 | ideal-dev-plan | P6 | 自动评审 |
| P7 | ideal-test-case | P8 | 自动评审 |
| P9 | ideal-dev-exec | P10 | 自动评审 |
| P11 | ideal-test-exec | P12 | 自动评审 |
| P13 | ideal-wiki | P14 | 自动评审 |

### 相关代码

依赖模块：
- `.claude/skills/ideal-yolo/scripts/yolo_state.py` - 状态管理（Story 001）
- `.claude/skills/ideal-yolo/scripts/yolo_logger.py` - 日志记录（Story 002）

待创建的文件：
- `.claude/skills/ideal-yolo/scripts/yolo_orchestrator.py` - 阶段编排脚本
- `.claude/skills/ideal-yolo/references/phase-orchestrator.md` - 编排规范
- `tests/test_yolo_orchestrator.py` - 单元测试

## 任务清单

- [ ] T1: 定义阶段编排规则（PhaseOrchestrator）
- [ ] T2: 实现 execute_phase 函数（执行单个阶段）
- [ ] T3: 实现阶段链式执行（execute_chain）
- [ ] T4: 实现执行上下文传递（pass_context）

## 验收标准

### 功能验收
- [ ] 编排规则可配置
- [ ] execute_phase 正确调用对应 Skill
- [ ] 阶段按序执行，评审不通过可重试
- [ ] 上下文正确传递

### 代码质量
- [ ] 测试覆盖率 > 80%
- [ ] 无 Lint 警告
- [ ] 编排规则可扩展

## 实现笔记

<!-- 由 Claude 在执行过程中填写 -->
