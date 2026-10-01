# Copyright (c) 2026, ÖkoInvest GmbH
# EDA-Marktkommunikation (WP2) – reine Logik ohne Frappe, Gleichheitstest gegen die JS-Referenz:
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_eg_eda_kern
# Liest dieselben Testvektoren wie scripts/plattform-test-eg-eda.mjs aus src/lib/plattform/eg/testdaten/eda/*.json
# (erzeugt mit `node scripts/plattform-test-eg-eda.mjs --vektoren`). Ohne Website-Quelltext werden die Vektoren übersprungen.

import json
import math
import os
import unittest

from oekoinvest_app.plattform import eg_eda_kern as k

HIER = os.path.dirname(os.path.abspath(__file__))
VEKTOREN = os.path.normpath(os.path.join(HIER, "..", "..", "..", "..", "..", "src", "lib", "plattform", "eg", "testdaten", "eda"))


def _zufall_folge(seed, n):
	r = k.zufall(seed)
	return [r() for _ in range(n)]


def _kw(fn):
	return lambda o: fn(**o)


# JS-Funktionsname → Python-Aufruf (Argumente wie im Vektor: Liste)
AUFRUF = {
	"tagBeginnUtc": lambda a: k.tag_beginn_utc(*a),
	"qhAnzahl": lambda a: k.qh_anzahl(*a),
	"wienOffsetMinuten": lambda a: k.wien_offset_minuten(*a),
	"lokalTag": lambda a: k.lokal_tag(*a),
	"plusTage": lambda a: k.plus_tage(*a),
	"tageZwischen": lambda a: k.tage_zwischen(*a),
	"tageListe": lambda a: k.tage_liste(*a),
	"xmlSchreiben": lambda a: k.xml_schreiben(*a),
	"xmlLesen": lambda a: k.xml_lesen(*a),
	"nachrichtBauen": lambda a: k.nachricht_bauen(*a),
	"nachrichtLesen": lambda a: k.nachricht_lesen(*a),
	"zahlFormat": lambda a: k.zahl_format(*a),
	"responsecodeInfo": lambda a: k.responsecode_info(*a),
	"portalAnleitung": lambda a: k.portal_anleitung(*a),
	"edaId": lambda a: k.eda_id(*a),
	"gemeinschaftEdaPruefen": lambda a: k.gemeinschaft_eda_pruefen(*a),
	"anmeldungPruefen": lambda a: k.anmeldung_pruefen(**a[0]),
	"tfAenderungPruefen": lambda a: k.tf_aenderung_pruefen(**a[0]),
	"abmeldungPruefen": lambda a: k.abmeldung_pruefen(**a[0]),
	"nachforderungPruefen": lambda a: k.nachforderung_pruefen(**a[0]),
	"vierAugenNoetig": lambda a: k.vier_augen_noetig(*a),
	"prozessNeu": lambda a: k.prozess_neu(**a[0]),
	"startNachricht": lambda a: k.start_nachricht(a[0], **a[1]),
	"alsGesendet": lambda a: k.als_gesendet(a[0], **a[1]),
	"freigabeAnwenden": lambda a: k.freigabe_anwenden(a[0], **a[1]),
	"eingangAnwenden": lambda a: k.eingang_anwenden(a[0], a[1], **a[2]),
	"eingangOhneProzess": lambda a: k.eingang_ohne_prozess(a[0], **a[1]),
	"fristenPruefen": lambda a: k.fristen_pruefen(**a[0]),
	"erinnerungFaellig": lambda a: k.erinnerung_faellig(*a),
	"fristAmpel": lambda a: k.frist_ampel(*a),
	"fristAnwenden": lambda a: k.frist_anwenden(a[0], a[1], **a[2]),
	"erinnerungText": lambda a: k.erinnerung_text(**a[0]),
	"energiedatenPayload": lambda a: k.energiedaten_payload(a[0], **a[1]),
	"energiedatenKennzahlen": lambda a: k.energiedaten_kennzahlen(*a),
	"datenluecken": lambda a: k.datenluecken(**a[0]),
	"zeitraeume": lambda a: k.zeitraeume(*a),
	"podlistAbgleich": lambda a: k.podlist_abgleich(*a),
	"reklamationBefunde": lambda a: k.reklamation_befunde(**a[0]),
	"reklamationVorlage": lambda a: k.reklamation_vorlage(**a[0]),
	"reklamationAkte": lambda a: k.reklamation_akte(*a),
	"seedVon": lambda a: k.seed_von(*a),
	"zufallFolge": lambda a: _zufall_folge(*a),
	"simulatorAntworten": lambda a: k.simulator_antworten(a[0], a[1], **a[2]),
	"simulatorLiefertTag": lambda a: k.simulator_liefert_tag(*a),
	"simulatorEnergiedaten": lambda a: k.simulator_energiedaten(**a[0]),
}


