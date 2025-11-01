# 灵动岛组件开发指南

## 📖 简介

欢迎使用 Fingertips AI 灵动岛组件开发系统！本指南将帮助您从零开始创建自己的灵动岛组件。

灵动岛是一个位于屏幕顶部的独立窗口，可以显示各种实时信息。组件系统允许您在折叠状态下定制显示内容（左、中、右三个位置）。

## 🎯 组件类型

系统支持两种显示位置和两种实现类型：

### 显示位置

#### 1. 折叠组件（Collapsed）

显示在灵动岛折叠状态下，位于窗口顶部的三个位置（左、中、右）。

**特点：**

- 📍 固定位置：左、中、右三选一
- 📏 紧凑显示：400×30px 窗口
- 🔄 实时更新：适合状态指示器
- 💡 一目了然：快速获取信息

**适用场景：**

- 时钟/日期显示
- 系统监控指示器
- 简单状态信息

#### 2. 展开组件（Expanded）

显示在灵动岛展开状态下，支持更丰富的内容和交互。

**特点：**

- 🎨 自由布局：支持 2×N 网格
- 📐 两种尺寸：小型（1行）、大型（2行）
- 🖱️ 丰富交互：支持完整的 HTML/JS
- 🔧 可编辑：拖拽排序、添加删除

**适用场景：**

- 日历组件
- 待办事项列表
- 天气预报
- 系统资源图表

---

### 实现类型

#### 1. Simple 类型（推荐入门）

适用于简单的文本/数据显示，只需配置 `manifest.json` 即可。

**特点：**

- ✅ 零代码开发
- ✅ JSON 配置驱动
- ✅ 支持模板变量
- ✅ 自动数据更新
- ✅ 自定义样式

**适用场景：**

- 时钟/日期显示
- 系统状态指示器
- 简单文本信息

#### 2. Advanced 类型（高级功能）

支持自定义 HTML/CSS/JavaScript，适用于复杂交互。

**特点：**

- ✅ 完全自定义 UI
- ✅ 支持复杂逻辑
- ✅ 可调用系统 API
- ✅ 支持第三方库

**适用场景：**

- 天气预报组件
- 系统监控图表
- 自定义交互组件

---

## 📁 目录结构

所有组件存放在项目根目录的 `dynamic-island-widgets/` 文件夹中：

```
fingertips-ai/
└── dynamic-island-widgets/
    ├── your-widget/           # 你的组件目录
    │   ├── manifest.json      # 必需：组件配置文件
    │   ├── widget.html        # 可选：Advanced 类型的 HTML
    │   ├── widget.css         # 可选：自定义样式
    │   └── widget.js          # 可选：自定义逻辑
    ├── clock/                 # 内置示例：时钟
    └── date/                  # 内置示例：日期
```

---

## 🚀 快速开始：创建 Simple 组件

### 步骤 1：创建组件目录

在 `dynamic-island-widgets/` 下创建一个新文件夹，例如 `my-clock`：

```bash
mkdir dynamic-island-widgets/my-clock
```

### 步骤 2：编写 manifest.json

在组件目录下创建 `manifest.json`：

```json
{
  "id": "my-custom-clock",
  "name": "我的时钟",
  "version": "1.0.0",
  "description": "显示当前时间",
  "author": "Your Name",
  "type": "simple",
  "config": {
    "format": "HH:mm:ss",
    "updateInterval": 1000
  },
  "template": {
    "type": "text",
    "content": "{{time}}"
  },
  "styles": {
    "fontSize": "14px",
    "fontWeight": "600",
    "color": "rgba(0, 0, 0, 0.85)"
  }
}
```

### 步骤 3：重启应用

1. 重启 Fingertips AI
2. 打开设置 → 灵动岛 → 收起组件
3. 在下拉菜单中选择"我的时钟"
4. 查看效果！

---

## 📚 Manifest 配置详解

### 必需字段

| 字段          | 类型                       | 说明                                     |
| ------------- | -------------------------- | ---------------------------------------- |
| `id`          | string                     | 组件唯一标识符（全局唯一，建议使用前缀） |
| `name`        | string                     | 组件显示名称                             |
| `version`     | string                     | 版本号（遵循 semver 规范）               |
| `description` | string                     | 组件简短描述                             |
| `author`      | string                     | 作者名称                                 |
| `type`        | `'simple'` \| `'advanced'` | 组件类型                                 |

### Simple 类型专用字段

