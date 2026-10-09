"use client";

import { SperrEingaben } from "@/components/Rechner/LaenderSperre";
import { useMemo, useState } from "react";
import { Banknote, Gauge, Info, Sprout, Sun, Trophy, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import ZumFlaechencheck from "@/components/Flaeche/Seite/ZumFlaechencheck";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Zahl } from "@/components/Rechner/bausteine";
import { useTeilbarerZustand } from "@/components/Rechner/kontext";
import { ErgebnisKopf, MobilKurz, RechnerRahmen } from "@/components/Rechner/InvestTeile";
import { WEGE } from "./wege";
import AgriBild from "./AgriBild";
import { AGRI, ERLOESE, PACHT, REGIONEN } from "@/lib/invest/markt";
import { SYSTEME, agriVergleich, kulturById, systemPasst } from "@/lib/rechner/agriPv";
import { REGION_KURZ } from "@/lib/rechner/pacht";
import { pfad } from "@/lib/land";
import { useSeitenLand } from "@/components/Land/LandKontext";
import { landStart } from "@/components/Land/useLand";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { regionEn } from "@/lib/sprache/begriffe";

const betragMit = (f, en) => (v) => {
  const a = Math.abs(v);
  const s = v < 0 ? "−" : "";
  if (en) return a >= 1e6 ? `${s}€${f.fmt(a / 1e6, 2)}m` : `${s}€${f.fmt(Math.round(a / 1000))}k`;
  return a >= 1e6 ? `${s}${f.fmt(a / 1e6, 2)} Mio. €` : `${s}${f.fmt(Math.round(a / 1000))} Tsd. €`;
};

const WEG_META = {
  pacht: { weg: WEGE.find((w) => w.id === "investor") },
  eigen: { weg: WEGE.find((w) => w.id === "eigen") },
  genossenschaft: { weg: WEGE.find((w) => w.id === "genossenschaft") },
};

