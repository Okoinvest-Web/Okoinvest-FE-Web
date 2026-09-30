// GET  /api/portal/dienste/eid – verfügbare eID-Verfahren (ID Austria, Online-Ausweis; ggf. DEMO), eigene Vorgänge, Nachweis
// POST /api/portal/dienste/eid – { methode: id_austria | online_ausweis } → { vorgang, url } (Weiterleitung zum Aussteller)
//      Setzt die Browser-Bindung des Vorgangs als HttpOnly-Cookie (nur für den Rücksprung-Pfad, 15 min) – nie im Body/URL.
import { antwort, basisUrl, route } from "@/lib/plattform/server/route";
import { eidBackend } from "@/lib/plattform/backend/eid";
import { EID_BINDUNG_COOKIE, EID_REDIRECT_PFAD } from "@/lib/plattform/dienste/eid/methoden";

export const GET = route({}, async ({ nutzer }) => ({ ok: true, ...(await eidBackend().eidStatus(nutzer)) }));

export const POST = route({}, async ({ nutzer, request, body }) => {
  const { bindung, ...rest } = await eidBackend().eidStarten(nutzer, { methode: body.methode, basisUrl: basisUrl(request) });
  const res = antwort({ ok: true, ...rest });
  res.cookies.set(EID_BINDUNG_COOKIE, bindung, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: EID_REDIRECT_PFAD, maxAge: 15 * 60 });
  return res;
});
