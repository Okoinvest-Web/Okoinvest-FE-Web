// /portal/beteiligung – Genossenschaft & Energiegemeinschaft für Mitglieder (Fachprüfung Kapitalseite).
// Ehrlicher Stand: Die Genossenschaft ist im Aufbau – nur unverbindliche Vormerkung, keine Zeichnung.

import { HandHeart, Info, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import Begriff from "@/components/Portal/Bedienung/Begriff";
import { Badge, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import { EgFormular, GenoFormular } from "@/components/Portal/Fach/Beteiligung";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { fachBackend } from "@/lib/plattform/backend/fach";
import { GENO_STATUS } from "@/lib/plattform/fach/mitglied";

export const metadata = { title: "Genossenschaft & Gemeinschaft" };

export default async function BeteiligungSeite() {
  const n = await portalNutzer({ rollen: ["mitglied"] });
  const d = await laden(() => fachBackend().energieDaten(n));
  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Mitglied"
        titel="Genossenschaft & Energiegemeinschaft"
        text="Beteiligen Sie sich an Solarparks in Ihrer Region und nutzen Sie Strom aus der Nachbarschaft – mit den Stammdaten, die Netzbetreiber dafür verlangen."
        aktionen={<Button href="/genossenschaft" size="sm" variant="ghost" icon={Info}>Mehr zur Genossenschaft</Button>}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Karte
          titel={<span className="inline-flex flex-wrap items-center gap-2">Genossenschaft <Badge ton="warn">{GENO_STATUS.text}</Badge></span>}
          untertitel="Unverbindliche Vormerkung – keine Zeichnung, keine Zahlung"
          aktion={<HandHeart aria-hidden="true" className="h-5 w-5 text-ov-600" />}
        >
          <Hinweis ton="warn" className="mb-4">{GENO_STATUS.hinweis} Wir melden uns mit Satzung und Beitrittserklärung, sobald ein Beitritt möglich ist. Mehr zur <Begriff id="energiegenossenschaft">Energiegenossenschaft</Begriff> und zur <Begriff id="nachschusspflicht">Nachschusspflicht</Begriff>.</Hinweis>
          <GenoFormular geno={d.geno} />
        </Karte>
        <Karte titel="Energiegemeinschaft" untertitel="Teilnahme mit Zählpunkt bzw. Marktlokation" aktion={<Users aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
          <p className="mb-4 text-[14px] leading-relaxed text-ink-600">
            Österreich: <Begriff id="eeg-gemeinschaft">Erneuerbare-Energie-Gemeinschaft</Begriff> lokal oder regional bzw. <Begriff id="buergerenergiegemeinschaft">Bürgerenergiegemeinschaft</Begriff> mit <Begriff id="zaehlpunkt">Zählpunktnummer</Begriff>. Deutschland: <Begriff id="energy-sharing">Energy Sharing</Begriff> mit <Begriff id="marktlokation">Marktlokations-ID</Begriff>. Schweiz: <Begriff id="leg">LEG</Begriff> bzw. <Begriff id="zev">ZEV</Begriff>.
          </p>
          <EgFormular eg={d.eg} />
        </Karte>
      </div>
    </div>
  );
}
