#!/usr/bin/env python3
"""Isolated GTK drag source for one repository fixture URI."""

import pathlib
import sys

import gi

gi.require_version("Gtk", "3.0")
gi.require_version("Gdk", "3.0")
from gi.repository import Gdk, Gio, Gtk  # pylint: disable=wrong-import-position


path = pathlib.Path(sys.argv[1]).resolve(strict=True)
window = Gtk.Window(title="Alhangeul GUI drag source")
window.set_default_size(260, 96)
window.move(32, 32)
label = Gtk.Label(label=path.name)
source = Gtk.EventBox()
source.set_visible_window(True)
source.add(label)
targets = Gtk.TargetList.new([])
targets.add_uri_targets(0)
source.drag_source_set(Gdk.ModifierType.BUTTON1_MASK, [], Gdk.DragAction.COPY)
source.drag_source_set_target_list(targets)


def start_drag(_widget, _context):
    print("STARTED", flush=True)


def supply_uri(_widget, _context, selection, _info, _time):
    selection.set_uris([Gio.File.new_for_path(str(path)).get_uri()])
    print("DATA", flush=True)


def finish_drag(_widget, _context):
    print("FINISHED", flush=True)


source.connect("drag-begin", start_drag)
source.connect("drag-data-get", supply_uri)
source.connect("drag-end", finish_drag)
window.connect("destroy", Gtk.main_quit)
window.add(source)
window.show_all()
print("READY", flush=True)
Gtk.main()
