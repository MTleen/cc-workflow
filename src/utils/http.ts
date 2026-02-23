/**
 * HTTP 客户端工具
 *
 * 基于 axios 封装的 HTTP 客户端，支持代理、超时、错误处理
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

/**
 * HTTP 客户端配置
 */
export interface HttpClientConfig {
  /** 基础 URL */
  baseURL?: string;
  /** 超时时间（毫秒），默认 30000 */
  timeout?: number;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 是否启用代理，默认 true */
  enableProxy?: boolean;
  /** 是否启用 verbose 日志 */
  verbose?: boolean;
}

/**
 * 网络错误
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly responseData?: unknown
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * 默认超时时间（30秒）
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * 创建 HTTP 客户端实例
 * @param config 客户端配置
 * @returns Axios 实例
 */
export function createHttpClient(config: HttpClientConfig = {}): AxiosInstance {
  const {
    baseURL,
    timeout = DEFAULT_TIMEOUT,
    headers = {},
    enableProxy = true,
    verbose = false,
  } = config;

  const instance = axios.create({
    baseURL,
    timeout,
    headers: {
      'User-Agent': 'ideal-cli/1.0.0',
      ...headers,
    },
  });

  // 配置代理
  if (enableProxy) {
    configureProxy(instance);
  }

  // 请求拦截器
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (verbose) {
        console.log(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`);
      }
      return config;
    },
    (error: Error) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      if (verbose) {
        console.log(
          `[HTTP] Response ${response.status} ${response.config.url}`
        );
      }
      return response;
    },
    (error: AxiosError) => {
      return Promise.reject(handleAxiosError(error));
    }
  );

  return instance;
}

/**
 * 配置代理
 * @param instance Axios 实例
 */
function configureProxy(instance: AxiosInstance): void {
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;

  if (httpProxy || httpsProxy) {
    instance.defaults.proxy = {
      host: '',
      port: 0,
    };

    // 根据协议选择代理
    if (httpsProxy) {
      const url = new URL(httpsProxy);
      instance.defaults.proxy = {
        host: url.hostname,
        port: parseInt(url.port, 10) || 443,
        protocol: url.protocol.replace(':', '') as 'http' | 'https',
      };
    }

    if (httpProxy) {
      const url = new URL(httpProxy);
      // 仅用于 http 请求
      instance.interceptors.request.use((config) => {
        if (config.url?.startsWith('http://')) {
          config.proxy = {
            host: url.hostname,
            port: parseInt(url.port, 10) || 80,
            protocol: 'http',
          };
        }
        return config;
      });
    }
  }
}

/**
 * 处理 Axios 错误
 * @param error Axios 错误对象
 * @returns 网络错误对象
 */
function handleAxiosError(error: AxiosError): NetworkError {
  // 请求已发出但服务器响应状态码超出 2xx 范围
  if (error.response) {
    const { status, data } = error.response;
    let message = `请求失败，状态码: ${status}`;

    // 尝试从响应中提取错误信息
    if (data && typeof data === 'object' && 'message' in data) {
      message = (data as { message: string }).message;
    } else if (typeof data === 'string') {
      message = data.substring(0, 200); // 限制消息长度
    }

    return new NetworkError(message, 'RESPONSE_ERROR', status, data);
  }

  // 请求已发出但没有收到响应
  if (error.request) {
    return new NetworkError(
      '无法连接到服务器，请检查网络连接',
      'NO_RESPONSE'
    );
  }

  // 请求配置错误
  if (error.code === 'ECONNABORTED') {
    return new NetworkError(
      `请求超时，请稍后重试（超时时间: ${error.config?.timeout || DEFAULT_TIMEOUT}ms）`,
      'TIMEOUT'
    );
  }

  // 其他错误
  return new NetworkError(
    error.message || '未知网络错误',
    error.code || 'UNKNOWN'
  );
}

/**
 * GET 请求
 * @param client Axios 实例
 * @param url 请求 URL
 * @param config 请求配置
 * @returns 响应数据
 */
export async function get<T = unknown>(
  client: AxiosInstance,
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await client.get<T>(url, config);
  return response.data;
}

/**
 * POST 请求
 * @param client Axios 实例
 * @param url 请求 URL
 * @param data 请求数据
 * @param config 请求配置
 * @returns 响应数据
 */
export async function post<T = unknown>(
  client: AxiosInstance,
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await client.post<T>(url, data, config);
  return response.data;
}

/**
 * 下载文件内容
 * @param client Axios 实例
 * @param url 文件 URL
 * @returns 文件内容
 */
export async function downloadFile(
  client: AxiosInstance,
  url: string
): Promise<string> {
  const response = await client.get(url, {
    responseType: 'text',
  });
  return response.data;
}

/**
 * 下载 JSON 数据
 * @param client Axios 实例
 * @param url JSON URL
 * @returns JSON 数据
 */
export async function downloadJson<T = unknown>(
  client: AxiosInstance,
  url: string
): Promise<T> {
  const response = await client.get<T>(url, {
    responseType: 'json',
  });
  return response.data;
}

/**
 * 检查 URL 是否可访问
 * @param client Axios 实例
 * @param url 要检查的 URL
 * @param timeout 超时时间（毫秒）
 * @returns 如果可访问返回 true
 */
export async function checkUrlAccessible(
  client: AxiosInstance,
  url: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await client.head(url, { timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * 带重试的请求
 * @param requestFn 请求函数
 * @param maxRetries 最大重试次数，默认 3
 * @param retryDelay 重试延迟（毫秒），默认 1000
 * @returns 响应数据
 */
export async function withRetry<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;

      // 如果是 4xx 错误，不重试
      if (error instanceof NetworkError && error.statusCode) {
        if (error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }
      }

      // 最后一次尝试不等待
      if (attempt < maxRetries) {
        await sleep(retryDelay * attempt); // 指数退避
      }
    }
  }

  throw lastError;
}

/**
 * 休眠
 * @param ms 毫秒数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 默认 HTTP 客户端
 */
export const defaultHttpClient = createHttpClient();
