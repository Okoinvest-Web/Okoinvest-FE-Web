# Copyright (c) 2026, ÖkoInvest GmbH
# Mitgliederbereich – reine Regeln (ohne Frappe lauffähig):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_mitglied_kern
# Genossenschaft (Stammdaten, Beitritt, Einzahlung, Kündigungsstichtag, Übertragung, Ausschüttung), Generalversammlung
# (Einladungsfrist, Stimmzettel, Mehrheiten), Energiegemeinschaft (Verteilschlüssel, Monatsabrechnung) – wie mitglied/*.js.

import unittest

from oekoinvest_app.plattform import mitglied_kern as K

HEUTE = "2026-10-01"
IBAN_AT = "AT611904300234573201"
GENO = {"name": "Test eGen", "land": "AT", "registerStatus": "eingetragen", "registerNr": "FN 1a", "pruefungsverband": "Revisionsverband", "anteilEur": 250, "minAnteile": 2, "maxAnteile": 200, "iban": IBAN_AT, "satzungStand": "2025-01-20", "kuendigungsfristMonate": 6, "onlineGv": True}


def geno(**kw):
	return K.geno_bereinigen({**GENO, **kw})


def beitritt(**kw):
	best = {k: True for k in K.beitritt_bestaetigungen(geno())}
	return {"art": "privat", "vorname": "Max", "nachname": "Muster", "strasse": "Weg 1", "plz": "5121", "ort": "Ostermiething", "iban": IBAN_AT, "anteile": 4, "bestaetigt": best, **kw}


