# Copyright (c) 2026, ÖkoInvest GmbH
#
# Reine Logik „Finanzen & Abrechnung“ ohne Frappe:
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.finanzen.test_logik -v
# Gleiche Fälle wie src/lib/plattform/finanzen/finanzen.test.mjs (JS und Python müssen dasselbe rechnen).

import unittest

from oekoinvest_app.plattform.finanzen import logik as L
from oekoinvest_app.plattform.finanzen import sepa as S
from oekoinvest_app.plattform.finanzen import steuer as T

TAB = [
	{"reihe": "VPI-AT-2020", "jahr": 2022, "wert": 110},
	{"reihe": "VPI-AT-2020", "jahr": 2023, "wert": 121},
	{"reihe": "VPI-AT-2020", "jahr": 2024, "wert": 124},
	{"reihe": "VPI-AT-2020", "jahr": 2025, "wert": 130.2},
]


class TestIndexierung(unittest.TestCase):
	def test_jaehrlich_voll(self):
		v = L.index_verlauf(10000, 2022, "VPI-AT-2020", TAB, 2026)
		self.assertEqual(v["basisIndex"], 110)
		self.assertEqual([s["betrag"] for s in v["schritte"]], [10000, 11000, 11272.73, 11836.37])
		self.assertEqual(v["fehlt"], [])

	def test_schwelle_anteil_nur_erhoehung(self):
		v = L.index_verlauf(10000, 2022, "VPI-AT-2020", TAB, 2026, schwelle_pct=5, anteil_pct=80)
		self.assertEqual(v["schritte"][1]["betrag"], 10800)
		self.assertFalse(v["schritte"][2]["angepasst"])
		self.assertTrue(v["schritte"][3]["angepasst"])
		runter = L.index_verlauf(1000, 2025, "VPI-AT-2020", TAB, 2026, basis_index=140, nur_erhoehung=True)
		self.assertEqual(runter["betrag"], 1000)
		self.assertEqual(L.index_verlauf(1000, 2025, "VPI-AT-2020", TAB, 2027)["fehlt"], [2026])


class TestPacht(unittest.TestCase):
	def test_umsatz_mit_mindestpacht(self):
		hoch = L.umsatzbeteiligung(1_000_000, 7.5, 0.05, 10000, 0.25)
		self.assertEqual((hoch["erloesEur"], hoch["anteilEur"], hoch["mindestEur"], hoch["betrag"], hoch["mindestGreift"]), (75000, 3750, 2500, 3750, False))
		niedrig = L.umsatzbeteiligung(200_000, 7.5, 0.05, 10000, 0.25)
		self.assertEqual((niedrig["betrag"], niedrig["mindestGreift"]), (2500, True))
		f = {"phase": "pacht", "von": "2026-01-01", "bis": "2026-03-31", "anteil": 1, "faktorJahr": 0.25, "tage": 90, "tageVoll": 90}
		r = L.pacht_positionen({"modell": "umsatz", "umsatz": {"anteil": 0.05, "erloesCtKwh": 7.5, "mindestJahr": 10000}}, f, ertrag_kwh=200_000)
		self.assertEqual((r["netto"], len(r["positionen"])), (2500, 2))
		ohne = L.pacht_positionen({"modell": "umsatz", "umsatz": {"anteil": 0.05, "erloesCtKwh": 7.5, "mindestJahr": 10000}}, f, ertrag_kwh=None, ertrag_fehlt=["2026-02"])
		self.assertTrue(ohne["klaerung"])

	def test_faelligkeiten(self):
		v = {"id": "PT-1", "vertragsdatum": "2025-03-01", "beginn": "2026-07-15", "laufzeitJahre": 30, "faelligkeit": "jaehrlich", "zahlweise": "vorschuessig", "zahlungszielTage": 10, "reservierungJahr": 2000, "vorlaufTage": 14}
		f = L.faelligkeiten(v, "2026-09-30")
		res = [x for x in f if x["phase"] == "reservierung"]
		self.assertEqual(len(res), 2)
		self.assertEqual((res[0]["von"], res[1]["bis"], res[1]["faelligAm"]), ("2025-03-01", "2026-07-14", "2026-07-25"))
		p = next(x for x in f if x["phase"] == "pacht")
		self.assertEqual((p["von"], p["bis"], p["faelligAm"]), ("2026-07-15", "2026-12-31", "2026-07-25"))
		self.assertAlmostEqual(p["faktorJahr"], 170 / 365)
		self.assertEqual(L.laufzeit_ende("2026-07-15", 30), "2056-07-14")
		self.assertEqual(len(L.abzurechnen(v, "2026-09-30")), 3)
		self.assertEqual(L.naechste_faelligkeit(v, "2026-09-30")["von"], "2027-01-01")
		self.assertEqual(len(L.perioden("2026-02-10", "2026-05-31", "quartalsweise", "2026-12-31")), 2)


