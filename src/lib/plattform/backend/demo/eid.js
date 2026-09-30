// src/lib/plattform/backend/demo/eid.js
//
// Staatliche eID (ID Austria, Online-Ausweis) im Demo-Backend – Referenz für plattform/api/eid.py (Vertrag: docs/EID.md).
// Daten unter db.eid (eigene Sammlung, beim ersten Zugriff angelegt).
//
// Ablauf: eidStarten → Weiterleitung zum Aussteller (Demo: /portal/eid/demo) → Rücksprung /api/dienste/eid/rueckkehr →
// eidAbschluss: state (nur als Hash gespeichert) + Konto + Browser-Bindung (Cookie, Hash) + Ablauf + Einmaligkeit →
// Code-Tausch (PKCE) → ID-Token-Prüfung → Minimaldaten → Nachweis am Vorgang + HINWEIS im KYC-Fall.
// Das Ergebnis ändert den KYC-Status NIE. Compliance-Regel „eID mit hohem Vertrauensniveau = Identität bestätigt“
// (einstellbar, Standard aus) setzt nur das Kennzeichen identitaetBestaetigt am Nachweis/Hinweis.
//
// Rechte: eigene Vorgänge (Person selbst); Einstellungen nur Compliance (lesen: Bereich compliance ≥ 1).

import { PlattformFehler, konflikt, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { stufe, unterrollen } from "../../rechte";
import { intern } from "../demo";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId } from "./hilfen";
import * as kycDemo from "./kyc";
import { kycFallFuer } from "./kycRegeln";
import { EID_METHODEN, EID_VORGANG_MINUTEN, autorisierungsUrl, codeTauschen, demoTokenAusstellen, eidKonfig, eidVerfuegbar, endpunkte, redirectUri, signaturSchluessel } from "../../dienste/eid/methoden";
import { LOA_LABEL, PRUEF_GRUND, eidAbgleich, gleich, idTokenPruefen, minimaldaten, pkceChallenge, pkcePaar, schluesselLaden, sha256Hex, zufall } from "../../dienste/eid/oidc";

const { protokoll, benachrichtigen, nutzerById, nameVon } = intern;

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const istCompliance = (n) => istAdmin(n) && unterrollen(n).includes("compliance") && stufe(n, "compliance") >= 2;
const complianceLesen = (n) => istAdmin(n) && stufe(n, "compliance") >= 1;
function angemeldet(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}

// ================================================================ Datenbestand

export const eidEinstellungenStandard = () => ({ hochBestaetigt: false });

async function lesenBereit() {
  const db = await lesen();
  if (db.eid?.v) return db;
  await aendern((d) => {
    if (!d.eid?.v) d.eid = { v: 1, vorgaenge: [], verbraucht: [], einstellungen: eidEinstellungenStandard() };
  });
  return lesen();
}
async function aendernBereit(fn) {
  await lesenBereit();
  return aendern(fn);
}
const E = (db) => db.eid;
const einstellungenDb = (db) => ({ ...eidEinstellungenStandard(), ...(db?.eid?.einstellungen || {}) });

function ausgabe(x) {
  return {
    id: x.id, methode: x.methode, methodeLabel: EID_METHODEN[x.methode]?.label || x.methode, demo: !!x.demo, status: x.status,
    erstelltAm: x.erstelltAm, abgeschlossenAm: x.abgeschlossenAm || null, grund: x.grund ? PRUEF_GRUND[x.grund] || x.grund : "",
    nachweis: x.nachweis ? { vorname: x.nachweis.vorname, nachname: x.nachweis.nachname, geburtsdatum: x.nachweis.geburtsdatum, vertrauensniveau: x.nachweis.vertrauensniveau, vertrauensniveauLabel: LOA_LABEL[x.nachweis.vertrauensniveau] || "unbekannt", am: x.nachweis.am, transaktionsId: x.nachweis.transaktionsId, identitaetBestaetigt: !!x.nachweis.identitaetBestaetigt, abgleich: x.nachweis.abgleich || null } : null,
    kycVerknuepft: !!x.kycEintragId,
  };
}

