# Copyright (c) 2026, ÖkoInvest GmbH
# Finanzierung – reine Regeln ohne Frappe (python -m unittest oekoinvest_app.plattform.tests.test_finanzierung_kern):
# Annuität/Tilgungsplan, Term-Sheet-Prüfung, Covenant-Ampel, LTM-DSCR, LLCR, Monats-CFADS. Gleiche Fälle wie
# scripts/plattform-test-finanzierung.mjs (Logikteil).

import unittest

from oekoinvest_app.plattform import finanzierung_kern as K


class TestFinanzierungKern(unittest.TestCase):
	def test_annuitaet_und_plan(self):
		rate = K.annuitaet(1_000_000, 0.045, 18)
		plan = K.tilgungsplan(1_000_000, 0.045, 18, T=30)
		for d in plan["dienst"][:18]:
			self.assertAlmostEqual(d, rate, places=6)
		self.assertAlmostEqual(sum(plan["tilgung"]), 1_000_000, places=4)
		self.assertLess(plan["rest"][17], 0.01)
		self.assertEqual(plan["dienst"][18], 0)
		self.assertAlmostEqual(plan["zinsen"][0], 45_000, places=6)

	def test_foerderkredit_linear_mit_anlauf(self):
		plan = K.tilgungsplan(1_000_000, 0.04, 20, "linear", anlauf=3, T=20)
		self.assertEqual(plan["tilgung"][:3], [0.0, 0.0, 0.0])
		self.assertAlmostEqual(plan["tilgung"][3], 1_000_000 / 17, places=6)
		self.assertLess(plan["rest"][19], 0.01)

	def test_endfaellig(self):
		plan = K.tilgungsplan(500_000, 0.05, 5, "endfaellig", T=6)
		self.assertEqual(plan["tilgung"][:4], [0.0] * 4)
		self.assertAlmostEqual(plan["tilgung"][4], 500_000)

	def test_termsheet(self):
		t = K.termsheet_bereinigen({"betrag": 5e6, "laufzeitJahre": 18, "zinsArt": "euribor6", "margePct": 1.8, "referenzAnnahmePct": 2.7, "sicherheiten": ["abtretung", "boese"]})
		self.assertAlmostEqual(K.all_in_zins(t), 0.045)
		self.assertEqual(t["sicherheiten"], ["abtretung"])
		with self.assertRaises(K.FinanzierungFehler):
			K.termsheet_bereinigen({"betrag": 5e6, "laufzeitJahre": 18, "zinsArt": "fix"})
		with self.assertRaises(K.FinanzierungFehler):
			K.termsheet_bereinigen({"betrag": 5e6, "laufzeitJahre": 18, "zinsArt": "fix", "zinsPct": 4, "dscrCovenant": 1.2, "dscrLockup": 1.1})

	def test_ampel(self):
		self.assertEqual(K.covenant_ampel(1.3)["id"], "gruen")
		self.assertEqual(K.covenant_ampel(1.12)["id"], "gelb")
		self.assertEqual(K.covenant_ampel(1.3, vorher=1.55)["id"], "gelb")
		lock = K.covenant_ampel(1.08)
		self.assertEqual((lock["id"], lock["lockup"], lock["verletzt"]), ("rot", True, False))
		self.assertTrue(K.covenant_ampel(1.0)["verletzt"])
		self.assertEqual(K.covenant_ampel(None)["id"], "grau")

	def test_ltm_und_llcr(self):
		monate = [{"monat": f"{2025 + (i // 12)}-{(i % 12) + 1:02d}", "cfads": 12_000, "schuldendienst": 10_000} for i in range(15)]
		erg = K.covenant_pruefung(monate, 1.1, 1.05, llcr_covenant=1.3, restschuld=100_000, plan_cfads=[20_000] * 5, zins=0.05)
		self.assertTrue(all(abs(p["dscr"] - 1.2) < 1e-9 for p in erg["pruefungen"]))
		self.assertTrue(any(p["periode"].startswith("Q") for p in erg["pruefungen"]))
		self.assertAlmostEqual(erg["llcr"], K.npv(0.05, [0] + [20_000] * 5) / 100_000)
		self.assertEqual(erg["ampel"]["id"], "rot")  # LLCR 0,87 < 1,3

	def test_monats_cfads(self):
		erloes, kosten, cfads = K.monats_cfads(100_000, 40_000, 10.0, 500, 4.0, 3_000, 1_000)
		self.assertAlmostEqual(erloes, 60_000 * 0.10 + 500 + 40_000 * 0.04)
		self.assertAlmostEqual(cfads, erloes - 4_000)

	def test_stammlisten(self):
		self.assertIn("financial_model", K.BANKENPAKET_IDS)
		self.assertEqual(len(K.CP_IDS), len(set(K.CP_IDS)))


if __name__ == "__main__":
	unittest.main()
