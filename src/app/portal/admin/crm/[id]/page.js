import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarPlus, Copy, History, Mail, Phone, StickyNote, UserRound } from "lucide-react";
import { Angaben, Badge, Karte, SeitenKopf, StatusBadge } from "@/components/Portal/ui";
import { AktivitaetErfassen, BeziehungEntfernen, BeziehungSetzen, KontaktBearbeiten, VorlageSenden } from "@/components/Portal/Backoffice/Crm";
import { cn } from "@/components/ui/cn";
import { laden, portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { KONTAKT_ROLLEN } from "@/lib/plattform/crm";
import { datumZeit, relativ } from "@/lib/plattform/format";
import { darfSchreiben } from "@/lib/plattform/rechte";

export const metadata = { title: "Kontakt" };

const VERLAUF_ICON = { aktivitaet: StickyNote, status: History, nachricht: Mail, protokoll: History };
const VERLAUF_LABEL = { aktivitaet: "CRM", status: "Status", nachricht: "Nachricht", protokoll: "Protokoll" };

export default async function CrmKontakt({ params }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  if (!/^K-[0-9A-Z-]{4,40}$/.test(id)) notFound();
  const b = backend();
  const [k, organisationen, konten, vorlagen] = await Promise.all([laden(() => b.crmKontakt(n, id)), b.crmOrganisationen(n), b.adminKonten(n), b.vorlagen(n).catch(() => [])]);
  const schreiben = darfSchreiben(n, "crm");
  const titel = [k.anrede === "Divers" ? "" : k.anrede, k.titel, k.vorname, k.nachname].filter(Boolean).join(" ") || k.firma || k.email;

  return (
    <div className="space-y-6">
      <Link href="/portal/admin/crm" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ink-900">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Alle Kontakte
      </Link>
      <SeitenKopf eyebrow={`CRM · ${k.id}`} titel={titel} text={[k.funktion, k.organisation || k.firma].filter(Boolean).join(" · ") || undefined}>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {k.rollen.map((r) => <Badge key={r} ton="ok">{KONTAKT_ROLLEN[r] || r}</Badge>)}
          {k.tags.map((t) => <Badge key={t}>#{t}</Badge>)}
          {k.konto && <Badge ton="info">Portal-Konto</Badge>}
        </div>
      </SeitenKopf>

      {k.dubletten.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-sun-300/20 px-4 py-3 text-[14px] text-ink-900 ring-1 ring-inset ring-sun-400/40">
          <Copy aria-hidden="true" className="h-4 w-4" />
          <span className="font-semibold">Mögliche Dublette:</span>
          {k.dubletten.map((d) => (
            <Link key={d.id} href={`/portal/admin/crm/${d.id}`} className="underline underline-offset-2">{d.name} ({d.score} % – {d.gruende.join(", ")})</Link>
          ))}
          <Link href="/portal/admin/crm/dubletten" className="ml-auto font-semibold text-ov-800">Zusammenführen</Link>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-6">
          <Karte titel="Stammdaten" aktion={schreiben ? <KontaktBearbeiten kontakt={k} organisationen={organisationen} konten={konten} /> : null}>
            <Angaben
              items={[
                { label: "E-Mail", wert: k.email ? <a href={`mailto:${k.email}`} className="text-ov-700 underline-offset-2 hover:underline">{k.email}</a> : "–" },
                { label: "Telefon", wert: k.telefon ? <a href={`tel:${k.telefon.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 text-ov-700"><Phone aria-hidden="true" className="h-3.5 w-3.5" />{k.telefon}</a> : "–" },
                { label: "Ort", wert: [k.plz, k.ort].filter(Boolean).join(" ") + (k.land ? ` (${k.land})` : "") || "–" },
                { label: "Organisation", wert: k.organisationObjekt ? <Link href={`/portal/admin/crm/organisation/${k.organisationObjekt.id}`} className="text-ov-700 hover:underline">{k.organisationObjekt.name}</Link> : k.firma || "–" },
                { label: "Zuständig", wert: k.zustaendig ? [k.zustaendig.vorname, k.zustaendig.nachname].join(" ") : "–" },
                { label: "Quelle", wert: `${k.quelle === "anfrage" ? "Website-Anfrage" : k.quelle === "konto" ? "Portal-Konto" : "manuell"}${k.herkunft ? ` · ${k.herkunft}` : ""}` },
                { label: "Portal-Konto", wert: k.konto ? `${k.konto.email}` : "keins" },
                { label: "Angelegt", wert: relativ(k.erstelltAm) },
                { label: "Notiz", wert: k.notiz ? <span className="whitespace-pre-line">{k.notiz}</span> : null, breit: true },
              ]}
            />
          </Karte>

          <Karte titel="Beziehungen" untertitel="Vorgänge, Flächen, Projekte und Interessen dieses Kontakts">
            {k.bezuegeListe.length ? (
              <ul className="divide-y divide-ink-100">
                {k.bezuegeListe.map((x) => (
                  <li key={`${x.art}:${x.id}`} className="flex items-start gap-3 py-3 first:pt-0">
                    <div className="min-w-0 flex-1">
                      {x.link ? <Link href={x.link} className="font-semibold text-ink-900 hover:text-ov-700">{x.titel}</Link> : <span className="font-semibold text-ink-500">{x.titel}</span>}
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-500">
                        <span>{x.rolle}</span>
                        {x.status && <StatusBadge art={x.art} status={x.status} />}
                        {x.tags.map((t) => <span key={t} className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-700">#{t}</span>)}
                        <span className="font-mono">{x.id}</span>
                      </p>
                    </div>
                    {schreiben && <BeziehungEntfernen kontaktId={k.id} art={x.art} id={x.id} />}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-ink-500">Noch keine verknüpften Objekte.</p>
            )}
            {schreiben && <div className="mt-4 border-t border-ink-100 pt-4"><BeziehungSetzen kontaktId={k.id} /></div>}
          </Karte>

          {schreiben && (
            <Karte titel="E-Mail oder Nachricht aus Vorlage" untertitel="Platzhalter werden mit den Daten dieses Kontakts und Objekts gefüllt">
              <VorlageSenden kontaktId={k.id} vorlagen={vorlagen.filter((v) => v.aktiv)} bezuege={k.bezuegeListe.filter((x) => x.link)} hatEmail={!!k.email} />
            </Karte>
          )}
        </div>

        <div className="space-y-6">
          {schreiben && (
            <Karte titel="Aktivität erfassen" untertitel="Anruf, Termin, E-Mail oder Notiz – mit Wiedervorlage">
              <AktivitaetErfassen kontaktId={k.id} konten={konten} nutzerId={n.id} bezuege={k.bezuegeListe.filter((x) => x.link)} />
            </Karte>
          )}
          <Karte titel="Verlauf" untertitel="CRM-Aktivitäten, Statuswechsel und Nachrichten aller verknüpften Objekte">
            {k.verlauf.length ? (
              <ol className="relative space-y-4 border-l border-ink-100 pl-5">
                {k.verlauf.map((e, i) => {
                  const Icon = e.art === "aktivitaet" ? { anruf: Phone, termin: CalendarPlus, email: Mail, notiz: StickyNote }[e.typ] || StickyNote : VERLAUF_ICON[e.art] || History;
                  return (
                    <li key={i} className="relative">
                      <span className={cn("absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white", e.art === "aktivitaet" ? "bg-ov-600 text-white" : "bg-ink-100 text-ink-600")}>
                        <Icon aria-hidden="true" className="h-3 w-3" />
                      </span>
                      <p className="text-[12px] text-ink-500">{datumZeit(e.am)} · {VERLAUF_LABEL[e.art]} · {e.von}</p>
                      <p className="text-[14px] font-semibold leading-snug text-ink-900">{e.link ? <Link href={e.link} className="hover:text-ov-700">{e.titel}</Link> : e.titel}</p>
                      {e.text && <p className="mt-0.5 whitespace-pre-line text-[13.5px] leading-snug text-ink-600">{e.text}</p>}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-[14px] text-ink-500">Noch kein Verlauf.</p>
            )}
            <p className="mt-4 flex items-center gap-1.5 text-[12px] text-ink-400"><UserRound aria-hidden="true" className="h-3.5 w-3.5" /> Offene Wiedervorlagen erscheinen auch unter „Aufgaben“ und in der Glocke.</p>
          </Karte>
        </div>
      </div>
    </div>
  );
}
