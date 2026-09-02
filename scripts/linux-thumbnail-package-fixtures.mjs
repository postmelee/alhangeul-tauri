import { spawnSync } from 'node:child_process';
import { constants } from 'node:fs';
import {
  access,
  chmod,
  copyFile,
  mkdir,
  readdir,
  readFile,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { basename, join } from 'node:path';

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: 'utf8',
    stdio: options.inherit ? 'inherit' : 'pipe',
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(
      `${command} ${args.join(' ')} failed (${result.status}): ${result.stderr ?? ''}`,
    );
  }
  return result;
}

export async function findExactlyOne(root, extension) {
  const matches = [];
  await walk(root, extension, matches);
  if (matches.length !== 1) {
    throw new Error(`${extension} package cardinality must be one: ${matches.length}`);
  }
  return matches[0];
}

export async function dpkgPathWithoutMimeRefresh(root) {
  const output = join(root, 'dpkg-without-mime-refresh');
  await mkdir(output, { recursive: true });
  for (const command of [
    'cat', 'diff', 'dpkg-deb', 'ldconfig', 'rm', 'sh', 'start-stop-daemon', 'tar',
  ]) {
    await symlink(await findExecutable(command), join(output, command));
  }
  return output;
}

export async function buildDebFixture({ root, name, architecture, version, fail, sources }) {
  const packageRoot = join(root, `deb-${version}`);
  await mkdir(join(packageRoot, 'DEBIAN'), { recursive: true });
  await writeFile(join(packageRoot, 'DEBIAN', 'control'), [
    `Package: ${name}`,
    `Version: ${version}`,
    `Architecture: ${architecture}`,
    'Maintainer: Alhangeul CI <ci@example.invalid>',
    'Description: Alhangeul thumbnail package lifecycle fixture',
    '',
  ].join('\n'));
  await writeProductFiles(packageRoot, `stage4-${fail ? 'failed' : 'old'}-deb\n`);
  if (fail === true) {
    const preinst = join(packageRoot, 'DEBIAN', 'preinst');
    await writeFile(preinst, '#!/bin/sh\nexit 42\n');
    await chmod(preinst, 0o755);
  }
  if (fail === 'refresh') {
    await copyRefreshFiles(packageRoot, sources);
    const hook = await refreshFailureHook(root);
    await writeFile(join(packageRoot, 'DEBIAN/postinst'), hook);
    await writeFile(join(packageRoot, 'DEBIAN/postrm'), await productRemoveHook());
    await chmod(join(packageRoot, 'DEBIAN/postinst'), 0o755);
    await chmod(join(packageRoot, 'DEBIAN/postrm'), 0o755);
  }
  const output = join(root, `${name}_${version}_${architecture}.deb`);
  run('dpkg-deb', ['--build', '--root-owner-group', packageRoot, output]);
  return output;
}

export async function buildRpmFixture({ root, name, architecture, version, fail, sources }) {
  const top = join(root, `rpm-${version}`);
  for (const directory of ['BUILD', 'BUILDROOT', 'RPMS', 'SOURCES', 'SPECS', 'SRPMS']) {
    await mkdir(join(top, directory), { recursive: true });
  }
  await writeFile(join(top, 'SOURCES', 'helper'), `stage4-${fail ? 'failed' : 'old'}-rpm\n`);
  await writeFile(
    join(top, 'SOURCES', 'registration'),
    '[Thumbnailer Entry]\nExec=/usr/bin/false %i %o %s\nMimeType=application/x-hwp;\n',
  );
  const spec = join(top, 'SPECS', `${name}.spec`);
  let refreshHook = '';
  let removeHook = '';
  if (fail === 'refresh') {
    await copyFile(sources.helper, join(top, 'SOURCES/helper'));
    await copyFile(sources.registration, join(top, 'SOURCES/registration'));
    await copyFile(sources.mime, join(top, 'SOURCES/mime'));
    refreshHook = await refreshFailureHook(root);
    removeHook = await productRemoveHook();
  }
  await writeFile(spec, rpmSpec({ name, architecture, version, fail, refreshHook, removeHook }));
  run('rpmbuild', ['-bb', '--define', `_topdir ${top}`, spec]);
  return findExactlyOne(join(top, 'RPMS'), '.rpm');
}

