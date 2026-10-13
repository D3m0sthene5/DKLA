#!/usr/bin/env python3
"""Build the offline authority library from official and already-assigned sources.

Refresh: python tools/v25/authorities_build.py --refresh
Relink:  python tools/v25/authorities_build.py --relink
Verify:  python tools/v25/authorities_build.py --check
The normal atlas build embeds authorities.json; it does not make network requests.
Raw fetched pages are cached in the workspace work/authorities-cache directory.
"""
from __future__ import annotations
import argparse, concurrent.futures, hashlib, html, io, json, math, re, subprocess, sys, time, urllib.error, urllib.request
from html.parser import HTMLParser
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from source import read_source
CACHE = ROOT.parent / 'authorities-cache'
DATA = HERE / 'authorities.json'
DATE = '2026-10-11'
ARCHIVES = 'https://www.archives.gov/founding-docs/'
LII = 'https://www.law.cornell.edu'
FRCP_PDF = 'https://www.uscourts.gov/sites/default/files/document/federal-rules-of-civil-procedure.pdf'
COURSES = ['Contracts', 'Civil Procedure', 'Legislation and the Regulatory State']

def norm(s):
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()

def strip(s):
    return norm(re.sub(r'<[^>]+>', '', s))

def sha(b):
    return hashlib.sha256(b).hexdigest()

def get(url, refresh=False):
    CACHE.mkdir(parents=True, exist_ok=True)
    p = CACHE / (sha(url.encode()) + '.source')
    if refresh or not p.exists():
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 DKLA academic source audit'})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=45) as r: b = r.read()
                break
            except urllib.error.HTTPError as err:
                if err.code not in (429,503) or attempt==2: raise
                time.sleep(2*(attempt+1))
        p.write_bytes(b)
    return p.read_bytes()

def assigned(path):
    p = ROOT / path
    b = p.read_bytes() if p.exists() else subprocess.check_output(['git', 'show', f'HEAD:{path}'], cwd=ROOT)
    return json.loads(b), sha(b)

class Blocks(HTMLParser):
    def __init__(self):
        super().__init__(); self.items=[]; self.tag=None; self.buf=[]; self.attrs={}
    def handle_starttag(self, tag, attrs):
        if tag in ('h2','h3','p') and self.tag is None:
            self.tag=tag; self.buf=[]; self.attrs=dict(attrs)
    def handle_data(self, d):
        if self.tag: self.buf.append(d)
    def handle_endtag(self, tag):
        if tag == self.tag:
            text=norm(''.join(self.buf))
            if text: self.items.append((tag,text,self.attrs))
            self.tag=None

def roman(n):
    out=''
    for val, sym in [(100,'C'),(90,'XC'),(50,'L'),(40,'XL'),(10,'X'),(9,'IX'),(5,'V'),(4,'IV'),(1,'I')]:
        while n>=val: out+=sym; n-=val
    return out

def blocks(url):
    raw=get(url); p=Blocks(); p.feed(raw.decode('utf8')); return p.items, sha(raw)

def entry(id, collection, cite, title, lines, source, **kw):
    return dict(id=id,collection=collection,cite=cite,title=title,lines=lines,source=source,status='text',links=[],**kw)

def constitution():
    out=[]; sources=[]
    names=['Legislative branch','Executive branch','Judicial branch','The states','Amendment process','Supremacy and oaths','Ratification']
    url=ARCHIVES+'constitution-transcript'; events,h=blocks(url); sources.append(dict(url=url,sha256=h))
    active=None
    for tag,text,attrs in events:
        if text.startswith('We the People'):
            out.append(entry('const-preamble','constitution','Preamble','Preamble',[[0,text]],dict(name='National Archives transcription',url=url,read=DATE)))
        elif tag=='h2' and re.fullmatch(r'Article\. [IVX]+\.',text):
            num=next(i for i in range(1,8) if roman(i)==text.split()[1].rstrip('.'))
            active=entry(f'const-art-{num}','constitution',f'Article {roman(num)}',names[num-1],[],dict(name='National Archives original-text transcription',url=url+'#'+str(num),read=DATE))
            active['note']='Original text, including language later modified by amendments. Read the amendments alongside it.'
            out.append(active)
        elif active and tag=='h3' and text.startswith('Section.'):
            active['lines'].append([0,text,'heading'])
        elif active and tag=='p':
            if text.startswith(('done in Convention','Done in Convention','Attest','Go to','This page','The Constitution was')):
                active=None
            else: active['lines'].append([0,text])
    amendments=['Religion, speech, press, assembly and petition','Arms','Quartering','Searches and seizures','Criminal protections, due process and takings','Criminal trial rights','Civil jury trial','Bail, fines and punishment','Retained rights','Reserved powers','Suits against states','President and Vice President elections','Abolition of slavery','Citizenship, due process and equal protection','Voting and race','Income tax','Direct election of senators','Prohibition','Voting and sex','Terms and succession','Repeal of prohibition','Presidential term limits','District of Columbia electors','Poll taxes','Presidential succession and disability','Voting at eighteen','Congressional compensation']
    for slug,lo,hi in [('bill-of-rights-transcript',1,10),('amendments-11-27',11,27)]:
        url=ARCHIVES+slug; events,h=blocks(url); sources.append(dict(url=url,sha256=h)); active=None
        for tag,text,attrs in events:
            m=re.fullmatch(r'AMENDMENT ([IVX]+)|Amendment ([IVX]+)',text)
            if m:
                r=m.group(1) or m.group(2); n=next(i for i in range(lo,hi+1) if roman(i)==r)
                if any(e['id']==f'const-amend-{n}' for e in out): break
                active=entry(f'const-amend-{n}','constitution',f'Amendment {roman(n)}',amendments[n-1],[],dict(name='National Archives transcription',url=url+('#toc-amendment-'+r.lower() if lo==11 else ''),read=DATE))
                active['note']='Ratified December 15, 1791.' if n<=10 else ''
                if n==18: active['status']='repealed'; active['note']='Repealed by Amendment XXI (1933). Retained here for historical reading.'
                out.append(active)
            elif active and tag in ('h2','h3') and text.startswith('Section'):
                active['lines'].append([0,text,'heading'])
            elif active and tag=='p':
                if text.startswith(('Passed by Congress','Originally proposed','Note:','Ratified')):
                    active['note']=' '.join(filter(None,[active['note'],text]))
                elif text.startswith(('This page','Note: The capitalization','Back to','The U.S. National','Amendments 11-27')):
                    active=None
                else: active['lines'].append([0,text])
    # Article VII's signature list is documentary context, not another constitutional section.
    last=next(e for e in out if e['id']=='const-art-7')
    last['lines']=last['lines'][:1]
    related={'const-art-1':[13,14,16,17,20,27],'const-art-2':[12,20,22,23,25],'const-art-3':[11],'const-amend-14':[26],'const-amend-18':[21]}
    for e in out:
        if e['id'] in related: e['related']=['const-amend-'+str(n) for n in related[e['id']]]
    return out,sources

