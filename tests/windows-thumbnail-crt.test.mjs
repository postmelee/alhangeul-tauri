import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { stageThumbnailBinaries } from '../scripts/build-thumbnail-binaries.mjs';
import { staticThumbnailEnvironment } from '../scripts/windows-thumbnail-crt.mjs';
import { readPeImports, requireStaticThumbnailCrt } from '../scripts/windows-pe-imports.mjs';

test('sidecar CRT selection preserves explicit Cargo flag precedence and the caller environment', () => {
  const original = { RUSTFLAGS: '-C debuginfo=1', KEEP: 'value' };
  const actual = staticThumbnailEnvironment(original);
  assert.equal(actual.CARGO_ENCODED_RUSTFLAGS, '-C\x1fdebuginfo=1\x1f-C\x1ftarget-feature=+crt-static');
  assert.equal(actual.KEEP, 'value');
  assert.equal(original.CARGO_ENCODED_RUSTFLAGS, undefined);
  const encoded = staticThumbnailEnvironment({ ...original, CARGO_ENCODED_RUSTFLAGS: '-L\x1fpath with spaces' });
  assert.equal(encoded.CARGO_ENCODED_RUSTFLAGS, '-L\x1fpath with spaces\x1f-C\x1ftarget-feature=+crt-static');
  assert.equal(staticThumbnailEnvironment({ CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_RUSTFLAGS: '-C opt-level=2' })
    .CARGO_ENCODED_RUSTFLAGS, '-C\x1fopt-level=2\x1f-C\x1ftarget-feature=+crt-static');
  assert.equal(staticThumbnailEnvironment({ ...original, CARGO_ENCODED_RUSTFLAGS: '' })
    .CARGO_ENCODED_RUSTFLAGS, '-C\x1ftarget-feature=+crt-static');
});

test('system DLL imports are allowed, but external VC runtimes fail before staging', () => {
  assert.deepEqual(requireStaticThumbnailCrt(image('KERNEL32.dll')), ['KERNEL32.dll']);
  for (const name of ['VCRUNTIME140.dll', 'vcruntime140_1.dll', 'MSVCP140.dll', 'MSVCR120.dll', 'CONCRT140.dll', 'VCOMP140.DLL']) {
    assert.deepEqual(readPeImports(image(name)), [name]);
    assert.throws(() => requireStaticThumbnailCrt(image(name)), /external VC runtime/);
  }
});

test('delay-loaded external CRT imports cannot bypass the packaging check', () => {
  assert.deepEqual(readPeImports(image('USER32.dll', true)), ['USER32.dll']);
  assert.throws(() => requireStaticThumbnailCrt(image('VCRUNTIME140.dll', true)), /external VC runtime/);
  const invalid = image('USER32.dll', true);
  invalid.writeUInt32LE(0, 0x200);
  assert.throws(() => readPeImports(invalid), /delay import attributes/);
});

test('truncation, unmapped names and missing descriptor terminators fail closed', () => {
  assert.throws(() => readPeImports(Buffer.alloc(20)), /Invalid PE/);
  const unmapped = image('KERNEL32.dll');
  unmapped.writeUInt32LE(0x9000, 0x20c);
  assert.throws(() => readPeImports(unmapped), /Invalid PE RVA/);
  const unterminated = image('KERNEL32.dll');
  unterminated.writeUInt32LE(20, 0x98 + 124);
  assert.throws(() => readPeImports(unterminated), /import terminator/);
  const oversized = image('KERNEL32.dll');
  oversized.writeUInt32LE(0xffffff00, 0x98 + 240 + 20);
  assert.throws(() => readPeImports(oversized), /Invalid PE range/);
});


test('a rejected handler leaves both previously staged binaries unchanged', async () => {
  const root = await mkdtemp(join(tmpdir(), 'thumbnail-crt-stage-'));
  try {
    const stagingDirectory = join(root, 'stage');
    await mkdir(stagingDirectory);
    const outputs = [
      { kind: 'worker', source: join(root, 'new-worker.exe'), destination: join(stagingDirectory, 'worker.exe'), dll: false },
      { kind: 'handler', source: join(root, 'new-handler.dll'), destination: join(stagingDirectory, 'handler.dll'), dll: true },
    ];
    await writeFile(outputs[0].source, image('KERNEL32.dll'));
    const handler = image('VCRUNTIME140.dll');
    handler.writeUInt16LE(0x2000, 0x96);
    await writeFile(outputs[1].source, handler);
    for (const output of outputs) await writeFile(output.destination, 'previous-' + output.kind);
    await assert.rejects(stageThumbnailBinaries({ stagingDirectory, outputs }), /external VC runtime/);
    for (const output of outputs) {
      assert.equal(await readFile(output.destination, 'utf8'), 'previous-' + output.kind);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function image(name, delayed = false) {
  const buffer = Buffer.alloc(0x600);
  buffer.write('MZ'); buffer.writeUInt32LE(0x80, 60); buffer.write('PE\0\0', 0x80);
  buffer.writeUInt16LE(0x8664, 0x84); buffer.writeUInt16LE(1, 0x86);
  buffer.writeUInt16LE(240, 0x94); buffer.writeUInt16LE(0x20b, 0x98);
  buffer.writeUInt32LE(16, 0x98 + 108);
  const entry = 0x98 + 112 + (delayed ? 13 : 1) * 8;
  buffer.writeUInt32LE(0x1000, entry); buffer.writeUInt32LE(delayed ? 64 : 40, entry + 4);
  const section = 0x98 + 240;
  buffer.writeUInt32LE(0x400, section + 8); buffer.writeUInt32LE(0x1000, section + 12);
  buffer.writeUInt32LE(0x400, section + 16); buffer.writeUInt32LE(0x200, section + 20);
  if (delayed) buffer.writeUInt32LE(1, 0x200);
  buffer.writeUInt32LE(0x1100, 0x200 + (delayed ? 4 : 12));
  buffer.write(name + '\0', 0x300, 'ascii');
  return buffer;
}
