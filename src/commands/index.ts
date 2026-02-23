/**
 * 命令注册模块
 *
 * 统一注册所有 CLI 命令
 */

import { Command } from 'commander';
import { HELP_INIT, HELP_DOCTOR } from '../constants/messages.js';
import { DoctorCommand } from './doctor.js';
import { createConfigCommand } from './config.js';
import { UpdateCommand } from './update.js';

/**
 * 占位命令处理函数 - init
 *
 * TODO: 在后续 Story 中实现完整功能
 */
async function handleInit(): Promise<void> {
  console.log('init 命令尚未实现');
  process.exit(0);
}

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
  // init 命令 - 初始化项目工作流配置
  program
    .command('init')
    .description(HELP_INIT)
    .action(handleInit);

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
