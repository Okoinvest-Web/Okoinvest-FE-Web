# Copyright (c) 2026, ÖkoInvest GmbH
#
# KYC – Eigene Identifizierung: reine Regeln (ohne Datenbank). Läuft auch ohne Bench (Frappe-Stub):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_mrz_kern -v
# Gleiche Fälle wie scripts/plattform-test-kyc.mjs (Teil „Logik“) und kycIdent.js: offizielle ICAO-9303-Specimen
# („ERIKSSON ANNA MARIA“, Utopia) und deutsche Musterdaten („MUSTERMANN ERIKA“).

import sys
import types
import unittest
from datetime import date

try:
	import frappe  # noqa: F401
except ImportError:  # pragma: no cover
	sys.modules["frappe"] = types.ModuleType("frappe")

from oekoinvest_app.plattform import kyc_ident_kern as ik
from oekoinvest_app.plattform import kyc_kern as k

B = ik.MRZ_BEISPIELE
H2010 = date(2010, 1, 1)  # Stichtag, an dem die Specimen gültig sind
ANNA = {"vorname": "Anna Maria", "nachname": "Eriksson", "geburtsdatum": "1974-08-12", "staatsangehoerigkeit": "SE"}
ERIKA = {"vorname": "Erika", "nachname": "Mustermann", "geburtsdatum": "1964-08-12", "staatsangehoerigkeit": "DE", "ausweis": {"art": "personalausweis", "nummer": "T22000129", "gueltigBis": "2020-10-31"}}


def ids(befund, ampel=None):
	return {b["id"] for b in befund["befunde"] if ampel is None or b["ampel"] == ampel}


def eigene_mrz(nummer="C4J6R0H11", geb="900101", ablauf="350101", nachname="MEIER", vorname="MARIA", staat="DEU"):
	"""Gültige TD3-MRZ mit berechneten Prüfziffern (für „alles grün“)."""
	nr = nummer.ljust(9, "<")
	z1 = f"P<{staat}{nachname}<<{vorname}".ljust(44, "<")
	teil = f"{nr}{ik.mrz_pruefziffer(nr)}{staat}{geb}{ik.mrz_pruefziffer(geb)}F{ablauf}{ik.mrz_pruefziffer(ablauf)}" + "<" * 14 + "0"
	return [z1, teil + str(ik.mrz_pruefziffer(teil[0:10] + teil[13:20] + teil[21:43]))]


class TestPruefziffer(unittest.TestCase):
	def test_7_3_1(self):
		self.assertEqual(ik.mrz_pruefziffer("L898902C3"), 6)
		self.assertEqual(ik.mrz_pruefziffer("740812"), 2)
		self.assertEqual(ik.mrz_pruefziffer("120415"), 9)
		self.assertEqual(ik.mrz_pruefziffer("D23145890"), 7)
		self.assertEqual(ik.mrz_pruefziffer("T22000129"), 3)
		self.assertIsNone(ik.mrz_pruefziffer("ab"))
		self.assertTrue(ik.mrz_pruefziffer_ok("<<<<<<<<<<<<<<", "<"))