#### `config` 对象

配置组件行为：

```json
{
  "config": {
    "format": "HH:mm:ss", // 自定义格式字符串
    "updateInterval": 1000 // 更新间隔（毫秒），最小 100ms
    // 可添加其他自定义配置...
  }
}
```

#### `template` 对象

定义显示模板：

```json
{
  "template": {
    "type": "text", // 模板类型：'text' | 'html'
    "content": "{{time}}" // 模板内容，支持变量替换
  }
}
```

**支持的模板变量：**

根据组件 ID 自动提供：

- `built-in-clock`: `{{time}}` - 格式化后的时间
- `built-in-date`: `{{date}}` - 格式化后的日期
- 自定义组件：需在主进程中实现数据提供逻辑

#### `styles` 对象

自定义 CSS 样式：

```json
{
  "styles": {
    "fontSize": "14px",
    "fontWeight": "500",
    "color": "rgba(0, 0, 0, 0.8)",
    "letterSpacing": "0.5px",
    "textTransform": "uppercase"
    // 支持所有标准 CSS 属性（驼峰命名）
  }
}
```

### Advanced 类型专用字段

#### `entry` 字段

指定 HTML 入口文件：

```json
{
  "type": "advanced",
  "entry": "widget.html" // HTML 文件路径（相对于组件目录）
}
```

---

## 🎨 Simple 组件示例

### 示例 1：简单文本

```json
{
  "id": "simple-text",
  "name": "欢迎语",
  "version": "1.0.0",
  "description": "显示固定欢迎文本",
  "author": "Fingertips AI",
  "type": "simple",
  "template": {
    "type": "text",
    "content": "Hello, World!"
  },
  "styles": {
    "fontSize": "13px",
    "color": "#666"
  }
}
```

### 示例 2：格式化时钟

```json
{
  "id": "custom-clock",
  "name": "24小时制时钟",
  "version": "1.0.0",
  "description": "24小时制，只显示小时和分钟",
  "author": "Your Name",
  "type": "simple",
  "config": {
    "format": "HH:mm",
    "updateInterval": 60000
  },
  "template": {
    "type": "text",
    "content": "{{time}}"
  },
  "styles": {
    "fontSize": "15px",
    "fontWeight": "700",
    "color": "#1677ff",
    "fontFamily": "monospace"
  }
}
```

### 示例 3：日期显示

```json
{
  "id": "custom-date",
  "name": "中文日期",
  "version": "1.0.0",
  "description": "显示年月日",
  "author": "Your Name",
  "type": "simple",
  "config": {
    "format": "YYYY年MM月DD日",
    "updateInterval": 3600000
  },
  "template": {
    "type": "text",
    "content": "{{date}}"
  },
  "styles": {
    "fontSize": "14px",
    "color": "#374151"
  }
}
```

---

## 🔧 Advanced 组件开发

### 步骤 1：创建组件目录

```bash
mkdir dynamic-island-widgets/my-advanced-widget
```

### 步骤 2：创建 manifest.json

```json
{
  "id": "my-advanced-widget",
  "name": "高级组件示例",
  "version": "1.0.0",
  "description": "使用 HTML/JS 的高级组件",
  "author": "Your Name",
  "type": "advanced",
  "entry": "widget.html"
}
```

### 步骤 3：创建 widget.html

```html
<div class="advanced-widget">
  <span id="display">加载中...</span>
</div>

<style>
  .advanced-widget {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: rgba(0, 0, 0, 0.8);
  }

  #display {
    font-weight: 500;
  }
</style>

<script>
  // 组件逻辑
  function updateWidget() {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')

    document.getElementById('display').textContent = `${hours}:${minutes}`
  }

  // 初始化
  updateWidget()

  // 定时更新
  setInterval(updateWidget, 1000)
</script>
```

### 步骤 4：测试组件

1. 重启应用
2. 在设置中选择该组件
3. 查看效果

---

## 🎨 展开组件开发（Expanded Widgets）

展开组件是显示在灵动岛展开状态下的组件，支持更丰富的内容和交互。

### 展开组件的 Manifest 配置

展开组件需要在 `manifest.json` 中添加以下字段：

```json
{
  "id": "my-expanded-widget",
  "name": "我的展开组件",
  "version": "1.0.0",
  "description": "展开视图中的自定义组件",
  "author": "Your Name",
  "type": "advanced",
  "category": "expanded", // 必需：标记为展开组件
  "expandedSize": "small", // 必需：'small' (1行) 或 'large' (2行)
  "expandedEntry": "widget.html" // 必需：HTML 文件路径
}
```

