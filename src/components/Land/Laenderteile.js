// Länderteile für Inhaltsseiten (Inhalte AT/CH, Gruppe 2) – ohne Hooks, also in Server- und
// Client-Komponenten nutzbar. Baut nur auf der Länderinhalte-Schnittstelle auf
// (src/lib/land/inhalte.js, src/components/Land/LandHinweis.js) und ändert kein Design:
// dieselben Bausteine, nur anderer Text.
//
// Regel (Vorgabe des Inhabers):
//   gemeinsame Seite (land = null): deutsche Werte bleiben, dezent „(gilt für Deutschland)“
//   DE: deutsche Werte ohne Vermerk
//   AT/CH: keine deutschen Werte/Regeln; stattdessen der LandHinweis („… werden geprüft –
//          Ergebnis auf Anfrage“) oder ein geprüfter Ländertext (Eintrag AT/CH)
//
//   faqFuerLand(FAQ, land)        Einträge mit nurDE: "Thema" bzw. AT/CH: { q?, a? }
//   listeFuerLand(LISTE, land, f) beliebige Listen (Faktenkarten, Regeln …), f = Ersatzbauer
//   <NurDE land thema>…</NurDE>   Satz/Fließtext innerhalb eines Absatzes
//   <NurDEAbsatz land thema>…</NurDEAbsatz>  ganzer Absatz (<p>), AT/CH: LandHinweis-Zeile

import { GiltFuer, LandHinweis } from "@/components/Land/LandHinweis";
import { LAENDER, landCode, landHinweisText, landHinweisTextEn } from "@/lib/land";
import T from "@/components/Sprache/T";

// Englisch (Sprachmodell): faqFuerLand(items, land, { sprache: "en" }) schreibt den Länderhinweis
// englisch; das Thema kommt dann aus dem (übersetzten) Eintrag nurDE: "Lease rates". Die übrigen
// Bausteine nehmen themaEn mit (<NurDEBlock land thema="Pachtwerte" themaEn="Lease rates">).
import { fakt, fmtZahl } from "@/lib/fakten";

/** Text für AT/CH, wenn eine Antwort nur nach deutschem Recht/Werten gilt. */
export function nurDeText(land, thema, sprache = "de") {
  const l = landCode(land);
  if (!l || l === "DE") return "";
  if (sprache === "en") {
    return `The answer depends on the law and market of the country; the information here applies ${LAENDER.DE.en.fuerLand}. ${landHinweisTextEn(l, thema || "Rules and figures")}.`;
  }
  thema = thema || "Regeln und Werte";
  return `Die Antwort hängt vom Recht und Markt des Landes ab; die Angaben hier gelten ${LAENDER.DE.fuerLand}. ${landHinweisText(l, thema)}.`;
}

const ohneSteuerung = ({ nurDE, AT, CH, DE, ...rest }) => rest;

/**
 * FAQ-Liste je Land.
 * Eintrag: { q, a, nurDE?: "Thema", AT?: { q?, a? }, CH?: { q?, a? } }
 *  - AT/CH-Eintrag vorhanden → geprüfter Ländertext
 *  - nurDE: gemeinsam a + „(gilt für Deutschland)“, DE unverändert, AT/CH nurDeText()
 *  - sonst unverändert (gilt in DACH)
 * Antworten als JSX bekommen aText für das FAQ-Schema (ui/Faq).
 * markieren: true → auch in AT/CH die deutsche Antwort mit „(gilt für Deutschland)“ statt des Hinweises
 *   (nur für ausdrücklich deutsche Marktdaten, z. B. EEG-Ausschreibungsergebnisse auf /marktdaten).
 */
export function faqFuerLand(items, land, { markieren = false, sprache = "de" } = {}) {
  const l = landCode(land);
  return items.map((it) => {
    const basis = ohneSteuerung(it);
    if (l && it[l]) return { ...basis, ...it[l] };
    if (!it.nurDE) return basis;
    if (l === "DE") return basis;
    if (!l || markieren) {
      const text = typeof it.a === "string" ? it.a : it.aText;
      return {
        ...basis,
        a: (
          <>
            {it.a} <GiltFuer />
          </>
        ),
        ...(text ? { aText: text } : {}),
      };
    }
    return { q: it.q, a: nurDeText(l, it.nurDE === true ? undefined : it.nurDE, sprache) };
  });
}

/**
 * Beliebige Liste je Land (Faktenkarten, Regelkarten, Stichpunkte).
 * Eintrag mit nurDE: "Thema" gilt nur für Deutschland; AT/CH-Eintrag ersetzt ihn im Land.
 * @param {object[]} items
 * @param {string|null} land
 * @param {(it: object, l: string) => object|null} ersatz Ersatz in AT/CH ohne Ländereintrag (null = weglassen)
 * @param {(it: object) => object} [vermerk] Fassung für die gemeinsame Seite (Standard: unverändert)
 */
