# Copyright (c) 2026, ÖkoInvest GmbH
# Bedienung & Onboarding: Suche liefert nur Berechtigtes (fremde Objekte nie), Onboarding-Zustand am Konto.

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import bedienung
from oekoinvest_app.plattform.tests.testdaten import aufruf, flaeche_vollstaendig, konto, projekt_veroeffentlicht, vorbereiten


class TestBedienung(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.eigentuemer = konto(["flaeche"])
		cls.fremder = konto(["flaeche"])
		cls.investor = konto(["investor"])
		cls.anbieter = konto(["anbieter"])
		cls.flaeche = flaeche_vollstaendig(cls.eigentuemer)["id"]
		cls.projekt = projekt_veroeffentlicht(cls.anbieter, cls.admin)

	def tearDown(self):
		frappe.set_user("Administrator")

	def _suche(self, q, wer):
		return aufruf(bedienung.suchen, q=q, als_benutzer=wer)["treffer"]

	def test_eigene_flaeche_gefunden(self):
		t = self._suche("Acker Waldrand", self.eigentuemer)
		self.assertTrue(any(x["id"] == self.flaeche and x["href"] == f"/portal/flaechen/{self.flaeche}" for x in t))

	def test_fremde_flaeche_nie(self):
		t = self._suche("Acker Waldrand", self.fremder)
		self.assertFalse(any(x["id"] == self.flaeche for x in t))
		self.assertFalse(any(x["art"] == "nutzer" for x in t))

	def test_boerse_nur_fuer_investoren(self):
		self.assertTrue(any(x["art"] == "boerse" and x["id"] == self.projekt for x in self._suche("Süddeutschland", self.investor)))
		self.assertFalse(any(x["art"] == "boerse" for x in self._suche("Süddeutschland", self.eigentuemer)))

	def test_backoffice_sieht_alles(self):
		t = self._suche("Waldrand", self.admin)
		self.assertTrue(any(x["id"] == self.flaeche for x in t))

	def test_kurze_anfrage_und_nur_portal_pfade(self):
		self.assertEqual(self._suche("a", self.admin), [])
		for x in self._suche("Test", self.admin):
			self.assertTrue(x["href"].startswith("/portal"))
			self.assertNotIn("felder", x)

	def test_onboarding_zustand(self):
		z = aufruf(bedienung.onboarding, als_benutzer=self.eigentuemer)
		self.assertEqual(z["status"], "neu")
		z = aufruf(bedienung.onboarding_speichern, daten={"status": "laufend", "schritt": 2, "erledigt": ["profil", "unsinn"]}, als_benutzer=self.eigentuemer)
		self.assertEqual((z["status"], z["schritt"], z["erledigt"]), ("laufend", 2, ["profil"]))
		z = aufruf(bedienung.onboarding_speichern, daten={"status": "erledigt", "erledigt": ["benachrichtigungen"], "schritt": 99}, als_benutzer=self.eigentuemer)
		self.assertEqual((z["status"], z["schritt"], z["erledigt"]), ("erledigt", 2, ["profil", "benachrichtigungen"]))
		z = aufruf(bedienung.onboarding_speichern, daten={"status": "neu"}, als_benutzer=self.eigentuemer)
		self.assertEqual(z["status"], "erledigt")
		# anderes Konto unberührt
		self.assertEqual(aufruf(bedienung.onboarding, als_benutzer=self.fremder)["status"], "neu")

	def test_ohne_nutzer_nicht_angemeldet(self):
		with self.assertRaises(frappe.AuthenticationError):
			aufruf(bedienung.suchen, q="Acker")
		with self.assertRaises(frappe.AuthenticationError):
			aufruf(bedienung.onboarding_speichern, daten={"status": "erledigt"})
