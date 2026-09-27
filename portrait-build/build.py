"""Authentic named portraits from Oyez; segmentation changes alpha only."""
import os
os.environ['OMP_NUM_THREADS']='2'
import requests,json,re,hashlib,concurrent.futures,time
from pathlib import Path
from io import BytesIO
from PIL import Image,ImageOps
import numpy as np
OUT=Path('output');OUT.mkdir(exist_ok=True)
for f in ['originals','cutouts','metadata']: (OUT/f).mkdir(exist_ok=True)
HEAD={'User-Agent':'SCOTUSPortraitReference/1.0 (educational archive retrieval; no synthesis)'}
def get(u):
 r=requests.get(u,headers=HEAD,timeout=(12,35));r.raise_for_status();return r
people={}
for page in range(8):
 try:
  a=get('https://api.oyez.org/justices?page='+str(page)).json()
  if isinstance(a,dict):a=list(a.values())
  before=len(people)
  for p in a:
   if isinstance(p,dict) and p.get('identifier'):people[p['identifier']]=p
  print('ROSTER PAGE',page,'new',len(people)-before,flush=True)
  if len(people)==before:break
 except Exception as e:print('PAGE ERROR',page,str(e),flush=True);break
(OUT/'oyez-roster.json').write_text(json.dumps(list(people.values()),indent=2))
print('ROSTER',len(people),flush=True)
def hrefs(x,path=''):
 out=[]
 if isinstance(x,dict):
  if str(x.get('mime','')).startswith('image/') and x.get('href'):out.append((x['href'],path,x))
  for k,v in x.items():out.extend(hrefs(v,path+'/'+k))
 elif isinstance(x,list):
  for i,v in enumerate(x):out.extend(hrefs(v,path+'/'+str(i)))
 return out

def fetch_person(p):
 sid=p['identifier'];results=[]
 try:
  detail=get(p['href']).json();(OUT/'metadata'/(sid+'.json')).write_text(json.dumps(detail,indent=2))
  candidates=hrefs(detail)
  if p.get('thumbnail'):candidates+=hrefs(p['thumbnail'],'thumbnail')
  # Each media item's metadata, not a generated likeness, establishes its subject.
  seen=set()
  for u,field,meta in candidates:
   if u in seen:continue
   seen.add(u)
   try:
    r=get(u);im=ImageOps.exif_transpose(Image.open(BytesIO(r.content)));im.load()
    if im.width<90 or im.height<90:continue
    name=sid+'-'+str(len(results));ext='.png' if im.format=='PNG' or 'png' in r.headers.get('content-type','') else '.jpg'
    path='originals/'+name+ext;(OUT/path).write_bytes(r.content)
    results.append({'id':sid,'name':p['name'],'image_url':u,'source_page':'https://www.oyez.org/justices/'+sid,'source_api':p['href'],'metadata_field':field,'media_metadata':meta,'file':path,'width':im.width,'height':im.height,'sha256':hashlib.sha256(r.content).hexdigest(),'provider':'Oyez'})
   except Exception as e:print('IMAGE ERROR',sid,u,str(e),flush=True)
  print('PORTRAIT',sid,[(r['width'],r['height'],r['metadata_field']) for r in results],flush=True)
 except Exception as e:print('PERSON ERROR',sid,str(e),flush=True)
 return results
records=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
 for a in ex.map(fetch_person,people.values()):records.extend(a)
(OUT/'sources.json').write_text(json.dumps(records,indent=2))
# Retain every original separately. Only segmentation/cropping affects cutout derivatives.
from rembg import new_session,remove
session=new_session('u2net')
chosen=[]
for sid,p in people.items():
 a=[r for r in records if r['id']==sid]
 if not a:continue
 a.sort(key=lambda r:r['width']*r['height'],reverse=True)
 r=a[0];im=ImageOps.exif_transpose(Image.open(OUT/r['file'])).convert('RGBA');im.thumbnail((1050,1400),Image.Resampling.LANCZOS)
 try:
  if np.asarray(im.getchannel('A')).min()<10:result=im;method='existing source alpha'
  else:result=remove(im,session=session,post_process_mask=True);method='u2net alpha segmentation; original RGB retained'
  # Crop to the actual alpha bounding box, but never repaint or invent pixels.
  box=result.getchannel('A').getbbox()
  if box:result=result.crop(box)
  path='cutouts/'+sid+'.png';result.save(OUT/path)
  r.update({'cutout_file':path,'mask_method':method,'cutout_width':result.width,'cutout_height':result.height})
  chosen.append(r);print('CUTOUT',sid,result.size,flush=True)
 except Exception as e:print('MASK ERROR',sid,str(e),flush=True)
(OUT/'chosen.json').write_text(json.dumps(chosen,indent=2))
print('DONE',len(people),'people',len(records),'originals',len(chosen),'cutouts',flush=True)
