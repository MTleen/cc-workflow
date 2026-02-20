# CC-Workflow 优化设计：Skill + Agent 混合架构

## 一、背景与动机

### 1.1 问题分析

当前 CC-Workflow 采用 16 阶段流程，通过 Skills 实现各阶段的自动化。在调研 BMAD-METHOD 框架后，识别出以下可优化点：

| 问题 | 现状 | 影响 |
|------|------|------|
| 上下文膨胀 | 每个阶段读取完整的前序文档 | Token 消耗高，AI 易被无关信息干扰 |
| 角色定义分散 | 角色能力分散在各 Skill 中 | 无法复用，风格不一致 |
| 流程过重 | 16 阶段对简单任务过重 | 小功能也需要完整流程 |
| 扩展性不足 | 新增能力需要修改 Skill | 维护成本高 |

### 1.2 BMAD-METHOD 的启示

BMAD-METHOD（35.9K Star）的核心创新：

1. **AI 即团队**：20+ 专业 Agent 模拟真实团队角色
2. **上下文工程化**：通过"故事文件"隔离上下文，Token 消耗降低 90%
3. **Agent-as-Code**：Agent 以 Markdown/YAML 定义，与代码一同版本管理
4. **多轨道支持**：Quick/Standard/Enterprise 不同复杂度

### 1.3 优化目标

- **提升 AI 输出质量**：通过角色专业化和上下文隔离减少幻觉
- **降低 Token 消耗**：故事文件机制实现按需加载
- **增强可扩展性**：Agent 独立于 Skill，可复用可组合
- **保持向后兼容**：渐进式迁移，不影响现有功能

---

## 二、核心设计

### 2.1 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                     Skill（规范层）                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 定义：阶段目标、输入输出、质量标准                    │   │
│  │ 约束：执行流程、评审条件                             │   │
│  │ 包含：模板、检查清单、验证规则                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           │ @load-agent                     │
│                           ↓                                 │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                     Agent（能力层）                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 定义：角色身份、专业视角、思维方式                    │   │
│  │ 特性：可复用、可组合、独立于流程                      │   │
│  │ 内容：角色定义、思维模式、关注点                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 职责边界

| 层 | 职责 | 内容 |
|----|------|------|
| **Agent** | 角色能力 | 身份、思维方式、决策框架、关注点 |
| **Skill** | 流程规范 | 步骤、输入输出、模板、检查清单 |

**Agent 不定义输出模板**，模板由 Skill 定义。

### 2.3 目录结构

```
.claude/
├── agents/                          # 角色定义（能力层）
│   ├── README.md                    # Agent 使用说明
│   ├── analyst.md                   # 业务分析师
│   ├── pm.md                        # 产品经理
│   ├── architect.md                 # 架构师
│   ├── dev.md                       # 开发工程师
│   ├── qa.md                        # 测试工程师
│   └── tech-writer.md               # 技术文档撰写
│
├── skills/                          # 阶段定义（规范层）
│   ├── ideal-requirement/           # P1 (pm, analyst)
│   ├── ideal-dev-solution/          # P3 (architect)
│   ├── ideal-dev-plan/              # P5 (architect, pm)
│   ├── ideal-test-case/             # P7 (qa)
│   ├── ideal-dev-exec/              # P9 (dev)
│   ├── ideal-code-review/           # P9.1 (dev, architect)
│   ├── ideal-test-exec/             # P11 (qa, dev)
│   ├── ideal-wiki/                  # P15 (tech-writer)
│   ├── ideal-flow-control/          # 全流程
│   └── ideal-debugging/             # 调试 (dev)
│
└── project-config.md                # 项目配置

docs/
└── 迭代/{需求名}/
    ├── P1-需求文档.md
    ├── P3-技术方案.md
    ├── P5-编码计划.md
    ├── P7-测试用例.md
    ├── P11-测试报告.md
    ├── 流程状态.md
    └── stories/                     # 故事文件
        ├── index.md                 # 故事索引
        ├── 001-xxx.md
        └── 002-xxx.md
```

---

## 三、Agent 设计

### 3.1 Agent 清单

| Agent | 角色 | 职责 | 被调用阶段 |
|-------|------|------|-----------|
| analyst | 业务分析师 | 市场调研、竞品分析 | P1 |
| pm | 产品经理 | 需求梳理、优先级评估 | P1, P5 |
| architect | 架构师 | 系统设计、技术选型 | P3, P5 |
| dev | 开发工程师 | 代码实现、TDD | P9, P11 |
| qa | 测试工程师 | 测试设计、测试执行 | P7, P11 |
| tech-writer | 技术文档撰写 | 文档编写 | P15 |

### 3.2 Agent 文件格式（v1.1）

Agent 聚焦于**角色能力和思维方式**，不包含具体输出模板：

```markdown
---
name: {agent_name}
display_name: {显示名称}
version: 1.1
skills: [skill1, skill2]
---

# {Agent 名称}

## 角色身份

你是一位...（角色定位）
专注于...（核心职责）
核心价值是...（独特贡献）

## 思维方式

### 1. {思维原则 1}
- 具体说明

### 2. {思维原则 2}
...

## 决策框架 / 提问技巧 等

（针对角色的专业工具/方法）

## 关注点

### 关心什么
- ...

### 避免什么
1. **陷阱 1** - ❌ 错误 → ✅ 正确
```

