# Copyright (c) 2026, ÖkoInvest GmbH
# Kundenseite Energie – reine Logik ohne Frappe (Spiegel von Teil A in scripts/plattform-test-energiekunde.mjs):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_kundenenergie_kern

import unittest

from oekoinvest_app.plattform import kundenenergie_kern as k

HEUTE = "2026-10-01"
BELEG = {"art": "contracting", "beleg": "rechnung", "status": "offen", "brutto": 1309.0}
VERTRAG = {"status": "aktiv", "ende": "2040-06-01", "kuendigungsfristMonate": 6, "endschaft": "kaufoption", "kaufoptionEur": 120000}


def fehler(fn, *a, **kw):
	try:
		fn(*a, **kw)
	except k.FachFehler as e:
		return e.status
	return None


class TestAnliegen(unittest.TestCase):
	def test_uebergaenge(self):
		self.assertEqual(k.uebergang("einspruch", "eingereicht", "pruefen", "bo"), "in_pruefung")
		self.assertEqual(k.uebergang("einspruch", "in_pruefung", "teilweise", "bo"), "teilweise")
		self.assertEqual(fehler(k.uebergang, "einspruch", "eingereicht", "stattgeben", "kunde"), 403)
		self.assertEqual(fehler(k.uebergang, "einspruch", "abgelehnt", "zurueckziehen", "kunde"), 409)
		self.assertEqual(fehler(k.uebergang, "einspruch", "eingereicht", "angebot", "bo"), 409)
		self.assertEqual(k.uebergang("kaufoption", "angebot", "annehmen", "kunde"), "angenommen")
		self.assertEqual(fehler(k.uebergang, "kaufoption", "angebot", "zurueckziehen", "kunde"), 409)
		self.assertEqual(k.erlaubte_aktionen("kuendigung", "eingereicht", "kunde"), ["zurueckziehen"])
		self.assertEqual(k.erlaubte_aktionen("verlaengerung", "angebot", "bo"), ["angebot"])

	def test_einspruch_pruefen(self):
		gut = {"grund": "menge", "text": "Zählerstand Ende August laut Foto 650.100 kWh statt 650.000", "betragStrittigEur": "12,00"}
		self.assertEqual(k.anliegen_pruefen("einspruch", gut, beleg=BELEG, heute=HEUTE)["betragStrittigEur"], 12.0)
		self.assertEqual(fehler(k.anliegen_pruefen, "einspruch", {**gut, "text": "zu kurz"}, beleg=BELEG, heute=HEUTE), 422)
		self.assertEqual(fehler(k.anliegen_pruefen, "einspruch", {**gut, "betragStrittigEur": 5000}, beleg=BELEG, heute=HEUTE), 422)
		self.assertEqual(fehler(k.anliegen_pruefen, "einspruch", gut, beleg={**BELEG, "art": "pacht"}, heute=HEUTE), 422)
		self.assertEqual(fehler(k.anliegen_pruefen, "einspruch", gut, beleg={**BELEG, "status": "storniert"}, heute=HEUTE), 409)

	def test_kuendigung(self):
		self.assertEqual(k.monate_zurueck("2026-12-31", 3), "2026-09-30")
		self.assertEqual(k.monate_zurueck("2028-03-31", 1), "2028-02-29")
		ok = k.anliegen_pruefen("kuendigung", {"bestaetigt": True}, vertrag=VERTRAG, heute=HEUTE)
		self.assertEqual((ok["wirksamZum"], ok["stichtag"]), ("2040-06-01", "2039-12-01"))
		self.assertEqual(fehler(k.anliegen_pruefen, "kuendigung", {}, vertrag=VERTRAG, heute=HEUTE), 422)
		self.assertEqual(fehler(k.anliegen_pruefen, "kuendigung", {"bestaetigt": True}, vertrag={**VERTRAG, "ende": "2027-01-31"}, heute=HEUTE), 409)
		self.assertEqual(fehler(k.anliegen_pruefen, "kuendigung", {"bestaetigt": True}, vertrag={**VERTRAG, "status": "gekuendigt"}, heute=HEUTE), 409)

	def test_aktion_pruefen(self):
		a = {"betragStrittigEur": 100.0}
		self.assertEqual(fehler(k.aktion_pruefen, "einspruch", "ablehnen", {"begruendung": "kurz"}, anliegen=a, heute=HEUTE), 422)
		self.assertEqual(fehler(k.aktion_pruefen, "einspruch", "teilweise", {"begruendung": "Zählerstand teilweise korrigiert", "korrekturEur": 100}, anliegen=a, heute=HEUTE), 422)
		self.assertEqual(k.aktion_pruefen("einspruch", "stattgeben", {"begruendung": "Zählerstand korrigiert."}, anliegen=a, heute=HEUTE)["korrekturEur"], 100.0)
		ang = k.aktion_pruefen("kaufoption", "angebot", {"betragEur": 98000, "stichtag": "2040-06-01", "gueltigBis": "2026-11-30"}, anliegen={}, heute=HEUTE)["angebot"]
		self.assertEqual(ang["betragEur"], 98000)
		self.assertEqual(fehler(k.aktion_pruefen, "kaufoption", "angebot", {"betragEur": 98000, "stichtag": "2040-06-01", "gueltigBis": HEUTE}, anliegen={}, heute=HEUTE), 422)
		self.assertEqual(fehler(k.aktion_pruefen, "verlaengerung", "angebot", {"jahre": 5, "gueltigBis": "2026-12-01"}, anliegen={}, heute=HEUTE), 422)
		abgelaufen = {"angebot": {"gueltigBis": "2026-09-01"}}
		self.assertEqual(fehler(k.aktion_pruefen, "kaufoption", "annehmen", {"bestaetigt": True}, anliegen=abgelaufen, heute=HEUTE), 409)
		self.assertEqual(fehler(k.aktion_pruefen, "kaufoption", "annehmen", {}, anliegen={"angebot": {"gueltigBis": "2026-12-01"}}, heute=HEUTE), 422)


