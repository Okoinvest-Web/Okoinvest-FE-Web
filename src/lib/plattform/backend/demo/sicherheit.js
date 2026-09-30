// src/lib/plattform/backend/demo/sicherheit.js
//
// Login, Sicherheit & Konto im Demo-Backend – Referenz für die Frappe-App (plattform/api/sicherheit.py).
// Vertrag: docs/API.md, Abschnitt „sicherheit“.
//
//   db.sitzungen      { id S-…, nutzerId, version, erstelltAm, ablauf, letzteAktivitaet, ipGrob, ort, userAgent, geraet,
//                       mobil, geraetId, methode, zweiFaktor, organisationId, widerrufenAm }
//   db.geraete        { id G-…, nutzerId, hash (SHA-256 des Geräte-Cookies), label, ersteAnmeldung, letzteAnmeldung,
//                       vertrautBis (2FA „Gerät 30 Tage merken“), zweiFaktorVersion }
//   db.anmeldungen    { id AN-…, nutzerId, email, am, ok, methode, grund, ipGrob, ort, geraet }  (Historie, auch Fehlversuche)
//   db.zweiFaktor     { nutzerId, aktiv, geheimnis (AES-GCM), ausstehend, ausstehendAm, letzterSchritt, codes [SHA-256], aktiviertAm, version }
//   db.anmeldeSperren { <email>: { fehl, bis, zuletzt } }  – Kontosperre mit exponentiellem Backoff
//   db.einstellungen  { zweiFaktorPflicht: [rollen] }       – zusätzlich Umgebungsvariable PLATTFORM_2FA_PFLICHT
//
// Sitzungen: Das signierte Cookie trägt die Sitzungskennung; gültig nur, solange der Eintrag besteht, nicht
// widerrufen/abgelaufen ist und seine Version der Sitzungsversion des Kontos entspricht.

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { ALLE_ROLLEN_IDS } from "../../konstanten";
import { geraetAusUserAgent, ipGrob, ortGrob } from "../../geraet";
import {
  codeHash, codesErzeugen, entschluesseln, geheimnisErzeugen, istWiederherstellungscode, otpauthUri, totpPruefen, verschluesseln,
} from "../../totp";
import { komfortBereinigen, teamRolleLabel } from "../../organisation";
import { passwortPruefen } from "../../server/passwort";
import { SITZUNG_DAUER_S } from "../../sitzung";
import { jetzt, neueId, sha256, zufallsToken } from "./hilfen";
import { aendern, lesen } from "./speicher";
import { internSicherheit } from "./sicherheitWerkzeuge";
import { orgSammlungen, orgSeed, organisationenVon } from "./teams";

export const SPERRE = { schwelle: 5, basisSekunden: 30, maxSekunden: 3600 };
export const MAGIC_LINK_MINUTEN = 15;
export const GERAET_MERKEN_TAGE = 30;
const AKTIVITAET_MS = 5 * 60e3; // letzte Aktivität höchstens alle 5 min schreiben (Schreiblast gering halten)
const EINRICHTUNG_MINUTEN = 30;

// ================================================================ Helfer

function sammlungen(db) {
  db.sitzungen ||= [];
  db.geraete ||= [];
  db.anmeldungen ||= [];
  db.zweiFaktor ||= [];
  db.anmeldeSperren ||= {};
  db.einstellungen ||= {};
  db.tokens ||= [];
  db.demoLinks ||= [];
  orgSammlungen(db);
  return db;
}

const nutzerById = (db, id) => db.nutzer.find((u) => u.id === id) || null;
const zf = (db, nutzerId) => (db.zweiFaktor || []).find((z) => z.nutzerId === nutzerId) || null;
const nameVon = (u) => [u?.vorname, u?.nachname].filter(Boolean).join(" ");
const nichtAngemeldet = () => new PlattformFehler(401, "Bitte melden Sie sich an.");

function adminNoetig(n) {
  if (!n) throw nichtAngemeldet();
  if (!n.rollen?.includes("admin")) throw verboten("Nur für das Backoffice.");
}

/** Rollen mit Pflicht zur Zwei-Faktor-Anmeldung (Einstellung im Backoffice ∪ PLATTFORM_2FA_PFLICHT) */
export function pflichtRollen(db) {
  const env = String(process.env.PLATTFORM_2FA_PFLICHT || "").split(",").map((s) => s.trim()).filter((s) => ALLE_ROLLEN_IDS.includes(s));
  return [...new Set([...(db.einstellungen?.zweiFaktorPflicht || []), ...env])];
}
const pflichtFuer = (db, u) => pflichtRollen(db).some((r) => u?.rollen?.includes(r));

/** Sicherheitsmeldung: Glocke + E-Mail (immer, unabhängig von den Benachrichtigungs-Einstellungen) */
function sicherheitMelden(db, u, { titel, text, betreff, mailText, glocke = true }) {
  if (!u) return;
  if (glocke) internSicherheit.benachrichtigen(db, u, { art: "sicherheit", titel, text, link: "/portal/sicherheit", objektArt: "nutzer", objektId: u.id }, { mail: false });
  internSicherheit.postausgangAnlegen(db, {
    an: u.email, anName: nameVon(u), nutzerId: u.id, art: "sicherheit", betreff, text: mailText || text, link: "/portal/sicherheit", linkText: "Sicherheit prüfen",
    hinweis: "Das waren nicht Sie? Ändern Sie sofort Ihr Passwort und beenden Sie unter „Sicherheit“ alle Sitzungen.",
  });
}

function historie(db, { nutzer, email, ok, methode, grund = "", ip, userAgent, land }) {
  const g = geraetAusUserAgent(userAgent);
  db.anmeldungen.push({ id: neueId("AN"), nutzerId: nutzer?.id || null, email: email || nutzer?.email || "", am: jetzt(), ok, methode, grund, ipGrob: ipGrob(ip), ort: ortGrob(ip, land), geraet: g.label });
  if (db.anmeldungen.length > 5000) db.anmeldungen.splice(0, db.anmeldungen.length - 5000);
}

// ================================================================ Kontosperre (exponentieller Backoff)

/** Wartezeit in Sekunden nach `fehl` Fehlversuchen (0 = keine Sperre) */
export function sperrDauer(fehl) {
  if (fehl < SPERRE.schwelle) return 0;
  return Math.min(SPERRE.maxSekunden, SPERRE.basisSekunden * 2 ** (fehl - SPERRE.schwelle));
}

