# Copyright (c) 2026, ÖkoInvest GmbH
# Backoffice-Werkzeuge (Buchhaltung, Datenschutz & GwG, Deal-Pipeline) – reine Regeln (ohne Frappe lauffähig):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_backoffice_werkzeuge_kern
# Gleiche Fälle wie src/lib/plattform/{buchhaltung,compliance,transaktion}/*.test.mjs (Spiegel JS ↔ Python).

import json
import os
import unittest

from oekoinvest_app.plattform import buchhaltung_kern as B
from oekoinvest_app.plattform import compliance_kern as C
from oekoinvest_app.plattform import transaktion_kern as T


def rechnung(**x):
	b = {"id": "AR-1", "nummer": "PR-2026-00007", "beleg": "rechnung", "art": "provision", "status": "offen", "brutto": 1200, "netto": 1000, "rechnungsdatum": "2026-08-01", "faelligAm": "2026-08-15",
		"partei": {"name": "Muster Solar GmbH", "uid": "DE123456789"}, "aussteller": {"name": "ÖkoInvest GmbH"}, "mahnungen": [], "zahlungen": [],
		"positionen": [{"text": "Provision", "menge": 1, "preis": 1000, "betrag": 1000}], "steuer": {"satz": 0.2, "betrag": 200, "vorlage": "AT-USt-20"}}
	b.update(x)
	return b


class TestMahnwesen(unittest.TestCase):
	def test_konfig(self):
		self.assertEqual(len(B.mahn_konfig_pruefen({})["stufen"]), 3)
		with self.assertRaisesRegex(ValueError, "aufsteigend"):
			B.mahn_konfig_pruefen({"stufen": [{"abTagen": 20}, {"abTagen": 10}]})
		with self.assertRaisesRegex(ValueError, "Basiszinssatz"):
			B.mahn_konfig_pruefen({"basiszinssatz": 40})

	def test_vorschlag(self):
		k = B.mahn_konfig_pruefen(B.MAHN_STANDARD)
		self.assertIsNone(B.mahn_vorschlag(rechnung(), "2026-08-15", k))
		self.assertFalse(B.mahn_vorschlag(rechnung(), "2026-08-20", k)["faellig"])
		v = B.mahn_vorschlag(rechnung(), "2026-08-25", k)
		self.assertTrue(v["faellig"])
		self.assertEqual((v["stufe"], v["gebuehr"], v["frist"]), (1, 0, "2026-09-01"))
		mit1 = rechnung(mahnungen=[{"stufe": 1, "am": "2026-08-25T08:00:00Z", "frist": "2026-09-01"}])
		self.assertFalse(B.mahn_vorschlag(mit1, "2026-09-01", k)["faellig"])
		v3 = B.mahn_vorschlag(mit1, "2026-09-06", k)
		self.assertEqual((v3["stufe"], v3["gebuehr"], v3["gesamt"]), (2, 5, 1205))
		self.assertTrue(B.mahn_vorschlag(rechnung(mahnsperre={"anliegenId": "AN-1"}), "2026-10-01", k)["gesperrt"])
		self.assertTrue(B.mahn_vorschlag(rechnung(mahnsperre={"bis": "2026-09-01"}), "2026-10-01", k)["faellig"])

	def test_zinsen_pauschale(self):
		self.assertIsNone(B.verzugszins_satz("DE", True, None)["satz"])
		self.assertEqual(B.verzugszins_satz("AT", True, 1.5)["satz"], 10.7)
		self.assertEqual(B.verzugszins_satz("CH", True, None)["satz"], 5)
		k = B.mahn_konfig_pruefen({**B.MAHN_STANDARD, "verzugszinsen": True, "basiszinssatz": 1, "pauschaleB2b": True})
		v = B.mahn_vorschlag(rechnung(mahnungen=[{"stufe": 1, "am": "2026-08-25", "frist": "2026-09-01"}]), "2026-09-14", k, "AT")
		self.assertEqual(v["zinssatz"], 10.2)
		self.assertEqual(v["zinsen"], B.rund2(1200 * 0.102 * 30 / 365))
		self.assertEqual(v["pauschale"], 40)


