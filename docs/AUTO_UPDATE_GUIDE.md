# 自动更新系统使用指南

## 📋 概述

本项目实现了基于 GitHub Releases 的自动更新系统，使用 `electron-updater` 作为核心库。

## 🎯 核心功能

### 1. 自动检查更新

- ✅ 应用启动后 **2秒** 自动检查更新
- ✅ 延迟检查避免影响应用启动速度
- ✅ 开发环境自动禁用，不会误触发

### 2. 更新进度窗口

- ✅ 发现新版本时自动显示更新窗口
- ✅ 实时显示下载进度（百分比、速度、剩余时间）
- ✅ 美观的渐变背景和动画效果
- ✅ 显示当前版本和最新版本对比

### 3. 自动下载和安装

- ✅ 自动下载更新包
- ✅ 下载完成后 3秒自动重启安装
- ✅ 支持增量更新（节省带宽）
- ✅ 验证更新包签名（安全）

### 4. 错误处理

- ✅ 网络错误友好提示
- ✅ 更新失败后 10秒自动关闭窗口
- ✅ 详细的日志记录便于调试

## 📂 文件结构

```
src/main/modules/
  ├── autoUpdater.ts        # 自动更新核心模块
  └── updateWindow.ts       # 更新进度窗口管理

src/renderer/
  ├── update-progress.html  # 更新进度页面
  └── src/
      ├── update-progress.ts      # 页面入口
      └── UpdateProgress.vue      # Vue 组件
```

## 🔧 配置说明

### 1. package.json 配置

已添加仓库信息，用于 electron-updater 定位 GitHub Releases：

```json
{
  "homepage": "https://github.com/fingertips-hub/fingertips-ai",
  "repository": {
    "type": "git",
    "url": "https://github.com/fingertips-hub/fingertips-ai.git"
  }
}
```

### 2. electron-builder.yml 配置

已配置 GitHub 发布源：

```yaml
publish:
  provider: github
  releaseType: release
```

### 3. 更新检查时机

在 `src/main/modules/autoUpdater.ts` 中可以调整：

```typescript
// 延迟2秒后检查更新
setTimeout(() => {
  checkForUpdates()
}, 2000)
```

## 🚀 工作流程

```
1. 用户启动应用
   ↓
2. 主进程初始化 autoUpdater 模块
   ↓
3. 延迟 2秒 后自动检查更新
   ↓
4. 如果发现新版本:
   ├─ 显示更新进度窗口
   ├─ 自动下载更新包
   ├─ 实时更新进度信息
   └─ 下载完成后 3秒 自动重启安装
   ↓
5. 如果是最新版本:
   └─ 静默完成，不打扰用户
```

## 📝 更新状态说明

| 状态                 | 描述         | 窗口行为                 |
| -------------------- | ------------ | ------------------------ |
| checking             | 正在检查更新 | 不显示窗口               |
| update-available     | 发现新版本   | **显示窗口**，开始下载   |
| downloading          | 正在下载     | 显示进度条和速度         |
| downloaded           | 下载完成     | 显示成功提示，3秒后重启  |
| update-not-available | 已是最新版   | 不显示窗口（静默）       |
| error                | 更新失败     | 显示错误信息，10秒后关闭 |

## 🧪 测试步骤

### 前提条件

1. **发布新版本到 GitHub Releases**

   ```bash
   # 1. 更新 package.json 版本号（例如从 1.0.0 到 1.0.1）
   npm version patch  # 或 minor、major

   # 2. 提交并推送版本标签
   git add package.json package-lock.json
   git commit -m "chore: bump version to 1.0.1"
   git tag v1.0.1
   git push origin main --tags

   # 3. GitHub Actions 会自动构建并发布 Release
   ```

2. **确保 Release 包含以下文件**
   - `fingertips-ai-1.0.1-setup.exe` (Windows 安装包)
   - `latest.yml` (更新元数据)

### 测试场景

#### 场景 1: 测试正常更新流程

1. 本地使用 `1.0.0` 版本的应用
2. GitHub 上发布 `1.0.1` 版本
3. 启动应用
4. 2秒后应该：
   - ✅ 自动检查更新
   - ✅ 发现新版本
   - ✅ 显示更新窗口
   - ✅ 自动下载更新
   - ✅ 显示进度条
   - ✅ 下载完成后 3秒自动重启

#### 场景 2: 测试已是最新版

1. 本地使用 `1.0.1` 版本的应用
2. GitHub 上最新版本也是 `1.0.1`
3. 启动应用
4. 2秒后应该：
   - ✅ 自动检查更新
   - ✅ 确认已是最新版
   - ✅ 静默完成（不显示窗口）

