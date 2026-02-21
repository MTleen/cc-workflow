# Wiki 文档大纲

## 项目概述

| 项目属性 | 值 |
|----------|-----|
| 项目名称 | CC-Workflow |
| 复杂度评估 | 简单（7分） |
| 目标读者 | 产品经理、设计师、开发者、测试工程师、架构师 |
| 是否有 API | 否 |
| 在线文档平台 | Docusaurus（推荐） |

## 复杂度评估明细

| 维度 | 评分 | 说明 |
|------|------|------|
| 功能模块 | 2 | 11 个 Skills + 6 个 Agents，模块数量中等 |
| 技术栈 | 1 | 纯 Markdown + Claude Code + Obsidian，极简 |
| 用户群体 | 2 | 多角色（产品/设计/开发/测试/架构），需区分业务与技术文档 |
| 接口类型 | 1 | 无 API/SDK/CLI，以 Markdown 文件为交互媒介 |
| 部署方式 | 1 | 无部署需求，Git 仓库分发 |
| **总分** | **7** | 低复杂度项目 |

---

## 文档内容大纲

### 用户文档集

目录：`docs/Wiki/user-guide/`

---

#### 1. index.md - 用户指南首页

**预估篇幅**：300-500 字

**内容大纲**：
```
# CC-Workflow 用户指南

## 简介
- 一句话定义：Claude Code 中心化团队工作流系统
- 核心价值：团队成员只做「提需求、做评审、反馈意见」
- 适用场景：软件研发团队、产品迭代

## 核心概念
- 16 阶段流程（简要提及，链接到详细页）
- Skill + Agent 架构（简要提及，链接到详细页）
- 人机协作模式（Claude 执行 + 人工评审）

## 文档导航
- 表格：文档名 | 说明 | 链接
- 推荐阅读路径：首页 → 快速开始 → 流程概览

## 快速链接
- 开始第一个需求（链接到 quick-start）
- 了解 16 阶段流程（链接到 workflow-overview）
- 常见问题（链接到 faq）
```

---

#### 2. quick-start.md - 快速开始

**预估篇幅**：2000-2500 字

