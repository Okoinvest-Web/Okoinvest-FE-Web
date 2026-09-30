# Copyright (c) 2026, ÖkoInvest GmbH
# Kundenseite Energie (API, bench run-tests): Rollen- und Eigentumsprüfung, Anliegen nur eigene, Störungsmeldung nur eigene Anlage,
# Vertragsdaten nur für den bezuschlagten Versorger, Kostenbericht nur für Unternehmen. Spiegel von Teil B in
# scripts/plattform-test-energiekunde.mjs (reine Logik: test_kundenenergie_kern.py).

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import kundenenergie as ke
from oekoinvest_app.plattform.tests.testdaten import aufruf, konto, vorbereiten


class TestKundenenergie(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.kunde = konto(["unternehmen"])
		cls.fremd = konto(["unternehmen"])
		cls.flaeche = konto(["flaeche"])

	def test_rollen(self):
		self.assertEqual(aufruf(ke.anliegen_liste, als_benutzer=self.kunde), [])
		with self.assertRaises(frappe.PermissionError):
			aufruf(ke.anliegen_liste, als_benutzer=self.flaeche)
		with self.assertRaises(frappe.PermissionError):
			aufruf(ke.kostenbericht, als_benutzer=self.flaeche)
		with self.assertRaises(frappe.PermissionError):
			aufruf(ke.anliegen_anlegen, daten={"art": "einspruch"}, als_benutzer=self.admin)

	def test_eingaben(self):
		with self.assertRaises(frappe.ValidationError):
			aufruf(ke.anliegen_anlegen, daten={"art": "unbekannt"}, als_benutzer=self.kunde)
		with self.assertRaises((frappe.DoesNotExistError, frappe.ValidationError)):
			aufruf(ke.anliegen_anlegen, daten={"art": "einspruch", "belegId": "CR-26-XXXXXX"}, als_benutzer=self.kunde)
		with self.assertRaises((frappe.DoesNotExistError, frappe.PermissionError, frappe.ValidationError)):
			aufruf(ke.stoerung_melden, daten={"anlageId": "AL-26-XXXXXX", "titel": "Wechselrichter aus"}, als_benutzer=self.kunde)
		with self.assertRaises((frappe.DoesNotExistError, frappe.ValidationError)):
			aufruf(ke.vertragsdaten, ausschreibung_id="EA-26-XXXXXX", als_benutzer=self.kunde)

	def test_kostenbericht(self):
		r = aufruf(ke.kostenbericht, jahr=2026, als_benutzer=self.kunde)
		self.assertEqual(len(r["monate"]), 12)
		self.assertEqual(r["summe"]["gesamtEur"], 0)
		self.assertTrue(r["hinweise"])

	def test_wechsel_leer(self):
		self.assertEqual(aufruf(ke.wechsel_liste, als_benutzer=self.kunde), [])
		self.assertIsInstance(aufruf(ke.wechsel_liste, als_benutzer=self.admin), list)
