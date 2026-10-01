// scripts/plattform-test-eg-energie.mjs
//
// WP3 „Energiedaten, Verteilung, Simulation und Prognose“:
//   node scripts/plattform-test-eg-energie.mjs --nur-logik    Teil A: reine Logik, Testvektoren, Demo-Daten, Gleichheit JS/Python
//   node scripts/plattform-test-eg-energie.mjs [basis-url]     Teil A + B gegen den laufenden Dev-Server (Demo-Backend)
//
// Teil A: HA-II-Prüfwerte (dynamisch 18:00–18:15, statisch 14:30), Mehrfachteilnahme, Tagesblöcke mit Zeitumstellung,
//         Nachlieferung/Historie, EDA-Payload, CSV-/Excel-Import, Datenqualität (Ampel, L3-Fristen, Reklamation, Lieferstatistik),
//         Abweichungsbericht, Sozialquote, Simulation (Bilanz, Varianten, öffentlicher Kern), Speicher-Bilanz, Prognose,
//         TF-Optimierer (exakte DP), synthetische Demo-Daten (13 Monate, Qualitätsfälle), Testvektoren aktuell, Python-Gleichheit.
// Teil B: Backoffice-Dashboard, Qualität, Abweichung, Prognose, Periodenwerte, CSV-Vorschau/Import, Reklamation,
//         Simulation (Vorlage, Rechnen, Speichern, Liste), Optimierer, Rechte (Organe, Mitglied, fremde Konten), Seiten 200.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lade = (p) => import(pathToFileURL(path.join(WURZEL, p)).href);
const NUR_LOGIK = process.argv.includes("--nur-logik");
const BASIS = (process.argv.slice(2).find((a) => !a.startsWith("--")) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";

let ok = 0;
let fehler = 0;
const gruen = (s) => `\x1b[32m${s}\x1b[0m`;
const rot = (s) => `\x1b[31m${s}\x1b[0m`;
function pruefe(bedingung, text, details) {
  if (bedingung) {
    ok++;
    console.log(`  ${gruen("✓")} ${text}`);
  } else {
    fehler++;
    console.log(`  ${rot("✗")} ${text}${details !== undefined ? ` – ${JSON.stringify(details).slice(0, 600)}` : ""}`);
  }
  return bedingung;
}
const abschnitt = (t) => console.log(`\n${t}`);
const nahe = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const wirft = (fn) => {
  try {
    fn();
    return null;
  } catch (e) {
    return e;
  }
};

// ================================================================ Teil A – Logik

async function teilA() {
  const M = await lade("src/lib/plattform/eg/messwerte.js");
  const V = await lade("src/lib/plattform/eg/verteilung.js");
  const Q = await lade("src/lib/plattform/eg/qualitaet.js");
  const S = await lade("src/lib/plattform/eg/simulation.js");
  const SP = await lade("src/lib/plattform/eg/speicher.js");
  const P = await lade("src/lib/plattform/eg/prognose.js");
  const O = await lade("src/lib/plattform/eg/optimierung.js");
  const reihe = (n, f) => Array.from({ length: n }, (_, i) => f(i));

  abschnitt("A1. Zuteilung – Prüfwerte Handlungsanweisung II");
  const d = V.verteilen({ erzeuger: [{ id: "E", werte: [0.5] }], verbraucher: [{ id: "V1", werte: [0.25] }, { id: "V2", werte: [0.8] }] });
  pruefe(M.rund(d.verbraucher[0].anteil[0], 3) === 0.119 && M.rund(d.verbraucher[1].anteil[0], 3) === 0.381, "Dynamisch 18:00–18:15: A₁ = 0,119, A₂ = 0,381 (HA II zeigt 0,12/0,38)", d.verbraucher.map((v) => v.anteil[0]));
  pruefe(nahe(d.verbraucher[0].eigendeckung[0] + d.verbraucher[1].eigendeckung[0], 0.5) && d.summe.restueberschuss[0] === 0, "Dynamisch: ED = A (E' < V'), Restüberschuss 0, ohne Iteration");
  const s = V.verteilen({ modell: "statisch", erzeuger: [{ id: "E", werte: [1.9] }], verbraucher: [{ id: "V1", werte: [0.5], schluesselPct: 40 }, { id: "V2", werte: [0.8], schluesselPct: 90 }] });
  pruefe(s.normierung === 130 && M.rund(s.verbraucher[0].anteil[0], 3) === 0.585 && M.rund(s.verbraucher[1].anteil[0], 3) === 1.315, "Statisch 14:30: Σs = 130 % → s* = 30,77/69,23 %, A = 0,585/1,315");
  pruefe(s.verbraucher[0].eigendeckung[0] === 0.5 && s.verbraucher[1].eigendeckung[0] === 0.8 && nahe(s.summe.restueberschuss[0], 0.6), "Statisch: ED = 0,50/0,80, R = 0,60 (nicht genutzte Anteile werden nicht umverteilt)");
  const s2 = V.verteilen({ modell: "statisch", erzeuger: [{ id: "E", werte: [1] }], verbraucher: [{ id: "V1", werte: [1], schluesselPct: 30 }, { id: "V2", werte: [1], schluesselPct: 30 }] });
  pruefe(nahe(s2.verbraucher[0].eigendeckung[0], 0.3) && nahe(s2.summe.restueberschuss[0], 0.4), "Statisch Σs < 100 %: keine Normierung, Rest gilt als Überschuss");
  const tf = V.verteilen({ erzeuger: [{ id: "E", werte: [10], tf: 60 }], verbraucher: [{ id: "V", werte: [10], tf: 50 }] });
  pruefe(tf.summe.erzeugungTf[0] === 6 && tf.summe.verbrauchTf[0] === 5 && tf.verbraucher[0].eigendeckung[0] === 5 && tf.erzeuger[0].restueberschuss[0] === 1, "Teilnahmefaktor zuerst (4.1): E' = 6, V' = 5, ED = 5, R = 1");
  const zufall = M.zufall(7);
  const gross = V.verteilen({ erzeuger: reihe(3, (j) => ({ id: `E${j}`, werte: reihe(96, () => zufall() * 3), tf: 70 })), verbraucher: reihe(5, (i) => ({ id: `V${i}`, werte: reihe(96, () => zufall()), tf: 100 })) });
  const bil = V.bilanzPruefen(gross);
  pruefe(bil.ok, "Kontrolle 4.5: Σ Eigendeckung = Σ eingebrachte Erzeugung", bil);
  pruefe(gross.verbraucher.every((v) => v.eigendeckung.every((x, q) => x <= v.verbrauchTf[q] + 1e-12)), "ED ≤ V' in jeder Viertelstunde");

  abschnitt("A2. Mehrfachteilnahme und Teilnahmefaktor");
  pruefe(V.tfPruefen([60, 40]).ok && !V.tfPruefen([60, 50]).ok && !V.tfPruefen([1, 1, 1, 1, 1, 1]).ok && !V.tfPruefen([50.5]).ok && !V.tfPruefen([0]).ok, "TF ganzzahlig 1–100, Σ ≤ 100, höchstens 5 Teilnahmen (ElWG § 71 Abs. 5)");
  const mf = V.mehrfachAufteilen([10, null], [{ gemeinschaftId: "A", tf: 60 }, { gemeinschaftId: "B", tf: 30 }]);
  pruefe(mf.anteile.A[0] === 6 && mf.anteile.B[0] === 3 && mf.rest[0] === 1 && mf.anteile.A[1] === null, "Aufteilung 60/30 → Rest 10 % beim Lieferanten, Lücke bleibt Lücke");
  pruefe(wirft(() => V.mehrfachAufteilen([1], [{ gemeinschaftId: "A", tf: 70 }, { gemeinschaftId: "B", tf: 40 }]))?.status === 422, "Σ TF > 100 → 422");

  abschnitt("A3. Tagesblöcke, Zeitumstellung, Nachlieferung, EDA-Payload");
  pruefe(M.werteJeTag("2026-03-29") === 92 && M.werteJeTag("2026-10-25") === 100 && M.werteJeTag("2026-06-01") === 96, "92/100 Viertelstunden an den Umstellungstagen (Fachkonzept 3.12)");
  pruefe(M.tagBeginnUtc("2026-06-01") === "2026-05-31T22:00:00.000Z" && M.tagBeginnUtc("2026-12-01") === "2026-11-30T23:00:00.000Z", "Tagesbeginn in UTC (MESZ/MEZ)");
  pruefe(M.lokalNachUtc("2026-10-25", 2, 30, false) !== M.lokalNachUtc("2026-10-25", 2, 30, true) && M.lokalNachUtc("2026-03-29", 2, 15) === null, "Doppelte Stunde unterscheidbar, fehlende Stunde erkannt");
  const b1 = M.blockBereinigen({ tag: "2026-06-01", groesse: "eigendeckung", werte: reihe(96, () => 0.1), qualitaet: reihe(96, () => "L3") });
  const b2 = M.blockBereinigen({ tag: "2026-06-01", groesse: "eigendeckung", werte: reihe(96, (i) => (i < 48 ? 0.2 : null)), qualitaet: reihe(96, () => "L1"), quelle: { nachrichtId: "EDN-2" } });
  const z = M.bloeckeZusammenfuehren(b1, b2);
  pruefe(z.block.version === 2 && z.block.historie.length === 1 && z.block.l3 === 48 && nahe(z.block.summeKwh, 48 * 0.2 + 48 * 0.1), "Nachlieferung ersetzt L3 durch L1, Vorversion in der Historie", { v: z.block.version, l3: z.block.l3 });
  const z2 = M.bloeckeZusammenfuehren(z.block, M.blockBereinigen({ tag: "2026-06-01", groesse: "eigendeckung", werte: reihe(96, () => 9), qualitaet: reihe(96, () => "L3") }));
  pruefe(z2.konflikte === 48 && z2.block.werte[0] === 0.2, "L3-Nachlieferung überschreibt keine L1-Werte (zu bestätigen)");
  pruefe(wirft(() => M.blockBereinigen({ tag: "2026-06-01", groesse: "eigendeckung", werte: [-1, ...reihe(95, () => 0)] }))?.status === 422, "Negative Werte werden abgelehnt");
  const pl = M.payloadZerlegen({ von: "2026-10-24T22:00:00.000Z", reihen: [{ groesse: "verbrauch_gemessen", werte: reihe(100, () => 0.25) }] });
  pruefe(pl.length === 1 && pl[0].tag === "2026-10-25" && pl[0].vollstaendig && pl[0].werte.length === 100, "EDA-Payload über den 100-Viertelstunden-Tag → ein vollständiger Block");
  const mw = M.monatswerte([pl[0]]);
  pruefe(mw[0].werteSoll === 31 * 96 + 4 && !mw[0].vollstaendig && mw[0].tage === 1, "Monatswerte: Soll Oktober 2.980 Viertelstunden, unvollständig");

  abschnitt("A4. CSV-/Excel-Import der Netzbetreiber-Portale");
  const zp = "AT0030000491000000000000000000001";
  const csvDe = [`Zählpunkt: ${zp}`, "", "Datum;Zeit von;Zeit bis;Verbrauch (kWh);Eigendeckung (kWh);Status", "01.06.2026;00:00;00:15;0,250;0,000;Messwert", "01.06.2026;00:15;00:30;1.234,5;0,100;Ersatzwert"].join("\r\n");
  const c1 = M.csvParsen(csvDe);
  pruefe(c1.zaehlpunktnummer === zp && c1.reihen.length === 2 && c1.reihen.find((r) => r.groesse === "verbrauch_gemessen").punkte[1].wert === 1234.5 && c1.reihen[0].punkte[1].qualitaet === "L2", "Semikolon, Dezimalkomma, Tausenderpunkt, Vorspann mit Zählpunkt, Ersatzwert → L2");
  const c2 = M.csvParsen(["Datum\tUhrzeit\tEinspeisung kW", "2026-06-01\t12:00\t8"].join("\n"));
  pruefe(c2.reihen[0].groesse === "erzeugung_gemessen" && c2.reihen[0].punkte[0].wert === 2, "Aus Excel kopiert (Tabulator), kW → kWh × 0,25");
  const herbst = ["Datum;Zeit von;Verbrauch kWh", ...["02:00", "02:15", "02:30", "02:45", "02:00", "02:15", "02:30", "02:45"].map((t) => `25.10.2026;${t};0,1`)].join("\n");
  const c3 = M.csvParsen(herbst);
  const ms = c3.reihen[0].punkte.map((p) => p.ms);
  pruefe(new Set(ms).size === 8 && ms[4] - ms[0] === 3600000, "Doppelte Stunde am Ende der Sommerzeit: erst MESZ, dann MEZ");
  pruefe(wirft(() => M.csvParsen("a;b\n1;2"))?.status === 422, "Datei ohne Zeit-/Wertspalte → 422");
  pruefe(M.csvZuBloecken(c3).length === 1 && M.csvZuBloecken(c3)[0].ist === 8, "CSV → Tagesblock mit 8 von 100 Werten");

  abschnitt("A5. Datenqualität, Reklamation, Lieferstatistik");
  const blk = (w, q = [], empf = "2026-09-11") => M.blockBereinigen({ tag: "2026-09-10", groesse: "eigendeckung", werte: w, qualitaet: q, empfangenAm: empf });
  const amp = (bl, heute = "2026-10-01", modell = "eeg") => Q.tagesAmpel({ tag: "2026-09-10", bloecke: bl, erwartet: ["eigendeckung"], heute, modell }).ampel;
  pruefe(amp({ eigendeckung: blk(reihe(96, () => 0.1)) }) === "ok", "Vollständig, L1 → ok");
  pruefe(amp({ eigendeckung: blk(reihe(96, () => 0.1), reihe(96, () => "L3")) }) === "warn" && amp({ eigendeckung: blk(reihe(96, () => 0.1), reihe(96, () => "L3")) }, "2026-12-01") === "fehler", "L3 → prüfen, nach 60 Tagen Reklamation (HA II 13.1)");
  pruefe(amp({ eigendeckung: blk(reihe(96, () => 0.1), reihe(96, () => "L3")) }, "2026-10-01", "beg") === "fehler", "BEG: L3 nach 15 Kalendertagen → Reklamation");
  pruefe(amp({}) === "fehler" && amp({}, "2026-09-11") === "erwartet" && amp({ eigendeckung: blk(reihe(96, () => 0.1), [], "2026-09-17") }) === "warn", "Fehlender Tag nach Frist → Reklamation, innerhalb der Frist erwartet, späte Lieferung → prüfen");
  const pl2 = Q.plausibilitaet({ verbrauch_tf: blk(reihe(96, () => 0.1)), eigendeckung: blk(reihe(96, (i) => (i ? 0.1 : 0.4))) });
  pruefe(pl2.verstoesse.length === 1 && pl2.verstoesse[0].viertelstunden === 1, "Plausibilität: Eigendeckung über Verbrauch × TF erkannt");
  const fa = Q.reklamationsFaelle([{ zaehlpunktId: "Z", tage: [{ tag: "2026-09-01", ampel: "fehler", gruende: ["Keine Daten geliefert"] }, { tag: "2026-09-02", ampel: "fehler", gruende: ["Keine Daten geliefert"] }, { tag: "2026-09-03", ampel: "ok", gruende: [] }] }], { heute: "2026-10-01" });
  pruefe(fa.length === 1 && fa[0].tage === 2 && fa[0].art === "nachforderung" && fa[0].fristBis === "2026-10-15", "Zusammenhängende Problemtage → ein Nachforderungsfall mit Frist");
  const ls = Q.lieferstatistik([{ netzbetreiberId: "A", tag: "2026-09-01", empfangenAm: "2026-09-02" }, { netzbetreiberId: "A", tag: "2026-09-02", empfangenAm: "2026-09-08" }]);
  pruefe(ls[0].mittelTage === 3.5 && ls[0].verspaetetPct === 50, "Lieferstatistik je Netzbetreiber (Mittel, Anteil verspätet)");
  const ers = Q.ersatzwerte([1, null, 3, null, null, null, null, null, null, null, null, null, 5], { vergleich: reihe(13, () => 9) });
  pruefe(ers.werte[1] === 2 && ers.art[1] === "interpoliert" && ers.werte[4] === 9 && ers.art[4] === "vergleichstag", "Ersatzwerte nur für die Vorschau: Interpolation ≤ 2 h, sonst Vergleichstag");
  const nb = V.nbAbgleich([{ zaehlpunktId: "A", eigenKwh: 100, nbKwh: 100.3 }, { zaehlpunktId: "B", eigenKwh: 100, nbKwh: 95 }]);
  pruefe(nb.klaerfaelle === 1 && !nb.zeilen[0].klaerfall && nb.zeilen[1].klaerfall, "Abweichungsbericht: 0,3 % im Rahmen, 5 % → Klärfall");

  abschnitt("A6. Sozialquote (ElWG § 68 Abs. 6)");
  const sq = V.sozialquote({ verbraucher: [{ id: "S", eigendeckung: [1, 1], schutzbeduerftig: true }, { id: "N", eigendeckung: [3, 1], schutzbeduerftig: false }], erzeuger: [{ id: "G", erzeugungTf: [4, 2], eingebracht: [4, 2], gemeinde: true }] });
  pruefe(sq.anwendbar && nahe(sq.quotePct, (2 / 6) * 100) && sq.erfuellt, "Gemeindeanlage: 2 von 6 kWh an Schutzbedürftige → 33 %", sq);
  pruefe(!V.sozialquote({ verbraucher: [], erzeuger: [{ id: "X", erzeugungTf: [1], eingebracht: [1] }] }).anwendbar, "Ohne Gemeindeanlage nicht anwendbar");

  abschnitt("A7. Simulation vor der Gründung (4.7)");
  const sim = S.simulationRechnen({ teilnehmer: [{ art: "privat", jahresverbrauchKwh: 3500, anzahl: 20 }, { art: "kmu", jahresverbrauchKwh: 40000 }, { art: "privat", pvKwp: 8, anzahl: 4 }], anlagen: [{ kwp: 80 }], varianten: [{ id: "a", reduktionPct: 57, abgabenBefreit: true }, { id: "b", reduktionPct: 0 }], sensitivitaet: { haushalte: [10] } });
  const k = sim.kennzahlen;
  pruefe(k.teilnehmer === 25 && nahe(k.verbrauchKwh, 20 * 3500 + 40000 + 4 * 3500, 0.01), "Teilnehmer und Jahresverbrauch (Profile auf Jahresverbrauch normiert)", k);
  pruefe(k.eigendeckungKwh <= k.verbrauchTfKwh && k.eigendeckungKwh <= k.erzeugungTfKwh && nahe(k.eigendeckungKwh + k.restueberschussKwh, k.erzeugungTfKwh, 0.01), "Bilanz: ED ≤ V', ED ≤ E', ED + Restüberschuss = E'");
  pruefe(sim.anlagen[0].spezErtrag > 950 && sim.anlagen[0].spezErtrag < 1200, "PV-Ertrag Süd 30° ca. 1.000–1.200 kWh/kWp", sim.anlagen[0].spezErtrag);
  pruefe(sim.monate[5].erzeugungTfKwh > 4 * sim.monate[11].erzeugungTfKwh, "PV-Saisonalität: Juni ≫ Dezember");
  pruefe(sim.varianten[0].vorteilEur > sim.varianten[1].vorteilEur && sim.varianten[1].netzEur === 0, "Variantenvergleich: lokal (−57 %) besser als ohne Reduktion");
  pruefe(sim.sensitivitaet.haushalte[0].nutzungsgrad > k.nutzungsgrad, "Sensitivität: mehr Haushalte → höherer Nutzungsgrad");
  pruefe(k.lieferantenpflichten === true, "§ 69-Schwelle: 112 kW > 100 kW → Lieferantenpflichten");
  const spSim = S.simulationRechnen({ teilnehmer: [{ art: "privat", jahresverbrauchKwh: 3500, anzahl: 10 }], anlagen: [{ kwp: 60 }], speicher: { kapazitaetKwh: 40 } });
  const ohneSp = S.simulationRechnen({ teilnehmer: [{ art: "privat", jahresverbrauchKwh: 3500, anzahl: 10 }], anlagen: [{ kwp: 60 }] });
  pruefe(spSim.kennzahlen.eigendeckungKwh > ohneSp.kennzahlen.eigendeckungKwh && spSim.speicher.verlusteKwh > 0, "Gemeinschaftsspeicher erhöht die Eigendeckung (mit Verlusten)");
  const oe = S.simulationOeffentlich({ teilnehmer: [{ name: "Max Mustermann", jahresverbrauchKwh: 3000 }], anlagen: [{ name: "Dach", kwp: 10 }] });
  pruefe(oe.eingabe === undefined && oe.teilnehmer[0].name === "Teilnehmer 1" && oe.anlagen[0].name === "Anlage 1", "Öffentlicher Kern ohne Personendaten (für den Rechner WP6)");
  pruefe(wirft(() => S.simulationRechnen({ teilnehmer: [{}], anlagen: [] }))?.status === 422 && wirft(() => S.simulationOeffentlich({ teilnehmer: reihe(31, () => ({})), anlagen: [{ kwp: 1 }] }))?.status === 422, "Ohne Erzeugung bzw. > 30 Teilnehmer (öffentlich) → 422");
  pruefe(S.apReduziert(6.98, 57) === 3 && S.apReduziert(8.79, 28) === 6.33, "Reduzierter Netz-AP kaufmännisch auf 2 Kommastellen (SNE-V 2018 § 5 Abs. 1a)");
  const h0 = S.lastprofil("H0", 2025);
  pruefe(h0.length === 35040 && nahe(h0.reduce((a, b) => a + b, 0), 1, 1e-9), "Standardlastprofil H0: 35.040 Viertelstunden, Summe 1");

  abschnitt("A8. Speicher, Prognose, Optimierer");
  const e3 = reihe(288, (q) => Math.max(0, Math.sin((((q % 96) - 24) / 48) * Math.PI)) * 20);
  const v3 = reihe(288, () => 4);
  const sb = SP.speicherBilanz({ erzeugung: e3, verbrauch: v3 }, { kapazitaetKwh: 30, leistungKw: 15, wirkungsgradPct: 90 });
  pruefe(sb.bilanzOk && sb.quoteMit > sb.quoteOhne && nahe(sb.geladenKwh, sb.entladenKwh + sb.verlusteKwh + (sb.socEndeKwh - 1.5), 0.01), "Speicherbilanz: geladen = entladen + Verluste + Δ Ladezustand", sb);
  const emp = SP.speicherEmpfehlung({ erzeugung: e3, verbrauch: v3 }, { groessen: [10, 30, 300] });
  pruefe(emp[2].grenzKwhJeKwh < emp[1].grenzKwhJeKwh && emp[2].quoteMit > emp[0].quoteMit, "Speicherempfehlung: höhere Deckung, abnehmender Grenznutzen je kWh Kapazität", emp);
  const hist = reihe(30, (dd) => ({ tag: M.plusTag("2026-09-01", dd), erzeugung: reihe(96, (q) => Math.max(0, Math.sin(((q - 26) / 44) * Math.PI)) * 10), verbrauch: reihe(96, () => 3) }));
  const pr = P.prognose({ heute: "2026-10-01", historie: hist, anlagen: [{ kwp: 50 }], standort: { lat: 48.2, lon: 13.5 } });
  pruefe(pr.tage.length === 7 && pr.tage.every((t) => t.erzeugungKwh > 0 && t.gruenFenster.length >= 1) && pr.kalibrierung > 0, "Prognose 7 Tage mit grünen Stunden aus kalibriertem Klarhimmel", pr.tage[0]);
  const prW = P.prognose({ heute: "2026-10-01", historie: hist, anlagen: [{ kwp: 50 }], wetter: [{ tag: "2026-10-02", faktor: 0.1 }] });
  pruefe(prW.tage[1].quelle === "wetter" && prW.tage[1].erzeugungKwh < prW.tage[0].erzeugungKwh, "Wetterfaktor senkt die Prognose (trüber Tag)");
  const opt = O.tfOptimieren({ richtung: "erzeugung", werte: reihe(96, () => 5), kandidaten: [{ gemeinschaftId: "A", vorteilCtKwh: 5, erzeugung: reihe(96, () => 0), verbrauch: reihe(96, () => 2), aktuellTf: 100 }, { gemeinschaftId: "B", vorteilCtKwh: 3, erzeugung: reihe(96, () => 0), verbrauch: reihe(96, () => 10), aktuellTf: 0 }] });
  pruefe(opt.empfehlung[0].empfohlenTf === 40 && opt.empfehlung[1].empfohlenTf === 60 && opt.verbesserungEur > 0, "Optimierer: Bedarf in A gedeckt (40 %), Rest nach B (60 %) – exakt per DP", opt.empfehlung.map((e) => e.empfohlenTf));
  pruefe(wirft(() => O.tfOptimieren({ kandidaten: reihe(6, (i) => ({ gemeinschaftId: `G${i}` })) }))?.status === 422, "Mehr als 5 Gemeinschaften → 422");

  abschnitt("A9. Synthetische Demo-Daten (13 Monate, Qualitätsfälle)");
  const Sd = await lade("src/lib/plattform/backend/demo/eg-energie-seed.js");
  const { egSeed } = await lade("src/lib/plattform/backend/demo/eg-stamm-seed.js");
  const HEUTE = "2026-10-01";
  const tag = (t) => new Date(Date.parse(`${HEUTE}T12:00:00Z`) - t * 864e5).toISOString().slice(0, 10);
  const eg = egSeed({ konten: {}, tag, iso: (t) => new Date(Date.parse(`${HEUTE}T12:00:00Z`) - t * 864e5).toISOString() });
  const g = eg.gemeinschaften.find((x) => x.seedSchluessel === "sonnenland");
  const ctx = Sd.synthKontext(eg, g.id, HEUTE);
  pruefe(ctx.beginn === "2025-09-01", "Zeitraum: 13 volle Monate vor dem laufenden Monat", ctx.beginn);
  const t1 = Sd.synthTag(ctx, "2026-07-15");
  const t1b = Sd.synthTag(ctx, "2026-07-15");
  pruefe(t1.bloecke.size > 40 && JSON.stringify([...t1.bloecke.values()][0].werte) === JSON.stringify([...t1b.bloecke.values()][0].werte), "Deterministisch erzeugt, nichts gespeichert", t1.bloecke.size);
  const ed = [...t1.bloecke.values()].filter((b) => b.groesse === "eigendeckung");
  const et = [...t1.bloecke.values()].filter((b) => b.groesse === "erzeugung_tf");
  pruefe(Q.gemeinschaftPruefen(ed.map((b) => b.werte), et.map((b) => b.werte)).verstoesse === 0, "Σ Eigendeckung ≤ Σ Erzeugung × TF in jeder Viertelstunde");
  const herbstTag = Sd.synthTag(ctx, "2025-10-26");
  pruefe([...herbstTag.bloecke.values()].every((b) => b.werte.length === 100), "Umstellungstag 26.10.2025 mit 100 Werten");
  const f = ctx.faelle;
  pruefe(!Sd.synthTag(ctx, f.fehltVon).bloecke.has(`${f.fehltZp}|eigendeckung`) && Sd.synthTag(ctx, f.l3Von).bloecke.get(`${f.l3Zp}|eigendeckung`).qualitaet[0] === "L3", "Eingebaute Fälle: fehlende Tage und L3-Werte");
  const vorMonat = Sd.synthTag(ctx, `${f.abweichungMonat}-10`);
  const nbW = vorMonat.bloecke.get(`${f.abweichungZp}|eigendeckung`).werte.reduce((a, b) => a + (b || 0), 0);
  const eigenW = vorMonat.eigen.get(f.abweichungZp).eigendeckung.reduce((a, b) => a + b, 0);
  pruefe(eigenW > nbW, "Abweichung NB ↔ eigene Zuteilung im Vormonat (Klärfall im Abweichungsbericht)");
  const gea = eg.gemeinschaften.find((x) => x.seedSchluessel === "linzerstrasse");
  const ctxGea = Sd.synthKontext(eg, gea.id, HEUTE);
  const gTag = Sd.synthTag(ctxGea, "2026-06-15");
  pruefe(gTag.bloecke.size > 0 && ctxGea.schluessel.size === 9, "GEA (statisches Modell) mit gültigem Verteilschlüssel", ctxGea.schluessel.size);

  abschnitt("A10. Testvektoren und Gleichheit mit Python (plattform/eg_energie_kern.py)");
  const { vektorenErzeugen } = await lade("scripts/eg-energie-testdaten.mjs");
  const datei = path.join(WURZEL, "src/lib/plattform/eg/testdaten/energie/vektoren.json");
  const aktuell = `${JSON.stringify(await vektorenErzeugen())}\n`;
  pruefe(fs.existsSync(datei) && fs.readFileSync(datei, "utf8") === aktuell, "Testvektoren passen zum JS-Kern (sonst node scripts/eg-energie-testdaten.mjs)");
  try {
    const aus = execFileSync("python", ["-m", "unittest", "oekoinvest_app.plattform.tests.test_eg_energie_kern"], { cwd: path.join(WURZEL, "Backend-Import", "oekoinvest_app"), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PYTHONIOENCODING: "utf-8" }, timeout: 600000 });
    pruefe(true, "Python-Kern liefert dieselben Ergebnisse (test_eg_energie_kern)", aus);
  } catch (e) {
    const t = `${e.stdout || ""}${e.stderr || ""}`;
    if (/No module named|nicht gefunden|not recognized|ENOENT/.test(t + e.message)) console.log(`  (Python nicht verfügbar – Gleichheitsprüfung übersprungen)`);
    else pruefe(false, "Python-Kern liefert dieselben Ergebnisse (test_eg_energie_kern)", t.slice(-800));
  }
}

