import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  createGitHubApiClient,
  verifyWorkflowArtifact,
  writeWorkflowArtifactOutputs,
} from '../scripts/verify-workflow-artifact.mjs';

const repository = 'postmelee/alhangeul-tauri';
const buildRef = 'a'.repeat(40);
const runId = 123456789;
const artifactName = 'alhangeul-desktop-linux-x64';
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const scriptPath = join(repoRoot, 'scripts/verify-workflow-artifact.mjs');

test('exact workflow run과 Linux x64 artifact를 구조화 handoff로 판정한다', async () => {
  const requests = [];
  const result = await verifyWorkflowArtifact(inputs(), {
    fetchJson: async (path) => {
      requests.push(path);
      return path.includes('/artifacts?') ? artifactResponse() : workflowRun();
    },
  });

  assert.deepEqual(result, {
    repository,
    buildRef,
    nativeRunId: runId,
    workflowPath: '.github/workflows/alhangeul-desktop.yml',
    artifactId: 987654321,
    artifactName,
    artifactSize: 1024,
    artifactDigest: `sha256:${'b'.repeat(64)}`,
  });
  assert.deepEqual(requests, [
    `/repos/${repository}/actions/runs/${runId}`,
    `/repos/${repository}/actions/runs/${runId}/artifacts?per_page=100&page=1&name=${artifactName}`,
  ]);
});

for (const [name, mutate, error] of [
  ['다른 run ID', (run) => { run.id += 1; }, /workflow run ID/],
  ['다른 repository', (run) => { run.repository.full_name = 'postmelee/other'; }, /workflow repository/],
  ['다른 head repository', (run) => { run.head_repository.full_name = 'fork/alhangeul-tauri'; }, /head repository/],
  ['다른 head SHA', (run) => { run.head_sha = 'c'.repeat(40); }, /workflow head SHA/],
  ['다른 event', (run) => { run.event = 'pull_request'; }, /workflow event/],
  ['미완료 run', (run) => { run.status = 'in_progress'; }, /workflow status/],
  ['실패 run', (run) => { run.conclusion = 'failure'; }, /workflow conclusion/],
  ['다른 workflow', (run) => { run.path = '.github/workflows/ci.yml@devel'; }, /workflow path/],
]) {
  test(`${name}은 artifact 조회 전에 거부한다`, async () => {
    let artifactRequested = false;
    await assert.rejects(
      verifyWorkflowArtifact(inputs(), {
        fetchJson: async (path) => {
          if (path.includes('/artifacts?')) artifactRequested = true;
          const run = workflowRun();
          mutate(run);
          return run;
        },
      }),
      error,
    );
    assert.equal(artifactRequested, false);
  });
}

for (const [name, artifacts, error] of [
  ['누락', [], /exact artifact가 1개가 아닙니다/],
  ['중복', [artifact(), artifact({ id: 987654322 })], /exact artifact가 1개가 아닙니다/],
  ['만료', [artifact({ expired: true })], /만료/],
  ['0 byte', [artifact({ size_in_bytes: 0 })], /artifact size/],
  ['digest 누락', [artifact({ digest: null })], /digest/],
  ['다른 run', [artifact({ workflow_run: artifactRun({ id: runId + 1 }) })], /artifact workflow run ID/],
  ['다른 repository ID', [artifact({ workflow_run: artifactRun({ repository_id: 99 }) })], /artifact repository ID/],
  ['다른 head repository ID', [artifact({ workflow_run: artifactRun({ head_repository_id: 98 }) })], /artifact head repository ID/],
  ['다른 head SHA', [artifact({ workflow_run: artifactRun({ head_sha: 'd'.repeat(40) }) })], /artifact head SHA/],
]) {
  test(`${name} artifact metadata를 거부한다`, async () => {
    await assert.rejects(
      verifyWorkflowArtifact(inputs(), {
        fetchJson: async (path) => (
          path.includes('/artifacts?')
            ? { total_count: artifacts.length, artifacts }
            : workflowRun()
        ),
      }),
      error,
    );
  });
}

test('artifact pagination을 끝까지 읽고 exact 이름 중복을 탐지한다', async () => {
  const firstPage = Array.from({ length: 100 }, (_, index) => artifact({
    id: index + 1,
    name: `diagnostic-${index}`,
  }));
  firstPage[0] = artifact({ id: 1 });
  await assert.rejects(
    verifyWorkflowArtifact(inputs(), {
      fetchJson: async (path) => {
        if (!path.includes('/artifacts?')) return workflowRun();
        return path.includes('&page=1&')
          ? { total_count: 101, artifacts: firstPage }
          : { total_count: 101, artifacts: [artifact({ id: 101 })] };
      },
    }),
    /exact artifact가 1개가 아닙니다/,
  );
});

