// Gemeinsame Beispielrechnung der Seite /kommunen – eine Quelle für Hero, Faktenleiste und Einnahmen-Grafik.
// Die Werte kommen unverändert aus rechneKommune (vereinfachte Modellrechnung, 20 MWp, Süddeutschland).
import { rechneKommune } from "@/lib/rechner/kommune";
import { fmt } from "@/lib/rechner/annahmen";

export const BEISPIEL = rechneKommune({ mwp: 20, paragraph6: true, gemeindeflaeche: false });

/** Euro kompakt: ab 1 Mio. in Mio. €, sonst in T€ */
export const tsd = (v) => (v >= 1e6 ? `${fmt(v / 1e6, 1)} Mio. €` : `${fmt(Math.round(v / 1000))} T€`);