const sperrText = (sek) => {
  const min = Math.ceil(sek / 60);
  return `Zu viele fehlgeschlagene Anmeldeversuche. Das Konto ist vorübergehend gesperrt – bitte versuchen Sie es in ${sek < 60 ? `${sek} Sekunden` : `${min} Minute${min === 1 ? "" : "n"}`} erneut oder melden Sie sich per E-Mail-Link an.`;
};

/** Wirft 429 (code „gesperrt“), solange die E-Mail-Adresse gesperrt ist */
export function sperrePruefen(db, email) {
  const s = db.anmeldeSperren?.[email];
  if (!s?.bis) return;
  const rest = Math.ceil((new Date(s.bis).getTime() - Date.now()) / 1000);
  if (rest > 0) throw new PlattformFehler(429, sperrText(rest), "gesperrt");
}

/** Fehlversuch zählen (Passwort oder 2FA-Code) – ab der Schwelle wächst die Sperre exponentiell */
export function fehlversuchBuchen(db, { email, nutzer, ip, userAgent, land, grund }) {
  sammlungen(db);
  if (email) {
    const s = db.anmeldeSperren[email] || { fehl: 0, bis: null };
    s.fehl += 1;
    s.zuletzt = jetzt();
    const dauer = sperrDauer(s.fehl);
    s.bis = dauer ? new Date(Date.now() + dauer * 1000).toISOString() : null;
    db.anmeldeSperren[email] = s;
    const schluessel = Object.keys(db.anmeldeSperren);
    if (schluessel.length > 2000) {
      schluessel.sort((a, b) => String(db.anmeldeSperren[a].zuletzt).localeCompare(String(db.anmeldeSperren[b].zuletzt)));
      for (const k of schluessel.slice(0, schluessel.length - 2000)) delete db.anmeldeSperren[k];
    }
    if (nutzer && dauer && s.fehl === SPERRE.schwelle) {
      sicherheitMelden(db, nutzer, {
        titel: "Konto vorübergehend gesperrt",
        text: `${SPERRE.schwelle} fehlgeschlagene Anmeldeversuche – die Anmeldung ist kurz gesperrt.`,
        betreff: "Mehrere fehlgeschlagene Anmeldeversuche – ÖkoInvest",
        mailText: `Für Ihr Konto gab es ${SPERRE.schwelle} fehlgeschlagene Anmeldeversuche. Die Anmeldung ist deshalb vorübergehend gesperrt; jede weitere Fehleingabe verlängert die Sperre. Über den E-Mail-Link auf der Anmeldeseite kommen Sie jederzeit in Ihr Konto.`,
      });
    }
  }
  if (nutzer) historie(db, { nutzer, email, ok: false, methode: grund === "2fa" ? "zwei-faktor" : "passwort", grund, ip, userAgent, land });
}

// ================================================================ Sitzung (von nutzerFuerSitzung genutzt)

/** Nutzer um Sitzung, Organisation, 2FA-Status und Komfort ergänzen */
export function nutzerAnreichern(db, u, s = null) {
  sammlungen(db);
  const orgs = organisationenVon(db, u.id);
  const org = s?.organisationId ? orgs.find((o) => o.id === s.organisationId) || null : null;
  const z = zf(db, u.id);
  const pflicht = pflichtFuer(db, u);
  const out = {
    ...u,
    sitzung: s ? { id: s.id, organisationId: org?.id || null, zweiFaktor: !!s.zweiFaktor } : null,
    organisation: org,
    organisationen: orgs,
    zweiFaktorAktiv: !!z?.aktiv,
    zweiFaktorPflicht: pflicht,
    zweiFaktorPflichtOffen: pflicht && !z?.aktiv,
    komfort: komfortBereinigen(u.komfort || {}),
  };
  if (org) {
    // Im Organisationskontext gilt das Team-Suchprofil
    out.suchprofilPersoenlich = u.suchprofil || null;
    out.suchprofil = db.organisationen.find((o) => o.id === org.id)?.suchprofil || null;
  }
  return out;
}

function sitzungGueltig(s, u) {
  return !!s && s.nutzerId === u.id && !s.widerrufenAm && new Date(s.ablauf) > new Date() && (s.version || 0) === (u.sitzungVersion || 0);
}

/**
 * Sitzung prüfen und Nutzer anreichern. Ohne Sitzungskennung (Token aus der Zeit vor den Sitzungslisten)
 * gilt nur die Sitzungsversion. Letzte Aktivität wird höchstens einmal pro Minute geschrieben.
 */
export async function sitzungNutzer(db, u, { sitzungId } = {}) {
  sammlungen(db);
  if (!sitzungId) return nutzerAnreichern(db, u, null);
  const s = db.sitzungen.find((x) => x.id === sitzungId);
  if (!sitzungGueltig(s, u)) return null;
  if (Date.now() - new Date(s.letzteAktivitaet).getTime() > AKTIVITAET_MS) {
    // nicht abwarten: die Anfrage soll nie auf die Schreibsperre warten
    aendern((d) => {
      const x = (d.sitzungen || []).find((y) => y.id === sitzungId);
      if (x) x.letzteAktivitaet = jetzt();
    }).catch(() => {});
  }
  return nutzerAnreichern(db, u, s);
}

/** 2FA-Status für das Ergebnis von anmelden (steuert den zweiten Schritt) */
export const mitZweiFaktor = (db, u) => ({ ...u, zweiFaktorAktiv: !!zf(sammlungen(db), u.id)?.aktiv });

// ================================================================ Operationen: Sitzungen & Geräte

/**
 * Neue Sitzung nach vollständiger Anmeldung (Passwort/E-Mail-Link + ggf. 2FA). Setzt die Sperre zurück,
 * schreibt die Historie, erkennt neue Geräte (Benachrichtigung + E-Mail) und merkt das Gerät optional 30 Tage.
 * Liefert { sitzung: {id}, geraetToken (nur wenn neu erzeugt), neuesGeraet }.
 */
