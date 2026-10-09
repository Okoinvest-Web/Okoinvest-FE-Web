// src/app/robots.js – robots.txt der ÖkoInvest-Website
//
// Regeln stehen in src/lib/indexsteuerung.js (robotsRegeln, getestet in
// src/lib/indexsteuerung.test.mjs). Kurzfassung nach Entscheidung E5:
//
//  - Alle Crawler ("*"), darunter Googlebot, Bingbot und die Such- und Abruf-
//    crawler der KI-Dienste (OAI-SearchBot, ChatGPT-User, PerplexityBot,
//    Claude-SearchBot, Claude-User): öffentliche Seiten erlaubt; /api/,
//    /portal, /einladung/ und /angebot/ gesperrt.
//  - GPTBot und Google-Extended: nur öffentliche Wissensseiten (Ratgeber,
//    Lexikon, Regionen, FAQ, Marktdaten, llms.txt).
//  - CCBot, Bytespider (E5) sowie Meta-ExternalAgent und cohere-ai
//    (Bestandssperre, von E5 nicht erfasst): vollständig gesperrt.
//
// Anmeldung, Registrierung, Passwort-Reset, Styleguide und Entwürfe sind
// bewusst NICHT gesperrt: Sie tragen <meta name="robots" content="noindex">,
// und Suchmaschinen müssen die Seite abrufen dürfen, um das noindex zu sehen.
//
// Nicht-Produktion (Staging, Vorschau, lokaler Build): "Disallow: /" für alle,
// ohne Sitemap-Verweis. Domain kommt aus SITE.url (NEXT_PUBLIC_SITE_URL).

import { INDEXIERBAR, SITE } from "@/data/site";
import { robotsRegeln } from "@/lib/indexsteuerung";

export default function robots() {
  return robotsRegeln({ indexierbar: INDEXIERBAR, siteUrl: SITE.url });
}
