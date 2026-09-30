// src/lib/plattform/dienste/identitaet/anbieter.js
//
// Anbieter-neutrale Schnittstelle „Identitätsprüfung“ (nur serverseitig – nutzt node:crypto und Umgebungsvariablen).
//
//   Sitzung starten → Redirect-/Embed-URL → Person identifiziert sich beim Anbieter → Webhook mit Ergebnis
//   (HMAC-Signatur über den Roh-Body, zeitkonstant geprüft) → Ergebnis wird als HINWEIS an den KYC-Fall gehängt.
//   Die finale KYC-Entscheidung trifft immer die Compliance (oder – vertraglich geregelt – der Anbieter).
//
// Konfiguration (Umgebung der Website bzw. site_config in Frappe, siehe docs/DIENSTE-EXTERN.md):
//   IDENT_ANBIETER        demo | veriff | sumsub | onfido | idnow | webid   (Standard: demo außerhalb der Produktion)
//   IDENT_API_URL         Basis-URL der Anbieter-API (z. B. https://stationapi.veriff.com)
//   IDENT_API_KEY         API-Schlüssel / App-Token / Login (nur Server)
//   IDENT_API_SECRET      zweites Geheimnis, falls der Anbieter Anfragen signiert (Sumsub)
//   IDENT_WEBHOOK_SECRET  gemeinsames Geheimnis für die Webhook-Signatur (≥ 16 Zeichen)
//   IDENT_STUFE           Prüfprofil beim Anbieter (Sumsub levelName, Onfido workflow_id, IDnow Produkt …)
//
// Die Signaturverfahren der Anbieter stehen in IDENT_ANBIETER[…].signatur; vor dem Livegang gegen die aktuelle
// Anbieter-Dokumentation prüfen (docs/DIENSTE-EXTERN.md, Abschnitt Identitätsprüfung).

import { createHmac, timingSafeEqual } from "node:crypto";

const DEMO_GEHEIMNIS = "oekoinvest-demo-ident-webhook-nur-entwicklung"; // greift nie in Produktion

/**
 * Anbieter-Steckbriefe.
 * signatur: header (Kleinbuchstaben), alg (sha256|sha512|sha1 bzw. aus algHeader), kodierung hex|base64,
 *           ueber: "body" | "zeit.body" (Zeitstempel-Header + "." + Body, Schutz gegen Wiederholung)
 */
export const IDENT_ANBIETER = {
  demo: {
    label: "Demo-Simulator",
    verfahren: ["Simulation (keine echte Identifizierung)"],
    signatur: { header: "x-oekoinvest-signatur", alg: "sha256", kodierung: "hex", ueber: "zeit.body", zeitHeader: "x-oekoinvest-zeit" },
  },
  veriff: {
    label: "Veriff",
    verfahren: ["Dokument + Selfie (Auto-Ident)", "NFC-Chip (Option)"],
    signatur: { header: "x-hmac-signature", alg: "sha256", kodierung: "hex", ueber: "body" },
  },
  sumsub: {
    label: "Sumsub",
    verfahren: ["Dokument + Liveness", "Video-Ident (Option)", "NFC (Option)"],
    signatur: { header: "x-payload-digest", algHeader: "x-payload-digest-alg", alg: "sha256", kodierung: "hex", ueber: "body" },
  },
  onfido: {
    label: "Onfido (Entrust)",
    verfahren: ["Dokument + Biometrie", "NFC (Option)"],
    signatur: { header: "x-sha2-signature", alg: "sha256", kodierung: "hex", ueber: "body" },
  },
  idnow: {
    label: "IDnow",
    verfahren: ["VideoIdent", "AutoIdent", "eID (Online-Ausweisfunktion)"],
    // IDnow signiert Webhooks nicht einheitlich je Produkt – hier gemeinsames Geheimnis im eigenen Header (per Vertrag
    // bzw. Reverse-Proxy setzen); Details siehe docs/DIENSTE-EXTERN.md.
    signatur: { header: "x-oekoinvest-signatur", alg: "sha256", kodierung: "hex", ueber: "body" },
  },
  webid: {
    label: "WebID",
    verfahren: ["Video-Ident", "eID", "Bank-Ident"],
    signatur: { header: "x-oekoinvest-signatur", alg: "sha256", kodierung: "hex", ueber: "body" },
  },
};
export const IDENT_ANBIETER_IDS = Object.keys(IDENT_ANBIETER);

