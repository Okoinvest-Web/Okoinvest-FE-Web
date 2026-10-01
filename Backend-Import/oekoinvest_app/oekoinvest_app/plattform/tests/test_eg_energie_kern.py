# Copyright (c) 2026, ÖkoInvest GmbH
# WP3 Energiedaten – reine Logik ohne Frappe, Gleichheit mit dem JS-Kern über die gemeinsamen Testvektoren
#   src/lib/plattform/eg/testdaten/energie/vektoren.json (erzeugt mit node scripts/eg-energie-testdaten.mjs):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_eg_energie_kern

import json
import math
import os
import unittest

from oekoinvest_app.plattform import eg_energie_kern as k
from oekoinvest_app.plattform.mitglied_kern import MitgliedFehler

HIER = os.path.dirname(os.path.abspath(__file__))
VEKTOREN = os.path.normpath(os.path.join(HIER, "..", "..", "..", "..", "..", "src", "lib", "plattform", "eg", "testdaten", "energie", "vektoren.json"))


def laden():
	with open(VEKTOREN, encoding="utf-8") as f:
		return json.load(f)


V = laden() if os.path.exists(VEKTOREN) else None


def gleich(a, b, pfad="", rel=1e-9, abs_=1e-9):
	"""Tiefer Vergleich; Zahlen mit Toleranz (Gleitkomma der Winkelfunktionen kann im letzten Bit abweichen)."""
	if isinstance(a, bool) or isinstance(b, bool):
		assert a == b, f"{pfad}: {a!r} != {b!r}"
		return
	if isinstance(a, (int, float)) and isinstance(b, (int, float)):
		assert math.isclose(a, b, rel_tol=rel, abs_tol=abs_), f"{pfad}: {a!r} != {b!r}"
		return
	if isinstance(a, dict) and isinstance(b, dict):
		ka = {x for x, y in a.items() if y is not None}
		kb = {x for x, y in b.items() if y is not None}
		assert ka == kb, f"{pfad}: Schlüssel {sorted(ka ^ kb)}"
		for x in ka:
			gleich(a[x], b[x], f"{pfad}.{x}", rel, abs_)
		return
	if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)):
		assert len(a) == len(b), f"{pfad}: Länge {len(a)} != {len(b)}"
		for i, (x, y) in enumerate(zip(a, b)):
			gleich(x, y, f"{pfad}[{i}]", rel, abs_)
		return
	assert a == b, f"{pfad}: {a!r} != {b!r}"


def fehler_von(fn, *a, **kw):
	try:
		fn(*a, **kw)
	except MitgliedFehler as e:
		return {"status": e.status, "feld": e.feld or ""}
	return None


def kurz(r):
	return {"verbraucher": [{"id": v["id"], "verbrauchTf": v["verbrauchTf"], "anteil": v["anteil"], "eigendeckung": v["eigendeckung"]} for v in r["verbraucher"]], "erzeuger": r["erzeuger"], "summe": r["summe"], "normierung": r["normierung"]}


def ohne_k(b):
	return {x: b[x] for x in ("tag", "groesse", "werte", "qualitaet", "summeKwh", "ist", "fehlend", "l3", "l2", "vollstaendig", "abrechenbar", "version", "beginnUtc")}


def verteilen(e):
	return k.verteilen(e.get("modell", "dynamisch"), e.get("erzeuger"), e.get("verbraucher"))


