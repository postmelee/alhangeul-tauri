"""Record actual file-manager cache entries; never generate thumbnails here."""
import hashlib
import json
from pathlib import Path
import sys
from PIL import Image

files, cache, output = map(Path, sys.argv[1:])
rows = []
for path in sorted(files.iterdir()):
    key = hashlib.md5(path.resolve().as_uri().encode()).hexdigest() + '.png'
    candidates = [p for p in (cache / 'thumbnails').rglob(key)
                  if 'fail' not in p.relative_to(cache / 'thumbnails').parts]
    valid = []
    for candidate in candidates:
        try:
            with Image.open(candidate) as image:
                image.load()
                if min(image.size) > 8:
                    valid.append({'path': str(candidate.relative_to(cache)), 'size': list(image.size)})
        except (OSError, ValueError):
            pass
    rows.append({'file': path.name, 'cacheEntries': valid, 'generated': bool(valid)})
output.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
print(sum(row['generated'] for row in rows))
