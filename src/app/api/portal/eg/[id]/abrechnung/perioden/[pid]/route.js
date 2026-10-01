// GET  /api/portal/eg/[id]/abrechnung/perioden/[pid] – Periode mit Vorschau, Prüfungen und Belegen
// POST … – { aktion: vorschau | freigeben {fingerabdruck} | versenden | abschliessen | stornieren {grund} | beleg_stornieren {belegId, grund, korrektur} | verwerfen | vergleich {csv} }
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";
import { PlattformFehler } from "@/lib/plattform/fehler";

const AKTIONEN = ["vorschau", "freigeben", "versenden", "abschliessen", "stornieren", "beleg_stornieren", "verwerfen", "vergleich"];

async function periodeDerGemeinschaft(nutzer, params) {
  const r = await egBackend().abPeriodeAktion(nutzer, params.pid, { aktion: "lesen" });
  if (r.periode.gemeinschaftId !== params.id) throw new PlattformFehler(404, "Periode nicht gefunden.");
  return r;
}

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, ...(await periodeDerGemeinschaft(nutzer, params)) }));

export const POST = route({ maxBytes: 512 * 1024 }, async ({ nutzer, params, body }) => {
  if (!AKTIONEN.includes(body?.aktion)) throw new PlattformFehler(422, "Unbekannte Aktion.");
  await periodeDerGemeinschaft(nutzer, params);
  return { ok: true, ...(await egBackend().abPeriodeAktion(nutzer, params.pid, body)) };
});