def frcp():
    raw=get(LII+'/rules/frcp'); text=raw.decode(); sources=[dict(url=LII+'/rules/frcp',sha256=sha(raw))]
    assert 'December 1, 2025' in strip(text), 'Unreviewed FRCP edition; update the effective-date audit before refreshing.'
    pdf=get(FRCP_PDF); sources.append(dict(url=FRCP_PDF,sha256=sha(pdf)))
    paths=list(dict.fromkeys(re.findall(r'href="(/rules/frcp/(?:rule_[\d.]+|title_xiii|ss_actions))"',text)))
    rules=[p for p in paths if '/rule_' in p]
    if '/rules/frcp/rule_4.1' not in rules: rules.append('/rules/frcp/rule_4.1')
    assert len(rules)==98, (len(rules),rules)
    def read(path, collection='frcp', prefix='frcp'):
        raw=get(LII+path); page=raw.decode(); num=path.split('_')[-1]
        title=strip(re.search(r'<h1[^>]*>(.*?)</h1>',page,re.S)[1])
        a=page.index('<article'); end=re.search(r'<h4>\s*Notes|class="(?:source-credit|note-head)"',page[a:])
        body=page[a:a+end.start()] if end else page[a:page.index('</article>',a)]
        lines=[]
        for cls,b in re.findall(r'<p(?: class="([^"]*)")?>(.*?)</p>',body,re.S):
            t=strip(b); m=re.search(r'(\d)em',cls or '')
            if t and not re.match(r'\((?:As amended|As added|Added) ',t): lines.append([int(m[1]) if m else 0,t])
        status='abrogated' if num in ['74','75','76','84'] else 'text'
        if status=='abrogated' and not lines: lines=[[0,title]]
        assert lines, path
        e=entry(prefix+'-'+num,collection,'Rule '+num,re.sub(r'^Rule [\d.A-G]+\.\s*','',title),lines,dict(name='Federal Rules of Civil Procedure · LII transcription',url=LII+path,official=FRCP_PDF,edition='December 1, 2025',read=DATE))
        e['status']=status; e['textSha256']=sha(json.dumps(lines,ensure_ascii=False).encode())
        return e,dict(url=LII+path,sha256=sha(raw))
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool: results=list(pool.map(read,rules))
    out=[x[0] for x in results]; sources.extend(x[1] for x in results)
    out.sort(key=lambda e:tuple(map(int,e['id'][5:].split('.'))))
    out.append(entry('frcp-71A','frcp','Former Rule 71A','Renumbered as Rule 71.1',[[0,'Former Rule 71A was renumbered as Rule 71.1 in 2007. Read current Rule 71.1 for condemnation proceedings.']],dict(name='Official FRCP edition',url=FRCP_PDF,edition='December 1, 2025',read=DATE),related=['frcp-71.1']))
    out[-1]['status']='renumbered'
    # Keep the old label adjacent to its replacement, rather than after Rule 87.
    old=out.pop(); out.insert(next(i+1 for i,e in enumerate(out) if e['id']=='frcp-71.1'),old)
    for letter in 'ABCDEFG':
        e,s=read('/rules/frcp/rule_'+letter,'admiralty','admiralty'); out.append(e); sources.append(s)
    ssurl=LII+'/node/6735414'; raw=get(ssurl); parser=Blocks(); parser.feed(raw.decode())
    sources.append(dict(url=ssurl,sha256=sha(raw))); active=None
    for tag,text,attrs in parser.items:
        m=re.match(r'Rule (\d+)\.\s*(.+)',text) if tag=='h3' else None
        if m:
            active=entry('social-security-'+m[1],'social-security','Rule '+m[1],m[2],[],dict(name='Supplemental Social Security Rules · LII transcription',url=ssurl,official=FRCP_PDF,edition='December 1, 2025',read=DATE)); out.append(active)
        elif 'Advisory Committee Note' in text: active=None
        elif active and tag=='p': active['lines'].append([0,text])
    out.append(entry('frcp-forms','frcp','Former Appendix of Forms','Abrogated December 1, 2015',[[0,'The former Appendix of Forms and Rule 84 were abrogated effective December 1, 2015. They are retained as a historical index entry, not current forms.']],dict(name='Official FRCP edition',url=FRCP_PDF,edition='December 1, 2025',read=DATE)))
    out[-1]['status']='abrogated'
    return out,sources

