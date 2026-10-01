# Copyright (c) 2026, ÖkoInvest GmbH
# Fristerinnerungen (Integration) – reine Regeln, ohne Frappe lauffähig:
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_frist_erinnerung_kern
# Gleiche Fälle wie scripts/plattform-test-integration.mjs (Teil A, inkl. Gleichheit JS/Python).

import unittest

from oekoinvest_app.plattform import frist_erinnerung_kern as R

HEUTE = "2026-10-01"
VERTRAG = {"id": "PT-1", "bezeichnung": "Acker Nord (Test)", "status": "aktiv", "beginn": "2026-07-01", "ende": "2027-06-30", "kuendigungZum": ""}
FRISTEN = [
	{"id": "ende", "datum": "2026-12-30", "titel": "Ende der Grundlaufzeit", "text": "Danach endet der Vertrag."},
	{"id": "vorbereitung", "datum": "2026-10-08", "titel": "Verlängerung oder Rückbau abstimmen", "text": ""},
	{"id": "kuendigung", "datum": "2026-09-20", "titel": "Vertragsende laut Kündigung", "text": ""},
	{"id": "fremd", "datum": "2026-10-01", "titel": "Unbekannt", "text": ""},
]


class TestStufen(unittest.TestCase):
	def test_stufen(self):
		st = lambda f, s=None: (R.erinnerungs_stufe(f, HEUTE, s) or {}).get("stufe")  # noqa: E731
		self.assertIsNone(st("2027-02-01"))
		self.assertEqual([st(x) for x in ("2026-12-30", "2026-10-31", "2026-10-08", "2026-10-01", "2026-09-20")], ["t90", "t30", "t7", "t0", "ueberfaellig"])
		self.assertIsNone(st("2026-08-01"))
		self.assertEqual(st("2026-10-05", R.ERINNERUNG_STUFEN["einzahlung"]), "t7")
		self.assertEqual(len(R.erinnerungs_schluessel("PA", "x" * 80)), 60)


class TestBereiche(unittest.TestCase):
	def test_pacht(self):
		e = R.pacht_erinnerungen(vertrag=VERTRAG, fristen=FRISTEN, akte={"sicherheit": {"status": "vorgesehen", "ab": "baubeginn"}}, heute=HEUTE)
		self.assertEqual(len(e), 4)
		self.assertEqual(next(x for x in e if x["titel"] == "Rückbausicherheit fehlt")["an"], ["backoffice"])
		self.assertEqual(len(R.pacht_erinnerungen(vertrag={**VERTRAG, "status": "gekuendigt"}, fristen=FRISTEN, akte={}, heute=HEUTE)), 1)
		self.assertEqual(R.pacht_erinnerungen(vertrag={**VERTRAG, "status": "beendet"}, fristen=FRISTEN, heute=HEUTE), [])

	def test_einzahlung(self):
		m = {"id": "GM-1", "status": "zugelassen", "nr": "17", "einzahlungFrist": "2026-10-05"}
		e = R.einzahlung_erinnerungen(mitglied=m, offen_eur=1250, geno_name="Bürgerenergie Test eG", heute=HEUTE)
		self.assertEqual(e[0]["an"], ["mitglied"])
		self.assertIn("1.250 €", e[0]["text"])
		u = R.einzahlung_erinnerungen(mitglied={**m, "einzahlungFrist": "2026-09-28"}, offen_eur=500, heute=HEUTE)
		self.assertEqual((u[0]["stufe"], u[0]["an"]), ("ueberfaellig", ["mitglied", "backoffice"]))
		self.assertEqual(R.einzahlung_erinnerungen(mitglied=m, offen_eur=0, heute=HEUTE), [])

	def test_stellungnahme(self):
		s = [
			{"id": "GS-1", "betreff": "Eingrünung", "frist": "2026-10-03", "status": "offen", "von": "oekoinvest"},
			{"id": "GS-2", "betreff": "Wegerecht", "frist": "2026-09-25", "status": "offen", "von": "gemeinde"},
			{"id": "GS-3", "betreff": "Erledigt", "frist": "2026-10-01", "status": "erledigt", "von": "gemeinde"},
		]
		e = R.stellungnahme_erinnerungen(akte_id="GA-1", gemeinde="Demo-Stadt", stellungnahmen=s, heute=HEUTE)
		self.assertEqual([(x["stufe"], x["an"]) for x in e], [("t2", ["gemeinde"]), ("ueberfaellig", ["backoffice"])])


if __name__ == "__main__":
	unittest.main()
