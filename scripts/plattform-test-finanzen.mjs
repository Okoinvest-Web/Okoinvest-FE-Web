// scripts/plattform-test-finanzen.mjs
//
// End-to-End-Test „Finanzen & Abrechnung“ gegen den laufenden Dev-Server (Demo-Backend, ohne ERPNext).
//   node scripts/plattform-test-finanzen.mjs [basis-url]
//
// Prüft: Pachtvertrag → Gutschriften je Fälligkeit (idempotent) · Indexierung nach VPI korrekt · Umsatzbeteiligung mit
// Mindestpacht aus Zählerstand-Monatswerten · Eigentümer sieht nur eigene Abrechnungen (fremde → 403, PDF ebenso) ·
// keine Auszahlung ohne KYC (SEPA 409, „bezahlt“ 409) · nach Verifizierung (KYC-Team, Compliance) SEPA-XML pain.001
// mit gültiger Struktur · Zahlungslauf bestätigen → bezahlt · Provision (Verkauf) → Rechnung → bezahlt → Provision
// „bezahlt“ · Contracting: fehlende Monatswerte → Klärfall, danach Rechnung mit Zählerständen und Eigentümergesellschaft
// als Aussteller · Backoffice-Unterrollen · CSRF · Seiten.
// Eigene Konten fin-test-<Lauf>-…@example.com, eigene Verträge/Anlage/Projekt – Demo-Daten bleiben unberührt.

import { pain001Pruefen, ibanPruefen } from "../src/lib/plattform/finanzen/sepa.js";

