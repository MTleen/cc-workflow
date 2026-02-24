"""
YOLO 状态管理模块测试
"""

import pytest
import tempfile
from pathlib import Path
from datetime import datetime

# 添加脚本目录到 Python 路径
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / '.claude' / 'skills' / 'ideal-yolo' / 'scripts'))

from yolo_state import (
    YoloStatus,
    CircuitBreakerState,
    AuditLogEntry,
    YoloModeConfig,
    load_yolo_state,
    save_yolo_state,
    update_phase_status,
    set_yolo_status,
    enable_yolo_mode,
    disable_yolo_mode,
    check_yolo_status,
    add_audit_log,
    _parse_datetime,
    _format_datetime
)


class TestCircuitBreakerState:
    """熔断器状态测试"""

    def test_default_values(self):
        """测试默认值"""
        state = CircuitBreakerState()
        assert state.triggered is False
        assert state.reason is None
        assert state.retry_count == 0
        assert state.triggered_at is None

    def test_to_dict(self):
        """测试转换为字典"""
        state = CircuitBreakerState(
            triggered=True,
            reason="review_failed",
            retry_count=3
        )
        result = state.to_dict()
        assert result['triggered'] is True
        assert result['reason'] == "review_failed"
        assert result['retry_count'] == 3

    def test_from_dict(self):
        """测试从字典创建"""
        data = {
            'triggered': True,
            'reason': "test_reason",
            'retry_count': 2
        }
        state = CircuitBreakerState.from_dict(data)
        assert state.triggered is True
        assert state.reason == "test_reason"
        assert state.retry_count == 2


class TestAuditLogEntry:
    """审计日志条目测试"""

    def test_default_values(self):
        """测试默认值"""
        entry = AuditLogEntry(phase="P3", log_file="test.log", status="success")
        assert entry.phase == "P3"
        assert entry.log_file == "test.log"
        assert entry.status == "success"
        assert entry.created_at is None

    def test_to_dict(self):
        """测试转换为字典"""
        entry = AuditLogEntry(
            phase="P4",
            log_file="review-P4.log",
            status="failure",
            created_at=datetime(2026, 2, 24, 10, 0, 0)
        )
        result = entry.to_dict()
        assert result['phase'] == "P4"
        assert result['log_file'] == "review-P4.log"
        assert result['status'] == "failure"

    def test_from_dict(self):
        """测试从字典创建"""
        data = {
            'phase': 'P5',
            'log_file': 'phase-P5.log',
            'status': 'success'
        }
        entry = AuditLogEntry.from_dict(data)
        assert entry.phase == "P5"
        assert entry.log_file == "phase-P5.log"
        assert entry.status == "success"


class TestYoloModeConfig:
    """YOLO 模式配置测试"""

    def test_default_values(self):
        """测试默认值"""
        config = YoloModeConfig()
        assert config.enabled is False
        assert config.status == YoloStatus.PENDING
        assert config.start_time is None
        assert config.completed_phases == []
        assert config.current_phase is None
        assert config.current_attempt == 0

    def test_post_init(self):
        """测试初始化后处理"""
        config = YoloModeConfig(
            completed_phases=None,
            circuit_breaker=None,
            audit_logs=None
        )
        assert config.completed_phases == []
        assert isinstance(config.circuit_breaker, CircuitBreakerState)
        assert config.audit_logs == []

    def test_to_dict(self):
        """测试转换为字典"""
        config = YoloModeConfig(
            enabled=True,
            status=YoloStatus.IN_PROGRESS,
            completed_phases=["P3", "P4"],
            current_phase="P5"
        )
        result = config.to_dict()
        assert result['enabled'] is True
        assert result['status'] == "in_progress"
        assert result['completed_phases'] == ["P3", "P4"]
        assert result['current_phase'] == "P5"

    def test_from_dict_empty(self):
        """测试从空字典创建"""
        config = YoloModeConfig.from_dict({})
        assert config.enabled is False
        assert config.status == YoloStatus.PENDING

    def test_from_dict_with_data(self):
        """测试从字典创建"""
        data = {
            'enabled': True,
            'status': 'in_progress',
            'completed_phases': ['P3', 'P4'],
            'current_phase': 'P5',
            'current_attempt': 2
        }
        config = YoloModeConfig.from_dict(data)
        assert config.enabled is True
        assert config.status == YoloStatus.IN_PROGRESS
        assert config.completed_phases == ['P3', 'P4']
        assert config.current_phase == 'P5'
        assert config.current_attempt == 2


class TestDatetimeHelpers:
    """日期时间辅助函数测试"""

    def test_parse_datetime_none(self):
        """测试解析 None"""
        assert _parse_datetime(None) is None

    def test_parse_datetime_string(self):
        """测试解析字符串"""
        result = _parse_datetime("2026-02-24T10:00:00Z")
        assert result is not None
        assert result.year == 2026
        assert result.month == 2
        assert result.day == 24

    def test_format_datetime_none(self):
        """测试格式化 None"""
        assert _format_datetime(None) is None

    def test_format_datetime_value(self):
        """测试格式化日期时间"""
        dt = datetime(2026, 2, 24, 10, 0, 0)
        result = _format_datetime(dt)
        assert "2026-02-24" in result
        assert "10:00:00" in result


