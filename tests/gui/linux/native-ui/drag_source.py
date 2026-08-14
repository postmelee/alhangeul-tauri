#!/usr/bin/env python3
"""Isolated GTK drag source for one repository fixture URI."""

import pathlib
import sys

import gi

gi.require_version("Gtk", "3.0")
from gi.repository import Gdk, Gio, Gtk  # pylint: disable=wrong-import-position


path = pathlib.Path(sys.argv[1]).resolve(strict=True)
window = Gtk.Window(title="Alhangeul GUI drag source")
window.set_default_size(260, 96)
window.move(32, 32)
label = Gtk.Label(label=path.name)
targets = Gtk.TargetList.new([])
targets.add_uri_targets(0)
label.drag_source_set(Gdk.ModifierType.BUTTON1_MASK, [], Gdk.DragAction.COPY)
label.drag_source_set_target_list(targets)


def supply_uri(_widget, _context, selection, _info, _time):
    selection.set_uris([Gio.File.new_for_path(str(path)).get_uri()])


label.connect("drag-data-get", supply_uri)
window.connect("destroy", Gtk.main_quit)
window.add(label)
window.show_all()
print("READY", flush=True)
Gtk.main()
