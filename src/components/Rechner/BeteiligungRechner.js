"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Coins, HandCoins, Landmark, Receipt, ShieldAlert, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Auswahl, Gruppe, Kennzahl, Regler, Schalter } from "./bausteine";
import { ErgebnisKopf, Hinweis, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { DiagrammKarte, FARBEN, Linien } from "./ToolTeile";
import { STANDARD, rechneBeteiligung } from "@/lib/rechner/beteiligung";
import { REGION_KURZ } from "@/lib/rechner/pacht";
import { GEMEINSCHAFTEN, REGIONEN } from "@/lib/invest/markt";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";

const B = GEMEINSCHAFTEN.beteiligung;
const pct = (v, s = 1) => (v == null || !Number.isFinite(v) ? "–" : `${v < 0 ? "−" : ""}${fmt(Math.abs(v) * 100, s)} %`);
const FARBE = { schlecht: FARBEN.sun, mittel: FARBEN.navy, gut: FARBEN.gruen };

export default function BeteiligungRechner() {
  const [e, setE] = useState(STANDARD);
  const set = (k) => (v) => setE((a) => ({ ...a, [k]: v }));
  const r = useMemo(() => rechneBeteiligung(e), [e]);
  const [s, m, g] = r.szenarien;

  return (
    <RechnerRahmen
      mitlaufend
      eingaben={
        <>
          <MobilKurz
            werte={[
              ["Einlage", fmtEur(r.einlage)],
              ["Mittel p. a.", pct(m.rendite)],
              ["Spanne", `${pct(s.rendite, 0)} bis ${pct(g.rendite, 0)}`],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel="Ihre Beteiligung (Beispiel)">
              <Regler label="Anzahl Anteile" wert={e.anteile} min={1} max={40} step={1} onChange={set("anteile")} hinweis={`Einlage ${fmtEur(r.einlage)}`} />
              <Regler
                label="Betrag je Anteil"
                wert={e.anteilEur}
                min={50}
                max={1000}
                step={50}
                format={(v) => `${fmt(v)} €`}
                onChange={set("anteilEur")}
                hinweis={`Beispielwert – die Satzung und damit die Anteilshöhe stehen noch nicht fest (angenommen ${fmt(B.anteilEur)} €).`}
              />
            </Gruppe>
            <Gruppe titel="Solarpark und Genossenschaft">
              <Regler label="Größe des Parks" wert={e.parkMwp} min={2} max={50} step={1} einheit="MWp" onChange={set("parkMwp")} />
              <Auswahl
                legende="Region"
                wert={e.regionId}
                onChange={set("regionId")}
                spalten={3}
                klein
                optionen={REGIONEN.map((x) => ({ id: x.id, label: REGION_KURZ[x.id] || x.label }))}
              />
              <Regler
                label="Anteil der eG am Park"
                wert={e.egQuote * 100}
                min={5}
                max={49}
                step={1}
                format={(v) => `${fmt(v)} % des EK`}
                minLabel="5 %"
                maxLabel="49 %"
                onChange={(v) => set("egQuote")(v / 100)}
                hinweis={`Anteil am Eigenkapital der Parkgesellschaft. Genossenschaftskapital ≈ ${fmtEur(m.eg.egKapital)} bei ${fmt(m.park.ek / 1e6, 2)} Mio. € Eigenkapital des Parks.`}
              />
              <Regler
                label="Kosten der Genossenschaft"
                wert={e.verwaltungAnteil * 100}
                min={0.25}
                max={3}
                step={0.25}
                stellen={2}
                format={(v) => `${fmt(v, 2)} % p. a.`}
                onChange={(v) => set("verwaltungAnteil")(v / 100)}
                hinweis="Prüfungsverband, Buchhaltung, Generalversammlung – in % des Mitgliederkapitals."
              />
              <Schalter icon={Receipt} label="Kapitalertragsteuer abziehen" beschreibung="25 % + Soli, ohne Kirchensteuer und Sparer-Pauschbetrag" an={e.steuer} onChange={set("steuer")} />
            </Gruppe>
          </div>
        </>
      }
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {`Illustration, keine Zusage. Rendite im mittleren Szenario ${pct(m.rendite)}, schlechtes Szenario ${pct(s.rendite)}, gutes Szenario ${pct(g.rendite)}.`}
          </p>
          <div className="flex gap-3 rounded-2xl bg-sun-400/15 p-4 ring-1 ring-sun-400/50" role="note">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sun-500" />
            <p className="text-[13.5px] leading-relaxed text-ink-800">
              <strong className="text-ink-900">Keine Anlageberatung, kein Angebot, kein Renditeversprechen.</strong> Die Genossenschaft ist im Aufbau; Anteile können noch nicht gezeichnet
              werden. Die Zahlen illustrieren, wie Ausschüttungen aus einem Park-Cashflow entstehen – sie können deutlich geringer ausfallen oder ganz ausbleiben.
            </p>
          </div>

          <div className="mt-6">
            <ErgebnisKopf titel="Drei Szenarien" plakette={`${fmtEur(r.einlage)} Einlage · ${s.laufzeit} Jahre`} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {r.szenarien.map((x) => (
              <div key={x.id} className={cn("rounded-2xl p-4 ring-1", x.id === "mittel" ? "bg-navy-950 text-white ring-navy-950" : "bg-white ring-ink-200/70")}>
                <p className={cn("flex items-center gap-2 text-[12.5px] font-semibold", x.id === "mittel" ? "text-white/80" : "text-ink-500")}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: FARBE[x.id] }} aria-hidden="true" />
                  {x.label}
                </p>
                <p className="mt-1 font-display text-[26px] font-extrabold leading-tight tracking-tight">{pct(x.rendite)}</p>
                <p className={cn("text-[12px]", x.id === "mittel" ? "text-white/65" : "text-ink-500")}>Rendite p. a. inkl. Rückzahlung</p>
                <dl className={cn("mt-3 space-y-1 border-t pt-3 text-[12.5px]", x.id === "mittel" ? "border-white/15" : "border-ink-100")}>
                  <Zeile k="Ausschüttungen" v={fmtEur(x.summeNetto)} dunkel={x.id === "mittel"} />
                  <Zeile k="Ø Jahre 1–10" v={pct(x.quote10)} dunkel={x.id === "mittel"} />
                  <Zeile k="Nullrunden" v={`${x.jahreOhne} / ${x.laufzeit} J.`} dunkel={x.id === "mittel"} />
                  <Zeile k="Rückzahlung" v={fmtEur(x.rueckzahlung)} dunkel={x.id === "mittel"} />
                </dl>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-start gap-3 rounded-2xl bg-ink-900 p-4 text-white">
            <ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sun-400" />
            <p className="text-[13.5px] leading-relaxed text-white/85">
              <strong className="text-white">Schlimmster Fall: Totalverlust.</strong> Fällt der Park dauerhaft aus oder wird die Betreibergesellschaft insolvent, kann die Einlage von{" "}
              {fmtEur(r.einlage)} ganz verloren gehen. Eine Einlagensicherung gibt es nicht.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Kennzahl icon={Landmark} label="Park-EK-Rendite (mittel)" zusatz="vor Kosten der eG">
              {pct(m.park.ekIrr)}
            </Kennzahl>
            <Kennzahl icon={Users} label="Mitglieder rechnerisch" zusatz={`bei je ${fmtEur(r.einlage)}`}>
              {fmt(Math.floor(m.eg.egKapital / r.einlage))}
            </Kennzahl>
          </div>

          <div className="mt-7 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-[13px] leading-relaxed text-ink-500">
              Vor persönlichen Steuern{e.steuer ? " (hier nach Kapitalertragsteuer)" : ""}. Über Ausschüttungen entscheidet die Generalversammlung.
            </p>
            <Button href="/genossenschaft#interesse" size="lg" pfeil className="shrink-0">
              Interesse vormerken
            </Button>
          </div>
        </>
      }
      unten={
        <div className="space-y-6">
          <DiagrammKarte titel="Ausschüttung je Jahr" zusatz={`Auf Ihre Einlage von ${fmtEur(r.einlage)}, ${e.steuer ? "nach" : "vor"} Kapitalertragsteuer`}>
            <Linien
              xLabels={m.mitglied.map((x) => String(x.jahr))}
              serien={r.szenarien.map((x) => ({ key: x.id, label: x.label, farbe: FARBE[x.id], werte: x.mitglied.map((y) => y.netto), dick: x.id === "mittel" }))}
              ariaLabel={`Jährliche Ausschüttungen in drei Szenarien über ${m.laufzeit} Jahre.`}
              achsenFormat={(v) => `${fmt(v)} €`}
              tooltip={(i) => (
                <>
                  <p className="font-semibold">Jahr {i + 1}</p>
                  {r.szenarien.map((x) => (
                    <p key={x.id} className="text-white/70">
                      {x.label} <span className="ov-num font-semibold text-white">{fmtEur(x.mitglied[i].netto)}</span>{" "}
                      <span className="text-white/60">({pct(x.mitglied[i].quote)})</span>
                    </p>
                  ))}
                </>
              )}
            />
            <p className="px-5 pb-5 text-[12.5px] leading-relaxed text-ink-500 md:px-6">
              In den ersten Jahren fließt der Cashflow des Parks vor allem in Zins und Tilgung der Bankdarlehen; ausschüttungsfähig wird erst, was nach Kosten, Rücklage und dem Kapitalerhalt für
              die spätere Rückzahlung der Einlagen übrig bleibt.
            </p>
          </DiagrammKarte>

          <div className="grid gap-4 md:grid-cols-3">
            {r.szenarien.map((x) => (
              <p key={x.id} className="rounded-2xl bg-sand-50 px-4 py-3 text-[13px] leading-relaxed text-ink-600 ring-1 ring-ink-200/60">
                <strong className="text-ink-900">{x.label}:</strong> {x.text}.
              </p>
            ))}
          </div>

          <Hinweis ton="neutral" icon={HandCoins}>
            Für Landwirte und Flächeneigentümer kann eine Beteiligung die Pacht ergänzen – ersetzt sie aber nicht. Die Pacht ist vertraglich gesichert, eine Ausschüttung nicht.
          </Hinweis>
          <Hinweis ton="neutral" icon={Coins}>
            Anteile an einer Genossenschaft sind nicht börsengehandelt. Eine Kündigung ist nur zum Geschäftsjahresende mit Frist möglich; das Auseinandersetzungsguthaben wird erst danach ausgezahlt.
          </Hinweis>
        </div>
      }
    />
  );
}

function Zeile({ k, v, dunkel }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className={dunkel ? "text-white/65" : "text-ink-500"}>{k}</dt>
      <dd className={cn("ov-num text-right font-semibold", dunkel ? "text-white" : "text-ink-900")}>{v}</dd>
    </div>
  );
}
