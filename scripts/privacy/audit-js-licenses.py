"""Verify pnpm registry archives; never install or execute package scripts."""
import base64
import concurrent.futures
import hashlib
import io
import json
import tarfile
import urllib.parse
import urllib.request
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[2]
PACKAGES = yaml.safe_load((ROOT / 'pnpm-lock.yaml').read_text())['packages']

def inspect(entry):
    key, lock = entry
    name, version = key.rsplit('@', 1)
    row = {'name':name, 'version':version}
    try:
        url = 'https://registry.npmjs.org/' + urllib.parse.quote(name, safe='') + '/' + version
        with urllib.request.urlopen(url, timeout=60) as response:
            metadata = json.load(response)
        archive_url = metadata['dist']['tarball']
        parsed = urllib.parse.urlsplit(archive_url)
        if parsed.scheme != 'https' or parsed.hostname != 'registry.npmjs.org':
            raise ValueError('non-registry archive requires separate inspection')
        with urllib.request.urlopen(archive_url, timeout=60) as response:
            data = response.read(100 * 1024 * 1024 + 1)
        if len(data) > 100 * 1024 * 1024:
            raise ValueError('archive exceeds inspection bound')
        integrity = lock['resolution']['integrity']
        algorithm, expected = integrity.split('-',1)
        if base64.b64encode(hashlib.new(algorithm,data).digest()).decode() != expected:
            raise ValueError('lockfile integrity mismatch')
        with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as archive:
            manifests = [x for x in archive.getmembers() if x.name.count('/')==1 and x.name.endswith('/package.json')]
            if len(manifests)!=1: raise ValueError('ambiguous package manifest')
            package=json.load(archive.extractfile(manifests[0]))
            notices=[]
            for member in archive.getmembers():
                if member.isfile() and member.name.split('/')[-1].upper().startswith(('LICENSE','COPYING','NOTICE','COPYRIGHT')):
                    notices.append({'path':'/'.join(member.name.split('/')[1:]),'sha256':hashlib.sha256(archive.extractfile(member).read()).hexdigest()})
        return dict(row,status='archive integrity verified',integrity=integrity,license=package.get('license',package.get('licenses')),notices=notices)
    except Exception as error:
        return dict(row,status='unverified',error=str(error))

if __name__=='__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        rows=list(executor.map(inspect,PACKAGES.items()))
    out=ROOT/'mydocs/working/assets/task135/readiness/js-license-inventory.json'
    out.write_text(json.dumps({'scope':'All pnpm lockfile registry packages incl. dev/optional; not shipped-bundle SBOM or compatibility approval','packages':rows},indent=2)+'\n')
    from collections import Counter
    print(json.dumps(dict(Counter(x['status'] for x in rows)),indent=2))
