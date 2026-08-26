import { browser } from '@wdio/globals';
import { readGuiHarnessInputs } from '../wdio.shared.conf.ts';
import { runWindowsGuiProbe } from './probe.mjs';

describe('Windows production driver probe', () => {
  it('WebView와 WinApp CLI가 같은 production window를 고정한다', async () => {
    await runWindowsGuiProbe({
      browser,
      inputs: readGuiHarnessInputs(),
      env: process.env,
    });
  });
});
