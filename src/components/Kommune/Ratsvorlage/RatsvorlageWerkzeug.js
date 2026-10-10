"use client";

// src/components/Kommune/Ratsvorlage/RatsvorlageWerkzeug.js – Kommunal-Rechner 2.0 mit Ratsvorlage (Welle 3, Paket B8)
//
//  DE  Einnahmen wie der Kommunal-Rechner (rechneKommune, unverändert) + Landesrecht des Bundeslands
//      (src/lib/rechner/kommunePflichten.js: Register-Fakten, „Prüfung ausstehend“, NICHT addiert).
//  AT  keine Geldwerte: Widmungsschritte, Stellen und Prüfpunkte des Bundeslands (Server-Props aus den Regionsdaten).
//  CH  erscheint nicht – die Seite zeigt den Länderhinweis (tools.js: laender ["DE", "AT"]).
//  Gemeinsame Seite (ohne Länderwahl): Umschalter Deutschland / Österreich im Werkzeug.
//
// Ergebnis immer frei sichtbar. Die Ratsvorlage (druckfertig, Muster) kommt über den Bericht-Baustein gegen Name und
// E-Mail (Double-Opt-in, Telefon freiwillig); die Gemeinde ist Teil der Eingaben. Der Server rechnet neu.

import { useMemo, useState } from "react";
import { CalendarRange, ExternalLink, FileText, HandCoins, Info, Landmark, ListChecks, MapPinned, Building2, Scale, TrendingUp } from "lucide-react";
import Link from "@/components/Land/Link";
import { cn } from "@/components/ui/cn";
import Textfeld from "@/components/formular/Textfeld";
import BerichtAnfordern from "@/components/Bericht/BerichtAnfordern";
import { LandHinweis } from "@/components/Land/LandHinweis";
import { useSeitenLand } from "@/components/Land/LandKontext";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Schalter, Zahl } from "@/components/Rechner/bausteine";
import { ErgebnisKopf, Hinweis, MobilKurz, RechnerRahmen } from "@/components/Rechner/InvestTeile";
import { STANDARD } from "@/lib/rechner/kommune";
import { STANDARD_BUNDESLAND, landesregelTexte, rechneKommunal2 } from "@/lib/rechner/kommunePflichten";
import { KOMMUNE, PACHT, ERLOESE } from "@/lib/invest/markt";

