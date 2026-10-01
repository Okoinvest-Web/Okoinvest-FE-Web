// src/lib/plattform/eg/verein.js
//
// WP5 – Vereinsorganisation der Gemeinschaft (Marktanalyse 5 Punkt 7 „Vereins- und Gremienmodul“): Besetzung der Organe
// und Funktionsperioden (Organ-DocType von WP1, Regeln hier), Pflicht zur Mitglieder- bzw. Generalversammlung,
// Tagesordnungsvorlagen, Beschlussregister, Mitgliedsbeiträge und Auflösungs-Checkliste (Fachkonzept 2.7).
// Versammlungen nutzen das bestehende Versammlungsmodul mitglied/versammlung.js (Einladungsfrist, Online-Abstimmung,
// Mehrheiten, Ergebnis, Prüfsumme) – hier nur die EG-spezifische Konfiguration.
// Reine Funktionen; Python-Spiegel plattform/eg_gruendung_kern.py (Testvektoren eg/testdaten/gruendung/verein.json).

import { ORGAN_FUNKTIONEN } from "./modell.js";
import { organWirksam } from "./rechte.js";
import { angenommen, MEHRHEITEN } from "../mitglied/versammlung.js";
import { datumGueltig, plusTage, tageBis } from "./gruendung.js";

export const BESCHLUSS_GREMIEN = { gv: "Mitglieder- bzw. Generalversammlung", vorstand: "Vorstand", umlauf: "Umlaufbeschluss (schriftlich bzw. elektronisch)" };
export const BESCHLUSS_KATEGORIEN = {
  tarif: "Tarife und Preisblatt", aufnahme: "Aufnahme bzw. Ausschluss", wahl: "Wahl der Organe", statuten: "Statutenänderung", entlastung: "Rechnungsabschluss und Entlastung",
  beitrag: "Mitgliedsbeiträge", organisator: "Organisator und Dienstleister", wechsel: "Wechsel des Dienstleisters", investition: "Anlagen und Investitionen", aufloesung: "Auflösung", sonstiges: "Sonstiges",
};
export const BEITRAG_STATUS = { offen: "Offen", bezahlt: "Bezahlt", erlassen: "Erlassen" };
export const BEITRAG_ARTEN = { jahresbeitrag: "Mitgliedsbeitrag", beitrittsgebuehr: "Beitrittsgebühr" };
export const BEITRAG_EINHEBUNG = { abrechnung: "mit der Energieabrechnung (WP4)", gesondert: "gesondert (Vereinskasse)" };

const txt = (v, max = 200) => (v === undefined || v === null || typeof v === "object" ? "" : String(v).replace(/\s+/g, " ").trim().slice(0, max));
const fehler = (text, feld = "") => Object.assign(new Error(text), { status: 422, feld });
const istDatum = datumGueltig;
const r2 = (x) => Math.round((Number(x) || 0) * 100 + 1e-9) / 100;

// ---------------------------------------------------------------- Organe

/**
 * Besetzung der Organe prüfen (Verein: ≥ 2 Personen im Leitungsorgan, 2 Rechnungsprüfer außerhalb des Leitungsorgans;
 * eGen: Vorstand ≥ 2; GmbH: Geschäftsführung ≥ 1) und ablaufende Funktionsperioden melden.
 * @param {{rechtsform:string, id:string}} g
 * @param {object[]} organe
 * @param {{heute:string, funktionsperiodeJahre?:number, vorlaufTage?:number}} o
 */
