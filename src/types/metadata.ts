/**
 * 元数据类型定义
 *
 * 用于跟踪模板文件的安装和更新状态
 */

/**
 * 单个文件的元数据
 */
export interface FileMetadata {
  /** 原始文件哈希（安装时的哈希） */
  originalHash: string;
  /** 远程模板版本 */
  remoteVersion: string;
  /** 最后同步时间 */
  lastSyncedAt?: string;
  /** 文件大小（字节） */
  size?: number;
}

/**
 * 项目元数据
 */
export interface ProjectMetadata {
  /** 元数据格式版本 */
  version: string;
  /** 项目初始化时间 */
  initializedAt: string;
  /** 模板版本 */
  templateVersion: string;
  /** 文件元数据映射（相对路径 -> 文件元数据） */
  files: Record<string, FileMetadata>;
  /** 最后更新时间 */
  lastUpdatedAt?: string;
}

/**
 * 文件差异状态
 */
export type FileDiffStatus =
  | 'unchanged'   // 未修改（哈希相同）
  | 'modified'    // 用户已修改（哈希不同）
  | 'added'       // 新增文件（本地存在但元数据中没有）
  | 'deleted'     // 已删除（元数据中存在但本地不存在）
  | 'remote-new'  // 远程新增（远程存在但本地没有）
  | 'conflict';   // 冲突（用户修改且远程也更新）

/**
 * 文件差异信息
 */
export interface FileDiff {
  /** 文件路径 */
  path: string;
  /** 差异状态 */
  status: FileDiffStatus;
  /** 本地哈希（如果存在） */
  localHash?: string;
  /** 远程哈希（如果存在） */
  remoteHash?: string;
  /** 原始哈希（如果存在） */
  originalHash?: string;
  /** 本地版本（如果存在） */
  localVersion?: string;
  /** 远程版本（如果存在） */
  remoteVersion?: string;
}

/**
 * 差异比较结果
 */
export interface DiffResult {
  /** 是否有变化 */
  hasChanges: boolean;
  /** 未修改的文件数量 */
  unchangedCount: number;
  /** 用户修改的文件数量 */
  modifiedCount: number;
  /** 新增的文件数量 */
  addedCount: number;
  /** 删除的文件数量 */
  deletedCount: number;
  /** 远程新增的文件数量 */
  remoteNewCount: number;
  /** 冲突的文件数量 */
  conflictCount: number;
  /** 所有文件差异列表 */
  diffs: FileDiff[];
}
