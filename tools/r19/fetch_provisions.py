#!/usr/bin/env python3
"""Collect the text of the provisions behind the rule entries into data/provisions.json.

Federal statutes and Federal Rules come from the Legal Information Institute (law.cornell.edu), fetched with
curl. Restatement, UCC, CISG and Consumer Contracts sections come from the page text of the supplements on
file (added-sources/index/*.json), black letter only. Re-run to refresh; the build only reads the JSON.

usage: fetch_provisions.py <folder holding added-sources/index/*.json> <seedData.json>
"""
import json, re, subprocess, sys, html, datetime
from html.parser import HTMLParser
from pathlib import Path

HERE = Path(__file__).parent
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36"
LII = "https://www.law.cornell.edu"

# entry id -> (citation shown, LII path, optional subsection path to keep)
USC = {
    **{f"cp-usc-{n}": (f"28 U.S.C. § {n}", f"/uscode/text/28/{n}", None) for n in (1331, 1332, 1335, 1367, 1391, 1404, 1406, 1407, 1441, 1453, 1652, 2072)},
    "lrs-o-apa-classification": ("5 U.S.C. § 551", "/uscode/text/5/551", None),
    "lrs-o-section-553": ("5 U.S.C. § 553", "/uscode/text/5/553", None),
    "lrs-n-good-cause": ("5 U.S.C. § 553(b)", "/uscode/text/5/553", "b"),
    "lrs-n-nonreviewability": ("5 U.S.C. § 701", "/uscode/text/5/701", None),
    "lrs-n-discrete-required-action": ("5 U.S.C. § 706", "/uscode/text/5/706", None),
    "lrs-n-standing-apa702": ("5 U.S.C. § 702", "/uscode/text/5/702", None),
    "lrs-o-fvra": ("5 U.S.C. § 3345", "/uscode/text/5/3345", None),
    "lrs-s-caa-109": ("42 U.S.C. § 7409(b)", "/uscode/text/42/7409", "b"),
    "lrs-s-sorna-20913": ("34 U.S.C. § 20913", "/uscode/text/34/20913", None),
    "lrs-s-ftc-tenure": ("15 U.S.C. § 41", "/uscode/text/15/41", None),
    "lrs-k-ftca-postal": ("28 U.S.C. § 2680(b)", "/uscode/text/28/2680", "b"),
}
FRCP = {f"cp-frcp-{n}": (f"Fed. R. Civ. P. {n}", f"/rules/frcp/rule_{n}") for n in (4, 8, 9, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24, 42, 56)}


CONSTITUTION = {
    "cp-article-iii": dict(cite="U.S. Const. art. III, §§ 1–2", file="added-sources/US Constitution.pdf#page=8", lines=[
        [0, "Section 1. The judicial Power of the United States, shall be vested in one supreme Court, and in such inferior Courts as the Congress may from time to time ordain and establish. The Judges, both of the supreme and inferior Courts, shall hold their Offices during good Behaviour, and shall at stated Times, receive for their Services, a Compensation, which shall not be diminished during their Continuance in Office."],
        [0, "Section 2. The judicial Power shall extend to all Cases, in Law and Equity, arising under this Constitution, the Laws of the United States, and Treaties made, or which shall be made, under their Authority;—to all Cases affecting Ambassadors, other public Ministers and Consuls;—to all Cases of admiralty and maritime Jurisdiction;—to Controversies to which the United States shall be a Party;—to Controversies between two or more States;—[between a State and Citizens of another State;—] between Citizens of different States,—between Citizens of the same State claiming Lands under Grants of different States, [and between a State, or the Citizens thereof;—and foreign States, Citizens or Subjects.]"],
        [0, "In all Cases affecting Ambassadors, other public Ministers and Consuls, and those in which a State shall be Party, the supreme Court shall have original Jurisdiction. In all the other Cases before mentioned, the supreme Court shall have appellate Jurisdiction, both as to Law and Fact, with such Exceptions, and under such Regulations as the Congress shall make."],
        [0, "(The bracketed words were changed by the Eleventh Amendment. Section 2's third paragraph, on jury trial of crimes, is omitted.)"]]),
    "lrs-s-article-i-vesting": dict(cite="U.S. Const. art. I, § 1", file="added-sources/US Constitution.pdf#page=2", lines=[
        [0, "All legislative Powers herein granted shall be vested in a Congress of the United States, which shall consist of a Senate and House of Representatives."]]),
    "lrs-s-article-ii-appointments": dict(cite="U.S. Const. art. II, § 2, cl. 2", file="added-sources/US Constitution.pdf#page=6", lines=[
        [0, "He shall have Power, by and with the Advice and Consent of the Senate, to make Treaties, provided two thirds of the Senators present concur; and he shall nominate, and by and with the Advice and Consent of the Senate, shall appoint Ambassadors, other public Ministers and Consuls, Judges of the supreme Court, and all other Officers of the United States, whose Appointments are not herein otherwise provided for, and which shall be established by Law: but the Congress may by Law vest the Appointment of such inferior Officers, as they think proper, in the President alone, in the Courts of Law, or in the Heads of Departments."]]),
}