test('artifact total_count 불일치와 끝나지 않는 pagination을 거부한다', async () => {
  await assert.rejects(
    verifyWorkflowArtifact(inputs(), {
      fetchJson: async (path) => (
        path.includes('/artifacts?')
          ? { total_count: 0, artifacts: [artifact()] }
          : workflowRun()
      ),
    }),
    /total_count/,
  );
  let page = 0;
  await assert.rejects(
    verifyWorkflowArtifact(inputs(), {
      fetchJson: async (path) => {
        if (!path.includes('/artifacts?')) return workflowRun();
        page += 1;
        return { total_count: 10001, artifacts: [artifact({ id: page, name: `diagnostic-${page}` })] };
      },
    }),
    /pagination이 허용 범위/,
  );
});

for (const [name, override, error] of [
  ['repository', { repository: 'invalid' }, /owner\/repo/],
  ['대문자 SHA', { buildRef: 'A'.repeat(40) }, /소문자 40자리/],
  ['짧은 SHA', { buildRef: 'a'.repeat(39) }, /40자리/],
  ['0 run ID', { runId: '0' }, /양의 정수/],
  ['지수 run ID', { runId: '1e3' }, /양의 정수/],
  ['workflow traversal', { workflowPath: '../ci.yml' }, /workflow path/],
  ['artifact 줄바꿈', { artifactName: 'bundle\nother' }, /단일행/],
]) {
  test(`잘못된 ${name} 입력을 network 전에 거부한다`, async () => {
    await assert.rejects(
      verifyWorkflowArtifact(inputs(override), {
        fetchJson: async () => assert.fail('잘못된 입력은 network를 호출하지 않아야 한다'),
      }),
      error,
    );
  });
}

test('JSON과 GitHub output에 exact handoff 값만 기록한다', async () => {
  const writes = [];
  const appends = [];
  const result = await verifyWorkflowArtifact(inputs(), {
    fetchJson: async (path) => (path.includes('/artifacts?') ? artifactResponse() : workflowRun()),
  });
  await writeWorkflowArtifactOutputs(result, {
    jsonOutput: '/tmp/handoff.json',
    githubOutput: '/tmp/github-output',
    writeFile: async (...args) => writes.push(args),
    appendFile: async (...args) => appends.push(args),
  });

  assert.equal(JSON.parse(writes[0][1]).artifactId, 987654321);
  assert.match(appends[0][1], /^build_ref=a{40}$/m);
  assert.match(appends[0][1], /^native_run_id=123456789$/m);
  assert.match(appends[0][1], /^artifact_id=987654321$/m);
  assert.doesNotMatch(appends[0][1], /token|Authorization/i);
});

test('GitHub API client는 version header를 고정하고 HTTP 오류 본문을 노출하지 않는다', async () => {
  const calls = [];
  const client = createGitHubApiClient({
    token: 'secret-value',
    apiUrl: 'https://github.example/api/v3/',
    fetchImpl: async (...args) => {
      calls.push(args);
      return { ok: true, json: async () => ({ ok: true }) };
    },
  });
  assert.deepEqual(await client('/repos/o/r/actions/runs/1'), { ok: true });
  assert.equal(calls[0][0], 'https://github.example/api/v3/repos/o/r/actions/runs/1');
  assert.equal(calls[0][1].headers.Authorization, 'Bearer secret-value');
  assert.equal(calls[0][1].headers['X-GitHub-Api-Version'], '2026-03-10');

  const failing = createGitHubApiClient({
    fetchImpl: async () => ({ ok: false, status: 403 }),
  });
  await assert.rejects(failing('/forbidden'), /^Error: GitHub Actions metadata 요청이 실패했습니다: HTTP 403$/);
  assert.throws(
    () => createGitHubApiClient({ apiUrl: 'http://github.example/api/v3' }),
    /GitHub API URL/,
  );
});

test('CLI help는 network나 repository write 없이 동작한다', () => {
  const result = spawnSync(process.execPath, [scriptPath, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /--repository <owner\/repo>/);
});

function inputs(override = {}) {
  return { repository, buildRef, runId, ...override };
}

function workflowRun(override = {}) {
  return {
    id: runId,
    event: 'workflow_dispatch',
    status: 'completed',
    conclusion: 'success',
    head_sha: buildRef,
    path: '.github/workflows/alhangeul-desktop.yml@refs/heads/devel',
    repository: { id: 10, full_name: repository },
    head_repository: { id: 10, full_name: repository },
    ...override,
  };
}

function artifactRun(override = {}) {
  return {
    id: runId,
    repository_id: 10,
    head_repository_id: 10,
    head_sha: buildRef,
    ...override,
  };
}

function artifact(override = {}) {
  return {
    id: 987654321,
    name: artifactName,
    size_in_bytes: 1024,
    expired: false,
    digest: `sha256:${'b'.repeat(64)}`,
    workflow_run: artifactRun(),
    ...override,
  };
}

function artifactResponse() {
  return { total_count: 1, artifacts: [artifact()] };
}
