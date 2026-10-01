# Copyright (c) 2026, ÖkoInvest GmbH
# WP5 Energiegemeinschaften – reine Regeln (ohne Frappe lauffähig):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_eg_gruendung_kern
# Gleichheitstest JS ↔ Python: alle Fälle aus src/lib/plattform/eg/testdaten/gruendung/vektoren.json (erzeugt mit
# node scripts/eg-gruendung-export.mjs) werden mit eg_gruendung_kern.py nachgerechnet und verglichen – Ergebnis bzw. Fehler
# (Status und Text). Zusätzlich fachliche Einzelprüfungen (Fristen, Schwellen, Statuten-Pflichtinhalte, Vorlagen-Prüfsummen).

import hashlib
import json
import math
import os
import re
import unittest

from oekoinvest_app.plattform import eg_gruendung_kern as K

HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.normpath(os.path.join(HIER, "..", "..", "..", "..", ".."))
VEKTOREN = os.path.join(WURZEL, "src", "lib", "plattform", "eg", "testdaten", "gruendung", "vektoren.json")


def _snake(name):
	return re.sub(r"([A-Z])", lambda m: "_" + m.group(1).lower(), name)


def _norm(x):
	if isinstance(x, bool) or x is None or isinstance(x, str):
		return x
	if isinstance(x, (int, float)):
		if isinstance(x, float) and math.isfinite(x) and x.is_integer():
			return int(x)
		return round(x, 9) if isinstance(x, float) else x
	if isinstance(x, list):
		return [_norm(y) for y in x]
	if isinstance(x, dict):
		return {k: _norm(v) for k, v in x.items()}
	return x


def _diff(a, b, pfad="$"):
	if type(a) is not type(b) and not (isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool) and not isinstance(b, bool)):
		return f"{pfad}: {a!r} != {b!r}"
	if isinstance(a, dict):
		for k in sorted(set(a) | set(b)):
			if k not in a or k not in b:
				return f"{pfad}.{k}: fehlt ({'py' if k not in a else 'js'})"
			d = _diff(a[k], b[k], f"{pfad}.{k}")
			if d:
				return d
		return ""
	if isinstance(a, list):
		if len(a) != len(b):
			return f"{pfad}: Länge {len(a)} != {len(b)}"
		for i, (x, y) in enumerate(zip(a, b)):
			d = _diff(x, y, f"{pfad}[{i}]")
			if d:
				return d
		return ""
	return "" if a == b else f"{pfad}: {a!r} != {b!r}"


class TestGleichheit(unittest.TestCase):
	@classmethod
	def setUpClass(cls):
		with open(VEKTOREN, encoding="utf-8") as f:
			cls.v = json.load(f)

	def test_alle_vektoren(self):
		fehler = []
		for fall in self.v["faelle"]:
			fn = getattr(K, _snake(fall["fn"]), None)
			if fn is None:
				fehler.append(f"{fall['id']}: Funktion {_snake(fall['fn'])} fehlt")
				continue
			try:
				erg = fn(*json.loads(json.dumps(fall["args"])))
				if "fehler" in fall:
					fehler.append(f"{fall['id']}: erwartet Fehler {fall['fehler']['text']!r}, erhalten Ergebnis")
					continue
				d = _diff(_norm(erg), _norm(fall["erwartet"]))
				if d:
					fehler.append(f"{fall['id']}: {d}")
			except K.GrFehler as e:
				if "fehler" not in fall:
					fehler.append(f"{fall['id']}: unerwarteter Fehler {e}")
				elif str(e) != fall["fehler"]["text"] or e.status != fall["fehler"]["status"]:
					fehler.append(f"{fall['id']}: Fehler {e.status} {e!s} != {fall['fehler']['status']} {fall['fehler']['text']}")
			except Exception as e:  # noqa: BLE001
				fehler.append(f"{fall['id']}: Ausnahme {type(e).__name__}: {e}")
		self.assertEqual(fehler, [], "\n".join(fehler[:40]))

	def test_vorlagen_pruefsummen(self):
		faelle = [f for f in self.v["faelle"] if f["fn"] == "vorlageRendern"]
		for vid, h in self.v["vorlagenHash"].items():
			f = next(x for x in faelle if x["args"][0]["id"] == vid)
			dok = K.vorlage_rendern(*f["args"])
			self.assertEqual(hashlib.sha256(dok["text"].encode("utf-8")).hexdigest(), h, vid)


