import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/web',
  build: {
    outDir: '../../dist/web',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/web'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3847',
    },
  },
});
