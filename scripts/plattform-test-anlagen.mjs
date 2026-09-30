// scripts/plattform-test-anlagen.mjs
//
// End-to-End-Test „Anlagen & Monitoring“ gegen den laufenden Dev-Server (Demo-Backend + Messdaten-Simulator).
//   node scripts/plattform-test-anlagen.mjs [basis-url]
//
// Prüft: Kunde sieht nur Anlagen seines Kontos/seiner Organisation · fremde Anlage → 403 (API) bzw. 404 (Seite),
// auch bei Messdaten-, Zähler- und Live-Route (SSE) · Live-Strom liefert Messwerte · Gerätezugang: Passwort nur
// EINMAL in der Antwort, danach nur Hash-Fingerabdruck (auch nicht in der Demo-Datei) · neues Passwort ersetzt das alte ·
// Testnachricht verbindet (Demo) · Störung: Benachrichtigung an den Kunden, Kunde kommentiert, quittiert NICHT,
// Betrieb quittiert (zweimal → 409), interne Kommentare nur für den Betrieb · Backoffice-Unterrollen (betrieb ja,
// akquise/lesen nein) · Messpunkt „abrechnungsrelevant“ nur geeicht · Monatswerte monoton · CSV · CSRF · Seiten.
// Eigene Konten mit Präfix anl-test-<Lauf>@example.com, eigene Anlage – Demo-Daten bleiben unberührt.

import { readFile } from "node:fs/promises";
import path from "node:path";

