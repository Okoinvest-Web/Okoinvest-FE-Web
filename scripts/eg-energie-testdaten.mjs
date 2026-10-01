// scripts/eg-energie-testdaten.mjs
//
// Erzeugt die gemeinsamen Testvektoren WP3 (Energiedaten) aus dem JS-Kern:
//   node scripts/eg-energie-testdaten.mjs            schreibt src/lib/plattform/eg/testdaten/energie/vektoren.json
//   node scripts/eg-energie-testdaten.mjs --pruefen  prüft nur, ob die Datei zum aktuellen JS-Kern passt (Exit 1 sonst)
// Der Python-Spiegel (plattform/eg_energie_kern.py) muss dieselben Ausgaben liefern: plattform/tests/test_eg_energie_kern.py.
// Handgeprüfte Prüfwerte (HA II 18:00–18:15 dynamisch, 14:30 statisch) stehen zusätzlich als feste Erwartung in den Vektoren.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lade = (p) => import(pathToFileURL(path.join(WURZEL, p)).href);
const ZIEL = path.join(WURZEL, "src/lib/plattform/eg/testdaten/energie/vektoren.json");

export async function vektorenErzeugen() {
  const M = await lade("src/lib/plattform/eg/messwerte.js");
  const V = await lade("src/lib/plattform/eg/verteilung.js");
  const Q = await lade("src/lib/plattform/eg/qualitaet.js");
  const S = await lade("src/lib/plattform/eg/simulation.js");
  const SP = await lade("src/lib/plattform/eg/speicher.js");
  const P = await lade("src/lib/plattform/eg/prognose.js");
  const O = await lade("src/lib/plattform/eg/optimierung.js");
  const z = M.zufall(4711);
  const reihe = (n, f) => Array.from({ length: n }, (_, i) => f(i));
  const fehlerVon = (fn) => {
    try {
      fn();
      return null;
    } catch (e) {
      return { status: e.status, feld: e.feld || "" };
    }
  };

  // ---- Zeit
  const tage = ["2026-01-15", "2026-03-29", "2026-03-30", "2026-06-01", "2026-10-25", "2026-10-26", "2024-02-29", "2027-03-28"];
  const zeit = {
    tage: tage.map((t) => ({ tag: t, werte: M.werteJeTag(t), beginnUtc: M.tagBeginnUtc(t), wochentag: M.wochentag(t), plus1: M.plusTag(t), viertelstunde10: M.viertelstundeLokal(t, 10) })),
    lokal: [Date.parse("2026-10-25T00:30:00Z"), Date.parse("2026-10-25T01:30:00Z"), Date.parse("2026-03-29T00:45:00Z"), Date.parse("2026-03-29T01:00:00Z"), Date.parse("2026-12-31T23:15:00Z")].map((ms) => ({ ms, lokal: M.lokalZeit(ms) })),
    nachUtc: [["2026-10-25", 2, 30, false], ["2026-10-25", 2, 30, true], ["2026-03-29", 2, 15, false], ["2026-07-01", 12, 0, false]].map(([t, h, m, zw]) => ({ tag: t, h, m, zweites: zw, ms: M.lokalNachUtc(t, h, m, zw) })),
    monate: [["2026-11", 3], ["2026-01", -1], ["2025-12", 13]].map(([m, n]) => ({ monat: m, n, plus: M.monatPlus(m, n), tage: M.tageImMonat(m) })),
    rund: [[1.0005, 3], [-2.345, 2], [2.675, 2], [0.1 + 0.2, 1], [12.5, 0]].map(([x, s]) => ({ x, s, r: M.rund(x, s) })),
    zahlen: ["1.234,56", "1234,5", "1234.5", "1,234.5", " 7 ", "", "abc"].map((s) => ({ s, x: M.zahlLesen(s) })),
  };

  // ---- Verteilung
  const haDyn = { erzeuger: [{ id: "E", werte: [0.5] }], verbraucher: [{ id: "V1", werte: [0.25] }, { id: "V2", werte: [0.8] }] };
  const haSta = { modell: "statisch", erzeuger: [{ id: "E", werte: [1.9] }], verbraucher: [{ id: "V1", werte: [0.5], schluesselPct: 40 }, { id: "V2", werte: [0.8], schluesselPct: 90 }] };
  const gross = {
    erzeuger: [0, 1, 2].map((j) => ({ id: `E${j}`, tf: [100, 60, 35][j], werte: reihe(96, (q) => Math.max(0, Math.sin(((q - 24) / 48) * Math.PI)) * (2 + j) * (0.6 + 0.4 * z())) })),
    verbraucher: [0, 1, 2, 3].map((i) => ({ id: `V${i}`, tf: [100, 50, 100, 80][i], schluesselPct: [20, 30, 25, 15][i], werte: reihe(96, () => 0.1 + z() * 0.6) })),
  };
  const kurz = (r) => ({ verbraucher: r.verbraucher.map((v) => ({ id: v.id, verbrauchTf: v.verbrauchTf, anteil: v.anteil, eigendeckung: v.eigendeckung })), erzeuger: r.erzeuger, summe: r.summe, normierung: r.normierung });
  const verteilung = {
    haDynamisch: { eingabe: haDyn, erwartet: { A1: 0.5 * 0.25 / 1.05, A2: 0.5 * 0.8 / 1.05, ED1: 0.119, ED2: 0.381, R: 0 }, aus: kurz(V.verteilen(haDyn)) },
    haStatisch: { eingabe: haSta, erwartet: { sStern1: 40 / 130, sStern2: 90 / 130, A1: 0.585, A2: 1.315, ED1: 0.5, ED2: 0.8, R: 0.6 }, aus: kurz(V.verteilen(haSta)) },
    dynamisch: { eingabe: gross, aus: kurz(V.verteilen(gross)), kennzahlen: V.verteilungKennzahlen(V.verteilen(gross)), bilanz: V.bilanzPruefen(V.verteilen(gross)) },
    statisch: { eingabe: { ...gross, modell: "statisch" }, aus: kurz(V.verteilen({ ...gross, modell: "statisch" })), kennzahlen: V.verteilungKennzahlen(V.verteilen({ ...gross, modell: "statisch" })) },
    tfPruefen: [[60, 40], [60, 50], [1, 1, 1, 1, 1, 1], [0], [50.5]].map((t) => ({ tfs: t, aus: V.tfPruefen(t) })),
    mehrfach: { werte: [1, 2, null, 4], teilnahmen: [{ gemeinschaftId: "A", tf: 60 }, { gemeinschaftId: "B", tf: 25 }], aus: V.mehrfachAufteilen([1, 2, null, 4], [{ gemeinschaftId: "A", tf: 60 }, { gemeinschaftId: "B", tf: 25 }]) },
    nbAbgleich: { posten: [{ zaehlpunktId: "Z1", eigenKwh: 100, nbKwh: 100.3 }, { zaehlpunktId: "Z2", eigenKwh: 100, nbKwh: 95 }, { zaehlpunktId: "Z3", eigenKwh: 0.05, nbKwh: 0 }, { zaehlpunktId: "Z4", eigenKwh: 3, nbKwh: 0 }] },
    sozial: null,
  };
  verteilung.nbAbgleich.aus = V.nbAbgleich(verteilung.nbAbgleich.posten, { toleranzPct: 0.5, toleranzKwh: 0.1 });
  const zd = V.verteilen(gross);
  const sozE = zd.erzeuger.map((e, j) => ({ id: e.id, erzeugungTf: e.erzeugungTf, eingebracht: e.eingebracht, gemeinde: j === 1 }));
  const sozV = zd.verbraucher.map((v, i) => ({ id: v.id, eigendeckung: v.eigendeckung, schutzbeduerftig: i === 1 }));
  verteilung.sozial = { eingabe: { verbraucher: sozV, erzeuger: sozE }, aus: V.sozialquote({ verbraucher: sozV, erzeuger: sozE }), ohne: V.sozialquote({ verbraucher: sozV, erzeuger: sozE.map((e) => ({ ...e, gemeinde: false })) }) };

  // ---- Blöcke
  const b1 = M.blockBereinigen({ zaehlpunktId: "Z", gemeinschaftId: "G", tag: "2026-06-01", groesse: "eigendeckung", werte: reihe(96, (i) => (i % 10 === 0 ? null : i / 100)), qualitaet: reihe(96, (i) => (i < 4 ? "L3" : i < 8 ? "L2" : "L1")), quelle: { art: "eda", nachrichtId: "EDN-1" }, empfangenAm: "2026-06-02T08:00:00.000Z" });
  const neu = M.blockBereinigen({ zaehlpunktId: "Z", gemeinschaftId: "G", tag: "2026-06-01", groesse: "eigendeckung", werte: reihe(96, (i) => (i < 12 ? 0.5 : null)), qualitaet: reihe(96, (i) => (i < 2 ? "L1" : i < 6 ? "L3" : "L1")), quelle: { art: "eda", nachrichtId: "EDN-2" }, empfangenAm: "2026-06-05T08:00:00.000Z" });
  const zus = M.bloeckeZusammenfuehren(b1, neu, { am: "2026-06-05T08:00:00.000Z" });
  const payload = { gemeinschaftId: "G", zaehlpunktnummer: "AT0030000491000000000000000000001", nachrichtId: "EDN-9", messageId: "M-9", von: "2026-10-24T22:00:00.000Z", bis: "", reihen: [{ groesse: "verbrauch_gemessen", werte: reihe(110, (i) => (i % 7) / 10), qualitaet: reihe(110, (i) => (i > 100 ? "L2" : "L1")) }] };
  const zerlegt = M.payloadZerlegen(payload, { zaehlpunktId: "Z", gemeinschaftId: "G", am: "x" });
  const ohneK = (b) => ({ tag: b.tag, groesse: b.groesse, werte: b.werte, qualitaet: b.qualitaet, summeKwh: b.summeKwh, ist: b.ist, fehlend: b.fehlend, l3: b.l3, l2: b.l2, vollstaendig: b.vollstaendig, abrechenbar: b.abrechenbar, version: b.version, beginnUtc: b.beginnUtc });
  const monatsBl = ["2026-10-24", "2026-10-25", "2026-10-26"].map((t) => M.blockBereinigen({ zaehlpunktId: "Z", gemeinschaftId: "G", tag: t, groesse: "verbrauch_gemessen", werte: reihe(M.werteJeTag(t), (i) => 0.25 + (i % 4) * 0.01), qualitaet: [] }));
  const bloecke = {
    eingabe: { b1: { werte: b1.werte, qualitaet: b1.qualitaet }, neu: { werte: neu.werte, qualitaet: neu.qualitaet } },
    b1: ohneK(b1), zusammen: { block: ohneK(zus.block), geaendert: zus.geaendert, konflikte: zus.konflikte, historie: zus.block.historie.length },
    payload, zerlegt: zerlegt.map(ohneK),
    monatsEingabe: monatsBl.map((b) => ({ tag: b.tag, werte: b.werte })),
    monatswerte: M.monatswerte(monatsBl), perioden: M.periodenSummen(monatsBl, { von: "2026-10-24", bis: "2026-10-26" }),
    periodenFenster: M.periodenSummen(monatsBl, { von: "2026-10-24", bis: "2026-10-26", preisFenster: (lok) => (lok.slice(11, 13) >= "11" && lok.slice(11, 13) < "15" ? "Z1" : "") }),
    fehler: [
      { d: { tag: "2026-13-01", groesse: "eigendeckung", werte: [] }, aus: fehlerVon(() => M.blockBereinigen({ tag: "2026-13-01", groesse: "eigendeckung", werte: [] })) },
      { d: { tag: "2026-06-01", groesse: "eigendeckung", werte: [1, 2] }, aus: fehlerVon(() => M.blockBereinigen({ tag: "2026-06-01", groesse: "eigendeckung", werte: [1, 2] })) },
      { d: { tag: "2026-06-01", groesse: "x", werte: [] }, aus: fehlerVon(() => M.blockBereinigen({ tag: "2026-06-01", groesse: "x", werte: [] })) },
    ],
  };

  // ---- CSV
  const zp = "AT0030000491000000000000000000001";
  const csv1 = ["Zählpunkt: " + zp, "Zeitraum: 25.10.2026", "", "Datum;Zeit von;Zeit bis;Verbrauch (kWh);Eigendeckung (kWh);Status", ...reihe(100, (i) => {
    const ms = Date.parse("2026-10-24T22:00:00Z") + i * 900000;
    const l = M.lokalZeit(ms);
    const e = M.lokalZeit(ms + 900000);
    return `${l.slice(8, 10)}.${l.slice(5, 7)}.${l.slice(0, 4)};${l.slice(11)};${e.slice(11)};${(0.2 + (i % 5) * 0.05).toFixed(3).replace(".", ",")};${(0.05 + (i % 3) * 0.02).toFixed(3).replace(".", ",")};${i === 50 ? "Ersatzwert" : i === 51 ? "vorläufig" : "Messwert"}`;
  })].join("\r\n");
  const csv2 = ["Datum\tUhrzeit\tEinspeisung kW\tRestüberschuss kW", ...reihe(96, (i) => `2026-06-01\t${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}\t${(Math.max(0, Math.sin(((i - 24) / 48) * Math.PI)) * 8).toFixed(2)}\t${(Math.max(0, Math.sin(((i - 24) / 48) * Math.PI)) * 3).toFixed(2)}`)].join("\n");
  const csv3 = ["Zeitstempel bis;Wert kWh", ...reihe(8, (i) => `${new Date(Date.parse("2026-07-01T00:15:00Z") + i * 900000).toISOString()};${i * 0.1}`), "kaputt;1", "2026-07-01T05:07:00Z;1"].join("\n");
  const csvFehler = ["Spalte A;Spalte B", "1;2"].join("\n");
  const csvZusammen = (t, opt) => {
    const e = M.csvParsen(t, opt);
    return { parse: { ...e, reihen: e.reihen.map((r) => ({ ...r, punkte: r.punkte.length, summe: r.punkte.reduce((s, p) => s + p.wert, 0), l2: r.punkte.filter((p) => p.qualitaet === "L2").length, l3: r.punkte.filter((p) => p.qualitaet === "L3").length, erste: r.punkte[0] })) }, bloecke: M.csvZuBloecken(e, { zaehlpunktId: "Z", gemeinschaftId: "G" }).map(ohneK) };
  };
  const csv = { faelle: [{ text: csv1, aus: csvZusammen(csv1) }, { text: csv2, opt: { zaehlpunktnummer: zp }, aus: csvZusammen(csv2, { zaehlpunktnummer: zp }) }, { text: csv3, aus: csvZusammen(csv3) }], fehler: { text: csvFehler, aus: fehlerVon(() => M.csvParsen(csvFehler)) } };

  // ---- Qualität
  const blk = (tag, groesse, werte, q = [], empf = "") => M.blockBereinigen({ tag, groesse, werte, qualitaet: q, empfangenAm: empf });
  const tagQ = "2026-09-10";
  const n96 = 96;
  const ampelFaelle = [
    { name: "ok", bloecke: { verbrauch_gemessen: blk(tagQ, "verbrauch_gemessen", reihe(n96, () => 0.3), [], "2026-09-11"), verbrauch_tf: blk(tagQ, "verbrauch_tf", reihe(n96, () => 0.3), [], "2026-09-11"), anteil_erzeugung: blk(tagQ, "anteil_erzeugung", reihe(n96, () => 0.2), [], "2026-09-11"), eigendeckung: blk(tagQ, "eigendeckung", reihe(n96, () => 0.2), [], "2026-09-11") }, heute: "2026-10-01" },
    { name: "l3", bloecke: { eigendeckung: blk(tagQ, "eigendeckung", reihe(n96, () => 0.2), reihe(n96, (i) => (i < 10 ? "L3" : "L1")), "2026-09-11") }, heute: "2026-10-01" },
    { name: "l3alt", bloecke: { eigendeckung: blk(tagQ, "eigendeckung", reihe(n96, () => 0.2), reihe(n96, (i) => (i < 10 ? "L3" : "L1")), "2026-09-11") }, heute: "2026-12-01" },
    { name: "l3beg", modell: "beg", bloecke: { eigendeckung: blk(tagQ, "eigendeckung", reihe(n96, () => 0.2), reihe(n96, (i) => (i < 10 ? "L3" : "L1")), "2026-09-11") }, heute: "2026-10-01" },
    { name: "spaet", bloecke: { eigendeckung: blk(tagQ, "eigendeckung", reihe(n96, () => 0.2), [], "2026-09-17") }, heute: "2026-10-01" },
    { name: "luecke", bloecke: { eigendeckung: blk(tagQ, "eigendeckung", reihe(n96, (i) => (i > 40 && i < 45 ? null : 0.2)), [], "2026-09-11") }, heute: "2026-10-01" },
    { name: "fehlt", bloecke: {}, heute: "2026-10-01" },
    { name: "erwartet", bloecke: {}, heute: "2026-09-11" },
    { name: "unplausibel", bloecke: { verbrauch_tf: blk(tagQ, "verbrauch_tf", reihe(n96, () => 0.1), [], "2026-09-11"), eigendeckung: blk(tagQ, "eigendeckung", reihe(n96, (i) => (i < 3 ? 0.5 : 0.05)), [], "2026-09-11") }, heute: "2026-10-01" },
    { name: "sprung", maxKw: 1, bloecke: { eigendeckung: blk(tagQ, "eigendeckung", reihe(n96, (i) => (i === 5 ? 2 : 0.1)), [], "2026-09-11") }, heute: "2026-10-01" },
  ].map((f) => {
    const erwartet = f.name === "ok" ? ["verbrauch_gemessen", "verbrauch_tf", "anteil_erzeugung", "eigendeckung"] : f.name === "unplausibel" ? ["verbrauch_tf", "eigendeckung"] : ["eigendeckung"];
    return { name: f.name, eingabe: { tag: tagQ, heute: f.heute, modell: f.modell || "eeg", maxKw: f.maxKw || null, erwartet, bloecke: Object.fromEntries(Object.entries(f.bloecke).map(([g, b]) => [g, { werte: b.werte, qualitaet: b.qualitaet, empfangenAm: b.empfangenAm }])) }, aus: Q.tagesAmpel({ tag: tagQ, bloecke: f.bloecke, erwartet, heute: f.heute, modell: f.modell || "eeg", maxKw: f.maxKw || null }) };
  });
  const ersatz = { werte: [1, null, null, 4, null, null, null, null, null, null, null, null, null, null, 2, null], vergleich: reihe(16, (i) => i / 10) };
  ersatz.aus = Q.ersatzwerte(ersatz.werte, { vergleich: ersatz.vergleich, maxInterpolation: 8 });
  ersatz.ohne = Q.ersatzwerte([null, null, 3], {});
  const rekZeilen = [{ zaehlpunktId: "Z1", tage: [{ tag: "2026-09-01", ampel: "ok", gruende: [] }, { tag: "2026-09-02", ampel: "fehler", gruende: ["Keine Daten geliefert"] }, { tag: "2026-09-03", ampel: "fehler", gruende: ["4 Viertelstunden fehlen"] }, { tag: "2026-09-04", ampel: "warn", gruende: ["x"] }, { tag: "2026-09-05", ampel: "fehler", gruende: ["Eigendeckung über Verbrauch × Teilnahmefaktor: 3 Viertelstunden"] }] }];
  const lief = [{ netzbetreiberId: "A", tag: "2026-09-01", empfangenAm: "2026-09-02T05:00:00Z" }, { netzbetreiberId: "A", tag: "2026-09-02", empfangenAm: "2026-09-08" }, { netzbetreiberId: "A", tag: "2026-09-03", empfangenAm: "2026-09-04" }, { netzbetreiberId: "B", tag: "2026-09-01", empfangenAm: "2026-09-03" }, { netzbetreiberId: "B", tag: "2026-09-02", empfangenAm: "" }];
  const gp = { ed: [[0.1, 0.5, 0.2], [0.2, 0.1]], e: [[0.3, 0.3, 0.3]] };
  const qualitaet = {
    ampel: ampelFaelle, ersatz,
    reklamation: { zeilen: rekZeilen, heute: "2026-10-01", aus: Q.reklamationsFaelle(rekZeilen, { heute: "2026-10-01" }) },
    lieferung: { eingabe: lief, aus: Q.lieferstatistik(lief) },
    zusammenfassung: { eingabe: rekZeilen, aus: Q.qualitaetsZusammenfassung(rekZeilen) },
    gemeinschaft: { ...gp, aus: Q.gemeinschaftPruefen(gp.ed, gp.e) },
    text: { eingabe: { zaehlpunktnummer: zp, netzbetreiber: "Netz OÖ", gemeinschaft: "Test", gemeinschaftsId: "AT1", von: "2026-09-01", bis: "2026-09-03", gruende: ["Keine Daten geliefert"] }, aus: Q.reklamationsText({ zaehlpunktnummer: zp, netzbetreiber: "Netz OÖ", gemeinschaft: "Test", gemeinschaftsId: "AT1", von: "2026-09-01", bis: "2026-09-03", gruende: ["Keine Daten geliefert"] }) },
  };

  // ---- Simulation
  const simE = {
    titel: "Testvektor", jahr: 2025, modell: "eeg", standort: { lat: 48.2, lon: 13.5 }, saat: 99,
    teilnehmer: [{ id: "H1", name: "Haushalt", art: "privat", jahresverbrauchKwh: 4000, waermepumpeKwh: 2500, eautoKwh: 1500, pvKwp: 8, tf: 100, schutzbeduerftig: true }, { id: "G1", art: "kmu", jahresverbrauchKwh: 30000, tf: 80 }, { id: "L1", art: "landwirt", profil: "L0", jahresverbrauchKwh: 12000, anzahl: 2 }, { id: "B1", art: "gemeinde", profil: "BAND", jahresverbrauchKwh: 20000 }],
    anlagen: [{ id: "A1", kwp: 60, ausrichtung: -20, neigung: 20, gemeinde: true }, { id: "A2", kwp: 25, ausrichtung: 90, neigung: 10, tf: 70 }],
    speicher: { kapazitaetKwh: 40, leistungKw: 20, wirkungsgradPct: 88 },
    preise: { lieferantCt: 13, mitgliedsbeitragEur: 12 },
    netz: { reduktionPct: 57, abgabenBefreit: true },
    varianten: [{ id: "z3", label: "lokal", reduktionPct: 57, abgabenBefreit: true }, { id: "z6", label: "BEG", reduktionPct: 0, abgabenBefreit: false }],
    sensitivitaet: { haushalte: [5] },
  };
  const simStat = { ...simE, verteilmodell: "statisch", speicher: null, sensitivitaet: {}, teilnehmer: simE.teilnehmer.map((t, i) => ({ ...t, schluesselPct: [30, 40, 20, 25][i] })) };
  const simAus = (e) => {
    const r = S.simulationRechnen(e);
    return { kennzahlen: r.kennzahlen, monate: r.monate, teilnehmer: r.teilnehmer, anlagen: r.anlagen, varianten: r.varianten, sensitivitaet: r.sensitivitaet, speicher: r.speicher, hinweise: r.hinweise, typischerTagJuli: r.typischerTag.juli };
  };
  const lp = S.lastprofil("H0", 2025);
  const simulation = {
    profile: ["H0", "G0", "G1", "L0", "BAND", "WP", "EAUTO"].map((p) => {
      const x = S.lastprofil(p, 2025);
      return { profil: p, laenge: x.length, summe: x.reduce((a, b) => a + b, 0), proben: [0, 100, 5000, 17000, 30000, 35039].map((i) => x[i]) };
    }),
    pvKlar: [[172, 12.5, {}], [355, 12, { ausrichtung: 90, neigung: 45 }], [80, 6, {}], [200, 23, {}]].map(([d, h, o]) => ({ d, h, o, w: S.pvKlarhimmel(d, h, o) })),
    pvJahr: (() => {
      const x = S.pvJahr({ jahr: 2025, lat: 48.2, lon: 13.5, ausrichtung: 30, neigung: 25, saat: 5 });
      return { summe: x.reduce((a, b) => a + b, 0), proben: [16800, 16848, 20000, 33000].map((i) => x[i]), faktor: S.ausrichtungsFaktor({ lat: 48.2, lon: 13.5, ausrichtung: 30, neigung: 25 }) };
    })(),
    h0Summe: lp.reduce((a, b) => a + b, 0),
    dynamisch: { eingabe: simE, aus: simAus(simE) },
    statisch: { eingabe: simStat, aus: simAus(simStat) },
    oeffentlich: { eingabe: { teilnehmer: [{ name: "Geheim", jahresverbrauchKwh: 3000 }], anlagen: [{ name: "Dach", kwp: 10 }] }, aus: (() => {
      const r = S.simulationOeffentlich({ teilnehmer: [{ name: "Geheim", jahresverbrauchKwh: 3000 }], anlagen: [{ name: "Dach", kwp: 10 }] });
      return { kennzahlen: r.kennzahlen, namen: r.teilnehmer.map((t) => t.name), anlagen: r.anlagen.map((a) => a.name), hatEingabe: r.eingabe !== undefined };
    })() },
    fehler: [{ d: { teilnehmer: [] } }, { d: { teilnehmer: [{}], anlagen: [] } }, { d: { teilnehmer: [{ profil: "lastgang", lastgang: [1, 2] }], anlagen: [{ kwp: 5 }] } }].map((f) => ({ ...f, aus: fehlerVon(() => S.simulationRechnen(f.d)) })),
    apReduziert: [[6.98, 57], [8.79, 28], [4.96, 64], [7, 0]].map(([a, p]) => ({ a, p, r: S.apReduziert(a, p) })),
  };

  // ---- Speicher
  const spE = reihe(96 * 3, (q) => Math.max(0, Math.sin((((q % 96) - 24) / 48) * Math.PI)) * 30 * (0.5 + z()));
  const spV = reihe(96 * 3, () => 3 + z() * 4);
  const speicher = {
    erzeugung: spE, verbrauch: spV,
    bilanz: (() => {
      const b = SP.speicherBilanz({ erzeugung: spE, verbrauch: spV }, { kapazitaetKwh: 50, leistungKw: 25, wirkungsgradPct: 90, socStartPct: 20 });
      delete b.verlauf;
      return b;
    })(),
    empfehlung: SP.speicherEmpfehlung({ erzeugung: spE, verbrauch: spV }, { groessen: [10, 50, 100] }),
    fehler: fehlerVon(() => SP.speicherBilanz({ erzeugung: [], verbrauch: [] }, { kapazitaetKwh: 0 })),
  };

  // ---- Prognose
  const hist = reihe(35, (d) => {
    const tag = M.plusTag("2026-09-01", d);
    const w = 0.4 + z() * 0.6;
    return { tag, erzeugung: reihe(96, (q) => Math.max(0, Math.sin(((q - 26) / 44) * Math.PI)) * 12 * w), verbrauch: reihe(96, (q) => 4 + 2 * Math.sin((q / 96) * 2 * Math.PI) + (M.wochentag(tag) >= 5 ? 1 : 0)) };
  });
  const progE = { heute: "2026-10-06", historie: hist, anlagen: [{ kwp: 80, ausrichtung: 0, neigung: 30 }, { kwp: 20, ausrichtung: -90, neigung: 15 }], standort: { lat: 48.2, lon: 13.5 }, tage: 7, wetter: [{ tag: "2026-10-08", faktor: 0.2 }] };
  const prognoseV = { eingabe: progE, aus: P.prognose(progE) };

  // ---- Optimierung
  const optW = reihe(96 * 4, (q) => Math.max(0, Math.sin((((q % 96) - 24) / 48) * Math.PI)) * 6);
  const kand = [
    { gemeinschaftId: "EEG", label: "EEG lokal", vorteilCtKwh: 4, aktuellTf: 60, erzeugung: reihe(96 * 4, (q) => Math.max(0, Math.sin((((q % 96) - 24) / 48) * Math.PI)) * 10), verbrauch: reihe(96 * 4, () => 5) },
    { gemeinschaftId: "BEG", label: "BEG", vorteilCtKwh: 3, aktuellTf: 40, erzeugung: reihe(96 * 4, () => 0), verbrauch: reihe(96 * 4, () => 20) },
    { gemeinschaftId: "P2P", label: "P2P", vorteilCtKwh: 6, aktuellTf: 0, erzeugung: reihe(96 * 4, () => 0), verbrauch: reihe(96 * 4, () => 0.5) },
  ];
  const optVerbr = { richtung: "verbrauch", werte: reihe(96 * 4, () => 1), kandidaten: [{ gemeinschaftId: "A", vorteilCtKwh: 5, erzeugung: reihe(96 * 4, (q) => (q % 96 > 40 && q % 96 < 60 ? 30 : 0)), verbrauch: reihe(96 * 4, () => 10), aktuellTf: 100 }, { gemeinschaftId: "B", vorteilCtKwh: 2, erzeugung: reihe(96 * 4, () => 3), verbrauch: reihe(96 * 4, () => 1), aktuellTf: 0 }], hochrechnung: 365 / 4 };
  const optimierung = {
    erzeugung: { eingabe: { richtung: "erzeugung", werte: optW, kandidaten: kand, hochrechnung: 365 / 4 }, aus: O.tfOptimieren({ richtung: "erzeugung", werte: optW, kandidaten: kand, hochrechnung: 365 / 4 }) },
    verbrauch: { eingabe: optVerbr, aus: O.tfOptimieren(optVerbr) },
    stichprobe: (() => {
      const t = [];
      for (let d = "2025-10-01"; d < "2026-10-01"; d = M.plusTag(d)) t.push(d);
      const r = O.repraesentativeTage(t);
      return { anzahl: r.tage.length, erste: r.tage.slice(0, 3), hochrechnung: r.hochrechnung };
    })(),
    fehler: fehlerVon(() => O.tfOptimieren({ richtung: "verbrauch", werte: [], kandidaten: [] })),
    // Integration: Datenbasis je Kandidat (Entwurf in Gemeinschaft ohne Messwerte → Schätzung statt Nullkurve)
    kandidaten: (() => {
      const null4 = { erzeugung: reihe(8, () => 0), verbrauch: reihe(8, () => 0) };
      const mess = { erzeugung: reihe(8, (q) => q), verbrauch: reihe(8, () => 2) };
      const sch = { erzeugung: reihe(8, () => 0), verbrauch: reihe(8, () => 50) };
      const faelle = [
        { gemeinschaftId: "EEG", label: "EEG", vorteilCtKwh: 3.5, aktuellTf: 60, status: "aktiv", messung: mess, schaetzung: sch },
        { gemeinschaftId: "BEG", label: "BEG", vorteilCtKwh: 3, aktuellTf: 40, status: "entwurf", messung: null4, schaetzung: sch },
        { gemeinschaftId: "GEA", label: "GEA", vorteilCtKwh: 2, aktuellTf: 10, status: "angefragt", messung: null, schaetzung: null },
      ];
      const kand = faelle.map((k) => O.optimierungsKandidat(k));
      const werte = reihe(8, () => 4);
      const erg = O.tfOptimieren({ richtung: "erzeugung", werte, kandidaten: kand, hochrechnung: 365 });
      const teilnahmen = ["entwurf", "angefragt", "aktiv", "verworfen", "abgelehnt", "abgelaufen", "beendet", "abmeldung_angefragt"].map((status, i) => ({ id: `T${i}`, status }));
      return { faelle, aus: kand, werte, erg, hinweise: O.optimierungsHinweise(kand, erg.empfehlung), teilnahmen, teilnahmenAus: O.optimierungsTeilnahmen(teilnahmen).map((t) => t.id) };
    })(),
  };

  return { stand: "2026-10-01", quelle: "scripts/eg-energie-testdaten.mjs", zeit, verteilung, bloecke, csv, qualitaet, simulation, speicher, prognose: prognoseV, optimierung };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const v = await vektorenErzeugen();
  const text = `${JSON.stringify(v)}\n`;
  if (process.argv.includes("--pruefen")) {
    const alt = fs.existsSync(ZIEL) ? fs.readFileSync(ZIEL, "utf8") : "";
    if (alt !== text) {
      console.error("Testvektoren veraltet – bitte node scripts/eg-energie-testdaten.mjs ausführen.");
      process.exit(1);
    }
    console.log("Testvektoren aktuell.");
  } else {
    fs.mkdirSync(path.dirname(ZIEL), { recursive: true });
    fs.writeFileSync(ZIEL, text);
    console.log(`geschrieben: ${path.relative(WURZEL, ZIEL)} (${Math.round(text.length / 1024)} KB)`);
  }
}
