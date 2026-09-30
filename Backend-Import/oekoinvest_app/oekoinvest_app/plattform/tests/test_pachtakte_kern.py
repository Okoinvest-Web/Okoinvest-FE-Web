# Copyright (c) 2026, ÖkoInvest GmbH
# Pachtakte (Team 1) – reine Regeln ohne Frappe (pachtakte_kern.py = src/lib/plattform/pachtakte.js):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_pachtakte_kern
# Anliegen (Positivliste, Anteile, Zustandsautomat), Fristen, Rückbau/Sicherheit, Agri-PV (DIN SPEC 91434), Jahresbescheinigung.

import unittest

from oekoinvest_app.plattform import pachtakte_kern as K

HEUTE = "2026-09-30"


class TestAnliegen(unittest.TestCase):
	def test_tabellen_vollstaendig(self):
		self.assertEqual(sorted(K.ANLIEGEN_ARTEN), ["eigentuemerwechsel", "erbfall", "kuendigung", "verlaengerung", "zahlungsaufteilung"])
		for a in K.ANLIEGEN_ARTEN.values():
			for land in ("DE", "AT", "CH"):
				self.assertTrue(a["hinweise"][land], (a["kurz"], land))
				self.assertIn(land, a["unterlagen"])
		for u in K.ANLIEGEN_UEBERGAENGE:
			self.assertIn(u["nach"], K.ANLIEGEN_STATUS)
			self.assertIn(u["wer"], ("admin", "eigentuemer"))

	def test_kuendigung(self):
		d = K.anliegen_bereinigen("kuendigung", {"grund": "ordentlich", "zumDatum": "2027-12-31", "fremd": "x"}, heute=HEUTE)
		self.assertEqual(d["zumDatum"], "2027-12-31")
		self.assertNotIn("fremd", d)
		with self.assertRaises(K.PachtakteFehler) as e:
			K.anliegen_bereinigen("kuendigung", {"grund": "ordentlich", "zumDatum": "2020-01-01"}, heute=HEUTE)
		self.assertEqual(e.exception.status, 422)
		with self.assertRaises(K.PachtakteFehler):
			K.anliegen_bereinigen("kuendigung", {"grund": "ausserordentlich", "zumDatum": "2027-01-01", "begruendung": "zu kurz"}, heute=HEUTE)

	def test_erbfall_und_anteile(self):
		d = K.anliegen_bereinigen("erbfall", {"verstorben": "A", "todestag": "2026-05-01", "nachweis": "einantwortung", "erben": [{"name": "X", "anteilProzent": "50"}, {"name": "Y", "anteilProzent": "50,0"}], "vertreter": "X"}, heute=HEUTE, land="AT")
		self.assertEqual([p["anteilProzent"] for p in d["erben"]], [50, 50])
		with self.assertRaises(K.PachtakteFehler):  # AT-Nachweis gilt nicht für DE
			K.anliegen_bereinigen("erbfall", {"verstorben": "A", "todestag": "2026-05-01", "nachweis": "einantwortung", "erben": [{"name": "X"}]}, heute=HEUTE, land="DE")
		with self.assertRaises(K.PachtakteFehler):  # mehrere Erben ohne Vertretung
			K.anliegen_bereinigen("erbfall", {"verstorben": "A", "todestag": "2026-05-01", "nachweis": "erbschein", "erben": [{"name": "X"}, {"name": "Y"}]}, heute=HEUTE)
		with self.assertRaises(K.PachtakteFehler):  # Todesdatum in der Zukunft
			K.anliegen_bereinigen("erbfall", {"verstorben": "A", "todestag": "2027-01-01", "nachweis": "erbschein", "erben": [{"name": "X"}]}, heute=HEUTE)

	def test_zahlungsaufteilung_summe(self):
		ok = K.anliegen_bereinigen("zahlungsaufteilung", {"grundlage": "miteigentum", "empfaenger": [{"name": "a", "anteilProzent": 33.3333}, {"name": "b", "anteilProzent": 66.6667}]})
		self.assertEqual(len(ok["empfaenger"]), 2)
		for falsch in ([{"name": "a", "anteilProzent": 60}, {"name": "b", "anteilProzent": 30}], [{"name": "a", "anteilProzent": 100}], [{"name": "a", "anteilProzent": 50}, {"name": "b"}]):
			with self.assertRaises(K.PachtakteFehler):
				K.anliegen_bereinigen("zahlungsaufteilung", {"grundlage": "miteigentum", "empfaenger": falsch})
		with self.assertRaises(K.PachtakteFehler):
			K.anliegen_bereinigen("zahlungsaufteilung", {"grundlage": "miteigentum", "empfaenger": [{"name": "a", "anteilProzent": 50, "email": "kaputt"}, {"name": "b", "anteilProzent": 50}]})

	def test_erlaubt_und_automat(self):
		with self.assertRaises(K.PachtakteFehler) as e:
			K.anliegen_erlaubt("kuendigung", {"status": "gekuendigt"})
		self.assertEqual(e.exception.status, 409)
		with self.assertRaises(K.PachtakteFehler):
			K.anliegen_erlaubt("erbfall", {"status": "aktiv"}, [{"art": "erbfall", "status": "rueckfrage"}])
		self.assertTrue(K.anliegen_erlaubt("erbfall", {"status": "aktiv"}, [{"art": "erbfall", "status": "erledigt"}]))
		a = {"status": "eingereicht", "art": "kuendigung", "daten": {"zumDatum": "2027-12-31"}}
		with self.assertRaises(K.PachtakteFehler):  # Eigentümer darf nicht erledigen
			K.anliegen_uebergang(a, "erledigt", "eigentuemer", {"kommentar": "ok"})
		with self.assertRaises(K.PachtakteFehler):  # Rückfrage ohne Text
			K.anliegen_uebergang(a, "rueckfrage", "admin", {})
		self.assertEqual(K.anliegen_uebergang(a, "in_pruefung", "admin")["nach"], "in_pruefung")
		a["status"] = "in_pruefung"
		u = K.anliegen_uebergang(a, "erledigt", "admin", {"kommentar": "Kündigung bestätigt"})
		self.assertEqual(u["ergebnis"]["wirksamZum"], "2027-12-31")
		w = K.anliegen_uebergang({"status": "in_pruefung", "art": "eigentuemerwechsel", "daten": {"stichtag": "2026-11-01"}}, "erledigt", "admin", {"kommentar": "Grundbuch geprüft", "neuesKontoId": "U-26-ABCDEF"})
		self.assertEqual((w["ergebnis"]["neuesKontoId"], w["ergebnis"]["ab"]), ("U-26-ABCDEF", "2026-11-01"))
		self.assertEqual([x["nach"] for x in K.anliegen_aktionen("rueckfrage", "eigentuemer")], ["eingereicht", "zurueckgezogen"])


