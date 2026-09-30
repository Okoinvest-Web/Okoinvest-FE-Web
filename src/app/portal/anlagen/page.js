import { SunMedium } from "lucide-react";
import Button from "@/components/ui/Button";
import { Leer, SeitenKopf } from "@/components/Portal/ui";
import AnlagenUebersicht from "@/components/Portal/Anlagen/AnlagenUebersicht";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { anlagenMitStatus } from "@/lib/plattform/messdaten/auswertung";
import { darfLesen } from "@/lib/plattform/rechte";

export const metadata = { title: "Anlagen & Monitoring" };

export default async function AnlagenSeite() {
  const n = await portalNutzer();
  const daten = await laden(() => anlagenMitStatus(n));
  const backoffice = n.rollen.includes("admin") && darfLesen(n, "anlagen");
  return (
    <>
      <SeitenKopf
        eyebrow="Anlagen & Monitoring"
        titel={backoffice ? "Alle Anlagen" : "Meine Anlagen"}
        text={
          backoffice
            ? "Alle Contracting-Anlagen mit Live-Leistung, Erträgen und Zustand. Störungen bearbeiten Sie im Störungs-Leitstand."
            : "Ihre PV-Anlagen und Speicher aus dem Contracting mit ÖkoInvest: Leistung jetzt, Erträge, Eigenverbrauch und Zustand auf einen Blick."
        }
        aktionen={backoffice ? <Button href="/portal/admin/anlagen" size="sm" variant="navy">Störungs-Leitstand</Button> : null}
      />
      {daten.anlagen.length ? (
        <AnlagenUebersicht initial={JSON.parse(JSON.stringify(daten))} />
      ) : (
        <Leer
          icon={SunMedium}
          titel="Noch keine Anlagen zugeordnet"
          text="Sobald ÖkoInvest eine Contracting-Anlage für Ihr Unternehmen in Betrieb nimmt, erscheint sie hier mit Live-Werten, Erträgen und Störungsmeldungen."
          aktion={<Button href="/portal/nachrichten" size="sm" variant="secondary">Nachricht an ÖkoInvest</Button>}
        />
      )}
    </>
  );
}
