# Copyright (c) 2026, ÖkoInvest GmbH
# Anbieter / Verkäufer – reine Regeln (ohne Frappe lauffähig):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_anbieter_kern
# Vermittlungsauftrag, Prüfpunkte, Anonymisierung, LOI-Stellungnahme, Vorkenntnis-Frist, Sperren, Bestandsanlage (wie anbieter/*.js).

import unittest

from oekoinvest_app.plattform import anbieter_kern as K

HEUTE = "2026-09-30"


class TestHilfen(unittest.TestCase):
	def test_werktage_und_monate(self):
		self.assertEqual(K.werktage_plus("2026-09-30", 10), "2026-10-14")  # Mi + 10 Werktage
		self.assertEqual(K.werktage_plus("2026-10-02", 1), "2026-10-05")  # Fr → Mo
		self.assertEqual(K.monate_plus("2026-01-31", 1), "2026-02-28")
		self.assertEqual(K.monatsende("2026-02-10"), "2026-02-28")
		self.assertEqual(K.de_zahl(1095.6), "1.095,6")
		self.assertEqual(K.tag_von("2026-09-30T22:30:00.000Z"), "2026-10-01")  # Wien = UTC+2


class TestMandat(unittest.TestCase):
	def test_eingabe(self):
		with self.assertRaises(K.AnbieterFehler):
			K.mandat_eingabe({"art": "exklusiv", "name": "Max Muster", "zustimmung": True})  # Dauer fehlt
		with self.assertRaises(K.AnbieterFehler):
			K.mandat_eingabe({"art": "einfach", "name": "Max Muster"})  # Zustimmung fehlt
		with self.assertRaises(K.AnbieterFehler) as e:
			K.mandat_eingabe({"art": "einfach", "name": "Erika Beispiel", "zustimmung": True}, konto_name="Max Muster")
		self.assertIn("Nachnamen", str(e.exception))
		m = K.mandat_eingabe({"art": "exklusiv", "dauerMonate": 6, "vorbehalte": "Firma A\n\nFirma B", "name": "Max Muster", "zustimmung": True}, konto_name="Max Muster")
		self.assertEqual(m, {"art": "exklusiv", "dauerMonate": 6, "vorbehalte": ["Firma A", "Firma B"], "name": "Max Muster"})

	def test_text_und_hash(self):
		a = K.mandat_text({"id": "P-26-ABC123", "titel": "Freifläche 10 MWp"}, {"art": "einfach", "vorbehalte": []}, {"vorname": "Max", "nachname": "Muster", "firma": "Muster GmbH"})
		self.assertEqual(len(a), 9)
		self.assertIn("zwischen 1,5 und 3 %", a[2])
		self.assertIn("zehn Werktagen", a[3])
		self.assertEqual(len(K.mandat_hash(a)), 64)

	def test_stand_und_kuendigung(self):
		m = {"art": "exklusiv", "dauerMonate": 6, "erteiltAm": "2026-09-01T08:00:00Z"}
		self.assertEqual(K.mandat_stand(m, HEUTE)["status"], "wartet")
		m.update(bestaetigtAm="2026-09-02T08:00:00Z", mindestBis="2027-03-02")
		st = K.mandat_stand(m, HEUTE)
		self.assertTrue(st["status"] == "wirksam" and st["exklusivAktiv"])
		self.assertEqual(K.exklusivitaet_ende(m, HEUTE), "2027-03-02")  # frühestens Ende der Mindestlaufzeit
		with self.assertRaises(K.AnbieterFehler) as e:
			K.mandat_kuendigung(m, HEUTE, "entwurf")
		self.assertEqual(e.exception.status, 409)
		with self.assertRaises(K.AnbieterFehler):
			K.mandat_kuendigung({"art": "einfach", "erteiltAm": "x"}, HEUTE, "veroeffentlicht")
		self.assertEqual(K.mandat_kuendigung({"art": "einfach", "erteiltAm": "x"}, HEUTE, "entwurf"), HEUTE)
		m.update(exklusivEndetAm="2026-09-15")
		self.assertFalse(K.mandat_stand(m, HEUTE)["exklusivAktiv"])