### Manifest 字段说明

| 字段            | 类型                          | 必需 | 说明                            |
| --------------- | ----------------------------- | ---- | ------------------------------- |
| `category`      | `'collapsed'` \| `'expanded'` | ✅   | 组件显示位置                    |
| `expandedSize`  | `'small'` \| `'large'`        | ✅   | 组件尺寸（小型1行，大型2行）    |
| `expandedEntry` | string                        | ✅   | HTML 文件路径（相对于组件目录） |

### 展开组件尺寸规范

| 尺寸    | 高度  | 宽度  | 说明                  |
| ------- | ----- | ----- | --------------------- |
| `small` | 160px | 220px | 占据1行，适合简单内容 |
| `large` | 332px | 220px | 占据2行，适合复杂内容 |

**注意：**

- 宽度 220px 是组件卡片的最小宽度，会根据窗口大小自动调整
- 高度是固定的，small = 160px，large = 332px（160 \* 2 + 12px gap）
- 组件会在网格中自动排列，支持拖拽调整位置

---

### 示例 1：小型展开组件（日历）

#### manifest.json

```json
{
  "id": "custom-calendar",
  "name": "日历",
  "version": "1.0.0",
  "description": "显示当月日历，高亮今日",
  "author": "Your Name",
  "type": "advanced",
  "category": "expanded",
  "expandedSize": "small",
  "expandedEntry": "widget.html"
}
```

#### widget.html

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      html,
      body {
        width: 100%;
        height: 100%;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow: hidden;
      }

      .calendar-container {
        width: 100%;
        height: 100%;
        padding: 12px;
        display: flex;
        flex-direction: column;
      }

      .calendar-header {
        text-align: center;
        margin-bottom: 8px;
      }

      .calendar-header h3 {
        font-size: 14px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.85);
      }

      .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
        flex: 1;
      }

      .calendar-day {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.65);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .calendar-day.today {
        background: #1677ff;
        color: white;
        font-weight: 600;
      }

      .calendar-day:hover:not(.today) {
        background: rgba(0, 0, 0, 0.05);
      }
    </style>
  </head>
  <body>
    <div class="calendar-container">
      <div class="calendar-header">
        <h3 id="month-year">2025年11月</h3>
      </div>
      <div class="calendar-grid" id="calendar"></div>
    </div>

    <script>
      function renderCalendar() {
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth()
        const today = now.getDate()

        // 更新标题
        document.getElementById('month-year').textContent = `${year}年${month + 1}月`

        // 获取本月天数
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const firstDay = new Date(year, month, 1).getDay()

        const calendar = document.getElementById('calendar')
        calendar.innerHTML = ''

        // 添加星期标题
        const weekdays = ['日', '一', '二', '三', '四', '五', '六']
        weekdays.forEach((day) => {
          const el = document.createElement('div')
          el.className = 'calendar-day'
          el.style.fontWeight = '600'
          el.style.fontSize = '11px'
          el.textContent = day
          calendar.appendChild(el)
        })

        // 添加空白占位
        for (let i = 0; i < firstDay; i++) {
          calendar.appendChild(document.createElement('div'))
        }

        // 添加日期
        for (let day = 1; day <= daysInMonth; day++) {
          const el = document.createElement('div')
          el.className = 'calendar-day'
          if (day === today) {
            el.classList.add('today')
          }
          el.textContent = day
          calendar.appendChild(el)
        }
      }

      // 初始化
      renderCalendar()

      // 每天更新一次
      setInterval(renderCalendar, 86400000)
    </script>
  </body>
