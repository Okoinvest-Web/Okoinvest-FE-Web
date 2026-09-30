// src/lib/plattform/gemeinde/cockpit.js
//
// Gemeindecockpit (Rolle kommune): Verfahrensstand je Projekt (DE Bauleitplanung nach BauGB, AT Flächenwidmung
// „Grünland-Photovoltaik“ nach Landes-Raumordnungsrecht, CH Nutzungsplanung nach RPG) mit Terminen, Gemeinderats- und
// Bürgertermine, Einnahmen der Gemeinde (DE § 6 EEG bis 0,2 ct/kWh, AT vertraglicher Gemeindebeitrag, Gewerbesteuer
// als Information), Stellungnahmen im Austausch mit ÖkoInvest, Bürgerinfo-Material/Pressetexte (Entwürfe).
// Reine Funktionen, client- und serverseitig nutzbar. Frappe: plattform/gemeinde_kern.py (1:1).
// Keine Rechtsberatung – Verfahrensschritte sind vereinfacht, verbindlich sind Gesetz, Landesrecht und Gemeindeordnung.

import { KOMMUNE } from "../../invest/markt.js";
import { auswahl, datum, datumZeit, fehler, mehrzeilig, rund2, text, zahl } from "../mitglied/basis.js";

export const SCHRITT_STATUS = { offen: { label: "offen", ton: "neutral" }, geplant: { label: "terminiert", ton: "info" }, erledigt: { label: "erledigt", ton: "ok" }, entfaellt: { label: "entfällt", ton: "neutral" } };

/** Verfahrensschritte je Land (vereinfacht; Reihenfolge = üblicher Ablauf) */
export const VERFAHREN = {
  DE: [
    { id: "aufstellung", label: "Aufstellungsbeschluss Bebauungsplan", norm: "§ 2 Abs. 1 BauGB", gremium: true },
    { id: "fnp", label: "Änderung Flächennutzungsplan (Parallelverfahren)", norm: "§ 8 Abs. 3 BauGB", gremium: true },
    { id: "fruehzeitig", label: "Frühzeitige Beteiligung Öffentlichkeit und Behörden", norm: "§§ 3 Abs. 1, 4 Abs. 1 BauGB" },
    { id: "entwurf", label: "Billigung des Entwurfs, Beschluss zur Veröffentlichung", norm: "§ 3 Abs. 2 BauGB", gremium: true },
    { id: "veroeffentlichung", label: "Veröffentlichung im Internet und Behördenbeteiligung (mind. ein Monat)", norm: "§§ 3 Abs. 2, 4 Abs. 2 BauGB" },
    { id: "abwaegung", label: "Abwägung der Stellungnahmen", norm: "§ 1 Abs. 7 BauGB", gremium: true },
    { id: "vertrag", label: "Städtebaulicher Vertrag / Durchführungsvertrag", norm: "§§ 11, 12 BauGB" },
    { id: "par6", label: "Vereinbarung Kommunalbeteiligung", norm: "§ 6 EEG 2023", gremium: true },
    { id: "satzung", label: "Satzungsbeschluss", norm: "§ 10 Abs. 1 BauGB", gremium: true },
    { id: "genehmigung_fnp", label: "Genehmigung FNP-Änderung (höhere Verwaltungsbehörde)", norm: "§ 6 BauGB" },
    { id: "bekanntmachung", label: "Bekanntmachung – Bebauungsplan in Kraft", norm: "§ 10 Abs. 3 BauGB" },
    { id: "baugenehmigung", label: "Baugenehmigung", norm: "Landesbauordnung" },
  ],
  AT: [
    { id: "grundsatz", label: "Grundsatzbeschluss Gemeinderat / Standortprüfung", norm: "Gemeindeordnung", gremium: true },
    { id: "vorbegutachtung", label: "Vorbegutachtung durch das Land (Raumordnung)", norm: "Landes-Raumordnungsgesetz" },
    { id: "auflage", label: "Kundmachung und Auflage des Entwurfs (Frist laut Landesrecht)", norm: "Landes-Raumordnungsgesetz" },
    { id: "stellungnahmen", label: "Stellungnahmen und Einwendungen", norm: "Landes-Raumordnungsgesetz" },
    { id: "umwidmung", label: "Gemeinderatsbeschluss Umwidmung (Grünland-Photovoltaik bzw. Sonderwidmung)", norm: "Landes-Raumordnungsgesetz", gremium: true },
    { id: "genehmigung", label: "Aufsichtsbehördliche Genehmigung (Landesregierung)", norm: "Landes-Raumordnungsgesetz" },
    { id: "kundmachung", label: "Kundmachung – Widmung rechtswirksam", norm: "Gemeindeordnung" },
    { id: "gemeindebeitrag", label: "Vereinbarung Gemeindebeitrag / Bürgerbeteiligung", norm: "Vertrag", gremium: true },
    { id: "bewilligung", label: "Elektrizitätsrechtliche Bewilligung bzw. Baubewilligung", norm: "Landes-Elektrizitätsgesetz / Bauordnung" },
    { id: "uvp", label: "UVP-Feststellung (falls Schwellenwert erreicht)", norm: "UVP-G 2000" },
  ],
  CH: [
    { id: "vorpruefung", label: "Kantonale Vorprüfung", norm: "Art. 26 RPG, kantonales Recht" },
    { id: "mitwirkung", label: "Information und Mitwirkung der Bevölkerung", norm: "Art. 4 RPG" },
    { id: "auflage", label: "Öffentliche Auflage (in der Regel 30 Tage)", norm: "kantonales Baurecht" },
    { id: "einsprachen", label: "Einsprachen und Einigungsverhandlungen", norm: "kantonales Baurecht" },
    { id: "beschluss", label: "Beschluss Gemeindeversammlung bzw. Gemeindeparlament", norm: "Gemeindeordnung", gremium: true },
    { id: "genehmigung", label: "Genehmigung durch den Kanton", norm: "Art. 26 RPG" },
    { id: "baubewilligung", label: "Baubewilligung bzw. Plangenehmigung", norm: "Art. 22 RPG / kantonales Recht" },
  ],
};

