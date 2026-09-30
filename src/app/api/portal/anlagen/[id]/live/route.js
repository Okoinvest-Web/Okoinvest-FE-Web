// GET /api/portal/anlagen/[id]/live – Server-Sent Events mit dem jeweils neuesten Messwert (event: messwert).
// Rechteprüfung über das Backend VOR dem Öffnen des Stroms (fremde Anlage → 403 als JSON).
// Demo: Simulator (alle 5 s); Betrieb: Proxy auf die SSE-Route des Ingest-Dienstes (Service-Token bleibt auf dem Server).
// Höchstens 6 parallele Ströme je Konto (weitere → 429).
import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";
import { messdaten } from "@/lib/plattform/messdaten";

export const dynamic = "force-dynamic";

const offen = (globalThis.__anlLiveStroeme ||= new Map());

export const GET = route({}, async ({ nutzer, params, request }) => {
  const a = await anlagenBackend().anlage(nutzer, params.id); // Rolle + Eigentum
  const anzahl = offen.get(nutzer.id) || 0;
  if (anzahl >= 6) throw new PlattformFehler(429, "Zu viele gleichzeitige Live-Verbindungen – bitte schließen Sie andere Fenster.");
  offen.set(nutzer.id, anzahl + 1);
  let freigegeben = false;
  const freigeben = () => {
    if (freigegeben) return;
    freigegeben = true;
    const n = (offen.get(nutzer.id) || 1) - 1;
    if (n <= 0) offen.delete(nutzer.id);
    else offen.set(nutzer.id, n);
  };
  request.signal.addEventListener("abort", freigeben, { once: true });
  let quelle;
  try {
    quelle = await messdaten().live(a, { signal: request.signal });
  } catch (e) {
    freigeben();
    throw e;
  }
  const leser = quelle.getReader();
  const strom = new ReadableStream({
    async pull(ctrl) {
      try {
        const { value, done } = await leser.read();
        if (done) {
          freigeben();
          ctrl.close();
        } else ctrl.enqueue(value);
      } catch {
        freigeben();
        try {
          ctrl.close();
        } catch {
          /* bereits geschlossen */
        }
      }
    },
    cancel() {
      freigeben();
      leser.cancel().catch(() => {});
    },
  });
  return new Response(strom, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
