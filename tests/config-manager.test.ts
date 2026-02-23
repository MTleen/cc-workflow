import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import {
  ConfigManager,
  CONFIG_FILE_NAME,
  CONFIG_DIR_NAME,
} from '../src/services/config-manager.js';
import { ProjectConfig } from '../src/types/config.js';

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

describe('ConfigManager', () => {
  let manager: ConfigManager;
  let tempDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    manager = new ConfigManager();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ideal-cli-config-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
    vi.restoreAllMocks();
  });

  describe('getConfigPath', () => {
    it('should return correct config file path', () => {
      const configPath = manager.getConfigPath('/project/root');
      expect(configPath).toBe(path.join('/project/root', CONFIG_DIR_NAME, CONFIG_FILE_NAME));
    });
  });

  describe('getConfigDir', () => {
    it('should return correct config directory path', () => {
      const configDir = manager.getConfigDir('/project/root');
      expect(configDir).toBe(path.join('/project/root', CONFIG_DIR_NAME));
    });
  });

  describe('configExists', () => {
    it('should return false when config does not exist', async () => {
      const exists = await manager.configExists(tempDir);
      expect(exists).toBe(false);
    });

    it('should return true when config exists', async () => {
      const configDir = path.join(tempDir, CONFIG_DIR_NAME);
      await fs.ensureDir(configDir);
      await fs.writeFile(path.join(configDir, CONFIG_FILE_NAME), '---\nprojectName: test\n---');

      const exists = await manager.configExists(tempDir);
      expect(exists).toBe(true);
    });
  });

  describe('read', () => {
    it('should throw error when config file does not exist', async () => {
      await expect(manager.read(tempDir)).rejects.toThrow('配置文件不存在');
    });

    it('should read config with YAML frontmatter', async () => {
      const configDir = path.join(tempDir, CONFIG_DIR_NAME);
      await fs.ensureDir(configDir);
      const configContent = `---
projectName: my-project
gitBranch: main
techStack: React
workflow:
  templateRepo: ideal-lab/best-practices
  templateBranch: main
  lastUpdated: "2024-01-01T00:00:00Z"
initializedAt: "2024-01-01T00:00:00Z"
---

# Project Config
`;
      await fs.writeFile(path.join(configDir, CONFIG_FILE_NAME), configContent);

      const config = await manager.read(tempDir);

      expect(config.projectName).toBe('my-project');
      expect(config.gitBranch).toBe('main');
      expect(config.techStack).toBe('React');
      expect(config.workflow.templateRepo).toBe('ideal-lab/best-practices');
      expect(config.initializedAt).toBe('2024-01-01T00:00:00Z');
    });

    it('should use default values for missing optional fields', async () => {
      const configDir = path.join(tempDir, CONFIG_DIR_NAME);
      await fs.ensureDir(configDir);
      const configContent = `---
projectName: my-project
gitBranch: develop
techStack: Vue
---
`;
      await fs.writeFile(path.join(configDir, CONFIG_FILE_NAME), configContent);

      const config = await manager.read(tempDir);

      expect(config.projectName).toBe('my-project');
      expect(config.gitBranch).toBe('develop');
      expect(config.techStack).toBe('Vue');
      expect(config.workflow.templateRepo).toBe('ideal-lab/best-practices');
    });

    it('should throw error for invalid YAML', async () => {
      const configDir = path.join(tempDir, CONFIG_DIR_NAME);
      await fs.ensureDir(configDir);
      await fs.writeFile(path.join(configDir, CONFIG_FILE_NAME), '---\ninvalid: [yaml: content\n---');

      await expect(manager.read(tempDir)).rejects.toThrow('配置文件解析失败');
    });
  });

  describe('write', () => {
    it('should write config with YAML frontmatter', async () => {
      const config: ProjectConfig = {
        projectName: 'test-project',
        gitBranch: 'main',
        techStack: 'Node.js',
        workflow: {
          templateRepo: 'ideal-lab/best-practices',
          templateBranch: 'main',
          lastUpdated: '2024-01-01T00:00:00Z',
        },
        initializedAt: '2024-01-01T00:00:00Z',
      };

      await manager.write(tempDir, config);

      const configPath = path.join(tempDir, CONFIG_DIR_NAME, CONFIG_FILE_NAME);
      expect(await fs.pathExists(configPath)).toBe(true);

      const content = await fs.readFile(configPath, 'utf-8');
      expect(content).toContain('projectName: test-project');
      expect(content).toContain('gitBranch: main');
      expect(content).toContain('techStack: Node.js');
    });

    it('should create config directory if not exists', async () => {
      const config: ProjectConfig = {
        projectName: 'test-project',
        gitBranch: 'main',
        techStack: 'Other',
        workflow: {
          templateRepo: 'ideal-lab/best-practices',
          templateBranch: 'main',
          lastUpdated: '2024-01-01T00:00:00Z',
        },
        initializedAt: '2024-01-01T00:00:00Z',
      };

      await manager.write(tempDir, config);

      const configDir = path.join(tempDir, CONFIG_DIR_NAME);
      expect(await fs.pathExists(configDir)).toBe(true);
    });

    it('should generate file with header comment', async () => {
      const config: ProjectConfig = {
        projectName: 'test-project',
        gitBranch: 'main',
        techStack: 'Other',
        workflow: {
          templateRepo: 'ideal-lab/best-practices',
          templateBranch: 'main',
          lastUpdated: '2024-01-01T00:00:00Z',
        },
        initializedAt: '2024-01-01T00:00:00Z',
      };

      await manager.write(tempDir, config);

      const configPath = path.join(tempDir, CONFIG_DIR_NAME, CONFIG_FILE_NAME);
      const content = await fs.readFile(configPath, 'utf-8');
      expect(content).toContain('# 项目配置文件');
    });
  });

  describe('validate', () => {
    it('should return invalid for null config', () => {
      const result = manager.validate(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('配置必须是一个对象');
    });

    it('should return invalid for missing required fields', () => {
      const result = manager.validate({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('缺少必填字段: projectName');
      expect(result.errors).toContain('缺少必填字段: gitBranch');
      expect(result.errors).toContain('缺少必填字段: techStack');
    });

    it('should return invalid for invalid techStack', () => {
      const result = manager.validate({
        projectName: 'test',
        gitBranch: 'main',
        techStack: 'InvalidStack',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('techStack 必须是以下值之一'))).toBe(true);
    });

    it('should return valid for complete config', () => {
      const result = manager.validate({
        projectName: 'test',
        gitBranch: 'main',
        techStack: 'React',
        workflow: {
          templateRepo: 'test/repo',
          templateBranch: 'main',
          lastUpdated: '2024-01-01T00:00:00Z',
        },
        initializedAt: '2024-01-01T00:00:00Z',
      });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should add warning for missing workflow', () => {
      const result = manager.validate({
        projectName: 'test',
        gitBranch: 'main',
        techStack: 'React',
        initializedAt: '2024-01-01T00:00:00Z',
      });
      expect(result.warnings).toContain('建议配置 workflow 字段');
    });

    it('should add warning for missing initializedAt', () => {
      const result = manager.validate({
        projectName: 'test',
        gitBranch: 'main',
        techStack: 'React',
        workflow: {
          templateRepo: 'test/repo',
          templateBranch: 'main',
          lastUpdated: '2024-01-01T00:00:00Z',
        },
      });
      expect(result.warnings).toContain('建议配置 initializedAt 字段');
    });

    it('should validate workflow fields', () => {
      const result = manager.validate({
        projectName: 'test',
        gitBranch: 'main',
        techStack: 'React',
        workflow: 'invalid',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('workflow 必须是一个对象');
    });
  });

  describe('createDefaultConfig', () => {
    it('should create config with default values', () => {
      const config = manager.createDefaultConfig('my-project');

      expect(config.projectName).toBe('my-project');
      expect(config.gitBranch).toBe('main');
      expect(config.techStack).toBe('Other');
      expect(config.workflow.templateRepo).toBe('ideal-lab/best-practices');
      expect(config.initializedAt).toBeDefined();
    });

    it('should use provided options', () => {
      const config = manager.createDefaultConfig('my-project', {
        gitBranch: 'develop',
        techStack: 'Vue',
        templateRepo: 'custom/repo',
        templateBranch: 'v1',
      });

      expect(config.gitBranch).toBe('develop');
      expect(config.techStack).toBe('Vue');
      expect(config.workflow.templateRepo).toBe('custom/repo');
      expect(config.workflow.templateBranch).toBe('v1');
    });
  });

  describe('updateWorkflow', () => {
    it('should update workflow fields', async () => {
      // Create initial config
      const config: ProjectConfig = {
        projectName: 'test-project',
        gitBranch: 'main',
        techStack: 'React',
        workflow: {
          templateRepo: 'ideal-lab/best-practices',
          templateBranch: 'main',
          lastUpdated: '2024-01-01T00:00:00Z',
        },
        initializedAt: '2024-01-01T00:00:00Z',
      };
      await manager.write(tempDir, config);

      // Update workflow
      await manager.updateWorkflow(tempDir, {
        templateBranch: 'v2',
        lastUpdated: '2024-02-01T00:00:00Z',
      });

      // Read and verify
      const updatedConfig = await manager.read(tempDir);
      expect(updatedConfig.workflow.templateBranch).toBe('v2');
      expect(updatedConfig.workflow.lastUpdated).toBe('2024-02-01T00:00:00Z');
      expect(updatedConfig.workflow.templateRepo).toBe('ideal-lab/best-practices');
    });
  });

  describe('round trip', () => {
    it('should read what was written', async () => {
      const originalConfig: ProjectConfig = {
        projectName: 'round-trip-test',
        gitBranch: 'develop',
        techStack: 'Python',
        workflow: {
          templateRepo: 'custom/template',
          templateBranch: 'v1.0.0',
          lastUpdated: '2024-06-01T12:00:00Z',
        },
        initializedAt: '2024-01-15T08:30:00Z',
      };

      await manager.write(tempDir, originalConfig);
      const readConfig = await manager.read(tempDir);

      expect(readConfig.projectName).toBe(originalConfig.projectName);
      expect(readConfig.gitBranch).toBe(originalConfig.gitBranch);
      expect(readConfig.techStack).toBe(originalConfig.techStack);
      expect(readConfig.workflow.templateRepo).toBe(originalConfig.workflow.templateRepo);
      expect(readConfig.workflow.templateBranch).toBe(originalConfig.workflow.templateBranch);
      expect(readConfig.initializedAt).toBe(originalConfig.initializedAt);
    });
  });
});
