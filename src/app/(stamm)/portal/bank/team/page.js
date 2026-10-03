import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { Badge, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import { EinladungWiderrufen, TeamEinladen, TeamRolle } from "@/components/Portal/Finanzierung/BankAkte";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { bankakteBackend } from "@/lib/plattform/backend/bankakte";
import { BANK_TEAMROLLEN } from "@/lib/plattform/finanzierung/bankakte";

export const metadata = { title: "Bank-Team" };

// Bank-Team: mehrere Sachbearbeiter je Bank, Rollen Leitung / Sachbearbeitung / Nur lesen; verwalten nur die Leitung
export default async function BankTeamSeite() {
  const n = await portalNutzer({ rollen: ["bank"] });
  const t = await laden(() => bankakteBackend().baTeam(n));
  return (
    <>
      <Link href="/portal/bank" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Finanzierungsanfragen</Link>
      <SeitenKopf eyebrow={t.bank.name} titel="Team Ihres Hauses" text={`Wer in Ihrem Haus Anfragen von ÖkoInvest sieht und bearbeitet. Ihre Rolle: ${t.rolleLabel}.`} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Karte titel={`Mitglieder (${t.mitglieder.length})`} aktion={<Users aria-hidden="true" className="h-5 w-5 text-ink-400" />} innen="p-0">
            <ul className="divide-y divide-ink-100">
              {t.mitglieder.map((m) => (
                <li key={m.id} className="flex flex-col gap-2 px-5 py-3.5 md:flex-row md:items-center md:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold text-ink-900">{m.name}{m.ich ? " (Sie)" : ""}</p>
                    <p className="break-all text-[12.5px] text-ink-500">{m.email}</p>
                  </div>
                  {t.darfVerwalten && !m.ich ? <TeamRolle bankId={t.bank.id} m={m} /> : <Badge ton={m.rolle === "leitung" ? "info" : "neutral"}>{BANK_TEAMROLLEN[m.rolle]?.label}</Badge>}
                </li>
              ))}
            </ul>
          </Karte>
          {t.darfVerwalten && t.einladungen.length > 0 && (
            <Karte titel="Offene Einladungen" innen="p-0">
              <ul className="divide-y divide-ink-100">
                {t.einladungen.map((e) => (
                  <li key={e.id} className="flex flex-col gap-2 px-5 py-3 md:flex-row md:items-center md:px-6">
                    <p className="min-w-0 flex-1 break-all text-[14px] text-ink-900">{e.email} <span className="text-[12.5px] text-ink-500">· {BANK_TEAMROLLEN[e.rolle]?.label} · gültig bis {new Date(e.ablauf).toLocaleDateString("de-DE")}</span></p>
                    <EinladungWiderrufen bankId={t.bank.id} id={e.id} />
                  </li>
                ))}
              </ul>
            </Karte>
          )}
        </div>
        <div className="space-y-6">
          {t.darfVerwalten ? (
            <Karte titel="Kollegin oder Kollegen einladen" untertitel={`Nur Adressen Ihres Hauses (@${t.domain}); der Link ist 7 Tage gültig und nur mit Anmeldung unter dieser Adresse nutzbar.`}>
              <TeamEinladen bankId={t.bank.id} domain={t.domain} />
            </Karte>
          ) : (
            <Hinweis ton="neutral">Das Team verwaltet die Leitung Ihres Hauses.</Hinweis>
          )}
          <Karte titel="Rollen">
            <dl className="space-y-3">{Object.entries(BANK_TEAMROLLEN).map(([k, r]) => <div key={k}><dt className="text-[14px] font-semibold text-ink-900">{r.label}</dt><dd className="text-[13px] text-ink-600">{r.text}</dd></div>)}</dl>
          </Karte>
          <p className="text-[12.5px] leading-relaxed text-ink-500">Weitergabe von Unterlagen an Gremien, Berater oder Refinanzierer nur nach Zustimmung von ÖkoInvest (Vertraulichkeitsbedingungen für Banken). Entfernte Mitglieder verlieren den Zugang sofort.</p>
        </div>
      </div>
    </>
  );
}
