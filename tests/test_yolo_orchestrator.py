"""
YOLO 阶段编排模块测试
"""

import pytest
import tempfile
from pathlib import Path
from datetime import datetime

# 添加脚本目录到 Python 路径
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / '.claude' / 'skills' / 'ideal-yolo' / 'scripts'))

from yolo_orchestrator import (
    PhaseType,
    PhaseConfig,
    ExecutionContext,
    PhaseResult,
    DEFAULT_PHASE_CONFIGS,
    YOLO_EXECUTION_ORDER,
    get_phase_config,
    get_next_phase,
    is_review_phase,
    is_execution_phase,
    can_execute_phase,
    execute_phase,
    execute_chain,
    create_execution_context,
    get_execution_summary
)


class TestPhaseConfig:
    """阶段配置测试"""

    def test_phase_config_to_dict(self):
        """测试阶段配置转换为字典"""
        config = PhaseConfig(
            phase='P3',
            phase_name='技术方案',
            phase_type=PhaseType.EXECUTION,
            skill_name='ideal-dev-solution',
            agent_name='architect'
        )

        result = config.to_dict()
        assert result['phase'] == 'P3'
        assert result['phase_name'] == '技术方案'
        assert result['phase_type'] == 'execution'
        assert result['skill_name'] == 'ideal-dev-solution'


class TestExecutionContext:
    """执行上下文测试"""

    def test_execution_context_creation(self):
        """测试执行上下文创建"""
        ctx = ExecutionContext(
            iteration_name='test-iteration',
            docs_dir='/docs',
            log_dir='/logs',
            state_file='/state.md',
            current_phase='P3'
        )

        assert ctx.iteration_name == 'test-iteration'
        assert ctx.current_phase == 'P3'
        assert ctx.completed_phases == []

    def test_execution_context_to_dict(self):
        """测试执行上下文转换为字典"""
        ctx = ExecutionContext(
            iteration_name='test',
            docs_dir='/docs',
            log_dir='/logs',
            state_file='/state.md',
            current_phase='P5',
            completed_phases=['P3', 'P4'],
            variables={'key': 'value'}
        )

        result = ctx.to_dict()
        assert result['iteration_name'] == 'test'
        assert result['current_phase'] == 'P5'
        assert result['completed_phases'] == ['P3', 'P4']
        assert result['variables'] == {'key': 'value'}


class TestPhaseResult:
    """阶段执行结果测试"""

    def test_phase_result_success(self):
        """测试成功结果"""
        result = PhaseResult(
            phase='P3',
            success=True,
            output_files=['docs/P3.md'],
            duration=30
        )

        assert result.success is True
        assert result.output_files == ['docs/P3.md']
        assert result.error_message is None

    def test_phase_result_failure(self):
        """测试失败结果"""
        result = PhaseResult(
            phase='P3',
            success=False,
            error_message='执行失败'
        )

        assert result.success is False
        assert result.error_message == '执行失败'

    def test_phase_result_to_dict(self):
        """测试结果转换为字典"""
        result = PhaseResult(
            phase='P4',
            success=True,
            review_passed=True,
            review_score=85.0,
            retry_count=1
        )

        data = result.to_dict()
        assert data['phase'] == 'P4'
        assert data['success'] is True
        assert data['review_passed'] is True
        assert data['review_score'] == 85.0


class TestGetPhaseConfig:
    """获取阶段配置测试"""

    def test_get_execution_phase_config(self):
        """测试获取执行阶段配置"""
        config = get_phase_config('P3')

        assert config is not None
        assert config.phase == 'P3'
        assert config.phase_type == PhaseType.EXECUTION
        assert config.skill_name == 'ideal-dev-solution'

    def test_get_review_phase_config(self):
        """测试获取评审阶段配置"""
        config = get_phase_config('P4')

        assert config is not None
        assert config.phase == 'P4'
        assert config.phase_type == PhaseType.REVIEW

    def test_get_invalid_phase_config(self):
        """测试获取无效阶段配置"""
        config = get_phase_config('P99')
        assert config is None


class TestGetNextPhase:
    """获取下一阶段测试"""

    def test_get_next_phase_normal(self):
        """测试正常获取下一阶段"""
        assert get_next_phase('P3') == 'P4'
        assert get_next_phase('P4') == 'P5'
        assert get_next_phase('P13') == 'P14'

    def test_get_next_phase_last(self):
        """测试最后阶段"""
        assert get_next_phase('P14') is None

    def test_get_next_phase_invalid(self):
        """测试无效阶段"""
        assert get_next_phase('P99') is None


