# npm 发布认证问题调研报告

## 问题现象

执行 `npm publish` 时报错：
```
npm notice Access token expired or revoked. Please try logging in again.
npm error code E404
npm error 404 Not Found - PUT https://registry.npmjs.org/@mathripper%2fideal-cli - Not found
```

即使 `npm whoami` 返回正确的用户名，发布仍然失败。

## 根本原因

### npm 认证系统重大变更（2025年12月9日）

npm 官方在 2025年12月9日 完成了安全强化计划的核心变更：

| 变更项 | 旧机制 | 新机制 |
|--------|--------|--------|
| Classic Tokens | 永久有效 | **永久作废** |
| `npm login` | 生成长期 token | 生成 **2小时** session token |
| Granular Token | 不要求 2FA | **默认要求 2FA**，需手动勾选 Bypass |
| Token 有效期 | 无限制 | 写权限 token 最长 **90天** |

### 为什么我们的 token 失败

1. **Session Token 权限不足** - `npm login --auth-type=web` 生成的 session token 只有读取权限
2. **Granular Token 未启用 Bypass 2FA** - 创建时必须勾选 "Bypass 2FA for non-interactive automated workflows"
3. **权限配置错误** - 需要选择 "Read and write" 而不是默认的 "Read only"

## 解决方案

### 方案一：创建 Granular Token（推荐）

1. 访问 https://www.npmjs.com/settings/mathripper/tokens/granular-access-tokens/new

2. 配置如下：
   - **Token name**: `ideal-cli-publish`
   - **Expiration**: 90 days（或更短）
   - **Packages**: 选择 **Read and write**（关键！）
   - **Organizations**: 无需选择
   - **2FA bypass**: **必须勾选**（关键！）

3. 创建后，复制 token 并配置：
   ```bash
   npm config set //registry.npmjs.org/:_authToken 你的token
   ```

4. 发布：
   ```bash
   cd /tmp/ideal-cli-publish && npm publish --access public
   ```

### 方案二：使用 Trusted Publishing（CI/CD 推荐）

对于 GitHub Actions 自动发布，推荐使用 OIDC Trusted Publishing：

1. 在 npm 网站配置 Trusted Publisher：
   - 进入包设置页面
   - 添加 GitHub Actions 为可信发布者
   - 配置 Repository owner/name 和 Workflow name

2. 在 GitHub Actions workflow 中：
   ```yaml
   permissions:
     contents: read
     id-token: write  # 关键：启用 OIDC

   steps:
     - uses: actions/checkout@v4
     - uses: actions/setup-node@v4
       with:
         node-version: '20'
         registry-url: 'https://registry.npmjs.org/'
     - run: npm publish  # 无需 NPM_TOKEN
   ```

### 方案三：使用 npm login + OTP（临时方案）

如果账户开启了 TOTP 2FA：

```bash
npm login
# 然后发布时提供 OTP
npm publish --access public --otp=123456
```

**注意**：这需要账户配置了 Authenticator App (TOTP)，而不是只有 Security Key。

## 当前状态

- npm 账户：`mathripper`
- 2FA 状态：**disabled**（通过 `npm profile get` 确认）
- 账户创建时间：2026-02-23
- 包名：`@mathripper/ideal-cli`
- 代码位置：`/tmp/ideal-cli-publish/`

## 下一步

由于账户没有开启 2FA，理论上不需要 Bypass 2FA 选项。问题可能是：

1. **Token 权限不是 Read and write** - 需要确认
2. **Token 类型不对** - 可能创建的是 Legacy Token 而不是 Granular Token

建议重新访问 https://www.npmjs.com/settings/mathripper/tokens 确认：
- 现有 token 的类型（应该是 Granular Access Token）
- 权限设置（应该是 Read and write）

## 参考资料

- [npm Classic Token 作废公告](https://github.blog/changelog/2025-12-09-npm-classic-tokens-revoked-session-based-auth-and-cli-token-management-now-available/)
- [npm Granular Token 变更说明](https://github.blog/changelog/2025-11-05-npm-security-update-classic-token-creation-disabled-and-granular-token-changes/)
- [掘金：npm Classic Token 作废后 CI/CD 改造](https://juejin.cn/post/7586969583783444486)
