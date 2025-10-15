<template>
  <div class="settings-page">
    <div class="settings-header">
      <h1 class="text-2xl font-bold text-gray-800">AI 快捷指令</h1>
      <p class="text-sm text-gray-500 mt-2">配置和管理 AI 驱动的快捷指令</p>
    </div>

    <div class="settings-content">
      <div class="placeholder-content">
        <div class="placeholder-icon">
          <svg
            class="w-24 h-24 text-blue-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <p class="placeholder-title">功能开发中</p>
        <p class="placeholder-description">AI 快捷指令功能即将上线，敬请期待！</p>
        <div class="feature-preview">
          <h3 class="preview-title">即将推出的功能：</h3>
          <ul class="preview-list">
            <li>
              <svg class="preview-icon" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>自定义 AI 快捷指令</span>
            </li>
            <li>
              <svg class="preview-icon" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>快捷指令模板库</span>
            </li>
            <li>
              <svg class="preview-icon" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>一键执行智能任务</span>
            </li>
            <li>
              <svg class="preview-icon" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>集成常用 AI 模型</span>
            </li>
          </ul>
        </div>

        <!-- 提示信息 -->
        <div class="info-notice">
          <svg class="notice-icon" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            />
          </svg>
          <p class="notice-text">
            AI 的基础设置（Base URL、API Key）已移至
            <strong>公共设置</strong>页面
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.settings-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.settings-header {
  padding: 24px 32px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}

.settings-content {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
  background: #f9fafb;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 48px 24px;
}

.placeholder-icon {
  margin-bottom: 24px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.placeholder-title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 12px;
}

.placeholder-description {
  font-size: 16px;
  color: #6b7280;
  text-align: center;
  margin-bottom: 40px;
}

/* 功能预览 */
.feature-preview {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px 0 rgba(0, 0, 0, 0.06);
  max-width: 500px;
  width: 100%;
  margin-bottom: 32px;
}

.preview-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 20px;
  text-align: center;
}

.preview-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.preview-list li {
  display: flex;
  align-items: center;
  padding: 12px 0;
  gap: 12px;
  color: #374151;
  font-size: 15px;
}

.preview-list li:not(:last-child) {
  border-bottom: 1px solid #f3f4f6;
}

.preview-icon {
  width: 20px;
  height: 20px;
  color: #10b981;
  flex-shrink: 0;
}

/* 提示信息 */
.info-notice {
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 500px;
  width: 100%;
}

.notice-icon {
  width: 20px;
  height: 20px;
  color: #f59e0b;
  flex-shrink: 0;
}

.notice-text {
  font-size: 14px;
  color: #92400e;
  margin: 0;
  line-height: 1.5;
}

.notice-text strong {
  font-weight: 600;
  color: #78350f;
}
</style>
