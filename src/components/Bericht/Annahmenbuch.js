// src/components/Bericht/Annahmenbuch.js – Annahmenbuch der Berichtsseite (Welle 2, Paket B4)
//
// Zu jeder genutzten Annahme: Wert, Quelle (verlinkt, im Druck ausgeschrieben), Stand und Status.
// Werte „zu prüfen“ (und Entwurf/abgelaufen) sind sichtbar markiert – nie nur über Farbe, immer mit Text.
// Daten: src/lib/bericht/annahmenbuch.js (B1-Faktenregister, Fallback „Stand laut Rechenlogik“).

import { CircleCheck, CircleAlert } from "lucide-react";
import { cn } from "@/components/ui/cn";

const datum = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "–";
  const [j, m, t] = iso.slice(0, 10).split("-");
  return `${t}.${m}.${j}`;
};

export default function Annahmenbuch({ buch, id = "annahmenbuch" }) {
  const eintraege = buch?.eintraege || [];
  const offen = eintraege.filter((x) => x.zuPruefen).length;
  return (
    <section aria-labelledby={id} className="ov-bericht-abschnitt">
      <h2 id={id} className="font-display text-[22px] font-extrabold tracking-tight text-ink-900">
        Annahmenbuch
      </h2>
      <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-600">
        Alle Annahmen, auf denen dieses Ergebnis beruht – mit Quelle und Stand. {eintraege.length} Annahmen, davon{" "}
        <strong className="font-semibold text-ink-900">{offen} mit ausstehender Prüfung</strong> am Original.
        {buch?.rechenbasis && buch.rechenbasis !== buch.land ? ` Gerechnet wurde mit der Rechenbasis ${buch.rechenbasis}.` : ""}
      </p>
      {buch?.hinweis && <p className="mt-2 text-[13.5px] text-ink-600">{buch.hinweis}</p>}

      <ul className="mt-5 divide-y divide-ink-100 rounded-2xl ring-1 ring-ink-200/80" aria-label="Annahmen">
        {eintraege.map((x) => (
          <li key={x.id} className="ov-bericht-zeile grid gap-x-6 gap-y-1.5 px-4 py-3.5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.7fr)_minmax(0,1.2fr)] md:px-5" data-annahme={x.id} data-zu-pruefen={x.zuPruefen ? "ja" : "nein"}>
            <div className="min-w-0">
              <p className="text-[14.5px] font-semibold leading-snug text-ink-900">{x.label}</p>
              <p className="mt-1">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold ring-1 ring-inset",
                    x.zuPruefen ? "bg-sun-50 text-sun-700 ring-sun-200" : "bg-ov-50 text-ov-800 ring-ov-200"
                  )}
                >
                  {x.zuPruefen ? <CircleAlert aria-hidden="true" className="h-3.5 w-3.5" /> : <CircleCheck aria-hidden="true" className="h-3.5 w-3.5" />}
                  {x.statusText}
                </span>
              </p>
            </div>
            <p className="ov-num text-[14.5px] font-semibold text-ink-900 md:text-right">
              <span className="sr-only">Wert: </span>
              {x.wert}
            </p>
            <div className="min-w-0 text-[13.5px] leading-relaxed text-ink-600">
              <p>
                <span className="font-medium text-ink-700">Quelle: </span>
                {x.quelle?.url ? (
                  <a href={x.quelle.url} className="ov-bericht-link break-words text-ink-800 underline underline-offset-2 hover:text-ov-800" rel="noopener noreferrer" target="_blank">
                    {x.quelle.titel}
                  </a>
                ) : (
                  <span className="break-words">{x.quelle?.titel}</span>
                )}
              </p>
              <p>
                <span className="font-medium text-ink-700">Stand: </span>
                {datum(x.stand)}
                {x.gueltigBis ? ` · gültig bis ${datum(x.gueltigBis)}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {buch?.quellenRechenlogik?.length > 0 && eintraege.some((x) => x.herkunft === "rechenlogik") && (
        <div className="mt-5 text-[13.5px] leading-relaxed text-ink-600">
          <p className="font-semibold text-ink-800">Quellen der Rechenlogik (Auswahl)</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            {buch.quellenRechenlogik.map((q) => (
              <li key={q.titel}>
                {q.url ? (
                  <a href={q.url} className="ov-bericht-link break-words underline underline-offset-2 hover:text-ov-800" rel="noopener noreferrer" target="_blank">
                    {q.titel}
                  </a>
                ) : (
                  q.titel
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
