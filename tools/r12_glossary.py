#!/usr/bin/env python3
"""Revision 12 / 14c: embed the legal dictionary (added-sources/glossary/glossary.json, Cornell LII Wex) as the
`dklaGlossary` block and link every Wex term an entry genuinely uses in its legal sense (`byNode`, ranked) with the
exact inverse (`usedBy`, cases first, then concepts and rules, then notes; each group by how central the term is).

Policy (see added-sources/glossary/LINKING.md):
- phrase matching on word tokens with plurals, possessives, verb inflections, hyphen/space variants, "§"/"section",
  "of 1934"-style suffixes and the alternatives Wex gives in parentheses; longest match wins, so "promissory estoppel"
  suppresses "estoppel" at that spot;
- Wex articles about cases (`kind: "case"`), catalogue noise and a list of generic words are never linked, and a term
  is never linked to the entry whose title it is (those entries are exposed separately as `titled`);
- common English words that Wex defines ("consideration", "notice", "party", "trust", "principal") are matched only
  when the words around them overlap the Wex definition (a Lesk-style sense test, IDF-weighted over the dictionary,
  with hand-added collocates from term-links.json); the test is easier in the title, rule line, Issue and Holding;
- capitalised words inside names ("Justice Story", "William E. Story", "v. Sidway") are skipped;
- ranking: title > rule line (summary) > Issue/Holding/Meaning > reasoning and facts > notes, times a specificity
  factor (terms that appear in most entries of a course rank low), longer phrases rank higher; at most 32 chips;
- `added-sources/glossary/term-links.json` adds or removes links per entry and per term.
Safe to re-run; skips with a warning when the glossary file is absent. Set DKLA_GLOSSARY_DEBUG=<path> to dump the
per-entry evidence as JSON."""
import json, math, os, re, sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.environ.get('DKLA_HTML') or os.path.join(ROOT, 'DKLA-r8.html')
GLOSS = os.path.join(ROOT, 'added-sources', 'glossary', 'glossary.json')
LINKS = os.path.join(ROOT, 'added-sources', 'glossary', 'term-links.json')
if not os.path.exists(GLOSS):
    print('no glossary yet; skipping'); sys.exit(0)
html = open(HTML, encoding='utf-8').read()
g = json.load(open(GLOSS, encoding='utf-8'))
terms = g['terms']
overrides = json.load(open(LINKS, encoding='utf-8')) if os.path.exists(LINKS) else {}
m = re.search(r'<script id="seedData"[^>]*>', html); s0, e0 = m.end(), html.find('</script>', m.end())
data = json.loads(html[s0:e0])
nodes = data['nodes']
try:
    from wordfreq import zipf_frequency as zipf
except ImportError:
    zipf = lambda w, l: 0.0