class TestFormate(unittest.TestCase):
	def test_icao_td3(self):
		z = ik.mrz_zerlegen(B["icaoTd3"], H2010)
		self.assertEqual(z["format"], "TD3")
		self.assertTrue(all(p["ok"] for p in z["pruefziffern"]))
		self.assertEqual({p["feld"] for p in z["pruefziffern"]}, {"dokumentnummer", "geburtsdatum", "ablauf", "optional", "gesamt"})
		f = z["felder"]
		self.assertEqual((f["nachname"], f["vornamen"], f["dokumentnummer"], f["geburtsdatum"], f["gueltigBis"], f["dokumentart"]), ("ERIKSSON", "ANNA MARIA", "L898902C3", "1974-08-12", "2012-04-15", "reisepass"))

	def test_icao_td1_und_td2(self):
		for key, fmt in (("icaoTd1", "TD1"), ("icaoTd2", "TD2")):
			z = ik.mrz_zerlegen(B[key], H2010)
			self.assertEqual(z["format"], fmt)
			self.assertTrue(all(p["ok"] for p in z["pruefziffern"]), key)
			self.assertEqual(z["felder"]["dokumentnummer"], "D23145890")

	def test_deutsche_musterdaten(self):
		z = ik.mrz_zerlegen(B["deTd1"], H2010)
		self.assertEqual(z["format"], "TD1")
		self.assertTrue(all(p["ok"] for p in z["pruefziffern"]))
		self.assertEqual((z["felder"]["ausstellerstaat"], z["felder"]["staatsangehoerigkeit"], z["felder"]["geschlecht"]), ("D", "D", "X"))
		self.assertEqual(ik.mrz_staat("D"), "DE")

	def test_einzeilig_und_unbekannt(self):
		self.assertEqual(ik.mrz_zeilen("".join(B["icaoTd1"])), B["icaoTd1"])
		self.assertEqual(ik.mrz_zeilen(" p<uto eriksson «anna\n"), ["P<UTOERIKSSON<ANNA"])
		b = ik.mrz_befund(["ABC", "DEF"], {}, H2010)
		self.assertEqual((b["format"], b["ampel"]), (None, "rot"))
		self.assertIn("format", ids(b))


class TestBefund(unittest.TestCase):
	def test_specimen_gelb_mit_abgleich(self):
		b = ik.mrz_befund(B["icaoTd3"], {**ANNA, "ausweis": {"art": "reisepass", "nummer": "L898902C3"}}, H2010)
		self.assertEqual(b["ampel"], "gelb")
		self.assertEqual(ids(b, "gelb"), {"muster", "staatsangehoerigkeit"})  # UTO ist kein ISO-Staat
		self.assertTrue({"name_nachname", "name_vorname", "geburtsdatum", "dokumentnummer", "dokumentart"} <= ids(b, "gruen"))
		self.assertEqual(b["felder"]["dokumentnummerMaskiert"], "••••••2C3")

	def test_mustermann_umlaut_tolerant(self):
		b = ik.mrz_befund(B["deTd1"], ERIKA, H2010)
		self.assertEqual(ids(b, "rot"), set())
		self.assertEqual(ids(b, "gelb"), {"muster"})
		# Transliteration: MÜLLER ↔ MUELLER, Straße-ß ↔ SS; Rufname genügt
		z = eigene_mrz(nachname="MUELLER", vorname="JOERG<PETER")
		b = ik.mrz_befund(z, {"vorname": "Jörg", "nachname": "Müller", "geburtsdatum": "1990-01-01", "staatsangehoerigkeit": "DE", "ausweis": {"art": "reisepass", "nummer": "C4J6R0H11"}}, date(2026, 9, 30))
		self.assertEqual(b["ampel"], "gruen", b["befunde"])
		z = eigene_mrz(nachname="GROSS", vorname="ANNA")
		self.assertIn("name_nachname", ids(ik.mrz_befund(z, {"nachname": "Groß", "vorname": "Anna"}, date(2026, 9, 30)), "gruen"))

	def test_pruefziffer_falsch_rot(self):
		z = list(B["icaoTd3"])
		z[1] = z[1][:9] + "7" + z[1][10:]  # Prüfziffer Dokumentnummer 6 → 7
		b = ik.mrz_befund(z, ANNA, H2010)
		self.assertEqual(b["ampel"], "rot")
		self.assertIn("pz_dokumentnummer", ids(b, "rot"))
		self.assertIn("pz_gesamt", ids(b, "rot"))

	def test_abgelaufen_minderjaehrig_abweichungen(self):
		self.assertIn("abgelaufen", ids(ik.mrz_befund(B["icaoTd3"], ANNA, date(2026, 9, 30)), "rot"))
		jung = eigene_mrz(geb="150101")
		self.assertIn("minderjaehrig", ids(ik.mrz_befund(jung, {}, date(2026, 9, 30)), "rot"))
		z = eigene_mrz()
		b = ik.mrz_befund(z, {"vorname": "Mario", "nachname": "Meyer", "geburtsdatum": "1990-01-02", "staatsangehoerigkeit": "AT", "ausweis": {"art": "personalausweis", "nummer": "X1", "gueltigBis": "2034-01-01"}}, date(2026, 9, 30))
		self.assertEqual(ids(b, "rot"), {"name_nachname", "geburtsdatum", "dokumentnummer"})
		self.assertEqual(ids(b, "gelb"), {"name_vorname", "staatsangehoerigkeit", "dokumentart", "gueltig_bis"})

	def test_laeuft_bald_ab_und_unvollstaendig(self):
		z = eigene_mrz(ablauf="261015")
		b = ik.mrz_befund(z, {}, date(2026, 9, 30))
		self.assertIn("laeuft_ab", ids(b, "gelb"))
		self.assertIn("abgleich_unvollstaendig", ids(b, "gelb"))


