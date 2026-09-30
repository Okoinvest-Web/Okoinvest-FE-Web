# Copyright (c) 2026, ÖkoInvest GmbH
# Planungsdateien & Projektkostenkalkulation – reine Regeln (ohne Frappe lauffähig):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_planung_kern
# Parität mit src/lib/plattform/planung/kosten.js: Referenzwerte unten wurden mit dem JavaScript-Modul berechnet
# (gleiche Fälle wie scripts/plattform-test-planung.mjs); Status, Änderungsindex, Sichtbarkeit, Format-Kennung.

import json
import unittest

from oekoinvest_app.plattform import planung_kern as K

REFERENZ = json.loads(r"""{"ff10": {"p": {"typ": "freiflaeche", "land": "DE", "mwp": 10, "flaecheHa": 11, "flaechenAnzahl": 2, "zaunM": 1325, "trasse": {"abschnitte": [{"art": "graben", "laengeM": 1200}, {"art": "spuelbohrung", "laengeM": 60}], "querungen": {"strasse": 1}}, "gutachten": [{"schluessel": "gutachten_artenschutz", "titel": "Artenschutz (saP)"}, {"schluessel": "gutachten_blendung", "titel": "Blendgutachten"}], "kostenstand": "kostenrahmen"}, "man": [{"schluessel": "module", "gewerk": "module", "menge": 10000, "ep": 105, "manuell": true}, {"schluessel": "frei:x", "gewerk": "sonstiges", "bezeichnung": "Vermessung", "art": "menge", "menge": 1, "einheit": "psch", "ep": 18000, "manuell": true, "istEur": 6500}], "gesamt": 6448149.01, "capex": 6352665.37, "fb": 6698149.01, "n": 31, "gruppen": {"entwicklung": 656600, "grundstueck": 26300, "technik": 4518193.99, "netz": 605800, "neben": 33371.98, "reserve": 512399.4, "finanzierung": 95483.64, "sicherheit": 250000}}, "agri30": {"p": {"typ": "agri", "land": "AT", "mwp": 30, "flaecheHa": 48, "trasse": {"abschnitte": [{"art": "pflug", "laengeM": 3100}]}, "kostenstand": "angebote", "bauzeitMonate": 9}, "man": [], "gesamt": 24719028.33, "capex": 24255805.58, "fb": 25469028.33, "n": 26, "gruppen": {"entwicklung": 1978800, "grundstueck": 50500, "technik": 18728092.57, "netz": 2379700, "neben": 63323.38, "reserve": 1055389.63, "finanzierung": 463222.75, "sicherheit": 750000}}, "sp": {"p": {"typ": "speicher", "land": "DE", "mwp": 20, "mwh": 40, "speicherNetzbezug": true, "flaecheHa": 1}, "man": [], "gesamt": 18485979.53, "capex": 18136900, "fb": 18485979.53, "n": 14, "gruppen": {"entwicklung": 1300600, "grundstueck": 2500, "technik": 10400000, "netz": 4200000, "neben": 43800, "reserve": 2190000, "finanzierung": 349079.53, "sicherheit": 0}}, "carport": {"p": {"typ": "carport", "land": "AT", "mwp": 2.4, "kostenstand": "vergabe"}, "man": [], "gesamt": 3729543.21, "capex": 3672331.67, "fb": 3789543.21, "n": 19, "gruppen": {"entwicklung": 156000, "grundstueck": 0, "technik": 3239999.68, "netz": 164000, "neben": 10212, "reserve": 102119.99, "finanzierung": 57211.54, "sicherheit": 60000}}, "hs60": {"p": {"typ": "freiflaeche", "mwp": 60, "flaecheHa": 70, "trasse": {"abschnitte": [{"art": "graben", "laengeM": 5000}]}}, "man": [], "gesamt": 51428799.67, "capex": 50655393.87, "fb": 52928799.67, "n": 26, "gruppen": {"entwicklung": 3942000, "grundstueck": 77500, "technik": 27447436.14, "netz": 13000000, "neben": 121342.31, "reserve": 6067115.42, "finanzierung": 773405.8, "sicherheit": 1500000}}}""")


