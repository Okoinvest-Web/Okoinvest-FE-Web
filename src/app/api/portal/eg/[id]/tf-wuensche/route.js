// /api/portal/eg/[id]/tf-wuensche – Teilnahmefaktor-Wünsche der Mitglieder einer Gemeinschaft (Integration WP6 → WP2)
// GET  → { wuensche (Liste: id, teilnahmeId, mitgliedName, zaehlpunktnummer, von, nach, ab, ok, fehler), darfAusloesen, ab }
//        (Recht mitgliederliste ≥ 1: Organe und Backoffice-Pflege)
// POST { wunschIds[], entscheidung: "melden"|"ablehnen", ab?, grund? } → { gemeldet, abgelehnt, fehler[], prozesse[], freigabeNoetig }
//      (Recht eda_ausloesen 2; „melden“ erzeugt EC_PRTFACT_CHG über edaTfAendern – eine Änderung pro Tag, Σ TF ≤ 100 %)
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, ...(await egBackend().ptTfWuensche(nutzer, params.id)) }));

export const POST = route({}, async ({ nutzer, params, body }) => ({
  ok: true,
  ...(await egBackend().ptTfWunschUmsetzen(nutzer, params.id, { wunschIds: Array.isArray(body.wunschIds) ? body.wunschIds : [], entscheidung: String(body.entscheidung || "melden"), ab: String(body.ab || ""), grund: String(body.grund || "") })),
}));
