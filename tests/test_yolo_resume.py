"""
YOLO 中断恢复模块测试
"""

import pytest
import tempfile
from pathlib import Path
from datetime import datetime, timedelta

# 添加脚本目录到 Python 路径
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / '.claude' / 'skills' / 'ideal-yolo' / 'scripts'))

from yolo_resume import (
    InterruptType,
    RecoveryStatus,
    InterruptInfo,
    ValidationResult,
    RecoveryResult,
    INTERRUPT_DETECTION_THRESHOLD,
    detect_interrupt,
    validate_state,
    get_resume_phase,
    resume_execution,
    generate_recovery_report,
    check_recovery_conditions
)


class TestInterruptInfo:
    """中断信息测试"""

    def test_interrupt_info_to_dict(self):
        """测试中断信息转换为字典"""
        info = InterruptInfo(
            detected=True,
            interrupt_type=InterruptType.API_LIMIT,
            detected_at=datetime.now(),
            last_successful_phase="P5",
            message="测试中断"
        )

        result = info.to_dict()
        assert result['detected'] is True
        assert result['interrupt_type'] == "api_limit"
        assert result['last_successful_phase'] == "P5"


class TestValidationResult:
    """验证结果测试"""

    def test_validation_result_to_dict(self):
        """测试验证结果转换为字典"""
        result = ValidationResult(
            valid=False,
            missing_phases=["P3"],
            incomplete_outputs=["P3.md"],
            warnings=["警告"]
        )

        data = result.to_dict()
        assert data['valid'] is False
        assert "P3" in data['missing_phases']
        assert "P3.md" in data['incomplete_outputs']


class TestRecoveryResult:
    """恢复结果测试"""

    def test_recovery_result_to_dict(self):
        """测试恢复结果转换为字典"""
        result = RecoveryResult(
            success=True,
            status=RecoveryStatus.IN_PROGRESS,
            resumed_from_phase="P5",
            message="恢复成功",
            recovery_time=datetime.now()
        )

        data = result.to_dict()
        assert data['success'] is True
        assert data['status'] == "in_progress"
        assert data['resumed_from_phase'] == "P5"


class TestDetectInterrupt:
    """检测中断测试"""

    def test_detect_no_interrupt_not_enabled(self, tmp_path):
        """测试未启用时不检测中断"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: false
  status: pending
---

# 流程状态
""", encoding='utf-8')

        result = detect_interrupt(str(state_file))

        assert result.detected is False
        assert "未启用" in result.message

    def test_detect_no_interrupt_completed(self, tmp_path):
        """测试已完成时不检测中断"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: completed
---

# 流程状态
""", encoding='utf-8')

        result = detect_interrupt(str(state_file))

        assert result.detected is False
        assert "已完成" in result.message

    def test_detect_interrupt_paused(self, tmp_path):
        """测试暂停状态检测为中断"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: paused
  completed_phases: [P3, P4]
---

# 流程状态
""", encoding='utf-8')

        result = detect_interrupt(str(state_file))

        assert result.detected is True
        assert result.interrupt_type == InterruptType.PROCESS_KILLED

    def test_detect_interrupt_error(self, tmp_path):
        """测试错误状态检测为中断"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: error
  completed_phases: [P3]
---

# 流程状态
""", encoding='utf-8')

        result = detect_interrupt(str(state_file))

        assert result.detected is True

    def test_detect_interrupt_timeout(self, tmp_path):
        """测试超时检测为中断"""
        state_file = tmp_path / "流程状态.md"
        # 设置最后更新时间为 15 分钟前
        old_time = datetime.now() - timedelta(minutes=15)
        state_file.write_text(f"""---
yolo_mode:
  enabled: true
  status: in_progress
  last_update: "{old_time.isoformat()}"
  completed_phases: [P3]
---

# 流程状态
""", encoding='utf-8')

        result = detect_interrupt(str(state_file))

        assert result.detected is True

    def test_detect_no_interrupt_in_progress(self, tmp_path):
        """测试正在执行中不检测为中断"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text(f"""---
yolo_mode:
  enabled: true
  status: in_progress
  last_update: "{datetime.now().isoformat()}"
  completed_phases: []
---

# 流程状态
""", encoding='utf-8')

        result = detect_interrupt(str(state_file))

        assert result.detected is False


class TestValidateState:
    """状态验证测试"""

    def test_validate_state_valid(self, tmp_path):
        """测试有效状态"""
        state_file = tmp_path / "流程状态.md"
        docs_dir = tmp_path / "docs"
        docs_dir.mkdir()

        # 创建预期的输出文件
        (docs_dir / "P3-技术方案.md").write_text("# P3", encoding='utf-8')

        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
  completed_phases: [P3, P4]
---

# 流程状态
""", encoding='utf-8')

        result = validate_state(str(state_file), str(docs_dir))

        assert result.valid is True

    def test_validate_state_missing_output(self, tmp_path):
        """测试缺少输出文件"""
        state_file = tmp_path / "流程状态.md"
        docs_dir = tmp_path / "docs"
        docs_dir.mkdir()

        # 不创建 P3 输出文件
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
  completed_phases: [P3, P4]
