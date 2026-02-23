---
story_id: 005
title: Wiki 发布 Skill - ideal-wiki-release
status: pending
depends_on: [004]
---

# Story 005: Wiki 发布 Skill - ideal-wiki-release

## 上下文

### 需求来源
> 来源：P3-技术方案.md#3.2 ideal-wiki-release

**定位**：通用的 Wiki 文档发布 Skill，负责文档站构建和部署，可被任何项目复用。

**调用阶段**：P17

### 技术方案
> 来源：P3-技术方案.md#3.2 ideal-wiki-release

**Skill 职责：**

| 职责 | 说明 |
|------|------|
| 文档站构建 | Docusaurus 构建静态文件 |
| 产品主页更新 | 更新介绍页面内容 |
| 站点部署 | 部署到 GitHub Pages |
| 版本化文档 | 支持多版本文档（可选） |
| SEO 优化 | 自动生成 sitemap、meta 信息 |
| 发布验证 | 检查链接有效性、资源完整性 |

**Skill 定义结构：**
```
ideal-wiki-release/
├── SKILL.md
├── scripts/
│   ├── build-docs.sh
│   ├── update-homepage.py
│   ├── deploy-pages.sh
│   ├── validate-links.py
│   └── generate-sitemap.py
└── references/
    ├── templates/
    │   ├── docusaurus.config.template.js
    │   └── homepage.template.md
    └── guides/
        ├── docusaurus-setup.md
        └── multi-version-docs.md
```

**发布流程：**
```
1. 预检查：验证文档目录结构、资源文件完整性
2. 构建文档站：执行 Docusaurus build
3. 更新产品主页：从配置同步主页内容
4. 部署执行：推送到 GitHub Pages 分支
5. 发布验证：检查链接有效性、页面可访问性
```

### 相关代码

依赖模块：
- `wiki/` Docusaurus 项目 - Story 004 创建

---

## 任务清单

- [ ] **任务 1**: 准备 Skill 需求文档
  - [ ] 提取 Skill 职责（6 项）
  - [ ] 整理工作流程（5 步）
  - [ ] 定义配置项
  - [ ] 定义 Agents（tech-writer, dev）
  - [ ] 整理成需求文档

- [ ] **任务 2**: 调用 /writing-skills 创建 Skill
  - [ ] 调用 /writing-skills
  - [ ] 提供 Skill 用途描述
  - [ ] 提供工作流程
  - [ ] 提供配置项需求
  - [ ] 确认 SKILL.md 生成

- [ ] **任务 3**: 验证 Skill 脚本
  - [ ] 验证 build-docs.sh
  - [ ] 验证 update-homepage.py
  - [ ] 验证 deploy-pages.sh
  - [ ] 验证 validate-links.py
  - [ ] 验证 generate-sitemap.py

- [ ] **任务 4**: 集成 Skill 到项目
  - [ ] 放入 `.claude/skills/ideal-wiki-release/`
  - [ ] 更新 CLAUDE.md Skills 索引
  - [ ] 复制到发布仓库
  - [ ] 测试 Skill 可调用

---

## 验收标准

### 功能验收
- [ ] SKILL.md 存在且格式正确
- [ ] 所有 5 个脚本存在
- [ ] 所有模板文件存在
- [ ] `/ideal-wiki-release --help` 显示帮助
- [ ] `/ideal-wiki-release --dry-run` 模拟成功

### 代码质量
- [ ] 脚本通过语法检查
- [ ] SKILL.md 符合 Skill 规范
- [ ] 配置项文档完整

---

## 实现笔记

<!-- 由 Claude 在执行过程中填写 -->
