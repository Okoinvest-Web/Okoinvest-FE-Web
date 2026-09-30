// src/lib/plattform/ki/client.js
//
// Schlanker Client für die Claude Messages API (POST /v1/messages) per fetch – ohne SDK-Paket
// (Projektregel: keine neuen npm-Pakete). Nur serverseitig verwenden.
//
//  - Zeitlimit je Versuch, Wiederholung mit exponentiellem Backoff bei 408/409/429/5xx/529 und
//    Netzwerkfehlern (Retry-After wird beachtet, gedeckelt)
//  - Prompt-Caching: stabile System-Blöcke tragen cache_control (Präfix bleibt byte-identisch)
//  - Serverseitiger Ausweichmechanismus bei Ablehnung durch Sicherheitsklassifikatoren
//    (`fallbacks: "default"`, Beta-Header server-side-fallback-2026-07-01)
//  - stop_reason wird immer geprüft („refusal“, „max_tokens“), bevor Inhalte verwendet werden
//  - Fehlertexte enthalten nie den Schlüssel oder Antwortinhalte

import { kiModell, mitFallback } from "./konfig";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const WIEDERHOLBAR = new Set([408, 409, 429, 500, 502, 503, 504, 529]);

export class KiFehler extends Error {
  constructor(message, { status = 0, art = "fehler", wiederholbar = false } = {}) {
    super(message);
    this.name = "KiFehler";
    this.status = status;
    this.art = art; // fehler | abgelehnt | zeit | netz | konfig | abgeschnitten
    this.wiederholbar = wiederholbar;
  }
}

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

function kopfzeilen() {
  const schluessel = String(process.env.ANTHROPIC_API_KEY || "").trim();
  if (!schluessel) throw new KiFehler("KI nicht konfiguriert.", { art: "konfig" });
  const h = { "content-type": "application/json", "x-api-key": schluessel, "anthropic-version": API_VERSION };
  if (mitFallback()) h["anthropic-beta"] = FALLBACK_BETA;
  return h;
}

/**
 * Anfragekörper. `system` = Liste stabiler Textblöcke (werden gecacht), `kontext` + `aufgabe`
 * landen in der Nutzer-Nachricht (wechselnder Teil NACH dem Cache-Präfix).
 */
export function koerper({ system = [], nachricht, maxTokens = 4000, effort = "low", schema = null, stream = false }) {
  const modell = kiModell();
  const bloecke = system.filter(Boolean).map((text, i, alle) => ({
    type: "text",
    text,
    ...(i === alle.length - 1 ? { cache_control: { type: "ephemeral" } } : {}),
  }));
  const k = {
    model: modell,
    max_tokens: maxTokens,
    system: bloecke,
    messages: [{ role: "user", content: nachricht }],
    output_config: { effort, ...(schema ? { format: { type: "json_schema", schema } } : {}) },
  };
  if (mitFallback(modell)) k.fallbacks = "default";
  if (stream) k.stream = true;
  return k;
}

function wartezeit(res, versuch) {
  const ra = Number(res?.headers?.get?.("retry-after"));
  if (Number.isFinite(ra) && ra > 0) return Math.min(ra * 1000, 8000);
  return Math.min(700 * 2 ** versuch + Math.random() * 300, 6000);
}

/** fetch mit Zeitlimit und Wiederholung; liefert eine erfolgreiche Response (Body ungelesen) */
async function senden(body, { versuche = 3, zeitlimitMs = 45000, signal } = {}) {
  let letzter;
  for (let versuch = 0; versuch < versuche; versuch++) {
    let res;
    try {
      const zeit = AbortSignal.timeout(zeitlimitMs);
      res = await fetch(API_URL, {
        method: "POST",
        headers: kopfzeilen(),
        body: JSON.stringify(body),
        cache: "no-store",
        signal: signal ? AbortSignal.any([signal, zeit]) : zeit,
      });
    } catch (e) {
      if (e instanceof KiFehler) throw e;
      if (signal?.aborted) throw new KiFehler("Abgebrochen.", { art: "abbruch" });
      const zeitueberschreitung = e?.name === "TimeoutError" || e?.name === "AbortError";
      letzter = new KiFehler(zeitueberschreitung ? "Zeitüberschreitung beim KI-Dienst." : "KI-Dienst nicht erreichbar.", { art: zeitueberschreitung ? "zeit" : "netz", wiederholbar: true });
      if (versuch < versuche - 1) await warte(wartezeit(null, versuch));
      continue;
    }
    if (res.ok) return res;
    // Fehlertyp nur für das Server-Log – Inhalte der Antwort nie weitergeben
    let typ = "";
    try {
      typ = (await res.json())?.error?.type || "";
    } catch {
      /* kein JSON */
    }
    console.error(`[plattform-ki] Claude API HTTP ${res.status} ${typ}`);
    letzter = new KiFehler("KI-Dienst hat die Anfrage nicht verarbeitet.", { status: res.status, wiederholbar: WIEDERHOLBAR.has(res.status) });
    if (!letzter.wiederholbar) throw letzter;
    if (versuch < versuche - 1) await warte(wartezeit(res, versuch));
  }
  throw letzter || new KiFehler("KI-Dienst nicht erreichbar.");
}