/** Ergebnisse (anbieterneutral) */
export const IDENT_ERGEBNIS = {
  ausstehend: { label: "Läuft", ton: "info" },
  bestanden: { label: "Bestanden (Anbieter)", ton: "ok" },
  pruefen: { label: "Manuelle Prüfung nötig", ton: "warn" },
  abgelehnt: { label: "Nicht bestanden", ton: "warn" },
  abgebrochen: { label: "Abgebrochen / abgelaufen", ton: "neutral" },
};

// ---------------------------------------------------------------- Konfiguration

export function identKonfig(env = process.env) {
  const prod = env.NODE_ENV === "production";
  const gewuenscht = String(env.IDENT_ANBIETER || "").toLowerCase().trim();
  const anbieter = IDENT_ANBIETER[gewuenscht] ? gewuenscht : prod ? "" : "demo";
  let geheimnis = String(env.IDENT_WEBHOOK_SECRET || "");
  if (!geheimnis && anbieter === "demo" && !prod) geheimnis = DEMO_GEHEIMNIS;
  return {
    anbieter,
    label: IDENT_ANBIETER[anbieter]?.label || "nicht konfiguriert",
    apiUrl: String(env.IDENT_API_URL || "").replace(/\/$/, ""),
    apiKey: String(env.IDENT_API_KEY || ""),
    apiSecret: String(env.IDENT_API_SECRET || ""),
    geheimnis,
    stufe: String(env.IDENT_STUFE || ""),
    aktiv: !!anbieter && (anbieter === "demo" ? !prod || env.PLATTFORM_DEMO === "1" : !!(env.IDENT_API_KEY && geheimnis.length >= 16)),
    demo: anbieter === "demo",
  };
}

// ---------------------------------------------------------------- Webhook-Signatur

function hmac(alg, geheimnis, daten, kodierung) {
  return createHmac(alg, geheimnis).update(daten).digest(kodierung);
}