**内容大纲**：
```
# 快速开始

## 前置条件
### 环境要求
- Claude Code CLI 已安装
- Git 已配置
- （可选）Obsidian 已安装

### 项目初始化
- 克隆项目或使用 /ideal-init 初始化
- 检查 .claude/ 目录结构

## 完整流程演示

### 阶段一：规划（P1-P4）

#### P1 - 需求编写
- 触发命令：/ideal-requirement 我需要添加用户登录功能
- 苏格拉底式对话：问题背景 → 目标用户 → 功能细节 → 验收标准
- 输出：docs/迭代/用户登录/P1-需求文档.md
- 示例对话片段

#### P2 - 需求评审（人工）
- 查看 P1-需求文档.md
- 评审要点：功能完整性、验收标准清晰度
- 操作：反馈修改意见 或 确认通过
- 触发下一阶段：修改 流程状态.md 中 requirement_review: approved

#### P3 - 技术方案（Claude 自动）
- 输入：P1-需求文档.md
- Claude 以架构师角色生成技术方案
- 输出：P3-技术方案.md（架构设计、技术选型、风险评估）
- 用户无需操作，自动执行

#### P4 - 方案评审（人工）
- 查看 P3-技术方案.md
- 评审要点：技术选型合理性、风险可控性
- 触发下一阶段：修改 solution_review: approved

### 阶段二：准备（P5-P8）

#### P5 - 计划生成（Claude 自动）
- 输入：P3-技术方案.md
- Claude 生成编码计划，拆分为故事文件
- 输出：P5-编码计划.md + stories/*.md
- 故事文件示例：001-用户认证.md、002-密码加密.md

#### P6 - 计划评审（人工）
- 查看 P5-编码计划.md 和 stories/index.md
- 评审要点：任务拆分合理性、依赖关系正确性
- 触发下一阶段：修改 plan_review: approved

#### P7 - 测试用例（Claude 自动）
- 输入：P1-需求文档.md + P5-编码计划.md
- Claude 以 QA 角色生成测试用例
- 输出：P7-测试用例.md（功能用例、边界用例、异常用例）

#### P8 - 用例评审（人工）
- 查看 P7-测试用例.md
- 评审要点：覆盖完整性、边界情况
- 触发下一阶段：修改 test_case_review: approved

### 阶段三：执行（P9-P12）

#### P9 - 开发执行（Claude 自动）
- 输入：stories/*.md（只加载当前故事，上下文隔离）
- Claude 以 Dev 角色执行 TDD 开发
- 输出：代码 + GitLab MR
- 逐个故事执行，每个故事完成后更新 stories/index.md

#### P10 - 代码评审（人工）
- 查看GitLab MR
- 评审要点：代码质量、安全性、可维护性
- 操作：Approve 或 提出修改意见
- 触发下一阶段：合并 MR 后自动进入 P11

#### P11 - 测试执行（Claude 自动）
- 输入：P7-测试用例.md
- Claude 执行测试，记录结果
- 输出：P11-测试报告.md
- 如有缺陷，记录并可能返回 P9 修复

#### P12 - 测试评审（人工）
- 查看 P11-测试报告.md
- 评审要点：测试通过率、遗留缺陷
- 触发下一阶段：修改 test_exec_review: approved

### 阶段四：收尾（P13-P16）

#### P13 - 上线评审（人工）
- 汇总检查：全部文档 + 测试结果 + 代码状态
- 评审人：产品 + 技术 + 运维
- 评审要点：功能完整性、风险预案、回滚方案
- 触发下一阶段：修改 release_review: approved

#### P14 - 部署上线（自动）
- CI/CD 自动部署
- 用户无需操作

#### P15 - 维基更新（Claude 自动）
- 输入：代码 + 需求文档 + 技术方案
- Claude 生成/更新 Wiki 文档
- 输出：docs/Wiki/ 下的文档集

#### P16 - 维基评审（人工）
- 查看更新的 Wiki 文档
- 评审要点：内容准确性、完整性
- 触发完成：修改 wiki_review: approved

## 流程状态控制
- 流程状态文件位置：docs/迭代/{需求名称}/流程状态.md
- 状态字段说明：current_phase、xxx_review
- 如何手动触发下一阶段

## 验证结果
- 查看生成的所有文档
- 确认代码已合并
- 确认 Wiki 已更新

## 下一步
- 深入了解各阶段：16 阶段流程概览
- 遇到问题：常见问题
- 理解系统设计：架构设计
```

---

#### 3. workflow-overview.md - 16 阶段流程概览

**预估篇幅**：1500-2000 字

**内容大纲**：
```
# 16 阶段流程概览

## 流程总览
- Mermaid 流程图（P1-P16 完整流程）
- 四个阶段分组：规划、准备、执行、收尾

## 规划阶段（P1-P4）

### P1 - 需求编写
- 执行者：Claude（PM 角色）
- 输入：用户需求描述
- 输出：P1-需求文档.md
- 关键活动：苏格拉底式对话、需求收集

### P2 - 需求评审
- 执行者：人工（产品 + 技术负责人）
- 输入：P1-需求文档.md
- 输出：评审意见 / 通过
- 评审要点清单

### P3 - 技术方案
- 执行者：Claude（架构师角色）
- 输入：P1-需求文档.md
- 输出：P3-技术方案.md
- 关键活动：架构设计、技术选型、风险评估

### P4 - 方案评审
- 执行者：人工（技术负责人 + 架构师）
- 输入：P3-技术方案.md
- 输出：评审意见 / 通过

## 准备阶段（P5-P8）

### P5 - 计划生成
- 执行者：Claude（架构师 + PM 角色）
- 输入：P3-技术方案.md
- 输出：P5-编码计划.md + stories/*.md
- 关键活动：任务拆分、故事文件生成

### P6 - 计划评审
- 执行者：人工（开发负责人）
- 输入：P5-编码计划.md
- 输出：评审意见 / 通过

### P7 - 测试用例
- 执行者：Claude（QA 角色）
- 输入：P1-需求文档.md + P5-编码计划.md
- 输出：P7-测试用例.md
- 关键活动：功能用例、边界用例、异常用例

### P8 - 用例评审
- 执行者：人工（测试负责人）
- 输入：P7-测试用例.md
- 输出：评审意见 / 通过

## 执行阶段（P9-P12）

### P9 - 开发执行
- 执行者：Claude（Dev 角色）
- 输入：stories/*.md
- 输出：代码 + MR
- 关键活动：TDD 开发、故事文件逐个执行

### P10 - 代码评审
- 执行者：人工（开发团队）
- 输入：MR
- 输出：Approve / 修改意见

### P11 - 测试执行
- 执行者：Claude（QA + Dev 角色）
- 输入：P7-测试用例.md
- 输出：P11-测试报告.md
- 关键活动：执行测试、记录结果

### P12 - 测试评审
- 执行者：人工（测试负责人）
- 输入：P11-测试报告.md
- 输出：通过 / 修复

## 收尾阶段（P13-P16）

### P13 - 上线评审
- 执行者：人工（产品 + 技术 + 运维）
- 输入：全部文档
- 输出：上线许可

### P14 - 部署上线
- 执行者：自动（CI/CD）
- 输入：代码
- 输出：生产环境

### P15 - 维基更新
- 执行者：Claude（技术文档角色）
- 输入：代码 + 需求文档
- 输出：Wiki 文档

### P16 - 维基评审
- 执行者：人工（产品 + 技术）
- 输入：Wiki 文档
- 输出：发布许可

## 阶段速查表
- 表格：阶段 | 名称 | 执行者 | 输入 | 输出 | 时长参考
```