const GEMEINDE_MUSTER = /^[\p{L}\p{M}0-9 .,'’()/-]{2,80}$/u;

const TEXTE = {
  de: {
    land: "Land der Gemeinde",
    laender: { DE: "Deutschland", AT: "Österreich" },
    gemeindeGruppe: "Gemeinde",
    gemeinde: "Name der Gemeinde",
    gemeindeHinweis: "Erscheint im Kopf und im Sachverhalt der Ratsvorlage.",
    bundesland: "Bundesland",
    solarpark: "Solarpark",
    leistung: "Leistung",
    leistungHinweis: (ha, gwh) => `≈ ${ha} ha · ${gwh} GWh im ersten Jahr`,
    leistungAt: "Geplante Leistung (für den Betreff)",
    erloes: "Erlös des Parks",
    ct: (f, v) => `${f.fmt(v, 1)} ct/kWh`,
    erloesHinweis: (x) => `EEG-Zuschlag oder PPA, bestimmt die Gewerbesteuer. Zuletzt um ${x} ct/kWh.`,
    finanzen: "Gemeindefinanzen",
    hebesatz: "Gewerbesteuer-Hebesatz",
    pct: (f, v) => `${f.fmt(v)} %`,
    hebesatzHinweis: (x) => `Durchschnitt in Deutschland rund ${x} %.`,
    p6: "§ 6 EEG-Beteiligung",
    p6Text: (x) => `${x} ct je kWh – per Vertrag mit dem Betreiber`,
    flaechen: "Flächen der Gemeinde",
    flaechenText: "Park steht ganz oder teilweise auf Gemeindeflächen",
    anteil: "Anteil Gemeindefläche",
    pacht: "Pacht",
    proHa: (f, v) => `${f.fmt(v)} €/ha`,
    sitz: "Betreiber mit Sitz in der Gemeinde",
    sitzText: "100 % statt 90 % der Gewerbesteuer",
    titelDe: "Einnahmen und Landesrecht",
    titelAt: (bl) => `Widmung in ${bl}`,
    plakette: (bl, m) => `${bl} · ${m} MWp`,
    proJahr: "Ø pro Jahr",
    ersten: (n) => `in den ersten ${n} Jahren`,
    summe: (n) => `Summe ${n} Jahre`,
    alle: "§ 6 EEG, Gewerbesteuer, Pacht",
    laufzeit: "gesamte Laufzeit",
    p6Jahr1: "§ 6 EEG im ersten Jahr",
    p6Zusatz: "nur geförderter Strom",
    landesrecht: (bl) => `Landesrecht ${bl}`,
    pruefung: "Prüfung ausstehend",
    gilt: "Gilt für",
    ausnahmen: "Ausnahmen",
    orientierung: "Orientierung im ersten Betriebsjahr",
    art: {
      pflicht: "Pflichtzahlung",
      mindestens: "Mindestbeteiligung",
      angebot: "Angebot an die Gemeinde",
      ersatz: "Ersatzzahlung ohne Vereinbarung",
      unter_schwelle: "Schwelle nicht erreicht",
      offen: "Wert wird geprüft",
    },
    einwohner: (x) => `dazu Angebot an die Einwohner: ${x}`,
    nichtAddiert: "Nicht in den Summen oben: Ob und wie die Landeszahlung mit § 6 EEG verrechnet wird, regelt das Landesgesetz.",
    keinGesetz: "Kein eigenes Landesgesetz – es gilt § 6 EEG",
    quelle: "Quelle",
    stand: (s) => `Stand ${s}`,
    inhalt: "Ihre Ratsvorlage enthält",
    inhaltDe: ["Beschlussvorschlag als Muster", "Sachverhalt mit Ihrer Gemeinde und Ihrem Bundesland", "Finanzielle Auswirkungen aus dieser Rechnung", "Landesrecht mit Quelle", "Weiteres Verfahren", "Annahmenbuch mit Quellen und Stand"],
    inhaltAt: ["Beschlussvorschlag als Muster", "Sachverhalt mit Ihrer Gemeinde", "Ablauf und Stellen der Widmung im Bundesland", "Prüfpunkte mit Quellen", "Annahmenbuch mit Quellen und Stand"],
    muster: "Muster ohne Rechtsberatung – Zuständigkeiten und Wortlaut richten sich nach Ihrer Gemeindeordnung.",
    ablauf: "So läuft die Widmung",
    stellen: "Beteiligte Stellen",
    pruefpunkte: "Prüfpunkte vor der Widmung",
    kit: "Zum Widmungskit mit allen Prüfpunkten",
    region: (bl) => `Alles zu ${bl} auf der Regionsseite`,
    geldAt: "Pacht- und Rechenwerte",
    vorlageTitel: "Ratsvorlage als Muster anfordern",
    vorlageText: "Druckfertig mit Beschlussvorschlag, Sachverhalt, Zahlen und Annahmen samt Quellen – per Bestätigungslink an Ihre E-Mail-Adresse. Ihr Ergebnis oben bleibt ohne Angaben sichtbar.",
    vorlageKnopf: "Ratsvorlage anfordern",
    gemeindeFehlt: "Bitte tragen Sie zuerst den Namen der Gemeinde ein (Feld „Name der Gemeinde“).",
    vorlageTextAt: "Druckfertig mit Beschlussvorschlag, Sachverhalt, Widmungsschritten und Prüfpunkten samt Quellen – per Bestätigungslink an Ihre E-Mail-Adresse. Für Österreich ohne Geldwerte.",
    gespraech: "Vorhaben im Gemeinderat vorstellen lassen",
    sr: (a, b, n) => `Einnahmen der Gemeinde: durchschnittlich ${a} pro Jahr, ${b} in ${n} Jahren`,
  },
  en: {
    land: "Country of the municipality",
    laender: { DE: "Germany", AT: "Austria" },
    gemeindeGruppe: "Municipality",
    gemeinde: "Name of the municipality",
    gemeindeHinweis: "Appears in the header and facts of the council paper.",
    bundesland: "Federal state",
    solarpark: "Solar park",
    leistung: "Capacity",
    leistungHinweis: (ha, gwh) => `≈ ${ha} ha · ${gwh} GWh in the first year`,
    leistungAt: "Planned capacity (for the subject line)",
    erloes: "Park revenue",
    ct: (f, v) => `${f.fmt(v, 1)} ct/kWh`,
    erloesHinweis: (x) => `EEG award or PPA, determines the trade tax. Recently around ${x} ct/kWh.`,
    finanzen: "Municipal finances",
    hebesatz: "Trade tax multiplier (Hebesatz)",
    pct: (f, v) => f.pct(v),
    hebesatzHinweis: (x) => `German average around ${x}%.`,
    p6: "§ 6 EEG participation",
    p6Text: (x) => `${x} ct per kWh – by contract with the operator`,
    flaechen: "Municipal land",
    flaechenText: "The park stands wholly or partly on municipal land",
    anteil: "Share of municipal land",
    pacht: "Lease",
    proHa: (f, v) => f.eur(v, "/ha"),
    sitz: "Operator based in the municipality",
    sitzText: "100% instead of 90% of the trade tax",
    titelDe: "Income and state law",
    titelAt: (bl) => `Zoning in ${bl}`,
    plakette: (bl, m) => `${bl} · ${m} MWp`,
    proJahr: "Ø per year",
    ersten: (n) => `in the first ${n} years`,
    summe: (n) => `Total over ${n} years`,
    alle: "§ 6 EEG, trade tax, lease",
    laufzeit: "entire term",
    p6Jahr1: "§ 6 EEG in the first year",
    p6Zusatz: "subsidised power only",
    landesrecht: (bl) => `State law ${bl}`,
    pruefung: "Review pending",
    gilt: "Applies to",
    ausnahmen: "Exceptions",
    orientierung: "Guide value in the first operating year",
    art: {
      pflicht: "Mandatory payment",
      mindestens: "Minimum participation",
      angebot: "Offer to the municipality",
      ersatz: "Substitute payment without agreement",
      unter_schwelle: "Threshold not reached",
      offen: "Rate under review",
    },
    einwohner: (x) => `plus offer to residents: ${x}`,
    nichtAddiert: "Not included in the totals above: the state law governs whether and how the state payment is offset against § 6 EEG.",
    keinGesetz: "No state law of its own – § 6 EEG applies",
    quelle: "Source",
    stand: (s) => `As of ${s}`,
    inhalt: "Your council paper contains",
    inhaltDe: ["Draft resolution as a template", "Facts with your municipality and federal state", "Financial impact from this calculation", "State law with source", "Next steps in the procedure", "Assumptions with sources and dates"],
    inhaltAt: ["Draft resolution as a template", "Facts with your municipality", "Zoning procedure and authorities in the federal state", "Checkpoints with sources", "Assumptions with sources and dates"],
    muster: "Template without legal advice – responsibilities and wording follow your municipal code. The council paper itself is in German.",
    ablauf: "How zoning works",
    stellen: "Authorities involved",
    pruefpunkte: "Checkpoints before zoning",
    kit: "To the zoning kit with all checkpoints",
    region: (bl) => `Everything on ${bl} on the region page`,
    geldAt: "Lease rates and figures",
    vorlageTitel: "Request the council paper template",
    vorlageText: "Ready to print with draft resolution, facts, figures and assumptions including sources – via a confirmation link to your email address. Your result above stays visible without entering any details.",
    vorlageKnopf: "Request council paper",
    gemeindeFehlt: "Please enter the name of the municipality first (field “Name of the municipality”).",
    vorlageTextAt: "Ready to print with draft resolution, facts, zoning steps and checkpoints including sources – via a confirmation link to your email address. For Austria without monetary values. The paper itself is in German.",
    gespraech: "Have the project presented to the council",
    sr: (a, b, n) => `Municipal income: an average of ${a} per year, ${b} over ${n} years`,
  },
};

const tsdMit = (f) => (v) =>
  f.sprache === "en" ? (Math.abs(v) >= 1e6 ? `€${f.fmt(v / 1e6, 2)}m` : `€${f.fmt(Math.round(v / 1000))}k`) : Math.abs(v) >= 1e6 ? `${f.fmt(v / 1e6, 2)} Mio. €` : `${f.fmt(Math.round(v / 1000))} T€`;

/**
 * @param {{ namen: Record<string,string>, bundeslaender: { DE: string[], AT: string[] }, widmung: Record<string, object>, standDatum?: string }} p
 *   namen: Bundesland-Slug → Name in der Sprache der Seite; widmung: AT-Slug → Widmungskit (Server, Regionsdaten)
 */
export default function RatsvorlageWerkzeug({ namen, bundeslaender, widmung }) {
  const seitenLand = useSeitenLand();
  const t = useTexte(TEXTE);
  const [landWahl, setLandWahl] = useState(seitenLand === "AT" ? "AT" : "DE");
  const land = seitenLand === "AT" || seitenLand === "DE" ? seitenLand : landWahl;
  const [gemeinde, setGemeinde] = useState("");
  const [blDe, setBlDe] = useState(STANDARD_BUNDESLAND.DE);
  const [blAt, setBlAt] = useState(STANDARD_BUNDESLAND.AT);
  const [mwp, setMwp] = useState(STANDARD.mwp);
  const [hebesatz, setHebesatz] = useState(STANDARD.hebesatz);
  const [paragraph6, setP6] = useState(STANDARD.paragraph6);
  const [gemeindeflaeche, setGemeindeflaeche] = useState(STANDARD.gemeindeflaeche);
  const [anteilGemeinde, setAnteil] = useState(STANDARD.anteilGemeinde);
  const [pachtHa, setPachtHa] = useState(STANDARD.pachtHa);
  const [sitzInGemeinde, setSitz] = useState(STANDARD.sitzInGemeinde);
  const [preisCt, setPreisCt] = useState(STANDARD.preisCt);

  const gemeindeName = gemeinde.trim().replace(/\s{2,}/g, " ");
  const gemeindeOk = GEMEINDE_MUSTER.test(gemeindeName);
  const bundesland = land === "AT" ? blAt : blDe;

  const eingabenDe = useMemo(
    () => ({ bundesland: blDe, mwp, hebesatz, paragraph6, gemeindeflaeche, anteilGemeinde, pachtHa, sitzInGemeinde, preisCt }),
    [blDe, mwp, hebesatz, paragraph6, gemeindeflaeche, anteilGemeinde, pachtHa, sitzInGemeinde, preisCt]
  );
  const r = useMemo(() => (land === "DE" ? rechneKommunal2(eingabenDe) : null), [land, eingabenDe]);
  const eingabenBericht = land === "AT" ? { gemeinde: gemeindeName, bundesland: blAt, mwp } : { gemeinde: gemeindeName, ...eingabenDe };

  const landUmschalter =
    seitenLand === null ? (
      <Auswahl legende={t.land} wert={landWahl} onChange={setLandWahl} optionen={["DE", "AT"].map((id) => ({ id, label: t.laender[id] }))} />
    ) : null;

  const gemeindeFelder = (
    <Gruppe titel={t.gemeindeGruppe}>
      <Textfeld id="rv-gemeinde" label={t.gemeinde} hinweis={t.gemeindeHinweis} maxLength={80} autoComplete="off" value={gemeinde} onChange={(e) => setGemeinde(e.target.value)} gueltig={gemeindeOk} />
      <Textfeld id="rv-bundesland" als="select" label={t.bundesland} value={bundesland} onChange={(e) => (land === "AT" ? setBlAt(e.target.value) : setBlDe(e.target.value))}>
        {bundeslaender[land].map((slug) => (
          <option key={slug} value={slug}>
            {namen[slug] || slug}
          </option>
        ))}
      </Textfeld>
    </Gruppe>
  );

  const anfordern = (
    <BerichtAnfordern
      rechner="ratsvorlage"
      land={land}
      eingaben={eingabenBericht}
      texte={{
        de: { titel: TEXTE.de.vorlageTitel, text: land === "AT" ? TEXTE.de.vorlageTextAt : TEXTE.de.vorlageText, knopf: TEXTE.de.vorlageKnopf },
        en: { titel: TEXTE.en.vorlageTitel, text: land === "AT" ? TEXTE.en.vorlageTextAt : TEXTE.en.vorlageText, knopf: TEXTE.en.vorlageKnopf },
      }}
      deaktiviert={!gemeindeOk}
      deaktiviertHinweis={t.gemeindeFehlt}
    />
  );

  if (land === "AT") {
    const kit = widmung[blAt];
    return (
      <RechnerRahmen
        werkzeuge={false}
        eingaben={
          <div className="space-y-8">
            {landUmschalter}
            {gemeindeFelder}
            <Gruppe titel={t.solarpark}>
              <Regler label={t.leistungAt} wert={mwp} min={1} max={150} step={1} einheit="MWp" onChange={setMwp} />
            </Gruppe>
          </div>
        }
        ergebnis={
          <>
            <ErgebnisKopf titel={t.titelAt(namen[blAt] || blAt)} plakette={t.plakette(namen[blAt] || blAt, mwp)} />
            <LandHinweis land="AT" thema="Pacht- und Rechenwerte" themaEn={TEXTE.en.geldAt} zeile className="mt-4" />
            {kit ? <Widmung kit={kit} t={t} /> : null}
            <Inhalt t={t} punkte={t.inhaltAt} />
            {anfordern}
          </>
        }
      />
    );
  }

  return <Deutschland r={r} t={t} namen={namen} landUmschalter={landUmschalter} gemeindeFelder={gemeindeFelder} anfordern={anfordern} werte={{ mwp, hebesatz, paragraph6, gemeindeflaeche, anteilGemeinde, pachtHa, sitzInGemeinde, preisCt }} setzer={{ setMwp, setHebesatz, setP6, setGemeindeflaeche, setAnteil, setPachtHa, setSitz, setPreisCt }} />;
}

function Deutschland({ r, t, namen, landUmschalter, gemeindeFelder, anfordern, werte, setzer }) {
  const f = useFormate();
  const { fmt } = f;
  const tsd = tsdMit(f);
  const k = r.kommune;
  const lr = r.landesregel;
  const blName = namen[r.bundesland.slug] || r.bundesland.name;
  return (
    <RechnerRahmen
      eingaben={
        <>
          <MobilKurz
            werte={[
              [t.proJahr, tsd(k.proJahr)],
              [t.summe(k.N), tsd(k.gesamt.summe)],
              [t.summe(k.L), tsd(k.gesamtLaufzeit.summe)],
            ]}
          />
          <div className="space-y-8">
            {landUmschalter}
            {gemeindeFelder}
            <Gruppe titel={t.solarpark}>
              <Regler label={t.leistung} wert={werte.mwp} min={1} max={150} step={1} einheit="MWp" onChange={setzer.setMwp} hinweis={t.leistungHinweis(fmt(k.flaecheHa, 1), fmt(k.ertragJahr1 / 1e6, 1))} />
              <Regler label={t.erloes} wert={werte.preisCt} min={4} max={8} step={0.1} stellen={1} format={(v) => t.ct(f, v)} onChange={setzer.setPreisCt} hinweis={t.erloesHinweis(fmt(ERLOESE.eegFreiflaecheCt, 1))} />
            </Gruppe>
            <Gruppe titel={t.finanzen}>
              <Regler label={t.hebesatz} wert={werte.hebesatz} min={KOMMUNE.hebesatzSpanne.min} max={KOMMUNE.hebesatzSpanne.max} step={0.05} format={(v) => t.pct(f, v * 100)} onChange={setzer.setHebesatz} hinweis={t.hebesatzHinweis(fmt(KOMMUNE.hebesatz * 100))} />
              <Schalter icon={HandCoins} label={t.p6} beschreibung={t.p6Text(fmt(KOMMUNE.beteiligungCt, 1))} an={werte.paragraph6} onChange={setzer.setP6} />
              <Schalter icon={MapPinned} label={t.flaechen} beschreibung={t.flaechenText} an={werte.gemeindeflaeche} onChange={setzer.setGemeindeflaeche}>
                <div className="space-y-5">
                  <Regler label={t.anteil} wert={werte.anteilGemeinde} min={0.1} max={1} step={0.05} format={(v) => t.pct(f, v * 100)} onChange={setzer.setAnteil} />
                  <Regler label={t.pacht} wert={werte.pachtHa} min={PACHT.freiflaecheProHa.min} max={PACHT.freiflaecheProHa.max + 500} step={100} format={(v) => t.proHa(f, v)} onChange={setzer.setPachtHa} />
                </div>
              </Schalter>
              <Schalter icon={Building2} label={t.sitz} beschreibung={t.sitzText} an={werte.sitzInGemeinde} onChange={setzer.setSitz} />
            </Gruppe>
          </div>
        </>
      }
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">{t.sr(tsd(k.proJahr), tsd(k.gesamt.summe), k.N)}</p>
          <ErgebnisKopf titel={t.titelDe} plakette={t.plakette(blName, werte.mwp)} />
          <Hauptzahl
            className="mt-5"
            icon={TrendingUp}
            label={t.proJahr}
            zusatz={t.ersten(k.N)}
            rechts={
              <div className="sm:text-right">
                <p className="flex items-center gap-1.5 text-[12.5px] text-white/75 sm:justify-end">
                  <Landmark aria-hidden="true" className="h-3.5 w-3.5" />
                  {t.summe(k.N)}
                </p>
                <p className="ov-kpi mt-0.5 text-white">
                  <Zahl wert={k.gesamt.summe} format={tsd} />
                </p>
                <p className="text-[12.5px] text-white/75">{t.alle}</p>
              </div>
            }
          >
            <Zahl wert={k.proJahr} format={tsd} delta="dunkel" einlauf />
          </Hauptzahl>
          <Belege spalten={2}>
            <Kennzahl ton="akzent" icon={CalendarRange} label={t.summe(k.L)} zusatz={t.laufzeit}>
              <Zahl wert={k.gesamtLaufzeit.summe} format={tsd} delta="hell" />
            </Kennzahl>
            <Kennzahl icon={HandCoins} label={t.p6Jahr1} zusatz={t.p6Zusatz}>
              {f.fmtEur(r.p6Jahr1)}
            </Kennzahl>
          </Belege>
          <Landesrecht lr={lr} slug={r.bundesland.slug} blName={blName} t={t} />
          <Inhalt t={t} punkte={t.inhaltDe} />
          {anfordern}
        </>
      }
    />
  );
}

