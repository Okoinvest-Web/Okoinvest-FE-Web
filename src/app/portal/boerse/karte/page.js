import { KanbanSquare, List } from "lucide-react";
import Button from "@/components/ui/Button";
import BoerseListe from "@/components/Boerse/BoerseListe";
import { SeitenKopf } from "@/components/Portal/ui";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";

export const metadata = { title: "Projektbörse – Karte" };

const FILTER = ["typ", "land", "phase", "mwpMin", "mwpMax", "sortierung", "ansicht", "region"];

export default async function PortalBoerseKarte({ searchParams }) {
  const n = await portalNutzer({ rollen: ["investor"] });
  const sp = await searchParams;
  const start = { darstellung: "karte", ...Object.fromEntries(FILTER.map((k) => [k, typeof sp?.[k] === "string" ? sp[k].slice(0, 40) : ""]).filter(([, v]) => v)) };
  if (!start.sortierung && n.suchprofil) start.sortierung = "passung";
  const daten = await backend().boerse(n, {});

  return (
    <div>
      <SeitenKopf
        eyebrow="Projektbörse"
        titel="Projekte auf der Karte"
        text="Veröffentlichte Projekte je Bundesland bzw. Kanton – nur grobe Region, nie die genaue Lage. Klick auf einen Cluster filtert die Liste."
        aktionen={
          <>
            <Button href="/portal/boerse" variant="secondary" size="sm" icon={List}>Listenansicht</Button>
            <Button href="/portal/pipeline" variant="secondary" size="sm" icon={KanbanSquare}>Deal-Pipeline</Button>
          </>
        }
      />
      <BoerseListe projekte={daten.projekte} basisHref="/portal/boerse/" portal start={start} />
    </div>
  );
}
