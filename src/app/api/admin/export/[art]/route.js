// GET /api/admin/export/[art] – CSV (Excel-DE: UTF-8 mit BOM, Semikolon) für vorgaenge | flaechen | projekte | interessen | provisionen
// Nur admin. Jeder Export wird im Aktivitätsprotokoll vermerkt.
import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { EXPORTE, csv } from "@/lib/plattform/csv";

async function zeilen(backend, nutzer, art) {
  switch (art) {
    case "vorgaenge":
      return backend.vorgaenge(nutzer, { alle: true });
    case "flaechen":
      return backend.flaechen(nutzer, { alle: true });
    case "projekte":
      return backend.projekte(nutzer, { alle: true });
    case "interessen":
      return backend.interessen(nutzer, { alle: true });
    case "provisionen":
      return backend.provisionen(nutzer);
    default:
      throw new PlattformFehler(404, "Unbekannter Export.");
  }
}

export const GET = route({ admin: true }, async ({ backend, nutzer, params, ip }) => {
  const def = EXPORTE[params.art];
  if (!def) throw new PlattformFehler(404, "Unbekannter Export.");
  const liste = await zeilen(backend, nutzer, params.art);
  const inhalt = csv(def.spalten, liste);
  await backend.protokollEintrag(nutzer, { aktion: "export", objektArt: "export", objektId: params.art, text: `CSV-Export ${def.titel} (${liste.length} Zeilen)`, ip });
  const tag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
  return new Response(inhalt, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="oekoinvest-${params.art}-${tag}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
