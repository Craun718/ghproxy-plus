import path from 'node:path';
import { defineConfig } from '@farmfe/core';
import farmJsPluginPostcss from '@farmfe/js-plugin-postcss';

export default defineConfig({
  plugins: ['@farmfe/plugin-react', farmJsPluginPostcss()],
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true
  },
  compilation: {
    resolve: {
      alias: {
        '@': path.join(process.cwd(), 'src')
      }
    },
    assets: {
      include: ['md']
    }
  }
});
