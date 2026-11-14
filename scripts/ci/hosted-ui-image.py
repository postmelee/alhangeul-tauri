"""Small, dependency-free PNG regression check for a fixed Explorer viewport.

This checks provisional agent-reviewed references, not owner-approved release
acceptance. Only opaque 8-bit non-interlaced RGB/RGBA screenshots are supported.
"""
import binascii
import json
import struct
import sys
import zlib
from pathlib import Path


def read_png(path):
    data = Path(path).read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n" or len(data) > 32 * 1024**2:
        raise ValueError("invalid-png")
    offset, header, payload, ended = 8, None, bytearray(), False
    while offset < len(data):
        if offset + 12 > len(data):
            raise ValueError("truncated-chunk")
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        kind = data[offset + 4:offset + 8]
        body = data[offset + 8:offset + 8 + length]
        end = offset + 12 + length
        if end > len(data) or binascii.crc32(kind + body) & 0xffffffff != struct.unpack(">I", data[end - 4:end])[0]:
            raise ValueError("invalid-chunk")
        if kind == b"IHDR":
            if header is not None or offset != 8 or length != 13:
                raise ValueError("invalid-header")
            header = struct.unpack(">IIBBBBB", body)
        elif kind == b"IDAT":
            payload.extend(body)
        elif kind == b"IEND":
            if length or end != len(data):
                raise ValueError("invalid-end")
            ended = True
            break
        offset = end
    if not ended or header is None:
        raise ValueError("incomplete-png")
    width, height, depth, color, compression, filtering, interlace = header
    if not (1 <= width <= 2048 and 1 <= height <= 2048) or depth != 8 or color not in (2, 6) or compression or filtering or interlace:
        raise ValueError("unsupported-png-layout")
    channels = 4 if color == 6 else 3
    stride = width * channels
    expected = height * (stride + 1)
    decoder = zlib.decompressobj()
    raw = decoder.decompress(bytes(payload), expected + 1)
    if len(raw) != expected or not decoder.eof or decoder.unused_data or decoder.unconsumed_tail:
        raise ValueError("invalid-image-length")
    rows, previous = [], bytearray(stride)
    for y in range(height):
        mode = raw[y * (stride + 1)]
        row = bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        if mode > 4:
            raise ValueError("invalid-filter")
        for i in range(stride):
            a = row[i - channels] if i >= channels else 0
            b = previous[i]
            c = previous[i - channels] if i >= channels else 0
            if mode == 1:
                prediction = a
            elif mode == 2:
                prediction = b
            elif mode == 3:
                prediction = (a + b) // 2
            elif mode == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                prediction = a if pa <= pb and pa <= pc else b if pb <= pc else c
            else:
                prediction = 0
            row[i] = (row[i] + prediction) & 255
        rows.append(row)
        previous = row
    return width, height, channels, rows


def signature(image, box, grid=(12, 16)):
    width, height, channels, rows = image
    x, y, w, h = box
    if x < 0 or y < 0 or w < grid[0] or h < grid[1] or x + w > width or y + h > height:
        raise ValueError("invalid-region")
    result = []
    for gy in range(grid[1]):
        for gx in range(grid[0]):
            left, right = x + gx * w // grid[0], x + (gx + 1) * w // grid[0]
            top, bottom = y + gy * h // grid[1], y + (gy + 1) * h // grid[1]
            sums, count = [0, 0, 0], (right - left) * (bottom - top)
            for py in range(top, bottom):
                for px in range(left, right):
                    i = px * channels
                    if channels == 4 and rows[py][i + 3] != 255:
                        raise ValueError("transparent-region")
                    for component in range(3):
                        sums[component] += rows[py][i + component]
            result.extend(round(value / count) for value in sums)
    return result


def distance(actual, expected):
    if len(actual) != len(expected) or not actual:
        raise ValueError("invalid-signatures")
    return sum(abs(a - b) for a, b in zip(actual, expected)) / (255 * len(actual))


def validate_reference(reference):
    regions = reference.get("regions", [])
    if len(regions) != 3 or {r.get("id") for r in regions} != {"control-jpg", "form-hwpx", "large-hwp"}:
        raise ValueError("invalid-reference-regions")
    for region in regions:
        values = region.get("signature", [])
        if len(values) != 576 or any(type(v) is not int or not 0 <= v <= 255 for v in values):
            raise ValueError("invalid-reference-signature")
        threshold = region.get("threshold")
        if type(threshold) not in (int, float) or not 0 < threshold <= 0.025:
            raise ValueError("invalid-reference-threshold")


def compare(image, reference):
    validate_reference(reference)
    if list(image[:2]) != reference["viewport"]:
        raise ValueError("viewport-mismatch")
    regions = []
    for region in reference["regions"]:
        score = distance(signature(image, region["box"]), region["signature"])
        regions.append(dict(id=region["id"], difference=score,
                            threshold=region["threshold"], matched=score <= region["threshold"]))
    return dict(schemaVersion=1, status="matched" if all(r["matched"] for r in regions) else "mismatch",
                referenceApproval="provisional-agent-reviewed", releaseAcceptance="unverified",
                regions=regions)


def main():
    image_path, os_label, output_path = sys.argv[1:]
    references = json.loads((Path(__file__).resolve().parents[2] / "tests/fixtures/explorer-visual-reference.json").read_text())
    result = compare(read_png(image_path), references["systems"][os_label])
    result["referenceRun"] = references["run"]
    result["referenceSource"] = references["harnessSha"]
    Path(output_path).write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result))
    return 0 if result["status"] == "matched" else 1


if __name__ == "__main__":
    sys.exit(main())
