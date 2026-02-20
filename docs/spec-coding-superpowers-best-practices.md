# Spec Coding 和 Superpowers 最佳实践调研报告

## 调研目标

为后续工作流搭建提供参考，系统化整理 Spec Coding 和 Superpowers 的最佳实践。

---

## 一、Spec-Driven Development (SDD) 概述

### 1.1 核心定义

**Spec-Driven Development** 是一种使用精心编写的软件需求规范作为提示，借助 AI 编码代理生成可执行代码的开发范式。

**关键观点分歧：**
- **激进派**：规范是唯一需要维护的真实来源，代码只是副产品
- **务实派**：规范只是驱动代码生成的要素（类似 TDD），可执行代码仍是需要维护的真实来源

### 1.2 与传统方法的区别

| 维度 | Vibe Coding | Spec-Driven Development | Waterfall |
|------|-------------|------------------------|-----------|
| 反馈周期 | 太快、自发、混乱 | 短且有效 | 过长 |
| 设计阶段 | 无 | 有，但快速 | 非常详细 |
| 质量保证 | 缺乏 | 内置 | 后期验证 |
| 适用场景 | 原型验证 | 生产级开发 | 大型项目 |

### 1.3 什么是好的规范 (Spec)

**规范 vs PRD**：规范不仅仅是产品需求文档 (PRD)，它应该：

1. **明确定义外部行为**
   - 输入/输出映射
   - 前置条件/后置条件
   - 不变量和约束
   - 接口类型
   - 集成契约
   - 顺序逻辑/状态机

2. **使用领域导向的通用语言**
   - 描述业务意图，而非技术实现
   - 团队共同理解

3. **清晰的结构**
   - 使用 Given/When/Then 定义场景
   - 标准化的格式

4. **完整性与简洁性平衡**
   - 覆盖关键路径
   - 不枚举所有边缘情况
   - 节省 tokens

5. **清晰和确定性**
   - 减少模型幻觉
   - 产生更健壮的代码

6. **结构化输入/输出**
   - 半结构化提示显著提高推理性能
   - 强制结构化输出减少幻觉

---

## 二、Superpowers 核心概念

### 2.1 什么是 Superpowers

**Superpowers** 是一个开源的 agentic 框架，将 Claude Code 从简单的代码生成器转变为真正的**高级 AI 开发者**。

**核心理念：Skills = 可执行的专业知识**

### 2.2 核心工作流：brainstorm → plan → implement

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Brainstorm │ ──► │    Plan     │ ──► │  Implement  │
│   (苏格拉底)  │     │  (详细任务)  │     │  (TDD执行)   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 2.3 七阶段方法论

| 阶段                          | 描述            | 关键产出      |
| --------------------------- | ------------- | --------- |
| 1. 苏格拉底式头脑风暴                | 迭代提问细化想法      | 技术推荐、约束定义 |
| 2. Git Worktree 隔离          | 创建独立开发分支      | 安全的开发环境   |
| 3. 详细计划                     | 分解为 2-5 分钟微任务 | tasks.md  |
| 4. 子代理驱动开发                  | 并行执行任务        | 高效实现      |
| 5. TDD (RED-GREEN-REFACTOR) | 测试先行          | 高测试覆盖率    |
| 6. 系统化代码审查                  | 自动质量检查        | 代码质量保证    |
| 7. 分支完成                     | 集成与清理         | PR/合并     |

### 2.4 Skills 系统

**Skills 的核心特性：**
- 结构化、可执行的工作流
- 指导 Claude 完成复杂任务
- 可以自我改进（编写 SKILL.md 文件）
- 可共享和复用

**关键规则：**
> "If you have a skill to do something, you **must** use it to do that activity."

**Skills 的工作方式：**
1. 搜索相关技能
2. 阅读 SKILL.md
3. 按照指示执行

---

## 三、Claude Code 最佳实践

### 3.1 核心原则

1. **减少歧义** - 如果你不定义范围，Claude 会定义
2. **强制小改动** - 大型多文件重写是质量崩溃的地方
3. **让正确性可衡量** - "有效" = "通过测试" + 满足验收标准
4. **假设输出可能有误** - 特别是认证、边缘情况、安全相关

### 3.2 工作流检查清单

