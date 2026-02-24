"""
YOLO 熔断机制模块测试
"""

import pytest
import tempfile
from pathlib import Path
from datetime import datetime

# 添加脚本目录到 Python 路径
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / '.claude' / 'skills' / 'ideal-yolo' / 'scripts'))

from yolo_circuit import (
    CircuitBreakerType,
    CircuitCondition,
    CircuitBreakerReport,
    DEFAULT_CIRCUIT_THRESHOLDS,
    CircuitBreaker,
    check_circuit,
    trigger_circuit,
    clear_circuit,
    generate_circuit_report,
    get_circuit_status
)


class TestCircuitBreakerType:
    """熔断类型枚举测试"""

    def test_circuit_breaker_types(self):
        """测试熔断类型值"""
        assert CircuitBreakerType.REVIEW_FAILURE.value == "review_failure"
        assert CircuitBreakerType.TEST_FAILURE.value == "test_failure"
        assert CircuitBreakerType.REPEATED_ERROR.value == "repeated_error"
        assert CircuitBreakerType.MANUAL.value == "manual"


class TestCircuitCondition:
    """熔断条件测试"""

    def test_condition_not_triggered(self):
        """测试未触发的条件"""
        condition = CircuitCondition(
            condition_type=CircuitBreakerType.REVIEW_FAILURE,
            threshold=3,
            current_value=2,
            description="测试"
        )

        assert condition.is_triggered() is False

    def test_condition_triggered(self):
        """测试触发的条件"""
        condition = CircuitCondition(
            condition_type=CircuitBreakerType.REVIEW_FAILURE,
            threshold=3,
            current_value=3,
            description="测试"
        )

        assert condition.is_triggered() is True

    def test_condition_exceeded(self):
        """测试超出的条件"""
        condition = CircuitCondition(
            condition_type=CircuitBreakerType.REVIEW_FAILURE,
            threshold=3,
            current_value=5,
            description="测试"
        )

        assert condition.is_triggered() is True

    def test_to_dict(self):
        """测试转换为字典"""
        condition = CircuitCondition(
            condition_type=CircuitBreakerType.REVIEW_FAILURE,
            threshold=3,
            current_value=2,
            description="连续评审失败"
        )

        result = condition.to_dict()
        assert result['condition_type'] == "review_failure"
        assert result['threshold'] == 3
        assert result['current_value'] == 2
        assert result['triggered'] is False


class TestCircuitBreakerReport:
    """熔断报告测试"""

    def test_report_not_triggered(self):
        """测试未触发的报告"""
        report = CircuitBreakerReport(triggered=False)

        assert report.triggered is False
        assert report.trigger_type is None

    def test_report_triggered(self):
        """测试触发的报告"""
        report = CircuitBreakerReport(
            triggered=True,
            trigger_type=CircuitBreakerType.REVIEW_FAILURE,
            trigger_reason="连续3次评审失败",
            trigger_time=datetime.now(),
            recovery_suggestions=["检查评审标准"]
        )

        assert report.triggered is True
        assert report.trigger_type == CircuitBreakerType.REVIEW_FAILURE
        assert len(report.recovery_suggestions) == 1

    def test_to_dict(self):
        """测试转换为字典"""
        report = CircuitBreakerReport(
            triggered=True,
            trigger_type=CircuitBreakerType.REVIEW_FAILURE,
            trigger_reason="测试"
        )

        result = report.to_dict()
        assert result['triggered'] is True
        assert result['trigger_type'] == "review_failure"


