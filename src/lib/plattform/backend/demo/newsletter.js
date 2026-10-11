// src/lib/plattform/backend/demo/newsletter.js
//
// Demo-Backend „Newsletter je Land“ (Welle 3, Paket NL) – JSON-Datei .data/plattform.json. Jede Operation ist EIN
// Schreibvorgang (aendern): Abo, Personenzeile, Einwilligungsprotokoll und Postausgang ändern sich gemeinsam.
//
//   db.newsletterAbos  { id, tokenHash, pseudonym, personId, land, sprache, themen, quelle, kanal, status, erstelltAm,
//                        ablauf, bestaetigtAm, vorgemerkt? } – OHNE Klartext-Token und OHNE E-Mail.
//                      Grabsteine (abgemeldet | ersetzt | abgelaufen): nur { id, tokenHash, status, am, sprache? }, bei
//                      „ersetzt“ zusätzlich das Pseudonym (alter Abmeldelink beendet das aktuelle Abo).
//   db.leadPersonen    E-Mail getrennt (Paket B3-Struktur), zweck "newsletter_ausstehend" bis zur Bestätigung, danach
//                      "newsletter". Art. 17 (leadkette.personLoeschen) erfasst die Zeile über das Pseudonym mit.
//   db.leadKette       Protokoll (src/lib/anfrage/protokoll.js): "einwilligung" bei der Anmeldung, "doi" bei der
//                      Bestätigung, "widerruf" bei der Abmeldung (kanal "abmeldelink"). Nie Personendaten.
//   db.postausgang     Bestätigungs- und Willkommens-Mail (Demo: es geht nichts raus).
//
// Eine Adresse hat höchstens EIN aktives Abo (ein Land): Eine neue, bestätigte Anmeldung ersetzt das alte Abo. Die
// Abmeldung beendet alle Abos dieser Adresse – die Kanal-Ampel „newsletter“ gilt je Adresse, nicht je Land.
// Liegt schon eine gültige Einwilligung vor, wird die neue Einwilligung erst bei der Bestätigung protokolliert
// („vorgemerkt“, mit dem Zeitpunkt der Anmeldung) – so kann eine fremde Anmeldung ein bestehendes Abo nicht sperren.

import { aendern, lesen } from "./speicher";
import { PlattformFehler } from "../../fehler";
import { jetzt, neueId } from "./hilfen";
import { anhaengen, kanalAmpel, pseudonym as pseudonymBerechnen } from "@/lib/anfrage/protokoll";
import { GRABSTEIN_TAGE, aboZustand } from "@/lib/newsletter/zustand";

const MAIL_HINWEIS = "Demo-Postausgang: Diese E-Mail wurde nicht versendet.";
const HEX64 = /^[0-9a-f]{64}$/;

function sicher(db) {
  db.newsletterAbos = Array.isArray(db.newsletterAbos) ? db.newsletterAbos : [];
  db.leadPersonen = Array.isArray(db.leadPersonen) ? db.leadPersonen : [];
  db.leadKette = Array.isArray(db.leadKette) ? db.leadKette : [];
  db.postausgang = Array.isArray(db.postausgang) ? db.postausgang : [];
}

const finde = (db, tokenHash) => (HEX64.test(tokenHash || "") ? db.newsletterAbos.find((a) => a.tokenHash === tokenHash) || null : null);
const personWeg = (db, id) => {
  if (id) db.leadPersonen = db.leadPersonen.filter((p) => !(p.id === id && String(p.zweck || "").startsWith("newsletter")));
};
// Grabstein: ohne Personendaten. Es bleiben die Sprache (Hinweisseite in der Sprache des Abos) und bei „ersetzt“ das
// Pseudonym – so beendet auch der Abmeldelink einer ÄLTEREN Mail (RFC 8058 aus dem Mailprogramm) das aktuelle Abo.
const grabstein = (a, status, am) => {
  const behalten = status === "ersetzt" ? ["id", "tokenHash", "sprache", "pseudonym"] : ["id", "tokenHash", "sprache"];
  for (const k of Object.keys(a)) if (!behalten.includes(k)) delete a[k];
  if (a.sprache !== "en") delete a.sprache;
  a.status = status;
  a.am = am;
};
const post = (db, eintrag) => {
  db.postausgang.unshift({ id: neueId("E"), am: jetzt(), anName: "", nutzerId: null, hinweis: MAIL_HINWEIS, ...eintrag });
  if (db.postausgang.length > 500) db.postausgang.length = 500;
};

