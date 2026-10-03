// /portal/admin/leads – Lead-Desk (Welle 2, Paket B3)
//
// Jede Anfrage mit Land, Zuständigkeit (oder sichtbar „ohne Zuständigkeit“), Score, SLA-Ampel und Kanal-Ampel;
// Median/P90 bis zum Erstkontakt je Land und Typ; Absagecodes; Status der Einwilligungskette.
// Zielzeiten sind INTERN – öffentlich gibt es keine Zeitzusage (Welle-1-Regel). Recht: Bereich „Vorgänge“.

import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleUserRound, Gauge, Inbox, Link2, ListChecks, MapPinned, ShieldAlert, ShieldCheck, Siren, UsersRound } from "lucide-react";
import { Badge, Hinweis, Karte, Kennzahl, SeitenKopf } from "@/components/Portal/ui";
import { KetteNeuPruefen } from "@/components/Portal/Backoffice/Rechte";
import { KanalAmpel, LAND_NAME, LeerZeile, ScoreBadge, SlaAmpel, SlaTabelle, dauer } from "@/components/Portal/Leads/Anzeige";
import LeadAktionen from "@/components/Portal/Leads/LeadAktionen";
import { cn } from "@/components/ui/cn";
import { laden, portalNutzer } from "@/lib/plattform/server/seite";
import { leadketteBackend } from "@/lib/plattform/backend/leadkette";
import { darfLesen, darfSchreiben } from "@/lib/plattform/rechte";
import { datumZeit } from "@/lib/plattform/format";
import { fmt } from "@/lib/rechner/annahmen";
import { LEAD_TYPEN } from "@/data/lead-routing";

export const metadata = { title: "Lead-Desk" };

const LAENDER = [["", "Alle Länder"], ["DE", "Deutschland"], ["AT", "Österreich"], ["CH", "Schweiz"], ["unbekannt", "Land unbekannt"]];
const ZEITRAEUME = [["30", "30 Tage"], ["90", "90 Tage"], ["365", "12 Monate"]];
const TYP_LABEL = Object.fromEntries(Object.entries(LEAD_TYPEN).map(([k, t]) => [k, t.label]));
const kurz = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "–");

function Pillen({ werte, aktiv, href, label }) {
  return (
    <nav aria-label={label} className="-mx-1 flex max-w-full gap-1 overflow-x-auto rounded-full bg-ink-100 p-1 text-[13px] font-semibold">
      {werte.map(([w, t]) => (
        <Link key={w || "alle"} href={href(w)} aria-current={aktiv === w ? "page" : undefined} className={cn("shrink-0 rounded-full px-3 py-1.5 transition-colors", aktiv === w ? "bg-white text-ink-900 shadow-sm" : "text-ink-600 hover:text-ink-900")}>
          {t}
        </Link>
      ))}
    </nav>
  );
}

