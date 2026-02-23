/**
 * Spinner 工具
 *
 * 提供加载动画效果
 */

import ora, { Ora } from 'ora';

/**
 * Spinner 实例类型
 */
export type Spinner = Ora;

/**
 * 创建 Spinner
 */
export function createSpinner(text: string): Spinner {
  return ora({
    text,
    spinner: 'dots',
  });
}

/**
 * 启动 Spinner
 */
export function startSpinner(text: string): Spinner {
  const spinner = createSpinner(text);
  spinner.start();
  return spinner;
}

/**
 * 停止 Spinner 并显示成功
 */
export function spinnerSuccess(spinner: Spinner, text?: string): void {
  spinner.succeed(text);
}

/**
 * 停止 Spinner 并显示失败
 */
export function spinnerFail(spinner: Spinner, text?: string): void {
  spinner.fail(text);
}

/**
 * 停止 Spinner 并显示警告
 */
export function spinnerWarn(spinner: Spinner, text?: string): void {
  spinner.warn(text);
}

/**
 * 停止 Spinner 并显示信息
 */
export function spinnerInfo(spinner: Spinner, text?: string): void {
  spinner.info(text);
}

/**
 * 更新 Spinner 文本
 */
export function updateSpinnerText(spinner: Spinner, text: string): void {
  spinner.text = text;
}

export { Ora } from 'ora';
