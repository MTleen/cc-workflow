---
story_id: "006"
title: Ralph Loop 集成模块
status: pending
depends_on: ["005"]
---

# Story 006: Ralph Loop 集成模块

## 上下文

### 需求来源
> 来源：P1-需求文档.md#三、功能需求

**F002 自动化执行引擎**：集成 Ralph Loop 作为自动化执行引擎

项目集成：Ralph Loop 集成到本项目的 `.claude/ralph/` 目录

### 技术方案
> 来源：P3-技术方案.md#三、功能模块设计

**M004 Ralph Loop 集成**：调用和监控 Ralph Loop 执行

集成方式：
1. 动态生成 `.claude/ralph/PROMPT.md`
2. 调用 `ralph-loop.sh` 启动执行
3. 监控执行状态，处理中断
4. 记录执行日志

### 相关代码

依赖模块：
- `.claude/skills/ideal-yolo/scripts/yolo_orchestrator.py` - 阶段编排（Story 005）

待创建的文件：
- `.claude/ralph/ralph-loop.sh` - 循环执行脚本
- `.claude/ralph/PROMPT.md` - 执行提示（模板）
- `.claude/ralph/STATE.json` - 执行状态快照
- `.claude/ralph/hooks/pre-phase.sh` - 前置钩子
- `.claude/ralph/hooks/post-phase.sh` - 后置钩子
- `.claude/ralph/hooks/on-error.sh` - 错误钩子

## 任务清单

- [ ] T1: 创建 Ralph Loop 基础脚本（ralph-loop.sh）
- [ ] T2: 实现 PROMPT 模板生成（generate_prompt）
- [ ] T3: 实现阶段钩子（pre/post/error hooks）
- [ ] T4: 实现执行监控（monitor_execution）

## 验收标准

### 功能验收
- [ ] ralph-loop.sh 可启动并循环执行
- [ ] PROMPT.md 包含当前需求信息
- [ ] 钩子在正确时机触发
- [ ] 可检测执行完成/失败/超时

### 代码质量
- [ ] Shell 脚本通过 shellcheck 检查
- [ ] 错误处理完善
- [ ] 日志记录完整

## 实现笔记

<!-- 由 Claude 在执行过程中填写 -->