---

#### 4. user-roles.md - 角色与职责

**预估篇幅**：600-800 字

**内容大纲**：
```
# 角色与职责

## 核心原则
- 团队成员：提需求、做评审、反馈意见
- Claude Code：需求编写、技术方案、计划生成、开发执行、测试用例、维基更新

## 团队成员职责

### 产品经理 / 设计师
- 发起新需求（P1 触发）
- 需求评审（P2）
- 上线评审（P13）
- 维基评审（P16）

### 开发负责人
- 方案评审（P4）
- 计划评审（P6）
- 代码评审（P10）

### 测试负责人
- 用例评审（P8）
- 测试评审（P12）

### 架构师
- 方案评审（P4）
- 代码评审（P10，技术指导）

## Claude Code 职责

### 需求阶段
- P1：需求收集与文档编写

### 设计阶段
- P3：技术方案设计
- P5：编码计划生成

### 测试阶段
- P7：测试用例编写
- P11：测试执行

### 开发阶段
- P9：代码开发（TDD）

### 文档阶段
- P15：维基文档更新

## 协作流程图
- Mermaid：团队成员与 Claude 的交互流程

## 评审决策权
- 表格：评审点 | 决策者 | 通过标准
```

---

#### 5. faq.md - 常见问题

**预估篇幅**：800-1000 字

**内容大纲**：
```
# 常见问题

## 流程相关

### Q1: 如何知道当前流程处于哪个阶段？
- 查看 流程状态.md 的 current_phase 字段

### Q2: 评审不通过怎么办？
- 提出修改意见 → Claude 重新生成 → 重新评审

### Q3: 可以跳过某些阶段吗？
- 一般不建议
- 特殊情况可手动修改 流程状态.md

### Q4: 多个需求可以并行吗？
- 可以，每个需求在 docs/迭代/ 有独立目录

## 文档相关

### Q5: 各阶段生成的文档在哪里？
- docs/迭代/{需求名称}/ 目录下

### Q6: 故事文件是什么？
- P5 生成的原子化任务
- P9 时只加载当前故事，节省 Token

### Q7: 如何触发下一个阶段？
- 修改 流程状态.md 中的评审状态字段

## 故障排除

### Q8: Claude 没有继续执行下一阶段？
- 检查流程状态是否为 approved
- 检查必要文档是否已生成
- 使用命令手动触发

### Q9: 生成的文档内容不准确？
- 在评审阶段提出修改意见
- 或直接编辑文档

### Q10: 代码 MR 创建失败？
- 检查 Git 配置和权限
- 解决分支冲突后重试

## 最佳实践

### Q11: 需求描述应该多详细？
- 好的示例 vs 不好的示例

### Q12: 评审时应该关注什么？
- 各评审阶段的关注点清单
```

---

#### 6. glossary.md - 术语表

**预估篇幅**：400-600 字