def get(path):
    out = subprocess.run(["curl", "-sL", "--fail", "-A", UA, LII + path], capture_output=True, check=True).stdout.decode("utf-8")
    return out


def tidy(s):
    return re.sub(r"\s+", " ", html.unescape(s)).replace(" ,", ",").replace(" .", ".").replace("“ ", "“").replace(" ”", "”").strip()


class Usc(HTMLParser):
    """Lines of a U.S. Code section: one per numbered unit, with its indent level and anchor path."""
    def __init__(self):
        super().__init__(); self.lines = []; self.stack = []; self.on = False; self.done = False; self.depth = 0; self.path = ""
    def handle_starttag(self, tag, attrs):
        a = dict(attrs); cls = a.get("class") or ""
        if self.done: return
        if tag == "div" and cls == "section" and not self.on: self.on = True; self.depth = 0; self.new(0); return
        if not self.on: return
        if tag == "div" and "sourceCredit" in cls: self.done = True; return
        if tag == "a" and a.get("name"): self.path = a["name"]; self.lines[-1][2] = self.path
        if tag in ("div", "p"):
            self.depth += tag == "div"
            m = re.search(r"indent(\d+)", cls)
            if m: self.new(int(m.group(1)))
    def handle_endtag(self, tag):
        if self.on and not self.done and tag == "div":
            self.depth -= 1
            if self.depth < 0: self.done = True
    def new(self, indent): self.lines.append([indent, "", self.path])
    def handle_data(self, data):
        if self.on and not self.done and self.lines: self.lines[-1][1] += data


def usc(path, keep):
    p = Usc(); p.feed(get(path))
    lines = [[i, tidy(t), a] for i, t, a in p.lines if tidy(t)]
    # LII's own indent classes are uneven; a numbered unit's depth is its anchor path
    lines = [[a.count("_") if t.startswith("(") and a else i, t, a] for i, t, a in lines]
    if keep: lines = [l for l in lines if l[2] == keep or l[2].startswith(keep + "_")]
    if not lines: raise ValueError(f"no text parsed from {path}")
    base = min(l[0] for l in lines)
    return [[l[0] - base, l[1]] for l in lines]


def frcp(path):
    page = get(path)
    a = page.index("<article"); m = re.compile(r"<h4>\s*Notes|class=\"source-credit\"|class=\"note-head\"").search(page, a); b = m.start() if m else page.index("</article>", a)
    lines = []
    for cls, body in re.findall(r"<p(?: class=\"([^\"]*)\")?>(.*?)</p>", page[a:b], re.S):
        m = re.search(r"(\d)em", cls or ""); text = tidy(re.sub(r"<[^>]+>", "", body))
        if text and not re.match(r"\((?:As amended|As added|Added) ", text): lines.append([int(m.group(1)) if m else 0, text])
    if not lines: raise ValueError(f"no text parsed from {path}")
    return lines


def dehyphen(s): return re.sub(r"(?<=[a-z])- (?=[a-z])", "", re.sub(r"\s+", " ", s))


def loose(needle):
    return re.compile(r"[\s\-–—]*".join(re.escape(c) for c in re.sub(r"[\s\-–—]+", "", needle)))


