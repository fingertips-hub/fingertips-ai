# Dialog 遮罩层点击修复

## 问题描述

在修复前，项目中的多个 dialog 组件都有一个问题：点击半透明遮罩层会关闭 dialog。这在某些场景下会导致用户误操作，特别是当用户在填写表单或查看重要信息时。

## 修复的组件

以下组件已被修复，添加了 `closeOnMask` 属性来控制是否允许点击遮罩关闭：

1. ✅ `src/renderer/src/components/common/ConfirmDialog.vue`
2. ✅ `src/renderer/src/components/common/InputDialog.vue`
3. ✅ `src/renderer/src/components/settings/ai-shortcut/ShortcutDialog.vue`
4. ✅ `src/renderer/src/components/settings/ai-shortcut/CategoryDialog.vue`

注：`AddItemModal.vue` 已经正确实现了这个功能，不需要修改。

## 实现方案

### 1. 添加 `closeOnMask` 属性

在每个 dialog 组件的 Props 中添加了可选属性：

```typescript
interface Props {
  // ... 其他属性
  closeOnMask?: boolean // 点击遮罩是否关闭
}
```

### 2. 设置默认值为 `false`

```typescript
const props = withDefaults(defineProps<Props>(), {
  // ... 其他默认值
  closeOnMask: false // 默认点击遮罩不关闭
})
```

### 3. 修改遮罩点击事件

将遮罩层的 `@click.self="handleCancel"` 修改为 `@click.self="handleMaskClick"`：

```vue
<div
  v-if="visible"
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
  @click.self="handleMaskClick"
></div>
```

### 4. 实现 `handleMaskClick` 函数

```typescript
/**
 * 点击遮罩
 */
function handleMaskClick(): void {
  if (props.closeOnMask) {
    handleCancel()
  }
}
```

## 使用方式

### 默认行为（不关闭）

```vue
<ConfirmDialog v-model:visible="showDialog" message="确定要删除吗？" />
<!-- 点击遮罩不会关闭 -->
```

### 允许点击遮罩关闭

如果需要点击遮罩关闭 dialog，可以显式设置：

```vue
<ConfirmDialog v-model:visible="showDialog" message="提示信息" :close-on-mask="true" />
<!-- 点击遮罩会关闭 -->
```

## 设计原则

### 为什么默认为 `false`？

1. **防止误操作**：用户可能在填写表单或查看重要信息时不小心点到遮罩
2. **更好的用户体验**：用户必须明确点击"取消"或"关闭"按钮
3. **符合主流设计**：大多数现代应用的 modal/dialog 都不会在点击遮罩时关闭
4. **数据保护**：避免用户填写的内容因误操作而丢失

### 灵活性

通过 `closeOnMask` 属性，开发者仍然可以根据具体场景选择是否允许点击遮罩关闭：

- **表单 dialog**: 默认不关闭 ✅
- **确认 dialog**: 可以选择允许关闭 ⚙️
- **信息提示**: 可以选择允许关闭 ⚙️
- **复杂编辑**: 默认不关闭 ✅

## 关闭 Dialog 的方式

修复后，用户可以通过以下方式关闭 dialog：

1. ✅ 点击右上角的关闭按钮（×）
2. ✅ 点击"取消"按钮
3. ✅ 按 ESC 键（如果组件支持）
4. ⚙️ 点击遮罩层（仅当 `closeOnMask=true` 时）

## 测试建议

### 1. 默认行为测试

- [ ] 打开 dialog，点击遮罩，验证 dialog 不关闭
- [ ] 点击"取消"按钮，验证 dialog 关闭
- [ ] 按 ESC 键，验证 dialog 关闭（如支持）

### 2. closeOnMask=true 测试

- [ ] 设置 `closeOnMask=true`
- [ ] 点击遮罩，验证 dialog 关闭

### 3. 用户体验测试

- [ ] 填写表单时误点遮罩，验证内容不丢失
- [ ] 确认所有按钮都能正常关闭 dialog

## 兼容性

✅ **向后兼容**：默认行为改变，但提供了 `closeOnMask` 属性来恢复旧行为（如果需要）

## 相关组件

### 已修复

- `ConfirmDialog.vue` - 确认对话框
- `InputDialog.vue` - 输入对话框
- `ShortcutDialog.vue` - 快捷指令编辑对话框
- `CategoryDialog.vue` - 分类编辑对话框

### 已正确实现

- `AddItemModal.vue` - 添加项目模态框（已有 `closeOnMask` 属性）

## 总结

这次修复提高了应用的用户体验，防止了因误点遮罩而导致的数据丢失和操作中断。同时保持了灵活性，开发者可以根据具体需求选择是否允许点击遮罩关闭 dialog。
