# GitHub Actions 工作流说明

## Release 工作流

### 功能

自动构建Windows应用并发布到GitHub Releases。

### 触发方式

通过推送tag触发（格式：`v*.*.*`，例如 `v1.0.0`）

### 使用方法

#### 1. 创建带注释的tag

```bash
# 创建带注释的tag（推荐）
git tag -a v1.0.1 -m "版本 1.0.1

新功能：
- 添加了XXX功能
- 优化了YYY性能

Bug修复：
- 修复了ZZZ问题
"

# 推送tag到远程仓库
git push origin v1.0.1
```

#### 2. 或者创建轻量级tag（如果不需要详细描述）

```bash
git tag v1.0.1
git push origin v1.0.1
```

### 工作流程

1. 检测到tag推送后自动触发
2. 设置Node.js环境（版本20）
3. 安装项目依赖
4. 构建应用程序
5. 构建Windows安装包并发布到GitHub Releases
6. 自动创建并**立即发布** Release（非草稿状态）
7. 使用tag注释更新Release描述
8. 显示所有上传的文件和大小

### 产物

- Windows安装包：`fingertips-ai-{version}-setup.exe`
- Windows blockmap文件：`fingertips-ai-{version}-setup.exe.blockmap`
- 自动更新配置：`latest.yml`

### 注意事项

- tag格式必须是 `v*.*.*`（例如：v1.0.0, v2.1.3）
- 如果tag包含注释，注释内容会作为Release描述
- 如果tag没有注释，会使用默认描述："Release v{version}"
- 工作流使用 `GITHUB_TOKEN`，无需额外配置
- Release会**自动发布**（不是草稿状态），无需手动发布
- 构建日志会显示所有上传的文件和大小，便于验证

### 查看构建状态

在GitHub仓库的 Actions 标签页可以查看构建进度和日志。

### 故障排除

#### 问题：Release只有源码压缩包，没有exe文件

**原因**：可能是以下情况之一

- 构建失败（查看Actions日志）
- Release处于草稿状态（已修复：现在自动发布）
- 上传失败（查看Actions日志中的错误）

**解决方法**：

1. 检查Actions标签页的构建日志
2. 查看"Update release and publish"步骤，确认已列出exe文件
3. 确认日志中显示"Release updated successfully"和"Draft: false (published)"

#### 问题：Release是草稿状态

**原因**：electron-builder 可能默认创建草稿状态的 Release

**解决方法**：
已在工作流中通过 GitHub API 自动设置为非草稿状态。查看 "Update release and publish" 步骤确认。

**重要**：❌ 不要在 `electron-builder.yml` 中添加 `draft` 或 `prerelease` 字段，这些不是有效的配置选项，会导致构建失败！

正确的配置：

```yaml
publish:
  provider: github
  releaseType: release
```

### 取消或删除Release

如果需要重新发布：

```bash
# 删除远程tag
git push --delete origin v1.0.1

# 删除本地tag
git tag -d v1.0.1

# 在GitHub上手动删除对应的Release
# 然后重新创建tag并推送
```
