/**
 * Init 命令模块
 *
 * 负责初始化项目工作流配置
 */

import path from 'path';
import inquirer from 'inquirer';
import { Command } from 'commander';
import { TemplateManager, TemplateVariables } from '../services/template-manager.js';
import { ConfigManager } from '../services/config-manager.js';
import { TechStack } from '../types/config.js';
import { logger } from '../utils/logger.js';
import { startSpinner, spinnerSuccess, spinnerFail } from '../utils/spinner.js';
import {
  pathExists,
  ensureDir,
  fileExists,
} from '../utils/file-system.js';
import {
  detectProjectName,
  detectTechStack,
  detectGitRepo,
  getGitBranch,
} from '../utils/detector.js';
import {
  MSG_INIT_SUCCESS,
  ERR_DIR_EXISTS,
  INFO_CREATING_DIR,
  INFO_DOWNLOADING,
  PROMPT_PROJECT_NAME,
  PROMPT_GIT_BRANCH,
  PROMPT_TECH_STACK,
} from '../constants/messages.js';

/**
 * Init 命令配置
 */
export interface InitCommandConfig {
  /** 项目路径 */
  projectPath?: string;
  /** 是否启用 verbose 模式 */
  verbose?: boolean;
  /** 是否跳过交互（使用默认值） */
  skipPrompts?: boolean;
  /** 是否强制覆盖已存在的配置 */
  force?: boolean;
}

/**
 * 用户输入的配置
 */
export interface UserInputConfig {
  /** 项目名称 */
  projectName: string;
  /** Git 主分支名称 */
  gitBranch: string;
  /** 技术栈类型 */
  techStack: TechStack;
  /** 是否创建示例文件 */
  createExample: boolean;
}

/**
 * 目录结构定义
 */
const DIRECTORY_STRUCTURE = [
  '.claude/agents',
  '.claude/skills',
  'docs/迭代',
  'docs/Wiki/用户文档',
  'docs/Wiki/开发文档',
  'docs/Wiki/接口文档',
];

/**
 * 技术栈选项
 */
const TECH_STACK_CHOICES = [
  { name: 'React', value: 'React' },
  { name: 'Vue', value: 'Vue' },
  { name: 'Node.js', value: 'Node.js' },
  { name: 'Python', value: 'Python' },
  { name: 'Other', value: 'Other' },
];

/**
 * InitCommand 类
 *
 * 管理项目初始化流程
 */
export class InitCommand {
  private templateManager: TemplateManager;
  private configManager: ConfigManager;
  private projectPath: string;
  private verbose: boolean;

  constructor(config: InitCommandConfig = {}) {
    this.templateManager = new TemplateManager({ verbose: config.verbose });
    this.configManager = new ConfigManager();
    this.projectPath = config.projectPath ?? process.cwd();
    this.verbose = config.verbose ?? false;

    if (this.verbose) {
      logger.setVerbose(true);
    }
  }

  /**
   * 检测是否已存在配置
   * @returns 如果配置已存在返回 true
   */
  async detectExistingConfig(): Promise<boolean> {
    const claudeDir = path.join(this.projectPath, '.claude');
    const configPath = this.configManager.getConfigPath(this.projectPath);

    const claudeDirExists = await pathExists(claudeDir);
    const configFileExists = await fileExists(configPath);

    return claudeDirExists && configFileExists;
  }

