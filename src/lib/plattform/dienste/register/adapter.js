// src/lib/plattform/dienste/register/adapter.js
//
// Register-Adapter (nur serverseitig): Suche nach Firmenname und Abruf per Registernummer.
//
//   CH  Zefix – öffentliche REST-API des Bundes (ZefixPublicREST). Zugang (Benutzer/Passwort) kostenlos auf Antrag
//       beim Eidg. Amt für das Handelsregister → ZEFIX_BENUTZER / ZEFIX_PASSWORT. Ohne Zugang: Demo-Daten.
//   AT  Firmenbuch – Abruf über eine Verrechnungsstelle (Vertrag) bzw. HVD-Schnittstelle → FIRMENBUCH_API_URL/_KEY.
//       Die Antwort-Struktur hängt von der Verrechnungsstelle ab: hier ein neutraler JSON-Vertrag (siehe unten),
//       den ein kleiner Übersetzer beim Dienstleister bzw. im Backend-Import erfüllt. Ohne Konfiguration: Demo-Daten.
//   DE  Handelsregister – keine offizielle maschinelle Schnittstelle für Einzelabrufe; Abruf über einen Dienstleister
//       → HANDELSREGISTER_API_URL/_KEY (gleicher neutraler Vertrag). Ohne Konfiguration: Demo-Daten.
//
// Neutraler Vertrag (AT/DE-Dienstleister):
//   GET {URL}/suche?q=<name>            → { treffer: [{ name, nummer, sitz, rechtsform, status }] }
//   GET {URL}/firma?nummer=<nummer>     → { name, nummer, gericht, sitz, anschrift, rechtsform, status, gegenstand,
//                                           stammkapital, organe: [{ funktion, name, seit }], gesellschafter: [{ name, anteil }],
//                                           stand, pdfBase64? }
//   Kopfzeile Authorization: Bearer <KEY>. Zeitlimit 15 s, eine Wiederholung bei 5xx.
//
// Alle Ergebnisse tragen `quelle` (zefix | firmenbuch | handelsregister | demo) und `abrufAm`.

import { GESELLSCHAFT } from "@/data/site";
import { REGISTER_LAENDER, firmaNormalisieren, namensAehnlichkeit, registernummerPruefen } from "./basis";

const ZEFIX_URL = "https://www.zefix.admin.ch/ZefixPublicREST/api/v1";

export function registerKonfig(env = process.env) {
  return {
    CH: { url: String(env.ZEFIX_API_URL || ZEFIX_URL).replace(/\/$/, ""), benutzer: env.ZEFIX_BENUTZER || "", passwort: env.ZEFIX_PASSWORT || "", aktiv: !!(env.ZEFIX_BENUTZER && env.ZEFIX_PASSWORT) },
    AT: { url: String(env.FIRMENBUCH_API_URL || "").replace(/\/$/, ""), key: env.FIRMENBUCH_API_KEY || "", aktiv: !!(env.FIRMENBUCH_API_URL && env.FIRMENBUCH_API_KEY) },
    DE: { url: String(env.HANDELSREGISTER_API_URL || "").replace(/\/$/, ""), key: env.HANDELSREGISTER_API_KEY || "", aktiv: !!(env.HANDELSREGISTER_API_URL && env.HANDELSREGISTER_API_KEY) },
    demoErlaubt: env.NODE_ENV !== "production" || env.PLATTFORM_DEMO === "1",
  };
}

async function holen(url, init = {}, { versuche = 2 } = {}) {
  for (let i = 1; ; i++) {
    let res;
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000), cache: "no-store" });
    } catch {
      if (i < versuche) continue;
      throw Object.assign(new Error("Das Register ist derzeit nicht erreichbar. Bitte später erneut versuchen."), { status: 502 });
    }
    if (res.status >= 500 && i < versuche) continue;
    if (res.status === 404) return null;
    if (res.status === 401 || res.status === 403) throw Object.assign(new Error("Zugang zum Register abgelehnt – Zugangsdaten prüfen."), { status: 502 });
    if (!res.ok) throw Object.assign(new Error(`Registerabfrage fehlgeschlagen (HTTP ${res.status}).`), { status: 502 });
    return res.json().catch(() => null);
  }
}

