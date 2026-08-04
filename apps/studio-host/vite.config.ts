import { defineConfig, normalizePath } from 'vite';
import { basename, dirname, relative, resolve } from 'node:path';
import { copyFileSync, createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import type { Plugin } from 'vite';
import { createAlhangeulOverrides } from './alhangeul-overrides';

const desktopConfig = JSON.parse(
  readFileSync(resolve(__dirname, '../desktop/src-tauri/tauri.conf.json'), 'utf-8'),
);
const upstreamStudioDir = resolve(__dirname, '../../third_party/rhwp/rhwp-studio');
const upstreamSrc = resolve(__dirname, '../../third_party/rhwp/rhwp-studio/src');
const alhangeulSrc = resolve(__dirname, 'src');
const productStylePath = resolve(__dirname, 'src/style.css');
const productIconPath = resolve(__dirname, 'public/favicon.ico');
const rhwpWasmModule = normalizePath(resolve(__dirname, 'vendor/rhwp-core/rhwp.js'));
const rhwpWasmDir = dirname(rhwpWasmModule);
const rhwpWasmPackage = JSON.parse(readFileSync(resolve(rhwpWasmDir, 'package.json'), 'utf-8'));
const fontAssetsDir = resolve(__dirname, '../../assets/fonts');

function alhangeulFontAssets(): Plugin {
  return {
    name: 'alhangeul-font-assets',
    configureServer(server) {
      server.middlewares.use('/fonts', (req, res, next) => {
        const fontName = basename(decodePath(req.url?.split('?')[0] ?? ''));
        if (!fontName.endsWith('.woff2')) {
          next();
          return;
        }

        const fontPath = resolve(fontAssetsDir, fontName);
        const relativeFontPath = relative(fontAssetsDir, fontPath);
        if (relativeFontPath.startsWith('..') || relativeFontPath === '' || !existsSync(fontPath)) {
          next();
          return;
        }

        res.setHeader('Content-Type', 'font/woff2');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        createReadStream(fontPath).pipe(res);
      });
    },
    closeBundle() {
      const outDir = resolve(__dirname, 'dist/fonts');
      mkdirSync(outDir, { recursive: true });
      for (const fileName of readdirSync(fontAssetsDir)) {
        const source = resolve(fontAssetsDir, fileName);
        if (!fileName.endsWith('.woff2') || !statSync(source).isFile()) continue;
        copyFileSync(source, resolve(outDir, fileName));
      }
    },
  };
}

function alhangeulDesktopShell(): Plugin {
  return {
    name: 'alhangeul-desktop-shell',
    configureServer(server) {
      server.middlewares.use('/favicon.ico', (_req, res) => {
        res.setHeader('Content-Type', 'image/x-icon');
        createReadStream(productIconPath).pipe(res);
      });
    },
    transformIndexHtml(html) {
      return {
        html: html
          .replace('<title>rhwp-studio</title>', '<title>Alhangeul</title>')
          .replace('rhwp-studio 문서 편집기', 'Alhangeul 문서 편집기')
          .replace(
            '<div class="md-item disabled" data-cmd="file:new-doc"><span class="md-icon icon-new-doc"></span><span class="md-label">새로 만들기</span></div>',
            [
              '<div class="md-item disabled" data-cmd="file:new-doc"><span class="md-icon icon-new-doc"></span><span class="md-label">새로 만들기</span></div>',
              '<div class="md-item" data-cmd="file:new-window"><span class="md-icon"></span><span class="md-label">새 창</span><span class="md-shortcut">Ctrl+Shift+N</span></div>',
            ].join('\n'),
          ),
        tags: [
          {
            tag: 'style',
            attrs: { 'data-alhangeul-product-style': 'true' },
            children: readFileSync(productStylePath, 'utf8'),
            injectTo: 'head',
          },
        ],
      };
    },
    closeBundle() {
      copyFileSync(productIconPath, resolve(__dirname, 'dist/favicon.ico'));
    },
  };
}

function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return '';
  }
}

export default defineConfig({
  base: './',
  root: upstreamStudioDir,
  cacheDir: resolve(__dirname, 'node_modules/.vite'),
  plugins: [alhangeulDesktopShell(), alhangeulFontAssets()],
  define: {
    __APP_VERSION__: JSON.stringify(rhwpWasmPackage.version),
    __ALHANGEUL_VERSION__: JSON.stringify(desktopConfig.version),
  },
  resolve: {
    alias: [
      ...createAlhangeulOverrides(alhangeulSrc),
      { find: '@wasm/rhwp.js', replacement: rhwpWasmModule },
      {
        find: '@noble/hashes',
        replacement: resolve(__dirname, 'node_modules/@noble/hashes'),
      },
      {
        find: 'canvaskit-wasm',
        replacement: resolve(__dirname, 'node_modules/canvaskit-wasm'),
      },
      { find: '@upstream', replacement: upstreamSrc },
      { find: '@', replacement: upstreamSrc },
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 7700,
    fs: {
      allow: [
        __dirname,
        rhwpWasmDir,
        fontAssetsDir,
        upstreamStudioDir,
      ],
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});