async function writeProductFiles(root, marker) {
  const helper = join(root, 'usr/lib/alhangeul/alhangeul-thumbnailer');
  const registration = join(root, 'usr/share/thumbnailers/alhangeul.thumbnailer');
  await mkdir(join(root, 'usr/lib/alhangeul'), { recursive: true });
  await mkdir(join(root, 'usr/share/thumbnailers'), { recursive: true });
  await writeFile(helper, marker);
  await chmod(helper, 0o755);
  await writeFile(
    registration,
    '[Thumbnailer Entry]\nExec=/usr/bin/false %i %o %s\nMimeType=application/x-hwp;\n',
  );
}

function rpmSpec({ name, architecture, version, fail, refreshHook, removeHook }) {
  return `Name: ${name}
Version: ${version}
Release: 1.stage4
Summary: Alhangeul thumbnail package lifecycle fixture
License: MIT
BuildArch: ${architecture}
Source0: helper
Source1: registration
${refreshHook ? 'Source2: mime' : ''}

%description
Alhangeul thumbnail package lifecycle fixture.

%prep

%build

%install
install -D -m 0755 %{SOURCE0} %{buildroot}/usr/lib/alhangeul/alhangeul-thumbnailer
install -D -m 0644 %{SOURCE1} %{buildroot}/usr/share/thumbnailers/alhangeul.thumbnailer
${refreshHook ? 'install -D -m 0644 %{SOURCE2} %{buildroot}/usr/share/mime/packages/alhangeul-hwpx.xml' : ''}

${fail === true ? '%pre\nexit 42\n' : ''}
${refreshHook ? `%post\n${refreshHook}\n%postun\n${removeHook}\n` : ''}
%files
/usr/lib/alhangeul/alhangeul-thumbnailer
/usr/share/thumbnailers/alhangeul.thumbnailer
${refreshHook ? '/usr/share/mime/packages/alhangeul-hwpx.xml' : ''}
`;
}

async function copyRefreshFiles(root, sources) {
  await copyFile(sources.helper, join(root, 'usr/lib/alhangeul/alhangeul-thumbnailer'));
  await copyFile(sources.registration, join(root, 'usr/share/thumbnailers/alhangeul.thumbnailer'));
  const path = join(root, 'usr/share/mime/packages');
  await mkdir(path, { recursive: true });
  await copyFile(sources.mime, join(path, 'alhangeul-hwpx.xml'));
}

const productHook = () => readFile('apps/desktop/src-tauri/linux/update-mime-database.sh', 'utf8');
const productRemoveHook = () => readFile(
  'apps/desktop/src-tauri/linux/update-mime-database-remove.sh',
  'utf8',
);

async function refreshFailureHook(root) {
  const bin = join(root, 'refresh-failure-bin');
  await mkdir(bin, { recursive: true });
  const stub = join(bin, 'update-mime-database');
  await writeFile(stub, '#!/bin/sh\necho "injected MIME refresh failure (42)" >&2\nexit 42\n');
  await chmod(stub, 0o755);
  const quoted = `'${bin.replaceAll("'", "'\\''")}'`;
  return (await productHook()).replace('set -eu', `set -eu\nPATH=${quoted}:$PATH\nexport PATH`);
}

async function walk(root, extension, matches) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) await walk(path, extension, matches);
    else if (entry.isFile() && basename(path).endsWith(extension)) matches.push(path);
  }
}

async function findExecutable(command) {
  for (const directory of (process.env.PATH ?? '').split(':').filter(Boolean)) {
    const candidate = join(directory, command);
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'EACCES') throw error;
    }
  }
  throw new Error(`required executable not found: ${command}`);
}
