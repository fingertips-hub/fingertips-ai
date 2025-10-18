/**
 * 文本处理工具插件
 * 演示插件的各种功能和最佳实践
 */

const path = require('path')

// 插件上下文（在 activate 中设置）
let pluginContext = null

// 处理历史记录
let processHistory = []

/**
 * 文本处理操作
 */
const TextOperations = {
  // 转大写
  uppercase: (text) => text.toUpperCase(),

  // 转小写
  lowercase: (text) => text.toLowerCase(),

  // 首字母大写
  capitalize: (text) =>
    text
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' '),

  // 去除所有空格
  removeSpaces: (text) => text.replace(/\s+/g, ''),

  // 去除首尾空格
  trim: (text) => text.trim(),

  // URL 编码
  urlEncode: (text) => encodeURIComponent(text),

  // URL 解码
  urlDecode: (text) => {
    try {
      return decodeURIComponent(text)
    } catch (e) {
      throw new Error('无效的URL编码')
    }
  },

  // Base64 编码
  base64Encode: (text) => Buffer.from(text, 'utf-8').toString('base64'),

  // Base64 解码
  base64Decode: (text) => {
    try {
      return Buffer.from(text, 'base64').toString('utf-8')
    } catch (e) {
      throw new Error('无效的Base64编码')
    }
  },

  // 反转文本
  reverse: (text) => text.split('').reverse().join(''),

  // 计算字符数
  count: (text) => {
    return `字符数: ${text.length}\n单词数: ${text.split(/\s+/).filter((w) => w).length}`
  }
}

/**
 * 获取国际化消息
 */
async function getMessage(key, defaultValue = key) {
  const config = await pluginContext.config.getAll()
  const language = config.language || 'zh-CN'

  const messages = {
    'zh-CN': {
      'operation.success': '处理成功',
      'operation.failed': '处理失败',
      'operation.empty': '剪贴板为空',
      'operation.copied': '结果已复制到剪贴板',
      'history.saved': '已保存到历史记录',
      'error.unknown': '未知错误'
    },
    'en-US': {
      'operation.success': 'Success',
      'operation.failed': 'Failed',
      'operation.empty': 'Clipboard is empty',
      'operation.copied': 'Result copied to clipboard',
      'history.saved': 'Saved to history',
      'error.unknown': 'Unknown error'
    }
  }

  return messages[language]?.[key] || defaultValue
}

/**
 * 保存到历史记录
 */
async function saveToHistory(operation, input, output) {
  const config = await pluginContext.config.getAll()

  if (!config.history?.enabled) {
    return
  }

  const maxItems = config.history?.maxItems || 10

  processHistory.unshift({
    timestamp: Date.now(),
    operation,
    input: input.substring(0, 100), // 只保存前100个字符
    output: output.substring(0, 100),
    date: new Date().toLocaleString()
  })

  // 限制历史记录数量
  if (processHistory.length > maxItems) {
    processHistory = processHistory.slice(0, maxItems)
  }

  // 保存到文件
  try {
    const historyPath = path.join(pluginContext.pluginDir, 'history.json')
    await pluginContext.api.fs.writeFile(historyPath, JSON.stringify(processHistory, null, 2), {
      encoding: 'utf-8'
    })
  } catch (error) {
    console.error('保存历史记录失败:', error)
  }
}

/**
 * 加载历史记录
 */
async function loadHistory() {
  try {
    const historyPath = path.join(pluginContext.pluginDir, 'history.json')
    const exists = await pluginContext.api.fs.exists(historyPath)

    if (exists) {
      const content = await pluginContext.api.fs.readFile(historyPath, { encoding: 'utf-8' })
      processHistory = JSON.parse(content)
      console.log('已加载历史记录:', processHistory.length, '条')
    }
  } catch (error) {
    console.error('加载历史记录失败:', error)
    processHistory = []
  }
}

/**
 * 执行文本处理
 */
async function processText(operation, text) {
  if (!text) {
    throw new Error(await getMessage('operation.empty'))
  }

  const operationFn = TextOperations[operation]
  if (!operationFn) {
    throw new Error(`不支持的操作: ${operation}`)
  }

  return operationFn(text)
}

/**
 * 显示操作选择对话框
 */