| 类别 | 规则 | 为什么重要 |
|------|------|-----------|
| 目标 | 用一句话定义结果，列出 3 个验收标准 | Claude 需要可验证的终点线 |
| 范围 | 列出要编辑的文件和不触碰的文件 | 防止意外重写 |
| 计划先行 | 在改动前要求分步计划 | 早期发现错误方法 |
| 小 diff | 每次改动限制为一个功能或修复 | 使审查成为可能 |
| 测试 | 行为变更要求新增或更新测试 | 防止回归 |
| 命令 | 要求 Claude 在运行前列出将要执行的命令 | 防止破坏性操作 |
| 安全 | 永不粘贴密钥；认证/访问控制变更需人工审查 | 这里的错误代价高昂 |
| 输出格式 | 要求简短总结、文件级 diff 大纲、后续步骤 | 保持方向清晰，加速审查 |

### 3.3 Plan Mode 使用

**何时使用 Plan Mode：**
- 多步骤实现：功能需要编辑多个文件
- 代码探索：在更改之前彻底研究代码库
- 交互式开发：想与 Claude 迭代方向

**如何使用：**
```bash
# 会话中切换
Shift+Tab (循环: Normal → Auto-Accept → Plan)

# 启动新会话
claude --permission-mode plan

# 无头查询
claude --permission-mode plan -p "分析认证系统并提出改进建议"
```

### 3.4 Git Worktree 并行工作流

**核心概念：** 为每个功能/任务创建独立的 git worktree，实现完全隔离的 Claude Code 实例。

```bash
# 创建 worktree
git worktree add ../project-feature-a -b feature-a

# 在不同 worktree 中运行独立的 Claude 会话
cd ../project-feature-a
claude
```

**优势：**
- 主分支保持不变
- 可以安全实验
- 验证测试基线
- 轻松回滚
- 并行开发

---

## 四、TDD 最佳实践 (RED-GREEN-REFACTOR)

### 4.1 铁律

> **没有测试，不写代码。** 如果 Claude 在测试之前写了代码，Superpowers 会自动删除它并强制从测试开始。

### 4.2 循环

```
┌───────────────────────────────────────────────┐
│                                               │
│   RED: 写测试 (失败，因为代码不存在)           │
│              ↓                                │
│   GREEN: 写最小代码使测试通过                  │
│              ↓                                │
│   REFACTOR: 改进代码，保持测试绿色             │
│              ↓                                │
│         (重复)                                │
└───────────────────────────────────────────────┘
```

### 4.3 结果

- 测试覆盖率：85-95%（企业级）
- 每个功能都经过测试、验证、可维护

---

## 五、子代理 (Sub-Agent) 并行开发

### 5.1 概念

不是单个代理线性工作，而是使用**专门的子代理并行操作**：

```
┌─────────────────────────────────────────┐
│              Main Agent                  │
│         (协调与上下文管理)                │
└────────┬────────────────────────────────┘
         │
    ┌────┴────┬─────────┬─────────┐
    ↓         ↓         ↓         ↓
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│Setup  │ │Database│ │  UI   │ │Testing│
│Agent  │ │ Agent  │ │ Agent │ │ Agent │
└───────┘ └───────┘ └───────┘ └───────┘
```

### 5.2 每个子代理的职责

| 子代理 | 职责 |
|--------|------|
| Setup Agent | 初始化项目、安装依赖、配置 |
| Database Agent | 创建数据库 schema、数据模型 |
| UI Agent | 实现组件、页面、样式 |
| Testing Agent | 为每个组件编写测试 |

### 5.3 优势

- 3-4x 加速开发（相比顺序方法）
- 每个子代理专注于特定任务
- 通过两阶段审查（规范合规 + 代码质量）

---

## 六、上下文工程 (Context Engineering)

### 6.1 核心区别

> **Prompt Engineering** 优化人类-LLM 交互
> **Context Engineering** 优化代理-LLM 交互

### 6.2 最佳实践

1. **打包所有相关信息**
   - 代码、技术约束、已知陷阱、首选方法
   - 使用工具如 gitingest、repo2txt

2. **使用 MCP (Model Context Protocol)**
   - Context7：实时文档信息
   - 结构化工具调用

3. **层次化上下文管理**
   ```
   Main Agent loads: Steering + Full Spec + Task Details
   ↓ Delegates to Sub-Agent with:
   ├── Complete Steering Context
   ├── Selective Spec Context
   ├── Specific Task Details
   └── Clear instruction: "Do NOT reload context"
   ```

