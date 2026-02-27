# 工作流拓展到多工作类型的设计思考（最终版）

## 核心架构

### Skill 目录结构

每个 Skill 遵循统一的目录结构：

```
.claude/skills/ideal-xxx/
├── SKILL.md                    # 索引文件，引导不同工作类型的任务
├── instructions/               # 最佳实践/指导（按工作类型组织）
│   ├── software-dev.md        # 软件开发的指导
│   ├── doc-writing.md        # 文档撰写的指导
│   └── presentation.md        # 汇报材料的指导
├── references/                 # 参考文件
│   ├── templates/             # 模板文件
│   │   ├── software-dev/
│   │   │   └── requirement.md
│   │   ├── doc-writing/
│   │   │   └── requirement.md
│   │   └── presentation/
│   │       └── requirement.md
│   └── detection-rules.md     # 探测规则
└── scripts/                    # 脚本文件
    └── validate-xxx.py
```

### SKILL.md 作为索引

SKILL.md 不包含具体逻辑，而是：
1. **声明用途**：说明 Skill 的职责边界
2. **工作类型索引**：列出支持的工作类型和对应的 instruction 文件
3. **通用流程**：描述跨工作类型的通用流程
4. **References**：指向其他资源文件

```markdown
## 工作类型索引

| 工作类型 | 标识符 | instruction 文件 |
|----------|--------|------------------|
| 软件开发 | software-dev | instructions/software-dev.md |
| 文档撰写 | doc-writing | instructions/doc-writing.md |
| 汇报材料 | presentation | instructions/presentation.md |
```

### instruction 文件包含具体指导

每个工作类型的 instruction 文件包含：
- 适用场景
- 详细步骤
- 模板路径
- 注意事项

## 关键原则

1. **SKILL.md 是索引**：不包含具体逻辑，只引导读取对应的 instruction
2. **instruction 是指导**：包含该工作类型的最佳实践和详细步骤
3. **templates 是模板**：按工作类型组织模板文件
4. **work_type 在配置中**：`project-config.md` 记录工作类型，各 Skill 读取后选择对应资源

## 数据流

```
ideal-init
    │
    ├── 探测 work_type → 记录到 project-config.md
    │
    └── 根据 work_type 读取对应 instruction

ideal-requirement（及其他 Skill）
    │
    ├── 读取 project-config.md 获取 work_type
    │
    └── 根据 work_type 选择：
        ├── instructions/{work_type}.md
        └── templates/{work_type}/*.md
```

## 验证方式的差异

所有工作类型都启用全部 15 阶段，差异在验证方式：

| 工作类型 | P7 测试用例 | P11 测试执行 |
|----------|-------------|--------------|
| 软件开发 | 功能/边界/异常测试用例 | 运行 `npm test` 等脚本 |
| 文档撰写 | 评审标准（受众画像、检查项） | LLM 角色模拟（受众/专家/挑刺者） |
| 汇报材料 | 评审标准（时长、关键点） | LLM 演练模拟（听众/时间/内容审核） |

## 实施路径

### Phase 1: ideal-init 重构（当前迭代）

- [x] 重构 SKILL.md 为索引文件
- [x] 创建 instructions/ 目录
- [x] 创建 software-dev.md 和 doc-writing.md
- [x] 更新 project-config.md.tmpl

### Phase 2: 其他 Skill 重构

- [ ] ideal-requirement：按相同模式重构
- [ ] ideal-dev-solution：按相同模式重构
- [ ] ideal-test-case：按相同模式重构
- [ ] ideal-test-exec：按相同模式重构

### Phase 3: 资源文件准备

- [ ] 为各工作类型准备模板文件
- [ ] 为文档类准备 LLM 角色模拟提示词
- [ ] 为汇报类准备 LLM 演练提示词

## 相关文件

- `.claude/skills/ideal-init/SKILL.md` - 重构后的索引文件
- `.claude/skills/ideal-init/instructions/software-dev.md` - 软件开发指导
- `.claude/skills/ideal-init/instructions/doc-writing.md` - 文档撰写指导
- `.claude/skills/ideal-init/references/detection-rules.md` - 探测规则
- `.claude/skills/ideal-init/references/templates/project-config.md.tmpl` - 配置模板

---

*此回复基于 ideal-init skill 优化迭代中的最终设计*
