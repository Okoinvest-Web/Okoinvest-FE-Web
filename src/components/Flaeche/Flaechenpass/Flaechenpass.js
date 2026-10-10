"use client";

// src/components/Flaeche/Flaechenpass/Flaechenpass.js – Flächenpass Stufe 1 (Welle 3, Paket B6)
//
// 1. Lage und Fläche: Land (nur auf der gemeinsamen Seite), Bundesland, Fläche einzeichnen (Karte erst nach Klick,
//    siehe Karte.js) oder Größe angeben.
// 2. Wenige Fragen zur Fläche → Ergebnis rechts: Eignung (interne Scoring-Engine), ha, Leistung, Ertrag.
// 3. Checkliste der Restriktionen je Land (Antworten + veröffentlichte Regionsdaten mit Quelle) und der Bericht-Baustein
//    (Name/E-Mail, Telefon freiwillig; Fläche und ha gehen erst mit dem Absenden an den Server).
// Rechenlogik: src/lib/rechner/flaechenpass.js · Texte: src/lib/rechner/flaechenpassTexte.js
// Keine Geldwerte in keinem Land (Pacht: Pachtrechner, Länder-Sperre AT/CH).

import { useCallback, useId, useMemo, useState } from "react";
import { CircleAlert, CircleCheck, CircleHelp, CircleMinus, ExternalLink, Gauge, MapPinned, Ruler, Sun, Zap } from "lucide-react";
import Link from "@/components/Land/Link";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl } from "@/components/Rechner/bausteine";
import { ErgebnisKopf, Hinweis, MobilKurz, RechnerRahmen } from "@/components/Rechner/InvestTeile";
import BerichtAnfordern from "@/components/Bericht/BerichtAnfordern";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { auswahlKlasse, feldKlasse, labelKlasse, hinweisKlasse } from "@/components/formular/stil";
import { fmtZahl } from "@/lib/sprache/format";
import { GRENZEN, OPTIONEN, STANDARD, checkliste, flaechenpass, fragenFuer, regionenFuer } from "@/lib/rechner/flaechenpass";
import { angabeText, koText, kriteriumZeile, optionText, textePass } from "@/lib/rechner/flaechenpassTexte";
import FlaechenKarte, { haText } from "./Karte";

