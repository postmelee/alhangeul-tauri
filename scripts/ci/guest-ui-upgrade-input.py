"""Exact historical installer and signed prerequisite inputs, never product outputs."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess

VC = dict(name="vc", file="vc-redist.exe", bytes=18863624,
    sha256="9c02c9ed120f671b900e6b9471d890e3b2414117a7e53f4ae2e855466fa2b7c9",
    url="https://download.visualstudio.microsoft.com/download/pr/78d061c5-9ef3-42ab-98ed-3309d1095dc4/9C02C9ED120F671B900E6B9471D890E3B2414117A7E53F4AE2E855466FA2B7C9/VC_redist.x64.exe")


WEBVIEW = dict(name="webview2", file="webview2.exe", bytes=215195856,
    sha256="1d1c838e5971343c060415da7c630c3c1ca7ad33fbb61cca660f3c1122f4cca8",
    url="https://msedge.sf.dl.delivery.mp.microsoft.com/filestreamingservice/files/14f2cd10-e392-45ff-a699-5e08c803d4c7/MicrosoftEdgeWebView2RuntimeInstallerX64.exe")


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
    if value["scenario"] in ("nsis-upgrade", "msi-upgrade"):
        baseline = json.loads(subprocess.check_output(["node", "--input-type=module", "-e",
            "import {PUBLIC_INPUT} from './scripts/windows-thumbnail-user-input.mjs'; console.log(JSON.stringify(PUBLIC_INPUT))"],
            text=True))
        if value["scenario"] == "msi-upgrade":
            baseline["installerUrl"] = "https://github.com/postmelee/alhangeul-tauri/releases/download/v0.1.3/Alhangeul_0.1.3_x64_en-US.msi"
            baseline["installerSha256"] = "a953c0d09dec29246ae77340e019e7acae759aac24b21fc7a524326ab81b6085"
        download(dict(url=baseline["installerUrl"], sha256=baseline["installerSha256"]),
                 payload / ("baseline.msi" if value["scenario"] == "msi-upgrade" else "baseline.exe"))
        if value["scenario"] == "msi-upgrade":
            prepare_msi_baseline(payload, value, baseline)
        value["baseline"] = baseline
        value["prerequisites"].append(VC)
    if value["operatingSystem"]["id"] == "windows10":
        value["prerequisites"].append(WEBVIEW)
    for item in value["prerequisites"]:
        download(item, payload / item["file"])


def prepare_msi_baseline(payload, value, baseline):
    spec = importlib.util.spec_from_file_location("msi_input", Path(__file__).with_name("guest-ui-msi-input.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    identity, binaries = module.inspect(payload / "baseline.msi", payload.parent.parent / "baseline-msi-reference")
    module.require_same_version_upgrade(identity, value["msiIdentity"])
    for binary in binaries:
        expected = next(b for b in baseline["binaries"] if b["name"] == binary["name"])
        if (binary["size"], binary["sha256"]) != (expected["bytes"], expected["sha256"]):
            raise RuntimeError("public-msi-binary-mismatch")
    baseline["msiIdentity"] = identity
