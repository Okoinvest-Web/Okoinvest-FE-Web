# Copyright (c) 2026, ÖkoInvest GmbH
# Projektentwicklung – Steuerung, reine Regeln (ohne Frappe lauffähig):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_entwicklung_steuerung_kern
# Spiegel der Logikprüfungen in scripts/plattform-test-entwicklung.mjs (--nur-logik): Ampel, Kapazität, Pipeline, Ziel,
# Risikokosten, Optionsfristen, Sicherungsgrad, Vorlagen (Zustandsautomat, Vier-Augen-Prinzip, Folgen).

import unittest

from oekoinvest_app.plattform import entwicklung_steuerung_kern as S

BASIS = {"meilensteine": {"ueberfaellig": 0, "kritischUeberfaellig": 0}, "codVerzugMonate": 0, "budgetPlan": 100000, "budgetIst": 50000, "risikoMax": 6, "flaecheHa": 10, "flaecheGesichertHa": 10, "phase": "flaeche"}
HEUTE = "2026-10-01"
MS = [
	{"id": "m1", "projektId": "p1", "status": "offen", "sollStart": "2026-09-01", "sollEnde": "2026-10-20", "dokumentPflicht": ["Netzzusage"], "nachweisVerzicht": ""},
	{"id": "m2", "projektId": "p1", "status": "offen", "sollStart": "2026-10-01", "sollEnde": "2026-12-31", "dokumentPflicht": ["Gutachten"], "gutachten": True},
	{"id": "m3", "projektId": "p1", "status": "offen", "sollStart": "2026-06-01", "sollEnde": "2026-08-31", "dokumentPflicht": []},
	{"id": "m4", "projektId": "p1", "status": "erledigt", "sollStart": "2026-01-01", "sollEnde": "2026-02-01", "dokumentPflicht": ["X"]},
	{"id": "m5", "projektId": "p1", "status": "offen", "sollStart": "2026-09-01", "sollEnde": "2026-10-10", "dokumentPflicht": ["Y"], "nachweisVerzicht": "Liegt im Original in der Akte vor."},
]


def ampel(**x):
	return S.projekt_ampel({**BASIS, **x})


class TestAmpel(unittest.TestCase):
	def test_dimensionen(self):
		a = ampel()
		self.assertEqual(a["gesamt"]["farbe"], "gruen")
		a = ampel(meilensteine={"ueberfaellig": 2, "kritischUeberfaellig": 1})
		self.assertEqual((a["termin"]["farbe"], a["gesamt"]["farbe"]), ("rot", "rot"))
		self.assertIn("Termine", a["gesamt"]["grund"])
		self.assertEqual(ampel(meilensteine={"ueberfaellig": 1, "kritischUeberfaellig": 0})["termin"]["farbe"], "gelb")
		self.assertEqual(ampel(codVerzugMonate=6)["termin"]["farbe"], "rot")
		self.assertEqual(ampel(budgetIst=115000)["kosten"]["farbe"], "rot")
		self.assertEqual(ampel(budgetIst=95000)["kosten"]["farbe"], "gelb")
		self.assertEqual(ampel(budgetPlan=0, budgetIst=0)["kosten"]["farbe"], "grau")
		self.assertEqual(ampel(budgetPlan=0, budgetIst=10)["kosten"]["farbe"], "rot")
		self.assertEqual(ampel(risikoMax=15)["risiko"]["farbe"], "rot")
		self.assertEqual(ampel(risikoMax=8)["risiko"]["farbe"], "gelb")
		self.assertEqual(ampel(pruefungUeberfaellig=1)["risiko"]["farbe"], "gelb")
		self.assertEqual(ampel(flaecheHa=0)["flaeche"]["farbe"], "rot")
		self.assertEqual(ampel(flaecheGesichertHa=5, phase=None)["flaeche"]["farbe"], "gelb")
		self.assertEqual(ampel(flaecheGesichertHa=5, phase="netz")["flaeche"]["farbe"], "rot")
		self.assertEqual(ampel(flaecheGesichertHa=4.5, phase=None)["flaeche"]["grund"], "4,5 von 10 ha gesichert")
		self.assertEqual(ampel(optionsfristen=1)["flaeche"]["farbe"], "gelb")
		self.assertEqual(ampel(dokumentLuecken=2)["dokumente"]["farbe"], "gelb")
		self.assertEqual(ampel(budgetPlan=0, budgetIst=0)["gesamt"]["farbe"], "gruen")
		self.assertEqual(S.ampel_verteilung([ampel(risikoMax=20), ampel()]), {"gruen": 1, "gelb": 0, "rot": 1, "grau": 0})
		self.assertEqual(ampel(meilensteine=[{"ueberfaellig": True, "kritisch": True}, {"ueberfaellig": False}])["termin"]["farbe"], "rot")
		self.assertEqual(ampel(meilensteine=[{"ueberfaellig": True, "kritisch": False}])["termin"]["farbe"], "gelb")

	def test_dokumente_und_aufgaben(self):
		self.assertEqual([m["id"] for m in S.dokument_luecken(MS, [], HEUTE)], ["m1"])
		self.assertEqual(S.dokument_luecken(MS, [{"meilensteinId": "m1", "pflicht": "Netzzusage"}], HEUTE), [])
		f = S.aufgaben_faellig([*MS, {"id": "m6", "status": "offen", "sollEnde": "2026-10-05", "aufgabeId": "AF-1"}], HEUTE)
		self.assertEqual(sorted(m["id"] for m in f), ["m3", "m5"])