@unittest.skipIf(V is None, "Testvektoren fehlen (node scripts/eg-energie-testdaten.mjs)")
class TestZeit(unittest.TestCase):
	def test_tage(self):
		for t in V["zeit"]["tage"]:
			self.assertEqual(k.werte_je_tag(t["tag"]), t["werte"], t["tag"])
			self.assertEqual(k.tag_beginn_utc(t["tag"]), t["beginnUtc"])
			self.assertEqual(k.wochentag(t["tag"]), t["wochentag"])
			self.assertEqual(k.plus_tag(t["tag"]), t["plus1"])
			self.assertEqual(k.viertelstunde_lokal(t["tag"], 10), t["viertelstunde10"])
		for x in V["zeit"]["lokal"]:
			self.assertEqual(k.lokal_zeit(x["ms"]), x["lokal"])
		for x in V["zeit"]["nachUtc"]:
			self.assertEqual(k.lokal_nach_utc(x["tag"], x["h"], x["m"], x["zweites"]), x["ms"])
		for x in V["zeit"]["monate"]:
			self.assertEqual(k.monat_plus(x["monat"], x["n"]), x["plus"])
			self.assertEqual(k.tage_im_monat(x["monat"]), x["tage"])
		for x in V["zeit"]["rund"]:
			self.assertEqual(k.rund(x["x"], x["s"]), x["r"])
		for x in V["zeit"]["zahlen"]:
			self.assertEqual(k.zahl_lesen(x["s"]), x["x"])

	def test_umstellung(self):
		self.assertEqual(k.werte_je_tag("2026-03-29"), 92)
		self.assertEqual(k.werte_je_tag("2026-10-25"), 100)


@unittest.skipIf(V is None, "Testvektoren fehlen")
class TestVerteilung(unittest.TestCase):
	def test_ha_ii_dynamisch(self):
		v = V["verteilung"]["haDynamisch"]
		r = verteilen(v["eingabe"])
		self.assertAlmostEqual(r["verbraucher"][0]["anteil"][0], 0.5 * 0.25 / 1.05, 12)
		self.assertEqual(round(r["verbraucher"][0]["eigendeckung"][0], 3), 0.119)
		self.assertEqual(round(r["verbraucher"][1]["eigendeckung"][0], 3), 0.381)
		self.assertEqual(r["summe"]["restueberschuss"][0], 0)
		gleich(kurz(r), v["aus"])

	def test_ha_ii_statisch(self):
		v = V["verteilung"]["haStatisch"]
		r = verteilen(v["eingabe"])
		self.assertEqual(round(r["verbraucher"][0]["anteil"][0], 3), 0.585)
		self.assertEqual(round(r["verbraucher"][1]["anteil"][0], 3), 1.315)
		self.assertEqual([r["verbraucher"][0]["eigendeckung"][0], r["verbraucher"][1]["eigendeckung"][0]], [0.5, 0.8])
		self.assertAlmostEqual(r["summe"]["restueberschuss"][0], 0.6, 12)
		gleich(kurz(r), v["aus"])

	def test_gross(self):
		for name in ("dynamisch", "statisch"):
			v = V["verteilung"][name]
			r = verteilen(v["eingabe"])
			gleich(kurz(r), v["aus"], name)
			gleich(k.verteilung_kennzahlen(r), v["kennzahlen"], name)
		gleich(k.bilanz_pruefen(verteilen(V["verteilung"]["dynamisch"]["eingabe"])), V["verteilung"]["dynamisch"]["bilanz"])

	def test_tf_mehrfach_abgleich_sozial(self):
		for x in V["verteilung"]["tfPruefen"]:
			gleich(k.tf_pruefen(x["tfs"]), x["aus"], str(x["tfs"]))
		m = V["verteilung"]["mehrfach"]
		gleich(k.mehrfach_aufteilen(m["werte"], m["teilnahmen"]), m["aus"])
		self.assertEqual(fehler_von(k.mehrfach_aufteilen, [1], [{"gemeinschaftId": "A", "tf": 70}, {"gemeinschaftId": "B", "tf": 40}])["status"], 422)
		a = V["verteilung"]["nbAbgleich"]
		gleich(k.nb_abgleich(a["posten"], 0.5, 0.1), a["aus"])
		s = V["verteilung"]["sozial"]
		gleich(k.sozialquote(s["eingabe"]["verbraucher"], s["eingabe"]["erzeuger"]), s["aus"])
		self.assertFalse(k.sozialquote(s["eingabe"]["verbraucher"], [{**e, "gemeinde": False} for e in s["eingabe"]["erzeuger"]])["anwendbar"])