class TestContracting(unittest.TestCase):
	MP = [
		{"id": "MP-E", "art": "erzeugung", "abrechnungsrelevant": True, "zaehlernummer": "1ERZ", "bezeichnung": "Erzeugung"},
		{"id": "MP-Z", "art": "zweirichtung", "abrechnungsrelevant": True, "zaehlernummer": "1ZR", "bezeichnung": "Netz"},
		{"id": "MP-M", "art": "erzeugung", "abrechnungsrelevant": False, "zaehlernummer": "MON", "bezeichnung": "Monitoring"},
	]
	ZEILEN = [
		{"monat": "2026-08", "messpunktId": "MP-E", "register": "2.8.0", "stand": 150000, "menge": 50000, "geprueft": True},
		{"monat": "2026-08", "messpunktId": "MP-Z", "register": "2.8.0", "stand": 30000, "menge": 10000, "geprueft": True},
		{"monat": "2026-08", "messpunktId": "MP-Z", "register": "1.8.0", "stand": 9000, "menge": 3000, "geprueft": True},
	]
	VERTRAG = {"strompreisCt": 12, "grundgebuehrMonat": 100, "indexierungPct": 2, "beginn": "2024-05-01"}

	def test_rechnung_und_klaerfall(self):
		r = L.contracting_abrechnen(self.VERTRAG, {"kwp": 400}, "2026-08", self.MP, self.ZEILEN)
		self.assertTrue(r["ok"])
		self.assertEqual(r["gelieferteKwh"], 40000)
		self.assertEqual(L.arbeitspreis(self.VERTRAG, "2026-08")["ct"], 12.485)
		self.assertEqual(r["netto"], round((40000 * 12.485 + 10000)) / 100)
		self.assertFalse(L.contracting_abrechnen(self.VERTRAG, {"kwp": 400}, "2026-09", self.MP, self.ZEILEN)["ok"])
		self.assertFalse(L.contracting_abrechnen(self.VERTRAG, {"kwp": 100}, "2026-08", self.MP, self.ZEILEN)["ok"])
		speicher = L.contracting_abrechnen({"strompreisCt": 0, "grundgebuehrMonat": 2400}, {}, "2026-08", [], [])
		self.assertEqual((speicher["ok"], speicher["netto"]), (True, 2400))
		self.assertEqual(L.ertrag_aus_monatswerten(self.ZEILEN, self.MP, "2026-08-01", "2026-08-31")["kwh"], 50000)
		tab = [{"reihe": "VPI-DE-2020", "jahr": 2023, "wert": 100}, {"reihe": "VPI-DE-2020", "jahr": 2024, "wert": 102}, {"reihe": "VPI-DE-2020", "jahr": 2025, "wert": 105.06}]
		self.assertEqual(L.arbeitspreis({"strompreisCt": 12, "beginn": "2024-05-01", "indexBasis": "vpi"}, "2026-08", tab, "DE")["ct"], 12.607)
		self.assertEqual(L.arbeitspreis({"strompreisCt": 12, "beginn": "2024-05-01", "indexBasis": "fest", "indexierungPct": 3}, "2026-08")["ct"], 12)
		self.assertFalse(L.contracting_abrechnen({**self.VERTRAG, "indexBasis": "strompreis"}, {"kwp": 400}, "2026-08", self.MP, self.ZEILEN)["ok"])


