---
story_id: 003
title: 产品发布 Skill - ideal-product-release
status: pending
depends_on: [001, 002]
---

# Story 003: 产品发布 Skill - ideal-product-release

## 上下文

### 需求来源
> 来源：P3-技术方案.md#三、通用 Skills 设计

**定位**：通用的 CI/CD 发布流程 Skill，可被任何需要发布产品资源的项目复用。

**调用阶段**：P14

### 技术方案
> 来源：P3-技术方案.md#3.1 ideal-product-release

**Skill 职责：**

| 职责 | 说明 |
|------|------|
| 版本管理 | 语义化版本自动递增（major/minor/patch） |
| 元数据生成 | 生成/更新 manifest.json、registry.json |
| 构建验证 | 完整性检查、单元测试、集成测试 |
| 部署执行 | 文件同步、git push、创建 tag |
| 发布记录 | 自动生成 changelog、更新版本历史 |
| 多环境支持 | staging/production 环境切换 |
| 回滚机制 | 发布失败时自动回滚 |

**Skill 定义结构：**
```
ideal-product-release/
├── SKILL.md
├── scripts/
│   ├── version-bump.sh
│   ├── generate-manifest.py
│   ├── update-registry.py
│   ├── validate-package.py
│   ├── deploy.sh
│   ├── rollback.sh
│   └── generate-changelog.py
└── references/
    ├── templates/
    │   ├── manifest.template.json
    │   └── changelog.template.md
    └── guides/
        ├── version-strategy.md
        └── rollback-guide.md
```

### 相关代码

依赖模块：
- `ideal-best-practice/registry.json` - Story 001 创建
- `ideal-best-practice/packages/ideal-dev/manifest.json` - Story 001 创建
- `install.sh` / `install.ps1` - Story 002 创建

---

## 任务清单

- [ ] **任务 1**: 准备 Skill 需求文档
  - [ ] 提取 Skill 职责（7 项）
  - [ ] 整理工作流程（5 步）
  - [ ] 定义配置项
  - [ ] 定义 Agents（dev, architect）
  - [ ] 整理成需求文档

- [ ] **任务 2**: 调用 /writing-skills 创建 Skill
  - [ ] 调用 /writing-skills
  - [ ] 提供 Skill 用途描述
  - [ ] 提供工作流程
  - [ ] 提供配置项需求
  - [ ] 确认 SKILL.md 生成

- [ ] **任务 3**: 验证 Skill 脚本
  - [ ] 验证 version-bump.sh
  - [ ] 验证 generate-manifest.py
  - [ ] 验证 update-registry.py
  - [ ] 验证 validate-package.py
  - [ ] 验证 deploy.sh
  - [ ] 验证 rollback.sh
  - [ ] 验证 generate-changelog.py

- [ ] **任务 4**: 集成 Skill 到项目
  - [ ] 放入 `.claude/skills/ideal-product-release/`
  - [ ] 更新 CLAUDE.md Skills 索引
  - [ ] 复制到发布仓库
  - [ ] 测试 Skill 可调用

---

## 验收标准

### 功能验收
- [ ] SKILL.md 存在且格式正确
- [ ] 所有 7 个脚本存在
- [ ] 所有模板文件存在
- [ ] `/ideal-product-release --help` 显示帮助
- [ ] `/ideal-product-release --dry-run` 模拟成功

### 代码质量
- [ ] 脚本通过语法检查
- [ ] SKILL.md 符合 Skill 规范
- [ ] 配置项文档完整

---

## 实现笔记

<!-- 由 Claude 在执行过程中填写 -->