@unittest.skipIf(V is None, "Testvektoren fehlen")
class TestBloecke(unittest.TestCase):
	def test_zusammenfuehren(self):
		b = V["bloecke"]
		b1 = k.block_bereinigen({"zaehlpunktId": "Z", "gemeinschaftId": "G", "tag": "2026-06-01", "groesse": "eigendeckung", "werte": b["eingabe"]["b1"]["werte"], "qualitaet": b["eingabe"]["b1"]["qualitaet"], "quelle": {"art": "eda", "nachrichtId": "EDN-1"}, "empfangenAm": "2026-06-02T08:00:00.000Z"})
		neu = k.block_bereinigen({"zaehlpunktId": "Z", "gemeinschaftId": "G", "tag": "2026-06-01", "groesse": "eigendeckung", "werte": b["eingabe"]["neu"]["werte"], "qualitaet": b["eingabe"]["neu"]["qualitaet"], "quelle": {"art": "eda", "nachrichtId": "EDN-2"}, "empfangenAm": "2026-06-05T08:00:00.000Z"})
		gleich(ohne_k(b1), b["b1"])
		z = k.bloecke_zusammenfuehren(b1, neu, "2026-06-05T08:00:00.000Z")
		gleich({"block": ohne_k(z["block"]), "geaendert": z["geaendert"], "konflikte": z["konflikte"], "historie": len(z["block"]["historie"])}, b["zusammen"])

	def test_payload_monat_perioden(self):
		b = V["bloecke"]
		gleich([ohne_k(x) for x in k.payload_zerlegen(b["payload"], "Z", "G", "x")], b["zerlegt"])
		bl = [k.block_bereinigen({"zaehlpunktId": "Z", "gemeinschaftId": "G", "tag": x["tag"], "groesse": "verbrauch_gemessen", "werte": x["werte"], "qualitaet": []}) for x in b["monatsEingabe"]]
		gleich(k.monatswerte(bl), b["monatswerte"])
		gleich(k.perioden_summen(bl, "2026-10-24", "2026-10-26"), b["perioden"])
		gleich(k.perioden_summen(bl, "2026-10-24", "2026-10-26", lambda lok: "Z1" if "11" <= lok[11:13] < "15" else ""), b["periodenFenster"])
		for f in b["fehler"]:
			gleich(fehler_von(k.block_bereinigen, f["d"]), f["aus"])


@unittest.skipIf(V is None, "Testvektoren fehlen")
class TestCsv(unittest.TestCase):
	def test_faelle(self):
		for i, f in enumerate(V["csv"]["faelle"]):
			e = k.csv_parsen(f["text"], **({"zaehlpunktnummer": f["opt"]["zaehlpunktnummer"]} if f.get("opt") else {}))
			parse = {**e, "reihen": [{**r, "punkte": len(r["punkte"]), "summe": sum(p["wert"] for p in r["punkte"]), "l2": len([p for p in r["punkte"] if p["qualitaet"] == "L2"]), "l3": len([p for p in r["punkte"] if p["qualitaet"] == "L3"]), "erste": r["punkte"][0] if r["punkte"] else None} for r in e["reihen"]]}
			gleich(parse, f["aus"]["parse"], f"csv{i}")
			gleich([ohne_k(b) for b in k.csv_zu_bloecken(e, "Z", "G")], f["aus"]["bloecke"], f"csv{i}")
		gleich(fehler_von(k.csv_parsen, V["csv"]["fehler"]["text"]), V["csv"]["fehler"]["aus"])


