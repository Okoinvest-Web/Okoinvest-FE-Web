// src/lib/plattform/backend/demo/service-signatur.js
//
// Elektronische Unterschrift (EES) im Demo-Backend – Referenz für plattform/api/signatur.py (docs/API.md, Abschnitt „Dokumente, Signatur, Termine, Service & HR“).
//
// Rechte (jede Operation prüft selbst):
//   Backoffice mit Bereich „signatur“: lesen ≥ 1 sieht alle Vorgänge und das volle Protokoll; schreiben = 2 legt an,
//     erinnert, widerruft (Unterrollen leitung, akquise, transaktion).
//   Ersteller (Backoffice-Konto) sieht und widerruft seine Vorgänge.
//   Unterzeichner (Portal-Konto) sieht nur Vorgänge, in denen er Unterzeichner ist; unterschreibt nur, wenn er an der
//     Reihe ist (Reihenfolge), mit Bestätigungscode per E-Mail. Andere Konten → 403 (Seiten 404).
// Integrität: SHA-256 der Originaldatei bei Anlage; vor jeder Unterschrift erneut geprüft (Abweichung → 409, Protokoll).
// Abschluss: signiertes PDF = Original + Prüfseite (inkrementelles Update), SHA-256 der Gesamtdatei im Protokoll.

import { randomInt, timingSafeEqual } from "node:crypto";
import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { BEZUG_ARTEN, NDA, UPLOAD } from "../../konstanten";
import { BOERSE_STATUS } from "../../prozesse";
import { PROVISION } from "@/lib/invest/markt";
import {
  SIGNATUR_ARTEN, SIGNATUR_ART_IDS, SIGNATUR_GRENZEN, SIGNATUR_KENNZEICHNUNG, SIGNATUR_MODI, SIGNATUR_RECHTSHINWEIS, SIGNATUR_STATUS, SIGNATUR_ZUSTIMMUNG,
  UNTERZEICHNER_STATUS, darfJetztUnterschreiben, getippterNameGueltig, ipMaskiert, pngBase64AusDataUrl, unterzeichnerStatus,
} from "../../signatur";
import { signiertesPdf, sha256Hex, standardErklaerungPdf } from "../../signatur/pruefseite";
import { PdfAnhangFehler, pdfSeitenAnhaengen, pdfSeitenzahl } from "../../signatur/pdfAnhang";
import { PdfDokument } from "../../server/pdf";
import { istPng, pngLesen } from "../../server/png";
import { jetzt, neueId, sha256 } from "./hilfen";
import {
  angemeldet, aendernBereit, boLesen, boSchreiben, dateiLesen, dateiSchreiben, kontoKurz, lesenBereit, mailAblegen, melden, nameVon, nutzerById, protokoll, schreibNoetig,
} from "./service-kern";

const BEREICH = "signatur";
const LABEL = "Elektronische Unterschrift";
const heute = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });

// ================================================================ Rechte & Ausgabe

function rolleIm(n, s) {
  if (!n || !s) return null;
  if (boLesen(n, BEREICH)) return "backoffice";
  if (s.erstellerId && s.erstellerId === n.id) return "ersteller";
  if (s.unterzeichner.some((u) => u.kontoId === n.id)) return "unterzeichner";
  return null;
}

function laden(db, n, id) {
  angemeldet(n);
  const s = db.service.signaturen.find((x) => x.id === v.kennung(id));
  if (!s) throw nichtGefunden("Vorgang nicht gefunden.");
  if (!rolleIm(n, s)) throw verboten("Dieser Signaturvorgang betrifft Ihr Konto nicht.");
  return s;
}

/** Frist abgelaufen? (wirkt sofort in der Ausgabe, gespeichert beim nächsten Schreiben) */
const effektiverStatus = (s) => (s.status === "laufend" && s.frist && s.frist < heute() ? "abgelaufen" : s.status);

function ereignis(s, { art, text, kontoId = null, ip = "", userAgent = "", sha = "" }) {
  s.protokoll.push({ id: neueId("SP"), am: jetzt(), art, text: v.text(text, 300), kontoId, ip: ip || "", userAgent: v.text(userAgent, 300), sha256: sha || "" });
}

