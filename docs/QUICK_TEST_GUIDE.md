# 🧪 图标提取功能快速测试指南

## 快速开始

### 1. 启动应用

```bash
npm run dev
```

### 2. 打开开发者工具

按 `Ctrl + Shift + I` 查看控制台日志

---

## 测试用例

### ✅ 基础测试

#### 测试 1: 普通 .exe 文件

**测试文件：**

- `C:\Program Files\Google\Chrome\Application\chrome.exe`
- `C:\Windows\System32\notepad.exe`
- `C:\Program Files\Microsoft VS Code\Code.exe`

**预期结果：**

- ✅ 图标正确显示
- ✅ 控制台显示 "Icon extracted successfully"
- ⏱️ 耗时 < 500ms

---

#### 测试 2: 桌面快捷方式

**测试文件：**

- 桌面上的任意 `.lnk` 文件

**预期结果：**

- ✅ 图标与桌面显示一致
- ✅ 控制台显示完整的提取过程
- ⏱️ 耗时 < 1500ms

---

### 🔥 进阶测试

#### 测试 3: 系统应用快捷方式

**测试位置：**

```
C:\ProgramData\Microsoft\Windows\Start Menu\Programs\
C:\Users\[用户名]\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\
```

**测试文件示例：**

- 计算器
- 设置
- Windows Terminal
- 记事本

**预期结果：**

- ✅ 系统图标正确显示
- ✅ 可能需要使用 PowerShell 方案
- ⏱️ 耗时 < 2000ms

---

#### 测试 4: 微软商店应用

**测试文件：**

- 豆包（如果您有这个应用）
- 微软 To Do
- Xbox
- 照片

**预期结果：**

- ✅ UWP 应用图标正确显示
- ✅ 控制台显示 "Enhanced PowerShell succeeded"
- ⏱️ 耗时 < 3000ms

---

#### 测试 5: 自定义图标快捷方式

**创建测试：**

1. 在桌面创建任意快捷方式
2. 右键 → 属性 → 更改图标
3. 选择 `C:\Windows\System32\shell32.dll` 中的任意图标
4. 确定

**预期结果：**

- ✅ 自定义图标正确显示
- ✅ 控制台显示 IconLocation 解析过程
- ⏱️ 耗时 < 2000ms

---

### 💪 压力测试

#### 测试 6: 批量添加

**操作：**
连续添加 10 个不同的应用

**预期结果：**

- ✅ 所有图标都正确显示
- ✅ 没有内存泄漏
- ✅ 临时文件被正确清理

**验证清理：**

```powershell
# 检查临时目录
Get-ChildItem $env:TEMP | Where-Object {$_.Name -like "icon_*"}
```

应该没有或只有极少数文件。

---

#### 测试 7: 边界情况

**测试文件：**

- 不存在的文件路径
- 损坏的快捷方式
- 没有图标的文件（如 `.txt`）

**预期结果：**

- ✅ 不会崩溃
- ✅ 显示友好的错误提示
- ✅ 控制台显示 "All extraction methods failed"

---

## 🔍 日志分析

### 成功的标志

在控制台中查找：

```
✓ Icon extracted successfully
✓ Enhanced PowerShell succeeded
✓ SHGetFileInfo succeeded
SUCCESS
```

### 失败的标志

```
✗ Failed to extract icon
✗ All extraction methods failed
ERROR: ...
FAILED: ...
```

### 性能分析

观察时间戳，计算提取耗时：

```
[时间1] Extracting icon from ...
[时间2] ✓ Icon extracted successfully

耗时 = 时间2 - 时间1
```

---

## 📊 测试报告模板

### 测试环境

- 操作系统：Windows 10/11
- Node.js 版本：
- Electron 版本：
- 测试日期：

### 测试结果

| 测试项 | 文件类型     | 成功/失败 | 使用策略        | 耗时(ms) | 备注          |
| ------ | ------------ | --------- | --------------- | -------- | ------------- |
| 1      | chrome.exe   | ✅        | Electron API    | 120      |               |
| 2      | 桌面快捷方式 | ✅        | Electron + 解析 | 350      |               |
| 3      | 系统应用     | ✅        | PowerShell      | 1200     |               |
| 4      | 微软商店     | ✅        | Enhanced PS     | 1800     |               |
| 5      | 自定义图标   | ✅        | IShellLink      | 950      |               |
| 6      | 批量 10 个   | ✅        | 混合            | 8000     | 平均 800ms/个 |
| 7      | 不存在文件   | ✅        | -               | -        | 正确处理错误  |

**总体成功率：** X / Y (Z%)

### 发现的问题

1. 问题描述
   - 复现步骤
   - 预期结果
   - 实际结果
   - 控制台日志

---

## 🐛 调试技巧