export async function sitzungAnlegen(n, { ip = "", userAgent = "", land = "", methode = "passwort", zweiFaktor = false, geraetToken = "", geraetMerken = false, ersetzt = null } = {}) {
  if (!n) throw nichtAngemeldet();
  return aendern((db) => {
    sammlungen(db);
    orgSeed(db);
    const u = nutzerById(db, n.id);
    if (!u || !u.aktiv) throw nichtAngemeldet();
    delete db.anmeldeSperren[u.email];
    const g = geraetAusUserAgent(userAgent);
    const grob = ipGrob(ip);
    const ort = ortGrob(ip, land);
    const tokenOk = /^[A-Za-z0-9_-]{30,100}$/.test(String(geraetToken || ""));
    let geraet = tokenOk ? db.geraete.find((x) => x.nutzerId === u.id && x.hash === sha256(geraetToken)) : null;
    const bekannt = !!geraet || db.anmeldungen.some((a) => a.nutzerId === u.id && a.ok && a.geraet === g.label && a.ipGrob === grob);
    let neuesToken = null;
    if (!geraet) {
      const token = tokenOk ? geraetToken : zufallsToken();
      if (!tokenOk) neuesToken = token;
      geraet = { id: neueId("G"), nutzerId: u.id, hash: sha256(token), label: g.label, mobil: g.mobil, ersteAnmeldung: jetzt(), letzteAnmeldung: jetzt(), vertrautBis: null, zweiFaktorVersion: null };
      db.geraete.push(geraet);
    }
    geraet.letzteAnmeldung = jetzt();
    geraet.label = g.label;
    const z = zf(db, u.id);
    if (geraetMerken && zweiFaktor && z?.aktiv) {
      geraet.vertrautBis = new Date(Date.now() + GERAET_MERKEN_TAGE * 86400e3).toISOString();
      geraet.zweiFaktorVersion = z.version;
    }

    // Sitzungsrotation: eine ersetzte Sitzung (z. B. nach 2FA-Einrichtung) wird beendet, Kontext bleibt
    const alt = ersetzt ? db.sitzungen.find((x) => x.id === ersetzt && x.nutzerId === u.id) : null;
    if (alt && !alt.widerrufenAm) {
      alt.widerrufenAm = jetzt();
      alt.widerrufenGrund = "rotation";
    }
    const s = {
      id: neueId("S", 10), nutzerId: u.id, version: u.sitzungVersion || 0, erstelltAm: jetzt(),
      ablauf: new Date(Date.now() + SITZUNG_DAUER_S * 1000).toISOString(), letzteAktivitaet: jetzt(),
      ipGrob: grob, ort, userAgent: v.text(userAgent, 300), geraet: g.label, mobil: g.mobil, geraetId: geraet.id,
      methode, zweiFaktor: !!zweiFaktor, organisationId: alt?.organisationId || null, widerrufenAm: null,
    };
    db.sitzungen.push(s);
    // Aufräumen: abgelaufene/widerrufene Einträge nach 30 Tagen, höchstens 30 aktive Sitzungen je Konto
    const grenze = Date.now() - 30 * 86400e3;
    db.sitzungen = db.sitzungen.filter((x) => !((x.widerrufenAm && new Date(x.widerrufenAm).getTime() < grenze) || new Date(x.ablauf).getTime() < grenze));
    const aktive = db.sitzungen.filter((x) => sitzungGueltig(x, u)).sort((a, b) => a.letzteAktivitaet.localeCompare(b.letzteAktivitaet));
    for (const x of aktive.slice(0, Math.max(0, aktive.length - 30))) {
      x.widerrufenAm = jetzt();
      x.widerrufenGrund = "grenze";
    }

    u.letzterLogin = jetzt();
    historie(db, { nutzer: u, ok: true, methode: `${methode}${zweiFaktor ? " + 2FA" : ""}`, ip, userAgent, land });
    if (!bekannt && !["registrierung"].includes(methode)) {
      sicherheitMelden(db, u, {
        titel: "Anmeldung von einem neuen Gerät",
        text: `${g.label} · ${ort || "Ort unbekannt"}`,
        betreff: "Neue Anmeldung bei Ihrem Konto – ÖkoInvest",
        mailText: `Ihr Konto im Portal von ÖkoInvest wurde soeben von einem neuen Gerät verwendet: ${g.label}, ${ort || "Ort unbekannt"}. Wenn Sie das waren, ist nichts zu tun.`,
      });
    }
    if (methode !== "passwort" || zweiFaktor) internSicherheit.protokoll(db, u, "login", "nutzer", u.id, `Anmeldung (${methode}${zweiFaktor ? ", 2FA" : ""}) · ${g.label}`, ip);
    return { sitzung: { id: s.id }, geraetToken: neuesToken, neuesGeraet: !bekannt };
  });
}

/** Aktive Sitzungen des Kontos (aktuelle markiert) */
export async function sitzungen(n) {
  if (!n) throw nichtAngemeldet();
  const db = sammlungen(await lesen());
  const u = nutzerById(db, n.id);
  return db.sitzungen
    .filter((s) => sitzungGueltig(s, u))
    .sort((a, b) => b.letzteAktivitaet.localeCompare(a.letzteAktivitaet))
    .map((s) => ({
      id: s.id, geraet: s.geraet, mobil: !!s.mobil, ort: s.ort, erstelltAm: s.erstelltAm, letzteAktivitaet: s.letzteAktivitaet, methode: s.methode,
      zweiFaktor: !!s.zweiFaktor, aktuell: s.id === n.sitzung?.id, organisation: s.organisationId ? db.organisationen.find((o) => o.id === s.organisationId)?.name || null : null,
    }));
}

/**
 * Sitzung(en) beenden: { id } eine eigene Sitzung (auch die aktuelle = Abmelden) oder { alleAnderen: true }.
 * „Alle anderen“ erhöht zusätzlich die Sitzungsversion (beendet auch ältere Token) – die aktuelle Sitzung
 * übernimmt die neue Version; die Website setzt dafür ein neues Cookie.
 */
export async function sitzungBeenden(n, { id, alleAnderen = false } = {}) {
  if (!n) throw nichtAngemeldet();
  return aendern((db) => {
    sammlungen(db);
    const u = nutzerById(db, n.id);
    let beendet = 0;
    if (alleAnderen) {
      for (const s of db.sitzungen) {
        if (s.nutzerId !== u.id || s.id === n.sitzung?.id || s.widerrufenAm) continue;
        s.widerrufenAm = jetzt();
        s.widerrufenGrund = "abgemeldet";
        beendet++;
      }
      u.sitzungVersion = (u.sitzungVersion || 0) + 1;
      const aktuell = db.sitzungen.find((s) => s.id === n.sitzung?.id);
      if (aktuell) aktuell.version = u.sitzungVersion;
      internSicherheit.protokoll(db, u, "sitzung", "nutzer", u.id, `Alle anderen Sitzungen beendet (${beendet})`);
      return { beendet, sitzungVersion: u.sitzungVersion, nutzer: internSicherheit.ohneGeheimnis(u) };
    }
    const s = db.sitzungen.find((x) => x.id === v.kennung(id));
    if (!s || s.nutzerId !== u.id) throw nichtGefunden("Sitzung nicht gefunden.");
    if (!s.widerrufenAm) {
      s.widerrufenAm = jetzt();
      s.widerrufenGrund = s.id === n.sitzung?.id ? "abmeldung" : "abgemeldet";
      beendet = 1;
      if (s.id !== n.sitzung?.id) internSicherheit.protokoll(db, u, "sitzung", "nutzer", u.id, `Sitzung beendet: ${s.geraet}`);
    }
    return { beendet, sitzungVersion: u.sitzungVersion || 0 };
  });
}

