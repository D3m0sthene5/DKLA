"""Reassemble editable source without parsing or serializing legal text."""
from __future__ import annotations
import hashlib
import json
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'src'

def source_hash(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()

@lru_cache(maxsize=None)
def safe_directory(path: Path) -> bool:
    return not path.is_symlink() and (path == SOURCE or (path.is_relative_to(SOURCE) and safe_directory(path.parent)))

def source_path(relative: str) -> Path:
    # Avoid repeatedly resolving tens of thousands of ancestor paths on Windows.
    # All directory components are still checked for symlinks and traversal.
    if not relative or '\\' in relative or ':' in relative or any(p in ('', '.', '..') for p in relative.split('/')):
        raise ValueError('Source path escapes src/: ' + relative)
    path = SOURCE / relative
    if not safe_directory(path.parent) or path.is_symlink():
        raise ValueError('Source symlink is not allowed: ' + relative)
    return path

def load_manifest(relative: str) -> dict:
    return json.loads(source_path(relative).read_bytes())

def read_part(part: dict) -> bytes:
    if 'literal' in part:
        return part['literal'].encode('utf-8')
    if 'path' in part:
        return source_path(part['path']).read_bytes()
    if 'manifest' in part:
        return b''.join(read_part(p) for p in load_manifest(part['manifest'])['parts'])
    raise ValueError('Unknown source part')

def read_source() -> bytes:
    return b''.join(read_part(p) for p in load_manifest('manifest.json')['parts'])

def find_record(block: str, pointer: str) -> dict:
    """Resolve a JSON pointer to its bounded canonical file, never dump a block."""
    if '/@' in pointer:
        from .json_parts import filename
        parent, identifier = pointer.rsplit('/@', 1)
        container = find_record(block, parent)
        candidates = load_manifest(container['manifest'])['parts']
        results = [p for p in candidates if 'path' in p and (Path(p['path']).stem == filename(identifier) or Path(p['path']).stem[6:] == filename(identifier))]
        if not results: raise ValueError('Unknown record ID: ' + identifier)
        if len(results) > 1: raise ValueError('Repeated ID is preserved; select an exact numeric JSON pointer: ' + identifier)
        return results[0]
    pending = ['data/' + block + '/block.json']
    while pending:
        manifest = load_manifest(pending.pop())
        for part in manifest['parts']:
            if part.get('pointer') == pointer:
                return part
            if 'manifest' in part and (not part.get('pointer') or pointer.startswith(part['pointer'] + '/')):
                pending.append(part['manifest'])
    raise ValueError('Unknown record pointer: ' + block + ' ' + pointer)
