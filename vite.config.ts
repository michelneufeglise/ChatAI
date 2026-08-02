import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@services': '/src/services',
      '@hooks': '/src/hooks',
      '@store': '/src/store',
      '@utils': '/src/utils',
      '@types': '/src/types',
    },
  },

  // Vite options tailored for Tauri
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 600,
    },
  },
  build: {
    target: ['es2022', 'chrome105'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },

  // Vitest configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@services': '/src/services',
      '@hooks': '/src/hooks',
      '@store': '/src/store',
      '@/types': '/src/types/index.ts',
    },
  },
}));

