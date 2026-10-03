// /portal/anliegen – Anliegen des Contracting-Kunden (Kundenseite Energie): Einspruch gegen eine Rechnung, Störung melden,
// Kündigung zum Laufzeitende, Verlängerung, Übernahme der Anlage (Kaufoption). Status, Angebote, Entscheidungen und PDFs.
// Rolle „unternehmen“ (Backoffice bearbeitet unter /portal/admin/finanzen/anliegen).

import { redirect } from "next/navigation";
import { MessageSquareWarning } from "lucide-react";
import Button from "@/components/ui/Button";
import { Hinweis, Karte, Leer, SeitenKopf } from "@/components/Portal/ui";
import { AnliegenFormular } from "@/components/Portal/Kundenenergie/Formulare";
import { AnliegenKarte } from "@/components/Portal/Kundenenergie/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { kundenenergieBackend } from "@/lib/plattform/backend/kundenenergie";

export const metadata = { title: "Anliegen & Einsprüche" };

export default async function AnliegenSeite({ searchParams }) {
  const n = await portalNutzer({ rollen: ["unternehmen"] });
  if (n.rollen.includes("admin")) redirect("/portal/admin/finanzen/anliegen");
  const sp = (await searchParams) || {};
  const b = kundenenergieBackend();
  const [liste, auswahl] = await Promise.all([laden(() => b.kundenAnliegen(n, { status: "alle" })), laden(() => b.kundenAnliegenAuswahl(n))]);
  const offen = liste.filter((a) => a.offen);
  const erledigt = liste.filter((a) => !a.offen);
  const vorwahl = { art: String(sp.art || ""), beleg: String(sp.beleg || ""), anlage: String(sp.anlage || "") };
  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Mein Solarstrom · Service"
        titel="Anliegen & Einsprüche"
        text="Rechnung beanstanden, Störung melden, Kündigung zum Laufzeitende erklären, Verlängerung oder Übernahme der Anlage anfragen – mit Eingangsbestätigung, Bearbeitungsziel und schriftlicher Entscheidung als PDF."
        aktionen={<Button href="/portal/abrechnungen" size="sm" variant="secondary">Abrechnungen</Button>}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Karte id="neu" titel="Neues Anliegen" untertitel="Einspruch, Störung, Vertragsende">
          <AnliegenFormular auswahl={auswahl} vorwahl={vorwahl} />
        </Karte>
        <div className="space-y-4">
          <Hinweis ton="info" titel="So läuft es ab">
            Sie erhalten sofort eine Eingangsbestätigung. Ein Einspruch setzt die Mahnung der Rechnung aus, bis entschieden ist; unstrittige Beträge begleichen Sie bitte wie gewohnt. Wird Ihrem Einspruch stattgegeben, erhalten Sie eine Gutschrift bzw. Korrekturrechnung. Angebote zu Verlängerung oder Übernahme nehmen Sie hier an – der Nachtrag bzw. Kaufvertrag folgt zur Unterschrift.
          </Hinweis>
          <Hinweis ton="neutral" titel="Abgerechnet wird nach geeichten Zählern">
            Abweichungen zwischen Live-Monitoring und Rechnung sind normal. Maßgeblich sind die Monatswerte der geeichten Messstelle – diese finden Sie in der Anlage unter „Zählerstände“ und auf jeder Rechnung.
          </Hinweis>
        </div>
      </div>
      <section aria-labelledby="offen">
        <h2 id="offen" className="mb-3 font-display text-[20px] font-bold text-ink-900">Offen ({offen.length})</h2>
        {offen.length ? <ul className="grid gap-4">{offen.map((a) => <AnliegenKarte key={a.id} a={a} />)}</ul> : <Leer icon={MessageSquareWarning} titel="Keine offenen Anliegen" text="Neue Anliegen reichen Sie oben ein. Störungen erkennt das Monitoring zusätzlich automatisch." />}
      </section>
      {erledigt.length > 0 && (
        <section aria-labelledby="erledigt">
          <h2 id="erledigt" className="mb-3 font-display text-[20px] font-bold text-ink-900">Abgeschlossen ({erledigt.length})</h2>
          <ul className="grid gap-4">{erledigt.map((a) => <AnliegenKarte key={a.id} a={a} />)}</ul>
        </section>
      )}
    </div>
  );
}
