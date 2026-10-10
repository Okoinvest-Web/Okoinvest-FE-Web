// Tests der reinen Finanz-Logik (ohne Server):  node --test src/lib/plattform/finanzen/finanzen.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  abzurechnen, afaPlan, arbeitspreis, budgetVergleich, contractingAbrechnen, ertragAusMonatswerten, faelligkeiten, ibanBauen, ibanMaskieren,
  ibanPruefen, indexVerlauf, laufzeitEnde, mahnhinweis, naechsteFaelligkeit, pachtPositionen, pain001, pain001Pruefen, perioden, provisionPositionen,
  sepaText, steuerBerechnen, steuerVorschlag, umsatzbeteiligung, zahlungsstatus, pflichtangabenPruefen,
  aufteilungGilt, pachtAufteilen, vertragsEnde,
} from "./index.js";

const TAB = [
  { reihe: "VPI-AT-2020", jahr: 2022, wert: 110 },
  { reihe: "VPI-AT-2020", jahr: 2023, wert: 121 },
  { reihe: "VPI-AT-2020", jahr: 2024, wert: 124 },
  { reihe: "VPI-AT-2020", jahr: 2025, wert: 130.2 },
];

test("Indexierung: jährlich voll weitergegeben", () => {
  const v = indexVerlauf({ basisBetrag: 10000, basisJahr: 2022, reihe: "VPI-AT-2020", tabelle: TAB, bisJahr: 2026 });
  assert.equal(v.basisIndex, 110);
  // 2024: 121/110 = +10 % → 11000; 2025: 124/121 → 11272.73; 2026: 130.2/124 = +5 % → 11836.36
  assert.deepEqual(v.schritte.map((s) => s.betrag), [10000, 11000, 11272.73, 11836.37]);
  assert.equal(v.betrag, 11836.37);
  assert.deepEqual(v.fehlt, []);
});

test("Indexierung: Schwelle 5 %, Anteil 80 %, nur Erhöhung", () => {
  const v = indexVerlauf({ basisBetrag: 10000, basisJahr: 2022, reihe: "VPI-AT-2020", tabelle: TAB, bisJahr: 2026, schwellePct: 5, anteilPct: 80 });
  // 2024: +10 % ≥ 5 % → +8 % = 10800 (Basis jetzt 121); 2025: 124/121 = +2,48 % < 5 % → bleibt; 2026: 130,2/121 = +7,6 % → +6,08 %
  assert.equal(v.schritte[1].betrag, 10800);
  assert.equal(v.schritte[2].angepasst, false);
  assert.equal(v.schritte[3].angepasst, true);
  assert.equal(v.betrag, Math.round(10800 * (1 + 0.8 * (130.2 / 121 - 1)) * 100) / 100);
  const runter = indexVerlauf({ basisBetrag: 1000, basisJahr: 2025, basisIndex: 140, reihe: "VPI-AT-2020", tabelle: TAB, bisJahr: 2026, nurErhoehung: true });
  assert.equal(runter.betrag, 1000);
  const fehlend = indexVerlauf({ basisBetrag: 1000, basisJahr: 2025, reihe: "VPI-AT-2020", tabelle: TAB, bisJahr: 2027 });
  assert.deepEqual(fehlend.fehlt, [2026]);
});

