# Regeln Deutschland/Schweiz der Scoring-Engine (Ausbaustufe A1b) – ohne GIS-Bibliotheken:
#   cd Backend-Import/dienste/geodaten && python -m unittest discover -s tests -v
# Die gemeinsamen JS↔Python-Fälle (auch DE/CH) prüft test_scoring.py über tests/faelle.json.

import unittest

from geodaten import scoring as s
from geodaten.netz import netzkosten


class DeutschlandSchweiz(unittest.TestCase):
	BASIS = {"ha": 12, "kompaktheit": 0.95, "neigungGrad": 2, "exposition": "S", "nutzung": {"acker": 12}, "schutz": [], "siedlungAbstandM": 500}

	def netz(self, km=1, kap="unbekannt"):
		return {"knoten": {"art": "trafo", "kapazitaet": kap}, "luftlinieM": km * 800, "trasseM": km * 1000, "kosten": netzkosten(10.9, km, "msLeitung", kap)}

	def de(self, kulisse=None, privilegiert=0, bundesland="Bayern", **extra):
		w = s.widmungslage(bundesland, land="DE", privilegiert_anteil=privilegiert)
		return s.bewerte({**self.BASIS, "land": "DE", "bundesland": bundesland, "kulisse": kulisse or {}, "widmung": w, "netz": self.netz(), **extra})

	def test_gewichte_summe_100(self):
		for land, g in s.GEWICHTE_LAND.items():
			self.assertEqual(sum(g.values()), 100, land)

	def test_oesterreich_unveraendert(self):
		m = {**self.BASIS, "bundesland": "Oberösterreich", "widmung": {"status": "zone"}, "netz": self.netz()}
		self.assertEqual(s.bewerte(m), s.bewerte({**m, "land": "AT"}))
		self.assertNotIn("kulisse", [k["id"] for k in s.bewerte({**m, "land": "AT"})["kriterien"]])

	def test_kulisse_reihenfolge(self):
		rand = self.de({"randstreifenAnteil": 1})["score"]
		ben = self.de({"benachteiligtAnteil": 1})["score"]
		moor = self.de({"moorAnteil": 1})["score"]
		ohne = self.de({})["score"]
		self.assertGreater(rand, ben)
		self.assertGreater(ben, moor)
		self.assertGreater(moor, ohne)
		self.assertGreaterEqual(rand - ohne, 12, "Kulisse ist ein großer Pluspunkt")

	def test_kulisse_maximum_zaehlt_einmal(self):
		a = self.de({"randstreifenAnteil": 1})
		b = self.de({"randstreifenAnteil": 1, "benachteiligtAnteil": 1, "moorAnteil": 1})
		self.assertEqual(a["score"], b["score"])
		punkte = {k["id"]: k["punkte"] for k in b["kriterien"]}
		self.assertEqual(punkte["kulisse"], 14)

	def test_ohne_kulisse_minus(self):
		k = {x["id"]: x for x in self.de({})["kriterien"]}
		self.assertEqual(k["kulisse"]["punkte"], 0)
		self.assertEqual(k["kulisse"]["art"], "minus")

	def test_privilegierung_baugb(self):
		self.assertEqual(s.widmungslage("Bayern", land="DE", privilegiert_anteil=0.8)["status"], "zone")
		self.assertEqual(s.widmungslage("Bayern", land="DE", privilegiert_anteil=0.2)["status"], "angrenzend")
		self.assertEqual(s.widmungslage("Bayern", land="DE", privilegiert_anteil=0)["status"], "unklar")
		# Bundesland ohne eigene Regel → allgemeine BauGB-Regel
		self.assertEqual(s.widmungslage("Niedersachsen", land="DE", privilegiert_anteil=1)["status"], "zone")
		self.assertIn("§ 35 Abs. 1 Nr. 8 lit. b BauGB", s.widmungslage("Sachsen", land="DE", privilegiert_anteil=1)["text"])
		mit = self.de({"randstreifenAnteil": 1}, privilegiert=1)["score"]
		ohne = self.de({"randstreifenAnteil": 1}, privilegiert=0)["score"]
		self.assertGreater(mit, ohne)

	def test_de_idealflaeche_100(self):
		r = self.de({"randstreifenAnteil": 1}, privilegiert=1, bundesland="Bayern", netz={**self.netz(), "knoten": {"art": "trafo", "kapazitaet": "frei"}})
		self.assertEqual(r["score"], 100)
		self.assertEqual(r["ampel"], "gruen")

	def test_de_ertrag_bundesland(self):
		self.assertEqual(self.de({})["ertragKwhProKwp"], 1130)
		self.assertEqual(self.de({}, bundesland="Niedersachsen")["ertragKwhProKwp"], 980)
		self.assertEqual(s.bewerte({**self.BASIS, "land": "DE", "bundesland": "Unbekannt"})["ertragKwhProKwp"], s.ERTRAG["_DE"])

	def test_de_ko_bleiben(self):
		r = self.de({"randstreifenAnteil": 1}, privilegiert=1, schutz=[{"art": "natura2000", "anteil": 0.5, "abstandM": 0}])
		self.assertLessEqual(r["score"], 15)
		r = self.de({"randstreifenAnteil": 1}, privilegiert=1, ha=1.2)
		self.assertLessEqual(r["score"], 25)

	def test_schweiz_eignung_und_fff(self):
		def ch(kulisse, eignung=0):
			return s.bewerte({**self.BASIS, "land": "CH", "bundesland": "Bern", "kulisse": kulisse, "widmung": s.widmungslage("Bern", land="CH", eignung_anteil=eignung), "netz": self.netz()})

		eignung = ch({"eignungAnteil": 1}, 1)["score"]
		vorbelastet = ch({"vorbelastet": True})["score"]
		ohne = ch({})["score"]
		self.assertGreater(eignung, vorbelastet)
		self.assertGreater(vorbelastet, ohne)
		mit_fff = ch({"eignungAnteil": 1, "fffAnteil": 1}, 1)
		self.assertEqual(eignung - mit_fff["score"], 8)
		self.assertIn("fff", [k["id"] for k in mit_fff["kriterien"]])
		self.assertEqual(s.widmungslage("Bern", land="CH")["status"], "unklar")
		self.assertEqual(s.widmungslage("Bern", land="CH", eignung_anteil=0.6)["status"], "zone")


if __name__ == "__main__":
	unittest.main()
