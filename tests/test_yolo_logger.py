"""
YOLO 审计日志模块测试
"""

import pytest
import tempfile
from pathlib import Path
from datetime import datetime, timedelta

# 添加脚本目录到 Python 路径
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / '.claude' / 'skills' / 'ideal-yolo' / 'scripts'))

from yolo_logger import (
    LogType,
    LogStatus,
    AuditLogEntry,
    write_audit_log,
    generate_summary_log,
    create_phase_log_entry,
    create_review_log_entry,
    create_error_log_entry,
    finalize_log_entry,
    get_phase_name,
    _format_dt,
    _parse_dt
)


class TestLogTypeEnum:
    """日志类型枚举测试"""

    def test_log_type_values(self):
        """测试日志类型值"""
        assert LogType.PHASE.value == "phase"
        assert LogType.REVIEW.value == "review"
        assert LogType.ERROR.value == "error"
        assert LogType.SYSTEM.value == "system"


class TestAuditLogEntry:
    """审计日志条目测试"""

    def test_default_values(self):
        """测试默认值"""
        entry = AuditLogEntry(
            phase="P3",
            phase_name="技术方案",
            log_type=LogType.PHASE,
            status="success"
        )
        assert entry.phase == "P3"
        assert entry.phase_name == "技术方案"
        assert entry.log_type == LogType.PHASE
        assert entry.status == "success"
        assert entry.start_time is None
        assert entry.duration == 0
        assert entry.token_count == 0
        assert entry.output_files == []

    def test_to_dict(self):
        """测试转换为字典"""
        entry = AuditLogEntry(
            phase="P3",
            phase_name="技术方案",
            log_type=LogType.PHASE,
            status="success",
            skill_used="ideal-dev-solution",
            token_count=1000
        )
        result = entry.to_dict()
        assert result['phase'] == "P3"
        assert result['phase_name'] == "技术方案"
        assert result['log_type'] == "phase"
        assert result['status'] == "success"
        assert result['skill_used'] == "ideal-dev-solution"
        assert result['token_count'] == 1000

    def test_review_entry(self):
        """测试评审日志条目"""
        entry = AuditLogEntry(
            phase="P4",
            phase_name="方案评审",
            log_type=LogType.REVIEW,
            status="success",
            review_passed=True,
            review_score=85.0,
            review_comments=["架构合理"],
            review_suggestions=["增加接口文档"]
        )
        assert entry.review_passed is True
        assert entry.review_score == 85.0
        assert entry.review_comments == ["架构合理"]


class TestDatetimeHelpers:
    """日期时间辅助函数测试"""

    def test_format_dt_none(self):
        """测试格式化 None"""
        assert _format_dt(None) is None

    def test_format_dt_value(self):
        """测试格式化日期时间"""
        dt = datetime(2026, 2, 24, 10, 0, 0)
        result = _format_dt(dt)
        assert "2026-02-24" in result
        assert "10:00:00" in result

    def test_parse_dt_none(self):
        """测试解析 None"""
        assert _parse_dt(None) is None

    def test_parse_dt_value(self):
        """测试解析日期时间字符串"""
        result = _parse_dt("2026-02-24T10:00:00Z")
        assert result is not None
        assert result.year == 2026
        assert result.month == 2
        assert result.day == 24


class TestWriteAuditLog:
    """写入审计日志测试"""

    def test_write_phase_log(self, tmp_path):
        """测试写入阶段执行日志"""
        entry = AuditLogEntry(
            phase="P3",
            phase_name="技术方案",
            log_type=LogType.PHASE,
            status="success",
            skill_used="ideal-dev-solution",
            agent_used="architect",
            output_files=["docs/P3-技术方案.md"],
            token_count=1500,
            start_time=datetime.now() - timedelta(seconds=30),
            end_time=datetime.now()
        )

        log_file = write_audit_log(str(tmp_path), entry)

        assert log_file.exists()
        assert log_file.name == "phase-P3.log"
        content = log_file.read_text(encoding='utf-8')
        assert "P3" in content
        assert "技术方案" in content
        assert "ideal-dev-solution" in content
        assert "architect" in content
        assert "docs/P3-技术方案.md" in content
        assert "1500" in content

    def test_write_review_log(self, tmp_path):
        """测试写入评审日志"""
        entry = AuditLogEntry(
            phase="P4",
            phase_name="方案评审",
            log_type=LogType.REVIEW,
            status="success",
            review_passed=True,
            review_score=90.0,
            review_comments=["架构设计合理", "技术选型恰当"],
            review_suggestions=["增加性能测试方案"]
        )

        log_file = write_audit_log(str(tmp_path), entry)

        assert log_file.exists()
        assert log_file.name == "review-P4.log"
        content = log_file.read_text(encoding='utf-8')
        assert "评审结果" in content
        assert "通过" in content
        assert "90.0%" in content
        assert "架构设计合理" in content
        assert "增加性能测试方案" in content

    def test_write_error_log(self, tmp_path):
        """测试写入错误日志"""
        entry = AuditLogEntry(
            phase="P9",
            phase_name="开发执行",
            log_type=LogType.ERROR,
            status="failure",
            error_message="测试失败：AssertionError",
            skill_used="ideal-dev-exec"
        )

        log_file = write_audit_log(str(tmp_path), entry)

        assert log_file.exists()
        assert log_file.name == "error-P9.log"
        content = log_file.read_text(encoding='utf-8')
        assert "错误信息" in content
        assert "AssertionError" in content

    def test_write_log_creates_directory(self, tmp_path):
        """测试写入日志时创建目录"""
        log_dir = tmp_path / "yolo-logs"
        entry = AuditLogEntry(
            phase="P3",
            phase_name="技术方案",
            log_type=LogType.PHASE,
            status="success"
        )

        log_file = write_audit_log(str(log_dir), entry)

        assert log_dir.exists()
        assert log_file.exists()


