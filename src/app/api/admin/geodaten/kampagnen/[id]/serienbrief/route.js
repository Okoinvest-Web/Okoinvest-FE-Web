// GET /api/admin/geodaten/kampagnen/[id]/serienbrief?stufe=1|2&format=pdf|json – Serienbrief (Druck-PDF, je Empfänger
//     2 Seiten) bzw. Vorschau-Daten. Ändert nichts (Versand separat bestätigen). Personenbezogen: Bereich „geodaten“ +
//     „akquise“ lesen, Rate-Limit, Abruf wird protokolliert (ohne Inhalte).
import { basisUrl, route } from "@/lib/plattform/server/route";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";
import { briefFuer } from "@/lib/plattform/geodaten/serienbrief";
import { serienbriefPdf } from "@/lib/plattform/server/serienbrief-pdf";
import { akqLimit } from "@/lib/plattform/server/akquise2";

export const GET = route({ admin: true, recht: [{ bereich: "geodaten", stufe: 1 }, { bereich: "akquise", stufe: 1 }] }, async ({ nutzer, params, suche, backend, ip, request }) => {
  akqLimit("serienbrief", nutzer.id);
  const stufe = suche.get("stufe") === "2" ? 2 : 1;
  const d = await akquise2Backend().serienbriefDaten(nutzer, params.id, { stufe });
  const basis = basisUrl(request);
  const briefe = d.empfaenger.map((x) => briefFuer(d.kampagne, x.ziel, x.empfaenger, { basisUrl: basis, vorlage: d.vorlage || undefined, zustaendig: d.zustaendig }));
  const json = suche.get("format") === "json";
  await backend.protokollEintrag(nutzer, { aktion: "export", objektArt: "kampagne", objektId: d.kampagne.id, text: `Serienbrief Stufe ${stufe} (${briefe.length} Briefe, ${json ? "Vorschau" : "PDF"})`, ip }).catch(() => null);
  if (json) return { ok: true, stufe, vorlage: d.vorlage ? { name: d.vorlage.name, version: d.vorlage.version } : null, briefe };
  const pdf = serienbriefPdf(briefe, { titel: `Serienbrief ${d.kampagne.name}`, demo: !!d.kampagne.demo });
  return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="serienbrief-${d.kampagne.id}-stufe${stufe}.pdf"`, "Cache-Control": "no-store" } });
});
