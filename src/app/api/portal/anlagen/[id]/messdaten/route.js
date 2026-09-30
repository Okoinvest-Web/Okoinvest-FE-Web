// GET /api/portal/anlagen/[id]/messdaten?von=ISO&bis=ISO&aufloesung=15min|1h|1d|1mon[&format=csv]
// Zeitreihe aus dem Ingest-Dienst bzw. Simulator. ZUERST Rechteprüfung über das Backend (fremde Anlage → 403),
// dann Messdaten. Tages-/Monatswerte enthalten die Erwartung (Soll) aus Region, kWp und Bauart.
import { route } from "@/lib/plattform/server/route";
import { rateLimit } from "@/lib/plattform/server/rateLimit";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";
import { messdaten, zeitraumPruefen } from "@/lib/plattform/messdaten";
import { prognoseMonatKwh } from "@/lib/plattform/anlagen";
import { csv } from "@/lib/plattform/csv";

const faktor = () => (process.env.NODE_ENV !== "production" ? Number(process.env.PLATTFORM_RATE_FAKTOR) || 10 : 1);

function mitSoll(a, punkte, aufloesung) {
  if (!["1d", "1mon"].includes(aufloesung) || !(a.kwp > 0)) return punkte;
  return punkte.map((p) => {
    const d = new Date(p.ts);
    const m = d.getUTCMonth();
    const j = d.getUTCFullYear();
    const tage = new Date(Date.UTC(j, m + 1, 0)).getUTCDate();
    const monat = prognoseMonatKwh(a, m, j);
    return { ...p, erwartetKwh: Math.round((aufloesung === "1d" ? monat / tage : monat) * 10) / 10 };
  });
}

export const GET = route({}, async ({ nutzer, params, suche }) => {
  rateLimit(`anl-messdaten:${nutzer.id}`, 240 * faktor(), 60e3);
  const a = await anlagenBackend().anlage(nutzer, params.id); // Rolle + Eigentum
  const z = zeitraumPruefen({ von: suche.get("von"), bis: suche.get("bis"), aufloesung: suche.get("aufloesung") });
  const r = await messdaten().reihe(a, z);
  const aufl = r.aufloesung || z.aufloesung;
  const punkte = mitSoll(a, r.punkte || [], aufl);
  if (suche.get("format") === "csv") {
    const spalten = [
      { label: "Zeitpunkt", wert: "ts" },
      { label: "PV-Leistung (kW)", wert: "pvKw" },
      { label: "Verbrauch (kW)", wert: "verbrauchKw" },
      { label: "Erzeugung (kWh)", wert: "erzeugungKwh" },
      { label: "Verbrauch (kWh)", wert: "verbrauchKwh" },
      { label: "Netzbezug (kWh)", wert: "netzbezugKwh" },
      { label: "Einspeisung (kWh)", wert: "einspeisungKwh" },
      { label: "Speicher-Ladestand (%)", wert: "speicherSocPct" },
      { label: "Erwartung (kWh)", wert: "erwartetKwh" },
    ];
    return new Response(csv(spalten, punkte), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="messdaten-${a.id}-${aufl}.csv"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  return { ok: true, anlageId: a.id, aufloesung: aufl, von: new Date(z.von).toISOString(), bis: new Date(z.bis).toISOString(), punkte, monitoring: true };
});
