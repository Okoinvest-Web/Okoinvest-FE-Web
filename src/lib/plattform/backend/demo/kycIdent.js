// src/lib/plattform/backend/demo/kycIdent.js
//
// Eigene Identifizierung im Demo-Backend: Videoidentifizierung durch die Compliance („video_intern“).
// Referenz für plattform/api/kyc_ident.py (Vertrag: docs/API.md, Abschnitt „KYC/KYB – Eigene Identifizierung“).
// MRZ und Methodenwahl laufen über die Abschnitte „mrz“/„methode“ in kycSpeichern (demo/kyc.js).
//
// Ablauf:
//   Nutzer      – kycVideo(n): Stand, freie Slots (Terminart „identifizierung“, nur Compliance-Mitarbeiter), Link
//                 kycVideoBuchen(n,{start}) / kycVideoStornieren(n) – nutzt die vorhandene Terminbuchung (service-termine.js)
//   Compliance  – kycVideoAktion(n, fallId, {aktion: start|punkt|tan_senden|tan_pruefen|notiz|abschluss, …})
//                 kycVideoProtokoll(n, fallId, protokollId) → Daten für das Protokoll-PDF (server/kycVideoPdf.js)
// Rechte: Nutzer nur eigener Fall; Compliance (Unterrolle, Stufe 2) alle – nie den eigenen Fall. Ein laufendes Gespräch
// bearbeitet nur, wer es begonnen hat (Durchführende/r). Jede Aktion im Revisionsprotokoll (Hash-Kette); das
// abgeschlossene Protokoll erhält einen SHA-256 über seinen kanonischen Inhalt.
// Kein Video, keine Aufzeichnung: das Gespräch läuft im externen Videokonferenz-Werkzeug (Link = Einstellung „videoLink“).

