#!/bin/bash
#
# 完成钩子 - 执行完成时调用
#
# 参数：
#   $1 - 状态文件路径
#   $2 - 日志目录路径
#

STATE_FILE="$1"
LOG_DIR="$2"

log() {
    echo "[ON-COMPLETE] $1"
}

# 生成完成报告
generate_completion_report() {
    local report_file="$LOG_DIR/completion-report.log"
    local timestamp=$(date -Iseconds)

    {
        echo "# YOLO 执行完成报告"
        echo ""
        echo "## 完成时间"
        echo "$timestamp"
        echo ""
        echo "## 执行统计"
        echo "- 总迭代次数: ${ITERATION_COUNT:-unknown}"
        echo "- 状态文件: $STATE_FILE"
        echo ""
        echo "## 已完成阶段"
        if [[ -f "$STATE_FILE" ]]; then
            grep "completed_phases" "$STATE_FILE" || echo "(未找到)"
        fi
        echo ""
        echo "## 下一步"
        echo "1. 检查 P15 成果提交"
        echo "2. 审核生成的文档"
        echo "3. 确认测试结果"
    } > "$report_file"

    log "完成报告已生成: $report_file"
}

# 清理临时文件
cleanup_temp_files() {
    rm -f "$LOG_DIR/.ralph_control"
    rm -f "$LOG_DIR/.phase_timing"
    log "临时文件已清理"
}

main() {
    log "完成钩子启动"

    generate_completion_report
    cleanup_temp_files

    log "YOLO 模式执行完成！"
}

main
