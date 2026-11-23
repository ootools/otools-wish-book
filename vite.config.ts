import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 独立仓库：构建不依赖宿主 OTools 仓的脚本或别名。
export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
  server: {
    host: '127.0.0.1',
    port: 6592,
    strictPort: true,
  },
});
