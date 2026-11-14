import base64, hashlib, importlib.util, json
spec=importlib.util.spec_from_file_location("e", "scripts/ci/guest-ui-evidence.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Sink:
    def __init__(self): self.files={}
    def __truediv__(self,name): self.name=name;return self
    def write_bytes(self,data): self.files[self.name]=bytes(data)
body=b'{"status":"observed"}'
header=dict(kind="begin",name="guest.json",bytes=len(body),sha256=hashlib.sha256(body).hexdigest())
chunk=dict(kind="chunk",data=base64.b64encode(body).decode())
end=dict(kind="end",name="guest.json")
done=dict(kind="done")
def stream(frames): return "\n".join("ALH "+json.dumps(f) for f in frames)
sink=Sink();assert m.decode(stream([header,chunk,end,done]),sink)
assert sink.files["guest.json"]==body
for frames in [
 [dict(header,name="../guest.json"),chunk,end,done],
 [dict(header,sha256="0"*64),chunk,end,done],
 [header,chunk,chunk,end,done],
 [header,chunk,end,header,chunk,end,done],
 [header,done],
 [header,dict(chunk,data="@@"),end,done],
 [header,chunk,end,done,done],
 [dict(header,bytes=m.LIMIT+1),chunk,end,done],
]:
 try: m.decode(stream(frames),Sink())
 except (ValueError,TypeError): pass
 else: raise AssertionError("invalid evidence accepted")
assert not m.decode(stream([header,chunk]),Sink())
assert not m.decode(stream([header,chunk,end]),Sink())

# Linux CI exercises real pidfds; local non-Linux contract runs only decode evidence.
import os, subprocess, sys
if sys.platform == "linux":
 spec=importlib.util.spec_from_file_location("lifecycle", "scripts/ci/guest-ui-lifecycle.py")
 lifecycle=importlib.util.module_from_spec(spec);spec.loader.exec_module(lifecycle)
 child=subprocess.Popen([sys.executable,"-c","import time; time.sleep(30)"])
 try:
  record=lifecycle.identity(child.pid)
  try: lifecycle.stop_owned(dict(record,start="invalid"))
  except RuntimeError: pass
  else: raise AssertionError("replaced PID identity accepted")
  assert child.poll() is None
  assert lifecycle.stop_owned(record)=="stopped"
  child.wait(timeout=5)
  assert lifecycle.stop_owned(record)=="already-exited"
 finally:
  if child.poll() is None: child.kill();child.wait()

# A top-level observed flag cannot hide missing CRT, bitmap, owner, or cleanup proof.
import copy
spec=importlib.util.spec_from_file_location("guest_run", "scripts/ci/guest-ui-run.py")
guest_run=importlib.util.module_from_spec(spec);spec.loader.exec_module(guest_run)
good=dict(status="observed", productUninstallPassed=True, offlineInstallExit=0,
 os=dict(caption="Windows 11 Enterprise Evaluation",build="26300",productType=1),
 input=dict(scenario="nsis",installerSha256="a"*64,operatingSystem=dict(id="windows11")),installExit=0,reinstallExit=0,uninstallExit=0,
 beforeInstall=dict(vcRuntimePresent=False,vcRuntimeLoadError=126,referenceHandlerLoadError=0),
 desktopOwnerMatches=True,sessionMatches=True,displayPreference=dict(restored=True),
 visual="captured-awaiting-review",probes=[dict(id=i,status="ok",bitmapPresent=True)
 for i in ("small-hwp","large-hwp","form-hwpx","control-jpg")])
assert guest_run.guest_observation_complete(good,False)
assert not guest_run.guest_observation_complete(good,True)
for path,value in [
 (("productUninstallPassed",),False), (("offlineInstallExit",),2),
 (("beforeInstall","vcRuntimePresent"),True),
 (("beforeInstall","vcRuntimeLoadError"),0),
 (("beforeInstall","referenceHandlerLoadError"),126),
 (("desktopOwnerMatches",),False), (("sessionMatches",),False),
 (("displayPreference","restored"),False),
 (("visual",),"unavailable"), (("probes",0,"bitmapPresent"),False),
 (("probes",0,"status"),"failed"), (("probes",0,"id"),"control-jpg"),
]:
 bad=copy.deepcopy(good);target=bad
 for key in path[:-1]: target=target[key]
 target[path[-1]]=value
 assert not guest_run.guest_observation_complete(bad,False),path

msi=copy.deepcopy(good);msi["input"]["scenario"]="msi";msi["adminBoundaryReadOnly"]=True
msi["adminOperations"]={n:dict(operation=n,status="observed",system=True,exitCode=0,installerSha256="a"*64)
 for n in ("install","reinstall","uninstall")}
assert guest_run.guest_observation_complete(msi,False,"msi")
assert not guest_run.guest_observation_complete(msi,False,"nsis")
for key,value in [("system",False),("exitCode",3010),("installerSha256","b"*64),("operation","wrong")]:
 bad=copy.deepcopy(msi);bad["adminOperations"]["install"][key]=value
 assert not guest_run.guest_observation_complete(bad,False,"msi"),key
for key in ("installExit","reinstallExit","uninstallExit"):
 bad=copy.deepcopy(good);bad[key]=3010
 assert not guest_run.guest_observation_complete(bad,False),key

for value in (False, None):
 bad=copy.deepcopy(msi);bad["adminBoundaryReadOnly"]=value
 assert not guest_run.guest_observation_complete(bad,False,"msi")

upgrade=copy.deepcopy(good)
upgrade["input"].update(scenario="nsis-upgrade", prerequisites=[dict(name="vc",sha256="c"*64)])
upgrade.update(adminBoundaryReadOnly=True,baselineExit=0,baselineBinariesMatched=True,
 upgradeBinariesMatched=True,reinstallBinariesMatched=True,afterPrerequisites=dict(vcRuntimeLoadError=0),
 userDataPreservedAfterUninstall=True,baselineProbes=copy.deepcopy(good["probes"]),
 upgradeProbes=copy.deepcopy(good["probes"]),sentinels=[dict(folder=f,preserved=True)
 for f in ("LocalApplicationData","ApplicationData")])
upgrade["adminOperations"]={"prerequisites":dict(operation="prerequisites",status="observed",
 system=True,exitCode=0,installerSha256="a"*64,packages=[dict(name="vc",sha256="c"*64,
 signatureStatus="Valid",signer="CN=Microsoft Corporation, O=Microsoft Corporation, C=US",exitCode=0)])}
assert guest_run.guest_observation_complete(upgrade,False,"nsis-upgrade")
for key,value in [("baselineExit",2),("baselineBinariesMatched",False),("upgradeBinariesMatched",False),
 ("reinstallBinariesMatched",False),("baselineProbes",[]),("upgradeProbes",[]),
 ("sentinels",[]),("userDataPreservedAfterUninstall",False),("afterPrerequisites",{})]:
 bad=copy.deepcopy(upgrade);bad[key]=value
 assert not guest_run.guest_observation_complete(bad,False,"nsis-upgrade"),key
for key,value in [("signatureStatus","UnknownError"),("signer","CN=Other"),("sha256","d"*64),("exitCode",3010)]:
 bad=copy.deepcopy(upgrade);bad["adminOperations"]["prerequisites"]["packages"][0][key]=value
 assert not guest_run.guest_observation_complete(bad,False,"nsis-upgrade"),key
bad=copy.deepcopy(upgrade);bad["sentinels"][0]["preserved"]=False
assert not guest_run.guest_observation_complete(bad,False,"nsis-upgrade")

win10=copy.deepcopy(msi)
win10["input"].update(operatingSystem=dict(id="windows10"),prerequisites=[dict(name="webview2",sha256="c"*64)])
win10["os"]=dict(caption="Windows 10 Enterprise Evaluation",build="19045",productType=1)
win10["adminOperations"]["prerequisites"]=copy.deepcopy(upgrade["adminOperations"]["prerequisites"])
win10["adminOperations"]["prerequisites"]["packages"][0]["name"]="webview2"
assert guest_run.guest_observation_complete(win10,False,"msi","windows10")
assert not guest_run.guest_observation_complete(win10,False,"msi","windows11")
for key,value in [("build","26300"),("productType",3),("caption","Windows Server 2025")]:
 bad=copy.deepcopy(win10);bad["os"][key]=value
 assert not guest_run.guest_observation_complete(bad,False,"msi","windows10"),key
bad=copy.deepcopy(win10);bad["input"]["prerequisites"]=[]
assert not guest_run.guest_observation_complete(bad,False,"msi","windows10")

bad=copy.deepcopy(upgrade);bad["baselineProbes"][0].update(status="failed",bitmapPresent=None,hresult="0x8004B200")
assert guest_run.guest_observation_complete(bad,False,"nsis-upgrade")
bad["upgradeProbes"][0].update(status="failed",bitmapPresent=None)
assert not guest_run.guest_observation_complete(bad,False,"nsis-upgrade")
bad=copy.deepcopy(upgrade);bad["baselineProbes"][0]["status"]="skipped"
assert not guest_run.guest_observation_complete(bad,False,"nsis-upgrade")

# Fixed public-fixture requests match the worker's binary protocol offsets; reject changed input.
import struct, tempfile
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location("worker_input", "scripts/ci/guest-ui-worker-input.py")
worker_input=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker_input)
with tempfile.TemporaryDirectory() as temporary:
 p=Path(temporary);(p/"verification").mkdir()
 data=b"synthetic-public-fixture";(p/"fixture.hwp").write_bytes(data)
 fixture=dict(id="small-hwp",path="fixture.hwp",sha256=hashlib.sha256(data).hexdigest())
 with patch.object(worker_input.subprocess,"check_output",return_value="ab"*32+"  fixture.hwp\n") as digest:
  report=worker_input.prepare(p,fixture)
  raw=(p/"verification/small-hwp.request").read_bytes()
  assert raw[:8]==b"ALHGREQ\0" and struct.unpack_from("<H",raw,8)==(1,)
  assert struct.unpack_from("<I",raw,12)==(256,) and struct.unpack_from("<Q",raw,16)==(len(data),)
  assert raw[10:12]==bytes(2) and raw[24:32]==bytes(8) and raw[32:64]==bytes.fromhex("ab"*32)
  assert raw[64:]==data and report["requestSha256"]==hashlib.sha256(raw).hexdigest()
  digest.assert_called_once()
  (p/"fixture.hwp").write_bytes(b"changed")
  try: worker_input.prepare(p,fixture)
  except RuntimeError: pass
  else: raise AssertionError("changed worker fixture accepted")


