<template>
  <div class="flex flex-col gap-3">
    <!-- 头部 -->
    <div class="flex items-center gap-2">
      <button
        class="p-1.5 hover:bg-gray-100 rounded transition-colors"
        title="返回"
        @click="$emit('back')"
      >
        <Icon icon="mdi:arrow-left" class="text-xl text-gray-600" />
      </button>
      <h2 class="text-base font-semibold text-gray-800">
        {{ mode === 'edit' ? '编辑插件' : '选择插件' }}
      </h2>
    </div>

    <!-- 提示信息 -->
    <div class="text-xs text-gray-500 px-1">
      {{
        mode === 'edit'
          ? '选择一个新的插件进行替换'
          : '选择一个已启用的插件作为快捷方式,点击后可快速启动该插件'
      }}
    </div>

    <!-- 关键词筛选 -->
    <div v-if="allKeywords.length > 0" class="flex gap-2 flex-wrap px-1">
      <button
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
        :class="
          selectedKeyword === null
            ? 'bg-blue-500 text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        "
        @click="selectedKeyword = null"
      >
        <Icon icon="mdi:apps" class="inline-block mr-1" />
        全部
        <span class="ml-1 opacity-70">({{ enabledPlugins.length }})</span>
      </button>
      <button
        v-for="keyword in allKeywords"
        :key="keyword"
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
        :class="
          selectedKeyword === keyword
            ? 'bg-blue-500 text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        "
        @click="selectedKeyword = keyword"
      >
        <Icon icon="mdi:tag" class="inline-block mr-1" />
        {{ keyword }}
        <span class="ml-1 opacity-70">({{ getKeywordCount(keyword) }})</span>
      </button>
    </div>

    <!-- 插件列表 -->
    <div class="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
      <button
        v-for="plugin in filteredPlugins"
        :key="plugin.id"
        class="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group text-left"
        @click="handleSelectPlugin(plugin)"
      >
        <!-- 图标 -->
        <div
          class="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 group-hover:bg-blue-100 transition-colors flex-shrink-0"
        >
          <Icon
            v-if="plugin.icon"
            :icon="plugin.icon"
            class="text-2xl text-blue-600 group-hover:text-blue-700"
          />
          <Icon v-else icon="mdi:puzzle" class="text-2xl text-blue-600 group-hover:text-blue-700" />
        </div>

        <!-- 内容 -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <div class="font-medium text-gray-800 text-sm leading-tight truncate">
              {{ plugin.name }}
            </div>
            <div class="text-xs text-gray-400 flex-shrink-0">v{{ plugin.version }}</div>
          </div>
          <div class="text-xs text-gray-500 leading-tight line-clamp-2 mb-1">
            {{ plugin.description }}
          </div>
          <!-- 关键词标签 -->
          <div v-if="plugin.keywords && plugin.keywords.length > 0" class="flex gap-1 flex-wrap">
            <span
              v-for="keyword in plugin.keywords.slice(0, 3)"
              :key="keyword"
              class="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded"
            >
              {{ keyword }}
            </span>
          </div>
        </div>

        <!-- 箭头 -->
        <Icon
          icon="mdi:chevron-right"
          class="text-lg text-gray-400 group-hover:text-blue-500 flex-shrink-0"
        />
      </button>

      <!-- 空状态 -->
      <div
        v-if="filteredPlugins.length === 0"
        class="flex flex-col items-center py-8 text-gray-400 text-sm"
      >
        <Icon icon="mdi:puzzle-outline" class="text-4xl mb-2" />
        <div class="text-xs mt-1">
          {{
            selectedKeyword === null
              ? '暂无已启用的插件'
              : `"${selectedKeyword}" 分类下暂无已启用的插件`
          }}
        </div>
        <div v-if="enabledPlugins.length === 0" class="text-xs text-gray-400 mt-2">
          请先在设置中启用插件
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { usePluginStore, type PluginManifest } from '../../stores/plugin'

interface Props {
  mode?: 'add' | 'edit'
  initialData?: {
    pluginId: string
    pluginName: string
    pluginIcon: string
  }
}

withDefaults(defineProps<Props>(), {
  mode: 'add'
})

const emit = defineEmits<{
  back: []
  confirm: [data: { pluginId: string; pluginName: string; pluginIcon: string }]
}>()

const pluginStore = usePluginStore()

// 状态
const selectedKeyword = ref<string | null>(null)

// 组件挂载时加载已启用的插件
onMounted(async () => {
  await pluginStore.loadEnabledPlugins()
})

// 获取已启用的插件
// 注意：pluginStore.enabledPlugins 已经是通过 getEnabled() 获取的已激活插件
const enabledPlugins = computed(() => {
  return pluginStore.enabledPlugins
})

// 获取所有唯一的关键词
const allKeywords = computed(() => {
  const keywordSet = new Set<string>()
  enabledPlugins.value.forEach((plugin) => {
    plugin.keywords?.forEach((keyword) => keywordSet.add(keyword))
  })
  return Array.from(keywordSet).sort()
})

// 筛选后的插件列表
const filteredPlugins = computed(() => {
  if (selectedKeyword.value === null) {
    return enabledPlugins.value
  }
  return enabledPlugins.value.filter((plugin) => plugin.keywords?.includes(selectedKeyword.value!))
})

/**
 * 获取关键词下的插件数量
 */
function getKeywordCount(keyword: string): number {
  return enabledPlugins.value.filter((plugin) => plugin.keywords?.includes(keyword)).length
}

/**
 * 处理选择插件
 */
function handleSelectPlugin(plugin: PluginManifest): void {
  emit('confirm', {
    pluginId: plugin.id,
    pluginName: plugin.name,
    pluginIcon: plugin.icon || 'mdi:puzzle'
  })
}
</script>

<style scoped>
/* 自定义滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 文本截断 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