// ---------------------------------------------------------------- Zefix (CH)

const ZEFIX_STATUS = { ACTIVE: "aktiv", CANCELLED: "geloescht", BEING_CANCELLED: "in_loeschung" };

function zefixFirma(f = {}) {
  const uid = String(f.uid || "").replace(/^CHE(\d{3})(\d{3})(\d{3})$/, "CHE-$1.$2.$3");
  const a = f.address || {};
  return {
    name: f.name || "",
    nummer: uid,
    gericht: f.registerOfCommerce?.name || "Kantonales Handelsregisteramt",
    sitz: f.legalSeat || "",
    anschrift: [a.street && `${a.street} ${a.houseNumber || ""}`.trim(), [a.swissZipCode, a.city || a.town].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    rechtsform: f.legalForm?.name?.de || f.legalForm?.shortName?.de || "",
    status: ZEFIX_STATUS[f.status] || String(f.status || "").toLowerCase(),
    gegenstand: f.purpose || "",
    stammkapital: Number.isFinite(Number(f.capitalNominal)) ? Number(f.capitalNominal) : null,
    waehrung: f.capitalCurrency || "CHF",
    stand: f.sogcDate || "",
    ehraid: f.ehraid || null,
    auszugUrl: f.cantonalExcerptWeb || "",
  };
}

async function zefixSuche(k, q) {
  const auth = `Basic ${Buffer.from(`${k.benutzer}:${k.passwort}`).toString("base64")}`;
  const j = await holen(`${k.url}/company/search`, { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ name: q, activeOnly: false }) });
  return (Array.isArray(j) ? j : j?.list || []).slice(0, 25).map(zefixFirma);
}

async function zefixFirmaAbrufen(k, uid) {
  const auth = `Basic ${Buffer.from(`${k.benutzer}:${k.passwort}`).toString("base64")}`;
  const j = await holen(`${k.url}/company/uid/${encodeURIComponent(uid.replace(/[-.]/g, ""))}`, { headers: { Authorization: auth, Accept: "application/json" } });
  const f = Array.isArray(j) ? j[0] : j;
  return f ? zefixFirma(f) : null;
}

// ---------------------------------------------------------------- Neutraler Vertrag (AT/DE)

async function vertragSuche(k, q) {
  const j = await holen(`${k.url}/suche?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${k.key}`, Accept: "application/json" } });
  return (j?.treffer || []).slice(0, 25);
}
async function vertragFirma(k, nummer) {
  return holen(`${k.url}/firma?nummer=${encodeURIComponent(nummer)}`, { headers: { Authorization: `Bearer ${k.key}`, Accept: "application/json" } });
}

// ---------------------------------------------------------------- Demo-Daten

/**
 * Demo-Register: echte, öffentlich eingetragene Gesellschaften der Gruppe (aus src/data/site.js – Registerdaten sind
 * öffentlich) und fiktive Firmen mit Kennzeichen „(Demo)“. Stammkapital/Organe der fiktiven Firmen sind erfunden.
 */