class TestFristenRueckbau(unittest.TestCase):
	def test_fristen(self):
		f = K.vertrags_fristen({"vertragsdatum": "2026-01-01", "beginn": "", "laufzeitJahre": 25, "ende": "", "status": "aktiv"}, {"vorlaufJahre": 3, "nichtbau": "rueckgabe"}, HEUTE)
		self.assertEqual([(x["id"], x["datum"]) for x in f], [("baubeginn", "2029-01-01")])
		ende = K.laufzeit_ende("2023-07-01", 30)
		self.assertEqual(ende, "2053-06-30")
		f = K.vertrags_fristen({"vertragsdatum": "2022-04-01", "beginn": "2023-07-01", "laufzeitJahre": 30, "ende": ende, "status": "aktiv"}, {"verlaengerungJahre": 10}, HEUTE)
		self.assertEqual([x["id"] for x in f], ["vorbereitung", "ende"])
		self.assertEqual(f[0]["datum"], "2051-06-30")
		self.assertIn("10 Jahre", f[1]["text"])
		self.assertEqual(K.laufzeit_ende("2024-02-29", 1), "2025-02-28")

	def test_rueckbau_und_sicherheit(self):
		akte = K.akte_start({"rueckbau": "buergschaft", "rueckbauEuro": 450000, "rueckbauAb": "baubeginn"})
		self.assertEqual(akte["sicherheit"]["status"], "vorgesehen")
		self.assertEqual(K.akte_start(None)["sicherheit"]["status"], "keine")
		vertrag = {"status": "aktiv", "ende": "2053-06-30", "beginn": "2023-07-01"}
		self.assertTrue(K.sicherheit_hinweise(akte, vertrag)[0]["ton"] == "warn")
		with self.assertRaises(K.PachtakteFehler) as e:  # zu früh
			K.rueckbau_uebergang(akte, "angekuendigt", "admin", {"termin": "2027-01-01"}, vertrag, HEUTE)
		self.assertEqual(e.exception.status, 409)
		vertrag["status"] = "gekuendigt"
		with self.assertRaises(K.PachtakteFehler):  # Termin fehlt
			K.rueckbau_uebergang(akte, "angekuendigt", "admin", {}, vertrag, HEUTE)
		for nach, wer, ein in (("angekuendigt", "admin", {"termin": "2027-01-01"}), ("laufend", "admin", {}), ("abnahme_bereit", "admin", {"termin": "2027-03-01"}), ("maengel", "eigentuemer", {"kommentar": "Fundamente im Nordteil"}), ("laufend", "admin", {}), ("abnahme_bereit", "admin", {"termin": "2027-04-01"})):
			akte["rueckbau"]["status"] = K.rueckbau_uebergang(akte, nach, wer, ein, vertrag, HEUTE)["nach"]
		with self.assertRaises(K.PachtakteFehler):  # Sicherheit erst nach Abnahme freigeben
			K.sicherheit_uebergang({**akte, "sicherheit": {"status": "hinterlegt"}}, "freigegeben", {"kommentar": "Urkunde zurück"})
		with self.assertRaises(K.PachtakteFehler):
			K.beenden_pruefen(akte)
		akte["rueckbau"]["status"] = K.rueckbau_uebergang(akte, "abgenommen", "eigentuemer", {}, vertrag, HEUTE)["nach"]
		h = K.sicherheit_uebergang(akte, "hinterlegt", {"art": "buergschaft", "betrag": "450.000", "geber": "Bank", "hinterlegtAm": "2023-03-01"})
		self.assertEqual(h["betrag"], 450000)
		akte["sicherheit"]["status"] = "hinterlegt"
		with self.assertRaises(K.PachtakteFehler):
			K.beenden_pruefen(akte)
		akte["sicherheit"]["status"] = K.sicherheit_uebergang(akte, "freigegeben", {"kommentar": "Urkunde zurückgegeben"})["nach"]
		self.assertTrue(K.beenden_pruefen(akte))