class TestKostenParitaet(unittest.TestCase):
	def test_referenzfaelle_wie_javascript(self):
		for name, f in REFERENZ.items():
			e = K.berechnen(K.zusammenfuehren(f["man"], K.vorschlag(f["p"])), f["p"])
			self.assertEqual(len(e["positionen"]), f["n"], name)
			self.assertAlmostEqual(e["summen"]["gesamt"], f["gesamt"], places=2, msg=name)
			self.assertAlmostEqual(e["summen"]["capex"], f["capex"], places=2, msg=name)
			self.assertAlmostEqual(e["summen"]["finanzierungsbedarf"], f["fb"], places=2, msg=name)
			for g, w in f["gruppen"].items():
				self.assertAlmostEqual(e["gruppen"][g]["soll"], w, places=2, msg=f"{name}/{g}")

	def test_epc_ohne_mengen_entspricht_markt(self):
		p = {"typ": "freiflaeche", "mwp": 10}
		e = K.berechnen(K.zusammenfuehren([], K.vorschlag(p)), p)
		self.assertAlmostEqual(e["summen"]["epcProKwp"], K.FF["capexProKwp"]["mittel"], delta=0.1)

	def test_trasse_setzen_proportional(self):
		p = {"trasse": {"abschnitte": [{"art": "graben", "laengeM": 1200}, {"art": "spuelbohrung", "laengeM": 60}]}}
		t = K.trasse_setzen(p, 2520, "akquise:AZ-1")
		self.assertEqual([a["laengeM"] for a in t["trasse"]["abschnitte"]], [2400, 120])
		self.assertEqual(K.trassen_laenge(K.trasse_setzen({}, 800)), 800)

	def test_contingency_je_kostenstand(self):
		self.assertEqual(K.parameter_voll({"kostenstand": "kostenberechnung"})["contingency"], 0.07)
		self.assertEqual(K.parameter_voll({"kostenstand": "abrechnung"})["contingency"], 0)
		self.assertEqual(K.parameter_voll({"contingency": 0.12})["contingency"], 0.12)


class TestPlaene(unittest.TestCase):
	def test_status_und_index(self):
		self.assertEqual(K.aktion_pruefen("einreichen", "entwurf", "planer"), (True, "pruefung"))
		self.assertEqual(K.aktion_pruefen("freigeben", "pruefung", "planer")[1][0], 403)
		self.assertEqual(K.aktion_pruefen("freigeben", "entwurf", "bo")[1][0], 409)
		self.assertEqual(K.aktion_pruefen("zurueckweisen", "pruefung", "bo", "")[1][0], 422)
		self.assertEqual([K.naechster_index([]), K.naechster_index(["A", "B"]), K.naechster_index(["Z"]), K.naechster_index(["AZ"])], ["A", "C", "AA", "BA"])

	def test_sichtbarkeit(self):
		plan = {"meilenstein_id": "MS-A", "planer_id": None}
		vers = [{"status": "ersetzt"}, {"status": "freigegeben"}, {"status": "pruefung"}]
		g = K.plan_zugriff({"nutzer_id": "U-G", "gutachter_ms": {"MS-A"}}, plan, vers)
		self.assertTrue(g["sehen"] and g["hochladen"] and g["version"](vers[2]))
		self.assertFalse(K.plan_zugriff({"nutzer_id": "U-G", "gutachter_ms": {"MS-X"}}, plan, vers)["sehen"])
		i = K.plan_zugriff({"nutzer_id": "U-I", "investor": {"dokumente": 1}}, plan, vers)
		self.assertTrue(i["sehen"] and i["version"](vers[1]))
		self.assertFalse(i["version"](vers[0]) or i["version"](vers[2]) or i["hochladen"])
		self.assertFalse(K.plan_zugriff({"nutzer_id": "U-I", "investor": {"dokumente": 0}}, plan, vers)["sehen"])

	def test_format_kennung(self):
		self.assertTrue(K.erkennen(b"%PDF-1.7", "pdf"))
		self.assertTrue(K.erkennen(b"AC1032" + bytes(50), "dwg"))
		self.assertFalse(K.erkennen(b"MZ", "dwg"))
		self.assertTrue(K.erkennen(b"999\r\nKommentar\r\n0\r\nSECTION\r\n2\r\nHEADER", "dxf"))
		self.assertTrue(K.erkennen(b"PK\x03\x04...", "shape"))
		self.assertFalse(K.erkennen(b"{}", "exe"))


if __name__ == "__main__":
	unittest.main()
