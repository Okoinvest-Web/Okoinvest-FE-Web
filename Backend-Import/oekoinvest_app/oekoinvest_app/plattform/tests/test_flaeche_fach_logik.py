# Copyright (c) 2026, ÖkoInvest GmbH
#
# Fachprüfung Flächen & Kommunen – reine Logik ohne Frappe (flaeche_fach.py):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_flaeche_fach_logik
# Läuft auch unter `bench run-tests` (unittest.TestCase).

import unittest

from oekoinvest_app.plattform import flaeche_fach as ff


class TestFlurstuecke(unittest.TestCase):
	def test_de_gueltig_und_normalisiert(self):
		liste, fehler = ff.flurstuecke_pruefen([{"gemarkung": "Testfeld", "flur": "3", "nummer": "211 / 3", "blatt": "1234", "m2": "50.000"}, {}], "DE")
		self.assertEqual(fehler, [])
		self.assertEqual(len(liste), 1)
		self.assertEqual(liste[0]["nummer"], "211/3")
		self.assertEqual(liste[0]["m2"], 50000)
		self.assertNotIn("egrid", liste[0])

	def test_de_fehler(self):
		for fs in ({"gemarkung": "A", "nummer": "21a/b"}, {"gemarkung": "A", "flur": "1234", "nummer": "1"}, {"gemarkung": "A", "flur": "1"}, {"nummer": "12"}, {"gemarkung": "A", "nummer": "1", "blatt": "12-A"}):
			_, fehler = ff.flurstuecke_pruefen([fs], "DE")
			self.assertTrue(fehler, fs)

	def test_at(self):
		liste, fehler = ff.flurstuecke_pruefen([{"gemarkung": "Testdorf", "gemarkungNr": "46123", "nummer": ".12", "blatt": "87", "flur": "9"}], "AT")
		self.assertEqual(fehler, [])
		self.assertNotIn("flur", liste[0])
		for fs in ({"gemarkungNr": "4612", "nummer": "1"}, {"gemarkung": "X", "nummer": "1"}, {"gemarkungNr": "46123", "nummer": "12,5"}, {"gemarkungNr": "46123", "nummer": "1", "blatt": "123456"}):
			self.assertTrue(ff.flurstuecke_pruefen([fs], "AT")[1], fs)

	def test_ch(self):
		liste, fehler = ff.flurstuecke_pruefen([{"gemarkung": "Bern", "nummer": "1234-1", "egrid": "ch 1234 5678 9012"}], "CH")
		self.assertEqual(fehler, [])
		self.assertEqual(liste[0]["egrid"], "CH123456789012")
		for fs in ({"gemarkung": "Bern", "nummer": "1", "egrid": "CH12"}, {"gemarkung": "Bern", "nummer": "12/34/56"}, {"egrid": "CH123456789012"}):
			self.assertTrue(ff.flurstuecke_pruefen([fs], "CH")[1], fs)

	def test_fehlermeldung_nennt_flurstueck(self):
		with self.assertRaises(ff.Fehler) as ctx:
			ff.flaeche_fach_daten({"flurstuecke": [{"gemarkung": "A", "nummer": "1"}, {"gemarkung": "A", "nummer": "x"}]}, {}, "DE")
		self.assertIn("Flurstück 2", str(ctx.exception))


class TestSummeUndPflicht(unittest.TestCase):
	def test_summenpruefung(self):
		fs = [{"m2": 50000}, {"m2": 50000}]
		self.assertEqual(ff.summen_pruefung(fs, 12)["stufe"], "fehler")
		self.assertEqual(ff.summen_pruefung(fs, 10.1)["stufe"], "ok")
		self.assertEqual(ff.summen_pruefung(fs, 10.5)["stufe"], "warnung")
		self.assertEqual(ff.summen_pruefung(fs, 4)["stufe"], "hinweis")
		self.assertEqual(ff.summen_pruefung([{"m2": 50000}, {"m2": None}], 12)["stufe"], "hinweis")
		self.assertIsNone(ff.summen_pruefung([], 12)["stufe"])

	def test_pflicht_je_nutzung(self):
		self.assertEqual(ff.fach_pflicht_fehlt({"nutzung": "acker", "eigentum": "eigentum", "ha": 5}), [])
		dach = ff.fach_pflicht_fehlt({"nutzung": "dach", "agri": True, "ha": 0.4})
		self.assertEqual(len(dach), 3)
		self.assertFalse(any("Kultur" in x for x in dach), "Agri-Pflicht gilt nicht für Dächer")
		self.assertIn("Geplante Kultur (Agri-PV)", ff.fach_pflicht_fehlt({"nutzung": "acker", "agri": True}))
		self.assertIn("Vertretung der Eigentümer", ff.fach_pflicht_fehlt({"eigentum": "erbengemeinschaft"}))
		self.assertEqual(ff.fach_pflicht_fehlt({"eigentum": "erbengemeinschaft", "fach": {"eigentum": {"vertretung": "vollmacht"}}}), [])
		self.assertTrue(ff.fach_pflicht_fehlt({"fach": {"bewirtschaftung": {"art": "verpachtet"}}}))
		self.assertEqual(ff.fach_pflicht_fehlt({"fach": {"bewirtschaftung": {"art": "verpachtet", "kuendigungMonate": 0}}}), [])
		self.assertIn("Größe passend zur Katasterfläche der Flurstücke", ff.fach_pflicht_fehlt({"ha": 12, "flurstuecke": [{"m2": 100000}]}))


