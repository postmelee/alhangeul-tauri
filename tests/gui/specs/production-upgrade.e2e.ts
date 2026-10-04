import { browser } from '@wdio/globals';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readUpgradeInputs } from '../production-upgrade/inputs.ts';
import { verifyManifest, type UpgradeEvidence } from '../production-upgrade/native.ts';
import { applyUpgrade } from '../production-upgrade/apply.ts';
import { verifyUpgrade } from '../production-upgrade/verify.ts';
import { waitForProductionStartup } from '../production-upgrade/startup.ts';

const input = readUpgradeInputs();
describe(`Production ${input.kind} 0.1.0 → 0.1.1 ${input.phase}`, () => {
  it('공개 제품 설치본에서 실제 updater와 재실행 문서 수용을 확인한다', async () => {
    await mkdir(input.output, { recursive: true });
    const evidence: UpgradeEvidence = { schemaVersion: 1, kind: input.kind, phase: input.phase,
      status: 'failed', harnessSha: process.env.HARNESS_SHA, startedAt: new Date().toISOString() };
    try {
      await browser.setTimeout({ script: 300000 });
      await waitForProductionStartup(input, evidence);
      await verifyManifest(input, evidence);
      if (input.phase === 'apply') await applyUpgrade(input, evidence);
      else await verifyUpgrade(input, evidence);
      evidence.status = 'passed';
    } catch (error) {
      evidence.error = error instanceof Error ? error.message : String(error); throw error;
    } finally {
      evidence.finishedAt = new Date().toISOString();
      await writeFile(join(input.output, 'result.json'), `${JSON.stringify(evidence, null, 2)}\n`);
    }
  });
});
