# ideal-init Skill 设计文档

## 概述

`ideal-init` 是 CC-Workflow 的项目初始化 Skill，用于：
- **新项目初始化**：在空目录中创建工作流结构
- **老项目迁移**：检测现有结构，增量添加工作流组件

## 核心特性

1. **分级配置架构**：全局 agents/skills + 项目级配置
2. **智能探测**：自动识别项目类型、语言、框架
3. **远程安装**：从 Gitea 仓库安装/更新 agents 和 skills
4. **冲突处理**：运行时让用户决定每个冲突文件的处理方式

## 目录结构

```
.claude/skills/ideal-init/
├── SKILL.md                          # Skill 主文件
├── scripts/
│   └── init.py                       # 初始化脚本
└── references/
    ├── templates/
    │   ├── CLAUDE.md.tmpl            # 项目指令模板
    │   ├── project-config.md.tmpl    # 项目配置模板
    │   └── flow-status.md.tmpl       # 流程状态模板
    └── detection-rules.md            # 项目类型探测规则说明
```

## 配置层级

### 全局配置（用户级）

```
~/.claude/
├── agents/                       # 全局 agents
│   ├── analyst.md
│   ├── pm.md
│   ├── architect.md
│   ├── dev.md
│   ├── qa.md
│   └── tech-writer.md
├── skills/                       # 全局 skills
│   ├── ideal-requirement/
│   ├── ideal-dev-solution/
│   ├── ideal-dev-plan/
│   ├── ideal-test-case/
│   ├── ideal-dev-exec/
│   ├── ideal-code-review/
│   ├── ideal-test-exec/
│   ├── ideal-wiki/
│   ├── ideal-flow-control/
│   └── ideal-debugging/
└── config.yaml                   # 全局配置（含仓库地址和版本信息）
```

### 项目配置（项目级）

```
{target-project}/
├── .claude/
│   └── project-config.md         # 项目特定配置（必需）
│
├── docs/
│   ├── Wiki/
│   │   ├── 用户文档/
│   │   ├── 开发文档/
│   │   └── 接口文档/
│   ├── 迭代/
│   └── 项目状态.md
│
└── CLAUDE.md                     # 项目指令文件
```

**说明**：agents/ 和 skills/ 默认使用全局配置，项目级 `.claude/` 只保留 `project-config.md`。

## 全局配置文件格式

`~/.claude/config.yaml`：

```yaml
registry:
  agents_repo: "https://gitea.example.com/cc-workflow/agents.git"
  skills_repo: "https://gitea.example.com/cc-workflow/skills.git"

installed:
  agents:
    analyst: "1.0.0"
    pm: "1.0.0"
    architect: "1.0.0"
    dev: "1.0.0"
    qa: "1.0.0"
    tech-writer: "1.0.0"
  skills:
    ideal-requirement: "1.0.0"
    ideal-dev-solution: "1.0.0"
    ideal-dev-plan: "1.0.0"
    ideal-test-case: "1.0.0"
    ideal-dev-exec: "1.0.0"
    ideal-code-review: "1.0.0"
    ideal-test-exec: "1.0.0"
    ideal-wiki: "1.0.0"
    ideal-flow-control: "1.0.0"
    ideal-debugging: "1.0.0"
```

## 核心流程

```
┌─────────────────────┐
│   用户触发 init      │
│   /ideal-init       │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ 1. 确认目标路径      │  ← 默认当前目录，可指定其他路径
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ 2. 检查全局配置      │  ← 查看 ~/.claude/ 中是否已有 cc-workflow 的 agents 和 skills
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ 3. 安装/更新全局资源  │  ← 不存在则安装，存在则检查版本并更新到最新
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ 4. 探测项目信息      │  ← 检测语言、框架、Git 状态等
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ 5. 用户确认/修正     │  ← 展示探测结果，用户可修改
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ 6. 扫描已有结构      │  ← 检测哪些文件已存在
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ 7. 处理冲突文件      │  ← 逐个询问用户：跳过/覆盖/合并
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ 8. 生成项目结构      │  ← 创建目录、写入模板
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ 9. 输出初始化报告    │  ← 列出创建的文件和后续步骤
└─────────────────────┘
```

## 探测规则

探测规则定义在 `references/detection-rules.md` 中，作为 Claude 的指导文档。

### 探测内容

| 探测项 | 检测方式 | 用途 |
|--------|----------|------|
| 项目名称 | 目录名或 Git 仓库名 | 填充 project-config.md |
| 语言类型 | 检测特征文件（package.json/requirements.txt/go.mod 等） | 选择合适的命令模板 |
| 框架 | 解析依赖文件中的框架特征 | 填充技术栈信息 |
| Git 状态 | 检测 .git 目录、远程仓库、分支策略 | 填充 Git 配置 |
| 测试命令 | 根据项目类型推断或读取配置 | 填充执行配置 |
| 构建命令 | 根据项目类型推断或读取配置 | 填充执行配置 |

### 支持的项目类型

- Node.js（React/Vue/Next.js/Express 等）
- Python（Django/Flask/FastAPI 等）
- Go
- Java（Spring Boot 等）
- 其他（通用模板）

## 冲突处理

当目标路径已存在文件时，逐个询问用户：

| 选项 | 说明 |
|------|------|
| 跳过 | 保留现有文件，不进行任何修改 |
| 覆盖 | 用新模板替换现有文件 |
| 合并 | 尝试合并内容（仅适用于特定文件类型） |
| 查看差异 | 显示现有文件与新模板的差异后再决定 |

## 输出报告

初始化完成后输出：

```
✓ CC-Workflow 初始化完成

全局配置：
  ✓ agents 已更新到最新版本 (v1.0.0)
  ✓ skills 已更新到最新版本 (v1.0.0)

项目结构：
  ✓ 创建 .claude/project-config.md
  ✓ 创建 docs/Wiki/
  ✓ 创建 docs/迭代/
  ✓ 创建 docs/项目状态.md
  ○ CLAUDE.md 已存在，已跳过

探测结果：
  项目名称: my-project
  语言: TypeScript
  框架: React
  测试命令: npm test
  构建命令: npm run build

后续步骤：
  1. 检查 .claude/project-config.md 确认配置正确
  2. 运行 /ideal-requirement 开始第一个需求
```

## 触发条件

```
用户说：
- "初始化项目"
- "初始化这个项目到 CC-Workflow"
- "把这个项目接入工作流"
- "/ideal-init"
```

## 与其他 Skill 的关系

| 关联 Skill | 关系 |
|------------|------|
| ideal-requirement | init 完成后，用户通常从此开始第一个需求 |
| ideal-flow-control | init 创建的 `docs/项目状态.md` 是 flow-control 的管理对象 |
| ideal-dev-solution | init 生成的 `project-config.md` 会被 dev-solution 读取 |

## 实现优先级

1. **P0 - 核心功能**
   - 全局配置检查与远程安装
   - 项目探测与确认
   - 基础项目结构生成

2. **P1 - 增强功能**
   - 版本检查与自动更新
   - 冲突文件智能合并
   - 详细差异对比

3. **P2 - 可选功能**
   - 离线模式（使用本地缓存）
   - 自定义模板覆盖
   - 多项目批量初始化
