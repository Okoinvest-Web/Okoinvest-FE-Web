# Copyright (c) 2026, ÖkoInvest GmbH
# Fachprüfung Flächen & Kommunen – API-Tests (bench run-tests --app oekoinvest_app --module oekoinvest_app.plattform.tests.test_flaeche_fach)
# Flurstücke je Land, Fachangaben, Pflichtangaben beim Einreichen, Pachtangebot, Gemeinde-Sicht, Rechte.

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import anfrage, flaeche, kommune, prozess
from oekoinvest_app.plattform.tests.testdaten import aufruf, konto, vorbereiten


def _daten(**x):
	return {"bezeichnung": "Fachtest (Test)", "land": "DE", "bundesland": "Bayern", "plz": "86842", "ort": "Testort", "ha": 5, "nutzung": "acker", "eigentum": "eigentum", **x}


class TestFlaecheFach(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.eigen = konto(["flaeche"])
		cls.fremd = konto(["flaeche"])
		cls.landwirt = konto(["landwirt"])

	def tearDown(self):
		frappe.set_user("Administrator")

	def test_flurstuecke_je_land(self):
		f = aufruf(flaeche.anlegen, daten=_daten(flurstuecke=[{"gemarkung": "Testfeld", "flur": "3", "nummer": "211/3", "blatt": "1234", "m2": "50.000"}]), ip="127.0.0.1", als_benutzer=self.eigen)
		self.assertEqual(f["flurstuecke"][0]["nummer"], "211/3")
		self.assertEqual(f["flurstuecke"][0]["m2"], 50000)
		self.assertEqual(f["flurstuecke"][0]["blatt"], "1234")
		with self.assertRaises(frappe.ValidationError):
			aufruf(flaeche.anlegen, daten=_daten(flurstuecke=[{"gemarkung": "Testfeld", "nummer": "21a"}]), ip="127.0.0.1", als_benutzer=self.eigen)
		at = aufruf(flaeche.anlegen, daten=_daten(land="AT", bundesland="Oberösterreich", flurstuecke=[{"gemarkung": "Testdorf", "gemarkungNr": "46123", "nummer": ".12", "blatt": "87"}]), ip="127.0.0.1", als_benutzer=self.eigen)
		self.assertEqual(at["flurstuecke"][0]["gemarkungNr"], "46123")
		with self.assertRaises(frappe.ValidationError):
			aufruf(flaeche.anlegen, daten=_daten(land="AT", bundesland="Oberösterreich", flurstuecke=[{"gemarkungNr": "4612", "nummer": "1"}]), ip="127.0.0.1", als_benutzer=self.eigen)
		ch = aufruf(flaeche.anlegen, daten=_daten(land="CH", bundesland="Bern", flurstuecke=[{"gemarkung": "Bern", "nummer": "1234-1", "egrid": "ch 1234 5678 9012"}]), ip="127.0.0.1", als_benutzer=self.eigen)
		self.assertEqual(ch["flurstuecke"][0]["egrid"], "CH123456789012")

	def test_pflicht_beim_einreichen(self):
		with self.assertRaises(frappe.ValidationError):
			aufruf(flaeche.anlegen, daten=_daten(nutzung="dach", ha=0.4, einreichen=True), ip="127.0.0.1", als_benutzer=self.eigen)
		f = aufruf(flaeche.anlegen, daten=_daten(nutzung="dach", ha=0.4, einreichen=True, fach={"dach": {"dachart": "trapez", "asbest": "nein", "nutzer": "eigen"}}), ip="127.0.0.1", als_benutzer=self.eigen)
		self.assertEqual(f["status"], "eingegangen")
		with self.assertRaises(frappe.ValidationError):
			aufruf(flaeche.anlegen, daten=_daten(ha=12, einreichen=True, flurstuecke=[{"gemarkung": "A", "nummer": "1", "m2": 100000}]), ip="127.0.0.1", als_benutzer=self.eigen)
		with self.assertRaises(frappe.ValidationError):
			aufruf(flaeche.anlegen, daten=_daten(agri=True, einreichen=True), ip="127.0.0.1", als_benutzer=self.landwirt)
		a = aufruf(flaeche.anlegen, daten=_daten(agri=True, einreichen=True, fach={"agri": {"kultur": "getreide", "kategorie": "2", "gassenbreiteM": "12"}}), ip="127.0.0.1", als_benutzer=self.landwirt)
		self.assertEqual(a["fach"]["agri"]["gassenbreiteM"], 12)

	def test_rechte_unveraendert(self):
		f = aufruf(flaeche.anlegen, daten=_daten(), ip="127.0.0.1", als_benutzer=self.eigen)
		with self.assertRaises(frappe.PermissionError):
			aufruf(flaeche.aendern, id=f["id"], daten=_daten(fach={"boden": {"ackerzahl": 40}}), als_benutzer=self.fremd)
		neu = aufruf(flaeche.aendern, id=f["id"], daten=_daten(fach={"boden": {"ackerzahl": 40}}), als_benutzer=self.eigen)
		self.assertEqual(neu["fach"]["boden"]["ackerzahl"], 40)

	def test_pachtangebot_vollstaendig(self):
		f = aufruf(flaeche.anlegen, daten=_daten(einreichen=True), ip="127.0.0.1", als_benutzer=self.eigen)
		for nach in ("vorpruefung", "standortanalyse"):
			aufruf(prozess.status_wechsel, art="flaeche", id=f["id"], nach=nach, als="admin", als_benutzer=self.admin)
		with self.assertRaises(frappe.ValidationError):
			aufruf(prozess.status_wechsel, art="flaeche", id=f["id"], nach="pachtangebot", als="admin", extra={"pachtangebot": {"modell": "umsatz", "laufzeitJahre": 30}}, als_benutzer=self.admin)
		aufruf(prozess.status_wechsel, art="flaeche", id=f["id"], nach="pachtangebot", als="admin", extra={"pachtangebot": {"euroProHaJahr": "2.600", "laufzeitJahre": 30, "indexierung": "vpi", "rueckbau": "buergschaft", "boese": 1}}, als_benutzer=self.admin)
		pa = aufruf(flaeche.holen, id=f["id"], als_benutzer=self.eigen)["pachtangebot"]
		self.assertEqual(pa["euroProHaJahr"], 2600)
		self.assertEqual(pa["rueckbau"], "buergschaft")
		self.assertNotIn("boese", pa)

	def test_kommune_sicht(self):
		with self.assertRaises(frappe.ValidationError):
			aufruf(anfrage.anlegen, typ="kommune", kontakt={"vorname": "K", "nachname": "Test", "email": "k-ungueltig@example.com", "land": "DE"}, daten={"gemeindeSchluessel": "123"}, herkunft={}, ip="127.0.0.1", einwilligungText="Test")
		r = aufruf(kommune.uebersicht, als_benutzer=self.fremd)
		self.assertEqual(r["anliegen"], [])
		self.assertEqual(r["gemeinden"], [])
		r = aufruf(kommune.uebersicht, als_benutzer=self.admin)
		self.assertTrue(r["admin"])
		self.assertEqual(r["gemeinden"], [])
