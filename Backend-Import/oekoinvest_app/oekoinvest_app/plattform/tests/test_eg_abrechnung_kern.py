# Copyright (c) 2026, ÖkoInvest GmbH
# Energiegemeinschaften WP4 – reine Regeln (ohne Frappe lauffähig):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_eg_abrechnung_kern
# Tabellentests der USt-Entscheidungstabelle und Gleichheitstest mit den JS-Vektoren
# src/lib/plattform/eg/testdaten/abrechnung/*.json (Schnappschuss aus scripts/plattform-test-eg-abrechnung.mjs).

import json
import math
import os
import unittest

from oekoinvest_app.plattform import eg_abrechnung_kern as K

HIER = os.path.dirname(os.path.abspath(__file__))
TD = os.path.normpath(os.path.join(HIER, "..", "..", "..", "..", "..", "src", "lib", "plattform", "eg", "testdaten", "abrechnung"))


def laden(name):
	with open(os.path.join(TD, name), encoding="utf-8") as f:
		return json.load(f)


def unterschied(a, b, pfad=""):
	"""Erster Unterschied (Zahlen mit Toleranz; fehlende Schlüssel = None wie JSON.stringify ohne undefined)."""
	zahl = (int, float)
	if isinstance(a, zahl) and not isinstance(a, bool) and isinstance(b, zahl) and not isinstance(b, bool):
		return "" if math.isclose(float(a), float(b), abs_tol=1e-6) else f"{pfad}: {a} != {b}"
	if isinstance(a, dict) and isinstance(b, dict):
		for k in sorted(set(a) | set(b)):
			u = unterschied(a.get(k), b.get(k), f"{pfad}.{k}")
			if u:
				return u
		return ""
	if isinstance(a, list) and isinstance(b, list):
		if len(a) != len(b):
			return f"{pfad}: Länge {len(a)} != {len(b)}"
		for i, (x, y) in enumerate(zip(a, b)):
			u = unterschied(x, y, f"{pfad}[{i}]")
			if u:
				return u
		return ""
	return "" if a == b else f"{pfad}: {str(a)[:120]!r} != {str(b)[:120]!r}"


def json_runde(x):
	"""Wie JSON.parse(JSON.stringify(x)) in JS: None-Werte in Objekten bleiben (null), Tupel → Listen."""
	return json.loads(json.dumps(x, ensure_ascii=False))


