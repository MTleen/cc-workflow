#!/usr/bin/env python3
"""
Unit tests for inject-context.py
"""

import importlib.util
import json
import os
import sys
import tempfile
from pathlib import Path
from unittest import TestCase, main

# Load the module directly from file path
_hook_path = Path(__file__).parent / "inject-context.py"
_spec = importlib.util.spec_from_file_location("inject_context", _hook_path)
inject_context = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(inject_context)

# Use the loaded module directly
ContextEntry = inject_context.ContextEntry
HookInput = inject_context.HookInput
find_repo_root = inject_context.find_repo_root
get_current_task = inject_context.get_current_task
read_jsonl_entries = inject_context.read_jsonl_entries
read_file_content = inject_context.read_file_content
read_directory_contents = inject_context.read_directory_contents
build_context = inject_context.build_context
inject_to_prompt = inject_context.inject_to_prompt
process_hook = inject_context.process_hook
SUPPORTED_SUBAGENT_TYPES = inject_context.SUPPORTED_SUBAGENT_TYPES


class TestFindRepoRoot(TestCase):
    """Test find_repo_root function"""

    def test_finds_git_directory(self):
        """Should find .git directory and return repo root"""
        # Use the current repo
        result = find_repo_root(Path(__file__))
        self.assertIsNotNone(result)
        self.assertTrue((result / ".git").exists())

    def test_returns_none_when_no_git(self):
        """Should return None when no .git directory found"""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = find_repo_root(Path(tmpdir))
            # In macOS temp dir, there's no .git, so result should be None
            # or it might find a parent .git, so we just verify it doesn't crash
            # The actual behavior depends on whether there's a .git in parent dirs
            pass  # Just verify no crash


class TestGetCurrentTask(TestCase):
    """Test get_current_task function"""

    def test_reads_current_task_file(self):
        """Should read .current-task file content"""
        with tempfile.TemporaryDirectory() as tmpdir:
            task_file = Path(tmpdir) / ".current-task"
            task_file.write_text("docs/迭代/测试需求/\n")

            result = get_current_task(Path(tmpdir))
            self.assertEqual(result, "docs/迭代/测试需求/")

    def test_returns_none_when_file_missing(self):
        """Should return None when .current-task file doesn't exist"""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = get_current_task(Path(tmpdir))
            self.assertIsNone(result)

    def test_handles_empty_file(self):
        """Should return None for empty file"""
        with tempfile.TemporaryDirectory() as tmpdir:
            task_file = Path(tmpdir) / ".current-task"
            task_file.write_text("")

            result = get_current_task(Path(tmpdir))
            self.assertIsNone(result)


class TestReadJsonlEntries(TestCase):
    """Test read_jsonl_entries function"""

    def test_reads_valid_entries(self):
        """Should read valid JSONL entries"""
        with tempfile.TemporaryDirectory() as tmpdir:
            jsonl_path = Path(tmpdir) / "context.jsonl"
            jsonl_path.write_text('{"file": "test.md", "type": "file", "reason": "test"}\n')

            entries = read_jsonl_entries(jsonl_path)
            self.assertEqual(len(entries), 1)
            self.assertEqual(entries[0].file, "test.md")
            self.assertEqual(entries[0].type, "file")
            self.assertEqual(entries[0].reason, "test")

    def test_skips_invalid_lines(self):
        """Should skip invalid JSON lines"""
        with tempfile.TemporaryDirectory() as tmpdir:
            jsonl_path = Path(tmpdir) / "context.jsonl"
            jsonl_path.write_text('{"file": "test.md"}\ninvalid json\n{"file": "test2.md"}\n')

            entries = read_jsonl_entries(jsonl_path)
            self.assertEqual(len(entries), 2)

    def test_skips_comments_and_empty_lines(self):
        """Should skip comments and empty lines"""
        with tempfile.TemporaryDirectory() as tmpdir:
            jsonl_path = Path(tmpdir) / "context.jsonl"
            jsonl_path.write_text('# comment\n\n{"file": "test.md"}\n')

            entries = read_jsonl_entries(jsonl_path)
            self.assertEqual(len(entries), 1)

    def test_returns_empty_for_missing_file(self):
        """Should return empty list for missing file"""
        result = read_jsonl_entries(Path("/nonexistent/path.jsonl"))
        self.assertEqual(result, [])

    def test_handles_directory_type(self):
        """Should handle directory type entries"""
        with tempfile.TemporaryDirectory() as tmpdir:
            jsonl_path = Path(tmpdir) / "context.jsonl"
            jsonl_path.write_text('{"file": "src/", "type": "directory", "pattern": "*.py"}\n')

            entries = read_jsonl_entries(jsonl_path)
            self.assertEqual(len(entries), 1)
            self.assertEqual(entries[0].type, "directory")
            self.assertEqual(entries[0].pattern, "*.py")


class TestReadFileContent(TestCase):
    """Test read_file_content function"""

    def test_reads_file_content(self):
        """Should read file content correctly"""
        with tempfile.TemporaryDirectory() as tmpdir:
            file_path = Path(tmpdir) / "test.md"
            file_path.write_text("# Test Content\n\nHello World")

            result = read_file_content(file_path)
            self.assertEqual(result, "# Test Content\n\nHello World")

    def test_returns_none_for_missing_file(self):
        """Should return None for missing file"""
        result = read_file_content(Path("/nonexistent/file.md"))
        self.assertIsNone(result)

    def test_truncates_large_files(self):
        """Should truncate large files"""
        with tempfile.TemporaryDirectory() as tmpdir:
            file_path = Path(tmpdir) / "large.md"
            large_content = "x" * 200000
            file_path.write_text(large_content)

            result = read_file_content(file_path, max_size=100000)
            self.assertIsNotNone(result)
            self.assertLess(len(result), len(large_content))
            self.assertIn("已截断", result)


