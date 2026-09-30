// src/lib/plattform/backend/demo/kycRegeln.js
//
// KYC/KYB-Regeln auf der Demo-Datenbank, die ANDERE Module innerhalb ihrer Schreib-Transaktion brauchen
// (Gating: NDA-Freigabe, LOI, Gebot, Zuschlag, Veröffentlichung, Auszahlung, Contracting-Vertrag).
// Ohne Import von demo.js (keine Zirkelbezüge) – arbeitet direkt auf `db` (Sammlung db.kyc).
//
// Nutzung in fremden Modulen (eine Zeile):
//   import { kycSperre } from "./demo/kycRegeln";   // bzw. "./kycRegeln" aus backend/demo/*
//   kycSperre(db, "nda", { kontoId: interesse.investorId, organisationId: interesse.organisationId });
// wirft PlattformFehler 409 (code "kyc") mit Hinweistext, wenn der Schritt gesperrt ist.

import { PlattformFehler } from "../../fehler";
import { KYC_SCHRITTE, kycEinstellungenStandard, kycFreigabe, kycSchrittAktiv, tageBis } from "../../kyc";

export function kycEinstellungenDb(db) {
  return { ...kycEinstellungenStandard(), ...(db?.kyc?.einstellungen || {}) };
}

/** Maßgeblicher Fall: eigener Fall des Kontos, sonst verifizierter KYB-Fall der Organisation */
export function kycFallFuer(db, { kontoId = null, organisationId = null } = {}) {
  const faelle = db?.kyc?.faelle || [];
  const eigen = kontoId ? faelle.find((f) => f.kontoId === kontoId && !f.organisationId) || faelle.find((f) => f.kontoId === kontoId) : null;
  const org = organisationId ? faelle.find((f) => f.organisationId === organisationId && f.status === "verifiziert") || faelle.find((f) => f.organisationId === organisationId) : null;
  if (eigen?.status === "verifiziert") return eigen;
  if (org?.status === "verifiziert") return org;
  return eigen || org || null;
}

/** kycStatus auf der Datenbank (ohne Rechteprüfung – nur für Backend-Code) */
export function kycStatusDb(db, { kontoId = null, organisationId = null } = {}) {
  const f = kycFallFuer(db, { kontoId, organisationId });
  if (!f) return { kontoId, organisationId, fallId: null, status: "offen", verifiziert: false, kontotyp: null, risiko: null, bank: { vorhanden: false, geprueft: false }, eigentum: [], verifiziertAm: null, naechstePruefung: null, ausweisGueltigBis: null };
  const docs = (db.kyc.dokumente || []).filter((d) => d.fallId === f.id && !d.geloescht);
  const eigentum = [...new Set(docs.filter((d) => d.art === "eigentumsnachweis" && d.status === "ok" && d.flaecheId).map((d) => d.flaecheId))];
  return {
    kontoId: f.kontoId,
    organisationId: f.organisationId || null,
    fallId: f.id,
    status: f.status,
    verifiziert: f.status === "verifiziert",
    kontotyp: f.kontotyp || null,
    risiko: f.risiko?.stufe || null,
    bank: { vorhanden: !!f.bank?.iban, geprueft: f.status === "verifiziert" && !!f.bank?.geprueft },
    eigentum: f.status === "verifiziert" ? eigentum : [],
    verifiziertAm: f.verifiziertAm || null,
    naechstePruefung: f.naechstePruefung || null,
    ausweisGueltigBis: f.person?.ausweis?.gueltigBis || null,
    ausweisTage: tageBis(f.person?.ausweis?.gueltigBis),
  };
}

/** Freigabe prüfen: { ok, aktiv, gruende, hinweis, status } */
export function kycFreigabeDb(db, schritt, { kontoId = null, organisationId = null, flaecheId = null } = {}) {
  const status = kycStatusDb(db, { kontoId, organisationId });
  const aktiv = kycSchrittAktiv(schritt, kontoId, kycEinstellungenDb(db), process.env);
  return { ...kycFreigabe(schritt, status, { aktiv, flaecheId }), schritt, status: status.status };
}

const ERGEBNIS_WERTE = ["ok", "auffaellig", "fehler", "hinweis", "ausstehend"];
const kurzText = (s, max) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

