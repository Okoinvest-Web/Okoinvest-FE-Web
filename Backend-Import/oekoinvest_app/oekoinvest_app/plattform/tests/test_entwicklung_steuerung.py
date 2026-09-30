# Copyright (c) 2026, ÖkoInvest GmbH
# Entwicklungssteuerung (Frappe): Spiegel von Abschnitt 9 in scripts/plattform-test-entwicklung.mjs – Ampel, Kapazität (nur
# Leitung), Flächensicherung (Grundbuch erst mit Vertrag, Optionsfrist → Aufgabe), Aufgaben ohne Dubletten, Entscheidungsvorlage
# (Pflichtangaben, nur Leitung, Vier-Augen-Prinzip, Begründungspflicht, Folgen: Budget, Entscheidungsprotokoll, Aufgabe).
# Reine Regeln: test_entwicklung_steuerung_kern.py.

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from oekoinvest_app.plattform.api import entwicklung as E
from oekoinvest_app.plattform.api import entwicklung_steuerung as ST
from oekoinvest_app.plattform.tests.testdaten import aufruf, konto, vorbereiten


class TestEntwicklungSteuerung(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		E.vorlagen_sicherstellen()
		cls.leitung = konto(["admin"], vorname="Leitung")
		cls.leitung2 = konto(["admin"], vorname="Leitung2")
		cls.pl = konto(["admin"], vorname="PL")
		frappe.db.set_value("Plattform Konto", cls.pl, "backoffice_rollen", "projektleitung")
		cls.lesen = konto(["admin"], vorname="Lesen")
		frappe.db.set_value("Plattform Konto", cls.lesen, "backoffice_rollen", "lesen")
		p = aufruf(E.anlegen, daten={"titel": "Steuerung Test (Test)", "typ": "freiflaeche", "land": "AT", "bundesland": "Oberösterreich", "mwp": 8, "projektleiterId": cls.pl}, als_benutzer=cls.leitung)
		cls.pid = p["id"]
		cls.fid = aufruf(E.eintrag_speichern, projektId=cls.pid, art="flaeche", daten={"bezeichnung": "Steuerfläche (Test)", "ha": 9, "pachtStatus": "verhandlung"}, als_benutzer=cls.pl)["eintrag"]["id"]
		aufruf(E.eintrag_speichern, projektId=cls.pid, art="risiko", daten={"titel": "Netzkapazität (Test)", "eintritt": 4, "auswirkung": 4, "kostenEur": 200000, "restEintritt": 2}, als_benutzer=cls.pl)

	def test_1_uebersicht_und_kapazitaet(self):
		u = aufruf(ST.uebersicht, als_benutzer=self.pl)
		p = next(x for x in u["projekte"] if x["id"] == self.pid)
		self.assertEqual(p["ampel"]["risiko"]["farbe"], "rot")
		self.assertEqual(u["matrix"]["gesamt"]["anzahl"], u["summen"]["anzahl"])
		r = next(x for x in u["risiken"] if x["projektId"] == self.pid)
		self.assertEqual((r["erwartet"], r["restScore"]), (120000, 8))
		with self.assertRaises(frappe.PermissionError):
			aufruf(ST.kapazitaet_setzen, nutzerId=self.pl, stundenMonat=60, als_benutzer=self.pl)
		k = aufruf(ST.kapazitaet_setzen, nutzerId=self.pl, stundenMonat=100, als_benutzer=self.leitung)
		self.assertEqual(next(z for z in k["kapazitaet"]["zeilen"] if z["id"] == self.pl)["stundenMonat"], 100)
		with self.assertRaises(frappe.ValidationError):
			aufruf(ST.kapazitaet_setzen, nutzerId=self.pl, stundenMonat=5, als_benutzer=self.leitung)

	def test_2_sicherung_und_aufgaben(self):
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(ST.sicherung, projektId=self.pid, flaecheId=self.fid, daten={"grundbuch": "vorgemerkt"}, als_benutzer=self.pl)
		aufruf(E.eintrag_speichern, projektId=self.pid, art="flaeche", id=self.fid, daten={"pachtStatus": "option"}, als_benutzer=self.pl)
		s = aufruf(ST.sicherung, projektId=self.pid, flaecheId=self.fid, daten={"grundbuch": "vorgemerkt", "grundbuchDatum": add_days(nowdate(), -2), "optionBis": add_days(nowdate(), 20)}, als_benutzer=self.pl)
		self.assertEqual(s["sicherung"]["grundbuchHa"], 9)
		with self.assertRaises(frappe.PermissionError):
			aufruf(ST.aufgaben_erzeugen, projektId=self.pid, als_benutzer=self.lesen)
		e1 = aufruf(ST.aufgaben_erzeugen, projektId=self.pid, als_benutzer=self.pl)
		self.assertEqual(e1["optionen"], 1)
		e2 = aufruf(ST.aufgaben_erzeugen, projektId=self.pid, als_benutzer=self.pl)
		self.assertEqual(e2["angelegt"], 0)
		d = aufruf(ST.projekt, projektId=self.pid, als_benutzer=self.pl)
		self.assertIn("Rangordnung", d["grundbuchHinweis"])
		self.assertTrue(any("Optionsfrist" in a["titel"] for a in d["aufgaben"]))

	def test_3_vorlage(self):
		v = aufruf(ST.vorlage_speichern, projektId=self.pid, daten={"art": "gate_entwicklung", "budgetEur": 45000}, als_benutzer=self.pl)
		with self.assertRaises(frappe.ValidationError):
			aufruf(ST.vorlage_aktion, id=v["id"], aktion="einreichen", als_benutzer=self.pl)
		aufruf(ST.vorlage_speichern, projektId=self.pid, id=v["id"], daten={"beschlussvorschlag": "Die Geschäftsführung gibt 45.000 € Entwicklungsbudget frei (Test).", "sachverhalt": "Optionsvertrag über 9 ha, Rang angemerkt (Test)."}, als_benutzer=self.pl)
		x = aufruf(ST.vorlage_aktion, id=v["id"], aktion="einreichen", als_benutzer=self.pl)
		self.assertEqual(x["status"], "eingereicht")
		self.assertTrue(x["snapshot"]["ampel"]["gesamt"]["farbe"])
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(ST.vorlage_speichern, projektId=self.pid, id=v["id"], daten={"budgetEur": 1}, als_benutzer=self.pl)
		with self.assertRaises(frappe.PermissionError):
			aufruf(ST.vorlage_aktion, id=v["id"], aktion="genehmigen", als_benutzer=self.pl)
		with self.assertRaises(frappe.ValidationError):
			aufruf(ST.vorlage_aktion, id=v["id"], aktion="ablehnen", begruendung="kurz", als_benutzer=self.leitung)
		x = aufruf(ST.vorlage_aktion, id=v["id"], aktion="genehmigen", begruendung="Budget im Rahmen (Test).", als_benutzer=self.leitung)
		self.assertEqual(x["status"], "genehmigt")
		self.assertTrue(frappe.db.exists("Plattform Budgetposition", {"projekt_id": self.pid, "plan_eur": 45000}))
		self.assertTrue(frappe.db.exists("Plattform Entwicklung Entscheidung", {"projekt_id": self.pid, "art": "go"}))
		self.assertTrue(frappe.db.exists("Plattform Aufgabe", {"beschreibung": ["like", f"%/portal/admin/entwicklung/{self.pid}%"], "zustaendig_id": self.pl, "titel": ["like", "Gate 1 genehmigt%"]}))
		# Vier-Augen-Prinzip: Leitung reicht selbst ein → nur eine andere Leitung entscheidet
		w = aufruf(ST.vorlage_speichern, projektId=self.pid, daten={"art": "gate_rtb", "empfehlung": "verkauf", "beschlussvorschlag": "Verkauf der Projektrechte über die Projektbörse (Test).", "sachverhalt": "Baurecht absehbar, Investoren interessiert (Test)."}, als_benutzer=self.leitung)
		aufruf(ST.vorlage_aktion, id=w["id"], aktion="einreichen", als_benutzer=self.leitung)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(ST.vorlage_aktion, id=w["id"], aktion="genehmigen", option="verkauf", als_benutzer=self.leitung)
		y = aufruf(ST.vorlage_aktion, id=w["id"], aktion="genehmigen", option="bau_investor", als_benutzer=self.leitung2)
		self.assertEqual(y["entscheidung"]["option"], "bau_investor")
		self.assertEqual(frappe.db.get_value("Plattform Entwicklungsprojekt", self.pid, "verwertung"), "bau_investor")
