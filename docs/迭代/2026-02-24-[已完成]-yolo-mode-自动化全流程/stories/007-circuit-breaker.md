---
story_id: "007"
title: 熔断机制模块
status: pending
depends_on: ["004"]
---

# Story 007: 熔断机制模块

## 上下文

### 需求来源
> 来源：P1-需求文档.md#三、功能需求

**F006 异常熔断机制**：检测异常情况并暂停执行

熔断条件：
| 异常类型 | 阈值 | 处理方式 |
|----------|------|----------|
| 评审失败 | 连续 3 次不通过 | 暂停执行，记录日志，等待用户介入 |
| 测试失败 | 通过率 < 80% | 暂停执行，记录失败用例，等待用户介入 |
| 重复错误 | 同一错误重复 5 次 | 暂停执行，记录错误详情，等待用户介入 |

### 技术方案
> 来源：P3-技术方案.md#三、功能模块设计

**M007 熔断机制**：检测异常并暂停执行

熔断处理：
1. 记录熔断原因和时间
2. 更新状态为 paused
3. 生成熔断报告
4. 等待用户恢复指令

### 相关代码

依赖模块：
- `.claude/skills/ideal-yolo/scripts/yolo_review.py` - 自动评审（Story 004）

待创建的文件：
- `.claude/skills/ideal-yolo/scripts/yolo_circuit.py` - 熔断机制脚本
- `.claude/skills/ideal-yolo/references/circuit-breaker.md` - 熔断规范
- `tests/test_yolo_circuit.py` - 单元测试

## 任务清单

- [ ] T1: 定义熔断条件（CircuitCondition, CircuitState）
- [ ] T2: 实现 check_circuit 函数（检查是否应触发熔断）
- [ ] T3: 实现熔断处理（trigger_circuit, generate_report）

## 验收标准

### 功能验收
- [ ] 熔断条件可配置
- [ ] check_circuit 正确检测熔断条件
- [ ] 熔断后正确暂停并记录
- [ ] 熔断报告格式正确

### 代码质量
- [ ] 测试覆盖率 > 80%
- [ ] 无 Lint 警告
- [ ] 熔断阈值可配置

## 实现笔记

<!-- 由 Claude 在执行过程中填写 -->