/** Abgelaufene Anmeldungen zu Grabsteinen, alte Grabsteine löschen. Liefert die Zahl der Änderungen. */
export function aufraeumenDb(db, jetztMs = Date.now()) {
  sicher(db);
  let n = 0;
  for (const a of db.newsletterAbos) {
    if (a.status !== "offen" || aboZustand(a, jetztMs) !== "abgelaufen") continue;
    personWeg(db, a.personId);
    grabstein(a, "abgelaufen", new Date(jetztMs).toISOString());
    n++;
  }
  const vorher = db.newsletterAbos.length;
  db.newsletterAbos = db.newsletterAbos.filter((a) => !(a.am && Date.parse(a.am) + GRABSTEIN_TAGE * 864e5 < jetztMs));
  return n + (vorher - db.newsletterAbos.length);
}

/**
 * Anmeldung speichern (Token nur als Hash) + Personenzeile + Protokoll „einwilligung“ + Bestätigungs-Mail.
 * daten: { tokenHash, email, land, sprache, themen, quelle, kanal, ablauf, protokoll: { textId, textVersion, textHash }, mail }
 */
export async function newsletterAnlegen(daten = {}) {
  const { tokenHash, email, protokoll = {}, mail = {} } = daten;
  if (!HEX64.test(tokenHash || "")) throw new Error("tokenHash fehlt");
  return aendern((db) => {
    sicher(db);
    aufraeumenDb(db);
    const am = jetzt();
    const ps = pseudonymBerechnen(email);
    // Offene (unbestätigte) Anmeldungen derselben Adresse ersetzt die neue Anmeldung
    for (const alt of db.newsletterAbos.filter((a) => a.pseudonym === ps && a.status === "offen")) {
      personWeg(db, alt.personId);
      grabstein(alt, "ersetzt", am);
    }
    const eintrag = { art: "einwilligung", zweck: "newsletter", textId: protokoll.textId, textVersion: protokoll.textVersion, textHash: protokoll.textHash, kanal: "web_formular", land: daten.land, zeit: am };
    const schonErteilt = kanalAmpel(db.leadKette, ps, "newsletter").stand === "erteilt";
    if (!schonErteilt) anhaengen(db.leadKette, { pseudonym: ps, ...eintrag });
    const person = { id: neueId("LP"), pseudonym: ps, vorgangId: null, zweck: "newsletter_ausstehend", vorname: "", nachname: "", firma: "", email, telefon: "", ipGekuerzt: "", ipLoeschenAb: null, land: daten.land, erstelltAm: am };
    db.leadPersonen.push(person);
    const abo = {
      id: neueId("NL"),
      tokenHash,
      pseudonym: ps,
      personId: person.id,
      land: daten.land,
      sprache: daten.sprache === "en" ? "en" : "de",
      themen: Array.isArray(daten.themen) ? daten.themen : [],
      quelle: daten.quelle || "",
      kanal: daten.kanal || "",
      status: "offen",
      erstelltAm: am,
      ablauf: daten.ablauf,
      bestaetigtAm: null,
      ...(schonErteilt ? { vorgemerkt: eintrag } : {}),
    };
    db.newsletterAbos.push(abo);
    post(db, { an: email, art: "newsletter_doi", betreff: mail.betreff, text: mail.text, link: mail.link, linkText: mail.linkText || "Bestätigen" });
    return { id: abo.id };
  });
}

/**
 * Bestätigen (atomar): Protokoll „doi“, ältere Abos derselben Adresse ersetzen, Willkommens-Mail.
 * doi: { textId, textVersion, textHash } oder (sprache) → dieses Objekt · willkommen: ({ land, sprache, themen }) → Mail (mit Abmeldelink)
 * → { zustand: "aktiv", bereits } | { zustand: "abgelaufen" | "abgemeldet" | "ersetzt" } | { zustand: null }
 */
