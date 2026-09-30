# Copyright (c) 2026, ÖkoInvest GmbH
# Energiebeschaffung – reine Logik ohne Frappe (Spiegel von Teil A in scripts/plattform-test-energie.mjs):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_energie_kern

import unittest

from oekoinvest_app.plattform import energie_kern as k


class TestFristenUndAnalyse(unittest.TestCase):
	def test_stichtag(self):
		self.assertEqual(k.kuendigungs_stichtag("2026-12-31", 3), "2026-09-30")
		self.assertEqual(k.kuendigungs_stichtag("2027-03-31", 1), "2027-02-28")
		self.assertEqual(k.kuendigungs_stichtag("2027-01-31", frist_wochen=6), "2026-12-20")
		self.assertIsNone(k.kuendigungs_stichtag(None))

	def test_empfehlungen(self):
		basis = {"preisCt": 14, "vertragEnde": "2027-12-31", "kuendigungsfristMonate": 3, "jahresKwh": 1_000_000}
		a = k.wechselanalyse(basis, {"forwardEurMwh": 90, "profilfaktor": 1.0}, stichtag="2026-09-30")
		self.assertEqual(a["empfehlung"], "ausschreiben")
		self.assertAlmostEqual(a["marktCt"], 10.2, places=3)
		self.assertEqual(a["deltaEurJahr"], 38000)
		self.assertEqual(k.wechselanalyse({**basis, "preisCt": 10.3}, {"forwardEurMwh": 90, "profilfaktor": 1, "trend": {"richtung": "fallend"}}, stichtag="2026-09-30")["empfehlung"], "abwarten")
		self.assertEqual(k.wechselanalyse({**basis, "preisCt": 9, "verlaengerungPreisCt": 9.5}, {"forwardEurMwh": 90, "profilfaktor": 1}, stichtag="2026-09-30")["empfehlung"], "verlaengern")
		verpasst = k.wechselanalyse({**basis, "vertragEnde": "2026-12-31"}, {"forwardEurMwh": 90}, stichtag="2026-10-15")
		self.assertEqual((verpasst["empfehlung"], verpasst["alarm"]), ("verlaengern", 0))
		self.assertEqual(k.wechselanalyse({"preisCt": None}, {})["empfehlung"], "pruefen")


