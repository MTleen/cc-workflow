import { describe, it, expect, vi } from 'vitest';
import { GitHubClient } from '../src/clients/github-client.js';

// Mock logger
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('GitHubClient', () => {
  describe('constructor', () => {
    it('should create client with default config', () => {
      const client = new GitHubClient();
      expect(client).toBeDefined();
    });

    it('should create client with custom config', () => {
      const client = new GitHubClient({
        baseURL: 'https://custom.api.github.com',
        timeout: 5000,
        token: 'test-token',
        verbose: true,
      });
      expect(client).toBeDefined();
    });
  });

  describe('method existence', () => {
    const client = new GitHubClient();

    it('should have getContents method', () => {
      expect(typeof client.getContents).toBe('function');
    });

    it('should have getFileContent method', () => {
      expect(typeof client.getFileContent).toBe('function');
    });

    it('should have getFileByUrl method', () => {
      expect(typeof client.getFileByUrl).toBe('function');
    });

    it('should have getVersion method', () => {
      expect(typeof client.getVersion).toBe('function');
    });

    it('should have fetchDirectory method', () => {
      expect(typeof client.fetchDirectory).toBe('function');
    });

    it('should have repoExists method', () => {
      expect(typeof client.repoExists).toBe('function');
    });

    it('should have pathExists method', () => {
      expect(typeof client.pathExists).toBe('function');
    });
  });

  describe('type exports', () => {
    it('should export GitHubFile type', () => {
      const file: import('../src/clients/github-client.js').GitHubFile = {
        name: 'test.md',
        path: 'docs/test.md',
        sha: 'abc123',
        size: 100,
        url: 'https://api.github.com/repos/owner/repo/contents/docs/test.md',
        download_url: 'https://raw.githubusercontent.com/owner/repo/main/docs/test.md',
        type: 'file',
      };
      expect(file.name).toBe('test.md');
    });

    it('should export GitHubFileContent type', () => {
      const fileContent: import('../src/clients/github-client.js').GitHubFileContent = {
        name: 'test.md',
        path: 'test.md',
        sha: 'abc123',
        size: 100,
        url: 'https://api.github.com/repos/owner/repo/contents/test.md',
        download_url: null,
        type: 'file',
        content: Buffer.from('test content').toString('base64'),
        encoding: 'base64',
      };
      expect(fileContent.encoding).toBe('base64');
    });
  });
});
