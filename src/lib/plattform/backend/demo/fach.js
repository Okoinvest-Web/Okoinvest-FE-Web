// src/lib/plattform/backend/demo/fach.js
//
// Fachprüfung Kapitalseite im Demo-Backend – Referenz für plattform/api/fach.py (Vertrag: docs/API.md, Abschnitt 11).
//  - Unternehmen: Abnahmestellen (MaLo/MeLo bzw. Zählpunkt AT/CH, Messart, Vertrag), Lastgänge (Import, Analyse,
//    PV-Deckung, Pool-Ersparnis) und Angebotsanfrage (legt einen Vorgang „reststrom“ an)
//  - Mitglied: Interesse Genossenschaft (Vormerkung) und Teilnahme Energiegemeinschaft (Stammdaten je Land)
//  - Investor/Anbieter/Backoffice: Bewertungsszenarien je Projekt (nur mit freigegebenem Datenraum bzw. als Anbieter/Admin)
//
// Daten unter db.fach (eigene Sammlung, beim ersten Zugriff angelegt). Lastgang-Zeitreihen liegen als Datei unter
// .data/uploads (nicht in der JSON-Datenbank), in der Datenbank nur Metadaten + Analyse.
// Rechte: jede Operation prüft Rolle UND Eigentum (Konto); Backoffice liest alles, schreibt nur Szenarien.

