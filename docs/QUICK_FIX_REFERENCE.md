# 快速修复参考 - GitHub Release 发布问题

## ⚠️ 常见错误

### 错误 1：配置验证失败

```
Invalid configuration object. electron-builder has been initialized using a configuration object that does not match the API schema.
- configuration.publish.draft should be...
- configuration.publish.prerelease should be...
```

**原因**：在 `electron-builder.yml` 中添加了 `draft` 或 `prerelease` 字段

**解决**：❌ 移除这些字段！它们不是有效的配置选项。

### 错误 2：Release 只有源码，没有 exe

**原因**：Release 处于草稿（draft）状态

**解决**：✅ 通过 GitHub API 在工作流中设置 `draft: false`

---

## ✅ 正确配置

### electron-builder.yml

```yaml
publish:
  provider: github
  releaseType: release
```

**重要**：

- ✅ 只包含 `provider` 和 `releaseType`
- ❌ 不要添加 `draft` 字段
- ❌ 不要添加 `prerelease` 字段

### .github/workflows/release.yml

在工作流中通过 API 控制发布状态：

```yaml
- name: Update release and publish
  uses: actions/github-script@v7
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    script: |
      const tag = context.ref.replace('refs/tags/', '');

      // 等待 release 创建
      await new Promise(resolve => setTimeout(resolve, 5000));

      const { data: release } = await github.rest.repos.getReleaseByTag({
        owner: context.repo.owner,
        repo: context.repo.repo,
        tag: tag
      });

      // 设置为非草稿、非预发布
      await github.rest.repos.updateRelease({
        owner: context.repo.owner,
        repo: context.repo.repo,
        release_id: release.id,
        draft: false,        // ✅ 在这里设置
        prerelease: false    // ✅ 在这里设置
      });
```

---

## 📋 配置选项对比

### electron-builder GitHub Provider 支持的选项

✅ **支持的选项**：

- `provider` (必需)
- `releaseType`
- `owner`
- `repo`
- `token`
- `vPrefixedTagName`
- `publishAutoUpdate`
- `channel`
- 等等...

❌ **不支持的选项**：

- `draft` - 会导致验证错误
- `prerelease` - 会导致验证错误

### 控制 Release 状态的正确方式

| 需求               | 错误做法                                         | 正确做法                |
| ------------------ | ------------------------------------------------ | ----------------------- |
| 发布非草稿 Release | `electron-builder.yml` 中添加 `draft: false`     | 在工作流中通过 API 设置 |
| 创建预发布版本     | `electron-builder.yml` 中添加 `prerelease: true` | 在工作流中通过 API 设置 |
| 创建草稿           | `electron-builder.yml` 中添加 `draft: true`      | 在工作流中通过 API 设置 |

---

## 🔍 验证发布成功

### 检查 Actions 日志

查找以下关键信息：

```
Found release: v1.0.1 (ID: 12345)
Release draft status BEFORE: true
✅ Release updated successfully
   - Draft: false (published)
   - Prerelease: false
   - Description updated

📦 Release assets:
  - fingertips-ai-1.0.1-setup.exe (45.23 MB)
  - fingertips-ai-1.0.1-setup.exe.blockmap (0.05 MB)
  - latest.yml (0.01 MB)
```

### 检查 GitHub Releases 页面

1. 访问仓库的 Releases 页面
2. 应该看到新版本（不是 "Draft" 标签）
3. 应该有 exe 文件可供下载
4. 源码压缩包也应该存在

---

## 🚀 测试流程

```bash
# 1. 确保所有更改已提交
git add .
git commit -m "fix: GitHub release configuration"

# 2. 创建测试 tag
git tag -a v1.0.3 -m "测试版本 1.0.3

新功能：
- 修复 GitHub Release 自动发布问题
"

# 3. 推送 tag
git push origin v1.0.3

# 4. 访问 GitHub Actions 查看构建
# 5. 检查 Releases 页面验证 exe 文件
```

---

## 📚 相关文档

- 详细修复文档：[GITHUB_RELEASE_FIX.md](./GITHUB_RELEASE_FIX.md)
- 工作流使用说明：[../.github/workflows/README.md](../.github/workflows/README.md)
- electron-builder 文档：https://www.electron.build/configuration/publish

---

**最后更新**：2025-10-20
