# Copyright (c) 2026, ÖkoInvest GmbH
#
# Akquise Ausbaustufe 2 – reine Logik ohne Frappe (akquise_kampagne_kern.py):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_akquise_kampagne_kern
# Gleiche Regeln wie src/lib/plattform/akquise-kampagne.js (siehe scripts/plattform-test-akquise2.mjs, Abschnitt 10).

import unittest

from oekoinvest_app.plattform import akquise_kampagne_kern as kk

KAMPAGNE = {"status": "aktiv", "nachfass": [{"id": "s1", "art": "zweiter_brief", "nachTagen": 28, "aktiv": True}, {"id": "s2", "art": "anruf_einwilligung", "nachTagen": 42, "aktiv": True}]}
BRIEF = {"nr": 1, "am": "2026-08-01T08:00:00.000Z"}


class Nachfassen(unittest.TestCase):
	def e(self, **x):
		return {"briefe": [BRIEF], "status": "angeschrieben", "aufrufe": 2, **x}

	def test_frist(self):
		self.assertEqual(kk.nachfass_faellig(KAMPAGNE, self.e(), "2026-08-20T08:00:00"), [])
		f = kk.nachfass_faellig(KAMPAGNE, self.e(), "2026-09-20T08:00:00")
		self.assertEqual([x["ergebnis"] for x in f], ["aufgabe", "uebersprungen"])
		self.assertIn("Einwilligung", f[1]["grund"])

	def test_anruf_nur_mit_einwilligung(self):
		f = kk.nachfass_faellig(KAMPAGNE, self.e(einwilligungTelefon={"am": "2026-08-03"}), "2026-09-20T08:00:00")
		self.assertEqual(f[1]["ergebnis"], "aufgabe")

	def test_reaktion_und_sperre_beenden(self):
		for x in ({"anfragen": [{}]}, {"termine": [{}]}, {"widerspruchAm": "2026-08-02"}, {"gesperrt": True}, {"status": "abgelehnt"}):
			self.assertEqual(kk.nachfass_faellig(KAMPAGNE, self.e(**x), "2026-09-20T08:00:00"), [], x)

	def test_hoechstens_zwei_briefe_und_einmalig(self):
		f = kk.nachfass_faellig(KAMPAGNE, self.e(briefe=[BRIEF, {"nr": 2, "am": "2026-09-01"}]), "2026-09-20T08:00:00")
		self.assertEqual(f[0]["ergebnis"], "uebersprungen")
		erledigt = {"s1": {"ergebnis": "aufgabe"}, "s2": {"ergebnis": "uebersprungen"}}
		self.assertEqual(kk.nachfass_faellig(KAMPAGNE, self.e(nachfass=erledigt), "2026-10-20T08:00:00"), [])

	def test_nur_aktive_kampagnen(self):
		self.assertEqual(kk.nachfass_faellig({**KAMPAGNE, "status": "entwurf"}, self.e(), "2026-09-20T08:00:00"), [])

	def test_standard_und_bereinigen(self):
		self.assertFalse(kk.nachfass_standard("AT")[0]["aktiv"], "Österreich: einmalige Zusendung (DSB)")
		self.assertTrue(kk.nachfass_standard("DE")[0]["aktiv"])
		r = kk.nachfass_bereinigen([{"art": "zweiter_brief", "nachTagen": 2}, {"art": "spam"}, {"art": "anruf_einwilligung", "nachTagen": 999, "aktiv": False}])
		self.assertEqual([(x["art"], x["nachTagen"], x["aktiv"]) for x in r], [("zweiter_brief", 7, True), ("anruf_einwilligung", 180, False)])


class CodesUndSperre(unittest.TestCase):
	def test_code(self):
		c = kk.code_erzeugen()
		self.assertEqual(len(c), 10)
		self.assertEqual(kk.code_normalisieren(kk.code_lesbar(c).lower()), c)
		self.assertEqual(kk.code_normalisieren("ABCDE-0OI11"), "")  # 0/O/I/1 kommen nicht vor
		self.assertNotEqual(kk.code_erzeugen(), kk.code_erzeugen())

	def test_person_schluessel_robust(self):
		a = kk.person_schluessel({"vorname": "Hans", "nachname": "Müller", "plz": "86807", "strasse": "Bahnhofstraße 3"})
		b = kk.person_schluessel({"vorname": "hans", "nachname": "Mueller", "plz": "86807 ", "strasse": "Bahnhofstr. 3a"})
		self.assertEqual(a, b)
		self.assertNotEqual(a, kk.person_schluessel({"vorname": "Hans", "nachname": "Müller", "plz": "86808"}))
		self.assertEqual(kk.person_schluessel({"firma": "Hofgut GbR", "plz": "1"}), kk.person_schluessel({"firma": "HOFGUT GbR", "plz": "1"}))

	def test_maskiert(self):
		self.assertEqual(kk.person_maskiert({"vorname": "Hans", "nachname": "Widerspruch", "plz": "86807"}), "H. W***, 86807")
		self.assertNotIn("Widerspruch", kk.person_maskiert({"vorname": "Hans", "nachname": "Widerspruch"}))


