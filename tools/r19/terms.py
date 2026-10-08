#!/usr/bin/env python3
"""Link dictionary terms and briefs both ways (r20).

The dictionary already links each Wex term to the entries whose own text uses it (tools/r12_glossary.py). This adds
(1) a few interpretive-canon and doctrine terms Wex lacks (noscitur a sociis, expressio unius, in pari materia ...),
(2) links found in the audited briefs, for cases on the map and for supporting cases.

Writes tools/r18/glossary-extra.json (new terms; extra links for map entries, merged into the dictionary block by the
r18 build so both the entry's term chips and the term's "entries that use this term" show them) and
tools/r19/data/term-links.json (supporting case -> terms; the r19 layer shows these in the dictionary and in the brief).

Matching is by whole phrase on word tokens, plural-tolerant. Only distinctive terms are linked from brief text:
multi-word terms, single words on the r12 legal-only list, and the new terms; terms found in more than a fifth of
all briefs are skipped. Re-run after the briefs or the dictionary change.
"""
import json, math, re, unicodedata
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parents[1]
DATA = HERE / "data"

NEW_TERMS = [
    ("noscitur a sociis", ["noscitur"], "Noscitur a sociis (\"it is known by its associates\") is a canon of construction: a word of uncertain meaning in a list or phrase takes its sense from the words around it. A court uses it to read a broad or ambiguous word narrowly, in keeping with its neighbours, so that the word is not given a reach the rest of the provision does not support. It is close kin to ejusdem generis, which applies the same idea to a general catch-all term at the end of a list."),
    ("expressio unius est exclusio alterius", ["expressio unius", "inclusio unius"], "Expressio unius est exclusio alterius (\"the expression of one thing is the exclusion of another\") is a canon of construction: when a text lists specific items, things left off the list are presumed to have been left out on purpose. The inference is only as strong as the reason to think the list was meant to be complete; it carries little weight where the items are examples."),
    ("in pari materia", [], "In pari materia (\"on the same subject\") is a canon of construction: statutes or provisions that deal with the same subject are read together, so that a word or scheme in one is understood in light of the other and the two are harmonised where possible."),
    ("plain meaning rule", ["plain meaning"], "The plain meaning rule holds that when the words of a statute or contract are clear on their face, a court applies them as written and does not look to outside evidence of purpose or intent to vary them. In statutory interpretation it is the starting point of textualism; in contract law it limits the use of extrinsic evidence to cases of ambiguity."),
    ("absurdity doctrine", ["absurd result", "absurd results"], "The absurdity doctrine allows a court to depart from the literal words of a statute when applying them as written would produce a result so unreasonable that the legislature could not have intended it. It is a narrow safety valve, classically associated with Church of the Holy Trinity v. United States."),
    ("rule against surplusage", ["surplusage canon", "superfluous"], "The rule against surplusage is a canon of construction: a text should be read so that every word and clause has effect, and no part is left redundant or meaningless. Courts treat it as a presumption, since drafters do sometimes repeat themselves."),
    ("series-qualifier canon", ["series qualifier"], "The series-qualifier canon holds that when a modifier follows (or precedes) a straightforward parallel series of nouns or verbs, it normally applies to every item in the series. It often points the opposite way from the rule of the last antecedent, and courts choose between them from context."),
    ("scrivener's error", ["scrivener s error", "drafting error"], "A scrivener's error is an obvious clerical or drafting mistake in a legal text, such as a wrong cross-reference or a misplaced word. Courts will correct one when the mistake and the intended meaning are both plain from the text itself."),
    ("clear statement rule", ["clear statement"], "A clear statement rule is a substantive canon under which a court will not read a statute to produce a particular significant result (for example intruding on state sovereignty, applying retroactively, or waiving sovereign immunity) unless Congress has said so in unmistakable terms."),
    ("whole act rule", ["whole act", "whole text canon"], "The whole act rule is a canon of construction: a provision is read in the context of the entire statute, including its structure, definitions, titles and other sections, on the assumption that the statute is a coherent whole and that a word used in several places carries the same meaning throughout."),
    ("mischief rule", [], "The mischief rule, from Heydon's Case (1584), interprets a statute by asking what defect or \"mischief\" in the earlier law the legislature set out to cure, and reads the statute so as to suppress that mischief and advance the remedy. It is an ancestor of modern purposive interpretation."),
    ("Skidmore deference", ["skidmore"], "Skidmore deference, from Skidmore v. Swift & Co. (1944), is the weight a court gives an agency's interpretation that lacks the force of law. The interpretation is not binding; it is respected according to its power to persuade, which depends on the thoroughness of the agency's consideration, the validity of its reasoning, and its consistency with earlier and later pronouncements."),
    ("Auer deference", ["auer", "seminole rock"], "Auer deference, from Auer v. Robbins (1997) and Bowles v. Seminole Rock (1945), is judicial deference to an agency's reasonable reading of its own ambiguous regulation. Kisor v. Wilkie (2019) kept the doctrine but confined it: the regulation must be genuinely ambiguous after all the tools of interpretation are exhausted, and the agency's reading must be authoritative, expertise-based and a fair and considered judgment."),
    ("well-pleaded complaint rule", ["well pleaded complaint"], "The well-pleaded complaint rule holds that a case arises under federal law for purposes of 28 U.S.C. § 1331 only when a federal question appears on the face of the plaintiff's properly pleaded complaint. A federal defence, even one the plaintiff anticipates, does not create federal-question jurisdiction (Louisville & Nashville Railroad Co. v. Mottley)."),
    ("presumption against preemption", [], "The presumption against preemption is a substantive canon: in fields the states have traditionally regulated, a court assumes that Congress did not intend to displace state law unless that was its clear and manifest purpose."),
    ("ordinary meaning", ["ordinary public meaning"], "Ordinary meaning is the sense a word or phrase would have for a reasonable reader in everyday use at the time the text was adopted. It is the default in statutory interpretation unless the text defines the term or uses it as a term of art."),
    ("term of art", ["terms of art"], "A term of art is a word or phrase with a settled specialised meaning in law or in a trade. When a statute or contract uses one, it is presumed to carry that specialised meaning and not its everyday sense."),
    ("substantive canon", ["substantive canons"], "A substantive canon is a rule of interpretation that favours a particular outcome or value, unlike a semantic canon, which is a generalisation about how language is used. Examples are the rule of lenity, constitutional avoidance, the presumption against preemption and clear statement rules."),
]
# extra surface forms for terms Wex already has
ALIASES = {
    "contra_proferentem": ["construed against the drafter", "against the drafter", "construed against the party who drafted", "against the drafting party"],
    "rule_of_lenity": ["lenity"],
    "constitutional_avoidance": ["avoidance canon", "constitutional doubt"],
    "last_antecedent_rule": ["rule of the last antecedent", "last antecedent"],
    "chevron_deference": ["chevron step"],
    "major_questions_doctrine": ["major questions"],
}
STOP = set("a an the of to in on at by for and or as is be".split())