@unittest.skipIf(V is None, "Testvektoren fehlen")
class TestQualitaet(unittest.TestCase):
	def test_ampel(self):
		for f in V["qualitaet"]["ampel"]:
			e = f["eingabe"]
			bl = {g: k.block_bereinigen({"tag": e["tag"], "groesse": g, "werte": b["werte"], "qualitaet": b["qualitaet"], "empfangenAm": b["empfangenAm"]}) for g, b in e["bloecke"].items()}
			gleich(k.tages_ampel(e["tag"], bl, e["erwartet"], e["heute"], e["modell"], e["maxKw"]), f["aus"], f["name"])

	def test_rest(self):
		q = V["qualitaet"]
		gleich(k.ersatzwerte(q["ersatz"]["werte"], q["ersatz"]["vergleich"], 8), q["ersatz"]["aus"])
		gleich(k.ersatzwerte([None, None, 3]), q["ersatz"]["ohne"])
		gleich(k.reklamations_faelle(q["reklamation"]["zeilen"], q["reklamation"]["heute"]), q["reklamation"]["aus"])
		gleich(k.lieferstatistik(q["lieferung"]["eingabe"]), q["lieferung"]["aus"])
		gleich(k.qualitaets_zusammenfassung(q["zusammenfassung"]["eingabe"]), q["zusammenfassung"]["aus"])
		gleich(k.gemeinschaft_pruefen(q["gemeinschaft"]["ed"], q["gemeinschaft"]["e"]), q["gemeinschaft"]["aus"])
		t = q["text"]["eingabe"]
		self.assertEqual(k.reklamations_text(t["zaehlpunktnummer"], t["von"], t["bis"], t["netzbetreiber"], t["gemeinschaft"], t["gemeinschaftsId"], t["gruende"]), q["text"]["aus"])


@unittest.skipIf(V is None, "Testvektoren fehlen")
class TestSimulation(unittest.TestCase):
	def test_profile_pv(self):
		s = V["simulation"]
		for p in s["profile"]:
			x = k.lastprofil(p["profil"], 2025)
			self.assertEqual(len(x), p["laenge"])
			self.assertAlmostEqual(sum(x), p["summe"], 9)
			gleich([x[i] for i in (0, 100, 5000, 17000, 30000, 35039)], p["proben"], p["profil"])
		for p in s["pvKlar"]:
			o = p["o"]
			gleich(k.pv_klarhimmel(p["d"], p["h"], ausrichtung=o.get("ausrichtung", 0), neigung=o.get("neigung", 30)), p["w"], "pvKlar", 1e-8, 1e-8)
		x = k.pv_jahr(2025, 48.2, 13.5, 30, 25, None, 5)
		gleich(sum(x), s["pvJahr"]["summe"], "pvJahr", 1e-8)
		gleich([x[i] for i in (16800, 16848, 20000, 33000)], s["pvJahr"]["proben"], "pvJahr", 1e-8, 1e-10)
		for a in s["apReduziert"]:
			self.assertEqual(k.ap_reduziert(a["a"], a["p"]), a["r"])

	def _sim(self, e):
		r = k.simulation_rechnen(e)
		return {"kennzahlen": r["kennzahlen"], "monate": r["monate"], "teilnehmer": r["teilnehmer"], "anlagen": r["anlagen"], "varianten": r["varianten"], "sensitivitaet": r["sensitivitaet"], "speicher": r["speicher"], "hinweise": r["hinweise"], "typischerTagJuli": r["typischerTag"]["juli"]}

	def test_rechnen(self):
		# Statisch ohne Speicher: bis auf Rundung gleich. Mit Gemeinschaftsspeicher ist der Ladezustand pfadabhängig –
		# Abweichungen der Winkelfunktionen im letzten Bit können einzelne Lade-/Entladeschritte verschieben (Toleranz 0,2 %).
		s = V["simulation"]["statisch"]
		gleich(self._sim(s["eingabe"]), s["aus"], "statisch", 1e-7, 2e-3)
		s = V["simulation"]["dynamisch"]
		a = self._sim(s["eingabe"])
		b = dict(s["aus"])
		a.pop("typischerTagJuli")
		b.pop("typischerTagJuli")  # einzelne Viertelstunden des Speicherpfads nicht vergleichbar, Summen schon
		gleich(a, b, "dynamisch", 2e-3, 0.05)

	def test_oeffentlich_fehler(self):
		s = V["simulation"]["oeffentlich"]
		r = k.simulation_oeffentlich(s["eingabe"])
		self.assertEqual([t["name"] for t in r["teilnehmer"]], s["aus"]["namen"])
		self.assertEqual([a["name"] for a in r["anlagen"]], s["aus"]["anlagen"])
		self.assertNotIn("eingabe", r)
		gleich(r["kennzahlen"], s["aus"]["kennzahlen"], "oeffentlich", 1e-7, 2e-3)
		for f in V["simulation"]["fehler"]:
			gleich(fehler_von(k.simulation_rechnen, f["d"]), f["aus"])


