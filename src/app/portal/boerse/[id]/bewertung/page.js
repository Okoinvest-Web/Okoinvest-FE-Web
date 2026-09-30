// /portal/boerse/[id]/bewertung – Bewertungswerkzeug (Fachprüfung Kapitalseite): Projekt aus der Börse direkt in die
// Renditerechnung übernehmen, vorbelegt aus Datenblatt und Exposé, Annahmen überschreibbar, Szenarien speichern.
// Zugriff: Investoren mit freigegebenem Datenraum (NDA), Anbieter des Projekts, Backoffice – sonst 404.

import { ArrowLeft, Calculator } from "lucide-react";
import Button from "@/components/ui/Button";
import Begriff from "@/components/Portal/Bedienung/Begriff";
import { Hinweis, SeitenKopf } from "@/components/Portal/ui";
import BewertungWerkzeug from "@/components/Portal/Fach/BewertungWerkzeug";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { fachBackend } from "@/lib/plattform/backend/fach";
import { LAENDER, PROJEKT_TYPEN } from "@/lib/plattform/konstanten";
import { mwp } from "@/lib/plattform/format";
import { phaseById } from "@/lib/invest/markt";

export const metadata = { title: "Bewertung" };

export default async function BewertungSeite({ params }) {
  const { id } = await params;
  const n = await portalNutzer({ rollen: ["investor", "anbieter"] });
  const d = await laden(() => fachBackend().bewertung(n, id));
  const p = d.projekt;
  const phase = phaseById(p.phase);
  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Bewertung"
        titel={p.titel}
        text={[PROJEKT_TYPEN[p.typ], mwp(p.mwp), phase.label, LAENDER[p.land]].filter(Boolean).join(" · ")}
        aktionen={<Button href={d.zugriff === "eigentuemer" ? `/portal/projekte/${p.id}` : `/portal/boerse/${p.id}`} size="sm" variant="ghost" icon={ArrowLeft}>Zum Exposé</Button>}
      />
      <Hinweis ton="info" icon={Calculator} titel={d.vorbelegung.modus === "bestand" ? "Ertragswert der Bestandsanlage" : "Renditerechnung aus Käufersicht"}>
        {d.vorbelegung.modus === "bestand" ? (
          <>Diskontierte Cashflows bis zum Ende von Nutzungsdauer bzw. Pacht, Ist-Ertrag aus dem Datenblatt, Förderung bis zum Förderende, danach Marktwert. Ergebnis: Wert beim Ziel-Diskontsatz und <Begriff id="irr">IRR</Begriff> zum Kaufpreis.</>
        ) : (
          <>Kaufpreis der <Begriff id="projektrechte">Projektrechte</Begriff> plus Restentwicklung, <Begriff id="epc">EPC</Begriff>-Capex und Netzanschluss; Erlöse nach Zuschlag bzw. PPA, danach Marktwert. Fremdkapital auf <Begriff id="p50-p90">P90</Begriff> bemessen (<Begriff id="dscr">DSCR</Begriff>), Rendite im P50-Fall. Felder mit Herkunft „Datenblatt“ bzw. „Exposé“ stammen vom Anbieter.</>
        )}
      </Hinweis>
      <BewertungWerkzeug projektId={p.id} vorbelegung={d.vorbelegung} szenarien={d.szenarien} />
    </div>
  );
}