async function showOperationDialog() {
  const config = await pluginContext.config.getAll()

  const operations = [
    { id: 'uppercase', name: '转大写 (UPPERCASE)' },
    { id: 'lowercase', name: '转小写 (lowercase)' },
    { id: 'capitalize', name: '首字母大写 (Capitalize)' },
    { id: 'removeSpaces', name: '去除空格' },
    { id: 'trim', name: '去除首尾空格' },
    { id: 'urlEncode', name: 'URL编码' },
    { id: 'urlDecode', name: 'URL解码' },
    { id: 'base64Encode', name: 'Base64编码' },
    { id: 'base64Decode', name: 'Base64解码' },
    { id: 'reverse', name: '反转文本' },
    { id: 'count', name: '统计字符数' }
  ]

  // 构建选项文本
  const optionsText = operations.map((op, index) => `${index + 1}. ${op.name}`).join('\n')

  const result = await pluginContext.api.dialog.showMessageBox({
    type: 'question',
    title: '选择文本处理操作',
    message: '请选择要执行的操作:',
    detail: optionsText,
    buttons: operations.map((op) => op.name),
    defaultId: operations.findIndex((op) => op.id === config.defaultOperation) || 0
  })

  return operations[result].id
}

/**
 * 插件激活
 */
function activate(context) {
  console.log('=== 文本处理工具插件激活 ===')
  console.log('插件名称:', context.manifest.name)
  console.log('插件版本:', context.manifest.version)
  console.log('插件目录:', context.pluginDir)

  // 保存上下文
  pluginContext = context

  // 加载历史记录
  loadHistory()

  // 显示激活通知
  context.api.notification.show({
    title: '插件已激活',
    body: '文本处理工具已准备就绪'
  })

  // 监听配置变化
  context.config.onChange('language', (newValue, oldValue) => {
    console.log(`语言设置变化: ${oldValue} => ${newValue}`)
  })

  context.config.onChange('history.enabled', (enabled) => {
    console.log('历史记录功能:', enabled ? '已启用' : '已禁用')
  })

  // 注册 IPC 处理器
  context.ipc.handle('getHistory', async () => {
    return {
      success: true,
      data: processHistory
    }
  })

  context.ipc.handle('clearHistory', async () => {
    processHistory = []
    const historyPath = path.join(context.pluginDir, 'history.json')
    await context.api.fs.writeFile(historyPath, JSON.stringify([]), { encoding: 'utf-8' })
    return { success: true }
  })

  // 返回清理函数
  return () => {
    console.log('清理插件资源')
  }
}

/**
 * 插件停用
 */
function deactivate() {
  console.log('=== 文本处理工具插件停用 ===')
  pluginContext = null
  processHistory = []
}

/**
 * 执行插件功能
 */
async function execute(params) {
  console.log('=== 执行文本处理 ===')
  console.log('参数:', params)

  if (!pluginContext) {
    return { success: false, error: '插件未激活' }
  }

  try {
    const config = await pluginContext.config.getAll()

    // 1. 获取输入文本
    let inputText = params?.text
    if (!inputText) {
      // 从剪贴板读取
      inputText = pluginContext.api.clipboard.readText()
    }

    if (!inputText || !inputText.trim()) {
      pluginContext.api.notification.show({
        title: await getMessage('operation.failed'),
        body: await getMessage('operation.empty')
      })
      return { success: false, error: await getMessage('operation.empty') }
    }

    // 2. 选择操作
    let operation = params?.operation || config.defaultOperation
    if (!operation || operation === 'prompt') {
      // 显示选择对话框
      operation = await showOperationDialog()
    }

    console.log('执行操作:', operation)
    console.log('输入文本长度:', inputText.length)

    // 3. 执行处理
    const result = await processText(operation, inputText)

    console.log('处理结果长度:', result.length)

    // 4. 复制到剪贴板（如果配置启用）
    if (config.copyResult) {
      pluginContext.api.clipboard.writeText(result)
    }

    // 5. 保存到历史记录
    await saveToHistory(operation, inputText, result)

    // 6. 显示结果通知
    if (config.autoNotify) {
      const messages = []
      messages.push(await getMessage('operation.success'))
      if (config.copyResult) {
        messages.push(await getMessage('operation.copied'))
      }

      pluginContext.api.notification.show({
        title: '文本处理完成',
        body: messages.join('\n')
      })
    }

    // 7. 显示结果对话框
    await pluginContext.api.dialog.showMessageBox({
      type: 'info',
      title: '处理结果',
      message: '文本处理完成',
      detail: `操作: ${operation}\n\n处理后的文本:\n${result.substring(0, 500)}${result.length > 500 ? '...' : ''}\n\n${config.copyResult ? '✓ 已复制到剪贴板' : ''}`
    })

    return {
      success: true,
      data: {
        operation,
        inputLength: inputText.length,
        outputLength: result.length,
        result,
        timestamp: Date.now()
      }
    }
  } catch (error) {
    console.error('执行失败:', error)

    // 显示错误通知
    pluginContext.api.notification.show({
      title: await getMessage('operation.failed'),
      body: error.message || (await getMessage('error.unknown'))
    })

    return {
      success: false,
      error: error.message || (await getMessage('error.unknown'))
    }
  }
}

// 导出插件接口
module.exports = {
  activate,
  deactivate,
  execute
}
