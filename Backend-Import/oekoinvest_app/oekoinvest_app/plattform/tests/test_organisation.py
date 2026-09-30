# Copyright (c) 2026, ÖkoInvest GmbH
# Organisationen & Teams: Einladung (nur eingeladene Adresse), Teamrollen lesen/mitglied/admin/inhaber,
# Objekte im Organisationskontext (als_organisation), Wechsel nur in eigene Organisationen, Team-Suchprofil.
# Eigene Testkonten mit Präfix „team-“ (example.com), alles fiktiv.

import secrets

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, now_datetime

from oekoinvest_app.plattform.api import auth, flaeche, konto, nachricht, prozess
from oekoinvest_app.plattform.api import organisation as org_api
from oekoinvest_app.plattform.api import sicherheit as sich_api
from oekoinvest_app.plattform.kern import sha256
from oekoinvest_app.plattform.tests.testdaten import PASSWORT, aufruf, vorbereiten


def konto_team(rollen=("flaeche",)):
	email = f"team-{frappe.generate_hash(length=10).lower()}@example.com"
	ergebnis = aufruf(
		auth.registrieren,
		email=email,
		passwort=PASSWORT,
		vorname="Team",
		nachname="(Test)",
		rollen=list(rollen),
		basisUrl="https://plattform-test.example.com",
		ip="127.0.0.1",
	)
	kid = ergebnis["nutzer"]["id"]
	frappe.db.set_value("Plattform Konto", kid, "email_bestaetigt", 1)
	return kid, email


def im_kontext(org_id, fn, **kwargs):
	"""Aufruf wie die Website mit aktiver Organisation (als_organisation im Request, nicht in der Signatur)."""
	frappe.local.form_dict = frappe._dict(als_organisation=org_id)
	try:
		return aufruf(fn, **kwargs)
	finally:
		frappe.local.form_dict = frappe._dict()


def einladung_mit_token(org_id, email, rolle, von):
	"""Einladung wie org_api.einladen, aber mit bekanntem Token (die Mail ist im Test nicht lesbar)."""
	token = secrets.token_urlsafe(32)
	frappe.get_doc(
		{
			"doctype": "Plattform Einladung",
			"organisation_id": org_id,
			"email": email,
			"rolle": rolle,
			"hash": sha256(token),
			"ablauf": add_days(now_datetime(), 7),
			"status": "offen",
			"eingeladen_von": von,
		}
	).insert(ignore_permissions=True)
	return token


