"""Construct the existing binary worker protocol for one hash-verified public fixture."""
import hashlib
import struct
import subprocess


def prepare(payload, fixture):
    source = payload / fixture["path"]
    data = source.read_bytes()
    if fixture["id"] != "small-hwp" or hashlib.sha256(data).hexdigest() != fixture["sha256"]:
        raise RuntimeError("worker-diagnostic-fixture-mismatch")
    checksum = subprocess.check_output(["b3sum", str(source)], text=True).split()[0]
    digest = bytes.fromhex(checksum)
    if len(digest) != 32:
        raise RuntimeError("invalid-blake3-digest")
    header = b"ALHGREQ\0" + struct.pack("<HHIQ", 1, 0, 256, len(data)) + bytes(8) + digest
    request = header + data
    (payload / "verification/small-hwp.request").write_bytes(request)
    return dict(fixtureId=fixture["id"], fixtureSha256=fixture["sha256"],
                requestSha256=hashlib.sha256(request).hexdigest(), bytes=len(request), edge=256)