export async function newsletterBestaetigen({ tokenHash, jetztMs = Date.now(), doi = {}, willkommen } = {}) {
  return aendern((db) => {
    sicher(db);
    aufraeumenDb(db, jetztMs);
    const a = finde(db, tokenHash);
    if (!a) return { zustand: null };
    const z = aboZustand(a, jetztMs);
    if (z === "aktiv") return { zustand: "aktiv", bereits: true };
    if (z !== "offen") return { zustand: z };
    const p = db.leadPersonen.find((x) => x.id === a.personId);
    if (!p) {
      grabstein(a, "abgelaufen", new Date(jetztMs).toISOString()); // Personenzeile gelöscht (z. B. Art. 17)
      return { zustand: "abgelaufen" };
    }
    const am = new Date(jetztMs).toISOString();
    if (a.vorgemerkt) anhaengen(db.leadKette, { pseudonym: a.pseudonym, ...a.vorgemerkt });
    const w = typeof doi === "function" ? doi(a.sprache) : doi;
    anhaengen(db.leadKette, { pseudonym: a.pseudonym, art: "doi", zweck: "newsletter", textId: w.textId, textVersion: w.textVersion, textHash: w.textHash, kanal: "doi_link", land: a.land, zeit: am });
    for (const alt of db.newsletterAbos.filter((x) => x !== a && x.pseudonym === a.pseudonym && ["aktiv", "offen"].includes(x.status))) {
      personWeg(db, alt.personId);
      grabstein(alt, "ersetzt", am);
    }
    p.zweck = "newsletter";
    a.status = "aktiv";
    a.bestaetigtAm = am;
    delete a.vorgemerkt;
    if (typeof willkommen === "function") {
      const m = willkommen({ land: a.land, sprache: a.sprache, themen: a.themen });
      post(db, { an: p.email, art: "newsletter_willkommen", betreff: m.betreff, text: m.text, link: m.link, linkText: m.linkText, kopfzeilen: m.kopfzeilen });
    }
    return { zustand: "aktiv", bereits: false };
  });
}

/**
 * Abmelden mit einem Klick: beendet ALLE Abos der Adresse, Protokoll „widerruf“, Personenzeilen löschen.
 * → { zustand: "abgemeldet", bereits } | { zustand: null }
 */
export async function newsletterAbmelden({ tokenHash, kanal = "abmeldelink", textId = "newsletter_abmeldung", textVersion, jetztMs = Date.now() } = {}) {
  return aendern((db) => {
    sicher(db);
    aufraeumenDb(db, jetztMs);
    const a = finde(db, tokenHash);
    if (!a) return { zustand: null };
    const z = aboZustand(a, jetztMs);
    const ps = a.pseudonym;
    // Ersetztes Abo: der alte Abmeldelink wirkt weiter für die Adresse (sonst liefe die Ein-Klick-Abmeldung ins Leere)
    const nochOffen = z === "ersetzt" && ps && db.newsletterAbos.some((x) => x.pseudonym === ps && ["aktiv", "offen"].includes(x.status));
    if ((z === "abgemeldet" || z === "ersetzt" || z === "abgelaufen") && !nochOffen) return { zustand: "abgemeldet", bereits: true };
    const am = new Date(jetztMs).toISOString();
    const land = db.newsletterAbos.find((x) => x.pseudonym === ps && x.status === "aktiv")?.land || a.land;
    const stand = kanalAmpel(db.leadKette, ps, "newsletter").stand;
    if (stand === "erteilt" || stand === "doi_ausstehend") {
      anhaengen(db.leadKette, { pseudonym: ps, art: "widerruf", zweck: "newsletter", textId, textVersion, textHash: "", kanal, land, zeit: am });
    }
    for (const x of db.newsletterAbos.filter((x) => x.pseudonym === ps && ["aktiv", "offen"].includes(x.status))) {
      personWeg(db, x.personId);
      grabstein(x, "abgemeldet", am);
    }
    return { zustand: "abgemeldet", bereits: false };
  });
}

