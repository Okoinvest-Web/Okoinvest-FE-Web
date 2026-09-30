# Copyright (c) 2026, ÖkoInvest GmbH
# Go-live-Paket: Einrichtung (idempotent), Desk-Statuswechsel, Druckhilfen, Aufbewahrung, Fixtures.
# Nur auf einer Test-Site: bench --site <test-site> run-tests --app oekoinvest_app --module oekoinvest_app.plattform.tests.test_golive

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform import aufbewahrung, desk, druck, einrichtung


class TestGoLive(FrappeTestCase):
	def test_einrichtung_idempotent(self):
		einrichtung.anwenden()
		einrichtung.anwenden()
		ss = frappe.get_single("System Settings")
		self.assertEqual(frappe.utils.cint(ss.enable_two_factor_auth), 1)
		self.assertEqual(frappe.utils.cint(ss.enable_password_policy), 1)
		self.assertGreaterEqual(frappe.utils.cint(ss.minimum_password_score), 3)
		for rolle in einrichtung.DESK_ROLLEN:
			self.assertTrue(frappe.utils.cint(frappe.db.get_value("Role", rolle, "two_factor_auth")), rolle)

	def test_fixtures_vorhanden(self):
		for dt, name in (
			("Role Profile", "ÖkoInvest Leitung"),
			("Email Template", "ÖkoInvest: Passwort festlegen"),
			("Notification", "ÖkoInvest: Neue Anfrage"),
			("Number Card", "ÖkoInvest Offene Anfragen"),
			("Dashboard Chart", "ÖkoInvest Anfragen je Monat"),
			("Letter Head", "ÖkoInvest"),
			("Workspace", "ÖkoInvest Cockpit"),
			("Report", "Pipeline Flaechen"),
			("Print Format", "Vertraulichkeitsvereinbarung NDA"),
		):
			self.assertTrue(frappe.db.exists(dt, name), f"{dt} {name}")
		for wf in frappe.get_all("Workflow", filters={"name": ("like", "ÖkoInvest%")}, fields=["name", "is_active"]):
			self.assertFalse(frappe.utils.cint(wf.is_active), f"{wf.name} muss inaktiv sein")

	def test_website_rollen_ohne_docperm(self):
		for rolle in ("ÖkoInvest API", "Plattform Investor", "Plattform Backoffice"):
			self.assertFalse(frappe.get_all("DocPerm", filters={"role": rolle, "parent": ("like", "Plattform %")}, limit=1), rolle)

	def test_desk_aktionen_nur_admin_uebergaenge(self):
		# jede Pflichtangabe eines Admin-Übergangs hat ein Dialogfeld im Desk
		for art in desk.ART_FUER_DOCTYPE.values():
			for ueb in desk.PROZESSE[art]["uebergaenge"]:
				if ueb["wer"] == "admin":
					for pflicht in ueb["pflicht"]:
						self.assertIn(pflicht, desk.DIALOG_FELDER, f"{art}: {pflicht}")
		self.assertEqual(desk._extra({"pachtangebot__euroProHaJahr": 1500, "kommentar_frei": ""}), {"pachtangebot": {"euroProHaJahr": 1500}})

	def test_desk_wechsel_ohne_recht(self):
		frappe.set_user("Guest")
		try:
			with self.assertRaises(frappe.PermissionError):
				desk.wechseln("Plattform Vorgang", "V-00-XXXXXX", "in_pruefung")
		finally:
			frappe.set_user("Administrator")

	def test_druck_formatierung(self):
		self.assertEqual(druck.oekoinvest_zahl(1234567.891, 1), "1.234.567,9")
		self.assertEqual(druck.oekoinvest_eur(2500), "2.500 €")
		self.assertEqual(druck.oekoinvest_prozent(0.02), "2,0 %")
		self.assertEqual(druck.oekoinvest_label("phase", "rtb"), "Baureif")
		if not frappe.conf.get("oekoinvest_kontakt_telefon"):
			self.assertIsNone(druck.oekoinvest_firma()["telefon"])  # Kontakt nie erfinden
		teaser = druck.oekoinvest_oeffentlich(frappe._dict(titel="T", vertraulich='{"gemeinde":"Geheim"}', anbieter_id="U-1"))
		self.assertNotIn("vertraulich", teaser)
		self.assertNotIn("anbieterId", teaser)

	def test_aufbewahrung_fristen_konfigurierbar(self):
		alt = frappe.conf.get("oekoinvest_loeschfristen")
		frappe.conf.oekoinvest_loeschfristen = {"ki_nutzung": 0}
		try:
			self.assertEqual(aufbewahrung.fristen()["ki_nutzung"], 0)
			self.assertEqual(aufbewahrung.fristen()["automation_lauf"], aufbewahrung.FRISTEN["automation_lauf"][0])
		finally:
			frappe.conf.oekoinvest_loeschfristen = alt
		self.assertIsInstance(aufbewahrung.taeglich(), dict)