def loose(s):
    return re.compile(r'[\s\-–—]*'.join(re.escape(c) for c in re.sub(r'[\s\-–—]+','',s)))

def text_lines(body):
    body=re.sub(r'(?<=[a-z])-\s+(?=[a-z])','',body)
    body=norm(body)
    lines=[]; kinds=[]
    for part in re.split(r'\s(?=\((?:\d{1,2}|[a-h]|[A-H])\)\s)',body):
        marker=re.match(r'\((\d{1,2}|[a-h]|[A-H])\)\s',part)
        kind=None if not marker else 'n' if marker[1].isdigit() else 'l' if marker[1].islower() else 'u'
        if lines and re.search(r'(?:and|or|[Ss]ubsections?|[Ss]ections?|under|in|of|see|[Pp]aragraphs?|,)\s*$',lines[-1][1]): lines[-1][1]+=' '+part
        else:
            if kind and kind not in kinds: kinds.append(kind)
            lines.append([kinds.index(kind) if kind else 0,part])
    return lines

def pdf_blackletter():
    """Use font-marked headings, not loose mentions, to identify the assigned rules.

    The inherited flattened index is a navigation aid, not authority for where a
    section begins: two of its headings were comment cross-references. The PDF's
    bold numbered headings and explicit comment boundary provide that evidence.
    """
    import pypdf
    path='added-sources/Contracts- Selections.pdf'
    raw=(ROOT/path).read_bytes() if (ROOT/path).exists() else subprocess.check_output(['git','show','HEAD:'+path],cwd=ROOT)
    digest=sha(raw); CACHE.mkdir(parents=True,exist_ok=True); cache=CACHE/('blackletter-v3-'+digest+'.json')
    audit_path=HERE/'authorities-extraction-audit.json'
    if cache.exists():
        cached=json.loads(cache.read_text(encoding='utf8'))
        audit_path.write_text(json.dumps(cached['audit'],ensure_ascii=False,indent=2)+'\n',encoding='utf8')
        return cached['records'],dict(file=path,sha256=digest)
    reader=pypdf.PdfReader(io.BytesIO(raw)); found={}; active=None; mode=None; excluded=[]
    for page in list(range(23,225))+list(range(308,434)):
        if page==308: active=None;mode=None
        chunks=[]
        def visitor(t,cm,tm,font,size):
            text=t.strip()
            # This PDF uses font size 1 with the actual type size in the text
            # matrix. Main blackletter is 10 pt; editorial footnotes are 8 pt
            # and their superscript letters 4.664 pt. A vertical cutoff alone
            # lets a previous section's footnote leak into the next section.
            points=size*math.hypot(tm[2],tm[3])*math.hypot(cm[2],cm[3])
            if text and 65<=tm[5]<631: chunks.append((text,str(font.get('/BaseFont','')) if font else '',points,tm[5]))
        reader.pages[page].extract_text(visitor_text=visitor)
        for text,font,points,y in chunks:
            # Boundary headings can themselves use the smaller comment font.
            # Recognize them before rejecting editorial-sized spans, or their
            # following comments would still be associated with the body.
            if re.match(r'^(?:Official Comments?|Comments?|Definitional Cross References?|Cross References?|Reporters[’\'] Notes?)\b',text):
                mode='comment'
                continue
            if points<9.5:
                if active and mode in ['heading','body']:
                    excluded.append(dict(record=('ucc-' if '-' in active['number'] else 'restatement-')+active['number'],pdfPage=page+1,points=round(points,3),y=round(y,2),text=text))
                continue
            m=re.match(r'^§\s*(\d+(?:[–-]\d+)?)\.\s*(.*)',text) if 'Bold' in font else None
            if m:
                number=m[1].replace('–','-'); key=('ucc-' if '-' in number else 'restatement-')+number
                active=dict(number=number,title=m[2],page=page+1,parts=[]);found[key]=active;mode='heading'
            elif re.match(r'^(?:CHAPTER|TOPIC|PART)\s',text) and 'Bold' in font:
                active=None;mode=None
            elif active and mode=='heading' and 'Bold' in font:
                active['title']+=' '+text
            elif active and mode in ['heading','body']:
                mode='body';active['parts'].append(text)
    for id,r in found.items():
        r['title']=norm(r['title']);r['body']=norm(' '.join(r.pop('parts')))
        r['body']=re.sub(r'(?<=[a-z])\s*-\s+(?=[a-z])','',r['body'])
    assert sum(k.startswith('restatement-') for k in found)==385
    assert sum(k.startswith('ucc-') for k in found)==133
    assert 'This section is deleted in the 2003' not in found['ucc-2-209']['body']
    audit=dict(schema=1,checked=DATE,file=path,sourceSha256=digest,records=dict(restatement=385,ucc=133),
               method='All 518 numbered headings and blackletter bodies were re-extracted from the assigned PDF. Bold section headings and explicit comment boundaries delimit each record. Page headers/numbers and text smaller than 9.5 effective points are excluded; main blackletter uses 10 points. This is an extraction audit, not a fresh legal audit of 518 provisions.',
               excludedEditorialSpans=excluded,
               recordBodyHashes={k:sha(r['body'].encode()) for k,r in found.items()})
    cache.write_text(json.dumps(dict(records=found,audit=audit),ensure_ascii=False),encoding='utf8')
    audit_path.write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    return found,dict(file=path,sha256=digest)

