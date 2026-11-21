import { expect, it, vi } from 'vitest';
import { HostFontSource } from './host-font-source';
import type { HostFontProvider } from './host-font-contract';

const face = { id: 'host-a', family: 'Host A', fullName: 'Host A Regular', postscriptName: 'HostA', style: 'Regular' };
function setup() {
  const source: HostFontSource = new HostFontSource(() => source.reset());
  const provider = {
    getSnapshot: vi.fn(async () => ({ revision: 'one', faces: [face] })),
    readFace: vi.fn<HostFontProvider['readFace']>(async () => ({ bytes: new Uint8Array([1, 2]).buffer })),
    subscribe: vi.fn(() => () => {}),
  } satisfies HostFontProvider;
  return { source, provider };
}

it('requires explicit layout opt-in and drops it when the provider is replaced or removed', async () => {
  const { source, provider } = setup();
  source.setProvider(provider);
  expect(source.layoutEnabled).toBe(false);
  source.setProvider(provider, { layout: true });
  expect(source.layoutEnabled).toBe(true);
  source.setProvider(provider);
  expect(source.layoutEnabled).toBe(false);
  source.setProvider(null, { layout: true });
  expect(source.layoutEnabled).toBe(false);
});

it('releases only layout bytes and leaves catalog and in-flight regular reads intact', async () => {
  const { source, provider } = setup();
  source.setProvider(provider, { layout: true });
  const [ref] = await source.references();
  await source.read(ref, true);
  await source.read(ref, true);
  expect(provider.readFace).toHaveBeenCalledTimes(1);
  let complete!: (data: { bytes: ArrayBuffer }) => void;
  provider.readFace.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  const regular = source.read(ref);
  await Promise.resolve();
  source.releaseLayoutPrograms();
  source.releaseLayoutPrograms();
  const repeat = source.read(ref);
  expect(provider.readFace).toHaveBeenCalledTimes(2);
  complete({ bytes: new Uint8Array([5]).buffer });
  expect(Array.from(new Uint8Array((await regular)!.bytes))).toEqual([5]);
  expect(Array.from(new Uint8Array((await repeat)!.bytes))).toEqual([5]);
  expect(Array.from(new Uint8Array((await source.read(ref, true))!.bytes))).toEqual([1, 2]);
  expect(provider.readFace).toHaveBeenCalledTimes(3);
  expect((await source.references())[0]).toBe(ref);
  expect(provider.getSnapshot).toHaveBeenCalledTimes(1);
});

it('does not refill the released layout cache when a previous request resolves late', async () => {
  const { source, provider } = setup();
  source.setProvider(provider, { layout: true });
  const [ref] = await source.references();
  let complete!: (data: { bytes: ArrayBuffer }) => void;
  provider.readFace.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  const beforeRelease = source.read(ref, true);
  await Promise.resolve();
  source.releaseLayoutPrograms();
  const afterRelease = source.read(ref, true);
  complete({ bytes: new Uint8Array([9]).buffer });
  expect(Array.from(new Uint8Array((await beforeRelease)!.bytes))).toEqual([9]);
  expect(Array.from(new Uint8Array((await afterRelease)!.bytes))).toEqual([1, 2]);
  expect(Array.from(new Uint8Array((await source.read(ref, true))!.bytes))).toEqual([1, 2]);
  expect(provider.readFace).toHaveBeenCalledTimes(2);
});