function unterzeichnerAusgabe(s, u, n, rolle) {
  const voll = rolle === "backoffice" || u.kontoId === n.id;
  const us = u.unterschrift;
  return {
    id: u.id, position: u.position, kontoId: voll ? u.kontoId : undefined, name: u.name, email: voll ? u.email : undefined,
    status: unterzeichnerStatus({ ...s, status: effektiverStatus(s) }, u), statusLabel: UNTERZEICHNER_STATUS[unterzeichnerStatus({ ...s, status: effektiverStatus(s) }, u)]?.label,
    ich: u.kontoId === n.id,
    unterschrift: us
      ? {
          art: us.art, name: us.name, am: us.am, sha256Dokument: us.sha256Dokument, codeBestaetigtAm: us.codeBestaetigtAm,
          ip: voll ? us.ip : ipMaskiert(us.ip), userAgent: voll ? us.userAgent : undefined,
          bild: voll && us.bildPngBase64 ? `data:image/png;base64,${us.bildPngBase64}` : undefined,
        }
      : null,
    abgelehnt: u.abgelehnt || null,
    codeGesendetAm: u.kontoId === n.id ? u.code?.gesendetAm || null : undefined,
    codeGueltigBis: u.kontoId === n.id && u.code && !u.code.verbraucht ? u.code.ablauf : undefined,
    erinnertAm: rolle === "backoffice" ? u.erinnertAm || null : undefined,
  };
}

function ausgabe(db, n, s, { detail = false } = {}) {
  const rolle = rolleIm(n, s);
  const status = effektiverStatus(s);
  const ich = s.unterzeichner.find((u) => u.kontoId === n.id) || null;
  const basis = {
    id: s.id, titel: s.titel, art: s.art, artLabel: SIGNATUR_ARTEN[s.art]?.label || s.art, status, statusLabel: SIGNATUR_STATUS[status]?.label || status,
    erstelltAm: s.erstelltAm, geaendertAm: s.geaendertAm, frist: s.frist || null, abgeschlossenAm: s.abgeschlossenAm || null, reihenfolge: s.reihenfolge !== false,
    ersteller: s.erstellerId ? kontoKurz(db, s.erstellerId) : { id: null, name: "ÖkoInvest (automatisch)", email: "" },
    bezug: s.bezugArt ? { art: s.bezugArt, id: s.bezugId } : null,
    standard: s.standard || null,
    fortschritt: { unterschrieben: s.unterzeichner.filter((u) => u.status === "unterschrieben").length, gesamt: s.unterzeichner.length },
    unterzeichner: [...s.unterzeichner].sort((a, b) => a.position - b.position).map((u) => unterzeichnerAusgabe(s, u, n, rolle)),
    ichBinDran: !!ich && status === "laufend" && darfJetztUnterschreiben(s, ich),
    meineRolle: rolle,
    darfWiderrufen: status === "laufend" && (boSchreiben(n, BEREICH) || s.erstellerId === n.id),
    darfErinnern: status === "laufend" && boSchreiben(n, BEREICH),
  };
  if (!detail) return basis;
  return {
    ...basis,
    nachricht: s.nachricht || "",
    dokument: { name: s.dokumentName, groesse: s.groesse, seiten: s.seiten || 0, sha256: s.sha256Original },
    signiert: s.dateiSigniert ? { name: signiertName(s), groesse: s.groesseSigniert, sha256: s.sha256Signiert, seiten: s.seitenSigniert } : null,
    widerruf: s.widerruf || null,
    protokoll: s.protokoll.map((e) => ({
      id: e.id, am: e.am, art: e.art, text: e.text, name: e.kontoId ? nameVon(db, e.kontoId) : "System", sha256: e.sha256 || "",
      ip: rolle === "backoffice" || e.kontoId === n.id ? e.ip : ipMaskiert(e.ip), userAgent: rolle === "backoffice" || e.kontoId === n.id ? e.userAgent : undefined,
    })),
    kennzeichnung: SIGNATUR_KENNZEICHNUNG,
    rechtshinweis: SIGNATUR_RECHTSHINWEIS,
    zustimmungText: SIGNATUR_ZUSTIMMUNG,
  };
}

const signiertName = (s) => String(s.dokumentName || "dokument.pdf").replace(/\.pdf$/i, "") + "-signiert.pdf";

// ================================================================ Lesen

export async function signaturen(n, { status = "", alle = false } = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const bo = boLesen(n, BEREICH);
  return db.service.signaturen
    .filter((s) => (alle && bo ? true : s.erstellerId === n.id || s.unterzeichner.some((u) => u.kontoId === n.id)))
    .filter((s) => !status || effektiverStatus(s) === status)
    .sort((a, b) => String(b.geaendertAm).localeCompare(String(a.geaendertAm)))
    .slice(0, 300)
    .map((s) => ausgabe(db, n, s));
}

export async function signatur(n, id) {
  const db = await lesenBereit();
  return ausgabe(db, n, laden(db, n, id), { detail: true });
}

