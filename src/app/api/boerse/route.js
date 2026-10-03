// GET /api/boerse?typ=&land=&phase=&mwpMin=&mwpMax= – öffentliche Projektliste (nur Teaser-Felder)
import { route } from "@/lib/plattform/server/route";
import { istDemo } from "@/lib/plattform/backend";
import { istDemoAnsicht, sichtbareProjekte } from "@/lib/boerse/sichtbarkeit";

export const GET = route({ auth: "optional" }, async ({ backend, nutzer, suche }) => {
  const filter = Object.fromEntries(["typ", "land", "phase", "mwpMin", "mwpMax"].map((k) => [k, suche.get(k) || undefined]));
  const daten = await backend.boerse(nutzer, filter);
  // QM Welle 1: dieselbe Sichtbarkeitsregel wie /projektboerse (keine Testdatensätze, Demo nur im Demo-Modus)
  const demo = istDemoAnsicht({ backendDemo: istDemo(), daten });
  const projekte = sichtbareProjekte(daten?.projekte, { demo });
  // Kennzahlen nur aus der gefilterten Liste (Rohzahlen wie „verkauft“ enthielten Testdatensätze)
  const kennzahlen = {
    anzahl: projekte.length,
    mwp: Math.round(projekte.reduce((s, p) => s + (Number(p.mwp) || 0), 0) * 10) / 10,
    laender: new Set(projekte.map((p) => p.land).filter(Boolean)).size,
  };
  return { ok: true, ...daten, projekte, kennzahlen };
});