/**
 * Externes Prüfergebnis an einen KYC-Fall anhängen (Identitätsanbieter, MRZ-Vorprüfung, Registerabruf, Bonität …).
 * Nur innerhalb einer Schreib-Transaktion (db). Ergebnisse ENTSCHEIDEN NIE selbst – sie sind Hinweise für die Compliance.
 * eintrag: { quelle, art, ergebnis: ok|auffaellig|fehler|hinweis|ausstehend, zusammenfassung, rohdatenRef?, externeId?, daten? (flach, ≤ 30 Felder) }
 * fall: fallId oder { kontoId } / { organisationId }. Liefert den gespeicherten Eintrag.
 */
export function kycErgebnisAnhaengenDb(db, fall, eintrag = {}) {
  const faelle = db?.kyc?.faelle || [];
  const f = typeof fall === "string" ? faelle.find((x) => x.id === fall) : kycFallFuer(db, fall || {});
  if (!f) throw new PlattformFehler(404, "KYC-Fall nicht gefunden.");
  const quelle = kurzText(eintrag.quelle, 60);
  if (!quelle) throw new PlattformFehler(422, "Quelle des Prüfergebnisses fehlt.");
  const daten = {};
  for (const [k, w] of Object.entries(eintrag.daten && typeof eintrag.daten === "object" ? eintrag.daten : {}).slice(0, 30)) {
    const key = String(k).replace(/[^\w.-]/g, "").slice(0, 40);
    if (!key || ["__proto__", "constructor", "prototype"].includes(key)) continue;
    daten[key] = typeof w === "number" || typeof w === "boolean" ? w : kurzText(w, 300);
  }
  const e = {
    id: `KE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    quelle,
    art: kurzText(eintrag.art, 40) || "pruefung",
    ergebnis: ERGEBNIS_WERTE.includes(eintrag.ergebnis) ? eintrag.ergebnis : "hinweis",
    zusammenfassung: kurzText(eintrag.zusammenfassung, 500),
    rohdatenRef: kurzText(eintrag.rohdatenRef, 300) || null,
    externeId: kurzText(eintrag.externeId, 120) || null,
    daten,
    am: new Date().toISOString(),
  };
  f.pruefergebnisse = [...(f.pruefergebnisse || []), e].slice(-100);
  f.geaendertAm = e.am;
  return { fallId: f.id, ...e };
}

/**
 * Statusübergänge der Zustandsautomaten mit KYC-Pflicht (demo.js → uebergangAnwenden/systemWechsel).
 * werfen=true: 409 mit Hinweis; werfen=false: liefert false (Systemwechsel/Automation wird still übersprungen).
 */
export function kycUebergangPruefen(db, art, o, nach, { werfen = true } = {}) {
  let schritt = null;
  let ziel = null;
  if (art === "interesse" && nach === "nda_freigegeben") {
    schritt = "nda";
    ziel = { kontoId: o.investorId, organisationId: o.organisationId || null, text: "Datenraum-Freigabe nicht möglich: Der Investor ist noch nicht verifiziert (KYC/KYB)." };
  } else if (art === "interesse" && nach === "loi_abgegeben") {
    schritt = "loi";
    ziel = { kontoId: o.investorId, organisationId: o.organisationId || null };
  } else if (art === "projekt" && nach === "veroeffentlicht") {
    schritt = "veroeffentlichung";
    ziel = { kontoId: o.anbieterId, organisationId: o.organisationId || null, text: "Veröffentlichung nicht möglich: Der Anbieter ist noch nicht verifiziert (KYB)." };
  }
  if (!schritt) return true;
  if (werfen) {
    kycSperre(db, schritt, ziel);
    return true;
  }
  return kycFreigabeDb(db, schritt, ziel).ok;
}

/** Wirft 409 (code „kyc“), wenn der Schritt für das Konto (noch) gesperrt ist */
export function kycSperre(db, schritt, ziel = {}) {
  const r = kycFreigabeDb(db, schritt, ziel);
  if (r.ok) return r;
  // ziel.text: eigener Hinweis (z. B. für das Backoffice „Der Investor ist noch nicht verifiziert“); sonst Hinweis für den Nutzer
  const text = ziel.text ? `${ziel.text} ${r.gruende.join(" ")}` : `${KYC_SCHRITTE[schritt]?.hinweis || "Bitte Verifizierung abschließen."} ${r.gruende.join(" ")} (Portal → Verifizierung)`;
  throw new PlattformFehler(409, text.trim(), "kyc");
}
