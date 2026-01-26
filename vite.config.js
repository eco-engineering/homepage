import { defineConfig } from 'vite';
import { resolve } from 'path';

const rootDir = __dirname;
const ignoredPaths = [
  '**/시안/**',
  '**/dist/**',
  '**/.claude/**',
  '**/.DS_Store',
  '**/extract_images.py',
];

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        products: resolve(__dirname, 'products.html'),
      },
    },
  },
  server: {
    open: true,
    fs: {
      allow: [rootDir],
      deny: ignoredPaths,
    },
    watch: {
      ignored: ignoredPaths,
    },
  }
});
