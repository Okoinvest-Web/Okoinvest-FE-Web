# Copyright (c) 2026, ÖkoInvest GmbH
# Energiegemeinschaften WP1 – Paritätstest Python ↔ JS ohne Frappe:
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_eg_stamm_kern
# Liest die gemeinsamen Testvektoren src/lib/plattform/eg/testdaten/stamm/vektoren.json (erzeugt aus den JS-Regeln mit
# scripts/eg-testdaten-stamm.mjs) und vergleicht eg_modell.py / Netzbetreiber / Netzentgelt / Rechte per Node-Export mit JS.
# Ohne Website-Quelltext (Backend-Server allein) werden die Abgleiche übersprungen.

import json
import math
import os
import shutil
import subprocess
import sys
import types
import unittest

try:
	import frappe  # noqa: F401
except ImportError:  # pragma: no cover
	sys.modules["frappe"] = types.ModuleType("frappe")

from oekoinvest_app.plattform import eg_modell as M
from oekoinvest_app.plattform import eg_stamm_kern as K
from oekoinvest_app.plattform.mitglied_kern import MitgliedFehler

HIER = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.normpath(os.path.join(HIER, "..", "..", "..", "..", ".."))
VEKTOREN = os.path.join(WEB, "src", "lib", "plattform", "eg", "testdaten", "stamm", "vektoren.json")
NB = "§NB"

# Kontext aus scripts/eg-testdaten-stamm.mjs (identisch halten)
G1 = {"id": "EGG-26-AAAAAA", "name": "Test-EEG", "modell": "eeg", "zonelevel": 3, "rechtsform": "verein", "netzbetreiber": ["ENB-OOE"], "verteilmodell": "dynamisch", "edaAnbindung": "anwenderportal", "status": "aktiv", "dienstleistung": {"aktiv": True}, "gemeinschaftsId": "AT00300004910RC109417000000000001", "organisatorAngezeigtAm": ""}
KD = {
	"mitglieder": [
		{"id": "M1", "gemeinschaftId": G1["id"], "kontoId": "U-1", "art": "privat", "status": "aktiv"},
		{"id": "M2", "gemeinschaftId": G1["id"], "kontoId": "U-2", "art": "gemeinde", "status": "aktiv"},
		{"id": "M3", "gemeinschaftId": G1["id"], "kontoId": "U-3", "art": "privat", "status": "antrag"},
		{"id": "M4", "gemeinschaftId": G1["id"], "kontoId": None, "art": "grossunternehmen", "status": "aktiv"},
	],
	"zaehlpunkte": [{"id": "EZP-1", "richtung": "verbrauch"}, {"id": "EZP-2", "richtung": "erzeugung"}],
	"teilnahmen": [
		{"id": "T1", "gemeinschaftId": G1["id"], "zaehlpunktId": "EZP-1", "status": "aktiv", "teilnahmefaktor": 100},
		{"id": "T2", "gemeinschaftId": G1["id"], "zaehlpunktId": "EZP-2", "status": "aktiv", "teilnahmefaktor": 60},
		{"id": "T3", "gemeinschaftId": G1["id"], "zaehlpunktId": "EZP-1", "status": "zustimmung_offen", "teilnahmefaktor": 50},
	],
	"anlagen": [
		{"gemeinschaftId": G1["id"], "art": "pv", "engpassleistungKw": 80, "status": "aktiv"},
		{"gemeinschaftId": G1["id"], "art": "pv", "kwp": 31.25, "status": "aktiv", "haushalt": True},
		{"gemeinschaftId": G1["id"], "art": "pv", "kwp": 500, "status": "geplant"},
	],
	"organe": [
		{"gemeinschaftId": G1["id"], "kontoId": "U-5", "funktion": "kassier", "von": "2025-01-01", "bis": "", "status": "aktiv", "name": "K"},
		{"gemeinschaftId": G1["id"], "kontoId": "U-6", "funktion": "obmann", "von": "2025-01-01", "bis": "2026-06-30", "status": "aktiv", "name": "O alt"},
		{"gemeinschaftId": G1["id"], "kontoId": "U-7", "funktion": "rechnungspruefer", "von": "2027-01-01", "bis": "", "status": "aktiv", "name": "R neu"},
	],
}


def _mig(alt, heute):
	z = [0]

	def nid(p):
		z[0] += 1
		return f"{p}-26-{z[0]:06d}"

	return K.migration_aus_prototyp(alt, nid, heute, namen=lambda i: {"vorname": "Mia", "nachname": "Muster", "email": "mia@example.com"} if i == "U-1" else None)


