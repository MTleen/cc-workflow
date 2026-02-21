---
title: 开发文档
description: CC-Workflow 开发文档 - 面向扩展工作流的开发者
sidebar_position: 1
tags: [开发, 扩展, 贡献]
---

# CC-Workflow 开发文档

## 简介

本节文档面向需要**扩展 CC-Workflow** 的开发者，包括：

- 理解 Skill + Agent 架构设计
- 开发自定义 Skill
- 开发自定义 Agent
- 参与项目贡献

**前置知识**：建议先阅读 [用户指南](../user-guide/index.md) 了解系统的基本概念和使用方式。

---

## 文档导航

| 文档 | 说明 | 读者 |
|------|------|------|
| [架构设计](./architecture.md) | Skill + Agent 混合架构详解 | 所有开发者 |
| [Skill 开发指南](./skill-development.md) | 如何开发自定义 Skill | Skill 开发者 |
| [Agent 开发指南](./agent-development.md) | 如何开发自定义 Agent | Agent 开发者 |
| [故事文件机制](./story-mechanism.md) | P5 生成 + P9 使用的机制 | 理解原理 |
| [流程状态控制](./flow-state.md) | 流程状态文件规范 | 流程定制 |
| [贡献指南](./contributing.md) | 如何参与项目贡献 | 贡献者 |

---

## 快速链接

- 🏗️ [架构设计](./architecture.md)
- 🔧 [Skill 开发指南](./skill-development.md)
- 👤 [Agent 开发指南](./agent-development.md)
- 📖 [贡献指南](./contributing.md)

---

## 扩展点

CC-Workflow 提供以下扩展点：

### 添加新 Skill

适用于需要定义新的流程阶段或工作流。

**场景示例**：
- 添加「代码审查」增强版
- 添加「性能测试」专用流程
- 添加「安全扫描」检查阶段

详见 [Skill 开发指南](./skill-development.md)。

### 添加新 Agent

适用于需要定义新的角色视角。

**场景示例**：
- 添加「DBA」角色用于数据库审核
- 添加「安全专家」角色用于安全评审
- 添加「运维」角色用于部署审核

详见 [Agent 开发指南](./agent-development.md)。

### 自定义模板

适用于需要定制输出文档格式。

**位置**：`references/templates/`

**修改方式**：直接编辑对应模板文件。
