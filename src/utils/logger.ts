/**
 * 日志工具
 *
 * 提供统一的日志输出接口，支持彩色输出和 verbose 模式
 */

import chalk from 'chalk';

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

/**
 * Logger 配置
 */
export interface LoggerConfig {
  /** 是否启用 verbose 模式 */
  verbose: boolean;
  /** 是否禁用颜色 */
  noColor: boolean;
}

/**
 * 日志工具类
 */
export class Logger {
  private static instance: Logger;
  private verbose: boolean;
  private noColor: boolean;

  private constructor(config?: Partial<LoggerConfig>) {
    this.verbose = config?.verbose ?? false;
    this.noColor = config?.noColor ?? false;
  }

  /**
   * 获取 Logger 单例
   */
  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * 设置 verbose 模式
   */
  setVerbose(enabled: boolean): void {
    this.verbose = enabled;
  }

  /**
   * 设置是否禁用颜色
   */
  setNoColor(disabled: boolean): void {
    this.noColor = disabled;
  }

  /**
   * 输出调试信息（仅 verbose 模式）
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.verbose) {
      const prefix = this.noColor ? '[DEBUG]' : chalk.gray('[DEBUG]');
      console.log(prefix, message, ...args);
    }
  }

  /**
   * 输出信息
   */
  info(message: string, ...args: unknown[]): void {
    const prefix = this.noColor ? 'ℹ' : chalk.blue('ℹ');
    console.log(prefix, message, ...args);
  }

  /**
   * 输出成功消息
   */
  success(message: string, ...args: unknown[]): void {
    const prefix = this.noColor ? '✓' : chalk.green('✓');
    console.log(prefix, message, ...args);
  }

  /**
   * 输出警告
   */
  warn(message: string, ...args: unknown[]): void {
    const prefix = this.noColor ? '⚠' : chalk.yellow('⚠');
    console.warn(prefix, message, ...args);
  }

  /**
   * 输出错误
   */
  error(message: string, ...args: unknown[]): void {
    const prefix = this.noColor ? '✗' : chalk.red('✗');
    console.error(prefix, message, ...args);
  }

  /**
   * 输出标题
   */
  title(message: string): void {
    if (this.noColor) {
      console.log(`\n${message}\n`);
    } else {
      console.log(`\n${chalk.bold.cyan(message)}\n`);
    }
  }

  /**
   * 输出分割线
   */
  divider(): void {
    console.log(this.noColor ? '─'.repeat(50) : chalk.gray('─'.repeat(50)));
  }

  /**
   * 输出空行
   */
  newline(): void {
    console.log();
  }

  /**
   * 清除当前行
   */
  clearLine(): void {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
  }
}

// 导出默认实例
export const logger = Logger.getInstance();
