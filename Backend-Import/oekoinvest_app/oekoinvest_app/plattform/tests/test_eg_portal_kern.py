# Copyright (c) 2026, ÖkoInvest GmbH
# Energiegemeinschaften WP6 „Portale“ – Regeltest ohne Frappe:
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_eg_portal_kern
# Liest die gemeinsamen Testvektoren src/lib/plattform/eg/testdaten/portal/faelle.json (dieselben wie
# scripts/plattform-test-eg-portal.mjs, das zusätzlich die Gleichheit JS ↔ Python Feld für Feld prüft).
# Ohne Website-Quelltext (Backend-Server allein) wird der Test übersprungen.

import json
import os
import sys
import types
import unittest

try:
	import frappe  # noqa: F401
except ImportError:  # pragma: no cover
	sys.modules["frappe"] = types.ModuleType("frappe")

from oekoinvest_app.plattform import eg_portal_kern as P
from oekoinvest_app.plattform.mitglied_kern import MitgliedFehler

HIER = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.normpath(os.path.join(HIER, "..", "..", "..", "..", ".."))
FAELLE = os.path.join(WEB, "src", "lib", "plattform", "eg", "testdaten", "portal", "faelle.json")


@unittest.skipUnless(os.path.exists(FAELLE), "Testvektoren der Website nicht vorhanden")
class TestEgPortalKern(unittest.TestCase):
	@classmethod
	def setUpClass(cls):
		with open(FAELLE, encoding="utf-8") as f:
			cls.F = json.load(f)
		cls.NB = cls.F["netzbetreiber"]
		cls.G = cls.F["gemeinschaften"]

	def test_interesse(self):
		for f in self.F["interesse"]:
			if f.get("fehler"):
				with self.assertRaises(MitgliedFehler) as e:
					P.interesse_bereinigen(f["eingabe"], self.NB)
				self.assertEqual(e.exception.feld, f["fehler"])
			else:
				i = P.interesse_bereinigen(f["eingabe"], self.NB)
				for k, v in f["erwartet"].items():
					self.assertEqual(i[k], v)
				self.assertEqual(P.interesse_cluster(i, self.NB)["schluessel"], "ENB-OOE:4910")

	def test_eignung_und_suche(self):
		for f in self.F["eignung"]:
			self.assertEqual(P.eignung_pruefen(f["daten"], self.G[f["gemeinschaft"]], self.NB)["ergebnis"], f["erwartet"])
		oeff = [P.gemeinschaft_oeffentlich(g, tarif=self.F["tarif"], mitglieder=3, plz_bereich=(["4911", "4910"] if g["id"] == "EGG-T1" else [])) for g in self.G]
		for f in self.F["suche"]:
			self.assertEqual([f"{x['id']}:{x['passung']}" for x in P.gemeinschaften_suchen(oeff, plz=f["plz"])], f["erwartet"])

	def test_beitritt(self):
		for f in self.F["beitritt"]:
			if f.get("fehler"):
				with self.assertRaises(MitgliedFehler) as e:
					P.beitritt_bereinigen(f["daten"], self.G[f["gemeinschaft"]], self.NB)
				self.assertEqual(e.exception.feld, f["fehler"])
			else:
				b = P.beitritt_bereinigen(f["daten"], self.G[f["gemeinschaft"]], self.NB)
				self.assertEqual(b["zustimmungen"], f["erwartet"]["zustimmungen"])
				self.assertEqual(b["zaehlpunkte"][0]["teilnahmefaktor"], f["erwartet"]["tf"])

	def test_rechner(self):
		r = P.rechner_oeffentlich(self.F["rechner"][0]["eingabe"])
		self.assertEqual(r["nettoEur"], self.F["rechner"][0]["erwartet"]["nettoEur"])
		self.assertEqual(r["bezugKwh"], self.F["rechner"][0]["erwartet"]["bezugKwh"])
		beg = P.rechner_oeffentlich(self.F["rechner"][2]["eingabe"])
		self.assertEqual(next(t for t in beg["teile"] if t["id"] == "netz")["eur"], 0)

	def test_dashboard(self):
		for f in self.F["schritte"]:
			s = P.teilnahme_schritte(f["mitgliedStatus"], f["teilnahme"], f["heute"])
			self.assertEqual(s["aktuell"], f["erwartet"])
			if "frist" in f:
				self.assertEqual(s["frist"]["tageRest"], f["frist"])
		m = P.mehrfach_uebersicht(self.F["mehrfach"]["zaehlpunkte"], self.F["mehrfach"]["teilnahmen"], self.G)
		self.assertEqual([m[0]["summeTf"], m[1]["summeTf"], m[1]["freiTf"]], [100, 70, 30])
		self.assertEqual([P.sozialquote(**f["eingabe"])["status"] for f in self.F["sozialquote"]], [f["erwartet"] for f in self.F["sozialquote"]])
		k = P.energie_kennzahlen(self.F["kennzahlen"][0]["eintraege"], self.F["kennzahlen"][0]["preise"])
		self.assertEqual((k["anteilPct"], k["eingebrachtKwh"]), (30.1, 180))

	def test_stunden(self):
		self.assertEqual(P.gruene_stunden(None, "2026-10-01")["quelle"], "typisch")
		s = P.gruene_stunden(self.F["prognosen"][1]["prognose"], "2026-07-01")
		self.assertEqual([f"{f['von']}-{f['bis']}" for f in s["tage"][0]["fenster"]], ["10:00-13:00", "14:00-15:00"])


if __name__ == "__main__":
	unittest.main()
