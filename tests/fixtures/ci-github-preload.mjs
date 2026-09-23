// Test-only CLI transport. Every request resolves locally or throws; no network.
import { deliveryFixture } from './ci-delivery.mjs';
const fixture = deliveryFixture();
fixture.run.status = 'completed'; fixture.run.conclusion = 'success';
globalThis.fetch = async url => {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://api.github.com') throw new Error('unexpected-test-host');
  const response = await fixture.fetchJson(parsed.pathname + parsed.search);
  return { ok: true, json: async () => response };
};
