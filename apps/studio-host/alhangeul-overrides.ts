import { resolve } from 'node:path';

export type AlhangeulOverrideOwner =
  | 'native-host'
  | 'font-policy'
  | 'product-ux'
  | 'legacy-upstream-copy';

export type AlhangeulOverrideDisposition =
  | 'retain-leaf-adapter'
  | 'replace-with-leaf-adapter'
  | 'remove-shadow';

export type AlhangeulOverrideStage = 2 | 3 | 4;

export interface AlhangeulOverrideSpec {
  id: string;
  owner: AlhangeulOverrideOwner;
  targetDisposition: AlhangeulOverrideDisposition;
  transitionStage: AlhangeulOverrideStage;
  removalStage: AlhangeulOverrideStage | null;
}

export const alhangeulOverrideSpecs = [
  {
    id: 'core/font-loader', owner: 'font-policy',
    targetDisposition: 'replace-with-leaf-adapter', transitionStage: 3, removalStage: null,
  },
  {
    id: 'core/font-application', owner: 'font-policy',
    targetDisposition: 'retain-leaf-adapter', transitionStage: 3, removalStage: null,
  },
  {
    id: 'core/font-authoring-policy', owner: 'font-policy',
    targetDisposition: 'retain-leaf-adapter', transitionStage: 3, removalStage: null,
  },
  {
    id: 'core/local-fonts', owner: 'font-policy',
    targetDisposition: 'replace-with-leaf-adapter', transitionStage: 3, removalStage: null,
  },
  {
    id: 'core/bridge-factory', owner: 'native-host',
    targetDisposition: 'remove-shadow', transitionStage: 3, removalStage: 3,
  },
  {
    id: 'core/document-files', owner: 'native-host',
    targetDisposition: 'retain-leaf-adapter', transitionStage: 3, removalStage: null,
  },
  {
    id: 'core/desktop-chrome', owner: 'product-ux',
    targetDisposition: 'remove-shadow', transitionStage: 2, removalStage: 2,
  },
  {
    id: 'core/desktop-events', owner: 'native-host',
    targetDisposition: 'replace-with-leaf-adapter', transitionStage: 3, removalStage: null,
  },
  {
    id: 'core/platform', owner: 'native-host',
    targetDisposition: 'retain-leaf-adapter', transitionStage: 3, removalStage: null,
  },
  {
    id: 'core/tauri-bridge', owner: 'native-host',
    targetDisposition: 'remove-shadow', transitionStage: 3, removalStage: 3,
  },
  {
    id: 'command/shortcut-map', owner: 'legacy-upstream-copy',
    targetDisposition: 'remove-shadow', transitionStage: 3, removalStage: 3,
  },
  {
    id: 'command/commands/edit', owner: 'legacy-upstream-copy',
    targetDisposition: 'remove-shadow', transitionStage: 3, removalStage: 3,
  },
  {
    id: 'command/commands/format', owner: 'legacy-upstream-copy',
    targetDisposition: 'remove-shadow', transitionStage: 3, removalStage: 3,
  },
  {
    id: 'command/commands/file', owner: 'native-host',
    targetDisposition: 'replace-with-leaf-adapter', transitionStage: 4, removalStage: null,
  },
  {
    id: 'ui/about-dialog', owner: 'product-ux',
    targetDisposition: 'retain-leaf-adapter', transitionStage: 2, removalStage: null,
  },
  {
    id: 'ui/custom-select', owner: 'legacy-upstream-copy',
    targetDisposition: 'remove-shadow', transitionStage: 2, removalStage: 2,
  },
  {
    id: 'ui/dialog', owner: 'legacy-upstream-copy',
    targetDisposition: 'remove-shadow', transitionStage: 2, removalStage: 2,
  },
  {
    id: 'ui/home-screen', owner: 'legacy-upstream-copy',
    targetDisposition: 'remove-shadow', transitionStage: 2, removalStage: 2,
  },
  {
    id: 'ui/preview-svg', owner: 'legacy-upstream-copy',
    targetDisposition: 'remove-shadow', transitionStage: 2, removalStage: 2,
  },
  {
    id: 'ui/print-dialog', owner: 'legacy-upstream-copy',
    targetDisposition: 'remove-shadow', transitionStage: 2, removalStage: 2,
  },
  {
    id: 'ui/recent-documents-dialog', owner: 'legacy-upstream-copy',
    targetDisposition: 'remove-shadow', transitionStage: 2, removalStage: 2,
  },
  {
    id: 'ui/style-edit-dialog', owner: 'legacy-upstream-copy',
    targetDisposition: 'remove-shadow', transitionStage: 2, removalStage: 2,
  },
  {
    id: 'ui/toolbar', owner: 'legacy-upstream-copy',
    targetDisposition: 'remove-shadow', transitionStage: 2, removalStage: 2,
  },
  {
    id: 'ui/validation-modal', owner: 'legacy-upstream-copy',
    targetDisposition: 'remove-shadow', transitionStage: 2, removalStage: 2,
  },
  {
    id: 'view/canvas-view', owner: 'legacy-upstream-copy',
    targetDisposition: 'remove-shadow', transitionStage: 2, removalStage: 2,
  },
  {
    id: 'view/ruler', owner: 'legacy-upstream-copy',
    targetDisposition: 'remove-shadow', transitionStage: 2, removalStage: 2,
  },
  {
    id: 'styles/about-dialog.css', owner: 'product-ux',
    targetDisposition: 'remove-shadow', transitionStage: 2, removalStage: 2,
  },
  {
    id: 'styles/custom-select.css', owner: 'legacy-upstream-copy',
    targetDisposition: 'remove-shadow', transitionStage: 2, removalStage: 2,
  },
  {
    id: 'styles/font-set-dialog.css', owner: 'legacy-upstream-copy',
    targetDisposition: 'remove-shadow', transitionStage: 2, removalStage: 2,
  },
  {
    id: 'styles/home-screen.css', owner: 'legacy-upstream-copy',
    targetDisposition: 'remove-shadow', transitionStage: 2, removalStage: 2,
  },
  {
    id: 'styles/recent-documents-dialog.css', owner: 'legacy-upstream-copy',
    targetDisposition: 'remove-shadow', transitionStage: 2, removalStage: 2,
  },
] as const satisfies readonly AlhangeulOverrideSpec[];

export const finalForbiddenStudioEntryPaths = [
  'index.html',
  'src/main.ts',
] as const;

export const finalForbiddenOverrideIds = alhangeulOverrideSpecs
  .filter((spec) => spec.targetDisposition === 'remove-shadow')
  .map((spec) => spec.id);

export function createAlhangeulOverrides(alhangeulSrc: string) {
  return alhangeulOverrideSpecs.map(({ id }) => ({
    find: `@/${id}`,
    replacement: resolve(alhangeulSrc, id),
  }));
}