class TestIsReviewPhase:
    """检查评审阶段测试"""

    def test_is_review_phase_true(self):
        """测试是评审阶段"""
        assert is_review_phase('P4') is True
        assert is_review_phase('P6') is True
        assert is_review_phase('P8') is True
        assert is_review_phase('P10') is True
        assert is_review_phase('P12') is True
        assert is_review_phase('P14') is True

    def test_is_review_phase_false(self):
        """测试不是评审阶段"""
        assert is_review_phase('P3') is False
        assert is_review_phase('P5') is False
        assert is_review_phase('P9') is False

    def test_is_review_phase_invalid(self):
        """测试无效阶段"""
        assert is_review_phase('P99') is False


class TestIsExecutionPhase:
    """检查执行阶段测试"""

    def test_is_execution_phase_true(self):
        """测试是执行阶段"""
        assert is_execution_phase('P3') is True
        assert is_execution_phase('P5') is True
        assert is_execution_phase('P7') is True
        assert is_execution_phase('P9') is True
        assert is_execution_phase('P11') is True
        assert is_execution_phase('P13') is True

    def test_is_execution_phase_false(self):
        """测试不是执行阶段"""
        assert is_execution_phase('P4') is False
        assert is_execution_phase('P6') is False


class TestCanExecutePhase:
    """检查可执行阶段测试"""

    def test_can_execute_no_dependency(self, tmp_path):
        """测试无依赖阶段"""
        ctx = ExecutionContext(
            iteration_name='test',
            docs_dir=str(tmp_path),
            log_dir=str(tmp_path / 'logs'),
            state_file=str(tmp_path / 'state.md'),
            current_phase='P3',
            completed_phases=[]
        )

        # P3 无依赖
        assert can_execute_phase(ctx, 'P3') is True

    def test_can_execute_with_satisfied_dependency(self, tmp_path):
        """测试依赖已满足"""
        ctx = ExecutionContext(
            iteration_name='test',
            docs_dir=str(tmp_path),
            log_dir=str(tmp_path / 'logs'),
            state_file=str(tmp_path / 'state.md'),
            current_phase='P4',
            completed_phases=['P3']
        )

        # P4 依赖 P3，P3 已完成
        assert can_execute_phase(ctx, 'P4') is True

    def test_can_execute_with_unsatisfied_dependency(self, tmp_path):
        """测试依赖未满足"""
        ctx = ExecutionContext(
            iteration_name='test',
            docs_dir=str(tmp_path),
            log_dir=str(tmp_path / 'logs'),
            state_file=str(tmp_path / 'state.md'),
            current_phase='P3',
            completed_phases=[]
        )

        # P4 依赖 P3，P3 未完成
        assert can_execute_phase(ctx, 'P4') is False


class TestExecutePhase:
    """执行阶段测试"""

    def test_execute_phase_success(self, tmp_path):
        """测试成功执行阶段"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  completed_phases: []
---

# 流程状态
""", encoding='utf-8')

        ctx = ExecutionContext(
            iteration_name='test',
            docs_dir=str(tmp_path),
            log_dir=str(tmp_path / 'logs'),
            state_file=str(state_file),
            current_phase='P3',
            completed_phases=[]
        )

        def mock_executor(ctx, config):
            return PhaseResult(
                phase=config.phase,
                success=True,
                output_files=['docs/P3.md']
            )

        result = execute_phase(ctx, 'P3', executor=mock_executor)

        assert result.success is True
        assert result.phase == 'P3'

    def test_execute_phase_dependency_not_met(self, tmp_path):
        """测试依赖未满足"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  completed_phases: []
---

# 流程状态
""", encoding='utf-8')

        ctx = ExecutionContext(
            iteration_name='test',
            docs_dir=str(tmp_path),
            log_dir=str(tmp_path / 'logs'),
            state_file=str(state_file),
            current_phase='P3',
            completed_phases=[]
        )

        result = execute_phase(ctx, 'P4')  # P4 依赖 P3

        assert result.success is False
        assert '依赖' in result.error_message

    def test_execute_phase_invalid(self, tmp_path):
        """测试无效阶段"""
        ctx = ExecutionContext(
            iteration_name='test',
            docs_dir=str(tmp_path),
            log_dir=str(tmp_path / 'logs'),
            state_file=str(tmp_path / 'state.md'),
            current_phase='P3',
            completed_phases=[]
        )

        result = execute_phase(ctx, 'P99')

        assert result.success is False
        assert '未找到阶段配置' in result.error_message


