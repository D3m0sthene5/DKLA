#!/usr/bin/env python3
"""Revision 9b: remove meta-commentary from the entries and add doctrine timelines.

Run once from the DKLA folder (it refuses to run twice; it looks for seedData.timelines):

    python3 tools/r9_polish.py            # edits DKLA-r8.html in place
    python3 tools/r9_polish.py --check    # report only

What it removes, sentence by sentence, from summaries, notes, brief sections, "why" text,
topic reasons and connection explanations: sentences about the entry itself ("this account",
"this entry", "this notebook", "this index"), sentences about citator or current-law review,
sentences saying what the assigned excerpt omits or has not supplied, and the repeated
"study link" boilerplate on connections. Coverage labels at the top of an entry still say when
an account comes from a short excerpt. Only the Python standard library is used.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'DKLA-r8.html')
CHECK = '--check' in sys.argv
TODAY = '2026-09-23T00:00:00Z'

html = open(HTML, encoding='utf-8').read()
m = re.search(r'<script id="seedData"[^>]*>', html)
s0, e0 = m.end(), html.find('</script>', m.end())
data = json.loads(html[s0:e0])
if data.get('timelines'):
    sys.exit('Polish already applied.')
nodes = {n['id']: n for n in data['nodes']}

META = re.compile(
    r'\b(this (account|entry|notebook|index|atlas|brief)|this record (explains|contains|preserves|keeps|records|does not)|the atlas|this study link|'
    r'current-law|citator|'
    r'(has|have) not been (supplied|reconstructed|inferred|added|verified|represented|invented|performed)|'
    r'(is|are|remains?) not (represented|reconstructed)|'
    r'(does not|do not) (reconstruct|represent)|'
    r'no (new|independent|separate) (source|verification|audit|review)|'
    r'(the|that|this) (assigned |supplied |reproduced )?(note|excerpt|source|reading|translation|packet)s? (does not (supply|reproduce|identify|report|include|detail|state|provide|resolve|reach)|omits?|stops? (before|short))|'
    r'outside (this|the) (entry|account)|'
    r'(are|is) therefore outside|'
    r'placement does not|'
    r'without asserting a current)\b', re.I)
SPLIT = re.compile(r'(?<=[.!?])\s+(?=[A-Z“"(])')
ABBR = re.compile(r'\b(v|vs|Inc|Co|Corp|Ltd|No|Nos|Mr|Mrs|Ms|Dr|J|JJ|C\.J|U\.S|Bros|St|Jr|Sr|pp|p|cf|e\.g|i\.e|Fed|Cir|Ch|Art|Ass’n|Assn|Dist|Supp|Rev|Stat|Ct|App|Div|Rptr|Cal|Mass|Pa|Va|Ill|Wis|Minn|Tex|Fla|Ga|Kan|Okla|Ark|Ohio|Mich|Wash|Or|Colo|Conn|Del|Md|Mo|Neb|Nev|Vt|Wyo|Ala|Ariz|[A-Z])\.')
CLAUSE = re.compile(r'(;\s+|,\s+(?:but|so|although|though|while|and)\s+)')


def _protect(t):
    return ABBR.sub(lambda m: m.group(1) + '․', t)


def _restore(t):
    return t.replace('․', '.')


def clean(text):
    if not text or not isinstance(text, str):
        return text, 0
    out, removed = [], 0
    for para in text.split('\n'):
        kept = []
        for sent in SPLIT.split(_protect(para.strip())):
            if not sent:
                continue
            if META.search(sent):
                # drop only the offending clause when the sentence has several
                parts = CLAUSE.split(sent)
                clauses = [parts[i] for i in range(0, len(parts), 2)]
                if len(clauses) > 1:
                    good = [c for c in clauses if not META.search(c) and len(c) > 20]
                    if good:
                        joined = '; '.join(c.strip(' ,;') for c in good)
                        joined = joined[0].upper() + joined[1:]
                        if not joined.endswith(('.', '!', '?')):
                            joined += '.'
                        kept.append(joined)
                        removed += 1
                        continue
                removed += 1
                continue
            kept.append(sent)
        out.append(_restore(' '.join(kept)))
    res = '\n'.join(out)
    res = re.sub(r'\n{3,}', '\n\n', res).strip()
    res = re.sub(r'[ \t]{2,}', ' ', res)
    return res, removed


removed_total, touched = 0, 0
for n in data['nodes']:
    r = 0
    for f in ('summary', 'notes'):
        if n.get(f):
            n[f], k = clean(n[f]); r += k
    for k_, v in list((n.get('sections') or {}).items()):
        n['sections'][k_], k = clean(v); r += k
    L = n.get('learning') or {}
    if L.get('why'):
        L['why'], k = clean(L['why']); r += k
    if L.get('separateOpinions'):
        L['separateOpinions'], k = clean(L['separateOpinions']); r += k
    for key, val in list((L.get('topics') or {}).items()):
        if isinstance(val, str):
            L['topics'][key], k = clean(val); r += k
        elif isinstance(val, dict) and val.get('reason'):
            val['reason'], k = clean(val['reason']); r += k
    for t in (n.get('courseTreatments') or {}).values():
        for f in ('summary', 'notes'):
            if t.get(f):
                t[f], k = clean(t[f]); r += k
        for k_, v in list((t.get('sections') or {}).items()):
            t['sections'][k_], k = clean(v); r += k
    # a summary must never be empty: fall back to the holding or the first section
    if not n.get('summary'):
        n['summary'] = (n.get('sections') or {}).get('Holding') or next((v for v in (n.get('sections') or {}).values() if v), '') or n['title']
    if r:
        removed_total += r; touched += 1; n['updatedAt'] = TODAY

nodes['lrs-s-humphrey']['notes'] = ('In Trump v. Slaughter, decided June 29, 2026, the Supreme Court held 6–3 that the FTC Act’s for-cause removal '
                                    'restriction violates Article II and overruled Humphrey’s Executor: “If anything more is left of Humphrey’s, we overrule it.” '
                                    'Read this brief as the 1935 holding and as the framework the later removal cases argued about, not as current law. '
                                    'The class 11 Slaughter supplement is assigned reading; open the Trump v. Slaughter entry for the decision.')
nodes['lrs-s-slaughter']['notes'] = ('Written from the slip opinion and the Congressional Research Service analysis; the assigned Brightspace supplement was not among the '
                                     'supplied files, so check its excerpt and editorial questions before class 11. The same day, in Trump v. Cook, the Court treated the '
                                     'Federal Reserve as a distinct case and left its governors’ protection in place.')

STUDY_LINK = 'This study link locates the note in the doctrinal discussion; it does not add a holding to the cited authority.'
edge_hits = 0
for e in data['edges']:
    if e.get('explanation'):
        before = e['explanation']
        e['explanation'] = e['explanation'].replace(STUDY_LINK, '').strip()
        e['explanation'], k = clean(e['explanation'])
        if not e['explanation']:
            e['explanation'] = e.get('label') or before
        if e['explanation'] != before:
            edge_hits += 1

# ------------------------------------------------------------------ timelines
T = []


def tl(id_, title, question, steps):
    steps = [{'id': i, 'year': y, 'note': note} for i, y, note in steps if i in nodes]
    T.append({'id': id_, 'title': title, 'question': question, 'steps': steps})


tl('pj', 'Personal jurisdiction over out-of-state defendants', 'When can a court reach a defendant who is not from the forum?', [
    ('cp-pennoyer', 1877, 'Power runs with territory: a state binds people and property inside its borders, and little else.'),
    ('cp-hess', 1927, 'Implied consent: driving on state roads appoints a state officer as agent for service.'),
    ('shoe', 1945, 'Minimum contacts and “fair play and substantial justice” replace physical power.'),
    ('cp-mcgee', 1957, 'One insurance contract with a resident is enough when the claim arises from it.'),
    ('cp-hanson', 1958, 'Purposeful availment: the plaintiff’s unilateral moves do not create the defendant’s contacts.'),
    ('cp-shaffer', 1977, 'Shoe governs quasi in rem too; property in the forum is a contact, not a substitute for contacts.'),
    ('wwvw', 1980, 'Foreseeability that a car might be driven anywhere is not enough; the defendant must reach the forum.'),
    ('cp-calder', 1984, 'Intentional torts aimed at the forum: the effects test.'),
    ('burger', 1985, 'A contract plus a course of dealing can be a contact; two steps, contacts then fairness factors.'),
    ('cp-asahi', 1987, 'Stream of commerce splits four to four; fairness factors alone can defeat jurisdiction.'),
    ('cp-burnham', 1990, 'Tag jurisdiction survives: service on a visitor in the forum is enough.'),
    ('cp-goodyear', 2011, 'General jurisdiction only where the corporation is “at home”.'),
    ('cp-nicastro', 2011, 'Stream of commerce again, no majority: the plurality wants targeting of the forum.'),
    ('cp-daimler', 2014, '“At home” means incorporation or principal place of business, save an exceptional case.'),
    ('cp-walden', 2014, 'Contacts with the forum itself, not with a plaintiff who lives there.'),
    ('cp-bristol-myers', 2017, 'Each plaintiff’s claim must arise from the defendant’s forum contacts.'),
    ('ford', 2021, '“Relate to” needs no strict causation when the defendant cultivates the forum market.'),
    ('cp-mallory', 2023, 'Registration-based consent is a separate road, under Pennsylvania Fire.'),
])
tl('erie', 'Erie: which law a federal court applies', 'Federal or state law when the claim is a state-law claim?', [
    ('cp-swift', 1842, 'Federal courts follow a general common law on commercial questions.'),
    ('cp-erie-decision', 1938, 'There is no federal general common law; state law governs the rules of decision.'),
    ('cp-york', 1945, 'Outcome-determinative test: apply state rules that would change the result.'),
    ('cp-byrd', 1958, 'Balance: countervailing federal interests, such as the jury, can outweigh state practice.'),
    ('cp-hanna-decision', 1965, 'Twin aims for unguided Erie choices; a valid Federal Rule controls under the Rules Enabling Act.'),
    ('cp-walker', 1980, 'Rule 3 does not toll the state limitations period; no direct collision, so state law applies.'),
    ('cp-stewart', 1988, '§ 1404(a) is a federal statute on point, so it governs forum-selection transfers.'),
    ('cp-gasperini', 1996, 'Accommodate both: state damages standard, federal appellate review posture.'),
    ('cp-shady-grove', 2010, 'Rule 23 answers the question and is valid; the Court splits on how to read Rules against state law.'),
])
tl('pleading', 'What a complaint must say', 'How much must a plaintiff plead to survive a motion to dismiss?', [
    ('cp-dioguardi', 1944, 'A home-drawn complaint survives if it gives some notice of a claim.'),
    ('cp-conley', 1957, 'Dismiss only if no set of facts could support relief.'),
    ('cp-swierkiewicz', 2002, 'No heightened pleading for discrimination; notice pleading still governs.'),
    ('cp-twombly', 2007, 'Plausibility replaces “no set of facts”; parallel conduct alone is not enough.'),
    ('cp-iqbal', 2009, 'Plausibility applies to every civil case; strip conclusions, then judge the facts.'),
])
tl('fedq', 'Federal-question jurisdiction', 'When does a case arise under federal law?', [
    ('cp-shoshone', 1900, 'A claim governed by local custom does not arise under the federal statute that lets it be brought.'),
    ('cp-mottley', 1908, 'Well-pleaded complaint: the federal issue must be part of the plaintiff’s own claim, not a defense.'),
    ('cp-american-well', 1916, 'Holmes’s creation test: a suit arises under the law that creates the cause of action.'),
    ('cp-smith', 1921, 'A state-law claim can still qualify when it turns on a substantial federal question.'),
    ('cp-grable', 2005, 'Four factors: necessarily raised, actually disputed, substantial, and no upset to the federal–state balance.'),
    ('cp-gunn', 2013, 'A legal-malpractice claim about a patent fails the substantiality and balance factors.'),
])
tl('supp', 'Supplemental jurisdiction', 'When can a federal court hear related claims that lack their own basis?', [
    ('cp-gibbs', 1966, 'Pendent claims from a common nucleus of operative fact; discretion to decline.'),
    ('cp-aldinger', 1976, 'Pendent parties need a statutory hook; none for a county under § 1983 then.'),
    ('cp-kroger', 1978, 'A plaintiff cannot add a non-diverse defendant through the back door of ancillary jurisdiction.'),
    ('cp-finley', 1989, 'No pendent-party jurisdiction without express statutory authority, which prompted § 1367.'),
    ('cp-exxon', 2005, 'Under § 1367 one plaintiff’s qualifying claim carries others who fall short on amount, not on diversity.'),
])
tl('prejudgment', 'Due process before a seizure', 'What process is due before property is taken pending suit?', [
    ('cp-mullane', 1950, 'Notice must be reasonably calculated to reach the interested parties.'),
    ('cp-sniadach', 1969, 'Wage garnishment without a hearing violates due process.'),
    ('cp-fuentes', 1972, 'Replevin on an ex parte writ fails; a hearing is required before the taking, absent extraordinary need.'),
    ('cp-doehr', 1991, 'Mathews-style balancing for prejudgment attachment of a home.'),
])
tl('class', 'Class actions', 'When can one suit bind absent members?', [
    ('cp-hansberry', 1940, 'Absent members are bound only if adequately represented.'),
    ('cp-eisen', 1974, 'Individual notice to identifiable members, paid for by the plaintiff; no merits preview at certification.'),
    ('cp-shutts', 1985, 'Absent plaintiff class members need notice and an opt-out, not minimum contacts.'),
    ('cp-amchem', 1997, 'A settlement class still needs predominance and adequacy; a sprawling asbestos class fails.'),
    ('cp-ortiz', 1999, 'Limited-fund settlement classes need a real limited fund and equitable treatment.'),
    ('cp-walmart', 2011, 'Commonality needs a common contention whose answer drives the resolution.'),
    ('cp-standard-fire', 2013, 'A named plaintiff cannot stipulate away the class’s damages to defeat CAFA removal.'),
    ('cp-transunion', 2021, 'Every class member seeking damages needs Article III standing.'),
])
tl('sj', 'Summary judgment', 'When is there no genuine dispute of material fact?', [
    ('cp-adickes', 1970, 'The movant must foreclose the possibility of a factual dispute.'),
    ('cp-celotex', 1986, 'A movant without the burden can point to the absence of evidence on an essential element.'),
    ('cp-anderson-liberty', 1986, 'The evidentiary standard at trial governs whether a dispute is genuine.'),
    ('cp-matsushita', 1986, 'An implausible claim needs more persuasive evidence to reach a jury.'),
    ('cp-scott', 2007, 'A videotape can make a party’s version so blatantly contradicted that no jury could accept it.'),
    ('cp-tolan', 2014, 'Courts must still view the evidence in the light most favorable to the non-movant.'),
])
tl('nondelegation', 'Nondelegation', 'How much lawmaking power can Congress hand to the executive?', [
    ('lrs-s-brig-aurora', 1813, 'Congress may make a law’s operation depend on a fact the President finds.'),
    ('lrs-s-field', 1892, 'The President as “mere agent” of Congress in suspending tariff provisions.'),
    ('lrs-s-grimaud', 1911, 'Agencies may fill in details and attach criminal penalties set by Congress.'),
    ('lrs-s-hampton', 1928, 'The “intelligible principle” test.'),
    ('lrs-s-schechter', 1935, 'The one clear failure: codes of fair competition with no standard at all.'),
    ('lrs-s-yakus', 1944, 'Wartime price control upheld with a broad but bounded standard.'),
    ('lrs-s-amalgamated', 1971, 'Wage–price freeze upheld; standards drawn from context and history.'),
    ('lrs-i-benzene', 1980, 'Read the statute narrowly to avoid a delegation problem (Rehnquist would have struck it).'),
    ('lrs-s-mistretta', 1989, 'Sentencing Commission upheld; Scalia’s “junior varsity Congress” dissent.'),
    ('lrs-s-whitman', 2001, 'Intelligible principle restated; an agency cannot cure a delegation problem by self-limiting.'),
    ('lrs-s-gundy', 2019, 'Plurality upholds SORNA delegation; Gorsuch’s dissent would revive the doctrine.'),
])
tl('removal', 'Presidential removal power', 'Can Congress protect officers from removal at will?', [
    ('lrs-s-myers', 1926, 'The President may remove executive officers; Senate consent to removal is invalid.'),
    ('lrs-s-humphrey', 1935, 'Congress may protect “quasi-legislative, quasi-judicial” commissioners for cause.'),
    ('lrs-s-wiener', 1958, 'Adjudicatory bodies get for-cause protection even when the statute is silent.'),
    ('lrs-s-bowsher', 1986, 'Congress cannot keep removal power over an officer who executes the law.'),
    ('lrs-s-morrison', 1988, 'Good-cause protection is valid unless it impedes the President’s constitutional functions.'),
    ('lrs-s-slaughter', 2026, 'Humphrey’s Executor overruled: FTC commissioners are removable at will.'),
])
tl('appointments', 'Appointments Clause', 'Who is an officer, and who may appoint whom?', [
    ('lrs-s-buckley', 1976, 'Anyone exercising significant authority under federal law is an officer; Congress cannot appoint.'),
    ('lrs-s-freytag', 1991, 'Tax Court special trial judges are inferior officers; the Tax Court is a “court of law”.'),
    ('lrs-s-weiss', 1994, 'Military judges need no second appointment; their assignment is germane to the office.'),
    ('lrs-s-edmond', 1997, 'Inferior officers are those directed and supervised by principal officers.'),
    ('lrs-s-lucia', 2018, 'SEC ALJs are officers, so staff appointment was invalid.'),
    ('lrs-s-arthrex', 2021, 'PTAB judges act as principal officers unless the Director can review their decisions.'),
])
tl('deference', 'Judicial deference to agency interpretation', 'How much weight does an agency’s reading of a statute get?', [
    ('lrs-i-gray-powell', 1941, 'Deference to an agency’s application of a statutory term to facts.'),
    ('lrs-i-hearst', 1944, 'Same: “employee” under the NLRA; the Board’s reading stands if it has warrant in the record.'),
    ('lrs-i-skidmore', 1944, 'Respect according to the power to persuade.'),
    ('lrs-i-chevron', 1984, 'Two steps: clear statute controls; otherwise a reasonable agency reading wins.'),
    ('lrs-i-mead-note', 2001, 'Chevron applies only where Congress delegated authority to act with the force of law.'),
    ('lrs-i-brand-x', 2005, 'An agency may depart from a prior judicial reading of an ambiguous statute.'),
    ('lrs-i-king-burwell', 2015, 'The Court decides questions of deep economic and political significance itself.'),
    ('lrs-i-kisor', 2019, 'Auer deference narrowed: genuine ambiguity, reasonable reading, authoritative and expert.'),
    ('lrs-i-loper-bright', 2024, 'Chevron overruled; courts exercise independent judgment, with Skidmore respect remaining.'),
])
tl('mqd', 'Major questions', 'When does an agency need clear congressional authorization?', [
    ('lrs-i-benzene', 1980, 'A narrow reading avoids an unbounded delegation.'),
    ('lrs-i-king-burwell', 2015, 'Questions of deep significance are not left to the agency.'),
    ('lrs-i-alabama-realtors', 2021, 'The CDC eviction moratorium needs clear authorization.'),
    ('lrs-i-nfib-osha', 2022, 'The OSHA vaccine-or-test rule falls for want of clear authority.'),
    ('lrs-i-west-virginia', 2022, 'The doctrine is named: extraordinary cases need clear congressional authorization.'),
    ('lrs-i-biden-nebraska', 2023, 'Student-loan cancellation fails; Barrett explains the doctrine as contextual reading.'),
])
tl('hearing', 'Due process hearings', 'When is a hearing due, and what kind?', [
    ('lrs-o-londoner', 1908, 'An individualized assessment requires a hearing.'),
    ('lrs-o-bi-metallic', 1915, 'A general rule affecting many needs no individual hearing.'),
    ('lrs-o-goldberg', 1970, 'Welfare recipients get a pre-termination evidentiary hearing.'),
    ('lrs-o-roth', 1972, 'Property interests come from an entitlement, not from the Constitution; no interest for a one-year professor.'),
    ('lrs-o-perry', 1972, 'De facto tenure can be a property interest.'),
    ('lrs-o-arnett', 1974, 'The “bitter with the sweet” plurality; later rejected.'),
    ('lrs-o-mathews', 1976, 'Three-factor balancing: private interest, risk of error, government burden.'),
    ('lrs-o-loudermill', 1985, 'Some pre-termination process for tenured public employees; the bitter-with-the-sweet idea is dead.'),
])
tl('arbitrary', 'Arbitrary-and-capricious review', 'How closely do courts review agency reasoning?', [
    ('lrs-n-overton-park', 1971, 'Hard look at the record; the agency must show it considered the statute’s factors.'),
    ('lrs-n-state-farm', 1983, 'Rescinding a rule gets the same review; the agency must connect facts to choice.'),
    ('lrs-n-fcc-fox', 2009, 'A policy change needs a reasoned explanation, not a heightened one.'),
    ('lrs-n-commerce-new-york', 2019, 'A pretextual stated reason fails.'),
    ('lrs-n-regents', 2020, 'The agency must consider reliance interests and alternatives within its stated grounds.'),
    ('lrs-n-ohio-epa', 2024, 'Failure to respond to significant comments can sink a rule, even at the stay stage.'),
])
tl('standing', 'Article III standing', 'Who may sue in federal court?', [
    ('lrs-n-standing-sierra', 1972, 'Injury in fact, including aesthetic injury, but to the plaintiff itself.'),
    ('lrs-n-standing-lujan', 1992, 'Injury, causation, redressability; Congress cannot confer standing on everyone.'),
    ('lrs-n-standing-akins', 1998, 'An informational injury shared widely can still be concrete.'),
    ('lrs-n-standing-laidlaw', 2000, 'Reasonable concern that deters use of a river is injury; civil penalties can redress.'),
    ('lrs-n-massachusetts-epa', 2007, 'States get special solicitude; a small contribution to a large harm suffices.'),
    ('lrs-n-standing-spokeo', 2016, 'A bare statutory violation is not automatically concrete.'),
    ('cp-transunion', 2021, 'Concrete injury needs a close historical analogue; every class member must have it.'),
    ('lrs-n-standing-us-texas', 2023, 'States lack standing to force more arrests and prosecutions.'),
])
tl('rulemaking', 'Rulemaking and adjudication', 'When must an agency make policy by rule, and how much procedure is required?', [
    ('lrs-o-chenery-ii', 1947, 'Agencies may choose between rulemaking and adjudication.'),
    ('lrs-o-wyman-gordon', 1969, 'A purely prospective rule announced in adjudication is not a valid rule.'),
    ('lrs-o-florida-east-coast', 1973, 'Formal rulemaking only when the statute says “on the record after opportunity for a hearing”.'),
    ('lrs-o-bell-aerospace', 1974, 'The choice of adjudication over rulemaking is largely the agency’s.'),
    ('lrs-o-nova-scotia', 1977, 'Notice must disclose the data the agency relies on; concise statement must answer major comments.'),
    ('lrs-o-vermont-yankee', 1978, 'Courts cannot impose procedures beyond the APA.'),
    ('lrs-n-perez-mortgage-bankers', 2015, 'Interpretive rules need no notice and comment, even when they change.'),
])
tl('damages', 'Measuring contract damages', 'What does the injured party get, and where does the law stop?', [
    ('hadley', 1854, 'Consequential damages only when foreseeable at contracting.'),
    ('jacob-youngs', 1921, 'Substantial performance; diminution in value when the cost to cure is grossly out of proportion.'),
    ('rockingham', 1929, 'No recovery for costs run up after the other side repudiates.'),
    ('groves', 1939, 'Cost of completion even when it dwarfs the increase in land value.'),
    ('plante', 1960, 'Diminution for the misplaced wall; cost of repair for the rest.'),
    ('peevyhouse', 1963, 'Diminution in value when restoration is incidental and cost is grossly disproportionate.'),
    ('parker', 1970, 'Mitigation requires only comparable substitute employment.'),
])
tl('reliance', 'Enforcing promises through reliance', 'When does reliance make a promise enforceable?', [
    ('hamer', 1891, 'Forbearance is consideration; the law does not weigh benefit to the promisor.'),
    ('ricketts', 1898, 'A grandfather’s note enforced because the granddaughter quit her job in reliance.'),
    ('drennan', 1958, 'A subcontractor’s bid is held open by the general contractor’s reliance.'),
    ('feinberg', 1959, 'A pension promise enforced through retirement in reliance.'),
    ('dg-stout', 1991, 'Reliance damages for a promise not to terminate a distributorship.'),
    ('cohen-cowles', 1992, 'Promissory estoppel enforces a source-confidentiality promise.'),
])
tl('forms', 'Battle of the forms under § 2-207', 'Which terms govern when the forms do not match?', [
    ('dorton', 1972, '“Subject to” language is not an expressly conditional acceptance; the arbitration term goes to § 2-207(2).'),
    ('citoh', 1977, 'An expressly conditional acceptance fails; conduct forms the contract and the arbitration clause drops out.'),
    ('northrop', 1994, 'Knock-out rule for different terms; Code gap-fillers replace the conflicting warranty terms.'),
    ('hill-gateway', 1997, 'Terms in the box: the buyer accepts by keeping the computer past the return period.'),
    ('klocek', 2000, 'The opposite reading: the buyer is the offeror and the shipped terms are proposals under § 2-207(2).'),
    ('bayway', 2000, 'Material alteration under § 2-207(2)(b): the party resisting a term bears the burden of showing surprise or hardship.'),
])
tl('interpretation', 'Interpretation and the parol evidence rule', 'What evidence may explain or add to a writing?', [
    ('frigaliment', 1960, 'Meaning from trade usage, dealings and the contract’s own terms; the plaintiff must prove the narrower meaning.'),
    ('masterson', 1968, 'Evidence of a collateral agreement is admissible unless the parties would certainly have included it.'),
    ('pacific-gas', 1968, 'Words have no plain meaning apart from context; extrinsic evidence to show a reasonable meaning.'),
    ('trident', 1988, 'A reluctant application of Pacific Gas: even a clear clause may be explained by extrinsic evidence.'),
    ('www-associates', 1990, 'New York’s answer: an unambiguous writing is read on its face.'),
])
data['timelines'] = T
if data.get('dklaRelease'):
    data['dklaRelease']['contentBuild'] = 'r9b-2026-09-23'
data['updatedAt'] = TODAY
data['history'].append({'at': TODAY, 'action': 'Revision 9b: meta-commentary removed from entries; doctrine timelines added', 'revision': 9})

print(f'{removed_total} meta sentences removed from {touched} entries; {edge_hits} connection explanations trimmed; {len(T)} timelines with {sum(len(t["steps"]) for t in T)} steps')
if CHECK:
    sys.exit('check only; nothing written')
out = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
assert '</' not in out
html = html[:s0] + out + html[e0:]
open(HTML, 'w', encoding='utf-8').write(html)
print('wrote', HTML)