def norm(s):
    s = unicodedata.normalize("NFD", str(s or "").lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.replace("’", "'")
    s = re.sub(r"(\w)'s\b", r"\1 s", s)
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", " ", s)).strip()


def single(w):
    if len(w) > 4 and w.endswith("ies"): return w[:-3] + "y"
    if len(w) > 3 and w.endswith("s") and not w.endswith(("ss", "us", "is")): return w[:-1]
    return w


def word_lists():
    src = (ROOT / "tools" / "r12_glossary.py").read_text(encoding="utf-8")
    legal = set(re.search(r"LEGAL_ONLY = set\('''(.*?)'''", src, re.S).group(1).split())
    generic = set(re.search(r"GENERIC = set\('''(.*?)'''", src, re.S).group(1).split())
    return legal, generic


def main():
    base = (ROOT / "DKLA-r17.html").read_text(encoding="utf-8")
    block = lambda name: json.loads(re.search(r'<script[^>]*id="' + name + r'"[^>]*>(.*?)</script>', base, re.S).group(1))
    gloss, graph = block("dklaGlossary"), block("seedData")
    legal, generic = word_lists()
    have = {t["term"].lower() for t in gloss["terms"]}
    new_terms = []
    forms = {}                                    # token tuple -> slug
    def add_form(text, slug):
        toks = tuple(single(w) for w in norm(text).split())
        if toks and toks not in forms: forms[toks] = slug
    for term, aliases, definition in NEW_TERMS:
        if term.lower() in have: continue
        slug = re.sub(r"[^a-z0-9]+", "_", norm(term)).strip("_")
        new_terms.append(dict(term=term, slug=slug, definition=definition, source="DKLA", url="https://www.law.cornell.edu/wex/" + slug))
        add_form(term, slug)
        for a in aliases: add_form(a, slug)
    new_slugs = {t["slug"] for t in new_terms}
    for t in gloss["terms"]:
        if t.get("kind") == "case" or re.match(r'^[(\s]|"', t["term"]): continue
        words = [w for w in norm(re.sub(r"\([^)]*\)", " ", t["term"])).split()]
        content = [w for w in words if w not in STOP]
        if not content or " ".join(words) in generic: continue
        if len(content) == 1 and (words[0] not in legal or len(words) > 1): continue
        if len(content) == 1 and len(words[0]) < 6: continue
        if all(w in generic for w in content): continue
        add_form(" ".join(words), t["slug"])
    for slug, al in ALIASES.items():
        for a in al: add_form(a, slug)
    maxlen = max(len(k) for k in forms)

    def scan(text):
        toks = [single(w) for w in norm(text).split()]
        found, i = Counter(), 0
        while i < len(toks):
            hit = None
            for n in range(min(maxlen, len(toks) - i), 0, -1):
                slug = forms.get(tuple(toks[i:i + n]))
                if slug: hit = (slug, n); break
            if hit: found[hit[0]] += 1; i += hit[1]
            else: i += 1
        return found

    meta = {e["id"]: e for e in json.loads((DATA / "meta.json").read_text(encoding="utf-8"))["entries"]}
    mapping = json.loads((DATA / "map.json").read_text(encoding="utf-8"))
    sections = json.loads((DATA / "sections.json").read_text(encoding="utf-8"))
    text_of = {}
    for cid in meta:
        f = DATA / "briefs" / (cid + ".md")
        body = f.read_text(encoding="utf-8") if f.is_file() else ""
        sec = sections.get(cid, {})
        text_of[cid] = body + "\n" + sec.get("rule", "") + "\n" + "\n".join((sec.get("sections") or {}).values())
    counts = {cid: scan(t) for cid, t in text_of.items()}
    df = Counter(s for c in counts.values() for s in c)
    n_docs = len(counts)
    too_common = {s for s, k in df.items() if k > n_docs * 0.2 and s not in new_slugs}
    length = {slug: max(len(k) for k, v in forms.items() if v == slug) for slug in set(forms.values())}

    def ranked(c, need=1):
        items = [(cnt * math.log(1 + n_docs / df[s]) * (1 + 0.5 * (length[s] - 1)), s) for s, cnt in c.items() if s not in too_common and (cnt >= need or s in new_slugs or length[s] >= 2)]
        return [s for _, s in sorted(items, reverse=True)]

    # map entries: the graph node's own text is scanned too, but only for new terms and aliases (r12 covered the rest)
    by_node = defaultdict(list)
    nodes = {n["id"]: n for n in graph["nodes"]}
    alias_slugs = new_slugs | set(ALIASES)
    for nid, n in nodes.items():
        own = scan(" ".join(str(n.get(k) or "") for k in ("title", "summary", "notes")) + " " + " ".join((n.get("sections") or {}).values()))
        for s in own:
            if s in alias_slugs and s not in by_node[nid]: by_node[nid].append(s)
    for nid, cid in mapping.items():
        if nid not in nodes or cid not in counts: continue
        for s in ranked(counts[cid], need=2)[:14]:
            if s not in by_node[nid]: by_node[nid].append(s)
    existing = gloss.get("byNode", {})
    node_links = {nid: [s for s in slugs if s not in existing.get(nid, [])] for nid, slugs in by_node.items()}
    node_links = {k: v for k, v in node_links.items() if v}
    mapped = set(mapping.values())
    supporting = {cid: ranked(c)[:14] for cid, c in counts.items() if cid not in mapped}
    supporting = {k: v for k, v in supporting.items() if v}

    (ROOT / "tools" / "r18" / "glossary-extra.json").write_text(json.dumps(dict(newTerms=new_terms, nodeLinks=node_links), ensure_ascii=False, indent=0), encoding="utf-8")
    (DATA / "term-links.json").write_text(json.dumps(dict(supporting=supporting), ensure_ascii=False, indent=0), encoding="utf-8")
    inv = Counter(s for v in node_links.values() for s in v); inv_s = Counter(s for v in supporting.values() for s in v)
    print(f"{len(new_terms)} new terms; {sum(map(len, node_links.values()))} new links on {len(node_links)} map entries; {sum(map(len, supporting.values()))} links on {len(supporting)} supporting cases")
    for s in ("ejusdem_generis", "contra_proferentem", "noscitur_a_sociis", "expressio_unius_est_exclusio_alterius", "rule_of_lenity", "in_pari_materia", "skidmore_deference", "well_pleaded_complaint_rule", "promissory_estoppel"):
        print(f"  {s}: +{inv[s]} map entries (had {len(gloss.get('usedBy', {}).get(s, []))}), {inv_s[s]} supporting cases")
    print("  most-linked from briefs:", inv.most_common(12))


if __name__ == "__main__":
    main()
