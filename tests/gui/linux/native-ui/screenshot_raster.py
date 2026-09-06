#!/usr/bin/env python3
"""Decode a captured PNG without transforming it; GTK is already a GUI dependency."""
import json
import sys

import gi

gi.require_version("GdkPixbuf", "2.0")
from gi.repository import GdkPixbuf  # noqa: E402

pixbuf = GdkPixbuf.Pixbuf.new_from_file(sys.argv[1])
if pixbuf.get_bits_per_sample() != 8:
    raise ValueError("screenshot must have 8-bit samples")
header = {
    "width": pixbuf.get_width(), "height": pixbuf.get_height(),
    "channels": pixbuf.get_n_channels(), "rowstride": pixbuf.get_rowstride(),
}
sys.stdout.buffer.write((json.dumps(header) + "\n").encode("utf-8"))
sys.stdout.buffer.write(pixbuf.get_pixels())
