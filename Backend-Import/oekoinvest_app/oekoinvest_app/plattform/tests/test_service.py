# Copyright (c) 2026, ÖkoInvest GmbH
#
# Dokumente, Signatur, Termine, Service & HR – Integrationstests mit Datenbank (bench run-tests --app oekoinvest_app
# --module oekoinvest_app.plattform.tests.test_service). Spiegel von scripts/plattform-test-service.mjs:
#   Signatur: fremdes Konto → PermissionError, Reihenfolge, falscher Code, Hash-Prüfung, Abschluss nur mit Original-Präfix
#   Termine: Doppelbuchung verhindert, Abwesenheit → Vertretung, öffentliche Buchung mit Token
#   Tickets: Rechte, interne Notizen unsichtbar · Wissen nur intern

import base64

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days

from oekoinvest_app.plattform.api import hr, signatur, support, termine
from oekoinvest_app.plattform.signatur import kern as sk
from oekoinvest_app.plattform.termine.slots import freie_slots, heute_tag
from oekoinvest_app.plattform.tests.testdaten import aufruf, konto, vorbereiten

PDF = b"%PDF-1.4\n1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n2 0 obj<< /Type /Pages /Kids [] /Count 0 >>endobj\ntrailer<< /Root 1 0 R /Size 3 >>\n%%EOF\n"


def _code(vorgang_id, konto_id):
	"""Code für den Test direkt setzen (die E-Mail wird im Test nicht gelesen)."""
	s = frappe.get_doc("Plattform Signaturvorgang", vorgang_id)
	u = next(x for x in s.unterzeichner if x.konto_id == konto_id)
	u.code_hash = sk.code_hash(s.name, u.name, "123456")
	u.code_ablauf = frappe.utils.add_to_date(frappe.utils.now_datetime(), minutes=10)
	u.code_verbraucht, u.code_versuche = 0, 0
	s.save(ignore_permissions=True)


