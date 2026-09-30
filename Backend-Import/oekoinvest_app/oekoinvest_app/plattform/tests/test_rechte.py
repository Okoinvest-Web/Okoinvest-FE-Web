# Copyright (c) 2026, ÖkoInvest GmbH
# Rechte: API-Rolle, Rolle UND Eigentum, Backoffice-Funktionen, Sperre, öffentliche Positivliste, Datenraum.

import base64

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import admin, auth, boerse, dokument, flaeche, nachricht, projekt, prozess
from oekoinvest_app.plattform.oeffentlich import OEFFENTLICH
from oekoinvest_app.plattform.tests.testdaten import (
	PASSWORT,
	PDF,
	aufruf,
	flaeche_vollstaendig,
	interesse_mit_datenraum,
	konto,
	projekt_veroeffentlicht,
	vorbereiten,
)


class TestRechte(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.eigentuemer = konto(["flaeche"])
		cls.fremder = konto(["flaeche"])
		cls.anbieter = konto(["anbieter"])
		cls.investor = konto(["investor"])

	def tearDown(self):
		frappe.set_user("Administrator")

	# ------------------------------------------------------------ Aufrufer

	def test_ohne_api_rolle_kein_zugriff(self):
		frappe.set_user("Guest")
		with self.assertRaises(frappe.PermissionError):
			auth.anmelden(email="x@example.com", passwort="egal-egal-1")
		email = frappe.db.get_value("Plattform Konto", self.eigentuemer, "user")
		frappe.set_user(email)  # ein Portal-Nutzer selbst darf die API nicht direkt aufrufen
		with self.assertRaises(frappe.PermissionError):
			flaeche.liste(als_benutzer=self.eigentuemer)

	def test_ohne_als_benutzer_nicht_angemeldet(self):
		with self.assertRaises(frappe.AuthenticationError):
			aufruf(flaeche.liste)

	def test_anmelden(self):
		email = frappe.db.get_value("Plattform Konto", self.eigentuemer, "email")
		self.assertIsNone(aufruf(auth.anmelden, email=email, passwort="falsch-falsch-1"))
		self.assertIsNone(aufruf(auth.anmelden, email="gibt-es-nicht@example.com", passwort=PASSWORT))
		k = aufruf(auth.anmelden, email=email, passwort=PASSWORT)
		self.assertEqual(k["id"], self.eigentuemer)
		self.assertNotIn("passwort", str(k).lower())

	def test_admin_rolle_nie_selbst_waehlbar(self):
		with self.assertRaises(frappe.ValidationError):
			aufruf(
				auth.registrieren,
				email=f"admin-{frappe.generate_hash(length=6).lower()}@example.com",
				passwort=PASSWORT,
				vorname="Böse",
				nachname="(Test)",
				rollen=["admin"],
				basisUrl="",
				ip="",
			)

	def test_email_vergeben_ist_409(self):
		email = frappe.db.get_value("Plattform Konto", self.eigentuemer, "email")
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(auth.registrieren, email=email, passwort=PASSWORT, vorname="A", nachname="B", rollen=["flaeche"], basisUrl="", ip="")

	# ------------------------------------------------------------ Eigentum

	def test_fremde_flaeche_permission_error(self):
		f = flaeche_vollstaendig(self.eigentuemer)
		with self.assertRaises(frappe.PermissionError):
			aufruf(flaeche.holen, id=f["id"], als_benutzer=self.fremder)
		with self.assertRaises(frappe.PermissionError):
			aufruf(flaeche.aendern, id=f["id"], daten={"bezeichnung": "Gekapert"}, als_benutzer=self.fremder)
		with self.assertRaises(frappe.PermissionError):
			aufruf(prozess.status_wechsel, art="flaeche", id=f["id"], nach="eingegangen", als="eigentuemer", extra={}, als_benutzer=self.fremder)
		with self.assertRaises(frappe.PermissionError):
			aufruf(nachricht.liste, bezugArt="flaeche", bezugId=f["id"], als_benutzer=self.fremder)
		with self.assertRaises(frappe.PermissionError):
			aufruf(nachricht.senden, bezugArt="flaeche", bezugId=f["id"], text="Hallo", als_benutzer=self.fremder)
		with self.assertRaises(frappe.PermissionError):
			aufruf(
				dokument.speichern,
				bezugArt="flaeche",
				bezugId=f["id"],
				name="plan.pdf",
				mime="application/pdf",
				kategorie="plan",
				inhaltBase64=base64.b64encode(PDF).decode(),
				als_benutzer=self.fremder,
			)
		# fremde Flächen tauchen in der eigenen Liste nicht auf
		self.assertNotIn(f["id"], [x["id"] for x in aufruf(flaeche.liste, als_benutzer=self.fremder)])
		# Eigentümer und Backoffice dürfen
		self.assertEqual(aufruf(flaeche.holen, id=f["id"], als_benutzer=self.eigentuemer)["id"], f["id"])
		self.assertIn("eigentuemer", aufruf(flaeche.holen, id=f["id"], als_benutzer=self.admin))

	def test_admin_als_eigentuemer_nur_bei_eigentum(self):
		f = flaeche_vollstaendig(self.eigentuemer)
		with self.assertRaises(frappe.PermissionError):
			aufruf(prozess.status_wechsel, art="flaeche", id=f["id"], nach="eingegangen", als="eigentuemer", extra={}, als_benutzer=self.admin)

	def test_eigentuemer_darf_keine_admin_schritte(self):
		f = flaeche_vollstaendig(self.eigentuemer)
		with self.assertRaises(frappe.PermissionError):
			aufruf(prozess.status_wechsel, art="flaeche", id=f["id"], nach="eingegangen", als="admin", extra={}, als_benutzer=self.eigentuemer)

	def test_falsche_rolle(self):
		with self.assertRaises(frappe.PermissionError):
			aufruf(projekt.anlegen, daten={"titel": "X"}, ip="", als_benutzer=self.investor)
		with self.assertRaises(frappe.PermissionError):
			aufruf(flaeche.anlegen, daten={"bezeichnung": "X"}, ip="", als_benutzer=self.anbieter)

	def test_alle_und_admin_methoden_nur_backoffice(self):
		with self.assertRaises(frappe.PermissionError):
			aufruf(flaeche.liste, alle=True, als_benutzer=self.eigentuemer)
		for fn in (admin.nutzer_liste, admin.provisionen, admin.aktivitaeten, admin.admin_konten, admin.uebersicht):
			with self.assertRaises(frappe.PermissionError):
				aufruf(fn, als_benutzer=self.eigentuemer)
		self.assertIn("vorgaenge", aufruf(admin.uebersicht, als_benutzer=self.admin))

	def test_eigene_admin_rolle_und_eigene_sperre_409(self):
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(admin.nutzer_aendern, id=self.admin, rollen=["investor"], als_benutzer=self.admin)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(admin.nutzer_aendern, id=self.admin, aktiv=False, als_benutzer=self.admin)

	def test_sperre_wirkt_sofort(self):
		opfer = konto(["mitglied"])
		version = frappe.db.get_value("Plattform Konto", opfer, "sitzung_version")
		k = aufruf(admin.nutzer_aendern, id=opfer, aktiv=False, als_benutzer=self.admin)
		self.assertFalse(k["aktiv"])
		self.assertEqual(k["sitzungVersion"], version + 1)
		self.assertIsNone(aufruf(auth.nutzer_fuer_sitzung, nutzerId=opfer))
		with self.assertRaises(frappe.AuthenticationError):
			aufruf(nachricht.threads, als_benutzer=opfer)
		self.assertEqual(frappe.db.get_value("User", frappe.db.get_value("Plattform Konto", opfer, "user"), "enabled"), 0)

	def test_profil_kann_admin_nicht_ergaenzen(self):
		k = aufruf(auth.nutzer_fuer_sitzung, nutzerId=self.investor)
		self.assertNotIn("admin", k["rollen"])
		from oekoinvest_app.plattform.api import konto as konto_api

		k = aufruf(konto_api.profil_speichern, daten={"vorname": "Inga", "nachname": "(Test)", "rollen": ["investor", "admin"]}, als_benutzer=self.investor)
		self.assertEqual(k["rollen"], ["investor"])

	# ------------------------------------------------------------ Börse & Datenraum

	def test_oeffentliche_boerse_nur_positivliste(self):
		pid = projekt_veroeffentlicht(self.anbieter, self.admin)
		liste = aufruf(boerse.liste)
		eintrag = next(x for x in liste["projekte"] if x["id"] == pid)
		self.assertTrue(set(eintrag).issubset(set(OEFFENTLICH)), set(eintrag) - set(OEFFENTLICH))
		self.assertNotIn("vertraulich", eintrag)
		self.assertNotIn("anbieterId", eintrag)
		detail = aufruf(boerse.detail, schluessel=eintrag["slug"], zaehlen=True)
		self.assertEqual(detail["zugriff"], "oeffentlich")
		self.assertIsNone(detail["vertraulich"])
		self.assertEqual(detail["dokumente"], [])
		self.assertNotIn("Geheimdorf", frappe.as_json(detail))
		self.assertEqual(frappe.db.get_value("Plattform Projekt", pid, "aufrufe"), 1)

	def test_entwurf_nicht_oeffentlich(self):
		p = aufruf(projekt.anlegen, daten={"titel": "Entwurf (Test)"}, ip="", als_benutzer=self.anbieter)
		with self.assertRaises(frappe.DoesNotExistError):
			aufruf(boerse.detail, schluessel=p["id"])
		with self.assertRaises(frappe.DoesNotExistError):
			aufruf(boerse.detail, schluessel=p["id"], als_benutzer=self.investor)
		self.assertEqual(aufruf(boerse.detail, schluessel=p["id"], als_benutzer=self.anbieter)["zugriff"], "eigentuemer")

	def test_datenraum_erst_nach_nda_freigabe(self):
		pid = projekt_veroeffentlicht(self.anbieter, self.admin)
		d = aufruf(
			dokument.speichern,
			bezugArt="projekt",
			bezugId=pid,
			name="ertragsgutachten.pdf",
			mime="application/pdf",
			kategorie="datenraum",
			inhaltBase64=base64.b64encode(PDF).decode(),
			als_benutzer=self.anbieter,
		)
		self.assertEqual(frappe.db.get_value("File", frappe.db.get_value("Plattform Dokument", d["id"], "datei_id"), "is_private"), 1)
		with self.assertRaises(frappe.PermissionError):
			aufruf(dokument.lesen, id=d["id"], als_benutzer=self.investor)
		interesse_mit_datenraum(self.investor, self.admin, pid)
		inhalt = aufruf(dokument.lesen, id=d["id"], als_benutzer=self.investor)
		self.assertEqual(base64.b64decode(inhalt["inhaltBase64"]), PDF)
		detail = aufruf(boerse.detail, schluessel=pid, als_benutzer=self.investor)
		self.assertEqual(detail["zugriff"], "nda")
		self.assertEqual(detail["vertraulich"]["gemeinde"], "Geheimdorf")
		self.assertNotIn("ip", detail["interesse"]["nda"])
		self.assertTrue(frappe.db.exists("Plattform Aktivitaet", {"aktion": "download", "objekt_id": pid}))

	def test_upload_nur_echte_pdf_jpg_png(self):
		f = flaeche_vollstaendig(self.eigentuemer)
		falsch = base64.b64encode(b"<html>kein pdf</html>").decode()
		with self.assertRaises(frappe.ValidationError):
			aufruf(dokument.speichern, bezugArt="flaeche", bezugId=f["id"], name="x.pdf", mime="application/pdf", kategorie="allgemein", inhaltBase64=falsch, als_benutzer=self.eigentuemer)
		with self.assertRaises(frappe.ValidationError):
			aufruf(dokument.speichern, bezugArt="flaeche", bezugId=f["id"], name="x.exe", mime="application/x-msdownload", kategorie="allgemein", inhaltBase64=falsch, als_benutzer=self.eigentuemer)
		with self.assertRaises(frappe.ValidationError):
			aufruf(
				dokument.speichern,
				bezugArt="flaeche",
				bezugId=f["id"],
				name="x.pdf",
				mime="application/pdf",
				kategorie="datenraum",
				inhaltBase64=base64.b64encode(PDF).decode(),
				als_benutzer=self.eigentuemer,
			)