const BASIS = (process.argv[2] || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);
const PASSWORT = "Anlagen-Test-Passwort-26";

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

  async anfrage(methode, pfad, body, { origin = BASIS, kopf = {}, roh = false, signal } = {}) {
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
        res = await fetch(BASIS + pfad, { method: methode, headers, body: payload, redirect: "manual", signal });
        const html = res.status >= 500 && /text\/html/.test(res.headers.get("content-type") || "") && pfad.startsWith("/api/");
        if (html && versuch < 4) {
          await new Promise((r) => setTimeout(r, 3000 * versuch));
          continue;
        }
        break;
      } catch (e) {
        if (versuch >= 4 || signal?.aborted) throw e;
        await new Promise((r) => setTimeout(r, 3000 * versuch));
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
    return { status: res.status, json, headers: res.headers, text };
  }

  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  patch = (p, b, o) => this.anfrage("PATCH", p, b ?? {}, o);
  del = (p, o) => this.anfrage("DELETE", p, undefined, o);

  async login(email, passwort = DEMO_PASSWORT) {
    let r;
    for (let versuch = 1; versuch <= 3; versuch++) {
      r = await this.post("/api/auth/login", { email, passwort });
      if (r.status !== 500) break;
      await new Promise((w) => setTimeout(w, 5000 * versuch));
    }
    if (r.status !== 200) throw new Error(`Login ${email} fehlgeschlagen: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }

  async versucheLogin(email) {
    try {
      return await this.login(email);
    } catch {
      return null;
    }
  }

  async registrieren(schluessel, rollen, vorname, nachname, firma) {
    const email = `anl-test-${LAUF}-${schluessel}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email, passwort: PASSWORT, vorname, nachname, firma, rollen, agb: true });
    if (r.status !== 201) throw new Error(`Registrierung ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    this.email = email;
    return r.json.nutzer;
  }

  /** Öffnet den SSE-Strom und liest bis zum ersten Messwert (max. 20 s) */
  async live(pfad) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 20000);
    try {
      const res = await this.anfrage("GET", pfad, undefined, { roh: true, signal: ac.signal, kopf: { Accept: "text/event-stream" } });
      const typ = res.headers.get("content-type") || "";
      if (!typ.includes("text/event-stream")) {
        const text = await res.text();
        return { status: res.status, typ, text };
      }
      const leser = res.body.getReader();
      let text = "";
      while (!text.includes("event: messwert")) {
        const { value, done } = await leser.read();
        if (done) break;
        text += new TextDecoder().decode(value);
      }
      ac.abort();
      return { status: res.status, typ, text };
    } catch (e) {
      return { status: 0, typ: "", text: String(e?.message || e) };
    } finally {
      clearTimeout(t);
    }
  }
}

const monatVor = (m) => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - m);
  return d.toISOString().slice(0, 7);
};

async function main() {
  console.log(`Anlagen & Monitoring – Test gegen ${BASIS} (Lauf ${LAUF})`);
  const kunde = new Client("unternehmen");
  const admin = new Client("admin");
  const fremd = new Client("fremder Kunde");
  const gast = new Client("gast");
  await kunde.login("unternehmen@example.com");
  await admin.login("admin@example.com");
  await fremd.registrieren("kunde", ["unternehmen"], "Frieda", "Fremd (Test)", "Fremdfirma GmbH (Test)");

  // ------------------------------------------------------------ 1. Sichtbarkeit
  abschnitt("1. Sichtbarkeit der Anlagen");
  let r = await kunde.get("/api/portal/anlagen");
  pruefe(r.status === 200 && r.json.anlagen?.length >= 5, "Kunde sieht seine Anlagen (≥ 5)", r.status);
  const eigene = r.json.anlagen || [];
  pruefe(eigene.every((a) => a.meinZugriff && a.meinZugriff !== "backoffice"), "Zugriff als Kunde bzw. Team, nicht Backoffice", eigene.map((a) => a.meinZugriff));
  pruefe(!eigene.some((a) => /Thurgau/.test(a.name)), "Anlage eines anderen Kunden ist nicht in der Liste");
  pruefe(eigene.every((a) => a.ampel?.id && "live" in a), "Liste mit Ampel und Live-Wert");
  pruefe(r.json.summe && typeof r.json.summe.jahr?.erzeugungKwh === "number" && r.json.summe.co2JahrKg >= 0, "Summen (Jahr, CO₂) vorhanden");
  pruefe(eigene.some((a) => a.ampel?.id === "offline") && eigene.some((a) => ["stoerung", "warnung"].includes(a.ampel?.id)), "Demo: Ampeln offline und Störung/Warnung vorhanden", eigene.map((a) => a.ampel?.id));
  pruefe(!JSON.stringify(r.json).includes("passwortHash") && !eigene.some((a) => a.geraete), "Kunde sieht keine Gerätezugänge");
  const eigeneId = eigene.find((a) => a.kwp > 0 && a.ampel?.id !== "offline")?.id || eigene[0]?.id;

  r = await admin.get("/api/portal/anlagen");
  pruefe(r.status === 200 && r.json.anlagen?.length >= 7, "Backoffice sieht alle Anlagen (≥ 7)", r.json.anlagen?.length);
  const fremdeAnlage = (r.json.anlagen || []).find((a) => /Thurgau/.test(a.name));
  pruefe(!!fremdeAnlage, "Anlage des anderen Kunden im Backoffice sichtbar");
  const fremdId = fremdeAnlage?.id;

  r = await fremd.get("/api/portal/anlagen");
  pruefe(r.status === 200 && r.json.anlagen?.length === 0, "Neuer Kunde ohne Anlagen sieht eine leere Liste", r.json.anlagen?.length);
  r = await gast.get("/api/portal/anlagen");
  pruefe(r.status === 401, "Ohne Anmeldung → 401", r.status);

  // ------------------------------------------------------------ 2. Fremde Anlage: Detail, Messdaten, Zähler, Live
  abschnitt("2. Fremde Anlage → 403 auch bei Messdaten und Live");
  const zeit = `von=${new Date(Date.now() - 86400e3).toISOString()}&bis=${new Date().toISOString()}&aufloesung=1h`;
  for (const [cl, id, name] of [[kunde, fremdId, "Kunde → Anlage anderer Kunde"], [fremd, eigeneId, "fremder Kunde → Demo-Anlage"]]) {
    r = await cl.get(`/api/portal/anlagen/${id}`);
    pruefe(r.status === 403, `${name}: Detail → 403`, r.status);
    r = await cl.get(`/api/portal/anlagen/${id}/messdaten?${zeit}`);
    pruefe(r.status === 403 && !r.json.punkte, `${name}: Messdaten → 403 ohne Werte`, r.status);
    r = await cl.get(`/api/portal/anlagen/${id}/zaehler`);
    pruefe(r.status === 403, `${name}: Zählerstände → 403`, r.status);
    r = await cl.get(`/api/portal/anlagen/${id}/zaehler?format=csv`);
    pruefe(r.status === 403 && !r.text.includes("Zählernummer"), `${name}: Zähler-CSV → 403`, r.status);
    const l = await cl.live(`/api/portal/anlagen/${id}/live`);
    pruefe(l.status === 403 && !l.typ.includes("event-stream") && !l.text.includes("messwert"), `${name}: Live-Route → 403, kein Strom`, l);
    r = await cl.get(`/api/portal/anlagen/stoerungen?anlage=${id}`);
    pruefe(r.status === 403, `${name}: Störungsliste der Anlage → 403`, r.status);
  }
  r = await kunde.get("/api/portal/anlagen/AL-26-ZZZZZZ/messdaten");
  pruefe(r.status === 404, "Unbekannte Anlage → 404", r.status);
  const l0 = await gast.live(`/api/portal/anlagen/${eigeneId}/live`);
  pruefe(l0.status === 401, "Live ohne Anmeldung → 401", l0.status);

  // ------------------------------------------------------------ 3. Eigene Anlage: Messdaten und Live
  abschnitt("3. Eigene Anlage: Detail, Messdaten, Live, Zähler");
  r = await kunde.get(`/api/portal/anlagen/${eigeneId}`);
  pruefe(r.status === 200 && r.json.anlage?.id === eigeneId, "Detail der eigenen Anlage", r.status);
  pruefe(r.json.anlage?.kosten?.jahr && typeof r.json.anlage.kosten.jahr.ersparnisEur === "number", "Kosten/Ersparnis aus dem Vertrag");
  pruefe(!r.json.anlage?.geraete, "Detail für den Kunden ohne Gerätezugänge");
  // Eigentum & Betrieb (Fachprüfung Kapitalseite): Kunde = Stromabnehmer, Anlage im Eigentum von ÖkoInvest/SPV
  pruefe(typeof r.json.anlage?.eigentuemer === "string" && r.json.anlage.eigentuemer.length >= 3, "Kunde sieht die Eigentümergesellschaft", r.json.anlage?.eigentuemer);
  pruefe(!r.json.anlage?.komponenten && r.json.anlage?.finanziertDurch === undefined, "Kunde sieht keine Komponenten-Interna und keine Finanzierung");
  pruefe((r.json.anlage?.messpunkte || []).every((m) => m.abrechnungsrelevant), "Kunde sieht nur abrechnungsrelevante Messpunkte");
  pruefe((r.json.anlage?.wartungen || []).every((w) => w.kostenEur === undefined), "Interne Wartungskosten für den Kunden ausgeblendet");
  pruefe((r.json.anlage?.stoerungen || []).every((s) => s.kommentare.every((k) => !k.intern)), "Keine internen Kommentare beim Kunden");
  r = await kunde.get(`/api/portal/anlagen/${eigeneId}/messdaten?${zeit}`);
  pruefe(r.status === 200 && r.json.punkte?.length >= 20, "Stundenwerte der letzten 24 h", r.json.punkte?.length);
  r = await kunde.get(`/api/portal/anlagen/${eigeneId}/messdaten?von=${new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)).toISOString()}&bis=${new Date().toISOString()}&aufloesung=1mon`);
  pruefe(r.status === 200 && r.json.punkte?.length >= 1 && r.json.punkte.every((p) => p.erwartetKwh > 0), "Monatswerte mit Erwartung (Soll)", r.json.punkte?.[0]);
  r = await kunde.get(`/api/portal/anlagen/${eigeneId}/messdaten?von=2020-01-01T00:00:00Z&bis=2026-01-01T00:00:00Z&aufloesung=15min`);
  pruefe(r.status === 422, "Zu langer Zeitraum für 15-Minuten-Werte → 422", r.status);
  const l1 = await kunde.live(`/api/portal/anlagen/${eigeneId}/live`);
  pruefe(l1.status === 200 && l1.typ.includes("text/event-stream") && l1.text.includes("event: messwert"), "Live-Strom (SSE) liefert Messwerte", { status: l1.status, typ: l1.typ });
  const daten = (l1.text.match(/data: (.*)/) || [])[1];
  let w = null;
  try {
    w = JSON.parse(daten);
  } catch {
    /* leer */
  }
  pruefe(w && w.ts && typeof w.zaehler?.erzeugungKwh === "number", "Messwert mit Zeitstempel und Zählerständen", w);
  r = await kunde.get(`/api/portal/anlagen/${eigeneId}/zaehler`);
  pruefe(r.status === 200 && r.json.abrechnung?.length > 0 && r.json.monitoring?.length > 0, "Zählerstände: Abrechnung (geeicht) und Monitoring", { a: r.json.abrechnung?.length, m: r.json.monitoring?.length });
  const monitoring = r.json.monitoring || [];
  pruefe(monitoring.every((m, i) => i === 0 || m.ende.erzeugungKwh >= monitoring[i - 1].ende.erzeugungKwh), "Zählerstände monoton steigend");
  const csvRes = await kunde.anfrage("GET", `/api/portal/anlagen/${eigeneId}/zaehler?format=csv`, undefined, { roh: true });
  const csvBytes = new Uint8Array(await csvRes.arrayBuffer());
  const csvText = new TextDecoder().decode(csvBytes);
  pruefe(csvRes.status === 200 && /text\/csv/.test(csvRes.headers.get("content-type") || "") && csvBytes[0] === 0xef && csvBytes[1] === 0xbb && csvBytes[2] === 0xbf && csvText.includes("Zählernummer;"), "CSV-Export (BOM, Semikolon)", csvRes.status);

  // ------------------------------------------------------------ 4. Anlage anlegen, Gerätezugang
  abschnitt("4. Anlage anlegen und Gerät verbinden (Passwort nur einmal)");
  r = await kunde.post("/api/admin/anlagen", { name: "Unberechtigt (Test)", typ: "dach", land: "DE", bundesland: "Bayern", kwp: 100 });
  pruefe(r.status === 403, "Kunde kann keine Anlage anlegen → 403", r.status);
  r = await admin.post("/api/admin/anlagen", { name: "Hallendach Test", typ: "dach" }, { origin: "https://boese.example.org" });
  pruefe(r.status === 403, "CSRF: fremder Origin → 403", r.status);
  r = await admin.post("/api/admin/anlagen", { name: `Ohne Eigentümer ${LAUF} (Test)`, typ: "dach", status: "planung", land: "DE", bundesland: "Hessen", kwp: 50 });
  pruefe(r.status === 422, "Anlage ohne Eigentümergesellschaft → 422 (Pflichtfeld)", r.status);
  r = await admin.post("/api/admin/anlagen", {
    eigentuemer: "ÖkoInvest GmbH", dachgeberIstKunde: true, // Eigentum & Betrieb (Pflicht)
    name: `Testdach ${LAUF} (Test)`, typ: "dach", status: "betrieb", land: "DE", bundesland: "Hessen", ort: "Raum Kassel", kwp: 240, wechselrichterAnzahl: 2,
    speicherKwh: 100, speicherKw: 50, lastprofil: "gewerbe", lastJahrKwh: 300000, inbetriebnahme: "2025-04-01", kundeId: fremd.nutzer.id,
  });
  pruefe(r.status === 201 && r.json.anlage?.id, "Backoffice legt Anlage für den Testkunden an", r.json);
  const tid = r.json.anlage?.id;
  r = await fremd.get("/api/portal/anlagen");
  pruefe(r.json.anlagen?.length === 1 && r.json.anlagen[0].id === tid, "Testkunde sieht jetzt genau seine Anlage", r.json.anlagen?.map((a) => a.id));
  r = await fremd.get(`/api/portal/anlagen/${tid}/messdaten?${zeit}`);
  pruefe(r.status === 200 && r.json.punkte?.length === 0, "Vor dem ersten Gerät: keine Messdaten", r.json.punkte?.length);
  r = await admin.post(`/api/admin/anlagen/${tid}/eintraege`, { art: "vertrag", daten: { beginn: "2025-04-01", laufzeitJahre: 20, strompreisCt: 12.5, grundgebuehrMonat: 99 } });
  pruefe(r.status === 200, "Vertrag hinterlegt", r.status);

  r = await fremd.post(`/api/admin/anlagen/${tid}/geraete`, { bezeichnung: "Logger" });
  pruefe(r.status === 403, "Kunde kann keinen Gerätezugang erzeugen → 403", r.status);
  r = await admin.post(`/api/admin/anlagen/${tid}/geraete`, { bezeichnung: "Datenlogger Test" });
  pruefe(r.status === 201 && typeof r.json.passwort === "string" && r.json.passwort.length >= 24, "Zugang erzeugt, Passwort einmalig in der Antwort", r.status);
  pruefe(/no-store/.test(r.headers.get("cache-control") || ""), "Antwort mit Passwort ist nicht cachebar");
  const pw1 = r.json.passwort;
  const z = r.json.zugang || {};
  const gid = z.id;
  pruefe(z.topic === `oekoinvest/v1/${tid}/${gid}/#` && z.benutzer?.startsWith("anl-"), "Benutzer und Topic nach Schema", z);
  pruefe(!("passwort" in z) && !("passwortHash" in z) && z.hash?.fingerabdruck?.length === 16, "Zugang selbst ohne Passwort/Hash, nur Fingerabdruck", z);
  r = await admin.get(`/api/admin/anlagen/geraete/${gid}`);
  pruefe(r.status === 200 && r.json.zugang?.status === "wartet", "Status „Warte auf erste Nachricht“", r.json.zugang?.status);
  pruefe(!r.text.includes(pw1) && !r.text.includes("passwortHash") && !r.text.includes("scrypt$"), "Späterer Abruf: Passwort und Hash nicht enthalten");
  r = await admin.get(`/api/portal/anlagen/${tid}`);
  pruefe(r.status === 200 && r.json.anlage?.geraete?.length === 1 && !r.text.includes(pw1) && !r.text.includes("scrypt$"), "Anlagen-Detail (Backoffice): Gerät ohne Passwort/Hash", r.json.anlage?.geraete);
  try {
    const roh = await readFile(path.join(process.cwd(), ".data", "plattform.json"), "utf8");
    pruefe(!roh.includes(pw1) && roh.includes("scrypt$"), "Demo-Datenbank enthält nur den Hash, nie das Passwort");
  } catch (e) {
    pruefe(false, "Demo-Datenbank lesbar (Test im Projektordner starten)", e.message);
  }
  r = await admin.post(`/api/admin/anlagen/geraete/${gid}`, { aktion: "neu" });
  pruefe(r.status === 200 && r.json.passwort && r.json.passwort !== pw1 && r.json.zugang?.hash?.fingerabdruck !== z.hash?.fingerabdruck, "Neues Passwort: einmalig, anderer Hash", r.status);
  r = await admin.post(`/api/admin/anlagen/geraete/${gid}`, { aktion: "sperren" });
  pruefe(r.status === 200 && r.json.zugang?.status === "gesperrt", "Zugang gesperrt", r.json.zugang?.status);
  r = await admin.post(`/api/admin/anlagen/geraete/${gid}`, { aktion: "testnachricht" });
  pruefe(r.status === 409, "Gesperrter Zugang: Testnachricht → 409", r.status);
  await admin.post(`/api/admin/anlagen/geraete/${gid}`, { aktion: "entsperren" });
  r = await admin.post(`/api/admin/anlagen/geraete/${gid}`, { aktion: "testnachricht" });
  pruefe(r.status === 200 && r.json.zugang?.status === "verbunden", "Testnachricht (Demo) → verbunden", r.json.zugang?.status);
  r = await fremd.get(`/api/portal/anlagen/${tid}/messdaten?${zeit}`);
  pruefe(r.status === 200 && r.json.punkte?.length > 0, "Nach der ersten Nachricht: Messdaten vorhanden", r.json.punkte?.length);
  r = await fremd.get(`/api/admin/anlagen/geraete/${gid}`);
  pruefe(r.status === 403, "Kunde: Gerätestatus-API → 403", r.status);

  // ------------------------------------------------------------ 5. Stammdaten-Regeln
  abschnitt("5. Messpunkte und Monatswerte");
  r = await admin.post(`/api/admin/anlagen/${tid}/eintraege`, { art: "messpunkt", daten: { zaehlernummer: "MON-1", art: "erzeugung", messstelle: "monitoring", abrechnungsrelevant: true } });
  pruefe(r.status === 422, "MQTT-Messpunkt kann nicht abrechnungsrelevant sein → 422", r.status);
  r = await admin.post(`/api/admin/anlagen/${tid}/eintraege`, { art: "messpunkt", daten: { zaehlernummer: `1TEST${LAUF}`, art: "zweirichtung", messstelle: "geeicht", abrechnungsrelevant: true, smgw: true } });
  pruefe(r.status === 200 && r.json.eintrag?.abrechnungsrelevant === true, "Geeichter Zweirichtungszähler abrechnungsrelevant", r.status);
  const mpId = r.json.eintrag?.id;
  r = await admin.post(`/api/admin/anlagen/${tid}/eintraege`, { art: "monatswert", daten: { messpunktId: mpId, register: "1.8.0", monat: monatVor(2), stand: 1000 } });
  pruefe(r.status === 200, "Monatswert erfasst", r.status);
  r = await admin.post(`/api/admin/anlagen/${tid}/eintraege`, { art: "monatswert", daten: { messpunktId: mpId, register: "1.8.0", monat: monatVor(1), stand: 900 } });
  pruefe(r.status === 422, "Zählerstand kleiner als im Vormonat → 422", r.status);
  r = await admin.post(`/api/admin/anlagen/${tid}/eintraege`, { art: "monatswert", daten: { messpunktId: mpId, register: "1.8.0", monat: monatVor(1), stand: 1850.5 } });
  pruefe(r.status === 200 && r.json.eintrag?.menge === 850.5, "Menge = Differenz zum Vormonat", r.json.eintrag?.menge);

  // ------------------------------------------------------------ 6. Störungen
  abschnitt("6. Störung: Benachrichtigung, Kommentar, Quittieren nur berechtigt");
  r = await fremd.post("/api/admin/anlagen/stoerungen", { anlageId: tid, schwere: "hoch", titel: "Test" });
  pruefe(r.status === 403, "Kunde kann keine Störung über die Admin-API anlegen → 403", r.status);
  r = await admin.post("/api/admin/anlagen/stoerungen", { anlageId: tid, schwere: "hoch", titel: `Wechselrichter 2 ohne Einspeisung ${LAUF}`, text: "Befund bei der Sichtprüfung (Test)." });
  pruefe(r.status === 201 && r.json.stoerung?.status === "offen", "Betrieb erfasst Störung", r.status);
  const sid = r.json.stoerung?.id;
  r = await fremd.get("/api/portal/benachrichtigungen");
  pruefe((r.json.eintraege || []).some((b) => b.art === "stoerung" && b.link?.startsWith(`/portal/anlagen/${tid}`)), "Kunde erhält Benachrichtigung „Anlagenstörung“ mit Portal-Link", r.json.eintraege?.map((b) => b.art));
  r = await fremd.post(`/api/portal/anlagen/stoerungen/${sid}`, { aktion: "quittieren" });
  pruefe(r.status === 403, "Kunde quittiert → 403", r.status);
  r = await fremd.post(`/api/portal/anlagen/stoerungen/${sid}`, { aktion: "status", status: "behoben" });
  pruefe(r.status === 403, "Kunde setzt Status → 403", r.status);
  r = await kunde.post(`/api/portal/anlagen/stoerungen/${sid}`, { aktion: "kommentar", text: "Fremder Kommentar" });
  pruefe(r.status === 403, "Anderer Kunde kommentiert fremde Störung → 403", r.status);
  r = await kunde.post(`/api/portal/anlagen/stoerungen/${sid}`, { aktion: "quittieren" });
  pruefe(r.status === 403, "Anderer Kunde quittiert fremde Störung → 403", r.status);
  r = await fremd.post(`/api/portal/anlagen/stoerungen/${sid}`, { aktion: "kommentar", text: "Die Halle ist ab 7 Uhr zugänglich." });
  pruefe(r.status === 200 && r.json.stoerung?.kommentare?.length === 1, "Kunde kommentiert eigene Störung", r.status);
  r = await fremd.post(`/api/portal/anlagen/stoerungen/${sid}`, { aktion: "kommentar", text: "x" }, { origin: "https://boese.example.org" });
  pruefe(r.status === 403, "CSRF beim Kommentar → 403", r.status);

  const akquise = new Client("bo-akquise");
  if (await akquise.versucheLogin("bo-akquise@example.com")) {
    r = await akquise.post(`/api/portal/anlagen/stoerungen/${sid}`, { aktion: "quittieren" });
    pruefe(r.status === 403, "Backoffice-Unterrolle Akquise quittiert → 403", r.status);
    r = await akquise.get("/api/admin/anlagen");
    pruefe(r.status === 403, "Akquise: Leitstand → 403", r.status);
  } else pruefe(true, "bo-akquise nicht vorhanden – übersprungen");
  const lesen = new Client("bo-lesen");
  if (await lesen.versucheLogin("bo-lesen@example.com")) {
    r = await lesen.get("/api/admin/anlagen");
    pruefe(r.status === 200, "Nur-lesen: Leitstand sichtbar", r.status);
    r = await lesen.post(`/api/portal/anlagen/stoerungen/${sid}`, { aktion: "quittieren" });
    pruefe(r.status === 403, "Nur-lesen quittiert → 403", r.status);
  } else pruefe(true, "bo-lesen nicht vorhanden – übersprungen");

  const betrieb = new Client("bo-betrieb");
  await betrieb.login("bo-betrieb@example.com");
  r = await betrieb.post(`/api/portal/anlagen/stoerungen/${sid}`, { aktion: "quittieren" });
  pruefe(r.status === 200 && r.json.stoerung?.quittiert === true && r.json.stoerung?.status === "in_arbeit", "Betrieb quittiert → in Arbeit", r.json.stoerung);
  r = await admin.post(`/api/portal/anlagen/stoerungen/${sid}`, { aktion: "quittieren" });
  pruefe(r.status === 409, "Zweites Quittieren → 409", r.status);
  r = await betrieb.post(`/api/portal/anlagen/stoerungen/${sid}`, { aktion: "kommentar", text: "Techniker bestellt (intern)", intern: true });
  pruefe(r.status === 200, "Interner Kommentar des Betriebs", r.status);
  r = await fremd.get(`/api/portal/anlagen/stoerungen?anlage=${tid}`);
  const sk = (r.json.stoerungen || []).find((s) => s.id === sid);
  pruefe(sk && sk.kommentare.length === 1 && !sk.kommentare.some((k) => k.intern) && !r.text.includes("Techniker bestellt"), "Kunde sieht den internen Kommentar nicht", sk?.kommentare);
  r = await betrieb.get("/api/admin/vorgaenge");
  pruefe(r.status === 403, "Betrieb: kein Zugriff auf Vorgänge (Rechte-Matrix)", r.status);
  r = await betrieb.post(`/api/portal/anlagen/stoerungen/${sid}`, { aktion: "status", status: "behoben" });
  pruefe(r.status === 200 && r.json.stoerung?.status === "behoben", "Betrieb setzt „behoben“", r.status);
  r = await fremd.get("/api/portal/benachrichtigungen");
  pruefe((r.json.eintraege || []).some((b) => b.art === "stoerung" && /behoben/i.test(b.titel)), "Kunde wird über die Behebung benachrichtigt");

  // ------------------------------------------------------------ 7. Seiten
  abschnitt("7. Seiten");
  for (const [cl, pfad, soll] of [
    [kunde, "/portal/anlagen", 200],
    [kunde, `/portal/anlagen/${eigeneId}`, 200],
    [kunde, `/portal/anlagen/${eigeneId}?tab=zaehler`, 200],
    [kunde, `/portal/anlagen/${eigeneId}?tab=vertrag`, 200],
    [kunde, `/portal/anlagen/${fremdId}`, 404],
    [kunde, "/portal/admin/anlagen", 404],
    [fremd, `/portal/anlagen/${eigeneId}?tab=stoerungen`, 404],
    [admin, "/portal/admin/anlagen", 200],
    [admin, "/portal/admin/anlagen/neu", 200],
    [admin, `/portal/admin/anlagen/${tid}`, 200],
    [betrieb, "/portal/admin/anlagen", 200],
  ]) {
    r = await cl.get(pfad);
    // Portal-Seiten streamen (loading.js): notFound() kann nach dem ersten Byte kommen → Status 200 mit 404-Fallback
    const nichtGefunden = r.status === 404 || r.text.includes("NEXT_HTTP_ERROR_FALLBACK;404");
    pruefe(soll === 404 ? nichtGefunden && !r.text.includes("Thurgau") && !r.text.includes("Obstplantage") : r.status === 200 && !nichtGefunden, `${pfad} (${cl.name}) → ${soll}`, r.status);
  }

  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen bestanden")} (${ok} ok)`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.message}`));
  process.exit(1);
});