# ---------------------------------------------------------------- word lists
# Legal-only words: common in English but used only in their legal sense in a law-school atlas. Matched without a sense test.
LEGAL_ONLY = set('''plaintiff plaintiffs defendant defendants appellant appellee petitioner respondent jurisdiction jurisdictional
statute statutes precedent injunction liability negligence tort torts tortious remand certiorari waiver venue verdict indictment
arbitration mediation litigation lawsuit damages remedy remedies rescission restitution estoppel forfeiture garnishment subpoena
summons pleading pleadings counterclaim crossclaim impleader interpleader joinder interrogatories affidavit arraignment acquittal
defamation libel slander bailment easement foreclosure guarantor surety fiduciary trustee testator intestate probate codicil
promisor promisee offeror offeree obligor obligee assignor assignee delegatee unconscionable unconscionability voidable
unenforceable novation misrepresentation duress disaffirm disaffirmance severability illegality counteroffer nondelegation
textualism purposivism intentionalism preemption preempt preempted rulemaking adjudication adjudicative adjudicatory
justiciability justiciable mootness ripeness mandamus habeas jnov jmol interlocutory concurrence plurality curiam overrule
overruled overruling dicta dictum decisis scienter parol quantum meruit privity foreseeability rescind repudiate repudiation
anticipatory ratify ratification codify codification enact enactment appropriations impeachment impeach adjudicate deposition
stipulation acquit indict indicted prosecutor prosecutorial felony misdemeanor tortfeasor bailee bailor lessor lessee
mortgagee mortgagor subrogation indemnify indemnification garnish replevin detinue trover ejectment assumpsit devisee legatee
executory nonperformance reformation exculpatory liquidated consequential expectancy lien liens escrow annuity warranty
warranties beneficiary heir heirs devise bequest void enforceable mitigation fraud coercion incapacity revocation revoke
boilerplate adhesion preclusion legislature legislative legislation veto
alienage domicile appropriation nuisance trespass defamation covenant
covenants deed mortgage mortgages guaranty guaranties conviction sentencing parole probation prosecute prosecution complaint
counterclaims pleaded plead unconstitutional evidentiary allegation allegations allege alleged testimony testify unanimous
timely prejudice discretionary discretion amicus vacate vacated affirm affirmed dismiss dismissed dismissal reversal
objection enjoin enjoined sanction sanctions presumption inference immunity relief injury injuries forum petition
movant counsel construe construed promulgate promulgated capricious severable unlawful negligent erroneous retroactive
retroactivity nonresident creditor creditors debtor debtors insurer insured licensee licensor malpractice impracticability
stipulate stipulated demur indemnity noncompete disclaim disclaimer concealment malfeasance grievance rehearing
subcontractor subcontractors offerors offerees promisors promisees assignees assignors tortfeasors interpleader movants
appellants appellees petitioners respondents lessors lessees mortgagees trustees beneficiaries guarantors sureties
fiduciaries testators heirs codicils bequests legatees devisees intestacy breach breached breaches liable forbearance gratuitous
detriment promissory assent mutuality illusory offeror offeree rescission repudiate anticipatory nonconforming conforming
merchant merchants seasonable seasonably impracticability frustration unconscionability antitrust conspiracy remittitur
justiciable severability injunctive declaratory interlocutory appealable reviewable unreviewable arbitrary capricious
substantive procedural evidentiary jurisdictional preclusive'''.split())
LEGAL_ONLY |= {'election of remedies'}
# Generic words of the courtroom: linked only when they are in the entry's title (a chip on every entry would say nothing).
GENERIC = set('''court courts judge judges law laws case cases legal federal state states opinion opinions decision decisions
ruling rule rules act acts statute statutes plaintiff plaintiffs defendant defendants party parties appeal appeals trial trials
claim claims judgment judgments holding held issue issues evidence argument arguments question questions fact facts majority
dissent dissents justice justices record review may shall will people see make take use set let call per post move check
information government congress president senate house constitution constitutional lawsuit litigation procedure civil criminal
petitioner respondent appellant appellee counsel attorney lawyer brief briefs motion motions order orders proceeding proceedings
respondents petitioners doctrine doctrines test tests standard standards element elements finding findings conclusion
decide decided cite citation citations cited authority basis approach argument challenge request response
term terms time year note notes title reasonable status entry entity relevant irrelevant exception right rights
judicial policy public person persons class practice setting member members control structure comment reports document
documents count access attempt factor factors object draft resolution advance listed improvement equivalent adjustment
preference responsible deliberate participate instruction instructions family death health share company business prove
proof value information data media internet read see make take use set let call move check stay post
appear appearance thereafter versus i.e. e.g. e.g., cf. et al. a.k.a. j. v. so ordered see also see generally but see
compare with read on going out going dark no signal name key help-style your honor definitions words of art
supreme court district court circuit court lower court trial court appellate court federal court federal courts
state court state supreme court court of appeal(s) court of law chief justice associate justice civil case criminal case
civil action legal action case law question of law question of fact matter of law conclusion of law conclusion of fact
finding of fact civil procedure criminal procedure constitutional law contract law common law rule of law body of laws
law school legal education legal research legal writing american law perspective law in books law in action
starting a new article getting started as an author references" primary authority secondary authority
act of congress united states federal government supreme court of the united states u.s. supreme court
attorney general solicitor general d.a. j.d. institutions internet http html css blog cookie spam database algorithm
media'''.split('\n'))
GENERIC = {w for line in GENERIC for w in line.split()}
GENERIC |= {'supreme court', 'district court', 'circuit court', 'lower court', 'trial court', 'appellate court', 'federal court',
            'federal courts', 'state court', 'state supreme court', 'court of appeals', 'court of appeal', 'court of law', 'chief justice',
            'associate justice', 'civil case', 'criminal case', 'civil action', 'legal action', 'case law', 'question of law',
            'question of fact', 'matter of law', 'conclusion of law', 'conclusion of fact', 'finding of fact', 'civil procedure',
            'criminal procedure', 'constitutional law', 'contract law', 'common law', 'rule of law', 'body of laws', 'law school',
            'legal education', 'legal research', 'legal writing', 'american law perspective', 'law in books', 'law in action',
            'starting a new article', 'getting started as an author', 'primary authority', 'secondary authority', 'act of congress',
            'united states', 'federal government', 'attorney general', 'solicitor general', 'so ordered', 'see also', 'see generally',
            'but see', 'compare with', 'read on', 'going out', 'going dark', 'no signal', 'name key', 'help style', 'your honor',
            'words of art', 'et al', 'a k a', 'i e', 'e g', 'cf', 'j', 'v', 'legal system', 'legal systems', 'justice system',
            'question presented', 'court order', 'court rules', 'rules of court', 'local rules', 'legal papers', 'moving party'}
