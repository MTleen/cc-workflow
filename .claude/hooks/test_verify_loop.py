#!/usr/bin/env python3
"""
Unit tests for verify-loop.py
"""

import importlib.util
import json
import os
import sys
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from unittest import TestCase, main

# Load the module directly from file path
_hook_path = Path(__file__).parent / "verify-loop.py"
_spec = importlib.util.spec_from_file_location("verify_loop", _hook_path)
verify_loop = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(verify_loop)

# Use the loaded module directly
VerifyState = verify_loop.VerifyState
parse_yaml_simple = verify_loop.parse_yaml_simple
get_verify_commands = verify_loop.get_verify_commands
run_verify_commands = verify_loop.run_verify_commands
load_state = verify_loop.load_state
save_state = verify_loop.save_state
check_timeout = verify_loop.check_timeout
process_hook = verify_loop.process_hook
MAX_ITERATIONS = verify_loop.MAX_ITERATIONS
TIMEOUT_MINUTES = verify_loop.TIMEOUT_MINUTES


class TestParseYamlSimple(TestCase):
    """Test parse_yaml_simple function"""

    def test_parses_key_value(self):
        """Should parse key: value pairs"""
        yaml = "worktree_dir: ../worktrees\n"
        result = parse_yaml_simple(yaml)
        self.assertEqual(result.get("worktree_dir"), "../worktrees")

    def test_parses_list(self):
        """Should parse list items"""
        yaml = "verify:\n  - pnpm lint\n  - pnpm test\n"
        result = parse_yaml_simple(yaml)
        self.assertIn("verify", result)
        self.assertIn("pnpm lint", result["verify"])
        self.assertIn("pnpm test", result["verify"])

    def test_skips_comments(self):
        """Should skip comment lines"""
        yaml = "# comment\nkey: value\n"
        result = parse_yaml_simple(yaml)
        self.assertEqual(result.get("key"), "value")
        self.assertNotIn("# comment", result)

    def test_handles_empty_content(self):
        """Should handle empty content"""
        result = parse_yaml_simple("")
        self.assertEqual(result, {})


class TestGetVerifyCommands(TestCase):
    """Test get_verify_commands function"""

    def test_returns_commands_from_config(self):
        """Should return verify commands from worktree.yaml"""
        with tempfile.TemporaryDirectory() as tmpdir:
            ideal_dir = Path(tmpdir) / ".ideal"
            ideal_dir.mkdir()
            worktree_yaml = ideal_dir / "worktree.yaml"
            worktree_yaml.write_text("verify:\n  - echo test\n  - echo test2\n")

            commands = get_verify_commands(Path(tmpdir))
            self.assertEqual(len(commands), 2)
            self.assertIn("echo test", commands)

    def test_returns_empty_for_missing_config(self):
        """Should return empty list when config doesn't exist"""
        with tempfile.TemporaryDirectory() as tmpdir:
            commands = get_verify_commands(Path(tmpdir))
            self.assertEqual(commands, [])

    def test_handles_single_command(self):
        """Should handle single command as string"""
        with tempfile.TemporaryDirectory() as tmpdir:
            ideal_dir = Path(tmpdir) / ".ideal"
            ideal_dir.mkdir()
            worktree_yaml = ideal_dir / "worktree.yaml"
            worktree_yaml.write_text("verify: echo single\n")

            commands = get_verify_commands(Path(tmpdir))
            self.assertEqual(len(commands), 1)
            self.assertEqual(commands[0], "echo single")


class TestRunVerifyCommands(TestCase):
    """Test run_verify_commands function"""

    def test_all_commands_pass(self):
        """Should return True when all commands pass"""
        commands = ["echo test", "echo test2"]
        passed, message = run_verify_commands(commands)
        self.assertTrue(passed)
        self.assertIn("2 verify commands passed", message)

    def test_command_fails(self):
        """Should return False when command fails"""
        commands = ["exit 1"]
        passed, message = run_verify_commands(commands)
        self.assertFalse(passed)
        self.assertIn("failed", message)

    def test_empty_commands(self):
        """Should return True for empty command list"""
        passed, message = run_verify_commands([])
        self.assertTrue(passed)
        self.assertIn("No verify commands", message)

    def test_handles_timeout(self):
        """Should handle command timeout"""
        # Use a long-running command
        commands = ["sleep 200"]
        passed, message = run_verify_commands(commands)
        self.assertFalse(passed)
        self.assertIn("timed out", message)


class TestVerifyState(TestCase):
    """Test VerifyState dataclass"""

    def test_creates_with_defaults(self):
        """Should create state with default values"""
        state = VerifyState(task="test-task")
        self.assertEqual(state.task, "test-task")
        self.assertEqual(state.iteration, 0)
        self.assertTrue(state.started_at)  # Should have a value

    def test_creates_with_custom_values(self):
        """Should create state with custom values"""
        state = VerifyState(
            task="custom-task",
            iteration=3,
            started_at="2024-01-01T00:00:00"
        )
        self.assertEqual(state.task, "custom-task")
        self.assertEqual(state.iteration, 3)
        self.assertEqual(state.started_at, "2024-01-01T00:00:00")


