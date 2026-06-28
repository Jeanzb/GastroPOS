import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function rendererCspPlugin() {
  return {
    name: 'gastroia-renderer-csp',
    transformIndexHtml(html: string) {
      const apiOrigin = process.env.VITE_API_ORIGIN?.trim() || 'http://localhost:3000';
      return html.replace('__GASTROIA_API_ORIGIN__', apiOrigin);
    },
  };
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
      },
    },
    optimizeDeps: {
      include: ['@gastroai/contracts'],
    },
    plugins: [rendererCspPlugin(), react(), tailwindcss()],
  },
});
