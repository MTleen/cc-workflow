/**
 * Update 命令模块
 *
 * 提供工作流模板更新功能
 */

import path from 'path';
import os from 'os';
import { Command } from 'commander';
import readline from 'readline';
import { ConfigManager, CONFIG_DIR_NAME } from '../services/config-manager.js';
import { TemplateManager, TemplateVariables } from '../services/template-manager.js';
import { DiffManager, LocalFileInfo } from '../services/diff-manager.js';
import { ProjectConfig } from '../types/config.js';
import { DiffResult } from '../types/metadata.js';
import { TemplateFile } from '../types/template.js';
import {
  ERR_CONFIG_NOT_FOUND,
  MSG_UPDATE_SUCCESS,
  INFO_CHECKING,
  INFO_UPDATING,
  WARN_CONFLICT_DETECTED,
  WARN_FILE_MODIFIED,
} from '../constants/messages.js';
import { pathExists, ensureDir, copyDir, writeFile, readFile } from '../utils/file-system.js';
import { logger } from '../utils/logger.js';

/**
 * 冲突处理策略
 */
type ConflictStrategy = 'keep' | 'overwrite' | 'abort';

/**
 * 冲突决策
 */
interface ConflictDecision {
  filePath: string;
  strategy: ConflictStrategy;
}

/**
 * 更新结果
 */
interface UpdateResult {
  success: boolean;
  updatedFiles: string[];
  skippedFiles: string[];
  backupPath?: string;
  error?: string;
}

/**
 * 获取项目根目录（查找包含 .claude 目录的目录）
 * @param startPath 起始路径，默认为当前工作目录
 * @returns 项目根目录路径，如果未找到则返回 null
 */
async function getProjectRoot(startPath: string = process.cwd()): Promise<string | null> {
  let currentPath = path.resolve(startPath);

  while (currentPath !== path.dirname(currentPath)) {
    const claudePath = path.join(currentPath, CONFIG_DIR_NAME);
    if (await pathExists(claudePath)) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }

  // 检查根目录
  const rootClaudePath = path.join(currentPath, CONFIG_DIR_NAME);
  if (await pathExists(rootClaudePath)) {
    return currentPath;
  }

  return null;
}

/**
 * UpdateCommand 类
 *
 * 管理 update 命令及其功能
 */
export class UpdateCommand {
  private configManager: ConfigManager;
  private diffManager: DiffManager;
  private verbose: boolean;
  private force: boolean;

  constructor(options: { verbose?: boolean; force?: boolean } = {}) {
    this.configManager = new ConfigManager();
    this.diffManager = new DiffManager();
    this.verbose = options.verbose ?? false;
    this.force = options.force ?? false;
  }

  /**
   * 注册命令到 Commander 程序
   * @param program - Commander 程序实例
   */
  register(program: Command): void {
    program
      .command('update')
      .description('更新工作流模板到最新版本')
      .option('-v, --verbose', '显示详细输出')
      .option('-f, --force', '强制更新，跳过冲突检查')
      .action(async (options: { verbose?: boolean; force?: boolean }) => {
        const command = new UpdateCommand({
          verbose: options.verbose,
          force: options.force,
        });
        const exitCode = await command.execute();
        process.exit(exitCode);
      });
  }

  /**
   * 执行更新命令
   * @returns 退出码（0 表示成功）
   */
  async execute(): Promise<number> {
    try {
      // 1. 检查项目是否已初始化
      const projectRoot = await getProjectRoot();
      if (!projectRoot) {
        console.error(ERR_CONFIG_NOT_FOUND);
        return 1;
      }

      // 2. 读取当前配置
      const config = await this.configManager.read(projectRoot);

      // 3. 检查更新
      console.log(INFO_CHECKING);
      const updateInfo = await this.checkForUpdates(config);

      if (!updateInfo.hasUpdate) {
        console.log('已是最新版本，无需更新');
        return 0;
      }

      console.log(`发现新版本: ${updateInfo.currentVersion} -> ${updateInfo.remoteVersion}`);

      if (updateInfo.changelog) {
        console.log('\n更新内容:');
        console.log(updateInfo.changelog);
      }

      // 4. 检测文件变化
      console.log('\n正在检测文件变化...');
      const diffResult = await this.detectChanges(projectRoot, config);

      // 显示变化摘要
      this.displayDiffSummary(diffResult);

      // 5. 处理冲突
      let decisions: ConflictDecision[] = [];
      if (diffResult.conflictCount > 0 || diffResult.modifiedCount > 0) {
        if (this.force) {
          console.log('\n使用 --force 参数，将覆盖所有本地修改');
        } else {
          decisions = await this.handleConflicts(diffResult);
          if (decisions.some(d => d.strategy === 'abort')) {
            console.log('更新已取消');
            return 0;
          }
        }
      }

      // 6. 执行更新
      console.log(INFO_UPDATING);
      const result = await this.executeUpdate(projectRoot, config, diffResult, decisions);

      if (result.success) {
        console.log(MSG_UPDATE_SUCCESS);
        console.log(`已更新 ${result.updatedFiles.length} 个文件`);
        if (result.skippedFiles.length > 0) {
          console.log(`跳过 ${result.skippedFiles.length} 个文件（保留本地修改）`);
        }
        if (result.backupPath) {
          console.log(`备份已保存到: ${result.backupPath}`);
        }
        return 0;
      } else {
        console.error(`更新失败: ${result.error}`);
        return 1;
      }
    } catch (error) {
      console.error(
        `更新过程中发生错误: ${error instanceof Error ? error.message : String(error)}`
      );
      return 1;
    }
  }

