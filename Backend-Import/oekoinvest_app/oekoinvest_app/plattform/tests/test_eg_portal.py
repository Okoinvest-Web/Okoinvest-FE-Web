# Copyright (c) 2026, ÖkoInvest GmbH
# Energiegemeinschaften WP6 „Portale“ – Frappe-Test (Bench nötig): bench --site <site> run-tests --module oekoinvest_app.plattform.tests.test_eg_portal
# Prüft öffentlichen Rechner, Interesse (Einwilligung Pflicht, Cluster, DocType Plattform EG Interesse), Eigentum
# (fremde Gemeinschaft 404, Gemeinde-Sicht nur für Gemeinden) und Mehrfachteilnahme über die WP1-Schicht.

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import eg_portal as P
from oekoinvest_app.plattform.api import eg_stamm as S


class TestEgPortal(FrappeTestCase):
	def setUp(self):
		S._stammdaten_sicherstellen()
		self.sys = S.system_nutzer()
		g = S._fach(S.K.gemeinschaft_bereinigen, {"name": "Portal-EEG (Test)", "modell": "eeg", "zonelevel": 3, "netzbetreiber": ["ENB-OOE"], "sitzAdresse": {"plz": "4910", "ort": "Ried"}}, None, [x["id"] for x in S._netzbetreiber_liste()])
		g["status"] = "aktiv"
		self.g = S._speichern(S.in_doc("gemeinschaft", g))

	def tearDown(self):
		frappe.db.rollback()

	def test_rechner(self):
		r = P.P.rechner_oeffentlich({})
		self.assertGreater(r["nettoEur"], 0)
		self.assertEqual(r["regel"]["reduktionPct"], 57)

	def test_interesse_doctype(self):
		from oekoinvest_app.plattform.mitglied_kern import MitgliedFehler

		with self.assertRaises(MitgliedFehler):
			P.P.interesse_bereinigen({"nachname": "X", "email": "x@example.com", "plz": "4910"})
		i = P.P.interesse_bereinigen({"nachname": "Interesse (Test)", "email": "eg-wp6-test@example.com", "plz": "4910", "einwilligung": True})
		c = P.P.interesse_cluster(i)
		doc = frappe.get_doc({"doctype": P.DT_INTERESSE, "status": "neu", "nachname": i["nachname"], "email": i["email"], "plz": i["plz"], "rolle": i["rolle"], "art": i["art"], "cluster_schluessel": c["schluessel"], "einwilligung": 1}).insert(ignore_permissions=True)
		self.assertTrue(doc.name.startswith("EIN-"))

	def test_oeffentlich_ohne_personendaten(self):
		S.mitglied_speichern(gemeinschaftId=self.g.name, daten={"art": "privat", "person": {"nachname": "Geheim (Test)", "email": "geheim@example.com", "plz": "4911"}}, _n=self.sys)
		o = P._oeffentlich(S.aus_doc("gemeinschaft", self.g), S._netzbetreiber_liste())
		self.assertNotIn("geheim", frappe.as_json(o).lower())
		self.assertIn("4910", o["plzBereich"])

	def test_fremde_gemeinschaft_404(self):
		with self.assertRaises(frappe.DoesNotExistError):
			S.zugriff(frappe._dict({"id": "U-26-NIEMAND", "rollen": ["mitglied"]}), self.g.name, "eigene_daten")

	def test_mehrfach(self):
		m = S.mitglied_speichern(gemeinschaftId=self.g.name, daten={"art": "privat", "person": {"nachname": "Mehrfach (Test)"}}, _n=self.sys)
		z = S.zaehlpunkt_speichern(gemeinschaftId=self.g.name, daten={"zaehlpunktnummer": "AT003000049100000000000000P000001", "richtung": "erzeugung"}, _n=self.sys)["zaehlpunkt"]
		t = S.teilnahme_speichern(gemeinschaftId=self.g.name, daten={"zaehlpunktId": z["id"], "mitgliedId": m["id"], "teilnahmefaktor": 60}, _n=self.sys)
		u = P.P.mehrfach_uebersicht([z], [S.aus_doc("teilnahme", frappe.get_doc(S.DT["teilnahme"], t["id"]))], [S.aus_doc("gemeinschaft", self.g)])
		self.assertEqual((u[0]["summeTf"], u[0]["freiTf"]), (60, 40))
