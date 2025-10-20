# 版本号不匹配问题修复

## 📋 问题描述

推送 `v0.0.2` tag，但是：

- ❌ v0.0.2 的 Release 没有 exe 文件
- ❌ 自动创建了 v1.0.0 的 Release
- ✅ v1.0.0 的 Release 里面有 exe 文件

## 🔍 根本原因

### 版本号来源不一致

electron-builder 构建时**从 `package.json` 读取版本号**，而不是从 Git tag 读取。

```
用户操作                    实际情况                      结果
─────────────────────────────────────────────────────────────
推送 v0.0.2 tag      →     package.json: "1.0.0"    →    构建 1.0.0 版本
                    ↓                                     ↓
              触发 Actions                          创建/更新 v1.0.0 Release
                    ↓                                     ↓
           electron-builder 读取                   上传 fingertips-ai-1.0.0-setup.exe
              package.json                               ↓
                    ↓                              v0.0.2 没有 exe ❌
            发现版本是 1.0.0                       v1.0.0 有 exe ✅
```

### 问题流程

1. 用户创建并推送 `v0.0.2` tag
2. GitHub Actions 触发工作流
3. `package.json` 中的版本是 `"version": "1.0.0"`
4. electron-builder 读取 package.json，认为版本是 1.0.0
5. 构建出 `fingertips-ai-1.0.0-setup.exe`
6. 上传到 GitHub，创建或更新 `v1.0.0` 的 Release
7. v0.0.2 的 Release 只有源码，没有 exe

## ✅ 解决方案

### 自动同步版本号

在构建前从 Git tag 自动更新 package.json 的版本号。

#### 实现代码

在 `.github/workflows/release.yml` 中添加：

```yaml
- name: Update package.json version from tag
  shell: bash
  run: |
    # 从 tag 提取版本号（移除 'v' 前缀）
    VERSION=${GITHUB_REF#refs/tags/v}
    echo "Tag version: $VERSION"

    # 更新 package.json 中的版本号
    npm version $VERSION --no-git-tag-version --allow-same-version

    echo "✅ Updated package.json version to $VERSION"
    cat package.json | grep '"version"'
```

#### 关键参数说明

- `${GITHUB_REF#refs/tags/v}`：从 `refs/tags/v0.0.2` 提取 `0.0.2`
- `npm version $VERSION`：更新 package.json 的 version 字段
- `--no-git-tag-version`：只更新文件，不创建 git commit 和 tag
- `--allow-same-version`：允许设置相同的版本号（避免错误）

### 执行顺序

```yaml
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Update package.json version from tag  ← ✅ 必须在构建前执行
5. Build application
6. Publish to GitHub Releases
7. Update release and publish
```

## 📊 修复效果

### 修复前

| Git Tag | package.json | 构建文件名                    | Release | 结果          |
| ------- | ------------ | ----------------------------- | ------- | ------------- |
| v0.0.2  | 1.0.0        | fingertips-ai-1.0.0-setup.exe | v1.0.0  | ❌ 版本错乱   |
| v0.0.3  | 1.0.0        | fingertips-ai-1.0.0-setup.exe | v1.0.0  | ❌ 覆盖旧版本 |

### 修复后

| Git Tag | package.json     | 构建文件名                    | Release | 结果        |
| ------- | ---------------- | ----------------------------- | ------- | ----------- |
| v0.0.2  | 0.0.2 (自动更新) | fingertips-ai-0.0.2-setup.exe | v0.0.2  | ✅ 版本一致 |
| v0.0.3  | 0.0.3 (自动更新) | fingertips-ai-0.0.3-setup.exe | v0.0.3  | ✅ 版本一致 |

## 🧪 验证方法

### 1. 查看 Actions 日志

在 "Update package.json version from tag" 步骤中应该看到：

```
Tag version: 0.0.2
npm version 0.0.2 --no-git-tag-version --allow-same-version
✅ Updated package.json version to 0.0.2
"version": "0.0.2",
```

### 2. 查看构建日志

在 "Publish to GitHub Releases" 步骤中应该看到：

```
• electron-builder  version=25.1.8
• loaded configuration  file=electron-builder.yml
• building        target=nsis file=fingertips-ai-0.0.2-setup.exe
```

### 3. 查看 Release 页面

- Release 标题：v0.0.2
- 文件名：fingertips-ai-0.0.2-setup.exe
- 版本号一致 ✅

## 🎯 最佳实践

### 1. 不需要手动修改 package.json

package.json 中的版本号可以保持不变（比如 1.0.0），工作流会自动同步。

**建议**：

- 开发时：package.json 保持一个稳定的版本号
- 发布时：通过 Git tag 控制版本号
- 构建时：自动同步版本号

### 2. Tag 命名规范

必须使用 `v` 前缀 + 语义化版本号：

✅ **正确**：

- `v0.0.1`
- `v0.0.2`
- `v1.0.0`
- `v1.2.3`
- `v2.0.0-beta.1`

❌ **错误**：

- `0.0.1` (缺少 v 前缀)
- `version-1.0.0` (格式错误)
- `release-1` (格式错误)

### 3. 发布流程

```bash
# 1. 确保代码已提交
git add .
git commit -m "feat: 新功能"

# 2. 创建 tag（版本号根据实际情况调整）
git tag -a v0.0.2 -m "版本 0.0.2

新功能：
- 添加了XXX功能
- 优化了YYY性能
"

# 3. 推送 tag
git push origin v0.0.2

# 4. 等待 Actions 完成
# 5. 检查 Release 页面
```

### 4. 版本号管理建议

**语义化版本号规则**：

- **主版本号**（MAJOR）：不兼容的 API 修改
- **次版本号**（MINOR）：向下兼容的功能新增
- **修订号**（PATCH）：向下兼容的问题修正

**示例**：

- `v0.0.1` → `v0.0.2`：Bug 修复
- `v0.0.2` → `v0.1.0`：新增功能
- `v0.1.0` → `v1.0.0`：重大更新，API 变更

## 🚨 常见错误

### 错误 1：忘记添加 v 前缀

```bash
❌ git tag 0.0.2
✅ git tag v0.0.2
```

**后果**：工作流可能无法正确提取版本号

### 错误 2：tag 格式错误

```bash
❌ git tag release-0.0.2
✅ git tag v0.0.2
```

**后果**：版本号提取失败，构建可能使用错误的版本号

### 错误 3：手动修改 package.json 后忘记提交

**不需要手动修改**！工作流会自动同步版本号。

## 📚 相关文档

- [完整修复文档](./GITHUB_RELEASE_FIX.md)
- [快速参考](./QUICK_FIX_REFERENCE.md)
- [工作流使用说明](../.github/workflows/README.md)

---

**最后更新**：2025-10-20  
**适用版本**：electron-builder 25.x 及以上