class TestZahlungen(unittest.TestCase):
	def test_betrag_datum(self):
		self.assertEqual(B.betrag_lesen("1.234,56"), 1234.56)
		self.assertEqual(B.betrag_lesen("-1.234,56 €"), -1234.56)
		self.assertEqual(B.betrag_lesen("1234.56"), 1234.56)
		self.assertIsNone(B.betrag_lesen("abc"))
		self.assertEqual(B.datum_lesen("1.9.26"), "2026-09-01")
		self.assertEqual(B.datum_lesen("2026-02-30"), "")

	def test_csv_camt(self):
		csv = "Konto;AT61\n\nBuchungsdatum;Valuta;Auftraggeber/Empfänger;Verwendungszweck;Betrag;Währung\n29.09.2026;29.09.2026;Muster Solar GmbH;\"Rechnung PR 2026 00007; danke\";1.200,00;EUR\n29.09.2026;30.09.2026;Eigentümer;SEPA PG-2026-00001;-450,00;EUR\n"
		b = B.csv_lesen(csv)
		self.assertEqual([x["richtung"] for x in b], ["eingang", "ausgang"])
		self.assertEqual(B.nummern_in(b[0]["zweck"]), ["PR-2026-00007"])
		xml = ('<?xml version="1.0"?><Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08"><BkToCstmrStmt><Stmt>'
			'<Ntry><Amt Ccy="EUR">1200.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><Sts><Cd>BOOK</Cd></Sts><BookgDt><Dt>2026-09-29</Dt></BookgDt><AcctSvcrRef>REF1</AcctSvcrRef>'
			'<NtryDtls><TxDtls><Refs><EndToEndId>NOTPROVIDED</EndToEndId></Refs><RltdPties><Dbtr><Pty><Nm>Muster Solar GmbH &amp; Co</Nm></Pty></Dbtr></RltdPties><RmtInf><Ustrd>PR-2026-00007</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>'
			'<Ntry><Amt Ccy="EUR">900.00</Amt><CdtDbtInd>DBIT</CdtDbtInd><Sts><Cd>BOOK</Cd></Sts><BookgDt><Dt>2026-09-30</Dt></BookgDt><NtryDtls>'
			'<TxDtls><Amt Ccy="EUR">450.00</Amt><Refs><EndToEndId>PG-2026-00001</EndToEndId></Refs></TxDtls><TxDtls><Amt Ccy="EUR">450.00</Amt><Refs><EndToEndId>PG-2026-00002</EndToEndId></Refs></TxDtls></NtryDtls></Ntry>'
			'<Ntry><Amt Ccy="EUR">5.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><Sts><Cd>PDNG</Cd></Sts></Ntry></Stmt></BkToCstmrStmt></Document>')
		c = B.camt_lesen(xml)
		self.assertEqual(len(c), 3)
		self.assertEqual((c[0]["name"], c[0]["referenz"], c[1]["referenz"], c[2]["betrag"]), ("Muster Solar GmbH & Co", "REF1", "PG-2026-00001", 450))
		self.assertEqual(B.auszug_lesen(xml)["format"], "camt")

	def test_zuordnung(self):
		belege = [
			{"id": "A", "nummer": "PR-2026-00007", "beleg": "rechnung", "status": "offen", "brutto": 1200, "offen": 1200, "partei": {"name": "Muster Solar GmbH"}},
			{"id": "B", "nummer": "CR-2026-00003", "beleg": "rechnung", "status": "offen", "brutto": 333.33, "offen": 333.33, "partei": {"name": "Bäckerei Beispiel KG"}},
			{"id": "G", "nummer": "PG-2026-00001", "beleg": "gutschrift", "status": "angewiesen", "brutto": 450, "offen": 450, "partei": {"name": "Eigentümer"}},
		]
		self.assertEqual(B.zuordnen({"richtung": "eingang", "betrag": 1200, "zweck": "PR-2026-00007", "waehrung": "EUR"}, belege)["art"], "sicher")
		t = B.zuordnen({"richtung": "eingang", "betrag": 1000, "zweck": "Re PR 2026 00007", "waehrung": "EUR"}, belege)
		self.assertEqual((t["art"], t["differenz"]), ("nummer", -200))
		self.assertEqual(B.zuordnen({"richtung": "eingang", "betrag": 333.33, "zweck": "Strom", "name": "BAECKEREI BEISPIEL", "waehrung": "EUR"}, belege)["art"], "betrag")  # „beispiel“ passt
		self.assertEqual(B.zuordnen({"richtung": "eingang", "betrag": 333.33, "zweck": "Strom", "name": "Fremdfirma", "waehrung": "EUR"}, belege)["art"], "keiner")
		self.assertEqual(B.zuordnen({"richtung": "eingang", "betrag": 333.33, "zweck": "Strom", "name": "Bäckerei Beispiel", "waehrung": "EUR"}, belege)["art"], "betrag")
		self.assertEqual(B.zuordnen({"richtung": "ausgang", "betrag": 450, "referenz": "PG-2026-00001", "zweck": "", "waehrung": "EUR"}, belege)["belegId"], "G")


