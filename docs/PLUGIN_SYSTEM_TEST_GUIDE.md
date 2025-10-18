# 插件系统测试指南

## 📋 测试目标

验证插件系统的完整功能,包括:

1. ✅ 插件加载与扫描
2. ✅ 插件激活与停用
3. ✅ 插件配置管理
4. ✅ 插件 API 功能
5. ✅ 插件权限控制
6. ✅ UI 集成

---

## 🚀 快速开始

### 1. 准备测试环境

```bash
# 确保项目已构建
npm run build

# 或在开发模式下运行
npm run dev
```

### 2. 确认插件目录

插件应放在以下目录:

- **开发环境**: `项目根目录/plugins/`
- **生产环境**: `用户数据目录/plugins/`

### 3. 使用示例插件

项目已包含一个 `hello-world` 示例插件,位于 `plugins/hello-world/`

---

## 🧪 测试用例

### 测试 1: 插件扫描与加载

**目标**: 验证插件管理器能正确扫描并加载插件

**步骤**:

1. 确保 `plugins/hello-world/` 目录存在
2. 启动应用
3. 查看控制台输出

**预期结果**:

```
Initializing Plugin Manager...
Found 1 plugin(s)
Loaded plugin: Hello World (hello-world)
Plugin Manager initialized successfully
```

**验证点**:

- ✅ 控制台显示 "Found 1 plugin(s)"
- ✅ 控制台显示 "Loaded plugin: Hello World"
- ✅ 没有错误信息

---

### 测试 2: 插件管理页面

**目标**: 验证插件管理 UI 正常工作

**步骤**:

1. 打开应用设置 (点击托盘图标 → 设置)
2. 点击左侧菜单的 "插件"
3. 观察插件列表

**预期结果**:

- ✅ 看到 "Hello World" 插件卡片
- ✅ 显示插件名称、版本号、描述
- ✅ 显示作者信息
- ✅ 显示权限数量
- ✅ 有启用/禁用开关
- ✅ 有重新加载按钮

**截图位置**: `插件管理页面 - 初始状态`

---

### 测试 3: 启用插件

**目标**: 验证插件启用功能

**步骤**:

1. 在插件管理页面
2. 找到 "Hello World" 插件
3. 点击启用开关

**预期结果**:

- ✅ 开关变为开启状态
- ✅ 系统显示通知: "Hello World - 插件已成功激活! 🎉"
- ✅ 控制台输出:
  ```
  =================================
  Hello World Plugin Activated!
  Plugin Name: Hello World
  Plugin Version: 1.0.0
  Plugin Directory: ...
  =================================
  ```

**验证点**:

- ✅ 插件状态变为 "已启用"
- ✅ 通知正常显示
- ✅ 没有错误信息

---

### 测试 4: 停用插件

**目标**: 验证插件停用功能

**步骤**:

1. 在插件管理页面
2. 找到已启用的 "Hello World" 插件
3. 点击启用开关关闭

**预期结果**:

- ✅ 开关变为关闭状态
- ✅ 插件状态变为 "已禁用"
- ✅ 控制台输出: "Hello World Plugin Deactivated!"
- ✅ 没有错误信息

---

### 测试 5: 重新加载插件

**目标**: 验证插件热重载功能

**步骤**:

1. 修改 `plugins/hello-world/index.js` 文件 (如添加 console.log)
2. 在插件管理页面点击重新加载按钮
3. 观察效果

**预期结果**:

- ✅ 插件成功重新加载
- ✅ 修改的代码生效
- ✅ 显示成功提示: "插件重新加载成功!"
- ✅ 控制台显示新的日志

---

### 测试 6: 插件配置

**目标**: 验证插件配置读写功能

**步骤**:

1. 启用 "Hello World" 插件
2. 在浏览器开发者工具的 Console 中执行:
   ```javascript
   await window.api.plugin.getConfig('hello-world')
   ```

**预期结果**:

```javascript
{
  success: true,
  data: {
    message: "Hello from Fingertips AI Plugin!"
  }
}
```

**修改配置**:

```javascript
await window.api.plugin.setConfig('hello-world', {
  message: '自定义消息'
})
```

**验证点**:

- ✅ 能读取默认配置
- ✅ 能修改配置
- ✅ 配置持久化保存

---

### 测试 7: 权限控制

**目标**: 验证插件权限系统

**测试 7.1: 允许的权限**

修改 `plugins/hello-world/index.js`,添加:

```javascript
// notification 权限已声明,应该成功
context.api.notification.show({
  title: '测试',
  body: '有权限'
})
```

**预期**: ✅ 通知正常显示

**测试 7.2: 未声明的权限**

修改 `plugins/hello-world/index.js`,添加:

```javascript
// clipboard 权限未声明,应该失败
context.api.clipboard.readText()
```

**预期**: ❌ 抛出权限错误:

```
Error: Plugin hello-world does not have permission: clipboard
```

---

### 测试 8: 插件 API 功能

**目标**: 验证各个插件 API 是否正常工作

#### 8.1 Notification API

```javascript
context.api.notification.show({
  title: '通知标题',
  body: '通知内容'
})
```