class TestExecuteChain:
    """执行阶段链测试"""

    def test_execute_chain_success(self, tmp_path):
        """测试成功执行阶段链"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  completed_phases: []
---

# 流程状态
""", encoding='utf-8')

        ctx = ExecutionContext(
            iteration_name='test',
            docs_dir=str(tmp_path),
            log_dir=str(tmp_path / 'logs'),
            state_file=str(state_file),
            current_phase='P3',
            completed_phases=[]
        )

        def mock_executor(ctx, config):
            return PhaseResult(phase=config.phase, success=True)

        results = execute_chain(ctx, start_phase='P3', end_phase='P4', executor=mock_executor)

        assert len(results) == 2
        assert all(r.success for r in results)
        assert ctx.completed_phases == ['P3', 'P4']

    def test_execute_chain_stop_on_failure(self, tmp_path):
        """测试失败时停止执行"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  completed_phases: []
---

# 流程状态
""", encoding='utf-8')

        ctx = ExecutionContext(
            iteration_name='test',
            docs_dir=str(tmp_path),
            log_dir=str(tmp_path / 'logs'),
            state_file=str(state_file),
            current_phase='P3',
            completed_phases=[]
        )

        call_count = [0]

        def mock_executor(ctx, config):
            call_count[0] += 1
            # P3 成功，P4 失败
            if config.phase == 'P3':
                return PhaseResult(phase=config.phase, success=True)
            else:
                return PhaseResult(phase=config.phase, success=False, error_message='评审失败')

        results = execute_chain(ctx, start_phase='P3', end_phase='P6', executor=mock_executor)

        # P3 成功，P4 失败后停止
        assert len(results) == 2
        assert results[0].success is True
        assert results[1].success is False


class TestCreateExecutionContext:
    """创建执行上下文测试"""

    def test_create_execution_context(self, tmp_path):
        """测试创建执行上下文"""
        docs_dir = tmp_path / 'docs'
        docs_dir.mkdir()
        state_file = docs_dir / '流程状态.md'

        ctx = create_execution_context(
            iteration_name='test-iteration',
            docs_dir=str(docs_dir),
            state_file=str(state_file)
        )

        assert ctx.iteration_name == 'test-iteration'
        assert ctx.docs_dir == str(docs_dir)
        assert 'yolo-logs' in ctx.log_dir
        assert ctx.current_phase == 'P3'


class TestGetExecutionSummary:
    """获取执行摘要测试"""

    def test_get_execution_summary_all_success(self):
        """测试全部成功的摘要"""
        results = [
            PhaseResult(phase='P3', success=True),
            PhaseResult(phase='P4', success=True),
            PhaseResult(phase='P5', success=True),
        ]

        summary = get_execution_summary(results)

        assert summary['total_phases'] == 3
        assert summary['success_count'] == 3
        assert summary['failed_count'] == 0
        assert summary['success_rate'] == 100.0

    def test_get_execution_summary_partial(self):
        """测试部分成功的摘要"""
        results = [
            PhaseResult(phase='P3', success=True),
            PhaseResult(phase='P4', success=False),
            PhaseResult(phase='P5', success=True),
        ]

        summary = get_execution_summary(results)

        assert summary['total_phases'] == 3
        assert summary['success_count'] == 2
        assert summary['failed_count'] == 1
        assert summary['success_rate'] == pytest.approx(66.67, rel=0.01)

    def test_get_execution_summary_empty(self):
        """测试空结果的摘要"""
        summary = get_execution_summary([])

        assert summary['total_phases'] == 0
        assert summary['success_count'] == 0
        assert summary['success_rate'] == 0


class TestDefaultPhaseConfigs:
    """默认阶段配置测试"""

    def test_all_phases_defined(self):
        """测试所有阶段都有配置"""
        expected_phases = ['P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13', 'P14']

        for phase in expected_phases:
            assert phase in DEFAULT_PHASE_CONFIGS
            config = DEFAULT_PHASE_CONFIGS[phase]
            assert config.phase == phase
            assert config.phase_name is not None

    def test_execution_phases_have_skills(self):
        """测试执行阶段都有 Skill 配置"""
        execution_phases = ['P3', 'P5', 'P7', 'P9', 'P11', 'P13']

        for phase in execution_phases:
            config = DEFAULT_PHASE_CONFIGS[phase]
            assert config.skill_name is not None
            assert config.agent_name is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
