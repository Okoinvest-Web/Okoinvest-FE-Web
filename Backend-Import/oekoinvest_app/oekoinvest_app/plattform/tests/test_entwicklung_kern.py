# Copyright (c) 2026, ÖkoInvest GmbH
# Projektentwicklung – reine Regeln (ohne Frappe lauffähig):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_entwicklung_kern
# Vorlagen je Land/Typ, Vorwärtsrechnung, kritischer Pfad, Verzug, Kreise, Phase, Pipeline-Wert (wie entwicklung.js).

import unittest

from oekoinvest_app.plattform import entwicklung_kern as K


def plan(land="DE", typ="freiflaeche", start="2026-10-01"):
	schritte = K.vorlage(land, typ)
	ms = [{**s, "id": s["schluessel"], "status": "offen"} for s in schritte]
	return K.plan_berechnen(ms, start=start, heute=start, prognose=False)


class TestVorlagen(unittest.TestCase):
	def test_alle_kombinationen_konsistent(self):
		for land in ("DE", "AT", "CH"):
			for typ in K.ENTWICKLUNG_TYPEN:
				v = K.vorlage(land, typ)
				schl = [s["schluessel"] for s in v]
				self.assertEqual(len(schl), len(set(schl)), f"{land}/{typ}: doppelte Schlüssel")
				for s in v:
					for n in s["nach"]:
						self.assertIn(n, schl, f"{land}/{typ}: {s['schluessel']} hängt an fehlendem {n}")
				self.assertEqual(v[0]["schluessel"], "flaechensicherung")
				self.assertEqual(v[-1]["phase"], "cod")

	def test_laenderspezifisch(self):
		de = [s["titel"] for s in K.vorlage("DE", "freiflaeche")]
		self.assertTrue(any("§ 8 EEG" in t for t in de))
		self.assertTrue(any("Satzungsbeschluss" in t for t in de))
		at = [s["titel"] for s in K.vorlage("AT", "freiflaeche")]
		self.assertTrue(any("Grünland-Photovoltaik" in t for t in at) and any("EAG" in t for t in at) and any("UVP" in t for t in at))
		ch = [s["titel"] for s in K.vorlage("CH", "dach")]
		self.assertTrue(any("18a RPG" in t for t in ch))
		self.assertFalse(any("Richtplan" in t for t in ch))
		self.assertFalse(any("Aufstellungsbeschluss" in t for t in (s["titel"] for s in K.vorlage("DE", "dach"))))
		# Fachprüfung: vollständige Gutachtenliste DE-Freifläche, Agri-PV mit Nutzungskonzept, AT/CH analog
		schl = {s["schluessel"] for s in K.vorlage("DE", "freiflaeche")}
		for x in ("gutachten_boden", "gutachten_kampfmittel", "gutachten_archaeologie", "gutachten_schall", "gutachten_entwaesserung", "gutachten_ffh", "gutachten_landschaft", "netzvertraeglichkeit"):
			self.assertIn(x, schl)
		self.assertIn("nutzungskonzept_agri", {s["schluessel"] for s in K.vorlage("DE", "agri")})
		self.assertNotIn("nutzungskonzept_agri", schl)
		self.assertTrue({"gutachten_nvp", "gutachten_blendung", "gutachten_boden"} <= {s["schluessel"] for s in K.vorlage("AT", "freiflaeche")})
		self.assertTrue({"gutachten_blendung", "gutachten_boden", "gutachten_landschaft"} <= {s["schluessel"] for s in K.vorlage("CH", "freiflaeche")})


class TestPlan(unittest.TestCase):
	def test_vorwaerts(self):
		p = {m["id"]: m for m in plan()}
		self.assertEqual(p["flaechensicherung"]["sollStart"], "2026-10-01")
		self.assertEqual(p["flaechensicherung"]["sollEnde"], "2027-01-01")
		for m in p.values():
			for v in m["nach"]:
				self.assertGreaterEqual(m["sollStart"], p[v]["sollEnde"])

	def test_kritischer_pfad_und_ende(self):
		ms = plan()
		je, ende = K.kritischer_pfad(ms, heute="2026-10-01")
		self.assertTrue(je["inbetriebnahme"]["kritisch"])
		self.assertTrue(je["gutachten_artenschutz"]["kritisch"])
		self.assertFalse(je["gutachten_boden"]["kritisch"])
		self.assertGreater(je["gutachten_boden"]["puffer"], 0)
		self.assertEqual(ende, next(m for m in ms if m["id"] == "inbetriebnahme")["sollEnde"])

	def test_verzug_und_prognose(self):
		ms = plan(start="2025-01-01")
		heute = "2026-10-01"
		fs = next(m for m in ms if m["id"] == "flaechensicherung")
		self.assertTrue(K.ist_ueberfaellig(fs, heute))
		self.assertGreater(K.verzug_tage(fs, heute), 500)
		je, _ = K.kritischer_pfad(ms, heute=heute)
		self.assertGreaterEqual(je["flaechensicherung"]["prognoseEnde"], heute)  # überfällig → Prognose frühestens heute
		neu = K.plan_berechnen(ms, start="2025-01-01", heute=heute, prognose=True)
		self.assertGreaterEqual(next(m for m in neu if m["id"] == "netzanfrage")["sollStart"], heute)

	def test_abhaengigkeiten(self):
		ms = plan()
		netz = next(m for m in ms if m["id"] == "netzzusage")
		self.assertEqual([m["id"] for m in K.offene_vorgaenger(ms, netz)], ["netzvertraeglichkeit"])
		self.assertTrue(K.erzeugt_kreis(ms, "flaechensicherung", ["netzanfrage"]))
		self.assertFalse(K.erzeugt_kreis(ms, "netzzusage", ["flaechensicherung"]))


class TestPipeline(unittest.TestCase):
	def test_phase_aus_meilensteinen(self):
		ms = plan()
		self.assertIsNone(K.phase_aus_meilensteinen(ms))
		for m in ms:
			if m["id"] in ("flaechensicherung", "netzanfrage", "netzzusage"):
				m["status"] = "erledigt"
		self.assertEqual(K.phase_aus_meilensteinen(ms), "netz")

	def test_wert(self):
		w = K.pipeline_wert(12, "netz")
		self.assertEqual(w["preisProKwp"], 27.5)
		self.assertEqual(w["volumen"], 330000)
		self.assertEqual(w["wert"], 82500)
		self.assertEqual(K.pipeline_wert(10, None)["wert"], round(10 * 1000 * 12.5 * 0.05))
		self.assertEqual(K.pipeline_wert(10, "rtb", 0.5)["wert"], 10 * 1000 * 95 // 2)

	def test_sonstiges(self):
		self.assertEqual(K.risiko_score(4, 5), 20)
		self.assertEqual(K.risiko_ampel(20), "hoch")
		self.assertEqual(K.quartal("2027-08-15"), "Q3 2027")
		self.assertEqual(K.mwp_aus_flaeche(11), 10.0)
		self.assertEqual(K.plus_monate("2026-01-31", 1), "2026-03-03")  # wie JavaScript (Monatsüberlauf)
		self.assertEqual(K.plan_monate(K.vorlage("DE", "freiflaeche")), 40)


if __name__ == "__main__":
	unittest.main()
