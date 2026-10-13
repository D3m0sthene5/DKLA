"""Legal content inventory.

Proves that no brief, opinion, PDF, dictionary record or dataset was added,
removed or altered. It deliberately covers content only: code, styles, build
scripts and documents are free to change and are checked by the build, the
release checks and the browser checks instead.

    python tools/verify/content.py            check against the recorded inventory
    python tools/verify/content.py --update   record a deliberate, reviewed content change
    python tools/verify/content.py --list F   write every path and hash to F (for diffing)
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INVENTORY = Path(__file__).with_name('content-inventory.json')

# Each entry is a folder (every file beneath it) or a glob of files.
CONTENT = [
    'added-sources',             # assigned readings, opinions, briefs, the dictionary source
    'DKLA-sources',              # manifest of the scanned casebook pages
    'src/data',                  # the atlas graph, archives, dictionary and SCOTUS records
    'src/assets',                # the justices' portrait sheet
    'tools/r19/data',            # case briefs, audited briefs, sections, timelines, takeaways
    'tools/cold-call/narratives',
    'tools/cold-call/*.json',
    'tools/v25/*.json',          # authorities, U.S. Code, geography, reviews and audits
]
# Build configuration that happens to sit beside the datasets.
NOT_CONTENT = {'tools/v25/runtime-manifest.json', 'tools/v25/home-baseline-fonts.json'}


def files(entry):
    base = ROOT / entry
    found = base.rglob('*') if base.is_dir() else ROOT.glob(entry)
    for path in found:
        relative = path.relative_to(ROOT).as_posix()
        if path.is_file() and '__pycache__' not in path.parts and relative not in NOT_CONTENT:
            yield relative


def survey():
    """One digest per entry over its sorted (path, sha256) pairs."""
    result, listing = {}, []
    for entry in CONTENT:
        digest, count, size = hashlib.sha256(), 0, 0
        for relative in sorted(files(entry)):
            raw = (ROOT / relative).read_bytes()
            sha = hashlib.sha256(raw).hexdigest()
            digest.update(f'{relative}\0{sha}\n'.encode())
            listing.append(f'{sha}  {relative}')
            count += 1
            size += len(raw)
        result[entry] = {'files': count, 'bytes': size, 'sha256': digest.hexdigest()}
    return result, listing


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--update', action='store_true')
    parser.add_argument('--list', type=Path)
    args = parser.parse_args()
    current, listing = survey()
    if args.list:
        args.list.parent.mkdir(parents=True, exist_ok=True)
        args.list.write_text('\n'.join(listing) + '\n', encoding='utf-8')
    if args.update:
        INVENTORY.write_text(json.dumps(current, indent=2) + '\n', encoding='utf-8')
        print(f'Recorded {sum(e["files"] for e in current.values())} content files.')
        return
    recorded = json.loads(INVENTORY.read_text(encoding='utf-8'))
    changed = [entry for entry in sorted(set(current) | set(recorded)) if current.get(entry) != recorded.get(entry)]
    if changed:
        for entry in changed:
            print(f'CONTENT CHANGED: {entry}\n  recorded {recorded.get(entry)}\n  now      {current.get(entry)}')
        print('If this was a deliberate, reviewed content change, run with --update. '
              'Use --list before and after to see which files differ.')
        sys.exit(1)
    print(json.dumps({'pass': True, 'contentFiles': sum(e['files'] for e in current.values()),
                      'contentBytes': sum(e['bytes'] for e in current.values())}))


if __name__ == '__main__':
    main()
