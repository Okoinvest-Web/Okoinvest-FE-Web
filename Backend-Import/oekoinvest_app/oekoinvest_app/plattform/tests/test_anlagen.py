# Copyright (c) 2026, ÖkoInvest GmbH
# Anlagen & Monitoring: Kunde sieht nur eigene Anlagen, Gerätepasswort nur einmal (danach nur Hash),
# Messpunkt-/Monatswert-Regeln, Störung quittieren nur Betrieb, Ingest-Dienst nur mit eigener Rolle.
# Spiegel von scripts/plattform-test-anlagen.mjs.

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.anlagen_kern import fingerabdruck, mqtt_benutzer, passwort_hash, passwort_pruefen, prioritaet, region_fuer, topic_basis
from oekoinvest_app.plattform.api import anlagen
from oekoinvest_app.plattform.konstanten import ROLLE_ANLAGEN_DIENST
from oekoinvest_app.plattform.tests.testdaten import aufruf, konto, vorbereiten

DIENST_USER = "anlagen-dienst-test@example.com"


class TestAnlagenKern(FrappeTestCase):
	def test_region_und_topic(self):
		self.assertEqual(region_fuer("DE", "Bayern"), "de-sued")
		self.assertEqual(region_fuer("DE", "Niedersachsen"), "de-nord")
		self.assertEqual(region_fuer("AT", "Tirol"), "at")
		self.assertEqual(topic_basis("AL-26-ABC123", "GZ-26-XYZ789"), "oekoinvest/v1/AL-26-ABC123/GZ-26-XYZ789")
		self.assertEqual(mqtt_benutzer("AL-26-ABC123", "GZ-26-XYZ789"), "anl-al-26-abc123-gz-26-xyz789")

	def test_scrypt_format_wie_website(self):
		h = passwort_hash("geheim-geraet-passwort-123")
		self.assertTrue(h.startswith("scrypt$16384$8$1$"))
		self.assertEqual(len(h.split("$")), 6)
		self.assertTrue(passwort_pruefen("geheim-geraet-passwort-123", h))
		self.assertFalse(passwort_pruefen("falsch", h))
		self.assertEqual(len(fingerabdruck(h)), 16)

	def test_prioritaet(self):
		self.assertGreater(prioritaet("hoch", 1, False), prioritaet("mittel", 30, False))
		self.assertEqual(prioritaet("hoch", 1, True, offen=False), 0)


