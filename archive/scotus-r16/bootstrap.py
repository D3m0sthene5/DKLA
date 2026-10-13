"""One-time restoration of checked research and UI files. No original atlas edits."""
from pathlib import Path
import os,json,re,base64,lzma,hashlib,zipfile,io,subprocess,shutil
import requests
R=Path('scotus-r16');W=R/'work';W.mkdir(exist_ok=True);T=R/'transport';O=Path('output');O.mkdir(exist_ok=True)
def decode(name,expected):
 text=''.join(p.read_text().strip() for p in sorted(T.glob(name+'.*.b64')))
 # Correct a documented single-character transport duplication, then verify the entire archive.
 if name=='interface':text=text.replace('td0bkwxWWusSxfev','td0bkwxWusSxfev')
 raw=base64.b64decode(text);got=hashlib.sha256(raw).hexdigest()
 (O/(name+'-transport.txt')).write_text(text)
 assert got==expected,(name,got,expected)
 return json.loads(lzma.decompress(raw))
F=decode('fixtures','8a817954d29f24a4a3bdb31af583d0ccec09edb049c3462de4dad10b5ce32d39')
UI=decode('interface','fb6d3fc2f281bcf4b4cd88f485c611426509caadd0769a45e9dd70c969144092')
for name,text in UI.items():assert name in ['scotus.js','scotus.css'];(R/name).write_text(text)
(R/'fixtures.json').write_text(json.dumps(F,ensure_ascii=False,indent=2))
for key,fn in [('manifest','portrait-manifest.json'),('roster','seats/SCOTUS_Seat_History_and_Data/SCOTUS_roster_and_seats.json'),('matches','match-audit.json'),('primary','primary-votes.json')]:
 p=W/fn;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(F[key],ensure_ascii=False))
base=Path('DKLA-r8.html').read_text();g=json.loads(re.search(r'<script[^>]*id="seedData"[^>]*>(.*?)</script>',base,re.S)[1]);(W/'base').mkdir(exist_ok=True);(W/'base/seedData.json').write_text(json.dumps(g))
def artifact(aid,dest):
 p=W/dest;p.mkdir(parents=True,exist_ok=True)
 u=f'https://api.github.com/repos/D3m0sthene5/DKLA/actions/artifacts/{aid}/zip'
 r=requests.get(u,headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json'},timeout=120);r.raise_for_status()
 z=zipfile.ZipFile(io.BytesIO(r.content))
 for n in z.namelist():
  target=(p/n).resolve();assert str(target).startswith(str(p.resolve())+os.sep)
 z.extractall(p);print('ARCHIVE',aid,len(r.content),flush=True)
artifact(10924895683,'collected');artifact(10924961605,'extras');artifact(10924968401,'mq')
subprocess.run(['python',str(R/'compile_data.py'),str(W)],check=True)
p=W/'release/history-data.json';D=json.loads(p.read_text());assert len(D['cases'])==230
shutil.copy2(p,R/'history-data.json')
artifact(10923747144,'portrait-source');artifact(10922859793,'photo-replacements')
# The two color group-photo crops are already checked photographic assets, not generated portraits.
A=R/'assets';A.mkdir(exist_ok=True)
for name,sha in {'tom-c-clark':'f346c695118bb37adbeab3ab587a28c924952a37a9246c7c48c0bbea91fe7aaf','john-marshall-harlan-ii':'26854c98fb87d6e3c2f5e27bdc07728bf8dd1adb580a888a3c205b2f0b22bc2c'}.items():
 raw=base64.b64decode((T/(name+'.b64')).read_text());assert hashlib.sha256(raw).hexdigest()==sha,name;(A/(name+'.webp')).write_bytes(raw)
subprocess.run(['python',str(R/'portraits.py')],check=True)
subprocess.run(['python',str(R/'assemble.py')],check=True)
# Keep readable, reusable source files in the final checkout rather than transport fragments.
shutil.rmtree(T)
for fn in ['DKLA-r16.html'] :shutil.copy2(fn,O/fn)
for fn in ['history-data.json','integrity.json','SCOTUS-Sprites.webp']:shutil.copy2(R/fn,O/fn)
with zipfile.ZipFile(O/'scotus-r16-source.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in R.rglob('*'):
  if p.is_file() and 'work' not in p.parts and '__pycache__' not in p.parts:z.write(p,str(p))
