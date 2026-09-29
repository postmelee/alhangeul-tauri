#!/usr/bin/env bash
# Host orchestration only. Product bytes are verified before this script runs.
set -euo pipefail
phase=environment
vm_root=$(mktemp -d "$RUNNER_TEMP/alhangeul-fedora-vm.XXXXXX")
evidence="$PWD/candidate-evidence"
mkdir -p "$evidence/guest"
ssh_options=(-i "$vm_root/id_ed25519" -p 2222 -o BatchMode=yes -o ConnectTimeout=5
  -o ServerAliveInterval=10 -o ServerAliveCountMax=3
  -o StrictHostKeyChecking=accept-new -o "UserKnownHostsFile=$vm_root/known_hosts")
# Commands intentionally expand on the host; callers pass fixed commands or a SHA-256.
# shellcheck disable=SC2029
guest() { ssh "${ssh_options[@]}" acceptance@127.0.0.1 "$@"; }
collect() {
  guest 'sudo journalctl -b --no-pager -u lightdm -u systemd-logind' > "$evidence/guest-session-journal.txt"
  guest 'sudo journalctl -b -k --no-pager' > "$evidence/guest-kernel.txt"
  guest 'tar -C /home/acceptance/payload/evidence -czf - .' | tar -xzf - -C "$evidence/guest"
}
finish() {
  local code=$?
  trap - EXIT
  if [[ "$phase" != complete ]]; then collect 2> "$evidence/collection-errors.txt" || true; fi
  if [[ -f "$vm_root/qemu.pid" ]]; then sudo kill "$(cat "$vm_root/qemu.pid")" 2>/dev/null || true; fi
  printf '{"lastPhase":"%s","exitCode":%s}\n' "$phase" "$code" > "$evidence/vm-outcome.json"
  exit "$code"
}
trap finish EXIT
sudo test -c /dev/kvm
test "$(uname -m)" = x86_64
qemu-system-x86_64 --version > "$evidence/qemu-version.txt"
phase=image
image_name=Fedora-Cloud-Base-Generic-44-1.7.x86_64.qcow2
image_sha=28680fe5b371a5a82ebf43a31926e086a168e59949d03969c5093e7071f90b7f
curl --fail --location --retry 3 --proto '=https' --proto-redir '=https' \
  "https://dl.fedoraproject.org/pub/fedora/linux/releases/44/Cloud/x86_64/images/$image_name" \
  --output "$vm_root/base.qcow2"
printf '%s  %s\n' "$image_sha" "$vm_root/base.qcow2" | sha256sum --check > "$evidence/vm-image-verification.txt"
printf '%s  %s\n' "$image_sha" "$image_name" > "$evidence/vm-image.sha256"
qemu-img info --output=json "$vm_root/base.qcow2" > "$evidence/vm-image.json"
qemu-img create -f qcow2 -F qcow2 -b "$vm_root/base.qcow2" "$vm_root/guest.qcow2" 16G
ssh-keygen -q -t ed25519 -N '' -f "$vm_root/id_ed25519"
cat > "$vm_root/user-data" <<CLOUD
#cloud-config
users:
  - name: acceptance
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
    lock_passwd: true
    ssh_authorized_keys:
      - $(cat "$vm_root/id_ed25519.pub")
ssh_pwauth: false
disable_root: true
CLOUD
printf 'instance-id: alhangeul-rpm-vm\nlocal-hostname: alhangeul-rpm-vm\n' > "$vm_root/meta-data"
cloud-localds "$vm_root/seed.img" "$vm_root/user-data" "$vm_root/meta-data"
phase=boot
sudo qemu-system-x86_64 -enable-kvm -cpu host -smp 2 -m 4096 \
  -drive "file=$vm_root/guest.qcow2,if=virtio,format=qcow2" \
  -drive "file=$vm_root/seed.img,if=virtio,format=raw,readonly=on" \
  -netdev user,id=net0,hostfwd=tcp:127.0.0.1:2222-:22 -device virtio-net-pci,netdev=net0 \
  -device virtio-vga -display none -serial "file:$evidence/vm-serial.log" \
  -daemonize -pidfile "$vm_root/qemu.pid"
for ((attempt=0; attempt<90; attempt++)); do
  if guest true 2>/dev/null; then break; fi
  sleep 5
done
guest 'sudo cloud-init status --wait' > "$evidence/cloud-init-status.txt"
phase=transfer
# Allowlisted payload: no .git, host environment, credentials, or private SSH key.
mkdir -p "$vm_root/payload"
cp "$(command -v node)" "$vm_root/payload/node"
cp "$HOME/.cargo/bin/tauri-driver" "$vm_root/payload/tauri-driver"
cp "$INSTALLER_PATH" "$vm_root/payload/candidate.rpm"
printf '6c87ba0321f6a9c8ca5068915217064f8c839cabaf3a8d60451df8f3e496308c  candidate.rpm\n' \
  > "$vm_root/payload/candidate.sha256"
tar -cf - package.json node_modules tests/gui scripts/ci/release-fedora-vm-guest.sh \
  scripts/ci/release-fedora-vm-session.sh apps/studio-host/vendor/rhwp-core \
  third_party/rhwp/samples/biz_plan.hwp third_party/rhwp/samples/hwpx/form-002.hwpx \
  | tar -xf - -C "$vm_root/payload"
tar -C "$vm_root/payload" -czf "$vm_root/payload.tar.gz" .
sha256sum "$vm_root/payload.tar.gz" | cut -d ' ' -f 1 > "$vm_root/payload.sha256"
cat "$vm_root/payload.sha256" > "$evidence/vm-payload.sha256"
guest 'mkdir -p /home/acceptance/payload'
ssh "${ssh_options[@]}" acceptance@127.0.0.1 'cat > /home/acceptance/payload.tar.gz' < "$vm_root/payload.tar.gz"
expected_payload=$(cat "$vm_root/payload.sha256")
guest "echo '$expected_payload  /home/acceptance/payload.tar.gz' | sha256sum --check"
guest 'tar -xzf /home/acceptance/payload.tar.gz -C /home/acceptance/payload'
phase=provision
guest 'sudo bash /home/acceptance/payload/scripts/ci/release-fedora-vm-guest.sh' \
  2>&1 | tee "$evidence/vm-provision.log"
phase=desktop-gui
for ((attempt=0; attempt<120; attempt++)); do
  if guest 'test -f /home/acceptance/payload/evidence/package-acceptance.json'; then break; fi
  sleep 10
done
phase=collect
collect
node --input-type=module <<'JS'
import { readFileSync } from 'node:fs';
const result=JSON.parse(readFileSync('candidate-evidence/guest/package-acceptance.json'));
if(result.exitCode!==0||result.lastPhase!=='complete') throw new Error('Fedora VM GUI did not pass');
JS
phase=complete