class TestOrganisation(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.inhaber, cls.inhaber_email = konto_team()
		cls.leser, cls.leser_email = konto_team()
		cls.mitglied, cls.mitglied_email = konto_team(("flaeche", "investor"))
		cls.fremder, cls.fremder_email = konto_team()
		o = aufruf(org_api.anlegen, daten={"name": "Muster Betrieb (Test)", "art": "betrieb"}, als_benutzer=cls.inhaber)
		cls.org = o["id"]
		for kid, email, rolle in ((cls.leser, cls.leser_email, "lesen"), (cls.mitglied, cls.mitglied_email, "mitglied")):
			token = einladung_mit_token(cls.org, email, rolle, cls.inhaber)
			aufruf(org_api.einladung_annehmen, token=token, als_benutzer=kid)
		cls.fremd_org = aufruf(org_api.anlegen, daten={"name": "Fremde GmbH (Test)", "art": "investmenthaus"}, als_benutzer=cls.fremder)["id"]

	def tearDown(self):
		frappe.local.form_dict = frappe._dict()
		frappe.set_user("Administrator")

	def test_organisation_und_rollen(self):
		o = aufruf(org_api.holen, id=self.org, als_benutzer=self.inhaber)
		rollen = {m["nutzer"]["id"]: m["rolle"] for m in o["mitglieder"]}
		self.assertEqual(rollen, {self.inhaber: "inhaber", self.leser: "lesen", self.mitglied: "mitglied"})
		self.assertEqual(aufruf(org_api.holen, id=self.org, als_benutzer=self.leser)["einladungen"], [])  # nur Verwalter sehen Einladungen
		with self.assertRaises(frappe.PermissionError):
			aufruf(org_api.holen, id=self.org, als_benutzer=self.fremder)
		with self.assertRaises(frappe.PermissionError):
			aufruf(org_api.aendern, id=self.org, daten={"name": "Übernommen"}, als_benutzer=self.leser)
		with self.assertRaises(frappe.PermissionError):
			aufruf(org_api.einladen, id=self.org, email="neu@example.com", rolle="lesen", basisUrl="", als_benutzer=self.mitglied)
		e = aufruf(org_api.einladen, id=self.org, email="neu-team@example.com", rolle="mitglied", basisUrl="", als_benutzer=self.inhaber)
		self.assertEqual(frappe.db.get_value("Plattform Einladung", e["id"], "status"), "offen")
		self.assertEqual(len(frappe.db.get_value("Plattform Einladung", e["id"], "hash")), 64)

	def test_einladung_fremde_email_verboten(self):
		token = einladung_mit_token(self.org, f"andere-{frappe.generate_hash(length=6).lower()}@example.com", "mitglied", self.inhaber)
		with self.assertRaises(frappe.PermissionError):
			aufruf(org_api.einladung_annehmen, token=token, als_benutzer=self.fremder)
		info = aufruf(org_api.einladung_info, token=token)
		self.assertTrue(info["gueltig"])
		self.assertIn("•", info["email"])
		self.assertEqual(aufruf(org_api.einladung_info, token="x" * 30), {"gueltig": False, "status": "unbekannt"})

	def test_team_lesen_darf_lesen_aber_nicht_aendern(self):
		f = im_kontext(self.org, flaeche.anlegen, daten={"bezeichnung": "Betriebsfläche (Test)", "ha": 5}, ip="127.0.0.1", als_benutzer=self.inhaber)
		self.assertEqual(f["organisation"]["id"], self.org)
		self.assertEqual(f["meinZugriff"], "eigentuemer")
		# Leser: Liste im Organisationskontext, Detail, Nachrichten lesen
		self.assertIn(f["id"], [x["id"] for x in im_kontext(self.org, flaeche.liste, als_benutzer=self.leser)])
		self.assertNotIn(f["id"], [x["id"] for x in aufruf(flaeche.liste, als_benutzer=self.leser)])  # persönlich: nur eigene
		d = aufruf(flaeche.holen, id=f["id"], als_benutzer=self.leser)
		self.assertEqual(d["meinZugriff"], "lesen")
		aufruf(nachricht.liste, bezugArt="flaeche", bezugId=f["id"], als_benutzer=self.leser)
		# … aber nicht ändern, schreiben, Statusschritte oder im Team anlegen
		with self.assertRaises(frappe.PermissionError):
			aufruf(flaeche.aendern, id=f["id"], daten={"bezeichnung": "Geändert"}, als_benutzer=self.leser)
		with self.assertRaises(frappe.PermissionError):
			aufruf(nachricht.senden, bezugArt="flaeche", bezugId=f["id"], text="Hallo Team", als_benutzer=self.leser)
		with self.assertRaises(frappe.PermissionError):
			aufruf(prozess.status_wechsel, art="flaeche", id=f["id"], nach="eingegangen", als="eigentuemer", extra={}, als_benutzer=self.leser)
		with self.assertRaises(frappe.PermissionError):
			im_kontext(self.org, flaeche.anlegen, daten={"bezeichnung": "Nicht erlaubt"}, ip="", als_benutzer=self.leser)
		# Mitglied darf bearbeiten
		g = aufruf(flaeche.aendern, id=f["id"], daten={"bezeichnung": "Betriebsfläche Nord (Test)"}, als_benutzer=self.mitglied)
		self.assertEqual(g["bezeichnung"], "Betriebsfläche Nord (Test)")
		self.assertEqual(g["meinZugriff"], "schreiben")
		aufruf(nachricht.senden, bezugArt="flaeche", bezugId=f["id"], text="Hallo Team", als_benutzer=self.mitglied)
		self.assertIn(("flaeche", f["id"]), [(t["bezugArt"], t["bezugId"]) for t in aufruf(nachricht.threads, als_benutzer=self.leser)])

	def test_fremde_organisation_verboten(self):
		f = im_kontext(self.org, flaeche.anlegen, daten={"bezeichnung": "Interne Fläche (Test)"}, ip="", als_benutzer=self.inhaber)
		with self.assertRaises(frappe.PermissionError):
			aufruf(flaeche.holen, id=f["id"], als_benutzer=self.fremder)
		# fremde Organisationskennung im Request: still ignoriert (kein Kontext), Zugriff bleibt verboten
		with self.assertRaises(frappe.PermissionError):
			im_kontext(self.org, flaeche.holen, id=f["id"], als_benutzer=self.fremder)
		self.assertNotIn(f["id"], [x["id"] for x in im_kontext(self.org, flaeche.liste, als_benutzer=self.fremder)])
		with self.assertRaises(frappe.PermissionError):
			aufruf(nachricht.liste, bezugArt="flaeche", bezugId=f["id"], als_benutzer=self.fremder)

	def test_wechsel_nur_in_eigene_organisation(self):
		s = aufruf(sich_api.sitzung_anlegen, ip="127.0.0.1", userAgent="Test", als_benutzer=self.leser)
		sid = s["sitzung"]["id"]
		with self.assertRaises(frappe.PermissionError):
			aufruf(org_api.wechseln, organisationId=self.fremd_org, sitzungId=sid, als_benutzer=self.leser)
		r = aufruf(org_api.wechseln, organisationId=self.org, sitzungId=sid, als_benutzer=self.leser)
		self.assertEqual(r["organisation"]["rolle"], "lesen")
		n = aufruf(auth.nutzer_fuer_sitzung, nutzerId=self.leser, sitzungId=sid)
		self.assertEqual(n["organisation"]["id"], self.org)
		self.assertEqual(n["sitzung"]["organisationId"], self.org)
		self.assertIn(self.org, [o["id"] for o in n["organisationen"]])
		self.assertEqual(aufruf(org_api.wechseln, organisationId=None, sitzungId=sid, als_benutzer=self.leser)["aktiv"], None)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(org_api.wechseln, organisationId=self.org, sitzungId=None, als_benutzer=self.leser)

	def test_team_suchprofil(self):
		profil = {"mwpMin": 5, "mwpMax": 50, "laender": ["DE"], "benachrichtigen": True}
		sp = im_kontext(self.org, konto.suchprofil_speichern, profil=profil, als_benutzer=self.mitglied)
		self.assertEqual(sp["mwpMin"], 5)
		self.assertIsNotNone(frappe.db.get_value("Plattform Organisation", self.org, "suchprofil"))
		self.assertIsNone(frappe.db.get_value("Plattform Konto", self.mitglied, "suchprofil"))  # persönliches Profil unverändert

	def test_mitgliedschaft_verlassen_und_inhaber_schutz(self):
		o = aufruf(org_api.holen, id=self.org, als_benutzer=self.inhaber)
		inhaber_mg = next(m["id"] for m in o["mitglieder"] if m["rolle"] == "inhaber")
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(org_api.mitglied_entfernen, id=self.org, mitgliedId=inhaber_mg, als_benutzer=self.inhaber)
		with self.assertRaises(frappe.PermissionError):
			aufruf(org_api.mitglied_aendern, id=self.org, mitgliedId=inhaber_mg, rolle="lesen", als_benutzer=self.mitglied)
		with self.assertRaises(frappe.PermissionError):
			aufruf(org_api.loeschen, id=self.org, als_benutzer=self.leser)
