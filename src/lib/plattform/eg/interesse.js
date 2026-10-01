// src/lib/plattform/eg/interesse.js
//
// WP6 „Portale“ – Interessenten-Funnel und öffentlicher Ersparnis-Rechner (Fachkonzept 2.1, 2.2, 2.4, 4.6; Marktanalyse
// 1.4, 5 P0/P2). Reine Funktionen (Browser, Server, Node-Tests). Python-Spiegel: plattform/eg_portal_kern.py
// (gleiche Testvektoren in src/lib/plattform/eg/testdaten/portal/*.json).
//
//  - interesseBereinigen     schmale Daten nach 2.1 (Name, Kontakt, PLZ, Rolle; Zählpunkt/Verbrauch optional), Einwilligung Pflicht
//  - interesseCluster        Clusterbildung nach Netzbetreiber und PLZ (Zuordnung zur Trafostation erst über NB-Auskunft)
//  - eignungPruefen          Eignungscheck Zählpunkt/Mitgliedsart für eine konkrete Gemeinschaft (keine Rechtsauskunft)
//  - gemeinschaftenSuchen    passende Gemeinschaften nach PLZ bzw. Netzgebiet (öffentliche Zusammenfassungen, ohne Personendaten)
//  - rechnerOeffentlich      Jahres-Näherung „Was bringt mir eine Energiegemeinschaft?“ – Netzentgelt aus der Regeltabelle (WP1)
//
// Keine EDA- oder Abrechnungslogik: maßgeblich sind die Werte des Netzbetreibers und die Belege der Gemeinschaft (WP4).

import { fehler, text, auswahl, wahr, zahl, ganz, iban as ibanPruefen } from "../mitglied/basis.js";
import { MITGLIED_ARTEN, SMART_METER, ZP_RICHTUNGEN, GEMEINSCHAFT_STATUS, STEUERSTATUS_ERZEUGER, RECHNUNGSWEGE } from "./modell.js";
import { zaehlpunktPruefen, plzAusZaehlpunkt } from "./zaehlpunkt.js";
import { netzentgeltRegel, reduzierterAp } from "./netzentgelt.js";
import { GEMEINSCHAFTEN, REGIONEN, ALLGEMEIN } from "../../invest/markt.js";

const r0 = (x) => Math.round(Number(x) || 0);
const r1 = (x) => Math.round((Number(x) || 0) * 10) / 10;
const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
const r3 = (x) => Math.round((Number(x) || 0) * 1000) / 1000;

// ---------------------------------------------------------------- Interesse (Fachkonzept 2.1)

export const INTERESSE_ROLLEN = {
  verbraucher: { label: "Verbraucher/in", text: "Ich möchte Strom aus der Gemeinschaft beziehen." },
  erzeuger: { label: "Erzeuger/in", text: "Ich habe eine Anlage und möchte Überschuss einbringen." },
  prosumer: { label: "Beides (Prosumer)", text: "Ich erzeuge und verbrauche." },
};
export const INTERESSE_STATUS = {
  neu: { label: "Neu", ton: "info" },
  kontaktiert: { label: "Kontaktiert", ton: "warn" },
  zugeordnet: { label: "Gemeinschaft zugeordnet", ton: "info" },
  beigetreten: { label: "Beigetreten", ton: "ok" },
  verworfen: { label: "Verworfen", ton: "neutral" },
};
export const INTERESSE_HERKUNFT = { formular: "Formular", rechner: "Ersparnis-Rechner", portal: "Portal", gemeinde: "Kampagne der Gemeinde", oekovolt: "ÖKOVOLT-PV-Kunde" };
export const INTERESSE_EINWILLIGUNG = "Ich bin einverstanden, dass ÖkoInvest meine Angaben verarbeitet, um mich zu passenden Energiegemeinschaften zu informieren (DSGVO Art. 6 Abs. 1 lit. a, jederzeit widerrufbar).";

