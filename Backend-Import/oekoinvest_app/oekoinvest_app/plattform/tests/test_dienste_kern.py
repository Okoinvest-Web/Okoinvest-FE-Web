# Copyright (c) 2026, ÖkoInvest GmbH
#
# Dienste (Identität, Register, Bonität, SPV-Gründung) – reine Regeln ohne Datenbank. Läuft mit Frappe-Stub auch ohne Bench:
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_dienste_kern -v
# Gleiche Fälle wie scripts/plattform-test-dienste.mjs und die JS-Regeln unter src/lib/plattform/dienste/**.

import sys
import types
import unittest
from datetime import date, datetime, timedelta, timezone

try:  # Bench vorhanden → echtes Frappe; sonst minimaler Stub (dienste_kern importiert Frappe nur in Frappe-Funktionen)
	import frappe  # noqa: F401
except ImportError:  # pragma: no cover
	sys.modules["frappe"] = types.ModuleType("frappe")

from oekoinvest_app.plattform import dienste_kern as dk

TD3 = ["P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<", "L898902C36UTO7408122F1204159ZE184226B<<<<<10"]
TD1 = ["I<UTOD231458907<<<<<<<<<<<<<<<", "7408122F1204159UTO<<<<<<<<<<<6", "ERIKSSON<<ANNA<MARIA<<<<<<<<<<"]


class TestMrz(unittest.TestCase):
	def test_icao_beispiel_td3(self):
		r = dk.mrz_pruefen("\n".join(TD3))
		self.assertTrue(r["ok"], r["fehler"])
		self.assertEqual(r["format"], "TD3")
		self.assertEqual(r["felder"]["dokumentnummer"], "L898902C3")
		self.assertEqual(r["felder"]["geburtsdatum"], "1974-08-12")
		self.assertEqual(r["felder"]["gueltigBis"], "2012-04-15")
		self.assertEqual(r["felder"]["nachname"], "ERIKSSON")
		self.assertEqual(len(r["pruefungen"]), 5)

	def test_icao_beispiel_td1(self):
		r = dk.mrz_pruefen(TD1)
		self.assertTrue(r["ok"], r["fehler"])
		self.assertEqual(r["format"], "TD1")
		self.assertEqual(r["felder"]["dokumentnummer"], "D23145890")

	def test_einzelne_pruefziffern(self):
		self.assertEqual(dk.pruefziffer("L898902C3"), 6)
		self.assertEqual(dk.pruefziffer("740812"), 2)
		self.assertEqual(dk.pruefziffer("120415"), 9)
		self.assertTrue(dk.pruefziffer_ok("<<<<<<<<<<<<<<", "<"))

	def test_manipulation_erkannt(self):
		kaputt = [TD3[0], TD3[1].replace("L898902C36", "L898902C37")]
		r = dk.mrz_pruefen(kaputt)
		self.assertFalse(r["ok"])
		self.assertTrue(any("Dokumentnummer" in f for f in r["fehler"]))

	def test_vorpruefung_abgelaufen_und_abgleich(self):
		r = dk.mrz_vorpruefung(TD3, {"vorname": "Anna", "nachname": "Eriksson", "geburtsdatum": "1974-08-12"}, heute=date(2026, 9, 30))
		self.assertEqual(r["ergebnis"], "auffaellig")  # 2012 abgelaufen
		self.assertTrue(r["abgleich"]["name"])
		self.assertTrue(r["abgleich"]["geburtsdatum"])
		r2 = dk.mrz_vorpruefung(TD3, {"vorname": "Anna", "nachname": "Eriksson", "geburtsdatum": "1974-08-12"}, heute=date(2011, 1, 1))
		self.assertEqual(r2["ergebnis"], "plausibel")
		r3 = dk.mrz_vorpruefung(TD3, {"vorname": "Max", "nachname": "Muster"}, heute=date(2011, 1, 1))
		self.assertEqual(r3["ergebnis"], "auffaellig")
		self.assertFalse(r3["abgleich"]["name"])

	def test_umlaute_transliteration(self):
		self.assertEqual(dk.mrz_name("Müller-Lüdenscheidt"), "MUELLER LUEDENSCHEIDT")
		self.assertEqual(dk.mrz_name("Groß"), "GROSS")