class TestTerminUndNormierung(unittest.TestCase):
	def test_produkte_und_csv(self):
		self.assertEqual(k.produkt_zeitraum("Q2-27")["von"], "2027-04")
		self.assertIsNone(k.produkt_zeitraum("Q5-27"))
		e, f = k.termin_csv_parsen("Handelstag;Zone;Produkt;Typ;Preis;Quelle\n29.09.2026;DE;Cal-27;base;98,50;Feed\n29.09.2026;DE;Cal-27;peak;108;\nx;DE;Cal-27;base;1;q", "Std")
		self.assertEqual((len(e), len(f), e[1]["quelle"], e[0]["preisEurMwh"]), (2, 1, "Std", 98.5))
		self.assertIsNotNone(k.termin_eintrag_pruefen({"handelstag": "2026-09-29", "zone": "DE", "produkt": "Cal-27", "typ": "base", "preisEurMwh": 97})[1])

	def test_kaskade_und_hpfc(self):
		kurve = k.aktuelle_kurve([
			{"handelstag": "2026-09-29", "zone": "DE", "produkt": "Cal-27", "typ": "base", "preisEurMwh": 100},
			{"handelstag": "2026-09-29", "zone": "DE", "produkt": "Cal-27", "typ": "peak", "preisEurMwh": 120},
			{"handelstag": "2026-09-29", "zone": "DE", "produkt": "M01-27", "typ": "base", "preisEurMwh": 130},
		])
		self.assertEqual(k.termin_preis_monat(kurve, "DE", "2027-01")["preis"], 130)
		self.assertEqual(k.termin_preis_monat(kurve, "DE", "2027-05")["preis"], 100)
		kurve2 = k.aktuelle_kurve([{"handelstag": "2026-09-29", "zone": "DE", "produkt": "Cal-27", "typ": "base", "preisEurMwh": 100}, {"handelstag": "2026-09-29", "zone": "DE", "produkt": "Cal-27", "typ": "peak", "preisEurMwh": 120}])
		start, werte, fehlend = k.stundenpreiskurve(kurve2, "DE", "2027-01", "2027-12")
		self.assertEqual(len(werte), 8760)
		self.assertAlmostEqual(sum(werte) / len(werte), 100, delta=0.2)
		peak = [w for i, w in enumerate(werte) if k.ist_peak(start + i * 3600)]
		self.assertAlmostEqual(sum(peak) / len(peak), 120, places=2)
		self.assertEqual(fehlend, [])

	def test_normierung_und_hinweis(self):
		kurve = k.aktuelle_kurve([{"handelstag": "2026-09-29", "zone": "DE", "produkt": "Cal-27", "typ": "base", "preisEurMwh": 100}, {"handelstag": "2026-09-29", "zone": "DE", "produkt": "Cal-27", "typ": "peak", "preisEurMwh": 115}])
		reihe = k.kunden_reihe("2027-01", 500000, "einschicht")
		self.assertAlmostEqual(sum(reihe[1]), 500000, delta=1)
		hp = k.stundenpreiskurve(kurve, "DE", "2027-01", "2027-12")
		ctx = k.normierung_kontext(reihe, hp[:2])
		self.assertGreater(ctx["lastgewichtetEurMwh"], ctx["baseEurMwh"])  # Einschicht: Last in teureren Peak-Stunden
		produkte = k.produkte_bereinigen([{"art": "fix", "laufzeitJahre": 1}, {"art": "spot", "laufzeitJahre": 1}])
		pa = k.preisblatt_pruefen({"positionen": [{"produktId": "P1", "arbeitspreisCt": 11.5, "grundpreisEurMonat": 100}, {"produktId": "P2", "aufschlagCt": 0.4, "grundpreisEurMonat": 50}], "bindefristBis": "2026-11-01T12:00:00Z", "zahlungszielTage": 14, "sicherheit": "keine"}, produkte)
		pb = k.preisblatt_pruefen({"positionen": [{"produktId": "P1", "arbeitspreisCt": 11.2, "grundpreisEurMonat": 400}], "bindefristBis": "2026-11-01T12:00:00Z", "zahlungszielTage": 30, "sicherheit": "buergschaft"}, produkte)
		v = k.angebote_vergleichen([{"id": "A", "lieferantId": "LA", "positionen": pa["positionen"]}, {"id": "B", "lieferantId": "LB", "positionen": pb["positionen"]}], produkte, ctx)
		fix_a = next(z for z in v["zeilen"] if z["angebotId"] == "A" and z["produktId"] == "P1")
		self.assertAlmostEqual(fix_a["eurJahr"], ctx["kwh"] * 11.5 / 100 + 1200, delta=1)
		self.assertEqual(fix_a["sensitivitaet"]["30"], fix_a["eurJahr"])
		self.assertEqual([z["rang"] for z in v["zeilen"]], list(range(1, len(v["zeilen"]) + 1)))
		h = k.bestpreis_hinweis("abstand", "LB", v)
		self.assertNotIn("LA", str(h))
		with self.assertRaises(ValueError):
			k.preisblatt_pruefen({"positionen": [{"produktId": "P1", "grundpreisEurMonat": 0}], "bindefristBis": "2026-11-01T12:00:00Z", "zahlungszielTage": 14, "sicherheit": "keine"}, produkte)


class TestAnonymPortfolio(unittest.TestCase):
	def test_anonymisierung(self):
		reihe = k.kunden_reihe("2027-01", 423456, "zweischicht")
		a = k.los_anonym(reihe, [{"kundeId": "U-26-GEHEIM", "land": "DE", "spannungsebene": "ms", "messart": "rlm", "abnahmestellen": 2, "maloId": "51238696781"}])
		text = str(a)
		self.assertNotIn("GEHEIM", text)
		self.assertNotIn("51238696781", text)
		self.assertEqual(a["jahresMengeMwh"], 420)
		self.assertEqual(a["spitzeKw"] % 10, 0)
		self.assertAlmostEqual(sum(a["monatsanteileProzent"]), 100, delta=0.5)

	def test_portfolio(self):
		pf = k.portfolio([{"periode": "Q1-27", "mwh": 100}], [{"periode": "Q1-27", "mwh": 60, "preisEurMwh": 100}, {"periode": "Q1-27", "mwh": 20, "preisEurMwh": 110}, {"periode": "Q1-27", "mwh": 5, "preisEurMwh": 1, "status": "storniert"}], lambda p: 105, 20)
		q = pf["perioden"][0]
		self.assertEqual((q["hedgeQuote"], q["mittelpreis"], q["mtmEur"], q["risikoEur"]), (0.8, 102.5, 200, 420))

	def test_zeit(self):
		t = k.monats_beginn("2026-06")
		self.assertEqual((k.ortszeit(t).hour, k.ortszeit(t).day), (0, 1))
		t = k.monats_beginn("2026-01")
		self.assertEqual((k.ortszeit(t).hour, k.ortszeit(t).day), (0, 1))


if __name__ == "__main__":
	unittest.main()
