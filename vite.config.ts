import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const vitePort = Number(process.env.VITE_PORT ?? 3000);
const wranglerPort = Number(process.env.WRANGLER_PORT ?? 8787);
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
);
const buildTimestamp = new Date().toISOString();

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
    'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(buildTimestamp),
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(
      buildTimestamp.slice(0, 10)
    )
  },
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
