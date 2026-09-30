# Copyright (c) 2026, ÖkoInvest GmbH
# Geodaten & Akquise-Engine: nur Unterrollen Leitung/Akquise, Übernahme erzeugt Fläche + Aufgabe + Akquise-Ziel,
# doppelte Übernahme → Konflikt, Geometrie-Prüfung, Kapazitätspflege nur mit Quelle.
# Spiegel von scripts/plattform-test-geodaten.mjs (dort zusätzlich Scoring/Distanzen über die Website-API).

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import geodaten
from oekoinvest_app.plattform.doctype.plattform_akquise_ziel.plattform_akquise_ziel import geometrie_pruefen
from oekoinvest_app.plattform.tests.testdaten import aufruf, konto, vorbereiten

GEOM = {"type": "MultiPolygon", "coordinates": [[[[13.1, 48.2], [13.104, 48.2], [13.104, 48.2027], [13.1, 48.2027], [13.1, 48.2]]]]}


def kandidat(kid="K-TEST-P-001"):
	return {
		"id": kid, "demo": True, "ha": 8.2, "mwp": 7.5, "score": 78, "prioritaet": "A", "land": "AT", "bundesland": "Oberösterreich",
		"bezirk": "Braunau am Inn", "gemeinde": "Testgemeinde", "geometrie": GEOM,
		"parzellen": [{"id": "DEMO-P-901", "kg": "DEMO-KG Test", "kgNr": "99001", "gstNr": "123/4", "ha": 4.1}, {"id": "DEMO-P-902", "kg": "DEMO-KG Test", "kgNr": "99001", "gstNr": "124", "ha": 4.1}],
		"netz": {"knoten": {"id": "osm-n1", "name": "UW Test", "art": "uw110", "kapazitaet": "unbekannt"}, "trasseM": 2400, "luftlinieM": 1920, "kosten": {"min": 400000, "max": 700000, "summe": 500000}},
		"merkmale": {"hauptnutzung": "acker", "neigungGrad": 3, "schutz": []},
		"widmung": {"status": "zone", "text": "Priorität 1"},
	}


class TestGeodatenKern(FrappeTestCase):
	def test_geometrie(self):
		import json

		self.assertIsNone(geometrie_pruefen(json.dumps(GEOM)))
		self.assertIsNotNone(geometrie_pruefen('{"type":"Point","coordinates":[13,48]}'))
		self.assertIsNotNone(geometrie_pruefen('{"type":"Polygon","coordinates":[[[500,48],[13,48],[13,49],[500,48]]]}'))
		self.assertIsNotNone(geometrie_pruefen("kein json"))


class TestGeodaten(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.leitung = konto(["admin"], vorname="Leitung")
		cls.akquise = konto(["admin"], vorname="Akquise")
		frappe.db.set_value("Plattform Konto", cls.akquise, "backoffice_rollen", "akquise")
		cls.transaktion = konto(["admin"], vorname="Transaktion")
		frappe.db.set_value("Plattform Konto", cls.transaktion, "backoffice_rollen", "transaktion")
		cls.lesen = konto(["admin"], vorname="Lesen")
		frappe.db.set_value("Plattform Konto", cls.lesen, "backoffice_rollen", "lesen")
		cls.investor = konto(["investor"])

	def tearDown(self):
		frappe.set_user("Administrator")

	def test_rechte(self):
		for k in (self.transaktion, self.lesen, self.investor):
			with self.assertRaises(frappe.PermissionError):
				aufruf(geodaten.ziele, als_benutzer=k)
			with self.assertRaises(frappe.PermissionError):
				aufruf(geodaten.ziel_uebernehmen, kandidat=kandidat("K-TEST-P-777"), als_benutzer=k)
			with self.assertRaises(frappe.PermissionError):
				aufruf(geodaten.kapazitaet_setzen, knotenId="osm-n1", daten={"kapazitaet": "frei", "quelle": "Test"}, als_benutzer=k)
		self.assertIn("ziele", aufruf(geodaten.ziele, als_benutzer=self.akquise))
		self.assertIn("ziele", aufruf(geodaten.ziele, als_benutzer=self.leitung))

	def test_uebernahme(self):
		r = aufruf(geodaten.ziel_uebernehmen, kandidat=kandidat("K-TEST-P-001"), notiz="Test", als_benutzer=self.akquise)
		f = frappe.get_doc("Plattform Flaeche", r["flaecheId"])
		self.assertEqual(f.status, "entwurf")
		self.assertEqual(f.zustaendig_id, self.akquise)
		self.assertFalse(f.nutzer_id)
		self.assertAlmostEqual(f.ha, 8.2)
		self.assertEqual(len(f.flurstuecke), 2)
		a = frappe.get_doc("Plattform Aufgabe", r["aufgabeId"])
		self.assertEqual(a.titel, "Eigentümer ermitteln (Grundbuchabfrage)")
		self.assertEqual((a.bezug_art, a.bezug_id), ("flaeche", f.name))
		z = frappe.get_doc("Plattform Akquise Ziel", r["ziel"]["id"])
		self.assertEqual((z.score, z.umspannwerk_id, z.trasse_m), (78, "osm-n1", 2400))
		self.assertIn("MultiPolygon", z.geometrie)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(geodaten.ziel_uebernehmen, kandidat=kandidat("K-TEST-P-001"), als_benutzer=self.leitung)

	def test_uebernahme_prueft_kandidat(self):
		k = kandidat("K-TEST-P-002")
		k["geometrie"] = {"type": "Point", "coordinates": [13, 48]}
		with self.assertRaises(frappe.ValidationError):
			aufruf(geodaten.ziel_uebernehmen, kandidat=k, als_benutzer=self.akquise)
		k = kandidat("K-TEST-P-003")
		k["score"] = 250
		with self.assertRaises(frappe.ValidationError):
			aufruf(geodaten.ziel_uebernehmen, kandidat=k, als_benutzer=self.akquise)

	def test_kapazitaet(self):
		with self.assertRaises(frappe.ValidationError):
			aufruf(geodaten.kapazitaet_setzen, knotenId="osm-n1", daten={"kapazitaet": "knapp"}, als_benutzer=self.akquise)
		r = aufruf(geodaten.kapazitaet_setzen, knotenId="osm-n1", daten={"kapazitaet": "knapp", "freiMw": 0, "quelle": "Test-Auskunft", "stand": "2026-09-30"}, als_benutzer=self.akquise)
		self.assertEqual(r["kapazitaet"], "knapp")
		alle = aufruf(geodaten.kapazitaeten, als_benutzer=self.leitung)
		self.assertEqual(alle["osm-n1"]["kapazitaet"], "knapp")
		aufruf(geodaten.kapazitaet_setzen, knotenId="osm-n1", daten={"kapazitaet": "unbekannt", "quelle": "Test zurückgesetzt"}, als_benutzer=self.akquise)
		self.assertEqual(aufruf(geodaten.kapazitaeten, als_benutzer=self.akquise)["osm-n1"]["kapazitaet"], "unbekannt")
