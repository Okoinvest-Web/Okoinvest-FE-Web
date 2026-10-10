"use client";

// Rechner & Tools der Startseite als Finder: links Filter nach Zielgruppe,
// rechts kompakte Werkzeug-Karten. Server-Render zeigt alle Werkzeuge (SEO,
// funktioniert ohne JavaScript); mobil sind zunächst sechs sichtbar.
import { useId, useMemo, useState } from "react";
import Link from "@/components/Land/Link";
import { ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { TOOL_BEGRIFFE_EN, toolsFuer } from "@/components/Rechner/tools";
import { useSeitenLand } from "@/components/Land/LandKontext";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { cn } from "@/components/ui/cn";
import { pfad } from "@/lib/land";

const REIHENFOLGE = ["Eigentümer", "Landwirte", "Investoren", "Unternehmen", "Kommunen", "Bürger"];
const MOBIL_START = 6;

const TAG_STIL = {
  Beliebt: "bg-sun-100 text-sun-700 ring-sun-200",
  Neu: "bg-ov-50 text-ov-700 ring-ov-200",
  Profi: "bg-navy-50 text-navy-700 ring-navy-200",
};

// Paket D: „Beliebt“ beruht auf keinen Nutzungsdaten (unbelegter Social Proof, § 5 UWG) –
// angezeigt wird eine redaktionelle Empfehlung. Das Feld in Rechner/tools.js gehört Paket E.
const TAG_TEXT = { Beliebt: "Guter Einstieg" };

export default function WerkzeugFinder() {
  const sprache = useSprache();
  const en = sprache === "en";
  const land = useSeitenLand();
  const TOOLS = useMemo(() => toolsFuer(sprache, land), [sprache, land]);
  // Filterschlüssel bleiben die deutschen Zielgruppen aus tools.js; angezeigt wird die Sprache der Seite
  const name = (g) => (en ? TOOL_BEGRIFFE_EN.zielgruppe[g] || g : g);
  const tagText = (tag) => {
    const de = TAG_TEXT[tag] || tag;
    return en ? TOOL_BEGRIFFE_EN.tag[de] || de : de;
  };
  const [filter, setFilter] = useState("Alle");
  const [alleMobil, setAlleMobil] = useState(false);
  const listeId = useId();

  const gruppen = useMemo(() => {
    const zaehler = TOOLS.reduce((m, t) => ({ ...m, [t.zielgruppe]: (m[t.zielgruppe] || 0) + 1 }), {});
    const bekannt = REIHENFOLGE.filter((g) => zaehler[g]);
    const weitere = Object.keys(zaehler).filter((g) => !REIHENFOLGE.includes(g));
    return [{ name: "Alle", anzahl: TOOLS.length }, ...[...bekannt, ...weitere].map((g) => ({ name: g, anzahl: zaehler[g] }))];
  }, [TOOLS]);

  const sichtbar = filter === "Alle" ? TOOLS : TOOLS.filter((t) => t.zielgruppe === filter);
  const kuerzen = filter === "Alle" && !alleMobil && sichtbar.length > MOBIL_START;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
      {/* Filter */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <p id={`${listeId}-label`} className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-500">{en ? "For whom?" : "Für wen?"}</p>
        <ul
          role="list"
          aria-labelledby={`${listeId}-label`}
          className="ov-no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0"
        >
          {gruppen.map((g) => {
            const aktiv = g.name === filter;
            return (
              <li key={g.name} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={aktiv}
                  aria-controls={listeId}
                  onClick={() => setFilter(g.name)}
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between gap-3 rounded-full px-4 text-[14.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ov-500 motion-reduce:transition-none lg:rounded-2xl",
                    aktiv
                      ? "bg-navy-950 text-white shadow-e2"
                      : "bg-white text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ov-50 hover:text-ov-800 hover:ring-ov-200 lg:bg-transparent lg:ring-0"
                  )}
                >
                  <span>{name(g.name)}</span>
                  <span className={cn("ov-num rounded-full px-2 py-0.5 text-[11.5px] font-bold", aktiv ? "bg-white/15 text-white" : "bg-ink-100 text-ink-500")}>{g.anzahl}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <Link
          href={pfad("/rechner")}
          className="group mt-6 hidden items-center gap-2 rounded-full text-[14.5px] font-semibold text-ov-700 hover:text-ov-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ov-500 lg:inline-flex"
        >
          {en ? "All calculators at a glance" : "Alle Rechner im Überblick"}
          <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
        </Link>
      </div>

      {/* Werkzeuge */}
      <div>
        <p className="sr-only" aria-live="polite">
          {en ? `${sichtbar.length} tools${filter !== "Alle" ? ` for ${name(filter)}` : ""}` : `${sichtbar.length} Werkzeuge${filter !== "Alle" ? ` für ${filter}` : ""}`}
        </p>
        <ul id={listeId} className="grid gap-3 md:grid-cols-2">
          {sichtbar.map((t, i) => (
            <li key={t.id} className={cn("flex", kuerzen && i >= MOBIL_START && "max-md:hidden")}>
              <Link
                href={t.href}
                className="group ov-press relative flex w-full items-start gap-4 rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60 transition-[background-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-e3 hover:ring-ov-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ov-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:p-5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-ov-600 shadow-e1 ring-1 ring-ink-100 transition-colors duration-300 group-hover:bg-ov-600 group-hover:text-white group-hover:ring-ov-600 motion-reduce:transition-none">
                  <t.icon aria-hidden="true" className="h-[22px] w-[22px]" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1 pt-0.5">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-display text-[16.5px] font-bold leading-snug text-ink-900">{t.titel}</span>
                    {t.tag && (
                      <span className={cn("rounded-full px-2 py-px text-[10.5px] font-bold uppercase tracking-wider ring-1 ring-inset", TAG_STIL[t.tag] || TAG_STIL.Neu)}>{tagText(t.tag)}</span>
                    )}
                  </span>
                  <span className="mt-1 block text-[14px] leading-snug text-ink-500">{t.kurz}</span>
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="mt-1 h-4 w-4 shrink-0 text-ink-400 transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ov-600 motion-reduce:transition-none"
                />
              </Link>
            </li>
          ))}
        </ul>

        {kuerzen && (
          <button
            type="button"
            onClick={() => setAlleMobil(true)}
            aria-controls={listeId}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-[15px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ov-500 md:hidden"
          >
            {en ? `Show all ${sichtbar.length} tools` : `Alle ${sichtbar.length} Werkzeuge zeigen`}
            <ChevronDown aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
        <Link
          href={pfad("/rechner")}
          className="group mt-5 inline-flex items-center gap-2 text-[15px] font-semibold text-ov-700 hover:text-ov-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ov-500 lg:hidden"
        >
          {en ? "All calculators at a glance" : "Alle Rechner im Überblick"}
          <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
        </Link>
      </div>
    </div>
  );
}
