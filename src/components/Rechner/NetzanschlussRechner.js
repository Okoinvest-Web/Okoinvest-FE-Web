"use client";

import { SperrEingaben } from "./LaenderSperre";
import { AlertTriangle, BatteryCharging, CalendarClock, Cable, Coins, Lightbulb, Network, Percent, Users } from "lucide-react";
import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Schalter, Zahl } from "./bausteine";
import { useTeilbarerZustand } from "./kontext";
import { ErgebnisKopf, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { AmpelMarke, FARBEN } from "./ToolTeile";
import { EBENEN, KAPAZITAETEN, LAENDER, STANDARD, rechneNetzanschluss } from "@/lib/rechner/netzanschluss";
import { pfad } from "@/lib/land";
import { useSeitenLand } from "@/components/Land/LandKontext";
import { landStart } from "@/components/Land/useLand";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { FREIFLAECHE } from "@/lib/invest/markt";

const geldMit = (f) => (v) => (v >= 1e6 ? f.fmtMio(v, 2) : f.tsd(Math.round(v / 1000) * 1000));
const opt = (liste, tab) => liste.map((x) => ({ ...x, label: tab[x.id]?.[0] ?? x.label, sub: tab[x.id]?.[1] ?? x.sub }));

/**
 * Englische Risiken und Tipps – dieselben Bedingungen wie rechneNetzanschluss() (src/lib/rechner/netzanschluss.js),
 * nur die Texte. Die Rechenlogik bleibt unverändert; ändern sich dort Bedingungen, hier nachziehen.
 */
function risikenTippsEn(e, r, f) {
  const risiken = [];
  if (e.kapazitaet === "knapp") risiken.push("Grid expansion by the grid operator is required – the operator bears the cost (§ 17 EEG), you bear the time: often several years until feed-in.");
  if (e.kapazitaet === "unbekannt") risiken.push("Capacity unknown: the grid compatibility check may result in a more distant connection point – which changes costs and schedule considerably.");
  if (e.km > 5) risiken.push(`Long cable route (${f.fmt(e.km, 1)} km): every plot needs a cable easement; crossings of roads, railways and watercourses lengthen planning and approval.`);
  if (r.ebene === "hs") risiken.push("110 kV connection: own substation with long delivery times for transformers and its own approval procedure.");
  if (r.anteil > 0.15) risiken.push(`The grid connection accounts for around ${Math.round(r.anteil * 100)}% of the plant costs – this noticeably reduces the return.`);
  if (e.speicherMw > 0 && e.speicherNetzbezug) risiken.push("Storage drawing from the grid: plan for a construction cost contribution (BGH, 15 July 2025) and grid fees on consumption; exemptions are currently time-limited.");
  if (e.anschlussQuote < 0.7 && e.speicherMw === 0) risiken.push("Heavy overbuilding without storage: noticeable curtailment losses – storage can absorb most of them.");
  if (risiken.length === 0) risiken.push("No conspicuous risks based on your inputs – what matters is the binding information from the grid operator.");

  const tipps = [];
  if (e.land === "de") {
    tipps.push(`Submit the grid connection request early and completely under § 8 EEG: the grid operator must provide a schedule without delay and present the result of the grid compatibility check, including a cost estimate, within ${FREIFLAECHE.netz.pruefWochen} weeks at the latest (§ 8(5) and (6) EEG).`);
    tipps.push("Clarify the reservation: many grid operators reserve capacity only for a limited time and require evidence of project progress (such as land secured, resolution to draw up a plan) – sometimes with a reservation fee. The rules differ between grid operators.");
  }
  if (e.land === "at") tipps.push("Austria: apply for grid access to the distribution system operator; grid access fees and, where applicable, grid provision fees apply. Capacities are published per grid area – check early.");
  if (e.land === "ch") tipps.push("Switzerland: the connection conditions of the distribution system operator are decisive; necessary grid reinforcements are usually covered by grid costs (Swissgrid) – have this confirmed in advance.");
  if (!e.cluster) tipps.push("Consider clustering: use a shared cable route or substation with neighbouring projects – this splits costs and planning effort.");
  else tipps.push("Clustering: regulate cost sharing, construction sequence and liability if a partner is delayed in a contract.");
  if (e.anschlussQuote >= 0.95) tipps.push("Consider overbuilding: with 70–80% connection capacity per MWp, often only a few percent of yield are lost; a flexible grid connection agreement under § 8a EEG can make capacity available sooner.");
  if (e.speicherMw === 0) tipps.push("Storage at the same connection (co-location) smooths feed-in peaks, absorbs curtailment and creates additional revenue.");
  tipps.push("Secure cable rights early: easements along the route are often the longest path – start in parallel with the development plan procedure.");
  return { risiken, tipps };
}

// Sprachmodell: Texte des Rechners
const TEXTE = {
  de: {
    ebeneLabel: { msLeitung: "Mittelspannungsleitung (20 kV)", uwMs: "Umspannwerk, MS-Sammelschiene", hs: "Hochspannung 110 kV" },
    ampelText: {
      gut: "Gute Ausgangslage – der Netzanschluss dürfte das Projekt nicht bremsen.",
      pruefen: "Machbar, aber Kosten oder Kapazität sind offen – früh beim Netzbetreiber anfragen.",
      kritisch: "Der Netzanschluss ist das Nadelöhr – Kosten oder Wartezeit können das Projekt in Frage stellen.",
    },
    ebenen: { auto: ["Automatisch", "nach Leistung"], msLeitung: ["MS-Leitung", "Einschleifen 20 kV"], uwMs: ["Umspannwerk", "MS-Sammelschiene"], hs: ["110 kV", "eigenes Umspannwerk"] },
    kapazitaeten: { frei: ["Bekannt: frei", "Auskunft liegt vor"], unbekannt: ["Unbekannt", "noch nicht angefragt"], knapp: ["Bekannt: knapp", "Ausbau nötig"] },
    laender: { de: ["Deutschland"], at: ["Österreich"], ch: ["Schweiz"] },
    posten: (p) => p.label,
    land: "Land",
    kosten: "Kosten",
    jeKwp: "je kWp",
    zeit: "Zeit",
    monate: (a, b) => `${a}–${b} Mon.`,
    anlage: "Anlage",
    groesse: "Anlagengröße",
    anschluss: "Anschlussleistung (Überbauung)",
    anschlussFormat: (f, v, mw) => `${f.fmt(v)} % · ${mw} MW`,
    anschlussHinweis: "Einspeiseleistung im Verhältnis zur Modulleistung – weniger Leistung spart Netzkosten, kostet aber etwas Ertrag.",
    speicher: "Speicher am selben Anschluss",
    speicherText: "Co-Location, fängt Spitzen auf",
    speicherLeistung: "Speicherleistung",
    netzbezug: "Speicher lädt auch aus dem Netz",
    netzbezugText: "dann fällt ein Baukostenzuschuss an",
    netz: "Netz",
    entfernung: "Entfernung zum Anschlusspunkt",
    entfernungHinweis: "Trassenlänge bis zur MS-Leitung oder zum Umspannwerk – meist länger als Luftlinie.",
    ebene: "Spannungsebene",
    kapazitaet: "Freie Netzkapazität",
    cluster: "Clusterung mit Nachbarprojekt",
    clusterText: "gemeinsame Trasse bzw. gemeinsames Umspannwerk",
    sr: (a, b, c, d) => `Netzanschluss grob ${a} bis ${b}, Zeitrahmen ${c} bis ${d} Monate.`,
    ihr: "Ihr Netzanschluss",
    hauptLabel: "Kosten des Netzanschlusses (Mitte)",
    spanne: (a, b) => `Spanne ${a} – ${b}`,
    anlagenkosten: (x) => `${x} % der Anlagenkosten`,
    zeitrahmen: "Zeitrahmen",
    abBegehren: "ab vollständigem Begehren",
    anschlussK: "Anschluss",
    systeme: (n) => `${n} × 20-kV-System`,
    erwartet: (mw, l) => `Für ${mw} MW wäre typischerweise „${l}“ zu erwarten.`,
    ihrAnteil: "(Ihr Anteil)",
    fuss: "Grobe Orientierung ohne Gewähr. Verbindlich sind nur Netzverträglichkeitsprüfung und Kostenvoranschlag des Netzbetreibers.",
    pruefen: "Fläche prüfen lassen",
    ueberTitel: "Überbauung: lohnt weniger Anschlussleistung?",
    voll: "Sie rechnen mit voller Anschlussleistung. Stellen Sie den Regler „Anschlussleistung“ auf 70–80 %: Oft sinken die Netzkosten, während nur wenige Prozent Ertrag verloren gehen.",
    gespart: "Netzkosten gespart",
    gg100: "ggü. 100 % Anschluss",
    verlust: "Ertragsverlust",
    verlustZusatz: (a, b) => `${a} MWh · ${b} je Jahr`,
    barwert: "Barwert Verlust 20 J.",
    kleiner: "kleiner als die Ersparnis",
    groesser: "größer als die Ersparnis",
    auffang: (x) => `Der Speicher fängt rechnerisch rund ${x} % der Abregelung auf.`,
    ueberFuss: "Kapazität frei wird oft schneller, wenn Sie eine begrenzte Einspeisung anbieten – etwa über eine flexible Netzanschlussvereinbarung nach § 8a EEG. Ertragsverlust bewertet mit dem EEG-Zuschlag, abgezinst mit 5 %.",
    risiken: "Risiken",
    tipps: "Tipps",
    ziel: { msLeitung: "MS-Leitung", uwMs: "Umspannwerk", hs: "110-kV-Netz" },
    schemaAria: (km, z) => `Skizze: Solarpark, ${km} km Kabeltrasse, Anschluss an ${z}`,
    park: (x) => `Park ${x} MWp`,
  },
  en: {
    ebeneLabel: { msLeitung: "Medium-voltage line (20 kV)", uwMs: "Substation, MV busbar", hs: "High voltage 110 kV" },
    ampelText: {
      gut: "Good starting position – the grid connection is unlikely to hold the project back.",
      pruefen: "Feasible, but costs or capacity are still open – enquire with the grid operator early.",
      kritisch: "The grid connection is the bottleneck – costs or waiting time could call the project into question.",
    },
    ebenen: { auto: ["Automatic", "by capacity"], msLeitung: ["MV line", "loop-in 20 kV"], uwMs: ["Substation", "MV busbar"], hs: ["110 kV", "own substation"] },
    kapazitaeten: { frei: ["Known: available", "information received"], unbekannt: ["Unknown", "not yet requested"], knapp: ["Known: scarce", "expansion needed"] },
    laender: { de: ["Germany"], at: ["Austria"], ch: ["Switzerland"] },
    posten: (p, n) =>
      ({
        station: "Transfer and transformer stations in the park",
        einschleifen: "Loop-in into the MV line",
        kabel: n.ebene === "hs" ? "110 kV cable route" : `20 kV cable route (${n.kabelSysteme} ${n.kabelSysteme > 1 ? "systems" : "system"})`,
        feld: `Switchgear bay${n.kabelSysteme > 1 ? "s" : ""} at the substation (${n.kabelSysteme})`,
        uw: "Own 110/20 kV substation",
        bkz: "Construction cost contribution for the storage system’s grid consumption",
      })[p.id] ?? p.label,
    land: "Country",
    kosten: "Costs",
    jeKwp: "per kWp",
    zeit: "Time",
    monate: (a, b) => `${a}–${b} mths`,
    anlage: "Plant",
    groesse: "Plant size",
    anschluss: "Connection capacity (overbuilding)",
    anschlussFormat: (f, v, mw) => `${f.pct(v)} · ${mw} MW`,
    anschlussHinweis: "Feed-in capacity relative to module capacity – less capacity saves grid costs but costs some yield.",
    speicher: "Storage at the same connection",
    speicherText: "co-location, absorbs peaks",
    speicherLeistung: "Storage power",
    netzbezug: "Storage also charges from the grid",
    netzbezugText: "then a construction cost contribution applies",
    netz: "Grid",
    entfernung: "Distance to the connection point",
    entfernungHinweis: "Route length to the MV line or substation – usually longer than as the crow flies.",
    ebene: "Voltage level",
    kapazitaet: "Available grid capacity",
    cluster: "Clustering with a neighbouring project",
    clusterText: "shared cable route or shared substation",
    sr: (a, b, c, d) => `Grid connection roughly ${a} to ${b}, time frame ${c} to ${d} months.`,
    ihr: "Your grid connection",
    hauptLabel: "Cost of the grid connection (mid-point)",
    spanne: (a, b) => `Range ${a} – ${b}`,
    anlagenkosten: (x) => `${x}% of the plant costs`,
    zeitrahmen: "Time frame",
    abBegehren: "from a complete request",
    anschlussK: "Connection",
    systeme: (n) => `${n} × 20 kV system`,
    erwartet: (mw, l) => `For ${mw} MW, “${l}” would typically be expected.`,
    ihrAnteil: "(your share)",
    fuss: "Rough guidance without guarantee. Only the grid operator’s grid compatibility check and cost estimate are binding.",
    pruefen: "Have your land checked",
    ueberTitel: "Overbuilding: is less connection capacity worthwhile?",
    voll: "You are calculating with full connection capacity. Set the “Connection capacity” slider to 70–80%: grid costs often fall while only a few percent of yield are lost.",
    gespart: "Grid costs saved",
    gg100: "vs. 100% connection",
    verlust: "Yield loss",
    verlustZusatz: (a, b) => `${a} MWh · ${b} per year`,
    barwert: "Present value of loss, 20 yrs",
    kleiner: "smaller than the savings",
    groesser: "larger than the savings",
    auffang: (x) => `The storage absorbs a calculated ${x}% of the curtailment.`,
    ueberFuss: "Capacity often becomes available sooner if you offer limited feed-in – for example via a flexible grid connection agreement under § 8a EEG. Yield loss valued at the EEG award, discounted at 5%.",
    risiken: "Risks",
    tipps: "Tips",
    ziel: { msLeitung: "MV line", uwMs: "Substation", hs: "110 kV grid" },
    schemaAria: (km, z) => `Sketch: solar park, ${km} km cable route, connection to ${z}`,
    park: (x) => `Park ${x} MWp`,
  },
};

export default function NetzanschlussRechner() {
  // Ländermodell: auf /at bzw. /ch Region/Land vorwählen – die Länder-Sperre zeigt dann keine ungeprüften Werte
  const seitenLand = useSeitenLand();
  const t = useTexte(TEXTE);
  const f = useFormate();
  const { fmt, fmtEur } = f;
  const geld = geldMit(f);
  const en = f.sprache === "en";
  const EBENE_LABEL = t.ebeneLabel;
  const [e, setE] = useState(() => landStart(STANDARD, seitenLand));
  const set = (k) => (v) => setE((a) => ({ ...a, [k]: v }));
  useTeilbarerZustand(e, (neu) => setE((a) => ({ ...a, ...neu })), {
    optionen: { land: LAENDER.map((x) => x.id), ebene: EBENEN.map((x) => x.id), kapazitaet: KAPAZITAETEN.map((x) => x.id) },
    grenzen: { mwp: [1, 150], anschlussQuote: [0.5, 1], km: [0.2, 20], speicherMw: [0, 150] },
    pruefen: rechneNetzanschluss,
  });
  const r = useMemo(() => rechneNetzanschluss(e), [e]);
  const u = r.ueberbauung;
  const rt = en ? risikenTippsEn(r.eingabe, r, f) : { risiken: r.risiken, tipps: r.tipps };

  // Länder-Sperre (Paket E): für AT/CH nur die Regionswahl und der Hinweis aus markt.js
  const sperre = r.sperre;
  const regionWahl = (
    <Auswahl legende={t.land} wert={e.land} onChange={set("land")} optionen={opt(LAENDER, t.laender)} />
  );

  return (
    <RechnerRahmen
      mitlaufend
      sperre={sperre}
      eingaben={sperre ? (
        <SperrEingaben>{regionWahl}</SperrEingaben>
      ) : (
        <>
          <MobilKurz
            werte={[
              [t.kosten, geld(r.summe)],
              [t.jeKwp, fmtEur(r.proKwp)],
              [t.zeit, t.monate(r.monate[0], r.monate[1])],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel={t.anlage}>
              {regionWahl}
              <Regler label={t.groesse} wert={e.mwp} min={1} max={150} step={1} einheit="MWp" onChange={set("mwp")} />
              <Regler
                label={t.anschluss}
                wert={e.anschlussQuote * 100}
                min={50}
                max={100}
                step={5}
                format={(v) => t.anschlussFormat(f, v, fmt((e.mwp * v) / 100, 1))}
                minLabel={f.pct(50)}
                maxLabel={f.pct(100)}
                onChange={(v) => set("anschlussQuote")(v / 100)}
                hinweis={t.anschlussHinweis}
              />
              <Schalter icon={BatteryCharging} label={t.speicher} beschreibung={t.speicherText} an={e.speicherMw > 0} onChange={(v) => set("speicherMw")(v ? Math.max(1, Math.round(e.mwp * 0.3)) : 0)}>
                <div className="space-y-4">
                  <Regler label={t.speicherLeistung} wert={e.speicherMw} min={1} max={Math.max(5, e.mwp)} step={1} einheit="MW" onChange={set("speicherMw")} />
                  <Schalter icon={Cable} label={t.netzbezug} beschreibung={t.netzbezugText} an={e.speicherNetzbezug} onChange={set("speicherNetzbezug")} />
                </div>
              </Schalter>
            </Gruppe>
            <Gruppe titel={t.netz}>
              <Regler label={t.entfernung} wert={e.km} min={0.2} max={20} step={0.1} stellen={1} format={(v) => `${fmt(v, 1)} km`} onChange={set("km")} hinweis={t.entfernungHinweis} />
              <Auswahl legende={t.ebene} wert={e.ebene} onChange={set("ebene")} optionen={opt(EBENEN, t.ebenen)} spalten={2} klein />
              <Auswahl legende={t.kapazitaet} wert={e.kapazitaet} onChange={set("kapazitaet")} optionen={opt(KAPAZITAETEN, t.kapazitaeten)} klein />
              <Schalter icon={Users} label={t.cluster} beschreibung={t.clusterText} an={e.cluster} onChange={set("cluster")} />
            </Gruppe>
          </div>
        </>
      )}
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">{t.sr(geld(r.spanne.min), geld(r.spanne.max), r.monate[0], r.monate[1])}</p>
          <ErgebnisKopf titel={t.ihr} plakette={EBENE_LABEL[r.ebene]} />

          <Hauptzahl
            className="mt-5"
            icon={Coins}
            label={t.hauptLabel}
            zusatz={t.spanne(geld(r.spanne.min), geld(r.spanne.max))}
            rechts={<AmpelMarke ampel={r.ampel} className={r.ampel === "kritisch" ? "bg-white/10 ring-white/25" : undefined} />}
          >
            <Zahl wert={r.summe} format={geld} delta="dunkel" einlauf />
          </Hauptzahl>
          <p
            className={cn(
              "animate-ov-einblenden mt-3 rounded-2xl px-4 py-3 text-[14px] leading-relaxed text-ink-800 ring-1",
              r.ampel === "gut" ? "bg-success-50 ring-success-200" : r.ampel === "kritisch" ? "bg-ink-50 ring-ink-300" : "bg-warn-50 ring-warn-200"
            )}
            key={r.ampel}
          >
            {t.ampelText[r.ampel]}
          </p>

          <Belege>
            <Kennzahl ton="akzent" icon={Percent} label={t.jeKwp} zusatz={t.anlagenkosten(fmt(r.anteil * 100))}>
              <Zahl wert={r.proKwp} format={(v) => fmtEur(v)} delta="hell" />
            </Kennzahl>
            <Kennzahl icon={CalendarClock} label={t.zeitrahmen} zusatz={t.abBegehren}>
              {t.monate(r.monate[0], r.monate[1])}
            </Kennzahl>
            <Kennzahl icon={Network} label={t.anschlussK} zusatz={t.systeme(r.kabelSysteme)}>
              <Zahl wert={r.anschlussMw} stellen={1} suffix=" MW" />
            </Kennzahl>
          </Belege>

          {e.ebene !== "auto" && e.ebene !== r.vorschlag && (
            <p className="mt-3 text-[13px] text-ink-500">{t.erwartet(fmt(r.anschlussMw, 1), EBENE_LABEL[r.vorschlag])}</p>
          )}

          <Schema r={r} km={e.km} />

          <ul className="mt-4 space-y-2">
            {r.posten.map((p) => (
              <li key={p.id} className="rounded-2xl bg-ink-50 px-4 py-3">
                <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                  <span className="min-w-0 text-ink-700">
                    {t.posten(p, r)}
                    {p.geteilt && <span className="ml-1.5 text-[12px] text-ov-700">{t.ihrAnteil}</span>}
                  </span>
                  <span className="ov-num shrink-0 font-semibold text-ink-900">{geld(p.eur)}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <div className="ov-fortschritt h-full w-full rounded-full bg-navy-500" style={{ transform: `scaleX(${r.summe > 0 ? Math.min(1, p.eur / r.summe) : 0})` }} />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-[13px] leading-relaxed text-ink-500">{t.fuss}</p>
            <Button href={pfad("/flaechencheck")} size="lg" pfeil className="shrink-0">
              {t.pruefen}
            </Button>
          </div>
        </>
      }
      unten={
        <div className="space-y-6">
          <div className="rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 md:p-6">
            <h3 className="font-display text-[19px] font-extrabold tracking-tight text-ink-900">{t.ueberTitel}</h3>
            {e.anschlussQuote >= 1 ? (
              <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
                {t.voll}
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Kennzahl icon={Coins} label={t.gespart} zusatz={t.gg100}>
                  {geld(u.einsparung)}
                </Kennzahl>
                <Kennzahl icon={AlertTriangle} label={t.verlust} zusatz={t.verlustZusatz(fmt(u.verlustKwh / 1000), fmtEur(u.verlustEurJahr))}>
                  {f.fmtPct(u.verlust, 1)}
                </Kennzahl>
                <Kennzahl ton={u.lohnt ? "akzent" : "hell"} icon={Percent} label={t.barwert} zusatz={u.lohnt ? t.kleiner : t.groesser}>
                  {geld(u.verlustBarwert)}
                </Kennzahl>
              </div>
            )}
            {u.speicherAuffang > 0 && (
              <p className="mt-3 text-[13px] text-ink-500">{t.auffang(fmt(u.speicherAuffang * 100))}</p>
            )}
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
              {t.ueberFuss}
            </p>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-2">
            <section aria-labelledby="na-risiken" className="rounded-3xl ring-1 ring-ink-200/70 p-5 md:p-6">
              <h3 id="na-risiken" className="flex items-center gap-2.5 font-display text-[19px] font-extrabold tracking-tight text-ink-900">
                <AlertTriangle aria-hidden="true" className="h-5 w-5 text-warn-600" /> {t.risiken}
              </h3>
              <ul className="mt-4 space-y-3">
                {rt.risiken.map((x) => (
                  <li key={x} className="flex gap-3 text-[14px] leading-relaxed text-ink-700">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sun-500" aria-hidden="true" />
                    {x}
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="na-tipps" className="rounded-3xl bg-navy-950 p-5 text-white md:p-6">
              <h3 id="na-tipps" className="flex items-center gap-2.5 font-display text-[19px] font-extrabold tracking-tight">
                <Lightbulb aria-hidden="true" className="h-5 w-5 text-sun-400" /> {t.tipps}
              </h3>
              <ol className="mt-4 space-y-3">
                {rt.tipps.map((x, i) => (
                  <li key={x} className="flex gap-3 text-[14px] leading-relaxed text-white/85">
                    <span className="ov-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[12px] font-bold text-ov-300">{i + 1}</span>
                    <span className="min-w-0">{x}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      }
    />
  );
}

/** Schematische Skizze: Park → Trasse → Anschlusspunkt */
function Schema({ r, km }) {
  const t = useTexte(TEXTE);
  const { fmt } = useFormate();
  const ziel = t.ziel[r.ebene];
  return (
    <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-ink-200/70">
      <svg viewBox="0 0 600 120" width="100%" role="img" aria-label={t.schemaAria(fmt(km, 1), ziel)} className="block bg-sand-50">
        {/* Park */}
        <g transform="translate(24 30)">
          {[0, 1, 2].map((z) => (
            <g key={z} transform={`translate(0 ${z * 20})`}>
              {[0, 1, 2, 3].map((s) => (
                <rect key={s} x={s * 26} y={0} width={22} height={12} rx={2} fill={FARBEN.navyDunkel} opacity={0.85} transform="skewX(-12)" />
              ))}
            </g>
          ))}
          <text x={46} y={82} textAnchor="middle" className="fill-ink-600 text-[12px] font-semibold">
            {t.park(fmt(r.eingabe.mwp))}
          </text>
        </g>
        {/* Station */}
        <rect x={140} y={44} width={30} height={30} rx={5} fill={FARBEN.gruen} />
        <path d="M150 52 l6 0 -4 7 6 0 -9 10 3 -8 -5 0 z" fill="#fff" />
        {/* Trasse */}
        <line x1={172} x2={440} y1={59} y2={59} stroke={r.ebene === "hs" ? FARBEN.navy : FARBEN.gruen} strokeWidth={r.kabelSysteme > 1 ? 5 : 3} strokeDasharray="10 6" />
        <text x={306} y={48} textAnchor="middle" className="fill-ink-700 text-[12px] font-semibold">
          {fmt(km, 1)} km · {r.ebene === "hs" ? "110 kV" : `${r.kabelSysteme} × 20 kV`}
        </text>
        {/* Ziel */}
        <g transform="translate(446 30)">
          {r.ebene === "msLeitung" ? (
            <g>
              <line x1={30} x2={30} y1={0} y2={60} stroke={FARBEN.ink} strokeWidth={3} />
              <line x1={10} x2={50} y1={12} y2={12} stroke={FARBEN.ink} strokeWidth={3} />
              <line x1={14} x2={46} y1={26} y2={26} stroke={FARBEN.ink} strokeWidth={2} />
            </g>
          ) : (
            <g>
              <rect x={0} y={8} width={70} height={48} rx={6} fill="#fff" stroke={FARBEN.ink} strokeWidth={2} />
              <circle cx={26} cy={32} r={11} fill="none" stroke={FARBEN.ink} strokeWidth={2} />
              <circle cx={40} cy={32} r={11} fill="none" stroke={FARBEN.ink} strokeWidth={2} />
            </g>
          )}
          <text x={35} y={82} textAnchor="middle" className="fill-ink-600 text-[12px] font-semibold">
            {ziel}
          </text>
        </g>
      </svg>
    </div>
  );
}
