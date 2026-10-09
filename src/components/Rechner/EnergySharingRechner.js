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
import { pfad } from "@/lib/land";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { regionEn } from "@/lib/sprache/begriffe";

// Sprachmodell: Texte des Rechners (Optionen aus src/lib/rechner/energySharing.js je id übersetzt)
const TEXTE = {
  de: {
    laender: { de: ["Deutschland", "Energy Sharing"], at: ["Österreich", "EEG / BEG"], ch: ["Schweiz", "LEG"] },
    kundentypen: { haushalt: ["Haushalte", "überwiegend privat"], sonstige: ["Betriebe", "Gewerbe, Gemeinde"] },
    mixe: { haushalte: ["Haushalte", "abends viel Verbrauch"], gemischt: ["Gemischt", "Haushalte + Betriebe"], gewerbe: ["Gewerbe", "tagsüber aktiv"] },
    rabatte: { keiner: ["Energy Sharing", "§ 42c EnWG"], lokal: ["EEG lokal", "−57 % Netz-AP"], regional: ["EEG regional", "−28 % Netz-AP"], beg: ["BEG", "ohne Abschlag"], leg40: ["LEG, eine Ebene", "−40 % Netznutzung"], leg20: ["LEG, mehrere Ebenen", "−20 % Netznutzung"] },
    teile: { energie: "Günstigerer Energiepreis", netz: "Abschlag Netzentgelt", abgaben: "Entfallende Abgaben" },
    modelle: { de: "Energy Sharing", at: "Erneuerbare-Energie-Gemeinschaft", ch: "ZEV, vZEV und lokale Elektrizitätsgemeinschaft" },
    regionLabel: (id, l) => l.replace("West- & Mitteldeutschland", "West & Mitte"),
    geld: (f, v, w) => `${v < 0 ? "−" : ""}${f.fmt(Math.abs(Math.round(v)))} ${w}`,
    geteilt: "Geteilt",
    jeTeilnehmer: "je Teilnehmer",
    erzeugerPlus: "Erzeuger +",
    landModell: "Land & Modell",
    land: "Land",
    form: "Form der Gemeinschaft",
    ueberwiegend: "Teilnehmende sind überwiegend",
    region: "Region",
    anlageTeil: "Anlage & Teilnehmende",
    leistung: "Anlagenleistung",
    erzeugungHinweis: (x) => `≈ ${x} MWh Erzeugung pro Jahr`,
    teilnehmende: "Teilnehmende",
    verbrauchJe: "Verbrauch je Teilnehmer",
    zusammen: (x) => `Zusammen ${x} MWh pro Jahr`,
    wer: "Wer macht mit? (Gleichzeitigkeit)",
    speicher: "Speicher in der Gemeinschaft",
    speicherText: "verschiebt Mittagsstrom in den Abend",
    preise: (ct) => `Preise netto (${ct}/kWh)`,
    energiepreis: "Energiepreis beim Lieferanten",
    energieHinweis: "Nur der Energieanteil – ohne Netz, Abgaben, Steuern.",
    gemeinschaftspreis: "Preis in der Gemeinschaft",
    gemeinschaftHinweis: "Das zahlen Teilnehmende dem Erzeuger je geteilter kWh.",
    netzAp: "Netz-Arbeitspreis vor Ort",
    netzHinweis: (x) => `Davon ${x} % Abschlag auf geteilten Strom.`,
    ueberschuss: "Vergütung für Überschuss",
    abrechnung: "Abrechnung je Teilnehmer",
    proJahr: (f, v, w) => `${f.fmt(v)} ${w}/Jahr`,
    sr: (a, b, c, w) => `Geteilter Strom ${a} Megawattstunden, Vorteil je Teilnehmer ${b} ${w} pro Jahr, Mehrerlös für den Erzeuger ${c} ${w}.`,
    ihre: "Ihre Gemeinschaft",
    vorteil: "Vorteil je Teilnehmer und Jahr",
    vorteilZusatz: (x) => `${x} kWh geteilt, nach Abrechnung`,
    geteilterStrom: "Geteilter Strom",
    derErzeugung: (x) => `${x} % der Erzeugung`,
    mehrerloes: "Mehrerlös Erzeuger",
    ggEinspeisung: "ggü. voller Einspeisung",
    deckung: "Deckung Verbrauch",
    durchGeteilt: "durch geteilten Strom",
    pctSuffix: " %",
    deltaPkt: (f, d) => `${f.fmt(d)} %-Pkt.`,
    vorteilKwh: "Vorteil je geteilter kWh:",
    deHinweis: "In Deutschland gibt es beim Energy Sharing nach aktuellem Stand keinen Netzentgeltvorteil – der Nutzen entsteht allein über den Preis zwischen Erzeuger und Teilnehmenden.",
    lohntNicht: "Mit diesen Preisen deckt der Vorteil die Abrechnungskosten nicht. Ein niedrigerer Gemeinschaftspreis oder mehr geteilter Strom je Teilnehmer verbessert das Ergebnis.",
    nutzung: (x) => `Nur ${x} % der Erzeugung werden geteilt – für diese Anlage fehlen Verbraucher in den Sonnenstunden. Mehr Teilnehmende, Betriebe oder ein Speicher helfen.`,
    fuss: "Näherung für eine erste Einschätzung, netto. Maßgeblich sind die Messwerte je Viertelstunde und die Regeln Ihres Netzbetreibers.",
    gruenden: "Gemeinschaft gründen",
    groesseTitel: "Wie groß darf die Anlage sein?",
    groesseZusatz: "Geteilter Strom und Überschuss je nach Anlagenleistung – bei gleichen Teilnehmenden",
    serieGeteilt: "Geteilter Strom",
    serieUeber: "Überschuss ins Netz",
    serieVerbrauch: "Verbrauch der Gemeinschaft",
    kurveAria: "Geteilter Strom und Überschuss in Abhängigkeit von der Anlagenleistung.",
    ttGeteilt: "Geteilt",
    ttUeber: "Überschuss",
    kurveText: "Geteilt wird nur, was in derselben Viertelstunde erzeugt und verbraucht wird. Ab einer gewissen Größe wächst vor allem der Überschuss – dann lohnen mehr Teilnehmende oder ein Speicher.",
    erzeugung: "Erzeugung",
    verbrauch: "Verbrauch",
    flussAria: (a, b, c, d) => `Erzeugung ${a} MWh, davon geteilt ${b} MWh; Verbrauch ${c} MWh, davon ${d} % gedeckt.`,
    legRest: "Reststrom vom Lieferanten",
  },
  en: {
    laender: { de: ["Germany", "Energy sharing"], at: ["Austria", "EEG / BEG"], ch: ["Switzerland", "LEG"] },
    kundentypen: { haushalt: ["Households", "mostly private"], sonstige: ["Businesses", "commercial, municipal"] },
    mixe: { haushalte: ["Households", "high evening use"], gemischt: ["Mixed", "households + businesses"], gewerbe: ["Commercial", "active during the day"] },
    rabatte: { keiner: ["Energy sharing", "§ 42c EnWG"], lokal: ["EEG local", "−57% grid energy charge"], regional: ["EEG regional", "−28% grid energy charge"], beg: ["BEG", "no discount"], leg40: ["LEG, one level", "−40% grid usage"], leg20: ["LEG, several levels", "−20% grid usage"] },
    teile: { energie: "Lower energy price", netz: "Grid fee discount", abgaben: "Levies no longer payable" },
    modelle: { de: "Energy sharing", at: "Renewable energy community", ch: "ZEV, vZEV and local electricity community" },
    regionLabel: (id, l) => regionEn(id, "label", l).replace("Western & central Germany", "West & Central"),
    geld: (f, v, w) => `${v < 0 ? "−" : ""}${w === "€" ? "€" : `${w} `}${f.fmt(Math.abs(Math.round(v)))}`,
    geteilt: "Shared",
    jeTeilnehmer: "per participant",
    erzeugerPlus: "Producer +",
    landModell: "Country & model",
    land: "Country",
    form: "Type of community",
    ueberwiegend: "Participants are mostly",
    region: "Region",
    anlageTeil: "Plant & participants",
    leistung: "Plant capacity",
    erzeugungHinweis: (x) => `≈ ${x} MWh of generation per year`,
    teilnehmende: "Participants",
    verbrauchJe: "Consumption per participant",
    zusammen: (x) => `Together ${x} MWh per year`,
    wer: "Who takes part? (simultaneity)",
    speicher: "Storage in the community",
    speicherText: "shifts midday power into the evening",
    preise: (ct) => `Net prices (${ct}/kWh)`,
    energiepreis: "Energy price from your supplier",
    energieHinweis: "Energy component only – excluding grid fees, levies and taxes.",
    gemeinschaftspreis: "Price within the community",
    gemeinschaftHinweis: "What participants pay the producer per shared kWh.",
    netzAp: "Local grid energy charge",
    netzHinweis: (x) => `Of which a ${x}% discount on shared power.`,
    ueberschuss: "Remuneration for surplus",
    abrechnung: "Billing per participant",
    proJahr: (f, v, w) => `${w === "€" ? "€" : `${w} `}${f.fmt(v)}/year`,
    sr: (a, b, c, w) => `Shared power ${a} megawatt hours, benefit per participant ${b} ${w} per year, additional revenue for the producer ${c} ${w}.`,
    ihre: "Your community",
    vorteil: "Benefit per participant per year",
    vorteilZusatz: (x) => `${x} kWh shared, after billing`,
    geteilterStrom: "Shared power",
    derErzeugung: (x) => `${x}% of generation`,
    mehrerloes: "Additional producer revenue",
    ggEinspeisung: "vs. full grid feed-in",
    deckung: "Consumption covered",
    durchGeteilt: "by shared power",
    pctSuffix: "%",
    deltaPkt: (f, d) => `${f.fmt(d)} pp`,
    vorteilKwh: "Benefit per shared kWh:",
    deHinweis: "In Germany, energy sharing currently brings no grid fee advantage – the benefit arises solely from the price agreed between producer and participants.",
    lohntNicht: "At these prices, the benefit does not cover the billing costs. A lower community price or more shared power per participant improves the result.",
    nutzung: (x) => `Only ${x}% of generation is shared – this plant lacks consumers during sunshine hours. More participants, businesses or storage will help.`,
    fuss: "An approximation for a first assessment, net. The quarter-hourly metering data and the rules of your grid operator are authoritative.",
    gruenden: "Set up a community",
    groesseTitel: "How large can the plant be?",
    groesseZusatz: "Shared power and surplus depending on plant capacity – with the same participants",
    serieGeteilt: "Shared power",
    serieUeber: "Surplus to the grid",
    serieVerbrauch: "Community consumption",
    kurveAria: "Shared power and surplus depending on plant capacity.",
    ttGeteilt: "Shared",
    ttUeber: "Surplus",
    kurveText: "Only power that is generated and consumed in the same quarter-hour is shared. Beyond a certain size, mainly the surplus grows – then more participants or storage pay off.",
    erzeugung: "Generation",
    verbrauch: "Consumption",
    flussAria: (a, b, c, d) => `Generation ${a} MWh, of which ${b} MWh shared; consumption ${c} MWh, of which ${d}% covered.`,
    legRest: "Residual power from your supplier",
  },
};
const opt = (liste, tab) => liste.map((x) => ({ ...x, label: tab[x.id]?.[0] ?? x.label, sub: tab[x.id]?.[1] ?? x.sub }));

