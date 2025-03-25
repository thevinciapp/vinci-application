import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'electron/main.ts'),
        },
        output: {
          entryFileNames: '[name].js',
        },
      },
    },
    resolve: {
      alias: [
        {
          find: '@',
          replacement: path.resolve(__dirname, 'src')
        },
        // Add a specific alias for store to make it work in the Electron main process
        {
          find: /^@\/store(\/.*)?$/,
          replacement: path.resolve(__dirname, 'src/store$1')
        },
        {
          find: /^@\/lib(\/.*)?$/,
          replacement: path.resolve(__dirname, 'src/lib$1')
        },
        {
          find: /^@\/core(\/.*)?$/,
          replacement: path.resolve(__dirname, 'src/core$1')
        },
        {
          find: /^@\/services(\/.*)?$/,
          replacement: path.resolve(__dirname, 'src/services$1')
        }
      ]
    },
  },
  preload: {
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'electron/preload.ts'),
        },
        output: {
          entryFileNames: '[name].js',
        },
      },
    },
    resolve: {
      alias: [
        {
          find: '@',
          replacement: path.resolve(__dirname, 'src')
        },
        // Add specific aliases for preload
        {
          find: /^@\/store(\/.*)?$/,
          replacement: path.resolve(__dirname, 'src/store$1')
        },
        {
          find: /^@\/lib(\/.*)?$/,
          replacement: path.resolve(__dirname, 'src/lib$1')
        },
        {
          find: /^@\/core(\/.*)?$/,
          replacement: path.resolve(__dirname, 'src/core$1')
        },
        {
          find: /^@\/services(\/.*)?$/,
          replacement: path.resolve(__dirname, 'src/services$1')
        }
      ]
    },
  },
  renderer: {
    root: __dirname,
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
        external: [
          'electron',
          '@electron/remote'
        ]
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      },
    },
    server: {
      port: 5173,
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'zustand'
      ],
    },
  },
});