/** Interesse bereinigen (wirft 422). Zählpunkt und Jahresverbrauch sind optional, die Einwilligung ist Pflicht. */
export function interesseBereinigen(d = {}, { netzbetreiber = [] } = {}) {
  const i = {
    vorname: text(d.vorname, 80),
    nachname: text(d.nachname, 80),
    firma: text(d.firma, 140),
    email: text(d.email, 160).toLowerCase(),
    telefon: text(d.telefon, 40),
    plz: /^\d{4}$/.test(String(d.plz ?? "").trim()) ? String(d.plz).trim() : "",
    ort: text(d.ort, 80),
    rolle: auswahl(d.rolle, INTERESSE_ROLLEN, "verbraucher"),
    art: auswahl(d.art, MITGLIED_ARTEN, "privat"),
    zaehlpunktnummer: "",
    jahresverbrauchKwh: zahl(d.jahresverbrauchKwh, 0, 1e8, 0),
    kwp: zahl(d.kwp, 0, 100000, 1),
    gemeinschaftId: text(d.gemeinschaftId, 40),
    nachricht: text(d.nachricht, 1000),
    herkunft: auswahl(d.herkunft, INTERESSE_HERKUNFT, "formular"),
    einwilligung: wahr(d.einwilligung),
  };
  if (!i.nachname && !i.firma) throw fehler("Bitte geben Sie Ihren Namen bzw. die Organisation an.", "nachname");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email)) throw fehler("Bitte geben Sie eine gültige E-Mail-Adresse an.", "email");
  if (!i.plz) throw fehler("Bitte geben Sie Ihre Postleitzahl (vierstellig) an.", "plz");
  if (!i.einwilligung) throw fehler("Bitte bestätigen Sie die Einwilligung zur Datenverarbeitung.", "einwilligung");
  if (String(d.zaehlpunktnummer ?? "").trim()) {
    const p = zaehlpunktPruefen(d.zaehlpunktnummer, { netzbetreiber });
    if (!p.ok) throw fehler(p.fehler, "zaehlpunktnummer");
    i.zaehlpunktnummer = p.wert;
  }
  return i;
}

/** Cluster nach Netzbetreiber (aus Zählpunkt) und PLZ – Grundlage für die Gemeinschaftsbildung (Fachkonzept 2.1) */
export function interesseCluster(i, netzbetreiber = []) {
  const p = i?.zaehlpunktnummer ? zaehlpunktPruefen(i.zaehlpunktnummer, { netzbetreiber }) : null;
  const nb = p?.ok ? p.netzbetreiberId : "";
  const plz = i?.plz || (p?.ok ? plzAusZaehlpunkt(p.wert) : "");
  return { netzbetreiberId: nb, plz, schluessel: `${nb || "NB-offen"}:${plz || "----"}` };
}

// ---------------------------------------------------------------- Beitritt: Dokumente und Zustimmungen (Fachkonzept 2.4 Nr. 2)

export const BEITRITT_VERSION = "2026-10";
/**
 * Dokumente der Beitrittsstrecke (Inhalte nach den Mustern der Koordinationsstelle; die verbindlichen Fassungen stellt die
 * Gemeinschaft bzw. WP5 aus den Vorlagen bereit). `pflicht`: Zustimmung nötig; `nurMit`: nur bei dieser Bedingung.
 */
export const BEITRITT_DOKUMENTE = [
  { id: "statuten", titel: "Statuten der Gemeinschaft", text: "Sie erkennen die Statuten an: Zweck ist nicht in erster Linie finanzieller Gewinn, die Teilnahme ist freiwillig und offen, Austritt nach den Statuten jederzeit möglich.", pflicht: true },
  { id: "vertrag", titel: "Bezugs- bzw. Einspeisevereinbarung", text: "Regelt Preis je kWh laut Preisblatt, Abrechnung durch die Gemeinschaft, Gutschriften für eingebrachten Strom (Gutschriftverfahren nach § 11 Abs. 7 UStG) und die Kündigung. Ihren Reststrom liefert weiterhin Ihr bisheriger Lieferant.", pflicht: true },
  { id: "datenschutz", titel: "Datenschutzinformation (Art. 13 DSGVO)", text: "Für die Abrechnung verarbeiten wir Ihre Viertelstundenwerte, die der Netzbetreiber über den Datenaustausch (EDA) liefert (Art. 6 Abs. 1 lit. b DSGVO). Der Vorstand sieht standardmäßig nur Summen; jede Einzeleinsicht wird protokolliert.", pflicht: true },
  { id: "sepa", titel: "SEPA-Lastschriftmandat", text: "Sie ermächtigen die Gemeinschaft, Zahlungen von Ihrem Konto mittels Lastschrift einzuziehen. Erstattung binnen acht Wochen ab Belastung möglich.", pflicht: true, nurMit: "iban" },
];

