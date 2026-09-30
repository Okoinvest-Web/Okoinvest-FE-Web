import Link from "next/link";
import { AlarmClock, Boxes, CalendarClock, ClipboardCheck, FileWarning, ShieldAlert, Timer, TrendingDown, Wrench } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import { SchwereBadge, Wert } from "@/components/Portal/Anlagen/teile";
import { AktionKnopf, AuftragAktionen, BewegungFormular, NeuesErsatzteil, VersicherungAktionen } from "@/components/Portal/Betrieb/Formulare";
import { FristBadge, SlaBadge } from "@/components/Portal/Betrieb/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { betriebBackend } from "@/lib/plattform/backend/betrieb";
import { datum, datumZeit } from "@/lib/plattform/format";
import { kwh } from "@/lib/plattform/anlagen";
import { MELDEFRIST_HINWEIS } from "@/lib/plattform/betrieb/kern";

export const metadata = { title: "Betriebsführung" };

export default async function BetriebsfuehrungSeite() {
  const n = await portalNutzer({ admin: true });
  const u = await laden(() => betriebBackend().betriebUebersicht(n));
  const z = u.zaehler;
  const s = u.darfSchreiben;

  return (
    <>
      <SeitenKopf
        eyebrow="Backoffice · Betrieb"
        titel="Betriebsführung"
        text="Störungen als Tickets mit SLA, Serviceaufträge, Versicherungsfälle, Fristen (Eichung, Garantie, Wartung) und Ersatzteillager über alle ÖkoInvest-Anlagen."
        aktionen={
          <>
            <Button href="/portal/admin/anlagen" size="sm" variant="secondary" icon={ShieldAlert}>Störungs-Leitstand</Button>
            {s && <AktionKnopf url="/api/admin/anlagen/betrieb" body={{ aktion: "lauf" }} label="Fristen-Lauf jetzt" />}
          </>
        }
      />
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Wert ton="dunkel" icon={Timer} label="SLA verletzt" wert={String(z.slaVerletzt)} hinweis={`${z.slaKritisch} kurz vor Ablauf`} />
        <Wert icon={AlarmClock} label="Fristen überfällig" wert={String(z.fristenUeberfaellig)} hinweis={`${z.fristenDringend} dringend bzw. fehlend`} />
        <Wert icon={Wrench} label="Offene Aufträge" wert={String(z.auftraegeOffen)} />
        <Wert icon={FileWarning} label="Versicherungsfälle" wert={String(z.versicherungOffen)} hinweis="offen" />
        <Wert icon={Boxes} label="Nachbestellen" wert={String(z.nachbestellen)} hinweis="Artikel ≤ Mindestbestand" />
        <Wert icon={TrendingDown} label="Ertragsausfall Jahr" wert={kwh(z.ausfallJahrKwh)} hinweis={`${z.ausfallJahrEur.toLocaleString("de-DE")} € bewertet`} />
      </section>
      {u.laufAm && <p className="-mt-3 mb-5 text-[12.5px] text-ink-500">Letzter Fristen-Lauf: {datumZeit(u.laufAm)} (täglich automatisch; legt Aufgaben an und benachrichtigt bei SLA-Verletzungen).</p>}

      <div className="grid gap-6 xl:grid-cols-2">
        <Karte titel="Offene Störungen nach SLA" untertitel="Reaktion = Quittierung, Lösung = Behebung – Standard je Schwere, Vertragszusagen gehen vor" innen="p-0">
          {u.tickets.length ? (
            <ul className="divide-y divide-ink-100">
              {u.tickets.map((t) => (
                <li key={t.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5 md:px-6">
                  <div className="min-w-0">
                    <Link href={`/portal/admin/anlagen/betrieb/stoerung/${t.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{t.titel}</Link>
                    <p className="text-[12.5px] text-ink-500">{t.anlage?.name} · erkannt {datumZeit(t.erkanntAm)}{t.zustaendig ? ` · ${t.zustaendig.name}` : " · niemand zuständig"}{t.auftraege.some((x) => x.offen) ? " · Auftrag läuft" : ""}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2"><SchwereBadge schwere={t.schwere} /><SlaBadge sla={t.sla} /></div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-[14px] text-ink-500">Keine offenen Störungen.</p>
          )}
          {u.ohneUrsache.length > 0 && (
            <div className="border-t border-ink-100 px-5 py-4 md:px-6">
              <p className="text-[13.5px] font-semibold text-ink-900">Behoben ohne Ursache ({u.ohneUrsache.length}) – bitte nachtragen</p>
              <ul className="mt-1.5 space-y-1 text-[13px]">
                {u.ohneUrsache.slice(0, 8).map((t) => <li key={t.id}><Link href={`/portal/admin/anlagen/betrieb/stoerung/${t.id}`} className="font-semibold text-ov-700 hover:text-ov-800">{t.titel}</Link> <span className="text-ink-500">· {t.anlage?.name}</span></li>)}
              </ul>
            </div>
          )}
        </Karte>

        <Karte titel="Fristen" untertitel="Eichgültigkeit (abrechnungsrelevante Zähler), Garantieende, Wartungspläne, Meldefristen – nächste 90 Tage und überfällig" innen="p-0">
          {u.fristen.length ? (
            <ul className="divide-y divide-ink-100">
              {u.fristen.slice(0, 40).map((f, i) => (
                <li key={`${f.bezug.art}-${f.bezug.id}-${i}`} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 md:px-6">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{f.titel}</p>
                    <Link href={`/portal/admin/anlagen/betrieb/${f.anlageId}`} className="text-[12.5px] font-semibold text-ov-700 hover:text-ov-800">{f.anlage?.name}</Link>
                  </div>
                  <FristBadge frist={f} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-[14px] text-ink-500">Keine Fristen in den nächsten 90 Tagen.</p>
          )}
        </Karte>

        <Karte titel="Serviceaufträge" untertitel="Techniker, Dienstleister, Hersteller – Termin informiert den Kunden (Zugang)" innen="p-0">
          {u.auftraege.length ? (
            <ul className="divide-y divide-ink-100">
              {u.auftraege.map((x) => (
                <li key={x.id} className="px-5 py-3.5 md:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900">{x.dienstleister || x.artLabel} <span className="font-normal text-ink-500">· {x.anlage?.name}</span></p>
                      <p className="text-[12.5px] text-ink-500">{x.beschreibung.slice(0, 140)}{x.termin ? ` · Termin ${x.termin.replace("T", " ")}` : ""}</p>
                      <a href={`/api/admin/anlagen/betrieb/auftraege/${x.id}`} className="text-[12.5px] font-semibold text-ov-700 hover:text-ov-800">Auftragsschreiben (PDF)</a>
                    </div>
                    <Badge ton={x.status === "angelegt" ? "warn" : "info"}>{x.statusLabel}</Badge>
                  </div>
                  {s && <AuftragAktionen auftrag={x} />}
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-[14px] text-ink-500">Keine offenen Aufträge. Aufträge entstehen im Ticket einer Störung oder am Wartungsplan einer Anlage.</p>
          )}
        </Karte>

        <Karte titel="Versicherungsfälle" untertitel="Allgefahren, Ertragsausfall, Haftpflicht – interne Meldefrist 7 Tage ab Schadentag" innen="p-0">
          {u.versicherungen.length ? (
            <ul className="divide-y divide-ink-100">
              {u.versicherungen.map((f) => (
                <li key={f.id} className="px-5 py-3.5 md:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900">{f.versicherer} <span className="font-normal text-ink-500">· {f.anlage?.name}</span></p>
                      <p className="text-[12.5px] text-ink-500">{f.artLabel} · Schadentag {datum(f.schadentag)} · Schaden {f.schadenEur != null ? `${f.schadenEur.toLocaleString("de-DE")} €` : "–"}{f.schadennummer ? ` · Nr. ${f.schadennummer}` : ""}</p>
                      {f.stoerungId && <Link href={`/portal/admin/anlagen/betrieb/stoerung/${f.stoerungId}`} className="text-[12.5px] font-semibold text-ov-700">zur Störung</Link>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge ton={f.status === "entwurf" ? "warn" : "info"}>{f.statusLabel}</Badge>
                      {f.meldefristTage !== null && <Badge ton={f.meldefristTage < 0 ? "dunkel" : "warn"}>{f.meldefristTage < 0 ? `Meldefrist ${-f.meldefristTage} Tg. überschritten` : `melden in ${f.meldefristTage} Tg.`}</Badge>}
                    </div>
                  </div>
                  {s && <VersicherungAktionen fall={f} />}
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-[14px] text-ink-500">Keine offenen Versicherungsfälle.</p>
          )}
          <p className="border-t border-ink-100 px-5 py-3 text-[12.5px] leading-snug text-ink-500 md:px-6">{MELDEFRIST_HINWEIS}</p>
        </Karte>
      </div>

      <Karte titel="Ersatzteillager" untertitel="Bestand, Mindestbestand, Nachbestellvorschlag – Entnahmen immer mit Anlage bzw. Störung (Garantie, Kosten)" className="mt-6">
        {u.ersatzteile.length ? (
          <ul className="divide-y divide-ink-100">
            {u.ersatzteile.map((t) => (
              <li key={t.id} className="py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{t.bezeichnung}</p>
                    <p className="text-[12.5px] text-ink-500">{[t.hersteller, t.artikelnummer && `Art.-Nr. ${t.artikelnummer}`, t.lagerort].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="ov-num font-display text-[18px] font-extrabold text-ink-900">{t.bestand.toLocaleString("de-DE")}</span>
                    <span className="text-[12.5px] text-ink-500">{t.einheit} · min. {t.mindestbestand}</span>
                    {t.nachbestellung && <Badge ton="warn">nachbestellen: {t.nachbestellung.menge}</Badge>}
                  </div>
                </div>
                {s && <div className="mt-2"><BewegungFormular teil={t} anlagen={u.anlagen} /></div>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-ink-500">Noch keine Artikel angelegt.</p>
        )}
        {s && <div className="mt-4"><NeuesErsatzteil /></div>}
        {u.bewegungen.length > 0 && (
          <details className="mt-5">
            <summary className="cursor-pointer text-[13.5px] font-semibold text-ink-800">Letzte Lagerbewegungen</summary>
            <ul className="mt-2 space-y-1 text-[13px] text-ink-700">
              {u.bewegungen.map((b) => <li key={b.id}>{datumZeit(b.am)} · {b.artLabel} {b.menge} × {b.teil?.bezeichnung}{b.anlage ? ` · ${b.anlage.name}` : ""}{b.bemerkung ? ` · ${b.bemerkung}` : ""} · {b.vonName}</li>)}
            </ul>
          </details>
        )}
      </Karte>

      <Karte titel="Anlagen" untertitel="Wartungspläne, Prüfprotokolle, Kennzahlen (PR, Verfügbarkeit), Zählerfreigabe und Berichte je Anlage" className="mt-6" innen="p-0">
        <ul className="divide-y divide-ink-100">
          {u.anlagen.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-6">
              <Link href={`/portal/admin/anlagen/betrieb/${a.id}`} className="min-w-0 font-semibold text-ink-900 hover:text-ov-700">{a.name}</Link>
              <span className="flex items-center gap-2 text-[12.5px] text-ink-500"><ClipboardCheck aria-hidden="true" className="h-4 w-4" />{a.plaene} Pläne{a.faellig ? <Badge ton="warn"><CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />{a.faellig} fällig</Badge> : null}</span>
            </li>
          ))}
        </ul>
      </Karte>
      {!s && <Hinweis ton="neutral" className="mt-6">Ihre Backoffice-Rolle hat im Bereich „Anlagen & Monitoring“ nur Leserecht.</Hinweis>}
    </>
  );
}
