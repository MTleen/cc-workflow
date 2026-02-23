/**
 * 提示信息常量
 */

// ============ 成功消息 ============

export const MSG_INIT_SUCCESS = '项目初始化完成！';
export const MSG_CONFIG_SAVED = '配置已保存';
export const MSG_UPDATE_SUCCESS = '更新完成！';
export const MSG_DOCTOR_PASS = '所有检查通过';

// ============ 错误消息 ============

export const ERR_NETWORK_OFFLINE = '网络连接失败，请检查网络后重试';
export const ERR_GITHUB_ACCESS = '无法访问 GitHub 仓库，请检查网络或仓库地址';
export const ERR_DIR_EXISTS = '目录已存在，请使用 --force 强制覆盖';
export const ERR_CONFIG_NOT_FOUND = '配置文件不存在，请先运行 ideal init';
export const ERR_CONFIG_INVALID = '配置文件格式无效';
export const ERR_TEMPLATE_NOT_FOUND = '模板文件不存在';
export const ERR_PERMISSION_DENIED = '权限不足，请检查文件权限';
export const ERR_GIT_NOT_INSTALLED = 'Git 未安装，请先安装 Git';

// ============ 警告消息 ============

export const WARN_VERSION_LOW = '版本过低，建议升级到最新版本';
export const WARN_PYTHON_LOW = 'Python 版本过低（当前 {current}，建议 {required}+）';
export const WARN_NODE_LOW = 'Node.js 版本过低（当前 {current}，建议 {required}+）';
export const WARN_FILE_MODIFIED = '文件已被修改，更新时可能被覆盖';
export const WARN_CONFLICT_DETECTED = '检测到冲突，请手动解决';

// ============ 信息消息 ============

export const INFO_CREATING_DIR = '正在创建目录...';
export const INFO_DOWNLOADING = '正在下载模板...';
export const INFO_CHECKING = '正在检查...';
export const INFO_UPDATING = '正在更新...';

// ============ 帮助消息 ============

export const HELP_INIT = '初始化项目工作流配置';
export const HELP_CONFIG = '查看或修改项目配置';
export const HELP_UPDATE = '更新工作流模板到最新版本';
export const HELP_DOCTOR = '检查工作流配置完整性和有效性';

// ============ 交互提示 ============

export const PROMPT_PROJECT_NAME = '项目名称';
export const PROMPT_GIT_BRANCH = 'Git 主分支名称';
export const PROMPT_TECH_STACK = '技术栈类型';
export const PROMPT_SKIP = '输入 skip 跳过';

// ============ 格式化消息 ============

/**
 * 格式化版本警告消息
 */
export function formatVersionWarning(
  type: 'Python' | 'Node.js',
  current: string,
  required: string
): string {
  return type === 'Python'
    ? WARN_PYTHON_LOW.replace('{current}', current).replace('{required}', required)
    : WARN_NODE_LOW.replace('{current}', current).replace('{required}', required);
}