/**
 * Beitrittsantrag prüfen und vereinheitlichen (wirft 422). Mitglied, Zählpunkte und Teilnahmen legt danach WP1 an.
 * @returns {{mitglied:object, zaehlpunkte:object[], zustimmungen:string[], unterschrift:{name:string}}}
 */
export function beitrittBereinigen(d = {}, { gemeinschaft = null, netzbetreiber = [] } = {}) {
  const p = d.person || {};
  const art = auswahl(d.art, MITGLIED_ARTEN, "");
  if (!art) throw fehler("Bitte wählen Sie, als wer Sie beitreten.", "art");
  const person = { vorname: text(p.vorname, 80), nachname: text(p.nachname, 80), firma: text(p.firma, 140), strasse: text(p.strasse, 120), plz: /^\d{4}$/.test(String(p.plz ?? "").trim()) ? String(p.plz).trim() : "", ort: text(p.ort, 80), telefon: text(p.telefon, 40) };
  if (!person.nachname && !person.firma) throw fehler("Bitte geben Sie Ihren Namen bzw. die Organisation an.", "person.nachname");
  if (!person.strasse || !person.plz || !person.ort) throw fehler("Bitte geben Sie Ihre Anschrift vollständig an (Straße, PLZ, Ort).", "person.strasse");
  const ibanRoh = String(d.iban ?? "").replace(/\s/g, "");
  const iban = ibanRoh ? ibanPruefen(ibanRoh) : "";
  if (ibanRoh && !iban) throw fehler("Die IBAN ist ungültig (Prüfsumme).", "iban");
  const liste = Array.isArray(d.zaehlpunkte) ? d.zaehlpunkte.slice(0, 11) : [];
  if (!liste.length) throw fehler("Bitte geben Sie mindestens einen Zählpunkt an.", "zaehlpunkte");
  if (liste.length > 10) throw fehler("Höchstens zehn Zählpunkte je Antrag.", "zaehlpunkte");
  const zaehlpunkte = [];
  for (const [i, z] of liste.entries()) {
    const richtung = auswahl(z?.richtung, ZP_RICHTUNGEN, "");
    if (!richtung) throw fehler(`Zählpunkt ${i + 1}: Bitte Verbrauch oder Erzeugung wählen.`, `zaehlpunkte.${i}.richtung`);
    const e = eignungPruefen({ zaehlpunktnummer: z?.zaehlpunktnummer, richtung, art, smartMeter: z?.smartMeter }, { gemeinschaft, netzbetreiber });
    const nein = e.punkte.find((x) => x.ok === false);
    if (nein) throw fehler(`Zählpunkt ${i + 1}: ${nein.text}`, `zaehlpunkte.${i}.zaehlpunktnummer`);
    const tf = ganz(z?.teilnahmefaktor ?? 100, 1, 100);
    if (tf === null) throw fehler(`Zählpunkt ${i + 1}: Der Teilnahmefaktor ist eine ganze Zahl von 1 bis 100 %.`, `zaehlpunkte.${i}.teilnahmefaktor`);
    const wert = e.zaehlpunkt.wert;
    if (zaehlpunkte.some((x) => x.zaehlpunktnummer === wert)) throw fehler(`Zählpunkt ${i + 1} ist doppelt angegeben.`, `zaehlpunkte.${i}.zaehlpunktnummer`);
    zaehlpunkte.push({
      zaehlpunktnummer: wert, richtung, teilnahmefaktor: tf, bezeichnung: text(z?.bezeichnung, 80), smartMeter: auswahl(z?.smartMeter, SMART_METER, "unbekannt"),
      kwp: richtung === "erzeugung" ? zahl(z?.kwp, 0, 6000, 1) : null, fremdTf: ganz(z?.fremdTf ?? 0, 0, 99) ?? 0, fremdAnzahl: ganz(z?.fremdAnzahl ?? 0, 0, 4) ?? 0,
    });
  }
  const zu = d.zustimmungen || {};
  const zustimmungen = [];
  for (const dok of BEITRITT_DOKUMENTE) {
    if (dok.nurMit === "iban" && !iban) continue;
    if (dok.pflicht && zu[dok.id] !== true) throw fehler(`Bitte bestätigen Sie: ${dok.titel}.`, `zustimmungen.${dok.id}`);
    if (zu[dok.id] === true) zustimmungen.push(dok.id);
  }
  const name = text(d.unterschrift?.name, 140);
  const soll = (person.nachname || person.firma).toLowerCase();
  if (d.unterschrift?.bestaetigt !== true || name.length < 3 || !name.toLowerCase().includes(soll)) throw fehler(`Bitte unterschreiben Sie mit Ihrem vollständigen Namen (${person.firma && !person.nachname ? person.firma : [person.vorname, person.nachname].filter(Boolean).join(" ")}).`, "unterschrift.name");
  return {
    mitglied: { art, person, steuerstatusErzeuger: auswahl(d.steuerstatusErzeuger, STEUERSTATUS_ERZEUGER, "kleinunternehmer"), uid: text(d.uid, 20), iban, rechnungsweg: auswahl(d.rechnungsweg, RECHNUNGSWEGE, "portal"), unternehmensgroesse: { mitarbeiter: zahl(d.unternehmensgroesse?.mitarbeiter, 0, 1e7, 0), umsatzMioEur: zahl(d.unternehmensgroesse?.umsatzMioEur, 0, 1e6, 2), bilanzMioEur: zahl(d.unternehmensgroesse?.bilanzMioEur, 0, 1e6, 2), nachweis: "" } },
    zaehlpunkte, zustimmungen, unterschrift: { name },
  };
}

