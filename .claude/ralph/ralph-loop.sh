#!/bin/bash
#
# Ralph Loop - YOLO 模式自动化执行引擎
#
# 功能：
# - 循环调用 Claude Code 执行阶段任务
# - 检测完成信号和退出条件
# - 处理中断和恢复
# - 记录执行日志
#
# 用法：
#   ./ralph-loop.sh --state-file <path> --log-dir <path>
#

set -e

# 配置
RALPH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$RALPH_DIR/../.." && pwd)"
HOOKS_DIR="$RALPH_DIR/hooks"
MAX_ITERATIONS=100
ITERATION_DELAY=5
TIMEOUT_SECONDS=600

# 状态
ITERATION_COUNT=0
START_TIME=$(date +%s)
LAST_UPDATE_TIME=$START_TIME

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[RALPH]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[RALPH WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[RALPH ERROR]${NC} $1"
}

# 解析参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --state-file)
                STATE_FILE="$2"
                shift 2
                ;;
            --log-dir)
                LOG_DIR="$2"
                shift 2
                ;;
            --max-iterations)
                MAX_ITERATIONS="$2"
                shift 2
                ;;
            --timeout)
                TIMEOUT_SECONDS="$2"
                shift 2
                ;;
            *)
                log_error "未知参数: $1"
                exit 1
                ;;
        esac
    done

    # 默认值
    STATE_FILE="${STATE_FILE:-$PROJECT_ROOT/docs/迭代/default/流程状态.md}"
    LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/docs/迭代/default/yolo-logs}"
}

# 检查前置条件
check_prerequisites() {
    if [[ ! -f "$STATE_FILE" ]]; then
        log_error "状态文件不存在: $STATE_FILE"
        exit 1
    fi

    mkdir -p "$LOG_DIR"
    mkdir -p "$HOOKS_DIR"
}

# 执行钩子
run_hook() {
    local hook_name=$1
    local hook_script="$HOOKS_DIR/${hook_name}.sh"

    if [[ -x "$hook_script" ]]; then
        log_info "执行钩子: $hook_name"
        "$hook_script" "$STATE_FILE" "$LOG_DIR" || true
    fi
}

# 检查退出条件
check_exit_conditions() {
    # 检查完成信号
    if grep -q "EXIT_SIGNAL" "$LOG_DIR/.ralph_control" 2>/dev/null; then
        log_info "检测到退出信号"
        return 0  # 应该退出
    fi

    # 检查熔断状态
    if grep -q "circuit_breaker.*triggered.*true" "$STATE_FILE" 2>/dev/null; then
        log_warn "熔断器已触发，暂停执行"
        return 0  # 应该退出
    fi

    # 检查状态是否为 completed
    if grep -q "status.*completed" "$STATE_FILE" 2>/dev/null; then
        log_info "YOLO 模式已完成"
        return 0  # 应该退出
    fi

    # 检查超时
    local current_time=$(date +%s)
    local elapsed=$((current_time - LAST_UPDATE_TIME))
    if [[ $elapsed -gt $TIMEOUT_SECONDS ]]; then
        log_warn "执行超时: ${elapsed}秒未更新"
        return 0  # 应该退出
    fi

    return 1  # 继续执行
}

# 检查完成指示器
check_completion_indicators() {
    # 检查是否所有阶段完成
    if grep -q "current_phase.*P15\|status.*completed" "$STATE_FILE" 2>/dev/null; then
        log_info "检测到完成指示器"
        return 0
    fi

    # 检查 PROMPT.md 中的完成标记
    if [[ -f "$RALPH_DIR/PROMPT.md" ]]; then
        if grep -q "<!-- COMPLETED -->" "$RALPH_DIR/PROMPT.md" 2>/dev/null; then
            log_info "检测到完成标记"
            return 0
        fi
    fi

    return 1
}

# 生成执行提示
generate_prompt() {
    local prompt_file="$RALPH_DIR/PROMPT.md"

    # 调用 Python 脚本生成 PROMPT
    python3 "$RALPH_DIR/../skills/ideal-yolo/scripts/yolo_ralph.py" \
        --state-file "$STATE_FILE" \
        --output "$prompt_file" \
        --action generate_prompt \
        2>/dev/null || true

    # 如果生成失败，使用模板
    if [[ ! -f "$prompt_file" ]]; then
        cat > "$prompt_file" << 'PROMPT_EOF'
# YOLO 模式执行提示

你正在 YOLO 模式下执行自动化工作流。

## 当前任务

请继续执行当前阶段，完成后更新流程状态文件。

## 完成信号

任务完成后，在输出中包含 `<!-- COMPLETED -->` 标记。

PROMPT_EOF
    fi
}

# 执行单次迭代
execute_iteration() {
    log_info "开始迭代 #$ITERATION_COUNT"

    # 前置钩子
    run_hook "pre-phase"

    # 生成提示
    generate_prompt

    # 记录开始时间
    local iter_start=$(date +%s)

    # 调用 Claude Code (这里只是占位，实际由外部调用)
    # 在实际使用中，这个脚本会被 Claude Code 本身调用
    # 所以这里只是更新状态

    # 更新最后更新时间
    LAST_UPDATE_TIME=$(date +%s)

    # 后置钩子
    run_hook "post-phase"

    # 计算耗时
    local iter_end=$(date +%s)
    local duration=$((iter_end - iter_start))
    log_info "迭代完成，耗时 ${duration}秒"
}

# 主循环
main() {
    parse_args "$@"
    check_prerequisites

    log_info "Ralph Loop 启动"
    log_info "状态文件: $STATE_FILE"
    log_info "日志目录: $LOG_DIR"
    log_info "最大迭代次数: $MAX_ITERATIONS"

    # 创建控制文件
    touch "$LOG_DIR/.ralph_control"

    while [[ $ITERATION_COUNT -lt $MAX_ITERATIONS ]]; do
        ITERATION_COUNT=$((ITERATION_COUNT + 1))

        # 检查退出条件
        if check_exit_conditions; then
            break
        fi

        # 检查完成指示器
        if check_completion_indicators; then
            log_info "任务完成"
            break
        fi

        # 执行迭代
        execute_iteration

        # 延迟
        sleep $ITERATION_DELAY
    done

    # 最终钩子
    run_hook "on-complete"

    # 计算总耗时
    local end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))
    log_info "Ralph Loop 结束，总耗时 ${total_duration}秒，共 ${ITERATION_COUNT} 次迭代"

    # 清理控制文件
    rm -f "$LOG_DIR/.ralph_control"
}

# 错误处理
trap 'log_error "脚本被中断"; run_hook "on-error"; exit 130' INT TERM

# 执行
main "$@"
