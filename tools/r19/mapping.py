import json,re,collections,difflib,sys
from pathlib import Path
B=Path('/Users/danielkind/Library/Application Support/Claude/scratch-workspaces/1dad17eb-69bf-4c4a-a7c5-9328a5b48003/688c5249-9c51-4fa9-8ad1-650000abd32e/scratch-2026-10-03-51507e/blocks')
d=json.load(open(B/'seedData.json')); M=d['studyMap']; homes=M['homes']; regs={r['id']:r for r in M['regions']}
CO=['Contracts','Civil Procedure','Legislation and the Regulatory State']
def ncourse(n):
    h=homes.get(n['id']); r=h and regs.get(h['region']); c=(r or {}).get('courseKey')
    return c if c in CO else (n.get('courses') or ['?'])[0]
cases=[n for n in d['nodes'] if n['kind']=='Case']
meta=json.load(open('snap/meta.json'))['entries']
STOP=set('the of and inc co corp corporation company ltd llc lp na sa ag plc association assn assoc national united states america american v vs in re ex rel et al city county state department dept board commission no'.split())
def norm(t):
    t=re.sub(r'\(.*?\)','',t.lower()); t=t.replace('&',' and '); t=re.sub(r"[’']s\b",'',t); t=re.sub(r'[^a-z0-9 ]+',' ',t)
    return [w for w in t.split() if w not in STOP]
def sides(t):
    parts=re.split(r'\s+v\.?s?\.?\s+',re.sub(r'\(.*?\)','',t),maxsplit=1,flags=re.I)
    return [norm(p) for p in parts]
def score(a,b):
    A,Bs=sides(a),sides(b)
    if len(A)==2 and len(Bs)==2 and A[0] and A[1] and Bs[0] and Bs[1]:
        s1=len(set(A[0])&set(Bs[0]))/max(1,min(len(set(A[0])),len(set(Bs[0])))); s2=len(set(A[1])&set(Bs[1]))/max(1,min(len(set(A[1])),len(set(Bs[1]))))
        f1=A[0][0]==Bs[0][0]; f2=A[1][0]==Bs[1][0]
        return (s1+s2)/2*(1 if (f1 or s1==1) and (f2 or s2==1) else .6)
    x,y=set(norm(a)),set(norm(b)); return len(x&y)/max(1,min(len(x),len(y)))*.8 if x and y else 0
bycourse=collections.defaultdict(list)
for m in meta: bycourse[m['course']].append(m)
out={}; unmatched=[]; weak=[]
for n in cases:
    c=ncourse(n); best=[]
    # direct ATLAS ids
    for m in bycourse[c]:
        if 'ATLAS' in m['id'] and m['id'].split('ATLAS-',1)[1].lower()==re.sub(r'^(lrs|cp|ct)-','',n['id']).lower(): best.append((2.0,m))
    for m in bycourse[c]:
        s=max(score(n['title'],m['title']),score(n.get('shortTitle') or n['title'],m['title'])*.95)
        if s>=.6: best.append((s,m))
    best.sort(key=lambda x:-x[0])
    if not best: unmatched.append((n['id'],n['title'],c)); continue
    top=best[0][0]; picks=[m for s,m in best if s>=max(.85,top-.05)] or [best[0][1]]
    seen=set(); picks=[p for p in picks if not (p['id'] in seen or seen.add(p['id']))]
    out[n['id']]=[p['id'] for p in picks]
    if top<.85: weak.append((n['id'],n['title'],[(round(s,2),m['id'],m['title']) for s,m in best[:2]]))
used=collections.Counter(i for v in out.values() for i in v)
print('atlas cases',len(cases),'matched',len(out),'unmatched',len(unmatched),'weak',len(weak),'multi',sum(len(v)>1 for v in out.values()),'codex used',len(used),'codex shared',sum(v>1 for v in used.values()))
print('UNMATCHED'); [print(' ',u) for u in unmatched]
print('WEAK'); [print(' ',w) for w in weak]
print('MULTI'); [print(' ',k,ncase['title'] if False else '',v) for k,v in out.items() if len(v)>1][:0]
t={m['id']:m['title'] for m in meta}; nt={n['id']:n['title'] for n in cases}
for k,v in out.items():
    if len(v)>1: print(' ',k,'|',nt[k],'=>',[(i,t[i]) for i in v])
print('SHARED'); [print(' ',i,t[i],[k for k,v in out.items() if i in v]) for i,c in used.items() if c>1]
json.dump(out,open('snap/map_auto.json','w'),indent=0)
