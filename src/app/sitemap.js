// src/app/sitemap.js
//
// Sitemap der ÖkoInvest-Website unter /sitemap.xml (wie vor Welle 2), Ländermodell:
//  - jede indexierbare gemeinsame Seite aus dem Register (src/lib/land/seiten.js), ohne Entwürfe
//    (ENTWURFSSEITEN in src/lib/indexsteuerung.js), mit Regionsseiten,
//  - dazu jede Länderfassung (/de, /at, /ch) mit ECHTEM eigenem Länderinhalt (LAENDERINHALT),
//    jeweils mit hreflang-Cluster (src/lib/land/sitemaps.js) – Länderfassungen ohne eigenen
//    Inhalt tragen noindex und fehlen hier,
//  - die übersetzten englischen Fassungen (/en/…, Register src/lib/sprache/seiten.js) mit demselben
//    hreflang-Cluster, alle Ratgeber-Artikel und, sofern das Plattform-Backend verfügbar
//    ist, die öffentlichen Exposés der Projektbörse.
//
// Portal, Login/Registrierung, /angebot, /einladung, /termin/verwalten, /bericht, /p und die
// Entwürfe unter /bedingungen gehören nicht in die Sitemap bzw. sind über robots.txt gesperrt.

import { alleArtikel, artikelPfad } from "@/lib/ratgeber";
import { LEXIKON_STAND } from "@/data/lexikon";
import { abs } from "@/data/site";
import { sichtbareProjekte } from "@/lib/boerse/sichtbarkeit";
import { START, SPRACHMODELL, seitenEintraege } from "@/lib/land/sitemaps";
import { fassungIndexierbar, hreflang, seitenPfad } from "@/lib/land/pfad";

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
    // QM Welle 1: Test- und Demo-Datensätze nie in die Sitemap (src/lib/boerse/sichtbarkeit.js)
    return sichtbareProjekte(liste, { demo: false })
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
  const seiten = seitenEintraege({ lexikonStand: LEXIKON_STAND });
  // Ratgeber-Artikel; einzeln übersetzte (UEBERSETZT_EINZELN) zusätzlich unter /en mit hreflang-Cluster
  const ratgeber = alleArtikel().flatMap((a) => {
    const pfad = artikelPfad(a.slug);
    const basis = { lastModified: new Date(a.aktualisiert), changeFrequency: "monthly", priority: 0.7 };
    if (!fassungIndexierbar(pfad, null, "en")) return [{ url: abs(pfad), ...basis }];
    const alternates = { languages: hreflang(pfad) };
    return [
      { url: abs(pfad), ...basis, alternates },
      { url: abs(seitenPfad(pfad, null, "en")), ...basis, lastModified: SPRACHMODELL, alternates },
    ];
  });
  return [...seiten, ...ratgeber, ...(await projektEintraege())];
}
