"""Check exact source extraction or resolve one bounded JSON record."""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from source import read_source, source_hash, find_record
from source.tree import load_manifest, source_path

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--original', action='store_true', help='Require the approved r18 extraction identity')
    parser.add_argument('--record', nargs=2, metavar=('BLOCK', 'JSON_POINTER'))
    parser.add_argument('--chars', type=int, default=4000)
    parser.add_argument('--verify', action='store_true', help='Re-read every file, require any cached copy to match, and refresh the cache')
    parser.add_argument('--emit', action='store_true', help='Write the reassembled original HTML bytes to standard output')
    args = parser.parse_args()
    if args.record:
        part = find_record(*args.record)
        result = dict(part)
        if 'path' in part:
            raw = source_path(part['path']).read_bytes()
            result.update(bytes=len(raw), sha256=source_hash(raw), text=raw.decode()[:max(0,args.chars)], truncated=len(raw.decode())>args.chars)
        print(json.dumps(result, ensure_ascii=True, indent=2))
        return
    if args.verify:
        # Read every source file afresh. If a cached copy exists for the
        # current files it must be identical; then (re)write the cache so the
        # steps that follow in this pass can share this one read.
        from source.tree import assemble_source, cached_source, source_fingerprint, store_source
        fingerprint = source_fingerprint()
        raw, cached = assemble_source(), cached_source(fingerprint)
        if cached is not None and cached != raw:
            raise ValueError('The cached source differs from the files on disk. Delete work/cache and investigate.')
        store_source(fingerprint, raw)
    else:
        raw = read_source()
    if args.emit:
        sys.stdout.buffer.write(raw)
        return
    manifest = load_manifest('manifest.json')
    if args.original and source_hash(raw) != manifest['originSha256']:
        raise ValueError('Editable source does not reproduce the approved original bytes')
    print(json.dumps(dict(bytes=len(raw), sha256=source_hash(raw), original=source_hash(raw)==manifest['originSha256'], blocks=len(manifest['blocks']))))

if __name__ == '__main__': main()