/**
 * Für andere Module (auf der Demo-DB, ohne Rechteprüfung): jüngster gültiger eID-Nachweis eines Kontos oder null.
 * { methode, vertrauensniveau, am, identitaetBestaetigt, vorname, nachname, geburtsdatum, transaktionsId, demo }
 */
export function eidNachweisDb(db, kontoId) {
  const x = (db?.eid?.vorgaenge || []).filter((y) => y.kontoId === kontoId && y.status === "bestanden" && y.nachweis).slice(-1)[0];
  return x ? { methode: x.methode, demo: !!x.demo, ...x.nachweis } : null;
}
export async function eidNachweis(kontoId) {
  return eidNachweisDb(await lesenBereit(), kontoId);
}

// ================================================================ Status / Start

export async function eidStatus(n) {
  angemeldet(n);
  const db = await lesenBereit();
  const eigene = E(db).vorgaenge.filter((x) => x.kontoId === n.id);
  const { bpkHash: _b, dublette: _d, ...nachweis } = eidNachweisDb(db, n.id) || {}; // Hash/Dublette nur intern
  return {
    methoden: eidVerfuegbar(),
    vorgaenge: eigene.slice(-5).reverse().map(ausgabe),
    nachweis: nachweis.methode ? nachweis : null,
    regel: { hochBestaetigt: !!einstellungenDb(db).hochBestaetigt },
  };
}

/** Anmeldung starten → { vorgang, url, bindung } – bindung setzt die Route als HttpOnly-Cookie (nie an den Browser-Body) */
export async function eidStarten(n, { methode, basisUrl = "" } = {}) {
  angemeldet(n);
  const m = v.auswahl(methode, Object.keys(EID_METHODEN), "");
  if (!m) throw ungueltig("Bitte wählen Sie ein eID-Verfahren.");
  let k = eidKonfig(m);
  if (!k?.aktiv) throw new PlattformFehler(503, `${EID_METHODEN[m].label} ist derzeit nicht verfügbar. Bitte wählen Sie ein anderes Verfahren.`);
  const vorher = await lesenBereit();
  const heute = jetzt().slice(0, 10);
  if (E(vorher).vorgaenge.filter((x) => x.kontoId === n.id && x.erstelltAm.slice(0, 10) === heute).length >= 10) throw new PlattformFehler(429, "Heute wurden bereits mehrere eID-Anmeldungen gestartet. Bitte versuchen Sie es morgen erneut.");
  k = await endpunkte(k).catch((e) => {
    throw new PlattformFehler(e.status || 502, e.message);
  });
  const state = zufall();
  const nonce = zufall();
  const bindung = zufall();
  const pkce = pkcePaar();
  const redirect = redirectUri(k, basisUrl);
  const id = neueId("EI");
  const url = autorisierungsUrl(k, { state, nonce, challenge: pkce.challenge, redirect });
  await aendernBereit((db) => {
    // offene ältere Vorgänge desselben Kontos verfallen (nur der jüngste Rücksprung ist gültig)
    for (const x of E(db).vorgaenge) if (x.kontoId === n.id && x.status === "ausstehend") Object.assign(x, { status: "abgebrochen", grund: "abgelaufen", verifier: null, demoDaten: null });
    E(db).vorgaenge.push({
      id, kontoId: n.id, methode: m, demo: k.demo, status: "ausstehend", stateHash: sha256Hex(state), nonceHash: sha256Hex(nonce), bindungHash: sha256Hex(bindung),
      verifier: pkce.verifier, redirect, erstelltAm: jetzt(), ablaufAm: new Date(Date.now() + EID_VORGANG_MINUTEN * 60000).toISOString(),
    });
    if (E(db).vorgaenge.length > 5000) E(db).vorgaenge.splice(0, 1000);
    protokoll(db, n, "eid_start", "ident", id, `eID-Anmeldung gestartet (${k.label}${k.demo ? ", DEMO" : ""})`);
  });
  return { vorgang: { id, methode: m, demo: k.demo }, url, bindung };
}

