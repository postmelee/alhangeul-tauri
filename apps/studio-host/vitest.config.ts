import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { createAlhangeulOverrides } from './alhangeul-overrides';
import { createAlhangeulLocalFontPlugin } from './local-font-overrides';
import { createLocalFontEntryHooks } from './local-font-entry-hooks';

const upstreamSrc = resolve(__dirname, '../../third_party/rhwp/rhwp-studio/src');
const alhangeulSrc = resolve(__dirname, 'src');
const rhwpWasmModule = resolve(__dirname, 'vendor/rhwp-core/rhwp.js');

export default defineConfig({
  plugins: [
    createAlhangeulLocalFontPlugin({ upstreamSrc, alhangeulSrc }),
    createLocalFontEntryHooks(upstreamSrc, alhangeulSrc),
  ],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: [
      ...createAlhangeulOverrides(alhangeulSrc),
      { find: '@wasm/rhwp.js', replacement: rhwpWasmModule },
      { find: '@upstream', replacement: upstreamSrc },
      { find: '@', replacement: upstreamSrc },
    ],
  },
});
