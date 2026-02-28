---
name: ideal-delivery
description: Use when P14 维基评审 is completed, all development and testing work is finished, and the iteration needs to be finalized. Triggers when user requests to mark iteration complete, submit deliverables, or close the development cycle.
---

# ideal-delivery（P15 成果提交）

## Overview

完成迭代交付的最后一步：创建 PR、清理 worktree、本地归档、成果摘要。

**核心原则**：
- 迭代目录不被 git 跟踪，归档是纯本地操作
- 先提交代码，再创建 PR，PR 合并后本地归档

**违反以下任何规则 = 违反 skill 精神**：
- 直接合并到主分支（必须通过 PR，除非无远程仓库）
- 代码未提交就标记完成
- 跳过状态文件更新
- 忘记重命名迭代目录
- worktree 未清理

---

## When to Use

```mermaid
flowchart TD
    A[开始 P15] --> A0{有远程仓库?}
    A0 -->|是| A1[读取项目配置]
    A0 -->|否| S1[本地简化流程]
    A1 --> A2{多个进行中迭代?}
    A2 -->|是| A3[用户指定迭代]
    A2 -->|否| B
    A3 --> B{在 worktree 开发?}
    B -->|是| C[切换到主仓库]
    C --> D{所有代码已提交?}
    B -->|否| D
    D -->|否| E[提交代码]
    E --> D
    D -->|是| F[创建 Pull Request]
    F --> G{PR 已合并?}
    G -->|被拒绝| R[修改代码]
    R --> D
    G -->|否| H[等待用户合并 PR]
    H --> G
    G -->|是| I[删除 feature 分支]
    I --> J{是 worktree?}
    J -->|是| K[删除 worktree]
    J -->|否| L[本地归档]
    K --> L
    L --> M[输出成果摘要]
    M --> P[完成]

    S1 --> S2[本地 commit 到主分支]
    S2 --> L
```

### 触发条件

| 条件 | 说明 |
|------|------|
| P14 完成 | 维基评审通过 |
| 用户请求 | "标记完成"、"提交成果"、"归档" |
| 所有测试通过 | P11 测试评审已完成 |

### 不适用场景

- 开发未完成 → 返回 P9
- 测试未通过 → 返回 P11
- 维基未更新 → 返回 P13

---

## 成果提交清单

### 必须完成的动作

| 序号 | 动作 | 验证方式 |
|------|------|----------|
| 0 | 检测远程仓库 | `git remote -v` |
| 1 | 读取项目配置 | 确认主分支名 |
| 2 | 确定目标迭代 | 如有多个，用户已指定 |
| 3 | 提交所有代码变更 | `git status` 显示 clean |
| 4 | 创建 Pull Request（有远程仓库） | PR URL 可访问 |
| 5 | 等待 PR 合并 | PR 状态为 merged |
| 6 | 删除 feature 分支 | 分支已删除 |
| 7 | 删除 worktree（如适用） | worktree 目录已删除 |
| 8 | 本地归档 | 状态已更新，目录已重命名 |
| 9 | 输出成果摘要 | 摘要已展示 |

---

## Step-by-Step Process

### Step 0: 检测远程仓库

**首先检测项目是否有远程仓库**：

```bash
# 检测远程仓库
git remote -v
```

**根据结果选择流程**：

| 情况 | 流程 |
|------|------|
| 有远程仓库（GitHub/GitLab） | 完整 PR 流程（Step 1-9） |
| 无远程仓库 | 简化流程（本地 commit → 归档） |

### Step 1: 读取项目配置

**IRON LAW: 必须先读取项目配置，获取关键参数**

```bash
# 检查项目配置文件是否存在
cat .claude/project-config.md
```

**从项目配置中提取**：

| 配置项 | 配置文件中的位置 | 默认值 |
|--------|------------------|--------|
| 主分支名 | `默认分支` | main |
| 功能分支前缀 | `功能分支前缀` | feature/ |

**如果配置文件不存在**：
- 询问用户主分支名称（通常是 main 或 master）
- 询问功能分支前缀（通常是 feature/ 或空）

### Step 2: 验证前置条件

**流程状态文件位置**：`docs/迭代/{YYYY-MM-DD}-[进行中]-{需求名称}/流程状态.md`

