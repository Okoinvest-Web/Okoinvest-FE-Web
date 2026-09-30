// HTTP-Server: Abfrage-API für die Website (Service-Token) inkl. SSE-Livestrom und – auf eigenem Port im internen
// Netz – der Broker-Auth-Hook. Nur node:http/https, keine Frameworks.
//
// Abfrage-API (Authorization: Bearer <DIENST_TOKEN>):
//   GET /health                                   – ohne Token, nur { ok }
//   GET /v1/anlagen/:id/aktuell                   – letzter Messwert (Summe der Geräte) + heute
//   GET /v1/anlagen/:id/reihe?von&bis&aufloesung  – 15min | 1h | 1d | 1mon
//   GET /v1/anlagen/:id/summen?von&bis
//   GET /v1/anlagen/:id/zaehler?monate
//   GET /v1/uebersicht?anlagen=A,B                – { [id]: { aktuell, heute, monat, jahr } } (max. 200 Anlagen)
//   GET /v1/anlagen/:id/live                      – text/event-stream, event: messwert
// Der Dienst kennt KEINE Portalnutzer – welche Anlagen jemand sehen darf, prüft die Website vorher.

import http from "node:http";
import https from "node:https";
import { timingSafeEqual } from "node:crypto";
import { jahresbeginn, monatsbeginn, tagesbeginn } from "./db.js";
import { authAnfrage } from "./auth.js";

const KENNUNG = /^[A-Z]{1,3}-[0-9A-Z-]{4,40}$/;
const AUFLOESUNG = { "15min": 7, "1h": 62, "1d": 800, "1mon": 3700 };

function json(res, status, daten) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(daten));
}

