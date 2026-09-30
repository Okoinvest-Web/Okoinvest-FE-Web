// src/lib/plattform/backend/demo/gemeinde.js
//
// Gemeindecockpit (Rolle kommune) im Demo-Backend – Referenz für plattform/api/gemeinde.py (Vertrag: docs/API.md,
// Abschnitt „Gemeindecockpit“). Regeln: src/lib/plattform/gemeinde/cockpit.js (Frappe: plattform/gemeinde_kern.py).
//
// Je Gemeinde (Land + Gemeindeschlüssel bzw. Name) eine Akte: Verfahrensstand je Projekt, Termine (Gemeinderat,
// Bürgerinformation, Fristen), Einnahmen (§ 6 EEG, Gemeindebeitrag, Pacht, Gewerbesteuer-Prognose), Stellungnahmen mit
// Antworten. Projekte nur vereinfacht (projektFuerGemeinde) mit nicht aufzählbarer Referenz statt Kennung.
// Rechte: Gemeinde nur mit geprüftem eigenem Anliegen (KOMMUNE_GEPRUEFT); Backoffice Bereich „kommunen“ (lesen ≥ 1,
// schreiben = 2). Verfahren und Einnahmen pflegt nur das Backoffice; Termine und Stellungnahmen beide Seiten.

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import { darfLesen, darfSchreiben } from "../../rechte";
import * as C from "../../gemeinde/cockpit";
import { MitgliedFehler } from "../../mitglied/basis";
import { GENO_REGISTER } from "../../mitglied/genossenschaft";
import { KOMMUNE_GEPRUEFT, KOMMUNE_SICHTBAR, flaecheImGebiet, projektFuerGemeinde } from "../../kommune";
import { KOMMUNE } from "../../../invest/markt";
import { intern } from "../demo";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId, sha256 } from "./hilfen";

const SCHEMA = 1;
const BEREICH = "kommunen";
const jetztLokal = () => new Date().toLocaleString("sv-SE", { timeZone: "Europe/Vienna" }).slice(0, 16).replace(" ", "T");
const istAdmin = (n) => !!n?.rollen?.includes("admin");
const benachrichtigen = (...a) => intern.benachrichtigen(...a);
const protokoll = (...a) => intern.protokoll(...a);

function fach(fn) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof MitgliedFehler) throw new PlattformFehler(e.status || 422, e.message);
    throw e;
  }
}
const normName = (s) => String(s || "").toLowerCase().replace(/\((demo|fiktiv)\)/g, "").replace(/^(gemeinde|stadt|markt|marktgemeinde|stadtgemeinde)\s+/, "").replace(/[^a-z0-9äöüß]+/g, " ").trim();
/** Schlüssel der Gemeinde-Akte (Land + Gemeindeschlüssel, sonst Name) */
export const akteSchluessel = (g) => `${g.land}:${g.schluessel || normName(g.name)}`;
/** Nicht aufzählbare Projekt-Referenz für die Gemeinde (statt Flächen-Kennung) */
const projektRef = (flaecheId) => sha256(`gemeinde-projekt:${flaecheId}`).slice(0, 10);

const leer = () => ({ v: SCHEMA, akten: [] });
async function lesenBereit() {
  await import("./flaecheFach").then((m) => m.fachDemoBereit()).catch(() => null);
  await import("./mitglied").then((m) => m.mitgliedBereit()).catch(() => null); // Beteiligungsangebote (Genossenschaft, Energiegemeinschaft)
  const db = await lesen();
  if (db.gemeinde?.v === SCHEMA) return db;
  await aendern((d) => {
    if (d.gemeinde?.v === SCHEMA) return;
    d.gemeinde = leer();
    try {
      seed(d);
    } catch (e) {
      console.warn("[plattform-demo] Gemeinde-Demodaten nicht ergänzt:", e?.message);
    }
  });
  return lesen();
}

function gemeindeVon(vg) {
  return { name: vg.daten?.gemeinde || vg.kontakt?.firma || "", land: vg.kontakt?.land || vg.daten?.land || "DE", schluessel: vg.daten?.gemeindeSchluessel || "" };
}

