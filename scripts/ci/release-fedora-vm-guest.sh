#!/usr/bin/env bash
# Runs as root inside the disposable Fedora guest, never on the host.
set -euo pipefail
cd /home/acceptance/payload
mkdir -p evidence
phase=guest-environment
record_failure() {
  local code=$?
  if [[ "$code" != 0 ]]; then
    printf '{"lastPhase":"%s","exitCode":%s}\n' "$phase" "$code" > evidence/package-acceptance.json
  fi
}
trap record_failure EXIT
test "$(uname -m)" = x86_64
test "$(rpm -E '%{fedora}')" = 44
test "$(systemd-detect-virt)" = kvm
cat /etc/os-release > evidence/package-os-release.txt
uname -a > evidence/kernel.txt
systemd-detect-virt > evidence/virtualization.txt
sha256sum --check candidate.sha256 > evidence/rpm-transfer-verification.txt
phase=install
dnf install -y ./candidate.rpm 2>&1 | tee evidence/install.log
package_name=$(rpm -qp --qf '%{NAME}' candidate.rpm)
test "$(rpm -q --qf '%{ARCH} %{VERSION}-%{RELEASE}' "$package_name")" = 'x86_64 0.1.0-1'
rpm -q --qf '%{NAME} %{ARCH} %{VERSION}-%{RELEASE}\n' "$package_name" > evidence/installed-package.txt
phase=desktop-dependencies
dnf install -y lightdm lightdm-gtk xfce4-session xfwm4 xfdesktop xfce4-panel Thunar \
  xorg-x11-server-Xorg xorg-x11-drv-libinput mesa-dri-drivers dbus-x11 \
  at-spi2-core python3-gobject python3-pyatspi xdotool scrot \
  google-noto-sans-cjk-fonts webkitgtk6.0 which procps-ng
rpm -qa | sort > evidence/gui-packages.txt
command -v WebKitWebDriver
install -m 0755 node /usr/local/bin/node
install -m 0755 tauri-driver /usr/local/bin/tauri-driver
sha256sum /usr/local/bin/node /usr/local/bin/tauri-driver > evidence/harness-binaries.sha256
phase=desktop-session
mkdir -p /etc/lightdm/lightdm.conf.d /home/acceptance/.config/autostart
cat > /etc/lightdm/lightdm.conf.d/99-acceptance.conf <<'LIGHTDM'
[Seat:*]
autologin-user=acceptance
autologin-user-timeout=0
user-session=xfce
autologin-session=xfce
LIGHTDM
cat > /home/acceptance/.config/autostart/alhangeul-acceptance.desktop <<'DESKTOP'
[Desktop Entry]
Type=Application
Name=Alhangeul RPM acceptance
Exec=/bin/bash /home/acceptance/payload/scripts/ci/release-fedora-vm-session.sh
Terminal=false
DESKTOP
chown -R acceptance:acceptance /home/acceptance/payload /home/acceptance/.config
# Keep Fedora SELinux policy enabled, including the normal home labels.
restorecon -RF /home/acceptance /etc/lightdm
systemctl enable lightdm.service
systemctl start lightdm.service
