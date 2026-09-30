# Copyright (c) 2026, ÖkoInvest GmbH
#
# Fachprüfung Kapitalseite – reine Fachlogik (ohne Bench lauffähig):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_fach_kapital
# MaLo-/Zählpunkt-Prüfung, Datenblatt (Bereinigung, Vollständigkeit, Plausibilität, DD-Index), LOI-Pflichtfelder,
# Suchprofil-Erweiterung, Genossenschaft. Dieselben Fälle prüft scripts/plattform-test-fach-kapital.mjs für JS.

import unittest

from oekoinvest_app.plattform.fach import datenblatt as db
from oekoinvest_app.plattform.fach import energie, loi, mitglied, suchprofil


def projekt(**kw):
	p = {"typ": "freiflaeche", "land": "DE", "bundesland": "Bayern", "phase": "satzung", "mwp": 12, "flaecheHa": 13, "netzanschluss": "zusage", "codGeplant": "2028-06", "vertraulich": {"ertragKwhKwp": 1100}, "datenblatt": {}}
	p.update(kw)
	return p


class TestEnergie(unittest.TestCase):
	def test_malo(self):
		self.assertTrue(energie.malo_pruefen("41373559241")["ok"])
		self.assertTrue(energie.malo_pruefen("5123 8696 781")["ok"])
		self.assertFalse(energie.malo_pruefen("41373559242")["ok"])
		self.assertFalse(energie.malo_pruefen("01373559241")["ok"])
		self.assertFalse(energie.malo_pruefen("4137355924")["ok"])
		self.assertEqual(energie.malo_pruefziffer("4137355924"), 1)

	def test_zaehlpunkt(self):
		self.assertTrue(energie.zaehlpunkt_pruefen("AT0030000000000000000000000012345", "AT")["ok"])
		self.assertTrue(energie.zaehlpunkt_pruefen("DE00056266802AO6G56M11SN51G21M24S", "DE")["ok"])
		self.assertFalse(energie.zaehlpunkt_pruefen("AT003000000000000000000000001234", "AT")["ok"])
		self.assertFalse(energie.zaehlpunkt_pruefen("DE0030000000000000000000000012345", "AT")["ok"])
		self.assertTrue(energie.zaehlpunkt_pruefen("CH1234567890123456789012345678901", "CH")["ok"])

	def test_abnahmestelle(self):
		s = energie.abnahmestelle_bereinigen({"bezeichnung": "Werk", "land": "DE", "maloId": "41373559241", "messart": "rlm", "jahresverbrauchKwh": "850.000".replace(".", "")})
		self.assertEqual(s["maloId"], "41373559241")
		with self.assertRaises(energie.EnergieFehler):
			energie.abnahmestelle_bereinigen({"bezeichnung": "Werk", "land": "DE", "maloId": "41373559242", "messart": "rlm", "jahresverbrauchKwh": 1})
		with self.assertRaises(energie.EnergieFehler):
			energie.eg_teilnahme_bereinigen({"land": "AT", "form": "eeg_lokal", "zaehlpunkt": "AT1", "netzbetreiber": "X", "plz": "5121"})


class TestDatenblatt(unittest.TestCase):
	def test_bereinigen(self):
		d = db.datenblatt_bereinigen({"mwac": "10,5", "aufstaenderung": "quatsch", "ertragP90": 990, "fremd": 1, "zusageDatum": "2025-02-30"})
		self.assertEqual(d, {"mwac": 10.5, "ertragP90": 990})
		self.assertEqual(db.datenblatt_bereinigen(None, {"mwac": 1}), {"mwac": 1})

	def test_vollstaendigkeit_phase(self):
		frueh = db.datenblatt_vollstaendigkeit(projekt(phase="flaeche"))
		spaet = db.datenblatt_vollstaendigkeit(projekt(phase="rtb"))
		self.assertLess(frueh["erwartet"], spaet["erwartet"])

	def test_plausibel(self):
		p = projekt(datenblatt={"ertragP90": 1150, "mwac": 6})
		felder = {h["feld"]: h["stufe"] for h in db.datenblatt_pruefen(p, "2026-09-30")}
		self.assertEqual(felder.get("ertragP90"), "fehler")
		self.assertEqual(felder.get("mwac"), "warnung")  # DC/AC 2,0
		ok = db.datenblatt_pruefen(projekt(datenblatt={"ertragP90": 1010, "mwac": 10}), "2026-09-30")
		self.assertFalse([h for h in ok if h["feld"] in ("ertragP90", "mwac")])

	def test_dd_index(self):
		idx = db.dd_index(projekt(phase="flaeche"))
		self.assertEqual(len(idx["kategorien"]), 8)
		self.assertIn(idx["gesamt"], ("rot", "gelb", "gruen", "grau"))


class TestLoi(unittest.TestCase):
	def test_legacy(self):
		self.assertEqual(loi.loi_bereinigen({"betrag": 600000, "text": "Indikatives Angebot"})["betrag"], 600000)
		with self.assertRaises(loi.LoiFehler):
			loi.loi_bereinigen({"text": "Ohne Preis angegeben"})

	def test_struktur(self):
		basis = {"struktur": True, "text": "Angebot nach Datenraumprüfung", "preisbasis": "proKwp", "preisProKwp": 90, "transaktion": "share", "zahlung": "einmal", "bedingungenListe": ["dd"], "finanzierung": "ek", "gueltigBis": "2026-11-30"}
		r = loi.loi_bereinigen(basis, mwp=10, jetzt="2026-09-30")
		self.assertEqual(r["betrag"], 900000)
		for weg in ("transaktion", "gueltigBis", "finanzierung"):
			with self.assertRaises(loi.LoiFehler):
				loi.loi_bereinigen({k: x for k, x in basis.items() if k != weg}, mwp=10, jetzt="2026-09-30")
		with self.assertRaises(loi.LoiFehler):
			loi.loi_bereinigen({**basis, "gueltigBis": "2028-01-01"}, mwp=10, jetzt="2026-09-30")
		ev = loi.loi_bereinigen({**basis, "preisbasis": "ev", "enterpriseValue": 5000000, "nettoschulden": 3000000}, mwp=10, jetzt="2026-09-30")
		self.assertEqual(ev["betrag"], 2000000)


class TestSonstiges(unittest.TestCase):
	def test_suchprofil(self):
		e = suchprofil.suchprofil_erweiterung({"investorTyp": "fonds", "regionen": ["Bayern", "Mars"], "renditeZielPct": "7,5", "esg": ["taxonomie", "x"]}, ["Bayern"])
		self.assertEqual((e["investorTyp"], e["regionen"], e["renditeZielPct"], e["esg"]), ("fonds", ["Bayern"], 7.5, ["taxonomie"]))

	def test_geno(self):
		with self.assertRaises(mitglied.MitgliedFehler):
			mitglied.geno_interesse_bereinigen({"anteile": 4, "art": "privat", "interessen": ["beteiligung"], "bestaetigt": {"aufbau": True}})
		g = mitglied.geno_interesse_bereinigen({"anteile": 4, "art": "privat", "interessen": ["beteiligung"], "bestaetigt": {k: True for k in mitglied.BESTAETIGUNGEN}})
		self.assertEqual(g["anteile"], 4)


if __name__ == "__main__":
	unittest.main()
