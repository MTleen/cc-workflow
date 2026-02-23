/**
 * Init 命令模块
 *
 * 负责初始化项目工作流配置
 * 简化版：只创建目录结构，从 GitHub 下载模板文件
 */

import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { startSpinner, spinnerSuccess, spinnerFail } from '../utils/spinner.js';
import {
  pathExists,
  ensureDir,
  fileExists,
  remove,
  copyDir,
} from '../utils/file-system.js';
import {
  ERR_DIR_EXISTS,
  INFO_CREATING_DIR,
} from '../constants/messages.js';
import {
  DEFAULT_REPO_OWNER,
  DEFAULT_REPO_NAME,
  DEFAULT_BRANCH,
  DEFAULT_TEMPLATE_PATH,
} from '../constants/defaults.js';

const execAsync = promisify(exec);

/**
 * Init 命令配置
 */
export interface InitCommandConfig {
  /** 项目路径 */
  projectPath?: string;
  /** 是否启用 verbose 模式 */
  verbose?: boolean;
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
 * 模板下载配置
 */
const TEMPLATE_CONFIG = {
  owner: DEFAULT_REPO_OWNER,
  repo: DEFAULT_REPO_NAME,
  branch: DEFAULT_BRANCH,
  templatePath: DEFAULT_TEMPLATE_PATH,
  // GitHub 仓库 zip 下载地址
  get zipUrl() {
    return `https://github.com/${this.owner}/${this.repo}/archive/refs/heads/${this.branch}.zip`;
  },
};

/**
 * InitCommand 类
 *
 * 管理项目初始化流程
 */
export class InitCommand {
  private projectPath: string;
  private verbose: boolean;

  constructor(config: InitCommandConfig = {}) {
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
    const configFile = path.join(this.projectPath, '.claude', 'project-config.md');

    const claudeDirExists = await pathExists(claudeDir);
    const configFileExists = await fileExists(configFile);

    return claudeDirExists && configFileExists;
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
   * 下载并应用模板
   * 使用 curl 下载 zip 文件，解压后复制到目标目录
   * @returns 处理的文件数量
   */
  async downloadAndApplyTemplate(): Promise<number> {
    const spinner = startSpinner('正在下载模板...');

    try {
      // 创建临时目录
      const tempDir = path.join(this.projectPath, '.ideal-cli-temp');
      await ensureDir(tempDir);

      const zipFile = path.join(tempDir, 'template.zip');
      const extractDir = path.join(tempDir, 'extracted');

      try {
        // 下载 zip 文件
        logger.debug(`Downloading from: ${TEMPLATE_CONFIG.zipUrl}`);
        await execAsync(`curl -sL "${TEMPLATE_CONFIG.zipUrl}" -o "${zipFile}"`);

        // 检查下载是否成功
        if (!(await fileExists(zipFile))) {
          throw new Error('模板下载失败');
        }

        // 解压 zip 文件
        await ensureDir(extractDir);
        await execAsync(`unzip -q "${zipFile}" -d "${extractDir}"`);

        // 找到解压后的目录（通常是 repo-branch 格式）
        const extractedFolder = path.join(extractDir, `${TEMPLATE_CONFIG.repo}-${TEMPLATE_CONFIG.branch}`);
        const templateSourceDir = path.join(extractedFolder, TEMPLATE_CONFIG.templatePath);

        // 检查模板目录是否存在
        if (!(await pathExists(templateSourceDir))) {
          throw new Error(`模板目录不存在: ${TEMPLATE_CONFIG.templatePath}`);
        }

        // 复制模板文件到 .claude 目录（过滤 configs 目录和 version.json）
        const claudeDir = path.join(this.projectPath, '.claude');
        await copyDir(templateSourceDir, claudeDir, {
          overwrite: true,
          filter: (src: string) => {
            const relativePath = path.relative(templateSourceDir, src);
            // 排除 configs 目录和 version.json
            return !relativePath.startsWith('configs') && relativePath !== 'version.json';
          },
        });

        spinnerSuccess(spinner, '模板文件应用成功');
        return 0;
      } finally {
        // 清理临时目录
        await remove(tempDir);
      }
    } catch (error) {
      spinnerFail(spinner, '模板下载失败');
      throw error;
    }
  }

  /**
   * 输出成功消息和下一步指引
   */
  outputSuccessMessage(): void {
    logger.newline();
    logger.success('项目初始化完成！');
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

      logger.title('初始化 ideal-cli 工作流配置');
      logger.newline();

      // 创建目录结构
      await this.createDirectoryStructure();

      // 下载并应用模板
      await this.downloadAndApplyTemplate();

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
