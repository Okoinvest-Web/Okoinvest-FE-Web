# Copyright (c) 2026, ÖkoInvest GmbH
# Dokumenten-Checklisten, Datenraum-Qualität in der Börse, Exposé-Daten (Rechte + Protokoll), Protokoll-Positivliste.

import base64

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform.api import admin, boerse, dokument, projekt
from oekoinvest_app.plattform.checkliste import checkliste_flaeche, checkliste_projekt
from oekoinvest_app.plattform.tests.testdaten import PDF, aufruf, flaeche_vollstaendig, interesse_mit_datenraum, konto, projekt_veroeffentlicht, vorbereiten


class TestCheckliste(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		cls.admin = konto(["admin"])
		cls.anbieter = konto(["anbieter"])
		cls.investor = konto(["investor"])
		cls.fremder = konto(["investor"])
		cls.eigentuemer = konto(["flaeche"])

	def tearDown(self):
		frappe.set_user("Administrator")

	def _upload(self, art, kennung, schluessel, als, kategorie="datenraum"):
		return aufruf(
			dokument.speichern,
			bezugArt=art,
			bezugId=kennung,
			name=f"{schluessel}.pdf",
			mime="application/pdf",
			kategorie=kategorie,
			inhaltBase64=base64.b64encode(PDF).decode(),
			checkliste=schluessel,
			als_benutzer=als,
		)

	def test_reine_logik_wie_website(self):
		c = checkliste_projekt({"typ": "freiflaeche", "phase": "aufstellung", "land": "AT"}, [{"id": "D-1", "name": "x", "checkliste": "pacht"}])
		ids = {p["id"]: p for p in c["punkte"]}
		self.assertTrue(ids["gutachten"]["erwartet"])
		self.assertFalse(ids["satzung"]["erwartet"])
		self.assertEqual(ids["aufstellung"]["label"], "Einleitung Umwidmung (Grünland-PV)")
		self.assertEqual(c["erwartet"], 5)
		self.assertEqual(c["quote"], 20)
		self.assertNotIn("ertrag", {p["id"] for p in checkliste_projekt({"typ": "speicher", "phase": "cod"}, [])["punkte"]})
		f = checkliste_flaeche({"eigentum": "miteigentum", "land": "DE"}, [])
		self.assertTrue(next(p for p in f["punkte"] if p["id"] == "vollmacht")["erwartet"])
		self.assertEqual(f["quote"], 0)

	def test_upload_am_punkt_und_datenraum_qualitaet(self):
		pid = projekt_veroeffentlicht(self.anbieter, self.admin)
		vorher = aufruf(projekt.holen, id=pid, als_benutzer=self.anbieter)["checkliste"]["quote"]
		meta = self._upload("projekt", pid, "pacht", self.anbieter)
		self.assertEqual(meta["checkliste"], "pacht")
		unbekannt = self._upload("projekt", pid, "gibtsnicht", self.anbieter)
		self.assertEqual(unbekannt["checkliste"], "")
		p = aufruf(projekt.holen, id=pid, als_benutzer=self.anbieter)
		self.assertGreater(p["checkliste"]["quote"], vorher)
		karte = next(x for x in aufruf(boerse.liste)["projekte"] if x["id"] == pid)
		self.assertEqual(karte["datenraumQualitaet"], p["checkliste"]["quote"])
		self.assertNotIn("checkliste", karte)

	def test_flaeche_checkliste(self):
		f = flaeche_vollstaendig(self.eigentuemer)
		self._upload("flaeche", f["id"], "grundbuch", self.eigentuemer, kategorie="allgemein")
		from oekoinvest_app.plattform.api import flaeche

		c = aufruf(flaeche.holen, id=f["id"], als_benutzer=self.eigentuemer)["checkliste"]
		self.assertTrue(next(p for p in c["punkte"] if p["id"] == "grundbuch")["vorhanden"])

	def test_expose_rechte_und_protokoll(self):
		pid = projekt_veroeffentlicht(self.anbieter, self.admin)
		with self.assertRaises(frappe.PermissionError):
			aufruf(boerse.expose, id=pid, als_benutzer=self.investor)
		interesse_mit_datenraum(self.investor, self.admin, pid)
		d = aufruf(boerse.expose, id=pid, ip="127.0.0.1", als_benutzer=self.investor)
		self.assertEqual(d["zugriff"], "nda")
		self.assertEqual(d["vertraulich"]["gemeinde"], "Geheimdorf")
		self.assertEqual(d["empfaenger"]["rolle"], "investor")
		self.assertTrue(all(x["kategorie"] == "datenraum" for x in d["dokumente"]))
		with self.assertRaises(frappe.PermissionError):
			aufruf(boerse.expose, id=pid, als_benutzer=self.fremder)
		self.assertEqual(aufruf(boerse.expose, id=pid, als_benutzer=self.anbieter)["zugriff"], "eigentuemer")
		feed = aufruf(admin.aktivitaeten, objektId=pid, limit=100, als_benutzer=self.admin)
		self.assertGreaterEqual(sum(1 for x in feed if x["aktion"] == "expose"), 2)

	def test_protokoll_eintrag_positivliste(self):
		aufruf(admin.protokoll_eintrag, aktion="export", objektArt="export", objektId="vorgaenge", text="CSV-Export Vorgänge (1 Zeilen)", als_benutzer=self.admin)
		with self.assertRaises(frappe.ValidationError):
			aufruf(admin.protokoll_eintrag, aktion="status", objektArt="x", objektId="y", text="gefälscht", als_benutzer=self.admin)
		with self.assertRaises(frappe.PermissionError):
			aufruf(admin.protokoll_eintrag, aktion="export", objektArt="export", objektId="x", text="x", als_benutzer=self.investor)
		ids = aufruf(admin.aktivitaeten, objektIds=["vorgaenge"], als_benutzer=self.admin)
		self.assertTrue(any(x["aktion"] == "export" for x in ids))
