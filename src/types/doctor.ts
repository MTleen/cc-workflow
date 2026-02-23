/**
 * 检查结果状态
 */
export type CheckStatus = 'pass' | 'warning' | 'error';

/**
 * 检查结果
 */
export interface CheckResult {
  /** 检查项名称 */
  name: string;
  /** 检查状态 */
  status: CheckStatus;
  /** 检查消息 */
  message: string;
  /** 详细信息 */
  details?: string;
}

/**
 * 诊断结果
 */
export interface DoctorResult {
  /** 检查结果列表 */
  checks: CheckResult[];
  /** 摘要统计 */
  summary: {
    /** 通过数量 */
    passed: number;
    /** 警告数量 */
    warnings: number;
    /** 错误数量 */
    errors: number;
  };
}