**检查进行中迭代**：

```bash
# 找到进行中的迭代目录
ls docs/迭代/ | grep "\[进行中\]"
```

**⚠️ 如果有多个进行中迭代**：
- 列出所有进行中的迭代目录
- 询问用户要完成哪一个迭代
- 将选中的迭代路径存储为 `{迭代目录}` 变量

### Step 3: 检查开发环境

**IRON LAW: 必须在主仓库操作，不能在 worktree 中创建 PR**

```bash
# 检查是否在 worktree 中
git worktree list

# 当前路径是否在 worktree 目录下
pwd | grep worktree
```

**如果当前在 worktree 中**：

```bash
# 记录当前分支名
CURRENT_BRANCH=$(git branch --show-current)

# 切换到主仓库
cd {主仓库路径}
```

### Step 4: 提交代码变更

**IRON LAW: 必须先提交代码再创建 PR**

**IRON LAW: 只在 P15 阶段才推送分支到远程，开发期间不要推送**

```bash
# 检查未提交的变更
git status

# 如果有变更，提交
git add -A
git commit -m "feat: {需求名称} 开发完成"

# 推送分支到远程
git push origin {feature-branch}
```

### Step 5: 创建 Pull Request

**IRON LAW: 禁止直接合并到主分支，必须通过 PR**

**方式一：使用 GitHub CLI 创建 PR**

```bash
gh pr create --title "feat: {需求名称}" --body "$(cat <<'EOF'
## 变更概述

{需求描述}

## 变更内容

- {变更项 1}
- {变更项 2}

## 检查清单

- [x] 代码已自测
- [x] 测试用例已通过
- [x] 文档已更新
EOF
)"
```

**方式二：在网页上手动创建 PR**

1. 推送分支后，GitHub 会显示创建 PR 的链接
2. 访问链接，填写 PR 标题和描述
3. 点击 "Create pull request"

**暂停等待用户合并 PR**：

```
Pull Request 已创建：{PR-URL}

请审查并合并 PR。合并后告诉我"已合并"，我将继续完成归档工作。
```

### Step 6: 合并后清理

**IRON LAW: PR 合并后必须删除 feature 分支和 worktree**

```bash
# 切换到主分支
git checkout {主分支名}

# 拉取最新代码
git pull origin {主分支名}

# 删除已合并的 feature 分支
git branch -d {feature-branch}
git push origin --delete {feature-branch}
```

**如果使用了 worktree，删除 worktree**：

```bash
# 删除 worktree
git worktree remove {worktree路径}

# 可选：删除 worktree 目录
rm -rf {worktree路径}
```

### Step 7: 本地归档

**⚠️ 重要：迭代目录不被 git 跟踪，归档是纯本地操作**

归档包含两个动作：

**7.1 更新流程状态文件**

修改 `{迭代目录}/流程状态.md`：

```yaml
---
current_phase: P15
status: completed
requirement_name: {需求名称}
created_date: {创建日期}
stories_dir: ./stories/
---
```

更新阶段进度表中的 P15 行：

```markdown
| P15 成果提交 | ✅ completed | {日期} | {备注} |
```

**7.2 重命名迭代目录**

```
原名称：docs/迭代/YYYY-MM-DD-[进行中]-{需求名称}/
新名称：docs/迭代/YYYY-MM-DD-[已完成]-{需求名称}/
```

```bash
mv "docs/迭代/YYYY-MM-DD-[进行中]-{需求名称}" "docs/迭代/YYYY-MM-DD-[已完成]-{需求名称}"
```

### Step 8: 输出成果摘要

```markdown
## 成果提交完成

### 迭代信息
- 需求名称：{名称}
- 开发周期：{开始日期} ~ {结束日期}
- 代码分支：{分支名}（已删除）
- Pull Request：{PR-URL}（已合并）

### 交付成果
- 代码提交：{commit 数量} commits
- 功能实现：{功能列表}
- 测试覆盖：{测试数量} 个测试用例

### 清理工作
- [x] Feature 分支已删除
- [x] Worktree 已删除（如适用）
- [x] 迭代目录已归档（本地）

---

✅ 迭代已完成，可进行上线部署。
```

