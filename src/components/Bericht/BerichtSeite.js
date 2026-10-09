// src/components/Bericht/BerichtSeite.js – barrierearme HTML-Berichtsseite (Welle 2, Paket B4)
//
// Server-Komponente. Kopf (Rechner, Land, Datum, Prüf-ID, Stand der Rechenlogik), Ergebnis-Kennzahlen, Eingaben,
// Rechenweg, Tabellen/Listen, Annahmenbuch, Grenzen und Haftung (Kennzeichnung „Prüfung Rechtsabteilung“).
// Druck: bericht-druck.css (A4, ohne Navigation, Links ausgeschrieben). Enthält NIE Personendaten.
// Weitere Zustände der Seite /bericht/[token]: BerichtBestaetigung (Double-Opt-in) und BerichtAbgelaufen.

import Link from "@/components/Land/Link";
import { CalendarClock, CircleAlert, FileText, Fingerprint, MailCheck, MapPin, Scale } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { SITE, abs } from "@/data/site";
import { DOI, HAFTUNG, KENNZEICHNUNG_RECHT, BERICHT_HINWEIS_DRUCK } from "@/lib/bericht/texte";
import Annahmenbuch from "./Annahmenbuch";
import { BestaetigenKnopf, DruckKnopf } from "./BerichtAktionen";
import "./bericht-druck.css";
import { pfad } from "@/lib/land";

const LAND_NAME = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" };
const STUFE = {
  gut: { text: "marktüblich", klasse: "bg-ov-50 text-ov-800 ring-ov-200" },
  pruefen: { text: "prüfen", klasse: "bg-sun-50 text-sun-700 ring-sun-200" },
  kritisch: { text: "kritisch", klasse: "bg-danger-50 text-danger-700 ring-danger-200" },
  info: { text: "Hinweis", klasse: "bg-ink-100 text-ink-700 ring-ink-200" },
};

export const datumLang = (iso) => {
  if (!iso) return "–";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "–" : d.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Vienna" });
};

function Rahmen({ children, schmal = false }) {
  return <div className={cn("mx-auto px-4 pb-16 pt-28 sm:px-6 md:pt-32", schmal ? "max-w-[680px]" : "max-w-[920px]")}>{children}</div>;
}

function Abschnitt({ id, titel, children, className }) {
  return (
    <section aria-labelledby={id} className={cn("ov-bericht-abschnitt mt-10", className)}>
      <h2 id={id} className="font-display text-[22px] font-extrabold tracking-tight text-ink-900">
        {titel}
      </h2>
      {children}
    </section>
  );
}

