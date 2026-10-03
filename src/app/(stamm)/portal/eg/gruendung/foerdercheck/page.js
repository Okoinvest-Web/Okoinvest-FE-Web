// /portal/eg/gruendung/foerdercheck – Förder-Check ohne Auftrag (WP5): Programme mit Ergebnis, Gründen, Quellen und Stand.

import { Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import { FoerderCheck } from "@/components/Portal/EG/Gruendung/Foerder";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { FOERDER_STAND } from "@/lib/plattform/eg/foerder";

export const metadata = { title: "Förder-Check Energiegemeinschaft" };

export default async function Seite() {
  await portalNutzer();
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Energiegemeinschaften" titel="Förder-Check" text="EAG-Investitionszuschuss, Marktprämie, Klima- und Energiefonds, Umweltförderung und Landesstellen: Was passt zu Ihren Anlagen?" />
      <Hinweis ton="info" titel={`Stand ${FOERDER_STAND.split("-").reverse().join(".")}`}>Förderhöhen, Calls und Fristen ändern sich laufend. Angaben mit „(zu bestätigen)“ bitte bei der Förderstelle prüfen – der Check ersetzt keine Förderzusage.</Hinweis>
      <Karte><FoerderCheck /></Karte>
    </div>
  );
}
