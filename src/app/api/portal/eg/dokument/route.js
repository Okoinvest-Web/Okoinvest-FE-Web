// /api/portal/eg/dokument – Dokumentgenerator (WP5): Musterstatuten, Verträge, Vollmachten, Anzeigen, Mitgliederinformationen
//   GET  ?id=EGD-…                                     gespeicherte Version als PDF
//   GET  ?vorlage=…&gemeinschaftId=…|auftragId=…        Vorschau als PDF (ohne Speichern)
//   POST { vorlage, gemeinschaftId? | auftragId?, daten?, speichern? }  → { dokument (Version, SHA-256), pruefung, fehlend }
// Jedes Dokument ist ein MUSTER zur rechtlichen Prüfung (Rechtsstand ElWG 01.10.2026).
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";
import { egDokumentPdf, pdfDateiname } from "@/lib/plattform/server/eg-gruendung-pdf";

const pdfAntwort = (r) =>
  new Response(egDokumentPdf(r.dok, { version: r.dokument.version || "Vorschau", sha256: r.dokument.sha256, demo: !!r.dokument.demo }), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${pdfDateiname(`${r.dok.titel}${r.dokument.version ? `-v${r.dokument.version}` : "-vorschau"}`)}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });

export const GET = route({}, async ({ nutzer, suche }) => {
  const b = egBackend();
  const id = suche.get("id") || "";
  if (id) return pdfAntwort(await b.grDokumentErzeugen(nutzer, { dokumentId: id }));
  return pdfAntwort(await b.grDokumentErzeugen(nutzer, { vorlage: suche.get("vorlage") || "", gemeinschaftId: suche.get("gemeinschaftId") || "", auftragId: suche.get("auftragId") || "", speichern: false }));
});

export const POST = route({}, async ({ nutzer, body }) => {
  const r = await egBackend().grDokumentErzeugen(nutzer, { vorlage: body?.vorlage || "", gemeinschaftId: body?.gemeinschaftId || "", auftragId: body?.auftragId || "", daten: body?.daten || {}, speichern: body?.speichern !== false });
  return { ok: true, dokument: r.dokument, pruefung: r.pruefung, fehlend: r.dok?.fehlend || [], pflichtFehlend: r.dok?.pflichtFehlend || [], unveraendert: !!r.unveraendert };
});
