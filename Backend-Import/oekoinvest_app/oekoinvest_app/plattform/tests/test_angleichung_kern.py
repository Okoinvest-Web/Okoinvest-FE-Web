# Copyright (c) 2026, ÖkoInvest GmbH
#
# Angleichung an die Kernlogik-Korrekturen der Website (Commit a6418e2, src/lib/plattform/**) – reine Regeln ohne Datenbank.
# Läuft mit Frappe-Stub auch ohne Bench:
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_angleichung_kern -v

import sys
import types
import unittest

try:  # Bench vorhanden → echtes Frappe; sonst minimaler Stub
	import frappe  # noqa: F401
except ImportError:  # pragma: no cover
	sys.modules["frappe"] = types.ModuleType("frappe")

from oekoinvest_app.plattform import akquise_kampagne_kern as kk
from oekoinvest_app.plattform import dienste_kern as dk
from oekoinvest_app.plattform import energie_kern as ek
from oekoinvest_app.plattform import entwicklung_kern as ew
from oekoinvest_app.plattform import kyc_kern as k
from oekoinvest_app.plattform.finanzen import logik as L


class TestLaufzeitEnde(unittest.TestCase):
	"""finanzen/faelligkeit.js laufzeitEnde"""

	def test_schalttag_beginn(self):
		self.assertEqual(L.laufzeit_ende("2024-02-29", 1), "2025-02-28")  # nicht 27.02.
		self.assertEqual(L.laufzeit_ende("2024-02-29", 4), "2028-02-28")  # Schaltjahr: Tag vor dem 29.02.
		self.assertEqual(L.laufzeit_ende("2024-03-01", 20), "2044-02-29")
		self.assertEqual(L.laufzeit_ende("2025-01-01", 20), "2044-12-31")
		self.assertIsNone(L.laufzeit_ende("2025-01-01", 0))


class TestRundung(unittest.TestCase):
	"""finanzen/basis.js rund/rund2: symmetrisch, kein −0"""

	def test_symmetrisch(self):
		self.assertEqual(L.rund2(1.005), 1.01)
		self.assertEqual(L.rund2(-1.005), -1.01)
		self.assertEqual(L.rund(-2.5, 0), -3.0)

	def test_kein_minus_null(self):
		for x in (-0.001, -0.0, -0.004):
			r = L.rund2(x)
			self.assertEqual(r, 0.0)
			self.assertEqual(str(r), "0.0")


class TestMonatsenden(unittest.TestCase):
	def test_plus_monate_ohne_ueberlauf(self):  # entwicklung.js plusMonate
		self.assertEqual(ew.plus_monate("2025-01-31", 1), "2025-02-28")
		self.assertEqual(ew.plus_monate("2024-01-31", 1), "2024-02-29")
		self.assertEqual(ew.plus_monate("2025-03-31", 1), "2025-04-30")
		self.assertEqual(ew.plus_monate("2025-01-15", 12), "2026-01-15")

	def test_kuendigungsstichtag(self):  # fach/energie.js abnahmestelleHinweise
		self.assertEqual(ek.kuendigungs_stichtag("2025-12-31", 3), "2025-09-30")
		self.assertEqual(ek.kuendigungs_stichtag("2025-05-31", 3), "2025-02-28")


class TestBonitaet(unittest.TestCase):
	"""dienste/bonitaet/basis.js bonitaetAmpel, adapter.js zahlOderNull"""

	def test_null_bleibt_unbekannt(self):
		for s in (None, "", "abc", float("nan"), True):
			self.assertEqual(dk.bonitaet_ampel("creditreform", s), "unbekannt")
		self.assertEqual(dk.bonitaet_ampel("creditreform", 0), "gruen")  # echte 0 bleibt eine Zahl

	def test_zahl_oder_null(self):
		self.assertIsNone(dk.zahl_oder_null(None))
		self.assertIsNone(dk.zahl_oder_null(""))
		self.assertEqual(dk.zahl_oder_null("250"), 250.0)
		self.assertEqual(dk.zahl_oder_null(0), 0.0)


class TestKyc(unittest.TestCase):
	"""demo/kyc.js vierAugenNoetig, kycFristen (Neuabgleich)"""

	E = {"vierAugenImmer": False, "vierAugenBeiHoch": True}

	def test_regelstufe_hoch_bleibt_vier_augen(self):
		self.assertTrue(k.vier_augen(self.E, "mittel", {"stufe": "mittel", "manuell": True, "regelStufe": "hoch"}))
		self.assertFalse(k.vier_augen(self.E, "mittel", {"stufe": "mittel", "regelStufe": "mittel"}))
		self.assertTrue(k.vier_augen(self.E, "niedrig", {}, [{"eintragId": "X"}]))
		self.assertTrue(k.vier_augen({"vierAugenImmer": True}, "niedrig", {}))
		self.assertFalse(k.vier_augen({"vierAugenBeiHoch": False}, "hoch", {}))

	def test_neuer_treffer_ueber_schluessel(self):
		alt = [{"eintragId": "A", "prueflingName": "Max Muster", "bewertung": None}]
		getauscht = [{"eintragId": "B", "prueflingName": "Max Muster", "bewertung": None}]
		self.assertTrue(k.neuer_treffer(alt, getauscht))  # gleiche Anzahl, aber neuer Treffer
		self.assertFalse(k.neuer_treffer(alt, alt))
		self.assertFalse(k.neuer_treffer([], [{"eintragId": "C", "prueflingName": "X", "bewertung": "ausgeschlossen"}]))


class TestKampagnenSperren(unittest.TestCase):
	"""demo/akquise-kampagne.js: Widerspruch nicht umgehbar"""

	def test_gesperrt_nur_notizen(self):
		self.assertTrue(kk.gesperrt_aenderung_erlaubt(True, {"notiz": "Anruf"}))
		for feld in ("status", "termin", "rueckmeldung", "einwilligungTelefon", "einwilligungEmail"):
			self.assertFalse(kk.gesperrt_aenderung_erlaubt(True, {feld: "x"}), feld)
		self.assertTrue(kk.gesperrt_aenderung_erlaubt(False, {"status": "termin"}))

	def test_ziel_status_nicht_zurueck(self):
		self.assertEqual(kk.ziel_status_nach_grundbuch("termin", False), "termin")
		self.assertEqual(kk.ziel_status_nach_grundbuch("offen", True), "gesperrt")
		self.assertEqual(kk.ziel_status_nach_grundbuch("ermittelt", False), "ermittelt")

	def test_statuswechsel(self):
		self.assertFalse(kk.kampagne_status_wechsel_erlaubt("aktiv", "entwurf")[0])
		self.assertFalse(kk.kampagne_status_wechsel_erlaubt("abgeschlossen", "aktiv")[0])
		self.assertFalse(kk.kampagne_status_wechsel_erlaubt("entwurf", "aktiv")[0])
		self.assertTrue(kk.kampagne_status_wechsel_erlaubt("aktiv", "abgeschlossen")[0])


if __name__ == "__main__":
	unittest.main()
