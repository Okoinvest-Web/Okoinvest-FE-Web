// GET /api/admin/geodaten/kampagnen/[id]/versandliste?stufe=1|2 – Versandliste (Post/Lettershop) als CSV (Excel-DE):
//     Anschrift, Code, Zielfläche. Nur versandbereite, nicht gesperrte Empfänger. Personenbezogen: protokolliert, Rate-Limit.
import { route } from "@/lib/plattform/server/route";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";
import { akqLimit } from "@/lib/plattform/server/akquise2";
import { csv } from "@/lib/plattform/csv";
import { codeLesbar } from "@/lib/plattform/akquise-kampagne";

export const GET = route({ admin: true, recht: [{ bereich: "geodaten", stufe: 1 }, { bereich: "akquise", stufe: 1 }] }, async ({ nutzer, params, suche, backend, ip }) => {
  akqLimit("serienbrief", nutzer.id);
  const stufe = suche.get("stufe") === "2" ? 2 : 1;
  const d = await akquise2Backend().serienbriefDaten(nutzer, params.id, { stufe });
  const spalten = ["Nr", "Anrede", "Titel", "Vorname", "Nachname", "Firma", "Zusatz", "Straße", "PLZ", "Ort", "Land", "Code", "Kampagne", "Zielfläche", "Gemeinde", "Stufe"].map((label, i) => ({ label, wert: (z) => z[i] }));
  const zeilen = d.empfaenger.map((x, i) => [i + 1, x.empfaenger.anrede, x.empfaenger.titel, x.empfaenger.vorname, x.empfaenger.nachname, x.empfaenger.firma, x.empfaenger.zusatz, x.empfaenger.strasse, x.empfaenger.plz, x.empfaenger.ort, x.empfaenger.land || d.kampagne.land, codeLesbar(x.empfaenger.code), d.kampagne.id, x.ziel.id, x.ziel.gemeinde, stufe === 1 ? "Erstbrief" : "Zweitbrief"]);
  await backend.protokollEintrag(nutzer, { aktion: "export", objektArt: "kampagne", objektId: d.kampagne.id, text: `Versandliste Stufe ${stufe} (${zeilen.length} Empfänger)`, ip }).catch(() => null);
  return new Response(csv(spalten, zeilen), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="versandliste-${d.kampagne.id}-stufe${stufe}.csv"`, "Cache-Control": "no-store" } });
});