// ================================================================ Demo-Aussteller

/**
 * Simulator (nur Demo-Konfiguration): Nutzer wählt das Ergebnis, der Simulator stellt Code + signiertes ID-Token aus
 * (Claims wie der echte Dienst, nonce und PKCE-Challenge aus der Autorisierungs-URL) → { url } = Rücksprung.
 * auswahl: hoch | substanziell | abweichend (andere Person) | abbrechen
 */
export async function eidDemoCode(n, { state, nonce, codeChallenge, auswahl } = {}) {
  angemeldet(n);
  const a = v.auswahl(auswahl, ["hoch", "substanziell", "abweichend", "abbrechen"], "");
  if (!a) throw ungueltig("Bitte ein Ergebnis wählen.");
  const st = String(state || "").slice(0, 200);
  return aendernBereit((db) => {
    const x = E(db).vorgaenge.find((y) => y.stateHash === sha256Hex(st));
    if (!x || x.kontoId !== n.id || !x.demo) throw verboten("Diese Demo-Anmeldung gehört nicht zu Ihrem Konto.");
    if (x.status !== "ausstehend") throw konflikt("Diese Anmeldung ist bereits abgeschlossen.");
    const k = eidKonfig(x.methode);
    if (!k?.demo) throw verboten("Nur im Demo-Betrieb verfügbar.");
    const ziel = new URL(x.redirect, "http://x");
    ziel.searchParams.set("state", st);
    if (a === "abbrechen") {
      ziel.searchParams.set("error", "access_denied");
      return { url: `${ziel.pathname}${ziel.search}` };
    }
    const f = kycFallFuer(db, { kontoId: n.id });
    const u = nutzerById(db, n.id);
    const person = a === "abweichend" ? { vorname: "Erika", nachname: "Mustermann", geburtsdatum: "1964-08-12" } : { vorname: f?.person?.vorname || u?.vorname || n.vorname || "Demo", nachname: f?.person?.nachname || u?.nachname || n.nachname || "Person", geburtsdatum: f?.person?.geburtsdatum || "1980-01-01" };
    const t = Math.floor(Date.now() / 1000);
    const claims = {
      iss: k.issuer, aud: k.clientId, sub: zufall(12), iat: t, exp: t + 300, nonce: String(nonce || "").slice(0, 200), jti: `DEMO-${zufall(9)}`,
      given_name: person.vorname, family_name: person.nachname, birthdate: person.geburtsdatum,
    };
    if (x.methode === "id_austria") {
      claims["urn:pvpgvat:oidc.bpk"] = `XFN+DEMO:${sha256Hex(`demo-bpk:${a === "abweichend" ? "fremd" : n.id}`).slice(0, 28)}=`;
      claims["urn:pvpgvat:oidc.eid_citizen_qaa_eidas_level"] = `http://eidas.europa.eu/LoA/${a === "substanziell" ? "substantial" : "high"}`;
      claims["urn:pvpgvat:oidc.eid_issuing_nation"] = "AT";
    } else {
      claims.restricted_id = sha256Hex(`demo-rid:${a === "abweichend" ? "fremd" : n.id}`).slice(0, 40);
      claims.acr = `http://eidas.europa.eu/LoA/${a === "substanziell" ? "substantial" : "high"}`;
      claims.IssuingState = "D";
    }
    const { idToken, jwk } = demoTokenAusstellen(k, claims);
    const code = zufall();
    x.demoDaten = { codeHash: sha256Hex(code), challenge: String(codeChallenge || "").slice(0, 128), idToken, jwk };
    ziel.searchParams.set("code", code);
    return { url: `${ziel.pathname}${ziel.search}` };
  });
}

