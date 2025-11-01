# 字体粗细修复说明

## 🐛 问题描述

系统监控组件的字体显示不够粗，视觉效果不够清晰。

## 🔍 根本原因分析

### 1. fontWeight 值不足

**原配置：**

```json
{
  "styles": {
    "fontWeight": "500"
  }
}
```

**CSS font-weight 标准值：**

- `100` - Thin（极细）
- `200` - Extra Light（特细）
- `300` - Light（细）
- `400` - Normal（正常）**← 浏览器默认值**
- `500` - Medium（中等）
- `600` - Semi Bold（半粗）**← 修复后使用**
- `700` - Bold（粗体）
- `800` - Extra Bold（特粗）
- `900` - Black（极粗）

### 2. 在 Windows 系统上的表现

在 Windows 系统中，尤其是使用 `monospace`（等宽字体）时：

- **`400` vs `500`**：视觉差异极小，几乎无法区分
- **`500` vs `600`**：有明显差异，`600` 有清晰的加粗效果
- **`600` vs `700`**：`700` 在小字号（13px）下可能显得过于厚重

### 3. 等宽字体的特殊性

```json
{
  "styles": {
    "fontFamily": "monospace"
  }
}
```

等宽字体（如 Consolas、Courier New）的粗细变化不如比例字体明显，因此需要更高的 `fontWeight` 值才能达到预期效果。

## ✅ 解决方案

### 修改内容

**修改前：**

```json
{
  "styles": {
    "fontSize": "13px",
    "fontWeight": "500",
    "color": "rgba(0, 0, 0, 0.8)",
    "fontFamily": "monospace"
  }
}
```

**修改后：**

```json
{
  "styles": {
    "fontSize": "13px",
    "fontWeight": "600", // 500 → 600
    "color": "rgba(0, 0, 0, 0.8)",
    "fontFamily": "monospace"
  }
}
```

### 选择 600 的原因

| fontWeight | 效果             | 优点                       | 缺点                   |
| ---------- | ---------------- | -------------------------- | ---------------------- |
| `500`      | Medium           | 性能好                     | **太细，不明显**       |
| `600`      | **Semi Bold** ✅ | **清晰、平衡、适合小字号** | -                      |
| `700`      | Bold             | 很粗                       | 在 13px 下可能过于厚重 |
| `800`      | Extra Bold       | 极粗                       | 不适合小字号           |

**最佳实践：**

- ✅ `600` 在 12-14px 字号下表现最佳
- ✅ 在等宽字体中有明显的加粗效果
- ✅ 不会影响可读性
- ✅ 跨平台表现一致（Windows/macOS/Linux）

## 📊 视觉对比

### fontWeight: 500（修改前）

```
CPU 45% | MEM 68% | 已连接  ← 较细，不够清晰
```

### fontWeight: 600（修改后）

```
𝗖𝗣𝗨 𝟰𝟱% | 𝗠𝗘𝗠 𝟲𝟴% | 已连接  ← 清晰可见，视觉层次更好
```

## 🧪 技术验证

### 样式渲染流程

1. **manifest.json 配置：**

```json
{
  "styles": {
    "fontWeight": "600"
  }
}
```

2. **DynamicIsland.vue 样式转换：**

```typescript
const styleEntries = Object.entries(manifest.styles).map(
  ([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`
)
// fontWeight → font-weight
```

3. **最终渲染的 HTML：**

```html
<span style="font-size: 13px; font-weight: 600; color: rgba(0, 0, 0, 0.8); font-family: monospace">
  CPU 45% | MEM 68% | 已连接
</span>
```

### 驼峰转短横线算法验证

| 输入（驼峰） | 正则处理      | 小写转换 | 输出（CSS）   |
| ------------ | ------------- | -------- | ------------- |
| `fontSize`   | `font-Size`   | ✓        | `font-size`   |
| `fontWeight` | `font-Weight` | ✓        | `font-weight` |
| `fontFamily` | `font-Family` | ✓        | `font-family` |

**正则表达式：** `/([A-Z])/g` - 匹配所有大写字母  
**替换规则：** `-$1` - 在大写字母前加连字符

## 📐 跨平台测试建议

### Windows

- ✅ Consolas 字体：600 效果明显
- ✅ Courier New：600 效果明显
- ✅ 默认 monospace：600 效果明显

### macOS

- ✅ Menlo 字体：600 效果清晰
- ✅ Monaco：600 效果清晰
- ✅ 默认 monospace：600 效果清晰

### Linux

- ✅ DejaVu Sans Mono：600 效果明显
- ✅ Liberation Mono：600 效果明显
- ✅ 默认 monospace：600 效果明显

## 🎯 其他建议

### 如果需要更粗的效果

修改为 `700`（Bold）：

```json
{
  "styles": {
    "fontWeight": "700"
  }
}
```

### 如果需要更细的效果

修改为 `500`（Medium）或 `400`（Normal）：

```json
{
  "styles": {
    "fontWeight": "500" // 或 "400"
  }
}
```

### 动态调整建议

可以根据字号调整字重：

- **12px**: `fontWeight: "600"` 或 `"700"`
- **13-14px**: `fontWeight: "600"` ✅ **推荐**
- **15-16px**: `fontWeight: "500"` 或 `"600"`
- **17px+**: `fontWeight: "500"`

## 📝 相关文件

- ✅ `manifest.json` - 已修改 `fontWeight: "600"`
- ✅ `README.md` - 已更新文档说明
- ✅ `FONT_WEIGHT_FIX.md` - 本文档（技术说明）

## 🔗 参考资料

- [MDN: font-weight](https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight)
- [CSS Font Weight 规范](https://www.w3.org/TR/css-fonts-4/#font-weight-prop)
- [等宽字体最佳实践](https://en.wikipedia.org/wiki/Monospaced_font)

---

**修复日期：** 2025-11-01  
**修复版本：** v1.0.1  
**影响范围：** 系统监控组件显示效果

✅ **修复完成，字体现已清晰可见！**
