# Copyright (c) 2026, ÖkoInvest GmbH
# Grundbuch & Closing – reine Regeln (ohne Frappe lauffähig):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_closing_kern
# Schrittfolge je Land, Reihenfolge/Nachweise, Status, Fristen, Kostenschätzer, Signing/Closing-Prüfung (wie closing/*.js).

import unittest

from oekoinvest_app.plattform import closing_kern as K

HEUTE = "2026-09-30"


class TestGrundbuch(unittest.TestCase):
	def test_schrittfolgen(self):
		self.assertEqual([s["schluessel"] for s in K.schritte_fuer("DE")], ["vertrag", "unterschrift", "beglaubigung", "rang", "antrag", "eintragung"])
		self.assertEqual([s["schluessel"] for s in K.schritte_fuer("CH")], ["vertrag", "beurkundung", "rang", "antrag", "eintragung"])
		self.assertIn("Grundbuchsgesuch", next(s for s in K.schritte_fuer("AT") if s["schluessel"] == "antrag")["label"])
		self.assertIs(K.schritte_fuer("XX"), K.schritte_fuer("DE"))
		self.assertEqual(K.recht_fuer("AT", "unbekannt"), "servitut")
		ohne = K.schritte_anlegen("DE", ohne_pfandrecht=True)
		self.assertEqual(next(s for s in ohne if s["schluessel"] == "rang")["status"], "entfaellt")

	def test_reihenfolge_und_nachweise(self):
		a = {"land": "DE", "erstelltAm": "2026-09-01", "schritte": K.schritte_anlegen("DE")}

		def setze(schluessel, status, **extra):
			neu = K.schritt_pruefen(a, {"schluessel": schluessel, "status": status, **extra}, HEUTE)
			a["schritte"] = [neu if s["schluessel"] == schluessel else s for s in a["schritte"]]

		with self.assertRaises(K.GrundbuchFehler) as e:
			K.schritt_pruefen(a, {"schluessel": "eintragung", "status": "erledigt", "nachweisWert": "Abt. II"}, HEUTE)
		self.assertEqual(e.exception.status, 409)
		with self.assertRaises(K.GrundbuchFehler) as e:
			K.schritt_pruefen(a, {"schluessel": "beglaubigung", "status": "entfaellt"}, HEUTE)
		self.assertEqual(e.exception.status, 422)
		with self.assertRaises(K.GrundbuchFehler):
			K.schritt_pruefen(a, {"schluessel": "vertrag", "status": "erledigt", "datum": "2027-01-01"}, HEUTE)
		self.assertEqual(K.akte_status(a), "vorbereitung")
		setze("vertrag", "erledigt", datum="2026-09-05")
		self.assertEqual(K.akte_status(a), "unterschrift")
		setze("unterschrift", "erledigt", datum="2026-09-10")
		setze("beglaubigung", "erledigt", datum="2026-09-12")
		with self.assertRaises(K.GrundbuchFehler) as e:
			K.schritt_pruefen(a, {"schluessel": "antrag", "status": "erledigt"}, HEUTE)
		self.assertEqual(e.exception.status, 422)
		setze("antrag", "erledigt", datum="2026-09-15", nachweisWert="Az. 12/2026")
		self.assertEqual(K.akte_status(a), "eingereicht")
		self.assertEqual(K.anlagen_dienstbarkeit_status(a), "beantragt")
		with self.assertRaises(K.GrundbuchFehler) as e:
			K.schritt_pruefen(a, {"schluessel": "eintragung", "status": "erledigt", "nachweisWert": "Abt. II Nr. 3"}, HEUTE)
		self.assertEqual(e.exception.status, 409)
		self.assertFalse(K.zuruecksetzen_erlaubt(a, "beglaubigung"))
		setze("rang", "erledigt", datum="2026-09-20", nachweisWert="Bank 20.09.")
		setze("eintragung", "erledigt", datum="2026-09-28", dokumentId="/private/files/auszug.pdf")
		self.assertEqual(K.akte_status(a), "eingetragen")
		self.assertEqual(K.fortschritt(a)["quote"], 1)

	def test_fristen(self):
		f = K.fristen_berechnen({"land": "DE", "erstelltAm": "2026-08-01", "schritte": K.schritte_anlegen("DE")}, HEUTE)
		v = next(s for s in f if s["schluessel"] == "vertrag")
		self.assertEqual(v["fristBerechnet"], "2026-08-15")
		self.assertTrue(v["ueberfaellig"])
		self.assertEqual(next(s for s in f if s["schluessel"] == "unterschrift")["fristBerechnet"], "")

	def test_kosten(self):
		self.assertEqual(K.gnotkg_tabelle_b(100000), 273)
		self.assertEqual(K.gnotkg_tabelle_b(1000000), 1735)
		de = K.grundbuch_kosten("DE", 30000, 30, 1)
		self.assertEqual(de["geschaeftswert"], 600000)
		self.assertTrue(any("KV 14121" in p["quelle"] for p in de["positionen"]))
		at = K.grundbuch_kosten("AT", 10000, 25)
		self.assertEqual(at["positionen"][0]["betrag"], 5000)
		self.assertEqual(K.grundbuch_kosten("CH", 5000)["waehrung"], "CHF")


class TestClosing(unittest.TestCase):
	def test_cps_und_pruefung(self):
		cps = K.cps_anlegen("share", ["gremien", "kartell"], HEUTE)
		schl = [c["schluessel"] for c in cps]
		self.assertIn("abtretung_form", schl)
		self.assertIn("gremien_kaeufer", schl)
		self.assertNotIn("vertragsuebernahme", schl)
		c = {"status": "vorbereitung", "kaufpreis": 5e6, "struktur": "share", "signing": {"punkte": K.signing_anlegen()}, "cps": cps, "zahlung": {}, "notar": {}}
		self.assertFalse(K.signing_pruefen(c, False, True)["ok"])
		self.assertFalse(K.signing_pruefen(c, True, False)["ok"])
		for p in c["signing"]["punkte"]:
			p["erledigt"] = True
		self.assertTrue(K.signing_pruefen(c, True, True)["ok"])
		c["status"] = "signing"
		pr = K.closing_pruefen(c, True, True)
		self.assertFalse(pr["ok"])
		self.assertTrue(any("Notartermin" in g for g in pr["gruende"]))
		for x in c["cps"]:
			x["status"] = "erfuellt"
		c["zahlung"] = {"eingangAm": HEUTE}
		c["notar"] = {"termin": "2026-10-10T08:00:00Z"}
		self.assertTrue(K.closing_pruefen(c, True, True)["ok"])
		self.assertFalse(K.closing_pruefen(c, True, False)["ok"])

	def test_kaufpreis_meilensteine_form(self):
		self.assertEqual(K.kaufpreis_ableiten(4.2e6, {"betrag": 4e6})["quelle"], "zuschlag")
		self.assertEqual(K.kaufpreis_ableiten(None, {"preisProKwp": 90}, 10)["betrag"], 900000)
		with self.assertRaises(K.GrundbuchFehler):
			K.meilensteine_bereinigen([{"label": "A", "betrag": 3e6}, {"label": "B", "betrag": 3e6}], 5e6)
		self.assertTrue(any("§ 15 Abs. 3 und 4 GmbHG" in h for h in K.form_hinweise("share", "DE")))
		self.assertTrue(any("Notariatsakt" in h for h in K.form_hinweise("share", "AT")))


if __name__ == "__main__":
	unittest.main()
