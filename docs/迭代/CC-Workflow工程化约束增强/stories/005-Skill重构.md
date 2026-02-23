---
story_id: "005"
title: "Skill 重构（M005）"
status: pending
depends_on: ["001", "002", "003"]
---

# Story 005: Skill 重构

## 上下文

### 需求来源
> 来源：P1-需求文档.md#F007：现有 Skill 全面重构

**重构原则**：
1. 去掉 `<!-- AGENT: xxx -->` 注释扮演方式
2. 使用 Task 工具调用对应的子 Agent
3. 调度逻辑在 Skill 内部实现

**需要重构的 Skill 清单**：

| Skill | 原调用方式 | 新调用方式 |
|-------|-----------|-----------|
| ideal-requirement | 注释扮演 pm/analyst | Task(subagent_type="pm") |
| ideal-dev-solution | 注释扮演 architect | Task(subagent_type="architect") |
| ideal-dev-plan | 注释扮演 architect/pm | Task(subagent_type="architect") |
| ideal-test-case | 注释扮演 qa | Task(subagent_type="qa") |
| ideal-dev-exec | 注释扮演 dev | Task(subagent_type="implement/check/debug") |
| ideal-code-review | 注释扮演 dev/architect | Task(subagent_type="check") |
| ideal-test-exec | 注释扮演 qa/dev | Task(subagent_type="qa") |
| ideal-wiki | 注释扮演 tech-writer | Task(subagent_type="tech-writer") |
| ideal-debugging | 注释扮演 dev | Task(subagent_type="debug") |

### 技术方案
> 来源：P3-技术方案.md#M005：Skill 重构

**重构后的 Skill 结构**：
```markdown
# ideal-dev-exec（P9 开发执行）

## Agents

| Agent | 用途 |
|-------|------|
| implement | 代码实现 |
| check | 代码检查 |
| debug | 调试修复 |

## Workflow

### Step 1: 读取当前故事
读取 `stories/index.md`，确定当前要执行的故事。

### Step 2: 调用 implement Agent
```
Task(
    subagent_type: "implement",
    prompt: "实现 {故事名称}，上下文已自动注入",
    model: "opus"
)
```
Hook 会自动注入 `{故事名}.jsonl` 配置的上下文。

### Step 3: 调用 check Agent（Ralph Loop 控制）
```
Task(
    subagent_type: "check",
    prompt: "检查 {故事名称} 的代码质量",
    model: "opus"
)
```
SubagentStop Hook 会执行 verify 命令，确保通过才结束。

### Step 4: 处理检查失败
如果 check Agent 报告问题，调用 debug Agent：
```
Task(
    subagent_type: "debug",
    prompt: "调试 {故事名称} 的问题：{问题描述}",
    model: "opus"
)
```
```

### 相关代码

已完成的依赖模块：
- `001-Hook自动注入.md` - Hook 可自动注入上下文
- `002-细粒度Agent定义.md` - 新 Agent 已定义
- `003-RalphLoop质量控制.md` - Ralph Loop 可控制检查

## 任务清单

### T005-1：重构 ideal-dev-exec（核心）
- [ ] 读取现有 `.claude/skills/ideal-dev-exec/SKILL.md`
- [ ] 去掉所有 `<!-- AGENT: dev -->` 和 `<!-- END AGENT -->` 注释
- [ ] 更新 Agents 章节，添加 implement/check/debug
- [ ] 添加 Task 调用 implement Agent 的示例
- [ ] 添加 Task 调用 check Agent 的示例（说明 Ralph Loop）
- [ ] 添加 Task 调用 debug Agent 的示例（失败时）
- [ ] 更新 Workflow 说明

**关键修改**：
- 将注释扮演改为 Task 调用
- 添加 Hook 自动注入说明
- 添加 Ralph Loop 控制说明

**验证标准**：
- 无注释扮演方式
- 包含完整的 Task 调用示例
- 说明 Hook 自动注入机制

### T005-2：重构 ideal-code-review
- [ ] 读取现有 `.claude/skills/ideal-code-review/SKILL.md`
- [ ] 去掉 `<!-- AGENT: dev/architect -->` 注释
- [ ] 更新 Agents 章节，添加 check Agent
- [ ] 添加 Task 调用 check Agent
- [ ] 更新两阶段审查说明
- [ ] 说明与 Ralph Loop 的配合

**验证标准**：
- 使用 Task 调用 check Agent
- 说明与 Ralph Loop 的配合

