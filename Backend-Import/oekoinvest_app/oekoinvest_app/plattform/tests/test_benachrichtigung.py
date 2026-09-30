# Copyright (c) 2026, ÖkoInvest GmbH
# Benachrichtigungszentrale: Statuswechsel/Nachrichten → Glocke, Rechte, gelesen, E-Mail-Einstellungen, Suchprofil-Alarm.

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import benachrichtigung, konto, nachricht, prozess
from oekoinvest_app.plattform.tests.testdaten import aufruf, flaeche_vollstaendig, konto as konto_anlegen, projekt_veroeffentlicht, vorbereiten


class TestBenachrichtigung(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto_anlegen(["admin"])
		cls.eigentuemer = konto_anlegen(["flaeche"])
		cls.fremder = konto_anlegen(["flaeche"])
		cls.anbieter = konto_anlegen(["anbieter"])

	def tearDown(self):
		frappe.set_user("Administrator")

	def _eingereicht(self):
		f = flaeche_vollstaendig(self.eigentuemer)
		aufruf(prozess.status_wechsel, art="flaeche", id=f["id"], nach="eingegangen", als="eigentuemer", extra={}, als_benutzer=self.eigentuemer)
		return f["id"]

	def test_statuswechsel_erzeugt_benachrichtigung(self):
		fid = self._eingereicht()
		aufruf(prozess.status_wechsel, art="flaeche", id=fid, nach="vorpruefung", als="admin", extra={"kommentar": "Wir prüfen."}, als_benutzer=self.admin)
		r = aufruf(benachrichtigung.liste, als_benutzer=self.eigentuemer)
		b = next((x for x in r["eintraege"] if x["objektId"] == fid and x["art"] == "status"), None)
		self.assertIsNotNone(b)
		self.assertFalse(b["gelesen"])
		self.assertTrue(b["link"].startswith("/portal/flaechen/"))
		self.assertGreaterEqual(r["ungelesen"], 1)
		# Eigentümer-Schritt (Einreichen) meldet das Backoffice
		ra = aufruf(benachrichtigung.liste, limit=200, als_benutzer=self.admin)
		self.assertTrue(any(x["objektId"] == fid for x in ra["eintraege"]))

	def test_thread_lesen_markiert_gelesen(self):
		fid = self._eingereicht()
		aufruf(nachricht.senden, bezugArt="flaeche", bezugId=fid, text="Rückfrage vom Backoffice", als_benutzer=self.admin)
		aufruf(nachricht.liste, bezugArt="flaeche", bezugId=fid, markieren=True, als_benutzer=self.eigentuemer)
		r = aufruf(benachrichtigung.liste, limit=200, als_benutzer=self.eigentuemer)
		self.assertTrue(all(x["gelesen"] for x in r["eintraege"] if x["objektId"] == fid))

	def test_nur_eigene_markieren(self):
		fid = self._eingereicht()
		aufruf(prozess.status_wechsel, art="flaeche", id=fid, nach="vorpruefung", als="admin", extra={}, als_benutzer=self.admin)
		offen = [x for x in aufruf(benachrichtigung.liste, als_benutzer=self.eigentuemer)["eintraege"] if not x["gelesen"]]
		r = aufruf(benachrichtigung.gelesen, ids=[offen[0]["id"]], als_benutzer=self.fremder)
		self.assertEqual(r["geaendert"], 0)
		self.assertFalse(frappe.db.get_value("Plattform Benachrichtigung", offen[0]["id"], "gelesen"))
		r = aufruf(benachrichtigung.gelesen, alle=True, als_benutzer=self.eigentuemer)
		self.assertEqual(r["ungelesen"], 0)
		with self.assertRaises(frappe.ValidationError):
			aufruf(benachrichtigung.gelesen, als_benutzer=self.eigentuemer)

	def test_einstellungen_positivliste_und_ohne_mail(self):
		neu = aufruf(benachrichtigung.einstellungen_speichern, einstellungen={"status": False, "boese": True}, als_benutzer=self.eigentuemer)
		self.assertFalse(neu["status"])
		self.assertNotIn("boese", neu)
		fid = self._eingereicht()
		aufruf(prozess.status_wechsel, art="flaeche", id=fid, nach="vorpruefung", als="admin", extra={}, als_benutzer=self.admin)
		b = frappe.get_all("Plattform Benachrichtigung", filters={"nutzer_id": self.eigentuemer, "objekt_id": fid, "art": "status"}, fields=["mail"])
		self.assertTrue(b)
		self.assertFalse(any(x.mail for x in b))
		aufruf(benachrichtigung.einstellungen_speichern, einstellungen={"status": True}, als_benutzer=self.eigentuemer)

	def test_link_nur_intern(self):
		from oekoinvest_app.plattform.benachrichtigung import anlegen

		frappe.set_user("Administrator")
		b = anlegen(self.eigentuemer, "nachricht", "Test", "Text", "https://boese.example/phish")
		self.assertEqual(b.link, "/portal")

	def test_suchprofil_alarm_mit_schwelle(self):
		passend = konto_anlegen(["investor"])
		streng = konto_anlegen(["investor"])
		aufruf(konto.suchprofil_speichern, profil={"typen": ["freiflaeche"], "laender": ["DE"], "benachrichtigen": True, "schwelle": 70}, als_benutzer=passend)
		sp = aufruf(konto.suchprofil_speichern, profil={"typen": ["speicher"], "laender": ["CH"], "phasen": ["cod"], "benachrichtigen": True, "schwelle": 100}, als_benutzer=streng)
		self.assertEqual(sp["schwelle"], 100)
		pid = projekt_veroeffentlicht(self.anbieter, self.admin)
		self.assertTrue(frappe.db.exists("Plattform Benachrichtigung", {"nutzer_id": passend, "art": "suchprofil", "objekt_id": pid}))
		self.assertFalse(frappe.db.exists("Plattform Benachrichtigung", {"nutzer_id": streng, "art": "suchprofil", "objekt_id": pid}))

	def test_schwelle_ausserhalb_standard(self):
		inv = konto_anlegen(["investor"])
		sp = aufruf(konto.suchprofil_speichern, profil={"benachrichtigen": True, "schwelle": 10}, als_benutzer=inv)
		self.assertEqual(sp["schwelle"], 70)
