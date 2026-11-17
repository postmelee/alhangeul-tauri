// Read PE32+ import names before packaging; do not execute the image.
function span(buffer, offset, size) {
  if (!Number.isSafeInteger(offset) || offset < 0 || size < 0 || offset + size > buffer.length) {
    throw new Error('Invalid PE range');
  }
  return buffer.subarray(offset, offset + size);
}

function headers(buffer) {
  if (!Buffer.isBuffer(buffer) || span(buffer, 0, 64).toString('ascii', 0, 2) !== 'MZ') {
    throw new Error('Invalid PE DOS header');
  }
  const pe = buffer.readUInt32LE(60);
  const coff = span(buffer, pe, 24);
  if (coff.toString('ascii', 0, 4) !== 'PE\0\0') throw new Error('Invalid PE signature');
  const optional = span(buffer, pe + 24, coff.readUInt16LE(20));
  if (optional.length < 128 || optional.readUInt16LE(0) !== 0x20b) throw new Error('Invalid PE32+ header');
  const count = coff.readUInt16LE(6);
  if (count === 0 || count > 96) throw new Error('Invalid PE section count');
  const table = span(buffer, pe + 24 + optional.length, count * 40);
  const sections = Array.from({ length: count }, (_, i) => {
    const at = i * 40;
    const rawSize = table.readUInt32LE(at + 16), raw = table.readUInt32LE(at + 20);
    span(buffer, raw, rawSize);
    return { va: table.readUInt32LE(at + 12), rawSize, raw };
  });
  return { optional, sections };
}

function sectionBytes(buffer, sections, rva) {
  const section = sections.find(s => rva >= s.va && rva < s.va + s.rawSize);
  if (!section) throw new Error('Invalid PE RVA');
  const within = rva - section.va;
  return span(buffer, section.raw + within, section.rawSize - within);
}

function importNames(buffer, sections, optional, index, delayed) {
  if (optional.readUInt32LE(108) <= index) return [];
  const entry = span(optional, 112 + index * 8, 8);
  const rva = entry.readUInt32LE(0), size = entry.readUInt32LE(4);
  if (rva === 0 && size === 0) return [];
  const table = span(sectionBytes(buffer, sections, rva), 0, size);
  const stride = delayed ? 32 : 20, names = [];
  for (let at = 0; at + stride <= table.length; at += stride) {
    const descriptor = table.subarray(at, at + stride);
    if (descriptor.every(byte => byte === 0)) return names;
    if (delayed && descriptor.readUInt32LE(0) !== 1) throw new Error('Invalid PE delay import attributes');
    const nameRva = descriptor.readUInt32LE(delayed ? 4 : 12);
    const bytes = sectionBytes(buffer, sections, nameRva);
    const end = bytes.indexOf(0);
    if (end <= 0 || end > 512 || bytes.subarray(0, end).some(byte => byte < 32 || byte > 126)) {
      throw new Error('Invalid PE import name');
    }
    names.push(bytes.toString('ascii', 0, end));
  }
  throw new Error('Invalid PE import terminator');
}

export function readPeImports(buffer) {
  const { optional, sections } = headers(buffer);
  return [...new Set([
    ...importNames(buffer, sections, optional, 1, false),
    ...importNames(buffer, sections, optional, 13, true),
  ])];
}

export function requireStaticThumbnailCrt(buffer) {
  const imports = readPeImports(buffer);
  const external = imports.filter(name => /^(?:vcruntime|msvcp|msvcr|concrt|vcomp)\d.*\.dll$/i.test(name));
  if (external.length) throw new Error('Thumbnail requires external VC runtime: ' + external.join(', '));
  return imports;
}
