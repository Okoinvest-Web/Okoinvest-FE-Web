# Copyright (c) 2026, ÖkoInvest GmbH
# Betriebsführung – reine Regeln (ohne Frappe lauffähig):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_betrieb_kern
# SLA, Ertragsausfall, Zustandsautomaten (Auftrag, Versicherung), Wartungsvorlagen DE/AT/CH, Prüfbewertung, Lager,
# Fristen, Kennzahlen, Plausibilisierung/Freigabe (wie src/lib/plattform/betrieb/kern.js, Node-Tests in plattform-test-anlagen.mjs).

import unittest
from datetime import datetime, timezone

from oekoinvest_app.plattform import betrieb_kern as K

HEUTE = "2026-09-30"


class TestSla(unittest.TestCase):
	def test_sla_je_schwere(self):
		jetzt = datetime(2026, 9, 30, 12, 0, tzinfo=timezone.utc)
		s = K.sla_status({"schwere": "kritisch", "erkanntAm": "2026-09-30T09:00:00Z"}, jetzt)
		self.assertEqual(s["ampel"], "rot")  # 3 h > 2 h Reaktion
		self.assertTrue(s["reaktion"]["verletzt"])
		s = K.sla_status({"schwere": "kritisch", "erkanntAm": "2026-09-30T09:00:00Z", "quittiertAm": "2026-09-30T10:00:00Z"}, jetzt)
		self.assertTrue(s["reaktion"]["erfuellt"])
		self.assertEqual(s["ampel"], "gruen")
		s = K.sla_status({"schwere": "mittel", "erkanntAm": "2026-09-29T18:00:00Z"}, jetzt)
		self.assertEqual(s["ampel"], "gelb")  # 18 h von 24 h = 75 %
		self.assertIsNone(K.sla_status({"schwere": "info", "erkanntAm": "2026-09-30T11:00:00Z"}, jetzt)["loesung"])

	def test_behebung_pflicht(self):
		with self.assertRaises(K.BetriebFehler) as e:
			K.behebung_pruefen("", "Tausch")
		self.assertEqual(e.exception.status, 422)
		with self.assertRaises(K.BetriebFehler):
			K.behebung_pruefen("wechselrichter", "ok")
		self.assertTrue(K.behebung_pruefen("wechselrichter", "Lüfter getauscht"))


class TestErtragsausfall(unittest.TestCase):
	def test_jahressumme_und_nacht(self):
		von = datetime(2025, 1, 1, tzinfo=timezone.utc)
		bis = datetime(2026, 1, 1, tzinfo=timezone.utc)
		self.assertAlmostEqual(K.erwartete_energie_kwh(100000, von, bis), 100000, delta=500)
		self.assertEqual(K.erwartete_energie_kwh(100000, datetime(2025, 6, 15, 21, tzinfo=timezone.utc), datetime(2025, 6, 16, 2, tzinfo=timezone.utc)), 0)

	def test_bewertung_und_grenzen(self):
		jetzt = datetime(2026, 9, 30, tzinfo=timezone.utc)
		e = K.ertragsausfall(100000, "2026-06-10T08:00:00Z", "2026-06-12T08:00:00Z", 50, 12, None, jetzt=jetzt)
		self.assertEqual(e["stunden"], 48)
		self.assertAlmostEqual(e["ausfallKwh"], e["sollKwh"] / 2, delta=0.2)
		self.assertAlmostEqual(e["erloesCtKwh"], 0.7 * 12 + 0.3 * K.MARKTWERT_SOLAR_CT, places=3)
		self.assertEqual(K.ertragsausfall(100000, "2026-06-10T08:00:00Z", "2026-06-10T10:00:00Z", 100, None, None, jetzt=jetzt)["erloesCtKwh"], K.MARKTWERT_SOLAR_CT)
		for von, bis in (("2026-06-12T08:00:00Z", "2026-06-10T08:00:00Z"), ("2026-01-01T00:00:00Z", "2027-06-01T00:00:00Z"), ("2026-10-01T00:00:00Z", "2026-10-05T00:00:00Z")):
			with self.assertRaises(K.BetriebFehler):
				K.ertragsausfall(100000, von, bis, 100, jetzt=jetzt)


