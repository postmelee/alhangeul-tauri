import { dirname, join } from 'node:path';
import type { TauriCapabilities } from '@wdio/tauri-service';
import type { UpgradeInputs } from './inputs.ts';

export function productionCapabilities(
  input: Pick<UpgradeInputs, 'appPath' | 'output'>, platform = process.platform,
): TauriCapabilities[] {
  const options: NonNullable<TauriCapabilities['tauri:options']> = { application: input.appPath };
  if (platform === 'win32') {
    // tauri-driver 2.0.6 forwards this documented Edge WebView2 option.
    const webviewOptions: NonNullable<typeof options.webviewOptions> & { userDataFolder: string } = {
      userDataFolder: join(dirname(input.output), 'webview-profile'),
    };
    options.webviewOptions = webviewOptions;
  }
  return [{ browserName: 'tauri', 'tauri:options': options }];
}
