// GET  /api/admin/eg/simulation[?gemeinschaft=…] – gespeicherte Simulationen (WP3; ohne Gemeinschaft: Backoffice „eg“)
//      ?gemeinschaft=…&vorlage=1 – Vorlage aus einer Gemeinschaft (Mitglieder, gemessener Jahresverbrauch, Anlagen)
// POST /api/admin/eg/simulation – { daten: {…Eingabe, gemeinschaftId?, speichern?} } → Ergebnis (Simulation 4.7)
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => {
  const b = egBackend();
  const gemeinschaftId = suche.get("gemeinschaft") || "";
  if (suche.get("vorlage")) return { ok: true, ...(await b.enSimulation(nutzer, { daten: { gemeinschaftId, nurVorlage: true } })) };
  return { ok: true, ...(await b.enSimulationen(nutzer, { gemeinschaftId })) };
});

export const POST = route({ admin: true, maxBytes: 4_000_000 }, async ({ nutzer, body }) => ({ ok: true, ergebnis: await egBackend().enSimulation(nutzer, { daten: body.daten || {} }) }));
