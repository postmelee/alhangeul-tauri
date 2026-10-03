#!/usr/bin/env node
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_ROOT, canonicalRoot, notesPath, ownedPath, readOwned, readTemplates } from './notes-files.mjs';
import { checkReleaseNotes } from './notes-check.mjs';
import { renderGithubNotes } from './notes-render.mjs';
import { renderWebsiteNotes } from './website-render.mjs';
import { validateReleaseNotes } from './notes-schema.mjs';

const usage = 'Usage: notes-cli.mjs check [--root <repository>] | generate --version <version> --output-dir <new-directory> [--root <repository>] [--input <file>]';

export function parseNotesArguments(args) {
  const [command, ...arguments_] = args.filter((argument, index) => !(index === 1 && argument === '--'));
  if (command === '--help') return { help: true };
  if (!['generate', 'check'].includes(command)) throw new Error(usage);
  const options = { command };
  const flags = { '--root': 'repositoryRoot', '--version': 'version', '--output-dir': 'outputDirectory', '--input': 'input' };
  for (let index = 0; index < arguments_.length; index += 2) {
    const flag = flags[arguments_[index]];
    const value = arguments_[index + 1];
    if (!flag || !value || value.startsWith('--') || Object.hasOwn(options, flag)) throw new Error(usage);
    if (command === 'check' && flag !== 'repositoryRoot') throw new Error(usage);
    options[flag] = value;
  }
  if (command === 'generate') {
    notesPath(options.version);
    if (!options.outputDirectory) throw new Error(usage);
  }
  return options;
}

export async function generateReleaseNotes(options) {
  const root = await canonicalRoot(options.repositoryRoot);
  const path = notesPath(options.version);
  const input = options.input && relocateOwnedPath(options.input, options.repositoryRoot, root);
  const source = input ? await readExplicitInput(input, root) : await readOwned(root, path);
  const notes = validateReleaseNotes(JSON.parse(source));
  if (notes.metadata.version !== options.version) throw new Error('입력 version과 --version이 다릅니다.');
  const templates = await readTemplates(root);
  const outputs = {
    'release-body.md': renderGithubNotes(notes, templates.github),
    'website-release-note.html': renderWebsiteNotes(notes, templates.website),
    'updater-notes.txt': `${notes.content.updaterSummary}\n`,
  };
  const directory = relocateOwnedPath(options.outputDirectory, options.repositoryRoot, root);
  const output = await createOutputDirectory(directory, root);
  for (const [name, content] of Object.entries(outputs)) {
    await writeFile(join(output, name), content, { encoding: 'utf8', flag: 'wx' });
  }
  return { outputDirectory: output, files: Object.keys(outputs) };
}

async function readExplicitInput(input, root) {
  const path = resolve(input);
  await checkOwnedParent(root, path);
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('명시 input은 symlink가 아닌 일반 파일이어야 합니다.');
  return readFile(path, 'utf8');
}

async function createOutputDirectory(directory, root) {
  const path = resolve(directory);
  await checkOwnedParent(root, path);
  try {
    await lstat(path);
    throw new Error('기존 output directory를 덮어쓸 수 없습니다.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const parent = await realpath(dirname(path));
  const output = join(parent, basename(path));
  await mkdir(output, { mode: 0o700 });
  return output;
}

function relocateOwnedPath(path, repositoryRoot, canonical) {
  const original = resolve(repositoryRoot ?? DEFAULT_ROOT);
  const candidate = relative(original, resolve(path));
  const inside = candidate !== '..' && !candidate.startsWith(`..${sep}`) && !isAbsolute(candidate);
  return inside ? resolve(canonical, candidate) : resolve(path);
}

async function checkOwnedParent(root, path) {
  const candidate = relative(root, path);
  if (candidate && candidate !== '..' && !candidate.startsWith(`..${sep}`) && !isAbsolute(candidate)) {
    const parent = dirname(path);
    if (parent !== root) await ownedPath(root, parent);
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const options = parseNotesArguments(process.argv.slice(2));
    if (options.help) console.log(usage);
    else if (options.command === 'check') {
      const result = await checkReleaseNotes(options);
      console.log(`Release notes check passed: ${result.documents} documents`);
    } else {
      const result = await generateReleaseNotes(options);
      console.log(`Release notes generated: ${result.files.join(', ')} -> ${result.outputDirectory}`);
    }
  } catch (error) {
    console.error(`Release notes failed: ${error.message}`);
    process.exitCode = 1;
  }
}