// ================================================================ Anlegen

/** PDF prüfen: Magic Bytes, Größe, nicht verschlüsselt, Seiten anhängbar (Probelauf) */
function pdfPruefen(daten) {
  if (!Buffer.isBuffer(daten) || daten.length < 20 || daten.subarray(0, 5).toString("latin1") !== "%PDF-") throw new PlattformFehler(415, "Bitte laden Sie eine PDF-Datei hoch.");
  if (daten.length > SIGNATUR_GRENZEN.pdfMaxBytes) throw new PlattformFehler(413, "Die PDF-Datei ist größer als 10 MB.");
  try {
    const probe = new PdfDokument({ titel: "Probe" });
    probe.seite();
    pdfSeitenAnhaengen(daten, probe.alsBuffer());
  } catch (e) {
    if (e instanceof PdfAnhangFehler) throw ungueltig(`Die PDF-Datei kann nicht signiert werden: ${e.message}`);
    throw ungueltig("Die PDF-Datei kann nicht verarbeitet werden. Bitte als PDF (z. B. „PDF/A“) neu exportieren.");
  }
  return pdfSeitenzahl(daten);
}

function unterzeichnerAufloesen(db, liste) {
  v.pflicht(Array.isArray(liste) && liste.length >= 1, "Bitte wählen Sie mindestens eine unterzeichnende Person.");
  v.pflicht(liste.length <= SIGNATUR_GRENZEN.maxUnterzeichner, `Höchstens ${SIGNATUR_GRENZEN.maxUnterzeichner} Unterzeichner.`);
  const gesehen = new Set();
  return liste.map((x, i) => {
    const email = v.email(x?.email || "");
    const kid = v.kennung(x?.kontoId || "");
    const u = kid ? nutzerById(db, kid) : db.nutzer.find((k) => k.email === email);
    v.pflicht(u && u.aktiv, `Unterzeichner ${i + 1}: Es gibt kein aktives Portal-Konto mit dieser Angabe. Unterzeichner brauchen ein Konto (Einladung über „Nutzer“ bzw. Registrierung).`);
    v.pflicht(!gesehen.has(u.id), "Jede Person kann nur einmal unterschreiben.");
    gesehen.add(u.id);
    return { id: neueId("SU"), position: i + 1, kontoId: u.id, name: nameVon(db, u.id) || u.email, email: u.email, status: "offen", code: null, unterschrift: null, abgelehnt: null, erinnertAm: null };
  });
}

function eingeladenMelden(db, s) {
  const offen = s.unterzeichner.filter((u) => darfJetztUnterschreiben(s, u) && !u.eingeladenAm);
  for (const u of offen) {
    u.eingeladenAm = jetzt();
    melden(db, u.kontoId, { art: "signatur", titel: `Zur Unterschrift: ${s.titel}`, text: `${SIGNATUR_ARTEN[s.art]?.label || "Dokument"}${s.frist ? ` · bitte bis ${s.frist.split("-").reverse().join(".")}` : ""}`, link: `/portal/signatur/${s.id}`, objektArt: "signatur", objektId: s.id });
  }
}

function vorgangAnlegen(db, { titel, art, erstellerId, bezugArt, bezugId, nachricht, frist, reihenfolge, unterzeichner, daten, dateiname, standard = null, ip = "" }) {
  const seiten = pdfPruefen(daten);
  const datei = dateiSchreiben("SIG", "pdf", daten);
  const s = {
    id: neueId("SV"), titel, art, status: "laufend", erstellerId, bezugArt: bezugArt || null, bezugId: bezugId || null, nachricht: nachricht || "",
    frist, reihenfolge: reihenfolge !== false, datei, dokumentName: dateiname, groesse: daten.length, seiten, sha256Original: sha256Hex(daten),
    dateiSigniert: null, sha256Signiert: null, unterzeichner, protokoll: [], standard, widerruf: null, erstelltAm: jetzt(), geaendertAm: jetzt(), abgeschlossenAm: null,
  };
  ereignis(s, { art: "erstellt", text: `Vorgang angelegt (${unterzeichner.length} Unterzeichner, Reihenfolge ${s.reihenfolge ? "fest" : "beliebig"})`, kontoId: erstellerId, ip, sha: s.sha256Original });
  db.service.signaturen.push(s);
  eingeladenMelden(db, s);
  return s;
}

