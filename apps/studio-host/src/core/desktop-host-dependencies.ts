import { remove } from '@tauri-apps/plugin-fs';
import { writeFileInChunks } from './chunked-fs';
import { readStableDocumentFile, type StableDocumentFile } from './document-files';
import {
  waitForDesktopStudioHandlers,
  type DesktopStudioHandlers,
} from '../embed/desktop-runtime';
import type { DesktopDocumentFormat } from './desktop-session';
import { resolveSaveDialogDefaultPath } from './save-dialog-default-path';

export type NativeInvoke = (
  command: string,
  args?: Record<string, unknown>,
) => Promise<unknown>;

export interface DesktopHostDependencies {
  invoke: NativeInvoke;
  chooseOpenPath(): Promise<string | null>;
  chooseDocumentSavePath(
    defaultPath: string,
    format: DesktopDocumentFormat,
  ): Promise<string | null>;
  choosePdfSavePath(defaultPath: string): Promise<string | null>;
  resolveSaveDefaultPath(fileName: string, sourcePath: string | null): Promise<string>;
  showMessage(message: string, options: Record<string, unknown>): Promise<string | boolean>;
  readDocument(path: string): Promise<StableDocumentFile>;
  writeDocument(path: string, bytes: Uint8Array): Promise<void>;
  removeFile(path: string): Promise<void>;
  handlers(): Promise<DesktopStudioHandlers>;
}

export function createDefaultDesktopHostDependencies(): DesktopHostDependencies {
  return {
    invoke: async (command, args = {}) => {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke(command, args);
    },
    chooseOpenPath: async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        filters: [{ name: 'HWP/HWPX 문서', extensions: ['hwp', 'hwpx'] }],
      });
      return typeof selected === 'string' ? selected : null;
    },
    chooseDocumentSavePath: async (defaultPath, format) => {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const label = format === 'hwpx' ? 'HWPX 문서' : 'HWP 문서';
      return save({ defaultPath, filters: [{ name: label, extensions: [format] }] });
    },
    choosePdfSavePath: async (defaultPath) => {
      const { save } = await import('@tauri-apps/plugin-dialog');
      return save({ defaultPath, filters: [{ name: 'PDF 문서', extensions: ['pdf'] }] });
    },
    resolveSaveDefaultPath: resolveSaveDialogDefaultPath,
    showMessage: async (message, options) => {
      const dialog = await import('@tauri-apps/plugin-dialog');
      return dialog.message(message, options as never);
    },
    readDocument: readStableDocumentFile,
    writeDocument: writeFileInChunks,
    removeFile: (path) => remove(path),
    handlers: waitForDesktopStudioHandlers,
  };
}
