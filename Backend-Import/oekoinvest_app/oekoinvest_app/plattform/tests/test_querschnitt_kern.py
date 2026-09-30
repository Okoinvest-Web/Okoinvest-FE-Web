# Copyright (c) 2026, ÖkoInvest GmbH
#
# Querschnitt – reine Regeln (ohne Datenbank). Läuft ohne Bench:
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_querschnitt_kern -v
# Gleiche Fälle wie scripts/plattform-test-querschnitt.mjs (Teil A, Gleichheit JS/Python).

import unittest

from oekoinvest_app.plattform import querschnitt_kern as qk

PROTOKOLL = [
	{"id": "A-1", "am": "2026-09-01T08:00:00Z", "aktion": "upload", "objektArt": "flaeche", "objektId": "F-26-AAAA", "text": "Dokument Lageplan.pdf", "nutzer": "Frida Fläche", "nutzerId": "U-26-EINS"},
	{"id": "A-2", "am": "2026-09-10T09:00:00Z", "aktion": "status", "objektArt": "flaeche", "objektId": "F-26-AAAA", "text": "Status: Vorprüfung", "nutzer": "Anna Admin", "nutzerId": "U-26-ADMN"},
	{"id": "A-3", "am": "2026-09-20T10:00:00Z", "aktion": "export", "objektArt": "export", "objektId": "monatsbericht", "text": "Monatsbericht", "nutzer": "Anna Admin", "nutzerId": "U-26-ADMN"},
]


class TestProtokoll(unittest.TestCase):
	def test_ohne_filter_neueste_zuerst(self):
		r = qk.protokoll_filtern(PROTOKOLL, {})
		self.assertEqual([e["id"] for e in r["eintraege"]], ["A-3", "A-2", "A-1"])

	def test_filter(self):
		self.assertEqual(qk.protokoll_filtern(PROTOKOLL, {"q": "LAGEPLAN"})["gesamt"], 1)
		self.assertEqual(qk.protokoll_filtern(PROTOKOLL, {"nutzer": "admin"})["gesamt"], 2)
		self.assertEqual(qk.protokoll_filtern(PROTOKOLL, {"von": "2026-09-10", "bis": "2026-09-20"})["gesamt"], 2)
		self.assertEqual(qk.protokoll_filtern(PROTOKOLL, {"aktion": "upload"})["gesamt"], 1)

	def test_bereinigung(self):
		f = qk.protokoll_filter_bereinigen({"aktion": "up<script>", "von": "gestern", "seite": -3, "proSeite": 99999})
		self.assertEqual((f["aktion"], f["von"], f["seite"], f["proSeite"]), ("upscript", "", 1, 200))

	def test_seiten(self):
		viele = [{**PROTOKOLL[0], "id": f"A-{i}"} for i in range(120)]
		r = qk.protokoll_filtern(viele, {"proSeite": 50, "seite": 3})
		self.assertEqual((r["seiten"], len(r["eintraege"])), (3, 20))


class TestDigest(unittest.TestCase):
	def test_ohne_inhalte(self):
		t = qk.digest_text([{"art": "nachricht", "titel": "GEHEIM"}, {"art": "status"}, {"art": "nachricht"}], {"nachricht": "Neue Nachrichten", "status": "Statuswechsel"})
		self.assertEqual(t["anzahl"], 3)
		self.assertIn("Neue Nachrichten: 2", t["text"])
		self.assertNotIn("GEHEIM", t["text"] + t["betreff"])

	def test_faellig(self):
		self.assertFalse(qk.digest_faellig("sofort", None))
		self.assertTrue(qk.digest_faellig("taeglich", None))
		self.assertFalse(qk.digest_faellig("taeglich", 5))
		self.assertTrue(qk.digest_faellig("taeglich", 5, erzwingen=True))
		self.assertTrue(qk.digest_faellig("taeglich", 21))
		self.assertIn("sicherheit", qk.DIGEST_AUSNAHMEN)


if __name__ == "__main__":
	unittest.main()
