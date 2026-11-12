"""Run only the new private QEMU guest, with bounded lifetime and no network."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import time


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + ".py"))
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


class Monitor:
    def __init__(self, path):
        self.socket = socket.socket(socket.AF_UNIX)
        self.socket.settimeout(15)
        self.socket.connect(str(path))
        self.stream = self.socket.makefile("rwb", buffering=0)
        json.loads(self.stream.readline())
        self.call("qmp_capabilities")

    def call(self, command, arguments=None):
        self.stream.write((json.dumps(dict(execute=command, arguments=arguments or {})) + "\n").encode())
        while True:
            value = json.loads(self.stream.readline())
            if "error" in value:
                raise RuntimeError("qmp-" + str(value["error"]))
            if "return" in value:
                return value["return"]

    def close(self):
        self.stream.close()
        self.socket.close()


def command(root):
    return [
        "qemu-system-x86_64", "-machine", "q35,accel=kvm,smm=on", "-cpu", "host,hv_relaxed,hv_vapic,hv_spinlocks=0x1fff,hv_vpindex,hv_synic,hv_time,hv_stimer",
        "-m", "8192", "-smp", "4", "-display", "none", "-vga", "std", "-nic", "none",
        "-rtc", "base=localtime", "-global", "driver=cfi.pflash01,property=secure,value=on",
        "-drive", "if=pflash,format=raw,readonly=on,file=/usr/share/OVMF/OVMF_CODE_4M.secboot.fd",
        "-drive", "if=pflash,format=raw,file=" + str(root / "vars.fd"),
        "-chardev", "socket,id=chrtpm,path=" + str(root / "tpm.sock"),
        "-tpmdev", "emulator,id=tpm0,chardev=chrtpm", "-device", "tpm-crb,tpmdev=tpm0",
        "-drive", "if=none,id=os,format=qcow2,file=" + str(root / "guest.qcow2"),
        "-device", "ide-hd,drive=os,bus=ide.0,bootindex=1",
        "-drive", "if=none,id=install,format=raw,media=cdrom,readonly=on,file=" + str(root / "windows.iso"),
        "-device", "ide-cd,drive=install,bus=ide.1,bootindex=2",
        "-drive", "if=none,id=payload,format=raw,media=cdrom,readonly=on,file=" + str(root / "payload.iso"),
        "-device", "ide-cd,drive=payload,bus=ide.2",
        "-serial", "file:" + str(root / "evidence/serial.log"),
        "-qmp", "unix:" + str(root / "qmp.sock") + ",server=on,wait=off",
    ]


def wait_socket(path, process):
    for _ in range(60):
        if path.exists():
            return
        if process.poll() is not None:
            raise RuntimeError("owned-process-exited-before-ready")
        time.sleep(1)
    raise RuntimeError("owned-socket-timeout")


def observe(root, process):
    monitor = Monitor(root / "qmp.sock")
    start = time.monotonic()
    result = dict(guestEvidenceComplete=False, releaseAcceptance="unverified",
                  harnessSha=os.environ["GITHUB_SHA"])
    try:
        next_screen = 0
        serial = root / "evidence/serial.log"
        while time.monotonic() - start < 3600:
            elapsed = int(time.monotonic() - start)
            if process.poll() is not None:
                raise RuntimeError("qemu-exited-" + str(process.returncode))
            if elapsed < 20:
                monitor.call("human-monitor-command", {"command-line": "sendkey spc"})
            if elapsed >= next_screen:
                screen = root / ("evidence/screen-%04d.png" % elapsed)
                partial = screen.with_suffix(".partial")
                monitor.call("screendump", {"filename": str(partial), "format": "png"})
                partial.replace(screen)
                next_screen = elapsed + 60
                print("Windows guest elapsed=%ss; waiting for standard-user evidence" % elapsed, flush=True)
            if serial.exists():
                if serial.stat().st_size > 30 * 1024**2:
                    raise RuntimeError("serial-size-limit")
                content = serial.read_text(errors="replace")
                if any(line.startswith("ALH ") and '"kind":"done"' in line for line in content.splitlines()):
                    result["guestEvidenceComplete"] = module("guest-ui-evidence").decode(content, root / "evidence")
                    break
            time.sleep(5)
        result["elapsedSeconds"] = round(time.monotonic() - start, 2)
        if not result["guestEvidenceComplete"]:
            raise RuntimeError("guest-evidence-timeout")
        guest = json.loads((root / "evidence/guest.json").read_text(encoding="utf-8-sig"))
        result["observed"] = (guest["status"] == "observed" and guest["productUninstallPassed"]
                              and guest.get("desktopOwnerMatches") is True
                              and guest.get("sessionMatches") is True
                              and guest.get("displayPreference", {}).get("restored") is True
                              and guest["visual"] == "captured-awaiting-review"
                              and len(guest["probes"]) == 4)
        if not result["observed"]:
            raise RuntimeError("guest-product-observation-incomplete")
    except BaseException as error:
        result["failure"] = str(error)
        raise
    finally:
        (root / "evidence/host.json").write_text(json.dumps(result, indent=2))
        monitor.close()


def stop(process):
    if process and process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=15)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


def interrupted(_signum, _frame):
    raise SystemExit("guest-host-interrupted")


def main():
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    root = module("guest-ui-prepare").guard()
    if (root / "guest.qcow2").exists():
        raise RuntimeError("fresh-guest-disk-required")
    shutil.copyfile("/usr/share/OVMF/OVMF_VARS_4M.ms.fd", root / "vars.fd")
    subprocess.run(["qemu-img", "create", "-f", "qcow2", str(root / "guest.qcow2"), "80G"], check=True)
    (root / "tpm").mkdir()
    processes = []
    try:
        with (root / "evidence/qemu.log").open("w") as log:
            tpm = subprocess.Popen(["swtpm", "socket", "--tpm2", "--tpmstate", "dir=" + str(root / "tpm"),
                                    "--ctrl", "type=unixio,path=" + str(root / "tpm.sock"),
                                    "--flags", "not-need-init"], stdout=log, stderr=log)
            processes.append(tpm)
            module("guest-ui-lifecycle").register(root, "tpm", tpm.pid)
            wait_socket(root / "tpm.sock", tpm)
            qemu = subprocess.Popen(command(root), stdout=log, stderr=log)
            processes.append(qemu)
            module("guest-ui-lifecycle").register(root, "qemu", qemu.pid)
            wait_socket(root / "qmp.sock", qemu)
            observe(root, qemu)
    finally:
        for process in reversed(processes):
            stop(process)


if __name__ == "__main__":
    exit_code = 1
    try:
        main()
        exit_code = 0
    finally:
        root = module("guest-ui-prepare").guard()
        (root / "exit.json").write_text(json.dumps(dict(exitCode=exit_code)))