class TestFachangaben(unittest.TestCase):
	def test_positivliste_und_zahlen(self):
		fach = ff.fach_bereinigen(
			{
				"agri": {"kategorie": "1", "kultur": "obst", "durchfahrtshoeheM": "2,8", "arbeitsbreiteM": "3,5", "referenzertrag": "250", "preis": 1},
				"dach": {"dachart": "trapez", "statikReserveKn": "0,3", "dachflaecheM2": "4.000", "asbest": "vielleicht"},
				"eigentum": {"belastungen": ["grundschuld", "erfunden"]},
				"boden": {"ackerzahl": "130", "ertragsmesszahl": "4.700"},
				"lage": {"gemeindeSchluessel": "09 778 123"},
				"boese": {"x": 1},
			},
			{},
			"DE",
		)
		self.assertEqual(fach["agri"]["durchfahrtshoeheM"], 2.8)
		self.assertNotIn("preis", fach["agri"])
		self.assertEqual(fach["dach"]["dachflaecheM2"], 4000)
		self.assertEqual(fach["dach"]["statikReserveKn"], 0.3)
		self.assertEqual(fach["dach"]["asbest"], "")
		self.assertEqual(fach["eigentum"]["belastungen"], ["grundschuld"])
		self.assertIsNone(fach["boden"]["ackerzahl"])
		self.assertEqual(fach["boden"]["ertragsmesszahl"], 4700)
		self.assertEqual(fach["lage"]["gemeindeSchluessel"], "09778123")
		self.assertNotIn("boese", fach)

	def test_gemeindeschluessel_je_land(self):
		with self.assertRaises(ff.Fehler):
			ff.gemeinde_schluessel("1234", "DE")
		self.assertEqual(ff.gemeinde_schluessel("41234", "AT"), "41234")
		with self.assertRaises(ff.Fehler):
			ff.gemeinde_schluessel("12345", "CH")

	def test_teilupdate_behaelt_bereiche(self):
		basis = {"boden": {"ackerzahl": 40}}
		neu = ff.fach_bereinigen({"schutz": {"wsg": "zone3"}}, basis, "DE")
		self.assertEqual(neu["boden"]["ackerzahl"], 40)
		self.assertEqual(neu["schutz"]["wsg"], "zone3")


class TestPachtangebot(unittest.TestCase):
	def test_pflicht_je_modell(self):
		with self.assertRaises(ff.Fehler):
			ff.pachtangebot_bereinigen({"modell": "umsatz", "laufzeitJahre": 30})
		with self.assertRaises(ff.Fehler):
			ff.pachtangebot_bereinigen({"modell": "kombi", "umsatzProzent": 6, "laufzeitJahre": 30})
		with self.assertRaises(ff.Fehler):
			ff.pachtangebot_bereinigen({"euroProHaJahr": 30, "laufzeitJahre": 30})

	def test_vollstaendig(self):
		pa = ff.pachtangebot_bereinigen({"euroProHaJahr": "2.600", "laufzeitJahre": 30, "indexierung": "vpi", "rueckbau": "irgendwas", "rangruecktritt": "true", "boese": 1, "am": "1999-01-01", "gueltigBis": "2026-12-31"}, am="2026-09-30T00:00:00Z")
		self.assertEqual(pa["euroProHaJahr"], 2600)
		self.assertEqual(pa["indexierung"], "vpi")
		self.assertTrue(pa["rangruecktritt"])
		self.assertNotIn("rueckbau", pa)
		self.assertNotIn("boese", pa)
		self.assertEqual(pa["am"], "2026-09-30T00:00:00Z")


class TestKommune(unittest.TestCase):
	def test_kommune_daten(self):
		d = ff.kommune_daten({"land": "AT", "gemeindeSchluessel": "41234", "interesse6": "ja", "buergerbeteiligung": ["genossenschaft", "boese"]}, "")
		self.assertEqual(d["land"], "AT")
		self.assertEqual(d["interesse6"], "", "§ 6 EEG nur in Deutschland")
		self.assertEqual(d["buergerbeteiligung"], ["genossenschaft"])
		with self.assertRaises(ff.Fehler):
			ff.kommune_daten({"gemeindeSchluessel": "123"}, "DE")
		self.assertEqual(ff.kommune_daten({}, "DE", {"firma": "Stadt Beispiel"})["gemeinde"], "Stadt Beispiel")

	def test_gebiet_und_projektsicht(self):
		f = {"land": "DE", "bundesland": "Sachsen", "ort": "Demo-Stadt", "ha": 31, "status": "planung", "nutzerId": "U-1", "flurstuecke": [{"nummer": "1"}], "statusVerlauf": [{"status": "planung", "am": "2026-06-01T00:00:00Z"}]}
		self.assertTrue(ff.flaeche_im_gebiet(f, {"name": "Stadt Demo-Stadt", "land": "DE"}))
		self.assertFalse(ff.flaeche_im_gebiet(f, {"name": "Demo-Stadt", "land": "AT"}))
		self.assertFalse(ff.flaeche_im_gebiet({**f, "fach": {"lage": {"gemeindeSchluessel": "14729999"}}}, {"name": "Demo-Stadt", "land": "DE", "schluessel": "14729000"}))
		p = ff.projekt_fuer_gemeinde(f, 0)
		self.assertEqual(p["phase"], "Bauleitplanung / Genehmigung")
		self.assertGreater(p["par6"]["euroProJahr"], 0)
		self.assertFalse({"nutzerId", "flurstuecke", "ort"} & set(p.keys()), "keine vertraulichen Felder")
		self.assertIsNone(ff.paragraph6_schaetzung(10, "AT"))


if __name__ == "__main__":
	unittest.main()
