// src/lib/plattform/backend/demo/planung-seed.js
//
// Demo-Daten „Planungsdateien & Projektkosten“ – ALLES FIKTIV. Wird einmalig ergänzt, sobald db.entwicklung existiert
// (demo/planung.js → lesenBereit). Synchron (writeFileSync), damit beim Rendern keine awaited Dateizugriffe entstehen.
//
//  Solarpark Mühlweg (Demo):
//   - P-100 Belegungsplan (DXF, selbst erzeugt): Index A ersetzt, Index B freigegeben (für den Co-Investor sichtbar)
//   - P-200 Trassenplan Mittelspannung (DXF): Index A zur Prüfung (Co-Investor sieht ihn nicht)
//   - P-300 Geltungsbereich/Umgriff (GeoJSON) am Meilenstein Artenschutz → für gutachter@example.com sichtbar, freigegeben
//   - V-010 Bestandsvermessung (DWG, Platzhalter-Datei mit DWG-Kennung): Konvertierung „Vorschau nach Konvertierung“
//   - Kostenkalkulation Stand „Kostenrahmen“ mit Historie (Kostenschätzung), Trasse/Zaun aus dem Belegungsplan,
//     Modulpreis aus Rahmenangebot (überschrieben)

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { UPLOAD_ORDNER } from "./speicher";
import { neueId, vorTagen, zufallsToken } from "./hilfen";
import { beispielGeojson, beispielSolarparkDxf } from "../../planung/beispiel";
import { analyseDatei } from "../../planung/analyse";
import { FORMATE } from "../../planung/regeln";
import { berechnen, standSchnappschuss, vorschlag, zusammenfuehren } from "../../planung/kosten";

function trassenplanDxf() {
  const z = [];
  const g = (c, w) => z.push(String(c), String(w));
  g(0, "SECTION"); g(2, "HEADER"); g(9, "$INSUNITS"); g(70, 6); g(0, "ENDSEC");
  g(0, "SECTION"); g(2, "TABLES"); g(0, "TABLE"); g(2, "LAYER");
  for (const [n, c] of [["Kabel_MS", 6], ["Querung", 1], ["Flurstuecke", 8], ["Beschriftung", 7]]) {
    g(0, "LAYER"); g(2, n); g(70, 0); g(62, c);
  }
  g(0, "ENDTAB"); g(0, "ENDSEC");
  g(0, "SECTION"); g(2, "ENTITIES");
  const E = 691200;
  const N = 5335400;
  const pts = [[330, 260], [330, 300], [600, 420], [1400, 420]];
  g(0, "LWPOLYLINE"); g(8, "Kabel_MS"); g(90, pts.length); g(70, 0);
  pts.forEach(([x, y], i) => {
    g(10, E + x); g(20, N + y);
    if (i === 1) g(42, 0.2);
  });
  for (let k = 0; k < 6; k++) {
    g(0, "LWPOLYLINE"); g(8, "Flurstuecke"); g(90, 4); g(70, 1);
    for (const [x, y] of [[300 + k * 200, 380], [500 + k * 200, 380], [500 + k * 200, 470], [300 + k * 200, 470]]) {
      g(10, E + x); g(20, N + y);
    }
  }
  g(0, "CIRCLE"); g(8, "Querung"); g(10, E + 900); g(20, N + 420); g(40, 8);
  g(0, "TEXT"); g(8, "Beschriftung"); g(10, E + 880); g(20, N + 440); g(40, 6); g(1, "Querung Kreisstraße (Spülbohrung 60 m)");
  g(0, "TEXT"); g(8, "Beschriftung"); g(10, E + 1300); g(20, N + 430); g(40, 6); g(1, "Übergabe / NVP (Demo)");
  g(0, "ENDSEC"); g(0, "EOF");
  return z.join("\r\n") + "\r\n";
}