/** Zeitkonstanter Vergleich zweier Signaturen (unterschiedliche Längen → false) */
export function signaturGleich(a, b) {
  const x = Buffer.from(String(a || ""), "utf8");
  const y = Buffer.from(String(b || ""), "utf8");
  if (!x.length || x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

const ALG_AUS_HEADER = { HMAC_SHA1_HEX: "sha1", HMAC_SHA256_HEX: "sha256", HMAC_SHA512_HEX: "sha512" };

/**
 * Signatur eines eingehenden Webhooks prüfen.
 * kopf: Funktion (name) => Wert (z. B. request.headers.get), roh: Roh-Body als String (NICHT neu serialisieren).
 * Liefert { ok, grund }. Bei „zeit.body“ zusätzlich Zeitfenster ±5 min (Wiederholungsschutz).
 */
export function webhookSignaturPruefen(anbieter, kopf, roh, { geheimnis, jetztMs = Date.now() } = {}) {
  const def = IDENT_ANBIETER[anbieter]?.signatur;
  if (!def) return { ok: false, grund: "anbieter" };
  if (!geheimnis) return { ok: false, grund: "kein_geheimnis" };
  let gesendet = String(kopf(def.header) || "").trim();
  if (!gesendet) return { ok: false, grund: "keine_signatur" };
  if (gesendet.startsWith("sha256=")) gesendet = gesendet.slice(7);
  let alg = def.alg;
  if (def.algHeader) {
    const a = ALG_AUS_HEADER[String(kopf(def.algHeader) || "").toUpperCase()];
    if (a) alg = a;
    if (alg === "sha1") return { ok: false, grund: "algorithmus" }; // SHA-1 nicht akzeptieren
  }
  let daten = roh;
  if (def.ueber === "zeit.body") {
    const zeit = Number(kopf(def.zeitHeader));
    if (!Number.isFinite(zeit) || Math.abs(jetztMs - zeit * 1000) > 5 * 60 * 1000) return { ok: false, grund: "zeit" };
    daten = `${zeit}.${roh}`;
  }
  const erwartet = hmac(alg, geheimnis, daten, def.kodierung);
  return signaturGleich(def.kodierung === "hex" ? gesendet.toLowerCase() : gesendet, erwartet) ? { ok: true, grund: "" } : { ok: false, grund: "signatur" };
}

/** Kopfzeilen für einen signierten Webhook erzeugen (Demo-Simulator und Tests) */
export function webhookSignieren(anbieter, roh, { geheimnis, zeit = Math.floor(Date.now() / 1000) } = {}) {
  const def = IDENT_ANBIETER[anbieter].signatur;
  const daten = def.ueber === "zeit.body" ? `${zeit}.${roh}` : roh;
  const kopf = { [def.header]: hmac(def.alg, geheimnis, daten, def.kodierung) };
  if (def.zeitHeader) kopf[def.zeitHeader] = String(zeit);
  if (def.algHeader) kopf[def.algHeader] = "HMAC_SHA256_HEX";
  return kopf;
}

// ---------------------------------------------------------------- Ergebnis normalisieren

const kurz = (s, max = 200) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

/**
 * Webhook-Payload eines Anbieters → { sitzungId, externeId, ergebnis, verfahren, grund, ereignisId, daten{} }
 * sitzungId = unsere Kennung (beim Start als vendorData/externalUserId/Transaktionsnummer übergeben).
 * Liefert null, wenn das Ereignis kein Endergebnis ist (z. B. „Sitzung gestartet“) – wird quittiert, aber ignoriert.
 */
export function webhookNormalisieren(anbieter, p = {}) {
  if (!p || typeof p !== "object") return null;
  if (anbieter === "demo") {
    const e = ["bestanden", "pruefen", "abgelehnt", "abgebrochen"].includes(p.ergebnis) ? p.ergebnis : null;
    if (!e) return null;
    return { sitzungId: kurz(p.sitzungId, 40), externeId: kurz(p.externeId, 80), ergebnis: e, verfahren: kurz(p.verfahren, 60) || "Simulation", grund: kurz(p.grund, 300), ereignisId: kurz(p.ereignisId, 80), daten: { nfc: !!p.nfc, liveness: !!p.liveness } };
  }
  if (anbieter === "veriff") {
    const v = p.verification || {};
    const status = String(v.status || p.status || "").toLowerCase();
    const map = { approved: "bestanden", declined: "abgelehnt", resubmission_requested: "pruefen", review: "pruefen", expired: "abgebrochen", abandoned: "abgebrochen" };
    if (!map[status]) return null;
    return { sitzungId: kurz(v.vendorData || p.vendorData, 40), externeId: kurz(v.id || p.id, 80), ergebnis: map[status], verfahren: "Veriff", grund: kurz(v.reason || "", 300), ereignisId: kurz(`${v.id || p.id}:${status}`, 80), daten: { code: v.code || null } };
  }
  if (anbieter === "sumsub") {
    if (!["applicantReviewed", "applicantOnHold"].includes(p.type)) return null;
    const antwort = p.reviewResult?.reviewAnswer;
    const endgueltig = p.reviewResult?.reviewRejectType === "FINAL";
    const e = p.type === "applicantOnHold" ? "pruefen" : antwort === "GREEN" ? "bestanden" : antwort === "RED" ? (endgueltig ? "abgelehnt" : "pruefen") : null;
    if (!e) return null;
    return { sitzungId: kurz(p.externalUserId, 40), externeId: kurz(p.applicantId, 80), ergebnis: e, verfahren: "Sumsub", grund: kurz((p.reviewResult?.rejectLabels || []).join(", "), 300), ereignisId: kurz(`${p.applicantId}:${p.correlationId || p.createdAtMs || p.type}`, 80), daten: {} };
  }
  if (anbieter === "onfido") {
    const r = p.payload || {};
    if (r.resource_type !== "workflow_run" || r.action !== "workflow_run.completed") return null;
    const status = String(r.object?.status || "").toLowerCase();
    const map = { approved: "bestanden", declined: "abgelehnt", review: "pruefen", abandoned: "abgebrochen", error: "pruefen" };
    if (!map[status]) return null;
    return { sitzungId: kurz(r.object?.tags?.find?.((t) => /^IP-/.test(t)) || r.object?.customer_user_id, 40), externeId: kurz(r.object?.id, 80), ergebnis: map[status], verfahren: "Onfido", grund: "", ereignisId: kurz(`${r.object?.id}:${status}`, 80), daten: {} };
  }
  if (anbieter === "idnow") {
    const ip = p.identificationprocess || {};
    const res = String(ip.result || "").toUpperCase();
    const map = { SUCCESS: "bestanden", SUCCESS_DATA_CHANGED: "pruefen", REVIEW_PENDING: "pruefen", FRAUD_SUSPICION_PENDING: "pruefen", FRAUD_SUSPICION_CONFIRMED: "abgelehnt", CANCELED: "abgebrochen", ABORTED: "abgebrochen" };
    if (!map[res]) return null;
    return { sitzungId: kurz(ip.transactionnumber, 40), externeId: kurz(ip.id, 80), ergebnis: map[res], verfahren: `IDnow ${kurz(ip.type || "", 30)}`.trim(), grund: kurz(ip.reason, 300), ereignisId: kurz(`${ip.id}:${res}`, 80), daten: {} };
  }
  if (anbieter === "webid") {
    const res = String(p.result || p.status || "").toLowerCase();
    const map = { success: "bestanden", successful: "bestanden", review: "pruefen", failed: "abgelehnt", cancelled: "abgebrochen", canceled: "abgebrochen" };
    if (!map[res]) return null;
    return { sitzungId: kurz(p.transactionId || p.reference, 40), externeId: kurz(p.actionId || p.id, 80), ergebnis: map[res], verfahren: "WebID", grund: kurz(p.reason, 300), ereignisId: kurz(`${p.actionId || p.id}:${res}`, 80), daten: {} };
  }
  return null;
}

// ---------------------------------------------------------------- Sitzung beim Anbieter starten

async function abrufen(url, init, { timeoutMs = 15000 } = {}) {
  let res;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  } catch {
    throw Object.assign(new Error("Der Identitätsanbieter ist nicht erreichbar."), { status: 502 });
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`Der Identitätsanbieter hat die Sitzung abgelehnt (HTTP ${res.status}).`), { status: 502 });
  return json;
}