def selections():
    d,h=assigned('added-sources/index/contracts-selections.json')
    verified,pdf_source=pdf_blackletter()
    extraction_audit=json.loads((HERE/'authorities-extraction-audit.json').read_text(encoding='utf8'))
    out=[]; fixes={363:('Effect of Insecurity as to the Agreed Exchange',218),375:('Restitution When Contract Is Within Statute of Frauds',221)}
    idx=[dict(e) for e in d['index'] if re.fullmatch(r'(?:Restatement § \d+|UCC § [\d-]+)',e['key'])]
    for e in idx:
        m=re.fullmatch(r'Restatement § (\d+)',e['key'])
        if m and int(m[1]) in fixes:
            title,page=fixes[int(m[1])]; e.update(label=f'Restatement (Second) of Contracts § {m[1]}. {title}',page=page)
    idx.sort(key=lambda e:(e['page'],int(re.search(r'\d+',e['key'])[0]) if e['key'].startswith('Restatement §') else 1000))
    for e in idx:
        rest=e['key'].startswith('Restatement §'); num=e['key'].split('§ ')[1]
        pattern=loose(re.search(r'§ .*',e['label'])[0])
        # A heading can share a page with several following sections; the next numbered
        # heading, comment or cross-reference apparatus terminates the black letter.
        page=e['page']; full=' '.join(d['pageText'][page-1:min(page+8,len(d['pageText']))]); start=pattern.search(full)
        assert start, e
        if not rest and num=='2-208':
            out.append(entry('ucc-2-208','ucc','UCC § 2-208','Course of Performance or Practical Construction',[[0,'The assigned Selections omit this section’s former black letter. Their note explains that § 2-208 was deleted in the 2003 Official Text in light of § 1-303, while some states retained it. Read § 1-303 and the applicable state enactment.']],dict(name='Assigned Contracts Selections · compiler’s deletion note',file=d['file']+'#page='+str(page),pdfPage=page,edition='2021 assigned selections',read=DATE),related=['ucc-1-303']))
            out[-1]['status']='deleted-model-section'
            continue
        body=full[start.end():]
        ends=[m.start() for m in re.finditer(r'\b(?:Official Comment|Comment:|Comments:|Reporters[’\'] Notes?|Definitional Cross References?|CHAPTER \d+\.|TOPIC \d+\.)|§\s*\d+(?:[–-]\d+)?\.\s+[A-Z]',body)]
        if ends: body=body[:min(ends)]
        # Strip page furniture when a black-letter section crosses a page.
        body=re.sub(r'(?:§\s*[\d–-]+\s+)?RESTATEMENT OF CONTRACTS[—–-]SECOND|(?:§\s*[\d–-]+\s+)?UNIFORM COMMERCIAL CODE|\bARTICLE \d+\. [A-Z ]+\s+\d{1,3}\b','',body)
        body=re.sub(r'\s+\d{1,3}\s+(?=\([1-9a-h]\)|[A-Z])',' ',body)
        record=verified.get(('restatement-' if rest else 'ucc-')+num)
        assert record,('No bold PDF heading',e)
        body=record['body']; page=record['page']
        lines=text_lines(body.strip())
        assert lines and sum(len(x[1]) for x in lines)>12, (e,body[:120])
        cite=f'Restatement (Second) § {num}' if rest else f'UCC § {num}'
        title=record['title'].rstrip('.')
        out.append(entry('restatement-'+num if rest else 'ucc-'+num,'restatement' if rest else 'ucc',cite,title,lines,dict(name='Assigned Contracts Selections · black letter',file=d['file']+'#page='+str(page),index='added-sources/index/contracts-selections.json',pdfPage=page,edition='2021 assigned selections',read=DATE)))
        if not rest and num in ['1-201','2-103']:
            # State-enactment qualifications are compiler notes, not blackletter.
            pieces=[s['text'] for s in extraction_audit['excludedEditorialSpans'] if s['record']=='ucc-'+num and s['points']>=7.5]
            note=re.sub(r'^[a-z]\s+','',norm(' '.join(pieces)))
            out[-1]['annotations']=[dict(title='Compiler’s footnote · 2021 assigned Selections; state enactments vary',lines=[[0,note]])]
    return out,[dict(file='added-sources/index/contracts-selections.json',sha256=h),pdf_source],fixes

def graph_records():
    text=read_source().decode('utf8')
    graph=json.loads(re.search(r'<script[^>]+id="seedData"[^>]*>(.*?)</script>',text,re.S)[1])
    nodes=graph['nodes'][:]
    for name in ['rules22','rlcc']:
        nodes.extend(json.loads((ROOT/'tools/r19/data'/f'{name}.json').read_text(encoding='utf8'))['rules'])
    # Canonical full briefs carry citations that do not fit in the compact map card.
    # Add their text only to this build-time index, never to the library payload.
    mapped=json.loads((ROOT/'tools/r19/data/map.json').read_text(encoding='utf8'))
    audit=json.loads((ROOT/'tools/r19/data/audit.json').read_text(encoding='utf8'))
    by={n['id']:n for n in nodes}
    for atlas_id,brief_id in mapped.items():
        if atlas_id not in by: continue
        corrected=ROOT/'tools/r19/data/audited'/f'{brief_id}.md'
        path=corrected if audit.get(brief_id,{}).get('verdict')=='corrected' and corrected.exists() else ROOT/'tools/r19/data/briefs'/f'{brief_id}.md'
        if path.exists(): by[atlas_id]['authorityReferenceText']=path.read_text(encoding='utf8')
    return nodes,graph

