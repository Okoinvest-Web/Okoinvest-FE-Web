// GET  /api/admin/eg/[id] – Gemeinschaft mit Organen, Mitgliedern, Zählpunkten, Teilnahmen, Anlagen, Tarifen, Rechten
//      /api/admin/eg/[id]?export=mitglieder|zaehlpunkte – CSV (BOM, Semikolon, Formelschutz; protokolliert)
// POST /api/admin/eg/[id] – { aktion, … } (Bereich „eg“ schreiben; Kontext-Rechte prüft das Backend):
//   speichern {daten} · status {nach, grund?, nachfolgerId?} · organ {id?, daten} · organ_beenden {id, bis}
//   mitglied {id?, daten} · mitglied_status {id, nach, grund?, zum?} · zaehlpunkt {id?, daten} · teilnahme {id?, daten}
//   teilnahme_uebergang {id, ereignis, datum?, grund} (dokumentierte Korrektur) · anlage {id?, daten} · tarif {id?, daten}
//   verteilschluessel {id?, daten} · massen {massenaktion, ids, werte} · csv_import {csv, ausfuehren}
// Unterpfade gehören anderen Paketen (…/eda WP2, …/energiedaten WP3, …/abrechnung WP4 …).
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { csvAntwort, egAktion } from "@/lib/plattform/server/eg-aktion";

export const GET = route({ admin: true }, async ({ nutzer, params, suche }) => {
  const b = egBackend();
  const art = suche.get("export");
  if (art) {
    if (!["mitglieder", "zaehlpunkte"].includes(art)) throw new PlattformFehler(422, "Export: mitglieder oder zaehlpunkte.");
    return csvAntwort(await b.egCsvExport(nutzer, params.id, { art }));
  }
  return { ok: true, ...(await b.egGemeinschaft(nutzer, params.id)) };
});

export const POST = route({ admin: true, maxBytes: 2_200_000 }, async ({ nutzer, params, body }) => egAktion(nutzer, params.id, body));
