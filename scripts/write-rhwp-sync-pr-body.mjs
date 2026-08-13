#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertBaseBranch,
  assertReleaseUrl,
  assertSha,
  assertStableTag,
  automationBranch,
} from './rhwp-upstream-release-policy.mjs';

const safePathPattern = /^[A-Za-z0-9._/-]+$/;
const usage = `Usage: node scripts/write-rhwp-sync-pr-body.mjs
  --current-tag <tag> --current-commit <sha>
  --target-tag <tag> --target-commit <sha>
  --release-url <url> --base-branch <name> --branch <name>
  --changed-paths-file <path> --output <path>`;

export async function writeRhwpSyncPrBody(options) {
  if (typeof options.changedPathsFile !== 'string' || typeof options.output !== 'string') {
    throw new Error('changed-paths-file과 output 경로가 필요합니다.');
  }
  const changedPathsSource = await (options.readFile ?? readFile)(
    resolve(options.changedPathsFile),
    'utf8',
  );
  const body = buildRhwpSyncPrBody({
    ...options,
    changedPaths: parseChangedPaths(changedPathsSource),
  });
  await (options.writeFile ?? writeFile)(resolve(options.output), body);
  return body;
}

export function buildRhwpSyncPrBody(options) {
  const values = validateOptions(options);
  if (!Array.isArray(options.changedPaths)) throw new Error('changed paths 배열이 필요합니다.');
  if (new Set(options.changedPaths).size !== options.changedPaths.length) {
    throw new Error('changed paths에 중복 경로가 있습니다.');
  }
  const paths = [...new Set(options.changedPaths)].sort();
  if (paths.length === 0) throw new Error('changed paths가 비어 있습니다.');
  for (const path of paths) assertSafePath(path);

  return `## rhwp Stable full sync candidate

이 draft PR은 자동 생성된 검토 후보이며 자동 merge 또는 제품 수용 완료를 뜻하지 않습니다.

### Provenance

| 항목 | 현재 | 대상 |
|---|---|---|
| Stable release | \`${values.currentTag}\` | \`${values.targetTag}\` |
| Resolved commit | \`${values.currentCommit}\` | \`${values.targetCommit}\` |

- Upstream release: ${values.releaseUrl}
- Automation branch: \`${values.branch}\`
- Base branch: \`${values.baseBranch}\`

### Changed paths

${paths.map((path) => `- \`${path}\``).join('\n')}

### Automated validation

- [x] 공개 Stable release metadata와 dereferenced Git tag commit 검증
- [x] 관리 참조 marker preflight와 exact allowlist 갱신
- [x] \`scripts/update-upstream.sh\` source·lock·WASM·provenance 갱신
- [x] product boundary·version·release metadata·rhwp pin 검사
- [x] automation·upstream·Studio test와 Studio production build
- [x] Ubuntu desktop Rust test와 Clippy preflight
- [x] repository changed-path allowlist와 \`git diff --check\`

release별 known issue 기록은 current pin 관리 참조가 아니므로 자동 갱신하지 않습니다.

### Native acceptance pending

- [ ] Windows native build·설치·실행 검증
- [ ] Linux native Tauri build·설치·실행 검증
- [ ] source diff와 adapter 영향 검토

후속 native 수용은 target release를 명시한 별도 GitHub Issue에서 하이퍼-워터폴
절차로 진행합니다. 이 candidate는 수용 Issue를 자동으로 닫거나 release,
tag 또는 package publish를 수행하지 않습니다.
`;
}

export function parseChangedPaths(source) {
  const paths = source.split(/\r?\n/).filter(Boolean);
  if (paths.length === 0) throw new Error('changed paths가 비어 있습니다.');
  if (new Set(paths).size !== paths.length) throw new Error('changed paths에 중복 경로가 있습니다.');
  for (const path of paths) assertSafePath(path);
  return paths;
}

function validateOptions(options = {}) {
  const values = {};
  for (const key of ['currentTag', 'targetTag']) {
    try { assertStableTag(options[key]); } catch { throw new Error(`${key} Stable release tag 형식이 올바르지 않습니다: ${options[key]}`); }
    values[key] = options[key];
  }
  for (const key of ['currentCommit', 'targetCommit']) {
    try { assertSha(options[key], `${key} resolved commit`); } catch { throw new Error(`${key} resolved commit 형식이 올바르지 않습니다: ${options[key]}`); }
    values[key] = options[key];
  }
  assertBaseBranch(options.baseBranch);
  values.baseBranch = options.baseBranch;
  const expectedBranch = automationBranch(values.targetTag);
  if (options.branch !== expectedBranch) {
    throw new Error(`automation branch가 target tag와 다릅니다: ${options.branch}`);
  }
  assertReleaseUrl(options.releaseUrl, values.targetTag);
  values.branch = options.branch;
  values.releaseUrl = options.releaseUrl;
  return values;
}

function assertSafePath(path) {
  if (!safePathPattern.test(path) || path.startsWith('/') || path.includes('..')) {
    throw new Error(`changed path가 올바르지 않습니다: ${path}`);
  }
}

function parseArguments(args) {
  const options = {};
  if (args.length === 1 && args[0] === '--help') return { help: true };
  const allowed = new Set([
    '--current-tag', '--current-commit', '--target-tag', '--target-commit',
    '--release-url', '--base-branch', '--branch', '--changed-paths-file', '--output',
  ]);
  for (let index = 0; index < args.length; index += 2) {
    const arg = args[index];
    const value = args[index + 1];
    if (!allowed.has(arg) || !value) throw new Error(`지원하지 않는 인자입니다: ${arg}\n${usage}`);
    options[arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
  }
  return options;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) console.log(usage);
    else {
      await writeRhwpSyncPrBody(options);
      console.log(`rhwp sync PR body written: ${options.output}`);
    }
  } catch (error) {
    console.error(`rhwp sync PR body failed: ${error.message}`);
    process.exitCode = 1;
  }
}