</html>
```

---

### 示例 2：大型展开组件（待办事项）

#### manifest.json

```json
{
  "id": "custom-todo",
  "name": "待办事项",
  "version": "1.0.0",
  "description": "管理每日待办事项",
  "author": "Your Name",
  "type": "advanced",
  "category": "expanded",
  "expandedSize": "large",
  "expandedEntry": "widget.html"
}
```

#### widget.html

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      html,
      body {
        width: 100%;
        height: 100%;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow: hidden;
      }

      .todo-container {
        width: 100%;
        height: 100%;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
      }

      .todo-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        flex-shrink: 0;
      }

      .todo-header h3 {
        font-size: 15px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.85);
      }

      .todo-stats {
        font-size: 11px;
        color: rgba(0, 0, 0, 0.5);
      }

      .todo-input-wrapper {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        flex-shrink: 0;
      }

      .todo-input {
        flex: 1;
        padding: 6px 10px;
        border: 1.5px solid rgba(0, 0, 0, 0.1);
        border-radius: 6px;
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s;
      }

      .todo-input:focus {
        border-color: #1677ff;
      }

      .todo-add-btn {
        width: 32px;
        height: 32px;
        min-width: 32px;
        padding: 0;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #1677ff;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .todo-add-btn:hover {
        background: #4096ff;
      }

      .todo-list {
        flex: 1;
        min-height: 0;
        max-height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 4px;
        position: relative;
      }

      .todo-list::-webkit-scrollbar {
        width: 4px;
      }

      .todo-list::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.05);
        border-radius: 4px;
      }

      .todo-list::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.15);
        border-radius: 4px;
      }

      .todo-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        margin-bottom: 4px;
        background: rgba(0, 0, 0, 0.03);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        animation: slideIn 0.3s ease;
      }

      .todo-item:hover {
        background: rgba(0, 0, 0, 0.05);
      }

      .todo-checkbox {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(0, 0, 0, 0.25);
        border-radius: 4px;
        flex-shrink: 0;
        transition: all 0.2s;
      }

      .todo-checkbox.checked {
        background: #1677ff;
        border-color: #1677ff;
        position: relative;
      }

      .todo-checkbox.checked::after {
        content: '✓';
        position: absolute;
        color: white;
        font-size: 12px;
        top: -2px;
        left: 2px;
      }

      .todo-text {
        flex: 1;
        font-size: 13px;
        color: rgba(0, 0, 0, 0.85);
        word-break: break-word;
      }

      .todo-item.completed .todo-text {
        text-decoration: line-through;
        color: rgba(0, 0, 0, 0.45);
      }

      .todo-delete {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(0, 0, 0, 0.45);
        font-size: 18px;
        cursor: pointer;
        border-radius: 3px;
        flex-shrink: 0;
        transition: all 0.2s;
      }

      .todo-delete:hover {
        background: rgba(255, 77, 79, 0.1);
        color: #ff4d4f;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: rgba(0, 0, 0, 0.25);
        font-size: 13px;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    </style>
  </head>
  <body>
    <div class="todo-container">
      <div class="todo-header">
        <h3>今日待办</h3>
        <span class="todo-stats" id="stats">0 / 0</span>
      </div>

      <div class="todo-input-wrapper">
        <input
          type="text"
          class="todo-input"
          id="todo-input"
          placeholder="添加新待办..."
          maxlength="100"
        />
        <button class="todo-add-btn" id="add-btn">+</button>
      </div>

      <div class="todo-list" id="todo-list">
        <div class="empty-state" id="empty-state">
          <div style="font-size: 32px; margin-bottom: 8px">📝</div>
          <div>暂无待办事项</div>
        </div>
      </div>
    </div>

    <script>
      let todos = []

      // 从 localStorage 加载数据
      function loadTodos() {
        try {
          const saved = localStorage.getItem('todos')
          if (saved) {
            todos = JSON.parse(saved)
          }
        } catch (error) {
          console.error('Failed to load todos:', error)
        }
      }

      // 保存到 localStorage
      function saveTodos() {
        try {
          localStorage.setItem('todos', JSON.stringify(todos))
        } catch (error) {
          console.error('Failed to save todos:', error)
        }
      }

      // 渲染待办列表
      function renderTodos(animate = true) {
        const todoList = document.getElementById('todo-list')
        const emptyState = document.getElementById('empty-state')

        // 清空列表
        const items = todoList.querySelectorAll('.todo-item')
        items.forEach((item) => item.remove())

        if (todos.length === 0) {
          emptyState.style.display = 'flex'
          updateStats()
          return
        }

        emptyState.style.display = 'none'

        // 排序：未完成在前，已完成在后
        const sortedTodos = [...todos].sort((a, b) => {
          if (a.completed === b.completed) return 0
          return a.completed ? 1 : -1
        })

        sortedTodos.forEach((todo) => {
          const index = todos.findIndex(
            (t) => t.createdAt === todo.createdAt && t.text === todo.text
          )
          const todoItem = document.createElement('div')
          todoItem.className = `todo-item ${todo.completed ? 'completed' : ''}`
          if (!animate) {
            todoItem.style.animation = 'none'
          }

          const checkbox = document.createElement('div')
          checkbox.className = `todo-checkbox ${todo.completed ? 'checked' : ''}`
          checkbox.onclick = (e) => {
            e.stopPropagation()
            toggleTodo(index)
          }

          const text = document.createElement('div')
          text.className = 'todo-text'
          text.textContent = todo.text

          const deleteBtn = document.createElement('div')
          deleteBtn.className = 'todo-delete'
          deleteBtn.textContent = '×'
          deleteBtn.onclick = (e) => {
            e.stopPropagation()
            deleteTodo(index)
          }

          todoItem.appendChild(checkbox)
          todoItem.appendChild(text)
          todoItem.appendChild(deleteBtn)
          todoList.appendChild(todoItem)
        })

        updateStats()
      }

      // 更新统计信息
      function updateStats() {
        const completed = todos.filter((t) => t.completed).length
        const total = todos.length
        document.getElementById('stats').textContent = `${completed} / ${total}`
      }

      // 添加待办
      function addTodo() {
        const input = document.getElementById('todo-input')
        const text = input.value.trim()

        if (!text) return

        todos.push({
          id: Date.now(),
          text,
          completed: false,
          createdAt: Date.now()
        })

        input.value = ''
        saveTodos()
        renderTodos()
      }

      // 切换完成状态
      function toggleTodo(index) {
        todos[index].completed = !todos[index].completed
        saveTodos()
        renderTodos(false) // 不播放动画
      }

      // 删除待办
      function deleteTodo(index) {
        todos.splice(index, 1)
        saveTodos()
        renderTodos(false) // 不播放动画
      }

      // 初始化
      loadTodos()
      renderTodos()

      // 事件监听
      document.getElementById('add-btn').addEventListener('click', addTodo)
      document.getElementById('todo-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          addTodo()
        }
      })
    </script>
  </body>
</html>
```