// ---------------------------------------------------------------- Gemeinschaftssuche (Marktanalyse P2 Nr. 18)

/** Zustände, in denen eine Gemeinschaft Beitrittsanträge annimmt */
export const BEITRITT_OFFEN = ["in_gruendung", "rechtsperson", "marktpartner", "vertrag_nb", "eda_bereit", "aktiv"];

/**
 * Öffentliche Zusammenfassung einer Gemeinschaft (ohne Personendaten).
 * @param {object} g Gemeinschaft · @param {{tarif?:object, mitglieder?:number, plzBereich?:string[], netzbetreiberNamen?:string[]}} z
 */
export function gemeinschaftOeffentlich(g, { tarif = null, mitglieder = 0, plzBereich = [], netzbetreiberNamen = [] } = {}) {
  return {
    id: g.id,
    name: g.name,
    kurzname: g.kurzname || "",
    modell: g.modell,
    zonelevel: Number(g.zonelevel) || null,
    status: g.status,
    statusLabel: GEMEINSCHAFT_STATUS[g.status]?.label || g.status,
    beitrittOffen: BEITRITT_OFFEN.includes(g.status),
    ort: g.sitzAdresse?.ort || "",
    plz: g.sitzAdresse?.plz || "",
    netzbetreiber: [...(g.netzbetreiber || [])],
    netzbetreiberNamen: [...netzbetreiberNamen],
    plzBereich: [...new Set([g.sitzAdresse?.plz, ...plzBereich].filter((x) => /^\d{4}$/.test(String(x || ""))))].sort(),
    mitglieder: Number(mitglieder) || 0,
    bezugspreisCt: tarif ? tarif.bezugspreisCt ?? null : null,
    einspeisepreisCt: tarif ? tarif.einspeisepreisCt ?? null : null,
    mitgliedsbeitragJahr: tarif ? tarif.mitgliedsbeitragJahr ?? null : null,
    einmalgebuehrBeitritt: tarif ? tarif.einmalgebuehrBeitritt ?? null : null,
    zeitfenster: tarif ? (tarif.zeitfenster || []).map((z) => ({ label: z.label, von: z.von, bis: z.bis, monate: [...(z.monate || [])], bezugspreisCt: z.bezugspreisCt ?? null })) : [],
    beschreibung: text(g.beschreibung, 400),
  };
}

/**
 * Passende Gemeinschaften zu PLZ bzw. Zählpunkt. Rangfolge: gleiche PLZ im Einzugsgebiet (EEG lokal/GEA brauchen den
 * Nahebereich – Prüfung erst durch den Netzbetreiber), gleicher Netzbetreiber (EEG regional), österreichweit (BEG Z 6/7).
 * @returns {{id:string, name:string, passung:"nahe"|"netzgebiet"|"oesterreichweit", grund:string, punkte:number}[]}
 */
