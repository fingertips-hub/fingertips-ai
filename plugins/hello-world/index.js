/**
 * Hello World 插件
 * 这是一个简单的示例插件,演示:
 * 1. 插件的基本结构
 * 2. 如何使用插件 API
 * 3. 如何显示通知
 * 4. 如何读取插件配置
 */

module.exports = {
  /**
   * 插件激活时调用
   * @param {Object} context - 插件上下文
   */
  activate(context) {
    console.log('=================================')
    console.log('Hello World Plugin Activated!')
    console.log('Plugin Name:', context.manifest.name)
    console.log('Plugin Version:', context.manifest.version)
    console.log('Plugin Directory:', context.pluginDir)
    console.log('=================================')

    // 显示激活通知
    try {
      context.api.notification.show({
        title: context.manifest.name,
        body: '插件已成功激活! 🎉'
      })
    } catch (error) {
      console.error('Failed to show notification:', error)
    }

    // 返回清理函数
    return () => {
      console.log('Hello World Plugin Deactivated!')
    }
  },

  /**
   * 插件停用时调用
   */
  deactivate() {
    console.log('Hello World Plugin: Cleanup complete')
  },

  /**
   * 执行插件功能
   * 当用户从插件列表中执行此插件时调用
   * @param {Object} params - 执行参数
   */
  async execute(params) {
    console.log('Hello World Plugin: Execute called with params:', params)

    try {
      // 读取插件配置
      const message = (await this.context.config.get('message')) || 'Hello World!'

      // 显示通知
      this.context.api.notification.show({
        title: 'Hello World Plugin',
        body: message
      })

      // 返回执行结果
      return {
        success: true,
        message: '插件执行成功!',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Hello World Plugin: Execution failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  // 保存上下文引用(用于 execute 方法)
  context: null
}

// 保存上下文的 hack (在 activate 中设置)
const originalActivate = module.exports.activate
module.exports.activate = function (context) {
  module.exports.context = context
  return originalActivate.call(this, context)
}