**内容大纲**：
```
# 术语表

## 核心概念

### Skill
- 定义：流程规范层，定义「做什么」和「输出什么」
- 示例：ideal-requirement、ideal-dev-solution
- 相关：Agent

### Agent
- 定义：角色能力层，定义「如何思考」
- 示例：pm、architect、dev、qa
- 相关：Skill

### 故事文件（Story File）
- 定义：P5 生成的原子化任务单元
- 位置：docs/迭代/{需求名}/stories/
- 作用：上下文隔离，Token 节省

### 流程状态文件
- 定义：控制流程阶段流转的 YAML 文件
- 位置：docs/迭代/{需求名}/流程状态.md
- 字段：current_phase、xxx_review

## 流程阶段

### P1-P16
- 16 个阶段编号
- 分组：规划（P1-P4）、准备（P5-P8）、执行（P9-P12）、收尾（P13-P16）

### 评审节点
- P2、P4、P6、P8、P10、P12、P13、P16
- 人工决策点

## 文件类型

### P1-需求文档.md
- P1 阶段输出的需求文档

### P3-技术方案.md
- P3 阶段输出的技术方案

### P5-编码计划.md
- P5 阶段输出的编码计划

### P7-测试用例.md
- P7 阶段输出的测试用例

### P11-测试报告.md
- P11 阶段输出的测试报告
```

---

### 开发文档集

目录：`docs/Wiki/dev-guide/`

---

#### 1. index.md - 开发文档首页

**预估篇幅**：200-300 字

**内容大纲**：
```
# CC-Workflow 开发文档

## 简介
- 面向扩展 CC-Workflow 的开发者
- 前置知识：了解 Skill 和 Agent 概念

## 文档导航
- 表格：文档名 | 说明 | 链接

## 快速链接
- 理解架构：架构设计
- 开发 Skill：Skill 开发指南
- 开发 Agent：Agent 开发指南
- 参与贡献：贡献指南
```

---

#### 2. architecture.md - 架构设计

**预估篇幅**：1200-1500 字

**内容大纲**：
```
# 架构设计

## 系统架构

### 三层结构
- Mermaid 架构图：Agent 层、Skill 层、文档层
- 各层职责说明

### Skill + Agent 混合架构
- Mermaid：Skill 调用 Agent 的关系图
- 职责边界：Skill 定义 What，Agent 定义 Who

## 核心组件

### Agent（角色能力层）
- 定义：角色身份、思维方式、决策框架
- 位置：.claude/agents/
- 特点：可复用、可组合、独立于流程

### Skill（流程规范层）
- 定义：阶段目标、输入输出、模板、检查清单
- 位置：.claude/skills/
- 特点：定义流程，调用 Agent

### 文档层
- 位置：docs/
- 组成：迭代文档、Wiki、设计文档

## 数据流

### 需求开发流程
- Mermaid：用户输入 → P1 → P2 → ... → P16

### 故事文件机制
- Mermaid：P5 拆分 → stories → P9 加载

## 关键设计决策

### 决策 1：Skill + Agent 分离
- 背景、问题、决策、收益

### 决策 2：故事文件机制
- 背景、问题、决策、收益

### 决策 3：流程状态文件
- 背景、问题、决策、收益

## 扩展点
- 添加新 Skill
- 添加新 Agent
- 自定义模板
```

---

#### 3. skill-development.md - Skill 开发指南

**预估篇幅**：1000-1200 字

**内容大纲**：
```
# Skill 开发指南

## Skill 概述
- 定义：流程规范层
- 核心要素：阶段目标、输入输出、模板、检查清单

## 目录结构
```
ideal-{name}/
├── SKILL.md              # 必需
└── references/           # 可选
    ├── templates/
    ├── guides/
    └── examples/
```

## SKILL.md 结构

### Frontmatter
- name：命名规范 ideal-{领域?}-{功能}
- description：触发条件描述（Use when...）
- agents：调用的 Agent 列表

### 正文结构
- Overview：概述
- When to Use：触发条件（含 Mermaid 流程图）
- Agents：Agent 列表
- Workflow：工作流程（含 Mermaid 图）
- Step-by-Step Process：详细步骤
- Quality Checklist：质量检查清单
- Common Mistakes：常见错误
- References：参考文件

## 命名规范
- ideal-{功能}：通用功能
- ideal-dev-{功能}：开发领域
- ideal-test-{功能}：测试领域

## 调用 Agent
- AGENT 标签语法
- 示例代码

## 模板设计
- 模板位置：references/templates/
- 占位符规范
- 示例文件位置：references/examples/

## 质量标准
- Quality Checklist 编写要点
- Common Mistakes 编写要点

## 示例
- 完整的 Skill 示例（ideal-requirement 或 ideal-wiki）
```

