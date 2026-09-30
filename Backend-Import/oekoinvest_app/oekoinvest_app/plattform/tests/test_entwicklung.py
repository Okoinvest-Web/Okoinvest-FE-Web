# Copyright (c) 2026, ÖkoInvest GmbH
# Projektentwicklung (Frappe): Spiegel von scripts/plattform-test-entwicklung.mjs – Eigentümer sieht nur die vereinfachte Sicht
# seiner Fläche, Gutachter nur Zugewiesenes, fremde → 403, Meilenstein-Abhängigkeiten, Dokumentenpflicht, Übergabe an Börse
# erzeugt Projekt, Pipeline-Werte. Reine Regeln: test_entwicklung_kern.py.

import base64
import json

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform import entwicklung_kern as K
from oekoinvest_app.plattform.api import entwicklung as E
from oekoinvest_app.plattform.kern import sha256
from oekoinvest_app.plattform.tests.testdaten import PDF, aufruf, flaeche_vollstaendig, konto, vorbereiten


def _ms(p, schluessel):
	return next(m for m in p["meilensteine"] if m["schluessel"] == schluessel)


class TestEntwicklung(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		E.vorlagen_sicherstellen()
		cls.admin = konto(["admin"])
		cls.lesen = konto(["admin"], vorname="Lesen")
		frappe.db.set_value("Plattform Konto", cls.lesen, "backoffice_rollen", "lesen")
		cls.eig = konto(["flaeche"], vorname="Eigen")
		cls.fremd = konto(["flaeche"], vorname="Fremd")
		cls.inv = konto(["investor"], vorname="Investor")
		cls.fid = flaeche_vollstaendig(cls.eig)["id"]
		p = aufruf(E.anlegen, daten={"titel": "Solarpark Test (Test)", "typ": "freiflaeche", "land": "DE", "bundesland": "Bayern", "gemeinde": "Testdorf", "mwp": 10, "flaecheId": cls.fid}, als_benutzer=cls.admin)
		cls.pid = p["id"]
		aufruf(E.eintrag_speichern, projektId=cls.pid, art="flaeche", daten={"bezeichnung": "Geheime Nachbarfläche (Test)", "eigentuemerName": "Nachbar Geheim", "ha": 3}, als_benutzer=cls.admin)
		aufruf(E.eintrag_speichern, projektId=cls.pid, art="risiko", daten={"titel": "Internes Risiko (Test)", "eintritt": 4, "auswirkung": 5}, als_benutzer=cls.admin)
		aufruf(E.eintrag_speichern, projektId=cls.pid, art="risiko", daten={"titel": "Externes Risiko (Test)", "eintritt": 2, "auswirkung": 3, "extern": True}, als_benutzer=cls.admin)

	def projekt(self):
		return aufruf(E.holen, id=self.pid, als_benutzer=self.admin)

	def speichern(self, mid, daten, wer=None):
		return aufruf(E.eintrag_speichern, projektId=self.pid, art="meilenstein", id=mid, daten=daten, als_benutzer=wer or self.admin)

	def test_1_plan_und_pipeline(self):
		p = self.projekt()
		self.assertGreaterEqual(len(p["meilensteine"]), 18)
		self.assertIsNone(p["phase"])
		self.assertEqual(p["pipeline"]["wert"], K.pipeline_wert(10, None)["wert"])
		for m in p["meilensteine"]:
			for v in m["nach"]:
				vor = next(x for x in p["meilensteine"] if x["id"] == v)
				self.assertGreaterEqual(m["sollStart"], vor["sollEnde"])
		pf = aufruf(E.portfolio, als_benutzer=self.admin)
		offen = [x for x in pf["projekte"] if x["status"] in K.ENTWICKLUNG_OFFEN]
		self.assertEqual(pf["summen"]["wert"], sum(x["pipeline"]["wert"] for x in offen))
		self.assertEqual(pf["summen"]["zielMwpJahr"], 50)

	def test_2_abhaengigkeiten_und_dokumentenpflicht(self):
		p = self.projekt()
		with self.assertRaises(frappe.DuplicateEntryError):
			self.speichern(_ms(p, "netzzusage")["id"], {"status": "erledigt"})
		with self.assertRaises(frappe.DuplicateEntryError):
			self.speichern(_ms(p, "flaechensicherung")["id"], {"nach": [_ms(p, "netzanfrage")["id"]]})
		with self.assertRaises(frappe.ValidationError):
			self.speichern(_ms(p, "flaechensicherung")["id"], {"status": "erledigt"})
		self.speichern(_ms(p, "flaechensicherung")["id"], {"status": "erledigt", "nachweisVerzicht": "Vertrag liegt im Original vor (Test)."})
		p = self.projekt()
		self.assertEqual(p["phase"], "flaeche")
		self.assertEqual(p["pipeline"]["wert"], K.pipeline_wert(10, "flaeche")["wert"])
		# Eigentümer wurde benachrichtigt (externer Titel)
		self.assertTrue(frappe.db.exists("Plattform Benachrichtigung", {"nutzer_id": self.eig, "art": "entwicklung"}))
		self.speichern(_ms(p, "netzanfrage")["id"], {"status": "erledigt", "nachweisVerzicht": "Anfrage per Portal des Netzbetreibers (Test)."})
		with self.assertRaises(frappe.DuplicateEntryError):
			self.speichern(_ms(p, "flaechensicherung")["id"], {"status": "offen"})  # Nachfolger bereits erledigt

	def test_3_eigentuemer_nur_vereinfacht(self):
		s = aufruf(E.extern, id=self.pid, als_benutzer=self.eig)
		txt = json.dumps(s, ensure_ascii=False)
		self.assertIn("eigentuemer", s)
		self.assertNotIn("investor", s)
		for verboten in ("risiken", "budget", "entscheidungen", "Nachbar Geheim", "Geheime Nachbarfläche", "Internes Risiko", "pipeline", "notiz"):
			self.assertNotIn(verboten, txt)
		self.assertTrue(all(x["zeitraum"].startswith("Q") for x in s["eigentuemer"]["schritte"]))
		self.assertEqual([f["flaecheId"] for f in s["eigentuemer"]["meineFlaechen"]], [self.fid])
		with self.assertRaises(frappe.PermissionError):
			aufruf(E.extern, id=self.pid, als_benutzer=self.fremd)
		with self.assertRaises(frappe.PermissionError):
			aufruf(E.holen, id=self.pid, als_benutzer=self.eig)
		self.assertEqual(aufruf(E.meine, als_benutzer=self.fremd), [])

	def test_4_gutachter_nur_zugewiesen(self):
		p = self.projekt()
		art = _ms(p, "gutachten_artenschutz")
		gut = konto(["flaeche"], vorname="Gutachter")
		email = frappe.db.get_value("Plattform Konto", gut, "email")
		aufruf(E.gutachter_einladen, projektId=self.pid, email=email, meilensteinIds=json.dumps([art["id"]]), als_benutzer=self.admin)
		e = frappe.get_last_doc("Plattform Gutachter Einladung", filters={"email": email})
		# Das Token steht nur in der E-Mail (gespeichert ist der SHA-256) – für den Test ein bekanntes Token setzen
		token = "t" * 40
		e.db_set("hash", sha256(token))
		with self.assertRaises(frappe.PermissionError):
			aufruf(E.einladung_annehmen, token=token, als_benutzer=self.eig)
		aufruf(E.einladung_annehmen, token=token, als_benutzer=gut)
		s = aufruf(E.extern, id=self.pid, als_benutzer=gut)
		self.assertEqual([a["id"] for a in s["gutachter"]["auftraege"]], [art["id"]])
		self.assertNotIn("risiken", json.dumps(s))
		with self.assertRaises(frappe.PermissionError):
			aufruf(E.meilenstein_melden, projektId=self.pid, meilensteinId=_ms(p, "umweltbericht")["id"], aktion="in_arbeit", als_benutzer=gut)
		with self.assertRaises(frappe.PermissionError):
			aufruf(E.dokument_speichern, projektId=self.pid, meilensteinId=_ms(p, "umweltbericht")["id"], name="x.pdf", mime="application/pdf", inhalt=base64.b64encode(PDF).decode(), als_benutzer=gut)
		d = aufruf(E.dokument_speichern, projektId=self.pid, meilensteinId=art["id"], pflicht="Artenschutzgutachten", name="saP.pdf", mime="application/pdf", inhalt=base64.b64encode(PDF).decode(), freigabeInvestor=True, als_benutzer=gut)
		self.assertFalse(d["freigabeInvestor"])
		aufruf(E.meilenstein_melden, projektId=self.pid, meilensteinId=art["id"], aktion="eingereicht", als_benutzer=gut)
		with self.assertRaises(frappe.PermissionError):
			aufruf(E.holen, id=self.pid, als_benutzer=gut)

	def test_5_co_investor(self):
		with self.assertRaises(frappe.PermissionError):
			aufruf(E.extern, id=self.pid, als_benutzer=self.inv)
		aufruf(E.eintrag_speichern, projektId=self.pid, art="freigabe", daten={"nutzerId": self.inv}, als_benutzer=self.admin)
		s = aufruf(E.extern, id=self.pid, als_benutzer=self.inv)
		self.assertEqual([r["titel"] for r in s["investor"]["risiken"]], ["Externes Risiko (Test)"])
		self.assertNotIn("Nachbar Geheim", json.dumps(s, ensure_ascii=False))

	def test_6_uebergabe_boerse(self):
		r = aufruf(E.aktion, projektId=self.pid, aktion="uebergabe_boerse", als_benutzer=self.admin)
		bp = frappe.get_doc("Plattform Projekt", r["boerseProjektId"])
		self.assertEqual(bp.status, "entwurf")
		self.assertEqual(float(bp.mwp), 10)
		self.assertEqual(json.loads(bp.vertraulich)["gemeinde"], "Testdorf")
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(E.aktion, projektId=self.pid, aktion="uebergabe_boerse", als_benutzer=self.admin)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(E.aktion, projektId=self.pid, aktion="uebergabe_anlage", als_benutzer=self.admin)  # vor RTB

	def test_7_unterrollen_und_protokoll(self):
		aufruf(E.portfolio, als_benutzer=self.lesen)
		with self.assertRaises(frappe.PermissionError):
			aufruf(E.anlegen, daten={"titel": "Darf nicht", "typ": "freiflaeche", "land": "DE", "bundesland": "Bayern", "mwp": 1}, als_benutzer=self.lesen)
		e = frappe.get_last_doc("Plattform Entwicklung Entscheidung", filters={"projekt_id": self.pid})
		e.titel = "geändert"
		with self.assertRaises(frappe.PermissionError):
			e.save(ignore_permissions=True)
