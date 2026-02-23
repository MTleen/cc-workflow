/**
 * 差异管理器
 *
 * 负责检测本地文件与远程模板之间的差异
 */

import path from 'path';
import {
  ProjectMetadata,
  FileMetadata,
  FileDiff,
  DiffResult,
} from '../types/metadata.js';
import { TemplateFile } from '../types/template.js';
import {
  readFile,
  writeFile,
  fileExists,
  pathExists,
  calculateFileHash,
  walkDir,
  ensureDir,
} from '../utils/file-system.js';

/**
 * 元数据文件名
 */
export const METADATA_FILE_NAME = '.metadata.json';

/**
 * 元数据目录名
 */
export const METADATA_DIR_NAME = '.claude';

/**
 * 当前元数据格式版本
 */
export const METADATA_VERSION = '1.0.0';

/**
 * DiffManager 配置选项
 */
export interface DiffManagerOptions {
  /** 元数据目录名，默认为 .claude */
  metadataDirName?: string;
}

/**
 * 本地文件信息（用于差异比较）
 */
export interface LocalFileInfo {
  /** 文件路径 */
  path: string;
  /** 文件哈希 */
  hash: string;
  /** 文件大小 */
  size: number;
}

/**
 * 差异管理器类
 *
 * 负责管理文件差异检测和元数据存储
 */
export class DiffManager {
  private metadataDirName: string;

  constructor(options: DiffManagerOptions = {}) {
    this.metadataDirName = options.metadataDirName || METADATA_DIR_NAME;
  }

  /**
   * 获取元数据文件路径
   * @param projectRoot 项目根目录
   * @returns 元数据文件完整路径
   */
  getMetadataPath(projectRoot: string): string {
    return path.join(projectRoot, this.metadataDirName, METADATA_FILE_NAME);
  }

