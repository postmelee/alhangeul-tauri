import { createHash } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

export type DocumentFixtureId = 'biz-plan-hwp' | 'form-hwpx';
export type DocumentFormat = 'hwp' | 'hwpx';

interface DocumentFixtureSpec {
  id: DocumentFixtureId;
  format: DocumentFormat;
  relativePath: string;
  expectedSha256: string;
  expectedPageCount: number | null;
}

export interface DocumentFixture extends DocumentFixtureSpec {
  absolutePath: string;
  size: number;
  sha256: string;
}

export const DOCUMENT_FIXTURE_SPECS: readonly DocumentFixtureSpec[] = [
  {
    id: 'biz-plan-hwp',
    format: 'hwp',
    relativePath: 'third_party/rhwp/samples/biz_plan.hwp',
    expectedSha256: '8b786d6824622afae2220b203beeef6e5592157e1896fea055ebc602817113c1',
    expectedPageCount: 6,
  },
  {
    id: 'form-hwpx',
    format: 'hwpx',
    relativePath: 'third_party/rhwp/samples/hwpx/form-002.hwpx',
    expectedSha256: '5ab8f7c368e02538f75f1cd2bd82bbd8de2f925a54ba7b38ec9395b2cdb804d4',
    expectedPageCount: null,
  },
] as const;

export async function resolveDocumentFixtures(root: string): Promise<DocumentFixture[]> {
  if (!isAbsolute(root)) throw new Error('fixture root는 절대 경로여야 합니다');
  const canonicalRoot = await realpath(root);
  const fixtures: DocumentFixture[] = [];

  for (const spec of DOCUMENT_FIXTURE_SPECS) {
    const requestedPath = resolve(canonicalRoot, spec.relativePath);
    const absolutePath = await realpath(requestedPath);
    assertWithinRoot(canonicalRoot, absolutePath);
    const metadata = await stat(absolutePath);
    if (!metadata.isFile() || metadata.size <= 0) {
      throw new Error(`${spec.id} fixture가 비어 있거나 일반 파일이 아닙니다`);
    }
    const sha256 = createHash('sha256').update(await readFile(absolutePath)).digest('hex');
    if (sha256 !== spec.expectedSha256) {
      throw new Error(`${spec.id} fixture SHA-256이 고정값과 다릅니다`);
    }
    fixtures.push({ ...spec, absolutePath, size: metadata.size, sha256 });
  }
  return fixtures;
}

export function fixtureById(
  fixtures: readonly DocumentFixture[],
  id: DocumentFixtureId,
): DocumentFixture {
  const fixture = fixtures.find((candidate) => candidate.id === id);
  if (!fixture) throw new Error(`${id} fixture가 준비되지 않았습니다`);
  return fixture;
}

function assertWithinRoot(root: string, path: string): void {
  const child = relative(root, path);
  if (child === '' || child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child)) {
    throw new Error('fixture path가 repository root 밖을 가리킵니다');
  }
}