---

## 📐 设计规范

### 折叠组件尺寸建议

- **窗口大小**：400×30px
- **组件内容高度**：不超过 30px
- **字体大小**：12-16px 之间
- **内边距**：4-8px

### 展开组件尺寸建议

#### Small 组件（1行）

- **固定高度**：160px
- **最小宽度**：220px（会根据窗口自动调整）
- **内边距**：12-16px
- **字体大小**：12-15px
- **标题大小**：14-16px
- **适用场景**：日历、天气、简单图表

#### Large 组件（2行）

- **固定高度**：332px（160×2 + 12px gap）
- **最小宽度**：220px（会根据窗口自动调整）
- **内边距**：12-16px
- **字体大小**：12-15px
- **标题大小**：14-16px
- **适用场景**：待办列表、邮件预览、详细信息面板

### 展开组件布局建议

#### Flexbox 布局最佳实践

```css
/* 容器 */
.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px;
}

/* 固定头部 */
.header {
  flex-shrink: 0;
  margin-bottom: 12px;
}

/* 可滚动内容区 */
.content {
  flex: 1;
  min-height: 0; /* 关键：允许 flex 项目缩小 */
  max-height: 100%; /* 限制最大高度 */
  overflow-y: auto; /* 启用滚动 */
  overflow-x: hidden;
}
```

#### 滚动条样式

```css
.scrollable::-webkit-scrollbar {
  width: 4px;
}

.scrollable::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.scrollable::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
}

.scrollable::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}
```

### 颜色建议

- **主文本**：`rgba(0, 0, 0, 0.85)` 或 `#374151`
- **次要文本**：`rgba(0, 0, 0, 0.65)` 或 `#6b7280`
- **禁用文本**：`rgba(0, 0, 0, 0.45)` 或 `#9ca3af`
- **边框**：`rgba(0, 0, 0, 0.1)` 或 `#e5e7eb`
- **背景（hover）**：`rgba(0, 0, 0, 0.05)` 或 `#f3f4f6`
- **强调色（主要）**：`#1677ff`（蓝色）
- **强调色（成功）**：`#10b981`（绿色）
- **强调色（危险）**：`#ff4d4f`（红色）
- **强调色（警告）**：`#faad14`（橙色）

### 动画建议

#### 入场动画

```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.item {
  animation: slideIn 0.3s ease;
}
```

#### 淡出动画

```css
@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.removing {
  animation: fadeOut 0.2s ease;
}
```

#### 过渡效果

