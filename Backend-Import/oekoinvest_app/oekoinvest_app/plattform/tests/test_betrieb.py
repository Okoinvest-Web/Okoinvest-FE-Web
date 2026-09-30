# Copyright (c) 2026, ÖkoInvest GmbH
# Betriebsführung (plattform/api/betrieb.py) auf der Bench – Spiegel des Abschnitts „Betriebsführung“ in
# scripts/plattform-test-anlagen.mjs: Rechte (nur Bereich „anlagen“), Ticket mit Ertragsausfall, Beheben nur mit Ursache,
# Serviceauftrag-/Versicherungs-Automat, Standard-Wartungsplan, Prüfprotokoll → Störung, Lagerbestand, Zählerfreigabe.
#   bench --site <site> run-tests --app oekoinvest_app --module oekoinvest_app.plattform.tests.test_betrieb

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import anlagen, betrieb
from oekoinvest_app.plattform.tests.testdaten import aufruf, konto, vorbereiten


class TestBetrieb(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.kunde = konto(["unternehmen"], vorname="Kunde")
		cls.akquise = konto(["admin"], vorname="Akquise")
		frappe.db.set_value("Plattform Konto", cls.akquise, "backoffice_rollen", "akquise")
		r = aufruf(anlagen.anlegen, daten={"name": "Betriebsdach (Test)", "typ": "dach", "status": "betrieb", "land": "DE", "bundesland": "Bayern", "kwp": 300, "inbetriebnahme": "2024-05-01", "kundeId": cls.kunde, "eigentuemer": "ÖkoInvest GmbH", "dachgeberIstKunde": True}, als_benutzer=cls.admin)
		cls.aid = r["id"]
		s = aufruf(anlagen.stoerung_anlegen, daten={"anlageId": cls.aid, "schwere": "hoch", "titel": "Wechselrichter 2 aus (Test)"}, als_benutzer=cls.admin)
		cls.sid = s["id"]

	def tearDown(self):
		frappe.set_user("Administrator")

	def test_rechte(self):
		with self.assertRaises(frappe.PermissionError):
			aufruf(betrieb.uebersicht, als_benutzer=self.akquise)
		with self.assertRaises(frappe.PermissionError):
			aufruf(betrieb.anlage, anlage_id=self.aid, als_benutzer=self.kunde)
		u = aufruf(betrieb.uebersicht, als_benutzer=self.admin)
		self.assertIn("zaehler", u)

	def test_ticket_und_beheben(self):
		with self.assertRaises(frappe.ValidationError):
			aufruf(betrieb.stoerung_beheben, stoerung_id=self.sid, als_benutzer=self.admin)
		t = aufruf(betrieb.stoerung_speichern, stoerung_id=self.sid, daten={"ursacheKategorie": "wechselrichter", "massnahme": "Lüfter getauscht", "ausfallBeginn": "2026-06-10T08:00:00Z", "ausfallEnde": "2026-06-10T16:00:00Z", "betroffenPct": 25}, kontext={"jahresKwh": 300000, "arbeitspreisCt": 12, "eigenverbrauchQuote": 0.8}, als_benutzer=self.admin)
		self.assertGreater(t["ertragsausfall"]["ausfallKwh"], 0)
		self.assertEqual(t["ursacheKategorie"], "wechselrichter")
		x = aufruf(betrieb.auftrag_speichern, daten={"anlageId": self.aid, "stoerungId": self.sid, "art": "dienstleister", "dienstleister": "Service GmbH (Test)", "beschreibung": "Wechselrichter prüfen"}, als_benutzer=self.admin)
		aufruf(betrieb.auftrag_aktion, id=x["id"], daten={"status": "beauftragt"}, als_benutzer=self.admin)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(betrieb.stoerung_beheben, stoerung_id=self.sid, als_benutzer=self.admin)  # Auftrag offen
		with self.assertRaises(frappe.ValidationError):
			aufruf(betrieb.auftrag_aktion, id=x["id"], daten={"status": "erledigt", "bericht": "kurz"}, als_benutzer=self.admin)
		aufruf(betrieb.auftrag_aktion, id=x["id"], daten={"status": "erledigt", "bericht": "Lüfter getauscht, Anlage läuft wieder."}, als_benutzer=self.admin)
		r = aufruf(betrieb.stoerung_beheben, stoerung_id=self.sid, als_benutzer=self.admin)
		self.assertEqual(r["status"], "behoben")

	def test_versicherung(self):
		f = aufruf(betrieb.versicherung_speichern, daten={"anlageId": self.aid, "art": "allgefahren", "versicherer": "Versicherung AG (Test)", "schadentag": "2026-09-01", "schadenEur": 900, "schadenbeschreibung": "Sturmschaden an der Unterkonstruktion"}, als_benutzer=self.admin)
		self.assertEqual(f["meldefristBis"], "2026-09-08")
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(betrieb.versicherung_aktion, id=f["id"], daten={"status": "reguliert", "erstattetEur": 100}, als_benutzer=self.admin)
		g = aufruf(betrieb.versicherung_aktion, id=f["id"], daten={"status": "gemeldet"}, als_benutzer=self.admin)
		self.assertTrue(g["verspaetet"])

	def test_wartung_und_pruefung(self):
		r = aufruf(betrieb.plaene_vorschlagen, anlage_id=self.aid, als_benutzer=self.admin)
		self.assertGreaterEqual(r["angelegt"], 4)
		self.assertEqual(aufruf(betrieb.plaene_vorschlagen, anlage_id=self.aid, als_benutzer=self.admin)["angelegt"], 0)
		p = aufruf(betrieb.protokoll_speichern, anlage_id=self.aid, daten={"art": "wiederkehrend", "datum": "2026-09-15", "pruefer": "Elektrofachkraft (Test)", "strings": [{"bezeichnung": "S1", "uocV": 700, "rIsoMOhm": 0.4}]}, als_benutzer=self.admin)
		self.assertEqual(p["ergebnis"], "nicht_bestanden")
		self.assertTrue(p["stoerungId"])
		plan = frappe.db.get_value("Plattform Wartungsplan", {"anlage_id": self.aid, "art": "pruefung"}, ["letzte_durchfuehrung", "naechste_faelligkeit"], as_dict=True)
		self.assertEqual(str(plan.letzte_durchfuehrung), "2026-09-15")
		self.assertEqual(str(plan.naechste_faelligkeit), "2030-09-15")

	def test_lager(self):
		t = aufruf(betrieb.ersatzteil_speichern, daten={"bezeichnung": "DC-Stecker (Test)", "bestand": 2, "mindestbestand": 2}, als_benutzer=self.admin)
		self.assertTrue(t["nachbestellung"])
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(betrieb.ersatzteil_bewegung, id=t["id"], daten={"art": "entnahme", "menge": 5, "anlageId": self.aid}, als_benutzer=self.admin)
		with self.assertRaises(frappe.ValidationError):
			aufruf(betrieb.ersatzteil_bewegung, id=t["id"], daten={"art": "entnahme", "menge": 1}, als_benutzer=self.admin)
		r = aufruf(betrieb.ersatzteil_bewegung, id=t["id"], daten={"art": "entnahme", "menge": 1, "anlageId": self.aid}, als_benutzer=self.admin)
		self.assertEqual(r["teil"]["bestand"], 1)

	def test_zaehlerfreigabe(self):
		mp = aufruf(anlagen.eintrag_speichern, anlageId=self.aid, art="messpunkt", daten={"zaehlernummer": "1BETR01", "art": "erzeugung", "messstelle": "geeicht", "abrechnungsrelevant": True, "eichgueltigBis": "2026-07-31"}, als_benutzer=self.admin)
		aufruf(anlagen.eintrag_speichern, anlageId=self.aid, art="monatswert", daten={"messpunktId": mp["id"], "register": "2.8.0", "monat": "2026-08", "stand": 5000}, als_benutzer=self.admin)
		with self.assertRaises(frappe.DuplicateEntryError):  # Eichfrist abgelaufen → 409
			aufruf(betrieb.monatswert_freigeben, anlage_id=self.aid, daten={"messpunktId": mp["id"], "register": "2.8.0", "monat": "2026-08", "befund": {"stufe": "ok"}}, als_benutzer=self.admin)
		aufruf(betrieb.monatswert_freigeben, anlage_id=self.aid, daten={"messpunktId": mp["id"], "register": "2.8.0", "monat": "2026-07", "stand": 4000, "befund": {"stufe": "ok"}}, als_benutzer=self.admin)
		self.assertTrue(frappe.db.get_value("Plattform Zaehlerstand Monatswert", {"messpunkt_id": mp["id"], "monat": "2026-07"}, "geprueft"))
