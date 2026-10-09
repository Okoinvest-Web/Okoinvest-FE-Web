"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/Land/Link";
import {
  ArrowLeft, ArrowRight, Car, Check, CircleAlert, CircleMinus, CirclePlus, Factory, HandCoins, Info, Landmark, Mountain,
  Recycle, RotateCcw, ShieldAlert, Sprout, TrainFront, Trees, User, Users, Waves, Wheat,
} from "lucide-react";
import { cn } from "@/components/ui/cn";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import { Regler } from "@/components/Rechner/bausteine";
import { BESONDERHEITEN, EIGENTUM, LAENDER, NETZ, NUTZUNGEN, flaechencheck, regionenFuer } from "@/lib/rechner/flaechencheck";
import { AGRI, PACHT, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { ereignis, useEreignisEinmal } from "@/lib/ereignis";
import { grundstueck } from "@/lib/anfrage/laender";
import BerichtAnfordern from "@/components/Bericht/BerichtAnfordern";
import { pfad } from "@/lib/land";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { datumText, fmtZahl } from "@/lib/sprache/format";
import { AMPEL_EN, BESONDERHEITEN_EN, EIGENTUM_EN, LAENDER_EN, NETZ_EN, NUTZUNGEN_EN, REGIONEN_EN, satzEn } from "@/components/Flaeche/flaechencheckEn";

const SCHRITTE = ["Standort", "Fläche", "Besonderheiten", "Netz & Eigentum"];
const NUTZUNG_ICON = { acker: Wheat, gruenland: Sprout, konversion: Factory, deponie: Recycle, parkplatz: Car, sonstige: Info };
const BES_ICON = { randstreifen: TrainFront, benachteiligt: Wheat, schutzgebiet: ShieldAlert, wald: Trees, hang: Mountain, ueberschwemmung: Waves };
const EIG_ICON = { allein: User, gemeinschaft: Users, verpachtet: HandCoins, kommune: Landmark };
const AMPEL = {
  gruen: { label: "Gut geeignet", text: "Ihre Fläche bringt gute Voraussetzungen mit. Jetzt lohnt die genaue Prüfung.", farbe: "#669933", ton: "bg-ov-500" },
  gelb: { label: "Bedingt geeignet", text: "Möglich – aber einzelne Punkte müssen wir genau prüfen, bevor es konkret wird.", farbe: "#ffc53d", ton: "bg-sun-400" },
  rot: { label: "Eher schwierig", text: "Als klassischer Solarpark schwierig. Oft gibt es trotzdem Wege – etwa Agri-PV, Nachbarflächen oder ein Carport.", farbe: "#c4cad5", ton: "bg-ink-300" },
};
const SPEICHER_SCHLUESSEL = "ov-flaechencheck";
const HA_MIN = 0.1;
const HA_MAX = 2000;
const FEHLER_HA = "Bitte geben Sie die Fläche in Hektar an, z. B. 12,5.";
/** Pacht-, GAP- und €-Werte gelten nur für Deutschland, bis die Länderlogik AT/CH steht (Masterplan S1 „Länder-Sperre bis B1“) */
const LAENDER_LOGIK_FERTIG = ["DE"];
/** Grobe Größenklasse für die Messung – nie der exakte Wert */
const haKlasse = (ha) => (ha < 1 ? "unter 1 ha" : ha < 5 ? "1 bis 5 ha" : ha < 20 ? "5 bis 20 ha" : ha < 100 ? "20 bis 100 ha" : "ab 100 ha");
/** „Benachteiligtes Gebiet“ gibt es nur als deutsche EEG-Kulisse – bei AT/CH nicht mitzählen (sonst unsichtbarer, nicht abwählbarer Chip) */
const besonderheitenFuer = (land, liste) => liste.filter((id) => id !== "benachteiligt" || land === "DE");
const WEITER_HINWEIS = ["Bitte wählen Sie Land und Region.", "Bitte wählen Sie die Nutzung.", "", "Bitte wählen Sie die Entfernung zum Netz und wem die Fläche gehört."];

/** Eingabe „25,5“ oder „25.5“ → Zahl; leer/ungültig → null (kein Klemmen beim Tippen).
 *  Englisch: Komma ist Tausendertrennzeichen („1,250.5“), Dezimalpunkt. */
const haLesen = (text, en = false) => {
  const roh = String(text).trim().split(" ").join("");
  const t = en ? roh.split(",").join("") : roh.replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
};
/** Zahl → Feldtext ohne Tausenderpunkt („1250,5“), bis zwei Nachkommastellen; Englisch mit Dezimalpunkt. */
const haText = (v, en = false) => {
  const r = Math.round(v * 100) / 100;
  return en ? String(r) : String(r).replace(".", ",");
};

/** Sprachmodell: feste Texte des Assistenten (en nur Texte). Listen der Rechenlogik: flaechencheckEn.js */
const TEXTE = {
  de: {
    schritte: SCHRITTE,
    ergebnisSchritt: "Ergebnis",
    fehlerHa: FEHLER_HA,
    weiterHinweis: WEITER_HINWEIS,
    fortschritt: "Fortschritt",
    schrittVon: (n, s) => `Schritt ${n} von 4 · ${s}`,
    ihrErgebnis: "Ihr Ergebnis",
    uebernommen: "Übernommene Angaben:",
    aendern: ". Sie können alles ändern.",
    woTitel: "Wo liegt die Fläche?",
    woText: "Land und Region bestimmen Einstrahlung, Förderung und Genehmigungsweg.",
    region: "Region",
    groesseTitel: "Wie groß ist die Fläche?",
    groesseText: (mehrzahl) => `Eine grobe Angabe genügt. Mehrere zusammenhängende ${mehrzahl} zählen zusammen.`,
    flaechengroesse: "Flächengröße",
    minLabel: "0,5 ha",
    maxLabel: "150+ ha",
    genau: "Genau eingeben",
    haHilfe: "0,1 bis 2.000 ha, Komma erlaubt",
    nutzungTitel: "Wie wird die Fläche heute genutzt?",
    besTitel: "Trifft etwas davon zu?",
    besText: "Mehrfachauswahl möglich. Wenn Sie es nicht wissen, lassen Sie es leer – wir prüfen das ohnehin.",
    netzTitel: "Wie weit ist es bis zum Stromnetz?",
    netzText: "Gemeint ist die nächste Mittelspannungsleitung (Freileitung auf Betonmasten, Trafostation) oder ein Umspannwerk.",
    eigentumTitel: "Wem gehört die Fläche?",
    zurueck: "Zurück",
    geraet: "Ihre Angaben bleiben auf diesem Gerät, bis Sie neu starten.",
    start: "Schritt 1 von 4 · dauert ca. 2 Minuten · ohne Anmeldung",
    zeigen: "Ergebnis anzeigen",
    nichts: "Nichts davon – weiter",
    weiter: "Weiter",
    neu: "Neu starten",
    entfaellt: "Entfällt: ",
    zwischenstand: "Zwischenstand: ",
    punkte: "Punkte",
    nochNicht: "Noch nicht alle Angaben – der Wert bewegt sich mit jeder Auswahl.",
    punktwert: (s) => `Punktwert ${s} von 100`,
    vonHundert: "von 100 Punkten",
    kopf: (stand) => `Ihr Flächencheck · Stand ${stand}`,
    chipFlaeche: (ha, nutzung) => `${ha} ha ${nutzung}`,
    chipBes: (n) => (n ? `${n} Besonderheit${n > 1 ? "en" : ""}` : "keine Besonderheiten"),
    chipNetz: (netz) => `Netz ${netz}`,
    chipAendern: (c) => `${c} ändern`,
    leistung: "Mögliche Leistung",
    leistungZ: (ha) => `auf ~${ha} ha nutzbarer Fläche`,
    ertrag: "Stromertrag",
    ertragW: (gwh) => `${gwh} GWh/Jahr`,
    haushalte: (n) => `≈ ${n} Haushalte`,
    pachtJahr: "Pacht pro Jahr",
    pachtHa: (a, b) => `${a}–${b} €/ha`,
    pacht30: "Pacht über 30 Jahre",
    indexiert: (p) => `indexiert mit ${p} % p. a.`,
    pacht: "Pacht",
    vorbereitung: "Rechenlogik in Vorbereitung",
    pachtLand: (name) => `Für ${name} nennen wir die Pachtspanne nach der Prüfung Ihrer Fläche.`,
    landName: { AT: "Österreich", CH: "die Schweiz" }, // früher LAND_NAME
    ihrLand: "Ihr Land",
    bewertung: "So kommt die Bewertung zustande",
    agriTitel: "Option Agri-PV",
    agriA: "Soll die Landwirtschaft weitergehen? Mit vertikalen Modulreihen wären rund ",
    agriB: " möglich",
    agriPacht: (gap, a, b) => `, ${gap} % der Fläche bleiben in der Regel GAP-förderfähig. Pacht meist ${a}–${b} €/ha – plus Ihre Ernte.`,
    agriLand: (name) => `. Förderung und Pacht für ${name}: Rechenlogik in Vorbereitung.`,
    agriLink: "Agri-PV ansehen",
    carportTitel: "Solarcarport",
    carportText: "Auf Parkplätzen bauen wir Solarcarports – mit Ladepunkten und ohne Flächenverlust.",
    carportLink: "Solarcarport ansehen",
    naechste: "Nächste Schritte",
    termin: "Beratungstermin buchen",
    sendenTitel: "Ergebnis an unser Flächenteam senden",
    sendenText: (genau) => `Ihre Angaben und dieses Ergebnis werden mitgeschickt – Sie müssen nichts doppelt eingeben. Wir prüfen die Fläche ${genau} und melden uns bei Ihnen.`,
    sendenPunkte: ["Kostenfrei und unverbindlich", "Status und Dokumente später im Portal", "Keine Weitergabe an Dritte ohne Ihre Zustimmung"],
    kontoA: "Lieber zuerst ein Konto anlegen?",
    kontoLink: "Kostenlos registrieren",
    kontoB: "– Ihre Anfragen und deren Status sehen Sie dann im Portal.",
    rot: "Auch bei roter Ampel lohnt oft ein Blick: Die Heuristik kennt Ihre Fläche nicht im Detail.",
    senden: "Ergebnis senden",
    fuss: (stand, genau) => `Erste Einschätzung auf Basis Ihrer Angaben und typischer Marktwerte, Stand ${stand} – kein Angebot und keine Zusage. Netzkapazität, Planungsrecht und Schutzgüter prüfen wir ${genau}.`,
  },
  en: {
    schritte: ["Location", "Land", "Special features", "Grid & ownership"],
    ergebnisSchritt: "Result",
    fehlerHa: "Please enter the area in hectares, e.g. 12.5.",
    weiterHinweis: ["Please select country and region.", "Please select the current use.", "", "Please select the distance to the grid and who owns the land."],
    fortschritt: "Progress",
    schrittVon: (n, s) => `Step ${n} of 4 · ${s}`,
    ihrErgebnis: "Your result",
    uebernommen: "Details carried over:",
    aendern: ". You can change everything.",
    woTitel: "Where is the land?",
    woText: "Country and region determine irradiation, funding and the permitting route.",
    region: "Region",
    groesseTitel: "How large is the land?",
    groesseText: () => "A rough figure is enough. Several adjoining plots count together.",
    flaechengroesse: "Site size",
    minLabel: "0.5 ha",
    maxLabel: "150+ ha",
    genau: "Enter exactly",
    haHilfe: "0.1 to 2,000 ha, decimals allowed",
    nutzungTitel: "How is the land used today?",
    besTitel: "Does any of this apply?",
    besText: "You can select several. If you do not know, leave it blank – we will check anyway.",
    netzTitel: "How far is it to the power grid?",
    netzText: "This means the nearest medium-voltage line (overhead line on concrete pylons, transformer station) or a substation.",
    eigentumTitel: "Who owns the land?",
    zurueck: "Back",
    geraet: "Your details stay on this device until you start again.",
    start: "Step 1 of 4 · takes about 2 minutes · no registration",
    zeigen: "Show result",
    nichts: "None of these – continue",
    weiter: "Continue",
    neu: "Start again",
    entfaellt: "No longer applies: ",
    zwischenstand: "Interim result: ",
    punkte: "points",
    nochNicht: "Not all details yet – the score moves with every choice.",
    punktwert: (s) => `Score ${s} out of 100`,
    vonHundert: "out of 100 points",
    kopf: (stand) => `Your land check · as of ${stand}`,
    chipFlaeche: (ha, nutzung) => `${ha} ha ${String(nutzung || "").toLowerCase()}`,
    chipBes: (n) => (n ? `${n} special feature${n > 1 ? "s" : ""}` : "no special features"),
    chipNetz: (netz) => `Grid ${netz}`,
    chipAendern: (c) => `Change ${c}`,
    leistung: "Possible capacity",
    leistungZ: (ha) => `on ~${ha} ha of usable land`,
    ertrag: "Power yield",
    ertragW: (gwh) => `${gwh} GWh/year`,
    haushalte: (n) => `≈ ${n} households`,
    pachtJahr: "Lease per year",
    pachtHa: (a, b) => `€${a}–${b}/ha`,
    pacht30: "Lease over 30 years",
    indexiert: (p) => `indexed at ${p} % p.a.`,
    pacht: "Lease",
    vorbereitung: "Calculation in preparation",
    pachtLand: (name) => `For ${name}, we will give you the lease range after assessing your land.`,
    landName: { AT: "Austria", CH: "Switzerland" },
    ihrLand: "your country",
    bewertung: "How the score is made up",
    agriTitel: "Agrivoltaics option",
    agriA: "Should farming continue? With vertical module rows, around ",
    agriB: " would be possible",
    agriPacht: (gap, a, b) => `; ${gap} % of the land usually remains eligible for CAP support. Lease usually €${a}–${b}/ha – plus your harvest.`,
    agriLand: (name) => `. Funding and lease for ${name}: calculation in preparation.`,
    agriLink: "View agrivoltaics",
    carportTitel: "Solar carport",
    carportText: "On car parks we build solar carports – with charging points and no loss of land.",
    carportLink: "View solar carports",
    naechste: "Next steps",
    termin: "Book a consultation",
    sendenTitel: "Send the result to our land team",
    sendenText: () => "Your details and this result are sent along – you do not need to enter anything twice. We will check the land plot by plot and get back to you.",
    sendenPunkte: ["Free of charge and without obligation", "Status and documents later in the portal", "No disclosure to third parties without your consent"],
    kontoA: "Prefer to create an account first?",
    kontoLink: "Register free of charge",
    kontoB: "– you will then see your enquiries and their status in the portal.",
    rot: "Even with a red light, it is often worth a closer look: the heuristic does not know your land in detail.",
    senden: "Send result",
    fuss: (stand) => `Initial assessment based on your details and typical market values, as of ${stand} – not an offer and no commitment. We check grid capacity, planning law and protected assets plot by plot.`,
  },
};

/** Anzeige-Texte der Rechenlogik je Sprache (ids bleiben, Texte aus flaechencheckEn.js). */
function anzeige(en) {
  if (!en) {
    return {
      f: fmt,
      land: (l) => l.label,
      region: (r) => r,
      nutzung: (n) => n,
      bes: (b) => b,
      netz: (n) => n.label,
      eig: (e) => e,
      ampel: (k) => AMPEL[k],
      satz: (s) => s,
      spanne,
      stand: STAND,
    };
  }
  const f = (n, s = 0) => fmtZahl(n, s, "en");
  return {
    f,
    land: (l) => LAENDER_EN[l.id] ?? l.label,
    region: (r) => (r ? { ...r, ...(REGIONEN_EN[r.id] || {}) } : r),
    nutzung: (n) => (n ? { ...n, ...(NUTZUNGEN_EN[n.id] || {}) } : n),
    bes: (b) => (b ? { ...b, ...(BESONDERHEITEN_EN[b.id] || {}) } : b),
    netz: (n) => NETZ_EN[n.id] ?? n.label,
    eig: (e) => (e ? { ...e, ...(EIGENTUM_EN[e.id] || {}) } : e),
    ampel: (k) => ({ ...AMPEL[k], ...AMPEL_EN[k] }),
    satz: satzEn,
    spanne: (a, b) => (b >= 1e6 ? `€${f(a / 1e6, 2)}–${f(b / 1e6, 2)}m` : `€${f(a / 1000)}–${f(b / 1000)}k`),
    stand: datumText(STAND, "en"),
  };
}

/** Gespeicherten Zwischenstand prüfen – nur bekannte Werte übernehmen. */
function zustandLesen() {
  try {
    const roh = JSON.parse(window.sessionStorage.getItem(SPEICHER_SCHLUESSEL) || "null");
    if (!roh || typeof roh !== "object") return null;
    const land = LAENDER.some((l) => l.id === roh.land) ? roh.land : null;
    const regionId = land && regionenFuer(land).some((r) => r.id === roh.regionId) ? roh.regionId : null;
    const ha = Number.isFinite(roh.ha) ? Math.max(HA_MIN, Math.min(HA_MAX, roh.ha)) : 10;
    const nutzung = NUTZUNGEN.some((n) => n.id === roh.nutzung) ? roh.nutzung : null;
    const besonderheiten = besonderheitenFuer(land, Array.isArray(roh.besonderheiten) ? roh.besonderheiten.filter((id) => BESONDERHEITEN.some((b) => b.id === id)) : []);
    const netz = NETZ.some((n) => n.id === roh.netz) ? roh.netz : null;
    const eigentum = EIGENTUM.some((x) => x.id === roh.eigentum) ? roh.eigentum : null;
    // Nur bis zum ersten unvollständigen Schritt springen
    const ok = [Boolean(land && regionId), Boolean(nutzung), true, Boolean(netz && eigentum)];
    let max = 0;
    while (max < 4 && ok[max]) max += 1;
    const schritt = Math.max(0, Math.min(Number.isInteger(roh.schritt) ? roh.schritt : 0, max));
    if (!land && schritt === 0) return null;
    return { schritt, land, regionId, ha, nutzung, besonderheiten, netz, eigentum };
  } catch {
    return null;
  }
}

/**
 * Übernahme aus Rechnern (Pachtrechner, Agri-PV …): entweder per sessionStorage über
 * entwurfVorbelegen("flaechencheck", { ha, land, region }) oder per harmloser URL `/flaechencheck?ha=12&land=DE&region=…`.
 * Nur bekannte Werte; der Entwurf wird nach dem Lesen entfernt (einmalige Übergabe).
 */
function uebernahmeLesen() {
  let quelle = {};
  try {
    const roh = JSON.parse(window.sessionStorage.getItem("ov-entwurf:flaechencheck") || "null");
    if (roh?.werte && typeof roh.werte === "object") quelle = roh.werte;
    window.sessionStorage.removeItem("ov-entwurf:flaechencheck");
  } catch {
    /* egal */
  }
  try {
    const sp = new URLSearchParams(window.location.search);
    for (const k of ["ha", "land", "region"]) if (sp.get(k) && quelle[k] == null) quelle = { ...quelle, [k]: sp.get(k) };
  } catch {
    /* egal */
  }
  const landRoh = String(quelle.land || "").toUpperCase();
  const land = LAENDER.some((l) => l.id === landRoh) ? landRoh : null;
  const regionen = land ? regionenFuer(land) : [];
  const regionId = regionen.some((r) => r.id === quelle.region) ? quelle.region : regionen.length === 1 ? regionen[0].id : null;
  const haZahl = haLesen(quelle.ha ?? "");
  const ha = haZahl != null && haZahl >= HA_MIN && haZahl <= HA_MAX ? haZahl : null;
  if (!land && ha == null) return null;
  return { land, regionId, ha };
}

const spanne = (a, b) => (b >= 1e6 ? `${fmt(a / 1e6, 2)}–${fmt(b / 1e6, 2)} Mio. €` : `${fmt(a / 1000)}–${fmt(b / 1000)} Tsd. €`);

/** land: Land der Route (Welle 2) – belegt die Länderwahl vor; Besucher können sie ändern. */
export default function FlaechenWizard({ land: routenLand = null }) {
  const sprache = useSprache();
  const en = sprache === "en";
  const w = uebersetze(TEXTE, sprache);
  const az = anzeige(en);
  const [schritt, setSchritt] = useState(0);
  const [richtung, setRichtung] = useState("vor");
  const [land, setLand] = useState(routenLand);
  const [regionId, setRegionId] = useState(null);
  const [ha, setHa] = useState(10);
  const [nutzung, setNutzung] = useState(null);
  const [besonderheiten, setBesonderheiten] = useState([]);
  const [netz, setNetz] = useState(null);
  const [eigentum, setEigentum] = useState(null);
  const [haEingabe, setHaEingabe] = useState("10");
  const [haFehler, setHaFehler] = useState(false);
  const [geladen, setGeladen] = useState(false);
  const [wiederhergestellt, setWiederhergestellt] = useState(false);
  const [uebernommen, setUebernommen] = useState(null);
  const kopfRef = useRef(null);
  const haFeldRef = useRef(null);
  const ersterRender = useRef(true);
  const ohneSprung = useRef(false);

  // Zwischenstand aus dieser Browsersitzung wiederherstellen (FAQ: „bleiben in Ihrem Browser“)
  useEffect(() => {
    const z = zustandLesen();
    if (z) {
      ohneSprung.current = z.schritt !== 0;
      setLand(z.land);
      setRegionId(z.regionId);
      setHa(z.ha);
      setHaEingabe(haText(z.ha, document.documentElement.lang === "en"));
      setNutzung(z.nutzung);
      setBesonderheiten(z.besonderheiten);
      setNetz(z.netz);
      setEigentum(z.eigentum);
      setSchritt(z.schritt);
      setWiederhergestellt(true);
    } else {
      const u = uebernahmeLesen();
      if (u) {
        if (u.land) setLand(u.land);
        if (u.regionId) setRegionId(u.regionId);
        if (u.ha != null) {
          setHa(u.ha);
          setHaEingabe(haText(u.ha, document.documentElement.lang === "en"));
        }
        // Mit vollständigem Standort direkt zur Flächengröße – ohne Scrollsprung beim Laden
        if (u.land && u.regionId) {
          ohneSprung.current = true;
          setSchritt(1);
        }
        setUebernommen(u);
      }
    }
    setGeladen(true);
  }, []);

  useEffect(() => {
    if (!geladen) return;
    try {
      window.sessionStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify({ schritt, land, regionId, ha, nutzung, besonderheiten, netz, eigentum }));
    } catch {
      /* privater Modus o. Ä. – dann eben ohne Zwischenspeicher */
    }
  }, [geladen, schritt, land, regionId, ha, nutzung, besonderheiten, netz, eigentum]);

  // Regler bewegt → Feld nachziehen (nicht, während jemand im Feld tippt)
  useEffect(() => {
    if (typeof document !== "undefined" && document.activeElement === haFeldRef.current) return;
    setHaEingabe(haText(ha, en));
    setHaFehler(false);
  }, [ha, en]);

  useEffect(() => {
    if (ersterRender.current) {
      ersterRender.current = false;
      return;
    }
    if (ohneSprung.current) {
      ohneSprung.current = false;
      return;
    }
    const el = kopfRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 110;
    if (Math.abs(window.scrollY - top) > 120) window.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    el.focus({ preventScroll: true });
  }, [schritt]);

  const regionen = land ? regionenFuer(land) : [];
  const weiterOk = [Boolean(land && regionId), Boolean(nutzung && ha > 0 && !haFehler), true, Boolean(netz && eigentum)][schritt];
  const weiterHinweis = schritt === 1 && haFehler ? w.fehlerHa : w.weiterHinweis[schritt];

  // Live-Zwischenstand ab Schritt 2: dieselbe Bewertung wie am Ende, nur mit den bisherigen Angaben
  const zwischenstand = useMemo(
    () =>
      schritt >= 1 && schritt < 4 && land && regionId
        ? flaechencheck({ land, regionId, ha, nutzung, besonderheiten, netz: schritt >= 3 ? netz : null, eigentum: schritt >= 3 ? eigentum : null })
        : null,
    [schritt, land, regionId, ha, nutzung, besonderheiten, netz, eigentum]
  );

  function haTippen(text) {
    setHaEingabe(text);
    const v = haLesen(text, en);
    if (v == null) return; // leerer oder halber Zwischenstand: nichts klemmen
    setHaFehler(false);
    if (v >= HA_MIN && v <= HA_MAX) setHa(v);
  }

  function haVerlassen() {
    const v = haLesen(haEingabe, en);
    if (v == null) {
      setHaFehler(true);
      return;
    }
    const geklemmt = Math.max(HA_MIN, Math.min(HA_MAX, v));
    setHa(geklemmt);
    setHaEingabe(haText(geklemmt, en));
    setHaFehler(false);
  }

  const ergebnis = useMemo(
    () => (schritt === 4 ? flaechencheck({ land, regionId, ha, nutzung, besonderheiten, netz, eigentum }) : null),
    [schritt, land, regionId, ha, nutzung, besonderheiten, netz, eigentum]
  );

  function gehe(n) {
    setRichtung(n > schritt ? "vor" : "zurueck");
    setSchritt(n);
    // Messung (Hook aus Paket B): nur mit Einwilligung; nur Schrittnummer und Land, keine Eingaben
    if (n > schritt && n < 4) ereignis("formular_schritt", { quelle_formular: "flaechencheck", schritt: n + 1, markt: land || undefined });
  }

  useEreignisEinmal("flaechencheck_abgeschlossen", { quelle_formular: "flaechencheck", markt: land || undefined, wert_klasse: haKlasse(ha) }, schritt === 4);

  function landWaehlen(id) {
    setLand(id);
    setBesonderheiten((alt) => besonderheitenFuer(id, alt));
    const r = regionenFuer(id);
    setRegionId(r.length === 1 ? r[0].id : r.find((x) => x.id === regionId)?.id || null);
  }

  function umschalten(id) {
    setBesonderheiten((alt) => (alt.includes(id) ? alt.filter((x) => x !== id) : [...alt, id]));
  }

  function neu() {
    setLand(null);
    setRegionId(null);
    setHa(10);
    setNutzung(null);
    setBesonderheiten([]);
    setNetz(null);
    setEigentum(null);
    setHaEingabe("10");
    setHaFehler(false);
    setWiederhergestellt(false);
    setUebernommen(null);
    try {
      window.sessionStorage.removeItem(SPEICHER_SCHLUESSEL);
    } catch {
      /* egal */
    }
    gehe(0);
  }

  const karte = (an) =>
    cn(
      "relative flex cursor-pointer items-center gap-3.5 rounded-3xl p-4 transition-[background-color,box-shadow,transform] duration-200 active:scale-[0.985] focus-within:ring-2 focus-within:ring-ov-500 sm:p-5",
      an ? "bg-ov-50 ring-2 ring-ov-500" : "bg-sand-50 ring-1 ring-ink-200 hover:bg-white hover:ring-ink-300"
    );
  const iconBox = (an) => cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors", an ? "bg-ov-500 text-white" : "bg-white text-ov-600 ring-1 ring-ink-200");
  const legende = "font-display text-[clamp(1.4rem,1.1rem+1vw,1.9rem)] font-extrabold tracking-tight text-ink-900";

  return (
    <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_40px_90px_-50px_rgba(3,18,43,0.55)] ring-1 ring-ink-200/70">
      {/* Fortschritt */}
      <div ref={kopfRef} tabIndex={-1} className="border-b border-ink-100 bg-sand-50/70 px-5 py-5 outline-none sm:px-8 md:px-10">
        <ol className="flex items-center gap-2 sm:gap-3" aria-label={w.fortschritt}>
          {[...w.schritte, w.ergebnisSchritt].map((s, i) => {
            const fertig = i < schritt;
            const aktiv = i === schritt;
            return (
              <li key={s} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 last:flex-none" aria-current={aktiv ? "step" : undefined}>
                <button type="button" disabled={i > schritt} onClick={() => gehe(i)} className="flex min-w-0 items-center gap-2 rounded-full text-left disabled:cursor-default">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-colors", fertig ? "bg-ov-600 text-white" : aktiv ? "bg-navy-950 text-white" : "bg-white text-ink-500 ring-1 ring-ink-200")}>
                    {fertig ? <Check aria-hidden="true" className="h-4 w-4" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={cn("hidden truncate text-[14px] font-semibold xl:block", aktiv ? "text-ink-900" : fertig ? "text-ink-700" : "text-ink-500")}>{s}</span>
                  <span className="sr-only xl:hidden">{s}</span>
                </button>
                {i < 4 && <span aria-hidden="true" className={cn("h-px flex-1", fertig ? "bg-ov-400" : "bg-ink-200")} />}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[13px] font-semibold text-ink-700 xl:hidden" aria-hidden="true">
          {schritt < 4 ? w.schrittVon(schritt + 1, w.schritte[schritt]) : w.ihrErgebnis}
        </p>
        {uebernommen && schritt < 4 && (
          <p className="ov-ein mt-3 flex items-start gap-2 rounded-2xl bg-ov-50 px-3.5 py-2.5 text-[13px] leading-snug text-ov-900 ring-1 ring-inset ring-ov-200" role="status">
            <Check aria-hidden="true" className="mt-px h-4 w-4 shrink-0 text-ov-700" strokeWidth={3} />
            <span className="min-w-0">
              {w.uebernommen}{" "}
              {[uebernommen.ha != null && `${az.f(uebernommen.ha, uebernommen.ha % 1 ? 1 : 0)} ha`, uebernommen.land && az.land(LAENDER.find((l) => l.id === uebernommen.land) || { id: uebernommen.land }), uebernommen.regionId && az.region(regionenFuer(uebernommen.land).find((r) => r.id === uebernommen.regionId))?.label]
                .filter((x, i, alle) => x && alle.indexOf(x) === i)
                .join(" · ")}
              {w.aendern}
            </span>
          </p>
        )}
        {zwischenstand && <LiveAmpel e={zwischenstand} w={w} az={az} />}
      </div>

      <div className="p-5 sm:p-8 md:p-10">
        <div key={schritt} className={richtung === "vor" ? "ov-step-vor" : "ov-step-zurueck"}>
          {/* 1 Standort */}
          {schritt === 0 && (
            <div className="space-y-8">
              <fieldset>
                <legend className={legende}>{w.woTitel}</legend>
                <p className="mt-2 text-[15.5px] text-ink-600">{w.woText}</p>
                <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
                  {LAENDER.map((l) => {
                    const an = land === l.id;
                    return (
                      <label key={l.id} className={cn(karte(an), "flex-col gap-2 text-center sm:flex-row sm:text-left")}>
                        <input type="radio" name="land" value={l.id} checked={an} onChange={() => landWaehlen(l.id)} className="sr-only" />
                        <span className={cn(iconBox(an), "font-display text-[13px] font-extrabold")}>{l.id}</span>
                        <span className="text-[14.5px] font-semibold leading-tight text-ink-900">{az.land(l)}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              {land && regionen.length > 1 && (
                <fieldset className="ov-step-vor">
                  <legend className="text-[15px] font-semibold text-ink-800">{w.region}</legend>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {regionen.map(az.region).map((r) => {
                      const an = regionId === r.id;
                      return (
                        <label key={r.id} className={cn(karte(an), "py-3.5 sm:py-4")}>
                          <input type="radio" name="region" value={r.id} checked={an} onChange={() => setRegionId(r.id)} className="sr-only" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-semibold text-ink-900">{r.label}</span>
                            <span className="block text-[13px] text-ink-500">{r.sub}</span>
                          </span>
                          <span className="ov-num shrink-0 text-[12.5px] font-semibold text-ov-700">{az.f(r.ertrag)} kWh/kWp</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
            </div>
          )}

          {/* 2 Fläche */}
          {schritt === 1 && (
            <div className="space-y-8">
              <div>
                <p className={legende}>{w.groesseTitel}</p>
                <p className="mt-2 text-[15.5px] text-ink-600">{w.groesseText(grundstueck(land).mehrzahl)}</p>
                <div className="mt-6 grid items-end gap-5 sm:grid-cols-[1fr_auto]">
                  <Regler
                    label={w.flaechengroesse}
                    wert={Math.min(ha, 150)}
                    min={0.5}
                    max={150}
                    step={0.5}
                    format={(v) => (v >= 150 && ha > 150 ? `${az.f(ha, ha % 1 ? 1 : 0)} ha` : `${az.f(v, v % 1 ? 1 : 0)} ha`)}
                    onChange={setHa}
                    minLabel={w.minLabel}
                    maxLabel={w.maxLabel}
                  />
                  <div>
                    <label htmlFor="fc-ha-genau" className="mb-1.5 block text-[13px] font-semibold text-ink-700">
                      {w.genau}
                    </label>
                    <span className="relative block">
                      <input
                        ref={haFeldRef}
                        id="fc-ha-genau"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={haEingabe}
                        aria-invalid={haFehler || undefined}
                        aria-describedby="fc-ha-hilfe"
                        onChange={(e) => haTippen(e.target.value)}
                        onBlur={haVerlassen}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") haVerlassen();
                        }}
                        className={cn(
                          "ov-num h-12 w-full rounded-xl bg-sand-50 pl-4 pr-10 text-[16px] font-semibold text-ink-900 ring-1 focus:bg-white focus:outline-none focus:ring-2 sm:w-36",
                          haFehler ? "ring-danger-300 focus:ring-danger-500" : "ring-ink-300 focus:ring-ov-500"
                        )}
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-ink-500">ha</span>
                    </span>
                    <p
                      id="fc-ha-hilfe"
                      role={haFehler ? "alert" : undefined}
                      className={cn("mt-1.5 text-[12.5px] leading-snug sm:w-36", haFehler ? "flex gap-1 font-medium text-danger-700" : "text-ink-500")}
                    >
                      {haFehler ? (
                        <>
                          <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {w.fehlerHa}
                        </>
                      ) : (
                        w.haHilfe
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <fieldset>
                <legend className="text-[15px] font-semibold text-ink-800">{w.nutzungTitel}</legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {NUTZUNGEN.map(az.nutzung).map((n) => {
                    const an = nutzung === n.id;
                    const Icon = NUTZUNG_ICON[n.id];
                    return (
                      <label key={n.id} className={karte(an)}>
                        <input type="radio" name="nutzung" value={n.id} checked={an} onChange={() => setNutzung(n.id)} className="sr-only" />
                        <span className={iconBox(an)}>
                          <Icon aria-hidden="true" className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-display text-[16px] font-bold text-ink-900">{n.label}</span>
                          <span className="block text-[13px] leading-snug text-ink-500">{n.text}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          )}

          {/* 3 Besonderheiten */}
          {schritt === 2 && (
            <fieldset>
              <legend className={legende}>{w.besTitel}</legend>
              <p className="mt-2 text-[15.5px] text-ink-600">{w.besText}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {BESONDERHEITEN.filter((b) => b.id !== "benachteiligt" || land === "DE").map(az.bes).map((b) => {
                  const an = besonderheiten.includes(b.id);
                  const Icon = BES_ICON[b.id];
                  return (
                    <label key={b.id} className={karte(an)}>
                      <input type="checkbox" checked={an} onChange={() => umschalten(b.id)} className="sr-only" />
                      <span className={iconBox(an)}>
                        <Icon aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 pr-6">
                        <span className="block font-display text-[16px] font-bold leading-snug text-ink-900">{b.label}</span>
                        <span className="block text-[13px] leading-snug text-ink-500">{b.text}</span>
                      </span>
                      <span aria-hidden="true" className={cn("absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full transition-all", an ? "bg-ov-500 text-white" : "bg-white ring-1 ring-ink-300")}>
                        {an && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* 4 Netz & Eigentum */}
          {schritt === 3 && (
            <div className="space-y-9">
              <fieldset>
                <legend className={legende}>{w.netzTitel}</legend>
                <p className="mt-2 text-[15.5px] text-ink-600">{w.netzText}</p>
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {NETZ.map((n) => {
                    const an = netz === n.id;
                    return (
                      <label key={n.id} className={cn("flex min-h-[56px] cursor-pointer items-center justify-center rounded-2xl px-3 py-2 text-center text-[14.5px] font-semibold transition-all focus-within:ring-2 focus-within:ring-ov-500", an ? "bg-ov-50 text-ov-800 ring-2 ring-ov-500" : "bg-sand-50 text-ink-800 ring-1 ring-ink-200 hover:bg-white")}>
                        <input type="radio" name="netz" value={n.id} checked={an} onChange={() => setNetz(n.id)} className="sr-only" />
                        {az.netz(n)}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-[15px] font-semibold text-ink-800">{w.eigentumTitel}</legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {EIGENTUM.map(az.eig).map((e) => {
                    const an = eigentum === e.id;
                    const Icon = EIG_ICON[e.id];
                    return (
                      <label key={e.id} className={karte(an)}>
                        <input type="radio" name="eigentum" value={e.id} checked={an} onChange={() => setEigentum(e.id)} className="sr-only" />
                        <span className={iconBox(an)}>
                          <Icon aria-hidden="true" className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-display text-[15.5px] font-bold leading-snug text-ink-900">{e.label}</span>
                          <span className="block text-[13px] leading-snug text-ink-500">{e.text}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          )}

          {schritt === 4 && ergebnis && (
            <Ergebnis e={ergebnis} eingaben={{ land, regionId, ha, nutzung, besonderheiten, netz, eigentum }} onNeu={neu} onAendern={gehe} w={w} az={az} en={en} />
          )}
        </div>

        {schritt < 4 && (
          <div className="mt-10 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center">
            {schritt > 0 ? (
              <button type="button" onClick={() => gehe(schritt - 1)} className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold text-ink-700 hover:bg-ink-100">
                <ArrowLeft aria-hidden="true" className="h-4 w-4" /> {w.zurueck}
              </button>
            ) : (
              <p className="text-[13px] text-ink-500">
                {wiederhergestellt ? w.geraet : w.start}
              </p>
            )}
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <button
              type="button"
              disabled={!weiterOk}
              data-ov-cta=""
              aria-describedby={!weiterOk && weiterHinweis ? "fc-weiter-hinweis" : undefined}
              onClick={() => gehe(schritt + 1)}
              className="group inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-ov-600 px-8 text-[16px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] transition-[background-color,box-shadow,transform] duration-200 ease-ov-out hover:bg-ov-700 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500 disabled:shadow-none"
            >
              {schritt === 3 ? w.zeigen : schritt === 2 && besonderheiten.length === 0 ? w.nichts : w.weiter}
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-enabled:group-hover:translate-x-1 group-enabled:group-focus-visible:translate-x-1" />
            </button>
            {!weiterOk && weiterHinweis && (
              <p id="fc-weiter-hinweis" className="animate-ov-einblenden text-center text-[13px] text-ink-600 sm:text-right">
                {weiterHinweis}
              </p>
            )}
            </div>
          </div>
        )}
        {schritt < 4 && schritt > 0 && wiederhergestellt && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-ink-500">
            <p>{w.geraet}</p>
            <button type="button" onClick={neu} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 font-semibold text-ink-700 hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> {w.neu}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Live-Zwischenstand im Kopf des Assistenten: Punktwert als Balken (scaleX),
 * Ampel mit Text und die zuletzt wirksame Begründung („+15 Punkte: …“).
 */
function LiveAmpel({ e, w, az }) {
  const a = az.ampel(e.ampel);
  const vorher = useRef(null);
  const [letzte, setLetzte] = useState(null);

  useEffect(() => {
    const alt = vorher.current;
    vorher.current = e;
    if (!alt) return;
    // Neue oder geänderte Begründung finden (die, die den Wert bewegt hat)
    const altPunkte = new Map(alt.gruende.map((g) => [g.text, g.punkte]));
    const neu = e.gruende.find((g) => g.punkte !== 0 && altPunkte.get(g.text) !== g.punkte);
    const delta = e.score - alt.score;
    if (neu) {
      setLetzte({ punkte: neu.punkte, text: neu.text, delta });
    } else if (delta !== 0) {
      const weg = alt.gruende.find((g) => g.punkte !== 0 && !e.gruende.some((x) => x.text === g.text));
      if (weg) setLetzte({ punkte: -weg.punkte, text: weg.text, entfaellt: true, delta });
    }
  }, [e]);

  const vz = (n) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

  return (
    <div className="mt-4 rounded-2xl bg-white px-4 py-3 ring-1 ring-ink-200/70">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-900">
          <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", a.ton)} />
          {w.zwischenstand}{a.label}
        </p>
        <div className="flex min-w-[8rem] flex-1 items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
            <div className={cn("ov-fortschritt h-full w-full rounded-full", a.ton)} style={{ transform: `scaleX(${Math.max(0.02, e.score / 100)})` }} />
          </div>
          <p className="ov-num shrink-0 text-[13px] font-bold text-ink-900">
            {e.score}
            <span className="font-medium text-ink-500"> / 100</span>
          </p>
        </div>
      </div>
      <p className="mt-1.5 min-h-5 text-[12.5px] leading-snug text-ink-600" aria-live="polite">
        {letzte ? (
          <span key={`${letzte.text}${letzte.delta}`} className="animate-ov-einblenden block truncate">
            <span className={cn("ov-num font-bold", letzte.punkte > 0 ? "text-ov-700" : "text-ink-700")}>{vz(letzte.punkte)} {w.punkte}</span> · {letzte.entfaellt ? w.entfaellt : ""}{az.satz(letzte.text)}
          </span>
        ) : (
          w.nochNicht
        )}
      </p>
    </div>
  );
}

function Tacho({ score, farbe, w }) {
  // Halbkreis 180°, Radius 80. Füllung über stroke-dashoffset (pathLength 100) statt stroke-dasharray –
  // nur der Versatz wird animiert (DESIGN § 3.3); unter reduced-motion springt der Wert.
  // Ergebnis-Moment: Beim Erscheinen füllt sich der Bogen von 0 und die Zahl zählt mit (rAF, ändert nur den Textknoten).
  // Das Server-/Erst-Render enthält bereits den Endwert; ohne JS-Effekt oder bei reduzierter Bewegung bleibt er stehen.
  const anteil = Math.max(0, Math.min(100, score));
  // Nur den Wert des vorhandenen Textknotens ändern (React behält seinen Knoten)
  const zahl = (v) => {
    const k = zahlRef.current?.firstChild;
    if (k) k.nodeValue = String(v);
  };
  const zahlRef = useRef(null);
  const animiert = useRef(false);
  // Start bei 0 (Bogen leer), der Effekt füllt ihn – unter reduzierter Bewegung ohne Übergang (motion-safe)
  const [gezeigt, setGezeigt] = useState(0);

  useLayoutEffect(() => {
    if (animiert.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setGezeigt(anteil);
      zahl(score);
      return;
    }
    zahl(0);
    let raf = 0;
    let start = 0;
    const dauer = 900;
    const t0 = window.setTimeout(() => {
      animiert.current = true;
      setGezeigt(anteil);
      const schritt = (t) => {
        if (!start) start = t;
        const p = Math.min(1, (t - start) / dauer);
        zahl(Math.round(score * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(schritt);
      };
      raf = requestAnimationFrame(schritt);
    }, 160);
    return () => {
      window.clearTimeout(t0);
      cancelAnimationFrame(raf);
      zahl(score);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  return (
    <svg viewBox="0 0 200 116" className="h-auto w-full max-w-[220px]" role="img" aria-label={w.punktwert(score)}>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="16" strokeLinecap="round" />
      <path
        d="M20 100 A80 80 0 0 1 180 100"
        fill="none"
        stroke={farbe}
        strokeWidth="16"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="100 100"
        strokeDashoffset={100 - gezeigt}
        className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-[900ms] motion-safe:ease-ov-out"
      />
      <text ref={zahlRef} x="100" y="92" textAnchor="middle" className="fill-white font-display text-[40px] font-extrabold" style={{ fontVariantNumeric: "tabular-nums" }}>{score}</text>
      <text x="100" y="112" textAnchor="middle" className="fill-white/75 text-[11px]">{w.vonHundert}</text>
    </svg>
  );
}

function Ergebnis({ e, eingaben, onNeu, onAendern, w, az, en }) {
  const a = az.ampel(e.ampel);
  const nutzungLabel = NUTZUNGEN.find((n) => n.id === eingaben.nutzung)?.label;
  const netzLabel = NETZ.find((n) => n.id === eingaben.netz)?.label;
  const nutzungAnzeige = az.nutzung(NUTZUNGEN.find((n) => n.id === eingaben.nutzung))?.label;
  const netzAnzeige = az.netz(NETZ.find((n) => n.id === eingaben.netz) || NETZ[NETZ.length - 1]);
  const gs = grundstueck(eingaben.land);
  const f = az.f;
  // Texte der Rechenlogik sagen „Flurstücke“ – in AT/CH heißt das Grundstück/Parzelle (Begriff aus src/lib/anfrage/laender.js).
  // Englisch: Übersetzung der deutschen Sätze („plots“ für alle Länder).
  const schritteLand = en ? e.schritte.map(az.satz) : e.schritte.map((t) => t.replace(/Flurstücke/g, gs.mehrzahl).replace(/Flurstück/g, gs.einzahl));
  const landName = w.landName[eingaben.land] || w.ihrLand;
  // Länder-Sperre: €-Pacht und GAP nur für Deutschland, bis die Rechenlogik AT/CH geprüft ist (Paket E / B1)
  const mitPacht = LAENDER_LOGIK_FERTIG.includes(eingaben.land) && Boolean(e.pachtJahr && e.pacht30);

  // Paket C: Land, Fläche und Nutzung zusätzlich FLACH mitsenden – so liest sie das Backend für die Fläche
  // (vorher kam nur daten.eingaben an: ha leer, Nutzung „Acker“, Land DE).
  const daten = {
    quelle: "flaechencheck",
    land: eingaben.land,
    ha: eingaben.ha,
    nutzung: eingaben.nutzung,
    regionId: eingaben.regionId,
    eingaben: {
      land: eingaben.land,
      region: e.region.label,
      flaecheHa: eingaben.ha,
      nutzungId: eingaben.nutzung,
      nutzung: nutzungLabel,
      besonderheiten: eingaben.besonderheiten.map((id) => BESONDERHEITEN.find((b) => b.id === id)?.label),
      netz: netzLabel,
      eigentum: EIGENTUM.find((x) => x.id === eingaben.eigentum)?.label,
    },
    ergebnis: {
      ampel: e.ampel,
      punkte: e.score,
      leistungMwp: Math.round(e.kwp / 100) / 10,
      ertragMwhJahr: Math.round(e.kwh / 1000),
      ...(mitPacht ? { pachtJahrEur: [Math.round(e.pachtJahr.min), Math.round(e.pachtJahr.max)], pacht30JahreEur: [Math.round(e.pacht30.min), Math.round(e.pacht30.max)] } : {}),
      netzkostenEurProKwp: e.netzProKwp ? Math.round(e.netzProKwp) : null,
      gruende: e.gruende.map((g) => `${g.punkte > 0 ? "+" : ""}${g.punkte} ${g.text}`),
      stand: STAND,
    },
  };

  return (
    <div>
      {/* Zusammenfassung */}
      <div className="ov-noise relative overflow-hidden rounded-3xl bg-navy-950 p-6 text-white md:p-8">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div aria-hidden="true" className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-ov-500/30 blur-[90px]" />
        <div className="relative grid items-center gap-6 md:grid-cols-[auto_1fr] md:gap-10">
          <div className="mx-auto w-full max-w-[220px]">
            <Tacho score={e.score} farbe={a.farbe} w={w} />
          </div>
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-300">{w.kopf(az.stand)}</p>
            <h2 className="mt-3 flex flex-wrap items-center gap-3 font-display text-[clamp(1.6rem,1.2rem+1.6vw,2.4rem)] font-extrabold leading-tight tracking-tight" aria-live="polite">
              <span aria-hidden="true" className={cn("h-4 w-4 rounded-full ring-4 ring-white/10", a.ton)} />
              {a.label}
            </h2>
            <p className="mt-2 max-w-xl text-[15.5px] leading-relaxed text-white/70">{a.text}</p>
            <ul className="mt-4 flex flex-wrap gap-2 text-[13px]">
              {[
                [az.region(e.region).label, 0],
                [w.chipFlaeche(f(eingaben.ha, eingaben.ha % 1 ? 1 : 0), nutzungAnzeige), 1],
                [w.chipBes(eingaben.besonderheiten.length), 2],
                [w.chipNetz(netzAnzeige), 3],
              ].map(([c, s]) => (
                <li key={c}>
                  <button type="button" onClick={() => onAendern(s)} className="ov-glass inline-flex items-center rounded-full px-3 py-1.5 text-white/90 hover:bg-white/15" aria-label={w.chipAendern(c)}>
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Kennzahlen */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [w.leistung, `${f(e.kwp / 1000, 1)} MWp`, w.leistungZ(f(e.nutzbarHa, 1))],
          [w.ertrag, w.ertragW(f(e.kwh / 1e6, 1)), w.haushalte(f(Math.round(e.kwh / 3500 / 10) * 10))],
          ...(mitPacht
            ? [
                [w.pachtJahr, az.spanne(e.pachtJahr.min, e.pachtJahr.max), w.pachtHa(f(e.pachtJahr.min / eingaben.ha), f(e.pachtJahr.max / eingaben.ha))],
                [w.pacht30, az.spanne(e.pacht30.min, e.pacht30.max), w.indexiert(f(PACHT.indexierung * 100, 1))],
              ]
            : [[w.pacht, w.vorbereitung, w.pachtLand(landName)]]),
        ].map(([k, v, z], i) => (
          <div key={k} className={cn("rounded-2xl p-4 md:p-5", i === 2 ? "bg-ov-600 text-white" : "bg-white ring-1 ring-ink-200/70", !mitPacht && i === 2 && "col-span-2")}>
            <p className={cn("text-[12.5px] font-medium", i === 2 ? "text-white" : "text-ink-500")}>{k}</p>
            <p className="ov-num mt-1 font-display text-[clamp(1.1rem,0.95rem+0.6vw,1.5rem)] font-extrabold leading-tight tracking-tight">{v}</p>
            <p className={cn("mt-1 text-[12.5px] leading-snug", i === 2 ? "text-white" : "text-ink-500")}>{z}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Begründung */}
        <section aria-labelledby="fc-gruende" className="rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 md:p-7">
          <h3 id="fc-gruende" className="font-display text-[19px] font-extrabold tracking-tight text-ink-900">{w.bewertung}</h3>
          <ul className="mt-5 space-y-3">
            {e.gruende.map((g) => (
              <li key={g.text} className="flex gap-3 text-[14.5px] leading-relaxed text-ink-700">
                {g.art === "plus" ? (
                  <CirclePlus aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
                ) : g.art === "minus" ? (
                  <CircleMinus aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sun-500" />
                ) : (
                  <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-navy-400" />
                )}
                <span className="min-w-0 flex-1">{az.satz(g.text)}</span>
                {g.punkte !== 0 && (
                  <span className={cn("ov-num shrink-0 font-semibold", g.punkte > 0 ? "text-ov-700" : "text-ink-500")}>
                    {g.punkte > 0 ? "+" : "−"}
                    {Math.abs(g.punkte)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-4">
          {e.agri && (
            <div className="rounded-3xl bg-ov-50 p-5 ring-1 ring-ov-200 md:p-6">
              <p className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
                <Sprout aria-hidden="true" className="h-5 w-5 text-ov-600" /> {w.agriTitel}
              </p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-700">
                {w.agriA}<strong>{f(e.agri.kwp / 1000, 1)} MWp</strong>{w.agriB}
                {mitPacht ? w.agriPacht(f(AGRI.gapFoerderfaehig * 100), f(PACHT.agriProHa.min), f(PACHT.agriProHa.max)) : w.agriLand(landName)}
              </p>
              <Link href={pfad("/agri-pv")} className="mt-3 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-ov-700 hover:text-ov-800">
                {w.agriLink} <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          )}
          {e.carport && (
            <div className="rounded-3xl bg-navy-50 p-5 ring-1 ring-navy-100 md:p-6">
              <p className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
                <Car aria-hidden="true" className="h-5 w-5 text-navy-600" /> {w.carportTitel}
              </p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-700">{w.carportText}</p>
              <Link href={pfad("/solarcarport")} className="mt-3 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-navy-700 hover:text-navy-800">
                {w.carportLink} <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          )}
          <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
            <p className="font-display text-[17px] font-bold text-ink-900">{w.naechste}</p>
            <ol className="mt-4 space-y-3">
              {schritteLand.map((s, i) => (
                <li key={s} className="flex gap-3 text-[14px] leading-relaxed text-ink-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ov-50 text-[12px] font-bold text-ov-700 ring-1 ring-ov-200">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <Link href="/termin?herkunft=flaechencheck&art=beratung_video" className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-ov-600 px-5 text-[14.5px] font-semibold text-white hover:bg-ov-700">
              {w.termin}
            </Link>
          </div>
        </div>
      </div>

      {/* Anfrage */}
      <section aria-labelledby="fc-anfrage" className="mt-10 grid gap-8 rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 md:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
        <div>
          <h3 id="fc-anfrage" className="font-display text-[clamp(1.35rem,1.1rem+0.8vw,1.75rem)] font-extrabold tracking-tight text-ink-900">{w.sendenTitel}</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{w.sendenText(gs.genau)}</p>
          <ul className="mt-5 space-y-2.5 text-[14.5px] text-ink-700">
            {w.sendenPunkte.map((t) => (
              <li key={t} className="flex gap-2.5">
                <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" strokeWidth={3} />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[13.5px] leading-relaxed text-ink-600">
            {w.kontoA}{" "}
            <Link href="/registrieren?rolle=flaeche" className="font-semibold text-ov-700 underline underline-offset-4 hover:text-ov-800">
              {w.kontoLink}
            </Link>{" "}
            {w.kontoB}
          </p>
          {e.ampel === "rot" && (
            <p className="mt-5 flex gap-2.5 rounded-2xl bg-white p-4 text-[13.5px] leading-relaxed text-ink-600 ring-1 ring-ink-200">
              <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sun-500" />
              {w.rot}
            </p>
          )}
        </div>
        <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-7">
          <AnfrageFormular typ="flaeche" land={eingaben.land} daten={daten} felder={["telefon", "plz", "ort", "nachricht"]} button={w.senden} />
        </div>
      </section>

      {/* Paket B4: Ergebnis als Bericht (ruhiger Zusatz; das Ergebnis oben bleibt frei) */}
      <BerichtAnfordern rechner="flaechencheck" land={eingaben.land} eingaben={eingaben} className="mt-8" />

      <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-ink-100 pt-6 sm:flex-row sm:items-center">
        <p className="max-w-2xl text-[13px] leading-relaxed text-ink-500">
          {w.fuss(az.stand, gs.genau)}
        </p>
        <button type="button" onClick={onNeu} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[14.5px] font-semibold text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50">
          <RotateCcw aria-hidden="true" className="h-4 w-4" /> {w.neu}
        </button>
      </div>
    </div>
  );
}