# Same-version MSI replacement must remove the old product and install different package bytes.
msi_upgrade=copy.deepcopy(upgrade)
old=dict(ProductVersion="0.1.3",UpgradeCode="{5B708917-6E23-58E3-B391-8F6EA66312A2}",
 ProductCode="{11111111-1111-1111-1111-111111111111}",PackageCode="{22222222-2222-2222-2222-222222222222}")
new=dict(old,ProductCode="{33333333-3333-3333-3333-333333333333}",PackageCode="{44444444-4444-4444-4444-444444444444}")
msi_upgrade["input"].update(scenario="msi-upgrade",signaturesVerified=True,msiIdentity=new,
 baseline=dict(msiIdentity=old,installerSha256="b"*64))
msi_upgrade["adminOperations"].update(copy.deepcopy(msi["adminOperations"]))
msi_upgrade["adminOperations"]["baseline"]=dict(msi_upgrade["adminOperations"]["install"],
 operation="baseline",executedInstallerSha256="b"*64)
msi_upgrade["baselineRegistration"]=dict(entries=[dict(productCode=old["ProductCode"],version="0.1.3")])
msi_upgrade["upgradeRegistration"]=dict(entries=[dict(productCode=new["ProductCode"],version="0.1.3")],previousProductRemoved=True)
assert guest_run.guest_observation_complete(msi_upgrade,False,"msi-upgrade")
for path,value in [
 (("input","signaturesVerified"),False),
 (("input","msiIdentity","ProductCode"),old["ProductCode"]),
 (("input","msiIdentity","PackageCode"),old["PackageCode"]),
 (("input","msiIdentity","UpgradeCode"),"wrong"),
 (("upgradeRegistration","previousProductRemoved"),False),
 (("upgradeRegistration","entries"),[]),
 (("upgradeRegistration","entries",0,"version"),"0.1.2"),
 (("adminOperations","baseline","exitCode"),3010),
 (("adminOperations","baseline","executedInstallerSha256"),"c"*64),
]:
 bad=copy.deepcopy(msi_upgrade);target=bad
 for key in path[:-1]: target=target[key]
 target[path[-1]]=value
 assert not guest_run.guest_observation_complete(bad,False,"msi-upgrade"),path

