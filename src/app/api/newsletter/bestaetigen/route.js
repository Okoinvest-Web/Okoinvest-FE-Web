// /api/newsletter/bestaetigen – Double-Opt-in des Newsletters (Welle 3, Paket NL)
//
//   POST { token } → { ok, bereits }   nur über den Knopf der Seite /newsletter/abo/[token] (nie per GET, damit
//                                       Mail-Scanner nicht automatisch bestätigen). 404 unbekannt, 410 abgelaufen.

import { route, basisUrl } from "@/lib/plattform/server/route";
import { bestaetigen } from "@/lib/newsletter/dienst";

export const POST = route({ auth: false, limit: "anfrage", maxBytes: 1024 }, async ({ request, body }) => {
  return bestaetigen({ token: body.token, basisUrl: basisUrl(request) });
});
