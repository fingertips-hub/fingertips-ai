<template>
  <div class="flex flex-col h-full">
    <!-- 顶部返回按钮 -->
    <div class="flex items-center gap-2 mb-4 flex-shrink-0">
      <button class="p-2 rounded-lg hover:bg-gray-100 transition-colors" @click="emit('back')">
        <Icon icon="mdi:arrow-left" class="text-xl text-gray-600" />
      </button>
      <h2 class="text-lg font-semibold text-gray-800">
        {{ mode === 'edit' ? '编辑CMD命令' : '添加CMD命令' }}
      </h2>
    </div>

    <!-- 主体区域 - 支持滚动 -->
    <div class="flex-1 min-h-0 max-h-[420px] overflow-y-auto pr-2">
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
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-gray-700">
              {{ shellType === 'cmd' ? 'CMD命令' : 'PowerShell命令' }}
            </label>
            <!-- 操作按钮组 -->
            <div class="flex items-center gap-1.5">
              <!-- 测试按钮 -->
              <button
                type="button"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                :class="
                  canTest && !isTesting
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-sm hover:shadow-md'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                "
                :title="!command.trim() ? '请先输入命令' : isTesting ? '测试中...' : '测试命令'"
                :disabled="!canTest || isTesting"
                @click="handleTestCommand"
              >
                <Icon
                  :icon="isTesting ? 'mdi:loading' : 'mdi:play-circle-outline'"
                  class="text-base"
                  :class="{ 'animate-spin': isTesting }"
                />
                <span>{{ isTesting ? '测试中...' : '测试' }}</span>
              </button>

              <!-- AI 生成按钮 -->
              <button
                type="button"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                :class="
                  canGenerate && !isGenerating
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-sm hover:shadow-md'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                "
                :title="
                  !command.trim() ? '请先输入命令描述' : isGenerating ? '生成中...' : 'AI 生成命令'
                "
                :disabled="!canGenerate || isGenerating"
                @click="handleGenerateCommand"
              >
                <Icon
                  :icon="isGenerating ? 'mdi:loading' : 'mdi:auto-fix'"
                  class="text-base"
                  :class="{ 'animate-spin': isGenerating }"
                />
                <span>{{ isGenerating ? '生成中...' : 'AI 生成' }}</span>
              </button>
            </div>
          </div>
          <div class="relative p-1">
            <textarea
              ref="commandTextarea"
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
          <div class="mt-1 flex items-start justify-between gap-2">
            <div class="text-xs text-gray-500 flex-1">
              <Icon icon="mdi:information-outline" class="inline text-blue-500" />
              使用
              <code class="px-1 py-0.5 bg-gray-100 rounded text-gray-700 font-mono">[TEXT]</code>
              占位符，执行时会替换为选中的文本
            </div>
            <div class="text-xs text-gray-400 flex-shrink-0">{{ command.length }}/500</div>
          </div>
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
        {{ mode === 'edit' ? '确认保存' : '确认添加' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useToast } from '../../composables/useToast'

interface Props {
  mode?: 'add' | 'edit'
  initialData?: {
    command: string
    name: string
    icon: string
    shellType: 'cmd' | 'powershell'
  }
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'add'
})

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
const isGenerating = ref(false) // AI 生成状态
const isTesting = ref(false) // 测试状态
const commandTextarea = ref<HTMLTextAreaElement | null>(null) // 命令输入框引用
// 使用默认图标
const selectedIcon = 'mdi:console'

// 编辑模式下初始化数据
onMounted(() => {
  if (props.mode === 'edit' && props.initialData) {
    displayName.value = props.initialData.name
    command.value = props.initialData.command
    shellType.value = props.initialData.shellType
  }
})

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
 * 是否可以生成命令
 * 要求：命令描述不为空
 */
const canGenerate = computed(() => {
  return command.value.trim().length > 0
})

/**
 * 是否可以测试命令
 * 要求：命令不为空
 */
const canTest = computed(() => {
  return command.value.trim().length > 0
})

/**
 * 使用 AI 生成命令
 */
async function handleGenerateCommand(): Promise<void> {
  if (!canGenerate.value || isGenerating.value) {
    return
  }

  // 获取用户输入的描述
  const description = command.value.trim()

  try {
    isGenerating.value = true
    toast.info('正在生成命令...')

    // 调用 AI 生成命令
    const result = await window.api.cmdGenerator.generate(description, shellType.value)

    if (result.success && result.command) {
      // 将生成的命令填充到文本域
      command.value = result.command
      toast.success('命令生成成功')
    } else {
      toast.error(result.error || '生成命令失败')
    }
  } catch (error) {
    console.error('Generate command error:', error)
    toast.error('生成命令失败，请稍后重试')
  } finally {
    isGenerating.value = false
  }
}

/**
 * 测试命令
 */
async function handleTestCommand(): Promise<void> {
  if (!canTest.value || isTesting.value) {
    return
  }

  let testCommand = command.value.trim()

  // 如果命令包含 [TEXT] 占位符，用示例文本替换
  if (testCommand.includes('[TEXT]')) {
    const exampleText = '示例文本'
    testCommand = testCommand.replace(/\[TEXT\]/g, exampleText)
    toast.info(`使用示例文本 "${exampleText}" 测试命令...`)
  }

  try {
    isTesting.value = true
    if (!testCommand.includes('[TEXT]')) {
      toast.info('正在测试命令...')
    }

    // 调用 launcher API 执行命令
    const result = await window.api.launcher.launchApp(testCommand, 'cmd', shellType.value)

    if (result) {
      toast.success('命令已在新窗口中打开')
    } else {
      toast.error('命令测试失败')
    }
  } catch (error) {
    console.error('Test command error:', error)
    toast.error('命令测试失败，请检查命令语法')
  } finally {
    isTesting.value = false
  }
}

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
