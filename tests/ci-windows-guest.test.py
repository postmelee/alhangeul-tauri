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
