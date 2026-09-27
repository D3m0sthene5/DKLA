"""Download named archival portraits; never synthesize or recolor faces."""
import os,json,re,time,hashlib,concurrent.futures,unicodedata
from pathlib import Path
from urllib.parse import urljoin,urlparse,unquote
from io import BytesIO
import requests
from bs4 import BeautifulSoup
from PIL import Image
OUT=Path('output');OUT.mkdir(exist_ok=True)
(OUT/'originals').mkdir(exist_ok=True)
HEAD={'User-Agent':'SCOTUSPortraitReference/1.0 (personal educational portrait index; respectful low-concurrency archival retrieval)'}
def get(u):
 r=requests.get(u,headers=HEAD,timeout=(12,40));r.raise_for_status();return r

def slug(t):return re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',t).encode('ascii','ignore').decode().lower()).strip('-')

def process(u):
 try:
  soup=BeautifulSoup(get(u).content,'html.parser')
  h=soup.find('h1');title=h.get_text(' ',strip=True) if h else ''
  ims=[]
  for im in soup.find_all('img'):
   alt=im.get('alt','');src=im.get('data-src') or im.get('src','')
   if not src:continue
   if 'justice' in alt.lower() and not any(s in alt.lower() for s in ['rosette','logo','society','court history']):
    variants=[urljoin(u,src)]
    for v in im.get('srcset','').split(','):
     if v.strip():variants.append(urljoin(u,v.strip().split()[0]))
    clean=re.sub(r'-\d+x\d+(?=\.[A-Za-z]+(?:\?|$))','',variants[0]);variants.append(clean)
    ims.append({'alt':alt,'variants':list(dict.fromkeys(variants))})
  out=[]
  for j,im in enumerate(ims):
   best=None
   for v in im['variants']:
    try:
     r=get(v);image=Image.open(BytesIO(r.content));image.load()
     if image.width<60 or image.height<60:continue
     if best is None or image.width*image.height>best[0]:best=(image.width*image.height,image,r.content,v,r.headers.get('content-type'))
    except Exception:pass
   if best:
    _,image,raw,v,mime=best
    sid=slug(title or im['alt'])+('-'+str(j) if j else '')
    ext={'JPEG':'.jpg','PNG':'.png','WEBP':'.webp','GIF':'.gif'}.get(image.format,'.jpg')
    path='originals/'+sid+ext;(OUT/path).write_bytes(raw)
    out.append({'source_page':u,'source_title':title,'alt':im['alt'],'image_url':v,'file':path,'width':image.width,'height':image.height,'sha256':hashlib.sha256(raw).hexdigest(),'provider':'Supreme Court Historical Society'})
  print('FETCH',title,len(out),flush=True)
  return out
 except Exception as e:print('ERROR',u,str(e),flush=True);return [{'source_page':u,'error':str(e)}]

links=set()
for root in ['https://supremecourthistory.org/chief-justices/','https://supremecourthistory.org/associate-justices/']:
 soup=BeautifulSoup(get(root).content,'html.parser')
 for a in soup.find_all('a',href=True):
  u=urljoin(root,a['href']).split('#')[0]
  if re.search(r'/(?:chief|associate)-justices/[^/?]+/?$',u):links.add(u)
print('BIOGRAPHY PAGES',len(links),flush=True)
records=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
 for part in ex.map(process,sorted(links)):records.extend(part)
# The Court itself supplies current and retired members' genuine color portraits.
u='https://www.supremecourt.gov/about/biographies.aspx'
soup=BeautifulSoup(get(u).content,'html.parser')
for im in soup.find_all('img'):
 alt=im.get('alt','');src=im.get('src','')
 if 'Justice' not in alt or not src:continue
 try:
  v=urljoin(u,src);r=get(v);image=Image.open(BytesIO(r.content));image.load()
  path='originals/official-'+slug(alt)+('.png' if image.format=='PNG' else '.jpg');(OUT/path).write_bytes(r.content)
  records.append({'source_page':u,'source_title':alt,'alt':alt,'image_url':v,'file':path,'width':image.width,'height':image.height,'sha256':hashlib.sha256(r.content).hexdigest(),'provider':'Supreme Court of the United States','preferred_color_photo':True})
  print('OFFICIAL',alt,image.size,flush=True)
 except Exception as e:print('OFFICIAL ERROR',alt,str(e),flush=True)
# Transfer the verified roster page along with archival image metadata.
try:
 u='https://www.fjc.gov/history/courts/supreme-court-united-states-justices';r=get(u)
 (OUT/'fjc-roster.html').write_bytes(r.content)
except Exception as e:print('FJC ERROR',str(e))
# Test image-CDN access separately from Wikipedia's API, which rejected the first test.
probes=[]
for u in ['https://upload.wikimedia.org/wikipedia/commons/4/43/Official_roberts_CJ.jpg','https://www.oyez.org/justices','https://api.oyez.org/justices']:
 try:r=get(u);probes.append({'url':u,'status':r.status_code,'bytes':len(r.content),'type':r.headers.get('content-type')});(OUT/('probe-'+str(len(probes))+'.bin')).write_bytes(r.content)
 except Exception as e:probes.append({'url':u,'error':str(e)})
(OUT/'sources.json').write_text(json.dumps(records,indent=2))
(OUT/'network-tests.json').write_text(json.dumps(probes,indent=2))
print('DONE',len(records),'records',len(list((OUT/'originals').glob('*'))),'downloaded portrait files',flush=True)
