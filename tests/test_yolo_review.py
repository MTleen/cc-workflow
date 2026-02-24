"""
YOLO 自动评审模块测试
"""

import pytest
import tempfile
from pathlib import Path
from datetime import datetime

# 添加脚本目录到 Python 路径
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / '.claude' / 'skills' / 'ideal-yolo' / 'scripts'))

from yolo_review import (
    ReviewPhase,
    ReviewStatus,
    ChecklistItem,
    ReviewStandard,
    ReviewResult,
    DEFAULT_REVIEW_STANDARDS,
    get_review_standard,
    apply_checklist,
    calculate_score,
    check_review_passed,
    auto_review,
    generate_review_log,
    get_phase_review_phases,
    is_review_phase
)


class TestChecklistItem:
    """检查清单项测试"""

    def test_default_values(self):
        """测试默认值"""
        item = ChecklistItem(id="P4-001", description="测试项")
        assert item.id == "P4-001"
        assert item.description == "测试项"
        assert item.required is True
        assert item.passed is None
        assert item.comment is None

    def test_to_dict(self):
        """测试转换为字典"""
        item = ChecklistItem(
            id="P4-001",
            description="测试项",
            required=True,
            passed=True,
            comment="通过"
        )
        result = item.to_dict()
        assert result['id'] == "P4-001"
        assert result['description'] == "测试项"
        assert result['required'] is True
        assert result['passed'] is True
        assert result['comment'] == "通过"


class TestReviewStandard:
    """评审标准测试"""

    def test_get_checklist_by_id(self):
        """测试根据 ID 获取检查清单项"""
        standard = ReviewStandard(
            phase=ReviewPhase.P4,
            phase_name="技术方案评审",
            description="测试描述",
            checklist=[
                ChecklistItem("P4-001", "项目1"),
                ChecklistItem("P4-002", "项目2"),
            ]
        )

        item = standard.get_checklist_by_id("P4-001")
        assert item is not None
        assert item.description == "项目1"

        item = standard.get_checklist_by_id("P4-999")
        assert item is None


class TestReviewResult:
    """评审结果测试"""

    def test_to_dict(self):
        """测试转换为字典"""
        result = ReviewResult(
            phase=ReviewPhase.P4,
            status=ReviewStatus.PASSED,
            passed=True,
            score=80.0,
            comments=["意见1"],
            suggestions=["建议1"],
            retry_count=1
        )

        data = result.to_dict()
        assert data['phase'] == "P4"
        assert data['status'] == "passed"
        assert data['passed'] is True
        assert data['score'] == 80.0
        assert data['comments'] == ["意见1"]
        assert data['suggestions'] == ["建议1"]
        assert data['retry_count'] == 1


class TestGetReviewStandard:
    """获取评审标准测试"""

    def test_get_existing_standard(self):
        """测试获取已定义的评审标准"""
        standard = get_review_standard(ReviewPhase.P4)
        assert standard.phase == ReviewPhase.P4
        assert standard.phase_name == "技术方案评审"
        assert len(standard.checklist) > 0

    def test_get_all_standards_defined(self):
        """测试所有评审阶段都有定义的标准"""
        for phase in ReviewPhase:
            standard = get_review_standard(phase)
            assert standard is not None
            assert standard.phase == phase


class TestApplyChecklist:
    """应用检查清单测试"""

    def test_apply_checklist(self):
        """测试应用检查清单结果"""
        standard = get_review_standard(ReviewPhase.P4)
        checklist_results = [
            {'id': 'P4-001', 'passed': True, 'comment': '通过'},
            {'id': 'P4-002', 'passed': False, 'comment': '不通过'},
        ]

        applied = apply_checklist(standard, checklist_results)

        assert len(applied) == len(standard.checklist)
        assert applied[0].passed is True
        assert applied[0].comment == "通过"
        assert applied[1].passed is False
        assert applied[1].comment == "不通过"

    def test_apply_checklist_partial(self):
        """测试部分应用检查清单"""
        standard = get_review_standard(ReviewPhase.P4)
        checklist_results = [
            {'id': 'P4-001', 'passed': True},
        ]

        applied = apply_checklist(standard, checklist_results)

        # 第一项有结果
        assert applied[0].passed is True
        # 其他项没有结果
        assert applied[1].passed is None


class TestCalculateScore:
    """计算得分测试"""

    def test_calculate_score_all_passed(self):
        """测试全部通过"""
        items = [
            ChecklistItem("1", "a", passed=True),
            ChecklistItem("2", "b", passed=True),
            ChecklistItem("3", "c", passed=True),
        ]
        score = calculate_score(items)
        assert score == 100.0

    def test_calculate_score_half_passed(self):
        """测试一半通过"""
        items = [
            ChecklistItem("1", "a", passed=True),
            ChecklistItem("2", "b", passed=False),
        ]
        score = calculate_score(items)
        assert score == 50.0

    def test_calculate_score_empty(self):
        """测试空列表"""
        score = calculate_score([])
        assert score == 0.0


