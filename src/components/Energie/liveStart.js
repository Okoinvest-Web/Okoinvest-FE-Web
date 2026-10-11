// Server-Hilfe: kompakter Live-Schnappschuss als Startwert für Client-Widgets
// (ohne Zeitreihen – RSC-Payload klein halten). Fällt die Quelle aus: null.
// land: "DE" | "AT" | "CH" | null (gemeinsame Seite → DE), z. B. aus seitenLand(params).
import { getEnergySnapshot } from "@/lib/energy";

export async function liveStart(land = null) {
  try {
    const s = await getEnergySnapshot(land || "DE");
    const { punkte, ...preis } = s.preis;
    const { zeiten, serien, ...erzeugung } = s.erzeugung;
    return { stand: s.stand, land: s.land, preis, erzeugung };
  } catch {
    return null;
  }
}
