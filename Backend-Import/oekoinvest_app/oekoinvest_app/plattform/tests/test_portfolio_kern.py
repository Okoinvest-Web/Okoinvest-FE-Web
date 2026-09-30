# Copyright (c) 2026, ÖkoInvest GmbH
# Portfolio (Investor nach dem Kauf) – reine Regeln (ohne Frappe lauffähig):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_portfolio_kern
# Zustandsautomat, Soll/Ist, DSCR/Lock-up, Kapitalabrufe, Ausschüttungssperre, Kennzahlen, Perioden, Wiederverkauf,
# Closing-Übernahme – und Gleichlauf mit src/lib/plattform/portfolio/kern.js (per Node, falls vorhanden).

import json
import os
import shutil
import subprocess
import unittest

from oekoinvest_app.plattform import portfolio_kern as K

HEUTE = "2026-09-30"
POS = {"art": "bestand", "status": "betrieb", "titel": "Solarpark Test (Demo)", "mwp": 8.2, "inbetriebnahme": "2022-07", "p50KwhJahr": 8692000, "verguetungCt": 6.4, "opexJahr": 74000, "schuldendienstJahr": 380000, "anteilProzent": 100, "kaufpreis": 5740000}
FAKTOR = [0.97, 1.03, 0.94, 1.01, 0.99, 1.05, 0.96, 0.92, 1.02, 0.98, 1.04, 0.95]


def ertraege(pos, faktor=1.0, bis="2026-08", n=12):
	return [{"monat": m, "kwh": round(K.soll_monat(pos, m) * FAKTOR[i % 12] * faktor)} for i, m in enumerate(K.monate_bis(bis, n))]


class TestAutomat(unittest.TestCase):
	def test_uebergaenge(self):
		self.assertEqual(K.uebergang_pruefen("uebernahme", "betrieb"), "betrieb")
		self.assertEqual(K.uebergang_pruefen("betrieb", "verkauf_angefragt"), "verkauf_angefragt")
		with self.assertRaises(K.PortfolioFehler) as e:
			K.uebergang_pruefen("verkauft", "betrieb")
		self.assertEqual(e.exception.status, 409)
		with self.assertRaises(K.PortfolioFehler) as e:
			K.uebergang_pruefen("betrieb", "gibtsnicht")
		self.assertEqual(e.exception.status, 422)

	def test_uebergabe_und_closing(self):
		punkte = ["a", "b"]
		self.assertEqual(K.status_nach_uebergabe("bestand", [{"schluessel": "a", "erledigt": True}], punkte), "uebernahme")
		self.assertEqual(K.status_nach_uebergabe("bestand", [{"schluessel": "a", "erledigt": True}, {"schluessel": "b", "erledigt": True}], punkte), "betrieb")
		self.assertEqual(K.status_nach_uebergabe("projekt", [{"schluessel": "a", "erledigt": True}, {"schluessel": "b", "erledigt": True}], punkte), "bau")
		x = K.position_aus_closing({"id": "CL-1", "projektId": "P-1", "land": "AT", "kaufpreis": 1e6, "vollzogenAm": "2026-09-01", "anteilProzent": 49}, {"titel": "X", "mwp": 2, "phase": "rtb", "vertraulich": {"ertragKwhKwp": 1050}, "datenblatt": {"eegZuschlagCt": 5.2}})
		self.assertEqual((x["art"], x["status"], x["p50KwhJahr"], x["verguetungCt"], x["opexJahr"], x["anteilProzent"]), ("projekt", "uebernahme", 2100000, 5.2, 18000, 49))
		self.assertEqual(K.position_aus_closing({"id": "CL-2"}, {"phase": "cod"})["art"], "bestand")


