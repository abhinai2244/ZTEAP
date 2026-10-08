import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    exclude: ['**/node_modules/**', '**/tests/e2e/**', '**/*.spec.ts'],
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
