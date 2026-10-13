"""Adversarial byte-preservation cases, independent of shipping legal content."""
import json
import sys
import tempfile
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from source.json_parts import split_json

class Preservation(unittest.TestCase):
    def test_exact_tokens(self):
        raw = b' \r\n{ "nodes": [{"id":"a","text":"\\u2019 \\n"}, {"id":"a","text":"different occurrence"}, {"id":"A","text":"caf\xc3\xa9"}], "pages": ["first", "second"], "numeric": -0.00e+02 }\t'
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            tree = split_json(raw, 'test', root)
            def join(part):
                if 'literal' in part: return part['literal'].encode()
                if 'path' in part: return (root / part['path']).read_bytes()
                return b''.join(join(p) for p in json.loads((root / part['manifest']).read_bytes())['parts'])
            self.assertEqual(raw, b''.join(join(p) for p in tree['parts']))
            records = list(root.rglob('*.json'))
            self.assertEqual(len({str(p).lower() for p in records}), len(records))

    def test_invalid_json_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError): split_json(b'{"broken": }', 'test', Path(tmp))

    def test_path_escape_rejected(self):
        from source.tree import source_path
        for name in ('../outside', '/outside', 'C:/outside', 'data/../../outside', 'data\\outside'):
            with self.assertRaises(ValueError): source_path(name)

if __name__ == '__main__': unittest.main()