class TestMethoden(unittest.TestCase):
	def test_empfehlung_und_zulaessigkeit(self):
		ohne_eid = [{**x, "verfuegbar": False} if x["id"] == "eid" else x for x in ik.KYC_METHODEN]
		m = {x["id"]: x for x in ik.methoden_bewerten(ohne_eid, None, "mittel")}
		self.assertFalse(m["eid"]["zulaessig"])  # eID nicht verfügbar → nächster Weg empfohlen
		self.assertTrue(m["video_intern"]["empfohlen"])
		m = {x["id"]: x for x in ik.methoden_bewerten(None, None, "hoch")}
		self.assertFalse(m["extern"]["zulaessig"])
		eid = [{**x, "verfuegbar": True} if x["id"] == "eid" else x for x in ik.KYC_METHODEN]
		self.assertTrue(next(x for x in ik.methoden_bewerten(eid, None, "niedrig") if x["id"] == "eid")["empfohlen"])
		r = {**ik.methoden_standard(), "investorTypen": {"fonds": ["extern"]}}
		m = {x["id"]: x for x in ik.methoden_bewerten(None, r, "mittel", "fonds")}
		self.assertEqual((m["video_intern"]["zulaessig"], m["extern"]["zulaessig"], m["extern"]["empfohlen"]), (False, True, True))


class TestVideo(unittest.TestCase):
	def test_abschluss(self):
		p = {"punkte": {pid: {"ok": True} for pid in ik.VIDEO_PUNKT_IDS if pid != "tan"}, "tan": {"bestaetigt": True}}
		self.assertTrue(ik.video_abschluss_pruefen(p, "bestanden", "Alle Merkmale geprüft, Person eindeutig.")["ok"])
		self.assertFalse(ik.video_abschluss_pruefen({**p, "tan": {"bestaetigt": False}}, "bestanden", "Alle Merkmale geprüft.")["ok"])
		ohne = {"punkte": {**p["punkte"], "hologramm": {"ok": False}}, "tan": {"bestaetigt": True}}
		self.assertIn("Hologramm", " ".join(ik.video_abschluss_pruefen(ohne, "bestanden", "Begründung lang genug")["fehler"]))
		self.assertFalse(ik.video_abschluss_pruefen({}, "abgebrochen", "Verbindung abgerissen")["ok"])  # Abbruchgrund fehlt
		self.assertTrue(ik.video_abschluss_pruefen({}, "abgebrochen", "Verbindung abgerissen", "technik")["ok"])
		self.assertFalse(ik.video_abschluss_pruefen({}, "verdacht", "kurz")["ok"])

	def test_sicht_verdacht_bleibt(self):
		s = ik.video_sicht([{"id": "1", "beendetAm": "x", "ergebnis": "verdacht"}, {"id": "2", "beendetAm": "y", "ergebnis": "bestanden"}], None)
		self.assertEqual((s["status"], s["ergebnis"]), ("verdacht", "verdacht"))
		self.assertEqual(ik.video_fuer_nutzer(s)["status"], "abgeschlossen")  # kein Tipping-off
		self.assertEqual(ik.video_sicht([], {"id": "T"})["status"], "gebucht")
		self.assertEqual(ik.video_sicht([{"id": "1", "beendetAm": "x", "ergebnis": "abgebrochen"}], None)["status"], "abgebrochen")


