// GET  /api/admin/genossenschaft – Backoffice: Genossenschaften, Mitglieder, Übertragungen, Versammlungen, Ausschüttungen, Kennzahlen
// POST /api/admin/genossenschaft – { aktion, … } (Bereich „genossenschaft“ schreiben, rechte.js):
//   genoSpeichern {id?, daten} · mitglied {id, …} (zulassen, ablehnen, einzahlung, zeichnung…, kuendigung…, auszahlung, uebertragung…)
//   gvSpeichern {id?, genoId, daten} · gv {id, …} (einladen, oeffnen, abschliessen, absagen)
//   ausschuettungAnlegen {genoId, daten} · ausschuettung {id, …} (beschliessen, auszahlen, verwerfen)
import { route } from "@/lib/plattform/server/route";
import { mitgliedBackend } from "@/lib/plattform/backend/mitglied";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await mitgliedBackend().boGeno(nutzer)) }));

export const POST = route({ admin: true, maxBytes: 96 * 1024 }, async ({ nutzer, body, ip }) => {
  const b = mitgliedBackend();
  const { aktion, id, ...rest } = body;
  if (aktion === "genoSpeichern") return { ok: true, geno: await b.boGenoSpeichern(nutzer, { id: id || null, daten: body.daten || {} }) };
  if (aktion === "mitglied") return { ok: true, ergebnis: await b.boMitgliedAktion(nutzer, id, { ...rest, aktion: body.mitgliedAktion }, { ip }) };
  if (aktion === "gvSpeichern") return { ok: true, versammlung: await b.boGvSpeichern(nutzer, { id: id || null, genoId: body.genoId, daten: body.daten || {} }) };
  if (aktion === "gv") return { ok: true, versammlung: await b.boGvAktion(nutzer, id, { ...rest, aktion: body.gvAktion }, { ip }) };
  if (aktion === "ausschuettungAnlegen") return { ok: true, ausschuettung: await b.boAusschuettungAnlegen(nutzer, { genoId: body.genoId, daten: body.daten || {} }) };
  if (aktion === "ausschuettung") return { ok: true, ausschuettung: await b.boAusschuettungAktion(nutzer, id, { ...rest, aktion: body.ausschuettungAktion }, { ip }) };
  throw new PlattformFehler(422, "Unbekannte Aktion.");
});
