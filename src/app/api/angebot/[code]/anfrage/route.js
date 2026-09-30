// POST /api/angebot/[code]/anfrage { kontakt: { anrede?, vorname, nachname, email, telefon?, plz?, ort? }, nachricht?,
//      rueckrufEinwilligung?, einwilligung: true } – Anfrage von der personalisierten Angebotsseite: legt einen Vorgang
//      „Fläche verpachten“ an (wie /api/anfrage) und verknüpft ihn mit dem Kampagnen-Empfänger (Rücklauf). Die Flächendaten
//      (ha, Bundesland, Gemeinde) ergänzt der Server aus dem Code – nie vom Browser. Öffentlich, Origin + Rate-Limit.
import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";
import { akqLimit } from "@/lib/plattform/server/akquise2";
import { codeNormalisieren } from "@/lib/plattform/akquise-kampagne";

const EINWILLIGUNG = "Ich bin einverstanden, dass ÖkoInvest meine Angaben zur Bearbeitung der Anfrage verarbeitet (Datenschutzerklärung).";
const RUECKRUF = "Ich willige ein, dass ÖkoInvest mich zu dieser Fläche telefonisch kontaktiert. Widerruf jederzeit möglich.";

export const POST = route({ auth: "optional", maxBytes: 16 * 1024 }, async ({ params, body, backend, ip, nutzer }) => {
  akqLimit("angebotSchreiben", ip);
  if (body.website) return { ok: true }; // Honeypot
  const code = codeNormalisieren(params.code);
  if (!code) throw new PlattformFehler(404, "Dieser Code ist nicht gültig.");
  if (body.einwilligung !== true) throw new PlattformFehler(422, "Bitte bestätigen Sie die Einwilligung zur Datenverarbeitung.");
  const b = akquise2Backend();
  const a = await b.angebotFuerCode(code);
  if (!a || a.gesperrt) throw new PlattformFehler(404, "Dieser Code ist nicht mehr gültig.");
  const k = body.kontakt || {};
  const rueckruf = body.rueckrufEinwilligung === true && String(k.telefon || "").trim().length >= 5;
  const r = await backend.anfrageAnlegen({
    typ: "flaeche",
    kontakt: { anrede: k.anrede, vorname: k.vorname, nachname: k.nachname, email: k.email, telefon: k.telefon, plz: k.plz, ort: k.ort, land: a.land },
    daten: { ha: a.ha, bundesland: a.bundesland, bezeichnung: `Fläche in ${a.gemeinde} (Kampagnen-Rücklauf)`, nachricht: typeof body.nachricht === "string" ? body.nachricht.slice(0, 2000) : "", quelle: "kampagne" },
    herkunft: { kanal: "kampagne", seite: "/angebot" },
    ip,
    einwilligungText: rueckruf ? `${EINWILLIGUNG} ${RUECKRUF}` : EINWILLIGUNG,
    nutzer,
  });
  await b.angebotAnfrageVerknuepfen(code, { vorgangId: r.id, einwilligungTelefon: rueckruf, telefon: rueckruf ? k.telefon : "" });
  return { ok: true, vorgang: r.id };
});
