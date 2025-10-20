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

## ✅ 解决方案

### 1. 修改 electron-builder.yml

**文件位置**：`electron-builder.yml`

**修改内容**：在 `publish` 配置中添加 `draft: false` 和 `prerelease: false`

```yaml
publish:
  provider: github
  releaseType: release
  draft: false # ✅ 新增：确保 Release 自动发布，不是草稿
  prerelease: false # ✅ 新增：确保不是预发布版本
```

**作用**：

- `draft: false`：Release 创建后立即发布，不需要手动操作
- `prerelease: false`：标记为正式版本，不是预发布版本

### 2. 优化 GitHub Actions 工作流

**文件位置**：`.github/workflows/release.yml`

#### 改进 1：分离构建和发布步骤

**原来**：

```yaml
- name: Build and publish
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: npm run build:win -- --publish always
```

**现在**：

```yaml
- name: Build application
  run: npm run build

- name: Publish to GitHub Releases
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: npm run build:win -- --publish always
```

**优点**：

- 构建和发布步骤分离，日志更清晰
- 如果构建失败，不会尝试发布
- 更容易定位问题

#### 改进 2：增强日志输出

添加了以下信息到 Release 更新步骤：

- Release ID 和名称
- 草稿状态（draft: true/false）
- 发布时间
- 所有上传的文件列表及大小

```yaml
console.log(`Found release: ${release.name} (ID: ${release.id})`);
console.log(`Release draft status: ${release.draft}`);
console.log(`Release published at: ${release.published_at || 'Not published'}`);

console.log('\n📦 Release assets:');
assets.forEach(asset => {
  console.log(`  - ${asset.name} (${(asset.size / 1024 / 1024).toFixed(2)} MB)`);
});
```

**优点**：

- 可以直接在 Actions 日志中验证 exe 文件是否上传成功
- 查看 Release 状态，确认是否正确发布
- 便于排查问题

#### 改进 3：添加等待时间

```javascript
// 等待一小段时间确保 release 已创建
await new Promise((resolve) => setTimeout(resolve, 3000))
```

**作用**：确保 electron-builder 完成 Release 创建后，再更新描述

### 3. 更新文档

**文件位置**：`.github/workflows/README.md`

添加了：

- 工作流程详细说明
- 故障排除指南
- Release 自动发布的说明
- 配置示例

## 📝 最佳实践

### 1. electron-builder 发布配置

对于公开项目，建议的完整配置：

```yaml
publish:
  provider: github
  releaseType: release # 发布类型
  draft: false # 不使用草稿
  prerelease: false # 不是预发布版本
```

对于需要人工审核的项目：

```yaml
publish:
  provider: github
  releaseType: release
  draft: true # 使用草稿，需要手动发布
  prerelease: false
```

对于测试版本：

```yaml
publish:
  provider: github
  releaseType: prerelease # 或者 releaseType: release + prerelease: true
  draft: false
  prerelease: true # 标记为预发布版本
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

1. **electron-builder.yml**：添加 `draft: false` 和 `prerelease: false`
2. **release.yml**：分离构建步骤，增强日志输出
3. **README.md**：更新文档和故障排除指南

### 关键点

- electron-builder **默认创建草稿 Release**，必须显式设置 `draft: false`
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