def ablauf(d, a):
	"""Spiegel von ablaufBerechnen() in scripts/plattform-test-eg-abrechnung.mjs."""
	e = d["eingabe"]
	r = K.abrechnung_berechnen(e["gemeinschaft"], e["periode"], e["mitglieder"], e["zaehlpunkte"], e["teilnahmen"], e["tarife"], e["anlagen"], e["netzbetreiber"], e["werte"], e["einstellungen"], e["verrechnet"], e["lieferantenpflichten"], e["heute"])
	fp = K.vorschau_fingerabdruck(r["belege"])
	freigaben = []
	for f in a["freigabe"]:
		x = K.freigabe_pruefen(f["periode"], f["stufen"], f["kontoId"], f["fingerabdruck"], f["fehler"])
		freigaben.append({"ok": x["ok"], "auge": x["auge"], "vollstaendig": x["vollstaendig"], "grund": x["grund"]})
	mit_ids = [{**b, "id": f"B{i + 1}"} for i, b in enumerate(r["belege"])]
	nummern = K.nummern_vergeben(mit_ids, a["zaehler"], 2026)
	final = [{**b, "nummer": nummern["nummern"][b["id"]], "datum": a["datum"], "status": "final", "zahlungen": [], "mahnungen": []} for b in mit_ids]
	lauf8 = K.zahlungslauf_bilden("pain008", final, e["mitglieder"], e["gemeinschaft"], a["datum"])
	lauf1 = K.zahlungslauf_bilden("pain001", final, e["mitglieder"], e["gemeinschaft"], a["datum"])
	xml8 = K.zahlungsdatei("pain008", lauf8, e["gemeinschaft"], "EG-T1-DD-1", a["erstelltAm"], a["einzugAm"])
	pruef8 = K.pain008_pruefen(xml8)
	storno = K.beleg_stornieren(final[0], "ST-2026-00001", a["datum"], "Zählpunktwerte korrigiert")
	buchungen = []
	for lauf in (lauf8, lauf1):
		for p in lauf["posten"]:
			b = next(x for x in final if x["id"] == p["belegId"])
			buchungen.extend(K.buchungen_aus_zahlung(b, {"betrag": abs(b["summen"]["brutto"]), "datum": a["zahlungAm"], "id": f"Z-{p['belegId']}"}, "2800"))
	for i, k in enumerate(a["kassa"]):
		buchungen.append({"id": f"K{i + 1}", **K.buchung_bereinigen(k)})
	ea = K.ea_rechnung(buchungen, 2026, {"bank": 1000, "kassa": 20}, 3.15, 0)
	kassa = K.kassabuch(buchungen, 20)
	uva = K.uva_vorbereitung([*final, storno], "2026-07-01", "2026-09-30", e["gemeinschaft"]["ustStatus"])
	exporte = {art: K.export_erzeugen(art, buchungen, final, 2026, e["gemeinschaft"], None, ea, kassa, "2026-12-31T00:00:00.000Z")["inhalt"] for art in ("bmd", "rzl", "datev", "ea", "kassabuch", "belegjournal")}
	m2 = next(m for m in e["mitglieder"] if m["id"] == "M2")
	jb = K.jahresbescheinigung([b for b in final if b["mitgliedId"] == "M2" and b["typ"] == "gutschrift"], 2026, m2, 28)
	r5 = next(b for b in final if b["mitgliedId"] == "M1" and b["typ"] == "rechnung")
	r4 = next(b for b in final if b["mitgliedId"] == "M4" and b["typ"] == "rechnung")
	mahn = [{"tag": t, "m5": K.eg_mahnvorschlag(r5, t), "m4": K.eg_mahnvorschlag(r4, t, K.MAHN_FAIR, True)} for t in a["mahnTage"]]
	alt = K.altwerte_lesen(a["altwerte"])
	probe = K.probe_vergleich(r["belege"], alt["werte"])
	return {
		"abrechnung": r, "fingerabdruck": fp, "freigaben": freigaben, "nummern": nummern, "lauf8": lauf8, "lauf1": lauf1, "xml8": xml8, "pruef8": pruef8,
		"storno": {"summen": storno["summen"], "positionen": [p["netto"] for p in storno["positionen"]], "text": storno["text"], "nummer": storno["nummer"]},
		"buchungen": buchungen, "ea": ea, "kassa": kassa, "uva": uva, "exporte": exporte, "jb": jb, "mahn": mahn, "alt": alt, "probe": probe,
	}


@unittest.skipUnless(os.path.isdir(TD), "Testvektoren (src/lib/plattform/eg/testdaten/abrechnung) nicht gefunden")
class TestUst(unittest.TestCase):
	def test_entscheidungstabelle(self):
		for f in laden("ust_faelle.json")["faelle"]:
			e = f["eingabe"]
			x = K.ust_fall(e["art"], e.get("gemeinschaft"), e.get("mitglied"), e.get("mitgliedsbeitragArt", "unecht"))
			ist = {"regel": x["regel"], "satz": x["satz"], "art": x["art"], "steuerschuldEg": x["steuerschuldEg"], "vorsteuerEg": x["vorsteuerEg"], "fehler": len(x["fehler"]), "warnungen": len(x["warnungen"])}
			with self.subTest(f["name"]):
				self.assertEqual(ist, f["erwartet"])
				self.assertGreaterEqual(len(x["pruefpfad"]), 2)

	def test_summen(self):
		for f in laden("ust_faelle.json")["summen"]:
			s = K.ust_summen(f["positionen"])
			with self.subTest(f["name"]):
				for k, v in f["erwartet"].items():
					self.assertAlmostEqual(s[k], v, places=2)

	def test_ku_monitor(self):
		for f in laden("ust_faelle.json")["ku_monitor"]:
			k = K.ku_monitor(**f["eingabe"])
			with self.subTest(f["name"]):
				self.assertEqual(k["status"], f["erwartet"]["status"])
				self.assertAlmostEqual(k["prognoseBrutto"], f["erwartet"]["prognoseBrutto"], places=2)
				self.assertAlmostEqual(k["quote"], f["erwartet"]["quote"], places=1)
		opt = K.ku_monitor(jahr=2026, umsatzBrutto=20000, umsatzNetto=20000, rcSteuer=3500, vorsteuer=1500)
		self.assertIn("Option U 12 prüfen", opt["option"]["empfehlung"])