export function organCheck(g = {}, organe = [], { heute, funktionsperiodeJahre = 3, vorlaufTage = 90 } = {}) {
  const b = [];
  const B = (stufe, text, quelle) => b.push({ stufe, text, quelle });
  const wirksam = organe.filter((o) => (!g.id || o.gemeinschaftId === g.id) && organWirksam(o, heute));
  const person = (o) => o.kontoId || txt(o.name).toLowerCase();
  const leitung = new Set(wirksam.filter((o) => ORGAN_FUNKTIONEN[o.funktion]?.leitung).map(person));
  const pruefer = new Set(wirksam.filter((o) => o.funktion === "rechnungspruefer").map(person));
  const zeichnung = new Set(wirksam.filter((o) => o.zeichnungsberechtigt).map(person));
  const hat = (f) => wirksam.some((o) => o.funktion === f);
  if (g.rechtsform === "verein") {
    if (leitung.size < 2) B("fehler", `Das Leitungsorgan besteht aus ${leitung.size} Person(en) – erforderlich sind mindestens 2.`, "VerG § 5 Abs. 3");
    if (!hat("obmann")) B("warn", "Keine Obfrau bzw. kein Obmann eingetragen (Vertretung nach außen laut Musterstatuten).", "Musterstatuten");
    if (!hat("kassier")) B("warn", "Keine Kassierin bzw. kein Kassier – Geldgebarung und 1. Auge der Abrechnungsfreigabe fehlen.", "Musterstatuten; Fachkonzept 5");
    if (pruefer.size < 2) B("fehler", `${pruefer.size} Rechnungsprüfer – erforderlich sind 2.`, "VerG § 5 Abs. 5");
    if ([...pruefer].some((p) => leitung.has(p))) B("fehler", "Rechnungsprüfer dürfen dem Leitungsorgan nicht angehören.", "VerG § 5 Abs. 5");
  } else if (g.rechtsform === "egen") {
    const vorstand = wirksam.filter((o) => ["vorstand", "obmann", "obmann_stv", "geschaeftsfuehrer", "kassier", "schriftfuehrer"].includes(o.funktion)).map(person);
    if (new Set(vorstand).size < 2) B("fehler", "Der Vorstand einer Genossenschaft besteht aus mindestens 2 Personen.", "GenG § 15 (zu bestätigen)");
    if (!hat("aufsichtsrat")) B("info", "Kein Aufsichtsrat eingetragen – nur nötig, wenn gesetzlich vorgeschrieben oder in der Satzung vorgesehen.", "GenG § 24 (zu bestätigen)");
  } else if (g.rechtsform === "gmbh") {
    if (!hat("geschaeftsfuehrer")) B("fehler", "Keine Geschäftsführung eingetragen.", "GmbHG § 15");
  }
  if (zeichnung.size < 2 && g.rechtsform && g.rechtsform !== "keine") B("warn", `${zeichnung.size} zeichnungsberechtigte Person(en) – das Vier-Augen-Prinzip (Abrechnung, Zahlungsdateien) braucht zwei.`, "Fachkonzept 5");
  const faellig = [];
  for (const o of wirksam) {
    const ende = o.bis || (o.von ? plusTage(o.von, Math.round(Number(funktionsperiodeJahre) * 365.25)) : "");
    if (!ende) continue;
    const tage = tageBis(heute, ende);
    if (tage <= vorlaufTage) faellig.push({ organId: o.id, name: o.personName || o.name || "", funktion: o.funktion, funktionLabel: ORGAN_FUNKTIONEN[o.funktion]?.label || o.funktion, ende, tage, abgelaufen: tage < 0, ausBis: !!o.bis });
  }
  faellig.sort((x, y) => x.tage - y.tage);
  if (faellig.some((x) => x.abgelaufen)) B("warn", `Funktionsperiode abgelaufen: ${faellig.filter((x) => x.abgelaufen).map((x) => `${x.funktionLabel} ${x.name}`).join(", ")} – Neuwahl in der nächsten Versammlung.`, "Statuten (Funktionsperiode)");
  else if (faellig.length) B("info", `Funktionsperiode endet bald: ${faellig.map((x) => `${x.funktionLabel} ${x.name}`).join(", ")} – Wahl auf die Tagesordnung setzen.`, "Statuten (Funktionsperiode)");
  return { ok: !b.some((x) => x.stufe === "fehler"), befunde: b, besetzung: { leitung: leitung.size, pruefer: pruefer.size, zeichnungsberechtigt: zeichnung.size, wirksam: wirksam.length }, faellig };
}

