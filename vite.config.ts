import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  build: {
    // 微信小游戏包体限制：主包 ≤ 4MB（首屏资源走分包/CDN）。
    // 这里构建的是 H5 预览版；小游戏包由 tools/pack-minigame.mjs 从 dist 产出。
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 1024,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          core: ['./src/core/index.ts'],
          game: ['./src/game/index.ts'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@game': fileURLToPath(new URL('./src/game', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
    },
  },
  server: {
    port: 8080,
    host: true,
  },
});
