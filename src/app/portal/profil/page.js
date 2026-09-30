import Link from "next/link";
import { MailCheck, MailWarning } from "lucide-react";
import { StammdatenFormular, SuchprofilFormular } from "@/components/Portal/ProfilFormulare";
import { Badge, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import { portalNutzer, hatRolle } from "@/lib/plattform/server/seite";
import { backend, istDemo } from "@/lib/plattform/backend";
import { nutzerFuerBrowser } from "@/lib/plattform/server/route";
import { LAENDER } from "@/lib/plattform/konstanten";
import { mwp, preisText } from "@/lib/plattform/format";
import { phaseById } from "@/lib/invest/markt";
import { DatenUndLoeschung, EmailAendern, KomfortFormular, PasswortAendern } from "@/components/Portal/Sicherheit/Konto"; // Login, Sicherheit & Teams

export const metadata = { title: "Profil" };

export default async function Profil({ searchParams }) {
  const sp = await searchParams;
  const n = await portalNutzer();
  const investor = hatRolle(n, "investor") && n.rollen.includes("investor");
  const boerse = investor ? await backend().boerse(n, {}) : null;
  const passende = boerse ? boerse.projekte.filter((p) => p.matching).sort((a, b) => b.matching.score - a.matching.score).slice(0, 6) : [];

  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Konto" titel={investor ? "Profil & Suchprofil" : "Profil"} text="Ihre Stammdaten, Rollen und Sicherheit." />
      {sp?.hinweis === "email-geaendert" && <Hinweis ton="ok" icon={MailCheck} titel="E-Mail-Adresse geändert">Ab sofort melden Sie sich mit {n.email} an.</Hinweis>}
      {n.emailBestaetigt ? (
        <Hinweis ton="ok" icon={MailCheck}>E-Mail-Adresse {n.email} ist bestätigt.</Hinweis>
      ) : (
        <Hinweis ton="warn" icon={MailWarning} titel="E-Mail-Adresse noch nicht bestätigt">
          Wir haben Ihnen einen Bestätigungslink an {n.email} gesendet. Nach der Bestätigung ordnen wir frühere Anfragen mit dieser Adresse Ihrem Konto zu.
          {istDemo() && " (Demo-Modus: Der Link steht im Server-Log und im Backoffice.)"}
        </Hinweis>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Karte titel="Stammdaten & Rollen">
          <StammdatenFormular nutzer={nutzerFuerBrowser(n)} />
        </Karte>
        <Karte titel="Passwort ändern" untertitel="Zwei-Faktor, Sitzungen und Geräte unter „Sicherheit“">
          <PasswortAendern email={n.email} name={`${n.vorname} ${n.nachname}`} />
        </Karte>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Karte titel="Darstellung & Benachrichtigungen" untertitel="Avatar, Sprache, Kanäle">
          <KomfortFormular nutzer={nutzerFuerBrowser(n)} />
        </Karte>
        <Karte titel="E-Mail-Adresse ändern" untertitel="Wirksam nach Bestätigung der neuen Adresse">
          <EmailAendern email={n.email} />
        </Karte>
      </div>

      {investor && (
        <div id="suchprofil" className="grid scroll-mt-24 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Karte titel={n.organisation ? `Team-Suchprofil · ${n.organisation.name}` : "Suchprofil"} untertitel={n.organisation ? "Gilt für alle Mitglieder der Organisation" : "Grundlage für den Matching-Score in der Projektbörse"}>
            <SuchprofilFormular profil={n.suchprofil} />
          </Karte>
          <Karte titel="Passende Projekte" untertitel={n.suchprofil ? "Nach Matching-Score" : "Suchprofil speichern, um Passung zu sehen"}>
            {passende.length ? (
              <ul className="divide-y divide-ink-100">
                {passende.map((p) => (
                  <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                    <Link href={`/portal/boerse/${p.id}`} className="group block">
                      <span className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-[14.5px] font-semibold text-ink-900 group-hover:text-ov-700">{p.titel}</span>
                        <Badge ton={p.matching.score >= 70 ? "ok" : "neutral"}>{p.matching.score} %</Badge>
                      </span>
                      <span className="mt-0.5 block text-[12.5px] text-ink-500">{[mwp(p.mwp), phaseById(p.phase).kurz, LAENDER[p.land], preisText(p)].join(" · ")}</span>
                      {p.matching.gruende.length > 0 && <span className="mt-1 block text-[12px] text-ov-700">Passt: {p.matching.gruende.join(", ")}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-ink-500">Noch keine Auswertung – speichern Sie Ihr Suchprofil.</p>
            )}
          </Karte>
        </div>
      )}
      <Karte titel="Ihre Daten" untertitel="Auskunft, Datenübertragbarkeit, Löschung (DSGVO)">
        <DatenUndLoeschung />
      </Karte>
    </div>
  );
}