class TestFachlich(unittest.TestCase):
	def test_schritte_je_rechtsform(self):
		a = K.auftrag_bereinigen({"paket": "gruendung", "arbeitsname": "Test EG", "plz": "5121", "modell": "eeg"})
		s = [x["schluessel"] for x in K.schritte_erzeugen(a)]
		self.assertIn("vereinsanzeige", s)
		self.assertIn("zvr", s)
		self.assertNotIn("firmenbuch", s)
		e = [x["schluessel"] for x in K.schritte_erzeugen({**a, "rechtsform": "egen"})]
		self.assertIn("revisionsverband", e)
		self.assertIn("firmenbuch", e)
		self.assertNotIn("vereinsanzeige", e)
		g = [x["schluessel"] for x in K.schritte_erzeugen({**a, "modell": "gea", "rechtsform": "keine"})]
		self.assertIn("gea_vertraege", g)
		self.assertNotIn("statuten", g)
		self.assertNotIn("bank", g)

	def test_zvr_frist_vier_wochen_nach_anzeige(self):
		a = {"paket": "gruendung", "auftragAm": "2026-09-01"}
		schritte = [{"schluessel": "vereinsanzeige", "status": "erledigt", "datum": "2026-09-18"}, {"schluessel": "zvr", "status": "wartet_extern"}]
		self.assertEqual(K.schritt_frist(schritte[1], schritte, a), "2026-10-16")  # VerG § 13: 4 Wochen

	def test_nb_auskunft_14_tage_ab_beginn(self):
		x = {"schluessel": "nb_auskunft", "status": "in_arbeit", "gestartetAm": "2026-10-01"}
		self.assertEqual(K.schritt_frist(x, [x], {"paket": "gruendung"}), "2026-10-15")  # ElWG § 70 Abs. 6

	def test_status_pfad_ueber_erlaubte_uebergaenge(self):
		self.assertEqual(K.status_pfad("interesse", "marktpartner"), ["in_gruendung", "rechtsperson", "marktpartner"])
		self.assertEqual(K.status_pfad("in_gruendung", "vertrag_nb"), ["vertrag_nb"])
		self.assertEqual(K.status_pfad("aktiv", "in_gruendung"), [])

	def test_lieferantenpflicht_schwellen(self):
		self.assertTrue(K.lieferantenpflichten({"anlagen": [{"art": "pv", "kwp": 101, "status": "aktiv"}], "heute": "2026-10-01"})["pflicht"])
		self.assertFalse(K.lieferantenpflichten({"anlagen": [{"art": "pv", "kwp": 100, "status": "aktiv"}], "heute": "2026-10-01"})["pflicht"])
		self.assertTrue(K.lieferantenpflichten({"anlagen": [{"art": "pv", "kwp": 31, "status": "aktiv", "haushalt": True}], "heute": "2026-10-01"})["pflicht"])
		r = K.lieferantenpflichten({"anlagen": [{"art": "pv", "kwp": 80, "status": "aktiv"}, {"art": "pv", "kwp": 30, "status": "geplant"}], "heute": "2026-10-01"})
		self.assertTrue(r["bald"])

	def test_statuten_pflichtinhalte_verg(self):
		e = K.statuten_eingaben({"taetigkeitsgebiet": "Gemeinde X"})
		d = K.dokument_daten({"gemeinschaft": {"name": "EEG X", "modell": "eeg", "rechtsform": "verein", "sitzAdresse": {"ort": "Y"}, "zonelevel": 3}, "eingaben": e, "heute": "2026-10-01"})
		dok = K.vorlage_rendern(K.VORLAGEN["statuten_verein"], d)
		p = K.statuten_pruefen({"modell": "eeg", "rechtsform": "verein", "name": "EEG X", "sitzOrt": "Y"}, e, dok)
		self.assertTrue(p["ok"], p["befunde"])
		self.assertTrue(dok["abschnitte"][0]["titel"].startswith("§ 1 "))

	def test_beg_kontrollklausel(self):
		d = K.dokument_daten({"gemeinschaft": {"name": "BEG X", "modell": "beg", "rechtsform": "verein", "zonelevel": 6}, "heute": "2026-10-01"})
		t = K.vorlage_rendern(K.VORLAGEN["statuten_verein"], d)["text"]
		self.assertIn("§ 67 Abs. 3 ElWG", t)
		d2 = {**d, "modell": "eeg"}
		self.assertNotIn("§ 67 Abs. 3 ElWG", K.vorlage_rendern(K.VORLAGEN["statuten_verein"], d2)["text"])

	def test_import_plausibilitaet_tf_und_grossunternehmen(self):
		t = K.tabelle_lesen("Name;Zählpunkt;Richtung;TF;Mitgliedsart\nA;AT0030000000000000000000000000001;Bezug;150;Großunternehmen\n")
		ds = K.zeilen_abbilden(t["zeilen"], K.zuordnung_vorschlagen(t["kopfNorm"]))
		p = K.plausibilitaet(ds, {"gemeinschaft": {"modell": "eeg"}})
		texte = " ".join(f["text"] for f in p["fehler"])
		self.assertIn("Großunternehmen", texte)
		self.assertIn("Teilnahmefaktor 150", texte)

	def test_umstellungsplan_monatserster(self):
		p = K.umstellungsplan({"stichtag": "2026-12-15", "heute": "2026-10-01"})
		self.assertEqual(p["stichtag"], "2027-01-01")
		self.assertEqual(p["letzteAltabrechnung"], "2026-12")
		self.assertEqual(p["ersteAbrechnungAb"], "2027-02-20")

	def test_gv_pflicht_verein_hoechstens_fuenf_jahre(self):
		p = K.gv_pflicht({"rechtsform": "verein", "versammlungen": [], "heute": "2026-10-01", "turnusJahre": 9, "gegruendetAm": "2022-01-01"})
		self.assertEqual(p["turnusJahre"], 5)


if __name__ == "__main__":
	unittest.main()
