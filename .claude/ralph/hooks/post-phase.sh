#!/bin/bash
#
# 后置钩子 - 阶段执行后调用
#
# 参数：
#   $1 - 状态文件路径
#   $2 - 日志目录路径
#

STATE_FILE="$1"
LOG_DIR="$2"

log() {
    echo "[POST-PHASE] $1"
}

# 计算阶段耗时
calculate_duration() {
    local timing_file="$LOG_DIR/.phase_timing"
    if [[ -f "$timing_file" ]]; then
        local start_time=$(grep "phase_start_time" "$timing_file" | tail -1 | cut -d: -f2-)
        if [[ -n "$start_time" ]]; then
            local end_time=$(date -Iseconds)
            log "阶段开始: $start_time"
            log "阶段结束: $end_time"
        fi
    fi
}

# 清理备份
cleanup_backup() {
    if [[ -f "$STATE_FILE.bak" ]]; then
        # 如果当前状态文件有效，删除备份
        if [[ -f "$STATE_FILE" ]] && grep -q "current_phase" "$STATE_FILE"; then
            rm "$STATE_FILE.bak"
            log "备份已清理"
        fi
    fi
}

# 记录执行日志
log_execution() {
    local log_file="$LOG_DIR/execution.log"
    local timestamp=$(date -Iseconds)
    echo "[$timestamp] 阶段执行完成" >> "$log_file"
}

main() {
    log "后置钩子启动"

    calculate_duration
    cleanup_backup
    log_execution

    log "后置钩子完成"
}

main