def consumer():
    d,h=assigned('added-sources/index/complete-restatement.json'); out=[]
    for e in d['index']:
        m=re.fullmatch(r'RLCC § (\d+)',e['key'])
        if not m or int(m[1])>10: continue # § 8401 is a statute cited in a comment.
        title=e['label'].split('. ',1)[1]; page=e['page']; full=' '.join(d['pageText'][page-1:page+5])
        start=loose('§ '+m[1]+'. '+title).search(full); assert start,e
        body=full[start.end():]; end=re.search(r'\bComment:|\bComments:|\bReporters[’\'] Notes?',body)
        assert end,e
        body=body[:end.start()]; body=re.sub(r'(?m)^\d{1,3}\s*$', '',body)
        body=re.sub(r'\b\d{1,3}\s+CONSUMER CONTRACTS\b|\bCONSUMER CONTRACTS\s+\d{1,3}\b','',body)
        body=re.sub(r'\bCONSUMER CONTRACTS\b','',body)
        out.append(entry('consumer-'+m[1],'consumer','Consumer Restatement § '+m[1],title,text_lines(body),dict(name='Assigned Restatement of Consumer Contracts · black letter',file=d['file']+'#page='+str(page),index='added-sources/index/complete-restatement.json',pdfPage=page,edition='Official Text 2024',read=DATE)))
    return out,[dict(file='added-sources/index/complete-restatement.json',sha256=h)]

def ucc_articles():
    out=[]; url='https://www.uniformlaws.org/acts/ucc'; raw=get(url); t=raw.decode()
    names=[('1','General Provisions'),('2','Sales'),('2A','Leases'),('3','Negotiable Instruments'),('4','Bank Deposits and Collections'),('4A','Funds Transfers'),('5','Letters of Credit'),('6','Bulk Sales'),('7','Documents of Title'),('8','Investment Securities'),('9','Secured Transactions'),('12','Controllable Electronic Records')]
    for num,title in names:
        out.append(entry('ucc-article-'+num,'ucc-articles','Article '+num,title,[[0,('Assigned black letter is available in the UCC collection below.' if num in ['1','2'] else 'This article is indexed here with a link to the Uniform Law Commission. The complete text of this article is not part of the assigned Contracts library.')]],dict(name='Uniform Law Commission · UCC articles index',url=url,read=DATE)))
        out[-1]['status']='article-index'
        out[-1]['filter']='ucc-'+num+'-'
        if num=='6': out[-1]['note']='The ULC recommends repeal; state enactments determine whether a bulk-sales article remains in force.'
        if num=='12': out[-1]['note']='Added by the 2022 amendments. State adoption and effective dates vary.'
    return out,[dict(url=url,sha256=sha(raw))]

def citation_pattern(e):
    """Recognize a provision citation, never an opinion's Part I/II heading."""
    # Keep the anchor at a word boundary: bare `Art` otherwise matches `Part`.
    id=e['id']
    if e['collection']=='uscode':
        tn=e.get('titleNumber'); section=e.get('section')
        if not tn or not section: return None
        pat=rf'(?:{re.escape(str(tn))}\s*U\.?\s*S\.?\s*C\.?\s*(?:§{{1,2}}\s*|Section\s*){re.escape(str(section))}(?![\dA-Za-z])|\bSection\s+{re.escape(str(section))}\s+of\s+title\s+{re.escape(str(tn))}\b)'
    elif id.startswith('consumer-'):
        n=id.split('-')[-1];pat=rf'(?:RLCC|Consumer Restatement|Restatement(?: of(?: the Law,)? Consumer Contracts)?)\s*§{{1,2}}\s*{n}(?!\d)'
    elif id.startswith('frcp-') and id[5:] not in ['71A','forms']:
        n=re.escape(id[5:]); pat=rf'(?:FRCP|Fed\.?\s*R\.?\s*Civ\.?\s*P\.?|Federal Rule(?: of Civil Procedure)?|Rule)\s*{n}(?![\d.])'
    elif id.startswith('restatement-'):
        n=id.split('-')[-1]; pat=rf'Restatement(?: \(Second\))?(?: of(?: the Law,)? Contracts)?\s*(?:§{{1,2}}|Sections?)\s*{n}(?!\d)'
    elif id.startswith('ucc-') and id[4:][0].isdigit():
        n=re.escape(id[4:]); pat=rf'(?:UCC|U\.C\.C\.)\s*(?:§\s*)?{n}(?!\d)'
    elif id.startswith('const-art-'):
        n=int(id.split('-')[-1]); r=roman(n); pat=rf'\b(?:Article|Art\.?)\s*{r}(?![A-Za-z0-9])'
    elif id.startswith('const-amend-'):
        n=int(id.split('-')[-1]); words=['First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth','Eleventh','Twelfth','Thirteenth','Fourteenth','Fifteenth','Sixteenth','Seventeenth','Eighteenth','Nineteenth','Twentieth','Twenty.first','Twenty.second','Twenty.third','Twenty.fourth','Twenty.fifth','Twenty.sixth','Twenty.seventh']; pat=rf'(?:{words[n-1]} Amendment|Amendment\s*{roman(n)}(?![IVX])|Amendment\s*{n}(?!\d))'
    else: return None
    return re.compile(pat,re.I)

STATE_NAMES='Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming'
STATE_CONSTITUTION=re.compile(rf'\bof\s+(?:the\s+)?(?:State\s+of\s+)?(?:{STATE_NAMES}|a\s+state|state)(?:[’\']s)?\s+(?:State\s+)?Constitution\b',re.I)

def citation_matches(e,pattern,text):
    matches=list(pattern.finditer(text))
    if e['id'].startswith('const-art-'):
        # An expressly identified state constitution is a different source.
        matches=[m for m in matches if not STATE_CONSTITUTION.search(re.split(r'[.!?;]',text[m.end():m.end()+140],maxsplit=1)[0])]
    return matches

# Direct citation matching is every pattern against every atlas text: about
# 700,000 regular-expression searches. The patterns are independent, so they
# are shared out among worker processes. The result is exactly the serial
# result; DKLA_SERIAL_LINKS=1 forces the one-process path for comparison.
_MATCH={}
def _match_init(slim,text_by_id):
    _MATCH.update(text=text_by_id,folded={id:text.casefold() for id,text in text_by_id.items()},patterns=[(e,p) for e in slim if (p:=citation_pattern(e)) is not None])