/** Anmeldehistorie inkl. Fehlversuchen (neueste zuerst) */
export async function anmeldungen(n, { limit = 50 } = {}) {
  if (!n) throw nichtAngemeldet();
  const db = sammlungen(await lesen());
  return db.anmeldungen
    .filter((a) => a.nutzerId === n.id)
    .slice(-Math.min(200, Math.max(1, Number(limit) || 50)))
    .reverse()
    .map(({ id, am, ok, methode, grund, ort, geraet }) => ({ id, am, ok, methode, grund, ort, geraet }));
}

export async function geraete(n, { geraetToken = "" } = {}) {
  if (!n) throw nichtAngemeldet();
  const db = sammlungen(await lesen());
  const z = zf(db, n.id);
  const h = geraetToken ? sha256(String(geraetToken)) : "";
  return db.geraete
    .filter((g) => g.nutzerId === n.id)
    .sort((a, b) => b.letzteAnmeldung.localeCompare(a.letzteAnmeldung))
    .map((g) => ({
      id: g.id, label: g.label, mobil: !!g.mobil, ersteAnmeldung: g.ersteAnmeldung, letzteAnmeldung: g.letzteAnmeldung,
      vertraut: !!(z?.aktiv && g.vertrautBis && new Date(g.vertrautBis) > new Date() && g.zweiFaktorVersion === z.version),
      vertrautBis: g.vertrautBis, aktuell: !!h && g.hash === h,
    }));
}

/** Gerät vergessen: Eintrag löschen (2FA wird dort wieder abgefragt, neue Anmeldung gilt als neues Gerät) */
export async function geraetVergessen(n, id) {
  if (!n) throw nichtAngemeldet();
  return aendern((db) => {
    sammlungen(db);
    const g = db.geraete.find((x) => x.id === v.kennung(id) && x.nutzerId === n.id);
    if (!g) throw nichtGefunden("Gerät nicht gefunden.");
    db.geraete = db.geraete.filter((x) => x.id !== g.id);
    internSicherheit.protokoll(db, n, "geraet", "nutzer", n.id, `Gerät vergessen: ${g.label}`);
    return { ok: true };
  });
}

/** Ist das Gerät (Cookie) für die Zwei-Faktor-Anmeldung dieses Kontos gemerkt? */
export async function geraetVertraut({ nutzerId, geraetToken } = {}) {
  if (!nutzerId || !/^[A-Za-z0-9_-]{30,100}$/.test(String(geraetToken || ""))) return false;
  const db = sammlungen(await lesen());
  const z = zf(db, nutzerId);
  const g = db.geraete.find((x) => x.nutzerId === nutzerId && x.hash === sha256(geraetToken));
  return !!(z?.aktiv && g?.vertrautBis && new Date(g.vertrautBis) > new Date() && g.zweiFaktorVersion === z.version);
}

// ================================================================ Operationen: Zwei-Faktor (TOTP)

function statusVon(db, u) {
  const z = zf(db, u.id);
  const vertraute = db.geraete.filter((g) => g.nutzerId === u.id && z?.aktiv && g.vertrautBis && new Date(g.vertrautBis) > new Date() && g.zweiFaktorVersion === z.version).length;
  return {
    aktiv: !!z?.aktiv,
    aktiviertAm: z?.aktiviertAm || null,
    codesUebrig: z?.aktiv ? (z.codes || []).length : 0,
    pflicht: pflichtFuer(db, u),
    einrichtungLaeuft: !!(z?.ausstehend && !z.aktiv),
    vertrauteGeraete: vertraute,
  };
}

export async function zweiFaktorStatus(n) {
  if (!n) throw nichtAngemeldet();
  const db = sammlungen(await lesen());
  return statusVon(db, nutzerById(db, n.id));
}

/** Einrichtung starten: neuer Schlüssel (noch nicht aktiv) → { geheimnis, uri } für QR-Code / manuelle Eingabe */
export async function zweiFaktorStarten(n) {
  if (!n) throw nichtAngemeldet();
  return aendern((db) => {
    sammlungen(db);
    const u = nutzerById(db, n.id);
    let z = zf(db, u.id);
    if (z?.aktiv) throw konflikt("Die Zwei-Faktor-Anmeldung ist bereits aktiv.");
    if (!z) {
      z = { nutzerId: u.id, aktiv: false, geheimnis: null, ausstehend: null, ausstehendAm: null, letzterSchritt: -1, codes: [], aktiviertAm: null, version: 0 };
      db.zweiFaktor.push(z);
    }
    const geheimnis = geheimnisErzeugen();
    z.ausstehend = verschluesseln(geheimnis);
    z.ausstehendAm = jetzt();
    return { geheimnis, uri: otpauthUri({ geheimnis, konto: u.email }) };
  });
}

function neueCodes(z) {
  const codes = codesErzeugen();
  z.codes = codes.map(codeHash);
  return codes;
}

/** Einrichtung bestätigen: erster Code aus der App → aktiv + 10 Wiederherstellungscodes (einmalig angezeigt) */
export async function zweiFaktorBestaetigen(n, { code } = {}) {
  if (!n) throw nichtAngemeldet();
  return aendern((db) => {
    sammlungen(db);
    const u = nutzerById(db, n.id);
    const z = zf(db, u.id);
    if (z?.aktiv) throw konflikt("Die Zwei-Faktor-Anmeldung ist bereits aktiv.");
    if (!z?.ausstehend || Date.now() - new Date(z.ausstehendAm).getTime() > EINRICHTUNG_MINUTEN * 60e3) throw ungueltig("Die Einrichtung ist abgelaufen. Bitte starten Sie sie erneut.");
    const geheimnis = entschluesseln(z.ausstehend);
    const schritt = totpPruefen(geheimnis, code);
    if (schritt === null) throw ungueltig("Der Code stimmt nicht. Prüfen Sie die Uhrzeit Ihres Telefons und geben Sie den aktuellen 6-stelligen Code ein.");
    z.aktiv = true;
    z.geheimnis = z.ausstehend;
    z.ausstehend = null;
    z.ausstehendAm = null;
    z.letzterSchritt = schritt;
    z.aktiviertAm = jetzt();
    z.version = (z.version || 0) + 1;
    const codes = neueCodes(z);
    sicherheitMelden(db, u, {
      titel: "Zwei-Faktor-Anmeldung aktiviert",
      text: "Ab sofort fragen wir bei der Anmeldung zusätzlich einen Code aus Ihrer Authenticator-App ab.",
      betreff: "Zwei-Faktor-Anmeldung aktiviert – ÖkoInvest",
    });
    internSicherheit.protokoll(db, u, "zwei_faktor", "nutzer", u.id, "Zwei-Faktor-Anmeldung aktiviert");
    return { codes, status: statusVon(db, u) };
  });
}