class TestErtragCovenant(unittest.TestCase):
	def test_soll_degradation(self):
		self.assertIsNone(K.soll_monat(POS, "2022-06"))
		self.assertAlmostEqual(K.soll_monat(POS, "2022-07"), 8692000 * 0.135)
		self.assertAlmostEqual(K.soll_monat(POS, "2026-07"), 8692000 * 0.135 * (1 - 0.004) ** 4)
		self.assertAlmostEqual(sum(K.PV_MONATSANTEILE), 1.0)

	def test_ertrag_ampel(self):
		e = K.ertrag_auswertung(POS, ertraege(POS), "2026-08")
		self.assertEqual(e["summe12"]["monate"], 12)
		self.assertEqual(e["ampel"], "gruen")
		self.assertIsNotNone(e["spezifisch12"])
		self.assertEqual(K.ertrag_auswertung(POS, ertraege(POS, 0.88), "2026-08")["ampel"], "rot")
		self.assertEqual(K.ertrag_auswertung(POS, ertraege(POS, 0.93), "2026-08")["ampel"], "gelb")
		self.assertEqual(K.ertrag_auswertung(POS, [], None)["ampel"], "grau")

	def test_dscr(self):
		c = K.covenant_auswertung(POS, ertraege(POS), "2026-08")
		self.assertEqual(c["ampel"], "gruen")
		self.assertGreater(c["dscr"], 1.1)
		gelb = K.covenant_auswertung({**POS, "schuldendienstJahr": 440000}, ertraege(POS), "2026-08")
		self.assertEqual((gelb["ampel"], gelb["gesperrt"]), ("gelb", True))
		rot = K.covenant_auswertung({**POS, "schuldendienstJahr": 480000}, ertraege(POS), "2026-08")
		self.assertEqual(rot["ampel"], "rot")
		self.assertIn("Event of Default", rot["grund"])
		self.assertFalse(K.covenant_auswertung({**POS, "schuldendienstJahr": 0}, [], None)["aktiv"])
		wenig = K.covenant_auswertung(POS, ertraege(POS, n=4), "2026-08")
		self.assertEqual((wenig["ampel"], wenig["dscr"]), ("grau", None))
		hoch = K.covenant_auswertung(POS, ertraege(POS, n=8), "2026-08")
		self.assertTrue(hoch["hochgerechnet"])


