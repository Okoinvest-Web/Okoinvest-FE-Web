# Copyright (c) 2026, ÖkoInvest GmbH
# Gutachteraufträge und Bank-Akte – reine Regeln ohne Frappe
# (python -m unittest oekoinvest_app.plattform.tests.test_gutachter_bank_kern). Gleiche Fälle wie der Logikteil von
# scripts/plattform-test-gutachter-bank.mjs (JS-Kern src/lib/plattform/gutachter/kern.js bzw. finanzierung/bankakte.js).

import unittest

from oekoinvest_app.plattform import bankakte_kern as B
from oekoinvest_app.plattform import gutachter_kern as G

HEUTE = "2026-10-01"


def angebot(**x):
	return G.angebot_bereinigen({"honorarArt": "pauschal", "honorarNetto": 10000, "nebenkostenPct": 5, "ustPct": 19, "liefertermin": "2026-12-01", "abschlagPct": 30, "zahlungszielTage": 30, **x}, HEUTE, "DE")


class TestGutachterKern(unittest.TestCase):
	def test_zustandsautomat(self):
		self.assertEqual(G.uebergang("angebot_abgeben", "angefragt", "gutachter"), "angebot")
		self.assertEqual(G.uebergang("beauftragen", "angebot", "bo"), "beauftragt")
		self.assertEqual(G.uebergang("auftrag_bestaetigen", "beauftragt", "gutachter"), "in_arbeit")
		self.assertEqual(G.uebergang("maengel", "in_pruefung", "bo"), "nachbesserung")
		self.assertEqual(G.uebergang("abnehmen", "abnahmebereit", "bo"), "abgenommen")
		with self.assertRaises(G.GutachterFehler) as e:
			G.uebergang("beauftragen", "angebot", "gutachter")
		self.assertEqual(e.exception.status, 403)
		with self.assertRaises(G.GutachterFehler) as e:
			G.uebergang("abnehmen", "in_arbeit", "bo")
		self.assertEqual(e.exception.status, 409)
		with self.assertRaises(G.GutachterFehler):
			G.uebergang("stornieren", "abgenommen", "bo")

	def test_angebot_summen(self):
		a = angebot()
		self.assertEqual((a["honorar"], a["nebenkosten"], a["summeNetto"], a["summeUst"], a["summeBrutto"]), (10000, 500, 10500, 1995, 12495))
		s = angebot(honorarArt="stunden", stundensatz=95, stunden=120.5, nebenkostenPct=0, ustPct=20)
		self.assertEqual(s["summeNetto"], 11447.5)
		self.assertEqual(s["summeBrutto"], 13737.0)
		with self.assertRaises(G.GutachterFehler):
			angebot(honorarNetto=0)
		with self.assertRaises(G.GutachterFehler):
			angebot(liefertermin="2026-09-01")
		with self.assertRaises(G.GutachterFehler):
			angebot(ustPct=0)
		self.assertEqual(angebot(ustPct=0, ustHinweis="Reverse Charge")["summeUst"], 0)
		self.assertEqual(angebot(ustPct=33)["ustPct"], 19)  # unzulässiger Satz → Landesstandard

	def test_rechnungen(self):
		a = {"status": "in_arbeit", "angebot": angebot(), "rechnungen": []}
		r = G.rechnung_bereinigen({"art": "abschlag", "nummer": "R-1", "datum": "2026-09-30", "leistungVon": "2026-09-01", "leistungBis": "2026-09-30", "netto": 3150}, a, HEUTE)
		self.assertEqual((r["ust"], r["brutto"], r["faelligAm"]), (598.5, 3748.5, "2026-10-30"))
		a["rechnungen"].append({**r, "status": "eingereicht"})
		with self.assertRaises(G.GutachterFehler):  # Abschlag über 30 %
			G.rechnung_bereinigen({"art": "abschlag", "nummer": "R-2", "datum": "2026-09-30", "leistungVon": "2026-09-01", "leistungBis": "2026-09-30", "netto": 1}, a, HEUTE)
		with self.assertRaises(G.GutachterFehler) as e:  # Schlussrechnung vor Abnahme
			G.rechnung_bereinigen({"art": "schluss", "nummer": "R-3", "datum": "2026-09-30", "leistungVon": "2026-09-01", "leistungBis": "2026-09-30", "netto": 100}, a, HEUTE)
		self.assertEqual(e.exception.status, 409)
		a["status"] = "abgenommen"
		with self.assertRaises(G.GutachterFehler):  # Summe über Auftragssumme
			G.rechnung_bereinigen({"art": "schluss", "nummer": "R-3", "datum": "2026-09-30", "leistungVon": "2026-09-01", "leistungBis": "2026-09-30", "netto": 7351}, a, HEUTE)
		with self.assertRaises(G.GutachterFehler):  # doppelte Nummer
			G.rechnung_bereinigen({"art": "schluss", "nummer": "R-1", "datum": "2026-09-30", "leistungVon": "2026-09-01", "leistungBis": "2026-09-30", "netto": 100}, a, HEUTE)
		s = G.rechnung_bereinigen({"art": "schluss", "nummer": "R-3", "datum": "2026-09-30", "leistungVon": "2026-09-01", "leistungBis": "2026-09-30", "netto": 7350}, a, HEUTE)
		a["rechnungen"].append({**s, "status": "eingereicht"})
		st = G.rechnungs_stand(a, "2026-11-15")
		self.assertEqual((st["berechnetNetto"], st["restNetto"], st["ueberfaellig"], st["schlussVorhanden"]), (10500, 0, 2, True))

	def test_iban_und_bewertung(self):
		self.assertTrue(G.iban_pruefen("DE89 3704 0044 0532 0130 00"))
		self.assertTrue(G.iban_pruefen("AT611904300234573201"))
		self.assertFalse(G.iban_pruefen("DE89370400440532013001"))
		b = G.bewertung_bereinigen({"qualitaet": 5, "termintreue": 4, "kommunikation": 5, "preisLeistung": 3})
		self.assertEqual(b["schnitt"], 4.3)
		self.assertEqual(G.bewertung_schnitt([b, {"schnitt": 3.7}]), {"schnitt": 4.0, "anzahl": 2})
		with self.assertRaises(G.GutachterFehler):
			G.bewertung_bereinigen({"qualitaet": 6, "termintreue": 4, "kommunikation": 5, "preisLeistung": 3})

	def test_vergleich_fristen_bericht(self):
		z = G.angebot_vergleich([
			{"id": "A", "gutachter": "A", "angebot": {"summeNetto": 10000, "liefertermin": "2026-12-01"}, "bewertung": 3},
			{"id": "B", "gutachter": "B", "angebot": {"summeNetto": 12000, "liefertermin": "2026-12-01"}, "bewertung": 5},
			{"id": "C", "gutachter": "C", "angebot": {"summeNetto": 9000, "liefertermin": "2027-03-31"}, "bewertung": None},
		])
		self.assertEqual([x["id"] for x in z], ["B", "A", "C"])  # 50 % Preis, 25 % Termin, 25 % Bewertung
		self.assertTrue(next(x for x in z if x["id"] == "C")["guenstigstes"])
		f = G.auftrag_fristen({"status": "in_arbeit", "beauftragung": {"liefertermin": "2026-09-28"}, "termine": [{"id": "T", "art": "begehung", "datum": "2026-10-03", "status": "bestaetigt"}], "rechnungen": []}, HEUTE)
		self.assertEqual([(x["art"], x["ueberfaellig"]) for x in f], [("liefertermin", True), ("termin", False)])
		with self.assertRaises(G.GutachterFehler):
			G.bericht_bereinigen({"text": "Kartierung läuft planmäßig", "fortschritt": 40}, 60)
		self.assertEqual(G.naechste_version([{"version": 1}, {"version": 2}]), 3)
		with self.assertRaises(G.GutachterFehler):
			G.anfrage_bereinigen({"titel": "Blendgutachten", "fachgebiet": "blendung", "leistung": "zu kurz", "angebotsfrist": "2026-10-15"}, HEUTE, ["blendung"])


