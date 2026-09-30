// GET /api/portal/gemeinde/material?vorgang=…&art=pressemitteilung|amtsblatt|faq|aushang|sitzungsvorlage&projekt=…&format=pdf|json
//     Bürgerinfo-Material bzw. Pressetext als Entwurf (Gemeinde mit geprüftem Anliegen bzw. Backoffice), Abruf protokolliert
import { route } from "@/lib/plattform/server/route";
import { gemeindeBackend } from "@/lib/plattform/backend/gemeinde";
import { gemeindeMaterialPdf } from "@/lib/plattform/server/mitglied-pdf";
import { istDemo } from "@/lib/plattform/backend";

export const GET = route({ rollen: ["kommune"] }, async ({ nutzer, suche, ip }) => {
  const m = await gemeindeBackend().gdMaterial(nutzer, suche.get("vorgang") || "", { art: suche.get("art") || "", projektRef: suche.get("projekt") || "" }, { ip });
  if (suche.get("format") !== "pdf") return { ok: true, material: m };
  const { pdf, name } = gemeindeMaterialPdf(m, { demo: istDemo() });
  return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
