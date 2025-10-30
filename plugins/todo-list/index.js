/**
 * Todo List Plugin - Main Process
 *
 * 功能完善的待办事项管理插件
 * 使用 localStorage 进行数据持久化
 */

let pluginContext = null
let todoWindow = null

module.exports = {
  /**
   * 插件激活
   */
  activate(context) {
    pluginContext = context
    console.log('=== Todo List 插件已激活 ===')

    // 注册 IPC 处理器
    this.registerHandlers(context)

    // 返回清理函数
    return () => {
      if (todoWindow) {
        todoWindow.close()
        todoWindow = null
      }
    }
  },

  /**
   * 插件停用
   */
  deactivate() {
    console.log('=== Todo List 插件已停用 ===')

    // 关闭窗口
    if (todoWindow) {
      todoWindow.close()
      todoWindow = null
    }

    // 清理上下文
    pluginContext = null
  },

  /**
   * 执行插件 - 打开 Todo List 窗口
   */
  async execute(params) {
    console.log('=== 执行 Todo List ===')
    await openTodoWindow()
    return { success: true }
  },

  /**
   * 注册 IPC 处理器
   */
  registerHandlers(context) {
    // 获取所有任务
    context.ipc.handle('getTodos', async () => {
      try {
        const todos = await context.config.get('todos')
        console.log('📖 读取任务:', todos ? todos.length : 0, '条')
        return {
          success: true,
          data: todos || []
        }
      } catch (error) {
        console.error('读取任务失败:', error)
        return {
          success: false,
          error: error.message,
          data: []
        }
      }
    })

    // 保存所有任务
    context.ipc.handle('saveTodos', async (event, todos) => {
      try {
        await context.config.set('todos', todos)
        console.log('💾 保存任务:', todos.length, '条')
        return { success: true }
      } catch (error) {
        console.error('保存任务失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    })

    // 发送通知 - 添加任务
    context.ipc.handle('notifyTaskAdded', async (event, task) => {
      try {
        if (await context.config.get('notifications')) {
          context.api.notification.show({
            title: '新任务已添加',
            body: task.text
          })
        }
        return { success: true }
      } catch (error) {
        console.error('发送通知失败:', error)
        return { success: false, error: error.message }
      }
    })

    // 发送通知 - 任务状态变化
    context.ipc.handle('notifyTaskToggled', async (event, data) => {
      try {
        if (await context.config.get('notifications')) {
          context.api.notification.show({
            title: data.completed ? '任务已完成' : '任务重新激活',
            body: data.text
          })
        }
        return { success: true }
      } catch (error) {
        console.error('发送通知失败:', error)
        return { success: false, error: error.message }
      }
    })

    // 发送通知 - 清空已完成
    context.ipc.handle('notifyCleared', async (event, count) => {
      try {
        if (await context.config.get('notifications')) {
          context.api.notification.show({
            title: '清理完成',
            body: `已清除 ${count} 个已完成任务`
          })
        }
        return { success: true }
      } catch (error) {
        console.error('发送通知失败:', error)
        return { success: false, error: error.message }
      }
    })

    // 获取配置
    context.ipc.handle('getConfig', async () => {
      try {
        const config = await context.config.getAll()
        return { success: true, data: config }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    // 保存配置
    context.ipc.handle('saveConfig', async (event, config) => {
      try {
        await context.config.setAll(config)
        context.api.notification.show({
          title: '配置已保存',
          body: '设置已成功更新'
        })
        return { success: true }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })
  },

  /**
   * 获取插件信息
   */
  async getPluginInfo() {
    return {
      success: true,
      data: {
        name: pluginContext.manifest.name,
        version: pluginContext.manifest.version
      }
    }
  }
}

/**
 * 打开 Todo List 窗口
 */
async function openTodoWindow() {
  try {
    // 如果窗口已存在，聚焦它
    if (todoWindow && todoWindow.isVisible()) {
      todoWindow.focus()
      return
    }

    // 创建新窗口
    todoWindow = await pluginContext.api.window.create({
      title: 'Todo List',
      width: 800,
      height: 800,
      minWidth: 600,
      minHeight: 500,
      center: true,
      resizable: true,
      html: 'ui/todo.html',
      data: {
        pluginId: pluginContext.manifest.id,
        pluginName: pluginContext.manifest.name
      }
    })

    console.log('Todo List 窗口已创建:', todoWindow.id)
  } catch (error) {
    console.error('创建 Todo List 窗口失败:', error)
    pluginContext.api.notification.show({
      title: '错误',
      body: `无法打开 Todo List: ${error.message}`
    })
  }
}
