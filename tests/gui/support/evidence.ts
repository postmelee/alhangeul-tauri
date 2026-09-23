import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import type { DocumentFixture } from './document-fixture.ts';
import type { GuiHarnessInputs } from '../wdio.shared.conf.ts';

export type EvidenceStatus = 'success' | 'failure';
export type EvidenceFileKind = 'screenshot' | 'log' | 'generated-document';

export interface EvidenceFile {
  kind: EvidenceFileKind;
  path: string;
  size: number;
  sha256: string;
}

export interface ScenarioEvidence {
  schemaVersion: 1;
  identity: {
    buildRef: string;
    nativeRunId: string;
    appVersion: string;
    driverVersion: string;
  };
  scenario: string;
  status: EvidenceStatus;
  startedAt: string;
  completedAt: string;
  fixtures: Array<{
    id: string;
    format: string;
    path: string;
    size: number;
    sha256: string;
  }>;
  files: EvidenceFile[];
  error?: string;
}

export function createScenarioEvidence(options: {
  inputs: GuiHarnessInputs;
  scenario: string;
  status: EvidenceStatus;
  startedAt: Date;
  completedAt: Date;
  fixtures: readonly DocumentFixture[];
  files?: EvidenceFile[];
  error?: unknown;
}): ScenarioEvidence {
  const { inputs } = options;
  return {
    schemaVersion: 1,
    identity: {
      buildRef: inputs.buildRef,
      nativeRunId: inputs.nativeRunId,
      appVersion: inputs.appVersion,
      driverVersion: inputs.driverVersion,
    },
    scenario: safeLabel(options.scenario),
    status: options.status,
    startedAt: options.startedAt.toISOString(),
    completedAt: options.completedAt.toISOString(),
    fixtures: options.fixtures.map((fixture) => ({
      id: fixture.id,
      format: fixture.format,
      path: fixture.relativePath,
      size: fixture.size,
      sha256: fixture.sha256,
    })),
    files: options.files ?? [],
    ...(options.error === undefined ? {} : {
      error: sanitizeEvidenceText(String(errorMessage(options.error)), inputs),
    }),
  };
}

export async function describeEvidenceFile(
  outputRoot: string,
  filePath: string,
  kind: EvidenceFileKind,
): Promise<EvidenceFile> {
  if (!isAbsolute(outputRoot) || !isAbsolute(filePath)) {
    throw new Error('evidence root와 파일은 절대 경로여야 합니다');
  }
  const safePath = assertOutputPath(outputRoot, filePath);
  const metadata = await stat(safePath);
  if (!metadata.isFile() || metadata.size <= 0) throw new Error('evidence 파일이 비어 있습니다');
  const content = await readFile(safePath);
  return {
    kind,
    path: portableRelative(outputRoot, safePath),
    size: metadata.size,
    sha256: createHash('sha256').update(content).digest('hex'),
  };
}

export async function writeScenarioEvidence(
  outputRoot: string,
  manifest: ScenarioEvidence,
): Promise<string> {
  const scenarioDir = resolve(outputRoot, 'scenarios', safeLabel(manifest.scenario));
  const path = assertOutputPath(outputRoot, resolve(scenarioDir, 'evidence.json'));
  await mkdir(scenarioDir, { recursive: true });
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  return path;
}

export function sanitizeEvidenceText(text: string, inputs: GuiHarnessInputs): string {
  let sanitized = text;
  for (const [value, label] of [
    [inputs.fixtureRoot, '$FIXTURE_ROOT'],
    [inputs.outputDir, '$OUTPUT_ROOT'],
    [inputs.appPath, '$APP_PATH'],
    [inputs.driverPath, '$DRIVER_PATH'],
  ] as const) {
    sanitized = sanitized.split(value).join(label);
  }
  return sanitized
    .replace(/\bBearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
    .replace(/\bgh[pousr]_[A-Za-z0-9_]+\b/g, '[REDACTED_TOKEN]')
    .replace(/\bgithub_pat_[A-Za-z0-9_]+\b/g, '[REDACTED_TOKEN]')
    .replace(/\b(token|authorization)=([^\s&]+)/gi, '$1=[REDACTED]');
}

function assertOutputPath(outputRoot: string, path: string): string {
  const child = relative(resolve(outputRoot), resolve(path));
  if (child === '' || child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child)) {
    throw new Error('evidence path가 output root 밖을 가리킵니다');
  }
  return resolve(path);
}

function portableRelative(root: string, path: string): string {
  return relative(resolve(root), resolve(path)).split(sep).join('/');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function safeLabel(value: string): string {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(value)) throw new Error('scenario 이름이 유효하지 않습니다');
  return value;
}
