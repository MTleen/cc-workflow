"""
YOLO 模式控制模块测试
"""

import pytest
import tempfile
from pathlib import Path
from datetime import datetime

# 添加脚本目录到 Python 路径
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / '.claude' / 'skills' / 'ideal-yolo' / 'scripts'))

from yolo_control import (
    ModeTransition,
    TransitionResult,
    YoloStatus,
    VALID_TRANSITIONS,
    can_transition,
    transition_status,
    enable_yolo,
    disable_yolo,
    pause_yolo,
    resume_yolo,
    complete_yolo,
    error_yolo,
    reset_yolo,
    check_yolo_status,
    should_ask_yolo,
    get_yolo_summary
)


class TestCanTransition:
    """状态转换检查测试"""

    def test_valid_transition_pending_to_in_progress(self):
        """测试有效转换: pending -> in_progress"""
        assert can_transition(YoloStatus.PENDING, YoloStatus.IN_PROGRESS) is True

    def test_valid_transition_in_progress_to_paused(self):
        """测试有效转换: in_progress -> paused"""
        assert can_transition(YoloStatus.IN_PROGRESS, YoloStatus.PAUSED) is True

    def test_valid_transition_in_progress_to_completed(self):
        """测试有效转换: in_progress -> completed"""
        assert can_transition(YoloStatus.IN_PROGRESS, YoloStatus.COMPLETED) is True

    def test_valid_transition_in_progress_to_error(self):
        """测试有效转换: in_progress -> error"""
        assert can_transition(YoloStatus.IN_PROGRESS, YoloStatus.ERROR) is True

    def test_valid_transition_paused_to_in_progress(self):
        """测试有效转换: paused -> in_progress"""
        assert can_transition(YoloStatus.PAUSED, YoloStatus.IN_PROGRESS) is True

    def test_invalid_transition_pending_to_completed(self):
        """测试无效转换: pending -> completed"""
        assert can_transition(YoloStatus.PENDING, YoloStatus.COMPLETED) is False

    def test_invalid_transition_paused_to_completed(self):
        """测试无效转换: paused -> completed"""
        assert can_transition(YoloStatus.PAUSED, YoloStatus.COMPLETED) is False

    def test_same_state_transition(self):
        """测试相同状态转换"""
        assert can_transition(YoloStatus.PENDING, YoloStatus.PENDING) is True
        assert can_transition(YoloStatus.IN_PROGRESS, YoloStatus.IN_PROGRESS) is True


class TestTransitionStatus:
    """状态转换测试"""

    def test_transition_success(self, tmp_path):
        """测试成功转换"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: pending
---

# 流程状态
""", encoding='utf-8')

        result = transition_status(str(state_file), YoloStatus.IN_PROGRESS)

        assert result.success is True
        assert result.previous_status == YoloStatus.PENDING
        assert result.new_status == YoloStatus.IN_PROGRESS

    def test_transition_invalid(self, tmp_path):
        """测试无效转换"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: pending
---

# 流程状态
""", encoding='utf-8')

        result = transition_status(str(state_file), YoloStatus.COMPLETED)

        assert result.success is False
        assert result.new_status == YoloStatus.PENDING  # 状态不变


class TestEnableYolo:
    """启用 YOLO 模式测试"""

    def test_enable_yolo(self, tmp_path):
        """测试启用 YOLO 模式"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: false
  status: pending
---

# 流程状态
""", encoding='utf-8')

        result = enable_yolo(str(state_file))

        assert result.success is True
        assert result.new_status == YoloStatus.IN_PROGRESS

        status = check_yolo_status(str(state_file))
        assert status['enabled'] is True

    def test_enable_yolo_already_enabled(self, tmp_path):
        """测试已启用时再次启用"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
---

# 流程状态
""", encoding='utf-8')

        result = enable_yolo(str(state_file))

        assert result.success is True


class TestDisableYolo:
    """禁用 YOLO 模式测试"""

    def test_disable_yolo(self, tmp_path):
        """测试禁用 YOLO 模式"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
---

# 流程状态
""", encoding='utf-8')

        result = disable_yolo(str(state_file))

        assert result.success is True
        assert result.new_status == YoloStatus.PAUSED

        status = check_yolo_status(str(state_file))
        assert status['enabled'] is False


class TestPauseResumeYolo:
    """暂停/恢复 YOLO 模式测试"""

    def test_pause_yolo(self, tmp_path):
        """测试暂停 YOLO 模式"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
---

# 流程状态
""", encoding='utf-8')

        result = pause_yolo(str(state_file))

        assert result.success is True
        assert result.new_status == YoloStatus.PAUSED

    def test_resume_yolo(self, tmp_path):
        """测试恢复 YOLO 模式"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: paused
---

# 流程状态
""", encoding='utf-8')

        result = resume_yolo(str(state_file))

        assert result.success is True
        assert result.new_status == YoloStatus.IN_PROGRESS


