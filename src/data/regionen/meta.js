// src/data/regionen/meta.js
//
// Stammdaten der Regionalseiten /regionen/[slug]: Name, Land, Kürzel, Lage in der
// stilisierten Kachelkarte (Spalte/Zeile), Nachbarregionen, Hero-Bild und die
// Ertragsregion aus src/lib/invest/markt.js (REGIONEN), über die Pacht- und
// Leistungsrechnungen laufen. Die recherchierten Inhalte stehen je Region in
// einer eigenen Datei (siehe index.js).

export const LAENDER = [
  { id: "DE", label: "Deutschland", kurz: "16 Bundesländer" },
  { id: "AT", label: "Österreich", kurz: "9 Bundesländer" },
  { id: "CH", label: "Schweiz", kurz: "Bund und Kantone" },
];

/**
 * karte: { x, y, w? } – Kachel in einem 8 × 7-Raster (w = Breite in Kacheln).
 * Die Anordnung ist bewusst schematisch (Nachbarschaften stimmen grob).
 */
export const META = [
  // Deutschland
  { slug: "schleswig-holstein", name: "Schleswig-Holstein", kurz: "SH", land: "DE", markt: "de-nord", bild: "/img/pv-wind-abend.jpg", karte: { x: 3, y: 0 }, nachbarn: ["hamburg", "mecklenburg-vorpommern", "niedersachsen"] },
  { slug: "bremen", name: "Bremen", kurz: "HB", land: "DE", markt: "de-nord", bild: "/img/module-raster.jpg", karte: { x: 2, y: 1 }, nachbarn: ["niedersachsen", "hamburg"] },
  { slug: "hamburg", name: "Hamburg", kurz: "HH", land: "DE", markt: "de-nord", bild: "/img/module-sonne.jpg", karte: { x: 3, y: 1 }, nachbarn: ["schleswig-holstein", "niedersachsen"] },
  { slug: "mecklenburg-vorpommern", name: "Mecklenburg-Vorpommern", kurz: "MV", land: "DE", markt: "de-nord", bild: "/img/solarpark-himmel.jpg", karte: { x: 4, y: 1 }, nachbarn: ["schleswig-holstein", "brandenburg", "niedersachsen"] },
  { slug: "nordrhein-westfalen", name: "Nordrhein-Westfalen", kurz: "NW", land: "DE", markt: "de-west", bild: "/img/solarpark-baeume.jpg", karte: { x: 1, y: 2 }, nachbarn: ["niedersachsen", "hessen", "rheinland-pfalz"] },
  { slug: "niedersachsen", name: "Niedersachsen", kurz: "NI", land: "DE", markt: "de-nord", bild: "/img/freiflaeche-begehung.jpg", karte: { x: 2, y: 2 }, nachbarn: ["bremen", "hamburg", "schleswig-holstein", "mecklenburg-vorpommern", "sachsen-anhalt", "nordrhein-westfalen", "hessen", "thueringen", "brandenburg"] },
  { slug: "sachsen-anhalt", name: "Sachsen-Anhalt", kurz: "ST", land: "DE", markt: "de-ost", bild: "/img/solarpark-reihen.jpg", karte: { x: 3, y: 2 }, nachbarn: ["niedersachsen", "brandenburg", "sachsen", "thueringen"] },
  { slug: "brandenburg", name: "Brandenburg", kurz: "BB", land: "DE", markt: "de-ost", bild: "/img/montage-freiflaeche.jpg", karte: { x: 4, y: 2 }, nachbarn: ["berlin", "mecklenburg-vorpommern", "sachsen-anhalt", "sachsen", "niedersachsen"] },
  { slug: "berlin", name: "Berlin", kurz: "BE", land: "DE", markt: "de-ost", bild: "/img/gewerbedach.jpg", karte: { x: 5, y: 2 }, nachbarn: ["brandenburg"] },
  { slug: "rheinland-pfalz", name: "Rheinland-Pfalz", kurz: "RP", land: "DE", markt: "de-west", bild: "/img/solarpark-baeume.jpg", karte: { x: 1, y: 3 }, nachbarn: ["nordrhein-westfalen", "hessen", "baden-wuerttemberg", "saarland"] },
  { slug: "hessen", name: "Hessen", kurz: "HE", land: "DE", markt: "de-west", bild: "/img/planer-tablet.jpg", karte: { x: 2, y: 3 }, nachbarn: ["nordrhein-westfalen", "niedersachsen", "thueringen", "bayern", "baden-wuerttemberg", "rheinland-pfalz"] },
  { slug: "thueringen", name: "Thüringen", kurz: "TH", land: "DE", markt: "de-ost", bild: "/img/solarpark-reihen.jpg", karte: { x: 3, y: 3 }, nachbarn: ["sachsen-anhalt", "sachsen", "bayern", "hessen", "niedersachsen"] },
  { slug: "sachsen", name: "Sachsen", kurz: "SN", land: "DE", markt: "de-ost", bild: "/img/floating-pv.jpg", karte: { x: 4, y: 3 }, nachbarn: ["brandenburg", "sachsen-anhalt", "thueringen", "bayern"] },
  { slug: "saarland", name: "Saarland", kurz: "SL", land: "DE", markt: "de-west", bild: "/img/module-sonne.jpg", karte: { x: 1, y: 4 }, nachbarn: ["rheinland-pfalz"] },
  { slug: "baden-wuerttemberg", name: "Baden-Württemberg", kurz: "BW", land: "DE", markt: "de-sued", bild: "/img/solarpark-himmel.jpg", karte: { x: 2, y: 4 }, nachbarn: ["bayern", "hessen", "rheinland-pfalz", "schweiz", "vorarlberg"] },
  { slug: "bayern", name: "Bayern", kurz: "BY", land: "DE", markt: "de-sued", bild: "/img/freiflaeche-begehung.jpg", karte: { x: 3, y: 4, w: 2 }, nachbarn: ["baden-wuerttemberg", "hessen", "thueringen", "sachsen", "oberoesterreich", "salzburg", "tirol", "vorarlberg"] },
  // Österreich
  { slug: "vorarlberg", name: "Vorarlberg", kurz: "V", land: "AT", markt: "at", bild: "/img/module-raster.jpg", karte: { x: 2, y: 5 }, nachbarn: ["tirol", "schweiz", "bayern", "baden-wuerttemberg"] },
  { slug: "tirol", name: "Tirol", kurz: "T", land: "AT", markt: "at", bild: "/img/techniker.jpg", karte: { x: 3, y: 5 }, nachbarn: ["vorarlberg", "salzburg", "kaernten", "bayern", "schweiz"] },
  { slug: "salzburg", name: "Salzburg", kurz: "S", land: "AT", markt: "at", bild: "/img/montage-freiflaeche.jpg", karte: { x: 4, y: 5 }, nachbarn: ["oberoesterreich", "steiermark", "kaernten", "tirol", "bayern"] },
  { slug: "oberoesterreich", name: "Oberösterreich", kurz: "OÖ", land: "AT", markt: "at", bild: "/img/investoren-vor-ort.jpg", karte: { x: 5, y: 5 }, nachbarn: ["niederoesterreich", "steiermark", "salzburg", "bayern"] },
  { slug: "niederoesterreich", name: "Niederösterreich", kurz: "NÖ", land: "AT", markt: "at", bild: "/img/solarpark-reihen.jpg", karte: { x: 6, y: 5 }, nachbarn: ["wien", "burgenland", "steiermark", "oberoesterreich"] },
  { slug: "wien", name: "Wien", kurz: "W", land: "AT", markt: "at", bild: "/img/gewerbedach.jpg", karte: { x: 7, y: 5 }, nachbarn: ["niederoesterreich", "burgenland"] },
  { slug: "kaernten", name: "Kärnten", kurz: "K", land: "AT", markt: "at", bild: "/img/solarpark-baeume.jpg", karte: { x: 4, y: 6 }, nachbarn: ["steiermark", "salzburg", "tirol"] },
  { slug: "steiermark", name: "Steiermark", kurz: "St", land: "AT", markt: "at", bild: "/img/freiflaeche-begehung.jpg", karte: { x: 5, y: 6 }, nachbarn: ["kaernten", "burgenland", "niederoesterreich", "oberoesterreich", "salzburg"] },
  { slug: "burgenland", name: "Burgenland", kurz: "B", land: "AT", markt: "at", bild: "/img/pv-wind-abend.jpg", karte: { x: 6, y: 6 }, nachbarn: ["niederoesterreich", "steiermark", "wien"] },
  // Schweiz
  { slug: "schweiz", name: "Schweiz", kurz: "CH", land: "CH", markt: "ch", bild: "/img/solarpark-himmel.jpg", karte: { x: 0, y: 5, w: 2 }, nachbarn: ["baden-wuerttemberg", "vorarlberg", "tirol"] },
];

export const metaFuer = (slug) => META.find((m) => m.slug === slug);
