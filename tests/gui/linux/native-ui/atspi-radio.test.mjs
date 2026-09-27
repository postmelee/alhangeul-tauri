import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('관측된 radio select capability와 checked·고유 대상 조건을 실제 driver 함수로 재생한다', () => {
  const driver = fileURLToPath(new URL('./atspi_driver.py', import.meta.url));
  const result = execFileSync('python3', ['-c', `
import ast, sys, time
source = ast.parse(open(sys.argv[1], encoding="utf8").read())
names = {"normalized", "matches_info", "perform_action", "perform_optional"}
functions = [node for node in source.body if isinstance(node, ast.FunctionDef) and node.name in names]
scope = {"time": time}
exec(compile(ast.Module(body=functions, type_ignores=[]), sys.argv[1], "exec"), scope)
info = dict(name="사용 안 함 (대체 글꼴로 보기)", description="", role="radio button",
            showing=True, focused=False, selected=False, checked=False)
scope["node_info"] = lambda node: dict(info)
calls = []
class Radio:
    nActions = 1
    def queryAction(self): return self
    def getName(self, index): return "select"
    def getDescription(self, index): return ""
    def doAction(self, index):
        calls.append(index)
        info["checked"] = True
        return True
radio = Radio()
try:
    scope["perform_action"](radio, ["click", "press"])
    raise AssertionError("unsupported capability accepted")
except LookupError: pass
assert not calls
selector = {"roles": ["radio button"], "exactNames": [info["name"]], "checked": True}
assert not scope["matches_info"](info, selector)
scope["find_matches"] = lambda request: [radio]
request = {"timeoutMs": 100, "selector": selector, "actionNames": ["select"]}
assert scope["perform_optional"](request)["performed"]
assert calls == [0] and scope["matches_info"](info, selector)
assert not scope["matches_info"](info, {**selector, "exactNames": ["other"]})
scope["find_matches"] = lambda request: [radio, radio]
try:
    scope["perform_optional"](request)
    raise AssertionError("ambiguous target accepted")
except LookupError: pass
assert calls == [0]
print("radio capability, checked readback, ambiguity: passed")
`, driver], { encoding: 'utf8' });
  assert.match(result, /passed/);
});
