import { BenachrichtigungenListe, MailEinstellungen } from "@/components/Portal/Benachrichtigungen";
import RhythmusWahl from "@/components/Portal/Querschnitt/RhythmusWahl"; // Querschnitt: sofort | Tages-Digest
import { Karte, SeitenKopf } from "@/components/Portal/ui";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { querschnittBackend } from "@/lib/plattform/backend/querschnitt";
import { benachrichtigungArtenFuer } from "@/lib/plattform/konstanten";

export const metadata = { title: "Benachrichtigungen" };

export default async function Benachrichtigungen() {
  const n = await portalNutzer();
  const [d, rhythmus] = await Promise.all([
    backend().benachrichtigungen(n, { limit: 200 }),
    querschnittBackend().mailRhythmus(n).catch(() => ({ rhythmus: "sofort" })),
  ]);
  const arten = benachrichtigungArtenFuer(n.rollen || []);

  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Mein Portal"
        titel="Benachrichtigungen"
        text="Statuswechsel, Nachrichten, Datenraum-Freigaben und passende Projekte an einem Ort. Im Portal sehen Sie jedes Ereignis; per E-Mail nur die Arten, die Sie wählen – sofort oder gesammelt als Tages-Digest."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Karte titel="Ereignisse" untertitel={`${d.ungelesen} ungelesen · ${d.gesamt} insgesamt`} innen="p-0">
          <BenachrichtigungenListe eintraege={d.eintraege} arten={arten} />
        </Karte>
        <div className="min-w-0 space-y-6 self-start">
          <Karte titel="E-Mail-Rhythmus" untertitel="Sofort oder einmal täglich">
            <RhythmusWahl start={rhythmus} />
          </Karte>
          <Karte titel="E-Mail je Ereignisart" untertitel="Portal: immer · E-Mail: ein- oder ausschalten">
            <MailEinstellungen einstellungen={d.einstellungen} arten={arten} />
          </Karte>
        </div>
      </div>
    </div>
  );
}
