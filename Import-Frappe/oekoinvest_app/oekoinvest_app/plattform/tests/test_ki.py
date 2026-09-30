# Copyright (c) 2026, ÖkoInvest GmbH
# KI-Nutzungsprotokoll: nur Metadaten, append-only, Zählung je Konto und Tag, Kontingent aus site_config.

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import ki
from oekoinvest_app.plattform.tests.testdaten import aufruf, konto, vorbereiten


class TestKiNutzung(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.konto = konto(["flaeche"])
		cls.anderes = konto(["investor"])

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.local.conf.pop("oekoinvest_ki_tageskontingent", None)

	def test_protokoll_und_zaehlung_je_konto(self):
		vorher = aufruf(ki.nutzung_heute, als_benutzer=self.konto)["anzahl"]
		aufruf(ki.nutzung_protokollieren, fall="flaeche", modus="regel", objektArt="flaeche", objektId="F-26-TEST01", als_benutzer=self.konto)
		aufruf(ki.nutzung_protokollieren, fall="nachricht", modus="ki", tokensEin=1200, tokensAus=300, als_benutzer=self.konto)
		self.assertEqual(aufruf(ki.nutzung_heute, als_benutzer=self.konto)["anzahl"], vorher + 2)
		self.assertEqual(aufruf(ki.nutzung_heute, als_benutzer=self.anderes)["anzahl"], 0)

	def test_keine_inhalte_und_unbekannte_faelle(self):
		aufruf(ki.nutzung_protokollieren, fall="frage", modus="regel", frage="GEHEIM", text="GEHEIM", als_benutzer=self.konto)
		doc = frappe.get_last_doc("Plattform KI Nutzung", filters={"nutzer_id": self.konto, "anwendungsfall": "frage"})
		self.assertNotIn("GEHEIM", frappe.as_json(doc.as_dict()))
		with self.assertRaises(frappe.ValidationError):
			aufruf(ki.nutzung_protokollieren, fall="unbekannt", modus="ki", als_benutzer=self.konto)

	def test_append_only(self):
		aufruf(ki.nutzung_protokollieren, fall="expose", modus="regel", als_benutzer=self.konto)
		frappe.set_user("Administrator")
		doc = frappe.get_last_doc("Plattform KI Nutzung", filters={"nutzer_id": self.konto})
		doc.modus = "ki"
		with self.assertRaises(frappe.PermissionError):
			doc.save(ignore_permissions=True)
		with self.assertRaises(frappe.PermissionError):
			frappe.delete_doc("Plattform KI Nutzung", doc.name, ignore_permissions=True, force=True)

	def test_kontingent_aus_site_config(self):
		frappe.local.conf.oekoinvest_ki_tageskontingent = 7
		self.assertEqual(aufruf(ki.nutzung_heute, als_benutzer=self.konto)["limit"], 7)
