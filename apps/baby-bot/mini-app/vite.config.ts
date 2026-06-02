import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  root: 'apps/baby-bot/mini-app',
  // Served at the origin root in local dev (proxy), but under `/mini-app/` in
  // production behind the Caddy edge. Driven by the Docker build-arg so asset
  // URLs in index.html are prefixed correctly. Defaults to '/' for local dev.
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react(), tsConfigPaths()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3100', changeOrigin: true },
      '/webhook': { target: 'http://localhost:3100', changeOrigin: true },
    },
  },
});
