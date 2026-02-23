/**
 * Doctor 命令
 *
 * 检查工作流配置完整性和有效性
 */

import { ProjectValidator } from '../services/validator.js';
import { Logger } from '../utils/logger.js';
import { CheckResult, DoctorResult } from '../types/doctor.js';

/**
 * Doctor 命令配置
 */
export interface DoctorCommandConfig {
  /** 是否启用 verbose 模式 */
  verbose?: boolean;
  /** 项目路径 */
  projectPath?: string;
}

/**
 * Doctor 命令类
 */
export class DoctorCommand {
  private validator: ProjectValidator;
  private logger: Logger;
  private verbose: boolean;
  private projectPath: string;

  constructor(config: DoctorCommandConfig = {}) {
    this.validator = new ProjectValidator();
    this.logger = Logger.getInstance();
    this.verbose = config.verbose ?? false;
    this.projectPath = config.projectPath ?? process.cwd();

    if (this.verbose) {
      this.logger.setVerbose(true);
    }
  }

  /**
   * 运行所有检查
   * @returns 诊断结果
   */
  async runChecks(): Promise<DoctorResult> {
    this.logger.debug(`运行诊断检查，项目路径: ${this.projectPath}`);
    return this.validator.runAllChecks(this.projectPath);
  }

  /**
   * 格式化单个检查结果
   * @param check 检查结果
   * @returns 格式化后的字符串
   */
  formatCheckResult(check: CheckResult): string {
    const symbol = this.getStatusSymbol(check.status);
    const name = check.name;
    const message = check.message;

    let result = `${symbol} ${name}: ${message}`;

    if (this.verbose && check.details) {
      result += `\n  ${check.details}`;
    }

    return result;
  }

  /**
   * 获取状态符号
   * @param status 检查状态
   * @returns 状态符号
   */
  private getStatusSymbol(status: 'pass' | 'warning' | 'error'): string {
    switch (status) {
      case 'pass':
        return '\u2713'; // ✓
      case 'warning':
        return '\u26a0'; // ⚠
      case 'error':
        return '\u2717'; // ✗
      default:
        return '?';
    }
  }

  /**
   * 格式化并输出诊断结果
   * @param result 诊断结果
   */
  formatResults(result: DoctorResult): void {
    this.logger.title('ideal-cli 诊断检查');
    this.logger.newline();

    // 输出各项检查结果
    for (const check of result.checks) {
      this.outputCheckResult(check);
    }

    this.logger.newline();
    this.logger.divider();
    this.logger.newline();

    // 输出摘要
    this.outputSummary(result.summary);
  }

  /**
   * 输出单个检查结果
   * @param check 检查结果
   */
  private outputCheckResult(check: CheckResult): void {
    switch (check.status) {
      case 'pass':
        this.logger.success(`${check.name}: ${check.message}`);
        break;
      case 'warning':
        this.logger.warn(`${check.name}: ${check.message}`);
        break;
      case 'error':
        this.logger.error(`${check.name}: ${check.message}`);
        break;
    }

    if (this.verbose && check.details) {
      console.log(`    ${check.details}`);
    }
  }

  /**
   * 输出摘要统计
   * @param summary 摘要统计
   */
  private outputSummary(summary: DoctorResult['summary']): void {
    const parts: string[] = [];

    if (summary.passed > 0) {
      parts.push(`${summary.passed} 项通过`);
    }
    if (summary.warnings > 0) {
      parts.push(`${summary.warnings} 项警告`);
    }
    if (summary.errors > 0) {
      parts.push(`${summary.errors} 项错误`);
    }

    const summaryText = `诊断结果: ${parts.join(', ')}`;

    if (summary.errors > 0) {
      this.logger.error(summaryText);
    } else if (summary.warnings > 0) {
      this.logger.warn(summaryText);
    } else {
      this.logger.success(summaryText);
    }
  }

  /**
   * 执行 doctor 命令
   * @returns 退出码 (0 表示成功，1 表示有错误)
   */
  async execute(): Promise<number> {
    try {
      const result = await this.runChecks();
      this.formatResults(result);

      // 如果有错误级别的问题，返回退出码 1
      if (result.summary.errors > 0) {
        return 1;
      }

      return 0;
    } catch (error) {
      this.logger.error(
        `诊断检查失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return 1;
    }
  }
}

/**
 * 创建 Doctor 命令实例
 */
export function createDoctorCommand(config?: DoctorCommandConfig): DoctorCommand {
  return new DoctorCommand(config);
}
