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
 input=dict(scenario="nsis",installerSha256="a"*64),installExit=0,reinstallExit=0,uninstallExit=0,
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
