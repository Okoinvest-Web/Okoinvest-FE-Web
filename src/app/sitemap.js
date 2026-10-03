// src/app/sitemap.js
//
// Sitemaps der ÖkoInvest-Website (Welle 2, Länderrouting): eine je Länderzone und eine für den
// neutralen Stamm – /sitemap/stamm.xml, /sitemap/de.xml, /sitemap/at.xml, /sitemap/ch.xml.
// robots.txt verweist auf alle vier (src/app/robots.js).
//
//  - Länderzonen: nur freigegebene, indexierbare Seiten mit Inhalt (src/lib/land/stufen.js),
//    je Eintrag mit hreflang-Cluster (src/lib/land/sitemaps.js).
//  - Stamm: Startseite, Projektbörse, Investoren, Unternehmen, Wissen (Ratgeber, Lexikon), EN,
//    Kontakt, Rechtstexte – ohne Entwürfe (ENTWURFSSEITEN in src/lib/indexsteuerung.js) – sowie
//    alle Ratgeber-Artikel und, sofern das Plattform-Backend verfügbar ist, die öffentlichen
//    Exposés der Projektbörse.
//
// Portal, Login/Registrierung, /angebot, /einladung, /termin/verwalten, /bericht, /p und die
// Entwürfe unter /bedingungen gehören nicht in die Sitemap bzw. sind über robots.txt gesperrt.
// Seiten „in Vorbereitung“ und noindex-Seiten (z. B. /de/marktdaten/fristen) bleiben draußen.

import { alleArtikel, artikelPfad } from "@/lib/ratgeber";
import { LEXIKON_STAND } from "@/data/lexikon";
import { abs } from "@/data/site";
import { sichtbareProjekte } from "@/lib/boerse/sichtbarkeit";
import { ohneEntwuerfe } from "@/lib/indexsteuerung";
import { landAusPraefix } from "@/lib/land";
import { SITEMAP_IDS, START, STAMM_SEITEN, landEintraege } from "@/lib/land/sitemaps";

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

async function stammEintraege() {
  const seiten = ohneEntwuerfe(STAMM_SEITEN).map(({ pfad, prio, freq, datum, lexikon }) => ({
    url: abs(pfad),
    lastModified: lexikon ? new Date(LEXIKON_STAND) : datum || START,
    changeFrequency: freq,
    priority: prio,
  }));
  const ratgeber = alleArtikel().map((a) => ({
    url: abs(artikelPfad(a.slug)),
    lastModified: new Date(a.aktualisiert),
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  return [...seiten, ...ratgeber, ...(await projektEintraege())];
}

export async function generateSitemaps() {
  return SITEMAP_IDS.map((id) => ({ id }));
}

export default async function sitemap(props) {
  const id = String(await props?.id);
  if (id === "stamm") return stammEintraege();
  const land = landAusPraefix(id);
  return land ? landEintraege(land) : [];
}
