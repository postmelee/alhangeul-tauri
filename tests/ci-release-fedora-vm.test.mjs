import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Fedora VM acceptance uses the verified candidate without forwarding host credentials', async () => {
  const workflow = await read('.github/workflows/alhangeul-release-fedora-vm.yml');
  const host = await read('scripts/ci/release-fedora-vm.sh');
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /node scripts\/ci\/release-linux-candidate\.mjs/);
  assert.match(workflow, /INSTALLER_PATH: \$\{\{ steps\.candidate\.outputs\.installer \}\}/);
  assert.doesNotMatch(workflow, /secrets\.|: write|continue-on-error|build:desktop|build:studio|tauri build|cargo build|gh release/);
  assert.match(host, /hostfwd=tcp:127\.0\.0\.1:2222-:22/);
  assert.match(host, /StrictHostKeyChecking=accept-new/);
  assert.doesNotMatch(host, /SendEnv|AcceptEnv|GH_TOKEN|GITHUB_TOKEN|sshpass|tar -[a-z]*f - \./);
  assert.match(host, /image_sha=28680fe5b371a5a82ebf43a31926e086a168e59949d03969c5093e7071f90b7f/);
  assert.match(host, /sha256sum --check > "\$evidence\/vm-image-verification.txt"/);
  assert.match(host, /-enable-kvm/);
  assert.match(host, /vm_pid=\$\(sudo cat "\$vm_root\/qemu.pid"\)/);
  assert.match(host, /sudo kill -- "\$vm_pid"/);
});

test('Fedora VM uses a real guest desktop and never converts missing GUI evidence to success', async () => {
  const workflow = await read('.github/workflows/alhangeul-release-fedora-vm.yml');
  const host = await read('scripts/ci/release-fedora-vm.sh');
  const guest = await read('scripts/ci/release-fedora-vm-guest.sh');
  const session = await read('scripts/ci/release-fedora-vm-session.sh');
  assert.match(guest, /sha256sum --check candidate.sha256/);
  assert.match(guest, /dnf install -y \.\/candidate.rpm/);
  assert.match(guest, /systemctl start lightdm.service/);
  assert.match(session, /test "\$\(id -u\)" -ne 0/);
  assert.match(session, /loginctl show-session/);
  assert.match(session, /wdio.release-files.conf.ts/);
  assert.doesNotMatch(guest + session, /xvfb-run|dbus-run-session|docker run|setenforce|--nodeps|--skip-broken/);
  assert.match(host, /result.exitCode!==0\|\|result.lastPhase!=='complete'/);
  assert.match(workflow, /vm.exitCode!==0\|\|vm.lastPhase!=='complete'\|\|gui.exitCode!==0\|\|gui.lastPhase!=='complete'/);
  assert.match(workflow, /state.candidate!=='success'\|\|state.acceptance!=='success'/);
  assert.match(session, /local result=\$\?/);
  assert.match(session, /exit "\$result"/);
});


test('VM diagnostics remain readable and preserve cloud-init and cleanup failures', async () => {
  const host = await read('scripts/ci/release-fedora-vm.sh');
  assert.ok(host.indexOf(': > "$evidence/vm-serial.log"') < host.indexOf('sudo qemu-system-x86_64'));
  assert.match(host, /set -euo pipefail/);
  assert.match(host, /phase=cloud-init\nguest 'sudo cloud-init status --wait --long' 2>&1 \| tee/);
  assert.doesNotMatch(host, /cloud-init status[^\n]*\|\| true/);
  assert.match(host, /if \[\[ "\$code" == 0 \]\]; then code=1; fi/);
});