### T005-3：重构 ideal-requirement
- [ ] 读取现有 `.claude/skills/ideal-requirement/SKILL.md`
- [ ] 去掉 `<!-- AGENT: pm -->` 和 `<!-- AGENT: analyst -->` 注释
- [ ] 更新 Agents 章节，添加 pm/analyst
- [ ] 添加 Task 调用 pm Agent
- [ ] 添加 Task 调用 analyst Agent（竞品分析时）
- [ ] 添加 Worktree 创建调用（集成 M004）

**验证标准**：
- 使用 Task 调用 pm/analyst Agent
- P1 阶段创建 Worktree

### T005-4：重构 ideal-dev-solution
- [ ] 读取现有 `.claude/skills/ideal-dev-solution/SKILL.md`
- [ ] 去掉 `<!-- AGENT: architect -->` 注释
- [ ] 更新 Agents 章节，添加 architect
- [ ] 添加 Task 调用 architect Agent
- [ ] 更新技术选型流程
- [ ] 说明上下文自动注入

**验证标准**：
- 使用 Task 调用 architect Agent
- 上下文自动注入说明

### T005-5：重构 ideal-dev-plan
- [ ] 读取现有 `.claude/skills/ideal-dev-plan/SKILL.md`
- [ ] 去掉 `<!-- AGENT: architect -->` 和 `<!-- AGENT: pm -->` 注释
- [ ] 更新 Agents 章节，添加 architect/pm
- [ ] 添加 Task 调用 architect Agent
- [ ] 添加 Task 调用 pm Agent（优先级评估时）
- [ ] 更新故事文件生成说明
- [ ] 添加 jsonl 配置生成说明

**验证标准**：
- 使用 Task 调用 architect/pm Agent
- 包含 jsonl 配置生成说明

### T005-6：重构 ideal-test-case
- [ ] 读取现有 `.claude/skills/ideal-test-case/SKILL.md`
- [ ] 去掉 `<!-- AGENT: qa -->` 注释
- [ ] 更新 Agents 章节，添加 qa
- [ ] 添加 Task 调用 qa Agent
- [ ] 更新测试用例生成流程
- [ ] 说明上下文自动注入

**验证标准**：
- 使用 Task 调用 qa Agent
- 上下文自动注入说明

### T005-7：重构 ideal-test-exec
- [ ] 读取现有 `.claude/skills/ideal-test-exec/SKILL.md`
- [ ] 去掉 `<!-- AGENT: qa -->` 和 `<!-- AGENT: dev -->` 注释
- [ ] 更新 Agents 章节，添加 qa/debug
- [ ] 添加 Task 调用 qa Agent
- [ ] 添加 Task 调用 debug Agent（失败时）
- [ ] 更新测试执行流程

**验证标准**：
- 使用 Task 调用 qa/debug Agent
- 说明失败时的调试流程

### T005-8：重构 ideal-wiki
- [ ] 读取现有 `.claude/skills/ideal-wiki/SKILL.md`
- [ ] 去掉 `<!-- AGENT: tech-writer -->` 注释
- [ ] 更新 Agents 章节，添加 tech-writer
- [ ] 添加 Task 调用 tech-writer Agent
- [ ] 更新维基生成流程
- [ ] 说明上下文自动注入

**验证标准**：
- 使用 Task 调用 tech-writer Agent
- 上下文自动注入说明

### T005-9：重构 ideal-debugging
- [ ] 读取现有 `.claude/skills/ideal-debugging/SKILL.md`
- [ ] 去掉 `<!-- AGENT: dev -->` 注释
- [ ] 更新 Agents 章节，添加 debug
- [ ] 添加 Task 调用 debug Agent
- [ ] 更新调试流程说明
- [ ] 说明根因分析流程

**验证标准**：
- 使用 Task 调用 debug Agent
- 包含根因分析流程

### T005-10：更新 agents/README.md
- [ ] 读取现有 `.claude/agents/README.md`
- [ ] 添加新 Agent 清单（implement/check/debug/research）
- [ ] 更新 Agent 总数（6 → 10）
- [ ] 更新调用方式说明（Task 工具）
- [ ] 添加 Task 工具调用示例
- [ ] 更新 Agent 复用关系图

**验证标准**：
- 包含 10 个 Agent 的完整说明
- 包含 Task 调用示例
- 复用关系图正确

## 验收标准

### 功能验收
- [ ] 所有 9 个 Skill 完成重构
- [ ] 无注释扮演方式
- [ ] 所有 Skill 使用 Task 工具调用
- [ ] agents/README.md 更新完整

### 代码质量
- [ ] Markdown 格式正确
- [ ] 无语法错误
- [ ] 与现有文档风格一致

## 实现笔记

<!-- 由 Claude 在执行过程中填写 -->