// ---------------------------------------------------------------- Versammlungen

/** Konfiguration für mitglied/versammlung.js (statt Genossenschaft): Land AT, Online-Versammlung und Einladungsfrist laut Statuten */
export function gvKonfig(g = {}, statuten = {}) {
  return { land: "AT", onlineGv: statuten.onlineGv !== false, einladungsfristTage: Number(statuten.einladungsfristTage) || 14, name: g.name || "", rechtsform: g.rechtsform || "" };
}

/**
 * Pflicht zur ordentlichen Versammlung: Verein laut Statuten (spätestens alle 5 Jahre, VerG § 5 Abs. 2), eGen und GmbH jährlich.
 * @returns {{letzte:string, spaetestens:string, tage:number|null, ueberfaellig:boolean, text:string, quelle:string}}
 */
export function gvPflicht({ rechtsform = "verein", versammlungen = [], heute, turnusJahre = 1, gegruendetAm = "" } = {}) {
  const ord = versammlungen.filter((v) => v.status === "abgeschlossen" && v.art !== "ausserordentlich").map((v) => String(v.datum).slice(0, 10)).sort();
  const letzte = ord[ord.length - 1] || "";
  const jahre = rechtsform === "verein" ? Math.min(5, Math.max(1, Number(turnusJahre) || 1)) : 1;
  const basis = letzte || gegruendetAm || "";
  const spaetestens = basis ? plusTage(basis, Math.round(jahre * 365.25)) : "";
  const tage = spaetestens ? tageBis(heute, spaetestens) : null;
  const quelle = rechtsform === "verein" ? "VerG § 5 Abs. 2; Statuten" : rechtsform === "egen" ? "GenG; Satzung (jährlich, zu bestätigen)" : "GmbHG § 35 (zu bestätigen)";
  const text = !basis ? "Noch keine ordentliche Versammlung erfasst." : tage < 0 ? `Die ordentliche Versammlung ist überfällig (spätestens ${spaetestens.split("-").reverse().join(".")}).` : `Nächste ordentliche Versammlung spätestens ${spaetestens.split("-").reverse().join(".")} (in ${tage} Tagen).`;
  return { letzte, spaetestens, tage, ueberfaellig: tage !== null && tage < 0, text, quelle, turnusJahre: jahre };
}

/**
 * Tagesordnung für die Mitglieder- bzw. Generalversammlung einer Energiegemeinschaft (Format von versammlung.js).
 * @param {{art?:"ordentlich"|"ausserordentlich", rechtsform?:string, wahl?:boolean, tarif?:boolean, beitrag?:boolean, elwg?:boolean, organisator?:boolean, wechsel?:boolean, aufloesung?:boolean}} o
 */
