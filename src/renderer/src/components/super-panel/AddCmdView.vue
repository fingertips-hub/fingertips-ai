<template>
  <div class="flex flex-col h-full">
    <!-- 顶部返回按钮 -->
    <div class="flex items-center gap-2 mb-4 flex-shrink-0">
      <button class="p-2 rounded-lg hover:bg-gray-100 transition-colors" @click="emit('back')">
        <Icon icon="mdi:arrow-left" class="text-xl text-gray-600" />
      </button>
      <h2 class="text-lg font-semibold text-gray-800">添加CMD命令</h2>
    </div>

    <!-- 主体区域 - 支持滚动 -->
    <div class="flex-1 min-h-0 max-h-[410px] overflow-y-auto pr-2">
      <div class="space-y-4">
        <!-- 显示名称输入 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">显示名称</label>
          <div class="relative p-1">
            <input
              v-model="displayName"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="输入命令显示名称"
              maxlength="20"
            />
          </div>
          <div class="mt-1 text-xs text-gray-400">{{ displayName.length }}/20 字符</div>
        </div>

        <!-- Shell类型选择 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Shell 类型</label>
          <div class="relative p-1">
            <!-- 自定义下拉选择器 -->
            <div class="relative">
              <button
                type="button"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                @click="dropdownOpen = !dropdownOpen"
                @blur="handleDropdownBlur"
              >
                <span class="flex items-center gap-2">
                  <Icon
                    :icon="shellType === 'cmd' ? 'mdi:console' : 'mdi:powershell'"
                    class="text-lg"
                    :class="shellType === 'cmd' ? 'text-blue-500' : 'text-blue-600'"
                  />
                  <span class="text-gray-700">
                    {{ shellType === 'cmd' ? 'CMD (命令提示符)' : 'PowerShell' }}
                  </span>
                </span>
                <Icon
                  icon="mdi:chevron-down"
                  class="text-gray-400 transition-transform"
                  :class="{ 'rotate-180': dropdownOpen }"
                />
              </button>

              <!-- 下拉菜单 -->
              <Transition name="dropdown">
                <div
                  v-if="dropdownOpen"
                  class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
                >
                  <button
                    type="button"
                    class="w-full px-3 py-2.5 text-left flex items-center gap-2 hover:bg-blue-50 transition-colors"
                    :class="{ 'bg-blue-50': shellType === 'cmd' }"
                    @mousedown.prevent="selectShellType('cmd')"
                  >
                    <Icon icon="mdi:console" class="text-lg text-blue-500" />
                    <span class="text-gray-700">CMD (命令提示符)</span>
                    <Icon
                      v-if="shellType === 'cmd'"
                      icon="mdi:check"
                      class="ml-auto text-blue-500"
                    />
                  </button>
                  <button
                    type="button"
                    class="w-full px-3 py-2.5 text-left flex items-center gap-2 hover:bg-blue-50 transition-colors"
                    :class="{ 'bg-blue-50': shellType === 'powershell' }"
                    @mousedown.prevent="selectShellType('powershell')"
                  >
                    <Icon icon="mdi:powershell" class="text-lg text-blue-600" />
                    <span class="text-gray-700">PowerShell</span>
                    <Icon
                      v-if="shellType === 'powershell'"
                      icon="mdi:check"
                      class="ml-auto text-blue-500"
                    />
                  </button>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <!-- 命令输入 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            {{ shellType === 'cmd' ? 'CMD命令' : 'PowerShell命令' }}
          </label>
          <div class="relative p-1">
            <textarea
              v-model="command"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
              :placeholder="
                shellType === 'cmd'
                  ? '输入要执行的CMD命令\n例如: ipconfig\n或: ping baidu.com'
                  : '输入要执行的PowerShell命令\n例如: Get-Process\n或: Get-Service'
              "
              rows="6"
              maxlength="500"
            />
          </div>
          <div class="mt-1 text-xs text-gray-400">{{ command.length }}/500 字符</div>
        </div>
      </div>
    </div>

    <!-- 底部确认按钮 - 固定在底部 -->
    <div class="mt-6 pt-4">
      <button
        class="w-full px-4 py-3 rounded-lg font-medium transition-all"
        :class="
          isValid
            ? 'bg-blue-500 hover:bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        "
        :disabled="!isValid"
        @click="handleConfirm"
      >
        确认添加
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useToast } from '../../composables/useToast'

const emit = defineEmits<{
  back: []
  confirm: [data: { command: string; name: string; icon: string; shellType: 'cmd' | 'powershell' }]
}>()

const toast = useToast()

// 状态
const displayName = ref('')
const command = ref('')
const shellType = ref<'cmd' | 'powershell'>('cmd')
const dropdownOpen = ref(false)
// 使用默认图标
const selectedIcon = 'mdi:console'

/**
 * 选择 Shell 类型
 */
function selectShellType(type: 'cmd' | 'powershell'): void {
  shellType.value = type
  dropdownOpen.value = false
}

/**
 * 处理下拉菜单失焦
 */
function handleDropdownBlur(): void {
  // 延迟关闭，以便点击选项时能够触发
  setTimeout(() => {
    dropdownOpen.value = false
  }, 200)
}

/**
 * 验证表单是否有效
 */
const isValid = computed(() => {
  return displayName.value.trim() && command.value.trim()
})

/**
 * 确认添加
 */
function handleConfirm(): void {
  if (!isValid.value) {
    if (!displayName.value.trim()) {
      toast.error('请输入显示名称')
    } else if (!command.value.trim()) {
      toast.error('请输入CMD命令')
    }
    return
  }

  emit('confirm', {
    command: command.value.trim(),
    name: displayName.value.trim(),
    icon: selectedIcon,
    shellType: shellType.value
  })
}
</script>

<style scoped>
/* 下拉菜单动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