class TestAgri(unittest.TestCase):
	def test_bereinigen(self):
		d = K.agri_nachweis_bereinigen({"jahr": "2026", "art": "betrieb", "kultur": "getreide", "gesamtHa": "10", "bewirtschaftetHa": "9,2", "ertrag": "50", "einheit": "dt"}, HEUTE)
		self.assertEqual((d["jahr"], d["bewirtschaftetHa"]), (2026, 9.2))
		for falsch in ({"jahr": 2027}, {"bewirtschaftetHa": "11"}, {"kultur": "tabak"}, {"bewirtschafter": "paechter"}):
			with self.assertRaises(K.PachtakteFehler):
				K.agri_nachweis_bereinigen({"jahr": 2026, "art": "betrieb", "kultur": "getreide", "gesamtHa": 10, "bewirtschaftetHa": 9, "ertrag": 50, "einheit": "dt", **falsch}, HEUTE)

	def test_pruefen(self):
		d = K.agri_nachweis_bereinigen({"jahr": 2026, "art": "betrieb", "kultur": "getreide", "gesamtHa": 10, "bewirtschaftetHa": 8.8, "ertrag": 50, "einheit": "dt", "gap": "nein"}, HEUTE)
		r = K.agri_nachweis_pruefen(d, kategorie="1", referenz={"wert": 70, "einheit": "dt", "quelle": "x"}, land="DE")
		self.assertEqual(r["quote"], 0.7143)
		self.assertEqual(r["flaechenverlust"], 0.12)
		self.assertFalse(r["erfuellt"])  # Flächenverlust 12 % > 10 % (Kat. I)
		self.assertEqual({p["id"]: p["stufe"] for p in r["punkte"]}, {"quote": "ok", "verlust": "risiko", "gap": "hinweis"})
		self.assertTrue(K.agri_nachweis_pruefen(d, kategorie="2", referenz={"wert": 70, "einheit": "dt", "quote": "x", "quelle": "x"})["erfuellt"])
		self.assertFalse(K.agri_nachweis_pruefen({**d, "ertrag": 40}, kategorie="2", referenz={"wert": 70, "einheit": "dt", "quelle": "x"})["erfuellt"])
		self.assertIsNone(K.agri_nachweis_pruefen(d, kategorie="2", referenz={"wert": 7, "einheit": "ttm", "quelle": "x"})["quote"])

	def test_referenz(self):
		liste = [{"status": "bestaetigt", "daten": {"art": "referenz", "jahr": 2024, "ertrag": 70, "einheit": "dt"}}, {"status": "eingereicht", "daten": {"art": "referenz", "jahr": 2025, "ertrag": 74, "einheit": "dt"}}, {"status": "entwurf", "daten": {"art": "referenz", "jahr": 2023, "ertrag": 10, "einheit": "dt"}}]
		r = K.agri_referenz(liste, None, "dt")
		self.assertEqual((r["wert"], r["einheit"]), (72, "dt"))
		self.assertIn("2024, 2025", r["quelle"])
		self.assertEqual(K.agri_referenz([], {"referenzertrag": 65, "referenzEinheit": "dt"}, "dt")["wert"], 65)
		self.assertIsNone(K.agri_referenz([], {"referenzertrag": 65, "referenzEinheit": "dt"}, "ttm"))
		self.assertEqual(K.agri_uebergang({"status": "eingereicht"}, "bestaetigt", "admin")["nach"], "bestaetigt")
		with self.assertRaises(K.PachtakteFehler):
			K.agri_uebergang({"status": "bestaetigt"}, "eingereicht", "eigentuemer")


