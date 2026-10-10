// src/lib/bericht/ratsvorlage.js – Bericht-Baustein „Ratsvorlage Solarpark (Muster)“ (Welle 3, Paket B8)
//
// Feldregeln, Länderprüfung, Normalisierung, Neuberechnung und Zusammenfassung für die druckfertige Ratsvorlage.
// Eingebunden in src/lib/bericht/neuRechnen.js (RECHNER.ratsvorlage); die Seite /bericht/[token] zeigt sie mit
// src/components/Bericht/RatsvorlageSeite.js. Lead: Name und E-Mail (Kontakt des Bericht-Bausteins) plus Gemeinde
// (Eingabe „gemeinde“); Vorgangstyp „kommune“ → Routing je Land (src/data/lead-routing.js).
//
//  DE  Zahlen aus dem Kommunal-Rechner (rechneKommune, unverändert) + Landesregel des Bundeslands
//      (src/lib/rechner/kommunePflichten.js, Faktenregister, „Prüfung ausstehend“, NICHT addiert).
//  AT  keine Geldwerte: Widmungsschritte und Prüfpunkte des Bundeslands aus den Regionsdateien
//      (src/lib/kommune/widmung.js) und die ElWG-Aussage aus dem Register.
//  CH  noch keine Vorlage (422) – die Seite zeigt den Länderhinweis.
//
// Beschlussvorschlag = MUSTER ohne Rechtsberatung (Kennzeichnung im Dokument). Aussagen nur aus Texten, die die
// Website bereits mit Quelle trifft (/kommunen, /rechner/kommune, Regionsdateien).

import { PlattformFehler } from "@/lib/plattform/fehler";
import { text as textBereinigen } from "@/lib/plattform/validierung";
import { BAUART, KOMMUNE, PACHT } from "@/lib/invest/markt";
import { annahmenbuch } from "@/lib/invest/laender/marktFuer";
import { fakt, anzeigeStatus, waehrungFuer } from "@/lib/fakten";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";
import { STANDARD as KOMMUNE_STANDARD, KOMMUNE_FAKTEN } from "@/lib/rechner/kommune";
import { BUNDESLAENDER, STANDARD_BUNDESLAND, bundeslandFuer, landesregelFakten, landesregelTexte, rechneKommunal2 } from "@/lib/rechner/kommunePflichten";
import { GEMEINSAM, WIDMUNG_FAKTEN, egStand, widmungskitFuer } from "@/lib/kommune/widmung";

export const RATSVORLAGE_VERSION = "2026-10-09";
export const MUSTER_HINWEIS =
  "Muster ohne Rechtsberatung: Diese Vorlage ist ein unverbindlicher Formulierungsvorschlag auf Grundlage Ihrer Eingaben. Zuständigkeiten, Wortlaut und Verfahren richten sich nach der Gemeindeordnung Ihres Landes und der Geschäftsordnung Ihres Gemeinderats. Bitte lassen Sie die Vorlage vor der Verwendung von Ihrer Verwaltung bzw. der Kommunalaufsicht prüfen.";

