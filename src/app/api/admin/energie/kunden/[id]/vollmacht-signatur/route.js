// POST – Beschaffungsvollmacht zusätzlich zur elektronischen Unterschrift (EES, Signatur-Modul) an den Kunden senden
import { route } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";
import { serviceBackend } from "@/lib/plattform/backend/service";
import { vollmachtPdf } from "@/lib/plattform/energie/pdf";

export const POST = route({ admin: true, recht: [{ bereich: "energie", stufe: 2 }, { bereich: "signatur", stufe: 2 }] }, async ({ nutzer, params, ip }) => {
  const b = energieBackend();
  const d = await b.energieDokumentDaten(nutzer, { art: "vollmacht", id: params.id });
  const pdf = vollmachtPdf(d);
  const s = await serviceBackend().signaturAnlegen(
    nutzer,
    { titel: `Beschaffungsvollmacht ${d.kunde?.firma || ""}`.trim(), art: "sonstiges", pdf, dateiname: "beschaffungsvollmacht.pdf", bezugArt: "nutzer", bezugId: params.id, unterzeichner: [{ kontoId: params.id }], nachricht: "Bitte unterschreiben Sie die Beschaffungsvollmacht für die Strombeschaffung elektronisch.", fristTage: 14 },
    { ip }
  );
  await b.energieVollmachtSignatur(nutzer, params.id, s?.id || "");
  return { ok: true, signatur: s };
});