/** Abo lesen – ohne Personendaten. → { zustand, abo? } */
export async function newsletterLesen({ tokenHash, jetztMs = Date.now() } = {}) {
  const db = await lesen();
  const a = (Array.isArray(db.newsletterAbos) ? db.newsletterAbos : []).find((x) => HEX64.test(tokenHash || "") && x.tokenHash === tokenHash);
  if (!a) return { zustand: null };
  const zustand = aboZustand(a, jetztMs);
  if (zustand !== "offen" && zustand !== "aktiv") return a.sprache === "en" ? { zustand, sprache: "en" } : { zustand };
  return { zustand, abo: { land: a.land, sprache: a.sprache, themen: a.themen, bestaetigtAm: a.bestaetigtAm } };
}

/**
 * Empfänger einer Ausgabe (für einen späteren Versand; NUR serverseitig): aktive Abos des Landes mit dem Thema,
 * deren Kanal-Ampel „newsletter“ grün ist. → [{ aboId, email, sprache }]
 */
export async function newsletterEmpfaenger({ land, thema } = {}) {
  const db = await lesen();
  const abos = Array.isArray(db.newsletterAbos) ? db.newsletterAbos : [];
  const personen = Array.isArray(db.leadPersonen) ? db.leadPersonen : [];
  const kette = Array.isArray(db.leadKette) ? db.leadKette : [];
  return abos
    .filter((a) => a.status === "aktiv" && a.land === land && (a.themen || []).includes(thema) && kanalAmpel(kette, a.pseudonym, "newsletter").erlaubt)
    .map((a) => ({ a, p: personen.find((p) => p.id === a.personId && p.zweck === "newsletter") }))
    .filter(({ p }) => p?.email)
    .map(({ a, p }) => ({ aboId: a.id, email: p.email, sprache: a.sprache }));
}

/** Aufräumen (Tests, später Zeitplan) */
export async function newsletterAufraeumen({ jetztMs = Date.now() } = {}) {
  return aendern((db) => ({ geaendert: aufraeumenDb(db, jetztMs) }));
}

// ── Backoffice (Plattform-Armee, Paket MARKETING) ────────────────────────────────────────────────────────────
// Rechte prüft die Route (/api/admin/newsletter, Bereich „crm“) bzw. die Seite /portal/admin/newsletter.

const MAX_ABOS = 500;
const MAX_GRABSTEINE = 100;

const einwilligungenVon = (kette, ps) =>
  kette
    .filter((e) => e.pseudonym === ps && e.zweck === "newsletter")
    .map((e) => ({ art: e.art, kanal: e.kanal, textId: e.textId || "", textVersion: e.textVersion || "", land: e.land || "", zeit: e.zeit }));

/**
 * Übersicht für das Backoffice: Kennzahlen, aktive Abos je Land/Thema, Empfängerliste (aktiv + offen, mit E-Mail
 * und Einwilligungsverlauf), Abmeldungen/Grabsteine (ohne Personendaten). NUR Demo, nur serverseitig.
 */
export async function newsletterUebersicht({ jetztMs = Date.now() } = {}) {
  const db = await lesen();
  const alle = Array.isArray(db.newsletterAbos) ? db.newsletterAbos : [];
  const personen = Array.isArray(db.leadPersonen) ? db.leadPersonen : [];
  const kette = Array.isArray(db.leadKette) ? db.leadKette : [];
  const tag30 = jetztMs - 30 * 864e5;

  const lebend = alle.map((a) => ({ a, zustand: aboZustand(a, jetztMs) })).filter(({ zustand }) => zustand === "aktiv" || zustand === "offen");
  const grabsteine = alle.filter((a) => a.am).map((a) => ({ id: a.id, status: a.status, am: a.am }));

  const matrix = {}; // { land: { thema: anzahl } } – nur bestätigte Abos
  for (const { a, zustand } of lebend) {
    if (zustand !== "aktiv") continue;
    matrix[a.land] = matrix[a.land] || {};
    for (const t of a.themen || []) matrix[a.land][t] = (matrix[a.land][t] || 0) + 1;
  }

  const abos = lebend
    .sort((x, y) => String(y.a.erstelltAm).localeCompare(String(x.a.erstelltAm)))
    .slice(0, MAX_ABOS)
    .map(({ a, zustand }) => {
      const p = personen.find((x) => x.id === a.personId);
      return {
        id: a.id,
        zustand,
        land: a.land,
        sprache: a.sprache,
        themen: a.themen || [],
        quelle: a.quelle || "",
        kanal: a.kanal || "",
        erstelltAm: a.erstelltAm,
        bestaetigtAm: a.bestaetigtAm,
        email: p?.email || "",
        ampel: kanalAmpel(kette, a.pseudonym, "newsletter").stand,
        einwilligungen: einwilligungenVon(kette, a.pseudonym),
      };
    });

  return {
    kennzahlen: {
      aktiv: lebend.filter((x) => x.zustand === "aktiv").length,
      offen: lebend.filter((x) => x.zustand === "offen").length,
      abmeldungen30: grabsteine.filter((g) => g.status === "abgemeldet" && Date.parse(g.am) >= tag30).length,
      abgelaufen30: grabsteine.filter((g) => g.status === "abgelaufen" && Date.parse(g.am) >= tag30).length,
    },
    matrix,
    abos,
    abmeldungen: grabsteine.sort((x, y) => String(y.am).localeCompare(String(x.am))).slice(0, MAX_GRABSTEINE),
  };
}

