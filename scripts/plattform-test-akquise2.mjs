// scripts/plattform-test-akquise2.mjs
//
// End-to-End-Test „Akquise Ausbaustufe 2“ (Deutschland/Schweiz, Kampagnen, Sperrliste, Angebotsseite, Gemeinde-Screening)
// gegen den laufenden Dev-Server (Demo-Backend + Demo-Geodaten):
//   node scripts/plattform-test-akquise2.mjs [basis-url]
//
// Prüft: Rechte (nur Leitung/Akquise; Transaktion, Nur-lesen, Investor → 403/404, Gast → 401, CSRF → 403) · DE-Kandidaten mit
// EEG-Kulisse/Privilegierung und Verkehrsebene · Kampagne → Grundbuch-Aufgaben → Eigentümer → Serienbrief-PDF + Versandliste →
// Versand · Angebotsseite per Einmalcode (noindex, KEINE Eigentümerdaten), Aufruf/Anfrage/Widerspruch · Sperrliste greift über
// Kampagnen (Person und Flurstücke) · Nachfass-Regeln (reine Funktion) · Kennzahlen · Gemeinde-Screening (Ranking, Stand,
// Konkurrenz, Übergabe an CRM).
// Aufräumen: Kampagnen werden als TESTKAMPAGNEN angelegt und am Ende vollständig gelöscht (inkl. Sperrvermerke, Rückläufer-
// Vorgang/Fläche, Aufgaben); Gemeinde-Angaben werden zurückgesetzt – keine Dauerverschmutzung der Demo-DB.

import { nachfassFaellig, kampagnenKennzahlen, personSchluessel, codeNormalisieren } from "../src/lib/plattform/akquise-kampagne.js";

const BASIS = (process.argv[2] || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Math.random().toString(36).slice(2, 7).toUpperCase();

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
    console.log(`  ${rot("✗")} ${text}${details !== undefined ? ` – ${JSON.stringify(details).slice(0, 500)}` : ""}`);
  }
  return bedingung;
}
const abschnitt = (t) => console.log(`\n${t}`);

class Client {
  constructor(name) {
    this.name = name;
    this.cookie = "";
  }
  async anfrage(methode, pfad, body, { origin = BASIS, kopf = {} } = {}) {
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
        await new Promise((r) => setTimeout(r, 3000 * versuch));
      }
    }
    for (const c of res.headers.getSetCookie?.() || []) {
      const [paar] = c.split(";");
      const [name, wert] = paar.split("=");
      if (/oi_sitzung$/.test(name)) this.cookie = wert ? `${name}=${wert}` : "";
    }
    const typ = res.headers.get("content-type") || "";
    const buf = Buffer.from(await res.arrayBuffer());
    const text = /pdf/.test(typ) ? "" : buf.toString("utf8");
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 200) };
    }
    return { status: res.status, json, headers: res.headers, text, buf, typ };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  patch = (p, b, o) => this.anfrage("PATCH", p, b ?? {}, o);
  del = (p, b, o) => this.anfrage("DELETE", p, b ?? {}, o);
  async login(email, passwort = DEMO_PASSWORT) {
    let r;
    for (let versuch = 1; versuch <= 3; versuch++) {
      r = await this.post("/api/auth/login", { email, passwort });
      if (r.status !== 500) break;
      await new Promise((w) => setTimeout(w, 5000 * versuch));
    }
    if (r.status !== 200) return null;
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }
}

const aufraeumen = { kampagnen: [], gemeinden: [] };