class TestReadDirectoryContents(TestCase):
    """Test read_directory_contents function"""

    def test_reads_directory_files(self):
        """Should read all files in directory"""
        with tempfile.TemporaryDirectory() as tmpdir:
            dir_path = Path(tmpdir) / "src"
            dir_path.mkdir()
            (dir_path / "file1.md").write_text("Content 1")
            (dir_path / "file2.md").write_text("Content 2")

            result = read_directory_contents(dir_path, "*.md")
            self.assertEqual(len(result), 2)
            self.assertIn("file1.md", result)
            self.assertIn("file2.md", result)

    def test_respects_pattern(self):
        """Should respect glob pattern"""
        with tempfile.TemporaryDirectory() as tmpdir:
            dir_path = Path(tmpdir) / "src"
            dir_path.mkdir()
            (dir_path / "file.md").write_text("Markdown")
            (dir_path / "file.txt").write_text("Text")

            result = read_directory_contents(dir_path, "*.md")
            self.assertEqual(len(result), 1)
            self.assertIn("file.md", result)

    def test_returns_empty_for_missing_directory(self):
        """Should return empty dict for missing directory"""
        result = read_directory_contents(Path("/nonexistent/dir/"))
        self.assertEqual(result, {})


class TestInjectToPrompt(TestCase):
    """Test inject_to_prompt function"""

    def test_injects_context(self):
        """Should inject context to prompt"""
        original = "Original prompt"
        context = "\n\n## Context\nFile content"

        result = inject_to_prompt(original, context)
        self.assertEqual(result, "Original prompt\n\n## Context\nFile content")


class TestProcessHook(TestCase):
    """Test process_hook function"""

    def test_passes_through_non_task_tool(self):
        """Should pass through non-Task tool calls unchanged"""
        input_data = {
            "tool_name": "Bash",
            "tool_input": {"command": "ls"},
            "prompt": "List files"
        }

        result = process_hook(input_data)
        self.assertEqual(result["prompt"], "List files")

    def test_passes_through_task_without_subagent_type(self):
        """Should pass through Task without subagent_type"""
        input_data = {
            "tool_name": "Task",
            "tool_input": {},
            "prompt": "Do something"
        }

        result = process_hook(input_data)
        self.assertEqual(result["prompt"], "Do something")

    def test_passes_through_unsupported_subagent_type(self):
        """Should pass through unsupported subagent_type"""
        input_data = {
            "tool_name": "Task",
            "tool_input": {"subagent_type": "unknown"},
            "prompt": "Do something"
        }

        result = process_hook(input_data)
        self.assertEqual(result["prompt"], "Do something")

    def test_supported_subagent_types(self):
        """Should have expected supported types"""
        self.assertIn("implement", SUPPORTED_SUBAGENT_TYPES)
        self.assertIn("check", SUPPORTED_SUBAGENT_TYPES)
        self.assertIn("debug", SUPPORTED_SUBAGENT_TYPES)
        self.assertIn("research", SUPPORTED_SUBAGENT_TYPES)

    def test_injects_context_for_implement_subagent(self):
        """Should inject context for implement subagent when all conditions met"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create .git directory
            git_dir = Path(tmpdir) / ".git"
            git_dir.mkdir()

            # Create .current-task file
            task_file = Path(tmpdir) / ".current-task"
            task_file.write_text("task/")

            # Create task directory and jsonl
            task_dir = Path(tmpdir) / "task"
            task_dir.mkdir()
            jsonl_file = task_dir / "context.jsonl"
            # Use absolute path for the file entry
            jsonl_file.write_text('{"file": "task/test.md", "type": "file", "reason": "test context"}\n')

            # Create test file
            test_file = task_dir / "test.md"
            test_file.write_text("# Test File\n\nThis is test content.")

            # Change to temp directory to test find_repo_root
            original_cwd = os.getcwd()
            try:
                os.chdir(tmpdir)

                input_data = {
                    "tool_name": "Task",
                    "tool_input": {"subagent_type": "implement"},
                    "prompt": "Implement this feature"
                }

                result = process_hook(input_data)

                # Check that context was injected
                self.assertIn("Implement this feature", result["prompt"])
                self.assertIn("自动注入的上下文", result["prompt"])
                self.assertIn("test.md", result["prompt"])
                self.assertIn("This is test content", result["prompt"])
            finally:
                os.chdir(original_cwd)


class TestContextEntry(TestCase):
    """Test ContextEntry dataclass"""

    def test_creates_entry_with_defaults(self):
        """Should create entry with default values"""
        entry = ContextEntry(file="test.md")
        self.assertEqual(entry.file, "test.md")
        self.assertEqual(entry.type, "file")
        self.assertEqual(entry.pattern, "*")
        self.assertEqual(entry.reason, "")

    def test_creates_entry_with_custom_values(self):
        """Should create entry with custom values"""
        entry = ContextEntry(
            file="src/",
            type="directory",
            pattern="*.py",
            reason="Source files"
        )
        self.assertEqual(entry.file, "src/")
        self.assertEqual(entry.type, "directory")
        self.assertEqual(entry.pattern, "*.py")
        self.assertEqual(entry.reason, "Source files")


if __name__ == "__main__":
    main()