class TestSignatur(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.a = konto(["flaeche"], vorname="Erste")
		cls.b = konto(["flaeche"], vorname="Zweite")
		cls.fremd = konto(["investor"], vorname="Fremd")
		cls.lesen = konto(["admin"], vorname="Lesen")
		frappe.db.set_value("Plattform Konto", cls.lesen, "backoffice_rollen", "lesen")

	def tearDown(self):
		frappe.set_user("Administrator")

	def _anlegen(self):
		email = lambda k: frappe.db.get_value("Plattform Konto", k, "email")  # noqa: E731
		return aufruf(signatur.anlegen, daten={"titel": "Testvertrag", "art": "sonstiges", "pdfBase64": base64.b64encode(PDF).decode(), "unterzeichner": [{"email": email(self.a)}, {"email": email(self.b)}]}, als_benutzer=self.admin)

	def test_rechte_und_reihenfolge(self):
		with self.assertRaises(frappe.PermissionError):
			aufruf(signatur.anlegen, daten={"titel": "X", "art": "nda", "pdfBase64": base64.b64encode(PDF).decode(), "unterzeichner": []}, als_benutzer=self.lesen)
		v = self._anlegen()
		self.assertEqual(v["dokument"]["sha256"], sk.sha256(PDF))
		with self.assertRaises(frappe.PermissionError):
			aufruf(signatur.holen, id=v["id"], als_benutzer=self.fremd)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(signatur.code_anfordern, id=v["id"], als_benutzer=self.b)  # noch nicht an der Reihe
		_code(v["id"], self.a)
		with self.assertRaises(frappe.ValidationError):
			aufruf(signatur.unterschreiben, id=v["id"], daten={"code": "000000", "art": "getippt", "name": "Erste Test", "zustimmung": True}, als_benutzer=self.a)
		r = aufruf(signatur.unterschreiben, id=v["id"], daten={"code": "123456", "art": "getippt", "name": "Erste Test", "zustimmung": True}, als_benutzer=self.a)
		self.assertFalse(r["abschlussNoetig"])
		_code(v["id"], self.b)
		r = aufruf(signatur.unterschreiben, id=v["id"], daten={"code": "123456", "art": "getippt", "name": "Zweite Test", "zustimmung": True}, als_benutzer=self.b)
		self.assertTrue(r["abschlussNoetig"])
		# Abschluss nur mit unverändertem Original als Präfix
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(signatur.abschliessen, id=v["id"], pdfBase64=base64.b64encode(b"%PDF-1.4 fremd" + PDF).decode(), als_benutzer=self.b)
		daten = aufruf(signatur.abschluss_daten, id=v["id"], als_benutzer=self.b)
		self.assertEqual(base64.b64decode(daten["originalBase64"]), PDF)
		signiert = PDF + b"3 0 obj<< /Type /Page >>endobj\n"
		fertig = aufruf(signatur.abschliessen, id=v["id"], pdfBase64=base64.b64encode(signiert).decode(), sha256=sk.sha256(signiert), als_benutzer=self.b)
		self.assertEqual(fertig["status"], "abgeschlossen")
		self.assertEqual(fertig["signiert"]["sha256"], sk.sha256(signiert))
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(signatur.widerrufen, id=v["id"], grund="zu spät", als_benutzer=self.admin)

	def test_hash_pruefung(self):
		v = self._anlegen()
		s = frappe.get_doc("Plattform Signaturvorgang", v["id"])
		f = frappe.get_doc("File", s.datei_id)
		with open(f.get_full_path(), "ab") as fh:
			fh.write(b"%manipuliert\n")
		_code(v["id"], self.a)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(signatur.unterschreiben, id=v["id"], daten={"code": "123456", "art": "getippt", "name": "Erste Test", "zustimmung": True}, als_benutzer=self.a)
		self.assertIn("hash_abweichung", [e["art"] for e in aufruf(signatur.holen, id=v["id"], als_benutzer=self.admin)["protokoll"]])


class TestTermine(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.leitung = konto(["admin"], vorname="Leitung")
		cls.akquise = konto(["admin"], vorname="Akquise")
		cls.kunde = konto(["flaeche"], vorname="Kunde")
		cls.fremd = konto(["flaeche"], vorname="Fremd")
		for k in (cls.leitung, cls.akquise):
			aufruf(termine.verfuegbarkeit_speichern, kontoId=k, daten={"terminarten": ["beratung_telefon"], "aktiv": True}, als_benutzer=cls.leitung)

	def tearDown(self):
		frappe.set_user("Administrator")

	def _slot(self, tag_offset=20):
		tag = str(add_days(heute_tag(), tag_offset))
		return freie_slots(von_tag=tag, bis_tag=tag, dauer=30, puffer=10, vorlauf_stunden=4)[2]["start"]

	def test_doppelbuchung(self):
		start = self._slot()
		gebucht = [aufruf(termine.buchen, daten={"art": "beratung_telefon", "start": start, "kontakt": {"name": f"Test {i}", "email": f"t{i}-{frappe.generate_hash(length=6)}@example.com"}, "einwilligung": True}) for i in range(2)]
		self.assertEqual(len({g["termin"]["mitarbeiter"]["name"] for g in gebucht}), 2)
		self.assertTrue(gebucht[0]["verwaltenToken"])
		with self.assertRaises(frappe.DuplicateEntryError):  # beide Mitarbeiter belegt
			aufruf(termine.buchen, daten={"art": "beratung_telefon", "start": start, "kontakt": {"name": "Dritte", "email": "t3@example.com"}, "einwilligung": True})
		r = aufruf(termine.per_token_aendern, token=gebucht[0]["verwaltenToken"], daten={"aktion": "stornieren"})
		self.assertEqual(r["status"], "storniert")

	def test_rechte(self):
		r = aufruf(termine.buchen, daten={"art": "beratung_telefon", "start": self._slot(21)}, als_benutzer=self.kunde)
		with self.assertRaises(frappe.PermissionError):
			aufruf(termine.holen, id=r["termin"]["id"], als_benutzer=self.fremd)
		with self.assertRaises(frappe.PermissionError):
			aufruf(termine.aendern, id=r["termin"]["id"], daten={"aktion": "bestaetigen"}, als_benutzer=self.kunde)
		self.assertIn("BEGIN:VCALENDAR", aufruf(termine.ics, id=r["termin"]["id"], als_benutzer=self.kunde)["ics"])

	def test_abwesenheit_vertretung(self):
		start = self._slot(22)
		t = aufruf(termine.buchen, daten={"art": "beratung_telefon", "start": start, "fuerKontoId": self.kunde, "mitarbeiterId": self.akquise}, als_benutzer=self.leitung)["termin"]
		tag = termine.lokal_tag_von(frappe.db.get_value("Plattform Termin", t["id"], "start"))
		r = aufruf(hr.abwesenheit_anlegen, daten={"mitarbeiterId": self.akquise, "von": tag, "bis": tag, "art": "urlaub", "vertretungId": self.leitung}, als_benutzer=self.leitung)
		self.assertEqual(r["vertretung"]["termine"], 1)
		self.assertEqual(frappe.db.get_value("Plattform Termin", t["id"], "mitarbeiter_id"), self.leitung)
		self.assertEqual(frappe.db.get_value("Plattform Termin", t["id"], "vertretung_fuer_id"), self.akquise)
		slots = aufruf(termine.slots, art="beratung_telefon", von=tag, bis=tag, mitarbeiterId=self.akquise, als_benutzer=self.leitung)["slots"]
		self.assertEqual(slots, [])


class TestSupportUndWissen(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.kunde = konto(["unternehmen"], vorname="Kunde")
		cls.fremd = konto(["unternehmen"], vorname="Fremd")
		cls.akquise = konto(["admin"], vorname="Akquise")
		frappe.db.set_value("Plattform Konto", cls.akquise, "backoffice_rollen", "akquise")

	def tearDown(self):
		frappe.set_user("Administrator")

	def test_ticket_rechte(self):
		t = aufruf(support.anlegen, daten={"betreff": "Frage zur Abrechnung", "text": "Bitte prüfen Sie den Abschlag.", "kategorie": "abrechnung"}, als_benutzer=self.kunde)
		with self.assertRaises(frappe.PermissionError):
			aufruf(support.holen, id=t["id"], als_benutzer=self.fremd)
		aufruf(support.antworten, id=t["id"], text="Interne Notiz", intern=True, als_benutzer=self.admin)
		aufruf(support.antworten, id=t["id"], text="Wir prüfen das.", als_benutzer=self.admin)
		sicht = aufruf(support.holen, id=t["id"], als_benutzer=self.kunde)
		self.assertFalse(any(m["intern"] for m in sicht["nachrichten"]))
		self.assertTrue(sicht["sla"]["geantwortet"])
		with self.assertRaises(frappe.PermissionError):
			aufruf(support.aktion, id=t["id"], daten={"aktion": "status", "status": "geloest"}, als_benutzer=self.kunde)
		with self.assertRaises(frappe.PermissionError):
			aufruf(support.antworten, id=t["id"], text="Akquise antwortet", als_benutzer=self.akquise)

	def test_wissen_nur_intern(self):
		with self.assertRaises(frappe.PermissionError):
			aufruf(hr.wissen, als_benutzer=self.kunde)
		a = aufruf(hr.wissen_speichern, daten={"titel": "Testartikel", "kategorie": "it", "inhalt": "Ein Artikel mit ausreichend Inhalt für den Test."}, als_benutzer=self.admin)
		b = aufruf(hr.wissen_speichern, daten={"id": a["id"], "titel": "Testartikel v2", "kategorie": "it", "inhalt": "Überarbeiteter Inhalt mit ausreichend Text."}, als_benutzer=self.admin)
		self.assertEqual((b["version"], len(b["versionen"])), (2, 1))
		self.assertTrue(any(x["id"] == a["id"] for x in aufruf(hr.wissen, q="Testartikel", als_benutzer=self.akquise)))

