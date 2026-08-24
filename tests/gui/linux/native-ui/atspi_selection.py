"""Fail-closed AT-SPI selection helper for semantic native UI rows."""


def select_accessible(node, node_info):
    child = node
    for _depth in range(16):
        try:
            parent = child.parent
        except Exception:
            parent = None
        if parent is None:
            break
        try:
            selection = parent.querySelection()
        except Exception:
            child = parent
            continue
        try:
            index = child.getIndexInParent()
        except Exception as error:
            raise RuntimeError("AT-SPI selection child index is unavailable") from error
        if index < 0:
            raise RuntimeError("AT-SPI selection child index is unavailable")
        if not selection.selectChild(index):
            raise RuntimeError("AT-SPI selection failed")
        if not selection.isChildSelected(index):
            raise RuntimeError("AT-SPI selection verification failed")
        return node_info(node)
    raise LookupError("AT-SPI selection container is unavailable")
