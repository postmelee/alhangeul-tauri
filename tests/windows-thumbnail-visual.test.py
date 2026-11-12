import binascii
import importlib.util
import copy
import json
import struct
import sys
import unittest
import zlib
from pathlib import Path
sys.dont_write_bytecode = True
root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("visual", root / "scripts/ci/hosted-ui-image.py")
visual = importlib.util.module_from_spec(spec)
spec.loader.exec_module(visual)


def chunk(kind, body):
    return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", binascii.crc32(kind + body) & 0xffffffff)


def png(mode, channels=3):
    width, height = 16, 16
    rows = [bytes((x * 13 + y * 7) % 256 for x in range(width * channels)) for y in range(height)]
    raw = bytearray()
    previous = bytes(width * channels)
    for row in rows:
        raw.append(mode)
        for i, value in enumerate(row):
            a, b, c = row[i - channels] if i >= channels else 0, previous[i], previous[i - channels] if i >= channels else 0
            p = a + b - c
            pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
            predictions = [0, a, b, (a + b) // 2, a if pa <= pb and pa <= pc else b if pb <= pc else c]
            raw.append((value - predictions[mode]) & 255)
        previous = row
    header = struct.pack(">IIBBBBB", width, height, 8, 2 if channels == 3 else 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(bytes(raw))) + chunk(b"IEND", b""), rows


class BytePath:
    def __init__(self, value):
        self.value = value
    def read_bytes(self):
        return self.value


class VisualTests(unittest.TestCase):
    def decode(self, data):
        original = visual.Path
        visual.Path = lambda _: BytePath(data)
        try:
            return visual.read_png("memory")
        finally:
            visual.Path = original

    def test_png_filters_and_channels(self):
        for mode in range(5):
            for channels in (3, 4):
                data, rows = png(mode, channels)
                decoded = self.decode(data)
                self.assertEqual(decoded[:3], (16, 16, channels))
                self.assertEqual([bytes(row) for row in decoded[3]], rows)

    def test_corrupt_and_truncated_png_rejected(self):
        data, _ = png(0)
        for broken in (b"not png", data[:-1], data[:40] + bytes([data[40] ^ 1]) + data[41:], data + b"trailing"):
            with self.assertRaises(ValueError):
                self.decode(broken)

    def test_wrong_viewport_and_region_rejected(self):
        data, _ = png(0)
        image = self.decode(data)
        with self.assertRaises(ValueError):
            visual.compare(image, {"viewport": [1000, 650], "regions": []})
        with self.assertRaises(ValueError):
            visual.signature(image, [0, 0, 100, 100])

    def test_real_references_reject_icons_blank_black_and_wrong_document(self):
        references = json.loads((root / "tests/fixtures/explorer-visual-reference.json").read_text())
        for reference in references["systems"].values():
            for region in reference["regions"]:
                expected = region["signature"]
                self.assertEqual(visual.distance(expected, expected), 0)
                negative = [region["iconSignature"], [255] * len(expected), [0] * len(expected)]
                negative.extend(other["signature"] for other in reference["regions"] if other["id"] != region["id"])
                for signature in negative:
                    self.assertGreater(visual.distance(signature, expected), region["threshold"])

    def test_incomplete_or_permissive_reference_rejected(self):
        references = json.loads((root / "tests/fixtures/explorer-visual-reference.json").read_text())
        valid = references["systems"]["windows-2022"]
        visual.validate_reference(valid)
        cases = [{"regions": []}, {"regions": valid["regions"][:2]}]
        for field, value in (("threshold", 1), ("threshold", float("nan")), ("signature", [0]), ("signature", [256] * 576)):
            invalid = copy.deepcopy(valid)
            invalid["regions"][0][field] = value
            cases.append(invalid)
        for invalid in cases:
            with self.assertRaises(ValueError):
                visual.validate_reference(invalid)

    def test_transparent_region_rejected(self):
        image = (16, 16, 4, [bytearray(64) for _ in range(16)])
        with self.assertRaisesRegex(ValueError, "transparent"):
            visual.signature(image, [0, 0, 16, 16])


if __name__ == "__main__":
    unittest.main()
