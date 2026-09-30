// src/lib/plattform/ki/nutzung.js
//
// Nutzungsprotokoll und Tages-Kontingent des Assistenten.
// Protokolliert wird NUR: wer (Konto-ID), wann, welcher Anwendungsfall, Modus (ki|regel), Ergebnis,
// Tokenzahlen und das Bezugsobjekt (Art/ID) – NIE Fragen, Prompts oder Antworten.
//
// Speicher:
//  - Demo-Backend: eigene Datei .data/ki-nutzung.json (unabhängig von plattform.json)
//  - Frappe-Backend: DocType „Plattform KI Nutzung“ über oekoinvest_app.plattform.api.ki.*
//    (append-only; Kontingent optional per site_config `oekoinvest_ki_tageskontingent`)

import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";
import { API_BASE_URL, getApiHeaders, isApiConfigured } from "@/lib/apiBaseUrl";
import { backendName } from "../backend";
import { PlattformFehler } from "../fehler";
import { tagesKontingent } from "./konfig";

const TZ = "Europe/Vienna";
const DATEI = path.join(process.cwd(), ".data", "ki-nutzung.json");
const MAX_EINTRAEGE = 20000;

/** Kalendertag (Europe/Vienna) als JJJJ-MM-TT */
export function tagVon(iso = new Date().toISOString()) {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });
}

// ------------------------------------------------------------------ Demo: Datei

const zustand = (globalThis.__oiKiNutzung ||= { kette: Promise.resolve(), cache: null });

async function dateiLesen() {
  if (zustand.cache) return zustand.cache;
  try {
    // synchron: kein awaited I/O, das React im Dev-Modus ins HTML übernehmen könnte (siehe demo/speicher.js)
    zustand.cache = JSON.parse(readFileSync(DATEI, "utf8"));
    if (!Array.isArray(zustand.cache)) zustand.cache = [];
  } catch {
    zustand.cache = [];
  }
  return zustand.cache;
}

function exklusiv(fn) {
  const lauf = zustand.kette.then(fn, fn);
  zustand.kette = lauf.catch(() => {});
  return lauf;
}

async function dateiAnhaengen(eintrag) {
  return exklusiv(async () => {
    const liste = await dateiLesen();
    liste.push(eintrag);
    if (liste.length > MAX_EINTRAEGE) liste.splice(0, liste.length - MAX_EINTRAEGE);
    await fs.mkdir(path.dirname(DATEI), { recursive: true });
    const tmp = `${DATEI}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(liste));
    await fs.rename(tmp, DATEI);
  });
}

// ------------------------------------------------------------------ Frappe

async function frappe(methode, args) {
  if (!isApiConfigured() || !process.env.SERVER) throw new PlattformFehler(503, "Das Plattform-Backend (Frappe) ist nicht konfiguriert.");
  const res = await fetch(`${API_BASE_URL}oekoinvest_app.plattform.api.ki.${methode}`, {
    method: "POST",
    headers: getApiHeaders(),
    body: JSON.stringify(args),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);
  if (!res) throw new PlattformFehler(502, "Der Server ist vorübergehend nicht erreichbar.");
  if (!res.ok) {
    console.error(`[plattform-ki] Frappe ki.${methode}: HTTP ${res.status}`);
    if (res.status === 403) throw new PlattformFehler(403, "Dafür fehlt Ihnen die Berechtigung.");
    throw new PlattformFehler(502, "Der Server ist vorübergehend nicht erreichbar.");
  }
  return (await res.json().catch(() => ({})))?.message ?? null;
}

// ------------------------------------------------------------------ Schnittstelle

/** Heutige Nutzung und Kontingent eines Kontos: { genutzt, limit, rest } */
export async function kontingent(n) {
  let limit = tagesKontingent(n);
  let genutzt = 0;
  if (backendName() === "frappe") {
    const r = await frappe("nutzung_heute", { als_benutzer: n.id });
    genutzt = Number(r?.anzahl) || 0;
    if (Number(r?.limit) > 0) limit = Number(r.limit);
  } else {
    const heute = tagVon();
    const liste = await dateiLesen();
    for (let i = liste.length - 1; i >= 0; i--) {
      const e = liste[i];
      if (e.tag !== heute) {
        if (e.tag < heute) break; // chronologisch angehängt
        continue;
      }
      if (e.nutzerId === n.id) genutzt++;
    }
  }
  return { genutzt, limit, rest: Math.max(0, limit - genutzt) };
}

/** Wirft 429, wenn das Tages-Kontingent aufgebraucht ist */
export async function kontingentPruefen(n) {
  const k = await kontingent(n);
  if (k.rest <= 0) {
    throw new PlattformFehler(429, `Ihr Tages-Kontingent für den Assistenten (${k.limit} Aufrufe) ist aufgebraucht. Morgen steht es wieder zur Verfügung.`, "kontingent");
  }
  return k;
}

/** Nutzung protokollieren (ohne Inhalte). Fehler beim Protokollieren blockieren den Nutzer nicht. */
export async function protokollieren(n, { fall, modus, ergebnis = "ok", tokensEin = 0, tokensAus = 0, objektArt = "", objektId = "" }) {
  const am = new Date().toISOString();
  const eintrag = { am, tag: tagVon(am), nutzerId: n.id, fall, modus, ergebnis, tokensEin, tokensAus, objektArt, objektId };
  try {
    if (backendName() === "frappe") await frappe("nutzung_protokollieren", { ...eintrag, als_benutzer: n.id });
    else await dateiAnhaengen(eintrag);
  } catch (e) {
    console.error("[plattform-ki] Protokoll nicht geschrieben:", e?.message);
  }
}

/** Auswertung für das Backoffice (nur Demo-Backend; in Frappe über die Listenansicht des DocTypes) */
export async function nutzungUebersicht({ tage = 30 } = {}) {
  if (backendName() === "frappe") return null;
  const grenze = tagVon(new Date(Date.now() - tage * 864e5).toISOString());
  const liste = (await dateiLesen()).filter((e) => e.tag >= grenze);
  const jeFall = {};
  for (const e of liste) {
    const f = (jeFall[e.fall] ||= { aufrufe: 0, ki: 0, regel: 0, tokensEin: 0, tokensAus: 0 });
    f.aufrufe++;
    f[e.modus === "ki" ? "ki" : "regel"]++;
    f.tokensEin += e.tokensEin || 0;
    f.tokensAus += e.tokensAus || 0;
  }
  return { tage, aufrufe: liste.length, konten: new Set(liste.map((e) => e.nutzerId)).size, jeFall };
}
