/**
 * 配置管理器
 *
 * 负责项目配置的读取、写入和校验
 */

import path from 'path';
import grayMatter from 'gray-matter';
import { ProjectConfig, TechStack } from '../types/config.js';
import {
  readFile,
  writeFile,
  fileExists,
  ensureDir,
} from '../utils/file-system.js';

/**
 * 配置文件名
 */
export const CONFIG_FILE_NAME = 'project-config.md';

/**
 * 配置文件目录
 */
export const CONFIG_DIR_NAME = '.claude';

/**
 * ConfigManager 配置选项
 */
export interface ConfigManagerOptions {
  /** 配置目录名，默认为 .claude */
  configDirName?: string;
}

/**
 * 配置校验结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息列表 */
  errors: string[];
  /** 警告信息列表 */
  warnings: string[];
}

/**
 * 配置管理器类
 *
 * 负责读取、写入和校验项目配置
 */
export class ConfigManager {
  private configDirName: string;

  constructor(options: ConfigManagerOptions = {}) {
    this.configDirName = options.configDirName || CONFIG_DIR_NAME;
  }

  /**
   * 获取配置文件路径
   * @param projectRoot 项目根目录
   * @returns 配置文件完整路径
   */
  getConfigPath(projectRoot: string): string {
    return path.join(projectRoot, this.configDirName, CONFIG_FILE_NAME);
  }

  /**
   * 获取配置目录路径
   * @param projectRoot 项目根目录
   * @returns 配置目录完整路径
   */
  getConfigDir(projectRoot: string): string {
    return path.join(projectRoot, this.configDirName);
  }

  /**
   * 检查配置文件是否存在
   * @param projectRoot 项目根目录
   * @returns 是否存在配置文件
   */
  async configExists(projectRoot: string): Promise<boolean> {
    const configPath = this.getConfigPath(projectRoot);
    return fileExists(configPath);
  }

