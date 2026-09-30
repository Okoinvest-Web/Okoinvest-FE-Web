# Copyright (c) 2026, ÖkoInvest GmbH
# Backoffice-Werkzeuge (Team 8) gegen Frappe: Rechte je Unterrolle, Mahnlauf mit Mahnbeleg, Storno mit Stornobeleg,
# Kontoauszug-Import (Dublette 409) und Zuordnung, Monatsabschluss nur mit Pflichtpunkten, DSGVO-Anfrage mit Frist und
# Zustandsautomat, Verdachtsfall nur Compliance (Vier-Augen), Deal-Pipeline mit Prognose.
#   bench --site <test-site> run-tests --module oekoinvest_app.plattform.tests.test_backoffice_werkzeuge
# Reine Logik ohne Frappe: tests/test_backoffice_werkzeuge_kern.py (python -m unittest).

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import buchhaltung as bh
from oekoinvest_app.plattform.api import datenschutz as ds
from oekoinvest_app.plattform.api import transaktion as tr
from oekoinvest_app.plattform.finanzen import logik as L
from oekoinvest_app.plattform.kern import als_json
from oekoinvest_app.plattform.tests.testdaten import aufruf, konto, vorbereiten


def _unterrolle(kid, rolle):
	frappe.db.set_value("Plattform Konto", kid, "backoffice_rollen", rolle)