class TestAutomaten(unittest.TestCase):
	def test_auftrag(self):
		a = {"status": "angelegt", "dienstleister": "Service GmbH (Test)"}
		self.assertEqual(K.auftrag_uebergang(a, "beauftragt", {}, HEUTE)["status"], "beauftragt")
		with self.assertRaises(K.BetriebFehler) as e:
			K.auftrag_uebergang(a, "erledigt", {"bericht": "Alles erledigt, Lüfter getauscht."}, HEUTE)
		self.assertEqual(e.exception.status, 409)
		b = {"status": "beauftragt"}
		with self.assertRaises(K.BetriebFehler):
			K.auftrag_uebergang(b, "terminiert", {}, HEUTE)
		self.assertEqual(K.auftrag_uebergang(b, "terminiert", {"termin": "2026-10-02T08:00"}, HEUTE)["termin"], "2026-10-02T08:00")
		with self.assertRaises(K.BetriebFehler):
			K.auftrag_uebergang(b, "erledigt", {"bericht": "kurz"}, HEUTE)
		with self.assertRaises(K.BetriebFehler):
			K.auftrag_uebergang(b, "storniert", {}, HEUTE)
		self.assertEqual(K.AUFTRAG_UEBERGAENGE["erledigt"], [])

	def test_versicherung(self):
		f = {"status": "entwurf", "versicherer": "Versicherung AG (Test)", "schadentag": "2026-09-20", "schadenEur": 1800, "schadenbeschreibung": "Hagelschaden an zwei Modulen", "meldefristBis": K.meldefrist_bis("2026-09-20")}
		self.assertEqual(f["meldefristBis"], "2026-09-27")
		p = K.versicherung_uebergang(f, "gemeldet", {"gemeldetAm": "2026-09-30"}, HEUTE)
		self.assertTrue(p["verspaetet"])
		with self.assertRaises(K.BetriebFehler):
			K.versicherung_uebergang({**f, "schadenbeschreibung": "kurz"}, "gemeldet", {}, HEUTE)
		with self.assertRaises(K.BetriebFehler) as e:
			K.versicherung_uebergang(f, "reguliert", {"erstattetEur": 100}, HEUTE)
		self.assertEqual(e.exception.status, 409)
		self.assertEqual(K.versicherung_uebergang({**f, "status": "gemeldet"}, "reguliert", {"erstattetEur": 1300}, HEUTE)["erstattetEur"], 1300)


class TestWartungUndPruefung(unittest.TestCase):
	def test_vorlagen_je_land(self):
		de = K.plan_vorschlag({"land": "DE", "typ": "dach"})
		self.assertIn("DGUV Vorschrift 3", next(p for p in de if p["art"] == "pruefung")["norm"])
		self.assertEqual(next(p for p in de if p["art"] == "pruefung")["intervallMonate"], 48)
		self.assertIn("ESV 2012", next(p for p in K.plan_vorschlag({"land": "AT"}) if p["art"] == "pruefung")["norm"])
		self.assertIn("NIV", next(p for p in K.plan_vorschlag({"land": "CH"}) if p["art"] == "pruefung")["norm"])
		sp = K.plan_vorschlag({"land": "AT", "typ": "speicher", "speicherKwh": 500})
		self.assertFalse(any(p["art"] in ("thermografie", "reinigung") for p in sp))
		self.assertTrue(any("Speicher" in p["bezeichnung"] for p in sp))
		self.assertFalse(any("Speicher" in p["bezeichnung"] for p in de))
		self.assertEqual(len(K.plan_vorschlag({"land": "DE"}, de)), 0)

	def test_faelligkeit(self):
		self.assertEqual(K.plus_monate("2026-01-31", 1), "2026-02-28")
		self.assertEqual(K.naechste_faelligkeit("2026-09-30", 48), "2030-09-30")
		self.assertEqual(K.plan_stand({"aktiv": True, "naechsteFaelligkeit": "2026-10-15", "vorlaufTage": 30}, HEUTE)["stufe"], "faellig")
		self.assertEqual(K.plan_stand({"aktiv": True, "naechsteFaelligkeit": "2026-09-01"}, HEUTE)["stufe"], "ueberfaellig")
		self.assertEqual(K.plan_stand({"aktiv": False}, HEUTE)["stufe"], "inaktiv")

	def test_pruefbewertung(self):
		ok = K.pruefung_bewerten([{"bezeichnung": "S1", "uocV": 700, "iscA": 10, "rIsoMOhm": 50}, {"bezeichnung": "S2", "uocV": 702, "iscA": 10.1, "rIsoMOhm": 40}], {"rcd": True})
		self.assertEqual(ok["ergebnis"], "bestanden")
		self.assertEqual(K.pruefung_bewerten([{"bezeichnung": "S1", "uocV": 700, "rIsoMOhm": 0.8}])["ergebnis"], "nicht_bestanden")
		self.assertEqual(K.pruefung_bewerten([{"bezeichnung": "S1", "uocV": 100, "rIsoMOhm": 0.8}])["ergebnis"], "bestanden")  # ≤ 120 V: 0,5 MΩ
		self.assertEqual(K.pruefung_bewerten(thermografie=[{"ort": "Modul 3", "deltaK": 25}])["ergebnis"], "maengel")
		self.assertEqual(K.pruefung_bewerten(thermografie=[{"ort": "Modul 3", "deltaK": 5}])["ergebnis"], "bestanden")
		self.assertEqual(K.pruefung_bewerten(punkte={"schutzleiter": False})["ergebnis"], "nicht_bestanden")
		self.assertEqual(K.pruefung_bewerten([{"bezeichnung": "S1", "uocV": 700, "uocSollV": 760}])["ergebnis"], "maengel")


