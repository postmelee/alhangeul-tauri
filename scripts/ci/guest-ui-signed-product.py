"""Prepare a signed candidate without converting ordinary evidence to release acceptance."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess


def msi_tools():
    spec = importlib.util.spec_from_file_location("msi_input", Path(__file__).with_name("guest-ui-msi-input.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def prepare(root, payload, scenario):
    data = json.loads((root / "signed-selection.json").read_text())
    if data.get("signaturesVerified") is not True or data["harnessSha"] != os.environ["GITHUB_SHA"]:
        raise RuntimeError("signed-candidate-not-verified")
    bundle = root / "bundle"
    msi = data["targets"]["windows-x86_64-msi"]
    identity, binaries = msi_tools().inspect(bundle / msi["path"], root / "signed-msi-reference")
    for binary in binaries:
        binary["imports"] = json.loads(subprocess.check_output(["node", "--input-type=module", "-e",
            "import {readFileSync} from 'node:fs'; import {requireStaticThumbnailCrt} from './scripts/windows-pe-imports.mjs'; console.log(JSON.stringify(requireStaticThumbnailCrt(readFileSync(process.argv[1]))));",
            binary["path"]], text=True))
    kind = "msi" if scenario.startswith("msi") else "nsis"
    selected = data["targets"]["windows-x86_64-" + kind]
    shutil.copyfile(bundle / selected["path"], payload / ("installer.msi" if kind == "msi" else "installer.exe"))
    (payload / "verification").mkdir()
    shutil.copyfile(next(b["path"] for b in binaries if b["kind"] == "thumbnail-handler"),
                    payload / "verification/AlhangeulThumbnailHandler.dll")
    for binary in binaries:
        del binary["path"]
    (root / "evidence/signed-selection.json").write_text(json.dumps(data, indent=2))
    value = dict(productSha=data["productSha"], installerSha256=selected["sha256"],
                signaturesVerified=True, producerRun=data["producerRun"],
                keyFingerprint=data["keyFingerprint"], msiIdentity=identity, binaries=binaries)
    (root / "evidence/signed-product.json").write_text(json.dumps(value, indent=2))
    return value