export const TERMIN_ARTEN = {
  gemeinderat: "Gemeinderat / Gemeindeversammlung",
  ausschuss: "Bau- bzw. Umweltausschuss",
  buerger: "Bürgerinformation / Infoabend",
  ortstermin: "Ortstermin",
  frist: "Frist (Stellungnahme, Auslegung)",
  sonstiges: "Sonstiger Termin",
};
export const TERMIN_STATUS = { geplant: "geplant", stattgefunden: "stattgefunden", abgesagt: "abgesagt" };

export const ZAHLUNG_ARTEN = {
  par6: { label: "§ 6 EEG – Kommunalbeteiligung", laender: ["DE"], text: "Freiwillige Zahlung des Betreibers bis 0,2 ct je eingespeister kWh (§ 6 Abs. 2 EEG 2023), vertraglich vereinbart, frühestens ab Inbetriebnahme." },
  gemeindebeitrag: { label: "Gemeindebeitrag (vertraglich)", laender: ["AT", "CH"], text: "Freiwillige, vertraglich vereinbarte Zahlung an die Gemeinde – in Österreich und der Schweiz gibt es keine gesetzliche Kommunalbeteiligung wie § 6 EEG." },
  pacht: { label: "Pacht für gemeindeeigene Fläche", laender: ["DE", "AT", "CH"], text: "Pachtzahlung, wenn das Projekt ganz oder teilweise auf Flächen der Gemeinde liegt." },
  gewerbesteuer: { label: "Gewerbesteuer (Prognose, nur Information)", laender: ["DE"], text: "Bei Solaranlagen erhält die Standortgemeinde 90 % des Gewerbesteuermessbetrags (§ 29 Abs. 1 Nr. 2 GewStG). Die Steuer setzt die Gemeinde selbst fest – hier nur eine Prognose." },
  sonstiges: { label: "Sonstige Zahlung", laender: ["DE", "AT", "CH"], text: "" },
};
export const ZAHLUNG_STATUS = { prognose: { label: "Prognose", ton: "neutral" }, vereinbart: { label: "vereinbart", ton: "info" }, abgerechnet: { label: "abgerechnet", ton: "warn" }, gezahlt: { label: "gezahlt", ton: "ok" } };