class TestWechselUndKosten(unittest.TestCase):
	def test_wechsel(self):
		s = k.wechsel_anlegen("2026-10-01T08:00:00.000Z", "2027-01", "2026-12-31", True)
		self.assertEqual([x["status"] for x in s][:4], ["erledigt", "offen", "offen", "offen"])
		self.assertEqual(next(x for x in s if x["id"] == "anmeldung_netz")["frist"], "2026-12-31")
		self.assertEqual(fehler(k.wechsel_schritt_erledigen, s, "vertrag_versorger", "kunde"), 403)
		self.assertEqual(fehler(k.wechsel_schritt_erledigen, s, "vertrag_kunde", "kunde"), 409)
		s = k.wechsel_schritt_erledigen(s, "vertrag_versorger", "lieferant", am="x")
		self.assertEqual(fehler(k.wechsel_schritt_erledigen, s, "vertrag_versorger", "bo"), 409)
		self.assertEqual(k.wechsel_stand(s, "2027-01-05")["ampel"], "rot")
		for sid, wer in (("vertrag_kunde", "kunde"), ("kuendigung_alt", "bo"), ("kuendigung_bestaetigt", "kunde"), ("anmeldung_netz", "lieferant"), ("lieferbeginn", "lieferant"), ("erste_rechnung", "kunde")):
			s = k.wechsel_schritt_erledigen(s, sid, wer, am="x")
		st = k.wechsel_stand(s, "2027-03-01")
		self.assertTrue(st["abgeschlossen"])
		self.assertEqual((st["prozent"], st["ampel"]), (100, "gruen"))
		ohne = k.wechsel_anlegen("2026-10-01", "2027-01")
		self.assertEqual(next(x for x in ohne if x["id"] == "kuendigung_alt")["status"], "entfaellt")
		self.assertEqual(fehler(k.wechsel_schritt_erledigen, ohne, "kuendigung_alt", "bo"), 409)

	def test_kostenreport(self):
		vt = [{"id": "a", "lieferant": "X", "beginn": "2024-01-01", "vertragEnde": "2026-12-31", "energiepreisCt": 13.2, "jahresKwh": 120000, "status": "aktiv"}]
		r = k.kostenreport(2026, vt, None, [{"monat": "2026-08", "kwh": 90000, "netto": 10950}])
		self.assertEqual(r["summe"]["netzEur"], 15840.0)
		self.assertEqual(r["summe"]["pvErsparnisEur"], 930.0)
		self.assertTrue(r["monate"][0]["netzGeschaetzt"])
		self.assertEqual(r["monate"][7]["pvCt"], 12.167)
		r2 = k.kostenreport(2026, vt, [10000] * 12, [])
		self.assertFalse(r2["monate"][0]["netzGeschaetzt"])
		self.assertEqual(r2["summe"]["mischpreisCt"], 13.2)
		r3 = k.kostenreport(2026, [{**vt[0], "energiepreisCt": None}], [10000] * 12, [])
		self.assertIsNone(r3["monate"][0]["netzEur"])
		self.assertTrue(any("Tranchen" in h for h in r3["hinweise"]))


if __name__ == "__main__":
	unittest.main()