class TestKapazitaetPipeline(unittest.TestCase):
	def test_kapazitaet(self):
		kp = S.kapazitaetsplan(
			[{"id": "u1", "name": "PL"}, {"id": "u2", "name": "PL2", "stundenMonat": 16}],
			[{"id": "p1", "projektleiterId": "u1", "status": "aktiv"}, {"id": "p2", "projektleiterId": "u2", "status": "aktiv"}, {"id": "p3", "projektleiterId": "u2", "status": "abgebrochen"}],
			[*MS, {"id": "x", "projektId": "p2", "status": "offen", "sollStart": "2026-10-01", "sollEnde": "2026-11-15"}, {"id": "y", "projektId": "p3", "status": "offen", "sollStart": "2026-10-01", "sollEnde": "2026-11-15"}],
			HEUTE, monate=3,
		)
		self.assertEqual(kp["monate"], ["2026-10", "2026-11", "2026-12"])
		u1 = next(z for z in kp["zeilen"] if z["id"] == "u1")
		u2 = next(z for z in kp["zeilen"] if z["id"] == "u2")
		self.assertEqual([j["stunden"] for j in u1["je"]], [29, 11, 11])
		self.assertEqual((u2["stundenMonat"], u2["je"][0]["stunden"], u2["je"][0]["farbe"], u2["projekte"]), (16, 14, "gelb", 1))
		self.assertEqual(S.projektleiter_vorschlag(kp)["id"], "u1")
		self.assertEqual((S.auslastung_farbe(1.01), S.auslastung_farbe(0.85), S.auslastung_farbe(0.5)), ("rot", "gelb", "gruen"))

	def test_matrix_und_ziel(self):
		pm = S.pipeline_matrix([
			{"land": "DE", "phase": None, "mwp": 10, "status": "aktiv", "pipeline": {"gewichtetMwp": 0.5, "wert": 100}},
			{"land": "AT", "phase": "netz", "mwp": 5, "status": "pausiert", "pipeline": {"gewichtetMwp": 1.25, "wert": 200}},
			{"land": "DE", "phase": "netz", "mwp": 7, "status": "aktiv", "pipeline": {"gewichtetMwp": 1.75, "wert": 300}},
			{"land": "CH", "phase": "rtb", "mwp": 3, "status": "boerse", "pipeline": {"gewichtetMwp": 2.55, "wert": 900}},
		])
		netz = next(z for z in pm["zeilen"] if z["phase"] == "netz")
		self.assertEqual((pm["gesamt"]["anzahl"], pm["gesamt"]["mwp"], netz["zellen"]["DE"]["mwp"], netz["summe"]["mwpGewichtet"], pm["spalten"]["CH"]["anzahl"]), (3, 22, 7, 3, 0))
		za = S.ziel_abgleich([{"jahr": 2027, "mwp": 60, "mwpGewichtet": 40, "anzahl": 3}, {"jahr": 2028, "mwp": 80, "mwpGewichtet": 55, "anzahl": 4}], ziel=50, ab_jahr=2026, jahre=3)
		self.assertEqual([(z["luecke"], z["farbe"]) for z in za], [(50, "rot"), (10, "gelb"), (0, "gruen")])
		self.assertEqual(za[1]["deckung"], 0.8)


