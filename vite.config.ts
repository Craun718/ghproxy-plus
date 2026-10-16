import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const vitePort = Number(process.env.VITE_PORT ?? 3000);
const wranglerPort = Number(process.env.WRANGLER_PORT ?? 8787);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.join(projectRoot, 'src')
    }
  },
  server: {
    host: '127.0.0.1',
    port: vitePort,
    strictPort: true,
    proxy: {
      '^/api/': {
        target: `http://127.0.0.1:${wranglerPort}`,
        changeOrigin: true
      }
    }
  },
  assetsInclude: ['**/*.md'],
  build: {
    outDir: 'dist'
  }
});
