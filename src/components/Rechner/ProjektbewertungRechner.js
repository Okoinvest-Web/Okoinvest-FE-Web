"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarClock, Coins, Info, ShieldAlert, Store } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Zahl } from "./bausteine";
import { useTeilbarerZustand } from "./kontext";
import { ErgebnisKopf, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { LAENDER, NETZSTATUS, STANDARD, VERMARKTUNG, bewerteProjekt } from "@/lib/rechner/projektbewertung";
import { PHASEN, PROVISION } from "@/lib/invest/markt";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { begriffEn } from "@/lib/sprache/begriffe";
import { RISIKO_EN, projektTextEn, provisionTextEn } from "@/lib/sprache/rechnerBegriffe";

const eurGesamtMit = (f) => (v) => (v >= 1e6 ? f.fmtMio(v, 2) : f.sprache === "en" ? `€${f.fmt(Math.round(v / 1000))}k` : `${f.fmt(Math.round(v / 1000))} T€`);

// Sprachmodell: Texte des Rechners (Werttreiber usw. aus src/lib/sprache/rechnerBegriffe.js)
const TEXTE = {
  de: {
    laender: { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" },
    netz: {},
    vermarktung: {},
    phase: (p) => p.label,
    phaseKurz: (p) => p.kurz,
    risiko: (r) => r.risiko,
    text: (x) => x,
    provision: (x) => x,
    eurKwp: "€/kWp",
    gesamtMitte: "Gesamt Mitte",
    risikoL: "Risiko",
    projekt: "Projekt",
    leistung: "Leistung",
    land: "Land",
    stand: "Entwicklungsstand",
    eur: "€",
    netzanschluss: "Netzanschluss",
    status: "Status",
    entfernung: "Entfernung zum Einspeisepunkt",
    vermarktungT: "Vermarktung",
    gesichert: "Erlöse gesichert?",
    sr: (a, b, c, d, r) => `Kaufpreisspanne ${a} bis ${b} Euro je Kilowatt-Peak, gesamt ${c} bis ${d}, Risiko ${r}`,
    orientierung: "Orientierungswert",
    anlagenwert: "Anlagenwert je kWp",
    kaufpreis: "Kaufpreis je kWp",
    spanne: "Spanne",
    gesamt: "Gesamt (Mitte)",
    betriebsrisiko: "Betriebsrisiko",
    bisRtb: (n) => `bis RTB ≈ ${n} Monate`,
    treiber: "Werttreiber",
    keineTreiber: "Keine besonderen Werttreiber erkannt.",
    minderer: "Wertminderer",
    keineMinderer: "Keine wesentlichen Abschläge.",
    boerse: "Projekt in der Börse anbieten",
    boerseText: (p) => `Anonymer Exposé-Teaser, Käufer mit Suchprofil, NDA und Datenraum über die Plattform. Provision ${p}.`,
    anbieten: "Projekt anbieten",
    fuss: "Marktspannen DACH 2025/26 – Orientierung für ein erstes Gespräch, kein Wertgutachten. Den Preis bestimmen Due Diligence, Zahlungsstruktur und Wettbewerb der Käufer.",
    treppe: "Werttreppe bis Baureife",
    treppeText: (mark) => `Marktspanne je Phase in €/kWp${mark ? " · Ihr Projekt markiert" : ""}`,
    treppeAria: "Werttreppe der Projektphasen",
    treppeFuss: (a, b) => `Dunkler Teil: untere Marktspanne, heller Teil: obere. Gestrichelt: Mittelwert Ihres Projekts nach Zu- und Abschlägen. Bestandsanlagen werden als Ganzes bewertet (heute grob ${a}–${b} €/kWp).`,
  },
  en: {
    laender: { DE: "Germany", AT: "Austria", CH: "Switzerland" },
    netz: { offen: ["Still open", "no request/commitment"], anfrage: ["Requested", "grid check under way"], zusage: ["Commitment", "feed-in point named"], reserviert: ["Reserved", "capacity contracted"] },
    vermarktung: { keine: ["Open"], eeg: ["EEG award"], ppa: ["PPA signed"] },
    phase: (p) => begriffEn("phase", p.id, p.label),
    phaseKurz: (p) => begriffEn("phaseKurz", p.id, p.kurz),
    risiko: (r) => RISIKO_EN[r.risikoStufe] ?? r.risiko,
    text: (x) => projektTextEn(x),
    provision: (x) => provisionTextEn(x),
    eurKwp: "€/kWp",
    gesamtMitte: "Total mid",
    risikoL: "Risk",
    projekt: "Project",
    leistung: "Capacity",
    land: "Country",
    stand: "Development stage",
    eur: "€",
    netzanschluss: "Grid connection",
    status: "Status",
    entfernung: "Distance to the feed-in point",
    vermarktungT: "Marketing",
    gesichert: "Revenue secured?",
    sr: (a, b, c, d, r) => `Purchase price range ${a} to ${b} euros per kilowatt peak, total ${c} to ${d}, risk ${r}`,
    orientierung: "Indicative value",
    anlagenwert: "Plant value per kWp",
    kaufpreis: "Purchase price per kWp",
    spanne: "Range",
    gesamt: "Total (mid)",
    betriebsrisiko: "operating risk",
    bisRtb: (n) => `to RTB ≈ ${n} months`,
    treiber: "Value drivers",
    keineTreiber: "No particular value drivers identified.",
    minderer: "Value reducers",
    keineMinderer: "No significant discounts.",
    boerse: "Offer your project on the exchange",
    boerseText: (p) => `Anonymous exposé teaser, buyers with a search profile, NDA and data room via the platform. Fee ${p}.`,
    anbieten: "Offer a project",
    fuss: "DACH market ranges 2025/26 – guidance for a first conversation, not an expert valuation. The price is determined by due diligence, payment structure and competition among buyers.",
    treppe: "Value staircase to ready-to-build",
    treppeText: (mark) => `Market range per phase in €/kWp${mark ? " · your project highlighted" : ""}`,
    treppeAria: "Value staircase of the project phases",
    treppeFuss: (a, b) => `Dark part: lower market range, light part: upper. Dashed: mid-point of your project after premiums and discounts. Operating assets are valued as a whole (currently roughly €${a}–${b}/kWp).`,
  },
};
const mitTab = (liste, tab) => liste.map((x) => ({ ...x, label: tab[x.id]?.[0] ?? x.label, sub: tab[x.id]?.[1] ?? x.sub }));

export default function ProjektbewertungRechner() {
  const t = useTexte(TEXTE);
  const f = useFormate();
  const { fmt } = f;
  const eurGesamt = eurGesamtMit(f);
  const [mwp, setMwp] = useState(STANDARD.mwp);
  const [phase, setPhase] = useState(STANDARD.phase);
  const [netz, setNetz] = useState(STANDARD.netz);
  const [netzKm, setNetzKm] = useState(STANDARD.netzKm);
  const [vermarktung, setVermarktung] = useState(STANDARD.vermarktung);
  const [land, setLand] = useState(STANDARD.land);

  const setzer = { mwp: setMwp, phase: setPhase, netz: setNetz, netzKm: setNetzKm, vermarktung: setVermarktung, land: setLand };
  useTeilbarerZustand({ mwp, phase, netz, netzKm, vermarktung, land }, (neu) => Object.entries(neu).forEach(([k, v]) => setzer[k]?.(v)), {
    optionen: { phase: PHASEN.map((p) => p.id), netz: NETZSTATUS.map((x) => x.id), vermarktung: VERMARKTUNG.map((x) => x.id), land: LAENDER.map((x) => x.id) },
    pruefen: bewerteProjekt,
  });

  const r = useMemo(() => bewerteProjekt({ mwp, phase, netz, netzKm, vermarktung, land }), [mwp, phase, netz, netzKm, vermarktung, land]);
  const bestand = phase === "cod";
  const risiko = t.risiko(r);

  return (
    <RechnerRahmen
      eingaben={
        <>
          <MobilKurz
            werte={[
              [t.eurKwp, `${fmt(r.preisKwp.min)}–${fmt(r.preisKwp.max)}`],
              [t.gesamtMitte, eurGesamt(r.gesamt.mittel)],
              [t.risikoL, risiko],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel={t.projekt}>
              <Regler label={t.leistung} wert={mwp} min={1} max={150} step={1} einheit="MWp" onChange={setMwp} />
              <Auswahl legende={t.land} wert={land} onChange={setLand} optionen={LAENDER.map((l) => ({ id: l.id, label: t.laender[l.id] ?? l.label }))} klein />
              <fieldset>
                <legend className="mb-2.5 text-[14.5px] font-semibold text-ink-800">{t.stand}</legend>
                <ol className="space-y-1.5">
                  {PHASEN.map((p, i) => {
                    const aktiv = p.id === phase;
                    const erreicht = i <= r.phaseIndex;
                    return (
                      <li key={p.id}>
                        <label
                          className={cn(
                            "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-[14px] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
                            aktiv ? "bg-white font-semibold text-ink-900 shadow-[0_2px_8px_-2px_rgba(21,26,36,0.18)] ring-1 ring-ov-300" : "text-ink-600 hover:bg-white/60"
                          )}
                        >
                          <input type="radio" name="phase" value={p.id} checked={aktiv} onChange={() => setPhase(p.id)} className="sr-only" />
                          <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold", erreicht ? "bg-ov-500 text-white" : "bg-ink-200 text-ink-500")}>{i + 1}</span>
                          <span className="min-w-0 flex-1">{t.phase(p)}</span>
                          <span className="ov-num shrink-0 text-[12px] font-normal text-ink-500">
                            {f.sprache === "en" ? `€${fmt(p.preisProKwp.min)}–${fmt(p.preisProKwp.max)}` : `${fmt(p.preisProKwp.min)}–${fmt(p.preisProKwp.max)} €`}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ol>
              </fieldset>
            </Gruppe>

            {!bestand && (
              <Gruppe titel={t.netzanschluss}>
                <Auswahl legende={t.status} wert={netz} onChange={setNetz} spalten={2} klein optionen={mitTab(NETZSTATUS, t.netz)} />
                <Regler label={t.entfernung} wert={netzKm} min={0} max={20} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} km`} onChange={setNetzKm} />
              </Gruppe>
            )}

            <Gruppe titel={t.vermarktungT}>
              <Auswahl legende={t.gesichert} wert={vermarktung} onChange={setVermarktung} optionen={mitTab(VERMARKTUNG, t.vermarktung)} klein />
            </Gruppe>
          </div>
        </>
      }
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {t.sr(fmt(r.preisKwp.min), fmt(r.preisKwp.max), eurGesamt(r.gesamt.min), eurGesamt(r.gesamt.max), risiko)}
          </p>
          <ErgebnisKopf titel={t.orientierung} plakette={`${t.phaseKurz(r.phase)} · ${mwp} MWp`} />

          <Hauptzahl className="mt-5" icon={Coins} label={bestand ? t.anlagenwert : t.kaufpreis} zusatz={t.spanne}>
            <Zahl wert={r.preisKwp.min} einlauf />–<Zahl wert={r.preisKwp.max} einlauf />
            <span className="ov-einheit">€/kWp</span>
          </Hauptzahl>
          <Belege spalten={2}>
            <Kennzahl ton="akzent" icon={Coins} label={t.gesamt} zusatz={`${eurGesamt(r.gesamt.min)} – ${eurGesamt(r.gesamt.max)}`}>
              <Zahl wert={r.gesamt.mittel} format={eurGesamt} delta="hell" />
            </Kennzahl>
            <Kennzahl icon={ShieldAlert} label={t.risikoL} zusatz={bestand ? t.betriebsrisiko : t.bisRtb(r.monateBisRtb)}>
              <span className="text-[0.8em]">{risiko}</span>
            </Kennzahl>
          </Belege>

          <Phasenleiter r={r} />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Liste titel={t.treiber} icon={ArrowUpRight} ton="gut" punkte={r.treiber.map(t.text)} leer={t.keineTreiber} />
            <Liste titel={t.minderer} icon={ArrowDownRight} ton="warnung" punkte={r.minderer.map(t.text)} leer={t.keineMinderer} />
          </div>
          {r.hinweise.length > 0 && (
            <ul className="mt-4 space-y-2">
              {r.hinweise.map((h) => (
                <li key={h} className="flex gap-2.5 rounded-2xl bg-ink-50 px-4 py-3 text-[13.5px] leading-relaxed text-ink-700">
                  <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
                  {t.text(h)}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-7 rounded-3xl bg-ov-50 p-5 ring-1 ring-ov-200 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ov-600 ring-1 ring-ov-200">
                  <Store aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-[18px] font-bold text-ink-900">{t.boerse}</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink-700">{t.boerseText(t.provision(PROVISION.verkaeufer.text))}</p>
                </div>
              </div>
              <Button href="/projektboerse/anbieten" pfeil className="shrink-0">
                {t.anbieten}
              </Button>
            </div>
          </div>

          <p className="mt-5 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-500">
            <CalendarClock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t.fuss}
          </p>
        </>
      }
    />
  );
}

function Phasenleiter({ r }) {
  const t = useTexte(TEXTE);
  const { fmt } = useFormate();
  const max = Math.max(...PHASEN.filter((p) => p.id !== "cod").map((p) => p.preisProKwp.max), r.phase.id === "cod" ? 0 : r.preisKwp.max) * 1.05;
  const phasen = PHASEN.filter((p) => p.id !== "cod");
  return (
    <div className="mt-6 rounded-3xl ring-1 ring-ink-200/70 p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-[17px] font-bold text-ink-900">{t.treppe}</h3>
        <p className="text-[12.5px] text-ink-500">{t.treppeText(r.phase.id !== "cod")}</p>
      </div>
      <ol className="mt-5 grid grid-cols-5 items-end gap-2 sm:gap-3" aria-label={t.treppeAria}>
        {phasen.map((p, i) => {
          const aktiv = p.id === r.phase.id;
          const h = (v) => `${Math.max(4, (v / max) * 150)}px`;
          return (
            <li key={p.id} className="flex flex-col items-center gap-2">
              <div className="relative flex h-[160px] w-full items-end justify-center">
                <div className={cn("absolute bottom-0 w-full max-w-[64px] rounded-t-xl", aktiv ? "bg-ov-200" : "bg-ink-100")} style={{ height: h(p.preisProKwp.max) }} />
                <div className={cn("absolute bottom-0 w-full max-w-[64px] rounded-t-xl", aktiv ? "bg-ov-500" : "bg-ink-300")} style={{ height: h(p.preisProKwp.min) }} />
                {aktiv && (
                  <div
                    className="absolute w-[calc(100%+8px)] max-w-[72px] border-t-2 border-dashed border-ink-900 motion-safe:transition-[bottom] motion-safe:duration-500"
                    style={{ bottom: h(r.preisKwp.mittel) }}
                    aria-hidden="true"
                  />
                )}
              </div>
              <span className={cn("text-center text-[11.5px] leading-tight", aktiv ? "font-semibold text-ink-900" : "text-ink-500")}>
                <span className="sm:hidden" aria-hidden="true">{i + 1}</span>
                <span className="max-sm:sr-only">{t.phaseKurz(p)}</span>
              </span>
              <span className="ov-num text-[11px] text-ink-400">
                {fmt(p.preisProKwp.min)}–{fmt(p.preisProKwp.max)}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-500">
        {t.treppeFuss(fmt(PHASEN[5].preisProKwp.min), fmt(PHASEN[5].preisProKwp.max))}
      </p>
    </div>
  );
}

function Liste({ titel, icon: Icon, ton, punkte, leer }) {
  return (
    <div className={cn("rounded-3xl p-5 ring-1", ton === "gut" ? "bg-ov-50 ring-ov-200" : "bg-sand-50 ring-ink-200/70")}>
      <h3 className="flex items-center gap-2 font-display text-[16px] font-bold text-ink-900">
        <Icon aria-hidden="true" className={cn("h-4.5 w-4.5", ton === "gut" ? "text-ov-600" : "text-sun-500")} /> {titel}
      </h3>
      {punkte.length ? (
        <ul className="mt-3 space-y-2">
          {punkte.map((p) => (
            <li key={p} className="flex gap-2 text-[13.5px] leading-relaxed text-ink-700">
              <span aria-hidden="true" className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", ton === "gut" ? "bg-ov-500" : "bg-sun-500")} />
              {p}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[13.5px] text-ink-500">{leer}</p>
      )}
    </div>
  );
}
