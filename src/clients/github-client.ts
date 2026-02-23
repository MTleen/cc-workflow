/**
 * GitHub API 客户端
 *
 * 用于与 GitHub API 交互，获取仓库内容和文件
 */

import { AxiosInstance } from 'axios';
import {
  createHttpClient,
  get,
  withRetry,
  NetworkError,
} from '../utils/http.js';
import { logger } from '../utils/logger.js';
import { TemplateMeta } from '../types/template.js';

/**
 * GitHub API 基础 URL
 */
const GITHUB_API_BASE_URL = 'https://api.github.com';

/**
 * GitHub 文件信息（来自 API 响应）
 */
export interface GitHubFile {
  /** 文件名 */
  name: string;
  /** 文件路径 */
  path: string;
  /** 文件 SHA */
  sha: string;
  /** 文件大小（字节） */
  size: number;
  /** 文件 URL */
  url: string;
  /** 文件内容 URL（用于获取原始内容） */
  download_url: string | null;
  /** 文件类型：file 或 dir */
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  /** 文件内容（Base64 编码，仅在获取单个文件时有值） */
  content?: string;
  /** 内容编码 */
  encoding?: string;
}

/**
 * GitHub API 响应的目录内容（数组）
 */
export type GitHubDirectoryContent = GitHubFile[];

/**
 * GitHub API 响应的单个文件内容
 */
export interface GitHubFileContent extends GitHubFile {
  content: string;
  encoding: string;
}

/**
 * GitHubClient 配置
 */
export interface GitHubClientConfig {
  /** GitHub API 基础 URL，默认为 https://api.github.com */
  baseURL?: string;
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** GitHub Token（可选，用于提高速率限制） */
  token?: string;
  /** 是否启用 verbose 日志 */
  verbose?: boolean;
}

/**
 * GitHub API 客户端
 *
 * 提供与 GitHub API 交互的方法，用于获取仓库内容和文件
 */
export class GitHubClient {
  private client: AxiosInstance;
  private verbose: boolean;

  constructor(config: GitHubClientConfig = {}) {
    const {
      baseURL = GITHUB_API_BASE_URL,
      timeout,
      token,
      verbose = false,
    } = config;

    this.verbose = verbose;
    this.client = createHttpClient({
      baseURL,
      timeout,
      verbose,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }

  /**
   * 获取仓库目录内容
   * @param owner 仓库所有者
   * @param repo 仓库名称
   * @param path 目录路径
   * @param ref Git 引用（分支、标签或提交 SHA）
   * @returns 目录内容数组
   */
  async getContents(
    owner: string,
    repo: string,
    path: string = '',
    ref?: string
  ): Promise<GitHubDirectoryContent> {
    let url = `/repos/${owner}/${repo}/contents/${path}`;
    if (ref) {
      url += `?ref=${encodeURIComponent(ref)}`;
    }

    if (this.verbose) {
      logger.debug(`Fetching contents: ${url}`);
    }

    try {
      return await withRetry(
        () => get<GitHubDirectoryContent>(this.client, url),
        3,
        1000
      );
    } catch (error) {
      if (error instanceof NetworkError) {
        logger.error(`Failed to fetch contents from ${url}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 获取单个文件内容
   * @param owner 仓库所有者
   * @param repo 仓库名称
   * @param path 文件路径
   * @param ref Git 引用
   * @returns 文件内容（已解码）
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<string> {
    let url = `/repos/${owner}/${repo}/contents/${path}`;
    if (ref) {
      url += `?ref=${encodeURIComponent(ref)}`;
    }

    if (this.verbose) {
      logger.debug(`Fetching file: ${url}`);
    }

    try {
      const response = await withRetry(
        () => get<GitHubFileContent>(this.client, url),
        3,
        1000
      );

      // 解码 Base64 内容
      if (response.content && response.encoding === 'base64') {
        const content = Buffer.from(response.content, 'base64').toString(
          'utf-8'
        );
        return content;
      }

      throw new Error(
        `Unexpected response: content or encoding missing for ${path}`
      );
    } catch (error) {
      if (error instanceof NetworkError) {
        logger.error(`Failed to fetch file ${path}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 通过 download_url 获取文件内容
   * @param downloadUrl 文件下载 URL
   * @returns 文件内容
   */
  async getFileByUrl(downloadUrl: string): Promise<string> {
    if (this.verbose) {
      logger.debug(`Fetching file by URL: ${downloadUrl}`);
    }

    try {
      const response = await this.client.get(downloadUrl, {
        responseType: 'text',
      });
      return response.data;
    } catch (error) {
      if (error instanceof NetworkError) {
        logger.error(
          `Failed to fetch file from ${downloadUrl}: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * 获取版本信息文件
   * @param owner 仓库所有者
   * @param repo 仓库名称
   * @param path version.json 文件路径
   * @param ref Git 引用
   * @returns 版本信息
   */
  async getVersion(
    owner: string,
    repo: string,
    path: string = 'version.json',
    ref?: string
  ): Promise<TemplateMeta> {
    const content = await this.getFileContent(owner, repo, path, ref);

    try {
      return JSON.parse(content) as TemplateMeta;
    } catch (error) {
      throw new Error(
        `Failed to parse version.json: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * 递归获取目录树
   * @param owner 仓库所有者
   * @param repo 仓库名称
   * @param path 目录路径
   * @param ref Git 引用
   * @returns 所有文件的数组
   */
  async fetchDirectory(
    owner: string,
    repo: string,
    path: string = '',
    ref?: string
  ): Promise<GitHubFile[]> {
    const results: GitHubFile[] = [];

    const fetchRecursive = async (currentPath: string): Promise<void> => {
      const contents = await this.getContents(owner, repo, currentPath, ref);

      for (const item of contents) {
        if (item.type === 'file') {
          results.push(item);
        } else if (item.type === 'dir') {
          await fetchRecursive(item.path);
        }
        // 忽略 symlink 和 submodule 类型
      }
    };

    await fetchRecursive(path);
    return results;
  }

  /**
   * 检查仓库是否存在
   * @param owner 仓库所有者
   * @param repo 仓库名称
   * @returns 如果仓库存在返回 true
   */
  async repoExists(owner: string, repo: string): Promise<boolean> {
    try {
      await this.getContents(owner, repo, '');
      return true;
    } catch (error) {
      if (error instanceof NetworkError && error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 检查路径是否存在
   * @param owner 仓库所有者
   * @param repo 仓库名称
   * @param path 路径
   * @param ref Git 引用
   * @returns 如果路径存在返回 true
   */
  async pathExists(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<boolean> {
    try {
      await this.getContents(owner, repo, path, ref);
      return true;
    } catch (error) {
      if (error instanceof NetworkError && error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }
}

/**
 * 默认 GitHub 客户端实例
 */
export const defaultGitHubClient = new GitHubClient();
