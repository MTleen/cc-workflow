# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目定位

这是一个** Claude Code 中心化团队工作流**项目，实现从需求到上线的全流程自动化。核心原则：团队成员只需**提需求、做评审、反馈意见**，其他工作由 Claude Code 自动完成。

## 核心原则

| 角色 | 职责 |
|------|------|
| **团队成员** | 提需求、做评审、反馈意见 |
| **Claude Code** | 需求编写、技术方案、计划生成、开发执行、测试用例、维基更新 |

## 系统架构

### 三层结构
- **agents/** - 角色能力层（可复用的角色定义）
- **skills/** - 流程规范层（阶段目标、模板、检查清单）
- **docs/** - 文档中心（Obsidian vault）

### Skill + Agent 架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Skill（规范层）                          │
│  定义：阶段目标、输入输出、模板、检查清单                      │
└─────────────────────────────────────────────────────────────┘
                          │ 调用
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                     Agent（能力层）                          │
│  定义：角色身份、思维方式、决策框架、关注点                    │
└─────────────────────────────────────────────────────────────┘
```

**职责边界**：
- Agent 定义"如何思考"
- Skill 定义"做什么"和"输出什么"

### 15 阶段流程（P1-P15）
- **规划阶段**：P1 需求编写 → P2 需求评审 → P3 技术方案 → P4 方案评审
- **准备阶段**：P5 计划生成 → P6 计划评审 → P7 测试用例 → P8 用例评审
- **执行阶段**：P9 开发执行 → P10 代码评审 → P11 测试执行 → P12 测试评审
- **收尾阶段**：P13 维基更新 → P14 维基评审 → P15 成果提交

> 注：上线部署由 CI/CD 自动化完成，P15 成果提交后自动触发 CI/CD 流水线。

## 文档结构

```
.claude/
├── agents/                     # 角色能力层
│   ├── README.md               # Agent 使用说明
│   ├── analyst.md              # 业务分析师
│   ├── pm.md                   # 产品经理
│   ├── architect.md            # 架构师
│   ├── dev.md                  # 开发工程师
│   ├── qa.md                   # 测试工程师
│   └── tech-writer.md          # 技术文档撰写
│
├── skills/                     # 流程规范层
│   ├── ideal-requirement/      # P1 (pm, analyst)
│   ├── ideal-dev-solution/     # P3 (architect)
│   ├── ideal-dev-plan/         # P5 (architect, pm)
│   ├── ideal-test-case/        # P7 (qa)
│   ├── ideal-dev-exec/         # P9 (dev)
│   ├── ideal-code-review/      # P9.1 (dev, architect)
│   ├── ideal-test-exec/        # P11 (qa, dev)
│   ├── ideal-wiki/             # P13 (tech-writer)
│   ├── ideal-delivery/         # P15 (成果提交)
│   ├── ideal-flow-control/     # 全流程
│   └── ideal-debugging/        # 调试 (dev)
│
└── project-config.md           # 项目配置

docs/                           # Obsidian vault
├── 迭代/{需求名称}/
│   ├── P1-需求文档.md
│   ├── P3-技术方案.md
│   ├── P5-编码计划.md
│   ├── P7-测试用例.md
│   ├── P11-测试报告.md
│   ├── 流程状态.md
│   └── stories/               # 故事文件（上下文隔离）
│       ├── index.md           # 故事索引
│       └── 0XX-*.md           # 原子化故事
└── Wiki/
    ├── 用户文档/
    ├── 开发文档/
    └── 接口文档/
```

## Agents 清单

| Agent | 角色 | 被调用阶段 |
|-------|------|-----------|
| analyst | 业务分析师 | P1 |
| pm | 产品经理 | P1, P5 |
| architect | 架构师 | P3, P5 |
| dev | 开发工程师 | P9, P11 |
| qa | 测试工程师 | P7, P11 |
| tech-writer | 技术文档撰写 | P13 |

## Skills 索引

| Skill | 阶段 | Agents | 用途 |
|-------|------|--------|------|
| `ideal-requirement` | P1 | pm, analyst | 需求编写 |
| `ideal-dev-solution` | P3 | architect | 技术方案 |
| `ideal-dev-plan` | P5 | architect, pm | 计划生成 + 故事文件 |
| `ideal-test-case` | P7 | qa | 测试用例 |
| `ideal-dev-exec` | P9 | dev | 开发执行（使用故事文件） |
| `ideal-code-review` | P9.1 | dev, architect | 代码审查 |
| `ideal-test-exec` | P11 | qa, dev | 测试执行 |
| `ideal-wiki` | P13 | tech-writer | 维基更新 |
| `ideal-delivery` | P15 | - | 成果提交（PR + 归档） |
| `ideal-debugging` | - | dev | 系统化调试 |

## 故事文件机制

**目的**：上下文隔离，Token 消耗降低 70-90%

**位置**：`docs/迭代/{需求名}/stories/`

**生成**：P5 计划生成时自动拆分为故事文件

**使用**：P9 开发执行时只加载当前故事文件的上下文

## 常用工作流

### 开始新需求（P1）
```
用户：我需要添加一个[功能描述]
Claude：调用 ideal-requirement skill
  → 以 PM 角色进行苏格拉底式对话
  → 生成 P1-需求文档.md
  → 更新 流程状态.md
```

### 开始开发（P9）
```
前置条件：P1-P8 已完成
Claude：
  → 读取 stories/index.md 确认当前故事
  → 只加载当前故事文件（上下文隔离）
  → 以 Dev 角色执行 TDD 开发
  → 创建 GitLab MR
```

## 触发机制

流程通过 `流程状态.md` 控制：

```yaml
---
current_phase: P6
plan_review: pending    # 改为 approved 触发 P7
stories_dir: docs/迭代/{需求名}/stories/
---
```

## 项目配置

项目特定配置（Git 分支、执行命令、技术栈等）详见 [.claude/project-config.md](.claude/project-config.md)。

## 关键决策

1. **Skill + Agent 分离**：Agent 定义能力，Skill 定义流程
2. **Agent 不定义输出模板**：模板由 Skill 定义
3. **故事文件位置**：`docs/迭代/{需求名}/stories/`
4. **文档格式**：全量 Markdown
5. **Bug 管理**：直接在 GitLab Issue
6. **Skill 创建和修改**：所有 Skill 的创建和修改必须通过调用 `/writing-skills` 完成，确保 Skill 结构和规范的一致性
7. **经验沉淀**：工作过程中遇到的问题、解决方案和最佳实践应及时更新到本文档，避免同类问题重复发生

## 经验教训

本节记录工作过程中遇到的问题及解决方案，持续更新。

> 注：遇到新问题时，应在此处添加记录，格式如下：
> - **问题**：描述遇到的问题
> - **原因**：分析问题产生的原因
> - **解决**：描述解决方案
> - **预防**：说明如何避免再次发生

### P15 成果提交未调用 skill

- **问题**：P15 阶段直接执行 git merge/push，未调用 `ideal-delivery` skill
- **原因**：`docs/Wiki/开发指南/Skills 索引.md` 缺少 `ideal-delivery` skill 条目，导致从上下文恢复时找不到应调用的 skill
- **解决**：在 Skills 索引和 CLAUDE.md 中补充 `ideal-delivery` skill 说明
- **预防**：
  1. 新增 skill 后必须同步更新 Skills 索引和 CLAUDE.md
  2. 从上下文恢复执行时，应先检查当前阶段对应的 skill

## 参考文档

| 文档 | 路径 | 内容 |
|------|------|------|
| 架构设计 | `docs/plans/2026-02-20-skill-agent-hybrid-architecture-design.md` | Skill + Agent 架构设计 |
| 项目详细说明 | `README.md` | 背景架构、阶段流程 |
| Agent 使用说明 | `.claude/agents/README.md` | Agent 调用机制 |

## 快速命令

```bash
# 查看 Agent 列表
ls .claude/agents/

# 查看架构师 Agent
cat .claude/agents/architect.md

# 查看当前流程状态
cat docs/迭代/*/流程状态.md

# 查看故事索引
cat docs/迭代/*/stories/index.md
```
