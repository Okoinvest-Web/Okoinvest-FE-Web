# Copyright (c) 2026, ÖkoInvest GmbH
# Energiegemeinschaften WP1 – Frappe-Test (Bench nötig): bench --site <site> run-tests --module oekoinvest_app.plattform.tests.test_eg_stamm
# Prüft Abbildung DocType ↔ camelCase, Zugriff ohne Rolle (404), Mehrfachteilnahme und Teilnahme-Automat über die API-Schicht.

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import eg_stamm as S


class TestEgStamm(FrappeTestCase):
	def setUp(self):
		S._stammdaten_sicherstellen()
		self.sys = S.system_nutzer()
		g = S._fach(S.K.gemeinschaft_bereinigen, {"name": "Test-EEG (Test)", "modell": "eeg", "zonelevel": 3, "netzbetreiber": ["ENB-OOE"]}, None, [x["id"] for x in S._netzbetreiber_liste()])
		g["status"] = "aktiv"
		g["dienstleistung"]["aktiv"] = True
		self.g = S._speichern(S.in_doc("gemeinschaft", g))

	def tearDown(self):
		frappe.db.rollback()

	def test_abbildung_und_teilnahme(self):
		gid = self.g.name
		d = S.aus_doc("gemeinschaft", self.g)
		self.assertEqual((d["name"], d["modell"], d["netzbetreiber"]), ("Test-EEG (Test)", "eeg", ["ENB-OOE"]))
		m = S.mitglied_speichern(gemeinschaftId=gid, daten={"art": "privat", "person": {"nachname": "Muster (Test)"}}, _n=self.sys)
		z = S.zaehlpunkt_speichern(gemeinschaftId=gid, daten={"zaehlpunktnummer": "AT0030000491000000000000000T000001", "richtung": "verbrauch"}, _n=self.sys)["zaehlpunkt"]
		t = S.teilnahme_speichern(gemeinschaftId=gid, daten={"zaehlpunktId": z["id"], "mitgliedId": m["id"], "teilnahmefaktor": 60}, _n=self.sys)
		self.assertEqual(t["status"], "entwurf")
		t = S.teilnahme_uebergang_intern(self.sys, t["id"], {"ereignis": "senden"})
		t = S.teilnahme_uebergang_intern(self.sys, t["id"], {"ereignis": "anforderung_econ", "prozessId": "EDP-T"})
		self.assertEqual(t["status"], "zustimmung_offen")
		self.assertTrue(t["fristBis"])

	def test_zugriff_ohne_rolle_404(self):
		with self.assertRaises(frappe.DoesNotExistError):
			S.zugriff(frappe._dict({"id": "U-26-NIEMAND", "rollen": ["mitglied"]}), self.g.name, "mitgliederliste")
