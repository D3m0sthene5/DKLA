"""Build separate SCOTUS metadata without changing original course entries."""
from scotus_source_inputs import *
for nid,m in matches.items():
 o=oy.get(m.get('oyez'),{});rs=bycase.get(m.get('scdb'),[])
 date=m.get('date') or (iso(rs[0]['dateDecision']) if rs else None)
 if not date:date=next((day(t['dates'][0]) for t in o.get('timeline',[]) if t.get('event')=='Decided' and t.get('dates')),None)
 if not date:missing.append((nid,'decision date'));continue
 c={'node':nid,'title':node[nid]['title'],'courses':node[nid].get('courses',[]),'date':date,'term':int(rs[0]['term']) if rs else int(date[:4])-(date[5:7]<'10'),'citation':m.get('cite') or (rs[0]['usCite'] if rs else ''),'sources':[],'decisions':[]}
 if m.get('oyez'):c['sources'].append({'label':'Oyez case record','url':m['oyez'].replace('api.','www.')})
 if rs:c['sources'].append({'label':'Supreme Court Database · '+m['scdb'],'url':'https://scdb.la.psu.edu/','recordId':m['scdb']})
 if o.get('justia_url'):c['sources'].append({'label':'Opinion text','url':o['justia_url']})
 if any(d.get('votes') and (d.get('majority_vote') or 0)+(d.get('minority_vote') or 0)>0 for d in o.get('decisions') or []):
  for od in o['decisions']:
   if not od.get('votes') or (od.get('majority_vote') or 0)+(od.get('minority_vote') or 0)==0:continue
   vs=[]
   for v in od.get('votes',[]):
    pid=identify(v['member']['name']);vote=v.get('vote');op=v.get('opinion_type') or 'none'
    if vote not in ['majority','minority','none']:raise ValueError(('unknown vote',nid,vote))
    vv={'justice':pid,'alignment':{'majority':'majority','minority':'dissent','none':'nonparticipation'}[vote],'label':'Did not participate' if vote=='none' else ('Dissent' if vote=='minority' else 'Joined the Court'),'opinion':op,'seniority':v.get('seniority') or seniority(pid,date),'source':v['href']}
    if op not in ['none','majority']:vv['label']=op.capitalize()
    if isinstance(v.get('ideology'),(int,float)):vv['ideology']=v['ideology']
    vv['joining']=[identify(x['name']) for x in v.get('joining') or []];vs.append(vv)
   c['decisions'].append({'title':od.get('decision_type') or 'Decision','for':od.get('majority_vote'),'against':od.get('minority_vote'),'description':BeautifulSoup(od.get('description') or '', 'html.parser').get_text(' ',strip=True),'votes':vs,'source':od['href']})
  if rs and c['decisions'][0]['for']!=int(rs[0]['majVotes'] or 0):conflicts.append((nid,c['decisions'][0]['for'],rs[0]['majVotes']))
 elif rs:
  groups=collections.defaultdict(list)
  for r in rs:groups[r['caseIssuesId']].append(r)
  seen=set()
  for key,gr in groups.items():
   gr=list({r['justice']:r for r in gr}.values());signature=tuple((r['justice'],r['vote']) for r in gr)
   if signature in seen:continue
   seen.add(signature);vs=[]
   for r in gr:
    pid=scdb_id[r['justice']];v=r['vote'];alignment='nonparticipation' if not v else 'dissent' if v in ['2','6','7'] else 'divided' if v=='8' else 'majority'
    op='majority' if r['justice']==r['majOpinWriter'] else 'dissent' if r['opinion'] in ['2','3'] and alignment=='dissent' else 'concurrence' if v=='3' else 'special concurrence' if v=='4' else 'none'
    vs.append({'justice':pid,'alignment':alignment,'label':label.get(v,'Did not participate'),'opinion':op,'seniority':seniority(pid,date),'source':'https://scdb.la.psu.edu/','recordId':r['voteId']})
   d={'title':'Decision' if len(groups)==1 else 'Decision · issue '+str(len(c['decisions'])+1),'for':int(gr[0]['majVotes'] or 0),'against':int(gr[0]['minVotes'] or 0),'votes':vs,'source':'https://scdb.la.psu.edu/'}
   if any(r['vote']=='8' for r in gr):d['note']='The Court affirmed by an equally divided vote; individual sides were not published.'
   c['decisions'].append(d)
 else:missing.append((nid,'vote record'));continue
 cases[nid]=c