test("Umsatzbeteiligung mit Mindestpacht", () => {
  const hoch = umsatzbeteiligung({ ertragKwh: 1_000_000, erloesCtKwh: 7.5, anteil: 0.05, mindestJahr: 10000, faktorJahr: 0.25 });
  assert.equal(hoch.erloesEur, 75000);
  assert.equal(hoch.anteilEur, 3750);
  assert.equal(hoch.mindestEur, 2500);
  assert.equal(hoch.betrag, 3750);
  assert.equal(hoch.mindestGreift, false);
  const niedrig = umsatzbeteiligung({ ertragKwh: 200_000, erloesCtKwh: 7.5, anteil: 0.05, mindestJahr: 10000, faktorJahr: 0.25 });
  assert.equal(niedrig.anteilEur, 750);
  assert.equal(niedrig.betrag, 2500);
  assert.equal(niedrig.mindestGreift, true);
  const pos = pachtPositionen({ modell: "umsatz", umsatz: { anteil: 0.05, erloesCtKwh: 7.5, mindestJahr: 10000 } }, { phase: "pacht", von: "2026-01-01", bis: "2026-03-31", anteil: 1, faktorJahr: 0.25, tage: 90, tageVoll: 90 }, { ertragKwh: 200_000 });
  assert.equal(pos.netto, 2500);
  assert.equal(pos.positionen.length, 2);
  const ohne = pachtPositionen({ modell: "umsatz", umsatz: { anteil: 0.05, erloesCtKwh: 7.5, mindestJahr: 10000 } }, { phase: "pacht", von: "2026-01-01", bis: "2026-03-31", anteil: 1, faktorJahr: 0.25 }, { ertragKwh: null, ertragFehlt: ["2026-02"] });
  assert.ok(ohne.klaerung);
});

test("Fälligkeiten: Beginn = Inbetriebnahme, anteilig, vorschüssig, Reservierung davor", () => {
  const v = { id: "PT-1", vertragsdatum: "2025-03-01", beginn: "2026-07-15", laufzeitJahre: 30, faelligkeit: "jaehrlich", zahlweise: "vorschuessig", zahlungszielTage: 10, reservierungJahr: 2000, vorlaufTage: 14 };
  const f = faelligkeiten(v, { stichtag: "2026-09-30" });
  const res = f.filter((x) => x.phase === "reservierung");
  assert.equal(res.length, 2);
  assert.equal(res[0].von, "2025-03-01");
  assert.equal(res[1].bis, "2026-07-14");
  assert.equal(res[1].faelligAm, "2026-07-25"); // nachschüssig: Tag nach Ende + 10
  const p = f.find((x) => x.phase === "pacht");
  assert.equal(p.von, "2026-07-15");
  assert.equal(p.bis, "2026-12-31");
  assert.equal(p.faelligAm, "2026-07-25");
  assert.ok(Math.abs(p.faktorJahr - 170 / 365) < 1e-9);
  assert.equal(laufzeitEnde("2026-07-15", 30), "2056-07-14");
  const faellig = abzurechnen(v, "2026-09-30");
  assert.equal(faellig.length, 3);
  const naechste = naechsteFaelligkeit(v, "2026-09-30");
  assert.equal(naechste.von, "2027-01-01");
  assert.equal(perioden({ ab: "2026-02-10", bis: "2026-05-31", rhythmus: "quartalsweise", stopp: "2026-12-31" }).length, 2);
});