class TestWebhook(unittest.TestCase):
	def test_signatur_richtig_falsch(self):
		roh = '{"verification":{"id":"x","status":"approved","vendorData":"IP-26-ABCDEF"}}'
		kopf = dk.webhook_signieren("veriff", roh, "geheimnis-1234567890")
		self.assertEqual(dk.webhook_signatur_pruefen("veriff", lambda h: kopf.get(h), roh, "geheimnis-1234567890"), (True, ""))
		self.assertFalse(dk.webhook_signatur_pruefen("veriff", lambda h: kopf.get(h), roh + " ", "geheimnis-1234567890")[0])
		self.assertFalse(dk.webhook_signatur_pruefen("veriff", lambda h: None, roh, "geheimnis-1234567890")[0])
		self.assertFalse(dk.webhook_signatur_pruefen("veriff", lambda h: kopf.get(h), roh, "anderes-geheimnis-123")[0])

	def test_demo_zeitfenster(self):
		roh = '{"sitzungId":"IP-26-ABCDEF","ergebnis":"bestanden"}'
		alt = int((datetime.now(timezone.utc) - timedelta(minutes=10)).timestamp())
		kopf = dk.webhook_signieren("demo", roh, "g" * 20, zeit=alt)
		self.assertEqual(dk.webhook_signatur_pruefen("demo", lambda h: kopf.get(h), roh, "g" * 20), (False, "zeit"))
		kopf = dk.webhook_signieren("demo", roh, "g" * 20)
		self.assertTrue(dk.webhook_signatur_pruefen("demo", lambda h: kopf.get(h), roh, "g" * 20)[0])

	def test_sumsub_sha1_abgelehnt(self):
		roh = "{}"
		kopf = {"x-payload-digest": "abc", "x-payload-digest-alg": "HMAC_SHA1_HEX"}
		self.assertEqual(dk.webhook_signatur_pruefen("sumsub", lambda h: kopf.get(h), roh, "g" * 20), (False, "algorithmus"))

	def test_normalisieren(self):
		self.assertEqual(dk.webhook_normalisieren("veriff", {"verification": {"id": "v1", "status": "declined", "vendorData": "IP-26-ABCDEF"}})["ergebnis"], "abgelehnt")
		self.assertEqual(dk.webhook_normalisieren("sumsub", {"type": "applicantReviewed", "externalUserId": "IP-26-X", "reviewResult": {"reviewAnswer": "GREEN"}})["ergebnis"], "bestanden")
		self.assertIsNone(dk.webhook_normalisieren("sumsub", {"type": "applicantCreated"}))
		self.assertEqual(dk.webhook_normalisieren("idnow", {"identificationprocess": {"result": "SUCCESS_DATA_CHANGED", "transactionnumber": "IP-26-X"}})["ergebnis"], "pruefen")


class TestRegister(unittest.TestCase):
	def test_registernummern(self):
		self.assertEqual(dk.registernummer_pruefen("AT", "fn541505G"), (True, "FN 541505g", ""))
		self.assertEqual(dk.registernummer_pruefen("CH", "CHE123456789")[1], "CHE-123.456.789")
		self.assertTrue(dk.registernummer_pruefen("DE", "HRB 12345")[0])
		self.assertFalse(dk.registernummer_pruefen("DE", "12345")[0])

	def test_firmenname(self):
		treffer = [{"name": "Solarpark Innviertel Nord GmbH (Demo)", "nummer": "FN 1a", "status": "aktiv"}]
		self.assertEqual(dk.firmenname_pruefen("Solarpark Innviertel Nord GmbH", "at_gmbh", treffer)["ergebnis"], "belegt")
		self.assertEqual(dk.firmenname_pruefen("Sonnenacker Zwei GmbH", "at_gmbh", treffer)["ergebnis"], "frei")
		self.assertEqual(dk.firmenname_pruefen("Sonnenacker Zwei", "at_gmbh", [])["ergebnis"], "unzulaessig")
		self.assertEqual(dk.firmenname_pruefen("Solarpark Nord GmbH & Co. KG", "de_gmbh_co_kg", [])["ergebnis"], "frei")
		# Rechtsformwörter nur als ganze Wörter entfernen („Energie“, „Tag“ bleiben)
		self.assertEqual(dk.firma_normalisieren("Energie Tag AG"), "energie tag")


