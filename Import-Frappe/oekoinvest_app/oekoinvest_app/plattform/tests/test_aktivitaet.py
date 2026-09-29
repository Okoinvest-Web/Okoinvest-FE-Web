# Copyright (c) 2026, ÖkoInvest GmbH
# Aktivitätsprotokoll: append-only (kein Update, kein Delete – auch nicht als Administrator).

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import admin
from oekoinvest_app.plattform.kern import protokoll
from oekoinvest_app.plattform.tests.testdaten import aufruf, konto, vorbereiten


class TestAktivitaet(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])

	def tearDown(self):
		frappe.set_user("Administrator")

	def _eintrag(self):
		frappe.set_user("Administrator")
		protokoll(frappe._dict(id=self.admin), "test", "nutzer", self.admin, "Testeintrag", "127.0.0.1")
		return frappe.get_all("Plattform Aktivitaet", filters={"aktion": "test", "objekt_id": self.admin}, pluck="name", order_by="creation desc", limit=1)[0]

	def test_anlegen_erlaubt(self):
		name = self._eintrag()
		doc = frappe.get_doc("Plattform Aktivitaet", name)
		self.assertTrue(doc.name.startswith("A-"))
		self.assertEqual(doc.text, "Testeintrag")

	def test_aendern_verboten(self):
		doc = frappe.get_doc("Plattform Aktivitaet", self._eintrag())
		doc.text = "manipuliert"
		with self.assertRaises(frappe.PermissionError):
			doc.save(ignore_permissions=True)
		self.assertEqual(frappe.db.get_value("Plattform Aktivitaet", doc.name, "text"), "Testeintrag")

	def test_loeschen_verboten(self):
		name = self._eintrag()
		with self.assertRaises(frappe.PermissionError):
			frappe.delete_doc("Plattform Aktivitaet", name, ignore_permissions=True, force=True)
		self.assertTrue(frappe.db.exists("Plattform Aktivitaet", name))

	def test_umbenennen_verboten(self):
		name = self._eintrag()
		# je nach Frappe-Version greift zuerst die Rechteprüfung (Rename nicht erlaubt) oder der Controller
		with self.assertRaises((frappe.PermissionError, frappe.ValidationError)):
			frappe.rename_doc("Plattform Aktivitaet", name, "A-99-ZZZZZZ", force=True)
		self.assertTrue(frappe.db.exists("Plattform Aktivitaet", name))

	def test_registrierung_und_statuswechsel_werden_protokolliert(self):
		kid = konto(["investor"])
		self.assertTrue(frappe.db.exists("Plattform Aktivitaet", {"aktion": "registrierung", "objekt_id": kid}))
		liste = aufruf(admin.aktivitaeten, limit=5, objektId=kid, als_benutzer=self.admin)
		self.assertTrue(liste)
		self.assertEqual(liste[0]["objektId"], kid)
		self.assertIn("nutzer", liste[0])
