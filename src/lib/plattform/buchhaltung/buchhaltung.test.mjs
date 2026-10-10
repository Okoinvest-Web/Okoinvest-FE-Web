// Tests der reinen Buchhaltungs-Logik (ohne Server):  node --test src/lib/plattform/buchhaltung/buchhaltung.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  MAHN_STANDARD, abschlussBewerten, auszugLesen, betragLesen, bmdCsv, buchungSchluessel, buchungen, camtLesen, csvLesen, datevCsv, datumLesen,
  kontenPruefen, mahnKonfigPruefen, mahnVorschlag, nummernIn, nummernLuecken, offenerBetrag, opListe, stornoBeleg, stornoErlaubt, verzugszinsSatz, zuordnen,
  steuerFristen, altersklasse, latin1,
} from "./index.js";

const rechnung = (x = {}) => ({
  id: "AR-1", nummer: "PR-2026-00007", beleg: "rechnung", art: "provision", status: "offen", brutto: 1200, netto: 1000, rechnungsdatum: "2026-08-01", faelligAm: "2026-08-15",
  partei: { name: "Muster Solar GmbH", uid: "DE123456789" }, aussteller: { name: "ÖkoInvest GmbH" }, mahnungen: [], zahlungen: [], positionen: [{ text: "Provision", menge: 1, preis: 1000, betrag: 1000 }], steuer: { satz: 0.2, betrag: 200, vorlage: "AT-USt-20" }, ...x,
});

test("Mahnkonfiguration: Standard gültig, aufsteigend Pflicht, Grenzen", () => {
  const k = mahnKonfigPruefen({});
  assert.equal(k.stufen.length, 3);
  assert.throws(() => mahnKonfigPruefen({ stufen: [{ abTagen: 20 }, { abTagen: 10 }] }), /aufsteigend/);
  assert.throws(() => mahnKonfigPruefen({ stufen: [{ abTagen: 5, gebuehr: 500 }] }), /Mahngebühr/);
  assert.throws(() => mahnKonfigPruefen({ basiszinssatz: 40 }), /Basiszinssatz/);
});

test("Mahnvorschlag: Stufe nach Tagen, Frist der letzten Mahnung, ausgeschöpft", () => {
  const k = mahnKonfigPruefen(MAHN_STANDARD);
  assert.equal(mahnVorschlag(rechnung(), "2026-08-15", k), null); // am Fälligkeitstag nicht überfällig
  const v1 = mahnVorschlag(rechnung(), "2026-08-20", k);
  assert.equal(v1.faellig, false); // 5 Tage < 7
  const v2 = mahnVorschlag(rechnung(), "2026-08-25", k);
  assert.equal(v2.faellig, true);
  assert.equal(v2.stufe, 1);
  assert.equal(v2.gebuehr, 0);
  assert.equal(v2.frist, "2026-09-01");
  const mit1 = rechnung({ mahnungen: [{ stufe: 1, am: "2026-08-25T08:00:00Z", frist: "2026-09-01" }] });
  assert.equal(mahnVorschlag(mit1, "2026-09-01", k).faellig, false); // Frist läuft noch (inkl. letztem Tag)
  const v3 = mahnVorschlag(mit1, "2026-09-06", k); // 22 Tage → Stufe 2
  assert.equal(v3.stufe, 2);
  assert.equal(v3.gebuehr, 5);
  assert.equal(v3.gesamt, 1205);
  const alle = rechnung({ mahnungen: [1, 2, 3].map((s) => ({ stufe: s, am: "2026-08-01", frist: "2026-08-02" })) });
  const v4 = mahnVorschlag(alle, "2026-10-30", k);
  assert.equal(v4.faellig, false);
  assert.equal(v4.eskalation, true);
  assert.equal(mahnVorschlag(rechnung({ beleg: "gutschrift" }), "2026-10-01", k), null);
  assert.equal(mahnVorschlag(rechnung({ mahnsperre: { anliegenId: "AN-1", grund: "Einspruch" } }), "2026-10-01", k).gesperrt, true); // unbefristet (Einspruch)
  assert.equal(mahnVorschlag(rechnung({ mahnsperre: { bis: "2026-09-01", grund: "Klärung" } }), "2026-10-01", k).faellig, true); // abgelaufen
});