/** Code prüfen (TOTP mit Replay-Schutz oder Wiederherstellungscode); verbraucht Wiederherstellungscodes */
function codeEinloesen(db, u, code, { wiederherstellung = true } = {}) {
  const z = zf(db, u.id);
  if (!z?.aktiv) return null;
  if (wiederherstellung && istWiederherstellungscode(code)) {
    const h = codeHash(code);
    const idx = (z.codes || []).indexOf(h);
    if (idx < 0) return null;
    z.codes.splice(idx, 1);
    return { methode: "wiederherstellung", codesUebrig: z.codes.length };
  }
  const schritt = totpPruefen(entschluesseln(z.geheimnis), code, { letzterSchritt: z.letzterSchritt ?? -1 });
  if (schritt === null) return null;
  z.letzterSchritt = schritt;
  return { methode: "totp", codesUebrig: (z.codes || []).length };
}

export async function zweiFaktorDeaktivieren(n, { passwort, code } = {}) {
  if (!n) throw nichtAngemeldet();
  const db0 = sammlungen(await lesen());
  const u0 = nutzerById(db0, n.id);
  if (pflichtFuer(db0, u0)) throw konflikt("Für Ihre Rolle ist die Zwei-Faktor-Anmeldung Pflicht und kann nicht abgeschaltet werden.");
  if (!(await passwortPruefen(String(passwort || ""), u0?.passwortHash))) throw ungueltig("Das Passwort stimmt nicht.");
  return aendern((db) => {
    sammlungen(db);
    const u = nutzerById(db, n.id);
    const z = zf(db, u.id);
    if (!z?.aktiv) throw konflikt("Die Zwei-Faktor-Anmeldung ist nicht aktiv.");
    if (!codeEinloesen(db, u, code)) throw ungueltig("Der Code ist ungültig.");
    z.aktiv = false;
    z.geheimnis = null;
    z.codes = [];
    z.aktiviertAm = null;
    z.version = (z.version || 0) + 1; // gemerkte Geräte verlieren ihre Gültigkeit
    sicherheitMelden(db, u, {
      titel: "Zwei-Faktor-Anmeldung abgeschaltet",
      text: "Die Anmeldung erfolgt wieder nur mit Passwort bzw. E-Mail-Link.",
      betreff: "Zwei-Faktor-Anmeldung abgeschaltet – ÖkoInvest",
    });
    internSicherheit.protokoll(db, u, "zwei_faktor", "nutzer", u.id, "Zwei-Faktor-Anmeldung abgeschaltet");
    return statusVon(db, u);
  });
}

/** Neue Wiederherstellungscodes (alte werden ungültig) – nur mit aktuellem App-Code */
export async function wiederherstellungscodesNeu(n, { code } = {}) {
  if (!n) throw nichtAngemeldet();
  return aendern((db) => {
    sammlungen(db);
    const u = nutzerById(db, n.id);
    const z = zf(db, u.id);
    if (!z?.aktiv) throw konflikt("Die Zwei-Faktor-Anmeldung ist nicht aktiv.");
    if (!codeEinloesen(db, u, code, { wiederherstellung: false })) throw ungueltig("Bitte geben Sie den aktuellen Code aus Ihrer Authenticator-App ein.");
    const codes = neueCodes(z);
    internSicherheit.protokoll(db, u, "zwei_faktor", "nutzer", u.id, "Neue Wiederherstellungscodes erzeugt");
    return { codes, status: statusVon(db, u) };
  });
}

/**
 * Zweiter Schritt der Anmeldung. Fehlversuche zählen zur Kontosperre. Liefert das Konto
 * (+ zweiFaktorMethode, codesUebrig) oder wirft 401 (code „zwei_faktor“) bzw. 429 (gesperrt).
 */
export async function zweiFaktorPruefen({ nutzerId, code, ip = "", userAgent = "", land = "" } = {}) {
  return aendern((db) => {
    sammlungen(db);
    const u = nutzerById(db, nutzerId);
    if (!u || !u.aktiv) throw nichtAngemeldet();
    sperrePruefen(db, u.email);
    const r = codeEinloesen(db, u, code);
    if (!r) {
      fehlversuchBuchen(db, { email: u.email, nutzer: u, ip, userAgent, land, grund: "2fa" });
      throw new PlattformFehler(401, "Der Code ist ungültig oder wurde bereits verwendet.", "zwei_faktor");
    }
    if (r.methode === "wiederherstellung") {
      sicherheitMelden(db, u, {
        titel: "Wiederherstellungscode verwendet",
        text: `Noch ${r.codesUebrig} Wiederherstellungscode(s) übrig.`,
        betreff: "Wiederherstellungscode verwendet – ÖkoInvest",
        mailText: `Für die Anmeldung wurde einer Ihrer Wiederherstellungscodes verwendet. Es sind noch ${r.codesUebrig} Code(s) übrig. Erzeugen Sie bei Bedarf unter „Sicherheit“ neue Codes.`,
      });
    }
    return { ...mitZweiFaktor(db, internSicherheit.ohneGeheimnis(u)), zweiFaktorMethode: r.methode, codesUebrig: r.codesUebrig };
  });
}

// ================================================================ Operationen: E-Mail-Link (passwortlos)