  /**
   * 读取项目元数据
   * @param projectRoot 项目根目录
   * @returns 项目元数据对象，如果不存在则返回 null
   */
  async readMetadata(projectRoot: string): Promise<ProjectMetadata | null> {
    const metadataPath = this.getMetadataPath(projectRoot);

    if (!(await fileExists(metadataPath))) {
      return null;
    }

    try {
      const content = await readFile(metadataPath);
      const metadata = JSON.parse(content) as ProjectMetadata;
      return metadata;
    } catch (error) {
      throw new Error(
        `元数据文件解析失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 写入项目元数据
   * @param projectRoot 项目根目录
   * @param metadata 项目元数据对象
   */
  async writeMetadata(
    projectRoot: string,
    metadata: ProjectMetadata
  ): Promise<void> {
    const metadataPath = this.getMetadataPath(projectRoot);
    // 确保目录存在
    await ensureDir(path.dirname(metadataPath));
    const content = JSON.stringify(metadata, null, 2);
    await writeFile(metadataPath, content);
  }

  /**
   * 创建初始元数据
   * @param templateVersion 模板版本
   * @returns 初始元数据对象
   */
  createInitialMetadata(templateVersion: string): ProjectMetadata {
    return {
      version: METADATA_VERSION,
      initializedAt: new Date().toISOString(),
      templateVersion,
      files: {},
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  /**
   * 添加或更新文件元数据
   * @param projectRoot 项目根目录
   * @param filePath 文件路径（相对路径）
   * @param fileMetadata 文件元数据
   */
  async updateFileMetadata(
    projectRoot: string,
    filePath: string,
    fileMetadata: FileMetadata
  ): Promise<void> {
    const metadata = await this.readMetadata(projectRoot);

    if (!metadata) {
      throw new Error('元数据不存在，请先初始化项目');
    }

    // 规范化路径（确保使用一致的路径格式）
    const normalizedPath = this.normalizePath(filePath);
    metadata.files[normalizedPath] = fileMetadata;
    metadata.lastUpdatedAt = new Date().toISOString();

    await this.writeMetadata(projectRoot, metadata);
  }

  /**
   * 对比本地和远程文件
   * @param localFiles 本地文件列表
   * @param remoteFiles 远程文件列表
   * @param metadata 项目元数据
   * @returns 差异比较结果
   */
  async compare(
    localFiles: LocalFileInfo[],
    remoteFiles: TemplateFile[],
    metadata: ProjectMetadata
  ): Promise<DiffResult> {
    const diffs: FileDiff[] = [];
    const processedPaths = new Set<string>();

    // 创建本地文件映射
    const localFileMap = new Map<string, LocalFileInfo>();
    for (const file of localFiles) {
      localFileMap.set(this.normalizePath(file.path), file);
    }

    // 创建远程文件映射
    const remoteFileMap = new Map<string, TemplateFile>();
    for (const file of remoteFiles) {
      remoteFileMap.set(this.normalizePath(file.path), file);
    }

    // 检查所有本地文件
    for (const [normalizedPath, localFile] of localFileMap) {
      processedPaths.add(normalizedPath);

      const remoteFile = remoteFileMap.get(normalizedPath);
      const fileMetadata = metadata.files[normalizedPath];

      const diff = this.compareFile(
        normalizedPath,
        localFile,
        remoteFile,
        fileMetadata
      );
      diffs.push(diff);
    }

    // 检查远程新增的文件（本地不存在）
    for (const [normalizedPath, remoteFile] of remoteFileMap) {
      if (!processedPaths.has(normalizedPath)) {
        // 检查是否在元数据中（可能是用户删除的）
        const fileMetadata = metadata.files[normalizedPath];

        if (fileMetadata) {
          // 本地不存在但元数据中有，说明用户删除了
          diffs.push({
            path: normalizedPath,
            status: 'deleted',
            originalHash: fileMetadata.originalHash,
            remoteHash: remoteFile.hash,
            remoteVersion: remoteFile.version || metadata.templateVersion,
          });
        } else {
          // 本地和元数据都没有，是远程新增
          diffs.push({
            path: normalizedPath,
            status: 'remote-new',
            remoteHash: remoteFile.hash,
            remoteVersion: remoteFile.version || metadata.templateVersion,
          });
        }
      }
    }

    // 检查用户删除的文件（元数据中有但本地和远程都没有）
    for (const normalizedPath of Object.keys(metadata.files)) {
      if (
        !localFileMap.has(normalizedPath) &&
        !remoteFileMap.has(normalizedPath)
      ) {
        // 文件既不在本地也不在远程，可能是远程已删除的文件
        // 这里不标记为 deleted，因为远程也没有
      }
    }

    // 统计各种状态的文件数量
    const result = this.calculateDiffResult(diffs);
    return result;
  }

  /**
   * 判断用户是否修改了文件
   * @param filePath 文件路径
   * @param metadata 项目元数据
   * @returns 如果用户修改了文件返回 true
   */
  async isUserModified(
    projectRoot: string,
    filePath: string,
    metadata: ProjectMetadata
  ): Promise<boolean> {
    const normalizedPath = this.normalizePath(filePath);
    const fileMetadata = metadata.files[normalizedPath];

    if (!fileMetadata) {
      // 没有元数据，无法判断，假设用户添加的文件
      return true;
    }

    // 计算当前文件哈希
    const fullPath = path.join(projectRoot, filePath);
    if (!(await fileExists(fullPath))) {
      // 文件不存在，不算修改
      return false;
    }

    const currentHash = await calculateFileHash(fullPath);
    return currentHash !== fileMetadata.originalHash;
  }

  /**
   * 获取所有用户修改的文件
   * @param projectRoot 项目根目录
   * @param metadata 项目元数据
   * @returns 用户修改的文件路径列表
   */
  async getUserModifiedFiles(
    projectRoot: string,
    metadata: ProjectMetadata
  ): Promise<string[]> {
    const modifiedFiles: string[] = [];

    for (const filePath of Object.keys(metadata.files)) {
      if (await this.isUserModified(projectRoot, filePath, metadata)) {
        modifiedFiles.push(filePath);
      }
    }

    return modifiedFiles;
  }

  /**
   * 扫描本地文件
   * @param projectRoot 项目根目录
   * @param targetDir 目标目录（相对于项目根目录）
   * @param filter 过滤函数
   * @returns 本地文件信息列表
   */
  async scanLocalFiles(
    projectRoot: string,
    targetDir: string,
    filter?: (filePath: string) => boolean | Promise<boolean>
  ): Promise<LocalFileInfo[]> {
    const fullDir = path.join(projectRoot, targetDir);
    const files: LocalFileInfo[] = [];

    if (!(await pathExists(fullDir))) {
      return files;
    }

    const filePaths = await walkDir(fullDir, {
      filter: filter
        ? async (filePath, _stats) => {
            const relativePath = path.relative(fullDir, filePath);
            return filter(relativePath);
          }
        : undefined,
    });

    for (const filePath of filePaths) {
      const relativePath = path.relative(projectRoot, filePath);
      const hash = await calculateFileHash(filePath);
      const stats = await (await import('fs-extra')).stat(filePath);

      files.push({
        path: relativePath,
        hash,
        size: stats.size,
      });
    }

    return files;
  }

  /**
   * 更新元数据中的文件记录
   * @param projectRoot 项目根目录
   * @param files 文件列表
   * @param templateVersion 模板版本
   */
  async syncMetadata(
    projectRoot: string,
    files: LocalFileInfo[],
    templateVersion: string
  ): Promise<void> {
    let metadata = await this.readMetadata(projectRoot);

    if (!metadata) {
      metadata = this.createInitialMetadata(templateVersion);
    }

    // 更新所有文件的元数据
    for (const file of files) {
      const normalizedPath = this.normalizePath(file.path);
      metadata.files[normalizedPath] = {
        originalHash: file.hash,
        remoteVersion: templateVersion,
        lastSyncedAt: new Date().toISOString(),
        size: file.size,
      };
    }

    metadata.templateVersion = templateVersion;
    metadata.lastUpdatedAt = new Date().toISOString();

    await this.writeMetadata(projectRoot, metadata);
  }

  /**
   * 比较单个文件
   */
  private compareFile(
    normalizedPath: string,
    localFile: LocalFileInfo,
    remoteFile?: TemplateFile,
    fileMetadata?: FileMetadata
  ): FileDiff {
    // 如果没有元数据，说明是新增文件
    if (!fileMetadata) {
      if (remoteFile) {
        // 有远程文件但没有元数据，可能是用户手动添加的同名文件
        return {
          path: normalizedPath,
          status: localFile.hash === remoteFile.hash ? 'unchanged' : 'added',
          localHash: localFile.hash,
          remoteHash: remoteFile.hash,
          remoteVersion: remoteFile.version,
        };
      }
      return {
        path: normalizedPath,
        status: 'added',
        localHash: localFile.hash,
      };
    }

    // 有元数据，比较哈希
    const isUserModified = localFile.hash !== fileMetadata.originalHash;

    if (!remoteFile) {
      // 远程没有此文件
      return {
        path: normalizedPath,
        status: isUserModified ? 'modified' : 'unchanged',
        localHash: localFile.hash,
        originalHash: fileMetadata.originalHash,
        localVersion: fileMetadata.remoteVersion,
      };
    }

    // 有远程文件
    const isRemoteChanged = remoteFile.hash !== fileMetadata.originalHash;

    if (!isUserModified && !isRemoteChanged) {
      // 都没变
      return {
        path: normalizedPath,
        status: 'unchanged',
        localHash: localFile.hash,
        remoteHash: remoteFile.hash,
        originalHash: fileMetadata.originalHash,
        localVersion: fileMetadata.remoteVersion,
        remoteVersion: remoteFile.version || fileMetadata.remoteVersion,
      };
    }

    if (isUserModified && isRemoteChanged) {
      // 用户修改了，远程也改了，冲突
      return {
        path: normalizedPath,
        status: 'conflict',
        localHash: localFile.hash,
        remoteHash: remoteFile.hash,
        originalHash: fileMetadata.originalHash,
        localVersion: fileMetadata.remoteVersion,
        remoteVersion: remoteFile.version || fileMetadata.remoteVersion,
      };
    }

    if (isUserModified) {
      // 只有用户修改了
      return {
        path: normalizedPath,
        status: 'modified',
        localHash: localFile.hash,
        remoteHash: remoteFile.hash,
        originalHash: fileMetadata.originalHash,
        localVersion: fileMetadata.remoteVersion,
        remoteVersion: remoteFile.version || fileMetadata.remoteVersion,
      };
    }

    // 只有远程改了
    return {
      path: normalizedPath,
      status: 'unchanged', // 本地未修改，可以安全更新
      localHash: localFile.hash,
      remoteHash: remoteFile.hash,
      originalHash: fileMetadata.originalHash,
      localVersion: fileMetadata.remoteVersion,
      remoteVersion: remoteFile.version || fileMetadata.remoteVersion,
    };
  }

  /**
   * 计算差异统计结果
   */
  private calculateDiffResult(diffs: FileDiff[]): DiffResult {
    let unchangedCount = 0;
    let modifiedCount = 0;
    let addedCount = 0;
    let deletedCount = 0;
    let remoteNewCount = 0;
    let conflictCount = 0;

    for (const diff of diffs) {
      switch (diff.status) {
        case 'unchanged':
          unchangedCount++;
          break;
        case 'modified':
          modifiedCount++;
          break;
        case 'added':
          addedCount++;
          break;
        case 'deleted':
          deletedCount++;
          break;
        case 'remote-new':
          remoteNewCount++;
          break;
        case 'conflict':
          conflictCount++;
          break;
      }
    }

    const hasChanges =
      modifiedCount > 0 ||
      addedCount > 0 ||
      deletedCount > 0 ||
      remoteNewCount > 0 ||
      conflictCount > 0;

    return {
      hasChanges,
      unchangedCount,
      modifiedCount,
      addedCount,
      deletedCount,
      remoteNewCount,
      conflictCount,
      diffs,
    };
  }

  /**
   * 规范化路径（统一使用 / 分隔符）
   */
  private normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }
}
