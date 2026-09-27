"""Retrieve archival PDFs by exact U.S. Reports citation, then court-issued opinion links.
Never typeset the atlas's extracted opinion text as a substitute original.
"""
import concurrent.futures, hashlib, json, re, subprocess, threading
from pathlib import Path
from urllib.parse import urljoin
import requests, fitz
from bs4 import BeautifulSoup
from rapidfuzz.fuzz import token_set_ratio
ROOT=Path('.'); OUT=ROOT/'added-sources'/'opinion-pdfs'; OUT.mkdir(parents=True,exist_ok=True)
html=subprocess.check_output(['git','show','87363c6842be18abbf7dd40112b93e90a7a9172f:DKLA-r16.html']).decode()
index=json.loads(re.search(r'<script[^>]*id="sourceIndex"[^>]*>(.*?)</script>',html,re.S)[1])
seed=json.loads(re.search(r'<script[^>]*id="seedData"[^>]*>(.*?)</script>',html,re.S)[1])
nodes={n['id']:n for n in seed['nodes']}; results={}; lock=threading.Lock(); listings={}
S=requests.Session(); S.headers['User-Agent']='DKLA archival source verification / educational reference'
def get(url):
 r=S.get(url,timeout=35);r.raise_for_status();return r

def norm(t): return re.sub(r'[^a-z0-9]+',' ',t.lower()).strip()
def significant(title):
 t=re.sub(r'\([^)]*\)','',title.lower());return [w for w in re.findall(r'[a-z]+',t) if len(w)>3 and w not in {'united','states','department','national','commissioner','commission','incorporated','case','corporation','board','association','company','circuit','appeals','court','district','local','american','university','federal','administration'}]

def valid_pdf(raw,item):
 if not raw.startswith(b'%PDF'):return None
 doc=fitz.open(stream=raw,filetype='pdf')
 text=' '.join(doc[i].get_text() for i in range(min(len(doc),5)));n=norm(text)
 words=significant(item['title']); hits=[w for w in words if w in n]
 if not hits:return None
 # An official PDF must name a distinctive party; where there are two, require both.
 if len(set(words))>=2 and len(set(hits))<min(2,len(set(words))):return None
 return {'pages':len(doc),'verified_party_words':sorted(set(hits)),'first_page_text':doc[0].get_text()[:1800]}

for year in sorted({int(re.findall(r'\((\d{4})\)',o['citation'])[-1]) for o in index['opinions'] if 'U.S.' in o['citation'] and int(re.findall(r'\((\d{4})\)',o['citation'])[-1])>=2014}):
 links=[]
 for term in [year-1,year]:
  try:
   page='https://www.supremecourt.gov/opinions/slipopinion/'+str(term)
   soup=BeautifulSoup(get(page).text,'html.parser')
   for a in soup.select('a[href]'):
    href=urljoin(page,a['href']); label=a.get_text(' ',strip=True)
    if '.pdf' in href.lower() and '/opinions/' in href and label:links.append((label,href,page))
  except Exception as e:print('LISTING',year,term,type(e).__name__,flush=True)
 listings[year]=links

def work(item):
 citation=item['citation']; m=re.search(r'(\d+) U\.S\.\s*(?:\([^)]*\)\s*)?(\d+)',citation)
 out={'id':item['id'],'title':item['title'],'citation':citation,'original_text_path':item['file'],'status':'assigned-PDF-route'}
 if not m:return out
 vol,page=map(int,m.groups()); slug=f'usrep{vol:03d}{page:03d}'
 candidates=[('https://tile.loc.gov/storage-services/service/ll/usrep/'+f'usrep{vol:03d}/'+slug+'/'+slug+'.pdf','https://www.loc.gov/item/'+slug+'/','Library of Congress · U.S. Reports')]
 year=int(re.findall(r'\((\d{4})\)',citation)[-1])
 ranked=[]
 title=re.sub(r'\([^)]*\)','',item['title'])
 for label,url,listing in listings.get(year,[]):
  score=token_set_ratio(norm(title),norm(label))
  if score>=72:ranked.append((score,url,listing,label))
 for score,url,listing,label in sorted(ranked,reverse=True)[:3]:candidates.append((url,listing,'Supreme Court · original opinion'))
 # Explicit, court-published per-curiam opinion when absent from the slip table.
 if item['id']=='lrs-o-calcutt':candidates.insert(0,('https://www.supremecourt.gov/opinions/22pdf/22-714_4315.pdf','https://www.supremecourt.gov/opinions/slipopinion/22','Supreme Court · original opinion'))
 for url,source,publisher in candidates:
  try:
   raw=get(url).content;check=valid_pdf(raw,item)
   if not check:continue
   path=OUT/(item['id']+'.pdf');path.write_bytes(raw)
   out.update(check);out.update({'status':'original-pdf','path':str(path),'page':1,'url':url,'source_url':source,'publisher':publisher,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)});break
  except Exception:continue
 return out
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for result in pool.map(work,index['opinions']):
  results[result['original_text_path']]=result;print(result['id'],result['status'],flush=True)
Path('r17/opinion-pdf-catalog.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print('ORIGINAL PDFS',sum(r['status']=='original-pdf' for r in results.values()),'OF',len(results),flush=True)