export function gemeinschaftenSuchen(liste = [], { plz = "", zaehlpunktnummer = "", netzbetreiber = [] } = {}) {
  const p = zaehlpunktnummer ? zaehlpunktPruefen(zaehlpunktnummer, { netzbetreiber }) : null;
  const nb = p?.ok ? p.netzbetreiberId : "";
  const ort = String(plz || (p?.ok ? plzAusZaehlpunkt(p.wert) : "") || "");
  const aus = [];
  for (const g of liste) {
    if (!g.beitrittOffen) continue;
    const plzTreffer = ort && (g.plzBereich || []).includes(ort);
    const region = ort && (g.plzBereich || []).some((x) => x.slice(0, 2) === ort.slice(0, 2));
    const nbTreffer = nb && (g.netzbetreiber || []).includes(nb);
    const weit = g.modell === "beg" && [6, 7].includes(Number(g.zonelevel));
    let passung = "";
    let punkte = 0;
    let grund = "";
    if (plzTreffer) { passung = "nahe"; punkte = 3; grund = `Mitglieder und Anlagen im Postleitzahlbereich ${ort}.`; }
    else if (nbTreffer || (region && !nb)) { passung = "netzgebiet"; punkte = 2; grund = nbTreffer ? "Gleiches Netzgebiet wie Ihr Zählpunkt." : `In Ihrer Region (PLZ ${ort.slice(0, 2)}…).`; }
    else if (weit) { passung = "oesterreichweit"; punkte = 1; grund = "Bürgerenergiegemeinschaft ohne Nahebereich – Teilnahme unabhängig vom Ort möglich (ohne Netzentgelt-Reduktion)."; }
    if (!passung) continue;
    if (["eeg", "gea"].includes(g.modell) && passung !== "nahe") grund += " Ob Ihr Anschluss im Nahebereich liegt, prüft der Netzbetreiber bei der Anmeldung.";
    aus.push({ id: g.id, name: g.name, modell: g.modell, passung, punkte, grund });
  }
  return aus.sort((a, b) => b.punkte - a.punkte || a.name.localeCompare(b.name, "de"));
}

// ---------------------------------------------------------------- Eignungscheck (Fachkonzept 1.2, 2.2, 2.4)

/**
 * Eignungscheck für den Beitritt zu einer Gemeinschaft. Ergebnis je Punkt ok true/false/null (null = Hinweis, kein Hindernis).
 * @param {{zaehlpunktnummer:string, richtung?:string, art?:string, smartMeter?:string}} d
 * @param {{gemeinschaft:object, netzbetreiber?:object[]}} k
 * @returns {{ergebnis:"geeignet"|"pruefen"|"nicht_geeignet", punkte:{id:string, ok:boolean|null, text:string}[], zaehlpunkt:{wert:string, netzbetreiberId:string, plz:string}|null}}
 */
