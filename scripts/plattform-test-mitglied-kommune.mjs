// scripts/plattform-test-mitglied-kommune.mjs
//
// Team 5 – Mitglied/Genossenschaft/Energiegemeinschaft und Kommune (Gemeindecockpit).
//   node scripts/plattform-test-mitglied-kommune.mjs [basis-url]      (nur Logik ohne Server: --nur-logik)
//
// Teil A – reine Logik (Node, ohne Server): Genossenschaft (Stammdaten, Beitritt, Guthaben, Kündigungsstichtag, Übertragung,
//   Ausschüttung mit Steuerabzug), Generalversammlung (Frist, Stimmzettel, Mehrheiten, Ergebnis, Prüfsumme), Energiegemeinschaft
//   (Verteilschlüssel, Monatsabrechnung), Gemeindecockpit (Verfahren, § 6 EEG, Einnahmen, Material), Gleichheit mit den
//   Frappe-Kopien (mitglied_kern.py, gemeinde_kern.py, Werte aus markt.js), Rechte-Matrix, Menü/Registrierung im Code.
// Teil B – gegen den laufenden Dev-Server (eigene Konten mt-test-<Lauf>@example.com, eigene Test-Genossenschaft/-Gemeinschaft/
//   -Gemeinde; Demo-Daten nur gelesen): Beitritt → Zulassung → Einzahlung → Anteilsbestätigung, weitere Anteile, Übertragung,
//   Kündigung, Generalversammlung mit Online-Abstimmung und Protokoll, Ausschüttung, Energiegemeinschaft mit Monatslauf,
//   Gemeindecockpit (Termine, Einnahmen, Stellungnahmen, Material), Rechte (401/403/404), CSRF, Seiten.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lade = (p) => import(pathToFileURL(path.join(WURZEL, p)).href);
const datei = (p) => readFileSync(path.join(WURZEL, p), "utf8");
const NUR_LOGIK = process.argv.includes("--nur-logik");
const BASIS = (process.argv.find((a) => a.startsWith("http")) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);
const PASSWORT = "Mitglied-Kommune-Test-26";

let ok = 0;
let fehler = 0;
let uebersprungen = 0;
const gruen = (s) => `\x1b[32m${s}\x1b[0m`;
const rot = (s) => `\x1b[31m${s}\x1b[0m`;
const gelb = (s) => `\x1b[33m${s}\x1b[0m`;
function pruefe(bedingung, text, details) {
  if (bedingung) {
    ok++;
    console.log(`  ${gruen("✓")} ${text}`);
  } else {
    fehler++;
    console.log(`  ${rot("✗")} ${text}${details !== undefined ? ` – ${JSON.stringify(details).slice(0, 500)}` : ""}`);
  }
  return bedingung;
}
const ueberspringen = (text) => {
  uebersprungen++;
  console.log(`  ${gelb("○")} ${text}`);
};
const abschnitt = (t) => console.log(`\n${t}`);
function wirft(fn, status) {
  try {
    fn();
    return false;
  } catch (e) {
    return status ? e.status === status : true;
  }
}
const heute = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
const plusTageIso = (t) => new Date(Date.now() + t * 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });

// ================================================================ Teil A – Logik

