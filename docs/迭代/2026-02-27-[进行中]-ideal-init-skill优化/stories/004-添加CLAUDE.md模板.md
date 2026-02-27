---
story_id: 004
title: 添加 CLAUDE.md 模板
status: pending
depends_on: [002, 003]
---

# Story 004: 添加 CLAUDE.md 模板

## 上下文

### 需求来源
> 来源：P1-需求文档.md#三、重构方案 > 3.4.5 Step 5: 追加 CLAUDE.md

**处理方式**：追加模式（保留原有内容）

**追加内容模板**：

```markdown
---

## CC-Workflow 工作流集成

本项目已接入 CC-Workflow 工作流体系，实现从需求到上线的全流程自动化。

### 初始化信息

- **初始化时间**：{timestamp}
- **工作流版本**：{version}

### 工作流使用

| 命令 | 说明 |
|------|------|
| `/ideal-requirement` | 开始新需求（P1） |
| `/ideal-init` | 重新初始化项目配置 |
| `ideal status` | 查看当前流程状态 |

### 相关文档

- [项目配置](.claude/project-config.md)
- [流程状态](docs/项目状态.md)
```

### 技术方案
> 来源：P3-技术方案.md#3.2 模块详细设计 > M5: CLAUDE.md 追加

**处理逻辑**：
1. 检查 `CLAUDE.md` 是否存在
   - 不存在： 创建完整文件
   - 存在: 检查是否已包含工作流说明
     - 已包含: 询问是否更新
     - 未包含: 追加内容
2. 读取 `references/templates/CLAUDE.md.appendix.md`
3. 填充时间戳和版本信息
4. 追加到文件末尾

## 任务清单

- [ ] 任务 1: 创建 templates/CLAUDE.md.appendix.md
  - [ ] 定义追加内容结构
  - [ ] 添加 {timestamp} 和 {version} 占位符
- [ ] 任务 2: 创建 templates/CLAUDE.md.full.tmpl（可选）
  - [ ] 用于 CLAUDE.md 不存在的情况
  - [ ] 包含完整的项目指令模板
- [ ] 任务 3: 更新 SKILL.md 引用模板
  - [ ] 在 References 表格中添加新模板

## 验收标准

### 功能验收
- [ ] CLAUDE.md.appendix.md 文件存在
- [ ] 包含完整的追加内容结构
- [ ] 包含 {timestamp} 和 {version} 占位符
- [ ] SKILL.md References 表格已更新

### 代码质量
- [ ] Markdown 格式正确
- [ ] 占位符命名一致

## 实现笔记

<!-- 由 Claude 在执行过程中填写 -->
