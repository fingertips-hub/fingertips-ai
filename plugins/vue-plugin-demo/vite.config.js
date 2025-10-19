import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'ui/dist',
    rollupOptions: {
      input: {
        config: resolve(__dirname, 'ui/src/config-main.js'),
        dashboard: resolve(__dirname, 'ui/src/dashboard-main.js')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
})
