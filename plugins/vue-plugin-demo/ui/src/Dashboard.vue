<template>
  <div id="app">
    <div class="header">
      <h1>{{ pluginName }} - 数据仪表盘</h1>
      <p>实时数据展示和交互示例</p>
    </div>

    <div class="container">
      <!-- 统计卡片 -->
      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <div class="card-icon">📊</div>
            <div class="card-title">总访问量</div>
          </div>
          <div class="card-value">{{ formatNumber(stats.totalViews) }}</div>
          <div class="card-change">↑ {{ stats.viewsChange }}% 较上周</div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: stats.viewsProgress + '%' }"></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-icon">👥</div>
            <div class="card-title">活跃用户</div>
          </div>
          <div class="card-value">{{ formatNumber(stats.activeUsers) }}</div>
          <div class="card-change">↑ {{ stats.usersChange }}% 较上周</div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: stats.usersProgress + '%' }"></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-icon">⚡</div>
            <div class="card-title">执行次数</div>
          </div>
          <div class="card-value">{{ formatNumber(stats.executions) }}</div>
          <div class="card-change">↑ {{ stats.executionsChange }}% 较上周</div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: stats.executionsProgress + '%' }"></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-icon">⏱️</div>
            <div class="card-title">平均响应</div>
          </div>
          <div class="card-value">{{ stats.avgResponse }}ms</div>
          <div class="card-change negative">↓ {{ stats.responseChange }}% 较上周</div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: 100 - stats.responseProgress + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="section">
        <div class="section-title">数据趋势</div>
        <div class="card">
          <div class="chart-placeholder">📈 这里可以集成 Chart.js 或 ECharts 等图表库</div>
        </div>
      </div>

      <!-- 数据表格 -->
      <div class="section">
        <div class="section-title">最近活动</div>
        <div class="data-table">
          <div class="table-header">
            <h3>活动记录 ({{ filteredActivities.length }})</h3>
            <div class="table-controls">
              <select
                v-model="filterType"
                style="padding: 6px 12px; border-radius: 6px; border: 1px solid #e0e0e0"
              >
                <option value="all">全部</option>
                <option value="success">成功</option>
                <option value="warning">警告</option>
                <option value="error">错误</option>
              </select>
              <button class="btn-secondary btn-small" @click="addRandomActivity">添加活动</button>
              <button class="btn-secondary btn-small" @click="clearActivities">清空</button>
            </div>
          </div>

          <table v-if="filteredActivities.length > 0">
            <thead>
              <tr>
                <th>时间</th>
                <th>类型</th>
                <th>描述</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <transition-group name="list">
                <tr v-for="activity in paginatedActivities" :key="activity.id">
                  <td>{{ formatTime(activity.timestamp) }}</td>
                  <td>{{ activity.type }}</td>
                  <td>{{ activity.description }}</td>
                  <td>
                    <span :class="['badge', activity.status]">
                      {{ statusText(activity.status) }}
                    </span>
                  </td>
                  <td>
                    <button class="btn-secondary btn-small" @click="removeActivity(activity.id)">
                      删除
                    </button>
                  </td>
                </tr>
              </transition-group>
            </tbody>
          </table>

          <div v-else class="empty-state">
            <div class="empty-state-icon">📭</div>
            <p>暂无活动记录</p>
          </div>

          <div
            v-if="totalPages > 1"
            style="
              padding: 16px 24px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-top: 1px solid #e0e0e0;
            "
          >
            <div style="font-size: 13px; color: #666">
              第 {{ currentPage }} / {{ totalPages }} 页，共 {{ filteredActivities.length }} 条
            </div>
            <div style="display: flex; gap: 8px">
              <button
                class="btn-secondary btn-small"
                @click="currentPage--"
                :disabled="currentPage === 1"
              >
                上一页
              </button>
              <button
                class="btn-secondary btn-small"
                @click="currentPage++"
                :disabled="currentPage === totalPages"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

// 状态
const pluginName = ref('Vue 插件')
const stats = reactive({
  totalViews: 125847,
  viewsChange: 12.5,
  viewsProgress: 75,
  activeUsers: 8392,
  usersChange: 8.3,
  usersProgress: 60,
  executions: 45821,
  executionsChange: 15.7,
  executionsProgress: 85,
  avgResponse: 45,
  responseChange: 5.2,
  responseProgress: 35
})
const activities = ref([])
const filterType = ref('all')
const currentPage = ref(1)
const itemsPerPage = 10
let activityIdCounter = 0
let statsInterval = null

