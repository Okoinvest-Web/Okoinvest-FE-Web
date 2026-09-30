// scripts/plattform-test-kyc.mjs
//
// End-to-End-Test „KYC/KYB – Identitäts- und Firmenprüfung“ gegen den laufenden Dev-Server (Demo-Backend).
//   node scripts/plattform-test-kyc.mjs [basis-url]
//
// Prüft: Upload-Typen (Magic Bytes, 415/413, CSRF), verschlüsselte Ablage (Datei auf der Platte nicht im Klartext),
// fremder Zugriff 403 (Nutzer, andere Backoffice-Rollen), Compliance-Workflow (Prüfliste, Nachforderung, Verifizierung,
// Vier-Augen bei hohem Risiko), Sanktionstreffer → manuelle Prüfung (dem Nutzer nicht sichtbar), IBAN-Prüfziffer,
// Gating bei Veröffentlichung, Datenraum (NDA-Freigabe), LOI, Auszahlung (IBAN + Eigentumsnachweis), Zugriffsprotokoll
// in der Hash-Kette, Löschfrist, Seiten.
// Eigene Konten mit Präfix kyc-test-<Lauf>@example.com; Freigabe-Sperren nur für diese Konten (Pilot), am Ende entfernt.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const BASIS = (process.argv[2] || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const PASSWORT = "Kyc-Test-Passwort-2026";
const LAUF = Date.now().toString(36);
const KYC_ORDNER = path.join(process.cwd(), ".data", "kyc");

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
    const { __wiederholt, ...kopfRein } = kopf;
    const headers = { ...kopfRein };
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
        if (html && versuch < 4 && !(body instanceof FormData)) {
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
    // Geteilte Demo-Konten (admin@…) können durch parallele Testläufe abgemeldet werden (max. Sitzungen) → einmal neu anmelden
    if (res.status === 401 && this.zugang && !pfad.startsWith("/api/auth/") && !kopf.__wiederholt) {
      await this.login(...this.zugang);
      return this.anfrage(methode, pfad, body, { origin, kopf: { ...kopf, __wiederholt: "1" }, roh });
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
  patch = (p, b, o) => this.anfrage("PATCH", p, b ?? {}, o);
  put = (p, b, o) => this.anfrage("PUT", p, b ?? {}, o);
  del = (p, o) => this.anfrage("DELETE", p, undefined, o);

  async login(email, passwort = DEMO_PASSWORT) {
    const r = await this.post("/api/auth/login", { email, passwort });
    if (r.status !== 200) throw new Error(`Login ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    this.zugang = [email, passwort];
    return r.json.nutzer;
  }

  async registrieren(schluessel, rollen, vorname, nachname, firma = "") {
    const email = `kyc-test-${LAUF}-${schluessel}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email, passwort: PASSWORT, vorname, nachname, firma, rollen, agb: true });
    if (r.status !== 201) throw new Error(`Registrierung ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    this.email = email;
    this.zugang = [email, PASSWORT];
    return r.json.nutzer;
  }
}

function pdfBytes(text) {
  const inhalt = `BT /F1 12 Tf 50 750 Td (${text}) Tj ET`;
  const obj = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>", `<< /Length ${inhalt.length} >>\nstream\n${inhalt}\nendstream`];
  let s = "%PDF-1.4\n";
  obj.forEach((o, i) => (s += `${i + 1} 0 obj\n${o}\nendobj\n`));
  return Buffer.from(`${s}trailer\n<< /Root 1 0 R >>\n%%EOF\n`, "latin1");
}
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f8cfc0f01f0005000201a5b1e0c50000000049454e44ae426082", "hex");
const JPG = Buffer.from("ffd8ffe000104a46494600010100000100010000ffd9", "hex");

async function hochladen(client, datei, name, felder = {}, { kopf = { "X-Plattform-Upload": "1" }, origin } = {}) {
  const fd = new FormData();
  fd.append("datei", new Blob([datei]), name);
  for (const [k, w] of Object.entries(felder)) fd.append(k, w);
  return client.anfrage("POST", "/api/portal/kyc/dokumente", fd, { kopf, ...(origin !== undefined ? { origin } : {}) });
}

const inTagen = (t) => new Date(Date.now() + t * 86400e3).toISOString().slice(0, 10);
const person = (vorname, nachname, geb = "1980-02-03", land = "DE") => ({
  vorname, nachname, geburtsdatum: geb, geburtsort: "Teststadt", staatsangehoerigkeit: land,
  adresse: { strasse: "Testweg 1", plz: "86842", ort: "Teststadt", land },
  ausweis: { art: "personalausweis", nummer: "T22000129", behoerde: "Stadt Teststadt", gueltigBis: inTagen(1500) },
});

async function kycPrivat(client, { vorname, nachname, geb, investor = false, pep = false }) {
  let r = await client.patch("/api/portal/kyc", { abschnitt: "kontotyp", daten: { kontotyp: "privat" } });
  if (r.status !== 200) throw new Error(`kontotyp: ${r.status} ${JSON.stringify(r.json)}`);
  await client.patch("/api/portal/kyc", { abschnitt: "person", daten: person(vorname, nachname, geb) });
  await hochladen(client, pdfBytes(`Ausweis vorne ${vorname}`), "vorne.pdf", { art: "ausweis_vorne" });
  await hochladen(client, pdfBytes(`Ausweis hinten ${vorname}`), "hinten.pdf", { art: "ausweis_hinten" });
  await client.patch("/api/portal/kyc", { abschnitt: "pep", daten: pep ? { istPep: true, naheStehend: false, funktion: "Mitglied eines Landtags (Test)" } : { istPep: false, naheStehend: false } });
  if (investor) await client.patch("/api/portal/kyc", { abschnitt: "mittelherkunft", daten: { ticket: "bis250k", quellen: ["eigenkapital"], text: "Test" } });
  return (await client.get("/api/portal/kyc")).json;
}

async function verifizieren(compliance, fallId, { zweit = null } = {}) {
  let r = await compliance.get(`/api/admin/compliance/${fallId}`);
  const f = r.json.fall;
  for (const d of f.dokumente.filter((x) => x.status !== "ok")) {
    const punkte = Object.fromEntries(d.pruefpunkte.map((p) => [p, true]));
    await compliance.post(`/api/admin/compliance/${fallId}`, { aktion: "pruefliste", dokumentId: d.id, punkte, ergebnis: "ok" });
  }
  r = await compliance.post(`/api/admin/compliance/${fallId}`, { aktion: "entscheiden", ergebnis: "verifiziert", grund: "Test" });
  if (zweit && r.json.status === "zweitpruefung") r = await zweit.post(`/api/admin/compliance/${fallId}`, { aktion: "zweitfreigabe", ergebnis: "verifiziert", grund: "Test Zweitfreigabe" });
  return r;
}

function kycDateien() {
  try {
    return readdirSync(KYC_ORDNER).map((n) => ({ name: n, pfad: path.join(KYC_ORDNER, n), mtime: statSync(path.join(KYC_ORDNER, n)).mtimeMs }));
  } catch {
    return [];
  }
}

async function main() {
  console.log(`KYC/KYB-Test gegen ${BASIS} (Lauf ${LAUF})`);
  const gast = new Client("gast");
  const admin = new Client("admin");
  const comp = new Client("compliance");
  const comp2 = new Client("compliance 2");
  const akquise = new Client("bo-akquise");
  const inv = new Client("investor");
  const anb = new Client("anbieter");
  const fl = new Client("flaeche");
  const fremd = new Client("fremd");
  const pep = new Client("pep");
  const sank = new Client("sanktion");
  let r;
  const start = Date.now();

  abschnitt("1. Vorbereitung: Konten, Pilot-Geltung der Freigabe-Sperren");
  await admin.login("admin@example.com");
  await comp.login("bo-compliance@example.com");
  await comp2.login("bo-compliance2@example.com");
  let akquiseOk = true;
  try {
    await akquise.login("bo-akquise@example.com");
  } catch {
    akquiseOk = false;
  }
  await inv.registrieren("investor", ["investor"], "Ines", `Investor${LAUF}`);
  await anb.registrieren("anbieter", ["anbieter"], "Arne", `Anbieter${LAUF}`);
  await fl.registrieren("flaeche", ["flaeche"], "Frida", `Flaeche${LAUF}`);
  await fremd.registrieren("fremd", ["flaeche"], "Fritz", `Fremd${LAUF}`);
  await pep.registrieren("pep", ["investor"], "Paula", `Pep${LAUF}`);
  await sank.registrieren("sanktion", ["investor"], "Viktor", "Fiktivow");
  pruefe(true, "Testkonten registriert");
  const pilot = [inv, anb, fl];
  for (const c of pilot) {
    r = await comp.put("/api/admin/compliance/einstellungen", { pilotKonto: { id: c.nutzer.id, an: true } });
    if (r.status !== 200) break;
  }
  pruefe(r.status === 200, "Compliance nimmt Testkonten in den Pilotbetrieb der Freigabe-Sperren auf", r.json);
  r = await admin.put("/api/admin/compliance/einstellungen", { pilotKonto: { id: inv.nutzer.id, an: false } });
  pruefe(r.status === 403, "Leitung (ohne Unterrolle Compliance) darf Einstellungen nicht ändern", r.status);

  try {
    abschnitt("2. Rechte: nur Person selbst und Compliance");
    r = await gast.get("/api/portal/kyc");
    pruefe(r.status === 401, "ohne Anmeldung 401", r.status);
    r = await inv.get("/api/admin/compliance");
    pruefe(r.status === 403, "Investor: Compliance-API 403", r.status);
    if (akquiseOk) {
      r = await akquise.get("/api/admin/compliance");
      pruefe(r.status === 403, "Backoffice-Unterrolle Akquise: Warteschlange 403", r.status);
    }
    r = await admin.get("/api/admin/compliance");
    pruefe(r.status === 200 && Array.isArray(r.json.faelle) && r.json.schreiben === false, "Leitung sieht Warteschlange (nur lesen)", r.json.schreiben);
    r = await comp.get("/api/admin/compliance");
    pruefe(r.status === 200 && r.json.schreiben === true && r.json.kennzahlen, "Compliance sieht Warteschlange mit Kennzahlen", r.status);

    abschnitt("3. Uploads: Typen, Größe, CSRF, Verschlüsselung");
    r = await hochladen(inv, pdfBytes("x"), "a.pdf", { art: "ausweis_vorne" });
    pruefe(r.status === 422, "Upload vor Kontotyp → 422", r.status);
    r = await inv.patch("/api/portal/kyc", { abschnitt: "kontotyp", daten: { kontotyp: "privat" } });
    pruefe(r.status === 200 && r.json.fall?.status === "offen", "Kontotyp gewählt, Fall angelegt", r.json);
    const fallInv = r.json.fall.id;
    r = await hochladen(inv, Buffer.from("Das ist nur Text, kein PDF"), "ausweis.pdf", { art: "ausweis_vorne" });
    pruefe(r.status === 415, "Textdatei mit .pdf-Endung → 415 (Magic Bytes)", r.status);
    r = await hochladen(inv, Buffer.from("MZ\x90\x00\x03\x00\x00\x00", "latin1"), "ausweis.png", { art: "ausweis_vorne" });
    pruefe(r.status === 415, "EXE mit .png-Endung → 415", r.status);
    r = await hochladen(inv, Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(10 * 1024 * 1024 + 10, 32)]), "gross.pdf", { art: "ausweis_vorne" });
    pruefe(r.status === 413, "> 10 MB → 413", r.status);
    r = await hochladen(inv, pdfBytes("x"), "a.pdf", { art: "ausweis_vorne" }, { kopf: {} });
    pruefe(r.status === 403, "ohne X-Plattform-Upload → 403", r.status);
    r = await hochladen(inv, pdfBytes("x"), "a.pdf", { art: "ausweis_vorne" }, { origin: "https://boese.example.org" });
    pruefe(r.status === 403, "fremde Herkunft → 403", r.status);
    r = await hochladen(inv, pdfBytes("x"), "a.pdf", { art: "unbekannt" });
    pruefe(r.status === 422, "unbekannte Dokumentart → 422", r.status);
    const geheim = `KLARTEXT-MARKER-${LAUF}`;
    const vorher = new Set(kycDateien().map((d) => d.name));
    r = await hochladen(inv, pdfBytes(geheim), "ausweis-vorne.pdf", { art: "ausweis_vorne" });
    pruefe(r.status === 200 && r.json.dokument?.id, "PDF hochgeladen", r.json);
    const dokVorne = r.json.dokument?.id;
    r = await hochladen(inv, PNG, "ausweis-hinten.png", { art: "ausweis_hinten" });
    pruefe(r.status === 200 && r.json.dokument?.mime === "image/png", "PNG hochgeladen (Typ aus den Bytes)", r.json);
    r = await hochladen(inv, JPG, "selfie.jpg", { art: "selfie" });
    pruefe(r.status === 200 && r.json.dokument?.mime === "image/jpeg", "JPG hochgeladen", r.json);
    const neu = kycDateien().filter((d) => !vorher.has(d.name) && d.mtime >= start - 5000);
    const inhalte = neu.map((d) => readFileSync(d.pfad));
    pruefe(neu.length >= 3, "verschlüsselte Dateien unter .data/kyc angelegt", neu.length);
    pruefe(inhalte.length > 0 && inhalte.every((b) => b.subarray(0, 6).toString("latin1") === "OIKYC1"), "Dateikopf OIKYC1 (AES-256-GCM-Format)");
    pruefe(inhalte.length > 0 && inhalte.every((b) => !b.includes(Buffer.from(geheim)) && !b.includes(Buffer.from("%PDF")) && !b.includes(Buffer.from("IHDR"))), "Datei auf der Platte NICHT im Klartext lesbar (kein Marker, kein %PDF, kein PNG-Kopf)");
    r = await inv.get(`/api/portal/kyc/dokumente/${dokVorne}`, { roh: false });
    pruefe(r.status === 200 && r.text.includes(geheim) && r.headers.get("x-content-type-options") === "nosniff" && /no-store/.test(r.headers.get("cache-control") || ""), "Person selbst sieht eigene Unterlage (entschlüsselt, nosniff, no-store)", r.status);

    abschnitt("4. Fremder Zugriff");
    r = await fremd.get(`/api/portal/kyc/dokumente/${dokVorne}`);
    pruefe(r.status === 403 && !r.text.includes(geheim), "fremdes Konto → 403 ohne Inhalt", r.status);
    r = await gast.get(`/api/portal/kyc/dokumente/${dokVorne}`);
    pruefe(r.status === 401, "ohne Anmeldung → 401", r.status);
    r = await admin.get(`/api/admin/compliance/dokumente/${dokVorne}`);
    pruefe(r.status === 403 && !r.text.includes(geheim), "Leitung ohne Unterrolle Compliance → 403", r.status);
    if (akquiseOk) {
      r = await akquise.get(`/api/admin/compliance/dokumente/${dokVorne}`);
      pruefe(r.status === 403, "Akquise → 403", r.status);
    }
    r = await admin.get(`/api/admin/compliance/${fallInv}`);
    pruefe(r.status === 403, "Leitung: Falldetail mit Personendaten 403", r.status);
    r = await comp.get(`/api/admin/compliance/dokumente/${dokVorne}`);
    pruefe(r.status === 200 && r.text.includes(geheim), "Compliance öffnet Unterlage", r.status);
    r = await fremd.del(`/api/portal/kyc/dokumente/${dokVorne}`);
    pruefe(r.status === 404, "fremdes Löschen → 404", r.status);

    abschnitt("5. IBAN-Prüfziffer, Pflichtangaben, Einreichen");
    r = await fl.patch("/api/portal/kyc", { abschnitt: "kontotyp", daten: { kontotyp: "privat" } });
    const fallFl = r.json.fall?.id;
    r = await fl.patch("/api/portal/kyc", { abschnitt: "bank", daten: { iban: "DE89370400440532013001", kontoinhaber: `Frida Flaeche${LAUF}` } });
    pruefe(r.status === 422 && /Prüfziffer/.test(r.json.error || ""), "IBAN mit falscher Prüfziffer → 422", r.json);
    r = await fl.patch("/api/portal/kyc", { abschnitt: "bank", daten: { iban: "AT61190430023457320", kontoinhaber: "x" } });
    pruefe(r.status === 422, "IBAN mit falscher Länge (AT) → 422", r.status);
    r = await fl.patch("/api/portal/kyc", { abschnitt: "bank", daten: { iban: "de89 3704 0044 0532 0130 00", kontoinhaber: `Frida Flaeche${LAUF}` } });
    pruefe(r.status === 200 && r.json.fall?.bank?.iban === "DE89 3704 0044 0532 0130 00", "gültige IBAN gespeichert (normalisiert)", r.json.fall?.bank);
    r = await inv.post("/api/portal/kyc/einreichen", {});
    pruefe(r.status === 422 && /fehlen/.test(r.json.error || ""), "Einreichen mit fehlenden Pflichtangaben → 422", r.json);
    await inv.patch("/api/portal/kyc", { abschnitt: "person", daten: person("Ines", `Investor${LAUF}`) });
    await inv.patch("/api/portal/kyc", { abschnitt: "pep", daten: { istPep: false, naheStehend: false } });
    await inv.patch("/api/portal/kyc", { abschnitt: "mittelherkunft", daten: { ticket: "bis250k", quellen: ["eigenkapital"] } });
    r = await inv.get("/api/portal/kyc");
    pruefe(r.json.fortschritt?.quote === 100, "Fortschritt 100 % nach allen Pflichtpunkten", r.json.fortschritt);
    r = await inv.post("/api/portal/kyc/einreichen", {});
    pruefe(r.status === 200 && r.json.fall?.status === "eingereicht", "Investor reicht ein", r.json);
    r = await inv.patch("/api/portal/kyc", { abschnitt: "person", daten: person("Ines", "Anders") });
    pruefe(r.status === 409, "während der Prüfung keine Änderungen (409)", r.status);

    abschnitt("6. Gating: Veröffentlichung (KYB Anbieter), Datenraum/NDA, LOI");
    r = await anb.post("/api/portal/projekte", { titel: `KYC-Testprojekt 6 MWp ${LAUF}` });
    const pid = r.json.projekt?.id;
    await anb.patch(`/api/portal/projekte/${pid}`, {
      titel: `KYC-Testprojekt 6 MWp ${LAUF}`, typ: "freiflaeche", land: "DE", bundesland: "Bayern", region: "Schwaben (Test)", mwp: 6, phase: "rtb", netzanschluss: "zusage",
      codGeplant: "2027-10", preisModus: "proKwp", preisProKwp: 80, beschreibung: "Testprojekt aus dem automatischen KYC-Test. Baureif, Netzzusage vorhanden. Keine echten Angaben, nur Prüfzwecke.",
    });
    r = await anb.post(`/api/portal/projekte/${pid}/provision`, { akzeptiert: true });
    pruefe(r.status === 200, "Vorbereitung: Provisionsvereinbarung akzeptiert", r.json);
    r = await anb.post("/api/portal/status", { art: "projekt", id: pid, nach: "pruefung" });
    pruefe(r.status === 200, "Vorbereitung: Projekt eingereicht", r.json);
    r = await admin.post("/api/admin/status", { art: "projekt", id: pid, nach: "veroeffentlicht", extra: { provisionSatz: 2 } });
    pruefe(r.status === 409 && r.json.code === "kyc", "Veröffentlichung ohne verifizierten Anbieter → 409 (kyc)", r.json);
    const kycAnb = await kycPrivat(anb, { vorname: "Arne", nachname: `Anbieter${LAUF}` });
    await anb.post("/api/portal/kyc/einreichen", {});
    r = await verifizieren(comp, kycAnb.fall.id);
    pruefe(r.status === 200 && r.json.status === "verifiziert", "Compliance verifiziert den Anbieter", r.json);
    r = await admin.post("/api/admin/status", { art: "projekt", id: pid, nach: "veroeffentlicht", extra: { provisionSatz: 2 } });
    pruefe(r.status === 200 && r.json.objekt?.status === "veroeffentlicht", "nach Verifizierung: Veröffentlichung möglich", r.json);

    r = await inv.post(`/api/portal/boerse/${pid}/nda`, { akzeptiert: true });
    const iid = r.json.interesse?.id;
    pruefe(r.status === 200 && iid, "Investor fragt NDA an", r.json);
    r = await inv.get(`/api/portal/kyc/freigabe?schritt=nda`);
    pruefe(r.status === 200 && r.json.freigabe?.aktiv === true && r.json.freigabe?.ok === false && /Datenraum/.test(r.json.freigabe?.hinweis || ""), "Portal-Hinweis: „Um den Datenraum zu öffnen, bitte Verifizierung abschließen“", r.json.freigabe);
    r = await admin.post("/api/admin/status", { art: "interesse", id: iid, nach: "nda_freigegeben" });
    pruefe(r.status === 409 && r.json.code === "kyc", "Datenraum-Freigabe (NDA) ohne Verifizierung → 409 (kyc)", r.json);
    r = await inv.get(`/api/boerse/${pid}`);
    pruefe(r.status === 200 && r.json.zugriff === "oeffentlich" && !(r.json.dokumente || []).length, "Datenraum bleibt geschlossen (nur öffentlicher Teaser)", r.json.zugriff);
    r = await comp.get(`/api/admin/compliance/${fallInv}`);
    // Prüfliste: eine Unterlage ablehnen → Nachforderung
    const docsInv = r.json.fall.dokumente;
    r = await comp.post(`/api/admin/compliance/${fallInv}`, { aktion: "entscheiden", ergebnis: "verifiziert" });
    pruefe(r.status === 409 && /Prüfliste/.test(r.json.error || ""), "Verifizieren mit ungeprüften Unterlagen → 409", r.json);
    const hinten = docsInv.find((d) => d.art === "ausweis_hinten");
    r = await comp.post(`/api/admin/compliance/${fallInv}`, { aktion: "pruefliste", dokumentId: hinten.id, punkte: { lesbar: true }, ergebnis: "ok" });
    pruefe(r.status === 422, "„geprüft“ nur mit allen Prüfpunkten (422)", r.status);
    r = await comp.post(`/api/admin/compliance/${fallInv}`, { aktion: "pruefliste", dokumentId: hinten.id, punkte: {}, ergebnis: "abgelehnt", notiz: "Rückseite unscharf – bitte erneut hochladen." });
    pruefe(r.status === 200, "Unterlage abgelehnt (mit Begründung)", r.json);
    r = await comp.post(`/api/admin/compliance/${fallInv}`, { aktion: "entscheiden", ergebnis: "nachgefordert", grund: "Bitte Rückseite des Ausweises gut lesbar hochladen." });
    pruefe(r.status === 200 && r.json.status === "nachgefordert", "Compliance fordert nach", r.json);
    r = await inv.get("/api/portal/kyc");
    pruefe(r.json.fall?.status === "nachgefordert" && /Rückseite/.test(r.json.fall?.nachforderung || "") && r.json.fall.dokumente.some((d) => d.status === "abgelehnt" && /unscharf/.test(d.grund)), "Nutzer sieht Nachforderung und Grund", r.json.fall?.status);
    r = await inv.get("/api/portal/benachrichtigungen");
    pruefe((r.json.eintraege || r.json.benachrichtigungen || []).some((b) => /Unterlagen ergänzen/.test(b.titel)), "Benachrichtigung „Bitte Unterlagen ergänzen“ (ohne Inhalte)", Object.keys(r.json));
    await hochladen(inv, PNG, "hinten-neu.png", { art: "ausweis_hinten" });
    r = await inv.post("/api/portal/kyc/einreichen", {});
    pruefe(r.status === 200 && r.json.fall?.status === "eingereicht", "erneut eingereicht", r.json);
    r = await verifizieren(comp, fallInv);
    pruefe(r.status === 200 && r.json.status === "verifiziert", "Investor verifiziert", r.json);
    r = await admin.post("/api/admin/status", { art: "interesse", id: iid, nach: "nda_freigegeben" });
    pruefe(r.status === 200 && r.json.objekt?.status === "nda_freigegeben", "nach Verifizierung: Datenraum freigegeben", r.json);
    r = await inv.post("/api/portal/kyc/erneut", {});
    pruefe(r.status === 200 && r.json.fall?.status === "offen", "Investor startet erneute Prüfung (z. B. neuer Ausweis)", r.json);
    r = await inv.post("/api/portal/status", { art: "interesse", id: iid, nach: "loi_abgegeben", extra: { loi: { betrag: 500000, text: "Indikatives Angebot aus dem KYC-Test." } } });
    pruefe(r.status === 409 && r.json.code === "kyc" && /Verifizierung/.test(r.json.error || ""), "LOI ohne (aktuelle) Verifizierung → 409 mit Hinweis", r.json);
    await inv.post("/api/portal/kyc/einreichen", {});
    await verifizieren(comp, fallInv);
    r = await inv.post("/api/portal/status", { art: "interesse", id: iid, nach: "loi_abgegeben", extra: { loi: { betrag: 500000, text: "Indikatives Angebot aus dem KYC-Test." } } });
    pruefe(r.status === 200 && r.json.objekt?.status === "loi_abgegeben", "LOI nach erneuter Verifizierung möglich", r.json);

    abschnitt("7. Gating: Pachtauszahlung (Verifizierung + IBAN + Eigentumsnachweis)");
    r = await fl.post("/api/portal/flaechen", { bezeichnung: `kyc-test-${LAUF} Acker`, land: "DE", bundesland: "Bayern", plz: "86825", ort: "Testdorf", ha: 9, nutzung: "acker" });
    const fid = r.json.flaeche?.id;
    r = await fl.post("/api/portal/flaechen", { bezeichnung: `kyc-test-${LAUF} Wiese`, land: "DE", bundesland: "Bayern", plz: "86825", ort: "Testdorf", ha: 3, nutzung: "gruenland" });
    const fid2 = r.json.flaeche?.id;
    pruefe(fid && fid2, "Flächen angelegt", r.json);
    r = await admin.post("/api/admin/compliance/freigabe", { schritt: "auszahlung", kontoId: fl.nutzer.id, flaecheId: fid });
    pruefe(r.status === 200 && r.json.freigabe?.ok === false && r.json.freigabe.aktiv, "Auszahlung vor Verifizierung gesperrt", r.json.freigabe);
    r = await hochladen(fl, pdfBytes("Grundbuch"), "grundbuch.pdf", { art: "eigentumsnachweis", flaecheId: fid });
    pruefe(r.status === 200, "Eigentumsnachweis für eigene Fläche", r.status);
    r = await hochladen(fremd, pdfBytes("Grundbuch fremd"), "grundbuch.pdf", { art: "eigentumsnachweis", flaecheId: fid });
    pruefe(r.status === 422 || r.status === 403, "Eigentumsnachweis für fremde Fläche abgelehnt", r.status);
    await kycPrivat(fl, { vorname: "Frida", nachname: `Flaeche${LAUF}` });
    r = await fl.post("/api/portal/kyc/einreichen", {});
    pruefe(r.status === 200, "Flächeneigentümerin reicht ein", r.json);
    r = await verifizieren(comp, fallFl);
    pruefe(r.status === 200 && r.json.status === "verifiziert", "Eigentümerin verifiziert", r.json);
    r = await admin.post("/api/admin/compliance/freigabe", { schritt: "auszahlung", kontoId: fl.nutzer.id, flaecheId: fid });
    pruefe(r.status === 200 && r.json.freigabe?.ok === true, "Auszahlung für Fläche mit Eigentumsnachweis frei", r.json.freigabe);
    r = await comp.post("/api/admin/compliance/freigabe", { schritt: "auszahlung", kontoId: fl.nutzer.id, flaecheId: fid2 });
    pruefe(r.status === 200 && r.json.freigabe?.ok === false && /Eigentumsnachweis/.test(r.json.freigabe.gruende.join(" ")), "Auszahlung für Fläche ohne Eigentumsnachweis gesperrt", r.json);
    r = await fremd.get(`/api/portal/kyc/freigabe?schritt=auszahlung`);
    pruefe(r.status === 200 && r.json.freigabe?.aktiv === false, "Konto außerhalb des Pilotbetriebs: Sperre im Entwicklungsbetrieb nicht aktiv", r.json);
    r = await fl.post("/api/admin/compliance/freigabe", { schritt: "auszahlung", kontoId: fl.nutzer.id });
    pruefe(r.status === 403 || r.status === 404, "Freigabe-Prüfung für Dritte nur im Backoffice", r.status);

    abschnitt("8. Sanktionsabgleich → manuelle Prüfung, Vier-Augen bei hohem Risiko");
    const sk = await kycPrivat(sank, { vorname: "Viktor", nachname: "Fiktivow", geb: "1961-04-12", investor: true });
    r = await sank.post("/api/portal/kyc/einreichen", {});
    pruefe(r.status === 200 && r.json.fall?.status === "eingereicht" && !JSON.stringify(r.json).includes("treffer"), "Einreichung – Nutzer sieht keinen Hinweis auf Sanktionstreffer", r.json.fall?.status);
    r = await comp.get(`/api/admin/compliance/${sk.fall.id}`);
    const sd = r.json.fall?.sanktionenDetail;
    pruefe(sd?.status === "treffer_pruefen" && sd.treffer.some((t) => t.eintragId === "DEMO-1" && t.geburtsdatum === "gleich"), "Treffer gegen die (fiktive) Liste → manuelle Prüfung", sd);
    pruefe(r.json.fall?.risiko === "hoch", "Risiko hoch bei möglichem Treffer", r.json.fall?.risiko);
    r = await verifizieren(comp, sk.fall.id);
    pruefe(r.status === 409 && /Sanktionstreffer/.test(r.json.error || ""), "Verifizierung bei offenem Treffer gesperrt (409)", r.json);
    r = await comp.post(`/api/admin/compliance/${sk.fall.id}`, { aktion: "treffer", eintragId: "DEMO-1", prueflingName: "Viktor Fiktivow", bewertung: "ausgeschlossen", begruendung: "kurz" });
    pruefe(r.status === 422, "Bewertung ohne ausreichende Begründung → 422", r.status);
    r = await comp.post(`/api/admin/compliance/${sk.fall.id}`, { aktion: "treffer", eintragId: "DEMO-1", prueflingName: "Viktor Fiktivow", bewertung: "ausgeschlossen", begruendung: "Testfall: fiktive Liste, Person anhand weiterer Merkmale ausgeschlossen." });
    pruefe(r.status === 200, "Treffer als Namensgleichheit bewertet (dokumentiert)", r.json);
    r = await verifizieren(comp, sk.fall.id);
    pruefe(r.status === 200 && r.json.status === "zweitpruefung", "ausgeschlossener Sanktionstreffer → Zweitfreigabe (Vier-Augen) erforderlich", r.json);
    r = await comp.post(`/api/admin/compliance/${sk.fall.id}`, { aktion: "zweitfreigabe", ergebnis: "verifiziert" });
    pruefe(r.status === 409 && /Vier-Augen/.test(r.json.error || ""), "gleiche Person darf nicht zweitfreigeben (409)", r.json);
    r = await comp2.post(`/api/admin/compliance/${sk.fall.id}`, { aktion: "zweitfreigabe", ergebnis: "verifiziert", grund: "Zweitprüfung ok" });
    pruefe(r.status === 200 && r.json.status === "verifiziert", "zweite Compliance-Person gibt frei", r.json);
    const kp = await kycPrivat(pep, { vorname: "Paula", nachname: `Pep${LAUF}`, investor: true, pep: true });
    await pep.post("/api/portal/kyc/einreichen", {});
    r = await comp.get(`/api/admin/compliance/${kp.fall.id}`);
    pruefe(r.json.fall?.risiko === "hoch" && r.json.fall?.vierAugen === true, "PEP-Selbstauskunft → Risiko hoch, Vier-Augen", r.json.fall?.risikoRegel);
    r = await comp.post("/api/admin/compliance/sanktionen", { name: "Fiktivow, Viktor", art: "person" });
    pruefe(r.status === 200 && r.json.treffer?.length > 0, "Einzelabgleich findet Namen in anderer Reihenfolge", r.json);
    r = await comp.post("/api/admin/compliance/sanktionen", { name: `Ines Investor${LAUF}`, art: "person" });
    pruefe(r.status === 200 && r.json.treffer?.length === 0, "Einzelabgleich: kein Treffer für unbeteiligten Namen", r.json);

    abschnitt("9. Protokoll (Hash-Kette), Status für andere Teams, Löschfrist");
    r = await comp.get(`/api/admin/compliance/${fallInv}`);
    const z = r.json.fall?.zugriffe || [];
    pruefe(z.some((x) => x.aktion === "kyc_zugriff" && /Compliance/.test(x.text) && /^[0-9a-f]{64}$/.test(x.hash || "")), "Dokumentzugriff der Compliance im Protokoll mit Hash", z.slice(0, 3));
    pruefe(z.some((x) => x.aktion === "kyc_zugriff_verweigert"), "verweigerter Zugriff protokolliert");
    r = await admin.get("/api/admin/protokoll");
    pruefe(r.status === 200 && typeof r.json.kette?.ok === "boolean" && r.json.kette.eintraege.every((e) => /^[0-9a-f]{64}$/.test(e.hash || "")), "Hash-Kette prüfbar, neue Einträge verkettet", r.json.kette?.fehler?.slice?.(0, 2));
    r = await inv.get("/api/portal/kyc");
    pruefe(r.json.status?.verifiziert === true && r.json.status?.risiko === undefined, "kycStatus für das eigene Konto (ohne interne Risikoangabe)", r.json.status);
    r = await comp.post(`/api/admin/compliance/${fallFl}`, { aktion: "beziehungEnde", datum: "2020-06-30" });
    pruefe(r.status === 200, "Ende der Geschäftsbeziehung eingetragen", r.json);
    r = await comp.get(`/api/admin/compliance/${fallFl}`);
    pruefe(r.json.fall?.loeschenAb === "2026-01-01", "Löschung ab 01.01. des 6. Folgejahres (5 Jahre ab Jahresende)", r.json.fall?.loeschenAb);
    const flDoc = (r.json.fall?.dokumente || [])[0]?.id;
    r = await comp.post("/api/admin/compliance/fristen", { fallId: fallFl });
    pruefe(r.status === 200 && r.json.geloescht === 1, "Löschjob löscht Fall nach Ablauf der Frist", r.json);
    r = await comp.get(`/api/admin/compliance/dokumente/${flDoc}`);
    pruefe(r.status === 404, "gelöschte Unterlage nicht mehr abrufbar", r.status);
    r = await fl.get("/api/portal/kyc");
    pruefe(r.status === 200 && !r.json.fall, "Personenbezogene Angaben des Falls entfernt", r.json.fall);

    abschnitt("10. Seiten");
    for (const [c, p, erwartet] of [[inv, "/portal/verifizierung", 200], [comp, "/portal/admin/compliance", 200], [comp, `/portal/admin/compliance/${fallInv}`, 200], [admin, "/portal/admin/compliance", 200]]) {
      r = await c.get(p);
      pruefe(r.status === erwartet && !/Application error|Unhandled Runtime Error/.test(r.text), `${p} (${c.name}) → ${erwartet}`, r.status);
    }
    r = await admin.get(`/portal/admin/compliance/${fallInv}`);
    pruefe(r.status === 404 || /Diesen Eintrag gibt es nicht/.test(r.text) || !r.text.includes(`Investor${LAUF}`), "Leitung: Fallseite ohne Personendaten (404)", r.status);
    r = await inv.get("/portal/admin/compliance");
    pruefe(r.status === 404 || /Diesen Eintrag gibt es nicht/.test(r.text), "Investor: Compliance-Seite 404", r.status);
    r = await inv.get("/portal/verifizierung");
    pruefe(!/passwortHash|KLARTEXT-MARKER/.test(r.text), "Seite enthält keine Geheimnisse/Klartext-Unterlagen");
  } finally {
    for (const c of pilot) if (c.nutzer) await comp.put("/api/admin/compliance/einstellungen", { pilotKonto: { id: c.nutzer.id, an: false } }).catch(() => {});
  }

  console.log(`\n${ok} bestanden, ${fehler} fehlgeschlagen`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.stack || e.message}`));
  process.exit(1);
});
