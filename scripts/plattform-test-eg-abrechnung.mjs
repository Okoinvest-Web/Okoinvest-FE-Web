// scripts/plattform-test-eg-abrechnung.mjs
//
// Energiegemeinschaften WP4 „Abrechnung, Steuer, Zahlung, Vereinsbuchhaltung“.
//   node scripts/plattform-test-eg-abrechnung.mjs [basis-url]       (--nur-logik: nur Teil A, ohne Server)
//   node scripts/plattform-test-eg-abrechnung.mjs --nur-logik --schnappschuss   (Gleichheits-Schnappschuss neu schreiben)
//
// Teil A – reine Logik (src/lib/plattform/eg/{ust,abrechnung,belege,ersparnis,zahlung,buchhaltung,beleg-pdf}.js):
//   USt-Entscheidungstabelle (Tabellentests, gleiche Vektoren wie Python), USt-Summen, Kleinunternehmer-Monitor,
//   Monatsabrechnung mit TOU, Tarifgruppe, Sozialtarif, Rabatt, Beitritt, Landwirt 13 %, Reverse Charge, L3, Rhythmus,
//   Ersparnis, Herkunft, Pflichtangaben, Vier-Augen-Freigabe, Nummernkreise, Zahlungsläufe mit Aufrechnung, pain.008,
//   Storno, Buchungen nach Zufluss, E/A-Rechnung, Kassabuch, UVA, Exporte, Jahresbescheinigung, Mahnwesen, Probe-Vergleich,
//   PDF, Tailwind-Falle. Gleichheitstest: Schnappschuss eg/testdaten/abrechnung/{abrechnung_monat,ablauf}.json → „erwartet“
//   (Python: plattform/tests/test_eg_abrechnung_kern.py vergleicht dieselben Werte).
// Teil B – gegen den laufenden Dev-Server (Demo-Konten eg-kassier@, eg-obmann@, eg-pruefer@, admin@, mitglied@):
//   Perioden, Vorschau, Vier-Augen (Kassier + Obmann, dieselbe Person zweimal → 409), Rechte (Prüfer/Mitglied → 403/404),
//   Belege des Mitglieds, PDF, Zahlungslauf pain.008/pain.001, camt-Import, Mahnlauf, Buchhaltung, Export, Seiten.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lade = (p) => import(pathToFileURL(path.join(WURZEL, p)).href);
const NUR_LOGIK = process.argv.includes("--nur-logik");
const SCHNAPPSCHUSS = process.argv.includes("--schnappschuss");
const BASIS = (process.argv.find((a) => a.startsWith("http")) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const TD = path.join(WURZEL, "src/lib/plattform/eg/testdaten/abrechnung");

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
const nah = (a, b, t = 0.005) => Math.abs(Number(a) - Number(b)) <= t;
const jsonLesen = (n) => JSON.parse(fs.readFileSync(path.join(TD, n), "utf8"));

/** Deep-Vergleich (Zahlen mit Toleranz, -0 = 0) – liefert ersten Unterschied oder "" */
function unterschied(a, b, pfad = "") {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= 1e-6 ? "" : `${pfad}: ${a} ≠ ${b}`;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return a === b ? "" : `${pfad}: ${JSON.stringify(a)?.slice(0, 80)} ≠ ${JSON.stringify(b)?.slice(0, 80)}`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${pfad}: Typ`;
  const k = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  for (const x of k) {
    const u = unterschied(a[x], b[x], `${pfad}.${x}`);
    if (u) return u;
  }
  return "";
}

/** Gleichheitslauf: dieselben Schritte rechnet plattform/tests/test_eg_abrechnung_kern.py */
export async function ablaufBerechnen(M, d, a) {
  const { AB, BL, Z, BH } = M;
  const e = d.eingabe;
  const r = AB.abrechnungBerechnen(e);
  const fingerabdruck = AB.vorschauFingerabdruck(r.belege);
  const freigaben = a.freigabe.map((f) => {
    const x = AB.freigabePruefen(f.periode, { stufen: f.stufen, kontoId: f.kontoId, fingerabdruck: f.fingerabdruck, blockierendeFehler: f.fehler });
    return { ok: x.ok, auge: x.auge, vollstaendig: x.vollstaendig, grund: x.grund };
  });
  const mitIds = r.belege.map((b, i) => ({ ...b, id: `B${i + 1}` }));
  const nummern = BL.nummernVergeben(mitIds, a.zaehler, 2026);
  const final = mitIds.map((b) => ({ ...b, nummer: nummern.nummern[b.id], datum: a.datum, status: "final", zahlungen: [], mahnungen: [] }));
  const lauf8 = Z.zahlungslaufBilden({ art: "pain008", belege: final, mitglieder: e.mitglieder, gemeinschaft: e.gemeinschaft, heute: a.datum });
  const lauf1 = Z.zahlungslaufBilden({ art: "pain001", belege: final, mitglieder: e.mitglieder, gemeinschaft: e.gemeinschaft, heute: a.datum });
  const xml8 = Z.zahlungsdatei("pain008", lauf8, { gemeinschaft: e.gemeinschaft, nachrichtId: "EG-T1-DD-1", erstelltAm: a.erstelltAm, ausfuehrungAm: a.einzugAm });
  const pruef8 = Z.pain008Pruefen(xml8);
  const storno = BL.belegStornieren(final[0], { nummer: "ST-2026-00001", datum: a.datum, grund: "Zählpunktwerte korrigiert" });
  const buchungen = [];
  for (const [lauf, konto] of [[lauf8, "2800"], [lauf1, "2800"]]) {
    for (const p of lauf.posten) {
      const b = final.find((x) => x.id === p.belegId);
      buchungen.push(...BH.buchungenAusZahlung(b, { betrag: Math.abs(b.summen.brutto), datum: a.zahlungAm, id: `Z-${p.belegId}` }, { geldkonto: konto }));
    }
  }
  a.kassa.forEach((k, i) => buchungen.push({ id: `K${i + 1}`, ...BH.buchungBereinigen(k) }));
  const ea = BH.eaRechnung(buchungen, 2026, { anfang: { bank: 1000, kassa: 20 }, offeneForderungen: 3.15, offeneVerbindlichkeiten: 0 });
  const kassa = BH.kassabuch(buchungen, { anfangsbestand: 20 });
  const uva = BH.uvaVorbereitung([...final, storno], { von: "2026-07-01", bis: "2026-09-30", ustStatus: e.gemeinschaft.ustStatus });
  const exporte = Object.fromEntries(["bmd", "rzl", "datev", "ea", "kassabuch", "belegjournal"].map((art) => [art, BH.exportErzeugen(art, { buchungen, belege: final, jahr: 2026, gemeinschaft: e.gemeinschaft, ea, kassa, erzeugtAm: "2026-12-31T00:00:00.000Z" }).inhalt]));
  const m2 = e.mitglieder.find((m) => m.id === "M2");
  const jb = BH.jahresbescheinigung(final.filter((b) => b.mitgliedId === "M2" && b.typ === "gutschrift"), { jahr: 2026, mitglied: m2, anlagenKwp: 28 });
  const r5 = final.find((b) => b.mitgliedId === "M1" && b.typ === "rechnung");
  const r4 = final.find((b) => b.mitgliedId === "M4" && b.typ === "rechnung");
  const mahn = a.mahnTage.map((t) => ({ tag: t, m5: Z.egMahnvorschlag(r5, t), m4: Z.egMahnvorschlag(r4, t, Z.MAHN_FAIR, { schutzbeduerftig: true }) }));
  const alt = AB.altwerteLesen(a.altwerte);
  const probe = AB.probeVergleich(r.belege, alt.werte);
  return { abrechnung: r, fingerabdruck, freigaben, nummern, lauf8, lauf1, xml8, pruef8, storno: { summen: storno.summen, positionen: storno.positionen.map((p) => p.netto), text: storno.text, nummer: storno.nummer }, buchungen, ea, kassa, uva, exporte, jb, mahn, alt, probe };
}

// ================================================================ Teil A – Logik

async function logik() {
  const U = await lade("src/lib/plattform/eg/ust.js");
  const AB = await lade("src/lib/plattform/eg/abrechnung.js");
  const BL = await lade("src/lib/plattform/eg/belege.js");
  const ES = await lade("src/lib/plattform/eg/ersparnis.js");
  const Z = await lade("src/lib/plattform/eg/zahlung.js");
  const BH = await lade("src/lib/plattform/eg/buchhaltung.js");
  const PDF = await lade("src/lib/plattform/eg/beleg-pdf.js");
  const M = { U, AB, BL, ES, Z, BH };
  const uf = jsonLesen("ust_faelle.json");

  abschnitt("A1. USt-Entscheidungstabelle (Fachkonzept 4.5) – Tabellentests");
  for (const f of uf.faelle) {
    const x = U.ustFall(f.eingabe);
    const ist = { regel: x.regel, satz: x.satz, art: x.art, steuerschuldEg: x.steuerschuldEg, vorsteuerEg: x.vorsteuerEg, fehler: x.fehler.length, warnungen: x.warnungen.length };
    pruefe(!unterschied(ist, f.erwartet) && x.pruefpfad.length >= 2 && x.pruefpfad.every((s) => s.frage && s.antwort), `${f.name} → ${x.regel} (${x.satz} %, ${x.art})`, { ist, soll: f.erwartet });
  }
  for (const f of uf.summen) {
    const s = U.ustSummen(f.positionen);
    pruefe(nah(s.netto, f.erwartet.netto) && nah(s.ust, f.erwartet.ust) && nah(s.brutto, f.erwartet.brutto) && nah(s.rcSteuer, f.erwartet.rcSteuer), `Summen: ${f.name}`, s);
  }
  for (const f of uf.ku_monitor) {
    const k = U.kuMonitor(f.eingabe);
    pruefe(k.status === f.erwartet.status && nah(k.prognoseBrutto, f.erwartet.prognoseBrutto) && nah(k.quote, f.erwartet.quote, 0.01), `Kleinunternehmer-Monitor: ${f.name} → ${k.status}`, k);
  }
  const opt = U.kuMonitor({ jahr: 2026, umsatzBrutto: 20000, umsatzNetto: 20000, rcSteuer: 3500, vorsteuer: 1500 });
  pruefe(/Option U 12 prüfen/.test(opt.option.empfehlung) && opt.option.rcSteuerNichtAbziehbar === 3500, "Option U 12 wird vorgeschlagen, wenn abziehbare Steuern die USt auf Mitglieder übersteigen", opt.option);

  abschnitt("A2. Monatsabrechnung (von Hand nachgerechnet)");
  const d = jsonLesen("abrechnung_monat.json");
  const r = AB.abrechnungBerechnen(d.eingabe);
  const beleg = (m, typ) => r.belege.find((b) => b.mitgliedId === m && b.typ === typ);
  for (const [m, soll] of Object.entries(d.pruefen.rechnungen)) {
    const b = beleg(m, "rechnung");
    pruefe(b && nah(b.summen.netto, soll.netto) && (soll.brutto === undefined || nah(b.summen.brutto, soll.brutto)), `Rechnung ${m}: ${b?.summen.netto} € netto (Soll ${soll.netto})`, b?.positionen.map((p) => [p.art, p.menge, p.preis, p.netto]));
  }
  for (const [m, soll] of Object.entries(d.pruefen.gutschriften)) {
    const b = beleg(m, "gutschrift");
    pruefe(b && nah(b.summen.netto, soll.netto) && nah(b.summen.ust, soll.ust) && (soll.rcSteuer === undefined || nah(b.summen.rcSteuer, soll.rcSteuer)), `Gutschrift ${m}: ${b?.summen.netto} € netto, USt ${b?.summen.ust}, RC ${b?.summen.rcSteuer}`, b?.summen);
  }
  const m1 = beleg("M1", "rechnung");
  pruefe(m1.positionen.some((p) => p.zeitfenster === "Z1" && p.preis === 9.5 && nah(p.netto, 3.8)) && m1.positionen.some((p) => p.zeitfenster === "" && p.preis === 11.5), "TOU: Mittagsstrom 9,5 ct und Grundpreis 11,5 ct getrennt bewertet");
  pruefe(m1.positionen.some((p) => p.art === "rabatt" && nah(p.netto, -1.07)), "Rabatt 10 % auf die Energie (Treuebonus) als eigene Zeile");
  pruefe(beleg("M4", "rechnung").positionen.some((p) => p.art === "bezug" && p.preis === 7.5 && /Sozialtarif/.test(p.preisHerkunft)), "Sozialtarif für schutzbedürftigen Haushalt (§ 68 Abs. 6 ElWG)");
  pruefe(["beitrittsgebuehr", "mitgliedsbeitrag"].every((a) => beleg("M4", "rechnung").positionen.some((p) => p.art === a)) && beleg("M4", "rechnung").verrechnet.length === 2, "Beitritt im Monat: Beitrittsgebühr und Jahresbeitrag einmalig (Verrechnungsvermerk)");
  pruefe(beleg("M7", "rechnung").positionen.some((p) => p.art === "bezug" && p.preis === 10 && /Tarifgruppe/.test(p.preisHerkunft)), "Tarifgruppe (Vereinstarif) vor Grundpreis");
  pruefe(r.ausgeschlossen.some((x) => x.mitgliedId === "M6"), "§ 69 ElWG: Gemeinde mit Quartalsrhythmus nicht in der Monatsperiode");
  pruefe(r.pruefung.fehler.filter((f) => f.code === "daten").length === d.pruefen.datenfehler && r.pruefung.fehler.some((f) => /L3/.test(f.text) && /CR_REQ_PT/.test(f.text)), "L3-Werte → blockierende Prüfung mit Nachforderung");
  const g2 = beleg("M2", "gutschrift");
  pruefe(g2.positionen[0].ust.regel === "ERZ_LW" && g2.summen.hinweise.some((h) => /§ 22/.test(h)) && g2.gutschriftZustimmung, "Landwirt: 13 % mit Hinweis § 22, Gutschriftverfahren vereinbart");
  const g3 = beleg("M3", "gutschrift");
  pruefe(g3.summen.zeilen[0].art === "rc" && g3.summen.hinweise.some((h) => /§ 19 Abs. 1c/.test(h)) && g3.positionen[0].ust.pruefpfad.some((s) => /auch als Kleinunternehmer/.test(s.antwort)), "Reverse Charge: Hinweis, Steuerschuld der KU-Gemeinschaft im Prüfpfad");
  const es = m1.ersparnis;
  pruefe(nah(es.netzEur, d.pruefen.ersparnisM1.netzEur) && nah(es.abgabeEur, d.pruefen.ersparnisM1.abgabeEur) && nah(es.energieEur, d.pruefen.ersparnisM1.energieEur) && nah(es.summeEur, d.pruefen.ersparnisM1.summeEur), "Ersparnis M1: −57 % auf 5 ct (2,85 €), Elektrizitätsabgabe 0,1 ct, Energiepreisvorteil", es);
  pruefe(r.herkunft.anteile.length === 2 && /Wasserkraft/.test(r.herkunft.text) && /Photovoltaik/.test(r.herkunft.text), "Energieherkunft je Anlagenart", r.herkunft.text);
  pruefe(r.kontrolle.ok && nah(r.kontrolle.eigendeckung, 230) && nah(r.kontrolle.eingebracht, 230), "Kontrolle Σ Eigendeckung = Σ eingebrachte Erzeugung");
  pruefe(m1.positionen.every((p) => p.pruefpfad.length >= 2) && m1.positionen[0].pruefpfad.some((s) => /Teilnahmefaktor/.test(s.antwort)), "Prüfpfad je Belegzeile (Menge, Preisherkunft, USt)");
  pruefe(m1.zahlweg.art === "lastschrift" && beleg("M3", "rechnung").zahlweg.art === "ueberweisung", "Zahlweg: Lastschrift bei aktivem Mandat, sonst Überweisung");
  const ohneTou = AB.abrechnungBerechnen({ ...d.eingabe, werte: d.eingabe.werte.map((w) => ({ ...w, jeZeitfenster: undefined })) });
  pruefe(ohneTou.pruefung.fehler.some((f) => /Zeitfenster/.test(f.text)), "TOU-Tarif ohne Aufteilung → blockierende Prüfung (kein stiller Grundpreis)");
  const za = AB.zeitfensterAufteilen([{ lokal: "2026-08-03T12:00", groessen: { eigendeckung: 1 } }, { lokal: "2026-08-03T18:00", groessen: { eigendeckung: 2 } }, { lokal: "2026-12-03T12:00", groessen: { eigendeckung: 4 } }], d.eingabe.tarife[0]);
  pruefe(za.Z1?.eigendeckung === 1 && za[""]?.eigendeckung === 6, "zeitfensterAufteilen: Viertelstunden je Zeitfenster (Monate beachtet)", za);

  abschnitt("A3. Perioden, Segmente, Pflichtangaben");
  pruefe(JSON.stringify(AB.periodeVorschlag("monat", "2026-10-01")) === JSON.stringify({ von: "2026-09-01", bis: "2026-09-30", art: "monat" }) && AB.periodeVorschlag("quartal", "2026-10-01").von === "2026-07-01" && AB.periodeVorschlag("quartal", "2026-02-10").bis === "2025-12-31" && AB.periodeVorschlag("jahr", "2026-03-01").von === "2025-01-01", "Periodenvorschlag Monat/Quartal/Jahr");
  pruefe(AB.abrechnungFruehestens("2026-09-30") === "2026-10-20" && AB.abrechnungFruehestens("2026-12-31") === "2027-01-20", "Frühester Abrechnungstag: 20. des Folgemonats");
  let fx = null;
  try {
    AB.periodeBereinigen({ von: "2026-09-01", bis: "2026-10-31", art: "monat" }, { heute: "2026-10-01" });
  } catch (e) {
    fx = e;
  }
  pruefe(fx && /abgeschlossene/.test(fx.message), "Periode bis in die Zukunft → Fehler");
  const pb = AB.periodeBereinigen({ von: "2026-09-01", bis: "2026-09-30", art: "monat" }, { heute: "2026-10-01" });
  pruefe(pb.hinweise.some((h) => /20\.10\.2026/.test(h)), "Hinweis: vor dem 20. des Folgemonats sind NB-Werte nicht endgültig");
  const tar = [{ id: "A", status: "abgeloest", gueltigAb: "2026-01-01", gueltigBis: "2026-08-14" }, { id: "B", status: "aktiv", gueltigAb: "2026-08-15", gueltigBis: "" }];
  const seg = AB.tarifSegmente(tar, "2026-08-01", "2026-08-31");
  pruefe(seg.length === 2 && seg[0].tarifId === "A" && seg[0].bis === "2026-08-14" && seg[1].tarifId === "B", "Tarifwechsel teilt die Periode in Segmente (abgelöster Tarif gilt für die Vergangenheit)", seg);
  pruefe(AB.monateImZeitraum("2026-08-05", "2026-10-01") === 3, "Monate im Zeitraum (angebrochene Monate zählen)");
  const pf = BL.pflichtangabenPruefen({ ...g3, gutschriftZustimmung: false, empfaenger: { ...g3.empfaenger, uid: "" } }, {});
  pruefe(pf.some((x) => x.feld === "gutschriftverfahren") && pf.some((x) => x.feld === "empfaenger.uid"), "Pflichtangaben: Gutschriftverfahren und UID bei Reverse Charge", pf);
  pruefe(BL.pflichtangabenPruefen({ ...m1, faelligAm: "", zaehlpunkte: [] }, { lieferantenpflichten: true }).filter((x) => /ElWG/.test(x.quelle)).length === 2, "ElWG § 69: Fälligkeit und Zählpunktbezeichnungen Pflicht");

  abschnitt("A4. Ablauf: Freigabe, Nummern, Zahlung, Storno, Buchhaltung (Gleichheitslauf)");
  const ab = jsonLesen("ablauf.json");
  const x = await ablaufBerechnen(M, d, ab);
  ab.freigabe.forEach((f, i) => pruefe(x.freigaben[i].ok === f.erwartet.ok && x.freigaben[i].auge === f.erwartet.auge && x.freigaben[i].vollstaendig === f.erwartet.vollstaendig, `Vier-Augen: ${f.name}`, x.freigaben[i]));
  const nr = Object.values(x.nummern.nummern).sort();
  pruefe(nr[0] === "GU-2026-00001" && nr.includes("RE-2026-00005") && x.nummern.zaehler["RE-2026"] === 10 && BL.belegLuecken(nr.map((n) => ({ nummer: n }))).length === 1, "Nummernkreise RE/GU je Jahr fortlaufend (Zähler übernommen)", x.nummern);
  pruefe(x.lauf8.anzahl === 3 && x.lauf8.uebersprungen.some((u) => /Mandat/.test(u.grund)) && x.lauf8.uebersprungen.filter((u) => /Aufrechnung/.test(u.grund)).length === 2 && x.lauf1.verrechnungen.length === 2, "pain.008: offene Rechnungen mit Mandat; ohne Mandat übersprungen; Prosumer werden verrechnet", { lauf8: x.lauf8.posten.map((p) => [p.nummer, p.betrag]), ueb: x.lauf8.uebersprungen });
  const m2l = x.lauf8.posten.find((p) => p.mitgliedId === "M2");
  pruefe(!m2l && x.lauf8.uebersprungen.some((u) => /Aufrechnung/.test(u.grund)) && x.lauf1.posten.some((p) => p.mitgliedId === "M2" && nah(p.betrag, 11.53 - 7.85)), "Aufrechnung Landwirt: Gutschrift 11,53 € − Rechnung 7,85 € = Auszahlung 3,68 €", x.lauf1.posten);
  pruefe(x.pruef8.length === 0 && /<SeqTp>FRST<\/SeqTp>/.test(x.xml8) && /<CdtrSchmeId>/.test(x.xml8) && /SONNENHANG-0001/.test(x.xml8), "pain.008.001.08 strukturell gültig (Gläubiger-ID, Mandat, FRST)", x.pruef8);
  pruefe(nah(x.storno.summen.brutto, -11.63) && /Storno der Rechnung RE-2026-00005/.test(x.storno.text), "Storno: negativer Beleg mit Verweis auf Ursprung", x.storno);
  pruefe(x.buchungen.some((b) => b.konto === "5000" && b.kategorie === "ausgabe") && x.buchungen.some((b) => b.konto === "4000") && x.buchungen.some((b) => b.konto === "2500" && b.ustArt === "ust13"), "Buchungen nach Zufluss: Erlöse, Stromeinkauf, Vorsteuer 13 %");
  pruefe(x.kassa.fehler.length === 0 && nah(x.kassa.endbestand, 20 + 50 - 12.4), "Kassabuch mit laufendem Kassastand", x.kassa);
  pruefe(nah(x.ea.ergebnis, x.ea.summeEinnahmen - x.ea.summeAusgaben) && x.ea.vereinsgroesse === "klein" && nah(x.ea.vermoegen.kassaEnde, 57.6), "E/A-Rechnung mit Vermögensübersicht (VerG § 21)", { e: x.ea.summeEinnahmen, a: x.ea.summeAusgaben, v: x.ea.vermoegen });
  const kz = Object.fromEntries(x.uva.kennzahlen.map((k) => [k.kz, k]));
  pruefe(nah(kz["057"].steuer, 1.87) && kz["060"].betrag === 0 && nah(x.uva.zahllast, 1.87), "UVA (KU-Gemeinschaft): RC-Steuer 1,87 € ohne Vorsteuer", x.uva);
  pruefe(x.exporte.bmd.startsWith("﻿satzart;") && x.exporte.datev.startsWith('"EXTF"') && /Kassastand/.test(x.exporte.kassabuch) && /RE-2026-00005/.test(x.exporte.belegjournal), "Exporte BMD, DATEV, RZL, E/A, Kassabuch, Belegjournal");
  pruefe(nah(x.jb.kwh, 120) && x.jb.estg.befreitMoeglich && nah(x.jb.brutto, 11.53), "Jahresbescheinigung Erzeuger mit § 3 Abs. 1 Z 39 EStG", x.jb);
  pruefe(x.mahn[0].m5?.faellig && x.mahn[0].m5.stufe === 1 && x.mahn[0].m5.gebuehr === 0 && x.mahn[0].m4?.sozial, "Mahnwesen fair: freundliche Erinnerung ohne Gebühr", x.mahn.map((m) => m.m5 && [m.m5.faellig, m.m5.stufe, m.m5.gebuehr]));
  const rM = x.abrechnung.belege.find((b) => b.mitgliedId === "M1" && b.typ === "rechnung");
  const mitErinnerung = { ...rM, nummer: "RE-2026-00005", datum: "2026-09-25", status: "final", mahnungen: [{ stufe: 1, am: "2026-10-20", frist: "2026-11-03" }] };
  const st2 = Z.egMahnvorschlag(mitErinnerung, "2026-11-12");
  const st2s = Z.egMahnvorschlag(mitErinnerung, "2026-11-12", Z.MAHN_FAIR, { schutzbeduerftig: true });
  pruefe(st2?.faellig && st2.stufe === 2 && st2.gebuehr === 3 && st2s.gebuehr === 0 && st2s.sozial && Z.egMahnvorschlag(mitErinnerung, "2026-11-01")?.faellig === false, "Stufe 2 erst nach Fristablauf, 3 € Gebühr (Wettbewerb: bis 40 €), schutzbedürftig gebührenfrei", st2);
  pruefe(x.alt.werte.length === 5 && x.probe.auffaellig >= 2 && x.probe.zeilen.some((z) => z.nurAlt && z.mitgliedsnummer === 9) && x.probe.zeilen.some((z) => z.mitgliedsnummer === 2 && z.typ === "rechnung" && nah(z.differenz, -0.05)), "Probe-Abrechnung: zeilengenauer Vergleich mit dem Vorsystem", x.probe.zeilen.filter((z) => z.auffaellig));

  abschnitt("A5. Gleichheitstest JS ↔ Python (Schnappschuss)");
  if (SCHNAPPSCHUSS) {
    d.erwartet = JSON.parse(JSON.stringify(r));
    ab.erwartet = JSON.parse(JSON.stringify(x));
    fs.writeFileSync(path.join(TD, "abrechnung_monat.json"), JSON.stringify(d, null, 1) + "\n");
    fs.writeFileSync(path.join(TD, "ablauf.json"), JSON.stringify(ab, null, 1) + "\n");
    console.log("  Schnappschuss geschrieben.");
  }
  const u1 = d.erwartet ? unterschied(JSON.parse(JSON.stringify(r)), d.erwartet) : "kein Schnappschuss";
  const u2 = ab.erwartet ? unterschied(JSON.parse(JSON.stringify(x)), ab.erwartet) : "kein Schnappschuss";
  pruefe(!u1, "Abrechnung = Schnappschuss (gleiche Werte prüft Python)", u1);
  pruefe(!u2, "Ablauf = Schnappschuss (gleiche Werte prüft Python)", u2);

  abschnitt("A6. Beleg-PDF und Tailwind-Falle");
  const final = { ...m1, nummer: "RE-2026-00005", datum: "2026-09-25", status: "final", zahlweg: { ...m1.zahlweg, ibanMaskiert: "AT61 •••• •••• 3201" }, hash: "a".repeat(64) };
  const pdf = PDF.egBelegPdf(final, { demo: true });
  const pdfG = PDF.egBelegPdf({ ...g3, nummer: "GU-2026-00002", datum: "2026-09-25", status: "final" });
  const pdfS = PDF.egBelegPdf({ ...BL.belegStornieren(final, { nummer: "ST-2026-00001", datum: "2026-09-26", grund: "Test" }) });
  pruefe(pdf.slice(0, 5).toString() === "%PDF-" && pdf.length > 3000 && pdfG.length > 2000 && pdfS.length > 2000, `PDF Rechnung, Gutschrift, Storno (${pdf.length} Bytes)`);
  const text = pdf.toString("latin1");
  pruefe(/Gemeinschaftsstrom/.test(text) && /VORTEIL/.test(text) && /Vorabank/.test(text) && /Pr\xfcfsumme/.test(text), "PDF erklärt Entstehung, Vorteil, Lastschrift-Vorabankündigung, Prüfsumme");
  const dateien = ["ust", "abrechnung", "belege", "ersparnis", "zahlung", "buchhaltung", "beleg-pdf"].map((n) => `src/lib/plattform/eg/${n}.js`);
  const roh = [...dateien, ...listeDateien("src/components/Portal/EG/Abrechnung"), ...listeDateien("src/app/(stamm)/portal/admin/eg/[id]/abrechnung"), ...listeDateien("src/app/(stamm)/portal/admin/eg/[id]/buchhaltung"), ...listeDateien("src/app/(stamm)/portal/eg/[id]/abrechnung"), ...listeDateien("src/app/(stamm)/portal/eg/[id]/kasse"), ...listeDateien("src/app/api/portal/eg/[id]/abrechnung"), "src/lib/plattform/backend/demo/eg-abrechnung.js", "src/lib/plattform/backend/demo/eg-abrechnung-seed.js", "src/lib/plattform/backend/frappe/eg-abrechnung.js"];
  const falle = roh.filter((f) => fs.existsSync(path.join(WURZEL, f))).filter((f) => /\[(zu |Demo|Platzhalter)|\[ ?-:|\[\.\.\.\]/.test(fs.readFileSync(path.join(WURZEL, f), "utf8")));
  pruefe(!falle.length, `Tailwind-Falle: keine eckigen Klammern mit Text in ${roh.length} WP4-Dateien`, falle);
}

function listeDateien(rel) {
  const p = path.join(WURZEL, rel);
  if (!fs.existsSync(p)) return [];
  return fs.readdirSync(p, { recursive: true }).filter((f) => String(f).endsWith(".js")).map((f) => path.join(rel, String(f)).replace(/\\/g, "/"));
}

// ================================================================ Teil B – Server

class Client {
  constructor(name) {
    this.name = name;
    this.cookie = "";
  }
  async anfrage(methode, pfad, body, { origin = BASIS, roh = false } = {}) {
    const headers = {};
    if (origin) headers.Origin = origin;
    if (this.cookie) headers.Cookie = this.cookie;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    let res;
    for (let versuch = 1; ; versuch++) {
      try {
        res = await fetch(BASIS + pfad, { method: methode, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual", signal: AbortSignal.timeout(180000) });
        if (res.status >= 500 && /text\/html/.test(res.headers.get("content-type") || "") && versuch < 4) {
          await new Promise((x) => setTimeout(x, 3000 * versuch));
          continue;
        }
        break;
      } catch (e) {
        if (versuch >= 3) throw e;
        await new Promise((x) => setTimeout(x, 5000 * versuch));
      }
    }
    for (const c of res.headers.getSetCookie?.() || []) {
      const [paar] = c.split(";");
      const [name, wert] = paar.split("=");
      if (/oi_sitzung$/.test(name)) this.cookie = wert ? `${name}=${wert}` : "";
    }
    if (roh) return { status: res.status, typ: res.headers.get("content-type") || "", daten: Buffer.from(await res.arrayBuffer()) };
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 200) };
    }
    return { status: res.status, json, text };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  async login(email) {
    let r = await this.post("/api/auth/login", { email, passwort: DEMO_PASSWORT });
    for (let i = 1; r.status >= 500 && i <= 3; i++) {
      await new Promise((x) => setTimeout(x, 4000 * i));
      r = await this.post("/api/auth/login", { email, passwort: DEMO_PASSWORT });
    }
    if (r.status !== 200) throw new Error(`Login ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }
}

