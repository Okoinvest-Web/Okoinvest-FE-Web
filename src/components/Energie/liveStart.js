// Server-Hilfe: kompakter Live-Schnappschuss als Startwert für Client-Widgets
// (ohne Zeitreihen – RSC-Payload klein halten). Fällt die Quelle aus: null.
import { getEnergySnapshot } from "@/lib/energy";

export async function liveStart() {
  try {
    const s = await getEnergySnapshot();
    const { punkte, ...preis } = s.preis;
    const { zeiten, serien, ...erzeugung } = s.erzeugung;
    return { stand: s.stand, preis, erzeugung };
  } catch {
    return null;
  }
}