async function main() {
  console.log(`Akquise Ausbaustufe 2 – Test gegen ${BASIS} (Lauf ${LAUF})`);
  const leitung = new Client("Leitung");
  const akquise = new Client("Akquise");
  const gast = new Client("Gast");
  if (!(await leitung.login("admin@example.com"))) throw new Error("Login admin fehlgeschlagen");
  if (!(await akquise.login("bo-akquise@example.com"))) throw new Error("Login bo-akquise fehlgeschlagen");
  const fremde = [];
  for (const [email, name] of [["bo-transaktion@example.com", "Transaktion"], ["bo-lesen@example.com", "Nur lesen"], ["investor@example.com", "Investor"]]) {
    const c = new Client(name);
    if (await c.login(email)) fremde.push(c);
  }

  try {
    // ---------------------------------------------------------------- 1. Rechte
    abschnitt("1. Rechte: nur Leitung und Akquise");
    let r = await gast.get("/api/admin/geodaten/kampagnen");
    pruefe(r.status === 401, "Gast → 401", r.status);
    r = await gast.post("/api/admin/geodaten/kampagnen", { name: "x", kandidatIds: ["K-x"] });
    pruefe(r.status === 401, "Gast: Anlegen → 401", r.status);
    for (const c of fremde) {
      for (const pfad of ["/api/admin/geodaten/kampagnen", "/api/admin/geodaten/sperrliste", "/api/admin/geodaten/gemeinden?land=DE"]) {
        r = await c.get(pfad);
        pruefe(r.status === 403 && !r.json.kampagnen && !r.json.gemeinden && !r.json.eintraege, `${c.name}: GET ${pfad.split("?")[0]} → 403 ohne Daten`, r.status);
      }
      r = await c.post("/api/admin/geodaten/kampagnen", { name: "Fremd", kandidatIds: ["K-DEMO-DE-001"] });
      pruefe(r.status === 403, `${c.name}: Kampagne anlegen → 403`, r.status);
    }
    for (const c of [leitung, akquise]) {
      r = await c.get("/api/admin/geodaten/kampagnen");
      pruefe(r.status === 200 && Array.isArray(r.json.kampagnen), `${c.name}: Kampagnen 200`, r.status);
    }
    r = await akquise.get("/portal/admin/akquise/kampagnen");
    pruefe(r.status === 200 && /Akquise-Kampagnen<\/h1>/.test(r.text), "Seite Kampagnen für Akquise → 200", r.status);
    const trans = fremde.find((c) => c.name === "Transaktion");
    if (trans) {
      for (const p of ["/portal/admin/akquise/kampagnen", "/portal/admin/akquise/gemeinden", "/portal/admin/akquise/sperrliste"]) {
        r = await trans.get(p);
        pruefe(r.status === 404 || (!/Akquise-Kampagnen<\/h1>|Gemeinde-Screening<\/h1>|Sperrliste<\/h1>/.test(r.text) && /404|nicht gefunden/i.test(r.text)), `Transaktion: ${p} → 404`, r.status);
      }
    }

    // ---------------------------------------------------------------- 2. Deutschland: Kandidaten, Kulisse, Verkehr
    abschnitt("2. Deutschland: EEG-Kulisse, Privilegierung, Verkehrsebene");
    r = await akquise.get("/api/admin/geodaten/kandidaten?land=DE&limit=500");
    const de = r.json.kandidaten || [];
    pruefe(r.status === 200 && de.length >= 10 && de.every((k) => k.land === "DE"), `DE-Kandidaten (Unterallgäu) geliefert: ${de.length}`, r.status);
    const mitKulisse = de.filter((k) => k.merkmale?.kulisse);
    pruefe(mitKulisse.length === de.length, "jeder DE-Kandidat hat Kulissen-Merkmale", mitKulisse.length);
    const privilegiert = de.find((k) => k.merkmale.kulisse.privilegiertAnteil >= 0.5);
    const rand = de.find((k) => k.merkmale.kulisse.randstreifenAnteil > 0 && k.merkmale.kulisse.privilegiertAnteil === 0);
    const ohne = de.find((k) => !k.merkmale.kulisse.randstreifenAnteil && !k.merkmale.kulisse.benachteiligtAnteil && !k.merkmale.kulisse.moorAnteil);
    pruefe(privilegiert && privilegiert.widmung.status === "zone" && /§ 35 Abs\. 1 Nr\. 8 lit\. b BauGB/.test(privilegiert.widmung.text), "A 96 ≤ 200 m → privilegiert nach § 35 BauGB", privilegiert?.widmung);
    pruefe(rand && rand.widmung.status === "unklar", "Randstreifen ohne Privilegierung → Bebauungsplan nötig", rand?.widmung?.status);
    pruefe(privilegiert?.kriterien.some((c) => c.id === "kulisse" && c.max === 14 && c.punkte > 10), "Kriterium „EEG-Flächenkulisse“ (max. 14) vergeben", privilegiert?.kriterien?.find((c) => c.id === "kulisse"));
    if (ohne) pruefe(ohne.kriterien.find((c) => c.id === "kulisse")?.punkte === 0, "ohne Kulisse: 0 Punkte (nur Agri-PV/PPA)", ohne.kriterien.find((c) => c.id === "kulisse"));
    pruefe(de.every((k) => k.kriterien.reduce((s, c) => s + (c.max || 0), 0) === 100), "Gewichte DE summieren sich auf 100");
    r = await akquise.get("/api/admin/geodaten/ebenen/verkehr?bbox=10.35,47.95,10.95,48.2");
    pruefe(r.status === 200 && r.json.features?.some((f) => f.properties.art === "autobahn") && r.json.features?.some((f) => f.properties.gleise === 2), "Verkehrsebene: A 96 und zweigleisige Hauptbahn (geschätzt)", r.status);
    r = await akquise.get(`/api/admin/geodaten/anschreiben?kandidat=${encodeURIComponent(privilegiert.id)}`);
    pruefe(r.status === 200 && /§ 12 GBO/.test(r.json.vorlage?.text) && /Art\. 21/.test(r.json.vorlage?.text) && !/Österreich · Datenschutz/.test(r.json.vorlage?.text), "Anschreiben DE: Datenquelle Grundbuch (§ 12 GBO), Widerspruch Art. 21", r.status);
    r = await akquise.get("/api/admin/geodaten");
    pruefe(r.json.regionen?.some((x) => x.land === "DE") && r.json.quellen?.some((q) => q.lizenz === "dl-de/by-2-0"), "Übersicht: Regionen AT/DE, Quelle TopPlusOpen (dl-de/by-2-0)");

    // ---------------------------------------------------------------- 3. Kampagne anlegen
    abschnitt("3. Kampagne aus Kartenauswahl");
    const gute = de.filter((k) => k.ampel !== "rot" && k.parzellen.length >= 2).slice(0, 4);
    pruefe(gute.length === 4, "vier geeignete DE-Flächen für die Tests", gute.length);
    const [kA, kB, kC, kD] = gute;
    r = await akquise.post("/api/admin/geodaten/kampagnen", { name: `AK2-Test ${LAUF}`, kandidatIds: [kA.id], test: true });
    pruefe(r.status === 422 && /Leitung/.test(r.json.error), "Testkampagne nur durch die Leitung → 422 für Akquise", r.status);
    const at = (await akquise.get("/api/admin/geodaten/kandidaten?land=AT&limit=5")).json.kandidaten?.[0];
    if (at) {
      r = await leitung.post("/api/admin/geodaten/kampagnen", { name: `AK2-Test ${LAUF} gemischt`, kandidatIds: [kA.id, at.id], test: true });
      pruefe(r.status === 422 && /einem Land/.test(r.json.error), "gemischte Länder → 422", r.status);
    }
    r = await leitung.post("/api/admin/geodaten/kampagnen", { name: `AK2-Test ${LAUF}`, kandidatIds: [kA.id] }, { origin: "https://boese.example" });
    pruefe(r.status === 403, "CSRF (fremde Origin) → 403", r.status);
    r = await leitung.post("/api/admin/geodaten/kampagnen", { name: `AK2-Test ${LAUF} A`, kandidatIds: [kA.id, kB.id, kC.id], test: true });
    pruefe(r.status === 201 && r.json.kampagne?.id && r.json.ziele === 3, "Testkampagne mit 3 Zielflächen angelegt (201)", r.status);
    const K1 = r.json.kampagne?.id;
    if (K1) aufraeumen.kampagnen.push(K1);
    r = await akquise.get(`/api/admin/geodaten/kampagnen/${K1}`);
    const ziele = r.json.ziele || [];
    pruefe(r.status === 200 && ziele.length === 3 && ziele.every((z) => z.status === "offen" && z.grundbuch.schaetzung.betrag > 0 && !z.geometrie), "Ziele mit Grundbuch-Kostenschätzung, ohne Geometrie in der Ausgabe", ziele.map((z) => z.status));
    const zA = ziele.find((z) => z.kandidatId === kA.id);
    const zB = ziele.find((z) => z.kandidatId === kB.id);

    // ---------------------------------------------------------------- 4. Starten → Grundbuch-Aufgaben
    abschnitt("4. Start: Aufgabenkette Grundbuchabfrage");
    r = await akquise.post(`/api/admin/geodaten/kampagnen/${K1}/starten`, {});
    pruefe(r.status === 200 && r.json.aufgaben === 3 && r.json.kampagne?.status === "aktiv", "Start legt 3 Grundbuch-Aufgaben an", r.json);
    r = await akquise.post(`/api/admin/geodaten/kampagnen/${K1}/starten`, {});
    pruefe(r.status === 422, "zweiter Start → 422", r.status);
    r = await akquise.get(`/api/admin/geodaten/kampagnen/${K1}`);
    pruefe(r.json.aufgaben?.length === 3 && r.json.aufgaben.every((a) => /Grundbuchabfrage/.test(a.titel) && a.status === "offen"), "Aufgaben „Grundbuchabfrage … – ca. … €“ offen", r.json.aufgaben?.map((a) => a.titel));
    r = await akquise.get("/api/admin/aufgaben");
    pruefe(r.status === 200 && JSON.stringify(r.json).includes(`Kampagne AK2-Test ${LAUF} A`), "Aufgaben erscheinen in der Aufgabenliste des Backoffice", r.status);

    // ---------------------------------------------------------------- 5. Eigentümer erfassen
    abschnitt("5. Grundbuch-Ergebnis erfassen");
    const P1 = { anrede: "Frau", vorname: "Erika", nachname: `Testeigen${LAUF}`, strasse: "Mühlweg 7", plz: "86842", ort: "Türkheim" };
    const P2 = { anrede: "Herr", vorname: "Hans", nachname: `Widerspruch${LAUF}`, strasse: "Bahnhofstraße 3", plz: "86807", ort: "Buchloe" };
    const P3 = { firma: `Hofgut Test${LAUF} GbR`, strasse: "Am Anger 1", plz: "86825", ort: "Bad Wörishofen" };
    r = await akquise.post(`/api/admin/geodaten/kampagnen/ziele/${zA.id}/grundbuch`, { empfaenger: [P1], kostenIst: 16 });
    pruefe(r.status === 200 && r.json.neu?.length === 1 && !r.json.neu[0].gesperrt && r.json.ziel.status === "ermittelt", "Ziel A: 1 Eigentümerin erfasst, Status „ermittelt“", r.json);
    r = await akquise.post(`/api/admin/geodaten/kampagnen/ziele/${zB.id}/grundbuch`, { empfaenger: [P2, P3] });
    pruefe(r.status === 200 && r.json.neu?.length === 2, "Ziel B: 2 Eigentümer erfasst", r.status);
    r = await akquise.post(`/api/admin/geodaten/kampagnen/ziele/${zB.id}/grundbuch`, { empfaenger: [{ nachname: "Ohne Adresse" }] });
    pruefe(r.status === 422, "Eigentümer ohne Anschrift → 422", r.status);
    r = await akquise.get(`/api/admin/geodaten/kampagnen/${K1}`);
    const k1 = r.json;
    const eA = k1.ziele.find((z) => z.id === zA.id).empfaenger[0];
    const eB = k1.ziele.find((z) => z.id === zB.id).empfaenger;
    const e2 = eB.find((e) => e.nachname === P2.nachname);
    pruefe(eA.code && codeNormalisieren(eA.code) === eA.code && e2.code !== eA.code && !("sperrHash" in eA && eA.sperrHash), "Einmalcodes (10 Zeichen) je Empfänger, kein Sperr-Hash in der Ausgabe", eA.code);
    pruefe(k1.aufgaben.filter((a) => a.status === "erledigt").length === 2, "Grundbuch-Aufgaben A und B automatisch erledigt", k1.aufgaben.map((a) => a.status));

    // ---------------------------------------------------------------- 6. Serienbrief, Versandliste, Versand
    abschnitt("6. Serienbrief-PDF, Versandliste, Versand");
    r = await akquise.get(`/api/admin/geodaten/kampagnen/${K1}/serienbrief?format=json`);
    const briefe = r.json.briefe || [];
    pruefe(r.status === 200 && briefe.length === 3, "Serienbrief: 3 Briefe (Stufe 1)", briefe.length);
    const b1 = briefe.find((b) => b.codeRoh === eA.code);
    pruefe(b1 && b1.anschrift.some((z) => z.includes(P1.nachname)) && /Sehr geehrte Frau/.test(b1.text) && /Pacht zwischen/.test(b1.text) && /€ je Hektar/.test(b1.text), "Persönliche Ansprache, Flächendaten und Pachtspanne", b1?.text?.slice(0, 200));
    pruefe(b1 && b1.link.endsWith(`/angebot/${eA.code}`) && /^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(b1.code), "Link zur Angebotsseite mit Einmalcode + lesbarer Code", b1?.link);
    pruefe(b1 && b1.datenschutz.some((z) => /Art\. 6 Abs\. 1 lit\. f DSGVO/.test(z)) && b1.datenschutz.some((z) => /§ 12 GBO/.test(z) && /§ 43a GBV/.test(z)) && /Art\. 21 Abs\. 2 DSGVO/.test(b1.widerspruch), "Datenschutzinformation (Art. 14, Datenquelle Grundbuch) und Widerspruchshinweis", b1?.datenschutz);
    pruefe(b1 && !b1.anschrift.join(" ").match(/Flst|Gemarkung/), "Anschriftfeld ohne Grundstücksangaben (Fensterkuvert)");
    pruefe(b1 && !/@|Tel\./.test(b1.text), "keine Telefonnummer/E-Mail der ÖkoInvest im Brief (nicht freigegeben)");
    r = await akquise.get(`/api/admin/geodaten/kampagnen/${K1}/serienbrief?stufe=1`);
    const seiten = (r.buf.toString("latin1").match(/\/Type \/Page\b/g) || []).length;
    pruefe(r.status === 200 && /application\/pdf/.test(r.typ) && r.buf.slice(0, 5).toString() === "%PDF-" && seiten === 6, `Druck-PDF: ${r.buf.length} Bytes, ${seiten} Seiten (2 je Brief)`, { status: r.status, typ: r.typ, seiten });
    if (process.env.AK2_PDF) (await import("node:fs")).writeFileSync(process.env.AK2_PDF, r.buf);
    for (const c of fremde) {
      r = await c.get(`/api/admin/geodaten/kampagnen/${K1}/serienbrief?stufe=1`);
      pruefe(r.status === 403 && !/pdf/.test(r.typ), `${c.name}: Serienbrief → 403`, r.status);
    }
    r = await akquise.get(`/api/admin/geodaten/kampagnen/${K1}/versandliste?stufe=1`);
    const zeilen = r.text.replace(/^﻿/, "").trim().split(/\r?\n/);
    pruefe(r.status === 200 && zeilen.length === 4 && /Nachname/.test(zeilen[0]) && zeilen.some((z) => z.includes(P1.nachname)), "Versandliste CSV: Kopf + 3 Empfänger", zeilen.length);
    r = await akquise.post(`/api/admin/geodaten/kampagnen/${K1}/versand`, { stufe: 1 });
    pruefe(r.status === 200 && r.json.anzahl === 3 && r.json.kennzahlen?.briefe === 3, "Versand bestätigt: 3 Briefe", r.json);
    r = await akquise.post(`/api/admin/geodaten/kampagnen/${K1}/versand`, { stufe: 1 });
    pruefe(r.status === 422, "erneuter Versand ohne neue Empfänger → 422", r.status);

    // ---------------------------------------------------------------- 7. Angebotsseite (öffentlich, Einmalcode)
    abschnitt("7. Angebotsseite /angebot/[code]");
    r = await gast.get(`/angebot/${eA.code}`);
    const html = r.text;
    pruefe(r.status === 200 && new RegExp(`Ihre Fläche in (<!-- -->)?${kA.gemeinde}`).test(html), "Angebotsseite 200 mit Flächen-Steckbrief", r.status);
    pruefe(/<meta name="robots" content="noindex, nofollow/.test(html), "noindex, nofollow", html.match(/<meta name="robots"[^>]*>/)?.[0]);
    pruefe(/<meta name="referrer" content="no-referrer"/.test(html), "Referrer-Policy no-referrer (Code nicht weitergeben)");
    const verboten = [P1.nachname, P1.vorname, "Mühlweg", P2.nachname, P3.firma, K1, zA.id, ...kA.parzellen.map((p) => ` ${p.gstNr}<`), ...kA.parzellen.map((p) => `Flst. ${p.gstNr}`), eB[0].code];
    const gefunden = verboten.filter((x) => x && html.includes(x));
    pruefe(gefunden.length === 0, "KEINE Eigentümerdaten, Flurstücksnummern, Kampagnen-IDs oder fremden Codes im HTML", gefunden);
    pruefe(/Pacht selbst durchrechnen/.test(html) && html.includes(String(Math.round(kA.ha * 10) / 10).replace(".", ",")), "Pachtrechner mit Vorbelegung (ha)");
    r = await gast.get("/angebot/ABCDE23456");
    pruefe(r.status === 200 && /Code nicht gefunden/.test(r.text) && /noindex/.test(r.text), "unbekannter Code → neutrale Seite (noindex)", r.status);
    r = await gast.post(`/api/angebot/${eA.code}/aufruf`, {});
    pruefe(r.status === 200, "Aufruf gemeldet", r.status);
    r = await gast.post(`/api/angebot/${eA.code}/aufruf`, {}, { origin: "https://boese.example" });
    pruefe(r.status === 403, "Aufruf mit fremder Origin → 403", r.status);
    const testEmail = `ak2-test-${LAUF.toLowerCase()}@example.com`;
    r = await gast.post(`/api/angebot/${eA.code}/anfrage`, { kontakt: { vorname: "Erika", nachname: P1.nachname, email: testEmail, telefon: "+49 8245 000000" }, nachricht: "Testlauf", rueckrufEinwilligung: true, einwilligung: true });
    pruefe(r.status === 200 && r.json.vorgang, "Anfrage über Angebotsseite → Vorgang", r.json);
    const vorgangId = r.json.vorgang;
    r = await gast.post(`/api/angebot/${eA.code}/anfrage`, { kontakt: { vorname: "E", nachname: "X", email: testEmail }, einwilligung: false });
    pruefe(r.status === 422, "Anfrage ohne Einwilligung → 422", r.status);
    r = await leitung.get(`/api/portal/vorgaenge/${vorgangId}`);
    pruefe(r.status === 200 && JSON.stringify(r.json).includes("kampagne"), "Vorgang trägt Herkunft „kampagne“", r.status);

    // ---------------------------------------------------------------- 8. Widerspruch online + Sperrliste über Kampagnen
    abschnitt("8. Widerspruch und Sperrliste über alle Kampagnen");
    r = await gast.post(`/api/angebot/${e2.code}/widerspruch`, { bestaetigt: true });
    pruefe(r.status === 200, "Widerspruch online (Art. 21) angenommen", r.status);
    r = await gast.get(`/angebot/${e2.code}`);
    pruefe(/Kein weiteres Anschreiben/.test(r.text) && !/Ihre Fläche in/.test(r.text), "Seite nach Widerspruch: gesperrt, kein Steckbrief", r.status);
    r = await akquise.get("/api/admin/geodaten/sperrliste");
    const sperre = (r.json.eintraege || []).find((s) => s.kampagneId === K1 && s.aktiv);
    pruefe(sperre && sperre.quelle === "online" && !JSON.stringify(r.json).includes(P2.nachname) && /^H\. W\*\*\*/.test(sperre.anzeige), "Sperrvermerk maskiert (kein Klartext-Name), Quelle online", sperre);
    // zweite Testkampagne: dieselbe Person (andere Schreibweise der Straße) + Ziel B erneut → gesperrt
    r = await leitung.post("/api/admin/geodaten/kampagnen", { name: `AK2-Test ${LAUF} B`, kandidatIds: [kB.id, kD.id], test: true });
    const K2 = r.json.kampagne?.id;
    if (K2) aufraeumen.kampagnen.push(K2);
    pruefe(r.status === 201 && r.json.gesperrt === 1, "zweite Testkampagne angelegt – Ziel B sofort gesperrt (alle Flurstücke mit Widerspruch)", r.json.gesperrt);
    r = await akquise.get(`/api/admin/geodaten/kampagnen/${K2}`);
    const zB2 = r.json.ziele.find((z) => z.kandidatId === kB.id);
    const zD2 = r.json.ziele.find((z) => z.kandidatId === kD.id);
    pruefe(zB2.gesperrteFlurstuecke.length === kB.parzellen.length && zB2.auchInAndererKampagne, "Flurstücke des Widersprechenden in neuer Kampagne gesperrt (vor der Grundbuchabfrage)", zB2.gesperrteFlurstuecke.length);
    pruefe(zB2.grundbuch.schaetzung.betrag < ziele.find((z) => z.id === zB.id).grundbuch.schaetzung.betrag, "Grundbuch-Kostenschätzung ohne gesperrte Flurstücke");
    await akquise.post(`/api/admin/geodaten/kampagnen/${K2}/starten`, {});
    r = await akquise.post(`/api/admin/geodaten/kampagnen/ziele/${zD2.id}/grundbuch`, { empfaenger: [{ ...P2, strasse: "Bahnhofstr. 3a" }] });
    pruefe(r.status === 200 && r.json.neu?.[0]?.gesperrt === true && r.json.ziel.status === "gesperrt", "dieselbe Person (Name + PLZ) in anderer Kampagne → sofort gesperrt", r.json.neu);
    r = await akquise.get(`/api/admin/geodaten/kampagnen/${K2}/serienbrief?format=json`);
    pruefe(r.status === 200 && r.json.briefe.length === 0, "Serienbrief der zweiten Kampagne: kein Brief an gesperrte Person", r.json.briefe?.length);
    r = await akquise.del(`/api/admin/geodaten/sperrliste/${sperre?.id}`, { begruendung: "Testlauf – irrtümlich erfasst" });
    pruefe(r.status === 403, "Sperre aufheben durch Akquise → 403 (nur Leitung)", r.status);
    r = await akquise.post("/api/admin/geodaten/sperrliste", { person: { nachname: "OhneVorname", plz: "12345" }, grund: "widerspruch" });
    pruefe(r.status === 422, "manueller Sperrvermerk ohne Vorname → 422", r.status);

    // ---------------------------------------------------------------- 9. Rücklauf, Termin, gesichert, Kennzahlen
    abschnitt("9. Rücklauf, Termin, gesichert, Kennzahlen");
    const eUrl = `/api/admin/geodaten/kampagnen/ziele/${zA.id}/empfaenger/${eA.id}`;
    r = await akquise.patch(eUrl, { termin: { am: "2026-10-20T10:00", notiz: "Begehung" } });
    pruefe(r.status === 200, "Termin erfasst", r.status);
    r = await akquise.patch(eUrl, { status: "gesichert", gesichertHa: 8 });
    pruefe(r.status === 200 && r.json.ziel.status === "gesichert", "Fläche als gesichert markiert (8 ha)", r.json.ziel?.status);
    r = await akquise.patch(eUrl, { einwilligungTelefon: { quelle: "x" } });
    pruefe(r.status === 422, "Einwilligung ohne Nachweis → 422", r.status);
    r = await akquise.get(`/api/admin/geodaten/kampagnen/${K1}`);
    const kz = r.json.kampagne.kennzahlen;
    const eA2 = r.json.ziele.find((z) => z.id === zA.id).empfaenger[0];
    pruefe(kz.briefe === 3 && kz.aufrufe >= 1 && kz.anfragen === 1 && kz.termine === 1 && kz.widersprueche === 1 && kz.gesichertHa === 8, "Kennzahlen: Briefe, Aufrufe, Anfragen, Termine, Widersprüche, gesicherte ha", kz);
    pruefe(kz.kosten.grundbuch === 16 && kz.kosten.versand > 0 && kz.kostenJeHa === Math.round(kz.kosten.summe / 8), "Kosten (Grundbuch Ist + Versand) und Kosten je gesichertem ha", { kosten: kz.kosten, einstellung: r.json.kampagne.kosten, land: r.json.kampagne.land, briefe: kz.briefe });
    pruefe(eA2.einwilligungTelefon?.quelle && eA2.anfragen.length === 1, "Einwilligung Telefon aus dem Formular vermerkt", eA2.einwilligungTelefon);
    r = await akquise.post("/api/admin/geodaten/kampagnen/nachfassen", {});
    pruefe(r.status === 200 && r.json.ausgeloest === 0, "Nachfassen jetzt: noch nichts fällig (Fristen ≥ 7 Tage)", r.json);

    // ---------------------------------------------------------------- 10. Nachfass-Regeln (reine Funktion, gleiche Logik wie Backend)
    abschnitt("10. Nachfass-Regeln (UWG/TKG, einmaliger Zweitbrief)");
    const kamp = { status: "aktiv", nachfass: [{ id: "s1", art: "zweiter_brief", nachTagen: 28, aktiv: true }, { id: "s2", art: "anruf_einwilligung", nachTagen: 42, aktiv: true }] };
    const brief = { nr: 1, am: "2026-08-01T08:00:00Z" };
    const basisE = { briefe: [brief], status: "angeschrieben", aufrufe: 3 };
    let f = nachfassFaellig(kamp, basisE, "2026-08-20T08:00:00Z");
    pruefe(f.length === 0, "vor Fristablauf nichts fällig");
    f = nachfassFaellig(kamp, basisE, "2026-09-20T08:00:00Z");
    pruefe(f.length === 2 && f[0].ergebnis === "aufgabe" && f[1].ergebnis === "uebersprungen" && /Einwilligung/.test(f[1].grund), "nach 42 Tagen: Zweitbrief-Aufgabe, Anruf ohne Einwilligung übersprungen (Aufrufe zählen nicht als Reaktion)", f);
    f = nachfassFaellig(kamp, { ...basisE, einwilligungTelefon: { am: "2026-08-05" } }, "2026-09-20T08:00:00Z");
    pruefe(f[1]?.ergebnis === "aufgabe", "mit Einwilligung: Anruf-Aufgabe");
    pruefe(nachfassFaellig(kamp, { ...basisE, anfragen: [{}] }, "2026-09-20T08:00:00Z").length === 0, "nach Anfrage kein Nachfassen");
    pruefe(nachfassFaellig(kamp, { ...basisE, gesperrt: true }, "2026-09-20T08:00:00Z").length === 0, "gesperrt: nie nachfassen");
    pruefe(nachfassFaellig(kamp, { ...basisE, briefe: [brief, { nr: 2, am: "2026-09-01" }], nachfass: {} }, "2026-09-20T08:00:00Z")[0]?.ergebnis === "uebersprungen", "nie mehr als zwei Briefe");
    pruefe(personSchluessel({ vorname: "Hans", nachname: "Müller", plz: "86807", strasse: "Bahnhofstraße 3" }) === personSchluessel({ vorname: "hans", nachname: "Mueller", plz: "86807 ", strasse: "Bahnhofstr. 3a" }), "Sperr-Schlüssel robust gegen Schreibweisen (Umlaute, Straße)");
    pruefe(kampagnenKennzahlen({ land: "DE" }, []).kostenJeHa === null, "Kennzahlen ohne gesicherte Fläche: Kosten je ha = null");

    // ---------------------------------------------------------------- 11. Gemeinde-Screening
    abschnitt("11. Gemeinde-Screening");
    r = await akquise.get("/api/admin/geodaten/gemeinden?land=DE");
    const gem = r.json.gemeinden || [];
    pruefe(r.status === 200 && gem.length >= 5 && gem.every((g, i) => i === 0 || g.ranking.punkte <= gem[i - 1].ranking.punkte) && gem[0].rang === 1, `Ranking ${gem.length} Gemeinden, absteigend`, r.status);
    pruefe(gem.every((g) => g.ranking.teile.length === 6 && g.ranking.teile.reduce((s, t) => s + t.max, 0) === 100 && ["A", "B", "C"].includes(g.ranking.stufe)), "Ranking-Bausteine (Summe 100) und Stufe A/B/C");
    const g1 = gem.find((g) => g.name === kA.gemeinde) || gem[0];
    pruefe(g1.kampagnen.ziele >= 1 && g1.kampagnen.gesichertHa >= 8, "Kampagnen-Stand je Gemeinde (Ziele, gesicherte ha)", g1.kampagnen);
    aufraeumen.gemeinden.push(g1.schluessel);
    const basis = { schluessel: g1.schluessel, name: g1.name, land: g1.land, bundesland: g1.bundesland };
    const vorher = g1.ranking.punkte;
    r = await akquise.patch("/api/admin/geodaten/gemeinden", { ...basis, bauleitplanung: "fnp", kriterienkatalog: "ja", notiz: "Testlauf" });
    pruefe(r.status === 200, "Stand Bauleitplanung/Kriterienkatalog gepflegt", r.status);
    r = await akquise.post("/api/admin/geodaten/gemeinden/konkurrenz", { ...basis, entwickler: "Wettbewerber Test", mw: 30, status: "verfahren", quelle: "" });
    pruefe(r.status === 422, "Konkurrenzhinweis ohne Quelle → 422", r.status);
    r = await akquise.post("/api/admin/geodaten/gemeinden/konkurrenz", { ...basis, entwickler: "Wettbewerber Test", mw: 30, status: "verfahren", quelle: "Gemeinderatsprotokoll (Test)" });
    pruefe(r.status === 201, "Konkurrenzhinweis mit Quelle erfasst", r.status);
    const kkId = r.json.id;
    r = await akquise.get("/api/admin/geodaten/gemeinden?land=DE");
    const g1b = r.json.gemeinden.find((g) => g.schluessel === g1.schluessel);
    pruefe(g1b.bauleitplanung === "fnp" && g1b.ranking.teile.find((t) => t.id === "planung").punkte === 15 && g1b.ranking.teile.find((t) => t.id === "konkurrenz").punkte < 10, "Ranking berücksichtigt Planung (+) und Konkurrenz (−)", { vorher, nachher: g1b.ranking.punkte });
    for (const c of fremde.filter((x) => x.name === "Transaktion")) {
      r = await c.post("/api/admin/geodaten/gemeinden/uebergabe", { ...basis });
      pruefe(r.status === 403, "Transaktion: Übergabe → 403", r.status);
    }
    r = await akquise.post("/api/admin/geodaten/gemeinden/uebergabe", { ...basis, terminAm: "2026-10-22T09:00", notiz: "Testlauf Übergabe", punkte: g1b.ranking.punkte });
    pruefe(r.status === 201 && r.json.organisationId && r.json.aktivitaetId && r.json.aufgabeId, "Übergabe an Kommune-Ansprache: CRM-Organisation, Termin-Aktivität, Aufgabe", r.json);
    r = await akquise.get(`/api/admin/crm/organisationen/${r.json.organisationId}`);
    pruefe(r.status === 200 && JSON.stringify(r.json).includes("Termin Gemeinde"), "CRM-Organisation zeigt die Termin-Aktivität", r.status);
    r = await akquise.del("/api/admin/geodaten/gemeinden/uebergabe", { schluessel: g1.schluessel });
    pruefe(r.status === 403, "Übergabe zurücknehmen durch Akquise → 403 (nur Leitung)", r.status);
    r = await leitung.del("/api/admin/geodaten/gemeinden/uebergabe", { schluessel: g1.schluessel });
    pruefe(r.status === 200, "Übergabe zurückgenommen (Leitung, Aufräumen)", r.status);
    r = await akquise.del("/api/admin/geodaten/gemeinden/konkurrenz", { schluessel: g1.schluessel, id: kkId });
    pruefe(r.status === 200, "Konkurrenzhinweis entfernt", r.status);
    r = await akquise.get("/portal/admin/akquise/gemeinden");
    pruefe(r.status === 200 && /Gemeinde-Screening<\/h1>/.test(r.text), "Seite Gemeinde-Screening 200", r.status);
    r = await akquise.get(`/portal/admin/akquise/kampagnen/${K1}`);
    pruefe(r.status === 200 && r.text.includes(`AK2-Test ${LAUF} A`), "Seite Kampagne 200", r.status);

    // ---------------------------------------------------------------- 12. Löschen-Rechte
    abschnitt("12. Löschen nur für Testkampagnen durch die Leitung");
    r = await akquise.del(`/api/admin/geodaten/kampagnen/${K1}`);
    pruefe(r.status === 403, "Akquise: Testkampagne löschen → 403", r.status);
  } finally {
    // ---------------------------------------------------------------- Aufräumen
    abschnitt("Aufräumen (Testdaten)");
    for (const id of aufraeumen.kampagnen) {
      const r = await leitung.del(`/api/admin/geodaten/kampagnen/${id}`);
      pruefe(r.status === 200, `Testkampagne ${id} gelöscht ${JSON.stringify(r.json.entfernt || r.json.error || "")}`, r.status);
    }
    for (const s of aufraeumen.gemeinden) {
      const r = await leitung.del("/api/admin/geodaten/gemeinden", { schluessel: s });
      pruefe(r.status === 200 || r.status === 422, `Gemeinde-Angaben ${s} zurückgesetzt`, r.status);
    }
    const r = await leitung.get("/api/admin/geodaten/sperrliste");
    pruefe(!(r.json.eintraege || []).some((s) => aufraeumen.kampagnen.includes(s.kampagneId)), "keine Sperrvermerke der Testkampagnen übrig");
    const k = await leitung.get("/api/admin/geodaten/kampagnen");
    pruefe(!(k.json.kampagnen || []).some((x) => aufraeumen.kampagnen.includes(x.id)), "keine Testkampagnen übrig");
  }

  console.log(`\n${ok} ok, ${fehler} Fehler`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.stack || e.message}`));
  process.exit(2);
});