class TestLoadSaveState(TestCase):
    """Test load_state and save_state functions"""

    def test_saves_and_loads_state(self):
        """Should save and load state correctly"""
        with tempfile.TemporaryDirectory() as tmpdir:
            repo_root = Path(tmpdir)
            state = VerifyState(task="test", iteration=2, started_at="2024-01-01T00:00:00")

            save_state(repo_root, state)

            loaded = load_state(repo_root, "test")
            self.assertEqual(loaded.task, "test")
            self.assertEqual(loaded.iteration, 2)
            self.assertEqual(loaded.started_at, "2024-01-01T00:00:00")

    def test_returns_new_state_for_missing_file(self):
        """Should return new state when file doesn't exist"""
        with tempfile.TemporaryDirectory() as tmpdir:
            state = load_state(Path(tmpdir), "new-task")
            self.assertEqual(state.task, "new-task")
            self.assertEqual(state.iteration, 0)

    def test_returns_new_state_for_different_task(self):
        """Should return new state when task doesn't match"""
        with tempfile.TemporaryDirectory() as tmpdir:
            repo_root = Path(tmpdir)
            state = VerifyState(task="task1", iteration=5)
            save_state(repo_root, state)

            loaded = load_state(repo_root, "task2")
            self.assertEqual(loaded.task, "task2")
            self.assertEqual(loaded.iteration, 0)


class TestCheckTimeout(TestCase):
    """Test check_timeout function"""

    def test_returns_false_for_recent_state(self):
        """Should return False for recently started state"""
        state = VerifyState(task="test", started_at=datetime.now().isoformat())
        self.assertFalse(check_timeout(state))

    def test_returns_true_for_old_state(self):
        """Should return True for old state"""
        old_time = (datetime.now() - timedelta(minutes=TIMEOUT_MINUTES + 5)).isoformat()
        state = VerifyState(task="test", started_at=old_time)
        self.assertTrue(check_timeout(state))

    def test_returns_false_for_empty_started_at(self):
        """Should return False when started_at is empty"""
        state = VerifyState(task="test")
        state.started_at = ""
        self.assertFalse(check_timeout(state))


class TestProcessHook(TestCase):
    """Test process_hook function"""

    def test_allows_non_check_agent(self):
        """Should allow stop for non-check agents"""
        input_data = {"subagent_type": "implement"}
        result = process_hook(input_data)
        self.assertEqual(result["decision"], "allow")
        self.assertIn("Not a check agent", result["reason"])

    def test_allows_check_agent_no_verify_config(self):
        """Should allow stop when no verify config"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create .git directory
            git_dir = Path(tmpdir) / ".git"
            git_dir.mkdir()

            original_cwd = os.getcwd()
            try:
                os.chdir(tmpdir)

                input_data = {"subagent_type": "check"}
                result = process_hook(input_data)
                self.assertEqual(result["decision"], "allow")
            finally:
                os.chdir(original_cwd)

    def test_blocks_on_verify_failure(self):
        """Should block stop when verify fails"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create .git directory
            git_dir = Path(tmpdir) / ".git"
            git_dir.mkdir()

            # Create .ideal directory and worktree.yaml
            ideal_dir = Path(tmpdir) / ".ideal"
            ideal_dir.mkdir()
            worktree_yaml = ideal_dir / "worktree.yaml"
            worktree_yaml.write_text("verify:\n  - exit 1\n")

            # Create .current-task
            current_task = Path(tmpdir) / ".current-task"
            current_task.write_text("test-task")

            original_cwd = os.getcwd()
            try:
                os.chdir(tmpdir)

                input_data = {"subagent_type": "check"}
                result = process_hook(input_data)
                self.assertEqual(result["decision"], "block")
                self.assertIn("iteration", result["reason"])
            finally:
                os.chdir(original_cwd)

    def test_allows_on_verify_pass(self):
        """Should allow stop when verify passes"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create .git directory
            git_dir = Path(tmpdir) / ".git"
            git_dir.mkdir()

            # Create .ideal directory and worktree.yaml
            ideal_dir = Path(tmpdir) / ".ideal"
            ideal_dir.mkdir()
            worktree_yaml = ideal_dir / "worktree.yaml"
            worktree_yaml.write_text("verify:\n  - echo pass\n")

            original_cwd = os.getcwd()
            try:
                os.chdir(tmpdir)

                input_data = {"subagent_type": "check"}
                result = process_hook(input_data)
                self.assertEqual(result["decision"], "allow")
                self.assertIn("passed", result["reason"])
            finally:
                os.chdir(original_cwd)


if __name__ == "__main__":
    main()
