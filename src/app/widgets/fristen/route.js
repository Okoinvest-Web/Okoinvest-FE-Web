// /widgets/fristen – Embed-Route des Fristen-Tickers (Welle 4, Paket WIDGETS)
//
//   GET ?land=de|at|ch&sprache=de|en&partner=<kennung>
//
// Liefert ein in sich geschlossenes HTML-Dokument (kein JavaScript, keine Cookies, kein Tracking)
// mit den nächsten Fristen des Landes aus dem Faktenregister (src/lib/widgets/fristenTicker.js –
// dieselbe Auswahl wie /marktdaten/fristen). Einbettung erlaubt die eigene CSP dieser Route
// (frame-ancestors, konfigurierbar über WIDGET_FRAME_ANCESTORS); die globalen Kopfzeilen nehmen
// /widgets/ dafür aus (next.config.mjs). Dokumentation: /partner/widgets.

import { widgetDokument } from "@/lib/widgets/html";
import { widgetKopfzeilen, widgetLand, widgetPartner, widgetSprache } from "@/lib/widgets/register";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  const q = url.searchParams;
  const html = widgetDokument({
    widgetId: "fristen",
    land: widgetLand(q.get("land"), "fristen"),
    sprache: widgetSprache(q.get("sprache")),
    partner: widgetPartner(q.get("partner")),
    basis: url.origin,
  });
  // Fristen ändern sich selten, aber abgelaufene Einträge sollen zügig verschwinden → 10 Minuten
  return new Response(html, { headers: widgetKopfzeilen({ maxAge: 600 }) });
}
