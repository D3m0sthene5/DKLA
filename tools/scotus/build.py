"""Retrieve primary research datasets; no inferred votes or rewritten course text."""
from pathlib import Path
import requests,concurrent.futures,json,re,zipfile,io
OUT=Path('output/scdb');OUT.mkdir(parents=True,exist_ok=True)
urls={
 'legacy':'https://scdb.la.psu.edu/?jet_download=89e8b7129b92c67db3a887b4354bf25a7dbcb47f',
 'modern':'https://scdb.la.psu.edu/?jet_download=352666fb83fb993f6d73510c4877441284f21812',
 'codebook':'https://scdb.la.psu.edu/online-codebook/'
}
def fetch(pair):
 key,url=pair
 try:
  r=requests.get(url,timeout=60);r.raise_for_status()
  if r.content[:2]==b'PK':
   z=zipfile.ZipFile(io.BytesIO(r.content));z.extractall(OUT);print(key,z.namelist(),flush=True)
  else:(OUT/(key+'.html')).write_text(r.text)
  return {'name':key,'url':url,'bytes':len(r.content)}
 except Exception as e:return {'name':key,'url':url,'error':str(e)}
(OUT/'sources.json').write_text(json.dumps(list(concurrent.futures.ThreadPoolExecutor(3).map(fetch,urls.items())),indent=2))
# Preserve full opinions for records outside Oyez's indexed historic coverage.
from bs4 import BeautifulSoup
soup=BeautifulSoup((OUT/'codebook.html').read_text(),'html.parser')
wanted=['The Vote in the Case','Majority and Minority Voting by Justice','Justice ID','Justice Name','Opinion','Vote Not Clearly Specified']
for a in soup.select('a[href]'):
 if a.get_text(' ',strip=True) in wanted:
  u=requests.compat.urljoin(urls['codebook'],a['href']);r=requests.get(u,timeout=40)
  (OUT/(re.sub(r'[^a-z0-9]+','-',a.get_text().lower())+'.html')).write_text(r.text)
  print('CODEBOOK',a.get_text(),u,flush=True)
