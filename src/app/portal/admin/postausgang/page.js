import { MailWarning } from "lucide-react";
import Postausgang from "@/components/Portal/Postausgang";
import { Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend, istDemo } from "@/lib/plattform/backend";

export const metadata = { title: "E-Mail-Postausgang" };

export default async function AdminPostausgang() {
  const n = await portalNutzer({ admin: true });
  const mails = await backend().postausgang(n, { limit: 300 });
  const demo = istDemo();

  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Backoffice"
        titel="E-Mail-Postausgang"
        text="Alle E-Mails, die das System versenden würde: Bestätigung, Passwort, Benachrichtigungen und Suchprofil-Treffer – mit Vorschau im Markenstil."
      />
      {demo ? (
        <Hinweis ton="warn" icon={MailWarning} titel="Demo-Modus: Es wird nichts versendet">
          Im Betrieb verschickt die Frappe-App diese E-Mails über ihre Mail-Warteschlange (Vorlagen <code className="text-[13px]">oekoinvest_*</code>). Benachrichtigungen enthalten nie vertrauliche Inhalte – nur Hinweis und Link ins Portal. Ob eine Benachrichtigung per E-Mail geht, legt jedes Konto selbst fest.
        </Hinweis>
      ) : (
        <Hinweis ton="info" icon={MailWarning} titel="Versand über Frappe">
          Im Frappe-Betrieb werden E-Mails direkt über die Mail-Warteschlange versendet. Den Versandstatus sehen Sie im Frappe-Desk unter „Email Queue“.
        </Hinweis>
      )}
      <Karte titel="Postausgang" untertitel={`${mails.length} E-Mails`} innen="p-0">
        <Postausgang mails={mails} />
      </Karte>
    </div>
  );
}
