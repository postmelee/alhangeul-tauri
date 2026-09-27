import type { ViewRect } from '../../support/document-ux.ts';

export function dragFileIntoWindow(options: {
  filePath: string;
  targetRect: ViewRect;
  evidencePath?: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}): Promise<void>;
