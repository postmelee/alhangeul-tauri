"""Hosted Ubuntu DNS-outage fallback. Ubuntu archive signatures remain mandatory."""
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

MIRRORS = {
    "amd64": "https://mirrors.tuna.tsinghua.edu.cn/ubuntu",
    "arm64": "https://mirrors.tuna.tsinghua.edu.cn/ubuntu-ports",
}
HOSTS = {
    "amd64": ("azure.archive.ubuntu.com", "archive.ubuntu.com", "security.ubuntu.com"),
    "arm64": ("ports.ubuntu.com",),
}


def rewrite_source(source, architecture):
    mirror = MIRRORS[architecture]
    hosts = "|".join(re.escape(host) for host in HOSTS[architecture])
    archive = "ubuntu" if architecture == "amd64" else "ubuntu-ports"
    return re.sub(r"https?://(?:" + hosts + r")/" + archive + r"(?=[/\s]|$)", mirror, source)


def require_hosted_ubuntu(env, platform, os_release, architecture):
    if platform != "linux" or env.get("GITHUB_ACTIONS") != "true" or env.get("RUNNER_ENVIRONMENT") != "github-hosted":
        raise RuntimeError("hosted-linux-ci-required")
    if os_release.get("ID") != "ubuntu" or os_release.get("VERSION_CODENAME") not in ("jammy", "noble") or architecture not in MIRRORS:
        raise RuntimeError("unsupported-ubuntu-runner")


def resolves(host):
    try:
        return subprocess.run(["getent", "ahostsv4", host], stdout=subprocess.DEVNULL,
                              stderr=subprocess.DEVNULL, timeout=5).returncode == 0
    except subprocess.TimeoutExpired:
        return False


def verify_mirror(architecture, codename):
    # Use the runner image's existing Ubuntu archive trust root, never a key from the mirror.
    keyring = Path("/usr/share/keyrings/ubuntu-archive-keyring.gpg")
    if not keyring.is_file():
        raise RuntimeError("ubuntu-trust-root-missing")
    with tempfile.TemporaryDirectory(prefix="alhangeul-apt-") as root:
        for suite in (codename, codename + "-updates", codename + "-security"):
            target = str(Path(root) / suite)
            url = MIRRORS[architecture] + "/dists/" + suite + "/InRelease"
            subprocess.run(["curl", "--fail", "--silent", "--show-error", "--location",
                            "--proto", "=https", "--proto-redir", "=https", "--max-time", "30",
                            "--output", target, url], check=True)
            subprocess.run(["gpgv", "--keyring", str(keyring), target], check=True)


def main():
    release = {}
    for line in Path("/etc/os-release").read_text().splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            release[key] = value.strip('"')
    architecture = subprocess.check_output(["dpkg", "--print-architecture"], text=True).strip()
    require_hosted_ubuntu(os.environ, sys.platform, release, architecture)
    if os.geteuid() != 0:
        raise RuntimeError("ci-source-update-requires-root")
    failed = [host for host in HOSTS[architecture] if not resolves(host)]
    if not failed:
        print("Ubuntu mirror DNS resolved; existing sources preserved.")
        return
    print("Ubuntu DNS unavailable: " + ", ".join(failed), flush=True)
    paths = [Path("/etc/apt/sources.list"), Path("/etc/apt/apt-mirrors.txt")]
    directory = Path("/etc/apt/sources.list.d")
    paths += sorted(directory.glob("*.list")) + sorted(directory.glob("*.sources"))
    changes = []
    for path in paths:
        if path.is_file():
            before = path.read_text()
            after = rewrite_source(before, architecture)
            if before != after:
                changes.append((path, after))
    if not changes:
        print("No affected Ubuntu source URLs; existing sources preserved.")
        return
    verify_mirror(architecture, release["VERSION_CODENAME"])
    for path, after in changes:
        path.write_text(after)
    print("Verified Ubuntu-signed HTTPS fallback applied to " + str(len(changes)) + " CI source files.")


if __name__ == "__main__":
    main()
