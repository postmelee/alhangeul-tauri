import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

export interface UpgradeInputs {
  kind: 'msi' | 'nsis' | 'appimage'; phase: 'apply' | 'verify';
  appPath: string; driverPath: string; output: string; root: string;
  target: string; manifestHash: string; endpoint: string;
}

export function readUpgradeInputs(env = process.env): UpgradeInputs {
  const absolute = (key: string) => {
    const value = env[key] ?? '';
    if (!isAbsolute(value) || /[\r\n\0]/.test(value)) throw new Error(`Invalid ${key}`);
    return value;
  };
  const kind = env.ALHANGEUL_PRODUCTION_KIND;
  const phase = env.ALHANGEUL_PRODUCTION_PHASE;
  if (!['msi', 'nsis', 'appimage'].includes(kind ?? '') || !['apply', 'verify'].includes(phase ?? '')) {
    throw new Error('Invalid production upgrade kind/phase');
  }
  const root = absolute('ALHANGEUL_PRODUCTION_ROOT');
  const spec = JSON.parse(readFileSync(join(root, 'tests/gui/production-upgrade-inputs.json'), 'utf8'));
  return { kind: kind as UpgradeInputs['kind'], phase: phase as UpgradeInputs['phase'], root,
    appPath: absolute('ALHANGEUL_PRODUCTION_APP'), driverPath: absolute('ALHANGEUL_PRODUCTION_DRIVER'),
    output: absolute('ALHANGEUL_PRODUCTION_OUTPUT'), endpoint: spec.endpoint,
    manifestHash: spec.manifestSha256,
    target: kind === 'appimage' ? 'linux-x86_64-appimage' : `windows-x86_64-${kind}` };
}