class TestAnlagen(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.kunde = konto(["unternehmen"], vorname="Kunde")
		cls.fremd = konto(["unternehmen"], vorname="Fremd")
		cls.akquise = konto(["admin"], vorname="Akquise")
		frappe.db.set_value("Plattform Konto", cls.akquise, "backoffice_rollen", "akquise")
		r = aufruf(anlagen.anlegen, daten={"name": "Testdach (Test)", "typ": "dach", "status": "betrieb", "land": "DE", "bundesland": "Hessen", "kwp": 240, "inbetriebnahme": "2025-04-01", "kundeId": cls.kunde, "eigentuemer": "ÖkoInvest GmbH", "dachgeberIstKunde": True}, als_benutzer=cls.admin)
		cls.aid = r["id"]

	def tearDown(self):
		frappe.set_user("Administrator")

	def test_sichtbarkeit(self):
		liste = aufruf(anlagen.liste, als_benutzer=self.kunde)
		self.assertEqual([a["id"] for a in liste], [self.aid])
		self.assertEqual(aufruf(anlagen.liste, als_benutzer=self.fremd), [])
		with self.assertRaises(frappe.PermissionError):
			aufruf(anlagen.holen, id=self.aid, als_benutzer=self.fremd)
		with self.assertRaises(frappe.PermissionError):
			aufruf(anlagen.monatswerte, anlageId=self.aid, als_benutzer=self.fremd)
		with self.assertRaises(frappe.PermissionError):
			aufruf(anlagen.stoerungen, anlageId=self.aid, als_benutzer=self.fremd)
		d = aufruf(anlagen.holen, id=self.aid, als_benutzer=self.kunde)
		self.assertIsNone(d["geraete"])
		self.assertEqual(d["meinZugriff"], "kunde")
		# Eigentum & Betrieb: Kunde ist Stromabnehmer, sieht Eigentümer, aber keine Komponenten-Interna/Finanzierung
		self.assertEqual(d["eigentuemer"], "ÖkoInvest GmbH")
		self.assertIsNone(d["komponenten"])
		self.assertIsNone(d["finanziertDurch"])
		with self.assertRaises(frappe.PermissionError):
			aufruf(anlagen.anlegen, daten={"name": "X", "typ": "dach"}, als_benutzer=self.kunde)
		with self.assertRaises(frappe.PermissionError):
			aufruf(anlagen.leitstand, als_benutzer=self.akquise)

	def test_eigentuemer_pflicht(self):
		# Fachprüfung Kapitalseite: Eigentümergesellschaft ist Pflicht
		with self.assertRaises(frappe.ValidationError):
			aufruf(anlagen.anlegen, daten={"name": "Ohne Eigentümer (Test)", "typ": "dach", "status": "planung", "land": "DE", "bundesland": "Hessen", "kwp": 50}, als_benutzer=self.admin)

	def test_geraet_passwort_nur_einmal(self):
		with self.assertRaises(frappe.PermissionError):
			aufruf(anlagen.geraet_anlegen, anlageId=self.aid, bezeichnung="Logger", als_benutzer=self.kunde)
		r = aufruf(anlagen.geraet_anlegen, anlageId=self.aid, bezeichnung="Logger", als_benutzer=self.admin)
		pw = r["passwort"]
		self.assertGreaterEqual(len(pw), 24)
		z = r["zugang"]
		self.assertNotIn("passwort", z)
		self.assertNotIn("passwortHash", z)
		self.assertEqual(z["topic"], f"oekoinvest/v1/{self.aid}/{z['id']}/#")
		gespeichert = frappe.db.get_value("Plattform Geraetezugang", z["id"], "passwort_hash")
		self.assertNotIn(pw, gespeichert)
		self.assertTrue(passwort_pruefen(pw, gespeichert))
		spaeter = aufruf(anlagen.geraet, id=z["id"], als_benutzer=self.admin)
		self.assertNotIn(pw, frappe.as_json(spaeter))
		self.assertNotIn(gespeichert, frappe.as_json(spaeter))
		neu = aufruf(anlagen.geraet_aktion, id=z["id"], daten={"aktion": "neu"}, als_benutzer=self.admin)
		self.assertNotEqual(neu["passwort"], pw)
		self.assertFalse(passwort_pruefen(pw, frappe.db.get_value("Plattform Geraetezugang", z["id"], "passwort_hash")))
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(anlagen.geraet_aktion, id=z["id"], daten={"aktion": "testnachricht"}, als_benutzer=self.admin)

	def test_messpunkt_und_monatswerte(self):
		with self.assertRaises(frappe.ValidationError):
			aufruf(anlagen.eintrag_speichern, anlageId=self.aid, art="messpunkt", daten={"zaehlernummer": "MON-1", "art": "erzeugung", "messstelle": "monitoring", "abrechnungsrelevant": True}, als_benutzer=self.admin)
		mp = aufruf(anlagen.eintrag_speichern, anlageId=self.aid, art="messpunkt", daten={"zaehlernummer": "1TEST01", "art": "zweirichtung", "messstelle": "geeicht", "abrechnungsrelevant": True}, als_benutzer=self.admin)
		aufruf(anlagen.eintrag_speichern, anlageId=self.aid, art="monatswert", daten={"messpunktId": mp["id"], "register": "1.8.0", "monat": "2026-07", "stand": 1000}, als_benutzer=self.admin)
		with self.assertRaises(frappe.ValidationError):
			aufruf(anlagen.eintrag_speichern, anlageId=self.aid, art="monatswert", daten={"messpunktId": mp["id"], "register": "1.8.0", "monat": "2026-08", "stand": 900}, als_benutzer=self.admin)
		w = aufruf(anlagen.eintrag_speichern, anlageId=self.aid, art="monatswert", daten={"messpunktId": mp["id"], "register": "1.8.0", "monat": "2026-08", "stand": 1850.5}, als_benutzer=self.admin)
		self.assertAlmostEqual(w["menge"], 850.5)
		self.assertEqual(len(aufruf(anlagen.monatswerte, anlageId=self.aid, als_benutzer=self.kunde)), 2)

	def test_stoerung_quittieren_nur_betrieb(self):
		s = aufruf(anlagen.stoerung_anlegen, daten={"anlageId": self.aid, "schwere": "hoch", "titel": "Wechselrichter 2 ohne Einspeisung"}, als_benutzer=self.admin)
		self.assertTrue(frappe.db.exists("Plattform Benachrichtigung", {"nutzer_id": self.kunde, "art": "stoerung"}))
		for wer in (self.kunde, self.fremd, self.akquise):
			with self.assertRaises(frappe.PermissionError):
				aufruf(anlagen.stoerung_aktion, id=s["id"], daten={"aktion": "quittieren"}, als_benutzer=wer)
		k = aufruf(anlagen.stoerung_aktion, id=s["id"], daten={"aktion": "kommentar", "text": "Halle ab 7 Uhr offen."}, als_benutzer=self.kunde)
		self.assertEqual(len(k["kommentare"]), 1)
		with self.assertRaises(frappe.PermissionError):
			aufruf(anlagen.stoerung_aktion, id=s["id"], daten={"aktion": "kommentar", "text": "fremd"}, als_benutzer=self.fremd)
		q = aufruf(anlagen.stoerung_aktion, id=s["id"], daten={"aktion": "quittieren"}, als_benutzer=self.admin)
		self.assertTrue(q["quittiert"])
		self.assertEqual(q["status"], "in_arbeit")
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(anlagen.stoerung_aktion, id=s["id"], daten={"aktion": "quittieren"}, als_benutzer=self.admin)
		aufruf(anlagen.stoerung_aktion, id=s["id"], daten={"aktion": "kommentar", "text": "Techniker bestellt", "intern": True}, als_benutzer=self.admin)
		sicht = aufruf(anlagen.stoerungen, anlageId=self.aid, status="alle", als_benutzer=self.kunde)
		self.assertFalse(any(c["intern"] for x in sicht for c in x["kommentare"]))

	def test_dienst_nur_mit_rolle(self):
		# Website-API-Benutzer darf die Dienst-Methoden nicht aufrufen
		with self.assertRaises(frappe.PermissionError):
			aufruf(anlagen.dienst_zugaenge)
		if not frappe.db.exists("User", DIENST_USER):
			u = frappe.get_doc({"doctype": "User", "email": DIENST_USER, "first_name": "Anlagen-Dienst", "user_type": "Website User", "send_welcome_email": 0})
			u.append("roles", {"role": ROLLE_ANLAGEN_DIENST})
			u.flags.no_welcome_mail = True
			u.insert(ignore_permissions=True)
		frappe.set_user(DIENST_USER)
		try:
			zugaenge = anlagen.dienst_zugaenge()
			self.assertTrue(all("passwortHash" in z and "passwort" not in z for z in zugaenge))
			r1 = anlagen.dienst_stoerung(befund={"anlageId": self.aid, "regel": "offline", "titel": "Keine Daten", "schluessel": f"{self.aid}|offline|t1"})
			r2 = anlagen.dienst_stoerung(befund={"anlageId": self.aid, "regel": "offline", "titel": "Keine Daten", "schluessel": f"{self.aid}|offline|t2"})
			self.assertTrue(r1["neu"])
			self.assertFalse(r2["neu"])  # offene Störung derselben Regel wird zusammengefasst
			with self.assertRaises(frappe.ValidationError):
				anlagen.dienst_stoerung(befund={"anlageId": self.aid, "regel": "manuell"})
			self.assertTrue(any(a["id"] == self.aid for a in anlagen.dienst_anlagen()))
		finally:
			frappe.set_user("Administrator")
