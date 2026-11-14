"""Bounded serial evidence decoder. Guest output never chooses a host directory."""
import base64
import hashlib
import json
from pathlib import Path
import re

LIMIT = 5 * 1024 * 1024


def decode(serial, output):
    active = None
    data = bytearray()
    seen = set()
    done = False
    for raw in serial.splitlines():
        if not raw.startswith("ALH "):
            continue
        if done or len(raw) > 6000:
            raise ValueError("invalid-serial-frame")
        frame = json.loads(raw[4:])
        kind = frame.get("kind")
        if kind == "phase":
            continue
        if kind == "begin":
            name = frame.get("name", "")
            if (active or len(seen) >= 24 or name in seen
                    or not re.fullmatch(r"[a-z0-9-]+\.(json|png)", name)
                    or type(frame.get("bytes")) is not int
                    or not 0 < frame["bytes"] <= LIMIT
                    or not re.fullmatch(r"[0-9a-f]{64}", frame.get("sha256", ""))):
                raise ValueError("invalid-evidence-header")
            active, data = frame, bytearray()
        elif kind == "chunk":
            if not active:
                raise ValueError("unexpected-chunk")
            data.extend(base64.b64decode(frame["data"], validate=True))
            if len(data) > active["bytes"]:
                raise ValueError("evidence-overflow")
        elif kind == "end":
            if (not active or frame.get("name") != active["name"]
                    or len(data) != active["bytes"]
                    or hashlib.sha256(data).hexdigest() != active["sha256"]):
                raise ValueError("evidence-integrity-failure")
            (output / active["name"]).write_bytes(data)
            seen.add(active["name"])
            active = None
        elif kind == "done":
            if active or "guest.json" not in seen:
                raise ValueError("incomplete-evidence")
            done = True
        else:
            raise ValueError("unknown-frame")
    return done and active is None
