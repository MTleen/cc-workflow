---
story_id: "004"
title: "Worktree 生命周期（M004）"
status: pending
depends_on: ["001"]
---

# Story 004: Worktree 生命周期

## 上下文

### 需求来源
> 来源：P1-需求文档.md#F006：Worktree 生命周期管理

**生命周期流程**：
```
P1 需求编写
    └── 创建 Worktree: feature/{需求名称}

P2-P13 在 Worktree 中工作
    └── 各阶段产出物提交到 Worktree 分支

P14 部署上线前
    ├── 代码合并到主分支
    └── 删除 Worktree

P15-P16 在主仓库完成
    └── 维基更新不需要代码隔离
```

**核心目标**：
- P1 阶段自动创建 Worktree
- Worktree 自动复制环境文件、执行初始化命令
- P14 代码合并后自动删除 Worktree

### 技术方案
> 来源：P3-技术方案.md#M004：Worktree 生命周期

**生命周期状态机**：
```
[*] --> Creating: P1 需求创建
Creating --> Active: 创建成功
Creating --> Error: 创建失败
Active --> Merging: P14 代码合并
Merging --> Cleaning: 合并成功
Merging --> Active: 合并失败，继续开发
Cleaning --> [*]: Worktree 删除
Error --> [*]: 人工处理
```

### 相关代码

已完成的依赖模块：
- `001-Hook自动注入.md` - Story 001 完成（.ideal/.current-task 机制）

## 任务清单

### T004-1：创建 worktree.yaml 配置
- [ ] 创建 `.ideal/worktree.yaml` 文件
- [ ] 定义 worktree_dir 配置（默认 `../ideal-worktrees`）
- [ ] 定义 copy 文件列表（.env, .ideal/.developer）
- [ ] 定义 post_create 命令列表（pnpm install --frozen-lockfile）
- [ ] 定义 verify 命令列表（pnpm lint, pnpm typecheck, pnpm test）
- [ ] 添加配置说明注释

**配置示例**：
```yaml
# Worktree 存储目录（相对于项目根目录）
worktree_dir: ../ideal-worktrees

# 需要复制到 Worktree 的环境文件
copy:
  - .env
  - .ideal/.developer

# Worktree 创建后执行的初始化命令
post_create:
  - pnpm install --frozen-lockfile

# 验证命令（Ralph Loop 使用）
verify:
  - pnpm lint
  - pnpm typecheck
  - pnpm test
```

**验证标准**：
- YAML 格式正确
- 配置项完整
- 包含说明注释

### T004-2：实现 worktree-create.sh
- [ ] 创建 `.claude/scripts/worktree-create.sh` 文件
- [ ] 解析需求名称参数（$1）
- [ ] 读取 worktree.yaml 配置（使用简单解析或 yq）
- [ ] 检查 Worktree 是否已存在
- [ ] 执行 `git worktree add` 创建 Worktree
- [ ] 复制 copy 列表中的环境文件
- [ ] 执行 post_create 命令列表
- [ ] 写入 `.ideal/.current-task` 文件
- [ ] 添加错误处理和提示

**核心逻辑**：
```bash
#!/bin/bash
set -e

REQUIREMENT_NAME=$1
WORKTREE_DIR=$(cat .ideal/worktree.yaml | grep "worktree_dir:" | cut -d' ' -f2)
WORKTREE_PATH="$WORKTREE_DIR/feature/$REQUIREMENT_NAME"

# 1. 检查是否已存在
if [ -d "$WORKTREE_PATH" ]; then
    echo "Worktree already exists: $WORKTREE_PATH"
    exit 1
fi

# 2. 创建 Worktree
git worktree add "$WORKTREE_PATH" -b "feature/$REQUIREMENT_NAME"

# 3. 复制环境文件
for file in $(cat .ideal/worktree.yaml | grep "^  - " | cut -d'-' -f2-); do
    cp "$file" "$WORKTREE_PATH/"
done

# 4. 执行初始化命令
cd "$WORKTREE_PATH"
for cmd in $(cat .ideal/worktree.yaml | grep "^  - pnpm" | cut -d'-' -f2-); do
    eval "$cmd"
done

# 5. 写入 .current-task
echo "docs/迭代/$REQUIREMENT_NAME" > .ideal/.current-task

echo "Worktree created: $WORKTREE_PATH"
```

