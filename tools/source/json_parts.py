"""Split JSON at semantic record boundaries, preserving every original byte.

JSONDecoder finds value spans; it never emits JSON. Container syntax and whitespace
remain literal parts. Leaves are exact UTF-8 slices, not regenerated values.
"""
from __future__ import annotations
import hashlib
import json
import re
from pathlib import Path

DECODER = json.JSONDecoder()

def filename(label: str) -> str:
    safe = re.sub(r'[^A-Za-z0-9_-]+', '-', str(label)).strip('-')[:65] or 'record'
    # Hash suffix avoids Windows case-insensitive collisions and reserved names.
    return safe + '-' + hashlib.sha256(str(label).encode()).hexdigest()[:10]

def pointer_part(label: str) -> str:
    return str(label).replace('~', '~0').replace('/', '~1')

def split_json(raw: bytes, block: str, destination: Path) -> dict:
    text = raw.decode('utf-8')
    def write(relative: str, content: bytes):
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
    def descend(start: int, end: int, pointer: str, directory: str, depth: int, array_item=False):
        value = json.loads(text[start:end])
        # Nodes, glossary terms and source pages are individual records. A book
        # or LRS source containing pages is a container, even if it has an id.
        record = isinstance(value, dict) and not 'pages' in value and (array_item or any(k in value for k in ('id', 'definition', 'text', 'title', 'label', 'name', 'source', 'target', 'kind', 'x', 'y', 'path')))
        # Relationship/index arrays remain one record. Source page arrays are
        # the exception: each page's original string is individually addressable.
        record = record or (isinstance(value, list) and not pointer.endswith('/pages') and all(not isinstance(item, dict) for item in value))
        if depth > 0 and (record or not isinstance(value, (dict, list)) or len(text[start:end]) < 256):
            relative = directory + '.json'
            write(relative, text[start:end].encode('utf-8'))
            return {'path': relative, 'pointer': pointer}
        if not value or not isinstance(value, (dict, list)):
            relative = directory + '.json'
            write(relative, text[start:end].encode('utf-8'))
            return {'path': relative, 'pointer': pointer}
        parts = []
        pos = start + 1
        cursor = start
        index = 0
        while True:
            while pos < end and text[pos].isspace(): pos += 1
            if text[pos] in ']}': break
            if isinstance(value, dict):
                label, pos = DECODER.raw_decode(text, pos)
                while text[pos].isspace(): pos += 1
                if text[pos] != ':': raise ValueError('Missing JSON colon')
                pos += 1
                while text[pos].isspace(): pos += 1
            else:
                label = str(index)
                item = value[index]
                if isinstance(item, dict): label = str(item.get('id', item.get('slug', item.get('page', index))))
            item_start = pos
            _, item_end = DECODER.raw_decode(text, item_start)
            parts.append({'literal': text[cursor:item_start]})
            child_pointer = pointer + '/' + pointer_part(str(index) if isinstance(value, list) else label)
            # Repeated IDs/slugs/page labels are inherited legal/source content,
            # not errors to deduplicate. Index prefixes preserve each occurrence.
            leaf_name = (f'{index:05d}-' if isinstance(value, list) else '') + filename(label)
            parts.append(descend(item_start, item_end, child_pointer, directory + '/' + leaf_name, depth + 1, isinstance(value, list)))
            cursor = item_end
            pos = item_end
            while text[pos].isspace(): pos += 1
            if text[pos] == ',': pos += 1
            else: break
            index += 1
        parts.append({'literal': text[cursor:end]})
        relative = directory + '/manifest.json'
        write(relative, (json.dumps({'pointer': pointer, 'parts': parts}, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
        return {'manifest': relative, 'pointer': pointer}
    start = len(text) - len(text.lstrip())
    _, end = DECODER.raw_decode(text, start)
    part = descend(start, end, '', 'data/' + block, 0)
    return {'parts': [{'literal': text[:start]}, part, {'literal': text[end:]}]}
