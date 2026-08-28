#!/usr/bin/env python3
"""Small JSON bridge for semantic GTK automation through AT-SPI."""

import json
import re
import subprocess
import sys
import time

PRINT_DIALOG_WINDOW_PATTERN = r"^(Print|인쇄)$"
FILE_DIALOG_WINDOW_PATTERN = r"^(Open File|Save File|Select a File|Select a filename|파일 열기|파일 저장|파일 선택|파일 이름 선택)$"
NATIVE_ROOT_ROLES = {"dialog", "file chooser"}


def normalized(value):
    return " ".join(str(value or "").casefold().split())


def read_request():
    request = json.loads(sys.stdin.read())
    if not isinstance(request, dict):
        raise ValueError("request must be an object")
    if len(sys.argv) != 2 or sys.argv[1] != request.get("command"):
        raise ValueError("command diagnostic argument does not match request")
    return request


def node_info(node):
    states = safe_states(node)
    return {
        "name": safe_call(node, "name", ""),
        "description": safe_call(node, "description", ""),
        "role": safe_method(node, "getRoleName", "unknown"),
        "showing": state_contains(states, pyatspi.STATE_SHOWING),
        "selected": state_contains(states, pyatspi.STATE_SELECTED),
        "enabled": state_contains(states, pyatspi.STATE_ENABLED),
        "sensitive": state_contains(states, pyatspi.STATE_SENSITIVE),
    }


def safe_states(node):
    try:
        return node.getState() if node is not None else None
    except Exception:
        return None


def state_contains(states, state):
    try:
        return states is not None and states.contains(state)
    except Exception:
        return False


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
        return [child for index in range(count)
                if (child := node.getChildAtIndex(index)) is not None]
    except Exception:
        return []


def walk(root, max_depth=16, max_nodes=3000, reverse=False):
    stack = [(root, 0)]
    seen = 0
    while stack and seen < max_nodes:
        node, depth = stack.pop()
        seen += 1
        yield node, depth
        if depth < max_depth:
            descendants = children(node)
            ordered = descendants if reverse else reversed(descendants)
            stack.extend((child, depth + 1) for child in ordered)


def walk_for_selector(root, selector, reverse=False):
    roles = {normalized(value) for value in selector.get("roles", [])}
    if roles and roles.issubset(NATIVE_ROOT_ROLES):
        return walk(root, max_depth=3, max_nodes=128, reverse=reverse)
    return walk(root, reverse=reverse)


def matches(node, selector):
    names = selector.get("names", [])
    roles = selector.get("roles", [])
    role = normalized(safe_method(node, "getRoleName", "unknown"))
    if roles and not any(normalized(value) == role for value in roles):
        return False
    searchable = normalized(
        f'{safe_call(node, "name", "")} {safe_call(node, "description", "")}',
    )
    if names and not any(normalized(value) in searchable for value in names):
        return False
    states = safe_states(node)
    if selector.get("selected", False) and not state_contains(states, pyatspi.STATE_SELECTED):
        return False
    if selector.get("enabled", False) and not state_contains(states, pyatspi.STATE_ENABLED):
        return False
    if selector.get("sensitive", False) and not state_contains(states, pyatspi.STATE_SENSITIVE):
        return False
    return not selector.get("showing", True) or state_contains(
        states, pyatspi.STATE_SHOWING,
    )


def applications(request):
    desktop = pyatspi.Registry.getDesktop(0)
    names = request.get("applicationNames", ["Alhangeul"])
    result = []
    for app in children(desktop):
        app_name = normalized(safe_call(app, "name", ""))
        if any(normalized(name) in app_name for name in names):
            result.append(app)
    return result


def find_matches(request, limit=None):
    selector = request.get("selector", {})
    within = request.get("within")
    reverse = request.get("searchOrder") == "reverse"
    found = []
    for app in applications(request):
        root = app
        if within:
            root = next(
                (node for node, _depth in walk_for_selector(app, within)
                 if matches(node, within)),
                None,
            )
            if root is None:
                continue
        for node, _depth in walk_for_selector(root, selector, reverse=reverse):
            if matches(node, selector):
                found.append(node)
                if limit is not None and len(found) >= limit:
                    return found
    return found


