/**
 * 模板管理器
 *
 * 负责从 GitHub 拉取模板、缓存管理、变量替换
 */

import os from 'os';
import path from 'path';
import { GitHubClient } from '../clients/github-client.js';
import { logger } from '../utils/logger.js';
import {
  ensureDir,
  writeFile,
  readFile,
  pathExists,
  remove,
  walkDir,
  renderTemplate,
  fileExists,
  ensureFileDir,
} from '../utils/file-system.js';
import {
  TemplateMeta,
  TemplateFileType,
} from '../types/template.js';
import {
  DEFAULT_REPO_OWNER,
  DEFAULT_REPO_NAME,
  DEFAULT_TEMPLATE_PATH,
  DEFAULT_BRANCH,
} from '../constants/defaults.js';

/**
 * 模板管理器配置
 */
export interface TemplateManagerConfig {
  /** GitHub 客户端实例 */
  githubClient?: GitHubClient;
  /** 模板仓库所有者 */
  repoOwner?: string;
  /** 模板路径 */
  templatePath?: string;
  /** Git 分支 */
  branch?: string;
  /** 缓存目录路径 */
  cacheDir?: string;
  /** 是否启用 verbose 日志 */
  verbose?: boolean;
}

/**
 * 模板变量
 */
export interface TemplateVariables {
  /** 项目名称 */
  projectName: string;
  /** 项目描述 */
  projectDescription?: string;
  /** Git 分支 */
  gitBranch?: string;
  /** 技术栈 */
  techStack?: string;
  /** 作者 */
  author?: string;
  /** 初始化日期 */
  initializedAt?: string;
  /** 自定义变量 */
  [key: string]: string | undefined;
}

/**
 * 模板管理器
 *
 * 提供模板拉取、缓存、应用等功能
 */
export class TemplateManager {
  private githubClient: GitHubClient;
  private repoOwner: string;
  private templatePath: string;
  private branch: string;
  private cacheDir: string;
  private verbose: boolean;

  constructor(config: TemplateManagerConfig = {}) {
    this.githubClient = config.githubClient ?? new GitHubClient();
    this.repoOwner = config.repoOwner ?? `${DEFAULT_REPO_OWNER}/${DEFAULT_REPO_NAME}`;
    this.templatePath = config.templatePath ?? DEFAULT_TEMPLATE_PATH;
    this.branch = config.branch ?? DEFAULT_BRANCH;
    this.verbose = config.verbose ?? false;

    // 缓存目录默认在用户主目录下
    this.cacheDir =
      config.cacheDir ?? path.join(os.homedir(), '.ideal-cli', 'cache');
  }

  /**
   * 获取缓存路径
   * @returns 缓存目录路径
   */
  getCachePath(): string {
    return this.cacheDir;
  }

  /**
   * 获取模板缓存路径
   * @returns 模板缓存目录路径
   */
  private getTemplateCachePath(): string {
    return path.join(this.cacheDir, this.repoOwner, this.templatePath);
  }

  /**
   * 获取版本缓存文件路径
   * @returns 版本文件路径
   */
  private getVersionCachePath(): string {
    return path.join(this.cacheDir, 'version.json');
  }

