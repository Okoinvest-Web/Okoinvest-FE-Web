// /quellen/fakten.json – JSON-Export des Faktenregisters (Welle 4, Paket FAKTEN)
//
// Dieselben Einträge wie die Seite /quellen (quellenEintraege(), ohne Entwürfe), mit
// Lizenz- und Stand-Angaben sowie der zitierfähigen URL je Fakt (#fakt-<land>-<id>).
// Lizenz der Zusammenstellung: CC BY 4.0; die je Eintrag genannte Primärquelle behält
// ihre eigenen Bedingungen. Höchstens stündlich neu erzeugt (wie die Seite).

import { abs } from "@/data/site";
import { LIZENZ, alsJsonExport, quellenEintraege } from "@/lib/quellen/fakten";

export const revalidate = 3600;

export async function GET() {
  const heute = new Date();
  const daten = alsJsonExport(quellenEintraege({ heute }), { heute, basis: abs("") });
  return Response.json(daten, {
    headers: {
      "Content-Disposition": 'attachment; filename="oekoinvest-faktenregister.json"',
      Link: `<${LIZENZ.url}>; rel="license"`,
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
