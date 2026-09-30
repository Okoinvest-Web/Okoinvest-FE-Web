// src/lib/plattform/geodaten/export.js
//
// Export der Kandidatenflächen als CSV (Excel-DE: BOM, Semikolon, Formel-Schutz über csv.js) und GeoJSON.
// Keine Eigentümerdaten (gibt es im Geodaten-Bestand nicht). Die GeoJSON-Datei trägt Quellen- und Lizenzhinweise:
// Netzknoten stammen aus OpenStreetMap (ODbL) – abgeleitete Datenbanken unterliegen Share-Alike.

import { csv } from "../csv";
import { KNOTEN_ARTEN } from "./scoring";

const km = (m) => (m == null ? null : Math.round(m / 100) / 10);

export const SPALTEN = [
  { label: "Kandidat", wert: "id" },
  { label: "DEMO", wert: (k) => !!k.demo },
  { label: "Score", wert: "score" },
  { label: "Ampel", wert: "ampel" },
  { label: "Priorität", wert: "prioritaet" },
  { label: "Fläche ha", wert: "ha" },
  { label: "MWp möglich", wert: "mwp" },
  { label: "Bundesland", wert: "bundesland" },
  { label: "Bezirk", wert: "bezirk" },
  { label: "Gemeinde", wert: "gemeinde" },
  { label: "Grundstücke", wert: (k) => (k.parzellen || []).map((p) => (p.kgNr ? `${p.kgNr} ${p.gstNr}` : p.id)).join(", ") },
  { label: "Nutzung", wert: (k) => k.merkmale?.hauptnutzung || "" },
  { label: "Neigung °", wert: (k) => k.merkmale?.neigungGrad },
  { label: "Exposition", wert: (k) => k.merkmale?.exposition || "" },
  { label: "Abstand Siedlung m", wert: (k) => k.merkmale?.siedlung?.abstandM },
  { label: "Schutzgebiete", wert: (k) => (k.merkmale?.schutz || []).map((s) => `${s.name} (${s.anteil > 0 ? `${Math.round(s.anteil * 100)} %` : `${s.abstandM} m`})`).join(", ") },
  { label: "Netzknoten", wert: (k) => (k.netz ? `${k.netz.knoten.name || KNOTEN_ARTEN[k.netz.knoten.art]?.kurz} (${KNOTEN_ARTEN[k.netz.knoten.art]?.kurz})` : "") },
  { label: "Luftlinie km", wert: (k) => km(k.netz?.luftlinieM) },
  { label: "Trasse km (geschätzt)", wert: (k) => km(k.netz?.trasseM) },
  { label: "Netzanschluss min €", wert: (k) => k.netz?.kosten?.min },
  { label: "Netzanschluss max €", wert: (k) => k.netz?.kosten?.max },
  { label: "Kapazität", wert: (k) => k.netz?.knoten?.kapazitaet || "" },
  { label: "Nächstes UW", wert: (k) => k.umspannwerk?.name || "" },
  { label: "UW Luftlinie km", wert: (k) => km(k.umspannwerk?.luftlinieM) },
  { label: "Widmungslage", wert: (k) => k.widmung?.status || "" },
  { label: "Ertrag MWh/a", wert: (k) => k.kennzahlen?.ertragMwh },
  { label: "Pacht min €/a", wert: (k) => k.kennzahlen?.pachtJahr?.min },
  { label: "Pacht max €/a", wert: (k) => k.kennzahlen?.pachtJahr?.max },
  { label: "Längengrad", wert: (k) => k.schwerpunkt?.[0] },
  { label: "Breitengrad", wert: (k) => k.schwerpunkt?.[1] },
];

export const kandidatenCsv = (liste) => csv(SPALTEN, liste);

export function kandidatenGeojson(liste, { quellen = [] } = {}) {
  return {
    type: "FeatureCollection",
    metadata: {
      erzeugt: new Date().toISOString(),
      hinweis: "Vorauswahl ohne Gewähr – Schätzwerte. Keine Eigentümerdaten. Netzknoten: © OpenStreetMap-Mitwirkende (ODbL 1.0, Share-Alike für abgeleitete Datenbanken).",
      quellen: quellen.map((q) => ({ titel: q.titel, lizenz: q.lizenz, attribution: q.attribution, stand: q.stand })),
    },
    features: liste.map((k) => ({
      type: "Feature",
      id: k.id,
      geometry: k.geometrie,
      properties: Object.fromEntries(SPALTEN.filter((s) => !["Längengrad", "Breitengrad"].includes(s.label)).map((s) => [s.label, typeof s.wert === "function" ? s.wert(k) : k[s.wert]])),
    })),
  };
}