// ================================================================ Teil B – gegen den Dev-Server

class Client {
  constructor(name) {
    this.name = name;
    this.cookie = "";
  }
  async anfrage(methode, pfad, body, { origin = BASIS } = {}) {
    const headers = {};
    if (origin) headers.Origin = origin;
    if (this.cookie) headers.Cookie = this.cookie;
    let payload;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    let res;
    for (let versuch = 1; ; versuch++) {
      try {
        res = await fetch(BASIS + pfad, { method: methode, headers, body: payload, redirect: "manual", signal: AbortSignal.timeout(180000) });
        break;
      } catch (e) {
        if (versuch >= 3) throw e;
        await new Promise((r) => setTimeout(r, 4000 * versuch));
      }
    }
    for (const c of res.headers.getSetCookie?.() || []) {
      const [paar] = c.split(";");
      const [name, wert] = paar.split("=");
      if (/oi_sitzung$/.test(name)) this.cookie = wert ? `${name}=${wert}` : "";
    }
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 300) };
    }
    return { status: res.status, json, text };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  async login(email, passwort = DEMO_PASSWORT) {
    const r = await this.post("/api/auth/login", { email, passwort });
    if (r.status !== 200) throw new Error(`Login ${email} fehlgeschlagen: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.nutzer;
  }
}

async function teilB() {
  const admin = new Client("admin");
  const obmann = new Client("obmann");
  const mitglied = new Client("mitglied");
  const flaeche = new Client("flaeche");
  await admin.login("admin@example.com");
  await obmann.login("eg-obmann@example.com");
  await mitglied.login("mitglied@example.com");
  await flaeche.login("flaeche@example.com");
  const liste = await admin.get("/api/admin/eg");
  const g = (liste.json.gemeinschaften || []).find((x) => x.seedSchluessel === "sonnenland") || (liste.json.gemeinschaften || []).find((x) => /Sonnenland/.test(x.name));
  if (!pruefe(!!g, "Demo-Gemeinschaft Sonnenland vorhanden", liste.status)) return;
  const api = `/api/admin/eg/${g.id}/energiedaten`;

  abschnitt("B1. Dashboard, Qualität, Abweichung, Prognose (Backoffice)");
  let r = await admin.get(api);
  pruefe(r.status === 200 && r.json.monate?.length >= 13 && r.json.monate.filter((m) => m.eigendeckungKwh > 0).length >= 13 && r.json.woche?.length >= 6, "Dashboard: 13 Monate, 7 Tage Viertelstunden", { s: r.status, m: r.json.monate?.length });
  r = await admin.get(`${api}?ansicht=qualitaet`);
  // Wiederholbar: Frühere Läufe (Reklamation → Nachforderung WP2 → Simulator, CSV-Import) füllen die synthetischen Lücken
  // mit echten Eingängen – dann gibt es im Vormonat keinen offenen Fall mehr; die Ampel je ZP und Tag muss trotzdem stimmen.
  const ampelOk = r.status === 200 && r.json.zeilen.every((z) => z.tage.every((t) => Object.hasOwn(r.json.ampel || {}, t.ampel) || t.ampel === "keine"));
  if (r.status === 200 && !r.json.reklamationen.length) console.log("  (Wiederholungslauf: Lücken des Vormonats bereits durch Nachlieferungen geschlossen)");
  pruefe(ampelOk && r.json.zeilen.length > 20 && r.json.lieferstatistik.length >= 1, "Leitstand: Ampel je ZP und Tag, Reklamationsfälle, Lieferstatistik", { s: r.status, rek: r.json.reklamationen?.length });
  const fall = r.json.reklamationen?.[0];
  r = await admin.get(`${api}?ansicht=abweichung`);
  pruefe(r.status === 200 && r.json.klaerfaelle >= 1 && r.json.sozialquote?.anwendbar, "Abweichungsbericht mit Klärfall und Sozialquote (Gemeinde-PV)", { s: r.status, k: r.json.klaerfaelle });
  r = await admin.get(`${api}?ansicht=prognose`);
  pruefe(r.status === 200 && r.json.tage?.length === 7, "Prognose 7 Tage", r.status);
  const monat = new Date(Date.now() - 40 * 864e5).toISOString().slice(0, 7);
  r = await admin.get(`${api}?ansicht=perioden&von=${monat}-01&bis=${monat}-28`);
  pruefe(r.status === 200 && r.json.zaehlpunkte.length > 20 && r.json.zaehlpunkte.some((z) => z.groessenJeZeitfenster?.Z1 || Object.keys(z.groessenJeZeitfenster || {}).length), "Periodenwerte für WP4 inkl. Zeitfenster (TOU)", { s: r.status });

  abschnitt("B2. CSV-Import, Reklamation, Einzelwerte, Optimierer");
  const zpNr = (await admin.get(`/api/admin/eg/${g.id}`)).json.zaehlpunkte?.find((z) => z.richtung === "verbrauch")?.zaehlpunktnummer;
  const gestern = new Date(Date.now() - 864e5).toISOString().slice(0, 10).split("-").reverse().join(".");
  const csv = [`Zählpunkt: ${zpNr}`, "Datum;Zeit von;Verbrauch (kWh)", `${gestern};00:00;0,321`, `${gestern};00:15;0,322`].join("\n");
  r = await admin.post(api, { aktion: "csv", csv, ausfuehren: false });
  pruefe(r.status === 200 && r.json.ausgefuehrt === false && r.json.vorschau.zeilen === 2, "CSV-Vorschau erkennt Zählpunkt und 2 Werte", r.json);
  r = await admin.post(api, { aktion: "csv", csv, ausfuehren: true });
  pruefe(r.status === 200 && r.json.ausgefuehrt && r.json.ergebnis.tage === 1, "CSV-Import übernimmt die Werte (Historie bleibt)", r.json.ergebnis);
  r = await admin.post(api, { aktion: "csv", csv: "x;y\n1;2", ausfuehren: false });
  pruefe(r.status === 422, "Unlesbare Datei → 422", r.status);
  if (fall) {
    r = await admin.post(api, { aktion: "reklamieren", zaehlpunktId: fall.zaehlpunktId, von: fall.von, bis: fall.bis, gruende: fall.gruende });
    pruefe(r.status === 200 && ["gestellt", "vorgemerkt"].includes(r.json.reklamation?.status), "Reklamation: Nachforderung über WP2 gestellt bzw. vorgemerkt", r.json);
  }
  const zpId = (await admin.get(`/api/admin/eg/${g.id}`)).json.zaehlpunkte?.[0]?.id;
  r = await admin.get(`${api}?ansicht=messreihen&zaehlpunktId=${zpId}`);
  pruefe(r.status === 200 && r.json.bloecke?.length > 0 && r.json.protokolliert, "Einzelwerte für die Betriebsführung (protokolliert)", r.status);
  const mehrfach = (await admin.get(`/api/admin/eg/${g.id}`)).json.teilnahmen?.find((t) => t.teilnahmefaktor === 60)?.zaehlpunktId;
  if (mehrfach) {
    r = await admin.get(`${api}?ansicht=optimierung&zaehlpunktId=${mehrfach}`);
    pruefe(r.status === 200 && r.json.empfehlung?.length >= 1 && r.json.summeTf <= 100 && r.json.empfehlung.every((e) => e.empfohlenTf >= 0), "Optimierer: Landwirt-PV über alle zählenden Teilnahmen (BEG-Entwurf je nach Testlauf)", r.json.empfehlung?.map((e) => [e.label, e.empfohlenTf]));
  }
  r = await admin.post(api, { aktion: "csv", csv }, { origin: "https://boese.example" });
  pruefe(r.status === 403, "Fremder Origin (CSRF) → 403", r.status);

  abschnitt("B3. Simulation");
  r = await admin.get(`/api/admin/eg/simulation?gemeinschaft=${g.id}&vorlage=1`);
  pruefe(r.status === 200 && r.json.vorlage?.teilnehmer?.length > 15, "Vorlage aus der Gemeinschaft (gemessener Jahresverbrauch)", r.status);
  const vorlage = r.json.vorlage;
  r = await admin.post("/api/admin/eg/simulation", { daten: { ...vorlage, speichern: true } });
  pruefe(r.status === 200 && r.json.ergebnis.kennzahlen.eigendeckungsquote > 0 && r.json.ergebnis.varianten.length === 4 && r.json.ergebnis.id, "Simulation gerechnet und gespeichert, Zonelevel-Vergleich", r.json.ergebnis?.kennzahlen);
  r = await admin.get("/api/admin/eg/simulation");
  pruefe(r.status === 200 && r.json.simulationen.length >= 1, "Gespeicherte Simulationen", r.status);
  r = await admin.post("/api/admin/eg/simulation", { daten: { teilnehmer: [], anlagen: [] } });
  pruefe(r.status === 422, "Leere Simulation → 422", r.status);

  abschnitt("B4. Rechte");
  r = await obmann.get(`/api/portal/eg/${g.id}/energie`);
  pruefe(r.status === 200 && r.json.monate?.length >= 13, "Obmann (Organ) sieht Summen der Gemeinschaft", r.status);
  r = await obmann.get(`/api/portal/eg/${g.id}/energie?ansicht=messreihen&zaehlpunktId=${zpId}`);
  pruefe(r.status === 200 && r.json.protokolliert, "Obmann: Einzelwerte mit Zweckbindung (protokolliert)", r.status);
  r = await mitglied.get(`/api/portal/eg/${g.id}/energie`);
  pruefe(r.status === 403 || r.status === 404, "Mitglied ohne Organ-Rolle → keine Summen der Gemeinschaft", r.status);
  r = await mitglied.get(`/api/portal/eg/${g.id}/energie?ansicht=messreihen&zaehlpunktId=${zpId}`);
  pruefe([200, 403, 404].includes(r.status) && (r.status !== 200 || r.json.protokolliert === false), "Mitglied: nur eigener Zählpunkt", r.status);
  r = await flaeche.get(`/api/portal/eg/${g.id}/energie`);
  pruefe(r.status === 404, "Fremdes Konto → 404 (keine Existenz verraten)", r.status);
  r = await flaeche.get(api);
  pruefe(r.status === 403, "Kein Backoffice → 403", r.status);

  abschnitt("B5. Seiten");
  for (const [c, p] of [[admin, `/portal/admin/eg/${g.id}/energiedaten`], [admin, "/portal/admin/eg/simulation"], [admin, `/portal/admin/eg/simulation?gemeinschaft=${g.id}`], [obmann, `/portal/eg/${g.id}/energie`]]) {
    r = await c.get(p);
    pruefe(r.status === 200 && !/Application error|Unhandled Runtime Error/.test(r.text), `${p} → 200`, r.status);
  }
  r = await mitglied.get(`/portal/eg/${g.id}/energie`);
  pruefe(r.status === 404 || !r.text.includes("Datenqualitäts-Leitstand"), "Organ-Reiter Energiedaten für einfache Mitglieder → nicht gefunden", r.status);
}

async function main() {
  console.log(`Energiegemeinschaften WP3 – ${NUR_LOGIK ? "nur Logik" : `Test gegen ${BASIS}`}`);
  await teilA();
  if (!NUR_LOGIK) await teilB();
  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen bestanden")} · ${ok} ok`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.stack || e.message}`));
  process.exit(1);
});