test("Contracting: Rechnung aus Monatswerten, fehlende Werte → Klärfall", () => {
  const messpunkte = [
    { id: "MP-E", art: "erzeugung", abrechnungsrelevant: true, zaehlernummer: "1ERZ", bezeichnung: "Erzeugung" },
    { id: "MP-Z", art: "zweirichtung", abrechnungsrelevant: true, zaehlernummer: "1ZR", bezeichnung: "Netz" },
    { id: "MP-M", art: "erzeugung", abrechnungsrelevant: false, zaehlernummer: "MON", bezeichnung: "Monitoring" },
  ];
  const zeilen = [
    { monat: "2026-08", messpunktId: "MP-E", register: "2.8.0", stand: 150000, menge: 50000, geprueft: true },
    { monat: "2026-08", messpunktId: "MP-Z", register: "2.8.0", stand: 30000, menge: 10000, geprueft: true },
    { monat: "2026-08", messpunktId: "MP-Z", register: "1.8.0", stand: 9000, menge: 3000, geprueft: true },
  ];
  const vertrag = { strompreisCt: 12, grundgebuehrMonat: 100, indexierungPct: 2, beginn: "2024-05-01" };
  const r = contractingAbrechnen({ vertrag, anlage: { kwp: 400 }, monat: "2026-08", messpunkte, zeilen });
  assert.equal(r.ok, true);
  assert.equal(r.gelieferteKwh, 40000);
  assert.equal(arbeitspreis(vertrag, "2026-08").ct, 12.485); // 2 volle Jahre +2 %
  assert.equal(r.netto, Math.round((40000 * 12.485 + 10000) ) / 100);
  assert.equal(r.zaehlerstaende.length, 2);
  const fehlt = contractingAbrechnen({ vertrag, anlage: { kwp: 400 }, monat: "2026-09", messpunkte, zeilen });
  assert.equal(fehlt.ok, false);
  assert.ok(fehlt.klaerung.some((k) => k.includes("fehlt")));
  const hoch = contractingAbrechnen({ vertrag, anlage: { kwp: 100 }, monat: "2026-08", messpunkte, zeilen });
  assert.equal(hoch.ok, false);
  const speicher = contractingAbrechnen({ vertrag: { strompreisCt: 0, grundgebuehrMonat: 2400 }, anlage: {}, monat: "2026-08", messpunkte: [], zeilen: [] });
  assert.equal(speicher.ok, true);
  assert.equal(speicher.netto, 2400);
  // Preisgleitung nach VPI (Basis: Jahr vor Beginn) und Strompreisindex (nicht hinterlegt → Klärfall)
  const vpiTab = [{ reihe: "VPI-DE-2020", jahr: 2023, wert: 100 }, { reihe: "VPI-DE-2020", jahr: 2024, wert: 102 }, { reihe: "VPI-DE-2020", jahr: 2025, wert: 105.06 }];
  const vpi = arbeitspreis({ strompreisCt: 12, beginn: "2024-05-01", indexBasis: "vpi" }, "2026-08", { indexTabelle: vpiTab, land: "DE" });
  assert.equal(vpi.ct, 12.607); // 12 × 1,02 × 1,03
  assert.equal(arbeitspreis({ strompreisCt: 12, beginn: "2024-05-01", indexBasis: "fest", indexierungPct: 3 }, "2026-08").ct, 12);
  const strom = contractingAbrechnen({ vertrag: { ...vertrag, indexBasis: "strompreis" }, anlage: { kwp: 400 }, monat: "2026-08", messpunkte, zeilen });
  assert.equal(strom.ok, false);
  const ertrag = ertragAusMonatswerten(zeilen, messpunkte, "2026-08-01", "2026-08-31");
  assert.equal(ertrag.kwh, 50000);
});

test("Provision, Zahlungsstatus und Mahnhinweis", () => {
  const pos = provisionPositionen({ satz: 0.025, kaufpreis: 912000, betrag: 22800, projektId: "P-26-XYZ" }, "Solarpark Nord");
  assert.equal(pos[0].betrag, 22800);
  assert.match(pos[0].text, /2,5 %/);
  assert.equal(zahlungsstatus({ status: "offen", faelligAm: "2026-09-01" }, "2026-09-30"), "ueberfaellig");
  assert.equal(zahlungsstatus({ status: "bezahlt", faelligAm: "2026-09-01" }, "2026-09-30"), "bezahlt");
  const m = mahnhinweis({ status: "offen", faelligAm: "2026-09-01" }, "2026-09-30");
  assert.equal(m.stufe, 2);
});

test("Steuervorlagen je Land und Vorgang", () => {
  assert.equal(steuerVorschlag("pacht", "DE").vorlage, "DE-Pacht-frei");
  assert.equal(steuerVorschlag("pacht", "AT", { option: true }).vorlage, "AT-Pacht-Option");
  assert.equal(steuerVorschlag("pacht", "DE", { kleinunternehmer: true }).vorlage, "DE-Kleinunternehmer");
  assert.equal(steuerVorschlag("contracting", "DE").vorlage, "DE-RC-13b");
  assert.equal(steuerVorschlag("provision", "DE").vorlage, "AT-RC-EU");
  assert.equal(steuerVorschlag("provision", "CH").vorlage, "AT-Drittland");
  assert.ok(steuerVorschlag("pacht", "AT").hinweise[0].includes("Steuerberatung"));
  const s = steuerBerechnen(1000, "AT-USt-20");
  assert.equal(s.betrag, 200);
  assert.equal(s.brutto, 1200);
  assert.equal(steuerBerechnen(1000, "DE-Pacht-frei").betrag, 0);
});

