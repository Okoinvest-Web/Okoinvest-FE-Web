// Gutachterauftrag – gemeinsame Darstellung für Gutachter (/portal/gutachter/[id]) und Backoffice (/portal/admin/gutachter/[id]).
// Server-Komponente; Aktionen als Client-Formulare aus ./Aktionen. Welche Aktionen erscheinen, steuert `a.rechte` vom Server
// (die API prüft jede Aktion trotzdem selbst).

import Link from "next/link";
import { CalendarDays, Check, FileText, MessageSquare, Receipt, TriangleAlert } from "lucide-react";
import { Angaben, Badge, Hinweis, Karte } from "@/components/Portal/ui";
import { cn } from "@/components/ui/cn";
import { AUFTRAG_SCHRITTE, HONORAR_ARTEN, LIEFER_ARTEN, LIEFER_STATUS, RECHNUNG_ARTEN, RECHNUNG_STATUS, TERMIN_ARTEN, TERMIN_STATUS } from "@/lib/plattform/gutachter/kern";
import { RechnungHochladen, RechnungPruefen, RueckfrageFormular, TerminFormular, TerminKnoepfe, ZahlungFormular } from "./Aktionen";

export const eur = (x) => (Number.isFinite(x) ? `${x.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : "–");
export const datum = (s) => (s ? String(s).slice(0, 10).split("-").reverse().join(".") : "–");
const zeit = (s) => (s ? new Date(s).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }) : "");

/** Fortschritt des Auftrags (Angebot → Bezahlt) */
export function AuftragSchritte({ schritt, status }) {
  if (schritt < 0) return <Badge>{status}</Badge>;
  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="Fortschritt des Auftrags">
      {AUFTRAG_SCHRITTE.map((s, i) => (
        <li key={s} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold", i < schritt ? "bg-ov-600 text-white" : i === schritt ? "bg-navy-700 text-white" : "bg-ink-100 text-ink-500")} aria-current={i === schritt ? "step" : undefined}>
          {i < schritt && <Check aria-hidden="true" className="h-3 w-3" />}{s}
        </li>
      ))}
    </ol>
  );
}

export function FristenListe({ fristen, leer = "Keine Fristen in den nächsten 14 Tagen.", link }) {
  if (!fristen.length) return <p className="text-[14px] text-ink-500">{leer}</p>;
  return (
    <ul className="divide-y divide-ink-100">
      {fristen.map((f, i) => (
        <li key={i} className="flex flex-wrap items-center gap-2 py-2.5 text-[13.5px]">
          <span className={cn("ov-num w-24 shrink-0 font-semibold", f.ueberfaellig ? "text-danger-700" : "text-ink-900")}>{datum(f.datum)}</span>
          <span className="min-w-0 flex-1">
            {link ? <Link href={link(f)} className="font-semibold text-ink-900 hover:text-ov-700">{f.text}: {f.auftrag}</Link> : <span className="font-semibold text-ink-900">{f.text}</span>}
            {f.projekt && <span className="block text-[12px] text-ink-500">{f.projekt}{f.gutachter ? ` · ${f.gutachter}` : ""}</span>}
          </span>
          {f.ueberfaellig ? <Badge className="bg-danger-50 text-danger-800 ring-danger-200"><TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />überfällig</Badge> : <Badge ton={f.tage <= 3 ? "warn" : "neutral"}>{f.tage === 0 ? "heute" : `in ${f.tage} Tag${f.tage === 1 ? "" : "en"}`}</Badge>}
        </li>
      ))}
    </ul>
  );
}

export function AngebotAngaben({ g }) {
  if (!g) return <p className="text-[14px] text-ink-500">Noch kein Angebot abgegeben.</p>;
  return (
    <Angaben spalten={3} items={[
      { label: "Honorar", wert: `${eur(g.honorar)} (${HONORAR_ARTEN[g.honorarArt]}${g.honorarArt === "stunden" ? `: ${String(g.stunden).replace(".", ",")} h × ${eur(g.stundensatz)}` : ""})` },
      { label: "Nebenkosten", wert: `${eur(g.nebenkosten)} (${String(g.nebenkostenPct).replace(".", ",")} %)` },
      { label: "Summe netto / brutto", wert: `${eur(g.summeNetto)} / ${eur(g.summeBrutto)}` },
      { label: "Liefertermin", wert: datum(g.liefertermin) },
      { label: "Bindefrist", wert: g.gueltigBis ? datum(g.gueltigBis) : "–" },
      { label: "Abschlag / Zahlungsziel", wert: `${g.abschlagPct ? `${g.abschlagPct} %` : "kein Abschlag"} · ${g.zahlungszielTage} Tage` },
      ...(g.termineVorschlag ? [{ label: "Terminvorschläge", wert: g.termineVorschlag, breit: true }] : []),
      ...(g.bemerkung ? [{ label: "Bemerkung", wert: g.bemerkung, breit: true }] : []),
      ...(g.ustPct === 0 && g.ustHinweis ? [{ label: "Umsatzsteuer", wert: `0 % – ${g.ustHinweis}`, breit: true }] : []),
    ]} />
  );
}

export function TermineKarte({ a, bo }) {
  const seite = bo ? "bo" : "gutachter";
  return (
    <Karte titel="Termine & Begehungen" untertitel="Vorschläge bestätigt die jeweils andere Seite" aktion={<CalendarDays aria-hidden="true" className="h-5 w-5 text-ink-400" />}>
      <ul className="mb-4 divide-y divide-ink-100">
        {a.termine.map((t) => (
          <li key={t.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink-900">{datum(t.datum)}{t.uhrzeit ? `, ${t.uhrzeit} Uhr` : ""} · {TERMIN_ARTEN[t.art]}</p>
              <p className="text-[12.5px] text-ink-500">{[t.ort, t.notiz].filter(Boolean).join(" · ") || "ohne Ort"} · vorgeschlagen von {t.von}</p>
              {t.protokoll && <p className="mt-1 text-[13px] text-ink-700">Protokoll: {t.protokoll}</p>}
            </div>
            <span className="flex flex-wrap items-center gap-2"><Badge ton={TERMIN_STATUS[t.status]?.ton}>{t.statusLabel}</Badge><TerminKnoepfe id={a.id} bo={bo} t={t} seite={seite} /></span>
          </li>
        ))}
        {!a.termine.length && <li className="py-2 text-[14px] text-ink-500">Noch keine Termine.</li>}
      </ul>
      {a.rechte?.termin && <details><summary className="cursor-pointer text-[14px] font-semibold text-ov-700">Termin vorschlagen</summary><div className="mt-3"><TerminFormular id={a.id} bo={bo} /></div></details>}
    </Karte>
  );
}

export function RueckfragenKarte({ a, bo }) {
  return (
    <Karte titel="Rückfragen & Nachrichten" aktion={<MessageSquare aria-hidden="true" className="h-5 w-5 text-ink-400" />}>
      <ul className="mb-4 space-y-2">
        {a.rueckfragen.map((r) => (
          <li key={r.id} className={cn("rounded-2xl p-3 text-[13.5px] ring-1", r.seite === "bo" ? "bg-ov-50 ring-ov-200" : "bg-white ring-ink-200", r.antwortAuf && "ml-6")}>
            <p className="text-[12px] font-semibold text-ink-500">{r.von} · {zeit(r.am)}{r.antwortAuf ? " · Antwort" : ""}</p>
            <p className="mt-0.5 whitespace-pre-line text-ink-800">{r.text}</p>
          </li>
        ))}
        {!a.rueckfragen.length && <li className="text-[14px] text-ink-500">Noch keine Nachrichten.</li>}
      </ul>
      {a.rechte?.rueckfrage && <RueckfrageFormular id={a.id} bo={bo} />}
    </Karte>
  );
}

export function LieferungenListe({ a }) {
  return (
    <ul className="divide-y divide-ink-100">
      {a.lieferungen.map((l) => (
        <li key={l.id} className="py-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-semibold text-ink-900">Version {l.version} · {LIEFER_ARTEN[l.art]}</p>
            <Badge ton={LIEFER_STATUS[l.status]?.ton}>{LIEFER_STATUS[l.status]?.label}</Badge>
            <span className="text-[12.5px] text-ink-500">{zeit(l.am)}</span>
          </div>
          {l.datei?.link && <a href={l.datei.link} className="mt-1 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ov-700 hover:text-ov-800"><FileText aria-hidden="true" className="h-4 w-4" />{l.datei.name}</a>}
          {l.kommentar && <p className="text-[13px] text-ink-600">{l.kommentar}</p>}
          {l.maengel?.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[13px] text-ink-800">{l.maengel.map((m) => <li key={m.id}>{m.text}</li>)}</ul>
          )}
          {l.pruefung && <p className="mt-1 text-[12px] text-ink-500">Geprüft {zeit(l.pruefung.am)} von {l.pruefung.von}{l.pruefung.kommentar ? ` – ${l.pruefung.kommentar}` : ""}</p>}
        </li>
      ))}
      {!a.lieferungen.length && <li className="py-2 text-[14px] text-ink-500">Noch keine Lieferung.</li>}
    </ul>
  );
}

export function RechnungenKarte({ a, bo, darfZahlung = false }) {
  const st = a.rechnungsstand;
  const arten = [a.rechte?.abschlag && "abschlag", a.rechte?.schluss && "schluss"].filter(Boolean);
  return (
    <Karte titel="Rechnungen & Zahlungen" untertitel={`Auftragssumme ${eur(st.auftragssumme)} netto · berechnet ${eur(st.berechnetNetto)} · bezahlt ${eur(st.bezahltBrutto)} brutto`} aktion={<Receipt aria-hidden="true" className="h-5 w-5 text-ink-400" />}>
      <ul className="mb-4 divide-y divide-ink-100">
        {a.rechnungen.map((r) => (
          <li key={r.id} className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14px] font-semibold text-ink-900">{RECHNUNG_ARTEN[r.art]} {r.nummer}</p>
              <Badge ton={RECHNUNG_STATUS[r.status]?.ton}>{r.statusLabel}</Badge>
              {r.ueberfaellig && <Badge className="bg-danger-50 text-danger-800 ring-danger-200">fällig seit {datum(r.faelligAm)}</Badge>}
            </div>
            <p className="ov-num text-[13px] text-ink-600">{eur(r.netto)} netto + {String(r.ustPct).replace(".", ",")} % = <strong className="text-ink-900">{eur(r.brutto)}</strong> · vom {datum(r.datum)} · Leistung {datum(r.leistungVon)}–{datum(r.leistungBis)} · fällig {datum(r.faelligAm)}</p>
            {r.datei?.link && <a href={r.datei.link} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ov-700 hover:text-ov-800"><FileText aria-hidden="true" className="h-4 w-4" />{r.datei.name}</a>}
            {r.pruefung?.kommentar && <p className="text-[12.5px] text-ink-600">Prüfung: {r.pruefung.kommentar}</p>}
            {r.zahlung && <p className="text-[12.5px] text-ov-800">Bezahlt am {datum(r.zahlung.am)}: {eur(r.zahlung.betrag)}</p>}
            {bo && r.status === "eingereicht" && a.darfSchreiben && <div className="mt-2"><RechnungPruefen id={a.id} rechnung={r} /></div>}
            {bo && r.status === "geprueft" && (darfZahlung ? <details className="mt-2"><summary className="cursor-pointer text-[13px] font-semibold text-ov-700">Zahlung buchen</summary><div className="mt-2"><ZahlungFormular id={a.id} rechnung={r} /></div></details> : <p className="mt-1 text-[12.5px] text-ink-500">Zahlung bucht die Buchhaltung.</p>)}
          </li>
        ))}
        {!a.rechnungen.length && <li className="py-2 text-[14px] text-ink-500">Noch keine Rechnung.</li>}
      </ul>
      {!bo && arten.length > 0 && (
        <details open={a.rechte?.schluss}>
          <summary className="cursor-pointer text-[14px] font-semibold text-ov-700">{a.rechte?.schluss ? "Schlussrechnung stellen" : "Abschlagsrechnung stellen"}</summary>
          <div className="mt-3"><RechnungHochladen id={a.id} arten={arten} ustPct={a.angebot?.ustPct ?? 19} rest={st.restNetto} /></div>
        </details>
      )}
      {!bo && !arten.length && !a.rechnungen.length && <p className="text-[13px] text-ink-500">{a.angebot?.abschlagPct ? "Abschlagsrechnungen sind nach Bestätigung des Auftrags möglich, die Schlussrechnung nach der Abnahme." : "Die Schlussrechnung stellen Sie nach der Abnahme."}</p>}
    </Karte>
  );
}

export function VerlaufKarte({ verlauf }) {
  return (
    <Karte titel="Verlauf" innen="p-0">
      <ul className="max-h-80 divide-y divide-ink-100 overflow-y-auto">
        {verlauf.map((x, i) => <li key={i} className="px-5 py-2.5 text-[13px]"><span className="text-ink-500">{zeit(x.am)} · {x.von}</span><br />{x.text}</li>)}
        {!verlauf.length && <li className="px-5 py-3 text-[14px] text-ink-500">Noch keine Einträge.</li>}
      </ul>
    </Karte>
  );
}

export function AuftragHinweis({ a }) {
  if (a.status === "storniert") return <Hinweis ton="warn" titel="Auftrag storniert">{a.absage?.grund}</Hinweis>;
  if (a.status === "nicht_beauftragt") return <Hinweis ton="neutral" titel="Nicht beauftragt">Die Leistung wurde anderweitig vergeben bzw. das Angebot nicht angenommen.</Hinweis>;
  if (a.status === "abgelehnt") return <Hinweis ton="neutral" titel="Anfrage abgelehnt">{a.absage?.grund}</Hinweis>;
  return null;
}
