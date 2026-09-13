import { createHash } from 'node:crypto';
import { open } from 'node:fs/promises';

export const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;
const MAX_DEPTH = 64;

export function evidenceHash(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

// JSON.parse alone accepts duplicate keys. PowerShell also folds property names.
// Scan the already syntax-checked JSON, retaining each object's original key set.
export function parseEvidenceJson(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > MAX_EVIDENCE_BYTES) {
    throw new Error('invalid-evidence-size');
  }
  let source;
  try { source = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error('invalid-evidence-encoding'); }
  let value;
  try { value = JSON.parse(source); } catch { throw new Error('invalid-evidence-json'); }
  const cursor = { source, index: 0 };
  scanValue(cursor, 0);
  return value;
}

function whitespace(cursor) {
  while (/^[\t\r\n ]$/.test(cursor.source[cursor.index] ?? '')) cursor.index++;
}

function stringToken(cursor) {
  const start = cursor.index++;
  while (cursor.source[cursor.index] !== '"') {
    if (cursor.source[cursor.index] === '\\') cursor.index++;
    cursor.index++;
  }
  cursor.index++;
  return JSON.parse(cursor.source.slice(start, cursor.index));
}

function scanValue(cursor, depth) {
  if (depth > MAX_DEPTH) throw new Error('invalid-evidence-depth');
  whitespace(cursor);
  const token = cursor.source[cursor.index];
  if (token === '"') { stringToken(cursor); return; }
  if (token === '{' || token === '[') { scanContainer(cursor, depth, token); return; }
  const start = cursor.index;
  while (cursor.index < cursor.source.length && !/[\s,\]}]/.test(cursor.source[cursor.index])) cursor.index++;
  const scalar = JSON.parse(cursor.source.slice(start, cursor.index));
  if (typeof scalar === 'number' && !Number.isFinite(scalar)) throw new Error('invalid-evidence-number');
}

function scanContainer(cursor, depth, token) {
  const end = token === '{' ? '}' : ']';
  const keys = new Set();
  cursor.index++;
  whitespace(cursor);
  while (cursor.source[cursor.index] !== end) {
    if (token === '{') {
      const key = stringToken(cursor).toLowerCase();
      if (keys.has(key)) throw new Error('duplicate-evidence-key');
      keys.add(key);
      whitespace(cursor);
      cursor.index++; // colon; JSON.parse has already checked syntax
    }
    scanValue(cursor, depth + 1);
    whitespace(cursor);
    if (cursor.source[cursor.index] === ',') { cursor.index++; whitespace(cursor); }
  }
  cursor.index++;
}

export async function readEvidenceJson(path) {
  let handle;
  try {
    handle = await open(path, 'r');
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size < 1 || stat.size > MAX_EVIDENCE_BYTES) throw new Error('invalid-evidence-size');
    // Bound the allocation even if the file grows after stat().
    const bytes = Buffer.alloc(stat.size + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const result = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (result.bytesRead === 0) break;
      offset += result.bytesRead;
    }
    if (offset !== stat.size) throw new Error('evidence-changed-during-read');
    const raw = bytes.subarray(0, offset);
    return { value: parseEvidenceJson(raw), sha256: evidenceHash(raw) };
  } catch (error) {
    if (/^(invalid-evidence-|duplicate-evidence-key$|evidence-changed-during-read$)/.test(error.message ?? '')) throw error;
    throw new Error('evidence-read-failed');
  } finally {
    if (handle) await handle.close().catch(() => { throw new Error('evidence-close-failed'); });
  }
}
