---
story_id: 008
title: Init 命令
status: completed
depends_on: [004, 005, 006, 007]
---

# Story 008: Init 命令

## 上下文

### 需求来源
> 来源：P1-需求文档.md#三、功能需求

F001 ideal init：交互式引导创建目录结构、复制 agents/skills、生成配置文件

### 技术方案
> 来源：P3-技术方案.md#三、功能模块设计

**执行流程**：
1. 检测现有配置
2. 拉取远程模板
3. 交互式引导
4. 创建目录结构
5. 应用模板文件
6. 生成配置文件
7. 输出完成提示

**交互配置项**：

| 配置项 | 类型 | 默认值 | 必填 |
|--------|------|--------|------|
| projectName | string | 当前目录名 | 是 |
| gitBranch | string | main | 否 |
| techStack | select | Node.js | 否 |
| createExample | confirm | false | 否 |

### 相关代码

已完成的模块：
- `src/services/template-manager.ts` - 模板管理器（Story 004）
- `src/services/config-manager.ts` - 配置管理器（Story 005）
- `src/utils/detector.ts` - 环境检测器（Story 006）
- `src/commands/index.ts` - 命令注册（Story 007）

## 任务清单

- [x] M023-1: 实现 InitCommand 类
  - [x] 创建 src/commands/init.ts
  - [x] 实现 InitCommand 类
  - [x] 注册 ideal init 命令
  - [x] 配置命令选项
- [x] M023-2: 实现配置检测
  - [x] 实现 detectExistingConfig() 方法
  - [x] 检查 .claude/ 目录是否存在
  - [x] 处理覆盖确认（交互式）
- [x] M023-3: 实现交互式引导
  - [x] 实现 promptConfig() 方法
  - [x] 使用 Inquirer.js
  - [x] 支持默认值（回车确认）
  - [x] 支持跳过可选项
- [x] M023-4: 实现目录创建
  - [x] 实现 createDirectoryStructure() 方法
  - [x] 创建 .claude/agents/
  - [x] 创建 .claude/skills/
  - [x] 创建 docs/迭代/
  - [x] 创建 docs/Wiki/
- [x] M023-5: 实现模板应用
  - [x] 实现 applyTemplate() 方法
  - [x] 调用 TemplateManager.applyTemplate()
  - [x] 处理模板变量替换
  - [x] 写入元数据文件
- [x] M023-6: 实现完成提示
  - [x] 输出成功消息
  - [x] 输出目录结构说明
  - [x] 输出下一步指引

## 验收标准

### 功能验收
- [x] `ideal init` 启动交互式引导
- [x] 默认值可一键回车确认
- [x] 可选项目可跳过
- [x] 目录结构正确创建
- [x] 模板文件正确复制
- [x] 配置文件正确生成
- [x] 元数据文件正确生成
- [x] 已存在配置时提示覆盖确认

### 代码质量
- [x] 错误处理完善
- [x] 用户可随时 Ctrl+C 退出
- [x] 类型定义完整

## 实现笔记

**完成时间**: 2026-02-23

**已创建文件**:
- `src/commands/init.ts` - Init 命令实现

**验证结果**:
- TypeScript 类型检查: ✅ 通过
- 构建: ✅ 成功
- 测试: ✅ 216 个测试通过
- CLI 命令: ✅ 正常工作
