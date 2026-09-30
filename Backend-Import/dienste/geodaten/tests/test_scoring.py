# Tests der reinen Scoring-Logik (ohne GIS-Bibliotheken, ohne Datenbank):
#   cd Backend-Import/dienste/geodaten && python -m unittest discover -s tests -v
# tests/faelle.json enthält Ergebnisse der JS-Engine (src/lib/plattform/geodaten/scoring.js) – beide Seiten müssen
# übereinstimmen. Neu erzeugen: node Backend-Import/dienste/geodaten/tests/faelle_erzeugen.mjs (Website-Repository).

import json
import os
import unittest

from geodaten import scoring as s
from geodaten.geometrie import distanz_m, flaeche_m2, kompaktheit, neigung_exposition, punkt_in_polygon
from geodaten.netz import jsround, netzkosten

HIER = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HIER, "faelle.json"), encoding="utf-8") as f:
	FAELLE = json.load(f)


class GleichMitJs(unittest.TestCase):
	def test_version(self):
		self.assertEqual(FAELLE["version"], s.SCORING_VERSION, "Scoring-Version JS/Python unterschiedlich – faelle.json neu erzeugen")

	def test_bewertung(self):
		for fall in FAELLE["bewertung"]:
			with self.subTest(fall["name"]):
				r = s.bewerte(fall["eingabe"])
				e = fall["erwartet"]
				self.assertEqual(r["score"], e["score"])
				self.assertEqual(r["ampel"], e["ampel"])
				self.assertEqual([k["id"] for k in r["ko"]], e["ko"])
				self.assertEqual({k["id"]: k["punkte"] for k in r["kriterien"]}, e["punkte"])
				self.assertEqual(r["mwp"], e["mwp"])

	def test_netzkosten(self):
		for fall in FAELLE["netzkosten"]:
			with self.subTest(f"{fall['mwp']} MWp {fall['km']} km"):
				self.assertEqual(netzkosten(fall["mwp"], fall["km"], fall["ebene"], fall["kapazitaet"]), fall["erwartet"])

	def test_bester_knoten(self):
		for fall in FAELLE["bester"]:
			with self.subTest(str(fall["punkt"])):
				b = s.bester_knoten(tuple(fall["punkt"]), fall["mwp"], FAELLE["knoten"])
				e = fall["erwartet"]
				if e is None:
					self.assertIsNone(b)
					continue
				self.assertEqual(b["knoten"]["id"], e["id"])
				self.assertEqual(b["luftlinieM"], e["luftlinieM"])
				self.assertEqual(b["trasseM"], e["trasseM"])
				self.assertEqual(b["kosten"]["summe"], e["summe"])

	def test_distanz(self):
		for fall in FAELLE["distanz"]:
			self.assertAlmostEqual(distanz_m(fall["a"], fall["b"]), fall["erwartetM"], places=2)

	def test_kompaktheit(self):
		for fall in FAELLE["kompaktheit"]:
			self.assertAlmostEqual(flaeche_m2(fall["geo"]), fall["flaecheM2"], delta=0.1)
			self.assertEqual(kompaktheit([fall["geo"]], flaeche_m2(fall["geo"])), fall["erwartet"])