  /**
   * 检查是否有更新
   * @param config 项目配置
   * @returns 更新信息
   */
  private async checkForUpdates(config: ProjectConfig): Promise<{
    hasUpdate: boolean;
    currentVersion: string;
    remoteVersion: string;
    changelog?: string;
  }> {
    const currentVersion = config.workflow.lastUpdated;

    try {
      // 获取远程版本信息
      const templateRepo = config.workflow.templateRepo;
      const templateBranch = config.workflow.templateBranch;

      // 创建新的 TemplateManager 使用配置中的仓库
      const tm = new TemplateManager({
        repoOwner: templateRepo,
        branch: templateBranch,
        verbose: this.verbose,
      });

      const remoteMeta = await tm.getTemplateVersion();

      // 比较版本（使用日期或版本号）
      const hasUpdate = remoteMeta.releasedAt > currentVersion;

      return {
        hasUpdate,
        currentVersion,
        remoteVersion: remoteMeta.version,
        changelog: remoteMeta.changelog,
      };
    } catch (error) {
      if (this.verbose) {
        logger.debug(`检查更新失败: ${error instanceof Error ? error.message : String(error)}`);
      }
      // 无法获取远程版本，假设无更新
      return {
        hasUpdate: false,
        currentVersion,
        remoteVersion: currentVersion,
      };
    }
  }

  /**
   * 检测文件变化
   * @param projectRoot 项目根目录
   * @param config 项目配置
   * @returns 差异比较结果
   */
  private async detectChanges(
    projectRoot: string,
    config: ProjectConfig
  ): Promise<DiffResult> {
    // 读取本地元数据
    const metadata = await this.diffManager.readMetadata(projectRoot);
    if (!metadata) {
      // 没有元数据，需要重新扫描
      return this.scanAndCompare(projectRoot, config);
    }

    // 获取远程文件列表
    const templateRepo = config.workflow.templateRepo;
    const templateBranch = config.workflow.templateBranch;

    const tm = new TemplateManager({
      repoOwner: templateRepo,
      branch: templateBranch,
      verbose: this.verbose,
    });

    // 确保模板已缓存
    await tm.fetchTemplate(true);

    // 获取缓存的文件列表
    const cachedFiles = await tm.getCachedFiles();
    const cachePath = tm.getCachePath();

    // 构建远程文件信息
    const remoteFiles: TemplateFile[] = [];
    for (const filePath of cachedFiles) {
      const relativePath = path.relative(cachePath, filePath);
      const content = await readFile(filePath);
      const { createHash } = await import('crypto');
      const hash = createHash('md5').update(content).digest('hex');
      const stats = await (await import('fs-extra')).stat(filePath);

      remoteFiles.push({
        path: relativePath,
        hash,
        size: stats.size,
        type: tm.getFileType(relativePath),
      });
    }

    // 扫描本地 .claude 目录下的文件
    const localFiles = await this.scanLocalClaudeFiles(projectRoot);

    // 使用 DiffManager 比较
    return this.diffManager.compare(localFiles, remoteFiles, metadata);
  }

  /**
   * 扫描并比较（无元数据时）
   */
  private async scanAndCompare(
    projectRoot: string,
    config: ProjectConfig
  ): Promise<DiffResult> {
    const localFiles = await this.scanLocalClaudeFiles(projectRoot);

    // 获取远程文件列表
    const templateRepo = config.workflow.templateRepo;
    const templateBranch = config.workflow.templateBranch;

    const tm = new TemplateManager({
      repoOwner: templateRepo,
      branch: templateBranch,
      verbose: this.verbose,
    });

    await tm.fetchTemplate(true);
    const cachedFiles = await tm.getCachedFiles();
    const cachePath = tm.getCachePath();

    const remoteFiles: TemplateFile[] = [];
    for (const filePath of cachedFiles) {
      const relativePath = path.relative(cachePath, filePath);
      const content = await readFile(filePath);
      const { createHash } = await import('crypto');
      const hash = createHash('md5').update(content).digest('hex');
      const stats = await (await import('fs-extra')).stat(filePath);

      remoteFiles.push({
        path: relativePath,
        hash,
        size: stats.size,
        type: tm.getFileType(relativePath),
      });
    }

    // 创建临时元数据
    const tempMetadata = this.diffManager.createInitialMetadata('0.0.0');

    return this.diffManager.compare(localFiles, remoteFiles, tempMetadata);
  }

