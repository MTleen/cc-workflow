import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '../src/utils/logger.js';

describe('Logger', () => {
  let logger: Logger;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // 创建新实例而非使用单例，避免测试间污染
    logger = new Logger({ verbose: false, noColor: true });
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('info', () => {
    it('should output info message', () => {
      logger.info('test message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('success', () => {
    it('should output success message', () => {
      logger.success('test message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should output warning message', () => {
      logger.warn('test message');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should output error message', () => {
      logger.error('test message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('should not output debug message when verbose is false', () => {
      const debugLogger = new Logger({ verbose: false, noColor: true });
      debugLogger.debug('test message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should output debug message when verbose is true', () => {
      const debugLogger = new Logger({ verbose: true, noColor: true });
      debugLogger.debug('test message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('title', () => {
    it('should output title message', () => {
      logger.title('Title');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});
