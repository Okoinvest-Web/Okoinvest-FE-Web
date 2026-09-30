// scripts/plattform-test-planung.mjs
//
// Test „Planungsdateien (CAD) & Projektkostenkalkulation“ (Team B3).
//   node scripts/plattform-test-planung.mjs [basis-url]      # reine Logik + End-to-End gegen den laufenden Dev-Server
//   node scripts/plattform-test-planung.mjs --nur-logik      # nur reine Logik (ohne Server)
//
// Reine Logik: Format-Erkennung an den ersten Bytes (DWG/DXF/PDF/KML/KMZ/GeoJSON/Shapefile-ZIP, Binär-DXF, Größenlimits),
// ZIP-Verzeichnis und Shapefile-Parser, DXF-Parser mit den Beispielplänen (Objektzahlen, Bounding Box, Einheiten inkl. mm,
// Blöcke mit Reihen/Spalten/Drehung/Spiegelung, Bulges, MTEXT, Layer aus), Kennzahlen nach Layer-Konvention, Status-
// übergänge, Änderungsindex, Sichtbarkeit je Rolle, Kostenkalkulation (Summen, €/kWp, EPC = markt.js, Trasse mit
// Systemfaktor, Contingency je Kostenstand, Überschreiben + Ampel, Soll/Ist, Übernahme Trassenlänge).
// End-to-End: Upload-Typen/Größen/CSRF, Rechte je Rolle (Backoffice lesen/schreiben, Gutachter nur zugewiesen, Co-Investor
// nur freigegebene Versionen, Eigentümer/fremde → 403), Freigabe ersetzt Vorversion, Kalkulation speichern/festschreiben/
// DXF-Übernahme/Trasse aus Akquise-Geodaten/Übergabe, Export CSV/PDF, Seiten. Eigene Testpläne mit Präfix „T-PLAN-<Lauf>“,
// eigenes Testprojekt „plan-test-<Lauf>“ – Demo-Daten bleiben unverändert (außer Protokoll).

import { beispielGeojson, beispielSolarparkDxf } from "../src/lib/plattform/planung/beispiel.js";
import { aciRgb, analysieren, anzeigeFarbe, dxfArt, mtextBereinigen, polylinie } from "../src/lib/plattform/planung/dxf.js";
import { geojsonPrimitive, kmlZuGeojson } from "../src/lib/plattform/planung/geo.js";
import { shapeZuGeojson, zipEintraege } from "../src/lib/plattform/planung/zip.js";
import { FORMATE, aktionPruefen, formatErkennen, naechsterIndex, planZugriff, zipNamen } from "../src/lib/plattform/planung/regeln.js";
import { berechnen, kabelSysteme, parameterVoll, sollIst, trasseSetzen, trassenLaenge, uebernahmeAusDxf, vorschlag, zusammenfuehren } from "../src/lib/plattform/planung/kosten.js";
import { FREIFLAECHE, PROJEKTKOSTEN, SPEICHER } from "../src/lib/invest/markt.js";

const argv = process.argv.slice(2);
const NUR_LOGIK = argv.includes("--nur-logik");
const BASIS = (argv.find((a) => a.startsWith("http")) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);

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
    console.log(`  ${rot("✗")} ${text}${details !== undefined ? ` – ${JSON.stringify(details).slice(0, 400)}` : ""}`);
  }
  return bedingung;
}
const abschnitt = (t) => console.log(`\n${t}`);
const nahe = (a, b, tol = 0.01) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

// ---------------------------------------------------------------- Hilfen: ZIP (stored) und Shapefile bauen

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function zip(dateien) {
  const lokal = [];
  const zentral = [];
  let off = 0;
  for (const [name, inhalt] of Object.entries(dateien)) {
    const n = Buffer.from(name);
    const d = Buffer.isBuffer(inhalt) ? inhalt : Buffer.from(inhalt);
    const crc = crc32(d);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(d.length, 18); lh.writeUInt32LE(d.length, 22); lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(d.length, 20); ch.writeUInt32LE(d.length, 24); ch.writeUInt16LE(n.length, 28); ch.writeUInt32LE(off, 42);
    lokal.push(lh, n, d);
    zentral.push(ch, n);
    off += 30 + n.length + d.length;
  }
  const cd = Buffer.concat(zentral);
  const ende = Buffer.alloc(22);
  ende.writeUInt32LE(0x06054b50, 0); ende.writeUInt16LE(Object.keys(dateien).length, 8); ende.writeUInt16LE(Object.keys(dateien).length, 10); ende.writeUInt32LE(cd.length, 12); ende.writeUInt32LE(off, 16);
  return Buffer.concat([...lokal, cd, ende]);
}
/** .shp mit einem Polygon (Rechteck 100 × 50 m, projiziert) */
function shpPolygon() {
  const pts = [[0, 0], [0, 50], [100, 50], [100, 0], [0, 0]];
  const inhalt = Buffer.alloc(44 + 4 + pts.length * 16);
  inhalt.writeInt32LE(5, 0);
  [0, 0, 100, 50].forEach((v, i) => inhalt.writeDoubleLE(v, 4 + i * 8));
  inhalt.writeInt32LE(1, 36); inhalt.writeInt32LE(pts.length, 40); inhalt.writeInt32LE(0, 44);
  pts.forEach(([x, y], i) => { inhalt.writeDoubleLE(x, 48 + i * 16); inhalt.writeDoubleLE(y, 56 + i * 16); });
  const kopf = Buffer.alloc(100);
  kopf.writeInt32BE(9994, 0); kopf.writeInt32BE((100 + 8 + inhalt.length) / 2, 24); kopf.writeInt32LE(1000, 28); kopf.writeInt32LE(5, 32);
  const rec = Buffer.alloc(8);
  rec.writeInt32BE(1, 0); rec.writeInt32BE(inhalt.length / 2, 4);
  return Buffer.concat([kopf, rec, inhalt]);
}

// ================================================================ Reine Logik

