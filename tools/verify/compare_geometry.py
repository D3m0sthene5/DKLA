"""Compare the home camera and all existing region coordinates across stage captures."""
import argparse
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("baseline", type=Path)
parser.add_argument("candidate", type=Path)
args = parser.parse_args()
failures, checked = [], []
required = ("desktop-geometry.json", "phone-landscape-geometry.json", "phone-portrait-geometry.json")
for name in required:
    original = args.baseline / name
    candidate = args.candidate / name
    absent = [label for label, file in [("baseline", original), ("candidate", candidate)] if not file.is_file()]
    if absent:
        failures.append({"viewport": name, "error": "Missing " + " and ".join(absent) + " capture"})
        continue
    a, b = json.loads(original.read_text()), json.loads(candidate.read_text())
    for key in ["x", "y", "z", "scope"]:
        if a["view"][key] != b["view"][key]:
            failures.append({"viewport": name, "field": "view." + key, "before": a["view"][key], "after": b["view"][key]})
    if a["regions"] != b["regions"]:
        failures.append({"viewport": name, "field": "canonical region coordinates"})
    # The approved dictionary spine can replace its old painted rectangle.
    kept = lambda data: [item for item in data["rendered"] if item["id"] != "dictionary-region"]
    if kept(a) != kept(b):
        failures.append({"viewport": name, "field": "rendered geometry excluding dictionary"})
    checked.append(name)
if not checked:
    failures.append({"error": "No matched geometry snapshots"})
print(json.dumps({"pass": not failures, "checked": checked, "failures": failures}, indent=2))
raise SystemExit(1 if failures else 0)