---

#### 4. agent-development.md - Agent 开发指南

**预估篇幅**：800-1000 字

**内容大纲**：
```
# Agent 开发指南

## Agent 概述
- 定义：角色能力层
- 核心要素：角色身份、思维方式、输出规范

## Agent 文件结构

### Frontmatter
- name：Agent 名称
- display_name：显示名称
- version：版本号
- skills：关联的 Skills

### 正文结构
- 角色身份：定位、职责、价值
- 思维方式：思维原则、决策依据
- 输出规范：文档结构、格式要求
- 质量检查清单：自检项
- 常见陷阱：需避免的错误

## 编写要点

### 角色身份
- 明确定位
- 核心价值主张
- 独特性

### 思维方式
- 角色的专业视角
- 决策框架
- 关注点

### 输出规范
- 不定义具体模板（由 Skill 定义）
- 定义输出原则和风格

## 在 Skill 中调用
- AGENT 标签语法
- 调用时机

## 现有 Agent 参考
- pm.md：产品经理
- architect.md：架构师
- dev.md：开发工程师
- qa.md：测试工程师
```

---

#### 5. story-mechanism.md - 故事文件机制

**预估篇幅**：600-800 字

**内容大纲**：
```
# 故事文件机制

## 概述
- 目的：上下文隔离
- 效果：Token 消耗降低 70-90%

## 工作原理

### P5 生成
- 输入：P5-编码计划.md
- 处理：将计划拆分为原子化任务
- 输出：stories/*.md

### 目录结构
```
stories/
├── index.md        # 故事索引
├── 001-xxx.md      # 故事 1
├── 002-xxx.md      # 故事 2
└── ...
```

### P9 使用
- 读取 index.md 确认当前故事
- 只加载当前故事文件
- 完成后更新索引

## 故事文件格式
- 标题、描述、任务列表、验收标准

## index.md 格式
- 故事清单
- 当前故事标记
- 完成状态

## Token 节省原理
- 对比：全量加载 vs 故事文件加载
- 数据示例

## 最佳实践
- 故事粒度控制
- 依赖关系处理
- 状态更新时机
```

---

#### 6. flow-state.md - 流程状态控制

**预估篇幅**：500-700 字

**内容大纲**：
```
# 流程状态控制

## 概述
- 流程状态文件的作用
- 位置：docs/迭代/{需求名称}/流程状态.md

## 文件格式

### YAML Frontmatter
```yaml
---
current_phase: P6
requirement_review: approved
plan_review: pending
stories_dir: docs/迭代/{需求名}/stories/
---
```

## 字段说明

### current_phase
- 当前阶段（P1-P16）
- 更新时机

### xxx_review
- 评审状态：pending / approved / rejected
- 各评审阶段对应字段

### stories_dir
- 故事文件目录路径

## 触发机制

### 状态变更触发
- pending → approved：触发下一阶段
- approved → rejected：触发重新执行

### 手动触发
- 修改流程状态文件
- 使用命令触发

## 状态流转图
- Mermaid：各阶段状态流转

## 最佳实践
- 不要跳过阶段
- 及时更新状态
- 保持状态同步
```

---

#### 7. contributing.md - 贡献指南

**预估篇幅**：600-800 字

**内容大纲**：
```
# 贡献指南

## 开发流程

### 1. Fork 并克隆
- Fork 仓库
- 克隆到本地
- 添加上游仓库

### 2. 创建分支
- 分支命名规范
- 示例命令

### 3. 开发与测试
- 开发步骤
- 本地验证

### 4. 提交更改
- 提交规范（Conventional Commits）
- 示例提交信息

### 5. 创建 PR
- PR 标题格式
- PR 描述模板

## 提交规范
- feat / fix / docs / refactor / test / chore
- 示例表格

## 代码规范
- Markdown 格式
- 文件命名
- 目录结构

## PR 检查清单
- [ ] 提交消息符合规范
- [ ] 文档已更新
- [ ] 格式符合要求

## 获取帮助
- 提交 Issue
- 查看文档
```