export async function signaturAnlegen(n, daten = {}, { ip = "" } = {}) {
  schreibNoetig(n, BEREICH, LABEL);
  const titel = v.text(daten.titel, 160);
  v.pflicht(titel.length >= 3, "Bitte geben Sie einen Titel an (mind. 3 Zeichen).");
  const art = v.auswahl(daten.art, SIGNATUR_ART_IDS, "");
  v.pflicht(art, "Bitte wählen Sie die Dokumentart.");
  const fristTage = Math.min(SIGNATUR_GRENZEN.fristTageMax, Math.max(1, Number(daten.fristTage) || SIGNATUR_GRENZEN.fristTageStandard));
  const frist = new Date(Date.now() + fristTage * 86400e3).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
  const bezugArt = daten.bezugArt ? v.auswahl(daten.bezugArt, BEZUG_ARTEN, "") : "";
  // PDF als Buffer (Upload der Website) oder base64 (Frappe-Vertrag)
  const b64 = String(daten.pdfBase64 || "");
  const pdf = Buffer.isBuffer(daten.pdf) ? daten.pdf : b64.length > 20 && b64.length < SIGNATUR_GRENZEN.pdfMaxBytes * 1.4 ? Buffer.from(b64, "base64") : null;
  v.pflicht(pdf && pdf.length > 20, "Bitte laden Sie das Dokument als PDF hoch (höchstens 10 MB).");
  const dateiname = (v.text(daten.dateiname, 120).replace(/[\\/:*?"<>|]/g, "_") || "dokument.pdf").replace(/(\.pdf)?$/i, ".pdf");
  return aendernBereit((db) => {
    let bezugId = null;
    if (bezugArt) {
      const liste = { vorgang: db.vorgaenge, flaeche: db.flaechen, projekt: db.projekte, interesse: db.interessen, nutzer: db.nutzer }[bezugArt] || [];
      const o = liste.find((x) => x.id === v.kennung(daten.bezugId));
      if (!o) throw nichtGefunden("Bezug nicht gefunden.");
      bezugId = o.id;
    }
    const s = vorgangAnlegen(db, {
      titel, art, erstellerId: n.id, bezugArt, bezugId, nachricht: v.mehrzeilig(daten.nachricht, 1000), frist, reihenfolge: daten.reihenfolge !== false,
      unterzeichner: unterzeichnerAufloesen(db, daten.unterzeichner), daten: pdf, dateiname, ip,
    });
    protokoll(db, n, "signatur", "signatur", s.id, `Signaturvorgang „${titel}“ angelegt`, ip);
    return ausgabe(db, n, s, { detail: true });
  });
}

// ================================================================ Code & Unterschrift

const codeHash = (s, u, code) => sha256(`${s.id}:${u.id}:${String(code).trim()}`);
const emailMaskiert = (e) => String(e || "").replace(/^(.).*?(.)?@/, (_, a, b) => `${a}…${b || ""}@`);

export async function signaturCodeAnfordern(n, id, { ip = "", userAgent = "" } = {}) {
  angemeldet(n);
  return aendernBereit((db) => {
    const s = laden(db, n, id);
    if (effektiverStatus(s) !== "laufend") throw konflikt("Dieser Vorgang kann nicht mehr unterschrieben werden.");
    const u = s.unterzeichner.find((x) => x.kontoId === n.id);
    if (!u) throw verboten("Sie sind in diesem Vorgang nicht als Unterzeichner eingetragen.");
    if (!darfJetztUnterschreiben(s, u)) throw konflikt("Sie sind noch nicht an der Reihe – vorher unterschreiben andere Personen.");
    const stunde = Date.now() - 3600e3;
    const anzahl = s.protokoll.filter((e) => e.art === "code" && e.kontoId === n.id && new Date(e.am).getTime() > stunde).length;
    if (anzahl >= 5) throw new PlattformFehler(429, "Zu viele Codes angefordert – bitte warten Sie eine Stunde.");
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    u.code = { hash: codeHash(s, u, code), ablauf: new Date(Date.now() + SIGNATUR_GRENZEN.codeMinuten * 60e3).toISOString(), versuche: 0, gesendetAm: jetzt(), verbraucht: false };
    ereignis(s, { art: "code", text: `Bestätigungscode an ${emailMaskiert(u.email)} gesendet`, kontoId: n.id, ip, userAgent });
    mailAblegen(db, {
      an: u.email, anName: u.name, nutzerId: u.kontoId, art: "signatur",
      betreff: `Ihr Bestätigungscode zur Unterschrift – ÖkoInvest`,
      text: `Ihr Bestätigungscode lautet: ${code}\n\nDer Code ist ${SIGNATUR_GRENZEN.codeMinuten} Minuten gültig und gilt nur für den Vorgang ${s.id}. Geben Sie ihn nicht weiter – ÖkoInvest fragt nie telefonisch nach diesem Code.\n\n${SIGNATUR_KENNZEICHNUNG}`,
      link: `/portal/signatur/${s.id}`, linkText: "Zum Dokument", hinweis: "Sie haben diese E-Mail erhalten, weil Sie im Portal eine elektronische Unterschrift begonnen haben.",
    });
    s.geaendertAm = jetzt();
    return { ok: true, gesendetAn: emailMaskiert(u.email), gueltigBis: u.code.ablauf };
  });
}

function unterschriftPruefen({ art, bild, name }) {
  if (art === "gezeichnet") {
    const b64 = pngBase64AusDataUrl(bild);
    v.pflicht(b64, "Bitte zeichnen Sie Ihre Unterschrift in das Feld.");
    const puffer = Buffer.from(b64, "base64");
    v.pflicht(istPng(puffer) && puffer.length <= SIGNATUR_GRENZEN.bildMaxBytes, "Die gezeichnete Unterschrift ist ungültig oder zu groß.");
    let info;
    try {
      info = pngLesen(puffer);
    } catch {
      throw ungueltig("Die gezeichnete Unterschrift konnte nicht gelesen werden.");
    }
    v.pflicht(info.sichtbarePixel >= 30, "Das Unterschriftsfeld ist leer – bitte zeichnen Sie Ihre Unterschrift.");
    return { art, bildPngBase64: b64 };
  }
  if (art === "getippt") {
    v.pflicht(getippterNameGueltig(name), "Bitte tippen Sie Ihren vollständigen Namen (2–80 Zeichen).");
    return { art, bildPngBase64: null, name: String(name).trim() };
  }
  throw ungueltig("Bitte wählen Sie „zeichnen“ oder „tippen“.");
}

function pdfDaten(db, s) {
  return {
    id: s.id, titel: s.titel, art: s.art, dokumentName: s.dokumentName, sha256Original: s.sha256Original, seitenOriginal: s.seiten, reihenfolge: s.reihenfolge,
    erstelltAm: s.erstelltAm, abgeschlossenAm: s.abgeschlossenAm, ersteller: s.erstellerId ? { name: nameVon(db, s.erstellerId) } : null,
    unterzeichner: s.unterzeichner.map((u) => ({ position: u.position, name: u.name, email: u.email, status: u.status, unterschrift: u.unterschrift ? { ...u.unterschrift, zustimmung: true } : null })),
  };
}

/** Signiertes PDF erzeugen, speichern, Vorgang abschließen (innerhalb von aendern) */
function abschliessen(db, s) {
  s.abgeschlossenAm = jetzt();
  const r = signiertesPdf(dateiLesen(s.datei), pdfDaten(db, s), { erzeugtAm: s.abgeschlossenAm });
  s.dateiSigniert = dateiSchreiben("SIG", "pdf", r.pdf);
  s.sha256Signiert = r.sha256;
  s.groesseSigniert = r.pdf.length;
  s.seitenSigniert = r.seitenNachher;
  s.status = "abgeschlossen";
  ereignis(s, { art: "abgeschlossen", text: `Alle Unterschriften liegen vor – signiertes PDF mit Prüfseite erzeugt (${r.seitenNachher} Seiten)`, sha: r.sha256 });
  // Am Bezugsobjekt als Dokument ablegen (erscheint unter „Dokumente“ bei Berechtigten)
  if (s.bezugArt && s.bezugId && BEZUG_ARTEN.includes(s.bezugArt)) {
    db.dokumente.push({ id: neueId("D"), bezugArt: s.bezugArt, bezugId: s.bezugId, name: signiertName(s), mime: "application/pdf", groesse: r.pdf.length, datei: s.dateiSigniert, kategorie: "vertrag", checkliste: "", hochgeladenVon: s.erstellerId || s.unterzeichner[0].kontoId, am: jetzt(), sha256: r.sha256 });
  }
  const empfaenger = new Set([s.erstellerId, ...s.unterzeichner.map((u) => u.kontoId)].filter(Boolean));
  for (const k of empfaenger) melden(db, k, { art: "signatur", titel: `Vollständig unterschrieben: ${s.titel}`, text: "Das signierte PDF mit Prüfseite steht zum Download bereit.", link: `/portal/signatur/${s.id}`, objektArt: "signatur", objektId: s.id });
}

export async function signaturUnterschreiben(n, id, { code, art, bild, name, zustimmung, ip = "", userAgent = "" } = {}) {
  angemeldet(n);
  v.pflicht(zustimmung === true, "Bitte bestätigen Sie, dass Sie das Dokument gelesen haben und elektronisch unterschreiben.");
  const sig = unterschriftPruefen({ art, bild, name });
  const ergebnis = await aendernBereit((db) => {
    const s = laden(db, n, id);
    if (effektiverStatus(s) !== "laufend") throw konflikt(effektiverStatus(s) === "abgelaufen" ? "Die Frist für diese Unterschrift ist abgelaufen." : "Dieser Vorgang kann nicht mehr unterschrieben werden.");
    const u = s.unterzeichner.find((x) => x.kontoId === n.id);
    if (!u) throw verboten("Sie sind in diesem Vorgang nicht als Unterzeichner eingetragen.");
    if (!darfJetztUnterschreiben(s, u)) throw konflikt("Sie sind noch nicht an der Reihe – vorher unterschreiben andere Personen.");
    // Bestätigungscode (E-Mail): gültig, nicht verbraucht, höchstens 5 Versuche
    if (!u.code || u.code.verbraucht || new Date(u.code.ablauf) < new Date()) return { fehler: [422, "Bitte fordern Sie einen neuen Bestätigungscode an."] };
    if (u.code.versuche >= SIGNATUR_GRENZEN.codeVersuche) return { fehler: [429, "Zu viele Fehlversuche – bitte fordern Sie einen neuen Code an."] };
    const soll = Buffer.from(u.code.hash, "hex");
    const ist = Buffer.from(codeHash(s, u, String(code || "").replace(/\s/g, "")), "hex");
    if (!/^\d{6}$/.test(String(code || "").replace(/\s/g, "")) || !timingSafeEqual(soll, ist)) {
      u.code.versuche++;
      ereignis(s, { art: "code_falsch", text: `Falscher Bestätigungscode (Versuch ${u.code.versuche})`, kontoId: n.id, ip, userAgent });
      return { fehler: [422, "Der Bestätigungscode ist falsch."] };
    }
    // Integrität des Originals vor der Unterschrift
    const shaJetzt = sha256Hex(dateiLesen(s.datei));
    if (shaJetzt !== s.sha256Original) {
      ereignis(s, { art: "hash_abweichung", text: "Prüfsumme der Originaldatei weicht ab – Unterschrift abgelehnt", kontoId: n.id, ip, userAgent, sha: shaJetzt });
      return { fehler: [409, "Das Dokument wurde nach der Bereitstellung verändert. Die Unterschrift ist nicht möglich – bitte wenden Sie sich an das Backoffice."] };
    }
    u.code.verbraucht = true;
    u.status = "unterschrieben";
    u.unterschrift = { ...sig, name: sig.art === "getippt" ? sig.name : u.name, am: jetzt(), ip: ip || "", userAgent: v.text(userAgent, 300), sha256Dokument: shaJetzt, codeBestaetigtAm: jetzt(), zustimmung: SIGNATUR_ZUSTIMMUNG };
    ereignis(s, { art: "unterschrieben", text: `${u.name} hat unterschrieben (${sig.art === "gezeichnet" ? "gezeichnet" : "getippt"})`, kontoId: n.id, ip, userAgent, sha: shaJetzt });
    protokoll(db, n, "signatur", "signatur", s.id, `Unterschrift geleistet (${s.titel})`, ip);
    s.geaendertAm = jetzt();
    if (s.unterzeichner.every((x) => x.status === "unterschrieben")) abschliessen(db, s);
    else {
      eingeladenMelden(db, s);
      if (s.erstellerId) melden(db, s.erstellerId, { art: "signatur", titel: `Unterschrieben: ${s.titel}`, text: `${u.name} hat unterschrieben.`, link: `/portal/signatur/${s.id}`, objektArt: "signatur", objektId: s.id }, { mail: false });
    }
    const folge = s.status === "abgeschlossen" && s.standard ? { ...s.standard, kontoId: n.id } : null;
    return { vorgang: ausgabe(db, n, s, { detail: true }), folgeAktion: folge };
  });
  if (ergebnis.fehler) throw new PlattformFehler(ergebnis.fehler[0], ergebnis.fehler[1]);
  return ergebnis;
}

export async function signaturAblehnen(n, id, { grund = "", ip = "" } = {}) {
  angemeldet(n);
  const g = v.mehrzeilig(grund, 1000);
  v.pflicht(g.length >= 3, "Bitte geben Sie kurz an, warum Sie nicht unterschreiben.");
  return aendernBereit((db) => {
    const s = laden(db, n, id);
    if (effektiverStatus(s) !== "laufend") throw konflikt("Dieser Vorgang ist nicht mehr offen.");
    const u = s.unterzeichner.find((x) => x.kontoId === n.id);
    if (!u || u.status === "unterschrieben") throw verboten("Sie können diesen Vorgang nicht ablehnen.");
    u.status = "abgelehnt";
    u.abgelehnt = { am: jetzt(), grund: g };
    s.status = "abgelehnt";
    s.geaendertAm = jetzt();
    ereignis(s, { art: "abgelehnt", text: `${u.name} hat die Unterschrift abgelehnt: ${g}`, kontoId: n.id, ip });
    if (s.erstellerId) melden(db, s.erstellerId, { art: "signatur", titel: `Abgelehnt: ${s.titel}`, text: `${u.name} unterschreibt nicht.`, link: `/portal/signatur/${s.id}`, objektArt: "signatur", objektId: s.id });
    return ausgabe(db, n, s, { detail: true });
  });
}

export async function signaturWiderrufen(n, id, { grund = "", ip = "" } = {}) {
  angemeldet(n);
  const g = v.mehrzeilig(grund, 1000);
  v.pflicht(g.length >= 3, "Bitte geben Sie einen Grund für den Widerruf an.");
  return aendernBereit((db) => {
    const s = laden(db, n, id);
    if (!(boSchreiben(n, BEREICH) || s.erstellerId === n.id)) throw verboten("Nur das Backoffice kann einen Signaturvorgang widerrufen.");
    if (effektiverStatus(s) !== "laufend") throw konflikt("Nur laufende Vorgänge können widerrufen werden – abgeschlossene bleiben gültig.");
    s.status = "widerrufen";
    s.widerruf = { am: jetzt(), vonId: n.id, grund: g };
    s.geaendertAm = jetzt();
    ereignis(s, { art: "widerrufen", text: `Vorgang widerrufen: ${g}`, kontoId: n.id, ip });
    for (const u of s.unterzeichner) melden(db, u.kontoId, { art: "signatur", titel: `Widerrufen: ${s.titel}`, text: "Das Dokument muss nicht mehr unterschrieben werden.", link: `/portal/signatur/${s.id}`, objektArt: "signatur", objektId: s.id });
    protokoll(db, n, "signatur", "signatur", s.id, `Signaturvorgang widerrufen (${s.titel})`, ip);
    return ausgabe(db, n, s, { detail: true });
  });
}

export async function signaturErinnern(n, id) {
  schreibNoetig(n, BEREICH, LABEL);
  return aendernBereit((db) => {
    const s = laden(db, n, id);
    if (effektiverStatus(s) !== "laufend") throw konflikt("Nur laufende Vorgänge.");
    const offen = s.unterzeichner.filter((u) => darfJetztUnterschreiben(s, u));
    const grenze = Date.now() - 12 * 3600e3;
    const faellig = offen.filter((u) => !u.erinnertAm || new Date(u.erinnertAm).getTime() < grenze);
    if (!faellig.length) throw konflikt("Die offene Person wurde in den letzten 12 Stunden bereits erinnert.");
    for (const u of faellig) {
      u.erinnertAm = jetzt();
      melden(db, u.kontoId, { art: "signatur", titel: `Erinnerung: ${s.titel}`, text: "Das Dokument wartet auf Ihre Unterschrift.", link: `/portal/signatur/${s.id}`, objektArt: "signatur", objektId: s.id });
      ereignis(s, { art: "erinnert", text: `Erinnerung an ${u.name}`, kontoId: n.id });
    }
    s.geaendertAm = jetzt();
    return ausgabe(db, n, s, { detail: true });
  });
}

/** Datei: variante original | signiert. Download wird protokolliert. */
export async function signaturDatei(n, id, { variante = "original", ip = "" } = {}) {
  angemeldet(n);
  return aendernBereit((db) => {
    const s = laden(db, n, id);
    const signiert = variante === "signiert";
    if (signiert && !s.dateiSigniert) throw nichtGefunden("Das signierte PDF liegt erst nach der letzten Unterschrift vor.");
    const daten = dateiLesen(signiert ? s.dateiSigniert : s.datei);
    ereignis(s, { art: "download", text: `${signiert ? "Signiertes PDF" : "Original"} abgerufen`, kontoId: n.id, ip, sha: sha256Hex(daten) });
    return { name: signiert ? signiertName(s) : s.dokumentName, mime: "application/pdf", daten };
  });
}

// ================================================================ Einstellungen & Standard-Erklärungen (NDA / Provision)

export async function signaturEinstellungen(n) {
  angemeldet(n);
  const db = await lesenBereit();
  const e = db.service.einstellungen;
  return { ndaModus: e.ndaModus || "klick", provisionModus: e.provisionModus || "klick", modi: SIGNATUR_MODI };
}

export async function signaturEinstellungenSpeichern(n, daten = {}) {
  schreibNoetig(n, BEREICH, LABEL);
  return aendernBereit((db) => {
    const e = db.service.einstellungen;
    if (daten.ndaModus !== undefined) e.ndaModus = v.auswahl(daten.ndaModus, SIGNATUR_MODI, "klick");
    if (daten.provisionModus !== undefined) e.provisionModus = v.auswahl(daten.provisionModus, SIGNATUR_MODI, "klick");
    protokoll(db, n, "signatur", "einstellungen", "signatur", `Signatur-Modus: NDA ${e.ndaModus}, Provision ${e.provisionModus}`);
    return { ndaModus: e.ndaModus, provisionModus: e.provisionModus, modi: SIGNATUR_MODI };
  });
}

/**
 * Standard-Erklärung im Modus „signatur“: liefert { modus:"klick" } (nichts zu tun) bzw. { modus:"signatur", erledigt, id }.
 * Legt bei Bedarf den Signaturvorgang an (Unterzeichner = n, PDF aus dem bestehenden Text).
 */
export async function signaturStandard(n, { art, projektId, ip = "" } = {}) {
  angemeldet(n);
  v.pflicht(["nda", "provision"].includes(art), "Unbekannte Erklärung.");
  const db0 = await lesenBereit();
  const modus = art === "nda" ? db0.service.einstellungen.ndaModus : db0.service.einstellungen.provisionModus;
  if (modus !== "signatur") return { modus: "klick" };
  return aendernBereit((db) => {
    const p = db.projekte.find((x) => x.id === v.kennung(projektId));
    if (!p) throw nichtGefunden("Projekt nicht gefunden.");
    if (art === "nda" && !BOERSE_STATUS.includes(p.status)) throw nichtGefunden("Projekt nicht gefunden.");
    if (art === "provision" && p.anbieterId !== n.id) throw verboten("Nur der Anbieter unterschreibt die Provisionsvereinbarung.");
    const vorhanden = db.service.signaturen.filter((s) => s.standard?.art === art && s.standard?.projektId === p.id && s.unterzeichner[0]?.kontoId === n.id);
    const fertig = vorhanden.find((s) => s.status === "abgeschlossen");
    if (fertig) return { modus, erledigt: true, id: fertig.id };
    const laufend = vorhanden.find((s) => effektiverStatus(s) === "laufend");
    if (laufend) return { modus, erledigt: false, id: laufend.id };
    const u = nutzerById(db, n.id);
    const titel = art === "nda" ? `Vertraulichkeitsvereinbarung zu Projekt ${p.id}` : `Provisionsvereinbarung zu Projekt ${p.id}`;
    const pdf = standardErklaerungPdf(
      art === "nda"
        ? { titel: NDA.titel.replace(" (Klick-NDA)", ""), untertitel: `Projekt ${p.id} · Version ${NDA.version}`, absaetze: NDA.absaetze, unterzeichner: `${nameVon(db, n.id)} (${u.email})` }
        : { titel: "Provisionsvereinbarung für Anbieter", untertitel: `Projekt ${p.id} · „${p.titel}“`, absaetze: [`Für die Vermittlung über die Projektbörse zahlt der Anbieter an die ÖkoInvest GmbH eine Provision von ${PROVISION.verkaeufer.text}.`, "Die Provision wird erst mit Abschluss des Kaufvertrags (Signing) fällig; ohne Abschluss entstehen keine Kosten.", "Der Provisionssatz wird bei der Freigabe des Projekts im Backoffice festgelegt und dem Anbieter mitgeteilt."], unterzeichner: `${nameVon(db, n.id)} (${u.email})` }
    );
    const s = vorgangAnlegen(db, {
      titel, art, erstellerId: null, bezugArt: art === "provision" ? "projekt" : null, bezugId: art === "provision" ? p.id : null, nachricht: "", frist: new Date(Date.now() + 30 * 86400e3).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" }),
      reihenfolge: true, unterzeichner: unterzeichnerAufloesen(db, [{ kontoId: n.id }]), daten: pdf, dateiname: `${art === "nda" ? "NDA" : "Provisionsvereinbarung"}-${p.id}.pdf`, standard: { art, projektId: p.id }, ip,
    });
    return { modus, erledigt: false, id: s.id };
  });
}
