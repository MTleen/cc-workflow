---
story_id: "003"
title: 模式控制模块
status: pending
depends_on: ["001"]
---

# Story 003: 模式控制模块

## 上下文

### 需求来源
> 来源：P1-需求文档.md#三、功能需求

**F001 YOLO 模式触发**：P2 评审通过后询问用户是否启用 YOLO 模式

交互流程：
1. P2 评审通过时，系统询问用户
2. 用户选择"是"：进入 YOLO 模式，启动自动执行
3. 用户选择"否"：继续传统的人工评审流程

配置方式：每次 P2 评审后询问，不设默认值

### 技术方案
> 来源：P3-技术方案.md#三、功能模块设计

**M001 模式控制**：管理 YOLO 模式的启用、禁用和切换

状态机：
```
pending → in_progress → paused → in_progress
                 ↓
            completed
                 ↓
                  error
```

### 相关代码

依赖模块：
- `.claude/skills/ideal-yolo/scripts/yolo_state.py` - 状态管理（Story 001）

待创建的文件：
- `.claude/skills/ideal-yolo/SKILL.md` - Skill 定义
- `.claude/skills/ideal-yolo/scripts/yolo_control.py` - 模式控制脚本
- `tests/test_yolo_control.py` - 单元测试

## 任务清单

- [ ] T1: 实现 enable_yolo 函数（启用 YOLO 模式）
- [ ] T2: 实现 disable_yolo 函数（禁用 YOLO 模式/降级）
- [ ] T3: 实现 check_yolo_status 函数（检查当前状态）

## 验收标准

### 功能验收
- [ ] enable_yolo 可正确启用 YOLO 模式
- [ ] disable_yolo 可正确禁用 YOLO 模式
- [ ] check_yolo_status 返回完整状态信息
- [ ] 状态机转换正确

### 代码质量
- [ ] 测试覆盖率 > 80%
- [ ] 无 Lint 警告
- [ ] 状态转换有日志记录

## 实现笔记

<!-- 由 Claude 在执行过程中填写 -->