def gleich(a, b):
	if isinstance(a, bool) or isinstance(b, bool):
		return a == b
	if isinstance(a, (int, float)) and isinstance(b, (int, float)):
		return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
	if isinstance(a, list) and isinstance(b, list):
		return len(a) == len(b) and all(gleich(x, y) for x, y in zip(a, b))
	if isinstance(a, dict) and isinstance(b, dict):
		return sorted(a) == sorted(b) and all(gleich(a[x], b[x]) for x in a)
	return a == b


def _normal(x):
	return json.loads(json.dumps(x, ensure_ascii=False))


@unittest.skipUnless(os.path.isdir(VEKTOREN), "Testvektoren (Website-Quelltext) nicht vorhanden")
class TestVektoren(unittest.TestCase):
	def _datei(self, name):
		with open(os.path.join(VEKTOREN, f"{name}.json"), encoding="utf-8") as f:
			faelle = json.load(f)["faelle"]
		self.assertTrue(faelle)
		for fall in faelle:
			with self.subTest(datei=name, fall=fall["name"]):
				fn = AUFRUF[fall["fn"]]
				try:
					ist = {"ergebnis": _normal(fn(fall["args"]))}
				except Exception as e:  # noqa: BLE001 – Fehlermeldung ist Teil des Vertrags
					ist = {"fehler": str(e)}
				soll = {"fehler": fall["fehler"]} if "fehler" in fall else {"ergebnis": fall["ergebnis"]}
				self.assertTrue(gleich(ist, soll), f"{name}/{fall['name']}: {json.dumps(ist, ensure_ascii=False)[:600]} ≠ {json.dumps(soll, ensure_ascii=False)[:600]}")

	def test_zeit(self):
		self._datei("zeit")

	def test_xml(self):
		self._datei("xml")

	def test_schema(self):
		self._datei("schema")

	def test_codes(self):
		self._datei("codes")

	def test_automat(self):
		self._datei("automat")

	def test_daten(self):
		self._datei("daten")

	def test_simulator(self):
		self._datei("simulator")


class TestRegeln(unittest.TestCase):
	def test_rundlauf_energiedaten(self):
		ed = k.simulator_energiedaten(zaehlpunktnummer="AT0030000491000000000000000D00002", tag="2026-10-25", richtung="erzeugung", kwp=10, seed="x")
		self.assertEqual(len(ed["reihen"][0]["werte"]), 100)
		xml = k.nachricht_bauen({"code": "DATEN_CRMSG", "prozesscode": "CR_MSG", "absender": "AT003000", "empfaenger": "RC109417", "erstellt": "2026-10-26T03:00:00Z", "messageId": "M", "conversationId": "C", "prozessdatum": "2026-10-25", "daten": {"MeteringPoint": "AT0030000491000000000000000D00002", "Energy": ed}})
		n = k.nachricht_lesen(xml)
		self.assertTrue(n["ok"], n["fehler"])
		p = k.energiedaten_payload(n, gemeinschaftId="G", nachrichtId="N")["payload"]
		self.assertEqual([r["groesse"] for r in p["reihen"]], ["erzeugung_gemessen", "erzeugung_tf", "restueberschuss"])
		self.assertEqual(p["reihen"][0]["werte"], ed["reihen"][0]["werte"])

	def test_sicherheit_xml(self):
		for roh in ("", "<A>", "<A><B></A>", "<A>&x;</A>", "<A/><B/>"):
			self.assertFalse(k.nachricht_lesen(roh)["ok"])
		with self.assertRaises(k.XmlFehler):
			k.xml_lesen("<A>" + "<B>" * 50 + "</A>")

	def test_zeitumstellung(self):
		self.assertEqual(k.qh_anzahl("2026-03-29"), 92)
		self.assertEqual(k.qh_anzahl("2026-10-25"), 100)
		self.assertEqual(k.qh_anzahl("2026-07-01"), 96)

	def test_vier_augen_und_fristen(self):
		self.assertTrue(k.vier_augen_noetig("abmelden", 3))
		self.assertFalse(k.vier_augen_noetig("abmelden", 2))
		self.assertEqual(k.EDA_FRISTEN["zustimmungTage"], 30)


if __name__ == "__main__":
	unittest.main()
