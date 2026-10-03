// /portal/eg/beitritt – Gemeinschaft finden (WP6): Suche nach PLZ bzw. Netzgebiet über die offenen Gemeinschaften, Beitritt
// starten oder Interesse hinterlegen (Cluster nach Netzbetreiber und PLZ, Fachkonzept 2.1).

import { Calculator } from "lucide-react";
import { Karte, PfeilLink, SeitenKopf } from "@/components/Portal/ui";
import GemeinschaftFinden, { InteresseFormular } from "@/components/Portal/EG/Mitglied/GemeinschaftFinden";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";
import { pfad } from "@/lib/land";

export const metadata = { title: "Energiegemeinschaft finden" };

export default async function Finden() {
  const n = await portalNutzer();
  const d = await egBackend().ptUebersicht(n);
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Energiegemeinschaft" titel="Passende Gemeinschaft finden" text="Gemeinschaften mit Erneuerbaren in Ihrer Nähe bringen günstigeren Strom und – in Erneuerbare-Energie-Gemeinschaften – reduzierte Netzentgelte. Ein Zählpunkt kann an bis zu fünf Gemeinschaften teilnehmen." />
      <Karte titel="Nach Postleitzahl suchen" untertitel="Ob Ihr Anschluss im Nahebereich liegt, bestätigt der Netzbetreiber bei der Anmeldung.">
        <GemeinschaftFinden gemeinschaften={d.offeneGemeinschaften} plz={d.plz} />
      </Karte>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Karte titel="Keine passende dabei?" untertitel="Interesse hinterlegen – wir bündeln Interessierte je Netzgebiet.">
          <InteresseFormular plzStart={d.plz} />
        </Karte>
        <Karte titel="Erst rechnen?" aktion={<Calculator aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
          <p className="text-[14px] leading-relaxed text-ink-600">Der Ersparnis-Rechner zeigt in einer Minute, was eine Gemeinschaft für Ihren Verbrauch oder Ihre PV-Anlage bringt – mit den Netzentgelt-Regeln 2026 und der Arbeitshypothese für 2027.</p>
          <div className="mt-4"><PfeilLink href={pfad("/energiegemeinschaften/rechner")}>Zum Rechner</PfeilLink></div>
        </Karte>
      </div>
    </div>
  );
}
