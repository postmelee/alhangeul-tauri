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
  replacementId?: string;
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
    id: 'core/local-fonts', owner: 'font-policy',
    targetDisposition: 'replace-with-leaf-adapter', transitionStage: 3, removalStage: null,
  },
  {
    id: 'core/wasm-bridge', replacementId: 'core/font-policy-wasm-bridge', owner: 'font-policy',
    targetDisposition: 'retain-leaf-adapter', transitionStage: 3, removalStage: null,
  },
  {
    id: 'core/document-files', owner: 'native-host',
    targetDisposition: 'retain-leaf-adapter', transitionStage: 3, removalStage: null,
  },
  {
    id: 'core/document-dirty-state', owner: 'native-host',
    targetDisposition: 'retain-leaf-adapter', transitionStage: 3, removalStage: null,
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
    id: 'command/dispatcher', owner: 'native-host',
    targetDisposition: 'retain-leaf-adapter', transitionStage: 3, removalStage: null,
  },
  {
    id: 'command/commands/file', owner: 'native-host',
    targetDisposition: 'replace-with-leaf-adapter', transitionStage: 4, removalStage: null,
  },
  {
    id: 'embed/runtime', replacementId: 'embed/desktop-runtime', owner: 'native-host',
    targetDisposition: 'retain-leaf-adapter', transitionStage: 2, removalStage: null,
  },
  {
    id: 'ui/about-dialog', owner: 'product-ux',
    targetDisposition: 'retain-leaf-adapter', transitionStage: 2, removalStage: null,
  },
  {
    id: 'recent/recent-store', owner: 'native-host',
    targetDisposition: 'retain-leaf-adapter', transitionStage: 3, removalStage: null,
  },
] as const satisfies readonly AlhangeulOverrideSpec[];

export const finalForbiddenStudioEntryPaths = [
  'index.html',
  'src/main.ts',
] as const;

export const finalForbiddenOverrideIds = (alhangeulOverrideSpecs as readonly AlhangeulOverrideSpec[])
  .filter((spec) => spec.targetDisposition === 'remove-shadow')
  .map((spec) => spec.id);

export function createAlhangeulOverrides(alhangeulSrc: string) {
  return alhangeulOverrideSpecs.map(({ id, replacementId }: AlhangeulOverrideSpec) => ({
    find: `@/${id}`,
    replacement: resolve(alhangeulSrc, replacementId ?? id),
  }));
}
