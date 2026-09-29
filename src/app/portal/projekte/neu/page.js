import ProjektFormular from "@/components/Portal/ProjektFormular";
import { Karte, SeitenKopf } from "@/components/Portal/ui";
import { portalNutzer } from "@/lib/plattform/server/seite";

export const metadata = { title: "Projekt anlegen" };

export default async function ProjektNeu() {
  await portalNutzer({ rollen: ["anbieter"] });
  return (
    <div className="mx-auto max-w-4xl">
      <SeitenKopf eyebrow="Projektbörse" titel="Projekt anlegen" text="Ihr Projekt bleibt ein Entwurf, bis Sie es zur Prüfung einreichen. Jeder Schritt wird gespeichert." />
      <Karte>
        <ProjektFormular />
      </Karte>
    </div>
  );
}
