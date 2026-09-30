// GET /api/admin/protokoll/suche?q=&aktion=&objektArt=&nutzer=&von=&bis=&seite=&proSeite= – Revisionsprotokoll durchsuchen
// GET …&format=csv – alle Treffer (höchstens 5000) als CSV (Excel-DE, Formel-Schutz); Export wird protokolliert.
import { route } from "@/lib/plattform/server/route";
import { querschnittBackend } from "@/lib/plattform/backend/querschnitt";
import { csv } from "@/lib/plattform/csv";

const FELDER = ["q", "aktion", "objektArt", "nutzer", "von", "bis", "seite", "proSeite"];

export const GET = route({ admin: true }, async ({ backend, nutzer, suche, ip }) => {
  const filter = Object.fromEntries(FELDER.map((k) => [k, suche.get(k) || ""]));
  if (suche.get("format") === "csv") {
    const r = await querschnittBackend().protokollSuche(nutzer, { ...filter, alle: true });
    await backend.protokollEintrag(nutzer, { aktion: "export", objektArt: "export", objektId: "protokoll", text: `Revisionsprotokoll-Suche als CSV (${r.eintraege.length} Einträge)`, ip });
    const text = csv(
      [
        { label: "Zeitpunkt", wert: "am" }, { label: "Aktion", wert: "aktion" }, { label: "Objektart", wert: "objektArt" }, { label: "Objekt", wert: "objektId" },
        { label: "Text", wert: "text" }, { label: "Nutzer", wert: "nutzer" }, { label: "Nutzer-ID", wert: "nutzerId" }, { label: "Eintrag", wert: "id" }, { label: "Hash", wert: "hash" }, { label: "Vorgänger-Hash", wert: "prevHash" },
      ],
      r.eintraege
    );
    return new Response(text, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="revisionsprotokoll-suche.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  }
  return { ok: true, ...(await querschnittBackend().protokollSuche(nutzer, filter)) };
});
