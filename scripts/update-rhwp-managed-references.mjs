#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRepositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stableTagPattern = /^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const shaPattern = /^[0-9a-f]{40}$/;
const usage = `Usage: node scripts/update-rhwp-managed-references.mjs
  --from-tag <tag> --from-commit <sha>
  --to-tag <tag> --to-commit <sha>`;

export const MANAGED_REFERENCE_PATHS = Object.freeze([
  'README.md',
  'docs/DEVELOPMENT.md',
  'docs/architecture/UPSTREAM.md',
  'tests/rhwp-pin.test.mjs',
  'apps/studio-host/src/core/upstream-boundary.test.ts',
]);

export async function updateRhwpManagedReferences(options) {
  const values = validateOptions(options);
  if (values.fromTag === values.toTag && values.fromCommit === values.toCommit) {
    return Object.freeze({ changedFiles: [] });
  }
  const repositoryRoot = resolve(options.repositoryRoot ?? defaultRepositoryRoot);
  const io = {
    readFile: options.io?.readFile ?? readFile,
    writeFile: options.io?.writeFile ?? writeFile,
  };
  const sources = new Map(await Promise.all(MANAGED_REFERENCE_PATHS.map(async (path) => [
    path,
    await io.readFile(resolve(repositoryRoot, path), 'utf8'),
  ])));
  const updated = new Map();

  for (const rule of referenceRules(values)) {
    const source = updated.get(rule.path) ?? sources.get(rule.path);
    const occurrenceCount = countOccurrences(source, rule.from);
    if (occurrenceCount !== rule.count) {
      throw new Error(
        `${rule.path} ${rule.id} marker 개수가 올바르지 않습니다: ${occurrenceCount} (expected ${rule.count})`,
      );
    }
    updated.set(rule.path, source.split(rule.from).join(rule.to));
  }

  const changedFiles = MANAGED_REFERENCE_PATHS.filter(
    (path) => updated.get(path) !== sources.get(path),
  );
  for (const path of changedFiles) {
    await io.writeFile(resolve(repositoryRoot, path), updated.get(path));
  }
  return Object.freeze({ changedFiles });
}

function referenceRules(values) {
  const { fromTag, fromCommit, toTag, toCommit } = values;
  return [
    exactRule(
      'README.md',
      'current-pin',
      `- 현재 Stable pin: \`${fromTag}\` (\`${fromCommit}\`)`,
      `- 현재 Stable pin: \`${toTag}\` (\`${toCommit}\`)`,
    ),
    exactRule(
      'docs/DEVELOPMENT.md',
      'current-pin',
      `현재 source submodule, native Cargo lock과 bundled WASM은 \`rhwp ${fromTag}\`의 resolved commit \`${fromCommit}\`로 고정되어 있다.`,
      `현재 source submodule, native Cargo lock과 bundled WASM은 \`rhwp ${toTag}\`의 resolved commit \`${toCommit}\`로 고정되어 있다.`,
    ),
    commandRule('docs/DEVELOPMENT.md', fromTag, fromCommit, toTag, toCommit),
    exactRule(
      'docs/architecture/UPSTREAM.md',
      'current-state',
      `- Stable release tag: \`${fromTag}\`\n- resolved commit: \`${fromCommit}\``,
      `- Stable release tag: \`${toTag}\`\n- resolved commit: \`${toCommit}\``,
    ),
    commandRule('docs/architecture/UPSTREAM.md', fromTag, fromCommit, toTag, toCommit),
    exactRule(
      'tests/rhwp-pin.test.mjs',
      'repository-pin-expectation',
      `  assert.equal(pin.rhwp_release_tag, '${fromTag}');\n  assert.equal(pin.rhwp_commit, '${fromCommit}');`,
      `  assert.equal(pin.rhwp_release_tag, '${toTag}');\n  assert.equal(pin.rhwp_commit, '${toCommit}');`,
    ),
    exactRule(
      'apps/studio-host/src/core/upstream-boundary.test.ts',
      'expected-commit',
      `const expectedUpstreamCommit = '${fromCommit}';`,
      `const expectedUpstreamCommit = '${toCommit}';`,
    ),
    exactRule(
      'apps/studio-host/src/core/upstream-boundary.test.ts',
      'expected-release-tag',
      `    expect(releaseTag).toBe('${fromTag}');`,
      `    expect(releaseTag).toBe('${toTag}');`,
    ),
  ];
}

function commandRule(path, fromTag, fromCommit, toTag, toCommit) {
  return exactRule(
    path,
    'reproduction-command',
    `  --tag ${fromTag} \\\n  --commit ${fromCommit} \\\n`,
    `  --tag ${toTag} \\\n  --commit ${toCommit} \\\n`,
  );
}

function exactRule(path, id, from, to) {
  return Object.freeze({ path, id, from, to, count: 1 });
}

function countOccurrences(source, marker) {
  if (marker === '') throw new Error('빈 marker는 허용하지 않습니다.');
  return source.split(marker).length - 1;
}

function validateOptions(options = {}) {
  const values = {};
  for (const key of ['fromTag', 'toTag']) {
    if (!stableTagPattern.test(options[key] ?? '')) {
      throw new Error(`${key} Stable release tag 형식이 올바르지 않습니다: ${options[key]}`);
    }
    values[key] = options[key];
  }
  for (const key of ['fromCommit', 'toCommit']) {
    if (!shaPattern.test(options[key] ?? '')) {
      throw new Error(`${key} resolved commit 형식이 올바르지 않습니다: ${options[key]}`);
    }
    values[key] = options[key];
  }
  if ((values.fromTag === values.toTag) !== (values.fromCommit === values.toCommit)) {
    throw new Error('tag와 commit은 함께 변경되거나 함께 동일해야 합니다.');
  }
  return values;
}

function parseArguments(args) {
  const options = {};
  if (args.length === 1 && args[0] === '--help') return { help: true };
  for (let index = 0; index < args.length; index += 2) {
    const arg = args[index];
    const value = args[index + 1];
    if (!['--from-tag', '--from-commit', '--to-tag', '--to-commit'].includes(arg) || !value) {
      throw new Error(`지원하지 않는 인자입니다: ${arg ?? '<missing>'}\n${usage}`);
    }
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
      const result = await updateRhwpManagedReferences(options);
      console.log(`rhwp managed references updated: ${result.changedFiles.length} file(s)`);
    }
  } catch (error) {
    console.error(`rhwp managed reference update failed: ${error.message}`);
    process.exitCode = 1;
  }
}