/** Zugriff: { vg, g, rolle: "backoffice"|"gemeinde" } – Gemeinde nur mit geprüftem eigenem Anliegen */
function zugriff(db, n, vorgangId, { schreiben = false } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const vg = db.vorgaenge.find((x) => x.id === String(vorgangId || "") && x.typ === "kommune");
  if (istAdmin(n)) {
    if (!darfLesen(n, BEREICH)) throw verboten("Ihre Backoffice-Rolle erlaubt keinen Zugriff auf Kommunen.");
    if (schreiben && !darfSchreiben(n, BEREICH)) throw verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Kommunen & Gemeinden“ kein Schreiben.");
    if (!vg) throw nichtGefunden("Anliegen nicht gefunden.");
    return { vg, g: gemeindeVon(vg), rolle: "backoffice" };
  }
  if (!n.rollen?.includes("kommune")) throw verboten("Das Gemeindecockpit steht Kommunen zur Verfügung.");
  if (!vg || vg.nutzerId !== n.id) throw nichtGefunden("Anliegen nicht gefunden.");
  if (!KOMMUNE_GEPRUEFT.includes(vg.status)) throw verboten("Das Gemeindecockpit wird nach der Prüfung Ihres Anliegens freigeschaltet.");
  return { vg, g: gemeindeVon(vg), rolle: "gemeinde" };
}

function akteVon(db, g, erzeugen = false) {
  const k = akteSchluessel(g);
  let a = db.gemeinde.akten.find((x) => x.schluessel === k);
  if (!a && erzeugen) {
    a = { id: neueId("GA"), schluessel: k, gemeinde: g.name, land: g.land, verfahren: {}, termine: [], zahlungen: [], stellungnahmen: [], verlauf: [], erstelltAm: jetzt() };
    db.gemeinde.akten.push(a);
  }
  return a || { id: null, schluessel: k, gemeinde: g.name, land: g.land, verfahren: {}, termine: [], zahlungen: [], stellungnahmen: [], verlauf: [] };
}

function projekteFuer(db, g) {
  const fl = db.flaechen.filter((f) => KOMMUNE_SICHTBAR.includes(f.status) && flaecheImGebiet(f, g));
  return fl.map((f, i) => ({ ...projektFuerGemeinde(f, i), ref: projektRef(f.id) }));
}

/** Gewerbesteuer-Prognose (DE, Solar): 90 % des Messbetrags an die Standortgemeinde – grobe Schätzung aus der § 6-Schätzung */
function gewerbesteuerPrognose(projekt) {
  if (!projekt?.par6?.kwh) return null;
  const erloes = (projekt.par6.kwh * 5.5) / 100; // Annahme 5,5 ct/kWh Erlös (grob, Größenordnung Marktwert Solar)
  const gewinn = erloes * 0.25; // grob: 25 % Gewinnmarge vor Steuern nach AfA (Betreiber als Kapitalgesellschaft, ohne Freibetrag)
  const mess = Math.max(0, gewinn) * KOMMUNE.messzahl;
  return Math.round(mess * KOMMUNE.hebesatz * KOMMUNE.gewerbesteuerStandort);
}

function angeboteFuer(db, g) {
  const out = [];
  for (const geno of db.mitglied?.genos || []) {
    if (geno.land !== g.land) continue;
    out.push({ art: "genossenschaft", titel: geno.name, status: GENO_REGISTER[geno.registerStatus]?.label || geno.registerStatus, link: "/genossenschaft", text: geno.registerStatus === "eingetragen" ? "Beitritt und Zeichnung von Geschäftsanteilen über das Portal." : "Unverbindliche Vormerkung möglich." });
  }
  for (const eg of db.mitglied?.gemeinschaften || []) {
    if (eg.land !== g.land || eg.status === "geschlossen") continue;
    out.push({ art: "energiegemeinschaft", titel: eg.name, status: eg.status === "aktiv" ? "aktiv" : "in Gründung", link: "/energiegemeinschaften", text: `${eg.gebiet || eg.netzbetreiber} – Strom aus der Region teilen.` });
  }
  if (g.land === "DE") out.push({ art: "par6", titel: "Kommunalbeteiligung nach § 6 EEG", status: "gesetzlich möglich", link: "/kommunen", text: `Bis ${String(KOMMUNE.beteiligungCt).replace(".", ",")} ct/kWh an die Gemeinde – vertraglich, ab Inbetriebnahme.` });
  return out;
}

