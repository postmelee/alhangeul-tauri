import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('실제 driver는 경로 readback 후 고유한 활성 버튼으로 한 번만 제출한다', () => {
  const driver = fileURLToPath(new URL('./atspi_driver.py', import.meta.url));
  const result = execFileSync('python3', ['-c', `
import ast, sys
source = ast.parse(open(sys.argv[1], encoding="utf8").read())
names = {"normalized", "matches_info", "selected_node", "perform_action", "set_editable_text", "dispatch"}
functions = [node for node in source.body if isinstance(node, ast.FunctionDef) and node.name in names]
scope = {}
exec(compile(ast.Module(body=functions, type_ignores=[]), sys.argv[1], "exec"), scope)
calls = []
class Control:
    nActions = 1
    text = ""
    corrupt = False
    def __init__(self, action): self.action = action
    def queryAction(self): return self
    def queryComponent(self): return self
    def queryEditableText(self): return self
    def queryText(self): return self
    def grabFocus(self): return True
    def setTextContents(self, value):
        self.text = value + ("!" if self.corrupt else "")
        return True
    @property
    def characterCount(self): return len(self.text)
    def getText(self, start, end): return self.text[start:end]
    def getName(self, index): return self.action
    def getDescription(self, index): return ""
    def doAction(self, index):
        calls.append(self.action)
        return True
entry, button = Control("activate"), Control("click")
info = dict(role="push button", name="Open", description="", showing=True,
            focused=False, checked=False, selected=False, enabled=True, sensitive=True)
scope["node_info"] = lambda node: dict(info)
scope["wait_for_matches"] = lambda request: [entry] if request["command"] == "setText" else [button]
set_path = dict(command="setText", value="/fixtures/sample.hwp")
scope["dispatch"](set_path)
assert entry.text == set_path["value"] and not calls
accept = dict(command="action", requireUnique=True, actionNames=["click", "press"])
scope["dispatch"](accept)
assert calls == ["click"]  # Entry activate must not submit the same chooser first.
scope["wait_for_matches"] = lambda request: [button, button]
try:
    scope["dispatch"](accept)
    raise AssertionError("duplicate buttons accepted")
except LookupError: pass
assert calls == ["click"]
selector = dict(roles=["push button"], exactNames=["Open"], enabled=True, sensitive=True)
assert scope["matches_info"](info, selector)
for changed in [dict(enabled=False), dict(sensitive=False), dict(name="Delete"), dict(showing=False)]:
    assert not scope["matches_info"]({**info, **changed}, selector)
entry.corrupt = True
scope["wait_for_matches"] = lambda request: [entry]
try:
    scope["dispatch"](set_path)
    raise AssertionError("wrong path accepted")
except RuntimeError: pass
assert calls == ["click"]
print("single submit, readback, identity, enabled state, ambiguity: passed")
`, driver], { encoding: 'utf8' });
  assert.match(result, /passed/);
});