const LAND_NAME = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" };
const ALLE_BUNDESLAENDER = [...BUNDESLAENDER.DE, ...BUNDESLAENDER.AT].map((b) => b.slug);
/** Felder je Land (Österreich ohne Geldwerte) */
const FELDER_AT = new Set(["bundesland", "gemeinde", "mwp"]);
const GEMEINDE_MUSTER = /^[\p{L}\p{M}0-9 .,'’()/-]{2,80}$/u;

/** Gemeindename: 2–80 Zeichen, Buchstaben, Ziffern, Leerzeichen und . , ' ’ ( ) / - */
export function gemeindePruefen(wert) {
  const t = textBereinigen(wert, 80);
  if (!t || !GEMEINDE_MUSTER.test(t)) throw new PlattformFehler(422, "Bitte geben Sie den Namen der Gemeinde an (2 bis 80 Zeichen).", "eingabe");
  return t;
}

/** Feldregeln im Format von neuRechnen.js (zahl/wahl/jaNein/eigen werden dort gebaut und übergeben). */
export function regelnRatsvorlage({ zahl, wahl, jaNein, eigen }) {
  return {
    gemeinde: eigen(gemeindePruefen),
    bundesland: wahl(ALLE_BUNDESLAENDER),
    mwp: zahl(1, 500),
    hebesatz: zahl(KOMMUNE.hebesatzSpanne.min, KOMMUNE.hebesatzSpanne.max),
    paragraph6: jaNein(),
    gemeindeflaeche: jaNein(),
    anteilGemeinde: zahl(0, 1),
    pachtHa: zahl(0, 10000),
    sitzInGemeinde: jaNein(),
    preisCt: zahl(1, 20),
  };
}

/** Land und Bundesland müssen zusammenpassen; Schweiz noch ohne Vorlage; Österreich ohne Geldwert-Felder */
export function landPruefenRatsvorlage(e, land) {
  if (land === "CH") throw new PlattformFehler(422, "Die Ratsvorlage für die Schweiz ist in Vorbereitung – wir besprechen Ihr Vorhaben gern persönlich.", "land_gesperrt");
  if (!e.gemeinde) throw new PlattformFehler(422, "Bitte geben Sie den Namen der Gemeinde an (2 bis 80 Zeichen).", "eingabe");
  if (e.bundesland && !bundeslandFuer(land, e.bundesland)) throw new PlattformFehler(422, "Bundesland und Land passen nicht zusammen.", "eingabe");
  if (land === "AT") {
    const fremd = Object.keys(e).find((k) => !FELDER_AT.has(k));
    if (fremd) throw new PlattformFehler(422, `Ungültige Eingabe „${fremd}“.`, "eingabe");
  }
}

/** Normalisierte Eingaben (Grundlage für Prüf-ID, Vorgang und Vorlage) */
export function normalisierenRatsvorlage(e, land) {
  const bundesland = e.bundesland || STANDARD_BUNDESLAND[land];
  if (land === "AT") return { gemeinde: e.gemeinde, bundesland, ...(e.mwp !== undefined ? { mwp: e.mwp } : {}) };
  return { ...e, bundesland };
}

/** Neu rechnen: DE mit Kommunal-Rechner und Landesregel, AT mit Widmungskit */
export function rechneRatsvorlage(e, land) {
  if (land === "AT") return { land, gemeinde: e.gemeinde, mwp: e.mwp ?? null, kit: widmungskitFuer(e.bundesland, "de"), eg: egStand(), sperre: null };
  const r = rechneKommunal2(e);
  return { land, gemeinde: e.gemeinde, ...r, sperre: null };
}

const kz = (label, wert, zusatz = "") => ({ label, wert, zusatz });
const pct = (x, s = 0) => `${fmt(x * 100, s)} %`;
const LANDESREGEL_ART = {
  pflicht: "Pflichtzahlung nach Landesrecht",
  mindestens: "Mindestbeteiligung nach Landesrecht",
  angebot: "Angebot an die Gemeinde nach Landesrecht",
  ersatz: "Ersatzzahlung, falls keine Vereinbarung",
  unter_schwelle: "Schwelle des Landesgesetzes nicht erreicht",
  offen: "Wert nach Landesrecht wird geprüft",
};

function zusammenfassungDE(r, e) {
  const k = r.kommune;
  const lr = r.landesregel;
  const lt = landesregelTexte(r.bundesland.slug, "de");
  const gemeinde = e.gemeinde;
  const mwp = fmt(k.eingabe.mwp);
  const lrBetrag = lr.hatGesetz && lr.betrag != null && lr.gilt ? fmtEur(lr.betrag) : null;
  const landesrechtZusatz = lr.hatGesetz ? ` und nach dem Landesgesetz (${lr.gesetz})` : "";

  const sachverhalt = [
    `Ein Vorhabenträger plant im Gebiet der Gemeinde ${gemeinde} (${r.bundesland.name}) eine Freiflächen-Photovoltaikanlage mit rund ${mwp} MWp. Nach den Annahmen der Modellrechnung entspricht das etwa ${fmt(k.flaecheHa, 1)} ha Fläche und rund ${fmt(k.ertragJahr1 / 1e6, 1)} GWh Stromerzeugung im ersten Betriebsjahr.`,
    `Eine Gemeinde kann aus einem Solarpark auf drei Wegen direkte Einnahmen erzielen: eine freiwillige Zahlung des Betreibers nach § 6 EEG von bis zu ${fmt(KOMMUNE.beteiligungCt, 1)} ct je eingespeister Kilowattstunde, die Gewerbesteuer – bei Solaranlagen wird der Messbetrag zu ${pct(KOMMUNE.gewerbesteuerStandort)} nach der installierten Leistung der Standortgemeinde zugeordnet (§ 29 GewStG) – und Pacht, wenn gemeindeeigene Flächen genutzt werden.`,
    "Die Vereinbarung nach § 6 EEG wird zwischen Gemeinde und Betreiber schriftlich oder elektronisch geschlossen. Sie darf vor der Genehmigung der Anlage geschlossen werden; wird für die Fläche ein Bebauungsplan aufgestellt, aber nicht vor dessen Beschluss (§ 6 Abs. 4 EEG).",
    `Landesrecht ${r.bundesland.name}: ${lt.kern}`,
    "Über die Bauleitplanung – Aufstellung eines Bebauungsplans und Änderung des Flächennutzungsplans – entscheidet der Gemeinderat gesondert. Die Planungskosten trägt üblicherweise der Vorhabenträger über einen städtebaulichen Vertrag.",
  ];

  const beschluss = [
    `Der Gemeinderat nimmt die Information über die geplante Freiflächen-Photovoltaikanlage mit rund ${mwp} MWp im Gebiet der Gemeinde ${gemeinde} zur Kenntnis.`,
    `Die Verwaltung wird beauftragt, mit dem Vorhabenträger Gespräche über eine Vereinbarung zur finanziellen Beteiligung der Gemeinde nach § 6 EEG${landesrechtZusatz} aufzunehmen und den Entwurf dem Gemeinderat zur Entscheidung vorzulegen.`,
    "Die Verwaltung wird beauftragt, einen städtebaulichen Vertrag zur Übernahme der Planungskosten durch den Vorhabenträger vorzubereiten.",
    ...(k.eingabe.gemeindeflaeche ? ["Die Verwaltung wird beauftragt, die Bedingungen einer Verpachtung der betroffenen gemeindeeigenen Flächen zu prüfen und dem Gemeinderat vorzulegen."] : []),
    "Über die Aufstellung eines Bebauungsplans und die Änderung des Flächennutzungsplans entscheidet der Gemeinderat gesondert.",
  ];

  const finanzen = [
    `Modellrechnung des Kommunal-Rechners mit einem Hebesatz von ${fmt(k.eingabe.hebesatz * 100)} % und einem Erlös des Parks von ${fmt(k.eingabe.preisCt, 1)} ct/kWh: im Durchschnitt rund ${fmtEur(k.proJahr)} pro Jahr in den ersten ${k.N} Jahren, zusammen ${fmtEur(k.gesamt.summe)}; über die gesamte Laufzeit von ${k.L} Jahren ${fmtEur(k.gesamtLaufzeit.summe)}.`,
    k.ersteGewSt
      ? `Gewerbesteuer fällt nach der Modellrechnung erstmals im Jahr ${k.ersteGewSt} an, weil Abschreibung über ${KOMMUNE.afaJahre} Jahre und Zinsen den Gewinn anfangs mindern; Anlaufverluste werden vorgetragen.`
      : `Gewerbesteuer fällt nach der Modellrechnung in ${k.L} Jahren nicht an.`,
    lr.hatGesetz
      ? lr.gilt === false
        ? `Landesrecht: Die Schwelle des ${lr.gesetz} wird mit ${mwp} MWp nicht erreicht.`
        : lrBetrag
          ? `Landesrecht (${lr.gesetz}): ${LANDESREGEL_ART[lr.art]} rund ${lrBetrag} im ersten Betriebsjahr (${lt.formel}${lr.einwohner ? `; dazu ein Angebot von rund ${fmtEur(lr.einwohner)} an die Einwohnerinnen und Einwohner` : ""}). Dieser Betrag ist in den Summen oben nicht enthalten, weil das Landesgesetz regelt, ob und wie er mit der Zahlung nach § 6 EEG verrechnet wird. Prüfung am Gesetzestext ausstehend.`
          : `Landesrecht (${lr.gesetz}): ${lt.formel}. Einen Betrag nennen wir erst nach Prüfung des geltenden Wortlauts.`
      : "Landesrecht: kein Landesgesetz zur Beteiligung bei Solarparks in der Länderübersicht – es gilt die freiwillige Zahlung nach § 6 EEG.",
    "Die Beträge sind eine vereinfachte Modellrechnung (nominal, vor Steuern der Gemeinde, ohne Umlagen im kommunalen Finanzausgleich) und keine Haushaltsansätze.",
  ];

  return {
    kennzahlen: [
      kz("Ø pro Jahr", fmtEur(k.proJahr), `in den ersten ${k.N} Jahren`),
      kz(`Summe ${k.N} Jahre`, fmtEur(k.gesamt.summe), "§ 6 EEG, Gewerbesteuer, Pacht"),
      kz(`Summe ${k.L} Jahre`, fmtEur(k.gesamtLaufzeit.summe), "gesamte Laufzeit"),
      kz("§ 6 EEG-Beteiligung", fmtEur(k.gesamt.p6), `in ${k.N} Jahren`),
      kz("Gewerbesteuer", fmtEur(k.gesamt.gewSt), k.ersteGewSt ? `erstmals im Jahr ${k.ersteGewSt}` : `in ${k.L} Jahren keine`),
      ...(lr.hatGesetz ? [kz(`Landesrecht ${lr.gesetz}`, lrBetrag || (lr.gilt === false ? "unter der Schwelle" : "wird geprüft"), lrBetrag ? `${LANDESREGEL_ART[lr.art]}, Jahr 1 – nicht in den Summen` : LANDESREGEL_ART[lr.art] || "")] : []),
    ],
    eingabenText: [
      ["Gemeinde", gemeinde],
      ["Bundesland", r.bundesland.name],
      ["Leistung", `${mwp} MWp (≈ ${fmt(k.flaecheHa, 1)} ha, ${fmt(k.ertragJahr1 / 1e6, 1)} GWh im ersten Jahr)`],
      ["Erlös des Parks", `${fmt(k.eingabe.preisCt, 1)} ct/kWh`],
      ["Gewerbesteuer-Hebesatz", `${fmt(k.eingabe.hebesatz * 100)} %`],
      ["§ 6 EEG-Beteiligung", k.eingabe.paragraph6 ? "ja" : "nein"],
      ["Flächen der Gemeinde", k.eingabe.gemeindeflaeche ? `${fmt(k.eingabe.anteilGemeinde * 100)} % zu ${fmt(k.eingabe.pachtHa)} €/ha` : "nein"],
      ["Betreiber mit Sitz in der Gemeinde", k.eingabe.sitzInGemeinde ? "ja (100 % der Gewerbesteuer)" : `nein (${pct(KOMMUNE.gewerbesteuerStandort)})`],
    ],
    rechenweg: [
      `§ 6 EEG: ${fmt(KOMMUNE.beteiligungCt, 1)} ct je geförderter kWh, nur in der EEG-Förderphase und ohne Zeiten negativer Preise (§ 6 Abs. 5 und § 51 EEG).`,
      `Gewerbesteuer: Gewinn des Parks (EBITDA − Abschreibung über ${KOMMUNE.afaJahre} Jahre − Zinsen) + Hinzurechnung von ${pct(KOMMUNE.hinzurechnungZinsen)} der Zinsen über ${fmtEur(KOMMUNE.hinzurechnungFreibetrag)}, Verlustvortrag verrechnet; × Messzahl ${pct(KOMMUNE.messzahl, 1)} × Hebesatz × Anteil der Standortgemeinde.`,
      ...(k.eingabe.gemeindeflaeche ? [`Pacht: ${fmt(k.flaecheHa, 1)} ha × ${fmt(k.eingabe.anteilGemeinde * 100)} % × ${fmt(k.eingabe.pachtHa)} €/ha, jährlich um ${pct(PACHT.indexierung, 1)} indexiert.`] : []),
      `Ertragsregion nach dem Bundesland (${r.bundesland.name}); Investition des Parks ≈ ${fmtEur(k.investition)} (Solarpark-Rechenlogik, Bauart ${BAUART[k.eingabe.bauart]?.label || k.eingabe.bauart}).`,
      ...(lr.hatGesetz && lrBetrag ? [`Landesrecht: ${lt.formel}, gerechnet mit ${fmt(r.erzeugungKwh / 1e6, 1)} GWh Einspeisung bzw. ${mwp} MWp im ersten Betriebsjahr.`] : []),
    ],
    tabelle: {
      titel: "Einnahmen der Gemeinde nach Jahren (Modellrechnung)",
      spalten: ["Jahr", "§ 6 EEG", "Gewerbesteuer", "Pacht", "Summe"],
      zeilen: k.jahre.filter((j) => j.jahr === 1 || j.jahr % 5 === 0).map((j) => [String(j.jahr), fmtEur(j.p6), fmtEur(j.gewSt), fmtEur(j.pacht), fmtEur(j.summe)]),
    },
    listen: [
      {
        titel: `Landesrecht ${r.bundesland.name}`,
        art: "quellen",
        eintraege: lr.hatGesetz
          ? [
              { titel: lr.gesetz, text: lt.kern },
              ...(lt.gilt ? [{ titel: "Gilt für", text: lt.gilt }] : []),
              ...(lt.ausnahmen ? [{ titel: "Ausnahmen", text: lt.ausnahmen }] : []),
              ...(lr.quelle?.url ? [{ titel: "Quelle", text: `${lr.quelle.titel} (${lr.quelle.url}), Stand ${lr.stand} – Prüfung am Gesetzestext ausstehend` }] : []),
            ]
          : [{ text: lt.kern }],
      },
    ],
    hinweise: ["Vereinfachte Modellrechnung für Deutschland, keine Steuer- oder Rechtsberatung.", MUSTER_HINWEIS],
    vorlage: {
      land: "DE",
      gremium: "Gemeinderat",
      gemeinde,
      bundesland: r.bundesland.name,
      betreff: `Geplante Freiflächen-Photovoltaikanlage (rund ${mwp} MWp) – Information und Grundsatzbeschluss zur finanziellen Beteiligung der Gemeinde`,
      beschluss,
      sachverhalt,
      finanzen,
      verfahren: [
        "Gespräche mit dem Vorhabenträger über Beteiligung, Planungskosten und Zeitplan",
        "Entscheidung über die Aufstellung eines Bebauungsplans und die Änderung des Flächennutzungsplans (gesonderter Beschluss)",
        "Frühzeitige Beteiligung von Öffentlichkeit und Behörden, Entwurf mit Umweltbericht, Veröffentlichung (§ 3 Abs. 2 BauGB), Abwägung und Satzungsbeschluss",
        "Abschluss der Vereinbarung nach § 6 EEG – bei Bebauungsplan nicht vor dessen Beschluss (§ 6 Abs. 4 EEG)",
      ],
      muster: MUSTER_HINWEIS,
    },
  };
}

function zusammenfassungAT(r, e) {
  const kit = r.kit;
  const gemeinde = e.gemeinde;
  const anlage = r.mwp ? `eine Photovoltaik-Freiflächenanlage mit rund ${fmt(r.mwp)} MWp` : "eine Photovoltaik-Freiflächenanlage";
  const eag = fakt("recht.eag.abschlagLandwirtschaft", "AT");
  const sachverhalt = [
    `Ein Projektwerber plant im Gebiet der Gemeinde ${gemeinde} (${kit.name}) ${anlage}.`,
    GEMEINSAM.de[0].text,
    `${kit.name}: ${kit.ablauf}`,
    r.eg ? `Gemeinden können sich an Erneuerbare-Energie-Gemeinschaften beteiligen. ${r.eg.text}` : GEMEINSAM.de[2].text,
    ...(eag?.wert ? [`Bei der Marktprämie sinkt der Zuschlagswert für Photovoltaik auf landwirtschaftlich genutzten Flächen oder im Grünland um ${pct(eag.wert)} (§ 33 EAG); vorbelastete Flächen und Agri-PV können ausgenommen sein.`] : []),
  ];
  const beschluss = [
    `Der Gemeinderat nimmt die Information über ${anlage} im Gebiet der Gemeinde ${gemeinde} zur Kenntnis.`,
    `Die Gemeindeverwaltung wird beauftragt, die Vorgaben des Landes ${kit.name} für die betroffene Fläche (Zonen, Kriterien, Größengrenzen) zu erheben und dem Gemeinderat das Ergebnis vorzulegen.`,
    "Die Gemeindeverwaltung wird beauftragt zu prüfen, ob und wie sich die Gemeinde an einer Erneuerbare-Energie-Gemeinschaft mit Strom aus der Anlage beteiligen kann.",
    "Über eine Änderung des Flächenwidmungsplans entscheidet der Gemeinderat gesondert im dafür vorgesehenen Verfahren.",
  ];
  const finanzen = [
    "Für Österreich nennt diese Vorlage keine Beträge: Pacht- und Rechenwerte für Österreich werden geprüft – Zahlen auf Anfrage.",
    "Eine Gewerbesteuer wie in Deutschland gibt es nicht; im Vordergrund stehen Pacht, Beteiligungsmodelle und Erneuerbare-Energie-Gemeinschaften.",
  ];
  return {
    kennzahlen: [
      kz("Bundesland", kit.name, "Widmung nach dem Raumordnungsrecht des Landes"),
      kz("Prüfpunkte", String(kit.pruefpunkte.length), "mit Quelle aus den Regionsdaten"),
      kz("Beteiligte Stellen", String(kit.stellen.length), "laut Regionsdaten"),
      kz("Geldwerte", "auf Anfrage", "Rechenwerte für Österreich werden geprüft"),
    ],
    eingabenText: [["Gemeinde", gemeinde], ["Bundesland", kit.name], ...(r.mwp ? [["Leistung", `${fmt(r.mwp)} MWp`]] : [])],
    rechenweg: ["Keine Rechnung: Die Vorlage stellt Ablauf, Stellen und Prüfpunkte der Widmung aus den recherchierten Regionsdaten zusammen (Quellen je Punkt)."],
    tabelle: null,
    listen: [
      { titel: `Ablauf und Stellen in ${kit.name}`, art: "schritte", eintraege: kit.stellen.map((s) => ({ titel: s.name, text: s.rolle })) },
      { titel: "Prüfpunkte vor der Widmung", art: "quellen", eintraege: kit.pruefpunkte.map((p) => ({ titel: p.titel, text: `${p.text} Quelle: ${p.quelle.titel} (${p.quelle.url})` })) },
    ],
    hinweise: ["Für Österreich ohne Geldwerte – Pacht- und Rechenwerte werden geprüft.", MUSTER_HINWEIS],
    vorlage: {
      land: "AT",
      gremium: "Gemeinderat",
      gemeinde,
      bundesland: kit.name,
      betreff: `Geplante Photovoltaik-Freiflächenanlage${r.mwp ? ` (rund ${fmt(r.mwp)} MWp)` : ""} – Information und Grundsatzbeschluss zur Prüfung einer Widmung`,
      beschluss,
      sachverhalt,
      finanzen,
      verfahren: kit.stellen.map((s) => `${s.name}: ${s.rolle}`),
      muster: MUSTER_HINWEIS,
    },
  };
}

/** Zusammenfassung für die Berichtsseite und die Ratsvorlage (nur Formatierung) */
export function zusammenfassungRatsvorlage(r, e, land) {
  return land === "AT" ? zusammenfassungAT(r, e) : zusammenfassungDE(r, e);
}

/** Annahmenbuch: DE Kommunal-Rechner + Landesregel (Register), AT ElWG/EAG-Fakten (Register, Land AT) */
export function annahmenRatsvorlage(eingaben = {}) {
  const land = eingaben.bundesland && bundeslandFuer("AT", eingaben.bundesland) ? "AT" : "DE";
  if (land === "DE") {
    const bl = bundeslandFuer("DE", eingaben.bundesland) || bundeslandFuer("DE", STANDARD_BUNDESLAND.DE);
    const ids = [...KOMMUNE_FAKTEN, ...landesregelFakten(bl.slug).filter((id) => !KOMMUNE_FAKTEN.includes(id))];
    return annahmenbuch(ids, { land: "DE", regionId: bl.markt || KOMMUNE_STANDARD.regionId });
  }
  const eintraege = WIDMUNG_FAKTEN.map((id) => {
    const x = fakt(id, "AT");
    if (!x) return { id, land: "AT", fehlt: true };
    return { id: x.id, land: x.land, wert: x.wert, einheit: x.einheit, quelle: { ...x.quelle }, abruf: x.abruf, gueltigBis: x.gueltigBis ?? null, status: anzeigeStatus(x), klasse: x.klasse, pruefer: x.pruefer };
  });
  return { land: "AT", rechenbasis: "AT", sperre: null, waehrung: waehrungFuer("AT"), eintraege };
}

export const LAND_NAME_RATSVORLAGE = LAND_NAME;