function cockpitAusgabe(db, n, vg, g, rolle) {
  const a = akteVon(db, g);
  const projekte = projekteFuer(db, g).map((p) => {
    const gw = g.land === "DE" && p.status === "betrieb" ? gewerbesteuerPrognose(p) : null;
    return { ...p, verfahren: C.verfahrenStand(g.land, a.verfahren?.[p.ref] || {}), gewerbesteuerPrognose: gw };
  });
  const termine = C.termineSortiert(a.termine, jetztLokal());
  return {
    rolle,
    darfSchreiben: rolle === "gemeinde" || darfSchreiben(n, BEREICH),
    backofficeSchreiben: rolle === "backoffice" && darfSchreiben(n, BEREICH),
    vorgangId: vg.id,
    gemeinde: g,
    akteId: a.id,
    projekte,
    termine,
    zahlungen: a.zahlungen.slice().sort((x, y) => (y.jahr || 0) - (x.jahr || 0)),
    einnahmen: C.einnahmenSumme(a.zahlungen),
    par6Prognose: g.land === "DE" ? projekte.reduce((s, p) => s + (p.par6?.euroProJahr || 0), 0) : null,
    stellungnahmen: a.stellungnahmen.slice().sort((x, y) => String(y.am).localeCompare(String(x.am))),
    angebote: angeboteFuer(db, g),
    vorlagen: Object.entries(C.MATERIAL_VORLAGEN).map(([id, v]) => ({ id, ...v })),
    verlauf: rolle === "backoffice" ? a.verlauf.slice(-30) : [],
  };
}

/** Cockpit einer Gemeinde. Gemeinde: ohne vorgangId das erste geprüfte eigene Anliegen. */
export async function gdCockpit(n, { vorgangId } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesenBereit();
  let id = vorgangId;
  if (!id && !istAdmin(n)) id = db.vorgaenge.find((x) => x.typ === "kommune" && x.nutzerId === n.id && KOMMUNE_GEPRUEFT.includes(x.status))?.id;
  if (!id) return null;
  const { vg, g, rolle } = zugriff(db, n, id);
  if (!g.name && !g.schluessel) return null;
  return cockpitAusgabe(db, n, vg, g, rolle);
}

function meldenGegenseite(db, n, rolle, vg, titel, textInhalt) {
  if (rolle === "backoffice") {
    const u = db.nutzer.find((x) => x.id === vg.nutzerId);
    if (u) benachrichtigen(db, u, { art: "status", titel, text: textInhalt, link: "/portal/kommune", objektArt: "vorgang", objektId: vg.id }, { mailBetreff: `${titel} – ÖkoInvest`, mailText: `${textInhalt} Details finden Sie im Gemeindecockpit.` });
  } else {
    const ziel = db.nutzer.filter((x) => x.aktiv && x.rollen.includes("admin") && darfSchreiben(x, BEREICH));
    const zust = ziel.find((x) => x.id === vg.zustaendigId);
    for (const u of (zust ? [zust] : ziel).slice(0, 5)) benachrichtigen(db, u, { art: "anfrage", titel, text: textInhalt, link: `/portal/kommune?vorgang=${vg.id}`, objektArt: "vorgang", objektId: vg.id });
  }
}
function vermerk(a, n, textInhalt) {
  a.verlauf.push({ am: jetzt(), vonId: n.id, text: String(textInhalt).slice(0, 300) });
  if (a.verlauf.length > 300) a.verlauf.splice(0, a.verlauf.length - 300);
}

/**
 * Aktionen: schritt {projektRef, schritt, status, datum, notiz} (Backoffice) · termin {id?, …} · terminLoeschen {id}
 * · zahlung {id?, …} (Backoffice) · zahlungLoeschen {id} (Backoffice) · stellungnahme {betreff, text, projektRef, frist}
 * · antwort {id, text, erledigt} · erledigt {id}
 */
