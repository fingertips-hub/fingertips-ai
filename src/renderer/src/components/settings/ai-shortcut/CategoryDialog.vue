<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    @click.self="handleCancel"
  >
    <div class="bg-white rounded-lg shadow-xl p-6 w-[480px] animate-fade-in">
      <!-- 标题 -->
      <h3 class="text-lg font-semibold text-gray-800 mb-4">
        {{ mode === 'edit' ? '编辑分类' : '添加分类' }}
      </h3>

      <!-- 表单 -->
      <div class="space-y-4">
        <!-- 图标选择 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">分类图标</label>
          <button
            class="w-16 h-16 flex items-center justify-center text-4xl bg-gray-50 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            @click="showEmojiPicker = true"
          >
            {{ formData.icon }}
          </button>
          <p class="text-xs text-gray-500 mt-1">点击选择 Emoji 图标</p>
        </div>

        <!-- 分类名称 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">分类名称</label>
          <input
            ref="nameInputRef"
            v-model="formData.name"
            type="text"
            placeholder="输入分类名称"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxlength="20"
            @keyup.enter="handleConfirm"
            @keyup.esc="handleCancel"
          />
          <div class="mt-1 text-xs text-gray-400">{{ formData.name.length }}/20 字符</div>
        </div>
      </div>

      <!-- 按钮组 -->
      <div class="flex justify-end gap-3 mt-6">
        <button
          class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          @click="handleCancel"
        >
          取消
        </button>
        <button
          class="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          :disabled="!formData.name.trim()"
          @click="handleConfirm"
        >
          {{ mode === 'edit' ? '保存' : '添加' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Emoji 选择器 -->
  <EmojiPicker
    v-model:visible="showEmojiPicker"
    :default-emoji="formData.icon"
    @select="handleEmojiSelect"
  />
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import EmojiPicker from './EmojiPicker.vue'
import type { ShortcutCategory } from '../../../stores/aiShortcut'

interface Props {
  visible: boolean
  mode?: 'add' | 'edit'
  category?: ShortcutCategory | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'confirm', data: { name: string; icon: string }): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'add',
  category: null
})

const emit = defineEmits<Emits>()

const nameInputRef = ref<HTMLInputElement | null>(null)
const showEmojiPicker = ref(false)

// 表单数据
const formData = ref({
  name: '',
  icon: '📁'
})

// 监听 visible 变化，自动聚焦输入框并加载数据
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      if (props.mode === 'edit' && props.category) {
        // 编辑模式，加载分类数据
        formData.value = {
          name: props.category.name,
          icon: props.category.icon || '📁'
        }
      } else {
        // 添加模式，重置表单
        formData.value = {
          name: '',
          icon: '📁'
        }
      }
      nextTick(() => {
        nameInputRef.value?.focus()
        nameInputRef.value?.select()
      })
    }
  }
)

/**
 * 选择 Emoji
 */
function handleEmojiSelect(emoji: string): void {
  formData.value.icon = emoji
}

/**
 * 确认
 */
function handleConfirm(): void {
  if (formData.value.name.trim()) {
    emit('confirm', {
      name: formData.value.name.trim(),
      icon: formData.value.icon
    })
    emit('update:visible', false)
  }
}

/**
 * 取消
 */
function handleCancel(): void {
  emit('cancel')
  emit('update:visible', false)
}
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}
</style>
