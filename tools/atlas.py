#!/usr/bin/env python3
"""Bounded, read-only access to canonical DKLA content and embedded source pages.

Examples: atlas.py overview; atlas.py entry cp-gibbs; atlas.py sources "Rule 4";
atlas.py page "added-sources/Contracts- Selections.pdf" 100; atlas.py timeline pj-specific.
This tool never updates fingerprints or treats a source match as a legal conclusion.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools/r19'))
from assemble import SOURCE, EXPECTED_R18, build_data, script_blocks  # noqa: E402


def emit(value):
    print(json.dumps(value, ensure_ascii=True, indent=2))


def bounded(text, maximum):
    text = str(text)
    return dict(text=text[:maximum], characters=len(text), truncated=len(text) > maximum)


class Atlas:
    def __init__(self):
        raw = SOURCE.read_bytes()
        if hashlib.sha256(raw).hexdigest() != EXPECTED_R18:
            raise ValueError('Immutable baseline checksum differs; do not audit a stale extraction.')
        self.blocks = script_blocks(raw.decode('utf-8'))
        self.graph = json.loads(self.blocks['seedData'])
        self.nodes = {n['id']: n for n in self.graph['nodes']}
        self.data, self.full = build_data()
        self.entries = {e[0]: e for e in self.data['entries']}
        self.texts = json.loads(self.blocks['sourceTexts'])
        self.index = json.loads(self.blocks['sourceIndex'])
        self.timelines = json.loads((ROOT / 'tools/r19/data/timelines.json').read_text(encoding='utf-8'))['timelines']
        self.authorities = json.loads((ROOT / 'tools/v25/authorities.json').read_text(encoding='utf-8'))

    def authority(self, identifier, maximum, limit):
        entry = next((e for e in self.authorities['entries'] if e['id'] == identifier), None)
        if not entry:
            raise ValueError('Unknown authority ID; use search to find it.')
        return dict(**{k:v for k,v in entry.items() if k not in ('lines','links','annotations')},
                    canonicalPath='tools/v25/authorities.json',
                    blackLetter=bounded('\n'.join(line[1] for line in entry['lines']), maximum),
                    lineCount=len(entry['lines']),
                    annotations=bounded(json.dumps(entry.get('annotations',[]),ensure_ascii=False), maximum),
                    connections=entry.get('links',[])[:limit], connectionCount=len(entry.get('links',[])))

    def document(self, name):
        aliases = {'contracts': 'bookArchive', 'contracts-supplement': 'suppArchive', 'civil': 'civilArchive'}
        if name in aliases:
            archive = json.loads(self.blocks[aliases[name]])
            return archive.get('pages', archive)
        if name in self.texts:
            source = self.texts[name]
            return source.get('pages', source)
        raise ValueError('Unknown source; use sources to find its exact name or contracts/civil aliases.')

    def page(self, name, page, maximum):
        doc = self.document(name)
        if isinstance(doc, list):
            item = next((p for p in doc if isinstance(p, dict) and str(p.get('page', p.get('pdfPage'))) == str(page)), None)
            labelled = any(isinstance(p,dict) and ('page' in p or 'pdfPage' in p) for p in doc)
            if item is None and not labelled and 1 <= page <= len(doc):
                item = doc[page - 1]
        elif isinstance(doc, dict) and 'text' not in doc:
            item = doc.get(str(page))
        else:
            if page != 1:
                raise ValueError('Unpaginated extraction: request page 1 and consult the linked original for pinpoints.')
            item = doc
        if item is None:
            raise ValueError('Source page absent from the embedded extraction.')
        if isinstance(item, str):
            item = dict(text=item)
        return dict(source=name, requestedPage=page, **{k:v for k,v in item.items() if k != 'text'}, **bounded(item.get('text', ''), maximum))

    def source_matches(self, query, limit, maximum):
        q = query.casefold()
        hits = []
        for key, book in self.index.items():
            if not isinstance(book, dict):
                continue
            for entry in book.get('index', []):
                if q in json.dumps(entry, ensure_ascii=False).casefold():
                    hits.append(dict(source=book.get('file', key), collection=key, **entry))
        hits.sort(key=lambda hit:(str(hit.get('key','')).casefold()!=q,str(hit.get('label','')).casefold()!=q))
        for path, doc in self.texts.items():
            if q in path.casefold():
                hits.append(dict(source=path, kind=doc.get('kind'), pages=len(doc.get('pages', [])) or None))
            if len(hits) >= limit:
                break
            pages = doc.get('pages')
            if isinstance(pages, dict):
                pages = [dict(v, page=k) if isinstance(v,dict) else dict(page=k,text=v) for k,v in pages.items()]
            if isinstance(pages, list):
                for number, entry in enumerate(pages, 1):
                    text = entry.get('text', '') if isinstance(entry, dict) else str(entry)
                    position = text.casefold().find(q)
                    if position >= 0:
                        hits.append(dict(source=path, page=entry.get('page', number) if isinstance(entry, dict) else number,
                                         excerpt=text[max(0, position-120):position+maximum]))
                        if len(hits) >= limit:
                            break
            elif doc.get('text'):
                text = doc['text']; position = text.casefold().find(q)
                if position >= 0:
                    hits.append(dict(source=path, page=None, excerpt=text[max(0,position-120):position+maximum], pinpoint='Unpaginated OCR; verify the original before citing.'))
        return dict(query=query, results=hits[:limit], limit=limit, meaning='Matches are navigation aids, not audited doctrinal links.')

    def entry(self, identifier, maximum):
        node = self.nodes.get(identifier)
        bid = self.data['map'].get(identifier, identifier.removeprefix('brief-'))
        brief = self.entries.get(bid)
        if not node and not brief:
            raise ValueError('Unknown entry ID; use search to find it.')
        narrative_path = ROOT / 'tools/cold-call/narratives' / f'{identifier}.json'
        if not narrative_path.is_file() and brief and not brief[6]:
            narrative_path = ROOT / 'tools/cold-call/narratives' / f'brief-{bid}.json'
        narrative = json.loads(narrative_path.read_text(encoding='utf-8')) if narrative_path.is_file() else next((c for c in json.loads((ROOT/'tools/cold-call/cases.json').read_text(encoding='utf-8'))['cases'] if c['id']==identifier), None)
        corrected = ROOT / 'tools/r19/data/audited' / f'{bid}.md'
        brief_path = corrected if corrected.is_file() else ROOT / 'tools/r19/data/briefs' / f'{bid}.md'
        return dict(id=identifier, title=(node or {}).get('title', brief[1] if brief else ''),
                    baselineNode={k:v for k,v in (node or {}).items() if k in ('id','title','shortTitle','kind','courses','sources','updatedAt','civilImport')},
                    baselineProse=bounded(json.dumps({k:v for k,v in (node or {}).items() if k in ('summary','notes','sections','learning')},ensure_ascii=False),maximum),
                    nodeBasis='Immutable graph seed; effective case sections and listed runtime corrections override unedited entries.',
                    canonicalCompact=bounded(json.dumps(self.data['sections'].get(bid),ensure_ascii=False),maximum),
                    runtimeCorrections={filename:bounded(json.dumps(json.loads((ROOT/'tools/r19/data'/filename).read_text(encoding='utf-8')).get('nodes',{}).get(identifier),ensure_ascii=False),maximum) for filename in ('r21-audit.json','plain.json')},
                    plainEnglishTakeaway=json.loads((ROOT/'tools/r19/data/takeaways.json').read_text(encoding='utf-8')).get(identifier),
                    takeawayPath='tools/r19/data/takeaways.json',
                    briefId=bid if brief else None,
                    canonicalBriefPath=brief_path.relative_to(ROOT).as_posix() if brief else None,
                    effectiveBriefBasis='build_data() applies recorded corrections and PDF tidying to the input Markdown before rendering and hashing.',
                    brief=bounded(self.full.get(bid, ''), maximum),
                    briefSha256=hashlib.sha256(self.full[bid].encode()).hexdigest() if bid in self.full else None,
                    corrections=[c for c in json.loads((ROOT/'tools/r19/data/accuracy24.json').read_text(encoding='utf-8')).get('changes',[]) if c.get('id',c.get('briefId'))==bid],
                    narrativePath=narrative_path.relative_to(ROOT).as_posix() if narrative_path.is_file() else None,
                    narrativeReview=narrative.get('review') if narrative else None,
                    narrativeSources=narrative.get('sources') if narrative else None,
                    linkedAuthorityIds=self.authorities['byNode'].get(identifier,[]),
                    relatedBriefs=self.data['related'].get(bid, self.data['related'].get(identifier, [])),
                    timelines=[dict(id=t['id'],title=t['title'],steps=[s for s in t['steps'] if s.get('id')==identifier or s.get('sup')==bid]) for t in self.timelines if any(s.get('id')==identifier or s.get('sup')==bid for s in t['steps'])])

    def catalog(self):
        result = subprocess.run(['git','ls-tree','-r','HEAD','--','added-sources','DKLA-sources'], cwd=ROOT, capture_output=True,text=True,check=True)
        tracked = {}
        for line in result.stdout.splitlines():
            prefix,path = line.split('\t',1)
            mode,kind,sha = prefix.split()
            if kind == 'blob':
                tracked[path] = sha
        documents = []
        for path,doc in sorted(self.texts.items()):
            pages = doc.get('pages', [])
            text_chars = sum(len(p.get('text','')) if isinstance(p,dict) else len(str(p)) for p in (pages.values() if isinstance(pages,dict) else pages)) if pages else len(doc.get('text',''))
            documents.append(dict(path=path, gitBlob=tracked.get(path), embeddedKind=doc.get('kind'), pageCount=len(pages) or None, textCharacters=text_chars))
        return dict(schemaVersion=1, baselineSha256=EXPECTED_R18,
                    provenance='File hashes identify source bytes; text matches do not certify legal propositions. Original PDFs and OCR can differ.',
                    sourceFiles=[dict(path=path,gitBlob=sha,embeddedText=path in self.texts) for path,sha in sorted(tracked.items())],
                    embeddedDocuments=documents,
                    archiveAliases={'contracts':'bookArchive, printed-page keys','contracts-supplement':'suppArchive, printed-page keys','civil':'civilArchive.pages, printed-page keys'},
                    indexes={k:dict(file=v.get('file'), headings=len(v.get('index',[]))) for k,v in self.index.items() if isinstance(v,dict)},
                    counts=dict(mapCases=sum(n['kind']=='Case' for n in self.nodes.values()),briefs=len(self.full),
                                narratives=len(list((ROOT/'tools/cold-call/narratives').glob('*.json')))+len(json.loads((ROOT/'tools/cold-call/cases.json').read_text(encoding='utf-8'))['cases']),
                                timelines=len(self.timelines),timelineSteps=sum(len(t['steps']) for t in self.timelines),
                                authorities=len(self.authorities['entries']),authorityConnections=sum(len(e.get('links',[])) for e in self.authorities['entries'])))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['overview','search','entry','authority','sources','page','timeline','catalog'])
    parser.add_argument('query', nargs='?', default='')
    parser.add_argument('page_number', nargs='?', type=int, default=1)
    parser.add_argument('--limit',type=int,default=12)
    parser.add_argument('--chars',type=int,default=4000)
    parser.add_argument('--write',action='store_true',help='Only catalog: save tools/v25/source-catalog.json without copying source text.')
    args=parser.parse_args()
    if not (1<=args.limit<=100 and 200<=args.chars<=50000):
        parser.error('limit must be 1–100; chars must be 200–50000.')
    atlas=Atlas()
    if args.command=='overview':
        emit(dict(courses=atlas.graph.get('courses'),counts=atlas.catalog()['counts'],sources=len(atlas.texts),canonicalData='tools/r19/data',runtimeManifest='tools/v25/runtime-manifest.json',warnings=['Inherited review records are not a fresh source audit.','Full opinions, assigned excerpts, and OCR must be distinguished.','Do not print generated HTML or entire inline JSON blocks.']))
    elif args.command=='search':
        q=args.query.casefold()
        hits=[dict(id=e[0],title=e[1],atlasId=e[6],review=e[3]) for e in atlas.entries.values() if q in e[1].casefold() or q in e[0].casefold()]
        hits += [dict(id=e['id'],cite=e['cite'],title=e['title'],kind='authority',collection=e['collection']) for e in atlas.authorities['entries'] if q in (e['id']+' '+e['cite']+' '+e['title']).casefold()]
        emit(hits[:args.limit])
    elif args.command=='entry':
        emit(atlas.entry(args.query,args.chars))
    elif args.command=='authority':
        emit(atlas.authority(args.query,args.chars,args.limit))
    elif args.command=='sources':
        emit(atlas.source_matches(args.query,args.limit,min(args.chars,700)))
    elif args.command=='page':
        emit(atlas.page(args.query,args.page_number,args.chars))
    elif args.command=='timeline':
        matches=[t for t in atlas.timelines if t['id']==args.query or args.query.casefold() in t['title'].casefold()]
        if len(matches)>1:
            emit([dict(id=t['id'],title=t['title']) for t in matches][:args.limit])
        elif matches:
            emit(matches[0])
        else:
            raise ValueError('Timeline not found.')
    elif args.command=='catalog':
        value=atlas.catalog()
        if args.write:
            (ROOT/'tools/v25/source-catalog.json').write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
            emit(dict(saved='tools/v25/source-catalog.json',counts=value['counts'],files=len(value['sourceFiles'])))
        else:
            emit(value)


if __name__=='__main__':
    try:
        main()
    except (ValueError,KeyError) as error:
        raise SystemExit(str(error))
