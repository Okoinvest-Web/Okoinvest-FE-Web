// scripts/plattform-test-dienste.mjs
//
// End-to-End-Test „Firmen-, Bonitäts- & Identitätsdienste + SPV-Gründung“ gegen den laufenden Dev-Server (Demo-Backend).
//   node scripts/plattform-test-dienste.mjs [basis-url]
//
// Prüft: MRZ-Prüfziffern (ICAO-9303-Beispiel, Manipulation), MRZ-Vorprüfung per API (CSRF, abgelaufen, ungültig),
// Webhook-Signatur (falsch/fehlend → 401, unbekannter Anbieter → 404, richtig → 200, Wiederholung idempotent),
// Online-Identifizierung mit Demo-Simulator (nur eigene Sitzung), Registersuche/-abruf mit Rechten, Bonität nur für
// Leitung/Transaktion/Compliance, LOI ohne Bonität blockiert (409 „bonitaet“) wenn Pflicht, Information des Betroffenen
// ohne Ergebnis, manuelle Freigabe bei roter Ampel, SPV-Gründung (Mindestkapital, Namensprüfung, Checkliste mit
// Reihenfolge und Registernummer, Fristen, Dokumentenpaket-PDF), Seiten.
// Eigene Konten mit Präfix dienste-test-<Lauf>@example.com; Pilot-Eintrag der Bonitätspflicht wird am Ende entfernt.

import { createHmac } from "node:crypto";
import { MRZ_BEISPIELE, mrzPruefen, pruefziffer } from "../src/lib/plattform/dienste/identitaet/mrz.js";

