<script setup lang="ts">
import { Icon } from '@iconify/vue'
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold"><Icon icon="mdi-light:home" />Hello world!</h1>
  </div>
  <img alt="logo" class="logo" src="./assets/electron.svg" />
  <div class="creator">Powered by electron-vite</div>
  <div class="text">
    Build an Electron app with
    <span class="vue">Vue</span>
    and
    <span class="ts">TypeScript</span>
  </div>
  <p class="tip">Please try pressing <code>F12</code> to open the devTool</p>
  <div class="actions">
    <div class="action">
      <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">Documentation</a>
    </div>
    <div class="action"></div>
  </div>
</template>