class TestCompleteYolo:
    """完成 YOLO 模式测试"""

    def test_complete_yolo(self, tmp_path):
        """测试完成 YOLO 模式"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
---

# 流程状态
""", encoding='utf-8')

        result = complete_yolo(str(state_file))

        assert result.success is True
        assert result.new_status == YoloStatus.COMPLETED


class TestErrorYolo:
    """错误状态测试"""

    def test_error_yolo(self, tmp_path):
        """测试标记错误状态"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
---

# 流程状态
""", encoding='utf-8')

        result = error_yolo(str(state_file), "评审连续失败3次")

        assert result.success is True
        assert result.new_status == YoloStatus.ERROR

        status = check_yolo_status(str(state_file))
        assert status['circuit_breaker']['triggered'] is True
        assert "评审连续失败3次" in status['circuit_breaker']['reason']


class TestResetYolo:
    """重置 YOLO 模式测试"""

    def test_reset_yolo(self, tmp_path):
        """测试重置 YOLO 模式"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: completed
  completed_phases: [P3, P4, P5]
---

# 流程状态
""", encoding='utf-8')

        result = reset_yolo(str(state_file))

        assert result.success is True
        assert result.new_status == YoloStatus.PENDING

        status = check_yolo_status(str(state_file))
        assert status['enabled'] is False
        assert status['completed_phases'] == []


class TestCheckYoloStatus:
    """检查 YOLO 状态测试"""

    def test_check_status_full(self, tmp_path):
        """测试完整状态检查"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
  completed_phases: [P3, P4]
  current_phase: P5
  current_attempt: 2
  circuit_breaker:
    triggered: false
  audit_logs:
    - phase: P3
      log_file: phase-P3.log
      status: success
---

# 流程状态
""", encoding='utf-8')

        status = check_yolo_status(str(state_file))

        assert status['enabled'] is True
        assert status['status'] == "in_progress"
        assert status['completed_phases'] == ["P3", "P4"]
        assert status['current_phase'] == "P5"
        assert status['current_attempt'] == 2
        assert status['circuit_breaker']['triggered'] is False
        assert status['audit_logs_count'] == 1
        assert status['can_resume'] is False  # in_progress 状态
        assert status['is_active'] is True

    def test_check_status_can_resume(self, tmp_path):
        """测试可恢复状态"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: paused
---

# 流程状态
""", encoding='utf-8')

        status = check_yolo_status(str(state_file))
        assert status['can_resume'] is True


class TestShouldAskYolo:
    """是否询问 YOLO 模式测试"""

    def test_should_ask_when_pending(self, tmp_path):
        """测试 pending 状态应该询问"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: false
  status: pending
---

# 流程状态
""", encoding='utf-8')

        assert should_ask_yolo(str(state_file)) is True

    def test_should_not_ask_when_enabled(self, tmp_path):
        """测试已启用不应询问"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
---

# 流程状态
""", encoding='utf-8')

        assert should_ask_yolo(str(state_file)) is False


class TestGetYoloSummary:
    """获取 YOLO 摘要测试"""

    def test_summary_not_enabled(self, tmp_path):
        """测试未启用的摘要"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: false
  status: pending
---

# 流程状态
""", encoding='utf-8')

        summary = get_yolo_summary(str(state_file))
        assert "未启用" in summary

    def test_summary_in_progress(self, tmp_path):
        """测试进行中的摘要"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
  completed_phases: [P3, P4]
  current_phase: P5
---

# 流程状态
""", encoding='utf-8')

        summary = get_yolo_summary(str(state_file))
        assert "in_progress" in summary
        assert "P5" in summary
        assert "P3" in summary

    def test_summary_with_circuit_breaker(self, tmp_path):
        """测试熔断状态的摘要"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: paused
  circuit_breaker:
    triggered: true
    reason: 评审连续失败
---

# 流程状态
""", encoding='utf-8')

        summary = get_yolo_summary(str(state_file))
        assert "熔断" in summary
        assert "评审连续失败" in summary


class TestTransitionResult:
    """转换结果测试"""

    def test_to_dict(self):
        """测试转换为字典"""
        result = TransitionResult(
            success=True,
            previous_status=YoloStatus.PENDING,
            new_status=YoloStatus.IN_PROGRESS,
            message="转换成功",
            timestamp=datetime(2026, 2, 24, 10, 0, 0)
        )

        data = result.to_dict()
        assert data['success'] is True
        assert data['previous_status'] == "pending"
        assert data['new_status'] == "in_progress"
        assert data['message'] == "转换成功"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