const BASIS = (process.argv[2] || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const PASSWORT = "Dienste-Test-Passwort-2026";
const LAUF = Date.now().toString(36);
const DEMO_GEHEIMNIS = process.env.IDENT_WEBHOOK_SECRET || "oekoinvest-demo-ident-webhook-nur-entwicklung";

let ok = 0;
let fehler = 0;
const gruen = (s) => `\x1b[32m${s}\x1b[0m`;
const rot = (s) => `\x1b[31m${s}\x1b[0m`;
function pruefe(bedingung, text, details) {
  if (bedingung) {
    ok++;
    console.log(`  ${gruen("✓")} ${text}`);
  } else {
    fehler++;
    console.log(`  ${rot("✗")} ${text}${details !== undefined ? ` – ${JSON.stringify(details).slice(0, 400)}` : ""}`);
  }
  return bedingung;
}
const abschnitt = (t) => console.log(`\n${t}`);

class Client {
  constructor(name) {
    this.name = name;
    this.cookie = "";
  }
  async anfrage(methode, pfad, body, { origin = BASIS, kopf = {}, roh = false } = {}) {
    const headers = { ...kopf };
    if (origin) headers.Origin = origin;
    if (this.cookie) headers.Cookie = this.cookie;
    let payload;
    if (body !== undefined) {
      headers["Content-Type"] ||= "application/json";
      payload = typeof body === "string" ? body : JSON.stringify(body);
    }
    let res;
    for (let versuch = 1; ; versuch++) {
      try {
        res = await fetch(BASIS + pfad, { method: methode, headers, body: payload, redirect: "manual", signal: AbortSignal.timeout(180000) });
        const html = res.status >= 500 && /text\/html/.test(res.headers.get("content-type") || "") && pfad.startsWith("/api/");
        if (html && versuch < 4) {
          await new Promise((r) => setTimeout(r, 3000 * versuch));
          continue;
        }
        break;
      } catch (e) {
        if (versuch >= 4) throw e;
        await new Promise((r) => setTimeout(r, 5000 * versuch));
      }
    }
    for (const c of res.headers.getSetCookie?.() || []) {
      const [paar] = c.split(";");
      const [name, wert] = paar.split("=");
      if (/oi_sitzung$/.test(name)) this.cookie = wert ? `${name}=${wert}` : "";
    }
    if (roh) return res;
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 200) };
    }
    return { status: res.status, json, text, headers: res.headers };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  put = (p, b, o) => this.anfrage("PUT", p, b ?? {}, o);
  patch = (p, b, o) => this.anfrage("PATCH", p, b ?? {}, o);
  async login(email, passwort = DEMO_PASSWORT) {
    const r = await this.post("/api/auth/login", { email, passwort });
    if (r.status !== 200) throw new Error(`Login ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }
  async registrieren(schluessel, rollen, vorname, nachname, firma = "") {
    const email = `dienste-test-${LAUF}-${schluessel}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email, passwort: PASSWORT, vorname, nachname, firma, rollen, agb: true });
    if (r.status !== 201) throw new Error(`Registrierung ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }
}

/** 404 – im Portal mit loading.js streamt Next die Not-found-Seite ggf. mit Status 200 (Marker im HTML) */
const nichtGefunden = (r) => r.status === 404 || /NEXT_HTTP_ERROR_FALLBACK;404|Diesen Eintrag gibt es nicht/.test(r.text || "");

async function versuche(name, fn) {
  try {
    await fn();
  } catch (e) {
    fehler++;
    console.log(`  ${rot("✗")} ${name}: ${e.message}`);
  }
}

async function main() {
  console.log(`Dienste-Test gegen ${BASIS} (Lauf ${LAUF})`);
  const gast = new Client("gast");
  const admin = new Client("admin");
  const trans = new Client("bo-transaktion");
  const akq = new Client("bo-akquise");
  const lesen = new Client("bo-lesen");
  const buch = new Client("bo-buchhaltung");
  const comp = new Client("bo-compliance");
  const inv = new Client("investor");
  const fremd = new Client("fremd");
  let r;

  abschnitt("1. MRZ-Prüfziffern (ICAO 9303, ohne Server)");
  const td3 = mrzPruefen(MRZ_BEISPIELE.td3.join("\n"));
  pruefe(td3.ok && td3.format === "TD3" && td3.pruefungen.length === 5 && td3.pruefungen.every((p) => p.ok), "ICAO-Beispiel Reisepass (TD3): alle 5 Prüfziffern stimmen", td3.fehler);
  pruefe(td3.felder.dokumentnummer === "L898902C3" && td3.felder.geburtsdatum === "1974-08-12" && td3.felder.gueltigBis === "2012-04-15", "TD3: Dokumentnummer, Geburtsdatum, Ablauf korrekt gelesen", td3.felder);
  pruefe(pruefziffer("L898902C3") === 6 && pruefziffer("740812") === 2 && pruefziffer("120415") === 9, "Einzelprüfziffern 6/2/9 wie im ICAO-Beispiel");
  const td1 = mrzPruefen(MRZ_BEISPIELE.td1.join("\n"));
  pruefe(td1.ok && td1.format === "TD1" && td1.felder.dokumentnummer === "D23145890", "ICAO-Beispiel Ausweis (TD1): gültig", td1.fehler);
  const manip = mrzPruefen([MRZ_BEISPIELE.td3[0], MRZ_BEISPIELE.td3[1].replace("L898902C36", "L898902C37")].join("\n"));
  pruefe(!manip.ok && manip.fehler.some((f) => /Dokumentnummer/.test(f)), "Manipulierte Dokumentnummer → Prüfziffer falsch", manip.fehler);

  abschnitt("2. Konten");
  await admin.login("admin@example.com");
  await trans.login("bo-transaktion@example.com");
  await akq.login("bo-akquise@example.com");
  await lesen.login("bo-lesen@example.com");
  await buch.login("bo-buchhaltung@example.com");
  let compOk = true;
  try {
    await comp.login("bo-compliance@example.com");
  } catch {
    compOk = false;
  }
  await inv.registrieren("investor", ["investor"], "Ina", `Invest${LAUF}`, `Test Capital ${LAUF} GmbH`);
  await fremd.registrieren("fremd", ["investor"], "Fred", `Fremd${LAUF}`);
  pruefe(true, "Demo-Backoffice-Konten angemeldet, Testkonten registriert");

  abschnitt("3. Webhook-Signatur (öffentlicher Endpunkt)");
  const pfadWh = "/api/dienste/identitaet/webhook/demo";
  const rohUnbekannt = JSON.stringify({ sitzungId: "IP-26-ZZZZZZ", ergebnis: "bestanden", ereignisId: `t-${LAUF}` });
  r = await gast.anfrage("POST", pfadWh, rohUnbekannt, { origin: null, kopf: { "x-oekoinvest-signatur": "0".repeat(64), "x-oekoinvest-zeit": String(Math.floor(Date.now() / 1000)) } });
  pruefe(r.status === 401 && !/sitzung/i.test(r.text), "falsche Signatur → 401 ohne Details", r.status);
  r = await gast.anfrage("POST", pfadWh, rohUnbekannt, { origin: null });
  pruefe(r.status === 401, "fehlende Signatur → 401", r.status);
  const zeit = Math.floor(Date.now() / 1000);
  const sig = (roh, t = zeit) => ({ "x-oekoinvest-signatur": createHmac("sha256", DEMO_GEHEIMNIS).update(`${t}.${roh}`).digest("hex"), "x-oekoinvest-zeit": String(t) });
  r = await gast.anfrage("POST", pfadWh, rohUnbekannt, { origin: null, kopf: sig(rohUnbekannt, zeit - 3600) });
  pruefe(r.status === 401, "gültige Signatur, aber Zeitstempel zu alt → 401 (Wiederholungsschutz)", r.status);
  r = await gast.anfrage("POST", "/api/dienste/identitaet/webhook/veriff", rohUnbekannt, { origin: null, kopf: sig(rohUnbekannt) });
  pruefe(r.status === 404, "nicht konfigurierter Anbieter → 404", r.status);
  r = await gast.anfrage("POST", pfadWh, rohUnbekannt, { origin: null, kopf: sig(rohUnbekannt) });
  pruefe(r.status === 200 && r.json.verarbeitet === false, "richtige Signatur, unbekannte Sitzung → 200 (nicht verarbeitet)", r.json);
  r = await gast.anfrage("POST", pfadWh, "kein json", { origin: null, kopf: { ...sig("kein json"), "Content-Type": "text/plain" } });
  pruefe(r.status === 415, "kein JSON → 415", r.status);

  abschnitt("4. Online-Identifizierung (Demo-Simulator)");
  await versuche("Identifizierung", async () => {
    r = await inv.get("/api/portal/dienste/identitaet");
    pruefe(r.status === 200 && r.json.konfig?.demo === true && r.json.konfig?.aktiv, "Status: Demo-Anbieter aktiv", r.json.konfig);
    r = await inv.post("/api/portal/dienste/identitaet", {});
    const sid = r.json.sitzung?.id;
    pruefe(r.status === 200 && /^IP-/.test(sid || "") && r.json.url?.startsWith("/portal/verifizierung/identitaet?sitzung="), "Sitzung gestartet, Redirect-URL auf den Simulator", r.json);
    r = await inv.post("/api/portal/dienste/identitaet", {}, { origin: "https://boese.example.com" });
    pruefe(r.status === 403, "Start mit fremder Herkunft → 403 (CSRF)", r.status);
    r = await fremd.post("/api/portal/dienste/identitaet/demo", { sitzungId: sid, ergebnis: "bestanden" });
    pruefe(r.status === 404, "fremdes Konto kann die Sitzung nicht abschließen → 404", r.status);
    const rohEcht = JSON.stringify({ sitzungId: sid, externeId: `DEMO-${sid}`, ergebnis: "pruefen", verfahren: "Test", ereignisId: `echt-${LAUF}` });
    r = await gast.anfrage("POST", pfadWh, rohEcht, { origin: null, kopf: sig(rohEcht) });
    pruefe(r.status === 200 && r.json.verarbeitet === true, "signierter Webhook mit Ergebnis → verarbeitet", r.json);
    r = await gast.anfrage("POST", pfadWh, rohEcht, { origin: null, kopf: sig(rohEcht) });
    pruefe(r.status === 200 && r.json.verarbeitet === false && r.json.doppelt === true, "gleiches Ereignis erneut → idempotent (doppelt)", r.json);
    r = await inv.get("/api/portal/dienste/identitaet");
    pruefe(r.json.sitzungen?.[0]?.status === "pruefen" && !r.json.sitzungen[0].url, "Ergebnis beim Nutzer sichtbar, URL entfernt", r.json.sitzungen?.[0]);
    r = await inv.post("/api/portal/dienste/identitaet/demo", { sitzungId: sid, ergebnis: "bestanden" });
    pruefe(r.status === 409, "abgeschlossene Sitzung kann nicht erneut abgeschlossen werden → 409", r.status);
    r = await inv.post("/api/portal/dienste/identitaet", {});
    const sid2 = r.json.sitzung?.id;
    r = await inv.post("/api/portal/dienste/identitaet/demo", { sitzungId: sid2, ergebnis: "bestanden" });
    pruefe(r.status === 200 && r.json.verarbeitet === true, "Simulator „bestanden“ läuft signiert durch denselben Prüfpfad", r.json);
    r = await inv.get(`/portal/verifizierung/identitaet?sitzung=${sid2}`);
    pruefe(nichtGefunden(r), "Simulator-Seite nach Abschluss → nicht gefunden", r.status);
  });

  abschnitt("5. MRZ-Vorprüfung per API");
  await versuche("MRZ", async () => {
    r = await inv.post("/api/portal/dienste/mrz", { zeilen: MRZ_BEISPIELE.td3.join("\n") });
    pruefe(r.status === 200 && r.json.ergebnis === "auffaellig" && r.json.abgleich?.gueltig === false, "ICAO-Pass (2012 abgelaufen, Name weicht ab) → auffällig", { e: r.json.ergebnis, a: r.json.abgleich });
    r = await inv.post("/api/portal/dienste/mrz", { zeilen: `${MRZ_BEISPIELE.td3[0]}\n${MRZ_BEISPIELE.td3[1].replace("C36", "C37")}` });
    pruefe(r.status === 200 && r.json.ergebnis === "ungueltig", "falsche Prüfziffer → ungültig", r.json.ergebnis);
    r = await inv.post("/api/portal/dienste/mrz", { zeilen: "zu kurz" });
    pruefe(r.status === 422, "zu kurze Eingabe → 422", r.status);
    r = await inv.post("/api/portal/dienste/mrz", { zeilen: MRZ_BEISPIELE.td3.join("\n") }, { origin: null });
    pruefe(r.status === 403, "ohne Origin → 403 (CSRF)", r.status);
    r = await gast.post("/api/portal/dienste/mrz", { zeilen: MRZ_BEISPIELE.td3.join("\n") });
    pruefe(r.status === 401, "ohne Anmeldung → 401", r.status);
    r = await inv.get("/api/portal/dienste/identitaet");
    pruefe(r.json.mrz && !JSON.stringify(r.json).includes("L898902C3"), "gespeichert wird nur das Ergebnis – Dokumentnummer maskiert", r.json.mrz);
  });

  abschnitt("6. Register (Suche und Abruf)");
  await versuche("Register", async () => {
    r = await trans.get("/api/admin/register?land=AT&q=Sonnenfeld");
    pruefe(r.status === 200 && r.json.treffer?.some((t) => t.nummer === "FN 999101x"), "Transaktion: Firmenbuch-Suche (Demo) findet die Firma", r.json);
    r = await trans.get("/api/admin/register?land=AT&q=%C3%96koInvest");
    pruefe(r.json.treffer?.some((t) => t.nummer === "FN 541505g"), "Suche findet ÖkoInvest GmbH (FN 541505g)", r.json.treffer);
    r = await akq.get("/api/admin/register?land=DE&q=Demo");
    pruefe(r.status === 200, "Akquise: Suche erlaubt (lesen)", r.status);
    r = await akq.post("/api/admin/register", { land: "AT", nummer: "FN 999101x" });
    pruefe(r.status === 403, "Akquise: kostenpflichtiger Abruf → 403", r.status);
    r = await trans.post("/api/admin/register", { land: "AT", nummer: "FN 12" });
    pruefe(r.status === 422, "ungültige Registernummer → 422", r.status);
    r = await trans.post("/api/admin/register", { land: "DE", nummer: "HRB 999666", zweck: "Test" });
    const ra = r.json.auskunft;
    pruefe(r.status === 200 && ra?.firma?.status === "in_liquidation" && ra.abrufAm, "Abruf DE mit Abrufdatum und Status", ra);
    r = await trans.post("/api/admin/register", { land: "DE", nummer: "HRB 999666", kycFallId: "KF-26-AAAAAA" });
    pruefe(r.status === 403, "Hinterlegen im KYC-Fall nur Compliance → 403 für Transaktion", r.status);
    const pdf = await trans.anfrage("GET", `/api/admin/register/${ra.id}/pdf`, undefined, { roh: true });
    const bytes = Buffer.from(await pdf.arrayBuffer());
    pruefe(pdf.status === 200 && bytes.subarray(0, 5).toString() === "%PDF-", "Registerauskunft als PDF", pdf.status);
    r = await trans.get("/api/admin/register?land=CH&q=Helvetia");
    pruefe(r.status === 200 && r.json.quelle === "demo" && r.json.hinweis, "Zefix ohne Zugangsdaten → Demo-Daten mit Hinweis", r.json.quelle);
  });

  abschnitt("7. Bonität – nur berechtigte Unterrollen");
  r = await trans.get("/api/admin/bonitaet");
  pruefe(r.status === 200 && Array.isArray(r.json.auskuenfte), "Transaktion: Übersicht 200", r.status);
  for (const [c, name] of [[akq, "Akquise"], [lesen, "Nur lesen"], [buch, "Buchhaltung"]]) {
    r = await c.get("/api/admin/bonitaet");
    pruefe(r.status === 403, `${name}: Bonität → 403`, r.status);
  }
  r = await inv.get("/api/admin/bonitaet");
  pruefe(r.status === 403, "Investor: Bonität → 403", r.status);
  if (compOk) {
    r = await comp.get("/api/admin/bonitaet");
    pruefe(r.status === 200, "Compliance: Übersicht 200", r.status);
  }
  r = await akq.get("/portal/admin/bonitaet");
  pruefe(nichtGefunden(r), "Akquise: Seite /portal/admin/bonitaet → nicht gefunden", r.status);

  abschnitt("8. LOI ohne Bonitätsauskunft blockiert (Pflicht, Pilot-Konto)");
  let pilotGesetzt = false;
  await versuche("LOI-Gating", async () => {
    r = await trans.put("/api/admin/bonitaet/einstellungen", { pilotKonto: { id: inv.nutzer.id, an: true } });
    pilotGesetzt = r.status === 200;
    pruefe(pilotGesetzt && ["pilot", "firmen", "alle"].includes(r.json.einstellungen?.geltungWirksam), "Pilot-Konto für die Bonitätspflicht gesetzt", r.json);
    r = await gast.get("/api/boerse");
    const projekt = (r.json.projekte || []).find((p) => p.status === "veroeffentlicht");
    if (!projekt) throw new Error("kein veröffentlichtes Projekt in der Börse");
    r = await inv.post(`/api/portal/boerse/${projekt.id}/nda`, { akzeptiert: true });
    const iid = r.json.interesse?.id;
    pruefe(r.status === 200 && iid, "Investor fragt NDA an", r.json);
    r = await admin.post("/api/admin/status", { art: "interesse", id: iid, nach: "nda_freigegeben" });
    pruefe(r.status === 200, "Backoffice gibt Datenraum frei", r.json);
    r = await trans.get("/api/admin/bonitaet");
    pruefe(r.json.offen?.some((o) => o.subjekt.id === inv.nutzer.id), "Offene Voraussetzung erscheint in der Bonitäts-Übersicht", r.json.offen);
    r = await admin.get(`/api/admin/bonitaet/status?kontoId=${inv.nutzer.id}`);
    pruefe(r.status === 200 && r.json.pflicht === true && r.json.ok === false && r.json.firma === true, "Status für NDA & LOI: Pflicht, nicht erfüllt", r.json);
    const loi = { loi: { betrag: 900000, text: "Indikatives Angebot aus dem Dienste-Test." } };
    r = await inv.post("/api/portal/status", { art: "interesse", id: iid, nach: "loi_abgegeben", extra: loi });
    pruefe(r.status === 409 && r.json.code === "bonitaet", "LOI ohne Bonitätsauskunft → 409 (bonitaet)", r.json);
    pruefe(!/score|ampel|kreditlimit/i.test(r.text), "Hinweis an den Investor enthält kein Ergebnis", r.json.error);
    r = await akq.post("/api/admin/bonitaet", { subjekt: { art: "konto", id: inv.nutzer.id }, land: "DE" });
    pruefe(r.status === 403, "Akquise kann keine Auskunft beauftragen → 403", r.status);
    r = await trans.post("/api/admin/bonitaet", { subjekt: { art: "konto", id: inv.nutzer.id }, land: "DE", anlass: "loi", rechtsgrundlage: "berechtigtes_interesse", interesseId: iid, informieren: true });
    const ba = r.json.auskunft;
    pruefe(r.status === 201 && /^BA-/.test(ba?.id || "") && ba.ampel && ba.informiertAm, "Transaktion holt Auskunft ein (Ampel, Information des Betroffenen)", ba);
    r = await inv.get("/api/portal/benachrichtigungen");
    const txt = JSON.stringify(r.json);
    pruefe(r.status === 200 && /Bonitätsauskunft/.test(txt) && !/Score|Kreditlimit|kreditlimit/.test(txt), "Investor wird informiert – ohne Ergebnis", r.status);
    if (ba?.ampel === "rot") {
      r = await trans.post(`/api/admin/bonitaet/${ba.id}`, { begruendung: "Finanzierungsbestätigung der Hausbank liegt vor (Test)." });
    }
    r = await inv.post("/api/portal/status", { art: "interesse", id: iid, nach: "loi_abgegeben", extra: loi });
    pruefe(r.status === 200 && r.json.objekt?.status === "loi_abgegeben", "nach gültiger Auskunft: LOI möglich", r.json);
    r = await trans.get(`/api/admin/bonitaet/${ba.id}`);
    pruefe(r.status === 200 && r.json.zugriffe?.some((z) => /eingesehen/.test(z.text)), "Einsicht wird protokolliert", r.json.zugriffe);
  });

  abschnitt("9. Rote Ampel → manuelle Freigabe mit Begründung");
  await versuche("Rote Ampel", async () => {
    r = await trans.post("/api/admin/bonitaet", { subjekt: { art: "konto", id: fremd.nutzer.id }, name: "Insolvente Sonnen GmbH (Demo)", land: "DE", informieren: false });
    const ba = r.json.auskunft;
    pruefe(r.status === 201 && ba.ampel === "rot" && ba.gueltig === false && ba.gueltigGrund === "rot", "Insolvenz im Demo-Simulator → rot, nicht gültig", ba);
    r = await trans.post(`/api/admin/bonitaet/${ba.id}`, { begruendung: "kurz" });
    pruefe(r.status === 422, "Freigabe ohne ausreichende Begründung → 422", r.status);
    r = await trans.post(`/api/admin/bonitaet/${ba.id}`, { begruendung: "Bankbürgschaft über den vollen Kaufpreis liegt vor (Test)." });
    pruefe(r.status === 200 && r.json.auskunft?.gueltig === true && r.json.auskunft?.freigabe?.begruendung, "Freigabe mit Begründung → gültig", r.json.auskunft);
  });

  abschnitt("10. SPV-/GmbH-Gründung");
  await versuche("Gründung", async () => {
    r = await trans.get("/api/admin/gesellschaften/auswahl");
    pruefe(r.status === 200 && r.json.rechtsformen?.at_gmbh?.kapital === 10000 && r.json.gruppe?.some((g) => g.registernummer === "FN 541505g"), "Auswahl: Rechtsformen (AT 10.000 €), Gruppe mit ÖkoInvest GmbH", r.json.rechtsformen?.at_gmbh);
    const oi = r.json.gruppe.find((g) => g.registernummer === "FN 541505g");
    const projekt = (r.json.projekte || []).find((p) => !p.gesellschaftId);
    r = await trans.post("/api/admin/gesellschaften/namenspruefung", { rechtsform: "at_gmbh", name: "ÖkoInvest GmbH" });
    pruefe(r.status === 200 && r.json.ergebnis === "belegt", "Namensprüfung: „ÖkoInvest GmbH“ belegt", r.json);
    r = await trans.post("/api/admin/gesellschaften/namenspruefung", { rechtsform: "at_gmbh", name: `Solarpark Test ${LAUF}` });
    pruefe(r.json.ergebnis === "unzulaessig", "Namensprüfung: ohne Rechtsformzusatz unzulässig", r.json);
    r = await lesen.post("/api/admin/gesellschaften/namenspruefung", { rechtsform: "at_gmbh", name: `Solarpark Test ${LAUF} GmbH` });
    pruefe(r.status === 200, "Nur lesen: Namensprüfung erlaubt (ändert nichts)", r.status);
    const basis = {
      rechtsform: "at_gmbh", name: `Solarpark Dienstetest ${LAUF} GmbH`, sitz: "Ostermiething", anschrift: "Gewerbegebiet 10, 5121 Ostermiething",
      stammkapital: 5000, einzahlung: 2500, gesellschafter: [{ art: "gruppe", gesellschaftId: oi.id, anteil: 100 }], geschaeftsfuehrung: [{ name: "Andreas Wegscheider" }],
      entwicklungProjektId: projekt?.id || null, namenspruefung: {},
    };
    r = await trans.post("/api/admin/gesellschaften", basis);
    pruefe(r.status === 422 && /10\.000/.test(r.json.error || ""), "Stammkapital unter 10.000 € → 422", r.json);
    r = await lesen.post("/api/admin/gesellschaften", { ...basis, stammkapital: 35000, einzahlung: 17500 });
    pruefe(r.status === 403, "Nur lesen: Gründung anlegen → 403", r.status);
    r = await akq.get("/api/admin/gesellschaften");
    pruefe(r.status === 403, "Akquise: Gesellschaften → 403", r.status);
    r = await trans.post("/api/admin/gesellschaften", { ...basis, stammkapital: 35000, einzahlung: 17500 });
    const g = r.json.gesellschaft;
    pruefe(r.status === 201 && /^PG-/.test(g?.id || "") && g.status === "entwurf" && g.schritte.find((s) => s.schluessel === "namenspruefung")?.status === "erledigt", "Gründung angelegt, Namensprüfung automatisch erledigt", g && { id: g.id, status: g.status });
    if (projekt) {
      pruefe(g.projekt?.id === projekt.id, "Verknüpfung mit dem Entwicklungsprojekt (Kennung + Schnappschuss)", g.projekt);
      r = await trans.post("/api/admin/gesellschaften", { ...basis, name: `Zweite ${LAUF} GmbH`, stammkapital: 35000, einzahlung: 17500 });
      pruefe(r.status === 409, "zweite Gesellschaft für dasselbe Projekt → 409", r.status);
    }
    const schritt = (schluessel, status, extra = {}) => trans.post(`/api/admin/gesellschaften/${g.id}/schritt`, { schluessel, status, ...extra });
    r = await schritt("eingetragen", "erledigt", { wert: "FN 999999z" });
    pruefe(r.status === 409 && /Vorher erledigen/.test(r.json.error || ""), "Eintragung vor Anmeldung → 409 (Reihenfolge)", r.json);
    r = await schritt("notartermin", "erledigt", { wert: {} });
    pruefe(r.status === 422, "Notartermin ohne Datum → 422", r.status);
    await schritt("unterlagen", "erledigt");
    r = await schritt("notartermin", "erledigt", { wert: { datum: "2026-10-15T10:00", notariat: "Notariat (Test)", art: "video" } });
    pruefe(r.status === 200, "Notartermin (Video) gebucht", r.status);
    r = await schritt("beurkundet", "erledigt");
    pruefe(r.json.gesellschaft?.status === "in_gruendung", "nach Beurkundung: Status „In Gründung“", r.json.gesellschaft?.status);
    await schritt("bankkonto", "erledigt");
    r = await schritt("einzahlung", "erledigt", { wert: 4000 });
    pruefe(r.status === 422, "Einzahlung unter 5.000 € → 422", r.status);
    await schritt("einzahlung", "erledigt", { wert: 17500 });
    await schritt("anmeldung", "erledigt");
    r = await schritt("eingetragen", "erledigt", { wert: "HRB 12345" });
    pruefe(r.status === 422, "falsches Registernummernformat für AT → 422", r.status);
    r = await schritt("eingetragen", "erledigt", { wert: "fn 999999Z", datum: new Date().toISOString().slice(0, 10) });
    const g2 = r.json.gesellschaft;
    pruefe(r.status === 200 && g2.status === "eingetragen" && g2.registernummer === "FN 999999z", "eingetragen mit normalisierter FN", g2 && { s: g2.status, fn: g2.registernummer });
    pruefe(g2.fristen.some((f) => f.schritt === "transparenz") && g2.fristen.some((f) => f.art === "abschluss"), "Fristen: WiEReG-Meldung und Jahresabschluss", g2.fristen);
    r = await schritt("gewerbe", "entfaellt");
    pruefe(r.status === 200, "optionaler Schritt kann entfallen", r.status);
    r = await schritt("steuer", "entfaellt");
    pruefe(r.status === 422, "Pflichtschritt kann nicht entfallen → 422", r.status);
    r = await trans.patch(`/api/admin/gesellschaften/${g.id}`, { stammkapital: 50000 });
    pruefe(r.status === 409, "nach Beurkundung: Kapital nur über das Notariat änderbar → 409", r.status);
    const pdf = await trans.anfrage("GET", `/api/admin/gesellschaften/${g.id}/dokumente`, undefined, { roh: true });
    const bytes = Buffer.from(await pdf.arrayBuffer());
    pruefe(pdf.status === 200 && /application\/pdf/.test(pdf.headers.get("content-type") || "") && bytes.subarray(0, 5).toString() === "%PDF-" && bytes.length > 4000, "Dokumentenpaket als PDF", { s: pdf.status, n: bytes.length });
    const einzel = await trans.anfrage("GET", `/api/admin/gesellschaften/${g.id}/dokumente?dok=vertrag`, undefined, { roh: true });
    pruefe(einzel.status === 200 && (await einzel.arrayBuffer()).byteLength < bytes.length, "Einzeldokument (Errichtungserklärung) als PDF", einzel.status);
    r = await trans.get(`/api/admin/gesellschaften/${g.id}`);
    pruefe(r.json.gesellschaft?.dokumente?.length >= 7 && r.json.gesellschaft.verlauf?.length >= 5, "Dokumentenliste und Verlauf", r.json.gesellschaft?.dokumente);
    r = await buch.get(`/api/admin/gesellschaften/${g.id}`);
    pruefe(r.status === 200 && r.json.schreiben === false, "Buchhaltung: lesen ja, schreiben nein", r.json.schreiben);
    r = await buch.post(`/api/admin/gesellschaften/${g.id}/schritt`, { schluessel: "steuer", status: "in_arbeit" });
    pruefe(r.status === 403, "Buchhaltung: Checkliste ändern → 403", r.status);
    r = await trans.post(`/api/admin/gesellschaften/${g.id}/erp`, {});
    pruefe(r.status === 501, "ERPNext im Demo-Betrieb nicht angebunden → 501 mit Hinweis", r.status);
    r = await trans.get("/api/admin/gesellschaften");
    pruefe(r.status === 200 && r.json.organigramm?.kanten?.some((k) => k.nach === g.id && k.anteil === 100), "Organigramm: ÖkoInvest GmbH hält 100 % an der neuen Gesellschaft", r.json.organigramm?.kanten);

    abschnitt("11. KG und Schweiz");
    r = await trans.post("/api/admin/gesellschaften", { rechtsform: "de_gmbh_co_kg", name: `Solarpark Test ${LAUF} GmbH & Co. KG`, sitz: "Türkheim", gesellschafter: [{ art: "gruppe", gesellschaftId: oi.id, anteil: 100, einlage: 1000 }], geschaeftsfuehrung: [{ name: "Andreas Wegscheider" }] });
    pruefe(r.status === 422 && /Komplementär/.test(r.json.error || ""), "KG ohne Komplementär-GmbH → 422", r.json.error);
    r = await trans.post("/api/admin/gesellschaften", { rechtsform: "de_gmbh_co_kg", name: `Solarpark Test ${LAUF} GmbH & Co. KG`, sitz: "Türkheim", komplementaer: { name: "Solarpark Verwaltungs GmbH (Test)" }, gesellschafter: [{ art: "gruppe", gesellschaftId: oi.id, anteil: 100, einlage: 1000 }], geschaeftsfuehrung: [{ name: "Andreas Wegscheider" }] });
    const kg = r.json.gesellschaft;
    pruefe(r.status === 201 && kg.schritte.some((s) => s.schluessel === "komplementaer") && kg.schritte.some((s) => /Transparenzregister/.test(s.label)), "KG: Checkliste mit Komplementärin und Transparenzregister", kg?.schritte?.map((s) => s.schluessel));
    r = await trans.post("/api/admin/gesellschaften", { rechtsform: "ch_gmbh", name: `Alpin Test ${LAUF} GmbH`, sitz: "Chur", stammkapital: 20000, einzahlung: 20000, gesellschafter: [{ art: "gruppe", gesellschaftId: oi.id, anteil: 100 }], geschaeftsfuehrung: [{ name: "Test Person", wohnsitzLand: "AT" }] });
    pruefe(r.status === 422 && /Schweiz/.test(r.json.error || ""), "CH GmbH ohne vertretungsbefugte Person mit Wohnsitz CH → 422", r.json.error);
  });

  abschnitt("12. Seiten");
  await versuche("Seiten", async () => {
    for (const [c, pfad, erwartet, name] of [
      [trans, "/portal/admin/gesellschaften", 200, "Transaktion: Gesellschaften"],
      [trans, "/portal/admin/gesellschaften/neu", 200, "Transaktion: Gründungsassistent"],
      [trans, "/portal/admin/bonitaet", 200, "Transaktion: Bonität"],
      [lesen, "/portal/admin/gesellschaften/neu", 404, "Nur lesen: Assistent → 404"],
      [akq, "/portal/admin/gesellschaften", 404, "Akquise: Gesellschaften → 404"],
      [inv, "/portal/verifizierung", 200, "Investor: Verifizierung mit Online-Identifizierung"],
    ]) {
      r = await c.get(pfad);
      pruefe(erwartet === 404 ? nichtGefunden(r) : r.status === 200 && !/Application error|Unhandled Runtime Error/.test(r.text) && !/NEXT_HTTP_ERROR_FALLBACK;404/.test(r.text), `${name} (${erwartet})`, r.status);
    }
    r = await inv.get("/portal/verifizierung");
    pruefe(/Online identifizieren/.test(r.text) && /maschinenlesbaren Zone|MRZ/.test(r.text), "Verifizierung zeigt Online-Identifizierung und MRZ-Vorprüfung");
  });

  abschnitt("Aufräumen");
  if (pilotGesetzt) {
    r = await trans.put("/api/admin/bonitaet/einstellungen", { pilotKonto: { id: inv.nutzer.id, an: false } });
    pruefe(r.status === 200, "Pilot-Konto entfernt", r.status);
  }

  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen grün")} · ${ok} ok`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.stack || e.message}`));
  process.exit(1);
});
