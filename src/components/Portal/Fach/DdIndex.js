// Due-Diligence-Index (acht Kategorien nach Marktstandard) und Anzeige des Projektdatenblatts.
// Server-tauglich (keine Hooks). Daten: fach/datenblatt.js (ddIndex, feldAnzeige) – nur für Anbieter, Backoffice
// und Investoren mit freigegebenem Datenraum.

import { CircleCheck, CircleDashed, CircleAlert, CircleX } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Karte } from "@/components/Portal/ui";
import Begriff from "@/components/Portal/Bedienung/Begriff";
import { DATENBLATT_BEREICHE, datenblattKennzahlen, feldAnzeige, feldRelevant, feldWert } from "@/lib/plattform/fach/datenblatt";

export const AMPEL = {
  gruen: { label: "vollständig", icon: CircleCheck, klasse: "bg-ov-50 text-ov-800 ring-ov-200", punkt: "bg-ov-500" },
  gelb: { label: "Lücken / prüfen", icon: CircleAlert, klasse: "bg-sun-300/25 text-ink-900 ring-sun-400/50", punkt: "bg-sun-400" },
  rot: { label: "wesentliche Lücken", icon: CircleX, klasse: "bg-danger-50 text-danger-800 ring-danger-200", punkt: "bg-danger-500" },
  grau: { label: "noch nicht relevant", icon: CircleDashed, klasse: "bg-ink-50 text-ink-500 ring-ink-200", punkt: "bg-ink-300" },
};

export function AmpelPunkt({ ampel, className }) {
  const a = AMPEL[ampel] || AMPEL.grau;
  return <span aria-hidden="true" className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", a.punkt, className)} />;
}

/** DD-Index als Karte; `kompakt` = nur Ampelzeilen ohne Details */
export function DdIndexKarte({ index, titel = "Due-Diligence-Index", untertitel, kompakt = false, aktion }) {
  if (!index) return null;
  return (
    <Karte titel={titel} untertitel={untertitel || "Stand der Unterlagen und Angaben je Prüfbereich – Ampel nach Vollständigkeit und Plausibilität"} aktion={aktion}>
      <ul className="space-y-2.5">
        {index.kategorien.map((k) => {
          const a = AMPEL[k.ampel] || AMPEL.grau;
          const Icon = a.icon;
          return (
            <li key={k.id} className="rounded-2xl ring-1 ring-inset ring-ink-200/70">
              <details className="group" open={!kompakt && k.ampel === "rot"}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <AmpelPunkt ampel={k.ampel} />
                    <span className="min-w-0">
                      <span className="block text-[14.5px] font-semibold text-ink-900">{k.label}</span>
                      <span className="block truncate text-[12.5px] text-ink-500">{k.text}</span>
                    </span>
                  </span>
                  <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset", a.klasse)}>
                    <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                    {k.quote !== null && k.ampel !== "grau" ? `${k.quote} %` : a.label}
                  </span>
                </summary>
                <div className="space-y-2 border-t border-ink-100 px-4 pb-3.5 pt-3 text-[13.5px] leading-relaxed text-ink-700">
                  {k.fehlend.length > 0 && (
                    <p><span className="font-semibold text-ink-900">Fehlt:</span> {k.fehlend.join(" · ")}</p>
                  )}
                  {k.hinweise.map((h, i) => (
                    <p key={i} className={h.stufe === "fehler" ? "text-danger-800" : h.stufe === "warnung" ? "text-ink-900" : "text-ink-600"}>{h.stufe === "fehler" ? "Widerspruch: " : h.stufe === "warnung" ? "Prüfen: " : ""}{h.text}</p>
                  ))}
                  {!k.fehlend.length && !k.hinweise.length && <p className="text-ink-500">{k.ampel === "grau" ? "In dieser Phase werden noch keine Angaben erwartet." : "Keine Auffälligkeiten in den Angaben."}</p>}
                  <p className="text-[12.5px] text-ink-500"><span className="font-semibold">Übliche Prüfpunkte:</span> {(k.pruefpunkte || []).join(" · ")}</p>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-500">Der Index bewertet nur Vollständigkeit und Plausibilität der Angaben im Portal. Er ersetzt keine technische, rechtliche oder steuerliche Due Diligence durch Sachverständige.</p>
    </Karte>
  );
}

/** Datenblatt gruppiert nach Bereichen (nur gefüllte, relevante Felder) */
export function DatenblattAnzeige({ projekt, titel = "Projektdatenblatt", untertitel, leer = "Der Anbieter hat noch kein Datenblatt hinterlegt." }) {
  const p = projekt;
  const kz = datenblattKennzahlen(p);
  const bereiche = DATENBLATT_BEREICHE.map((b) => ({
    ...b,
    zeilen: b.felder.filter((f) => feldRelevant(p, f)).map((f) => ({ f, w: feldAnzeige(f, feldWert(p, f)) })).filter((z) => z.w),
  })).filter((b) => b.zeilen.length);
  return (
    <Karte titel={titel} untertitel={untertitel || "Standard-Datenblatt der Projektbörse – vertraulich"}>
      {bereiche.length ? (
        <div className="space-y-5">
          {(kz.dcAc || kz.p90ZuP50 || kz.jahresertragP50Mwh) && (
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["DC/AC", kz.dcAc ? kz.dcAc.toLocaleString("de-DE") : "–"],
                ["MWp je ha", kz.mwpProHa ? kz.mwpProHa.toLocaleString("de-DE") : "–"],
                ["P90 / P50", kz.p90ZuP50 ? `${(kz.p90ZuP50 * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %` : "–"],
                ["Jahresertrag P50", kz.jahresertragP50Mwh ? `${kz.jahresertragP50Mwh.toLocaleString("de-DE")} MWh` : "–"],
              ].map(([l, w]) => (
                <div key={l} className="rounded-2xl bg-sand-50 px-3.5 py-2.5 ring-1 ring-inset ring-ink-200/60">
                  <dt className="text-[12px] text-ink-500">{l}</dt>
                  <dd className="ov-num text-[15px] font-semibold text-ink-900">{w}</dd>
                </div>
              ))}
            </dl>
          )}
          {bereiche.map((b) => (
            <section key={b.id} aria-label={b.titel}>
              <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-500">{b.titel}{b.id === "wirtschaft" ? " – ungeprüft" : ""}</h3>
              <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {b.zeilen.map(({ f, w }) => (
                  <div key={f.id} className={cn("min-w-0", f.typ === "tabelle" && "sm:col-span-2")}>
                    <dt className="text-[12.5px] text-ink-500">{f.lex ? <Begriff id={f.lex}>{f.label}</Begriff> : f.label}</dt>
                    <dd className="break-words text-[14.5px] text-ink-900">{w}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      ) : (
        <p className="text-[14px] text-ink-500">{leer}</p>
      )}
    </Karte>
  );
}
