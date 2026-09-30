# Copyright (c) 2026, ÖkoInvest GmbH
# Akquise Ausbaustufe 2 (api/akquise_kampagne.py) auf der Test-Bench: Rechte (nur Leitung/Akquise), Kampagne → Grundbuch-
# Aufgaben → Eigentümer → Serienbrief-Daten → Versand → Angebotsseite (ohne Eigentümerdaten) → Widerspruch → Sperre greift in
# einer zweiten Kampagne (Person + Flurstücke) → Gemeinde-Screening mit Übergabe. Aufräumen über kampagne_loeschen (Test).
# Spiegel von scripts/plattform-test-akquise2.mjs.   bench --site <site> run-tests --module oekoinvest_app.plattform.tests.test_akquise_kampagne

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import akquise_kampagne as ak
from oekoinvest_app.plattform.tests.testdaten import aufruf, konto, vorbereiten

GEOM = {"type": "MultiPolygon", "coordinates": [[[[10.64, 48.06], [10.644, 48.06], [10.644, 48.0627], [10.64, 48.0627], [10.64, 48.06]]]]}


def kandidat(kid, gemeinde="Testheim", land="DE"):
	return {
		"id": kid, "demo": True, "ha": 9.5, "mwp": 8.6, "score": 81, "ampel": "gruen", "prioritaet": "A", "land": land, "bundesland": "Bayern", "bezirk": "Unterallgäu",
		"gemeinde": gemeinde, "geometrie": GEOM, "schwerpunkt": [10.642, 48.061],
		"parzellen": [{"id": f"{kid}-1", "kg": "DEMO-Gemarkung Testheim", "kgNr": "9901", "gstNr": f"{kid[-3:]}/1", "ha": 5}, {"id": f"{kid}-2", "kg": "DEMO-Gemarkung Testheim", "kgNr": "9901", "gstNr": f"{kid[-3:]}/2", "ha": 4.5}],
		"netz": {"knoten": {"id": "osm-test-uw", "name": "UW Test", "art": "uw110", "kapazitaet": "unbekannt"}, "trasseM": 1800, "kosten": {"min": 300000, "max": 500000}},
		"merkmale": {"kulisse": {"randstreifenAnteil": 1, "privilegiertAnteil": 0.7}, "hauptnutzung": "acker"}, "widmung": {"status": "zone", "text": "Privilegiert"},
	}


P1 = {"anrede": "Frau", "vorname": "Erika", "nachname": "Bench-Eigen", "strasse": "Mühlweg 7", "plz": "86842", "ort": "Türkheim"}
P2 = {"anrede": "Herr", "vorname": "Hans", "nachname": "Bench-Widerspruch", "strasse": "Bahnhofstraße 3", "plz": "86807", "ort": "Buchloe"}