### 1. 启用详细日志

所有日志已内置，只需查看开发者工具控制台。

### 2. 手动测试 PowerShell

如果某个文件失败，手动运行：

```powershell
# 创建测试脚本 test.ps1
$filePath = "C:\path\to\your\file.lnk"

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Drawing;

public class Shell32 {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    public struct SHFILEINFO {
        public IntPtr hIcon;
        public int iIcon;
        public uint dwAttributes;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)]
        public string szDisplayName;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 80)]
        public string szTypeName;
    }

    [DllImport("shell32.dll", CharSet = CharSet.Auto)]
    public static extern IntPtr SHGetFileInfo(string pszPath, uint dwFileAttributes,
                                               ref SHFILEINFO psfi, uint cbFileInfo, uint uFlags);
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool DestroyIcon(IntPtr hIcon);

    public const uint SHGFI_ICON = 0x000000100;
    public const uint SHGFI_LARGEICON = 0x000000000;

    public static Icon GetFileIcon(string path, bool large) {
        SHFILEINFO shinfo = new SHFILEINFO();
        uint flags = SHGFI_ICON | SHGFI_LARGEICON;
        IntPtr result = SHGetFileInfo(path, 0, ref shinfo, (uint)Marshal.SizeOf(shinfo), flags);
        if (result == IntPtr.Zero) return null;
        try {
            return (Icon)Icon.FromHandle(shinfo.hIcon).Clone();
        } finally {
            DestroyIcon(shinfo.hIcon);
        }
    }
}
"@

try {
    Write-Host "Testing: $filePath"
    $icon = [Shell32]::GetFileIcon($filePath, $true)
    if ($icon -ne $null) {
        Write-Host "✓ SUCCESS"
        $bitmap = $icon.ToBitmap()
        $outputPath = "$env:TEMP\test-icon.png"
        $bitmap.Save($outputPath)
        Write-Host "Saved to: $outputPath"
        Start-Process $outputPath
    } else {
        Write-Host "✗ FAILED: No icon returned"
    }
} catch {
    Write-Host "✗ ERROR: $($_.Exception.Message)"
}
```

运行：

```powershell
powershell -ExecutionPolicy Bypass -File test.ps1
```

### 3. 检查文件属性

```powershell
# 检查文件是否存在
Test-Path "C:\path\to\file"

# 查看文件属性
Get-Item "C:\path\to\file" | Format-List *

# 对于 .lnk 文件
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut("C:\path\to\file.lnk")
$shortcut | Format-List *
```

### 4. 监控临时文件

在另一个 PowerShell 窗口中：

```powershell
# 实时监控临时目录
while ($true) {
    Clear-Host
    Write-Host "=== 临时图标文件 ===" -ForegroundColor Cyan
    Get-ChildItem $env:TEMP | Where-Object {$_.Name -like "icon_*"} |
        Format-Table Name, Length, LastWriteTime -AutoSize
    Start-Sleep -Seconds 1
}
```

---

## ✅ 验收标准

### 必须通过

- [ ] 所有基础测试用例通过
- [ ] 至少 95% 的进阶测试用例通过
- [ ] 没有应用崩溃
- [ ] 没有内存泄漏
- [ ] 临时文件正确清理

### 性能要求

- [ ] 普通 .exe 文件：< 500ms
- [ ] 简单快捷方式：< 1000ms
- [ ] 复杂快捷方式：< 2000ms
- [ ] UWP 应用：< 3000ms

### 稳定性要求

- [ ] 连续添加 20 个文件无错误
- [ ] 错误情况正确处理
- [ ] 用户体验友好（有加载提示）

---

## 📝 反馈模板

如果测试发现问题，请提供：

```
### 问题描述
[简述问题]

### 测试文件
路径：[文件完整路径]
类型：[.exe / .lnk]

### 复现步骤
1.
2.
3.

### 实际结果
[描述实际发生了什么]

### 预期结果
[描述应该发生什么]

### 控制台日志
```

[粘贴完整的相关日志]

```

### 环境信息
- OS:
- Node.js:
- Electron:

### 额外信息
[任何其他有用的信息]
```

---

## 🎯 快速检查清单

开始测试前：

- [ ] 确保已运行 `npm run build`
- [ ] 确保 PowerShell 执行策略允许脚本运行
- [ ] 打开开发者工具控制台

测试中：

- [ ] 观察控制台日志
- [ ] 注意图标加载时间
- [ ] 验证图标显示正确

测试后：

- [ ] 检查临时文件是否清理
- [ ] 记录测试结果
- [ ] 报告任何问题

---

**祝测试顺利！** 🚀

如有任何问题，请查看 `ULTIMATE_ICON_EXTRACTION_SOLUTION.md` 获取详细的技术文档。