class TestGenerateSummaryLog:
    """生成摘要日志测试"""

    def test_generate_summary(self, tmp_path):
        """测试生成摘要日志"""
        log_dir = tmp_path / "yolo-logs"
        log_dir.mkdir()

        # 创建一些日志文件
        (log_dir / "phase-P3.log").write_text("# P3", encoding='utf-8')
        (log_dir / "review-P4.log").write_text("# P4", encoding='utf-8')

        start_time = datetime.now() - timedelta(minutes=30)
        end_time = datetime.now()

        summary_file = generate_summary_log(
            str(log_dir),
            completed_phases=["P3", "P4"],
            total_token_count=5000,
            start_time=start_time,
            end_time=end_time
        )

        assert summary_file.exists()
        assert summary_file.name == "summary.log"
        content = summary_file.read_text(encoding='utf-8')
        assert "P3" in content
        assert "P4" in content
        assert "5000" in content
        assert "执行概览" in content

    def test_generate_summary_empty(self, tmp_path):
        """测试空阶段列表的摘要"""
        log_dir = tmp_path / "yolo-logs"
        log_dir.mkdir()

        summary_file = generate_summary_log(
            str(log_dir),
            completed_phases=[]
        )

        content = summary_file.read_text(encoding='utf-8')
        assert "无" in content


class TestCreateLogEntries:
    """创建日志条目辅助函数测试"""

    def test_create_phase_log_entry(self):
        """测试创建阶段日志条目"""
        entry = create_phase_log_entry(
            phase="P3",
            phase_name="技术方案",
            skill_used="ideal-dev-solution",
            agent_used="architect",
            output_files=["docs/P3.md"],
            token_count=1000
        )

        assert entry.phase == "P3"
        assert entry.phase_name == "技术方案"
        assert entry.log_type == LogType.PHASE
        assert entry.status == "pending"
        assert entry.skill_used == "ideal-dev-solution"
        assert entry.agent_used == "architect"
        assert entry.start_time is not None

    def test_create_review_log_entry_passed(self):
        """测试创建评审通过日志条目"""
        entry = create_review_log_entry(
            phase="P4",
            phase_name="方案评审",
            review_passed=True,
            review_score=85.0,
            review_comments=["架构合理"],
            review_suggestions=[],
            token_count=500
        )

        assert entry.phase == "P4"
        assert entry.log_type == LogType.REVIEW
        assert entry.status == "success"
        assert entry.review_passed is True
        assert entry.review_score == 85.0

    def test_create_review_log_entry_failed(self):
        """测试创建评审不通过日志条目"""
        entry = create_review_log_entry(
            phase="P4",
            phase_name="方案评审",
            review_passed=False,
            review_score=40.0,
            review_comments=["架构不合理"],
            review_suggestions=["重新设计架构"]
        )

        assert entry.log_type == LogType.REVIEW
        assert entry.status == "failure"
        assert entry.review_passed is False

    def test_create_error_log_entry(self):
        """测试创建错误日志条目"""
        entry = create_error_log_entry(
            phase="P9",
            phase_name="开发执行",
            error_message="测试失败",
            skill_used="ideal-dev-exec"
        )

        assert entry.phase == "P9"
        assert entry.log_type == LogType.ERROR
        assert entry.status == "failure"
        assert entry.error_message == "测试失败"

    def test_finalize_log_entry(self):
        """测试完成日志条目"""
        entry = create_phase_log_entry(
            phase="P3",
            phase_name="技术方案"
        )

        import time
        time.sleep(0.1)  # 确保 duration > 0

        finalized = finalize_log_entry(entry, status="success")

        assert finalized.status == "success"
        assert finalized.end_time is not None
        assert finalized.duration >= 0


class TestGetPhaseName:
    """获取阶段名称测试"""

    def test_get_phase_name_known(self):
        """测试已知阶段"""
        assert get_phase_name("P1") == "需求编写"
        assert get_phase_name("P3") == "技术方案"
        assert get_phase_name("P9") == "开发执行"
        assert get_phase_name("P15") == "成果提交"

    def test_get_phase_name_unknown(self):
        """测试未知阶段"""
        assert get_phase_name("P99") == "阶段 P99"
        assert get_phase_name("invalid") == "阶段 invalid"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
