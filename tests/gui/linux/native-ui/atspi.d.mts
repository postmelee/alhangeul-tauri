import type {
  NativeDialogAdapter,
  NativeDocumentCommand,
} from '../../support/document-ux.ts';

export interface LinuxNativeUiOptions {
  outputDir: string;
  timeoutMs?: number;
  applicationNames?: string[];
  saveTargets?: Partial<Record<NativeDocumentCommand, string>>;
  env?: NodeJS.ProcessEnv;
  captureScreenshot?(path: string): Promise<unknown>;
}

export class LinuxNativeUiAdapter implements NativeDialogAdapter {
  constructor(options: LinuxNativeUiOptions);
  complete(command: NativeDocumentCommand, trigger: () => Promise<void>): Promise<void>;
  openDocument(path: string, trigger: () => Promise<void>): Promise<void>;
  saveDocument(command: string, path: string, trigger: () => Promise<void>): Promise<void>;
  printToFile(path: string, trigger: () => Promise<void>): Promise<void>;
  printWithVirtualPrinter(name: string, trigger: () => Promise<void>): Promise<void>;
  cancelPrint(trigger: () => Promise<void>): Promise<void>;
  triggerSystemPrint(): Promise<void>;
  wait(selector: Record<string, unknown>): Promise<unknown>;
  waitAbsent(selector: Record<string, unknown>): Promise<unknown>;
  actionOptional(
    selector: Record<string, unknown>, timeoutMs?: number,
  ): Promise<{ performed: boolean }>;
  focus(selector: Record<string, unknown>): Promise<unknown>;
  withFailureEvidence<T>(
    label: string,
    action: () => Promise<T>,
    request?: { desktopScope?: boolean },
  ): Promise<T>;
}