import { PlattformFehler, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { BUNDESLAENDER } from "../../konstanten";
import { abnahmestelleBereinigen, abnahmestelleHinweise, egTeilnahmeBereinigen, egHinweise } from "../../fach/energie";
import { lastgangParsen, lastgangAnalyse, analyseKurz } from "../../fach/lastgang";
import { genoInteresseBereinigen } from "../../fach/mitglied";
import { bewertungBereinigen, bewertungRechnen, bewertungVorbelegung } from "../../fach/bewertung";
import { regionFuerProjekt } from "../../fach/datenblatt";
import { anfrageAnlegen, boerseDetail, intern } from "../demo";
import { aendern, lesen, uploadLesen, uploadLoeschen, uploadSchreiben } from "./speicher";
import { jetzt, neueId, sha256 } from "./hilfen";

// Zugriff auf interne Helfer erst zur Laufzeit (zyklischer Import mit demo.js, das fachBereit() nutzt)
const protokoll = (...a) => intern.protokoll(...a);
const nutzerById = (...a) => intern.nutzerById(...a);

const MAX_ABNAHMESTELLEN = 50;
const MAX_LASTGAENGE = 12;
const MAX_SZENARIEN = 20;
export const LASTGANG_MAX_BYTES = 4 * 1024 * 1024;

const istAdmin = (n) => !!n?.rollen?.includes("admin");
function angemeldet(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}
function rolle(n, rollen, text) {
  angemeldet(n);
  if (!istAdmin(n) && !rollen.some((r) => n.rollen?.includes(r))) throw verboten(text);
}
/** Fachfehler der reinen Module (status 422) in PlattformFehler übersetzen */
function fach(fn) {
  try {
    return fn();
  } catch (e) {
    if (e?.status === 422 && !(e instanceof PlattformFehler)) throw ungueltig(e.message);
    throw e;
  }
}

function leer() {
  return { v: 1, abnahmestellen: [], lastgaenge: [], szenarien: [], eg: [], geno: [] };
}

async function lesenBereit() {
  const db = await lesen();
  if (db.fach?.v && db.fach.demoV >= 2) return db;
  await aendern(async (d) => {
    if (!d.fach?.v) {
      d.fach = leer();
      try {
        await fachSeed(d);
      } catch (e) {
        console.warn("[plattform-demo] Fach-Demodaten nicht ergänzt:", e?.message);
      }
    }
    if (!(d.fach.demoV >= 2)) {
      // Demo-Stand 2: P75/P90 aus dem P50 der Demo-Projekte ergänzen (nur fehlende Werte)
      for (const p of d.projekte || []) {
        const p50 = Number(p.vertraulich?.ertragKwhKwp) || 0;
        if (!p.demo || !p.datenblatt || !p50 || p.typ === "speicher" || !["satzung", "rtb", "cod"].includes(p.phase)) continue;
        if (!p.datenblatt.ertragP75) p.datenblatt.ertragP75 = Math.round(p50 * 0.96);
        if (!p.datenblatt.ertragP90) p.datenblatt.ertragP90 = Math.round(p50 * 0.92);
      }
      d.fach.demoV = 2;
    }
  });
  return lesen();
}
/** Fach-Daten (inkl. Datenblätter der Demo-Projekte) einmalig ergänzen – von demo.js vor Börse/Projekt aufgerufen */
export async function fachBereit() {
  await lesenBereit();
}
async function aendernBereit(fn) {
  await lesenBereit();
  return aendern(fn);
}

// ================================================================ Unternehmen: Abnahmestellen

function stelleAusgabe(db, s) {
  const lg = db.fach.lastgaenge.filter((l) => l.abnahmestelleId === s.id).sort((a, b) => String(b.am).localeCompare(String(a.am)))[0];
  return { ...s, hinweise: abnahmestelleHinweise(s, { benutzungsstunden: lg?.analyse?.benutzungsstunden }) };
}
function lastgangAusgabe(l) {
  return { id: l.id, nutzerId: l.nutzerId, abnahmestelleId: l.abnahmestelleId, name: l.name, am: l.am, sha256: l.sha256, einheit: l.einheit, einheitQuelle: l.einheitQuelle, zeitbasis: l.zeitbasis, hinweise: l.hinweise, statistik: l.statistik, analyse: l.analyse, parameter: l.parameter, vorgangId: l.vorgangId || null };
}
const eigen = (n, o) => o && (o.nutzerId === n.id || istAdmin(n));

/** Übersicht Energie: Abnahmestellen, Lastgänge, Energiegemeinschaft, Genossenschaft des Kontos (Admin: `nutzerId`) */
export async function energieDaten(n, { nutzerId } = {}) {
  angemeldet(n);
  const id = istAdmin(n) && v.kennung(nutzerId) ? nutzerId : n.id;
  const db = await lesenBereit();
  const f = db.fach;
  return {
    abnahmestellen: f.abnahmestellen.filter((s) => s.nutzerId === id).map((s) => stelleAusgabe(db, s)),
    lastgaenge: f.lastgaenge.filter((l) => l.nutzerId === id).sort((a, b) => String(b.am).localeCompare(String(a.am))).map(lastgangAusgabe),
    eg: (() => {
      const t = f.eg.find((x) => x.nutzerId === id);
      return t ? { ...t, hinweise: egHinweise(t) } : null;
    })(),
    geno: f.geno.find((x) => x.nutzerId === id) || null,
  };
}

export async function abnahmestelleSpeichern(n, { id = null, daten = {} } = {}) {
  rolle(n, ["unternehmen"], "Abnahmestellen pflegen Unternehmen.");
  const s = fach(() => abnahmestelleBereinigen(daten));
  return aendernBereit((db) => {
    const f = db.fach;
    if (id) {
      const alt = f.abnahmestellen.find((x) => x.id === v.kennung(id));
      if (!alt) throw nichtGefunden("Abnahmestelle nicht gefunden.");
      if (!eigen(n, alt)) throw verboten();
      Object.assign(alt, s, { geaendertAm: jetzt() });
      protokoll(db, n, "aendern", "abnahmestelle", alt.id, `Abnahmestelle „${alt.bezeichnung}“ geändert`);
      return stelleAusgabe(db, alt);
    }
    const eigene = f.abnahmestellen.filter((x) => x.nutzerId === n.id);
    if (eigene.length >= MAX_ABNAHMESTELLEN) throw ungueltig(`Höchstens ${MAX_ABNAHMESTELLEN} Abnahmestellen je Konto.`);
    const kennung = s.maloId || s.zaehlpunkt;
    if (eigene.some((x) => (x.maloId || x.zaehlpunkt) === kennung)) throw ungueltig("Diese Mess- bzw. Marktlokation ist bereits erfasst.");
    const neu = { id: neueId("AS"), nutzerId: n.id, ...s, erstelltAm: jetzt(), geaendertAm: jetzt() };
    f.abnahmestellen.push(neu);
    protokoll(db, n, "anlegen", "abnahmestelle", neu.id, `Abnahmestelle „${neu.bezeichnung}“ angelegt`);
    return stelleAusgabe(db, neu);
  });
}

export async function abnahmestelleLoeschen(n, id) {
  rolle(n, ["unternehmen"], "Abnahmestellen pflegen Unternehmen.");
  return aendernBereit((db) => {
    const f = db.fach;
    const s = f.abnahmestellen.find((x) => x.id === v.kennung(id));
    if (!s) throw nichtGefunden("Abnahmestelle nicht gefunden.");
    if (!eigen(n, s)) throw verboten();
    f.abnahmestellen = f.abnahmestellen.filter((x) => x.id !== s.id);
    for (const l of f.lastgaenge) if (l.abnahmestelleId === s.id) l.abnahmestelleId = null;
    protokoll(db, n, "loeschen", "abnahmestelle", s.id, `Abnahmestelle „${s.bezeichnung}“ gelöscht`);
    return { ok: true };
  });
}

// ================================================================ Unternehmen: Lastgang

function parameterBereinigen(p = {}, stelle = null, nutzerLand = "DE") {
  return {
    pvKwp: v.zahl(p.pvKwp, { min: 0, max: 100000, stellen: 0 }),
    preisCt: v.zahl(p.preisCt, { min: 5, max: 80, stellen: 2 }) ?? stelle?.arbeitspreisCt ?? 20,
    produzierend: p.produzierend === undefined ? !!stelle?.stromsteuerEntlastung : v.wahr(p.produzierend),
    regionId: stelle ? regionFuerProjekt({ land: stelle.land, bundesland: "" }) : regionFuerProjekt({ land: nutzerLand }),
  };
}

/** Lastgang hochladen: CSV-Text wird geparst und analysiert; die Zeitreihe liegt als Datei (JSON, kW je Viertelstunde) */
export async function lastgangHochladen(n, { name, inhalt, einheit, abnahmestelleId, parameter } = {}) {
  rolle(n, ["unternehmen"], "Lastgänge laden Unternehmen hoch.");
  const text = typeof inhalt === "string" ? inhalt : "";
  v.pflicht(text.length > 0, "Die Datei ist leer.");
  v.pflicht(text.length <= LASTGANG_MAX_BYTES, "Die Datei ist zu groß (höchstens 4 MB).");
  const g = lastgangParsen(text, { einheit: v.auswahl(einheit, ["W", "kW", "MW", "Wh", "kWh", "MWh"], "") || null });
  if (!g.ok) throw ungueltig(g.fehler);
  let db = await lesenBereit();
  const stelle = abnahmestelleId ? db.fach.abnahmestellen.find((s) => s.id === v.kennung(abnahmestelleId)) : null;
  if (abnahmestelleId && (!stelle || stelle.nutzerId !== n.id)) throw verboten("Abnahmestelle gehört nicht zu Ihrem Konto.");
  if (db.fach.lastgaenge.filter((l) => l.nutzerId === n.id).length >= MAX_LASTGAENGE) throw ungueltig(`Höchstens ${MAX_LASTGAENGE} Lastgänge je Konto – bitte ältere löschen.`);
  const par = parameterBereinigen(parameter, stelle);
  const analyse = lastgangAnalyse(g, { ...par, bestandPvKwp: stelle?.eigenerzeugungKwp || 0 });
  const id = neueId("LG");
  const datei = `${id.toLowerCase()}-${sha256(id + Date.now()).slice(0, 16)}.lastgang.json`;
  await uploadSchreiben(datei, JSON.stringify({ startMs: g.startMs, n: g.n, kw: g.kw.map((x) => (Number.isNaN(x) ? null : Math.round(x * 100) / 100)) }));
  return aendern((d) => {
    const l = {
      id,
      nutzerId: n.id,
      abnahmestelleId: stelle?.id || null,
      name: v.text(name, 120) || "Lastgang.csv",
      am: jetzt(),
      sha256: sha256(text),
      datei,
      einheit: g.einheit,
      einheitQuelle: g.einheitQuelle,
      zeitbasis: g.zeitbasis,
      hinweise: g.hinweise,
      statistik: g.statistik,
      parameter: par,
      analyse,
    };
    d.fach.lastgaenge.push(l);
    protokoll(d, n, "upload", "lastgang", l.id, `Lastgang „${l.name}“ importiert (${analyse.zeitraum.tage} Tage)`);
    return lastgangAusgabe(l);
  });
}

async function reiheLaden(l) {
  const j = JSON.parse(String(await uploadLesen(l.datei)));
  return { ok: true, startMs: j.startMs, n: j.n, kw: j.kw.map((x) => (x === null ? NaN : x)) };
}

/** Analyse mit anderen Parametern (PV-Größe, Preis, Stromsteuer) neu rechnen */
export async function lastgangNeuRechnen(n, id, parameter = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const l = db.fach.lastgaenge.find((x) => x.id === v.kennung(id));
  if (!l) throw nichtGefunden("Lastgang nicht gefunden.");
  if (!eigen(n, l)) throw verboten();
  const stelle = l.abnahmestelleId ? db.fach.abnahmestellen.find((s) => s.id === l.abnahmestelleId) : null;
  const par = parameterBereinigen(parameter, stelle);
  const analyse = lastgangAnalyse(await reiheLaden(l), { ...par, bestandPvKwp: stelle?.eigenerzeugungKwp || 0 });
  if (istAdmin(n) && l.nutzerId !== n.id) return { ...lastgangAusgabe(l), analyse, parameter: par }; // Backoffice: nur rechnen
  return aendern((d) => {
    const x = d.fach?.lastgaenge?.find((y) => y.id === l.id);
    if (!x) throw nichtGefunden("Lastgang nicht gefunden.");
    x.parameter = par;
    x.analyse = analyse;
    return lastgangAusgabe(x);
  });
}

export async function lastgangLoeschen(n, id) {
  rolle(n, ["unternehmen"], "Lastgänge verwalten Unternehmen.");
  const l = await aendernBereit((db) => {
    const x = db.fach.lastgaenge.find((y) => y.id === v.kennung(id));
    if (!x) throw nichtGefunden("Lastgang nicht gefunden.");
    if (!eigen(n, x)) throw verboten();
    db.fach.lastgaenge = db.fach.lastgaenge.filter((y) => y.id !== x.id);
    protokoll(db, n, "loeschen", "lastgang", x.id, `Lastgang „${x.name}“ gelöscht`);
    return x;
  });
  await uploadLoeschen(l.datei).catch(() => {});
  return { ok: true };
}

/** Angebotsanfrage aus der Analyse: legt einen Vorgang „reststrom“ mit den Kennzahlen an (einmal je Lastgang) */
export async function lastgangAnfrage(n, id, { nachricht = "", ip = "" } = {}) {
  rolle(n, ["unternehmen"], "Angebotsanfragen stellen Unternehmen.");
  const db = await lesenBereit();
  const l = db.fach.lastgaenge.find((x) => x.id === v.kennung(id));
  if (!l) throw nichtGefunden("Lastgang nicht gefunden.");
  if (l.nutzerId !== n.id) throw verboten();
  if (l.vorgangId) return { vorgangId: l.vorgangId, bereits: true };
  const u = nutzerById(db, n.id);
  const stelle = l.abnahmestelleId ? db.fach.abnahmestellen.find((s) => s.id === l.abnahmestelleId) : null;
  const daten = {
    quelle: "Lastgang-Analyse im Portal",
    lastgangId: l.id,
    ...analyseKurz(l.analyse),
    pvKwpGeprueft: l.parameter?.pvKwp || l.analyse.pv.gewaehltKwp,
    arbeitspreisCt: l.parameter?.preisCt,
    ...(stelle ? { abnahmestelle: stelle.bezeichnung, land: stelle.land, messart: stelle.messart, spannungsebene: stelle.spannungsebene || stelle.netzebeneAt, lieferant: stelle.lieferant, vertragEnde: stelle.vertragEnde, kuendigungsfristMonate: stelle.kuendigungsfristMonate } : {}),
    nachricht: v.mehrzeilig(nachricht, 1500),
  };
  const vg = await anfrageAnlegen({
    typ: "reststrom",
    kontakt: { vorname: u.vorname, nachname: u.nachname, firma: u.firma, email: u.email, telefon: u.telefon, land: stelle?.land || "" },
    daten,
    herkunft: { quelle: "portal", kampagne: "lastgang" },
    ip,
    einwilligungText: "Angebotsanfrage aus dem Portal (angemeldetes Konto) – Kennzahlen der Lastgang-Analyse werden übermittelt.",
    nutzer: { ...n, emailBestaetigt: true, email: u.email },
  });
  const vorgangId = vg?.id || vg?.vorgang?.id || vg?.vorgang;
  await aendern((d) => {
    const x = d.fach.lastgaenge.find((y) => y.id === l.id);
    if (x) x.vorgangId = vorgangId || null;
    const vgDb = d.vorgaenge.find((y) => y.id === vorgangId);
    if (vgDb && !vgDb.nutzerId) vgDb.nutzerId = n.id; // Portal-Anfrage gehört dem angemeldeten Konto
  });
  return { vorgangId, bereits: false };
}

// ================================================================ Mitglied

export async function egTeilnahmeSpeichern(n, daten = {}) {
  rolle(n, ["mitglied"], "Energiegemeinschaften sind für Mitglieder.");
  const t = fach(() => egTeilnahmeBereinigen(daten));
  return aendernBereit((db) => {
    const f = db.fach;
    let x = f.eg.find((y) => y.nutzerId === n.id);
    if (!x) {
      x = { id: neueId("EG"), nutzerId: n.id, status: "vorgemerkt", erstelltAm: jetzt() };
      f.eg.push(x);
    }
    Object.assign(x, t, { geaendertAm: jetzt() });
    protokoll(db, n, "aendern", "energiegemeinschaft", x.id, "Teilnahmedaten Energiegemeinschaft gespeichert");
    return { ...x, hinweise: egHinweise(x) };
  });
}

export async function genoInteresseSpeichern(n, daten = {}, { ip = "" } = {}) {
  rolle(n, ["mitglied"], "Die Genossenschaft richtet sich an Mitglieder.");
  const g = fach(() => genoInteresseBereinigen(daten));
  return aendernBereit((db) => {
    const f = db.fach;
    let x = f.geno.find((y) => y.nutzerId === n.id);
    if (!x) {
      x = { id: neueId("GI"), nutzerId: n.id, status: "vorgemerkt", erstelltAm: jetzt() };
      f.geno.push(x);
    }
    Object.assign(x, g, { bestaetigtAm: jetzt(), bestaetigtIp: ip, geaendertAm: jetzt() });
    protokoll(db, n, "aendern", "genossenschaft", x.id, `Interesse Genossenschaft vorgemerkt (${g.anteile} Anteile)`, ip);
    return x;
  });
}

// ================================================================ Bewertung (Investor, Anbieter, Backoffice)

async function bewertungZugriff(n, projektId) {
  angemeldet(n);
  if (!istAdmin(n) && !n.rollen?.some((r) => ["investor", "anbieter"].includes(r))) throw verboten("Das Bewertungswerkzeug steht Investoren und Anbietern zur Verfügung.");
  const d = await boerseDetail(n, projektId);
  if (d.zugriff === "oeffentlich") throw verboten("Die Bewertung mit Projektdaten ist nach Freigabe des Datenraums (NDA) möglich.");
  return d;
}

/** Vorbelegung, gespeicherte Szenarien und Ergebnis für das Bewertungswerkzeug */
export async function bewertung(n, projektId) {
  const d = await bewertungZugriff(n, projektId);
  const db = await lesenBereit();
  const u = nutzerById(db, n.id);
  const ziel = typeof u?.suchprofil?.renditeZielPct === "number" ? u.suchprofil.renditeZielPct : undefined;
  const vb = bewertungVorbelegung(d.projekt, d.vertraulich || {}, d.datenblatt || {}, { zielRenditePct: ziel });
  const szenarien = db.fach.szenarien.filter((s) => s.projektId === d.projekt.id && s.nutzerId === n.id).sort((a, b) => String(b.am).localeCompare(String(a.am)));
  return { projekt: d.projekt, zugriff: d.zugriff, vorbelegung: vb, ergebnis: bewertungRechnen(vb.modus, vb.eingaben), szenarien };
}

export async function szenarioSpeichern(n, projektId, { name, eingaben } = {}) {
  const d = await bewertungZugriff(n, projektId);
  const titel = v.text(name, 80);
  v.pflicht(titel.length >= 2, "Bitte geben Sie dem Szenario einen Namen.");
  const vb = bewertungVorbelegung(d.projekt, d.vertraulich || {}, d.datenblatt || {});
  const e = { ...vb.eingaben, ...bewertungBereinigen(eingaben || {}) };
  const ergebnis = bewertungRechnen(vb.modus, e);
  return aendernBereit((db) => {
    const eigene = db.fach.szenarien.filter((s) => s.nutzerId === n.id && s.projektId === d.projekt.id);
    if (eigene.length >= MAX_SZENARIEN) throw ungueltig(`Höchstens ${MAX_SZENARIEN} Szenarien je Projekt.`);
    const s = { id: neueId("SZ"), nutzerId: n.id, projektId: d.projekt.id, name: titel, modus: vb.modus, eingaben: e, ergebnis, am: jetzt() };
    db.fach.szenarien.push(s);
    protokoll(db, n, "szenario", "projekt", d.projekt.id, `Bewertungsszenario „${titel}“ gespeichert`);
    return s;
  });
}

export async function szenarioLoeschen(n, id) {
  angemeldet(n);
  return aendernBereit((db) => {
    const s = db.fach.szenarien.find((x) => x.id === v.kennung(id));
    if (!s) throw nichtGefunden("Szenario nicht gefunden.");
    if (s.nutzerId !== n.id) throw verboten();
    db.fach.szenarien = db.fach.szenarien.filter((x) => x.id !== s.id);
    return { ok: true };
  });
}

// ================================================================ Demo-Daten

/** Beispiel-Datenblatt je Demo-Projekt (Phase/Typ-gerecht, fiktiv) */
export function demoDatenblatt(p) {
  const ph = ["flaeche", "netz", "aufstellung", "satzung", "rtb", "cod"].indexOf(p.phase);
  const pv = p.typ !== "speicher";
  const at = p.land === "AT";
  const ch = p.land === "CH";
  const d = {
    struktur: ph >= 3 ? "share" : "beides",
    umfang: "voll",
    zahlung: ph <= 2 ? "meilensteine" : "einmal",
    exklusivitaetWochen: 8,
    gesichertPct: ph >= 3 ? 100 : 85,
    eigentuemerAnzahl: p.typ === "carport" ? 1 : 3,
    pachtLaufzeitJahre: 30,
    pachtVerlaengerungJahre: 10,
    genehmigungsweg: at ? "umwidmung_at" : ch ? "nutzungsplan_ch" : p.typ === "carport" || p.typ === "dach" ? "baugenehmigung" : "bplan",
    schutzgebiet: "keins",
  };
  if (d.zahlung === "meilensteine") d.meilensteine = "40 % bei Signing, 30 % bei Satzungsbeschluss, 30 % bei RTB (fiktiv)";
  if (d.struktur !== "asset") {
    d.spvRechtsform = at ? "GmbH & Co KG" : ch ? "AG" : "GmbH & Co. KG";
    d.spvGrundbesitz = "nein";
  }
  if (pv) {
    d.aufstaenderung = p.typ === "agri" ? "agriHoch" : p.typ === "carport" ? "carport" : "sued";
    if (!["carport", "dach"].includes(p.typ)) d.pachtEurHa = p.typ === "agri" ? 1200 : 2600;
    if (p.land === "DE" && !["dach"].includes(p.typ)) d.flaechenkulisse = p.typ === "agri" ? "agri" : "benachteiligt";
  }
  if (ph >= 1) {
    d.mwac = Math.round((p.mwp / (pv ? 1.2 : 1)) * 100) / 100;
    d.spannungsebene = p.mwp > 30 ? "hs" : p.mwp > 10 ? "ms_uw" : "ms";
    d.zusageDatum = "2025-11-14";
    d.zusageMw = d.mwac;
    if (ph < 5) d.zusageBefristetBis = "2028-12-31";
    d.ueberbauung = "nein";
  }
  if (ph >= 2) {
    d.mAufstellung = "2025-03-20";
    if (pv && !["carport", "dach"].includes(p.typ)) {
      d.uvp = "vorpruefung";
      d.artenschutz = ph >= 3 ? "liegt_vor" : "ausstehend";
    }
  }
  if (ph >= 3) {
    d.mBeteiligung = "2025-06-02";
    d.mOffenlage = "2025-11-03";
    d.mSatzung = "2026-03-12";
    if (d.genehmigungsweg === "bplan") d.fnp = "parallel";
    d.dinglich = "bewilligt";
    if (pv) {
      d.modulTyp = "TOPCon bifazial, 580–620 Wp (Beispiel)";
      d.modulWp = 600;
      d.bifazial = "ja";
      d.wrKonzept = "string";
      d.ertragGutachter = "Unabhängiges Ertragsbüro (fiktiv)";
      const p50 = Number(p.vertraulich?.ertragKwhKwp) || (p.land === "AT" ? 1120 : 1060);
      d.ertragP75 = Math.round(p50 * 0.96);
      d.ertragP90 = Math.round(p50 * 0.92);
      d.ertragDatenbasis = "meteonorm";
      d.ertragDatum = "2026-02-15";
      d.vermarktung = at ? "eag" : "eeg";
      d.capexEurKwp = p.typ === "agri" ? 980 : p.typ === "carport" ? 1350 : 460;
      d.opexEurKwp = 9;
    }
  }
  if (ph >= 4) {
    d.mBaugenehmigung = "2026-06-30";
    d.genehmigungBestandskraft = "ja";
    d.wrTyp = "String-Wechselrichter 350 kVA (Beispiel)";
    d.dinglich = "eingetragen";
    if (pv) {
      d.eegZuschlagCt = 4.84;
      d.eegZuschlagDatum = "2025-07-01";
      d.eegRealisierungsfrist = "2027-07-01";
    }
  }
  if (ph === 5) {
    d.codDatum = "2019-06-30";
    d.verfuegbarkeitPct = 99.2;
    d.omVertrag = "Vollwartung inkl. Grünpflege bis 2029 (fiktiv)";
    d.direktvermarkter = "Direktvermarkter (fiktiv), Vertrag bis 2027";
    d.versicherung = "Allgefahren inkl. Betriebsunterbrechung (fiktiv)";
    d.wrTausch = "geplant";
    d.eegEnde = "2039-12-31";
    d.pachtEnde = "2049-06-30";
    const soll = Math.round(p.mwp * 1080);
    d.ertraege = [2022, 2023, 2024, 2025].map((j, i) => ({ jahr: j, istMwh: Math.round(soll * [1.03, 0.97, 0.99, 1.01][i]), prognoseMwh: Math.round(soll * (1 - 0.004 * i)) }));
    delete d.zusageDatum;
  }
  if (p.typ === "speicher" || p.typ === "hybrid") {
    d.speicherMw = p.typ === "speicher" ? p.mwp : Math.round(p.mwp * 0.5 * 10) / 10;
    d.speicherMwh = p.mwhSpeicher || d.speicherMw * 2;
    d.speicherKopplung = p.typ === "speicher" ? "standalone" : "ac";
  }
  return d;
}

async function fachSeed(db) {
  // Datenblätter der Demo-Projekte einmalig ergänzen (nur fehlende; echte Projekte bleiben unberührt)
  for (const p of db.projekte || []) {
    if (!p.demo || p.datenblatt) continue;
    p.datenblatt = demoDatenblatt(p);
    if (p.typ !== "speicher" && p.vertraulich && !p.vertraulich.ertragKwhKwp && ["aufstellung", "satzung", "rtb", "cod"].includes(p.phase)) p.vertraulich.ertragKwhKwp = p.land === "AT" ? 1120 : 1060;
  }
  // Unternehmen: eine Abnahmestelle (fiktive MaLo-ID mit gültiger Prüfziffer)
  const u = (db.nutzer || []).find((x) => x.email === "unternehmen@example.com");
  if (u) {
    db.fach.abnahmestellen.push({
      id: neueId("AS"), nutzerId: u.id, bezeichnung: "Werk Nord (Demo)", land: "DE", plz: "86825", ort: "Musterstadt", maloId: "51238696781", meloId: "", zaehlpunkt: "",
      messart: "rlm", netzbetreiber: "Demo-Netz GmbH (fiktiv)", spannungsebene: "ms", netzebeneAt: "", jahresverbrauchKwh: 850000, spitzeKw: 240,
      lieferant: "Demo-Energie AG (fiktiv)", vertragEnde: "2026-12-31", kuendigungsfristMonate: 3, preisstruktur: "fest", arbeitspreisCt: 21.5, leistungspreisEurKwJahr: 95, grundpreisEurMonat: 120, netzentgeltCt: null,
      stromsteuerEntlastung: true, par19: "keine", eigenerzeugungKwp: 0, bemerkung: "", erstelltAm: jetzt(), geaendertAm: jetzt(),
    });
  }
}

export const FACH_BUNDESLAENDER = Object.values(BUNDESLAENDER).flat();
