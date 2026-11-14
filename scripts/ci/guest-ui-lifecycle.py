"""Same-user process control and live artifact checkpoints for an ephemeral guest."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time


def load(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + ".py"))
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def identity(pid):
    path = Path("/proc") / str(pid)
    stat = (path / "stat").read_text().rsplit(")", 1)[1].split()
    return dict(pid=pid, start=stat[19], uid=path.stat().st_uid)


def register(root, name, pid):
    control = root / "control"
    control.mkdir(exist_ok=True)
    (control / (name + ".json")).write_text(json.dumps(identity(pid)))


def stop_owned(record):
    pid = record["pid"]
    try:
        descriptor = os.pidfd_open(pid)
    except ProcessLookupError:
        return "already-exited"
    try:
        try:
            current = identity(pid)
        except FileNotFoundError:
            return "already-exited"
        if current != record or record["uid"] != os.getuid():
            raise RuntimeError("owned-process-identity-mismatch")
        signal.pidfd_send_signal(descriptor, signal.SIGTERM)
        import select
        poll = select.poll()
        poll.register(descriptor, select.POLLIN)
        if not poll.poll(10000):
            signal.pidfd_send_signal(descriptor, signal.SIGKILL)
            if not poll.poll(5000):
                raise RuntimeError("owned-process-did-not-exit")
        return "stopped"
    except ProcessLookupError:
        return "already-exited"
    finally:
        os.close(descriptor)


def stop_all(root):
    result = {}
    # Stop the supervisor first so its finally block can close its own children.
    for name in ("supervisor", "qemu", "tpm"):
        record = root / ("control/" + name + ".json")
        if record.exists():
            result[name] = stop_owned(json.loads(record.read_text()))
    (root / "evidence/cleanup.json").write_text(json.dumps(result, indent=2))


def start(root):
    if (root / "control").exists():
        raise RuntimeError("fresh-process-control-required")
    with (root / "evidence/host-process.log").open("w") as log:
        process = subprocess.Popen([sys.executable, "-B", str(Path(__file__).with_name("guest-ui-run.py"))],
                                   stdin=subprocess.DEVNULL, stdout=log, stderr=log,
                                   start_new_session=True)
    register(root, "supervisor", process.pid)
    print("Started owned guest supervisor", flush=True)


def wait(root, seconds, checkpoint):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if (root / "exit.json").exists():
            break
        time.sleep(5)
    if checkpoint:
        target = root / "checkpoint"
        if target.exists():
            shutil.rmtree(target)
        target.mkdir()
        screens = sorted((root / "evidence").glob("screen-*.png"))
        for source in screens[-3:]:
            shutil.copyfile(source, target / source.name)
        for source in (root / "evidence").glob("*.json"):
            shutil.copyfile(source, target / source.name)
        if not screens:
            (target / "waiting.json").write_text('{"guestScreenshot":"not-yet-available"}')
        print("Guest checkpoint prepared", flush=True)
        return
    if not (root / "exit.json").exists():
        raise RuntimeError("guest-supervisor-timeout")
    status = json.loads((root / "exit.json").read_text())
    if status["exitCode"] != 0:
        raise RuntimeError("guest-observation-failed")


def main():
    root = load("guest-ui-prepare").guard()
    mode = sys.argv[1]
    if mode == "start":
        start(root)
    elif mode == "checkpoint":
        wait(root, int(sys.argv[2]), True)
    elif mode == "wait":
        wait(root, 3600, False)
    elif mode == "stop":
        stop_all(root)
    elif mode == "remove":
        stop_all(root)
        shutil.rmtree(root)
    else:
        raise ValueError("invalid-lifecycle-mode")


if __name__ == "__main__":
    main()