@unittest.skipIf(V is None, "Testvektoren fehlen")
class TestSpeicherPrognoseOptimierung(unittest.TestCase):
	def test_speicher(self):
		s = V["speicher"]
		b = k.speicher_bilanz(s["erzeugung"], s["verbrauch"], {"kapazitaetKwh": 50, "leistungKw": 25, "wirkungsgradPct": 90, "socStartPct": 20})
		b.pop("verlauf")
		gleich(b, s["bilanz"])
		self.assertTrue(b["bilanzOk"])
		gleich(k.speicher_empfehlung(s["erzeugung"], s["verbrauch"], (10, 50, 100)), s["empfehlung"])
		gleich(fehler_von(k.speicher_bilanz, [], [], {"kapazitaetKwh": 0}), s["fehler"])

	def test_prognose(self):
		p = V["prognose"]
		e = p["eingabe"]
		gleich(k.prognose(e["heute"], e["historie"], e["anlagen"], e["standort"], e["tage"], e["wetter"]), p["aus"], "prognose", 1e-7, 2e-3)

	def test_optimierung(self):
		for name in ("erzeugung", "verbrauch"):
			o = V["optimierung"][name]
			e = o["eingabe"]
			gleich(k.tf_optimieren(e["richtung"], e["werte"], e["kandidaten"], e["hochrechnung"]), o["aus"], name, 1e-9, 1e-6)
		t = []
		d = "2025-10-01"
		while d < "2026-10-01":
			t.append(d)
			d = k.plus_tag(d)
		r = k.repraesentative_tage(t)
		st = V["optimierung"]["stichprobe"]
		self.assertEqual(len(r["tage"]), st["anzahl"])
		self.assertEqual(r["tage"][:3], st["erste"])
		self.assertAlmostEqual(r["hochrechnung"], st["hochrechnung"], 12)
		gleich(fehler_von(k.tf_optimieren, "verbrauch", [], []), V["optimierung"]["fehler"])

	def test_optimierung_kandidaten(self):
		kv = V["optimierung"]["kandidaten"]
		kand = [k.optimierungs_kandidat(f) for f in kv["faelle"]]
		gleich(kand, kv["aus"], "kandidaten", 1e-12, 1e-12)
		self.assertEqual([x["datenbasis"] for x in kand], ["messwerte", "schaetzung", "keine"])
		erg = k.tf_optimieren("erzeugung", kv["werte"], kand, 365)
		gleich(erg, kv["erg"], "kandidaten_erg", 1e-9, 1e-6)
		self.assertEqual(k.optimierungs_hinweise(kand, erg["empfehlung"]), kv["hinweise"])
		self.assertEqual([t["id"] for t in k.optimierungs_teilnahmen(kv["teilnahmen"])], kv["teilnahmenAus"])


if __name__ == "__main__":
	unittest.main()
