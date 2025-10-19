/**
 * Vue 插件开发示例
 * 展示如何使用 Vue 3 单文件组件开发插件界面
 *
 * 使用方式:
 * - CDN 方式: 设置 USE_BUILT_VERSION = false (无需构建)
 * - 构建方式: 设置 USE_BUILT_VERSION = true (需先运行 npm run build)
 */

// 配置: 是否使用构建版本
const USE_BUILT_VERSION = false // 改为 true 使用单文件组件构建版本

let pluginContext = null
let configWindow = null
let dashboardWindow = null

module.exports = {
  /**
   * 插件激活
   */
  activate(context) {
    pluginContext = context
    console.log('Vue 插件示例已激活')

    // 注册 IPC 处理器 - 保存配置
    context.ipc.handle('saveConfig', async (event, config) => {
      try {
        await context.config.setAll(config)

        context.api.notification.show({
          title: '配置已保存',
          body: 'Vue 插件配置已成功更新'
        })

        return { success: true }
      } catch (error) {
        console.error('保存配置失败:', error)
        return { success: false, error: error.message }
      }
    })

    // 注册 IPC 处理器 - 获取配置
    context.ipc.handle('getConfig', async () => {
      try {
        const config = await context.config.getAll()
        return { success: true, data: config }
      } catch (error) {
        console.error('获取配置失败:', error)
        return { success: false, error: error.message }
      }
    })

    // 注册 IPC 处理器 - 测试通知
    context.ipc.handle('testNotification', async (event, data) => {
      try {
        context.api.notification.show({
          title: data.title || '测试通知',
          body: data.body || '这是一条来自 Vue 插件的测试通知'
        })
        return { success: true }
      } catch (error) {
        console.error('发送通知失败:', error)
        return { success: false, error: error.message }
      }
    })

    // 注册 IPC 处理器 - 复制到剪贴板
    context.ipc.handle('copyToClipboard', async (event, text) => {
      try {
        await context.api.clipboard.writeText(text)
        context.api.notification.show({
          title: '已复制',
          body: '内容已复制到剪贴板'
        })
        return { success: true }
      } catch (error) {
        console.error('复制失败:', error)
        return { success: false, error: error.message }
      }
    })

    // 注册 IPC 处理器 - 打开仪表盘
    context.ipc.handle('openDashboard', async () => {
      try {
        await openDashboard()
        return { success: true }
      } catch (error) {
        console.error('打开仪表盘失败:', error)
        return { success: false, error: error.message }
      }
    })
  },

  /**
   * 插件停用
   */
  deactivate() {
    console.log('Vue 插件示例已停用')

    // 清理：关闭所有窗口
    if (configWindow) {
      configWindow.close()
      configWindow = null
    }
    if (dashboardWindow) {
      dashboardWindow.close()
      dashboardWindow = null
    }

    pluginContext = null
  },

  /**
   * 执行插件
   */
  async execute(params) {
    console.log('执行 Vue 插件示例', params)

    try {
      // 显示菜单让用户选择功能
      const result = await pluginContext.api.dialog.showMessageBox({
        type: 'question',
        title: 'Vue 插件示例',
        message: '选择要打开的界面:',
        detail: '1. 配置面板 - 使用 Vue 3 开发的完整配置界面\n2. 数据仪表盘 - 展示响应式数据和组件',
        buttons: ['配置面板', '数据仪表盘', '取消']
      })

      switch (result) {
        case 0:
          await openConfig()
          break
        case 1:
          await openDashboard()
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
async function openConfig() {
  try {
    // 如果窗口已存在且可见，聚焦它
    if (configWindow && configWindow.isVisible()) {
      configWindow.focus()
      return
    }

    // 获取当前配置
    const config = await pluginContext.config.getAll()

    // 创建配置窗口
    const htmlFile = USE_BUILT_VERSION ? 'ui/config-built.html' : 'ui/config.html'

    configWindow = await pluginContext.api.window.create({
      title: 'Vue 插件 - 配置',
      width: 800,
      height: 600,
      minWidth: 600,
      minHeight: 500,
      center: true,
      resizable: true,
      html: htmlFile,
      data: {
        pluginId: pluginContext.manifest.id,
        pluginName: pluginContext.manifest.name,
        config: config
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
 * 打开仪表盘窗口
 */
async function openDashboard() {
  try {
    // 如果窗口已存在且可见，聚焦它
    if (dashboardWindow && dashboardWindow.isVisible()) {
      dashboardWindow.focus()
      return
    }

    // 创建仪表盘窗口
    const htmlFile = USE_BUILT_VERSION ? 'ui/dashboard-built.html' : 'ui/dashboard.html'

    dashboardWindow = await pluginContext.api.window.create({
      title: 'Vue 插件 - 数据仪表盘',
      width: 1000,
      height: 700,
      minWidth: 800,
      minHeight: 600,
      center: true,
      resizable: true,
      html: htmlFile,
      data: {
        pluginId: pluginContext.manifest.id,
        pluginName: pluginContext.manifest.name,
        timestamp: new Date().toISOString()
      }
    })

    console.log('仪表盘窗口已创建:', dashboardWindow.id)
  } catch (error) {
    console.error('创建仪表盘窗口失败:', error)
    throw error
  }
}
