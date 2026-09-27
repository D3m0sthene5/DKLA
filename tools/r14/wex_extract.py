import sys, json, os; sys.modules['cryptography']=None
from pypdf import PdfReader
r=PdfReader('added-sources/Cornell_Wex_Dictionary_2026-09-26.pdf')
pages=[]
for i,p in enumerate(r.pages):
    links=[]
    for a in (p.get('/Annots') or []):
        try:
            a=a.get_object(); act=a.get('/A')
            if act and act.get('/URI'): links.append({'uri':str(act['/URI']),'rect':[float(x) for x in a.get('/Rect',[])]})
        except Exception: pass
    pages.append({'n':i+1,'text':p.extract_text() or '','links':links})
    if i%200==0: print(i, file=sys.stderr)
json.dump(pages, open(os.path.join(os.environ.get('DKLA_SCRATCH', os.path.dirname(os.path.abspath(__file__))),'wex_pages.json'),'w'))
print('done', len(pages))
