// scripts/plattform-test-fach-kapital.mjs
//
// Fachprüfung Kapitalseite (Investor, Anbieter, Unternehmen, Mitglied, Backoffice-Transaktion).
//   node scripts/plattform-test-fach-kapital.mjs [basis-url]      (Logik-Teil läuft auch ohne Server: --nur-logik)
//
// Teil A – reine Logik (Node, ohne Server): MaLo-Prüfziffer, MeLo/Zählpunkt AT/CH, Lastgang-Parser (15 min, Stunden,
//   kWh/kW/W, Zeitumstellung März/Oktober, durchgehend MEZ, Intervallende, Zeitzonen-Offsets, Lücken, Zählerstände),
//   Lastgang-Analyse (Jahresmenge, Spitze, Benutzungsstunden, PV-Deckung, Pool), Datenblatt (Bereinigung, Phase,
//   Plausibilität P90 < P50, DC/AC, MWp/ha, Ertrag je Region, Fristen), DD-Index, LOI-Pflichtfelder, Suchprofil,
//   Bewertung (max. Kaufpreis monoton), Genossenschaft, Gleichheit der Frappe-Kopien (Schema, Marktwerte).
// Teil B – gegen den laufenden Dev-Server (eigene Konten fk-test-<Lauf>@example.com, Demo-Daten bleiben unberührt):
//   Datenblatt speichern und NICHT öffentlich, Datenraum-Qualität mit Datenblatt, DD-Index/Bewertung nur nach NDA,
//   Szenario speichern, strukturierte LOI (Pflichtfelder), Energie-Stammdaten (MaLo 422/200, fremde → 403),
//   Lastgang-Import mit Analyse und Rechten, Angebotsanfrage → Vorgang, Mitglied (Genossenschaft/EEG),
//   Rechte unverändert (Rollen 403), Anlagen: Eigentümer sichtbar, keine Komponenten für Kunden, Seiten 200/404.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lade = (p) => import(pathToFileURL(path.join(WURZEL, p)).href);
const NUR_LOGIK = process.argv.includes("--nur-logik");
const BASIS = (process.argv.find((a) => a.startsWith("http")) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);
const PASSWORT = "Fach-Kapital-Test-26";

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
    console.log(`  ${rot("✗")} ${text}${details !== undefined ? ` – ${JSON.stringify(details).slice(0, 400)}` : ""}`);
  }
  return bedingung;
}
const ueberspringen = (text) => {
  uebersprungen++;
  console.log(`  ${gelb("○")} ${text}`);
};
const abschnitt = (t) => console.log(`\n${t}`);

// ---------------------------------------------------------------- Hilfen: synthetische Lastgänge

function zweistellig(x) {
  return String(x).padStart(2, "0");
}
/** Ortszeit-Datei eines Jahres (Viertelstunden) aus einer Lastfunktion, Zeitumstellung wie im echten Export */
function lastgangCsv(ortszeit, { jahr = 2025, einheit = "kWh", kopf = true, ende = false, nurMez = false, sep = ";", komma = true, lastKw = () => 100 } = {}) {
  const zeilen = kopf ? ["Zählpunkt;DE00056266802AO6G56M11SN51G21M24S", `Datum${sep}Uhrzeit${sep}${einheit === "kW" ? "Leistung [kW]" : einheit === "W" ? "Leistung [W]" : "Energie [kWh]"}`] : [];
  let ms = Date.UTC(jahr - 1, 11, 31, 23, 0);
  const bis = Date.UTC(jahr, 11, 31, 23, 0);
  for (; ms < bis; ms += 900000) {
    const o = nurMez ? ortszeit(ms, true) : ortszeit(ms);
    const kw = lastKw(o);
    const wert = einheit === "kWh" ? kw / 4 : einheit === "W" ? kw * 1000 : kw;
    const t = ende ? (nurMez ? ortszeit(ms + 900000, true) : ortszeit(ms + 900000)) : o;
    const w = komma ? String(wert).replace(".", ",") : String(wert);
    zeilen.push(`${zweistellig(t.tag)}.${zweistellig(t.monat + 1)}.${t.jahr}${sep}${zweistellig(t.stunde)}:${zweistellig(t.minute)}${sep}${w}`);
  }
  return zeilen.join("\r\n");
}

// ================================================================ Teil A – Logik