export function gvTagesordnungVorlage(o = {}) {
  const t = [];
  const add = (titel, beschluss = false, mehrheit = "einfach", satzung = false, text = "") => t.push({ titel, beschluss, mehrheit: beschluss ? mehrheit : null, satzung, text });
  const verein = (o.rechtsform || "verein") === "verein";
  add("Begrüßung, Feststellung der ordnungsgemäßen Einladung und der Beschlussfähigkeit");
  if (o.art !== "ausserordentlich") {
    add(verein ? "Bericht des Vorstands über Tätigkeit, Energiebilanz und finanzielle Gebarung (§ 20 VerG)" : "Bericht des Vorstands über das Geschäftsjahr");
    add(verein ? "Bericht der Rechnungsprüfer" : "Bericht über die Revision (Revisionsverband)");
    add(verein ? "Genehmigung des Rechnungsabschlusses" : "Feststellung des Jahresabschlusses", true);
    add("Entlastung des Vorstands", true);
    if (o.wahl) add(verein ? "Wahl des Vorstands und der Rechnungsprüfer" : "Wahlen in Vorstand bzw. Aufsichtsrat", true);
    if (o.beitrag) add("Festsetzung der Beitrittsgebühr und der Mitgliedsbeiträge", true);
    if (o.tarif) add("Beschluss über Tarife und Preisblatt", true, "einfach", false, "Information der Mitglieder mindestens einen Monat vor Wirksamkeit (§ 21 ElWG, bei Lieferantenpflicht).");
  }
  if (o.elwg) add("Änderung der Statuten zur Anpassung an das ElWG (§§ 65–72 ElWG)", true, "zweidrittel", true);
  if (o.organisator) add("Bestellung eines Organisators nach § 68 Abs. 2 ElWG und Abschluss des Auftragsverarbeitungsvertrags", true);
  if (o.wechsel) add("Wechsel der Betriebsführung (Dienstleister) zum Stichtag", true);
  if (o.aufloesung) add("Freiwillige Auflösung und Bestellung einer Abwicklerin bzw. eines Abwicklers", true, "zweidrittel", true);
  add("Allfälliges");
  return t;
}

// ---------------------------------------------------------------- Beschlüsse

/** Beschluss bereinigen (Beschlussregister); `angenommen` nach Mehrheit (versammlung.js) */
export function beschlussBereinigen(d = {}, { heute } = {}) {
  const gremium = Object.hasOwn(BESCHLUSS_GREMIEN, d.gremium) ? d.gremium : "";
  if (!gremium) throw fehler("Bitte das Gremium wählen.", "gremium");
  const datum = istDatum(d.datum) ? d.datum : "";
  if (!datum) throw fehler("Bitte das Datum des Beschlusses angeben.", "datum");
  if (heute && datum > heute) throw fehler("Das Beschlussdatum liegt in der Zukunft.", "datum");
  const gegenstand = txt(d.gegenstand, 200);
  if (gegenstand.length < 3) throw fehler("Bitte den Gegenstand des Beschlusses angeben.", "gegenstand");
  const kategorie = Object.hasOwn(BESCHLUSS_KATEGORIEN, d.kategorie) ? d.kategorie : "sonstiges";
  const zahlOk = (v) => Math.max(0, Math.min(100000, Math.round(Number(v) || 0)));
  const ja = zahlOk(d.ja);
  const nein = zahlOk(d.nein);
  const enthaltung = zahlOk(d.enthaltung);
  let mehrheit = Object.hasOwn(MEHRHEITEN, d.mehrheit) ? d.mehrheit : "einfach";
  if (["statuten", "aufloesung"].includes(kategorie) && gremium !== "gv") throw fehler("Statutenänderung und Auflösung beschließt nur die Mitglieder- bzw. Generalversammlung.", "gremium");
  if (["statuten", "aufloesung"].includes(kategorie) && MEHRHEITEN[mehrheit].anteil < MEHRHEITEN.zweidrittel.anteil) mehrheit = "zweidrittel";
  if (kategorie === "wahl" && gremium === "umlauf") throw fehler("Wahlen sind im Umlaufverfahren nicht vorgesehen (Musterstatuten).", "gremium");
  if (!ja && !nein) throw fehler("Bitte das Stimmenverhältnis angeben (Ja/Nein).", "ja");
  return { gremium, datum, gegenstand, kategorie, text: String(d.text || "").replace(/\r\n?/g, "\n").trim().slice(0, 3000), ja, nein, enthaltung, mehrheit, angenommen: angenommen(ja, nein, mehrheit), versammlungId: txt(d.versammlungId, 40), top: txt(d.top, 10) };
}

