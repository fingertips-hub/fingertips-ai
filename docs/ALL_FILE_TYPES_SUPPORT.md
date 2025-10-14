# 支持所有文件类型功能说明

## 📋 功能概述

现在应用启动器不仅支持添加应用程序(.exe)和快捷方式(.lnk),还支持**所有文件类型**。

你可以添加任何文件,点击后会使用系统默认程序打开。

## ✨ 支持的文件类型

### 应用程序

- `.exe` - Windows 可执行文件
- `.lnk` - Windows 快捷方式

### 文档

- `.pdf` - PDF 文档
- `.doc`, `.docx` - Word 文档
- `.xls`, `.xlsx` - Excel 表格
- `.ppt`, `.pptx` - PowerPoint 演示文稿
- `.txt` - 文本文件
- `.md` - Markdown 文件

### 图片

- `.jpg`, `.jpeg` - JPEG 图片
- `.png` - PNG 图片
- `.gif` - GIF 动图
- `.bmp` - 位图
- `.svg` - 矢量图
- `.webp` - WebP 图片

### 视频

- `.mp4` - MP4 视频
- `.avi` - AVI 视频
- `.mkv` - MKV 视频
- `.mov` - QuickTime 视频
- `.wmv` - Windows Media 视频
- `.flv` - Flash 视频

### 音频

- `.mp3` - MP3 音频
- `.wav` - WAV 音频
- `.flac` - FLAC 无损音频
- `.aac` - AAC 音频
- `.m4a` - M4A 音频
- `.ogg` - OGG 音频

### 压缩文件

- `.zip` - ZIP 压缩包
- `.rar` - RAR 压缩包
- `.7z` - 7-Zip 压缩包
- `.tar`, `.gz` - Tar 压缩包

### 代码文件

- `.js`, `.ts` - JavaScript/TypeScript
- `.py` - Python
- `.java` - Java
- `.cpp`, `.c`, `.h` - C/C++
- `.html`, `.css` - Web 文件
- `.json`, `.xml` - 数据文件

### 其他

- **任何文件类型** - 只要系统有默认程序可以打开

## 🎯 使用场景

### 1. 快速访问常用文档

添加经常需要查看的文档,一键打开:

- 工作日报.docx
- 项目计划.xlsx
- 会议记录.pdf

### 2. 快速打开项目文件

添加项目相关文件:

- README.md
- package.json
- 配置文件

### 3. 快速访问媒体文件

添加常听的音乐或常看的视频:

- 喜欢的歌曲.mp3
- 教程视频.mp4

### 4. 快速打开网页

添加 .html 文件,快速在浏览器中打开

### 5. 快速解压文件

添加压缩包,点击后用解压软件打开

## 📖 使用方法

### 方法 1: 文件选择器

1. 打开 Super Panel
2. 点击空白项的加号
3. 选择"文件"
4. 点击"点击选择文件"按钮
5. 在文件选择对话框中选择任意文件
6. 编辑显示名称(可选)
7. 点击"确认添加"

**文件过滤器**:

- 所有文件 (\*)
- 应用程序 (.exe, .lnk)
- 文档 (.pdf, .doc, .docx, .txt, .md)
- 图片 (.jpg, .png, .gif, .bmp, .svg)
- 视频 (.mp4, .avi, .mkv, .mov, .wmv)
- 音频 (.mp3, .wav, .flac, .aac, .m4a)

### 方法 2: 拖拽添加

1. 打开 Super Panel
2. 点击空白项的加号
3. 选择"文件"
4. 从文件资源管理器拖拽任意文件到拖拽区域
5. 编辑显示名称(可选)
6. 点击"确认添加"

**提示**: 支持所有文件类型,无限制!

## 🔧 技术实现

### 1. 文件选择

使用 Electron 的 `dialog.showOpenDialog()` API:

```typescript
const result = await dialog.showOpenDialog(superPanelWin!, {
  properties: ['openFile'],
  filters: [
    { name: '所有文件', extensions: ['*'] },
    { name: '应用程序', extensions: ['exe', 'lnk'] },
    { name: '文档', extensions: ['pdf', 'doc', 'docx', 'txt', 'md'] }
    // ... 更多过滤器
  ],
  title: '选择文件'
})
```

