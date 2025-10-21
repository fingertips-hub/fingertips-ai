/**
 * 截图查看器插件
 * 点击后截图并在新窗口中展示
 */

module.exports = {
  /**
   * 插件激活
   */
  activate(context) {
    module.exports.context = context
    const { api, ipc } = context

    console.log('截图查看器插件已激活')

    // 注册 IPC 处理器：窗口准备好后请求截图数据
    ipc.handle('request-screenshot', async () => {
      const dataURL = module.exports.pendingScreenshot
      module.exports.pendingScreenshot = null
      return { success: true, dataURL }
    })

    // 返回清理函数
    return () => {
      console.log('截图查看器插件已停用')
      // 关闭所有窗口
      api.window.closeAll()
    }
  },

  /**
   * 插件停用
   */
  deactivate() {
    console.log('截图查看器插件正在停用...')
  },

  /**
   * 执行截图并显示
   */
  async execute() {
    const { api } = module.exports.context

    try {
      console.log('开始截图...')

      // 调用截图 API
      const dataURL = await api.screenshot.capture()

      // 如果没有截图（用户取消），静默退出
      if (!dataURL) {
        console.log('用户取消了截图')
        return {
          success: false,
          message: '用户取消了截图'
        }
      }

      console.log('截图成功，准备显示...')

      // 保存截图数据，等待窗口请求
      module.exports.pendingScreenshot = dataURL

      // 创建窗口显示截图
      const window = await api.window.create({
        title: '截图查看器',
        width: 1000,
        height: 700,
        minWidth: 600,
        minHeight: 400,
        center: true,
        resizable: true,
        frame: true,
        html: 'ui/viewer.html'
      })

      console.log('查看器窗口已创建:', window.id)

      // 显示成功通知
      api.notification.show({
        title: '截图查看器',
        body: '截图已在新窗口中打开'
      })

      return {
        success: true,
        message: '截图已显示'
      }
    } catch (error) {
      console.error('截图失败:', error)

      // 显示错误通知
      api.notification.show({
        title: '截图失败',
        body: error.message || '未知错误'
      })

      return {
        success: false,
        error: error.message
      }
    }
  },

  // 上下文引用
  context: null,
  // 待发送的截图数据
  pendingScreenshot: null
}
