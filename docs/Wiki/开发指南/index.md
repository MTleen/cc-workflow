---
title: 开发指南
description: CC-Workflow 开发指南 - 面向开发者、架构师和贡献者
sidebar_position: 1
tags: [dev-guide]
---

# 开发指南

欢迎来到 CC-Workflow 开发指南。本指南面向需要理解内部架构、开发自定义 Skill/Agent、或为项目贡献代码的开发者。

## 文档导航

### 理解架构

| 文档 | 说明 | 适合人群 |
|------|------|----------|
| [架构设计](./架构设计.md) | CC-Workflow 的技术架构和设计理念 | 架构师、开发者 |
| [术语表](./术语表.md) | CC-Workflow 专用术语的定义 | 所有开发者 |

### 开发扩展

| 文档 | 说明 | 适合人群 |
|------|------|----------|
| [Skill 开发指南](./Skill%20开发指南.md) | 如何开发、测试、部署新的 Skill | Skill 开发者 |
| [Agent 开发指南](./Agent%20开发指南.md) | 如何定义和配置新的 Agent | Agent 开发者 |

### 查询参考

| 文档 | 说明 | 适合人群 |
|------|------|----------|
| [配置参考](./配置参考.md) | 所有配置文件的格式和参数说明 | 开发者、运维人员 |
| [Skills 索引](./Skills%20索引.md) | 所有 Skills 的快速参考 | 开发者、高级用户 |
| [Agents 索引](./Agents%20索引.md) | 所有 Agents 的快速参考 | 开发者、高级用户 |

## 按场景查找

### 我想理解 CC-Workflow 的设计理念

1. 阅读 [架构设计](./架构设计.md) 了解整体架构
2. 阅读 [术语表](./术语表.md) 理解核心概念

### 我想开发一个新的 Skill

1. 阅读 [Skill 开发指南](./Skill%20开发指南.md) 了解开发流程
2. 参考 [Skills 索引](./Skills%20索引.md) 查看现有 Skill 的设计

### 我想定义一个新的 Agent

1. 阅读 [Agent 开发指南](./Agent%20开发指南.md) 了解定义方式
2. 参考 [Agents 索引](./Agents%20索引.md) 查看现有 Agent 的定义

### 我想查询配置参数

1. 阅读 [配置参考](./配置参考.md) 查看所有配置文件格式
2. 根据需要修改 `project-config.md` 或其他配置文件

## 开发环境准备

### 前置条件

| 条件 | 要求 | 说明 |
|------|------|------|
| Claude Code | 版本 ≥ 0.5.0 | 主要开发工具 |
| Git | 版本 ≥ 2.20 | 版本控制 |
| 文本编辑器 | VS Code / Cursor | 编辑 Markdown 文件 |
| Obsidian | 最新版 | 可选，用于预览文档 |

### 目录结构

CC-Workflow 的核心目录结构：

```
cc-workflow/
├── .claude/
│   ├── agents/                 # Agent 定义
│   │   ├── README.md
│   │   ├── pm.md
│   │   ├── architect.md
│   │   ├── dev.md
│   │   ├── qa.md
│   │   ├── analyst.md
│   │   └── tech-writer.md
│   │
│   ├── skills/                 # Skill 定义
│   │   ├── ideal-requirement/
│   │   ├── ideal-dev-solution/
│   │   ├── ideal-dev-plan/
│   │   ├── ideal-test-case/
│   │   ├── ideal-dev-exec/
│   │   ├── ideal-code-review/
│   │   ├── ideal-test-exec/
│   │   ├── ideal-wiki/
│   │   ├── ideal-flow-control/
│   │   ├── ideal-debugging/
│   │   └── ideal-init/
│   │
│   └── project-config.md       # 项目配置
│
├── docs/
│   ├── 迭代/                   # 迭代文档
│   ├── Wiki/                   # 维基文档
│   └── 项目状态.md
│
└── CLAUDE.md                   # 项目指令
```

### 快速命令

```bash
# 查看 Agent 列表
ls .claude/agents/

# 查看某个 Agent 定义
cat .claude/agents/pm.md

# 查看 Skill 列表
ls .claude/skills/

# 查看某个 Skill 定义
cat .claude/skills/ideal-requirement/SKILL.md

# 查看项目配置
cat .claude/project-config.md

# 查看当前流程状态
cat docs/迭代/*/流程状态.md
```

## 核心概念

### Skill + Agent 混合架构

CC-Workflow 采用 Skill + Agent 混合架构，将"做什么"与"如何思考"分离。

**Skill（流程规范层）**定义阶段目标、输入输出规范和检查清单，但不定义角色身份。这种设计使得同一个 Skill 可以被不同的 Agent 以不同方式执行。

**Agent（角色能力层）**定义角色身份、专业视角和思维方式，但不定义输出模板。这种设计使得同一个 Agent 可以执行多个 Skill。

详细说明请参阅 [架构设计](./架构设计.md)。

### 15 阶段流程

CC-Workflow 将软件开发流程划分为 15 个阶段（P1-P15），分为四个阶段组：

- **规划阶段（P1-P4）**：需求编写、需求评审、技术方案、方案评审
- **准备阶段（P5-P8）**：计划生成、计划评审、测试用例、用例评审
- **执行阶段（P9-P12）**：开发执行、代码评审、测试执行、测试评审
- **收尾阶段（P13-P15）**：维基更新、维基评审、成果提交

详细说明请参阅用户指南中的 [流程概述](../用户指南/流程概述.md)。

### 故事文件机制

P5 阶段会生成故事文件，实现上下文隔离。每个故事文件包含独立开发和测试所需的全部上下文，避免加载整个项目代码，降低 Token 消耗 70-90%。

详细说明请参阅 [架构设计](./架构设计.md) 中的"故事文件机制"章节。

## 贡献指南

### 如何贡献

1. Fork CC-Workflow 仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交变更：`git commit -m "feat: add your feature"`
4. 推送分支：`git push origin feature/your-feature`
5. 创建 Merge Request

### 代码规范

- 遵循 Conventional Commits 提交信息格式
- Skill 和 Agent 文件使用 Markdown 格式
- 新增 Skill 需包含完整的 SKILL.md 和参考文档
- 新增 Agent 需包含完整的角色定义

### 文档规范

- 使用正式技术风格
- 提供具体数据，避免模糊描述
- 使用 Mermaid 图表，禁止 ASCII 图
- 概念解析类文档以段落为主，列表为辅