class TestOpStornoExport(unittest.TestCase):
	def test_op(self):
		op = B.op_liste([rechnung(zahlungen=[{"betrag": 200}]), rechnung(id="AR-2", nummer="PR-2026-00008", faelligAm="2026-10-10"), {**rechnung(id="G", nummer="PG-2026-00001"), "beleg": "gutschrift", "art": "pacht", "status": "angewiesen"}], "2026-09-30")
		self.assertEqual((op["summen"]["forderungen"], op["summen"]["verbindlichkeiten"]), (2200, 1200))
		self.assertEqual(op["summen"]["jeKlasse"]["t31_60"], 1000)

	def test_storno(self):
		s = B.storno_beleg(rechnung(status="bezahlt"), "ST-2026-00001", "2026-09-30", "Kaufpreis korrigiert")
		self.assertEqual((s["brutto"], s["positionen"][0]["betrag"], s["steuer"]["betrag"], s["bereitsGezahlt"]), (-1200, -1000, -200, 1200))
		self.assertIn("PR-2026-00007 vom 01.08.2026", s["text"])
		self.assertFalse(B.storno_erlaubt({"status": "angewiesen"})["ok"])
		self.assertEqual(B.nummern_luecken(["PR-2026-00001", "PR-2026-00003"]), [{"kreis": "PR-2026", "fehlt": ["PR-2026-00002"]}])

	def test_datev_bmd(self):
		k = B.konten_pruefen({"datev": {"beraternummer": "12345", "mandantennummer": "99", "debitor": "abc"}})
		self.assertEqual(k["datev"]["debitor"], "10000")
		posten = [
			{"typ": "rechnung", "datum": "2026-09-10", "nummer": "PR-2026-00007", "art": "provision", "brutto": 1200, "steuerArt": "ust", "steuerVorlage": "AT-USt-20", "steuerBetrag": 200, "steuerSatz": 0.2, "text": "Provision"},
			{"typ": "rechnung", "datum": "2026-09-11", "nummer": "PR-2026-00008", "art": "provision", "brutto": 500, "steuerArt": "reverse_charge", "text": "Provision RC"},
			{"typ": "gutschrift", "datum": "2026-09-12", "nummer": "PG-2026-00001", "art": "pacht", "brutto": 450, "text": "Pacht"},
			{"typ": "storno", "ursprung": "rechnung", "datum": "2026-09-20", "nummer": "ST-2026-00001", "art": "provision", "brutto": -1200, "steuerArt": "ust", "text": "Storno"},
			{"typ": "zahlung", "datum": "2026-09-25", "nummer": "PR-2026-00008", "brutto": 500, "richtung": "eingang", "text": "Zahlung"},
		]
		z = B.buchungen(posten, k, "datev")
		self.assertEqual([(x["soll"], x["haben"]) for x in z], [("10000", "8400"), ("10000", "8338"), ("4210", "70000"), ("8400", "10000"), ("1200", "10000")])
		d = B.datev_csv(z, k, "2026-09-01", "2026-09-30", "2026-10-01T08:00:00.000Z").strip().split("\r\n")
		self.assertTrue(d[0].startswith('"EXTF";700;21;"Buchungsstapel";13;20261001080000000;;"RE";"OekoInvest";"";12345;99;20260101;4;20260901;20260930;'))
		self.assertTrue(d[2].startswith('1200,00;"S";"EUR";;;;10000;8400;"";1009;"PR-2026-00007"'))
		self.assertIn("\r\n0;200000;4000;PR-2026-00007;10.09.2026;AR;1;20;;1200,00;200,00;Provision\r\n", B.bmd_csv(B.buchungen(posten, k, "bmd"), k))

	def test_abschluss(self):
		self.assertFalse(B.abschluss_bewerten("2026-09")["bereit"])
		ok = B.abschluss_bewerten("2026-09", {"contractingLauf": True, "importVorhanden": True, "exportErstellt": "datev"}, {"op_abgestimmt": {"erledigt": True}, "ust": {"erledigt": True}})
		self.assertTrue(ok["bereit"])
		f = B.steuer_fristen("2026-12")
		self.assertIn("15.02.2027", f[0]["text"])
		self.assertIn("31.01.2027", f[0]["text"])
		self.assertIn("10.01.2027", f[1]["text"])