export default function EnergySharingRechner() {
  const t = useTexte(TEXTE);
  const f = useFormate();
  const { fmt } = f;
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
  const geld = (v) => t.geld(f, v, w);
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
              [t.geteilt, `${fmt(r.geteilt / 1000)} MWh`],
              [t.jeTeilnehmer, geld(r.jeTeilnehmer)],
              [t.erzeugerPlus, geld(r.mehrerloesErzeuger)],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel={t.landModell}>
              <Auswahl legende={t.land} wert={e.land} onChange={setLand} optionen={opt(LAENDER, t.laender)} />
              {l.rabatte.length > 1 && <Auswahl legende={t.form} wert={e.rabattId} onChange={set("rabattId")} optionen={opt(l.rabatte, t.rabatte)} klein />}
              {l.abgabenCtNachTyp && (
                <Auswahl legende={t.ueberwiegend} wert={e.kundentyp} onChange={set("kundentyp")} optionen={opt(KUNDENTYPEN, t.kundentypen)} klein />
              )}
              {regionenFuer(e.land).length > 1 && (
                <Auswahl
                  legende={t.region}
                  wert={e.regionId}
                  onChange={set("regionId")}
                  spalten={2}
                  klein
                  optionen={regionenFuer(e.land).map((x) => ({ id: x.id, label: t.regionLabel(x.id, x.label), sub: `${fmt(x.ertrag)} kWh/kWp` }))}
                />
              )}
            </Gruppe>

            <Gruppe titel={t.anlageTeil}>
              <Regler label={t.leistung} wert={e.kwp} min={10} max={5000} step={10} format={(v) => (v >= 1000 ? `${fmt(v / 1000, 2)} MWp` : `${fmt(v)} kWp`)} onChange={set("kwp")} hinweis={t.erzeugungHinweis(fmt(r.erzeugung / 1000))} />
              <Regler label={t.teilnehmende} wert={e.teilnehmer} min={2} max={1000} step={1} onChange={set("teilnehmer")} />
              <Regler label={t.verbrauchJe} wert={e.verbrauchJe} min={1000} max={50000} step={500} format={(v) => `${fmt(v)} kWh`} onChange={set("verbrauchJe")} hinweis={t.zusammen(fmt(r.verbrauch / 1000))} />
              <Auswahl legende={t.wer} wert={e.mix} onChange={set("mix")} optionen={opt(MIXE, t.mixe)} klein />
              <Schalter icon={BatteryCharging} label={t.speicher} beschreibung={t.speicherText} an={e.speicher} onChange={set("speicher")} />
            </Gruppe>

            <Gruppe titel={t.preise(ct)}>
              <Regler label={t.energiepreis} wert={e.energiepreis} min={5} max={30} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ${ct}`} onChange={set("energiepreis")} hinweis={t.energieHinweis} />
              <Regler label={t.gemeinschaftspreis} wert={e.gemeinschaftCt} min={3} max={25} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ${ct}`} onChange={set("gemeinschaftCt")} hinweis={t.gemeinschaftHinweis} />
              {r.rabatt.anteil > 0 && (
                <Regler label={t.netzAp} wert={e.netzAp} min={2} max={15} step={0.1} stellen={1} format={(v) => `${fmt(v, 1)} ${ct}`} onChange={set("netzAp")} hinweis={t.netzHinweis(fmt(r.rabatt.anteil * 100))} />
              )}
              <Regler label={t.ueberschuss} wert={e.ueberschussCt} min={0} max={15} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ${ct}`} onChange={set("ueberschussCt")} />
              <Regler label={t.abrechnung} wert={e.verwaltung} min={0} max={120} step={5} format={(v) => t.proJahr(f, v, w)} onChange={set("verwaltung")} />
            </Gruppe>
          </div>
        </>
      }
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {t.sr(fmt(r.geteilt / 1000), Math.round(r.jeTeilnehmer), Math.round(r.mehrerloesErzeuger), w)}
          </p>
          <ErgebnisKopf titel={t.ihre} plakette={t.modelle[e.land] ?? `${GEMEINSCHAFTEN[e.land].titel.split(" (")[0]}`} />

          <Hauptzahl
            className="mt-5"
            icon={Users}
            label={t.vorteil}
            zusatz={t.vorteilZusatz(fmt(r.geteiltJeTeilnehmer))}
            rechts={
              <div className="sm:text-right">
                <p className="flex items-center gap-1.5 text-[12.5px] text-white/75 sm:justify-end">
                  <Sun aria-hidden="true" className="h-3.5 w-3.5" />
                  {t.geteilterStrom}
                </p>
                <p className="ov-kpi mt-0.5 text-white">
                  <Zahl wert={r.geteilt / 1000} suffix=" MWh" />
                </p>
                <p className="text-[12.5px] text-white/75">{t.derErzeugung(fmt(r.nutzung * 100))}</p>
              </div>
            }
          >
            <Zahl wert={r.jeTeilnehmer} format={geld} delta="dunkel" einlauf className={r.jeTeilnehmer < 0 ? "text-sun-300" : undefined} />
          </Hauptzahl>
          <Belege spalten={2}>
            <Kennzahl ton="akzent" icon={Handshake} label={t.mehrerloes} zusatz={t.ggEinspeisung}>
              <Zahl wert={r.mehrerloesErzeuger} format={geld} delta="hell" />
            </Kennzahl>
            <Kennzahl icon={Home} label={t.deckung} zusatz={t.durchGeteilt}>
              <Zahl wert={r.deckung * 100} suffix={t.pctSuffix} delta="hell" deltaFormat={(dd) => t.deltaPkt(f, dd)} />
            </Kennzahl>
          </Belege>

          <Fluss r={r} />

          <div className="mt-4 rounded-2xl bg-ink-50 p-4">
            <p className="text-[13.5px] font-semibold text-ink-800">
              {t.vorteilKwh} <span className="ov-num">{fmt(r.vorteilCt, 2)} {ct}</span>
            </p>
            <ul className="mt-2 space-y-1 text-[13px] text-ink-600">
              {r.teile.map((x) => (
                <li key={x.id} className="flex justify-between gap-3">
                  <span>{t.teile[x.id] ?? x.label}</span>
                  <span className="ov-num font-semibold text-ink-800">
                    {x.ct >= 0 ? "" : "−"}
                    {fmt(Math.abs(x.ct), 2)} {ct}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 space-y-2.5">
            {e.land === "de" && (
              <Hinweis ton="neutral" icon={Info}>
                {t.deHinweis}
              </Hinweis>
            )}
            {!r.lohntSich && (
              <Hinweis ton="warnung" icon={AlertTriangle}>
                {t.lohntNicht}
              </Hinweis>
            )}
            {r.nutzung < 0.4 && (
              <Hinweis ton="neutral" icon={Sun}>
                {t.nutzung(fmt(r.nutzung * 100))}
              </Hinweis>
            )}
          </div>

          <div className="mt-7 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-[13px] leading-relaxed text-ink-500">{t.fuss}</p>
            <Button href={pfad("/energiegemeinschaften")} size="lg" pfeil className="shrink-0">
              {t.gruenden}
            </Button>
          </div>
        </>
      }
      unten={
        <DiagrammKarte titel={t.groesseTitel} zusatz={t.groesseZusatz}>
          <Linien
            xLabels={kurve.xs.map((k) => (k >= 1000 ? `${fmt(k / 1000, 1)} MW` : `${fmt(k)}`))}
            serien={[
              { key: "geteilt", label: t.serieGeteilt, farbe: FARBEN.gruen, werte: kurve.werte.map((x) => x.geteilt / 1000), dick: true },
              { key: "ueber", label: t.serieUeber, farbe: FARBEN.sun, werte: kurve.werte.map((x) => x.ueberschuss / 1000) },
              { key: "verbrauch", label: t.serieVerbrauch, farbe: FARBEN.grau, werte: kurve.werte.map((x) => x.verbrauch / 1000), gestrichelt: true },
            ]}
            achsenFormat={(v) => `${fmt(v)} MWh`}
            ariaLabel={t.kurveAria}
            tooltip={(i) => (
              <>
                <p className="font-semibold">{kurve.xs[i] >= 1000 ? `${fmt(kurve.xs[i] / 1000, 2)} MWp` : `${fmt(kurve.xs[i])} kWp`}</p>
                <p className="text-white/70">
                  {t.ttGeteilt} <span className="ov-num font-semibold text-white">{fmt(kurve.werte[i].geteilt / 1000)} MWh</span>
                </p>
                <p className="text-white/70">
                  {t.ttUeber} <span className="ov-num font-semibold text-white">{fmt(kurve.werte[i].ueberschuss / 1000)} MWh</span>
                </p>
                <p className="text-white/70">
                  {t.jeTeilnehmer} <span className="ov-num font-semibold text-ov-300">{geld(kurve.werte[i].jeTeilnehmer)}</span>
                </p>
              </>
            )}
          />
          <p className="px-5 pb-5 text-[12.5px] leading-relaxed text-ink-500 md:px-6">
            {t.kurveText}
          </p>
        </DiagrammKarte>
      }
    />
  );
}

function Fluss({ r }) {
  const t = useTexte(TEXTE);
  const { fmt } = useFormate();
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
      aria-label={t.flussAria(fmt(r.erzeugung / 1000), fmt(r.geteilt / 1000), fmt(r.verbrauch / 1000), fmt(r.deckung * 100))}
    >
      <Balken titel={t.erzeugung} gesamt={r.erzeugung} teile={[["geteilt", r.geteilt, FARBEN.gruen], ["ueber", r.ueberschuss, FARBEN.sunHell]]} />
      <Balken titel={t.verbrauch} gesamt={r.verbrauch} teile={[["geteilt", r.geteilt, FARBEN.gruen], ["rest", r.verbrauch - r.geteilt, FARBEN.grau]]} />
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-600">
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ov-500" aria-hidden="true" />{t.ttGeteilt}</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sun-400" aria-hidden="true" />{t.serieUeber}</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink-300" aria-hidden="true" />{t.legRest}</li>
      </ul>
    </div>
  );
}
