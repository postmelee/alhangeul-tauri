import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { connectCdp, connectWebDriver } from './document-transport.mjs';

const phase = process.argv[2];
assert.ok(['default', 'enabled', 'disabled', 'corrupt'].includes(phase));
const out = join(process.cwd(), 'privacy-evidence');
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const transport = await (process.platform === 'win32' ? connectCdp() : connectWebDriver());
const { evaluate, capture } = transport;
const deadline = setTimeout(() => { console.error('preference observation deadline'); process.exit(1); }, 180_000);
const invoke = (name, args = {}) => evaluate(`window.__TAURI_INTERNALS__.invoke(${JSON.stringify(name)},${JSON.stringify(args)})`);
const get = () => invoke('updater_get_automatic_checks');
async function requests(label) {
  let text;
  try { text = await readFile(join(out, 'tls-requests.jsonl'), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  return text.trim().split('\n').filter(Boolean).map(JSON.parse).filter((row) =>
    row.phase === label && row.host === 'postmelee.github.io'
    && row.path === '/alhangeul-tauri/updater/stable.json');
}
async function toggle(expected) {
  await evaluate(`(() => {
    const checkbox=document.querySelector('[data-testid="automatic-update-checks"]');
    if(!checkbox || checkbox.disabled || checkbox.checked === ${expected}) throw new Error('choice UI unavailable or wrong prior state');
    checkbox.click();
  })()`);
  for (let i = 0; i < 30; i++) {
    if (await get() === expected && await evaluate(`!document.querySelector('[data-testid="automatic-update-checks"]').disabled`)) return;
    await pause(100);
  }
  throw new Error('explicit UI choice was not persisted');
}
async function positiveControl(label) {
  await writeFile(join(out, 'phase'), label);
  const state = await invoke('updater_check');
  assert.ok(['idle', 'available'].includes(state.status), `manual check failed: ${state.status}`);
  await pause(1000);
  assert.ok((await requests(label)).some((row) => row.status === 200 && !row.failed), 'missing successful TLS positive control');
}
const result = { phase, sourceSha: process.env.GITHUB_SHA };
try {
  await pause(20_000);
  assert.equal(await evaluate(`Boolean(document.querySelector('.privacy-notice-dialog'))`), true);
  await writeFile(join(out, `preferences-${phase}.png`), await capture());
  const rows = await requests(phase);
  result.startupRequests = rows.length;
  if (phase === 'enabled') {
    assert.equal(await get(), true);
    assert.ok(rows.some((row) => row.status === 200 && !row.failed), 'enabled restart did not check');
    await toggle(false);
  } else {
    assert.equal(rows.length, 0, 'disabled/unreadable preference issued an automatic request');
    if (phase === 'corrupt') {
      await assert.rejects(get);
      await toggle(true);
      await toggle(false);
      await positiveControl('corrupt-positive-control');
    } else {
      assert.equal(await get(), false);
      if (phase === 'default') {
        await writeFile(join(out, 'phase'), 'choice-enabled');
        await toggle(true);
        await pause(3000);
        assert.equal((await requests('choice-enabled')).length, 0, 'enabling unexpectedly checked immediately');
        await positiveControl('manual-positive-control');
      }
    }
  }
  // Test-profile display reset, independent from the native automatic-check choice.
  await evaluate(`localStorage.removeItem('alhangeul-privacy-notice-v1')`);
  result.passed = true;
} finally {
  await writeFile(join(out, `preferences-${phase}.json`), `${JSON.stringify(result, null, 2)}\n`);
  clearTimeout(deadline);
  await transport.close();
}
