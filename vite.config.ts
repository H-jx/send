import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, 'src')
    }
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly'
    },
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
  build: {
    outDir: 'dist/client',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true,
  },
});
