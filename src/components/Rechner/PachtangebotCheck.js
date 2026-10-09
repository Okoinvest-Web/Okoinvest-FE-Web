"use client";

import { SperrEingaben } from "./LaenderSperre";
import { useId, useMemo, useState } from "react";
import { Banknote, CalendarClock, ClipboardCheck, Coins, FileSignature, Gauge, Scale, ShieldCheck, Sprout } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Schalter, Zahl } from "./bausteine";
import { useTeilbarerZustand } from "./kontext";
import { ErgebnisKopf, Hinweis, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { AMPEL, AmpelMarke, BalkenJahre, DiagrammKarte, FARBEN, ZahlFeld } from "./ToolTeile";
import { FLAECHENARTEN, INDEXARTEN, MODELLE, OPTIONEN, STANDARD, pruefePachtangebot } from "@/lib/rechner/pachtangebot";
import { REGION_KURZ } from "@/lib/rechner/pacht";
import { PACHT, REGIONEN, landVonRegion } from "@/lib/invest/markt";
import BerichtAnfordern from "@/components/Bericht/BerichtAnfordern";
import { pfad } from "@/lib/land";
import { useSeitenLand } from "@/components/Land/LandKontext";
import { landStart } from "@/components/Land/useLand";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { regionEn } from "@/lib/sprache/begriffe";
import { optionEn } from "@/lib/sprache/rechnerBegriffe";
import { optionenEn, pachtangebotEn } from "@/lib/sprache/pachtangebotEn";

const tsdMit = (f) => (v) =>
  f.sprache === "en"
    ? Math.abs(v) >= 1e6
      ? `€${f.fmt(v / 1e6, 2)}m`
      : `€${f.fmt(v / 1000, v >= 1e5 ? 0 : 1)}k`
    : Math.abs(v) >= 1e6
      ? `${f.fmt(v / 1e6, 2)} Mio. €`
      : `${f.fmt(v / 1000, v >= 1e5 ? 0 : 1)} Tsd. €`;

// Sprachmodell: Texte des Checks (Klauseltexte: src/lib/sprache/pachtangebotEn.js)
const TEXTE = {
  de: {
    regionLabel: (id, l) => l,
    regionLang: (id, l) => l,
    flaechenart: (id, l) => l,
    druckTitel: "Pachtangebot-Check · ÖkoInvest",
    druckZeile: "Orientierung, keine Rechtsberatung · erstellt am",
    datum: (d) => d.toLocaleDateString("de-DE"),
    region: "Region",
    summe: "Summe",
    barwert: "Barwert",
    kritisch: "Kritisch",
    von: (a, b) => `${a} von ${b}`,
    intro: "Übertragen Sie die Eckdaten aus dem Angebot. Wo etwas nicht geregelt ist, wählen Sie die entsprechende Option – genau das ist oft der wichtigste Befund.",
    g1: "1 · Fläche",
    flaechengroesse: "Flächengröße",
    mwpHinweis: (x) => `≈ ${x} MWp auf der Fläche`,
    art: "Art des Projekts",
    g2: "2 · Vergütung",
    pachtmodell: "Pachtmodell laut Angebot",
    proHaLabel: "Pacht je Hektar und Jahr",
    proHaHinweis: (f, a, b, agri) => `Übliche Spanne ${f.fmt(a)}–${f.fmt(b)} €/ha (${agri ? "Agri-PV" : "Freifläche"})`,
    umsatz: "Umsatzbeteiligung",
    umsatzHinweis: (f, a, b) => `Üblich ${f.fmt(a)}–${f.fmt(b)} % der Stromerlöse – gerechnet mit EEG-Wert, danach Marktwert.`,
    mindest: "Mindestpacht",
    wertsicherung: "Wertsicherung (Indexierung)",
    festeSteigerung: "Feste Steigerung",
    paEinheit: "% p. a.",
    g3: "3 · Laufzeit",
    festeLaufzeit: "Feste Laufzeit",
    jahreEinheit: "Jahre",
    optionen: "Verlängerungsoptionen des Pächters",
    jahreOder: (v, sonst) => (v ? `${v} Jahre` : sonst),
    keine: "keine",
    laufzeitHinweis: (n, v) => `Üblich ${n} Jahre + ${v}`,
    g4: "4 · Bis zum Baubeginn",
    reservierung: "Reservierungsprämie",
    reservierungFormat: (f, v) => (v ? `${f.fmt(v)} €/ha·a` : "keine"),
    reservierungHinweis: (f, a, b) => `Üblich ${f.fmt(a)}–${f.fmt(b)} €/ha je Jahr bis Baubeginn`,
    jahreBis: "Erwartete Jahre bis Baubeginn",
    sofort: "sofort",
    frist: "Späteste Frist laut Vertrag",
    unbegrenzt: "unbegrenzt",
    fristHinweis: "Nach dieser Frist sollte der Vertrag automatisch enden, wenn nicht gebaut wird.",
    bewirtschaftung: "Bewirtschaftung bis Baubeginn",
    nichtbau: "Wenn nicht gebaut wird",
    ruecktritt: "Rücktrittsrecht des Projektierers",
    g5: "5 · Sicherheit & Grundbuch",
    rueckbau: "Rückbausicherheit",
    rueckbauAb: "Sicherheit liegt vor",
    dienstbarkeit: "Dienstbarkeit im Grundbuch",
    rang: "Rangrücktritt gefordert",
    rangText: "Bestehende Grundschulden sollen zurücktreten",
    nebenflaechen: "Nebenflächen (Weg, Kabel, Ausgleich)",
    g6: "6 · Kosten der Prüfung",
    anwalt: "Anwalt/Notar übernimmt der Projektierer",
    deckel: "Deckel",
    bewertung: "Bewertung",
    zins: "Kalkulationszins für den Barwert",
    zinsHinweis: "Was ist Ihnen Geld heute gegenüber Geld in 20 Jahren wert? 3 % entspricht etwa einer sicheren Alternativanlage plus Inflation.",
    sr: (u, s, b, k, p) => `${u}. Summe ${s} Euro, Barwert ${b} Euro. ${k} kritische und ${p} zu prüfende Klauseln.`,
    imCheck: "Ihr Angebot im Check",
    geprueft: (n) => `${n} Punkte geprüft`,
    summeJahre: (n) => `Summe ${n} Jahre`,
    schnitt: (f, v) => `Ø ${f.fmt(v)} €/ha·a, nominal`,
    barwertHeute: "Barwert heute",
    abgezinst: (f, v) => `abgezinst mit ${f.fmt(v, 1)} %`,
    betriebsjahr: "1. Betriebsjahr",
    gesamt: (x) => `${x} gesamt`,
    proHaSuffix: " €/ha",
    ggMitte: "ggü. Marktmitte",
    gleicherVorlauf: "Barwert, gleicher Vorlauf",
    pctSuffix: " %",
    deltaPkt: (f, d) => `${f.fmt(d)} %-Pkt.`,
    vorlaufHinweis: (x, n, v) => `Davon ${x} Reservierungsprämie in ${n} ${n === 1 ? "Jahr" : "Jahren"} bis Baubeginn. Verlängerungsoptionen (${v} Jahre) sind nicht eingerechnet.`,
    fuss: "Fachliche Orientierung, keine Rechtsberatung. Lassen Sie den Vertragstext vor der Unterschrift anwaltlich prüfen – idealerweise auf Kosten des Projektierers.",
    zahlungen: "Zahlungen je Jahr",
    zahlungenZusatz: "Reservierungsprämie bis Baubeginn, danach Pacht",
    pacht: "Pacht",
    balkenAria: (n, s) => `Balkendiagramm der jährlichen Zahlungen über ${n} Jahre, zusammen ${s} Euro.`,
    jahr: "Jahr",
    vorBau: " · vor Baubeginn",
    zahlung: "Zahlung",
    zweite: "Zweite Meinung zu Ihrem Angebot?",
    zweiteText: "Wir sehen uns Ihre Fläche an und legen Ihnen ein eigenes, schriftliches Angebot vor – für Flächeneigentümer kostenfrei und unverbindlich.",
    pruefen: "Fläche prüfen lassen",
    verteilung: "Verteilung der Bewertungen",
    ampelKurz: { gut: "Gut", pruefen: "Prüfen", kritisch: "Kritisch" },
    punktwert: (p) => `Punktwert ${p} von 100`,
    marktTitel: "Barwert im Marktvergleich",
    marktZusatz: "übliche Pacht, VPI-indexiert, übliche Prämie",
    marktAria: (a, b, c, d) => `Ihr Angebot ${a}; marktüblich ${b} bis ${c}, Mitte ${d}`,
    ihrAngebot: "Ihr Angebot",
    unten: "untere Spanne",
    mitte: "Mitte",
    oben: "obere Spanne",
    klauseln: "Klausel für Klausel",
    klauselnText: "Bewertung gegenüber dem, was im Markt üblich ist",
    filter: "Klauseln filtern",
    alle: "Alle",
    offen: "Nur offene Punkte",
    angebot: "Angebot:",
    keineOffen: "Keine offenen Punkte – alle Klauseln liegen im marktüblichen Bereich.",
    fragen: "Fragen an den Projektierer",
    offenN: (n) => `${n} offen`,
    abhaken: "Zum Abhaken im Gespräch – und zum Ausdrucken.",
    schriftlich: "Lassen Sie sich Antworten schriftlich geben und in den Vertrag übernehmen. Mündliche Zusagen helfen im Streitfall nicht.",
    browser: "Ihre Eingaben bleiben in Ihrem Browser und werden nicht gespeichert oder übertragen.",
  },
  en: {
    regionLabel: (id, l) => regionEn(id, "kurz", l),
    regionLang: (id, l) => regionEn(id, "label", l),
    flaechenart: (id, l) => ({ freiflaeche: "ground-mounted PV", agri: "agrivoltaics" })[id] ?? l,
    druckTitel: "Lease offer check · ÖkoInvest",
    druckZeile: "For guidance only, not legal advice · created on",
    datum: (d) => d.toLocaleDateString("en-GB"),
    region: "Region",
    summe: "Total",
    barwert: "Present value",
    kritisch: "Critical",
    von: (a, b) => `${a} of ${b}`,
    intro: "Transfer the key terms from the offer. Where something is not regulated, choose the corresponding option – that is often the most important finding.",
    g1: "1 · Land",
    flaechengroesse: "Plot size",
    mwpHinweis: (x) => `≈ ${x} MWp on the plot`,
    art: "Type of project",
    g2: "2 · Remuneration",
    pachtmodell: "Lease model according to the offer",
    proHaLabel: "Lease per hectare per year",
    proHaHinweis: (f, a, b, agri) => `Usual range ${f.eur(a)}–${f.eur(b, "/ha")} (${agri ? "agrivoltaics" : "ground-mounted"})`,
    umsatz: "Revenue share",
    umsatzHinweis: (f, a, b) => `Typically ${f.fmt(a)}–${f.pct(b)} of power revenue – calculated with the EEG value, then the market value.`,
    mindest: "Minimum lease",
    wertsicherung: "Value protection (indexation)",
    festeSteigerung: "Fixed increase",
    paEinheit: "% p.a.",
    g3: "3 · Term",
    festeLaufzeit: "Fixed term",
    jahreEinheit: "years",
    optionen: "Lessee’s extension options",
    jahreOder: (v, sonst) => (v ? `${v} years` : sonst),
    keine: "none",
    laufzeitHinweis: (n, v) => `Typically ${n} years + ${optionEn(v)}`,
    g4: "4 · Until construction starts",
    reservierung: "Reservation fee",
    reservierungFormat: (f, v) => (v ? f.eur(v, "/ha·yr") : "none"),
    reservierungHinweis: (f, a, b) => `Typically ${f.eur(a)}–${f.eur(b, "/ha")} per year until construction`,
    jahreBis: "Expected years until construction",
    sofort: "immediately",
    frist: "Latest deadline under the contract",
    unbegrenzt: "unlimited",
    fristHinweis: "After this deadline, the contract should end automatically if nothing has been built.",
    bewirtschaftung: "Farming until construction",
    nichtbau: "If nothing is built",
    ruecktritt: "Developer’s right of withdrawal",
    g5: "5 · Security & land register",
    rueckbau: "Decommissioning security",
    rueckbauAb: "Security in place",
    dienstbarkeit: "Easement in the land register",
    rang: "Subordination required",
    rangText: "Existing land charges are to step back in rank",
    nebenflaechen: "Ancillary areas (access, cable, compensation)",
    g6: "6 · Cost of the review",
    anwalt: "Developer covers lawyer/notary",
    deckel: "Cap",
    bewertung: "Valuation",
    zins: "Discount rate for the present value",
    zinsHinweis: "What is money today worth to you compared with money in 20 years? 3% roughly corresponds to a safe alternative investment plus inflation.",
    sr: (u, s, b, k, p) => `${u}. Total ${s} euros, present value ${b} euros. ${k} critical clauses and ${p} to check.`,
    imCheck: "Your offer checked",
    geprueft: (n) => `${n} points checked`,
    summeJahre: (n) => `Total over ${n} years`,
    schnitt: (f, v) => `Ø ${f.eur(v, "/ha·yr")}, nominal`,
    barwertHeute: "Present value today",
    abgezinst: (f, v) => `discounted at ${f.pct(v, 1)}`,
    betriebsjahr: "1st operating year",
    gesamt: (x) => `${x} in total`,
    proHaSuffix: "/ha",
    ggMitte: "vs. market mid-point",
    gleicherVorlauf: "present value, same lead time",
    pctSuffix: "%",
    deltaPkt: (f, d) => `${f.fmt(d)} pp`,
    vorlaufHinweis: (x, n, v) => `Of which ${x} is reservation fee over ${n} ${n === 1 ? "year" : "years"} until construction. Extension options (${v} years) are not included.`,
    fuss: "Professional guidance, not legal advice. Have the contract text reviewed by a lawyer before signing – ideally at the developer’s expense.",
    zahlungen: "Payments per year",
    zahlungenZusatz: "Reservation fee until construction, then lease",
    pacht: "Lease",
    balkenAria: (n, s) => `Bar chart of annual payments over ${n} years, totalling ${s} euros.`,
    jahr: "Year",
    vorBau: " · before construction",
    zahlung: "Payment",
    zweite: "A second opinion on your offer?",
    zweiteText: "We look at your land and send you our own written offer – free of charge and without obligation for landowners.",
    pruefen: "Have your land checked",
    verteilung: "Distribution of ratings",
    ampelKurz: { gut: "Good", pruefen: "Check", kritisch: "Critical" },
    punktwert: (p) => `Score ${p} out of 100`,
    marktTitel: "Present value compared with the market",
    marktZusatz: "usual lease, CPI-indexed, usual fee",
    marktAria: (a, b, c, d) => `Your offer ${a}; market standard ${b} to ${c}, mid-point ${d}`,
    ihrAngebot: "Your offer",
    unten: "lower range",
    mitte: "Mid-point",
    oben: "upper range",
    klauseln: "Clause by clause",
    klauselnText: "Rating compared with what is usual in the market",
    filter: "Filter clauses",
    alle: "All",
    offen: "Open points only",
    angebot: "Offer:",
    keineOffen: "No open points – all clauses are within the market-standard range.",
    fragen: "Questions for the developer",
    offenN: (n) => `${n} open`,
    abhaken: "To tick off during the conversation – and to print.",
    schriftlich: "Get answers in writing and have them included in the contract. Verbal promises do not help in a dispute.",
    browser: "Your inputs stay in your browser and are not stored or transmitted.",
  },
};

export default function PachtangebotCheck() {
  // Ländermodell: auf /at bzw. /ch Region/Land vorwählen – die Länder-Sperre zeigt dann keine ungeprüften Werte
  const seitenLand = useSeitenLand();
  const t = useTexte(TEXTE);
  const f = useFormate();
  const { fmt, fmtEur } = f;
  const tsd = tsdMit(f);
  const en = f.sprache === "en";
  const opt = (liste, gruppe) => (en ? optionenEn(liste, gruppe) : liste);
  const [e, setE] = useState(() => landStart(STANDARD, seitenLand));
  const set = (k) => (v) => setE((alt) => ({ ...alt, [k]: v }));
  useTeilbarerZustand(e, (neu) => setE((alt) => ({ ...alt, ...neu })), {
    optionen: {
      regionId: REGIONEN.map((x) => x.id),
      flaechenart: FLAECHENARTEN.map((x) => x.id),
      modell: MODELLE.map((x) => x.id),
      indexArt: INDEXARTEN.map((x) => x.id),
      ...Object.fromEntries(Object.entries(OPTIONEN).map(([k, liste]) => [k, liste.map((o) => o.id)])),
    },
    grenzen: { ha: [1, 150] },
    pruefen: pruefePachtangebot,
  });
  const r = useMemo(() => (en ? pachtangebotEn(pruefePachtangebot(e)) : pruefePachtangebot(e)), [e, en]);
  const idBasis = useId();
  const spanne = r.spanne;

  // Länder-Sperre (Paket E): für AT/CH nur die Regionswahl und der Hinweis aus markt.js
  const sperre = r.sperre;
  const regionWahl = (
    <Auswahl
      legende={t.region}
      wert={e.regionId}
      onChange={set("regionId")}
      spalten={3}
      klein
      optionen={REGIONEN.map((x) => ({ id: x.id, label: t.regionLabel(x.id, REGION_KURZ[x.id] || x.label) }))}
    />
  );

  return (
    <div id="pachtcheck-bericht">
      {/* Druckansicht: nur dieser Bericht, ohne Navigation und Eingabe-Bedienelemente */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #pachtcheck-bericht, #pachtcheck-bericht * { visibility: visible !important; }
          #pachtcheck-bericht { position: absolute; left: 0; top: 0; width: 100%; }
          #pachtcheck-bericht .pc-eingaben { display: none !important; }
          #pachtcheck-bericht .pc-druckkopf { display: block !important; }
          #pachtcheck-bericht details > *:not(summary) { display: block !important; }
          @page { margin: 14mm; }
        }
      `}</style>
      <div className="pc-druckkopf mb-6 hidden">
        <p className="font-display text-[22px] font-extrabold text-ink-900">{t.druckTitel}</p>
        <p className="text-[13px] text-ink-600">
          {fmt(e.ha, e.ha % 1 ? 1 : 0)} ha {t.flaechenart(e.flaechenart, FLAECHENARTEN.find((x) => x.id === e.flaechenart).label)}, {t.regionLang(e.regionId, REGIONEN.find((x) => x.id === e.regionId)?.label)} · {t.druckZeile}{" "}
          {/* Datum nur für den Druck – Server und Browser können abweichen (Zeitzone, Mitternacht) */}
          <span suppressHydrationWarning>{t.datum(new Date())}</span>
        </p>
      </div>

      <RechnerRahmen
        mitlaufend
        breiteLinks={430}
        sperre={sperre}
        eingaben={sperre ? (
          <SperrEingaben>{regionWahl}</SperrEingaben>
        ) : (
          <div className="pc-eingaben">
            <MobilKurz
              werte={[
                [t.summe, tsd(r.summe)],
                [t.barwert, tsd(r.barwert)],
                [t.kritisch, t.von(r.zaehler.kritisch, r.klauseln.length)],
              ]}
            />
            <p className="mb-6 text-[14px] leading-relaxed text-ink-600">
              {t.intro}
            </p>
            <div className="space-y-8">
              <Gruppe titel={t.g1}>
                <Regler label={t.flaechengroesse} wert={e.ha} min={1} max={150} step={0.5} stellen={e.ha % 1 ? 1 : 0} einheit="ha" onChange={set("ha")} hinweis={t.mwpHinweis(fmt(r.kwp / 1000, 1))} />
                <Auswahl legende={t.art} wert={e.flaechenart} onChange={set("flaechenart")} optionen={opt(FLAECHENARTEN, "flaechenart")} />
                {regionWahl}
              </Gruppe>

              <Gruppe titel={t.g2}>
                <Auswahl legende={t.pachtmodell} wert={e.modell} onChange={set("modell")} optionen={opt(MODELLE, "modell")} />
                {e.modell === "fest" && (
                  <ZahlFeld
                    id={`${idBasis}-proha`}
                    label={t.proHaLabel}
                    wert={e.proHa}
                    onChange={set("proHa")}
                    min={0}
                    max={10000}
                    step={50}
                    einheit="€/ha"
                    hinweis={t.proHaHinweis(f, spanne.min, spanne.max, e.flaechenart === "agri")}
                  />
                )}
                {e.modell !== "fest" && (
                  <Regler
                    label={t.umsatz}
                    wert={e.umsatzAnteil * 100}
                    min={1}
                    max={12}
                    step={0.5}
                    stellen={1}
                    einheit="%"
                    onChange={(v) => set("umsatzAnteil")(v / 100)}
                    hinweis={t.umsatzHinweis(f, PACHT.umsatzbeteiligung.min * 100, PACHT.umsatzbeteiligung.max * 100)}
                  />
                )}
                {e.modell === "kombi" && (
                  <ZahlFeld id={`${idBasis}-min`} label={t.mindest} wert={e.mindestProHa} onChange={set("mindestProHa")} min={0} max={8000} step={50} einheit="€/ha" />
                )}
                {e.modell !== "umsatz" && (
                  <>
                    <Auswahl legende={t.wertsicherung} wert={e.indexArt} onChange={set("indexArt")} optionen={opt(INDEXARTEN, "indexArt")} />
                    {e.indexArt === "fest" && (
                      <Regler label={t.festeSteigerung} wert={e.indexSatz * 100} min={0.25} max={3} step={0.25} stellen={2} einheit={t.paEinheit} onChange={(v) => set("indexSatz")(v / 100)} />
                    )}
                  </>
                )}
              </Gruppe>

              <Gruppe titel={t.g3}>
                <Regler label={t.festeLaufzeit} wert={e.laufzeit} min={15} max={45} step={1} einheit={t.jahreEinheit} onChange={set("laufzeit")} />
                <Regler
                  label={t.optionen}
                  wert={e.verlaengerungJahre}
                  min={0}
                  max={30}
                  step={1}
                  format={(v) => t.jahreOder(v, t.keine)}
                  onChange={set("verlaengerungJahre")}
                  hinweis={t.laufzeitHinweis(PACHT.laufzeit, PACHT.verlaengerung)}
                />
              </Gruppe>

              <Gruppe titel={t.g4}>
                <Regler
                  label={t.reservierung}
                  wert={e.reservierungProHa}
                  min={0}
                  max={600}
                  step={10}
                  format={(v) => t.reservierungFormat(f, v)}
                  onChange={set("reservierungProHa")}
                  hinweis={t.reservierungHinweis(f, PACHT.reservierungProHa.min, PACHT.reservierungProHa.max)}
                />
                <Regler label={t.jahreBis} wert={e.vorlaufJahre} min={0} max={8} step={1} format={(v) => t.jahreOder(v, t.sofort)} onChange={set("vorlaufJahre")} />
                <Regler
                  label={t.frist}
                  wert={e.optionsfrist}
                  min={0}
                  max={10}
                  step={1}
                  format={(v) => t.jahreOder(v, t.unbegrenzt)}
                  minLabel={t.unbegrenzt}
                  onChange={set("optionsfrist")}
                  hinweis={t.fristHinweis}
                />
                <Auswahl legende={t.bewirtschaftung} wert={e.bewirtschaftung} onChange={set("bewirtschaftung")} optionen={opt(OPTIONEN.bewirtschaftung, "bewirtschaftung")} klein />
                <Auswahl legende={t.nichtbau} wert={e.nichtbau} onChange={set("nichtbau")} optionen={opt(OPTIONEN.nichtbau, "nichtbau")} klein />
                <Auswahl legende={t.ruecktritt} wert={e.kuendigung} onChange={set("kuendigung")} optionen={opt(OPTIONEN.kuendigung, "kuendigung")} klein />
              </Gruppe>

              <Gruppe titel={t.g5}>
                <Auswahl legende={t.rueckbau} wert={e.rueckbau} onChange={set("rueckbau")} optionen={opt(OPTIONEN.rueckbau, "rueckbau")} spalten={2} klein />
                {e.rueckbau !== "keine" && <Auswahl legende={t.rueckbauAb} wert={e.rueckbauAb} onChange={set("rueckbauAb")} optionen={opt(OPTIONEN.rueckbauAb, "rueckbauAb")} klein />}
                <Auswahl legende={t.dienstbarkeit} wert={e.dienstbarkeit} onChange={set("dienstbarkeit")} optionen={opt(OPTIONEN.dienstbarkeit, "dienstbarkeit")} klein />
                <Schalter icon={Scale} label={t.rang} beschreibung={t.rangText} an={e.rangruecktritt} onChange={set("rangruecktritt")} />
                <Auswahl legende={t.nebenflaechen} wert={e.nebenflaechen} onChange={set("nebenflaechen")} optionen={opt(OPTIONEN.nebenflaechen, "nebenflaechen")} spalten={2} klein />
              </Gruppe>

              <Gruppe titel={t.g6}>
                <Auswahl legende={t.anwalt} wert={e.anwalt} onChange={set("anwalt")} optionen={opt(OPTIONEN.anwalt, "anwalt")} klein />
                {e.anwalt === "gedeckelt" && (
                  <Regler label={t.deckel} wert={e.anwaltBetrag} min={250} max={5000} step={250} format={(v) => fmtEur(v)} onChange={set("anwaltBetrag")} />
                )}
              </Gruppe>

              <Gruppe titel={t.bewertung}>
                <Regler
                  label={t.zins}
                  wert={e.diskont * 100}
                  min={0}
                  max={8}
                  step={0.5}
                  stellen={1}
                  einheit="%"
                  onChange={(v) => set("diskont")(v / 100)}
                  hinweis={t.zinsHinweis}
                />
              </Gruppe>
            </div>
          </div>
        )}
        ergebnis={
          <>
            <p className="sr-only" aria-live="polite">
              {t.sr(r.urteil.titel, Math.round(r.summe), Math.round(r.barwert), r.zaehler.kritisch, r.zaehler.pruefen)}
            </p>
            <ErgebnisKopf titel={t.imCheck} plakette={t.geprueft(r.klauseln.length)} />

            <Urteil r={r} />

            <Hauptzahl
              className="mt-5"
              icon={Coins}
              label={t.summeJahre(r.jahre.length)}
              zusatz={t.schnitt(f, r.durchschnittProHa)}
              rechts={
                <div className="sm:text-right">
                  <p className="flex items-center gap-1.5 text-[12.5px] text-white/75 sm:justify-end">
                    <Banknote aria-hidden="true" className="h-3.5 w-3.5" />
                    {t.barwertHeute}
                  </p>
                  <p className="ov-kpi mt-0.5 text-white">
                    <Zahl wert={r.barwert} format={tsd} />
                  </p>
                  <p className="text-[12.5px] text-white/75">{t.abgezinst(f, e.diskont * 100)}</p>
                </div>
              }
            >
              <Zahl wert={r.summe} format={tsd} delta="dunkel" einlauf />
            </Hauptzahl>
            <Belege spalten={2}>
              <Kennzahl ton="akzent" icon={Sprout} label={t.betriebsjahr} zusatz={t.gesamt(fmtEur(r.proHaErstesJahr * e.ha))}>
                <Zahl wert={r.proHaErstesJahr} prefix={en ? "€" : ""} suffix={t.proHaSuffix} delta="hell" />
              </Kennzahl>
              <Kennzahl icon={Gauge} label={t.ggMitte} zusatz={t.gleicherVorlauf}>
                {r.anteilMarktMittel != null ? <Zahl wert={r.anteilMarktMittel * 100} suffix={t.pctSuffix} delta="hell" deltaFormat={(dd) => t.deltaPkt(f, dd)} /> : "–"}
              </Kennzahl>
            </Belege>

            <Marktbalken r={r} />

            {r.summeVorlauf > 0 && (
              <Hinweis ton="neutral" icon={CalendarClock} className="mt-4">
                {t.vorlaufHinweis(fmtEur(r.summeVorlauf), e.vorlaufJahre, e.verlaengerungJahre)}
              </Hinweis>
            )}

            <div className="mt-7 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between print:hidden">
              <p className="max-w-md text-[13px] leading-relaxed text-ink-500">
                {t.fuss}
              </p>
            </div>
            {!sperre && <BerichtAnfordern rechner="pachtangebot" land={landVonRegion(e.regionId)} eingaben={e} />}
          </>
        }
        unten={
          <div className="space-y-6">
            <Klauseln r={r} />
            <DiagrammKarte titel={t.zahlungen} zusatz={t.zahlungenZusatz}>
              <BalkenJahre
                zeilen={r.jahre.map((j) => ({ label: String(j.jahr), werte: j.betrieb ? { pacht: j.betrag } : { reservierung: j.betrag } }))}
                serien={[
                  { key: "reservierung", label: t.reservierung, farbe: FARBEN.sunHell },
                  { key: "pacht", label: t.pacht, farbe: FARBEN.gruen },
                ]}
                ariaLabel={t.balkenAria(r.jahre.length, Math.round(r.summe))}
                tooltip={(z, i) => (
                  <>
                    <p className="font-semibold">{t.jahr} {r.jahre[i].jahr}{r.jahre[i].betrieb ? "" : t.vorBau}</p>
                    <p className="text-white/70">
                      {t.zahlung} <span className="ov-num font-semibold text-white">{fmtEur(r.jahre[i].betrag)}</span>
                    </p>
                  </>
                )}
              />
            </DiagrammKarte>
            <Fragen r={r} />
            <div className="flex flex-col gap-4 rounded-3xl bg-navy-950 p-6 text-white md:flex-row md:items-center md:justify-between md:p-8 print:hidden">
              <div className="max-w-xl">
                <p className="font-display text-[20px] font-extrabold tracking-tight">{t.zweite}</p>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/75">{t.zweiteText}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <Button href={pfad("/flaechencheck")} variant="white" size="lg" pfeil>
                  {t.pruefen}
                </Button>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}

function Urteil({ r }) {
  const t = useTexte(TEXTE);
  const ton = r.urteil.id === "gut" ? "bg-ov-50 ring-ov-200" : r.urteil.id === "kritisch" ? "bg-ink-900 text-white ring-ink-900" : "bg-sun-300/25 ring-sun-400/50";
  const dunkel = r.urteil.id === "kritisch";
  return (
    <div className={cn("mt-5 rounded-3xl p-5 ring-1 md:p-6", ton)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={cn("font-display text-[21px] font-extrabold tracking-tight", dunkel ? "text-white" : "text-ink-900")}>{r.urteil.titel}</p>
        <ul className="flex flex-wrap gap-1.5" aria-label={t.verteilung}>
          {["gut", "pruefen", "kritisch"].map((a) => (
            <li key={a} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold", dunkel ? "bg-white/10 text-white" : "bg-white text-ink-800 ring-1 ring-ink-200/70")}>
              <span className={cn("h-2 w-2 rounded-full", a === "kritisch" && dunkel ? "bg-sun-400" : AMPEL[a].punkt)} aria-hidden="true" />
              {r.zaehler[a]} {t.ampelKurz[a] ?? AMPEL[a].kurz}
            </li>
          ))}
        </ul>
      </div>
      <p className={cn("mt-2 text-[14.5px] leading-relaxed", dunkel ? "text-white/80" : "text-ink-700")}>{r.urteil.text}</p>
      <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-white/60" role="img" aria-label={t.punktwert(Math.round(r.punkte * 100))}>
        {r.klauseln.map((k) => (
          <span key={k.id} className={cn("h-full flex-1 border-r border-white/70 last:border-r-0", k.ampel === "kritisch" ? (dunkel ? "bg-sun-400" : "bg-ink-900") : AMPEL[k.ampel].punkt)} />
        ))}
      </div>
    </div>
  );
}

function Marktbalken({ r }) {
  const t = useTexte(TEXTE);
  const f = useFormate();
  const { fmtEur } = f;
  const tsd = tsdMit(f);
  const { min, mittel, max } = r.marktBw;
  const lo = Math.min(min, r.barwert) * 0.9;
  const hi = Math.max(max, r.barwert) * 1.05;
  const anteil = (v) => (v - lo) / (hi - lo);
  const pos = (v) => `${anteil(v) * 100}%`;
  const a = anteil(r.barwert);
  const labelLage = a < 0.18 ? "left-0" : a > 0.82 ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <div className="mt-5 rounded-2xl bg-ink-50 p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[13.5px] font-semibold text-ink-800">{t.marktTitel}</p>
        <p className="text-[12px] text-ink-500">{t.marktZusatz}</p>
      </div>
      <div className="relative mt-8 h-3 rounded-full bg-ink-200" role="img" aria-label={t.marktAria(fmtEur(r.barwert), fmtEur(min), fmtEur(max), fmtEur(mittel))}>
        <div className="absolute inset-y-0 rounded-full bg-ov-200" style={{ left: pos(min), width: `calc(${pos(max)} - ${pos(min)})` }} />
        <div className="absolute inset-y-[-3px] w-[2px] bg-ov-600" style={{ left: pos(mittel) }} />
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: pos(r.barwert) }}>
          <span className="block h-5 w-5 rounded-full border-[3px] border-white bg-navy-700 shadow" />
          <span className={cn("absolute bottom-6 whitespace-nowrap rounded-md", labelLage, "bg-navy-950 px-2 py-0.5 text-[11.5px] font-semibold text-white")}>{t.ihrAngebot}</span>
        </div>
      </div>
      <div className="mt-2 flex justify-between gap-2 text-[11.5px] text-ink-500">
        <span className="ov-num">{t.unten} {tsd(min)}</span>
        <span className="ov-num hidden sm:inline">{t.mitte} {tsd(mittel)}</span>
        <span className="ov-num">{t.oben} {tsd(max)}</span>
      </div>
    </div>
  );
}

function Klauseln({ r }) {
  const t = useTexte(TEXTE);
  const [filter, setFilter] = useState("alle");
  const liste = r.klauseln.filter((k) => filter === "alle" || (filter === "offen" ? k.ampel !== "gut" : true));
  return (
    <section aria-labelledby="pc-klauseln" className="rounded-3xl ring-1 ring-ink-200/70">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 md:px-6">
        <div>
          <h3 id="pc-klauseln" className="font-display text-[19px] font-extrabold tracking-tight text-ink-900">
            {t.klauseln}
          </h3>
          <p className="text-[12.5px] text-ink-500">{t.klauselnText}</p>
        </div>
        <div role="radiogroup" aria-label={t.filter} className="inline-flex rounded-full bg-ink-100 p-1 print:hidden">
          {[
            ["alle", t.alle],
            ["offen", t.offen],
          ].map(([id, label]) => (
            <label key={id} className={cn("cursor-pointer rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500", filter === id ? "bg-white text-ink-900 shadow-sm" : "text-ink-600")}>
              <input type="radio" name="pc-filter" className="sr-only" checked={filter === id} onChange={() => setFilter(id)} />
              {label}
            </label>
          ))}
        </div>
      </div>
      <ul className="mt-4 divide-y divide-ink-100 border-t border-ink-100">
        {liste.map((k) => (
          <li key={k.id} className="grid gap-2 px-5 py-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] md:gap-6 md:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <AmpelMarke ampel={k.ampel} klein />
              </div>
              <p className="mt-2 font-display text-[16px] font-bold leading-snug text-ink-900">{k.titel}</p>
              <p className="ov-num mt-0.5 text-[13px] text-ink-500">{t.angebot} {k.wert}</p>
            </div>
            <p className="text-[14px] leading-relaxed text-ink-700">{k.text}</p>
          </li>
        ))}
        {liste.length === 0 && <li className="px-6 py-5 text-[14px] text-ink-600">{t.keineOffen}</li>}
      </ul>
    </section>
  );
}

function Fragen({ r }) {
  const t = useTexte(TEXTE);
  const [erledigt, setErledigt] = useState({});
  const offen = r.fragen.filter((_, i) => !erledigt[i]).length;
  return (
    <section aria-labelledby="pc-fragen" className="rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="pc-fragen" className="flex items-center gap-2.5 font-display text-[19px] font-extrabold tracking-tight text-ink-900">
          <ClipboardCheck aria-hidden="true" className="h-5 w-5 text-ov-600" /> {t.fragen}
        </h3>
        <span className="text-[12.5px] font-semibold text-ink-500">{t.offenN(offen)}</span>
      </div>
      <p className="mt-1 text-[13px] text-ink-500">{t.abhaken}</p>
      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {r.fragen.map((f, i) => (
          <li key={f.frage} className="flex">
            <label className="flex w-full cursor-pointer items-start gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-ink-200/70 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500">
              <input
                type="checkbox"
                checked={!!erledigt[i]}
                onChange={(ev) => setErledigt((alt) => ({ ...alt, [i]: ev.target.checked }))}
                className="mt-1 h-4 w-4 shrink-0 accent-[#558227]"
              />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">{f.thema}</span>
                  {f.ampel !== "standard" && <AmpelMarke ampel={f.ampel} klein />}
                </span>
                <span className={cn("mt-1 block text-[14px] leading-relaxed", erledigt[i] ? "text-ink-400 line-through" : "text-ink-800")}>{f.frage}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-500">
        <FileSignature aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
        {t.schriftlich}
      </p>
      <p className="mt-2 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-500">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
        {t.browser}
      </p>
    </section>
  );
}