import { randomInt } from "node:crypto";
import { konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { kycRisiko } from "../../kyc";
import {
  KYC_TAN, KYC_VIDEO_ABBRUCHGRUENDE, KYC_VIDEO_CHECKLISTE, KYC_VIDEO_DATENSCHUTZ, KYC_VIDEO_ERGEBNISSE, KYC_VIDEO_HINWEIS, KYC_VIDEO_PUNKT_IDS, kanonischJson, videoAbschlussPruefen,
} from "../../kycIdent";
import { ARBEITSZEITEN_STANDARD, TERMIN_AKTIV } from "../../termine";
import { unterrollen } from "../../rechte";
import { intern } from "../demo";
import { jetzt, neueId, sha256 } from "./hilfen";
import { kycIntern } from "./kyc";
import { kycEinstellungenDb } from "./kycRegeln";
import { IDENT_TERMINART, identTermin, videoFuerNutzer, videoSicht } from "./kycIdentRegeln";
import { terminAendern, terminBuchen, terminSlots } from "./service-termine";
import { lesenBereit as serviceBereit, mailAblegen } from "./service-kern";

const { protokoll, nutzerById, nameVon } = intern;
const { angemeldet, complianceNoetig, fallById, eigenerFall, verlauf, complianceMelden, nutzerMelden } = kycIntern;
const ABGESCHLOSSEN = ["verifiziert", "abgelehnt", "geloescht"];

// ---------------------------------------------------------------- Vorbereitung

/** Compliance-Konten bieten die Terminart „identifizierung“ an (einmalig ergänzt, danach im Kalender pflegbar) */
async function bereit() {
  await serviceBereit();
  const db = await kycIntern.lesenBereit();
  if (db.kyc?.identAnbieterV === 1) return;
  await kycIntern.aendernBereit((w) => {
    if (w.kyc.identAnbieterV === 1 || !w.service?.verfuegbarkeit) return;
    for (const u of w.nutzer.filter((x) => x.aktiv && x.rollen.includes("admin") && unterrollen(x).includes("compliance"))) {
      const vf = w.service.verfuegbarkeit[u.id] || (w.service.verfuegbarkeit[u.id] = { arbeitszeiten: ARBEITSZEITEN_STANDARD, terminarten: [], aktiv: true });
      if (!(vf.terminarten || []).includes(IDENT_TERMINART)) vf.terminarten = [...(vf.terminarten || []), IDENT_TERMINART];
    }
    w.kyc.identAnbieterV = 1;
  });
}

// ================================================================ Nutzer

/** Stand der Videoidentifizierung, freie Termine (nur Compliance), Link und Datenschutzhinweis */
export async function kycVideo(n, { von = "", bis = "" } = {}) {
  angemeldet(n);
  await bereit();
  const db = await kycIntern.lesenBereit();
  const f = eigenerFall(db, n);
  if (!f) throw ungueltig("Bitte beginnen Sie zuerst mit der Verifizierung.");
  const sicht = videoSicht(db, f);
  const e = kycEinstellungenDb(db);
  const buchbar = !ABGESCHLOSSEN.includes(f.status) && !sicht.termin && ["offen", "abgebrochen"].includes(sicht.status);
  const s = buchbar ? await terminSlots(n, { art: IDENT_TERMINART, von, bis }) : null;
  return {
    video: videoFuerNutzer(sicht), methode: f.methode || "", buchbar, slots: s?.slots || [], dauer: s?.dauer || null,
    videoLink: sicht.termin ? e.videoLink || "" : "", datenschutz: KYC_VIDEO_DATENSCHUTZ,
  };
}

export async function kycVideoBuchen(n, { start } = {}) {
  angemeldet(n);
  await bereit();
  const db = await kycIntern.lesenBereit();
  const f = eigenerFall(db, n);
  if (!f) throw ungueltig("Bitte beginnen Sie zuerst mit der Verifizierung.");
  if (f.methode !== "video_intern") throw ungueltig("Bitte wählen Sie zuerst den Weg „Ausweis hochladen + Videogespräch“.");
  if (ABGESCHLOSSEN.includes(f.status)) throw konflikt("Ihre Verifizierung ist abgeschlossen.");
  const sicht = videoSicht(db, f);
  if (sicht.termin) throw konflikt("Sie haben bereits einen Termin gebucht. Zum Verschieben sagen Sie ihn bitte zuerst ab.");
  if (!["offen", "abgebrochen"].includes(sicht.status)) throw konflikt("Das Videogespräch hat bereits stattgefunden.");
  const r = await terminBuchen(n, { art: IDENT_TERMINART, start, notiz: `Identifizierung per Video (KYC-Fall ${f.id})` });
  await kycIntern.aendernBereit((w) => {
    const x = fallById(w, f.id);
    if (x) verlauf(x, x.status, n, "nutzer", `Videotermin gebucht: ${r.termin.zeitraum}`, { oeffentlich: false });
    protokoll(w, n, "kyc_video", "kyc", f.id, `Videotermin gebucht (${r.termin.id})`);
  });
  return kycVideo(n);
}

export async function kycVideoStornieren(n) {
  angemeldet(n);
  const db = await kycIntern.lesenBereit();
  const t = identTermin(db, n.id);
  if (!t) throw nichtGefunden("Kein gebuchter Videotermin.");
  await terminAendern(n, t.id, { aktion: "stornieren", grund: "Abgesagt unter „Verifizierung“" });
  return kycVideo(n);
}

// ================================================================ Compliance

const maskiert = (email) => String(email || "").replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}${"•".repeat(Math.min(6, b.length))}${c}`);

function eintrag(p, n, text) {
  p.eintraege = [...(p.eintraege || []), { am: jetzt(), vonId: n.id, text: v.text(text, 400) }].slice(-200);
}

/**
 * Aktionen im Gespräch. Liefert { ok, hinweis, video } bzw. { ok:false, error } (falscher TAN: Versuch wird gezählt).
 *   start                          – Gespräch beginnen (Durchführende/r = angemeldete Compliance-Person)
 *   punkt { punkt, ok, notiz }     – Checklistenpunkt bestätigen/verneinen (mit Zeitstempel)
 *   tan_senden { kanal: email }    – Einmalcode erzeugen und an die hinterlegte E-Mail senden (nur Hash gespeichert)
 *   tan_pruefen { code }           – vorgelesenen Code prüfen (max. 3 Versuche, 10 Minuten gültig)
 *   notiz { text }                 – Protokollnotiz
 *   abschluss { ergebnis, begruendung, abbruchgrund } – bestanden | abgebrochen | verdacht
 */
export async function kycVideoAktion(n, fallId, daten = {}) {
  complianceNoetig(n);
  await bereit();
  const aktion = v.auswahl(daten.aktion, ["start", "punkt", "tan_senden", "tan_pruefen", "notiz", "abschluss"], "");
  if (!aktion) throw ungueltig("Unbekannte Aktion.");
  return kycIntern.aendernBereit((db) => {
    const f = fallById(db, fallId);
    if (!f) throw nichtGefunden("KYC-Fall nicht gefunden.");
    if (f.kontoId === n.id) throw verboten("Den eigenen KYC-Fall prüft eine andere Person der Compliance.");
    const e = kycEinstellungenDb(db);
    f.video = f.video || { protokolle: [], ergebnis: null };
    const liste = f.video.protokolle;
    let p = liste.find((x) => !x.beendetAm) || null;
    let hinweis = "";
    if (aktion === "start") {
      if (ABGESCHLOSSEN.includes(f.status)) throw konflikt("Der Fall ist abgeschlossen.");
      if (p) throw konflikt(`Es läuft bereits ein Gespräch (${nameVon(db, p.durchfuehrenderId)}).`);
      const t = identTermin(db, f.kontoId);
      p = { id: neueId("KV"), terminId: t?.id || null, termin: t ? { start: t.start, ende: t.ende } : null, durchfuehrenderId: n.id, gestartetAm: jetzt(), link: e.videoLink || "", punkte: {}, eintraege: [], tan: null, ergebnis: null, begruendung: "", abbruchgrund: "", beendetAm: null, hash: null };
      eintrag(p, n, t ? "Gespräch begonnen (gebuchter Termin)" : "Gespräch begonnen (ohne gebuchten Termin)");
      liste.push(p);
      if (liste.length > 20) liste.splice(0, liste.length - 20);
      protokoll(db, n, "kyc_video", "kyc", f.id, `Videoidentifizierung begonnen (${p.id})`);
      return { ok: true, hinweis: "Gespräch begonnen. Bitte zuerst die Einwilligung einholen.", protokollId: p.id };
    }
    if (!p) throw konflikt("Es läuft kein Gespräch. Bitte zuerst „Gespräch beginnen“.");
    if (p.durchfuehrenderId !== n.id) throw konflikt(`Dieses Gespräch führt ${nameVon(db, p.durchfuehrenderId) || "eine andere Person"} – nur sie bzw. er kann es protokollieren.`);

    if (aktion === "punkt") {
      const id = v.auswahl(daten.punkt, KYC_VIDEO_PUNKT_IDS.filter((x) => x !== "tan"), "");
      v.pflicht(id, "Unbekannter Prüfpunkt.");
      const ok = v.wahr(daten.ok);
      const notiz = v.text(daten.notiz, 300);
      p.punkte[id] = { ok, notiz, am: jetzt(), vonId: n.id };
      eintrag(p, n, `${KYC_VIDEO_CHECKLISTE.find((x) => x.id === id).label}: ${ok ? "bestätigt" : "NICHT bestätigt"}${notiz ? ` – ${notiz}` : ""}`);
    } else if (aktion === "tan_senden") {
      const kanal = v.auswahl(daten.kanal, ["email", "sms"], "email");
      if (kanal === "sms") throw ungueltig("Der SMS-Versand ist nicht eingerichtet – bitte den Code per E-Mail senden.");
      if ((p.tan?.sendungen || 0) >= 5) throw konflikt("Zu viele Codes in diesem Gespräch – bitte abbrechen und neu beginnen.");
      const u = nutzerById(db, f.kontoId);
      if (!u?.email) throw konflikt("Für das Konto ist keine E-Mail-Adresse hinterlegt.");
      const code = String(randomInt(0, 10 ** KYC_TAN.stellen)).padStart(KYC_TAN.stellen, "0");
      p.tan = { kanal, hash: sha256(`${p.id}:${code}`), gesendetAm: jetzt(), gueltigBis: new Date(Date.now() + KYC_TAN.gueltigMinuten * 60e3).toISOString(), versuche: 0, bestaetigt: false, bestaetigtAm: null, sendungen: (p.tan?.sendungen || 0) + 1 };
      mailAblegen(db, {
        an: u.email, anName: nameVon(db, u.id), nutzerId: u.id, art: "kyc", betreff: "Ihr Bestätigungscode – ÖkoInvest",
        text: `Ihr Einmalcode für das laufende Videogespräch zur Identitätsprüfung lautet: ${code}\n\nDer Code ist ${KYC_TAN.gueltigMinuten} Minuten gültig. Nennen Sie ihn nur im laufenden Gespräch mit unserer Compliance. Haben Sie kein Gespräch mit uns, ignorieren Sie diese E-Mail bitte.`,
        link: "/portal/verifizierung", linkText: "Zur Verifizierung", hinweis: "Diese E-Mail enthält nur einen Einmalcode, keine Unterlagen.",
      });
      eintrag(p, n, `Einmalcode per E-Mail an ${maskiert(u.email)} gesendet`);
      hinweis = `Code an ${maskiert(u.email)} gesendet – gültig ${KYC_TAN.gueltigMinuten} Minuten.`;
    } else if (aktion === "tan_pruefen") {
      if (!p.tan) throw konflikt("Bitte zuerst einen Code senden.");
      if (p.tan.bestaetigt) return { ok: true, hinweis: "Der Code ist bereits bestätigt." };
      if (Date.now() > new Date(p.tan.gueltigBis).getTime()) throw konflikt("Der Code ist abgelaufen – bitte einen neuen senden.");
      if (p.tan.versuche >= KYC_TAN.versuche) throw konflikt("Zu viele Fehlversuche – bitte einen neuen Code senden.");
      const code = String(daten.code || "").replace(/\D/g, "").slice(0, 12);
      if (sha256(`${p.id}:${code}`) !== p.tan.hash) {
        p.tan.versuche += 1;
        eintrag(p, n, `Einmalcode falsch (Versuch ${p.tan.versuche} von ${KYC_TAN.versuche})`);
        protokoll(db, n, "kyc_video", "kyc", f.id, `Videoidentifizierung ${p.id}: Einmalcode falsch`);
        return { ok: false, error: `Der Code stimmt nicht (noch ${KYC_TAN.versuche - p.tan.versuche} Versuch${KYC_TAN.versuche - p.tan.versuche === 1 ? "" : "e"}).` };
      }
      p.tan.bestaetigt = true;
      p.tan.bestaetigtAm = jetzt();
      p.punkte.tan = { ok: true, notiz: "Einmalcode bestätigt", am: p.tan.bestaetigtAm, vonId: n.id };
      eintrag(p, n, "Einmalcode bestätigt");
      hinweis = "Einmalcode bestätigt.";
    } else if (aktion === "notiz") {
      const t = v.mehrzeilig(daten.text, 600);
      v.pflicht(t.length >= 2, "Bitte Notiz eingeben.");
      eintrag(p, n, `Notiz: ${t}`);
    } else if (aktion === "abschluss") {
      const ergebnis = v.auswahl(daten.ergebnis, Object.keys(KYC_VIDEO_ERGEBNISSE), "");
      const begruendung = v.mehrzeilig(daten.begruendung, 1500);
      const abbruchgrund = ergebnis === "abgebrochen" ? v.auswahl(daten.abbruchgrund, Object.keys(KYC_VIDEO_ABBRUCHGRUENDE), "") : "";
      const pr = videoAbschlussPruefen(p, { ergebnis, begruendung, abbruchgrund });
      if (!pr.ok) throw ungueltig(pr.fehler.join(" "));
      Object.assign(p, { ergebnis, begruendung, abbruchgrund, beendetAm: jetzt() });
      eintrag(p, n, `Gespräch beendet: ${KYC_VIDEO_ERGEBNISSE[ergebnis].label}${abbruchgrund ? ` (${KYC_VIDEO_ABBRUCHGRUENDE[abbruchgrund]})` : ""}`);
      p.hinweis = KYC_VIDEO_HINWEIS;
      p.hash = sha256(kanonischJson({ ...p, hash: undefined, tan: p.tan ? { ...p.tan, hash: undefined } : null }));
      f.video.ergebnis = liste.some((x) => x.ergebnis === "verdacht") ? "verdacht" : ergebnis;
      // Der genutzte Termin hat stattgefunden (Kalender): danach kann bei Abbruch ein neuer gebucht werden
      const t = p.terminId ? (db.service?.termine || []).find((x) => x.id === p.terminId) : null;
      if (t && TERMIN_AKTIV.includes(t.status)) {
        t.status = "erledigt";
        t.verlauf = [...(t.verlauf || []), { am: jetzt(), text: "Videoidentifizierung durchgeführt (KYC)", vonId: n.id }];
      }
      if (!f.risiko?.manuell && f.risiko) f.risiko = { ...kycRisiko(f, e), manuell: false }; // Verdacht fließt ins Risiko
      verlauf(f, f.status, n, "compliance", `Videoidentifizierung: ${KYC_VIDEO_ERGEBNISSE[ergebnis].label}`, { oeffentlich: false });
      if (ergebnis === "verdacht") {
        complianceMelden(db, f, `Videoidentifizierung mit Verdacht: ${f.id}`, "Bitte Geldwäschebeauftragten einbeziehen.", { ohneId: n.id });
        hinweis = "Verdacht dokumentiert: Geldwäschebeauftragten einbeziehen, Meldepflicht prüfen, keine Mittel bereitstellen. Die Person darf darüber nicht informiert werden.";
      } else if (ergebnis === "abgebrochen") {
        nutzerMelden(db, f, "Videogespräch nicht abgeschlossen", "Bitte buchen Sie unter „Verifizierung“ einen neuen Termin für das Videogespräch.");
        hinweis = "Gespräch abgebrochen – die Person wird gebeten, einen neuen Termin zu buchen.";
      } else {
        hinweis = "Videoidentifizierung bestanden. Die Entscheidung über die Verifizierung erfolgt wie gewohnt (bei hohem Risiko Vier-Augen, Freigabe durch eine andere Person).";
      }
    }
    f.geaendertAm = jetzt();
    protokoll(db, n, "kyc_video", "kyc", f.id, `Videoidentifizierung ${p.id}: ${aktion}${aktion === "abschluss" ? ` → ${p.ergebnis}` : aktion === "punkt" ? ` ${daten.punkt}` : ""}`);
    return { ok: true, hinweis, protokollId: p.id };
  });
}

/** Daten für das Protokoll-PDF (nur Compliance; Abruf im Revisionsprotokoll) */
export async function kycVideoProtokoll(n, fallId, protokollId, { ip = "" } = {}) {
  complianceNoetig(n);
  return kycIntern.aendernBereit((db) => {
    const f = fallById(db, fallId);
    if (!f) throw nichtGefunden("KYC-Fall nicht gefunden.");
    const p = (f.video?.protokolle || []).find((x) => x.id === v.kennung(protokollId));
    if (!p) throw nichtGefunden("Protokoll nicht gefunden.");
    protokoll(db, n, "kyc_zugriff", "kyc", f.id, `Videoprotokoll ${p.id} als PDF abgerufen`, ip);
    const person = f.person || {};
    return {
      fall: { id: f.id, kontotyp: f.kontotyp, bezeichnung: f.kontotyp === "unternehmen" ? f.firma?.name || "" : [person.vorname, person.nachname].filter(Boolean).join(" ") },
      person: { name: [person.vorname, person.nachname].filter(Boolean).join(" "), geburtsdatum: person.geburtsdatum || "", ausweisArt: person.ausweis?.art || "", ausweisNummer: person.ausweis?.nummer || "" },
      protokoll: { ...p, tan: p.tan ? { kanal: p.tan.kanal, gesendetAm: p.tan.gesendetAm, versuche: p.tan.versuche, bestaetigt: !!p.tan.bestaetigt, bestaetigtAm: p.tan.bestaetigtAm } : null },
      namen: Object.fromEntries([p.durchfuehrenderId, ...(p.eintraege || []).map((x) => x.vonId)].filter(Boolean).map((id) => [id, nameVon(db, id) || id])),
      erstelltVon: nameVon(db, n.id) || n.id,
    };
  });
}