#### 场景 3: 测试网络错误

1. 断开网络连接
2. 启动应用
3. 2秒后应该：
   - ✅ 尝试检查更新
   - ✅ 检测到网络错误
   - ✅ 显示错误提示
   - ✅ 10秒后自动关闭窗口

### 开发环境测试

开发环境默认**禁用**自动更新，如需测试，可以临时修改 `autoUpdater.ts`：

```typescript
// 临时启用开发环境更新（仅用于测试）
export function configureAutoUpdater(): void {
  // 注释掉这个检查
  // if (is.dev) {
  //   console.log('[AutoUpdater] Development mode - auto update disabled')
  //   return
  // }
  // ... 其他配置
}
```

**⚠️ 注意：测试完成后记得恢复代码！**

## 📊 日志调试

自动更新系统会输出详细的日志，帮助调试问题：

```
[AutoUpdater] Configured successfully
[AutoUpdater] Current version: 1.0.0
[AutoUpdater] Auto-checking for updates on startup...
[AutoUpdater] Checking for updates...
[AutoUpdater] Update available: 1.0.1
[AutoUpdater] Release date: 2025-10-23T12:00:00Z
[AutoUpdater] Download size: 85.5 MB
[AutoUpdater] Download progress: 25% (21.38MB/85.50MB) @ 5.2MB/s
[AutoUpdater] Download progress: 50% (42.75MB/85.50MB) @ 5.5MB/s
[AutoUpdater] Download progress: 75% (64.13MB/85.50MB) @ 5.3MB/s
[AutoUpdater] Download progress: 100% (85.50MB/85.50MB) @ 5.4MB/s
[AutoUpdater] Update downloaded: 1.0.1
[AutoUpdater] Quitting and installing update...
```

## 🔍 常见问题

### Q1: 为什么开发环境不检查更新？

**A:** 开发环境默认禁用自动更新，避免干扰开发工作。这是最佳实践。

### Q2: 如何手动触发更新检查？

**A:** 可以在设置页面添加"检查更新"按钮，调用：

```typescript
import { manualCheckForUpdates } from './modules/autoUpdater'

// 在按钮点击事件中
manualCheckForUpdates()
```

### Q3: 更新失败怎么办？

**A:** 自动更新失败不会影响应用使用，用户可以：

1. 稍后重启应用重试
2. 手动从 GitHub Releases 下载安装
3. 检查网络连接

### Q4: 如何自定义更新窗口样式？

**A:** 修改 `src/renderer/src/UpdateProgress.vue` 的样式部分。

### Q5: 如何更改更新检查时机？

**A:** 修改 `src/main/modules/autoUpdater.ts` 中的延迟时间：

```typescript
setTimeout(() => {
  checkForUpdates()
}, 5000) // 改为 5秒
```

## 🎨 UI 预览

更新窗口特性：

- 🎨 紫色渐变背景
- 📊 实时进度条
- 💫 平滑动画效果
- 🔄 脉冲图标
- 📈 下载速度和剩余时间显示

## 🔐 安全性

1. **签名验证**: electron-updater 自动验证更新包签名
2. **HTTPS 传输**: 所有更新通过 HTTPS 下载
3. **GitHub 官方源**: 仅从官方 GitHub Releases 下载
4. **增量更新**: 支持增量更新，减少下载量

## 📚 相关文档

- [electron-updater 官方文档](https://www.electron.build/auto-update)
- [GitHub Releases 发布指南](./GITHUB_RELEASE_FIX.md)
- [版本号管理](./VERSION_MISMATCH_FIX.md)

## 🚀 最佳实践

1. **语义化版本**: 使用 `major.minor.patch` 格式
2. **自动化发布**: 使用 GitHub Actions 自动构建和发布
3. **测试发布**: 先发布 prerelease 版本测试
4. **更新日志**: 在 Release 中提供详细的更新说明
5. **回滚计划**: 保留旧版本的安装包，以便回滚

## 📝 更新日志格式建议

在 GitHub Release 中建议使用以下格式：

```markdown
## 🎉 新功能

- 添加了自动更新功能
- 支持插件系统

## 🐛 Bug 修复

- 修复了截图 API 在打包后无法使用的问题
- 修复了 Super Panel 性能问题

## 🔄 改进

- 优化了启动速度
- 改进了 UI 响应性
```

---

**更新时间**: 2025-10-23  
**版本**: 1.0.0  
**作者**: fingertips-ai 团队