test("Verzugszinsen und Pauschale: ohne Basiszinssatz keine Zinsen, CH fix 5 %, Pauschale einmal ab Stufe 2", () => {
  assert.equal(verzugszinsSatz("DE", true, null).satz, null);
  assert.equal(verzugszinsSatz("DE", true, 1.27).satz, 10.27);
  assert.equal(verzugszinsSatz("AT", true, 1.5).satz, 10.7);
  assert.equal(verzugszinsSatz("CH", true, null).satz, 5);
  const k = mahnKonfigPruefen({ ...MAHN_STANDARD, verzugszinsen: true, basiszinssatz: 1, pauschaleB2b: true });
  const mit1 = rechnung({ mahnungen: [{ stufe: 1, am: "2026-08-25", frist: "2026-09-01" }] });
  const v = mahnVorschlag(mit1, "2026-09-14", k, { land: "AT" }); // 30 Tage, 10,2 % p. a. auf 1.200 €
  assert.equal(v.zinssatz, 10.2);
  assert.equal(v.zinsen, Math.round(((1200 * 0.102 * 30) / 365) * 100) / 100);
  assert.equal(v.pauschale, 40);
  const mitPauschale = rechnung({ mahnungen: [{ stufe: 1, am: "2026-08-25", frist: "2026-09-01" }, { stufe: 2, am: "2026-09-14", frist: "2026-09-24", pauschale: 40 }] });
  assert.equal(mahnVorschlag(mitPauschale, "2026-09-30", k, { land: "AT" }).pauschale, 0);
});

test("Teilzahlung: offener Betrag und OP-Liste mit Altersklassen", () => {
  const b = rechnung({ zahlungen: [{ betrag: 200 }] });
  assert.equal(offenerBetrag(b), 1000);
  const op = opListe([b, rechnung({ id: "AR-2", nummer: "PR-2026-00008", faelligAm: "2026-10-10" }), { ...rechnung({ id: "G", nummer: "PG-2026-00001" }), beleg: "gutschrift", art: "pacht", status: "angewiesen" }], "2026-09-30");
  assert.equal(op.posten.length, 3);
  assert.equal(op.summen.forderungen, 2200);
  assert.equal(op.summen.verbindlichkeiten, 1200);
  assert.equal(op.summen.jeKlasse.t31_60, 1000);
  assert.equal(op.summen.jeKlasse.nicht_faellig, 1200);
  assert.equal(altersklasse(95).id, "t90");
});

test("Beträge und Datum aus Bankdateien", () => {
  assert.equal(betragLesen("1.234,56"), 1234.56);
  assert.equal(betragLesen("-1.234,56 €"), -1234.56);
  assert.equal(betragLesen("1234.56"), 1234.56);
  assert.equal(betragLesen("12,5"), 12.5);
  assert.ok(Number.isNaN(betragLesen("abc")));
  assert.equal(datumLesen("30.09.2026"), "2026-09-30");
  assert.equal(datumLesen("1.9.26"), "2026-09-01");
  assert.equal(datumLesen("2026-02-30"), "");
});

test("CSV-Kontoauszug: Kopfzeile nach Vorspann, Spalten, Richtung", () => {
  const csv = "Konto;AT61 1904 3002 3457 3201\n\nBuchungsdatum;Valuta;Auftraggeber/Empfänger;Verwendungszweck;Betrag;Währung\n29.09.2026;29.09.2026;Muster Solar GmbH;\"Rechnung PR 2026 00007; danke\";1.200,00;EUR\n29.09.2026;30.09.2026;Eigentümer;SEPA PG-2026-00001;-450,00;EUR\n";
  const b = csvLesen(csv);
  assert.equal(b.length, 2);
  assert.equal(b[0].betrag, 1200);
  assert.equal(b[0].richtung, "eingang");
  assert.equal(b[1].richtung, "ausgang");
  assert.deepEqual(nummernIn(b[0].zweck), ["PR-2026-00007"]);
  assert.throws(() => csvLesen("a;b\n1;2"), /Kopfzeile/);
});

