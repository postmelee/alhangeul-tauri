import { defineConfig, mergeConfig } from 'vite';
import base from '../vitest.config';

// Isolated real-DOM harness; not an application entry or release build input.
export default mergeConfig(base, defineConfig({
  root: import.meta.dirname,
  define: { __APP_VERSION__: JSON.stringify('fixture'), __ALHANGEUL_VERSION__: JSON.stringify('0.1.0') },
  server: { host: '127.0.0.1', port: 7717, strictPort: true },
}));