**验证标准**：
- 测试：Worktree 创建成功
- 测试：环境文件正确复制
- 测试：.current-task 正确写入
- 测试：Worktree 已存在时正确提示

### T004-3：实现 worktree-remove.sh
- [ ] 创建 `.claude/scripts/worktree-remove.sh` 文件
- [ ] 解析需求名称参数（$1）
- [ ] 确认代码已合并（`git log main..feature/{name} --oneline`）
- [ ] 检查是否有未提交的变更
- [ ] 执行 `git worktree remove`
- [ ] 可选删除分支（`git branch -d`）
- [ ] 添加错误处理和提示

**核心逻辑**：
```bash
#!/bin/bash
set -e

REQUIREMENT_NAME=$1
WORKTREE_DIR=$(cat .ideal/worktree.yaml | grep "worktree_dir:" | cut -d' ' -f2)
WORKTREE_PATH="$WORKTREE_DIR/feature/$REQUIREMENT_NAME"
BRANCH_NAME="feature/$REQUIREMENT_NAME"

# 1. 检查 Worktree 是否存在
if [ ! -d "$WORKTREE_PATH" ]; then
    echo "Worktree not found: $WORKTREE_PATH"
    exit 1
fi

# 2. 确认代码已合并
UNMERGED=$(git log main..$BRANCH_NAME --oneline 2>/dev/null | wc -l)
if [ "$UNMERGED" -gt 0 ]; then
    echo "Warning: $UNMERGED commits not merged to main"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 3. 删除 Worktree
git worktree remove "$WORKTREE_PATH"

# 4. 可选删除分支
read -p "Delete branch $BRANCH_NAME? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git branch -d "$BRANCH_NAME"
fi

echo "Worktree removed: $WORKTREE_PATH"
```

**验证标准**：
- 测试：Worktree 正确删除
- 测试：代码未合并时提示用户
- 测试：分支可选删除

### T004-4：更新 dev.md Agent
- [ ] 读取现有 `.claude/agents/dev.md` 文件
- [ ] 添加 Worktree 调度职责说明
- [ ] 说明 implement/check/debug 调用顺序
- [ ] 更新"被调用阶段"说明（P9）
- [ ] 保持现有内容兼容

**添加内容**：
```markdown
## 调度职责

在 P9 开发执行阶段，负责调度子 Agent：

1. 调用 **implement Agent** - 实现代码
2. 调用 **check Agent** - 检查代码（Ralph Loop 控制）
3. 如检查失败，调用 **debug Agent** - 调试修复

## Worktree 管理

在 Worktree 隔离环境中工作：
- Worktree 由 P1 阶段自动创建
- 代码在隔离目录中开发
- P14 代码合并后删除 Worktree
```

**验证标准**：
- dev.md 包含新的调度职责
- 与现有内容兼容
- 格式正确

### T004-5：集成到 ideal-requirement
- [ ] 读取 `.claude/skills/ideal-requirement/SKILL.md`
- [ ] 在 Step 6（生成文档）后添加 Step 7
- [ ] 添加 Worktree 创建调用
- [ ] 更新 Skill 文档说明
- [ ] 添加错误处理

**添加的 Step 7**：
```markdown
### Step 7: 创建 Worktree（P1 阶段）

需求文档生成后，自动创建 Worktree 实现需求隔离：

1. 调用 worktree-create.sh 脚本
2. 传入需求名称
3. 验证 Worktree 创建成功
4. 更新 .current-task 文件

**执行命令**：
```bash
./.claude/scripts/worktree-create.sh "{需求名称}"
```

**错误处理**：
- Worktree 已存在：提示用户，跳过创建
- 创建失败：记录错误，不阻止需求文档生成
```

**验证标准**：
- P1 需求创建时自动创建 Worktree
- .current-task 正确指向需求目录
- 错误处理完善

## 验收标准

### 功能验收
- [ ] worktree.yaml 配置完整
- [ ] worktree-create.sh 可正确创建 Worktree
- [ ] worktree-remove.sh 可正确删除 Worktree
- [ ] dev.md Agent 职责更新完整
- [ ] ideal-requirement 集成正确

### 代码质量
- [ ] Shell 脚本有完整注释
- [ ] 错误处理完善
- [ ] 无 Shell 语法错误

## 实现笔记

<!-- 由 Claude 在执行过程中填写 -->