class Regeln(unittest.TestCase):
	BASIS = {"ha": 12, "kompaktheit": 0.95, "neigungGrad": 2, "exposition": "S", "nutzung": {"acker": 12}, "schutz": [], "siedlungAbstandM": 500, "bundesland": "Oberösterreich", "land": "AT", "widmung": {"status": "zone"}}

	def netz(self, km, kap="unbekannt"):
		return {"knoten": {"art": "trafo", "kapazitaet": kap}, "luftlinieM": km * 800, "trasseM": km * 1000, "kosten": netzkosten(10.9, km, "msLeitung", kap)}

	def test_distanz_bekannt(self):
		# Braunau am Inn → Ried im Innkreis ≈ 34 km Luftlinie
		self.assertAlmostEqual(distanz_m((13.0346, 48.2566), (13.4886, 48.2107)) / 1000, 34.0, delta=0.6)
		self.assertAlmostEqual(distanz_m((0, 0), (0, 1)), 111195, delta=5)

	def test_trasse(self):
		self.assertEqual(s.trasse_m(1000), 1250)
		self.assertEqual(s.trasse_m(1000, 2), 1550)

	def test_trasse_monoton(self):
		werte = [s.bewerte({**self.BASIS, "netz": self.netz(km)})["score"] for km in (0.5, 2, 4, 7, 11, 20)]
		self.assertEqual(werte, sorted(werte, reverse=True))

	def test_kapazitaet_knapp_wertet_ab(self):
		a = s.bewerte({**self.BASIS, "netz": self.netz(2, "frei")})["score"]
		b = s.bewerte({**self.BASIS, "netz": self.netz(2, "knapp")})["score"]
		self.assertGreater(a, b)

	def test_ko_deckel(self):
		r = s.bewerte({**self.BASIS, "ha": 1.5, "netz": self.netz(1)})
		self.assertEqual(r["score"], 25)
		self.assertEqual(r["ampel"], "rot")
		r = s.bewerte({**self.BASIS, "schutz": [{"art": "nationalpark", "anteil": 0.5, "abstandM": 0}], "netz": self.netz(1)})
		self.assertLessEqual(r["score"], 15)

	def test_nahe_schutzgebiet_abzug(self):
		a = s.bewerte({**self.BASIS, "netz": self.netz(1)})["score"]
		b = s.bewerte({**self.BASIS, "schutz": [{"art": "natura2000", "anteil": 0, "abstandM": 0}], "netz": self.netz(1)})["score"]
		self.assertEqual(a - b, 6)

	def test_widmung_ooe(self):
		self.assertEqual(s.widmungslage("Oberösterreich", 4.9)["status"], "zone")
		self.assertEqual(s.widmungslage("Oberösterreich", 7.4)["status"], "angrenzend")
		self.assertEqual(s.widmungslage("Oberösterreich", 7.6)["status"], "ausserhalb")
		self.assertEqual(s.widmungslage("Niederösterreich", None, 0)["status"], "zone")
		self.assertEqual(s.widmungslage("Niederösterreich", None, 150)["status"], "angrenzend")
		self.assertEqual(s.widmungslage("Salzburg")["status"], "unklar")
		self.assertEqual(s.widmungslage("Bayern")["status"], "unklar")

	def test_burgenland_ausserhalb_zone_ausgeschlossen(self):
		r = s.bewerte({**self.BASIS, "bundesland": "Burgenland", "widmung": s.widmungslage("Burgenland", None, 5000), "netz": self.netz(1)})
		self.assertEqual(r["score"], 20)

	def test_netzkosten_rechner(self):
		# wie Selbsttest des Netzanschluss-Rechners: 10 MWp, 2 km, frei → Stationen + Einschleifen + Kabel
		r = netzkosten(10, 2, "auto", "frei")
		self.assertEqual(r["ebene"], "msLeitung")
		self.assertEqual(r["summe"], 10 * 35000 + 80000 + 2000 * 120)
		self.assertEqual(r["monate"], [9, 18])
		self.assertEqual(netzkosten(30, 3)["ebene"], "uwMs")
		self.assertEqual(netzkosten(80, 4)["ebene"], "hs")
		self.assertEqual(netzkosten(10, 2, "auto", "knapp")["ampel"], "kritisch")

	def test_bester_knoten_nach_kosten(self):
		knoten = [
			{"id": "nah-knapp", "art": "uw110", "kapazitaet": "knapp", "lon": 13.001, "lat": 48.0},
			{"id": "weiter-frei", "art": "uw110", "kapazitaet": "frei", "lon": 13.02, "lat": 48.0},
			{"id": "trafo", "art": "trafo", "kapazitaet": "unbekannt", "lon": 13.0, "lat": 48.001},
		]
		# 20 MWp → Umspannwerk nötig, Trafostation scheidet aus
		b = s.bester_knoten((13.0, 48.0), 20, knoten)
		self.assertNotEqual(b["knoten"]["id"], "trafo")
		# 3 MWp → Einschleifen an der nahen Trafostation am günstigsten
		self.assertEqual(s.bester_knoten((13.0, 48.0), 3, knoten)["knoten"]["id"], "trafo")
		self.assertIsNone(s.bester_knoten((10.0, 48.0), 3, knoten))

	def test_kennzahlen(self):
		k = s.kennzahlen(11, 1130)
		self.assertEqual(k["mwp"], 10.0)
		self.assertEqual(k["ertragMwh"], 11300)
		self.assertEqual(k["pachtJahr"]["min"], 11 * 1500)
		self.assertEqual(s.prioritaet(70, 6), "A")
		self.assertEqual(s.prioritaet(70, 4), "B")
		self.assertEqual(s.prioritaet(30, 40), "C")

	def test_geometrie(self):
		q = {"type": "Polygon", "coordinates": [[[13, 48], [13.01, 48], [13.01, 48.01], [13, 48.01], [13, 48]]]}
		self.assertTrue(punkt_in_polygon((13.005, 48.005), q))
		self.assertFalse(punkt_in_polygon((13.02, 48.005), q))
		self.assertAlmostEqual(flaeche_m2(q) / 1e4, 82.8, delta=0.5)  # 0,01° × 0,01° bei 48° N ≈ 744 m × 1112 m
		n, e = neigung_exposition(0, 0.1)  # Gelände steigt nach Norden an → Hang fällt nach Süden ab
		self.assertEqual(e, "S")
		self.assertAlmostEqual(n, 5.71, places=1)
		self.assertEqual(neigung_exposition(0.001, 0)[1], "eben")

	def test_jsround(self):
		self.assertEqual(jsround(2.5), 3)
		self.assertEqual(jsround(-2.5), -2)
		self.assertEqual(jsround(0.5), 1)


if __name__ == "__main__":
	unittest.main()
