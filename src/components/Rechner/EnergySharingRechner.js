"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BatteryCharging, Handshake, Home, Info, Sun, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Schalter, Zahl } from "./bausteine";
import { useTeilbarerZustand } from "./kontext";
import { ErgebnisKopf, Hinweis, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { DiagrammKarte, FARBEN, Linien } from "./ToolTeile";
import { KUNDENTYPEN, LAENDER, MIXE, land as landDaten, rechneEnergySharing, regionenFuer, standardFuer } from "@/lib/rechner/energySharing";
import { GEMEINSCHAFTEN } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

export default function EnergySharingRechner() {
  const [e, setE] = useState(() => standardFuer("at"));
  const set = (k) => (v) => setE((a) => ({ ...a, [k]: v }));
  const setLand = (id) => setE((a) => ({ ...standardFuer(id), kwp: a.kwp, teilnehmer: a.teilnehmer, verbrauchJe: a.verbrauchJe, mix: a.mix, speicher: a.speicher }));
  // Teilbarer Link: zuerst den Landesstandard setzen, dann die geteilten Werte
  useTeilbarerZustand(e, (neu) => setE((a) => ({ ...(neu.land && neu.land !== a.land ? standardFuer(neu.land) : a), ...neu })), {
    optionen: {
      land: LAENDER.map((x) => x.id),
      mix: MIXE.map((x) => x.id),
      kundentyp: KUNDENTYPEN.map((x) => x.id),
      regionId: LAENDER.flatMap((x) => regionenFuer(x.id).map((y) => y.id)),
      rabattId: LAENDER.flatMap((x) => landDaten(x.id).rabatte.map((y) => y.id)),
    },
    grenzen: { kwp: [10, 5000], teilnehmer: [2, 1000], verbrauchJe: [1000, 50000], energiepreis: [5, 30], gemeinschaftCt: [3, 25], netzAp: [2, 15], ueberschussCt: [0, 15], verwaltung: [0, 120] },
    pruefen: (_, neu) => {
      const z = { ...standardFuer(neu.land || "at"), ...neu };
      if (!regionenFuer(z.land).some((x) => x.id === z.regionId)) throw new Error("Region passt nicht zum Land");
      if (!landDaten(z.land).rabatte.some((x) => x.id === z.rabattId)) throw new Error("Modell passt nicht zum Land");
      rechneEnergySharing(z);
    },
  });
  const r = useMemo(() => rechneEnergySharing(e), [e]);
  const l = landDaten(e.land);
  const w = l.waehrung;
  const ct = l.ct;
  const geld = (v) => `${v < 0 ? "−" : ""}${fmt(Math.abs(Math.round(v)))} ${w}`;
  const kurve = useMemo(() => {
    const max = Math.max(500, Math.ceil((e.kwp * 2.5) / 100) * 100);
    const xs = Array.from({ length: 11 }, (_, i) => Math.round((max * i) / 10));
    return { xs, werte: xs.map((k) => rechneEnergySharing({ ...e, kwp: k })) };
  }, [e]);

  return (
    <RechnerRahmen
      mitlaufend
      eingaben={
        <>
          <MobilKurz
            werte={[
              ["Geteilt", `${fmt(r.geteilt / 1000)} MWh`],
              ["je Teilnehmer", geld(r.jeTeilnehmer)],
              ["Erzeuger +", geld(r.mehrerloesErzeuger)],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel="Land & Modell">
              <Auswahl legende="Land" wert={e.land} onChange={setLand} optionen={LAENDER} />
              {l.rabatte.length > 1 && <Auswahl legende="Form der Gemeinschaft" wert={e.rabattId} onChange={set("rabattId")} optionen={l.rabatte} klein />}
              {l.abgabenCtNachTyp && (
                <Auswahl legende="Teilnehmende sind überwiegend" wert={e.kundentyp} onChange={set("kundentyp")} optionen={KUNDENTYPEN} klein />
              )}
              {regionenFuer(e.land).length > 1 && (
                <Auswahl
                  legende="Region"
                  wert={e.regionId}
                  onChange={set("regionId")}
                  spalten={2}
                  klein
                  optionen={regionenFuer(e.land).map((x) => ({ id: x.id, label: x.label.replace("West- & Mitteldeutschland", "West & Mitte"), sub: `${fmt(x.ertrag)} kWh/kWp` }))}
                />
              )}
            </Gruppe>

            <Gruppe titel="Anlage & Teilnehmende">
              <Regler label="Anlagenleistung" wert={e.kwp} min={10} max={5000} step={10} format={(v) => (v >= 1000 ? `${fmt(v / 1000, 2)} MWp` : `${fmt(v)} kWp`)} onChange={set("kwp")} hinweis={`≈ ${fmt(r.erzeugung / 1000)} MWh Erzeugung pro Jahr`} />
              <Regler label="Teilnehmende" wert={e.teilnehmer} min={2} max={1000} step={1} onChange={set("teilnehmer")} />
              <Regler label="Verbrauch je Teilnehmer" wert={e.verbrauchJe} min={1000} max={50000} step={500} format={(v) => `${fmt(v)} kWh`} onChange={set("verbrauchJe")} hinweis={`Zusammen ${fmt(r.verbrauch / 1000)} MWh pro Jahr`} />
              <Auswahl legende="Wer macht mit? (Gleichzeitigkeit)" wert={e.mix} onChange={set("mix")} optionen={MIXE} klein />
              <Schalter icon={BatteryCharging} label="Speicher in der Gemeinschaft" beschreibung="verschiebt Mittagsstrom in den Abend" an={e.speicher} onChange={set("speicher")} />
            </Gruppe>

            <Gruppe titel={`Preise netto (${ct}/kWh)`}>
              <Regler label="Energiepreis beim Lieferanten" wert={e.energiepreis} min={5} max={30} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ${ct}`} onChange={set("energiepreis")} hinweis="Nur der Energieanteil – ohne Netz, Abgaben, Steuern." />
              <Regler label="Preis in der Gemeinschaft" wert={e.gemeinschaftCt} min={3} max={25} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ${ct}`} onChange={set("gemeinschaftCt")} hinweis="Das zahlen Teilnehmende dem Erzeuger je geteilter kWh." />
              {r.rabatt.anteil > 0 && (
                <Regler label="Netz-Arbeitspreis vor Ort" wert={e.netzAp} min={2} max={15} step={0.1} stellen={1} format={(v) => `${fmt(v, 1)} ${ct}`} onChange={set("netzAp")} hinweis={`Davon ${fmt(r.rabatt.anteil * 100)} % Abschlag auf geteilten Strom.`} />
              )}
              <Regler label="Vergütung für Überschuss" wert={e.ueberschussCt} min={0} max={15} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ${ct}`} onChange={set("ueberschussCt")} />
              <Regler label="Abrechnung je Teilnehmer" wert={e.verwaltung} min={0} max={120} step={5} format={(v) => `${fmt(v)} ${w}/Jahr`} onChange={set("verwaltung")} />
            </Gruppe>
          </div>
        </>
      }
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {`Geteilter Strom ${fmt(r.geteilt / 1000)} Megawattstunden, Vorteil je Teilnehmer ${Math.round(r.jeTeilnehmer)} ${w} pro Jahr, Mehrerlös für den Erzeuger ${Math.round(r.mehrerloesErzeuger)} ${w}.`}
          </p>
          <ErgebnisKopf titel="Ihre Gemeinschaft" plakette={`${GEMEINSCHAFTEN[e.land].titel.split(" (")[0]}`} />

          <Hauptzahl
            className="mt-5"
            icon={Users}
            label="Vorteil je Teilnehmer und Jahr"
            zusatz={`${fmt(r.geteiltJeTeilnehmer)} kWh geteilt, nach Abrechnung`}
            rechts={
              <div className="sm:text-right">
                <p className="flex items-center gap-1.5 text-[12.5px] text-white/75 sm:justify-end">
                  <Sun aria-hidden="true" className="h-3.5 w-3.5" />
                  Geteilter Strom
                </p>
                <p className="ov-kpi mt-0.5 text-white">
                  <Zahl wert={r.geteilt / 1000} suffix=" MWh" />
                </p>
                <p className="text-[12.5px] text-white/75">{fmt(r.nutzung * 100)} % der Erzeugung</p>
              </div>
            }
          >
            <Zahl wert={r.jeTeilnehmer} format={geld} delta="dunkel" einlauf className={r.jeTeilnehmer < 0 ? "text-sun-300" : undefined} />
          </Hauptzahl>
          <Belege spalten={2}>
            <Kennzahl ton="akzent" icon={Handshake} label="Mehrerlös Erzeuger" zusatz="ggü. voller Einspeisung">
              <Zahl wert={r.mehrerloesErzeuger} format={geld} delta="hell" />
            </Kennzahl>
            <Kennzahl icon={Home} label="Deckung Verbrauch" zusatz="durch geteilten Strom">
              <Zahl wert={r.deckung * 100} suffix=" %" delta="hell" deltaFormat={(dd) => `${fmt(dd)} %-Pkt.`} />
            </Kennzahl>
          </Belege>

          <Fluss r={r} />

          <div className="mt-4 rounded-2xl bg-ink-50 p-4">
            <p className="text-[13.5px] font-semibold text-ink-800">
              Vorteil je geteilter kWh: <span className="ov-num">{fmt(r.vorteilCt, 2)} {ct}</span>
            </p>
            <ul className="mt-2 space-y-1 text-[13px] text-ink-600">
              {r.teile.map((t) => (
                <li key={t.id} className="flex justify-between gap-3">
                  <span>{t.label}</span>
                  <span className="ov-num font-semibold text-ink-800">
                    {t.ct >= 0 ? "" : "−"}
                    {fmt(Math.abs(t.ct), 2)} {ct}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 space-y-2.5">
            {e.land === "de" && (
              <Hinweis ton="neutral" icon={Info}>
                In Deutschland gibt es beim Energy Sharing nach aktuellem Stand keinen Netzentgeltvorteil – der Nutzen entsteht allein über den Preis zwischen Erzeuger und Teilnehmenden.
              </Hinweis>
            )}
            {!r.lohntSich && (
              <Hinweis ton="warnung" icon={AlertTriangle}>
                Mit diesen Preisen deckt der Vorteil die Abrechnungskosten nicht. Ein niedrigerer Gemeinschaftspreis oder mehr geteilter Strom je Teilnehmer verbessert das Ergebnis.
              </Hinweis>
            )}
            {r.nutzung < 0.4 && (
              <Hinweis ton="neutral" icon={Sun}>
                Nur {fmt(r.nutzung * 100)} % der Erzeugung werden geteilt – für diese Anlage fehlen Verbraucher in den Sonnenstunden. Mehr Teilnehmende, Betriebe oder ein Speicher helfen.
              </Hinweis>
            )}
          </div>

          <div className="mt-7 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-[13px] leading-relaxed text-ink-500">Näherung für eine erste Einschätzung, netto. Maßgeblich sind die Messwerte je Viertelstunde und die Regeln Ihres Netzbetreibers.</p>
            <Button href="/energiegemeinschaften" size="lg" pfeil className="shrink-0">
              Gemeinschaft gründen
            </Button>
          </div>
        </>
      }
      unten={
        <DiagrammKarte titel="Wie groß darf die Anlage sein?" zusatz="Geteilter Strom und Überschuss je nach Anlagenleistung – bei gleichen Teilnehmenden">
          <Linien
            xLabels={kurve.xs.map((k) => (k >= 1000 ? `${fmt(k / 1000, 1)} MW` : `${fmt(k)}`))}
            serien={[
              { key: "geteilt", label: "Geteilter Strom", farbe: FARBEN.gruen, werte: kurve.werte.map((x) => x.geteilt / 1000), dick: true },
              { key: "ueber", label: "Überschuss ins Netz", farbe: FARBEN.sun, werte: kurve.werte.map((x) => x.ueberschuss / 1000) },
              { key: "verbrauch", label: "Verbrauch der Gemeinschaft", farbe: FARBEN.grau, werte: kurve.werte.map((x) => x.verbrauch / 1000), gestrichelt: true },
            ]}
            achsenFormat={(v) => `${fmt(v)} MWh`}
            ariaLabel="Geteilter Strom und Überschuss in Abhängigkeit von der Anlagenleistung."
            tooltip={(i) => (
              <>
                <p className="font-semibold">{kurve.xs[i] >= 1000 ? `${fmt(kurve.xs[i] / 1000, 2)} MWp` : `${fmt(kurve.xs[i])} kWp`}</p>
                <p className="text-white/70">
                  Geteilt <span className="ov-num font-semibold text-white">{fmt(kurve.werte[i].geteilt / 1000)} MWh</span>
                </p>
                <p className="text-white/70">
                  Überschuss <span className="ov-num font-semibold text-white">{fmt(kurve.werte[i].ueberschuss / 1000)} MWh</span>
                </p>
                <p className="text-white/70">
                  je Teilnehmer <span className="ov-num font-semibold text-ov-300">{geld(kurve.werte[i].jeTeilnehmer)}</span>
                </p>
              </>
            )}
          />
          <p className="px-5 pb-5 text-[12.5px] leading-relaxed text-ink-500 md:px-6">
            Geteilt wird nur, was in derselben Viertelstunde erzeugt und verbraucht wird. Ab einer gewissen Größe wächst vor allem der Überschuss – dann lohnen mehr Teilnehmende oder ein Speicher.
          </p>
        </DiagrammKarte>
      }
    />
  );
}

function Fluss({ r }) {
  const max = Math.max(r.erzeugung, r.verbrauch) || 1;
  const Balken = ({ titel, gesamt, teile }) => (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="font-semibold text-ink-800">{titel}</span>
        <span className="ov-num text-ink-600">{fmt(gesamt / 1000)} MWh</span>
      </div>
      <div className="mt-1.5 flex h-3 overflow-hidden rounded-full bg-ink-100" style={{ width: `${Math.max(8, (gesamt / max) * 100)}%` }}>
        {teile.map(([k, v, f]) => (
          <div key={k} style={{ width: `${gesamt > 0 ? (v / gesamt) * 100 : 0}%`, background: f }} className="motion-safe:transition-[width] motion-safe:duration-500" />
        ))}
      </div>
    </div>
  );
  return (
    <div
      className="mt-5 space-y-3 rounded-2xl ring-1 ring-ink-200/70 p-4"
      role="img"
      aria-label={`Erzeugung ${fmt(r.erzeugung / 1000)} MWh, davon geteilt ${fmt(r.geteilt / 1000)} MWh; Verbrauch ${fmt(r.verbrauch / 1000)} MWh, davon ${fmt(r.deckung * 100)} % gedeckt.`}
    >
      <Balken titel="Erzeugung" gesamt={r.erzeugung} teile={[["geteilt", r.geteilt, FARBEN.gruen], ["ueber", r.ueberschuss, FARBEN.sunHell]]} />
      <Balken titel="Verbrauch" gesamt={r.verbrauch} teile={[["geteilt", r.geteilt, FARBEN.gruen], ["rest", r.verbrauch - r.geteilt, FARBEN.grau]]} />
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-600">
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ov-500" aria-hidden="true" />Geteilt</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sun-400" aria-hidden="true" />Überschuss ins Netz</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink-300" aria-hidden="true" />Reststrom vom Lieferanten</li>
      </ul>
    </div>
  );
}
