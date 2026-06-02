import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  root: 'apps/baby-bot/mini-app',
  plugins: [react(), tsConfigPaths()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3100', changeOrigin: true },
      '/webhook': { target: 'http://localhost:3100', changeOrigin: true },
    },
  },
});
