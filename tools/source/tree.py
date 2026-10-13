"""Reassemble editable source without parsing or serializing legal text."""
from __future__ import annotations
import hashlib
import json
import os
from concurrent.futures import ThreadPoolExecutor
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

# Opening a file on Windows can take milliseconds (antivirus scans each open),
# and the wait is per file, so tens of thousands of opens one after another
# can take over a minute while the same opens made a few at a time take two
# seconds. Bulk reads therefore go through a small thread pool. Order and
# every path check are unchanged.
READERS = 16

def flatten(parts: list[dict], pool: ThreadPoolExecutor) -> list:
    """The leaves of a manifest tree in order: literal bytes, or the path of a part file."""
    names = [p['manifest'] for p in parts if 'manifest' in p]
    loaded = dict(zip(names, pool.map(load_manifest, names)))
    leaves: list = []
    for part in parts:
        if 'literal' in part:
            leaves.append(part['literal'].encode('utf-8'))
        elif 'path' in part:
            leaves.append(source_path(part['path']))
        elif 'manifest' in part:
            leaves.extend(flatten(loaded[part['manifest']]['parts'], pool))
        else:
            raise ValueError('Unknown source part')
    return leaves

def assemble_source() -> bytes:
    """Read every part from disk and join them. Never cached."""
    with ThreadPoolExecutor(READERS) as pool:
        leaves = flatten(load_manifest('manifest.json')['parts'], pool)
        files = [leaf for leaf in leaves if isinstance(leaf, Path)]
        contents = iter(pool.map(Path.read_bytes, files, chunksize=32))
        return b''.join(next(contents) if isinstance(leaf, Path) else leaf for leaf in leaves)

# Reassembling opens about 30,000 files, and many build and check steps need
# the result. It is therefore kept in work/cache between steps, named after a
# fingerprint of every file under src/ (path, size and modification time,
# taken from the directory listing without opening anything). Any edit,
# checkout or new file changes the fingerprint and the cache is rebuilt.
#
# The cache is a convenience, not a proof. `tools/source/check.py --verify`
# always re-reads every file, compares the result with the original hash and
# with the cache, and fails if they differ; a full verification pass runs it.
# Set DKLA_NO_SOURCE_CACHE=1 to bypass the cache entirely.
CACHE = ROOT / 'work' / 'cache'

def source_fingerprint() -> str:
    digest, pending = hashlib.sha256(), [SOURCE]
    while pending:
        with os.scandir(pending.pop()) as listing:
            for entry in sorted(listing, key=lambda e: e.name):
                if entry.is_dir(follow_symlinks=False):
                    pending.append(entry.path)
                else:
                    info = entry.stat(follow_symlinks=False)
                    digest.update(f'{os.path.relpath(entry.path, SOURCE)}\0{info.st_size}\0{info.st_mtime_ns}\n'.encode())
    return digest.hexdigest()[:32]

def cached_source(fingerprint: str) -> bytes | None:
    """The cached bytes for this fingerprint, or None. A damaged file is ignored."""
    for candidate in CACHE.glob(f'source-{fingerprint}-*.bin'):
        raw = candidate.read_bytes()
        if source_hash(raw) == candidate.stem.rsplit('-', 1)[1]:
            return raw
    return None

def store_source(fingerprint: str, raw: bytes) -> None:
    try:
        CACHE.mkdir(parents=True, exist_ok=True)
        target = CACHE / f'source-{fingerprint}-{source_hash(raw)}.bin'
        if not target.exists():
            partial = CACHE / f'{target.name}.{os.getpid()}.partial'
            partial.write_bytes(raw)
            os.replace(partial, target)  # readers never see a half-written file
        for stale in CACHE.glob('source-*.bin'):
            if stale != target:
                stale.unlink(missing_ok=True)
    except OSError:
        pass  # a cache that cannot be written only costs time

@lru_cache(maxsize=1)
def read_source() -> bytes:
    if os.environ.get('DKLA_NO_SOURCE_CACHE'):
        return assemble_source()
    fingerprint = source_fingerprint()
    raw = cached_source(fingerprint)
    if raw is None:
        raw = assemble_source()
        store_source(fingerprint, raw)
    return raw

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
