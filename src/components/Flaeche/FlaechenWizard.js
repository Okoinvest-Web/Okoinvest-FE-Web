"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Car, Check, CircleAlert, CircleMinus, CirclePlus, Factory, HandCoins, Info, Landmark, Mountain,
  Recycle, RotateCcw, ShieldAlert, Sprout, TrainFront, Trees, User, Users, Waves, Wheat,
} from "lucide-react";
import { cn } from "@/components/ui/cn";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import { Regler } from "@/components/Rechner/bausteine";
import { BESONDERHEITEN, EIGENTUM, LAENDER, NETZ, NUTZUNGEN, flaechencheck, regionenFuer } from "@/lib/rechner/flaechencheck";
import { AGRI, PACHT, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

const SCHRITTE = ["Standort", "Fläche", "Besonderheiten", "Netz & Eigentum"];
const NUTZUNG_ICON = { acker: Wheat, gruenland: Sprout, konversion: Factory, deponie: Recycle, parkplatz: Car, sonstige: Info };
const BES_ICON = { randstreifen: TrainFront, benachteiligt: Wheat, schutzgebiet: ShieldAlert, wald: Trees, hang: Mountain, ueberschwemmung: Waves };
const EIG_ICON = { allein: User, gemeinschaft: Users, verpachtet: HandCoins, kommune: Landmark };
const AMPEL = {
  gruen: { label: "Gut geeignet", text: "Ihre Fläche bringt gute Voraussetzungen mit. Jetzt lohnt die genaue Prüfung.", farbe: "#669933", ton: "bg-ov-500" },
  gelb: { label: "Bedingt geeignet", text: "Möglich – aber einzelne Punkte müssen wir genau prüfen, bevor es konkret wird.", farbe: "#ffc53d", ton: "bg-sun-400" },
  rot: { label: "Eher schwierig", text: "Als klassischer Solarpark schwierig. Oft gibt es trotzdem Wege – etwa Agri-PV, Nachbarflächen oder ein Carport.", farbe: "#c4cad5", ton: "bg-ink-300" },
};
const spanne = (a, b) => (b >= 1e6 ? `${fmt(a / 1e6, 2)}–${fmt(b / 1e6, 2)} Mio. €` : `${fmt(a / 1000)}–${fmt(b / 1000)} Tsd. €`);

export default function FlaechenWizard() {
  const [schritt, setSchritt] = useState(0);
  const [richtung, setRichtung] = useState("vor");
  const [land, setLand] = useState(null);
  const [regionId, setRegionId] = useState(null);
  const [ha, setHa] = useState(10);
  const [nutzung, setNutzung] = useState(null);
  const [besonderheiten, setBesonderheiten] = useState([]);
  const [netz, setNetz] = useState(null);
  const [eigentum, setEigentum] = useState(null);
  const kopfRef = useRef(null);
  const ersterRender = useRef(true);

  useEffect(() => {
    if (ersterRender.current) {
      ersterRender.current = false;
      return;
    }
    const el = kopfRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 110;
    if (Math.abs(window.scrollY - top) > 120) window.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    el.focus({ preventScroll: true });
  }, [schritt]);

  const regionen = land ? regionenFuer(land) : [];
  const weiterOk = [Boolean(land && regionId), Boolean(nutzung && ha > 0), true, Boolean(netz && eigentum)][schritt];

  const ergebnis = useMemo(
    () => (schritt === 4 ? flaechencheck({ land, regionId, ha, nutzung, besonderheiten, netz, eigentum }) : null),
    [schritt, land, regionId, ha, nutzung, besonderheiten, netz, eigentum]
  );

  function gehe(n) {
    setRichtung(n > schritt ? "vor" : "zurueck");
    setSchritt(n);
  }

  function landWaehlen(id) {
    setLand(id);
    const r = regionenFuer(id);
    setRegionId(r.length === 1 ? r[0].id : r.find((x) => x.id === regionId)?.id || null);
  }

  function umschalten(id) {
    setBesonderheiten((alt) => (alt.includes(id) ? alt.filter((x) => x !== id) : [...alt, id]));
  }

  function neu() {
    setLand(null);
    setRegionId(null);
    setHa(10);
    setNutzung(null);
    setBesonderheiten([]);
    setNetz(null);
    setEigentum(null);
    gehe(0);
  }

  const karte = (an) =>
    cn(
      "relative flex cursor-pointer items-center gap-3.5 rounded-3xl p-4 transition-all focus-within:ring-2 focus-within:ring-ov-500 sm:p-5",
      an ? "bg-ov-50 ring-2 ring-ov-500" : "bg-sand-50 ring-1 ring-ink-200 hover:bg-white hover:ring-ink-300"
    );
  const iconBox = (an) => cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors", an ? "bg-ov-500 text-white" : "bg-white text-ov-600 ring-1 ring-ink-200");
  const legende = "font-display text-[clamp(1.4rem,1.1rem+1vw,1.9rem)] font-extrabold tracking-tight text-ink-900";

  return (
    <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_40px_90px_-50px_rgba(3,18,43,0.55)] ring-1 ring-ink-200/70">
      {/* Fortschritt */}
      <div ref={kopfRef} tabIndex={-1} className="border-b border-ink-100 bg-sand-50/70 px-5 py-5 outline-none sm:px-8 md:px-10">
        <ol className="flex items-center gap-2 sm:gap-3" aria-label="Fortschritt">
          {[...SCHRITTE, "Ergebnis"].map((s, i) => {
            const fertig = i < schritt;
            const aktiv = i === schritt;
            return (
              <li key={s} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 last:flex-none" aria-current={aktiv ? "step" : undefined}>
                <button type="button" disabled={i > schritt} onClick={() => gehe(i)} className="flex min-w-0 items-center gap-2 rounded-full text-left disabled:cursor-default">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-colors", fertig ? "bg-ov-600 text-white" : aktiv ? "bg-navy-950 text-white" : "bg-white text-ink-500 ring-1 ring-ink-200")}>
                    {fertig ? <Check aria-hidden="true" className="h-4 w-4" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={cn("hidden truncate text-[14px] font-semibold xl:block", aktiv ? "text-ink-900" : fertig ? "text-ink-700" : "text-ink-500")}>{s}</span>
                  <span className="sr-only xl:hidden">{s}</span>
                </button>
                {i < 4 && <span aria-hidden="true" className={cn("h-px flex-1", fertig ? "bg-ov-400" : "bg-ink-200")} />}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="p-5 sm:p-8 md:p-10">
        <div key={schritt} className={richtung === "vor" ? "ov-step-vor" : "ov-step-zurueck"}>
          {/* 1 Standort */}
          {schritt === 0 && (
            <div className="space-y-8">
              <fieldset>
                <legend className={legende}>Wo liegt die Fläche?</legend>
                <p className="mt-2 text-[15.5px] text-ink-600">Land und Region bestimmen Einstrahlung, Förderung und Genehmigungsweg.</p>
                <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
                  {LAENDER.map((l) => {
                    const an = land === l.id;
                    return (
                      <label key={l.id} className={cn(karte(an), "flex-col gap-2 text-center sm:flex-row sm:text-left")}>
                        <input type="radio" name="land" value={l.id} checked={an} onChange={() => landWaehlen(l.id)} className="sr-only" />
                        <span className={cn(iconBox(an), "font-display text-[13px] font-extrabold")}>{l.id}</span>
                        <span className="text-[14.5px] font-semibold leading-tight text-ink-900">{l.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              {land && regionen.length > 1 && (
                <fieldset className="ov-step-vor">
                  <legend className="text-[15px] font-semibold text-ink-800">Region</legend>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {regionen.map((r) => {
                      const an = regionId === r.id;
                      return (
                        <label key={r.id} className={cn(karte(an), "py-3.5 sm:py-4")}>
                          <input type="radio" name="region" value={r.id} checked={an} onChange={() => setRegionId(r.id)} className="sr-only" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-semibold text-ink-900">{r.label}</span>
                            <span className="block text-[13px] text-ink-500">{r.sub}</span>
                          </span>
                          <span className="ov-num shrink-0 text-[12.5px] font-semibold text-ov-700">{fmt(r.ertrag)} kWh/kWp</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
            </div>
          )}

          {/* 2 Fläche */}
          {schritt === 1 && (
            <div className="space-y-8">
              <div>
                <p className={legende}>Wie groß ist die Fläche?</p>
                <p className="mt-2 text-[15.5px] text-ink-600">Eine grobe Angabe genügt. Mehrere zusammenhängende Flurstücke zählen zusammen.</p>
                <div className="mt-6 grid items-end gap-5 sm:grid-cols-[1fr_auto]">
                  <Regler label="Flächengröße" wert={Math.min(ha, 150)} min={0.5} max={150} step={0.5} stellen={ha % 1 ? 1 : 0} einheit="ha" onChange={setHa} minLabel="0,5 ha" maxLabel="150 ha" />
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-semibold text-ink-600">Genau eingeben</span>
                    <span className="relative block">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0.1}
                        max={2000}
                        step={0.1}
                        value={ha}
                        onChange={(e) => setHa(Math.max(0.1, Math.min(2000, Number(e.target.value) || 0.1)))}
                        className="ov-num h-12 w-full rounded-xl bg-sand-50 pl-4 pr-10 text-[16px] font-semibold text-ink-900 ring-1 ring-ink-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ov-500 sm:w-36"
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-ink-500">ha</span>
                    </span>
                  </label>
                </div>
              </div>
              <fieldset>
                <legend className="text-[15px] font-semibold text-ink-800">Wie wird die Fläche heute genutzt?</legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {NUTZUNGEN.map((n) => {
                    const an = nutzung === n.id;
                    const Icon = NUTZUNG_ICON[n.id];
                    return (
                      <label key={n.id} className={karte(an)}>
                        <input type="radio" name="nutzung" value={n.id} checked={an} onChange={() => setNutzung(n.id)} className="sr-only" />
                        <span className={iconBox(an)}>
                          <Icon aria-hidden="true" className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-display text-[16px] font-bold text-ink-900">{n.label}</span>
                          <span className="block text-[13px] leading-snug text-ink-500">{n.text}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          )}

          {/* 3 Besonderheiten */}
          {schritt === 2 && (
            <fieldset>
              <legend className={legende}>Trifft etwas davon zu?</legend>
              <p className="mt-2 text-[15.5px] text-ink-600">Mehrfachauswahl möglich. Wenn Sie es nicht wissen, lassen Sie es leer – wir prüfen das ohnehin.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {BESONDERHEITEN.filter((b) => b.id !== "benachteiligt" || land === "DE").map((b) => {
                  const an = besonderheiten.includes(b.id);
                  const Icon = BES_ICON[b.id];
                  return (
                    <label key={b.id} className={karte(an)}>
                      <input type="checkbox" checked={an} onChange={() => umschalten(b.id)} className="sr-only" />
                      <span className={iconBox(an)}>
                        <Icon aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 pr-6">
                        <span className="block font-display text-[16px] font-bold leading-snug text-ink-900">{b.label}</span>
                        <span className="block text-[13px] leading-snug text-ink-500">{b.text}</span>
                      </span>
                      <span aria-hidden="true" className={cn("absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full transition-all", an ? "bg-ov-500 text-white" : "bg-white ring-1 ring-ink-300")}>
                        {an && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* 4 Netz & Eigentum */}
          {schritt === 3 && (
            <div className="space-y-9">
              <fieldset>
                <legend className={legende}>Wie weit ist es bis zum Stromnetz?</legend>
                <p className="mt-2 text-[15.5px] text-ink-600">Gemeint ist die nächste Mittelspannungsleitung (Freileitung auf Betonmasten, Trafostation) oder ein Umspannwerk.</p>
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {NETZ.map((n) => {
                    const an = netz === n.id;
                    return (
                      <label key={n.id} className={cn("flex min-h-[56px] cursor-pointer items-center justify-center rounded-2xl px-3 py-2 text-center text-[14.5px] font-semibold transition-all focus-within:ring-2 focus-within:ring-ov-500", an ? "bg-ov-50 text-ov-800 ring-2 ring-ov-500" : "bg-sand-50 text-ink-800 ring-1 ring-ink-200 hover:bg-white")}>
                        <input type="radio" name="netz" value={n.id} checked={an} onChange={() => setNetz(n.id)} className="sr-only" />
                        {n.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-[15px] font-semibold text-ink-800">Wem gehört die Fläche?</legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {EIGENTUM.map((e) => {
                    const an = eigentum === e.id;
                    const Icon = EIG_ICON[e.id];
                    return (
                      <label key={e.id} className={karte(an)}>
                        <input type="radio" name="eigentum" value={e.id} checked={an} onChange={() => setEigentum(e.id)} className="sr-only" />
                        <span className={iconBox(an)}>
                          <Icon aria-hidden="true" className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-display text-[15.5px] font-bold leading-snug text-ink-900">{e.label}</span>
                          <span className="block text-[13px] leading-snug text-ink-500">{e.text}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          )}

          {schritt === 4 && ergebnis && (
            <Ergebnis e={ergebnis} eingaben={{ land, regionId, ha, nutzung, besonderheiten, netz, eigentum }} onNeu={neu} onAendern={gehe} />
          )}
        </div>

        {schritt < 4 && (
          <div className="mt-10 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center">
            {schritt > 0 ? (
              <button type="button" onClick={() => gehe(schritt - 1)} className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold text-ink-700 hover:bg-ink-100">
                <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Zurück
              </button>
            ) : (
              <p className="text-[13px] text-ink-500">Schritt 1 von 4 · dauert ca. 2 Minuten · ohne Anmeldung</p>
            )}
            <button
              type="button"
              disabled={!weiterOk}
              onClick={() => gehe(schritt + 1)}
              className="group inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-ov-600 px-8 text-[16px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] transition-all hover:bg-ov-700 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500 disabled:shadow-none"
            >
              {schritt === 3 ? "Ergebnis anzeigen" : schritt === 2 && besonderheiten.length === 0 ? "Nichts davon – weiter" : "Weiter"}
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-enabled:group-hover:translate-x-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Tacho({ score, farbe }) {
  // Halbkreis 180°, Radius 80
  const r = 80;
  const umfang = Math.PI * r;
  const anteil = Math.max(0, Math.min(100, score)) / 100;
  return (
    <svg viewBox="0 0 200 116" className="h-auto w-full max-w-[220px]" role="img" aria-label={`Punktwert ${score} von 100`}>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="16" strokeLinecap="round" />
      <path
        d="M20 100 A80 80 0 0 1 180 100"
        fill="none"
        stroke={farbe}
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray={`${umfang * anteil} ${umfang}`}
        className="motion-safe:transition-[stroke-dasharray] motion-safe:duration-700"
      />
      <text x="100" y="92" textAnchor="middle" className="fill-white font-display text-[40px] font-extrabold">{score}</text>
      <text x="100" y="112" textAnchor="middle" className="fill-white/60 text-[11px]">von 100 Punkten</text>
    </svg>
  );
}

function Ergebnis({ e, eingaben, onNeu, onAendern }) {
  const a = AMPEL[e.ampel];
  const nutzungLabel = NUTZUNGEN.find((n) => n.id === eingaben.nutzung)?.label;
  const netzLabel = NETZ.find((n) => n.id === eingaben.netz)?.label;

  const daten = {
    quelle: "flaechencheck",
    eingaben: {
      land: eingaben.land,
      region: e.region.label,
      flaecheHa: eingaben.ha,
      nutzung: nutzungLabel,
      besonderheiten: eingaben.besonderheiten.map((id) => BESONDERHEITEN.find((b) => b.id === id)?.label),
      netz: netzLabel,
      eigentum: EIGENTUM.find((x) => x.id === eingaben.eigentum)?.label,
    },
    ergebnis: {
      ampel: e.ampel,
      punkte: e.score,
      leistungMwp: Math.round(e.kwp / 100) / 10,
      ertragMwhJahr: Math.round(e.kwh / 1000),
      pachtJahrEur: [Math.round(e.pachtJahr.min), Math.round(e.pachtJahr.max)],
      pacht30JahreEur: [Math.round(e.pacht30.min), Math.round(e.pacht30.max)],
      netzkostenEurProKwp: e.netzProKwp ? Math.round(e.netzProKwp) : null,
      gruende: e.gruende.map((g) => `${g.punkte > 0 ? "+" : ""}${g.punkte} ${g.text}`),
      stand: STAND,
    },
  };

  return (
    <div>
      {/* Zusammenfassung */}
      <div className="ov-noise relative overflow-hidden rounded-3xl bg-navy-950 p-6 text-white md:p-8">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div aria-hidden="true" className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-ov-500/30 blur-[90px]" />
        <div className="relative grid items-center gap-6 md:grid-cols-[auto_1fr] md:gap-10">
          <div className="mx-auto w-full max-w-[220px]">
            <Tacho score={e.score} farbe={a.farbe} />
          </div>
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-300">Ihr Flächencheck · Stand {STAND}</p>
            <h2 className="mt-3 flex flex-wrap items-center gap-3 font-display text-[clamp(1.6rem,1.2rem+1.6vw,2.4rem)] font-extrabold leading-tight tracking-tight" aria-live="polite">
              <span aria-hidden="true" className={cn("h-4 w-4 rounded-full ring-4 ring-white/10", a.ton)} />
              {a.label}
            </h2>
            <p className="mt-2 max-w-xl text-[15.5px] leading-relaxed text-white/70">{a.text}</p>
            <ul className="mt-4 flex flex-wrap gap-2 text-[13px]">
              {[
                [e.region.label, 0],
                [`${fmt(eingaben.ha, eingaben.ha % 1 ? 1 : 0)} ha ${nutzungLabel}`, 1],
                [eingaben.besonderheiten.length ? `${eingaben.besonderheiten.length} Besonderheit${eingaben.besonderheiten.length > 1 ? "en" : ""}` : "keine Besonderheiten", 2],
                [`Netz ${netzLabel}`, 3],
              ].map(([c, s]) => (
                <li key={c}>
                  <button type="button" onClick={() => onAendern(s)} className="ov-glass inline-flex items-center rounded-full px-3 py-1.5 text-white/90 hover:bg-white/15" aria-label={`${c} ändern`}>
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Kennzahlen */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Mögliche Leistung", `${fmt(e.kwp / 1000, 1)} MWp`, `auf ~${fmt(e.nutzbarHa, 1)} ha nutzbarer Fläche`],
          ["Stromertrag", `${fmt(e.kwh / 1e6, 1)} GWh/Jahr`, `≈ ${fmt(Math.round(e.kwh / 3500 / 10) * 10)} Haushalte`],
          ["Pacht pro Jahr", spanne(e.pachtJahr.min, e.pachtJahr.max), `${fmt(e.pachtJahr.min / eingaben.ha)}–${fmt(e.pachtJahr.max / eingaben.ha)} €/ha`],
          ["Pacht über 30 Jahre", spanne(e.pacht30.min, e.pacht30.max), `indexiert mit ${fmt(PACHT.indexierung * 100, 1)} % p. a.`],
        ].map(([k, v, z], i) => (
          <div key={k} className={cn("rounded-2xl p-4 md:p-5", i === 2 ? "bg-ov-600 text-white" : "bg-white ring-1 ring-ink-200/70")}>
            <p className={cn("text-[12.5px] font-medium", i === 2 ? "text-white" : "text-ink-500")}>{k}</p>
            <p className="ov-num mt-1 font-display text-[clamp(1.1rem,0.95rem+0.6vw,1.5rem)] font-extrabold leading-tight tracking-tight">{v}</p>
            <p className={cn("mt-1 text-[12.5px] leading-snug", i === 2 ? "text-white" : "text-ink-500")}>{z}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Begründung */}
        <section aria-labelledby="fc-gruende" className="rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 md:p-7">
          <h3 id="fc-gruende" className="font-display text-[19px] font-extrabold tracking-tight text-ink-900">So kommt die Bewertung zustande</h3>
          <ul className="mt-5 space-y-3">
            {e.gruende.map((g) => (
              <li key={g.text} className="flex gap-3 text-[14.5px] leading-relaxed text-ink-700">
                {g.art === "plus" ? (
                  <CirclePlus aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
                ) : g.art === "minus" ? (
                  <CircleMinus aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sun-500" />
                ) : (
                  <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-navy-400" />
                )}
                <span className="min-w-0 flex-1">{g.text}</span>
                {g.punkte !== 0 && (
                  <span className={cn("ov-num shrink-0 font-semibold", g.punkte > 0 ? "text-ov-700" : "text-ink-500")}>
                    {g.punkte > 0 ? "+" : "−"}
                    {Math.abs(g.punkte)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-4">
          {e.agri && (
            <div className="rounded-3xl bg-ov-50 p-5 ring-1 ring-ov-200 md:p-6">
              <p className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
                <Sprout aria-hidden="true" className="h-5 w-5 text-ov-600" /> Option Agri-PV
              </p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-700">
                Soll die Landwirtschaft weitergehen? Mit vertikalen Modulreihen wären rund <strong>{fmt(e.agri.kwp / 1000, 1)} MWp</strong> möglich, {fmt(AGRI.gapFoerderfaehig * 100)} % der Fläche bleiben in der Regel GAP-förderfähig. Pacht meist {fmt(PACHT.agriProHa.min)}–{fmt(PACHT.agriProHa.max)} €/ha – plus Ihre Ernte.
              </p>
              <Link href="/agri-pv" className="mt-3 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-ov-700 hover:text-ov-800">
                Agri-PV ansehen <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          )}
          {e.carport && (
            <div className="rounded-3xl bg-navy-50 p-5 ring-1 ring-navy-100 md:p-6">
              <p className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
                <Car aria-hidden="true" className="h-5 w-5 text-navy-600" /> Solarcarport
              </p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-700">Auf Parkplätzen bauen wir Solarcarports – mit Ladepunkten und ohne Flächenverlust.</p>
              <Link href="/solarcarport" className="mt-3 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-navy-700 hover:text-navy-800">
                Solarcarport ansehen <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          )}
          <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
            <p className="font-display text-[17px] font-bold text-ink-900">Nächste Schritte</p>
            <ol className="mt-4 space-y-3">
              {e.schritte.map((s, i) => (
                <li key={s} className="flex gap-3 text-[14px] leading-relaxed text-ink-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ov-50 text-[12px] font-bold text-ov-700 ring-1 ring-ov-200">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <Link href="/termin?herkunft=flaechencheck&art=beratung_video" className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-ov-600 px-5 text-[14.5px] font-semibold text-white hover:bg-ov-700">
              Beratungstermin buchen
            </Link>
          </div>
        </div>
      </div>

      {/* Anfrage */}
      <section aria-labelledby="fc-anfrage" className="mt-10 grid gap-8 rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 md:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
        <div>
          <h3 id="fc-anfrage" className="font-display text-[clamp(1.35rem,1.1rem+0.8vw,1.75rem)] font-extrabold tracking-tight text-ink-900">Ergebnis an unser Flächenteam senden</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
            Ihre Angaben und dieses Ergebnis werden mitgeschickt – Sie müssen nichts doppelt eingeben. Wir prüfen die Fläche flurstückgenau und melden uns in der Regel innerhalb von zwei Werktagen.
          </p>
          <ul className="mt-5 space-y-2.5 text-[14.5px] text-ink-700">
            {["Kostenfrei und unverbindlich", "Status und Dokumente später im Portal", "Keine Weitergabe an Dritte ohne Ihre Zustimmung"].map((t) => (
              <li key={t} className="flex gap-2.5">
                <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" strokeWidth={3} />
                {t}
              </li>
            ))}
          </ul>
          {e.ampel === "rot" && (
            <p className="mt-5 flex gap-2.5 rounded-2xl bg-white p-4 text-[13.5px] leading-relaxed text-ink-600 ring-1 ring-ink-200">
              <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sun-500" />
              Auch bei roter Ampel lohnt oft ein Blick: Die Heuristik kennt Ihre Fläche nicht im Detail.
            </p>
          )}
        </div>
        <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-7">
          <AnfrageFormular typ="flaeche" daten={daten} felder={["telefon", "plz", "ort", "nachricht"]} button="Ergebnis senden" />
        </div>
      </section>

      <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-ink-100 pt-6 sm:flex-row sm:items-center">
        <p className="max-w-2xl text-[13px] leading-relaxed text-ink-500">
          Erste Einschätzung auf Basis Ihrer Angaben und typischer Marktwerte, Stand {STAND} – kein Angebot und keine Zusage. Netzkapazität, Planungsrecht und Schutzgüter prüfen wir flurstückgenau.
        </p>
        <button type="button" onClick={onNeu} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[14.5px] font-semibold text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50">
          <RotateCcw aria-hidden="true" className="h-4 w-4" /> Neu starten
        </button>
      </div>
    </div>
  );
}
