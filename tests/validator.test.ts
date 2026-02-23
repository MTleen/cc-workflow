import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { ProjectValidator } from '../src/services/validator.js';

// Mock logger
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('ProjectValidator', () => {
  let validator: ProjectValidator;
  let tempDir: string;

  beforeEach(async () => {
    validator = new ProjectValidator();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ideal-cli-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create validator with default config', () => {
      const v = new ProjectValidator();
      expect(v).toBeDefined();
    });

    it('should create validator with custom config', () => {
      const v = new ProjectValidator({
        minNodeVersion: '16.0.0',
        minGitVersion: '2.30.0',
      });
      expect(v).toBeDefined();
    });
  });

  describe('checkNodeVersion', () => {
    it('should pass Node.js version check', () => {
      const result = validator.checkNodeVersion();
      expect(result.status).toBe('pass');
      expect(result.name).toBe('Node.js 版本');
    });
  });

  describe('checkGitInstalled', () => {
    it('should check Git installation', () => {
      const result = validator.checkGitInstalled();
      expect(['pass', 'warning', 'error']).toContain(result.status);
      expect(result.name).toBe('Git 安装');
    });
  });

  describe('checkProjectDirectory', () => {
    it('should return warning for non-project directory', async () => {
      const result = await validator.checkProjectDirectory(tempDir);
      expect(result.status).toBe('warning');
      expect(result.name).toBe('项目目录');
    });

    it('should pass for project with package.json', async () => {
      await fs.writeJson(path.join(tempDir, 'package.json'), { name: 'test' });
      const result = await validator.checkProjectDirectory(tempDir);
      expect(result.status).toBe('pass');
    });
  });

  describe('checkGitRepository', () => {
    it('should return warning for non-git directory', async () => {
      const result = await validator.checkGitRepository(tempDir);
      expect(result.status).toBe('warning');
      expect(result.name).toBe('Git 仓库');
    });

    it('should pass for git directory', async () => {
      await fs.ensureDir(path.join(tempDir, '.git'));
      const result = await validator.checkGitRepository(tempDir);
      expect(result.status).toBe('pass');
    });
  });

  describe('checkProjectEmpty', () => {
    it('should pass for empty directory', async () => {
      const result = await validator.checkProjectEmpty(tempDir);
      expect(result.status).toBe('pass');
    });

    it('should return warning for non-empty directory', async () => {
      await fs.writeFile(path.join(tempDir, 'file.txt'), 'content');
      const result = await validator.checkProjectEmpty(tempDir);
      expect(result.status).toBe('warning');
    });
  });

  describe('checkIdealInitialized', () => {
    it('should return error for uninitialized project', async () => {
      const result = await validator.checkIdealInitialized(tempDir);
      expect(result.status).toBe('error');
    });

    it('should return warning for incomplete initialization', async () => {
      await fs.ensureDir(path.join(tempDir, '.ideal'));
      const result = await validator.checkIdealInitialized(tempDir);
      expect(result.status).toBe('warning');
    });

    it('should pass for initialized project', async () => {
      await fs.ensureDir(path.join(tempDir, '.ideal'));
      await fs.writeJson(path.join(tempDir, '.ideal', 'config.json'), {});
      const result = await validator.checkIdealInitialized(tempDir);
      expect(result.status).toBe('pass');
    });
  });

  describe('checkConfigValid', () => {
    it('should return error for missing config', async () => {
      const result = await validator.checkConfigValid(tempDir);
      expect(result.status).toBe('error');
    });

    it('should return error for invalid JSON', async () => {
      await fs.ensureDir(path.join(tempDir, '.ideal'));
      await fs.writeFile(path.join(tempDir, '.ideal', 'config.json'), 'invalid');
      const result = await validator.checkConfigValid(tempDir);
      expect(result.status).toBe('error');
    });

    it('should return warning for incomplete config', async () => {
      await fs.ensureDir(path.join(tempDir, '.ideal'));
      await fs.writeJson(path.join(tempDir, '.ideal', 'config.json'), {
        projectName: 'test',
      });
      const result = await validator.checkConfigValid(tempDir);
      expect(result.status).toBe('warning');
    });

    it('should pass for valid config', async () => {
      await fs.ensureDir(path.join(tempDir, '.ideal'));
      await fs.writeJson(path.join(tempDir, '.ideal', 'config.json'), {
        projectName: 'test',
        gitBranch: 'main',
        techStack: 'Node.js',
        initializedAt: '2024-01-01',
        workflow: {},
      });
      const result = await validator.checkConfigValid(tempDir);
      expect(result.status).toBe('pass');
    });
  });

  describe('checkClaudeMd', () => {
    it('should return warning for missing CLAUDE.md', async () => {
      const result = await validator.checkClaudeMd(tempDir);
      expect(result.status).toBe('warning');
    });

    it('should pass for existing CLAUDE.md', async () => {
      await fs.writeFile(path.join(tempDir, 'CLAUDE.md'), '# Project');
      const result = await validator.checkClaudeMd(tempDir);
      expect(result.status).toBe('pass');
    });
  });

  describe('checkClaudeDirectory', () => {
    it('should return warning for missing .claude directory', async () => {
      const result = await validator.checkClaudeDirectory(tempDir);
      expect(result.status).toBe('warning');
    });

    it('should return warning for incomplete .claude structure', async () => {
      await fs.ensureDir(path.join(tempDir, '.claude'));
      const result = await validator.checkClaudeDirectory(tempDir);
      expect(result.status).toBe('warning');
    });

    it('should pass for complete .claude structure', async () => {
      await fs.ensureDir(path.join(tempDir, '.claude'));
      await fs.ensureDir(path.join(tempDir, '.claude', 'agents'));
      await fs.ensureDir(path.join(tempDir, '.claude', 'skills'));
      const result = await validator.checkClaudeDirectory(tempDir);
      expect(result.status).toBe('pass');
    });
  });

  describe('runAllChecks', () => {
    it('should run all checks and return summary', async () => {
      const result = await validator.runAllChecks(tempDir);

      expect(result.checks.length).toBeGreaterThan(0);
      expect(result.summary).toHaveProperty('passed');
      expect(result.summary).toHaveProperty('warnings');
      expect(result.summary).toHaveProperty('errors');
    });

    it('should include config checks for initialized project', async () => {
      await fs.ensureDir(path.join(tempDir, '.ideal'));
      await fs.writeJson(path.join(tempDir, '.ideal', 'config.json'), {
        projectName: 'test',
        gitBranch: 'main',
        techStack: 'Node.js',
        initializedAt: '2024-01-01',
      });

      const result = await validator.runAllChecks(tempDir);

      // Should include CLAUDE.md and .claude directory checks
      const checkNames = result.checks.map((c) => c.name);
      expect(checkNames).toContain('配置文件');
      expect(checkNames).toContain('CLAUDE.md');
      expect(checkNames).toContain('.claude 目录');
    });
  });

  describe('validateForInit', () => {
    it('should validate that project can be initialized', async () => {
      const result = await validator.validateForInit(tempDir);

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    it('should fail for already initialized project', async () => {
      await fs.ensureDir(path.join(tempDir, '.ideal'));
      await fs.writeJson(path.join(tempDir, '.ideal', 'config.json'), {});

      const result = await validator.validateForInit(tempDir);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateForCommand', () => {
    it('should fail for uninitialized project', async () => {
      const result = await validator.validateForCommand(tempDir);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ideal-cli 未初始化，请先运行 ideal init');
    });

    it('should pass for initialized project', async () => {
      await fs.ensureDir(path.join(tempDir, '.ideal'));
      await fs.writeJson(path.join(tempDir, '.ideal', 'config.json'), {
        projectName: 'test',
        gitBranch: 'main',
        techStack: 'Node.js',
        initializedAt: '2024-01-01',
        workflow: {},
      });

      const result = await validator.validateForCommand(tempDir);

      expect(result.valid).toBe(true);
    });
  });
});