# Everyday phrases that Wex defines: matched only when the words around them fit the definition.
AMBIG_PHRASES = {'as is', 'in re', 'in kind', 'may issue', 'sounds in', 'home office', 'home study', 'effective date', 'special circumstances',
                 'waiting period', 'useful life', 'face value', 'good cause', 'just cause', 'on demand', 'in fact', 'at will', 'no contest',
                 'not guilty', 'going concern', 'shall issue', 'on or about', 'on or before', 'first impression', 'new matter', 'off calendar',
                 'out of court', 'open court', 'able to work', 'know how', 'natural resources', 'national security', 'human rights',
                 'natural person', 'race to the bottom', 'clean room', 'read on', 'special needs', 'health benefits', 'common area'}
STOP = set('''a an the and or but of to in on at by for with from as is are was were be been being this that these those it its
their his her they them he she we you i not no nor so such than then there here which who whom whose what when where why how
if into upon under over between among within without about after before during through per via also any all each other
another some more most many much very can could may might must shall should will would do does did done has have had having
one two three first second third own same only just even still yet both either neither every own other others etc'''.split())

def norm(s):
    s = str(s or '').lower().replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"').replace('–', '-').replace('—', ' ')
    s = re.sub(r'§+', ' section ', s).replace('u.s.c.', ' usc ').replace('u.s.', ' us ')
    s = re.sub(r"(\w)'s\b", r'\1', s); s = re.sub(r"s'\s", 's ', s + ' ')
    s = re.sub(r'(?<=\w)-(?=\w)', ' ', s)
    s = re.sub(r"[^a-z0-9 ]+", ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

def singular(w):
    if len(w) < 4 or not w.endswith('s') or w.endswith(('ss', 'us', 'is', 'ous')): return w
    if w.endswith('ies'): return w[:-3] + 'y'
    if w.endswith(('ches', 'shes', 'sses', 'xes', 'zes')): return w[:-2]
    return w[:-1]

# Wex headings that are verbs (their -ed/-ing forms are matched); every other single word gets only its plural.
VERBS = set('''remand affirm reverse vacate dismiss overrule waive enjoin allege plead adjudicate construe promulgate delegate rescind
repudiate ratify tender cure discharge assign accept perform breach incorporate indemnify disclaim stipulate demur prosecute
convict acquit testify sue register publish distinguish intervene join amend enact codify preempt appeal consent promise offer
object protest settle release transfer grant demand default execute revoke terminate mitigate foreclose garnish subpoena impeach
indict arraign sentence charge condition contract counterclaim implead interplead certify decertify recuse abstain abrogate
adopt annul appoint arbitrate attach bind bribe cite claim commit compel confess conspire convey deed deliver deny deprive
detain devise disaffirm disbar disqualify dissent elect enforce estop evict excuse exempt extradite forfeit forge frustrate
guarantee hold impair imply impute incur induce infringe injure interpret levy license litigate merge modify novate nullify
obligate opine pardon perjure petition pledge preclude prejudice prescribe presume probate quash quiet recover redeem reform
reimburse reinstate reject relinquish remit repeal replevy rescue rest restrain retain revert review sanction seize sequester
serve settle sever solicit stay strike sublet subrogate summon supersede suppress sustain tax toll usurp vest void warrant
withdraw witness plead remove reserve amend abandon abate accede acquire admit advise affix allot alter apportion appropriate
assault assent avoid bargain bequeath breach certify commute compound concur condemn confine confiscate consign construe
contest convene cross-examine defame defraud demise depose derogate disclose discover disinherit dispose dissolve distrain
divest domicile embezzle emancipate enjoin enter entrust escheat evade examine exclude exonerate expunge extinguish foreclose
harbor hire impound indemnify indorse inherit injoin insure invalidate issue joinder lapse lease legislate liquidate misappropriate
misrepresent mortgage negotiate nominate notarize offset overturn own partition pay perfect permit possess prohibit promulgate
propound prorate prosecute purport ratify rebut recant reconvey record redress refuse regulate rehear relate remand render
renounce repossess represent rescind reside resign restitute retract retry reverse revoke rule secede secure sell shift slander
stipulate submit subpoena substitute suspend tamper tolerate trespass try undertake underwrite vacate validate vest vitiate
waive warrant'''.split())
# Legal senses that are never plural: "considerations", "interests", "titles" and "performances" are the everyday words.
NO_PLURAL = {'consideration', 'interest', 'title', 'capacity', 'performance', 'reliance', 'standing', 'notice', 'discovery', 'service', 'process', 'relief', 'account', 'authority', 'agency', 'commerce', 'labor', 'security', 'equity', 'practice', 'construction', 'possession', 'satisfaction', 'protest', 'trust', 'removal', 'delivery', 'default', 'discharge', 'material', 'condition', 'value', 'benefit', 'exchange', 'regulation', 'policy', 'good faith', 'due process'}
def inflections(w, verbs=True, plural=True):
    out = {w}
    if w.isdigit(): return out
    if plural:
        if w.endswith('y') and len(w) > 2 and w[-2] not in 'aeiou': out.add(w[:-1] + 'ies')
        elif w.endswith(('s', 'x', 'z', 'ch', 'sh')): out.add(w + 'es')
        else: out.add(w + 's')
    if verbs and len(w) > 3:
        if w.endswith('e'): out |= {w + 'd', w[:-1] + 'ing'}
        elif w.endswith('y') and w[-2] not in 'aeiou': out |= {w[:-1] + 'ied', w + 'ing'}
        else:
            out |= {w + 'ed', w + 'ing'}
            if re.search(r'[^aeiou][aeiou][bdgklmnprt]$', w) and not w.endswith(('er', 'en', 'on', 'it', 'et', 'al', 'el', 'ow', 'ain')):
                out |= {w + w[-1] + 'ed', w + w[-1] + 'ing'}
    return out

# ---------------------------------------------------------------- terms → match patterns
JUNK = re.compile(r'^[(\s]|"|^Starting a new|^getting started|^help-style|^References|^Dodd-Frank:|^Service \(2002\)|^Section 4 \(1|^[A-Z]\.$')
never = set(overrides.get('never', []))
never_in = {k: set(v) for k, v in overrides.get('neverInCourse', {}).items()}   # slug -> courses that use the word in another sense
block_next = {k: {norm(x) for x in v} for k, v in overrides.get('blockedNextWords', {}).items()}   # slug -> following words that mark another sense
legal_only_extra = set(overrides.get('legalOnly', []))
collocates = {k: set(norm(x) for x in v) for k, v in overrides.get('collocates', {}).items()}

def variants(term):
    """All surface forms of a Wex heading: alternatives in parentheses, with and without 'of 1934', qualifiers dropped."""
    out, ambiguous = set(), False
    t = term.strip()
    alts = [t]
    for mm in re.finditer(r'\(([^)]*)\)', t):
        inner = mm.group(1).strip()
        base = (t[:mm.start()] + t[mm.end():]).strip(' ,')
        if inner.lower().startswith('or '):
            alts += [base, inner[3:].strip()]
        elif inner == 's':
            alts += [base, t[:mm.start()] + 's' + t[mm.end():]]
        elif re.fullmatch(r'[A-Z][A-Za-z.&-]{1,9}', inner) or re.fullmatch(r'\d{4}', inner):
            alts += [base, inner] if not inner.isdigit() else [base]
        else:
            alts.append(base); ambiguous = True
    alts = [a for a in alts if '(' not in a]
    more = []
    for a in alts:
        mm = re.search(r'\s+of\s+(\d{4})$', a)
        if mm: more.append(a[:mm.start()])
        if a.lower().startswith('the '): more.append(a[4:])
    alts += more
    for a in alts:
        if is_abbrev(a): continue   # "UCC", "FRCP": matched case-sensitively on the original text instead
        k = norm(a)
        if k: out.add(k)
        if '-' in a: out.add(norm(a.replace('-', '')))
    return out, ambiguous

def is_abbrev(s):
    s = s.strip().replace('.', '')
    return bool(re.fullmatch(r'[A-Z][A-Z0-9&]{1,7}', s)) and len(s) >= 3

patterns = {}   # slug -> dict(forms: list of token-form lists, sense: bool, abbrev: set, words: int)
by_slug = {}
for t in terms:
    if t.get('kind') == 'case' or JUNK.search(t['term']) or t['slug'] in never: continue
    if len(t.get('definition') or '') < 40: continue
    by_slug[t['slug']] = t
    keys, ambiguous = variants(t['term'])
    abbrevs = {a.strip().replace('.', '') for a in re.split(r'[()]', t['term']) if is_abbrev(a)}
    keys = {k for k in keys if k and not k.isdigit() and len(k) >= 3 and k not in STOP}
    if not keys and not abbrevs: continue
    forms = []
    for k in keys:
        ws = k.split()
        if any(len(w) == 1 and not w.isdigit() for w in ws) and len(ws) > 1 and k not in ('rule 12 b 6',): continue
        toks = []
        for i, w in enumerate(ws):
            if w in STOP or w.isdigit(): toks.append({w}); continue
            last = i == len(ws) - 1
            toks.append(inflections(w, verbs=last and (len(ws) == 1 and w in VERBS or len(ws) > 1 and ws[0] in ('to',)), plural=k not in NO_PLURAL or not last))
        forms.append(toks)
    if not forms and not abbrevs: continue
    # which terms need the sense test
    base = min(keys, key=len) if keys else ''
    ws = base.split()
    freq = [zipf(w, 'en') for w in ws if w not in STOP and not w.isdigit()]
    # sense classes: 'common' (an everyday word Wex defines: strict test), 'rare' (a technical word that may still have
    # an everyday sense, like "abstention": lenient test), 'phrase' (an everyday phrase or a heading Wex had to qualify
    # in parentheses: moderate test), None (no test)
    sense = 'phrase' if ambiguous else None
    trusted = base in LEGAL_ONLY or t['slug'] in legal_only_extra or any(w in LEGAL_ONLY for w in ws)
    if len(ws) == 1 and not trusted and freq:
        sense = 'common' if freq[0] >= 3.3 else 'rare'
    if len(ws) > 1 and (base in AMBIG_PHRASES or re.fullmatch(r'section \d+', base)): sense = 'phrase'
    generic = base in GENERIC or (len(ws) == 1 and ws[0] in GENERIC)
    patterns[t['slug']] = {'forms': forms, 'abbrev': abbrevs, 'sense': sense, 'generic': generic, 'nwords': len(ws), 'key': base}

first = defaultdict(list)   # first-token form -> [(slug, form index)]
for slug, p in patterns.items():
    for fi, toks in enumerate(p['forms']):
        for f in toks[0]: first[f].append((slug, fi))
abbr_index = defaultdict(list)
for slug, p in patterns.items():
    for a in p['abbrev']: abbr_index[a].append(slug)
print(len(terms), 'terms;', len(patterns), 'usable for matching;', dict(Counter(p['sense'] for p in patterns.values())))

# ---------------------------------------------------------------- definition keywords for the sense test (Lesk)
def_words = {}
df_defs = Counter()
for slug, p in patterns.items():
    d = norm(by_slug[slug].get('definition', ''))
    ws = {singular(w) for w in d.split() if w not in STOP and len(w) > 2 and not w.isdigit()}
    def_words[slug] = ws
    df_defs.update(ws)
ND = len(def_words)
KEY_STOP = set('''example examples means meaning refers referred term terms context legal law laws person persons people entity
entities individual individuals someone something generally usually typically often commonly including include includes
called known also used use uses using may must common different various certain specific general particular based
form forms type types way ways part parts result results one two three number act acts action actions matter matters
thing things word words phrase definition defined define wex dictionary compilation september 2026 read here made make
making given give gives giving take taken takes taking put puts set sets get gets got need needs needed'''.split())
# how many entries use each word: a definition word that most entries use ("authority", "jurisdiction") is weak evidence
def entry_word_set(n):
    return {singular(w) for w in norm(' '.join([n.get('title', ''), n.get('summary', ''), n.get('notes') or '', *[str(v) for v in (n.get('sections') or {}).values()]])).split()}
entry_df = Counter()
for n in nodes: entry_df.update(entry_word_set(n))
NN = max(1, len(nodes))
def keyweights(slug):
    own = {singular(w) for f in patterns[slug]['forms'] for tok in f for w in tok}
    out, phrases = {}, []
    stems = {w[:4] for w in own if len(w) >= 6}   # "consider…" is no evidence for "consideration", "serve" none for "service"
    for w in def_words[slug]:
        if w in own or w in GENERIC or w in KEY_STOP or zipf(w, 'en') > 5.0 or (len(w) >= 5 and w[:4] in stems): continue
        spec = max(0.2, 1 - 3 * entry_df[w] / NN)
        out[w] = min(3.0, math.log((ND + 1) / (df_defs[w] + 1)) * 0.6) * spec
    for c in collocates.get(slug, ()):
        ws = [singular(x) for x in norm(c).split()]
        if not ws: continue
        if len(ws) == 1:
            w = ws[0]
            if w in own or w in STOP or w in GENERIC or w in KEY_STOP: continue
            out[w] = 3.5   # a hand-listed word is trusted whatever its frequency ("offer" beside "acceptance")
        else:
            phrases.append(tuple(ws))   # matched as a contiguous run of tokens near the term
    return out, phrases
unknown = [s for s in collocates if s not in patterns]
if unknown: print('term-links.json: collocates for unknown or unlinkable slugs:', unknown)
KEYS, PHRASES = {}, {}
for slug, p in patterns.items():
    if p['sense']: KEYS[slug], PHRASES[slug] = keyweights(slug)
STRICT = {'abstention', 'solicitation', 'publication', 'execution', 'reservation', 'deliberate', 'disposition', 'gambling', 'swear', 'servant'}

def course_of(n):
    c = ' '.join(n.get('courses') or [])
    return 'lrs' if 'Legislation' in c else 'civil' if 'Civil' in c else 'contracts' if 'Contract' in c else 'other'

def entry_words(n):
    return {singular(w) for w in norm(' '.join([n.get('title', ''), n.get('summary', ''), n.get('notes') or '', *[str(v) for v in (n.get('sections') or {}).values()]])).split()}

# course vocabulary: words used by at least 3% of a course's entries; a term whose definition lives in that vocabulary
# (consideration, offer, promise in Contracts; notice, forum in Civil Procedure) needs less local evidence
course_docs = defaultdict(Counter); course_n = Counter()
for n in nodes:
    c = course_of(n); course_n[c] += 1
    course_docs[c].update(entry_words(n))
course_vocab = {c: {w for w, k in cnt.items() if k >= max(3, .03 * course_n[c]) and w not in STOP and w not in GENERIC and w not in KEY_STOP and zipf(w, 'en') <= 5.0}
                for c, cnt in course_docs.items()}
def affinity(slug, course):
    keys = KEYS[slug]; total = sum(keys.values())
    return sum(w for k, w in keys.items() if k in course_vocab.get(course, ())) / total if total else 0.0
AFF = {}

# ---------------------------------------------------------------- entry text → tokens
CORE = {'title', 'summary', 'Issue', 'Holding', 'Meaning', 'Rule statement', 'Key line'}
FIELD_W = {'title': 12, 'summary': 8, 'Issue': 5, 'Holding': 5, 'Meaning': 5, 'Key line': 6, 'Rule statement': 6, 'Reasoning': 3,
           'How to work through the question': 3, 'Material Facts': 2.5, 'Procedural History': 2.5, 'Parties': 2, 'notes': 1.5}
NAME_PREV = {'justice', 'judge', 'j', 'chief', 'mr', 'mrs', 'ms', 'dr', 'v', 'jj', 'justices', 'judges', 'senator', 'president', 'professor', 'governor', 'mayor', 'general', 'secretary', 'commissioner'}
TOK = re.compile(r"[A-Za-z0-9§]+(?:[.'’-][A-Za-z0-9]+)*\.?|[.?!;:]")

def tokens_of(text, field):
    """[(form, cap, sstart, field)] plus '' boundary tokens; abbreviations keep their upper-case form in `abbr`."""
    out = []
    sstart = True
    for mm in TOK.finditer(text.replace('§', ' § ')):
        raw = mm.group(0)
        if raw in '.?!;:':
            sstart = True; continue
        abbr = raw.replace('.', '') if re.fullmatch(r'(?:[A-Z]\.){2,}|[A-Z][A-Z0-9&]{1,7}\.?', raw) else None
        k = norm(raw)
        if not k:
            continue
        cap = raw[0].isupper()
        for j, w in enumerate(k.split()):
            out.append((w, cap and j == 0, sstart, field, abbr if j == 0 else None))
            sstart = False
    return out

def entry_fields(n):
    strip = lambda t: re.sub(r'\s+[—-]\s+\w+ account$', '', t or '')   # "— Katzmann account" is the atlas's own label
    yield 'title', strip(n.get('title', ''))
    if n.get('shortTitle') and n['shortTitle'] != n.get('title'): yield 'title', strip(n['shortTitle'])
    yield 'summary', n.get('summary', '')
    for k, v in (n.get('sections') or {}).items():
        yield k, str(v)
    for para in (n.get('notes') or '').split('\n\n'):
        mm = re.match(r'(Key line|Rule statement|Rule in one line|Citation and rule(?: statement)?|Rule stated by the court):\s*', para)
        if mm: yield 'Key line', para[mm.end():]
        elif re.match(r'(Citation|Court|Names for the exam):', para): yield 'names', para
        else: yield 'notes', para

def own_titles(n):
    out = set()
    for t in (n.get('title'), n.get('shortTitle')):
        if not t: continue
        k = norm(t); out.add(k)
        for sep in (':', ' - ', '(', ','):
            if sep in t: out.add(norm(t.split(sep)[0]))
        out.add(norm(re.sub(r'^(the|a|an) ', '', k)))
    return {o for o in out if o}

def match_entry(n):
    """Return {slug: {'fields': Counter, 'sense': [scores], 'occ': int}} for one entry."""
    toks = []
    for field, text in entry_fields(n):
        toks += tokens_of(text, field); toks.append(('', False, True, field, None))
    forms = [t[0] for t in toks]
    sing = [singular(w) for w in forms]
    own = own_titles(n)
    docset = set(sing); course = course_of(n); doc_cache = {}
    def doc_score(slug):
        """Definition words found anywhere in the entry (distinct, weighted, capped): is this entry about the term's field?"""
        if slug not in doc_cache:
            doc_cache[slug] = min(12.0, sum(w for x, w in KEYS[slug].items() if x in docset))
        return doc_cache[slug]
    def doc_keys(slug):
        return sum(1 for x in KEYS[slug] if x in docset)
    found = defaultdict(lambda: {'fields': Counter(), 'sense': [], 'occ': 0, 'weak': 0})
    i, L = 0, len(toks)
    while i < L:
        w, cap, sstart, field, abbr = toks[i]
        if not w: i += 1; continue
        best = None
        # abbreviations, case-sensitive
        if abbr and abbr in abbr_index and field != 'names':
            best = (1, abbr_index[abbr][0], True)
        for slug, fi in first.get(w, ()):
            pat = patterns[slug]['forms'][fi]
            ln = len(pat)
            if i + ln > L: continue
            ok = all(forms[i + j] in pat[j] for j in range(ln))
            if not ok: continue
            if best is None or ln > best[0]: best = (ln, slug, False)
        if best is None: i += 1; continue
        ln, slug, is_abbr = best
        p = patterns[slug]
        key = ' '.join(forms[i:i + ln])
        # skip the entry's own title, names, generic words outside the title
        skip = any(k in own for k in (key, p['key'], ' '.join(sing[i:i + ln])))
        if field == 'names': skip = True
        if p['generic']: skip = True
        if slug in block_next and i + ln < L and forms[i + ln] in block_next[slug]: skip = True   # "assigned pages", "assigned reading"
        if not skip and ln == 1 and not is_abbr and cap and not sstart:
            prev = forms[i - 1] if i > 0 else ''
            nxt = toks[i + 1] if i + 1 < L else ('', False, True, field, None)
            if prev in NAME_PREV or nxt[0] == 'v' or (nxt[1] and not nxt[2]) or (i > 0 and toks[i - 1][1] and not toks[i - 1][2]):
                skip = True
        if not skip:
            rec = found[slug]
            if p['sense']:
                keys = KEYS[slug]
                lo, hi = max(0, i - 24), min(L, i + ln + 24)
                window = {sing[j] for j in range(lo, hi) if not (i <= j < i + ln)}
                hit = {x: keys[x] for x in window if x in keys}
                score, nk = sum(hit.values()), len(hit)
                curated = any(w >= 3.5 for w in hit.values()) or any(
                    any(tuple(sing[j:j + len(ph)]) == ph for j in range(lo, hi - len(ph) + 1)) for ph in PHRASES[slug])
                doc = doc_score(slug)
                aff = AFF.get((slug, course))
                if aff is None: aff = AFF[(slug, course)] = affinity(slug, course)
                rec['sense'].append((field[:4], round(score, 1), nk, round(doc, 1), round(aff, 2), sorted(hit, key=lambda x: -hit[x])[:4]))
                core = field in CORE
                mult = 1 - 0.5 * aff
                top = max(hit.values()) if hit else 0
                if course in never_in.get(slug, ()):
                    ok = False   # the course uses the word in another sense throughout ("agency" in LRS)
                elif p['sense'] == 'common':
                    # a hand-listed collocate settles it; otherwise two definition words nearby, one of them specific
                    # (less is needed when the term's definition lives in the course's own vocabulary)
                    ok = curated or (nk >= 2 and top >= 2.0 and score >= (3.5 if core else 5.0) * mult)
                elif p['sense'] == 'rare':
                    # a technical word: a definition word nearby, or an entry steeped in the term's field; more is
                    # needed for a word on the STRICT list (an everyday sense common in these texts) or whose
                    # definition is far from the course's vocabulary
                    if slug in STRICT or aff < 0.15: ok = curated or (nk >= 2 and score >= 1.5)
                    else: ok = curated or (nk >= 2 and score >= 1.5) or top >= 2.0 or (nk >= 1 and doc >= 4.0 and doc_keys(slug) >= 3) or aff >= 0.45
                else:
                    ok = curated or (nk >= 2 and score >= 3.0)
                if not ok:
                    rec['weak'] += 1
                    i += ln; continue
            rec['fields'][field] += 1; rec['occ'] += 1
        i += ln
    return dict(found)   # records with occ 0 failed the sense test everywhere; kept for the debug dump

hits = {n['id']: match_entry(n) for n in nodes}
adds = overrides.get('add', {}); removes = overrides.get('remove', {})
for nid, slugs in adds.items():
    for s in slugs:
        if s in by_slug and nid in hits: hits[nid].setdefault(s, {'fields': Counter({'summary': 1}), 'sense': [], 'occ': 1, 'weak': 0})['curated'] = True
for nid, slugs in removes.items():
    for s in slugs: hits.get(nid, {}).pop(s, None)

# ---------------------------------------------------------------- ranking
kind_of = {n['id']: n.get('kind') for n in nodes}
course_nodes = Counter(course_of(n) for n in nodes)
node_course = {n['id']: course_of(n) for n in nodes}
df_course = defaultdict(Counter)
for nid, found in hits.items():
    for s in found:
        if found[s]['occ']: df_course[node_course[nid]][s] += 1
scores = {}
CAP = 32
for nid, found in hits.items():
    c = node_course[nid]; N = max(1, course_nodes[c])
    ranked = []
    for s, r in found.items():
        if not r['occ']: continue
        raw = sum(FIELD_W.get(f, 2) * (1 + math.log2(cnt)) for f, cnt in r['fields'].items())
        share = df_course[c][s] / N
        spec = 0.3 + 0.7 * (1 - share) ** 2
        length = 1 + 0.35 * (patterns[s]['nwords'] - 1) if s in patterns else 1
        sc = raw * spec * length
        if r.get('curated'): sc = max(sc, 20)
        # a single mention in the notes or facts of a word most entries use says nothing about this entry
        core = any(f in CORE for f in r['fields'])
        low_only = all(f in ('notes', 'Parties', 'Procedural History') for f in r['fields'])
        if low_only and r['occ'] == 1 and share > 0.12: continue
        if sc < 1.2: continue
        ranked.append((sc, s))
    ranked.sort(key=lambda x: (-x[0], x[1]))
    scores[nid] = ranked[:CAP]
by_node = {nid: [s for _, s in rk] for nid, rk in scores.items() if rk}
GROUP = {'Case': 0, 'Concept': 1, 'Rule': 1, 'Note': 2, 'Hypothetical': 2}
used = defaultdict(list)
for nid, rk in scores.items():
    for sc, s in rk: used[s].append((GROUP.get(kind_of[nid], 2), -sc, nid))
used_by = {s: [nid for _, _, nid in sorted(v)] for s, v in used.items()}
titled = defaultdict(list)
slug_by_key = {}
for slug, p in patterns.items():
    for f in p['forms']: slug_by_key.setdefault(' '.join(sorted(tok, key=len)[0] for tok in f), slug)
for n in nodes:
    for k in own_titles(n):
        if k in slug_by_key: titled[slug_by_key[k]].append(n['id'])
titled = {s: sorted(set(v), key=lambda i: (GROUP.get(kind_of[i], 2), i)) for s, v in titled.items()}
links = sum(len(v) for v in by_node.values())
print(len(by_node), 'entries with terms;', links, 'links;', len(used_by), 'terms used;', len(titled), 'terms with their own entry')

if os.environ.get('DKLA_GLOSSARY_DEBUG'):
    dbg = {nid: {'kind': kind_of[nid], 'course': node_course[nid], 'chips': [(round(sc, 1), s, dict(hits[nid][s]['fields']), hits[nid][s]['sense'][:6]) for sc, s in scores[nid]],
                 'dropped': [(s, dict(r['fields']), r['sense'][:6], r['weak']) for s, r in hits[nid].items() if s not in by_node.get(nid, [])]} for nid in hits}
    json.dump(dbg, open(os.environ['DKLA_GLOSSARY_DEBUG'], 'w'), indent=0, default=str)

# ---------------------------------------------------------------- embed
for t in terms:
    if t['term'].isupper() and len(t['term']) > 3 and not is_abbrev(t['term']):
        t['term'] = t['term'].lower()
block_obj = {'source': g.get('source', ''), 'built': g.get('built', ''),
             'titles': {n['id']: n.get('shortTitle') or n['title'] for n in nodes if n['id'] in by_node or any(n['id'] in v for v in titled.values())},
             'kinds': {n['id']: n.get('kind') for n in nodes if n['id'] in by_node or any(n['id'] in v for v in titled.values())},
             'terms': [{k: t[k] for k in ('term', 'slug', 'definition', 'source', 'url', 'kind') if k in t} for t in terms],
             'byNode': by_node, 'usedBy': used_by, 'titled': titled}
sj = json.dumps(block_obj, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
block = f'<script id="dklaGlossary" type="application/json">{sj}</script>\n'
if 'id="dklaGlossary"' in html:
    html = re.sub(r'<script id="dklaGlossary" type="application/json">.*?</script>\n', lambda _: block, html, count=1, flags=re.S)
else:
    html = html.replace('<script id="dklaIcons"', block + '<script id="dklaIcons"', 1)
open(HTML, 'w', encoding='utf-8').write(html)
print('dklaGlossary block', len(sj) // 1024, 'KB')