export async function gdAktion(n, vorgangId, d = {}, { ip = "" } = {}) {
  await lesenBereit();
  return aendern((db) => {
    const { vg, g, rolle } = zugriff(db, n, vorgangId, { schreiben: true });
    const a = akteVon(db, g, true);
    const bo = rolle === "backoffice";
    const aktion = String(d.aktion || "");
    const refs = projekteFuer(db, g).map((p) => p.ref);
    const refPruefen = (r) => {
      if (r && !refs.includes(r)) throw ungueltig("Projekt nicht gefunden.");
    };
    if (aktion === "schritt") {
      if (!bo) throw verboten("Den Verfahrensstand pflegt ÖkoInvest nach Abstimmung mit der Verwaltung.");
      refPruefen(d.projektRef);
      if (!d.projektRef) throw ungueltig("Bitte wählen Sie das Projekt.");
      const s = fach(() => C.schrittBereinigen(d, g.land));
      a.verfahren[d.projektRef] = a.verfahren[d.projektRef] || {};
      a.verfahren[d.projektRef][s.schritt] = { status: s.status, datum: s.datum, notiz: s.notiz, am: jetzt(), vonId: n.id };
      const label = (C.VERFAHREN[g.land] || C.VERFAHREN.DE).find((x) => x.id === s.schritt)?.label;
      vermerk(a, n, `Verfahren: ${label} → ${C.SCHRITT_STATUS[s.status].label}`);
      meldenGegenseite(db, n, rolle, vg, "Verfahrensstand aktualisiert", `${label}: ${C.SCHRITT_STATUS[s.status].label}${s.datum ? ` (${s.datum.split("-").reverse().join(".")})` : ""}.`);
    } else if (aktion === "termin") {
      const t = fach(() => C.terminBereinigen(d));
      refPruefen(t.projektRef);
      if (d.id) {
        const alt = a.termine.find((x) => x.id === d.id);
        if (!alt) throw nichtGefunden("Termin nicht gefunden.");
        if (!bo && alt.von !== "gemeinde") throw verboten("Diesen Termin pflegt ÖkoInvest.");
        Object.assign(alt, t, { geaendertAm: jetzt() });
        vermerk(a, n, `Termin geändert: ${t.titel}`);
      } else {
        a.termine.push({ id: neueId("GT"), ...t, von: bo ? "oekoinvest" : "gemeinde", vonId: n.id, am: jetzt() });
        vermerk(a, n, `Termin angelegt: ${t.titel}`);
      }
      meldenGegenseite(db, n, rolle, vg, `Termin: ${t.titel}`, `${C.TERMIN_ARTEN[t.art]} am ${t.beginn.slice(0, 10).split("-").reverse().join(".")} um ${t.beginn.slice(11, 16)} Uhr${t.status === "abgesagt" ? " – abgesagt" : ""}.`);
    } else if (aktion === "terminLoeschen") {
      const alt = a.termine.find((x) => x.id === d.id);
      if (!alt) throw nichtGefunden("Termin nicht gefunden.");
      if (!bo && alt.von !== "gemeinde") throw verboten("Diesen Termin pflegt ÖkoInvest.");
      a.termine = a.termine.filter((x) => x.id !== alt.id);
      vermerk(a, n, `Termin entfernt: ${alt.titel}`);
    } else if (aktion === "zahlung") {
      if (!bo) throw verboten("Zahlungen pflegt ÖkoInvest.");
      const z = fach(() => C.zahlungBereinigen(d, g.land));
      refPruefen(z.projektRef);
      if (d.id) {
        const alt = a.zahlungen.find((x) => x.id === d.id);
        if (!alt) throw nichtGefunden("Zahlung nicht gefunden.");
        Object.assign(alt, z, { geaendertAm: jetzt() });
      } else a.zahlungen.push({ id: neueId("GZ"), ...z, am: jetzt(), vonId: n.id });
      vermerk(a, n, `Einnahme ${C.ZAHLUNG_ARTEN[z.art].label} ${z.jahr}: ${z.betragEur} € (${C.ZAHLUNG_STATUS[z.status].label})`);
      meldenGegenseite(db, n, rolle, vg, "Einnahmen aktualisiert", `${C.ZAHLUNG_ARTEN[z.art].label} ${z.jahr}: ${z.betragEur.toLocaleString("de-DE")} € (${C.ZAHLUNG_STATUS[z.status].label}).`);
    } else if (aktion === "zahlungLoeschen") {
      if (!bo) throw verboten("Zahlungen pflegt ÖkoInvest.");
      const alt = a.zahlungen.find((x) => x.id === d.id);
      if (!alt) throw nichtGefunden("Zahlung nicht gefunden.");
      if (alt.status === "gezahlt") throw konflikt("Gezahlte Beträge bleiben als Nachweis erhalten.");
      a.zahlungen = a.zahlungen.filter((x) => x.id !== alt.id);
      vermerk(a, n, `Einnahme entfernt (${C.ZAHLUNG_ARTEN[alt.art].label} ${alt.jahr})`);
    } else if (aktion === "stellungnahme") {
      const s = fach(() => C.stellungnahmeBereinigen(d));
      refPruefen(s.projektRef);
      a.stellungnahmen.push({ id: neueId("GS"), ...s, von: bo ? "oekoinvest" : "gemeinde", vonId: n.id, vonName: [n.vorname, n.nachname].filter(Boolean).join(" "), am: jetzt(), status: "offen", antworten: [] });
      vermerk(a, n, `Stellungnahme: ${s.betreff}`);
      meldenGegenseite(db, n, rolle, vg, bo ? "Bitte um Stellungnahme" : "Neue Stellungnahme der Gemeinde", `${s.betreff}${s.frist ? ` – Frist ${s.frist.split("-").reverse().join(".")}` : ""}.`);
    } else if (aktion === "antwort" || aktion === "erledigt") {
      const s = a.stellungnahmen.find((x) => x.id === d.id);
      if (!s) throw nichtGefunden("Stellungnahme nicht gefunden.");
      if (s.status === "erledigt") throw konflikt("Diese Stellungnahme ist bereits erledigt.");
      if (aktion === "antwort") {
        const x = fach(() => C.antwortBereinigen(d));
        s.antworten.push({ id: neueId("GR"), text: x.text, von: bo ? "oekoinvest" : "gemeinde", vonName: [n.vorname, n.nachname].filter(Boolean).join(" "), am: jetzt() });
        s.status = x.erledigt ? "erledigt" : "beantwortet";
        meldenGegenseite(db, n, rolle, vg, "Antwort auf Stellungnahme", `${s.betreff}: ${x.text.slice(0, 140)}`);
      } else s.status = "erledigt";
      vermerk(a, n, `Stellungnahme „${s.betreff}“: ${C.STELLUNGNAHME_STATUS[s.status].label}`);
    } else throw ungueltig("Unbekannte Aktion.");
    protokoll(db, n, "aendern", "gemeinde_akte", a.id, `Gemeindecockpit ${g.name}: ${aktion}`, ip);
    return cockpitAusgabe(db, n, vg, g, rolle);
  });
}