class TestProvisionSteuer(unittest.TestCase):
	def test_provision_und_zahlung(self):
		pos = L.provision_positionen({"satz": 0.025, "kaufpreis": 912000, "betrag": 22800, "projektId": "P-26-XYZ"}, "Solarpark Nord")
		self.assertEqual(pos[0]["betrag"], 22800)
		self.assertIn("2,50 %", pos[0]["text"])
		self.assertEqual(L.zahlungsstatus({"status": "offen", "faelligAm": "2026-09-01"}, "2026-09-30"), "ueberfaellig")
		self.assertEqual(L.mahnhinweis({"status": "offen", "faelligAm": "2026-09-01"}, "2026-09-30")["stufe"], 2)
		self.assertEqual(L.provision_status_aus_rechnung({"status": "bezahlt"}), "bezahlt")

	def test_steuervorlagen(self):
		self.assertEqual(T.steuer_vorschlag("pacht", "DE")["vorlage"], "DE-Pacht-frei")
		self.assertEqual(T.steuer_vorschlag("pacht", "AT", option=True)["vorlage"], "AT-Pacht-Option")
		self.assertEqual(T.steuer_vorschlag("contracting", "DE")["vorlage"], "DE-RC-13b")
		self.assertEqual(T.steuer_vorschlag("provision", "CH")["vorlage"], "AT-Drittland")
		self.assertIn("Steuerberatung", T.steuer_vorschlag("pacht", "AT")["hinweise"][0])
		s = T.steuer_berechnen(1000, "AT-USt-20")
		self.assertEqual((s["betrag"], s["brutto"]), (200, 1200))
		self.assertTrue(len(T.pflichtangaben_pruefen({"beleg": "rechnung"})) > 5)


class TestSepa(unittest.TestCase):
	def test_iban_und_pain001(self):
		self.assertTrue(S.iban_pruefen("AT61 1904 3002 3457 3201"))
		self.assertTrue(S.iban_pruefen("DE89370400440532013000"))
		self.assertFalse(S.iban_pruefen("DE89370400440532013001"))
		neu = S.iban_bauen("DE", "370400440532013099")
		self.assertTrue(S.iban_pruefen(neu))
		self.assertEqual(S.iban_maskieren("AT611904300234573201"), "AT61 **** **** **** 3201")
		self.assertEqual(S.sepa_text("Müller & Söhne – Pacht „2026“ 100 €"), "Mueller + Soehne - Pacht '2026' 100 EUR")
		xml = S.pain001("ZL-26-ABC123", "2026-10-02", {"name": "ÖkoInvest GmbH", "iban": "AT611904300234573201", "bic": "BKAUATWW"}, [
			{"endToEndId": "PG-2026-0001", "betrag": 1234.5, "name": "Hans Müller", "iban": "DE89370400440532013000", "verwendungszweck": "Gutschrift PG-2026-0001"},
			{"endToEndId": "PG-2026-0002", "betrag": 99.99, "name": "Anna <Test>", "iban": neu, "bic": "COBADEFFXXX", "verwendungszweck": "Gutschrift PG-2026-0002"},
		])
		self.assertEqual(S.pain001_pruefen(xml), [])
		self.assertIn("<CtrlSum>1334.49</CtrlSum>", xml)
		self.assertNotIn("<Test>", xml)
		with self.assertRaises(ValueError):
			S.pain001("X", "2026-10-02", {"name": "A", "iban": "AT611904300234573201"}, [{"endToEndId": "1", "betrag": 1, "name": "B", "iban": "DE00123"}])
		self.assertTrue(S.pain001_pruefen(xml.replace("<CtrlSum>1334.49</CtrlSum>", "<CtrlSum>1.00</CtrlSum>")))


