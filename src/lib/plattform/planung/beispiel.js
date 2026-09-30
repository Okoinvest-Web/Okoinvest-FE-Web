// src/lib/plattform/planung/beispiel.js
//
// Selbst erzeugte Beispiel-DXF-Pläne für Demo und Tests (fiktiv): Solarpark-Belegungsplan mit Modultischen (Block mit
// Reihen/Spalten, gedrehtes Teilfeld), Zaun mit Toren und Kameras, Wegen, Trafostationen (einmal gespiegelt eingefügt),
// Mittelspannungstrasse mit Bogen bis zur Übergabe, Baugrenze (alte POLYLINE/VERTEX), Ausgleichsfläche (Ellipse),
// Beschriftung (TEXT/MTEXT), Nordpfeil-Block, ausgeschaltetem Hilfslinien-Layer und einer Schraffur (nicht gezeichnet).
// Koordinaten in Metern (UTM-artiger Versatz), $INSUNITS = 6. Zusätzlich liefert der Generator die Sollwerte, die der
// Parser daraus ableiten muss (Tests: scripts/plattform-test-planung.mjs).

export const BEISPIEL_LAYER = [
  { name: "PV_Module", aci: 150 },
  { name: "Zaun", aci: 8 },
  { name: "Tore", aci: 8 },
  { name: "Kamera", aci: 30 },
  { name: "Wege", aci: 42 },
  { name: "Trafostation", aci: 1 },
  { name: "Kabel_MS", aci: 6 },
  { name: "Baugrenze", aci: 3 },
  { name: "Ausgleich", aci: 94 },
  { name: "Beschriftung", aci: 7 },
  { name: "Hilfslinien", aci: -9 },
];

const E0 = 691200; // Versatz (fiktiv, UTM-artig)
const N0 = 5335400;
const TISCH = { b: 29, h: 4.6 }; // Modultisch 2V26 (2 Module hochkant × 26)

function schreiber() {
  const z = [];
  const g = (code, wert) => z.push(String(code), typeof wert === "number" ? zahl(wert) : String(wert));
  return { g, text: () => z.join("\r\n") + "\r\n" };
}
const zahl = (x) => (Number.isInteger(x) ? `${x}.0` : String(Math.round(x * 1e6) / 1e6));

