<template>
  <div class="file-path-selector">
    <div class="input-group">
      <input
        type="text"
        :value="modelValue"
        :placeholder="placeholder"
        readonly
        class="path-input"
        :title="modelValue"
      />
      <button type="button" class="browse-button" :disabled="disabled" @click="handleBrowse">
        <Icon icon="mdi:folder-open" class="button-icon" />
        浏览
      </button>
    </div>
    <p v-if="hint" class="hint-text">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  hint?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  browse: []
}>()

/**
 * 处理浏览按钮点击
 */
function handleBrowse(): void {
  if (props.disabled) return
  emit('browse')
}
</script>

<style scoped>
.file-path-selector {
  width: 100%;
}

.input-group {
  display: flex;
  gap: 8px;
}

.path-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  color: #374151;
  cursor: default;
  transition: border-color 0.2s ease;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.path-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.browse-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.browse-button:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.browse-button:active:not(:disabled) {
  transform: translateY(0);
}

.browse-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}

.button-icon {
  font-size: 18px;
}

.hint-text {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}
</style>