function Landesrecht({ lr, slug, blName, t }) {
  const f = useFormate();
  const sprache = f.sprache === "en" ? "en" : "de";
  const texte = landesregelTexte(slug, sprache);
  return (
    <section aria-labelledby="rv-landesrecht" className="mt-6 rounded-3xl bg-white p-5 shadow-e1 ring-1 ring-ink-200/70 md:p-6" data-landesregel={slug}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="rv-landesrecht" className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
          <Scale aria-hidden="true" className="h-4 w-4 text-ov-700" />
          {t.landesrecht(blName)}
        </h3>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-50 px-2.5 py-0.5 text-[12px] font-semibold text-sun-700 ring-1 ring-inset ring-sun-200">{lr.hatGesetz ? `${lr.gesetz} · ${t.pruefung}` : t.keinGesetz}</span>
      </div>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-700">{texte.kern}</p>
      {(texte.gilt || texte.ausnahmen) && (
        <dl className="mt-3 space-y-1.5 text-[13.5px] leading-relaxed">
          {texte.gilt && (
            <div>
              <dt className="inline font-semibold text-ink-800">{t.gilt}: </dt>
              <dd className="inline text-ink-700">{texte.gilt}</dd>
            </div>
          )}
          {texte.ausnahmen && (
            <div>
              <dt className="inline font-semibold text-ink-800">{t.ausnahmen}: </dt>
              <dd className="inline text-ink-700">{texte.ausnahmen}</dd>
            </div>
          )}
        </dl>
      )}
      {lr.hatGesetz && (
        <div className="mt-4 rounded-2xl bg-sand-50 px-4 py-3 ring-1 ring-inset ring-ink-200/70">
          <p className="text-[12.5px] font-medium text-ink-600">
            {t.orientierung} · {t.art[lr.art] || ""}
          </p>
          <p className="ov-num mt-0.5 font-display text-[22px] font-extrabold tracking-tight text-ink-900">{lr.betrag != null && lr.gilt ? f.fmtEur(lr.betrag) : "–"}</p>
          <p className="text-[12.5px] text-ink-600">
            {texte.formel}
            {lr.einwohner ? ` · ${t.einwohner(f.fmtEur(lr.einwohner))}` : ""}
          </p>
        </div>
      )}
      {lr.hatGesetz && (
        <Hinweis icon={Info} className="mt-3">
          {t.nichtAddiert}
        </Hinweis>
      )}
      {lr.quelle?.url && (
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
          {t.quelle}:{" "}
          <a href={lr.quelle.url} target="_blank" rel="noopener noreferrer" className="underline decoration-ink-300 underline-offset-2 hover:text-ink-800">
            {lr.quelle.titel}
          </a>{" "}
          · {t.stand(lr.stand)}
        </p>
      )}
    </section>
  );
}

