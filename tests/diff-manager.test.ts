import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import {
  DiffManager,
  METADATA_FILE_NAME,
  METADATA_DIR_NAME,
  LocalFileInfo,
} from '../src/services/diff-manager.js';
import { ProjectMetadata } from '../src/types/metadata.js';
import { TemplateFile } from '../src/types/template.js';

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

describe('DiffManager', () => {
  let manager: DiffManager;
  let tempDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    manager = new DiffManager();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ideal-cli-diff-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
    vi.restoreAllMocks();
  });

  describe('getMetadataPath', () => {
    it('should return correct metadata file path', () => {
      const metadataPath = manager.getMetadataPath('/project/root');
      expect(metadataPath).toBe(path.join('/project/root', METADATA_DIR_NAME, METADATA_FILE_NAME));
    });
  });

  describe('readMetadata', () => {
    it('should return null when metadata does not exist', async () => {
      const metadata = await manager.readMetadata(tempDir);
      expect(metadata).toBeNull();
    });

    it('should read metadata file', async () => {
      const metadataDir = path.join(tempDir, METADATA_DIR_NAME);
      await fs.ensureDir(metadataDir);

      const metadataContent: ProjectMetadata = {
        version: '1.0.0',
        initializedAt: '2024-01-01T00:00:00Z',
        templateVersion: '1.2.0',
        files: {
          '.claude/agents/pm.md': {
            originalHash: 'abc123',
            remoteVersion: '1.2.0',
          },
        },
      };

      await fs.writeFile(
        path.join(metadataDir, METADATA_FILE_NAME),
        JSON.stringify(metadataContent)
      );

      const result = await manager.readMetadata(tempDir);

      expect(result).not.toBeNull();
      expect(result?.version).toBe('1.0.0');
      expect(result?.templateVersion).toBe('1.2.0');
      expect(result?.files['.claude/agents/pm.md'].originalHash).toBe('abc123');
    });

    it('should throw error for invalid JSON', async () => {
      const metadataDir = path.join(tempDir, METADATA_DIR_NAME);
      await fs.ensureDir(metadataDir);
      await fs.writeFile(
        path.join(metadataDir, METADATA_FILE_NAME),
        'invalid json'
      );

      await expect(manager.readMetadata(tempDir)).rejects.toThrow('元数据文件解析失败');
    });
  });

  describe('writeMetadata', () => {
    it('should write metadata file', async () => {
      const metadata: ProjectMetadata = {
        version: '1.0.0',
        initializedAt: '2024-01-01T00:00:00Z',
        templateVersion: '1.0.0',
        files: {},
      };

      await manager.writeMetadata(tempDir, metadata);

      const metadataPath = path.join(tempDir, METADATA_DIR_NAME, METADATA_FILE_NAME);
      expect(await fs.pathExists(metadataPath)).toBe(true);

      const content = await fs.readFile(metadataPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.version).toBe('1.0.0');
    });

    it('should format JSON with indentation', async () => {
      const metadata: ProjectMetadata = {
        version: '1.0.0',
        initializedAt: '2024-01-01T00:00:00Z',
        templateVersion: '1.0.0',
        files: {
          'test.md': {
            originalHash: 'hash123',
            remoteVersion: '1.0.0',
          },
        },
      };

      await manager.writeMetadata(tempDir, metadata);

      const metadataPath = path.join(tempDir, METADATA_DIR_NAME, METADATA_FILE_NAME);
      const content = await fs.readFile(metadataPath, 'utf-8');
      expect(content).toContain('  "version"');
      expect(content).toContain('  "files"');
    });
  });

  describe('createInitialMetadata', () => {
    it('should create initial metadata with specified version', () => {
      const metadata = manager.createInitialMetadata('2.0.0');

      expect(metadata.version).toBe('1.0.0');
      expect(metadata.templateVersion).toBe('2.0.0');
      expect(metadata.initializedAt).toBeDefined();
      expect(metadata.lastUpdatedAt).toBeDefined();
      expect(Object.keys(metadata.files).length).toBe(0);
    });
  });

  describe('updateFileMetadata', () => {
    it('should add new file metadata', async () => {
      // Create initial metadata
      const metadata = manager.createInitialMetadata('1.0.0');
      await manager.writeMetadata(tempDir, metadata);

      await manager.updateFileMetadata(tempDir, '.claude/agents/pm.md', {
        originalHash: 'newhash123',
        remoteVersion: '1.0.0',
      });

      const updated = await manager.readMetadata(tempDir);
      expect(updated?.files['.claude/agents/pm.md'].originalHash).toBe('newhash123');
    });

    it('should update existing file metadata', async () => {
      const metadata = manager.createInitialMetadata('1.0.0');
      metadata.files['.claude/agents/pm.md'] = {
        originalHash: 'oldhash',
        remoteVersion: '1.0.0',
      };
      await manager.writeMetadata(tempDir, metadata);

      await manager.updateFileMetadata(tempDir, '.claude/agents/pm.md', {
        originalHash: 'newhash',
        remoteVersion: '1.1.0',
      });

      const updated = await manager.readMetadata(tempDir);
      expect(updated?.files['.claude/agents/pm.md'].originalHash).toBe('newhash');
      expect(updated?.files['.claude/agents/pm.md'].remoteVersion).toBe('1.1.0');
    });

    it('should throw error when metadata does not exist', async () => {
      await expect(
        manager.updateFileMetadata(tempDir, 'test.md', {
          originalHash: 'hash',
          remoteVersion: '1.0.0',
        })
      ).rejects.toThrow('元数据不存在');
    });

    it('should update lastUpdatedAt timestamp', async () => {
      const metadata = manager.createInitialMetadata('1.0.0');
      const originalTime = metadata.lastUpdatedAt;
      await manager.writeMetadata(tempDir, metadata);

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await manager.updateFileMetadata(tempDir, 'test.md', {
        originalHash: 'hash',
        remoteVersion: '1.0.0',
      });

      const updated = await manager.readMetadata(tempDir);
      expect(updated?.lastUpdatedAt).not.toBe(originalTime);
    });
  });

  describe('compare', () => {
    it('should detect unchanged files', async () => {
      const localFiles: LocalFileInfo[] = [
        { path: '.claude/agents/pm.md', hash: 'abc123', size: 100 },
      ];

      const remoteFiles: TemplateFile[] = [
        { path: '.claude/agents/pm.md', hash: 'abc123', size: 100, type: 'agent' },
      ];

      const metadata = manager.createInitialMetadata('1.0.0');
      metadata.files['.claude/agents/pm.md'] = {
        originalHash: 'abc123',
        remoteVersion: '1.0.0',
      };

      const result = await manager.compare(localFiles, remoteFiles, metadata);

      expect(result.hasChanges).toBe(false);
      expect(result.unchangedCount).toBe(1);
      expect(result.diffs[0].status).toBe('unchanged');
    });

    it('should detect modified files', async () => {
      const localFiles: LocalFileInfo[] = [
        { path: '.claude/agents/pm.md', hash: 'modified123', size: 150 },
      ];

      const remoteFiles: TemplateFile[] = [
        { path: '.claude/agents/pm.md', hash: 'abc123', size: 100, type: 'agent' },
      ];

      const metadata = manager.createInitialMetadata('1.0.0');
      metadata.files['.claude/agents/pm.md'] = {
        originalHash: 'abc123',
        remoteVersion: '1.0.0',
      };

      const result = await manager.compare(localFiles, remoteFiles, metadata);

      expect(result.hasChanges).toBe(true);
      expect(result.modifiedCount).toBe(1);
      expect(result.diffs[0].status).toBe('modified');
    });

    it('should detect added files', async () => {
      const localFiles: LocalFileInfo[] = [
        { path: '.claude/agents/new.md', hash: 'new123', size: 50 },
      ];

      const remoteFiles: TemplateFile[] = [];

      const metadata = manager.createInitialMetadata('1.0.0');

      const result = await manager.compare(localFiles, remoteFiles, metadata);

      expect(result.hasChanges).toBe(true);
      expect(result.addedCount).toBe(1);
      expect(result.diffs[0].status).toBe('added');
    });

    it('should detect deleted files', async () => {
      const localFiles: LocalFileInfo[] = [];

      const remoteFiles: TemplateFile[] = [
        { path: '.claude/agents/pm.md', hash: 'abc123', size: 100, type: 'agent' },
      ];

      const metadata = manager.createInitialMetadata('1.0.0');
      metadata.files['.claude/agents/pm.md'] = {
        originalHash: 'abc123',
        remoteVersion: '1.0.0',
      };

      const result = await manager.compare(localFiles, remoteFiles, metadata);

      expect(result.hasChanges).toBe(true);
      expect(result.deletedCount).toBe(1);
      expect(result.diffs[0].status).toBe('deleted');
    });

    it('should detect remote-new files', async () => {
      const localFiles: LocalFileInfo[] = [];

      const remoteFiles: TemplateFile[] = [
        { path: '.claude/agents/new.md', hash: 'new123', size: 50, type: 'agent' },
      ];

      const metadata = manager.createInitialMetadata('1.0.0');

      const result = await manager.compare(localFiles, remoteFiles, metadata);

      expect(result.hasChanges).toBe(true);
      expect(result.remoteNewCount).toBe(1);
      expect(result.diffs[0].status).toBe('remote-new');
    });

    it('should detect conflicts', async () => {
      const localFiles: LocalFileInfo[] = [
        { path: '.claude/agents/pm.md', hash: 'user123', size: 150 },
      ];

      const remoteFiles: TemplateFile[] = [
        { path: '.claude/agents/pm.md', hash: 'remote456', size: 120, type: 'agent' },
      ];

      const metadata = manager.createInitialMetadata('1.0.0');
      metadata.files['.claude/agents/pm.md'] = {
        originalHash: 'original789',
        remoteVersion: '1.0.0',
      };

      const result = await manager.compare(localFiles, remoteFiles, metadata);

      expect(result.hasChanges).toBe(true);
      expect(result.conflictCount).toBe(1);
      expect(result.diffs[0].status).toBe('conflict');
    });

    it('should handle multiple files with different statuses', async () => {
      const localFiles: LocalFileInfo[] = [
        { path: '.claude/agents/pm.md', hash: 'unchanged', size: 100 },
        { path: '.claude/agents/architect.md', hash: 'modified', size: 150 },
        { path: '.claude/agents/new.md', hash: 'new', size: 50 },
      ];

      const remoteFiles: TemplateFile[] = [
        { path: '.claude/agents/pm.md', hash: 'unchanged', size: 100, type: 'agent' },
        { path: '.claude/agents/architect.md', hash: 'original', size: 100, type: 'agent' },
        { path: '.claude/agents/remote-new.md', hash: 'remote', size: 80, type: 'agent' },
      ];

      const metadata = manager.createInitialMetadata('1.0.0');
      metadata.files['.claude/agents/pm.md'] = { originalHash: 'unchanged', remoteVersion: '1.0.0' };
      metadata.files['.claude/agents/architect.md'] = { originalHash: 'original', remoteVersion: '1.0.0' };

      const result = await manager.compare(localFiles, remoteFiles, metadata);

      expect(result.unchangedCount).toBe(1); // pm.md
      expect(result.modifiedCount).toBe(1); // architect.md
      expect(result.addedCount).toBe(1); // new.md
      expect(result.remoteNewCount).toBe(1); // remote-new.md
    });
  });

  describe('isUserModified', () => {
    it('should return true when file is modified', async () => {
      const metadata = manager.createInitialMetadata('1.0.0');
      metadata.files['test.md'] = {
        originalHash: 'original123',
        remoteVersion: '1.0.0',
      };
      await manager.writeMetadata(tempDir, metadata);

      // Create a modified file
      const filePath = path.join(tempDir, 'test.md');
      await fs.writeFile(filePath, 'modified content');

      const isModified = await manager.isUserModified(tempDir, 'test.md', metadata);
      expect(isModified).toBe(true);
    });

    it('should return false when file is unchanged', async () => {
      const content = 'original content';
      const hash = require('crypto').createHash('md5').update(content).digest('hex');

      const metadata = manager.createInitialMetadata('1.0.0');
      metadata.files['test.md'] = {
        originalHash: hash,
        remoteVersion: '1.0.0',
      };
      await manager.writeMetadata(tempDir, metadata);

      // Create file with original content
      const filePath = path.join(tempDir, 'test.md');
      await fs.writeFile(filePath, content);

      const isModified = await manager.isUserModified(tempDir, 'test.md', metadata);
      expect(isModified).toBe(false);
    });

    it('should return true when file has no metadata', async () => {
      const metadata = manager.createInitialMetadata('1.0.0');
      await manager.writeMetadata(tempDir, metadata);

      const filePath = path.join(tempDir, 'new.md');
      await fs.writeFile(filePath, 'new content');

      const isModified = await manager.isUserModified(tempDir, 'new.md', metadata);
      expect(isModified).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      const metadata = manager.createInitialMetadata('1.0.0');
      metadata.files['deleted.md'] = {
        originalHash: 'hash',
        remoteVersion: '1.0.0',
      };
      await manager.writeMetadata(tempDir, metadata);

      const isModified = await manager.isUserModified(tempDir, 'deleted.md', metadata);
      expect(isModified).toBe(false);
    });
  });

  describe('getUserModifiedFiles', () => {
    it('should return list of modified files', async () => {
      const originalContent = 'original';
      const originalHash = require('crypto').createHash('md5').update(originalContent).digest('hex');

      const metadata = manager.createInitialMetadata('1.0.0');
      metadata.files['unchanged.md'] = { originalHash: originalHash, remoteVersion: '1.0.0' };
      metadata.files['modified.md'] = { originalHash: 'oldhash', remoteVersion: '1.0.0' };
      await manager.writeMetadata(tempDir, metadata);

      // Create files
      await fs.writeFile(path.join(tempDir, 'unchanged.md'), originalContent);
      await fs.writeFile(path.join(tempDir, 'modified.md'), 'modified content');

      const modifiedFiles = await manager.getUserModifiedFiles(tempDir, metadata);

      expect(modifiedFiles).toContain('modified.md');
      expect(modifiedFiles).not.toContain('unchanged.md');
    });
  });

  describe('scanLocalFiles', () => {
    it('should return empty array when directory does not exist', async () => {
      const files = await manager.scanLocalFiles(tempDir, '.claude');
      expect(files).toEqual([]);
    });

    it('should scan files in directory', async () => {
      const claudeDir = path.join(tempDir, '.claude', 'agents');
      await fs.ensureDir(claudeDir);
      await fs.writeFile(path.join(claudeDir, 'pm.md'), 'pm content');
      await fs.writeFile(path.join(claudeDir, 'architect.md'), 'architect content');

      const files = await manager.scanLocalFiles(tempDir, '.claude');

      expect(files.length).toBe(2);
      expect(files.some((f) => f.path.endsWith('pm.md'))).toBe(true);
      expect(files.some((f) => f.path.endsWith('architect.md'))).toBe(true);
      expect(files[0].hash).toBeDefined();
      expect(files[0].size).toBeGreaterThan(0);
    });

    it('should filter files based on filter function', async () => {
      const claudeDir = path.join(tempDir, '.claude');
      await fs.ensureDir(claudeDir);
      await fs.writeFile(path.join(claudeDir, 'config.md'), 'config');
      await fs.writeFile(path.join(claudeDir, 'data.txt'), 'data');

      const files = await manager.scanLocalFiles(tempDir, '.claude', (filePath) =>
        filePath.endsWith('.md')
      );

      expect(files.length).toBe(1);
      expect(files[0].path.endsWith('config.md')).toBe(true);
    });
  });

  describe('syncMetadata', () => {
    it('should create new metadata if not exists', async () => {
      const files: LocalFileInfo[] = [
        { path: '.claude/agents/pm.md', hash: 'hash123', size: 100 },
      ];

      await manager.syncMetadata(tempDir, files, '2.0.0');

      const metadata = await manager.readMetadata(tempDir);
      expect(metadata).not.toBeNull();
      expect(metadata?.templateVersion).toBe('2.0.0');
      expect(metadata?.files['.claude/agents/pm.md'].originalHash).toBe('hash123');
    });

    it('should update existing metadata', async () => {
      const oldMetadata = manager.createInitialMetadata('1.0.0');
      oldMetadata.files['old.md'] = { originalHash: 'oldhash', remoteVersion: '1.0.0' };
      await manager.writeMetadata(tempDir, oldMetadata);

      const newFiles: LocalFileInfo[] = [
        { path: '.claude/agents/pm.md', hash: 'newhash', size: 100 },
      ];

      await manager.syncMetadata(tempDir, newFiles, '2.0.0');

      const metadata = await manager.readMetadata(tempDir);
      expect(metadata?.templateVersion).toBe('2.0.0');
      expect(metadata?.files['.claude/agents/pm.md'].originalHash).toBe('newhash');
    });

    it('should set lastSyncedAt for synced files', async () => {
      const files: LocalFileInfo[] = [
        { path: 'test.md', hash: 'hash', size: 10 },
      ];

      await manager.syncMetadata(tempDir, files, '1.0.0');

      const metadata = await manager.readMetadata(tempDir);
      expect(metadata?.files['test.md'].lastSyncedAt).toBeDefined();
    });
  });

  describe('path normalization', () => {
    it('should normalize Windows-style paths', async () => {
      const metadata = manager.createInitialMetadata('1.0.0');
      await manager.writeMetadata(tempDir, metadata);

      // Use Windows-style path
      await manager.updateFileMetadata(tempDir, 'agents\\pm.md', {
        originalHash: 'hash',
        remoteVersion: '1.0.0',
      });

      const result = await manager.readMetadata(tempDir);
      // Should be normalized to forward slashes
      expect(result?.files['agents/pm.md']).toBeDefined();
    });
  });
});
