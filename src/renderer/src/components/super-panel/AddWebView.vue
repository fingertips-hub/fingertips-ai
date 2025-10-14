<template>
  <div class="flex flex-col h-full">
    <!-- 顶部返回按钮 -->
    <div class="flex items-center gap-2 mb-4 flex-shrink-0">
      <button class="p-2 rounded-lg hover:bg-gray-100 transition-colors" @click="emit('back')">
        <Icon icon="mdi:arrow-left" class="text-xl text-gray-600" />
      </button>
      <h2 class="text-lg font-semibold text-gray-800">添加网页链接</h2>
    </div>

    <!-- 主体区域 - 支持滚动 -->
    <div class="flex-1 min-h-0 max-h-[400px] overflow-y-auto pr-2">
      <div class="space-y-4">
        <!-- URL输入 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">网页地址</label>
          <div class="relative p-1">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon icon="mdi:web" class="text-xl text-gray-400" />
            </div>
            <input
              v-model="url"
              type="url"
              class="w-full pl-11 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com"
              @input="validateUrl"
              @blur="handleUrlBlur"
            />
          </div>
          <p v-if="urlError" class="mt-1 text-xs text-red-500">{{ urlError }}</p>
          <p v-else class="mt-1 text-xs text-gray-400">
            请输入完整的网址，包含 http:// 或 https://
          </p>
        </div>

        <!-- 显示名称输入 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">显示名称</label>
          <div class="relative p-1">
            <input
              v-model="displayName"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="输入网页显示名称"
              maxlength="20"
            />
          </div>
          <div class="mt-1 text-xs text-gray-400">{{ displayName.length }}/20 字符</div>
        </div>

        <!-- 图标获取状态 -->
        <div v-if="isFetchingFavicon">
          <label class="block text-sm font-medium text-gray-700 mb-2">网站图标</label>
          <div class="p-3 rounded-lg border-2 border-gray-200 bg-gray-50">
            <div class="flex items-center gap-3">
              <Icon icon="mdi:loading" class="w-8 h-8 text-blue-500 animate-spin" />
              <div class="text-sm text-gray-600">正在获取网站图标...</div>
            </div>
          </div>
        </div>

        <!-- 预览区域 -->
        <div v-if="url && !isFetchingFavicon" class="mt-4 p-4 bg-gray-50 rounded-lg">
          <div class="flex items-center gap-4">
            <!-- 图标预览 -->
            <div class="w-12 h-12 flex-shrink-0">
              <!-- 如果有 favicon，显示 favicon -->
              <img
                v-if="faviconUrl"
                :src="faviconUrl"
                alt="Website Icon"
                class="w-full h-full rounded object-cover"
              />
              <!-- 否则显示默认的 mdi:web 图标 -->
              <div v-else class="w-full h-full rounded flex items-center justify-center bg-blue-50">
                <Icon icon="mdi:web" class="text-3xl text-blue-500" />
              </div>
            </div>

            <!-- 信息预览 -->
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-800 truncate">
                {{ displayName || '待输入显示名称' }}
              </div>
              <div class="text-sm text-gray-500 truncate" :title="url">{{ url }}</div>
            </div>
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
        确认添加
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useToast } from '../../composables/useToast'

const emit = defineEmits<{
  back: []
  confirm: [data: { url: string; name: string; icon: string }]
}>()

const toast = useToast()

// 状态
const url = ref('')
const displayName = ref('')
const urlError = ref('')
const faviconUrl = ref<string | null>(null)
const isFetchingFavicon = ref(false)
let debounceTimer: number | null = null

/**
 * 验证URL格式
 */
function validateUrl(): void {
  urlError.value = ''

  if (!url.value) {
    return
  }

  // 检查是否包含协议
  if (!url.value.startsWith('http://') && !url.value.startsWith('https://')) {
    urlError.value = '网址必须以 http:// 或 https:// 开头'
    return
  }

  // 使用URL构造函数验证URL格式
  try {
    new URL(url.value)
  } catch {
    urlError.value = '请输入有效的网址'
  }
}

/**
 * URL输入框失焦时自动补全协议
 */
function handleUrlBlur(): void {
  if (url.value && !url.value.startsWith('http://') && !url.value.startsWith('https://')) {
    url.value = 'https://' + url.value
    validateUrl()
  }
}

/**
 * 防抖获取 favicon
 * 用户输入停止后 800ms 自动获取
 */
function debouncedFetchFavicon(): void {
  // 清除之前的定时器
  if (debounceTimer !== null) {
    window.clearTimeout(debounceTimer)
  }

  // 重置 favicon 状态
  faviconUrl.value = null

  // 设置新的定时器
  debounceTimer = window.setTimeout(() => {
    if (url.value && !urlError.value) {
      // 异步获取，不阻塞 UI
      fetchFavicon()
    }
  }, 800) // 800ms 延迟
}

/**
 * 获取网站 favicon（完全异步，不阻塞 UI）
 * 通过主进程获取，避免 CORS 问题
 */
function fetchFavicon(): void {
  if (!url.value || urlError.value) return

  isFetchingFavicon.value = true

  // 完全异步执行，不使用 await
  window.api.launcher
    .fetchFavicon(url.value)
    .then((base64Icon) => {
      if (base64Icon) {
        faviconUrl.value = base64Icon
        console.log('Favicon fetched successfully')
      } else {
        console.log('Failed to fetch favicon, will use default mdi:web icon')
        faviconUrl.value = null
      }
    })
    .catch((error) => {
      console.error('Error fetching favicon:', error)
      faviconUrl.value = null
    })
    .finally(() => {
      isFetchingFavicon.value = false
    })
}

// 监听 URL 变化，自动触发防抖获取 favicon
watch(url, (newUrl) => {
  if (newUrl) {
    validateUrl()
    if (!urlError.value) {
      debouncedFetchFavicon()
    }
  }
})

/**
 * 验证表单是否有效
 */
const isValid = computed(() => {
  return url.value && displayName.value.trim() && !urlError.value
})

/**
 * 确认添加
 */
function handleConfirm(): void {
  if (!isValid.value) {
    if (!url.value) {
      toast.error('请输入网页地址')
    } else if (!displayName.value.trim()) {
      toast.error('请输入显示名称')
    } else if (urlError.value) {
      toast.error(urlError.value)
    }
    return
  }

  // 如果有 favicon 就用 favicon，否则用 mdi:web
  const iconValue = faviconUrl.value || 'mdi:web'

  emit('confirm', {
    url: url.value.trim(),
    name: displayName.value.trim(),
    icon: iconValue
  })
}
</script>