/** Immer { ok: true } (keine Enumeration). Aktive Konten erhalten einen Link (15 min, einmalig, nur Hash gespeichert). */
export async function magicLinkAnfordern({ email, basisUrl, ip = "" } = {}) {
  const e = v.email(email);
  if (!e) return { ok: true };
  await aendern((db) => {
    sammlungen(db);
    const u = db.nutzer.find((x) => x.email === e && x.aktiv);
    if (!u) return;
    const token = internSicherheit.tokenAnlegen(db, "magic", u.id, MAGIC_LINK_MINUTEN / 60);
    const link = `${basisUrl}/login/link?token=${token}`;
    db.demoLinks.unshift({ am: jetzt(), art: "magic", email: e, link });
    db.demoLinks = db.demoLinks.slice(0, 50);
    console.info(`[plattform-demo] Anmelde-Link für ${e}: ${link}`);
    internSicherheit.postausgangAnlegen(db, {
      an: e, anName: nameVon(u), nutzerId: u.id, art: "magic", betreff: "Ihr Anmelde-Link – ÖkoInvest",
      text: `Mit dem folgenden Link melden Sie sich ohne Passwort im Portal von ÖkoInvest an. Er ist ${MAGIC_LINK_MINUTEN} Minuten gültig und funktioniert nur einmal. Ist die Zwei-Faktor-Anmeldung aktiv, fragen wir danach zusätzlich Ihren Code ab.`,
      link, linkText: "Jetzt anmelden", hinweis: "Sie haben keinen Link angefordert? Dann ignorieren Sie diese E-Mail – ohne den Link ist keine Anmeldung möglich.",
    });
    internSicherheit.protokoll(db, u, "magic_link", "nutzer", u.id, "Anmelde-Link angefordert", ip);
  });
  return { ok: true };
}

/** Link einlösen → Konto (E-Mail gilt als bestätigt). 2FA prüft danach die Website. */
export async function magicLinkEinloesen({ token } = {}) {
  return aendern((db) => {
    sammlungen(db);
    const u = internSicherheit.tokenEinloesen(db, "magic", token);
    if (!u.emailBestaetigt) {
      u.emailBestaetigt = true;
      internSicherheit.verknuepfen(db, u);
    }
    return mitZweiFaktor(db, internSicherheit.ohneGeheimnis(u));
  });
}

// ================================================================ Operationen: Pflicht-2FA (Backoffice)

export async function zweiFaktorPflicht(n) {
  adminNoetig(n);
  const db = sammlungen(await lesen());
  const env = String(process.env.PLATTFORM_2FA_PFLICHT || "").split(",").map((s) => s.trim()).filter((s) => ALLE_ROLLEN_IDS.includes(s));
  const ohne = db.nutzer.filter((u) => u.aktiv && pflichtFuer(db, u) && !zf(db, u.id)?.aktiv).length;
  return { rollen: db.einstellungen.zweiFaktorPflicht || [], umgebung: env, wirksam: pflichtRollen(db), kontenOhne2fa: ohne };
}

export async function zweiFaktorPflichtSpeichern(n, { rollen } = {}) {
  adminNoetig(n);
  const r = v.mehrfach(rollen, ALLE_ROLLEN_IDS);
  return aendern((db) => {
    sammlungen(db);
    db.einstellungen.zweiFaktorPflicht = r;
    internSicherheit.protokoll(db, n, "einstellung", "nutzer", n.id, `Pflicht-2FA für: ${r.join(", ") || "niemand"}`);
    return { rollen: r, wirksam: pflichtRollen(db) };
  });
}

// ================================================================ Operationen: Konto-Komfort, E-Mail ändern

export async function komfortSpeichern(n, daten = {}) {
  if (!n) throw nichtAngemeldet();
  return aendern((db) => {
    const u = nutzerById(db, n.id);
    u.komfort = komfortBereinigen(daten, komfortBereinigen(u.komfort || {}));
    internSicherheit.protokoll(db, u, "profil", "nutzer", u.id, "Konto-Einstellungen gespeichert");
    return internSicherheit.ohneGeheimnis(u);
  });
}

/** Neue Anmeldeadresse anfordern: Bestätigungslink an die NEUE Adresse (24 h), Hinweis an die alte */
export async function emailAendernAnfordern(n, { neu, passwort, basisUrl } = {}) {
  if (!n) throw nichtAngemeldet();
  const e = v.email(neu);
  v.pflicht(e, "Bitte geben Sie eine gültige E-Mail-Adresse an.");
  const db0 = await lesen();
  const u0 = nutzerById(db0, n.id);
  v.pflicht(e !== u0.email, "Das ist bereits Ihre Anmeldeadresse.");
  if (!(await passwortPruefen(String(passwort || ""), u0?.passwortHash))) throw ungueltig("Das Passwort stimmt nicht.");
  return aendern((db) => {
    sammlungen(db);
    if (db.nutzer.some((x) => x.email === e)) throw konflikt("Für diese E-Mail-Adresse besteht bereits ein Konto.");
    const u = nutzerById(db, n.id);
    const token = internSicherheit.tokenAnlegen(db, "email_neu", u.id, 24);
    const t = db.tokens.find((x) => x.hash === sha256(token));
    t.neueEmail = e;
    const link = `${basisUrl}/api/auth/email-aendern?token=${token}`;
    db.demoLinks.unshift({ am: jetzt(), art: "email_neu", email: e, link });
    db.demoLinks = db.demoLinks.slice(0, 50);
    console.info(`[plattform-demo] E-Mail-Änderung für ${u.email} → ${e}: ${link}`);
    internSicherheit.postausgangAnlegen(db, {
      an: e, anName: nameVon(u), nutzerId: u.id, art: "email_neu", betreff: "Neue E-Mail-Adresse bestätigen – ÖkoInvest",
      text: "Sie möchten diese Adresse künftig für die Anmeldung im Portal von ÖkoInvest verwenden. Bitte bestätigen Sie sie über den folgenden Link (24 Stunden gültig).",
      link, linkText: "Neue Adresse bestätigen", hinweis: "Sie haben keine Änderung angefordert? Dann ignorieren Sie diese E-Mail.",
    });
    sicherheitMelden(db, u, {
      titel: "Änderung der E-Mail-Adresse angefordert",
      text: `Neue Adresse: ${e} – wirksam nach Bestätigung.`,
      betreff: "Änderung Ihrer E-Mail-Adresse angefordert – ÖkoInvest",
      mailText: `Für Ihr Konto wurde die Änderung der Anmeldeadresse auf ${e} angefordert. Sie wird erst wirksam, wenn die neue Adresse bestätigt ist.`,
    });
    internSicherheit.protokoll(db, u, "email_aendern", "nutzer", u.id, `Neue Adresse angefordert: ${e}`);
    return { ok: true, an: e };
  });
}