class TestKapital(unittest.TestCase):
	CODEV = {"art": "codev", "status": "entwicklung", "zusage": 1000000}

	def test_abruf(self):
		a = K.abruf_pruefen(self.CODEV, [], {"betrag": 250000, "faelligAm": "2026-10-10", "zweck": "Netzanschluss"}, HEUTE)
		self.assertEqual((a["nummer"], a["betrag"], a["angekuendigtAm"]), (1, 250000, HEUTE))
		with self.assertRaises(K.PortfolioFehler) as e:
			K.abruf_pruefen(self.CODEV, [], {"betrag": 1, "faelligAm": "2026-10-05", "zweck": "Netzanschluss"}, HEUTE)
		self.assertIn("10 Tage", str(e.exception))
		with self.assertRaises(K.PortfolioFehler) as e:
			K.abruf_pruefen(self.CODEV, [{"betrag": 900000, "status": "bezahlt"}], {"betrag": 200000, "faelligAm": "2026-11-01", "zweck": "Netzanschluss"}, HEUTE)
		self.assertEqual(e.exception.status, 422)
		self.assertEqual(K.abruf_pruefen(self.CODEV, [{"betrag": 900000, "status": "storniert"}], {"betrag": 200000, "faelligAm": "2026-11-01", "zweck": "Netzanschluss"}, HEUTE)["nummer"], 2)
		with self.assertRaises(K.PortfolioFehler) as e:
			K.abruf_pruefen({"art": "bestand", "status": "betrieb", "zusage": 0}, [], {}, HEUTE)
		self.assertEqual(e.exception.status, 409)

	def test_abruf_status(self):
		a = {"status": "angekuendigt", "faelligAm": "2026-09-20"}
		self.assertEqual(K.abruf_verzug(a, HEUTE), 10)
		self.assertEqual(K.abruf_aktion(a, "melden", {"referenz": "R1"}, HEUTE, "investor")["status"], "gemeldet")
		with self.assertRaises(K.PortfolioFehler):
			K.abruf_aktion(a, "bestaetigen", {}, HEUTE, "investor")
		with self.assertRaises(K.PortfolioFehler):
			K.abruf_aktion({"status": "bezahlt"}, "melden", {}, HEUTE, "investor")
		self.assertEqual(K.abruf_aktion({"status": "gemeldet"}, "bestaetigen", {"datum": "2026-09-29"}, HEUTE, "backoffice")["bezahltAm"], "2026-09-29")
		with self.assertRaises(K.PortfolioFehler):
			K.abruf_aktion({"status": "gemeldet"}, "bestaetigen", {"datum": "2026-10-29"}, HEUTE, "backoffice")
		with self.assertRaises(K.PortfolioFehler):
			K.abruf_aktion(a, "stornieren", {"grund": "x"}, HEUTE, "backoffice")

	def test_ausschuettung_sperre(self):
		daten = {"art": "gewinn", "betrag": 50000, "periode": "2025", "datum": "2026-09-15"}
		self.assertEqual(K.ausschuettung_pruefen(POS, daten, HEUTE)["status"], "gebucht")
		gesperrt = {"gesperrt": True, "grund": "DSCR 1,08 unter 1,10 – Ausschüttungssperre (Lock-up)."}
		with self.assertRaises(K.PortfolioFehler) as e:
			K.ausschuettung_pruefen(POS, daten, HEUTE, gesperrt)
		self.assertEqual(e.exception.status, 409)
		self.assertTrue(K.ausschuettung_pruefen(POS, {**daten, "bankZustimmung": True}, HEUTE, gesperrt)["bankZustimmung"])
		self.assertEqual(K.ausschuettung_pruefen(POS, {**daten, "art": "verkauf"}, HEUTE, gesperrt)["art"], "verkauf")
		for falsch in ({"periode": "2025-Q5"}, {"datum": "2027-01-01"}, {"art": "x"}, {"betrag": 0}):
			with self.assertRaises(K.PortfolioFehler):
				K.ausschuettung_pruefen(POS, {**daten, **falsch}, HEUTE)
		self.assertEqual(K.quellensteuer_hinweis("AT", "gewinn")["satz"], 0.275)
		self.assertIsNone(K.quellensteuer_hinweis("DE", "entnahme"))

	def test_kennzahlen(self):
		k = K.cashflow_kennzahlen({**POS, "anteilProzent": 50, "kaufpreis": 2000000}, [], [{"betrag": 100000, "datum": "2026-06-01", "status": "gebucht"}, {"betrag": 50000, "datum": "2025-01-01", "status": "gebucht"}, {"betrag": 9e6, "datum": "2026-06-01", "status": "storniert"}], HEUTE)
		self.assertEqual((k["paidIn"], k["ausgeschuettet"], k["ausgeschuettet12"], k["dpi"], k["cashRendite12"]), (1000000, 150000, 100000, 0.15, 0.1))
		z = K.cashflow_kennzahlen(self.CODEV, [{"betrag": 300000, "status": "bezahlt"}, {"betrag": 100000, "status": "angekuendigt"}], [], HEUTE)
		self.assertEqual((z["paidIn"], z["zusage"]["offen"], z["zusage"]["quote"]), (300000, 600000, 0.4))


