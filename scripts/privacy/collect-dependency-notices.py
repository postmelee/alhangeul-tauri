"""Preserve original notices from verified archives, without executing package code.

This deliberately over-includes locked build/dev/optional dependencies. Missing
notice files remain explicit review gaps, not a declaration of legal compliance.
"""
import base64
import argparse
import concurrent.futures
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import tarfile
import tempfile
import tomllib
import urllib.parse
import urllib.request
import zipfile
import yaml

ROOT = Path(__file__).resolve().parents[2]
DESTINATION = ROOT / 'assets/licenses/dependency-notices.zip'


def download(url, limit):
    with urllib.request.urlopen(url, timeout=60) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError('archive exceeds bound')
    return data


def inspect(entry, scratch):
    kind, name, version, integrity = entry
    row = dict(kind=kind, name=name, version=version, integrity=integrity)
    prefix = f'{kind}/{name.replace("/", "_")}@{version}'
    if kind == 'rust':
        data = download(f'https://static.crates.io/crates/{name}/{name}-{version}.crate', 50 * 1024 * 1024)
        if hashlib.sha256(data).hexdigest() != integrity:
            raise ValueError(f'checksum mismatch: {name}')
    else:
        metadata = json.loads(download('https://registry.npmjs.org/' + urllib.parse.quote(name, safe='') + '/' + version, 5 * 1024 * 1024))
        url = metadata['dist']['tarball']
        parsed = urllib.parse.urlsplit(url)
        if parsed.scheme != 'https' or parsed.hostname != 'registry.npmjs.org':
            raise ValueError('unrecognized registry archive')
        data = download(url, 100 * 1024 * 1024)
        algorithm, expected = integrity.split('-', 1)
        if base64.b64encode(hashlib.new(algorithm, data).digest()).decode() != expected:
            raise ValueError(f'integrity mismatch: {name}')
    notices = []
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
        for member in archive.getmembers():
            parts = PurePosixPath(member.name).parts
            if not member.isfile() or len(parts) < 2:
                continue
            if not parts[-1].upper().startswith(('LICENSE', 'COPYING', 'NOTICE', 'COPYRIGHT')):
                continue
            if '..' in parts or member.name.startswith('/') or member.size > 10 * 1024 * 1024:
                raise ValueError(f'unsafe notice path/size: {name}')
            relative = '/'.join(parts[1:])
            content = archive.extractfile(member).read()
            path = Path(scratch) / prefix / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
            notices.append(dict(path=f'{prefix}/{relative}', sha256=hashlib.sha256(content).hexdigest()))
    row['notices'] = notices
    row['status'] = 'original notice files preserved' if notices else 'notice filename not found; review required'
    return row


def entries():
    result = {}
    for manifest in ['apps/desktop/src-tauri', 'apps/thumbnail-worker', 'apps/thumbnail-handler', 'apps/linux-thumbnailer']:
        for package in tomllib.loads((ROOT / manifest / 'Cargo.lock').read_text())['package']:
            if package.get('source', '').startswith('registry+'):
                key = ('rust', package['name'], package['version'])
                checksum = package['checksum']
                if key in result and result[key] != checksum:
                    raise ValueError('conflicting lock checksum')
                result[key] = checksum
    for key, value in yaml.safe_load((ROOT / 'pnpm-lock.yaml').read_text())['packages'].items():
        name, version = key.rsplit('@', 1)
        result[('javascript', name, version)] = value['resolution']['integrity']
    return [(*key, checksum) for key, checksum in sorted(result.items())]


def preserve_repository_notices(scratch):
    source = ROOT / 'third_party/rhwp'
    files = [source / 'LICENSE', source / 'THIRD_PARTY_LICENSES.md']
    for folder in ['vendor', 'licenses']:
        files += [p for p in (source / folder).rglob('*') if p.is_file() and (p.name.upper().startswith(('LICENSE', 'COPYING', 'NOTICE', 'COPYRIGHT')) or p.name == 'README.ijg')]
    files += [source / 'vendor/rhwp-zune-jpeg/RHWP_PATCHES.md']
    for path in files:
        target = Path(scratch) / 'rhwp' / path.relative_to(source)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(path.read_bytes())


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence', type=Path, help='Optional task-specific JSON report path')
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='alhangeul-notices-') as scratch:
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            rows = list(pool.map(lambda entry: inspect(entry, scratch), entries()))
        preserve_repository_notices(scratch)
        report = dict(scope='All lockfiles, including build/dev/optional/non-target; not a target-resolved SBOM or compliance approval. Missing notices remain review gaps.', packages=rows)
        Path(scratch, 'inventory.json').write_text(json.dumps(report, indent=2)+'\n')
        DESTINATION.parent.mkdir(parents=True, exist_ok=True)
        temporary = DESTINATION.with_suffix('.tmp')
        with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED) as output:
            for path in sorted(Path(scratch).rglob('*')):
                if path.is_file():
                    info = zipfile.ZipInfo(path.relative_to(scratch).as_posix(), (1980, 1, 1, 0, 0, 0))
                    output.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED)
        temporary.replace(DESTINATION)
        gaps = [dict(kind=x['kind'], name=x['name'], version=x['version']) for x in rows if not x['notices']]
        evidence = dict(archiveSha256=hashlib.sha256(DESTINATION.read_bytes()).hexdigest(), packages=len(rows), missingNoticeFiles=gaps)
        if args.evidence:
            args.evidence.parent.mkdir(parents=True, exist_ok=True)
            args.evidence.write_text(json.dumps(evidence, indent=2)+'\n')
        print(json.dumps(dict(packages=len(rows), missingNoticeFiles=len(gaps), archiveBytes=DESTINATION.stat().st_size)))
