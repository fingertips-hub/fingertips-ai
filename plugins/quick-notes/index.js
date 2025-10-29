/**
 * 随手记 - Quick Notes Plugin
 * 优雅的随手记事本,支持自动保存
 */

let pluginContext = null
let notesWindow = null

module.exports = {
  /**
   * 插件激活
   */
  activate(context) {
    pluginContext = context
    console.log('✅ 随手记插件已激活')

    // 注册 IPC 处理器
    this.registerHandlers(context)
  },

  /**
   * 插件停用
   */
  deactivate() {
    console.log('📝 随手记插件停用')

    // 关闭窗口
    if (notesWindow && notesWindow.isVisible()) {
      notesWindow.close()
      notesWindow = null
    }

    pluginContext = null
  },

  /**
   * 执行插件 - 打开笔记窗口
   */
  async execute(params) {
    console.log('📝 打开随手记...')

    try {
      await openNotesWindow()
      return { success: true }
    } catch (error) {
      console.error('打开笔记窗口失败:', error)

      if (pluginContext) {
        pluginContext.api.notification.show({
          title: '错误',
          body: `无法打开随手记: ${error.message}`
        })
      }

      return { success: false, error: error.message }
    }
  },

  /**
   * 注册 IPC 处理器
   */
  registerHandlers(context) {
    // 获取所有笔记
    context.ipc.handle('getNotes', async () => {
      try {
        const notes = await context.config.get('notes')
        console.log('📖 读取笔记:', notes ? notes.length : 0, '条')
        return {
          success: true,
          data: notes || []
        }
      } catch (error) {
        console.error('读取笔记失败:', error)
        return {
          success: false,
          error: error.message,
          data: []
        }
      }
    })

    // 保存所有笔记
    context.ipc.handle('saveNotes', async (event, notes) => {
      try {
        await context.config.set('notes', notes)
        console.log('💾 保存笔记:', notes.length, '条')
        return { success: true }
      } catch (error) {
        console.error('保存笔记失败:', error)
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
 * 打开笔记窗口
 */
async function openNotesWindow() {
  // 如果窗口已存在,聚焦它
  if (notesWindow && notesWindow.isVisible()) {
    notesWindow.focus()
    return
  }

  // 创建新窗口
  notesWindow = await pluginContext.api.window.create({
    title: '随手记',
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    center: true,
    resizable: true,
    frame: true,
    html: 'ui/notes.html',
    data: {
      pluginId: pluginContext.manifest.id,
      pluginName: pluginContext.manifest.name,
      version: pluginContext.manifest.version
    }
  })

  console.log('✅ 笔记窗口已创建:', notesWindow.id)
}
