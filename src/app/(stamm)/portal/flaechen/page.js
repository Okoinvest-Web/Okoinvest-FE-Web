import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import { SeitenKopf } from "@/components/Portal/ui";
import FlaechenListe from "@/components/Portal/Bedienung/Liste/FlaechenListe";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { ha } from "@/lib/plattform/format";
import { fmt } from "@/lib/rechner/annahmen";
import { PROVISION } from "@/lib/invest/markt";

export const metadata = { title: "Flächen" };

export default async function Flaechen() {
  const n = await portalNutzer({ rollen: ["flaeche", "landwirt"] });
  const flaechen = await backend().flaechen(n);
  const summe = flaechen.reduce((s, f) => s + (f.ha || 0), 0);

  return (
    <div>
      <SeitenKopf
        eyebrow="Flächen"
        titel="Meine Flächen"
        text={`Von der Vorprüfung bis zum Betrieb: Hier sehen Sie für jede Fläche, wo sie steht. Die Prüfung ist ${PROVISION.flaeche.text}.`}
        aktionen={<Button href="/portal/flaechen/neu" icon={Plus}>Fläche hinzufügen</Button>}
      />
      {flaechen.length > 0 && (
        <p className="mb-4 text-[14px] text-ink-600">
          <span className="ov-num font-semibold text-ink-900">{fmt(flaechen.length)}</span> {flaechen.length === 1 ? "Fläche" : "Flächen"} mit zusammen <span className="ov-num font-semibold text-ink-900">{ha(summe)}</span>
        </p>
      )}
      <FlaechenListe flaechen={flaechen} jetzt={Date.now()} />
    </div>
  );
}