export default async function LeadDesk({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  if (!darfLesen(n, "vorgaenge")) notFound();
  const sp = await searchParams;
  const land = LAENDER.some(([w]) => w === sp?.land) ? sp.land : "";
  const tage = ZEITRAEUME.some(([w]) => w === sp?.tage) ? sp.tage : "90";
  const d = await laden(() => leadketteBackend().leadDesk(n, { land, tage }));
  const schreiben = darfSchreiben(n, "vorgaenge");
  const qs = (extra) => {
    const p = new URLSearchParams(Object.entries({ land, tage, ...extra }).filter(([, w]) => w));
    const s = p.toString();
    return `/portal/admin/leads${s ? `?${s}` : ""}`;
  };
  const g = d.auswertung.gesamt;
  const jeLand = ["DE", "AT", "CH", "unbekannt"].filter((l) => d.auswertung.jeLand[l]).map((l) => ({ land: l, ...d.auswertung.jeLand[l] }));
  const unbesetzt = d.desks.filter((x) => !x.besetzt);

  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Backoffice · Vertrieb"
        titel="Lead-Desk"
        text="Jede Anfrage hat ein Land und eine zuständige Person – oder steht sichtbar ohne Zuständigkeit da. Zielzeiten bis zum Erstkontakt gelten nur intern."
        aktionen={<KetteNeuPruefen />}
      />

      {unbesetzt.length > 0 && (
        <Hinweis ton="warn" icon={UsersRound} titel={`${unbesetzt.length} von ${d.desks.length} Lead-Desks ohne Person (TODO Inhaber)`}>
          Bis Personen, Vertretungen und Postfächer je Land benannt sind, greift das Gebiets-Routing aus „Akquise &amp; Gebiete“. Ohne Gebietstreffer bleibt die Anfrage ohne Zuständigkeit – alle Backoffice-Konten werden wie bisher benachrichtigt.
        </Hinweis>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Pillen label="Land" werte={LAENDER} aktiv={land} href={(w) => qs({ land: w })} />
        <Pillen label="Zeitraum" werte={ZEITRAEUME} aktiv={tage} href={(w) => qs({ tage: w })} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kennzahl label="Anfragen im Zeitraum" wert={fmt(g.anzahl)} hinweis={`${fmt(d.anzahl)} in der Auswahl · ${d.zeitraum.tage} Tage`} icon={Inbox} />
        <Kennzahl label="Ohne Zuständigkeit" wert={fmt(g.ohneZustaendigkeit)} hinweis={g.ohneZustaendigkeit ? "Bitte zuweisen (Vorgang öffnen)" : "Alle Anfragen zugeordnet"} icon={CircleUserRound} />
        <Kennzahl label="Erstkontakt überfällig" wert={fmt(g.ueberfaellig)} hinweis={`${fmt(g.offen)} offen · ${fmt(g.inFrist)} in Frist erledigt`} icon={Siren} />
        <Kennzahl label="Bis Erstkontakt (Median)" wert={dauer(g.geschaeftsMin.median)} hinweis={`P90 ${dauer(g.geschaeftsMin.p90)} · Geschäftszeit · n = ${fmt(g.geschaeftsMin.anzahl)}`} icon={Gauge} ton="dunkel" />
      </div>

      <Karte titel="Anfragen" untertitel="Überfällige zuerst, sonst neueste zuerst · Score und Ampel priorisieren nur, entscheiden tut ein Mensch" icon={ListChecks}>
        {d.leads.length === 0 ? (
          <LeerZeile>Keine Anfragen in dieser Auswahl.</LeerZeile>
        ) : (
          <ul className="divide-y divide-ink-100">
            {d.leads.map((l) => (
              <li key={l.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link href={`/portal/admin/vorgaenge/${l.id}`} className="font-mono text-[13px] font-semibold text-ov-700 underline-offset-4 hover:underline">{l.id}</Link>
                    <span className="text-[14px] font-semibold text-ink-900">{l.typLabel}</span>
                    {l.groesse?.klasse && l.groesse.klasse !== "unbekannt" && <Badge>{l.groesse.wert != null ? `${fmt(l.groesse.wert, Number.isInteger(l.groesse.wert) ? 0 : 1)} ${l.groesse.einheit}` : l.groesse.klasse}</Badge>}
                  </p>
                  <p className="mt-1 text-[13px] text-ink-500">
                    {datumZeit(l.eingang)} · {l.anzeige}
                    {l.nachberechnet ? " · Altbestand" : ""}
                  </p>
                </div>
                <div className="min-w-0 text-[13.5px]">
                  <p className="flex items-center gap-1.5 font-semibold text-ink-900">
                    <MapPinned aria-hidden="true" className="h-3.5 w-3.5 text-ink-400" />
                    {LAND_NAME[l.land] || l.land}
                  </p>
                  <p className="mt-0.5 text-ink-600">{l.desk?.label}</p>
                  {l.ohneZustaendigkeit ? (
                    <Badge ton="warn" className="mt-1.5">ohne Zuständigkeit</Badge>
                  ) : (
                    <p className="mt-0.5 text-ink-800">
                      {l.zustaendig.name}
                      <span className="text-ink-500"> · {l.zustaendigQuelle === "desk" ? "Desk" : l.zustaendigQuelle === "gebiet" ? "Gebiet" : "manuell"}</span>
                    </p>
                  )}
                  {l.vertretung && <p className="text-[12.5px] text-ink-500">Vertretung: {l.vertretung.name}</p>}
                </div>
                <div className="flex min-w-0 flex-col items-start gap-1.5">
                  <ScoreBadge score={l.score} />
                  <SlaAmpel sla={l.sla} />
                </div>
                <div className="min-w-0 space-y-2">
                  {l.geloescht ? <Badge ton="neutral">Personendaten gelöscht (Art. 17)</Badge> : <KanalAmpel kanaele={l.kanaele} />}
                  {l.absage && (
                    <p className="text-[12.5px] text-ink-600">
                      <span className="font-semibold text-ink-800">Absage:</span> {d.absageCodes.find((c) => c.id === l.absage.code)?.label || l.absage.code}
                    </p>
                  )}
                  <LeadAktionen vorgangId={l.id} absageCodes={d.absageCodes} geloescht={l.geloescht} darfSchreiben={schreiben} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {d.anzahl > d.leads.length && <p className="mt-4 text-[13px] text-ink-500">Angezeigt: {fmt(d.leads.length)} von {fmt(d.anzahl)}. Bitte Land oder Zeitraum eingrenzen.</p>}
      </Karte>

      <div className="grid gap-6">
        <Karte titel="Speed to Lead je Land" untertitel="Geschäftszeit bis zum Erstkontakt (Mo–Fr 8–17 Uhr, landesweite Feiertage)" icon={Gauge}>
          {jeLand.length ? <SlaTabelle zeilen={jeLand} /> : <LeerZeile>Noch keine Daten.</LeerZeile>}
        </Karte>
        <Karte titel="Je Land und Typ" untertitel="Median und P90 nur über Anfragen mit Erstkontakt" icon={MapPinned}>
          {d.auswertung.jeLandTyp.length ? <SlaTabelle zeilen={d.auswertung.jeLandTyp} mitTyp typLabel={TYP_LABEL} /> : <LeerZeile>Noch keine Daten.</LeerZeile>}
        </Karte>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Karte titel="Zielwerte (intern)" untertitel="Masterplan 5.5 · gelten erst, wenn Personen eingeplant sind (E7)" icon={Siren}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {d.slaKlassen.map((k) => (
              <li key={k.id} className="rounded-2xl bg-sand-50 px-4 py-3 ring-1 ring-inset ring-sand-200">
                <p className="text-[13.5px] font-semibold text-ink-900">{k.label}</p>
                <p className="text-[13px] text-ink-600">{k.ziel}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12.5px] text-ink-500">Geschäftszeiten je Desk und regionale Feiertage: TODO Inhaber/Vertrieb. Öffentlich keine Zeitzusage.</p>
        </Karte>
        <Karte titel="Absagecodes" untertitel="Mit Begründung an den Interessenten" icon={ListChecks}>
          {d.absagen.length ? (
            <ul className="space-y-3">
              {d.absagen.map((a) => (
                <li key={a.code}>
                  <p className="flex items-center justify-between gap-3 text-[14px] font-semibold text-ink-900">
                    {a.label}
                    <Badge>{fmt(a.anzahl)}</Badge>
                  </p>
                  <ul className="mt-1 space-y-0.5 text-[12.5px] text-ink-600">
                    {a.begruendungen.slice(0, 3).map((b) => (
                      <li key={b.vorgangId} className="truncate">
                        <span className="font-mono">{b.vorgangId}</span> · {b.text}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <LeerZeile>Noch keine Absagen im Zeitraum.</LeerZeile>
          )}
        </Karte>
      </div>

      <Karte
        titel="Einwilligungsprotokoll"
        untertitel="Append-only Hash-Kette: nur Pseudonym, Textversion/-Hash, Zweck, Kanal, Land und Zeit – Personendaten liegen getrennt"
        icon={Link2}
      >
        {d.kette.ok ? (
          <Hinweis ton="ok" icon={ShieldCheck} titel="Kette intakt">
            {fmt(d.kette.anzahl)} Einträge geprüft (verifyChain). Letzter Hash <span className="font-mono">{kurz(d.kette.letzterHash)}</span>.
          </Hinweis>
        ) : (
          <Hinweis ton="danger" icon={ShieldAlert} titel={`Kette gebrochen – ${d.kette.fehler.length} Abweichung(en)`}>
            <ul className="mt-1 space-y-0.5">
              {d.kette.fehler.map((f) => <li key={`${f.index}-${f.id}`}>Eintrag {f.index + 1} ({f.id || "ohne Kennung"}): {f.grund}</li>)}
            </ul>
          </Hinweis>
        )}
        <dl className="mt-4 grid gap-3 text-[13.5px] sm:grid-cols-3">
          <div className="rounded-2xl bg-ink-50 px-4 py-3">
            <dt className="text-ink-500">Personenzeilen (getrennt, löschbar)</dt>
            <dd className="mt-0.5 text-[18px] font-bold tabular-nums text-ink-900">{fmt(d.personen.anzahl)}</dd>
          </div>
          <div className="rounded-2xl bg-ink-50 px-4 py-3">
            <dt className="text-ink-500">Mit gekürzter IP (Löschung nach {d.personen.ipFristTage} Tagen)</dt>
            <dd className="mt-0.5 text-[18px] font-bold tabular-nums text-ink-900">{fmt(d.personen.mitIp)}</dd>
          </div>
          <div className="rounded-2xl bg-ink-50 px-4 py-3">
            <dt className="text-ink-500">Nachweisfrist nach Art. 17</dt>
            <dd className="mt-0.5 text-[18px] font-bold text-ink-900">{d.nachweisFristJahre} Jahre</dd>
            <dd className="text-[12px] text-ink-500">Arbeitswert · Prüfung Rechtsabteilung</dd>
          </div>
        </dl>
      </Karte>

      <Karte titel="Lead-Desks" untertitel="Routing Land × Typ × Größe → Desk → Gebiet → ohne Zuständigkeit" icon={UsersRound} ton="ruhig">
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {d.desks.map((x) => (
            <li key={x.id} className="flex items-start justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-inset ring-ink-200/70">
              <span className="min-w-0 text-[13.5px] font-semibold text-ink-900">{x.label}</span>
              {x.besetzt ? <Badge ton="ok">besetzt</Badge> : <Badge ton="warn">TODO Inhaber</Badge>}
            </li>
          ))}
        </ul>
        <ul className="mt-4 space-y-1 text-[12.5px] text-ink-600">
          {d.todo.map((t) => <li key={t}>• {t}</li>)}
        </ul>
      </Karte>
    </div>
  );
}