class TestLoadYoloState:
    """加载 YOLO 状态测试"""

    def test_load_from_nonexistent_file(self):
        """测试从不存在的文件加载"""
        config = load_yolo_state("/nonexistent/path/file.md")
        assert config.enabled is False
        assert config.status == YoloStatus.PENDING

    def test_load_from_file_without_frontmatter(self, tmp_path):
        """测试从没有 frontmatter 的文件加载"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("Some content without frontmatter")

        config = load_yolo_state(str(state_file))
        assert config.enabled is False

    def test_load_from_file_with_yolo_mode(self, tmp_path):
        """测试从包含 yolo_mode 的文件加载"""
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

        config = load_yolo_state(str(state_file))
        assert config.enabled is True
        assert config.status == YoloStatus.IN_PROGRESS
        assert config.completed_phases == ["P3", "P4"]
        assert config.current_phase == "P5"

    def test_load_from_file_without_yolo_mode(self, tmp_path):
        """测试从不包含 yolo_mode 的文件加载"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
current_phase: P2
---

# 流程状态
""", encoding='utf-8')

        config = load_yolo_state(str(state_file))
        assert config.enabled is False


class TestSaveYoloState:
    """保存 YOLO 状态测试"""

    def test_save_to_nonexistent_file(self):
        """测试保存到不存在的文件"""
        config = YoloModeConfig(enabled=True)
        result = save_yolo_state("/nonexistent/path/file.md", config)
        assert result is False

    def test_save_yolo_state(self, tmp_path):
        """测试保存 YOLO 状态"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
current_phase: P2
---

# 流程状态
""", encoding='utf-8')

        config = YoloModeConfig(
            enabled=True,
            status=YoloStatus.IN_PROGRESS,
            completed_phases=["P3"]
        )

        result = save_yolo_state(str(state_file), config)
        assert result is True

        # 重新加载验证
        loaded = load_yolo_state(str(state_file))
        assert loaded.enabled is True
        assert loaded.status == YoloStatus.IN_PROGRESS
        assert loaded.completed_phases == ["P3"]

    def test_save_preserves_other_frontmatter(self, tmp_path):
        """测试保存时保留其他 frontmatter 字段"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
current_phase: P2
iteration_name: test-iteration
---

# 流程状态
""", encoding='utf-8')

        config = YoloModeConfig(enabled=True)
        save_yolo_state(str(state_file), config)

        content = state_file.read_text(encoding='utf-8')
        assert "current_phase: P2" in content
        assert "iteration_name: test-iteration" in content


class TestUpdatePhaseStatus:
    """更新阶段状态测试"""

    def test_update_phase_completed(self, tmp_path):
        """测试标记阶段完成"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  completed_phases: []
---

# 流程状态
""", encoding='utf-8')

        result = update_phase_status(str(state_file), "P5", completed=True)
        assert result is True

        config = load_yolo_state(str(state_file))
        assert "P5" in config.completed_phases
        assert config.current_phase == "P5"

    def test_update_phase_not_completed(self, tmp_path):
        """测试标记阶段未完成"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  completed_phases: [P3, P5]
---

# 流程状态
""", encoding='utf-8')

        result = update_phase_status(str(state_file), "P5", completed=False)
        assert result is True

        config = load_yolo_state(str(state_file))
        assert "P5" not in config.completed_phases
        assert "P3" in config.completed_phases


class TestSetYoloStatus:
    """设置 YOLO 状态测试"""

    def test_set_status(self, tmp_path):
        """测试设置状态"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: pending
---

# 流程状态
""", encoding='utf-8')

        result = set_yolo_status(str(state_file), YoloStatus.IN_PROGRESS)
        assert result is True

        config = load_yolo_state(str(state_file))
        assert config.status == YoloStatus.IN_PROGRESS


class TestEnableDisableYoloMode:
    """启用/禁用 YOLO 模式测试"""

    def test_enable_yolo_mode(self, tmp_path):
        """测试启用 YOLO 模式"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: false
---

# 流程状态
""", encoding='utf-8')

        result = enable_yolo_mode(str(state_file))
        assert result is True

        config = load_yolo_state(str(state_file))
        assert config.enabled is True
        assert config.status == YoloStatus.IN_PROGRESS
        assert config.start_time is not None

    def test_disable_yolo_mode(self, tmp_path):
        """测试禁用 YOLO 模式"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
---

# 流程状态
""", encoding='utf-8')

        result = disable_yolo_mode(str(state_file))
        assert result is True

        config = load_yolo_state(str(state_file))
        assert config.enabled is False
        assert config.status == YoloStatus.PAUSED


class TestCheckYoloStatus:
    """检查 YOLO 状态测试"""

    def test_check_status(self, tmp_path):
        """测试检查状态"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
  completed_phases: [P3, P4]
  current_phase: P5
  circuit_breaker:
    triggered: false
---

# 流程状态
""", encoding='utf-8')

        result = check_yolo_status(str(state_file))
        assert result['enabled'] is True
        assert result['status'] == "in_progress"
        assert result['completed_phases'] == ["P3", "P4"]
        assert result['current_phase'] == "P5"
        assert result['circuit_breaker_triggered'] is False


class TestAddAuditLog:
    """添加审计日志测试"""

    def test_add_audit_log(self, tmp_path):
        """测试添加审计日志"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  audit_logs: []
---

# 流程状态
""", encoding='utf-8')

        result = add_audit_log(str(state_file), "P3", "phase-P3.log", "success")
        assert result is True

        config = load_yolo_state(str(state_file))
        assert len(config.audit_logs) == 1
        assert config.audit_logs[0].phase == "P3"
        assert config.audit_logs[0].log_file == "phase-P3.log"
        assert config.audit_logs[0].status == "success"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
