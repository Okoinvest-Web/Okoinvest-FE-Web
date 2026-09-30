# Copyright (c) 2026, ÖkoInvest GmbH
# Backoffice-Ausbau: Hash-Kette (Manipulation erkennen), Unterrollen (403), Automationen (feuert / feuert nicht,
# Schleifenschutz), CRM-Lead aus Anfrage und Dublettenerkennung. Aufruf: bench --site <site> run-tests --app oekoinvest_app

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform import backoffice as bo
from oekoinvest_app.plattform.api import anfrage, automation, berichte, crm
from oekoinvest_app.plattform.hashkette import KETTE_START, eintrag_hash, verify_chain
from oekoinvest_app.plattform.kern import protokoll
from oekoinvest_app.plattform.rechte import stufe
from oekoinvest_app.plattform.tests.testdaten import aufruf, konto, vorbereiten


def _kette(anzahl=5):
	liste, prev = [], KETTE_START
	for i in range(anzahl):
		e = {"id": f"A-26-TEST0{i}", "am": f"2026-09-01T10:0{i}:00.000Z", "nutzerId": "U-26-TESTER", "aktion": "status", "objektArt": "vorgang", "objektId": f"V-26-TEST0{i}", "text": f"Eintrag {i}", "ip": ""}
		e["prevHash"] = prev
		e["hash"] = eintrag_hash(prev, e)
		prev = e["hash"]
		liste.append(e)
	return liste