```css
.interactive-element {
  transition: all 0.2s ease;
}

/* 避免过长的过渡时间 */
.slow-transition {
  transition: all 0.3s ease; /* 最大 0.3s */
}
```

### 性能建议

#### 折叠组件

- ⚠️ `updateInterval` 最小值：100ms
- ⚠️ 避免频繁的 DOM 操作
- ⚠️ 不要在组件中执行耗时操作
- ✅ 使用 CSS 动画而非 JS 动画

#### 展开组件

- ⚠️ 避免复杂的 DOM 结构（建议不超过 100 个节点）
- ⚠️ 使用 `requestAnimationFrame` 进行动画
- ⚠️ 大量数据时使用虚拟滚动
- ⚠️ 图片使用合适的尺寸，避免过大
- ✅ 使用 `transform` 和 `opacity` 进行动画（GPU 加速）
- ✅ 合理使用 `will-change` 属性
- ✅ 使用 `localStorage` 持久化数据
- ✅ 防抖和节流频繁触发的事件

### 数据持久化

展开组件可以使用 `localStorage` 保存数据：

```javascript
// 保存数据
function saveData() {
  try {
    localStorage.setItem('my-widget-data', JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save data:', error)
  }
}

// 加载数据
function loadData() {
  try {
    const saved = localStorage.getItem('my-widget-data')
    if (saved) {
      data = JSON.parse(saved)
    }
  } catch (error) {
    console.error('Failed to load data:', error)
  }
}
```

**注意：**

- 每个组件的 localStorage 是独立的（iframe 隔离）
- 数据大小限制通常为 5-10MB
- 使用 try-catch 处理可能的错误

---

## 🔌 扩展内置组件数据源

### 为自定义 Simple 组件提供数据

在 `src/main/modules/dynamicIslandWidgetManager.ts` 中扩展 `getWidgetData` 方法：

```typescript
getWidgetData(widgetId: string): any {
  const widget = this.widgets.get(widgetId)
  if (!widget || widget.manifest.type !== 'simple') {
    return null
  }

  // 添加你的自定义组件数据逻辑
  switch (widgetId) {
    case 'built-in-clock':
      return this.getClockData(manifest.config?.format || 'HH:mm:ss')

    case 'built-in-date':
      return this.getDateData(manifest.config?.format || 'YYYY-MM-DD')

    // 👇 添加你的组件
    case 'my-custom-widget':
      return {
        myData: 'Hello from backend!'
      }

    default:
      return null
  }
}
```

---

## 🐛 调试技巧

### 1. 查看日志

打开开发者工具（F12）查看控制台日志：

```
[WidgetManager] Loaded widget: 时钟 (built-in-clock)
[DynamicIsland] Failed to render widget: ...
```

### 2. 检查组件加载

在设置页面的"可用组件"列表中确认组件是否被正确加载。

### 3. manifest.json 验证

使用 JSON 校验工具确保配置文件格式正确。

### 4. 展开组件调试

展开组件在 iframe 中渲染，调试稍有不同：

#### 打开 iframe 控制台

1. 打开开发者工具（F12）
2. 点击展开灵动岛
3. 在 Elements/元素 标签页找到 `<iframe>` 元素
4. 右键 → 在 iframe 中查看 → 选择你的组件
5. 现在控制台会显示组件内的日志

#### 查看组件 HTML

```javascript
// 在组件的 script 中添加日志
console.log('Component initialized')
console.log('Current data:', todos)
```

#### 检查 localStorage

```javascript
// 在组件的 script 中
console.log('Saved data:', localStorage.getItem('my-widget-data'))

// 清空数据（用于测试）
localStorage.clear()
```

#### 调试样式

```javascript
// 临时修改样式
document.querySelector('.my-element').style.border = '2px solid red'
```

### 5. 常见错误

#### 折叠组件

| 错误         | 原因                        | 解决方案           |
| ------------ | --------------------------- | ------------------ |
| 组件不显示   | manifest.json 格式错误      | 检查 JSON 语法     |
| 样式不生效   | CSS 属性名错误              | 使用驼峰命名法     |
| 数据不更新   | updateInterval 太大         | 减小更新间隔       |
| 位置配置无效 | category 未设置为 collapsed | 检查 manifest.json |

#### 展开组件

