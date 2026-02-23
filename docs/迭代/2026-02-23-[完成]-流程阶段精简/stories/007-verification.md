---
story_id: 007
title: 验证检查
status: pending
depends_on: [006]
---

# Story 007: 验证检查

## 上下文

### 需求来源
> 来源：P1-需求文档.md#八、验收标准

### 功能验收
- [ ] 所有文件中 P13-P16 的引用已更新为 P13-P15
- [ ] flow-state-spec.md 中的阶段定义已更新
- [ ] CLAUDE.md 中的阶段描述已更新
- [ ] README.md 中的流程图和表格已更新
- [ ] ideal-wiki SKILL.md 中的阶段引用已更新
- [ ] 所有 Wiki 文档中的阶段引用已更新
- [ ] 脚本文件中的阶段逻辑已更新
- [ ] 新增 P15 成果提交阶段的定义已完整

### 技术方案
> 来源：P3-技术方案.md#6.2 风险应对策略

**文档遗漏应对**:
1. 使用 Grep 全局搜索 `P13|P14|P15|P16|16 阶段|十六阶段`
2. 排除 `node_modules/`、`build/` 等构建产物目录
3. 逐个文件确认是否需要更新

### 相关代码

依赖所有前置 Story 完成。

## 任务清单

- [ ] 任务 1: 全局搜索验证 (无 P16 引用)
- [ ] 任务 2: 验证 "16 阶段" 引用已全部更新
- [ ] 任务 3: 功能验证 (流程状态模板、阶段流转)

## 验收标准

### 功能验收
- [ ] `grep -r "P16"` 仅返回当前迭代文档
- [ ] `grep -r "16 阶段"` 无结果
- [ ] 流程状态模板生成功能正常
- [ ] 阶段引用全部正确

### 质量验收
- [ ] 验证检查清单全部通过
- [ ] 无遗漏的旧阶段引用

## 验证命令

```bash
# 检查 P16 引用
grep -r "P16" . --exclude-dir=node_modules --exclude-dir=build --exclude-dir=.git

# 检查 16 阶段引用
grep -r "16 阶段\|十六阶段" . --exclude-dir=node_modules --exclude-dir=build --exclude-dir=.git

# 检查 P15 引用是否正确
grep -r "P15" . --exclude-dir=node_modules --exclude-dir=build --exclude-dir=.git
```

## 实现笔记

<!-- 由 Claude 在执行过程中填写 -->
