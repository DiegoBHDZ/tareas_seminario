import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  optimizeDeps: {
    esbuildOptions: { target: 'esnext' },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: 'index.html',
        partA: 'partA/index.html',
        partB: 'partB/index.html',
        partC: 'partC/index.html',
        partD: 'partD/index.html',
        partE: 'partE/index.html',
      },
    },
  },
});