function logik() {
  abschnitt("1. Format-Erkennung (Bytes, nicht Dateiname)");
  const A = beispielSolarparkDxf({ variante: "A" });
  const B = beispielSolarparkDxf({ variante: "B" });
  const bytes = (s) => Buffer.from(s);
  pruefe(formatErkennen(bytes("%PDF-1.7\n…"), "plan.pdf").format === "pdf", "PDF erkannt");
  const dwg = formatErkennen(Buffer.concat([bytes("AC1032"), Buffer.alloc(100)]), "bestand.dwg");
  pruefe(dwg.format === "dwg" && dwg.info.dwgRelease === "AutoCAD 2018", "DWG erkannt inkl. Version (AC1032 → AutoCAD 2018)", dwg);
  pruefe(formatErkennen(bytes(B.dxf), "plan.dxf").format === "dxf", "ASCII-DXF erkannt");
  const bin = formatErkennen(Buffer.concat([bytes("AutoCAD Binary DXF\r\n\x1a\0"), Buffer.alloc(50)]), "plan.dxf");
  pruefe(!bin.ok && bin.status === 415 && /ASCII/.test(bin.fehler), "Binär-DXF → 415 mit Hinweis", bin);
  pruefe(formatErkennen(bytes('<?xml version="1.0"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document/></kml>'), "a.kml").format === "kml", "KML erkannt");
  pruefe(formatErkennen(bytes(beispielGeojson()), "umgriff.geojson").format === "geojson", "GeoJSON erkannt");
  const shapeZip = zip({ "umgriff.shp": shpPolygon(), "umgriff.shx": Buffer.alloc(100), "umgriff.dbf": Buffer.alloc(33), "umgriff.prj": 'PROJCS["ETRS89 / UTM zone 32N"]' });
  const shp = formatErkennen(shapeZip, "umgriff.zip");
  pruefe(shp.format === "shape" && shp.info.prj === true, "Shapefile-ZIP erkannt (.shp/.shx/.dbf/.prj)", shp);
  const kmz = zip({ "doc.kml": '<kml><Placemark><name>Zaun</name><LineString><coordinates>10.6,48.0 10.601,48.0</coordinates></LineString></Placemark></kml>' });
  pruefe(formatErkennen(kmz, "a.kmz").format === "kmz", "KMZ erkannt");
  const nurZip = formatErkennen(zip({ "readme.txt": "x" }), "x.zip");
  pruefe(!nurZip.ok && nurZip.status === 415, "ZIP ohne Shapefile/KML → 415");
  pruefe(!formatErkennen(zip({ "../boese.shp": "x", "a.shx": "", "a.dbf": "" }), "x.zip").ok, "ZIP mit „..“-Pfad → abgelehnt");
  pruefe(formatErkennen(bytes("MZ\x90\0 kein Plan"), "virus.dwg").status === 415, "Unbekannter Inhalt mit .dwg-Endung → 415");
  pruefe(formatErkennen(Buffer.alloc(0), "leer.dxf").status === 422, "Leere Datei → 422");
  const gross = Buffer.alloc(FORMATE.geojson.maxBytes + 10, 0x20);
  Buffer.from('{"type":"FeatureCollection","features":[]}').copy(gross, 0);
  pruefe(formatErkennen(gross, "gross.geojson").status === 413, "GeoJSON über 10 MB → 413");
  pruefe(formatErkennen(bytes(B.dxf), "plan.pdf").info.hinweis?.includes(".pdf"), "Endung passt nicht → Hinweis, Inhalt zählt");
  pruefe(zipNamen(new Uint8Array(shapeZip)).length === 4 && zipEintraege(shapeZip).length === 4, "ZIP-Verzeichnis gelesen (4 Einträge)");
  const sg = shapeZuGeojson(shapeZip);
  const sp = geojsonPrimitive(sg);
  pruefe(sg.oekoinvestProjiziert === true && sp.prims.length === 1 && nahe(sp.prims[0].flaeche, 5000, 1e-9), "Shapefile-Polygon → 5.000 m² (projiziert)", sp.prims[0]?.flaeche);
  const kmlGj = kmlZuGeojson('<kml><Placemark><name>Zaun Nord</name><LineString><coordinates>10.6,48.0,0 10.601,48.0,0</coordinates></LineString></Placemark></kml>');
  const kp = geojsonPrimitive(kmlGj);
  pruefe(kp.prims.length === 1 && nahe(kp.prims[0].laenge, 0.001 * 111320 * Math.cos((48 * Math.PI) / 180), 0.005), "KML-Linie 0,001° Länge ≈ 74,5 m (lokal projiziert)", kp.prims[0]?.laenge);

  abschnitt("2. DXF-Parser mit Beispielplänen");
  pruefe(dxfArt(B.dxf.slice(0, 200)) === "ascii", "Beispiel ist ASCII-DXF (mit Kommentar 999)");
  for (const [name, x] of [["A", A], ["B", B]]) {
    const a = analysieren(x.dxf);
    const k = a.kennzahlen;
    pruefe(a.einheit.code === 6 && a.einheit.m === 1 && !a.einheit.angenommen, `${name}: Einheit $INSUNITS 6 = Meter`);
    pruefe(k.tische === x.soll.tische, `${name}: ${x.soll.tische} Modultische (Blöcke, Reihen/Spalten, Drehung)`, k.tische);
    pruefe(nahe(k.modulflaecheM2, x.soll.modulflaecheM2, 1e-4), `${name}: Modulfläche ${Math.round(x.soll.modulflaecheM2)} m²`, k.modulflaecheM2);
    pruefe(nahe(k.zaunM, x.soll.zaunM, 1e-4), `${name}: Zaunlänge ${x.soll.zaunM.toFixed(1)} m`, k.zaunM);
    pruefe(nahe(k.kabelMsM, x.soll.kabelMsM, 1e-4), `${name}: MS-Trasse ${x.soll.kabelMsM.toFixed(1)} m (inkl. Bulge-Bogen)`, k.kabelMsM);
    pruefe(nahe(k.wegeM2, x.soll.wegeM2, 1e-6) && k.trafos === 2, `${name}: Wege ${x.soll.wegeM2} m², 2 Trafostationen (eine gespiegelt)`, [k.wegeM2, k.trafos]);
    pruefe(nahe(k.anlageM2, x.soll.anlageM2, 1e-4), `${name}: Baugrenze aus POLYLINE/VERTEX ${x.soll.anlageM2} m²`, k.anlageM2);
    pruefe(a.bbox && nahe(a.bbox[0], x.soll.bboxMin[0], 1e-9) && nahe(a.bbox[1], x.soll.bboxMin[1], 1e-9) && nahe(a.bbox[2], x.soll.bboxMax[0], 1e-9) && nahe(a.bbox[3], x.soll.bboxMax[1], 1e-9), `${name}: Bounding Box (ohne ausgeschaltete Layer)`, a.bbox);
    pruefe(a.nichtUnterstuetzt.HATCH === 1 && a.nichtUnterstuetzt.SOLID === 1, `${name}: HATCH/SOLID gezählt, nicht gezeichnet`);
    pruefe(a.layer.find((l) => l.name === "Hilfslinien")?.aus === true && a.layer.find((l) => l.name === "PV_Module")?.konvention === "PV_Module", `${name}: Layer „Hilfslinien“ aus, PV_Module nach Konvention`);
  }
  const aB = analysieren(B.dxf);
  pruefe(aB.entitaeten === 269 && aB.zaehler.INSERT === 253 && aB.zaehler.LWPOLYLINE === 6, "B: Objektzahlen (269 Objekte, 253 INSERT, 6 LWPOLYLINE)", [aB.entitaeten, aB.zaehler]);
  const mm = analysieren(B.dxf.replace("$INSUNITS\r\n70\r\n6.0", "$INSUNITS\r\n70\r\n4.0"));
  pruefe(mm.einheit.kurz === "mm" && nahe(mm.kennzahlen.zaunM, B.soll.zaunM / 1000, 0.05) && mm.kennzahlen.tische === B.soll.tische && nahe(mm.kennzahlen.kabelMsM, B.soll.kabelMsM / 1000, 0.05), "Einheit mm: Längen in Metern (÷ 1000), Tische unverändert", [mm.einheit, mm.kennzahlen.zaunM]);
  const ohne = analysieren(B.dxf.replace("$INSUNITS\r\n70\r\n6.0", "$INSUNITS\r\n70\r\n0.0"));
  pruefe(ohne.einheit.angenommen && ohne.kennzahlen.hinweise.some((h) => /ohne Einheit/.test(h)), "Ohne Einheit: Meter angenommen + Hinweis");
  const kreis = polylinie([{ x: 0, y: 0, b: 1 }, { x: 2, y: 0, b: 1 }], true);
  pruefe(nahe(kreis.flaeche, Math.PI, 1e-9) && nahe(kreis.laenge, 2 * Math.PI, 1e-9), "Polylinie aus zwei Halbkreis-Bulges = Kreis (Fläche π, Umfang 2π)", kreis);
  pruefe(mtextBereinigen("Zeile 1\\PZeile {\\fArial|b1;fett} \\S1^2; %%c 5") === "Zeile 1\nZeile fett 1/2 Ø 5", "MTEXT-Formatcodes entfernt", mtextBereinigen("Zeile 1\\PZeile {\\fArial|b1;fett} \\S1^2; %%c 5"));
  pruefe(aciRgb(1).join() === "255,0,0" && anzeigeFarbe({ aci: 7 }) === "#151a24" && anzeigeFarbe({ aci: 2 }) !== "#ffff00", "ACI-Farben (1 = Rot, 7 = Tinte, Gelb abgedunkelt)");
  const geo = geojsonPrimitive(JSON.parse(beispielGeojson()));
  pruefe(geo.prims.some((p) => p.L === "Kabel_MS" && p.laenge > 1000) && geo.einheit.m === 1, "GeoJSON-Beispiel: Trasse (Layer aus properties.layer) > 1 km");

  abschnitt("3. Status, Index, Sichtbarkeit");
  pruefe(naechsterIndex([]) === "A" && naechsterIndex(["A", "B"]) === "C" && naechsterIndex(["Z"]) === "AA" && naechsterIndex(["AZ"]) === "BA", "Änderungsindex – A, C, AA, BA");
  pruefe(aktionPruefen("einreichen", { status: "entwurf", rolle: "planer" }).nach === "pruefung", "Planer: Entwurf → zur Prüfung");
  pruefe(aktionPruefen("freigeben", { status: "pruefung", rolle: "planer" }).status === 403, "Planer darf nicht freigeben → 403");
  pruefe(aktionPruefen("freigeben", { status: "entwurf", rolle: "bo" }).status === 409, "Freigeben aus Entwurf → 409");
  pruefe(aktionPruefen("zurueckweisen", { status: "pruefung", rolle: "bo", kommentar: "" }).status === 422, "Zurückweisen ohne Begründung → 422");
  const plan = { id: "PL-1", meilensteinId: "MS-A", planerId: null };
  const vers = [{ status: "ersetzt" }, { status: "freigegeben" }, { status: "pruefung" }];
  pruefe(planZugriff({ backoffice: true, schreiben: false, nutzerId: "U-B", gutachterMs: new Set(), investor: null }, plan, vers).version(vers[2]) && !planZugriff({ backoffice: true, schreiben: false, nutzerId: "U-B", gutachterMs: new Set() }, plan, vers).hochladen, "Backoffice lesen: alle Versionen, ohne Schreibrecht kein Upload");
  const g1 = planZugriff({ backoffice: false, nutzerId: "U-G", gutachterMs: new Set(["MS-A"]), investor: null }, plan, vers);
  pruefe(g1.sehen && g1.hochladen && g1.version(vers[2]), "Gutachter am zugewiesenen Meilenstein: sehen, hochladen, alle Stände");
  pruefe(!planZugriff({ backoffice: false, nutzerId: "U-G", gutachterMs: new Set(["MS-X"]), investor: null }, plan, vers).sehen, "Gutachter an anderem Meilenstein: kein Zugriff");
  const i1 = planZugriff({ backoffice: false, nutzerId: "U-I", gutachterMs: new Set(), investor: { dokumente: true } }, plan, vers);
  pruefe(i1.sehen && !i1.hochladen && i1.version(vers[1]) && !i1.version(vers[0]) && !i1.version(vers[2]), "Co-Investor: nur freigegebene Version, kein Upload");
  pruefe(!planZugriff({ backoffice: false, nutzerId: "U-I", gutachterMs: new Set(), investor: { dokumente: false } }, plan, vers).sehen, "Co-Investor ohne Dokumenten-Freigabe: nichts");
  pruefe(!planZugriff({ backoffice: false, nutzerId: "U-E", gutachterMs: new Set(), investor: null }, plan, vers).sehen, "Eigentümer/fremd: nichts");

  abschnitt("4. Kostenkalkulation");
  const par = { typ: "freiflaeche", land: "DE", mwp: 10, flaecheHa: 11, flaechenAnzahl: 2, zaunM: 1325, trasse: { abschnitte: [{ art: "graben", laengeM: 1200 }, { art: "spuelbohrung", laengeM: 60 }], querungen: { strasse: 1 } }, gutachten: [{ schluessel: "gutachten_artenschutz", titel: "Artenschutz (saP)" }, { schluessel: "gutachten_blendung", titel: "Blendgutachten" }], kostenstand: "kostenrahmen" };
  const e = berechnen(zusammenfuehren([], vorschlag(par)), par);
  const summeGruppen = Object.entries(e.gruppen).filter(([k]) => k !== "sicherheit").reduce((s, [, g]) => s + g.soll, 0);
  pruefe(nahe(e.summen.gesamt, summeGruppen, 1e-9), "Gesamt = Summe der Gruppen (ohne Sicherheiten)", [e.summen.gesamt, summeGruppen]);
  pruefe(nahe(e.summen.eurProKwp, e.summen.gesamt / 10000, 1e-4), "€/kWp = Gesamt / kWp", e.summen.eurProKwp);
  pruefe(nahe(e.summen.capex, e.summen.gesamt - e.gruppen.finanzierung.soll, 1e-9) && nahe(e.summen.finanzierungsbedarf, e.summen.gesamt + e.gruppen.sicherheit.soll, 1e-9), "Capex = Gesamt − Finanzierung; Finanzierungsbedarf = Gesamt + Sicherheiten");
  const ohneMengen = { typ: "freiflaeche", land: "DE", mwp: 10 };
  const e0 = berechnen(zusammenfuehren([], vorschlag(ohneMengen)), ohneMengen);
  pruefe(nahe(e0.summen.epcProKwp, FREIFLAECHE.capexProKwp.mittel, 1e-4), `Technik/EPC ohne Mengenangaben = markt.js ${FREIFLAECHE.capexProKwp.mittel} €/kWp`, e0.summen.epcProKwp);
  const tr = e.positionen.filter((x) => x.gewerk === "trasse").reduce((s, x) => s + x.betrag, 0);
  pruefe(nahe(tr, 1200 * PROJEKTKOSTEN.trasseProM.graben + 60 * PROJEKTKOSTEN.trasseProM.spuelbohrung, 1e-9), "MS-Trasse = Länge × €/m je Verlegeart", tr);
  const p30 = { typ: "freiflaeche", mwp: 30, trasse: { abschnitte: [{ art: "graben", laengeM: 1000 }] } };
  const t30 = berechnen(zusammenfuehren([], vorschlag(p30)), p30).positionen.find((x) => x.gewerk === "trasse");
  pruefe(kabelSysteme(30) === 3 && nahe(t30.betrag, 1000 * PROJEKTKOSTEN.trasseProM.graben * (1 + 2 * FREIFLAECHE.netz.zusatzSystemFaktor), 1e-9), "30 MW: 3 Kabelsysteme, Systemfaktor 2,2", t30?.betrag);
  const bau = e.gruppen.technik.soll + e.gruppen.netz.soll;
  pruefe(nahe(e.positionen.find((x) => x.schluessel === "contingency").betrag, bau * PROJEKTKOSTEN.contingency.kostenrahmen, 1e-6), "Unvorhergesehenes = 10 % (Kostenrahmen) auf Technik + Netz");
  const e7 = berechnen(zusammenfuehren([], vorschlag({ ...par, kostenstand: "kostenberechnung" })), { ...par, kostenstand: "kostenberechnung" });
  pruefe(e7.parameter.contingency === 0.07 && e7.summen.gesamt < e.summen.gesamt, "Kostenberechnung: 7 % Reserve, geringere Summe");
  const bz = e.positionen.find((x) => x.schluessel === "bauzeitzinsen");
  const bauGesamt = e.gruppen.technik.soll + e.gruppen.netz.soll + e.gruppen.neben.soll + e.gruppen.reserve.soll;
  pruefe(nahe(bz.betrag, parameterVoll(par).fkQuote * bauGesamt * parameterVoll(par).zinsBau * (6 / 12) * 0.5, 1e-6), "Bauzeitzinsen = FK × Bausumme × Zins × Monate/12 × 50 %");
  pruefe(e.positionen.filter((x) => x.gewerk === "ent_gutachten").length === 2 && nahe(e.gruppen.entwicklung.soll, 10000 * 65 + 11 * 3 * 200, 1e-6), "Entwicklung = Mitte 65 €/kWp (inkl. 2 Gutachten) + Reservierung", e.gruppen.entwicklung.soll);
  // Überschreiben
  const man = zusammenfuehren([{ schluessel: "module", gewerk: "module", menge: 10000, ep: 150, manuell: true, bezeichnung: "Module Angebot" }], vorschlag(par));
  const em = berechnen(man, par).positionen.find((x) => x.schluessel === "module");
  pruefe(em.manuell && em.betrag === 1500000 && em.ampel === "rot" && nahe(em.abweichung, 150 / 112.8 - 1, 1e-6), "Überschriebener Modulpreis: Betrag, Abweichung +33 % → rot", em);
  const spPar = { typ: "speicher", mwp: 20, mwh: 40, speicherNetzbezug: true };
  const es = berechnen(zusammenfuehren([], vorschlag(spPar)), spPar);
  pruefe(es.positionen.find((x) => x.schluessel === "bkz")?.betrag === 20000 * SPEICHER.bkzProKw.ms && es.summen.eurProKwh === SPEICHER.capexProKwh.mittel, "Speicher: BKZ 20 MW × 125 €/kW, 260 €/kWh");
  const si = sollIst(e, { jeArt: { planung: 12000, netz: 3000 }, quelle: "plattform" });
  pruefe(si.find((z) => z.kostenart === "planung")?.ist === 12000 && si.find((z) => z.kostenart === "planung")?.quelle === "plattform", "Soll/Ist: Ist aus dem Finanzmodul je Kostenart");
  // Übernahme Trassenlänge
  const ts = trasseSetzen(par, 2520, "akquise:AZ-1");
  pruefe(trassenLaenge(parameterVoll(ts)) === 2520 && ts.trasse.abschnitte[0].laengeM === 2400 && ts.trasse.abschnitte[1].laengeM === 120 && ts.trasse.quelle === "akquise:AZ-1", "Trassenlänge übernehmen: Aufteilung proportional (2.400 + 120 m)", ts.trasse);
  pruefe(trassenLaenge(parameterVoll(trasseSetzen({}, 800))) === 800, "Trassenlänge ohne Aufteilung → ein Abschnitt Graben");
  const ue = uebernahmeAusDxf(par, analysieren(B.dxf).kennzahlen);
  pruefe(ue.some((x) => x.feld === "zaunM" && x.neu === 1325) && ue.some((x) => x.feld === "trasse" && x.neu === 1436) && ue.some((x) => x.nurHinweis), "DXF-Übernahme: Zaun 1.325 m, Trasse 1.436 m, Leistung nur als Hinweis", ue);
  return { e };
}

