"""Disposable-runner addon: retain structure, never raw bodies/credentials."""
import json
import os
import time
from pathlib import Path
from urllib.parse import urlsplit

OUT = Path(os.environ['PRIVACY_OUT'])
MARKER = b'TASK135-SYNTHETIC-DOCUMENT'

def phase():
    try:
        return (OUT / 'phase').read_text().strip()
    except FileNotFoundError:
        return 'startup'

def structure(value, depth=0):
    if depth > 5:
        return type(value).__name__
    if isinstance(value, dict):
        return {key: structure(item, depth + 1) for key, item in list(value.items())[:60]}
    if isinstance(value, list):
        return {'type': 'array', 'length': len(value), 'item': structure(value[0], depth + 1) if value else None}
    return type(value).__name__

def shape(data):
    try:
        return structure(json.loads(data))
    except (ValueError, UnicodeError):
        return 'non-json'

def record(flow, failed=False):
    request = flow.request
    body = request.get_content(strict=False) or b''
    # Only public updater paths are retained; other URLs may contain identifiers.
    path = urlsplit(request.url).path
    safe_path = path if request.host == 'postmelee.github.io' else '<redacted>'
    response = flow.response
    item = dict(time=time.time(), phase=phase(), method=request.method,
                host=request.host, path=safe_path, scheme=request.scheme,
                query_present=bool(urlsplit(request.url).query),
                request_bytes=len(body), request_shape=shape(body),
                header_names=sorted(request.headers.keys()),
                user_agent=request.headers.get('user-agent'),
                marker_present=MARKER in body or MARKER.decode() in request.url,
                status=response.status_code if response else None,
                response_bytes=len(response.raw_content or b'') if response else None,
                response_shape=shape(response.get_content(strict=False) or b'') if response else None,
                failed=failed)
    with (OUT / 'tls-requests.jsonl').open('a', encoding='utf8') as stream:
        stream.write(json.dumps(item) + '\n')

def response(flow):
    record(flow)

def error(flow):
    record(flow, failed=True)