test("CAMT.053: gebuchte Einträge, Namensraum, Sammler mit TxDtls, nur BOOK", () => {
  const xml = `<?xml version="1.0"?><Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08"><BkToCstmrStmt><Stmt>
  <Ntry><Amt Ccy="EUR">1200.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><Sts><Cd>BOOK</Cd></Sts><BookgDt><Dt>2026-09-29</Dt></BookgDt><ValDt><Dt>2026-09-29</Dt></ValDt><AcctSvcrRef>REF1</AcctSvcrRef>
   <NtryDtls><TxDtls><Refs><EndToEndId>NOTPROVIDED</EndToEndId></Refs><RltdPties><Dbtr><Pty><Nm>Muster Solar GmbH &amp; Co</Nm></Pty></Dbtr><DbtrAcct><Id><IBAN>DE02120300000000202051</IBAN></Id></DbtrAcct></RltdPties><RmtInf><Ustrd>PR-2026-00007</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>
  <Ntry><Amt Ccy="EUR">900.00</Amt><CdtDbtInd>DBIT</CdtDbtInd><Sts><Cd>BOOK</Cd></Sts><BookgDt><Dt>2026-09-30</Dt></BookgDt>
   <NtryDtls><TxDtls><Amt Ccy="EUR">450.00</Amt><Refs><EndToEndId>PG-2026-00001</EndToEndId></Refs></TxDtls><TxDtls><Amt Ccy="EUR">450.00</Amt><Refs><EndToEndId>PG-2026-00002</EndToEndId></Refs></TxDtls></NtryDtls></Ntry>
  <Ntry><Amt Ccy="EUR">5.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><Sts><Cd>PDNG</Cd></Sts><BookgDt><Dt>2026-09-30</Dt></BookgDt></Ntry>
  </Stmt></BkToCstmrStmt></Document>`;
  const b = camtLesen(xml);
  assert.equal(b.length, 3);
  assert.equal(b[0].name, "Muster Solar GmbH & Co");
  assert.equal(b[0].iban, "DE02120300000000202051");
  assert.equal(b[0].referenz, "REF1");
  assert.equal(b[1].referenz, "PG-2026-00001");
  assert.equal(b[2].betrag, 450);
  assert.equal(auszugLesen(xml).format, "camt");
  assert.throws(() => camtLesen("<x/>"), /CAMT/);
  assert.notEqual(buchungSchluessel(b[1]), buchungSchluessel(b[2]));
});

test("Zuordnung: sicher, Teilzahlung, Betrag+Name, Ausgang → Gutschrift", () => {
  const belege = [
    { id: "A", nummer: "PR-2026-00007", beleg: "rechnung", status: "offen", brutto: 1200, offen: 1200, partei: { name: "Muster Solar GmbH" } },
    { id: "B", nummer: "CR-2026-00003", beleg: "rechnung", status: "offen", brutto: 333.33, offen: 333.33, partei: { name: "Bäckerei Beispiel KG" } },
    { id: "G", nummer: "PG-2026-00001", beleg: "gutschrift", status: "angewiesen", brutto: 450, offen: 450, partei: { name: "Eigentümer" } },
  ];
  assert.equal(zuordnen({ richtung: "eingang", betrag: 1200, zweck: "PR-2026-00007", waehrung: "EUR" }, belege).art, "sicher");
  const t = zuordnen({ richtung: "eingang", betrag: 1000, zweck: "Re PR 2026 00007", waehrung: "EUR" }, belege);
  assert.equal(t.art, "nummer");
  assert.equal(t.differenz, -200);
  assert.equal(zuordnen({ richtung: "eingang", betrag: 333.33, zweck: "Strom September", name: "BAECKEREI BEISPIEL", waehrung: "EUR" }, belege).art, "betrag");
  assert.equal(zuordnen({ richtung: "ausgang", betrag: 450, referenz: "PG-2026-00001", zweck: "", waehrung: "EUR" }, belege).belegId, "G");
  assert.equal(zuordnen({ richtung: "eingang", betrag: 1, zweck: "", waehrung: "CHF" }, belege).art, "keiner");
});

