// GET  /api/portal/eg/[id]/abrechnung/zahlungen/[zid] – Zahlungsdatei (XML), erst nach Freigabe durch eine zweite Person
// POST … – { aktion: freigeben | eingereicht | verwerfen }
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({}, async ({ nutzer, params }) => {
  const d = await egBackend().abZahlungslaufAktion(nutzer, params.zid, { aktion: "datei" });
  if (!d?.inhalt) throw new PlattformFehler(404, "Datei nicht gefunden.");
  const name = String(d.dateiname || "zahlung.xml").replace(/\W+/g, "_").replace(/_xml$/, ".xml");
  return new Response(d.inhalt, { headers: { "Content-Type": "application/xml; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});

export const POST = route({}, async ({ nutzer, params, body }) => ({ ok: true, ...(await egBackend().abZahlungslaufAktion(nutzer, params.zid, { aktion: body?.aktion })) }));
