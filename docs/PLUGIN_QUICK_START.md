# 插件系统快速开始指南

## 🚀 5分钟快速体验插件系统

### 第一步: 启动应用

```bash
npm run dev
```

### 第二步: 打开插件管理

1. 应用启动后,点击系统托盘图标
2. 选择 "设置"
3. 点击左侧菜单的 "插件"

### 第三步: 启用 Hello World 插件

1. 在插件管理页面,找到 "Hello World" 插件卡片
2. 点击右侧的启用开关
3. 观察系统通知: "Hello World - 插件已成功激活! 🎉"

### 第四步: 查看控制台输出

在终端中查看控制台输出:

```
=================================
Hello World Plugin Activated!
Plugin Name: Hello World
Plugin Version: 1.0.0
Plugin Directory: D:\projects\fingertips-ai\plugins\hello-world
=================================
```

### 第五步: 测试插件配置

1. 按 F12 打开开发者工具
2. 在 Console 中执行:

```javascript
// 读取插件配置
await window.api.plugin.getConfig('hello-world')

// 修改插件配置
await window.api.plugin.setConfig('hello-world', {
  message: '你好,世界!'
})
```

### 第六步: 重新加载插件

1. 在插件管理页面,点击 "Hello World" 插件的重新加载按钮 (🔄)
2. 观察插件重新激活
3. 确认提示: "插件重新加载成功!"

### 第七步: 停用插件

1. 点击启用开关关闭
2. 插件停用,控制台输出: "Hello World Plugin Deactivated!"

---

## ✅ 验证清单

完成以上步骤后,请确认:

- [x] 插件管理页面正常显示
- [x] Hello World 插件卡片显示完整信息
- [x] 启用插件时显示通知
- [x] 控制台有正确的日志输出
- [x] 可以读取和修改插件配置
- [x] 插件重新加载功能正常
- [x] 停用插件功能正常

---

## 🎯 下一步

恭喜!你已经成功体验了插件系统的基本功能。

### 深入学习

- 📖 阅读 [插件开发规范](./PLUGIN_SYSTEM_DEVELOPMENT_PLAN.md#插件开发规范)
- 🧪 查看 [完整测试指南](./PLUGIN_SYSTEM_TEST_GUIDE.md)
- 📝 查看 [实现总结](./PLUGIN_SYSTEM_IMPLEMENTATION_SUMMARY.md)

### 开发你的第一个插件

1. 复制 `plugins/hello-world/` 目录
2. 重命名为你的插件名称
3. 修改 `manifest.json`
4. 实现你的功能
5. 在插件管理页面刷新列表

### 示例插件创意

- 📋 **剪贴板历史**: 记录剪贴板历史,快速访问
- 🌐 **翻译工具**: 调用翻译 API,快速翻译文本
- 📊 **系统监控**: 显示 CPU、内存使用情况
- 🔖 **书签管理**: 管理常用网页书签
- 🎨 **颜色选择器**: 屏幕取色工具
- 📝 **快速笔记**: 快速记录想法和笔记

---

## ❓ 遇到问题?

### 插件未显示

检查 `plugins/hello-world/` 目录是否存在:

```bash
# Windows
dir plugins\hello-world

# macOS/Linux
ls plugins/hello-world
```

### 插件激活失败

查看控制台错误信息,常见原因:

- manifest.json 格式错误
- index.js 语法错误
- 缺少必需的导出

### 需要帮助?

- 查看 [测试指南的常见问题](./PLUGIN_SYSTEM_TEST_GUIDE.md#常见问题排查)
- 查看 [开发方案文档](./PLUGIN_SYSTEM_DEVELOPMENT_PLAN.md)
- 提交 GitHub Issue

---

## 🎉 成功!

如果所有步骤都顺利完成,说明插件系统运行正常!

现在你可以:

- 开发自己的插件
- 分享你的插件
- 为项目做贡献

Happy Coding! 🚀