  /**
   * 扫描本地 .claude 目录文件
   */
  private async scanLocalClaudeFiles(projectRoot: string): Promise<LocalFileInfo[]> {
    const claudeDir = path.join(projectRoot, CONFIG_DIR_NAME);
    const files: LocalFileInfo[] = [];

    if (!(await pathExists(claudeDir))) {
      return files;
    }

    const { walkDir, calculateFileHash } = await import('../utils/file-system.js');
    const fse = await import('fs-extra');

    const filePaths = await walkDir(claudeDir, {
      filter: (filePath) => {
        // 排除元数据文件和备份目录
        const relativePath = path.relative(claudeDir, filePath);
        return (
          !relativePath.startsWith('.backup') &&
          !relativePath.endsWith('.metadata.json')
        );
      },
    });

    for (const filePath of filePaths) {
      const relativePath = path.relative(projectRoot, filePath);
      const hash = await calculateFileHash(filePath);
      const stats = await fse.stat(filePath);

      files.push({
        path: relativePath,
        hash,
        size: stats.size,
      });
    }

    return files;
  }

  /**
   * 显示差异摘要
   */
  private displayDiffSummary(diffResult: DiffResult): void {
    console.log('\n文件变化摘要:');
    console.log(`  - 未修改: ${diffResult.unchangedCount}`);
    console.log(`  - 本地修改: ${diffResult.modifiedCount}`);
    console.log(`  - 远程新增: ${diffResult.remoteNewCount}`);
    console.log(`  - 冲突: ${diffResult.conflictCount}`);

    if (diffResult.modifiedCount > 0 || diffResult.conflictCount > 0) {
      console.log(`\n${WARN_FILE_MODIFIED}`);
    }

    if (diffResult.conflictCount > 0) {
      console.log(`\n${WARN_CONFLICT_DETECTED}`);
      console.log('冲突文件:');
      for (const diff of diffResult.diffs) {
        if (diff.status === 'conflict') {
          console.log(`  - ${diff.path}`);
        }
      }
    }
  }

  /**
   * 处理冲突（交互式）
   * @param diffResult 差异结果
   * @returns 冲突决策列表
   */
  private async handleConflicts(diffResult: DiffResult): Promise<ConflictDecision[]> {
    const decisions: ConflictDecision[] = [];
    const conflictFiles = diffResult.diffs.filter(
      d => d.status === 'conflict' || d.status === 'modified'
    );

    if (conflictFiles.length === 0) {
      return decisions;
    }

    console.log('\n请为以下文件选择处理策略:');
    console.log('  k - 保留本地修改 (keep)');
    console.log('  o - 覆盖为远程版本 (overwrite)');
    console.log('  a - 取消更新 (abort)');
    console.log('');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    for (const file of conflictFiles) {
      const statusLabel = file.status === 'conflict' ? '[冲突]' : '[本地修改]';
      const answer = await this.promptUser(
        rl,
        `${statusLabel} ${file.path} [k/o/a]: `
      );

      const choice = answer.toLowerCase().trim();
      let strategy: ConflictStrategy;

      switch (choice) {
        case 'k':
          strategy = 'keep';
          break;
        case 'o':
          strategy = 'overwrite';
          break;
        case 'a':
          strategy = 'abort';
          break;
        default:
          // 默认保留本地
          strategy = 'keep';
      }

      decisions.push({
        filePath: file.path,
        strategy,
      });

      if (strategy === 'abort') {
        break;
      }
    }

    rl.close();
    return decisions;
  }

  /**
   * 用户输入提示
   */
  private promptUser(rl: readline.Interface, question: string): Promise<string> {
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  }

