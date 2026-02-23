---
story_id: 009
title: Config 命令
status: completed
depends_on: [005, 007]
---

# Story 009: Config 命令

## 上下文

### 需求来源
> 来源：P1-需求文档.md#三、功能需求

F002 ideal config：查看/修改项目配置

### 技术方案
> 来源：P3-技术方案.md#三、功能模块设计

**子命令设计**：

| 命令 | 功能 | 参数 |
|------|------|------|
| `config list` | 显示所有配置 | 无 |
| `config get <key>` | 获取指定配置 | key: 配置键名 |
| `config set <key> <value>` | 设置配置值 | key, value |

**配置存储位置**：`.claude/project-config.md`

### 相关代码

已完成的模块：
- `src/services/config-manager.ts` - 配置管理器（Story 005）
- `src/commands/index.ts` - 命令注册（Story 007）

## 任务清单

- [x] M024-1: 实现 ConfigCommand 类
  - [x] 创建 src/commands/config.ts
  - [x] 实现 ConfigCommand 类
  - [x] 注册 ideal config 命令
- [x] M024-2: 实现 list 子命令
  - [x] 实现 config list
  - [x] 读取配置文件
  - [x] 格式化输出（表格形式）
- [x] M024-3: 实现 get 子命令
  - [x] 实现 config get <key>
  - [x] 支持嵌套键名（如 workflow.templateRepo）
  - [x] 输出配置值
- [x] M024-4: 实现 set 子命令
  - [x] 实现 config set <key> <value>
  - [x] 校验配置值
  - [x] 写入配置文件

## 验收标准

### 功能验收
- [x] `ideal config list` 输出所有配置项
- [x] `ideal config get projectName` 输出项目名称
- [x] `ideal config set gitBranch develop` 正确更新配置
- [x] 嵌套键名正确解析
- [x] 配置文件不存在时提示错误

### 代码质量
- [x] 配置格式化输出美观
- [x] 错误处理完善
- [x] 类型定义完整

## 实现笔记

**完成时间**: 2026-02-23

**已创建文件**:
- `src/commands/config.ts` - Config 命令实现

**验证结果**:
- TypeScript 类型检查: ✅ 通过
- 构建: ✅ 成功
- CLI 命令: ✅ 正常工作
