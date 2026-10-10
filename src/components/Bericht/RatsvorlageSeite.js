// src/components/Bericht/RatsvorlageSeite.js – druckfertige Ratsvorlage (Muster) auf /bericht/[token] (Welle 3, Paket B8)
//
// Server-Komponente. Gleicher Rahmen und dasselbe Druck-CSS wie der Bericht-Baustein (bericht-druck.css, #ov-bericht):
// Kopf einer Beschlussvorlage (Gemeinde, Gremium, Felder für die Verwaltung), Betreff, Beschlussvorschlag (MUSTER),
// Sachverhalt, Finanzielle Auswirkungen (Zahlen aus dem Rechner bzw. für AT ohne Geldwerte), Landesrecht/Prüfpunkte,
// Verfahren, Annahmenbuch mit Quellen, Grenzen und Haftung. Enthält NIE Personendaten (Gemeinde ist keine Person).
// Daten: bericht.ergebnis aus src/lib/bericht/ratsvorlage.js (serverseitig neu gerechnet).

import { CalendarClock, CircleAlert, FileText, Fingerprint, Landmark, Scale } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { SITE, abs } from "@/data/site";
import { HAFTUNG, KENNZEICHNUNG_RECHT, BERICHT_HINWEIS_DRUCK } from "@/lib/bericht/texte";
import Annahmenbuch from "./Annahmenbuch";
import { DruckKnopf } from "./BerichtAktionen";
import { datumLang } from "./BerichtSeite";
import "./bericht-druck.css";

function Abschnitt({ id, nr, titel, children, className }) {
  return (
    <section aria-labelledby={id} className={cn("ov-bericht-abschnitt mt-10", className)}>
      <h2 id={id} className="font-display text-[21px] font-extrabold tracking-tight text-ink-900">
        {nr ? <span className="ov-num mr-2 text-ov-700">{nr}.</span> : null}
        {titel}
      </h2>
      {children}
    </section>
  );
}

const Leer = () => <span aria-label="frei für die Verwaltung" className="inline-block min-w-[9rem] border-b border-ink-400 align-bottom">&nbsp;</span>;

