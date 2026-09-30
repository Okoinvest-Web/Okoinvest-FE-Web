# Copyright (c) 2026, ÖkoInvest GmbH
# Anbieter / Verkäufer (Bench): bench --site <site> run-tests --module oekoinvest_app.plattform.tests.test_anbieter
# Vermittlungsauftrag, Rückfragen sperren das Einreichen, Anonymisierung sperrt die Veröffentlichung, Verkäufer-Ablehnung
# sperrt die LOI-Annahme, Vorkenntnis, Bestandsdaten nur mit Datenraum, Rechte (fremd → 403).

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import anbieter, projekt, prozess
from oekoinvest_app.plattform.tests.testdaten import aufruf, interesse_mit_datenraum, konto, projekt_daten, projekt_veroeffentlicht, vorbereiten


class TestAnbieter(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.anbieter = konto(["anbieter"], vorname="Anbieter")
		cls.fremd = konto(["anbieter"])
		cls.investor = konto(["investor"])

	def tearDown(self):
		frappe.set_user("Administrator")

	def _name(self, konto_id):
		k = frappe.db.get_value("Plattform Konto", konto_id, ["vorname", "nachname"], as_dict=True)
		return f"{k.vorname} {k.nachname}"

	def test_mandat_und_rueckfragen(self):
		p = aufruf(projekt.anlegen, daten=projekt_daten(), ip="127.0.0.1", als_benutzer=self.anbieter)
		with self.assertRaises(frappe.PermissionError):
			aufruf(anbieter.akte, projektId=p["id"], als_benutzer=self.fremd)
		a = aufruf(anbieter.aktion, projektId=p["id"], daten={"aktion": "mandat_erteilen", "art": "exklusiv", "dauerMonate": 6, "name": self._name(self.anbieter), "zustimmung": True}, ip="127.0.0.1", als_benutzer=self.anbieter)
		self.assertEqual(a["mandat"]["stand"]["status"], "wartet")
		self.assertTrue(frappe.parse_json(frappe.db.get_value("Plattform Projekt", p["id"], "provision_akzeptiert")).get("mandat"))
		a = aufruf(anbieter.admin_aktion, projektId=p["id"], daten={"aktion": "mandat_bestaetigen"}, ip="", als_benutzer=self.admin)
		self.assertTrue(a["mandat"]["stand"]["exklusivAktiv"])
		a = aufruf(anbieter.admin_aktion, projektId=p["id"], daten={"aktion": "pruefpunkt_anlegen", "bereich": "unterlagen", "text": "Bitte Netzzusage hochladen.", "pflicht": True}, ip="", als_benutzer=self.admin)
		pp = a["pruefpunkte"][0]["id"]
		with self.assertRaises(frappe.ValidationError):
			aufruf(prozess.status_wechsel, art="projekt", id=p["id"], nach="pruefung", als="eigentuemer", extra={}, als_benutzer=self.anbieter)
		aufruf(anbieter.aktion, projektId=p["id"], daten={"aktion": "pruefpunkt_antworten", "id": pp, "antwort": "Hochgeladen."}, ip="", als_benutzer=self.anbieter)
		aufruf(prozess.status_wechsel, art="projekt", id=p["id"], nach="pruefung", als="eigentuemer", extra={}, als_benutzer=self.anbieter)
		with self.assertRaises(frappe.DuplicateEntryError):  # Pflicht-Prüfpunkt nicht erledigt → 409
			aufruf(prozess.status_wechsel, art="projekt", id=p["id"], nach="veroeffentlicht", als="admin", extra={"provisionSatz": 2}, als_benutzer=self.admin)
		aufruf(anbieter.admin_aktion, projektId=p["id"], daten={"aktion": "pruefpunkt", "id": pp, "schritt": "erledigt"}, ip="", als_benutzer=self.admin)
		erg = aufruf(prozess.status_wechsel, art="projekt", id=p["id"], nach="veroeffentlicht", als="admin", extra={"provisionSatz": 2}, als_benutzer=self.admin)
		self.assertEqual(erg["status"], "veroeffentlicht")

	def test_anonymitaet_sperrt_veroeffentlichung(self):
		d = projekt_daten()
		d["titel"] = "Solarpark Geheimdorf 12 MWp"
		p = aufruf(projekt.anlegen, daten=d, ip="", als_benutzer=self.anbieter)
		aufruf(projekt.provision_akzeptieren, id=p["id"], ip="", als_benutzer=self.anbieter)
		aufruf(prozess.status_wechsel, art="projekt", id=p["id"], nach="pruefung", als="eigentuemer", extra={}, als_benutzer=self.anbieter)
		with self.assertRaises(frappe.DuplicateEntryError) as e:
			aufruf(prozess.status_wechsel, art="projekt", id=p["id"], nach="veroeffentlicht", als="admin", extra={"provisionSatz": 2}, als_benutzer=self.admin)
		self.assertIn("identifizierende", str(e.exception))

	def test_votum_und_vorkenntnis(self):
		pid = projekt_veroeffentlicht(self.anbieter, self.admin)
		iid = interesse_mit_datenraum(self.investor, self.admin, pid)
		loi = {"text": "Indikatives Angebot vorbehaltlich DD.", "preisbasis": "gesamt", "betrag": 500000}
		aufruf(prozess.status_wechsel, art="interesse", id=iid, nach="loi_abgegeben", als="eigentuemer", extra={"loi": loi}, als_benutzer=self.investor)
		a = aufruf(anbieter.akte, projektId=pid, als_benutzer=self.anbieter)
		i = next(x for x in a["interessenten"] if x["interesseId"] == iid)
		self.assertTrue(i["pseudonym"].startswith("Investor ") and "investor" not in i and i["votumMoeglich"])
		aufruf(anbieter.aktion, projektId=pid, daten={"aktion": "votum", "interesseId": iid, "art": "ablehnung", "kommentar": "Preis deutlich unter Erwartung."}, ip="", als_benutzer=self.anbieter)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(prozess.status_wechsel, art="interesse", id=iid, nach="loi_angenommen", als="admin", extra={}, als_benutzer=self.admin)
		aufruf(anbieter.aktion, projektId=pid, daten={"aktion": "votum", "interesseId": iid, "art": "zustimmung"}, ip="", als_benutzer=self.anbieter)
		erg = aufruf(prozess.status_wechsel, art="interesse", id=iid, nach="loi_angenommen", als="admin", extra={}, als_benutzer=self.admin)
		self.assertEqual(erg["status"], "loi_angenommen")
		with self.assertRaises(frappe.ValidationError):  # Nachweis nach der Anzeige → kein Vorkenntnis-Nachweis
			aufruf(anbieter.aktion, projektId=pid, daten={"aktion": "vorkenntnis_melden", "interesseId": iid, "begruendung": "Kenne das Unternehmen aus einem früheren Projekt.", "nachweisArt": "korrespondenz", "nachweisDatum": "2099-01-01"}, ip="", als_benutzer=self.anbieter)

	def test_bestand_nur_mit_datenraum(self):
		d = projekt_daten()
		d["phase"] = "cod"
		pid = aufruf(projekt.anlegen, daten=d, ip="", als_benutzer=self.anbieter)["id"]
		a = aufruf(anbieter.aktion, projektId=pid, daten={"aktion": "ertrag_import", "csv": "2025-01;30000\n2025-02;55000"}, ip="", als_benutzer=self.anbieter)
		self.assertEqual(a["bestand"]["auswertung"]["ertrag"]["gesamt"]["monate"], 2)
		with self.assertRaises(frappe.PermissionError):
			aufruf(anbieter.akte, projektId=pid, als_benutzer=self.investor)
