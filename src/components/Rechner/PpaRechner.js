"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Factory, Leaf, PiggyBank, ShieldCheck, Sun, TrendingDown } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Zahl } from "./bausteine";
import { useTeilbarerZustand } from "./kontext";
import { Ansicht, ErgebnisKopf, Hinweis, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { BalkenJahre, DiagrammKarte, FARBEN, Linien } from "./ToolTeile";
import { LASTPROFILE, STANDARD, STRUKTUREN, SZENARIEN, rechnePpa } from "@/lib/rechner/ppa";
import { STAND, STROM } from "@/lib/invest/markt";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";

const P = STROM.ppa;
const tsd = (v) => `${v < 0 ? "−" : ""}${fmt(Math.abs(v) / 1000, Math.abs(v) >= 1e5 ? 0 : 1)} Tsd. €`;
const SZ_FARBE = { fall: FARBEN.sun, seit: FARBEN.navy, anstieg: FARBEN.gruen };

export default function PpaRechner() {
  const [e, setE] = useState(STANDARD);
  const [szenario, setSzenario] = useState("seit");
  const [ansicht, setAnsicht] = useState("kumuliert");
  const set = (k) => (v) => setE((a) => ({ ...a, [k]: v }));
  useTeilbarerZustand(e, (neu) => setE((a) => ({ ...a, ...neu })), {
    optionen: { profil: LASTPROFILE.map((p) => p.id), struktur: STRUKTUREN.map((s) => s.id) },
    grenzen: { verbrauchMwh: [100, 50000], preisCt: [5, 25], ppaCt: [3, 12], strukturCt: [0.5, 4], anteil: [0.05, 1], laufzeit: [3, 20] },
    pruefen: rechnePpa,
  });
  const r = useMemo(() => rechnePpa(e), [e]);
  const aktiv = r.szenarien.find((s) => s.id === szenario);
  const h = r.heute;

  return (
    <RechnerRahmen
      mitlaufend
      eingaben={
        <>
          <MobilKurz
            werte={[
              ["Ersparnis J. 1", tsd(r.ersparnisJahr1)],
              [`${e.laufzeit} J. (seitw.)`, tsd(r.szenarien[1].summe)],
              ["Abgesichert", `${fmt(r.absicherung * 100)} %`],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel="Ihr Unternehmen">
              <Regler label="Jahresverbrauch" wert={e.verbrauchMwh} min={100} max={50000} step={100} format={(v) => (v >= 1000 ? `${fmt(v / 1000, 1)} GWh` : `${fmt(v)} MWh`)} onChange={set("verbrauchMwh")} />
              <Auswahl legende="Lastprofil" wert={e.profil} onChange={set("profil")} spalten={2} klein optionen={LASTPROFILE.map((p) => ({ id: p.id, label: p.label, sub: `${fmt(p.tag * 100)} % in Sonnenstunden` }))} />
              <Regler
                label="Heutiger Energiepreis"
                wert={e.preisCt}
                min={5}
                max={25}
                step={0.1}
                stellen={1}
                format={(v) => `${fmt(v, 1)} ct/kWh`}
                onChange={set("preisCt")}
                hinweis="Nur Beschaffung und Vertrieb, ohne Netzentgelte, Umlagen und Stromsteuer – diese bleiben mit PPA gleich."
              />
            </Gruppe>

            <Gruppe titel="PPA-Angebot">
              <Auswahl legende="Lieferstruktur" wert={e.struktur} onChange={set("struktur")} optionen={STRUKTUREN} />
              <Regler
                label="PPA-Preis"
                wert={e.ppaCt}
                min={3}
                max={12}
                step={0.1}
                stellen={1}
                format={(v) => `${fmt(v, 1)} ct/kWh`}
                onChange={set("ppaCt")}
                hinweis={`Solar pay-as-produced, 10 Jahre: grob ${fmt(P.pppCt.min, 1)}–${fmt(P.pppCt.max, 1)} ct/kWh (Stand ${STAND}, eigene Einschätzung).`}
              />
              {e.struktur === "base" && (
                <Regler
                  label="Strukturierungsaufschlag"
                  wert={e.strukturCt}
                  min={0.5}
                  max={4}
                  step={0.1}
                  stellen={1}
                  format={(v) => `${fmt(v, 1)} ct/kWh`}
                  onChange={set("strukturCt")}
                  hinweis={`Für Formung in Baseload/Lastprofil, Mengen- und Ausgleichsrisiko: grob ${fmt(P.strukturierungCt.min, 1)}–${fmt(P.strukturierungCt.max, 1)} ct/kWh.`}
                />
              )}
              <Regler
                label="PPA-Menge"
                wert={e.anteil * 100}
                min={5}
                max={e.struktur === "base" ? 100 : 80}
                step={5}
                format={(v) => `${fmt(v)} % · ${fmt((e.verbrauchMwh * v) / 100)} MWh`}
                minLabel="5 %"
                maxLabel={e.struktur === "base" ? "100 %" : "80 %"}
                onChange={(v) => set("anteil")(v / 100)}
                hinweis="Anteil Ihres Jahresverbrauchs, den das PPA liefert."
              />
              <Regler label="Laufzeit" wert={e.laufzeit} min={3} max={20} step={1} einheit="Jahre" onChange={set("laufzeit")} />
            </Gruppe>
          </div>
        </>
      }
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {`Ersparnis im ersten Jahr ${Math.round(r.ersparnisJahr1)} Euro. Über ${e.laufzeit} Jahre bei Preisverfall ${Math.round(r.szenarien[0].summe)}, seitwärts ${Math.round(r.szenarien[1].summe)}, bei Anstieg ${Math.round(r.szenarien[2].summe)} Euro.`}
          </p>
          <ErgebnisKopf titel="Ihr PPA im Vergleich" plakette={`${STRUKTUREN.find((s) => s.id === e.struktur).label} · ${e.laufzeit} Jahre`} />

          <Hauptzahl
            className="mt-5"
            icon={PiggyBank}
            label="Ersparnis Jahr 1"
            zusatz="bei heutigem Preisniveau"
            rechts={
              <div className="sm:text-right">
                <p className="text-[12.5px] text-white/75">{e.laufzeit} Jahre, Markt seitwärts</p>
                <p className="ov-kpi mt-0.5 text-white">
                  <Zahl wert={r.szenarien[1].summe} format={tsd} />
                </p>
              </div>
            }
          >
            <Zahl wert={r.ersparnisJahr1} format={tsd} delta="dunkel" einlauf className={r.ersparnisJahr1 < 0 ? "text-sun-300" : undefined} />
          </Hauptzahl>
          <Belege>
            <Kennzahl ton="akzent" icon={ShieldCheck} label="Preis abgesichert" zusatz="Anteil der Kostenschwankung">
              <Zahl wert={r.absicherung * 100} suffix=" %" delta="hell" deltaFormat={(d) => `${fmt(d)} %-Pkt.`} />
            </Kennzahl>
            <Kennzahl icon={TrendingDown} label="Lohnt bis Marktpreis" zusatz="Energiepreis, ab dem das PPA teurer ist">
              {r.breakEvenCt != null ? <Zahl wert={r.breakEvenCt} stellen={1} suffix=" ct" delta="hell" /> : "–"}
            </Kennzahl>
            <Kennzahl icon={Leaf} label="CO₂ vermieden" zusatz="je Jahr, bei neuer Anlage">
              <Zahl wert={r.co2T} suffix=" t" delta="hell" />
            </Kennzahl>
          </Belege>

          <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-ink-200/70">
            <table className="w-full text-[13.5px]">
              <caption className="sr-only">Ersparnis über die Laufzeit nach Marktpreis-Szenario</caption>
              <thead className="bg-sand-50 text-[11.5px] uppercase tracking-[0.1em] text-ink-500">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Szenario Börsenpreis</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Ersparnis {e.laufzeit} J.</th>
                  <th scope="col" className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">Anteil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {r.szenarien.map((s) => (
                  <tr key={s.id} className={cn(s.id === szenario && "bg-ov-50/60")}>
                    <th scope="row" className="px-4 py-3 text-left font-semibold text-ink-900">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: SZ_FARBE[s.id] }} aria-hidden="true" />
                        {s.label} <span className="hidden font-normal text-ink-500 sm:inline">· {s.sub}</span>
                      </span>
                    </th>
                    <td className={cn("ov-num px-4 py-3 text-right font-bold", s.summe < 0 ? "text-sun-700" : "text-ink-900")}>
                      <Zahl wert={s.summe} format={tsd} />
                    </td>
                    <td className="ov-num hidden px-4 py-3 text-right text-ink-600 sm:table-cell">{fmt(s.anteil * 100, 1)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-2.5">
            {e.struktur === "pap" && h.ueberschuss > 0 && (
              <Hinweis ton="warnung" icon={Sun}>
                {fmt(r.ueberschussAnteil * 100)} % der PPA-Menge fallen an, wenn Sie den Strom nicht brauchen, und werden zum Solar-Marktwert (rund {fmt(h.wertUeberschussCt, 1)} ct/kWh) weiterverkauft. Effektiv zahlen Sie
                {" "}
                {fmt(r.effektivCt, 1)} ct je selbst genutzter kWh.
              </Hinweis>
            )}
            {e.struktur === "pap" && (
              <Hinweis ton="neutral" icon={AlertTriangle}>
                2025 fiel rund {fmt(P.negativAnteilSolar * 100)} % der Solarerzeugung in Stunden mit negativen Preisen. Klären Sie, ob und wie viel Sie in diesen Stunden abnehmen und bezahlen müssen.
              </Hinweis>
            )}
            {r.ersparnisJahr1 < 0 && (
              <Hinweis ton="warnung" icon={AlertTriangle}>
                Beim heutigen Preisniveau ist das PPA teurer als Ihre Beschaffung – es lohnt sich dann nur als Absicherung gegen steigende Preise oder für Ihre CO₂-Bilanz.
              </Hinweis>
            )}
          </div>

          <div className="mt-7 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-[13px] leading-relaxed text-ink-500">Modellrechnung ohne Gewähr, netto. Netzentgelte, Umlagen und Steuern sind in beiden Fällen gleich und daher nicht enthalten.</p>
            <Button href="/reststrom" size="lg" pfeil className="shrink-0">
              Reststrom-Pool
            </Button>
          </div>
        </>
      }
      unten={
        <DiagrammKarte
          titel={ansicht === "kumuliert" ? "Kumulierte Ersparnis je Szenario" : `Energiekosten je Jahr · ${aktiv.label}`}
          zusatz={ansicht === "kumuliert" ? "Positiv: das PPA ist günstiger als die heutige Beschaffung" : "Mit PPA gegenüber Beschaffung wie heute"}
          rechts={
            <div className="flex flex-wrap gap-2">
              {ansicht === "jahr" && (
                <Ansicht name="ppa-szenario" label="Szenario" wert={szenario} onChange={setSzenario} optionen={SZENARIEN.map((s) => ({ id: s.id, label: s.label }))} />
              )}
              <Ansicht
                name="ppa-ansicht"
                label="Diagrammansicht"
                wert={ansicht}
                onChange={setAnsicht}
                optionen={[
                  { id: "kumuliert", label: "Kumuliert" },
                  { id: "jahr", label: "Je Jahr" },
                ]}
              />
            </div>
          }
        >
          {ansicht === "kumuliert" ? (
            <Linien
              xLabels={["0", ...r.szenarien[0].jahre.map((j) => String(j.jahr))]}
              serien={r.szenarien.map((s) => ({ key: s.id, label: s.label, farbe: SZ_FARBE[s.id], werte: [0, ...s.jahre.map((j) => j.kum)], dick: s.id === "seit" }))}
              ariaLabel={`Kumulierte Ersparnis über ${e.laufzeit} Jahre: ${r.szenarien.map((s) => `${s.label} ${Math.round(s.summe)} Euro`).join(", ")}.`}
              tooltip={(i) => (
                <>
                  <p className="font-semibold">{i === 0 ? "Start" : `Nach Jahr ${i}`}</p>
                  {r.szenarien.map((s) => (
                    <p key={s.id} className="text-white/70">
                      {s.label} <span className="ov-num font-semibold text-white">{i === 0 ? "0 €" : fmtEur(s.jahre[i - 1].kum)}</span>
                    </p>
                  ))}
                </>
              )}
            />
          ) : (
            <BalkenJahre
              zeilen={aktiv.jahre.map((j) => ({ label: String(j.jahr), werte: { mit: j.mit, diff: Math.max(0, j.ohne - j.mit) } }))}
              serien={[
                { key: "mit", label: "Kosten mit PPA", farbe: FARBEN.navy },
                { key: "diff", label: "Ersparnis ggü. heute", farbe: FARBEN.gruen },
              ]}
              ariaLabel={`Energiekosten je Jahr mit PPA im Szenario ${aktiv.label}.`}
              tooltip={(z, i) => (
                <>
                  <p className="font-semibold">Jahr {aktiv.jahre[i].jahr} · Markt {fmt(aktiv.jahre[i].idx * 100)} %</p>
                  <p className="text-white/70">
                    Ohne PPA <span className="ov-num font-semibold text-white">{fmtEur(aktiv.jahre[i].ohne)}</span>
                  </p>
                  <p className="text-white/70">
                    Mit PPA <span className="ov-num font-semibold text-white">{fmtEur(aktiv.jahre[i].mit)}</span>
                  </p>
                  <p className="text-white/70">
                    Differenz <span className="ov-num font-semibold text-ov-300">{fmtEur(aktiv.jahre[i].ersparnis)}</span>
                  </p>
                </>
              )}
            />
          )}
          <p className="flex items-start gap-2 px-5 pb-5 text-[12.5px] leading-relaxed text-ink-500 md:px-6">
            <Factory aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
            Szenarien: Der Marktpreis bewegt sich über vier Jahre linear zum Zielniveau und bleibt dann konstant. Das PPA bleibt über die Laufzeit fest.
          </p>
        </DiagrammKarte>
      }
    />
  );
}