async function logik() {
  const G = await lade("src/lib/plattform/mitglied/genossenschaft.js");
  const V = await lade("src/lib/plattform/mitglied/versammlung.js");
  const E = await lade("src/lib/plattform/mitglied/gemeinschaft.js");
  const B = await lade("src/lib/plattform/mitglied/basis.js");
  const C = await lade("src/lib/plattform/gemeinde/cockpit.js");
  const M = await lade("src/lib/invest/markt.js");
  const R = await lade("src/lib/plattform/rechte.js");
  const H = "2026-10-01";
  const IBAN = "AT611904300234573201";
  const GENO = { name: "Test eGen", land: "AT", registerStatus: "eingetragen", registerNr: "FN 1a", pruefungsverband: "Revisionsverband", anteilEur: 250, minAnteile: 2, maxAnteile: 200, iban: IBAN, satzungStand: "2025-01-20", kuendigungsfristMonate: 6, onlineGv: true };
  const g = G.genoBereinigen(GENO);
  const best = Object.fromEntries(G.beitrittBestaetigungen(g).map((k) => [k, true]));
  const beitritt = (x = {}) => ({ art: "privat", vorname: "Max", nachname: "Muster", strasse: "Weg 1", plz: "5121", ort: "Ostermiething", iban: IBAN, anteile: 4, bestaetigt: best, ...x });

  abschnitt("A1. Genossenschaft: Stammdaten, Beitritt, Guthaben");
  pruefe(g.rechtsform === "eGen" && g.geschaeftsjahrEnde === "12-31", "Stammdaten AT bereinigt (eGen, Geschäftsjahr)");
  pruefe(wirft(() => G.genoBereinigen({ ...GENO, registerNr: "" }), 422), "eingetragen ohne Registernummer → 422");
  pruefe(wirft(() => G.genoBereinigen({ ...GENO, iban: "AT611904300234573202" }), 422), "IBAN mit falscher Prüfziffer → 422");
  pruefe(B.iban("DE89 3704 0044 0532 0130 00") === "DE89370400440532013000" && !B.iban("DE89370400440532013001"), "IBAN-Prüfziffer (Modulo 97)");
  pruefe(G.genoBereinigen({ name: "X", anteilEur: 100, land: "CH" }).kuendigungsfristMonate === 12, "CH: Kündigungsfrist ohne Angabe 12 Monate (Art. 844 OR)");
  const b = G.beitrittBereinigen(beitritt(), g, { heute: H });
  pruefe(b.betragEur === 1000 && b.bestaetigt.einzahlung && !b.freistellung, "Beitrittserklärung: 4 × 250 € = 1.000 €, Einzahlungsverpflichtung bestätigt");
  pruefe(wirft(() => G.beitrittBereinigen(beitritt(), { ...g, registerStatus: "aufbau" }, { heute: H }), 409), "Genossenschaft im Aufbau → 409 (nur Vormerkung)");
  pruefe(wirft(() => G.beitrittBereinigen(beitritt({ anteile: 1 }), g, { heute: H }), 422), "unter Pflichtbeteiligung → 422");
  pruefe(wirft(() => G.beitrittBereinigen(beitritt({ bestaetigt: { satzung: true } }), g, { heute: H }), 422), "fehlende Erklärungen → 422");
  pruefe(wirft(() => G.beitrittBereinigen(beitritt({ geburtsdatum: "2012-01-01" }), g, { heute: H }), 422), "minderjährig → 422 (Zustimmung der Vertreter)");
  pruefe(wirft(() => G.beitrittBereinigen(beitritt({ art: "verein", firma: "Verein" }), g, { heute: H }), 422), "Organisation ohne Vertretung → 422");
  pruefe(G.beitrittBestaetigungen({ nachschusspflicht: "beschraenkt" }).includes("nachschuss") && G.beitrittHinweise({ land: "DE", nachschusspflicht: "beschraenkt", haftsummeEur: 500 }).some((h) => /500/.test(h.text)), "Nachschusspflicht laut Satzung → zusätzliche Erklärung mit Haftsumme (§ 15a GenG)");
  pruefe(G.beitrittHinweise({ land: "DE" }).some((h) => /§ 15a GenG/.test(h.text)) && G.beitrittHinweise({ land: "DE" }).some((h) => /§ 30 GenG/.test(h.text)), "DE-Hinweise: § 15a (Einzahlung), § 30 (Mitgliederliste)");
  const gE = G.genoBereinigen({ ...GENO, eintrittsgeldEur: 10 });
  const m0 = { anteile: 4, eingezahltEur: 510 };
  pruefe(G.pflichtBetrag(m0, gE) === 1010 && G.offenerBetrag(m0, gE) === 500 && G.geschaeftsguthaben(m0, gE) === 500, "Pflichtbetrag, offene Einzahlung, Geschäftsguthaben (ohne Eintrittsgeld)");
  pruefe(G.naechsteNummer(["0001", "0007", ""]) === "0008", "Mitgliedsnummern fortlaufend");
  pruefe(G.RECHT_OFFEN.some((r) => /VermAnlG/.test(r.text)) && G.RECHT_OFFEN.some((r) => /FIDLEG/.test(r.text)) && G.RECHT_OFFEN.some((r) => /KMG/.test(r.text)), "offene Rechtspunkte: Prospekt-/Informationspflichten DE/AT/CH");

  abschnitt("A2. Kündigung, Übertragung, Ausschüttung");
  pruefe(G.kuendigungsStichtag("2026-09-30", 3) === "2026-12-31" && G.kuendigungsStichtag("2026-10-01", 3) === "2027-12-31", "Stichtag: 3 Monate zum Geschäftsjahresende (§ 65 GenG)");
  pruefe(G.kuendigungsStichtag("2026-02-15", 1, "06-30") === "2026-06-30", "abweichendes Geschäftsjahr");
  pruefe(G.auszahlungBis("2026-12-31", "DE") === "2027-06-30" && G.auszahlungBis("2026-12-31", "AT") === null, "Auszahlung DE binnen sechs Monaten (§ 73 GenG), AT/CH laut Satzung");
  const m = { status: "aktiv", anteile: 8, eingezahltEur: 2000, kuendigungen: [] };
  const k = G.kuendigungBereinigen({ art: "teil", anteile: 3, bestaetigt: true }, m, g, { heute: H });
  pruefe(k.wirksamZum === "2027-12-31" && G.auseinandersetzung(m, g, 3) === 750, "Teilkündigung 3 Anteile, Auseinandersetzungsguthaben 750 €");
  pruefe(wirft(() => G.kuendigungBereinigen({ art: "teil", anteile: 7, bestaetigt: true }, m, g, { heute: H }), 422), "Pflichtbeteiligung bleibt (§ 67b GenG) → 422");
  pruefe(wirft(() => G.kuendigungBereinigen({ art: "voll", bestaetigt: true }, { ...m, kuendigungen: [{ status: "eingereicht" }] }, g, { heute: H }), 409), "zweite offene Kündigung → 409");
  const u = G.uebertragungBereinigen({ anEmail: "a@example.com", anteile: 2, bestaetigt: true }, m, g);
  pruefe(u.betragEur === 500, "Übertragung 2 Anteile = 500 € Geschäftsguthaben");
  pruefe(wirft(() => G.uebertragungBereinigen({ anEmail: "a@example.com", anteile: 2, bestaetigt: true }, { ...m, eingezahltEur: 1000 }, g), 409), "nicht voll eingezahlt → 409");
  pruefe(wirft(() => G.uebertragungEmpfaengerPruefen({ status: "aktiv", anteile: 199 }, 2, g), 409) && wirft(() => G.uebertragungEmpfaengerPruefen(null, 1, g), 409), "Empfänger muss Mitglied sein, Höchstzahl beachten");
  const a = G.ausschuettungBereinigen({ art: "dividende", geschaeftsjahr: 2025, satzPct: "2" }, { heute: H });
  const r = G.ausschuettungBerechnen(a, [{ mitgliedId: "GM-1", guthabenEur: 2000 }, { mitgliedId: "GM-2", guthabenEur: 0 }], g);
  pruefe(r.anzahl === 1 && r.positionen[0].bruttoEur === 40 && r.positionen[0].steuerEur === 11 && r.positionen[0].nettoEur === 29, "Dividende 2 % auf 2.000 €: 40 € brutto, KESt 27,5 % = 11 €, netto 29 €");
  const rDe = G.ausschuettungBerechnen(a, [{ mitgliedId: "GM-1", guthabenEur: 2000 }, { mitgliedId: "GM-3", guthabenEur: 2000, freistellung: true }], { ...g, land: "DE" });
  pruefe(rDe.positionen[0].steuerEur === 10.55 && rDe.positionen[1].steuerEur === 0, "DE: KapESt + Soli 26,375 %, mit Freistellungsauftrag steuerfrei bis Pauschbetrag");
  pruefe(wirft(() => G.ausschuettungBereinigen({ art: "dividende", geschaeftsjahr: 2027, satzPct: 2 }, { heute: H }), 422) && wirft(() => G.ausschuettungBereinigen({ art: "dividende", geschaeftsjahr: 2025, satzPct: 20 }, { heute: H }), 422), "künftiges Geschäftsjahr bzw. Satz > 15 % → 422");
  const rv = G.ausschuettungBereinigen({ art: "rueckverguetung", geschaeftsjahr: 2025, ctProKwh: 1 }, { heute: H });
  pruefe(G.ausschuettungBerechnen(rv, [{ mitgliedId: "GM-1", umsatzKwh: 1500 }], g).summe.nettoEur === 15, "Rückvergütung 1 ct/kWh × 1.500 kWh = 15 € (ohne Abzug)");

  abschnitt("A3. Generalversammlung");
  const gvRoh = { titel: "GV", form: "online", datum: "2026-11-20T18:00", abstimmungBis: "2026-11-20T20:00", tagesordnung: [{ titel: "Bericht" }, { titel: "Jahresabschluss", beschluss: true }, { titel: "Satzung", beschluss: true, mehrheit: "einfach", satzung: true }] };
  const gv = V.versammlungBereinigen(gvRoh, g);
  pruefe(gv.tagesordnung.map((t) => t.id).join() === "T1,T2,T3" && gv.tagesordnung[2].mehrheit === "zweidrittel", "Tagesordnung nummeriert, Satzungsänderung AT mind. zwei Drittel");
  pruefe(V.versammlungBereinigen({ ...gvRoh, form: "praesenz", ort: "Saal" }, { ...g, land: "DE" }).tagesordnung[2].mehrheit === "dreiviertel", "DE: Satzungsänderung drei Viertel (§ 16 Abs. 2 GenG)");
  pruefe(V.versammlungBereinigen({ ...gvRoh, form: "praesenz", ort: "Saal" }, { ...g, land: "CH" }).tagesordnung[2].mehrheit === "zweidrittel", "CH: zwei Drittel (Art. 888 Abs. 2 OR)");
  pruefe(wirft(() => V.versammlungBereinigen(gvRoh, { ...g, onlineGv: false }), 422), "Online-Versammlung ohne Satzungsgrundlage → 422");
  pruefe(wirft(() => V.einladungPruefen({ ...gv, status: "entwurf", datum: "2026-10-05T18:00" }, g, { heute: H }), 422), "Einladungsfrist unterschritten → 422");
  pruefe(V.einladungPruefen({ ...gv, status: "entwurf" }, { ...g, land: "DE" }, { heute: H }).frist === 14 && G.einladungsfrist({ land: "CH" }) === 5, "Mindestfrist DE 14 Tage (§ 46 GenG), CH 5 Tage (Art. 882 OR)");
  const gvA = { ...gv, status: "abstimmung" };
  pruefe(V.abstimmungOffen(gvA, "2026-11-20T19:59") && !V.abstimmungOffen(gvA, "2026-11-20T20:01"), "Abstimmung nur bis zum Ende offen");
  pruefe(wirft(() => V.stimmeBereinigen({ T2: "ja" }, gvA), 422), "unvollständiger Stimmzettel → 422");
  const st = [{ id: "S1", am: "a", stimmen: { T2: "ja", T3: "ja" } }, { id: "S2", am: "b", stimmen: { T2: "nein", T3: "ja" } }, { id: "S3", am: "c", stimmen: { T2: "enthaltung", T3: "nein" } }];
  const e = V.ergebnisRechnen(gvA, st, 4);
  pruefe(!e.tops[0].angenommen && e.tops[1].angenommen && e.beteiligungPct === 75, "Ergebnis: 1:1 abgelehnt, 2:1 = zwei Drittel angenommen, Beteiligung 75 %");
  pruefe(V.angenommen(3, 1, "dreiviertel") && !V.angenommen(2, 1, "dreiviertel") && !V.angenommen(0, 0), "Mehrheiten: drei Viertel, keine Stimmen = abgelehnt");
  pruefe(V.stimmenKanonisch("GV-1", st) === V.stimmenKanonisch("GV-1", [...st].reverse()), "Prüfsumme unabhängig von der Reihenfolge");
  pruefe(wirft(() => V.abschlussBereinigen({ versammlungsleiter: "A", protokollfuehrer: "B", anwesend: 5 }, { ...gvA, form: "hybrid" }, { stimmberechtigt: 4, online: 0 }), 422), "mehr Anwesende als Stimmberechtigte → 422");
  const eh = V.ergebnisRechnen(gvA, st.slice(0, 1), 10, { anwesend: 3, tops: { T2: { ja: 1, nein: 2, enthaltung: 0 } } });
  pruefe(eh.teilgenommen === 4 && eh.tops[0].ja === 2 && eh.tops[0].nein === 2, "hybrid: Online-Stimmen + Auszählung im Saal");

  abschnitt("A4. Energiegemeinschaft");
  const eg = E.gemeinschaftBereinigen({ name: "EEG", land: "AT", form: "eeg_regional", netzbetreiber: "Netz", tarifBezugCt: 11, tarifEinspeisungCt: 9, plzListe: "5120, 5121", grundgebuehrMonat: 1.5 });
  pruefe(eg.plzListe.join() === "5120,5121", "PLZ-Liste bereinigt");
  pruefe(wirft(() => E.gemeinschaftBereinigen({ ...eg, tarifEinspeisungCt: 12 }), 422) && wirft(() => E.gemeinschaftBereinigen({ ...eg, form: "eeg_lokal", gebiet: "" }), 422), "Einspeisepreis > Bezugspreis bzw. lokale EEG ohne Trafostation → 422");
  pruefe(E.teilnahmeHindernisse({ land: "AT", plz: "4020" }, eg).length === 1 && E.teilnahmeHindernisse({ land: "AT", plz: "5121", smartMeter: true }, eg).length === 0, "Hindernisse: PLZ außerhalb des Gebiets");
  pruefe(E.rabattFuer("AT", "eeg_lokal").anteil === 0.57 && E.rabattFuer("AT", "eeg_regional").anteil === 0.28 && E.rabattFuer("CH", "leg").anteil === 0.4 && E.rabattFuer("DE", "energy_sharing").anteil === 0, "Netzentgelt-Rabatt aus markt.js (AT lokal 57 %, regional 28 %, CH LEG 40 %, DE 0)");
  const vd = E.verteilen(100, [{ id: "a", verbrauchKwh: 30 }, { id: "b", verbrauchKwh: 200 }]);
  pruefe(vd.zuteilung.a === 13 && vd.zuteilung.b === 87 && vd.ueberschussKwh === 0, "dynamisch: proportional zum Verbrauch");
  const vs = E.verteilen(100, [{ id: "a", verbrauchKwh: 30, anteilPct: 50 }, { id: "b", verbrauchKwh: 200, anteilPct: 50 }], "statisch");
  pruefe(vs.zuteilung.a === 30 && vs.zuteilung.b === 50 && vs.ueberschussKwh === 20, "statisch: fester Anteil, Rest ins Netz");
  const vu = E.verteilen(300, [{ id: "a", verbrauchKwh: 30 }, { id: "b", verbrauchKwh: 200 }]);
  pruefe(vu.zuteilung.a === 30 && vu.zuteilung.b === 200 && vu.ueberschussKwh === 70, "Überschuss bei Deckung aller Verbräuche");
  const ab = E.monatsabrechnung(eg, "2026-07", [{ id: "T1", stamm: { land: "AT", rolle: "bezug" }, messwerte: { verbrauchKwh: 300 } }, { id: "T2", stamm: { land: "AT", rolle: "beides" }, messwerte: { verbrauchKwh: 0, erzeugungKwh: 200 } }]);
  pruefe(ab.positionen[0].bezugGemeinschaftKwh === 200 && ab.positionen[0].bezugEur === 22 && ab.positionen[0].saldoEur === -23.5 && ab.positionen[1].gutschriftEur === 18 && !ab.geschaetzt, "Monatsabrechnung: 200 kWh × 11 ct = 22 €, Grundgebühr, Gutschrift 200 kWh × 9 ct = 18 €");
  pruefe(ab.positionen[0].ersparnisEur > 0, "Vorteil gegenüber Lieferant positiv (Energiepreis + Netzrabatt + Abgaben − Gemeinschaftspreis)");
  pruefe(E.monatsabrechnung(eg, "2026-07", [{ id: "T1", stamm: { land: "AT", rolle: "bezug" } }]).geschaetzt, "ohne Messwerte als Schätzung gekennzeichnet");
  pruefe(wirft(() => E.monatsabrechnung(eg, "2026-13", []), 422), "ungültiger Monat → 422");
  pruefe(JSON.stringify(E.messwerteBereinigen({ "ET-26-ABCDEF": { verbrauchKwh: "12,5" }, boese: { verbrauchKwh: 1 } })) === JSON.stringify({ "ET-26-ABCDEF": { verbrauchKwh: 12.5, erzeugungKwh: 0 } }), "Messwerte: nur gültige Kennungen");

  abschnitt("A5. Gemeindecockpit");
  pruefe(C.VERFAHREN.DE[0].id === "aufstellung" && C.VERFAHREN.AT.some((s) => s.id === "umwidmung") && C.VERFAHREN.CH.some((s) => /Art\. 26 RPG/.test(s.norm)), "Verfahren DE (BauGB), AT (Umwidmung), CH (RPG)");
  pruefe(wirft(() => C.schrittBereinigen({ schritt: "umwidmung" }, "DE"), 422) && wirft(() => C.schrittBereinigen({ schritt: "satzung", status: "erledigt" }, "DE"), 422), "fremder Schritt bzw. erledigt ohne Datum → 422");
  const vst = C.verfahrenStand("DE", { aufstellung: { status: "erledigt", datum: "2026-01-01" }, fnp: { status: "entfaellt" } });
  pruefe(vst.erledigt === 1 && vst.gesamt === C.VERFAHREN.DE.length - 1 && vst.naechster.id === "fruehzeitig", "Fortschritt ohne entfallende Schritte, nächster Schritt");
  const z = C.zahlungBereinigen({ art: "par6", jahr: 2028, kwh: 30000000, ctProKwh: "0,2" }, "DE");
  pruefe(z.betragEur === 60000, "§ 6 EEG: 30 GWh × 0,2 ct = 60.000 €");
  pruefe(wirft(() => C.zahlungBereinigen({ art: "par6", jahr: 2028, kwh: 1, ctProKwh: 0.3 }, "DE"), 422) && wirft(() => C.zahlungBereinigen({ art: "par6", jahr: 2028, kwh: 1, ctProKwh: 0.2 }, "AT"), 422), "§ 6 EEG über 0,2 ct bzw. in AT → 422");
  const es = C.einnahmenSumme([{ art: "par6", jahr: 2028, status: "vereinbart", betragEur: 100 }, { art: "gewerbesteuer", jahr: 2029, status: "prognose", betragEur: 50 }, { art: "pacht", jahr: 2027, status: "gezahlt", betragEur: 10 }]);
  pruefe(es.vereinbart === 100 && es.prognose === 50 && es.gezahlt === 10, "Einnahmen getrennt nach Prognose, vereinbart, gezahlt");
  const mat = C.materialEntwurf("pressemitteilung", { gemeinde: { name: "Demo-Stadt", land: "DE" }, projekt: { art: "Freiflächen-PV", ha: 31, phase: "Bauleitplanung", par6: { kwp: 28000, kwh: 28000000, euroProJahr: 56000 } } });
  pruefe(/Demo-Stadt/.test(mat.titel) && mat.absaetze.some((x) => /§ 6 EEG/.test(x)) && /Entwurf/.test(mat.hinweis), "Pressetext-Entwurf mit § 6 EEG und Entwurfshinweis");
  pruefe(Object.keys(C.MATERIAL_VORLAGEN).every((k) => C.materialEntwurf(k, { gemeinde: { name: "G", land: "AT" } }).absaetze.length > 0) && C.materialEntwurf("faq", { gemeinde: { name: "G", land: "AT" } }).absaetze.some((x) => /vertraglich/.test(x)), "alle Vorlagen, AT ohne gesetzliche Kommunalabgabe");

  abschnitt("A6. Frappe-Kopien, Markt-Werte, Rechte, Code-Verdrahtung");
  pruefe(M.GEMEINSCHAFTEN.steuerAbzug.DE === 0.26375 && M.GEMEINSCHAFTEN.steuerAbzug.AT === 0.275 && M.GEMEINSCHAFTEN.steuerAbzug.CH === 0.35, "markt.js: Steuerabzug DE/AT/CH");
  const py = datei("Backend-Import/oekoinvest_app/oekoinvest_app/plattform/mitglied_kern.py");
  const sa = M.GEMEINSCHAFTEN.steuerAbzug;
  pruefe(py.includes(`STEUER_ABZUG = {"DE": ${sa.DE}, "AT": ${sa.AT}, "CH": ${sa.CH}, "freibetragDeEur": ${sa.freibetragDeEur}}`), "mitglied_kern.py: Steuerabzug = markt.js");
  const rr = M.GEMEINSCHAFTEN.rechner;
  pruefe(["de", "at", "ch"].every((l) => py.includes(`"energiepreis": ${rr[l].energiepreis}, "netzAp": ${rr[l].netzAp}, "abgabenCt": ${rr[l].abgabenCt}, "ueberschussCt": ${rr[l].ueberschussCt}`)), "mitglied_kern.py: Rechnerwerte Energiegemeinschaft = markt.js");
  pruefe(py.includes(`PV_MONATSANTEILE = [${M.ALLGEMEIN.pvMonatsanteile.join(", ")}]`), "mitglied_kern.py: PV-Monatsanteile = markt.js");
  pruefe(datei("Backend-Import/oekoinvest_app/oekoinvest_app/plattform/gemeinde_kern.py").includes(`BETEILIGUNG_CT = ${M.KOMMUNE.beteiligungCt}`), "gemeinde_kern.py: § 6-Satz = markt.js");
  // Gleichheit JS ↔ Python an Beispielen (falls Python verfügbar)
  const beispiel = {
    stichtage: [["2026-09-30", 3, "12-31"], ["2026-10-01", 6, "12-31"], ["2026-02-28", 1, "06-30"], ["2026-11-30", 12, "12-31"]],
    ausschuettung: { a: { art: "dividende", geschaeftsjahr: 2025, satzPct: 3.5, stichtag: "2025-12-31" }, m: [{ mitgliedId: "A", guthabenEur: 1234.56 }, { mitgliedId: "B", guthabenEur: 50000, freistellung: true }] },
    verteilen: [[500, [{ id: "a", verbrauchKwh: 120 }, { id: "b", verbrauchKwh: 400 }, { id: "c", verbrauchKwh: 55 }], "dynamisch"], [500, [{ id: "a", verbrauchKwh: 120, anteilPct: 30 }, { id: "b", verbrauchKwh: 400, anteilPct: 70 }], "statisch"]],
    eg: { name: "EEG", land: "AT", form: "eeg_lokal", netzbetreiber: "N", gebiet: "Trafo", tarifBezugCt: 12, tarifEinspeisungCt: 8.5, grundgebuehrMonat: 2, verteilschluessel: "dynamisch", status: "aktiv", plzListe: [] },
    tn: [{ id: "T1", stamm: { land: "AT", rolle: "bezug", jahresverbrauchKwh: 4200 } }, { id: "T2", stamm: { land: "AT", rolle: "beides", jahresverbrauchKwh: 9000, anlageKwp: 45 } }, { id: "T3", stamm: { land: "AT", rolle: "bezug" }, messwerte: { verbrauchKwh: 333 } }],
    ergebnis: { gv: { tagesordnung: [{ id: "T1", titel: "A", beschluss: true, mehrheit: "einfach" }, { id: "T2", titel: "B", beschluss: true, mehrheit: "dreiviertel" }] }, st: [{ stimmen: { T1: "ja", T2: "ja" } }, { stimmen: { T1: "nein", T2: "ja" } }, { stimmen: { T1: "ja", T2: "nein" } }], zusatz: { anwesend: 2, tops: { T2: { ja: 2 } } } },
    zahlung: { art: "par6", jahr: 2030, kwh: 12345678, ctProKwh: 0.15 },
  };
  const js = {
    stichtage: beispiel.stichtage.map((x) => G.kuendigungsStichtag(...x)),
    ausschuettung: G.ausschuettungBerechnen(beispiel.ausschuettung.a, beispiel.ausschuettung.m, { land: "DE" }).positionen.map((p) => [p.bruttoEur, p.steuerEur, p.nettoEur]),
    verteilen: beispiel.verteilen.map(([e, t, s]) => E.verteilen(e, t, s)),
    abrechnung: E.monatsabrechnung(beispiel.eg, "2026-06", beispiel.tn).positionen.map((p) => [p.verbrauchKwh, p.erzeugungKwh, p.bezugGemeinschaftKwh, p.einspeisungGemeinschaftKwh, p.bezugEur, p.gutschriftEur, p.saldoEur, p.ersparnisEur]),
    ergebnis: V.ergebnisRechnen(beispiel.ergebnis.gv, beispiel.ergebnis.st, 6, beispiel.ergebnis.zusatz).tops.map((t) => [t.ja, t.nein, t.angenommen]),
    zahlung: C.zahlungBereinigen(beispiel.zahlung, "DE").betragEur,
  };
  const pyCode = `
import json, sys
from oekoinvest_app.plattform import mitglied_kern as K, gemeinde_kern as C
b = json.loads(sys.stdin.read())
out = {
 "stichtage": [K.kuendigungs_stichtag(*x) for x in b["stichtage"]],
 "ausschuettung": [[p["bruttoEur"], p["steuerEur"], p["nettoEur"]] for p in K.ausschuettung_berechnen(b["ausschuettung"]["a"], b["ausschuettung"]["m"], {"land": "DE"})["positionen"]],
 "verteilen": [K.verteilen(e, t, s) for e, t, s in b["verteilen"]],
 "abrechnung": [[p["verbrauchKwh"], p["erzeugungKwh"], p["bezugGemeinschaftKwh"], p["einspeisungGemeinschaftKwh"], p["bezugEur"], p["gutschriftEur"], p["saldoEur"], p["ersparnisEur"]] for p in K.monatsabrechnung(b["eg"], "2026-06", b["tn"])["positionen"]],
 "ergebnis": [[t["ja"], t["nein"], t["angenommen"]] for t in K.ergebnis_rechnen(b["ergebnis"]["gv"], b["ergebnis"]["st"], 6, b["ergebnis"]["zusatz"])["tops"]],
 "zahlung": C.zahlung_bereinigen(b["zahlung"], "DE")["betragEur"],
}
print(json.dumps(out))`;
  let pyAus = null;
  for (const exe of ["python", "python3"]) {
    try {
      pyAus = JSON.parse(execFileSync(exe, ["-c", pyCode], { input: JSON.stringify(beispiel), cwd: path.join(WURZEL, "Backend-Import/oekoinvest_app"), encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }));
      break;
    } catch {
      pyAus = null;
    }
  }
  if (!pyAus) ueberspringen("Python nicht verfügbar – Abgleich JS ↔ Python übersprungen");
  else {
    const norm = (x) => JSON.stringify(x, (k, w) => (typeof w === "number" ? Math.round(w * 1000) / 1000 : w));
    for (const k of Object.keys(js)) pruefe(norm(js[k]) === norm(pyAus[k]), `JS = Python: ${k}`, { js: js[k], py: pyAus[k] });
  }
  pruefe(R.RECHTE_MATRIX.genossenschaft?.buchhaltung === 2 && R.RECHTE_MATRIX.genossenschaft?.energie === 2 && R.RECHTE_MATRIX.genossenschaft?.betrieb === 0 && R.RECHTE_MATRIX.kommunen?.akquise === 2 && R.RECHTE_MATRIX.kommunen?.energie === 0, "rechte.js: Bereiche genossenschaft und kommunen");
  pruefe(R.seitenBereich("/portal/admin/genossenschaft") === "genossenschaft" && R.seitenBereich("/portal/admin/energiegemeinschaften") === "genossenschaft", "Admin-Seiten → Bereich genossenschaft");
  pruefe(R.apiAnforderungen({ pfad: "/api/admin/genossenschaft", methode: "POST" })[0].bereich === "genossenschaft" && R.apiAnforderungen({ pfad: "/api/admin/energiegemeinschaften", methode: "GET" })[0].bereich === "genossenschaft", "Admin-APIs → Bereich genossenschaft");
  const rpy = datei("Backend-Import/oekoinvest_app/oekoinvest_app/plattform/rechte.py");
  pruefe(/_M\["genossenschaft"\] = \[2, 1, 1, 2, 1, 0, 1, 0, 2\]/.test(rpy) && /_M\["kommunen"\] = \[2, 2, 1, 1, 1, 0, 0, 2, 0\]/.test(rpy), "rechte.py: gleiche Zeilen wie rechte.js");
  const rahmen = datei("src/components/Portal/PortalRahmen.js");
  pruefe(rahmen.includes('href: "/portal/admin/genossenschaft"') && rahmen.includes('href: "/portal/admin/energiegemeinschaften"') && rahmen.includes('versammlung: "Generalversammlung"'), "Menü und Brotkrumen Backoffice");
  const fr = await Promise.all(["src/lib/plattform/backend/frappe/mitglied.js", "src/lib/plattform/backend/frappe/gemeinde.js"].map(datei));
  const api = datei("Backend-Import/oekoinvest_app/oekoinvest_app/plattform/api/mitglied.py") + datei("Backend-Import/oekoinvest_app/oekoinvest_app/plattform/api/gemeinde.py");
  const methoden = fr.join("\n").match(/"(mitglied|gemeinde)\.[a-z_]+"/g).map((x) => x.slice(1, -1).split(".")[1]);
  pruefe(methoden.length === 22 && methoden.every((m) => new RegExp(`@frappe\\.whitelist\\(methods=\\["POST"\\]\\)\\ndef ${m}\\(`).test(api)), "jede Adapter-Methode ist in Frappe whitelisted (POST)", methoden.filter((m) => !new RegExp(`def ${m}\\(`).test(api)));
  pruefe(!/allow_guest/.test(api), "keine Gast-Methoden");
}

