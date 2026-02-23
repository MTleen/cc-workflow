import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import {
  ensureDir,
  isEmpty,
  copyDir,
  readFile,
  writeFile,
  fileExists,
  pathExists,
  readDir,
  remove,
  calculateHash,
  renderTemplate,
  normalizePath,
  joinPaths,
  getDirName,
  getBaseName,
  getExtName,
  toAbsolutePath,
  getRelativePath,
  walkDir,
} from '../src/utils/file-system.js';

describe('file-system utilities', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ideal-cli-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('ensureDir', () => {
    it('should create directory if it does not exist', async () => {
      const dirPath = path.join(tempDir, 'new-dir');
      await ensureDir(dirPath);
      expect(await fs.pathExists(dirPath)).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      const dirPath = path.join(tempDir, 'existing-dir');
      await fs.ensureDir(dirPath);
      await expect(ensureDir(dirPath)).resolves.not.toThrow();
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty directory', async () => {
      const dirPath = path.join(tempDir, 'empty-dir');
      await fs.ensureDir(dirPath);
      expect(await isEmpty(dirPath)).toBe(true);
    });

    it('should return false for non-empty directory', async () => {
      const dirPath = path.join(tempDir, 'non-empty-dir');
      await fs.ensureDir(dirPath);
      await fs.writeFile(path.join(dirPath, 'file.txt'), 'content');
      expect(await isEmpty(dirPath)).toBe(false);
    });

    it('should return true for non-existent directory', async () => {
      const dirPath = path.join(tempDir, 'non-existent');
      expect(await isEmpty(dirPath)).toBe(true);
    });
  });

  describe('copyDir', () => {
    it('should copy directory contents', async () => {
      const srcDir = path.join(tempDir, 'src');
      const destDir = path.join(tempDir, 'dest');

      await fs.ensureDir(srcDir);
      await fs.writeFile(path.join(srcDir, 'file.txt'), 'content');
      await fs.ensureDir(path.join(srcDir, 'subdir'));
      await fs.writeFile(path.join(srcDir, 'subdir', 'nested.txt'), 'nested');

      await copyDir(srcDir, destDir);

      expect(await fs.pathExists(destDir)).toBe(true);
      expect(await fs.readFile(path.join(destDir, 'file.txt'), 'utf-8')).toBe(
        'content'
      );
      expect(
        await fs.readFile(path.join(destDir, 'subdir', 'nested.txt'), 'utf-8')
      ).toBe('nested');
    });

    it('should respect filter option', async () => {
      const srcDir = path.join(tempDir, 'src');
      const destDir = path.join(tempDir, 'dest');

      await fs.ensureDir(srcDir);
      await fs.writeFile(path.join(srcDir, 'include.txt'), 'content');
      await fs.writeFile(path.join(srcDir, 'exclude.txt'), 'excluded');

      await copyDir(srcDir, destDir, {
        filter: (src) => !src.includes('exclude'),
      });

      expect(await fs.pathExists(path.join(destDir, 'include.txt'))).toBe(true);
      expect(await fs.pathExists(path.join(destDir, 'exclude.txt'))).toBe(
        false
      );
    });
  });

  describe('readFile and writeFile', () => {
    it('should write and read file content', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await writeFile(filePath, 'Hello, World!');
      const content = await readFile(filePath);
      expect(content).toBe('Hello, World!');
    });

    it('should handle different encodings', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const chineseContent = '你好，世界';
      await writeFile(filePath, chineseContent);
      const content = await readFile(filePath);
      expect(content).toBe(chineseContent);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(tempDir, 'exists.txt');
      await fs.writeFile(filePath, 'content');
      expect(await fileExists(filePath)).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const filePath = path.join(tempDir, 'not-exists.txt');
      expect(await fileExists(filePath)).toBe(false);
    });
  });

  describe('pathExists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(tempDir, 'file.txt');
      await fs.writeFile(filePath, 'content');
      expect(await pathExists(filePath)).toBe(true);
    });

    it('should return true for existing directory', async () => {
      expect(await pathExists(tempDir)).toBe(true);
    });

    it('should return false for non-existing path', async () => {
      expect(await pathExists(path.join(tempDir, 'nonexistent'))).toBe(false);
    });
  });

  describe('readDir', () => {
    it('should list directory contents', async () => {
      await fs.writeFile(path.join(tempDir, 'file1.txt'), '');
      await fs.writeFile(path.join(tempDir, 'file2.txt'), '');
      await fs.ensureDir(path.join(tempDir, 'subdir'));

      const contents = await readDir(tempDir);
      expect(contents).toContain('file1.txt');
      expect(contents).toContain('file2.txt');
      expect(contents).toContain('subdir');
    });
  });

  describe('remove', () => {
    it('should remove file', async () => {
      const filePath = path.join(tempDir, 'to-remove.txt');
      await fs.writeFile(filePath, 'content');
      await remove(filePath);
      expect(await fs.pathExists(filePath)).toBe(false);
    });

    it('should remove directory recursively', async () => {
      const dirPath = path.join(tempDir, 'to-remove-dir');
      await fs.ensureDir(dirPath);
      await fs.writeFile(path.join(dirPath, 'file.txt'), 'content');
      await remove(dirPath);
      expect(await fs.pathExists(dirPath)).toBe(false);
    });
  });

  describe('calculateHash', () => {
    it('should return consistent MD5 hash', () => {
      const content = 'test content';
      const hash = calculateHash(content);
      // MD5 hash of "test content"
      expect(hash).toBe('9473fdd0d880a43c21b7778d34872157');
    });

    it('should return different hashes for different content', () => {
      const hash1 = calculateHash('content1');
      const hash2 = calculateHash('content2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return 32-character hex string', () => {
      const hash = calculateHash('test');
      expect(hash).toHaveLength(32);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });

  describe('renderTemplate', () => {
    it('should replace variables in template', () => {
      const template = 'Hello, {{name}}!';
      const result = renderTemplate(template, { name: 'World' });
      expect(result).toBe('Hello, World!');
    });

    it('should handle multiple variables', () => {
      const template = '{{greeting}}, {{name}}! Welcome to {{place}}.';
      const result = renderTemplate(template, {
        greeting: 'Hi',
        name: 'Alice',
        place: 'Wonderland',
      });
      expect(result).toBe('Hi, Alice! Welcome to Wonderland.');
    });

    it('should leave unmatched variables as empty', () => {
      const template = 'Hello, {{name}}!';
      const result = renderTemplate(template, {});
      expect(result).toBe('Hello, !');
    });
  });

  describe('path utilities', () => {
    describe('normalizePath', () => {
      it('should normalize path separators', () => {
        const result = normalizePath('a/b/../c/./d');
        expect(result).toContain('c');
        expect(result).not.toContain('..');
        expect(result).not.toContain('./');
      });
    });

    describe('joinPaths', () => {
      it('should join path segments', () => {
        const result = joinPaths('a', 'b', 'c');
        expect(result).toContain('a');
        expect(result).toContain('b');
        expect(result).toContain('c');
      });
    });

    describe('getDirName', () => {
      it('should return directory name', () => {
        expect(getDirName('/path/to/file.txt')).toBe('/path/to');
      });
    });

    describe('getBaseName', () => {
      it('should return file name', () => {
        expect(getBaseName('/path/to/file.txt')).toBe('file.txt');
      });
    });

    describe('getExtName', () => {
      it('should return extension', () => {
        expect(getExtName('/path/to/file.txt')).toBe('.txt');
      });

      it('should return empty string for no extension', () => {
        expect(getExtName('/path/to/file')).toBe('');
      });
    });

    describe('toAbsolutePath', () => {
      it('should convert relative path to absolute', () => {
        const result = toAbsolutePath('.');
        expect(path.isAbsolute(result)).toBe(true);
      });
    });

    describe('getRelativePath', () => {
      it('should return relative path', () => {
        const result = getRelativePath('/a/b', '/a/b/c/d');
        expect(result).toBe('c/d' || path.join('c', 'd'));
      });
    });
  });

  describe('walkDir', () => {
    it('should list all files recursively', async () => {
      await fs.writeFile(path.join(tempDir, 'file1.txt'), '');
      await fs.writeFile(path.join(tempDir, 'file2.txt'), '');
      const subdir = path.join(tempDir, 'subdir');
      await fs.ensureDir(subdir);
      await fs.writeFile(path.join(subdir, 'file3.txt'), '');

      const files = await walkDir(tempDir);

      expect(files).toContain(path.join(tempDir, 'file1.txt'));
      expect(files).toContain(path.join(tempDir, 'file2.txt'));
      expect(files).toContain(path.join(subdir, 'file3.txt'));
      expect(files).not.toContain(subdir); // 不包含目录
    });

    it('should include directories when option is set', async () => {
      await fs.writeFile(path.join(tempDir, 'file.txt'), '');
      const subdir = path.join(tempDir, 'subdir');
      await fs.ensureDir(subdir);

      const paths = await walkDir(tempDir, { includeDirs: true });

      expect(paths).toContain(subdir);
    });

    it('should filter files', async () => {
      await fs.writeFile(path.join(tempDir, 'include.txt'), '');
      await fs.writeFile(path.join(tempDir, 'exclude.log'), '');

      const files = await walkDir(tempDir, {
        filter: (filePath) => filePath.endsWith('.txt'),
      });

      expect(files).toContain(path.join(tempDir, 'include.txt'));
      expect(files).not.toContain(path.join(tempDir, 'exclude.log'));
    });
  });
});
