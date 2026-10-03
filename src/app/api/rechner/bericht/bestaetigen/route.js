// /api/rechner/bericht/bestaetigen – Double-Opt-in des Berichts (Welle 2, Paket B4)
//
//   POST { token } → { ok, bereits }   nur über den Knopf der Bestätigungsseite /bericht/[token] (nie per GET,
//                                       damit Mail-Scanner nicht automatisch bestätigen). 404 unbekannt, 410 abgelaufen.
//   GET  ?token=…  → { ok, zustand }    nur der Zustand, ändert nichts (410 bei Ablauf, 404 unbekannt)
//
// Erst die Bestätigung schreibt den Ketteneintrag art "doi" und legt den Vorgang an (src/lib/bericht/dienst.js).

import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { berichtBestaetigen, berichtLesen } from "@/lib/bericht/dienst";

export const POST = route({ auth: false, limit: "anfrage", maxBytes: 1024 }, async ({ body, ip }) => {
  return berichtBestaetigen({ token: body.token, ip });
});

export const GET = route({ auth: false }, async ({ suche }) => {
  const r = await berichtLesen({ token: suche.get("token") || "" });
  if (!r.zustand) throw new PlattformFehler(404, "Dieser Link ist ungültig.", "nicht_gefunden");
  if (r.zustand === "abgelaufen") throw new PlattformFehler(410, "Dieser Link ist abgelaufen.", "abgelaufen");
  return { ok: true, zustand: r.zustand };
});
