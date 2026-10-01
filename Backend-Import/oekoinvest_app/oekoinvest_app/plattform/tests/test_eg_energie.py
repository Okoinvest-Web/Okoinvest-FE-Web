# Copyright (c) 2026, ÖkoInvest GmbH
# WP3 Energiedaten – Frappe-Test (Bench): Tagesblöcke speichern, Nachlieferung mit Historie, Monatsaggregat, Idempotenz.
#   bench --site <site> run-tests --module oekoinvest_app.plattform.tests.test_eg_energie
# Die Rechenregeln selbst prüft test_eg_energie_kern.py ohne Frappe (Gleichheit mit dem JS-Kern).

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform import eg_energie_kern as K
from oekoinvest_app.plattform.api import eg_energie as A

ZP = "AT0030000491000000000000TEST00001"


class TestEgEnergie(FrappeTestCase):
	def setUp(self):
		name = frappe.db.get_value("Plattform EG Zaehlpunkt", {"zaehlpunktnummer": ZP}, "name")
		if not name:
			doc = frappe.get_doc({"doctype": "Plattform EG Zaehlpunkt", "zaehlpunktnummer": ZP, "richtung": "verbrauch"})
			doc.insert(ignore_permissions=True)
			name = doc.name
		self.zp = name

	def tearDown(self):
		frappe.db.rollback()

	def _block(self, werte, q, quelle):
		return K.block_bereinigen({"zaehlpunktId": self.zp, "gemeinschaftId": "", "tag": "2026-06-01", "groesse": "eigendeckung", "werte": werte, "qualitaet": q, "quelle": quelle, "empfangenAm": "2026-06-02T08:00:00.000Z"})

	def test_speichern_nachliefern_monat(self):
		b1 = self._block([0.1] * 96, ["L3"] * 96, {"art": "eda", "nachrichtId": "EDN-T1", "messageId": "M-T1"})
		r = A._einarbeiten("", [b1], "2026-06-02T08:00:00.000Z")
		self.assertEqual(r["bloecke"], 1)
		gespeichert = A._bloecke("", "2026-06-01", "2026-06-01", self.zp)
		self.assertEqual(len(gespeichert), 1)
		self.assertEqual(gespeichert[0]["l3"], 96)
		self.assertFalse(gespeichert[0]["abrechenbar"])
		b2 = self._block([0.2] * 96, ["L1"] * 96, {"art": "eda", "nachrichtId": "EDN-T2", "messageId": "M-T2"})
		A._einarbeiten("", [b2], "2026-06-05T08:00:00.000Z")
		neu = A._bloecke("", "2026-06-01", "2026-06-01", self.zp)[0]
		self.assertEqual(neu["version"], 2)
		self.assertEqual(len(neu["historie"]), 1)
		self.assertTrue(neu["abrechenbar"])
		self.assertAlmostEqual(neu["summeKwh"], 19.2, 9)
		monat = frappe.get_all("Plattform EG Messmonat", filters={"zaehlpunkt": self.zp, "monat": "2026-06", "groesse": "eigendeckung"}, fields=["summe_kwh", "werte_ist", "vollstaendig"])
		self.assertEqual(len(monat), 1)
		self.assertAlmostEqual(monat[0].summe_kwh, 19.2, 6)
		self.assertFalse(monat[0].vollstaendig)  # nur ein Tag des Monats geliefert

	def test_l3_ueberschreibt_l1_nicht(self):
		A._einarbeiten("", [self._block([0.2] * 96, ["L1"] * 96, {"art": "eda"})], "x")
		r = A._einarbeiten("", [self._block([9.0] * 96, ["L3"] * 96, {"art": "eda"})], "y")
		self.assertEqual(r["konflikte"], 96)
		self.assertAlmostEqual(A._bloecke("", "2026-06-01", "2026-06-01", self.zp)[0]["summeKwh"], 19.2, 9)

	def test_methoden_ohne_anmeldung(self):
		self.assertRaises(Exception, A.messreihen, filter={"gemeinschaftId": "EGG-00-NICHTDA"}, als_benutzer=None)
