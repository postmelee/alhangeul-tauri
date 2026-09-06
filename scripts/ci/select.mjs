import { appendFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { selectValidation } from './profiles.mjs';

try {
  const supported = ['auto', 'fast', 'native', 'installer', 'windows-package', 'linux-package', 'full'];
  let profile = process.env.VALIDATION_PROFILE ?? 'auto';
  let reason = 'explicit-profile';
  if (!supported.includes(profile)) throw new Error('Unknown CI profile');
  if (profile === 'auto') {
    const base = process.env.BASE_SHA;
    let paths = null;
    if (/^[0-9a-f]{40}$/.test(base ?? '')) {
      try {
        // No shell interpolation. Both rename endpoints/deletions remain visible.
        const diff = execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', base, 'HEAD', '--'], { encoding: 'utf8' });
        paths = diff.split('\0').filter(Boolean);
      } catch { /* Unknown comparison must select all required gates. */ }
    }
    ({ profile, reason } = selectValidation(paths));
    if (profile === 'installer' && !['PRODUCT_SHA', 'PRODUCT_RUN_ID', 'PRODUCT_ARTIFACT_ID', 'PRODUCT_ARTIFACT_DIGEST'].every((key) => process.env[key])) {
      profile = 'windows-package'; reason = 'no-exact-reuse-inputs-rebuild-windows';
    }
  }
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `profile=${profile}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `Selected CI profile: ${profile}; reason: ${reason}.\n`);
  console.log(JSON.stringify({ profile, reason }));
} catch (error) { console.error(error.message); process.exitCode = 1; }