@unittest.skipUnless(os.path.isdir(TD), "Testvektoren nicht gefunden")
class TestAbrechnung(unittest.TestCase):
	def test_hand_nachgerechnet(self):
		d = laden("abrechnung_monat.json")
		e = d["eingabe"]
		r = K.abrechnung_berechnen(e["gemeinschaft"], e["periode"], e["mitglieder"], e["zaehlpunkte"], e["teilnahmen"], e["tarife"], e["anlagen"], e["netzbetreiber"], e["werte"], e["einstellungen"], e["verrechnet"], e["lieferantenpflichten"], e["heute"])

		def beleg(m, typ):
			return next(b for b in r["belege"] if b["mitgliedId"] == m and b["typ"] == typ)

		for m, soll in d["pruefen"]["rechnungen"].items():
			self.assertAlmostEqual(beleg(m, "rechnung")["summen"]["netto"], soll["netto"], places=2, msg=m)
		for m, soll in d["pruefen"]["gutschriften"].items():
			self.assertAlmostEqual(beleg(m, "gutschrift")["summen"]["netto"], soll["netto"], places=2, msg=m)
			self.assertAlmostEqual(beleg(m, "gutschrift")["summen"]["ust"], soll["ust"], places=2, msg=m)
		self.assertEqual([x["mitgliedId"] for x in r["ausgeschlossen"]], d["pruefen"]["ausgeschlossen"])
		es = beleg("M1", "rechnung")["ersparnis"]
		for k, v in d["pruefen"]["ersparnisM1"].items():
			self.assertAlmostEqual(es[k], v, places=2)

	def test_gleichheit_abrechnung(self):
		d = laden("abrechnung_monat.json")
		self.assertIsNotNone(d.get("erwartet"), "Schnappschuss fehlt – node scripts/plattform-test-eg-abrechnung.mjs --nur-logik --schnappschuss")
		e = d["eingabe"]
		r = K.abrechnung_berechnen(e["gemeinschaft"], e["periode"], e["mitglieder"], e["zaehlpunkte"], e["teilnahmen"], e["tarife"], e["anlagen"], e["netzbetreiber"], e["werte"], e["einstellungen"], e["verrechnet"], e["lieferantenpflichten"], e["heute"])
		self.assertEqual(unterschied(json_runde(r), d["erwartet"]), "")

	def test_gleichheit_ablauf(self):
		d = laden("abrechnung_monat.json")
		a = laden("ablauf.json")
		self.assertIsNotNone(a.get("erwartet"))
		x = json_runde(ablauf(d, a))
		for teil in a["erwartet"]:
			with self.subTest(teil):
				self.assertEqual(unterschied(x[teil], a["erwartet"][teil], teil), "")

	def test_regeln(self):
		self.assertEqual(K.periode_vorschlag("quartal", "2026-02-10")["bis"], "2025-12-31")
		self.assertEqual(K.abrechnung_fruehestens("2026-12-31"), "2027-01-20")
		with self.assertRaisesRegex(ValueError, "abgeschlossene"):
			K.periode_bereinigen({"von": "2026-09-01", "bis": "2026-10-31", "art": "monat"}, "2026-10-01")
		seg = K.tarif_segmente([{"id": "A", "status": "abgeloest", "gueltigAb": "2026-01-01", "gueltigBis": "2026-08-14"}, {"id": "B", "status": "aktiv", "gueltigAb": "2026-08-15", "gueltigBis": ""}], "2026-08-01", "2026-08-31")
		self.assertEqual([(s["tarifId"], s["bis"]) for s in seg], [("A", "2026-08-14"), ("B", "2026-08-31")])
		self.assertEqual(K.mandat_pruefen({"referenz": "X-1", "datum": "2022-01-01", "status": "aktiv"}, "AT611904300234573201", "2026-10-01")["ok"], False)
		with self.assertRaisesRegex(ValueError, "Belegprinzip"):
			K.buchung_bereinigen({"datum": "2026-09-01", "konto": "7600", "betrag": "5", "text": "Porto"})


if __name__ == "__main__":
	unittest.main()