// Sprachmodell: Texte des Rechners (Zahlen im Format der Sprache über useFormate)
const TEXTE = {
  de: {
    wege: {
      pacht: ["Verpachten", "Investor baut, Sie ernten weiter"],
      eigen: ["Selbst investieren", "Ihre Anlage, wir bauen & vermarkten"],
      genossenschaft: ["Genossenschaft", "Pacht + Anteil als Mitglied"],
    },
    systeme: { vertikal: ["Vertikal, bifazial", "Kategorie II"], hoch: ["Hoch aufgeständert", "Kategorie I"] },
    kulturen: { acker: ["Ackerbau", "Getreide, Raps, Mais"], gruenland: ["Grünland", "Mahd, Futterbau"], weide: ["Weide", "Schafe, Rinder, Geflügel"], sonder: ["Obst & Beeren", "Sonderkultur"] },
    risiko: { gering: "gering", mittel: "mittel", "höher": "höher" },
    region: "Region",
    regionLabel: (id, l) => l,
    leistung: "Leistung",
    pachtJahr: "Pacht/Jahr",
    tsdKurz: (f, v) => `${f.fmt(Math.round(v / 1000))} Tsd. €`,
    irrEigen: "IRR eigen",
    flaecheSystem: "Fläche & System",
    flaeche: "Fläche",
    privileg: (f, ha) => `Bis ${f.fmt(ha, 1)} ha hofnah ggf. ohne Bebauungsplan (§ 35 BauGB)`,
    groesser: "Größere Anlagen brauchen in der Regel einen Bebauungsplan",
    kultur: "Kultur",
    system: "System",
    unueblich: "für Kultur unüblich",
    vermarktungTitel: "Vermarktung & Beteiligung",
    stromvermarktung: "Stromvermarktung",
    eeg: "EEG-Zuschlag",
    landPpa: (land, f, ct) => `In ${land === "AT" ? "Österreich" : "der Schweiz"} rechnen wir mit einem Stromliefervertrag (PPA) von ${f.fmt(ct, 1)} ct/kWh; Förderungen nach ${land === "AT" ? "EAG" : "Einmalvergütung"} prüfen wir im Einzelfall.`,
    anteil: "Ihr Anteil an der Anlage (Genossenschaft)",
    einlage: (x) => `Einlage ≈ ${x}`,
    landwirtschaft: "Landwirtschaft",
    dbOhne: "Deckungsbeitrag ohne Anlage",
    proHa: (f, v) => `${f.fmt(v)} €/ha`,
    dbUnter: (f, p) => `Unter dem System ca. ${f.fmt(p)} % davon (inkl. Flächenverlust)`,
    sr: (mwp, a, b, c, n) => `Anlage ${mwp} Megawatt Peak. Verpachten ${a} Euro, Eigeninvestition ${b} Euro, Genossenschaft ${c} Euro über ${n} Jahre.`,
    dreiWege: "Drei Wege im Vergleich",
    plakette: (n) => `${n} Jahre · vor Steuern`,
    hoechste: "Höchste Summe",
    hoechsteVon: (x) => `Höchste Summe: ${x}`,
    hauptZusatz: (n) => `${n} Jahre inkl. Landwirtschaft, nominal`,
    tsdFormat: (f, v) => `${f.fmt(v)} Tsd. €`,
    stromJahr: "Strom pro Jahr",
    investition: "Investition",
    erloes: "Erlös",
    sonderHinweis: "Bei Obst und Beeren ersetzt das Moduldach oft Hagelnetz oder Folientunnel und sichert Qualität – diese Einsparung ist hier nicht eingerechnet und kann die Rechnung deutlich verbessern.",
    gewechselt: (k) => `Für ${k} rechnen wir mit hoch aufgeständerter Agri-PV (Kategorie I).`,
    weg: "Weg",
    summeJahre: (n) => `Summe ${n} Jahre inkl. Landwirtschaft`,
    eigeneInvestition: "Eigene Investition",
    keine: "keine",
    energie1: "Energie im 1. Jahr",
    irr: "Projektrendite (IRR)",
    amortisation: "Amortisation",
    jahre: (f, n) => `${f.fmt(n, 1)} Jahre`,
    laufzeitUeber: "> Laufzeit",
    sofort: "sofort",
    risikoLabel: "Risiko",
    zusammensetzung: "Woraus sich die Summe zusammensetzt",
    zeileLw: (a, b) => `Landwirtschaft ${a} · Energie ${b}`,
    legendeLw: "Landwirtschaft: Deckungsbeitrag + GAP",
    legendeEnergie: "Energie: Pacht bzw. Überschuss nach Investition",
    dbJahr: "Deckungsbeitrag/Jahr",
    ohneAnlage: (x) => `ohne Anlage ${x}`,
    gapJahr: "GAP-Direktzahlung/Jahr",
    nichtGerechnet: "nicht gerechnet",
    chSystem: "CH-Direktzahlungen eigenes System",
    gapAnteil: (f, p) => `${f.fmt(p)} % der Fläche förderfähig`,
    agriPachtJahr: "Agri-Pacht/Jahr",
    agriPachtZ: (f, v, i) => `${f.fmt(v)} €/ha, +${f.fmt(i, 1)} % p. a.`,
    weiter: "Mit diesem Ergebnis weiter",
    agriPacht: "Agri-Pacht",
    proJahrPruefen: "pro Jahr – unverbindlich prüfen lassen",
    uebernehmen: "Größe und Region übernehmen wir in den Flächencheck.",
    flaechePruefen: "Fläche prüfen",
    durchrechnen: "Mit uns durchrechnen",
    fuss: "Projektrendite ohne Fremdkapital und vor Steuern, nominal – eine Orientierung, kein Angebot. Eigenverbrauch am Hof, Speicher und eingesparte Schutznetze sind nicht eingerechnet – sie verbessern Weg B oft deutlich.",
  },
  en: {
    wege: {
      pacht: ["Lease", "Investor builds, you keep farming"],
      eigen: ["Invest yourself", "Your plant – we build & market it"],
      genossenschaft: ["Cooperative", "Lease + share as a member"],
    },
    systeme: { vertikal: ["Vertical, bifacial", "Category II"], hoch: ["Elevated", "Category I"] },
    kulturen: { acker: ["Arable", "Cereals, rapeseed, maize"], gruenland: ["Grassland", "Mowing, forage"], weide: ["Pasture", "Sheep, cattle, poultry"], sonder: ["Fruit & berries", "Special crops"] },
    risiko: { gering: "low", mittel: "medium", "höher": "higher" },
    region: "Region",
    regionLabel: (id, l) => regionEn(id, "kurz", l),
    leistung: "Capacity",
    pachtJahr: "Lease/year",
    tsdKurz: (f, v) => f.tsd(v),
    irrEigen: "IRR (own)",
    flaecheSystem: "Land & system",
    flaeche: "Land",
    privileg: (f, ha) => `Up to ${f.fmt(ha, 1)} ha close to the farm possibly without a development plan (§ 35 BauGB, German Federal Building Code)`,
    groesser: "Larger plants usually require a development plan",
    kultur: "Crop",
    system: "System",
    unueblich: "unusual for this crop",
    vermarktungTitel: "Marketing & participation",
    stromvermarktung: "Power marketing",
    eeg: "EEG award",
    landPpa: (land, f, ct) => `In ${land === "AT" ? "Austria" : "Switzerland"} we calculate with a power purchase agreement (PPA) of ${f.fmt(ct, 1)} ct/kWh; subsidies under the ${land === "AT" ? "EAG (Austrian Renewable Energy Expansion Act)" : "one-off remuneration (Einmalvergütung)"} are assessed case by case.`,
    anteil: "Your share in the plant (cooperative)",
    einlage: (x) => `Contribution ≈ ${x}`,
    landwirtschaft: "Farming",
    dbOhne: "Gross margin without the plant",
    proHa: (f, v) => f.eur(v, "/ha"),
    dbUnter: (f, p) => `Under the system approx. ${f.pct(p)} of this (incl. land lost)`,
    sr: (mwp, a, b, c, n) => `Plant ${mwp} megawatts peak. Lease ${a} euros, own investment ${b} euros, cooperative ${c} euros over ${n} years.`,
    dreiWege: "Three options compared",
    plakette: (n) => `${n} years · before tax`,
    hoechste: "Highest total",
    hoechsteVon: (x) => `Highest total: ${x}`,
    hauptZusatz: (n) => `${n} years incl. farming, nominal`,
    tsdFormat: (f, v) => `€${f.fmt(v)}k`,
    stromJahr: "Power per year",
    investition: "Investment",
    erloes: "Revenue",
    sonderHinweis: "For fruit and berries, the module roof often replaces hail nets or polytunnels and safeguards quality – these savings are not included here and can improve the result considerably.",
    gewechselt: (k) => `For ${k} we calculate with elevated agrivoltaics (category I).`,
    weg: "Option",
    summeJahre: (n) => `Total over ${n} years incl. farming`,
    eigeneInvestition: "Own investment",
    keine: "none",
    energie1: "Energy in year 1",
    irr: "Project return (IRR)",
    amortisation: "Payback",
    jahre: (f, n) => `${f.fmt(n, 1)} years`,
    laufzeitUeber: "> term",
    sofort: "immediate",
    risikoLabel: "Risk",
    zusammensetzung: "What the total is made up of",
    zeileLw: (a, b) => `Farming ${a} · Energy ${b}`,
    legendeLw: "Farming: gross margin + CAP",
    legendeEnergie: "Energy: lease or surplus after investment",
    dbJahr: "Gross margin/year",
    ohneAnlage: (x) => `without the plant ${x}`,
    gapJahr: "CAP direct payment/year",
    nichtGerechnet: "not calculated",
    chSystem: "Swiss direct payments have their own system",
    gapAnteil: (f, p) => `${f.pct(p)} of the land eligible`,
    agriPachtJahr: "Agrivoltaic lease/year",
    agriPachtZ: (f, v, i) => `${f.eur(v, "/ha")}, +${f.pct(i, 1)} p.a.`,
    weiter: "Take this result further",
    agriPacht: "agrivoltaic lease",
    proJahrPruefen: "per year – have it checked without obligation",
    uebernehmen: "We carry the size and region over into the land check.",
    flaechePruefen: "Check your land",
    durchrechnen: "Work it through with us",
    fuss: "Project return without debt and before tax, nominal – for guidance only, not an offer. On-farm self-consumption, storage and savings on protective netting are not included – they often improve option B considerably.",
  },
};