class TestGenossenschaft(unittest.TestCase):
	def test_stammdaten(self):
		g = geno()
		self.assertEqual(g["rechtsform"], "eGen")
		self.assertEqual(g["geschaeftsjahrEnde"], "12-31")
		with self.assertRaises(K.MitgliedFehler):
			geno(registerNr="")  # eingetragen ohne Registernummer
		with self.assertRaises(K.MitgliedFehler):
			geno(iban="AT611904300234573202")  # Prüfziffer falsch
		with self.assertRaises(K.MitgliedFehler):
			geno(nachschusspflicht="beschraenkt", haftsummeEur=0)
		self.assertEqual(K.geno_bereinigen({**GENO, "land": "CH", "pruefungsverband": "", "registerStatus": "eingetragen"})["kuendigungsfristMonate"], 6)
		self.assertEqual(K.geno_bereinigen({"name": "X", "anteilEur": 100, "land": "CH"})["kuendigungsfristMonate"], 12)

	def test_beitritt(self):
		g = geno()
		b = K.beitritt_bereinigen(beitritt(), g, HEUTE)
		self.assertEqual(b["betragEur"], 1000)
		self.assertFalse(b["freistellung"])
		with self.assertRaises(K.MitgliedFehler) as e:
			K.beitritt_bereinigen(beitritt(), {**g, "registerStatus": "aufbau"}, HEUTE)
		self.assertEqual(e.exception.status, 409)
		with self.assertRaises(K.MitgliedFehler):
			K.beitritt_bereinigen(beitritt(anteile=1), g, HEUTE)  # unter Pflichtbeteiligung
		with self.assertRaises(K.MitgliedFehler):
			K.beitritt_bereinigen(beitritt(bestaetigt={"satzung": True}), g, HEUTE)
		with self.assertRaises(K.MitgliedFehler):
			K.beitritt_bereinigen(beitritt(iban="DE00123"), g, HEUTE)
		with self.assertRaises(K.MitgliedFehler):
			K.beitritt_bereinigen(beitritt(geburtsdatum="2012-01-01"), g, HEUTE)  # minderjährig
		with self.assertRaises(K.MitgliedFehler):
			K.beitritt_bereinigen(beitritt(art="verein", firma="Verein"), g, HEUTE)  # Vertretung fehlt
		self.assertIn("nachschuss", K.beitritt_bestaetigungen({"nachschusspflicht": "beschraenkt"}))

	def test_guthaben_und_nummer(self):
		g = geno(eintrittsgeldEur=10)
		m = {"anteile": 4, "eingezahltEur": 510}
		self.assertEqual(K.pflicht_betrag(m, g), 1010)
		self.assertEqual(K.offener_betrag(m, g), 500)
		self.assertEqual(K.geschaeftsguthaben(m, g), 500)
		self.assertEqual(K.naechste_nummer(["0001", "0007", ""]), "0008")
		with self.assertRaises(K.MitgliedFehler):
			K.einzahlung_bereinigen({"betragEur": 10, "am": "2027-01-01"}, HEUTE)

	def test_kuendigung(self):
		self.assertEqual(K.kuendigungs_stichtag("2026-09-30", 3), "2026-12-31")
		self.assertEqual(K.kuendigungs_stichtag("2026-10-01", 3), "2027-12-31")
		self.assertEqual(K.kuendigungs_stichtag("2026-10-01", 12), "2027-12-31")
		self.assertEqual(K.kuendigungs_stichtag("2026-02-15", 1, "06-30"), "2026-06-30")
		self.assertEqual(K.auszahlung_bis("2026-12-31", "DE"), "2027-06-30")
		self.assertIsNone(K.auszahlung_bis("2026-12-31", "AT"))
		g = geno()
		m = {"status": "aktiv", "anteile": 8, "eingezahltEur": 2000, "kuendigungen": []}
		k = K.kuendigung_bereinigen({"art": "teil", "anteile": 3, "bestaetigt": True}, m, g, HEUTE)
		self.assertEqual(k["wirksamZum"], "2027-12-31")
		with self.assertRaises(K.MitgliedFehler):
			K.kuendigung_bereinigen({"art": "teil", "anteile": 7, "bestaetigt": True}, m, g, HEUTE)  # Pflichtbeteiligung 2
		with self.assertRaises(K.MitgliedFehler):
			K.kuendigung_bereinigen({"art": "voll"}, m, g, HEUTE)
		self.assertEqual(K.auseinandersetzung(m, g, 3), 750)

	def test_uebertragung(self):
		g = geno()
		m = {"status": "aktiv", "anteile": 8, "eingezahltEur": 2000}
		u = K.uebertragung_bereinigen({"anEmail": "a@example.com", "anteile": 2, "bestaetigt": True}, m, g)
		self.assertEqual(u["betragEur"], 500)
		with self.assertRaises(K.MitgliedFehler):
			K.uebertragung_bereinigen({"anEmail": "a@example.com", "anteile": 2, "bestaetigt": True}, {**m, "eingezahltEur": 1000}, g)
		with self.assertRaises(K.MitgliedFehler):
			K.uebertragung_empfaenger_pruefen({"status": "aktiv", "anteile": 199}, 2, g)
		self.assertEqual(K.uebertragung_bereinigen({"anEmail": "a@example.com", "art": "voll", "bestaetigt": True}, m, g)["anteile"], 8)

	def test_ausschuettung(self):
		a = K.ausschuettung_bereinigen({"art": "dividende", "geschaeftsjahr": 2025, "satzPct": "2"}, HEUTE)
		r = K.ausschuettung_berechnen(a, [{"mitgliedId": "GM-1", "guthabenEur": 2000}, {"mitgliedId": "GM-2", "guthabenEur": 0}], geno())
		self.assertEqual(r["anzahl"], 1)
		self.assertEqual(r["positionen"][0]["bruttoEur"], 40)
		self.assertEqual(r["positionen"][0]["steuerEur"], 11)  # KESt 27,5 %
		de = K.ausschuettung_berechnen(a, [{"mitgliedId": "GM-1", "guthabenEur": 2000, "freistellung": True}], {**geno(), "land": "DE"})
		self.assertEqual(de["positionen"][0]["steuerEur"], 0)  # innerhalb Sparer-Pauschbetrag
		with self.assertRaises(K.MitgliedFehler):
			K.ausschuettung_bereinigen({"art": "dividende", "geschaeftsjahr": 2027, "satzPct": 2}, HEUTE)
		rv = K.ausschuettung_bereinigen({"art": "rueckverguetung", "geschaeftsjahr": 2025, "ctProKwh": 1}, HEUTE)
		self.assertEqual(K.ausschuettung_berechnen(rv, [{"mitgliedId": "GM-1", "umsatzKwh": 1500}], geno())["summe"]["nettoEur"], 15)


