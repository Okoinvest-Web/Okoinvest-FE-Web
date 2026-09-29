import { NextResponse } from "next/server";
import { getEnergySnapshot } from "@/lib/energy";

// Kompakte Live-Daten für Client-Widgets. `?voll=1` liefert zusätzlich die
// Zeitreihen (Dashboard); ohne Parameter nur die Kennzahlen (Ticker).
export const revalidate = 900;

export async function GET(request) {
  const voll = new URL(request.url).searchParams.get("voll") === "1";
  const s = await getEnergySnapshot();

  const body = voll
    ? s
    : {
        stand: s.stand,
        preis: { quelle: s.preis.quelle, aktuell: s.preis.aktuell, heute: s.preis.heute, morgen: s.preis.morgen },
        erzeugung: {
          quelle: s.erzeugung.quelle,
          zeitpunkt: s.erzeugung.zeitpunkt,
          solarMw: s.erzeugung.solarMw,
          windMw: s.erzeugung.windMw,
          lastMw: s.erzeugung.lastMw,
          eeAnteil: s.erzeugung.eeAnteil,
          solarAnteil: s.erzeugung.solarAnteil,
        },
      };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" },
  });
}
