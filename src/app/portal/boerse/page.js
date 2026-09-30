import Button from "@/components/ui/Button";
import BoerseAnsicht from "@/components/Portal/Bedienung/Liste/BoerseAnsicht";
import { Hinweis, SeitenKopf } from "@/components/Portal/ui";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { Sparkles } from "lucide-react";

export const metadata = { title: "Projektbörse" };

const FILTER = ["typ", "land", "phase", "mwpMin", "mwpMax", "sortierung", "ansicht"];

export default async function PortalBoerse({ searchParams }) {
  const n = await portalNutzer({ rollen: ["investor"] });
  const sp = await searchParams;
  const start = Object.fromEntries(FILTER.map((k) => [k, typeof sp?.[k] === "string" ? sp[k].slice(0, 20) : ""]).filter(([, v]) => v));
  if (!start.sortierung && n.suchprofil) start.sortierung = "passung";
  const daten = await backend().boerse(n, {});

  return (
    <div>
      <SeitenKopf
        eyebrow="Projektbörse"
        titel="Projekte finden"
        text="Alle veröffentlichten Projekte mit Passung zu Ihrem Suchprofil. Merken, NDA per Klick anfragen, Datenraum prüfen, LOI abgeben."
        aktionen={<Button href="/portal/profil#suchprofil" variant="secondary" size="sm" icon={Sparkles}>{n.suchprofil ? "Suchprofil bearbeiten" : "Suchprofil anlegen"}</Button>}
      />
      {!n.suchprofil && (
        <Hinweis ton="info" titel="Tipp: Suchprofil anlegen" className="mb-6">
          Mit Größe, Phasen, Ländern und Ticket berechnen wir für jedes Projekt einen Matching-Score und sortieren passende Projekte nach oben.
        </Hinweis>
      )}
      <BoerseAnsicht projekte={daten.projekte} start={start} />
    </div>
  );
}
