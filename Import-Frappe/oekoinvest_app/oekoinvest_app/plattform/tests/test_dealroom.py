# Copyright (c) 2026, ÖkoInvest GmbH
# Deal-Room: Anonymität im Q&A, verdeckte Gebote, Fristablauf, Zuschlag → reserviert → verkauft → Provision,
# Datenraum-Stufen, Zugriffsprotokoll, private Notizen. Spiegel von scripts/plattform-test-dealroom.mjs.

import json

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, now_datetime

from oekoinvest_app.plattform.api import bieter, dealroom, prozess, qa
from oekoinvest_app.plattform.dealroom_kern import anonymisieren, investor_stufe, pipeline_spalte, pseudonym_buchstabe
from oekoinvest_app.plattform.tests.testdaten import aufruf, interesse_mit_datenraum, konto, projekt_veroeffentlicht, vorbereiten


def _iso(tage):
	return (add_days(now_datetime(), tage)).isoformat()


class TestDealroomRegeln(FrappeTestCase):
	def test_anonymisieren(self):
		t, bereinigt = anonymisieren("Bitte an max@example.com oder +49 171 1234567, siehe www.example.com/x")
		self.assertTrue(bereinigt)
		self.assertNotIn("example.com", t)
		self.assertNotIn("1234567", t)

	def test_stufen_und_spalten(self):
		self.assertEqual(investor_stufe("gemerkt"), 0)
		self.assertEqual(investor_stufe("nda_freigegeben"), 1)
		self.assertEqual(investor_stufe("nda_freigegeben", verbindlich=True), 2)
		self.assertEqual(investor_stufe("loi_abgegeben"), 2)
		self.assertEqual(pipeline_spalte("nda_freigegeben", gebot_abgegeben=True), "angebot")
		self.assertEqual(pipeline_spalte("abgelehnt"), "verloren")
		self.assertEqual([pseudonym_buchstabe(i) for i in (0, 25, 26)], ["A", "Z", "AA"])


class TestDealroom(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.anbieter = konto(["anbieter"], vorname="Anbieterin")
		cls.a = konto(["investor"], vorname="Alma")
		cls.b = konto(["investor"], vorname="Bruno")
		cls.c = konto(["investor"], vorname="Carla")
		cls.pid = projekt_veroeffentlicht(cls.anbieter, cls.admin)
		cls.ia = interesse_mit_datenraum(cls.a, cls.admin, cls.pid)
		cls.ib = interesse_mit_datenraum(cls.b, cls.admin, cls.pid)

	def tearDown(self):
		frappe.set_user("Administrator")

	def test_zugang_nur_mit_datenraum(self):
		with self.assertRaises(frappe.PermissionError):
			aufruf(qa.liste, projektId=self.pid, als_benutzer=self.c)

	def test_qa_anonym(self):
		a_email = frappe.db.get_value("Plattform Konto", self.a, "email")
		f = aufruf(qa.frage_stellen, projektId=self.pid, kategorie="netz", text=f"Auflagen der Netzzusage? Bitte an {a_email}", als_benutzer=self.a)
		self.assertNotIn(a_email, f["text"])
		liste = aufruf(qa.liste, projektId=self.pid, als_benutzer=self.anbieter)
		self.assertFalse(any(x["id"] == f["id"] for x in liste["fragen"]))
		with self.assertRaises(frappe.PermissionError):
			aufruf(qa.aktion, id=f["id"], daten={"aktion": "freigeben"}, als_benutzer=self.anbieter)
		aufruf(qa.aktion, id=f["id"], daten={"aktion": "freigeben", "fristTage": 3}, als_benutzer=self.admin)
		liste = aufruf(qa.liste, projektId=self.pid, als_benutzer=self.anbieter)
		roh = json.dumps(liste, ensure_ascii=False)
		self.assertNotIn(self.a, roh)
		self.assertNotIn(a_email, roh)
		aufruf(qa.aktion, id=f["id"], daten={"aktion": "antworten", "antwort": "Keine Auflagen.", "oeffentlich": True}, als_benutzer=self.anbieter)
		aufruf(qa.aktion, id=f["id"], daten={"aktion": "antwortFreigeben"}, als_benutzer=self.admin)
		b_liste = aufruf(qa.liste, projektId=self.pid, als_benutzer=self.b)
		eintrag = next(x for x in b_liste["fragen"] if x["id"] == f["id"])
		self.assertEqual(eintrag["von"], "Anderer Interessent")
		self.assertNotIn(self.anbieter, json.dumps(b_liste))

	def test_z_bieterverfahren_bis_provision(self):  # läuft zuletzt (Verkauf beendet den Deal)
		self._bieter()

	def _bieter(self):
		vf = aufruf(bieter.starten, daten={"projektId": self.pid, "frist": _iso(2), "pflicht": ["finanzierung"]}, als_benutzer=self.admin)
		ga = aufruf(bieter.gebot_abgeben, daten={"verfahrenId": vf["id"], "preisModus": "gesamt", "preis": 700000, "finanzierung": "Eigenkapital"}, als_benutzer=self.a)
		aufruf(bieter.gebot_abgeben, daten={"verfahrenId": vf["id"], "preisModus": "gesamt", "preis": 750000, "finanzierung": "Bank"}, als_benutzer=self.b)
		sicht = aufruf(bieter.verfahren, projektId=self.pid, als_benutzer=self.a)
		self.assertEqual(len(sicht["verfahren"]["eigeneGebote"]), 1)
		self.assertNotIn("750000", json.dumps(sicht))
		self.assertIsNone(aufruf(bieter.verfahren, projektId=self.pid, als_benutzer=self.anbieter)["verfahren"]["matrix"])
		aufruf(bieter.aktion, id=vf["id"], daten={"aktion": "beenden"}, als_benutzer=self.admin)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(bieter.gebot_abgeben, daten={"verfahrenId": vf["id"], "preisModus": "gesamt", "preis": 800000, "finanzierung": "EK"}, als_benutzer=self.a)
		aufruf(bieter.aktion, id=vf["id"], daten={"aktion": "zuschlag", "gebotId": ga["id"]}, als_benutzer=self.admin)
		self.assertEqual(frappe.db.get_value("Plattform Interesse", self.ia, "status"), "loi_angenommen")
		self.assertEqual(frappe.db.get_value("Plattform Projekt", self.pid, "status"), "reserviert")
		aufruf(prozess.status_wechsel, art="projekt", id=self.pid, nach="verkauft", als="admin", extra={"interesseId": self.ia, "kaufpreis": 700000}, als_benutzer=self.admin)
		pv = frappe.db.get_value("Plattform Provision", {"projekt_id": self.pid}, ["betrag", "interesse_id"], as_dict=True)
		self.assertEqual(int(pv.betrag), 14000)
		self.assertEqual(pv.interesse_id, self.ia)

	def test_notiz_privat(self):
		aufruf(dealroom.notiz_speichern, projektId=self.pid, text="Geheim", tags=["#Prio"], als_benutzer=self.a)
		b = aufruf(dealroom.pipeline, als_benutzer=self.b)
		self.assertNotIn("Geheim", json.dumps(b, ensure_ascii=False))
		a = aufruf(dealroom.pipeline, als_benutzer=self.a)
		karte = next(k for k in a["karten"] if k["projekt"]["id"] == self.pid)
		self.assertEqual(karte["notiz"]["tags"], ["Prio"])
