"""
YOLO Ralph Loop 集成模块测试
"""

import pytest
import tempfile
import json
from pathlib import Path
from datetime import datetime

# 添加脚本目录到 Python 路径
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / '.claude' / 'skills' / 'ideal-yolo' / 'scripts'))

from yolo_ralph import (
    generate_prompt,
    get_execution_state,
    save_state_snapshot,
    check_should_continue,
    send_exit_signal
)


class TestGeneratePrompt:
    """生成执行提示测试"""

    def test_generate_prompt_basic(self, tmp_path):
        """测试基本提示生成"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
  current_phase: P3
  completed_phases: []
  circuit_breaker:
    triggered: false
---

# 流程状态
""", encoding='utf-8')

        output_file = tmp_path / "PROMPT.md"

        result = generate_prompt(str(state_file), str(output_file))

        assert result is True
        assert output_file.exists()
        content = output_file.read_text(encoding='utf-8')
        assert "YOLO 模式执行提示" in content
        assert "P3" in content
        assert "技术方案" in content

    def test_generate_prompt_with_completed_phases(self, tmp_path):
        """测试包含已完成阶段的提示"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
  current_phase: P5
  completed_phases: [P3, P4]
  circuit_breaker:
    triggered: false
---

# 流程状态
""", encoding='utf-8')

        output_file = tmp_path / "PROMPT.md"

        generate_prompt(str(state_file), str(output_file))

        content = output_file.read_text(encoding='utf-8')
        assert "P5" in content
        assert "P3" in content
        assert "P4" in content

    def test_generate_prompt_with_circuit_breaker(self, tmp_path):
        """测试熔断状态的提示"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: paused
  current_phase: P4
  completed_phases: [P3]
  circuit_breaker:
    triggered: true
    reason: 评审连续失败3次
---

# 流程状态
""", encoding='utf-8')

        output_file = tmp_path / "PROMPT.md"

        generate_prompt(str(state_file), str(output_file))

        content = output_file.read_text(encoding='utf-8')
        assert "熔断" in content
        assert "评审连续失败3次" in content


class TestGetExecutionState:
    """获取执行状态测试"""

    def test_get_execution_state(self, tmp_path):
        """测试获取执行状态"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
  current_phase: P5
  completed_phases: [P3, P4]
  circuit_breaker:
    triggered: false
    retry_count: 0
---

# 流程状态
""", encoding='utf-8')

        state = get_execution_state(str(state_file))

        assert state['yolo_mode']['enabled'] is True
        assert state['yolo_mode']['status'] == "in_progress"
        assert state['yolo_mode']['current_phase'] == "P5"
        assert state['yolo_mode']['completed_phases'] == ["P3", "P4"]
        assert state['circuit_breaker']['triggered'] is False
        assert 'progress' in state
        assert state['progress']['completed_count'] == 2

    def test_get_execution_state_progress(self, tmp_path):
        """测试进度计算"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
  current_phase: P9
  completed_phases: [P3, P4, P5, P6, P7, P8]
  circuit_breaker:
    triggered: false
---

# 流程状态
""", encoding='utf-8')

        state = get_execution_state(str(state_file))

        # 6 / 12 = 50%
        assert state['progress']['completed_count'] == 6
        assert state['progress']['percentage'] == pytest.approx(50.0, rel=0.01)


class TestSaveStateSnapshot:
    """保存状态快照测试"""

    def test_save_state_snapshot(self, tmp_path):
        """测试保存状态快照"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
  current_phase: P3
  completed_phases: []
  circuit_breaker:
    triggered: false
    retry_count: 0
---

# 流程状态
""", encoding='utf-8')

        output_file = tmp_path / "STATE.json"

        result = save_state_snapshot(str(state_file), str(output_file))

        assert result is True
        assert output_file.exists()

        # 验证 JSON 格式
        data = json.loads(output_file.read_text(encoding='utf-8'))
        assert 'timestamp' in data
        assert 'yolo_mode' in data


class TestCheckShouldContinue:
    """检查是否应该继续测试"""

    def test_should_continue_normal(self, tmp_path):
        """测试正常情况应继续"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
  current_phase: P3
  completed_phases: []
  circuit_breaker:
    triggered: false
---

# 流程状态
""", encoding='utf-8')

        result = check_should_continue(str(state_file))

        assert result['should_continue'] is True
        assert result['reason'] is None

    def test_should_not_continue_not_enabled(self, tmp_path):
        """测试未启用不应继续"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: false
  status: pending
  completed_phases: []
  circuit_breaker:
    triggered: false
---

# 流程状态
""", encoding='utf-8')

        result = check_should_continue(str(state_file))

        assert result['should_continue'] is False
        assert "未启用" in result['reason']

    def test_should_not_continue_completed(self, tmp_path):
        """测试已完成不应继续"""
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

        result = check_should_continue(str(state_file))

        assert result['should_continue'] is False
        assert "已完成" in result['reason']

    def test_should_not_continue_paused(self, tmp_path):
        """测试暂停不应继续"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: paused
  completed_phases: []
  circuit_breaker:
    triggered: false
---

# 流程状态
""", encoding='utf-8')

        result = check_should_continue(str(state_file))

        assert result['should_continue'] is False
        assert "暂停" in result['reason']

    def test_should_not_continue_circuit_breaker(self, tmp_path):
        """测试熔断不应继续"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: in_progress
  completed_phases: []
  circuit_breaker:
    triggered: true
    reason: 测试熔断
---

# 流程状态
""", encoding='utf-8')

        result = check_should_continue(str(state_file))

        assert result['should_continue'] is False
        assert "熔断" in result['reason']

    def test_should_not_continue_error(self, tmp_path):
        """测试错误状态不应继续"""
        state_file = tmp_path / "流程状态.md"
        state_file.write_text("""---
yolo_mode:
  enabled: true
  status: error
  completed_phases: []
  circuit_breaker:
    triggered: false
---

# 流程状态
""", encoding='utf-8')

        result = check_should_continue(str(state_file))

        assert result['should_continue'] is False
        assert "错误" in result['reason']


class TestSendExitSignal:
    """发送退出信号测试"""

    def test_send_exit_signal(self, tmp_path):
        """测试发送退出信号"""
        log_dir = tmp_path / "logs"
        log_dir.mkdir()

        result = send_exit_signal(str(log_dir))

        assert result is True

        control_file = log_dir / ".ralph_control"
        assert control_file.exists()
        assert "EXIT_SIGNAL" in control_file.read_text()


class TestRalphLoopScript:
    """Ralph Loop 脚本测试"""

    def test_ralph_loop_script_exists(self):
        """测试脚本文件存在"""
        script_path = Path(__file__).parent.parent / '.claude' / 'ralph' / 'ralph-loop.sh'
        assert script_path.exists()

    def test_hook_scripts_exist(self):
        """测试钩子脚本存在"""
        hooks_dir = Path(__file__).parent.parent / '.claude' / 'ralph' / 'hooks'

        assert (hooks_dir / 'pre-phase.sh').exists()
        assert (hooks_dir / 'post-phase.sh').exists()
        assert (hooks_dir / 'on-error.sh').exists()
        assert (hooks_dir / 'on-complete.sh').exists()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
