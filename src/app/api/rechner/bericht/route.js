// /api/rechner/bericht – Bericht-Baustein (Welle 2, Paket B4)
//
//   GET   → { ok, versand, modus, text }  Darf ein Bericht angefordert werden? (Oberfläche blendet das Formular sonst aus)
//   POST  { rechner, eingaben, land, kontakt: { vorname, nachname, email, telefon? }, einwilligungen?, herkunft?, website? }
//         → { ok, versand, hinweis }   Es entsteht noch KEIN Vorgang und KEIN Bericht (erst nach Double-Opt-in).
//
// Positivliste (4 Rechner), Eingabeprüfung und Neuberechnung: src/lib/bericht/neuRechnen.js – ein mitgeschicktes
// Ergebnis wird ignoriert. Rate-Limit über route() („anfrage“), Honeypot-Feld „website“, Body höchstens 8 KB.
// Personendaten stehen nie in Logs oder Fehlermeldungen dieser Route.

import { route, basisUrl } from "@/lib/plattform/server/route";
import { berichtAnfordern } from "@/lib/bericht/dienst";
import { versandStatus } from "@/lib/bericht/versand";

export const GET = route({ auth: false }, async () => ({ ok: true, ...versandStatus() }));

export const POST = route({ auth: false, limit: "anfrage", maxBytes: 8 * 1024 }, async ({ request, body }) => {
  const { rechner, eingaben, land, kontakt, einwilligungen, herkunft, website } = body; // bewusst nur diese Felder
  return berichtAnfordern({ body: { rechner, eingaben, land, kontakt, einwilligungen, herkunft, website }, basisUrl: basisUrl(request) });
});
