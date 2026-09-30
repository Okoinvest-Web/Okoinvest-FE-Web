# Copyright (c) 2026, ÖkoInvest GmbH
# Finanzen & Abrechnung (ohne ERPNext – Eigenbetrieb): Pachtvertrag → Gutschrift je Fälligkeit (idempotent), Indexierung,
# Rechte (Eigentümer nur eigene Belege, fremde → PermissionError, Unterrollen), keine Auszahlung ohne KYC, SEPA nur mit
# Freigabe, Provision → Rechnung → bezahlt, Contracting-Klärfall bei fehlenden Monatswerten.
#   bench --site <test-site> run-tests --module oekoinvest_app.plattform.tests.test_finanzen
# Reine Logik ohne Frappe: plattform/finanzen/test_logik.py (python -m unittest).

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import finanzen as api
from oekoinvest_app.plattform.finanzen import abrechnung as A
from oekoinvest_app.plattform.finanzen import logik as L
from oekoinvest_app.plattform.tests.testdaten import aufruf, konto, vorbereiten


class TestFinanzen(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.eigentuemer = konto(["flaeche"])
		cls.fremder = konto(["flaeche"])
		cls.lesen = konto(["admin"])
		frappe.db.set_value("Plattform Konto", cls.lesen, "backoffice_rollen", "lesen")
		for reihe, jahr, wert in [("VPI-DE-2020", 2022, 110.2), ("VPI-DE-2020", 2023, 116.7), ("VPI-DE-2020", 2024, 119.3), ("VPI-DE-2020", 2025, 121.9)]:
			if not frappe.db.exists("Plattform VPI Wert", f"{reihe}-{jahr}"):
				frappe.get_doc({"doctype": "Plattform VPI Wert", "reihe": reihe, "jahr": jahr, "wert": wert}).insert(ignore_permissions=True)
		cls.vertrag = aufruf(api.pachtvertrag_speichern, daten={
			"eigentuemerId": cls.eigentuemer, "bezeichnung": "Testpacht indexiert", "land": "DE", "flaecheHa": 10, "modell": "indexiert", "pachtJahr": 30000,
			"index": {"reihe": "VPI-DE-2020", "basisJahr": 2022}, "vertragsdatum": "2023-01-01", "beginnArt": "inbetriebnahme", "beginn": "2024-01-01",
			"laufzeitJahre": 25, "faelligkeit": "jaehrlich", "zahlweise": "vorschuessig", "status": "aktiv",
		}, als_benutzer=cls.admin)

	def tearDown(self):
		frappe.set_user("Administrator")

	def test_lauf_idempotent_und_indexierung(self):
		l1 = aufruf(api.lauf, daten={"art": "pacht", "vertragIds": [self.vertrag["id"]]}, als_benutzer=self.admin)
		self.assertGreaterEqual(len(l1["erzeugt"]), 2)
		l2 = aufruf(api.lauf, daten={"art": "pacht", "vertragIds": [self.vertrag["id"]]}, als_benutzer=self.admin)
		self.assertEqual(len(l2["erzeugt"]), 0)
		self.assertGreaterEqual(l2["vorhanden"], 2)
		belege = frappe.get_all("Plattform Abrechnung", filters={"pachtvertrag_id": self.vertrag["id"]}, fields=["zeitraum_von", "netto", "nummer"], order_by="zeitraum_von asc")
		b2025 = next(b for b in belege if str(b.zeitraum_von).startswith("2025"))
		# 2025: Index 2024 (119,3) zu Basis 2022 (110,2) über zwei Stufen: 30000 × 116,7/110,2 × 119,3/116,7
		erwartet = L.rund2(L.rund2(30000 * (1 + (116.7 / 110.2 - 1))) * (1 + (119.3 / 116.7 - 1)))
		self.assertAlmostEqual(float(b2025.netto), erwartet, places=2)
		self.assertTrue(b2025.nummer.startswith("PG-"))

	def test_eigentuemer_sieht_nur_eigene(self):
		aufruf(api.lauf, daten={"art": "pacht", "vertragIds": [self.vertrag["id"]]}, als_benutzer=self.admin)
		m = aufruf(api.meine, als_benutzer=self.eigentuemer)
		self.assertTrue(m["pacht"]["belege"])
		beleg_id = m["pacht"]["belege"][0]["id"]
		self.assertEqual(aufruf(api.abrechnung, id=beleg_id, als_benutzer=self.eigentuemer)["id"], beleg_id)
		with self.assertRaises(frappe.PermissionError):
			aufruf(api.abrechnung, id=beleg_id, als_benutzer=self.fremder)
		self.assertFalse(aufruf(api.meine, als_benutzer=self.fremder)["pacht"]["belege"])
		with self.assertRaises(frappe.PermissionError):
			aufruf(api.cockpit, als_benutzer=self.eigentuemer)

	def test_unterrolle_lesen_darf_nicht_schreiben(self):
		self.assertIn("kennzahlen", aufruf(api.cockpit, als_benutzer=self.lesen))
		with self.assertRaises(frappe.PermissionError):
			aufruf(api.lauf, daten={"art": "pacht"}, als_benutzer=self.lesen)

	def test_keine_auszahlung_ohne_kyc(self):
		aufruf(api.lauf, daten={"art": "pacht", "vertragIds": [self.vertrag["id"]]}, als_benutzer=self.admin)
		ids = frappe.get_all("Plattform Abrechnung", filters={"pachtvertrag_id": self.vertrag["id"], "status": "offen"}, pluck="name")
		self.assertTrue(ids)
		self.assertFalse(A.kyc_auszahlung(self.eigentuemer)["ok"])
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(api.sepa_export, ids=ids, als_benutzer=self.admin)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(api.abrechnung_aktion, id=ids[0], daten={"aktion": "bezahlt"}, als_benutzer=self.admin)
		self.assertEqual(frappe.db.get_value("Plattform Abrechnung", ids[0], "status"), "offen")

	def test_vertrag_validierung(self):
		with self.assertRaises(frappe.ValidationError):
			aufruf(api.pachtvertrag_speichern, daten={"eigentuemerId": self.eigentuemer, "bezeichnung": "Umsatz ohne Anlage", "land": "AT", "modell": "umsatz", "umsatz": {"anteil": 5, "erloesCtKwh": 7}, "vertragsdatum": "2025-01-01", "laufzeitJahre": 20}, als_benutzer=self.admin)
		with self.assertRaises(frappe.PermissionError):
			aufruf(api.pachtvertrag_speichern, daten={}, als_benutzer=self.eigentuemer)

	def test_klaerfall_statt_rechnung_bei_fehlenden_monatswerten(self):
		# Contracting-Anlage mit Vertrag, abrechnungsrelevantem Zähler, ohne Monatswerte → Klärfall
		if not frappe.db.exists("DocType", "Plattform Anlage"):
			self.skipTest("Anlagen-Modul fehlt")
		from oekoinvest_app.plattform.api import anlagen

		kunde = konto(["unternehmen"])
		a = aufruf(anlagen.anlegen, daten={"name": "Testdach Finanzen", "typ": "dach", "status": "betrieb", "land": "DE", "bundesland": "Bayern", "kwp": 100, "inbetriebnahme": "2025-01-01", "kundeId": kunde}, als_benutzer=self.admin)
		aufruf(anlagen.eintrag_speichern, anlageId=a["id"], art="vertrag", daten={"beginn": "2025-01-01", "laufzeitJahre": 15, "strompreisCt": 12, "grundgebuehrMonat": 50}, als_benutzer=self.admin)
		aufruf(anlagen.eintrag_speichern, anlageId=a["id"], art="messpunkt", daten={"zaehlernummer": "1ERZ-TEST", "art": "erzeugung", "messstelle": "geeicht", "abrechnungsrelevant": True}, als_benutzer=self.admin)
		lauf = aufruf(api.lauf, daten={"art": "contracting", "anlageIds": [a["id"]]}, als_benutzer=self.admin)
		self.assertEqual(len(lauf["erzeugt"]), 0)
		self.assertEqual(len(lauf["klaerfaelle"]), 1)
		self.assertTrue(frappe.db.exists("Plattform Klaerfall", {"anlage_id": a["id"], "status": "offen"}))