class TestBerichtWiederverkauf(unittest.TestCase):
	def test_perioden(self):
		self.assertEqual(K.periode_monate("quartal", "2026-Q2"), ["2026-04", "2026-05", "2026-06"])
		self.assertEqual(len(K.periode_monate("jahr", "2025")), 12)
		self.assertEqual(K.periode_standard("quartal", HEUTE), "2026-Q2")
		self.assertEqual(K.periode_standard("quartal", "2026-02-10"), "2025-Q4")
		self.assertEqual(K.periode_standard("jahr", HEUTE), "2025")
		self.assertEqual(K.perioden_auswahl({"kaufdatum": "2025-03-15"}, HEUTE)["quartal"][-1], "2025-Q1")
		with self.assertRaises(K.PortfolioFehler):
			K.periode_monate("quartal", "2026-Q7")

	def test_steuer(self):
		for land in ("DE", "AT", "CH"):
			h = K.steuer_hinweise(land)
			self.assertEqual(len(h["punkte"]), 3)
			self.assertIn("keine Steuerberatung", h["hinweis"])
		self.assertIn("§ 29 GewStG", " ".join(K.steuer_hinweise("DE")["punkte"]))
		self.assertIn("KESt", " ".join(K.steuer_hinweise("AT")["punkte"]))
		self.assertIn("Verrechnungssteuer", " ".join(K.steuer_hinweise("CH")["punkte"]))

	def test_wiederverkauf(self):
		wv = K.wiederverkauf_pruefen({**POS, "anteilProzent": 49}, {"zeitpunkt": "2026-12", "grund": "Portfolio-Umschichtung 2027", "anteilProzent": 49}, HEUTE)
		self.assertEqual((wv["struktur"], wv["anteilProzent"], wv["vorherStatus"]), ("share", 49, "betrieb"))
		for falsch in ({"zeitpunkt": "2026-01"}, {"grund": "kurz"}, {"anteilProzent": 60}, {"preisvorstellung": "abc"}):
			with self.assertRaises(K.PortfolioFehler):
				K.wiederverkauf_pruefen({**POS, "anteilProzent": 49}, {"zeitpunkt": "2026-12", "grund": "Portfolio-Umschichtung 2027", **falsch}, HEUTE)
		with self.assertRaises(K.PortfolioFehler) as e:
			K.wiederverkauf_pruefen({**POS, "status": "uebernahme"}, {}, HEUTE)
		self.assertEqual(e.exception.status, 409)
		b = K.boerse_entwurf(POS, {**wv, "preisvorstellung": 6000000})
		self.assertEqual((b["phase"], b["netzanschluss"], b["preisModus"], b["preis"]), ("cod", "vorhanden", "gesamt", 6000000))
		self.assertNotIn("(Demo)", b["titel"])
		self.assertIn("49 %", b["titel"])


@unittest.skipUnless(shutil.which("node"), "Node nicht vorhanden – Gleichlauf JS ↔ Python übersprungen")
class TestGleichlaufJs(unittest.TestCase):
	def test_js_gleich(self):
		wurzel = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".."))
		kern = os.path.join(wurzel, "src", "lib", "plattform", "portfolio", "kern.js")
		if not os.path.isfile(kern):
			self.skipTest("Website-Quelltext nicht vorhanden")
		fall = {"pos": POS, "ertraege": ertraege(POS, 0.97, n=10), "codev": TestKapital.CODEV}
		skript = (
			"const K = await import(process.argv[1]); const f = JSON.parse(process.argv[2]);"
			"const e = K.ertragAuswertung(f.pos, f.ertraege, { bis: '2026-08' }); const c = K.covenantAuswertung(f.pos, f.ertraege, { bis: '2026-08' });"
			"const k = K.cashflowKennzahlen(f.codev, { abrufe: [{ betrag: 300000, status: 'bezahlt' }], ausschuettungen: [] }, { heute: '2026-09-30' });"
			"console.log(JSON.stringify({ s: e.summe12, a: e.ampel, d: c.dscr, g: c.ampel, grund: c.grund, k: k.zusage, p: K.periodenAuswahl({ kaufdatum: '2025-03-15' }, '2026-09-30') }));"
		)
		url = "file:///" + kern.replace("\\", "/").lstrip("/")
		r = subprocess.run(["node", "--input-type=module", "-e", skript, url, json.dumps(fall)], capture_output=True, text=True, encoding="utf-8", timeout=60)
		self.assertEqual(r.returncode, 0, r.stderr)
		js = json.loads(r.stdout.strip().splitlines()[-1])
		e = K.ertrag_auswertung(POS, fall["ertraege"], "2026-08")
		c = K.covenant_auswertung(POS, fall["ertraege"], "2026-08")
		k = K.cashflow_kennzahlen(TestKapital.CODEV, [{"betrag": 300000, "status": "bezahlt"}], [], HEUTE)
		self.assertEqual(js["s"], e["summe12"])
		self.assertEqual((js["a"], js["d"], js["g"], js["grund"]), (e["ampel"], c["dscr"], c["ampel"], c["grund"]))
		self.assertEqual(js["k"], {**k["zusage"], "zusage": k["zusage"]["zusage"]})
		self.assertEqual(js["p"], K.perioden_auswahl({"kaufdatum": "2025-03-15"}, HEUTE))


if __name__ == "__main__":
	unittest.main()
