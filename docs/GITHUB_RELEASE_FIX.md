# GitHub Release 自动发布修复文档

## 📋 问题描述

打包后只有 tag `v1.0.0` 生成了 exe 文件，其他版本的 Release 只有源码压缩包。

## 🔍 根本原因分析

### 问题根源

在 `electron-builder.yml` 配置文件中，**缺少 `draft: false` 配置**，导致 electron-builder 默认创建草稿（draft）状态的 Release。

### 问题表现

1. **构建成功**：GitHub Actions 构建流程正常完成
2. **文件已上传**：exe 文件确实被上传到 GitHub Release
3. **Release 是草稿**：创建的 Release 处于草稿状态，不对外公开
4. **只能看到源码**：普通用户访问 Release 页面时，只能看到 GitHub 自动生成的源码压缩包
5. **需要手动发布**：必须手动点击"Publish release"才能公开 exe 文件

### 为什么 v1.0.0 可以看到 exe？

用户可能手动将 v1.0.0 的 Release 从草稿状态发布为正式版本，所以能看到 exe 文件。

### 为什么打 v0.0.2 tag 却创建了 v1.0.0 的 Release？

**根本原因**：`package.json` 中的版本号与 Git tag 不一致

**问题表现**：

1. 用户推送 `v0.0.2` tag
2. `package.json` 中的版本是 `"version": "1.0.0"`
3. electron-builder 读取 `package.json` 的版本号
4. 构建出 `fingertips-ai-1.0.0-setup.exe`
5. 创建或更新 `v1.0.0` 的 Release
6. 结果：`v0.0.2` 没有 exe，`v1.0.0` 有 exe

**解决方案**：在构建前从 Git tag 自动更新 `package.json` 的版本号，确保两者一致。

## ✅ 解决方案

### 1. electron-builder.yml 配置

**文件位置**：`electron-builder.yml`

**重要说明**：`draft` 和 `prerelease` **不是** `publish` 配置的有效选项（会导致配置验证错误）。

**正确配置**：

```yaml
publish:
  provider: github
  releaseType: release
```

**注意**：

- GitHub provider 只支持特定的选项：`provider`, `releaseType`, `owner`, `repo`, `token` 等
- `draft` 和 `prerelease` 必须通过 **GitHub API** 在工作流中设置

### 2. 优化 GitHub Actions 工作流

**文件位置**：`.github/workflows/release.yml`

#### 改进 1：从 Git tag 同步版本号（关键修复）

**问题**：如果 `package.json` 中的版本号与 Git tag 不一致，electron-builder 会使用 package.json 的版本号，导致创建错误版本的 Release。

**解决方案**：在构建前从 Git tag 自动更新 package.json 版本号

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

**效果**：

- ✅ Tag 是 v0.0.2，则构建 fingertips-ai-0.0.2-setup.exe
- ✅ Tag 是 v1.5.3，则构建 fingertips-ai-1.5.3-setup.exe
- ✅ 版本号始终与 Git tag 保持一致

#### 改进 2：分离构建和发布步骤

**优点**：

- 构建和发布步骤分离，日志更清晰
- 如果构建失败，不会尝试发布
- 更容易定位问题

#### 改进 3：通过 GitHub API 发布 Release（核心修复）

**关键修改**：在工作流中通过 GitHub API 设置 `draft: false` 和 `prerelease: false`

```javascript
// 更新 release：设置描述、确保不是草稿、不是预发布
await github.rest.repos.updateRelease({
  owner: context.repo.owner,
  repo: context.repo.repo,
  release_id: release.id,
  body: message,
  draft: false, // ✅ 确保不是草稿
  prerelease: false // ✅ 确保不是预发布
})
```

**优点**：

- ✅ 强制将 Release 设置为已发布状态
- ✅ 无论 electron-builder 的默认行为如何，都能确保发布成功
- ✅ 同时更新 Release 描述

#### 改进 4：增强日志输出

添加了详细的状态信息：

```javascript
console.log(`Release draft status BEFORE: ${release.draft}`)
console.log(`Release prerelease status BEFORE: ${release.prerelease}`)

// 更新后
console.log('✅ Release updated successfully')
console.log('   - Draft: false (published)')
console.log('   - Prerelease: false')

console.log('\n📦 Release assets:')
assets.forEach((asset) => {
  console.log(`  - ${asset.name} (${(asset.size / 1024 / 1024).toFixed(2)} MB)`)
})
```

**优点**：

- 显示更新前后的状态对比
- 列出所有上传的文件和大小
- 如果没有文件会发出警告

### 3. 更新文档

**文件位置**：`.github/workflows/README.md`

添加了：