class TestVersammlung(unittest.TestCase):
	def gv(self, **kw):
		return K.versammlung_bereinigen({"titel": "GV", "form": "online", "datum": "2026-11-20T18:00", "abstimmungBis": "2026-11-20T20:00", "tagesordnung": [{"titel": "Bericht"}, {"titel": "Jahresabschluss", "beschluss": True}, {"titel": "Satzung", "beschluss": True, "mehrheit": "einfach", "satzung": True}], **kw}, geno())

	def test_bereinigen_und_frist(self):
		g = self.gv()
		self.assertEqual([t["id"] for t in g["tagesordnung"]], ["T1", "T2", "T3"])
		self.assertEqual(g["tagesordnung"][2]["mehrheit"], "zweidrittel")  # AT: Satzungsänderung mind. zwei Drittel
		self.assertEqual(K.versammlung_bereinigen({"titel": "GV", "form": "praesenz", "ort": "Saal", "datum": "2026-11-20T18:00", "tagesordnung": [{"titel": "S", "beschluss": True, "satzung": True}]}, {**geno(), "land": "DE"})["tagesordnung"][0]["mehrheit"], "dreiviertel")
		with self.assertRaises(K.MitgliedFehler):
			K.versammlung_bereinigen({"titel": "GV", "form": "online", "datum": "2026-11-20T18:00", "abstimmungBis": "2026-11-20T20:00", "tagesordnung": [{"titel": "x"}]}, {**geno(), "onlineGv": False})
		with self.assertRaises(K.MitgliedFehler):
			K.einladung_pruefen({**g, "status": "entwurf", "datum": "2026-10-05T18:00"}, geno(), HEUTE)
		self.assertEqual(K.einladung_pruefen({**g, "status": "entwurf"}, geno(), HEUTE)["frist"], 7)  # AT ohne Satzungsfrist: Mindestwert
		self.assertEqual(K.einladung_pruefen({**g, "status": "entwurf"}, geno(einladungsfristTage=14), HEUTE)["frist"], 14)
		self.assertEqual(K.einladungsfrist({"land": "CH"}), 5)

	def test_stimmen_und_ergebnis(self):
		g = {**self.gv(), "status": "abstimmung"}
		self.assertTrue(K.abstimmung_offen(g, "2026-11-20T19:59"))
		self.assertFalse(K.abstimmung_offen(g, "2026-11-20T20:01"))
		with self.assertRaises(K.MitgliedFehler):
			K.stimme_bereinigen({"T2": "ja"}, g)
		s = [{"id": "S1", "am": "a", "stimmen": {"T2": "ja", "T3": "ja"}}, {"id": "S2", "am": "b", "stimmen": {"T2": "nein", "T3": "ja"}}, {"id": "S3", "am": "c", "stimmen": {"T2": "enthaltung", "T3": "nein"}}]
		e = K.ergebnis_rechnen(g, s, 4)
		self.assertEqual(e["tops"][0]["ja"], 1)
		self.assertFalse(e["tops"][0]["angenommen"])  # 1:1 – keine Mehrheit
		self.assertTrue(e["tops"][1]["angenommen"])  # 2:1 = zwei Drittel
		self.assertEqual(e["beteiligungPct"], 75)
		self.assertTrue(K.angenommen(3, 1, "dreiviertel"))
		self.assertFalse(K.angenommen(2, 1, "dreiviertel"))
		self.assertEqual(K.stimmen_kanonisch("GV-1", s), K.stimmen_kanonisch("GV-1", list(reversed(s))))
		with self.assertRaises(K.MitgliedFehler):
			K.abschluss_bereinigen({"versammlungsleiter": "A", "protokollfuehrer": "B", "anwesend": 5}, {**g, "form": "hybrid"}, 4, 0)