class TestRisikoFlaeche(unittest.TestCase):
	def test_risiko(self):
		self.assertEqual(S.risiko_bewertung({"eintritt": 4, "auswirkung": 5, "kostenEur": 200000, "restEintritt": 2}), {"score": 20, "restScore": 10, "erwartet": 120000, "erwartetRest": 30000})

	def test_flaeche(self):
		fl = [{"id": "f1", "ha": 6, "pachtStatus": "option", "optionBis": "2026-10-21", "grundbuch": "vorgemerkt"}, {"id": "f2", "ha": 4, "pachtStatus": "verhandlung"}, {"id": "f3", "ha": 2, "pachtStatus": "option", "optionBis": "2027-06-01"}]
		of = S.optionsfristen(fl, HEUTE)
		self.assertEqual([(f["id"], f["inTagen"]) for f in of], [("f1", 20)])
		self.assertEqual(S.sicherungsgrad(fl), {"ha": 12, "vertragHa": 8, "grundbuchHa": 6, "vertragQuote": 0.67, "grundbuchQuote": 0.5})
		self.assertIn("§ 883 BGB", S.GRUNDBUCH_HINWEIS["DE"])
		self.assertIn("Rangordnung", S.GRUNDBUCH_HINWEIS["AT"])
		self.assertIn("Art. 959 ZGB", S.GRUNDBUCH_HINWEIS["CH"])


class TestVorlagen(unittest.TestCase):
	def test_zustandsautomat(self):
		entwurf = {"art": "gate_entwicklung", "status": "entwurf", "titel": "Gate 1 Test", "beschlussvorschlag": "", "sachverhalt": "", "budgetEur": 0}
		u = S.vorlage_uebergang(entwurf, "einreichen", schreiben=True, nutzer_id="u1")
		self.assertEqual(u["status"], 422)
		self.assertIn("Beschlussvorschlag", u["fehler"])
		voll = {**entwurf, "beschlussvorschlag": "Die Geschäftsführung gibt das Entwicklungsbudget frei.", "sachverhalt": "Pachtvertrag unterschrieben, Netzanfrage vorbereitet.", "budgetEur": 40000}
		self.assertEqual(S.vorlage_uebergang(voll, "einreichen", schreiben=True)["nach"], "eingereicht")
		self.assertEqual(S.vorlage_uebergang(voll, "einreichen", schreiben=False)["status"], 403)
		ein = {**voll, "status": "eingereicht", "eingereichtVon": "u1"}
		self.assertEqual(S.vorlage_uebergang(ein, "genehmigen", leitung=False, schreiben=True, nutzer_id="u2")["status"], 403)
		self.assertEqual(S.vorlage_uebergang(ein, "genehmigen", leitung=True, nutzer_id="u1")["status"], 409)
		self.assertEqual(S.vorlage_uebergang(ein, "ablehnen", leitung=True, nutzer_id="u9", begruendung="zu kurz")["status"], 422)
		self.assertEqual(S.vorlage_uebergang(ein, "zurueckstellen", leitung=True, nutzer_id="u9", begruendung="Bitte Netzauskunft nachreichen.")["nach"], "zurueckgestellt")
		self.assertEqual(S.vorlage_uebergang(voll, "genehmigen", leitung=True, nutzer_id="u9")["status"], 409)
		self.assertEqual(S.vorlage_uebergang({**ein, "status": "genehmigt"}, "zurueckziehen", schreiben=True)["status"], 409)
		self.assertTrue(S.vorlage_uebergang({**voll, "status": "zurueckgestellt"}, "einreichen", schreiben=True)["ok"])
		vw = {**ein, "art": "verwertung", "budgetEur": 0, "empfehlung": ""}
		self.assertTrue(any("Verwertung" in f for f in S.vorlage_pruefen(vw)))
		self.assertEqual(S.vorlage_uebergang(vw, "genehmigen", leitung=True, nutzer_id="u9")["status"], 422)
		self.assertTrue(S.vorlage_uebergang(vw, "genehmigen", leitung=True, nutzer_id="u9", option="bau_investor")["ok"])

	def test_folgen(self):
		fo = S.vorlage_folgen({"art": "gate_entwicklung", "budgetEur": 40000})
		self.assertEqual((fo["budgetEur"], len(fo["aufgaben"]), fo["entscheidungArt"]), (40000, 1, "go"))
		fo = S.vorlage_folgen({"art": "gate_rtb", "empfehlung": "verkauf"}, option="eigenbetrieb")
		self.assertEqual((fo["verwertung"], fo["entscheidungArt"]), ("eigenbetrieb", "strategie"))
		self.assertIn("Finanzierungsfall", fo["aufgaben"][0]["text"])
		fo = S.vorlage_folgen({"art": "abbruch"})
		self.assertEqual((fo["status"], fo["entscheidungArt"]), ("abgebrochen", "nogo"))
		self.assertIn("/portal/admin/gesellschaften", S.vorlage_folgen({"art": "spv"})["aufgaben"][0]["text"])


if __name__ == "__main__":
	unittest.main()
