---
story_id: 011
title: Doctor 命令
status: completed
depends_on: [006, 007]
---

# Story 011: Doctor 命令

## 上下文

### 需求来源
> 来源：P1-需求文档.md#三、功能需求

F004 ideal doctor：检查工作流配置完整性和有效性

### 技术方案
> 来源：P3-技术方案.md#三、功能模块设计

**检查项清单**：

| 检查项 | 检查内容 | 级别 |
|--------|----------|------|
| directory-structure | 必需目录是否存在 | error |
| config-format | CLAUDE.md 格式是否正确 | error |
| project-config | project-config.md 是否存在 | warning |
| node-version | Node.js 版本 >= 18 | warning |
| python-version | Python 版本 >= 3.10 | info |
| version-compat | 模板版本与 CLI 兼容性 | warning |

**输出格式**：
```
✓ directory-structure: 目录结构完整
✓ config-format: 配置文件格式正确
⚠ python-version: Python 版本过低 (3.8 < 3.10)
✓ version-compat: 版本兼容

诊断结果: 3 项通过, 1 项警告
```

### 相关代码

已完成的模块：
- `src/utils/detector.ts` - 环境检测器（Story 006）
- `src/commands/index.ts` - 命令注册（Story 007）

## 任务清单

- [x] M026-1: 实现 DoctorCommand 类
  - [x] 创建 src/commands/doctor.ts
  - [x] 实现 DoctorCommand 类
  - [x] 注册 ideal doctor 命令
- [x] M026-2: 实现检查执行
  - [x] 实现 runChecks() 方法
  - [x] 调用 Detector.runAllChecks()
- [x] M026-3: 实现结果格式化
  - [x] 实现 formatResults() 方法
  - [x] 使用彩色符号（✓ ⚠ ✗）
  - [x] 按级别分组显示
- [x] M026-4: 实现摘要输出
  - [x] 统计 passed/warnings/errors
  - [x] 输出诊断结果摘要

## 验收标准

### 功能验收
- [x] `ideal doctor` 执行所有检查
- [x] 正确显示 ✓（通过）、⚠（警告）、✗（错误）
- [x] 摘要统计正确
- [x] 级别为 error 的失败时退出码为 1

### 代码质量
- [x] 输出格式美观
- [x] 颜色正确显示
- [x] 类型定义完整

## 实现笔记

**完成时间**: 2026-02-23

**已创建文件**:
- `src/commands/doctor.ts` - Doctor 命令实现
  - runChecks, formatResults, execute

**命令选项**:
- `ideal doctor` - 执行诊断检查
- `ideal doctor --verbose` - 详细输出

**验证结果**:
- TypeScript 类型检查: ✅ 通过
- 构建: ✅ 成功
- CLI 命令: ✅ 正常工作