export default function BerichtSeite({ bericht, rechnerPfad = pfad("/rechner") }) {
  const e = bericht.ergebnis || {};
  const land = bericht.land;
  const meta = [
    [MapPin, "Land", LAND_NAME[land] || land],
    [CalendarClock, "Erstellt am", datumLang(bericht.bestaetigtAm || bericht.erstelltAm)],
    [Fingerprint, "Prüf-ID", bericht.pruefId],
    [FileText, "Stand der Rechenlogik", datumLang(bericht.stand)],
  ];
  return (
    <Rahmen>
      <article id="ov-bericht" lang="de" aria-labelledby="bericht-titel" data-bericht={bericht.rechner}>
        <header className="border-b border-ink-200 pb-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ov-800">{SITE.firma} · Bericht</p>
            <DruckKnopf className="print:hidden" />
          </div>
          <h1 id="bericht-titel" className="mt-3 font-display text-[clamp(1.7rem,1.3rem+1.6vw,2.5rem)] font-extrabold leading-tight tracking-tight text-ink-900">
            {e.titel || "Bericht"}
          </h1>
          <dl className="mt-5 grid gap-x-6 gap-y-3 text-[14px] sm:grid-cols-2 lg:grid-cols-4">
            {meta.map(([Icon, k, v]) => (
              <div key={k} className="relative min-w-0 pl-6">
                <Icon aria-hidden="true" className="absolute left-0 top-0.5 h-4 w-4 text-ov-700" />
                <dt className="text-[12.5px] font-medium text-ink-600">{k}</dt>
                <dd className={cn("font-semibold text-ink-900", k === "Prüf-ID" && "ov-num whitespace-nowrap tracking-wide")}>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[13px] text-ink-600 print:hidden">
            Dieser Link ist bis {datumLang(bericht.ablauf)} abrufbar. {BERICHT_HINWEIS_DRUCK}
          </p>
        </header>

        {e.sperre && (
          <p className="mt-7 flex gap-2.5 rounded-2xl bg-sun-50 px-4 py-3 text-[14px] leading-relaxed text-ink-800 ring-1 ring-inset ring-sun-200">
            <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sun-700" />
            <span>
              <strong className="font-semibold">{e.sperre.titel}.</strong> {e.sperre.text}
            </span>
          </p>
        )}

        {e.urteil && (
          <div className={cn("mt-8 rounded-3xl p-5 ring-1 ring-inset md:p-6", (STUFE[e.urteil.stufe] || STUFE.info).klasse)}>
            <p className="font-display text-[21px] font-extrabold tracking-tight">{e.urteil.titel}</p>
            <p className="mt-1 text-[15px] leading-relaxed">{e.urteil.text}</p>
          </div>
        )}

        <Abschnitt id="bericht-ergebnis" titel="Ergebnis">
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {(e.kennzahlen || []).map((k, i) => (
              <div key={k.label} className={cn("ov-bericht-karte rounded-2xl p-4 ring-1 ring-inset md:p-5", i === 0 ? "bg-ov-50 ring-ov-200" : "bg-white ring-ink-200/80")}>
                <dt className="text-[13px] font-medium text-ink-600">{k.label}</dt>
                <dd className="ov-num mt-1 font-display text-[clamp(1.2rem,1rem+0.6vw,1.55rem)] font-extrabold leading-tight tracking-tight text-ink-900">{k.wert}</dd>
                {k.zusatz && <dd className="mt-0.5 text-[13px] text-ink-600">{k.zusatz}</dd>}
              </div>
            ))}
          </dl>
        </Abschnitt>

        {e.eingabenText?.length > 0 && (
          <Abschnitt id="bericht-eingaben" titel="Ihre Eingaben">
            <dl className="mt-4 grid gap-x-8 gap-y-0 rounded-2xl px-4 ring-1 ring-ink-200/80 sm:grid-cols-2 md:px-5">
              {e.eingabenText.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 border-b border-ink-100 py-2.5 text-[14px] last:border-0 sm:[&:nth-last-child(2)]:border-0">
                  <dt className="text-ink-600">{k}</dt>
                  <dd className="text-right font-semibold text-ink-900">{v}</dd>
                </div>
              ))}
            </dl>
          </Abschnitt>
        )}

        <Abschnitt id="bericht-rechenweg" titel="Rechenweg">
          <ol className="mt-4 space-y-3">
            {(e.rechenweg || []).map((t, i) => (
              <li key={t} className="flex gap-3 text-[14.5px] leading-relaxed text-ink-800">
                <span aria-hidden="true" className="ov-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ov-50 text-[12px] font-bold text-ov-800 ring-1 ring-inset ring-ov-200">
                  {i + 1}
                </span>
                <span className="min-w-0">{t}</span>
              </li>
            ))}
          </ol>
        </Abschnitt>

        {e.tabelle && (
          <Abschnitt id="bericht-tabelle" titel={e.tabelle.titel}>
            <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-ink-200/80" role="region" aria-labelledby="bericht-tabelle" tabIndex={0}>
              <table className="w-full min-w-[520px] border-collapse text-[13.5px]">
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
          </Abschnitt>
        )}

        {(e.listen || []).map((l, li) => (
          <Abschnitt key={l.titel} id={`bericht-liste-${li}`} titel={l.titel}>
            <ul className="mt-4 space-y-3">
              {l.eintraege.map((x, i) => (
                <li key={`${i}-${x.titel || ""}`} className="ov-bericht-zeile rounded-2xl bg-white px-4 py-3.5 ring-1 ring-inset ring-ink-200/80 md:px-5">
                  {(x.titel || x.stufe) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {x.titel && <p className="text-[14.5px] font-semibold text-ink-900">{x.titel}</p>}
                      {x.stufe && STUFE[x.stufe] && l.art !== "gruende" && (
                        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[12px] font-semibold ring-1 ring-inset", STUFE[x.stufe].klasse)}>{x.stufeText || STUFE[x.stufe].text}</span>
                      )}
                      {x.wert && <p className="ov-num text-[13.5px] text-ink-700">{x.wert}</p>}
                    </div>
                  )}
                  {x.text && <p className={cn("text-[14px] leading-relaxed text-ink-700", (x.titel || x.stufe) && "mt-1")}>{x.text}</p>}
                </li>
              ))}
            </ul>
          </Abschnitt>
        ))}

        {e.hinweise?.length > 0 && (
          <ul className="mt-8 space-y-2 text-[14px] leading-relaxed text-ink-700">
            {e.hinweise.map((h) => (
              <li key={h} className="flex gap-2.5">
                <CircleAlert aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ink-500" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10">
          <Annahmenbuch buch={e.annahmen} id="bericht-annahmen" />
        </div>

        <Abschnitt id="bericht-grenzen" titel="Grenzen und Haftung" className="rounded-3xl bg-sand-50 p-5 ring-1 ring-inset ring-ink-200/70 md:p-7">
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200" data-pruefung="rechtsabteilung">
            <Scale aria-hidden="true" className="h-3.5 w-3.5" />
            {KENNZEICHNUNG_RECHT}
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-ink-700">
            {HAFTUNG.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Abschnitt>

        <footer className="mt-10 border-t border-ink-200 pt-6 text-[13px] leading-relaxed text-ink-600">
          <p>
            {SITE.firma} · Prüf-ID <span className="ov-num font-semibold text-ink-800">{bericht.pruefId}</span> · Rechenlogik vom {datumLang(bericht.stand)}
          </p>
          <p className="mt-1">
            Rechner erneut öffnen:{" "}
            <a href={abs(rechnerPfad)} className="ov-bericht-link font-medium text-ink-800 underline underline-offset-2 hover:text-ov-800">
              {abs(rechnerPfad).replace(/^https?:\/\//, "")}
            </a>
          </p>
        </footer>
      </article>
    </Rahmen>
  );
}

/** Zustand „offen“: Double-Opt-in mit Knopf (POST) */
export function BerichtBestaetigung({ token, titel, laeuft = false }) {
  return (
    <Rahmen schmal>
      <section aria-labelledby="bestaetigen-titel" className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/80 md:p-9">
        <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200">
          <MailCheck className="h-6 w-6" />
        </span>
        <h1 id="bestaetigen-titel" className="mt-5 font-display text-[clamp(1.5rem,1.2rem+1vw,2rem)] font-extrabold leading-tight tracking-tight text-ink-900">
          {DOI.titel}
        </h1>
        {titel && <p className="mt-2 text-[15px] font-semibold text-ink-700">{titel}</p>}
        <p className="mt-4 text-[15.5px] leading-relaxed text-ink-700">{DOI.text}</p>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
          Mit der Bestätigung erstellen wir Ihren Bericht und legen zu diesem Ergebnis eine Anfrage bei unserem Team an. Haben Sie nichts angefordert, schließen Sie diese Seite einfach – Ihre Angaben verfallen dann
          automatisch.
        </p>
        <div className="mt-7">{laeuft ? <p className="text-[14.5px] text-ink-700">Die Bestätigung läuft bereits – bitte laden Sie die Seite in einem Moment neu.</p> : <BestaetigenKnopf token={token}>{DOI.knopf}</BestaetigenKnopf>}</div>
      </section>
    </Rahmen>
  );
}

/** Zustand „abgelaufen“ (die Seite liefert keinen Inhalt mehr; die API antwortet mit 410) */
export function BerichtAbgelaufen() {
  return (
    <Rahmen schmal>
      <section aria-labelledby="abgelaufen-titel" className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/80 md:p-9" data-bericht-zustand="abgelaufen">
        <h1 id="abgelaufen-titel" className="font-display text-[clamp(1.5rem,1.2rem+1vw,2rem)] font-extrabold leading-tight tracking-tight text-ink-900">
          Dieser Link ist abgelaufen
        </h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-ink-700">
          Bestätigungslinks gelten 48 Stunden, Berichtslinks 30 Tage. Danach löschen wir die Angaben. Sie können den Bericht im Rechner jederzeit neu anfordern – das Ergebnis selbst sehen Sie dort immer ohne Angaben.
        </p>
        <Link href={pfad("/rechner")} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-ov-600 px-5 text-[15px] font-semibold text-white hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">
          Zu den Rechnern
        </Link>
      </section>
    </Rahmen>
  );
}
