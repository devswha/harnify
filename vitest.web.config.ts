import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/web'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/web/setup.ts'],
    include: ['tests/web/**/*.test.{ts,tsx}'],
    globals: true,
  },
});