export function eignungPruefen(d = {}, { gemeinschaft = null, netzbetreiber = [] } = {}) {
  const punkte = [];
  const g = gemeinschaft || {};
  const p = zaehlpunktPruefen(d.zaehlpunktnummer, { netzbetreiber });
  if (!p.ok) punkte.push({ id: "zaehlpunkt", ok: false, text: p.fehler });
  else {
    punkte.push({ id: "zaehlpunkt", ok: true, text: `Zählpunktnummer im gültigen Format (${p.wert.slice(0, 13)}…).` });
    const nbName = netzbetreiber.find((x) => x.id === p.netzbetreiberId)?.kurzname || "";
    if (!p.netzbetreiberId) punkte.push({ id: "netz", ok: null, text: `Netzbetreiber zur Nummer ${p.nbNummer} ist noch nicht hinterlegt – wir ordnen ihn bei der Prüfung zu.` });
    else if ((g.netzbetreiber || []).length && !(g.netzbetreiber || []).includes(p.netzbetreiberId)) punkte.push({ id: "netz", ok: g.modell === "beg" && [5, 6, 7].includes(Number(g.zonelevel)) ? null : false, text: `Ihr Zählpunkt liegt im Netz von ${nbName}; die Gemeinschaft ist in einem anderen Netzgebiet angemeldet.${g.modell === "beg" ? " Netzgebietsübergreifende Teilnahme ist ab Marktphase 2 vorgesehen (zu bestätigen)." : ""}` });
    else punkte.push({ id: "netz", ok: true, text: `Netzgebiet passt (${nbName}).` });
    if (["eeg", "gea"].includes(g.modell)) punkte.push({ id: "nahebereich", ok: null, text: g.modell === "gea" ? "Teilnahme nur an derselben Hauptleitung bzw. im selben Objekt." : `Ob Ihr Anschluss im ${Number(g.zonelevel) === 3 ? "Lokalbereich (gleiche Trafostation)" : "Regionalbereich (gleiches Umspannwerk)"} liegt, prüft der Netzbetreiber bei der Anmeldung.` });
  }
  if (d.richtung && !ZP_RICHTUNGEN[d.richtung]) punkte.push({ id: "richtung", ok: false, text: "Bitte Verbrauch oder Erzeugung wählen." });
  if (d.art && g.modell === "eeg" && MITGLIED_ARTEN[d.art] && !MITGLIED_ARTEN[d.art].eeg) punkte.push({ id: "art", ok: false, text: "Großunternehmen dürfen nicht Mitglied einer Erneuerbare-Energie-Gemeinschaft sein – möglich ist eine Bürgerenergiegemeinschaft (BEG)." });
  else if (d.art) punkte.push({ id: "art", ok: true, text: `Mitgliedsart „${MITGLIED_ARTEN[d.art]?.label || d.art}“ ist zulässig.` });
  const sm = auswahl(d.smartMeter, SMART_METER, "unbekannt");
  if (sm === "ja") punkte.push({ id: "smartmeter", ok: true, text: "Smart Meter mit Viertelstundenwerten vorhanden." });
  else punkte.push({ id: "smartmeter", ok: null, text: sm === "nein" ? "Ohne Smart Meter baut der Netzbetreiber nach der Anmeldung einen ein – das kann bis zu zwei Monate dauern." : "Smart Meter unbekannt – steht meist auf der Netzrechnung. Fehlt er, baut der Netzbetreiber nach der Anmeldung einen ein." });
  if (g.status && !BEITRITT_OFFEN.includes(g.status)) punkte.push({ id: "status", ok: false, text: `Die Gemeinschaft nimmt derzeit keine Anträge an (${GEMEINSCHAFT_STATUS[g.status]?.label || g.status}).` });
  const ergebnis = punkte.some((x) => x.ok === false) ? "nicht_geeignet" : punkte.some((x) => x.ok === null) ? "pruefen" : "geeignet";
  return { ergebnis, punkte, zaehlpunkt: p.ok ? { wert: p.wert, netzbetreiberId: p.netzbetreiberId, plz: p.plz } : null };
}

// ---------------------------------------------------------------- Öffentlicher Ersparnis-Rechner

/** Modelle im Rechner → Modell + Zonelevel der Regeltabelle (eg/netzentgelt.js) */
export const RECHNER_MODELLE = {
  eeg_lokal: { label: "EEG lokal", sub: "gleiche Trafostation", modell: "eeg", zonelevel: 3 },
  eeg_regional: { label: "EEG regional", sub: "gleiches Umspannwerk", modell: "eeg", zonelevel: 4 },
  beg: { label: "BEG", sub: "österreichweit", modell: "beg", zonelevel: 6 },
  gea: { label: "GEA", sub: "im selben Haus", modell: "gea", zonelevel: 1 },
};
/**
 * Verbrauchsprofile: `faktor` = wie gut der Verbrauch in Sonnenstunden liegt, `max` = Obergrenze des Gemeinschaftsanteils.
 * Eigene Näherung aus typischen Lastprofilen (H0, G1, L0) – keine Messwerte, ersetzt keine Simulation.
 */
export const RECHNER_PROFILE = {
  haushalt: { label: "Haushalt", sub: "tagsüber oft außer Haus", faktor: 0.75, max: 0.4 },
  haushalt_flex: { label: "Haushalt flexibel", sub: "Wärmepumpe, E-Auto, Homeoffice", faktor: 0.9, max: 0.55 },
  gewerbe: { label: "Betrieb", sub: "Verbrauch werktags tagsüber", faktor: 1, max: 0.65 },
  landwirtschaft: { label: "Landwirtschaft", sub: "Melken, Kühlung, Trocknung", faktor: 0.85, max: 0.5 },
};
/** Verhältnis Gemeinschaftserzeugung zu -verbrauch (Annahme der Nutzerin bzw. des Nutzers) */
export const RECHNER_DECKUNG = {
  knapp: { label: "Wenig Erzeugung", sub: "Erzeugung ≈ 30 % des Verbrauchs", verhaeltnis: 0.3 },
  ausgewogen: { label: "Ausgewogen", sub: "Erzeugung ≈ 70 % des Verbrauchs", verhaeltnis: 0.7 },
  reichlich: { label: "Viel Erzeugung", sub: "Erzeugung ≈ 150 % des Verbrauchs", verhaeltnis: 1.5 },
};
export const RECHNER_ROLLEN = { verbraucher: "Ich verbrauche", erzeuger: "Ich erzeuge", prosumer: "Beides" };
/** Stichtage für die Regeltabelle: 2026 (SNE-V 2018) bzw. 2027 (neue SNE-VO, Platzhalter) */
export const RECHNER_JAHRE = { 2026: "2026-11-15", 2027: "2027-06-15" };