class TestPruefpunkte(unittest.TestCase):
	def test_ablauf(self):
		e = K.pruefpunkt_eingabe({"bereich": "unterlagen", "text": "Bitte Netzzusage hochladen.", "fristTage": 3}, HEUTE)
		self.assertEqual(e["fristAm"], "2026-10-03")
		self.assertTrue(e["pflicht"])
		pp = {**e, "status": "offen"}
		with self.assertRaises(K.AnbieterFehler) as x:
			K.pruefpunkt_aktion(pp, "antworten", "backoffice", antwort="xx")
		self.assertEqual(x.exception.status, 403)
		r = K.pruefpunkt_aktion(pp, "antworten", "anbieter", antwort="Hochgeladen, siehe Datenraum.")
		self.assertEqual(r["status"], "beantwortet")
		pp.update(r)
		with self.assertRaises(K.AnbieterFehler):
			K.pruefpunkt_aktion(pp, "erneut", "backoffice", kommentar="")
		self.assertEqual(K.pruefpunkt_aktion(pp, "erledigt", "backoffice")["status"], "erledigt")

	def test_sperren(self):
		akte = {"pruefpunkte": [{"status": "offen", "pflicht": True}]}
		with self.assertRaises(K.AnbieterFehler) as e:
			K.uebergang_sperre("projekt", "pruefung", "entwurf", akte=akte)
		self.assertEqual(e.exception.status, 422)
		akte["pruefpunkte"][0]["status"] = "beantwortet"
		self.assertTrue(K.uebergang_sperre("projekt", "pruefung", "entwurf", akte=akte))
		with self.assertRaises(K.AnbieterFehler) as e:
			K.uebergang_sperre("projekt", "veroeffentlicht", "pruefung", akte=akte, projekt={"titel": "X"})
		self.assertEqual(e.exception.code, "pruefpunkte")
		akte["pruefpunkte"][0]["status"] = "erledigt"
		with self.assertRaises(K.AnbieterFehler) as e:
			K.uebergang_sperre("projekt", "veroeffentlicht", "pruefung", akte=akte, projekt={"titel": "Solarpark Musterdorf", "vertraulich": {"gemeinde": "Musterdorf"}})
		self.assertEqual(e.exception.code, "anonymitaet")
		self.assertTrue(K.uebergang_sperre("projekt", "veroeffentlicht", "reserviert", akte=akte, projekt={"titel": "Solarpark Musterdorf", "vertraulich": {"gemeinde": "Musterdorf"}}))
		voten = [{"interesseId": "I-1", "loiAm": "a", "art": "ablehnung"}]
		with self.assertRaises(K.AnbieterFehler):
			K.uebergang_sperre("interesse", "loi_angenommen", "loi_abgegeben", akte={"voten": voten}, interesse_id="I-1", loi_am="a")
		self.assertTrue(K.uebergang_sperre("interesse", "loi_angenommen", "loi_abgegeben", akte={"voten": voten}, interesse_id="I-1", loi_am="b"))  # neue LOI-Fassung


class TestAnonymitaet(unittest.TestCase):
	def test_treffer(self):
		p = {
			"titel": "Solarpark Musterdorf 12 MWp",
			"beschreibung": "Kontakt max@x.de, Flurstück 123/4, Tel. 0171 1234567, Hauptstraße 5. Inbetriebnahme 2028, 12.000.000 kWh.",
			"vertraulich": {"gemeinde": "Musterdorf", "flurstuecke": "123/4, 456", "netzbetreiber": "LEW"},
		}
		a = K.anonymitaet_pruefen(p, anbieter={"firma": "Muster GmbH"})
		self.assertFalse(a["ok"])
		texte = " ".join(t["text"] for t in a["treffer"])
		for w in ("Gemeinde", "Flurstück (123/4)", "E-Mail", "Telefonnummer", "Straßenadresse"):
			self.assertIn(w, texte)
		ok = K.anonymitaet_pruefen({"titel": "Freifläche 12 MWp in Schwaben", "region": "Schwaben", "beschreibung": "Baureif, Netzzusage 2027, 13 ha, 1.100 kWh/kWp, 120 000 000 kWh", "vertraulich": {"gemeinde": "Au"}})
		self.assertTrue(ok["ok"] and not ok["treffer"])