const BASIS = (process.argv[2] || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);
const PASSWORT = "Finanzen-Test-Passwort-26";

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
const rund2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;
const nichtGefunden = (r) => r.status === 404 || String(r.text || "").includes("NEXT_HTTP_ERROR_FALLBACK;404");

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
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      headers["Content-Type"] ||= "application/json";
      payload = typeof body === "string" ? body : JSON.stringify(body);
    }
    let res;
    for (let versuch = 1; ; versuch++) {
      try {
        res = await fetch(BASIS + pfad, { method: methode, headers, body: payload, redirect: "manual", signal: AbortSignal.timeout(180000) });
        const html = res.status >= 500 && /text\/html/.test(res.headers.get("content-type") || "") && pfad.startsWith("/api/");
        if (html && versuch < 4) {
          await new Promise((r) => setTimeout(r, 4000 * versuch));
          continue;
        }
        break;
      } catch (e) {
        if (versuch >= 4) throw e;
        await new Promise((r) => setTimeout(r, 4000 * versuch));
      }
    }
    for (const c of res.headers.getSetCookie?.() || []) {
      const [paar] = c.split(";");
      const [name, wert] = paar.split("=");
      if (/oi_sitzung$/.test(name)) this.cookie = wert ? `${name}=${wert}` : "";
    }
    // Geteilte Demo-Konten: parallele Testläufe verdrängen ältere Sitzungen (max. 30 je Konto) → einmal neu anmelden
    const abgemeldet = res.status === 401 || (res.status === 307 && String(res.headers.get("location") || "").includes("/login"));
    if (abgemeldet && this.anmeldung && !pfad.startsWith("/api/auth/") && !this.erneut) {
      this.erneut = true;
      try {
        await this.login(...this.anmeldung);
        return await this.anfrage(methode, pfad, body, { origin, kopf, roh });
      } finally {
        this.erneut = false;
      }
    }
    if (roh) return res;
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = {};
    }
    return { status: res.status, json, headers: res.headers, text };
  }

  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  patch = (p, b, o) => this.anfrage("PATCH", p, b ?? {}, o);
  put = (p, b, o) => this.anfrage("PUT", p, b ?? {}, o);

  async login(email, passwort = DEMO_PASSWORT) {
    this.anmeldung = [email, passwort];
    let r;
    for (let versuch = 1; versuch <= 4; versuch++) {
      r = await this.post("/api/auth/login", { email, passwort });
      if (r.status !== 500) break;
      await new Promise((w) => setTimeout(w, 8000 * versuch)); // Dev-Server/Demo-Datenbank kurz belegt
    }
    if (r.status !== 200) throw new Error(`Login ${email} fehlgeschlagen: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }

  async registrieren(schluessel, rollen, vorname, nachname, firma = "") {
    const email = `fin-test-${LAUF}-${schluessel}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email, passwort: PASSWORT, vorname, nachname, firma, rollen, agb: true });
    if (r.status !== 201) throw new Error(`Registrierung ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    this.email = email;
    this.anmeldung = [email, PASSWORT];
    return r.json.nutzer;
  }
}

// ---------------------------------------------------------------- KYC über die APIs des KYC-Teams (Compliance verifiziert)
function pdfBytes(text) {
  const inhalt = `BT /F1 12 Tf 50 750 Td (${text}) Tj ET`;
  const obj = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>", `<< /Length ${inhalt.length} >>\nstream\n${inhalt}\nendstream`];
  let s = "%PDF-1.4\n";
  obj.forEach((o, i) => (s += `${i + 1} 0 obj\n${o}\nendobj\n`));
  return Buffer.from(`${s}trailer\n<< /Root 1 0 R >>\n%%EOF\n`, "latin1");
}
async function kycHochladen(client, name, art) {
  const fd = new FormData();
  fd.append("datei", new Blob([pdfBytes(name)]), `${art}.pdf`);
  fd.append("art", art);
  return client.anfrage("POST", "/api/portal/kyc/dokumente", fd, { kopf: { "X-Plattform-Upload": "1" } });
}
async function kycVerifizieren(eigen, comp, { vorname, nachname, iban }) {
  let r = await eigen.patch("/api/portal/kyc", { abschnitt: "kontotyp", daten: { kontotyp: "privat" } });
  const fallId = r.json.fall?.id || (await eigen.get("/api/portal/kyc")).json.fall?.id;
  if (!fallId) return { ok: false, grund: `kein KYC-Fall (${r.status} ${r.json.error || ""})` };
  await eigen.patch("/api/portal/kyc", {
    abschnitt: "person",
    daten: { vorname, nachname, geburtsdatum: "1975-05-06", geburtsort: "Teststadt", staatsangehoerigkeit: "DE", adresse: { strasse: "Testweg 1", plz: "86842", ort: "Teststadt", land: "DE" }, ausweis: { art: "personalausweis", nummer: "T22000129", behoerde: "Stadt Teststadt", gueltigBis: new Date(Date.now() + 1500 * 86400e3).toISOString().slice(0, 10) } },
  });
  await eigen.patch("/api/portal/kyc", { abschnitt: "bank", daten: { iban, kontoinhaber: `${vorname} ${nachname}` } });
  await kycHochladen(eigen, `Ausweis vorne ${vorname}`, "ausweis_vorne");
  await kycHochladen(eigen, `Ausweis hinten ${vorname}`, "ausweis_hinten");
  await eigen.patch("/api/portal/kyc", { abschnitt: "pep", daten: { istPep: false, naheStehend: false } });
  r = await eigen.post("/api/portal/kyc/einreichen", {});
  if (r.status !== 200) return { ok: false, grund: `einreichen ${r.status} ${r.json.error}` };
  r = await comp.get(`/api/admin/compliance/${fallId}`);
  for (const d of (r.json.fall?.dokumente || []).filter((x) => x.status !== "ok")) {
    await comp.post(`/api/admin/compliance/${fallId}`, { aktion: "pruefliste", dokumentId: d.id, punkte: Object.fromEntries((d.pruefpunkte || []).map((p) => [p, true])), ergebnis: "ok" });
  }
  r = await comp.post(`/api/admin/compliance/${fallId}`, { aktion: "entscheiden", ergebnis: "verifiziert", grund: "Test Finanzen" });
  return { ok: r.status === 200 && r.json.status === "verifiziert", grund: `${r.status} ${r.json.status || r.json.error}` };
}

async function main() {
  console.log(`Finanzen-Test gegen ${BASIS} (Lauf ${LAUF})`);
  const gast = new Client("gast");
  const admin = new Client("admin");
  const buchhaltung = new Client("bo-buchhaltung");
  const lesen = new Client("bo-lesen");
  const akquise = new Client("bo-akquise");
  const comp = new Client("compliance");
  const eigen = new Client("eigentümerin");
  const fremd = new Client("fremder eigentümer");
  const kunde = new Client("contracting-kunde");
  const anbieter = new Client("anbieter");
  const investor = new Client("investor");
  let r;

  abschnitt("1. Vorbereitung: Konten");
  await admin.login("admin@example.com");
  await buchhaltung.login("bo-buchhaltung@example.com");
  await lesen.login("bo-lesen@example.com");
  await akquise.login("bo-akquise@example.com");
  const hatCompliance = await comp.login("bo-compliance@example.com").then(() => true).catch(() => false);
  await eigen.registrieren("eigen", ["flaeche"], "Frieda", `Finanz${LAUF}`);
  await fremd.registrieren("fremd", ["flaeche"], "Fred", `Fremd${LAUF}`);
  await kunde.registrieren("kunde", ["unternehmen"], "Karl", `Kunde${LAUF}`, `Finanztest Logistik ${LAUF} GmbH`);
  await anbieter.registrieren("anbieter", ["anbieter"], "Anna", `Anbieter${LAUF}`, `Finanztest Entwicklung ${LAUF}`);
  await investor.registrieren("investor", ["investor"], "Ivo", `Investor${LAUF}`);
  pruefe(true, "Konten registriert (Eigentümerin, fremder Eigentümer, Contracting-Kunde, Anbieter, Investor)");
  // KYC-Gating gilt in der Entwicklung nur für Pilot-Konten (PLATTFORM_KYC_GATING) – Eigentümerin als Pilot aufnehmen
  if (hatCompliance) {
    r = await comp.put("/api/admin/compliance/einstellungen", { pilotKonto: { id: eigen.nutzer.id, an: true } });
    pruefe(r.status === 200, "Eigentümerin als Pilot-Konto des KYC-Gatings (Auszahlung) aufgenommen", r.status);
  }

  // ------------------------------------------------------------ 2. Pachtvertrag indexiert
  abschnitt("2. Pachtvertrag (indexiert) und Gutschriften je Fälligkeit");
  const vpi = await admin.get("/api/admin/finanzen/vpi");
  pruefe(vpi.status === 200 && vpi.json.werte?.length >= 10, "VPI-Tabelle lesbar", vpi.status);
  const w = (j) => vpi.json.werte.find((x) => x.reihe === "VPI-DE-2020" && x.jahr === j)?.wert;
  r = await admin.post("/api/admin/finanzen/pachtvertraege", { daten: { eigentuemerId: eigen.nutzer.id, bezeichnung: `Testpacht indexiert ${LAUF}`, land: "DE", flaecheHa: 10, modell: "indexiert", pachtJahr: 30000, index: { reihe: "VPI-DE-2020", basisJahr: 2022 }, vertragsdatum: "2023-06-01", beginnArt: "inbetriebnahme", beginn: "2024-01-01", laufzeitJahre: 25, faelligkeit: "jaehrlich", zahlweise: "vorschuessig", status: "aktiv" } });
  const pt = r.json.vertrag;
  pruefe(r.status === 201 && pt?.id, "Backoffice legt Pachtvertrag an (201)", r.json);
  r = await eigen.post("/api/admin/finanzen/pachtvertraege", { daten: { bezeichnung: "x" } });
  pruefe(r.status === 403, "Eigentümerin kann keinen Vertrag über die Admin-API anlegen → 403", r.status);
  r = await admin.post("/api/admin/finanzen/pachtvertraege", { daten: { eigentuemerId: eigen.nutzer.id, bezeichnung: "Umsatz ohne Anlage", land: "DE", modell: "umsatz", umsatz: { anteil: 5, erloesCtKwh: 8 }, vertragsdatum: "2025-01-01", laufzeitJahre: 20 } });
  pruefe(r.status === 422, "Umsatzbeteiligung ohne Anlage → 422", r.status);
  r = await admin.post("/api/admin/finanzen/lauf", { art: "pacht", vertragIds: [pt.id], trockenlauf: true });
  pruefe(r.status === 200 && r.json.lauf.erzeugt.length === 3 && r.json.lauf.erzeugt.every((b) => b.nummer === "(Vorschau)"), "Trockenlauf zeigt 3 Gutschriften (2024–2026) ohne Belege", r.json.lauf?.erzeugt?.length);
  r = await admin.post("/api/admin/finanzen/lauf", { art: "pacht", vertragIds: [pt.id] });
  const erzeugt = r.json.lauf?.erzeugt || [];
  pruefe(r.status === 200 && erzeugt.length === 3 && erzeugt.every((b) => /^PG-\d{4}-\d{5}$/.test(b.nummer)), "Lauf erzeugt 3 Gutschriften mit fortlaufender Nummer PG-JJJJ-NNNNN", erzeugt.map((b) => b.nummer));
  r = await admin.post("/api/admin/finanzen/lauf", { art: "pacht", vertragIds: [pt.id] });
  pruefe(r.status === 200 && r.json.lauf.erzeugt.length === 0 && r.json.lauf.vorhanden === 3, "Zweiter Lauf erzeugt nichts (idempotent je Periode)", r.json.lauf);
  // Anpassung zum 1.1. mit dem Jahresdurchschnitt des Vorjahres ggü. dem Index der letzten Anpassung (Basisjahr 2022)
  const s24 = rund2(30000 * (1 + (w(2023) / w(2022) - 1)));
  const s25 = rund2(s24 * (1 + (w(2024) / w(2023) - 1)));
  const s26 = rund2(s25 * (1 + (w(2025) / w(2024) - 1)));
  const netto = (jahr) => erzeugt.find((b) => b.zeitraum.von.startsWith(String(jahr)))?.netto;
  pruefe(netto(2024) === s24 && netto(2025) === s25 && netto(2026) === s26, `Indexierung korrekt: 2024 ${s24} · 2025 ${s25} · 2026 ${s26} € (VPI DE 2022 → 2025)`, { 2024: netto(2024), 2025: netto(2025), 2026: netto(2026) });

  // ------------------------------------------------------------ 3. Sichtbarkeit
  abschnitt("3. Eigentümer sieht nur eigene Abrechnungen");
  r = await eigen.get("/api/portal/finanzen?jahr=2026");
  const eigeneBelege = r.json.pacht?.belege || [];
  pruefe(r.status === 200 && eigeneBelege.length === 3 && r.json.pacht.vertraege?.[0]?.erklaerung?.some((z) => /wertgesichert/.test(z)), "Eigentümerin sieht 3 Gutschriften und die Indexierung erklärt", { n: eigeneBelege.length, erkl: r.json.pacht?.vertraege?.[0]?.erklaerung });
  pruefe(!!r.json.pacht?.naechsteZahlung?.faelligAm && r.json.pacht.naechsteZahlung.faelligAm >= "2027-01-01", "Nächste Zahlung angezeigt (Januar 2027)", r.json.pacht?.naechsteZahlung);
  pruefe(r.json.pacht?.auszahlung?.ok === false, "Auszahlung vor Verifizierung als gesperrt markiert", r.json.pacht?.auszahlung);
  const bid = eigeneBelege[0]?.id;
  r = await fremd.get(`/api/portal/finanzen/${bid}`);
  pruefe(r.status === 403 && !r.text.includes(eigen.nutzer.nachname), "Fremder Eigentümer → 403 ohne Inhalte", { status: r.status, text: r.text.slice(0, 160) });
  r = await fremd.get("/api/portal/finanzen");
  pruefe(r.status === 200 && (r.json.pacht?.belege || []).length === 0, "Fremder Eigentümer sieht keine fremden Belege", r.json.pacht?.belege?.length);
  r = await fremd.anfrage("GET", `/api/portal/finanzen/${bid}/pdf`, undefined, { roh: true });
  pruefe(r.status === 403, "PDF fremder Gutschrift → 403", r.status);
  r = await gast.get(`/api/portal/finanzen/${bid}`);
  pruefe(r.status === 401, "Ohne Anmeldung → 401", r.status);
  r = await eigen.anfrage("GET", `/api/portal/finanzen/${bid}/pdf`, undefined, { roh: true });
  const pdf = Buffer.from(await r.arrayBuffer());
  pruefe(r.status === 200 && /application\/pdf/.test(r.headers.get("content-type") || "") && pdf.subarray(0, 5).toString() === "%PDF-" && pdf.includes(Buffer.from("Gutschrift", "latin1")), "Eigene Gutschrift als PDF (Bezeichnung „Gutschrift“)", { status: r.status, len: pdf.length });
  r = await akquise.get("/api/admin/finanzen");
  pruefe(r.status === 403, "Backoffice-Unterrolle Akquise → 403 im Bereich Finanzen", r.status);
  r = await lesen.get("/api/admin/finanzen");
  pruefe(r.status === 200 && r.json.kennzahlen, "Unterrolle „Nur lesen“ sieht das Cockpit", r.status);
  r = await lesen.post("/api/admin/finanzen/lauf", { art: "pacht" });
  pruefe(r.status === 403, "Unterrolle „Nur lesen“ startet keinen Lauf → 403", r.status);
  r = await admin.post("/api/admin/finanzen/lauf", { art: "pacht" }, { origin: "https://boese.example.org" });
  pruefe(r.status === 403, "CSRF: fremder Origin → 403", r.status);
  r = await admin.post("/api/admin/finanzen/lauf", "art=pacht", { kopf: { "Content-Type": "application/x-www-form-urlencoded" } });
  pruefe(r.status === 415, "CSRF: kein JSON → 415", r.status);

  // ------------------------------------------------------------ 4. Umsatzbeteiligung + Contracting (eigene Anlage, SPV)
  abschnitt("4. Anlage der Eigentümergesellschaft: Umsatzbeteiligung mit Mindestpacht, Contracting mit Klärfall");
  const spv = `Solarpark Finanztest ${LAUF} GmbH (Test)`;
  r = await admin.post("/api/admin/anlagen", { eigentuemer: spv, dachgeberIstKunde: true, name: `Finanztest-Dach ${LAUF} (Test)`, typ: "dach", status: "betrieb", land: "DE", bundesland: "Bayern", ort: "Raum Augsburg", kwp: 800, wechselrichterAnzahl: 4, lastprofil: "gewerbe", lastJahrKwh: 900000, inbetriebnahme: "2025-06-01", kundeId: kunde.nutzer.id });
  const aid = r.json.anlage?.id;
  pruefe(r.status === 201 && aid, "Anlage (Eigentümer: SPV) für den Contracting-Kunden angelegt", r.json);
  const eintrag = async (art, daten) => {
    let e = await admin.post(`/api/admin/anlagen/${aid}/eintraege`, { art, daten });
    for (let i = 1; i <= 3 && e.status === 500; i++) {
      await new Promise((w) => setTimeout(w, 5000 * i)); // Demo-Datenbank kurzzeitig gesperrt (paralleler Betrieb)
      e = await admin.post(`/api/admin/anlagen/${aid}/eintraege`, { art, daten });
    }
    if (e.status !== 200) console.log(`    (Eintrag ${art}: ${e.status} ${e.json.error || ""})`);
    return e;
  };
  r = await eintrag("messpunkt", { bezeichnung: "Erzeugung (geeicht)", zaehlernummer: `1ERZ${LAUF}`, art: "erzeugung", messstelle: "geeicht", abrechnungsrelevant: true });
  const mp = r.json.eintrag?.id;
  r = await eintrag("vertrag", { beginn: "2025-06-01", laufzeitJahre: 15, strompreisCt: 12, grundgebuehrMonat: 150, indexierungPct: 0, indexBasis: "fest" });
  pruefe(r.status === 200, "Contracting-Vertrag an der Anlage gespeichert", r.json);
  const staende = [["2025-12", 100000], ["2026-01", 120000], ["2026-02", 140000], ["2026-03", 160000], ["2026-04", 260000], ["2026-05", 360000], ["2026-06", 460000]];
  for (const [monat, stand] of staende) await eintrag("monatswert", { messpunktId: mp, monat, register: "2.8.0", stand, geprueft: true });
  pruefe(!!mp, "Geeichter Erzeugungszähler, Contracting-Vertrag und Monatswerte Dez 2025 – Jun 2026 erfasst", mp);
  r = await admin.post("/api/admin/finanzen/pachtvertraege", { daten: { eigentuemerId: eigen.nutzer.id, bezeichnung: `Umsatzpacht ${LAUF}`, land: "DE", flaecheHa: 1, anlageId: aid, modell: "umsatz", umsatz: { anteil: 5, erloesCtKwh: 8, mindestJahr: 2000 }, vertragsdatum: "2025-12-01", beginnArt: "inbetriebnahme", beginn: "2026-01-01", laufzeitJahre: 20, faelligkeit: "quartalsweise", zahlweise: "nachschuessig", status: "aktiv" } });
  const pu = r.json.vertrag;
  pruefe(r.status === 201 && pu?.gesellschaft === spv, "Umsatzpacht angelegt – Pächter ist die Eigentümergesellschaft der Anlage", pu?.gesellschaft);
  r = await admin.post("/api/admin/finanzen/lauf", { art: "pacht", vertragIds: [pu.id] });
  const q = r.json.lauf?.erzeugt || [];
  const q1 = q.find((b) => b.zeitraum.von === "2026-01-01");
  const q2 = q.find((b) => b.zeitraum.von === "2026-04-01");
  pruefe(q1?.netto === 500, "Q1: 60.000 kWh × 8 ct × 5 % = 240 € < Mindestpacht 500 € → 500 €", q1);
  pruefe(q2?.netto === 1200, "Q2: 300.000 kWh × 8 ct × 5 % = 1.200 € > Mindestpacht → 1.200 €", q2);
  r = await admin.get(`/api/admin/finanzen/abrechnungen/${q1?.id}`);
  pruefe(r.json.abrechnung?.positionen?.length === 2 && r.json.abrechnung.positionen[1].text.includes("Mindestpacht") && r.json.abrechnung.aussteller?.name === spv, "Q1-Gutschrift: Aufstockung auf die Mindestpacht als eigene Position, Aussteller = SPV", r.json.abrechnung?.positionen);

  r = await admin.post("/api/admin/finanzen/lauf", { art: "contracting", monat: "2026-08", anlageIds: [aid] });
  pruefe(r.status === 200 && r.json.lauf.erzeugt.length === 0 && r.json.lauf.klaerfaelle.length === 1 && /fehlt/.test(r.json.lauf.klaerfaelle[0].gruende[0]), "Contracting August ohne Monatswert → Klärfall statt Rechnung", r.json.lauf);
  r = await admin.get("/api/admin/finanzen/klaerfaelle");
  const kf = (r.json.klaerfaelle || []).find((k) => k.bezug?.anlageId === aid);
  pruefe(!!kf && kf.status === "offen", "Klärfall in der Liste (offen)", kf);
  await eintrag("monatswert", { messpunktId: mp, monat: "2026-07", register: "2.8.0", stand: 560000, geprueft: true });
  await eintrag("monatswert", { messpunktId: mp, monat: "2026-08", register: "2.8.0", stand: 650000, geprueft: true });
  r = await admin.post("/api/admin/finanzen/lauf", { art: "contracting", monat: "2026-08", anlageIds: [aid] });
  const cr = r.json.lauf?.erzeugt?.[0];
  pruefe(r.status === 200 && cr && /^CR-/.test(cr.nummer) && cr.netto === rund2(90000 * 0.12 + 150), "Nach Nachtrag: Rechnung 90.000 kWh × 12 ct + 150 € Grundgebühr", cr);
  r = await admin.get(`/api/admin/finanzen/abrechnungen/${cr?.id}`);
  const crd = r.json.abrechnung;
  pruefe(crd?.zaehlerstaende?.[0]?.anfang === 560000 && crd.zaehlerstaende[0].ende === 650000 && crd.aussteller?.name === spv && crd.steuer?.vorlage === "DE-RC-13b", "Rechnung mit Zählerständen; Aussteller = Eigentümergesellschaft; § 13b-Vorlage", { z: crd?.zaehlerstaende, a: crd?.aussteller, s: crd?.steuer });
  r = await admin.get("/api/admin/finanzen/klaerfaelle?status=alle");
  pruefe((r.json.klaerfaelle || []).find((k) => k.id === kf?.id)?.status === "erledigt", "Klärfall durch den Beleg automatisch erledigt", kf?.id);
  r = await kunde.get("/api/portal/finanzen?jahr=2026");
  pruefe(r.status === 200 && r.json.contracting?.belege?.some((b) => b.id === cr?.id) && r.json.contracting.monate?.some((m) => m.monat === "2026-08" && m.kwh === 90000), "Contracting-Kunde sieht Rechnung und Verbrauch je Monat", r.json.contracting?.monate);
  r = await eigen.get(`/api/portal/finanzen/${cr?.id}`);
  pruefe(r.status === 403, "Eigentümerin sieht die Contracting-Rechnung nicht → 403", r.status);
  r = await kunde.anfrage("GET", `/api/portal/finanzen/${cr?.id}/pdf`, undefined, { roh: true });
  const cpdf = Buffer.from(await r.arrayBuffer());
  pruefe(r.status === 200 && cpdf.includes(Buffer.from("Zählerstände", "latin1")), "Contracting-PDF enthält die Zählerstände", r.status);

  // ------------------------------------------------------------ 5. KYC-Sperre und SEPA
  abschnitt("5. Keine Auszahlung ohne KYC, SEPA-Datei nach Verifizierung");
  const pachtIds = eigeneBelege.map((b) => b.id);
  r = await admin.get("/api/admin/finanzen/zahlungen?bis=2099-12-31");
  const ze = (r.json.eintraege || []).find((e) => e.kontoId === eigen.nutzer.id);
  pruefe(r.status === 200 && ze && ze.ok === false && ze.gruende.length > 0, "Zahlungsvorschlag: Eigentümerin gesperrt (Verifizierung fehlt)", ze?.gruende);
  r = await admin.post("/api/admin/finanzen/zahlungen/sepa", { ids: pachtIds });
  pruefe(r.status === 409 && r.json.code === "kyc", "SEPA-Export ohne KYC → 409 (kyc)", r.json);
  r = await admin.get("/api/admin/finanzen/klaerfaelle");
  const kycKf = (r.json.klaerfaelle || []).find((k) => k.status === "offen" && k.schluessel === `KYC:${eigen.nutzer.id}:${pt.id}`);
  pruefe(!!kycKf && /KYC unvollständig/.test(kycKf.gruende[0]), "Gesperrte Auszahlung als Klärfall „KYC unvollständig“ sichtbar", kycKf);
  r = await admin.post(`/api/admin/finanzen/abrechnungen/${pachtIds[0]}`, { aktion: "bezahlt" });
  pruefe(r.status === 409 && r.json.code === "kyc", "Gutschrift manuell „ausgezahlt“ ohne KYC → 409", r.json);
  r = await eigen.get(`/api/portal/finanzen/${pachtIds[0]}`);
  pruefe(r.json.abrechnung?.status === "offen", "Gutschrift bleibt offen", r.json.abrechnung?.status);
  r = await lesen.post("/api/admin/finanzen/zahlungen/sepa", { ids: pachtIds });
  pruefe(r.status === 403, "Unterrolle „Nur lesen“ → SEPA-Export 403", r.status);

  const iban = "DE89370400440532013000";
  let verifiziert = { ok: false, grund: "Compliance-Konto fehlt" };
  if (hatCompliance) verifiziert = await kycVerifizieren(eigen, comp, { vorname: "Frieda", nachname: `Finanz${LAUF}`, iban });
  if (pruefe(verifiziert.ok, "Eigentümerin durch Compliance verifiziert (KYC inkl. Bankverbindung)", verifiziert.grund)) {
    r = await admin.get("/api/admin/finanzen/zahlungen?bis=2099-12-31");
    const ze2 = (r.json.eintraege || []).filter((e) => e.kontoId === eigen.nutzer.id);
    pruefe(ze2.length >= 1 && ze2.every((e) => e.ok) && (!q1?.id || ze2.length === 2), "Zahlungsvorschlag: Auszahlung frei (je zahlender Gesellschaft eine Gruppe)", ze2.map((e) => [e.gesellschaft, e.ok]));
    if (q1?.id) {
      r = await admin.post("/api/admin/finanzen/zahlungen/sepa", { ids: [...pachtIds, q1.id] });
      pruefe(r.status === 422, "Gutschriften verschiedener Gesellschaften (ÖkoInvest, SPV) in einer Datei → 422", r.json);
    }
    r = await admin.post("/api/admin/finanzen/zahlungen/sepa", { ids: [...pachtIds, erzeugt[0]?.id].filter(Boolean), ausfuehrungAm: "2020-01-01" });
    pruefe(r.status === 422, "Ausführungsdatum in der Vergangenheit → 422", r.status);
    r = await buchhaltung.anfrage("POST", "/api/admin/finanzen/zahlungen/sepa", { ids: pachtIds }, { roh: true });
    const xml = await r.text();
    const zlId = r.headers.get("x-zahlungslauf");
    const fehlerXml = pain001Pruefen(xml);
    pruefe(r.status === 200 && /application\/xml/.test(r.headers.get("content-type") || "") && /attachment; filename="SEPA-ZL-/.test(r.headers.get("content-disposition") || ""), "Buchhaltung erzeugt SEPA-Datei (Download, application/xml)", r.status);
    pruefe(fehlerXml.length === 0, "pain.001.001.09: gültige Struktur (Namespace, Pflichtelemente, NbOfTxs, CtrlSum, IBAN, Kennungen)", fehlerXml);
    const summe = rund2(eigeneBelege.reduce((s, b) => s + b.brutto, 0)).toFixed(2);
    pruefe(xml.includes(`<NbOfTxs>${pachtIds.length}</NbOfTxs>`) && xml.includes(`<CtrlSum>${summe}</CtrlSum>`) && xml.includes(`<IBAN>${iban}</IBAN>`) && [...xml.matchAll(/<IBAN>([^<]+)<\/IBAN>/g)].every((m) => ibanPruefen(m[1])), `3 Zahlungen, Kontrollsumme ${summe} €, Empfänger-IBAN aus der Verifizierung`, xml.slice(0, 300));
    r = await admin.post("/api/admin/finanzen/zahlungen/sepa", { ids: pachtIds });
    pruefe(r.status === 409, "Bereits angewiesene Gutschriften nicht doppelt → 409", r.status);
    r = await admin.get("/api/admin/finanzen/klaerfaelle?status=alle");
    pruefe((r.json.klaerfaelle || []).find((k) => k.id === kycKf?.id)?.status === "erledigt", "Klärfall „KYC unvollständig“ nach der Auszahlung erledigt", kycKf?.id);
    r = await buchhaltung.post(`/api/admin/finanzen/zahlungen/${zlId}`, { aktion: "bestaetigen" });
    pruefe(r.status === 200 && r.json.zahlungslauf?.status === "ausgefuehrt", "Zahlungslauf bestätigt (Bank hat ausgeführt)", r.json);
    r = await eigen.get("/api/portal/finanzen?jahr=2026");
    pruefe((r.json.pacht?.belege || []).filter((b) => pachtIds.includes(b.id)).every((b) => b.zahlungsstatus === "bezahlt"), "Eigentümerin sieht die Gutschriften als bezahlt", r.json.pacht?.belege?.map((b) => b.zahlungsstatus));
    r = await eigen.get("/api/portal/benachrichtigungen?limit=20");
    pruefe((r.json.eintraege || []).some((b) => b.art === "abrechnung" && /Auszahlung/.test(b.titel)), "Benachrichtigung „Auszahlung ausgeführt“ an die Eigentümerin", r.json.eintraege?.map((b) => b.titel));
  }

  // ------------------------------------------------------------ 6. Provision → Rechnung → bezahlt
  abschnitt("6. Provision (Verkauf) → Rechnung → bezahlt");
  r = await anbieter.post("/api/portal/projekte", { titel: `Finanztest-Projekt 5 MWp ${LAUF}` });
  const pid = r.json.projekt?.id;
  await anbieter.patch(`/api/portal/projekte/${pid}`, { titel: `Finanztest-Projekt 5 MWp ${LAUF}`, typ: "freiflaeche", land: "DE", bundesland: "Bayern", region: "Schwaben (Test)", mwp: 5, phase: "rtb", netzanschluss: "zusage", codGeplant: "2027-10", preisModus: "gesamt", preis: 1000000, beschreibung: "Testprojekt aus dem automatischen Finanz-Test. Baureif, Netzzusage vorhanden. Keine echten Angaben, keine echten Personen." });
  await anbieter.post(`/api/portal/projekte/${pid}/provision`, { akzeptiert: true });
  await anbieter.post("/api/portal/status", { art: "projekt", id: pid, nach: "pruefung" });
  r = await admin.post("/api/admin/status", { art: "projekt", id: pid, nach: "veroeffentlicht", extra: { provisionSatz: 2 } });
  pruefe(r.status === 200, "Projekt veröffentlicht (Provision 2 %)", r.json);
  r = await investor.post(`/api/portal/boerse/${pid}/nda`, { akzeptiert: true });
  const iid = r.json.interesse?.id;
  await admin.post("/api/admin/status", { art: "interesse", id: iid, nach: "nda_freigegeben" });
  r = await admin.post("/api/admin/status", { art: "projekt", id: pid, nach: "verkauft", extra: { interesseId: iid, kaufpreis: 1000000 } });
  pruefe(r.status === 200 && r.json.objekt?.status === "verkauft", "Verkauf abgeschlossen → Provision 20.000 €", r.json);
  r = await anbieter.get("/api/portal/finanzen");
  const pr = (r.json.provision?.belege || [])[0];
  pruefe(r.status === 200 && pr && /^PR-/.test(pr.nummer) && pr.netto === 20000, "Provisionsrechnung sofort beim Anbieter sichtbar (Sales Invoice, 20.000 € netto)", pr);
  r = await admin.get("/api/admin/provisionen");
  let pv = (r.json.provisionen || []).find((p) => p.projektId === pid);
  pruefe(pv?.status === "in_rechnung", "Provision steht auf „In Rechnung“", pv?.status);
  r = await investor.get(`/api/portal/finanzen/${pr?.id}`);
  pruefe(r.status === 403, "Investor sieht die Provisionsrechnung nicht → 403", r.status);
  r = await admin.get(`/api/admin/finanzen/abrechnungen/${pr?.id}`);
  pruefe(r.json.abrechnung?.zahlungsstatus === "offen" && r.json.abrechnung?.steuer?.text, "Zahlungsstatus offen, Steuerhinweis auf dem Beleg", r.json.abrechnung?.steuer);
  r = await buchhaltung.post(`/api/admin/finanzen/abrechnungen/${pr?.id}`, { aktion: "bezahlt" });
  pruefe(r.status === 200 && r.json.abrechnung?.zahlungsstatus === "bezahlt", "Buchhaltung verbucht den Zahlungseingang", r.json);
  r = await admin.get("/api/admin/provisionen");
  pv = (r.json.provisionen || []).find((p) => p.projektId === pid);
  pruefe(pv?.status === "bezahlt", "Zahlungsstatus zurück in die Provision: „Bezahlt“", pv?.status);
  r = await buchhaltung.post(`/api/admin/finanzen/abrechnungen/${pr?.id}`, { aktion: "bezahlt" });
  pruefe(r.status === 409, "Doppelt verbuchen → 409", r.status);

  // ------------------------------------------------------------ 7. Weitere Backoffice-Funktionen
  abschnitt("7. Index, Anlagenbuchhaltung, Projektcontrolling, CSV");
  r = await lesen.put("/api/admin/finanzen/vpi", { reihe: "VPI-AT-2020", jahr: 2026, wert: 130 });
  pruefe(r.status === 403, "VPI pflegen nur mit Schreibrecht → 403", r.status);
  r = await admin.get("/api/admin/finanzen/anlagen");
  const fa = (r.json.anlagen || []).find((a) => a.anlageId === aid);
  pruefe(r.status === 200 && fa?.gesellschaft === spv, "Anlagenbuchhaltung: Anlage der Eigentümergesellschaft zugeordnet", fa?.gesellschaft);
  r = await admin.put(`/api/admin/finanzen/anlagen/${aid}`, { anschaffungswert: 640000, nutzungsdauerJahre: 20, inbetriebnahme: "2025-06-01", regel: "DE" });
  pruefe(r.status === 200 && r.json.asset?.anschaffungswert === 640000, "Anlage aktiviert (AfA 20 Jahre)", r.json);
  r = await admin.get("/api/admin/finanzen/anlagen");
  const fa2 = (r.json.anlagen || []).find((a) => a.anlageId === aid);
  pruefe(fa2?.plan?.[0]?.afa === rund2((640000 / 20) * (7 / 12)) && fa2.afaJahr === 32000, "AfA-Plan: 2025 monatsgenau (7/12), 2026 volle Jahres-AfA 32.000 €", fa2?.plan?.slice(0, 2));
  r = await admin.get("/api/admin/finanzen/entwicklung");
  const kt = (r.json.projekte || [])[0];
  pruefe(r.status === 200 && kt && Number.isFinite(kt.ist), "Projektcontrolling: Ist-Kosten je Entwicklungsprojekt", kt);
  r = await admin.get(`/api/admin/finanzen/entwicklung/${kt?.projektId}`);
  pruefe(r.status === 200 && Array.isArray(r.json.ist?.positionen) && (kt.mwp ? r.json.ist.jeMwp > 0 : true), "Ist-API für das Entwicklungsmodul (Budget vs. Ist, je MWp)", r.json.ist?.jeMwp);
  r = await admin.anfrage("GET", "/api/admin/finanzen/abrechnungen?format=csv&art=pacht", undefined, { roh: true });
  const csvRoh = Buffer.from(await r.arrayBuffer());
  pruefe(r.status === 200 && csvRoh[0] === 0xef && csvRoh[1] === 0xbb && csvRoh[2] === 0xbf && csvRoh.toString("utf8").includes("Nummer;Art;"), "CSV-Export der Belege (BOM, Semikolon)", csvRoh.subarray(0, 40).toString());

  // ------------------------------------------------------------ 8. Seiten
  abschnitt("8. Seiten");
  for (const [cl, pfad, soll] of [[eigen, "/portal/abrechnungen", 200], [kunde, "/portal/abrechnungen", 200], [anbieter, "/portal/abrechnungen", 200], [admin, "/portal/admin/finanzen", 200], [admin, "/portal/admin/finanzen?tab=zahlungen", 200], [eigen, "/portal/admin/finanzen", 404], [akquise, "/portal/admin/finanzen", 404]]) {
    r = await cl.get(pfad);
    pruefe(soll === 404 ? nichtGefunden(r) : r.status === 200 && !nichtGefunden(r) && !r.text.includes("Application error"), `${pfad} (${cl.name}) → ${soll}`, r.status);
  }

  console.log(`\n${ok} ok, ${fehler} Fehler`);
  if (hatCompliance) await comp.put("/api/admin/compliance/einstellungen", { pilotKonto: { id: eigen.nutzer.id, an: false } }).catch(() => {});
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e?.stack || e}`));
  process.exit(2);
});
