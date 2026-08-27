import type {
  NativeDialogAdapter,
  NativeDocumentCommand,
} from '../../support/document-ux.ts';
import type { EvidenceFile } from '../../support/evidence.ts';

export interface WindowsNativeUiAdapterOptions {
  cliPath: string;
  outputDir: string;
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
  saveTargets?: Partial<Record<NativeDocumentCommand, string>>;
  evidencePrefix?: string;
  [key: string]: unknown;
}

export class WindowsNativeUiAdapter implements NativeDialogAdapter {
  complete(command: NativeDocumentCommand, trigger: () => Promise<void>): Promise<void>;
  openDocument(path: string, trigger: () => Promise<void>): Promise<void>;
  saveDocument(
    command: NativeDocumentCommand,
    path: string,
    trigger: () => Promise<void>,
  ): Promise<void>;
  cancelDocument(command: 'file:open' | NativeDocumentCommand, trigger: () => Promise<void>): Promise<void>;
  takeEvidenceFiles(): EvidenceFile[];
}

export function createWindowsNativeUiAdapter(
  options: WindowsNativeUiAdapterOptions,
): Promise<WindowsNativeUiAdapter>;