class TestAkquiseKampagne(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.leitung = konto(["admin"], vorname="Leitung")
		cls.akquise = konto(["admin"], vorname="Akquise")
		frappe.db.set_value("Plattform Konto", cls.akquise, "backoffice_rollen", "akquise")
		cls.transaktion = konto(["admin"], vorname="Transaktion")
		frappe.db.set_value("Plattform Konto", cls.transaktion, "backoffice_rollen", "transaktion")
		cls.investor = konto(["investor"])
		cls.kampagnen = []

	@classmethod
	def tearDownClass(cls):
		for k in cls.kampagnen:
			if frappe.db.exists("Plattform Kampagne", k):
				aufruf(ak.kampagne_loeschen, id=k, als_benutzer=cls.leitung)
		super().tearDownClass()

	def tearDown(self):
		frappe.set_user("Administrator")

	def test_rechte(self):
		for k in (self.transaktion, self.investor):
			with self.assertRaises(frappe.PermissionError):
				aufruf(ak.kampagnen, als_benutzer=k)
			with self.assertRaises(frappe.PermissionError):
				aufruf(ak.kampagne_anlegen, kandidaten=[kandidat("K-BENCH-900")], daten={"name": "Fremd"}, als_benutzer=k)
			with self.assertRaises(frappe.PermissionError):
				aufruf(ak.sperrliste, als_benutzer=k)
		with self.assertRaises(frappe.ValidationError):
			aufruf(ak.kampagne_anlegen, kandidaten=[kandidat("K-BENCH-901")], daten={"name": "Test", "test": True}, als_benutzer=self.akquise)
		with self.assertRaises(frappe.ValidationError):
			aufruf(ak.kampagne_anlegen, kandidaten=[kandidat("K-BENCH-902"), kandidat("K-BENCH-903", land="AT")], daten={"name": "Gemischt"}, als_benutzer=self.leitung)

	def test_ablauf_und_sperre_ueber_kampagnen(self):
		r = aufruf(ak.kampagne_anlegen, kandidaten=[kandidat("K-BENCH-101"), kandidat("K-BENCH-102")], daten={"name": "Bench A", "test": True}, als_benutzer=self.leitung)
		k1 = r["kampagne"]["id"]
		self.kampagnen.append(k1)
		self.assertEqual(r["ziele"], 2)
		s = aufruf(ak.kampagne_starten, id=k1, als_benutzer=self.akquise)
		self.assertEqual(s["aufgaben"], 2)
		d = aufruf(ak.kampagne, id=k1, als_benutzer=self.akquise)
		z1, z2 = d["ziele"]
		self.assertTrue(all(z["status"] == "grundbuch" for z in d["ziele"]))
		aufruf(ak.grundbuch_ergebnis, ziel_id=z1["id"], daten={"empfaenger": [P1], "kostenIst": 16}, als_benutzer=self.akquise)
		aufruf(ak.grundbuch_ergebnis, ziel_id=z2["id"], daten={"empfaenger": [P2]}, als_benutzer=self.akquise)
		sb = aufruf(ak.serienbrief_daten, id=k1, stufe=1, als_benutzer=self.akquise)
		self.assertEqual(len(sb["empfaenger"]), 2)
		self.assertEqual(aufruf(ak.versand_bestaetigen, id=k1, daten={"stufe": 1}, als_benutzer=self.akquise)["anzahl"], 2)
		d = aufruf(ak.kampagne, id=k1, als_benutzer=self.akquise)
		e1 = next(z for z in d["ziele"] if z["id"] == z1["id"])["empfaenger"][0]
		e2 = next(z for z in d["ziele"] if z["id"] == z2["id"])["empfaenger"][0]
		# Angebotsseite: nur Steckbrief, keine Eigentümerdaten
		a = aufruf(ak.angebot_fuer_code, code=e1["code"])
		self.assertEqual(a["gemeinde"], "Testheim")
		self.assertNotIn("Bench-Eigen", frappe.as_json(a))
		self.assertNotIn("Mühlweg", frappe.as_json(a))
		self.assertTrue(aufruf(ak.angebot_aufruf, code=e1["code"])["ok"])
		self.assertIsNone(aufruf(ak.angebot_fuer_code, code="ABCDE23456"))
		# Widerspruch online → Sperre
		aufruf(ak.angebot_widerspruch, code=e2["code"])
		self.assertTrue(aufruf(ak.angebot_fuer_code, code=e2["code"])["gesperrt"])
		sp = aufruf(ak.sperrliste, als_benutzer=self.akquise)["eintraege"]
		self.assertTrue(any(x["kampagneId"] == k1 and x["quelle"] == "online" for x in sp))
		self.assertNotIn("Bench-Widerspruch", frappe.as_json(sp))
		# zweite Kampagne: gleiche Flurstücke gesperrt, gleiche Person sofort gesperrt
		r2 = aufruf(ak.kampagne_anlegen, kandidaten=[kandidat("K-BENCH-102"), kandidat("K-BENCH-103")], daten={"name": "Bench B", "test": True}, als_benutzer=self.leitung)
		k2 = r2["kampagne"]["id"]
		self.kampagnen.append(k2)
		self.assertEqual(r2["gesperrt"], 1)
		aufruf(ak.kampagne_starten, id=k2, als_benutzer=self.akquise)
		d2 = aufruf(ak.kampagne, id=k2, als_benutzer=self.akquise)
		z3 = next(z for z in d2["ziele"] if z["kandidatId"] == "K-BENCH-103")
		g = aufruf(ak.grundbuch_ergebnis, ziel_id=z3["id"], daten={"empfaenger": [{**P2, "strasse": "Bahnhofstr. 3a"}]}, als_benutzer=self.akquise)
		self.assertTrue(g["neu"][0]["gesperrt"])
		self.assertEqual(len(aufruf(ak.serienbrief_daten, id=k2, stufe=1, als_benutzer=self.akquise)["empfaenger"]), 0)
		# Rücklauf und Kennzahlen
		aufruf(ak.empfaenger_aendern, ziel_id=z1["id"], empfaenger_id=e1["id"], daten={"status": "gesichert", "gesichertHa": 8}, als_benutzer=self.akquise)
		kz = aufruf(ak.kampagne, id=k1, als_benutzer=self.akquise)["kampagne"]["kennzahlen"]
		self.assertEqual((kz["briefe"], kz["widersprueche"], kz["gesichertHa"]), (2, 1, 8))
		self.assertEqual(kz["kosten"]["grundbuch"], 16)
		# Sperre aufheben nur Leitung
		with self.assertRaises(frappe.PermissionError):
			aufruf(ak.sperre_aufheben, id=sp[0]["id"], daten={"begruendung": "Testlauf irrtümlich"}, als_benutzer=self.akquise)

	def test_gemeinde_screening(self):
		ks = [kandidat("K-BENCH-201", "Screeningdorf"), kandidat("K-BENCH-202", "Screeningdorf"), kandidat("K-BENCH-203", "Kleinweiler")]
		r = aufruf(ak.gemeinden_screening, kandidaten=ks, filter={}, als_benutzer=self.akquise)
		self.assertEqual(r["gemeinden"][0]["name"], "Screeningdorf")
		s = r["gemeinden"][0]["schluessel"]
		aufruf(ak.gemeinde_speichern, schluessel=s, daten={"name": "Screeningdorf", "bundesland": "Bayern", "bauleitplanung": "fnp"}, als_benutzer=self.akquise)
		with self.assertRaises(frappe.ValidationError):
			aufruf(ak.konkurrenz_anlegen, schluessel=s, daten={"entwickler": "X", "quelle": ""}, als_benutzer=self.akquise)
		aufruf(ak.konkurrenz_anlegen, schluessel=s, daten={"entwickler": "X", "status": "verfahren", "quelle": "Protokoll Test"}, als_benutzer=self.akquise)
		u = aufruf(ak.gemeinde_uebergeben, schluessel=s, daten={"terminAm": "2026-10-22T09:00"}, als_benutzer=self.akquise)
		self.assertTrue(frappe.db.exists("Plattform CRM Aktivitaet", u["aktivitaetId"]))
		with self.assertRaises(frappe.PermissionError):
			aufruf(ak.uebergabe_zuruecknehmen, schluessel=s, als_benutzer=self.akquise)
		aufruf(ak.uebergabe_zuruecknehmen, schluessel=s, als_benutzer=self.leitung)
		aufruf(ak.gemeinde_zuruecksetzen, schluessel=s, als_benutzer=self.leitung)
		self.assertFalse(frappe.db.exists("Plattform Gemeinde Potenzial", {"schluessel": s}))
