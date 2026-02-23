---
story_id: "001"
title: "Hook 自动注入（M001）"
status: pending
depends_on: []
---

# Story 001: Hook 自动注入

## 上下文

### 需求来源
> 来源：P1-需求文档.md#三、功能需求

**F001 子 Agent 调用机制**：使用 Task 工具实现真正的子 Agent 调用，替代注释扮演方式
**F003 Hook 自动注入**：PreToolUse Hook 在子 Agent 调用前自动注入上下文

**核心目标**：
- Skill 调用子 Agent 时使用 Task 工具而非注释扮演
- PreToolUse Hook 在子 Agent 调用前自动注入 jsonl 配置的上下文

### 技术方案
> 来源：P3-技术方案.md#M001：Hook 自动注入

**触发时机**：PreToolUse - Task 工具调用前

**核心逻辑**：
1. 检测 subagent_type（implement、check、debug、research）
2. 读取 `.current-task` 定位当前需求目录
3. 读取对应的 jsonl 文件
4. 注入所有文件内容到子 Agent 的 prompt

**参考实现**：Trellis 的 `inject-subagent-context.py`

### 相关代码

已完成的依赖模块：
- 无（本故事是基础设施）

## 任务清单

### T001-1：创建 inject-context.py 基础框架
- [ ] 编写 main() 函数框架
- [ ] 实现 stdin JSON 读取
- [ ] 实现工具名称检测（只拦截 Task）
- [ ] 编写单元测试验证拦截逻辑

**验证标准**：
- 测试：传入非 Task 工具调用，返回 sys.exit(0)
- 测试：传入 Task 工具调用，进入处理流程

### T001-2：实现 subagent_type 检测
- [ ] 从 tool_input 提取 subagent_type
- [ ] 定义支持的 agent 类型列表（implement/check/debug/research）
- [ ] 实现类型验证逻辑
- [ ] 编写测试用例

**验证标准**：
- 测试：传入 implement/check/debug/research，返回正确类型
- 测试：传入未知类型，返回默认处理

### T001-3：实现 .current-task 读取
- [ ] 定义 .current-task 文件格式（单行路径）
- [ ] 实现 find_repo_root() 函数（向上查找 .git）
- [ ] 实现 get_current_task() 函数
- [ ] 处理文件不存在的降级逻辑

**验证标准**：
- 测试：.current-task 存在时正确读取路径
- 测试：.current-task 不存在时返回 None

### T001-4：实现 jsonl 配置读取
- [ ] 定义 ContextEntry 数据结构（file, type, pattern, reason）
- [ ] 实现 read_jsonl_entries() 函数
- [ ] 支持文件和目录类型
- [ ] 处理 JSONL 解析错误（跳过无效行）

**验证标准**：
- 测试：正确解析有效 JSONL 文件
- 测试：跳过无效行并记录警告

### T001-5：实现上下文注入
- [ ] 实现 read_file_content() 函数
- [ ] 实现 read_directory_contents() 函数
- [ ] 实现 build_context() 函数（拼接文件内容）
- [ ] 实现 inject_to_prompt() 函数（插入到原始 prompt）
- [ ] 构建完整的输出 JSON
- [ ] 编写集成测试

**验证标准**：
- 测试：注入后的 prompt 包含所有配置文件内容
- 测试：输出 JSON 格式符合 Claude Code Hook 规范

### T001-6：创建 settings.json 配置
- [ ] 定义 hooks 配置结构
- [ ] 配置 PreToolUse 触发器
- [ ] 指定 inject-context.py 路径
- [ ] 编写配置说明文档

**验证标准**：
- Claude Code 启动时无 Hook 配置错误
- 调用 Task 工具时 Hook 被触发

## 验收标准

### 功能验收
- [ ] inject-context.py 可正确拦截 Task 工具调用
- [ ] 可读取 .current-task 文件定位当前需求
- [ ] 可读取 jsonl 配置文件
- [ ] 可注入上下文到子 Agent prompt
- [ ] settings.json 配置正确

### 代码质量
- [ ] 包含单元测试
- [ ] 代码有完整注释
- [ ] 异常处理完善（优雅降级）
- [ ] 无 Python 语法错误

## 实现笔记

<!-- 由 Claude 在执行过程中填写 -->
