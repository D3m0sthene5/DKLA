"""Prove that the byte guard fails closed around its explicit exemptions."""
import contextlib
import io
import json
import tempfile
import unittest
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import content_guard as guard


class ByteGuardTests(unittest.TestCase):
    baseline = (b'<script id="dklaR19Data" type="application/json">{"build":"old","legal":"Exact source text"}</script>'
                b'<script id="runtime">/* ===== approved.js ===== */\nold();\n'
                b'/* ===== untouched.js ===== */\nkeep();\n</script>')

    def check_candidate(self, candidate, expected, allowed=(), release=False):
        scratch = Path(__file__).resolve().parents[3] / "stage1-evidence" / "guard-fixtures"
        scratch.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=scratch) as folder:
            folder = Path(folder)
            assert folder.resolve().is_relative_to(scratch.resolve())
            before, after, manifest = folder / "before.html", folder / "after.html", folder / "manifest.json"
            before.write_bytes(self.baseline)
            after.write_bytes(candidate)
            manifest.write_text(json.dumps({"files": [{"path": "original.html", "checkoutSha256": guard.sha(self.baseline)}]}))
            args = SimpleNamespace(manifest=manifest, original="original.html", baseline_source="checkout",
                                   baseline_html=before, candidate=after, allow_module=list(allowed), allow_release_build=release)
            with contextlib.redirect_stdout(io.StringIO()), self.assertRaises(SystemExit) as status:
                guard.compare_html(args)
            self.assertEqual(status.exception.code, expected)

    def test_identical(self):
        self.check_candidate(self.baseline, 0)

    def test_original_dataset_bytes_cannot_change(self):
        self.check_candidate(self.baseline.replace(b"Exact source", b"Edited source"), 1, ["approved.js"], True)

    def test_only_named_module_body_may_change(self):
        self.check_candidate(self.baseline.replace(b"old();", b"new();"), 0, ["approved.js"])
        self.check_candidate(self.baseline.replace(b"keep();", b"alter();"), 1, ["approved.js"])

    def test_whitespace_is_still_data(self):
        self.check_candidate(self.baseline.replace(b'"legal":', b'"legal" :'), 1, ["approved.js"], True)

    def test_build_exception_is_explicit_and_narrow(self):
        candidate = self.baseline.replace(b'"build":"old"', b'"build":"new"')
        self.check_candidate(candidate, 1)
        self.check_candidate(candidate, 0, release=True)

    def test_script_identity_cannot_change(self):
        self.check_candidate(self.baseline.replace(b'id="runtime"', b'id="replacement"'), 1, ["approved.js"])

    def test_geometry_requires_all_three_viewports(self):
        scratch = Path(__file__).resolve().parents[3] / "stage1-evidence" / "guard-fixtures"
        scratch.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=scratch) as folder:
            folder = Path(folder)
            assert folder.resolve().is_relative_to(scratch.resolve())
            before, after = folder / "before", folder / "after"
            before.mkdir(); after.mkdir()
            fixture = {"view": {"x": 0, "y": 0, "z": 1, "scope": "Atlas"}, "regions": [], "rendered": []}
            def compare():
                return subprocess.run([sys.executable, str(Path(__file__).with_name("compare_geometry.py")), str(before), str(after)], capture_output=True).returncode
            for directory in (before, after):
                (directory / "desktop-geometry.json").write_text(json.dumps(fixture))
            self.assertNotEqual(compare(), 0, "Desktop-only evidence must not pass")
            for directory in (before, after):
                for viewport in ("phone-landscape", "phone-portrait"):
                    (directory / (viewport + "-geometry.json")).write_text(json.dumps(fixture))
            self.assertEqual(compare(), 0)


if __name__ == "__main__":
    unittest.main()