const UI = {
  de: {
    schritt1: "Schritt 1 · Lage und Fläche",
    land: "Land",
    region: "Bundesland",
    regionWaehlen: "Bitte wählen",
    modus: "Fläche",
    modi: { karte: ["Auf der Karte einzeichnen", "genauer"], angabe: ["Größe angeben", "ohne Karte"] },
    ha: "Größe in Hektar",
    haHinweis: "0,1 bis 2.000 ha, Komma erlaubt",
    haFehler: "Bitte eine Größe zwischen 0,1 und 2.000 ha angeben.",
    flaeche: "Ihre Fläche",
    gruppen: { flaeche: "Die Fläche heute", umfeld: "Umfeld und Netz", recht: { DE: "Kulisse und Baurecht", AT: "Widmung", CH: "Standort" } },
    ergebnis: "Ihr Flächenpass",
    eignung: "Eignung",
    vonHundert: "von 100 Punkten",
    prio: (p) => `Vorrang ${p}`,
    flaecheKz: "Fläche",
    gezeichnet: "eingezeichnet",
    angegeben: "angegeben",
    leistung: "Mögliche Leistung",
    leistungZ: "Freifläche Süd, fest",
    ertrag: "Stromertrag",
    ertragZ: (w) => `≈ ${w} kWh/kWp`,
    offen: (n) => `${n} ${n === 1 ? "Punkt ist" : "Punkte sind"} offen – sie gehen mit einem mittleren Wert ein und werden im Gespräch geprüft. Die Einschätzung ist vorläufig.`,
    bewertung: "So kommt die Eignung zustande",
    punkte: "Punkte",
    leer: "Wählen Sie ein Bundesland und zeichnen Sie Ihre Fläche ein – oder geben Sie die Größe an.",
    leerKarte: "Zeichnen Sie Ihre Fläche ein (mindestens drei Ecken, dann schließen) – oder geben Sie die Größe an.",
    checkTitel: "Restriktionen und nächste Prüfschritte",
    checkLead: (r) => `Ihre Angaben, der Rechtsrahmen für ${r} mit Quellen und die Kriterien, die wir vor Ort prüfen.`,
    angaben: "Nach Ihren Angaben",
    recht: (r) => `Rechtsrahmen ${r}`,
    rechtLink: (r) => `Alles zu ${r}`,
    restriktionen: "Ausschluss- und Restriktionskriterien",
    restriktionenText: "Trifft davon etwas zu? Das klären wir im Gespräch – oft gibt es trotzdem einen Weg.",
    keinRecht: "Den Rechtsrahmen prüfen wir im Gespräch.",
    pacht: "Was bringt die Fläche als Pacht?",
    pachtText: "Der Flächenpass nennt bewusst keine Geldwerte. Die Pachtspanne rechnet der Pachtrechner.",
    pachtLink: "Zum Pachtrechner",
    // AT/CH: Pachtwerte sind gesperrt (Länder-Sperre) – kein Verweis auf eine Spanne
    pachtTextLand: (n) => `Der Flächenpass nennt bewusst keine Geldwerte. Pachtwerte für ${n} nennen wir erst nach der Prüfung Ihrer Fläche – im persönlichen Gespräch.`,
    pachtLinkLand: "Zum Kontakt",
    stand: "Grobe Ersteinschätzung aus Ihren Angaben – kein Angebot, keine Rechtsauskunft.",
  },
  en: {
    schritt1: "Step 1 · Location and land",
    land: "Country",
    region: "Federal state",
    regionWaehlen: "Please choose",
    modus: "Land",
    modi: { karte: ["Draw on the map", "more precise"], angabe: ["Enter size", "without map"] },
    ha: "Size in hectares",
    haHinweis: "0.1 to 2,000 ha",
    haFehler: "Please enter a size between 0.1 and 2,000 ha.",
    flaeche: "Your land",
    gruppen: { flaeche: "The land today", umfeld: "Surroundings and grid", recht: { DE: "Land category and building law", AT: "Zoning", CH: "Site" } },
    ergebnis: "Your land passport",
    eignung: "Suitability",
    vonHundert: "out of 100 points",
    prio: (p) => `Priority ${p}`,
    flaecheKz: "Land",
    gezeichnet: "drawn",
    angegeben: "entered",
    leistung: "Possible capacity",
    leistungZ: "ground-mounted, south, fixed",
    ertrag: "Power yield",
    ertragZ: (w) => `≈ ${w} kWh/kWp`,
    offen: (n) => `${n} ${n === 1 ? "point is" : "points are"} open – they count with a medium value and will be checked in a conversation. The assessment is provisional.`,
    bewertung: "How the suitability is derived",
    punkte: "points",
    leer: "Choose a federal state and draw your land – or enter its size.",
    leerKarte: "Draw your land (at least three corners, then close it) – or enter its size.",
    checkTitel: "Restrictions and next checks",
    checkLead: (r) => `Your input, the legal framework for ${r} with sources and the criteria we check on site.`,
    angaben: "According to your input",
    recht: (r) => `Legal framework ${r}`,
    rechtLink: (r) => `All about ${r}`,
    restriktionen: "Exclusion and restriction criteria",
    restriktionenText: "Does any of this apply? We clarify it in a conversation – there is often still a way.",
    keinRecht: "We check the legal framework in a conversation.",
    pacht: "What would the land earn as a lease?",
    pachtText: "The land passport deliberately shows no monetary values. The lease calculator works out the lease range.",
    pachtLink: "To the lease calculator",
    pachtTextLand: (n) => `The land passport deliberately shows no monetary values. We only state lease values for ${n} after assessing your land – in a personal conversation.`,
    pachtLinkLand: "Contact us",
    stand: "Rough initial assessment based on your input – not an offer, not legal advice.",
  },
};

