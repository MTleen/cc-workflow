/**
 * 命令注册模块
 *
 * 统一注册所有 CLI 命令
 */

import { Command } from 'commander';
import { HELP_DOCTOR } from '../constants/messages.js';
import { DoctorCommand } from './doctor.js';
import { createConfigCommand } from './config.js';
import { UpdateCommand } from './update.js';
import { InitCommand } from './init.js';

/**
 * doctor 命令处理函数
 */
async function handleDoctor(options: { verbose?: boolean }): Promise<void> {
  const doctor = new DoctorCommand({
    verbose: options.verbose,
  });
  const exitCode = await doctor.execute();
  process.exit(exitCode);
}

/**
 * 注册所有命令到 Commander 程序
 *
 * @param program - Commander 程序实例
 */
export function registerCommands(program: Command): void {
  // init 命令 - 初始化项目工作流配置（简化版，无交互式引导）
  program
    .command('init')
    .description('初始化项目工作流配置')
    .option('-f, --force', '强制覆盖已存在的配置')
    .option('-v, --verbose', '显示详细日志')
    .action(async (options: { force?: boolean; verbose?: boolean }) => {
      const initCommand = new InitCommand({
        verbose: options.verbose,
      });
      const exitCode = await initCommand.execute({ force: options.force });
      process.exit(exitCode);
    });

  // config 命令 - 查看或修改项目配置（带子命令）
  const configCommand = createConfigCommand();
  configCommand.register(program);

  // update 命令 - 更新工作流模板到最新版本
  const updateCommand = new UpdateCommand();
  updateCommand.register(program);

  // doctor 命令 - 检查工作流配置完整性和有效性
  program
    .command('doctor')
    .description(HELP_DOCTOR)
    .option('-v, --verbose', '显示详细输出')
    .action(handleDoctor);
}
