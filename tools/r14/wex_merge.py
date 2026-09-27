"""Parse the Cornell Wex compilation PDF text (wex_pages.json) into entries and merge them into
added-sources/glossary/glossary.json: Wex text replaces every other source for the same term, new Wex
terms are added, and the LII URL comes from the PDF's own link annotations where present."""
import json, re, sys, collections, unicodedata
import os; SC=os.environ.get('DKLA_SCRATCH', os.path.dirname(os.path.abspath(__file__)))+'/'
pages=json.load(open(SC+'wex_pages.json'))
HDR=re.compile(r'^CORNELL LII WEX\s*$|^Dictionary compilation\s*$|^26 September 2026\s*$|^\d{1,4}\s*$')
lines=[]  # (page, line)
for p in pages[2:]:  # pages 1-2 are the cover and the 404 register
    for ln in p['text'].split('\n'):
        s=ln.strip()
        if not s or HDR.match(s): continue
        lines.append((p['n'],s))
# entries: a heading line immediately followed by "Source on Cornell Wex" (or an unavailable notice)
entries=[]; i=0; N=len(lines)
UNAV=re.compile(r'^(Source page unavailable|Cornell returned HTTP 404|Definition text could not be retrieved)',re.I)
while i<N:
    pg,s=lines[i]
    if i+1<N and lines[i+1][1]=='Source on Cornell Wex':
        term=s; j=i+2; body=[]
        while j<N and not (j+1<N and lines[j+1][1]=='Source on Cornell Wex'):
            body.append(lines[j][1]); j+=1
        entries.append({'term':term,'page':pg,'body':body}); i=j
    else: i+=1
print('entries parsed',len(entries))
# URLs: the PDF's own link annotations, matched to headings by an alphanumeric key (Wex slugs keep parentheses and periods);
# a heading that wrapped onto two lines is recognised when the previous line plus the heading matches a link
key=lambda s: re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower())
urls_by_page=collections.defaultdict(dict)
for p in pages:
    for l in p['links']:
        u=l['uri']
        if 'law.cornell.edu/wex/' in u:
            slug=u.rstrip('/').split('/wex/')[-1].split('#')[0]
            urls_by_page[p['n']].setdefault(key(slug),'https://www.law.cornell.edu/wex/'+slug)
matched=wrapped=0
for idx,e in enumerate(entries):
    us=urls_by_page.get(e['page'],{})
    if key(e['term']) in us: e['url']=us[key(e['term'])]; matched+=1; continue
    pb=entries[idx-1]['body'] if idx else []
    for k in (1,2,3):  # headings that wrapped onto two, three or four lines
        if len(pb)>=k and key(''.join(pb[-k:])+e['term']) in us:
            e['url']=us[key(''.join(pb[-k:])+e['term'])]; e['term']=' '.join(pb[-k:]+[e['term']]); del pb[-k:]; matched+=1; wrapped+=1; break
print('urls matched',matched,'of',len(entries),'| wrapped headings repaired',wrapped)
def clean(body):
    txt=[]
    for s in body:
        if re.match(r'^\[Last (reviewed|updated).*\]$',s,re.I): continue
        if re.match(r'^(See also|see also):?$',s): continue
        txt.append(s)
    t=' '.join(txt)
    t=re.sub(r'\[Last (reviewed|updated)[^\]]*\]','',t,flags=re.I)
    t=re.sub(r'(\w)- (\w)',r'\1\2',t)  # PDF line-break hyphens
    t=re.sub(r'\s+',' ',t).strip()
    # cut the trailing "See also / Categories / Keywords" furniture and cap the length at a paragraph boundary
    t=re.split(r'\s(?:See also|Categories?|Keywords|wex definitions|Wex Definitions Team):',t)[0].strip()
    return t
wex=[]; unavailable=0
for e in entries:
    d=clean(e['body'])
    if not d or UNAV.search(d[:120]) or len(d)<40: unavailable+=1; continue
    if len(d)>2200: d=d[:2200].rsplit('. ',1)[0]+'.'
    slug=(e.get('url') or '').rstrip('/').split('/wex/')[-1] if e.get('url') else re.sub(r'[^a-z0-9]+','_',unicodedata.normalize('NFKD',e['term']).encode('ascii','ignore').decode().lower()).strip('_')
    wex.append({'term':e['term'],'slug':slug,'definition':d,'source':'LII Wex','url':e.get('url') or 'https://www.law.cornell.edu/wex/'+slug,'liiVerified':True,'urlVerified':bool(e.get('url'))})
print('wex definitions',len(wex),'unavailable/empty',unavailable)
G=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','added-sources','glossary','glossary.json'),encoding='utf-8'))
norm=lambda s: re.sub(r'\s+',' ',re.sub(r"[^a-z0-9' ]+",' ',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower())).strip()
old={norm(t['term']):t for t in G['terms']}
replaced=added=0; seen=set(); out=[]
for w in wex:
    k=norm(w['term'])
    if k in seen: continue
    seen.add(k)
    if k in old: replaced+=1
    else: added+=1
    out.append(w)
for t in G['terms']:
    if norm(t['term']) not in seen: out.append(t); seen.add(norm(t['term']))
out.sort(key=lambda t: t['term'].lower())
G['terms']=out; G['built']='2026-09-27'; G['source']=(G.get('source') or '')+' | Cornell LII Wex full compilation (added-sources/Cornell_Wex_Dictionary_2026-09-26.pdf, 26 Sept 2026) merged 27 Sept 2026'
json.dump(G,open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','added-sources','glossary','glossary.json'),'w',encoding='utf-8'),ensure_ascii=False)
print('replaced',replaced,'added',added,'total',len(out))
print(collections.Counter(t.get('source','') for t in out).most_common(9))
for w in wex[:2]+wex[len(wex)//2:len(wex)//2+1]: print(json.dumps(w)[:300])
