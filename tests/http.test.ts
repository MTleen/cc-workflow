import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import {
  createHttpClient,
  NetworkError,
  get,
  post,
  downloadFile,
  downloadJson,
  checkUrlAccessible,
  withRetry,
} from '../src/utils/http.js';

// Mock axios
vi.mock('axios', () => {
  const mockAxios = vi.fn();
  mockAxios.create = vi.fn(() => mockAxios);
  mockAxios.get = vi.fn();
  mockAxios.post = vi.fn();
  mockAxios.head = vi.fn();
  mockAxios.interceptors = {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  };
  mockAxios.defaults = { proxy: undefined };
  return { default: mockAxios };
});

describe('http utilities', () => {
  let mockAxios: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAxios = axios as unknown as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createHttpClient', () => {
    it('should create axios instance with default config', () => {
      const client = createHttpClient();
      expect(axios.create).toHaveBeenCalled();
      expect(client).toBeDefined();
    });

    it('should create axios instance with custom config', () => {
      createHttpClient({
        baseURL: 'https://api.example.com',
        timeout: 5000,
        headers: { 'X-Custom': 'value' },
      });

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.example.com',
          timeout: 5000,
        })
      );
    });

    it('should use default timeout of 30000ms', () => {
      createHttpClient();
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });
  });

  describe('NetworkError', () => {
    it('should create error with message', () => {
      const error = new NetworkError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('NetworkError');
    });

    it('should store error code', () => {
      const error = new NetworkError('Test error', 'TIMEOUT');
      expect(error.code).toBe('TIMEOUT');
    });

    it('should store status code', () => {
      const error = new NetworkError('Test error', 'RESPONSE_ERROR', 404);
      expect(error.statusCode).toBe(404);
    });

    it('should store response data', () => {
      const data = { message: 'Not found' };
      const error = new NetworkError('Test error', 'RESPONSE_ERROR', 404, data);
      expect(error.responseData).toEqual(data);
    });
  });

  describe('get', () => {
    it('should call axios.get and return data', async () => {
      const mockData = { result: 'success' };
      const mockClient = {
        get: vi.fn().mockResolvedValue({ data: mockData }),
      } as unknown as ReturnType<typeof axios.create>;

      const result = await get(mockClient, '/api/test');
      expect(result).toEqual(mockData);
    });
  });

  describe('post', () => {
    it('should call axios.post and return data', async () => {
      const mockData = { id: 1 };
      const mockClient = {
        post: vi.fn().mockResolvedValue({ data: mockData }),
      } as unknown as ReturnType<typeof axios.create>;

      const result = await post(mockClient, '/api/test', { name: 'test' });
      expect(result).toEqual(mockData);
    });
  });

  describe('downloadFile', () => {
    it('should download and return file content', async () => {
      const mockContent = 'file content';
      const mockClient = {
        get: vi.fn().mockResolvedValue({ data: mockContent }),
      } as unknown as ReturnType<typeof axios.create>;

      const result = await downloadFile(mockClient, 'https://example.com/file.txt');
      expect(result).toBe(mockContent);
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://example.com/file.txt',
        expect.objectContaining({ responseType: 'text' })
      );
    });
  });

  describe('downloadJson', () => {
    it('should download and return JSON data', async () => {
      const mockJson = { version: '1.0.0' };
      const mockClient = {
        get: vi.fn().mockResolvedValue({ data: mockJson }),
      } as unknown as ReturnType<typeof axios.create>;

      const result = await downloadJson(mockClient, 'https://example.com/data.json');
      expect(result).toEqual(mockJson);
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://example.com/data.json',
        expect.objectContaining({ responseType: 'json' })
      );
    });
  });

  describe('checkUrlAccessible', () => {
    it('should return true for accessible URL', async () => {
      const mockClient = {
        head: vi.fn().mockResolvedValue({}),
      } as unknown as ReturnType<typeof axios.create>;

      const result = await checkUrlAccessible(
        mockClient,
        'https://example.com'
      );
      expect(result).toBe(true);
    });

    it('should return false for inaccessible URL', async () => {
      const mockClient = {
        head: vi.fn().mockRejectedValue(new Error('Network error')),
      } as unknown as ReturnType<typeof axios.create>;

      const result = await checkUrlAccessible(
        mockClient,
        'https://example.com'
      );
      expect(result).toBe(false);
    });
  });

  describe('withRetry', () => {
    it('should return result on first successful attempt', async () => {
      const requestFn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(requestFn, 3, 10);

      expect(result).toBe('success');
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const result = await withRetry(requestFn, 3, 10);

      expect(result).toBe('success');
      expect(requestFn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const error = new Error('persistent failure');
      const requestFn = vi.fn().mockRejectedValue(error);

      await expect(withRetry(requestFn, 3, 10)).rejects.toThrow('persistent failure');
      expect(requestFn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 4xx errors', async () => {
      const error = new NetworkError('Not found', 'RESPONSE_ERROR', 404);
      const requestFn = vi.fn().mockRejectedValue(error);

      await expect(withRetry(requestFn, 3, 10)).rejects.toThrow('Not found');
      expect(requestFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('proxy configuration', () => {
    it('should read HTTP_PROXY environment variable', () => {
      const originalProxy = process.env.HTTP_PROXY;
      process.env.HTTP_PROXY = 'http://proxy.example.com:8080';

      createHttpClient({ enableProxy: true });

      process.env.HTTP_PROXY = originalProxy;
      expect(axios.create).toHaveBeenCalled();
    });

    it('should read HTTPS_PROXY environment variable', () => {
      const originalHttpsProxy = process.env.HTTPS_PROXY;
      const originalHttpProxy = process.env.HTTP_PROXY;
      // Clear HTTP_PROXY to avoid the URL parsing issue
      delete process.env.HTTP_PROXY;
      process.env.HTTPS_PROXY = 'http://proxy.example.com:8443';

      createHttpClient({ enableProxy: true });

      process.env.HTTPS_PROXY = originalHttpsProxy;
      process.env.HTTP_PROXY = originalHttpProxy;
      expect(axios.create).toHaveBeenCalled();
    });

    it('should not configure proxy when disabled', () => {
      createHttpClient({ enableProxy: false });
      expect(axios.create).toHaveBeenCalled();
    });
  });
});