class TestLagerFristenKennzahlen(unittest.TestCase):
	def test_lager(self):
		self.assertEqual(K.bestand_nach(5, "entnahme", 2), 3)
		self.assertEqual(K.bestand_nach(5, "korrektur", 0), 0)
		with self.assertRaises(K.BetriebFehler) as e:
			K.bestand_nach(1, "entnahme", 2)
		self.assertEqual(e.exception.status, 409)
		with self.assertRaises(K.BetriebFehler):
			K.bestand_nach(1, "zugang", 0)
		self.assertEqual(K.nachbestellung({"bestand": 1, "mindestbestand": 2})["menge"], 3)
		self.assertIsNone(K.nachbestellung({"bestand": 5, "mindestbestand": 2}))

	def test_fristen(self):
		f = K.fristen_ermitteln(
			{"id": "AL-26-TEST01"},
			[{"id": "AK-1", "hersteller": "X", "modell": "WR", "garantieBis": "2026-11-15"}, {"id": "AK-2", "garantieBis": "2030-01-01"}],
			[{"id": "MP-1", "zaehlernummer": "1A", "abrechnungsrelevant": True, "eichgueltigBis": "2026-09-01"}, {"id": "MP-2", "zaehlernummer": "1B", "abrechnungsrelevant": True, "eichgueltigBis": ""}],
			[{"id": "WP-1", "aktiv": True, "bezeichnung": "Inspektion", "naechsteFaelligkeit": "2026-10-10", "vorlaufTage": 30}],
			[{"id": "VF-1", "status": "entwurf", "versicherer": "V", "meldefristBis": "2026-10-03"}],
			HEUTE,
		)
		arten = [x["art"] for x in f]
		self.assertEqual(f[0]["stufe"], "ueberfaellig")
		self.assertIn("garantie", arten)
		self.assertEqual(sum(1 for x in f if x["art"] == "garantie"), 1)
		self.assertTrue(any(x["stufe"] == "fehlt" for x in f))
		self.assertIn("versicherung", arten)

	def test_kennzahlen(self):
		k = K.kennzahlen(100, 10000, 12000, 120, 600)
		self.assertAlmostEqual(k["pr"], 10000 / (100 * 120))
		self.assertAlmostEqual(k["verfuegbarkeit"], 0.95)
		self.assertIsNone(K.kennzahlen(100, 10000, 12000)["pr"])


class TestPlausibilisierung(unittest.TestCase):
	def test_befunde(self):
		self.assertEqual(K.plausibilisieren("2026-08", 10000, 10200, 11000, "2031-12-31", True)["stufe"], "ok")
		self.assertEqual(K.plausibilisieren("2026-08", 10000, 8500, None, "2031-12-31")["stufe"], "warnung")
		self.assertEqual(K.plausibilisieren("2026-08", 10000, 7000, None, "2031-12-31")["stufe"], "fehler")
		e = K.plausibilisieren("2026-08", 10000, 10000, None, "2026-08-15")
		self.assertTrue(e["eichFehler"])
		with self.assertRaises(K.BetriebFehler) as x:
			K.freigabe_pruefen(e, "Begründung ausreichend lang")
		self.assertEqual(x.exception.status, 409)
		f = K.plausibilisieren("2026-08", 10000, 7000, None, "2031-12-31")
		with self.assertRaises(K.BetriebFehler):
			K.freigabe_pruefen(f, "kurz")
		self.assertTrue(K.freigabe_pruefen(f, "Wandlerfaktor korrigiert, Ablesung vor Ort bestätigt"))


if __name__ == "__main__":
	unittest.main()
