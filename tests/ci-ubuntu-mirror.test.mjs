import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const modulePath = fileURLToPath(new URL('../scripts/ci/ubuntu-mirror.py', import.meta.url));
function run(code, value) {
  return execFileSync('python3', ['-c', `import importlib.util,json,sys
spec=importlib.util.spec_from_file_location('mirror',sys.argv[1])
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
value=json.loads(sys.argv[2])
${code}`, modulePath, JSON.stringify(value)],
    { encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
}
test('rewrites only exact affected archive URLs, preserving apt trust and third-party sources', () => {
  const before = 'deb [signed-by=/usr/share/keyrings/ubuntu-archive-keyring.gpg] http://azure.archive.ubuntu.com/ubuntu/ jammy main\n'
    + 'URIs: https://archive.ubuntu.com/ubuntu https://security.ubuntu.com/ubuntu\n'
    + 'Suites: jammy-updates jammy-security\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n'
    + 'deb https://packages.microsoft.com/ubuntu/22.04/prod jammy main\n'
    + 'deb https://archive.ubuntu.com.example/ubuntu jammy main\n';
  const result = run('print(m.rewrite_source(value,"amd64"),end="")', before);
  assert.equal(result, before.replaceAll('http://azure.archive.ubuntu.com/ubuntu', 'https://mirrors.edge.kernel.org/ubuntu')
    .replaceAll('https://archive.ubuntu.com/ubuntu', 'https://mirrors.edge.kernel.org/ubuntu')
    .replaceAll('https://security.ubuntu.com/ubuntu', 'https://mirrors.edge.kernel.org/ubuntu'));
});
test('arm64 fallback targets ports and does not rewrite x64 archives', () => {
  const before = 'URIs: http://ports.ubuntu.com/ubuntu-ports/\nURIs: https://archive.ubuntu.com/ubuntu\n';
  assert.equal(run('print(m.rewrite_source(value,"arm64"),end="")', before),
    before.replace('http://ports.ubuntu.com/ubuntu-ports/', 'https://mirrors.tuna.tsinghua.edu.cn/ubuntu-ports/'));
});
test('rejects non-hosted, non-Ubuntu and unsupported runner environments', () => {
  const valid = [{ GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted' }, 'linux', { ID: 'ubuntu', VERSION_CODENAME: 'jammy' }, 'amd64'];
  assert.equal(run('m.require_hosted_ubuntu(*value);print("ok",end="")', valid), 'ok');
  for (const [index, replacement] of [[0, {}], [0, { GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'self-hosted' }], [1, 'win32'], [2, { ID: 'debian', VERSION_CODENAME: 'jammy' }], [3, 'riscv64']]) {
    const bad = structuredClone(valid); bad[index] = replacement;
    assert.throws(() => run('m.require_hosted_ubuntu(*value)', bad));
  }
});
test('fallback authenticates every suite before applying sources and retains normal apt verification', () => {
  const source = readFileSync(modulePath, 'utf8');
  assert.ok(source.indexOf('mirror = choose_verified_mirror(architecture, release[') < source.indexOf('path.write_text(rewrite_source('));
  assert.match(source, /codename \+ "-updates", codename \+ "-security"/);
  assert.match(source, /\["gpgv", "--keyring", str\(keyring\), target\], check=True/);
  assert.doesNotMatch(source, /trusted=yes|allow-unauthenticated|AllowInsecure|--insecure/);
});

test('network failures use the next authenticated mirror; signature errors stop immediately', () => {
  const code = `calls=[]
def verify(mirror,codename):
 calls.append(mirror)
 if len(calls)==1 or value=="all-network": raise m.subprocess.CalledProcessError(22 if value!="signature" else 1,["gpgv" if value=="signature" else "curl"])
try:
 selected=m.choose_verified_mirror("amd64","jammy",verify)
 print(json.dumps({"selected":selected,"calls":len(calls)}))
except (m.subprocess.CalledProcessError,RuntimeError): print(json.dumps({"failed":True,"calls":len(calls)}))`;
  const last = value => JSON.parse(run(code, value).trim().split('\n').at(-1));
  assert.deepEqual(last('network'), { selected: 'https://mirrors.tuna.tsinghua.edu.cn/ubuntu', calls: 2 });
  assert.deepEqual(last('all-network'), { failed: true, calls: 2 });
  assert.deepEqual(last('signature'), { failed: true, calls: 1 });
});