  /**
   * 执行更新
   * @param projectRoot 项目根目录
   * @param config 项目配置
   * @param diffResult 差异结果
   * @param decisions 冲突决策
   * @returns 更新结果
   */
  private async executeUpdate(
    projectRoot: string,
    config: ProjectConfig,
    diffResult: DiffResult,
    decisions: ConflictDecision[]
  ): Promise<UpdateResult> {
    const result: UpdateResult = {
      success: false,
      updatedFiles: [],
      skippedFiles: [],
    };

    try {
      // 1. 创建备份
      result.backupPath = await this.createBackup(projectRoot);

      // 2. 获取远程模板
      const templateRepo = config.workflow.templateRepo;
      const templateBranch = config.workflow.templateBranch;

      const tm = new TemplateManager({
        repoOwner: templateRepo,
        branch: templateBranch,
        verbose: this.verbose,
      });

      // 确保模板已缓存
      await tm.fetchTemplate(true);
      const cachePath = tm.getCachePath();

      // 3. 应用更新
      const decisionMap = new Map<string, ConflictStrategy>();
      for (const decision of decisions) {
        decisionMap.set(decision.filePath, decision.strategy);
      }

      // 准备模板变量
      const variables: TemplateVariables = {
        projectName: config.projectName,
        gitBranch: config.gitBranch,
        techStack: config.techStack,
        initializedAt: config.initializedAt,
      };

      // 处理每个文件
      for (const diff of diffResult.diffs) {
        const strategy = decisionMap.get(diff.path);

        // 跳过用户选择保留的文件
        if (strategy === 'keep') {
          result.skippedFiles.push(diff.path);
          continue;
        }

        // 处理远程新增和未修改的文件
        if (diff.status === 'remote-new' || diff.status === 'unchanged') {
          const sourcePath = path.join(cachePath, diff.path);
          const targetPath = path.join(projectRoot, diff.path);

          // 读取并渲染模板
          const content = await readFile(sourcePath);
          const renderedContent = content.replace(/\{\{projectName\}\}/g, variables.projectName || '')
            .replace(/\{\{gitBranch\}\}/g, variables.gitBranch || '')
            .replace(/\{\{techStack\}\}/g, variables.techStack || '');

          await ensureDir(path.dirname(targetPath));
          await writeFile(targetPath, renderedContent);
          result.updatedFiles.push(diff.path);
        }

        // 处理冲突和本地修改的文件（如果用户选择覆盖）
        if (
          (diff.status === 'conflict' || diff.status === 'modified') &&
          strategy === 'overwrite'
        ) {
          const sourcePath = path.join(cachePath, diff.path);
          const targetPath = path.join(projectRoot, diff.path);

          const content = await readFile(sourcePath);
          const renderedContent = content.replace(/\{\{projectName\}\}/g, variables.projectName || '')
            .replace(/\{\{gitBranch\}\}/g, variables.gitBranch || '')
            .replace(/\{\{techStack\}\}/g, variables.techStack || '');

          await ensureDir(path.dirname(targetPath));
          await writeFile(targetPath, renderedContent);
          result.updatedFiles.push(diff.path);
        }
      }

      // 4. 更新元数据
      await this.updateMetadata(projectRoot, result.updatedFiles, config);

      // 5. 更新配置中的最后更新时间
      await this.configManager.updateWorkflow(projectRoot, {
        lastUpdated: new Date().toISOString(),
      });

      result.success = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }

    return result;
  }

  /**
   * 创建备份
   */
  private async createBackup(projectRoot: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(
      os.homedir(),
      '.ideal-cli',
      'backups',
      path.basename(projectRoot),
      timestamp
    );

    const claudeDir = path.join(projectRoot, CONFIG_DIR_NAME);

    if (await pathExists(claudeDir)) {
      await copyDir(claudeDir, backupDir);
    }

    return backupDir;
  }

  /**
   * 更新元数据
   */
  private async updateMetadata(
    projectRoot: string,
    updatedFiles: string[],
    config: ProjectConfig
  ): Promise<void> {
    let metadata = await this.diffManager.readMetadata(projectRoot);

    if (!metadata) {
      metadata = this.diffManager.createInitialMetadata(config.workflow.lastUpdated);
    }

    // 更新已更新文件的元数据
    for (const filePath of updatedFiles) {
      const fullPath = path.join(projectRoot, filePath);
      if (await pathExists(fullPath)) {
        const { calculateFileHash } = await import('../utils/file-system.js');
        const fse = await import('fs-extra');
        const hash = await calculateFileHash(fullPath);
        const stats = await fse.stat(fullPath);

        metadata.files[filePath] = {
          originalHash: hash,
          remoteVersion: config.workflow.lastUpdated,
          lastSyncedAt: new Date().toISOString(),
          size: stats.size,
        };
      }
    }

    metadata.lastUpdatedAt = new Date().toISOString();
    await this.diffManager.writeMetadata(projectRoot, metadata);
  }
}

/**
 * 创建并返回 UpdateCommand 实例
 */
export function createUpdateCommand(): UpdateCommand {
  return new UpdateCommand();
}
