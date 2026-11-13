"""Prepare an isolated Windows evaluation guest; never execute on the owner's Mac."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
from xml.sax.saxutils import escape
import zipfile

def operating_system():
    name = os.environ.get("GUEST_OS", "windows11")
    catalog = json.loads(Path(__file__).with_name("guest-ui-os.json").read_text())
    if name not in catalog:
        raise RuntimeError("invalid-guest-os")
    return dict(id=name, **catalog[name])


ISO_URL = operating_system()["url"]
ISO_SHA = operating_system()["sha256"]
ISO_SIZE = operating_system()["bytes"]
PRODUCT_SHA = "1e08891d6411e17806a5b3a48635a5fbca7a639f"


def digest(path):
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def guard():
    if (os.environ.get("GITHUB_ACTIONS") != "true"
            or os.environ.get("RUNNER_ENVIRONMENT") != "github-hosted"
            or os.environ.get("GITHUB_REPOSITORY") != "postmelee/alhangeul-tauri"
            or os.uname().sysname != "Linux" or os.uname().machine != "x86_64"):
        raise RuntimeError("disposable-linux-hosted-only")
    root = Path(os.environ["HOSTED_UI_ROOT"]).resolve()
    if not root.is_relative_to(Path(os.environ["RUNNER_TEMP"]).resolve()):
        raise RuntimeError("runner-temporary-root-required")
    return root


def scenario():
    value = os.environ.get("GUEST_SCENARIO", "nsis")
    if value not in ("nsis", "msi", "nsis-upgrade"):
        raise RuntimeError("invalid-guest-scenario")
    return value


def prepare_product(root, payload):
    bundle = root / "bundle"
    with zipfile.ZipFile(root / "candidate.zip") as archive:
        for name in archive.namelist():
            if not (bundle / name).resolve().is_relative_to(bundle.resolve()):
                raise RuntimeError("archive-path-invalid")
        archive.extractall(bundle)
    inventory = bundle / "alhangeul-artifact-inventory.json"
    subprocess.run(["node", "scripts/verify-desktop-artifacts.mjs", "--platform",
                    "windows-x64", "--root", str(bundle), "--verify-inventory",
                    str(inventory), "--source-sha", PRODUCT_SHA], check=True)
    data = json.loads(inventory.read_text())
    installers = [f for f in data["files"] if f["kind"] == ("msi" if scenario() == "msi" else "nsis")]
    if len(installers) != 1:
        raise RuntimeError("installer-not-unique")
    installer = installers[0]
    shutil.copyfile(bundle / installer["path"], payload / ("installer.msi" if scenario() == "msi" else "installer.exe"))
    shutil.copyfile(inventory, root / "evidence/inventory.json")
    value = dict(scenario=scenario(), operatingSystem=operating_system(), productSha=PRODUCT_SHA, installerSha256=installer["sha256"],
                 harnessSha=os.environ["GITHUB_SHA"], isoSha256=ISO_SHA,
                 binaries=[f for f in data["files"] if f["kind"] in
                           ("thumbnail-handler", "thumbnail-worker")])
    (payload / "verification").mkdir()
    handler = next(f for f in value["binaries"] if f["kind"] == "thumbnail-handler")
    shutil.copyfile(bundle / handler["path"], payload / "verification/AlhangeulThumbnailHandler.dll")
    spec = importlib.util.spec_from_file_location("upgrade_input", Path(__file__).with_name("guest-ui-upgrade-input.py"))
    upgrade = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(upgrade)
    upgrade.prepare(payload, value)
    (payload / "input.json").write_text(json.dumps(value, indent=2))
    manifest = json.loads(Path("scripts/windows-thumbnail-fixtures.json").read_text())
    for fixture in manifest["fixtures"]:
        target = payload / fixture["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        relative = fixture["path"].removeprefix("third_party/rhwp/")
        url = "https://raw.githubusercontent.com/edwardkim/rhwp/" + manifest["rhwpSha"] + "/" + relative
        print("Fetching fixture " + fixture["id"], flush=True)
        subprocess.run(["curl", "--fail", "--location", "--silent", "--show-error",
                        "--connect-timeout", "20", "--max-time", "110", "--output",
                        str(target), url], check=True, timeout=120)
        if digest(target) != fixture["sha256"]:
            raise RuntimeError("fixture-hash-mismatch")


def prepare_media(root):
    media = root / "media"
    payload = media / "payload"
    (payload / "scripts/ci").mkdir(parents=True)
    for suffix in ("diagnostics.ps1", "probe.ps1", "state.ps1", "native.cs",
                   "interop.cs", "token.cs", "fixtures.json", "user-visual.ps1", "user-visual.cs"):
        shutil.copyfile("scripts/windows-thumbnail-" + suffix,
                        payload / ("scripts/windows-thumbnail-" + suffix))
    for name in ("guest-ui-probe.ps1", "guest-ui-installer-state.ps1", "hosted-ui-view.ps1",
                 "guest-ui-process.ps1", "guest-ui-admin.ps1", "guest-ui-operations.ps1",
                 "guest-ui-upgrade.ps1", "guest-ui-prerequisites.ps1", "guest-ui-upgrade-diagnostic.ps1"):
        shutil.copyfile("scripts/ci/" + name, payload / ("scripts/ci/" + name))
    shutil.copyfile("scripts/ci/guest-ui-bootstrap.ps1", media / "bootstrap.ps1")
    prepare_product(root, payload)
    command = ('powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "'
               "$v=Get-Volume | Where-Object FileSystemLabel -eq 'ALHPAYLOAD'; "
               "& ($v.DriveLetter + ':\\bootstrap.ps1')\"")
    xml = Path("scripts/ci/guest-ui-unattend.xml").read_text()
    for key, value in dict(BOOTSTRAP=command, LOCALE=operating_system()["locale"], USER_SECRET="Aa1!" + secrets.token_hex(20),
                           ADMIN_SECRET="Aa1!" + secrets.token_hex(20)).items():
        xml = xml.replace("@@" + key + "@@", escape(value))
    answer = media / "Autounattend.xml"
    answer.write_text(xml)
    answer.chmod(0o600)
    subprocess.run(["xorriso", "-as", "mkisofs", "-quiet", "-J", "-r", "-V",
                    "ALHPAYLOAD", "-o", str(root / "payload.iso"), str(media)], check=True)


def download_iso(root):
    iso = root / "windows.iso"
    print("Downloading pinned Microsoft ISO with bounded HTTPS segments", flush=True)
    subprocess.run(["aria2c", "--no-conf=true", "--no-netrc=true",
                    "--enable-rpc=false", "--follow-torrent=false", "--follow-metalink=false",
                    "--check-certificate=true", "--continue=true", "--file-allocation=none",
                    "--max-connection-per-server=8", "--split=8", "--min-split-size=16M",
                    "--connect-timeout=30", "--timeout=60", "--max-tries=5", "--retry-wait=5",
                    "--summary-interval=30", "--auto-file-renaming=false",
                    "--dir=" + str(root), "--out=windows.iso", ISO_URL], check=True, timeout=1800)
    if iso.stat().st_size != ISO_SIZE or digest(iso) != ISO_SHA:
        raise RuntimeError("official-iso-hash-mismatch")
    (root / "evidence/iso.json").write_text(json.dumps(dict(
        url=ISO_URL, sha256=ISO_SHA, bytes=ISO_SIZE, officialHashMatched=True), indent=2))
    print("Official ISO digest verified", flush=True)


def main():
    root = guard()
    if sys.argv[1:] == ["iso"]:
        if shutil.disk_usage(root).free < 55 * 1024**3:
            raise RuntimeError("insufficient-free-disk")
        download_iso(root)
    elif sys.argv[1:] == ["media"]:
        proof = json.loads((root / "evidence/iso.json").read_text())
        if proof["sha256"] != ISO_SHA or not proof["officialHashMatched"]:
            raise RuntimeError("verified-iso-required")
        prepare_media(root)
    else:
        raise ValueError("expected-iso-or-media-mode")


if __name__ == "__main__":
    main()