export default function AgriPvRechner() {
  // Ländermodell: auf /at bzw. /ch Region/Land vorwählen – die Länder-Sperre zeigt dann keine ungeprüften Werte
  const seitenLand = useSeitenLand();
  const t = useTexte(TEXTE);
  const f = useFormate();
  const { fmt, fmtEur, fmtPct } = f;
  const betrag = betragMit(f, f.sprache === "en");
  const wegTitel = (id) => t.wege[id][0];
  const kulturLabel = (k) => t.kulturen[k.id]?.[0] ?? k.label;
  const [ha, setHa] = useState(10);
  const [system, setSystem] = useState("vertikal");
  const [kulturId, setKulturId] = useState("acker");
  const [regionId, setRegionId] = useState(() => landStart({ regionId: "de-sued" }, seitenLand).regionId);
  const [vermarktung, setVermarktung] = useState("eeg");
  const [db, setDb] = useState(kulturById("acker").db);
  const [anteil, setAnteil] = useState(AGRI.beteiligungAnteil.standard * 100);

  const kultur = kulturById(kulturId);
  const land = REGIONEN.find((r) => r.id === regionId)?.land;

  function kulturWaehlen(id) {
    setKulturId(id);
    const k = kulturById(id);
    setDb(k.db);
    if (!systemPasst(k, system)) setSystem("hoch");
  }

  const r = useMemo(
    () => agriVergleich({ ha, system, kulturId, regionId, dbProHa: db, vermarktung, anteil: anteil / 100 }),
    [ha, system, kulturId, regionId, db, vermarktung, anteil]
  );
  const [pacht, eigen, gen] = r.wege;
  const bester = [...r.wege].sort((a, b) => b.gesamtSumme - a.gesamtSumme)[0].id;
  const maxSumme = Math.max(...r.wege.map((w) => w.gesamtSumme), 1);
  const besterWeg = r.wege.find((w) => w.id === bester);

  // Teilen-Link: Eingaben in der Adresszeile (nur Abweichungen vom Standard)
  const SETZER = { ha: setHa, system: setSystem, kulturId: setKulturId, regionId: setRegionId, vermarktung: setVermarktung, db: setDb, anteil: setAnteil };
  useTeilbarerZustand(
    { ha, system, kulturId, regionId, vermarktung, db, anteil },
    (neu) => Object.entries(neu).forEach(([k, v]) => SETZER[k]?.(v)),
    {
      optionen: { system: SYSTEME.map((x) => x.id), kulturId: AGRI.kulturen.map((k) => k.id), regionId: REGIONEN.map((x) => x.id), vermarktung: ["eeg", "ppa"] },
      grenzen: { ha: [1, 50], db: [0, 10000], anteil: [AGRI.beteiligungAnteil.min * 100, AGRI.beteiligungAnteil.max * 100] },
    }
  );

  // Länder-Sperre (Paket E): für AT/CH nur die Regionswahl und der Hinweis aus markt.js
  const sperre = r.sperre;
  const regionWahl = (
    <Auswahl legende={t.region} wert={regionId} onChange={setRegionId} spalten={3} klein optionen={REGIONEN.map((x) => ({ id: x.id, label: t.regionLabel(x.id, REGION_KURZ[x.id] || x.label) }))} />
  );

  return (
    <RechnerRahmen
      breiteLinks={390}
      mitlaufend
      sperre={sperre}
      eingaben={sperre ? (
        <SperrEingaben>{regionWahl}</SperrEingaben>
      ) : (
        <>
          <MobilKurz
            werte={[
              [t.leistung, `${fmt(r.anlage.kwp / 1000, 1)} MWp`],
              [t.pachtJahr, t.tsdKurz(f, pacht.energieJahr)],
              [t.irrEigen, eigen.irr != null ? fmtPct(eigen.irr, 1) : "–"],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel={t.flaecheSystem}>
              <Regler label={t.flaeche} wert={ha} min={1} max={50} step={0.5} stellen={ha % 1 ? 1 : 0} einheit="ha" onChange={setHa} hinweis={ha <= AGRI.privilegierungHa ? t.privileg(f, AGRI.privilegierungHa) : t.groesser} />
              <Auswahl legende={t.kultur} wert={kulturId} onChange={kulturWaehlen} spalten={2} klein optionen={AGRI.kulturen.map((k) => ({ id: k.id, label: t.kulturen[k.id]?.[0] ?? k.label, sub: t.kulturen[k.id]?.[1] ?? k.sub }))} />
              <Auswahl
                legende={t.system}
                wert={system}
                onChange={(v) => (systemPasst(kultur, v) ? setSystem(v) : null)}
                optionen={SYSTEME.map((s) => ({ id: s.id, label: t.systeme[s.id]?.[0] ?? s.label, sub: systemPasst(kultur, s.id) ? t.systeme[s.id]?.[1] ?? s.sub : t.unueblich }))}
              />
              {regionWahl}
            </Gruppe>

            <Gruppe titel={t.vermarktungTitel}>
              {land === "DE" ? (
                <Auswahl
                  legende={t.stromvermarktung}
                  wert={vermarktung}
                  onChange={setVermarktung}
                  optionen={[
                    { id: "eeg", label: t.eeg, sub: `${fmt(system === "hoch" ? ERLOESE.eegBesondereCt : ERLOESE.eegFreiflaecheCt, 1)} ct/kWh` },
                    { id: "ppa", label: "PPA", sub: `${fmt(ERLOESE.ppaCt.mittel, 1)} ct/kWh` },
                  ]}
                />
              ) : (
                <p className="rounded-2xl bg-white px-4 py-3 text-[13.5px] leading-relaxed text-ink-600 ring-1 ring-ink-200">
                  {t.landPpa(land, f, ERLOESE.ppaCt.mittel)}
                </p>
              )}
              <Regler
                label={t.anteil}
                wert={anteil}
                min={AGRI.beteiligungAnteil.min * 100}
                max={AGRI.beteiligungAnteil.max * 100}
                step={1}
                einheit="%"
                onChange={setAnteil}
                hinweis={t.einlage(betrag(gen.invest))}
              />
            </Gruppe>

            <Gruppe titel={t.landwirtschaft}>
              <Regler
                label={t.dbOhne}
                wert={db}
                min={0}
                max={kulturId === "sonder" ? 10000 : 1500}
                step={kulturId === "sonder" ? 100 : 10}
                format={(v) => t.proHa(f, v)}
                onChange={setDb}
                hinweis={t.dbUnter(f, r.landwirtschaft.ertragLw * 100)}
              />
            </Gruppe>

            {/* Vorschau des gewählten Systems */}
            <figure className="overflow-hidden rounded-2xl bg-white ring-1 ring-ink-200/70">
              <AgriBild typ={r.system} className="block h-auto w-full" />
              <figcaption className="flex items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-[12.5px]">
                <span className="font-semibold text-ink-800">{t.systeme[r.system]?.[0] ?? SYSTEME.find((x) => x.id === r.system)?.label}</span>
                <span className="ov-num shrink-0 text-ink-500">
                  {fmt(ha, ha % 1 ? 1 : 0)} ha · {fmt(r.anlage.kwp / 1000, 2)} MWp
                </span>
              </figcaption>
            </figure>
          </div>
        </>
      )}
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {t.sr(fmt(r.anlage.kwp / 1000, 1), Math.round(pacht.gesamtSumme), Math.round(eigen.gesamtSumme), Math.round(gen.gesamtSumme), r.laufzeit)}
          </p>
          <ErgebnisKopf titel={t.dreiWege} plakette={t.plakette(r.laufzeit)} />

          {/* Hauptzahl: der Weg mit der höchsten Summe */}
          <Hauptzahl className="mt-5" icon={Trophy} label={t.hoechsteVon(wegTitel(bester))} zusatz={t.hauptZusatz(r.laufzeit)}>
            <Zahl wert={besterWeg.gesamtSumme / 1000} format={(v) => t.tsdFormat(f, v)} />
          </Hauptzahl>

          {/* Anlage */}
          <Belege spalten={4}>
            <Kennzahl icon={Zap} label={t.leistung}>{`${fmt(r.anlage.kwp / 1000, 2)} MWp`}</Kennzahl>
            <Kennzahl icon={Sun} label={t.stromJahr}>{`${fmt(r.anlage.kwh / 1000)} MWh`}</Kennzahl>
            <Kennzahl icon={Banknote} label={t.investition}>{betrag(r.anlage.capex)}</Kennzahl>
            <Kennzahl icon={Gauge} label={t.erloes}>{`${fmt(r.ctFoerder, 1)} ct/kWh`}</Kennzahl>
          </Belege>
          {kulturId === "sonder" && (
            <p className="mt-3 text-[13px] leading-relaxed text-ink-500">{t.sonderHinweis}</p>
          )}
          {r.systemGewechselt && (
            <p className="mt-3 text-[13px] text-ink-500">{t.gewechselt(kulturLabel(kultur))}</p>
          )}

          {/* Drei Wege */}
          <div className="mt-5 grid gap-3 xl:grid-cols-3">
            {r.wege.map((w) => {
              const m = WEG_META[w.id];
              const Icon = m.weg.icon;
              const top = w.id === bester;
              return (
                <div key={w.id} className={cn("relative flex flex-col rounded-3xl p-5 ring-1", top ? "bg-ov-50 ring-2 ring-ov-500" : "bg-white ring-ink-200/70")}>
                  {top && <span className="absolute -top-3 left-5 rounded-full bg-ov-600 px-2.5 py-0.5 text-[11.5px] font-semibold text-white">{t.hoechste}</span>}
                  <div className="flex items-center gap-3">
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", top ? "bg-ov-500 text-white" : "bg-sand-50 text-ov-600 ring-1 ring-ink-200")}>
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[16.5px] font-bold leading-tight text-ink-900">{wegTitel(w.id)}</p>
                      <p className="text-[12.5px] leading-snug text-ink-500">
                        <span className="font-semibold text-ink-600">{t.weg} {m.weg.buchstabe}</span> · {t.wege[w.id][1]}
                      </p>
                    </div>
                  </div>
                  {/* Anteil an der höchsten Summe */}
                  <div aria-hidden="true" className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <span className={cn("block h-full rounded-full", top ? "bg-ov-500" : "bg-ink-300")} style={{ width: `${Math.max(0, (w.gesamtSumme / maxSumme) * 100)}%` }} />
                  </div>
                  <p className="mt-4 text-[12.5px] font-medium text-ink-500">{t.summeJahre(r.laufzeit)}</p>
                  <p className="ov-num font-display text-[26px] font-extrabold leading-tight tracking-tight text-ink-900">
                    <Zahl wert={w.gesamtSumme / 1000} format={(v) => t.tsdFormat(f, v)} />
                  </p>
                  <dl className="mt-4 space-y-2 border-t border-ink-200/70 pt-4 text-[13.5px]">
                    <Zeile k={t.eigeneInvestition} v={w.invest ? betrag(w.invest) : t.keine} />
                    <Zeile k={t.energie1} v={fmtEur(w.energieJahr)} />
                    <Zeile k={t.irr} v={w.irr != null ? fmtPct(w.irr, 1) : "–"} />
                    <Zeile k={t.amortisation} v={w.invest ? (w.amortisation ? t.jahre(f, w.amortisation) : t.laufzeitUeber) : t.sofort} />
                    <Zeile k={t.risikoLabel} v={t.risiko[w.risiko] ?? w.risiko} />
                  </dl>
                </div>
              );
            })}
          </div>

          {/* Balken */}
          <div className="mt-5 rounded-3xl p-5 ring-1 ring-ink-200/70 md:p-6">
            <p className="font-display text-[16px] font-bold text-ink-900">{t.zusammensetzung}</p>
            <div className="mt-4 space-y-3.5">
              {r.wege.map((w) => {
                const lw = r.landwirtschaft.summe;
                const en = w.gesamtSumme - lw;
                return (
                  <div key={w.id}>
                    <div className="mb-1.5 flex justify-between gap-3 text-[13px]">
                      <span className="font-semibold text-ink-800">{wegTitel(w.id)}</span>
                      <span className="ov-num text-right text-ink-600">
                        {betrag(w.gesamtSumme)}
                      </span>
                    </div>
                    <div className="flex h-3 overflow-hidden rounded-full bg-ink-100">
                      <span className="h-full bg-sun-400" style={{ width: `${(Math.max(0, lw) / maxSumme) * 100}%` }} />
                      <span className="h-full bg-ov-500" style={{ width: `${(Math.max(0, en) / maxSumme) * 100}%` }} />
                    </div>
                    <p className="ov-num mt-1 text-[12px] text-ink-500">
                      {t.zeileLw(betrag(lw), betrag(en))}
                    </p>
                  </div>
                );
              })}
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-ink-600">
              <li className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-sun-400" />{t.legendeLw}</li>
              <li className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-ov-500" />{t.legendeEnergie}</li>
            </ul>
          </div>

          {/* Landwirtschaft */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Mini icon={Sprout} k={t.dbJahr} v={fmtEur(r.landwirtschaft.dbJahr)} z={t.ohneAnlage(fmtEur(r.landwirtschaft.dbOhneAnlage))} />
            <Mini icon={Info} k={t.gapJahr} v={r.land === "CH" ? t.nichtGerechnet : fmtEur(r.landwirtschaft.gapJahr)} z={r.land === "CH" ? t.chSystem : t.gapAnteil(f, AGRI.gapFoerderfaehig * 100)} />
            <Mini icon={Zap} k={t.agriPachtJahr} v={fmtEur(r.pachtJahr0)} z={t.agriPachtZ(f, PACHT.agriProHa.mittel, PACHT.indexierung * 100)} />
          </div>

          <div className="mt-7 border-t border-ink-100 pt-6">
            <div className="flex flex-col gap-4 rounded-3xl bg-ov-50 p-5 ring-1 ring-ov-200 md:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ov-800">{t.weiter}</p>
                <p className="mt-1 font-display text-[19px] font-bold leading-snug text-ink-900">
                  {fmt(ha, ha % 1 ? 1 : 0)} ha · {t.agriPacht} ≈ <span className="ov-num">{fmtEur(r.pachtJahr0)}</span> {t.proJahrPruefen}
                </p>
                <p className="mt-1 text-[13px] leading-snug text-ink-600">{t.uebernehmen}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row lg:flex-col xl:flex-row">
                <ZumFlaechencheck ha={ha} regionId={regionId} size="lg" data-ov-cta>
                  {t.flaechePruefen}
                </ZumFlaechencheck>
                <Button href={pfad("/landwirte#anfrage")} size="lg" variant="secondary">
                  {t.durchrechnen}
                </Button>
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-ink-500">
              {t.fuss}
            </p>
          </div>
        </>
      }
    />
  );
}

function Zeile({ k, v }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-500">{k}</dt>
      <dd className="ov-num text-right font-semibold text-ink-900">{v}</dd>
    </div>
  );
}

function Mini({ icon: Icon, k, v, z }) {
  return (
    <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60">
      <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-500">
        <Icon aria-hidden="true" className="h-3.5 w-3.5 text-ov-600" />
        {k}
      </p>
      <p className="ov-num mt-1 font-display text-[19px] font-extrabold tracking-tight text-ink-900">{v}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-ink-500">{z}</p>
    </div>
  );
}
