/**
 * 默认值常量
 */

/**
 * 默认 GitHub 仓库所有者
 */
export const DEFAULT_REPO_OWNER = 'MTleen';

/**
 * 默认 GitHub 仓库名称
 */
export const DEFAULT_REPO_NAME = 'ideal-lab';

/**
 * 默认 Git 分支
 */
export const DEFAULT_BRANCH = 'main';

/**
 * 默认模板路径
 */
export const DEFAULT_TEMPLATE_PATH = 'best-practices/dev-workflow';

/**
 * 完整模板仓库 URL
 */
export const TEMPLATE_REPO_URL = `https://github.com/${DEFAULT_REPO_OWNER}/${DEFAULT_REPO_NAME}`;

/**
 * GitHub API 内容 URL
 */
export const GITHUB_API_CONTENTS_URL = `https://api.github.com/repos/${DEFAULT_REPO_OWNER}/${DEFAULT_REPO_NAME}/contents`;

/**
 * 默认项目配置
 */
export const DEFAULT_PROJECT_CONFIG = {
  projectName: '',
  gitBranch: DEFAULT_BRANCH,
  techStack: 'Node.js' as const,
  workflow: {
    templateRepo: `${DEFAULT_REPO_OWNER}/${DEFAULT_REPO_NAME}`,
    templateBranch: DEFAULT_BRANCH,
    lastUpdated: '',
  },
  initializedAt: '',
};

/**
 * 支持的技术栈列表
 */
export const TECH_STACKS = ['React', 'Vue', 'Node.js', 'Python', 'Other'] as const;

/**
 * 必需目录列表
 */
export const REQUIRED_DIRS = [
  '.claude',
  '.claude/agents',
  '.claude/skills',
  'docs',
  'docs/迭代',
  'docs/Wiki',
];

/**
 * 必需文件列表
 */
export const REQUIRED_FILES = [
  'CLAUDE.md',
  '.claude/project-config.md',
];

/**
 * CLI 版本
 */
export const CLI_VERSION = '1.0.0';

/**
 * CLI 名称
 */
export const CLI_NAME = 'ideal-cli';