def _tu(t, e, o):
	return K.teilnahme_uebergang(t, e, o.get("heute"), o.get("datum", ""), o.get("consentId"), o.get("teilnahmefaktor"), o.get("responsecode"), o.get("prozessId", ""), o.get("grund", ""), o.get("von"), o.get("am"))


F = {
	"zaehlpunktPruefen": lambda s, nb: K.zaehlpunkt_pruefen(s, nb or []),
	"plzAusZaehlpunkt": K.plz_aus_zaehlpunkt,
	"marktpartnerIdPruefen": K.marktpartner_id_pruefen,
	"gemeinschaftsIdPruefen": lambda s, m, mp, vm: K.gemeinschafts_id_pruefen(s, m, mp, vm),
	"netzentgeltRegel": K.netzentgelt_regel,
	"reduzierterAp": K.reduzierter_ap,
	"rundeCt2": K.runde_ct2,
	"egRollen": lambda n, h: K.eg_rollen(n, G1, KD["organe"], KD["mitglieder"], h),
	"egStufe": K.eg_stufe,
	"erzeugungsleistung": K.erzeugungsleistung,
	"anlageBereinigen": K.anlage_bereinigen,
	"gemeinschaftBereinigen": lambda d: K.gemeinschaft_bereinigen(d, netzbetreiber_ids=[x["id"] for x in K.NETZBETREIBER]),
	"organBereinigen": K.organ_bereinigen,
	"organHinweise": lambda g, h: K.organ_hinweise(g, KD["organe"], h),
	"kennzahlen": lambda g: K.kennzahlen(g, KD),
	"gemeinschaftHinweise": lambda g, h: K.gemeinschaft_hinweise(g, KD, h),
	"istGrossunternehmen": K.ist_grossunternehmen,
	"mitgliedBereinigen": lambda d, g: K.mitglied_bereinigen(d, g),
	"naechsteMitgliedsnummer": K.naechste_mitgliedsnummer,
	"zaehlpunktBereinigen": lambda d, nb: K.zaehlpunkt_bereinigen(d, nb or []),
	"teilnahmeBereinigen": lambda d, g: K.teilnahme_bereinigen(d, g),
	"teilnahmeRegeln": lambda liste, neu, ft, fa: K.teilnahme_regeln(liste, neu, ft, fa),
	"tfAm": K.tf_am,
	"tarifBereinigen": K.tarif_bereinigen,
	"tarifAm": K.tarif_am,
	"tarifVersionieren": K.tarif_versionieren,
	"preisFuer": lambda t, l, m: K.preis_fuer(t, l, m),
	"verteilschluesselBereinigen": K.verteilschluessel_bereinigen,
	"gemeinschaftUebergang": lambda g, n, gr: K.gemeinschaft_uebergang(g, n, gr),
	"mitgliedUebergang": lambda m, n, gr, z: K.mitglied_uebergang(m, n, gr, z),
	"teilnahmeUebergang": _tu,
	"migrationAusPrototyp": _mig,
}


def norm(x):
	"""JSON-Normalform wie JSON.stringify (ganze Floats als int, NaN → None)."""
	if isinstance(x, dict):
		return {k: norm(v) for k, v in x.items()}
	if isinstance(x, (list, tuple)):
		return [norm(v) for v in x]
	if isinstance(x, float):
		if math.isnan(x) or math.isinf(x):
			return None
		return int(x) if x.is_integer() else x
	return x


def node_export(code):
	node = shutil.which("node")
	if not node or not os.path.isdir(os.path.join(WEB, "src")):
		return None
	r = subprocess.run([node, "--no-warnings", "--input-type=module", "-e", code], capture_output=True, text=True, encoding="utf-8", timeout=90, cwd=WEB)
	if r.returncode:
		raise RuntimeError(r.stderr[-500:])
	return json.loads(r.stdout)


def url(*teile):
	return "file:///" + os.path.join(WEB, *teile).replace("\\", "/").lstrip("/")


