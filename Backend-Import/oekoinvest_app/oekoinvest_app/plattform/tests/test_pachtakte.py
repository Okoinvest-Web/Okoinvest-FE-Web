# Copyright (c) 2026, ÖkoInvest GmbH
# Pachtakte (Team 1) auf der Bench: Rechte (nur eigene Verträge, Backoffice-Bereich „pachtakte“), Anliegen mit Wirkung
# (Kündigung → gekündigt, Eigentümerwechsel → neues Konto), Rückbau bis Abnahme, Sicherheit erst danach freigeben,
# Vertragsende, Jahresbescheinigung nur mit Gutschriften.
#   bench --site <test-site> run-tests --module oekoinvest_app.plattform.tests.test_pachtakte
# Reine Regeln ohne Frappe: tests/test_pachtakte_kern.py (python -m unittest).

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import finanzen as fin
from oekoinvest_app.plattform.api import pachtakte as api
from oekoinvest_app.plattform.tests.testdaten import aufruf, konto, vorbereiten


class TestPachtakte(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.eigentuemer = konto(["flaeche"])
		cls.erbe = konto(["landwirt"])
		cls.fremder = konto(["flaeche"])
		cls.transaktion = konto(["admin"])
		frappe.db.set_value("Plattform Konto", cls.transaktion, "backoffice_rollen", "transaktion")

	def _vertrag(self, **extra):
		return aufruf(fin.pachtvertrag_speichern, daten={
			"eigentuemerId": self.eigentuemer, "bezeichnung": "Testpacht Pachtakte", "land": "DE", "flaecheHa": 5, "modell": "fest", "pachtJahr": 10000,
			"vertragsdatum": "2024-01-01", "beginnArt": "inbetriebnahme", "beginn": "2024-07-01", "laufzeitJahre": 20, "faelligkeit": "jaehrlich", "zahlweise": "vorschuessig", "status": "aktiv", **extra,
		}, als_benutzer=self.admin)

	def tearDown(self):
		frappe.set_user("Administrator")

	def test_rechte(self):
		v = self._vertrag()
		m = aufruf(api.meine, als_benutzer=self.eigentuemer)
		self.assertIn(v["id"], [x["vertrag"]["id"] for x in m["vertraege"]])
		self.assertNotIn(v["id"], [x["vertrag"]["id"] for x in aufruf(api.meine, als_benutzer=self.fremder)["vertraege"]])
		with self.assertRaises(frappe.PermissionError):
			aufruf(api.anliegen_anlegen, vertragId=v["id"], art="verlaengerung", daten={"wunsch": "gespraech"}, als_benutzer=self.fremder)
		self.assertTrue(aufruf(api.backoffice, als_benutzer=self.transaktion)["vertraege"])  # lesen
		a = aufruf(api.anliegen_anlegen, vertragId=v["id"], art="verlaengerung", daten={"wunsch": "gespraech"}, als_benutzer=self.eigentuemer)
		with self.assertRaises(frappe.PermissionError):  # Transaktion: nur lesen
			aufruf(api.anliegen_aktion, id=a["id"], eingabe={"nach": "in_pruefung"}, als_benutzer=self.transaktion)
		with self.assertRaises(frappe.DuplicateEntryError):  # gleiches Anliegen doppelt
			aufruf(api.anliegen_anlegen, vertragId=v["id"], art="verlaengerung", daten={"wunsch": "gespraech"}, als_benutzer=self.eigentuemer)

	def test_kuendigung_und_rueckbau(self):
		v = self._vertrag()
		a = aufruf(api.anliegen_anlegen, vertragId=v["id"], art="kuendigung", daten={"grund": "einvernehmlich", "zumDatum": "2030-12-31"}, als_benutzer=self.eigentuemer)
		aufruf(api.anliegen_aktion, id=a["id"], eingabe={"nach": "in_pruefung"}, als_benutzer=self.admin)
		e = aufruf(api.anliegen_aktion, id=a["id"], eingabe={"nach": "erledigt", "kommentar": "Aufhebung vereinbart"}, als_benutzer=self.admin)
		self.assertEqual(e["status"], "erledigt")
		self.assertEqual(frappe.db.get_value("Plattform Pachtvertrag", v["id"], "status"), "gekuendigt")
		with self.assertRaises(frappe.PermissionError):  # Eigentümer darf Sicherheit nicht setzen
			aufruf(api.rueckbau_aktion, vertragId=v["id"], eingabe={"ziel": "sicherheit", "nach": "hinterlegt"}, als_benutzer=self.eigentuemer)
		aufruf(api.rueckbau_aktion, vertragId=v["id"], eingabe={"ziel": "sicherheit", "nach": "hinterlegt", "art": "buergschaft", "betrag": 90000, "geber": "Testbank", "hinterlegtAm": "2024-06-01"}, als_benutzer=self.admin)
		for nach, termin in (("angekuendigt", "2031-01-15"), ("laufend", None), ("abnahme_bereit", "2031-03-01")):
			aufruf(api.rueckbau_aktion, vertragId=v["id"], eingabe={"ziel": "rueckbau", "nach": nach, "termin": termin}, als_benutzer=self.admin)
		with self.assertRaises(frappe.DuplicateEntryError):  # Freigabe vor Abnahme
			aufruf(api.rueckbau_aktion, vertragId=v["id"], eingabe={"ziel": "sicherheit", "nach": "freigegeben", "kommentar": "zu früh"}, als_benutzer=self.admin)
		aufruf(api.rueckbau_aktion, vertragId=v["id"], eingabe={"nach": "abgenommen"}, als_benutzer=self.eigentuemer)
		aufruf(api.rueckbau_aktion, vertragId=v["id"], eingabe={"ziel": "sicherheit", "nach": "freigegeben", "kommentar": "Urkunde zurück"}, als_benutzer=self.admin)
		aufruf(api.rueckbau_aktion, vertragId=v["id"], eingabe={"ziel": "vertrag", "nach": "beendet", "kommentar": "Löschungsbewilligung erteilt"}, als_benutzer=self.admin)
		self.assertEqual(frappe.db.get_value("Plattform Pachtvertrag", v["id"], "status"), "beendet")

	def test_eigentuemerwechsel(self):
		v = self._vertrag(bezeichnung="Testpacht Wechsel")
		a = aufruf(api.anliegen_anlegen, vertragId=v["id"], art="eigentuemerwechsel", daten={"anlass": "hofuebergabe", "stichtag": "2026-11-01", "erwerber": {"name": "Hofnachfolge"}}, als_benutzer=self.eigentuemer)
		aufruf(api.anliegen_aktion, id=a["id"], eingabe={"nach": "in_pruefung"}, als_benutzer=self.admin)
		aufruf(api.anliegen_aktion, id=a["id"], eingabe={"nach": "erledigt", "kommentar": "Übergabevertrag geprüft", "neuesKontoId": self.erbe}, als_benutzer=self.admin)
		self.assertEqual(frappe.db.get_value("Plattform Pachtvertrag", v["id"], "eigentuemer_id"), self.erbe)
		alt = aufruf(api.meine, als_benutzer=self.eigentuemer)
		self.assertIn(v["id"], [x["id"] for x in alt["frueher"]])
		self.assertIn(v["id"], [x["vertrag"]["id"] for x in aufruf(api.meine, als_benutzer=self.erbe)["vertraege"]])

	def test_jahresbescheinigung_ohne_belege(self):
		with self.assertRaises(frappe.DoesNotExistError):
			aufruf(api.jahresbescheinigung, jahr=1999, als_benutzer=self.eigentuemer)