### 2. 图标提取

使用 Electron 的 `app.getFileIcon()` API:

```typescript
const iconImage = await app.getFileIcon(filePath, { size: 'large' })
const base64 = iconImage.toDataURL()
```

**特性**:

- 自动提取文件关联的图标
- 支持所有文件类型
- 对于 .lnk 文件,提取目标程序的图标

### 3. 文件打开

使用 Electron 的 `shell.openPath()` API:

```typescript
const result = await shell.openPath(filePath)
// 返回空字符串表示成功
// 返回错误信息表示失败
```

**特性**:

- 使用系统默认程序打开文件
- 支持所有文件类型
- 跨平台兼容

## 🎨 UI 更新

### 标题变更

- **修改前**: "添加应用程序"
- **修改后**: "添加文件"

### 按钮文本

- **修改前**: "点击选择应用程序"
- **修改后**: "点击选择文件"

### 拖拽提示

- **修改前**: "拖拽应用程序或快捷方式到此处"
- **修改后**: "拖拽任意文件到此处"

### 支持说明

- **修改前**: "支持 .exe 和 .lnk 文件"
- **修改后**: "支持所有文件类型"

### Toast 提示

- **修改前**: "正在启动 XXX"
- **修改后**: "正在打开 XXX"

## 📝 修改的文件

### 主进程

1. **src/main/index.ts**
   - 更新文件选择对话框过滤器
   - 改进文件打开逻辑和日志

2. **src/main/utils/iconExtractor.ts**
   - 更新日志信息,支持所有文件类型

### 渲染进程

3. **src/renderer/src/components/super-panel/AddFileView.vue**
   - 移除文件类型限制
   - 更新 UI 文本

4. **src/renderer/src/components/super-panel/SuperPanelItem.vue**
   - 更新 Toast 提示文本
   - 更新注释

## 🔍 示例用例

### 用例 1: 添加常用文档

```
文件: D:\Documents\工作日报.docx
名称: 工作日报
图标: Word 图标
点击: 用 Microsoft Word 打开
```

### 用例 2: 添加项目文件

```
文件: D:\Projects\my-app\README.md
名称: 项目说明
图标: Markdown 图标
点击: 用默认 Markdown 编辑器打开
```

### 用例 3: 添加音乐文件

```
文件: D:\Music\favorite.mp3
名称: 我喜欢的歌
图标: 音乐文件图标
点击: 用默认音乐播放器打开
```

### 用例 4: 添加压缩包

```
文件: D:\Downloads\project.zip
名称: 项目压缩包
图标: ZIP 图标
点击: 用 WinRAR/7-Zip 打开
```

## ⚠️ 注意事项

### 1. 文件必须存在

- 如果文件被移动或删除,点击时会打开失败
- 建议添加不会频繁移动的文件

### 2. 需要默认程序

- 文件类型必须有关联的默认程序
- 如果没有默认程序,会提示打开失败

### 3. 图标提取

- 某些文件类型可能无法提取图标
- 会显示通用文件图标

### 4. 文件路径

- 仅支持本地文件
- 不支持网络路径(UNC 路径可能有问题)

## 🚀 未来优化

1. **文件监控**: 检测文件是否被移动/删除
2. **相对路径**: 支持相对路径,便于项目迁移
3. **文件夹支持**: 支持添加文件夹,点击打开文件夹
4. **URL 支持**: 支持添加网址,点击在浏览器打开
5. **自定义图标**: 允许用户自定义文件图标

## 📚 相关文档

- [Electron shell.openPath](https://www.electronjs.org/docs/latest/api/shell#shellopenpath)
- [Electron app.getFileIcon](https://www.electronjs.org/docs/latest/api/app#appgetfileiconpath-options)
- [Electron dialog.showOpenDialog](https://www.electronjs.org/docs/latest/api/dialog#dialogshowopendialogbrowserwindow-options)

---

**现在你可以添加任何文件到应用启动器,快速访问你的常用文件!** 🎉
