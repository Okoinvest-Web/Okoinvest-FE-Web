# Copyright (c) 2026, ÖkoInvest GmbH
# Finanzierung (Frappe): Spiegel von scripts/plattform-test-finanzierung.mjs – Bank sieht nur Anfragen IHRER Bank und darin
# nur freigegebene Bausteine, Einladung nur mit eingeladener E-Mail, Entscheidung nur Leitung, Investor-Cockpit nur mit
# Datenraum-Freigabe, Szenarien nur eigene. Reine Regeln: test_finanzierung_kern.py.

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import finanzierung as FZ
from oekoinvest_app.plattform.tests.testdaten import aufruf, interesse_mit_datenraum, konto, projekt_veroeffentlicht, vorbereiten

TS = {"betrag": 4_000_000, "laufzeitJahre": 18, "zinsArt": "fix", "zinsPct": 4.3, "dscrCovenant": 1.05, "dscrLockup": 1.1}


class TestFinanzierung(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		frappe.conf.developer_mode = 1  # Einladungslinks in der Antwort (nur Entwicklung)
		cls.admin = konto(["admin"])
		cls.trans = konto(["admin"], vorname="Transaktion")
		frappe.db.set_value("Plattform Konto", cls.trans, "backoffice_rollen", "transaktion")
		cls.investor = konto(["investor"])
		cls.fremd = konto(["investor"], vorname="Fremd")
		cls.bank_konto = konto(["unternehmen"], vorname="Bank")
		cls.bank_email = frappe.db.get_value("Plattform Konto", cls.bank_konto, "email")

	def _fall(self):
		return aufruf(FZ.fall_anlegen, daten={"bezugArt": "frei", "titel": "Test Solarpark", "eingaben": {"mwp": 10, "land": "DE", "capex": 5_000_000, "fkQuote": 0.75}}, als_benutzer=self.admin)

	def test_bank_sieht_nur_freigegebenes(self):
		f = self._fall()
		b1 = aufruf(FZ.bank_speichern, daten={"name": "Testbank A", "email": self.bank_email}, als_benutzer=self.admin)
		b2 = aufruf(FZ.bank_speichern, daten={"name": "Testbank B", "email": "b@example.com"}, als_benutzer=self.admin)
		aufruf(FZ.aktion, fallId=f["id"], daten={"aktion": "paket", "freigabe": ["steckbrief"]}, als_benutzer=self.admin)
		r = aufruf(FZ.aktion, fallId=f["id"], daten={"aktion": "anfragen", "bankIds": [b1["id"], b2["id"]], "basisUrl": "https://plattform-test.example.com"}, als_benutzer=self.admin)
		link = next(x["link"] for x in r["demoLinks"] if x["bankId"] == b1["id"])
		token = link.split("/einladung/bank/")[1]
		with self.assertRaises(frappe.PermissionError):
			aufruf(FZ.bank_einladung_annehmen, token=token, als_benutzer=self.fremd)
		ang = aufruf(FZ.bank_einladung_annehmen, token=token, als_benutzer=self.bank_konto)
		a1 = ang["anfrageId"]
		a2 = next(a["id"] for a in r["fall"]["anfragen"] if a["bankId"] == b2["id"])
		sicht = aufruf(FZ.bank_anfrage, anfrageId=a1, als_benutzer=self.bank_konto)
		self.assertEqual([b["id"] for b in sicht["paket"]], ["steckbrief"])
		with self.assertRaises(frappe.PermissionError):
			aufruf(FZ.bank_anfrage, anfrageId=a2, als_benutzer=self.bank_konto)
		with self.assertRaises(frappe.PermissionError):
			aufruf(FZ.modell_daten, anfrageId=a1, baustein="financial_model", als_benutzer=self.bank_konto)
		aufruf(FZ.bank_aktion, anfrageId=a1, daten={"aktion": "termsheet", "termsheet": TS}, als_benutzer=self.bank_konto)
		with self.assertRaises(frappe.PermissionError):
			aufruf(FZ.aktion, fallId=f["id"], daten={"aktion": "entscheidung", "anfrageId": a1, "begruendung": "Bestes Angebot"}, als_benutzer=self.trans)
		aufruf(FZ.aktion, fallId=f["id"], daten={"aktion": "entscheidung", "anfrageId": a1, "begruendung": "Bestes Angebot laut Vergleich"}, als_benutzer=self.admin)
		with self.assertRaises(frappe.DuplicateEntryError):  # konflikt(): Entscheidung gefallen
			aufruf(FZ.bank_aktion, anfrageId=a1, daten={"aktion": "termsheet", "termsheet": TS}, als_benutzer=self.bank_konto)

	def test_cockpit_nur_mit_datenraum(self):
		anbieter = konto(["anbieter"])
		pid = projekt_veroeffentlicht(anbieter, self.admin)
		with self.assertRaises(frappe.PermissionError):
			aufruf(FZ.cockpit_projekt, projektId=pid, als_benutzer=self.investor)
		interesse_mit_datenraum(self.investor, self.admin, pid)
		d = aufruf(FZ.cockpit_projekt, projektId=pid, als_benutzer=self.investor)
		self.assertIn(d["zugriff"], ("nda",))
		s = aufruf(FZ.szenario_speichern, projektId=pid, name="Test", eingaben={"mwp": 10}, ergebnis={"varianten": []}, als_benutzer=self.investor)
		with self.assertRaises(frappe.PermissionError):
			aufruf(FZ.szenario, id=s["id"], als_benutzer=self.fremd)