def _match_chunk(jobs):
    text,folded,out=_MATCH['text'],_MATCH['folded'],[]
    for index,candidates in jobs:
        e,pattern=_MATCH['patterns'][index]
        candidate=e.get('section','').casefold() if e['collection']=='uscode' else None
        ids=text if candidates is None else candidates
        out.append((index,sorted(id for id in ids if (candidate is None or candidate in folded[id]) and (bool(citation_matches(e,pattern,text[id])) if e['id'].startswith('const-art-') else pattern.search(text[id])))))
    return out

def direct_matches(entries,text_by_id,jobs):
    """For each (pattern index, candidate ids or None): the ids whose text cites that provision."""
    import os
    slim=[{k:e[k] for k in ('id','collection','titleNumber','section') if k in e} for e in entries]
    workers=min(8,os.cpu_count() or 1)
    if workers>1 and not os.environ.get('DKLA_SERIAL_LINKS'):
        chunks=[jobs[i::workers*4] for i in range(workers*4)]
        try:
            with concurrent.futures.ProcessPoolExecutor(max_workers=workers,initializer=_match_init,initargs=(slim,text_by_id)) as pool:
                return dict(pair for chunk in pool.map(_match_chunk,[c for c in chunks if c]) for pair in chunk)
        except (OSError,concurrent.futures.process.BrokenProcessPool):
            pass  # no worker processes available here: fall through to one process
    _match_init(slim,text_by_id)
    return dict(_match_chunk(jobs))

def link_entries(entries):
    nodes,graph=graph_records(); reverse={}; links=0
    # A citation means the atlas account mentions the provision, not that the
    # case interpreted every part of it. One-hop rule/concept links are context.
    patterns=[(e,p) for e in entries if (p:=citation_pattern(e)) is not None]
    by_id={n['id']:n for n in nodes}
    text_by_id={n['id']:' '.join(str(n.get(k,'')) for k in ['title','summary','notes','sources','sections','authorityReferenceText']) for n in nodes}
    folded={id:text.casefold() for id,text in text_by_id.items()}
    title_candidates={}
    for title in {str(e['titleNumber']) for e in entries if e['collection']=='uscode' and e.get('titleNumber')}:
        coarse=re.compile(rf'{re.escape(title)}\s*U\.?\s*S\.?\s*C\.?\s*(?:§{{1,2}}\s*|Section\s*)|\bSection\s+\S+\s+of\s+title\s+{re.escape(title)}\b',re.I)
        title_candidates[title]={id for id,text in text_by_id.items() if coarse.search(text)}
    found=direct_matches(entries,text_by_id,[(index,None if e['collection']!='uscode' else sorted(title_candidates.get(str(e.get('titleNumber')),set()))) for index,(e,pattern) in enumerate(patterns)])
    for index,(e,pattern) in enumerate(patterns):
        # A USC section's literal identifier must occur in a valid regex match.
        # This cheap necessary condition avoids scanning the entire brief corpus
        # hundreds of times for sections never cited by this course collection.
        candidate=e.get('section','').casefold() if e['collection']=='uscode' else None
        matched=set(found[index])
        direct=set(matched)
        # One hop from an explicitly cited rule/concept to a case keeps citations useful
        # while avoiding the transitive explosion of linking every constitutional case.
        rule_ids={i for i in matched if by_id[i].get('kind') in ['Rule','Concept']}
        for edge in graph.get('edges',[]):
            a=edge.get('source'); b=edge.get('target')
            if isinstance(a,dict): a=a.get('id')
            if isinstance(b,dict): b=b.get('id')
            if a in rule_ids and b in by_id and by_id[b].get('kind')=='Case': matched.add(b)
            elif b in rule_ids and a in by_id and by_id[a].get('kind')=='Case': matched.add(a)
        e['links']=[dict(id=i,title=by_id[i]['title'],kind=by_id[i]['kind'],basis='Explicit citation in atlas entry' if i in direct else 'Case connected to cited atlas rule or concept') for i in sorted(matched,key=lambda i:(by_id[i].get('kind')!='Case',by_id[i]['title'],i))]
        for i in matched: reverse.setdefault(i,[]).append(e['id'])
        links+=len(matched)
    return reverse,links

def check_citation_patterns():
    for num in range(1,8):
        numeral=roman(num)
        p=citation_pattern(dict(id='const-art-'+str(num),collection='constitution'))
        for form in ['Article '+numeral, 'Art. '+numeral, 'Art '+numeral]:
            assert p.search(form),form
        for form in ['Part '+numeral, 'part '+numeral+'.B', 'counterpart '+numeral, 'Article '+numeral+'X']:
            assert not p.search(form),form
        e=dict(id='const-art-'+str(num),collection='constitution')
        assert not citation_matches(e,p,'Article '+numeral+', Section 9 of the Pennsylvania Constitution')
        assert not citation_matches(e,p,'Article '+numeral+' of the New York Constitution')
        assert citation_matches(e,p,'Article '+numeral+' of the United States Constitution')

