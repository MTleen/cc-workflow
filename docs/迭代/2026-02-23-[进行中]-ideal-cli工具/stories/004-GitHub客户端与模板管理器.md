---
story_id: 004
title: GitHub Client 与模板管理器
status: completed
depends_on: [003]
---

# Story 004: GitHub Client 与模板管理器

## 上下文

### 需求来源
> 来源：P1-需求文档.md#三、功能需求

- 模板来源：从 GitHub 仓库实时拉取最新版本
- 离线环境时报错退出

### 技术方案
> 来源：P3-技术方案.md#三、功能模块设计

**GitHub API**：
- `GET /repos/{owner}/{repo}/contents/{path}` - 获取目录内容
- 无需认证（公开仓库）
- 限流：60 次/小时

**模板仓库结构**：
```
ideal-lab/best-practices/dev-workflow/
├── version.json
├── agents/
├── skills/
└── configs/
```

### 相关代码

已完成的模块（Story 003）：
- `src/utils/http.ts` - HTTP 客户端
- `src/utils/file-system.ts` - 文件操作
- `src/types/template.ts` - 模板类型

## 任务清单

- [x] M016-1: 实现 GitHubClient 类
  - [x] 创建 src/clients/github-client.ts
  - [x] 实现 GitHubClient 类
  - [x] 配置 API 基础 URL
- [x] M016-2: 实现获取目录内容
  - [x] 实现 getContents(owner, repo, path) 方法
  - [x] 返回 GitHubFile[] 类型
  - [x] 处理 404 错误
- [x] M016-3: 实现获取文件内容
  - [x] 实现 getFileContent(url) 方法
  - [x] Base64 解码内容
- [x] M016-4: 实现获取版本信息
  - [x] 实现 getVersion(owner, repo) 方法
  - [x] 解析 version.json
- [x] M016-5: 实现递归获取目录
  - [x] 实现 fetchDirectory(owner, repo, path) 方法
  - [x] 递归获取所有文件
  - [x] 返回文件树结构
- [x] M017-1: 实现 TemplateManager 类
  - [x] 创建 src/services/template-manager.ts
  - [x] 注入 GitHubClient 依赖
- [x] M017-2: 实现 fetchTemplate 方法
  - [x] 从 GitHub 拉取模板
  - [x] 缓存到 ~/.ideal-cli/cache/
- [x] M017-3: 实现 applyTemplate 方法
  - [x] 应用模板到目标目录
  - [x] 处理模板变量替换
- [x] M017-4: 实现 getTemplateVersion 方法
  - [x] 获取远程版本信息
- [x] M017-5: 实现缓存管理
  - [x] 实现 clearCache() 方法
  - [x] 实现 getCachePath() 方法

## 验收标准

### 功能验收
- [x] getContents 返回正确的文件列表
- [x] getFileContent 正确解码 Base64
- [x] fetchDirectory 递归获取完整目录树
- [x] fetchTemplate 成功下载并缓存模板
- [x] applyTemplate 正确应用模板到目标目录
- [x] 模板变量 {{projectName}} 正确替换

### 代码质量
- [x] 所有网络请求有错误处理
- [x] 缓存目录正确创建
- [x] 类型定义完整

## 实现笔记

**完成时间**: 2026-02-23

**已创建文件**:
- `src/clients/github-client.ts` - GitHub API 客户端
  - getContents, getFileContent, getFileByUrl
  - getVersion, fetchDirectory, repoExists, pathExists
- `src/services/template-manager.ts` - 模板管理器
  - fetchTemplate, applyTemplate, getTemplateVersion
  - clearCache, getCachedVersion, hasUpdate
- `tests/github-client.test.ts` - GitHub 客户端测试（11 个测试）
- `tests/template-manager.test.ts` - 模板管理器测试（27 个测试）

**验证结果**:
- TypeScript 类型检查: ✅ 通过
- 构建: ✅ 成功
- 测试: ✅ 164 个测试通过