/** Bürgerinfo-Material bzw. Pressetext als Entwurf (Text + PDF) */
export async function gdMaterial(n, vorgangId, { art = "", projektRef: ref = "" } = {}, { ip = "" } = {}) {
  const db = await lesenBereit();
  const { vg, g, rolle } = zugriff(db, n, vorgangId);
  const projekte = projekteFuer(db, g);
  const projekt = ref ? projekte.find((p) => p.ref === ref) : projekte[0];
  if (ref && !projekt) throw nichtGefunden("Projekt nicht gefunden.");
  const a = akteVon(db, g);
  const termin = C.termineSortiert(a.termine, jetztLokal()).kommend.find((t) => t.art === "buerger") || null;
  const m = fach(() => C.materialEntwurf(art, { gemeinde: g, projekt, angebote: angeboteFuer(db, g).filter((x) => x.art !== "par6"), termin }));
  await aendern((d) => protokoll(d, n, "abruf", "gemeinde_material", vg.id, `Material ${art} (${g.name})`, ip));
  return { ...m, gemeinde: g, rolle, erstelltAm: jetzt() };
}

// ================================================================ Demo-Daten (fiktiv)

function seed(db) {
  const tag = (t) => new Date(Date.now() + t * 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
  const iso = (t) => new Date(Date.now() + t * 864e5).toISOString();
  const admin = db.nutzer.find((u) => u.email === "admin@example.com");
  const vg = db.vorgaenge.find((x) => x.typ === "kommune" && x.demo && KOMMUNE_GEPRUEFT.includes(x.status) && x.daten?.gemeinde === "Demo-Stadt");
  if (!vg) return;
  const g = gemeindeVon(vg);
  const a = akteVon(db, g, true);
  const p = projekteFuer(db, g)[0];
  if (p) {
    a.verfahren[p.ref] = {
      aufstellung: { status: "erledigt", datum: tag(-180), notiz: "Beschluss Stadtrat (Demo)" },
      fnp: { status: "erledigt", datum: tag(-180), notiz: "Parallelverfahren (Demo)" },
      fruehzeitig: { status: "erledigt", datum: tag(-120), notiz: "Veröffentlichung 4 Wochen, 7 Stellungnahmen (Demo)" },
      entwurf: { status: "erledigt", datum: tag(-40), notiz: "" },
      veroeffentlichung: { status: "geplant", datum: tag(10), notiz: "Veröffentlichung im Internet für einen Monat (Demo)" },
      vertrag: { status: "geplant", datum: tag(30), notiz: "Städtebaulicher Vertrag im Entwurf (Demo)" },
      par6: { status: "geplant", datum: tag(45), notiz: "Vereinbarung 0,2 ct/kWh abgestimmt (Demo)" },
      satzung: { status: "offen", datum: "", notiz: "" },
    };
  }
  a.termine.push(
    { id: neueId("GT"), art: "gemeinderat", titel: "Stadtratssitzung: Beschluss städtebaulicher Vertrag", beginn: `${tag(30)}T18:00`, ort: "Rathaus, Sitzungssaal (Demo)", projektRef: p?.ref || "", status: "geplant", notiz: "", oeffentlich: true, von: "gemeinde", vonId: vg.nutzerId, am: iso(-5) },
    { id: neueId("GT"), art: "buerger", titel: "Informationsabend Solarpark Altdepot", beginn: `${tag(18)}T19:00`, ort: "Bürgerhaus Demo-Stadt (Demo)", projektRef: p?.ref || "", status: "geplant", notiz: "ÖkoInvest stellt Planung und Beteiligung vor.", oeffentlich: true, von: "oekoinvest", vonId: admin?.id || null, am: iso(-4) },
    { id: neueId("GT"), art: "frist", titel: "Ende der Veröffentlichung (Stellungnahmen)", beginn: `${tag(41)}T23:59`, ort: "", projektRef: p?.ref || "", status: "geplant", notiz: "§ 3 Abs. 2 BauGB (Demo)", oeffentlich: true, von: "oekoinvest", vonId: admin?.id || null, am: iso(-4) },
    { id: neueId("GT"), art: "ausschuss", titel: "Bauausschuss: Vorstellung Entwurf", beginn: `${tag(-41)}T17:00`, ort: "Rathaus (Demo)", projektRef: p?.ref || "", status: "stattgefunden", notiz: "Empfehlung an den Stadtrat (Demo)", oeffentlich: false, von: "gemeinde", vonId: vg.nutzerId, am: iso(-50) },
  );
  if (p?.par6) {
    const jahr = Number(tag(0).slice(0, 4));
    a.zahlungen.push({ id: neueId("GZ"), art: "par6", jahr: jahr + 2, status: "vereinbart", projektRef: p.ref, kwh: p.par6.kwh, ctProKwh: KOMMUNE.beteiligungCt, betragEur: Math.round(p.par6.kwh * KOMMUNE.beteiligungCt) / 100, faellig: `${jahr + 3}-03-31`, gezahltAm: "", notiz: "Erstes volles Betriebsjahr (Prognose aus Ertrag, Demo)", am: iso(-3), vonId: admin?.id || null });
    a.zahlungen.push({ id: neueId("GZ"), art: "gewerbesteuer", jahr: jahr + 3, status: "prognose", projektRef: p.ref, kwh: null, ctProKwh: null, betragEur: gewerbesteuerPrognose({ par6: p.par6 }) || 0, faellig: "", gezahltAm: "", notiz: "Grobe Prognose, abhängig von Finanzierung und Abschreibung (Demo)", am: iso(-3), vonId: admin?.id || null });
  }
  a.stellungnahmen.push({
    id: neueId("GS"), betreff: "Bitte um Stellungnahme: Eingrünung Nordseite", text: "Im Bauausschuss wurde eine Heckenpflanzung an der Nordseite (Wohnbebauung) angeregt. Bitte teilen Sie mit, ob die Stadt eine drei- oder fünfreihige Hecke bevorzugt. (Demo)", projektRef: p?.ref || "", frist: tag(14),
    von: "oekoinvest", vonId: admin?.id || null, vonName: admin ? `${admin.vorname} ${admin.nachname}` : "ÖkoInvest", am: iso(-2), status: "offen", antworten: [],
  });
  a.verlauf.push({ am: iso(-2), vonId: admin?.id || null, text: "Gemeinde-Akte angelegt (Demo)" });
}