function tokenOk(req, token) {
  const h = String(req.headers.authorization || "");
  if (!h.startsWith("Bearer ")) return false;
  const a = Buffer.from(h.slice(7));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function bodyLesen(req, max = 16 * 1024) {
  let text = "";
  for await (const teil of req) {
    text += teil;
    if (text.length > max) throw new Error("zu_gross");
  }
  return text ? JSON.parse(text) : {};
}

function zeitraum(q) {
  const bis = q.get("bis") ? new Date(q.get("bis")) : new Date();
  const von = q.get("von") ? new Date(q.get("von")) : new Date(bis - 86400e3);
  const aufloesung = Object.hasOwn(AUFLOESUNG, q.get("aufloesung")) ? q.get("aufloesung") : "1h";
  if (Number.isNaN(von.getTime()) || Number.isNaN(bis.getTime()) || von >= bis || (bis - von) / 86400e3 > AUFLOESUNG[aufloesung]) return null;
  return { von, bis, aufloesung };
}

export function apiServer({ konfig, db, ingest, log }) {
  const offen = new Map(); // anlageId → Anzahl Live-Verbindungen

  async function handler(req, res) {
    const url = new URL(req.url, "http://intern");
    if (req.method !== "GET") return json(res, 405, { ok: false });
    if (url.pathname === "/health") return json(res, 200, { ok: true, ...ingest.zaehler });
    if (!tokenOk(req, konfig.http.token)) return json(res, 401, { ok: false, error: "nicht_berechtigt" });

    if (url.pathname === "/v1/uebersicht") {
      const ids = String(url.searchParams.get("anlagen") || "").split(",").filter((x) => KENNUNG.test(x)).slice(0, 200);
      const jetzt = new Date();
      const erg = {};
      for (const id of ids) {
        erg[id] = {
          aktuell: await db.aktuell(id),
          heute: await db.summen(id, tagesbeginn(jetzt), jetzt),
          monat: await db.summen(id, monatsbeginn(jetzt), jetzt),
          jahr: await db.summen(id, jahresbeginn(jetzt), jetzt),
        };
      }
      return json(res, 200, erg);
    }

    const m = url.pathname.match(/^\/v1\/anlagen\/([^/]+)\/(aktuell|reihe|summen|zaehler|live)$/);
    if (!m || !KENNUNG.test(m[1])) return json(res, 404, { ok: false });
    const [, id, art] = m;
    if (art === "aktuell") return json(res, 200, await db.aktuell(id));
    if (art === "zaehler") return json(res, 200, await db.zaehlerMonat(id, Math.min(60, Math.max(1, Number(url.searchParams.get("monate")) || 13))));
    if (art === "summen" || art === "reihe") {
      const z = zeitraum(url.searchParams);
      if (!z) return json(res, 422, { ok: false, error: "zeitraum" });
      return json(res, 200, art === "summen" ? await db.summen(id, z.von, z.bis) : await db.reihe(id, z.von, z.bis, z.aufloesung));
    }
    // Live (SSE)
    if ((offen.get(id) || 0) >= konfig.http.maxLiveJeAnlage) return json(res, 429, { ok: false });
    offen.set(id, (offen.get(id) || 0) + 1);
    res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.write("retry: 5000\n\n");
    let laeuft = false;
    const senden = async () => {
      if (laeuft) return;
      laeuft = true;
      try {
        res.write(`event: messwert\ndata: ${JSON.stringify(await db.aktuell(id))}\n\n`);
      } catch (e) {
        log.warn("Live-Wert nicht gesendet", { anlageId: id, fehler: e.message });
      } finally {
        laeuft = false;
      }
    };
    let drossel = null;
    const neu = () => {
      if (!drossel) drossel = setTimeout(() => ((drossel = null), senden()), 1000); // höchstens 1 Ereignis/s
    };
    ingest.on(`messwert:${id}`, neu);
    ingest.on(`status:${id}`, neu);
    const ping = setInterval(() => res.write(`: ping ${Date.now()}\n\n`), 15000);
    // Aufräumen VOR dem ersten await registrieren – sonst geht ein früher Verbindungsabbruch verloren (Zähler/Listener/Timer blieben stehen)
    req.on("close", () => {
      ingest.off(`messwert:${id}`, neu);
      ingest.off(`status:${id}`, neu);
      clearInterval(ping);
      clearTimeout(drossel);
      offen.set(id, (offen.get(id) || 1) - 1);
    });
    await senden();
  }

  const opts = konfig.http.tlsKey && konfig.http.tlsCert ? { key: konfig.http.tlsKey, cert: konfig.http.tlsCert } : null;
  const wrapper = (req, res) =>
    handler(req, res).catch((e) => {
      log.error("API-Fehler", { pfad: req.url?.split("?")[0], fehler: e.message });
      if (!res.headersSent) json(res, 500, { ok: false });
      else res.end();
    });
  const server = opts ? https.createServer(opts, wrapper) : http.createServer(wrapper);
  if (!opts) log.warn("HTTP-API ohne TLS – nur hinter einem TLS-terminierenden Proxy im internen Netz betreiben");
  server.requestTimeout = 0; // SSE
  server.headersTimeout = 20000;
  return server;
}

/** Broker-Auth-Hook (Mosquitto go-auth HTTP-Backend bzw. EMQX HTTP-Auth) – NUR im internen Netz */
export function authServer({ konfig, zugaenge, log }) {
  return http.createServer(async (req, res) => {
    try {
      if (req.method !== "POST") return json(res, 405, {});
      if (konfig.auth.hookToken) {
        const a = Buffer.from(String(req.headers["x-auth-token"] || ""));
        const b = Buffer.from(konfig.auth.hookToken);
        if (a.length !== b.length || !timingSafeEqual(a, b)) return json(res, 401, {});
      }
      const pfad = new URL(req.url, "http://intern").pathname;
      const erg = await authAnfrage(zugaenge, pfad, await bodyLesen(req));
      if (typeof erg === "number") {
        res.writeHead(erg, { "Content-Type": "application/json" });
        return res.end(erg === 200 ? '{"ok":true}' : '{"ok":false}');
      }
      return json(res, 200, erg);
    } catch (e) {
      log.warn("Auth-Hook-Fehler", { fehler: e.message });
      json(res, 403, { result: "deny" });
    }
  });
}
