/**
 * 项目验证服务
 *
 * 用于验证项目是否满足 ideal-cli 的使用条件
 */

import path from 'path';
import { execSync } from 'child_process';
import {
  pathExists,
  fileExists,
  readFile,
  isEmpty,
} from '../utils/file-system.js';
import {
  detectProjectRoot,
  detectGitRepo,
  getGitBranch,
  detectIdealInitialized,
} from '../utils/detector.js';
import {
  CheckResult,
  DoctorResult,
} from '../types/doctor.js';
import { ProjectConfig } from '../types/config.js';

/**
 * 验证器配置
 */
export interface ValidatorConfig {
  /** 是否启用 verbose 模式 */
  verbose?: boolean;
  /** 最低 Node.js 版本 */
  minNodeVersion?: string;
  /** 最低 Git 版本 */
  minGitVersion?: string;
}

/**
 * 版本比较结果
 */
type VersionComparison = 'greater' | 'equal' | 'less';

/**
 * 项目验证器
 */
export class ProjectValidator {
  private minNodeVersion: string;
  private minGitVersion: string;

  constructor(config: ValidatorConfig = {}) {
    this.minNodeVersion = config.minNodeVersion ?? '18.0.0';
    this.minGitVersion = config.minGitVersion ?? '2.0.0';
  }

  /**
   * 比较语义化版本
   * @param v1 版本1
   * @param v2 版本2
   * @returns 比较结果
   */
  private compareVersions(v1: string, v2: string): VersionComparison {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;

      if (p1 > p2) return 'greater';
      if (p1 < p2) return 'less';
    }