function demoBestand() {
  const oi = GESELLSCHAFT;
  return [
    { land: "AT", name: oi.name, nummer: "FN 541505g", gericht: oi.gericht, sitz: oi.ort, anschrift: `${oi.sitz}, ${oi.plz} ${oi.ort}`, rechtsform: "Gesellschaft mit beschränkter Haftung", status: "aktiv", gegenstand: oi.gegenstand, organe: oi.geschaeftsfuehrung.map((n) => ({ funktion: "Geschäftsführer", name: n, seit: "" })), echt: true },
    ...oi.beteiligungen.map((b) => ({ land: "AT", name: b.name, nummer: b.register, gericht: "Landesgericht Ried im Innkreis", sitz: "", rechtsform: "Gesellschaft mit beschränkter Haftung", status: "aktiv", gegenstand: b.text, organe: [], echt: true })),
    { land: "AT", name: "Sonnenfeld Innviertel PV GmbH (Demo)", nummer: "FN 999101x", gericht: "Landesgericht Ried im Innkreis", sitz: "Braunau am Inn", rechtsform: "Gesellschaft mit beschränkter Haftung", status: "aktiv", gegenstand: "Errichtung und Betrieb von Photovoltaikanlagen", stammkapital: 35000, organe: [{ funktion: "Geschäftsführerin", name: "Maria Muster (Demo)", seit: "2023-04-01" }], gesellschafter: [{ name: "Muster Holding GmbH (Demo)", anteil: 100 }] },
    { land: "AT", name: "Alpen Energie Invest GmbH (Demo)", nummer: "FN 999202y", gericht: "Landesgericht Salzburg", sitz: "Salzburg", rechtsform: "Gesellschaft mit beschränkter Haftung", status: "aktiv", gegenstand: "Beteiligung an Energieprojekten", stammkapital: 10000, organe: [{ funktion: "Geschäftsführer", name: "Johann Beispiel (Demo)", seit: "2024-02-15" }], gesellschafter: [{ name: "Johann Beispiel (Demo)", anteil: 60 }, { name: "Eva Probe (Demo)", anteil: 40 }] },
    { land: "DE", name: "Demo Capital GmbH (Demo)", nummer: "HRB 999001", gericht: "Amtsgericht München", sitz: "München", rechtsform: "Gesellschaft mit beschränkter Haftung", status: "aktiv", gegenstand: "Erwerb und Verwaltung von Beteiligungen an Erneuerbare-Energien-Projekten", stammkapital: 25000, organe: [{ funktion: "Geschäftsführer", name: "Daniel Demo (Demo)", seit: "2021-06-01" }], gesellschafter: [{ name: "Daniel Demo (Demo)", anteil: 100 }] },
    { land: "DE", name: "Solarpark Allgäu Nord GmbH & Co. KG (Demo)", nummer: "HRA 999777", gericht: "Amtsgericht Memmingen", sitz: "Türkheim", rechtsform: "Kommanditgesellschaft", status: "aktiv", gegenstand: "Errichtung und Betrieb eines Photovoltaik-Kraftwerks", organe: [{ funktion: "Komplementärin", name: "Solarpark Allgäu Verwaltungs GmbH (Demo)", seit: "2022-03-01" }] },
    { land: "DE", name: "Muster Projektentwicklung GmbH (Demo)", nummer: "HRB 999555", gericht: "Amtsgericht Augsburg", sitz: "Augsburg", rechtsform: "Gesellschaft mit beschränkter Haftung", status: "aktiv", gegenstand: "Projektentwicklung Photovoltaik", stammkapital: 50000, organe: [{ funktion: "Geschäftsführerin", name: "Paula Plan (Demo)", seit: "2019-09-01" }] },
    { land: "DE", name: "Insolvente Sonnen GmbH (Demo)", nummer: "HRB 999666", gericht: "Amtsgericht Leipzig", sitz: "Leipzig", rechtsform: "Gesellschaft mit beschränkter Haftung", status: "in_liquidation", gegenstand: "Handel mit Solarmodulen", stammkapital: 25000, organe: [{ funktion: "Insolvenzverwalter", name: "Ivo Verwalter (Demo)", seit: "2026-01-10" }] },
    { land: "CH", name: "Helvetia Solar Beteiligungen GmbH (Demo)", nummer: "CHE-999.000.001", gericht: "Handelsregisteramt des Kantons Zürich", sitz: "Zürich", rechtsform: "Gesellschaft mit beschränkter Haftung", status: "aktiv", gegenstand: "Beteiligung an Solaranlagen", stammkapital: 20000, organe: [{ funktion: "Geschäftsführer", name: "Urs Beispiel (Demo)", seit: "2020-05-05" }] },
    { land: "CH", name: "Alpin Sonne AG (Demo)", nummer: "CHE-999.000.002", gericht: "Handelsregisteramt des Kantons Graubünden", sitz: "Chur", rechtsform: "Aktiengesellschaft", status: "aktiv", gegenstand: "Planung und Betrieb alpiner Solaranlagen", organe: [{ funktion: "Präsident des Verwaltungsrates", name: "Reto Muster (Demo)", seit: "2023-08-01" }] },
  ];
}