class TestBankakteKern(unittest.TestCase):
	def test_teamrollen(self):
		mg = [{"bankId": "FB-1", "nutzerId": "U-2", "rolle": "lesen", "status": "aktiv"}, {"bankId": "FB-1", "nutzerId": "U-3", "rolle": "sachbearbeiter", "status": "entfernt"}]
		self.assertEqual(B.rolle_aus(mg, "FB-1", ["U-1", "U-2"], "U-1"), "leitung")  # Erstkontakt ohne Eintrag
		self.assertEqual(B.rolle_aus(mg, "FB-1", ["U-1", "U-2"], "U-2"), "lesen")
		self.assertIsNone(B.rolle_aus(mg, "FB-1", ["U-1", "U-2", "U-3"], "U-3"))
		self.assertIsNone(B.rolle_aus(mg, "FB-1", ["U-1"], "U-9"))
		self.assertTrue(B.rolle_reicht("leitung", B.BANK_AKTION_ROLLE["kreditentscheidung"]))
		self.assertFalse(B.rolle_reicht("sachbearbeiter", B.BANK_AKTION_ROLLE["kreditentscheidung"]))
		self.assertFalse(B.rolle_reicht("lesen", B.BANK_AKTION_ROLLE["termsheet"]))

	def test_kreditentscheidung(self):
		with self.assertRaises(B.BankakteFehler) as e:
			B.kreditentscheidung_bereinigen({"ergebnis": "genehmigt"}, "termsheet")
		self.assertEqual(e.exception.status, 409)
		k = B.kreditentscheidung_bereinigen({"ergebnis": "genehmigt_auflagen", "beschlussAm": "2026-09-30", "betrag": 10_500_000, "gueltigBis": "2026-12-31", "auflagen": "Zweites Ertragsgutachten\nRangrücktritt"}, "ausgewaehlt", 10_000_000, HEUTE)
		self.assertEqual(len(k["auflagen"]), 2)
		with self.assertRaises(B.BankakteFehler):  # > 10 % über Term Sheet
			B.kreditentscheidung_bereinigen({"ergebnis": "genehmigt", "beschlussAm": "2026-09-30", "betrag": 11_100_000, "gueltigBis": "2026-12-31"}, "ausgewaehlt", 10_000_000, HEUTE)
		with self.assertRaises(B.BankakteFehler):
			B.kreditentscheidung_bereinigen({"ergebnis": "abgelehnt", "beschlussAm": "2026-09-30", "begruendung": "kurz"}, "ausgewaehlt")

	def test_auszahlung(self):
		kv = {"betrag": 1_000_000}
		cps = [{"id": "a", "label": "Kreditvertrag", "erledigt": True}, {"id": "b", "label": "EK", "erledigt": True}]
		with self.assertRaises(B.BankakteFehler) as e:
			B.auszahlung_bereinigen({"betrag": 100_000, "wunschDatum": "2026-10-05", "zweck": "EPC-Rate 1"}, kv, cps, {"a": {"status": "bestaetigt"}}, [], HEUTE)
		self.assertEqual(e.exception.status, 409)
		ok = {"a": {"status": "bestaetigt"}, "b": {"status": "bestaetigt"}}
		self.assertEqual(B.auszahlung_bereinigen({"betrag": 400_000, "wunschDatum": "2026-10-05", "zweck": "EPC-Rate 1"}, kv, cps, ok, [{"betrag": 600_000, "status": "ausgezahlt"}], HEUTE)["betrag"], 400_000)
		with self.assertRaises(B.BankakteFehler):
			B.auszahlung_bereinigen({"betrag": 400_001, "wunschDatum": "2026-10-05", "zweck": "EPC-Rate 1"}, kv, cps, ok, [{"betrag": 600_000, "status": "ausgezahlt"}], HEUTE)

	def test_anforderungen_und_stand(self):
		liste = B.anforderungen_bereinigen({"punkte": [{"titel": "Bodengutachten", "frist": "2026-10-10", "baustein": "epc"}, {"titel": "Mietvertrag UW", "frist": "2026-10-12", "baustein": "unbekannt"}]}, HEUTE, ["epc"])
		self.assertEqual([x["baustein"] for x in liste], ["epc", ""])
		with self.assertRaises(B.BankakteFehler):
			B.anforderungen_bereinigen({"punkte": [{"titel": "Bodengutachten", "frist": "2026-09-10"}]}, HEUTE)
		st = B.akte_stand({"anforderungen": [{"status": "offen", "frist": "2026-09-01"}, {"status": "geliefert"}], "qa": [{"status": "offen"}], "berichte": [{"status": "angefordert", "faelligAm": "2026-09-30"}]}, HEUTE)
		self.assertEqual((st["anforderungenOffen"], st["anforderungenUeberfaellig"], st["anforderungenZuPruefen"], st["fragenOffen"], st["berichteUeberfaellig"]), (1, 1, 1, 1, 1))
		with self.assertRaises(B.BankakteFehler):
			B.bericht_bereinigen({"art": "covenant", "periode": "Q3/2026", "faelligAm": "2026-09-01"}, HEUTE, True)


if __name__ == "__main__":
	unittest.main()