---

### 参考文档集

目录：`docs/Wiki/reference/`

---

#### 1. index.md - 参考文档首页

**预估篇幅**：200 字

**内容大纲**：
```
# 参考文档

## 简介
- 快速查找的索引页面

## 文档导航
- 表格：文档名 | 说明 | 链接
```

---

#### 2. skills-index.md - Skills 索引

**预估篇幅**：600-800 字

**内容大纲**：
```
# Skills 索引

## 索引表

| Skill | 阶段 | 调用 Agent | 用途 | 文件路径 |
|-------|------|------------|------|----------|
| ideal-requirement | P1 | pm, analyst | 需求编写 | .claude/skills/ideal-requirement/ |
| ideal-dev-solution | P3 | architect | 技术方案 | .claude/skills/ideal-dev-solution/ |
| ideal-dev-plan | P5 | architect, pm | 计划生成 | .claude/skills/ideal-dev-plan/ |
| ideal-test-case | P7 | qa | 测试用例 | .claude/skills/ideal-test-case/ |
| ideal-dev-exec | P9 | dev | 开发执行 | .claude/skills/ideal-dev-exec/ |
| ideal-code-review | P10 | dev, architect | 代码审查 | .claude/skills/ideal-code-review/ |
| ideal-test-exec | P11 | qa, dev | 测试执行 | .claude/skills/ideal-test-exec/ |
| ideal-wiki | P15 | tech-writer | 维基更新 | .claude/skills/ideal-wiki/ |
| ideal-flow-control | 全流程 | - | 流程控制 | .claude/skills/ideal-flow-control/ |
| ideal-debugging | - | dev | 系统化调试 | .claude/skills/ideal-debugging/ |
| ideal-init | - | - | 项目初始化 | .claude/skills/ideal-init/ |

## 按阶段分类

### 规划阶段（P1-P4）
- ideal-requirement (P1)
- ideal-dev-solution (P3)

### 准备阶段（P5-P8）
- ideal-dev-plan (P5)
- ideal-test-case (P7)

### 执行阶段（P9-P12）
- ideal-dev-exec (P9)
- ideal-code-review (P10)
- ideal-test-exec (P11)

### 收尾阶段（P13-P16）
- ideal-wiki (P15)

### 通用
- ideal-flow-control
- ideal-debugging
- ideal-init
```

---

#### 3. agents-index.md - Agents 索引

**预估篇幅**：500-600 字

**内容大纲**：
```
# Agents 索引

## 索引表

| Agent | 角色 | 思维方式 | 被调用阶段 | 文件路径 |
|-------|------|----------|------------|----------|
| analyst | 业务分析师 | 证据优先、结构化思维 | P1 | .claude/agents/analyst.md |
| pm | 产品经理 | 用户价值导向、MVP 思维 | P1, P5 | .claude/agents/pm.md |
| architect | 架构师 | 系统思维、权衡取舍 | P3, P5 | .claude/agents/architect.md |
| dev | 开发工程师 | TDD、代码质量 | P9, P11 | .claude/agents/dev.md |
| qa | 测试工程师 | 边界思维、风险意识 | P7, P11 | .claude/agents/qa.md |
| tech-writer | 技术文档撰写 | 用户中心、结构优先 | P15 | .claude/agents/tech-writer.md |

## 按调用阶段分类

### P1 需求编写
- analyst
- pm

### P3 技术方案
- architect

### P5 计划生成
- architect
- pm

### P7 测试用例
- qa

### P9 开发执行
- dev

### P11 测试执行
- qa
- dev

### P15 维基更新
- tech-writer
```

---

#### 4. templates-index.md - 模板索引

**预估篇幅**：400-500 字