export async function emailAendernBestaetigen({ token } = {}) {
  return aendern((db) => {
    sammlungen(db);
    const t = db.tokens.find((x) => x.hash === sha256(String(token || "")) && x.art === "email_neu");
    const u = internSicherheit.tokenEinloesen(db, "email_neu", token);
    const neu = t?.neueEmail;
    if (!neu) throw ungueltig("Der Link ist ungültig oder abgelaufen.");
    if (db.nutzer.some((x) => x.email === neu && x.id !== u.id)) throw konflikt("Für diese E-Mail-Adresse besteht bereits ein Konto.");
    const alt = u.email;
    const sperre = db.anmeldeSperren[alt];
    u.email = neu;
    u.emailBestaetigt = true;
    if (sperre) {
      db.anmeldeSperren[neu] = sperre;
      delete db.anmeldeSperren[alt];
    }
    internSicherheit.postausgangAnlegen(db, {
      an: alt, anName: nameVon(u), nutzerId: u.id, art: "sicherheit", betreff: "Ihre Anmeldeadresse wurde geändert – ÖkoInvest",
      text: `Die Anmeldeadresse Ihres Kontos wurde auf ${neu} geändert. An diese Adresse senden wir keine Nachrichten mehr.`, link: "/login", linkText: "Zur Anmeldung",
      hinweis: "Das waren nicht Sie? Bitte wenden Sie sich umgehend über das Kontaktformular an uns.",
    });
    internSicherheit.verknuepfen(db, u);
    internSicherheit.protokoll(db, u, "email_aendern", "nutzer", u.id, `Anmeldeadresse geändert: ${alt} → ${neu}`);
    return internSicherheit.ohneGeheimnis(u);
  });
}

// ================================================================ Operationen: DSGVO (Auskunft/Export, Löschung)

const ohne = (o, felder) => {
  if (!o) return o;
  const x = { ...o };
  for (const f of felder) delete x[f];
  return x;
};

/**
 * Datenexport (Art. 15 / Art. 20 DSGVO): ausschließlich Daten, die das Konto selbst betreffen –
 * eigene Stammdaten, eigene Objekte, eigene Nachrichten-Threads, eigene Aktivitäten. Keine Geheimnisse
 * (Passwort-Hash, 2FA-Schlüssel, Token), keine internen Notizen, keine personenbezogenen Daten Dritter.
 */
export async function datenExport(n) {
  if (!n) throw nichtAngemeldet();
  const db = sammlungen(await lesen());
  const u = nutzerById(db, n.id);
  const eigene = {
    vorgaenge: db.vorgaenge.filter((x) => x.nutzerId === u.id),
    flaechen: db.flaechen.filter((x) => x.nutzerId === u.id),
    projekte: db.projekte.filter((x) => x.anbieterId === u.id),
    interessen: db.interessen.filter((x) => x.investorId === u.id),
  };
  const bezuege = new Set([
    `nutzer:${u.id}`,
    ...eigene.vorgaenge.map((x) => `vorgang:${x.id}`),
    ...eigene.flaechen.map((x) => `flaeche:${x.id}`),
    ...eigene.projekte.map((x) => `projekt:${x.id}`),
    ...eigene.interessen.map((x) => `interesse:${x.id}`),
  ]);
  const intern = ["zustaendigId", "description", "kaeuferInteresseId", "kaufpreis"];
  const verlauf = (liste) => (liste || []).map((e) => ({ status: e.status, am: e.am, von: e.vonId === u.id ? "Sie" : e.vonRolle === "admin" ? "ÖkoInvest" : "System", kommentar: e.kommentar }));
  const z = zf(db, u.id);
  const daten = {
    export: {
      format: "oekoinvest-datenexport-1",
      erstelltAm: jetzt(),
      hinweis: "Auskunft über Ihre personenbezogenen Daten (Art. 15 DSGVO) in einem maschinenlesbaren Format (Art. 20 DSGVO). Dateien des Datenraums sind als Metadaten enthalten und im Portal abrufbar.",
    },
    konto: {
      ...ohne(internSicherheit.ohneGeheimnis(u), ["sitzungVersion", "demo"]),
      komfort: komfortBereinigen(u.komfort || {}),
    },
    sicherheit: {
      zweiFaktor: { aktiv: !!z?.aktiv, aktiviertAm: z?.aktiviertAm || null, wiederherstellungscodesUebrig: z?.aktiv ? (z.codes || []).length : 0 },
      sitzungen: db.sitzungen.filter((s) => s.nutzerId === u.id).map((s) => ohne(s, ["nutzerId", "version", "geraetId"])),
      geraete: db.geraete.filter((g) => g.nutzerId === u.id).map((g) => ohne(g, ["hash", "nutzerId", "zweiFaktorVersion"])),
      anmeldungen: db.anmeldungen.filter((a) => a.nutzerId === u.id).map((a) => ohne(a, ["nutzerId"])),
    },
    organisationen: db.mitgliedschaften
      .filter((m) => m.nutzerId === u.id)
      .map((m) => {
        const o = db.organisationen.find((x) => x.id === m.organisationId);
        return { organisation: o?.name || m.organisationId, art: o?.art || "", rolle: teamRolleLabel(m.rolle), seit: m.seit };
      }),
    vorgaenge: eigene.vorgaenge.map((x) => ({ ...ohne(x, intern), statusVerlauf: verlauf(x.statusVerlauf) })),
    flaechen: eigene.flaechen.map((x) => ({ ...ohne(x, intern), statusVerlauf: verlauf(x.statusVerlauf) })),
    projekte: eigene.projekte.map((x) => ({ ...ohne(x, intern), statusVerlauf: verlauf(x.statusVerlauf) })),
    interessen: eigene.interessen.map((x) => ({ ...ohne(x, intern), statusVerlauf: verlauf(x.statusVerlauf) })),
    provisionen: db.provisionen.filter((x) => x.anbieterId === u.id).map((x) => ({ id: x.id, projektId: x.projektId, satz: x.satz, betrag: x.betrag, status: x.status, erstelltAm: x.erstelltAm })),
    nachrichten: db.nachrichten
      .filter((m) => bezuege.has(`${m.bezugArt}:${m.bezugId}`))
      .map((m) => ({ id: m.id, bezug: `${m.bezugArt}:${m.bezugId}`, am: m.am, von: m.vonId === u.id && !m.system ? "Sie" : m.system ? "System" : m.vonAdmin ? "ÖkoInvest" : "Teammitglied", text: m.text })),
    dokumente: db.dokumente
      .filter((d) => d.hochgeladenVon === u.id || bezuege.has(`${d.bezugArt}:${d.bezugId}`))
      .map((d) => ({ id: d.id, bezug: `${d.bezugArt}:${d.bezugId}`, name: d.name, mime: d.mime, groesse: d.groesse, kategorie: d.kategorie, am: d.am, vonIhnen: d.hochgeladenVon === u.id })),
    benachrichtigungen: (db.benachrichtigungen || []).filter((b) => b.nutzerId === u.id).map((b) => ohne(b, ["nutzerId"])),
    einladungen: db.einladungen.filter((e) => e.email === u.email).map((e) => ({ organisation: db.organisationen.find((o) => o.id === e.organisationId)?.name || "", rolle: teamRolleLabel(e.rolle), status: e.status, erstelltAm: e.erstelltAm })),
    aktivitaeten: db.aktivitaeten.filter((a) => a.nutzerId === u.id).map((a) => ohne(a, ["nutzerId", "prevHash", "hash"])),
  };
  await aendern((d) => internSicherheit.protokoll(d, u, "datenexport", "nutzer", u.id, "Datenexport (Art. 15/20 DSGVO) heruntergeladen"));
  // E-Mail-Adressen Dritter (z. B. in Protokolltexten „Einladung an …“) nur maskiert ausgeben
  const maske = (x) => (x.toLowerCase() === u.email ? x : `${x[0]}•••@${x.split("@")[1]}`);
  return JSON.parse(JSON.stringify(daten).replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}/g, maske));
}

