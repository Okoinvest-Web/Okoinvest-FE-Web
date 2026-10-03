import Button from "@/components/ui/Button";
import { SeitenKopf } from "@/components/Portal/ui";
import AnfragenListe from "@/components/Portal/Bedienung/Liste/AnfragenListe";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { pfad } from "@/lib/land";

export const metadata = { title: "Meine Anfragen" };

export default async function Anfragen() {
  const n = await portalNutzer();
  const vorgaenge = await backend().vorgaenge(n);

  return (
    <div>
      <SeitenKopf
        eyebrow="Anfragen"
        titel="Meine Anfragen"
        text="Alle Anfragen, die Sie über die Website gestellt haben – mit aktuellem Status, Verlauf und Nachrichten."
        aktionen={<Button href={pfad("/flaechencheck")} variant="secondary" size="sm">Neue Anfrage</Button>}
      />
      {!n.emailBestaetigt && (
        <p className="mb-5 rounded-2xl bg-sun-300/20 px-4 py-3 text-[14px] text-ink-800 ring-1 ring-inset ring-sun-400/40">
          Anfragen mit Ihrer E-Mail-Adresse erscheinen hier automatisch, sobald Sie die Adresse bestätigt haben.
        </p>
      )}
      <AnfragenListe vorgaenge={vorgaenge} jetzt={Date.now()} />
    </div>
  );
}