/**
 * Sitzung beim Anbieter anlegen. sitzung: { id (unsere Kennung), vorname, nachname, email, sprache, rueckUrl, webhookUrl }
 * Liefert { url, externeId, modus: redirect|embed }. Demo: URL auf die eigene Simulator-Seite.
 */
export async function sitzungStarten(k, sitzung) {
  if (k.anbieter === "demo") {
    return { url: `/portal/verifizierung/identitaet?sitzung=${encodeURIComponent(sitzung.id)}`, externeId: `DEMO-${sitzung.id}`, modus: "redirect" };
  }
  if (!k.aktiv || !k.apiUrl) throw Object.assign(new Error("Die Identitätsprüfung ist nicht konfiguriert."), { status: 503 });
  if (k.anbieter === "veriff") {
    const j = await abrufen(`${k.apiUrl}/v1/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-AUTH-CLIENT": k.apiKey },
      body: JSON.stringify({ verification: { callback: sitzung.rueckUrl, vendorData: sitzung.id, person: { firstName: sitzung.vorname, lastName: sitzung.nachname } } }),
    });
    return { url: j.verification?.url, externeId: j.verification?.id, modus: "redirect" };
  }
  if (k.anbieter === "sumsub") {
    const pfad = `/resources/sdkIntegrations/levels/-/websdkLink?ttlInSecs=1800&externalUserId=${encodeURIComponent(sitzung.id)}&levelName=${encodeURIComponent(k.stufe || "basic-kyc-level")}&lang=de`;
    const ts = Math.floor(Date.now() / 1000);
    const sig = createHmac("sha256", k.apiSecret).update(`${ts}POST${pfad}`).digest("hex");
    const j = await abrufen(`${k.apiUrl}${pfad}`, { method: "POST", headers: { "X-App-Token": k.apiKey, "X-App-Access-Ts": String(ts), "X-App-Access-Sig": sig, Accept: "application/json" } });
    return { url: j.url, externeId: null, modus: "redirect" };
  }
  if (k.anbieter === "onfido") {
    const kopf = { "Content-Type": "application/json", Authorization: `Token token=${k.apiKey}` };
    const a = await abrufen(`${k.apiUrl}/v3.6/applicants`, { method: "POST", headers: kopf, body: JSON.stringify({ first_name: sitzung.vorname, last_name: sitzung.nachname }) });
    const w = await abrufen(`${k.apiUrl}/v3.6/workflow_runs`, { method: "POST", headers: kopf, body: JSON.stringify({ workflow_id: k.stufe, applicant_id: a.id, tags: [sitzung.id], link: { completed_redirect_url: sitzung.rueckUrl } }) });
    return { url: w.link?.url, externeId: w.id, modus: "redirect" };
  }
  // IDnow / WebID: Start-Aufrufe sind produkt- und vertragsspezifisch (Firmenkennung, Produkt, Login-Token) –
  // Anbindung nach Vertragsschluss gemäß Anbieter-Handbuch ergänzen.
  throw Object.assign(new Error(`Die Anbindung an ${IDENT_ANBIETER[k.anbieter]?.label || k.anbieter} ist vorbereitet, aber noch nicht freigeschaltet.`), { status: 501 });
}
