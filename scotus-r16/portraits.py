"""Pack sourced photographic/historical portraits; never synthesize faces."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib,io,concurrent.futures
import numpy as np
from scipy import ndimage
import requests
R=Path('scotus-r16');W=R/'work';F=json.loads((R/'fixtures.json').read_text());P=F['manifest']['people']
old=W/'portrait-source';repl=W/'photo-replacements'
chosen={j['image_url']:j for j in json.loads((old/'chosen.json').read_text())}
replacement={j['id']:j for j in json.loads((repl/'chosen.json').read_text())}
originals={}
for folder in [old/'originals',repl/'originals']:
 for p in folder.iterdir():
  if p.is_file():originals[hashlib.sha256(p.read_bytes()).hexdigest()]=p

def get_portrait(p):
 pid=p['id'];special=R/'assets'/(pid+'.webp')
 if special.exists():return p,Image.open(special).convert('RGBA'),True,'checked group-photograph crop'
 if pid in replacement:
  j=replacement[pid];raw=(repl/j['file']).read_bytes();assert hashlib.sha256(raw).hexdigest()==p['source_sha256'];im=Image.open(repl/j['cutout_file']).convert('RGBA');method='archived photographic cutout'
 elif p['image_url'] in chosen:
  j=chosen[p['image_url']];raw=(old/j['file']).read_bytes();assert hashlib.sha256(raw).hexdigest()==p['source_sha256'];im=Image.open(old/j['cutout_file']).convert('RGBA');method='archived photographic cutout'
  if pid=='ketanji-brown-jackson':
   # Correct only an erroneous transparent robe region in the old segmentation.
   # The original RGB photograph supplies every pixel, including the restored fabric.
   rgb=Image.open(io.BytesIO(raw)).convert('RGB').resize((1050,1313),Image.Resampling.LANCZOS).crop((0,188,1050,1313))
   a=im.getchannel('A');ImageDraw.Draw(a).polygon([(10,842),(345,752),(455,839),(379,1124),(12,1124)],fill=255);rgb.putalpha(a);im=rgb;method='archived photograph; robe-only alpha correction'
 else:
  src=originals.get(p['source_sha256'])
  if src:raw=src.read_bytes()
  else:
   r=requests.get(p['image_url'],timeout=45);r.raise_for_status();raw=r.content
  assert hashlib.sha256(raw).hexdigest()==p['source_sha256'],pid
  im=Image.open(io.BytesIO(raw)).convert('RGBA');method='publisher-supplied transparent portrait'
 # Remove only tiny isolated border specks, not significant disconnected portrait components.
 a=np.array(im.getchannel('A'));labels,n=ndimage.label(a>24)
 if n:
  counts=np.bincount(labels.ravel());counts[0]=0;keep=np.where(counts>=max(6,counts.max()*.003))[0];a[~np.isin(labels,keep)]=0;im.putalpha(Image.fromarray(a))
 box=im.getchannel('A').point(lambda v:255 if v>20 else 0).getbbox();assert box,pid
 return p,im.crop(box),False,method

atlas=Image.new('RGBA',(3072,3200),(0,0,0,0));log=[]
for p,im,whole,method in concurrent.futures.ThreadPoolExecutor(4).map(get_portrait,P):
 cell=Image.new('RGBA',(256,320),(0,0,0,0))
 if whole:cell=im.resize((256,320),Image.Resampling.LANCZOS)
 else:
  im.thumbnail((242,298),Image.Resampling.LANCZOS);cell.alpha_composite(im,((256-im.width)//2,308-im.height))
 col=p['frame']['x']//384;row=p['frame']['y']//480;atlas.alpha_composite(cell,(col*256,row*320))
 log.append({'id':p['id'],'name':p['name'],'source':p['source_page'],'image_url':p['image_url'],'source_sha256':p['source_sha256'],'processing':method})
assert len(log)==116 and len({x['id'] for x in log})==116
atlas.save(R/'SCOTUS-Sprites.webp','WEBP',quality=86,method=3)
(R/'portrait-sources.json').write_text(json.dumps(log,ensure_ascii=False,indent=2))
print('PORTRAITS',len(log),'bytes',(R/'SCOTUS-Sprites.webp').stat().st_size)
