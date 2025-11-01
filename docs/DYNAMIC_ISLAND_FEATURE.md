# Dynamic Island 功能文档

## 概述

灵动岛（Dynamic Island）是一个受 iPhone 启发的独立窗口组件，显示在屏幕顶部中央位置，具有流畅的展开/折叠动画效果。

## 功能特性

### 视觉设计

- **折叠状态**：180px × 40px，胶囊形状（圆角 20px）
- **展开状态**：480px × 280px，圆角 16px
- **背景**：半透明白色 (rgba(255, 255, 255, 0.92)) + 毛玻璃效果
- **阴影**：柔和的多层阴影，营造浮空效果
- **位置**：屏幕顶部居中，距顶部 12px

### 交互行为

- **展开**：点击折叠状态的组件展开
- **折叠**：点击展开状态右上角的收起按钮折叠
- **动画**：350ms cubic-bezier(0.32, 0.72, 0, 1) 平滑过渡
- **置顶**：始终位于所有窗口之上
- **不可拖拽**：固定位置
- **点击外部不收起**：必须通过按钮手动收起

### 配置管理

- 在公共设置页面中提供启用/禁用开关
- 配置存储在 electron-store 和 localStorage 中
- 支持应用启动时自动显示（如果已启用）

## 文件结构

### 主进程文件

```
src/main/modules/
├── dynamicIsland.ts          # 窗口管理器
├── dynamicIslandHandlers.ts  # IPC 事件处理器
└── settingsStore.ts           # 配置存储（已更新）
```

### 渲染进程文件

```
src/renderer/
├── dynamic-island.html        # HTML 入口文件
└── src/
    ├── DynamicIsland.vue      # 主组件
    ├── dynamic-island.ts      # 启动脚本
    └── stores/
        └── settings.ts         # 配置 Store（已更新）
```

### 配置文件

```
electron.vite.config.ts        # 构建配置（已更新）
```

## API 接口

### IPC 通道

#### 主进程 → 渲染进程

```typescript
// 展开灵动岛
ipcRenderer.send('dynamic-island:expand')

// 折叠灵动岛
ipcRenderer.send('dynamic-island:collapse')

// 显示灵动岛
ipcRenderer.send('dynamic-island:show')

// 隐藏灵动岛
ipcRenderer.send('dynamic-island:hide')

// 关闭灵动岛
ipcRenderer.send('dynamic-island:close')
```

#### 配置相关

```typescript
// 获取启用状态
await window.api.settings.getDynamicIslandEnabled(): Promise<boolean>

// 设置启用状态
await window.api.settings.setDynamicIslandEnabled(enabled: boolean): Promise<boolean>
```

### Preload API

```typescript
window.api.dynamicIsland: {
  expand: () => void      // 展开
  collapse: () => void    // 折叠
  show: () => void        // 显示
  hide: () => void        // 隐藏
  close: () => void       // 关闭
}
```

## 技术实现

### 窗口配置

```typescript
const window = new BrowserWindow({
  width: 180, // 折叠状态宽度
  height: 40, // 折叠状态高度
  transparent: true, // 透明背景
  frame: false, // 无边框
  alwaysOnTop: true, // 始终置顶
  resizable: false, // 不可调整大小
  movable: false, // 不可移动
  skipTaskbar: true, // 不显示在任务栏
  hasShadow: true // 显示阴影
})
```

### 动画实现

使用 Electron 的 `setBounds()` 方法的 animate 参数实现原生窗口动画：

```typescript
window.setBounds(
  {
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight
  },
  true // animate: true - 启用平滑动画
)
```

### CSS 动画

```css
.dynamic-island {
  transition: all 350ms cubic-bezier(0.32, 0.72, 0, 1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
```

## 使用说明

### 启用/禁用

1. 打开设置窗口
2. 进入"公共设置"页面
3. 找到"启用灵动岛"开关
4. 切换开关即可启用或禁用

### 交互方式

1. **折叠状态**：显示应用图标和简短文本
2. **点击折叠组件**：展开为完整窗口
3. **展开状态**：显示详细信息和内容区域
4. **点击收起按钮**：折叠回小窗口状态

## 扩展开发

### 自定义折叠状态内容

修改 `DynamicIsland.vue` 中的折叠内容区域：

```vue
<div v-if="!isExpanded" class="collapsed-content">
  <!-- 自定义折叠状态的内容 -->
  <div class="status-indicator"></div>
  <span class="status-text">自定义文本</span>
</div>
```

### 自定义展开状态内容

修改 `DynamicIsland.vue` 中的展开内容区域：

```vue
<div v-if="isExpanded" class="expanded-content">
  <div class="expanded-header">
    <!-- 标题栏 -->
  </div>
  <div class="expanded-body">
    <!-- 自定义展开状态的内容 -->
  </div>
</div>
```

### 添加新的 IPC 事件

1. 在 `dynamicIslandHandlers.ts` 中注册新的事件处理器
2. 在 `preload/index.ts` 中添加对应的 API
3. 在 `preload/index.d.ts` 中添加类型定义

## 设计理念

### UX 设计原则

- **非侵入性**：小巧的折叠状态不影响工作流程
- **即时反馈**：流畅的动画提供清晰的状态变化反馈
- **易于操作**：大按钮、清晰的交互提示
- **视觉统一**：与现代应用设计语言保持一致

### 性能优化

- 使用原生 Electron 窗口动画，性能优异
- 透明窗口 + 毛玻璃效果，GPU 加速
- 延迟初始化，不影响应用启动速度
- 按需显示，节省系统资源

## 未来规划

以下功能可在未来版本中实现：

1. **动态内容更新**：实时显示系统状态、通知等
2. **多种主题**：支持深色模式、自定义颜色
3. **手势控制**：支持手势快速展开/折叠
4. **快捷键控制**：添加全局快捷键控制灵动岛
5. **插件集成**：允许插件向灵动岛添加内容
6. **通知中心**：将灵动岛作为通知展示中心
7. **音乐控制**：快速控制媒体播放
8. **系统监控**：显示 CPU、内存、网络状态

## 故障排除

### 灵动岛不显示

1. 检查设置中是否已启用
2. 查看开发者工具控制台的错误信息
3. 尝试重启应用

### 动画不流畅

1. 检查 GPU 加速是否启用
2. 更新显卡驱动
3. 降低系统负载

### 位置不正确

1. 检查多显示器配置
2. 确认显示器缩放设置
3. 重启应用以重新计算位置

## 技术栈

- **Electron**: 窗口管理和 IPC 通信
- **Vue 3**: 组件框架
- **TypeScript**: 类型安全
- **Pinia**: 状态管理
- **electron-store**: 持久化存储
- **CSS 3**: 视觉效果和动画

## 版本历史

### v1.0.0 (2025-11-01)

- ✅ 初始版本发布
- ✅ 基础展开/折叠功能
- ✅ 设置页面集成
- ✅ 流畅动画效果
- ✅ 完整的 IPC 通信
- ✅ 配置持久化

---

**注意**：本功能采用最佳实践开发，遵循现代 UI/UX 设计原则，代码质量经过严格把控。