**预期**: ✅ 显示系统通知

#### 8.2 Settings API

```javascript
const aiConfig = await context.api.settings.getAIConfig()
console.log(aiConfig)
```

**预期**: ✅ 返回 AI 配置对象

#### 8.3 Config API

```javascript
await context.config.set('testKey', 'testValue')
const value = await context.config.get('testKey')
console.log(value) // "testValue"
```

**预期**: ✅ 配置读写成功

---

### 测试 9: 错误处理

**目标**: 验证系统对错误的处理

**测试 9.1: 无效的 manifest.json**

创建一个格式错误的插件,观察错误处理:

```
plugins/invalid-plugin/manifest.json (缺少必需字段)
```

**预期**:

- ✅ 插件不会加载
- ✅ 控制台显示明确的错误信息
- ✅ 不影响其他插件

**测试 9.2: 插件执行错误**

修改插件代码抛出错误:

```javascript
execute(params) {
  throw new Error('测试错误')
}
```

**预期**:

- ✅ 错误被捕获
- ✅ 返回 `{ success: false, error: '...' }`
- ✅ 不导致应用崩溃

---

### 测试 10: 性能测试

**目标**: 验证插件系统性能

**测试 10.1: 启动性能**

测量应用启动时间:

- 无插件: \_\_\_ms
- 1 个插件: \_\_\_ms
- 5 个插件: \_\_\_ms

**预期**: 每个插件增加 < 50ms 启动时间

**测试 10.2: 内存占用**

观察任务管理器:

- 无插件: \_\_\_MB
- 1 个插件: \_\_\_MB
- 5 个插件: \_\_\_MB

**预期**: 每个插件增加 < 10MB 内存

---

## 🐛 常见问题排查

### 问题 1: 插件未被扫描到

**可能原因**:

- ✅ 插件不在正确的目录
- ✅ manifest.json 格式错误
- ✅ 缺少必需字段

**解决方法**:

1. 检查插件目录路径
2. 验证 manifest.json 格式
3. 查看控制台错误信息

### 问题 2: 插件激活失败

**可能原因**:

- ✅ 版本不兼容
- ✅ 缺少 activate 方法
- ✅ activate 方法抛出错误

**解决方法**:

1. 检查 fingertips.minVersion
2. 确认 index.js 导出正确
3. 查看控制台错误堆栈

### 问题 3: 权限错误

**可能原因**:

- ✅ 未在 manifest.json 中声明权限

**解决方法**:

1. 在 manifest.json 的 permissions 数组中添加需要的权限
2. 重新加载插件

### 问题 4: 配置未保存

**可能原因**:

- ✅ 配置 API 调用失败
- ✅ electron-store 初始化问题

**解决方法**:

1. 检查控制台错误
2. 确认用户数据目录有写权限
3. 清除 electron-store 缓存重试

---

## ✅ 测试检查清单

### 基础功能

- [ ] 插件扫描成功
- [ ] 插件加载成功
- [ ] 插件管理页面显示正常
- [ ] 插件启用功能正常
- [ ] 插件停用功能正常
- [ ] 插件重新加载功能正常

### API 功能

- [ ] Notification API 正常
- [ ] Settings API 正常
- [ ] Config API 正常
- [ ] Dialog API 正常 (如果有权限)
- [ ] Clipboard API 正常 (如果有权限)

### 权限系统

- [ ] 声明的权限可以使用
- [ ] 未声明的权限被拦截
- [ ] 权限错误信息清晰

### 错误处理

- [ ] 无效插件被正确拒绝
- [ ] 插件错误不影响应用
- [ ] 错误信息有帮助性

### 性能

- [ ] 启动时间合理
- [ ] 内存占用合理
- [ ] 插件热重载快速

---

## 📊 测试报告模板

```markdown
## 插件系统测试报告

**测试日期**: YYYY-MM-DD  
**测试人**: [姓名]  
**应用版本**: 1.0.0

### 测试环境

- OS: Windows 10
- Node.js: v18.x
- Electron: v28.x

### 测试结果总览

| 测试项     | 通过 | 失败 | 跳过 |
| ---------- | ---- | ---- | ---- |
| 基础功能   | 6/6  | 0/6  | 0/6  |
| API 功能   | 5/5  | 0/5  | 0/5  |
| 权限系统   | 3/3  | 0/3  | 0/3  |
| 错误处理   | 3/3  | 0/3  | 0/3  |
| 性能测试   | 2/2  | 0/2  | 0/2  |
| **总计**   | 19   | 0    | 0    |
| **通过率** | 100% |      |      |

### 发现的问题

1. [问题描述]
2. [问题描述]

### 改进建议

1. [建议内容]
2. [建议内容]

### 总结

[测试总结]
```

---

## 🎉 测试完成

恭喜!如果所有测试都通过,说明插件系统已经可以正常使用了!

**下一步**:

1. 开发更多实用插件
2. 完善插件开发文档
3. 建立插件市场
4. 收集用户反馈

---

**文档版本**: 1.0.0  
**创建日期**: 2025-10-18  
**维护者**: Development Team
