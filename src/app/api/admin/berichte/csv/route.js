// GET /api/admin/berichte/csv?von=&bis= – Bericht als CSV (Excel-DE), Abruf protokolliert
import { route } from "@/lib/plattform/server/route";
import { berichtCsv } from "@/lib/plattform/server/monatsbericht";

export const GET = route({ admin: true }, async ({ backend, nutzer, suche, ip }) => {
  const b = await backend.bericht(nutzer, { von: suche.get("von") || undefined, bis: suche.get("bis") || undefined });
  await backend.protokollEintrag(nutzer, { aktion: "export", objektArt: "export", objektId: "bericht", text: `Bericht als CSV ${b.zeitraum.von} bis ${b.zeitraum.bis}`, ip });
  return new Response(berichtCsv(b), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="oekoinvest-bericht-${b.zeitraum.von}-${b.zeitraum.bis}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
