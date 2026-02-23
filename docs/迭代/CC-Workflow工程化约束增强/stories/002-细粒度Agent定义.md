---
story_id: "002"
title: "细粒度 Agent 定义（M003）"
status: pending
depends_on: []
---

# Story 002: 细粒度 Agent 定义

## 上下文

### 需求来源
> 来源：P1-需求文档.md#F002：新增细粒度 Agent

**新增 Agent 清单**：

| Agent | 职责 | 禁止操作 |
|-------|------|----------|
| **implement** | 纯代码实现 | git commit、git push |
| **check** | 代码检查、自我修复 | - |
| **debug** | 深度调试、根因分析 | - |
| **research** | 纯研究、不修改文件 | 任何文件修改 |

**现有 Agent 职责调整**：
- dev：从"代码实现"改为"调度 implement/check/debug 子 Agent"

### 技术方案
> 来源：P3-技术方案.md#M003：细粒度 Agent 定义

**Agent 文件格式**（遵循 agents.md 协议）：

```markdown
---
name: {agent_name}
display_name: {显示名称}
version: 1.0
skills: [ideal-dev-exec]
---

# {Agent 名称}

## 角色身份
角色定位、核心职责、独特价值

## 核心职责
1. xxx
2. xxx

## 禁止操作
- **禁止** xxx

## 输出规范
完成后报告：xxx
```

### 相关代码

已完成的依赖模块：
- 无（本故事可与其他故事并行开发）

参考现有 Agent 文件：
- `.claude/agents/pm.md` - 产品经理 Agent
- `.claude/agents/architect.md` - 架构师 Agent
- `.claude/agents/dev.md` - 开发工程师 Agent

## 任务清单

### T003-1：创建 implement.md
- [ ] 定义 YAML front matter（name, display_name, version, skills）
- [ ] 定义角色身份：专注于代码实现的工程师
- [ ] 定义核心职责：
  - 阅读上下文中注入的规范和需求
  - 实现符合规范的代码
  - 确保代码可编译、可运行
- [ ] 定义禁止操作：git commit、git push、git merge
- [ ] 定义输出规范：修改/创建的文件列表、实现摘要、待验证项

**验证标准**：
- 文件遵循现有 Agent 格式
- 包含完整的 YAML front matter
- 职责定义清晰

### T003-2：创建 check.md
- [ ] 定义 YAML front matter
- [ ] 定义角色身份：专注于代码检查和自我修复的工程师
- [ ] 定义核心职责：
  - 运行 git diff 获取代码变更
  - 对照规范检查代码
  - 自我修复问题
  - 运行验证命令
- [ ] 说明与 Ralph Loop 的配合（验证失败时被阻止停止）
- [ ] 定义输出规范：检查报告、修复记录

**验证标准**：
- 文件遵循现有 Agent 格式
- 包含与 verify-loop.py 的配合说明
- 包含自我修复职责

### T003-3：创建 debug.md
- [ ] 定义 YAML front matter
- [ ] 定义角色身份：专注于深度调试和根因分析的工程师
- [ ] 定义核心职责：
  - 分析问题描述
  - 定位代码位置
  - 根因分析
  - 提出修复方案
- [ ] 定义问题优先级分类：P1（必须修复）、P2（应该修复）、P3（可选修复）
- [ ] 定义输出规范：调试报告、根因分析、修复建议

**验证标准**：
- 文件遵循现有 Agent 格式
- 包含调试方法论说明
- 包含问题优先级分类

### T003-4：创建 research.md
- [ ] 定义 YAML front matter
- [ ] 定义角色身份：专注于纯研究的分析师
- [ ] 定义核心职责：
  - 搜索和查找信息
  - 分析代码结构
  - 整理研究结论
- [ ] 定义禁止操作：任何文件修改
- [ ] 定义输出规范：研究报告、文件列表、代码模式分析

**验证标准**：
- 文件遵循现有 Agent 格式
- 包含明确的不修改文件约束
- 包含纯研究职责说明

## 验收标准

### 功能验收
- [ ] 4 个 Agent 文件全部创建
- [ ] 所有文件遵循 agents.md 协议
- [ ] YAML front matter 完整
- [ ] 职责定义清晰无歧义

### 代码质量
- [ ] Markdown 格式正确
- [ ] 无语法错误
- [ ] 与现有 Agent 文件风格一致

## 实现笔记

<!-- 由 Claude 在执行过程中填写 -->