  /**
   * 读取项目配置
   * @param projectRoot 项目根目录
   * @returns 项目配置对象
   * @throws 如果配置文件不存在或格式错误
   */
  async read(projectRoot: string): Promise<ProjectConfig> {
    const configPath = this.getConfigPath(projectRoot);

    if (!(await fileExists(configPath))) {
      throw new Error(`配置文件不存在: ${configPath}`);
    }

    const content = await readFile(configPath);

    try {
      const { data } = grayMatter(content);

      // 验证并转换配置
      const config = this.parseConfig(data);

      return config;
    } catch (error) {
      throw new Error(
        `配置文件解析失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 写入项目配置
   * @param projectRoot 项目根目录
   * @param config 项目配置对象
   */
  async write(projectRoot: string, config: ProjectConfig): Promise<void> {
    const configDir = this.getConfigDir(projectRoot);
    const configPath = this.getConfigPath(projectRoot);

    // 确保目录存在
    await ensureDir(configDir);

    // 生成配置内容
    const content = this.generateConfigContent(config);

    await writeFile(configPath, content);
  }

  /**
   * 校验配置
   * @param config 项目配置对象
   * @returns 校验结果
   */
  validate(config: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查是否为对象
    if (!config || typeof config !== 'object') {
      return {
        valid: false,
        errors: ['配置必须是一个对象'],
        warnings: [],
      };
    }

    const cfg = config as Record<string, unknown>;

    // 必填字段检查
    const requiredFields: (keyof ProjectConfig)[] = [
      'projectName',
      'gitBranch',
      'techStack',
    ];

    for (const field of requiredFields) {
      if (!cfg[field]) {
        errors.push(`缺少必填字段: ${field}`);
      }
    }

    // 校验 projectName
    if (cfg.projectName !== undefined && typeof cfg.projectName !== 'string') {
      errors.push('projectName 必须是字符串');
    }

    // 校验 gitBranch
    if (cfg.gitBranch !== undefined && typeof cfg.gitBranch !== 'string') {
      errors.push('gitBranch 必须是字符串');
    }

    // 校验 techStack
    const validTechStacks: TechStack[] = [
      'React',
      'Vue',
      'Node.js',
      'Python',
      'Other',
    ];
    if (
      cfg.techStack !== undefined &&
      !validTechStacks.includes(cfg.techStack as TechStack)
    ) {
      errors.push(
        `techStack 必须是以下值之一: ${validTechStacks.join(', ')}`
      );
    }

    // 校验 workflow
    if (cfg.workflow !== undefined) {
      if (typeof cfg.workflow !== 'object') {
        errors.push('workflow 必须是一个对象');
      } else {
        const workflow = cfg.workflow as Record<string, unknown>;
        if (workflow.templateRepo !== undefined && typeof workflow.templateRepo !== 'string') {
          errors.push('workflow.templateRepo 必须是字符串');
        }
        if (workflow.templateBranch !== undefined && typeof workflow.templateBranch !== 'string') {
          errors.push('workflow.templateBranch 必须是字符串');
        }
        if (workflow.lastUpdated !== undefined && typeof workflow.lastUpdated !== 'string') {
          errors.push('workflow.lastUpdated 必须是字符串');
        }
      }
    } else {
      warnings.push('建议配置 workflow 字段');
    }

    // 校验 initializedAt
    if (
      cfg.initializedAt !== undefined &&
      typeof cfg.initializedAt !== 'string'
    ) {
      errors.push('initializedAt 必须是字符串');
    } else if (cfg.initializedAt === undefined) {
      warnings.push('建议配置 initializedAt 字段');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 创建默认配置
   * @param projectName 项目名称
   * @param options 可选配置项
   * @returns 默认配置对象
   */
  createDefaultConfig(
    projectName: string,
    options: {
      gitBranch?: string;
      techStack?: TechStack;
      templateRepo?: string;
      templateBranch?: string;
    } = {}
  ): ProjectConfig {
    const now = new Date().toISOString();

    return {
      projectName,
      gitBranch: options.gitBranch || 'main',
      techStack: options.techStack || 'Other',
      workflow: {
        templateRepo: options.templateRepo || 'ideal-lab/best-practices',
        templateBranch: options.templateBranch || 'main',
        lastUpdated: now,
      },
      initializedAt: now,
    };
  }

  /**
   * 更新配置中的工作流信息
   * @param projectRoot 项目根目录
   * @param updates 要更新的字段
   */
  async updateWorkflow(
    projectRoot: string,
    updates: Partial<ProjectConfig['workflow']>
  ): Promise<void> {
    const config = await this.read(projectRoot);
    config.workflow = {
      ...config.workflow,
      ...updates,
    };
    await this.write(projectRoot, config);
  }

  /**
   * 解析配置数据
   * @param data 原始配置数据
   * @returns 项目配置对象
   */
  private parseConfig(data: Record<string, unknown>): ProjectConfig {
    // 确保必要字段存在
    const config: ProjectConfig = {
      projectName: String(data.projectName || ''),
      gitBranch: String(data.gitBranch || 'main'),
      techStack: (data.techStack as TechStack) || 'Other',
      workflow: {
        templateRepo: String(
          (data.workflow as Record<string, unknown>)?.templateRepo ||
            'ideal-lab/best-practices'
        ),
        templateBranch: String(
          (data.workflow as Record<string, unknown>)?.templateBranch || 'main'
        ),
        lastUpdated: String(
          (data.workflow as Record<string, unknown>)?.lastUpdated ||
            new Date().toISOString()
        ),
      },
      initializedAt: String(
        data.initializedAt || new Date().toISOString()
      ),
    };

    return config;
  }

  /**
   * 生成配置文件内容
   * @param config 项目配置对象
   * @returns 配置文件内容
   */
  private generateConfigContent(config: ProjectConfig): string {
    // 准备 YAML frontmatter 数据
    const frontmatterData: Record<string, unknown> = {
      projectName: config.projectName,
      gitBranch: config.gitBranch,
      techStack: config.techStack,
      workflow: config.workflow,
      initializedAt: config.initializedAt,
    };

    // 使用 gray-matter 生成带 frontmatter 的内容
    const frontmatterContent = grayMatter.stringify('', frontmatterData);

    // 添加说明注释（放在 frontmatter 之后）
    const body = `

# 项目配置文件

此文件存储项目的配置信息，由 ideal-cli 自动管理。
请勿手动修改 YAML frontmatter 中的配置。
`;

    return frontmatterContent.trimEnd() + body;
  }
}
