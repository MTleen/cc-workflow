/**
 * 项目检测工具
 *
 * 用于检测项目类型、技术栈、Git 状态等信息
 */

import path from 'path';
import { execSync } from 'child_process';
import {
  pathExists,
  fileExists,
  readFile,
  getProjectRoot,
} from './file-system.js';
import { TechStack } from '../types/config.js';
import { logger } from './logger.js';

/**
 * 检测到的项目信息
 */
export interface DetectedProjectInfo {
  /** 项目名称 */
  projectName: string;
  /** 技术栈 */
  techStack: TechStack;
  /** 是否为 Git 仓库 */
  isGitRepo: boolean;
  /** Git 分支名称 */
  gitBranch: string | null;
  /** Git 远程仓库 URL */
  gitRemoteUrl: string | null;
  /** 项目根目录 */
  projectRoot: string;
  /** 是否已初始化 ideal-cli */
  isIdealInitialized: boolean;
  /** 包管理器 */
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'unknown';
}

/**
 * 技术栈检测规则
 */
interface TechStackRule {
  /** 技术栈名称 */
  name: TechStack;
  /** 需要存在的文件（任一匹配即可） */
  files?: string[];
  /** 需要存在的目录（任一匹配即可） */
  directories?: string[];
  /** package.json 依赖检查 */
  dependencies?: string[];
}

/**
 * 技术栈检测规则列表
 */
const TECH_STACK_RULES: TechStackRule[] = [
  {
    name: 'React',
    files: ['react.config.js', 'react.config.ts'],
    dependencies: ['react', 'react-dom'],
  },
  {
    name: 'Vue',
    files: ['vue.config.js', 'vue.config.ts', 'vite.config.js', 'vite.config.ts'],
    directories: ['src/views', 'src/components'],
    dependencies: ['vue'],
  },
  {
    name: 'Node.js',
    files: ['nest-cli.json', 'tsconfig.build.json'],
    directories: ['src/controllers', 'src/services', 'src/modules'],
    dependencies: ['express', 'nestjs', '@nestjs/core', 'koa', 'fastify'],
  },
  {
    name: 'Python',
    files: ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile'],
    directories: ['src', 'tests'],
  },
];

/**
 * 检测项目根目录
 * @param startPath 起始路径
 * @returns 项目根目录路径
 */
export async function detectProjectRoot(
  startPath: string = process.cwd()
): Promise<string | null> {
  // 首先检查是否有 .ideal 目录
  const idealRoot = await getProjectRoot(startPath);
  if (idealRoot) {
    return idealRoot;
  }

  // 然后检查是否有 package.json（Node.js 项目）
  let currentPath = path.resolve(startPath);

  while (currentPath !== path.dirname(currentPath)) {
    const packageJsonPath = path.join(currentPath, 'package.json');
    if (await fileExists(packageJsonPath)) {
      return currentPath;
    }

    // 检查 Python 项目标记
    const requirementsPath = path.join(currentPath, 'requirements.txt');
    const pyprojectPath = path.join(currentPath, 'pyproject.toml');
    if (
      (await fileExists(requirementsPath)) ||
      (await fileExists(pyprojectPath))
    ) {
      return currentPath;
    }

    currentPath = path.dirname(currentPath);
  }

  return null;
}

/**
 * 检测技术栈
 * @param projectRoot 项目根目录
 * @returns 技术栈类型
 */