def from_file(index_dir, nodes):
    """Black letter of Restatement / UCC / CISG / RLCC sections, from the supplements' page text."""
    files = {}
    for f in Path(index_dir).glob("*.json"):
        d = json.loads(f.read_text(encoding="utf-8")); files[d["file"]] = d
    out = {}
    for n in nodes:
        for s in n.get("sources") or []:
            m = re.match(r"(added-sources/[^#]+)#page=(\d+)", s.get("url", ""))
            if not m or m.group(1) not in files or "Civ Pro Supplement" in m.group(1): continue
            d = files[m.group(1)]; page = int(m.group(2)); idx = d["index"]
            num = re.search(r"(?:§|Article) ?([\d\-]+)", s["label"])
            cands = [i for i, e in enumerate(idx) if e["page"] == page and num and re.search(r"(?:§|Article) ?" + re.escape(num.group(1)) + r"\b", e["key"])]
            if not cands: continue
            i = cands[0]; e = idx[i]
            head = re.search(r"((?:§|Article) ?[\d\-]+\.? .+)$", e["label"]).group(1)
            nxt = idx[i + 1] if i + 1 < len(idx) else None
            text = " ".join(d["pageText"][page - 1:(nxt["page"] if nxt else page)])
            a = loose(head).search(text)
            if not a: continue
            body = text[a.end():]
            ends = [m2.start() for m2 in [re.search(r"\b(?:Official )?Comment(?:s)?:?\s+(?:a\.|1\.)", body), re.search(r"\bOfficial Comment\b", body), re.search(r"\bComment:", body), re.search(r"\bReporters[’'] Notes?\b", body), re.search(r"\bDefinitional Cross References?\b", body), re.search(r"\s(?:TOPIC|CHAPTER) \d+\. [A-Z]", body)] if m2]
            if nxt:
                nh = re.search(r"((?:§|Article) ?[\d\-]+\.? .+)$", nxt["label"])
                b = nh and loose(nh.group(1)).search(body)
                if b: ends.append(b.start())
            if not ends: continue
            body = dehyphen(body[:min(ends)]).strip()
            # running heads caught where a section crosses a page
            body = re.sub(r"(?:§ ?[\d–\-]+ ?)?ARTICLE \d+\. [A-Z]+(?: [A-Z]+)* \d{1,3}\s", "", body)
            body = re.sub(r"\s\d{1,3} CONSUMER CONTRACTS\b", "", body)
            # one line per numbered subsection
            parts = []
            for p in re.split(r"\s(?=\((?:\d{1,2}|[a-h]|[A-H])\) )", body):
                p = p.strip()
                if not p: continue
                # "subsections (a) and (b) are ..." is a cross-reference, not a new subsection
                if parts and re.search(r"(?:\band|\bor|[Ss]ubsections?|[Ss]ections?|\bunder|\bin|\bof|\bsee|[Pp]aragraphs?|,|\))$", parts[-1]): parts[-1] += " " + p
                else: parts.append(p)
            # indent by the order in which each kind of marker first appears: (1) (a) (A), or (a) (1) (A)
            kinds, lines = [], []
            for p in parts:
                m3 = re.match(r"\((\d{1,2}|[a-h]|[A-H])\) ", p)
                kind = None if not m3 else "n" if m3.group(1).isdigit() else "l" if m3.group(1).islower() else "u"
                if kind and kind not in kinds: kinds.append(kind)
                lines.append([kinds.index(kind) if kind else 0, p])
            out[n["id"]] = dict(cite=e["key"], title=tidy(head), source=f"{Path(d['file']).name}, PDF page {page}", file=f"{d['file']}#page={page}", kind="file", lines=lines)
            break
    return out


def main():
    index_dir, seed = sys.argv[1], sys.argv[2]
    graph = json.loads(Path(seed).read_text(encoding="utf-8"))
    rlcc = json.loads((HERE / "data" / "rlcc.json").read_text(encoding="utf-8"))
    nodes = [n for n in graph["nodes"] if n["kind"] == "Rule"] + [dict(id=r["id"], sources=r["sources"]) for r in rlcc["rules"]]
    ids = {n["id"] for n in nodes}
    out = from_file(index_dir, nodes)
    today = datetime.date.today().isoformat()
    for nid, entry in CONSTITUTION.items():
        assert nid in ids, nid
        out[nid] = dict(entry, source="US Constitution.pdf (National Constitution Center text, on file)", kind="file")
    for nid, (cite, path, keep) in USC.items():
        assert nid in ids, nid
        out[nid] = dict(cite=cite, source="Legal Information Institute, U.S. Code", url=LII + path, fetched=today, kind="lii", lines=usc(path, keep))
    for nid, (cite, path) in FRCP.items():
        assert nid in ids, nid
        out[nid] = dict(cite=cite, source="Legal Information Institute, Federal Rules of Civil Procedure", url=LII + path, fetched=today, kind="lii", lines=frcp(path))
    (HERE / "data" / "provisions.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(len(out), "provisions;", "rule entries without text:", sorted(ids - set(out)))
    for k, v in sorted(out.items()):
        print(k.ljust(30), v["cite"].ljust(22), str(len(v["lines"])).rjust(4), "lines |", v["lines"][0][1][:60], "…", v["lines"][-1][1][-50:])


if __name__ == "__main__":
    main()