class TestCircuitBreaker:
    """熔断器测试"""

    def test_initial_state(self):
        """测试初始状态"""
        cb = CircuitBreaker()
        assert cb.is_triggered() is False
        assert cb._consecutive_review_failures == 0

    def test_record_review_result_passed(self):
        """测试记录评审通过"""
        cb = CircuitBreaker()
        cb.record_review_result(False)  # 失败一次
        cb.record_review_result(True)   # 通过

        assert cb._consecutive_review_failures == 0

    def test_record_review_result_failed(self):
        """测试记录评审失败"""
        cb = CircuitBreaker()
        cb.record_review_result(False)
        cb.record_review_result(False)
        cb.record_review_result(False)

        assert cb._consecutive_review_failures == 3

    def test_record_test_result(self):
        """测试记录测试结果"""
        cb = CircuitBreaker()
        cb.record_test_result(passed_count=8, total_count=10)

        assert cb._test_failure_rate == pytest.approx(20.0, rel=0.01)

    def test_record_error(self):
        """测试记录错误"""
        cb = CircuitBreaker()
        cb.record_error("Error 1")
        cb.record_error("Error 1")
        cb.record_error("Error 2")

        assert cb._error_counts["Error 1"] == 2
        assert cb._error_counts["Error 2"] == 1

    def test_get_conditions(self):
        """测试获取熔断条件"""
        cb = CircuitBreaker()
        cb.record_review_result(False)
        cb.record_review_result(False)

        conditions = cb.get_conditions()

        assert len(conditions) == 3
        review_condition = next(
            c for c in conditions
            if c.condition_type == CircuitBreakerType.REVIEW_FAILURE
        )
        assert review_condition.current_value == 2

    def test_check_not_triggered(self):
        """测试检查未触发"""
        cb = CircuitBreaker()
        cb.record_review_result(False)
        cb.record_review_result(False)

        report = cb.check()

        assert report.triggered is False

    def test_check_triggered_by_review(self):
        """测试评审失败触发熔断"""
        cb = CircuitBreaker()
        cb.record_review_result(False)
        cb.record_review_result(False)
        cb.record_review_result(False)

        report = cb.check()

        assert report.triggered is True
        assert report.trigger_type == CircuitBreakerType.REVIEW_FAILURE

    def test_check_triggered_by_test(self):
        """测试测试失败触发熔断"""
        cb = CircuitBreaker(thresholds={
            CircuitBreakerType.TEST_FAILURE: 20
        })
        cb.record_test_result(passed_count=6, total_count=10)  # 40% 失败率

        report = cb.check()

        assert report.triggered is True
        assert report.trigger_type == CircuitBreakerType.TEST_FAILURE

    def test_check_triggered_by_repeated_error(self):
        """测试重复错误触发熔断"""
        cb = CircuitBreaker()
        for _ in range(5):
            cb.record_error("Same error")

        report = cb.check()

        assert report.triggered is True
        assert report.trigger_type == CircuitBreakerType.REPEATED_ERROR

    def test_reset(self):
        """测试重置"""
        cb = CircuitBreaker()
        cb.record_review_result(False)
        cb.record_review_result(False)
        cb.record_review_result(False)
        cb.check()

        cb.reset()

        assert cb.is_triggered() is False
        assert cb._consecutive_review_failures == 0

    def test_custom_thresholds(self):
        """测试自定义阈值"""
        cb = CircuitBreaker(thresholds={
            CircuitBreakerType.REVIEW_FAILURE: 5
        })
        cb.record_review_result(False)
        cb.record_review_result(False)
        cb.record_review_result(False)

        report = cb.check()

        # 阈值是 5，3 次不应触发
        assert report.triggered is False

    def test_get_max_error(self):
        """测试获取最大错误"""
        cb = CircuitBreaker()
        cb.record_error("Error A")
        cb.record_error("Error B")
        cb.record_error("Error B")
        cb.record_error("Error B")

        max_error = cb.get_max_error()

        assert max_error == "Error B"

    def test_get_recovery_suggestions(self):
        """测试获取恢复建议"""
        cb = CircuitBreaker()
        cb.record_review_result(False)
        cb.record_review_result(False)
        cb.record_review_result(False)
        report = cb.check()

        assert len(report.recovery_suggestions) > 0
        assert any("resume_yolo" in s for s in report.recovery_suggestions)


class TestTriggerCircuit:
    """触发熔断测试"""

    def test_trigger_circuit(self, tmp_path):
        """测试手动触发熔断"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
  circuit_breaker:
    triggered: false
---

# 流程状态
""", encoding='utf-8')

        result = trigger_circuit(
            str(state_file),
            reason="手动触发测试",
            trigger_type=CircuitBreakerType.MANUAL
        )

        assert result is True

        status = get_circuit_status(str(state_file))
        assert status['triggered'] is True
        assert "手动触发测试" in status['reason']


class TestClearCircuit:
    """清除熔断测试"""

    def test_clear_circuit(self, tmp_path):
        """测试清除熔断状态"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  circuit_breaker:
    triggered: true
    reason: 测试熔断
    retry_count: 0
---

# 流程状态
""", encoding='utf-8')

        result = clear_circuit(str(state_file))

        assert result is True

        status = get_circuit_status(str(state_file))
        assert status['triggered'] is False
        assert status['reason'] is None
        assert status['retry_count'] == 1


class TestGenerateCircuitReport:
    """生成熔断报告测试"""

    def test_generate_report_not_triggered(self, tmp_path):
        """测试生成未触发的报告"""
        report = CircuitBreakerReport(
            triggered=False,
            conditions=[
                CircuitCondition(
                    condition_type=CircuitBreakerType.REVIEW_FAILURE,
                    threshold=3,
                    current_value=1,
                    description="评审失败 1 次"
                )
            ]
        )

        report_file = generate_circuit_report(report, str(tmp_path))

        assert report_file.exists()
        content = report_file.read_text(encoding='utf-8')
        assert "否" in content
        assert "正常" in content

    def test_generate_report_triggered(self, tmp_path):
        """测试生成触发的报告"""
        report = CircuitBreakerReport(
            triggered=True,
            trigger_type=CircuitBreakerType.REVIEW_FAILURE,
            trigger_reason="连续3次评审失败",
            trigger_time=datetime.now(),
            conditions=[
                CircuitCondition(
                    condition_type=CircuitBreakerType.REVIEW_FAILURE,
                    threshold=3,
                    current_value=3,
                    description="评审失败 3 次"
                )
            ],
            recovery_suggestions=["检查评审标准", "使用 resume_yolo 恢复"]
        )

        report_file = generate_circuit_report(report, str(tmp_path))

        assert report_file.exists()
        content = report_file.read_text(encoding='utf-8')
        assert "是" in content
        assert "review_failure" in content
        assert "恢复建议" in content


class TestGetCircuitStatus:
    """获取熔断状态测试"""

    def test_get_circuit_status_not_triggered(self, tmp_path):
        """测试获取未触发的状态"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  circuit_breaker:
    triggered: false
    retry_count: 0
---

# 流程状态
""", encoding='utf-8')

        status = get_circuit_status(str(state_file))

        assert status['triggered'] is False
        assert status['reason'] is None
        assert status['retry_count'] == 0

    def test_get_circuit_status_triggered(self, tmp_path):
        """测试获取触发的状态"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  circuit_breaker:
    triggered: true
    reason: 评审连续失败3次
    retry_count: 2
---

# 流程状态
""", encoding='utf-8')

        status = get_circuit_status(str(state_file))

        assert status['triggered'] is True
        assert status['reason'] == "评审连续失败3次"
        assert status['retry_count'] == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