export async function detectTechStack(projectRoot: string): Promise<TechStack> {
  // 检查是否有 package.json
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const hasPackageJson = await fileExists(packageJsonPath);

  if (hasPackageJson) {
    try {
      const packageJson = JSON.parse(await readFile(packageJsonPath));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // 按规则顺序检测
      for (const rule of TECH_STACK_RULES) {
        if (rule.name === 'Python') continue; // 跳过 Python，因为已有 package.json

        // 检查文件
        if (rule.files) {
          for (const file of rule.files) {
            if (await fileExists(path.join(projectRoot, file))) {
              return rule.name;
            }
          }
        }

        // 检查目录
        if (rule.directories) {
          for (const dir of rule.directories) {
            if (await pathExists(path.join(projectRoot, dir))) {
              return rule.name;
            }
          }
        }

        // 检查依赖
        if (rule.dependencies) {
          for (const dep of rule.dependencies) {
            if (allDeps[dep]) {
              return rule.name;
            }
          }
        }
      }

      // 如果有 package.json 但没有匹配到特定框架，默认为 Node.js
      return 'Node.js';
    } catch (error) {
      logger.debug(
        `Failed to parse package.json: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  // 检查 Python 项目
  const requirementsPath = path.join(projectRoot, 'requirements.txt');
  const pyprojectPath = path.join(projectRoot, 'pyproject.toml');
  const setupPath = path.join(projectRoot, 'setup.py');
  const pipfilePath = path.join(projectRoot, 'Pipfile');

  if (
    (await fileExists(requirementsPath)) ||
    (await fileExists(pyprojectPath)) ||
    (await fileExists(setupPath)) ||
    (await fileExists(pipfilePath))
  ) {
    return 'Python';
  }

  return 'Other';
}

/**
 * 检测是否为 Git 仓库
 * @param projectRoot 项目根目录
 * @returns 如果是 Git 仓库返回 true
 */
export async function detectGitRepo(projectRoot: string): Promise<boolean> {
  const gitDir = path.join(projectRoot, '.git');
  return pathExists(gitDir);
}

/**
 * 获取 Git 分支名称
 * @param projectRoot 项目根目录
 * @returns 分支名称，如果不是 Git 仓库则返回 null
 */
export function getGitBranch(projectRoot: string): string | null {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return branch || null;
  } catch {
    return null;
  }
}

/**
 * 获取 Git 远程仓库 URL
 * @param projectRoot 项目根目录
 * @returns 远程仓库 URL，如果没有则返回 null
 */
export function getGitRemoteUrl(projectRoot: string): string | null {
  try {
    const url = execSync('git config --get remote.origin.url', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return url || null;
  } catch {
    return null;
  }
}

/**
 * 从 Git URL 中提取项目名称
 * @param gitUrl Git URL
 * @returns 项目名称
 */
export function extractProjectNameFromGitUrl(gitUrl: string): string {
  // 处理 HTTPS 和 SSH 两种格式
  // https://github.com/owner/repo.git
  // git@github.com:owner/repo.git
  let projectName = gitUrl;

  // 移除 .git 后缀
  if (projectName.endsWith('.git')) {
    projectName = projectName.slice(0, -4);
  }

  // 提取最后一部分
  const parts = projectName.split('/');
  if (parts.length > 0) {
    projectName = parts[parts.length - 1];
  }

  // 处理 SSH 格式 (git@github.com:owner/repo)
  if (projectName.includes(':')) {
    const colonParts = projectName.split(':');
    projectName = colonParts[colonParts.length - 1];
    if (projectName.includes('/')) {
      projectName = projectName.split('/').pop() || projectName;
    }
  }

  return projectName;
}

/**
 * 检测包管理器
 * @param projectRoot 项目根目录
 * @returns 包管理器类型
 */
export async function detectPackageManager(
  projectRoot: string
): Promise<'npm' | 'yarn' | 'pnpm' | 'unknown'> {
  // 检查锁文件
  if (await fileExists(path.join(projectRoot, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (await fileExists(path.join(projectRoot, 'yarn.lock'))) {
    return 'yarn';
  }
  if (await fileExists(path.join(projectRoot, 'package-lock.json'))) {
    return 'npm';
  }

  // 检查是否为 Node.js 项目但没有锁文件
  if (await fileExists(path.join(projectRoot, 'package.json'))) {
    return 'npm'; // 默认使用 npm
  }

  return 'unknown';
}

/**
 * 从 package.json 中获取项目名称
 * @param projectRoot 项目根目录
 * @returns 项目名称，如果没有则返回 null
 */
export async function getProjectNameFromPackageJson(
  projectRoot: string
): Promise<string | null> {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!(await fileExists(packageJsonPath))) {
    return null;
  }

  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath));
    return packageJson.name || null;
  } catch {
    return null;
  }
}

/**
 * 检测项目名称
 * @param projectRoot 项目根目录
 * @returns 项目名称
 */
export async function detectProjectName(projectRoot: string): Promise<string> {
  // 1. 从 package.json 获取
  const packageName = await getProjectNameFromPackageJson(projectRoot);
  if (packageName) {
    return packageName;
  }

  // 2. 从 Git URL 获取
  const gitUrl = getGitRemoteUrl(projectRoot);
  if (gitUrl) {
    return extractProjectNameFromGitUrl(gitUrl);
  }

  // 3. 使用目录名称
  return path.basename(projectRoot);
}

/**
 * 检测是否已初始化 ideal-cli
 * @param projectRoot 项目根目录
 * @returns 如果已初始化返回 true
 */
export async function detectIdealInitialized(
  projectRoot: string
): Promise<boolean> {
  const idealDir = path.join(projectRoot, '.ideal');
  const configPath = path.join(idealDir, 'config.json');
  return fileExists(configPath);
}

/**
 * 完整检测项目信息
 * @param startPath 起始路径
 * @returns 检测到的项目信息
 */
export async function detectProjectInfo(
  startPath: string = process.cwd()
): Promise<DetectedProjectInfo | null> {
  const projectRoot = await detectProjectRoot(startPath);
  if (!projectRoot) {
    return null;
  }

  const [techStack, isGitRepo, projectName, packageManager, isIdealInitialized] =
    await Promise.all([
      detectTechStack(projectRoot),
      detectGitRepo(projectRoot),
      detectProjectName(projectRoot),
      detectPackageManager(projectRoot),
      detectIdealInitialized(projectRoot),
    ]);

  const gitBranch = isGitRepo ? getGitBranch(projectRoot) : null;
  const gitRemoteUrl = isGitRepo ? getGitRemoteUrl(projectRoot) : null;

  return {
    projectName,
    techStack,
    isGitRepo,
    gitBranch,
    gitRemoteUrl,
    projectRoot,
    isIdealInitialized,
    packageManager,
  };
}