async function logik() {
  const energie = await lade("src/lib/plattform/fach/energie.js");
  const lg = await lade("src/lib/plattform/fach/lastgang.js");
  const db = await lade("src/lib/plattform/fach/datenblatt.js");
  const loi = await lade("src/lib/plattform/fach/loi.js");
  const sp = await lade("src/lib/plattform/fach/suchprofil.js");
  const bw = await lade("src/lib/plattform/fach/bewertung.js");
  const mg = await lade("src/lib/plattform/fach/mitglied.js");
  const mw = await lade("src/lib/plattform/fach/marktWerte.js");
  const schema = (await lade("src/lib/plattform/fach/datenblatt-schema.js")).default;

  abschnitt("A1. Mess- und Marktlokation (DE/AT/CH)");
  pruefe(energie.maloPruefen("41373559241").ok, "MaLo 41373559241 gültig (BDEW-Beispiel)");
  pruefe(energie.maloPruefen("5123 8696 781").ok, "MaLo mit Leerzeichen wird normalisiert");
  pruefe(!energie.maloPruefen("41373559242").ok && /Prüfziffer/.test(energie.maloPruefen("41373559242").fehler), "Falsche Prüfziffer erkannt");
  pruefe(!energie.maloPruefen("01373559241").ok, "MaLo mit führender 0 abgelehnt");
  pruefe(!energie.maloPruefen("4137355924").ok, "MaLo mit 10 Ziffern abgelehnt");
  pruefe(energie.maloPruefziffer("4137355924") === 1, "Prüfziffer berechnet");
  // Stichprobe: jede 10-stellige Basis + berechnete Prüfziffer ist gültig, jede andere Endziffer ungültig
  let stich = true;
  for (let i = 0; i < 200; i++) {
    const basis = String(1000000000 + Math.floor(Math.random() * 8999999999)).slice(0, 10);
    const pz = energie.maloPruefziffer(basis);
    if (!energie.maloPruefen(basis + pz).ok || energie.maloPruefen(basis + ((pz + 1) % 10)).ok) stich = false;
  }
  pruefe(stich, "200 Zufalls-MaLo: Prüfziffer erkennt jede Einzelziffer-Abweichung");
  pruefe(energie.zaehlpunktPruefen("DE00056266802AO6G56M11SN51G21M24S", "DE").ok, "MeLo-ID 33 Zeichen gültig");
  pruefe(energie.zaehlpunktPruefen("at 003000 00000 0000000000 0000012345", "AT").ok, "AT-Zählpunkt mit Leerzeichen gültig");
  pruefe(!energie.zaehlpunktPruefen("AT003000000000000000000000001234", "AT").ok, "AT-Zählpunkt mit 32 Zeichen abgelehnt");
  pruefe(!energie.zaehlpunktPruefen("DE0030000000000000000000000012345", "AT").ok, "DE-Kennung als AT-Zählpunkt abgelehnt");
  pruefe(energie.zaehlpunktPruefen("CH1234567890123456789012345678901", "CH").ok, "CH-Messpunkt gültig");
  let err = null;
  try {
    energie.abnahmestelleBereinigen({ bezeichnung: "Werk", land: "DE", maloId: "41373559242", messart: "rlm", jahresverbrauchKwh: 1 });
  } catch (e) {
    err = e;
  }
  pruefe(err?.status === 422, "Abnahmestelle mit falscher MaLo → 422");
  const h = energie.abnahmestelleHinweise({ land: "DE", messart: "slp", jahresverbrauchKwh: 250000, vertragEnde: "2026-12-31", kuendigungsfristMonate: 3, stromsteuerEntlastung: null }, { jetzt: "2026-09-30" });
  pruefe(h.some((x) => /RLM/.test(x.text)) && h.some((x) => /Kündigung|Kündigungsfrist/.test(x.text)), "Hinweise: SLP über 100 MWh, Kündigungsfenster");
  const hi = energie.abnahmestelleHinweise({ land: "DE", messart: "rlm", jahresverbrauchKwh: 12e6, par19: "keine" }, { benutzungsstunden: 7600 });
  pruefe(hi.some((x) => /§ 19 Abs\. 2 S\. 2/.test(x.text)), "Hinweis stromintensive Netznutzung (§ 19) bei ≥ 7.000 h und > 10 GWh");
  err = null;
  try {
    energie.egTeilnahmeBereinigen({ land: "AT", form: "eeg_lokal", rolle: "beides", zaehlpunkt: "AT0030000000000000000000000012345", zaehlpunktEinspeisung: "AT0030000000000000000000000012345", netzbetreiber: "Netz OÖ", plz: "5121" });
  } catch (e) {
    err = e;
  }
  pruefe(err?.status === 422, "EEG: gleicher Zählpunkt für Bezug und Einspeisung → 422");

  abschnitt("A2. Lastgang-Parser und Zeitumstellung");
  const last = (o) => 100 + (o.wochentag < 5 && o.stunde >= 6 && o.stunde < 18 ? 200 : 0);
  const soll = (() => {
    let s = 0;
    for (let ms = Date.UTC(2024, 11, 31, 23, 0); ms < Date.UTC(2025, 11, 31, 23, 0); ms += 900000) s += last(lg.ortszeit(ms)) / 4;
    return s;
  })();
  let g = lg.lastgangParsen(lastgangCsv(lg.ortszeit, { lastKw: last }));
  pruefe(g.ok && g.n === 35040 && g.statistik.luecken === 0 && g.statistik.doppelt === 0, "Jahr in Ortszeit (kWh/15 min): 35.040 Viertelstunden, keine Lücken", g.statistik);
  pruefe(g.einheit === "kWh" && g.einheitQuelle === "datei", "Einheit kWh aus dem Kopf erkannt");
  pruefe(g.statistik.dstDoppelt === 4 && g.statistik.dstLuecke === 1 && g.zeitbasis === "mez_mesz", "Oktober: 4 doppelte Viertelstunden zugeordnet, März: fehlende Stunde ist keine Lücke", g.statistik);
  let a = lg.lastgangAnalyse(g, { regionId: "de-sued", preisCt: 22 });
  pruefe(Math.abs(a.jahresverbrauchKwh - soll) < 1, "Jahresverbrauch exakt", [a.jahresverbrauchKwh, soll]);
  pruefe(a.spitzeKw === 300 && a.grundlastKw === 100 && a.benutzungsstunden === Math.round(soll / 300), "Spitze, Grundlast, Benutzungsstunden", [a.spitzeKw, a.grundlastKw, a.benutzungsstunden]);
  pruefe(a.wochenprofil[0][10] === 300 && a.wochenprofil[6][10] === 100, "Wochenprofil: Mo 10 Uhr 300 kW, So 100 kW (Ortszeit)", [a.wochenprofil[0][10], a.wochenprofil[6][10]]);
  pruefe(a.pv.varianten.length >= 3 && a.pv.varianten.every((v, i, l) => i === 0 || v.eigenverbrauchKwh >= l[i - 1].eigenverbrauchKwh) && a.pv.varianten.every((v) => v.evQuote <= 1 && v.autarkie <= 1), "PV-Varianten: Eigenverbrauch steigt mit Größe, Quoten ≤ 100 %");
  pruefe(a.pool.ersparnisEurMax > a.pool.ersparnisEurMin && a.pool.ersparnisEurMin > 0 && a.pool.reststromKwh < a.jahresverbrauchKwh, "Pool-Ersparnis als Spanne auf den Reststrom", a.pool);
  g = lg.lastgangParsen(lastgangCsv(lg.ortszeit, { lastKw: last, einheit: "kW", sep: "\t", komma: false }));
  pruefe(g.ok && g.einheit === "kW" && Math.abs(lg.lastgangAnalyse(g).jahresverbrauchKwh - soll) < 1, "Tabulator, Dezimalpunkt, kW-Mittelwerte → gleicher Verbrauch");
  g = lg.lastgangParsen(lastgangCsv(lg.ortszeit, { lastKw: last, einheit: "W" }));
  pruefe(g.ok && g.einheit === "W" && Math.abs(lg.lastgangAnalyse(g).spitzeKw - 300) < 0.01, "Watt werden in kW umgerechnet");
  g = lg.lastgangParsen(lastgangCsv(lg.ortszeit, { lastKw: last, ende: true }));
  pruefe(g.ok && g.n === 35040 && g.statistik.luecken === 0 && g.hinweise.some((x) => /Intervallende/.test(x.text)), "Zeitstempel am Intervallende erkannt und verschoben", g.statistik);
  const mez = (ms) => {
    const d = new Date(ms + 3600000);
    return { jahr: d.getUTCFullYear(), monat: d.getUTCMonth(), tag: d.getUTCDate(), stunde: d.getUTCHours(), minute: d.getUTCMinutes(), wochentag: (d.getUTCDay() + 6) % 7 };
  };
  g = lg.lastgangParsen(lastgangCsv((ms) => mez(ms), { lastKw: last }));
  pruefe(g.ok && g.zeitbasis === "mez" && g.statistik.luecken === 0 && g.n === 35040, "Datei durchgehend in MEZ (Winterzeit) erkannt", [g.zeitbasis, g.statistik]);
  g = lg.lastgangParsen(lastgangCsv(lg.ortszeit, { lastKw: last, kopf: false }));
  pruefe(g.ok && g.einheitQuelle === "annahme" && g.hinweise.some((x) => /Einheit nicht erkannt/.test(x.text)), "Ohne Kopf: Einheit als kW angenommen, mit Warnung");
  g = lg.lastgangParsen(lastgangCsv(lg.ortszeit, { lastKw: last, kopf: false }), { einheit: "kWh" });
  pruefe(g.ok && g.einheitQuelle === "vorgabe" && Math.abs(lg.lastgangAnalyse(g).jahresverbrauchKwh - soll) < 1, "Einheit durch Nutzer vorgegeben");
  // Stundenwerte (kWh je Stunde) mit ISO-Zeitstempeln und Offset
  const iso = ["Zeitstempel;Verbrauch kWh"];
  for (let ms = Date.UTC(2025, 2, 29, 23, 0); ms < Date.UTC(2025, 3, 5, 23, 0); ms += 3600000) {
    const off = lg.versatzH(ms);
    const lokal = new Date(ms + off * 3600000).toISOString().slice(0, 16);
    iso.push(`${lokal}:00+0${off}:00;50`);
  }
  g = lg.lastgangParsen(iso.join("\n"));
  pruefe(g.ok && g.intervallMin === 60 && g.zeitbasis === "offset" && g.statistik.luecken === 0 && Math.abs(lg.lastgangAnalyse(g).mittelKw - 50) < 0.01, "Stundenwerte mit ISO-Offset über die Zeitumstellung", [g.intervallMin, g.zeitbasis, g.statistik]);
  // Lücken und Zählerstände
  const mitLuecke = lastgangCsv(lg.ortszeit, { lastKw: last }).split("\r\n").filter((_, i) => i < 1000 || i > 1400).join("\r\n");
  g = lg.lastgangParsen(mitLuecke);
  pruefe(g.ok && g.statistik.luecken === 401 && g.hinweise.some((x) => /fehlen/.test(x.text)) && lg.lastgangAnalyse(g).zeitraum.abdeckung < 1, "401 fehlende Viertelstunden erkannt, Jahr hochgerechnet", g.statistik.luecken);
  const zaehler = ["Datum;Uhrzeit;Zählerstand kWh"];
  for (let i = 0; i < 400; i++) zaehler.push(`01.0${1 + Math.floor(i / 96)}.2025;${zweistellig(Math.floor((i % 96) / 4))}:${zweistellig((i % 4) * 15)};${(100000 + i * 25).toString().replace(".", ",")}`);
  g = lg.lastgangParsen(zaehler.join("\n"));
  pruefe(!g.ok && /Zählerstände/.test(g.fehler), "Kumulierte Zählerstände werden abgelehnt", g.fehler);
  pruefe(!lg.lastgangParsen("a;b\n1;2").ok, "Zu kurze Datei abgelehnt");

  abschnitt("A3. Projektdatenblatt und Plausibilität");
  const P = (x = {}) => ({ typ: "freiflaeche", land: "DE", bundesland: "Bayern", phase: "satzung", mwp: 12, flaecheHa: 13, netzanschluss: "zusage", codGeplant: "2028-06", vertraulich: { ertragKwhKwp: 1100 }, datenblatt: {}, ...x });
  const d0 = db.datenblattBereinigen({ mwac: "10,5", aufstaenderung: "quatsch", ertragP90: 990, fremd: 1, zusageDatum: "2025-02-30", ertraege: [{ jahr: 2024, istMwh: "1000" }, { jahr: "x" }] });
  pruefe(JSON.stringify(d0) === JSON.stringify({ mwac: 10.5, ertragP90: 990, ertraege: [{ jahr: 2024, istMwh: 1000, prognoseMwh: null }] }), "Positivliste: unbekannte Felder, ungültige Auswahl und 30.02. entfernt", d0);
  pruefe(JSON.stringify(db.datenblattBereinigen(undefined, { mwac: 1 })) === '{"mwac":1}', "PATCH ohne Datenblatt behält das gespeicherte");
  pruefe(db.datenblattVollstaendigkeit(P({ phase: "flaeche" })).erwartet < db.datenblattVollstaendigkeit(P({ phase: "rtb" })).erwartet, "Pflichtfelder wachsen mit der Phase");
  pruefe(db.datenblattVollstaendigkeit(P({ phase: "cod" })).bereiche.find((b) => b.id === "bestand").erwartet >= 7, "Bestand: Ist-Erträge, Verfügbarkeit, O&M … sind Pflicht");
  pruefe(!db.feldRelevant(P({ typ: "speicher" }), db.DATENBLATT_FELDER.find((f) => f.id === "ertragP90")), "Speicher: kein Ertragsgutachten");
  pruefe(db.feldErwartet(P({ datenblatt: { vermarktung: "eeg" } }), db.DATENBLATT_FELDER.find((f) => f.id === "eegZuschlagCt")) && !db.feldErwartet(P({ datenblatt: { vermarktung: "ppa" } }), db.DATENBLATT_FELDER.find((f) => f.id === "eegZuschlagCt")), "Bedingte Pflicht: Zuschlagswert nur bei EEG");
  const stufe = (p, feld) => db.datenblattPruefen(p, { jetzt: "2026-09-30" }).find((x) => x.feld === feld)?.stufe;
  pruefe(stufe(P({ datenblatt: { ertragP90: 1150 } }), "ertragP90") === "fehler", "P90 ≥ P50 ist ein Fehler");
  pruefe(!stufe(P({ datenblatt: { ertragP90: 1010 } }), "ertragP90"), "P90 = 92 % von P50 ist plausibel");
  pruefe(stufe(P({ datenblatt: { ertragP90: 1090 } }), "ertragP90") === "warnung", "P90/P50 > 97 % → Warnung (10-Jahres-P90?)");
  pruefe(stufe(P({ datenblatt: { ertragP75: 1120, ertragP90: 1000 } }), "ertragP75") === "fehler", "P75 über P50 → Fehler");
  pruefe(stufe(P({ datenblatt: { mwac: 6 } }), "mwac") === "warnung" && !stufe(P({ datenblatt: { mwac: 10 } }), "mwac"), "DC/AC 2,0 → Warnung, 1,2 plausibel");
  pruefe(stufe(P({ flaecheHa: 4 }), "flaecheHa") === "warnung", "3 MWp/ha bei Süd-Aufständerung → zu dicht");
  pruefe(stufe(P({ vertraulich: { ertragKwhKwp: 1400 } }), "ertragKwhKwp") === "warnung", "P50 1.400 kWh/kWp in Bayern → über regionalem Richtwert");
  pruefe(stufe(P({ bundesland: "Schleswig-Holstein", vertraulich: { ertragKwhKwp: 1100 } }), "ertragKwhKwp") === "warnung" && !stufe(P({ bundesland: "Bayern" }), "ertragKwhKwp"), "Gleicher P50 im Norden unplausibel, im Süden plausibel");
  pruefe(stufe(P({ datenblatt: { zusageBefristetBis: "2026-01-31" } }), "zusageBefristetBis") === "fehler", "Abgelaufene Netzreservierung → Fehler");
  pruefe(stufe(P({ datenblatt: { zusageMw: 8, mwac: 10 } }), "zusageMw") === "warnung", "Zusage unter AC-Leistung ohne Überbauung → Warnung");
  pruefe(stufe(P({ datenblatt: { eegRealisierungsfrist: "2027-12-31" } }), "eegRealisierungsfrist") === "warnung", "COD nach Realisierungsfrist → Warnung");
  pruefe(stufe(P({ datenblatt: { mAufstellung: "2025-05-01", mSatzung: "2025-01-01" } }), "mSatzung") === "fehler", "Satzung vor Aufstellungsbeschluss → Fehler");
  pruefe(stufe(P({ typ: "agri", flaecheHa: 14, datenblatt: { genehmigungsweg: "par35" } }), "genehmigungsweg") === "warnung", "Agri-PV über 2,5 ha nach § 35 → Warnung");
  pruefe(stufe(P({ phase: "cod", datenblatt: { ertraege: [{ jahr: 2024, istMwh: 800, prognoseMwh: 1000 }] } }), "ertraege") === "warnung", "Bestand: Ist 80 % der Prognose → Warnung");
  const dd = db.ddIndex(P({ phase: "flaeche" }), { punkte: [{ id: "pacht", label: "Pacht", erwartet: true, pflicht: true, vorhanden: false }] });
  pruefe(dd.kategorien.length === 8 && dd.kategorien.map((k) => k.id).join() === "technisch,rechtlich,netz,genehmigung,ertrag,kaufmaennisch,steuern,umwelt", "DD-Index mit acht Kategorien nach Marktstandard");
  pruefe(dd.kategorien.find((k) => k.id === "rechtlich").fehlend.includes("Unterlage: Pacht") && dd.kategorien.find((k) => k.id === "ertrag").ampel === "grau", "Fehlende Pachtverträge im Recht, Ertrag in der Flächenphase noch grau");
  pruefe(db.ddIndex(P({ datenblatt: { ertragP90: 1200 } })).kategorien.find((k) => k.id === "ertrag").ampel === "rot", "Widerspruch P90 → Ertrag rot");

  abschnitt("A4. LOI-Pflichtfelder");
  const L = { struktur: true, text: "Angebot nach Prüfung des Datenraums.", preisbasis: "proKwp", preisProKwp: 90, transaktion: "share", zahlung: "einmal", bedingungenListe: ["dd", "gremien"], finanzierung: "ek", gueltigBis: "2026-11-30", exklusivitaetWochen: 8 };
  const wirft = (x, kontext = { mwp: 10, jetzt: "2026-09-30" }) => {
    try {
      loi.loiBereinigen(x, kontext);
      return false;
    } catch (e) {
      return e.status === 422;
    }
  };
  const r0 = loi.loiBereinigen(L, { mwp: 10, jetzt: "2026-09-30" });
  pruefe(r0.betrag === 900000 && r0.version === 2 && r0.bedingungen.includes("Due Diligence"), "€/kWp × kWp = Eigenkapitalpreis, Bedingungen als Text", r0);
  pruefe(loi.loiBereinigen({ betrag: 600000, text: "Indikatives Angebot aus dem Test." }).betrag === 600000, "Bisherige LOI (Betrag + Text) bleibt gültig");
  pruefe(wirft({ text: "Ohne jeden Preis angegeben" }), "LOI ohne Preis → 422");
  pruefe(wirft({ ...L, text: "kurz" }), "Text < 10 Zeichen → 422");
  for (const f of ["transaktion", "zahlung", "gueltigBis", "finanzierung"]) pruefe(wirft({ ...L, [f]: "" }), `Strukturierte LOI ohne ${f} → 422`);
  pruefe(wirft({ ...L, bedingungenListe: [] }), "Ohne Bedingungen (oder „keine“) → 422");
  pruefe(wirft({ ...L, bedingungenListe: ["keine", "dd"] }), "„Keine Bedingungen“ plus Bedingung → 422");
  pruefe(wirft({ ...L, gueltigBis: "2026-09-01" }) && wirft({ ...L, gueltigBis: "2027-12-31" }), "Gültigkeit in der Vergangenheit oder > 12 Monate → 422");
  pruefe(wirft({ ...L, zahlung: "earnout", zahlungDetails: "" }), "Earn-out ohne Beschreibung → 422");
  const ev = loi.loiBereinigen({ ...L, preisbasis: "ev", enterpriseValue: 5e6, nettoschulden: 3e6 }, { mwp: 10, jetzt: "2026-09-30" });
  pruefe(ev.betrag === 2e6 && ev.enterpriseValue === 5e6, "Enterprise Value − Nettofinanzverbindlichkeiten = Eigenkapitalwert");
  pruefe(wirft({ ...L, preisbasis: "ev", enterpriseValue: 1e6, nettoschulden: 2e6 }), "Negativer Eigenkapitalwert → 422");
  pruefe(loi.loiZeilen(r0).some((z) => z.label === "Exklusivität"), "Anzeigezeilen für Investor und Backoffice");

  abschnitt("A5. Suchprofil, Bewertung, Genossenschaft");
  const e = sp.suchprofilErweiterung({ investorTyp: "fonds", regionen: ["Bayern", "Mars"], renditeZielPct: "7,5", dealStrukturen: ["share", "x"], esg: ["taxonomie", "y"], coDevelopment: "vielleicht" }, ["Bayern", "Tirol"]);
  pruefe(e.investorTyp === "fonds" && e.regionen.join() === "Bayern" && e.renditeZielPct === 7.5 && e.dealStrukturen.join() === "share" && e.esg.join() === "taxonomie" && e.coDevelopment === "egal", "Suchprofil-Erweiterung: Positivlisten", e);
  const ph = sp.passungHinweise({ bundesland: "Tirol", phase: "netz", datenraumQualitaet: 40 }, { regionen: ["Bayern"], coDevelopment: "nein", datenraumMin: 60 }, { struktur: "asset" });
  pruefe(ph.pruefen.length === 3 && ph.passt.length === 0, "Passungshinweise: Region, Frühphase, Datenraum", ph);
  const proj = { typ: "freiflaeche", land: "DE", bundesland: "Brandenburg", phase: "rtb", mwp: 20, flaecheHa: 22, preisModus: "proKwp", preisProKwp: 95 };
  const vb = bw.bewertungVorbelegung(proj, { ertragKwhKwp: 1050, entfernungNetzKm: 2 }, { ertragP90: 965, capexEurKwp: 450, vermarktung: "eeg", eegZuschlagCt: 5.2, pachtEurHa: 2500 });
  pruefe(vb.modus === "entwicklung" && vb.quellen.p90 === "Datenblatt" && vb.quellen.kaufpreisKwp === "Exposé" && vb.eingaben.preisCt === 5.2, "Vorbelegung aus Datenblatt und Exposé mit Herkunft", vb.quellen);
  const ra = bw.bewertungRechnen("entwicklung", { ...vb.eingaben, zielRenditePct: 4 });
  const rb = bw.bewertungRechnen("entwicklung", { ...vb.eingaben, zielRenditePct: 6 });
  pruefe(ra.p50.ekIrr > ra.p90.ekIrr && ra.p90.dscrMin >= 1.14, "P90 schlechter als P50, Darlehen auf P90 bemessen (DSCR ≥ 1,15)", [ra.p50.ekIrr, ra.p90.ekIrr, ra.p90.dscrMin]);
  pruefe(ra.maxKaufpreisKwp === null || rb.maxKaufpreisKwp === null || ra.maxKaufpreisKwp >= rb.maxKaufpreisKwp, "Höhere Ziel-Rendite → niedrigerer maximaler Kaufpreis", [ra.maxKaufpreisKwp, rb.maxKaufpreisKwp]);
  const vbb = bw.bewertungVorbelegung({ ...proj, phase: "cod", preisModus: "gesamt", preis: 1e7 }, {}, { codDatum: "2017-06-30", ertraege: [{ jahr: 2024, istMwh: 21000, prognoseMwh: 21500 }], eegZuschlagCt: 7.5 });
  pruefe(vbb.modus === "bestand" && vbb.eingaben.ertragKwhKwp === 1050 && bw.bewertungRechnen("bestand", vbb.eingaben).kaufIrr !== undefined, "Bestand: Ist-Ertrag aus dem Datenblatt, IRR zum Kaufpreis");
  let gf = null;
  try {
    mg.genoInteresseBereinigen({ anteile: 4, art: "privat", interessen: ["beteiligung"], bestaetigt: { aufbau: true } });
  } catch (x) {
    gf = x;
  }
  pruefe(gf?.status === 422, "Genossenschaft: ohne alle Bestätigungen → 422");
  pruefe(mg.GENO_HINWEISE.DE.some((x) => /§ 65 GenG/.test(x.text)) && mg.GENO_HINWEISE.DE.some((x) => /§ 6 Nr\. 3 GenG/.test(x.text)) && mg.GENO_HINWEISE.CH.some((x) => /Art\. 844 OR/.test(x.text)), "Hinweise mit Kündigungsfrist (§ 65 GenG), Nachschusspflicht (§ 6 Nr. 3 GenG), Austritt CH");

  abschnitt("A6. Frappe-Kopien identisch");
  const py = JSON.parse(readFileSync(path.join(WURZEL, "Backend-Import/oekoinvest_app/oekoinvest_app/plattform/fach/datenblatt_schema.json"), "utf8"));
  pruefe(JSON.stringify(py) === JSON.stringify(schema), "datenblatt_schema.json (Frappe) = datenblatt-schema.js");
  const pm = JSON.parse(readFileSync(path.join(WURZEL, "Backend-Import/oekoinvest_app/oekoinvest_app/plattform/fach/markt_werte.json"), "utf8"));
  pruefe(JSON.stringify(pm) === JSON.stringify(mw.marktWerte()), "markt_werte.json (Frappe) = Auszug aus markt.js");
  const ids = schema.bereiche.flatMap((b) => b.felder.map((f) => f.id));
  pruefe(new Set(ids).size === ids.length && schema.bereiche.every((b) => b.felder.every((f) => !f.dd || schema.dd[f.dd])), "Schema: eindeutige Feld-IDs, DD-Kategorien gültig");
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
  put = (p, b, o) => this.anfrage("PUT", p, b ?? {}, o);
  patch = (p, b, o) => this.anfrage("PATCH", p, b ?? {}, o);
  del = (p, b, o) => this.anfrage("DELETE", p, b, o);
  async login(email, passwort = DEMO_PASSWORT) {
    const r = await this.post("/api/auth/login", { email, passwort });
    if (r.status !== 200) throw new Error(`Login ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }
  async registrieren(schluessel, rollen) {
    const email = `fk-test-${LAUF}-${schluessel}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email, passwort: PASSWORT, vorname: "Fach", nachname: `Test ${schluessel}`, firma: `Fachtest ${schluessel} (Test)`, rollen, agb: true });
    if (r.status !== 201) throw new Error(`Registrierung ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }
}

async function http() {
  const gast = new Client("gast");
  const admin = new Client("admin");
  const anbieter = new Client("anbieter");
  const investor = new Client("investor");
  const fremdInvestor = new Client("fremd");
  const firma = new Client("unternehmen");
  const firma2 = new Client("unternehmen2");
  const mitglied = new Client("mitglied");
  await admin.login("admin@example.com");
  await anbieter.registrieren("anbieter", ["anbieter"]);
  await investor.registrieren("investor", ["investor"]);
  await fremdInvestor.registrieren("fremd", ["investor"]);
  await firma.registrieren("firma", ["unternehmen"]);
  await firma2.registrieren("firma2", ["unternehmen"]);
  await mitglied.registrieren("mitglied", ["mitglied"]);

  abschnitt("B1. Datenblatt: speichern, vertraulich, Datenraum-Qualität");
  let r = await anbieter.post("/api/portal/projekte", { titel: `Fachtest Freifläche 10 MWp ${LAUF}` });
  const pid = r.json.projekt?.id;
  pruefe(r.status === 200 && pid, "Projekt angelegt", r.json);
  const grund = {
    titel: `Fachtest Freifläche 10 MWp ${LAUF}`, typ: "freiflaeche", land: "DE", bundesland: "Brandenburg", region: "Uckermark (Test)", mwp: 10, flaecheHa: 11, phase: "rtb", netzanschluss: "zusage", codGeplant: "2027-10",
    preisModus: "proKwp", preisProKwp: 90, beschreibung: "Fachtest-Projekt der Kapitalseite: baureif, Netzzusage vorhanden, Datenblatt vollständig ausgefüllt. Keine echten Angaben.", highlights: ["Baureif"],
    vertraulich: { gemeinde: `Fachgemeinde-${LAUF}`, netzbetreiber: "Test-Netz", einspeisepunkt: "UW Test, 20 kV", entfernungNetzKm: 2, ertragKwhKwp: 1040 },
  };
  r = await anbieter.patch(`/api/portal/projekte/${pid}`, grund);
  const q0 = r.json.projekt?.checkliste;
  pruefe(r.status === 200 && q0?.datenblatt?.quote < 30 && q0.quote === Math.round(q0.quoteUnterlagen * 0.7 + q0.datenblatt.quote * 0.3), "Kaum Datenblatt: Qualität = 70 % Unterlagen + 30 % Datenblatt", q0 && [q0.quote, q0.quoteUnterlagen, q0.datenblatt?.quote]);
  const datenblatt = {
    mwac: 8.4, aufstaenderung: "sued", modulTyp: "TOPCon bifazial (Test)", wrKonzept: "string", wrTyp: "String-WR (Test)", ertragP75: 1000, ertragP90: 960, ertragGutachter: "Testbüro", ertragDatenbasis: "meteonorm",
    spannungsebene: "ms_uw", zusageDatum: "2025-11-14", zusageMw: 8.4, zusageBefristetBis: "2028-06-30", ueberbauung: "nein", genehmigungsweg: "bplan", mAufstellung: "2025-01-10", mSatzung: "2025-12-01",
    mBaugenehmigung: "2026-04-01", genehmigungBestandskraft: "ja", eigentuemerAnzahl: 2, gesichertPct: 100, pachtLaufzeitJahre: 30, pachtEurHa: 2600, dinglich: "eingetragen", flaechenkulisse: "benachteiligt",
    vermarktung: "eeg", eegZuschlagCt: 4.84, eegZuschlagDatum: "2025-07-01", eegRealisierungsfrist: "2027-12-31", capexEurKwp: 460, opexEurKwp: 9, struktur: "share", spvRechtsform: "GmbH & Co. KG", spvGrundbesitz: "nein",
    umfang: "voll", zahlung: "einmal", uvp: "nein", artenschutz: "liegt_vor", schutzgebiet: "keins", geheimfeld: "darf nicht gespeichert werden",
  };
  r = await anbieter.patch(`/api/portal/projekte/${pid}`, { ...grund, datenblatt });
  const q1 = r.json.projekt?.checkliste;
  pruefe(r.status === 200 && r.json.projekt.datenblatt?.ertragP90 === 960 && !("geheimfeld" in r.json.projekt.datenblatt), "Datenblatt gespeichert (Positivliste)", r.json.projekt?.datenblatt);
  pruefe(q1?.datenblatt?.quote === 100 && q1.quote > q0.quote, "Datenblatt vollständig → Datenraum-Qualität steigt", q1 && [q0.quote, q1.quote, q1.datenblatt?.bereiche?.filter((b) => b.fehlend.length)]);
  r = await anbieter.patch(`/api/portal/projekte/${pid}`, grund);
  pruefe(r.json.projekt?.datenblatt?.ertragP90 === 960, "PATCH ohne Datenblatt lässt es unverändert");
  await anbieter.post(`/api/portal/projekte/${pid}/provision`, { akzeptiert: true });
  r = await anbieter.post("/api/portal/status", { art: "projekt", id: pid, nach: "pruefung" });
  pruefe(r.status === 200, "Eingereicht", r.json);
  r = await admin.post("/api/admin/status", { art: "projekt", id: pid, nach: "veroeffentlicht", extra: { provisionSatz: 2 } });
  const veroeffentlicht = r.status === 200;
  if (!veroeffentlicht && r.status === 409) ueberspringen(`Veröffentlichung durch KYC gesperrt – B2 übersprungen (${r.json.error})`);
  else pruefe(veroeffentlicht, "Veröffentlicht", r.json);

  if (veroeffentlicht) {
    abschnitt("B2. Börse: öffentlich ohne Datenblatt, DD-Index und Bewertung nur nach NDA");
    r = await gast.get(`/api/boerse/${pid}`);
    const slug = r.json.projekt?.slug;
    pruefe(r.status === 200 && !("datenblatt" in r.json) && !r.text.includes("ertragP90") && !r.text.includes("Testbüro") && !("ddIndex" in r.json), "Öffentliches Exposé ohne Datenblatt und DD-Index");
    r = await gast.get("/api/boerse");
    pruefe(!r.text.includes("Testbüro") && r.json.projekte?.find((p) => p.id === pid)?.datenraumQualitaet === q1.quote, "Börsenliste: Datenraum-Qualität inkl. Datenblatt, keine Details", r.json.projekte?.find((p) => p.id === pid)?.datenraumQualitaet);
    if (slug) {
      r = await gast.anfrage("GET", `/api/boerse/${slug}/teaser`);
      pruefe(r.status === 200 && !r.text.includes("Testbüro") && !r.text.includes("960"), "Teaser-PDF ohne Datenblatt-Werte", r.status);
    }
    r = await investor.get(`/api/portal/fach/bewertung/${pid}`);
    pruefe(r.status === 403, "Bewertung vor NDA → 403", r.status);
    r = await investor.post(`/api/portal/boerse/${pid}/nda`, { akzeptiert: true });
    const iid = r.json.interesse?.id;
    r = await admin.post("/api/admin/status", { art: "interesse", id: iid, nach: "nda_freigegeben" });
    if (r.status !== 200) {
      ueberspringen(`NDA-Freigabe nicht möglich (${r.status} ${r.json.error}) – B2 Rest übersprungen`);
    } else {
      r = await investor.get(`/api/boerse/${pid}`);
      pruefe(r.json.zugriff === "nda" && r.json.datenblatt?.ertragP90 === 960 && r.json.ddIndex?.kategorien?.length === 8, "Nach NDA: Datenblatt und DD-Index", r.json.zugriff);
      pruefe(r.json.ddIndex?.kategorien.find((k) => k.id === "ertrag")?.fehlend.some((x) => /Ertragsgutachten/.test(x)), "DD-Index: fehlendes Ertragsgutachten (Unterlage) sichtbar");
      r = await fremdInvestor.get(`/api/boerse/${pid}`);
      pruefe(!("datenblatt" in r.json) && !r.text.includes("Testbüro"), "Anderer Investor ohne NDA sieht kein Datenblatt");
      r = await investor.get(`/api/portal/fach/bewertung/${pid}`);
      pruefe(r.status === 200 && r.json.vorbelegung?.quellen?.p90 === "Datenblatt" && r.json.vorbelegung.eingaben.kaufpreisKwp === 90 && r.json.ergebnis?.p50, "Bewertung vorbelegt aus Datenblatt/Exposé", r.json.vorbelegung?.quellen);
      r = await investor.post(`/api/portal/fach/bewertung/${pid}`, { name: "Basis (Test)", eingaben: { capexKwp: 430, zielRenditePct: 6, unbekannt: 5 } });
      const szId = r.json.szenario?.id;
      pruefe(r.status === 200 && r.json.szenario?.eingaben?.capexKwp === 430 && !("unbekannt" in r.json.szenario.eingaben) && r.json.szenario.ergebnis?.p50, "Szenario gespeichert (Server rechnet neu, Positivliste)", r.json);
      r = await fremdInvestor.anfrage("DELETE", `/api/portal/fach/szenarien/${szId}`);
      pruefe(r.status === 403 || r.status === 404, "Fremdes Szenario löschen → 403", r.status);
      r = await fremdInvestor.post(`/api/portal/fach/bewertung/${pid}`, { name: "Ohne NDA", eingaben: {} });
      pruefe(r.status === 403, "Szenario ohne NDA → 403", r.status);

      abschnitt("B3. Strukturierte LOI");
      r = await investor.post("/api/portal/status", { art: "interesse", id: iid, nach: "loi_abgegeben", extra: { loi: { text: "Angebot ohne Preis aus dem Test." } } });
      if (r.status === 409) ueberspringen(`LOI durch KYC gesperrt (${r.json.error})`);
      else {
        pruefe(r.status === 422 && /Kaufpreis/.test(r.json.error), "LOI ohne Preis → 422", r.json);
        const loi = { struktur: true, text: "Indikatives Angebot aus dem Fachtest.", preisbasis: "proKwp", preisProKwp: 88, transaktion: "share", zahlung: "einmal", bedingungenListe: ["dd", "gremien"], finanzierung: "fk" };
        r = await investor.post("/api/portal/status", { art: "interesse", id: iid, nach: "loi_abgegeben", extra: { loi } });
        pruefe(r.status === 422 && /bis wann/.test(r.json.error), "Strukturierte LOI ohne Gültigkeit → 422", r.json);
        const gueltig = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
        r = await investor.post("/api/portal/status", { art: "interesse", id: iid, nach: "loi_abgegeben", extra: { loi: { ...loi, gueltigBis: gueltig, exklusivitaetWochen: 8 } } });
        pruefe(r.status === 200 && r.json.objekt?.status === "loi_abgegeben", "Strukturierte LOI abgegeben", r.json);
        r = await investor.get("/api/portal/interessen");
        const eigeneLoi = (r.json.interessen || []).find((i) => i.id === iid)?.loi;
        pruefe(eigeneLoi?.betrag === 880000 && eigeneLoi.version === 2 && eigeneLoi.transaktion === "share" && eigeneLoi.gueltigBis === gueltig, "LOI gespeichert: 88 €/kWp × 10 MWp = 880.000 €, Share Deal, Gültigkeit", eigeneLoi);
        r = await admin.get("/api/admin/interessen?status=loi_abgegeben");
        const imAdmin = r.json.interessen?.find((i) => i.id === iid);
        pruefe(imAdmin?.loi?.exklusivitaetWochen === 8 && imAdmin.loi.finanzierung === "fk", "Backoffice sieht die strukturierte LOI", imAdmin?.loi);
      }
    }
  }

  abschnitt("B4. Unternehmen: Abnahmestellen und Rechte");
  r = await investor.post("/api/portal/fach/energie/abnahmestellen", { daten: { bezeichnung: "X", maloId: "41373559241", messart: "rlm", jahresverbrauchKwh: 1 } });
  pruefe(r.status === 403, "Investor → Abnahmestelle 403", r.status);
  r = await gast.post("/api/portal/fach/energie/abnahmestellen", { daten: {} });
  pruefe(r.status === 401, "Gast → 401", r.status);
  r = await firma.post("/api/portal/fach/energie/abnahmestellen", { daten: { bezeichnung: "Werk Test", land: "DE", maloId: "41373559242", messart: "rlm", jahresverbrauchKwh: 850000 } });
  pruefe(r.status === 422 && /Prüfziffer/.test(r.json.error), "Falsche MaLo → 422", r.json);
  r = await firma.post("/api/portal/fach/energie/abnahmestellen", { daten: { bezeichnung: "Werk Test", land: "DE", maloId: "41373559241", meloId: "DE00056266802AO6G56M11SN51G21M24S", messart: "slp", jahresverbrauchKwh: 850000, vertragEnde: "2026-12-31", kuendigungsfristMonate: 3, arbeitspreisCt: 22 } });
  const asId = r.json.abnahmestelle?.id;
  pruefe(r.status === 200 && asId && r.json.abnahmestelle.hinweise.some((x) => /RLM/.test(x.text)), "Abnahmestelle gespeichert, Hinweis SLP > 100 MWh", r.json);
  r = await firma.post("/api/portal/fach/energie/abnahmestellen", { daten: { bezeichnung: "Doppelt", land: "DE", maloId: "41373559241", messart: "rlm", jahresverbrauchKwh: 1 } });
  pruefe(r.status === 422, "Gleiche MaLo doppelt → 422", r.status);
  r = await firma2.post("/api/portal/fach/energie/abnahmestellen", { id: asId, daten: { bezeichnung: "gekapert", land: "DE", maloId: "51238696781", messart: "rlm", jahresverbrauchKwh: 1 } });
  pruefe(r.status === 403, "Fremde Abnahmestelle ändern → 403", r.status);
  r = await firma2.del("/api/portal/fach/energie/abnahmestellen", { id: asId });
  pruefe(r.status === 403, "Fremde Abnahmestelle löschen → 403", r.status);
  r = await firma2.get("/api/portal/fach/energie");
  pruefe(r.status === 200 && r.json.abnahmestellen.length === 0, "Anderes Unternehmen sieht keine fremden Abnahmestellen");
  r = await firma.post("/api/portal/fach/energie/abnahmestellen", { daten: { bezeichnung: "X" } }, { origin: "https://boese.example.org" });
  pruefe(r.status === 403, "CSRF: fremder Origin → 403", r.status);

  abschnitt("B5. Lastgang: Import, Analyse, Rechte, Angebotsanfrage");
  const lgMod = await lade("src/lib/plattform/fach/lastgang.js");
  const csv = lastgangCsv(lgMod.ortszeit, { lastKw: (o) => 90 + (o.wochentag < 5 && o.stunde >= 7 && o.stunde < 17 ? 110 : 0) });
  r = await firma.post("/api/portal/fach/energie/lastgang", { name: "test-lastgang.csv", inhalt: csv, abnahmestelleId: asId });
  const lgId = r.json.lastgang?.id;
  pruefe(r.status === 200 && lgId && r.json.lastgang.analyse?.zeitraum?.tage === 365 && r.json.lastgang.analyse.spitzeKw === 200 && r.json.lastgang.statistik?.dstDoppelt === 4, "Lastgang (1 Jahr, Zeitumstellung) analysiert", r.json.lastgang?.analyse?.zeitraum);
  pruefe(!r.text.includes('"kw":['), "Antwort enthält keine Zeitreihe");
  r = await firma.post("/api/portal/fach/energie/lastgang", { name: "kaputt.csv", inhalt: "a;b\n1;2" });
  pruefe(r.status === 422, "Unlesbare Datei → 422", r.status);
  r = await firma2.post("/api/portal/fach/energie/lastgang", { name: "x.csv", inhalt: csv, abnahmestelleId: asId });
  pruefe(r.status === 403, "Lastgang an fremde Abnahmestelle → 403", r.status);
  r = await firma2.patch(`/api/portal/fach/energie/lastgang/${lgId}`, { pvKwp: 100 });
  pruefe(r.status === 403, "Fremden Lastgang neu rechnen → 403", r.status);
  r = await firma.patch(`/api/portal/fach/energie/lastgang/${lgId}`, { pvKwp: 150, preisCt: 24 });
  pruefe(r.status === 200 && r.json.lastgang.analyse.pv.gewaehltKwp === 150 && r.json.lastgang.analyse.pool.preisCt === 24, "Neu rechnen mit 150 kWp und 24 ct/kWh", [r.status, r.json.error, r.json.lastgang?.analyse?.pv?.gewaehltKwp]);
  r = await firma2.post(`/api/portal/fach/energie/lastgang/${lgId}`, { nachricht: "x" });
  pruefe(r.status === 403, "Fremde Angebotsanfrage → 403", r.status);
  r = await firma.post(`/api/portal/fach/energie/lastgang/${lgId}`, { nachricht: "Bitte Angebot für Reststrom (Test)." });
  const vid = r.json.vorgangId;
  pruefe(r.status === 200 && /^V-/.test(vid || ""), "Angebotsanfrage legt Vorgang an", r.json);
  r = await firma.get(`/api/portal/vorgaenge/${vid}`);
  pruefe(r.status === 200 && r.json.vorgang?.typ === "reststrom" && Number(r.json.vorgang.daten?.spitzeKw) === 200, "Vorgang „Reststrom“ mit Kennzahlen im Konto", r.json.vorgang?.daten);
  r = await firma.post(`/api/portal/fach/energie/lastgang/${lgId}`, {});
  pruefe(r.status === 200 && r.json.bereits === true && r.json.vorgangId === vid, "Zweite Anfrage idempotent");
  r = await firma2.anfrage("DELETE", `/api/portal/fach/energie/lastgang/${lgId}`);
  pruefe(r.status === 403, "Fremden Lastgang löschen → 403", r.status);
  r = await firma.anfrage("DELETE", `/api/portal/fach/energie/lastgang/${lgId}`);
  pruefe(r.status === 200, "Eigenen Lastgang gelöscht", r.status);

  abschnitt("B6. Mitglied: Genossenschaft und Energiegemeinschaft");
  r = await firma.put("/api/portal/fach/mitglied", { art: "geno", daten: {} });
  pruefe(r.status === 403, "Unternehmen ohne Mitgliedsrolle → 403", r.status);
  r = await mitglied.put("/api/portal/fach/mitglied", { art: "geno", daten: { anteile: 4, art: "privat", interessen: ["beteiligung"], bestaetigt: { aufbau: true } } });
  pruefe(r.status === 422, "Genossenschaft ohne alle Bestätigungen → 422", r.json);
  r = await mitglied.put("/api/portal/fach/mitglied", { art: "geno", daten: { land: "AT", anteile: 4, art: "privat", interessen: ["beteiligung", "strom"], bestaetigt: { aufbau: true, risiko: true, kuendigung: true, beratung: true } } });
  pruefe(r.status === 200 && r.json.geno?.status === "vorgemerkt" && r.json.geno.anteile === 4, "Interesse vorgemerkt (keine Zeichnung)", r.json);
  r = await mitglied.put("/api/portal/fach/mitglied", { art: "eg", daten: { land: "AT", form: "eeg_regional", rolle: "bezug", zaehlpunkt: "AT003000000000000000000000001234", netzbetreiber: "Netz Test", plz: "5121" } });
  pruefe(r.status === 422 && /33 Zeichen/.test(r.json.error), "EEG mit zu kurzem Zählpunkt → 422", r.json);
  r = await mitglied.put("/api/portal/fach/mitglied", { art: "eg", daten: { land: "AT", form: "eeg_regional", rolle: "bezug", zaehlpunkt: "AT0030000000000000000000000012345", netzbetreiber: "Netz Test", plz: "5121", smartMeter: "ja" } });
  pruefe(r.status === 200 && r.json.eg?.zaehlpunkt === "AT0030000000000000000000000012345" && r.json.eg.hinweise?.some((x) => /Opt-in|freigegeben/.test(x.text)), "EEG-Teilnahme mit Zählpunkt und Hinweis Datenfreigabe", r.json.eg);

  abschnitt("B7. Rechte unverändert, Anlagen (Eigentum), Seiten");
  r = await investor.get("/api/admin/anlagen");
  pruefe(r.status === 403, "Investor → Admin-Anlagen 403", r.status);
  r = await mitglied.get("/api/portal/projekte");
  pruefe(r.status === 403, "Mitglied → Projekte 403", r.status);
  const kunde = new Client("kunde");
  await kunde.login("unternehmen@example.com");
  r = await kunde.get("/api/portal/anlagen");
  const al = r.json.anlagen?.[0];
  pruefe(r.status === 200 && al?.eigentuemer?.length >= 3 && al.betriebsfuehrer, "Kunde sieht Eigentümergesellschaft und Betriebsführer", al && [al.eigentuemer, al.betriebsfuehrer]);
  if (al) {
    r = await kunde.get(`/api/portal/anlagen/${al.id}`);
    pruefe(r.status === 200 && !r.json.anlage?.komponenten && r.json.anlage?.finanziertDurch === undefined && r.json.anlage?.vertrag?.endschaft !== undefined, "Detail: keine Komponenten/Finanzierung, Vertrag mit Endschaft", r.json.anlage?.vertrag);
  }
  r = await admin.get("/api/portal/anlagen");
  pruefe(r.json.anlagen?.some((a) => /fiktiv/.test(a.eigentuemer || "")) && r.json.anlagen?.some((a) => a.finanziertDurch), "Backoffice sieht Projektgesellschaften und Finanzierung", r.json.anlagen?.map((a) => a.eigentuemer).slice(0, 3));
  // Seiten: Inhalts-Marker statt Status – Seiten mit loading.js streamen, notFound() liefert dann 200 mit der
  // Nicht-gefunden-Ansicht (die zudem als Grenze im Payload jeder Portalseite steht). Erwartung true = Inhalt sichtbar.
  const seiten = [
    [firma, "/portal/energie", "Abnahmestellen", true],
    [mitglied, "/portal/beteiligung", "Teilnahme mit Zählpunkt", true],
    [investor, "/portal/energie", "Abnahmestellen", false],
    [firma, "/portal/beteiligung", "Teilnahme mit Zählpunkt", false],
    [anbieter, `/portal/projekte/${pid}`, "Due-Diligence-Sicht", true],
    [kunde, "/portal/anlagen", "Mein Solarstrom", true],
    [investor, "/portal/profil", "Investorenprofil", true],
  ];
  if (veroeffentlicht) seiten.push([investor, `/portal/boerse/${pid}`, "Projektdatenblatt", true], [investor, `/portal/boerse/${pid}/bewertung`, "Vorbelegung", true], [fremdInvestor, `/portal/boerse/${pid}/bewertung`, "Vorbelegung", false]);
  for (const [c, pfad, marker, sichtbar] of seiten) {
    r = await c.get(pfad, { origin: null });
    const da = r.status === 200 && r.text.includes(marker);
    pruefe(da === sichtbar && (sichtbar || [200, 404].includes(r.status)), `Seite ${pfad} (${c.name}) → ${sichtbar ? "sichtbar" : "Nicht gefunden"}`, r.status);
  }
}

// ================================================================ Lauf

(async () => {
  console.log(`Fachprüfung Kapitalseite – ${NUR_LOGIK ? "nur Logik" : BASIS}`);
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