const AT = GEMEINSCHAFTEN.rechner.at;
/** Standardannahmen (Quelle: src/lib/invest/markt.js GEMEINSCHAFTEN.rechner.at, REGIONEN at, ALLGEMEIN) */
export const RECHNER_STANDARD = {
  rolle: "verbraucher", profil: "haushalt", modell: "eeg_lokal", deckung: "ausgewogen", jahr: 2026,
  verbrauchKwh: 3500, kwp: 10, eigenverbrauchPct: 30,
  lieferantCt: AT.energiepreis, gemeinschaftCt: AT.gemeinschaftCt, netzApCt: AT.netzAp, abgabenCt: AT.abgabenCt,
  einspeiseEgCt: 8, marktCt: AT.ueberschussCt, gebuehrenJahr: AT.verwaltung,
  ertragKwhJeKwp: Math.round(((REGIONEN.find((x) => x.id === "at") || {}).ertrag || 1120) * 0.9), // Dachanlage ≈ 90 % des Freiflächenertrags (eigene Annahme)
  co2KgJeKwh: ALLGEMEIN.co2KgProKwh,
};

/** Anteil der Erzeugung, der in der Gemeinschaft genutzt wird, bei Verhältnis r = Erzeugung/Verbrauch (Näherung, sättigend) */
export const nutzungsgrad = (r) => 1 / (1 + (Number(r) || 0) / 1.7);

/**
 * Jahres-Näherung für ein Mitglied. Netzentgelt nach Regeltabelle (Stichtag, Modell, Zonelevel, Netzebene 7),
 * Abgaben nur bei Befreiung (EEG). Alle Preise netto in ct/kWh.
 */
