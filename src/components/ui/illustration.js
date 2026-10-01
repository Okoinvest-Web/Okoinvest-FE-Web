// Grundlagen für Marken-Illustrationen (Team T7, siehe docs/DESIGN.md „Illustrationsstil“).
// Isometrie 30°, flache Flächen in drei Helligkeiten je Körper (oben hell,
// links mittel, rechts dunkel), 1,5-px-Konturen in Navy, keine Verläufe
// außer Himmel/Schein, keine Personen mit Gesichtern.

/** Illustrations-Palette (nur Markenskalen). */
export const ILLU = {
  // Körper grün (Vegetation, Agri-PV, Marke)
  gruenOben: "#cde3b1",
  gruenLinks: "#8cba58",
  gruenRechts: "#669933",
  gruenTief: "#436621",
  // Module / Technik (Navy)
  modulOben: "#1f5aa1",
  modulLinks: "#0b4488",
  modulRechts: "#003473",
  modulGlanz: "#7fa7d6",
  // Gebäude, Gestelle, Wege (neutral)
  hellOben: "#ffffff",
  hellLinks: "#eef0f4",
  hellRechts: "#dfe3ea",
  // Boden, Papier
  boden: "#f5f3ea",
  bodenDunkel: "#ebe7d8",
  // Akzente
  sonne: "#ffc53d",
  sonneHell: "#ffd873",
  strom: "#669933", // Energiefluss-Linien
  kontur: "#03285a",
  // Auf Navy-Grund
  nachtKontur: "rgba(255,255,255,0.18)",
};

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

/**
 * Isometrische Projektion: Raumkoordinaten (x nach rechts-vorn, y nach
 * links-vorn, z nach oben) → SVG-Punkt. einheit = Pixel je Raumeinheit.
 */
export function iso(x, y, z = 0, einheit = 10, ursprung = [0, 0]) {
  return [ursprung[0] + (x - y) * COS30 * einheit, ursprung[1] + (x + y) * SIN30 * einheit - z * einheit];
}

/** Punkteliste → SVG-points-String. */
export function punkte(liste) {
  return liste.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
}

/**
 * Quader in Isometrie als drei Polygone (oben, links, rechts).
 * Rückgabe: { oben, links, rechts } als points-Strings.
 */
export function quader(x, y, z, b, t, h, einheit = 10, ursprung = [0, 0]) {
  const p = (a, c, d) => iso(a, c, d, einheit, ursprung);
  return {
    oben: punkte([p(x, y, z + h), p(x + b, y, z + h), p(x + b, y + t, z + h), p(x, y + t, z + h)]),
    links: punkte([p(x, y + t, z), p(x + b, y + t, z), p(x + b, y + t, z + h), p(x, y + t, z + h)]),
    rechts: punkte([p(x + b, y, z), p(x + b, y + t, z), p(x + b, y + t, z + h), p(x + b, y, z + h)]),
  };
}
