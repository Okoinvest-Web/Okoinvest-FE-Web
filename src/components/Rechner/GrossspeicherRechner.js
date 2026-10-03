"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BatteryCharging, CalendarClock, Cable, Percent, Scale, Zap } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Schalter, Zahl } from "./bausteine";
import { useTeilbarerZustand } from "./kontext";
import ErgebnisAnfrage from "./ErgebnisAnfrage";
import { Ansicht, ErgebnisKopf, Hinweis, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { BalkenJahre, DiagrammKarte, FARBEN, Linien } from "./ToolTeile";
import { DAUERN, EBENEN, ERLOESNIVEAUS, STANDARD, STANDORTE, erloesAufteilung, rechneSpeicher, vergleichStandorte } from "@/lib/rechner/grossspeicher";
import { SPEICHER } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtMio } from "@/lib/rechner/annahmen";
import { pfad } from "@/lib/land";

const pct = (v, s = 1) => (v == null || !Number.isFinite(v) ? "–" : `${fmt(v * 100, s)} %`);
const tsd = (v) => `${fmt(v / 1000)} T€`;

export default function GrossspeicherRechner() {
  const [e, setE] = useState(STANDARD);
  const [niveau, setNiveau] = useState("mittel");
  const [ansicht, setAnsicht] = useState("jahr");
  const set = (k) => (v) => setE((a) => ({ ...a, [k]: v }));
  const setErloes = (k) => (v) => {
    setNiveau(null);
    setE((a) => ({ ...a, erloese: { ...a.erloese, [k]: v } }));
  };
  const waehleNiveau = (id) => {
    setNiveau(id);
    setE((a) => ({ ...a, erloese: erloesAufteilung(ERLOESNIVEAUS.find((n) => n.id === id).proMw) }));
  };
  // Teilen-Link inkl. individuellem Erlösmix: das Objekt `erloese` wird für die Adresszeile in drei Zahlen aufgeteilt
  // (erlArbitrage, erlAfrr, erlFcr); beim Übernehmen wieder zusammengesetzt und das passende Erlösniveau erkannt.
  const mitMix = (z, alt) => {
    const { erlArbitrage, erlAfrr, erlFcr, ...rest } = z;
    const basis = rest.erloese || alt.erloese;
    const erloese = {
      ...basis,
      ...(erlArbitrage != null && { arbitrage: erlArbitrage }),
      ...(erlAfrr != null && { afrr: erlAfrr }),
      ...(erlFcr != null && { fcr: erlFcr }),
    };
    return { ...alt, ...rest, erloese };
  };
  const niveauVon = (erl) =>
    ERLOESNIVEAUS.find((n) => {
      const x = erloesAufteilung(n.proMw);
      return x.arbitrage === erl.arbitrage && x.afrr === erl.afrr && x.fcr === erl.fcr;
    })?.id ?? null;
  useTeilbarerZustand(
    { ...e, erlArbitrage: e.erloese.arbitrage, erlAfrr: e.erloese.afrr, erlFcr: e.erloese.fcr },
    (neu) => {
      const z = mitMix(neu, e);
      setNiveau(niveauVon(z.erloese));
      setE(z);
    },
    {
      optionen: { standort: STANDORTE.map((s) => s.id), ebene: EBENEN.map((x) => x.id) },
      grenzen: {
        mw: [1, 200], dauer: [1, 4], capexKwh: [150, 450], zyklen: [150, 730], lebensdauer: [10, 20], degradation: [0.01, 0.04], erloesTrend: [-0.06, 0.02],
        erlArbitrage: [0, 150000], erlAfrr: [0, 150000], erlFcr: [0, 80000],
      },
      pruefen: (z) => rechneSpeicher(mitMix(z, STANDARD)),
    }
  );
  const r = useMemo(() => rechneSpeicher(e), [e]);
  const vergleich = useMemo(() => vergleichStandorte(e), [e]);
  const summeProMw = e.erloese.arbitrage + e.erloese.afrr + e.erloese.fcr;
  const inv = r.investition;

  return (
    <RechnerRahmen
      mitlaufend
      eingaben={
        <>
          <MobilKurz
            werte={[
              ["Projekt-IRR", pct(r.projektIrr)],
              ["Invest", fmtMio(inv.summe)],
              ["Amortisation", r.amortisation ? `${fmt(r.amortisation, 1)} J.` : "–"],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel="Speicher">
              <Regler label="Leistung" wert={e.mw} min={1} max={200} step={1} einheit="MW" onChange={set("mw")} />
              <Auswahl legende="Speicherdauer" wert={e.dauer} onChange={set("dauer")} optionen={DAUERN.map((d) => ({ id: d, label: `${d} h`, sub: `${fmt(e.mw * d)} MWh` }))} />
              <Regler
                label="Systempreis schlüsselfertig"
                wert={e.capexKwh}
                min={150}
                max={450}
                step={5}
                format={(v) => `${fmt(v)} €/kWh`}
                onChange={set("capexKwh")}
                hinweis={`Richtwert 2026: ${fmt(SPEICHER.capexProKwh.min)}–${fmt(SPEICHER.capexProKwh.max)} €/kWh (2-h-System, stark fallend).`}
              />
            </Gruppe>

            <Gruppe titel="Standort & Netz">
              <Auswahl legende="Standort" wert={e.standort} onChange={set("standort")} optionen={STANDORTE} />
              {e.standort === "standalone" && (
                <>
                  <Auswahl legende="Netzebene" wert={e.ebene} onChange={set("ebene")} optionen={EBENEN} />
                  <Schalter
                    icon={Cable}
                    label="Netzdienlicher Betrieb (BKZ-Abschlag)"
                    beschreibung={`Einzelne Netzbetreiber senken den Baukostenzuschuss auf ${fmt(SPEICHER.bkzNetzdienlichFaktor * 100)} %`}
                    an={e.netzdienlich}
                    onChange={set("netzdienlich")}
                  />
                </>
              )}
              <Schalter
                icon={Scale}
                label="Netzentgeltbefreiung"
                beschreibung={`§ 118 Abs. 6 EnWG: Inbetriebnahme bis ${SPEICHER.netzentgeltBefreiungBis}`}
                an={e.netzentgeltBefreit}
                onChange={set("netzentgeltBefreit")}
              />
            </Gruppe>

            <Gruppe titel="Erlöse je MW und Jahr (2-h-Basis)">
              <Auswahl legende="Erlösniveau" wert={niveau} onChange={waehleNiveau} optionen={ERLOESNIVEAUS.map((n) => ({ id: n.id, label: n.label, sub: `${fmt(n.proMw / 1000)} T€/MW` }))} klein />
              <Regler label="Arbitrage (Day-Ahead, Intraday)" wert={e.erloese.arbitrage} min={0} max={150000} step={1000} format={(v) => `${fmt(v / 1000)} T€`} onChange={setErloes("arbitrage")} />
              <Regler label="Sekundärregelleistung aFRR" wert={e.erloese.afrr} min={0} max={150000} step={1000} format={(v) => `${fmt(v / 1000)} T€`} onChange={setErloes("afrr")} />
              <Regler label="Primärregelleistung FCR" wert={e.erloese.fcr} min={0} max={80000} step={1000} format={(v) => `${fmt(v / 1000)} T€`} onChange={setErloes("fcr")} />
              <p className="-mt-2 text-[13px] leading-relaxed text-ink-500">
                Summe {fmt(summeProMw / 1000)} T€/MW·a. Zum Vergleich: Der ISEA-Index weist für 2025 theoretisch {fmt(SPEICHER.indexErloes2025.gesamt2h / 1000)} T€/MW aus – mit perfekter
                Voraussicht, real deutlich weniger.
              </p>
            </Gruppe>

            <Gruppe titel="Technik & Markt">
              <Regler label="Degradation (Kapazität)" wert={e.degradation * 100} min={1} max={4} step={0.25} stellen={2} einheit="% p. a." onChange={(v) => set("degradation")(v / 100)} />
              <Regler
                label="Erlöstrend"
                wert={e.erloesTrend * 100}
                min={-6}
                max={2}
                step={0.5}
                stellen={1}
                format={(v) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${fmt(Math.abs(v), 1)} % p. a.`}
                onChange={(v) => set("erloesTrend")(v / 100)}
                hinweis="Mehr Speicher im Markt drückt Preisspreads und Regelenergiepreise."
              />
              <Regler label="Vollzyklen pro Jahr" wert={e.zyklen} min={150} max={730} step={10} onChange={set("zyklen")} hinweis={`≈ ${fmt(e.zyklen / 365, 1)} Zyklen pro Tag – Garantiebedingungen des Herstellers beachten.`} />
              <Regler label="Betrachtungsdauer" wert={e.lebensdauer} min={10} max={20} step={1} einheit="Jahre" onChange={set("lebensdauer")} />
            </Gruppe>
          </div>
        </>
      }
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">{`Projektrendite ${pct(r.projektIrr)}, Investition ${fmtMio(inv.summe)}, Amortisation ${r.amortisation ? fmt(r.amortisation, 1) + " Jahre" : "nicht innerhalb der Laufzeit"}.`}</p>
          <ErgebnisKopf plakette={`${fmt(e.mw)} MW / ${fmt(r.mwh)} MWh · vor Steuern`} />
          <Hauptzahl
            className="mt-5"
            icon={Percent}
            label="Projekt-IRR"
            zusatz={`ohne Finanzierung, ${e.lebensdauer} Jahre`}
            rechts={
              <div className="sm:text-right">
                <p className="flex items-center gap-1.5 text-[12.5px] text-white/75 sm:justify-end">
                  <BatteryCharging aria-hidden="true" className="h-3.5 w-3.5" />
                  Investition
                </p>
                <p className="ov-kpi mt-0.5 text-white">
                  <Zahl wert={inv.summe / 1e6} stellen={2} suffix=" Mio. €" />
                </p>
                <p className="text-[12.5px] text-white/75">{fmt(r.investProKwh)} €/kWh gesamt</p>
              </div>
            }
          >
            {r.projektIrr == null ? "–" : <Zahl wert={r.projektIrr * 100} stellen={1} suffix=" %" delta="dunkel" deltaFormat={(d) => `${fmt(d, 1)} %-Pkt.`} einlauf />}
          </Hauptzahl>
          <Belege spalten={2}>
            <Kennzahl ton="akzent" icon={CalendarClock} label="Amortisation" zusatz="statisch, kumuliert">
              {r.amortisation ? <Zahl wert={r.amortisation} stellen={1} suffix=" J." delta="hell" /> : "> Laufzeit"}
            </Kennzahl>
            <Kennzahl icon={Scale} label="Kapitalwert" zusatz={`abgezinst mit ${pct(e.diskont, 0)}`}>
              <span className={r.kapitalwert < 0 ? "text-sun-700" : undefined}>
                <Zahl wert={r.kapitalwert / 1e6} stellen={2} suffix=" Mio. €" delta="hell" />
              </span>
            </Kennzahl>
            <Kennzahl icon={Zap} label="Erlös Jahr 1" zusatz={`${fmt(r.erloesProMwJahr1 / 1000)} T€ je MW`}>
              <Zahl wert={r.erloesJahr1} format={tsd} />
            </Kennzahl>
            <Kennzahl icon={Cable} label="Cashflow Jahr 1" zusatz="nach Betrieb & Vermarktung">
              <Zahl wert={r.cfJahr1} format={tsd} />
            </Kennzahl>
          </Belege>

          <InvestZeile inv={inv} />

          <div className="mt-4 space-y-2.5">
            {e.standort === "standalone" && inv.bkz > 0 && (
              <Hinweis ton="warnung" icon={AlertTriangle}>
                Baukostenzuschuss {fmtEur(inv.bkz)} – seit dem BGH-Beschluss vom 15.07.2025 auch für Speicher zulässig. Höhe je Netzbetreiber, früh anfragen.
              </Hinweis>
            )}
            {!e.netzentgeltBefreit && (
              <Hinweis ton="neutral" icon={Scale}>
                Ohne Befreiung rechnen wir grob mit {fmt(SPEICHER.netzentgeltCt, 1)} ct/kWh Netzentgelt auf den Ladestrom – die Reform der Netzentgelte ist nach aktuellem Stand offen.
              </Hinweis>
            )}
            {e.zyklen > 550 && (
              <Hinweis ton="warnung" icon={AlertTriangle}>
                Über 1,5 Zyklen pro Tag beschleunigen die Alterung – Degradation und Garantie entsprechend prüfen.
              </Hinweis>
            )}
          </div>

          <ErgebnisAnfrage
            typ="speicher"
            href="/kontakt?anliegen=speicher#formular"
            kennzahl={r.projektIrr == null ? null : <Zahl wert={r.projektIrr * 100} stellen={1} suffix=" %" />}
            satz={r.projektIrr == null ? "Standort und Anschluss gemeinsam prüfen" : "Projekt-IRR – Standort und Anschluss gemeinsam prüfen"}
            signal={`${r.projektIrr}|${inv.summe}`}
            nachricht={`Aus dem Großspeicher-Rechner: ${fmt(e.mw)} MW / ${fmt(r.mwh)} MWh, ${STANDORTE.find((x) => x.id === e.standort)?.label || e.standort}, ${EBENEN.find((x) => x.id === e.ebene)?.label || e.ebene}, ${e.lebensdauer} Jahre. Ergebnis (Modellrechnung): Projekt-IRR ${pct(r.projektIrr)}, Investition ${fmtMio(inv.summe)}. Bitte Standort und Netzanschluss mit mir prüfen.`}
            sekundaer={[{ href: pfad("/grossspeicher"), label: "Großspeicher planen" }]}
            hinweis="Modellrechnung vor Steuern und Finanzierung, ohne Gewähr. Erlöse sind stark marktabhängig – für Banken zählen Tolling- oder Floor-Verträge."
          />
        </>
      }
      unten={
        <div className="space-y-6">
          <DiagrammKarte
            titel={ansicht === "jahr" ? "Erlöse und Kosten je Jahr" : "Kumulierter Cashflow"}
            zusatz={ansicht === "jahr" ? "Erlösmix nach Markt, Kosten nach unten" : "Ab dem Nulldurchgang ist die Investition zurückverdient"}
            rechts={
              <Ansicht
                name="bess-ansicht"
                label="Diagrammansicht"
                wert={ansicht}
                onChange={setAnsicht}
                optionen={[
                  { id: "jahr", label: "Je Jahr" },
                  { id: "kumuliert", label: "Kumuliert" },
                ]}
              />
            }
          >
            {ansicht === "jahr" ? (
              <BalkenJahre
                zeilen={r.jahre.map((j) => ({ label: String(j.jahr), werte: { arbitrage: j.arbitrage, afrr: j.afrr, fcr: j.fcr, kosten: -j.kosten, cf: j.cf } }))}
                serien={[
                  { key: "afrr", label: "aFRR", farbe: FARBEN.gruen },
                  { key: "arbitrage", label: "Arbitrage", farbe: FARBEN.gruenHell },
                  { key: "fcr", label: "FCR", farbe: FARBEN.sunHell },
                  { key: "kosten", label: "Betrieb, Vermarktung, Netz", farbe: FARBEN.grau },
                ]}
                linie={{ key: "cf", label: "Cashflow", farbe: FARBEN.ink }}
                ariaLabel={`Erlöse und Kosten je Jahr über ${e.lebensdauer} Jahre; Cashflow im ersten Jahr ${fmtEur(r.cfJahr1)}.`}
                tooltip={(z, i) => {
                  const j = r.jahre[i];
                  return (
                    <>
                      <p className="font-semibold">Jahr {j.jahr}</p>
                      <p className="text-white/70">aFRR <span className="ov-num font-semibold text-white">{tsd(j.afrr)}</span></p>
                      <p className="text-white/70">Arbitrage <span className="ov-num font-semibold text-white">{tsd(j.arbitrage)}</span></p>
                      <p className="text-white/70">FCR <span className="ov-num font-semibold text-white">{tsd(j.fcr)}</span></p>
                      <p className="text-white/70">Kosten <span className="ov-num font-semibold text-white">−{tsd(j.kosten)}</span></p>
                      <p className="text-white/70">Cashflow <span className="ov-num font-semibold text-ov-300">{tsd(j.cf)}</span></p>
                    </>
                  );
                }}
              />
            ) : (
              <Linien
                xLabels={r.kumuliert.map((_, i) => String(i))}
                serien={vergleich.map((v) => ({ key: v.id, label: `${v.label}${v.id === e.standort ? " (Ihre Wahl)" : ""}`, farbe: v.id === "colocation" ? FARBEN.gruen : FARBEN.navy, werte: v.r.kumuliert, dick: v.id === e.standort }))}
                ariaLabel={`Kumulierter Cashflow von Co-Location und Stand-alone über ${e.lebensdauer} Jahre.`}
                tooltip={(i) => (
                  <>
                    <p className="font-semibold">{i === 0 ? "Investition" : `Nach Jahr ${i}`}</p>
                    {vergleich.map((v) => (
                      <p key={v.id} className="text-white/70">
                        {v.label} <span className="ov-num font-semibold text-white">{fmtMio(v.r.kumuliert[i], 2)}</span>
                      </p>
                    ))}
                  </>
                )}
              />
            )}
          </DiagrammKarte>

          <div className="grid gap-4 md:grid-cols-2">
            {vergleich.map((v) => (
              <div key={v.id} className={cn("rounded-3xl p-5 ring-1 md:p-6", v.id === e.standort ? "bg-ov-50/60 ring-ov-200" : "bg-sand-50 ring-ink-200/60")}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-[18px] font-extrabold text-ink-900">{v.label}</p>
                  <p className="ov-num font-display text-[20px] font-extrabold text-ink-900">{pct(v.r.projektIrr)}</p>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13.5px]">
                  <dt className="text-ink-500">Investition</dt>
                  <dd className="ov-num text-right font-semibold text-ink-800">{fmtMio(v.r.investition.summe, 2)}</dd>
                  <dt className="text-ink-500">davon Netz + BKZ</dt>
                  <dd className="ov-num text-right font-semibold text-ink-800">{fmtMio(v.r.investition.netz + v.r.investition.bkz, 2)}</dd>
                  <dt className="text-ink-500">Erlös Jahr 1</dt>
                  <dd className="ov-num text-right font-semibold text-ink-800">{tsd(v.r.erloesJahr1)}</dd>
                  <dt className="text-ink-500">Amortisation</dt>
                  <dd className="ov-num text-right font-semibold text-ink-800">{v.r.amortisation ? `${fmt(v.r.amortisation, 1)} J.` : "–"}</dd>
                </dl>
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
                  {v.id === "colocation"
                    ? `Nutzt den Netzanschluss des Solarparks mit – kein zusätzlicher BKZ, dafür ${fmt((1 - SPEICHER.coLocationErloesFaktor) * 100)} % Erlösabschlag für geteilte Anschlussleistung.`
                    : "Freie Fahrweise und volle Erlöse, aber eigener Netzanschluss und Baukostenzuschuss."}
                </p>
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}

function InvestZeile({ inv }) {
  const teile = [
    ["Speichersystem", inv.system, FARBEN.gruen],
    ["Netzanschluss", inv.netz, FARBEN.navy],
    ["Baukostenzuschuss", inv.bkz, FARBEN.sunHell],
  ].filter(([, v]) => v > 0);
  return (
    <div className="mt-4 rounded-2xl bg-ink-50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13.5px]">
        <span className="font-semibold text-ink-800">Investition {fmtMio(inv.summe, 2)}</span>
        <span className="ov-num text-ink-600">{fmt(inv.kwh / 1000)} MWh</span>
      </div>
      <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-ink-100" role="img" aria-label={teile.map(([k, v]) => `${k} ${fmtEur(v)}`).join(", ")}>
        {teile.map(([k, v, f]) => (
          <div key={k} style={{ width: `${(v / inv.summe) * 100}%`, background: f }} className="motion-safe:transition-[width] motion-safe:duration-500" />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-600">
        {teile.map(([k, v, f]) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: f }} aria-hidden="true" />
            {k} <span className="ov-num">{fmtMio(v, 2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
