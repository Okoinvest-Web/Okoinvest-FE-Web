// src/lib/plattform/dienste/bonitaet/adapter.js
//
// Bonitäts-Adapter (nur serverseitig). Auskunfteien (KSV1870, Creditreform, CRIF, Dun & Bradstreet) liefern Daten
// nur mit Vertrag/Mitgliedschaft; Schnittstellen und Produkte unterscheiden sich je Vertrag (REST, SOAP, Batch).
// Die Plattform spricht deshalb einen NEUTRALEN Vertrag, den ein kleiner Übersetzer beim Anbieter-Zugang erfüllt:
//
//   POST {BONITAET_API_URL}/auskunft   Authorization: Bearer {BONITAET_API_KEY}
//        { land, name, registernummer, anschrift, produkt }
//   →    { status: abgeschlossen|keine_daten, score, skala, kreditlimit, waehrung, ausfallwahrscheinlichkeit (0–1),
//          zahlungsweise, negativmerkmale: [text], referenz, auskunftAm, pdfBase64? }
//
// Konfiguration: BONITAET_ANBIETER (demo | ksv1870 | creditreform | crif | dnb), BONITAET_API_URL, BONITAET_API_KEY,
// BONITAET_PRODUKT (optional). Ohne Konfiguration außerhalb der Produktion: deterministischer Demo-Simulator.
// Zeitlimit 20 s, eine Wiederholung bei Netzwerkfehler/5xx (Backoff 1,5 s). Schlüssel erscheinen nie in Logs/Antworten.

import { createHash } from "node:crypto";
import { BONITAET_ANBIETER, bonitaetAmpel } from "./basis";

export function bonitaetKonfig(env = process.env) {
  const prod = env.NODE_ENV === "production";
  const a = String(env.BONITAET_ANBIETER || "").toLowerCase();
  const anbieter = BONITAET_ANBIETER[a] ? a : prod ? "" : "demo";
  return {
    anbieter,
    label: BONITAET_ANBIETER[anbieter]?.label || "nicht konfiguriert",
    url: String(env.BONITAET_API_URL || "").replace(/\/$/, ""),
    key: String(env.BONITAET_API_KEY || ""),
    produkt: String(env.BONITAET_PRODUKT || ""),
    aktiv: anbieter === "demo" ? !prod || env.PLATTFORM_DEMO === "1" : !!(env.BONITAET_API_URL && env.BONITAET_API_KEY),
    demo: anbieter === "demo",
  };
}

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

async function extern(k, daten) {
  for (let i = 1; ; i++) {
    let res;
    try {
      res = await fetch(`${k.url}/auskunft`, {
        method: "POST",
        headers: { Authorization: `Bearer ${k.key}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...daten, produkt: k.produkt || undefined }),
        signal: AbortSignal.timeout(20000),
        cache: "no-store",
      });
    } catch {
      if (i < 2) {
        await warte(1500);
        continue;
      }
      throw Object.assign(new Error("Die Auskunftei ist derzeit nicht erreichbar."), { status: 502 });
    }
    if (res.status >= 500 && i < 2) {
      await warte(1500);
      continue;
    }
    if (!res.ok) throw Object.assign(new Error(`Die Auskunftei hat die Anfrage abgelehnt (HTTP ${res.status}).`), { status: 502 });
    return res.json();
  }
}

/** Deterministischer Simulator: gleiche Firma → gleiche Auskunft. „Insolvent/Liquidation“ im Namen → rot. */
function demoAuskunft({ name, land }) {
  const h = createHash("sha256").update(String(name).toLowerCase()).digest();
  const kritisch = /insolven|liquidation|konkurs/i.test(name);
  const score = kritisch ? 520 + (h[0] % 60) : 140 + ((h[0] * 7 + h[1]) % 230); // 140–369
  const pd = Math.round((kritisch ? 0.18 + (h[2] % 10) / 100 : 0.002 + (score - 140) / 9000) * 1000) / 1000;
  const limit = kritisch ? 0 : Math.round((250000 + (h[3] % 40) * 125000) / 5000) * 5000;
  return {
    status: "abgeschlossen",
    score,
    skala: BONITAET_ANBIETER.demo.skala,
    kreditlimit: limit,
    waehrung: land === "CH" ? "CHF" : "EUR",
    ausfallwahrscheinlichkeit: pd,
    zahlungsweise: kritisch ? "Zahlungsstörungen bekannt" : score <= 250 ? "innerhalb vereinbarter Ziele" : "gelegentlich verzögert",
    negativmerkmale: kritisch ? ["Insolvenzverfahren eröffnet (Demo)"] : [],
    referenz: `DEMO-${h.toString("hex").slice(0, 10).toUpperCase()}`,
    auskunftAm: new Date().toISOString(),
  };
}

/**
 * Auskunft einholen. subjekt: { name, land, registernummer, anschrift }
 * Liefert normalisiert { anbieter, anbieterLabel, status, score, skala, ampel, kreditlimit, waehrung, ausfallwahrscheinlichkeit,
 *   zahlungsweise, negativmerkmale[], referenz, auskunftAm, demo, pdfBase64? }
 */
/** Zahl oder null – `null`/"" der Auskunftei bleiben „keine Angabe“ (Number(null) wäre 0) */
const zahlOderNull = (x) => (x === null || x === undefined || x === "" || !Number.isFinite(Number(x)) ? null : Number(x));

export async function bonitaetAbrufen(subjekt, env = process.env) {
  const k = bonitaetKonfig(env);
  if (!k.anbieter || !k.aktiv) throw Object.assign(new Error("Die Bonitätsauskunft ist nicht konfiguriert (Vertrag mit einer Auskunftei erforderlich)."), { status: 503 });
  const daten = { land: subjekt.land, name: subjekt.name, registernummer: subjekt.registernummer || "", anschrift: subjekt.anschrift || "" };
  const r = k.demo ? demoAuskunft(daten) : await extern(k, daten);
  const status = r?.status === "keine_daten" ? "keine_daten" : "abgeschlossen";
  const score = zahlOderNull(r?.score);
  return {
    anbieter: k.anbieter,
    anbieterLabel: k.label,
    status,
    score,
    skala: String(r?.skala || BONITAET_ANBIETER[k.anbieter]?.skala || "").slice(0, 120),
    ampel: status === "keine_daten" ? "unbekannt" : bonitaetAmpel(k.anbieter, score),
    kreditlimit: zahlOderNull(r?.kreditlimit),
    waehrung: /^[A-Z]{3}$/.test(String(r?.waehrung || "")) ? r.waehrung : "EUR",
    ausfallwahrscheinlichkeit: zahlOderNull(r?.ausfallwahrscheinlichkeit),
    zahlungsweise: String(r?.zahlungsweise || "").slice(0, 160),
    negativmerkmale: (Array.isArray(r?.negativmerkmale) ? r.negativmerkmale : []).slice(0, 10).map((x) => String(x).slice(0, 200)),
    referenz: String(r?.referenz || "").slice(0, 80),
    auskunftAm: r?.auskunftAm && !Number.isNaN(Date.parse(r.auskunftAm)) ? new Date(r.auskunftAm).toISOString() : new Date().toISOString(),
    demo: k.demo,
    pdfBase64: typeof r?.pdfBase64 === "string" && r.pdfBase64.length < 8_000_000 ? r.pdfBase64 : null,
  };
}