class TestEgStammVektoren(unittest.TestCase):
	def test_vektoren_identisch_zu_js(self):
		if not os.path.isfile(VEKTOREN):
			self.skipTest("Testvektoren nicht vorhanden")
		with open(VEKTOREN, encoding="utf-8") as f:
			vektoren = json.load(f)
		self.assertGreater(len(vektoren), 150)
		abw = []
		for i, v in enumerate(vektoren):
			args = [K.NETZBETREIBER if a == NB else a for a in json.loads(json.dumps(v["a"]))]
			try:
				ist = {"erwartet": norm(F[v["fn"]](*args))}
			except MitgliedFehler as e:
				ist = {"fehler": {"status": e.status, "text": str(e)}}
			soll = {"erwartet": norm(v["erwartet"])} if "erwartet" in v else {"fehler": v["fehler"]}
			if ist != soll:
				abw.append(f"#{i} {v['fn']}: Python {json.dumps(ist, ensure_ascii=False)[:400]} != JS {json.dumps(soll, ensure_ascii=False)[:400]}")
		self.assertEqual(abw, [], "\n".join(abw[:15]))


class TestEgStammRegeln(unittest.TestCase):
	def test_mehrfachteilnahme_und_tf(self):
		liste = [{"id": f"X{i}", "gemeinschaftId": f"G{i}", "status": "aktiv", "teilnahmefaktor": 20} for i in range(4)]
		self.assertTrue(K.teilnahme_regeln(liste, {"gemeinschaftId": "G9", "teilnahmefaktor": 20})["ok"])
		self.assertFalse(K.teilnahme_regeln(liste, {"gemeinschaftId": "G9", "teilnahmefaktor": 21})["ok"])
		self.assertFalse(K.teilnahme_regeln(liste + [{"id": "X5", "gemeinschaftId": "G5", "status": "entwurf", "teilnahmefaktor": 1}], {"gemeinschaftId": "G9", "teilnahmefaktor": 1})["ok"])

	def test_automat_tf_einmal_pro_tag(self):
		t = {"status": "aktiv", "teilnahmefaktor": 50, "tfHistorie": [{"gueltigAb": "2026-10-01", "tf": 50}], "verlauf": []}
		with self.assertRaises(MitgliedFehler):
			K.teilnahme_uebergang(t, "tf_geaendert", "2026-10-01", "2026-10-01", teilnahmefaktor=60)
		n = K.teilnahme_uebergang(t, "tf_geaendert", "2026-10-01", "2026-10-02", teilnahmefaktor=60)
		self.assertEqual((n["teilnahmefaktor"], len(n["tfHistorie"])), (60, 2))

	def test_netzentgelt_2026_und_platzhalter_2027(self):
		self.assertEqual(K.netzentgelt_regel("2026-11-01", "eeg", 3, 7)["reduktionPct"], 57)
		self.assertEqual(K.netzentgelt_regel("2026-11-01", "eeg", 4, 5)["reduktionPct"], 64)
		self.assertEqual(K.netzentgelt_regel("2026-11-01", "beg", 3, 7)["reduktionPct"], 0)
		r = K.netzentgelt_regel("2027-02-01", "beg", 3, 7)
		self.assertEqual((r["reduktionPct"], r["status"], r["abgabenBefreit"]), (57, "platzhalter", False))
		self.assertEqual(K.reduzierter_ap(5.005, 57), 2.15)


class TestEgStammGleichJs(unittest.TestCase):
	def test_modell_netzbetreiber_regeln_rechte(self):
		js = node_export(
			f"const m = await import({json.dumps(url('src', 'lib', 'plattform', 'eg', 'index.js'))});"
			"const k = Object.fromEntries(Object.keys(m).filter((x) => x === x.toUpperCase() && typeof m[x] !== 'function').map((x) => [x, m[x]]));"
			"console.log(JSON.stringify(k));"
		)
		if js is None:
			self.skipTest("Node.js oder Website-Quelltext nicht vorhanden")
		for name in [n for n in dir(M) if n.isupper()]:
			self.assertEqual(norm(getattr(M, name)), norm(js[name]), f"eg_modell.{name} weicht von modell.js ab (scripts/eg-modell-export.mjs)")
		self.assertEqual(norm(K.NETZBETREIBER), norm(js["NETZBETREIBER"]))
		self.assertEqual(norm(K.NETZENTGELT_REGELN), norm(js["NETZENTGELT_REGELN"]))
		self.assertEqual(norm(K.EG_RECHTE), norm(js["EG_RECHTE"]))
		self.assertEqual(K.BACKOFFICE_PFLEGE, js["BACKOFFICE_PFLEGE"])
		self.assertEqual(K.EDA_PORTAL_GRENZE_ZP, js["EDA_PORTAL_GRENZE_ZP"])


if __name__ == "__main__":
	unittest.main()
