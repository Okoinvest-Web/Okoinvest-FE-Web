// GET /api/admin/geodaten/export?format=csv|geojson&<Filter wie /kandidaten> – Export der gefilterten Kandidaten.
// Bereich „geodaten“ lesen; jeder Export wird im Aktivitätsprotokoll vermerkt (ohne Inhalte). Rate-Limit „export“.
import { route } from "@/lib/plattform/server/route";
import * as geo from "@/lib/plattform/geodaten";
import { bboxLesen } from "@/lib/plattform/geodaten/geo";
import { kandidatenCsv, kandidatenGeojson } from "@/lib/plattform/geodaten/export";

export const GET = route({ admin: true, limit: "export" }, async ({ nutzer, suche, backend, ip }) => {
  const format = suche.get("format") === "geojson" ? "geojson" : "csv";
  const filter = geo.filterLesen(suche, bboxLesen);
  const [r, u] = await Promise.all([geo.kandidaten(nutzer, { ...filter, limit: 2000 }), geo.uebersicht(nutzer)]);
  await backend
    .protokollEintrag(nutzer, { aktion: "export", objektArt: "geodaten", objektId: "kandidaten", text: `Export Kandidatenflächen (${format.toUpperCase()}, ${r.kandidaten.length} Flächen)`, ip })
    .catch(() => null);
  const datum = new Date().toISOString().slice(0, 10);
  if (format === "geojson") {
    return new Response(JSON.stringify(kandidatenGeojson(r.kandidaten, { quellen: u.quellen })), {
      headers: { "Content-Type": "application/geo+json; charset=utf-8", "Content-Disposition": `attachment; filename="kandidatenflaechen-${datum}.geojson"`, "Cache-Control": "no-store" },
    });
  }
  return new Response(kandidatenCsv(r.kandidaten), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="kandidatenflaechen-${datum}.csv"`, "Cache-Control": "no-store" },
  });
});