---

## 无远程仓库的简化流程

**适用场景**：
- 本地项目，没有配置远程仓库
- 个人小项目，不需要 PR 流程

**流程**：

```bash
# 1. 确保在主分支
git checkout {主分支名}

# 2. 提交所有变更
git add -A
git commit -m "feat: {需求名称} 开发完成"

# 3. 执行本地归档（Step 7）
# 4. 输出成果摘要（Step 8）
```

---

## Quality Checklist

- [ ] 远程仓库已检测
- [ ] 项目配置已读取（主分支名、功能分支前缀）
- [ ] 进行中迭代已确定（如有多个，用户已指定）
- [ ] 已切换到主仓库（不在 worktree 中操作）
- [ ] 所有代码变更已提交
- [ ] Pull Request 已创建（有远程仓库时）
- [ ] Pull Request 已合并（有远程仓库时）
- [ ] Feature 分支已删除
- [ ] Worktree 已删除（如适用）
- [ ] 流程状态文件已更新
- [ ] 迭代目录已重命名
- [ ] 成果摘要已输出

---

## Common Mistakes

| 错误 | 正确做法 |
|------|----------|
| 直接合并到主分支 | 必须创建 Pull Request（有远程仓库时） |
| 在 worktree 中创建 PR | 切换到主仓库再操作 |
| 忘记删除 feature 分支 | PR 合并后必须删除 |
| 忘记删除 worktree | 合并后必须清理 worktree |
| 代码未提交就标记完成 | 必须先 `git status` 确认 clean |
| 跳过流程状态更新 | 必须更新 YAML 中的 status |
| 忘记重命名目录 | `[进行中]` 必须改为 `[已完成]` |
| 成果摘要过于简单 | 包含完整的交付信息 |

## Red Flags - 立即停止

如果发现自己正在做以下事情，立即停止：

- "直接合并到 main 吧，更快"（有远程仓库时必须通过 PR）
- "worktree 不用删"（必须清理）
- "分支留着以后用"（必须删除 feature 分支）
- "代码应该都提交了"（未验证 git status）
- "状态更新不重要"（必须更新）
- "目录名不用改"（必须重命名）

**所有这些都意味着：停止，返回遵循规则。**

---

## 后续步骤

P15 完成后：

1. **CI/CD 自动触发**：如果配置了自动化流水线
2. **上线部署**：手动或自动部署到生产环境
3. **迭代归档**：本地迭代目录已标记为 `[已完成]`

如果需要回退：
- 重新打开迭代目录（`[已完成]` → `[进行中]`）
- 创建新的分支修复问题
- 走正常的开发流程

---

## Troubleshooting

### PR 被拒绝或需要修改

```bash
# 1. 切换回 feature 分支
git checkout {feature-branch}

# 2. 修改代码后提交
git add -A
git commit -m "fix: 根据审查意见修改"
git push origin {feature-branch}

# 3. PR 会自动更新，等待重新审查
```

### 合并冲突

```bash
# 1. 确保在 feature 分支
git checkout {feature-branch}

# 2. 拉取最新的主分支并变基
git fetch origin {主分支名}
git rebase origin/{主分支名}

# 3. 解决冲突后继续变基
git rebase --continue

# 4. 强制推送
git push origin {feature-branch} --force-with-lease
```

### 中断恢复

| 检查项 | 命令 | 判断 |
|--------|------|------|
| 代码是否已提交 | `git status` | working tree clean = 已提交 |
| PR 是否已创建 | `gh pr list --head {branch}` | 有输出 = 已创建 |
| PR 是否已合并 | `gh pr view {PR号}` | state: MERGED = 已合并 |
| 分支是否已删除 | `git branch -a \| grep {branch}` | 无输出 = 已删除 |
| 目录是否已重命名 | `ls docs/迭代/` | 无 [进行中] = 已归档 |

**根据检查结果确定当前阶段**：

- 代码未提交 → 从 Step 4 继续
- PR 未创建 → 从 Step 5 继续
- PR 未合并 → 等待用户合并后从 Step 6 继续
- 分支未删除 → 从 Step 6 继续
- 目录未重命名 → 从 Step 7 继续
