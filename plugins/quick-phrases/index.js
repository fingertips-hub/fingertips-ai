/**
 * 常用语速记 - Quick Phrases Plugin
 * 快速复制常用语到剪切板，支持分类管理和搜索
 */

let pluginContext = null
let phrasesWindow = null

module.exports = {
  /**
   * 插件激活
   */
  activate(context) {
    pluginContext = context
    console.log('✅ 常用语速记插件已激活')

    // 注册 IPC 处理器
    this.registerHandlers(context)
  },

  /**
   * 插件停用
   */
  deactivate() {
    console.log('📋 常用语速记插件停用')

    // 关闭窗口
    if (phrasesWindow && phrasesWindow.isVisible()) {
      phrasesWindow.close()
      phrasesWindow = null
    }

    pluginContext = null
  },

  /**
   * 执行插件 - 打开常用语窗口
   */
  async execute(params) {
    console.log('📋 打开常用语速记...')

    try {
      await openPhrasesWindow()
      return { success: true }
    } catch (error) {
      console.error('打开常用语窗口失败:', error)

      if (pluginContext) {
        pluginContext.api.notification.show({
          title: '错误',
          body: `无法打开常用语速记: ${error.message}`
        })
      }

      return { success: false, error: error.message }
    }
  },

  /**
   * 注册 IPC 处理器
   */
  registerHandlers(context) {
    // 获取所有常用语
    context.ipc.handle('getPhrases', async () => {
      try {
        const phrases = await context.config.get('phrases')
        console.log('📖 读取常用语:', phrases ? phrases.length : 0, '条')
        return {
          success: true,
          data: phrases || []
        }
      } catch (error) {
        console.error('读取常用语失败:', error)
        return {
          success: false,
          error: error.message,
          data: []
        }
      }
    })

    // 保存所有常用语
    context.ipc.handle('savePhrases', async (event, phrases) => {
      try {
        await context.config.set('phrases', phrases)
        console.log('💾 保存常用语:', phrases.length, '条')
        return { success: true }
      } catch (error) {
        console.error('保存常用语失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    })

    // 获取分类列表
    context.ipc.handle('getCategories', async () => {
      try {
        const categories = await context.config.get('categories')
        return {
          success: true,
          data: categories || ['工作', '生活', '邮件', '社交', '其他']
        }
      } catch (error) {
        console.error('读取分类失败:', error)
        return {
          success: false,
          error: error.message,
          data: ['工作', '生活', '邮件', '社交', '其他']
        }
      }
    })

    // 保存分类列表
    context.ipc.handle('saveCategories', async (event, categories) => {
      try {
        await context.config.set('categories', categories)
        console.log('💾 保存分类:', categories.length, '个')
        return { success: true }
      } catch (error) {
        console.error('保存分类失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    })

    // 复制到剪切板
    context.ipc.handle('copyToClipboard', async (event, text) => {
      try {
        context.api.clipboard.writeText(text)
        console.log('📋 已复制到剪切板:', text.substring(0, 30) + (text.length > 30 ? '...' : ''))
        
        // 显示通知
        context.api.notification.show({
          title: '已复制',
          body: text.length > 50 ? text.substring(0, 50) + '...' : text
        })
        
        return { success: true }
      } catch (error) {
        console.error('复制失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    })

    // 获取插件信息
    context.ipc.handle('getPluginInfo', async () => {
      return {
        success: true,
        data: {
          name: context.manifest.name,
          version: context.manifest.version
        }
      }
    })
  }
}

/**
 * 打开常用语窗口
 */
async function openPhrasesWindow() {
  // 如果窗口已存在,聚焦它
  if (phrasesWindow && phrasesWindow.isVisible()) {
    phrasesWindow.focus()
    return
  }

  // 创建新窗口
  phrasesWindow = await pluginContext.api.window.create({
    title: '常用语速记',
    width: 420,
    height: 760,
    minWidth: 360,
    minHeight: 560,
    center: true,
    resizable: true,
    frame: true,
    html: 'ui/phrases.html',
    data: {
      pluginId: pluginContext.manifest.id,
      pluginName: pluginContext.manifest.name,
      version: pluginContext.manifest.version
    }
  })

  console.log('✅ 常用语窗口已创建:', phrasesWindow.id)
}