class TestCompliance(unittest.TestCase):
	def test_fristen(self):
		self.assertEqual(C.plus_monate("2026-01-31", 1), "2026-02-28")
		self.assertEqual(C.plus_monate("2028-01-31", 1), "2028-02-29")
		self.assertEqual(C.ds_frist("2026-01-31", verlaengert=True), "2026-04-30")
		self.assertEqual(C.ds_frist("2026-09-01", "CH"), "2026-10-01")
		a = {"art": "auskunft", "status": "in_bearbeitung", "eingangAm": "2026-09-01", "land": "AT"}
		self.assertEqual(C.ds_frist_status(a, "2026-09-26")["ampel"], "gelb")
		self.assertEqual(C.ds_frist_status(a, "2026-10-02")["ampel"], "rot")
		self.assertTrue(C.ds_uebergang(a, "verlaengern", {"begruendung": "Umfangreiche Datenbestände in drei Systemen"}, "2026-09-10")["ok"])
		self.assertFalse(C.ds_uebergang(a, "verlaengern", {"begruendung": "Umfangreiche Datenbestände in drei Systemen"}, "2026-10-02")["ok"])
		self.assertIn("Datenexport", C.ds_uebergang(a, "erledigen", {"ergebnis": "Auskunft erteilt per Portal"}, "2026-09-10")["fehler"])

	def test_verdacht(self):
		f = {"status": "in_pruefung", "erfasstVon": "U-1"}
		self.assertIn("Vier-Augen", C.verdacht_uebergang(f, "keine_meldung", {"begruendung": "Mittelherkunft durch Kaufvertrag belegt, plausibel"}, ich_id="U-1")["fehler"])
		self.assertTrue(C.verdacht_uebergang(f, "keine_meldung", {"begruendung": "Mittelherkunft durch Kaufvertrag belegt, plausibel"}, ich_id="U-2")["ok"])
		m = {"status": "meldung_vorbereitet"}
		self.assertFalse(C.verdacht_uebergang(m, "gemeldet", {"aktenzeichen": "FIU-2026/123", "gemeldetAm": "2026-10-01"}, heute="2026-09-30")["ok"])
		self.assertTrue(C.verdacht_uebergang(m, "gemeldet", {"aktenzeichen": "FIU-2026/123", "gemeldetAm": "2026-09-30"}, heute="2026-09-30")["ok"])
		self.assertEqual(C.verdacht_aufbewahrung_bis("2026-09-30", "CH"), "2036-12-31")

	def test_sla_vvt(self):
		self.assertEqual(C.werktage("2026-09-25", "2026-09-28"), 1)
		self.assertEqual(C.plus_werktage("2026-09-25", 3), "2026-09-30")
		self.assertEqual(C.kyc_sla({"status": "eingereicht", "kontotyp": "person", "eingereichtAm": "2026-09-25T10:00:00Z"}, "2026-10-01")["ampel"], "rot")
		v = C.vvt()
		self.assertTrue(v["entwurf"])
		for t in v["taetigkeiten"]:
			for k in ("titel", "zweck", "rechtsgrundlage", "betroffene", "daten", "empfaenger", "drittland", "loeschung"):
				self.assertTrue(t.get(k), f"{t['id']}.{k}")
		self.assertEqual(len(C.vvt_csv().strip().split("\r\n")), len(v["taetigkeiten"]) + 3)