def link_change_audit(d,old,before_text):
    links=sum(len(e['links']) for e in d['entries'])
    nodes,_=graph_records()
    texts={n['id']:' '.join(str(n.get(k,'')) for k in ['title','summary','notes','sources','sections','authorityReferenceText']) for n in nodes}
    article_reviews=[]
    for e in d['entries']:
        if not e['id'].startswith('const-art-'):continue
        pattern=citation_pattern(e)
        old_pattern=re.compile(pattern.pattern.removeprefix(r'\b'),re.I)
        now={l['id']:l for l in e['links']}
        removed=[];changed=[];retained=[]
        for link in old[e['id']]:
            text=texts[link['id']]
            if link['id'] not in now:
                state_reference=bool(pattern.search(text)) and not citation_matches(e,pattern,text)
                reason='Citation expressly identifies a state constitution' if state_reference else 'Opinion Part heading failed the provision word boundary' if link['basis'].startswith('Explicit citation') else 'Context no longer has a valid article citation anchor'
                removed.append(dict(**link,matchExamples=[text[max(0,m.start()-70):min(len(text),m.end()+100)] for m in list(old_pattern.finditer(text))[:3]],reason=reason))
            elif now[link['id']]['basis']!=link['basis']:
                changed.append(dict(id=link['id'],before=link['basis'],after=now[link['id']]['basis']))
        for link in e['links']:
            if not link['basis'].startswith('Explicit citation'):continue
            text=texts[link['id']]
            retained.append(dict(**link,matchExamples=[text[max(0,m.start()-70):min(len(text),m.end()+130)] for m in citation_matches(e,pattern,text)[:4]],atlasAccountSha256=sha(text.encode())))
        article_reviews.append(dict(id=e['id'],before=len(old[e['id']]),after=len(e['links']),removed=removed,basisChanged=changed,retainedCitationTargets=retained))
    all_links=[l for e in d['entries'] for l in e['links']]
    audit=dict(schema=1,checked=DATE,scope='Mechanical citation-boundary correction and complete Article I–VII target inventory; no fresh full-opinion legal merits review.',matcherBefore=r'(?:Article|Art\.?)',matcherAfter=r'\b(?:Article|Art\.?)',automaticRibbonPolicy='Only Case links whose basis starts Explicit citation. Rule/Concept one-hop links are contextual discovery, not default authority-to-case ribbons.',preservedAuthorityRecordsSha256=before_text,provisionCount=len(d['entries']),beforeLinks=sum(len(v) for v in old.values()),afterLinks=links,explicitCaseLinks=sum(l['kind']=='Case' and l['basis'].startswith('Explicit citation') for l in all_links),contextCaseLinks=sum(l['kind']=='Case' and not l['basis'].startswith('Explicit citation') for l in all_links),articleReviews=article_reviews,limitations=['A mention is a citation-discovery relation; it does not mean the case interpreted every subsection.', 'General Rule/Concept graph neighbors remain context and are excluded from automatic ribbons.', 'The existing link collector reads baseline graph edges; runtime-added rule edges are not silently imported by this correction.'])
    return audit

