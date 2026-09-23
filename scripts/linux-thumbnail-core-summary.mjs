import { readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { BUDGETS, FIXTURES, MANIFEST_ID, RHWP_SHA, expectedRecords } from './linux-thumbnail-core-fixtures.mjs';

// stdout 원문/JSON parser의 원문 포함 오류는 artifact에 내보내지 않는다.
export function parseProbeResult(raw) {
  let result;
  try { result = JSON.parse(raw); } catch { return { parseError: 'invalid-json' }; }
  if (typeof result?.success !== 'boolean') return { parseError: 'invalid-result' };
  if (!result.success) return { success: false };
  return { success: true, width: result.width, height: result.height, payloadBytes: result.payloadBytes };
}

export function parseRecords(raw) {
  const records = [], breaches = [];
  raw.split(/\r?\n/).filter((line) => line.trim()).forEach((line, index) => {
    try { records.push(JSON.parse(line)); } catch { breaches.push(`record-json-invalid:${index + 1}`); }
  });
  return { records, breaches };
}

function validBitmap(result, edge) {
  const dimensions = [result.width, result.height];
  return dimensions.every((value) => Number.isInteger(value) && value > 0 && value <= edge)
    && Number.isInteger(result.payloadBytes)
    && result.payloadBytes === result.width * result.height * 4;
}

function fixtureBreaches(record, expected) {
  if (!expected) return ['unknown-fixture-or-combination'];
  const { fixture } = expected;
  const identity = [
    [record.edge, expected.edge], [record.fixtureId, `fixture-${fixture.sha256}`],
    [record.fixtureClass, fixture.fixtureClass], [record.format, fixture.format],
    [record.original?.bytes, fixture.bytes],
  ];
  return identity.every(([actual, wanted]) => actual === wanted) ? [] : ['fixture-identity-mismatch'];
}

function processBreaches(record) {
  const breaches = [];
  if (record.exitCode !== 0) breaches.push('process-exit');
  if (record.timedOut !== false) breaches.push('process-timeout');
  if (!Number.isFinite(record.wallMs) || record.wallMs < 0) breaches.push('invalid-wall-ms');
  if (!Number.isFinite(record.peakRssBytes) || record.peakRssBytes <= 0) breaches.push('invalid-peak-rss');
  return breaches;
}

function renderBreaches(record, expected) {
  const breaches = [];
  const result = record.result;
  if (result?.parseError) breaches.push('probe-json-invalid');
  if (typeof result?.success !== 'boolean') breaches.push('invalid-probe-result');
  if (expected && result?.success !== expected.expectedSuccess) breaches.push('unexpected-render-result');
  if (result?.success === true && !validBitmap(result, record.edge)) breaches.push('invalid-bitmap');
  return breaches;
}

function budgetBreaches(record, expected) {
  if (!expected?.expectedSuccess) return [];
  const breaches = [];
  if (record.wallMs > BUDGETS.wallMs) breaches.push('wall-budget-exceeded');
  if (record.peakRssBytes > BUDGETS.peakRssBytes) breaches.push('rss-budget-exceeded');
  return breaches;
}

function evaluateRecords(records, expected) {
  const counts = new Map();
  const evaluations = records.map((value, index) => {
    const record = value ?? {};
    const key = `${record.original?.sha256}:${record.mode}:${record.edge}`;
    const match = expected.get(key);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return {
      index, key, expectedSuccess: match?.expectedSuccess ?? null,
      observedSuccess: typeof record.result?.success === 'boolean' ? record.result.success : null,
      breaches: [
        ...fixtureBreaches(record, match), ...processBreaches(record),
        ...renderBreaches(record, match), ...budgetBreaches(record, match),
      ],
    };
  });
  const breaches = [];
  for (const key of expected.keys()) {
    const count = counts.get(key) ?? 0;
    if (count !== 1) breaches.push(`${count === 0 ? 'missing' : 'duplicate'}-record:${key}`);
  }
  return { evaluations, breaches };
}

function metricStats(records, field) {
  const values = records.map((record) => record?.[field]).filter(Number.isFinite).sort((a, b) => a - b);
  return { p95: values[Math.max(0, Math.ceil(values.length * 0.95) - 1)] ?? null, max: values.at(-1) ?? null };
}

export function summarize(records, metadata, inputBreaches = []) {
  const expected = new Map(expectedRecords().map((entry) => [entry.key, entry]));
  const result = evaluateRecords(records, expected);
  const breaches = [...inputBreaches, ...result.breaches];
  if (!/^[a-f0-9]{40}$/.test(metadata.repositorySha ?? '')) breaches.push('invalid-repository-sha');
  if (metadata.rhwpSha !== RHWP_SHA) breaches.push('rhwp-pin-mismatch');
  const wall = metricStats(records, 'wallMs'), rss = metricStats(records, 'peakRssBytes');
  return {
    schemaVersion: 2, kind: 'alhangeul-linux-thumbnail-core-probe',
    status: breaches.length === 0 && result.evaluations.every((item) => item.breaches.length === 0) ? 'passed' : 'failed',
    repositorySha: metadata.repositorySha, rhwpSha: metadata.rhwpSha, runner: metadata.runner,
    manifest: { id: MANIFEST_ID, rhwpSha: RHWP_SHA, fixtureCount: FIXTURES.length, expectedRecordCount: expected.size },
    budgets: BUDGETS,
    observed: {
      recordCount: records.length, wallMsP95: wall.p95, wallMsMax: wall.max,
      peakRssBytesP95: rss.p95, peakRssBytesMax: rss.max,
    },
    breaches, evaluations: result.evaluations, records,
  };
}

function main(args) {
  if (args.length !== 2) throw new Error('usage: linux-thumbnail-core-summary.mjs <records.ndjson> <summary.json> | --parse-result <stdout>');
  if (args[0] === '--parse-result') {
    process.stdout.write(JSON.stringify(parseProbeResult(readFileSync(args[1], 'utf8'))));
    return;
  }
  let input;
  try { input = parseRecords(readFileSync(args[0], 'utf8')); }
  catch { input = { records: [], breaches: ['records-read-failed'] }; }
  const summary = summarize(input.records, {
    repositorySha: process.env.REPOSITORY_SHA, rhwpSha: process.env.RHWP_SHA,
    runner: { platform: os.platform(), release: os.release(), architecture: os.arch() },
  }, input.breaches);
  writeFileSync(args[1], `${JSON.stringify(summary, null, 2)}\n`);
  if (summary.status !== 'passed') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