class TestEnergiegemeinschaft(unittest.TestCase):
	def eg(self, **kw):
		return K.gemeinschaft_bereinigen({"name": "EEG", "land": "AT", "form": "eeg_regional", "netzbetreiber": "Netz", "tarifBezugCt": 11, "tarifEinspeisungCt": 9, "plzListe": "5120, 5121", **kw})

	def test_stammdaten_und_hindernisse(self):
		g = self.eg()
		self.assertEqual(g["plzListe"], ["5120", "5121"])
		with self.assertRaises(K.MitgliedFehler):
			self.eg(tarifEinspeisungCt=12)
		with self.assertRaises(K.MitgliedFehler):
			self.eg(form="eeg_lokal", gebiet="")
		self.assertTrue(K.teilnahme_hindernisse(None, g))
		self.assertTrue(K.teilnahme_hindernisse({"land": "AT", "plz": "4020"}, g))
		self.assertEqual(K.teilnahme_hindernisse({"land": "AT", "plz": "5121", "smartMeter": True}, g), [])
		self.assertEqual(K.rabatt_fuer("AT", "eeg_lokal"), 0.57)
		self.assertEqual(K.rabatt_fuer("CH", "zev"), 0)

	def test_verteilen(self):
		self.assertEqual(K.verteilen(100, [{"id": "a", "verbrauchKwh": 30}, {"id": "b", "verbrauchKwh": 200}])["zuteilung"], {"a": 13, "b": 87})
		r = K.verteilen(100, [{"id": "a", "verbrauchKwh": 30, "anteilPct": 50}, {"id": "b", "verbrauchKwh": 200, "anteilPct": 50}], "statisch")
		self.assertEqual(r["zuteilung"], {"a": 30, "b": 50})
		self.assertEqual(r["ueberschussKwh"], 20)
		r = K.verteilen(300, [{"id": "a", "verbrauchKwh": 30}, {"id": "b", "verbrauchKwh": 200}])
		self.assertEqual(r["zuteilung"], {"a": 30, "b": 200})
		self.assertEqual(r["ueberschussKwh"], 70)

	def test_monatsabrechnung(self):
		g = self.eg(grundgebuehrMonat=1.5)
		r = K.monatsabrechnung(g, "2026-07", [
			{"id": "T1", "stamm": {"land": "AT", "rolle": "bezug", "jahresverbrauchKwh": 3600}, "messwerte": {"verbrauchKwh": 300}},
			{"id": "T2", "stamm": {"land": "AT", "rolle": "beides", "anlageKwp": 60}, "messwerte": {"verbrauchKwh": 0, "erzeugungKwh": 200}},
		])
		p1, p2 = r["positionen"]
		self.assertEqual(p1["bezugGemeinschaftKwh"], 200)
		self.assertEqual(p1["bezugEur"], 22)
		self.assertEqual(p1["saldoEur"], -23.5)
		self.assertEqual(p2["einspeisungGemeinschaftKwh"], 200)
		self.assertEqual(p2["gutschriftEur"], 18)
		self.assertFalse(r["geschaetzt"])
		self.assertTrue(K.monatsabrechnung(g, "2026-07", [{"id": "T1", "stamm": {"land": "AT", "rolle": "bezug"}}])["geschaetzt"])
		with self.assertRaises(K.MitgliedFehler):
			K.monatsabrechnung(g, "2026-13", [])
		self.assertEqual(K.messwerte_bereinigen({"ET-26-ABCDEF": {"verbrauchKwh": "12,5"}, "boese": {"verbrauchKwh": 1}}), {"ET-26-ABCDEF": {"verbrauchKwh": 12.5, "erzeugungKwh": 0}})


if __name__ == "__main__":
	unittest.main()