  /**
   * 从 GitHub 拉取模板并缓存
   * @param force 是否强制刷新缓存
   * @returns 下载的文件数量
   */
  async fetchTemplate(force: boolean = false): Promise<number> {
    if (this.verbose) {
      logger.debug(`Fetching template from ${this.repoOwner}/${this.templatePath}`);
    }

    // 检查缓存是否存在
    const cachePath = this.getTemplateCachePath();
    const cacheExists = await pathExists(cachePath);

    if (cacheExists && !force) {
      if (this.verbose) {
        logger.debug('Using cached template');
      }
      // 返回缓存中的文件数量
      const files = await walkDir(cachePath);
      return files.length;
    }

    // 清理旧缓存
    if (cacheExists) {
      await remove(cachePath);
    }

    // 确保缓存目录存在
    await ensureDir(cachePath);

    // 递归获取所有文件
    const files = await this.githubClient.fetchDirectory(
      this.repoOwner,
      this.templatePath,
      '',
      this.branch
    );

    if (files.length === 0) {
      logger.warn(`No files found in ${this.repoOwner}/${this.templatePath}`);
      return 0;
    }

    // 下载并缓存每个文件
    let downloaded = 0;
    for (const file of files) {
      if (file.type === 'file') {
        try {
          const content = await this.githubClient.getFileContent(
            this.repoOwner,
            this.templatePath,
            file.path,
            this.branch
          );

          // 计算相对路径（移除模板路径前缀）
          const relativePath = file.path;
          const targetPath = path.join(cachePath, relativePath);

          // 确保目录存在并写入文件
          await ensureFileDir(targetPath);
          await writeFile(targetPath, content);

          downloaded++;
          if (this.verbose) {
            logger.debug(`Downloaded: ${relativePath}`);
          }
        } catch (error) {
          logger.warn(
            `Failed to download ${file.path}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }
    }

    // 缓存版本信息
    await this.cacheVersionInfo();

    logger.success(`Downloaded ${downloaded} template files`);
    return downloaded;
  }

  /**
   * 缓存版本信息
   */
  private async cacheVersionInfo(): Promise<void> {
    try {
      const versionInfo = await this.getTemplateVersion();
      const versionPath = this.getVersionCachePath();
      await ensureFileDir(versionPath);
      await writeFile(versionPath, JSON.stringify(versionInfo, null, 2));
    } catch (error) {
      // 版本信息获取失败不是致命错误
      if (this.verbose) {
        logger.debug(
          `Failed to cache version info: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }
  }

  /**
   * 获取远程模板版本信息
   * @returns 版本信息
   */
  async getTemplateVersion(): Promise<TemplateMeta> {
    return this.githubClient.getVersion(
      this.repoOwner,
      this.templatePath,
      'version.json',
      this.branch
    );
  }

  /**
   * 获取本地缓存的版本信息
   * @returns 版本信息，如果不存在则返回 null
   */
  async getCachedVersion(): Promise<TemplateMeta | null> {
    const versionPath = this.getVersionCachePath();
    if (!(await fileExists(versionPath))) {
      return null;
    }

    try {
      const content = await readFile(versionPath);
      return JSON.parse(content) as TemplateMeta;
    } catch {
      return null;
    }
  }

  /**
   * 检查是否有新版本
   * @returns 如果有新版本返回 true
   */
  async hasUpdate(): Promise<boolean> {
    const cachedVersion = await this.getCachedVersion();
    if (!cachedVersion) {
      return true;
    }

    try {
      const remoteVersion = await this.getTemplateVersion();
      return cachedVersion.version !== remoteVersion.version;
    } catch {
      // 无法获取远程版本，假设无更新
      return false;
    }
  }

  /**
   * 应用模板到目标目录
   * @param targetDir 目标目录
   * @param variables 模板变量
   * @returns 创建的文件数量
   */
  async applyTemplate(
    targetDir: string,
    variables: TemplateVariables
  ): Promise<number> {
    const cachePath = this.getTemplateCachePath();

    // 确保模板已缓存
    if (!(await pathExists(cachePath))) {
      await this.fetchTemplate();
    }

    // 确保目标目录存在
    await ensureDir(targetDir);

    // 获取所有缓存文件
    const files = await walkDir(cachePath);
    let processed = 0;

    for (const filePath of files) {
      const relativePath = path.relative(cachePath, filePath);
      const targetPath = path.join(targetDir, relativePath);

      // 读取文件内容
      const content = await readFile(filePath);

      // 应用变量替换
      const processedContent = renderTemplate(content, variables);

      // 确保目标目录存在并写入文件
      await ensureFileDir(targetPath);
      await writeFile(targetPath, processedContent);

      processed++;
      if (this.verbose) {
        logger.debug(`Processed: ${relativePath}`);
      }
    }

    logger.success(`Applied template to ${targetDir} (${processed} files)`);
    return processed;
  }

  /**
   * 应用模板（使用自定义过滤）
   * @param targetDir 目标目录
   * @param variables 模板变量
   * @param filter 过滤函数，返回 true 则处理该文件
   * @returns 创建的文件数量
   */
  async applyTemplateWithFilter(
    targetDir: string,
    variables: TemplateVariables,
    filter: (filePath: string) => boolean
  ): Promise<number> {
    const cachePath = this.getTemplateCachePath();

    // 确保模板已缓存
    if (!(await pathExists(cachePath))) {
      await this.fetchTemplate();
    }

    // 确保目标目录存在
    await ensureDir(targetDir);

    // 获取所有缓存文件
    const files = await walkDir(cachePath, { filter });
    let processed = 0;

    for (const filePath of files) {
      const relativePath = path.relative(cachePath, filePath);
      const targetPath = path.join(targetDir, relativePath);

      // 读取文件内容
      const content = await readFile(filePath);

      // 应用变量替换
      const processedContent = renderTemplate(content, variables);

      // 确保目标目录存在并写入文件
      await ensureFileDir(targetPath);
      await writeFile(targetPath, processedContent);

      processed++;
      if (this.verbose) {
        logger.debug(`Processed: ${relativePath}`);
      }
    }

    logger.success(`Applied template to ${targetDir} (${processed} files)`);
    return processed;
  }

  /**
   * 清除缓存
   */
  async clearCache(): Promise<void> {
    const cachePath = this.getCachePath();
    if (await pathExists(cachePath)) {
      await remove(cachePath);
      logger.success('Template cache cleared');
    }
  }

  /**
   * 检查模板是否已缓存
   * @returns 如果已缓存返回 true
   */
  async isCached(): Promise<boolean> {
    const cachePath = this.getTemplateCachePath();
    return pathExists(cachePath);
  }

  /**
   * 获取缓存的文件列表
   * @returns 文件路径数组
   */
  async getCachedFiles(): Promise<string[]> {
    const cachePath = this.getTemplateCachePath();
    if (!(await pathExists(cachePath))) {
      return [];
    }
    return walkDir(cachePath);
  }

  /**
   * 根据文件路径确定文件类型
   * @param filePath 文件路径
   * @returns 文件类型
   */
  getFileType(filePath: string): TemplateFileType {
    // Normalize path separators for cross-platform compatibility
    const normalizedPath = filePath.replace(/\\/g, '/');

    if (normalizedPath.includes('/agents/') || normalizedPath.startsWith('agents/')) {
      return 'agent';
    }
    if (normalizedPath.includes('/skills/') || normalizedPath.startsWith('skills/')) {
      return 'skill';
    }
    if (
      filePath.endsWith('.config.md') ||
      filePath.includes('/config/') ||
      filePath === 'CLAUDE.md'
    ) {
      return 'config';
    }
    if (
      filePath.endsWith('.sh') ||
      filePath.endsWith('.ps1') ||
      filePath.includes('/scripts/')
    ) {
      return 'script';
    }
    return 'config'; // 默认类型
  }
}

/**
 * 默认模板管理器实例
 */
export const defaultTemplateManager = new TemplateManager();