function nutzungAus(u = {}) {
  return {
    ein: (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0),
    aus: u.output_tokens || 0,
    cache: u.cache_read_input_tokens || 0,
  };
}

function stopPruefen(stopReason) {
  if (stopReason === "refusal") throw new KiFehler("Der KI-Dienst hat die Anfrage abgelehnt.", { art: "abgelehnt" });
}

/** Nicht-streamende Anfrage. Liefert { text, json?, stopReason, nutzung, modell } */
export async function erstellen(optionen) {
  const body = koerper({ ...optionen, stream: false });
  const res = await senden(body, { zeitlimitMs: optionen.zeitlimitMs || 60000, signal: optionen.signal });
  const m = await res.json();
  stopPruefen(m.stop_reason);
  const text = (m.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const out = { text, stopReason: m.stop_reason, nutzung: nutzungAus(m.usage), modell: m.model };
  if (optionen.schema) {
    if (m.stop_reason === "max_tokens") throw new KiFehler("Antwort unvollständig.", { art: "abgeschnitten" });
    try {
      out.json = JSON.parse(text);
    } catch {
      throw new KiFehler("Antwort nicht lesbar.", { art: "fehler" });
    }
  }
  return out;
}

/**
 * Streamende Anfrage. Wartet auf die Kopfzeilen (Fehler/Wiederholungen VOR dem ersten Token),
 * danach liefert `ereignisse()` Textstücke: { typ: "text", text } … { typ: "ende", stopReason, nutzung, modell }.
 * Eine Ablehnung mitten im Stream kommt als { typ: "abgelehnt" } (Teilausgabe verwerfen).
 */
export async function streamen(optionen) {
  const body = koerper({ ...optionen, stream: true });
  const res = await senden(body, { zeitlimitMs: optionen.zeitlimitMs || 120000, signal: optionen.signal });
  async function* ereignisse() {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let puffer = "";
    let nutzung = { ein: 0, aus: 0, cache: 0 };
    let stopReason = null;
    let modell = "";
    let textBloecke = new Set();
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        puffer += decoder.decode(value, { stream: true });
        let grenze;
        while ((grenze = puffer.indexOf("\n\n")) >= 0) {
          const roh = puffer.slice(0, grenze);
          puffer = puffer.slice(grenze + 2);
          const zeile = roh.split("\n").find((z) => z.startsWith("data:"));
          if (!zeile) continue;
          let e;
          try {
            e = JSON.parse(zeile.slice(5).trim());
          } catch {
            continue;
          }
          if (e.type === "message_start") {
            modell = e.message?.model || modell;
            const u = nutzungAus(e.message?.usage);
            nutzung = { ...u, aus: nutzung.aus };
          } else if (e.type === "content_block_start" && e.content_block?.type === "text") {
            textBloecke.add(e.index);
          } else if (e.type === "content_block_delta" && e.delta?.type === "text_delta" && textBloecke.has(e.index)) {
            yield { typ: "text", text: e.delta.text };
          } else if (e.type === "message_delta") {
            stopReason = e.delta?.stop_reason || stopReason;
            if (e.usage?.output_tokens) nutzung.aus = e.usage.output_tokens;
          } else if (e.type === "error") {
            console.error(`[plattform-ki] Stream-Fehler ${e.error?.type || ""}`);
            throw new KiFehler("KI-Dienst hat den Vorgang abgebrochen.", { art: "fehler" });
          }
        }
      }
    } finally {
      reader.releaseLock?.();
    }
    if (stopReason === "refusal") {
      yield { typ: "abgelehnt" };
      return;
    }
    yield { typ: "ende", stopReason, nutzung, modell };
  }
  return { ereignisse };
}
