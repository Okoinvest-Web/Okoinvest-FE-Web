import { NextResponse } from "next/server";
import { getEnergySnapshot, marktLand } from "@/lib/energy";

// Kompakte Live-Daten für Client-Widgets. `?voll=1` liefert zusätzlich die
// Zeitreihen (Dashboard); ohne Parameter nur die Kennzahlen (Ticker).
// `?land=de|at|ch` wählt Gebotszone und Erzeugungsland (Standard: de);
// ungültige Werte fallen auf de zurück. Next-Cache je Land getrennt
// (die Zone steht in der Abruf-URL von src/lib/energy.js).
export const revalidate = 900;

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const voll = params.get("voll") === "1";
  const land = marktLand(params.get("land")); // validiert: de|at|ch, sonst DE
  const s = await getEnergySnapshot(land);

  const body = voll
    ? s
    : {
        stand: s.stand,
        land: s.land,
        preis: { quelle: s.preis.quelle, zone: s.preis.zone, aktuell: s.preis.aktuell, heute: s.preis.heute, morgen: s.preis.morgen },
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
