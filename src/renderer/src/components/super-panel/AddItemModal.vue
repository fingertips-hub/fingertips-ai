<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center"
        @click.self="handleMaskClick"
      >
        <!-- 半透明遮罩 -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-lg"></div>

        <!-- Modal 内容 -->
        <div
          class="relative bg-white rounded-xl shadow-2xl w-[400px] max-h-[600px] flex flex-col overflow-hidden"
        >
          <!-- 关闭按钮 -->
          <button
            class="absolute top-3 right-3 z-10 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            @click="handleClose"
          >
            <Icon icon="mdi:close" class="text-xl text-gray-600" />
          </button>

          <!-- 内容区域 - 设置为 flex-1 并允许内部滚动 -->
          <div class="p-6 flex-1 min-h-0">
            <slot></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

interface Props {
  visible: boolean
  closeOnMask?: boolean // 点击遮罩是否关闭
}

const props = withDefaults(defineProps<Props>(), {
  closeOnMask: false // 默认点击遮罩不关闭
})

const emit = defineEmits<{
  close: []
  'update:visible': [value: boolean]
}>()

function handleClose(): void {
  emit('update:visible', false)
  emit('close')
}

function handleMaskClick(): void {
  if (props.closeOnMask) {
    handleClose()
  }
}
</script>

<style scoped>
/* Modal 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative {
  transform: scale(0.9) translateY(-20px);
}

.modal-leave-to .relative {
  transform: scale(0.9) translateY(-20px);
}
</style>
