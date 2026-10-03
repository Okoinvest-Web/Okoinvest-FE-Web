import { SeitenKopf } from "@/components/Portal/ui";
import Assistent from "@/components/Portal/Entwicklung/Assistent";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";
import { darfSchreiben } from "@/lib/plattform/rechte";
import { notFound } from "next/navigation";

export const metadata = { title: "Neues Entwicklungsprojekt" };

export default async function NeuesEntwicklungsprojekt({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  if (!darfSchreiben(n, "entwicklung")) notFound();
  const sp = await searchParams;
  const auswahl = await laden(() => entwicklungBackend().entwicklungAuswahl(n));
  const flaeche = /^[A-Z]{1,3}-[0-9A-Z-]{4,40}$/.test(String(sp?.flaeche || "")) ? sp.flaeche : "";
  return (
    <>
      <SeitenKopf
        eyebrow="Backoffice · Projektentwicklung"
        titel="Neues Projekt aus Fläche"
        text="Der Assistent schlägt Typ und Leistung aus der Fläche vor und legt den Meilenstein-Plan nach der Vorlage für Land und Projekttyp an – mit Soll-Terminen, Abhängigkeiten, Dokumentenpflichten und kritischem Pfad."
      />
      <Assistent auswahl={auswahl} startFlaeche={flaeche} />
    </>
  );
}
