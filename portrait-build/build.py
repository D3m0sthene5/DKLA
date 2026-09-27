import os
os.environ['OMP_NUM_THREADS']='2'
import requests,json,re,hashlib
from pathlib import Path
from io import BytesIO
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from PIL import Image,ImageOps
from rembg import new_session,remove
O=Path('output');O.mkdir(exist_ok=True)
for d in ['originals','cutouts','metadata']:(O/d).mkdir(exist_ok=True)
S=requests.Session();S.headers['User-Agent']='SCOTUSPortraitReference/1.0 (source-linked educational research)'
def get(u):r=S.get(u,timeout=25);r.raise_for_status();return r
jobs=[('joseph-story','Joseph Story','https://www.loc.gov/item/2004664058/?fo=json'),('john-mclean','John McLean','https://www.loc.gov/item/2004663957/?fo=json'),('john-catron','John Catron','https://www.loc.gov/resource/cwpbh.01590/?fo=json'),('salmon-portland-chase','Salmon Portland Chase','https://www.loc.gov/item/2018666381/?fo=json'),('peter-vivian-daniel','Peter Vivian Daniel','https://hd.housedivided.dickinson.edu/node/36556'),('benjamin-robbins-curtis','Benjamin Robbins Curtis','https://commons.wikimedia.org/wiki/File:Benjamin_Robbins_Curtis_-_photo.png')]
records=[]
for sid,name,u in jobs:
 try:
  urls=[];meta={}
  if sid=='benjamin-robbins-curtis':
   urls=['https://upload.wikimedia.org/wikipedia/commons/e/ea/Benjamin_Robbins_Curtis_-_photo.png','https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/Benjamin_Robbins_Curtis_-_photo.png/500px-Benjamin_Robbins_Curtis_-_photo.png']
   meta={'title':name,'description':'Undated photographic postcard portrait, before 1875; Commons file metadata verified separately.'}
  elif '?fo=json' in u:
   meta=get(u).json();(O/'metadata'/(sid+'.json')).write_text(json.dumps(meta))
   urls=meta.get('item',{}).get('image_url',[])
   if not urls:urls=meta.get('image_url',[])
   urls=[x for x in urls if isinstance(x,str) and not '.gif' in x]
   # LOC image_url belongs to this named item, not its related-search results.
   print('CANDIDATES',sid,urls,flush=True)
  else:
   r=get(u);(O/'metadata'/(sid+'.html')).write_text(r.text);s=BeautifulSoup(r.content,'html.parser')
   for a in s.find_all('a',href=True):
    if 'Download image' in a.get_text() or re.search(r'\.(jpg|png|jpeg)(\?|$)',a['href'],re.I):urls.append(urljoin(u,a['href']))
   for im in s.find_all('img'):
    if 'Daniel' in im.get('alt',''):urls.append(urljoin(u,im.get('src','')))
  best=None
  for v in list(dict.fromkeys(urls)):
   try:
    b=get(v);im=ImageOps.exif_transpose(Image.open(BytesIO(b.content)));im.load()
    if im.width<100 or im.height<100:continue
    if best is None or im.width*im.height>best[0]:best=(im.width*im.height,im,b.content,v)
   except Exception as e:print('IMAGE ERROR',sid,v,str(e),flush=True)
  if best:
   _,im,raw,v=best;ext='.png' if im.format=='PNG' else '.jpg';file='originals/'+sid+ext;(O/file).write_bytes(raw)
   records.append({'id':sid,'name':name,'file':file,'image_url':v,'source_page':u.replace('?fo=json',''),'provider':'Library of Congress' if 'loc.gov' in u else ('Dickinson College / Supreme Court collection' if 'dickinson' in u else 'Wikimedia Commons / historical postcard'),'width':im.width,'height':im.height,'sha256':hashlib.sha256(raw).hexdigest(),'media_type':'bw_photograph'})
   print('OK',sid,im.size,flush=True)
  else:print('NO IMAGE',sid,flush=True)
 except Exception as e:print('ERROR',sid,str(e),flush=True)
(O/'sources.json').write_text(json.dumps(records,indent=2))
session=new_session('u2net')
for r in records:
 im=ImageOps.exif_transpose(Image.open(O/r['file'])).convert('RGBA');im.thumbnail((1200,1600),Image.Resampling.LANCZOS)
 try:
  # Large original darkroom/mat borders may be discarded before alpha masking.
  result=remove(im,session=session,post_process_mask=True)
  result.save(O/'cutouts'/(r['id']+'.png'));r['cutout_file']='cutouts/'+r['id']+'.png'
  print('MASKED',r['id'],flush=True)
 except Exception as e:print('MASK ERROR',r['id'],str(e),flush=True)
(O/'chosen.json').write_text(json.dumps(records,indent=2))
