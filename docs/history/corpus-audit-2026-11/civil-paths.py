"""Check the destinations of the choices covered by the Civil Procedure packets."""

import json
import sys
from pathlib import Path

repo = Path(__file__).resolve().parents[3]
records = json.loads((repo / "tools/flowcharts/data/civil.json").read_text())
charts = {chart["id"]: {node["id"]: node for node in chart["nodes"]} for chart in records}

# Each example starts at the particular disputed decision and checks its next step.
# Review the sources in civil.md if labels, facts, or legal premises change.
examples = [
    ("CP-10", "5", "Related to an original claim, even one the court later dismissed", "6"),
    ("CP-10", "5", "Unrelated, no original basis, or amendment removed sole federal basis", "9"),
    ("CP-10", "6", "Statutory restriction applies", "9"),
    ("CP-10", "6", "No statutory exclusion applies", "7"),
    ("CP-10", "7", "Statutory ground and court chooses to decline", "9"),
    ("CP-10", "7", "No statutory ground, or court chooses to retain", "8"),
    ("CP-14", "1", "No original basis, or amendment removed the only federal basis", "8"),
    ("CP-14", "1", "Original basis exists, or court later dismissed the anchor", "2"),
    ("CP-14", "3", "Diversity only and no express exclusion", "4"),
    ("CP-14", "3", "Express exclusion", "8"),
    ("CP-14", "4", "Outside the list", "6"),
    ("CP-14", "5", "Inconsistent with § 1332", "8"),
    ("CP-14", "6", "Statutory ground and court chooses to decline", "9"),
    ("CP-14", "6", "No statutory ground, or court chooses to retain", "7"),
    ("CP-16", "1", "Removed to the prescribed district and division", "5"),
    ("CP-16", "1", "Removed to the wrong district or division", "12"),
    ("CP-16", "2", "A ground supports this district", "5"),
    ("CP-16", "2", "Another district qualifies, but this one does not", "4"),
    ("CP-16", "2", "No district qualifies under either ground", "3"),
    ("CP-16", "11", "Special rule permits this district", "5"),
    ("CP-16", "11", "Special rule leaves general venue available; test § 1391", "2"),
    ("CP-16", "11", "Exclusive rule excludes this district", "4"),
    ("CP-22", "2", "Window open", "5"),
    ("CP-22", "2", "Window closed or amendment already used", "3"),
    ("CP-22", "7", "Same events and ordinary notice shown", "8"),
    ("CP-22", "7", "Same events; check federal-defendant notice", "11"),
    ("CP-22", "11", "Federal notice rule met; correction qualifies under governing law", "9"),
    ("CP-22", "11", "Neither route supports relation back", "10"),
]
errors = []
for chart_id, start, choice, expected in examples:
    edges = charts[chart_id][start]["edges"]
    actual = [edge["to"] for edge in edges if edge["label"] == choice]
    if actual != [expected] or expected not in charts[chart_id]:
        errors.append(f"{chart_id}/{start} {choice!r} should reach {expected}; found {actual}")
if errors:
    sys.exit("\n".join(errors))
print(f"{len(examples)} Civil Procedure choice-to-destination checks passed.")