function demoSuche(land, q) {
  const alle = demoBestand().filter((f) => f.land === land);
  const n = firmaNormalisieren(q);
  return alle
    .map((f) => ({ f, s: firmaNormalisieren(f.name).includes(n) ? 1 : namensAehnlichkeit(q, f.name) }))
    .filter((x) => x.s >= 0.45)
    .sort((a, b) => b.s - a.s)
    .map(({ f }) => ({ name: f.name, nummer: f.nummer, sitz: f.sitz, rechtsform: f.rechtsform, status: f.status, demo: !f.echt }));
}

function demoFirma(land, nummer) {
  const f = demoBestand().find((x) => x.land === land && x.nummer.toLowerCase() === nummer.toLowerCase());
  return f ? { ...f, stand: new Date().toISOString().slice(0, 10), demo: true } : null;
}

// ---------------------------------------------------------------- Öffentliche Funktionen

/** Firmensuche. Liefert { quelle, treffer[], hinweis } */
export async function registerSuchen({ land, q }, env = process.env) {
  if (!REGISTER_LAENDER[land]) throw Object.assign(new Error("Unbekanntes Land."), { status: 422 });
  const text = String(q || "").trim().slice(0, 120);
  if (text.length < 2) throw Object.assign(new Error("Bitte mindestens 2 Zeichen eingeben."), { status: 422 });
  const k = registerKonfig(env);
  const kl = k[land];
  if (land === "CH" && kl.aktiv) return { quelle: "zefix", treffer: await zefixSuche(kl, text), hinweis: "" };
  if (land !== "CH" && kl.aktiv) return { quelle: land === "AT" ? "firmenbuch" : "handelsregister", treffer: await vertragSuche(kl, text), hinweis: "" };
  if (!k.demoErlaubt) throw Object.assign(new Error(`Die Anbindung an das ${REGISTER_LAENDER[land].register} ist nicht konfiguriert.`), { status: 503 });
  return { quelle: "demo", treffer: demoSuche(land, text), hinweis: `Demo-Daten – keine Live-Abfrage (${REGISTER_LAENDER[land].abruf}).` };
}

/** Firmendaten per Registernummer. Liefert { quelle, firma|null, abrufAm } */
export async function registerAbrufen({ land, nummer }, env = process.env) {
  const p = registernummerPruefen(land, nummer);
  if (!p.ok) throw Object.assign(new Error(p.fehler), { status: 422 });
  const k = registerKonfig(env);
  const kl = k[land];
  const abrufAm = new Date().toISOString();
  if (land === "CH" && kl.aktiv) return { quelle: "zefix", firma: await zefixFirmaAbrufen(kl, p.nummer), abrufAm };
  if (land !== "CH" && kl.aktiv) return { quelle: land === "AT" ? "firmenbuch" : "handelsregister", firma: await vertragFirma(kl, p.nummer), abrufAm };
  if (!k.demoErlaubt) throw Object.assign(new Error(`Die Anbindung an das ${REGISTER_LAENDER[land].register} ist nicht konfiguriert.`), { status: 503 });
  return { quelle: "demo", firma: demoFirma(land, p.nummer), abrufAm };
}