/** Beschlüsse aus dem Ergebnis einer abgeschlossenen Versammlung (versammlung.js ergebnisRechnen) */
export function beschluesseAusVersammlung(gv, ergebnis) {
  const datum = String(gv.datum || "").slice(0, 10);
  return (ergebnis?.tops || []).map((t) => {
    const top = (gv.tagesordnung || []).find((x) => x.id === t.id) || {};
    const kat = top.satzung ? (/aufl/i.test(t.titel) ? "aufloesung" : "statuten") : /tarif|preis/i.test(t.titel) ? "tarif" : /wahl/i.test(t.titel) ? "wahl" : /entlast|rechnungsabschluss|jahresabschluss/i.test(t.titel) ? "entlastung" : /beitr/i.test(t.titel) ? "beitrag" : /organisator/i.test(t.titel) ? "organisator" : /wechsel/i.test(t.titel) ? "wechsel" : "sonstiges";
    return { gremium: "gv", datum, gegenstand: t.titel, kategorie: kat, text: "", ja: t.ja, nein: t.nein, enthaltung: t.enthaltung, mehrheit: t.mehrheit, angenommen: t.angenommen, versammlungId: gv.id, top: t.id };
  });
}

// ---------------------------------------------------------------- Mitgliedsbeiträge

/**
 * Beiträge für ein Jahr vorschreiben (nur neue Positionen). Mitglieder aktiv bzw. aufgenommen bzw. gekündigt mit Austritt
 * nach Jahresbeginn. `anteilig`: Beitritt im laufenden Jahr → Monate ab Beitrittsmonat.
 * @returns {{mitgliedId:string, jahr:number, art:string, betragEur:number, faelligAm:string, status:"offen"}[]}
 */
export function beitraegeVorschreiben({ mitglieder = [], jahr, betragJahr = 0, beitrittsgebuehr = 0, anteilig = false, vorhandene = [], faelligAm = "" } = {}) {
  const j = Number(jahr);
  if (!Number.isInteger(j) || j < 2000 || j > 2100) throw fehler("Bitte ein gültiges Jahr angeben.", "jahr");
  const b = Number(betragJahr) || 0;
  const g = Number(beitrittsgebuehr) || 0;
  if (b < 0 || b > 10000 || g < 0 || g > 10000) throw fehler("Beitrag bzw. Gebühr: 0 bis 10.000 €.", "betragJahr");
  const da = new Set(vorhandene.map((x) => `${x.mitgliedId}|${x.jahr}|${x.art}`));
  const faellig = istDatum(faelligAm) ? faelligAm : `${j}-03-31`;
  const out = [];
  for (const m of mitglieder) {
    if (!["aufgenommen", "aktiv", "gekuendigt"].includes(m.status)) continue;
    const ein = String(m.beitrittAm || "").slice(0, 10);
    if (ein && Number(ein.slice(0, 4)) > j) continue;
    if (m.austrittZum && String(m.austrittZum) < `${j}-01-01`) continue;
    if (b > 0 && !da.has(`${m.id}|${j}|jahresbeitrag`)) {
      let betrag = b;
      if (anteilig && ein && Number(ein.slice(0, 4)) === j) betrag = r2((b * (13 - Number(ein.slice(5, 7)))) / 12);
      out.push({ mitgliedId: m.id, jahr: j, art: "jahresbeitrag", betragEur: r2(betrag), faelligAm: faellig, status: "offen" });
    }
    if (g > 0 && ein && Number(ein.slice(0, 4)) === j && !da.has(`${m.id}|${j}|beitrittsgebuehr`) && !vorhandene.some((x) => x.mitgliedId === m.id && x.art === "beitrittsgebuehr")) out.push({ mitgliedId: m.id, jahr: j, art: "beitrittsgebuehr", betragEur: r2(g), faelligAm: faellig, status: "offen" });
  }
  return out;
}

