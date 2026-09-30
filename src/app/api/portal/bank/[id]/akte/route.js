// GET  /api/portal/bank/[id]/akte – Bank-Akte der eigenen Anfrage: Anforderungen, Q&A, Zuständigkeit, Kreditentscheidung, CPs,
//      Auszahlungen, Covenant-Stand, Berichte (fremde Bank → 403)
// POST /api/portal/bank/[id]/akte – { aktion: anforderung {punkte[]} | anforderung_pruefen {anforderungId,ergebnis,kommentar,frist}
//      | frage {frage,kategorie} | zustaendig {nutzerId} | kreditentscheidung {entscheidung} | cp_bestaetigen {cpId,status,kommentar}
//      | auszahlung_entscheiden {auszahlungId,ergebnis,valuta,kommentar} | bericht_anfordern {art,periode,faelligAm}
//      | bericht_pruefen {berichtId,ergebnis,kommentar} } – Teamrolle je Aktion (Nur lesen / Sachbearbeitung / Leitung)
import { route } from "@/lib/plattform/server/route";
import { bankakteBackend } from "@/lib/plattform/backend/bankakte";

export const GET = route({ rollen: ["bank"] }, async ({ nutzer, params }) => ({ ok: true, akte: await bankakteBackend().baAkte(nutzer, params.id) }));

export const POST = route({ rollen: ["bank"] }, async ({ nutzer, params, body }) => bankakteBackend().baAktion(nutzer, params.id, body));