// 计算属性
const filteredActivities = computed(() => {
  if (filterType.value === 'all') {
    return activities.value
  }
  return activities.value.filter((a) => a.status === filterType.value)
})

const totalPages = computed(() => {
  return Math.ceil(filteredActivities.value.length / itemsPerPage)
})

const paginatedActivities = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredActivities.value.slice(start, end)
})

// 生命周期
onMounted(() => {
  console.log('仪表盘已挂载')
  loadInitialData()
  startStatsUpdate()
})

onUnmounted(() => {
  if (statsInterval) {
    clearInterval(statsInterval)
  }
})

// 方法
function loadInitialData() {
  if (window.pluginData) {
    pluginName.value = window.pluginData.pluginName || 'Vue 插件'
  }

  // 生成初始活动数据
  const types = ['执行', '配置', '通知', '同步']
  const descriptions = [
    '插件执行成功',
    '配置已更新',
    '发送通知',
    '数据同步完成',
    '用户登录',
    '文件处理',
    'API 调用',
    '缓存更新'
  ]
  const statuses = ['success', 'warning', 'error', 'info']

  for (let i = 0; i < 15; i++) {
    activities.value.push({
      id: ++activityIdCounter,
      timestamp: Date.now() - Math.random() * 86400000,
      type: types[Math.floor(Math.random() * types.length)],
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)]
    })
  }

  // 按时间排序
  activities.value.sort((a, b) => b.timestamp - a.timestamp)
}

function startStatsUpdate() {
  // 模拟实时数据更新
  statsInterval = setInterval(() => {
    stats.totalViews += Math.floor(Math.random() * 10)
    stats.activeUsers += Math.floor(Math.random() * 3) - 1
    stats.executions += Math.floor(Math.random() * 5)
    stats.avgResponse = 40 + Math.floor(Math.random() * 20)
  }, 3000)
}

function addRandomActivity() {
  const types = ['执行', '配置', '通知', '同步']
  const descriptions = ['插件执行成功', '配置已更新', '发送通知', '数据同步完成']
  const statuses = ['success', 'warning', 'error', 'info']

  const newActivity = {
    id: ++activityIdCounter,
    timestamp: Date.now(),
    type: types[Math.floor(Math.random() * types.length)],
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)]
  }

  activities.value.unshift(newActivity)
  currentPage.value = 1
}

function removeActivity(id) {
  const index = activities.value.findIndex((a) => a.id === id)
  if (index > -1) {
    activities.value.splice(index, 1)
  }
}

function clearActivities() {
  if (confirm('确定要清空所有活动记录吗？')) {
    activities.value = []
    currentPage.value = 1
  }
}

function formatNumber(num) {
  return num.toLocaleString('zh-CN')
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function statusText(status) {
  const map = {
    success: '成功',
    warning: '警告',
    error: '错误',
    info: '信息'
  }
  return map[status] || status
}
</script>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header h1 {
  font-size: 28px;
  margin-bottom: 8px;
}

.header p {
  opacity: 0.9;
  font-size: 14px;
}

.container {
  flex: 1;
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.card-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.card-title {
  font-size: 14px;
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-value {
  font-size: 32px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
}

.card-change {
  font-size: 13px;
  color: #28a745;
}

.card-change.negative {
  color: #dc3545;
}

.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e0e0e0;
}

.data-table {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.table-header {
  background: #f9f9f9;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
}

.table-header h3 {
  font-size: 16px;
  color: #333;
}

.table-controls {
  display: flex;
  gap: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 16px 24px;
  text-align: left;
}

th {
  background: #f9f9f9;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

td {
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
}

tbody tr {
  transition: all 0.2s;
}

tbody tr:hover {
  background: #f9f9f9;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.badge.success {
  background: #d4edda;
  color: #155724;
}

.badge.warning {
  background: #fff3cd;
  color: #856404;
}

.badge.danger {
  background: #f8d7da;
  color: #721c24;
}

.badge.info {
  background: #d1ecf1;
  color: #0c5460;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-family: inherit;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #e0e0e0;
  color: #666;
}

.btn-secondary:hover {
  background: #d0d0d0;
}

.btn-small {
  padding: 4px 12px;
  font-size: 12px;
}

.chart-placeholder {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  height: 200px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  font-weight: 600;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
  transition: width 0.3s;
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: #999;
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.3s;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