class KostenUndKennzahlen(unittest.TestCase):
	def test_grundbuch_und_pacht(self):
		self.assertEqual(kk.grundbuch_schaetzung("DE", 4)["betrag"], 40)
		self.assertEqual(kk.grundbuch_schaetzung("CH", 2)["waehrung"], "CHF")
		p = kk.pachtspanne(10, "gruen")
		self.assertEqual((p["proHaMin"], p["proHaMax"], p["jahrMin"], p["jahrMax"]), (2800, 4500, 28000, 45000))
		self.assertEqual(kk.pachtspanne(10, "gelb")["proHaMax"], 2800)

	def test_kennzahlen(self):
		ziele = [
			{"ha": 10, "mwp": 9, "status": "gesichert", "gesichertHa": 8, "grundbuch": {"kostenIst": 16, "schaetzung": {"betrag": 30}}, "parzellen": [1, 2, 3],
				"empfaenger": [{"briefe": [BRIEF], "aufrufe": 2, "anfragen": [{}], "termine": [{}]}]},
			{"ha": 5, "mwp": 4, "status": "angeschrieben", "grundbuch": {"schaetzung": {"betrag": 20}}, "parzellen": [1],
				"empfaenger": [{"briefe": [BRIEF], "aufrufe": 0, "widerspruchAm": "x", "gesperrt": True}, {"briefe": []}]},
		]
		k = kk.kampagnen_kennzahlen({"land": "DE", "kosten": {"porto": None, "druck": "", "sonstige": 0}}, ziele)
		self.assertEqual((k["ziele"], k["briefe"], k["aufrufe"], k["anfragen"], k["termine"], k["widersprueche"], k["gesichertHa"]), (2, 2, 2, 1, 1, 1, 8))
		self.assertEqual(k["kosten"]["versand"], 2.6)  # Standard DE 0,95 + 0,35 je Brief
		self.assertEqual(k["kosten"]["summe"], 18.6)
		self.assertEqual(k["kostenJeHa"], 2)
		self.assertEqual(k["ruecklaufQuote"], 100.0)
		self.assertIsNone(kk.kampagnen_kennzahlen({"land": "DE"}, [])["kostenJeHa"])


