// /api/newsletter – Newsletter je Land (Welle 3, Paket NL)
//
//   GET   → { ok, aktiv, modus }   Nimmt der Newsletter Anmeldungen an? (Baustein blendet das Formular sonst aus)
//   POST  { email, land, themen[], sprache?, quelle?, herkunft?, website? } → { ok, hinweis }
//         Es entsteht nur eine OFFENE Anmeldung (Double-Opt-in, src/lib/newsletter/dienst.js). Antwort immer gleich.
//
// Rate-Limit über route() („anfrage“), Honeypot „website“, Body höchstens 4 KB. Personendaten nie in Logs/Fehlern.

import { route, basisUrl } from "@/lib/plattform/server/route";
import { anmelden } from "@/lib/newsletter/dienst";
import { newsletterStatus } from "@/lib/newsletter/versand";

export const GET = route({ auth: false }, async () => ({ ok: true, ...newsletterStatus() }));

export const POST = route({ auth: false, limit: "anfrage", maxBytes: 4 * 1024 }, async ({ request, body }) => {
  const { email, land, themen, sprache, quelle, herkunft, website } = body; // bewusst nur diese Felder
  return anmelden({ body: { email, land, themen, sprache, quelle, herkunft, website }, basisUrl: basisUrl(request) });
});