/** Übersicht der Beiträge (Soll, bezahlt, offen) je Jahr */
export function beitragsUebersicht(beitraege = [], { jahr = null } = {}) {
  const l = beitraege.filter((x) => jahr === null || x.jahr === Number(jahr));
  const s = (f) => r2(l.filter(f).reduce((a, x) => a + (Number(x.betragEur) || 0), 0));
  return { anzahl: l.length, sollEur: s((x) => x.status !== "erlassen"), bezahltEur: s((x) => x.status === "bezahlt"), offenEur: s((x) => x.status === "offen"), erlassenEur: s((x) => x.status === "erlassen"), offen: l.filter((x) => x.status === "offen").length };
}

// ---------------------------------------------------------------- Auflösung (Fachkonzept 2.7)

/** Checkliste der Auflösung mit Quellen; `stand`: { punktId: {erledigt, am, notiz} } */
export function aufloesungCheckliste(g = {}, { teilnahmenAktiv = 0, offenePosten = 0, stand = {} } = {}) {
  const verein = g.rechtsform === "verein";
  const liste = [
    { id: "beschluss", text: verein ? "Auflösungsbeschluss der Mitgliederversammlung (Zwei-Drittel-Mehrheit) und Bestellung der Abwicklung" : "Auflösungsbeschluss der Generalversammlung bzw. der Gesellschafter", quelle: "Statuten; VerG § 28", pflicht: true },
    { id: "abmeldung", text: `Alle Zählpunkte abmelden (CM_REV_SP, nicht rückwirkend)${teilnahmenAktiv ? ` – derzeit ${teilnahmenAktiv} aktive Teilnahme(n)` : ""}`, quelle: "Fachkonzept 2.7; HA II", pflicht: true, auto: teilnahmenAktiv === 0 },
    { id: "betreibervertrag", text: "Vertrag mit dem Netzbetreiber kündigen", quelle: "Fachkonzept 2.7", pflicht: ["eeg", "beg", "gea"].includes(g.modell) },
    { id: "schlussabrechnung", text: `Schlussabrechnung mit allen Mitgliedern${offenePosten ? ` – ${offenePosten} offene Posten` : ""}`, quelle: "Fachkonzept 2.7 (WP4)", pflicht: true, auto: offenePosten === 0 ? undefined : false },
    { id: "vermoegen", text: "Vermögensverwendung laut Statuten (keine Verteilung an Mitglieder)", quelle: "VerG § 3 Abs. 2 Z 11; Statuten", pflicht: true },
    { id: "behoerde", text: verein ? "Anzeige der Auflösung an die Vereinsbehörde binnen 4 Wochen" : "Liquidation und Löschung im Firmenbuch", quelle: verein ? "VerG § 28 Abs. 2, §§ 29–30" : "GenG; GmbHG (zu bestätigen)", pflicht: g.rechtsform !== "keine" },
    { id: "finanzamt", text: "Abmeldung beim Finanzamt (Schlusserklärungen)", quelle: "Fachkonzept 2.7", pflicht: g.rechtsform !== "keine" },
    { id: "ebutilities", text: "Deregistrierung als Marktpartner auf ebUtilities", quelle: "Fachkonzept 2.7", pflicht: ["eeg", "beg", "gea"].includes(g.modell) },
    { id: "organisator", text: "Vollmacht des Organisators widerrufen bzw. beenden", quelle: "ElWG § 68 Abs. 2", pflicht: !!g.dienstleistung?.aktiv },
    { id: "aufbewahrung", text: "Bücher und Belege 7 Jahre aufbewahren (Export)", quelle: "BAO § 132", pflicht: true },
  ].map((p) => ({ ...p, erledigt: p.auto === true || !!stand[p.id]?.erledigt, am: stand[p.id]?.am || "", notiz: stand[p.id]?.notiz || "" }));
  const offen = liste.filter((p) => p.pflicht && !p.erledigt);
  return { punkte: liste, offen: offen.length, abschliessbar: offen.length === 0 };
}