/**
 * Konto löschen (Art. 17 DSGVO): Passwort + Bestätigung „LÖSCHEN“. Das Konto wird anonymisiert und gesperrt,
 * Sitzungen, Geräte, 2FA, Token, Benachrichtigungen und Mitgliedschaften entfallen, Entwürfe werden gelöscht.
 * Unterlagen mit Aufbewahrungspflicht (Provisionen, NDA-/Einwilligungsnachweise, Vorgänge) bleiben – ohne
 * Zugang – bis zum Fristablauf erhalten; das Backoffice wird informiert.
 */
export async function kontoLoeschen(n, { passwort, bestaetigung } = {}) {
  if (!n) throw nichtAngemeldet();
  v.pflicht(["LÖSCHEN", "LOESCHEN"].includes(String(bestaetigung || "").trim().toUpperCase()), "Bitte bestätigen Sie mit dem Wort LÖSCHEN.");
  const db0 = await lesen();
  const u0 = nutzerById(db0, n.id);
  if (!(await passwortPruefen(String(passwort || ""), u0?.passwortHash))) throw ungueltig("Das Passwort stimmt nicht.");
  return aendern((db) => {
    sammlungen(db);
    const u = nutzerById(db, n.id);
    if (u.rollen.includes("admin") && db.nutzer.filter((x) => x.aktiv && x.rollen.includes("admin")).length <= 1) {
      throw konflikt("Das letzte Backoffice-Konto kann nicht gelöscht werden.");
    }
    const inhaberMitTeam = db.mitgliedschaften.filter((m) => m.nutzerId === u.id && m.rolle === "inhaber").filter((m) => db.mitgliedschaften.some((x) => x.organisationId === m.organisationId && x.nutzerId !== u.id));
    if (inhaberMitTeam.length) throw konflikt("Sie sind Inhaber einer Organisation mit weiteren Mitgliedern. Bitte übertragen Sie zuerst die Inhaberschaft.");
    // Organisationen, in denen das Konto allein ist, entfallen (Objekte werden wieder persönlich)
    for (const m of db.mitgliedschaften.filter((x) => x.nutzerId === u.id && x.rolle === "inhaber")) {
      for (const liste of [db.flaechen, db.projekte, db.interessen]) for (const o of liste) if (o.organisationId === m.organisationId) o.organisationId = null;
      db.organisationen = db.organisationen.filter((o) => o.id !== m.organisationId);
      db.einladungen = db.einladungen.filter((e) => e.organisationId !== m.organisationId);
    }
    db.mitgliedschaften = db.mitgliedschaften.filter((m) => m.nutzerId !== u.id && db.organisationen.some((o) => o.id === m.organisationId));
    const entwuerfeF = db.flaechen.filter((f) => f.nutzerId === u.id && f.status === "entwurf" && !f.organisationId).map((f) => f.id);
    const entwuerfeP = db.projekte.filter((p) => p.anbieterId === u.id && p.status === "entwurf" && !p.organisationId).map((p) => p.id);
    db.flaechen = db.flaechen.filter((f) => !entwuerfeF.includes(f.id));
    db.projekte = db.projekte.filter((p) => !entwuerfeP.includes(p.id));
    const alteEmail = u.email;
    db.einladungen = db.einladungen.filter((e) => e.email !== alteEmail);
    db.zweiFaktor = db.zweiFaktor.filter((z) => z.nutzerId !== u.id);
    db.sitzungen = db.sitzungen.filter((s) => s.nutzerId !== u.id);
    db.geraete = db.geraete.filter((g) => g.nutzerId !== u.id);
    db.anmeldungen = db.anmeldungen.filter((a) => a.nutzerId !== u.id);
    db.tokens = db.tokens.filter((t) => t.nutzerId !== u.id);
    db.benachrichtigungen = (db.benachrichtigungen || []).filter((b) => b.nutzerId !== u.id);
    delete db.anmeldeSperren[alteEmail];
    Object.assign(u, {
      email: `geloescht-${u.id.toLowerCase()}@geloescht.invalid`, vorname: "Gelöschtes", nachname: "Konto", firma: "", telefon: "", passwortHash: null,
      aktiv: false, emailBestaetigt: false, suchprofil: null, komfort: null, mailEinstellungen: null, sitzungVersion: (u.sitzungVersion || 0) + 1, geloeschtAm: jetzt(),
    });
    for (const a of db.nutzer.filter((x) => x.aktiv && x.rollen.includes("admin"))) {
      internSicherheit.benachrichtigen(db, a, { art: "status", titel: "Konto gelöscht", text: `Konto ${u.id} wurde auf eigenen Wunsch gelöscht (${entwuerfeF.length + entwuerfeP.length} Entwürfe entfernt). Offene Vorgänge bitte prüfen.`, link: "/portal/admin/nutzer", objektArt: "nutzer", objektId: u.id }, { mail: false });
    }
    internSicherheit.protokoll(db, { id: u.id }, "konto_geloescht", "nutzer", u.id, `Konto gelöscht (anonymisiert), ${entwuerfeF.length} Flächen- und ${entwuerfeP.length} Projekt-Entwürfe entfernt`);
    return { ok: true };
  });
}
