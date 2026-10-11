"use client";

// Gebäudestrom-Rechner (Welle 4, Paket GEBAEUDE): PV auf dem Mehrparteien- oder Gewerbegebäude,
// Strom an die Einheiten im Haus. Rechnet NUR Energiemengen und Anteile (keine Geldwerte –
// Mieterstromzuschlag, Tarife und Netzentgelte sind noch nicht am Original geprüft, E6).
// Logik: src/lib/rechner/gebaeudestrom.js. Bericht/Lead: ErgebnisAnfrage + Bericht-Baustein (B4).

import { useMemo, useState } from "react";
import { AlertTriangle, BatteryCharging, Building2, Home, Info, Scale, Sun, Users } from "lucide-react";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Schalter, Zahl } from "./bausteine";
import { useTeilbarerZustand } from "./kontext";
import { ErgebnisKopf, Hinweis, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { DiagrammKarte, FARBEN, Linien } from "./ToolTeile";
import ErgebnisAnfrage from "./ErgebnisAnfrage";
import { DACHARTEN, GEBAEUDETYPEN, LAENDER, landVon, rechneGebaeudestrom, regionenFuer, standardFuer } from "@/lib/rechner/gebaeudestrom";
import useLand from "@/components/Land/useLand";
import { useSprache, useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { regionEn } from "@/lib/sprache/begriffe";

const TEXTE = {
  de: {
    laender: { de: ["Deutschland", "Mieterstrom · § 42b"], at: ["Österreich", "GEA § 16a ElWOG"], ch: ["Schweiz", "ZEV / vZEV"] },
    modelle: {
      mieterstrom: ["Mieterstrom", "§ 21 Abs. 3 EEG"],
      ggv: ["Gebäudeversorgung", "§ 42b EnWG"],
      gea: ["Gemeinschaftliche Erzeugungsanlage", "§ 16a ElWOG"],
      zev: ["ZEV", "Art. 17–18 EnG"],
      vzev: ["Virtueller ZEV", "Messung durch Netzbetreiber"],
    },
    typen: { wohn: ["Wohngebäude", "abends viel Verbrauch"], gemischt: ["Wohnen + Gewerbe", "Laden, Büro im Haus"], gewerbe: ["Gewerbegebäude", "tagsüber aktiv"] },
    dacharten: { geneigt: ["Geneigtes Dach", "Ziegel, Trapez"], flach: ["Flachdach", "Ost/West aufgeständert"] },
    landModell: "Land & Modell",
    land: "Land",
    modell: "Modell im Land",
    gebaeude: "Gebäude & Teilnahme",
    typ: "Nutzung des Gebäudes",
    wohneinheiten: "Wohneinheiten",
    gewerbeeinheiten: "Gewerbeeinheiten",
    verbrauchWE: "Stromverbrauch je Wohneinheit",
    verbrauchGE: "Stromverbrauch je Gewerbeeinheit",
    teilnahme: "Teilnahmequote",
    teilnahmeHinweis: "Die Teilnahme ist in allen Modellen freiwillig – nicht jede Einheit macht mit.",
    dachTitel: "Dach & Anlage",
    dachflaeche: "Dachfläche für PV",
    dachart: "Dachform",
    region: "Region",
    speicher: "Speicher im Gebäude",
    speicherText: "verschiebt Mittagsstrom in den Abend",
    kwh: (f, v) => `${f.fmt(v)} kWh`,
    mwh: (f, v) => `${f.fmt(v / 1000, 1)} MWh`,
    kurz: { anlage: "Anlage", genutzt: "Im Haus genutzt", deckung: "Deckung" },
    ihr: "Ihr Gebäudestrom",
    hauptzahl: "Im Gebäude genutzter Solarstrom",
    hauptzusatz: (x) => `${x} % der Erzeugung`,
    anlage: "Mögliche Anlage",
    erzeugung: (f, x) => `≈ ${f.fmt(x / 1000, 1)} MWh Erzeugung im Jahr`,
    deckung: "Deckung des Verbrauchs",
    deckungZusatz: "der teilnehmenden Einheiten",
    ueberschuss: "Überschuss ins Netz",
    ueberschussZusatz: "wird eingespeist bzw. vermarktet",
    pctSuffix: " %",
    sr: (a, b, c) => `Anlage ${a} Kilowatt-Peak, im Gebäude genutzt ${b} Prozent der Erzeugung, Deckung ${c} Prozent des teilnehmenden Verbrauchs.`,
    werTitel: "Wer profitiert wie",
    wer: {
      mieterstrom: [
        ["Bewohnerinnen und Bewohner", "beziehen Solarstrom direkt vom eigenen Dach – freiwillig, der Reststrom kommt weiter vom Versorger."],
        ["Eigentümer bzw. Betreiber", "liefert den im Haus genutzten Strom und hat Anspruch auf den Mieterstromzuschlag (§ 21 Abs. 3 EEG); er übernimmt dafür Lieferantenpflichten."],
        ["Hausverwaltung", "organisiert Teilnahme und Abrechnung – meist mit einem Dienstleister."],
      ],
      ggv: [
        ["Teilnehmende", "erhalten ihren Anteil am Dachstrom nach dem vereinbarten Schlüssel und behalten ihren eigenen Stromliefervertrag."],
        ["Eigentümer bzw. Betreiber", "verteilt den Strom nach § 42b EnWG, ohne Stromlieferant zu werden; den Überschuss speist er ein."],
        ["Hausverwaltung", "hält den Aufteilungsschlüssel und die Vereinbarungen aktuell."],
      ],
      gea: [
        ["Teilnehmende", "am gemeinsamen Netzanschlusspunkt teilen den Solarstrom nach dem vereinbarten Schlüssel (§ 16a ElWOG) und behalten ihren Lieferanten."],
        ["Eigentümergemeinschaft bzw. Errichter", "betreibt die Anlage; der Überschuss wird eingespeist."],
        ["Hausverwaltung", "begleitet Beschluss, Zustimmung und Abrechnung."],
      ],
      zev: [
        ["Mieter und Stockwerkeigentümer", "verbrauchen den Solarstrom gemeinsam am Ort der Produktion; der Zusammenschluss tritt als ein Endverbraucher auf (Art. 17–18 EnG)."],
        ["Grundeigentümer", "betreibt die Anlage und rechnet den Solarstrom intern ab; den Reststrom liefert der Versorger."],
        ["Verwaltung", "organisiert Teilnahme und interne Abrechnung – beim vZEV misst der Netzbetreiber über die bestehenden Zähler."],
      ],
    },
    passt: "Die Anlagengröße passt zum Gebäude: Ein großer Teil der Erzeugung wird direkt im Haus genutzt.",
    grenzwertig: (f, k) => `Die Anlage ist für dieses Gebäude eher groß. Richtwert für ein ausgewogenes Verhältnis: ≈ ${f.fmt(k)} kWp (dann würde rund die Hälfte der Erzeugung im Haus genutzt). Mehr teilnehmende Einheiten oder ein Speicher helfen ebenfalls.`,
    zuGross: (f, k) => `Die Anlage ist für dieses Gebäude zu groß ausgelegt – der große Rest ginge als Überschuss ins Netz. Richtwert: ≈ ${f.fmt(k)} kWp für rund 50 % Nutzung im Haus.`,
    offen: "Bitte Einheiten, Verbrauch und Dachfläche angeben – ohne teilnehmenden Verbrauch lässt sich keine Energiebilanz rechnen.",
    geldHinweis: "Bewusst ohne Geldwerte: Mieterstromzuschlag, Tarife und Netzentgelt-Folgen je Land zeigen wir erst nach fachlicher Prüfung. Der Bericht dokumentiert die Energiebilanz mit Rechenweg.",
    fuss: "Näherung über eine Gleichzeitigkeits-Sättigungskurve, wie im Energy-Sharing-Rechner. Maßgeblich sind Messkonzept und Viertelstundenwerte im gewählten Modell.",
    anfrageSatz: "des teilnehmenden Verbrauchs aus dem eigenen Dach – Machbarkeit fürs Gebäude prüfen lassen",
    nachricht: (einheiten, kwp, deckung) => `Aus dem Gebäudestrom-Rechner: ${einheiten} Einheiten, mögliche Anlage ${kwp} kWp, rechnerische Deckung ${deckung} % des teilnehmenden Verbrauchs.`,
    kurveTitel: "Wie groß darf die Anlage sein?",
    kurveZusatz: "Im Haus genutzter Strom und Überschuss je nach Anlagengröße – bei gleichem Gebäude",
    serieGenutzt: "Im Gebäude genutzt",
    serieUeber: "Überschuss ins Netz",
    serieVerbrauch: "Teilnehmender Verbrauch",
    kurveAria: "Im Gebäude genutzter Strom und Überschuss in Abhängigkeit von der Anlagengröße.",
    ttGenutzt: "Genutzt",
    ttUeber: "Überschuss",
    ttEv: "Eigenverbrauch",
    kurveText: "Im Haus genutzt wird nur, was zeitgleich erzeugt und verbraucht wird. Ab einer gewissen Größe wächst vor allem der Überschuss – dann lohnen mehr teilnehmende Einheiten, ein Speicher oder eine kleinere Anlage.",
  },
  en: {
    laender: { de: ["Germany", "Mieterstrom · § 42b"], at: ["Austria", "GEA § 16a ElWOG"], ch: ["Switzerland", "ZEV / vZEV"] },
    modelle: {
      mieterstrom: ["Tenant electricity", "§ 21 (3) EEG"],
      ggv: ["Shared building supply", "§ 42b EnWG"],
      gea: ["Jointly operated generation plant", "§ 16a ElWOG"],
      zev: ["ZEV", "Art. 17–18 EnG"],
      vzev: ["Virtual ZEV", "metered by the grid operator"],
    },
    typen: { wohn: ["Residential building", "high evening use"], gemischt: ["Residential + commercial", "shop or office in the building"], gewerbe: ["Commercial building", "active during the day"] },
    dacharten: { geneigt: ["Pitched roof", "tiles, trapezoidal sheet"], flach: ["Flat roof", "east/west mounted"] },
    landModell: "Country & model",
    land: "Country",
    modell: "Model in this country",
    gebaeude: "Building & participation",
    typ: "Use of the building",
    wohneinheiten: "Residential units",
    gewerbeeinheiten: "Commercial units",
    verbrauchWE: "Consumption per residential unit",
    verbrauchGE: "Consumption per commercial unit",
    teilnahme: "Participation rate",
    teilnahmeHinweis: "Participation is voluntary in all models – not every unit will join.",
    dachTitel: "Roof & plant",
    dachflaeche: "Roof area for PV",
    dachart: "Roof shape",
    region: "Region",
    speicher: "Storage in the building",
    speicherText: "shifts midday power into the evening",
    kwh: (f, v) => `${f.fmt(v)} kWh`,
    mwh: (f, v) => `${f.fmt(v / 1000, 1)} MWh`,
    kurz: { anlage: "Plant", genutzt: "Used on site", deckung: "Coverage" },
    ihr: "Your building power",
    hauptzahl: "Solar power used in the building",
    hauptzusatz: (x) => `${x}% of generation`,
    anlage: "Possible plant",
    erzeugung: (f, x) => `≈ ${f.fmt(x / 1000, 1)} MWh of generation per year`,
    deckung: "Consumption covered",
    deckungZusatz: "of the participating units",
    ueberschuss: "Surplus to the grid",
    ueberschussZusatz: "fed in or marketed",
    pctSuffix: "%",
    sr: (a, b, c) => `Plant ${a} kilowatt peak, ${b} percent of generation used in the building, covering ${c} percent of participating consumption.`,
    werTitel: "Who benefits and how",
    wer: {
      mieterstrom: [
        ["Residents", "buy solar power straight from their own roof – voluntarily; residual power still comes from a supplier."],
        ["Owner or operator", "supplies the power used in the building and is entitled to the tenant electricity surcharge (§ 21 (3) EEG); in return they take on supplier duties."],
        ["Property manager", "organises participation and billing – usually with a service provider."],
      ],
      ggv: [
        ["Participants", "receive their share of the roof power according to the agreed allocation key and keep their own electricity contract."],
        ["Owner or operator", "distributes the power under § 42b EnWG without becoming an electricity supplier; the surplus is fed into the grid."],
        ["Property manager", "keeps the allocation key and agreements up to date."],
      ],
      gea: [
        ["Participants", "at the shared grid connection point split the solar power according to the agreed key (§ 16a ElWOG) and keep their supplier."],
        ["Owners’ association or builder", "operates the plant; the surplus is fed into the grid."],
        ["Property manager", "supports the resolution, consent and billing."],
      ],
      zev: [
        ["Tenants and condominium owners", "consume the solar power together at the place of production; the grouping acts as a single end consumer (Art. 17–18 EnG)."],
        ["Property owner", "operates the plant and bills the solar power internally; residual power comes from the utility."],
        ["Property manager", "organises participation and internal billing – in a virtual ZEV the grid operator meters via the existing meters."],
      ],
    },
    passt: "The plant size suits the building: a large share of the generation is used directly on site.",
    grenzwertig: (f, k) => `The plant is rather large for this building. Guide value for a balanced ratio: ≈ ${f.fmt(k)} kWp (about half of the generation would then be used on site). More participating units or storage also help.`,
    zuGross: (f, k) => `The plant is oversized for this building – most of the generation would go to the grid as surplus. Guide value: ≈ ${f.fmt(k)} kWp for roughly 50% on-site use.`,
    offen: "Please enter units, consumption and roof area – without participating consumption there is no energy balance to calculate.",
    geldHinweis: "Deliberately without monetary values: surcharge levels, tariffs and grid fee effects per country will be shown only after expert review. The report documents the energy balance with the calculation method.",
    fuss: "An approximation using a simultaneity saturation curve, as in the energy sharing calculator. The metering concept and quarter-hourly values of the chosen model are authoritative.",
    anfrageSatz: "of participating consumption from the building’s own roof – have the feasibility checked",
    nachricht: (einheiten, kwp, deckung) => `From the building power calculator: ${einheiten} units, possible plant ${kwp} kWp, calculated coverage ${deckung}% of participating consumption.`,
    kurveTitel: "How large can the plant be?",
    kurveZusatz: "Power used on site and surplus depending on plant size – same building",
    serieGenutzt: "Used in the building",
    serieUeber: "Surplus to the grid",
    serieVerbrauch: "Participating consumption",
    kurveAria: "Power used in the building and surplus depending on plant size.",
    ttGenutzt: "Used",
    ttUeber: "Surplus",
    ttEv: "Self-consumption",
    kurveText: "Only power generated and consumed at the same time is used in the building. Beyond a certain size, mainly the surplus grows – then more participating units, storage or a smaller plant pay off.",
  },
};

const opt = (liste, tab) => liste.map((x) => ({ ...x, label: tab[x.id]?.[0] ?? x.label, sub: tab[x.id]?.[1] ?? x.sub }));
const berichtEingaben = (e) => ({
  modell: e.modell,
  regionId: e.regionId,
  gebaeudetyp: e.gebaeudetyp,
  wohneinheiten: e.wohneinheiten,
  gewerbeeinheiten: e.gewerbeeinheiten,
  verbrauchWE: e.verbrauchWE,
  verbrauchGE: e.verbrauchGE,
  teilnahme: e.teilnahme,
  dachflaecheM2: e.dachflaecheM2,
  dachart: e.dachart,
  speicher: e.speicher,
});

export default function GebaeudestromRechner() {
  const t = useTexte(TEXTE);
  const f = useFormate();
  const { fmt } = f;
  const en = useSprache() === "en";
  const { land: seitenLand } = useLand();
  const [e, setE] = useState(() => standardFuer((seitenLand || "DE").toLowerCase()));
  const set = (k) => (v) => setE((a) => ({ ...a, [k]: v }));
  const setLand = (id) =>
    setE((a) => ({ ...standardFuer(id), gebaeudetyp: a.gebaeudetyp, wohneinheiten: a.wohneinheiten, gewerbeeinheiten: a.gewerbeeinheiten, verbrauchWE: a.verbrauchWE, verbrauchGE: a.verbrauchGE, teilnahme: a.teilnahme, dachflaecheM2: a.dachflaecheM2, dachart: a.dachart, speicher: a.speicher }));
  useTeilbarerZustand(e, (neu) => setE((a) => ({ ...(neu.land && neu.land !== a.land ? standardFuer(neu.land) : a), ...neu })), {
    optionen: {
      land: LAENDER.map((x) => x.id),
      modell: LAENDER.flatMap((x) => x.modelle.map((m) => m.id)),
      gebaeudetyp: GEBAEUDETYPEN.map((x) => x.id),
      dachart: DACHARTEN.map((x) => x.id),
      regionId: LAENDER.flatMap((x) => regionenFuer(x.id).map((y) => y.id)),
    },
    grenzen: { wohneinheiten: [0, 500], gewerbeeinheiten: [0, 200], verbrauchWE: [500, 10000], verbrauchGE: [1000, 200000], teilnahme: [0.1, 1], dachflaecheM2: [20, 20000] },
    pruefen: (_, neu) => {
      const z = { ...standardFuer(neu.land || "de"), ...neu };
      if (!regionenFuer(z.land).some((x) => x.id === z.regionId)) throw new Error("Region passt nicht zum Land");
      if (!landVon(z.land).modelle.some((x) => x.id === z.modell)) throw new Error("Modell passt nicht zum Land");
      rechneGebaeudestrom(z);
    },
  });
  const r = useMemo(() => rechneGebaeudestrom(e), [e]);
  const l = landVon(e.land);
  const regionen = regionenFuer(e.land);
  const mitGewerbe = e.gebaeudetyp !== "wohn";
  const werListe = t.wer[r.modell.id === "vzev" ? "zev" : r.modell.id] || t.wer.mieterstrom;
  const modellText = t.modelle[r.modell.id] || [r.modell.label, r.modell.sub]; // Plakette in der Seitensprache (EN-Fassung sonst deutsch)

  const kurve = useMemo(() => {
    const maxM2 = Math.max(200, Math.ceil((e.dachflaecheM2 * 2.5) / 50) * 50);
    const xs = Array.from({ length: 11 }, (_, i) => Math.round((maxM2 * i) / 10) || 20);
    return { xs, werte: xs.map((m2) => rechneGebaeudestrom({ ...e, dachflaecheM2: m2 })) };
  }, [e]);

  return (
    <RechnerRahmen
      mitlaufend
      eingaben={
        <>
          <MobilKurz
            werte={[
              [t.kurz.anlage, `${fmt(r.kwp)} kWp`],
              [t.kurz.genutzt, `${fmt(r.eigenverbrauch * 100)} %`],
              [t.kurz.deckung, `${fmt(r.deckung * 100)} %`],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel={t.landModell}>
              <Auswahl legende={t.land} wert={e.land} onChange={setLand} optionen={opt(LAENDER, t.laender)} />
              {l.modelle.length > 1 && <Auswahl legende={t.modell} wert={e.modell} onChange={set("modell")} optionen={opt(l.modelle, t.modelle)} klein />}
              {regionen.length > 1 && (
                <Auswahl
                  legende={t.region}
                  wert={e.regionId}
                  onChange={set("regionId")}
                  spalten={2}
                  klein
                  optionen={regionen.map((x) => ({ id: x.id, label: en ? regionEn(x.id, "label", x.label) : x.label, sub: `${fmt(x.ertrag)} kWh/kWp` }))}
                />
              )}
            </Gruppe>

            <Gruppe titel={t.gebaeude}>
              <Auswahl legende={t.typ} wert={e.gebaeudetyp} onChange={set("gebaeudetyp")} optionen={opt(GEBAEUDETYPEN, t.typen)} klein />
              <Regler label={t.wohneinheiten} wert={e.wohneinheiten} min={0} max={200} step={1} onChange={set("wohneinheiten")} />
              {mitGewerbe && <Regler label={t.gewerbeeinheiten} wert={e.gewerbeeinheiten} min={0} max={50} step={1} onChange={set("gewerbeeinheiten")} />}
              <Regler label={t.verbrauchWE} wert={e.verbrauchWE} min={500} max={10000} step={100} format={(v) => t.kwh(f, v)} onChange={set("verbrauchWE")} />
              {mitGewerbe && e.gewerbeeinheiten > 0 && (
                <Regler label={t.verbrauchGE} wert={e.verbrauchGE} min={1000} max={100000} step={500} format={(v) => t.kwh(f, v)} onChange={set("verbrauchGE")} />
              )}
              <Regler label={t.teilnahme} wert={e.teilnahme} min={0.1} max={1} step={0.05} format={(v) => `${fmt(v * 100)} %`} onChange={set("teilnahme")} hinweis={t.teilnahmeHinweis} />
            </Gruppe>

            <Gruppe titel={t.dachTitel}>
              <Regler label={t.dachflaeche} wert={e.dachflaecheM2} min={20} max={2000} step={10} format={(v) => `${fmt(v)} m²`} onChange={set("dachflaecheM2")} hinweis={t.erzeugung(f, r.erzeugung)} />
              <Auswahl legende={t.dachart} wert={e.dachart} onChange={set("dachart")} optionen={opt(DACHARTEN, t.dacharten)} klein />
              <Schalter icon={BatteryCharging} label={t.speicher} beschreibung={t.speicherText} an={e.speicher} onChange={set("speicher")} />
            </Gruppe>
          </div>
        </>
      }
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {t.sr(fmt(r.kwp), fmt(r.eigenverbrauch * 100), fmt(r.deckung * 100))}
          </p>
          <ErgebnisKopf titel={t.ihr} plakette={`${modellText[0]} · ${modellText[1]}`} />

          <Hauptzahl
            className="mt-5"
            icon={Sun}
            label={t.hauptzahl}
            zusatz={t.hauptzusatz(fmt(r.eigenverbrauch * 100))}
            rechts={
              <div className="sm:text-right">
                <p className="flex items-center gap-1.5 text-[12.5px] text-white/75 sm:justify-end">
                  <Building2 aria-hidden="true" className="h-3.5 w-3.5" />
                  {t.anlage}
                </p>
                <p className="ov-kpi mt-0.5 text-white">
                  <Zahl wert={r.kwp} suffix=" kWp" />
                </p>
                <p className="text-[12.5px] text-white/75">{t.erzeugung(f, r.erzeugung)}</p>
              </div>
            }
          >
            <Zahl wert={r.genutzt / 1000} suffix=" MWh" delta="dunkel" einlauf />
          </Hauptzahl>
          <Belege spalten={2}>
            <Kennzahl ton="akzent" icon={Home} label={t.deckung} zusatz={t.deckungZusatz}>
              <Zahl wert={r.deckung * 100} suffix={t.pctSuffix} delta="hell" />
            </Kennzahl>
            <Kennzahl icon={Sun} label={t.ueberschuss} zusatz={t.ueberschussZusatz}>
              <Zahl wert={r.ueberschuss / 1000} suffix=" MWh" delta="hell" />
            </Kennzahl>
          </Belege>

          <div className="mt-5 rounded-2xl bg-ink-50 p-4">
            <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-800">
              <Users aria-hidden="true" className="h-4 w-4 text-ov-600" />
              {t.werTitel}
            </p>
            <ul className="mt-2.5 space-y-2 text-[13px] leading-relaxed text-ink-600">
              {werListe.map(([wer, wie]) => (
                <li key={wer}>
                  <span className="font-semibold text-ink-800">{wer}</span> {wie}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 space-y-2.5">
            {r.passung === "passt" && (
              <Hinweis ton="gut" icon={Scale}>
                {t.passt}
              </Hinweis>
            )}
            {r.passung === "grenzwertig" && (
              <Hinweis ton="neutral" icon={Scale}>
                {t.grenzwertig(f, r.ausgewogenKwp)}
              </Hinweis>
            )}
            {r.passung === "zu_gross" && (
              <Hinweis ton="warnung" icon={AlertTriangle}>
                {t.zuGross(f, r.ausgewogenKwp)}
              </Hinweis>
            )}
            {r.passung === "offen" && (
              <Hinweis ton="neutral" icon={Info}>
                {t.offen}
              </Hinweis>
            )}
            <Hinweis ton="neutral" icon={Info}>
              {t.geldHinweis}
            </Hinweis>
          </div>

          <ErgebnisAnfrage
            typ="dach"
            href="/kontakt?anliegen=dach#formular"
            kennzahl={r.deckung > 0 ? <Zahl wert={r.deckung * 100} suffix=" %" /> : null}
            satz={t.anfrageSatz}
            signal={`${Math.round(r.kwp)}|${Math.round(r.deckung * 100)}`}
            nachricht={t.nachricht(fmt(r.einheiten), fmt(r.kwp), fmt(r.deckung * 100))}
            sekundaer={[{ href: "/gebaeudestrom", label: en ? "How building power works" : "So funktioniert Gebäudestrom" }]}
            hinweis={t.fuss}
            bericht={{ rechner: "gebaeudestrom", land: e.land.toUpperCase(), eingaben: berichtEingaben(e) }}
          />
        </>
      }
      unten={
        <DiagrammKarte titel={t.kurveTitel} zusatz={t.kurveZusatz}>
          <Linien
            xLabels={kurve.xs.map((m2) => `${fmt(m2)} m²`)}
            serien={[
              { key: "genutzt", label: t.serieGenutzt, farbe: FARBEN.gruen, werte: kurve.werte.map((x) => x.genutzt / 1000), dick: true },
              { key: "ueber", label: t.serieUeber, farbe: FARBEN.sun, werte: kurve.werte.map((x) => x.ueberschuss / 1000) },
              { key: "verbrauch", label: t.serieVerbrauch, farbe: FARBEN.grau, werte: kurve.werte.map((x) => x.verbrauch / 1000), gestrichelt: true },
            ]}
            achsenFormat={(v) => `${fmt(v)} MWh`}
            ariaLabel={t.kurveAria}
            tooltip={(i) => (
              <>
                <p className="font-semibold">{`${fmt(kurve.xs[i])} m² ≈ ${fmt(kurve.werte[i].kwp)} kWp`}</p>
                <p className="text-white/70">
                  {t.ttGenutzt} <span className="ov-num font-semibold text-white">{fmt(kurve.werte[i].genutzt / 1000, 1)} MWh</span>
                </p>
                <p className="text-white/70">
                  {t.ttUeber} <span className="ov-num font-semibold text-white">{fmt(kurve.werte[i].ueberschuss / 1000, 1)} MWh</span>
                </p>
                <p className="text-white/70">
                  {t.ttEv} <span className="ov-num font-semibold text-ov-300">{fmt(kurve.werte[i].eigenverbrauch * 100)} %</span>
                </p>
              </>
            )}
          />
          <p className="px-5 pb-5 text-[12.5px] leading-relaxed text-ink-500 md:px-6">{t.kurveText}</p>
        </DiagrammKarte>
      }
    />
  );
}
