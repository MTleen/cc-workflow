#!/bin/bash
#
# 错误钩子 - 发生错误时调用
#
# 参数：
#   $1 - 状态文件路径
#   $2 - 日志目录路径
#

STATE_FILE="$1"
LOG_DIR="$2"
ERROR_LOG="$LOG_DIR/error.log"

log() {
    echo "[ON-ERROR] $1"
}

# 记录错误信息
log_error_info() {
    local timestamp=$(date -Iseconds)
    {
        echo "=== 错误报告 ==="
        echo "时间: $timestamp"
        echo "状态文件: $STATE_FILE"
        echo "迭代次数: ${ITERATION_COUNT:-unknown}"
        echo "---"
    } >> "$ERROR_LOG"

    log "错误信息已记录到: $ERROR_LOG"
}

# 尝试恢复状态
attempt_recovery() {
    if [[ -f "$STATE_FILE.bak" ]]; then
        log "检测到备份状态文件"
        # 不自动恢复，保留备份供用户检查
        log "备份文件保留在: $STATE_FILE.bak"
    fi
}

# 生成错误报告
generate_error_report() {
    local report_file="$LOG_DIR/error-report.log"
    local timestamp=$(date -Iseconds)

    {
        echo "# YOLO 执行错误报告"
        echo ""
        echo "## 错误时间"
        echo "$timestamp"
        echo ""
        echo "## 恢复建议"
        echo "1. 检查 $ERROR_LOG 获取详细错误信息"
        echo "2. 检查 $STATE_FILE.bak 备份状态文件"
        echo "3. 使用 resume_yolo 恢复执行"
        echo "4. 或使用 reset_yolo 重置状态"
        echo ""
        echo "## 状态文件内容"
        if [[ -f "$STATE_FILE" ]]; then
            cat "$STATE_FILE"
        else
            echo "(状态文件不存在)"
        fi
    } > "$report_file"

    log "错误报告已生成: $report_file"
}

main() {
    log "错误钩子启动"

    log_error_info
    attempt_recovery
    generate_error_report

    log "错误钩子完成"
}

main