/** Solarpark-Belegungsplan; variante "A" (erster Entwurf, weniger Tische) oder "B" (Planstand mit Ostfeld). */
export function beispielSolarparkDxf({ variante = "B" } = {}) {
  const w = schreiber();
  const { g } = w;
  const P = (x, y) => [E0 + x, N0 + y];
  const soll = { tische: 0, modulflaecheM2: 0, zaunM: 0, kabelMsM: 0, wegeM2: 0, trafos: 2, anlageM2: 0, bboxMin: null, bboxMax: null };

  // ---------------------------------------------------------------- HEADER
  g(999, "OekoInvest Plattform - Beispielplan (fiktiv, Demo)");
  g(0, "SECTION"); g(2, "HEADER");
  g(9, "$ACADVER"); g(1, "AC1015");
  g(9, "$INSUNITS"); g(70, 6);
  g(0, "ENDSEC");

  // ---------------------------------------------------------------- TABLES (Layer)
  g(0, "SECTION"); g(2, "TABLES");
  g(0, "TABLE"); g(2, "LAYER"); g(70, BEISPIEL_LAYER.length + 1);
  for (const l of [{ name: "0", aci: 7 }, ...BEISPIEL_LAYER]) {
    g(0, "LAYER"); g(2, l.name); g(70, 0); g(62, l.aci); g(6, "CONTINUOUS");
  }
  g(0, "ENDTAB");
  g(0, "ENDSEC");

  // ---------------------------------------------------------------- BLOCKS
  g(0, "SECTION"); g(2, "BLOCKS");
  // Modultisch: Kontur + zwei Modulreihenlinien (Layer 0 → erbt den Layer des INSERT)
  g(0, "BLOCK"); g(8, "0"); g(2, "TISCH_2V26"); g(70, 0); g(10, 0); g(20, 0); g(30, 0);
  lwpoly(g, "0", [[0, 0], [TISCH.b, 0], [TISCH.b, TISCH.h], [0, TISCH.h]], true);
  g(0, "LINE"); g(8, "0"); g(10, 0); g(20, TISCH.h / 2); g(30, 0); g(11, TISCH.b); g(21, TISCH.h / 2); g(31, 0);
  g(0, "ENDBLK"); g(8, "0");
  // Trafostation 6 × 2,5 m mit Kennbuchstabe
  g(0, "BLOCK"); g(8, "0"); g(2, "TRAFO"); g(70, 0); g(10, 0); g(20, 0); g(30, 0);
  lwpoly(g, "0", [[0, 0], [6, 0], [6, 2.5], [0, 2.5]], true);
  g(0, "TEXT"); g(8, "0"); g(10, 3); g(20, 1.25); g(30, 0); g(40, 1.2); g(1, "T"); g(72, 1); g(73, 2); g(11, 3); g(21, 1.25); g(31, 0);
  g(0, "ENDBLK"); g(8, "0");
  // Nordpfeil (mit SOLID → nicht unterstützt, wird gezählt)
  g(0, "BLOCK"); g(8, "0"); g(2, "NORD"); g(70, 0); g(10, 0); g(20, 0); g(30, 0);
  g(0, "LINE"); g(8, "0"); g(10, 0); g(20, -4); g(30, 0); g(11, 0); g(21, 4); g(31, 0);
  g(0, "SOLID"); g(8, "0"); g(10, 0); g(20, 4); g(30, 0); g(11, -1.5); g(21, 0); g(31, 0); g(12, 1.5); g(22, 0); g(32, 0); g(13, 1.5); g(23, 0); g(33, 0);
  g(0, "TEXT"); g(8, "0"); g(10, 0); g(20, 5); g(30, 0); g(40, 2); g(1, "N"); g(72, 1); g(11, 0); g(21, 5); g(31, 0);
  g(0, "ENDBLK"); g(8, "0");
  g(0, "ENDSEC");

  // ---------------------------------------------------------------- ENTITIES
  g(0, "SECTION"); g(2, "ENTITIES");

  // Zaun (geschlossen, abgeschrägte Nordostecke)
  const zaun = [[0, 0], [420, 0], [420, 200], [360, 260], [0, 260]];
  lwpoly(g, "Zaun", zaun.map(([x, y]) => P(x, y)), true);
  soll.zaunM = 420 + 200 + Math.hypot(60, 60) + 360 + 260;
  // Tor (Bogen, eigener Layer – nicht Zaunlänge) und Kameras (Kreise)
  g(0, "ARC"); g(8, "Tore"); g(10, P(0, 120)[0]); g(20, P(0, 120)[1]); g(30, 0); g(40, 5); g(50, 0); g(51, 90);
  for (const [x, y] of [[0, 0], [420, 0], [0, 260], [420, 200]]) {
    g(0, "CIRCLE"); g(8, "Kamera"); g(10, P(x, y)[0]); g(20, P(x, y)[1]); g(30, 0); g(40, 0.5);
  }

  // Baugrenze als alte POLYLINE mit VERTEX/SEQEND
  const bg = [[10, 10], [410, 10], [410, 195], [355, 250], [10, 250]];
  g(0, "POLYLINE"); g(8, "Baugrenze"); g(66, 1); g(10, 0); g(20, 0); g(30, 0); g(70, 1);
  for (const [x, y] of bg) {
    g(0, "VERTEX"); g(8, "Baugrenze"); g(10, P(x, y)[0]); g(20, P(x, y)[1]); g(30, 0);
  }
  g(0, "SEQEND"); g(8, "Baugrenze");
  soll.anlageM2 = 400 * 240 - (55 * 55) / 2;

  // Wege: Längsweg West + Querweg (zwischen den Tischreihen 120 und 130)
  lwpoly(g, "Wege", [P(12, 12), P(16, 12), P(16, 245), P(12, 245)], true);
  lwpoly(g, "Wege", [P(16, 125), P(400, 125), P(400, 129), P(16, 129)], true);
  soll.wegeM2 = 4 * 233 + 384 * 4;

  // Modultische: Reihen im Abstand 10 m (Reihe 20 … 230), Spalten 31 m; nahe der Schräge kürzer
  const xMax = variante === "A" ? 300 : 400;
  for (let y = 20; y <= 230; y += 10) {
    const grenze = y + TISCH.h > 185 ? Math.min(xMax, 340) : xMax;
    for (let x = 20; x + TISCH.b <= grenze; x += 31) {
      if (variante === "B" && x >= 330 && y >= 20 && y <= 50) continue; // Ostfeld wird als Reihen-/Spalten-INSERT gesetzt
      insert(g, "PV_Module", "TISCH_2V26", P(x, y));
      soll.tische++;
    }
  }
  if (variante === "B") {
    // Ostfeld: ein INSERT mit 2 Spalten × 4 Reihen (entspricht 8 Tischen) – prüft 70/71/44/45
    const [ix, iy] = P(330, 20);
    g(0, "INSERT"); g(8, "PV_Module"); g(2, "TISCH_2V26"); g(10, ix); g(20, iy); g(30, 0); g(70, 2); g(71, 4); g(44, 31); g(45, 10);
    soll.tische += 8;
    // gedrehtes Teilfeld außerhalb des Zauns (Erweiterungsoption Süd, 5°) – prüft Drehung
    for (let k = 0; k < 3; k++) {
      const [x, y] = P(40 + k * 32, -60);
      g(0, "INSERT"); g(8, "PV_Module"); g(2, "TISCH_2V26"); g(10, x); g(20, y); g(30, 0); g(50, 5);
      soll.tische++;
    }
  }
  soll.modulflaecheM2 = soll.tische * TISCH.b * TISCH.h;

  // Trafostationen (Block auf Layer 0 → Layer Trafostation), die zweite gespiegelt (sx = −1)
  insert(g, "Trafostation", "TRAFO", P(200, 238));
  g(0, "INSERT"); g(8, "Trafostation"); g(2, "TRAFO"); g(10, P(66, 238)[0]); g(20, P(66, 238)[1]); g(30, 0); g(41, -1); g(42, 1);

  // Mittelspannungstrasse: Station 1 → Nordrand → Bogen → Übergabe (Bulge 0,2), Station 2 als LINE-Stücke
  const bulge = 0.2;
  const trasse = [[203, 240.5, 0], [203, 247, 0], [330, 247, 0], [330, 300, bulge], [600, 420, 0], [1400, 420, 0]];
  g(0, "LWPOLYLINE"); g(8, "Kabel_MS"); g(90, trasse.length); g(70, 0);
  for (const [x, y, b] of trasse) {
    g(10, P(x, y)[0]); g(20, P(x, y)[1]);
    if (b) g(42, b);
  }
  const theta = 4 * Math.atan(bulge);
  const sehne = Math.hypot(270, 120);
  const bogen = theta * (sehne / (2 * Math.sin(theta / 2)));
  g(0, "LINE"); g(8, "Kabel_MS"); g(10, P(63, 240.5)[0]); g(20, P(63, 240.5)[1]); g(30, 0); g(11, P(63, 247)[0]); g(21, P(63, 247)[1]); g(31, 0);
  g(0, "LINE"); g(8, "Kabel_MS"); g(10, P(63, 247)[0]); g(20, P(63, 247)[1]); g(30, 0); g(11, P(203, 247)[0]); g(21, P(203, 247)[1]); g(31, 0);
  soll.kabelMsM = 6.5 + 127 + 53 + bogen + 800 + 6.5 + 140;

  // Ausgleichsfläche (Ellipse) + Schraffur (nicht unterstützt)
  g(0, "ELLIPSE"); g(8, "Ausgleich"); g(10, P(470, 120)[0]); g(20, P(470, 120)[1]); g(30, 0); g(11, 15); g(21, 0); g(31, 0); g(40, 0.5); g(41, 0); g(42, Math.PI * 2);
  g(0, "HATCH"); g(8, "Ausgleich"); g(2, "SOLID"); g(70, 1); g(71, 0); g(91, 0);

  // Beschriftung, Nordpfeil, Hilfslinien (Layer aus)
  g(0, "TEXT"); g(8, "Beschriftung"); g(10, P(0, -20)[0]); g(20, P(0, -20)[1]); g(30, 0); g(40, 6); g(1, `Solarpark Mühlweg (Demo) - Belegungsplan Index ${variante}`);
  g(0, "MTEXT"); g(8, "Beschriftung"); g(10, P(0, -30)[0]); g(20, P(0, -30)[1]); g(30, 0); g(40, 3); g(71, 1); g(1, `Planstand ${variante}\\PModultische 2V26, Reihenabstand 10 m\\P{\\fArial|b1;Maßstab} 1:1000 (A1)`);
  g(0, "INSERT"); g(8, "Beschriftung"); g(2, "NORD"); g(10, P(450, 240)[0]); g(20, P(450, 240)[1]); g(30, 0); g(41, 2); g(42, 2);
  g(0, "LINE"); g(8, "Hilfslinien"); g(10, P(-50, 130)[0]); g(20, P(-50, 130)[1]); g(30, 0); g(11, P(470, 130)[0]); g(21, P(470, 130)[1]); g(31, 0);

  g(0, "ENDSEC");
  g(0, "EOF");

  // Erwartete sichtbare Ausdehnung (ohne ausgeschaltete Hilfslinien): West Kamera x=−0,5, Ost Trasse x=1400,
  // Süd gedrehtes Feld y=−60 (Variante B) bzw. MTEXT y=−30, Nord Trasse y=420
  soll.bboxMin = [E0 - 0.5, N0 + (variante === "B" ? -60 : -30)];
  soll.bboxMax = [E0 + 1400, N0 + 420];
  return { dxf: w.text(), soll };
}

