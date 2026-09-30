# Copyright (c) 2026, ÖkoInvest GmbH
# Planungsdateien & Projektkosten (Frappe): Spiegel von scripts/plattform-test-planung.mjs – Upload mit Kennungsprüfung,
# Änderungsindex, Freigabe ersetzt Vorversion, Planer darf nicht freigeben, Co-Investor nur freigegebene Versionen,
# Eigentümer → 403, Kalkulation (Summen, Überschreiben, Kostenstand append-only, Übergabe). Reine Regeln: test_planung_kern.py.

import base64

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform import planung_kern as K
from oekoinvest_app.plattform.api import entwicklung as E
from oekoinvest_app.plattform.api import planung as P
from oekoinvest_app.plattform.tests.testdaten import PDF, aufruf, flaeche_vollstaendig, konto, vorbereiten

DXF = b"0\r\nSECTION\r\n2\r\nHEADER\r\n9\r\n$INSUNITS\r\n70\r\n6\r\n0\r\nENDSEC\r\n0\r\nSECTION\r\n2\r\nENTITIES\r\n0\r\nLINE\r\n8\r\nZaun\r\n10\r\n0\r\n20\r\n0\r\n11\r\n100\r\n21\r\n0\r\n0\r\nENDSEC\r\n0\r\nEOF\r\n"
KENNZAHLEN = {"kennzahlen": {"zaunM": 100, "kabelMsM": 0, "anlageHa": 0, "layerGefunden": ["Zaun"]}}


class TestPlanung(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		E.vorlagen_sicherstellen()
		cls.admin = konto(["admin"])
		cls.eig = konto(["flaeche"], vorname="Eigen")
		cls.inv = konto(["investor"], vorname="Investor")
		fid = flaeche_vollstaendig(cls.eig)["id"]
		p = aufruf(E.anlegen, daten={"titel": "Solarpark Planung (Test)", "typ": "freiflaeche", "land": "DE", "bundesland": "Bayern", "gemeinde": "Testdorf", "mwp": 10, "flaecheId": fid}, als_benutzer=cls.admin)
		cls.pid = p["id"]
		aufruf(E.eintrag_speichern, projektId=cls.pid, art="freigabe", daten={"nutzerId": cls.inv, "risiken": True, "dokumente": True}, als_benutzer=cls.admin)

	def hoch(self, daten, fmt, plan_id=None, nummer="T-1", wer=None, analyse=None):
		return aufruf(P.hochladen, projektId=self.pid, planId=plan_id, plan={"plannummer": nummer, "titel": "Testplan", "planart": "lageplan"}, version={"aenderung": "Test"},
			name=f"plan.{fmt}", format=fmt, inhalt=base64.b64encode(daten).decode(), analyse=analyse or {}, als_benutzer=wer or self.admin)

	def test_1_upload_index_freigabe(self):
		r = self.hoch(DXF, "dxf", analyse=KENNZAHLEN)
		self.assertEqual(r["version"]["index"], "A")
		with self.assertRaises(frappe.ValidationError):
			self.hoch(b"MZ kein Plan", "dwg", nummer="T-2")
		with self.assertRaises(frappe.DuplicateEntryError):
			self.hoch(DXF, "dxf")
		b = self.hoch(DXF, "dxf", plan_id=r["plan"]["id"])
		self.assertEqual(b["version"]["index"], "B")
		for a in ("einreichen", "freigeben"):
			aufruf(P.version_aktion, versionId=r["version"]["id"], aktion=a, als_benutzer=self.admin)
		aufruf(P.version_aktion, versionId=b["version"]["id"], aktion="einreichen", als_benutzer=self.admin)
		aufruf(P.version_aktion, versionId=b["version"]["id"], aktion="freigeben", als_benutzer=self.admin)
		self.assertEqual(frappe.db.get_value(P.DT_VER, r["version"]["id"], "status"), "ersetzt")
		# Co-Investor: nur freigegebene Version B
		liste = aufruf(P.liste, projektId=self.pid, als_benutzer=self.inv)
		plan = next(x for x in liste["plaene"] if x["id"] == r["plan"]["id"])
		self.assertEqual([x["index"] for x in plan["versionen"]], ["B"])
		with self.assertRaises(frappe.PermissionError):
			aufruf(P.datei, versionId=r["version"]["id"], als_benutzer=self.inv)
		# Eigentümer: kein Zugriff
		with self.assertRaises(frappe.PermissionError):
			aufruf(P.liste, projektId=self.pid, als_benutzer=self.eig)

	def test_2_kalkulation(self):
		roh = aufruf(P.kalkulation, projektId=self.pid, als_benutzer=self.admin)
		self.assertIsNone(roh["gespeichert"])
		roh = aufruf(P.kalkulation_speichern, projektId=self.pid, parameter={"flaecheHa": 11, "zaunM": 1325, "trasse": {"abschnitte": [{"art": "graben", "laengeM": 1200}]}},
			positionen=[{"schluessel": "module", "gewerk": "module", "menge": 10000, "ep": 105, "manuell": True}], als_benutzer=self.admin)
		k = frappe.get_doc(P.DT_KALK, roh["gespeichert"]["id"])
		par = P._parameter_fuer(frappe.get_doc(E.DT, self.pid), k)
		e = K.berechnen(K.zusammenfuehren([P._pos_dict(x) for x in k.positionen], K.vorschlag(par)), par)
		self.assertAlmostEqual(k.summe_gesamt, e["summen"]["gesamt"], places=2)
		self.assertTrue(any(x["schluessel"] == "module" and x["manuell"] for x in roh["gespeichert"]["positionen"]))
		roh = aufruf(P.kalkulation_aktion, projektId=self.pid, aktion="festschreiben", stand="kostenrahmen", kommentar="Test", als_benutzer=self.admin)
		self.assertEqual(len(roh["staende"]), 1)
		ks = frappe.get_doc(P.DT_STAND, roh["staende"][0]["id"])
		ks.kommentar = "geändert"
		with self.assertRaises(frappe.PermissionError):
			ks.save(ignore_permissions=True)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(P.kalkulation_aktion, projektId=self.pid, aktion="trasse_akquise", als_benutzer=self.admin)
		roh = aufruf(P.kalkulation_aktion, projektId=self.pid, aktion="uebergeben", als_benutzer=self.admin)
		self.assertAlmostEqual(roh["uebergabe"]["finanzierungsbedarf"], frappe.db.get_value(P.DT_KALK, k.name, "finanzierungsbedarf"), places=2)
		with self.assertRaises(frappe.PermissionError):
			aufruf(P.kalkulation, projektId=self.pid, als_benutzer=self.inv)

	def test_3_pdf_kennung(self):
		self.assertTrue(K.erkennen(PDF, "pdf"))