class TestBackoffice(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])

	def tearDown(self):
		frappe.set_user("Administrator")

	# ------------------------------------------------------------ Hash-Kette

	def test_hashkette_erkennt_manipulation(self):
		k = _kette()
		self.assertTrue(verify_chain(k)["ok"])
		k[2]["text"] = "manipuliert"
		r = verify_chain(k)
		self.assertFalse(r["ok"])
		self.assertEqual(r["fehler"][0]["index"], 2)
		k = _kette()
		del k[1]
		self.assertFalse(verify_chain(k)["ok"])

	def test_hashkette_gleiches_verfahren_wie_website(self):
		# Referenzwert, berechnet mit src/lib/plattform/hashkette.js (eintragHash) – inkl. Umlauten und Gedankenstrich
		e = {"id": "A-26-TEST00", "am": "2026-09-01T10:00:00.000Z", "nutzerId": "U-26-TESTER", "aktion": "status", "objektArt": "vorgang", "objektId": "V-26-TEST00", "text": "Eintrag 0 – Grüße", "ip": ""}
		self.assertEqual(eintrag_hash(KETTE_START, e), "fd47213d01f9fe020f503bb85a81305201d25412dcc0a245606656894b85cf23")

	def test_protokoll_ist_verkettet_und_pruefbar(self):
		frappe.set_user("Administrator")
		protokoll(frappe._dict(id=self.admin), "test", "nutzer", self.admin, "Kette 1")
		protokoll(frappe._dict(id=self.admin), "test", "nutzer", self.admin, "Kette 2")
		r = aufruf(berichte.kette_pruefen, limit=2, als_benutzer=self.admin)
		self.assertTrue(r["ok"], r["fehler"][:3])
		self.assertEqual(r["eintraege"][0]["prevHash"], r["eintraege"][1]["hash"])
		# Manipulation direkt in der Datenbank (am Controller vorbei) wird erkannt
		name = r["eintraege"][0]["id"]
		frappe.db.set_value("Plattform Aktivitaet", name, "text", "manipuliert", update_modified=False)
		r = aufruf(berichte.kette_pruefen, limit=2, als_benutzer=self.admin)
		self.assertFalse(r["ok"])
		self.assertTrue(any(f["id"] == name for f in r["fehler"]))
		frappe.db.rollback()

	# ------------------------------------------------------------ Unterrollen

	def test_unterrollen_rechte(self):
		kid = konto(["admin"])
		aufruf(berichte.rollen_setzen, nutzerId=kid, rollen=["akquise"], als_benutzer=self.admin)
		n = frappe._dict(rollen=["admin"], backofficeRollen=["akquise"])
		self.assertEqual(stufe(n, "provisionen"), 0)
		self.assertEqual(stufe(n, "crm"), 2)
		with self.assertRaises(frappe.PermissionError):
			aufruf(berichte.rechte, als_benutzer=kid)
		with self.assertRaises(frappe.PermissionError):
			aufruf(automation.speichern, regel={"name": "x"}, als_benutzer=kid)
		aufruf(berichte.rollen_setzen, nutzerId=kid, rollen=["lesen"], als_benutzer=self.admin)
		with self.assertRaises(frappe.PermissionError):
			aufruf(crm.kontakt_speichern, daten={"nachname": "Verboten"}, als_benutzer=kid)
		self.assertIn("kontakte", aufruf(crm.kontakte, als_benutzer=kid))
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(berichte.rollen_setzen, nutzerId=self.admin, rollen=["lesen"], als_benutzer=self.admin)

	# ------------------------------------------------------------ CRM

	def test_lead_und_dubletten(self):
		mail = f"lead-{frappe.generate_hash(length=8).lower()}@example.com"
		aufruf(anfrage.anlegen, typ="kontakt", kontakt={"vorname": "Lea", "nachname": "Lead", "email": mail, "plz": "86825"}, daten={}, einwilligungText="Test")
		aufruf(anfrage.anlegen, typ="carport", kontakt={"vorname": "Lea", "nachname": "Lead", "email": mail.upper()}, daten={}, einwilligungText="Test")
		self.assertEqual(frappe.db.count("Plattform CRM Kontakt", {"email": mail}), 1)
		k = frappe.get_doc("Plattform CRM Kontakt", {"email": mail})
		self.assertEqual(len(k.bezuege), 2)
		aufruf(crm.kontakt_speichern, daten={"vorname": "Lea", "nachname": "Lead", "plz": "86825", "email": f"x-{mail}"}, als_benutzer=self.admin)
		paare = aufruf(crm.dubletten, als_benutzer=self.admin)
		self.assertTrue(any(p["score"] >= 85 and k.name in (p["a"]["id"], p["b"]["id"]) for p in paare))
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(crm.kontakt_speichern, daten={"nachname": "Doppelt", "email": mail}, als_benutzer=self.admin)

	# ------------------------------------------------------------ Automationen

	def test_regel_feuert_und_feuert_nicht(self):
		kanal = f"TEST-{frappe.generate_hash(length=6)}"
		tag = f"t-{kanal}"
		aufruf(automation.speichern, regel={"name": "Test Großfläche", "ausloeser": {"typ": "vorgang_neu"}, "bedingungen": [{"feld": "kanal", "op": "gleich", "wert": kanal}, {"feld": "ha", "op": "min", "wert": 20}], "aktionen": [{"typ": "tag", "tag": tag}]}, als_benutzer=self.admin)
		gross = aufruf(anfrage.anlegen, typ="flaeche", kontakt={"vorname": "G", "nachname": "Groß", "email": f"g-{kanal.lower()}@example.com"}, daten={"ha": 25}, herkunft={"kanal": kanal}, einwilligungText="Test")
		klein = aufruf(anfrage.anlegen, typ="flaeche", kontakt={"vorname": "K", "nachname": "Klein", "email": f"k-{kanal.lower()}@example.com"}, daten={"ha": 5}, herkunft={"kanal": kanal}, einwilligungText="Test")
		self.assertIn(tag, bo.info_json("vorgang", gross["id"])["tags"])
		self.assertNotIn(tag, bo.info_json("vorgang", klein["id"])["tags"])
		self.assertTrue(frappe.db.exists("Plattform Automation Lauf", {"objekt_id": klein["id"], "status": "nicht_erfuellt"}))

	def test_regel_bereinigen_und_schleifenschutz(self):
		self.assertIn("fehler", bo.regel_bereinigen({"name": "x"}))
		self.assertIn("fehler", bo.regel_bereinigen({"name": "Falscher Status", "ausloeser": {"typ": "vorgang_neu"}, "aktionen": [{"typ": "status", "nach": "verkauft"}]}))
		# Zwei Regeln, die sich gegenseitig auslösen würden: jede feuert je Kette höchstens einmal
		vg = aufruf(anfrage.anlegen, typ="kontakt", kontakt={"vorname": "S", "nachname": "Schleife", "email": f"s-{frappe.generate_hash(length=6).lower()}@example.com"}, daten={}, einwilligungText="Test")
		o = frappe.get_doc("Plattform Vorgang", vg["id"])
		r = {"id": "R-26-SCHLEIFE", "name": "Schleife", "erstelltVon": self.admin, "ausloeser": {"typ": "status", "art": "vorgang"}, "bedingungen": [], "aktionen": [{"typ": "tag", "tag": "schleife"}]}
		frappe.set_user("Administrator")
		bo._KETTE["aktiv"] = {"id": "AL-26-TEST", "tiefe": 0, "gefeuert": set(), "testlauf": False}
		try:
			erste = bo.ausfuehren({"typ": "status", "art": "vorgang", "objekt": o, "nach": "in_pruefung"}, nur_regeln=[r])
			zweite = bo.ausfuehren({"typ": "status", "art": "vorgang", "objekt": o, "nach": "in_pruefung"}, nur_regeln=[r])
		finally:
			bo._KETTE["aktiv"] = None
		self.assertEqual(erste[0]["status"], "ausgefuehrt")
		self.assertEqual(zweite[0]["status"], "schleife")
