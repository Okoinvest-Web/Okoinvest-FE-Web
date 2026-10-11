// /widgets/eg-sparrechner – Embed-Route des EG-Spar-Kurzrechners (Welle 4, Paket WIDGETS)
//
//   GET ?land=at&sprache=de|en&partner=<kennung>&verbrauchKwh=&profil=&modell=
//
// Liefert ein in sich geschlossenes HTML-Dokument (kein JavaScript, keine Cookies, kein Tracking),
// das Partner per <iframe> einbetten. Berechnung serverseitig über den Rechenkern des
// Energiegemeinschafts-Rechners (src/lib/widgets/egSparKurz.js). Einbettung erlaubt die eigene CSP
// dieser Route (frame-ancestors, konfigurierbar über WIDGET_FRAME_ANCESTORS); die globalen
// Kopfzeilen nehmen /widgets/ dafür aus (next.config.mjs). Dokumentation: /partner/widgets.

import { widgetDokument } from "@/lib/widgets/html";
import { widgetKopfzeilen, widgetLand, widgetPartner, widgetSprache } from "@/lib/widgets/register";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  const q = url.searchParams;
  const html = widgetDokument({
    widgetId: "eg-sparrechner",
    land: widgetLand(q.get("land"), "eg-sparrechner"),
    sprache: widgetSprache(q.get("sprache")),
    partner: widgetPartner(q.get("partner")),
    basis: url.origin,
    query: { verbrauchKwh: q.get("verbrauchKwh") ?? undefined, profil: q.get("profil") ?? undefined, modell: q.get("modell") ?? undefined },
  });
  return new Response(html, { headers: widgetKopfzeilen() });
}