/** Token-Endpunkt des Simulators: Code und PKCE wie beim echten Dienst prüfen, ID-Token genau einmal herausgeben */
function demoTausch(x, code) {
  const d = x.demoDaten;
  if (!d || !gleich(sha256Hex(code), d.codeHash)) throw Object.assign(new Error(PRUEF_GRUND.code), { code: "code" });
  if (!gleich(pkceChallenge(x.verifier), d.challenge)) throw Object.assign(new Error(PRUEF_GRUND.pkce), { code: "pkce" });
  return { idToken: d.idToken, schluessel: schluesselLaden({ keys: [d.jwk] }) };
}

// ================================================================ Rücksprung / Abschluss

const KYC_QUELLE = (x) => `eID ${EID_METHODEN[x.methode]?.label || x.methode}${x.demo ? " (DEMO)" : ""}`;

/**
 * Rücksprung verarbeiten (Route /api/dienste/eid/rueckkehr, angemeldeter Nutzer).
 * { state, code, fehler, bindung } → { ok, vorgang }. Wirft 400/403/409 bei fremdem, doppeltem oder abgelaufenem Rücksprung.
 */
export async function eidAbschluss(n, { state, code, fehler, bindung } = {}) {
  angemeldet(n);
  const st = String(state || "").slice(0, 200);
  if (!st) throw ungueltig("Ungültiger Rücksprung.");
  // 1) Vorgang atomar „verbrauchen“ (Einmaligkeit) – Prüfungen: Konto, Browser-Bindung, Ablauf
  const x0 = await aendernBereit((db) => {
    const x = E(db).vorgaenge.find((y) => y.stateHash === sha256Hex(st));
    if (!x || x.kontoId !== n.id) throw new PlattformFehler(400, "Diese Anmeldung ist unbekannt oder gehört nicht zu Ihrem Konto.", "eid_state");
    if (x.status !== "ausstehend") throw konflikt("Diese Anmeldung wurde bereits verarbeitet.");
    const schluss = (grund, status = "fehler") => {
      Object.assign(x, { status, grund, abgeschlossenAm: jetzt(), verifier: null, demoDaten: null });
      protokoll(db, n, "eid_ergebnis", "ident", x.id, `eID-Anmeldung ${status}: ${PRUEF_GRUND[grund] || grund}`);
      return { ...x, abbruch: true };
    };
    if (!bindung || !gleich(sha256Hex(bindung), x.bindungHash)) return schluss("bindung");
    if (Date.parse(x.ablaufAm) < Date.now()) return schluss("abgelaufen", "abgebrochen");
    if (fehler) return schluss("abbruch", "abgebrochen");
    if (!code) return schluss("code");
    const kopie = { ...x, demoDaten: x.demoDaten ? { ...x.demoDaten } : null };
    Object.assign(x, { status: "in_pruefung", verifier: null, demoDaten: null });
    return kopie;
  });
  if (x0.abbruch) return { ok: false, vorgang: ausgabe(x0) };

  // 2) Code tauschen + ID-Token prüfen (außerhalb der Schreibsperre)
  let pruefung;
  let tokenHash = "";
  let k = eidKonfig(x0.methode);
  try {
    let idToken;
    let schluessel;
    if (x0.demo) {
      if (!k?.demo) throw Object.assign(new Error("Konfiguration geändert"), { code: "token" });
      ({ idToken, schluessel } = demoTausch(x0, String(code)));
    } else {
      if (!k?.aktiv || k.demo) throw Object.assign(new Error("Konfiguration geändert"), { code: "token" });
      k = await endpunkte(k);
      idToken = await codeTauschen(k, { code: String(code).slice(0, 2000), verifier: x0.verifier, redirect: x0.redirect });
      schluessel = await signaturSchluessel(k);
    }
    tokenHash = sha256Hex(idToken);
    const opt = { issuer: k.issuer, clientId: k.clientId, nonceHash: x0.nonceHash, schluessel, algs: k.algs, loaClaims: k.loaClaims, loaMin: k.loaMin, loaStandard: k.loaStandard };
    pruefung = idTokenPruefen(idToken, opt);
    if (!pruefung.ok && pruefung.grund === "schluessel" && !x0.demo && !k.jwksFest) pruefung = idTokenPruefen(idToken, { ...opt, schluessel: await signaturSchluessel(k, { neu: true }) }); // Schlüsselwechsel
  } catch (e) {
    pruefung = { ok: false, grund: e?.code && PRUEF_GRUND[e.code] ? e.code : "token" };
  }
  const daten = pruefung.claims && pruefung.ok ? minimaldaten(pruefung.claims, k.claims, { pfeffer: k.pfeffer, tokenHash }) : null;

  // 3) Ergebnis festschreiben (Replay-Schutz über Token-Hash, Dubletten-Hinweis über bPK-Hash)
  const r = await aendernBereit((db) => {
    const x = E(db).vorgaenge.find((y) => y.id === x0.id);
    if (!x || x.status !== "in_pruefung") throw konflikt("Diese Anmeldung wurde bereits verarbeitet.");
    x.abgeschlossenAm = jetzt();
    if (pruefung.ok && tokenHash && E(db).verbraucht.includes(tokenHash)) pruefung = { ok: false, grund: "replay" };
    if (tokenHash) {
      E(db).verbraucht.push(tokenHash);
      if (E(db).verbraucht.length > 5000) E(db).verbraucht.splice(0, 1000);
    }
    if (!pruefung.ok) {
      Object.assign(x, { status: pruefung.grund === "loa" ? "abgelehnt" : "fehler", grund: pruefung.grund });
      protokoll(db, n, "eid_ergebnis", "ident", x.id, `eID-Anmeldung ${x.status}: ${PRUEF_GRUND[pruefung.grund] || pruefung.grund}`);
      return { x: { ...x }, pruefung };
    }
    const f = kycFallFuer(db, { kontoId: n.id });
    const u = nutzerById(db, n.id);
    const soll = { vorname: f?.person?.vorname || u?.vorname || "", nachname: f?.person?.nachname || u?.nachname || "", geburtsdatum: f?.person?.geburtsdatum || "" };
    const abgleich = eidAbgleich(daten, soll);
    const dublette = daten.bpkHash ? E(db).vorgaenge.find((y) => y.kontoId !== n.id && y.nachweis?.bpkHash === daten.bpkHash) : null;
    const regel = !!einstellungenDb(db).hochBestaetigt;
    const identitaetBestaetigt = regel && pruefung.loa === "hoch" && abgleich.name !== false && abgleich.geburtsdatum !== false && !dublette;
    x.status = "bestanden";
    x.grund = "";
    x.nachweis = { ...daten, vertrauensniveau: pruefung.loa, am: x.abgeschlossenAm, abgleich, dublette: dublette ? dublette.kontoId : null, identitaetBestaetigt };
    protokoll(db, n, "eid_ergebnis", "ident", x.id, `eID-Nachweis ${KYC_QUELLE(x)}: Vertrauensniveau ${LOA_LABEL[pruefung.loa]}${identitaetBestaetigt ? ", Identität bestätigt (Regel)" : ""}`);
    if (u) benachrichtigen(db, u, { art: "status", titel: "eID-Anmeldung abgeschlossen", text: "Ihr eID-Nachweis liegt vor. Die abschließende Prüfung Ihrer Verifizierung erfolgt durch die Compliance.", link: "/portal/verifizierung", objektArt: "kyc", objektId: x.id }, { mail: false });
    return { x: { ...x }, pruefung, abgleich, dublette: dublette ? nameVon(db, dublette.kontoId) : null, identitaetBestaetigt, regel };
  });

  // 4) Hinweis im KYC-Fall (eigene Transaktion des KYC-Teams; ändert den Status nie)
  const x = r.x;
  const nw = x.nachweis;
  const auffaellig = nw && (r.abgleich?.name === false || r.abgleich?.geburtsdatum === false || !!r.dublette);
  const eintrag = await kycAnhaengen(n.id, {
    quelle: KYC_QUELLE(x), art: "eid",
    ergebnis: !r.pruefung.ok ? (["loa", "abbruch", "abgelaufen"].includes(r.pruefung.grund) ? "hinweis" : "fehler") : auffaellig ? "auffaellig" : "ok",
    zusammenfassung: r.pruefung.ok
      ? [`Vertrauensniveau ${LOA_LABEL[nw.vertrauensniveau]}`, `${nw.vorname} ${nw.nachname}, geb. ${nw.geburtsdatum || "–"}`, r.abgleich?.name === false ? "Name weicht von den Angaben ab" : "", r.abgleich?.geburtsdatum === false ? "Geburtsdatum weicht ab" : "", r.dublette ? "Gleiche Person bereits mit anderem Konto nachgewiesen" : "", r.identitaetBestaetigt ? "Identität bestätigt (Compliance-Regel „eID hoch“)" : "", x.demo ? "DEMO – keine echte Identifizierung" : ""].filter(Boolean).join(" · ")
      : `eID-Anmeldung nicht verwertbar: ${PRUEF_GRUND[r.pruefung.grund] || r.pruefung.grund}${x.demo ? " (DEMO)" : ""}`,
    externeId: nw?.transaktionsId || x.id, rohdatenRef: `eID-Vorgang ${x.id}`,
    daten: nw ? { vorgang: x.id, methode: x.methode, vertrauensniveau: nw.vertrauensniveau, zeitpunkt: nw.am, transaktionsId: nw.transaktionsId, nameStimmt: nw.abgleich?.name ?? "", geburtsdatumStimmt: nw.abgleich?.geburtsdatum ?? "", dublette: !!nw.dublette, identitaetBestaetigt: !!nw.identitaetBestaetigt, regelHochBestaetigt: !!r.regel, demo: !!x.demo } : { vorgang: x.id, methode: x.methode, grund: r.pruefung.grund, demo: !!x.demo },
  });
  if (eintrag?.id) {
    await aendern((db) => {
      const y = db.eid?.vorgaenge?.find((z) => z.id === x.id);
      if (y) y.kycEintragId = eintrag.id;
    });
    x.kycEintragId = eintrag.id;
  }
  return { ok: r.pruefung.ok, vorgang: ausgabe(x) };
}