// ================================================================ Teil B – HTTP

class Client {
  constructor(name) {
    this.name = name;
    this.cookie = "";
  }
  async anfrage(methode, pfad, body, { origin = BASIS, kopf = {} } = {}) {
    const headers = { ...kopf };
    if (origin) headers.Origin = origin;
    if (this.cookie) headers.Cookie = this.cookie;
    let payload;
    if (body !== undefined) {
      headers["Content-Type"] ||= "application/json";
      payload = typeof body === "string" ? body : JSON.stringify(body);
    }
    let res;
    for (let versuch = 1; ; versuch++) {
      try {
        res = await fetch(BASIS + pfad, { method: methode, headers, body: payload, redirect: "manual", signal: AbortSignal.timeout(180000) });
        if (res.status >= 500 && /text\/html/.test(res.headers.get("content-type") || "") && pfad.startsWith("/api/") && versuch < 4) {
          await new Promise((r) => setTimeout(r, 3000 * versuch));
          continue;
        }
        break;
      } catch (e) {
        if (versuch >= 3) throw e;
        await new Promise((r) => setTimeout(r, 5000 * versuch));
      }
    }
    for (const c of res.headers.getSetCookie?.() || []) {
      const [paar] = c.split(";");
      const [name, wert] = paar.split("=");
      if (/oi_sitzung$/.test(name)) this.cookie = wert ? `${name}=${wert}` : "";
    }
    const typ = res.headers.get("content-type") || "";
    if (/application\/pdf/.test(typ)) {
      const buf = Buffer.from(await res.arrayBuffer());
      return { status: res.status, json: {}, text: "", pdf: buf, typ };
    }
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 200) };
    }
    return { status: res.status, json, text, typ };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  put = (p, b, o) => this.anfrage("PUT", p, b ?? {}, o);
  async login(email, passwort = DEMO_PASSWORT) {
    const r = await this.post("/api/auth/login", { email, passwort });
    if (r.status !== 200) throw new Error(`Login ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }
  async registrieren(schluessel, rollen, extra = {}) {
    const email = extra.email || `mt-test-${LAUF}-${schluessel}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email, passwort: PASSWORT, vorname: "Mitglied", nachname: `Test ${schluessel}`, rollen, agb: true, ...extra });
    if (r.status !== 201) throw new Error(`Registrierung ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    this.email = email;
    return r;
  }
}

const IBAN_DE = "DE89370400440532013000";
const IBAN_AT = "AT611904300234573201";

async function http() {
  const gast = new Client("gast");
  const admin = new Client("admin");
  const a = new Client("mitglied-a");
  const b = new Client("mitglied-b");
  const c = new Client("mitglied-c");
  const firma = new Client("unternehmen");
  const akquise = new Client("bo-akquise");
  const betrieb = new Client("bo-betrieb");
  const demoMitglied = new Client("mitglied@");
  await admin.login("admin@example.com");
  await akquise.login("bo-akquise@example.com");
  await betrieb.login("bo-betrieb@example.com");
  await demoMitglied.login("mitglied@example.com");
  await a.registrieren("a", ["mitglied"]);
  await b.registrieren("b", ["mitglied"]);
  await c.registrieren("c", ["mitglied"]);
  await firma.registrieren("firma", ["unternehmen"]);
  const H = heute();
  const jahr = Number(H.slice(0, 4));

  abschnitt("B1. Demo-Daten und Rechte Mitgliederbereich");
  let r = await demoMitglied.get("/api/portal/mitglied");
  const demoAt = r.json.genos?.find((g) => g.land === "AT" && g.registerStatus === "eingetragen");
  pruefe(r.status === 200 && demoAt && r.json.genos.some((g) => g.registerStatus === "aufbau"), "Demo: eingetragene AT-eGen und DE-eG im Aufbau", r.json.genos?.map((g) => [g.name, g.registerStatus]));
  const demoM = r.json.mitgliedschaften?.find((m) => m.genoId === demoAt?.id);
  pruefe(demoM?.status === "aktiv" && demoM.kennzahlen.guthabenEur > 0 && /•/.test(demoM.beitritt?.iban || ""), "Demo-Mitglied aktiv, IBAN maskiert", demoM);
  pruefe(r.json.versammlungen?.some((v) => v.status === "abgeschlossen" && v.ergebnis?.tops?.length) && r.json.ausschuettungen?.length >= 1 && r.json.eg?.abrechnungen?.length >= 1, "Demo: Protokoll, Ausschüttung, EEG-Abrechnungen vorhanden");
  r = await gast.get("/api/portal/mitglied");
  pruefe(r.status === 401, "ohne Anmeldung → 401", r.status);
  r = await firma.get("/api/portal/mitglied");
  pruefe(r.status === 403, "Unternehmen → 403", r.status);
  r = await betrieb.get("/api/admin/genossenschaft");
  pruefe(r.status === 403, "Backoffice Betrieb ohne Bereich → 403", r.status);
  r = await akquise.get("/api/admin/genossenschaft");
  pruefe(r.status === 200 && r.json.darfSchreiben === false, "Backoffice Akquise: nur lesen", r.status);
  r = await akquise.post("/api/admin/genossenschaft", { aktion: "genoSpeichern", daten: { name: "X", anteilEur: 100 } });
  pruefe(r.status === 403, "Backoffice Akquise schreibt nicht → 403", r.status);
  r = await a.post("/api/portal/mitglied", { aktion: "beitritt", genoId: demoAt?.id }, { origin: null });
  pruefe(r.status === 403, "CSRF: ohne Origin → 403", r.status);
  r = await a.post("/api/portal/mitglied", { aktion: "beitritt", genoId: demoAt?.id }, { origin: "https://boese.example" });
  pruefe(r.status === 403, "CSRF: fremder Origin → 403", r.status);

  abschnitt("B2. Test-Genossenschaft anlegen (Backoffice)");
  const genoDaten = { name: `mt-test ${LAUF} eG (Test)`, land: "DE", registerStatus: "eingetragen", registerNr: "GnR 999 (Test)", registergericht: "Amtsgericht (Test)", pruefungsverband: "Prüfungsverband (Test)", anteilEur: 100, minAnteile: 2, maxAnteile: 20, kuendigungsfristMonate: 3, iban: IBAN_DE, satzungStand: "2026-01-15", onlineGv: true, einladungsfristTage: 14 };
  r = await admin.post("/api/admin/genossenschaft", { aktion: "genoSpeichern", daten: { ...genoDaten, iban: "" } });
  pruefe(r.status === 422, "eingetragen ohne Konto → 422", r.json);
  r = await admin.post("/api/admin/genossenschaft", { aktion: "genoSpeichern", daten: genoDaten });
  const geno = r.json.geno;
  pruefe(r.status === 200 && geno?.id && geno.rechtsform === "eG" && geno.hinweise?.length === 5, "Genossenschaft angelegt (eG, 5 Pflichterklärungen)", r.json);
  const best = Object.fromEntries(geno.hinweise.map((h) => [h.id, true]));
  const beitritt = (x = {}) => ({ art: "privat", vorname: "Mitglied", nachname: "Test", strasse: "Teststraße 1", plz: "87842", ort: "Teststadt", iban: IBAN_DE, anteile: 4, bestaetigt: best, freistellung: true, ...x });

  abschnitt("B3. Beitritt, Zulassung, Einzahlung, Anteilsbestätigung");
  r = await a.post("/api/portal/mitglied", { aktion: "beitritt", genoId: geno.id, daten: beitritt({ bestaetigt: {} }) });
  pruefe(r.status === 422, "ohne Erklärungen → 422", r.json);
  r = await a.post("/api/portal/mitglied", { aktion: "beitritt", genoId: geno.id, daten: beitritt({ anteile: 50 }) });
  pruefe(r.status === 422 && /zwischen 2 und 20/.test(r.json.error), "über Höchstzahl → 422", r.json);
  r = await a.post("/api/portal/mitglied", { aktion: "beitritt", genoId: geno.id, daten: beitritt() });
  const mA = r.json.mitgliedschaft;
  pruefe(r.status === 200 && mA?.status === "erklaert" && mA.kennzahlen.pflichtEur === 400 && mA.vorgangId, "Beitrittserklärung abgegeben, Vorgang für Unterschrift/Rückfragen", r.json);
  r = await a.post("/api/portal/mitglied", { aktion: "beitritt", genoId: geno.id, daten: beitritt() });
  pruefe(r.status === 409, "zweite Erklärung → 409", r.status);
  r = await a.get(`/api/portal/mitglied/pdf?art=beitritt&id=${mA?.id}`);
  pruefe(r.status === 200 && r.pdf?.subarray(0, 5).toString() === "%PDF-", "Beitrittserklärung als PDF (Muster)", r.status);
  r = await b.get(`/api/portal/mitglied/pdf?art=beitritt&id=${mA?.id}`);
  pruefe(r.status === 404, "fremde Beitrittserklärung → 404", r.status);
  r = await a.get(`/api/portal/mitglied/pdf?art=bestaetigung&id=${mA?.id}`);
  pruefe(r.status === 409, "Anteilsbestätigung vor Einzahlung → 409", r.status);
  r = await b.post("/api/portal/mitglied", { aktion: "zurueckziehen", id: mA?.id });
  pruefe(r.status === 403, "fremde Mitgliedschaft bearbeiten → 403", r.status);
  const mitglied = (id, mitgliedAktion, x = {}) => admin.post("/api/admin/genossenschaft", { aktion: "mitglied", id, mitgliedAktion, ...x });
  r = await mitglied(mA?.id, "zulassen", {});
  pruefe(r.status === 422, "Zulassung ohne Unterschrift → 422", r.json);
  r = await akquise.post("/api/admin/genossenschaft", { aktion: "mitglied", id: mA?.id, mitgliedAktion: "zulassen", unterschrift: true });
  pruefe(r.status === 403, "Akquise darf nicht zulassen → 403", r.status);
  r = await mitglied(mA?.id, "zulassen", { unterschrift: true });
  pruefe(r.status === 200 && r.json.ergebnis?.status === "zugelassen" && r.json.ergebnis.nr === "0001" && r.json.ergebnis.einzahlungFrist, "zugelassen, Mitgliedsnummer 0001, Einzahlungsfrist", r.json);
  r = await mitglied(mA?.id, "einzahlung", { betragEur: 500, am: H });
  pruefe(r.status === 422, "Überzahlung → 422 (kein Einlagengeschäft)", r.json);
  r = await mitglied(mA?.id, "einzahlung", { betragEur: 150, am: plusTageIso(3) });
  pruefe(r.status === 422, "Zahlungseingang in der Zukunft → 422", r.json);
  r = await mitglied(mA?.id, "einzahlung", { betragEur: 150, am: H, referenz: "Test" });
  pruefe(r.status === 200 && r.json.ergebnis?.status === "zugelassen" && r.json.ergebnis.kennzahlen.offenEur === 250, "Teilzahlung gebucht, 250 € offen", r.json.ergebnis?.kennzahlen);
  r = await mitglied(mA?.id, "einzahlung", { betragEur: 250, am: H });
  pruefe(r.status === 200 && r.json.ergebnis?.status === "aktiv" && r.json.ergebnis.aktivSeit === H, "vollständig eingezahlt → Mitglied aktiv", r.json.ergebnis);
  r = await a.get(`/api/portal/mitglied/pdf?art=bestaetigung&id=${mA?.id}`);
  pruefe(r.status === 200 && r.pdf?.length > 1000, "Anteilsbestätigung als PDF", r.status);
  r = await a.get("/api/portal/benachrichtigungen?limit=50");
  pruefe(r.status === 200 && ["Beitritt zugelassen", "Mitgliedschaft aktiv"].every((t) => (r.json.eintraege || []).some((x) => x.titel === t)), "Benachrichtigungen: zugelassen, aktiv", (r.json.eintraege || []).map((x) => x.titel));
  // B und C: B wird Mitglied, C bleibt Außenstehender
  r = await b.post("/api/portal/mitglied", { aktion: "beitritt", genoId: geno.id, daten: beitritt({ anteile: 2, vorname: "Berta" }) });
  const mB = r.json.mitgliedschaft;
  await mitglied(mB?.id, "zulassen", { unterschrift: true });
  r = await mitglied(mB?.id, "einzahlung", { betragEur: 200, am: H });
  pruefe(r.json.ergebnis?.status === "aktiv" && r.json.ergebnis.nr === "0002", "zweites Mitglied aktiv (Nr. 0002)", r.json);

  abschnitt("B4. Weitere Anteile, Übertragung, Kündigung");
  r = await a.post("/api/portal/mitglied", { aktion: "zeichnen", id: mA?.id, anteile: 2, bestaetigt: {} });
  pruefe(r.status === 422, "Zeichnung ohne Einzahlungsverpflichtung → 422", r.json);
  r = await a.post("/api/portal/mitglied", { aktion: "zeichnen", id: mA?.id, anteile: 2, bestaetigt: { einzahlung: true } });
  const zid = r.json.ergebnis?.zeichnungen?.[0]?.id;
  pruefe(r.status === 200 && zid, "2 weitere Anteile beantragt", r.json);
  r = await mitglied(mA?.id, "zeichnungZulassen", { zeichnungId: zid });
  pruefe(r.status === 200 && r.json.ergebnis?.anteile === 6 && r.json.ergebnis.kennzahlen.offenEur === 200, "Zeichnung zugelassen, 200 € offen", r.json.ergebnis);
  r = await a.post("/api/portal/mitglied", { aktion: "uebertragen", id: mA?.id, anEmail: b.email, anteile: 2, bestaetigt: true });
  pruefe(r.status === 409, "Übertragung bei offener Einzahlung → 409", r.json);
  await mitglied(mA?.id, "einzahlung", { betragEur: 200, am: H });
  r = await a.post("/api/portal/mitglied", { aktion: "uebertragen", id: mA?.id, anEmail: c.email, anteile: 2, bestaetigt: true });
  pruefe(r.status === 409, "Empfänger ohne Mitgliedschaft → 409", r.json);
  r = await a.post("/api/portal/mitglied", { aktion: "uebertragen", id: mA?.id, anEmail: b.email, anteile: 2, bestaetigt: true });
  pruefe(r.status === 200 && r.json.ergebnis?.uebertragungen?.[0]?.status === "angefragt", "Übertragung an Mitglied angefragt", r.json);
  r = await b.get("/api/portal/mitglied");
  const ue = r.json.eingehend?.[0];
  pruefe(ue?.anteile === 2 && ue.betragEur === 200, "Empfänger sieht eingehende Übertragung", r.json.eingehend);
  r = await c.post("/api/portal/mitglied", { aktion: "uebertragungAnnehmen", uebertragungId: ue?.id });
  pruefe(r.status === 404, "Dritter kann nicht annehmen → 404", r.status);
  r = await b.post("/api/portal/mitglied", { aktion: "uebertragungAnnehmen", uebertragungId: ue?.id });
  pruefe(r.status === 200, "Empfänger nimmt an", r.json);
  r = await admin.post("/api/admin/genossenschaft", { aktion: "mitglied", id: ue?.id, mitgliedAktion: "uebertragungGenehmigen", uebertragungId: ue?.id });
  pruefe(r.status === 200, "Vorstand stimmt zu", r.json);
  r = await admin.get("/api/admin/genossenschaft");
  const liste = (r.json.mitglieder || []).filter((m) => m.genoId === geno.id);
  pruefe(liste.find((m) => m.id === mA?.id)?.anteile === 4 && liste.find((m) => m.id === mB?.id)?.anteile === 4 && liste.find((m) => m.id === mB?.id)?.kennzahlen.guthabenEur === 400, "Anteile und Guthaben übertragen (6→4, 2→4)", liste.map((m) => [m.nr, m.anteile, m.kennzahlen.guthabenEur]));
  r = await a.post("/api/portal/mitglied", { aktion: "kuendigen", id: mA?.id, art: "teil", anteile: 3, bestaetigt: true });
  pruefe(r.status === 422, "Teilkündigung unter Pflichtbeteiligung → 422", r.json);
  r = await a.post("/api/portal/mitglied", { aktion: "kuendigen", id: mA?.id, art: "teil", anteile: 1, bestaetigt: true });
  const kue = r.json.ergebnis?.kuendigungen?.[0];
  const G = await lade("src/lib/plattform/mitglied/genossenschaft.js");
  pruefe(r.status === 200 && kue?.wirksamZum === G.kuendigungsStichtag(H, 3) && kue.auszahlungBis && kue.betragEur === 100, "Kündigung 1 Anteil: Stichtag, Auszahlungsfrist, 100 €", kue);
  r = await mitglied(mA?.id, "kuendigungBestaetigen", { kuendigungId: kue?.id });
  pruefe(r.status === 200 && r.json.ergebnis?.kuendigungen?.[0]?.status === "bestaetigt", "Kündigung bestätigt", r.json);
  r = await mitglied(mA?.id, "kuendigungVollziehen", { kuendigungId: kue?.id });
  pruefe(r.status === 409, "vor dem Stichtag nicht vollziehbar → 409", r.json);
  r = await a.post("/api/portal/mitglied", { aktion: "kuendigen", id: mA?.id, art: "voll", bestaetigt: true });
  pruefe(r.status === 409, "zweite Kündigung → 409", r.status);

  abschnitt("B5. Generalversammlung mit Online-Abstimmung");
  const gvDaten = (tage) => ({ titel: `Außerordentliche GV ${LAUF} (Test)`, art: "ausserordentlich", form: "hybrid", datum: `${plusTageIso(tage)}T18:00`, abstimmungBis: `${plusTageIso(tage)}T20:00`, ort: "Testsaal", tagesordnung: [{ titel: "Bericht" }, { titel: "Beschluss Beteiligung", beschluss: true }, { titel: "Satzungsänderung", beschluss: true, satzung: true, mehrheit: "einfach" }], unterlagen: [{ titel: "Vorlage", text: "Text" }] });
  r = await admin.post("/api/admin/genossenschaft", { aktion: "gvSpeichern", genoId: geno.id, daten: gvDaten(3) });
  const gvKurz = r.json.versammlung;
  r = await admin.post("/api/admin/genossenschaft", { aktion: "gv", id: gvKurz?.id, gvAktion: "einladen" });
  pruefe(r.status === 422 && /14 Tage/.test(r.json.error), "Einladung 3 Tage vorher → 422 (§ 46 GenG)", r.json);
  await admin.post("/api/admin/genossenschaft", { aktion: "gv", id: gvKurz?.id, gvAktion: "absagen", grund: "Frist nicht einhaltbar (Test)" });
  r = await admin.post("/api/admin/genossenschaft", { aktion: "gvSpeichern", genoId: geno.id, daten: gvDaten(20) });
  const gv = r.json.versammlung;
  pruefe(r.status === 200 && gv?.status === "entwurf" && gv.tagesordnung[2].mehrheit === "dreiviertel", "Versammlung angelegt, Satzungsänderung DE drei Viertel", r.json);
  r = await a.get(`/api/portal/mitglied/versammlung/${gv?.id}`);
  pruefe(r.status === 404, "Entwurf für Mitglieder nicht sichtbar → 404", r.status);
  r = await admin.post("/api/admin/genossenschaft", { aktion: "gv", id: gv?.id, gvAktion: "einladen" });
  pruefe(r.status === 200 && r.json.versammlung?.status === "eingeladen", "eingeladen", r.json);
  r = await admin.post("/api/admin/genossenschaft", { aktion: "gvSpeichern", id: gv?.id, genoId: geno.id, daten: gvDaten(25) });
  pruefe(r.status === 409, "nach Einladung keine Änderung → 409", r.status);
  r = await a.post("/api/portal/mitglied", { aktion: "abstimmen", gvId: gv?.id, stimmen: { T2: "ja", T3: "ja" } });
  pruefe(r.status === 409, "vor Öffnung keine Stimme → 409", r.status);
  r = await admin.post("/api/admin/genossenschaft", { aktion: "gv", id: gv?.id, gvAktion: "oeffnen" });
  pruefe(r.status === 200 && r.json.versammlung?.status === "abstimmung", "Online-Abstimmung geöffnet", r.json);
  r = await a.post("/api/portal/mitglied", { aktion: "abstimmen", gvId: gv?.id, stimmen: { T2: "ja" } });
  pruefe(r.status === 422, "unvollständig → 422", r.json);
  r = await a.post("/api/portal/mitglied", { aktion: "abstimmen", gvId: gv?.id, stimmen: { T2: "ja", T3: "ja" } });
  pruefe(r.status === 200, "Mitglied A stimmt ab", r.json);
  r = await a.post("/api/portal/mitglied", { aktion: "abstimmen", gvId: gv?.id, stimmen: { T2: "nein", T3: "nein" } });
  pruefe(r.status === 409, "zweite Stimme → 409", r.status);
  r = await c.post("/api/portal/mitglied", { aktion: "abstimmen", gvId: gv?.id, stimmen: { T2: "ja", T3: "ja" } });
  pruefe(r.status === 403, "Nicht-Mitglied → 403", r.status);
  r = await c.get(`/api/portal/mitglied/versammlung/${gv?.id}`);
  pruefe(r.status === 404, "Nicht-Mitglied sieht Versammlung nicht → 404", r.status);
  r = await b.post("/api/portal/mitglied", { aktion: "abstimmen", gvId: gv?.id, stimmen: { T2: "ja", T3: "nein" } });
  r = await a.get(`/api/portal/mitglied/versammlung/${gv?.id}`);
  pruefe(r.status === 200 && r.json.versammlung?.eigeneStimme?.stimmen?.T2 === "ja" && !r.json.versammlung.zwischenstand && !r.json.versammlung.teilnahme, "Mitglied sieht eigene Stimme, keinen Zwischenstand", r.json.versammlung);
  r = await admin.get(`/api/portal/mitglied/versammlung/${gv?.id}`);
  pruefe(r.status === 200 && r.json.versammlung?.zwischenstand?.tops?.[0]?.ja === 2 && r.json.versammlung.teilnahme?.every((t) => t.abgestimmt === true && !("stimmen" in t)), "Backoffice: Zwischenstand und Teilnahme ohne Einzelstimmen", r.json.versammlung?.zwischenstand);
  r = await admin.post("/api/admin/genossenschaft", { aktion: "gv", id: gv?.id, gvAktion: "abschliessen", versammlungsleiter: "", protokollfuehrer: "" });
  pruefe(r.status === 422, "Abschluss ohne Leitung → 422", r.json);
  r = await admin.post("/api/admin/genossenschaft", { aktion: "gv", id: gv?.id, gvAktion: "abschliessen", versammlungsleiter: "Leitung (Test)", protokollfuehrer: "Protokoll (Test)", anwesend: 0, tops: {} });
  const erg = r.json.versammlung?.ergebnis;
  pruefe(r.status === 200 && erg?.tops?.[0]?.angenommen === true && erg.tops[1].angenommen === false && /^[0-9a-f]{64}$/.test(r.json.versammlung?.protokoll?.hash || ""), "Ergebnis: Beschluss angenommen (2:0), Satzungsänderung 1:1 abgelehnt, Prüfsumme", erg);
  r = await a.get(`/api/portal/mitglied/pdf?art=protokoll&id=${gv?.id}`);
  pruefe(r.status === 200 && r.pdf?.subarray(0, 5).toString() === "%PDF-", "Protokoll als PDF für Mitglieder", r.status);
  r = await a.get(`/api/portal/mitglied/pdf?art=einladung&id=${gv?.id}`);
  pruefe(r.status === 200, "Einladung als PDF", r.status);
  r = await a.post("/api/portal/mitglied", { aktion: "abstimmen", gvId: gv?.id, stimmen: { T2: "ja", T3: "ja" } });
  pruefe(r.status === 409, "nach Abschluss keine Stimme → 409", r.status);

  abschnitt("B6. Ausschüttung (Dividende)");
  r = await admin.post("/api/admin/genossenschaft", { aktion: "ausschuettungAnlegen", genoId: geno.id, daten: { art: "dividende", geschaeftsjahr: jahr + 1, satzPct: 2 } });
  pruefe(r.status === 422, "künftiges Geschäftsjahr → 422", r.json);
  r = await admin.post("/api/admin/genossenschaft", { aktion: "ausschuettungAnlegen", genoId: geno.id, daten: { art: "dividende", geschaeftsjahr: jahr, satzPct: 2, stichtag: H } });
  const au = r.json.ausschuettung;
  pruefe(r.status === 200 && au?.status === "entwurf" && au.anzahl === 2 && au.positionen.every((p) => p.bruttoEur === 8 && p.steuerEur === 0), "Vorschlag: 2 % auf 400 € = 8 €, Freistellungsauftrag → kein Abzug", au);
  r = await admin.post("/api/admin/genossenschaft", { aktion: "ausschuettung", id: au?.id, ausschuettungAktion: "auszahlen" });
  pruefe(r.status === 409, "Auszahlung vor Beschluss → 409", r.status);
  r = await admin.post("/api/admin/genossenschaft", { aktion: "ausschuettung", id: au?.id, ausschuettungAktion: "beschliessen", beschlussDatum: H, gvId: gv?.id });
  pruefe(r.status === 200 && r.json.ausschuettung?.status === "beschlossen", "Beschluss der GV erfasst", r.json);
  r = await admin.post("/api/admin/genossenschaft", { aktion: "ausschuettung", id: au?.id, ausschuettungAktion: "auszahlen", am: H });
  pruefe(r.status === 200 && r.json.ausschuettung?.status === "ausgezahlt", "ausgezahlt, Mitglieder benachrichtigt", r.json);
  r = await a.get("/api/portal/mitglied");
  pruefe(r.json.ausschuettungen?.some((x) => x.id === au?.id && x.positionen.length === 1 && x.positionen[0].mitgliedId === mA?.id), "Mitglied sieht nur die eigene Position", r.json.ausschuettungen);
  r = await a.get(`/api/portal/mitglied/pdf?art=ausschuettung&id=${au?.id}`);
  pruefe(r.status === 200 && r.pdf?.length > 800, "Dividendenmitteilung als PDF", r.status);
  r = await c.get(`/api/portal/mitglied/pdf?art=ausschuettung&id=${au?.id}`);
  pruefe(r.status === 404, "Nicht-Mitglied: Mitteilung → 404", r.status);
  r = await admin.post("/api/admin/genossenschaft", { aktion: "ausschuettungAnlegen", genoId: geno.id, daten: { art: "dividende", geschaeftsjahr: jahr, satzPct: 3 } });
  pruefe(r.status === 409, "zweite Dividende für dasselbe Jahr → 409", r.status);

  abschnitt("B7. Energiegemeinschaft: Beitritt, Anmeldung, Monatslauf");
  r = await admin.post("/api/admin/energiegemeinschaften", { aktion: "speichern", daten: { name: `EEG mt-test ${LAUF} (Test)`, land: "AT", form: "eeg_regional", status: "aktiv", netzbetreiber: "Netz (Test)", gebiet: "UW Test", plzListe: "5121, 5122", tarifBezugCt: 11, tarifEinspeisungCt: 9, grundgebuehrMonat: 1 } });
  const egT = r.json.gemeinschaft;
  pruefe(r.status === 200 && egT?.id && egT.rabatt?.anteil === 0.28, "Gemeinschaft angelegt (regional, −28 % Netz-AP)", r.json);
  r = await a.post("/api/portal/mitglied", { aktion: "egBeitreten", egId: egT?.id, daten: { bestaetigt: true } });
  pruefe(r.status === 409 && /Teilnahmedaten/.test(r.json.error), "ohne Teilnahmedaten → 409", r.json);
  const zp = (n) => `AT0030000000000000000${String(Date.now()).slice(-8)}${n}${"0".repeat(4)}`.slice(0, 33);
  r = await a.put("/api/portal/fach/mitglied", { art: "eg", daten: { land: "AT", form: "eeg_regional", rolle: "bezug", zaehlpunkt: zp(1), netzbetreiber: "Netz (Test)", plz: "4020", jahresverbrauchKwh: 3600, smartMeter: "ja" } });
  pruefe(r.status === 200, "Teilnahmedaten gespeichert (Zählpunkt 33 Zeichen)", r.json);
  r = await a.post("/api/portal/mitglied", { aktion: "egBeitreten", egId: egT?.id, daten: { bestaetigt: true } });
  pruefe(r.status === 409 && /Postleitzahl/.test(r.json.error), "PLZ außerhalb des Gebiets → 409", r.json);
  await a.put("/api/portal/fach/mitglied", { art: "eg", daten: { land: "AT", form: "eeg_regional", rolle: "bezug", zaehlpunkt: zp(1), netzbetreiber: "Netz (Test)", plz: "5121", jahresverbrauchKwh: 3600, smartMeter: "ja" } });
  r = await a.post("/api/portal/mitglied", { aktion: "egBeitreten", egId: egT?.id, daten: {} });
  pruefe(r.status === 422, "ohne Bestätigung → 422", r.json);
  r = await a.post("/api/portal/mitglied", { aktion: "egBeitreten", egId: egT?.id, daten: { bestaetigt: true } });
  const tA = r.json.teilnahme;
  pruefe(r.status === 200 && tA?.status === "beantragt" && tA.stamm?.zaehlpunkt, "Beitritt beantragt (Zählpunkt übernommen)", r.json);
  r = await a.post("/api/portal/mitglied", { aktion: "egBeitreten", egId: egT?.id, daten: { bestaetigt: true } });
  pruefe(r.status === 409, "doppelter Beitritt → 409", r.status);
  await b.put("/api/portal/fach/mitglied", { art: "eg", daten: { land: "AT", form: "eeg_regional", rolle: "beides", zaehlpunkt: zp(2), zaehlpunktEinspeisung: zp(3), netzbetreiber: "Netz (Test)", plz: "5122", jahresverbrauchKwh: 5000, anlageKwp: 20, smartMeter: "ja" } });
  r = await b.post("/api/portal/mitglied", { aktion: "egBeitreten", egId: egT?.id, daten: { bestaetigt: true } });
  const tB = r.json.teilnahme;
  const teil = (id, teilnahmeAktion, x = {}) => admin.post("/api/admin/energiegemeinschaften", { aktion: "teilnahme", id, teilnahmeAktion, ...x });
  r = await teil(tA?.id, "aktivieren", {});
  pruefe(r.status === 409, "aktivieren vor Anmeldung → 409", r.status);
  const d = new Date(`${H.slice(0, 7)}-15T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  const vormonat = d.toISOString().slice(0, 7);
  for (const t of [tA, tB]) {
    await teil(t?.id, "anmelden");
    r = await teil(t?.id, "aktivieren", { ab: `${vormonat}-01` });
  }
  pruefe(r.status === 200 && r.json.teilnahme?.status === "aktiv", "angemeldet und aktiv ab Vormonat", r.json);
  const lauf = (x) => admin.post("/api/admin/energiegemeinschaften", { aktion: "abrechnen", id: egT?.id, ...x });
  r = await lauf({ monat: H.slice(0, 7) });
  pruefe(r.status === 422, "laufender Monat → 422", r.json);
  r = await lauf({ monat: vormonat, messwerte: { [tA?.id]: { verbrauchKwh: 300 }, [tB?.id]: { verbrauchKwh: 400, erzeugungKwh: 500 } } });
  pruefe(r.status === 200 && r.json.lauf?.anzahl === 2 && r.json.lauf.geteiltKwh === 500 && r.json.lauf.geschaetzt === false, "Monatslauf mit Messwerten: 500 kWh geteilt", r.json.lauf);
  r = await lauf({ monat: vormonat });
  pruefe(r.status === 409, "Monat doppelt abrechnen → 409", r.status);
  r = await a.get("/api/portal/mitglied");
  const abr = r.json.eg?.abrechnungen?.find((x) => x.egId === egT?.id);
  pruefe(abr && Math.abs(abr.bezugGemeinschaftKwh - 214.3) < 0.2 && abr.bezugEur === 23.57 && abr.grundgebuehrEur === 1, "Abrechnung A: 214,3 kWh aus der Gemeinschaft (dynamisch), 23,57 €, Grundgebühr", abr);
  r = await b.get("/api/portal/mitglied");
  const abrB = r.json.eg?.abrechnungen?.find((x) => x.egId === egT?.id);
  pruefe(abrB?.einspeisungGemeinschaftKwh === 500 && abrB.gutschriftEur === 45, "Gutschrift B: 500 kWh × 9 ct = 45 €", abrB);
  r = await a.get(`/api/portal/mitglied/pdf?art=eg&id=${abr?.id}`);
  pruefe(r.status === 200 && r.pdf?.subarray(0, 5).toString() === "%PDF-", "Monatsabrechnung als PDF", r.status);
  r = await b.get(`/api/portal/mitglied/pdf?art=eg&id=${abr?.id}`);
  pruefe(r.status === 404, "fremde Abrechnung → 404", r.status);
  r = await a.post("/api/portal/mitglied", { aktion: "egKuendigen", id: tA?.id });
  const [jj, mm] = H.split("-").map(Number);
  pruefe(r.status === 200 && r.json.teilnahme?.bis === new Date(Date.UTC(jj, mm, 0)).toISOString().slice(0, 10), "Kündigung zum Monatsende", r.json);
  r = await b.post("/api/portal/mitglied", { aktion: "egKuendigen", id: tA?.id });
  pruefe(r.status === 404, "fremde Teilnahme kündigen → 404", r.status);

  abschnitt("B8. Gemeindecockpit");
  const kommuneDemo = new Client("kommune@");
  await kommuneDemo.login("kommune@example.com");
  r = await kommuneDemo.get("/api/portal/gemeinde");
  const cD = r.json.cockpit;
  pruefe(r.status === 200 && cD?.gemeinde?.name === "Demo-Stadt" && cD.projekte?.length >= 1 && cD.projekte[0].verfahren?.erledigt >= 1 && !("id" in cD.projekte[0]), "Demo-Stadt: Projekte mit Verfahrensstand, ohne Flächen-Kennung", cD?.projekte?.[0]);
  pruefe(cD?.termine?.kommend?.length >= 1 && cD.zahlungen?.some((z) => z.art === "par6") && cD.stellungnahmen?.length >= 1 && cD.angebote?.some((x) => x.art === "par6"), "Demo: Termine, § 6-Vereinbarung, Stellungnahme, Beteiligungsangebote");
  r = await a.get("/api/portal/gemeinde");
  pruefe(r.status === 403, "Mitglied → 403", r.status);
  r = await gast.get("/api/portal/gemeinde");
  pruefe(r.status === 401, "ohne Anmeldung → 401", r.status);
  // eigene Test-Gemeinde: Anfrage → Registrierung → Prüfung
  const kmail = `mt-test-${LAUF}-gemeinde@example.com`;
  const gemeindeName = `Testgemeinde ${LAUF}`;
  r = await gast.post("/api/anfrage", { typ: "kommune", kontakt: { vorname: "Gerd", nachname: `Gemeinde ${LAUF}`, email: kmail, firma: `Gemeinde ${gemeindeName}`, land: "DE" }, daten: { absender: "gemeinde", gemeinde: gemeindeName, rolle: "bauamt" }, einwilligung: true });
  const kv = r.json.id;
  const kom = new Client("kommune-test");
  await kom.registrieren("gemeinde", ["kommune"], { email: kmail, vorgang: kv });
  r = await kom.get("/api/portal/gemeinde");
  pruefe(r.status === 200 && r.json.cockpit === null, "ungeprüftes Anliegen: kein Cockpit", r.json);
  r = await kom.post("/api/portal/gemeinde", { vorgangId: kv, aktion: "termin", art: "gemeinderat", titel: "Sitzung", beginn: `${plusTageIso(10)}T18:00` });
  pruefe(r.status === 403, "Schreiben vor Prüfung → 403", r.status);
  await admin.post("/api/admin/status", { art: "vorgang", id: kv, nach: "in_pruefung" });
  await admin.post("/api/admin/status", { art: "vorgang", id: kv, nach: "qualifiziert" });
  r = await kom.get("/api/portal/gemeinde");
  pruefe(r.status === 200 && r.json.cockpit?.gemeinde?.name === gemeindeName && r.json.cockpit.darfSchreiben && !r.json.cockpit.backofficeSchreiben, "nach Prüfung: Cockpit (Gemeinde schreibt Termine/Stellungnahmen)", r.json.cockpit);
  r = await kom.post("/api/portal/gemeinde", { vorgangId: kv, aktion: "termin", art: "gemeinderat", titel: "", beginn: "" });
  pruefe(r.status === 422, "Termin ohne Titel → 422", r.json);
  r = await kom.post("/api/portal/gemeinde", { vorgangId: kv, aktion: "termin", art: "gemeinderat", titel: "Gemeinderat: Grundsatzbeschluss (Test)", beginn: `${plusTageIso(10)}T18:00`, ort: "Rathaus", oeffentlich: true });
  const terminG = r.json.cockpit?.termine?.kommend?.[0];
  pruefe(r.status === 200 && terminG?.von === "gemeinde", "Gemeinde trägt Gemeinderatstermin ein", r.json);
  r = await kom.post("/api/portal/gemeinde", { vorgangId: kv, aktion: "zahlung", art: "par6", jahr: jahr + 2, kwh: 1000, ctProKwh: 0.2 });
  pruefe(r.status === 403, "Gemeinde pflegt keine Einnahmen → 403", r.status);
  r = await kom.post("/api/portal/gemeinde", { vorgangId: kv, aktion: "schritt", projektRef: "x", schritt: "aufstellung", status: "erledigt", datum: H });
  pruefe(r.status === 403, "Gemeinde pflegt keinen Verfahrensstand → 403", r.status);
  r = await kom.post("/api/portal/gemeinde", { vorgangId: kv, aktion: "stellungnahme", betreff: `Anfrage Infoabend ${LAUF}`, text: "Bitte stellen Sie das Projekt im Gemeinderat vor (Test).", frist: plusTageIso(14) });
  const sn = r.json.cockpit?.stellungnahmen?.[0];
  pruefe(r.status === 200 && sn?.status === "offen" && sn.von === "gemeinde", "Stellungnahme der Gemeinde gesendet", r.json);
  r = await admin.post("/api/portal/gemeinde", { vorgangId: kv, aktion: "zahlung", art: "par6", jahr: jahr + 2, kwh: 1000, ctProKwh: 0.3 });
  pruefe(r.status === 422, "§ 6 EEG über 0,2 ct → 422", r.json);
  r = await admin.post("/api/portal/gemeinde", { vorgangId: kv, aktion: "zahlung", art: "par6", jahr: jahr + 2, kwh: 30000000, ctProKwh: 0.2, status: "vereinbart" });
  pruefe(r.status === 200 && r.json.cockpit?.einnahmen?.vereinbart === 60000, "Backoffice erfasst § 6-Vereinbarung (60.000 €)", r.json.cockpit?.einnahmen);
  const zId = r.json.cockpit?.zahlungen?.[0]?.id;
  r = await akquise.post("/api/portal/gemeinde", { vorgangId: kv, aktion: "antwort", id: sn?.id, text: "Gerne, Termin folgt (Test).", erledigt: false });
  pruefe(r.status === 200 && r.json.cockpit?.stellungnahmen?.[0]?.status === "beantwortet", "Backoffice Akquise antwortet", r.json);
  r = await betrieb.get(`/api/portal/gemeinde?vorgang=${kv}`);
  pruefe(r.status === 403, "Backoffice Betrieb ohne Bereich Kommunen → 403", r.status);
  r = await kom.post("/api/portal/gemeinde", { vorgangId: kv, aktion: "antwort", id: sn?.id, text: "Danke (Test).", erledigt: true });
  pruefe(r.status === 200 && r.json.cockpit?.stellungnahmen?.[0]?.status === "erledigt", "Gemeinde schließt ab", r.json);
  r = await kom.get(`/api/portal/gemeinde/material?vorgang=${kv}&art=pressemitteilung`);
  pruefe(r.status === 200 && r.json.material?.titel?.includes(gemeindeName) && /Entwurf/.test(r.json.material.hinweis), "Pressetext-Entwurf (JSON)", r.json);
  r = await kom.get(`/api/portal/gemeinde/material?vorgang=${kv}&art=aushang&format=pdf`);
  pruefe(r.status === 200 && r.pdf?.subarray(0, 5).toString() === "%PDF-", "Aushang als PDF", r.status);
  r = await kom.get(`/api/portal/gemeinde/material?vorgang=${kv}&art=werbung`);
  pruefe(r.status === 422, "unbekannte Vorlage → 422", r.status);
  r = await kommuneDemo.get(`/api/portal/gemeinde?vorgang=${kv}`);
  pruefe(r.status === 404, "fremdes Anliegen einer anderen Gemeinde → 404", r.status);
  r = await kommuneDemo.post("/api/portal/gemeinde", { vorgangId: kv, aktion: "termin", art: "sonstiges", titel: "x", beginn: `${plusTageIso(5)}T10:00` });
  pruefe(r.status === 404, "fremdes Anliegen beschreiben → 404", r.status);
  const tOeko = cD?.termine?.kommend?.find((t) => t.von === "oekoinvest");
  r = await kommuneDemo.post("/api/portal/gemeinde", { vorgangId: cD?.vorgangId, aktion: "terminLoeschen", id: tOeko?.id });
  pruefe(r.status === 403, "Termin von ÖkoInvest nicht durch die Gemeinde löschbar → 403", r.status);
  r = await kom.post("/api/portal/gemeinde", { vorgangId: kv, aktion: "terminLoeschen", id: terminG?.id });
  pruefe(r.status === 200 && !r.json.cockpit?.termine?.kommend?.length, "eigenen Termin entfernt", r.json.cockpit?.termine);
  r = await admin.post("/api/portal/gemeinde", { vorgangId: kv, aktion: "zahlungLoeschen", id: zId });
  pruefe(r.status === 200 && !r.json.cockpit?.zahlungen?.length, "Backoffice entfernt Einnahme (nicht gezahlt)", r.json.cockpit?.zahlungen);

  abschnitt("B9. Seiten");
  const seiten = [
    [a, "/portal/beteiligung", "Teilnahme mit Zählpunkt", true],
    [a, "/portal/beteiligung/genossenschaft", "Meine Mitgliedschaft", true],
    [a, `/portal/beteiligung/versammlung/${gv?.id}`, "Tagesordnung", true],
    [a, "/portal/beteiligung/energiegemeinschaft", "Strom aus der Nachbarschaft", true],
    [c, `/portal/beteiligung/versammlung/${gv?.id}`, "Tagesordnung", false],
    [firma, "/portal/beteiligung/genossenschaft", "Meine Mitgliedschaft", false],
    [admin, "/portal/admin/genossenschaft", "Offene Rechtspunkte", true],
    [admin, "/portal/admin/energiegemeinschaften", "Monatsläufe", true],
    [betrieb, "/portal/admin/genossenschaft", "Offene Rechtspunkte", false],
    [kommuneDemo, "/portal/kommune", "Verfahrensstand", true],
    [kom, "/portal/kommune", "Bürgerinfo und Pressetexte", true],
    [admin, `/portal/kommune?vorgang=${kv}`, "Einnahme erfassen", true],
  ];
  for (const [cl, pfad, marker, sichtbar] of seiten) {
    r = await cl.get(pfad, { origin: null });
    const da = r.status === 200 && r.text.includes(marker);
    pruefe(da === sichtbar && (sichtbar || [200, 404].includes(r.status)), `Seite ${pfad} (${cl.name}) → ${sichtbar ? "sichtbar" : "nicht sichtbar"}`, r.status);
  }
}

// ================================================================ Lauf

(async () => {
  console.log(`Mitglied & Kommune (Team 5) – ${NUR_LOGIK ? "nur Logik" : BASIS}`);
  try {
    await logik();
    if (!NUR_LOGIK) await http();
  } catch (e) {
    fehler++;
    console.log(rot(`\nAbbruch: ${e.stack || e.message}`));
  }
  console.log(`\n${ok} bestanden, ${fehler} fehlgeschlagen${uebersprungen ? `, ${uebersprungen} übersprungen` : ""}`);
  process.exit(fehler ? 1 : 0);
})();
