"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarClock, Coins, Info, ShieldAlert, Store } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Auswahl, Gruppe, Kennzahl, Regler, Zahl } from "./bausteine";
import { ErgebnisKopf, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { LAENDER, NETZSTATUS, STANDARD, VERMARKTUNG, bewerteProjekt } from "@/lib/rechner/projektbewertung";
import { PHASEN, PROVISION } from "@/lib/invest/markt";
import { fmt, fmtMio } from "@/lib/rechner/annahmen";

const eurGesamt = (v) => (v >= 1e6 ? fmtMio(v, 2) : `${fmt(Math.round(v / 1000))} T€`);

export default function ProjektbewertungRechner() {
  const [mwp, setMwp] = useState(STANDARD.mwp);
  const [phase, setPhase] = useState(STANDARD.phase);
  const [netz, setNetz] = useState(STANDARD.netz);
  const [netzKm, setNetzKm] = useState(STANDARD.netzKm);
  const [vermarktung, setVermarktung] = useState(STANDARD.vermarktung);
  const [land, setLand] = useState(STANDARD.land);

  const r = useMemo(() => bewerteProjekt({ mwp, phase, netz, netzKm, vermarktung, land }), [mwp, phase, netz, netzKm, vermarktung, land]);
  const bestand = phase === "cod";

  return (
    <RechnerRahmen
      eingaben={
        <>
          <MobilKurz
            werte={[
              ["€/kWp", `${fmt(r.preisKwp.min)}–${fmt(r.preisKwp.max)}`],
              ["Gesamt Mitte", eurGesamt(r.gesamt.mittel)],
              ["Risiko", r.risiko],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel="Projekt">
              <Regler label="Leistung" wert={mwp} min={1} max={150} step={1} einheit="MWp" onChange={setMwp} />
              <Auswahl legende="Land" wert={land} onChange={setLand} optionen={LAENDER.map((l) => ({ id: l.id, label: l.label }))} klein />
              <fieldset>
                <legend className="mb-2.5 text-[14.5px] font-semibold text-ink-800">Entwicklungsstand</legend>
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
                          <span className="min-w-0 flex-1">{p.label}</span>
                          <span className="ov-num shrink-0 text-[12px] font-normal text-ink-500">
                            {fmt(p.preisProKwp.min)}–{fmt(p.preisProKwp.max)} €
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ol>
              </fieldset>
            </Gruppe>

            {!bestand && (
              <Gruppe titel="Netzanschluss">
                <Auswahl legende="Status" wert={netz} onChange={setNetz} spalten={2} klein optionen={NETZSTATUS} />
                <Regler label="Entfernung zum Einspeisepunkt" wert={netzKm} min={0} max={20} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} km`} onChange={setNetzKm} />
              </Gruppe>
            )}

            <Gruppe titel="Vermarktung">
              <Auswahl legende="Erlöse gesichert?" wert={vermarktung} onChange={setVermarktung} optionen={VERMARKTUNG} klein />
            </Gruppe>
          </div>
        </>
      }
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {`Kaufpreisspanne ${fmt(r.preisKwp.min)} bis ${fmt(r.preisKwp.max)} Euro je Kilowatt-Peak, gesamt ${eurGesamt(r.gesamt.min)} bis ${eurGesamt(r.gesamt.max)}, Risiko ${r.risiko}`}
          </p>
          <ErgebnisKopf titel="Orientierungswert" plakette={`${r.phase.kurz} · ${mwp} MWp`} />

          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kennzahl ton="navy" icon={Coins} label={bestand ? "Anlagenwert je kWp" : "Kaufpreis je kWp"} zusatz="Spanne" className="col-span-2">
              <Zahl wert={r.preisKwp.min} />–<Zahl wert={r.preisKwp.max} suffix=" €/kWp" />
            </Kennzahl>
            <Kennzahl ton="gruen" icon={Coins} label="Gesamt (Mitte)" zusatz={`${eurGesamt(r.gesamt.min)} – ${eurGesamt(r.gesamt.max)}`} className="col-span-2 xl:col-span-1">
              {eurGesamt(r.gesamt.mittel)}
            </Kennzahl>
            <Kennzahl icon={ShieldAlert} label="Risiko" zusatz={bestand ? "Betriebsrisiko" : `bis RTB ≈ ${r.monateBisRtb} Monate`} className="col-span-2 xl:col-span-1">
              <span className="text-[0.8em]">{r.risiko}</span>
            </Kennzahl>
          </div>

          <Phasenleiter r={r} />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Liste titel="Werttreiber" icon={ArrowUpRight} ton="gut" punkte={r.treiber} leer="Keine besonderen Werttreiber erkannt." />
            <Liste titel="Wertminderer" icon={ArrowDownRight} ton="warnung" punkte={r.minderer} leer="Keine wesentlichen Abschläge." />
          </div>
          {r.hinweise.length > 0 && (
            <ul className="mt-4 space-y-2">
              {r.hinweise.map((h) => (
                <li key={h} className="flex gap-2.5 rounded-2xl bg-ink-50 px-4 py-3 text-[13.5px] leading-relaxed text-ink-700">
                  <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
                  {h}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-7 rounded-3xl bg-navy-950 p-5 text-white md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-ov-300">
                  <Store aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-[18px] font-bold">Projekt in der Börse anbieten</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-white/70">
                    Anonymer Exposé-Teaser, Käufer mit Suchprofil, NDA und Datenraum über die Plattform. Provision {PROVISION.verkaeufer.text}.
                  </p>
                </div>
              </div>
              <Button href="/projektboerse/anbieten" pfeil className="shrink-0">
                Projekt anbieten
              </Button>
            </div>
          </div>

          <p className="mt-5 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-500">
            <CalendarClock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Marktspannen DACH 2025/26 – Orientierung für ein erstes Gespräch, kein Wertgutachten. Den Preis bestimmen Due Diligence, Zahlungsstruktur und Wettbewerb der Käufer.
          </p>
        </>
      }
    />
  );
}

function Phasenleiter({ r }) {
  const max = Math.max(...PHASEN.filter((p) => p.id !== "cod").map((p) => p.preisProKwp.max), r.phase.id === "cod" ? 0 : r.preisKwp.max) * 1.05;
  const phasen = PHASEN.filter((p) => p.id !== "cod");
  return (
    <div className="mt-6 rounded-3xl ring-1 ring-ink-200/70 p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-[17px] font-bold text-ink-900">Werttreppe bis Baureife</h3>
        <p className="text-[12.5px] text-ink-500">Marktspanne je Phase in €/kWp{r.phase.id !== "cod" ? " · Ihr Projekt markiert" : ""}</p>
      </div>
      <ol className="mt-5 grid grid-cols-5 items-end gap-2 sm:gap-3" aria-label="Werttreppe der Projektphasen">
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
                <span className="max-sm:sr-only">{p.kurz}</span>
              </span>
              <span className="ov-num text-[11px] text-ink-400">
                {fmt(p.preisProKwp.min)}–{fmt(p.preisProKwp.max)}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-500">
        Dunkler Teil: untere Marktspanne, heller Teil: obere. Gestrichelt: Mittelwert Ihres Projekts nach Zu- und Abschlägen. Bestandsanlagen werden als Ganzes bewertet (heute grob {fmt(PHASEN[5].preisProKwp.min)}–{fmt(PHASEN[5].preisProKwp.max)} €/kWp).
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
