import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  alhangeulOverrideSpecs,
  createAlhangeulOverrides,
  finalForbiddenOverrideIds,
  finalForbiddenStudioEntryPaths,
} from '../../alhangeul-overrides';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const expectedUpstreamCommit = '9b16aa9e23f476e2b335d7c029fc9f24a199d63c';
const expectedIdsByOwner = {
  'font-policy': [
    'core/font-loader',
    'core/font-application',
    'core/font-authoring-policy',
    'core/local-fonts',
  ],
  'native-host': [
    'core/bridge-factory',
    'core/document-files',
    'core/desktop-events',
    'core/platform',
    'core/tauri-bridge',
    'command/commands/file',
    'embed/runtime',
  ],
  'product-ux': [
    'ui/about-dialog',
  ],
  'legacy-upstream-copy': [
    'command/shortcut-map',
    'command/commands/edit',
    'command/commands/format',
  ],
} as const;

const expectedFinalLeafAdapters = [
  'core/font-loader',
  'core/font-application',
  'core/font-authoring-policy',
  'core/local-fonts',
  'core/document-files',
  'core/desktop-events',
  'core/platform',
  'command/commands/file',
  'embed/runtime',
  'ui/about-dialog',
] as const;

const removedStageTwoPaths = [
  'index.html',
  'src/main.ts',
  'src/core/desktop-chrome.ts',
  'src/ui/custom-select.ts',
  'src/ui/dialog.ts',
  'src/ui/home-screen.ts',
  'src/ui/preview-svg.ts',
  'src/ui/print-dialog.ts',
  'src/ui/recent-documents-dialog.ts',
  'src/ui/style-edit-dialog.ts',
  'src/ui/toolbar.ts',
  'src/ui/validation-modal.ts',
  'src/view/alhangeul-page-renderer.ts',
  'src/view/canvas-layout.ts',
  'src/view/canvas-view.ts',
  'src/view/page-left.ts',
  'src/view/page-overlays.ts',
  'src/view/ruler.ts',
  'src/styles/about-dialog.css',
  'src/styles/custom-select.css',
  'src/styles/font-set-dialog.css',
  'src/styles/home-screen.css',
  'src/styles/recent-documents-dialog.css',
] as const;

describe('upstream Studio override boundary', () => {
  it('classifies the 15 remaining leaf and pending aliases', () => {
    const ids = alhangeulOverrideSpecs.map((spec) => spec.id);
    expect(ids).toHaveLength(15);
    expect(new Set(ids).size).toBe(15);
    for (const [owner, expectedIds] of Object.entries(expectedIdsByOwner)) {
      expect(
        alhangeulOverrideSpecs
          .filter((spec) => spec.owner === owner)
          .map((spec) => spec.id),
      ).toEqual(expectedIds);
    }

    const replacements = createAlhangeulOverrides('/product/studio-src');
    expect(replacements.map(({ find }) => find)).toEqual(ids.map((id) => `@/${id}`));
    expect(replacements).toHaveLength(15);
    expect(replacements.find(({ find }) => find === '@/embed/runtime')?.replacement)
      .toBe(resolve('/product/studio-src', 'embed/desktop-runtime'));
  });

  it('keeps removal stages and final leaf adapters explicit', () => {
    for (const spec of alhangeulOverrideSpecs) {
      if (spec.targetDisposition === 'remove-shadow') {
        expect(spec.removalStage).toBe(spec.transitionStage);
      } else {
        expect(spec.removalStage).toBeNull();
      }
    }

    const legacyCopies = alhangeulOverrideSpecs
      .filter((spec) => spec.owner === 'legacy-upstream-copy');
    expect(legacyCopies.length).toBeGreaterThan(0);
    expect(legacyCopies.every((spec) => spec.targetDisposition === 'remove-shadow')).toBe(true);

    const finalLeafAdapters = alhangeulOverrideSpecs
      .filter((spec) => spec.targetDisposition !== 'remove-shadow')
      .map((spec) => spec.id);
    expect(finalLeafAdapters).toEqual(expectedFinalLeafAdapters);
    expect(finalForbiddenOverrideIds).toEqual(
      alhangeulOverrideSpecs
        .filter((spec) => !expectedFinalLeafAdapters.includes(
          spec.id as (typeof expectedFinalLeafAdapters)[number],
        ))
        .map((spec) => spec.id),
    );
    expect(finalForbiddenStudioEntryPaths).toEqual(['index.html', 'src/main.ts']);
  });

  it('keeps the Stage 2 Studio entry and renderer shadows physically absent', () => {
    const studioHostRoot = resolve(repositoryRoot, 'apps/studio-host');
    for (const path of removedStageTwoPaths) {
      expect(existsSync(resolve(studioHostRoot, path)), path).toBe(false);
    }
  });

  it('pins the read-only source submodule to the resolved release commit', () => {
    const lock = readFileSync(resolve(repositoryRoot, 'rhwp-core.lock'), 'utf8');
    const lockCommit = lock.match(/^rhwp_commit = "([0-9a-f]{40})"$/m)?.[1];
    const releaseTag = lock.match(/^rhwp_release_tag = "([^"]+)"$/m)?.[1];
    expect(lockCommit).toBe(expectedUpstreamCommit);
    expect(releaseTag).toBe('v0.8.2');

    const gitlink = git(['ls-files', '--stage', 'third_party/rhwp']);
    expect(gitlink).toMatch(new RegExp(`^160000 ${expectedUpstreamCommit} 0\\tthird_party/rhwp$`));

    const submoduleRoot = resolve(repositoryRoot, 'third_party/rhwp');
    expect(git(['rev-parse', 'HEAD'], submoduleRoot)).toBe(expectedUpstreamCommit);
    expect(git(['rev-parse', '--verify', `refs/tags/${releaseTag}^{commit}`], submoduleRoot))
      .toBe(expectedUpstreamCommit);
    expect(git(['status', '--porcelain', '--untracked-files=all'], submoduleRoot)).toBe('');
  });
});

function git(args: string[], cwd = repositoryRoot): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}
