# Copyright (c) 2026, ÖkoInvest GmbH
# Gemeindecockpit – reine Regeln (ohne Frappe lauffähig):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_gemeinde_kern
# Verfahrensschritte je Land, Termine, § 6 EEG (höchstens 0,2 ct/kWh), Einnahmen, Stellungnahmen, Material-Entwürfe.

import unittest

from oekoinvest_app.plattform import gemeinde_kern as C
from oekoinvest_app.plattform.mitglied_kern import MitgliedFehler


class TestGemeinde(unittest.TestCase):
	def test_verfahren(self):
		self.assertEqual(C.VERFAHREN["DE"][0][0], "aufstellung")
		self.assertIn("umwidmung", [s[0] for s in C.VERFAHREN["AT"]])
		self.assertIn("Art. 26 RPG", [s[2] for s in C.VERFAHREN["CH"]][5])
		with self.assertRaises(MitgliedFehler):
			C.schritt_bereinigen({"schritt": "umwidmung", "status": "offen"}, "DE")
		with self.assertRaises(MitgliedFehler):
			C.schritt_bereinigen({"schritt": "satzung", "status": "erledigt"}, "DE")
		st = C.verfahren_stand("DE", {"aufstellung": {"status": "erledigt", "datum": "2026-01-01"}, "fnp": {"status": "entfaellt"}})
		self.assertEqual(st["gesamt"], len(C.VERFAHREN["DE"]) - 1)
		self.assertEqual(st["erledigt"], 1)
		self.assertEqual(st["naechster"]["id"], "fruehzeitig")

	def test_zahlungen(self):
		z = C.zahlung_bereinigen({"art": "par6", "jahr": 2028, "kwh": 30000000, "ctProKwh": "0,2"}, "DE")
		self.assertEqual(z["betragEur"], 60000)
		with self.assertRaises(MitgliedFehler):
			C.zahlung_bereinigen({"art": "par6", "jahr": 2028, "kwh": 1, "ctProKwh": 0.3}, "DE")
		with self.assertRaises(MitgliedFehler):
			C.zahlung_bereinigen({"art": "par6", "jahr": 2028, "kwh": 1, "ctProKwh": 0.2}, "AT")
		with self.assertRaises(MitgliedFehler):
			C.zahlung_bereinigen({"art": "pacht", "jahr": 2028, "betragEur": 100, "status": "gezahlt"}, "AT")
		s = C.einnahmen_summe([{"art": "par6", "jahr": 2028, "status": "vereinbart", "betragEur": 100}, {"art": "gewerbesteuer", "jahr": 2029, "status": "prognose", "betragEur": 50}, {"art": "pacht", "jahr": 2027, "status": "gezahlt", "betragEur": 10}])
		self.assertEqual((s["vereinbart"], s["prognose"], s["gezahlt"]), (100, 50, 10))

	def test_termine_und_stellungnahmen(self):
		with self.assertRaises(MitgliedFehler):
			C.termin_bereinigen({"art": "gemeinderat", "titel": "Sitzung"})
		t = C.termin_bereinigen({"art": "gemeinderat", "titel": "Sitzung", "beginn": "2026-11-02T18:00"})
		s = C.termine_sortiert([t, {**t, "beginn": "2026-01-01T10:00"}, {**t, "beginn": "2026-12-01T10:00", "status": "abgesagt"}], "2026-10-01T09:00")
		self.assertEqual(len(s["kommend"]), 1)
		self.assertEqual(len(s["vergangen"]), 2)
		with self.assertRaises(MitgliedFehler):
			C.stellungnahme_bereinigen({"betreff": "x", "text": "kurz"})
		with self.assertRaises(MitgliedFehler):
			C.antwort_bereinigen({"text": ""})

	def test_material(self):
		m = C.material_entwurf("pressemitteilung", {"name": "Demo-Stadt", "land": "DE"}, {"art": "Freiflächen-PV", "ha": 31, "phase": "Bauleitplanung / Genehmigung", "par6": {"kwp": 28000, "kwh": 28000000, "euroProJahr": 56000}})
		self.assertIn("Demo-Stadt", m["titel"])
		self.assertTrue(any("§ 6 EEG" in a for a in m["absaetze"]))
		at = C.material_entwurf("faq", {"name": "Musterdorf", "land": "AT"})
		self.assertTrue(any("vertraglich" in a for a in at["absaetze"]))
		for art in C.MATERIAL_VORLAGEN:
			self.assertTrue(C.material_entwurf(art, {"name": "G", "land": "CH"})["absaetze"])
		with self.assertRaises(MitgliedFehler):
			C.material_entwurf("werbung", {})


if __name__ == "__main__":
	unittest.main()
