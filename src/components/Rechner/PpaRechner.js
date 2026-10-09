"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Factory, Leaf, PiggyBank, ShieldCheck, Sun, TrendingDown } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Zahl } from "./bausteine";
import { useTeilbarerZustand } from "./kontext";
import ErgebnisAnfrage from "./ErgebnisAnfrage";
import { Ansicht, ErgebnisKopf, Hinweis, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { BalkenJahre, DiagrammKarte, FARBEN, Linien } from "./ToolTeile";
import { LASTPROFILE, STANDARD, STRUKTUREN, SZENARIEN, rechnePpa } from "@/lib/rechner/ppa";
import { STAND, STROM } from "@/lib/invest/markt";
import { pfad } from "@/lib/land";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { datumText } from "@/lib/sprache/format";
import { LASTPROFILE_EN } from "@/lib/sprache/rechnerBegriffe";

const P = STROM.ppa;
const tsdMit = (f) => (v) => `${v < 0 ? "−" : ""}${f.tsd(Math.abs(v), Math.abs(v) >= 1e5 ? 0 : 1)}`;

// Sprachmodell: Texte des Rechners
const TEXTE = {
  de: {
    profile: {},
    strukturen: {},
    szenarien: {},
    ersparnisJ1: "Ersparnis J. 1",
    jahreSeitw: (n) => `${n} J. (seitw.)`,
    abgesichert: "Abgesichert",
    pct: (f, v) => `${f.fmt(v)} %`,
    unternehmen: "Ihr Unternehmen",
    verbrauch: "Jahresverbrauch",
    lastprofil: "Lastprofil",
    sonnenstunden: (f, v) => `${f.fmt(v)} % in Sonnenstunden`,
    preis: "Heutiger Energiepreis",
    ct: (f, v) => `${f.fmt(v, 1)} ct/kWh`,
    preisHinweis: "Nur Beschaffung und Vertrieb, ohne Netzentgelte, Umlagen und Stromsteuer – diese bleiben mit PPA gleich.",
    angebot: "PPA-Angebot",
    lieferstruktur: "Lieferstruktur",
    ppaPreis: "PPA-Preis",
    ppaHinweis: (a, b, s) => `Solar pay-as-produced, 10 Jahre: grob ${a}–${b} ct/kWh (Stand ${s}, eigene Einschätzung).`,
    struktur: "Strukturierungsaufschlag",
    strukturHinweis: (a, b) => `Für Formung in Baseload/Lastprofil, Mengen- und Ausgleichsrisiko: grob ${a}–${b} ct/kWh.`,
    menge: "PPA-Menge",
    mengeFormat: (f, v, mwh) => `${f.fmt(v)} % · ${mwh} MWh`,
    mengeHinweis: "Anteil Ihres Jahresverbrauchs, den das PPA liefert.",
    laufzeit: "Laufzeit",
    jahreEinheit: "Jahre",
    sr: (a, n, b, c, d) => `Ersparnis im ersten Jahr ${a} Euro. Über ${n} Jahre bei Preisverfall ${b}, seitwärts ${c}, bei Anstieg ${d} Euro.`,
    imVergleich: "Ihr PPA im Vergleich",
    plakette: (s, n) => `${s} · ${n} Jahre`,
    ersparnis1: "Ersparnis Jahr 1",
    heutigesNiveau: "bei heutigem Preisniveau",
    seitwaerts: (n) => `${n} Jahre, Markt seitwärts`,
    preisAbgesichert: "Preis abgesichert",
    schwankung: "Anteil der Kostenschwankung",
    pctSuffix: " %",
    deltaPkt: (f, d) => `${f.fmt(d)} %-Pkt.`,
    lohnt: "Lohnt bis Marktpreis",
    lohntZusatz: "Energiepreis, ab dem das PPA teurer ist",
    ctSuffix: " ct",
    co2: "CO₂ vermieden",
    co2Zusatz: "je Jahr, bei neuer Anlage",
    caption: "Ersparnis über die Laufzeit nach Marktpreis-Szenario",
    szenarioKopf: "Szenario Börsenpreis",
    ersparnisKopf: (n) => `Ersparnis ${n} J.`,
    anteil: "Anteil",
    ueberschuss: (a, b, c) => `${a} % der PPA-Menge fallen an, wenn Sie den Strom nicht brauchen, und werden zum Solar-Marktwert (rund ${b} ct/kWh) weiterverkauft. Effektiv zahlen Sie ${c} ct je selbst genutzter kWh.`,
    negativ: (a) => `2025 fiel rund ${a} % der Solarerzeugung in Stunden mit negativen Preisen. Klären Sie, ob und wie viel Sie in diesen Stunden abnehmen und bezahlen müssen.`,
    teurer: "Beim heutigen Preisniveau ist das PPA teurer als Ihre Beschaffung – es lohnt sich dann nur als Absicherung gegen steigende Preise oder für Ihre CO₂-Bilanz.",
    satzPlus: "Ersparnis im ersten Jahr – mit echten Angeboten gegenrechnen",
    satzMinus: "Absicherung und Angebote mit Ihren Lastdaten gegenrechnen",
    menge2: (f, v) => (v >= 1000 ? `${f.fmt(v / 1000, 1)} GWh` : `${f.fmt(v)} MWh`),
    nachricht: (v, p, ct, n, a, b) => `Aus dem PPA-Rechner: Jahresverbrauch ${v}, Lastprofil ${p}, heutiger Energiepreis ${ct} ct/kWh, PPA-Laufzeit ${n} Jahre. Ergebnis (Modellrechnung): Ersparnis Jahr 1 ${a}, über ${n} Jahre (Markt seitwärts) ${b}. Bitte mit mir über PPA und Reststrom-Pool sprechen.`,
    pool: "Reststrom-Pool",
    anfrageHinweis: "Modellrechnung ohne Gewähr, netto. Netzentgelte, Umlagen und Steuern sind in beiden Fällen gleich und daher nicht enthalten.",
    kumTitel: "Kumulierte Ersparnis je Szenario",
    jahrTitel: (s) => `Energiekosten je Jahr · ${s}`,
    kumZusatz: "Positiv: das PPA ist günstiger als die heutige Beschaffung",
    jahrZusatz: "Mit PPA gegenüber Beschaffung wie heute",
    szenario: "Szenario",
    ansichtLabel: "Diagrammansicht",
    kumuliert: "Kumuliert",
    jeJahr: "Je Jahr",
    linienAria: (n, x) => `Kumulierte Ersparnis über ${n} Jahre: ${x}.`,
    euro: (v) => `${v} Euro`,
    start: "Start",
    nachJahr: (i) => `Nach Jahr ${i}`,
    null: "0 €",
    mitPpa: "Kosten mit PPA",
    ersparnisHeute: "Ersparnis ggü. heute",
    balkenAria: (s) => `Energiekosten je Jahr mit PPA im Szenario ${s}.`,
    jahrMarkt: (j, m) => `Jahr ${j} · Markt ${m} %`,
    ohne: "Ohne PPA",
    mit: "Mit PPA",
    differenz: "Differenz",
    fuss: "Szenarien: Der Marktpreis bewegt sich über vier Jahre linear zum Zielniveau und bleibt dann konstant. Das PPA bleibt über die Laufzeit fest.",
  },
  en: {
    profile: LASTPROFILE_EN,
    strukturen: { pap: ["Pay-as-produced", "solar profile, as generated"], base: ["Baseload/profile", "shaped, with surcharge"] },
    szenarien: { fall: ["Price decline", "−30% in 4 years"], seit: ["Sideways", "level holds"], anstieg: ["Increase", "+30% in 4 years"] },
    ersparnisJ1: "Savings yr 1",
    jahreSeitw: (n) => `${n} yrs (sideways)`,
    abgesichert: "Hedged",
    pct: (f, v) => f.pct(v),
    unternehmen: "Your business",
    verbrauch: "Annual consumption",
    lastprofil: "Load profile",
    sonnenstunden: (f, v) => `${f.pct(v)} in sunshine hours`,
    preis: "Current energy price",
    ct: (f, v) => `${f.fmt(v, 1)} ct/kWh`,
    preisHinweis: "Procurement and sales only, excluding grid fees, levies and electricity tax – these stay the same with a PPA.",
    angebot: "PPA offer",
    lieferstruktur: "Delivery structure",
    ppaPreis: "PPA price",
    ppaHinweis: (a, b, s) => `Solar pay-as-produced, 10 years: roughly ${a}–${b} ct/kWh (as of ${s}, our own estimate).`,
    struktur: "Shaping surcharge",
    strukturHinweis: (a, b) => `For shaping into baseload/load profile, volume and balancing risk: roughly ${a}–${b} ct/kWh.`,
    menge: "PPA volume",
    mengeFormat: (f, v, mwh) => `${f.pct(v)} · ${mwh} MWh`,
    mengeHinweis: "Share of your annual consumption supplied by the PPA.",
    laufzeit: "Term",
    jahreEinheit: "years",
    sr: (a, n, b, c, d) => `Savings in the first year ${a} euros. Over ${n} years with a price decline ${b}, sideways ${c}, with an increase ${d} euros.`,
    imVergleich: "Your PPA compared",
    plakette: (s, n) => `${s} · ${n} years`,
    ersparnis1: "Savings, year 1",
    heutigesNiveau: "at today’s price level",
    seitwaerts: (n) => `${n} years, market sideways`,
    preisAbgesichert: "Price hedged",
    schwankung: "share of cost fluctuation",
    pctSuffix: "%",
    deltaPkt: (f, d) => `${f.fmt(d)} pp`,
    lohnt: "Pays off up to market price",
    lohntZusatz: "energy price above which the PPA is more expensive",
    ctSuffix: " ct",
    co2: "CO₂ avoided",
    co2Zusatz: "per year, with a new plant",
    caption: "Savings over the term by market price scenario",
    szenarioKopf: "Exchange price scenario",
    ersparnisKopf: (n) => `Savings ${n} yrs`,
    anteil: "Share",
    ueberschuss: (a, b, c) => `${a}% of the PPA volume arises when you do not need the power and is resold at the solar market value (around ${b} ct/kWh). Effectively you pay ${c} ct per kWh you use yourself.`,
    negativ: (a) => `In 2025, around ${a}% of solar generation fell into hours with negative prices. Clarify whether and how much you have to take and pay for during these hours.`,
    teurer: "At today’s price level, the PPA is more expensive than your procurement – it then only pays off as a hedge against rising prices or for your carbon footprint.",
    satzPlus: "savings in the first year – check against real offers",
    satzMinus: "Check hedging and offers against your load data",
    menge2: (f, v) => (v >= 1000 ? `${f.fmt(v / 1000, 1)} GWh` : `${f.fmt(v)} MWh`),
    nachricht: (v, p, ct, n, a, b) => `From the PPA calculator: annual consumption ${v}, load profile ${p}, current energy price ${ct} ct/kWh, PPA term ${n} years. Result (model calculation): savings in year 1 ${a}, over ${n} years (market sideways) ${b}. Please discuss a PPA and the residual power pool with me.`,
    pool: "Residual power pool",
    anfrageHinweis: "Model calculation without guarantee, net. Grid fees, levies and taxes are the same in both cases and are therefore not included.",
    kumTitel: "Cumulative savings by scenario",
    jahrTitel: (s) => `Energy costs per year · ${s}`,
    kumZusatz: "Positive: the PPA is cheaper than today’s procurement",
    jahrZusatz: "With PPA compared with procurement as today",
    szenario: "Scenario",
    ansichtLabel: "Chart view",
    kumuliert: "Cumulative",
    jeJahr: "Per year",
    linienAria: (n, x) => `Cumulative savings over ${n} years: ${x}.`,
    euro: (v) => `${v} euros`,
    start: "Start",
    nachJahr: (i) => `After year ${i}`,
    null: "€0",
    mitPpa: "Costs with PPA",
    ersparnisHeute: "Savings vs. today",
    balkenAria: (s) => `Energy costs per year with PPA in the ${s} scenario.`,
    jahrMarkt: (j, m) => `Year ${j} · market ${m}%`,
    ohne: "Without PPA",
    mit: "With PPA",
    differenz: "Difference",
    fuss: "Scenarios: the market price moves linearly to the target level over four years and then stays constant. The PPA remains fixed over the term.",
  },
};
const mitTab = (liste, tab) => liste.map((x) => ({ ...x, label: tab[x.id]?.[0] ?? x.label, sub: tab[x.id]?.[1] ?? x.sub }));
const SZ_FARBE = { fall: FARBEN.sun, seit: FARBEN.navy, anstieg: FARBEN.gruen };

export default function PpaRechner() {
  const t = useTexte(TEXTE);
  const f = useFormate();
  const { fmt, fmtEur } = f;
  const tsd = tsdMit(f);
  const LP = mitTab(LASTPROFILE, t.profile);
  const ST = mitTab(STRUKTUREN, t.strukturen);
  const SZ = mitTab(SZENARIEN, t.szenarien);
  const szLabel = (s) => t.szenarien[s.id]?.[0] ?? s.label;
  const szSub = (s) => t.szenarien[s.id]?.[1] ?? s.sub;
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
              [t.ersparnisJ1, tsd(r.ersparnisJahr1)],
              [t.jahreSeitw(e.laufzeit), tsd(r.szenarien[1].summe)],
              [t.abgesichert, t.pct(f, r.absicherung * 100)],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel={t.unternehmen}>
              <Regler label={t.verbrauch} wert={e.verbrauchMwh} min={100} max={50000} step={100} format={(v) => t.menge2(f, v)} onChange={set("verbrauchMwh")} />
              <Auswahl legende={t.lastprofil} wert={e.profil} onChange={set("profil")} spalten={2} klein optionen={LP.map((p) => ({ id: p.id, label: p.label, sub: t.sonnenstunden(f, p.tag * 100) }))} />
              <Regler
                label={t.preis}
                wert={e.preisCt}
                min={5}
                max={25}
                step={0.1}
                stellen={1}
                format={(v) => t.ct(f, v)}
                onChange={set("preisCt")}
                hinweis={t.preisHinweis}
              />
            </Gruppe>

            <Gruppe titel={t.angebot}>
              <Auswahl legende={t.lieferstruktur} wert={e.struktur} onChange={set("struktur")} optionen={ST} />
              <Regler
                label={t.ppaPreis}
                wert={e.ppaCt}
                min={3}
                max={12}
                step={0.1}
                stellen={1}
                format={(v) => t.ct(f, v)}
                onChange={set("ppaCt")}
                hinweis={t.ppaHinweis(fmt(P.pppCt.min, 1), fmt(P.pppCt.max, 1), datumText(STAND, f.sprache))}
              />
              {e.struktur === "base" && (
                <Regler
                  label={t.struktur}
                  wert={e.strukturCt}
                  min={0.5}
                  max={4}
                  step={0.1}
                  stellen={1}
                  format={(v) => t.ct(f, v)}
                  onChange={set("strukturCt")}
                  hinweis={t.strukturHinweis(fmt(P.strukturierungCt.min, 1), fmt(P.strukturierungCt.max, 1))}
                />
              )}
              <Regler
                label={t.menge}
                wert={e.anteil * 100}
                min={5}
                max={e.struktur === "base" ? 100 : 80}
                step={5}
                format={(v) => t.mengeFormat(f, v, fmt((e.verbrauchMwh * v) / 100))}
                minLabel={t.pct(f, 5)}
                maxLabel={t.pct(f, e.struktur === "base" ? 100 : 80)}
                onChange={(v) => set("anteil")(v / 100)}
                hinweis={t.mengeHinweis}
              />
              <Regler label={t.laufzeit} wert={e.laufzeit} min={3} max={20} step={1} einheit={t.jahreEinheit} onChange={set("laufzeit")} />
            </Gruppe>
          </div>
        </>
      }
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {t.sr(Math.round(r.ersparnisJahr1), e.laufzeit, Math.round(r.szenarien[0].summe), Math.round(r.szenarien[1].summe), Math.round(r.szenarien[2].summe))}
          </p>
          <ErgebnisKopf titel={t.imVergleich} plakette={t.plakette(ST.find((s) => s.id === e.struktur).label, e.laufzeit)} />

          <Hauptzahl
            className="mt-5"
            icon={PiggyBank}
            label={t.ersparnis1}
            zusatz={t.heutigesNiveau}
            rechts={
              <div className="sm:text-right">
                <p className="text-[12.5px] text-white/75">{t.seitwaerts(e.laufzeit)}</p>
                <p className="ov-kpi mt-0.5 text-white">
                  <Zahl wert={r.szenarien[1].summe} format={tsd} />
                </p>
              </div>
            }
          >
            <Zahl wert={r.ersparnisJahr1} format={tsd} delta="dunkel" einlauf className={r.ersparnisJahr1 < 0 ? "text-sun-300" : undefined} />
          </Hauptzahl>
          <Belege>
            <Kennzahl ton="akzent" icon={ShieldCheck} label={t.preisAbgesichert} zusatz={t.schwankung}>
              <Zahl wert={r.absicherung * 100} suffix={t.pctSuffix} delta="hell" deltaFormat={(d) => t.deltaPkt(f, d)} />
            </Kennzahl>
            <Kennzahl icon={TrendingDown} label={t.lohnt} zusatz={t.lohntZusatz}>
              {r.breakEvenCt != null ? <Zahl wert={r.breakEvenCt} stellen={1} suffix={t.ctSuffix} delta="hell" /> : "–"}
            </Kennzahl>
            <Kennzahl icon={Leaf} label={t.co2} zusatz={t.co2Zusatz}>
              <Zahl wert={r.co2T} suffix=" t" delta="hell" />
            </Kennzahl>
          </Belege>

          <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-ink-200/70">
            <table className="w-full text-[13.5px]">
              <caption className="sr-only">{t.caption}</caption>
              <thead className="bg-sand-50 text-[11.5px] uppercase tracking-[0.1em] text-ink-500">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">{t.szenarioKopf}</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">{t.ersparnisKopf(e.laufzeit)}</th>
                  <th scope="col" className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">{t.anteil}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {r.szenarien.map((s) => (
                  <tr key={s.id} className={cn(s.id === szenario && "bg-ov-50/60")}>
                    <th scope="row" className="px-4 py-3 text-left font-semibold text-ink-900">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: SZ_FARBE[s.id] }} aria-hidden="true" />
                        {szLabel(s)} <span className="hidden font-normal text-ink-500 sm:inline">· {szSub(s)}</span>
                      </span>
                    </th>
                    <td className={cn("ov-num px-4 py-3 text-right font-bold", s.summe < 0 ? "text-sun-700" : "text-ink-900")}>
                      <Zahl wert={s.summe} format={tsd} />
                    </td>
                    <td className="ov-num hidden px-4 py-3 text-right text-ink-600 sm:table-cell">{f.fmtPct(s.anteil, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-2.5">
            {e.struktur === "pap" && h.ueberschuss > 0 && (
              <Hinweis ton="warnung" icon={Sun}>
                {t.ueberschuss(fmt(r.ueberschussAnteil * 100), fmt(h.wertUeberschussCt, 1), fmt(r.effektivCt, 1))}
              </Hinweis>
            )}
            {e.struktur === "pap" && (
              <Hinweis ton="neutral" icon={AlertTriangle}>
                {t.negativ(fmt(P.negativAnteilSolar * 100))}
              </Hinweis>
            )}
            {r.ersparnisJahr1 < 0 && (
              <Hinweis ton="warnung" icon={AlertTriangle}>
                {t.teurer}
              </Hinweis>
            )}
          </div>

          <ErgebnisAnfrage
            typ="reststrom"
            href="/kontakt?anliegen=reststrom#formular"
            kennzahl={r.ersparnisJahr1 > 0 ? <Zahl wert={r.ersparnisJahr1} format={tsd} /> : null}
            satz={r.ersparnisJahr1 > 0 ? t.satzPlus : t.satzMinus}
            signal={`${Math.round(r.ersparnisJahr1)}|${Math.round(r.szenarien[1].summe)}`}
            nachricht={t.nachricht(t.menge2(f, e.verbrauchMwh), LP.find((x) => x.id === e.profil)?.label || e.profil, fmt(e.preisCt, 1), e.laufzeit, tsd(r.ersparnisJahr1), tsd(r.szenarien[1].summe))}
            sekundaer={[{ href: pfad("/reststrom"), label: t.pool }]}
            hinweis={t.anfrageHinweis}
          />
        </>
      }
      unten={
        <DiagrammKarte
          titel={ansicht === "kumuliert" ? t.kumTitel : t.jahrTitel(szLabel(aktiv))}
          zusatz={ansicht === "kumuliert" ? t.kumZusatz : t.jahrZusatz}
          rechts={
            <div className="flex flex-wrap gap-2">
              {ansicht === "jahr" && (
                <Ansicht name="ppa-szenario" label={t.szenario} wert={szenario} onChange={setSzenario} optionen={SZ.map((s) => ({ id: s.id, label: s.label }))} />
              )}
              <Ansicht
                name="ppa-ansicht"
                label={t.ansichtLabel}
                wert={ansicht}
                onChange={setAnsicht}
                optionen={[
                  { id: "kumuliert", label: t.kumuliert },
                  { id: "jahr", label: t.jeJahr },
                ]}
              />
            </div>
          }
        >
          {ansicht === "kumuliert" ? (
            <Linien
              xLabels={["0", ...r.szenarien[0].jahre.map((j) => String(j.jahr))]}
              serien={r.szenarien.map((s) => ({ key: s.id, label: szLabel(s), farbe: SZ_FARBE[s.id], werte: [0, ...s.jahre.map((j) => j.kum)], dick: s.id === "seit" }))}
              ariaLabel={t.linienAria(e.laufzeit, r.szenarien.map((s) => `${szLabel(s)} ${t.euro(Math.round(s.summe))}`).join(", "))}
              tooltip={(i) => (
                <>
                  <p className="font-semibold">{i === 0 ? t.start : t.nachJahr(i)}</p>
                  {r.szenarien.map((s) => (
                    <p key={s.id} className="text-white/70">
                      {szLabel(s)} <span className="ov-num font-semibold text-white">{i === 0 ? t.null : fmtEur(s.jahre[i - 1].kum)}</span>
                    </p>
                  ))}
                </>
              )}
            />
          ) : (
            <BalkenJahre
              zeilen={aktiv.jahre.map((j) => ({ label: String(j.jahr), werte: { mit: j.mit, diff: Math.max(0, j.ohne - j.mit) } }))}
              serien={[
                { key: "mit", label: t.mitPpa, farbe: FARBEN.navy },
                { key: "diff", label: t.ersparnisHeute, farbe: FARBEN.gruen },
              ]}
              ariaLabel={t.balkenAria(szLabel(aktiv))}
              tooltip={(z, i) => (
                <>
                  <p className="font-semibold">{t.jahrMarkt(aktiv.jahre[i].jahr, fmt(aktiv.jahre[i].idx * 100))}</p>
                  <p className="text-white/70">
                    {t.ohne} <span className="ov-num font-semibold text-white">{fmtEur(aktiv.jahre[i].ohne)}</span>
                  </p>
                  <p className="text-white/70">
                    {t.mit} <span className="ov-num font-semibold text-white">{fmtEur(aktiv.jahre[i].mit)}</span>
                  </p>
                  <p className="text-white/70">
                    {t.differenz} <span className="ov-num font-semibold text-ov-300">{fmtEur(aktiv.jahre[i].ersparnis)}</span>
                  </p>
                </>
              )}
            />
          )}
          <p className="flex items-start gap-2 px-5 pb-5 text-[12.5px] leading-relaxed text-ink-500 md:px-6">
            <Factory aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
            {t.fuss}
          </p>
        </DiagrammKarte>
      }
    />
  );
}
