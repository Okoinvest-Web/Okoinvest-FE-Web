# Copyright (c) 2026, ÖkoInvest GmbH
# Grundbuch & Closing (plattform/api/closing.py): Schrittfolge über die API (409/422), Eigentümer sieht nur eigene Akte,
# Unterrollen, Closing nur mit KYC beider Seiten, CP melden nur in eigener Verantwortung, fremde → 403.
# Spiegel von scripts/plattform-test-closing.mjs (dort zusätzlich Provision/Rechnung und PDFs im Demo-Backend).

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import closing, prozess
from oekoinvest_app.plattform.tests.testdaten import aufruf, interesse_mit_datenraum, konto, projekt_veroeffentlicht, vorbereiten


class TestGrundbuch(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.buchhaltung = konto(["admin"], vorname="Buchhaltung")
		frappe.db.set_value("Plattform Konto", cls.buchhaltung, "backoffice_rollen", "buchhaltung")
		cls.eigentuemer = konto(["flaeche"], vorname="Eigentuemer")
		cls.fremd = konto(["flaeche"], vorname="Fremd")
		email = frappe.db.get_value("Plattform Konto", cls.eigentuemer, "email")
		a = aufruf(closing.gb_anlegen, daten={"bezugArt": "frei", "titel": "Testakte DE", "eigentuemerName": "Test Eigentümer", "eigentuemerEmail": email, "land": "DE", "pfandglaeubiger": [{"name": "Testbank eG"}]}, als_benutzer=cls.admin)
		cls.gid = a["id"]

	def tearDown(self):
		frappe.set_user("Administrator")

	def schritt(self, als, **d):
		return aufruf(closing.gb_schritt, id=self.gid, daten=d, als_benutzer=als)

	def test_reihenfolge_und_rechte(self):
		with self.assertRaises(frappe.DuplicateEntryError):
			self.schritt(self.admin, schluessel="eintragung", status="erledigt", nachweisWert="Abt. II Nr. 1")
		with self.assertRaises(frappe.PermissionError):
			self.schritt(self.buchhaltung, schluessel="vertrag", status="erledigt")
		for s in ("vertrag", "unterschrift", "beglaubigung"):
			self.schritt(self.admin, schluessel=s, status="erledigt")
		with self.assertRaises(frappe.ValidationError):
			self.schritt(self.admin, schluessel="antrag", status="erledigt")
		r = self.schritt(self.admin, schluessel="antrag", status="erledigt", nachweisWert="Az. 1/2026")
		self.assertEqual(r["status"], "eingereicht")
		with self.assertRaises(frappe.DuplicateEntryError):
			self.schritt(self.admin, schluessel="eintragung", status="erledigt", nachweisWert="Abt. II Nr. 1")
		self.schritt(self.admin, schluessel="rang", status="erledigt", nachweisWert="Rangrücktritt Testbank")
		r = self.schritt(self.admin, schluessel="eintragung", status="erledigt", nachweisWert="Abt. II Nr. 1")
		self.assertEqual(r["status"], "eingetragen")

	def test_eigentuemer_sicht(self):
		meine = aufruf(closing.gb_meine, als_benutzer=self.eigentuemer)["akten"]
		self.assertEqual([a["id"] for a in meine], [self.gid])
		a = aufruf(closing.gb_akte, id=self.gid, als_benutzer=self.eigentuemer)
		self.assertTrue(all(s["text"] is None and s["portal"] for s in a["schritte"]))
		self.assertIsNone(a["eigentuemerId"])
		with self.assertRaises(frappe.PermissionError):
			aufruf(closing.gb_akte, id=self.gid, als_benutzer=self.fremd)
		with self.assertRaises(frappe.PermissionError):
			aufruf(closing.gb_liste, als_benutzer=self.fremd)


class TestClosing(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.anbieter = konto(["anbieter"], vorname="Anbieter")
		cls.investor = konto(["investor"], vorname="Investor")
		cls.fremd = konto(["investor"], vorname="Fremd")
		cls.pid = projekt_veroeffentlicht(cls.anbieter, cls.admin)
		cls.iid = interesse_mit_datenraum(cls.investor, cls.admin, cls.pid)
		aufruf(prozess.status_wechsel, art="interesse", id=cls.iid, nach="loi_abgegeben", als="eigentuemer", extra={"loi": {"betrag": 500000, "text": "Indikatives Angebot aus dem Test."}}, als_benutzer=cls.investor)
		aufruf(prozess.status_wechsel, art="interesse", id=cls.iid, nach="loi_angenommen", als="admin", extra={}, als_benutzer=cls.admin)
		cls.c = aufruf(closing.cl_anlegen, daten={"projektId": cls.pid, "interesseId": cls.iid, "struktur": "share"}, als_benutzer=cls.admin)

	def tearDown(self):
		frappe.set_user("Administrator")

	def test_kyc_pflicht_und_rechte(self):
		self.assertEqual(self.c["kaufpreis"], 500000)
		k = aufruf(closing.cl_akte, id=self.c["id"], als_benutzer=self.investor)
		self.assertEqual(k["meineRolle"], "kaeufer")
		self.assertTrue(k["verkaeufer"]["anonym"])
		self.assertIsNone(k["provision"])
		with self.assertRaises(frappe.PermissionError):
			aufruf(closing.cl_akte, id=self.c["id"], als_benutzer=self.fremd)
		for s in ("bonitaet", "finanzierung", "gremien", "dd", "spa"):
			aufruf(closing.cl_aktion, id=self.c["id"], daten={"aktion": "signing_punkt", "schluessel": s, "erledigt": True}, als_benutzer=self.admin)
		with self.assertRaises(frappe.ValidationError):  # KycErforderlich (409, Website-Code „kyc“) – Testkonten sind nicht verifiziert
			aufruf(closing.cl_aktion, id=self.c["id"], daten={"aktion": "signing"}, als_benutzer=self.admin)
		fremde_cp = next(x for x in k["cps"] if x["verantwortlich"] == "verkaeufer")
		with self.assertRaises(frappe.PermissionError):
			aufruf(closing.cl_portal_aktion, id=self.c["id"], daten={"aktion": "cp_melden", "schluessel": fremde_cp["schluessel"], "nachweis": "Test-Nachweis"}, als_benutzer=self.investor)
		r = aufruf(closing.cl_portal_aktion, id=self.c["id"], daten={"aktion": "cp_melden", "schluessel": fremde_cp["schluessel"], "nachweis": "Test-Nachweis Verkäufer"}, als_benutzer=self.anbieter)
		self.assertEqual(next(x for x in r["cps"] if x["schluessel"] == fremde_cp["schluessel"])["status"], "gemeldet")
		with self.assertRaises(frappe.ValidationError):  # vor Signing und ohne KYC → 409
			aufruf(closing.cl_aktion, id=self.c["id"], daten={"aktion": "closing"}, als_benutzer=self.admin)
