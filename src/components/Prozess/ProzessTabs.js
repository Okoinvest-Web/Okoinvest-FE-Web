"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "@/components/Land/Link";
import { ArrowRight, Clock, Factory, FileText, FolderUp, LayoutDashboard, LineChart, MapPinned, Tractor, User, Building2 } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { ZIELGRUPPEN as ALLE_WEGE, zielgruppenFuerSprache } from "./prozessDaten";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import useLand from "@/components/Land/useLand";
import st from "@/components/Unternehmen/vertrauen.module.css";

const ICONS = { MapPinned, Tractor, LineChart, FolderUp, Factory };

/**
 * Tabs je Zielgruppe + große Zeitleiste.
 * Der gewählte Tab steht im Anker (#investor …) – teilbar und per Link ansteuerbar.
 * Bewegung mit Bedeutung:
 *  - Tab-Wechsel: Die Statusstufen bauen sich von links nach rechts auf
 *    (Punkt → Linie → Punkt …) – so liest sich die Reihenfolge im Portal.
 *  - Zeitleiste: Die Schiene füllt sich beim Scrollen, die Schritt-Kachel
 *    „zündet“, sobald die Füllung sie erreicht.
 *  - Schritt 1 trägt den Einstieg („Hier starten“) für die gewählte Rolle.
 * Reduzierte Bewegung: alles sofort und statisch.
 */
