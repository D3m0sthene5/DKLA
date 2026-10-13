#!/usr/bin/env python3
"""Curate map metadata, without rewriting legal records or their relationships.

Coordinates are relative to the responsive course anchors. Bounded inventory
commands in geography_check.py expose every reviewed placement and its reason.
"""
import copy
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/v25'))
sys.path.insert(0, str(ROOT / 'tools'))
from source.tree import origin_identity  # the original page's hash, checked against the source data
import explanation_inventory as explanations

OUT = ROOT / 'tools/v25/geography.json'
LRS = 'Legislation and the Regulatory State'
S = 'lrs-topic-judicial-review-and-standing-'
K = 'lrs-topic-legislative-process-and-statutory-interpretation-'
A = 'lrs-topic-administrative-adjudication-'
EXCLUDED = '''problem-interests problem-opportunity problem-retirement-discount problem-prentis problem-unexpected-heir problem-toast problem-dementas problem-nephew-shop problem-reliance-measures problem-ypsilanti problem-social problem-mint problem-foley problem-kendel problem-awesome problem-steinberg problem-newman problem-yaro problem-hedging problem-maine problem-funeral problem-humble problem-sof-categories lrs-n-problem-safety-discretion lrs-n-problem-guidance-binding lrs-n-problem-review-history lrs-i-express-regulatory-problem'''.split()


def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


def baseline():
    graph, nodes, _, _, _, _ = explanations.effective()
    m = graph['studyMap']
    for path in ['tools/r19/data/rlcc.json', 'tools/r19/data/rules22.json']:
        addition = read(path)
        for did, shift in addition.get('districtShift', {}).items():
            d = m['districts'][did]
            d['y'] += shift['dy']
            if 'supportStart' in d:
                d['supportStart'] += shift['dy']
            for h in m['homes'].values():
                if h['district'] == did:
                    h['y'] += shift['dy']
        for did, grow in addition.get('districtGrow', {}).items():
            d = m['districts'][did]
            d['h'] = max(d['h'], grow.get('h', 0))
            if 'supportStart' in grow:
                d['supportStart'] = grow['supportStart']
        for hid, shift in addition.get('homeShift', {}).items():
            m['homes'][hid]['y'] += shift['dy']
        for n in addition['rules']:
            h = n['home']
            d = m['districts'][h['district']]
            m['homes'][n['id']] = dict(id=n['id'], x=h.get('x', d['x']+h.get('dx', 0)), y=h.get('y', d['y']+h.get('dy', 0)), w=h['w'], h=h['h'], district=d['id'], region=d['region'], core=h['core'], support=not h['core'])
            graph['geography']['placements'][n['id']] = dict(region=d['region'], district=d['id'], **n.get('placement', {}))
    audit = read('tools/r19/data/r21-audit.json')
    for did, grow in audit.get('districtGrow', {}).items():
        d = m['districts'][did]
        d['h'] = max(d['h'], grow.get('h', 0))
        if 'supportStart' in grow:
            d['supportStart'] = grow['supportStart']
    for collection in ['districts', 'regions']:
        values = m[collection] if collection == 'districts' else {r['id']: r for r in m[collection]}
        for key, edits in audit.get(collection, {}).items():
            for field, old, new in edits:
                if values[key].get(field) == old:
                    values[key][field] = new
    for nid, h in audit.get('moves', {}).items():
        d = m['districts'][h['district']]
        m['homes'][nid] = dict(id=nid, x=d['x']+h['dx'], y=d['y']+h['dy'], w=h['w'], h=h['h'], district=d['id'], region=d['region'], core=h['core'], support=not h['core'])
        graph['geography']['placements'][nid].update(region=d['region'], district=d['id'])
    return graph, nodes


def course_of(r):
    if r.get('course'):
        return r['course']
    if r['id'] == 'civil-region':
        return 'Civil Procedure'
    if r['id'] in ['workbench-region', 'dictionary-region']:
        return r['id']
    return 'Contracts'


