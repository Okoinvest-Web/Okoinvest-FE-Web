import Link from "next/link";
import { Building2, UsersRound } from "lucide-react";
import { Badge, Hinweis, Karte, Leer, SeitenKopf } from "@/components/Portal/ui";
import { KontextKnopf, OrganisationAnlegen, OrganisationVerwaltung } from "@/components/Portal/Sicherheit/Organisation";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";
import { ORGANISATION_ARTEN, TEAM_ROLLEN, teamRolleLabel } from "@/lib/plattform/organisation";
import { cn } from "@/components/ui/cn";

export const metadata = { title: "Organisation & Team" };

export default async function OrganisationSeite({ searchParams }) {
  const sp = await searchParams;
  const n = await portalNutzer();
  const s = sicherheit();
  const { organisationen, aktiv } = await s.organisationen(n);
  const gewaehlt = organisationen.find((o) => o.id === sp?.id) || organisationen.find((o) => o.id === aktiv) || organisationen[0] || null;
  const org = gewaehlt ? await s.organisation(n, gewaehlt.id).catch(() => null) : null;

  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Konto"
        titel="Organisation & Team"
        text="Firmenkonto für Investmenthaus, Projektentwickler, Stadtwerk oder Betrieb: Flächen, Projekte, Interessen und Suchprofil gehören der Organisation – jedes Mitglied sieht sie gemäß seiner Rolle."
      />

      {organisationen.length === 0 ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Karte titel="Organisation anlegen" untertitel="Sie werden Inhaber und können Kolleginnen und Kollegen einladen">
            <OrganisationAnlegen offen />
          </Karte>
          <Karte titel="Teamrollen">
            <ul className="space-y-3">
              {Object.entries(TEAM_ROLLEN).map(([k, r]) => (
                <li key={k}>
                  <p className="text-[14px] font-semibold text-ink-900">{r.label}</p>
                  <p className="text-[13.5px] leading-relaxed text-ink-600">{r.text}</p>
                </li>
              ))}
            </ul>
          </Karte>
        </div>
      ) : (
        <>
          <nav aria-label="Ihre Organisationen" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {organisationen.map((o) => (
              <Link
                key={o.id}
                href={`/portal/organisation?id=${o.id}`}
                aria-current={org?.id === o.id ? "page" : undefined}
                className={cn("flex min-w-0 shrink-0 items-center gap-2.5 rounded-2xl px-4 py-3 ring-1 ring-inset transition-colors", org?.id === o.id ? "bg-navy-950 text-white ring-navy-950" : "bg-white text-ink-800 ring-ink-200 hover:ring-ink-300")}
              >
                <Building2 aria-hidden="true" className={cn("h-4 w-4 shrink-0", org?.id === o.id ? "text-ov-300" : "text-navy-600")} />
                <span className="min-w-0">
                  <span className="block max-w-[220px] truncate text-[14px] font-semibold">{o.name}</span>
                  <span className={cn("block text-[12px]", org?.id === o.id ? "text-white/60" : "text-ink-500")}>
                    {teamRolleLabel(o.rolle)} · {o.mitglieder} Mitglied{o.mitglieder === 1 ? "" : "er"}
                    {o.id === aktiv ? " · aktiv" : ""}
                  </span>
                </span>
              </Link>
            ))}
          </nav>

          {org ? (
            <>
              <div className="flex flex-col gap-3 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 sm:flex-row sm:items-center sm:justify-between md:p-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy-50 text-navy-700">
                    <UsersRound aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="break-words font-display text-[20px] font-extrabold text-ink-900">{org.name}</h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[13.5px] text-ink-600">
                      {ORGANISATION_ARTEN[org.art]?.label}
                      <Badge ton="info">{teamRolleLabel(org.rolle)}</Badge>
                    </p>
                  </div>
                </div>
                <KontextKnopf org={org} aktiv={org.id === aktiv} />
              </div>
              {org.id !== aktiv && (
                <Hinweis ton="info">
                  Listen (Flächen, Projekte, Merkliste) zeigen die Objekte dieser Organisation, sobald Sie in ihren Kontext wechseln – oben rechts im Portal-Kopf oder mit dem Knopf. Neue Objekte legen Sie dann direkt für das Team an.
                </Hinweis>
              )}
              <OrganisationVerwaltung key={org.id} org={org} />
            </>
          ) : (
            <Leer icon={Building2} titel="Organisation nicht verfügbar" text="Sie sind kein Mitglied (mehr) dieser Organisation." />
          )}

          <Karte titel="Weitere Organisation anlegen">
            <OrganisationAnlegen />
          </Karte>
        </>
      )}
    </div>
  );
}
