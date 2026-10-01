// GET  /api/portal/eg/[id]/verwaltung – Organe-Sicht (Vorstand, Kassier, Schriftführung, Rechnungsprüfung): Kennzahlen,
//      Mitgliederliste, offene Aufgaben, Tarife, Rechte; ?export=mitglieder|zaehlpunkte → CSV (Personendaten nur mit Recht „stammdaten“)
// POST /api/portal/eg/[id]/verwaltung – Organ-Aktionen: mitglied_status (Aufnahme durch den Vorstand), mitglied, organ,
//      organ_beenden, tarif (Vorschlag/Beschluss), massen. Rechte je Kontext-Rolle prüft das Backend (fremde Gemeinschaft → 404).
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { csvAntwort, egAktion } from "@/lib/plattform/server/eg-aktion";

const ORGAN_AKTIONEN = ["mitglied_status", "mitglied", "organ", "organ_beenden", "tarif", "massen"];

export const GET = route({}, async ({ nutzer, params, suche }) => {
  const b = egBackend();
  const art = suche.get("export");
  if (art) {
    if (!["mitglieder", "zaehlpunkte"].includes(art)) throw new PlattformFehler(422, "Export: mitglieder oder zaehlpunkte.");
    await b.egVerwaltung(nutzer, params.id); // Organ-Rolle prüfen
    return csvAntwort(await b.egCsvExport(nutzer, params.id, { art }));
  }
  return { ok: true, ...(await b.egVerwaltung(nutzer, params.id)) };
});

export const POST = route({ maxBytes: 96 * 1024 }, async ({ nutzer, params, body }) => {
  if (!ORGAN_AKTIONEN.includes(body?.aktion)) throw new PlattformFehler(422, "Unbekannte Aktion.");
  await egBackend().egVerwaltung(nutzer, params.id); // nur Organe bzw. Backoffice
  return egAktion(nutzer, params.id, body);
});