class TestKycIntegration(unittest.TestCase):
	def test_risiko_und_anforderungen(self):
		basis = {"kontotyp": "privat", "person": {"adresse": {"land": "DE"}, "staatsangehoerigkeit": "DE"}}
		self.assertEqual(k.risiko({**basis, "mrz": {"ampel": "rot"}})["stufe"], "hoch")
		self.assertEqual(k.risiko({**basis, "mrz": {"ampel": "gelb"}})["punkte"], 1)
		self.assertEqual(k.risiko({**basis, "video": {"ergebnis": "verdacht"}})["stufe"], "hoch")
		a = {x["id"]: x for x in k.anforderungen({**basis, "methode": "video_intern", "mrz": {"ampel": "gruen"}, "video": {"status": "gebucht"}})}
		self.assertTrue(a["mrz"]["erfuellt"] and a["video"]["erfuellt"] and a["mrz"]["pflicht"])
		a = {x["id"]: x for x in k.anforderungen({**basis, "methode": "video_intern", "video": {"status": "abgebrochen"}})}
		self.assertFalse(a["mrz"]["erfuellt"] or a["video"]["erfuellt"])

	def test_ident_gruende(self):
		basis = {"kontotyp": "privat", "person": {"adresse": {"land": "DE"}}}
		self.assertEqual(k.ident_gruende(basis), [])  # ohne Weg und ohne Pflicht: bisheriges Verfahren
		self.assertTrue(k.ident_gruende(basis, {"identifizierungPflicht": True}))
		self.assertIn("noch nicht bestanden", " ".join(k.ident_gruende({**basis, "methode": "video_intern", "video": {"ergebnis": None}})))
		self.assertEqual(k.ident_gruende({**basis, "methode": "video_intern", "video": {"ergebnis": "bestanden"}}), [])
		self.assertIn("Verdacht", " ".join(k.ident_gruende({**basis, "methode": "video_intern", "video": {"ergebnis": "verdacht"}})))
		hoch = {**basis, "methode": "extern", "risiko": {"stufe": "hoch"}}
		self.assertIn("nicht zugelassen", " ".join(k.ident_gruende(hoch)))
		ok = {**basis, "methode": "extern", "pruefergebnisse": [{"quelle": "veriff", "art": "video_ident", "ergebnis": "ok"}]}
		self.assertEqual(k.ident_gruende(ok, {"identifizierungPflicht": True}), [])
		demo = {**basis, "methode": "extern", "pruefergebnisse": [{"quelle": "veriff", "art": "video_ident", "ergebnis": "ok", "daten": {"demo": True}}]}
		self.assertTrue(k.ident_gruende(demo, {"identifizierungPflicht": True}))  # Demo-Nachweis zählt im Echtbetrieb nicht
		eid_ok = {"quelle": "eID ID Austria", "art": "eid", "ergebnis": "ok", "daten": {"vertrauensniveau": "hoch"}}
		self.assertFalse(k.ident_nachweis({"pruefergebnisse": [eid_ok]}, "eid"))  # „ok“ allein genügt nicht
		self.assertTrue(k.ident_nachweis({"pruefergebnisse": [{**eid_ok, "daten": {"identitaetBestaetigt": True}}]}, "eid"))


if __name__ == "__main__":
	unittest.main()