export function planungSeed(db) {
  const P = db.planung;
  const p = (db.entwicklung?.projekte || []).find((x) => x.titel === "Solarpark Mühlweg (Demo)");
  if (!p) return;
  const admin = db.nutzer.find((u) => u.email === "bo-projektleitung@example.com") || db.nutzer.find((u) => u.email === "admin@example.com");
  const gutachter = db.nutzer.find((u) => u.email === "gutachter@example.com");
  const msArten = (db.entwicklung.meilensteine || []).find((m) => m.projektId === p.id && m.schluessel === "gutachten_artenschutz");
  mkdirSync(UPLOAD_ORDNER, { recursive: true });

  const datei = (id, endung, inhalt) => {
    const name = `${id}-${zufallsToken().slice(0, 12)}.${endung}`;
    writeFileSync(path.join(UPLOAD_ORDNER, name), inhalt);
    return name;
  };

  const plan = (d) => {
    const x = { id: neueId("PL"), projektId: p.id, planerId: null, erstelltVon: admin?.id || null, erstelltAm: vorTagen(d.tage), geaendertAm: vorTagen(d.tage), meilensteinId: null, ...d.kopf };
    P.plaene.push(x);
    return x;
  };
  const version = (pl, { format, index, inhalt, name, status, tage, aenderung, planer, vonId, verlauf = [] }) => {
    const id = neueId("PLV");
    const buf = Buffer.isBuffer(inhalt) ? inhalt : Buffer.from(inhalt, "utf8");
    const { analyse, abgeleitet } = analyseDatei(format, buf, format === "dwg" ? { dwgVersion: "AC1032", dwgRelease: "AutoCAD 2018" } : {});
    const x = {
      id, planId: pl.id, projektId: p.id, format, index, planstand: vorTagen(tage).slice(0, 10), planer, aenderung,
      datei: { name, mime: FORMATE[format].mime, groesse: buf.length, datei: datei(id, FORMATE[format].endung, buf) },
      abgeleitet: abgeleitet ? { name: abgeleitet.name, mime: abgeleitet.mime, groesse: abgeleitet.daten.length, datei: datei(id, "geojson", abgeleitet.daten), art: abgeleitet.art } : null,
      analyse,
      konvertierung: format === "dwg" ? { status: "nicht_verfuegbar", hinweis: "Vorschau nach Konvertierung (Dienst im Demo-Betrieb nicht eingerichtet).", am: vorTagen(tage) } : null,
      status, statusVerlauf: [{ status: "entwurf", am: vorTagen(tage), vonId, kommentar: "Hochgeladen" }, ...verlauf.map(([s, t, k]) => ({ status: s, am: vorTagen(t), vonId: admin?.id || null, kommentar: k }))],
      vonId, am: vorTagen(tage),
    };
    if (status === "freigegeben") {
      x.freigegebenAm = vorTagen(Math.max(0, tage - 3));
      x.freigegebenVon = admin?.id || null;
    }
    P.versionen.push(x);
    return x;
  };

  const planer = "Demo Ingenieurbüro Solarplanung (fiktiv)";
  const beleg = plan({ tage: 200, kopf: { plannummer: "P-100", titel: "Belegungsplan Modulfelder", planart: "belegungsplan", massstab: "1:1000", blattformat: "A1", planer } });
  version(beleg, { format: "dxf", index: "A", inhalt: beispielSolarparkDxf({ variante: "A" }).dxf, name: "Muehlweg_Belegung_A.dxf", status: "ersetzt", tage: 200, aenderung: "Erstausgabe", planer, vonId: admin?.id, verlauf: [["pruefung", 198, "Zur Prüfung"], ["freigegeben", 195, "Freigabe Vorentwurf"], ["ersetzt", 40, "Ersetzt durch Index B"]] });
  version(beleg, { format: "dxf", index: "B", inhalt: beispielSolarparkDxf({ variante: "B" }).dxf, name: "Muehlweg_Belegung_B.dxf", status: "freigegeben", tage: 45, aenderung: "Ostfeld ergänzt, Reihenabstand 10 m, Erweiterungsoption Süd", planer, vonId: admin?.id, verlauf: [["pruefung", 44, "Zur Prüfung"], ["freigegeben", 40, "Freigabe Entwurfsplanung"]] });

  const trasse = plan({ tage: 30, kopf: { plannummer: "P-200", titel: "Trassenplan Mittelspannung bis Übergabe", planart: "trassenplan", massstab: "1:2500", blattformat: "A0", planer } });
  version(trasse, { format: "dxf", index: "A", inhalt: trassenplanDxf(), name: "Muehlweg_Trasse_MS_A.dxf", status: "pruefung", tage: 12, aenderung: "Erstausgabe, Querung Kreisstraße per Spülbohrung", planer, vonId: admin?.id, verlauf: [["pruefung", 11, "Zur Prüfung"]] });

  const umgriff = plan({ tage: 8, kopf: { plannummer: "P-300", titel: "Geltungsbereich / Umgriff (georeferenziert)", planart: "bplan", massstab: "ohne", blattformat: "digital", planer: "Projektentwicklung (Demo)", meilensteinId: msArten?.id || null } });
  version(umgriff, { format: "geojson", index: "A", inhalt: beispielGeojson(), name: "Muehlweg_Umgriff.geojson", status: "freigegeben", tage: 8, aenderung: "Für Artenschutzgutachten bereitgestellt", planer: "Projektentwicklung (Demo)", vonId: admin?.id, verlauf: [["pruefung", 8, "Zur Prüfung"], ["freigegeben", 7, "Für Gutachter freigegeben"]] });

  const bestand = plan({ tage: 300, kopf: { plannummer: "V-010", titel: "Bestandsvermessung (DWG vom Vermesser)", planart: "vermessung", massstab: "1:500", blattformat: "digital", planer: "Demo Vermessung (fiktiv)" } });
  const dwg = Buffer.concat([Buffer.from("AC1032", "latin1"), Buffer.alloc(250, 0)]); // Platzhalter mit DWG-Kennung (kein echter Plan)
  version(bestand, { format: "dwg", index: "A", inhalt: dwg, name: "Bestand_Muehlweg.dwg", status: "entwurf", tage: 300, aenderung: "Aufmaß Bestand (Demo-Platzhalter)", planer: "Demo Vermessung (fiktiv)", vonId: admin?.id });
  void gutachter;

  // ---------------------------------------------------------------- Kostenkalkulation
  const fl = (db.entwicklung.flaechen || []).filter((f) => f.projektId === p.id);
  const gutachten = (db.entwicklung.meilensteine || []).filter((m) => m.projektId === p.id && m.gutachten && m.status !== "entfaellt").map((m) => ({ schluessel: m.schluessel, titel: m.titel }));
  const basis = { typ: p.typ, land: p.land, mwp: p.mwp, mwh: p.mwh || 0, flaecheHa: Math.round(fl.reduce((s, f) => s + (Number(f.ha) || 0), 0) * 100) / 100 || 18, flaechenAnzahl: Math.max(1, fl.length), gutachten };
  const k = {
    id: neueId("KK"), projektId: p.id, kostenstand: "kostenrahmen", erstelltAm: vorTagen(200), geaendertAm: vorTagen(20), vonId: admin?.id || null,
    parameter: { zaunM: 1325, trasse: { abschnitte: [{ art: "graben", laengeM: 1376 }, { art: "spuelbohrung", laengeM: 60 }], querungen: { strasse: 1, bahn: 0, gewaesser: 0 }, quelle: "dxf:Belegungsplan Index B" }, speicherNetzbezug: false, contingency: null, fkQuote: null, zinsBau: null, bauzeitMonate: null, flaecheHa: null, flaechenAnzahl: null },
    positionen: [
      { schluessel: "module", gewerk: "module", bezeichnung: "Module (Rahmenangebot Demo, 0,105 €/Wp)", art: "menge", menge: p.mwp * 1000, einheit: "kWp", ep: 105, satz: null, manuell: true, istEur: null, notiz: "", angebot: "Rahmenangebot Modullieferant (Demo)" },
      { schluessel: "frei:vermessung", gewerk: "sonstiges", bezeichnung: "Vermessung / Absteckung", art: "menge", menge: 1, einheit: "psch", ep: 18000, satz: null, manuell: true, istEur: 6500, notiz: "Teilleistung Bestand abgerechnet (Demo)", angebot: "" },
    ],
  };
  P.kalkulationen.push(k);
  const par = { ...basis, ...Object.fromEntries(Object.entries(k.parameter).filter(([, w]) => w !== null)) };
  const schnapp = (stand, pos) => standSchnappschuss(berechnen(zusammenfuehren(pos, vorschlag({ ...par, kostenstand: stand })), { ...par, kostenstand: stand }));
  P.staende.push({ id: neueId("KS"), projektId: p.id, kalkulationId: k.id, stand: "schaetzung", am: vorTagen(180), vonId: admin?.id || null, kommentar: "Erste Schätzung aus Kennwerten (Demo)", parameter: { ...basis, zaunM: 0, trasse: { abschnitte: [{ art: "graben", laengeM: 1800 }], querungen: {} } }, ...standSchnappschuss(berechnen(zusammenfuehren([], vorschlag({ ...basis, trasse: { abschnitte: [{ art: "graben", laengeM: 1800 }] }, kostenstand: "schaetzung" })), { ...basis, trasse: { abschnitte: [{ art: "graben", laengeM: 1800 }] }, kostenstand: "schaetzung" })) });
  P.staende.push({ id: neueId("KS"), projektId: p.id, kalkulationId: k.id, stand: "kostenrahmen", am: vorTagen(20), vonId: admin?.id || null, kommentar: "Trasse und Zaun aus Belegungsplan Index B, Modulpreis aus Rahmenangebot (Demo)", parameter: par, ...schnapp("kostenrahmen", k.positionen) });
}
