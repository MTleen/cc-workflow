---
story_id: 010
title: Update 命令
status: completed
depends_on: [004, 005, 007]
---

# Story 010: Update 命令

## 上下文

### 需求来源
> 来源：P1-需求文档.md#三、功能需求

F003 ideal update：更新 agents/skills 到最新版本，检测冲突并提示用户选择

### 技术方案
> 来源：P3-技术方案.md#三、功能模块设计

**冲突处理策略**：

| 选项 | 说明 |
|------|------|
| keep | 保留本地修改，跳过该文件 |
| overwrite | 使用远程版本覆盖本地 |
| merge | 尝试自动合并（简单场景） |
| abort | 中止更新操作 |

**更新流程**：
1. 检查远程版本
2. 对比本地文件哈希
3. 检测用户修改
4. 提示冲突处理
5. 备份、更新、写元数据

### 相关代码

已完成的模块：
- `src/services/template-manager.ts` - 模板管理器（Story 004）
- `src/services/diff-manager.ts` - 差异管理器（Story 005）
- `src/commands/index.ts` - 命令注册（Story 007）

## 任务清单

- [x] M025-1: 实现 UpdateCommand 类
  - [x] 创建 src/commands/update.ts
  - [x] 实现 UpdateCommand 类
  - [x] 注册 ideal update 命令
- [x] M025-2: 实现版本检查
  - [x] 实现 checkForUpdates() 方法
  - [x] 获取远程版本
  - [x] 对比本地版本
  - [x] 返回是否有更新
- [x] M025-3: 实现差异检测
  - [x] 实现 detectChanges() 方法
  - [x] 遍历所有模板文件
  - [x] 调用 DiffManager.compare()
  - [x] 返回变更列表
- [x] M025-4: 实现冲突处理
  - [x] 实现 handleConflicts() 方法
  - [x] 交互式选择处理策略
  - [x] 逐个文件处理冲突
- [x] M025-5: 实现更新执行
  - [x] 实现 executeUpdate() 方法
  - [x] 备份旧文件到 .claude/.backup/
  - [x] 下载并应用新模板
  - [x] 更新元数据文件

## 验收标准

### 功能验收
- [x] `ideal update` 检查远程版本
- [x] 无更新时提示已是最新
- [x] 有更新时显示变更列表
- [x] 冲突文件提示选择处理策略
- [x] 备份文件正确创建
- [x] 元数据正确更新

### 代码质量
- [x] 备份机制可靠
- [x] 错误处理完善
- [x] 类型定义完整

## 实现笔记

**完成时间**: 2026-02-23

**已创建文件**:
- `src/commands/update.ts` - Update 命令实现
  - checkForUpdates, detectChanges, handleConflicts
  - executeUpdate, createBackup, updateMetadata

**命令选项**:
- `ideal update` - 检查并更新
- `ideal update --verbose` - 详细输出
- `ideal update --force` - 强制更新（跳过冲突检查）

**验证结果**:
- TypeScript 类型检查: ✅ 通过
- 构建: ✅ 成功
