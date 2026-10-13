"""Assemble r16; preserve every original script/data block byte for byte."""
from pathlib import Path
import re,json,hashlib,base64
R=Path('scotus-r16');base=Path('DKLA-r8.html').read_text()
assert hashlib.sha256(base.encode()).hexdigest()=='9aee60e6efb6a31a77343c4efb38ff33334f48f008bd25efd8d6fa4d3e2506b4','Base changed; reconcile before rebuilding'
Dtext=(R/'history-data.json').read_text();D=json.loads(Dtext)
addon='\n<!-- DKLA r16 additive SCOTUS history; original course data is unchanged. -->\n'
addon+='<style id="dklaR16HistoryStyle">'+(R/'scotus.css').read_text()+'</style>\n'
addon+='<script type="application/json" id="scotusHistoryData">'+Dtext.replace('</','<\\/')+'</script>\n'
addon+='<script type="application/octet-stream" id="scotusSprite">'+base64.b64encode((R/'SCOTUS-Sprites.webp').read_bytes()).decode()+'</script>\n'
addon+='<script id="dklaR16HistoryCode">'+(R/'scotus.js').read_text()+'</script>\n'
pos=base.lower().rfind('</body>');assert pos>=0;out=base[:pos]+addon+base[pos:]
blocks=lambda s:dict(re.findall(r'<script[^>]*id="([^"]+)"[^>]*>(.*?)</script>',s,re.S))
old=blocks(base);new=blocks(out);assert all(new.get(k)==v for k,v in old.items())
G=json.loads(old['seedData']);assert len(D['people'])==116 and len(D['seats'])==11
assert all(k in G['studyMap']['homes'] for k in D['cases'])
for c in D['cases'].values():
 assert c['sources'] and c['decisions']
 for d in c['decisions']:
  assert all(v['justice'] in D['people'] and v.get('source') for v in d['votes'])
  assert len(d['votes'])==len(set(v['justice'] for v in d['votes']))
  if not any(v['alignment']=='divided' for v in d['votes']):assert (sum(v['alignment']=='majority' for v in d['votes']),sum(v['alignment']=='dissent' for v in d['votes']))==(d['for'],d['against']),c['title']
Path('DKLA-r16.html').write_text(out)
audit={'base_sha256':hashlib.sha256(base.encode()).hexdigest(),'release_sha256':hashlib.sha256(out.encode()).hexdigest(),'original_script_blocks_preserved':len(old),'original_nodes':len(G['nodes']),'original_edges':len(G['edges']),'original_case_entries':sum(n['kind']=='Case' for n in G['nodes']),'scotus_linked_entries':len(D['cases']),'scotus_case_entries':sum(n['kind']=='Case' and n['id'] in D['cases'] for n in G['nodes']),'people':len(D['people']),'seats':len(D['seats']),'decisions':sum(len(c['decisions']) for c in D['cases'].values()),'vote_records':sum(len(d['votes']) for c in D['cases'].values() for d in c['decisions']),'as_of':D['asOf']}
(R/'integrity.json').write_text(json.dumps(audit,indent=2));print(json.dumps(audit))
