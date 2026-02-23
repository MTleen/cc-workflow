import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import {
  detectProjectRoot,
  detectTechStack,
  detectGitRepo,
  getGitBranch,
  getGitRemoteUrl,
  extractProjectNameFromGitUrl,
  detectPackageManager,
  getProjectNameFromPackageJson,
  detectProjectName,
  detectIdealInitialized,
  detectProjectInfo,
  DetectedProjectInfo,
} from '../src/utils/detector.js';

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

describe('detector utilities', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ideal-cli-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
    vi.restoreAllMocks();
  });

  describe('detectProjectRoot', () => {
    it('should return null for empty directory', async () => {
      const result = await detectProjectRoot(tempDir);
      expect(result).toBeNull();
    });

    it('should detect project with .ideal directory', async () => {
      await fs.ensureDir(path.join(tempDir, '.ideal'));
      const result = await detectProjectRoot(tempDir);
      expect(result).toBe(tempDir);
    });

    it('should detect project with package.json', async () => {
      await fs.writeJson(path.join(tempDir, 'package.json'), { name: 'test' });
      const result = await detectProjectRoot(tempDir);
      expect(result).toBe(tempDir);
    });

    it('should detect project in parent directory', async () => {
      await fs.writeJson(path.join(tempDir, 'package.json'), { name: 'test' });
      const subDir = path.join(tempDir, 'src', 'components');
      await fs.ensureDir(subDir);

      const result = await detectProjectRoot(subDir);
      expect(result).toBe(tempDir);
    });

    it('should detect Python project with requirements.txt', async () => {
      await fs.writeFile(path.join(tempDir, 'requirements.txt'), 'flask==2.0.0');
      const result = await detectProjectRoot(tempDir);
      expect(result).toBe(tempDir);
    });

    it('should detect Python project with pyproject.toml', async () => {
      await fs.writeFile(path.join(tempDir, 'pyproject.toml'), '[project]\nname = "test"');
      const result = await detectProjectRoot(tempDir);
      expect(result).toBe(tempDir);
    });
  });

  describe('detectTechStack', () => {
    it('should detect Node.js from package.json', async () => {
      await fs.writeJson(path.join(tempDir, 'package.json'), { name: 'test' });
      const result = await detectTechStack(tempDir);
      expect(result).toBe('Node.js');
    });

    it('should detect React from dependencies', async () => {
      await fs.writeJson(path.join(tempDir, 'package.json'), {
        name: 'test',
        dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
      });
      const result = await detectTechStack(tempDir);
      expect(result).toBe('React');
    });

    it('should detect Vue from dependencies', async () => {
      await fs.writeJson(path.join(tempDir, 'package.json'), {
        name: 'test',
        dependencies: { vue: '^3.0.0' },
      });
      const result = await detectTechStack(tempDir);
      expect(result).toBe('Vue');
    });

    it('should detect Python from requirements.txt', async () => {
      await fs.writeFile(path.join(tempDir, 'requirements.txt'), 'flask==2.0.0');
      const result = await detectTechStack(tempDir);
      expect(result).toBe('Python');
    });

    it('should detect Python from pyproject.toml', async () => {
      await fs.writeFile(path.join(tempDir, 'pyproject.toml'), '[project]\nname = "test"');
      const result = await detectTechStack(tempDir);
      expect(result).toBe('Python');
    });

    it('should return Other for unknown projects', async () => {
      const result = await detectTechStack(tempDir);
      expect(result).toBe('Other');
    });
  });

  describe('detectGitRepo', () => {
    it('should return false for non-git directory', async () => {
      const result = await detectGitRepo(tempDir);
      expect(result).toBe(false);
    });

    it('should return true for git directory', async () => {
      await fs.ensureDir(path.join(tempDir, '.git'));
      const result = await detectGitRepo(tempDir);
      expect(result).toBe(true);
    });
  });

  describe('getGitBranch', () => {
    it('should return null for non-git directory', () => {
      const result = getGitBranch(tempDir);
      expect(result).toBeNull();
    });
  });

  describe('getGitRemoteUrl', () => {
    it('should return null for non-git directory', () => {
      const result = getGitRemoteUrl(tempDir);
      expect(result).toBeNull();
    });
  });

  describe('extractProjectNameFromGitUrl', () => {
    it('should extract name from HTTPS URL', () => {
      const result = extractProjectNameFromGitUrl(
        'https://github.com/owner/my-project.git'
      );
      expect(result).toBe('my-project');
    });

    it('should extract name from SSH URL', () => {
      const result = extractProjectNameFromGitUrl(
        'git@github.com:owner/my-project.git'
      );
      expect(result).toBe('my-project');
    });

    it('should handle URL without .git suffix', () => {
      const result = extractProjectNameFromGitUrl(
        'https://github.com/owner/my-project'
      );
      expect(result).toBe('my-project');
    });

    it('should handle nested path', () => {
      const result = extractProjectNameFromGitUrl(
        'https://github.com/org/group/my-project.git'
      );
      expect(result).toBe('my-project');
    });
  });

  describe('detectPackageManager', () => {
    it('should detect npm from package-lock.json', async () => {
      await fs.writeFile(path.join(tempDir, 'package.json'), '{}');
      await fs.writeFile(path.join(tempDir, 'package-lock.json'), '{}');
      const result = await detectPackageManager(tempDir);
      expect(result).toBe('npm');
    });

    it('should detect yarn from yarn.lock', async () => {
      await fs.writeFile(path.join(tempDir, 'package.json'), '{}');
      await fs.writeFile(path.join(tempDir, 'yarn.lock'), '');
      const result = await detectPackageManager(tempDir);
      expect(result).toBe('yarn');
    });

    it('should detect pnpm from pnpm-lock.yaml', async () => {
      await fs.writeFile(path.join(tempDir, 'package.json'), '{}');
      await fs.writeFile(path.join(tempDir, 'pnpm-lock.yaml'), '');
      const result = await detectPackageManager(tempDir);
      expect(result).toBe('pnpm');
    });

    it('should default to npm for package.json without lock file', async () => {
      await fs.writeFile(path.join(tempDir, 'package.json'), '{}');
      const result = await detectPackageManager(tempDir);
      expect(result).toBe('npm');
    });

    it('should return unknown for non-Node.js project', async () => {
      const result = await detectPackageManager(tempDir);
      expect(result).toBe('unknown');
    });
  });

  describe('getProjectNameFromPackageJson', () => {
    it('should return name from package.json', async () => {
      await fs.writeJson(path.join(tempDir, 'package.json'), { name: 'my-project' });
      const result = await getProjectNameFromPackageJson(tempDir);
      expect(result).toBe('my-project');
    });

    it('should return null for missing package.json', async () => {
      const result = await getProjectNameFromPackageJson(tempDir);
      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      await fs.writeFile(path.join(tempDir, 'package.json'), 'invalid json');
      const result = await getProjectNameFromPackageJson(tempDir);
      expect(result).toBeNull();
    });
  });

  describe('detectProjectName', () => {
    it('should get name from package.json', async () => {
      await fs.writeJson(path.join(tempDir, 'package.json'), { name: 'my-project' });
      const result = await detectProjectName(tempDir);
      expect(result).toBe('my-project');
    });

    it('should fall back to directory name', async () => {
      const result = await detectProjectName(tempDir);
      expect(result).toBe(path.basename(tempDir));
    });
  });

  describe('detectIdealInitialized', () => {
    it('should return false for uninitialized project', async () => {
      const result = await detectIdealInitialized(tempDir);
      expect(result).toBe(false);
    });

    it('should return false for .ideal directory without config.json', async () => {
      await fs.ensureDir(path.join(tempDir, '.ideal'));
      const result = await detectIdealInitialized(tempDir);
      expect(result).toBe(false);
    });

    it('should return true for initialized project', async () => {
      await fs.ensureDir(path.join(tempDir, '.ideal'));
      await fs.writeJson(path.join(tempDir, '.ideal', 'config.json'), {});
      const result = await detectIdealInitialized(tempDir);
      expect(result).toBe(true);
    });
  });

  describe('detectProjectInfo', () => {
    it('should return null for non-project directory', async () => {
      const result = await detectProjectInfo(tempDir);
      expect(result).toBeNull();
    });

    it('should return project info for valid project', async () => {
      await fs.writeJson(path.join(tempDir, 'package.json'), {
        name: 'test-project',
        dependencies: { express: '^4.0.0' },
      });

      const result = await detectProjectInfo(tempDir);

      expect(result).not.toBeNull();
      expect(result?.projectName).toBe('test-project');
      expect(result?.techStack).toBe('Node.js');
      expect(result?.isGitRepo).toBe(false);
      expect(result?.projectRoot).toBe(tempDir);
      expect(result?.isIdealInitialized).toBe(false);
      expect(result?.packageManager).toBe('npm');
    });
  });
});
