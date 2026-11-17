"""Read exact MSI metadata and extract reference bytes on the disposable Linux host."""
import hashlib
from pathlib import Path
import re
import subprocess

GUID = re.compile(r"^\{[0-9A-Fa-f-]{36}\}$")
BINARY_NAMES = {"thumbnail-handler": "AlhangeulThumbnailHandler.dll",
                "thumbnail-worker": "AlhangeulThumbnailWorker.exe"}


def inspect(msi, destination):
    raw = subprocess.check_output(["msiinfo", "export", str(msi), "Property"], text=True)
    rows = [line.split("\t") for line in raw.splitlines()[3:]]
    properties = {row[0]: row[1] for row in rows if len(row) == 2}
    summary = subprocess.check_output(["msiinfo", "suminfo", str(msi)], text=True)
    revisions = re.findall(r"(?im)^Revision number.*?(\{[0-9a-f-]{36}\})", summary)
    identity = {key: properties.get(key) for key in ("ProductCode", "UpgradeCode", "ProductVersion")}
    if len(revisions) != 1:
        raise RuntimeError("msi-package-code-missing")
    identity["PackageCode"] = revisions[0].upper()
    for key in ("ProductCode", "UpgradeCode"):
        if identity[key]:
            identity[key] = identity[key].upper()
    if identity["ProductVersion"] != "0.1.3" or any(not GUID.fullmatch(identity[k] or "")
            for k in ("ProductCode", "UpgradeCode", "PackageCode")):
        raise RuntimeError("invalid-msi-identity")
    destination.mkdir()
    subprocess.run(["msiextract", "-C", str(destination), str(msi)], check=True,
                   stdout=subprocess.DEVNULL)
    binaries = []
    for kind, name in BINARY_NAMES.items():
        matches = list(destination.rglob(name))
        if len(matches) != 1 or matches[0].is_symlink():
            raise RuntimeError("msi-reference-not-unique")
        path = matches[0]
        binaries.append(dict(kind=kind, name=name, path=str(path),
                             size=path.stat().st_size, sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    return identity, binaries


def require_same_version_upgrade(old, new):
    if (old["ProductVersion"] != new["ProductVersion"] or old["UpgradeCode"].upper() != new["UpgradeCode"].upper()
            or old["ProductCode"].upper() == new["ProductCode"].upper()
            or old["PackageCode"].upper() == new["PackageCode"].upper()):
        raise RuntimeError("same-version-msi-identity-mismatch")