spec=importlib.util.spec_from_file_location("msi_input", "scripts/ci/guest-ui-msi-input.py")
msi_input=importlib.util.module_from_spec(spec);spec.loader.exec_module(msi_input)
msi_input.require_same_version_upgrade(old,new)
for key in ("ProductCode","PackageCode"):
 try: msi_input.require_same_version_upgrade(old,dict(new,**{key:old[key]}))
 except RuntimeError: pass
 else: raise AssertionError("same MSI identity accepted")
with tempfile.TemporaryDirectory() as temporary:
 target=Path(temporary)/"extracted"
 def fake_extract(args,**kwargs):
  for name in msi_input.BINARY_NAMES.values(): (target/name).write_bytes(b"synthetic PE reference")
 properties="Property\tValue\ns72\tl0\nProperty\tProperty\n"+"".join(k+"\t"+v+"\n" for k,v in new.items() if k!="PackageCode")
 with patch.object(msi_input.subprocess,"check_output",side_effect=[properties,"Revision number (UUID): "+new["PackageCode"]]), patch.object(msi_input.subprocess,"run",side_effect=fake_extract):
  identity,binaries=msi_input.inspect(Path("candidate.msi"),target)
  assert identity==new and len(binaries)==2 and all(b["size"]==22 for b in binaries)