def wait_for_matches(request, absent=False):
    timeout_ms = int(request.get("timeoutMs", 15000))
    if timeout_ms < 100 or timeout_ms > 120000:
        raise ValueError("timeoutMs must be between 100 and 120000")
    deadline = time.monotonic() + timeout_ms / 1000
    while True:
        limit = None if absent else int(request.get("index", 0)) + 1
        found = find_matches(request, limit=limit)
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


def run_xdotool(arguments):
    result = subprocess.run(
        ["xdotool", *arguments], capture_output=True, check=False,
        encoding="utf-8", timeout=5,
    )
    if result.returncode != 0:
        diagnostic = (result.stderr or f"exit {result.returncode}").strip()
        raise RuntimeError(f"xdotool failed: {diagnostic[:500]}")
    return result.stdout.strip()


def click_node(node, window_pattern):
    states = safe_states(node)
    if not (state_contains(states, pyatspi.STATE_ENABLED)
            and state_contains(states, pyatspi.STATE_SENSITIVE)):
        raise RuntimeError("semantic click target is not enabled and sensitive")
    extents = node.queryComponent().getExtents(pyatspi.DESKTOP_COORDS)
    if extents.width < 1 or extents.height < 1:
        raise RuntimeError("semantic click target has invalid extents")
    window_ids = run_xdotool([
        "search", "--onlyvisible", "--name", window_pattern,
    ]).split()
    if len(window_ids) != 1 or not window_ids[0].isdigit():
        raise RuntimeError("visible native dialog must have exactly one X11 window")
    window_id = window_ids[0]
    run_xdotool(["windowactivate", "--sync", window_id])
    if run_xdotool(["getactivewindow"]) != window_id:
        raise RuntimeError("native dialog X11 focus verification failed")
    geometry = dict(re.findall(
        r"^(X|Y|WIDTH|HEIGHT)=(-?[0-9]+)$",
        run_xdotool(["getwindowgeometry", "--shell", window_id]), re.MULTILINE,
    ))
    if set(geometry) != {"X", "Y", "WIDTH", "HEIGHT"}:
        raise RuntimeError("native dialog X11 geometry is unavailable")
    center_x = extents.x + extents.width // 2
    center_y = extents.y + extents.height // 2
    window_x, window_y = int(geometry["X"]), int(geometry["Y"])
    window_width, window_height = int(geometry["WIDTH"]), int(geometry["HEIGHT"])
    if not (window_x <= center_x < window_x + window_width
            and window_y <= center_y < window_y + window_height):
        raise RuntimeError("semantic click target is outside the native dialog")
    run_xdotool([
        "mousemove", str(center_x), str(center_y), "click", "1",
    ])
    return {"x": extents.x, "y": extents.y,
            "width": extents.width, "height": extents.height}


def snapshot(request):
    items = []
    for app in applications(request):
        for node, depth in walk(app, max_depth=18, max_nodes=2500):
            info = node_info(node)
            if info["name"] or depth < 2 or info["showing"]:
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
    if command == "click":
        window_patterns = {
            "print": PRINT_DIALOG_WINDOW_PATTERN,
            "file-dialog": FILE_DIALOG_WINDOW_PATTERN,
        }
        window_pattern = window_patterns.get(request.get("windowScope"))
        if window_pattern is None:
            raise ValueError("semantic click windowScope is invalid")
        return click_node(node, window_pattern)
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
    raise ValueError(f"unsupported command: {command}")


try:
    import pyatspi  # pylint: disable=wrong-import-position
    print(json.dumps({"ok": True, "result": dispatch(read_request())}, ensure_ascii=False))
except Exception as error:  # Fail closed with one machine-readable diagnostic.
    print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False))
    sys.exit(1)
