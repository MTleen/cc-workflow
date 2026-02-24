#!/bin/bash
#
# 前置钩子 - 阶段执行前调用
#
# 参数：
#   $1 - 状态文件路径
#   $2 - 日志目录路径
#

STATE_FILE="$1"
LOG_DIR="$2"

log() {
    echo "[PRE-PHASE] $1"
}

# 记录阶段开始时间
record_start_time() {
    local timestamp=$(date -Iseconds)
    echo "phase_start_time: $timestamp" >> "$LOG_DIR/.phase_timing"
}

# 检查依赖
check_dependencies() {
    # 确保必要目录存在
    mkdir -p "$LOG_DIR"
}

# 备份当前状态
backup_state() {
    if [[ -f "$STATE_FILE" ]]; then
        cp "$STATE_FILE" "$STATE_FILE.bak"
    fi
}

main() {
    log "前置钩子启动"

    check_dependencies
    record_start_time
    backup_state

    log "前置钩子完成"
}

main
