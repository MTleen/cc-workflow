/**
 * 模板文件类型
 */
export type TemplateFileType = 'agent' | 'skill' | 'config' | 'script';

/**
 * 模板文件信息
 */
export interface TemplateFile {
  /** 相对于项目根目录的路径 */
  path: string;
  /** MD5 哈希值 */
  hash: string;
  /** 文件大小（字节） */
  size: number;
  /** 文件类型 */
  type: TemplateFileType;
  /** 文件版本（可选） */
  version?: string;
}

/**
 * 模板版本信息
 */
export interface TemplateMeta {
  /** 语义化版本号 */
  version: string;
  /** 发布日期 */
  releasedAt: string;
  /** 版本变更说明 */
  changelog?: string;
  /** 最低兼容 CLI 版本 */
  minCliVersion: string;
  /** 文件清单 */
  files?: TemplateFile[];
}

/**
 * 下载的模板文件
 */
export interface DownloadedFile {
  /** 文件路径 */
  path: string;
  /** 文件内容 */
  content: string;
  /** 文件类型 */
  type: TemplateFileType;
}