test("Pflichtangaben einer Gutschrift", () => {
  const fehlt = pflichtangabenPruefen({ art: "pacht", beleg: "gutschrift", titel: "Gutschrift", aussteller: { name: "A", anschrift: "B" }, empfaenger: { name: "C", anschrift: "D" }, nummer: "PG-1", rechnungsdatum: "2026-09-30", zeitraum: { von: "2026-01-01", bis: "2026-12-31" }, positionen: [{}], netto: 10, steuer: { vorlage: "DE-Pacht-frei", satz: 0, text: "steuerfrei" } });
  assert.deepEqual(fehlt, []);
  assert.ok(pflichtangabenPruefen({ beleg: "rechnung" }).length > 5);
});

test("IBAN, SEPA-Text und pain.001", () => {
  assert.equal(ibanPruefen("AT61 1904 3002 3457 3201"), true);
  assert.equal(ibanPruefen("DE89370400440532013000"), true);
  assert.equal(ibanPruefen("DE89370400440532013001"), false);
  assert.equal(ibanPruefen("AT6119043002345732"), false);
  const neu = ibanBauen("DE", "370400440532013099");
  assert.equal(ibanPruefen(neu), true);
  assert.equal(ibanMaskieren("AT611904300234573201"), "AT61 **** **** **** 3201");
  assert.equal(sepaText("Müller & Söhne – Pacht „2026“ 100 €"), "Mueller + Soehne - Pacht '2026' 100 EUR");
  const xml = pain001({
    nachrichtId: "ZL-26-ABC123", erstelltAm: "2026-09-30T08:00:00.000Z", ausfuehrungAm: "2026-10-02",
    auftraggeber: { name: "ÖkoInvest GmbH", iban: "AT611904300234573201", bic: "BKAUATWW" },
    zahlungen: [
      { endToEndId: "PG-2026-0001", betrag: 1234.5, name: "Hans Müller", iban: "DE89370400440532013000", verwendungszweck: "Gutschrift PG-2026-0001 Pacht 2026" },
      { endToEndId: "PG-2026-0002", betrag: 99.99, name: "Anna <Test>", iban: neu, bic: "COBADEFFXXX", verwendungszweck: "Gutschrift PG-2026-0002" },
    ],
  });
  assert.deepEqual(pain001Pruefen(xml), []);
  assert.match(xml, /<CtrlSum>1334.49<\/CtrlSum>/);
  assert.match(xml, /<NbOfTxs>2<\/NbOfTxs>/);
  assert.doesNotMatch(xml, /<Test>/);
  assert.throws(() => pain001({ nachrichtId: "X", ausfuehrungAm: "2026-10-02", auftraggeber: { name: "A", iban: "AT611904300234573201" }, zahlungen: [{ endToEndId: "1", betrag: 1, name: "B", iban: "DE00123" }] }));
  assert.ok(pain001Pruefen(xml.replace("<CtrlSum>1334.49</CtrlSum>", "<CtrlSum>1.00</CtrlSum>")).length > 0);
});

test("AfA-Plan und Projektcontrolling", () => {
  const at = afaPlan({ anschaffungswert: 100000, nutzungsdauerJahre: 20, inbetriebnahme: "2025-09-01", regel: "AT" });
  assert.equal(at[0].afa, 2500);
  assert.equal(at.length, 21);
  assert.equal(at.at(-1).restbuchwert, 0);
  const de = afaPlan({ anschaffungswert: 120000, nutzungsdauerJahre: 20, inbetriebnahme: "2025-10-15", regel: "DE" });
  assert.equal(de[0].afa, 1500); // 3/12 von 6000
  const b = budgetVergleich({ kosten: [{ kostenart: "planung", betrag: 60000 }, { kostenart: "netz", betrag: 30000 }], budget: 100000, mwp: 12 });
  assert.equal(b.ist, 90000);
  assert.equal(b.ampel, "gelb");
  assert.equal(b.jeMwp, 7500);
});