| 错误                | 原因                       | 解决方案                      |
| ------------------- | -------------------------- | ----------------------------- |
| 组件不显示          | category 未设置为 expanded | 检查 manifest.json            |
| 样式混乱            | 缺少 `<style>` 标签        | 在 HTML 中添加完整样式        |
| 无法滚动            | 缺少 `min-height: 0`       | 参考布局最佳实践              |
| localStorage 不工作 | 未在 try-catch 中处理      | 添加错误处理                  |
| 动画卡顿            | DOM 操作过于频繁           | 使用 CSS 动画，减少 JS 操作   |
| 尺寸不对            | expandedSize 配置错误      | 检查是否为 'small' 或 'large' |
| 布局溢出            | 未设置 `overflow: hidden`  | 在 html/body 上添加 overflow  |
| 点击事件不响应      | pointer-events 被禁用      | 检查 CSS pointer-events 属性  |

---

## 📦 组件分发

### 打包组件

将整个组件文件夹打包为 ZIP：

```bash
zip -r my-widget.zip my-widget/
```

### 安装组件

1. 将组件文件夹复制到 `dynamic-island-widgets/`
2. 重启应用
3. 在设置中选择组件

---

## 🌟 最佳实践

### ✅ 通用推荐做法

- ✅ 使用语义化的组件 ID（如 `author-widgetname`）
- ✅ 提供清晰的组件描述和版本号
- ✅ 遵循设计规范（尺寸、颜色、字体）
- ✅ 充分测试组件（不同数据量、边界情况）
- ✅ 为所有异步操作添加错误处理
- ✅ 使用 `try-catch` 包裹可能出错的代码
- ✅ 提供有意义的空状态提示

### ✅ 折叠组件最佳实践

- ✅ 保持文本简洁（不超过 30 个字符）
- ✅ 使用等宽字体显示数字（如系统监控）
- ✅ 合理设置更新间隔（不要低于 100ms）
- ✅ 使用高对比度颜色确保可读性

### ✅ 展开组件最佳实践

#### 布局设计

- ✅ 使用 Flexbox 布局，头部 `flex-shrink: 0`
- ✅ 可滚动区域必须设置 `min-height: 0`
- ✅ 为长列表添加滚动条样式
- ✅ 使用 12-16px 的内边距
- ✅ 标题和内容区域明确分隔

#### 数据管理

- ✅ 使用 `localStorage` 持久化用户数据
- ✅ 数据变更时立即保存
- ✅ 加载数据时添加默认值和错误处理
- ✅ 对于列表数据，使用数组的不可变操作

```javascript
// ✅ 好的做法
const newTodos = [...todos, newItem]
setTodos(newTodos)
saveTodos(newTodos)

// ❌ 不推荐
todos.push(newItem)
```

#### 性能优化

- ✅ 避免在 `renderTodos()` 等频繁调用的函数中执行重计算
- ✅ 使用 CSS 动画而非 JavaScript 动画
- ✅ 对频繁触发的事件（如 input、scroll）进行防抖
- ✅ 仅在必要时重新渲染（添加 `animate` 参数控制）

```javascript
// ✅ 好的做法：添加动画控制参数
function renderTodos(animate = true) {
  todos.forEach((todo) => {
    const el = createElement(todo)
    if (!animate) {
      el.style.animation = 'none'  // 切换/删除时不播放动画
    }
    list.appendChild(el)
  })
}

// 添加时播放动画
addTodo() {
  todos.push(newTodo)
  renderTodos(true)
}

// 切换/删除时不播放动画（避免抖动）
toggleTodo(index) {
  todos[index].completed = !todos[index].completed
  renderTodos(false)
}
```

#### 交互设计

- ✅ 为已完成的任务添加视觉反馈（如删除线、降低透明度）
- ✅ 使用排序将已完成项移到列表底部
- ✅ 添加 hover 状态提升交互反馈
- ✅ 点击事件使用 `e.stopPropagation()` 防止冒泡
- ✅ 为交互元素添加 `pointer-events: auto` 和 `z-index`

```css
/* ✅ 好的做法 */
.todo-checkbox {
  pointer-events: auto; /* 确保可点击 */
  position: relative;
  z-index: 10; /* 提升层级 */
  cursor: pointer;
}
```

#### 空状态设计

- ✅ 提供友好的空状态提示
- ✅ 使用图标或 emoji 增强视觉效果
- ✅ 给出明确的操作指引

```html
<!-- ✅ 好的空状态 -->
<div class="empty-state">
  <div style="font-size: 32px; margin-bottom: 8px">📝</div>
  <div>暂无待办事项</div>
  <div style="font-size: 12px; color: rgba(0, 0, 0, 0.45); margin-top: 4px">
    添加第一个待办开始使用
  </div>
</div>
```