- 工作流程详细说明
- 故障排除指南
- Release 自动发布的说明
- 配置示例

## 📝 最佳实践

### 1. electron-builder 发布配置

**重要**：`draft` 和 `prerelease` 不能在 `electron-builder.yml` 中配置！

**正确的 electron-builder.yml 配置**：

```yaml
publish:
  provider: github
  releaseType: release # 正式版本
```

或对于预发布版本：

```yaml
publish:
  provider: github
  releaseType: prerelease # 预发布版本
```

**控制 draft 和 prerelease 状态**：

必须在 GitHub Actions 工作流中通过 API 设置：

```javascript
// 在工作流中
await github.rest.repos.updateRelease({
  owner: context.repo.owner,
  repo: context.repo.repo,
  release_id: release.id,
  draft: false, // 是否为草稿
  prerelease: false // 是否为预发布
})
```

### 2. 版本号管理

- 使用语义化版本：`v主版本.次版本.修订号`（如 `v1.2.3`）
- 正式版本：`v1.0.0`, `v1.1.0`, `v2.0.0`
- 预发布版本：`v1.0.0-beta.1`, `v2.0.0-rc.1`

### 3. Tag 注释最佳实践

```bash
git tag -a v1.2.0 -m "版本 1.2.0

新功能：
- ✨ 添加了XXX功能
- 🎨 优化了YYY界面
- ⚡️ 提升了ZZZ性能

Bug修复：
- 🐛 修复了AAA问题
- 🐛 修复了BBB崩溃

技术改进：
- 📦 升级了CCC依赖
- 🔧 改进了DDD配置
"
```

### 4. 工作流日志检查

每次发布后，检查 Actions 日志中的：

1. ✅ 构建步骤是否成功
2. ✅ "Release draft status: false" 确认不是草稿
3. ✅ "Release assets" 列表中包含 exe 文件
4. ✅ exe 文件大小合理（不是几 KB 的错误文件）

## 🔧 测试验证

### 创建测试版本

```bash
# 1. 确保代码已提交
git add .
git commit -m "test: 测试 release 流程"

# 2. 创建测试 tag
git tag -a v1.0.1 -m "测试版本 1.0.1"

# 3. 推送 tag
git push origin v1.0.1

# 4. 访问 GitHub Actions 查看构建过程
# 5. 访问 Releases 页面验证 exe 文件是否存在
```

### 清理测试版本

```bash
# 删除远程 tag
git push --delete origin v1.0.1

# 删除本地 tag
git tag -d v1.0.1

# 在 GitHub Releases 页面手动删除对应的 Release
```

## 📊 修复效果对比

### 修复前

| 版本   | Release 状态 | 是否有 exe   | 用户可见    |
| ------ | ------------ | ------------ | ----------- |
| v1.0.0 | 手动发布     | ✅           | ✅          |
| v1.0.1 | 草稿         | ✅（不可见） | ❌ 只有源码 |
| v1.0.2 | 草稿         | ✅（不可见） | ❌ 只有源码 |

### 修复后

| 版本   | Release 状态 | 是否有 exe | 用户可见 |
| ------ | ------------ | ---------- | -------- |
| v1.0.0 | 已发布       | ✅         | ✅       |
| v1.0.3 | 自动发布     | ✅         | ✅       |
| v1.0.4 | 自动发布     | ✅         | ✅       |

## 🎯 总结

### 核心修改

1. **electron-builder.yml**：保持简洁配置（只有 `provider` 和 `releaseType`）
2. **release.yml**：从 Git tag 自动同步版本号到 package.json（避免版本不匹配）
3. **release.yml**：通过 GitHub API 设置 `draft: false` 和 `prerelease: false`
4. **release.yml**：分离构建步骤，增强日志输出
5. **README.md**：更新文档和故障排除指南

### 关键点

- ⚠️ **版本号必须一致**：package.json 的版本号必须与 Git tag 匹配，否则会创建错误版本的 Release
- ✅ **自动同步版本号**：工作流会在构建前从 Git tag 更新 package.json
- ⚠️ `draft` 和 `prerelease` **不能**在 `electron-builder.yml` 中配置（会导致验证错误）
- ✅ 必须通过 **GitHub API** 在工作流中设置 Release 状态
- 草稿状态的 Release 中的文件不对外公开
- GitHub 会为每个 tag 自动创建源码压缩包
- 增强日志输出可以快速定位问题

### 预期效果

✅ 推送新 tag 后，Release 自动创建并**立即发布**  
✅ 用户可以直接下载 exe 安装包  
✅ 无需手动操作  
✅ 构建日志清晰，便于排查问题

---

**文档创建时间**：2025-10-20  
**修复版本**：适用于 electron-builder 25.x 及以上