// Integration Pachtakte → Abrechnungslauf (gleiche Fälle in finanzen/test_logik.py)
test("Kündigung/Beendigung begrenzen die Gutschriften (anteilig im letzten Monat)", () => {
  const v = { id: "PT-T", vertragsdatum: "2023-06-01", beginn: "2024-01-01", laufzeitJahre: 20, faelligkeit: "monatlich", zahlweise: "nachschuessig", zahlungszielTage: 14, vorlaufTage: 14, status: "gekuendigt", kuendigungZum: "2026-06-15" };
  const f = faelligkeiten(v, { stichtag: "2026-12-31" });
  assert.equal(f.length, 30);
  assert.deepEqual([f.at(-1).von, f.at(-1).bis, f.at(-1).anteil, f.at(-1).erstellbarAb], ["2026-06-01", "2026-06-15", 0.5, "2026-06-16"]);
  assert.equal(vertragsEnde(v), "2026-06-15");
  assert.equal(vertragsEnde({ ...v, status: "beendet", beendetAm: "2026-05-10" }), "2026-05-10");
  assert.equal(vertragsEnde({ ...v, status: "aktiv" }), "2043-12-31"); // Kündigung erst mit Status „gekündigt“ wirksam
  const r = faelligkeiten({ id: "PT-R", vertragsdatum: "2023-06-01", beginn: "", reservierungJahr: 1200, faelligkeit: "jaehrlich", status: "gekuendigt", kuendigungZum: "2024-03-31" }, { stichtag: "2026-12-31" });
  assert.deepEqual(r.map((x) => [x.phase, x.von, x.bis]), [["reservierung", "2023-06-01", "2023-12-31"], ["reservierung", "2024-01-01", "2024-03-31"]]);
});

test("Zahlungsaufteilung: je Eigentümer eigener Beleg, centgenau", () => {
  const t = pachtAufteilen([{ art: "pacht", text: "Pacht 2026", menge: 1, preis: 1000.01, betrag: 1000.01 }, { art: "mindest", text: "Aufstockung", menge: 0.5, preis: 500.1, betrag: 250.05 }], [{ name: "A", email: "a@example.com", anteilProzent: 50 }, { name: "B", anteilProzent: 33.33 }, { name: "C", anteilProzent: 16.67 }]);
  assert.deepEqual(t.map((x) => [x.nr, x.netto, x.positionen.map((p) => p.betrag)]), [[1, 625.04, [500.01, 125.03]], [2, 416.64, [333.3, 83.34]], [3, 208.38, [166.7, 41.68]]]);
  assert.equal(t[1].positionen[0].text, "Pacht 2026 – Anteil 33,33 %");
  assert.equal(pachtAufteilen([{ betrag: 10, text: "x" }], [{ anteilProzent: 100 }]), null);
  assert.equal(aufteilungGilt({ empfaenger: [{}], ab: "2026-07-01" }, { bis: "2026-06-30" }), false);
  assert.equal(aufteilungGilt({ empfaenger: [{}], ab: "2026-07-01" }, { bis: "2026-07-31" }), true);
});