export const STELLUNGNAHME_STATUS = { offen: { label: "offen", ton: "warn" }, beantwortet: { label: "beantwortet", ton: "info" }, erledigt: { label: "erledigt", ton: "ok" } };

export const MATERIAL_VORLAGEN = {
  pressemitteilung: { label: "Pressemitteilung (Entwurf)", text: "Kurze Meldung für Lokalpresse und Website der Gemeinde." },
  amtsblatt: { label: "Text für Amtsblatt bzw. Gemeindezeitung", text: "Sachliche Information über Projekt, Verfahren und Beteiligung." },
  faq: { label: "Fragen und Antworten für Bürgerinnen und Bürger", text: "Häufige Fragen zu Landschaft, Landwirtschaft, Wert der Gemeinde und Beteiligung." },
  aushang: { label: "Aushang Infoabend", text: "Einladung zum Informationsabend mit Termin und Ort." },
  sitzungsvorlage: { label: "Sachverhalt für die Sitzungsvorlage", text: "Neutraler Sachverhalt für die Beschlussvorlage im Gemeinderat." },
};

// ---------------------------------------------------------------- Bereinigung

export function schrittBereinigen(d = {}, land) {
  const defs = VERFAHREN[land] || VERFAHREN.DE;
  const id = auswahl(d.schritt, Object.fromEntries(defs.map((s) => [s.id, 1])), "");
  if (!id) throw fehler("Unbekannter Verfahrensschritt.", "schritt");
  const status = auswahl(d.status, SCHRITT_STATUS, "offen");
  const x = { schritt: id, status, datum: datum(d.datum), notiz: text(d.notiz, 300) };
  if (status === "erledigt" && !x.datum) throw fehler("Bitte geben Sie das Datum an, an dem der Schritt erledigt wurde.", "datum");
  if (status === "geplant" && !x.datum) throw fehler("Bitte geben Sie den geplanten Termin an.", "datum");
  return x;
}

export function terminBereinigen(d = {}) {
  const t = {
    art: auswahl(d.art, TERMIN_ARTEN, ""),
    titel: text(d.titel, 160),
    beginn: datumZeit(d.beginn),
    ort: text(d.ort, 200),
    projektRef: text(d.projektRef, 20),
    status: auswahl(d.status, TERMIN_STATUS, "geplant"),
    notiz: mehrzeilig(d.notiz, 1000),
    oeffentlich: d.oeffentlich === true,
  };
  if (!t.art) throw fehler("Bitte wählen Sie die Art des Termins.", "art");
  if (!t.titel) throw fehler("Bitte geben Sie einen Titel an.", "titel");
  if (!t.beginn) throw fehler("Bitte geben Sie Datum und Uhrzeit an.", "beginn");
  return t;
}

