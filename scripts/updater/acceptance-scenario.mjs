#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  UPDATER_ACCEPTANCE_TAG,
} from './acceptance-policy.mjs';
import {
  buildUpdaterAcceptanceManifest,
  validateUpdaterAcceptanceInventory,
  validateUpdaterAcceptanceManifest,
} from './acceptance-inventory.mjs';

export const UPDATER_ACCEPTANCE_SCENARIOS = Object.freeze([
  'cross-format',
  'signature-mismatch',
  'network-failures',
]);

const CLI_OPTIONS = new Set(['--inventory', '--manifest', '--scenario', '--output']);
const TARGETS = Object.freeze({
  nsis: 'windows-x86_64-nsis',
  msi: 'windows-x86_64-msi',
  appimage: 'linux-x86_64-appimage',
});

export function acceptanceScenario(value) {
  if (!UPDATER_ACCEPTANCE_SCENARIOS.includes(value)) {
    throw new Error('updater acceptance negative scenario가 올바르지 않습니다.');
  }
  return value;
}

export function buildUpdaterAcceptanceScenarioManifest(inventory, positiveManifest, scenario) {
  const verifiedInventory = validateUpdaterAcceptanceInventory(inventory);
  const positive = validateUpdaterAcceptanceManifest(positiveManifest, verifiedInventory);
  const selected = acceptanceScenario(scenario);
  const manifest = structuredClone(positive);

  if (selected === 'cross-format') {
    manifest.platforms[TARGETS.nsis] = { ...positive.platforms[TARGETS.msi] };
    manifest.platforms[TARGETS.msi] = { ...positive.platforms[TARGETS.nsis] };
    manifest.platforms[TARGETS.appimage].url = releaseUrl(
      basename(positive.platforms[TARGETS.appimage].url).replace('_amd64.AppImage', '_arm64.AppImage'),
    );
  } else if (selected === 'signature-mismatch') {
    for (const target of Object.values(TARGETS)) {
      manifest.platforms[target].signature = tamperMinisignText(
        positive.platforms[target].signature,
      );
    }
  } else {
    manifest.platforms[TARGETS.nsis].url =
      `https://192.0.2.1/${basename(positive.platforms[TARGETS.nsis].url)}`;
    manifest.platforms[TARGETS.msi].url = missingReleaseUrl(
      basename(positive.platforms[TARGETS.msi].url),
    );
    manifest.platforms[TARGETS.appimage].url = missingReleaseUrl(
      basename(positive.platforms[TARGETS.appimage].url),
    );
  }

  return validateUpdaterAcceptanceScenarioManifest(
    manifest,
    verifiedInventory,
    positive,
    selected,
  );
}

export function validateUpdaterAcceptanceScenarioManifest(
  manifest,
  inventory,
  positiveManifest = null,
  scenario,
) {
  const selected = acceptanceScenario(scenario);
  const baseline = positiveManifest ?? buildUpdaterAcceptanceManifest(inventory, manifest?.pub_date);
  const expected = buildExpectedWithoutValidation(inventory, baseline, selected);
  if (JSON.stringify(manifest) !== JSON.stringify(expected)) {
    throw new Error(`${selected} acceptance manifest가 승인된 negative fixture와 다릅니다.`);
  }
  return manifest;
}

function buildExpectedWithoutValidation(inventory, positiveManifest, scenario) {
  const verifiedInventory = validateUpdaterAcceptanceInventory(inventory);
  const positive = validateUpdaterAcceptanceManifest(positiveManifest, verifiedInventory);
  const manifest = structuredClone(positive);
  if (scenario === 'cross-format') {
    manifest.platforms[TARGETS.nsis] = { ...positive.platforms[TARGETS.msi] };
    manifest.platforms[TARGETS.msi] = { ...positive.platforms[TARGETS.nsis] };
    manifest.platforms[TARGETS.appimage].url = releaseUrl(
      basename(positive.platforms[TARGETS.appimage].url).replace('_amd64.AppImage', '_arm64.AppImage'),
    );
  } else if (scenario === 'signature-mismatch') {
    for (const target of Object.values(TARGETS)) {
      manifest.platforms[target].signature = tamperMinisignText(
        positive.platforms[target].signature,
      );
    }
  } else {
    manifest.platforms[TARGETS.nsis].url =
      `https://192.0.2.1/${basename(positive.platforms[TARGETS.nsis].url)}`;
    manifest.platforms[TARGETS.msi].url = missingReleaseUrl(
      basename(positive.platforms[TARGETS.msi].url),
    );
    manifest.platforms[TARGETS.appimage].url = missingReleaseUrl(
      basename(positive.platforms[TARGETS.appimage].url),
    );
  }
  return manifest;
}

function tamperMinisignText(value) {
  const decoded = Buffer.from(value, 'base64').toString('utf8');
  const lines = decoded.split('\n');
  if (lines.length < 4 || lines[1].length < 2) {
    throw new Error('tamper 대상 updater signature 형식이 올바르지 않습니다.');
  }
  const packet = Buffer.from(lines[1], 'base64');
  if (packet.length !== 74) throw new Error('tamper 대상 signature packet 길이가 다릅니다.');
  packet[10] ^= 1;
  lines[1] = packet.toString('base64');
  return Buffer.from(lines.join('\n'), 'utf8').toString('base64');
}

function releaseUrl(fileName) {
  return `https://github.com/postmelee/alhangeul-tauri/releases/download/${UPDATER_ACCEPTANCE_TAG}/${fileName}`;
}

function missingReleaseUrl(fileName) {
  return `https://github.com/postmelee/alhangeul-tauri/releases/download/updater-test-missing-v99.0.1/${fileName}`;
}

function parseArguments(args) {
  if (args[0] === '--') args = args.slice(1);
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (!CLI_OPTIONS.has(option) || !value || values.has(option)) {
      throw new Error(`올바르지 않은 acceptance scenario option입니다: ${option ?? '<missing>'}`);
    }
    values.set(option, value);
  }
  return values;
}

function parseJson(bytes, name) {
  try { return JSON.parse(bytes.toString('utf8')); }
  catch { throw new Error(`${name} JSON을 읽을 수 없습니다.`); }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArguments(process.argv.slice(2));
    const [inventoryBytes, manifestBytes] = await Promise.all([
      readFile(resolve(args.get('--inventory'))),
      readFile(resolve(args.get('--manifest'))),
    ]);
    const manifest = buildUpdaterAcceptanceScenarioManifest(
      parseJson(inventoryBytes, 'inventory'),
      parseJson(manifestBytes, 'manifest'),
      args.get('--scenario'),
    );
    const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
    await writeFile(resolve(args.get('--output')), serialized, {
      encoding: 'utf8', flag: 'wx', mode: 0o600,
    });
    const digest = createHash('sha256').update(serialized).digest('hex');
    console.log(`Updater acceptance scenario created: ${args.get('--scenario')} sha256:${digest}`);
  } catch (error) {
    console.error(`updater acceptance scenario failed: ${error.message}`);
    process.exitCode = 1;
  }
}