4. **上下文优化**
   - 60-80% token 减少
   - 会话级缓存
   - 智能文件变更检测

---

## 七、安全最佳实践

### 7.1 核心原则

**将 AI 代理视为"具有超级速度的初级工程师"**

### 7.2 具体措施

| 风险类型 | 防护措施 |
|----------|----------|
| 密钥泄露 | 提示中不包含密钥；将提示视为日志 |
| 权限过大 | 只给 Claude 需要的工具 |
| 认证问题 | 认证/授权相关变更必须人工审查 |
| 供应链风险 | 新包需要理由；检查依赖风险 |
| 过度自主 | 代理只能打开 draft PR，不能直接推送到 main |

### 7.3 参考框架

- **OWASP Top 10 for LLM Applications**
- **NIST Secure Software Development Framework (SSDF)**

---

## 八、常用工具和框架

### 8.1 Spec Workflow 工具

| 工具 | 描述 | 链接 |
|------|------|------|
| Superpowers | Agentic 框架，TDD + 子代理 | github.com/obra/Superpowers |
| claude-code-spec-workflow | 自动化工作流 | github.com/Pimzino/claude-code-spec-workflow |
| SpecKit | GitHub 的规范工具 | GitHub 官方 |

### 8.2 上下文工具

| 工具                  | 用途      |
| ------------------- | ------- |
| Context7 (MCP)      | 实时库文档   |
| gitingest           | 代码库转文本  |
| repo2txt            | 仓库打包    |
| Chrome DevTools MCP | 调试和质量循环 |

### 8.3 质量保证工具

| 工具 | 用途 |
|------|------|
| pre-commit | 提交前自动检查 |
| GitHub Actions | CI/CD 执行 |
| Continue | PR 规则执行 |

---

## 九、实施建议

### 9.1 推荐工作流

```
1. /brainstorming        → 需求细化
2. /spec-create          → 创建规范
3. /spec-steering-setup  → 项目上下文
4. /spec-execute         → 执行任务 (TDD)
5. /commit-push-pr       → 提交和 PR
```

### 9.2 模型选择建议

| 任务 | 推荐模型 |
|------|----------|
| 规范生成 (spec 文档) | Claude Opus 4 |
| 代码实现 | Claude Sonnet 4 |
| 代码审查 | 任意模型 (交叉检查) |

### 9.3 适用场景判断

| 场景 | 推荐方法 |
|------|----------|
| 复杂项目、关键应用 | 完整 Superpowers 工作流 |
| Bug 修复 | Bug workflow: Report → Analyze → Fix → Verify |
| 简单脚本 | 直接 Claude Code |
| 学习代码库 | Plan Mode + 手动执行 |

---

## 十、关键引用

### 来自 Jesse Vincent (Superpowers 作者)

> "Skills are what give your agents Superpowers."

> "You can hand a model a book or a document or a codebase and say 'Read this. Think about it. Write down the new stuff you learned.'"

### 来自 Thoughtworks

> "Spec-driven development remains an emerging practice as 2025 draws to close; we're likely to see even more change in 2026."

### 来自 Addy Osmani

> "AI coding assistants are incredible force multipliers, but the human engineer remains the director of the show."

> "Treat the LLM as a powerful pair programmer that requires clear direction, context and oversight rather than autonomous judgment."

---

## 参考资源