function lwpoly(g, layer, punkte, zu) {
  g(0, "LWPOLYLINE"); g(8, layer); g(90, punkte.length); g(70, zu ? 1 : 0);
  for (const [x, y] of punkte) {
    g(10, x); g(20, y);
  }
}

function insert(g, layer, block, [x, y]) {
  g(0, "INSERT"); g(8, layer); g(2, block); g(10, x); g(20, y); g(30, 0);
}

/** Kleines GeoJSON (Umgriff + Trasse) als Beispiel für georeferenzierte Pläne */
export function beispielGeojson() {
  const lon = 10.63;
  const lat = 48.05;
  return JSON.stringify({
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { name: "Umgriff Solarpark (Demo)", layer: "Baugrenze" }, geometry: { type: "Polygon", coordinates: [[[lon, lat], [lon + 0.0056, lat], [lon + 0.0056, lat + 0.0018], [lon + 0.0048, lat + 0.0023], [lon, lat + 0.0023], [lon, lat]]] } },
      { type: "Feature", properties: { name: "MS-Trasse (Demo)", layer: "Kabel_MS" }, geometry: { type: "LineString", coordinates: [[lon + 0.0044, lat + 0.0023], [lon + 0.0044, lat + 0.0027], [lon + 0.008, lat + 0.0038], [lon + 0.0187, lat + 0.0038]] } },
      { type: "Feature", properties: { name: "Übergabestation (Demo)", layer: "Trafostation" }, geometry: { type: "Point", coordinates: [lon + 0.0187, lat + 0.0038] } },
    ],
  });
}
