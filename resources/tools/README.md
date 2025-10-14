# 图标提取工具目录

这个目录包含用于增强图标提取功能的外部工具。

## 📦 工具列表

### IconsExtract (iconsext.exe) - NirSoft

**状态**: ✅ 已集成

#### 下载链接

- 官方网站: https://www.nirsoft.net/utils/iconsext.html
- 直接下载: https://www.nirsoft.net/utils/iconsext.zip

#### 功能特点

- ✅ 从 `.exe` 和 `.dll` 文件中提取图标
- ✅ 支持批量提取
- ✅ 提取多种尺寸的图标
- ❌ 不适用于 `.ico` 文件（会自动跳过）
- ❌ 不适用于 `.lnk` 文件（会自动跳过）

#### 使用方法

1. 下载并解压 `iconsext.zip`
2. 将 `iconsext.exe` 复制到当前目录
3. 重启应用

## 📊 提取流程

当图标质量不足时（质量分数 < 200），系统会按以下顺序尝试：

1. **IconsExtract 工具提取**: 从 .exe 和 .dll 文件提取高质量图标
2. **PowerShell Enhanced**: Windows Shell API 提取
3. **PowerShell Simple**: .NET API 提取
4. **选择最佳**: 比较所有结果，选择质量最高的

## 🎯 文件类型支持

| 文件类型 | Electron API | IconsExtract | PowerShell |
| -------- | ------------ | ------------ | ---------- |
| `.exe`   | ✅           | ✅           | ✅         |
| `.dll`   | ✅           | ✅           | ✅         |
| `.ico`   | ✅           | ❌ 跳过      | ✅         |
| `.lnk`   | ✅           | ❌ 跳过      | ✅         |

**注意**: 对于 `.ico` 和 `.lnk` 文件，IconsExtract 会自动跳过，直接使用 Electron API 或 PowerShell，避免不必要的处理。

## 🐛 故障排除

### IconsExtract 无法提取图标

**可能原因**:

1. ❌ 工具未安装到正确位置
2. ❌ 文件是 `.ico` 或 `.lnk` 格式（会被自动跳过）
3. ❌ 文件没有嵌入的图标资源

**检查日志**:

```
✓ IconsExtract found                          ← 工具正常
ℹ Skipping IconsExtract for .ico file        ← 跳过 .ico 文件（正常）
```

### 工具未找到

**症状**: 日志显示 `✗ IconsExtract not found`

**解决方案**:

1. 确认文件名正确：`iconsext.exe`
2. 确认路径正确：在 `resources\tools\` 目录下
3. 查看日志中的完整路径
4. 重新下载并放置文件

### IconsExtract 提取失败

不用担心！系统会自动使用 PowerShell 后备方案。

## 📝 日志示例

### 正常提取（IconsExtract 成功）

```
=== IconsExtract Extraction Start ===
  → Target file: D:\Program Files\App\App.exe
  ✓ IconsExtract found
  → Executing IconsExtract command...
  → Files in temp directory: [ 'App_102.ico' ]
  → Icon file size: 113910 bytes
  ✓ IconsExtract extraction succeeded
  ✓ Using best icon from IconsExtract (quality: 1000)
```

### 跳过不支持的文件（正常行为）

```
=== IconsExtract Extraction Start ===
  → Target file: D:\Icons\app.ico
  ℹ Skipping IconsExtract for .ico file (standalone icon file)
```

### 使用备用方案

```
=== IconsExtract Extraction Start ===
  ℹ Skipping IconsExtract for .ico file
  → Trying enhanced PowerShell...
  ✓ Enhanced PowerShell succeeded (quality: 520.8)
```

## 🎉 总结

- ✅ **高质量提取**: IconsExtract 专门针对 PE 文件优化
- ✅ **智能过滤**: 自动跳过不支持的文件类型
- ✅ **强大后备**: PowerShell 确保最大成功率
- ✅ **质量优先**: 始终选择质量最好的图标
- ✅ **详细日志**: 完整的提取过程追踪

---

**最后更新**: 2025-10-12  
**版本**: v6.1 (移除 ResourceHacker，简化为单工具配置)