class TestPipeline(unittest.TestCase):
	def p(self, **x):
		d = {"id": "P-1", "titel": "PV 10 MWp", "status": "veroeffentlicht", "mwp": 10, "preisProKwp": 80, "provisionSatz": 0.025, "erstelltAm": "2026-08-01T00:00:00Z", "geaendertAm": "2026-09-25T00:00:00Z"}
		d.update(x)
		return d

	def test_phase_preis_karte(self):
		self.assertIsNone(T.phase_von(self.p(status="entwurf")))
		self.assertEqual(T.phase_von(self.p(), interessen=[{"status": "nda_freigegeben"}]), "datenraum")
		self.assertEqual(T.phase_von(self.p(status="reserviert"), closing={"status": "signing"}), "closing")
		self.assertEqual(T.preis_gesamt({"preisProKwp": 71}, 24), 1704000)
		self.assertEqual(T.erwarteter_preis(self.p(), interessen=[{"status": "loi_abgegeben", "loi": {"betrag": 700000}}, {"status": "loi_angenommen", "loi": {"betrag": 650000}}])[0], 650000)
		k = T.deal_karte(self.p(), heute="2026-09-30")
		self.assertEqual((k["provision"], k["provisionGewichtet"], k["closingErwartet"]), (20000, 2000, "2027-06"))
		o = T.deal_karte(self.p(), override={"wahrscheinlichkeit": 40, "closingErwartet": "2026-12", "notiz": "Signing im Dezember"}, heute="2026-09-30")
		self.assertEqual((o["wahrscheinlichkeit"], o["quartal"], o["manuell"]), (0.4, "2026-Q4", True))
		self.assertTrue(T.deal_karte(self.p(geaendertAm="2026-08-01T00:00:00Z"), heute="2026-09-30")["stockt"])
		a = T.pipeline_auswerten([k, T.deal_karte(self.p(id="P-2", status="verkauft"), closing={"status": "vollzogen", "kaufpreis": 1000000, "geaendertAm": "2026-09-10"}, heute="2026-09-30")])
		self.assertEqual((a["summen"]["deals"], a["summen"]["provisionVerkauft"]), (1, 25000))
		with self.assertRaises(ValueError):
			T.override_pruefen({"wahrscheinlichkeit": 50, "notiz": "kurz"})
		self.assertTrue(T.bericht_csv([k]).startswith("﻿Projekt;"))


class TestSpiegel(unittest.TestCase):
	def test_vvt_json_aktuell(self):
		pfad = os.path.join(os.path.dirname(__file__), "..", "compliance_vvt.json")
		with open(pfad, encoding="utf-8") as f:
			self.assertEqual(json.load(f)["format"], "oekoinvest-vvt-1")


if __name__ == "__main__":
	unittest.main()