**内容大纲**：
```
# 模板索引

## 需求文档模板
| 模板名 | 路径 | 用途 |
|--------|------|------|
| software-feature.md | ideal-requirement/references/templates/ | 软件功能需求 |
| bug-fix.md | ideal-requirement/references/templates/ | Bug 修复需求 |
| refactoring.md | ideal-requirement/references/templates/ | 重构优化需求 |

## 技术方案模板
| 模板名 | 路径 | 用途 |
|--------|------|------|
| solution-template.md | ideal-dev-solution/references/templates/ | 技术方案 |

## 编码计划模板
| 模板名 | 路径 | 用途 |
|--------|------|------|
| plan-template.md | ideal-dev-plan/references/templates/ | 编码计划 |
| story-template.md | ideal-dev-plan/references/story-templates/ | 故事文件 |
| index-template.md | ideal-dev-plan/references/story-templates/ | 故事索引 |

## 测试用例模板
| 模板名 | 路径 | 用途 |
|--------|------|------|
| test-case-template.md | ideal-test-case/references/templates/ | 测试用例 |

## 测试报告模板
| 模板名 | 路径 | 用途 |
|--------|------|------|
| test-report-template.md | ideal-test-exec/references/templates/ | 测试报告 |

## 代码审查模板
| 模板名 | 路径 | 用途 |
|--------|------|------|
| review-report-template.md | ideal-code-review/references/templates/ | 审查报告 |

## Wiki 写作指南
| 文件名 | 路径 | 用途 |
|--------|------|------|
| user-doc-guide.md | ideal-wiki/references/guides/ | 用户文档写作 |
| dev-doc-guide.md | ideal-wiki/references/guides/ | 开发文档写作 |
| api-doc-guide.md | ideal-wiki/references/guides/ | API 文档写作 |
| outline-design-guide.md | ideal-wiki/references/guides/ | 大纲设计 |
| technical-writing-guide.md | ideal-wiki/references/guides/ | 技术写作规范 |
| wiki-review-guide.md | ideal-wiki/references/guides/ | Wiki 审查 |
```

---

## 设计说明

### 文档拆分依据

1. **用户文档**：面向「使用工作流的团队成员」，按使用场景拆分：
   - 入门路径：首页 → 快速开始 → 流程概览
   - 角色理解：角色与职责
   - 问题解决：常见问题 + 术语表

2. **开发文档**：面向「扩展工作流的开发者」，按开发任务拆分：
   - 架构理解：架构设计
   - 扩展开发：Skill 开发 + Agent 开发
   - 机制理解：故事文件 + 流程状态
   - 参与贡献：贡献指南

3. **参考文档**：面向「需要快速查找信息的用户」，提供索引：
   - Skills 索引
   - Agents 索引
   - 模板索引

### 覆盖范围

**包含**：
- 16 阶段完整流程
- Skill/Agent 架构设计
- 开发扩展指南
- 故障排除 FAQ

**不包含**：
- GitLab 具体配置（属于部署层面）
- Obsidian 插件详细配置（属于工具层面）
- Claude Code 安装教程（属于外部依赖）

### 特殊考虑

1. **中英文混用**：项目核心术语保留英文（Skill、Agent、Story），正文使用中文
2. **图表优先**：架构、流程类内容优先使用 Mermaid 图表
3. **示例完整**：所有命令、配置需提供完整可执行示例
4. **交叉引用**：文档间建立完整的交叉链接网络

---

## 目录结构预览

```
docs/Wiki/
├── wiki-outline.md           # 本文件
├── wiki-improvements.md      # 改进项追踪（Phase 3 生成）
│
├── user-guide/
│   ├── _category_.json
│   ├── index.md
│   ├── quick-start.md
│   ├── workflow-overview.md
│   ├── user-roles.md
│   ├── faq.md
│   └── glossary.md
│
├── dev-guide/
│   ├── _category_.json
│   ├── index.md
│   ├── architecture.md
│   ├── skill-development.md
│   ├── agent-development.md
│   ├── story-mechanism.md
│   ├── flow-state.md
│   └── contributing.md
│
└── reference/
    ├── _category_.json
    ├── index.md
    ├── skills-index.md
    ├── agents-index.md
    └── templates-index.md
```

---

## 统计

| 文档集 | 文档数 | 预估总篇幅 |
|--------|--------|------------|
| 用户文档 | 6 篇 | 5600-6900 字 |
| 开发文档 | 7 篇 | 5100-6300 字 |
| 参考文档 | 4 篇 | 1700-2100 字 |
| **合计** | **17 篇** | **12400-15300 字** |