class TestBonitaet(unittest.TestCase):
	def test_ampel(self):
		self.assertEqual(dk.bonitaet_ampel("creditreform", 180), "gruen")
		self.assertEqual(dk.bonitaet_ampel("ksv1870", 450), "rot")
		self.assertEqual(dk.bonitaet_ampel("dnb", 30), "gelb")
		self.assertEqual(dk.bonitaet_ampel("demo", None), "unbekannt")

	def test_pflicht_und_gueltigkeit(self):
		e = {"geltung": "firmen"}
		self.assertTrue(dk.bonitaet_pflicht_aktiv("loi", "U-26-A", True, e))
		self.assertFalse(dk.bonitaet_pflicht_aktiv("loi", "U-26-A", False, e))
		self.assertFalse(dk.bonitaet_pflicht_aktiv("loi", "U-26-A", True, {"geltung": "pilot"}))
		self.assertTrue(dk.bonitaet_pflicht_aktiv("loi", "U-26-A", True, {"geltung": "pilot", "pilotKonten": ["U-26-A"]}))
		jetzt = datetime.now(timezone.utc)
		self.assertEqual(dk.bonitaet_gueltig(None), (False, "fehlt"))
		self.assertEqual(dk.bonitaet_gueltig({"status": "abgeschlossen", "auskunftAm": jetzt.isoformat(), "ampel": "gruen"}), (True, ""))
		self.assertEqual(dk.bonitaet_gueltig({"status": "abgeschlossen", "auskunftAm": (jetzt - timedelta(days=200)).isoformat(), "ampel": "gruen"}), (False, "veraltet"))
		self.assertEqual(dk.bonitaet_gueltig({"status": "abgeschlossen", "auskunftAm": jetzt.isoformat(), "ampel": "rot"}), (False, "rot"))
		self.assertEqual(dk.bonitaet_gueltig({"status": "abgeschlossen", "auskunftAm": jetzt.isoformat(), "ampel": "rot", "freigabe": True}), (True, ""))

	def test_demo_deterministisch(self):
		self.assertEqual(dk.demo_auskunft("Demo Capital GmbH", "DE"), dk.demo_auskunft("Demo Capital GmbH", "DE"))
		self.assertEqual(dk.bonitaet_ampel("demo", dk.demo_auskunft("Insolvente Sonnen GmbH", "DE")["score"]), "rot")

	def test_information_ohne_ergebnis(self):
		t = dk.bonitaet_information("KSV1870", "Muster GmbH", "berechtigtes_interesse")
		self.assertIn("Art. 6 Abs. 1 lit. f", t)
		self.assertNotIn("Score", t)