/** Zahlung bereinigen; § 6 EEG: Satz höchstens 0,2 ct/kWh, Betrag = kWh × ct / 100 */
export function zahlungBereinigen(d = {}, land = "DE") {
  const art = auswahl(d.art, ZAHLUNG_ARTEN, "");
  if (!art) throw fehler("Bitte wählen Sie die Art der Zahlung.", "art");
  if (!ZAHLUNG_ARTEN[art].laender.includes(land)) throw fehler(`„${ZAHLUNG_ARTEN[art].label}“ gibt es in diesem Land nicht.`, "art");
  const z = { art, jahr: Math.round(zahl(d.jahr, 2000, 2100) || 0) || null, status: auswahl(d.status, ZAHLUNG_STATUS, "prognose"), projektRef: text(d.projektRef, 20), kwh: null, ctProKwh: null, betragEur: null, faellig: datum(d.faellig), gezahltAm: datum(d.gezahltAm), notiz: text(d.notiz, 300) };
  if (!z.jahr) throw fehler("Bitte geben Sie das Jahr an.", "jahr");
  if (art === "par6") {
    z.kwh = zahl(d.kwh, 0, 1e11, 0);
    z.ctProKwh = zahl(d.ctProKwh, 0.001, KOMMUNE.beteiligungCt, 3);
    if (z.ctProKwh === null) throw fehler(`Der Satz nach § 6 EEG beträgt höchstens ${String(KOMMUNE.beteiligungCt).replace(".", ",")} ct/kWh.`, "ctProKwh");
    if (z.kwh === null) throw fehler("Bitte geben Sie die (erwartete) eingespeiste Strommenge in kWh an.", "kwh");
    z.betragEur = rund2((z.kwh * z.ctProKwh) / 100);
  } else {
    z.betragEur = zahl(d.betragEur, 0, 1e9, 2);
    if (z.betragEur === null) throw fehler("Bitte geben Sie den Betrag an.", "betragEur");
  }
  if (z.status === "gezahlt" && !z.gezahltAm) throw fehler("Bitte geben Sie das Zahlungsdatum an.", "gezahltAm");
  return z;
}

export function stellungnahmeBereinigen(d = {}) {
  const s = { betreff: text(d.betreff, 160), text: mehrzeilig(d.text, 6000), projektRef: text(d.projektRef, 20), frist: datum(d.frist) };
  if (!s.betreff) throw fehler("Bitte geben Sie einen Betreff an.", "betreff");
  if (s.text.length < 10) throw fehler("Bitte formulieren Sie die Stellungnahme bzw. Anfrage (mindestens 10 Zeichen).", "text");
  return s;
}
export function antwortBereinigen(d = {}) {
  const a = { text: mehrzeilig(d.text, 6000), erledigt: d.erledigt === true };
  if (a.text.length < 2) throw fehler("Bitte geben Sie eine Antwort ein.", "text");
  return a;
}

// ---------------------------------------------------------------- Auswertung

/** Verfahren eines Projekts mit Stand je Schritt (gespeicherte Einträge über die Vorlage gelegt) */
export function verfahrenStand(land, eintraege = {}) {
  const defs = VERFAHREN[land] || VERFAHREN.DE;
  const schritte = defs.map((s) => ({ ...s, ...(eintraege[s.id] || {}), status: eintraege[s.id]?.status || "offen" }));
  const relevant = schritte.filter((s) => s.status !== "entfaellt");
  const erledigt = relevant.filter((s) => s.status === "erledigt").length;
  const naechster = relevant.find((s) => s.status !== "erledigt") || null;
  return { schritte, erledigt, gesamt: relevant.length, quotePct: relevant.length ? Math.round((erledigt / relevant.length) * 100) : 0, naechster };
}

/** Einnahmen zusammenfassen: je Jahr und Status (Prognose getrennt von vereinbarten/gezahlten Beträgen) */
export function einnahmenSumme(zahlungen = []) {
  const s = { prognose: 0, vereinbart: 0, abgerechnet: 0, gezahlt: 0, jahre: {} };
  for (const z of zahlungen) {
    if (z.art === "gewerbesteuer" && z.status !== "gezahlt") {
      s.prognose = rund2(s.prognose + (z.betragEur || 0));
    } else s[z.status] = rund2((s[z.status] || 0) + (z.betragEur || 0));
    const j = (s.jahre[z.jahr] = s.jahre[z.jahr] || { prognose: 0, fest: 0 });
    if (z.status === "prognose") j.prognose = rund2(j.prognose + (z.betragEur || 0));
    else j.fest = rund2(j.fest + (z.betragEur || 0));
  }
  return s;
}

