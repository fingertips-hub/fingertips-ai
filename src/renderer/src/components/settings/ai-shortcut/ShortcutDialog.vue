<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    @click.self="handleCancel"
  >
    <div
      class="bg-white rounded-lg shadow-xl p-6 w-[600px] max-h-[90vh] flex flex-col animate-fade-in"
    >
      <!-- 标题 -->
      <h3 class="text-lg font-semibold text-gray-800 mb-4 flex-shrink-0">
        {{ mode === 'view' ? '查看快捷指令' : mode === 'edit' ? '编辑快捷指令' : '添加快捷指令' }}
      </h3>

      <!-- 表单 - 可滚动区域 -->
      <div class="flex-1 overflow-y-auto pr-2 space-y-4">
        <!-- 图标和名称（同一行） -->
        <div class="flex gap-4">
          <!-- 图标选择 -->
          <div class="flex-shrink-0">
            <label class="block text-sm font-medium text-gray-700 mb-2">图标</label>
            <button
              v-if="mode !== 'view'"
              class="w-16 h-16 flex items-center justify-center text-4xl bg-gray-50 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              @click="showEmojiPicker = true"
            >
              {{ formData.icon }}
            </button>
            <div
              v-else
              class="w-16 h-16 flex items-center justify-center text-4xl bg-gray-100 border-2 border-gray-200 rounded-lg"
            >
              {{ formData.icon }}
            </div>
          </div>

          <!-- 指令名称 -->
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-2">指令名称</label>
            <input
              ref="nameInputRef"
              v-model="formData.name"
              type="text"
              placeholder="输入指令名称"
              :readonly="mode === 'view'"
              :class="
                mode === 'view'
                  ? 'w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-default'
                  : 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              "
              maxlength="30"
            />
            <div v-if="mode !== 'view'" class="mt-1 text-xs text-gray-400">
              {{ formData.name.length }}/30 字符
            </div>
          </div>
        </div>

        <!-- 所属分类 -->
        <div v-if="mode === 'add'">
          <label class="block text-sm font-medium text-gray-700 mb-2">所属分类</label>
          <select
            v-model="formData.categoryId"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option v-for="category in availableCategories" :key="category.id" :value="category.id">
              {{ category.icon }} {{ category.name }}
            </option>
          </select>
          <p class="text-xs text-gray-500 mt-1">选择指令所属的分类</p>
        </div>

        <!-- 提示词 -->
        <div class="px-1">
          <label class="block text-sm font-medium text-gray-700 mb-2">提示词内容</label>
          <textarea
            v-model="formData.prompt"
            placeholder="输入 AI 提示词内容...&#10;&#10;例如：请帮我分析以下代码的性能问题，并给出优化建议。"
            :readonly="mode === 'view'"
            :class="
              mode === 'view'
                ? 'w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-default resize-none'
                : 'w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
            "
            rows="10"
            maxlength="2000"
          ></textarea>
          <div v-if="mode !== 'view'" class="mt-1 flex justify-between items-center">
            <p class="text-xs text-gray-500">支持多行文本，可以包含占位符和说明</p>
            <span class="text-xs text-gray-400">{{ formData.prompt.length }}/2000 字符</span>
          </div>
        </div>
      </div>

      <!-- 按钮组 -->
      <div class="flex justify-end gap-3 mt-6 flex-shrink-0 pt-4 border-t border-gray-200">
        <!-- 查看模式按钮 -->
        <template v-if="mode === 'view'">
          <button
            class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            @click="handleCancel"
          >
            关闭
          </button>
          <button
            class="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            @click="handleEdit"
          >
            编辑
          </button>
        </template>

        <!-- 编辑/添加模式按钮 -->
        <template v-else>
          <button
            class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            @click="handleCancel"
          >
            取消
          </button>
          <button
            class="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            :disabled="!isFormValid"
            @click="handleConfirm"
          >
            {{ mode === 'edit' ? '保存' : '添加' }}
          </button>
        </template>
      </div>
    </div>
  </div>

  <!-- Emoji 选择器（仅编辑模式显示） -->
  <EmojiPicker
    v-if="mode !== 'view'"
    v-model:visible="showEmojiPicker"
    :default-emoji="formData.icon"
    @select="handleEmojiSelect"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import EmojiPicker from './EmojiPicker.vue'
import type { AIShortcut, ShortcutCategory } from '../../../stores/aiShortcut'

interface Props {
  visible: boolean
  mode?: 'add' | 'edit' | 'view'
  shortcut?: AIShortcut | null
  categories: ShortcutCategory[]
  currentCategoryId?: string
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (
    e: 'confirm',
    data: {
      name: string
      icon: string
      prompt: string
      categoryId?: string
    }
  ): void
  (e: 'cancel'): void
  (e: 'edit'): void
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'add',
  shortcut: null,
  currentCategoryId: 'default'
})

const emit = defineEmits<Emits>()

const nameInputRef = ref<HTMLInputElement | null>(null)
const showEmojiPicker = ref(false)

// 表单数据
const formData = ref({
  name: '',
  icon: '⚡',
  prompt: '',
  categoryId: 'default'
})

// 可用的分类（排除"全部"分类）
const availableCategories = computed(() => {
  return props.categories.filter((c) => c.id !== 'all')
})

// 表单验证
const isFormValid = computed(() => {
  return formData.value.name.trim() !== '' && formData.value.prompt.trim() !== ''
})

// 监听 visible 变化，自动聚焦输入框并加载数据
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      if ((props.mode === 'edit' || props.mode === 'view') && props.shortcut) {
        // 编辑/查看模式，加载快捷指令数据
        formData.value = {
          name: props.shortcut.name,
          icon: props.shortcut.icon,
          prompt: props.shortcut.prompt,
          categoryId: props.shortcut.categoryId
        }
      } else {
        // 添加模式，重置表单
        // 如果当前分类是"全部"，使用默认分类
        const categoryId = props.currentCategoryId === 'all' ? 'default' : props.currentCategoryId
        formData.value = {
          name: '',
          icon: '⚡',
          prompt: '',
          categoryId: categoryId
        }
      }
      // 查看模式不需要聚焦输入框
      if (props.mode !== 'view') {
        nextTick(() => {
          nameInputRef.value?.focus()
        })
      }
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
  if (isFormValid.value) {
    emit('confirm', {
      name: formData.value.name.trim(),
      icon: formData.value.icon,
      prompt: formData.value.prompt.trim(),
      categoryId: props.mode === 'add' ? formData.value.categoryId : undefined
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

/**
 * 编辑（从查看模式切换到编辑模式）
 */
function handleEdit(): void {
  emit('edit')
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

/* 自定义滚动条 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