def build():
    graph, nodes = baseline()
    m = graph['studyMap']
    original = copy.deepcopy(m)
    homes, ds, placements = m['homes'], m['districts'], graph['geography']['placements']
    regions = {r['id']: r for r in m['regions']}
    revised = set()
    changes = []

    def move(nid, dest, why):
        h = homes[nid]
        old = h['district']
        if old == dest:
            return
        revised.update([old, dest])
        h.update(district=dest, region=ds[dest]['region'])
        placements[nid].update(district=dest, region=ds[dest]['region'], placementBasis=why)
        changes.append(dict(id=nid, title=nodes[nid]['title'], fromDistrict=old, toDistrict=dest, rationale=why))

    def district(did, rid, title, question, lead=None, column=0):
        r = regions[rid]
        ds[did] = dict(id=did, region=rid, title=title, question=question, lead=lead, indexTopic=lead, x=r['x']+60+1160*column, y=r['y']+150, w=1120, h=250, headerH=110, supportStart=r['y']+270)
        r['districtIds'].append(did)
        revised.add(did)

    def retire(did):
        rid = ds[did]['region']
        regions[rid]['districtIds'] = [k for k in regions[rid]['districtIds'] if k != did]
        del ds[did]
        revised.discard(did)

    for nid in EXCLUDED:
        revised.add(homes[nid]['district'])
        del homes[nid]
        placements.pop(nid, None)

    for nid in ['klein-pepsico', 'walgreen', 'french-specific-performance', 'reading-notes-22']:
        move(nid, 'specific-relief', 'This account concerns specific performance or injunctions and adequacy of damages, rather than restitution of benefits after breach.')
    ds['restitution-remedy'].update(title='Restitution after breach', lead='algernon-blair', indexTopic='restitution-interest')
    move('ucc207-conduct', '207-conduct', 'The concept explains UCC § 2-207(3) and belongs beside C. Itoh and the conduct-formation comparison, rather than international sales.')
    move('interpretation', 'interpretation', 'This overview is the lead concept for meaning in context; the cross-course workbench remains for comparative study lenses.')
    # Distinct saved accounts remain available; co-locate the legacy assent
    # explanation rather than deleting its text or incident relationships.
    revised.add('objective')
    changes.append(dict(id='contractual-assent', title=nodes['contractual-assent']['title'], fromDistrict='objective', toDistrict='objective', rationale='Co-located with objective-assent as a supporting account; both distinct saved records and all relationships are retained.'))
    for nid in ['shoe', 'wwvw', 'ford', 'minimum-contacts', 'purposeful-availment', 'relatedness', 'fairness', 'specific-jurisdiction']:
        move(nid, 'cp-specific', 'Claim-linked personal jurisdiction: minimum contacts, purposeful activity, relatedness and fairness belong together in the existing personal-jurisdiction subject.')
    move('burger', 'cp-contract-contacts', 'Burger King applies minimum contacts to a continuing contractual relationship, beside the dedicated contractual-contacts concept.')
    for nid in ['forum-selection', 'carnival']:
        move(nid, 'cp-consent', 'A contractual forum-selection clause is a consent-based route to forum authority; place these accounts beside Bremen, while transfer and enforcement connections remain available.')
    move('cp-berk', 'cp-erie-rules', 'Berk belongs in the existing federal-provision scope and validity group; it is not a separate doctrine or course stage.')
    for did in ['civil-contacts', 'civil-jurisdiction', 'extension-iekfaa-1-area']:
        assert not any(h['district'] == did for h in homes.values()), did
        retire(did)
    for rid in ['civil-region', 'extension-iekfaa-1']:
        del regions[rid]

    rid = 'lrs-region-legislative-process-and-statutory-interpretation'
    methods = K+'katzmann-and-interpretive-methods'
    canons, applications = K+'canons-and-statutory-language', K+'statutory-applications'
    district(canons, rid, 'Canons and statutory language', 'How do linguistic canons, statutory structure and presumptions guide interpretation, and where do they run out?', 'lrs-k-canons', 0)
    district(applications, rid, 'Statutory applications', 'Compare the assigned applications of text, purpose, context and legislative history without treating every case as the same interpretive rule.', 'lrs-k-holy-trinity', 1)
    methods_ids = set('lrs-k-congress lrs-k-approaches lrs-k-practical lrs-k-understanding lrs-k-purposivism lrs-k-textualism lrs-k-legislative-history lrs-k-lawmaking'.split())
    canon_ids = set('lrs-k-canons-reading lrs-k-noscitur lrs-k-statutory-structure lrs-k-absurdity lrs-k-terms-of-art lrs-k-canons lrs-k-ejusdem lrs-k-lenity lrs-k-implied-repeal lrs-k-domestic-assumption lrs-k-clear-statement'.split())
    all_k = [nid for nid, h in homes.items() if h['district'] in [methods, 'extension-cjl74v-1-area']]
    for nid in all_k:
        if nid in ['lrs-k-rucho', 'lrs-k-trump-illinois']:
            continue
        dest = methods if nid in methods_ids else canons if nid in canon_ids else applications
        move(nid, dest, 'Group the assigned account by its actual interpretive role: methods and legislative context, language and canons, or concrete statutory applications. The source and syllabus order remain in the reading records.')
    ds[methods].update(title='Katzmann: methods and legislative context', lead='lrs-k-purposivism')
    # Make the overview a broad entrance, then the methods/canons column next to
    # the application column. This uses the previously empty half of the subject.
    ds[K+'core-concepts']['w'] = 2260
    ds[methods]['x'] = regions[rid]['x']+60
    regions[rid]['districtIds'] = [K+'core-concepts', methods, canons, applications]
    revised.update(regions[rid]['districtIds'])
    pq = S+'political-questions'
    district(pq, 'lrs-region-judicial-review-and-standing', 'Political questions and judicial limits', 'Rucho addresses the justiciability of federal partisan-gerrymandering claims; distinguish that political-question limit from Article III injury requirements.', 'lrs-k-rucho', 0)
    move('lrs-k-rucho', pq, 'Rucho is the assigned political-question account, not an application of ordinary statutory interpretation. Keep it in the courts pillar next to standing and review limits.')
    move('lrs-k-trump-illinois', 'lrs-topic-presidential-control-sources-and-limits-of-presidential-authority', 'The preliminary National Guard deployment ruling concerns the statutory limits on presidential execution; locate it with Youngstown and other sources and limits of presidential authority, retaining its statutory-interpretation links.')
    retire('extension-cjl74v-1-area')
    del regions['extension-cjl74v-1']
    for nid in ['lrs-n-pacific-gas-policy', 'lrs-n-american-mining-congress']:
        move(nid, 'lrs-topic-rulemaking-exceptions-to-notice-and-comment', 'This account helps distinguish policy statements or interpretive rules from legislative rules requiring notice and comment; it is not primarily arbitrary-and-capricious merits review.')
    move('lrs-n-technology-forcing', 'lrs-topic-judicial-review-reasoned-decisionmaking', 'Technology-forcing and uncertainty concern the adequacy of agency reasons and evidentiary support, beside State Farm and the hard-look review materials.')
    retire('lrs-topic-rulemaking-reasoned-decisionmaking')
    rule_r = regions['lrs-region-rulemaking']
    rule_r.update(title='Guidance and exceptions to notice and comment', description='Policy statements, interpretive rules and procedural exceptions; related review connections retain their individual explanations.')
    guidance = ds['lrs-topic-rulemaking-exceptions-to-notice-and-comment']
    guidance.update(x=rule_r['x']+60, w=2260)
    move('lrs-o-third-party-hearings', A+'third-party-hearing-rights', 'The concept belongs beside United Church of Christ and Ashbacker, its two third-party participation applications.')
    move('lrs-o-entitlement-disclaimers', A+'statutory-entitlements-and-disclaimers', 'Disclaimers and constraints on discretion belong beside Barry and Weston; the broader protected-property discussion retains its links.')
    standing_targets = {
        'constitutional-standing': ['havens', 'raines', 'spokeo', 'california-texas', 'us-texas'],
        'statutory-access-to-review': ['newport', 'bennett', 'air-courier', 'thompson', 'patchak', 'twin-rivers'],
        'representation-and-public-actions': ['maritime', 'brown-group', 'sffa'],
    }
    for target, suffixes in standing_targets.items():
        for suffix in suffixes:
            move('lrs-n-standing-'+suffix, S+target, 'Separate the former mixed note-authorities basket by the issue actually addressed: constitutional standing, statutory access/zone of interests, or associational representation. Cases can address additional issues through their existing links.')
    retire(S+'substantial-note-authorities')
    # The old fourteen-case basket mixed three materially different questions.
    # The summaries and holdings were compared individually for this split:
    # Gray/Hearst apply terms; Skidmore supplies persuasive weight; Chevron's
    # former regime differs from Loper Bright; the limits group includes both
    # refusals and grants of authority, and is not labelled uniformly as MQD.
    ir='lrs-region-judicial-review-of-agency-interpretation'
    ip='lrs-topic-judicial-review-of-agency-interpretation-'
    old=ip+'statutory-interpretation'
    historic=ip+'historical-respect-and-persuasive-weight'
    limits=ip+'major-questions-and-statutory-limits'
    district(historic,ir,'Historical respect and persuasive weight','Distinguish application of statutory terms in Gray and Hearst from the persuasive weight of administrative judgment under Skidmore.','lrs-i-skidmore',0)
    district(limits,ir,'Major questions and limits of statutory authority','Compare ordinary statutory limits and major-questions reasoning. These accounts include different approaches, votes and procedural postures; Biden v. Missouri upheld likely statutory authority at the stay stage.','lrs-i-west-virginia',1)
    ds[old].update(title='Chevron to independent judicial judgment',question='Trace the former Chevron framework through Mead and Brand X to its overruling in Loper Bright, retaining the statutory stare decisis and actual-delegation qualifications.',lead='lrs-i-loper-bright',indexTopic='lrs-i-independent-judgment')
    for nid in ['lrs-i-gray-powell','lrs-i-hearst','lrs-i-skidmore','lrs-i-persuasive-weight']:
        move(nid,historic,'The compared summary and holding address historical judicial respect for agency application of statutory terms or Skidmore persuasive weight, rather than Chevron eligibility or major questions.')
    for nid in ['lrs-i-benzene','lrs-i-king-burwell','lrs-i-alabama-realtors','lrs-i-west-virginia','lrs-i-nfib-osha','lrs-i-biden-missouri','lrs-i-biden-nebraska','lrs-i-major-questions','lrs-i-major-questions-rationales']:
        move(nid,limits,'Compare statutory limits and major questions next to one another without conflating them: Benzene is a fractured significant-risk decision, King independently construed the ACA, and Biden v. Missouri sustained likely authority at the stay stage.')
    for nid in ['lrs-i-historical-chevron','lrs-i-independent-judgment','lrs-i-delegated-discretion','lrs-i-statutory-stare-decisis']:
        move(nid,old,'This concept explains the former Chevron regime, independent judgment after Loper Bright, actual delegations or the continuing force of earlier statutory holdings, beside the cases it qualifies.')
    move('lrs-i-regulatory-deference',ip+'regulatory-interpretation','The concept explains Kisor and interpretation of an agency’s own regulation; keep it beside that case rather than mixing it with statutory interpretation.')
    ds[ip+'interpretive-standards'].update(title='Interpretive distinctions',question='Distinguish statutory interpretation from regulatory interpretation, and questions of law from fact or mixed application.',lead='lrs-i-statutes-and-regulations',indexTopic='lrs-i-statutes-and-regulations')
    revised.add(old)
    # Order each doctrinal comparison chronologically after its pedagogical
    # lead. Other subjects retain their established row ordering.
    chronological={historic:['lrs-i-gray-powell','lrs-i-hearst','lrs-i-skidmore','lrs-i-persuasive-weight'],old:['lrs-i-chevron','lrs-i-mead-note','lrs-i-brand-x','lrs-i-loper-bright'],limits:['lrs-i-benzene','lrs-i-king-burwell','lrs-i-alabama-realtors','lrs-i-nfib-osha','lrs-i-biden-missouri','lrs-i-west-virginia','lrs-i-biden-nebraska']}
    # Both historical accounts and regulatory distinctions occupy the left
    # column; the Chevron history and statutory-limits comparison sit right.
    ds[old]['x']=regions[ir]['x']+1220
    existing_order=regions[ir]['districtIds']
    regions[ir]['districtIds']=[historic,old,ip+'regulatory-interpretation',limits]+[d for d in existing_order if d not in [historic,old,ip+'regulatory-interpretation',limits]]
    # Reading records are one ordered index, kept in a course-margin region.
    for nid, h in list(homes.items()):
        if h['district'] == 'reading-index':
            move(nid, 'semester-readings', 'Keep all 26 Contracts assignments and their overview in one ordered course reading index, separate from doctrinal geography.')
        elif h['district'] == 'source-gaps' and nid!='gap-ny51105':
            move(nid, 'semester-sources', 'Keep Contracts source records together in the Contracts course margin; retain the original record and source-scope qualifications.')
    move('gap-ny51105','formal-substitutes','This is the supplied substantive New York written-promise rule, not a missing-source placeholder. It belongs with formal alternatives to the ordinary consideration requirement; its complete text and source links remain available.')
    retire('reading-index')
    retire('source-gaps')
    ds['semester-readings'].update(title='Contracts: all 26 reading assignments', question='Browse assignments 1 through 26 in syllabus order. Assignment membership remains distinct from a doctrinal relationship.', lead='contracts-davis-fall2026', indexTopic=None, x=regions['semester-workbench']['x']+60, w=2260)
    ds['semester-sources'].update(x=regions['semester-workbench']['x']+60, w=2260)
    revised.update(['semester-readings', 'semester-sources'])

    # Compact affected groups only. Preserve subject positions and unaffected
    # card homes; use their existing lead/core/support hierarchy and row order.
    affected_regions = {ds[k]['region'] for k in revised if k in ds}
    reflowed = []
    for did in sorted(revised):
        if did not in ds:
            continue
        d = ds[did]
        ids = [nid for nid, h in homes.items() if h['district'] == did]
        col_count = 4 if did in ['semester-readings', 'semester-sources'] else (4 if d['w'] > 1800 else 2)
        gap, pad, card_h, row_gap = 26, 28, 88, 22
        width = (d['w']-2*pad-gap*(col_count-1))/col_count
        def prior_order(nid):
            h = original['homes'].get(nid, homes[nid])
            return h['y'], h['x'], nid
        ids.sort(key=prior_order)
        if did in chronological:
            order={nid:i for i,nid in enumerate(chronological[did])}
            ids.sort(key=lambda nid:(order.get(nid,100),prior_order(nid)))
        if did == 'semester-readings':
            ids.sort(key=lambda nid: (int(nid.rsplit('-',1)[-1]) if nid.startswith('contracts-class-') else -2 if nid == 'contracts-davis-fall2026' else -1, nid))
        lead = d.get('lead') if d.get('lead') in ids else None
        core = [nid for nid in ids if nid != lead and homes[nid].get('core')]
        support = [nid for nid in ids if nid != lead and not homes[nid].get('core')]
        y = d['y']+110+16
        if lead:
            homes[lead].update(x=d['x']+pad, y=y, w=d['w']-pad*2, h=card_h, core=True, support=False)
            y += card_h+row_gap
        for group in [core, support]:
            if group is support:
                d['supportStart'] = y
            for idx, nid in enumerate(group):
                homes[nid].update(x=d['x']+pad+(width+gap)*(idx%col_count), y=y+(card_h+row_gap)*(idx//col_count), w=width, h=card_h)
            if group:
                y += (card_h+row_gap)*((len(group)+col_count-1)//col_count)
        d.update(h=max(250, y-d['y']+18), headerH=110)
        d.pop('headScale', None)
        reflowed.append(did)

    # Stack the changed region's existing columns. Full-width rows form an
    # entrance or reading index, and both columns resume beneath them.
    for rid in affected_regions:
        r = regions[rid]
        left, right = r['y']+150, r['y']+150
        for did in r['districtIds']:
            d = ds[did]
            if d['w'] > 1800:
                ny = max(left, right)
                left = right = ny+d['h']+40
            elif d['x']-r['x'] < 700:
                ny = left
                left += d['h']+40
            else:
                ny = right
                right += d['h']+40
            dy = ny-d['y']
            d['y'] = ny
            d['supportStart'] = d.get('supportStart',ny+126)+dy
            for h in homes.values():
                if h['district'] == did:
                    h['y'] += dy
        r['h'] = max(550, max(left,right)-r['y']+20)

    # Guidance and ordinary rulemaking now form adjacent branches. The review
    # column stays at its established x; source regions remain in the margin.
    # Reflow can make a subject taller, so check and shift a lower same-column
    # subject only when it would actually overlap it.
    for course in ['Contracts', 'Civil Procedure', LRS]:
        rs = sorted([r for r in regions.values() if course_of(r) == course], key=lambda r:r['y'])
        placed = []
        for r in rs:
            for above in placed:
                if r['x'] < above['x']+above['w'] and above['x'] < r['x']+r['w'] and r['y'] < above['y']+above['h']+120:
                    dy = above['y']+above['h']+120-r['y']
                    r['y'] += dy
                    for did in r['districtIds']:
                        d=ds[did];d['y']+=dy;d['supportStart']=d.get('supportStart',d['y']+126)+dy
                        for h in homes.values():
                            if h['district']==did:h['y']+=dy
            placed.append(r)

    m['regions'] = [r for r in m['regions'] if r['id'] in regions]
    anchors = copy.deepcopy(m['courseBlocks'])
    for rid in ['workbench-region', 'dictionary-region']:
        anchors[rid] = {k:regions[rid][k] for k in ['x','y','w','h']}
    for course in ['Contracts', 'Civil Procedure', LRS]:
        rs = [r for r in regions.values() if course_of(r)==course]
        a=anchors[course]
        a['w']=max(a['w'],max(r['x']+r['w'] for r in rs)-a['x']+250)
        a['h']=max(r['y']+r['h'] for r in rs)-a['y']+250
    # Avoid stale decorative roots/continuation descriptions after integration.
    design=copy.deepcopy(m['courseDesign'])
    for c in design:
        design[c]['spine']=[s for s in design[c].get('spine',[]) if s.get('from') not in ['civil-region','extension-cjl74v-1','extension-iekfaa-1'] and s.get('to') not in ['civil-region','extension-cjl74v-1','extension-iekfaa-1']]
        for z in design[c].get('zones',[]):
            overlapping=[r for r in regions.values() if course_of(r)==c and r['x']>=z['x'] and r['x']+r['w']<=z['x']+z['w'] and r['y']>=z['y'] and r['y']<z['y']+z['h']]
            if overlapping:z['h']=max(z['h'],max(r['y']+r['h'] for r in overlapping)-z['y']+250)
    # Remove caption referencing the retired geography without altering prose.
    design['Civil Procedure']['labels']=[l for l in design['Civil Procedure'].get('labels',[]) if 'landmark' not in l.get('text','').lower()]

    result=dict(schemaVersion=1, layoutId='v25-curated-locked', purpose='Curated topic geography; no legal text, source, relationship or study-note edits.', excludedPracticeIds=EXCLUDED, anchors=anchors, regions=[], districts={}, homes={}, placements=placements, courseDesign=design, revisions=changes)
    region_course={rid:course_of(r) for rid,r in regions.items()}
    def relative(obj,c):
        out=copy.deepcopy(obj);a=anchors[c];out['x']-=a['x'];out['y']-=a['y'];out['anchor']=c
        if 'supportStart' in out:out['supportStart']-=a['y']
        out.pop('custom',None)
        return out
    for r in m['regions']:result['regions'].append(relative(r,region_course[r['id']]))
    for did,d in ds.items():result['districts'][did]=relative(d,region_course[d['region']])
    for nid,h in homes.items():result['homes'][nid]=relative(h,region_course[h['region']])
    for c,x in design.items():
        for label in x.get('labels',[]):label['x']-=anchors[c]['x'];label['y']-=anchors[c]['y']
        for z in x.get('zones',[]):z['x']-=anchors[c]['x'];z['y']-=anchors[c]['y']
    for c,a in result['anchors'].items():a['basis']='Existing responsive whole-course anchor; curated relative geometry replaces saved custom positions.'
    by_district={did:[nid for nid,h in homes.items() if h['district']==did] for did in ds}
    relocated={c['id']:c for c in changes}
    edges=graph['edges']
    adjacency={nid:set() for nid in homes}
    for e in edges:
        if e['source'] in adjacency and e['target'] in adjacency:adjacency[e['source']].add(e['target']);adjacency[e['target']].add(e['source'])
    result['audit']=dict(scope='Every effective core graph node, region and district screened for topic placement; all map geometry checked mechanically. Native authority, dictionary term and SCOTUS entry layouts are private navigation surfaces, not graph homes, and share the global drag lock.', preserved='All account prose, original sources and connection records. Distinct legacy accounts are co-located, not deleted or silently merged.', limitations='Doctrinal proximity is a study classification, not an assertion that each neighboring authority adopts the same rule. No new legal relationship is inferred from layout.', counts=dict(nodes=len(homes), excludedPromptNodes=len(EXCLUDED), regions=len(regions), districts=len(ds), semanticRelocations=sum(c['fromDistrict']!=c['toDistrict'] for c in changes), reflowedDistricts=len(reflowed)), regionReviews=[], districtReviews=[], nodeReviews=[])
    region_why={r['id']:r['why'] for f in ['contracts','civil','legislation'] for r in read('tools/r12/'+f+'.json')['regions']}
    region_why.update({
        'cp-personal-region':'The first jurisdictional gate groups territory, claim-linked contacts, corporate homes and consent. Earlier contacts accounts now sit in these substantive districts, so historical development can be followed within the doctrine rather than in a separate temporary subject.',
        'cp-governing-region':'The governing-law entrance sits below the procedural framework and next to pleading. Federal-rule scope and validity includes Berk in its actual Erie district, while unguided Erie, specialized federal common law and reverse Erie retain separate groups.',
        'lrs-region-legislative-process-and-statutory-interpretation':'The top of the Congress pillar leads from statutory context to Katzmann methods, specific linguistic canons and concrete applications in adjacent groups. The former continuation is integrated; Rucho and the National Guard decision now sit with their actual judicial/executive questions.',
        'lrs-region-rulemaking':'Guidance and notice-and-comment exceptions sit between adjudication and ordinary rulemaking procedure, with the judicial-review column to their right. Pacific Gas and American Mining Congress explain the legislative-rule boundary; reasoned review and technology-forcing stay in the review subject.',
        'lrs-region-judicial-review-and-standing':'The foundation of the courts pillar separates constitutional injury/causation, statutory access, association representation, remedies and political questions. The mixed note-authorities basket is redistributed by issue; Rucho remains a distinct political-question account beside standing rather than being called an injury rule.',
        ir:'The top of the courts pillar contrasts historical respect/persuasive weight, Chevron’s development and overruling, regulatory interpretation under Kisor, and statutory authority/major questions. Adjacent cases are comparison subjects, including differing approaches and interim dispositions, not a claim of one shared holding.',
        'semester-workbench':'The Contracts course margin contains one numerical index for all 26 assignments and a separate source-record group. It remains above the enforcement-alternatives subject, outside the doctrinal zones, so syllabus order does not dictate case classification.',
        'workbench-region':'Cross-course comparison lenses and the personal inbox occupy the atlas margin. Contracts reading and source records have one course-specific home; saved personal prose is preserved and new entries receive fixed inbox slots.',
        'dictionary-region':'The separate dictionary entrance sits in the atlas margin near the personal workbench and native authority collection; its alphabetical terms use a private reading surface rather than course-case map homes.',
    })
    region_pairs={rid:{} for rid in regions}
    for edge in edges:
        if edge['source'] not in homes or edge['target'] not in homes:continue
        a,b=homes[edge['source']]['region'],homes[edge['target']]['region']
        if a!=b:
            region_pairs[a][b]=region_pairs[a].get(b,0)+1
            region_pairs[b][a]=region_pairs[b].get(a,0)+1
    result['audit']['screeningMethod']='Complete region/district member-title and topic-question screening, current graph adjacency measurement, and targeted effective summary/holding comparisons for relocated accounts. Prior v2.5 explanation/connection audit ledgers supply their separately scoped source checks; this geography review does not claim 1,052 fresh complete-opinion comparisons.'
    result['audit']['freshSummaryHoldingComparisons']=[nid for nid in nodes if nid in set(sum(chronological.values(),[])) or nid in ['lrs-k-rucho','lrs-k-trump-illinois','lrs-n-standing-maritime','lrs-n-standing-raines','lrs-n-standing-california-texas','lrs-n-standing-us-texas','lrs-n-standing-sffa','lrs-n-standing-twin-rivers']]
    result['audit']['relatedSourceReviewLedgers']=['tools/v25/noncase-reading-review.json','tools/v25/contracts-notes-review.json','tools/v25/lrs-connections-review.json','tools/v25/contracts-civil-connections-review.json','tools/v25/explanation-audit.json']
    for rid,r in regions.items():
        c=region_course[rid]
        why=region_why.get(rid,r.get('description') or 'Course margin for source and reading records.')
        # Numeric ribbon counts describe the older design input, not today’s
        # effective graph; current counts are recorded separately below.
        import re
        why=re.sub(r'\s*\(\d+ (?:links|ribbons)\)','',why)
        neighbors=sorted(region_pairs[rid].items(),key=lambda item:(-item[1],item[0]))[:5]
        result['audit']['regionReviews'].append(dict(id=rid,title=r['title'],course=c,action='Affected groups integrated and spaced' if rid in affected_regions else 'Retained',rationale=why,districtIds=r['districtIds'],strongestConnectedSubjects=[dict(id=k,title=regions[k]['title'],connectionCount=v) for k,v in neighbors]))
    for did,d in ds.items():
        result['audit']['districtReviews'].append(dict(id=did,title=d['title'],region=d['region'],nodeCount=len(by_district[did]),action='Reflowed' if did in reflowed else 'Retained',rationale=d.get('question') or 'Reading and source records belong in a separate course-margin index.',nodeIds=by_district[did]))
    for nid,h in homes.items():
        ns=adjacency[nid];neighbors=sum(homes[k]['district']==h['district'] for k in ns)
        d=ds[h['district']]
        lead=nodes.get(d.get('lead'),{}).get('title')
        position='pedagogical lead' if nid==d.get('lead') else 'core account' if h.get('core') else 'supporting source/account'
        why=f"{position.capitalize()} in {d['title']}: {d.get('question','Reading/source index rather than a doctrinal relationship.')}"
        if lead and nid!=d.get('lead'):why+=f' The local lead is {lead}.'
        result['audit']['nodeReviews'].append(dict(id=nid,title=nodes[nid]['title'],kind=nodes[nid]['kind'],district=h['district'],region=h['region'],role=placements[nid].get('role'),action='Relocated' if nid in relocated else 'Retained in topic',rationale=relocated.get(nid,{}).get('rationale',why),summarySha256=hashlib.sha256(nodes[nid]['summary'].encode('utf-8')).hexdigest(),screening='Member title and district topic; separate source-review scope in linked ledgers',sameDistrictNeighbors=neighbors,totalGraphNeighbors=len(ns)))
    # The original page is named by its hash once its data is confirmed intact. Text JSON sources use
    # universal-newline reads so a Git CRLF/LF checkout changes no audit claim.
    result['sourceHashes']={path:origin_identity() if path=='DKLA-r18.html' else hashlib.sha256((ROOT/path).read_text(encoding='utf-8').encode('utf-8')).hexdigest() for path in ['DKLA-r18.html','tools/r12/contracts.json','tools/r12/civil.json','tools/r12/legislation.json','tools/r19/data/rlcc.json','tools/r19/data/rules22.json','tools/r19/data/r21-audit.json','tools/r19/data/plain.json','tools/r19/data/sections.json','tools/r19/data/patches.json','tools/r19/data/plain-sections.json']}
    return result


if __name__=='__main__':
    output=build()
    OUT.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(output['audit']['counts']))