    return 'equal';
  }

  /**
   * 获取 Node.js 版本
   * @returns Node.js 版本字符串
   */
  private getNodeVersion(): string {
    return process.versions.node;
  }

  /**
   * 获取 Git 版本
   * @returns Git 版本字符串，如果未安装则返回 null
   */
  private getGitVersion(): string | null {
    try {
      const output = execSync('git --version', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const match = output.match(/git version (\d+\.\d+\.\d+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * 检查 Node.js 版本
   * @returns 检查结果
   */
  checkNodeVersion(): CheckResult {
    const currentVersion = this.getNodeVersion();
    const comparison = this.compareVersions(currentVersion, this.minNodeVersion);

    if (comparison === 'less') {
      return {
        name: 'Node.js 版本',
        status: 'error',
        message: `Node.js 版本过低: ${currentVersion}，需要 ${this.minNodeVersion} 或更高版本`,
        details: `当前版本: ${currentVersion}\n最低要求: ${this.minNodeVersion}`,
      };
    }

    return {
      name: 'Node.js 版本',
      status: 'pass',
      message: `Node.js 版本: ${currentVersion}`,
    };
  }

  /**
   * 检查 Git 是否安装
   * @returns 检查结果
   */
  checkGitInstalled(): CheckResult {
    const gitVersion = this.getGitVersion();

    if (!gitVersion) {
      return {
        name: 'Git 安装',
        status: 'error',
        message: 'Git 未安装或不在 PATH 中',
        details: '请安装 Git: https://git-scm.com/downloads',
      };
    }

    const comparison = this.compareVersions(gitVersion, this.minGitVersion);
    if (comparison === 'less') {
      return {
        name: 'Git 安装',
        status: 'warning',
        message: `Git 版本过低: ${gitVersion}，建议升级到 ${this.minGitVersion} 或更高版本`,
        details: `当前版本: ${gitVersion}\n建议版本: ${this.minGitVersion}`,
      };
    }

    return {
      name: 'Git 安装',
      status: 'pass',
      message: `Git 版本: ${gitVersion}`,
    };
  }

  /**
   * 检查项目目录是否有效
   * @param projectPath 项目路径
   * @returns 检查结果
   */
  async checkProjectDirectory(projectPath: string): Promise<CheckResult> {
    const projectRoot = await detectProjectRoot(projectPath);

    if (!projectRoot) {
      return {
        name: '项目目录',
        status: 'warning',
        message: '未检测到项目根目录',
        details: '请在项目目录中运行此命令，或使用 --path 指定项目路径',
      };
    }

    return {
      name: '项目目录',
      status: 'pass',
      message: `项目根目录: ${projectRoot}`,
      details: projectRoot,
    };
  }

  /**
   * 检查项目是否为 Git 仓库
   * @param projectRoot 项目根目录
   * @returns 检查结果
   */
  async checkGitRepository(projectRoot: string): Promise<CheckResult> {
    const isGitRepo = await detectGitRepo(projectRoot);

    if (!isGitRepo) {
      return {
        name: 'Git 仓库',
        status: 'warning',
        message: '当前目录不是 Git 仓库',
        details: '建议初始化 Git 仓库: git init',
      };
    }

    const branch = getGitBranch(projectRoot);
    return {
      name: 'Git 仓库',
      status: 'pass',
      message: `当前分支: ${branch || 'unknown'}`,
      details: `分支: ${branch || 'unknown'}`,
    };
  }

  /**
   * 检查项目是否为空
   * @param projectRoot 项目根目录
   * @returns 检查结果
   */
  async checkProjectEmpty(projectRoot: string): Promise<CheckResult> {
    const empty = await isEmpty(projectRoot);

    if (empty) {
      return {
        name: '项目状态',
        status: 'pass',
        message: '项目目录为空，可以初始化',
      };
    }

    return {
      name: '项目状态',
      status: 'warning',
      message: '项目目录不为空',
      details: '初始化将添加配置文件，不会覆盖现有文件',
    };
  }

  /**
   * 检查 ideal-cli 是否已初始化
   * @param projectRoot 项目根目录
   * @returns 检查结果
   */
  async checkIdealInitialized(projectRoot: string): Promise<CheckResult> {
    const isInitialized = await detectIdealInitialized(projectRoot);
    const idealDir = path.join(projectRoot, '.ideal');

    if (isInitialized) {
      return {
        name: 'ideal-cli 初始化',
        status: 'pass',
        message: 'ideal-cli 已初始化',
        details: `配置目录: ${idealDir}`,
      };
    }

    // 检查 .ideal 目录是否存在但配置不完整
    if (await pathExists(idealDir)) {
      return {
        name: 'ideal-cli 初始化',
        status: 'warning',
        message: 'ideal-cli 配置不完整',
        details: `.ideal 目录存在但缺少 config.json`,
      };
    }

    return {
      name: 'ideal-cli 初始化',
      status: 'error',
      message: 'ideal-cli 未初始化',
      details: '请运行 ideal init 命令初始化项目',
    };
  }

  /**
   * 检查配置文件是否有效
   * @param projectRoot 项目根目录
   * @returns 检查结果
   */
  async checkConfigValid(projectRoot: string): Promise<CheckResult> {
    const configPath = path.join(projectRoot, '.ideal', 'config.json');

    if (!(await fileExists(configPath))) {
      return {
        name: '配置文件',
        status: 'error',
        message: '配置文件不存在',
        details: `缺少文件: ${configPath}`,
      };
    }

    try {
      const content = await readFile(configPath);
      const config = JSON.parse(content) as ProjectConfig;

      // 验证必要字段
      const requiredFields: (keyof ProjectConfig)[] = [
        'projectName',
        'gitBranch',
        'techStack',
        'initializedAt',
      ];

      const missingFields = requiredFields.filter((field) => !config[field]);

      if (missingFields.length > 0) {
        return {
          name: '配置文件',
          status: 'warning',
          message: '配置文件缺少必要字段',
          details: `缺少字段: ${missingFields.join(', ')}`,
        };
      }

      return {
        name: '配置文件',
        status: 'pass',
        message: '配置文件有效',
        details: `项目名称: ${config.projectName}\n技术栈: ${config.techStack}`,
      };
    } catch (error) {
      return {
        name: '配置文件',
        status: 'error',
        message: '配置文件格式错误',
        details: `解析错误: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * 检查 CLAUDE.md 文件是否存在
   * @param projectRoot 项目根目录
   * @returns 检查结果
   */
  async checkClaudeMd(projectRoot: string): Promise<CheckResult> {
    const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');

    if (await fileExists(claudeMdPath)) {
      return {
        name: 'CLAUDE.md',
        status: 'pass',
        message: 'CLAUDE.md 文件存在',
        details: claudeMdPath,
      };
    }

    return {
      name: 'CLAUDE.md',
      status: 'warning',
      message: 'CLAUDE.md 文件不存在',
      details: '建议创建 CLAUDE.md 文件以配置 Claude Code',
    };
  }

  /**
   * 检查 .claude 目录结构
   * @param projectRoot 项目根目录
   * @returns 检查结果
   */
  async checkClaudeDirectory(projectRoot: string): Promise<CheckResult> {
    const claudeDir = path.join(projectRoot, '.claude');

    if (!(await pathExists(claudeDir))) {
      return {
        name: '.claude 目录',
        status: 'warning',
        message: '.claude 目录不存在',
        details: '目录不存在，将自动创建',
      };
    }

    // 检查必要的子目录
    const requiredDirs = ['agents', 'skills'];
    const missingDirs: string[] = [];

    for (const dir of requiredDirs) {
      if (!(await pathExists(path.join(claudeDir, dir)))) {
        missingDirs.push(dir);
      }
    }

    if (missingDirs.length > 0) {
      return {
        name: '.claude 目录',
        status: 'warning',
        message: '.claude 目录结构不完整',
        details: `缺少目录: ${missingDirs.join(', ')}`,
      };
    }

    return {
      name: '.claude 目录',
      status: 'pass',
      message: '.claude 目录结构完整',
      details: `包含: agents, skills`,
    };
  }

  /**
   * 运行所有检查（doctor 命令）
   * @param projectPath 项目路径
   * @returns 诊断结果
   */
  async runAllChecks(projectPath: string = process.cwd()): Promise<DoctorResult> {
    const checks: CheckResult[] = [];

    // 环境检查
    checks.push(this.checkNodeVersion());
    checks.push(this.checkGitInstalled());

    // 项目检查
    const dirCheck = await this.checkProjectDirectory(projectPath);
    checks.push(dirCheck);

    const projectRoot = await detectProjectRoot(projectPath) || projectPath;

    checks.push(await this.checkGitRepository(projectRoot));
    checks.push(await this.checkIdealInitialized(projectRoot));

    // 如果已初始化，检查配置
    const isInitialized = await detectIdealInitialized(projectRoot);
    if (isInitialized) {
      checks.push(await this.checkConfigValid(projectRoot));
      checks.push(await this.checkClaudeMd(projectRoot));
      checks.push(await this.checkClaudeDirectory(projectRoot));
    }

    // 计算统计
    const summary = {
      passed: checks.filter((c) => c.status === 'pass').length,
      warnings: checks.filter((c) => c.status === 'warning').length,
      errors: checks.filter((c) => c.status === 'error').length,
    };

    return { checks, summary };
  }

  /**
   * 验证项目是否可以初始化
   * @param projectPath 项目路径
   * @returns 验证结果
   */
  async validateForInit(projectPath: string = process.cwd()): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查 Node.js 版本
    const nodeCheck = this.checkNodeVersion();
    if (nodeCheck.status === 'error') {
      errors.push(nodeCheck.message);
    }

    // 检查 Git
    const gitCheck = this.checkGitInstalled();
    if (gitCheck.status === 'error') {
      errors.push(gitCheck.message);
    } else if (gitCheck.status === 'warning') {
      warnings.push(gitCheck.message);
    }

    // 检查项目目录
    const projectRoot = await detectProjectRoot(projectPath) || projectPath;

    // 检查是否已初始化
    const isInitialized = await detectIdealInitialized(projectRoot);
    if (isInitialized) {
      errors.push('ideal-cli 已初始化，请使用 --force 强制重新初始化');
    }

    // 检查 Git 仓库
    const isGitRepo = await detectGitRepo(projectRoot);
    if (!isGitRepo) {
      warnings.push('当前目录不是 Git 仓库，建议先初始化 Git');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证项目是否可以运行 ideal-cli 命令
   * @param projectPath 项目路径
   * @returns 验证结果
   */
  async validateForCommand(projectPath: string = process.cwd()): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 运行所有检查
    const result = await this.runAllChecks(projectPath);

    // 收集错误和警告
    for (const check of result.checks) {
      if (check.status === 'error') {
        errors.push(check.message);
      } else if (check.status === 'warning') {
        warnings.push(check.message);
      }
    }

    // 关键检查：必须已初始化
    const projectRoot = await detectProjectRoot(projectPath) || projectPath;
    const isInitialized = await detectIdealInitialized(projectRoot);
    if (!isInitialized) {
      errors.push('ideal-cli 未初始化，请先运行 ideal init');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * 默认验证器实例
 */
export const defaultValidator = new ProjectValidator();
