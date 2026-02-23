import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { TemplateManager, TemplateVariables } from '../src/services/template-manager.js';
import { GitHubClient } from '../src/clients/github-client.js';

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

describe('TemplateManager', () => {
  let manager: TemplateManager;
  let tempDir: string;
  let tempCacheDir: string;
  let mockGitHubClient: GitHubClient;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create temp directories for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ideal-cli-test-'));
    tempCacheDir = path.join(tempDir, 'cache');

    // Create mock GitHubClient
    mockGitHubClient = {
      getContents: vi.fn(),
      getFileContent: vi.fn(),
      getFileByUrl: vi.fn(),
      getVersion: vi.fn(),
      fetchDirectory: vi.fn(),
      repoExists: vi.fn(),
      pathExists: vi.fn(),
    } as unknown as GitHubClient;

    manager = new TemplateManager({
      cacheDir: tempCacheDir,
      verbose: true,
      githubClient: mockGitHubClient,
    });
  });

  afterEach(async () => {
    await fs.remove(tempDir);
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create manager with default config', () => {
      const defaultManager = new TemplateManager();
      expect(defaultManager).toBeDefined();
    });

    it('should use custom cache directory', () => {
      const customManager = new TemplateManager({
        cacheDir: '/custom/cache',
      });
      expect(customManager.getCachePath()).toBe('/custom/cache');
    });

    it('should use default home directory cache', () => {
      const defaultManager = new TemplateManager();
      expect(defaultManager.getCachePath()).toBe(
        path.join(os.homedir(), '.ideal-cli', 'cache')
      );
    });
  });

  describe('getCachePath', () => {
    it('should return cache directory path', () => {
      expect(manager.getCachePath()).toBe(tempCacheDir);
    });
  });

  describe('fetchTemplate', () => {
    it('should use cache when available and not forced', async () => {
      // Create cached files
      const cachePath = path.join(
        tempCacheDir,
        'ideal-lab',
        'best-practices/dev-workflow'
      );
      await fs.ensureDir(cachePath);
      await fs.writeFile(path.join(cachePath, 'test.md'), 'content');

      const count = await manager.fetchTemplate(false);

      expect(count).toBe(1);
      expect(mockGitHubClient.fetchDirectory).not.toHaveBeenCalled();
    });

    it('should handle empty directory', async () => {
      vi.mocked(mockGitHubClient.fetchDirectory).mockResolvedValue([]);

      const count = await manager.fetchTemplate(true);

      expect(count).toBe(0);
    });
  });

  describe('getTemplateVersion', () => {
    it('should fetch version from GitHub', async () => {
      const mockVersion = {
        version: '1.0.0',
        releasedAt: '2024-01-01',
        minCliVersion: '0.1.0',
      };

      vi.mocked(mockGitHubClient.getVersion).mockResolvedValue(mockVersion);

      const result = await manager.getTemplateVersion();

      expect(result).toEqual(mockVersion);
    });
  });

  describe('getCachedVersion', () => {
    it('should return null when no cached version', async () => {
      const result = await manager.getCachedVersion();
      expect(result).toBeNull();
    });

    it('should return cached version when available', async () => {
      const versionData = {
        version: '1.0.0',
        releasedAt: '2024-01-01',
        minCliVersion: '0.1.0',
      };

      await fs.ensureDir(tempCacheDir);
      await fs.writeFile(
        path.join(tempCacheDir, 'version.json'),
        JSON.stringify(versionData)
      );

      const result = await manager.getCachedVersion();

      expect(result).toEqual(versionData);
    });

    it('should return null for invalid JSON', async () => {
      await fs.ensureDir(tempCacheDir);
      await fs.writeFile(
        path.join(tempCacheDir, 'version.json'),
        'invalid json'
      );

      const result = await manager.getCachedVersion();

      expect(result).toBeNull();
    });
  });

  describe('hasUpdate', () => {
    it('should return true when no cached version', async () => {
      vi.mocked(mockGitHubClient.getVersion).mockResolvedValue({
        version: '1.0.0',
        releasedAt: '2024-01-01',
        minCliVersion: '0.1.0',
      });

      const result = await manager.hasUpdate();

      expect(result).toBe(true);
    });

    it('should return true when versions differ', async () => {
      // Create cached version
      await fs.ensureDir(tempCacheDir);
      await fs.writeFile(
        path.join(tempCacheDir, 'version.json'),
        JSON.stringify({
          version: '0.9.0',
          releasedAt: '2023-01-01',
          minCliVersion: '0.1.0',
        })
      );

      vi.mocked(mockGitHubClient.getVersion).mockResolvedValue({
        version: '1.0.0',
        releasedAt: '2024-01-01',
        minCliVersion: '0.1.0',
      });

      const result = await manager.hasUpdate();

      expect(result).toBe(true);
    });

    it('should return false when versions match', async () => {
      // Create cached version
      await fs.ensureDir(tempCacheDir);
      await fs.writeFile(
        path.join(tempCacheDir, 'version.json'),
        JSON.stringify({
          version: '1.0.0',
          releasedAt: '2024-01-01',
          minCliVersion: '0.1.0',
        })
      );

      vi.mocked(mockGitHubClient.getVersion).mockResolvedValue({
        version: '1.0.0',
        releasedAt: '2024-01-01',
        minCliVersion: '0.1.0',
      });

      const result = await manager.hasUpdate();

      expect(result).toBe(false);
    });

    it('should return false when remote version fetch fails', async () => {
      // Create cached version
      await fs.ensureDir(tempCacheDir);
      await fs.writeFile(
        path.join(tempCacheDir, 'version.json'),
        JSON.stringify({
          version: '1.0.0',
          releasedAt: '2024-01-01',
          minCliVersion: '0.1.0',
        })
      );

      vi.mocked(mockGitHubClient.getVersion).mockRejectedValue(new Error('Network error'));

      const result = await manager.hasUpdate();

      expect(result).toBe(false);
    });
  });

  describe('applyTemplate', () => {
    it('should apply template with variable substitution', async () => {
      // Setup cached template
      const cachePath = path.join(
        tempCacheDir,
        'ideal-lab',
        'best-practices/dev-workflow'
      );
      await fs.ensureDir(cachePath);
      await fs.writeFile(
        path.join(cachePath, 'README.md'),
        '# {{projectName}}\n\nCreated by {{author}}'
      );
      await fs.writeFile(
        path.join(cachePath, 'config.json'),
        '{"name": "{{projectName}}"}'
      );

      const targetDir = path.join(tempDir, 'project');
      const variables: TemplateVariables = {
        projectName: 'my-project',
        author: 'John Doe',
      };

      const count = await manager.applyTemplate(targetDir, variables);

      expect(count).toBe(2);

      // Verify content was substituted
      const readme = await fs.readFile(path.join(targetDir, 'README.md'), 'utf-8');
      expect(readme).toBe('# my-project\n\nCreated by John Doe');

      const config = await fs.readFile(path.join(targetDir, 'config.json'), 'utf-8');
      expect(config).toBe('{"name": "my-project"}');
    });
  });

  describe('applyTemplateWithFilter', () => {
    it('should only process files that pass filter', async () => {
      // Setup cached template
      const cachePath = path.join(
        tempCacheDir,
        'ideal-lab',
        'best-practices/dev-workflow'
      );
      await fs.ensureDir(cachePath);
      await fs.writeFile(path.join(cachePath, 'include.md'), 'content');
      await fs.writeFile(path.join(cachePath, 'exclude.txt'), 'excluded');

      const targetDir = path.join(tempDir, 'project');
      const count = await manager.applyTemplateWithFilter(
        targetDir,
        { projectName: 'test' },
        (filePath) => filePath.endsWith('.md')
      );

      expect(count).toBe(1);
      expect(await fs.pathExists(path.join(targetDir, 'include.md'))).toBe(true);
      expect(await fs.pathExists(path.join(targetDir, 'exclude.txt'))).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should remove cache directory', async () => {
      // Create some cached content
      await fs.ensureDir(tempCacheDir);
      await fs.writeFile(path.join(tempCacheDir, 'test.txt'), 'content');

      await manager.clearCache();

      expect(await fs.pathExists(tempCacheDir)).toBe(false);
    });

    it('should not throw when cache does not exist', async () => {
      await expect(manager.clearCache()).resolves.not.toThrow();
    });
  });

  describe('isCached', () => {
    it('should return false when not cached', async () => {
      const result = await manager.isCached();
      expect(result).toBe(false);
    });

    it('should return true when cached', async () => {
      const cachePath = path.join(
        tempCacheDir,
        'ideal-lab',
        'best-practices/dev-workflow'
      );
      await fs.ensureDir(cachePath);

      const result = await manager.isCached();
      expect(result).toBe(true);
    });
  });

  describe('getCachedFiles', () => {
    it('should return empty array when not cached', async () => {
      const files = await manager.getCachedFiles();
      expect(files).toEqual([]);
    });

    it('should return list of cached files', async () => {
      const cachePath = path.join(
        tempCacheDir,
        'ideal-lab',
        'best-practices/dev-workflow'
      );
      await fs.ensureDir(cachePath);
      await fs.writeFile(path.join(cachePath, 'file1.md'), 'content1');
      await fs.writeFile(path.join(cachePath, 'file2.md'), 'content2');

      const files = await manager.getCachedFiles();

      expect(files.length).toBe(2);
      expect(files.some((f) => f.endsWith('file1.md'))).toBe(true);
      expect(files.some((f) => f.endsWith('file2.md'))).toBe(true);
    });
  });

  describe('getFileType', () => {
    it('should identify agent files', () => {
      expect(manager.getFileType('agents/pm.md')).toBe('agent');
      expect(manager.getFileType('.claude/agents/architect.md')).toBe('agent');
    });

    it('should identify skill files', () => {
      expect(manager.getFileType('skills/ideal-requirement/skill.md')).toBe('skill');
      expect(manager.getFileType('.claude/skills/ideal-dev-plan/skill.md')).toBe('skill');
    });

    it('should identify config files', () => {
      expect(manager.getFileType('project.config.md')).toBe('config');
      expect(manager.getFileType('CLAUDE.md')).toBe('config');
    });

    it('should identify script files', () => {
      expect(manager.getFileType('scripts/setup.sh')).toBe('script');
      expect(manager.getFileType('install.ps1')).toBe('script');
    });

    it('should default to config for unknown types', () => {
      expect(manager.getFileType('docs/readme.md')).toBe('config');
    });
  });
});