class TestAfa(unittest.TestCase):
	def test_plan(self):
		at = L.afa_plan(100000, 20, "2025-09-01", "AT")
		self.assertEqual((at[0]["afa"], len(at), at[-1]["restbuchwert"]), (2500, 21, 0))
		self.assertEqual(L.afa_plan(120000, 20, "2025-10-15", "DE")[0]["afa"], 1500)
		b = L.budget_vergleich([{"kostenart": "planung", "betrag": 60000}, {"kostenart": "netz", "betrag": 30000}], 100000, 12)
		self.assertEqual((b["ist"], b["ampel"], b["jeMwp"]), (90000, "gelb", 7500))



class TestPachtakteIntegration(unittest.TestCase):
	"""Kündigung/Beendigung und Zahlungsaufteilung (gleiche Fälle wie finanzen.test.mjs)."""

	def test_kuendigung_beendigung(self):
		v = {"id": "PT-T", "vertragsdatum": "2023-06-01", "beginn": "2024-01-01", "laufzeitJahre": 20, "faelligkeit": "monatlich", "zahlweise": "nachschuessig", "zahlungszielTage": 14, "vorlaufTage": 14, "status": "gekuendigt", "kuendigungZum": "2026-06-15"}
		f = L.faelligkeiten(v, "2026-12-31")
		self.assertEqual(len(f), 30)
		self.assertEqual((f[-1]["von"], f[-1]["bis"], f[-1]["anteil"], f[-1]["erstellbarAb"]), ("2026-06-01", "2026-06-15", 0.5, "2026-06-16"))
		self.assertEqual(L.vertrags_ende(v), "2026-06-15")
		self.assertEqual(L.vertrags_ende({**v, "status": "beendet", "beendetAm": "2026-05-10"}), "2026-05-10")
		self.assertEqual(L.vertrags_ende({**v, "status": "aktiv"}), "2043-12-31")
		r = L.faelligkeiten({"id": "PT-R", "vertragsdatum": "2023-06-01", "beginn": "", "reservierungJahr": 1200, "faelligkeit": "jaehrlich", "status": "gekuendigt", "kuendigungZum": "2024-03-31"}, "2026-12-31")
		self.assertEqual([(x["phase"], x["von"], x["bis"]) for x in r], [("reservierung", "2023-06-01", "2023-12-31"), ("reservierung", "2024-01-01", "2024-03-31")])

	def test_aufteilung(self):
		t = L.pacht_aufteilen([{"art": "pacht", "text": "Pacht 2026", "menge": 1, "preis": 1000.01, "betrag": 1000.01}, {"art": "mindest", "text": "Aufstockung", "menge": 0.5, "preis": 500.1, "betrag": 250.05}], [{"name": "A", "email": "a@example.com", "anteilProzent": 50}, {"name": "B", "anteilProzent": 33.33}, {"name": "C", "anteilProzent": 16.67}])
		self.assertEqual([(x["nr"], x["netto"], [p["betrag"] for p in x["positionen"]]) for x in t], [(1, 625.04, [500.01, 125.03]), (2, 416.64, [333.3, 83.34]), (3, 208.38, [166.7, 41.68])])
		self.assertEqual(t[1]["positionen"][0]["text"], "Pacht 2026 – Anteil 33,33 %")
		self.assertIsNone(L.pacht_aufteilen([{"betrag": 10, "text": "x"}], [{"anteilProzent": 100}]))
		self.assertFalse(L.aufteilung_gilt({"empfaenger": [{}], "ab": "2026-07-01"}, {"bis": "2026-06-30"}))
		self.assertTrue(L.aufteilung_gilt({"empfaenger": [{}], "ab": "2026-07-01"}, {"bis": "2026-07-31"}))


if __name__ == "__main__":
	unittest.main()