// ================================================================ End-to-End

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
      if (body instanceof FormData) payload = body;
      else {
        headers["Content-Type"] ||= "application/json";
        payload = typeof body === "string" ? body : JSON.stringify(body);
      }
    }
    let res;
    for (let versuch = 1; ; versuch++) {
      try {
        res = await fetch(BASIS + pfad, { method: methode, headers, body: payload, redirect: "manual", signal: AbortSignal.timeout(180000) });
        const html = res.status >= 500 && /text\/html/.test(res.headers.get("content-type") || "") && pfad.startsWith("/api/");
        if (html && versuch < 4) {
          await new Promise((r) => setTimeout(r, 3000 * versuch));
          continue;
        }
        break;
      } catch (e) {
        if (versuch >= 4) throw e;
        await new Promise((r) => setTimeout(r, 3000 * versuch));
      }
    }
    for (const c of res.headers.getSetCookie?.() || []) {
      const [paar] = c.split(";");
      const [name, wert] = paar.split("=");
      if (/oi_sitzung$/.test(name)) this.cookie = wert ? `${name}=${wert}` : "";
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const text = buf.toString("utf8");
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 200) };
    }
    return { status: res.status, json, headers: res.headers, text, buf };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  put = (p, b, o) => this.anfrage("PUT", p, b ?? {}, o);
  async login(email) {
    const r = await this.post("/api/auth/login", { email, passwort: DEMO_PASSWORT });
    if (r.status !== 200) throw new Error(`Login ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    return this;
  }
  hochladen(daten, name, felder, { kopf = { "X-Plattform-Upload": "1" }, origin } = {}) {
    const fd = new FormData();
    fd.append("datei", new Blob([daten]), name);
    for (const [k, w] of Object.entries(felder)) fd.append(k, w);
    return this.anfrage("POST", "/api/planung/upload", fd, { kopf, origin });
  }
}

async function e2e() {
  abschnitt(`5. End-to-End gegen ${BASIS} (Lauf ${LAUF})`);
  const admin = await new Client("admin").login("admin@example.com");
  const lesen = await new Client("bo-lesen").login("bo-lesen@example.com");
  const gut = await new Client("gutachter").login("gutachter@example.com");
  const inv = await new Client("investor").login("investor@example.com");
  const eig = await new Client("flaeche").login("flaeche@example.com");
  const gast = new Client("gast");

  let r = await admin.get("/api/admin/entwicklung");
  const muehl = (r.json.projekte || []).find((p) => /Mühlweg/.test(p.titel));
  if (!pruefe(!!muehl, "Demo-Projekt „Solarpark Mühlweg (Demo)“ vorhanden")) return;
  const pid = muehl.id;

  // ---- Planliste & Rechte
  r = await admin.get(`/api/admin/entwicklung/${pid}/planung`);
  const plaene = r.json.plaene || [];
  const p100 = plaene.find((p) => p.plannummer === "P-100");
  const p200 = plaene.find((p) => p.plannummer === "P-200");
  const p300 = plaene.find((p) => p.plannummer === "P-300");
  const v010 = plaene.find((p) => p.plannummer === "V-010");
  pruefe(r.status === 200 && p100 && p200 && p300 && v010, "Backoffice: Demo-Pläne P-100, P-200, P-300, V-010", r.status);
  pruefe(p100?.versionen.length === 2 && p100.versionen.some((v) => v.index === "A" && v.status === "ersetzt") && p100.status === "freigegeben" && p100.index === "B", "P-100: Index A ersetzt, Index B freigegeben");
  pruefe(v010?.versionen[0]?.konvertierung?.status === "nicht_verfuegbar" && !v010.versionen[0].vorschau, "DWG ohne Konverter: „Vorschau nach Konvertierung“, keine Vorschau");
  const vB = p100?.versionen.find((v) => v.index === "B");
  const vA = p100?.versionen.find((v) => v.index === "A");
  pruefe(vB?.analyse?.kennzahlen?.tische === 257, "Analyse beim Upload gespeichert (Index B: 257 Tische)", vB?.analyse?.kennzahlen);
  r = await lesen.get(`/api/admin/entwicklung/${pid}/planung`);
  pruefe(r.status === 200 && r.json.rechte?.schreiben === false, "bo-lesen: Planliste lesen, ohne Schreibrecht", r.json.rechte);
  r = await gut.get(`/api/admin/entwicklung/${pid}/planung`);
  pruefe(r.status === 403, "Gutachter: Admin-API → 403", r.status);
  r = await gast.get(`/api/portal/planung?projektId=${pid}`);
  pruefe(r.status === 401, "Gast → 401", r.status);

  r = await gut.get(`/api/portal/planung?projektId=${pid}`);
  const gp = (r.json.plaene || []).filter((p) => !p.plannummer.startsWith("T-PLAN-")); // eigene Testpläne früherer Läufe ausblenden
  pruefe(r.status === 200 && gp.length === 1 && gp[0].plannummer === "P-300", "Gutachter sieht nur den Plan an seinem Meilenstein (P-300)", gp.map((p) => p.plannummer));
  r = await gut.get(`/api/portal/planung/versionen/${p300.versionen[0].id}`);
  pruefe(r.status === 200 && r.text.includes("FeatureCollection"), "Gutachter lädt P-300 (GeoJSON) herunter", r.status);
  r = await gut.get(`/api/portal/planung/versionen/${vB.id}`);
  pruefe(r.status === 403, "Gutachter: fremder Plan P-100 → 403", r.status);

  r = await inv.get(`/api/portal/planung?projektId=${pid}`);
  const ip = r.json.plaene || [];
  pruefe(r.status === 200 && ip.some((p) => p.plannummer === "P-100") && !ip.some((p) => p.plannummer === "P-200") && !ip.some((p) => p.plannummer === "V-010"), "Co-Investor: nur Pläne mit freigegebener Version (kein P-200/V-010)", ip.map((p) => p.plannummer));
  const ip100 = ip.find((p) => p.plannummer === "P-100");
  pruefe(ip100?.versionen.length === 1 && ip100.versionen[0].index === "B" && !ip100.versionen[0].analyse?.kennzahlen, "Co-Investor: nur Index B, ohne interne Kennzahlen", ip100?.versionen);
  r = await inv.get(`/api/portal/planung/versionen/${vA.id}`);
  pruefe(r.status === 403, "Co-Investor: ersetzter Index A → 403", r.status);
  r = await inv.get(`/api/portal/planung/versionen/${vB.id}`);
  const invDxf = r.status === 200 ? analysieren(r.text) : null;
  pruefe(r.status === 200 && invDxf?.kennzahlen.tische === 257 && /nosniff/.test(r.headers.get("x-content-type-options") || "") && /attachment/.test(r.headers.get("content-disposition") || ""), "Co-Investor: Index B als DXF (attachment, nosniff), Parser liest 257 Tische", r.status);
  r = await inv.get(`/api/portal/planung/versionen/${p200.versionen[0].id}`);
  pruefe(r.status === 403, "Co-Investor: Plan zur Prüfung → 403", r.status);
  r = await eig.get(`/api/portal/planung?projektId=${pid}`);
  pruefe(r.status === 403 && !r.text.includes("P-100"), "Flächeneigentümer → 403 ohne Inhalte", r.status);
  r = await eig.get(`/api/portal/planung/versionen/${vB.id}`);
  pruefe(r.status === 403, "Flächeneigentümer: Download → 403", r.status);

  // ---- Upload-Typen, Größen, CSRF
  const A = beispielSolarparkDxf({ variante: "A" });
  const B = beispielSolarparkDxf({ variante: "B" });
  const nr = `T-PLAN-${LAUF}`;
  const kopf = { projektId: pid, plannummer: nr, titel: "Testplan Belegung", planart: "belegungsplan", massstab: "1:1000", blattformat: "A1", planer: "Test", aenderung: "Erstausgabe" };
  r = await admin.hochladen(Buffer.from(A.dxf), "test.dxf", kopf, { kopf: {} });
  pruefe(r.status === 403, "Upload ohne X-Plattform-Upload → 403", r.status);
  r = await admin.hochladen(Buffer.from(A.dxf), "test.dxf", kopf, { origin: "https://boese.example" });
  pruefe(r.status === 403, "Upload mit fremdem Origin → 403 (CSRF)", r.status);
  r = await admin.hochladen(Buffer.from("MZ kein Plan"), "test.dwg", kopf);
  pruefe(r.status === 415, "Upload unbekannter Inhalt → 415", r.status);
  r = await admin.hochladen(Buffer.concat([Buffer.from("AutoCAD Binary DXF\r\n\x1a\0"), Buffer.alloc(64)]), "bin.dxf", kopf);
  pruefe(r.status === 415, "Upload Binär-DXF → 415", r.status);
  r = await lesen.hochladen(Buffer.from(A.dxf), "test.dxf", kopf);
  pruefe(r.status === 403, "bo-lesen: Upload → 403", r.status);
  r = await eig.hochladen(Buffer.from(A.dxf), "test.dxf", kopf);
  pruefe(r.status === 403, "Eigentümer: Upload → 403", r.status);
  r = await admin.hochladen(Buffer.from(A.dxf), "test.dxf", kopf);
  const testPlan = r.json.plan;
  pruefe(r.status === 201 && r.json.version?.format === "dxf" && r.json.version.index === "A" && r.json.version.analyse?.kennzahlen?.tische === 198, "Backoffice: DXF hochgeladen (Index A, 198 Tische)", r.json);
  r = await admin.hochladen(Buffer.from(A.dxf), "doppelt.dxf", kopf);
  pruefe(r.status === 409, "Gleiche Plannummer als neuer Plan → 409", r.status);
  r = await admin.hochladen(Buffer.from(B.dxf), "test_b.dxf", { projektId: pid, planId: testPlan?.id, aenderung: "Ostfeld" });
  const tB = r.json.version;
  pruefe(r.status === 201 && tB?.index === "B" && tB.status === "entwurf", "Neuer Planstand → Index B (Entwurf)", r.json);
  r = await admin.hochladen(Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"), "plan.pdf", { ...kopf, plannummer: `${nr}-PDF`, titel: "PDF-Plan" });
  pruefe(r.status === 201 && r.json.version?.format === "pdf", "PDF-Plan hochgeladen", r.status);
  r = await admin.hochladen(Buffer.concat([Buffer.from("AC1027"), Buffer.alloc(300)]), "bestand.dwg", { ...kopf, plannummer: `${nr}-DWG`, titel: "DWG-Test" });
  pruefe(r.status === 201 && r.json.version?.format === "dwg" && ["nicht_verfuegbar", "fehler", "fertig"].includes(r.json.version.konvertierung?.status) && r.json.version.analyse?.dwgRelease === "AutoCAD 2013", "DWG hochgeladen (AutoCAD 2013), Konvertierungsstatus gesetzt", r.json.version);
  const shapeZip = zip({ "baufeld.shp": shpPolygon(), "baufeld.shx": Buffer.alloc(100), "baufeld.dbf": Buffer.alloc(33), "baufeld.prj": 'PROJCS["UTM"]' });
  r = await admin.hochladen(shapeZip, "baufeld.zip", { ...kopf, plannummer: `${nr}-SHP`, titel: "Shape-Test", planart: "vermessung" });
  pruefe(r.status === 201 && r.json.version?.format === "shape" && r.json.version.abgeleitet?.art === "geojson", "Shapefile-ZIP hochgeladen, GeoJSON-Vorschau abgeleitet", r.json.version);
  if (r.json.version) {
    const d = await admin.get(`/api/portal/planung/versionen/${r.json.version.id}?abgeleitet=1`);
    pruefe(d.status === 200 && JSON.parse(d.text).features.length === 1, "Abgeleitete GeoJSON-Vorschau abrufbar", d.status);
  }
  const zuGross = Buffer.alloc(FORMATE.geojson.maxBytes + 1024, 0x20);
  Buffer.from('{"type":"FeatureCollection","features":[]}').copy(zuGross);
  r = await admin.hochladen(zuGross, "gross.geojson", { ...kopf, plannummer: `${nr}-GROSS` });
  pruefe(r.status === 413, "GeoJSON > 10 MB → 413", r.status);

  // ---- Status: Freigabe ersetzt Vorversion
  const tA = (await admin.get(`/api/admin/entwicklung/${pid}/planung`)).json.plaene.find((p) => p.id === testPlan?.id)?.versionen.find((v) => v.index === "A");
  for (const a of ["einreichen", "freigeben"]) r = await admin.post(`/api/portal/planung/versionen/${tA?.id}`, { aktion: a });
  pruefe(r.status === 200 && r.json.version?.status === "freigegeben", "Index A: eingereicht und freigegeben", r.json);
  r = await admin.post(`/api/portal/planung/versionen/${tB?.id}`, { aktion: "freigeben" });
  pruefe(r.status === 409, "Freigeben aus Entwurf → 409", r.status);
  r = await admin.post(`/api/portal/planung/versionen/${tB?.id}`, { aktion: "einreichen" });
  r = await admin.post(`/api/portal/planung/versionen/${tB?.id}`, { aktion: "zurueckweisen" });
  pruefe(r.status === 422, "Zurückweisen ohne Begründung → 422", r.status);
  r = await admin.post(`/api/portal/planung/versionen/${tB?.id}`, { aktion: "freigeben" });
  const nach = (await admin.get(`/api/admin/entwicklung/${pid}/planung`)).json.plaene.find((p) => p.id === testPlan?.id);
  pruefe(r.status === 200 && nach?.versionen.find((v) => v.index === "A")?.status === "ersetzt" && nach.index === "B", "Freigabe Index B → Index A „ersetzt“", nach?.versionen.map((v) => [v.index, v.status]));
  r = await lesen.post(`/api/portal/planung/versionen/${tB?.id}`, { aktion: "zurueckziehen", kommentar: "Test lesen" });
  pruefe(r.status === 403, "bo-lesen: Statusaktion → 403", r.status);
  r = await admin.post(`/api/portal/planung/versionen/${tB?.id}`, { aktion: "freigeben" }, { origin: "https://boese.example" });
  pruefe(r.status === 403, "Statusaktion mit fremdem Origin → 403", r.status);

  // ---- Gutachter lädt am zugewiesenen Meilenstein hoch
  const msId = p300.meilensteinId;
  r = await gut.hochladen(Buffer.from(beispielGeojson()), "kartierung.geojson", { projektId: pid, plannummer: `${nr}-G`, titel: "Kartierung Feldlerche", planart: "gruen", massstab: "ohne", blattformat: "digital", meilensteinId: msId });
  const gv = r.json.version;
  pruefe(r.status === 201 && r.json.plan?.istPlaner, "Gutachter: neuer Plan am zugewiesenen Meilenstein", r.json);
  r = await gut.hochladen(Buffer.from(beispielGeojson()), "x.geojson", { projektId: pid, plannummer: `${nr}-G2`, titel: "ohne Meilenstein" });
  pruefe(r.status === 403, "Gutachter: Plan ohne zugewiesenen Meilenstein → 403", r.status);
  r = await gut.hochladen(Buffer.from(A.dxf), "x.dxf", { projektId: pid, planId: p100.id });
  pruefe(r.status === 403, "Gutachter: neuer Stand für fremden Plan → 403", r.status);
  r = await gut.post(`/api/portal/planung/versionen/${gv?.id}`, { aktion: "einreichen" });
  pruefe(r.status === 200 && r.json.version?.status === "pruefung", "Gutachter reicht eigenen Plan zur Prüfung ein", r.json);
  r = await gut.post(`/api/portal/planung/versionen/${gv?.id}`, { aktion: "freigeben" });
  pruefe(r.status === 403, "Gutachter darf nicht freigeben → 403", r.status);
  r = await inv.get(`/api/portal/planung/versionen/${gv?.id}`);
  pruefe(r.status === 403, "Co-Investor: Gutachter-Plan zur Prüfung → 403", r.status);

  // ---- Kostenkalkulation
  r = await admin.get(`/api/admin/entwicklung/${pid}/kalkulation`);
  const k = r.json;
  const sumG = Object.entries(k.gruppen || {}).filter(([g]) => g !== "sicherheit").reduce((s, [, g]) => s + g.soll, 0);
  pruefe(r.status === 200 && nahe(k.summen.gesamt, sumG, 1e-9) && nahe(k.summen.eurProKwp, k.summen.gesamt / (muehl.mwp * 1000), 1e-4), "Kalkulation Mühlweg: Summe der Gruppen, €/kWp", k.summen);
  pruefe(k.kostenstand === "kostenrahmen" && k.staende?.length >= 2 && k.staende[0].vergleich, "Kostenstände mit Historie und Vergleich", k.staende?.length);
  pruefe(k.positionen.find((x) => x.schluessel === "module")?.manuell && k.positionen.find((x) => x.schluessel === "module")?.ep === 105, "Überschriebener Modulpreis (Rahmenangebot) bleibt erhalten");
  pruefe(k.parameter.trasseLaengeM === 1436 && k.quellen.dxf.some((x) => x.plannummer === "P-100"), "Trasse 1.436 m, DXF-Quelle P-100 verfügbar", k.parameter.trasseLaengeM);
  pruefe(k.benchmark?.eintraege?.some((b) => b.id === "epc"), "Benchmark gegen markt.js vorhanden");
  for (const [c, name] of [[gut, "Gutachter"], [inv, "Co-Investor"], [eig, "Eigentümer"]]) {
    r = await c.get(`/api/admin/entwicklung/${pid}/kalkulation`);
    pruefe(r.status === 403 && !r.text.includes("gesamt"), `${name}: Kalkulation → 403 ohne Zahlen`, r.status);
  }
  r = await lesen.get(`/api/admin/entwicklung/${pid}/kalkulation`);
  pruefe(r.status === 200 && r.json.darfBearbeiten === false, "bo-lesen: Kalkulation lesen", r.status);
  r = await lesen.put(`/api/admin/entwicklung/${pid}/kalkulation`, { parameter: {} });
  pruefe(r.status === 403, "bo-lesen: Speichern → 403", r.status);

  // eigenes Testprojekt
  r = await admin.post("/api/admin/entwicklung", { titel: `plan-test-${LAUF} Solarpark`, typ: "freiflaeche", land: "DE", bundesland: "Bayern", gemeinde: "Testdorf", mwp: 12, vermarktung: "eeg" });
  const tp = r.json.projekt;
  if (!pruefe(r.status === 201 && tp?.id, "Testprojekt angelegt", r.status)) return;
  r = await admin.get(`/api/admin/entwicklung/${tp.id}/kalkulation`);
  pruefe(r.status === 200 && !r.json.gespeichert && r.json.positionen.length > 10 && r.json.parameter.mwp === 12, "Neues Projekt: Vorschlag aus markt.js (noch nicht gespeichert)", r.json.parameter);
  r = await admin.put(`/api/admin/entwicklung/${tp.id}/kalkulation`, { parameter: { flaecheHa: 13, zaunM: 1500, trasse: { abschnitte: [{ art: "graben", laengeM: 900 }, { art: "bankett", laengeM: 300 }], querungen: { strasse: 2 } } }, positionen: [{ schluessel: "wechselrichter", gewerk: "wechselrichter", art: "menge", menge: 12000, ep: 40, manuell: true, angebot: "Test-Angebot" }, { schluessel: "frei:", gewerk: "sonstiges", bezeichnung: "Baustrom", menge: 1, einheit: "psch", ep: 12000 }] });
  const k2 = r.json.kalkulation;
  const wr = k2?.positionen.find((x) => x.schluessel === "wechselrichter");
  pruefe(r.status === 200 && k2.gespeichert && wr?.manuell && wr.betrag === 480000 && k2.positionen.some((x) => x.bezeichnung === "Baustrom" && x.betrag === 12000), "Speichern: Überschreiben + eigene Position", r.json.error || wr);
  pruefe(k2?.parameter.trasseLaengeM === 1200 && k2.positionen.filter((x) => x.gewerk === "querung").reduce((s, x) => s + x.betrag, 0) === 2 * PROJEKTKOSTEN.querung.strasse, "Trasse 1.200 m in zwei Verlegearten, 2 Straßenquerungen");
  r = await admin.post(`/api/admin/entwicklung/${tp.id}/kalkulation/aktion`, { aktion: "trasse_akquise" });
  pruefe(r.status === 409, "Trasse aus Akquise ohne Geodaten → 409", r.status);
  // DXF-Übernahme aus Testplan (anderes Projekt → 404), dann aus eigenem Plan
  r = await admin.post(`/api/admin/entwicklung/${tp.id}/kalkulation/aktion`, { aktion: "dxf_uebernehmen", versionId: tB?.id, felder: ["zaunM"] });
  pruefe(r.status === 404, "DXF-Übernahme aus fremdem Projekt → 404", r.status);
  r = await admin.hochladen(Buffer.from(A.dxf), "tp.dxf", { ...kopf, projektId: tp.id, plannummer: `${nr}-TP` });
  const tpv = r.json.version;
  r = await admin.post(`/api/admin/entwicklung/${tp.id}/kalkulation/aktion`, { aktion: "dxf_uebernehmen", versionId: tpv?.id, felder: [] });
  pruefe(r.status === 422, "DXF-Übernahme ohne Bestätigung → 422", r.status);
  r = await admin.post(`/api/admin/entwicklung/${tp.id}/kalkulation/aktion`, { aktion: "dxf_uebernehmen", versionId: tpv?.id, felder: ["zaunM", "trasse"] });
  pruefe(r.status === 200 && r.json.kalkulation.parameter.zaunM === 1325 && r.json.kalkulation.parameter.trasseLaengeM === 1436 && /dxf:/.test(r.json.kalkulation.parameter.trasse.quelle), "DXF-Übernahme: Zaun 1.325 m, Trasse 1.436 m (proportional aufgeteilt)", r.json.kalkulation?.parameter);

  // Trasse aus Akquise-Geodaten: vorhandenes, noch nicht verknüpftes Ziel mit Trasse nutzen, sonst eines übernehmen;
  // die Verknüpfung wird am Ende wieder gelöst (wiederholbare Läufe)
  r = await admin.get("/api/admin/geodaten/ziele");
  const ziele = (r.json.ziele || []).filter((z) => z.umspannwerk?.trasseM > 0 && z.flaecheId);
  let ziel = null;
  let pfEintrag = null;
  for (const z of ziele) {
    const e2 = await admin.post(`/api/admin/entwicklung/${tp.id}/eintraege`, { art: "flaeche", daten: { flaecheId: z.flaecheId, pachtStatus: "angefragt" } });
    if (e2.status === 200) {
      ziel = z;
      pfEintrag = e2.json.eintrag;
      break;
    }
  }
  if (!ziel) {
    const kand = (await admin.get("/api/admin/geodaten/kandidaten")).json.kandidaten || [];
    const frei = kand.find((x) => x.netz?.trasseM > 0 && !(r.json.ziele || []).some((z) => z.kandidatId === x.id));
    if (frei) {
      const z = await admin.post("/api/admin/geodaten/ziele", { kandidatId: frei.id, notiz: `plan-test-${LAUF}` });
      ziel = z.json.ziel;
      const e2 = ziel ? await admin.post(`/api/admin/entwicklung/${tp.id}/eintraege`, { art: "flaeche", daten: { flaecheId: ziel.flaecheId, pachtStatus: "angefragt" } }) : null;
      pfEintrag = e2?.json?.eintrag || null;
    }
  }
  if (pruefe(!!ziel && !!pfEintrag, "Akquise-Ziel mit Trasse mit dem Testprojekt verknüpft (Geodaten-Demo)", r.status)) {
    r = await admin.get(`/api/admin/entwicklung/${tp.id}/kalkulation`);
    pruefe(r.json.quellen?.akquise?.trasseM === Math.round(ziel.umspannwerk.trasseM), "Kalkulation zeigt Trassenlänge aus der Akquise", r.json.quellen?.akquise);
    r = await admin.post(`/api/admin/entwicklung/${tp.id}/kalkulation/aktion`, { aktion: "trasse_akquise" });
    pruefe(r.status === 200 && r.json.kalkulation.parameter.trasseLaengeM === Math.round(ziel.umspannwerk.trasseM) && /^akquise:/.test(r.json.kalkulation.parameter.trasse.quelle), `Trassenlänge aus Akquise übernommen (${Math.round(ziel.umspannwerk.trasseM)} m)`, r.json.kalkulation?.parameter?.trasse);
    const weg = await admin.anfrage("DELETE", `/api/admin/entwicklung/${tp.id}/eintraege?art=flaeche&id=${pfEintrag.id}`);
    pruefe([200, 204].includes(weg.status), "Verknüpfung der Akquise-Fläche wieder gelöst", weg.status);
  }
  // Kostenstand festschreiben, Übergabe
  r = await admin.post(`/api/admin/entwicklung/${tp.id}/kalkulation/aktion`, { aktion: "festschreiben", stand: "kostenberechnung", kommentar: "Test" });
  pruefe(r.status === 200 && r.json.kalkulation.kostenstand === "kostenberechnung" && r.json.kalkulation.parameter.contingency === 0.07 && r.json.kalkulation.staende.length === 1, "Kostenstand „Kostenberechnung“ festgeschrieben (7 % Reserve)", r.json.kalkulation?.staende);
  r = await admin.post(`/api/admin/entwicklung/${tp.id}/kalkulation/aktion`, { aktion: "festschreiben", stand: "schaetzung" });
  pruefe(r.status === 422, "Rückschritt im Kostenstand ohne Begründung → 422", r.status);
  r = await admin.post(`/api/admin/entwicklung/${tp.id}/kalkulation/aktion`, { aktion: "uebergeben" });
  const ueb = r.json.kalkulation?.uebergabe;
  pruefe(r.status === 200 && ueb && nahe(ueb.finanzierungsbedarf, r.json.kalkulation.summen.finanzierungsbedarf, 1e-9) && ueb.stand === "kostenberechnung", "Übergabe: Finanzierungsbedarf und Capex am Projekt", ueb);
  r = await admin.post(`/api/admin/entwicklung/${tp.id}/kalkulation/aktion`, { aktion: "uebergeben" }, { origin: "https://boese.example" });
  pruefe(r.status === 403, "Kalkulationsaktion mit fremdem Origin → 403", r.status);
  // Export
  r = await admin.get(`/api/admin/entwicklung/${tp.id}/kalkulation/export?format=csv`);
  pruefe(r.status === 200 && r.buf[0] === 0xef && r.buf[1] === 0xbb && r.buf[2] === 0xbf && r.text.includes(";") && r.text.includes("Wechselrichter") && r.text.includes("Gesamtkosten"), "CSV-Export (BOM, Semikolon, Positionen, Summen)", r.status);
  r = await admin.get(`/api/admin/entwicklung/${tp.id}/kalkulation/export?format=pdf`);
  pruefe(r.status === 200 && r.buf.subarray(0, 5).toString() === "%PDF-" && /application\/pdf/.test(r.headers.get("content-type") || ""), "PDF-Export „Kostenrahmen“", r.status);
  r = await lesen.get(`/api/admin/entwicklung/${tp.id}/kalkulation/export?format=pdf`);
  pruefe(r.status === 200, "bo-lesen: PDF-Export (Leserecht)", r.status);

  // ---- Seiten
  abschnitt("6. Seiten");
  r = await admin.get(`/portal/admin/entwicklung/${pid}?reiter=planung`);
  pruefe(r.status === 200 && r.text.includes("Planunterlagen") && r.text.includes("P-100"), "Reiter „Pläne“ 200", r.status);
  r = await admin.get(`/portal/admin/entwicklung/${pid}?reiter=kalkulation`);
  pruefe(r.status === 200 && r.text.includes("Gesamtkosten") && r.text.includes("Kostenstände"), "Reiter „Kostenkalkulation“ 200", r.status);
  r = await inv.get(`/portal/planung/${vB.id}`);
  pruefe(r.status === 200 && r.text.includes("Belegungsplan"), "Planvorschau für Co-Investor 200", r.status);
  r = await eig.get(`/portal/planung/${vB.id}`);
  pruefe((r.status === 404 || r.text.includes("NEXT_HTTP_ERROR_FALLBACK;404")) && !r.text.includes("Belegungsplan Modulfelder"), "Planvorschau für Eigentümer 404", r.status);
  r = await gut.get(`/portal/entwicklung/${pid}`);
  pruefe(r.status === 200 && r.text.includes("P-300") && !r.text.includes("P-100"), "Externe Projektseite zeigt Gutachter nur P-300", r.status);
}

async function main() {
  console.log(`Planungsdateien & Projektkosten – Test${NUR_LOGIK ? " (nur Logik)" : ` gegen ${BASIS}`}`);
  logik();
  if (!NUR_LOGIK) {
    try {
      await e2e();
    } catch (e) {
      fehler++;
      console.log(rot(`  ✗ Abbruch: ${e.message}`));
    }
  }
  console.log(`\n${ok} bestanden, ${fehler} fehlgeschlagen`);
  process.exit(fehler ? 1 : 0);
}

main();
