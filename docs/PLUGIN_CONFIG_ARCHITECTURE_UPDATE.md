# 插件配置架构更新说明

> **日期**: 2025-10-19  
> **版本**: v1.1.0  
> **变更类型**: 架构优化

## 📋 变更概述

插件配置管理方式进行了架构优化：**插件配置不再通过应用设置页面中的按钮打开，而是由插件自己创建和管理独立的配置窗口**。

## 🎯 变更原因

### 旧架构的问题

1. **耦合度高**: 插件配置界面嵌入到主应用设置页面中
2. **灵活性差**: 插件无法完全控制配置界面的样式和交互
3. **维护困难**: 主应用需要管理所有插件的配置界面加载和显示
4. **用户体验**: 配置界面受限于设置页面的布局和样式

### 新架构的优势

1. **关注点分离**: 插件管理器专注于生命周期管理（启用/禁用、加载/卸载）
2. **插件自主性**: 插件可以完全控制自己的配置界面设计和实现
3. **更清晰的架构**: 避免了在设置页面中动态加载插件组件的复杂性
4. **更好的扩展性**: 插件可以创建复杂的多窗口配置流程

## 🔧 代码变更

### 1. PluginManager.vue 更新

**移除的功能**:

- ❌ 删除了"配置插件"按钮
- ❌ 删除了 `handleConfig()` 函数
- ❌ 删除了 `.btn-config` 相关样式

**保留的功能**:

- ✅ 插件启用/禁用开关
- ✅ 重新加载单个插件按钮
- ✅ 访问插件主页链接
- ✅ 搜索和关键词筛选功能

### 2. 文档更新

**PLUGIN_DEVELOPER_GUIDE.md** 的主要更新:

#### a) Manifest 字段说明更新

```json
{
  "ui": {
    "hasSettings": false, // ⚠️ 已废弃
    "settingsComponent": "" // ⚠️ 已废弃
  }
}
```

**废弃字段**:

- `ui.hasSettings` - 已废弃，插件应通过自己的窗口管理配置
- `ui.settingsComponent` - 已废弃，不再支持集成到设置页面

#### b) "开发带窗口的插件" 章节重写

**旧方案 4**: "集成到设置页面" (已废弃)

**新方案 4**: "创建插件配置窗口"

包含两种实现方式：

**方案 4.1**: 使用简单对话框

- 适合简单配置场景
- 使用系统对话框 (`dialog.showMessageBox`)
- 无需额外的 UI 文件

**方案 4.2**: 创建自定义配置窗口（未来支持）

- 适合复杂配置场景
- 创建独立的 HTML 配置窗口
- 完全自定义的界面和交互

#### c) 新增最佳实践 - 插件配置管理

添加了完整的配置管理最佳实践示例，包括：

1. **优雅降级**: 未配置时引导用户配置
2. **配置验证**: 检查配置完整性
3. **配置入口**: 提供清晰的配置访问方式
4. **配置持久化**: 使用 Config API 保存配置
5. **配置更新**: 支持运行时更新配置
6. **默认值管理**: 合理的默认配置

#### d) 配置管理章节更新

在 "⚙️ 配置管理" 章节开头添加了重要说明：

> **重要说明**: 插件配置界面应该由插件自己创建和管理（通过对话框或独立窗口），而不是集成到应用的设置页面中。

## 📝 迁移指南

### 对现有插件的影响

如果你的插件使用了以下字段，需要进行迁移：

```json
{
  "ui": {
    "hasSettings": true,
    "settingsComponent": "ui/settings.vue"
  }
}
```

### 迁移步骤

#### 步骤 1: 更新 manifest.json

**移除或更新废弃字段**:

```json
{
  "ui": {
    // 移除 hasSettings 和 settingsComponent
  }
}
```

#### 步骤 2: 实现配置对话框

**简单方案** - 使用系统对话框:

```javascript
module.exports = {
  async execute(params) {
    const config = await pluginContext.config.getAll()

    if (!config.apiKey) {
      const choice = await pluginContext.api.dialog.showMessageBox({
        type: 'warning',
        title: '需要配置',
        message: '请先配置 API 密钥',
        buttons: ['立即配置', '取消']
      })

      if (choice === 0) {
        await openConfigDialog()
      }

      return { success: false, error: '未配置' }
    }

    // 继续执行
  }
}
```

#### 步骤 3: 创建配置对话框函数

```javascript
async function openConfigDialog() {
  const currentConfig = await pluginContext.config.getAll()

  // 临时方案：使用系统对话框
  await pluginContext.api.dialog.showMessageBox({
    type: 'info',
    title: '插件配置',
    message: '配置功能',
    detail: `当前配置: ${JSON.stringify(currentConfig, null, 2)}`,
    buttons: ['确定']
  })

  // TODO: 未来可以创建独立的配置窗口
  // await pluginContext.api.window.create({...})
}
```

## 🚀 未来规划

### 短期 (v1.1.x)

- [x] 移除 PluginManager 中的配置按钮
- [x] 更新开发者文档
- [ ] 更新示例插件
- [ ] 添加配置对话框最佳实践模板

### 中期 (v1.2.x)

- [ ] 实现插件创建独立窗口的 API
- [ ] 提供配置窗口模板和组件库
- [ ] 支持插件右键菜单（包含"打开配置"选项）
- [ ] 提供配置界面脚手架工具

### 长期 (v2.0.x)

- [ ] 支持插件配置热重载
- [ ] 提供配置界面可视化编辑器
- [ ] 配置数据的加密存储
- [ ] 配置导入/导出功能

## 📚 相关文档

- [插件开发者指南](./PLUGIN_DEVELOPER_GUIDE.md)
- [插件系统开发方案](./PLUGIN_SYSTEM_DEVELOPMENT_PLAN.md)
- [插件快速开始](./PLUGIN_QUICK_START.md)

## 🤝 反馈与建议

如果您对新的插件配置架构有任何疑问或建议，请：

1. 提交 GitHub Issue
2. 参与 GitHub Discussions
3. 联系开发团队

---

**变更记录**:

- 2025-10-19: 初始版本发布
- 架构变更: 插件配置改为由插件自主管理
- 文档更新: 完整的迁移指南和最佳实践
