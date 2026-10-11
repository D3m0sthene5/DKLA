# Curated geography and fixed entry positions

The v2.5 overlay contains 1,052 visible graph homes: 414 Contracts, 311 Civil Procedure, 320 LRS and seven cross-course study lenses. It retains 42 subjects and 210 districts. The 27 prompt-only exercises excluded by the practice filter are recoverable in the practice archive and source data; their empty slots no longer create map holes.

`geography.json` is the auditable geometry source. `geography_build.py` starts with the immutable r18 layout, replays the effective r19/r21/r22 additions and positions, then applies the recorded placement changes. It records every visible node, every district's members/question, every subject's specific placement rationale and strongest connected subjects. Source hashes and summary fingerprints detect stale review data.

## What changed and why

| Course | Changes |
| --- | --- |
| Contracts | Klein, Walgreen and the French specific-enforcement reading sit with specific relief, separate from restitution after breach. The §2-207(3) conduct concept sits beside C. Itoh. The interpretation overview leads meaning in context. Objective-assent accounts share one district while retaining their distinct prose and links. All 26 assignment records share one ordered reading index; source records have a separate course-margin group. The substantive N.Y. GOL §5-1105 entry sits with written substitutes for consideration. |
| Civil Procedure | The older contacts accounts now sit in claim-linked jurisdiction; Burger King sits with continuing contractual contacts. Forum selection and Carnival sit with consent and Bremen, retaining venue/transfer links. Berk sits in federal-provision scope and validity within Erie. The older jurisdiction and Berk continuation subjects are integrated into those parents. |
| LRS | Katzmann methods, linguistic canons and statutory applications are adjacent groups inside one subject. Rucho sits in a distinct political-question group near standing; the preliminary Trump v. Illinois deployment account sits with limits on presidential authority. Pacific Gas/FPC and American Mining Congress sit with guidance and notice-and-comment exceptions. Technology-forcing sits with reasoned review. Third-party hearings and entitlement disclaimers sit beside their specific applications. The mixed standing-authorities basket is distributed among constitutional requirements, statutory access and associational representation. |
| LRS interpretation | Historical respect and Skidmore persuasive weight are separate from Chevron's development and overruling in Loper Bright. Major questions and statutory limits form an adjacent comparison group, explicitly distinguishing Benzene's fractured statutory reasoning, King, and the stay-stage recognition of authority in Biden v. Missouri. Regulatory interpretation remains a distinct Kisor group. Cases are chronological after a clear pedagogical lead. |

There are 106 recorded semantic relocations and 47 affected district reflows. The established course structure remains: formation and alternatives in Contracts; jurisdictional gates above the life of the suit in Civil Procedure; Congress, executive agencies and courts in LRS. Only lower same-column subjects that would actually overlap a grown subject move down. Course-wide responsive translations remain consistent with r20.

## Review scope

The complete district/member-title lists and topic questions were screened. Targeted effective summaries and holdings were compared for the contested placements, the 14 agency-interpretation cases, and selected standing/justiciability accounts; the IDs are recorded in `audit.freshSummaryHoldingComparisons`. A second pass inspected all 68 graph-degree outliers with no same-district neighbor and at least three graph neighbors. Their distance often reflects cross-district conceptual links, rather than a misfiling. The earlier explanation, noncase and connection ledgers retain their separately stated source-review scopes.

This is a geographic classification audit, not 1,052 fresh complete-opinion rereads. Neighboring cases can disagree, address different statutory regimes or arise at different procedural stages. Their actual explanations and connection records are preserved. Distinct older accounts were co-located rather than deleting their information or automatically merging their legal prose.

## Position lock and preserved edits

`geography.js` loads last after the practice filter and reads `dklaGeographyData`. It sanitizes the shared drag state so mouse, touch and pen dragging a graph card pans the camera; an unmoved click still opens the entry. Pinch zoom, viewport pan, keyboard navigation and native authority/dictionary/SCOTUS navigation remain available. Legacy move commits, placement forms and exposed placement APIs are disabled, and geographic-edit controls are removed.

Imported/saved custom map homes are replaced by the curated relative geometry. Node prose, sources, personal notes, connection explanations and study priorities remain intact. Personal entries receive fixed inbox slots; a former exercise repurposed into a substantive entry remains visible there. One fresh unselected overview is reframed after the authority precinct becomes available; an open entry, subject, district or navigation history preserves its reading position.

Native authority, dictionary-term and SCOTUS entries use their modules' private navigation geometry, not course graph homes. They have no position-editing API or drag commit. The authority precinct reads `DKLAGeography.bounds()` as `{x,y,w,h}` and stands below the final core/SCOTUS envelope. Supporting-case tiles follow the final course bottoms; their internal source-case layout remains private.

## Rebuild and bounded inspection

```powershell
python tools/v25/geography_build.py
python tools/v25/geography_check.py --check
node tools/v25/geography_check.cjs
python tools/v25/geography_check.py --inventory regions --limit 10
python tools/v25/geography_check.py --inventory districts --course 'Civil Procedure' --offset 0 --limit 25
python tools/v25/geography_check.py --inventory nodes --district specific-relief --limit 30
python tools/v25/geography_check.py --inventory revisions --offset 0 --limit 25
```

Inventories are bounded to at most 100 records per call. The Python checker covers every visible effective home, node/placement agreement, containment below headings, four-unit card clearance and all region/district overlaps. The JavaScript checker extracts and executes the actual immutable pointer handlers; it verifies three pointer modes, normal clicks, pinch zoom, ignored custom imports, preservation of notes/priorities, responsive round trips, locked personal entries and visible repurposed exercises. Browser QA supplies the separate rendered/navigation check.