  /**
   * 交互式引导用户输入配置
   * @returns 用户输入的配置
   */
  async promptConfig(): Promise<UserInputConfig> {
    // 检测默认值
    const defaultProjectName = await detectProjectName(this.projectPath);
    const defaultTechStack = await detectTechStack(this.projectPath);
    const isGitRepo = await detectGitRepo(this.projectPath);
    const defaultGitBranch = isGitRepo
      ? getGitBranch(this.projectPath) ?? 'main'
      : 'main';

    logger.title('初始化 ideal-cli 工作流配置');
    logger.newline();

    const answers = await inquirer.prompt<UserInputConfig>([
      {
        type: 'input',
        name: 'projectName',
        message: PROMPT_PROJECT_NAME,
        default: defaultProjectName,
        validate: (input: string) => {
          if (!input.trim()) {
            return '项目名称不能为空';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'gitBranch',
        message: PROMPT_GIT_BRANCH,
        default: defaultGitBranch,
        validate: (input: string) => {
          if (!input.trim()) {
            return '分支名称不能为空';
          }
          return true;
        },
      },
      {
        type: 'list',
        name: 'techStack',
        message: PROMPT_TECH_STACK,
        choices: TECH_STACK_CHOICES,
        default: defaultTechStack,
      },
      {
        type: 'confirm',
        name: 'createExample',
        message: '是否创建示例文件？',
        default: false,
      },
    ]);

    return answers;
  }

  /**
   * 创建目录结构
   * @returns 创建的目录数量
   */
  async createDirectoryStructure(): Promise<number> {
    const spinner = startSpinner(INFO_CREATING_DIR);
    let createdCount = 0;

    try {
      for (const dir of DIRECTORY_STRUCTURE) {
        const fullPath = path.join(this.projectPath, dir);
        const exists = await pathExists(fullPath);

        if (!exists) {
          await ensureDir(fullPath);
          createdCount++;
          logger.debug(`Created directory: ${dir}`);
        }
      }

      spinnerSuccess(spinner, `创建了 ${createdCount} 个目录`);
      return createdCount;
    } catch (error) {
      spinnerFail(spinner, '目录创建失败');
      throw error;
    }
  }

  /**
   * 应用模板文件
   * @param userInput 用户输入的配置
   * @returns 处理的文件数量
   */
  async applyTemplate(userInput: UserInputConfig): Promise<number> {
    const spinner = startSpinner(INFO_DOWNLOADING);

    try {
      // 构建模板变量
      const variables: TemplateVariables = {
        projectName: userInput.projectName,
        gitBranch: userInput.gitBranch,
        techStack: userInput.techStack,
        initializedAt: new Date().toISOString(),
      };

      // 拉取模板
      await this.templateManager.fetchTemplate();

      // 应用模板到 .claude 目录
      const claudeDir = path.join(this.projectPath, '.claude');
      const filesProcessed = await this.templateManager.applyTemplate(
        claudeDir,
        variables
      );

      spinnerSuccess(spinner, `应用了 ${filesProcessed} 个模板文件`);
      return filesProcessed;
    } catch (error) {
      spinnerFail(spinner, '模板应用失败');
      throw error;
    }
  }

  /**
   * 保存项目配置
   * @param userInput 用户输入的配置
   */
  async saveConfig(userInput: UserInputConfig): Promise<void> {
    const config = this.configManager.createDefaultConfig(
      userInput.projectName,
      {
        gitBranch: userInput.gitBranch,
        techStack: userInput.techStack,
      }
    );

    await this.configManager.write(this.projectPath, config);
    logger.debug('配置文件已保存');
  }

  /**
   * 输出成功消息和下一步指引
   */
  outputSuccessMessage(): void {
    logger.newline();
    logger.success(MSG_INIT_SUCCESS);
    logger.newline();
    logger.divider();
    logger.newline();
    logger.info('下一步操作:');
    logger.newline();
    console.log('  1. 查看 .claude/project-config.md 确认配置');
    console.log('  2. 查看 .claude/agents/ 了解可用的角色');
    console.log('  3. 查看 .claude/skills/ 了解工作流阶段');
    console.log('  4. 运行 ideal doctor 检查配置完整性');
    logger.newline();
    logger.divider();
  }

  /**
   * 执行初始化命令
   * @param options 命令选项
   * @returns 退出码 (0 表示成功)
   */
  async execute(options: { force?: boolean } = {}): Promise<number> {
    try {
      // 检测是否已存在配置
      const configExists = await this.detectExistingConfig();

      if (configExists && !options.force) {
        logger.error(ERR_DIR_EXISTS);
        logger.info('使用 --force 选项可以强制覆盖现有配置');
        return 1;
      }

      // 交互式引导
      const userInput = await this.promptConfig();

      // 创建目录结构
      await this.createDirectoryStructure();

      // 应用模板
      await this.applyTemplate(userInput);

      // 保存配置
      await this.saveConfig(userInput);

      // 输出成功消息
      this.outputSuccessMessage();

      return 0;
    } catch (error) {
      logger.error(
        `初始化失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      if (this.verbose && error instanceof Error && error.stack) {
        logger.debug(error.stack);
      }
      return 1;
    }
  }
}

/**
 * 注册 init 命令
 * @param program - Commander 程序实例
 */
export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('初始化项目工作流配置')
    .option('-f, --force', '强制覆盖已存在的配置')
    .option('-v, --verbose', '显示详细日志')
    .action(async (options: { force?: boolean; verbose?: boolean }) => {
      const initCommand = new InitCommand({
        verbose: options.verbose,
      });
      const exitCode = await initCommand.execute({ force: options.force });
      process.exit(exitCode);
    });
}

/**
 * 创建 InitCommand 实例
 */
export function createInitCommand(config?: InitCommandConfig): InitCommand {
  return new InitCommand(config);
}
