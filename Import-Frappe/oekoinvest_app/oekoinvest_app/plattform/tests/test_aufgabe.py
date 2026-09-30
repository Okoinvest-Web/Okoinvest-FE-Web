# Copyright (c) 2026, ÖkoInvest GmbH
# Backoffice-Aufgaben & Wiedervorlagen: Rechte, Validierung, Zuweisung mit Benachrichtigung, Erinnerung, Protokoll, Cockpit.

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from oekoinvest_app.plattform.api import admin, aufgabe, benachrichtigung
from oekoinvest_app.plattform.aufgaben import wiedervorlagen_fuer
from oekoinvest_app.plattform.tests.testdaten import aufruf, flaeche_vollstaendig, konto, vorbereiten


class TestAufgabe(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.kollege = konto(["admin"])
		cls.eigentuemer = konto(["flaeche"])

	def tearDown(self):
		frappe.set_user("Administrator")

	def _neu(self, **extra):
		daten = {"titel": "Rückruf Eigentümer (Test)", "faelligAm": str(add_days(nowdate(), -1)), **extra}
		return aufruf(aufgabe.anlegen, daten=daten, als_benutzer=self.admin)

	def test_nur_backoffice(self):
		with self.assertRaises(frappe.PermissionError):
			aufruf(aufgabe.anlegen, daten={"titel": "Nicht erlaubt", "faelligAm": nowdate()}, als_benutzer=self.eigentuemer)
		with self.assertRaises(frappe.PermissionError):
			aufruf(aufgabe.liste, als_benutzer=self.eigentuemer)

	def test_validierung(self):
		with self.assertRaises(frappe.ValidationError):
			aufruf(aufgabe.anlegen, daten={"titel": "Ohne Datum", "faelligAm": "2026-02-31"}, als_benutzer=self.admin)
		with self.assertRaises(frappe.ValidationError):
			aufruf(aufgabe.anlegen, daten={"titel": "Falscher Zuständiger", "faelligAm": nowdate(), "zustaendigId": self.eigentuemer}, als_benutzer=self.admin)
		with self.assertRaises(frappe.DoesNotExistError):
			aufruf(aufgabe.anlegen, daten={"titel": "Bezug fehlt", "faelligAm": nowdate(), "bezugArt": "projekt", "bezugId": "P-26-ZZZZZZ"}, als_benutzer=self.admin)

	def test_am_objekt_ueberfaellig_und_protokoll(self):
		f = flaeche_vollstaendig(self.eigentuemer)
		a = self._neu(bezugArt="flaeche", bezugId=f["id"])
		self.assertTrue(a["ueberfaellig"])
		self.assertEqual(a["bezugLink"], f"/portal/flaechen/{f['id']}")
		liste = aufruf(aufgabe.liste, bezugArt="flaeche", bezugId=f["id"], als_benutzer=self.admin)
		self.assertEqual([x["id"] for x in liste], [a["id"]])
		feed = aufruf(admin.aktivitaeten, objektId=f["id"], als_benutzer=self.admin)
		self.assertTrue(any(x["aktion"] == "aufgabe" for x in feed))
		u = aufruf(admin.uebersicht, als_benutzer=self.admin)
		self.assertGreaterEqual(u["aufgaben"]["meineUeberfaellig"], 1)

	def test_zuweisen_benachrichtigt_und_erledigen(self):
		a = self._neu()
		a = aufruf(aufgabe.aendern, id=a["id"], daten={"zustaendigId": self.kollege, "faelligAm": str(add_days(nowdate(), 2))}, als_benutzer=self.admin)
		self.assertEqual(a["zustaendigId"], self.kollege)
		self.assertFalse(a["ueberfaellig"])
		r = aufruf(benachrichtigung.liste, als_benutzer=self.kollege)
		self.assertTrue(any(x["art"] == "aufgabe" and "Rückruf Eigentümer" in x["titel"] for x in r["eintraege"]))
		a = aufruf(aufgabe.aendern, id=a["id"], daten={"status": "erledigt"}, als_benutzer=self.kollege)
		self.assertEqual(a["status"], "erledigt")
		self.assertTrue(a["erledigtAm"])
		meine = aufruf(aufgabe.liste, zustaendigId=self.kollege, status="offen", als_benutzer=self.kollege)
		self.assertNotIn(a["id"], [x["id"] for x in meine])
		with self.assertRaises(frappe.ValidationError):
			aufruf(aufgabe.aendern, id=a["id"], daten={"status": "unklar"}, als_benutzer=self.kollege)

	def test_wiedervorlage_einmal_erinnern(self):
		a = self._neu(titel="Wiedervorlage (Test)")
		frappe.set_user("Administrator")
		self.assertGreaterEqual(wiedervorlagen_fuer(self.admin), 1)
		self.assertEqual(wiedervorlagen_fuer(self.admin), 0)  # nur einmal je Fälligkeit
		self.assertTrue(frappe.db.exists("Plattform Benachrichtigung", {"nutzer_id": self.admin, "art": "aufgabe", "titel": "Wiedervorlage fällig: Wiedervorlage (Test)"}))
		self.assertTrue(frappe.db.get_value("Plattform Aufgabe", a["id"], "erinnert_am"))
