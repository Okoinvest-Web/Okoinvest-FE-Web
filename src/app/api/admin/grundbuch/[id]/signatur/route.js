// POST /api/admin/grundbuch/[id]/signatur – Vertrag (Muster-PDF der Akte) über das Signatur-Modul an den Eigentümer senden.
//      Bereiche „grundbuch“ und „signatur“ schreiben (das Signatur-Modul prüft zusätzlich selbst).
import { route } from "@/lib/plattform/server/route";
import { closingBackend } from "@/lib/plattform/backend/closing";
import { grundbuchPdf } from "@/lib/plattform/closing/pdfSatz";
import { istDemo } from "@/lib/plattform/backend";

export const POST = route({ admin: true, recht: [{ bereich: "grundbuch", stufe: 2 }, { bereich: "signatur", stufe: 2 }] }, async ({ nutzer, params, ip }) => {
  const b = closingBackend();
  const daten = await b.gbMusterDaten(nutzer, params.id, { vorlage: "", ip });
  const { pdf, name } = grundbuchPdf(daten, { demo: istDemo() });
  return { ok: true, ...(await b.gbSignatur(nutzer, params.id, { pdf, dateiname: name, ip })) };
});