# Actual opinion resolves the difference between joining the judgment and its reasoning.
if 'shoe' in cases:
 d=cases['shoe']['decisions'][0];d['for']=8;d['against']=0
 for v in d['votes']:
  if v['justice']=='hugo-lafayette-black':v.update(alignment='majority',label='Concurrence in the judgment',opinion='special concurrence',source='https://supreme.justia.com/cases/federal/us/326/310/')
 d['note']='Black agreed with the result but wrote separately; Jackson took no part.'
 cases['shoe']['sources'].append({'label':'U.S. Reports · opinion and separate writing','url':'https://supreme.justia.com/cases/federal/us/326/310/'})
# Checked primary-opinion supplements supersede dataset errors.
if (W/'primary-votes.json').exists():
 for nid,c in json.loads((W/'primary-votes.json').read_text()).items():
  c.update(node=nid,title=node[nid]['title'],courses=node[nid].get('courses',[]))
  for d in c['decisions']:
   for v in d['votes']:v['seniority']=seniority(v['justice'],c['date'])
  cases[nid]=c;missing=[r for r in missing if r[0]!=nid]
base_title=lambda s:norm(re.sub(r'\([^)]*\)|[—–].*$','',s))
bytitle=collections.defaultdict(list)
for nid,c in cases.items():bytitle[base_title(c['title'])].append(c)
for n in G['nodes']:
 if n['id'] in cases or n['kind']=='Case' or not re.search(r'\bv\.',n['title']):continue
 cc=bytitle[base_title(n['title'])]
 if len(cc)==1:cases[n['id']]={**cc[0],'node':n['id'],'title':n['title'],'courses':n.get('courses',[])}
# Exact-term estimates only. Zero-filled Oyez placeholders are removed.
mq={}
if (W/'mq/mq.csv').exists():
 for r in csv.DictReader((W/'mq/mq.csv').open()):
  if r['justice'] in scdb_id:mq[(int(r['term']),scdb_id[r['justice']])]=float(r['post_mn'])
for c in cases.values():
 c['sources']=list({s['url']:s for s in c['sources']}.values());term=c.get('term',int(c['date'][:4])-(c['date'][5:7]<'10'))
 for d in c['decisions']:
  vs=d['votes']
  if all((term,v['justice']) in mq for v in vs):
   for v in vs:v['ideology']=mq[(term,v['justice'])]
   d['ideologyModel']={'label':'Martin–Quinn','term':term,'url':'https://mqscores.wustl.edu/measures.php','description':'Published posterior-mean estimates for October Term '+str(term)+'. This is a model of ideological position, not a description of the vote in this case.'}
  elif all(isinstance(v.get('ideology'),(int,float)) for v in vs) and len(set(v['ideology'] for v in vs))>1:
   d['ideologyModel']={'label':'Oyez','url':c['sources'][0]['url'],'description':'Ideology values supplied with Oyez’s record of this decision. No values are inferred from appointing presidents or extended to another term.'}
  else:
   for v in vs:v.pop('ideology',None)
D={'version':1,'asOf':'2026-09-27','rangeStart':'1789-09-24','requestedEnd':'2026-09-30','dateConvention':'Supreme Court published judicial-oath and termination dates; end-of-day snapshot. Seat labels follow the earlier succession document and are descriptive, not statutory numbers.','sources':roster['sources'],'people':people,'seats':seats,'cases':cases,'sprite':{'file':'SCOTUS-Sprites.webp','width':4608,'height':4800,'cellW':384,'cellH':480}}
(OUT/'history-data.json').write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')))
print('RESULT',len(cases),'CASE nodes',sum(node[n]['kind']=='Case' for n in cases),'DECISIONS',sum(len(c['decisions']) for c in cases.values()),'VOTES',sum(len(d['votes']) for c in cases.values() for d in c['decisions']))
print('MISSING',missing);print('CONFLICTS',conflicts)
print('MAPPEDSCDB',len(scdb_id));(OUT/'scdb-justice-map.json').write_text(json.dumps(scdb_id))
for nid,c in cases.items():
 for d in c['decisions']:
  assert len(d['votes'])==len(set(v['justice'] for v in d['votes'])),nid
  a=sum(v['alignment']=='majority' for v in d['votes']);b=sum(v['alignment']=='dissent' for v in d['votes'])
  if (a,b)!=(d['for'],d['against']) and not any(v['alignment']=='divided' for v in d['votes']):print('TALLY DIFF',nid,(a,b),(d['for'],d['against']))
