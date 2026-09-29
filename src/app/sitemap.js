// src/app/sitemap.js
//
// Sitemap der ÖkoInvest-Website: alle öffentlichen Routen der Seitenlandkarte
// (docs/BRIEFING.md), alle Ratgeber-Artikel aus dem Register und – sofern das
// Plattform-Backend verfügbar ist – die öffentlichen Exposés der Projektbörse.
//
// lastModified bewusst mit festen Daten statt `new Date()`: sonst meldet jeder
// Build Google, sämtliche Seiten hätten sich geändert. Datum nur anfassen,
// wenn sich der INHALT der Seite wirklich ändert.
//
// Portal, Login/Registrierung und /projektboerse/anbieten (Formular) gehören
// nicht in die Sitemap bzw. sind über robots.txt gesperrt.

import { alleArtikel, artikelPfad } from "@/lib/ratgeber";
import { LEXIKON_STAND } from "@/data/lexikon";
import { abs } from "@/data/site";

const START = new Date("2026-09-29"); // Relaunch ÖkoInvest
const RECHT = new Date("2026-09-29"); // letzte Überarbeitung der Rechtstexte

const SEITEN = [
  // Startseite & Leistungen
  { pfad: "/", prio: 1.0, freq: "weekly" },
  { pfad: "/freiflaeche", prio: 0.9, freq: "monthly" },
  { pfad: "/agri-pv", prio: 0.9, freq: "monthly" },
  { pfad: "/solarcarport", prio: 0.8, freq: "monthly" },
  { pfad: "/grossspeicher", prio: 0.8, freq: "monthly" },
  { pfad: "/prozess", prio: 0.7, freq: "monthly" },
  // Zielgruppen
  { pfad: "/flaeche-verpachten", prio: 0.9, freq: "monthly" },
  { pfad: "/landwirte", prio: 0.8, freq: "monthly" },
  { pfad: "/investoren", prio: 0.9, freq: "monthly" },
  { pfad: "/kommunen", prio: 0.8, freq: "monthly" },
  // Projektbörse
  { pfad: "/projektboerse", prio: 0.9, freq: "daily" },
  { pfad: "/projektboerse/anbieten", prio: 0.7, freq: "monthly" },
  // Strom & Gemeinschaft
  { pfad: "/virtuelles-kraftwerk", prio: 0.8, freq: "monthly" },
  { pfad: "/reststrom", prio: 0.8, freq: "monthly" },
  { pfad: "/energiegemeinschaften", prio: 0.8, freq: "monthly" },
  { pfad: "/genossenschaft", prio: 0.7, freq: "monthly" },
  { pfad: "/energie-live", prio: 0.7, freq: "hourly" },
  // Rechner & Werkzeuge
  { pfad: "/rechner", prio: 0.8, freq: "monthly" },
  { pfad: "/flaechencheck", prio: 0.9, freq: "monthly" },
  { pfad: "/rechner/pacht", prio: 0.8, freq: "monthly" },
  { pfad: "/rechner/agri-pv", prio: 0.8, freq: "monthly" },
  { pfad: "/rechner/solarpark", prio: 0.8, freq: "monthly" },
  { pfad: "/rechner/projektbewertung", prio: 0.8, freq: "monthly" },
  { pfad: "/rechner/reststrom", prio: 0.7, freq: "monthly" },
  { pfad: "/rechner/solarcarport", prio: 0.7, freq: "monthly" },
  { pfad: "/rechner/kommune", prio: 0.7, freq: "monthly" },
  // Wissen
  { pfad: "/ratgeber", prio: 0.8, freq: "weekly" },
  { pfad: "/wissen/lexikon", prio: 0.7, freq: "monthly", datum: new Date(LEXIKON_STAND) },
  { pfad: "/faq", prio: 0.6, freq: "monthly" },
  // Unternehmen & Kontakt
  { pfad: "/unternehmen", prio: 0.6, freq: "monthly" },
  { pfad: "/kontakt", prio: 0.6, freq: "yearly" },
  // Rechtstexte
  { pfad: "/impressum", prio: 0.2, freq: "yearly", datum: RECHT },
  { pfad: "/datenschutz", prio: 0.2, freq: "yearly", datum: RECHT },
  { pfad: "/nutzungsbedingungen", prio: 0.3, freq: "yearly", datum: RECHT },
  { pfad: "/barrierefreiheit", prio: 0.2, freq: "yearly", datum: RECHT },
];

/**
 * Öffentliche Exposés der Projektbörse aus dem Plattform-Backend
 * (src/lib/plattform/backend: backend().boerse(null, filter) -> { projekte, demo }).
 * Fehlt das Backend, ist es nicht konfiguriert (HTTP 503) oder antwortet es
 * nicht, bleibt die Sitemap trotzdem vollständig – nur ohne Projektseiten.
 * Demo-Daten landen bewusst nie in der Sitemap.
 */
async function projektEintraege() {
  try {
    const modul = await import("@/lib/plattform/backend");
    const impl = typeof modul.backend === "function" ? modul.backend() : modul;
    if (typeof impl?.boerse !== "function") return [];
    const antwort = await Promise.race([
      impl.boerse(null, {}),
      new Promise((_, nein) => setTimeout(() => nein(new Error("Zeitüberschreitung")), 5000)),
    ]);
    if (antwort?.demo) return [];
    const liste = Array.isArray(antwort) ? antwort : antwort?.projekte || [];
    return liste
      .filter((p) => p && typeof p.slug === "string" && /^[a-z0-9-]+$/.test(p.slug))
      .map((p) => {
        const d = new Date(p.geaendertAm || p.aktualisiert || p.veroeffentlichtAm || p.modified || START);
        return {
          url: abs(`/projektboerse/${p.slug}`),
          lastModified: Number.isNaN(d.getTime()) ? START : d,
          changeFrequency: "weekly",
          priority: 0.6,
        };
      });
  } catch {
    return [];
  }
}

export default async function sitemap() {
  const seiten = SEITEN.map(({ pfad, prio, freq, datum }) => ({
    url: abs(pfad),
    lastModified: datum || START,
    changeFrequency: freq,
    priority: prio,
  }));

  const ratgeber = alleArtikel().map((a) => ({
    url: abs(artikelPfad(a.slug)),
    lastModified: new Date(a.aktualisiert),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const projekte = await projektEintraege();

  return [...seiten, ...ratgeber, ...projekte];
}