class Serienbrief(unittest.TestCase):
	FIRMA = {"name": "ÖkoInvest GmbH", "strasse": "Gewerbegebiet 10", "ort": "5121 Ostermiething", "land": "Österreich", "fn": "FN 541505g", "gericht": "Landesgericht Ried im Innkreis"}
	ZIEL = {"id": "AQZ-26-TEST01", "land": "DE", "gemeinde": "Türkheim", "bundesland": "Bayern", "ha": 12.4, "mwp": 11.3, "ampel": "gruen",
		"parzellen": [{"id": "p1", "kg": "DEMO-Gemarkung Türkheim", "kgNr": "9901", "gstNr": "123/4"}, {"id": "p2", "kg": "DEMO-Gemarkung Türkheim", "kgNr": "9901", "gstNr": "124"}]}
	EMPF = {"anrede": "Frau", "vorname": "Erika", "nachname": "Muster", "strasse": "Mühlweg 7", "plz": "86842", "ort": "Türkheim", "code": "ABCDE23456", "flurstuecke": []}

	def test_brief_de(self):
		b = kk.brief({"id": "AQ-26-X", "name": "Test", "land": "DE"}, self.ZIEL, self.EMPF, "https://www.oekoinvest.com", self.FIRMA)
		self.assertTrue(b["text"].startswith("Sehr geehrte Frau Muster,"))
		self.assertIn("Gemarkung Türkheim, Flst. 123/4, 124", b["text"])
		self.assertIn("2.800 und 4.500 € je Hektar", b["text"])
		self.assertEqual(b["link"], "https://www.oekoinvest.com/angebot/ABCDE23456")
		self.assertEqual(b["code"], "ABCDE-23456")
		self.assertTrue(any("§ 12 GBO" in z and "§ 43a GBV" in z for z in b["datenschutz"]))
		self.assertTrue(any("Art. 6 Abs. 1 lit. f DSGVO" in z for z in b["datenschutz"]))
		self.assertIn("Art. 21 Abs. 2 DSGVO", b["widerspruch"])
		self.assertNotIn("Flst", " ".join(b["anschrift"]))  # Fensterkuvert: keine Grundstücksangaben

	def test_brief_at_ch(self):
		at = kk.brief({"id": "A", "name": "T", "land": "AT"}, {**self.ZIEL, "land": "AT"}, self.EMPF, "https://x", self.FIRMA)
		self.assertIn("nicht erneut an", at["keinInteresse"])
		self.assertTrue(any("Verrechnungsstelle" in z for z in at["datenschutz"]))
		ch = kk.brief({"id": "A", "name": "T", "land": "CH"}, {**self.ZIEL, "land": "CH"}, self.EMPF, "https://x", self.FIRMA)
		self.assertTrue(any("Art. 970 Abs. 2 ZGB" in z for z in ch["datenschutz"]))
		self.assertTrue(any("EDÖB" in z for z in ch["datenschutz"]))

	def test_vorlage_platzhalter(self):
		b = kk.brief({"id": "A", "name": "Herbst", "land": "DE"}, self.ZIEL, self.EMPF, "https://x", self.FIRMA, vorlage={"betreff": "Fläche {{flaeche.gemeinde}}", "text": "{{briefanrede}} – {{kampagne.name}} {{unbekannt.feld}} {{angebot.code}}"})
		self.assertEqual(b["betreff"], "Fläche Türkheim")
		self.assertEqual(b["text"], "Sehr geehrte Frau Muster – Herbst  ABCDE-23456")


class GemeindeRanking(unittest.TestCase):
	def kandidat(self, gemeinde, ha, score, land="DE", kulisse=None, kap="unbekannt"):
		return {"id": f"K-{gemeinde}-{ha}", "land": land, "bundesland": "Bayern", "bezirk": "Unterallgäu", "gemeinde": gemeinde, "ha": ha, "mwp": ha / 1.1, "score": score, "ampel": "gruen" if score >= 65 else "gelb",
			"merkmale": {"kulisse": kulisse or {}}, "netz": {"knoten": {"id": f"uw-{gemeinde}", "name": "UW", "art": "uw110", "kapazitaet": kap}}}

	def test_potenzial_und_ranking(self):
		ks = [self.kandidat("Türkheim", 20, 90, kulisse={"randstreifenAnteil": 1}), self.kandidat("Türkheim", 15, 80), self.kandidat("Buchloe", 6, 50), self.kandidat("Buchloe", 3, 30)]
		m = kk.potenzial_je_gemeinde(ks, {"uw-Türkheim": {"kapazitaet": "frei", "freiMw": 20}})
		t = m[kk.gemeinde_schluessel("DE", "Bayern", "Türkheim")]
		b = m[kk.gemeinde_schluessel("DE", "Bayern", "Buchloe")]
		self.assertEqual((t["kandidaten"], t["ha"], t["haGeeignet"]), (2, 35.0, 35.0))
		self.assertEqual(t["netz"]["status"], "frei")
		self.assertEqual(b["haGeeignet"], 6.0)
		rt = kk.gemeinde_ranking(t)
		rb = kk.gemeinde_ranking(b)
		self.assertGreater(rt["punkte"], rb["punkte"])
		self.assertEqual(sum(x["max"] for x in rt["teile"]), 100)
		mit = kk.gemeinde_ranking(t, {"bauleitplanung": "fnp", "kriterienkatalog": "ja"})
		konk = kk.gemeinde_ranking(t, {"konkurrenz": [{"status": "verfahren"}, {"status": "genehmigt"}]})
		self.assertGreater(mit["punkte"], rt["punkte"])
		self.assertLess(konk["punkte"], rt["punkte"])
		self.assertEqual(next(x for x in konk["teile"] if x["id"] == "konkurrenz")["punkte"], 0)

	def test_schluessel(self):
		self.assertEqual(kk.gemeinde_schluessel("DE", "Bayern", "Markt Türkheim"), "DE:bay:tuerkheim")
		self.assertEqual(kk.gemeinde_schluessel("AT", "Oberösterreich", "Braunau am Inn"), "AT:obe:braunau-am-inn")


if __name__ == "__main__":
	unittest.main()
