import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Angaben, Badge, Karte, SeitenKopf, StatusBadge } from "@/components/Portal/ui";
import { AktivitaetErfassen, OrganisationBearbeiten } from "@/components/Portal/Backoffice/Crm";
import { laden, portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { AKTIVITAET_TYPEN, KONTAKT_ROLLEN, ORG_ARTEN } from "@/lib/plattform/crm";
import { datumZeit } from "@/lib/plattform/format";
import { darfSchreiben } from "@/lib/plattform/rechte";

export const metadata = { title: "Organisation" };

export default async function CrmOrganisation({ params }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  if (!/^K?O-[0-9A-Z-]{4,40}$/.test(id)) notFound();
  const b = backend();
  const [o, konten] = await Promise.all([laden(() => b.crmOrganisation(n, id)), b.adminKonten(n)]);
  const schreiben = darfSchreiben(n, "crm");
  return (
    <div className="space-y-6">
      <Link href="/portal/admin/crm?ansicht=organisationen" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ink-900">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Alle Organisationen
      </Link>
      <SeitenKopf eyebrow={`${ORG_ARTEN[o.art] || o.art} · ${o.id}`} titel={o.name} text={[[o.plz, o.ort].filter(Boolean).join(" "), o.bundesland, o.land].filter(Boolean).join(" · ")}>
        {o.tags?.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{o.tags.map((t) => <Badge key={t}>#{t}</Badge>)}</div>}
      </SeitenKopf>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <Karte titel="Stammdaten" aktion={schreiben ? <OrganisationBearbeiten organisation={o} /> : null}>
            <Angaben items={[{ label: "Website", wert: o.website || "–" }, { label: "Telefon", wert: o.telefon || "–" }, { label: "E-Mail", wert: o.email || "–" }, { label: "Notiz", wert: o.notiz ? <span className="whitespace-pre-line">{o.notiz}</span> : null, breit: true }]} />
          </Karte>
          <Karte titel={`Kontakte (${o.kontakteListe.length})`}>
            {o.kontakteListe.length ? (
              <ul className="divide-y divide-ink-100">
                {o.kontakteListe.map((k) => (
                  <li key={k.id} className="py-3 first:pt-0">
                    <Link href={`/portal/admin/crm/${k.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{[k.vorname, k.nachname].filter(Boolean).join(" ")}</Link>
                    <p className="text-[13px] text-ink-600">{[k.funktion, k.email, k.telefon].filter(Boolean).join(" · ")}</p>
                    <p className="mt-1 flex flex-wrap gap-1">{k.rollen.map((r) => <span key={r} className="rounded-full bg-ov-50 px-2 py-0.5 text-[11px] font-semibold text-ov-800">{KONTAKT_ROLLEN[r]}</span>)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-ink-500">Noch keine Kontakte – im Kontakt die Organisation wählen.</p>
            )}
          </Karte>
          <Karte titel="Objekte" untertitel="Über die Kontakte verknüpft">
            {o.bezuege.length ? (
              <ul className="space-y-2.5">
                {o.bezuege.map((x) => (
                  <li key={`${x.art}:${x.id}`} className="flex flex-wrap items-center gap-2 text-[14px]">
                    {x.link ? <Link href={x.link} className="font-semibold text-ink-900 hover:text-ov-700">{x.titel}</Link> : x.titel}
                    {x.status && <StatusBadge art={x.art} status={x.status} />}
                    <span className="text-[12.5px] text-ink-500">{x.rolle} · {x.kontakt}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-ink-500">Keine Objekte verknüpft.</p>
            )}
          </Karte>
        </div>
        <div className="space-y-6">
          {schreiben && (
            <Karte titel="Aktivität erfassen">
              <AktivitaetErfassen organisationId={o.id} konten={konten} nutzerId={n.id} />
            </Karte>
          )}
          <Karte titel="Aktivitäten">
            {o.aktivitaeten.length ? (
              <ul className="space-y-3">
                {o.aktivitaeten.map((a) => (
                  <li key={a.id} className="rounded-2xl bg-sand-50 p-3.5 ring-1 ring-ink-200/60">
                    <p className="text-[12px] text-ink-500">{datumZeit(a.am)} · {AKTIVITAET_TYPEN[a.typ]} · {a.von}{a.kontakt ? ` · ${a.kontakt.name}` : ""}</p>
                    <p className="font-semibold text-ink-900">{a.betreff}</p>
                    {a.text && <p className="mt-0.5 whitespace-pre-line text-[13.5px] text-ink-600">{a.text}</p>}
                    {a.wiedervorlage && <p className="mt-1 text-[12.5px] font-semibold text-ink-700">Wiedervorlage {a.wiedervorlage.faelligAm.split("-").reverse().join(".")} ({a.wiedervorlage.status})</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-ink-500">Noch keine Aktivitäten.</p>
            )}
          </Karte>
        </div>
      </div>
    </div>
  );
}
