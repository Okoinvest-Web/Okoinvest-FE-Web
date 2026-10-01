// Bausteine des Mitgliederportals Energiegemeinschaft (WP6) – Server- und Client-tauglich, ohne Hooks.
// Schrittfolge der Teilnahme, Fristhinweis mit Anleitung je Netzbetreiber, grüne Stunden, Empfehlungen, Meilensteine.
// Nur Tokens des Design-Systems (ov-*, navy-*, ink-*, sand-*, sun-* sparsam).

import Link from "next/link";
import { AlarmClock, ArrowRight, Award, BatteryCharging, Check, Clock, PlugZap, SlidersHorizontal, Sun, Tag, TriangleAlert } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { datumDe, tageText, zpKurz } from "./format";

/** Fortschritt einer Teilnahme: Antrag → Aufnahme → Anmeldung → Zustimmung → Aktivierung → Gemeinschaftsstrom */
export function Schrittfolge({ schritte = [], className }) {
  return (
    <ol className={cn("grid gap-3 sm:grid-cols-3 lg:grid-cols-6", className)} aria-label="Fortschritt Ihrer Teilnahme">
      {schritte.map((s, i) => {
        const fertig = s.zustand === "erledigt";
        const jetzt = s.zustand === "aktuell";
        const fehler = s.zustand === "fehler";
        return (
          <li key={s.id} aria-current={jetzt ? "step" : undefined} className="relative flex gap-3 sm:block">
            <div className="flex items-center gap-2 sm:mb-2">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                  fertig && "bg-ov-600 text-white",
                  jetzt && "bg-white text-ov-700 ring-2 ring-ov-500",
                  fehler && "bg-sun-300/40 text-ink-900 ring-2 ring-sun-400",
                  !fertig && !jetzt && !fehler && "bg-ink-100 text-ink-500"
                )}
              >
                {fertig ? <Check aria-hidden="true" className="h-4 w-4" strokeWidth={3} /> : fehler ? <TriangleAlert aria-hidden="true" className="h-4 w-4" /> : i + 1}
              </span>
              <span aria-hidden="true" className={cn("hidden h-0.5 flex-1 rounded-full sm:block", fertig ? "bg-ov-400" : "bg-ink-200", i === schritte.length - 1 && "invisible")} />
            </div>
            <div className="min-w-0">
              <p className={cn("text-[13.5px] font-semibold leading-snug", jetzt ? "text-ov-800" : fertig ? "text-ink-800" : "text-ink-500")}>{s.label}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-ink-500">{s.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Teilnahme-Karte mit Status, nächstem Schritt und – solange die Zustimmung offen ist – Countdown und Anleitung.
 * Der größte Schmerzpunkt am Markt: vergessene oder gescheiterte Zustimmung im Netzbetreiber-Portal.
 */
export function TeilnahmeStatus({ t, gemeinschaftName }) {
  const s = t.schritte;
  const offen = s.aktuell === "zustimmung" && !s.schritte.some((x) => x.zustand === "fehler");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">{t.richtungLabel || "Zählpunkt"} · {zpKurz(t.zaehlpunktnummer)}{t.bezeichnung ? ` · ${t.bezeichnung}` : ""}</p>
          <p className="mt-1 font-display text-[18px] font-bold text-ink-900">{t.statusLabel}{t.gueltigAb && t.status === "aktiv" ? ` seit ${datumDe(t.gueltigAb)}` : ""}</p>
          {s.aufgabe && <p className="mt-1 text-[14px] text-ink-600">{s.aufgabe}</p>}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-50 px-3 py-1 text-[12.5px] font-semibold text-ink-700 ring-1 ring-ink-200">Teilnahmefaktor {t.teilnahmefaktor} %</span>
      </div>
      <Schrittfolge schritte={s.schritte} />
      {offen && <ZustimmungJetzt frist={s.frist} anleitung={t.anleitung} gemeinschaftName={gemeinschaftName} />}
      {!offen && t.anleitung && s.aktuell !== "zustimmung" && (
        <details className="group rounded-2xl bg-sand-50 ring-1 ring-ink-200/70">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[14px] font-semibold text-ink-900">
            So geht es weiter: Ihre Zustimmung beim Netzbetreiber
            <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-700 transition-transform group-open:rotate-90" />
          </summary>
          <div className="border-t border-ink-100 px-4 py-4">
            <p className="mb-3 text-[13.5px] text-ink-600">Sobald wir Ihren Zählpunkt angemeldet haben, bitten wir Sie per E-Mail um Ihre Zustimmung. Das dauert nur wenige Minuten:</p>
            <AnleitungSchritte anleitung={t.anleitung} />
          </div>
        </details>
      )}
    </div>
  );
}

/** Countdown + Anleitung (offene Zustimmung) */
export function ZustimmungJetzt({ frist, anleitung, gemeinschaftName }) {
  const dringend = frist?.dringend;
  return (
    <div className={cn("overflow-hidden rounded-3xl ring-1", dringend ? "bg-sun-300/15 ring-sun-400/60" : "bg-ov-50 ring-ov-200")}>
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-start gap-3">
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", dringend ? "bg-sun-400 text-ink-900" : "bg-ov-600 text-white")}>
            <AlarmClock aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-[18px] font-bold text-ink-900">Jetzt zustimmen – damit {gemeinschaftName ? `„${gemeinschaftName}“` : "Ihre Gemeinschaft"} Sie versorgen kann</p>
            <p className="mt-1 text-[14px] text-ink-700">Ohne Ihre Zustimmung im Portal des Netzbetreibers verfällt die Anmeldung.{frist ? ` Frist: ${datumDe(frist.bis)}.` : ""}</p>
          </div>
        </div>
        {frist && (
          <div className="shrink-0 text-left md:text-right" aria-live="polite">
            <p className="ov-num font-display text-[34px] font-extrabold leading-none tracking-tight text-ink-900">{frist.tageRest >= 0 ? frist.tageRest : 0}</p>
            <p className="text-[12.5px] font-medium text-ink-600">{frist.tageRest === 1 ? "Tag" : "Tage"} – {tageText(frist.tageRest)}</p>
          </div>
        )}
      </div>
      {anleitung && (
        <div className="border-t border-ink-200/60 bg-white/70 p-5 md:p-6">
          <p className="mb-4 font-display text-[16px] font-bold text-ink-900">{anleitung.titel}</p>
          <AnleitungSchritte anleitung={anleitung} />
        </div>
      )}
    </div>
  );
}

export function AnleitungSchritte({ anleitung }) {
  return (
    <>
      <ol className="space-y-3">
        {anleitung.schritte.map((s, i) => (
          <li key={s.id} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-950 text-[12.5px] font-bold text-white">{i + 1}</span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[14.5px] font-semibold text-ink-900">{s.titel}</p>
              <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-600">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <ul className="mt-4 space-y-1.5 border-t border-ink-100 pt-4 text-[13px] leading-relaxed text-ink-600">
        {anleitung.hinweise.map((h) => <li key={h} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ov-500" />{h}</li>)}
      </ul>
    </>
  );
}

const tagLabel = (d, heute) => {
  const t = Math.round((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${heute}T12:00:00Z`)) / 864e5);
  return t === 0 ? "Heute" : t === 1 ? "Morgen" : t === -1 ? "Gestern" : datumDe(d);
};
const min = (hhmm) => {
  const [h, m] = String(hhmm || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Tagesleiste 0–24 Uhr mit „grünen Stunden“ (Prognose WP3 oder typische Sonnenfenster) */
export function GrueneStunden({ stunden, heute }) {
  if (!stunden?.tage?.length) return null;
  return (
    <div className="space-y-4">
      {stunden.tage.map((t) => (
        <div key={t.datum}>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
            <span className="font-semibold text-ink-800">{tagLabel(t.datum, heute)}</span>
            <span className="text-ink-500">{t.fenster.map((f) => `${f.von}–${f.bis}`).join(" · ")}{t.quotePct !== undefined ? ` · ca. ${String(t.quotePct).replace(".", ",")} % Deckung` : ""}</span>
          </div>
          <div className="relative h-6 overflow-hidden rounded-full bg-navy-950" role="img" aria-label={`${tagLabel(t.datum, heute)}: viel Gemeinschaftsstrom ${t.fenster.map((f) => `von ${f.von} bis ${f.bis} Uhr`).join(" und ")}`}>
            {t.fenster.map((f) => (
              <span key={f.von} className={cn("absolute inset-y-1 rounded-full", f.staerke === "hoch" ? "bg-ov-400" : f.staerke === "mittel" ? "bg-ov-500/70" : "bg-ov-600/50")} style={{ left: `${(min(f.von) / 1440) * 100}%`, width: `${Math.max(2, ((min(f.bis) - min(f.von)) / 1440) * 100)}%` }} />
            ))}
            {[6, 12, 18].map((h) => <span key={h} aria-hidden="true" className="absolute inset-y-0 w-px bg-white/15" style={{ left: `${(h / 24) * 100}%` }} />)}
          </div>
          <div aria-hidden="true" className="mt-1 flex justify-between text-[11px] text-ink-400"><span>0</span><span>6</span><span>12</span><span>18</span><span>24 Uhr</span></div>
        </div>
      ))}
      <p className="flex items-center gap-1.5 text-[12.5px] text-ink-500">
        <Sun aria-hidden="true" className="h-3.5 w-3.5 text-sun-500" />
        {stunden.quelle === "prognose" ? "Prognose aus Wetter- bzw. Klimadaten und den Messwerten Ihrer Gemeinschaft – nur Empfehlung, keine Steuerung." : "Typische Sonnenstunden für diese Jahreszeit – eine Prognose für Ihre Gemeinschaft folgt, sobald Messwerte vorliegen."}
      </p>
    </div>
  );
}

const ICON = { zeit: Clock, tarif: Tag, speicher: BatteryCharging, wallbox: PlugZap, tf: SlidersHorizontal };

export function Empfehlungen({ liste = [] }) {
  if (!liste.length) return null;
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {liste.slice(0, 6).map((a) => {
        const Icon = ICON[a.art] || Sun;
        const inhalt = (
          <>
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", a.prio === 1 ? "bg-ov-600 text-white" : "bg-ov-50 text-ov-700")}>
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[14.5px] font-semibold text-ink-900">{a.titel}</span>
              <span className="mt-0.5 block text-[13.5px] leading-relaxed text-ink-600">{a.text}</span>
            </span>
          </>
        );
        return (
          <li key={a.id}>
            {a.link ? (
              <Link href={a.link} className="flex h-full gap-3 rounded-2xl bg-white p-4 ring-1 ring-ink-200/70 transition-shadow hover:shadow-[0_12px_32px_-18px_rgba(3,18,43,0.35)] hover:ring-ov-200">{inhalt}</Link>
            ) : (
              <div className="flex h-full gap-3 rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">{inhalt}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function Meilensteine({ liste = [] }) {
  if (!liste.length) return null;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {liste.map((m) => (
        <li key={m.id} className={cn("rounded-2xl p-3.5 ring-1", m.erreicht ? "bg-ov-50 ring-ov-200" : "bg-white ring-ink-200/70")}>
          <Award aria-hidden="true" className={cn("h-5 w-5", m.erreicht ? "text-ov-600" : "text-ink-300")} />
          <p className={cn("mt-2 text-[13px] font-semibold leading-snug", m.erreicht ? "text-ink-900" : "text-ink-500")}>{m.label}</p>
          <div className="mt-2 h-1.5 rounded-full bg-ink-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={m.fortschrittPct} aria-label={m.label}>
            <div className="h-1.5 rounded-full bg-ov-500" style={{ width: `${Math.max(3, m.fortschrittPct)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Balken der Teilnahmefaktoren eines Zählpunkts über alle Gemeinschaften (Mehrfachteilnahme) */
const FARBEN = ["bg-ov-500", "bg-navy-600", "bg-ov-300", "bg-navy-300", "bg-sun-400"];
export function TfBalken({ z }) {
  return (
    <div>
      <div className="flex h-3.5 overflow-hidden rounded-full bg-ink-100" role="img" aria-label={`Teilnahmefaktoren: ${z.teilnahmen.filter((t) => t.zaehlt).map((t) => `${t.gemeinschaft} ${t.teilnahmefaktor} %`).join(", ")}; frei ${z.freiTf} %`}>
        {z.teilnahmen.filter((t) => t.zaehlt).map((t, i) => <span key={t.teilnahmeId} className={cn(FARBEN[i % FARBEN.length], t.status !== "aktiv" && "opacity-60")} style={{ width: `${t.teilnahmefaktor}%` }} />)}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-600">
        {z.teilnahmen.filter((t) => t.zaehlt).map((t, i) => (
          <li key={t.teilnahmeId} className="flex items-center gap-1.5"><span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-[3px]", FARBEN[i % FARBEN.length])} />{t.gemeinschaft} <span className="ov-num font-semibold text-ink-800">{t.teilnahmefaktor} %</span>{t.status !== "aktiv" ? ` (${t.statusLabel})` : ""}</li>
        ))}
        {z.freiTf > 0 && <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px] bg-ink-200" />frei <span className="ov-num font-semibold text-ink-800">{z.freiTf} %</span></li>}
      </ul>
    </div>
  );
}