class TestCheckReviewPassed:
    """检查评审通过测试"""

    def test_all_required_passed(self):
        """测试所有必填项通过"""
        standard = ReviewStandard(
            phase=ReviewPhase.P4,
            phase_name="测试",
            description="测试",
            checklist=[
                ChecklistItem("1", "a", required=True, passed=True),
                ChecklistItem("2", "b", required=False, passed=False),
            ],
            min_pass_count=1
        )

        result = check_review_passed(standard, standard.checklist)
        assert result is True

    def test_required_not_passed(self):
        """测试必填项未通过"""
        standard = ReviewStandard(
            phase=ReviewPhase.P4,
            phase_name="测试",
            description="测试",
            checklist=[
                ChecklistItem("1", "a", required=True, passed=False),
                ChecklistItem("2", "b", required=True, passed=True),
            ],
            min_pass_count=1
        )

        result = check_review_passed(standard, standard.checklist)
        assert result is False

    def test_min_pass_count_not_met(self):
        """测试通过数量不足"""
        standard = ReviewStandard(
            phase=ReviewPhase.P4,
            phase_name="测试",
            description="测试",
            checklist=[
                ChecklistItem("1", "a", required=False, passed=True),
                ChecklistItem("2", "b", required=False, passed=False),
            ],
            min_pass_count=3
        )

        result = check_review_passed(standard, standard.checklist)
        assert result is False


class TestAutoReview:
    """自动评审测试"""

    def test_auto_review_passed(self):
        """测试评审通过"""
        checklist_results = [
            {'id': 'P4-001', 'passed': True},
            {'id': 'P4-002', 'passed': True},
            {'id': 'P4-003', 'passed': True},
        ]

        result = auto_review(
            phase=ReviewPhase.P4,
            content="测试内容",
            checklist_results=checklist_results,
            comments=["架构合理"],
            suggestions=[],
            retry_count=0
        )

        assert result.passed is True
        assert result.status == ReviewStatus.PASSED
        assert result.score > 0
        assert len(result.checklist_results) > 0

    def test_auto_review_failed(self):
        """测试评审不通过"""
        checklist_results = [
            {'id': 'P4-001', 'passed': False},
            {'id': 'P4-002', 'passed': False},
            {'id': 'P4-003', 'passed': False},
        ]

        result = auto_review(
            phase=ReviewPhase.P4,
            content="测试内容",
            checklist_results=checklist_results,
            comments=["架构不合理"],
            suggestions=["重新设计架构"],
            retry_count=1
        )

        assert result.passed is False
        assert result.status == ReviewStatus.FAILED
        assert result.retry_count == 1


class TestGenerateReviewLog:
    """生成评审日志测试"""

    def test_generate_review_log(self, tmp_path):
        """测试生成评审日志"""
        result = ReviewResult(
            phase=ReviewPhase.P4,
            status=ReviewStatus.PASSED,
            passed=True,
            score=80.0,
            comments=["意见1", "意见2"],
            suggestions=["建议1"],
            checklist_results=[
                ChecklistItem("P4-001", "架构设计", passed=True, comment="OK"),
                ChecklistItem("P4-002", "技术选型", passed=False, comment="需改进"),
            ]
        )

        log_file = generate_review_log(result, str(tmp_path))

        assert log_file.exists()
        content = log_file.read_text(encoding='utf-8')
        assert "P4" in content
        assert "通过" in content
        assert "80.0%" in content
        assert "架构设计" in content
        assert "意见1" in content
        assert "建议1" in content

    def test_generate_review_log_with_content_file(self, tmp_path):
        """测试生成评审日志（包含被评审文件）"""
        result = ReviewResult(
            phase=ReviewPhase.P6,
            status=ReviewStatus.PASSED,
            passed=True,
            score=100.0
        )

        log_file = generate_review_log(
            result,
            str(tmp_path),
            content_file="docs/P5-编码计划.md"
        )

        content = log_file.read_text(encoding='utf-8')
        assert "P5-编码计划.md" in content


class TestGetPhaseReviewPhases:
    """获取评审阶段列表测试"""

    def test_get_phase_review_phases(self):
        """测试获取评审阶段列表"""
        phases = get_phase_review_phases()
        assert ReviewPhase.P4 in phases
        assert ReviewPhase.P6 in phases
        assert ReviewPhase.P8 in phases
        assert ReviewPhase.P10 in phases
        assert ReviewPhase.P12 in phases
        assert ReviewPhase.P14 in phases


class TestIsReviewPhase:
    """检查是否为评审阶段测试"""

    def test_is_review_phase_true(self):
        """测试是评审阶段"""
        assert is_review_phase("P4") is True
        assert is_review_phase("P6") is True
        assert is_review_phase("P10") is True

    def test_is_review_phase_false(self):
        """测试不是评审阶段"""
        assert is_review_phase("P1") is False
        assert is_review_phase("P3") is False
        assert is_review_phase("P9") is False
        assert is_review_phase("P15") is False

    def test_is_review_phase_invalid(self):
        """测试无效阶段"""
        assert is_review_phase("invalid") is False
        assert is_review_phase("") is False


class TestDefaultReviewStandards:
    """默认评审标准测试"""

    def test_all_phases_have_standards(self):
        """测试所有阶段都有评审标准"""
        assert ReviewPhase.P4 in DEFAULT_REVIEW_STANDARDS
        assert ReviewPhase.P6 in DEFAULT_REVIEW_STANDARDS
        assert ReviewPhase.P8 in DEFAULT_REVIEW_STANDARDS
        assert ReviewPhase.P10 in DEFAULT_REVIEW_STANDARDS
        assert ReviewPhase.P12 in DEFAULT_REVIEW_STANDARDS
        assert ReviewPhase.P14 in DEFAULT_REVIEW_STANDARDS

    def test_standards_have_checklist(self):
        """测试评审标准有检查清单"""
        for phase, standard in DEFAULT_REVIEW_STANDARDS.items():
            assert len(standard.checklist) > 0
            assert standard.min_pass_count > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