export default function RatsvorlageSeite({ bericht, rechnerPfad }) {
  const e = bericht.ergebnis || {};
  const v = e.vorlage || {};
  const at = v.land === "AT";
  const meta = [
    [CalendarClock, "Erstellt am", datumLang(bericht.bestaetigtAm || bericht.erstelltAm)],
    [Fingerprint, "Prüf-ID", bericht.pruefId],
    [FileText, "Stand der Rechenlogik", datumLang(bericht.stand)],
  ];
  const kopf = [
    ["Gemeinde", v.gemeinde],
    ["Bundesland", v.bundesland],
    ["Gremium", v.gremium],
    ["Sitzung am", null],
    ["Vorlage-Nr.", null],
    ["Federführung", null],
  ];
  return (
    <div className="mx-auto max-w-[920px] px-4 pb-16 pt-28 sm:px-6 md:pt-32">
      <article id="ov-bericht" lang="de" aria-labelledby="vorlage-titel" data-bericht="ratsvorlage" data-vorlage-land={v.land}>
        <header className="border-b border-ink-200 pb-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ov-800">Beschlussvorlage · Muster</p>
            <DruckKnopf className="print:hidden" />
          </div>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-sun-50 px-3 py-1 text-[12.5px] font-bold text-sun-700 ring-1 ring-inset ring-sun-200" data-muster="">
            <Scale aria-hidden="true" className="h-3.5 w-3.5" />
            Muster ohne Rechtsberatung
          </p>
          <h1 id="vorlage-titel" className="mt-3 font-display text-[clamp(1.5rem,1.2rem+1.3vw,2.2rem)] font-extrabold leading-tight tracking-tight text-ink-900">
            {v.betreff}
          </h1>
          <dl className="mt-6 grid gap-x-8 gap-y-0 rounded-2xl px-4 ring-1 ring-ink-200/80 sm:grid-cols-2 md:px-5">
            {kopf.map(([k, wert]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 border-b border-ink-100 py-2.5 text-[14px] sm:[&:nth-last-child(-n+2)]:border-0 [&:last-child]:border-0">
                <dt className="text-ink-600">{k}</dt>
                <dd className="min-w-0 text-right font-semibold text-ink-900">{wert || <Leer />}</dd>
              </div>
            ))}
          </dl>
          <dl className="mt-5 grid gap-x-6 gap-y-3 text-[13.5px] sm:grid-cols-3">
            {meta.map(([Icon, k, wert]) => (
              <div key={k} className="relative min-w-0 pl-6">
                <Icon aria-hidden="true" className="absolute left-0 top-0.5 h-4 w-4 text-ov-700" />
                <dt className="text-[12.5px] font-medium text-ink-600">{k}</dt>
                <dd className={cn("font-semibold text-ink-900", k === "Prüf-ID" && "ov-num whitespace-nowrap tracking-wide")}>{wert}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[13px] text-ink-600 print:hidden">
            Dieser Link ist bis {datumLang(bericht.ablauf)} abrufbar. {BERICHT_HINWEIS_DRUCK} Felder mit Linie ergänzt Ihre Verwaltung.
          </p>
        </header>

        <p className="mt-7 flex gap-2.5 rounded-2xl bg-sun-50 px-4 py-3 text-[14px] leading-relaxed text-ink-800 ring-1 ring-inset ring-sun-200">
          <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sun-700" />
          <span>{v.muster}</span>
        </p>

        <Abschnitt id="vorlage-beschluss" nr={1} titel="Beschlussvorschlag (Muster)">
          <ol className="mt-4 space-y-3">
            {(v.beschluss || []).map((b, i) => (
              <li key={b} className="ov-bericht-zeile flex gap-3 text-[15px] leading-relaxed text-ink-800">
                <span aria-hidden="true" className="ov-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ov-50 text-[12px] font-bold text-ov-800 ring-1 ring-inset ring-ov-200">
                  {i + 1}
                </span>
                <span className="min-w-0">{b}</span>
              </li>
            ))}
          </ol>
        </Abschnitt>

        <Abschnitt id="vorlage-sachverhalt" nr={2} titel="Sachverhalt">
          <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink-800">
            {(v.sachverhalt || []).map((s) => (
              <p key={s}>{s}</p>
            ))}
          </div>
        </Abschnitt>

        <Abschnitt id="vorlage-finanzen" nr={3} titel="Finanzielle Auswirkungen">
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {(e.kennzahlen || []).map((k, i) => (
              <div key={k.label} className={cn("ov-bericht-karte rounded-2xl p-4 ring-1 ring-inset md:p-5", i === 0 ? "bg-ov-50 ring-ov-200" : "bg-white ring-ink-200/80")}>
                <dt className="text-[13px] font-medium text-ink-600">{k.label}</dt>
                <dd className="ov-num mt-1 font-display text-[clamp(1.15rem,1rem+0.5vw,1.45rem)] font-extrabold leading-tight tracking-tight text-ink-900">{k.wert}</dd>
                {k.zusatz && <dd className="mt-0.5 text-[13px] text-ink-600">{k.zusatz}</dd>}
              </div>
            ))}
          </dl>
          <div className="mt-5 space-y-3 text-[14.5px] leading-relaxed text-ink-800">
            {(v.finanzen || []).map((f) => (
              <p key={f}>{f}</p>
            ))}
          </div>
          {e.tabelle && (
            <div className="mt-5 overflow-x-auto rounded-2xl ring-1 ring-ink-200/80" role="region" aria-label={e.tabelle.titel} tabIndex={0}>
              <table className="w-full min-w-[520px] border-collapse text-[13.5px]">
                <caption className="px-3 pt-3 text-left text-[13.5px] font-semibold text-ink-800">{e.tabelle.titel}</caption>
                <thead className="bg-sand-50 text-left text-ink-700">
                  <tr>
                    {e.tabelle.spalten.map((s, i) => (
                      <th key={s} scope="col" className={cn("px-3 py-2.5 font-semibold", i > 0 && "text-right")}>
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {e.tabelle.zeilen.map((z) => (
                    <tr key={z[0]} className="border-t border-ink-100">
                      {z.map((c, i) =>
                        i === 0 ? (
                          <th key={i} scope="row" className="px-3 py-2 text-left font-semibold text-ink-900">
                            {c}
                          </th>
                        ) : (
                          <td key={i} className="ov-num px-3 py-2 text-right text-ink-800">
                            {c}
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Abschnitt>

        {(e.listen || []).map((l, li) => (
          <Abschnitt key={l.titel} id={`vorlage-liste-${li}`} nr={4 + li} titel={l.titel}>
            <ul className="mt-4 space-y-3">
              {l.eintraege.map((x, i) => (
                <li key={`${i}-${x.titel || ""}`} className="ov-bericht-zeile rounded-2xl bg-white px-4 py-3.5 ring-1 ring-inset ring-ink-200/80 md:px-5">
                  {x.titel && <p className="text-[14.5px] font-semibold text-ink-900">{x.titel}</p>}
                  {x.text && <p className={cn("text-[14px] leading-relaxed text-ink-700", x.titel && "mt-1")}>{x.text}</p>}
                </li>
              ))}
            </ul>
          </Abschnitt>
        ))}

        {!at && v.verfahren?.length > 0 && (
          <Abschnitt id="vorlage-verfahren" nr={4 + (e.listen || []).length} titel="Weiteres Verfahren">
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-[14.5px] leading-relaxed text-ink-800">
              {v.verfahren.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </Abschnitt>
        )}

        {e.rechenweg?.length > 0 && (
          <Abschnitt id="vorlage-rechenweg" titel={at ? "Grundlage" : "Rechenweg der Modellrechnung"}>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-ink-700">
              {e.rechenweg.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </Abschnitt>
        )}

        <div className="mt-10">
          <Annahmenbuch buch={e.annahmen} id="vorlage-annahmen" />
        </div>

        <Abschnitt id="vorlage-grenzen" titel="Grenzen und Haftung" className="rounded-3xl bg-sand-50 p-5 ring-1 ring-inset ring-ink-200/70 md:p-7">
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200" data-pruefung="rechtsabteilung">
            <Scale aria-hidden="true" className="h-3.5 w-3.5" />
            {KENNZEICHNUNG_RECHT}
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-ink-700">
            <li>{v.muster}</li>
            {HAFTUNG.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Abschnitt>

        <footer className="mt-10 border-t border-ink-200 pt-6 text-[13px] leading-relaxed text-ink-600">
          <p className="flex items-center gap-1.5">
            <Landmark aria-hidden="true" className="h-3.5 w-3.5 text-ink-500" />
            {SITE.firma} · Prüf-ID <span className="ov-num font-semibold text-ink-800">{bericht.pruefId}</span> · Rechenlogik vom {datumLang(bericht.stand)}
          </p>
          <p className="mt-1">
            Werkzeug erneut öffnen:{" "}
            <a href={abs(rechnerPfad)} className="ov-bericht-link font-medium text-ink-800 underline underline-offset-2 hover:text-ov-800">
              {abs(rechnerPfad).replace(/^https?:\/\//, "")}
            </a>
          </p>
        </footer>
      </article>
    </div>
  );
}
