/**
 * 窗口示例插件
 * 展示如何使用 Window API 创建和管理自定义窗口
 */

let pluginContext = null
let configWindow = null
let demoWindow = null

module.exports = {
  /**
   * 插件激活
   */
  activate(context) {
    pluginContext = context
    console.log('窗口示例插件已激活')

    // 注册 IPC 处理器 - 保存配置
    context.ipc.handle('saveConfig', async (event, config) => {
      try {
        await context.config.setAll(config)

        context.api.notification.show({
          title: '配置已保存',
          body: '插件配置已成功更新'
        })

        return { success: true }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    // 注册 IPC 处理器 - 获取配置
    context.ipc.handle('getConfig', async () => {
      const config = await context.config.getAll()
      return { success: true, data: config }
    })

    // 注册 IPC 处理器 - 更新窗口计数
    context.ipc.handle('incrementWindowCount', async () => {
      const count = (await context.config.get('windowCount')) || 0
      await context.config.set('windowCount', count + 1)
      return { success: true, data: count + 1 }
    })
  },

  /**
   * 插件停用
   */
  deactivate() {
    console.log('窗口示例插件已停用')

    // 清理：关闭所有窗口
    if (configWindow) {
      configWindow.close()
      configWindow = null
    }
    if (demoWindow) {
      demoWindow.close()
      demoWindow = null
    }

    pluginContext = null
  },

  /**
   * 执行插件
   */
  async execute(params) {
    console.log('执行窗口示例插件')

    try {
      // 显示菜单让用户选择要打开的窗口
      const result = await pluginContext.api.dialog.showMessageBox({
        type: 'question',
        title: '窗口示例',
        message: '选择要演示的窗口类型:',
        detail: '1. 配置窗口 - 完整的配置界面\n2. 演示窗口 - 简单的展示窗口\n3. 查看所有窗口',
        buttons: ['配置窗口', '演示窗口', '查看窗口', '取消']
      })

      switch (result) {
        case 0:
          await openConfigWindow()
          break
        case 1:
          await openDemoWindow()
          break
        case 2:
          await showWindowsList()
          break
        default:
          return { success: false, error: '用户取消' }
      }

      return { success: true }
    } catch (error) {
      console.error('执行失败:', error)

      pluginContext.api.notification.show({
        title: '执行失败',
        body: error.message
      })

      return { success: false, error: error.message }
    }
  }
}

/**
 * 打开配置窗口
 */
async function openConfigWindow() {
  try {
    // 如果窗口已存在且可见，聚焦它
    if (configWindow && configWindow.isVisible()) {
      configWindow.focus()
      return
    }

    // 创建配置窗口
    configWindow = await pluginContext.api.window.create({
      title: '窗口示例 - 配置',
      width: 600,
      height: 500,
      minWidth: 500,
      minHeight: 400,
      center: true,
      resizable: true,
      html: 'ui/config.html',
      data: {
        pluginId: pluginContext.manifest.id,
        pluginName: pluginContext.manifest.name,
        config: await pluginContext.config.getAll()
      }
    })

    console.log('配置窗口已创建:', configWindow.id)

    pluginContext.api.notification.show({
      title: '窗口已打开',
      body: '配置窗口已成功创建'
    })
  } catch (error) {
    console.error('创建配置窗口失败:', error)
    throw error
  }
}

/**
 * 打开演示窗口
 */
async function openDemoWindow() {
  try {
    // 增加窗口计数
    const count = (await pluginContext.config.get('windowCount')) || 0
    await pluginContext.config.set('windowCount', count + 1)

    // 创建演示窗口
    demoWindow = await pluginContext.api.window.create({
      title: '窗口示例 - 演示',
      width: 400,
      height: 300,
      center: true,
      resizable: false,
      frame: true,
      html: 'ui/demo.html',
      data: {
        pluginId: pluginContext.manifest.id,
        message: '这是一个演示窗口',
        windowNumber: count + 1,
        timestamp: new Date().toLocaleString('zh-CN')
      }
    })

    console.log('演示窗口已创建:', demoWindow.id)

    pluginContext.api.notification.show({
      title: '演示窗口',
      body: `第 ${count + 1} 个窗口已创建`
    })
  } catch (error) {
    console.error('创建演示窗口失败:', error)
    throw error
  }
}

/**
 * 显示所有窗口列表
 */
async function showWindowsList() {
  const windows = pluginContext.api.window.getAll()

  if (windows.length === 0) {
    await pluginContext.api.dialog.showMessageBox({
      type: 'info',
      title: '窗口列表',
      message: '当前没有打开的窗口',
      buttons: ['确定']
    })
    return
  }

  const windowsList = windows
    .map((w, index) => {
      return `${index + 1}. ${w.id} (${w.isVisible() ? '可见' : '隐藏'})`
    })
    .join('\n')

  const result = await pluginContext.api.dialog.showMessageBox({
    type: 'info',
    title: '窗口列表',
    message: `当前有 ${windows.length} 个窗口:`,
    detail: windowsList,
    buttons: ['关闭所有窗口', '确定']
  })

  if (result === 0) {
    pluginContext.api.window.closeAll()

    pluginContext.api.notification.show({
      title: '窗口已关闭',
      body: `已关闭 ${windows.length} 个窗口`
    })
  }
}
