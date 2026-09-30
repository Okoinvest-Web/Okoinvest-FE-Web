# Copyright (c) 2026, ÖkoInvest GmbH
# Portfolio (plattform/api/portfolio.py): Rechte (Investor nur eigene Positionen, Unterrollen), KYC-Pflicht, Monatserträge,
# Ausschüttungen (unveränderlich, Storno), Kapitalabrufe (Frist, Zusage, melden → bestätigen), Wiederverkauf → Börsen-Entwurf.
# Spiegel von scripts/plattform-test-portfolio.mjs (dort zusätzlich PDFs, Seiten und CSRF im Demo-Backend).

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from oekoinvest_app.plattform.api import portfolio
from oekoinvest_app.plattform.tests.testdaten import aufruf, konto, vorbereiten

VERIFIZIERT = {"verifiziert": True, "status": "verifiziert", "bank": {"vorhanden": True, "geprueft": True}}


class TestPortfolio(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.lesen = konto(["admin"], vorname="Lesen")
		frappe.db.set_value("Plattform Konto", cls.lesen, "backoffice_rollen", "lesen")
		cls.akquise = konto(["admin"], vorname="Akquise")
		frappe.db.set_value("Plattform Konto", cls.akquise, "backoffice_rollen", "akquise")
		cls.investor = konto(["investor"], vorname="Investor")
		cls.fremd = konto(["investor"], vorname="Fremd")

	def tearDown(self):
		frappe.set_user("Administrator")

	def anlegen(self, **d):
		with patch("oekoinvest_app.plattform.kyc_kern.kyc_status", return_value=VERIFIZIERT):
			return aufruf(portfolio.anlegen, daten={"investorId": self.investor, **d}, als_benutzer=self.admin)

	def aktion(self, pid, als=None, **d):
		with patch("oekoinvest_app.plattform.kyc_kern.kyc_status", return_value=VERIFIZIERT):
			return aufruf(portfolio.aktion, id=pid, daten=d, als_benutzer=als or self.admin)

	def test_kyc_und_rechte(self):
		with self.assertRaises(frappe.ValidationError):  # nicht verifiziert → 409 (Code „kyc“)
			aufruf(portfolio.anlegen, daten={"art": "bestand", "investorId": self.investor, "titel": "Ohne KYC", "kaufpreis": 1000000}, als_benutzer=self.admin)
		p = self.anlegen(art="bestand", titel="Testpark Rechte", kaufpreis=2000000, mwp=2, p50KwhJahr=2100000, verguetungCt=6.1, opexJahr=18000)
		self.assertEqual(p["status"], "betrieb")
		meine = aufruf(portfolio.meine, als_benutzer=self.investor)
		self.assertIn(p["id"], [x["id"] for x in meine["positionen"]])
		self.assertNotIn(p["id"], [x["id"] for x in aufruf(portfolio.meine, als_benutzer=self.fremd)["positionen"]])
		with self.assertRaises(frappe.DoesNotExistError):
			aufruf(portfolio.position, id=p["id"], als_benutzer=self.fremd)
		with self.assertRaises(frappe.PermissionError):
			aufruf(portfolio.uebersicht, als_benutzer=self.akquise)
		self.assertTrue(aufruf(portfolio.uebersicht, als_benutzer=self.lesen)["positionen"])
		with self.assertRaises(frappe.PermissionError):
			aufruf(portfolio.aktion, id=p["id"], daten={"aktion": "ertrag", "monat": "2026-01", "kwh": 1}, als_benutzer=self.lesen)
		with self.assertRaises(frappe.PermissionError):
			aufruf(portfolio.aktion, id=p["id"], daten={"aktion": "ertrag", "monat": "2026-01", "kwh": 1}, als_benutzer=self.investor)

	def test_ertrag_und_ausschuettung(self):
		p = self.anlegen(art="bestand", titel="Testpark Ertrag", kaufpreis=2000000, mwp=2, p50KwhJahr=2100000, verguetungCt=6.1, opexJahr=18000, inbetriebnahme="2024-01")
		monat = nowdate()[:7]
		vor = portfolio.K.monat_plus(monat, -1)
		r = self.aktion(p["id"], aktion="ertrag", monat=vor, kwh=180000, quelle="Test")
		self.assertTrue(any(m["ist"] == 180000 for m in r["ertrag"]["monate"]))
		with self.assertRaises(frappe.ValidationError):
			self.aktion(p["id"], aktion="ertrag", monat=portfolio.K.monat_plus(monat, 2), kwh=1)
		r = self.aktion(p["id"], aktion="ausschuettung", art="entnahme", periode=nowdate()[:4], betrag=25000, datum=nowdate())
		self.assertEqual(r["kennzahlen"]["ausgeschuettet"], 25000)
		aid = r["ausschuettungen"][0]["id"]
		with self.assertRaises(frappe.PermissionError):
			frappe.delete_doc("Plattform Ausschuettung", aid, ignore_permissions=True)
		r = self.aktion(p["id"], aktion="ausschuettung_storno", ausschuettungId=aid, grund="Fehlbuchung Test")
		self.assertEqual(r["kennzahlen"]["ausgeschuettet"], 0)
		with self.assertRaises(frappe.DuplicateEntryError):
			self.aktion(p["id"], aktion="ausschuettung_storno", ausschuettungId=aid, grund="Fehlbuchung Test")

	def test_kapitalabruf(self):
		p = self.anlegen(art="projekt", titel="Testprojekt Kapital", kaufpreis=500000, zusage=400000)
		with self.assertRaises(frappe.ValidationError):  # Frist < 10 Tage
			self.aktion(p["id"], aktion="abruf", betrag=100000, faelligAm=add_days(nowdate(), 3), zweck="Netzanschluss Test")
		with self.assertRaises(frappe.ValidationError):  # über der Zusage
			self.aktion(p["id"], aktion="abruf", betrag=500000, faelligAm=add_days(nowdate(), 20), zweck="Netzanschluss Test")
		r = self.aktion(p["id"], aktion="abruf", betrag=100000, faelligAm=add_days(nowdate(), 20), zweck="Netzanschluss Test")
		a = r["abrufe"][0]
		self.assertEqual((a["nummer"], a["status"]), (1, "angekuendigt"))
		r = aufruf(portfolio.portal_aktion, id=p["id"], daten={"aktion": "abruf_melden", "abrufId": a["id"], "referenz": "T-1"}, als_benutzer=self.investor)
		self.assertEqual(r["abrufe"][0]["status"], "gemeldet")
		r = self.aktion(p["id"], aktion="abruf_bestaetigen", abrufId=a["id"])
		self.assertEqual((r["abrufe"][0]["status"], r["kennzahlen"]["paidIn"]), ("bezahlt", 600000))
		with self.assertRaises(frappe.ValidationError):
			frappe.get_doc("Plattform Kapitalabruf", a["id"]).update({"betrag": 1}).save(ignore_permissions=True)

	def test_wiederverkauf(self):
		p = self.anlegen(art="bestand", titel="Testpark Verkauf", kaufpreis=3000000, mwp=3)
		with self.assertRaises(frappe.PermissionError):
			aufruf(portfolio.portal_aktion, id=p["id"], daten={"aktion": "wiederverkauf", "zeitpunkt": nowdate()[:7], "grund": "Test Wiederverkauf"}, als_benutzer=self.fremd)
		r = aufruf(portfolio.portal_aktion, id=p["id"], daten={"aktion": "wiederverkauf", "zeitpunkt": nowdate()[:7], "struktur": "share", "grund": "Test Wiederverkauf der Position", "preisvorstellung": 3200000}, als_benutzer=self.investor)
		self.assertEqual(r["status"], "verkauf_angefragt")
		r = self.aktion(p["id"], aktion="boerse")
		self.assertEqual(r["status"], "verkauf_boerse")
		bp = r["wiederverkauf"]["boerse"]
		self.assertEqual(frappe.db.get_value("Plattform Projekt", bp["id"], ["anbieter_id", "status"]), (self.investor, "entwurf"))
		r = aufruf(portfolio.portal_aktion, id=p["id"], daten={"aktion": "provision_akzeptieren"}, als_benutzer=self.investor)
		self.assertTrue(r["wiederverkauf"]["boerse"]["provisionAkzeptiert"])