/** Termine: kommende zuerst, vergangene danach (jetzt = „JJJJ-MM-TTTHH:MM“) */
export function termineSortiert(termine = [], jetzt = "") {
  const k = termine.filter((t) => t.status !== "abgesagt" && t.beginn >= jetzt).sort((a, b) => a.beginn.localeCompare(b.beginn));
  const v = termine.filter((t) => !(t.status !== "abgesagt" && t.beginn >= jetzt)).sort((a, b) => b.beginn.localeCompare(a.beginn));
  return { kommend: k, vergangen: v };
}

// ---------------------------------------------------------------- Bürgerinfo-Material und Pressetexte (Entwürfe)

const zahlDe = (x, s = 1) => Number(x || 0).toLocaleString("de-DE", { maximumFractionDigits: s });

/**
 * Entwurfstext aus vereinfachten Projektdaten der Gemeinde-Sicht. projekt: { art, ha, phase, par6 }, gemeinde: { name, land },
 * angebote: [{ titel }] (Beteiligung), termin: { titel, beginn, ort } (nächster Bürgertermin). Liefert { titel, absaetze[] }.
 * Bewusst zurückhaltend formuliert – vor Veröffentlichung mit ÖkoInvest und der Verwaltung abstimmen.
 */
export function materialEntwurf(art, { gemeinde = {}, projekt = null, angebote = [], termin = null } = {}) {
  const g = gemeinde.name || "unserer Gemeinde";
  const land = gemeinde.land || "DE";
  const p = projekt || {};
  const groesse = p.ha ? `rund ${zahlDe(p.ha)} Hektar` : "eine noch festzulegende Fläche";
  const artText = p.art || "Photovoltaik-Freiflächenanlage";
  const kwp = p.par6?.kwp ? `etwa ${zahlDe(p.par6.kwp / 1000, 1)} MWp` : "";
  const strom = p.par6?.kwh ? `rechnerisch rund ${zahlDe(p.par6.kwh / 1000, 0)} MWh im Jahr` : "";
  const verfahren = land === "DE" ? "Bauleitplanverfahren (Bebauungsplan, ggf. Änderung des Flächennutzungsplans)" : land === "AT" ? "Umwidmungsverfahren (Flächenwidmungsplan, in der Regel Widmung „Grünland-Photovoltaik“ bzw. Sonderwidmung nach Landesrecht)" : "Nutzungsplanverfahren (Art. 26 RPG) mit öffentlicher Auflage";
  const beteiligung = angebote.length ? angebote.map((a) => a.titel).join(", ") : "Beteiligungsmodelle für Bürgerinnen und Bürger werden derzeit geprüft";
  const par6 = land === "DE" ? `Nach § 6 EEG kann der Betreiber der Gemeinde bis zu ${String(KOMMUNE.beteiligungCt).replace(".", ",")} ct je eingespeister Kilowattstunde zahlen${p.par6?.euroProJahr ? ` – bei dieser Anlagengröße grob geschätzt ${zahlDe(p.par6.euroProJahr, 0)} € im Jahr` : ""}. Zusätzlich erhält die Standortgemeinde bei Solaranlagen 90 % des Gewerbesteuermessbetrags.` : "Eine Beteiligung der Gemeinde wird vertraglich vereinbart; eine gesetzliche Kommunalabgabe wie in Deutschland gibt es nicht.";
  const t = termin?.beginn ? `${termin.titel || "Informationsabend"} am ${termin.beginn.slice(0, 10).split("-").reverse().join(".")} um ${termin.beginn.slice(11, 16)} Uhr${termin.ort ? `, ${termin.ort}` : ""}` : "";
  const texte = {
    pressemitteilung: {
      titel: `${g}: Planung für ${artText} – Gemeinde informiert`,
      absaetze: [
        `Im Gemeindegebiet von ${g} wird eine ${artText} auf ${groesse} geplant${kwp ? ` (Leistung ${kwp})` : ""}. Das Projekt befindet sich in der Phase „${p.phase || "Planung"}“.`,
        `Über die Zulässigkeit entscheidet die Gemeinde im ${verfahren}. Bürgerinnen und Bürger können sich im Verfahren äußern.`,
        par6,
        `Beteiligung: ${beteiligung}.`,
        t ? `Die Gemeinde lädt zum ${t} ein.` : "Termine zur Bürgerinformation werden rechtzeitig bekannt gegeben.",
      ],
    },
    amtsblatt: {
      titel: `Information: Solarprojekt in ${g}`,
      absaetze: [
        `Die Gemeinde ${g} informiert über den Stand der Planung einer ${artText} (${groesse}).`,
        `Verfahren: ${verfahren}. Aktueller Stand: ${p.phase || "Planung"}. Die Unterlagen werden im Rahmen der gesetzlichen Beteiligung veröffentlicht.`,
        strom ? `Die Anlage würde ${strom} Solarstrom erzeugen.` : "",
        par6,
        `Beteiligungsmöglichkeiten: ${beteiligung}.`,
      ].filter(Boolean),
    },
    faq: {
      titel: `Fragen und Antworten zum Solarprojekt in ${g}`,
      absaetze: [
        `Wer entscheidet? – Die Gemeinde über die Bauleit- bzw. Flächenwidmungsplanung; ohne entsprechenden Beschluss kann nicht gebaut werden.`,
        `Was hat die Gemeinde davon? – ${par6}`,
        `Kann ich mich beteiligen? – ${beteiligung}. Eine Beteiligung ist eine unternehmerische Entscheidung; es gelten die jeweiligen Vertragsbedingungen.`,
        `Was passiert mit der Fläche? – Die Anlage wird in der Regel auf Zeit errichtet und nach Ende der Nutzung zurückgebaut; der Rückbau wird vertraglich gesichert.`,
        `Wo gibt es Informationen? – In den öffentlichen Unterlagen des Verfahrens und bei den Terminen der Gemeinde${t ? ` (nächster Termin: ${t})` : ""}.`,
      ],
    },
    aushang: {
      titel: `Einladung: Informationsabend Solarprojekt ${g}`,
      absaetze: [
        t ? `${t}.` : "Termin und Ort werden noch bekannt gegeben.",
        `Themen: geplante ${artText} (${groesse}), Ablauf des Verfahrens, Landschaftsbild und Naturschutz, Nutzen für die Gemeinde, Beteiligungsmöglichkeiten.`,
        "Alle Bürgerinnen und Bürger sind herzlich eingeladen. Fragen können vorab an die Gemeindeverwaltung gerichtet werden.",
      ],
    },
    sitzungsvorlage: {
      titel: `Sachverhalt: ${artText} in ${g}`,
      absaetze: [
        `Ein Projektentwickler beabsichtigt die Errichtung einer ${artText} auf ${groesse} im Gemeindegebiet${kwp ? ` mit ${kwp}` : ""}.`,
        `Für die Zulässigkeit ist ein ${verfahren} erforderlich. Der Gemeinderat entscheidet im Rahmen seiner Planungshoheit; ein Anspruch auf Planung besteht nicht.`,
        par6,
        `Beteiligung der Bürgerinnen und Bürger: ${beteiligung}.`,
        "Kosten des Verfahrens trägt nach üblicher Praxis der Vorhabenträger (städtebaulicher Vertrag bzw. Vereinbarung).",
      ],
    },
  };
  const x = texte[art];
  if (!x) throw fehler("Unbekannte Vorlage.", "art");
  return { art, label: MATERIAL_VORLAGEN[art].label, ...x, hinweis: "Entwurf – vor Veröffentlichung mit der Verwaltung und ÖkoInvest abstimmen. Zahlen sind grobe Schätzungen." };
}
