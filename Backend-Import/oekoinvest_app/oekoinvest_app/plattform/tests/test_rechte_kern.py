# Copyright (c) 2026, ÖkoInvest GmbH
# Backoffice-Rechte-Matrix: plattform/rechte.py muss exakt src/lib/plattform/rechte.js entsprechen (dort ist die Wahrheit).
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_rechte_kern
# Ohne Node.js bzw. ohne Website-Quelltext (Backend-Server allein) wird der JS-Abgleich übersprungen.

import json
import os
import shutil
import subprocess
import sys
import types
import unittest

try:  # Bench vorhanden → echtes Frappe; sonst minimaler Stub (rechte.py nutzt Frappe nur in recht_noetig)
	import frappe  # noqa: F401
except ImportError:  # pragma: no cover
	sys.modules["frappe"] = types.ModuleType("frappe")

from oekoinvest_app.plattform import rechte as R

HIER = os.path.dirname(os.path.abspath(__file__))
RECHTE_JS = os.path.normpath(os.path.join(HIER, "..", "..", "..", "..", "..", "src", "lib", "plattform", "rechte.js"))


def js_matrix():
	"""{rollen, bereiche, matrix} aus rechte.js (per Node-Export) oder None, wenn Node/Datei fehlen."""
	node = shutil.which("node")
	if not node or not os.path.isfile(RECHTE_JS):
		return None
	url = "file:///" + RECHTE_JS.replace("\\", "/").lstrip("/")
	code = (
		f"const m = await import({json.dumps(url)});"
		"console.log(JSON.stringify({rollen: m.BACKOFFICE_ROLLEN_IDS, bereiche: m.BEREICHE, matrix: m.RECHTE_MATRIX}));"
	)
	r = subprocess.run([node, "--no-warnings", "--input-type=module", "-e", code], capture_output=True, text=True, encoding="utf-8", timeout=60)
	if r.returncode:
		raise RuntimeError(f"rechte.js nicht auswertbar: {r.stderr.strip()[-400:]}")
	return json.loads(r.stdout)


def abweichungen(js):
	"""Liste lesbarer Abweichungen Python ↔ JS (leer = identisch)."""
	aus = []
	if js["rollen"] != R.BACKOFFICE_ROLLEN:
		aus.append(f"Unterrollen: JS {js['rollen']} != Python {R.BACKOFFICE_ROLLEN}")
	for b in sorted(set(js["bereiche"]) | set(R.BEREICHE)):
		if js["bereiche"].get(b) != R.BEREICHE.get(b):
			aus.append(f"Bereich {b}: Label JS {js['bereiche'].get(b)!r} != Python {R.BEREICHE.get(b)!r}")
	for b in sorted(set(js["matrix"]) | set(R.RECHTE_MATRIX)):
		z_js, z_py = js["matrix"].get(b) or {}, R.RECHTE_MATRIX.get(b) or {}
		for rolle in js["rollen"]:
			if z_js.get(rolle) != z_py.get(rolle):
				aus.append(f"{b}/{rolle}: JS {z_js.get(rolle)} != Python {z_py.get(rolle)}")
	return aus


class TestRechteMatrix(unittest.TestCase):
	def test_python_in_sich_vollstaendig(self):
		for b, zeile in R.RECHTE_MATRIX.items():
			self.assertEqual(list(zeile), R.BACKOFFICE_ROLLEN, b)
			self.assertTrue(all(s in (0, 1, 2) for s in zeile.values()), b)
		self.assertEqual(set(R.RECHTE_MATRIX), set(R.BEREICHE))
		self.assertEqual(R.RECHTE_MATRIX["finanzen"]["projektleitung"], 1)
		self.assertEqual(R.RECHTE_MATRIX["entwicklung"]["projektleitung"], 2)
		self.assertEqual(R.RECHTE_MATRIX["geodaten"]["projektleitung"], 0)

	def test_unterrollen_und_stufe(self):
		pl = {"rollen": ["admin"], "backofficeRollen": "projektleitung"}
		self.assertEqual(R.unterrollen(pl), ["projektleitung"])
		self.assertEqual(R.stufe(pl, "grundbuch"), 2)
		self.assertEqual(R.stufe(pl, "closing"), 1)
		self.assertEqual(R.stufe(pl, "unbekannt"), R.RECHTE_MATRIX["sonstiges"]["projektleitung"])
		self.assertEqual(R.unterrollen({"rollen": ["admin"]}), ["leitung"])
		self.assertEqual(R.unterrollen({"rollen": ["investor"], "backofficeRollen": "leitung"}), [])

	def test_gleich_rechte_js(self):
		js = js_matrix()
		if js is None:
			self.skipTest("Node.js oder src/lib/plattform/rechte.js nicht vorhanden")
		self.assertEqual(abweichungen(js), [])


if __name__ == "__main__":
	unittest.main()
