"""Inspect exact lockfile registry archives without executing their code."""
import concurrent.futures
import hashlib
import io
import json
import tarfile
import tomllib
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKAGES = tomllib.loads((ROOT / 'apps/desktop/src-tauri/Cargo.lock').read_text())['package']
OUT = ROOT / 'mydocs/working/assets/task135/readiness/cargo-license-inventory.json'

def inspect(package):
    name, version = package['name'], package['version']
    row = {key: package[key] for key in ('name', 'version', 'source', 'checksum') if key in package}
    if not package.get('source', '').startswith('registry+'):
        return dict(row, status='path/git dependency: inspect repository separately')
    try:
        url = f'https://static.crates.io/crates/{name}/{name}-{version}.crate'
        with urllib.request.urlopen(url, timeout=60) as response:
            data = response.read(50 * 1024 * 1024 + 1)
        if len(data) > 50 * 1024 * 1024:
            raise ValueError('archive exceeds inspection bound')
        if hashlib.sha256(data).hexdigest() != package['checksum']:
            raise ValueError('lockfile checksum mismatch')
        with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
            manifest = archive.extractfile(f'{name}-{version}/Cargo.toml')
            metadata = tomllib.loads(manifest.read().decode())['package']
            notices = []
            for member in archive.getmembers():
                if member.isfile() and member.name.split('/')[-1].upper().startswith(('LICENSE','COPYING','NOTICE','COPYRIGHT')):
                    notices.append({'path': '/'.join(member.name.split('/')[1:]), 'sha256': hashlib.sha256(archive.extractfile(member).read()).hexdigest()})
        return dict(row, status='archive checksum verified', license=metadata.get('license'), license_file=metadata.get('license-file'), notices=notices)
    except Exception as error:
        return dict(row, status='unverified', error=str(error))

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        rows = list(executor.map(inspect, PACKAGES))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'scope':'All lockfile packages, includes build/dev/non-target; not target-resolved SBOM or license compatibility approval', 'packages':rows},indent=2)+'\n')
    from collections import Counter
    print(json.dumps(dict(Counter(row['status'] for row in rows)), indent=2))
