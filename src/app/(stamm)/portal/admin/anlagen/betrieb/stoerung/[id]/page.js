import Link from "next/link";
import { Activity, ShieldAlert } from "lucide-react";
import Button from "@/components/ui/Button";
import { Angaben, Badge, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import { SchwereBadge, StoerungStatusBadge } from "@/components/Portal/Anlagen/teile";
import { AuftragAktionen, BewegungFormular, NeuerAuftrag, NeuerVersicherungsfall, TicketFormular, VersicherungAktionen } from "@/components/Portal/Betrieb/Formulare";
import { SlaBadge } from "@/components/Portal/Betrieb/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { betriebBackend } from "@/lib/plattform/backend/betrieb";
import { datum, datumZeit } from "@/lib/plattform/format";
import { kwh } from "@/lib/plattform/anlagen";
import { MELDEFRIST_HINWEIS } from "@/lib/plattform/betrieb/kern";

export const metadata = { title: "Störung (Ticket)" };

export default async function StoerungTicketSeite({ params }) {
  const { id } = await params;
  const n = await portalNutzer({ admin: true });
  const t = await laden(() => betriebBackend().betriebStoerung(n, id));
  const s = t.darfSchreiben;
  const ea = t.ertragsausfall;

  return (
    <>
      <SeitenKopf
        eyebrow={`Störung · ${t.id}`}
        titel={t.titel}
        text={`${t.anlage?.name || t.anlageId} · erkannt ${datumZeit(t.erkanntAm)}`}
        aktionen={
          <>
            <Button href={`/portal/anlagen/${t.anlageId}?tab=stoerungen`} size="sm" variant="secondary" icon={Activity}>Monitoring & Kommentare</Button>
            <Button href="/portal/admin/anlagen" size="sm" variant="secondary" icon={ShieldAlert}>Leitstand</Button>
          </>
        }
      />
      <nav aria-label="Betriebsführung" className="mb-5 flex flex-wrap gap-4 text-[13.5px]">
        <Link href="/portal/admin/anlagen/betrieb" className="font-semibold text-ov-700 hover:text-ov-800">← Betriebsführung</Link>
        <Link href={`/portal/admin/anlagen/betrieb/${t.anlageId}`} className="font-semibold text-ov-700 hover:text-ov-800">Anlage: Wartung, Kennzahlen, Berichte</Link>
      </nav>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <SchwereBadge schwere={t.schwere} />
        <StoerungStatusBadge status={t.status} />
        <SlaBadge sla={t.sla} />
        {t.zustaendig ? <Badge>zuständig: {t.zustaendig.name}</Badge> : <Badge ton="warn">niemand zuständig – im Leitstand zuweisen</Badge>}
      </div>
      {t.text && <p className="mb-6 max-w-3xl whitespace-pre-line text-[14.5px] leading-relaxed text-ink-700">{t.text}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Karte titel="Ursache & Ertragsausfall" untertitel="Pflicht vor „Behoben“: Ursache und Maßnahme · Ertragsausfall = erwartete Erzeugung im Ausfallzeitraum × betroffener Anteil">
          {s ? <TicketFormular ticket={t} /> : <Angaben items={[{ label: "Ursache", wert: t.ursacheLabel || "–" }, { label: "Maßnahme", wert: t.massnahme || "–" }]} />}
          {ea && (
            <div className="mt-5 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/60">
              <Angaben
                spalten={3}
                items={[
                  { label: "Ausfalldauer", wert: `${ea.stunden.toLocaleString("de-DE")} h` },
                  { label: "Soll im Zeitraum", wert: kwh(ea.sollKwh) },
                  { label: `Ertragsausfall (${ea.betroffenPct.toLocaleString("de-DE")} %)`, wert: kwh(ea.ausfallKwh) },
                  { label: "Erlös je kWh", wert: `${ea.erloesCtKwh.toLocaleString("de-DE")} ct` },
                  { label: "Bewerteter Ausfall", wert: `${ea.ausfallEur.toLocaleString("de-DE")} €` },
                  { label: "Annahme", wert: ea.annahme },
                ]}
              />
              <p className="mt-2 text-[12.5px] leading-snug text-ink-500">Schätzung aus der Jahresprognose (Region, Bauart, Alterung) mit Tagesgang; Eigenverbrauchsanteil zum Arbeitspreis, Rest zum Marktwert Solar. Grundlage für Versicherung (Betriebsunterbrechung), Bank-Reporting und Verfügbarkeit.</p>
            </div>
          )}
          {t.versicherbar && !t.versicherungen.length && <Hinweis ton="warn" className="mt-4" titel="Versicherungsfall prüfen">Die gewählte Ursache ist typischerweise versichert (z. B. PV-Allgefahrenversicherung). {MELDEFRIST_HINWEIS}</Hinweis>}
        </Karte>

        <div className="min-w-0 space-y-6">
          <Karte titel="Serviceaufträge" innen="p-0">
            {t.auftraege.length ? (
              <ul className="divide-y divide-ink-100">
                {t.auftraege.map((x) => (
                  <li key={x.id} className="px-5 py-3.5 md:px-6">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-900">{x.dienstleister || x.artLabel}</p>
                        <p className="text-[12.5px] text-ink-500">{x.artLabel}{x.termin ? ` · Termin ${x.termin.replace("T", " ")}` : ""}{x.erledigtAm ? ` · erledigt ${datum(x.erledigtAm)}` : ""}</p>
                        <a href={`/api/admin/anlagen/betrieb/auftraege/${x.id}`} className="text-[12.5px] font-semibold text-ov-700 hover:text-ov-800">Auftragsschreiben (PDF)</a>
                        {x.bericht && <p className="mt-1 text-[13px] text-ink-700">{x.bericht}</p>}
                      </div>
                      <Badge ton={x.offen ? "info" : "neutral"}>{x.statusLabel}</Badge>
                    </div>
                    {s && <AuftragAktionen auftrag={x} />}
                  </li>
                ))}
              </ul>
            ) : <p className="p-5 text-[14px] text-ink-500">Noch kein Auftrag.</p>}
            {s && t.status !== "behoben" && <div className="border-t border-ink-100 px-5 py-4 md:px-6"><NeuerAuftrag anlageId={t.anlageId} stoerungId={t.id} vorbelegung={{ beschreibung: t.titel }} /></div>}
          </Karte>

          <Karte titel="Versicherungsfall" innen="p-0">
            {t.versicherungen.length ? (
              <ul className="divide-y divide-ink-100">
                {t.versicherungen.map((f) => (
                  <li key={f.id} className="px-5 py-3.5 md:px-6">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-900">{f.versicherer}</p>
                        <p className="text-[12.5px] text-ink-500">{f.artLabel} · Schadentag {datum(f.schadentag)} · Meldefrist {datum(f.meldefristBis)}{f.gemeldetAm ? ` · gemeldet ${datum(f.gemeldetAm)}${f.verspaetet ? " (nach Frist)" : ""}` : ""}{f.erstattetEur !== null && f.erstattetEur !== undefined ? ` · erstattet ${f.erstattetEur.toLocaleString("de-DE")} €` : ""}</p>
                      </div>
                      <Badge ton={f.offen ? "warn" : "neutral"}>{f.statusLabel}</Badge>
                    </div>
                    {s && <VersicherungAktionen fall={f} />}
                  </li>
                ))}
              </ul>
            ) : <p className="p-5 text-[14px] text-ink-500">Kein Versicherungsfall.</p>}
            {s && <div className="border-t border-ink-100 px-5 py-4 md:px-6"><NeuerVersicherungsfall anlageId={t.anlageId} stoerungId={t.id} vorbelegung={{ schadentag: String(t.erkanntAm).slice(0, 10), schadenbeschreibung: t.text || t.titel }} /></div>}
          </Karte>

          <Karte titel="Ersatzteile" untertitel="Entnahme wird der Störung und Anlage zugeordnet">
            {t.entnahmen.length > 0 && <ul className="mb-4 space-y-1 text-[13px] text-ink-700">{t.entnahmen.map((b) => <li key={b.id}>{datumZeit(b.am)} · {b.menge} × {b.teil?.bezeichnung}{b.bemerkung ? ` · ${b.bemerkung}` : ""}</li>)}</ul>}
            {s ? (
              <div className="space-y-4">
                {t.ersatzteile.map((e) => (
                  <div key={e.id}>
                    <p className="text-[13.5px] font-semibold text-ink-900">{e.bezeichnung} <span className="font-normal text-ink-500">· Bestand {e.bestand}</span></p>
                    {e.bestand > 0 && <BewegungFormular teil={e} stoerungId={t.id} />}
                  </div>
                ))}
              </div>
            ) : !t.entnahmen.length && <p className="text-[14px] text-ink-500">Keine Entnahmen.</p>}
          </Karte>
        </div>
      </div>
    </>
  );
}
