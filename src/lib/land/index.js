// src/lib/land – einzige Quelle für Länder, Pfade, Länderinhalte, canonical/hreflang und
// Länderwahl (Ländermodell nach Vorgabe des Inhabers: EINE Website, Land als Kontext).
//
//   laender.js   Ländercodes, Präfixe, Sprache, Währung
//   seiten.js    Register: öffentliche Seiten, echter Länderinhalt je Land (index/noindex)
//   pfad.js      pfad(), landAusPfad(), entsprechung(), alternates(), hreflang()
//   inhalte.js   inhaltFuer(), zahlenModus() – Schnittstelle für die Inhalts-Teams
//   vorschlag.js Cookie „land“ (nur nach aktiver Wahl)
//   umzug.js     308-Weiterleitungen der Welle-2-Adressen (next.config.mjs)
//   sitemaps.js  Sitemap-Einträge
//   seite.js     Server: seitenLand(params), landDerAnfrage(), seitenMetadata() – nicht hier
//                exportiert (nutzt react/cache und next/navigation)
export * from "./laender.js";
export * from "./zonen.js";
export * from "./seiten.js";
export * from "./pfad.js";
export * from "./inhalte.js";
export * from "./vorschlag.js";
export * from "./schreibweise.js";
