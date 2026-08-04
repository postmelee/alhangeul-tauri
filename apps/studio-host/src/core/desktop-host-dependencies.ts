import { remove } from '@tauri-apps/plugin-fs';
import { writeFileInChunks } from './chunked-fs';
import { readStableDocumentFile, type StableDocumentFile } from './document-files';
import {
  waitForDesktopStudioHandlers,
  type DesktopStudioHandlers,
} from '../embed/desktop-runtime';

export type NativeInvoke = (
  command: string,
  args?: Record<string, unknown>,
) => Promise<unknown>;

export interface DesktopHostDependencies {
  invoke: NativeInvoke;
  chooseOpenPath(): Promise<string | null>;
  chooseHwpSavePath(defaultPath: string): Promise<string | null>;
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
    chooseHwpSavePath: async (defaultPath) => {
      const { save } = await import('@tauri-apps/plugin-dialog');
      return save({ defaultPath, filters: [{ name: 'HWP 문서', extensions: ['hwp'] }] });
    },
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