async function server() {
  const admin = new Client("admin");
  const kassier = new Client("kassier");
  const obmann = new Client("obmann");
  const pruefer = new Client("pruefer");
  const mitglied = new Client("mitglied");
  const fremd = new Client("fremd");
  await admin.login("admin@example.com");
  await kassier.login("eg-kassier@example.com");
  await obmann.login("eg-obmann@example.com");
  await pruefer.login("eg-pruefer@example.com");
  await mitglied.login("mitglied@example.com");
  await fremd.login("investor@example.com");
  const heute = new Date().toISOString().slice(0, 10);

  abschnitt("B1. Zugriff und Rechte je Gemeinschaft");
  let r = await admin.get("/api/admin/eg");
  const g = (r.json.gemeinschaften || []).find((x) => x.seedSchluessel === "sonnenland");
  if (!pruefe(!!g, "Demo-Gemeinschaft Sonnenland gefunden", r.status)) return;
  const api = `/api/portal/eg/${g.id}/abrechnung`;
  r = await kassier.get(api);
  pruefe(r.status === 200 && r.json.perioden.length >= 3 && r.json.stufen.freigabe1 === 2 && r.json.darfRechnen, "Kassier: Übersicht mit Demo-Perioden, 1. Auge", { s: r.status, e: r.json.error, n: r.json.perioden?.length });
  pruefe(r.json.perioden?.some((p) => ["abgeschlossen", "versendet"].includes(p.status)) && r.json.ku?.status, "Demo: abgerechnete Monate, Kleinunternehmer-Monitor", r.json.perioden?.map((p) => p.status));
  r = await pruefer.get(api);
  pruefe(r.status === 200 && r.json.stufen.vorschau === 1 && !r.json.darfRechnen, "Rechnungsprüfer: lesen, nicht rechnen", { s: r.status, st: r.json.stufen });
  r = await pruefer.post(api, { aktion: "anlegen", von: "2026-01-01", bis: "2026-01-31", art: "schluss" });
  pruefe(r.status === 403, "Rechnungsprüfer darf keine Periode anlegen → 403", r.status);
  r = await mitglied.get(api);
  pruefe(r.status === 403, "Mitglied ohne Organ-Funktion → 403", r.status);
  r = await fremd.get(api);
  pruefe(r.status === 404, "Fremdes Konto → 404 (keine Existenz verraten)", r.status);
  r = await kassier.post(api, { aktion: "anlegen", von: "2026-01-01", bis: "2026-01-31", art: "schluss" }, { origin: "https://boese.example.com" });
  pruefe(r.status === 403, "CSRF: fremde Herkunft → 403", r.status);

  abschnitt("B2. Periode, Vorschau, Vier-Augen-Freigabe, Versand");
  let periode = null;
  for (const m of [1, 2, 3, 4, 5, 6, 7]) {
    const bis = new Date(Date.UTC(2026, m, 0)).toISOString().slice(0, 10);
    r = await kassier.post(api, { aktion: "anlegen", von: `2026-${String(m).padStart(2, "0")}-01`, bis, art: "schluss" });
    if (r.status === 200) {
      periode = r.json.periode;
      break;
    }
  }
  if (!pruefe(!!periode, "Testperiode (Schlussabrechnung) angelegt", r.json)) return;
  const pApi = `${api}/perioden/${periode.id}`;
  r = await kassier.post(pApi, { aktion: "freigeben", fingerabdruck: "x" });
  pruefe(r.status === 409, "Freigabe ohne Vorschau → 409", r.status);
  r = await kassier.post(pApi, { aktion: "vorschau" });
  const v = r.json.periode?.vorschau;
  pruefe(r.status === 200 && v && Array.isArray(v.belege) && v.belege.every((b) => !b.nummer), `Vorschau ohne Belegnummern (${v?.belege?.length} Entwürfe, Datenquelle ${r.json.periode?.datenquelle})`, { s: r.status, e: r.json.error });
  pruefe(v?.belege?.some((b) => b.positionen?.every((x) => (x.pruefpfad || []).length >= 2)), "Prüfpfad je Belegzeile vorhanden");
  const blockiert = v?.pruefung?.fehler?.length || 0;
  const fp = r.json.periode?.fingerabdruck;
  if (blockiert) {
    r = await kassier.post(pApi, { aktion: "freigeben", fingerabdruck: fp });
    pruefe(r.status === 409, `Blockierende Prüfungen (${blockiert}) verhindern die Freigabe → 409`, v.pruefung.fehler.slice(0, 2));
    r = await kassier.post(pApi, { aktion: "verwerfen" });
    pruefe(r.status === 200, "Testperiode verworfen");
    return;
  }
  r = await pruefer.post(pApi, { aktion: "freigeben", fingerabdruck: fp });
  pruefe(r.status === 403, "Rechnungsprüfer kann nicht freigeben → 403", r.status);
  r = await kassier.post(pApi, { aktion: "freigeben", fingerabdruck: fp });
  pruefe(r.status === 200 && r.json.vollstaendig === false && r.json.periode.status === "freigabe_teilweise", "Kassier: 1. Auge", { s: r.status, e: r.json.error });
  r = await kassier.post(pApi, { aktion: "freigeben", fingerabdruck: fp });
  pruefe(r.status === 409, "Vier-Augen: dieselbe Person zweimal → 409", r.status);
  r = await obmann.post(pApi, { aktion: "freigeben", fingerabdruck: "falsch" });
  pruefe(r.status === 409, "Freigabe mit veraltetem Fingerabdruck → 409", r.status);
  r = await obmann.post(pApi, { aktion: "freigeben", fingerabdruck: fp });
  pruefe(r.status === 200 && r.json.vollstaendig && r.json.belege > 0 && r.json.periode.status === "freigegeben", `Obmann: 2. Auge – ${r.json.belege} Belege mit Nummern`, { s: r.status, e: r.json.error });
  r = await kassier.post(pApi, { aktion: "versenden" });
  pruefe([200, 403].includes(r.status), `Versand durch Kassier: ${r.status === 403 ? "nicht erlaubt (Organisator aktiv)" : "erlaubt (Selbstverwaltung)"}`, r.status);
  if (r.status !== 200) {
    r = await admin.post(pApi, { aktion: "versenden" });
    pruefe(r.status === 200 && r.json.versendet > 0, "Organisator versendet die Belege", { s: r.status, e: r.json.error });
  }
  r = await kassier.get(pApi);
  const belege = r.json.belege || [];
  pruefe(belege.length > 0 && belege.every((b) => /^(RE|GU)-20\d\d-\d{5}$/.test(b.nummer) && b.hash?.length === 64), "Belege fortlaufend nummeriert mit Prüfsumme");
  const eigener = belege.find((b) => b.kontoId && b.kontoId === mitglied.nutzer.id);
  const fremder = belege.find((b) => b.kontoId !== mitglied.nutzer.id);
  if (eigener) {
    const pdf = await mitglied.get(`${eigener.pdfUrl}?anzeigen=1`, { roh: true });
    pruefe(pdf.status === 200 && /pdf/.test(pdf.typ) && pdf.daten.slice(0, 5).toString() === "%PDF-", "Mitglied lädt eigenen Beleg als PDF", pdf.status);
  }
  if (fremder) {
    const pdf = await mitglied.get(fremder.pdfUrl, { roh: true });
    pruefe(pdf.status === 404, "Fremder Beleg für das Mitglied → 404", pdf.status);
  }
  const pdfK = await kassier.get(belege[0].pdfUrl, { roh: true });
  pruefe(pdfK.status === 200 && pdfK.daten.length > 2000, "Kassier lädt Beleg-PDF", pdfK.status);

  abschnitt("B3. Zahlungen, Kontoauszug, Mahnwesen");
  r = await kassier.post(`${api}/zahlungen`, { art: "pain008" });
  const lauf = r.json.lauf;
  pruefe(r.status === 200, `Lastschriftlauf: ${lauf?.anzahl || 0} Posten`, { s: r.status, e: r.json.error });
  if (lauf?.id) {
    r = await kassier.get(`${api}/zahlungen/${lauf.id}`, { roh: true });
    pruefe(r.status === 409, "Datei vor der zweiten Freigabe gesperrt → 409", r.status);
    r = await kassier.post(`${api}/zahlungen/${lauf.id}`, { aktion: "freigeben" });
    pruefe(r.status === 409, "Ersteller kann den eigenen Lauf nicht freigeben → 409", r.status);
    r = await admin.post(`${api}/zahlungen/${lauf.id}`, { aktion: "freigeben" });
    pruefe(r.status === 200, "Zweite Person gibt frei", { s: r.status, e: r.json.error });
    r = await kassier.get(`${api}/zahlungen/${lauf.id}`, { roh: true });
    const xml = r.daten?.toString() || "";
    pruefe(r.status === 200 && xml.includes("pain.008.001.08") && xml.includes("<CdtrSchmeId>"), "pain.008-Datei herunterladen", r.status);
    r = await kassier.post(`${api}/zahlungen/${lauf.id}`, { aktion: "verwerfen" });
    pruefe(r.status === 200, "Lauf verwerfen (Belege wieder offen)", r.status);
  }
  const rech = belege.find((b) => b.typ === "rechnung" && b.offen > 0);
  if (rech) {
    const camt = `<?xml version="1.0" encoding="UTF-8"?><Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02"><BkToCstmrStmt><Stmt><Ntry><Amt Ccy="EUR">${rech.offen.toFixed(2)}</Amt><CdtDbtInd>CRDT</CdtDbtInd><Sts>BOOK</Sts><BookgDt><Dt>${heute}</Dt></BookgDt><ValDt><Dt>${heute}</Dt></ValDt><NtryDtls><TxDtls><RmtInf><Ustrd>${rech.nummer}</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry></Stmt></BkToCstmrStmt></Document>`;
    r = await kassier.post(`${api}/camt`, { xml: camt });
    pruefe(r.status === 200 && r.json.buchungen?.[0]?.vorschlag?.art === "sicher", "camt.053: Belegnummer + Betrag → sichere Zuordnung", r.json.buchungen?.[0]?.vorschlag || r.json);
    r = await kassier.post(`${api}/camt`, { xml: camt, ausfuehren: true });
    pruefe(r.status === 200 && r.json.uebernommen === 1, "camt.053 übernommen → Zahlung gebucht", r.json);
    r = await kassier.post(`${api}/camt`, { xml: camt, ausfuehren: true });
    pruefe(r.status === 200 && r.json.uebernommen === 0, "Doppelter Import wird erkannt", r.json);
  }
  r = await pruefer.post(`${api}/camt`, { xml: "<x/>" });
  pruefe(r.status === 403, "Rechnungsprüfer importiert keine Kontoauszüge → 403", r.status);
  r = await kassier.get(`${api}/mahnlauf`);
  pruefe(r.status === 200 && Array.isArray(r.json.vorschlaege) && r.json.konfig.stufen[0].gebuehr === 0, `Mahnvorschläge (${r.json.vorschlaege?.length}), erste Stufe gebührenfrei`, r.status);
  r = await kassier.get(`${api}/mahnlauf?mandate=1`);
  pruefe(r.status === 200 && r.json.mandate.length > 5, "SEPA-Mandate mit Prüfung", r.status);

  abschnitt("B4. Buchhaltung, Export, Rechnungsprüfung");
  r = await pruefer.get(`${api}/buchhaltung`);
  pruefe(r.status === 200 && r.json.ea && r.json.uva.length === 4 && r.json.kassabuch, "Prüfer sieht E/A-Rechnung, UVA, Kassabuch", { s: r.status, e: r.json.error });
  r = await kassier.post(`${api}/buchhaltung`, { aktion: "buchung", daten: { datum: heute, konto: "7600", betrag: "4,20", ustSatz: 20, text: "Porto (Test)", geldkonto: "2800", belegNr: "TEST-1" } });
  pruefe(r.status === 200, "Kassier bucht eine Ausgabe", { s: r.status, e: r.json.error });
  r = await kassier.post(`${api}/buchhaltung`, { aktion: "buchung", daten: { datum: "2026-01-02", konto: "7600", betrag: "999999", text: "zu viel bar", geldkonto: "2700", belegNr: "Q-X" } });
  pruefe(r.status === 422, "Kassabuch darf nicht negativ werden → 422", r.status);
  r = await kassier.post(`${api}/buchhaltung`, { aktion: "pruefvermerk", daten: { ergebnis: "ohne_beanstandung" } });
  pruefe(r.status === 403, "Kassier erteilt keinen Prüfvermerk → 403", r.status);
  r = await pruefer.post(`${api}/buchhaltung`, { aktion: "pruefvermerk", daten: { ergebnis: "mit_hinweisen", text: "Stichproben in Ordnung, Belege vollständig (Test).", stichproben: [belege[0].nummer] } });
  pruefe(r.status === 200 && r.json.pruefvermerk?.hash?.length === 64, "Rechnungsprüfer erteilt Prüfvermerk mit Prüfsumme", { s: r.status, e: r.json.error });
  for (const art of ["bmd", "datev", "rzl", "ea", "paket"]) {
    r = await pruefer.get(`${api}/export?art=${art}`, { roh: true });
    pruefe(r.status === 200 && r.daten.length > 20, `Export ${art}`, r.status);
  }
  r = await mitglied.get(`${api}/export?art=ea`, { roh: true });
  pruefe(r.status === 403, "Mitglied: kein Export → 403", r.status);

  abschnitt("B5. Seiten");
  for (const [c, pfad, soll] of [[kassier, `/portal/eg/${g.id}/abrechnung?periode=${periode.id}`, 200], [kassier, `/portal/eg/${g.id}/kasse?tab=zahlungen`, 200], [pruefer, `/portal/eg/${g.id}/kasse?tab=steuer`, 200], [admin, `/portal/admin/eg/${g.id}/abrechnung`, 200], [admin, `/portal/admin/eg/${g.id}/buchhaltung?tab=export`, 200], [mitglied, `/portal/eg/${g.id}/kasse`, 404]]) {
    r = await c.get(pfad);
    pruefe(soll === 200 ? r.status === 200 && /Abrechnung|Kassa|Buchhaltung/.test(r.text) : r.status === 404 || (r.status === 200 && !r.text.includes("Kassa · ")), `${c.name}: ${pfad.replace(g.id, "…")} → ${soll === 200 ? "200" : "nicht gefunden (Streaming kann 200 mit Not-Found-Inhalt liefern)"}`, r.status);
  }

  abschnitt("B6. Storno (Aufräumen)");
  r = await kassier.post(pApi, { aktion: "stornieren", grund: "Automatischer Test – Testperiode wieder storniert" });
  pruefe(r.status === 200 && r.json.periode.status === "storniert" && r.json.stornos.every((x) => /^ST-/.test(x.nummer)), `Periode storniert (${r.json.stornos?.length} Stornobelege mit eigener Nummer)`, { s: r.status, e: r.json.error });
}

try {
  await logik();
  if (!NUR_LOGIK) await server();
} catch (e) {
  fehler++;
  console.error(rot(`Abbruch: ${e?.stack || e}`));
}
console.log(`\n${ok} bestanden, ${fehler} fehlgeschlagen`);
process.exit(fehler ? 1 : 0);