test("Kleinbetragsrechnung: Grenzen AT 400 € / DE 250 €, nicht bei Reverse Charge und Gutschrift", async () => {
  const { kleinbetragInfo } = await import("./steuer.js");
  const basis = (x = {}) => ({ beleg: "rechnung", art: "contracting", nummer: "CR-2026-00001", rechnungsdatum: "2026-09-30", positionen: [{}], zeitraum: { von: "2026-09-01", bis: "2026-09-30" }, ...x });
  // AT: 360 € brutto ohne Empfängerangaben und ohne UID des Ausstellers vollständig (§ 11 Abs. 6 UStG 1994)
  const at = basis({ aussteller: { name: "ÖkoInvest GmbH", anschrift: "Ostermiething", land: "AT" }, netto: 300, brutto: 360, steuer: { vorlage: "AT-USt-20", satz: 0.2, art: "ust", betrag: 60 } });
  assert.equal(kleinbetragInfo(at).kleinbetrag, true);
  assert.deepEqual(pflichtangabenPruefen(at), []);
  // AT über 400 € brutto: Empfängerangaben fehlen wieder
  const atGross = { ...at, netto: 400, brutto: 480, steuer: { ...at.steuer, betrag: 80 } };
  assert.equal(kleinbetragInfo(atGross).kleinbetrag, false);
  assert.ok(pflichtangabenPruefen(atGross).includes("Name des Leistungsempfängers"));
  // DE: 238 € brutto, auch ohne Leistungszeitraum vollständig (§ 33 UStDV)
  const de = basis({ aussteller: { name: "SPV GmbH", anschrift: "München", land: "DE" }, zeitraum: null, netto: 200, brutto: 238, steuer: { vorlage: "DE-USt-19", satz: 0.19, art: "ust", betrag: 38 } });
  assert.deepEqual(pflichtangabenPruefen(de), []);
  // DE über 250 €: keine Erleichterung
  assert.ok(pflichtangabenPruefen({ ...de, netto: 260, brutto: 309.4 }).includes("Leistungszeitraum"));
  // Reverse Charge: nie Kleinbetrag (§ 33 Satz 2 UStDV) – UID des Empfängers bleibt Pflicht
  const rc = basis({ aussteller: { name: "ÖkoInvest GmbH", anschrift: "Ostermiething", land: "DE", uid: "ATU76000505" }, netto: 100, brutto: 100, steuer: { vorlage: "DE-RC-13b", satz: 0, art: "reverse_charge", betrag: 0, text: "Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)." } });
  assert.equal(kleinbetragInfo(rc).kleinbetrag, false);
  assert.ok(pflichtangabenPruefen(rc).includes("UID des Leistungsempfängers (Reverse Charge)"));
  // Gutschrift: nie Kleinbetrag (Gutschriftsverfahren)
  assert.equal(kleinbetragInfo(basis({ beleg: "gutschrift", aussteller: { land: "AT" }, brutto: 100 })).kleinbetrag, false);
});

test("Demo-Beleg je Steuervorlage: Pflichtangaben vollständig, Steuer rechnet", async () => {
  const { STEUERVORLAGEN } = await import("./steuer.js");
  for (const [id, v] of Object.entries(STEUERVORLAGEN)) {
    const s = steuerBerechnen(1000, id);
    assert.equal(s.brutto, rundErwartet(1000, v.satz), id);
    assert.equal(s.betrag === 0 ? 0 : s.satz, s.betrag === 0 ? 0 : v.satz, id);
    const beleg = {
      beleg: "rechnung", art: "contracting", titel: "Rechnung", nummer: "CR-2026-00042", rechnungsdatum: "2026-09-30",
      zeitraum: { von: "2026-09-01", bis: "2026-09-30" }, positionen: [{ text: "Strom", menge: 1000, preis: 1, betrag: 1000 }],
      netto: s.netto, brutto: s.brutto, steuer: s,
      aussteller: { name: "ÖkoInvest GmbH", anschrift: "Gewerbegebiet 10, 5121 Ostermiething", land: v.land, uid: "ATU76000505" },
      empfaenger: { name: "Kunde GmbH", anschrift: "Musterweg 1", uid: "ATU00000000" },
    };
    assert.deepEqual(pflichtangabenPruefen(beleg), [], `Pflichtangaben ${id}`);
    // Steuerfreie/RC-Vorlagen tragen den Befreiungs- bzw. Übergangshinweis
    if (s.satz === 0) assert.ok(s.text.length > 0, `Hinweistext ${id}`);
  }
  function rundErwartet(netto, satz) {
    return Math.round((netto + netto * satz) * 100) / 100;
  }
});

test("CH-MWST 8,1 % centgenau", () => {
  const s = steuerBerechnen(1234.56, "CH-MWST-81");
  assert.equal(s.betrag, 100);
  assert.equal(s.brutto, 1334.56);
});