export default function ProzessTabs() {
  const { land } = useLand();
  const sprache = useSprache();
  const en = sprache === "en";
  const ZIELGRUPPEN = useMemo(() => zielgruppenFuerSprache(land, sprache), [land, sprache]);
  const [aktiv, setAktiv] = useState(ZIELGRUPPEN[0].id);
  const basis = useId();
  const refs = useRef({});

  useEffect(() => {
    const lesen = () => {
      const h = window.location.hash.replace("#", "");
      if (ALLE_WEGE.some((z) => z.id === h)) setAktiv(h);
    };
    lesen();
    window.addEventListener("hashchange", lesen);
    return () => window.removeEventListener("hashchange", lesen);
  }, []);

  const waehlen = (id, fokus = false) => {
    setAktiv(id);
    try {
      window.history.replaceState(null, "", `#${id}`);
    } catch {}
    if (fokus) refs.current[id]?.focus();
  };

  const tastatur = (e) => {
    const i = ZIELGRUPPEN.findIndex((z) => z.id === aktiv);
    let n = null;
    if (e.key === "ArrowRight") n = (i + 1) % ZIELGRUPPEN.length;
    if (e.key === "ArrowLeft") n = (i - 1 + ZIELGRUPPEN.length) % ZIELGRUPPEN.length;
    if (e.key === "Home") n = 0;
    if (e.key === "End") n = ZIELGRUPPEN.length - 1;
    if (n != null) {
      e.preventDefault();
      waehlen(ZIELGRUPPEN[n].id, true);
    }
  };

  const z = ZIELGRUPPEN.find((x) => x.id === aktiv);

  return (
    <div>
      {/* Sprungziele für Links wie /prozess#investor (Rollenwahl im Kopf) */}
      {ZIELGRUPPEN.map((g) => (
        <span key={g.id} id={g.id} aria-hidden="true" className="block scroll-mt-28" />
      ))}
      <div
        role="tablist"
        aria-label={en ? "Choose your role" : "Zielgruppe wählen"}
        onKeyDown={tastatur}
        className="grid grid-cols-2 gap-1.5 rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-ink-200/70 sm:grid-cols-3 lg:grid-cols-5"
      >
        {ZIELGRUPPEN.map((g) => {
          const an = g.id === aktiv;
          const Icon = ICONS[g.icon] || User;
          return (
            <button
              key={g.id}
              ref={(el) => (refs.current[g.id] = el)}
              type="button"
              role="tab"
              id={`${basis}-t-${g.id}`}
              aria-selected={an}
              aria-controls={`${basis}-p`}
              tabIndex={an ? 0 : -1}
              onClick={() => waehlen(g.id)}
              className={cn(
                "flex min-h-14 items-center justify-center gap-2 rounded-xl px-3 text-[14.5px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500",
                an ? "bg-navy-950 text-white shadow" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                g.id === "unternehmen" && "col-span-2 sm:col-span-1"
              )}
            >
              <Icon aria-hidden="true" className={cn("h-[18px] w-[18px] shrink-0", an ? "text-ov-300" : "text-ov-600")} />
              {g.label}
            </button>
          );
        })}
      </div>

      <div key={z.id} id={`${basis}-p`} role="tabpanel" aria-labelledby={`${basis}-t-${z.id}`} className="ov-tab-panel mt-8 md:mt-10">
        {/* Kopf mit Statusleiste */}
        <div className="ov-verlauf-nacht ov-noise relative grid gap-6 overflow-hidden rounded-[2rem] p-6 text-white md:p-9 lg:grid-cols-[1fr_auto] lg:items-end">
          <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 opacity-50" />
          <div className="relative">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ov-300">
              <Clock aria-hidden="true" className="h-4 w-4" />
              {z.gesamt}
            </p>
            <p className="mt-3 max-w-2xl text-[16.5px] leading-relaxed text-white/80">{z.intro}</p>
          </div>
          <Link
            href={z.cta.href}
            className="group relative inline-flex h-12 items-center justify-center gap-2 self-start rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300 lg:self-auto"
          >
            {z.cta.label}
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
          </Link>
          <div className="relative border-t border-white/10 pt-6 lg:col-span-2">
            <p className="mb-4 flex items-center gap-2 text-[13px] text-white/70">
              <LayoutDashboard aria-hidden="true" className="h-4 w-4" />
              {en ? "Status stages in the portal" : "Statusstufen im Portal"}
            </p>
            {/* Mobil: Chips, ab md: verbundene Schiene */}
            <ol className="flex flex-wrap gap-2 md:grid md:gap-0" style={{ gridTemplateColumns: `repeat(${z.schritte.length}, minmax(0, 1fr))` }} aria-label={en ? "Status stages in the portal" : "Statusstufen im Portal"}>
              {z.schritte.map((s, i) => (
                <li
                  key={s.portal}
                  className="relative inline-flex items-center gap-2 rounded-full bg-white/[0.07] py-1.5 pl-1.5 pr-3.5 text-[13px] ring-1 ring-white/10 md:flex md:flex-col md:items-start md:gap-3 md:rounded-none md:bg-transparent md:p-0 md:pr-3 md:ring-0"
                >
                  {i < z.schritte.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={cn(st.sofortL, "absolute left-7 right-0 top-[13px] hidden h-0.5 bg-gradient-to-r from-ov-400 to-ov-400/30 md:block")}
                      style={{ "--t": `${180 + i * 130}ms` }}
                    />
                  )}
                  <span
                    className={cn(st.sofortPop, "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ov-500 text-[11.5px] font-bold shadow-[0_0_0_4px_rgba(3,18,43,0.9)] md:h-7 md:w-7")}
                    style={{ "--t": `${120 + i * 130}ms` }}
                  >
                    {i + 1}
                  </span>
                  <span className="md:text-[13.5px] md:font-semibold">{s.portal}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Zeitleiste */}
        <ol className="relative mx-auto mt-10 max-w-5xl md:mt-14">
          <div aria-hidden="true" className="absolute bottom-8 left-[23px] top-8 w-0.5 bg-ov-100 md:left-[35px]">
            <span className={cn(st.strahl, "absolute inset-0 rounded-full bg-gradient-to-b from-ov-300 via-ov-500 to-ov-600")} />
          </div>
          {z.schritte.map((s, i) => {
            return (
              <li key={s.titel} className="relative pb-6 pl-[60px] last:pb-0 md:pb-8 md:pl-[104px]">
                <span
                  aria-hidden="true"
                  className={cn(st.knotenSanft, "absolute left-0 top-2 z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-white font-display text-[16px] font-extrabold text-ov-600 shadow-lg ring-1 ring-ov-200 md:h-[72px] md:w-[72px] md:text-[22px]")}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink-200/70 md:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <h3 className="font-display text-[20px] font-bold leading-snug text-ink-900">
                      <span className="sr-only">{en ? "Step" : "Schritt"} {i + 1}: </span>
                      {s.titel}
                    </h3>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-3 py-1 text-[12.5px] font-semibold text-ink-700">
                      <Clock aria-hidden="true" className="h-3.5 w-3.5 text-ov-600" />
                      {s.dauer}
                    </span>
                  </div>
                  <dl className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-sand-50 p-4">
                      <dt className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                        <User aria-hidden="true" className="h-3.5 w-3.5" /> {en ? "You" : "Sie"}
                      </dt>
                      <dd className="mt-1.5 text-[14.5px] leading-relaxed text-ink-700">{s.sie}</dd>
                    </div>
                    <div className="rounded-2xl bg-ov-50 p-4">
                      <dt className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-ov-700">
                        <Building2 aria-hidden="true" className="h-3.5 w-3.5" /> ÖkoInvest
                      </dt>
                      <dd className="mt-1.5 text-[14.5px] leading-relaxed text-ink-700">{s.wir}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4 text-[13px]">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-950 px-3 py-1 font-semibold text-white">
                      <LayoutDashboard aria-hidden="true" className="h-3.5 w-3.5 text-ov-300" />
                      Portal: {s.portal}
                    </span>
                    {s.dokumente.map((d) => (
                      <span key={d} className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-3 py-1 text-ink-600 ring-1 ring-ink-200">
                        <FileText aria-hidden="true" className="h-3.5 w-3.5 text-ink-400" />
                        {d}
                      </span>
                    ))}
                  </div>
                  {i === 0 && (
                    <Link
                      href={z.cta.href}
                      className="group mt-4 flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-ov-50 px-4 py-2.5 text-[14.5px] font-semibold text-ov-800 ring-1 ring-ov-200 transition-colors hover:bg-ov-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
                    >
                      <span>
                        <span className="text-ov-700">{en ? "Start here:" : "Hier starten:"}</span> {z.cta.label}
                      </span>
                      <ArrowRight aria-hidden="true" className="ov-pfeil h-4 w-4 shrink-0" />
                    </Link>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
