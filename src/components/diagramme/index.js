// src/components/diagramme – Chart-System der Plattform (Design-System 2.0, Abschnitt Datenvisualisierung).
//
// Alle Bausteine: gemessene Breite (Schrift nie skaliert), Achsen ohne Überlappung, Einlauf beim Einscrollen
// (nur transform/opacity bzw. stroke-dashoffset, reduced-motion sicher), Fadenkreuz + Tooltip per Zeiger UND Tastatur,
// Ansage über aria-live, umschaltbare Datentabelle, CSV- und PNG-Export, Farben nur aus ui/datenfarben.js.
// Props sind serialisierbar – Server-Komponenten dürfen die Bausteine direkt verwenden (Formatfunktionen nur im Client).

export { default as LinienDiagramm } from "./LinienDiagramm";
export { default as BalkenDiagramm } from "./BalkenDiagramm";
export { default as HeatmapDiagramm, StufenLegende } from "./HeatmapDiagramm";
export { default as DonutDiagramm } from "./DonutDiagramm";
export { default as WasserfallDiagramm } from "./WasserfallDiagramm";
export { default as EnergieFluss } from "./EnergieFluss";
export { default as Gauge } from "./Gauge";
export { default as Legende, LegendenMarke } from "./Legende";
export { DiagrammRahmen, DatenTabelle, Plot, useBreite } from "./Rahmen";
export { achse, achsenText, wertText, csvAus, linear, linienPfad, flaechenPfad, ausduennen, textBreite } from "./skala";
