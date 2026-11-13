"""Fail closed on missing independent guest observations."""
import json
from pathlib import Path
def probes_ok(probes):
    expected = {"small-hwp", "large-hwp", "form-hwpx", "control-jpg"}
    return (isinstance(probes, list) and len(probes) == 4
            and {p.get("id") for p in probes} == expected
            and all(p.get("status") == "ok" and p.get("bitmapPresent") is True for p in probes))


def admin_ok(guest, names):
    if guest.get("adminBoundaryReadOnly") is not True:
        return False
    for name in names:
        result = guest.get("adminOperations", {}).get(name, {})
        if (result.get("status") != "observed" or result.get("operation") != name
                or result.get("system") is not True or result.get("exitCode") != 0
                or result.get("installerSha256") != guest["input"].get("installerSha256")):
            return False
    return True


def prerequisites_ok(guest):
    expected = guest["input"].get("prerequisites", [])
    required = []
    if guest["input"]["scenario"] == "nsis-upgrade":
        required.append("vc")
    if guest["input"].get("operatingSystem", {}).get("id") == "windows10":
        required.append("webview2")
    if [item.get("name") for item in expected] != required:
        return False
    if not expected:
        return True
    if not admin_ok(guest, ["prerequisites"]):
        return False
    actual = guest["adminOperations"]["prerequisites"].get("packages", [])
    if not isinstance(actual, list) or len(actual) != len(expected):
        return False
    for item, result in zip(expected, actual):
        if (item.get("name") != result.get("name") or item.get("sha256") != result.get("sha256")
                or result.get("signatureStatus") != "Valid" or result.get("exitCode") != 0
                or "O=Microsoft Corporation" not in result.get("signer", "")):
            return False
    return True


def upgrade_ok(guest):
    sentinels = guest.get("sentinels", [])
    return (guest.get("baselineExit") == 0 and guest.get("baselineBinariesMatched") is True
            and guest.get("upgradeBinariesMatched") is True and guest.get("reinstallBinariesMatched") is True
            and probes_ok(guest.get("baselineProbes")) and probes_ok(guest.get("upgradeProbes"))
            and guest.get("afterPrerequisites", {}).get("vcRuntimeLoadError") == 0
            and guest.get("userDataPreservedAfterUninstall") is True
            and isinstance(sentinels, list) and len(sentinels) == 2
            and {s.get("folder") for s in sentinels} == {"LocalApplicationData", "ApplicationData"}
            and all(s.get("preserved") is True for s in sentinels))


def complete(guest, network_enabled, scenario, operating_system="windows11"):
    data = guest.get("input", {})
    catalog = json.loads(Path(__file__).with_name("guest-ui-os.json").read_text())
    expected_os = catalog.get(operating_system, {})
    observed_os = guest.get("os", {})
    if (not expected_os or data.get("operatingSystem", {}).get("id") != operating_system
            or str(observed_os.get("build")) != str(expected_os["build"])
            or expected_os["caption"] not in observed_os.get("caption", "")
            or observed_os.get("productType") != 1):
        return False
    if scenario not in ("nsis", "msi", "nsis-upgrade") or data.get("scenario") != scenario:
        return False
    if any(guest.get(key) != 0 for key in ("installExit", "reinstallExit", "uninstallExit")):
        return False
    if scenario == "msi" and not admin_ok(guest, ["install", "reinstall", "uninstall"]):
        return False
    if not prerequisites_ok(guest) or (scenario == "nsis-upgrade" and not upgrade_ok(guest)):
        return False
    runtime = guest.get("beforeInstall", {})
    return (guest.get("status") == "observed" and guest.get("productUninstallPassed") is True
            and guest.get("offlineInstallExit") == 0 and not network_enabled
            and runtime.get("vcRuntimePresent") is False and runtime.get("vcRuntimeLoadError") == 126
            and runtime.get("referenceHandlerLoadError") == 0
            and guest.get("desktopOwnerMatches") is True and guest.get("sessionMatches") is True
            and guest.get("displayPreference", {}).get("restored") is True
            and guest.get("visual") == "captured-awaiting-review" and probes_ok(guest.get("probes")))
