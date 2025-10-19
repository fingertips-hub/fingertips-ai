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
4. 构建Windows应用
5. 自动创建GitHub Release并上传安装包
6. 使用tag注释作为Release描述

### 产物

- Windows安装包：`fingertips-ai-{version}-setup.exe`
- Windows blockmap文件：`fingertips-ai-{version}-setup.exe.blockmap`
- 自动更新配置：`latest.yml`

### 注意事项

- tag格式必须是 `v*.*.*`（例如：v1.0.0, v2.1.3）
- 如果tag包含注释，注释内容会作为Release描述
- 如果tag没有注释，会使用默认描述："Release v{version}"
- 工作流使用 `GITHUB_TOKEN`，无需额外配置

### 查看构建状态

在GitHub仓库的 Actions 标签页可以查看构建进度和日志。

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