class TestGruendung(unittest.TestCase):
	def test_mindestkapital(self):
		self.assertEqual(dk.RECHTSFORMEN["at_gmbh"]["kapital"], 10000)
		self.assertEqual(dk.RECHTSFORMEN["de_gmbh"]["einzahlung"], 12500)
		self.assertEqual(dk.RECHTSFORMEN["ch_gmbh"]["einzahlung"], 20000)
		g = {"rechtsform": "at_gmbh", "name": "Test PV GmbH", "sitz": "Linz", "stammkapital": 9000, "einzahlung": 4000, "gesellschafter": [{"name": "A", "anteil": 100}], "geschaeftsfuehrung": [{"name": "B"}]}
		f = dk.gruendung_pruefen(g)
		self.assertTrue(any("mindestens 10.000" in x for x in f))
		g.update(stammkapital=10000, einzahlung=5000)
		self.assertEqual(dk.gruendung_pruefen(g), [])

	def test_ch_wohnsitz_und_kg(self):
		g = {"rechtsform": "ch_gmbh", "name": "Alp GmbH", "sitz": "Chur", "stammkapital": 20000, "einzahlung": 20000, "gesellschafter": [{"name": "A", "anteil": 100}], "geschaeftsfuehrung": [{"name": "B", "wohnsitzLand": "AT"}]}
		self.assertTrue(any("Schweiz" in x for x in dk.gruendung_pruefen(g)))
		kg = {"rechtsform": "de_gmbh_co_kg", "name": "SP GmbH & Co. KG", "sitz": "Türkheim", "stammkapital": 0, "einzahlung": 0, "gesellschafter": [{"name": "A", "anteil": 100}], "geschaeftsfuehrung": [{"name": "B"}]}
		self.assertTrue(any("Komplementär" in x for x in dk.gruendung_pruefen(kg)))

	def test_checkliste_und_status(self):
		s = dk.schritte_fuer("at_gmbh")
		self.assertIn("WiEReG", next(x for x in s if x["schluessel"] == "transparenz")["label"])
		self.assertNotIn("komplementaer", [x["schluessel"] for x in s])
		self.assertIn("komplementaer", [x["schluessel"] for x in dk.schritte_fuer("de_gmbh_co_kg")])
		self.assertEqual(dk.status_aus_schritten("entwurf", s), "entwurf")
		for x in s:
			if x["schluessel"] in ("notartermin", "beurkundet"):
				x["status"] = "erledigt"
		self.assertEqual(dk.status_aus_schritten("entwurf", s), "in_gruendung")
		for x in s:
			if x["pflicht"]:
				x["status"] = "erledigt"
				x["datum"] = "2026-06-01"
		self.assertEqual(dk.status_aus_schritten("in_gruendung", s), "aktiv")

	def test_fristen(self):
		s = dk.schritte_fuer("at_gmbh")
		for x in s:
			if x["schluessel"] == "eingetragen":
				x.update(status="erledigt", datum="2026-09-01")
		f = dk.fristen_fuer("AT", "eingetragen", s, "12-31", date(2026, 9, 30), gegruendet="2026-08-20")
		wiereg = next(x for x in f if x.get("schritt") == "transparenz")
		self.assertEqual(wiereg["faellig"], "2026-09-29")  # 4 Wochen nach Eintragung
		abschluss = next(x for x in f if x["art"] == "abschluss")
		self.assertEqual(abschluss["faellig"], "2027-09-30")  # 9 Monate nach 31.12.2026
		self.assertTrue(any(x["art"] == "wiereg" for x in f))
		de = dk.fristen_fuer("DE", "aktiv", [], "12-31", date(2026, 9, 30))
		self.assertEqual(next(x for x in de if x["art"] == "abschluss")["faellig"], "2026-12-31")  # 12 Monate nach 31.12.2025

	def test_musterprotokoll(self):
		self.assertTrue(dk.musterprotokoll_moeglich({"rechtsform": "de_gmbh", "gesellschafter": [1, 2, 3], "geschaeftsfuehrung": [1]}))
		self.assertFalse(dk.musterprotokoll_moeglich({"rechtsform": "de_gmbh", "gesellschafter": [1, 2, 3, 4], "geschaeftsfuehrung": [1]}))
		self.assertFalse(dk.musterprotokoll_moeglich({"rechtsform": "at_gmbh", "gesellschafter": [1], "geschaeftsfuehrung": [1]}))


if __name__ == "__main__":
	unittest.main()
