/**
 * ideal-cli - Ideal Lab 开发工作流初始化工具
 *
 * @packageDocumentation
 */

import { Command } from 'commander';
import { registerCommands } from './commands/index.js';

// 从 package.json 读取版本号
const VERSION = '1.0.0';

/**
 * 自定义帮助信息
 */
function customizeHelp(program: Command): void {
  // 添加使用示例到帮助信息末尾
  program.addHelpText('after', `

Examples:
  $ ideal init              交互式初始化工作流
  $ ideal config list       查看当前配置
  $ ideal doctor            检查配置完整性
`);
}

/**
 * 创建并配置 CLI 程序
 */
function createProgram(): Command {
  const program = new Command();

  // 基本配置
  program
    .name('ideal')
    .description('ideal-cli - Ideal Lab 开发工作流初始化工具')
    .version(VERSION, '-v, --version', '输出版本号')
    .helpOption('-h, --help', '显示帮助信息');

  // 注册所有命令
  registerCommands(program);

  // 自定义帮助信息
  customizeHelp(program);

  return program;
}

/**
 * CLI 主入口
 */
async function main(): Promise<void> {
  const program = createProgram();

  // 解析命令行参数
  await program.parseAsync(process.argv);
}

// 导出类型（供外部使用）
export * from './types/index.js';

// 启动 CLI
main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