class TestVotumVorkenntnis(unittest.TestCase):
	def test_votum(self):
		with self.assertRaises(K.AnbieterFehler):
			K.votum_eingabe({"art": "ablehnung", "kommentar": "zu kurz"})
		self.assertEqual(K.votum_eingabe({"art": "verhandeln", "kommentar": "Preis zu niedrig, Gegenvorschlag.", "gegenvorschlag": "1.200.000"})["gegenvorschlag"], None)  # Punkt als Dezimal → ungültig
		self.assertEqual(K.votum_eingabe({"art": "verhandeln", "kommentar": "Preis zu niedrig, Gegenvorschlag.", "gegenvorschlag": 1200000})["gegenvorschlag"], 1200000)
		self.assertEqual(K.aktuelles_votum([{"interesseId": "I", "loiAm": "1", "art": "zustimmung"}, {"interesseId": "I", "loiAm": "1", "art": "ablehnung"}], "I", "1")["art"], "ablehnung")

	def test_vorkenntnis(self):
		self.assertEqual(K.vorkenntnis_frist("2026-09-30T08:00:00Z"), "2026-10-14")
		with self.assertRaises(K.AnbieterFehler):
			K.vorkenntnis_eingabe({"begruendung": "Kenne den Investor seit Jahren aus Projekt X.", "nachweisArt": "korrespondenz", "nachweisDatum": "2026-09-30"}, "2026-09-20T08:00:00Z", HEUTE)  # nach Anzeige
		e = K.vorkenntnis_eingabe({"begruendung": "Kenne den Investor seit Jahren aus Projekt X.", "nachweisArt": "korrespondenz", "nachweisDatum": "2026-08-01"}, "2026-09-01T08:00:00Z", HEUTE)
		self.assertTrue(e["verspaetet"])
		self.assertEqual(e["frist"], "2026-09-15")


class TestBestand(unittest.TestCase):
	def _csv(self, jahre=3, rueckgang=0.0):
		profil = [30, 55, 90, 120, 140, 150, 155, 135, 100, 65, 35, 25]
		z = ["Monat;Ertrag kWh;Prognose kWh;Einstrahlung;Verfügbarkeit"]
		for i in range(jahre * 12):
			y, m = 2023 + i // 12, i % 12 + 1
			e = 1000 * profil[m - 1] * (1 - rueckgang * (y - 2023))
			z.append(f"{y}-{m:02d};{str(round(e, 1)).replace('.', ',')};{round(e * 1.03)};{str(round(e / 1000 / 0.84, 1)).replace('.', ',')};99,1")
		return "\n".join(z)

	def test_csv_und_auswertung(self):
		r = K.ertrag_csv_lesen(self._csv())
		self.assertEqual((len(r["monate"]), r["fehler"]), (36, []))
		a = K.ertrag_auswerten(r["monate"], kwp=1000, heute=HEUTE)
		self.assertEqual(a["gesamt"]["spezErtragVollJahr"], 1100)
		self.assertAlmostEqual(a["gesamt"]["pr"], 0.84, places=2)
		self.assertEqual(a["gesamt"]["istZuPrognose"], 0.971)
		self.assertEqual(a["luecken"], [])
		f = K.ertrag_csv_lesen("2024-01;100\nxx;5\n2024-03;abc")
		self.assertEqual(len(f["monate"]), 1)
		self.assertEqual(len(f["fehler"]), 2)
		self.assertIn("2024-02", K.ertrag_auswerten(K.ertrag_csv_lesen("2024-01;100\n2024-03;100")["monate"], kwp=1)["luecken"])

	def test_vertraege_foerderung_dd(self):
		self.assertEqual(K.foerder_ende({"inbetriebnahme": "2012-06-30", "vermarktung": "marktpraemie"}, "DE")["datum"], "2032-12-31")
		self.assertEqual(K.foerder_ende({"inbetriebnahme": "2012-06-30", "vermarktung": "marktpraemie"}, "AT")["datum"], "")
		with self.assertRaises(K.AnbieterFehler):
			K.vertrag_bereinigen({"art": "om", "beginn": "2026-01-01", "ende": "2025-01-01"})
		h = K.vertraege_hinweise([{"art": "pacht", "ende": "2030-12-31", "uebertragbar": "zustimmung"}], "2032-12-31", HEUTE)
		t = " ".join(x["text"] for x in h)
		self.assertIn("O&M", t)
		self.assertIn("vor dem Förderende", t)
		self.assertIn("Vollzugsbedingung", t)
		self.assertEqual(K.dd_stand({"doku": {"status": "vorhanden"}, "messung": {"status": "nz"}})["erfuellt"], 2)
		self.assertFalse(K.foerderung_bereinigen({"register": "SEE123"}, "DE")["registerFormatOk"])
		self.assertTrue(K.foerderung_bereinigen({"register": "SEE912345678901"}, "DE")["registerFormatOk"])


if __name__ == "__main__":
	unittest.main()
