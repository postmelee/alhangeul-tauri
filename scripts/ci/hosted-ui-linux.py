"""Observe real KVM capability; never claim a Windows guest was tested."""
import fcntl
import json
import os
import platform
import shutil
import subprocess
from pathlib import Path

if os.environ.get("GITHUB_ACTIONS") != "true" or os.environ.get("RUNNER_ENVIRONMENT") != "github-hosted":
    raise SystemExit("disposable-hosted-only")
root = Path(os.environ["GITHUB_WORKSPACE"])
output = root / "diagnostics/hosted-ui-linux"
output.mkdir(parents=True, exist_ok=True)
usage = shutil.disk_usage(root)
memory = {}
for line in Path("/proc/meminfo").read_text().splitlines():
    key, value = line.split(":", 1)
    if key in ("MemTotal", "MemAvailable"):
        memory[key + "Bytes"] = int(value.strip().split()[0]) * 1024
report = dict(schemaVersion=1, harnessSha=os.environ.get("GITHUB_SHA"),
              kernel=platform.release(), architecture=platform.machine(),
              cpuCount=os.cpu_count(), memory=memory, freeDiskBytes=usage.free,
              totalDiskBytes=usage.total, kvmDevice=Path("/dev/kvm").exists(),
              tunDevice=Path("/dev/net/tun").exists(), kvmApiVersion=None,
              vmCreated=False, vmClosed=False, guestBooted=False,
              windows10Visual="unverified", windows11Visual="unverified",
              minimum32GiBFree=usage.free >= 32 * 1024**3)
fd = vm = None
try:
    fd = os.open("/dev/kvm", os.O_RDWR | os.O_CLOEXEC)
    report["kvmApiVersion"] = fcntl.ioctl(fd, 0xAE00, 0)
    vm = fcntl.ioctl(fd, 0xAE01, 0)
    report["vmCreated"] = True
except OSError as error:
    report["kvmError"] = dict(errno=error.errno, message=error.strerror)
finally:
    if vm is not None:
        os.close(vm)
        report["vmClosed"] = True
    if fd is not None:
        os.close(fd)
for name, command in (("docker", ["docker", "version", "--format", "{{.Server.Version}}"]),
                      ("qemu", ["qemu-system-x86_64", "--version"])):
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=20, check=False)
        report[name] = dict(exitCode=result.returncode, version=result.stdout.strip()[:250])
    except (OSError, subprocess.TimeoutExpired) as error:
        report[name] = dict(unavailable=type(error).__name__)
(output / "capability.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
