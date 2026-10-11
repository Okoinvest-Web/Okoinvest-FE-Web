import { istIndexierbar } from "./src/lib/indexsteuerung.js";
import { UMZUG } from "./src/lib/land/umzug.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ausgabeverzeichnis umschaltbar (wie oekovolt.de): Build-Verifikation läuft
  // mit NEXT_DIST_DIR=.next-verify neben einem laufenden Server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  trailingSlash: false,
  compress: true,
  poweredByHeader: false,

  // SEO-Finale (TEMPO): AVIF zusätzlich zu WebP anbieten – bei Fotos (Heros, Ratgeber)
  // typischerweise 20–40 % kleinere Dateien bei gleicher Qualität. Browser ohne
  // AVIF-Unterstützung erhalten weiter WebP/JPEG (Aushandlung über den Accept-Header).
  images: { formats: ["image/avif", "image/webp"] },

  // Ländermodell: Welle-2-Adressen (/wissen/ratgeber, CH-Platzhalter) → 308 ohne Ketten
  // (Tabelle und Tests: src/lib/land/umzug.js). Keine IP-/Geo-Weiterleitung; die Weiterleitung
  // von „/“ auf das gewählte Land (nur mit Cookie) macht die Middleware.
  async redirects() {
    return UMZUG.map(({ source, destination, permanent }) => ({ source, destination, permanent }));
  },

  // Mehrere Root-Layouts (gemeinsam, Länderfassungen /de /at /ch, EN – <html lang> je Land): globale 404-Seite
  // für Pfade außerhalb aller Layouts (src/app/global-not-found.js).
  experimental: { globalNotFound: true },

  // Sicherheits-Kopfzeilen (Paket A, Masterplan S0 Nr. 8). Die Middleware setzt für Portal/Login/
  // Einladung/Auth-APIs zusätzlich strengere Werte (frame-ancestors 'none', DENY); Browser wenden bei
  // mehreren CSP-Kopfzeilen alle an, es gilt also jeweils die strengere.
  async headers() {
    const produktion = process.env.NODE_ENV === "production";
    const indexierbar = istIndexierbar({
      nodeEnv: process.env.NODE_ENV,
      siteEnv: process.env.NEXT_PUBLIC_SITE_ENV,
      siteUrl: String(process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/[/]+$/, ""),
    });

    // 1) Erzwungene Basis-CSP: bricht nichts (keine <object>/<embed>, kein fremdes <base>, Einbettung
    //    nur durch die eigene Seite). upgrade-insecure-requests nur in Produktion (lokal läuft http).
    const basisCsp = ["object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'", ...(produktion ? ["upgrade-insecure-requests"] : [])].join("; ");

    // 2) Ziel-CSP nur als Report-Only (Verstöße erscheinen in der Browser-Konsole, nichts wird blockiert).
    //    Erst nach 2–4 Wochen ohne unerwartete Verstöße scharf schalten; danach mit Nonce statt
    //    'unsafe-inline' (braucht Middleware, Welle 2). Fremde Ziele:
    //    - GA4 (nur nach Einwilligung): www.googletagmanager.com, *.google-analytics.com,
    //      *.analytics.google.com – laut Google-Doku „Use a Content Security Policy“ (GA4), zu prüfen
    //    - Kartenkacheln: mapsneu.wien.gv.at (basemap.at), sgx.geodatenzentrum.de (TopPlusOpen)
    //    'unsafe-eval' nur in der Entwicklung (React-Refresh/Turbopack).
    //    Kein report-uri: Ein Report-Endpunkt speichert IP/URL – Zweck und Frist erst mit Strang R klären.
    const ga = "https://www.googletagmanager.com";
    const gaDaten = "https://*.google-analytics.com https://*.analytics.google.com";
    const karten = "https://mapsneu.wien.gv.at https://sgx.geodatenzentrum.de";
    const zielCsp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${produktion ? "" : " 'unsafe-eval'"} ${ga}`,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: ${ga} ${gaDaten} ${karten}`,
      "font-src 'self' data:",
      `connect-src 'self' ${ga} ${gaDaten}${produktion ? "" : " ws: wss:"}`,
      // 'self' statt 'none': /partner/widgets zeigt die eigenen Embed-Routen /widgets/<name> als Live-Vorschau im iframe (Paket WIDGETS)
      "frame-src 'self'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join("; ");

    const sicherheit = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
      { key: "Content-Security-Policy", value: basisCsp },
      { key: "Content-Security-Policy-Report-Only", value: zielCsp },
      // HSTS global, nur in Produktion (lokal http). Ohne "preload": Eine Preload-Anmeldung erst,
      // wenn alle Subdomains von oekoinvest.com HTTPS können (sonst schwer rückgängig zu machen).
      ...(produktion ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
      // QM Welle 1 (Empfehlung Paket I): außerhalb der echten Produktion auch PDFs, Bilder und APIs auf noindex
      ...(indexierbar ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
    ];
    // Partner-Widgets (Welle 4, Paket WIDGETS): /widgets/<name> wird von Partnern per <iframe>
    // eingebettet. Die Embed-Routen setzen ihre EIGENE CSP (frame-ancestors konfigurierbar über
    // WIDGET_FRAME_ANCESTORS, Standard *; src/lib/widgets/register.js → widgetKopfzeilen) – deshalb
    // nimmt der globale Block sie aus (mehrere CSP-Kopfzeilen würden sonst auf 'self' verschärfen,
    // X-Frame-Options: SAMEORIGIN würde das Einbetten blockieren). Alle übrigen Schutz-Kopfzeilen
    // bekommen die Widgets hier bzw. in der Route weiterhin.
    const widgets = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ...(produktion ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
    ];
    return [
      { source: "/((?!widgets/).*)", headers: sicherheit },
      { source: "/widgets/:path*", headers: widgets },
      // Portal und Login nie in Suchmaschinen, nie zwischenspeichern
      { source: "/portal/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "no-store" }] },
      ...["/login", "/registrieren", "/passwort-vergessen"].map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }] })),
    ];
  },
};

export default nextConfig;