/** Datenexport eines Empfängers (Art. 15/20): Abo, E-Mail und Einwilligungsverlauf. 404, wenn unbekannt oder schon Grabstein. */
export async function newsletterExport({ aboId, jetztMs = Date.now() } = {}) {
  const db = await lesen();
  const abos = Array.isArray(db.newsletterAbos) ? db.newsletterAbos : [];
  const a = abos.find((x) => x.id === aboId);
  const zustand = aboZustand(a, jetztMs);
  if (!a || (zustand !== "aktiv" && zustand !== "offen")) {
    throw new PlattformFehler(404, "Zu dieser Abo-Nummer gibt es keine gespeicherten Empfängerdaten (mehr).", "nicht_gefunden");
  }
  const p = (Array.isArray(db.leadPersonen) ? db.leadPersonen : []).find((x) => x.id === a.personId);
  return {
    exportiertAm: new Date(jetztMs).toISOString(),
    abo: { id: a.id, zustand, land: a.land, sprache: a.sprache, themen: a.themen || [], quelle: a.quelle || "", kanal: a.kanal || "", erstelltAm: a.erstelltAm, bestaetigtAm: a.bestaetigtAm },
    email: p?.email || null,
    einwilligungen: einwilligungenVon(Array.isArray(db.leadKette) ? db.leadKette : [], a.pseudonym),
  };
}

/**
 * Löschung eines Empfängers aus dem Backoffice (Art. 17): Protokoll „widerruf“ (Kanal art17_loeschung),
 * Personenzeilen löschen, alle Abos der Adresse zu Grabsteinen. → { geloescht: true, bereits }
 */
export async function newsletterLoeschen({ aboId, jetztMs = Date.now() } = {}) {
  return aendern((db) => {
    sicher(db);
    aufraeumenDb(db, jetztMs);
    const a = db.newsletterAbos.find((x) => x.id === aboId);
    if (!a) throw new PlattformFehler(404, "Unbekannte Abo-Nummer.", "nicht_gefunden");
    const z = aboZustand(a, jetztMs);
    if (z !== "aktiv" && z !== "offen") return { geloescht: true, bereits: true };
    const ps = a.pseudonym;
    const am = new Date(jetztMs).toISOString();
    const stand = kanalAmpel(db.leadKette, ps, "newsletter").stand;
    if (stand === "erteilt" || stand === "doi_ausstehend") {
      anhaengen(db.leadKette, { pseudonym: ps, art: "widerruf", zweck: "newsletter", textId: "newsletter_art17", textVersion: "BACKOFFICE-1", textHash: "", kanal: "art17_loeschung", land: a.land, zeit: am });
    }
    for (const x of db.newsletterAbos.filter((x) => x.pseudonym === ps && ["aktiv", "offen"].includes(x.status))) {
      personWeg(db, x.personId);
      grabstein(x, "abgemeldet", am);
    }
    return { geloescht: true, bereits: false };
  });
}
