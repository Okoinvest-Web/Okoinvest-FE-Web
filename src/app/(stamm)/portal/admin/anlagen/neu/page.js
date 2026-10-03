import { notFound } from "next/navigation";
import { SeitenKopf } from "@/components/Portal/ui";
import { AnlageAssistent } from "@/components/Portal/Anlagen/AdminFormulare";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";
import { darfSchreiben } from "@/lib/plattform/rechte";

export const metadata = { title: "Anlage anlegen" };

export default async function AnlageNeuSeite() {
  const n = await portalNutzer({ admin: true });
  if (!darfSchreiben(n, "anlagen")) notFound();
  const kunden = await laden(() => anlagenBackend().anlagenKunden(n));
  return (
    <>
      <SeitenKopf eyebrow="Backoffice · Betrieb" titel="Anlage anlegen" text="In vier Schritten: Anlage, Standort und Technik, Kunde bzw. Organisation, Contracting-Vertrag. Danach verbinden Sie den Datenlogger per MQTT." />
      <div className="max-w-3xl">
        <AnlageAssistent kunden={kunden} />
      </div>
    </>
  );
}
