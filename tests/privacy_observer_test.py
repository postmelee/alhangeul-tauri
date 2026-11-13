"""Ensure evidence retains structural signals without body/query/header secrets."""
import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

class EvidencePrivacyTest(unittest.TestCase):
    def test_redaction_and_positive_control(self):
        with tempfile.TemporaryDirectory() as directory:
            os.environ['PRIVACY_OUT'] = directory
            spec = importlib.util.spec_from_file_location('observer', Path(__file__).resolve().parents[1] / 'scripts/privacy/tls-observer.py')
            observer = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(observer)
            request = SimpleNamespace(method='POST', host='edge.microsoft.com',
                url='https://edge.microsoft.com/private/device-id?secret=secret-value', scheme='https',
                headers={'cookie':'cookie-secret','authorization':'bearer-secret','user-agent':'test-runtime'},
                get_content=lambda **kwargs: b'{"request":{"device":"private-device-value","text":"TASK135-SYNTHETIC-DOCUMENT"}}')
            response = SimpleNamespace(status_code=200, raw_content=b'{}', get_content=lambda **kwargs: b'{}')
            observer.record(SimpleNamespace(request=request,response=response))
            raw = (Path(directory) / 'tls-requests.jsonl').read_text()
            result = json.loads(raw)
            for secret in ['private-device-value','private/device-id','secret-value','cookie-secret','bearer-secret','TASK135-SYNTHETIC-DOCUMENT']:
                self.assertNotIn(secret, raw)
            self.assertTrue(result['marker_present'])
            self.assertTrue(result['query_present'])
            self.assertEqual(result['request_shape'], {'request':{'device':'str','text':'str'}})
            self.assertEqual(result['status'], 200)

if __name__ == '__main__':
    unittest.main()