export function listeFuerLand(items, land, ersatz, vermerk = (it) => it) {
  const l = landCode(land);
  return items
    .map((it) => {
      const basis = ohneSteuerung(it);
      if (l && it[l]) return { ...basis, ...it[l] };
      if (!it.nurDE || l === "DE") return basis;
      if (!l) return vermerk(basis);
      return ersatz ? ersatz(basis, l, it.nurDE) : null;
    })
    .filter(Boolean);
}

/** Inline: Satz nur mit deutschen Werten (in einem Absatz). */
export function NurDE({ land, thema, themaEn, children, vermerk = true, dunkel = false }) {
  const l = landCode(land);
  if (l === "DE") return children;
  if (!l)
    return (
      <>
        {children}
        {vermerk && (
          <>
            {" "}
            <GiltFuer dunkel={dunkel} />
          </>
        )}
      </>
    );
  return (
    <span data-land-hinweis={l}>
      <T de={`${landHinweisText(l, thema)}.`} en={`${landHinweisTextEn(l, themaEn)}.`} />
    </span>
  );
}

/** Ganzer Absatz nur mit deutschen Werten. AT/CH: kompakte LandHinweis-Zeile. */
export function NurDEAbsatz({ land, thema, themaEn, children, className, dunkel = false }) {
  const l = landCode(land);
  if (l && l !== "DE") return <LandHinweis land={l} thema={thema} themaEn={themaEn} zeile className={className} />;
  return (
    <p className={className}>
      {children}
      {!l && (
        <>
          {" "}
          <GiltFuer dunkel={dunkel} />
        </>
      )}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Geprüfte Länderfakten (Faktenregister, status „geprueft“)           */
/* ------------------------------------------------------------------ */

/**
 * Rechenwert Jahresertrag Freiflächen-PV für AT/CH aus dem Faktenregister (PVGIS, am Original geprüft).
 * @returns {{ wert: string, zahl: number, text: string, quelle: object } | null}
 */
export function ertragFuerLand(land, sprache = "de") {
  const l = landCode(land);
  if (l !== "AT" && l !== "CH") return null;
  const f = fakt(`region.${l.toLowerCase()}.ertrag`, l);
  if (!f || f.status !== "geprueft") return null;
  if (sprache === "en") {
    const gebietEn = l === "AT" ? "in Austria's lowlands and hill country" : "on the Swiss Plateau";
    return { wert: fmtZahl(f.wert, l), zahl: f.wert, text: `kWh per kWp and year – calculation value for ground-mounted PV ${gebietEn} (PVGIS)`, quelle: f.quelle };
  }
  const gebiet = l === "AT" ? "im österreichischen Flach- und Hügelland" : "im Schweizer Mittelland";
  return { wert: fmtZahl(f.wert, l), zahl: f.wert, text: `kWh je kWp und Jahr – Rechenwert für Freiflächen-PV ${gebiet} (PVGIS)`, quelle: f.quelle };
}

/**
 * Förderweg für Photovoltaik in AT/CH – belegt durch die geprüften Termine im Faktenregister
 * (EAG-Fördercall der EAG-Abwicklungsstelle bzw. Pronovo-Auktionen), ohne Fördersätze.
 */
export function foerderwegFuerLand(land, sprache = "de") {
  const l = landCode(land);
  const en = sprache === "en";
  if (l === "AT") {
    const f = fakt("termin.eag.investitionszuschussCall3", "AT", { stichtag: "2026-10-04" });
    if (f?.status !== "geprueft") return null;
    return {
      wert: "EAG",
      text: en
        ? "In Austria, investment grants for photovoltaics are awarded by the EAG funding settlement agency (EAG-Abwicklungsstelle) through funding calls"
        : "Investitionszuschüsse für Photovoltaik vergibt in Österreich die EAG-Abwicklungsstelle über Fördercalls",
      quelle: f.quelle,
    };
  }
  if (l === "CH") {
    const f = fakt("termin.pronovo.auktionRunde4", "CH", { stichtag: "2026-10-04" });
    if (f?.status !== "geprueft") return null;
    return {
      wert: "Pronovo",
      text: en
        ? "awards the high one-off remuneration and the sliding market premium for PV in Switzerland through auctions"
        : "vergibt in der Schweiz die hohe Einmalvergütung und die gleitende Marktprämie für PV über Auktionen",
      quelle: f.quelle,
    };
  }
  return null;
}

/**
 * Block mit Werten/Regeln für Deutschland (z. B. Methodik eines Rechners).
 * DE und gemeinsam: unverändert (auf Rechnerseiten trägt die Annahmen-Box daneben „gilt für Deutschland“),
 * AT/CH: eine LandHinweis-Zeile statt des Blocks.
 */
export function NurDEBlock({ land, thema = "Annahmen und Rechenwerte", themaEn = "Assumptions and figures", children, className }) {
  const l = landCode(land);
  if (l && l !== "DE") return <LandHinweis land={l} thema={thema} themaEn={themaEn} zeile className={className} />;
  return children;
}