1. [Thoughtworks: Spec-driven development](https://www.thoughtworks.com/en-us/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices)
2. [Jesse Vincent: Superpowers](https://blog.fsck.com/2025/10/09/superpowers/)
3. [Superpowers Complete Guide 2026](https://pasqualepillitteri.it/en/news/215/superpowers-claude-code-complete-guide)
4. [Addy Osmani: LLM Coding Workflow 2026](https://addyosmani.com/blog/ai-coding-workflow/)
5. [Claude Code: Common Workflows](https://code.claude.com/docs/en/common-workflows)
6. [Claude Code Best Practices](https://quantumbyte.ai/articles/claude-code-best-practices)
7. [claude-code-spec-workflow](https://github.com/Pimzino/claude-code-spec-workflow)

---

## 十一、Superpowers 14 个 Skill 详细解读

### 11.1 Skill 分类总览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           META SKILLS (元技能)                                │
│  ┌──────────────────────┐    ┌──────────────────────┐                       │
│  │   using-superpowers  │    │    writing-skills     │                       │
│  │   (入口/导航)         │    │    (自我改进)          │                       │
│  └──────────────────────┘    └──────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         WORKFLOW SKILLS (工作流技能)                          │
│  规划: brainstorming → writing-plans                                         │
│  执行: executing-plans | subagent-driven-development | dispatching-parallel  │
│  收尾: finishing-a-development-branch                                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         QUALITY SKILLS (质量技能)                             │
│  test-driven-development | requesting-code-review | receiving-code-review   │
│  verification-before-completion                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         INFRASTRUCTURE SKILLS (基础设施技能)                   │
│  using-git-worktrees | systematic-debugging                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 11.2 Meta Skills (元技能)

#### 11.2.1 using-superpowers

**触发条件**：任何对话开始时

**核心功能**：确定使用哪些技能，是所有工作的入口

**核心原则**：
> "If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill."

**关键规则**：
- 在任何响应或操作之前调用相关技能
- 即使只有 1% 的可能性也必须检查
- 技能检查先于澄清问题

**常见误区**：

| 错误想法 | 正确认识 |
|----------|----------|
| "这只是一个简单问题" | 问题也是任务，检查技能 |
| "我需要先了解更多上下文" | 技能检查先于澄清问题 |
| "让我先探索代码库" | 技能告诉你如何探索 |
| "这个技能我记住了" | 技能会演进，读取当前版本 |

**技能优先级**：
1. 流程技能优先（brainstorming, debugging）- 决定如何处理任务
2. 实现技能次之（frontend-design, mcp-builder）- 指导执行

---

#### 11.2.2 writing-skills

**触发条件**：创建、更新或改进技能时

**核心功能**：将 TDD 方法论应用于文档编写

**核心理念**：
> "Writing skills IS Test-Driven Development applied to process documentation."

**TDD 映射**：

| TDD 概念 | Skill 创建 |
|----------|------------|
| 测试用例 | 压力场景 + 子代理 |
| 生产代码 | Skill 文档 (SKILL.md) |
| 测试失败 (RED) | 无技能时代理违反规则（基线） |
| 测试通过 (GREEN) | 有技能时代理遵守规则 |
| 重构 | 堵住漏洞同时保持合规 |

**铁律**：
```
NO SKILL WITHOUT A FAILING TEST FIRST
```

**Skill 类型**：
- **技术型**：具体方法与步骤（condition-based-waiting, root-cause-tracing）
- **模式型**：思考问题的方式（flatten-with-flags, test-invariants）
- **参考型**：API 文档、语法指南、工具文档

**CSO (Claude Search Optimization) 关键**：
- **描述字段**：只描述触发条件，不要总结工作流
- **关键词覆盖**：使用 Claude 会搜索的词汇
- **命名规范**：动词优先，使用连字符

---

### 11.3 Workflow Skills (工作流技能)

#### 11.3.1 brainstorming

**触发条件**：任何创意工作之前 - 创建功能、构建组件、添加功能、修改行为

**核心功能**：通过自然协作对话将想法转化为完整设计

**核心原则**：
> "You MUST use this before any creative work."

**HARD GATE**：
> Do NOT invoke any implementation skill until design is approved.

**流程**：

1. **理解想法**
   - 先检查项目状态（文件、文档、最近提交）
   - 一次问一个问题细化想法
   - 优先使用多选题
   - 关注：目的、约束、成功标准

2. **探索方案**
   - 提出 2-3 个不同方案及权衡
   - 以推荐选项开头并解释原因

3. **展示设计**
   - 分段展示（每段 200-300 字）
   - 每段后确认是否正确
   - 覆盖：架构、组件、数据流、错误处理、测试

**设计后动作**：
- 将验证的设计写入 `docs/plans/YYYY-MM-DD-<topic>-design.md`
- 提交设计文档到 git
- 自动触发 **writing-plans** 创建实施计划

---

#### 11.3.2 writing-plans

**触发条件**：有规格或需求的多步骤任务，编码前

**核心功能**：创建详细的实施计划，假设工程师对代码库零上下文

**保存位置**：`docs/plans/YYYY-MM-DD-<feature-name>.md`

**任务粒度**：每个步骤是一个动作（2-5 分钟）
- "编写失败测试" - 步骤
- "运行确认失败" - 步骤
- "实现最小代码使测试通过" - 步骤
- "运行测试确认通过" - 步骤
- "提交" - 步骤

**计划文档头部**：
```markdown
# [Feature Name] Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans

**Goal:** [一句话描述构建什么]

**Architecture:** [2-3 句关于方法]

**Tech Stack:** [关键技术/库]
```

**执行交接**：

计划完成后提供两个选项：
1. **Subagent-Driven (当前会话)** - 每任务派遣子代理，任务间审查
2. **Parallel Session (独立会话)** - 使用 executing-plans 批量执行

---

#### 11.3.3 executing-plans

**触发条件**：有完整实施计划要在独立会话中执行

**核心功能**：加载计划、批判审查、批量执行任务、批次间报告

**核心原则**：
> Batch execution with checkpoints for architect review.

**流程**：

```
Step 1: 加载并审查计划
    │
    ▼
Step 2: 执行批次（默认前 3 个任务）
    │
    ▼
Step 3: 报告 - 展示实现内容和验证输出
    │
    ▼
Step 4: 根据反馈继续或调整
    │
    ▼
Step 5: 完成后使用 finishing-a-development-branch
```

**何时停止求助**：
- 批次中遇到阻塞（缺少依赖、测试失败、指令不清）
- 计划有致命缺口无法开始
- 不理解某条指令
- 验证反复失败

---

#### 11.3.4 subagent-driven-development

**触发条件**：在当前会话中执行独立任务的实施计划

**核心功能**：每任务派遣新子代理，两阶段审查（规范合规 → 代码质量）

**vs executing-plans**：
- 同一会话（无上下文切换）
- 每任务新子代理（无上下文污染）
- 两阶段审查：先规范合规，后代码质量
- 更快迭代（任务间无需人工参与）

**流程图**：

```
读取计划 → 提取所有任务 → 创建 TodoWrite
        │
        ▼
┌───────────────────────────────────────────┐
│  每个任务：                                 │
│  1. 派遣实现子代理                          │
│  2. [如有问题] 回答问题、提供上下文           │
│  3. 子代理实现、测试、提交、自审              │
│  4. 派遣规范审查子代理                       │
│  5. [如不合规] 实现子代理修复 → 重新审查      │
│  6. 派遣代码质量审查子代理                   │
│  7. [如有问题] 实现子代理修复 → 重新审查      │
│  8. 标记任务完成                            │
└───────────────────────────────────────────┘
        │
        ▼
最终代码审查 → finishing-a-development-branch
```

**关键优势**：
- 子代理自然遵循 TDD
- 每任务新上下文（无混淆）
- 并行安全（子代理不干扰）
- 子代理可在工作前后提问

---

#### 11.3.5 dispatching-parallel-agents

**触发条件**：面对 2+ 个可以无共享状态或顺序依赖的独立任务

**核心功能**：并行调查独立问题

**使用场景**：
- 3+ 测试文件因不同根因失败
- 多个子系统独立损坏
- 每个问题无需其他问题上下文即可理解
- 调查间无共享状态

**不使用场景**：
- 失败相关（修复一个可能修复其他）
- 需要理解完整系统状态
- 代理会相互干扰

**模式**：

1. **识别独立域** - 按损坏内容分组失败
2. **创建聚焦代理任务** - 每代理一个测试文件或子系统
3. **并行派遣**
4. **审查和集成** - 验证修复不冲突

---

#### 11.3.6 finishing-a-development-branch

**触发条件**：实现完成、所有测试通过、需要决定如何集成工作

**核心功能**：验证测试 → 展示选项 → 执行选择 → 清理

**流程**：

```
Step 1: 验证测试（必须通过才能继续）
        │
        ▼
Step 2: 确定基础分支
        │
        ▼
Step 3: 展示 4 个选项：
        1. 本地合并到基础分支
        2. 推送并创建 PR
        3. 保持分支原样（稍后处理）
        4. 丢弃此工作
        │
        ▼
Step 4: 执行选择
        │
        ▼
Step 5: 清理 worktree（选项 1,4）
```

**选项对照表**：

| 选项 | 合并 | 推送 | 保留 Worktree | 清理分支 |
|------|------|------|---------------|----------|
| 1. 本地合并 | ✓ | - | - | ✓ |
| 2. 创建 PR | - | ✓ | ✓ | - |
| 3. 保持原样 | - | - | ✓ | - |
| 4. 丢弃 | - | - | - | ✓ (强制) |

---

### 11.4 Quality Skills (质量技能)

#### 11.4.1 test-driven-development

**触发条件**：实现任何功能或修复 bug，编写实现代码之前

**核心功能**：先写测试，看它失败，写最小代码通过

**铁律**：
```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

**如果在测试前写了代码**：删除它。重新开始。

**RED-GREEN-REFACTOR 循环**：

```
┌─────────────────────────────────────────────┐
│  RED: 编写失败测试                           │
│       ↓                                     │
│  验证失败：测试必须失败，且因正确原因          │
│       ↓                                     │
│  GREEN: 编写最小代码使测试通过                │
│       ↓                                     │
│  验证通过：测试通过，其他测试也通过            │
│       ↓                                     │
│  REFACTOR: 清理代码，保持测试绿色             │
│       ↓                                     │
│  (重复)                                     │
└─────────────────────────────────────────────┘
```

**好测试 vs 坏测试**：

| 品质 | 好测试 | 坏测试 |
|------|--------|--------|
| 最小性 | 一件事。"and"在名称中？拆分 | `test('validates email and domain and whitespace')` |
| 清晰性 | 名称描述行为 | `test('test1')` |
| 意图 | 展示期望 API | 模糊代码应做什么 |

**为什么顺序重要**：

| 借口 | 现实 |
|------|------|
| "我稍后写测试验证它能工作" | 后写的测试立即通过，证明不了什么 |
| "我已经手动测试了所有边缘情况" | 手动测试是临时的，无记录，无法重跑 |
| "删除 X 小时工作是浪费" | 沉没成本谬误。保留无法信任的代码才是技术债务 |
| "TDD 是教条的，务实意味着适应" | TDD 是务实的：在提交前发现 bug |

---

#### 11.4.2 requesting-code-review

**触发条件**：完成任务、实现主要功能、合并前验证工作

**核心功能**：派遣 code-reviewer 子代理在问题级联前捕获

**何时请求审查**：

**强制**：
- 子代理驱动开发中每个任务后
- 完成主要功能后
- 合并到 main 前

**可选但有价值**：
- 卡住时（新视角）
- 重构前（基线检查）
- 修复复杂 bug 后

**如何请求**：

```bash
# 1. 获取 git SHAs
BASE_SHA=$(git rev-parse HEAD~1)  # 或 origin/main
HEAD_SHA=$(git rev-parse HEAD)

# 2. 派遣 code-reviewer 子代理
# 填充模板：WHAT_WAS_IMPLEMENTED, PLAN_OR_REQUIREMENTS, BASE_SHA, HEAD_SHA, DESCRIPTION

# 3. 根据反馈行动
# - 立即修复 Critical 问题
# - 继续前修复 Important 问题
# - 记录 Minor 问题待后处理
```

---

#### 11.4.3 receiving-code-review

**触发条件**：接收代码审查反馈，实现建议之前，特别是反馈不清楚或技术可疑时

**核心功能**：技术评估，非情绪表演

**核心原则**：
> Verify before implementing. Ask before assuming. Technical correctness over social comfort.

**响应模式**：

```
1. READ: 完整阅读反馈，不反应
2. UNDERSTAND: 用自己的话重述要求（或询问）
3. VERIFY: 对照代码库现实检查
4. EVALUATE: 对此代码库技术上合理？
5. RESPOND: 技术确认或有理由反驳
6. IMPLEMENT: 一次一项，每项测试
```

**禁止响应**：
- "You're absolutely right!"（明确违反 CLAUDE.md）
- "Great point!" / "Excellent feedback!"（表演性）
- "Let me implement that now"（验证前）

**何时反驳**：
- 建议破坏现有功能
- 审查者缺乏完整上下文
- 违反 YAGNI（未使用的功能）
- 对此技术栈技术上不正确
- 存在遗留/兼容性原因
- 与架构师的架构决策冲突

---

#### 11.4.4 verification-before-completion

**触发条件**：声称工作完成、修复或通过之前，提交或创建 PR 前

**核心功能**：证据先于声明，总是如此

**铁律**：
```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

**门控功能**：

```
BEFORE claiming any status:

1. IDENTIFY: 什么命令证明此声明？
2. RUN: 执行完整命令（新鲜、完整）
3. READ: 完整输出，检查退出码，计算失败
4. VERIFY: 输出确认声明？
   - 如果 NO: 说明实际状态及证据
   - 如果 YES: 说明声明及证据
5. ONLY THEN: 做出声明

跳过任何步骤 = 撒谎，非验证
```

**常见失败**：

| 声明 | 需要 | 不充分 |
|------|------|--------|
| 测试通过 | 测试命令输出：0 失败 | 之前运行，"应该通过" |
| Linter 干净 | Linter 输出：0 错误 | 部分检查，推断 |
| 构建成功 | 构建命令：exit 0 | Linter 通过，日志看起来好 |
| Bug 修复 | 测试原始症状：通过 | 代码改变，假设修复 |

**红旗（停止）**：
- 使用 "should", "probably", "seems to"
- 验证前表达满意（"Great!", "Perfect!", "Done!" 等）
- 没有验证就提交/推送/PR
- 信任代理成功报告

---

### 11.5 Infrastructure Skills (基础设施技能)

#### 11.5.1 using-git-worktrees

**触发条件**：开始需要从当前工作区隔离的功能工作，或执行实施计划前

**核心功能**：创建隔离的 git worktree，智能目录选择和安全验证

**核心原则**：
> Systematic directory selection + safety verification = reliable isolation.

**目录选择流程**：

1. **检查现有目录**
   ```bash
   ls -d .worktrees 2>/dev/null     # 首选（隐藏）
   ls -d worktrees 2>/dev/null      # 替代
   ```

2. **检查 CLAUDE.md** - 如有偏好，直接使用

3. **询问用户** - 如果没有目录也没有 CLAUDE.md 偏好

**安全验证**：

**对于项目本地目录**（.worktrees 或 worktrees）：
```bash
# 必须验证目录被忽略
git check-ignore -q .worktrees
```

如果未被忽略：添加到 .gitignore，提交，然后继续

**对于全局目录**（~/.config/superpowers/worktrees）：无需验证，完全在项目外

**创建步骤**：

```bash
# 1. 检测项目名
project=$(basename "$(git rev-parse --show-toplevel)")

# 2. 创建 worktree
git worktree add "$LOCATION/$BRANCH_NAME" -b "$BRANCH_NAME"
cd "$LOCATION/$BRANCH_NAME"

# 3. 运行项目设置（自动检测）
npm install / cargo build / pip install / go mod download

# 4. 验证干净基线
npm test / cargo test / pytest / go test ./...
```

---

#### 11.5.2 systematic-debugging

**触发条件**：遇到任何 bug、测试失败或意外行为时，提出修复前

**核心功能**：实现调试科学方法，根因分析

**铁律**：
```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

**四阶段**：

**Phase 1: 根因调查**（修复前必须完成）
1. 仔细阅读错误消息
2. 一致地复现
3. 检查最近变更
4. 在多组件系统中收集证据
5. 追踪数据流

**Phase 2: 模式分析**
1. 找到工作示例
2. 对比参考
3. 识别差异
4. 理解依赖

**Phase 3: 假设和测试**
1. 形成单一假设
2. 最小测试
3. 验证后再继续
4. 不知道就说不知道

**Phase 4: 实现**
1. 创建失败测试用例
2. 实现单一修复
3. 验证修复
4. 如果修复无效 → 返回 Phase 1

**3+ 修复失败后：质疑架构**

红旗模式：
- 每次修复在不同地方揭示新的共享状态/耦合/问题
- 修复需要"大规模重构"
- 每次修复在其他地方产生新症状

**停止并质疑基础**，而不是尝试更多修复。

---

### 11.6 Skills 协作关系总览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SUPERPOWERS 完整工作流                                  │
│                                                                              │
│  1. 入口                                                                     │
│     ┌─────────────────────┐                                                 │
│     │  using-superpowers  │  ◄── 所有对话开始                               │
│     └─────────────────────┘                                                 │
│              │                                                              │
│              ▼                                                              │
│  2. 规划链                                                                   │
│     ┌─────────────────────┐                                                 │
│     │  brainstorming      │  ◄── 创意工作必须                               │
│     │  (HARD GATE: 设计    │                                                 │
│     │   批准前不实现)       │                                                 │
│     └─────────────────────┘                                                 │
│              │                                                              │
│              │ 自动触发                                                      │
│              ▼                                                              │
│     ┌─────────────────────┐                                                 │
│     │  writing-plans      │  ◄── 创建详细实施计划                           │
│     └─────────────────────┘                                                 │
│              │                                                              │
│              │ 建议使用                                                      │
│              ▼                                                              │
│  3. 环境隔离                                                                 │
│     ┌─────────────────────┐                                                 │
│     │  using-git-worktrees│  ◄── 创建隔离开发环境                           │
│     └─────────────────────┘                                                 │
│              │                                                              │
│              ▼                                                              │
│  4. 执行模式（三选一）                                                        │
│     ┌──────────────────────────────────────────────────────────────┐        │
│     │  ┌─────────────────┐                                          │        │
│     │  │ executing-plans │  独立会话，批量+检查点                     │        │
│     │  └─────────────────┘                                          │        │
│     │  ┌───────────────────────────┐                                │        │
│     │  │ subagent-driven-development│ 当前会话，子代理+两阶段审查     │        │
│     │  └───────────────────────────┘                                │        │
│     │  ┌─────────────────────────────┐                              │        │
│     │  │ dispatching-parallel-agents │ 并行调查独立问题               │        │
│     │  └─────────────────────────────┘                              │        │
│     └──────────────────────────────────────────────────────────────┘        │
│              │                                                              │
│              │ 内嵌                                                         │
│              ▼                                                              │
│  5. TDD 循环                                                                 │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  test-driven-development                                        │     │
│     │  RED(写测试) → GREEN(最小代码) → REFACTOR(清理)                   │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│              │                                                              │
│              ▼                                                              │
│  6. 代码审查                                                                 │
│     ┌─────────────────────┐                                                 │
│     │requesting-code-review│ ◄── 派遣审查子代理                             │
│     └─────────────────────┘                                                 │
│              │                                                              │
│              │ 审查反馈                                                      │
│              ▼                                                              │
│     ┌─────────────────────┐                                                 │
│     │receiving-code-review│ ◄── 处理反馈，技术验证                          │
│     └─────────────────────┘                                                 │
│              │                                                              │
│              ▼                                                              │
│  7. 完成验证                                                                 │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  verification-before-completion                                  │     │
│     │  (HARD GATE: 无证据不声称完成)                                    │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│              │                                                              │
│              ▼                                                              │
│  8. 分支完成                                                                 │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  finishing-a-development-branch                                  │     │
│     │  验证测试 → 展示选项 → 执行选择 → 清理                             │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  独立流程：调试工作流                                                         │
│     ┌─────────────────────┐                                                 │
│     │ systematic-debugging│ ◄── 遇到 bug/测试失败时                         │
│     │ (HARD GATE: 无根因   │                                                 │
│     │  调查不修复)         │                                                 │
│     └─────────────────────┘                                                 │
│              │                                                              │
│              ▼                                                              │
│     ┌─────────────────────┐                                                 │
│     │test-driven-development│ ◄── 修复也遵循 TDD                            │
│     └─────────────────────┘                                                 │
│              │                                                              │
│              ▼                                                              │
│     ┌─────────────────────┐                                                 │
│     │verification-before- │                                                 │
│     │completion           │                                                 │
│     └─────────────────────┘                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 11.7 自动触发关系

```
brainstorming (完成后)
      │
      └──▶ 自动调用 writing-plans

writing-plans (完成后)
      │
      └──▶ 建议使用 using-git-worktrees

executing-plans / subagent-driven-development (执行中)
      │
      └──▶ 内嵌 test-driven-development

subagent-driven-development (每任务后)
      │
      └──▶ 规范审查 → 代码质量审查

requesting-code-review (审查后)
      │
      └──▶ 触发 receiving-code-review

所有实现工作 (声称完成前)
      │
      └──▶ 必须调用 verification-before-completion

executing-plans / subagent-driven-development (所有任务完成后)
      │
      └──▶ 必须调用 finishing-a-development-branch
```

---

### 11.8 HARD GATE 汇总

| Skill | HARD GATE |
|-------|-----------|
| **brainstorming** | 设计批准前不得调用任何实现 skill |
| **systematic-debugging** | 无根因调查不得提出修复 |
| **test-driven-development** | 无测试不得写代码 |
| **verification-before-completion** | 无验证证据不得声称完成 |
| **writing-skills** | 无失败测试（基线）不得写 skill |

---

*文档生成日期: 2026-02-14*
