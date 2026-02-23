/**
 * 技术栈类型
 */
export type TechStack = 'React' | 'Vue' | 'Node.js' | 'Python' | 'Other';

/**
 * 项目配置
 */
export interface ProjectConfig {
  /** 项目名称 */
  projectName: string;
  /** Git 主分支名称 */
  gitBranch: string;
  /** 技术栈类型 */
  techStack: TechStack;
  /** 工作流配置 */
  workflow: {
    /** 模板仓库 */
    templateRepo: string;
    /** 模板分支 */
    templateBranch: string;
    /** 最后更新时间 */
    lastUpdated: string;
  };
  /** 初始化时间 */
  initializedAt: string;
}
