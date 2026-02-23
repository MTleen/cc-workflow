---
story_id: "003"
title: "Ralph Loop 质量控制（M002）"
status: pending
depends_on: ["001"]
---

# Story 003: Ralph Loop 质量控制

## 上下文

### 需求来源
> 来源：P1-需求文档.md#F005：Ralph Loop 质量控制

**触发时机**：SubagentStop - 子 Agent 尝试停止时

**核心逻辑**：
1. 检查 worktree.yaml 的 verify 命令配置
2. 执行验证命令（pnpm lint、pnpm typecheck、pnpm test）
3. 全部通过 → 允许停止
4. 任一失败 → 阻止停止，要求继续修复
5. 最多 5 次循环，防止无限循环

### 技术方案
> 来源：P3-技术方案.md#M002：Ralph Loop 质量控制

**触发时机**：SubagentStop - Check Agent 尝试停止时

**核心流程**：
```
Check Agent 尝试停止
        ↓
  Ralph Loop 触发
        ↓
   有 verify 配置?
   ├─ Yes → 执行验证命令
   │       ├─ All pass → Allow stop
   │       └─ Any fail → Block stop, continue fixing
   └─ No → Check completion markers
```

**配置示例**：
```yaml
# .ideal/worktree.yaml
verify:
  - pnpm lint
  - pnpm typecheck
  - pnpm test
```

**参考实现**：Trellis 的 `ralph-loop.py`

### 相关代码

已完成的依赖模块：
- `001-Hook自动注入.md` - Story 001 完成（.ideal/.current-task 机制）

## 任务清单

### T003-1：创建 verify-loop.py 基础框架
- [ ] 编写 main() 函数框架
- [ ] 实现 stdin JSON 读取
- [ ] 实现 SubagentStop 事件检测
- [ ] 实现 check agent 类型过滤（只拦截 check agent）
- [ ] 编写基础测试

**验证标准**：
- 测试：非 check agent 调用时直接放行
- 测试：check agent 调用时进入验证流程

### T003-2：实现 worktree.yaml 读取
- [ ] 实现 YAML 解析（不使用外部库，简单正则解析）
- [ ] 实现 get_verify_commands() 函数
- [ ] 提取 verify 命令列表
- [ ] 处理配置不存在的情况（返回空列表）

**验证标准**：
- 测试：正确提取 verify 命令列表
- 测试：配置不存在时返回空列表
- 测试：YAML 格式错误时返回空列表

### T003-3：实现验证命令执行
- [ ] 实现 run_verify_commands() 函数
- [ ] 使用 subprocess.run 执行 shell 命令
- [ ] 实现 120 秒超时（subprocess.TimeoutExpired）
- [ ] 收集 stdout/stderr 错误信息
- [ ] 截断过长的输出（最大 500 字符）

**验证标准**：
- 测试：全部命令通过返回 (True, "All verify commands passed")
- 测试：任一命令失败返回 (False, 错误信息)
- 测试：命令超时返回 (False, timeout 信息)

### T003-4：实现循环状态管理
- [ ] 定义 VerifyState 数据结构（task, iteration, started_at）
- [ ] 实现 load_state() 函数（从 .ideal/.verify-state.json 读取）
- [ ] 实现 save_state() 函数（保存到 .ideal/.verify-state.json）
- [ ] 实现循环次数递增逻辑
- [ ] 实现 30 分钟超时检测（比较 started_at 与当前时间）

**验证标准**：
- 测试：状态文件正确保存和读取
- 测试：循环次数正确递增
- 测试：超过 30 分钟时检测到超时

### T003-5：实现决策输出
- [ ] 实现验证通过时的 allow 决策
- [ ] 实现验证失败且未达上限时的 block 决策
- [ ] 实现达到上限（5 次）时的 allow 决策 + 警告
- [ ] 实现超时（30 分钟）时的 allow 决策 + 警告
- [ ] 生成详细的错误原因说明

**决策逻辑**：
```python
if passed:
    return {"decision": "allow", "reason": "All verify commands passed"}
elif iteration >= MAX_ITERATIONS:
    return {"decision": "allow", "reason": f"Max iterations ({MAX_ITERATIONS}) reached"}
elif timeout:
    return {"decision": "allow", "reason": f"Timeout ({TIMEOUT_MINUTES} min) exceeded"}
else:
    return {"decision": "block", "reason": f"Verification failed (iteration {iteration}): {message}"}
```

**验证标准**：
- 测试：验证通过时返回 allow
- 测试：验证失败且未达上限时返回 block
- 测试：达到上限时返回 allow + 警告

## 验收标准

### 功能验收
- [ ] verify-loop.py 可正确拦截 Check Agent 停止请求
- [ ] 可读取 worktree.yaml 的 verify 命令
- [ ] 可执行验证命令并收集结果
- [ ] 循环状态正确保存和读取
- [ ] 决策输出符合 Claude Code Hook 规范

### 代码质量
- [ ] 包含单元测试
- [ ] 代码有完整注释
- [ ] 异常处理完善
- [ ] 无 Python 语法错误

## 实现笔记

<!-- 由 Claude 在执行过程中填写 -->
