import type { EvidenceFile } from '../../support/evidence.ts';

export function dragFileIntoWindow(options: {
  filePath: string;
  outputDir: string;
  timeoutMs: number;
  cliPath: string;
  env?: NodeJS.ProcessEnv;
}): Promise<EvidenceFile[]>;
