"""Prepare an isolated Windows evaluation guest; never execute on the owner's Mac."""
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import urllib.request
from xml.sax.saxutils import escape
import zipfile

ISO_NAME = "26300.9457.260913-1737.26h2_ge_release_svc_refresh_CLIENTENTERPRISEEVAL_OEMRET_x64FRE_ko-kr.iso"
ISO_URL = "https://software-static.download.prss.microsoft.com/dbazure/" + ISO_NAME
ISO_SHA = "b7ec51f0d332ac2aa4f7faeffbefac961ce6eb7204b5876b48fa8d9f1cf0a9a6"
ISO_SIZE = 8225404928
PRODUCT_SHA = "a2796fc0fd93002ccdcf1e5c313701525b1668c6"


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
    installers = [f for f in data["files"] if f["kind"] == "nsis"]
    if len(installers) != 1:
        raise RuntimeError("nsis-not-unique")
    installer = installers[0]
    shutil.copyfile(bundle / installer["path"], payload / "installer.exe")
    shutil.copyfile(inventory, root / "evidence/inventory.json")
    value = dict(productSha=PRODUCT_SHA, installerSha256=installer["sha256"],
                 harnessSha=os.environ["GITHUB_SHA"], isoSha256=ISO_SHA,
                 binaries=[f for f in data["files"] if f["kind"] in
                           ("thumbnail-handler", "thumbnail-worker")])
    (payload / "input.json").write_text(json.dumps(value, indent=2))
    manifest = json.loads(Path("scripts/windows-thumbnail-fixtures.json").read_text())
    for fixture in manifest["fixtures"]:
        target = payload / fixture["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        relative = fixture["path"].removeprefix("third_party/rhwp/")
        url = "https://raw.githubusercontent.com/edwardkim/rhwp/" + manifest["rhwpSha"] + "/" + relative
        urllib.request.urlretrieve(url, target)
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
    for name in ("guest-ui-probe.ps1", "hosted-ui-view.ps1"):
        shutil.copyfile("scripts/ci/" + name, payload / ("scripts/ci/" + name))
    shutil.copyfile("scripts/ci/guest-ui-bootstrap.ps1", media / "bootstrap.ps1")
    prepare_product(root, payload)
    command = ('powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "'
               "$v=Get-Volume | Where-Object FileSystemLabel -eq 'ALHPAYLOAD'; "
               "& ($v.DriveLetter + ':\\bootstrap.ps1')\"")
    xml = Path("scripts/ci/guest-ui-unattend.xml").read_text()
    for key, value in dict(BOOTSTRAP=command, USER_SECRET="Aa1!" + secrets.token_hex(20),
                           ADMIN_SECRET="Aa1!" + secrets.token_hex(20)).items():
        xml = xml.replace("@@" + key + "@@", escape(value))
    answer = media / "Autounattend.xml"
    answer.write_text(xml)
    answer.chmod(0o600)
    subprocess.run(["xorriso", "-as", "mkisofs", "-quiet", "-J", "-r", "-V",
                    "ALHPAYLOAD", "-o", str(root / "payload.iso"), str(media)], check=True)


def main():
    root = guard()
    if shutil.disk_usage(root).free < 55 * 1024**3:
        raise RuntimeError("insufficient-free-disk")
    iso = root / "windows.iso"
    subprocess.run(["curl", "--fail", "--location", "--silent", "--show-error",
                    "--retry", "2", "--max-time", "1200", "--output", str(iso), ISO_URL], check=True)
    if iso.stat().st_size != ISO_SIZE or digest(iso) != ISO_SHA:
        raise RuntimeError("official-iso-hash-mismatch")
    (root / "evidence/iso.json").write_text(json.dumps(dict(
        url=ISO_URL, sha256=ISO_SHA, bytes=ISO_SIZE, officialHashMatched=True), indent=2))
    print("Official ISO digest verified", flush=True)
    prepare_media(root)


if __name__ == "__main__":
    main()