test("Storno: Gegenbeleg mit umgekehrtem Vorzeichen, Verweis, angewiesen gesperrt", () => {
  const s = stornoBeleg(rechnung({ status: "bezahlt" }), { nummer: "ST-2026-00001", datum: "2026-09-30", grund: "Kaufpreis korrigiert" });
  assert.equal(s.brutto, -1200);
  assert.equal(s.positionen[0].betrag, -1000);
  assert.equal(s.steuer.betrag, -200);
  assert.equal(s.bereitsGezahlt, 1200);
  assert.match(s.text, /PR-2026-00007 vom 01\.08\.2026/);
  assert.equal(stornoErlaubt({ status: "angewiesen" }).ok, false);
  assert.equal(stornoErlaubt({ status: "storniert" }).ok, false);
  assert.equal(stornoErlaubt({ status: "bezahlt" }).ok, true);
  assert.deepEqual(nummernLuecken(["PR-2026-00001", "PR-2026-00003"]), [{ kreis: "PR-2026", fehlt: ["PR-2026-00002"] }]);
});

test("DATEV/BMD: Konten prüfen, Buchungssätze, Kopfzeile EXTF, Storno kehrt um", () => {
  const k = kontenPruefen({ datev: { beraternummer: "12345", mandantennummer: "99", debitor: "abc" } });
  assert.equal(k.datev.debitor, "10000"); // ungültig → Standard
  const posten = [
    { typ: "rechnung", datum: "2026-09-10", nummer: "PR-2026-00007", art: "provision", brutto: 1200, steuerArt: "ust", steuerVorlage: "AT-USt-20", steuerBetrag: 200, steuerSatz: 0.2, text: "Provision" },
    { typ: "rechnung", datum: "2026-09-11", nummer: "PR-2026-00008", art: "provision", brutto: 500, steuerArt: "reverse_charge", text: "Provision RC" },
    { typ: "gutschrift", datum: "2026-09-12", nummer: "PG-2026-00001", art: "pacht", brutto: 450, text: "Pacht" },
    { typ: "storno", ursprung: "rechnung", datum: "2026-09-20", nummer: "ST-2026-00001", art: "provision", brutto: -1200, steuerArt: "ust", text: "Storno" },
    { typ: "zahlung", datum: "2026-09-25", nummer: "PR-2026-00008", brutto: 500, richtung: "eingang", text: "Zahlung" },
  ];
  const z = buchungen(posten, k, "datev");
  assert.equal(z.length, 5);
  assert.deepEqual([z[0].soll, z[0].haben], ["10000", "8400"]);
  assert.equal(z[1].haben, "8338");
  assert.deepEqual([z[2].soll, z[2].haben], ["4210", "70000"]);
  assert.deepEqual([z[3].soll, z[3].haben], ["8400", "10000"]);
  assert.deepEqual([z[4].soll, z[4].haben], ["1200", "10000"]);
  const d = datevCsv(z, k, { von: "2026-09-01", bis: "2026-09-30", erzeugtAm: "2026-10-01T08:00:00.000Z" });
  const zeilen = d.trim().split("\r\n");
  assert.match(zeilen[0], /^"EXTF";700;21;"Buchungsstapel";13;20261001080000000;;"RE";"OekoInvest";"";12345;99;20260101;4;20260901;20260930;/);
  assert.equal(zeilen.length, 7);
  assert.match(zeilen[2], /^1200,00;"S";"EUR";;;;10000;8400;"";1009;"PR-2026-00007"/);
  const b = bmdCsv(buchungen(posten, k, "bmd"), k);
  assert.match(b, /^﻿satzart;konto;gkonto/);
  assert.match(b, /\r\n0;200000;4000;PR-2026-00007;10\.09\.2026;AR;1;20;;1200,00;200,00;Provision\r\n/);
  assert.equal(latin1("Straße €"), "Straße EUR");
});

