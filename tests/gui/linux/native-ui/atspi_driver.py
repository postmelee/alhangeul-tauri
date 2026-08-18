#!/usr/bin/env python3
"""Small JSON bridge for semantic GTK automation through AT-SPI."""

import json
import sys
import time


def normalized(value):
    return " ".join(str(value or "").casefold().split())


def read_request():
    request = json.loads(sys.stdin.read())
    if not isinstance(request, dict):
        raise ValueError("request must be an object")
    return request


def node_info(node):
    return {
        "name": safe_call(node, "name", ""),
        "description": safe_call(node, "description", ""),
        "role": safe_method(node, "getRoleName", "unknown"),
        "showing": node.getState().contains(pyatspi.STATE_SHOWING),
    }


def safe_call(node, attribute, fallback):
    try:
        return getattr(node, attribute) or fallback
    except Exception:
        return fallback


def safe_method(node, method, fallback):
    try:
        return getattr(node, method)() or fallback
    except Exception:
        return fallback


def children(node):
    try:
        count = min(node.childCount, 512)
        return [node.getChildAtIndex(index) for index in range(count)]
    except Exception:
        return []


def walk(root, max_depth=16, max_nodes=3000):
    stack = [(root, 0)]
    seen = 0
    while stack and seen < max_nodes:
        node, depth = stack.pop()
        seen += 1
        yield node, depth
        if depth < max_depth:
            stack.extend((child, depth + 1) for child in reversed(children(node)))


def matches(node, selector):
    info = node_info(node)
    role = normalized(info["role"])
    names = selector.get("names", [])
    roles = selector.get("roles", [])
    searchable = normalized(f'{info["name"]} {info["description"]}')
    if roles and not any(normalized(value) == role for value in roles):
        return False
    if names and not any(normalized(value) in searchable for value in names):
        return False
    return not selector.get("showing", True) or info["showing"]


def applications(request):
    desktop = pyatspi.Registry.getDesktop(0)
    names = request.get("applicationNames", ["Alhangeul"])
    result = []
    for app in children(desktop):
        app_name = normalized(safe_call(app, "name", ""))
        if any(normalized(name) in app_name for name in names):
            result.append(app)
    return result


def find_matches(request):
    selector = request.get("selector", {})
    found = []
    for app in applications(request):
        for node, _depth in walk(app):
            if matches(node, selector):
                found.append(node)
    return found


def wait_for_matches(request, absent=False):
    timeout_ms = int(request.get("timeoutMs", 15000))
    if timeout_ms < 100 or timeout_ms > 120000:
        raise ValueError("timeoutMs must be between 100 and 120000")
    deadline = time.monotonic() + timeout_ms / 1000
    while True:
        found = find_matches(request)
        if (absent and not found) or (not absent and found):
            return found
        if time.monotonic() >= deadline:
            state = "close" if absent else "appear"
            raise TimeoutError(f"semantic target did not {state}: {request.get('selector')}")
        time.sleep(0.1)


def selected_node(request):
    found = wait_for_matches(request)
    index = int(request.get("index", 0))
    if index < 0 or index >= len(found):
        raise LookupError(f"selector index {index} is unavailable ({len(found)} matches)")
    return found[index]


def perform_action(node, requested_names):
    action = node.queryAction()
    count = action.nActions
    index = 0
    if requested_names:
        normalized_names = [normalized(value) for value in requested_names]
        candidates = [
            normalized(f"{action.getName(i)} {action.getDescription(i)}")
            for i in range(count)
        ]
        index = next(
            (i for i, value in enumerate(candidates)
             if any(name in value for name in normalized_names)),
            -1,
        )
        if index < 0:
            raise LookupError(f"requested action is unavailable: {candidates}")
    if count < 1 or not action.doAction(index):
        raise RuntimeError("AT-SPI action failed")


def snapshot(request):
    items = []
    for app in applications(request):
        for node, depth in walk(app, max_depth=12, max_nodes=1500):
            info = node_info(node)
            if info["name"] or depth < 2:
                items.append({"depth": depth, **info})
    return {"applications": len(applications(request)), "nodes": items}


def dispatch(request):
    command = request.get("command")
    if command == "snapshot":
        return snapshot(request)
    if command == "wait":
        return node_info(selected_node(request))
    if command == "waitAbsent":
        wait_for_matches(request, absent=True)
        return {"absent": True}
    node = selected_node(request)
    if command == "action":
        perform_action(node, request.get("actionNames", []))
        return node_info(node)
    if command == "setText":
        value = request.get("value")
        if not isinstance(value, str) or "\0" in value:
            raise ValueError("text value must be a NUL-free string")
        if not node.queryEditableText().setTextContents(value):
            raise RuntimeError("AT-SPI editable text update failed")
        return node_info(node)
    if command == "focus":
        if not node.queryComponent().grabFocus():
            raise RuntimeError("AT-SPI focus failed")
        return node_info(node)
    if command == "extents":
        extents = node.queryComponent().getExtents(pyatspi.DESKTOP_COORDS)
        return {"x": extents.x, "y": extents.y,
                "width": extents.width, "height": extents.height}
    raise ValueError(f"unsupported command: {command}")


try:
    import pyatspi  # pylint: disable=wrong-import-position
    print(json.dumps({"ok": True, "result": dispatch(read_request())}, ensure_ascii=False))
except Exception as error:  # Fail closed with one machine-readable diagnostic.
    print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False))
    sys.exit(1)
