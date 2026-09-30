# Copyright (c) 2026, ÖkoInvest GmbH
#
# Staatliche eID über die whitelisted Methoden (Spiegel von scripts/plattform-test-eid.mjs, Abschnitt Server): Start,
# Simulator nur für den eigenen Vorgang, Rücksprung ohne Bindung/fremdes Konto/Wiederholung, LoA zu niedrig, falsche
# nonce/PKCE, Nachweis ohne Klartext-bPK, Compliance-Regel. Nur auf einer Test-Site (developer_mode bzw.
# oekoinvest_eid_demo = 1) ausführen: bench --site test run-tests --module oekoinvest_app.plattform.tests.test_eid

from urllib.parse import parse_qs, urlsplit

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import eid
from oekoinvest_app.plattform.tests.testdaten import aufruf, konto, vorbereiten


def _q(url):
	return {k: v[0] for k, v in parse_qs(urlsplit(url).query).items()}


class TestEid(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		frappe.conf.oekoinvest_eid_demo = 1
		cls.inv = konto(["investor"], vorname="Anna")
		cls.fremd = konto(["investor"], vorname="Fred")
		cls.comp = konto(["admin"], vorname="Compliance")
		frappe.db.set_value("Plattform Konto", cls.comp, "backoffice_rollen", "compliance")

	def tearDown(self):
		frappe.set_user("Administrator")

	def _lauf(self, wer, methode="id_austria", auswahl="hoch", nonce=None, challenge=None):
		s = aufruf(eid.eid_starten, methode=methode, basisUrl="https://test.example", als_benutzer=wer)
		q = _q(s["url"])
		r = aufruf(eid.eid_demo_code, state=q["state"], nonce=nonce or q["nonce"], codeChallenge=challenge or q["code_challenge"], auswahl=auswahl, als_benutzer=wer)
		return s, _q(r["url"])

	def test_ablauf_und_schutz(self):
		s, r = self._lauf(self.inv)
		self.assertTrue(s["url"].startswith("/portal/eid/demo?") and s["bindung"])
		self.assertEqual(_q(s["url"])["code_challenge_method"], "S256")
		# fremdes Konto
		with self.assertRaises(frappe.ValidationError):
			aufruf(eid.eid_abschluss, state=r["state"], code=r["code"], bindung=s["bindung"], als_benutzer=self.fremd)
		# ohne Bindung → verbraucht
		x = aufruf(eid.eid_abschluss, state=r["state"], code=r["code"], bindung="falsch", als_benutzer=self.inv)
		self.assertEqual(x["vorgang"]["status"], "fehler")
		with self.assertRaises(frappe.DuplicateEntryError):  # verbraucht (409)
			aufruf(eid.eid_abschluss, state=r["state"], code=r["code"], bindung=s["bindung"], als_benutzer=self.inv)
		# regulär
		s, r = self._lauf(self.inv)
		x = aufruf(eid.eid_abschluss, state=r["state"], code=r["code"], bindung=s["bindung"], als_benutzer=self.inv)
		self.assertEqual(x["vorgang"]["status"], "bestanden", x)
		self.assertEqual(x["vorgang"]["nachweis"]["vertrauensniveau"], "hoch")
		d = frappe.get_doc(eid.DT, x["vorgang"]["id"])
		self.assertTrue(d.bpk_hash and "XFN" not in (d.bpk_hash or ""))
		self.assertFalse(d.get_password("verifier", raise_exception=False))
		with self.assertRaises(frappe.DuplicateEntryError):  # Replay (409)
			aufruf(eid.eid_abschluss, state=r["state"], code=r["code"], bindung=s["bindung"], als_benutzer=self.inv)

	def test_negativ(self):
		for auswahl, nonce, challenge, erwartet in (("substanziell", None, None, "abgelehnt"), ("hoch", "falsch", None, "fehler"), ("hoch", None, "A" * 43, "fehler")):
			s, r = self._lauf(self.inv, auswahl=auswahl, nonce=nonce, challenge=challenge)
			x = aufruf(eid.eid_abschluss, state=r["state"], code=r["code"], bindung=s["bindung"], als_benutzer=self.inv)
			self.assertEqual(x["vorgang"]["status"], erwartet, (auswahl, nonce, challenge))

	def test_regel(self):
		with self.assertRaises(frappe.PermissionError):
			aufruf(eid.eid_einstellungen_speichern, daten={"hochBestaetigt": True}, als_benutzer=self.inv)
		aufruf(eid.eid_einstellungen_speichern, daten={"hochBestaetigt": True}, als_benutzer=self.comp)
		try:
			s, r = self._lauf(self.fremd, methode="online_ausweis")
			x = aufruf(eid.eid_abschluss, state=r["state"], code=r["code"], bindung=s["bindung"], als_benutzer=self.fremd)
			self.assertTrue(x["vorgang"]["nachweis"]["identitaetBestaetigt"], x)
		finally:
			aufruf(eid.eid_einstellungen_speichern, daten={"hochBestaetigt": False}, als_benutzer=self.comp)
