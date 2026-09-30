import { BenachrichtigungenListe, MailEinstellungen } from "@/components/Portal/Benachrichtigungen";
import { Karte, SeitenKopf } from "@/components/Portal/ui";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { benachrichtigungArtenFuer } from "@/lib/plattform/konstanten";

export const metadata = { title: "Benachrichtigungen" };

export default async function Benachrichtigungen() {
  const n = await portalNutzer();
  const d = await backend().benachrichtigungen(n, { limit: 200 });
  const arten = benachrichtigungArtenFuer(n.rollen || []);

  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Mein Portal"
        titel="Benachrichtigungen"
        text="Statuswechsel, Nachrichten, Datenraum-Freigaben und passende Projekte an einem Ort. Legen Sie fest, welche Ereignisse wir Ihnen zusätzlich per E-Mail melden."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Karte titel="Ereignisse" untertitel={`${d.ungelesen} ungelesen · ${d.gesamt} insgesamt`} innen="p-0">
          <BenachrichtigungenListe eintraege={d.eintraege} arten={arten} />
        </Karte>
        <Karte titel="E-Mail-Benachrichtigungen" untertitel="Je Ereignisart ein- oder ausschalten" className="self-start">
          <MailEinstellungen einstellungen={d.einstellungen} arten={arten} />
        </Karte>
      </div>
    </div>
  );
}