---

## 四、Skill 调用 Agent 机制

### 4.1 调用语法

在 SKILL.md 中：

1. **Frontmatter 声明 Agent**
```yaml
---
name: ideal-dev-solution
agents: [architect]
---
```

2. **Agents 说明章节**
```markdown
## Agents

本 Skill 调用以下角色能力：

| Agent | 角色 | 用途 |
|-------|------|------|
| architect | 架构师 | 系统架构设计 |

请先阅读：`.claude/agents/architect.md`
```

3. **步骤中调用 Agent**
```markdown
### Step 2: 以架构师身份执行

<!-- AGENT: architect -->
你现在扮演架构师角色。请阅读 `.claude/agents/architect.md` 了解：
- 角色定义
- 思维方式

根据需求文档，设计技术方案...
<!-- END AGENT -->
```

### 4.2 Skills 与 Agents 映射

| Skill | Agents |
|-------|--------|
| ideal-requirement (P1) | pm, analyst |
| ideal-dev-solution (P3) | architect |
| ideal-dev-plan (P5) | architect, pm |
| ideal-test-case (P7) | qa |
| ideal-dev-exec (P9) | dev |
| ideal-code-review (P9.1) | dev, architect |
| ideal-test-exec (P11) | qa, dev |
| ideal-wiki (P15) | tech-writer |
| ideal-debugging | dev |

---

## 五、故事文件机制

### 5.1 设计目标

| 目标 | 说明 |
|------|------|
| 上下文隔离 | 每个故事只包含相关的上下文片段 |
| Token 优化 | 减少 70-90% 的 Token 消耗 |
| 独立开发 | 每个故事可独立开发、测试、验证 |
| 依赖管理 | 明确故事间的依赖关系 |

### 5.2 故事文件位置

故事文件放在迭代目录下，与需求/方案/计划在一起：

```
docs/迭代/{需求名}/
├── P1-需求文档.md
├── P3-技术方案.md
├── P5-编码计划.md
├── 流程状态.md
└── stories/                 ← 故事文件
    ├── index.md             # 故事索引
    ├── 001-xxx.md
    └── 002-xxx.md
```

### 5.3 上下文隔离效果

| 场景 | 无故事文件 | 有故事文件 |
|------|-----------|-----------|
| 加载内容 | P1/P3/P5 完整文档 | 当前故事文件 |
| Token 消耗 | 100% | 10-30% |
| AI 专注度 | 容易被干扰 | 高度聚焦 |
| 幻觉风险 | 高 | 低 |

---

## 六、迁移实施记录

### 6.1 实施阶段（2026-02-20）

| 阶段 | 内容 | 状态 |
|------|------|------|
| 1 | 创建 Agent 层（6 个文件） | ✅ 完成 |
| 2 | 改造 P1 Skill | ✅ 完成 |
| 3 | 改造 P3/P5 Skills | ✅ 完成 |
| 4 | 增加故事文件机制 | ✅ 完成 |
| 5 | 完善其他 Skills | ✅ 完成 |

### 6.2 改造的 Skills

| Skill | Agents | 改动 |
|-------|--------|------|
| ideal-requirement | pm, analyst | 添加 Agents 声明和调用 |
| ideal-dev-solution | architect | 添加 Agents 声明和调用 |
| ideal-dev-plan | architect, pm, dev | 添加故事文件生成 |
| ideal-dev-exec | dev | 添加故事文件加载 |
| ideal-test-case | qa | 添加 Agents 声明 |
| ideal-test-exec | qa, dev | 添加 Agents 声明 |
| ideal-code-review | dev, architect | 添加 Agents 声明 |
| ideal-wiki | tech-writer | 添加 Agents 声明 |
| ideal-debugging | dev | 添加 Agents 声明 |

### 6.3 创建的文件

**Agent 文件（6 个）**：
- `.claude/agents/README.md`
- `.claude/agents/analyst.md`
- `.claude/agents/pm.md`
- `.claude/agents/architect.md`
- `.claude/agents/dev.md`
- `.claude/agents/qa.md`
- `.claude/agents/tech-writer.md`

**故事模板（2 个）**：
- `.claude/skills/ideal-dev-plan/references/story-templates/index-template.md`
- `.claude/skills/ideal-dev-plan/references/story-templates/story-template.md`

---

## 七、预期收益

### 7.1 定量收益

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| Token 消耗（P9） | 100% | 10-30% | 降低 70-90% |
| Agent 复用性 | 0% | 100% | 6 个 Agent 被复用 |
| 角色一致性 | 分散 | 统一 | 风格一致 |

### 7.2 定性收益

1. **AI 输出质量提升** - 角色专业化，上下文隔离
2. **可扩展性增强** - 新增 Agent 即可增强能力
3. **维护成本降低** - Agent 独立维护，Skill 更简洁
4. **职责边界清晰** - Agent 定义能力，Skill 定义流程

---

## 八、参考资料

- BMAD-METHOD: https://github.com/bmad-sim/bmad-method
- 设计文档：`docs/plans/2026-02-20-skill-agent-hybrid-architecture-design.md`
- Agent 文件：`.claude/agents/`
- Skill 文件：`.claude/skills/`