class TestBackofficeWerkzeuge(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.buchhaltung = konto(["admin"])
		_unterrolle(cls.buchhaltung, "buchhaltung")
		cls.compliance = konto(["admin"])
		_unterrolle(cls.compliance, "compliance")
		cls.compliance2 = konto(["admin"])
		_unterrolle(cls.compliance2, "compliance")
		cls.transaktion = konto(["admin"])
		_unterrolle(cls.transaktion, "transaktion")
		cls.akquise = konto(["admin"])
		_unterrolle(cls.akquise, "akquise")
		cls.kunde = konto(["anbieter"])
		# überfällige Provisionsrechnung (direkt angelegt, wie der Abrechnungslauf sie erzeugt)
		heute = L.heute()
		cls.rechnung = frappe.get_doc({
			"doctype": "Plattform Abrechnung", "nummer": f"PR-{heute[:4]}-9{frappe.generate_hash(length=4).upper()[:4]}", "art": "provision", "beleg": "rechnung", "titel": "Rechnung – Vermittlungsprovision",
			"gesellschaft_id": "OEKOINVEST", "status": "offen", "empfaenger_id": cls.kunde, "schluessel": f"TEST:{frappe.generate_hash(length=8)}", "zeitraum_von": L.plus_tage(heute, -60), "zeitraum_bis": L.plus_tage(heute, -60),
			"rechnungsdatum": L.plus_tage(heute, -60), "faellig_am": L.plus_tage(heute, -30), "netto": 1000, "steuer_vorlage": "AT-USt-20", "steuer_satz": 0.2, "steuer_betrag": 200, "brutto": 1200,
			"daten": als_json({"partei": {"name": "Test Solar GmbH", "anschrift": "Teststraße 1", "uid": "ATU00000000"}, "aussteller": {"name": "ÖkoInvest GmbH", "anschrift": "Gewerbegebiet 10, 5121 Ostermiething", "land": "AT"},
				"bezug": {}, "bezugText": "Test", "positionen": [{"text": "Provision", "menge": 1, "preis": 1000, "betrag": 1000}], "steuer": {"vorlage": "AT-USt-20", "satz": 0.2, "betrag": 200, "art": "ust", "label": "AT USt 20 %"}, "mahnungen": []}),
		}).insert(ignore_permissions=True)

	def tearDown(self):
		frappe.set_user("Administrator")

	def test_rechte(self):
		with self.assertRaises(frappe.PermissionError):
			aufruf(bh.uebersicht, als_benutzer=self.akquise)
		with self.assertRaises(frappe.PermissionError):
			aufruf(bh.mahnlauf, daten={"trockenlauf": True}, als_benutzer=self.transaktion)  # Transaktion liest Finanzen nur
		self.assertIn("op", aufruf(bh.uebersicht, als_benutzer=self.buchhaltung))
		with self.assertRaises(frappe.PermissionError):
			aufruf(ds.verdacht_liste, als_benutzer=self.buchhaltung)
		with self.assertRaises(frappe.PermissionError):
			aufruf(tr.prognose, projekt_id="P-26-XXXXXX", daten={}, als_benutzer=self.buchhaltung)

	def test_mahnlauf_und_storno(self):
		r = aufruf(bh.mahnlauf, daten={"ids": [self.rechnung.name]}, als_benutzer=self.buchhaltung)
		self.assertEqual(r["anzahl"], 1)
		m = r["erzeugt"][0]
		self.assertTrue(m["nr"].startswith("MA-"))
		self.assertEqual(aufruf(bh.mahnlauf, daten={"ids": [self.rechnung.name]}, als_benutzer=self.buchhaltung)["anzahl"], 0)  # Frist läuft
		dok = aufruf(bh.beleg_dokument, beleg_id=self.rechnung.name, art="mahnung", nr=m["nr"], als_benutzer=self.kunde)
		self.assertEqual(dok["mahnung"]["nr"], m["nr"])
		with self.assertRaises(frappe.ValidationError):
			aufruf(bh.storno, beleg_id=self.rechnung.name, daten={"grund": "kurz"}, als_benutzer=self.buchhaltung)
		s = aufruf(bh.storno, beleg_id=self.rechnung.name, daten={"grund": "Kaufpreis nachträglich korrigiert"}, als_benutzer=self.buchhaltung)
		self.assertTrue(s["storno"]["nummer"].startswith("ST-"))
		self.assertEqual(s["storno"]["brutto"], -1200)
		self.assertEqual(frappe.db.get_value("Plattform Abrechnung", self.rechnung.name, "status"), "storniert")
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(bh.storno, beleg_id=self.rechnung.name, daten={"grund": "Kaufpreis nachträglich korrigiert"}, als_benutzer=self.buchhaltung)
		self.assertTrue(any(x["art"] == "storno" for x in aufruf(bh.meine_dokumente, als_benutzer=self.kunde)))

	def test_import_und_abschluss(self):
		csv = f"Buchungsdatum;Auftraggeber;Verwendungszweck;Betrag\n{L.datum_de(L.heute())};Test Solar GmbH;Testbuchung {frappe.generate_hash(length=6)};12,34\n"
		r = aufruf(bh.zahlung_import, daten={"inhalt": csv, "dateiname": "test.csv"}, als_benutzer=self.buchhaltung)
		self.assertEqual(r["import"]["neu"], 1)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(bh.zahlung_import, daten={"inhalt": csv, "dateiname": "test.csv"}, als_benutzer=self.buchhaltung)
		e = r["buchungen"][0]
		self.assertEqual(aufruf(bh.zahlung_aktion, id=e["id"], daten={"aktion": "ignorieren", "grund": "Testbuchung"}, als_benutzer=self.buchhaltung)["eingang"]["status"], "ignoriert")
		vormonat = L.vormonat(L.heute()[:7])
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(bh.abschluss_aktion, monat=vormonat, daten={"aktion": "abschliessen"}, als_benutzer=self.buchhaltung)
		a = aufruf(bh.abschluss_aktion, monat=vormonat, daten={"aktion": "punkt", "punkt": "op_abgestimmt", "erledigt": True}, als_benutzer=self.buchhaltung)
		self.assertTrue(next(p for p in a["punkte"] if p["id"] == "op_abgestimmt")["erledigt"])

	def test_datenschutz(self):
		a = aufruf(ds.anlegen, daten={"art": "auskunft", "name": "Erika Test", "eingangAm": L.heute(), "land": "AT"}, als_benutzer=self.compliance)
		self.assertEqual(a["status"], "eingegangen")
		self.assertTrue(a["frist"] > L.heute())
		with self.assertRaises(frappe.PermissionError):
			aufruf(ds.anlegen, daten={"art": "auskunft", "name": "X"}, als_benutzer=self.buchhaltung)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(ds.aktion, id=a["id"], daten={"aktion": "erledigen", "ergebnis": "zu früh erledigt"}, als_benutzer=self.compliance)
		b = aufruf(ds.aktion, id=a["id"], daten={"aktion": "identitaet_bestaetigen", "notiz": "Rückruf unter bekannter Nummer"}, als_benutzer=self.compliance)
		self.assertEqual(b["status"], "in_bearbeitung")
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(ds.aktion, id=a["id"], daten={"aktion": "erledigen", "ergebnis": "Auskunft erteilt per Brief"}, als_benutzer=self.compliance)  # Export fehlt

	def test_verdacht_vier_augen(self):
		r = aufruf(ds.verdacht_melden, daten={"anlass": "herkunft", "sachverhalt": "Mittelherkunft für Kaufpreis nicht belegt, Zahlung aus Drittland angekündigt."}, als_benutzer=self.akquise)
		self.assertTrue(r["ok"])
		with self.assertRaises(frappe.PermissionError):
			aufruf(ds.verdacht_liste, als_benutzer=self.akquise)
		aufruf(ds.verdacht_aktion, id=r["id"], daten={"aktion": "pruefen"}, als_benutzer=self.compliance)
		f = aufruf(ds.verdacht_aktion, id=r["id"], daten={"aktion": "keine_meldung", "begruendung": "Kaufvertrag und Kontoauszüge belegen die Mittelherkunft vollständig."}, als_benutzer=self.compliance2)
		self.assertEqual(f["status"], "keine_meldung")

	def test_pipeline(self):
		p = aufruf(tr.pipeline, als_benutzer=self.transaktion)
		self.assertIn("summen", p)
		self.assertEqual(len(p["spalten"]), 7)
