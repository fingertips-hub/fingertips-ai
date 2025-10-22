/**
 * 百度云OCR识别插件
 *
 * 功能：截图后使用百度云OCR API识别图片中的文字
 */

const https = require('https')
const querystring = require('querystring')

let pluginContext = null
let configWindow = null
let resultWindow = null
let accessToken = null
let tokenExpireTime = 0

module.exports = {
  /**
   * 插件激活
   */
  activate(context) {
    pluginContext = context
    console.log('百度云OCR插件已激活')

    // 注册配置保存处理器
    context.ipc.handle('saveConfig', async (event, config) => {
      try {
        await context.config.setAll(config)

        // 清除旧的 access_token，下次使用时重新获取
        accessToken = null
        tokenExpireTime = 0

        context.api.notification.show({
          title: '配置已保存',
          body: 'OCR配置已成功更新'
        })

        return { success: true }
      } catch (error) {
        console.error('保存配置失败:', error)
        return { success: false, error: error.message }
      }
    })

    // 注册获取配置处理器
    context.ipc.handle('getConfig', async () => {
      try {
        const config = await context.config.getAll()
        return { success: true, data: config }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    // 注册复制文本处理器
    context.ipc.handle('copyText', async (event, text) => {
      try {
        context.api.clipboard.writeText(text)
        context.api.notification.show({
          title: '已复制',
          body: '识别结果已复制到剪贴板'
        })
        return { success: true }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    // 注册打开外部链接处理器
    context.ipc.handle('openExternalLink', async (event, url) => {
      try {
        const { shell } = require('electron')
        await shell.openExternal(url)
        return { success: true }
      } catch (error) {
        console.error('打开外部链接失败:', error)
        return { success: false, error: error.message }
      }
    })
  },

  /**
   * 插件停用
   */
  deactivate() {
    // 关闭所有窗口
    if (configWindow) {
      configWindow.close()
      configWindow = null
    }
    if (resultWindow) {
      resultWindow.close()
      resultWindow = null
    }

    pluginContext = null
    accessToken = null
    console.log('百度云OCR插件已停用')
  },

  /**
   * 执行插件
   */
  async execute(params) {
    console.log('=== 执行百度云OCR识别 ===')

    try {
      // 1. 检查配置
      const config = await pluginContext.config.getAll()

      if (!config.apiKey || !config.secretKey) {
        // 未配置，提示用户配置
        const choice = await pluginContext.api.dialog.showMessageBox({
          type: 'warning',
          title: '需要配置',
          message: '请先配置百度云API密钥',
          detail: '您需要先在百度云智能云平台获取API Key和Secret Key，才能使用OCR功能',
          buttons: ['立即配置', '取消']
        })

        if (choice === 0) {
          await openConfigWindow()
        }

        return { success: false, error: '未配置API密钥' }
      }

      // 2. 显示截图提示
      pluginContext.api.notification.show({
        title: 'OCR识别',
        body: '请选择要识别的区域...'
      })

      // 3. 调用截图API
      const dataURL = await pluginContext.api.screenshot.capture()

      if (!dataURL) {
        console.log('用户取消了截图')
        return { success: false, cancelled: true }
      }

      console.log('截图成功，准备进行OCR识别')

      // 4. 显示加载提示
      pluginContext.api.notification.show({
        title: 'OCR识别',
        body: '正在识别文字，请稍候...'
      })

      // 5. 调用百度云OCR API
      const ocrResult = await performOCR(dataURL, config)

      if (!ocrResult.success) {
        throw new Error(ocrResult.error)
      }

      // 6. 提取识别的文字
      const recognizedText = extractText(ocrResult.data)

      console.log('识别完成，共识别', ocrResult.data.words_result_num, '行文字')

      // 7. 自动复制到剪贴板（如果配置了）
      if (config.autoCopyResult && recognizedText) {
        pluginContext.api.clipboard.writeText(recognizedText)
      }

      // 8. 显示结果窗口
      await showResultWindow({
        originalImage: dataURL,
        ocrData: ocrResult.data,
        recognizedText: recognizedText,
        config: config
      })

      // 9. 显示成功通知
      pluginContext.api.notification.show({
        title: 'OCR识别完成',
        body: `成功识别 ${ocrResult.data.words_result_num} 行文字${config.autoCopyResult ? '，已复制到剪贴板' : ''}`
      })

      return { success: true, data: ocrResult.data }
    } catch (error) {
      console.error('OCR识别失败:', error)

      pluginContext.api.notification.show({
        title: 'OCR识别失败',
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
    // 如果窗口已存在，聚焦它
    if (configWindow && configWindow.isVisible()) {
      configWindow.focus()
      return
    }

    // 创建配置窗口
    configWindow = await pluginContext.api.window.create({
      title: '百度云OCR配置',
      width: 700,
      height: 600,
      minWidth: 600,
      minHeight: 500,
      center: true,
      resizable: true,
      html: 'ui/config.html',
      data: {
        config: await pluginContext.config.getAll()
      }
    })

    console.log('配置窗口已创建')
  } catch (error) {
    console.error('创建配置窗口失败:', error)
    pluginContext.api.notification.show({
      title: '错误',
      body: `无法打开配置窗口: ${error.message}`
    })
  }
}

/**
 * 显示结果窗口
 */
async function showResultWindow(data) {
  try {
    // 关闭旧的结果窗口
    if (resultWindow && resultWindow.isVisible()) {
      resultWindow.close()
    }

    // 创建结果窗口
    resultWindow = await pluginContext.api.window.create({
      title: 'OCR识别结果',
      width: 900,
      height: 700,
      minWidth: 700,
      minHeight: 500,
      center: true,
      resizable: true,
      html: 'ui/result.html',
      data: data
    })

    console.log('结果窗口已创建')
  } catch (error) {
    console.error('创建结果窗口失败:', error)
    pluginContext.api.notification.show({
      title: '错误',
      body: `无法打开结果窗口: ${error.message}`
    })
  }
}

/**
 * 获取百度云Access Token
 */
async function getAccessToken(apiKey, secretKey) {
  // 如果token还在有效期内，直接返回
  if (accessToken && Date.now() < tokenExpireTime) {
    return accessToken
  }

  return new Promise((resolve, reject) => {
    const params = querystring.stringify({
      grant_type: 'client_credentials',
      client_id: apiKey,
      client_secret: secretKey
    })

    const options = {
      hostname: 'aip.baidubce.com',
      path: `/oauth/2.0/token?${params}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const result = JSON.parse(data)

          if (result.access_token) {
            accessToken = result.access_token
            // token有效期为30天，提前1天过期
            tokenExpireTime = Date.now() + 29 * 24 * 60 * 60 * 1000
            console.log('获取Access Token成功')
            resolve(accessToken)
          } else {
            reject(new Error(result.error_description || '获取Access Token失败'))
          }
        } catch (error) {
          reject(new Error('解析Access Token响应失败: ' + error.message))
        }
      })
    })

    req.on('error', (error) => {
      reject(new Error('获取Access Token请求失败: ' + error.message))
    })

    req.end()
  })
}

/**
 * 执行OCR识别
 */
async function performOCR(dataURL, config) {
  try {
    // 1. 获取Access Token
    const token = await getAccessToken(config.apiKey, config.secretKey)

    // 2. 提取base64图片数据
    const base64Data = dataURL.replace(/^data:image\/\w+;base64,/, '')

    // 3. 构建请求参数
    const params = {
      image: base64Data,
      detect_direction: config.autoDetectDirection ? 'true' : 'false',
      probability: config.showProbability ? 'true' : 'false',
      paragraph: 'false',
      multidirectional_recognize: 'false'
    }

    const postData = querystring.stringify(params)

    // 4. 调用OCR API
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'aip.baidubce.com',
        path: `/rest/2.0/ocr/v1/accurate_basic?access_token=${token}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }

      const req = https.request(options, (res) => {
        let data = ''

        res.on('data', (chunk) => {
          data += chunk
        })

        res.on('end', () => {
          try {
            const result = JSON.parse(data)

            if (result.error_code) {
              reject(new Error(`OCR识别失败: ${result.error_msg} (错误代码: ${result.error_code})`))
            } else {
              console.log('OCR识别成功')
              resolve({ success: true, data: result })
            }
          } catch (error) {
            reject(new Error('解析OCR响应失败: ' + error.message))
          }
        })
      })

      req.on('error', (error) => {
        reject(new Error('OCR识别请求失败: ' + error.message))
      })

      req.write(postData)
      req.end()
    })
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 从OCR结果中提取文本
 */
function extractText(ocrData) {
  if (!ocrData || !ocrData.words_result || ocrData.words_result.length === 0) {
    return ''
  }

  return ocrData.words_result.map((item) => item.words).join('\n')
}
