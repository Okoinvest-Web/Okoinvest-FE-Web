# Copyright (c) 2026, ÖkoInvest GmbH
# Projektbörse bis zum Abschluss: Provisionspflicht vor Einreichung, Satz 1,5–3 %, automatische Provision beim Verkauf.

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import admin, interesse, projekt, prozess
from oekoinvest_app.plattform.tests.testdaten import (
	aufruf,
	interesse_mit_datenraum,
	konto,
	projekt_daten,
	projekt_veroeffentlicht,
	vorbereiten,
)


class TestProvision(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.anbieter = konto(["anbieter"])
		cls.kaeufer = konto(["investor"])
		cls.mitbieter = konto(["investor"])

	def tearDown(self):
		frappe.set_user("Administrator")

	def test_einreichen_nur_mit_provisionsvereinbarung(self):
		p = aufruf(projekt.anlegen, daten=projekt_daten(), ip="127.0.0.1", als_benutzer=self.anbieter)
		with self.assertRaises(frappe.ValidationError) as fehler:
			aufruf(prozess.status_wechsel, art="projekt", id=p["id"], nach="pruefung", als="eigentuemer", extra={}, als_benutzer=self.anbieter)
		self.assertIn("Provisionsvereinbarung", str(fehler.exception))
		# auch im Desk (Controller) nicht umgehbar
		doc = frappe.get_doc("Plattform Projekt", p["id"])
		doc.status = "pruefung"
		doc.flags.plattform_uebergang = ("entwurf", "pruefung")
		with self.assertRaises(frappe.ValidationError):
			doc.save(ignore_permissions=True)
		# nur der Anbieter selbst kann akzeptieren
		with self.assertRaises(frappe.PermissionError):
			aufruf(projekt.provision_akzeptieren, id=p["id"], ip="", als_benutzer=self.admin)
		erg = aufruf(projekt.provision_akzeptieren, id=p["id"], ip="127.0.0.1", als_benutzer=self.anbieter)
		self.assertEqual(erg["provisionAkzeptiert"]["version"], "2026-09")
		erg = aufruf(prozess.status_wechsel, art="projekt", id=p["id"], nach="pruefung", als="eigentuemer", extra={}, als_benutzer=self.anbieter)
		self.assertEqual(erg["status"], "pruefung")
		# Anbieter darf im Status „pruefung“ nicht mehr bearbeiten (409)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(projekt.aendern, id=p["id"], daten=projekt_daten(), als_benutzer=self.anbieter)

	def test_provisionssatz_grenzen(self):
		p = aufruf(projekt.anlegen, daten=projekt_daten(), ip="", als_benutzer=self.anbieter)
		aufruf(projekt.provision_akzeptieren, id=p["id"], ip="", als_benutzer=self.anbieter)
		aufruf(prozess.status_wechsel, art="projekt", id=p["id"], nach="pruefung", als="eigentuemer", extra={}, als_benutzer=self.anbieter)
		with self.assertRaises(frappe.ValidationError):
			aufruf(prozess.status_wechsel, art="projekt", id=p["id"], nach="veroeffentlicht", als="admin", extra={}, als_benutzer=self.admin)
		with self.assertRaises(frappe.ValidationError):
			aufruf(prozess.status_wechsel, art="projekt", id=p["id"], nach="veroeffentlicht", als="admin", extra={"provisionSatz": 5}, als_benutzer=self.admin)
		erg = aufruf(prozess.status_wechsel, art="projekt", id=p["id"], nach="veroeffentlicht", als="admin", extra={"provisionSatz": 2.5}, als_benutzer=self.admin)
		self.assertAlmostEqual(erg["provisionSatz"], 0.025)
		self.assertTrue(erg["veroeffentlichtAm"])

	def test_verkauf_erzeugt_provision(self):
		pid = projekt_veroeffentlicht(self.anbieter, self.admin, satz=0.02)
		slug = frappe.db.get_value("Plattform Projekt", pid, "slug")
		kaeufer_i = interesse_mit_datenraum(self.kaeufer, self.admin, pid)
		mit_i = aufruf(interesse.merken, projektId=pid, an=True, als_benutzer=self.mitbieter)["id"]

		# LOI → angenommen → Projekt reserviert (system)
		with self.assertRaises(frappe.ValidationError):
			aufruf(prozess.status_wechsel, art="interesse", id=kaeufer_i, nach="loi_abgegeben", als="eigentuemer", extra={"loi": {"text": "kurz"}}, als_benutzer=self.kaeufer)
		aufruf(
			prozess.status_wechsel,
			art="interesse",
			id=kaeufer_i,
			nach="loi_abgegeben",
			als="eigentuemer",
			extra={"loi": {"text": "Wir bieten 480.000 EUR vorbehaltlich Due Diligence.", "betrag": 480000}},
			als_benutzer=self.kaeufer,
		)
		aufruf(prozess.status_wechsel, art="interesse", id=kaeufer_i, nach="loi_angenommen", als="admin", extra={}, als_benutzer=self.admin)
		self.assertEqual(frappe.db.get_value("Plattform Projekt", pid, "status"), "reserviert")

		# Verkauf: Käufer + Kaufpreis Pflicht
		with self.assertRaises(frappe.ValidationError):
			aufruf(prozess.status_wechsel, art="projekt", id=pid, nach="verkauft", als="admin", extra={"interesseId": kaeufer_i}, als_benutzer=self.admin)
		with self.assertRaises(frappe.ValidationError):
			aufruf(prozess.status_wechsel, art="projekt", id=pid, nach="verkauft", als="admin", extra={"interesseId": mit_i, "kaufpreis": 500000}, als_benutzer=self.admin)
		erg = aufruf(prozess.status_wechsel, art="projekt", id=pid, nach="verkauft", als="admin", extra={"interesseId": kaeufer_i, "kaufpreis": 487654}, als_benutzer=self.admin)
		self.assertEqual(erg["status"], "verkauft")

		pv = frappe.get_all("Plattform Provision", filters={"projekt_id": pid}, fields=["name", "kaufpreis", "satz", "betrag", "status", "investor_id", "interesse_id"])
		self.assertEqual(len(pv), 1)
		pv = pv[0]
		self.assertEqual(pv.status, "offen")
		self.assertEqual(pv.investor_id, self.kaeufer)
		self.assertEqual(pv.interesse_id, kaeufer_i)
		self.assertAlmostEqual(float(pv.satz), 0.02)
		self.assertEqual(float(pv.betrag), round(float(pv.kaufpreis) * 0.02))
		self.assertEqual(erg["provision"]["id"], pv.name)

		# Käufer abgeschlossen, alle anderen offenen Interessen abgelehnt
		self.assertEqual(frappe.db.get_value("Plattform Interesse", kaeufer_i, "status"), "abgeschlossen")
		self.assertEqual(frappe.db.get_value("Plattform Interesse", mit_i, "status"), "abgelehnt")
		self.assertEqual(frappe.db.get_value("Plattform Interesse", mit_i, "ablehn_grund"), "Projekt anderweitig verkauft.")
		# nicht mehr in der Börse; Slug bleibt stabil
		self.assertEqual(frappe.db.get_value("Plattform Projekt", pid, "slug"), slug)

		# Provision: nur Backoffice, Automat offen → in_rechnung → bezahlt
		self.assertEqual(aufruf(admin.provisionen, als_benutzer=self.admin)[0]["projektId"], pid)
		with self.assertRaises(frappe.PermissionError):
			aufruf(prozess.status_wechsel, art="provision", id=pv.name, nach="in_rechnung", als="admin", extra={}, als_benutzer=self.anbieter)
		aufruf(prozess.status_wechsel, art="provision", id=pv.name, nach="in_rechnung", als="admin", extra={}, als_benutzer=self.admin)
		aufruf(prozess.status_wechsel, art="provision", id=pv.name, nach="bezahlt", als="admin", extra={}, als_benutzer=self.admin)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(prozess.status_wechsel, art="provision", id=pv.name, nach="offen", als="admin", extra={}, als_benutzer=self.admin)

		# Kaufpreis/Satz einer Provision sind unveränderlich
		doc = frappe.get_doc("Plattform Provision", pv.name)
		doc.kaufpreis = 1
		with self.assertRaises(frappe.ValidationError):
			doc.save(ignore_permissions=True)

	def test_zweiter_verkauf_erzeugt_keine_zweite_provision(self):
		pid = projekt_veroeffentlicht(self.anbieter, self.admin)
		i = interesse_mit_datenraum(self.kaeufer, self.admin, pid)
		aufruf(prozess.status_wechsel, art="projekt", id=pid, nach="verkauft", als="admin", extra={"interesseId": i, "kaufpreis": 100000}, als_benutzer=self.admin)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(prozess.status_wechsel, art="projekt", id=pid, nach="verkauft", als="admin", extra={"interesseId": i, "kaufpreis": 100000}, als_benutzer=self.admin)
		self.assertEqual(frappe.db.count("Plattform Provision", {"projekt_id": pid}), 1)
		# Mindestsatz, falls kein Satz gesetzt wäre, ist 1,5 %; hier gesetzt: 2 %
		self.assertAlmostEqual(float(frappe.db.get_value("Plattform Provision", {"projekt_id": pid}, "betrag")), 2000)
