# Copyright (c) 2026, ÖkoInvest GmbH
# Flächen ohne Eigentümerkonto (Akquise-Übernahme aus den Geodaten, nutzer_id leer): Portal-Ansichten, Nachrichten,
# Druckformat und Backoffice-Kontakt vertragen die fehlende Zuordnung; Fremde sehen die Fläche nicht.
#   bench --site <site> run-tests --module oekoinvest_app.plattform.tests.test_flaeche_ohne_konto
# Ohne Bench: tests/test_flaeche_ohne_konto_kern.py

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import flaeche
from oekoinvest_app.plattform.backoffice import kontakt_von
from oekoinvest_app.plattform.druck import oekoinvest_konto
from oekoinvest_app.plattform.kern import besitzer, nachricht_anlegen, verlauf
from oekoinvest_app.plattform.tests.testdaten import aufruf, konto, vorbereiten


class TestFlaecheOhneKonto(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.fremder = konto(["flaeche"])
		f = frappe.get_doc(
			{
				"doctype": "Plattform Flaeche",
				"bezeichnung": "Akquise-Ziel Testgemeinde · 12,5 ha",
				"status": "entwurf",
				"nutzer_id": None,  # wie geodaten.uebernehmen
				"zustaendig_id": cls.admin,
				"land": "AT",
				"ort": "Testgemeinde",
				"ha": 12.5,
				"nutzung": "acker",
				"eigentum": "eigentum",
			}
		)
		verlauf(f, "entwurf", frappe._dict(id=cls.admin, rollen=["admin"]), "admin", "Test: Akquise-Übernahme")
		f.insert(ignore_permissions=True)
		cls.flaeche = f.name

	def tearDown(self):
		frappe.set_user("Administrator")

	def test_backoffice_ansicht(self):
		f = aufruf(flaeche.holen, id=self.flaeche, als_benutzer=self.admin)
		self.assertIsNone(f["nutzerId"])
		self.assertIsNone(f.get("eigentuemer"))
		self.assertEqual(f["meinZugriff"], "admin")
		liste = aufruf(flaeche.liste, alle=1, als_benutzer=self.admin)
		self.assertIn(self.flaeche, [x["id"] for x in liste])

	def test_fremde_sehen_nichts(self):
		with self.assertRaises(frappe.PermissionError):
			aufruf(flaeche.holen, id=self.flaeche, als_benutzer=self.fremder)
		self.assertNotIn(self.flaeche, [x["id"] for x in aufruf(flaeche.liste, als_benutzer=self.fremder)])

	def test_hilfsfunktionen(self):
		f = frappe.get_doc("Plattform Flaeche", self.flaeche)
		self.assertIsNone(besitzer("flaeche", f))
		self.assertIsNone(kontakt_von("flaeche", f))
		self.assertEqual(oekoinvest_konto(f.nutzer_id)["name"], "–")

	def test_nachricht_ohne_eigentuemer(self):
		vorher = frappe.db.count("Plattform Benachrichtigung", {"objekt_id": self.flaeche, "nutzer_id": ["is", "not set"]})
		nachricht_anlegen("flaeche", self.flaeche, von_id=self.admin, von_admin=True, text="Grundbuchabfrage beauftragt.")
		self.assertEqual(frappe.db.count("Plattform Benachrichtigung", {"objekt_id": self.flaeche, "nutzer_id": ["is", "not set"]}), vorher)

	def test_druckformat_pachtvorvertrag(self):
		html = frappe.get_print("Plattform Flaeche", self.flaeche, print_format="Pacht-Vorvertrag Muster")
		self.assertIn("Absichtserklärung", html)