test("Monatsabschluss: Pflichtpunkte, Übersteuerung, Steuerfristen", () => {
  const leer = abschlussBewerten("2026-09", {}, {});
  assert.equal(leer.bereit, false);
  const alles = abschlussBewerten("2026-09", { contractingLauf: true, pachtFehlend: 0, klaerfaelleOffen: 0, importVorhanden: true, eingaengeOffen: 0, zahlungslaeufeOffen: 0, pflichtFehlt: 0, exportErstellt: "datev" }, { op_abgestimmt: { erledigt: true }, ust: { erledigt: true } });
  assert.equal(alles.bereit, true);
  const ueber = abschlussBewerten("2026-09", { contractingLauf: true, klaerfaelleOffen: 2, importVorhanden: true, exportErstellt: "bmd" }, { klaerfaelle: { erledigt: true, notiz: "in Folgemonat" }, op_abgestimmt: { erledigt: true }, ust: { erledigt: true } });
  assert.equal(ueber.bereit, true);
  assert.equal(ueber.punkte.find((p) => p.id === "klaerfaelle").uebersteuert, true);
  const f = steuerFristen("2026-12");
  assert.match(f[0].text, /15\.02\.2027/);
  assert.match(f[0].text, /31\.01\.2027/);
  assert.match(f[1].text, /10\.01\.2027/);
});

test("USt-Verprobung: Summen je Vorlage, Storno negativ, ohne Vorlage gezählt", async () => {
  const { ustVerprobung } = await import("./abschluss.js");
  const belege = [
    { rechnungsdatum: "2026-09-05", netto: 1000, steuer: { vorlage: "AT-USt-20", betrag: 200 } },
    { rechnungsdatum: "2026-09-20", netto: 500, steuer: { vorlage: "AT-USt-20", betrag: 100 } },
    { rechnungsdatum: "2026-09-21", netto: 400, steuer: { vorlage: "DE-RC-13b", betrag: 0 } },
    { rechnungsdatum: "2026-08-31", netto: 999, steuer: { vorlage: "AT-USt-20", betrag: 199.8 } }, // Vormonat: zählt nicht
    { rechnungsdatum: "2026-09-22", netto: 50, steuer: {} }, // ohne Vorlage
    { rechnungsdatum: "2026-09-10", beleg: "gutschrift", netto: 800, steuer: { vorlage: "AT-Pacht-frei", betrag: 0 } }, // Pacht-Gutschrift: Eingangsseite
  ];
  const stornos = [
    { datum: "2026-09-25", netto: -500, steuer: { vorlage: "AT-USt-20", betrag: -100 } },
    { datum: "2026-09-26", ursprung: "gutschrift", netto: -800, steuer: { vorlage: "AT-Pacht-frei", betrag: 0 } }, // Storno der Gutschrift: ebenfalls Eingangsseite
  ];
  const u = ustVerprobung("2026-09", belege, stornos);
  const at = u.zeilen.find((z) => z.vorlage === "AT-USt-20");
  assert.equal(at.netto, 1000);
  assert.equal(at.steuer, 200);
  assert.equal(at.anzahl, 2);
  assert.equal(at.stornos, 1);
  const rc = u.zeilen.find((z) => z.vorlage === "DE-RC-13b");
  assert.equal(rc.steuer, 0);
  assert.equal(rc.art, "reverse_charge");
  assert.equal(u.ohneVorlage, 1);
  assert.equal(u.summen.netto, 1450);
  assert.equal(u.summen.steuer, 200);
  assert.equal(u.summen.belege, 5);
  // Gutschriften (Gutschriftsverfahren) zählen nicht in die Ausgangsumsätze, sondern separat
  assert.ok(!u.zeilen.some((z) => z.vorlage === "AT-Pacht-frei"));
  assert.equal(u.gutschriften.summen.belege, 2);
  assert.equal(u.gutschriften.summen.netto, 0); // 800 − 800 (Storno)
  const pf = u.gutschriften.zeilen.find((z) => z.vorlage === "AT-Pacht-frei");
  assert.equal(pf.anzahl, 1);
  assert.equal(pf.stornos, 1);
  assert.ok(u.hinweis.includes("keine Steuermeldung"));
});