const LAND_NAMEN = { de: { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" }, en: { DE: "Germany", AT: "Austria", CH: "Switzerland" } };
const STUFE_STIL = {
  gut: { icon: CircleCheck, farbe: "text-ov-600", chip: "bg-ov-50 text-ov-800 ring-ov-200" },
  pruefen: { icon: CircleMinus, farbe: "text-sun-500", chip: "bg-sun-50 text-sun-700 ring-sun-200" },
  kritisch: { icon: CircleAlert, farbe: "text-danger-600", chip: "bg-danger-50 text-danger-700 ring-danger-200" },
  offen: { icon: CircleHelp, farbe: "text-navy-400", chip: "bg-ink-100 text-ink-700 ring-ink-200" },
};
const AMPEL_FARBE = { gruen: "bg-ov-500", gelb: "bg-sun-400", rot: "bg-ink-300" };

const haLesen = (text, en) => {
  const roh = String(text).trim().split(" ").join("");
  const s = en ? roh.split(",").join("") : roh.replace(",", ".");
  const n = Number(s);
  return s && Number.isFinite(n) ? n : null;
};

/**
 * Props: land (Land der Seite oder null = gemeinsame Seite), regionen ({ slug: { name, ertrag, recht, schwierig, href } }
 * in der Sprache der Seite – vom Server aus den Regionsdaten).
 */
export default function Flaechenpass({ land: seitenLand = null, regionen: regionDaten = {} }) {
  const sprache = useSprache();
  const en = sprache === "en";
  const u = en ? UI.en : UI.de;
  const t = textePass(sprache);
  const id = useId();
  const z = (n, s = 0) => fmtZahl(n, s, sprache);

  const [land, setLand] = useState(seitenLand || "DE");
  const [region, setRegion] = useState(() => (regionenFuer(seitenLand || "DE").length === 1 ? regionenFuer(seitenLand || "DE")[0].slug : ""));
  const [modus, setModus] = useState("karte");
  const [zeichnung, setZeichnung] = useState(null);
  const [haEingabe, setHaEingabe] = useState(en ? "10" : "10");
  const [a, setA] = useState({ ...STANDARD, verkehr: "unbekannt", benachteiligt: "unbekannt", zone: "unbekannt", uw: "unbekannt", eignung: "unbekannt", vorbelastet: "unbekannt", fff: "unbekannt" });
  const setze = (k) => (v) => setA((alt) => ({ ...alt, [k]: v }));

  const landWechsel = (l) => {
    setLand(l);
    const liste = regionenFuer(l);
    setRegion(liste.length === 1 ? liste[0].slug : "");
    setZeichnung(null);
  };
  const regionWechsel = (slug) => {
    setRegion(slug);
    setZeichnung(null);
  };
  const aufZeichnung = useCallback((x) => setZeichnung(x), []);

  const haWert = haLesen(haEingabe, en);
  const haOk = haWert != null && haWert >= GRENZEN.haMin && haWert <= GRENZEN.haMax;
  const fragen = fragenFuer(land, region);
  const bereit = Boolean(region) && (modus === "karte" ? Boolean(zeichnung) : haOk);
  const rd = regionDaten[region] || null;
  const regionName = rd?.name || regionenFuer(land).find((r) => r.slug === region)?.name || "";

  const pass = useMemo(() => {
    if (!bereit) return null;
    const ein = { region, ...(modus === "karte" ? { flaeche: zeichnung.flaeche } : { ha: haWert }) };
    for (const k of ["nutzung", "neigung", "exposition", "schutz", "siedlung", "netz", ...fragen]) ein[k] = a[k];
    return flaechenpass(ein, land, { ertragKwhProKwp: rd?.ertrag });
  }, [bereit, region, modus, zeichnung, haWert, a, fragen, land, rd]);

  const liste = useMemo(() => (pass ? checkliste(pass, rd ? { recht: rd.recht, kulisse: { schwierig: rd.schwierig } } : null) : null), [pass, rd]);
  const opt = (feld) => OPTIONEN[feld].map((x) => ({ id: x, label: optionText(t, feld, x), sub: t.optionSub[feld]?.[x] }));
  const offenOhneKapazitaet = pass ? pass.offen.filter((x) => x !== "kapazitaet").length : 0;

  // ------------------------------------------------------------------ Karte 1: Lage und Fläche
  const lage = (
    <div className="overflow-clip rounded-[2rem] bg-white p-5 shadow-[0_40px_80px_-40px_rgba(3,18,43,0.45)] ring-1 ring-ink-200/70 sm:p-6 md:p-8">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ink-500">{u.schritt1}</p>
      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] lg:items-end">
        {!seitenLand && <Auswahl legende={u.land} wert={land} onChange={landWechsel} optionen={["DE", "AT", "CH"].map((l) => ({ id: l, label: LAND_NAMEN[sprache === "en" ? "en" : "de"][l] }))} klein />}
        {regionenFuer(land).length > 1 && (
          <div className={seitenLand ? "lg:col-span-2" : undefined}>
            <label htmlFor={`${id}-region`} className="mb-2.5 block text-[14.5px] font-semibold text-ink-800">
              {u.region}
            </label>
            <div className="relative">
              <select id={`${id}-region`} value={region} onChange={(e) => regionWechsel(e.target.value)} className={auswahlKlasse(false)}>
                <option value="">{u.regionWaehlen}</option>
                {regionenFuer(land).map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {regionDaten[r.slug]?.name || r.name}
                  </option>
                ))}
              </select>
              <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-500">▾</span>
            </div>
          </div>
        )}
        <Auswahl
          legende={u.modus}
          wert={modus}
          onChange={setModus}
          optionen={[
            { id: "karte", label: u.modi.karte[0], sub: u.modi.karte[1] },
            { id: "angabe", label: u.modi.angabe[0], sub: u.modi.angabe[1] },
          ]}
          klein
        />
      </div>
      <div className="mt-6">
        {modus === "karte" ? (
          region ? (
            <FlaechenKarte key={`${land}-${region}`} land={land} zentrum={regionenFuer(land).find((r) => r.slug === region)?.zentrum} wert={zeichnung?.flaeche || ""} onChange={aufZeichnung} />
          ) : (
            <p className="rounded-2xl bg-sand-50 p-5 text-[14.5px] text-ink-600 ring-1 ring-ink-200/70">{u.leer}</p>
          )
        ) : (
          <div className="max-w-sm">
            <label htmlFor={`${id}-ha`} className={labelKlasse(false)}>
              {u.ha}
            </label>
            <div className="relative">
              <input
                id={`${id}-ha`}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={haEingabe}
                onChange={(e) => setHaEingabe(e.target.value)}
                aria-invalid={!haOk}
                aria-describedby={`${id}-ha-h`}
                className={cn(feldKlasse(false), "pr-12")}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-ink-500">ha</span>
            </div>
            <p id={`${id}-ha-h`} className={cn(hinweisKlasse(false), !haOk && "font-medium text-danger-700")}>
              {haOk ? u.haHinweis : u.haFehler}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // ------------------------------------------------------------------ Eingaben (links)
  const eingaben = (
    <div className="space-y-8">
      {pass && <MobilKurz werte={[[u.eignung, `${pass.score}/100`], [u.flaecheKz, haText(pass.ha, sprache)], [u.leistung, `${z(pass.mwp, 1)} MWp`]]} />}
      <Gruppe titel={u.gruppen.flaeche}>
        <Auswahl legende={t.fragen.nutzung} wert={a.nutzung} onChange={setze("nutzung")} optionen={opt("nutzung")} spalten={2} klein />
        <Auswahl legende={t.fragen.neigung} wert={a.neigung} onChange={setze("neigung")} optionen={opt("neigung")} spalten={2} klein />
        {a.neigung !== "eben" && <Auswahl legende={t.fragen.exposition} wert={a.exposition} onChange={setze("exposition")} optionen={opt("exposition")} klein />}
      </Gruppe>
      <Gruppe titel={u.gruppen.umfeld}>
        <Auswahl legende={t.fragen.schutz} wert={a.schutz} onChange={setze("schutz")} optionen={opt("schutz")} spalten={2} klein />
        <Auswahl legende={t.fragen.siedlung} wert={a.siedlung} onChange={setze("siedlung")} optionen={opt("siedlung")} spalten={2} klein />
        <div>
          <Auswahl legende={t.fragen.netz} wert={a.netz} onChange={setze("netz")} optionen={opt("netz")} spalten={3} klein />
          <p className="mt-2 text-[12.5px] leading-snug text-ink-500">{t.fragen.netzHinweis}</p>
        </div>
      </Gruppe>
      {fragen.length > 0 && (
        <Gruppe titel={u.gruppen.recht[land]}>
          {fragen.map((f) => (
            <div key={f}>
              <Auswahl legende={t.fragen[f]} wert={a[f]} onChange={setze(f)} optionen={opt(f).filter((o) => !(f === "zone" && region === "burgenland" && o.id === "angrenzend"))} spalten={2} klein />
              {f === "verkehr" && <p className="mt-2 text-[12.5px] leading-snug text-ink-500">{t.fragen.verkehrHinweis}</p>}
            </div>
          ))}
        </Gruppe>
      )}
    </div>
  );

  // ------------------------------------------------------------------ Ergebnis (rechts)
  const ergebnis = pass ? (
    <div>
      <ErgebnisKopf titel={u.ergebnis} plakette={regionName} />
      <Hauptzahl
        className="mt-5"
        label={u.eignung}
        icon={Gauge}
        zusatz={
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className={cn("h-3 w-3 shrink-0 rounded-full ring-4 ring-white/10", AMPEL_FARBE[pass.ampel])} />
            <span className="font-semibold text-white">{t.ampel[pass.ampel]}</span>
            <span className="text-white/60">· {u.prio(pass.prioritaet)}</span>
          </span>
        }
        rechts={<p className="max-w-[16rem] text-[13px] leading-snug text-white/75">{t.ampelText[pass.ampel]}</p>}
      >
        <span aria-live="polite">
          {pass.score}
          <span className="ml-2 text-[0.4em] font-semibold text-white/60">{u.vonHundert}</span>
        </span>
      </Hauptzahl>
      <Belege>
        <Kennzahl label={u.flaecheKz} icon={Ruler} zusatz={pass.gezeichnet ? u.gezeichnet : u.angegeben}>
          {haText(pass.ha, sprache)}
        </Kennzahl>
        <Kennzahl label={u.leistung} icon={Zap} zusatz={u.leistungZ}>
          {z(pass.mwp, 1)} MWp
        </Kennzahl>
        <Kennzahl label={u.ertrag} icon={Sun} zusatz={u.ertragZ(z(pass.ertragKwhProKwp))} className="col-span-2 xl:col-span-1">
          {pass.ertragMwh >= 10000 ? `${z(pass.ertragMwh / 1000, 1)} GWh` : `${z(pass.ertragMwh)} MWh`}
        </Kennzahl>
      </Belege>
      {pass.ko.length > 0 && (
        <div className="mt-4 space-y-2">
          {pass.ko.map((k) => (
            <Hinweis key={k.id} ton="warnung" icon={CircleAlert}>
              {koText(k, t)}
            </Hinweis>
          ))}
        </div>
      )}
      {offenOhneKapazitaet > 0 && (
        <Hinweis className="mt-4" icon={CircleHelp}>
          {u.offen(offenOhneKapazitaet)}
        </Hinweis>
      )}
      <section aria-labelledby={`${id}-krit`} className="mt-6">
        <h3 id={`${id}-krit`} className="font-display text-[17px] font-bold text-ink-900">
          {u.bewertung}
        </h3>
        <ul className="mt-3 divide-y divide-ink-100">
          {pass.kriterien.map((k) => {
            const zeile = kriteriumZeile(k, pass, t, sprache);
            const anteil = k.max > 0 ? Math.max(0, Math.min(1, k.punkte / k.max)) : 0;
            return (
              <li key={k.id} className="flex items-start gap-3 py-2.5 text-[13.5px]">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink-900">{zeile.label}</span>
                  <span className="block leading-snug text-ink-600">{zeile.text}</span>
                </span>
                {k.max > 0 ? (
                  <span className="flex w-24 shrink-0 flex-col items-end gap-1 pt-0.5">
                    <span className="ov-num text-[12.5px] font-semibold text-ink-700">
                      {z(k.punkte, k.punkte % 1 ? 1 : 0)} / {k.max}
                    </span>
                    <span aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                      <span className={cn("block h-full rounded-full", anteil >= 0.66 ? "bg-ov-500" : anteil > 0.3 ? "bg-sun-400" : "bg-ink-300")} style={{ width: `${Math.round(anteil * 100)}%` }} />
                    </span>
                  </span>
                ) : (
                  <span className={cn("ov-num shrink-0 pt-0.5 text-[12.5px] font-semibold", k.punkte < 0 ? "text-danger-700" : "text-ov-700")}>
                    {k.punkte > 0 ? "+" : "−"}
                    {z(Math.abs(k.punkte), Math.abs(k.punkte) % 1 ? 1 : 0)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[12.5px] leading-snug text-ink-500">{u.stand}</p>
      </section>
    </div>
  ) : (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-3xl bg-sand-50 p-6 text-center ring-1 ring-ink-200/60">
      <MapPinned aria-hidden="true" className="h-8 w-8 text-ov-600" />
      <p className="mt-3 max-w-sm text-[14.5px] leading-relaxed text-ink-600">{region && modus === "karte" ? u.leerKarte : u.leer}</p>
    </div>
  );

  // ------------------------------------------------------------------ Unten: Checkliste und Bericht
  const unten = pass && liste ? (
    <div>
      <h2 className="font-display text-[22px] font-extrabold tracking-tight text-ink-900 md:text-[26px]">{u.checkTitel}</h2>
      <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-600">{u.checkLead(regionName)}</p>
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <section aria-labelledby={`${id}-ang`} className="min-w-0 rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 md:p-6">
          <h3 id={`${id}-ang`} className="font-display text-[17px] font-bold text-ink-900">
            {u.angaben}
          </h3>
          <ul className="mt-4 space-y-4">
            {liste.angaben.map((x) => {
              const s = STUFE_STIL[x.stufe] || STUFE_STIL.offen;
              const Icon = s.icon;
              const txt = angabeText(x, pass, t, regionName);
              return (
                <li key={x.id} className="flex gap-3">
                  <Icon aria-hidden="true" className={cn("mt-0.5 h-5 w-5 shrink-0", s.farbe)} />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] font-semibold text-ink-900">
                      {txt.titel}
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset", s.chip)}>{t.stufe[x.stufe]}</span>
                    </p>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">{txt.text}</p>
                    {txt.quelle && (
                      <a href={txt.quelle.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12.5px] text-ink-500 underline decoration-ink-300 underline-offset-2 hover:text-ink-800">
                        {t.quelle}: {txt.quelle.titel}
                        <ExternalLink aria-hidden="true" className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
        <section aria-labelledby={`${id}-recht`} className="min-w-0 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
          <h3 id={`${id}-recht`} className="font-display text-[17px] font-bold text-ink-900">
            {u.recht(regionName)}
          </h3>
          {liste.recht.length ? (
            <ul className="mt-4 space-y-3">
              {liste.recht.map((r) => (
                <li key={r.titel} className="text-[13.5px] leading-snug">
                  <p className="font-semibold text-ink-900">{r.titel}</p>
                  <a href={r.quelle.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-start gap-1 text-[12.5px] text-ink-500 underline decoration-ink-300 underline-offset-2 hover:text-ink-800">
                    <span className="min-w-0 break-words">{r.quelle.titel}</span>
                    <ExternalLink aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[13.5px] text-ink-600">{u.keinRecht}</p>
          )}
          {rd?.href && (
            <Link href={rd.href} className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800">
              {u.rechtLink(regionName)} →
            </Link>
          )}
        </section>
        <section aria-labelledby={`${id}-restr`} className="min-w-0 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
          <h3 id={`${id}-restr`} className="font-display text-[17px] font-bold text-ink-900">
            {u.restriktionen}
          </h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">{u.restriktionenText}</p>
          <ul className="mt-4 space-y-2.5">
            {liste.restriktionen.map((r) => (
              <li key={r} className="flex gap-2.5 text-[13.5px] leading-snug text-ink-700">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sun-400" />
                <span className="min-w-0">{r}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60">
            <p className="text-[14px] font-semibold text-ink-900">{u.pacht}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{land === "DE" ? u.pachtText : u.pachtTextLand(en ? LAND_NAMEN.en[land] : { AT: "Österreich", CH: "die Schweiz" }[land])}</p>
            <Link href={land === "DE" ? "/rechner/pacht" : "/kontakt"} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800">
              {land === "DE" ? u.pachtLink : u.pachtLinkLand} →
            </Link>
          </div>
        </section>
      </div>
      <BerichtAnfordern rechner="flaechenpass" land={land} eingaben={pass.eingaben} className="mt-6" />
    </div>
  ) : null;

  return schreibweiseBaum(
    <div className="space-y-6">
      {lage}
      <RechnerRahmen eingaben={eingaben} ergebnis={ergebnis} unten={unten} mitlaufend werkzeuge={false} />
    </div>,
    land
  );
}
