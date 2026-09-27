"""Read-only source collection. Never rewrite the atlas's legal content."""
import re,json,time,os,concurrent.futures,hashlib,unicodedata
from pathlib import Path
from datetime import datetime,timezone
from collections import defaultdict
from difflib import SequenceMatcher
import requests
from rapidfuzz.fuzz import ratio,token_set_ratio
OUT=Path('output'); OUT.mkdir(exist_ok=True)
RAW=OUT/'oyez';RAW.mkdir(exist_ok=True)
H=Path('DKLA-r8.html').read_text();G=json.loads(re.search(r'<script[^>]*id="seedData"[^>]*>(.*?)</script>',H,re.S)[1])
def get(url):
 for attempt in range(3):
  try:
   r=requests.get(url,timeout=45,headers={'User-Agent':'DKLA-SCOTUS-history/1.0 educational source-linked atlas'});r.raise_for_status();return r.json()
  except Exception as e:
   if attempt==2:return {'_error':str(e),'url':url}
   time.sleep(1+attempt)
def norm(s):
 s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower().replace('&',' and ')
 s=re.sub(r'\([^)]*\)',' ',s);s=re.sub(r'\b(united states)\b','us',s);s=re.sub(r'\bu[. ]s[.]?\b','us',s)
 for a,b in [('company','co'),('corporation','corp'),('incorporated','inc'),('association','assn'),('associations','assns'),('department','dept'),('national','natl'),('international','intl'),('commission','commn')]:s=re.sub(r'\b'+a+r'\b',b,s)
 return re.sub(r'[^a-z0-9]+',' ',s).strip()
# Index response is bounded; only a few index pages, not one search per case.
idx=[]
for batch in range(0,36,4):
 urls=['https://api.oyez.org/cases?per_page=1000&page='+str(p) for p in range(batch,batch+4)]
 results=list(concurrent.futures.ThreadPoolExecutor(4).map(get,urls));done=False
 for p,rows in zip(range(batch,batch+4),results):
  if isinstance(rows,list):
   print('INDEX',p,len(rows),flush=True);idx.extend(rows)
   if len(rows)<1000:done=True
  else: print('INDEX ERROR',rows,flush=True);done=True
 if done:break
idx=list({x['href']:x for x in idx if isinstance(x,dict) and x.get('href')}.values())
(OUT/'oyez-index.json').write_text(json.dumps(idx))
byname=defaultdict(list);bycit=defaultdict(list)
for x in idx:
 x['_name']=norm(x['name']);byname[x['_name']].append(x)
 c=x.get('citation') or {}
 if c.get('volume') and c.get('page'):bycit[(str(c['volume']),str(c['page']))].append(x)
matched=[];review=[]
for n in G['nodes']:
 if n.get('kind')!='Case' and not re.search(r'\bv\.\s',n.get('title','')):continue
 title=n['title'];name=norm(title.split(';')[0]);years=re.findall(r'\((1[789]\d{2}|20\d{2})\)',title);yr=int(years[-1]) if years else None
 direct=[]
 for s in n.get('sources',[]):
  u=s.get('url','')
  m=re.search(r'(?:www\.)?oyez.org/cases/([^#?\s]+)',u)
  if m:direct.append('https://api.oyez.org/cases/'+m[1])
 own=' '.join(s.get('label','') for s in n.get('sources',[]) if 'full opinion' in s.get('label','').lower() or title.split(' (')[0].lower() in s.get('label','').lower())
 citations=re.findall(r'(\d+)\s+U\.?\s*S\.?\s+(\d+)',own)
 candidates=[]
 if direct:
  candidates=[(100,x,'explicit-source') for x in idx if x['href'] in direct]
 if not candidates and byname[name]:candidates=[(100,x,'exact-title') for x in byname[name]]
 if not candidates:
  for cit in citations:
   for x in bycit[cit]:
    sim=ratio(name,x['_name'])
    if sim>=60:candidates.append((100,x,'citation-and-title'))
 if not candidates:
  for x in idx:
   c=x.get('citation') or {};cy=int(c.get('year') or 0)
   if yr and cy and abs(cy-yr)>1:continue
   sim=ratio(name,x['_name']);token=token_set_ratio(name,x['_name'])
   if sim>=80 or (token>=98 and min(len(name),len(x['_name']))>22):candidates.append((round(sim,2),x,'title-candidate'))
 candidates.sort(key=lambda a:(a[0],-(abs(int((a[1].get('citation') or {}).get('year') or 0)-(yr or int((a[1].get('citation') or {}).get('year') or 0))))),reverse=True)
 clean=[]
 for score,x,how in candidates[:4]:clean.append({'score':score,'how':how,'name':x['name'],'href':x['href'],'citation':x.get('citation'),'year':(x.get('citation') or {}).get('year')})
 record={'node_id':n['id'],'title':title,'kind':n.get('kind'),'courses':n.get('courses',[]),'candidates':clean}
 if candidates and (candidates[0][2] in ['explicit-source','citation-and-title'] or candidates[0][0]>=93) and (not yr or not clean[0]['year'] or abs(int(clean[0]['year'])-yr)<=1):
  record['href']=candidates[0][1]['href'];record['match_method']=candidates[0][2];matched.append(record)
 else:review.append(record)
(OUT/'matches.json').write_text(json.dumps(matched,indent=2));(OUT/'review.json').write_text(json.dumps(review,indent=2))
urls=sorted({r['href'] for r in matched}|{r['candidates'][0]['href'] for r in review if r['candidates']})
def save(u):
 j=get(u);fn=u.split('/cases/')[-1].replace('/','__')+'.json';(RAW/fn).write_text(json.dumps(j));return (u,'_error' not in j,len(j.get('decisions') or []))
for result in concurrent.futures.ThreadPoolExecutor(8).map(save,urls):print('CASE',result,flush=True)
for name,url in {'official-service':'https://www.supremecourt.gov/about/members_text.aspx','current-members':'https://www.supremecourt.gov/about/biographies.aspx','seat-succession':'https://www.fjc.gov/history/courts/supreme-court-united-states-succession-chart'}.items():
 try:
  r=requests.get(url,timeout=40);r.raise_for_status();(OUT/(name+'.html')).write_text(r.text)
 except Exception as e:print('SOURCE',name,e)
print('SUMMARY',len(idx),'indexed;',len(matched),'matched;',len(review),'review;',len(urls),'case records',flush=True)