---

# 流程状态
""", encoding='utf-8')

        result = validate_state(str(state_file), str(docs_dir))

        assert len(result.incomplete_outputs) > 0


class TestGetResumePhase:
    """获取恢复阶段测试"""

    def test_get_resume_from_current(self, tmp_path):
        """测试从当前阶段恢复"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: paused
  current_phase: P5
  completed_phases: [P3, P4]
---

# 流程状态
""", encoding='utf-8')

        result = get_resume_phase(str(state_file))

        assert result == "P5"

    def test_get_resume_next_phase(self, tmp_path):
        """测试获取下一阶段"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: paused
  current_phase: P4
  completed_phases: [P3, P4]
---

# 流程状态
""", encoding='utf-8')

        result = get_resume_phase(str(state_file))

        assert result == "P5"

    def test_get_resume_all_completed(self, tmp_path):
        """测试所有阶段完成"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: completed
  completed_phases: [P3, P4, P5, P6, P7, P8, P9, P10, P11, P12, P13, P14]
---

# 流程状态
""", encoding='utf-8')

        result = get_resume_phase(str(state_file))

        assert result is None


class TestResumeExecution:
    """恢复执行测试"""

    def test_resume_no_interrupt(self, tmp_path):
        """测试无中断时恢复失败"""
        state_file = tmp_path / "流程状态.md"
        docs_dir = tmp_path / "docs"
        docs_dir.mkdir()

        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
  last_update: "{0}"
  completed_phases: []
---

# 流程状态
""".format(datetime.now().isoformat()), encoding='utf-8')

        result = resume_execution(str(state_file), str(docs_dir))

        assert result.success is False
        assert "未检测到中断" in result.message

    def test_resume_from_interrupt(self, tmp_path):
        """测试从中断恢复"""
        state_file = tmp_path / "流程状态.md"
        docs_dir = tmp_path / "docs"
        docs_dir.mkdir()

        # 创建预期的输出文件
        (docs_dir / "P3-技术方案.md").write_text("# P3", encoding='utf-8')

        old_time = datetime.now() - timedelta(minutes=15)
        state_file.write_text(f"""---
yolo_mode:
  enabled: true
  status: in_progress
  last_update: "{old_time.isoformat()}"
  current_phase: P5
  completed_phases: [P3, P4]
  circuit_breaker:
    triggered: false
---

# 流程状态
""", encoding='utf-8')

        result = resume_execution(str(state_file), str(docs_dir))

        assert result.success is True
        assert result.resumed_from_phase == "P5"


class TestGenerateRecoveryReport:
    """生成恢复报告测试"""

    def test_generate_recovery_report(self, tmp_path):
        """测试生成恢复报告"""
        state_file = tmp_path / "流程状态.md"
        docs_dir = tmp_path / "docs"
        output_dir = tmp_path / "logs"

        docs_dir.mkdir()

        old_time = datetime.now() - timedelta(minutes=15)
        state_file.write_text(f"""---
yolo_mode:
  enabled: true
  status: in_progress
  last_update: "{old_time.isoformat()}"
  current_phase: P5
  completed_phases: [P3, P4]
  circuit_breaker:
    triggered: false
---

# 流程状态
""", encoding='utf-8')

        report_file = generate_recovery_report(
            str(state_file),
            str(docs_dir),
            str(output_dir)
        )

        assert report_file.exists()
        content = report_file.read_text(encoding='utf-8')
        assert "中断恢复报告" in content
        assert "检测到中断" in content


class TestCheckRecoveryConditions:
    """检查恢复条件测试"""

    def test_can_recover_normal(self, tmp_path):
        """测试正常情况可恢复"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: paused
  completed_phases: [P3]
  circuit_breaker:
    triggered: false
---

# 流程状态
""", encoding='utf-8')

        result = check_recovery_conditions(str(state_file))

        assert result['can_recover'] is True

    def test_cannot_recover_not_enabled(self, tmp_path):
        """测试未启用不可恢复"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: false
  status: pending
---

# 流程状态
""", encoding='utf-8')

        result = check_recovery_conditions(str(state_file))

        assert result['can_recover'] is False
        assert any("未启用" in r for r in result['reasons'])

    def test_cannot_recover_completed(self, tmp_path):
        """测试已完成不可恢复"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: completed
  completed_phases: [P3, P4, P5, P6, P7, P8, P9, P10, P11, P12, P13, P14]
  circuit_breaker:
    triggered: false
---

# 流程状态
""", encoding='utf-8')

        result = check_recovery_conditions(str(state_file))

        assert result['can_recover'] is False
        assert any("已完成" in r for r in result['reasons'])

    def test_recover_with_circuit_breaker(self, tmp_path):
        """测试熔断状态下恢复"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: paused
  completed_phases: [P3]
  circuit_breaker:
    triggered: true
    reason: 测试熔断
---

# 流程状态
""", encoding='utf-8')

        result = check_recovery_conditions(str(state_file))

        # 可以恢复，但有警告
        assert any("熔断" in r for r in result['reasons'])


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
