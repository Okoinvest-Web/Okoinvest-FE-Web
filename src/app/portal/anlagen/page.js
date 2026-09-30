import { SunMedium } from "lucide-react";
import Button from "@/components/ui/Button";
import { Leer, SeitenKopf } from "@/components/Portal/ui";
import AnlagenUebersicht from "@/components/Portal/Anlagen/AnlagenUebersicht";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { anlagenMitStatus } from "@/lib/plattform/messdaten/auswertung";
import { darfLesen } from "@/lib/plattform/rechte";

export const metadata = { title: "Solarstrom & Anlagen" };

export default async function AnlagenSeite() {
  const n = await portalNutzer();
  const daten = await laden(() => anlagenMitStatus(n));
  const backoffice = n.rollen.includes("admin") && darfLesen(n, "anlagen");
  return (
    <>
      <SeitenKopf
        eyebrow={backoffice ? "Anlagen & Monitoring" : "Stromlieferung vor Ort"}
        titel={backoffice ? "Alle Anlagen" : "Mein Solarstrom"}
        text={
          backoffice
            ? "Alle Contracting-Anlagen mit Live-Leistung, Erträgen und Zustand. Störungen bearbeiten Sie im Störungs-Leitstand."
            : "Solarstrom, den ÖkoInvest mit eigenen Anlagen an Ihrem Standort erzeugt und an Sie liefert: gelieferte Mengen, Deckungsanteil, Reststrom aus dem Netz und Kosten nach Vertrag. Die Anlagen stehen im Eigentum und Betrieb von ÖkoInvest bzw. einer ÖkoInvest-Projektgesellschaft."
        }
        aktionen={backoffice ? <Button href="/portal/admin/anlagen" size="sm" variant="navy">Störungs-Leitstand</Button> : null}
      />
      {daten.anlagen.length ? (
        <AnlagenUebersicht initial={JSON.parse(JSON.stringify(daten))} />
      ) : (
        <Leer
          icon={SunMedium}
          titel="Noch keine Stromlieferung vor Ort"
          text="Sobald ÖkoInvest an Ihrem Standort eine Anlage in Betrieb nimmt und Sie mit Solarstrom beliefert, erscheinen hier gelieferte Mengen, Kosten und Störungsmeldungen."
          aktion={<Button href="/portal/nachrichten" size="sm" variant="secondary">Nachricht an ÖkoInvest</Button>}
        />
      )}
    </>
  );
}
