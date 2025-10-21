# 截图查看器测试指南

## 🧪 测试准备

1. 确保 `resources/tools/ScreenCapture.exe` 文件存在
2. 启动应用的开发模式
3. 打开浏览器开发者工具（查看控制台日志）

## ✅ 测试步骤

### 测试 1：基本功能测试

**步骤：**

1. 在插件管理界面找到"截图查看器"
2. 点击"执行"按钮
3. 在截图工具中选择区域
4. 完成截图

**预期结果：**

- ✅ 截图工具正常启动
- ✅ 选择区域后工具关闭
- ✅ 自动打开查看器窗口
- ✅ 窗口中显示截图
- ✅ 显示通知"截图已在新窗口中打开"

**控制台日志（参考）：**

```
截图查看器插件已激活
开始截图...
截图成功，准备显示...
查看器窗口已创建: screenshot-viewer-window-1
截图查看器页面已加载
收到截图数据响应: { success: true, dataURL: "data:image/png;base64,..." }
```

### 测试 2：取消截图测试

**步骤：**

1. 点击"执行"按钮
2. 在截图工具中按 ESC 或关闭工具
3. 不完成截图

**预期结果：**

- ✅ 截图工具关闭
- ✅ 不打开查看器窗口
- ✅ 不显示任何通知
- ✅ 静默退出

**控制台日志（参考）：**

```
开始截图...
用户取消了截图
```

### 测试 3：查看器功能测试

**步骤：**

1. 完成一次截图
2. 在查看器窗口中进行以下操作：
   - 点击图片（放大）
   - 再次点击（缩小）
   - 点击"复制"按钮
   - 点击"保存"按钮

**预期结果：**

- ✅ 图片可以放大/缩小
- ✅ 复制成功，显示提示"已复制到剪贴板"
- ✅ 保存成功，文件自动下载
- ✅ 底部显示图片信息（尺寸和大小）

### 测试 4：多窗口测试

**步骤：**

1. 执行插件，完成第一次截图
2. 不关闭第一个窗口
3. 再次执行插件，完成第二次截图

**预期结果：**

- ✅ 两个窗口都正常显示
- ✅ 每个窗口显示各自的截图
- ✅ 窗口可以独立关闭

### 测试 5：错误处理测试

**步骤：**

1. 重命名或删除 `ScreenCapture.exe`
2. 执行插件

**预期结果：**

- ✅ 显示错误通知
- ✅ 控制台有错误日志
- ✅ 不崩溃

## 🐛 常见问题排查

### 问题 1：窗口打开但没有显示截图

**检查清单：**

- [ ] 打开浏览器开发者工具查看控制台
- [ ] 检查是否有错误日志
- [ ] 确认控制台是否输出"收到截图数据响应"
- [ ] 检查响应数据中是否有 dataURL

**可能原因：**

1. IPC 通信失败
2. 截图数据为空
3. 图片加载失败

**调试方法：**

```javascript
// 在 viewer.html 的控制台执行：
console.log('window.electron:', window.electron)
console.log('currentDataURL length:', currentDataURL?.length)
```

### 问题 2：截图工具没有启动

**检查清单：**

- [ ] 确认 `resources/tools/ScreenCapture.exe` 存在
- [ ] 检查文件权限
- [ ] 查看控制台错误日志

**调试方法：**

- 手动运行 `ScreenCapture.exe` 测试是否正常

### 问题 3：控制台报错 "Electron API 不可用"

**可能原因：**

- preload 脚本未正确加载
- 窗口配置错误

**解决方法：**

- 检查 electron-builder.yml 配置
- 确认 preload 脚本路径正确

## 📊 性能检查

### 加载时间

正常情况下：

- 截图工具启动：< 1s
- 窗口创建：< 500ms
- 数据加载：< 100ms
- 图片显示：< 200ms

**总耗时应该在 2 秒以内**

### 内存使用

- 单个窗口：约 50-100MB
- 多个窗口：线性增长

## ✅ 验收标准

所有以下条件都满足才算通过：

- [x] 基本截图功能正常
- [x] 取消操作正确处理
- [x] 查看器界面美观
- [x] 所有按钮功能正常
- [x] 错误处理完善
- [x] 无控制台错误（除了预期的错误）
- [x] 性能满足要求
- [x] 多窗口支持正常

## 🔍 调试技巧

### 1. 查看 IPC 通信

在主进程（index.js）中添加日志：

```javascript
ipc.handle('request-screenshot', async () => {
  console.log('收到截图请求，当前数据:', module.exports.pendingScreenshot?.length)
  const dataURL = module.exports.pendingScreenshot
  module.exports.pendingScreenshot = null
  console.log('返回数据长度:', dataURL?.length)
  return { success: true, dataURL }
})
```

### 2. 查看窗口加载

在 viewer.html 中添加更多日志：

```javascript
console.log('开始请求截图数据')
const response = await window.electron.ipcRenderer.invoke(...)
console.log('响应数据:', response)
console.log('dataURL 长度:', response.dataURL?.length)
```

### 3. 检查图片数据

```javascript
// 在控制台执行
console.log(currentDataURL.substring(0, 100)) // 查看前 100 个字符
console.log('总长度:', currentDataURL.length)
```

## 📝 测试报告模板

```
测试日期：____/____/____
测试人员：__________
应用版本：__________

测试 1 - 基本功能：     [ ] 通过  [ ] 失败
测试 2 - 取消截图：     [ ] 通过  [ ] 失败
测试 3 - 查看器功能：   [ ] 通过  [ ] 失败
测试 4 - 多窗口：       [ ] 通过  [ ] 失败
测试 5 - 错误处理：     [ ] 通过  [ ] 失败

总体评价：____________
备注：________________
```