def relink():
    """Rebuild citation links offline without re-extracting any authority text."""
    d=json.loads(DATA.read_text(encoding='utf8'))
    old={e['id']:list(e.get('links',[])) for e in d['entries']}
    preserved={k:v for k,v in d.items() if k not in ['entries','byNode','audit']}
    preserved_entries=[{k:v for k,v in e.items() if k!='links'} for e in d['entries']]
    before_text=sha(json.dumps(preserved_entries,ensure_ascii=False,sort_keys=True).encode())
    d['byNode'],links=link_entries(d['entries']); d['audit']['links']=links
    assert preserved=={k:v for k,v in d.items() if k not in ['entries','byNode','audit']}
    assert preserved_entries==[{k:v for k,v in e.items() if k!='links'} for e in d['entries']]
    audit=link_change_audit(d,old,before_text)
    DATA.write_text(json.dumps(d,ensure_ascii=False,indent=1)+'\n',encoding='utf8',newline='\n')
    (HERE/'authority-links-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=1)+'\n',encoding='utf8',newline='\n')
    check(d)

def refresh():
    a,src=constitution(); b,s=frcp(); src+=s; c,s,fixes=selections(); src+=s
    d,s=consumer(); src+=s; u,s=ucc_articles(); src+=s
    entries=a+b+c+d+u
    uscode=HERE/'uscode.json'
    if uscode.exists():
        code=json.loads(uscode.read_text(encoding='utf8'));entries+=code['entries'];src+=code.get('sources',[])
        if not any(e['id']=='usc-3-301' for e in entries):
            # This assigned atlas citation uses "Section 301 of title 3", so
            # the older citation-only collector missed it. Reuse its pinned
            # official extraction without changing the collector-owned dataset.
            import uscode_build as usc
            from collections import defaultdict
            xml,source=usc.title_xml(3)
            more,missing=usc.section_entries(3,xml,source,{'301'},defaultdict(set))
            assert not missing and len(more)==1
            for e in more:e.pop('relatedCitations',None)
            entries+=more;src.append(source)
    for e in entries:
        e['textSha256']=sha(json.dumps(e['lines'],ensure_ascii=False).encode())
    reverse,links=link_entries(entries)
    collections=[dict(id='constitution',title='U.S. Constitution',course=2,description='Preamble, all seven articles and all twenty-seven amendments. Original article text is preserved; later amendments remain visible beside it.'),dict(id='frcp',title='Federal Rules of Civil Procedure',course=1,description='Rules 1–87, decimal-numbered rules, and abrogated or renumbered slots. Effective December 1, 2025; amendments scheduled for December 2026 are not yet in force.'),dict(id='ucc',title='Uniform Commercial Code',course=0,description='Assigned Article 1 and Article 2 black letter, with the other assigned UCC sections. Model language: the applicable state enactment controls.'),dict(id='restatement',title='Restatement (Second) of Contracts',course=0,description='Sections 1–385, black letter from the assigned Contracts Selections. Persuasive restatement of common law; it is not a legislature’s enacted code.'),dict(id='consumer',title='Restatement of Consumer Contracts',course=0,description='Assigned 2024 black-letter provisions, kept separate from the Restatement (Second). Comments remain in the source volume.')]
    collections.extend([dict(id='ucc-articles',title='UCC articles directory',course=0,description='All UCC articles, including Article 12 from the 2022 amendments. Article 6 repeal and state enactment differences remain visible.'),dict(id='admiralty',title='Supplemental Admiralty Rules',course=1,description='Rules A–G for admiralty, maritime claims and asset forfeiture, from the current FRCP collection.'),dict(id='social-security',title='Supplemental Social Security Rules',course=1,description='Rules 1–8 for review under 42 U.S.C. § 405(g), from the current FRCP collection.')])
    if uscode.exists(): collections.append(dict(id='uscode',title='United States Code',course=1,description=code.get('description',code.get('collections',[{}])[0].get('description','Ordered Title 28 and course-relevant provisions from other titles, with official source currency and retained historical slots.'))))
    d=dict(schema=1,checked=DATE,collections=collections,entries=entries,byNode=reverse,sources=src,audit=dict(method='Official edition and collection coverage; deterministic extraction of source black letter; explicit atlas citations and direct graph relationships. No fabricated links or missing text substitutes.',sourceIndexCorrections=[dict(section=n,title=t,page=p,reason='The inherited index picked an earlier comment cross-reference instead of the actual numbered heading.') for n,(t,p) in fixes.items()],links=links))
    DATA.write_text(json.dumps(d,ensure_ascii=False,indent=1)+'\n',encoding='utf8',newline='\n')
    check(d)

def check(d=None):
    check_citation_patterns()
    d=d or json.loads(DATA.read_text(encoding='utf8')); entries=d['entries']; ids=[e['id'] for e in entries]
    assert len(ids)==len(set(ids))
    assert {'const-art-'+str(n) for n in range(1,8)}<=set(ids)
    assert {'const-amend-'+str(n) for n in range(1,28)}<=set(ids)
    assert {'restatement-'+str(n) for n in range(1,386)}<=set(ids)
    assert {'frcp-'+str(n) for n in range(1,88)}<=set(ids)
    assert {'frcp-4.1','frcp-5.1','frcp-5.2','frcp-7.1','frcp-16.1','frcp-23.1','frcp-23.2','frcp-44.1','frcp-62.1','frcp-65.1','frcp-71.1'}<=set(ids)
    assert {'admiralty-'+letter for letter in 'ABCDEFG'}<=set(ids)
    assert {'social-security-'+str(n) for n in range(1,9)}<=set(ids)
    assert {'consumer-'+str(n) for n in range(1,11)}<=set(ids)
    assert sum(e['id'].startswith('ucc-2-') for e in entries)==104
    nodes,_=graph_records(); known={n['id'] for n in nodes}; by={e['id']:e for e in entries}
    for e in entries:
        assert e['lines'] and all(len(l)>1 and l[1].strip() for l in e['lines']),e['id']
        assert all(l['id'] in known for l in e['links']),e['id']
        for l in e['links']: assert e['id'] in d['byNode'][l['id']]
        assert e['source'].get('url') or e['source'].get('file'),e['id']
        assert sha(json.dumps(e['lines'],ensure_ascii=False).encode())==e['textSha256'],e['id']
    for n in [74,75,76,84]: assert by['frcp-'+str(n)]['status']=='abrogated'
    assert by['const-amend-18']['status']=='repealed'
    assert 'initial management conference' in ' '.join(l[1] for l in by['frcp-16.1']['lines']).lower()
    assert 'entitle' in ' '.join(l[1] for l in by['restatement-375']['lines']).lower() or 'not barred' in ' '.join(l[1] for l in by['restatement-375']['lines']).lower()
    assert 'This section is deleted in the 2003' not in ' '.join(l[1] for l in by['ucc-2-209']['lines'])
    assert 'Now § 9–109' not in ' '.join(l[1] for l in by['restatement-344']['lines'])
    for id in ['ucc-1-201','ucc-2-103']:
        assert by[id].get('annotations') and '2021 assigned Selections' in by[id]['annotations'][0]['title']
    if 'usc-3-301' in by:
        assert any(l['id']=='lrs-o-ministerial-duties' for l in by['usc-3-301']['links'])
    assert not any(l['id']=='cp-afa' and l['basis'].startswith('Explicit citation') for l in by['const-art-2']['links'])
    assert not any(l['id']=='cp-asahi' and l['basis'].startswith('Explicit citation') for l in by['const-art-1']['links'])
    assert not any(l['id']=='cosby' for l in by['const-art-1']['links'])
    for authority,case in [('const-art-1','lrs-s-chadha'),('const-art-2','lrs-s-myers'),('const-art-3','cp-gibbs'),('const-art-4','cp-wyman')]:
        assert any(l['id']==case and l['basis'].startswith('Explicit citation') for l in by[authority]['links']), (authority,case)
    assert all(not l['basis'].startswith('Explicit citation') for l in by['ucc-2-207']['links'] if l['id']=='lrs-k-rucho')
    expected=json.loads(json.dumps(entries)); reverse,_=link_entries(expected)
    assert all(a['links']==b['links'] for a,b in zip(entries,expected)), 'Citation links are stale; run --relink.'
    assert d['byNode']==reverse, 'Reciprocal citation links are stale; run --relink.'
    print(json.dumps(dict(entries=len(entries),collections={c['id']:sum(e['collection']==c['id'] for e in entries) for c in d['collections']},links=sum(len(e['links']) for e in entries),sourceIndexCorrections=len(d['audit']['sourceIndexCorrections']))))

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__); mode=ap.add_mutually_exclusive_group(); mode.add_argument('--refresh',action='store_true'); mode.add_argument('--relink',action='store_true'); mode.add_argument('--check',action='store_true'); args=ap.parse_args()
    if args.refresh: refresh()
    elif args.relink: relink()
    else: check()