export function rechnerOeffentlich(eingabe = {}) {
  const e = { ...RECHNER_STANDARD, ...eingabe };
  const z = (v, min, max, std) => { const n = zahl(v, min, max); return n === null ? std : n; };
  const rolle = auswahl(e.rolle, RECHNER_ROLLEN, "verbraucher");
  const profil = RECHNER_PROFILE[e.profil] ? e.profil : "haushalt";
  const modellId = RECHNER_MODELLE[e.modell] ? e.modell : "eeg_lokal";
  const deckung = RECHNER_DECKUNG[e.deckung] ? e.deckung : "ausgewogen";
  const jahr = RECHNER_JAHRE[e.jahr] ? String(e.jahr) : "2026";
  const m = RECHNER_MODELLE[modellId];
  const pr = RECHNER_PROFILE[profil];
  const verhaeltnis = RECHNER_DECKUNG[deckung].verhaeltnis;
  const verbrauch = rolle === "erzeuger" ? 0 : z(e.verbrauchKwh, 0, 1e7, 3500);
  const kwp = rolle === "verbraucher" ? 0 : z(e.kwp, 0, 6000, 10);
  const p = {
    lieferant: z(e.lieferantCt, 0, 100, AT.energiepreis), gemeinschaft: z(e.gemeinschaftCt, 0, 100, AT.gemeinschaftCt), netzAp: z(e.netzApCt, 0, 50, AT.netzAp),
    abgaben: z(e.abgabenCt, 0, 10, AT.abgabenCt), einspeise: z(e.einspeiseEgCt, 0, 100, 8), markt: z(e.marktCt, 0, 100, AT.ueberschussCt),
  };
  const gebuehren = z(e.gebuehrenJahr, 0, 10000, AT.verwaltung);
  const regel = netzentgeltRegel({ datum: RECHNER_JAHRE[jahr], modell: m.modell, zonelevel: m.zonelevel, netzebene: 7 });
  const n = nutzungsgrad(verhaeltnis);
  const quote = Math.min(pr.max, n * verhaeltnis * pr.faktor);
  const bezugKwh = verbrauch * quote;
  const netzCt = r2(p.netzAp - reduzierterAp(p.netzAp, regel.reduktionPct));
  const abgabenCt = regel.abgabenBefreit ? p.abgaben : 0;
  const erzeugung = kwp * z(e.ertragKwhJeKwp, 500, 1500, RECHNER_STANDARD.ertragKwhJeKwp);
  const ueberschuss = erzeugung * (1 - z(e.eigenverbrauchPct, 0, 100, 30) / 100);
  const eingebrachtKwh = ueberschuss * n * 0.85;
  const teile = [];
  if (verbrauch > 0) {
    teile.push({ id: "energie", label: "Günstigerer Energiepreis", eur: r2((bezugKwh * (p.lieferant - p.gemeinschaft)) / 100), ct: r2(p.lieferant - p.gemeinschaft) });
    teile.push({ id: "netz", label: regel.reduktionPct > 0 ? `Reduziertes Netzentgelt (−${regel.reduktionPct} % Arbeitspreis)` : "Netzentgelt (keine Reduktion)", eur: r2((bezugKwh * netzCt) / 100), ct: netzCt });
    if (abgabenCt > 0) teile.push({ id: "abgaben", label: "Elektrizitätsabgabe entfällt", eur: r2((bezugKwh * abgabenCt) / 100), ct: abgabenCt });
  }
  if (kwp > 0) teile.push({ id: "erzeuger", label: "Mehrerlös für eingebrachten Strom", eur: r2((eingebrachtKwh * (p.einspeise - p.markt)) / 100), ct: r2(p.einspeise - p.markt) });
  const vorteil = r2(teile.reduce((s, t) => s + t.eur, 0));
  const netto = r2(vorteil - gebuehren);
  const hinweise = [];
  if (jahr === "2026" && regel.reduktionPct > 0) hinweise.push({ id: "luecke", text: "Okt.–Dez. 2026: Ob die reduzierten Netzentgelte nach SNE-V 2018 im Übergang weiter gelten, wird unterschiedlich dargestellt – maßgeblich ist Ihre Netzrechnung (zu bestätigen)." });
  if (regel.status === "platzhalter") hinweise.push({ id: "platzhalter", text: "Ab 2027 richtet sich das Netzentgelt nach dem Nahebereich; die Werte der neuen Verordnung stehen noch aus – hier als Arbeitshypothese gerechnet." });
  if (m.modell === "beg") hinweise.push({ id: "beg", text: "Bürgerenergiegemeinschaften erhalten nach heutigem Stand keine Netzentgelt-Reduktion und keine Abgabenbefreiung – der Vorteil entsteht über den Preis." });
  if (netto < 0) hinweise.push({ id: "negativ", text: "Mit diesen Annahmen decken die Vorteile die Gebühren nicht. Ein flexiblerer Verbrauch oder ein günstigerer Gemeinschaftspreis verbessert das Ergebnis." });
  return {
    eingabe: { rolle, profil, modell: modellId, deckung, jahr: Number(jahr) },
    regel: { text: regel.text, reduktionPct: regel.reduktionPct, abgabenBefreit: regel.abgabenBefreit, status: regel.status, quelle: regel.quelle },
    quotePct: r1(quote * 100), bezugKwh: r0(bezugKwh), erzeugungKwh: r0(erzeugung), eingebrachtKwh: r0(eingebrachtKwh),
    teile, vorteilEur: vorteil, gebuehrenEur: r2(gebuehren), nettoEur: netto,
    vorteilJeKwhCt: bezugKwh > 0 ? r2(teile.filter((t) => t.id !== "erzeuger").reduce((s, t) => s + t.ct, 0)) : 0,
    co2Kg: r0((bezugKwh + eingebrachtKwh) * z(e.co2KgJeKwh, 0, 2, RECHNER_STANDARD.co2KgJeKwh)),
    nutzungsgradPct: r1(n * 100), hinweise,
    annahmen: { verhaeltnis, faktor: pr.faktor, maxQuote: pr.max, ertragKwhJeKwp: z(e.ertragKwhJeKwp, 500, 1500, RECHNER_STANDARD.ertragKwhJeKwp), nutzungsgrad: r3(n) },
  };
}
