/**
 * Config 命令模块
 *
 * 提供配置查看和修改功能
 */

import path from 'path';
import { Command } from 'commander';
import { ConfigManager, CONFIG_DIR_NAME } from '../services/config-manager.js';
import { ProjectConfig } from '../types/config.js';
import { ERR_CONFIG_NOT_FOUND } from '../constants/messages.js';
import { pathExists } from '../utils/file-system.js';

/**
 * 获取项目根目录（查找包含 .claude 目录的目录）
 * @param startPath 起始路径，默认为当前工作目录
 * @returns 项目根目录路径，如果未找到则返回 null
 */
async function getProjectRoot(startPath: string = process.cwd()): Promise<string | null> {
  let currentPath = path.resolve(startPath);

  while (currentPath !== path.dirname(currentPath)) {
    const claudePath = path.join(currentPath, CONFIG_DIR_NAME);
    if (await pathExists(claudePath)) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }

  // 检查根目录
  const rootClaudePath = path.join(currentPath, CONFIG_DIR_NAME);
  if (await pathExists(rootClaudePath)) {
    return currentPath;
  }

  return null;
}

/**
 * 获取嵌套对象中的值
 * @param obj - 对象
 * @param keyPath - 键路径（如 'workflow.templateRepo'）
 * @returns 值或 undefined
 */
function getNestedValue(obj: Record<string, unknown>, keyPath: string): unknown {
  const keys = keyPath.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * 设置嵌套对象中的值
 * @param obj - 对象
 * @param keyPath - 键路径（如 'workflow.templateRepo'）
 * @param value - 要设置的值
 */
function setNestedValue(
  obj: Record<string, unknown>,
  keyPath: string,
  value: string
): void {
  const keys = keyPath.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  // 尝试解析值为 JSON（用于布尔值、数字等）
  let parsedValue: unknown = value;
  try {
    parsedValue = JSON.parse(value);
  } catch {
    // 保持为字符串
  }

  current[keys[keys.length - 1]] = parsedValue;
}

/**
 * 将配置对象展平为键值对数组
 * @param config - 配置对象
 * @param prefix - 键前缀
 * @returns 键值对数组
 */
function flattenConfig(
  config: ProjectConfig,
  prefix = ''
): Array<{ key: string; value: string }> {
  const result: Array<{ key: string; value: string }> = [];

  for (const [key, value] of Object.entries(config)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // 递归处理嵌套对象
      result.push(...flattenConfig(value as ProjectConfig, fullKey));
    } else {
      result.push({
        key: fullKey,
        value: String(value),
      });
    }
  }

  return result;
}

/**
 * ConfigCommand 类
 *
 * 管理 config 命令及其子命令
 */
export class ConfigCommand {
  private configManager: ConfigManager;

  constructor() {
    this.configManager = new ConfigManager();
  }

  /**
   * 注册命令到 Commander 程序
   * @param program - Commander 程序实例
   */
  register(program: Command): void {
    const configCommand = program
      .command('config')
      .description('查看或修改项目配置');

    // list 子命令 - 显示所有配置
    configCommand
      .command('list')
      .description('显示所有配置项')
      .action(async () => {
        await this.handleList();
      });

    // get 子命令 - 获取指定配置
    configCommand
      .command('get <key>')
      .description('获取指定配置值')
      .action(async (key: string) => {
        await this.handleGet(key);
      });

    // set 子命令 - 设置配置值
    configCommand
      .command('set <key> <value>')
      .description('设置配置值')
      .action(async (key: string, value: string) => {
        await this.handleSet(key, value);
      });
  }

  /**
   * 处理 list 子命令
   */
  private async handleList(): Promise<void> {
    try {
      const projectRoot = await getProjectRoot();
      if (!projectRoot) {
        console.error(ERR_CONFIG_NOT_FOUND);
        process.exit(1);
        return;
      }
      const config = await this.configManager.read(projectRoot);
      const items = flattenConfig(config);

      // 输出表头
      console.log('');
      console.log('配置项'.padEnd(30) + '值');
      console.log('-'.repeat(50));

      // 输出配置项
      for (const item of items) {
        console.log(item.key.padEnd(30) + item.value);
      }

      console.log('');
    } catch (error) {
      if (error instanceof Error && error.message.includes('配置文件不存在')) {
        console.error(ERR_CONFIG_NOT_FOUND);
        process.exit(1);
      }
      throw error;
    }
  }

  /**
   * 处理 get 子命令
   * @param key - 配置键名（支持嵌套，如 workflow.templateRepo）
   */
  private async handleGet(key: string): Promise<void> {
    try {
      const projectRoot = await getProjectRoot();
      if (!projectRoot) {
        console.error(ERR_CONFIG_NOT_FOUND);
        process.exit(1);
        return;
      }
      const config = await this.configManager.read(projectRoot);
      const value = getNestedValue(config as unknown as Record<string, unknown>, key);

      if (value === undefined) {
        console.log(`配置项 "${key}" 不存在`);
        process.exit(1);
      }

      // 输出值（如果是对象，格式化输出）
      if (typeof value === 'object' && value !== null) {
        console.log(JSON.stringify(value, null, 2));
      } else {
        console.log(String(value));
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('配置文件不存在')) {
        console.error(ERR_CONFIG_NOT_FOUND);
        process.exit(1);
      }
      throw error;
    }
  }

  /**
   * 处理 set 子命令
   * @param key - 配置键名（支持嵌套，如 workflow.templateRepo）
   * @param value - 配置值
   */
  private async handleSet(key: string, value: string): Promise<void> {
    try {
      const projectRoot = await getProjectRoot();
      if (!projectRoot) {
        console.error(ERR_CONFIG_NOT_FOUND);
        process.exit(1);
        return;
      }
      const config = await this.configManager.read(projectRoot);

      // 转换为可变对象
      const configObj = config as unknown as Record<string, unknown>;
      setNestedValue(configObj, key, value);

      // 转换回 ProjectConfig 并保存
      const updatedConfig = configObj as unknown as ProjectConfig;
      await this.configManager.write(projectRoot, updatedConfig);

      console.log(`已更新: ${key} = ${value}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('配置文件不存在')) {
        console.error(ERR_CONFIG_NOT_FOUND);
        process.exit(1);
      }
      throw error;
    }
  }
}

/**
 * 创建并返回 ConfigCommand 实例
 */
export function createConfigCommand(): ConfigCommand {
  return new ConfigCommand();
}