### ❌ 避免做法

#### 通用

- ❌ 不要使用过长的文本（超出窗口宽度）
- ❌ 不要执行同步阻塞操作
- ❌ 不要直接操作 DOM 之外的窗口元素
- ❌ 不要在组件中发起未授权的网络请求
- ❌ 不要在全局作用域污染变量
- ❌ 不要忽略错误处理

#### 展开组件

- ❌ 不要使用 `innerHTML = ''` 清空包含特殊元素的容器

```javascript
// ❌ 错误做法
todoList.innerHTML = '' // 会清空包括 empty-state 在内的所有元素

// ✅ 正确做法
const items = todoList.querySelectorAll('.todo-item')
items.forEach((item) => item.remove()) // 只删除 todo-item
```

- ❌ 不要在切换/删除时重新播放添加动画（会导致抖动）
- ❌ 不要忘记在 Flexbox 中设置 `min-height: 0`
- ❌ 不要在 localStorage 操作中省略 try-catch
- ❌ 不要频繁调用 `renderTodos()`（每次点击复选框）

```javascript
// ❌ 错误做法：每次都重新渲染整个列表
function toggleTodo(index) {
  todos[index].completed = !todos[index].completed
  renderTodos() // 导致所有项目重新创建，产生抖动
}

// ✅ 正确做法：禁用动画重新渲染
function toggleTodo(index) {
  todos[index].completed = !todos[index].completed
  renderTodos(false) // 不播放动画，避免抖动
}
```

### 📋 组件开发检查清单

#### Manifest 配置

- [ ] `id` 全局唯一
- [ ] `name` 简洁明了
- [ ] `version` 遵循 semver
- [ ] `description` 描述清晰
- [ ] `author` 填写完整
- [ ] `type` 设置正确（simple/advanced）
- [ ] `category` 设置正确（collapsed/expanded）
- [ ] `expandedSize` 设置正确（small/large，展开组件）

#### HTML 结构（展开组件）

- [ ] 完整的 `<!DOCTYPE html>` 声明
- [ ] `<meta charset="UTF-8" />` 标签
- [ ] `html, body { width: 100%; height: 100%; overflow: hidden; }`
- [ ] 容器使用 Flexbox 布局
- [ ] 固定元素设置 `flex-shrink: 0`
- [ ] 可滚动元素设置 `min-height: 0` 和 `overflow-y: auto`

#### 样式（展开组件）

- [ ] 所有样式包含在 `<style>` 标签中
- [ ] 使用推荐的颜色方案
- [ ] 添加滚动条自定义样式
- [ ] 过渡动画不超过 0.3s
- [ ] 使用 `rgba()` 而非固定颜色（支持深色模式扩展）

#### JavaScript（展开组件）

- [ ] 所有 localStorage 操作包裹在 try-catch 中
- [ ] 提供数据加载和保存函数
- [ ] 实现空状态显示逻辑
- [ ] 事件监听添加 `stopPropagation()`（必要时）
- [ ] 动画控制参数（`animate`）
- [ ] 排序逻辑（已完成项在后）

#### 测试

- [ ] 空数据状态正常显示
- [ ] 添加数据功能正常
- [ ] 编辑数据功能正常
- [ ] 删除数据功能正常
- [ ] 数据持久化正常
- [ ] 滚动功能正常（大量数据时）
- [ ] 动画流畅无抖动
- [ ] 样式在不同窗口大小下正常
- [ ] 没有控制台错误

---

## 🔗 相关资源

- **项目仓库**：[GitHub](https://github.com/your-repo)
- **问题反馈**：[Issues](https://github.com/your-repo/issues)
- **社区讨论**：[Discussions](https://github.com/your-repo/discussions)

---

## 📝 更新日志

### v1.0.0 (2025-11-01)

- ✨ 初始版本发布
- ✨ 支持 Simple 和 Advanced 两种组件类型
- ✨ 内置时钟和日期组件
- ✨ 支持左、中、右三个位置配置

---

## 🙏 贡献

欢迎提交你的组件！

1. Fork 项目
2. 创建组件
3. 提交 Pull Request
4. 等待审核

---

## 📄 许可证

本项目采用 MIT 许可证。

---

**祝你开发愉快！🎉**

如有问题，请随时联系我们或提交 Issue。