async function kycAnhaengen(kontoId, eintrag) {
  try {
    return await kycDemo.kycErgebnisAnhaengen({ kontoId }, eintrag);
  } catch (e) {
    if (e?.status !== 404) console.warn("[plattform-eid] KYC-Hinweis nicht angehängt:", e?.message);
    return null;
  }
}

// ================================================================ Compliance-Einstellungen

export async function eidEinstellungen(n) {
  angemeldet(n);
  if (!complianceLesen(n)) throw verboten("Nur für die Compliance.");
  const db = await lesenBereit();
  return { einstellungen: einstellungenDb(db), methoden: Object.keys(EID_METHODEN).map((id) => { const k = eidKonfig(id); return { id, label: EID_METHODEN[id].label, aktiv: !!k?.aktiv, demo: !!k?.demo, loaMin: k?.loaMin || "hoch" }; }) };
}

export async function eidEinstellungenSpeichern(n, daten = {}) {
  angemeldet(n);
  if (!istCompliance(n)) throw verboten(istAdmin(n) ? "Nur für die Compliance (Backoffice-Rolle „Compliance“)." : "Dafür fehlt Ihnen die Berechtigung.");
  return aendernBereit((db) => {
    const e = einstellungenDb(db);
    if ("hochBestaetigt" in daten) e.hochBestaetigt = v.wahr(daten.hochBestaetigt);
    db.eid.einstellungen = e;
    protokoll(db, n, "eid_einstellungen", "kyc", "eid", `eID-Regel „hohes Vertrauensniveau = Identität bestätigt“ ${e.hochBestaetigt ? "aktiviert" : "deaktiviert"}`);
    return { ok: true, einstellungen: e };
  });
}