function Widmung({ kit, t }) {
  return (
    <div className="mt-5 space-y-5">
      <section aria-labelledby="rv-ablauf" className="rounded-3xl bg-ink-50 p-5 md:p-6">
        <h3 id="rv-ablauf" className="font-display text-[17px] font-bold text-ink-900">
          {t.ablauf}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-700">{kit.ablauf}</p>
        <h4 className="mt-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-500">{t.stellen}</h4>
        <ol className="mt-2 space-y-2">
          {kit.stellen.map((s, i) => (
            <li key={s.name} className="flex gap-3 text-[14px] leading-relaxed">
              <span aria-hidden="true" className="ov-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[12px] font-bold text-ov-800 ring-1 ring-inset ring-ov-200">
                {i + 1}
              </span>
              <span className="min-w-0">
                <strong className="font-semibold text-ink-900">{s.name}</strong> – <span className="text-ink-700">{s.rolle}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="rv-pruefpunkte" className="rounded-3xl bg-white p-5 shadow-e1 ring-1 ring-ink-200/70 md:p-6">
        <h3 id="rv-pruefpunkte" className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
          <ListChecks aria-hidden="true" className="h-4 w-4 text-ov-700" />
          {t.pruefpunkte}
        </h3>
        <ul className="mt-3 space-y-2.5">
          {kit.pruefpunkte.map((p) => (
            <li key={p.titel} className="text-[14px] leading-relaxed">
              <span className="font-semibold text-ink-900">{p.titel}</span>{" "}
              <a href={p.quelle.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12.5px] text-ink-500 underline decoration-ink-300 underline-offset-2 hover:text-ink-800">
                {t.quelle}
                <ExternalLink aria-hidden="true" className="h-3 w-3" />
                <span className="sr-only">: {p.quelle.titel}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-col gap-2 text-[14px] font-semibold sm:flex-row sm:flex-wrap sm:gap-x-5">
          <Link href="/kommunen/widmungskit" className="text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current">
            {t.kit}
          </Link>
          <Link href={kit.href} className="text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current">
            {t.region(kit.name)}
          </Link>
        </div>
      </section>
    </div>
  );
}

function Inhalt({ t, punkte }) {
  return (
    <section aria-labelledby="rv-inhalt" className="mt-6 rounded-3xl bg-ink-50 p-5 md:p-6">
      <h3 id="rv-inhalt" className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
        <FileText aria-hidden="true" className="h-4 w-4 text-ov-700" />
        {t.inhalt}
      </h3>
      <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-[14px] text-ink-700 sm:grid-cols-2">
        {punkte.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <p className={cn("mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-600")}>
        <Scale aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.muster}
      </p>
    </section>
  );
}
