"""Exact historical installer and signed prerequisite inputs, never product outputs."""
import hashlib
import json
from pathlib import Path
import subprocess

VC = dict(name="vc", file="vc-redist.exe", bytes=18863624,
    sha256="9c02c9ed120f671b900e6b9471d890e3b2414117a7e53f4ae2e855466fa2b7c9",
    url="https://download.visualstudio.microsoft.com/download/pr/78d061c5-9ef3-42ab-98ed-3309d1095dc4/9C02C9ED120F671B900E6B9471D890E3B2414117A7E53F4AE2E855466FA2B7C9/VC_redist.x64.exe")


def download(value, destination):
    subprocess.run(["curl", "--fail", "--location", "--silent", "--show-error",
                    "--connect-timeout", "20", "--max-time", "300", "--output",
                    str(destination), value["url"]], check=True, timeout=310)
    with destination.open("rb") as stream:
        digest = hashlib.sha256()
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    if digest.hexdigest() != value["sha256"]:
        raise RuntimeError("pinned-download-hash-mismatch")
    if "bytes" in value and destination.stat().st_size != value["bytes"]:
        raise RuntimeError("pinned-download-size-mismatch")


def prepare(payload, value):
    value["prerequisites"] = []
    if value["scenario"] == "nsis-upgrade":
        baseline = json.loads(subprocess.check_output(["node", "--input-type=module", "-e",
            "import {PUBLIC_INPUT} from './scripts/windows-thumbnail-user-input.mjs'; console.log(JSON.stringify(PUBLIC_INPUT))"],
            text=True))
        download(dict(url=baseline["installerUrl"], sha256=baseline["installerSha256"]),
                 payload / "baseline.exe")
        value["baseline"] = baseline
        value["prerequisites"].append(VC)
    for item in value["prerequisites"]:
        download(item, payload / item["file"])
