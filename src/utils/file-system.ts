/**
 * 文件系统工具
 *
 * 提供跨平台的文件和目录操作功能
 */

import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import Mustache from 'mustache';

/**
 * 确保目录存在，如果不存在则创建
 * @param dirPath 目录路径
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

/**
 * 检查目录是否为空
 * @param dirPath 目录路径
 * @returns 如果目录为空返回 true，否则返回 false
 */
export async function isEmpty(dirPath: string): Promise<boolean> {
  try {
    const files = await fs.readdir(dirPath);
    return files.length === 0;
  } catch (error) {
    // 如果目录不存在，视为空
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return true;
    }
    throw error;
  }
}

/**
 * 复制目录
 * @param src 源目录路径
 * @param dest 目标目录路径
 * @param options 复制选项
 */
export interface CopyDirOptions {
  /** 覆盖已存在的文件 */
  overwrite?: boolean;
  /** 过滤函数，返回 true 则复制 */
  filter?: (src: string) => boolean;
}

export async function copyDir(
  src: string,
  dest: string,
  options: CopyDirOptions = {}
): Promise<void> {
  const { overwrite = true, filter } = options;
  await fs.copy(src, dest, {
    overwrite,
    filter: filter ? (srcPath: string) => filter(srcPath) : undefined,
  });
}

/**
 * 读取文件内容
 * @param filePath 文件路径
 * @param encoding 文件编码，默认 utf-8
 * @returns 文件内容字符串
 */
export async function readFile(
  filePath: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<string> {
  return await fs.readFile(filePath, encoding);
}

/**
 * 写入文件
 * @param filePath 文件路径
 * @param content 文件内容
 * @param options 写入选项
 */
export interface WriteFileOptions {
  /** 文件编码，默认 utf-8 */
  encoding?: BufferEncoding;
  /** 模式 */
  mode?: number | string;
  /** 标志 */
  flag?: string;
}

export async function writeFile(
  filePath: string,
  content: string,
  options: WriteFileOptions = {}
): Promise<void> {
  const { encoding = 'utf-8', mode, flag } = options;
  await fs.writeFile(filePath, content, { encoding, mode, flag });
}

/**
 * 检查文件是否存在
 * @param filePath 文件路径
 * @returns 如果文件存在返回 true，否则返回 false
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查路径是否存在（文件或目录）
 * @param targetPath 目标路径
 * @returns 如果路径存在返回 true，否则返回 false
 */
export async function pathExists(targetPath: string): Promise<boolean> {
  return await fs.pathExists(targetPath);
}

/**
 * 获取文件统计信息
 * @param filePath 文件路径
 * @returns 文件统计信息
 */
export async function getStats(filePath: string): Promise<fs.Stats> {
  return await fs.stat(filePath);
}

/**
 * 读取目录内容
 * @param dirPath 目录路径
 * @returns 目录中的文件和子目录列表
 */
export async function readDir(dirPath: string): Promise<string[]> {
  return await fs.readdir(dirPath);
}

/**
 * 删除文件或目录
 * @param targetPath 目标路径
 */
export async function remove(targetPath: string): Promise<void> {
  await fs.remove(targetPath);
}

/**
 * 创建文件的目录结构
 * @param filePath 文件路径
 */
export async function ensureFileDir(filePath: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
}

/**
 * 计算内容的 MD5 哈希值
 * @param content 要计算哈希的内容
 * @returns MD5 哈希值（小写十六进制字符串）
 */
export function calculateHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * 计算文件的 MD5 哈希值
 * @param filePath 文件路径
 * @returns MD5 哈希值（小写十六进制字符串）
 */
export async function calculateFileHash(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return calculateHash(content);
}

/**
 * 模板变量替换（使用 Mustache）
 * @param template 模板字符串
 * @param variables 变量对象
 * @returns 替换后的字符串
 */
export function renderTemplate(
  template: string,
  variables: Record<string, unknown>
): string {
  return Mustache.render(template, variables);
}

/**
 * 读取模板文件并替换变量
 * @param templatePath 模板文件路径
 * @param variables 变量对象
 * @returns 替换后的字符串
 */
export async function renderTemplateFile(
  templatePath: string,
  variables: Record<string, unknown>
): Promise<string> {
  const template = await readFile(templatePath);
  return renderTemplate(template, variables);
}

/**
 * 获取项目根目录
 * 从当前工作目录向上查找包含 .ideal 目录的目录
 * @param startPath 起始路径，默认为当前工作目录
 * @returns 项目根目录路径，如果未找到则返回 null
 */
export async function getProjectRoot(
  startPath: string = process.cwd()
): Promise<string | null> {
  let currentPath = path.resolve(startPath);

  while (currentPath !== path.dirname(currentPath)) {
    const idealPath = path.join(currentPath, '.ideal');
    if (await pathExists(idealPath)) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }

  // 检查根目录
  const rootIdealPath = path.join(currentPath, '.ideal');
  if (await pathExists(rootIdealPath)) {
    return currentPath;
  }

  return null;
}

/**
 * 获取跨平台规范化路径
 * @param targetPath 目标路径
 * @returns 规范化后的路径
 */
export function normalizePath(targetPath: string): string {
  return path.normalize(targetPath);
}

/**
 * 连接路径片段
 * @param ...pathSegments 路径片段
 * @returns 连接后的路径
 */
export function joinPaths(...pathSegments: string[]): string {
  return path.join(...pathSegments);
}

/**
 * 获取路径的目录名
 * @param targetPath 目标路径
 * @returns 目录名
 */
export function getDirName(targetPath: string): string {
  return path.dirname(targetPath);
}

/**
 * 获取路径的文件名
 * @param targetPath 目标路径
 * @returns 文件名
 */
export function getBaseName(targetPath: string): string {
  return path.basename(targetPath);
}

/**
 * 获取文件扩展名
 * @param targetPath 目标路径
 * @returns 扩展名（包含点号）
 */
export function getExtName(targetPath: string): string {
  return path.extname(targetPath);
}

/**
 * 将路径转换为绝对路径
 * @param targetPath 目标路径
 * @returns 绝对路径
 */
export function toAbsolutePath(targetPath: string): string {
  return path.resolve(targetPath);
}

/**
 * 获取相对路径
 * @param from 起始路径
 * @param to 目标路径
 * @returns 相对路径
 */
export function getRelativePath(from: string, to: string): string {
  return path.relative(from, to);
}

/**
 * 递归遍历目录，返回所有文件路径
 * @param dirPath 目录路径
 * @param options 遍历选项
 * @returns 文件路径数组
 */
export interface WalkDirOptions {
  /** 是否包含目录路径 */
  includeDirs?: boolean;
  /** 过滤函数 */
  filter?: (filePath: string, stats: fs.Stats) => boolean | Promise<boolean>;
}

export async function walkDir(
  dirPath: string,
  options: WalkDirOptions = {}
): Promise<string[]> {
  const { includeDirs = false, filter } = options;
  const results: string[] = [];

  async function walk(currentPath: string): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (includeDirs) {
          const stats = await fs.stat(entryPath);
          if (!filter || (await filter(entryPath, stats))) {
            results.push(entryPath);
          }
        }
        await walk(entryPath);
      } else if (entry.isFile()) {
        const stats = await fs.stat(entryPath);
        if (!filter || (await filter(entryPath, stats))) {
          results.push(entryPath);
        }
      }
    }
  }

  await walk(dirPath);
  return results;
}
