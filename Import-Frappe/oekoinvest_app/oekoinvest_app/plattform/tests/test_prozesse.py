# Copyright (c) 2026, ÖkoInvest GmbH
# Zustandsautomaten: Tabelle, Prüfung (Rolle, Pflicht, Bedingung) und Durchsetzung im Controller.

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import anfrage, flaeche, nachricht, prozess
from oekoinvest_app.plattform.prozesse import PROZESSE, STARTSTATUS, projekt_einreichbar, pruefe_uebergang
from oekoinvest_app.plattform.tests.testdaten import aufruf, flaeche_vollstaendig, konto, vorbereiten


def _anfrage(email="anfrage-test@example.com", typ="kontakt"):
	return aufruf(
		anfrage.anlegen,
		typ=typ,
		kontakt={"vorname": "Anna", "nachname": "Anfrage (Test)", "email": email, "plz": "86842", "ort": "Testort"},
		daten={"ha": "7,5", "nachricht": "Bitte um Rückruf."},
		herkunft={},
		ip="127.0.0.1",
		einwilligungText="Einwilligung (Test)",
	)


class TestProzesse(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()

	def tearDown(self):
		frappe.set_user("Administrator")

	# ------------------------------------------------------------ Tabelle

	def test_tabelle_konsistent(self):
		for art, p in PROZESSE.items():
			self.assertIn(p["start"], p["status"], art)
			for s in STARTSTATUS[art]:
				self.assertIn(s, p["status"], art)
			for u in p["uebergaenge"]:
				self.assertIn(u["nach"], p["status"], f"{art}: {u}")
				self.assertIn(u["wer"], ("admin", "eigentuemer", "system"))
				for von in u["von"]:
					self.assertIn(von, p["status"], f"{art}: {u}")

	def test_erlaubter_uebergang(self):
		u = pruefe_uebergang("vorgang", "eingegangen", "in_pruefung", "admin")
		self.assertEqual(u["aktion"], "Prüfung beginnen")

	def test_nicht_vorgesehen_ist_409(self):
		with self.assertRaises(frappe.DuplicateEntryError):
			pruefe_uebergang("vorgang", "eingegangen", "abgeschlossen", "admin")

	def test_falsche_rolle_ist_403(self):
		with self.assertRaises(frappe.PermissionError):
			pruefe_uebergang("vorgang", "eingegangen", "in_pruefung", "eigentuemer")
		with self.assertRaises(frappe.PermissionError):
			pruefe_uebergang("projekt", "pruefung", "veroeffentlicht", "eigentuemer", {"provisionSatz": 0.02})

	def test_pflichtangaben(self):
		with self.assertRaises(frappe.ValidationError):
			pruefe_uebergang("vorgang", "in_pruefung", "abgelehnt", "admin", {})
		with self.assertRaises(frappe.ValidationError):
			pruefe_uebergang("vorgang", "in_pruefung", "abgelehnt", "admin", {"grund": ""})
		self.assertTrue(pruefe_uebergang("vorgang", "in_pruefung", "abgelehnt", "admin", {"grund": "Passt nicht."}))
		with self.assertRaises(frappe.ValidationError):
			pruefe_uebergang("interesse", "gemerkt", "nda_angefragt", "eigentuemer", {"ndaAkzeptiert": False})

	def test_bedingung_projekt_einreichbar(self):
		fehlt = projekt_einreichbar({"titel": "X"})
		self.assertIn("Provisionsvereinbarung akzeptieren", fehlt)
		self.assertIn("Beschreibung (mind. 80 Zeichen)", fehlt)
		with self.assertRaises(frappe.ValidationError):
			pruefe_uebergang("projekt", "entwurf", "pruefung", "eigentuemer", {}, objekt={"titel": "X"})

	def test_bedingung_flaeche_vollstaendig(self):
		with self.assertRaises(frappe.ValidationError):
			pruefe_uebergang("flaeche", "entwurf", "eingegangen", "eigentuemer", {}, objekt={"bezeichnung": "A"})
		ok = {"bezeichnung": "A", "land": "DE", "plz": "12345", "ort": "B", "ha": 3}
		self.assertTrue(pruefe_uebergang("flaeche", "entwurf", "eingegangen", "eigentuemer", {}, objekt=ok))

	# ------------------------------------------------------------ Controller

	def test_neuer_datensatz_nur_im_startstatus(self):
		frappe.set_user("Administrator")
		vg = frappe.get_doc({"doctype": "Plattform Vorgang", "typ": "kontakt", "status": "abgeschlossen", "email": "x@example.com"})
		with self.assertRaises(frappe.ValidationError):
			vg.insert(ignore_permissions=True)

	def test_controller_verbietet_sprung(self):
		r = _anfrage()
		vg = frappe.get_doc("Plattform Vorgang", r["id"])
		vg.status = "abgeschlossen"
		with self.assertRaises(frappe.DuplicateEntryError):
			vg.save(ignore_permissions=True)

	def test_controller_desk_nur_admin_schritte_ohne_pflicht(self):
		r = _anfrage()
		vg = frappe.get_doc("Plattform Vorgang", r["id"])
		vg.status = "in_pruefung"
		vg.save(ignore_permissions=True)  # admin-Schritt ohne Pflichtangaben: erlaubt
		vg.reload()
		vg.status = "abgelehnt"  # braucht Begründung → nur über das Portal
		with self.assertRaises(frappe.ValidationError):
			vg.save(ignore_permissions=True)
		vg.reload()
		vg.status = "zurueckgezogen"  # Eigentümer-Schritt → nicht im Desk
		with self.assertRaises(frappe.ValidationError):
			vg.save(ignore_permissions=True)

	# ------------------------------------------------------------ API

	def test_anfrage_flaeche_legt_entwurf_an(self):
		r = _anfrage(typ="flaeche")
		self.assertEqual(r["vorgang"]["status"], "eingegangen")
		self.assertTrue(r["vorgang"]["flaecheId"])
		f = frappe.get_doc("Plattform Flaeche", r["vorgang"]["flaecheId"])
		self.assertEqual(f.status, "entwurf")
		self.assertEqual(f.ha, 7.5)

	def test_eigentuemer_zieht_zurueck_mit_systemnachricht(self):
		kid = konto(["flaeche"])
		email = frappe.db.get_value("Plattform Konto", kid, "email")
		# angemeldet + bestätigt + gleiche E-Mail → sofort zugeordnet
		r = aufruf(
			anfrage.anlegen,
			typ="kontakt",
			kontakt={"vorname": "Test", "nachname": "(Test)", "email": email},
			daten={},
			herkunft={},
			ip="127.0.0.1",
			einwilligungText="Einwilligung (Test)",
			als_benutzer=kid,
		)
		self.assertEqual(frappe.db.get_value("Plattform Vorgang", r["id"], "nutzer_id"), kid)
		obj = aufruf(prozess.status_wechsel, art="vorgang", id=r["id"], nach="zurueckgezogen", als="eigentuemer", extra={}, als_benutzer=kid)
		self.assertEqual(obj["status"], "zurueckgezogen")
		m = frappe.get_all("Plattform Nachricht", filters={"bezug_art": "vorgang", "bezug_id": r["id"], "system": 1}, fields=["text", "gelesen_admin", "gelesen_nutzer"])
		self.assertEqual(len(m), 1)
		self.assertTrue(m[0].text.startswith("Status: „Eingegangen“ → „Zurückgezogen“"))
		self.assertEqual((m[0].gelesen_admin, m[0].gelesen_nutzer), (0, 1))
		thread = aufruf(nachricht.liste, bezugArt="vorgang", bezugId=r["id"], markieren=True, als_benutzer=kid)
		self.assertEqual(len(thread["nachrichten"]), 1)

	def test_flaeche_einreichen_und_pachtangebot(self):
		eigentuemer = konto(["flaeche"])
		admin = konto(["admin"])
		f = flaeche_vollstaendig(eigentuemer)
		aufruf(prozess.status_wechsel, art="flaeche", id=f["id"], nach="eingegangen", als="eigentuemer", extra={}, als_benutzer=eigentuemer)
		for nach in ("vorpruefung", "standortanalyse"):
			aufruf(prozess.status_wechsel, art="flaeche", id=f["id"], nach=nach, als="admin", extra={}, als_benutzer=admin)
		with self.assertRaises(frappe.ValidationError):
			aufruf(prozess.status_wechsel, art="flaeche", id=f["id"], nach="pachtangebot", als="admin", extra={"pachtangebot": {"euroProHaJahr": 10}}, als_benutzer=admin)
		aufruf(
			prozess.status_wechsel,
			art="flaeche",
			id=f["id"],
			nach="pachtangebot",
			als="admin",
			extra={"pachtangebot": {"euroProHaJahr": 1500, "laufzeitJahre": 30}},
			als_benutzer=admin,
		)
		# Annehmen darf nur der Eigentümer (bzw. Admin als „erfasst“)
		ergebnis = aufruf(prozess.status_wechsel, art="flaeche", id=f["id"], nach="vertrag", als="eigentuemer", extra={}, als_benutzer=eigentuemer)
		self.assertEqual(ergebnis["status"], "vertrag")
		self.assertEqual(ergebnis["pachtangebot"]["euroProHaJahr"], 1500)
		# Eigentümer darf die Fläche jetzt nicht mehr ändern (409)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(flaeche.aendern, id=f["id"], daten={"bezeichnung": "Neu"}, als_benutzer=eigentuemer)
