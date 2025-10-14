<template>
  <div class="w-full h-[260px] bg-transparent grid grid-cols-5 grid-rows-3 gap-1 p-1">
    <SuperPanelItem v-for="index in 15" :key="index" :index="index - 1" area="main" />
  </div>
</template>

<script setup lang="ts">
import SuperPanelItem from './SuperPanelItem.vue'
</script>