class TestJahresbescheinigung(unittest.TestCase):
	def test_summen(self):
		belege = [
			{"art": "pacht", "status": "bezahlt", "zeitraum": {"von": "2025-01-01", "bis": "2025-06-30"}, "netto": 1000, "steuerBetrag": 190, "brutto": 1190, "bezug": {"pachtvertragId": "PT-1"}, "nummer": "PG-1"},
			{"art": "pacht", "status": "offen", "zeitraum": {"von": "2025-07-01", "bis": "2025-12-31"}, "netto": 1000, "steuerBetrag": 190, "brutto": 1190, "bezug": {"pachtvertragId": "PT-1"}, "nummer": "PG-2"},
			{"art": "pacht", "status": "storniert", "zeitraum": {"von": "2025-07-01"}, "netto": 999, "brutto": 999, "bezug": {"pachtvertragId": "PT-1"}},
			{"art": "pacht", "status": "bezahlt", "zeitraum": {"von": "2024-01-01"}, "netto": 5, "brutto": 5, "bezug": {"pachtvertragId": "PT-1"}},
			{"art": "contracting", "status": "bezahlt", "zeitraum": {"von": "2025-01-01"}, "netto": 5, "brutto": 5},
		]
		b = K.jahresbescheinigung(belege, [{"id": "PT-1", "bezeichnung": "Acker", "land": "DE"}], 2025)
		self.assertEqual(b["summe"], {"netto": 2000, "steuer": 380, "brutto": 2380, "bezahlt": 1190, "offen": 1190})
		self.assertEqual(b["laender"], ["DE"])
		self.assertTrue(any("§ 4 Nr. 12 UStG" in h for h in b["steuerhinweise"][0]["hinweise"]))
		self.assertEqual(K.bescheinigungs_jahre(belege), [2025, 2024])


if __name__ == "__main__":
	unittest.main()
