// scripts/plattform-test-dealroom.mjs
//
// End-to-End-Test „Deal-Room & Investoren“ gegen den laufenden Dev-Server (Demo-Backend).
//   node scripts/plattform-test-dealroom.mjs [basis-url]
//
// Prüft: Zugang nur mit freigegebenem Datenraum · Q&A mit Moderation und Anonymität in beide Richtungen
// (Anbieter sieht Investoren nie namentlich, Investor sieht den Anbieter nie, Kontaktangaben werden
// entfernt) · Antworten „für alle NDA-Investoren“ · Datenraum-Stufen (Stufe 2 erst nach Zulassung zur
// verbindlichen Runde bzw. LOI, auch über die alte Download-Route) · Versionen · Wasserzeichen-Dateiname ·
// Zugriffsprotokoll (pseudonym für den Anbieter, namentlich für das Backoffice) · Bieterverfahren mit
// verdeckten Geboten (Investor sieht fremde nie), Anbieter erst nach Freigabe (anonym), Fristablauf,
// Shortlist, Zuschlag → reserviert → verkauft → Provision · Pipeline mit privaten Notizen und Suchprofilen ·
// Anbieter-Cockpit · Kontaktfreigabe · neue Seiten · CSRF.
// Eigene Konten mit Präfix deal-test-<Lauf>@example.com, eigenes Projekt – Demo-Daten bleiben unberührt.

const BASIS = (process.argv[2] || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);
const PASSWORT = "Deal-Test-Passwort-26";

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
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      headers["Content-Type"] ||= "application/json";
      payload = typeof body === "string" ? body : JSON.stringify(body);
    }
    let res;
    for (let versuch = 1; ; versuch++) {
      try {
        res = await fetch(BASIS + pfad, { method: methode, headers, body: payload, redirect: "manual" });
        const html = res.status >= 500 && /text\/html/.test(res.headers.get("content-type") || "") && pfad.startsWith("/api/");
        if (html && versuch < 4 && !(body instanceof FormData)) {
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
  put = (p, b, o) => this.anfrage("PUT", p, b ?? {}, o);
  patch = (p, b, o) => this.anfrage("PATCH", p, b ?? {}, o);
  del = (p, o) => this.anfrage("DELETE", p, undefined, o);

  async login(email, passwort = DEMO_PASSWORT) {
    let r;
    // Demo-Datenbank kann bei parallelen Testläufen anderer Teams kurz gesperrt sein → bis zu 3 Versuche
    for (let versuch = 1; versuch <= 3; versuch++) {
      r = await this.post("/api/auth/login", { email, passwort });
      if (r.status !== 500) break;
      await new Promise((ok) => setTimeout(ok, 5000 * versuch));
    }
    if (r.status !== 200) throw new Error(`Login ${email} fehlgeschlagen: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }

  async registrieren(schluessel, rollen, vorname, nachname, firma) {
    const email = `deal-test-${LAUF}-${schluessel}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email, passwort: PASSWORT, vorname, nachname, firma, rollen, agb: true });
    if (r.status !== 201) throw new Error(`Registrierung ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    this.email = email;
    return r.json.nutzer;
  }
}

function pdf(text) {
  const inhalt = `BT /F1 12 Tf 50 750 Td (${text}) Tj ET`;
  const obj = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${inhalt.length} >>\nstream\n${inhalt}\nendstream`,
  ];
  let s = "%PDF-1.4\n";
  const off = [];
  obj.forEach((o, i) => {
    off.push(s.length);
    s += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const x = s.length;
  s += `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n${off.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${obj.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return new Blob([s], { type: "application/pdf" });
}

async function datenraumUpload(client, projektId, name, { ordner, stufe, versionVon, header = true } = {}) {
  const fd = new FormData();
  fd.append("datei", pdf(name), name);
  fd.append("projektId", projektId);
  if (ordner) fd.append("ordner", ordner);
  if (stufe) fd.append("stufe", String(stufe));
  if (versionVon) fd.append("versionVon", versionVon);
  return client.anfrage("POST", "/api/portal/datenraum/upload", fd, { kopf: header ? { "X-Plattform-Upload": "1" } : {} });
}

const enthaelt = (obj, ...werte) => {
  const s = JSON.stringify(obj);
  return werte.filter(Boolean).some((w) => s.includes(w));
};
// Seiten mit loading.js streamen: notFound() liefert dann 200 mit der Nicht-gefunden-Ansicht statt 404 (wie plattform-test.mjs)
const nichtGefunden = (r) => r.status === 404 || (r.status === 200 && String(r.text || "").includes("Diesen Eintrag gibt es nicht"));
const inTagen = (t) => new Date(Date.now() + t * 86400e3).toISOString();
const heute = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });

async function main() {
  console.log(`Deal-Room-Test gegen ${BASIS} (Lauf ${LAUF})`);
  const gast = new Client("gast");
  const admin = new Client("admin");
  const anbieter = new Client("anbieter");
  const fremdAnbieter = new Client("fremder anbieter");
  const a = new Client("investor A");
  const b = new Client("investor B");
  const c = new Client("investor C");
  let r;

  // ------------------------------------------------------------ 1. Konten, Projekt, NDA
  abschnitt("1. Vorbereitung: Konten, Projekt veröffentlichen, NDA");
  await admin.login("admin@example.com");
  await anbieter.registrieren("anbieter", ["anbieter"], "Anton", `Anbieterich${LAUF}`, `DealTest Entwicklung ${LAUF}`);
  await fremdAnbieter.registrieren("fremd", ["anbieter"], "Fritz", `Fremd${LAUF}`, "");
  await a.registrieren("a", ["investor"], "Alma", `Aldenhoven${LAUF}`, `Alpha Capital ${LAUF}`);
  await b.registrieren("b", ["investor"], "Bruno", `Bergmann${LAUF}`, `Beta Fonds ${LAUF}`);
  await c.registrieren("c", ["investor"], "Carla", `Conrad${LAUF}`, "");
  pruefe(true, "Konten registriert (Anbieter, fremder Anbieter, Investoren A, B, C)");

  r = await anbieter.post("/api/portal/projekte", { titel: `Deal-Room-Testprojekt 7,5 MWp ${LAUF}` });
  const projekt = r.json.projekt;
  const pid = projekt.id;
  await anbieter.patch(`/api/portal/projekte/${pid}`, {
    titel: `Deal-Room-Testprojekt 7,5 MWp ${LAUF}`, typ: "freiflaeche", land: "DE", bundesland: "Bayern", region: "Oberbayern (Test)", mwp: 7.5, phase: "rtb",
    netzanschluss: "zusage", codGeplant: "2027-10", preisModus: "proKwp", preisProKwp: 90,
    beschreibung: "Testprojekt aus dem automatischen Deal-Room-Test. Baureif, Netzzusage vorhanden, Pachtverträge gesichert. Keine echten Angaben.",
    vertraulich: { gemeinde: `Dealgemeinde-${LAUF}` },
    datenblatt: { modulTyp: `Testmodul-${LAUF}`, mwac: 6.2 }, // Projektdatenblatt → Exposé-PDF
  });
  await anbieter.post(`/api/portal/projekte/${pid}/provision`, { akzeptiert: true });
  await anbieter.post("/api/portal/status", { art: "projekt", id: pid, nach: "pruefung" });
  r = await admin.post("/api/admin/status", { art: "projekt", id: pid, nach: "veroeffentlicht", extra: { provisionSatz: 2 } });
  pruefe(r.status === 200 && r.json.objekt.status === "veroeffentlicht", "Projekt veröffentlicht (Provision 2 %)", r.json);
  const slug = (await gast.get(`/api/boerse/${pid}`)).json.projekt?.slug;

  const iid = {};
  for (const [k, cl] of [["a", a], ["b", b]]) {
    r = await cl.post(`/api/portal/boerse/${pid}/nda`, { akzeptiert: true });
    iid[k] = r.json.interesse?.id;
    r = await admin.post("/api/admin/status", { art: "interesse", id: iid[k], nach: "nda_freigegeben" });
    pruefe(r.status === 200, `NDA von Investor ${k.toUpperCase()} freigegeben`, r.json);
  }
  r = await c.post(`/api/portal/boerse/${pid}/merken`, { an: true });
  pruefe(r.status === 200, "Investor C merkt nur (ohne NDA)", r.status);

  // ------------------------------------------------------------ 2. Zugang
  abschnitt("2. Zugang zum Deal-Room");
  r = await c.get(`/api/portal/qa?projekt=${pid}`);
  pruefe(r.status === 403, "Investor ohne Datenraum-Freigabe → 403 (Q&A)", r.status);
  r = await c.get(`/api/portal/datenraum?projekt=${pid}`);
  pruefe(r.status === 403, "Investor ohne Datenraum-Freigabe → 403 (Datenraum)", r.status);
  r = await fremdAnbieter.get(`/api/portal/bieter?projekt=${pid}`);
  pruefe(r.status === 403, "Fremder Anbieter → 403 (Bieterverfahren)", r.status);
  r = await gast.get(`/api/portal/qa?projekt=${pid}`);
  pruefe(r.status === 401, "Ohne Anmeldung → 401", r.status);
  r = await a.get(`/portal/dealroom/${pid}`);
  pruefe(r.status === 200, "Deal-Room-Seite für Investor A → 200", r.status);
  r = await c.get(`/portal/dealroom/${pid}`);
  pruefe(nichtGefunden(r), "Deal-Room-Seite für Investor ohne NDA → 404", r.status);
  r = await fremdAnbieter.get(`/portal/dealroom/${pid}`);
  pruefe(nichtGefunden(r), "Deal-Room-Seite für fremden Anbieter → 404", r.status);

  // ------------------------------------------------------------ 3. Q&A
  abschnitt("3. Q&A: Moderation und Anonymität");
  const aGeheim = [a.email, a.nutzer.nachname, a.nutzer.firma, a.nutzer.id, iid.a];
  const anbieterGeheim = [anbieter.email, anbieter.nutzer.nachname, anbieter.nutzer.firma, anbieter.nutzer.id];
  r = await a.post("/api/portal/qa", { projektId: pid, kategorie: "netz", text: `Gibt es Auflagen in der Netzzusage? Bitte an ${a.email} oder +49 171 1234567 schreiben.` });
  const frage = r.json.frage;
  pruefe(r.status === 200 && frage?.status === "offen", "Investor stellt Frage (Status offen)", r.json);
  pruefe(frage && !frage.text.includes(a.email) && !frage.text.includes("1234567") && frage.text.includes("[Kontaktangabe entfernt]"), "E-Mail und Telefonnummer automatisch entfernt", frage?.text);
  r = await a.post("/api/portal/qa", { projektId: pid, kategorie: "sonstiges", text: "Frage ohne gültige Kategorie gestellt." });
  pruefe(r.status === 422, "Unbekannte Kategorie → 422", r.status);
  r = await anbieter.post("/api/portal/qa", { projektId: pid, kategorie: "netz", text: "Anbieter darf keine Fragen stellen." });
  pruefe(r.status === 403, "Anbieter kann keine Fragen stellen → 403", r.status);
  r = await c.post("/api/portal/qa", { projektId: pid, kategorie: "netz", text: "Frage ohne freigegebenen Datenraum." });
  pruefe(r.status === 403, "Investor ohne Datenraum kann nicht fragen → 403", r.status);
  r = await anbieter.get(`/api/portal/qa?projekt=${pid}`);
  pruefe(r.status === 200 && !r.json.fragen.some((f) => f.id === frage.id), "Anbieter sieht unmoderierte Frage nicht", r.json.fragen?.length);
  r = await admin.get(`/api/portal/qa?projekt=${pid}`);
  const fAdmin = r.json.fragen?.find((f) => f.id === frage.id);
  pruefe(fAdmin?.von?.investor?.id === a.nutzer.id && fAdmin?.textOriginal?.includes(a.email) && fAdmin.bereinigt, "Backoffice sieht Fragenden und Original (Nachweis)", fAdmin);
  r = await a.post(`/api/portal/qa/${frage.id}`, { aktion: "freigeben" });
  pruefe(r.status === 403, "Investor kann nicht moderieren → 403", r.status);
  r = await anbieter.post(`/api/portal/qa/${frage.id}`, { aktion: "freigeben" });
  pruefe(r.status === 403, "Anbieter kann nicht moderieren → 403", r.status);
  r = await anbieter.post(`/api/portal/qa/${frage.id}`, { aktion: "antworten", antwort: "Antwort vor der Moderation" });
  pruefe(r.status === 409, "Antwort vor Freigabe → 409", r.status);
  r = await admin.post(`/api/portal/qa/${frage.id}`, { aktion: "freigeben", fristTage: 3 });
  const fristTage = r.json.frage?.fristAm ? Math.round((new Date(r.json.frage.fristAm) - Date.now()) / 86400e3) : null;
  pruefe(r.status === 200 && r.json.frage.status === "freigegeben" && fristTage === 3, "Backoffice gibt anonymisiert frei, Antwortfrist 3 Tage", r.json);
  r = await anbieter.get(`/api/portal/qa?projekt=${pid}`);
  const fAnbieter = r.json.fragen?.find((f) => f.id === frage.id);
  pruefe(!!fAnbieter && /^Investor [A-Z]+$/.test(fAnbieter.von?.pseudonym || ""), "Anbieter sieht Frage mit Pseudonym", fAnbieter?.von);
  pruefe(!enthaelt(r.json, ...aGeheim), "Anbieter-Antwort enthält weder Name, Firma, E-Mail noch Kennungen des Investors");
  r = await b.get(`/api/portal/qa?projekt=${pid}`);
  pruefe(r.status === 200 && !r.json.fragen.some((f) => f.id === frage.id), "Investor B sieht fremde, unbeantwortete Frage nicht", r.json.fragen?.length);
  r = await anbieter.post(`/api/portal/qa/${frage.id}`, { aktion: "antworten", antwort: `Keine Auflagen. Details unter 08031 987654 oder ${anbieter.email}.`, oeffentlich: true });
  pruefe(r.status === 200 && r.json.frage.status === "beantwortet" && !r.json.frage.antwort.includes(anbieter.email) && !r.json.frage.antwort.includes("987654"), "Anbieter antwortet – Kontaktangaben entfernt", r.json.frage?.antwort);
  r = await a.get(`/api/portal/qa?projekt=${pid}`);
  const fA1 = r.json.fragen?.find((f) => f.id === frage.id);
  pruefe(fA1?.status === "offen" && !fA1.antwort, "Antwort vor Freigabe für den Investor unsichtbar", fA1);
  r = await admin.post(`/api/portal/qa/${frage.id}`, { aktion: "antwortFreigeben" });
  pruefe(r.status === 200 && r.json.frage.status === "veroeffentlicht" && r.json.frage.oeffentlich === true, "Backoffice gibt Antwort frei (Vorschlag „für alle“ übernommen)", r.json.frage);
  r = await a.get(`/api/portal/qa?projekt=${pid}`);
  const fA2 = r.json.fragen?.find((f) => f.id === frage.id);
  pruefe(fA2?.status === "beantwortet" && fA2.antwort && fA2.eigen, "Investor A sieht Antwort auf eigene Frage", fA2);
  pruefe(!enthaelt(r.json, ...anbieterGeheim), "Investor sieht weder Name, Firma, E-Mail noch Kennung des Anbieters");
  r = await b.get(`/api/portal/qa?projekt=${pid}`);
  const fB = r.json.fragen?.find((f) => f.id === frage.id);
  pruefe(fB && fB.eigen === false && fB.von === "Anderer Interessent" && fB.antwort, "Investor B sieht freigegebene Antwort „für alle“", fB);
  pruefe(!enthaelt(r.json, ...aGeheim, ...anbieterGeheim), "…ohne Identität des Fragenden oder des Anbieters");
  r = await b.post("/api/portal/qa", { projektId: pid, kategorie: "rechtlich", text: "Sind die Dienstbarkeiten bereits eingetragen?" });
  const frage2 = r.json.frage;
  r = await admin.post(`/api/portal/qa/${frage2.id}`, { aktion: "ablehnen", grund: "Bereits im Datenraum beantwortet." });
  pruefe(r.status === 200 && r.json.frage.status === "abgelehnt", "Backoffice lehnt Frage mit Begründung ab", r.json);
  r = await b.get(`/api/portal/qa?projekt=${pid}`);
  pruefe(r.json.fragen?.find((f) => f.id === frage2.id)?.ablehnGrund === "Bereits im Datenraum beantwortet.", "Investor sieht Ablehnungsgrund der eigenen Frage", r.json.fragen);
  r = await a.anfrage("POST", "/api/portal/qa", { projektId: pid, kategorie: "netz", text: "CSRF-Versuch ohne Origin-Kopf" }, { origin: null });
  pruefe(r.status === 403, "Mutation ohne Origin → 403 (CSRF)", r.status);
  r = await a.anfrage("POST", "/api/portal/qa", "kategorie=netz", { kopf: { "Content-Type": "text/plain" } });
  pruefe(r.status === 415, "Mutation ohne JSON → 415", r.status);

  // ------------------------------------------------------------ 4. Datenraum 2.0
  abschnitt("4. Datenraum: Ordner, Stufen, Versionen, Wasserzeichen, Zugriffsprotokoll");
  r = await datenraumUpload(anbieter, pid, "Netzzusage-Test.pdf", { ordner: "netz", stufe: 1, header: false });
  pruefe(r.status === 403, "Upload ohne X-Plattform-Upload → 403", r.status);
  r = await datenraumUpload(a, pid, "Investor-Upload.pdf", { ordner: "netz" });
  pruefe(r.status === 403, "Investor kann nicht in den Datenraum hochladen → 403", r.status);
  r = await datenraumUpload(anbieter, pid, "Netzzusage-Test.pdf", { ordner: "netz", stufe: 1 });
  const dok1 = r.json.dokument;
  pruefe(r.status === 200 && r.json.eintrag?.ordner === "netz" && r.json.eintrag?.stufe === 1, "Anbieter lädt Dokument in Ordner „Netz“ (Stufe 1)", r.json);
  r = await datenraumUpload(anbieter, pid, "Pachtvertraege-vollstaendig.pdf", { ordner: "vertraege", stufe: 2 });
  const dok2 = r.json.dokument;
  pruefe(r.status === 200 && r.json.eintrag?.stufe === 2, "Anbieter lädt Dokument in Stufe 2 (nach LOI)", r.json);
  r = await a.get(`/api/portal/datenraum?projekt=${pid}&besuch=1`);
  const alle = (dr) => (dr?.ordner || []).flatMap((o) => o.dokumente);
  let e1 = alle(r.json.datenraum).find((d) => d.id === dok1.id);
  let e2 = alle(r.json.datenraum).find((d) => d.id === dok2.id);
  pruefe(r.json.datenraum?.stufe === 1 && e1 && !e1.gesperrt && e2?.gesperrt === true, "Investor (Stufe 1) sieht Stufe-2-Dokument nur gesperrt", { stufe: r.json.datenraum?.stufe, e2 });
  pruefe(r.json.datenraum?.ordner?.map((o) => o.id).join(",") === "flaeche,planung,netz,technik,ertrag,vertraege,finanzen,allgemein", "Ordner nach Standard-Index", r.json.datenraum?.ordner?.map((o) => o.id));
  r = await a.get(`/api/portal/datenraum/dokumente/${dok2.id}`);
  pruefe(r.status === 403, "Stufe-2-Download vor LOI → 403", r.status);
  r = await a.get(`/api/portal/dokumente/${dok2.id}`);
  pruefe(r.status === 403, "…auch über die bisherige Dokument-Route → 403", r.status);
  r = await a.get(`/api/boerse/${slug}`);
  pruefe(r.status === 200 && !r.json.dokumente.some((d) => d.id === dok2.id) && r.json.dokumente.some((d) => d.id === dok1.id), "Exposé-Dokumentliste ohne Stufe-2-Unterlage", { status: r.status, doks: r.json.dokumente?.map((d) => d.name), error: r.json.error });
  r = await a.anfrage("GET", `/api/portal/projekte/${pid}/expose`, undefined, { roh: true });
  const exposeText = r.status === 200 ? Buffer.from(await r.arrayBuffer()).toString("latin1") : "";
  pruefe(r.status === 200 && exposeText.startsWith("%PDF") && exposeText.includes("(Projektdatenblatt)") && exposeText.includes(`Testmodul-${LAUF}`) && /Vollst.ndigkeit \d+ %/.test(exposeText), "Exposé-PDF (nach NDA) enthält das Projektdatenblatt mit Vollständigkeit", { status: r.status, laenge: exposeText.length });
  r = await gast.anfrage("GET", `/api/boerse/${slug}/teaser`, undefined, { roh: true });
  const teaserText = r.status === 200 ? Buffer.from(await r.arrayBuffer()).toString("latin1") : "";
  pruefe(r.status === 200 && !teaserText.includes(`Testmodul-${LAUF}`) && !teaserText.includes("(Projektdatenblatt)"), "Öffentlicher Teaser ohne Projektdatenblatt", r.status);
  r = await a.anfrage("GET", `/api/portal/datenraum/dokumente/${dok1.id}`, undefined, { roh: true });
  const cd = decodeURIComponent(r.headers.get("content-disposition") || "");
  pruefe(r.status === 200 && cd.includes(a.nutzer.nachname) && cd.includes(heute()) && cd.includes("vertraulich"), "Download mit Empfänger und Datum im Dateinamen (Wasserzeichen-Hinweis)", cd);
  await r.arrayBuffer();
  r = await a.anfrage("GET", `/api/portal/datenraum/dokumente/${dok1.id}?anzeigen=1`, undefined, { roh: true });
  pruefe(r.status === 200 && /^inline/.test(r.headers.get("content-disposition") || ""), "Ansehen im Browser (inline)", r.status);
  await r.arrayBuffer();
  r = await datenraumUpload(anbieter, pid, "Netzzusage-Test-v2.pdf", { versionVon: dok1.id });
  const dok1v2 = r.json.dokument;
  pruefe(r.status === 200 && r.json.eintrag?.versionVon === dok1.id && r.json.eintrag?.ordner === "netz", "Neue Version übernimmt Ordner und Stufe", r.json.eintrag);
  r = await datenraumUpload(anbieter, pid, "Netzzusage-Test-v2b.pdf", { versionVon: dok1.id });
  pruefe(r.status === 409, "Zweite neuere Version derselben Vorlage → 409", r.status);
  r = await a.get(`/api/portal/datenraum?projekt=${pid}`);
  e1 = alle(r.json.datenraum).find((d) => d.id === dok1v2.id);
  pruefe(e1?.version === 2 && e1.versionen?.[0]?.id === dok1.id && !alle(r.json.datenraum).some((d) => d.id === dok1.id), "Datenraum zeigt Version 2 mit Vorversion", e1);
  r = await a.patch(`/api/portal/datenraum/dokumente/${dok1v2.id}`, { stufe: 1 });
  pruefe(r.status === 403, "Investor kann nicht einordnen → 403", r.status);
  r = await fremdAnbieter.patch(`/api/portal/datenraum/dokumente/${dok1v2.id}`, { ordner: "technik" });
  pruefe(r.status === 403, "Fremder Anbieter kann nicht einordnen → 403", r.status);
  r = await anbieter.get(`/api/portal/datenraum/zugriffe?projekt=${pid}`);
  const zA = r.json.investoren?.find((x) => x.dokumente?.includes("Netzzusage-Test.pdf"));
  pruefe(r.status === 200 && zA && zA.besuche >= 1 && zA.zugriffe >= 3 && /^Investor [A-Z]+$/.test(zA.pseudonym), "Zugriffsprotokoll: wer (Pseudonym) hat was wann angesehen", zA);
  pruefe(!enthaelt(r.json, ...aGeheim), "Zugriffsprotokoll für den Anbieter ohne Identität des Investors");
  r = await admin.get(`/api/portal/datenraum/zugriffe?projekt=${pid}`);
  pruefe(r.json.investoren?.some((x) => x.investor?.id === a.nutzer.id), "Backoffice sieht das Protokoll namentlich", r.json.investoren?.map((x) => x.investor?.nachname));
  r = await a.get(`/api/portal/datenraum/zugriffe?projekt=${pid}`);
  pruefe(r.status === 403, "Investor sieht kein Zugriffsprotokoll → 403", r.status);

  // ------------------------------------------------------------ 5. Bieterverfahren
  abschnitt("5. Bieterverfahren: verdeckte Gebote, Fristen, Runden, Zuschlag");
  r = await anbieter.post("/api/admin/bieter", { projektId: pid, frist: inTagen(2) });
  pruefe(r.status === 403, "Anbieter kann kein Verfahren starten → 403", r.status);
  r = await admin.post("/api/admin/bieter", { projektId: pid, frist: inTagen(-1) });
  pruefe(r.status === 422, "Frist in der Vergangenheit → 422", r.status);
  r = await admin.post("/api/admin/bieter", { projektId: pid, art: "indikativ", frist: inTagen(2), pflicht: ["bedingungen", "finanzierung"], hinweis: "Test-Verfahren" });
  const vf = r.json.verfahren;
  pruefe(r.status === 200 && vf?.status === "laufend" && vf.teilnehmer?.length === 2, "Backoffice startet indikative Runde (2 Teilnehmer)", r.json);
  r = await admin.post("/api/admin/bieter", { projektId: pid, frist: inTagen(3) });
  pruefe(r.status === 409, "Zweites Verfahren parallel → 409", r.status);
  r = await c.post("/api/portal/bieter", { verfahrenId: vf.id, preisModus: "proKwp", preisProKwp: 99, bedingungen: "keine", finanzierung: "EK" });
  pruefe(r.status === 403, "Investor ohne Datenraum kann nicht bieten → 403", r.status);
  r = await a.post("/api/portal/bieter", { verfahrenId: vf.id, preisModus: "proKwp", preisProKwp: 95, bedingungen: "Vorbehaltlich DD" });
  pruefe(r.status === 422, "Gebot ohne Pflichtangabe Finanzierung → 422", r.json);
  r = await a.post("/api/portal/bieter", { verfahrenId: vf.id, preisModus: "proKwp", preisProKwp: "95,5", bedingungen: "Vorbehaltlich DD", finanzierung: "Eigenkapital, IC-Zusage", zeitplan: "Signing in 8 Wochen" });
  const gebotA1 = r.json.gebot;
  pruefe(r.status === 200 && gebotA1?.preisGesamt === 716250 && gebotA1.version === 1, "Investor A bietet verdeckt (95,50 €/kWp = 716.250 €)", r.json);
  r = await b.post("/api/portal/bieter", { verfahrenId: vf.id, preisModus: "gesamt", preis: 760000, bedingungen: "Vorbehaltlich Netzprüfung", finanzierung: "Bank 70 %" });
  const gebotB1 = r.json.gebot;
  pruefe(r.status === 200 && gebotB1?.preisGesamt === 760000, "Investor B bietet verdeckt (760.000 €)", r.json);
  r = await a.get(`/api/portal/bieter?projekt=${pid}`);
  pruefe(r.json.verfahren?.eigeneGebote?.length === 1 && !enthaelt(r.json, gebotB1.id, "760000", b.nutzer.nachname, b.email) && !("matrix" in r.json.verfahren) && !("geboteAnzahl" in r.json.verfahren) && !("teilnehmer" in r.json.verfahren), "Investor A sieht nur das eigene Gebot – nie fremde Gebote, Anzahl oder Teilnehmer", r.json.verfahren);
  r = await anbieter.get(`/api/portal/bieter?projekt=${pid}`);
  pruefe(r.status === 200 && r.json.verfahren?.matrix === null && !enthaelt(r.json, "716250", "760000"), "Anbieter sieht vor Freigabe keine Gebote", r.json.verfahren?.matrix);
  r = await admin.post(`/api/admin/bieter/${vf.id}`, { aktion: "anbieterFreigabe", an: true });
  pruefe(r.status === 200 && r.json.verfahren.anbieterFreigabe, "Backoffice gibt Bieterstand für den Anbieter frei", r.status);
  r = await anbieter.get(`/api/portal/bieter?projekt=${pid}`);
  pruefe(r.json.verfahren?.matrix?.length === 2 && r.json.verfahren.matrix.every((g) => /^Investor [A-Z]+$/.test(g.von?.pseudonym || "") && !g.von.investor && !g.interesseId), "Anbieter sieht anonymisierte Vergleichsmatrix", { status: r.status, matrix: r.json.verfahren?.matrix, error: r.json.error });
  pruefe(!enthaelt(r.json, ...aGeheim, b.email, b.nutzer.nachname, b.nutzer.firma, iid.b), "Vergleichsmatrix ohne Identitäten der Bieter");
  r = await admin.get(`/api/portal/bieter?projekt=${pid}`);
  pruefe(r.json.verfahren?.matrix?.some((g) => g.von?.investor?.id === b.nutzer.id) && r.json.verfahren.teilnehmer.every((t) => t.geboten), "Backoffice sieht Bieter namentlich und Teilnahme", r.json.verfahren?.teilnehmer);
  r = await a.post("/api/portal/bieter", { verfahrenId: vf.id, preisModus: "proKwp", preisProKwp: 100, bedingungen: "Vorbehaltlich DD", finanzierung: "Eigenkapital" });
  pruefe(r.status === 200 && r.json.gebot.id === gebotA1.id && r.json.gebot.version === 2, "Gebot aktualisieren → Version 2 (kein zweites Gebot)", r.json);
  r = await admin.post(`/api/admin/bieter/${vf.id}`, { aktion: "zuschlag", gebotId: gebotB1.id });
  pruefe(r.status === 409, "Zuschlag während offener Runde → 409", r.status);
  r = await admin.post(`/api/admin/bieter/${vf.id}`, { aktion: "erinnern" });
  pruefe(r.status === 200 && /Erinnerung/.test(r.json.verfahren?.hinweis || ""), "Erinnerung an Teilnehmer ohne Gebot", r.json.verfahren?.hinweis);
  r = await admin.post(`/api/admin/bieter/${vf.id}`, { aktion: "beenden" });
  pruefe(r.status === 200 && r.json.verfahren.status === "auswertung", "Runde beendet → Auswertung (Fristablauf)", r.json.verfahren?.status);
  r = await a.post("/api/portal/bieter", { verfahrenId: vf.id, preisModus: "proKwp", preisProKwp: 110, bedingungen: "x", finanzierung: "Eigenkapital" });
  pruefe(r.status === 409, "Gebot nach Fristablauf → 409", r.status);
  r = await a.del(`/api/portal/bieter/gebote/${gebotA1.id}`);
  pruefe(r.status === 409, "Zurückziehen nach Fristablauf → 409", r.status);
  r = await admin.post(`/api/admin/bieter/${vf.id}`, { aktion: "naechsteRunde", teilnehmer: [iid.a], frist: inTagen(5) });
  pruefe(r.status === 200 && r.json.verfahren.runde.nr === 2 && r.json.verfahren.runde.art === "verbindlich" && r.json.verfahren.status === "laufend", "Verbindliche Runde mit Shortlist (nur A)", r.json.verfahren?.runde);
  r = await b.post("/api/portal/bieter", { verfahrenId: vf.id, preisModus: "gesamt", preis: 900000, bedingungen: "x", finanzierung: "Bank", zeitplan: "sofort" });
  pruefe(r.status === 403, "Nicht zugelassener Bieter → 403", r.status);
  r = await a.get(`/api/portal/datenraum?projekt=${pid}`);
  e2 = alle(r.json.datenraum).find((d) => d.id === dok2.id);
  pruefe(r.json.datenraum?.stufe === 2 && e2 && !e2.gesperrt, "Zulassung zur verbindlichen Runde öffnet Stufe 2", { stufe: r.json.datenraum?.stufe, e2 });
  r = await a.anfrage("GET", `/api/portal/datenraum/dokumente/${dok2.id}`, undefined, { roh: true });
  pruefe(r.status === 200, "Stufe-2-Dokument jetzt abrufbar", r.status);
  await r.arrayBuffer();
  r = await b.get(`/api/portal/datenraum/dokumente/${dok2.id}`);
  pruefe(r.status === 403, "Für nicht zugelassenen Bieter bleibt Stufe 2 gesperrt → 403", r.status);
  r = await a.post("/api/portal/bieter", { verfahrenId: vf.id, preisModus: "gesamt", preis: 800000, bedingungen: "Keine", finanzierung: "Eigenkapital" });
  pruefe(r.status === 422, "Verbindliches Gebot ohne Zeitplan → 422", r.json);
  r = await a.post("/api/portal/bieter", { verfahrenId: vf.id, preisModus: "gesamt", preis: 800000, bedingungen: "Keine", finanzierung: "Eigenkapital, Nachweis folgt", zeitplan: "Signing in 4 Wochen" });
  const gebotA2 = r.json.gebot;
  pruefe(r.status === 200 && gebotA2?.runde === 2, "Verbindliches Gebot von A", r.json);
  await admin.post(`/api/admin/bieter/${vf.id}`, { aktion: "beenden" });
  r = await admin.post(`/api/admin/bieter/${vf.id}`, { aktion: "zuschlag", gebotId: gebotA2.id, kommentar: "Bestes verbindliches Angebot." });
  pruefe(r.status === 200 && r.json.verfahren.status === "zuschlag" && r.json.verfahren.zuschlag?.preisGesamt === 800000, "Zuschlag an A", r.json.verfahren?.zuschlag);
  r = await a.get("/api/portal/interessen");
  pruefe(r.json.interessen?.find((i) => i.id === iid.a)?.status === "loi_angenommen", "Interesse A → LOI angenommen (Automat)", r.json.interessen?.find((i) => i.id === iid.a)?.status);
  r = await anbieter.get(`/api/portal/projekte/${pid}`);
  pruefe(r.json.projekt?.status === "reserviert", "Projekt → reserviert", r.json.projekt?.status);
  r = await b.get(`/api/portal/bieter?projekt=${pid}`);
  pruefe(r.json.verfahren?.eigeneGebote?.[0]?.status === "unterlegen" && r.json.verfahren.zuschlagEigen === false && !enthaelt(r.json, "800000", a.nutzer.nachname), "B: eigenes Gebot „nicht berücksichtigt“, ohne Details zum Gewinner", r.json.verfahren?.eigeneGebote);
  r = await admin.post("/api/admin/status", { art: "projekt", id: pid, nach: "verkauft", extra: { interesseId: iid.a, kaufpreis: 800000 } });
  pruefe(r.status === 200 && r.json.objekt.status === "verkauft", "Verkauf abgeschlossen", r.json);
  r = await admin.get("/api/admin/provisionen");
  const pv = r.json.provisionen?.find((x) => x.projektId === pid);
  pruefe(pv && pv.betrag === 16000 && pv.satz === 0.02 && pv.interesseId === iid.a, "Provision automatisch: 2 % von 800.000 € = 16.000 €", pv);
  r = await admin.get(`/api/portal/bieter?projekt=${pid}`);
  pruefe(r.json.verfahren?.status === "abgeschlossen", "Verfahren nach Verkauf abgeschlossen", r.json.verfahren?.status);

  // ------------------------------------------------------------ 6. Pipeline
  abschnitt("6. Investor-Pipeline: Kanban, Notizen, Suchprofile");
  r = await a.put("/api/portal/pipeline", { projektId: pid, text: `Geheime Notiz ${LAUF}`, tags: ["#Prio A", "Bayern", "Bayern"] });
  pruefe(r.status === 200 && r.json.notiz.tags.join(",") === "Prio A,Bayern", "Private Notiz mit Tags (bereinigt, ohne Dubletten)", r.json);
  r = await a.get("/api/portal/pipeline");
  const kA = r.json.karten?.find((k) => k.projekt.id === pid);
  pruefe(kA?.spalte === "gewonnen" && kA.gebote >= 1 && kA.notiz?.text?.includes(LAUF), "A: Projekt in „Gewonnen“ mit Notiz", kA);
  pruefe(typeof r.json.kennzahlen?.mwpPipeline === "number" && r.json.kennzahlen.gewonnen >= 1 && r.json.kennzahlen.laender, "Portfolio-Kennzahlen vorhanden", r.json.kennzahlen);
  r = await b.get("/api/portal/pipeline");
  const kB = r.json.karten?.find((k) => k.projekt.id === pid);
  pruefe(kB?.spalte === "verloren" && !enthaelt(r.json, `Geheime Notiz ${LAUF}`), "B: „Verloren“, fremde Notiz unsichtbar", kB);
  r = await b.put("/api/portal/pipeline", { projektId: pid, spalte: "verhandlung" });
  r = await b.get("/api/portal/pipeline");
  pruefe(r.json.karten?.find((k) => k.projekt.id === pid)?.manuell === true, "Eigene Einordnung in eine Spalte (privat)", r.json.karten?.find((k) => k.projekt.id === pid));
  r = await admin.get("/api/portal/pipeline");
  pruefe(!enthaelt(r.json, `Geheime Notiz ${LAUF}`), "Auch das Backoffice sieht private Notizen nicht");
  r = await anbieter.get("/api/portal/pipeline");
  pruefe(r.status === 403, "Pipeline nur für Investoren → 403", r.status);
  r = await c.put("/api/portal/pipeline", { projektId: "P-26-ZZZZZZ", text: "x" });
  pruefe(r.status === 404, "Notiz zu unbekanntem Projekt → 404", r.status);
  r = await a.put("/api/portal/pipeline/suchprofile", { profile: [{ name: "Baurecht Bayern", phasen: ["rtb"], laender: ["DE"], mwpMin: 5 }, { name: "Bestand", phasen: ["cod"], schwelle: 60 }] });
  pruefe(r.status === 200 && r.json.suchprofile.length === 2 && r.json.suchprofile[1].schwelle === 60, "Zwei Suchprofile gespeichert", r.json);
  r = await a.put("/api/portal/pipeline/suchprofile", { profile: Array.from({ length: 9 }, (_, i) => ({ name: `P${i}` })) });
  pruefe(r.status === 422, "Mehr als 8 Suchprofile → 422", r.status);
  r = await a.get("/api/portal/pipeline");
  pruefe(r.json.suchprofile?.length === 2 && typeof r.json.suchprofile[0].treffer === "number", "Suchprofile mit Trefferzahl in der Pipeline", r.json.suchprofile);

  // ------------------------------------------------------------ 7. Cockpit & Kontaktfreigabe
  abschnitt("7. Anbieter-Cockpit und Kontaktfreigabe");
  r = await anbieter.get(`/api/portal/pipeline/cockpit?projekt=${pid}`);
  const t = Object.fromEntries((r.json.cockpit?.trichter || []).map((x) => [x.id, x.wert]));
  pruefe(r.status === 200 && t.nda >= 2 && t.datenraum >= 2 && t.angebote >= 2 && r.json.cockpit.verlauf.length === 60, "Trichter (Aufrufe → Merker → NDA → Datenraum → Angebote) und 60-Tage-Verlauf", t);
  pruefe(!enthaelt(r.json, ...aGeheim), "Cockpit ohne Identitäten der Investoren");
  r = await a.get(`/api/portal/pipeline/cockpit?projekt=${pid}`);
  pruefe(r.status === 403, "Investor sieht kein Cockpit → 403", r.status);
  r = await fremdAnbieter.get(`/api/portal/pipeline/cockpit?projekt=${pid}`);
  pruefe(r.status === 403, "Fremder Anbieter sieht kein Cockpit → 403", r.status);
  r = await anbieter.post("/api/admin/dealroom/freigabe", { projektId: pid, interesseId: iid.a });
  pruefe(r.status === 403, "Anbieter kann Kontakte nicht selbst freigeben → 403", r.status);
  r = await admin.post("/api/admin/dealroom/freigabe", { projektId: pid, interesseId: iid.a });
  pruefe(r.status === 200 && r.json.freigabe.kontaktFrei, "Backoffice gibt Kontakt Anbieter ↔ A frei", r.json);
  r = await anbieter.get(`/api/portal/datenraum/zugriffe?projekt=${pid}`);
  pruefe(enthaelt(r.json, a.nutzer.nachname) && !enthaelt(r.json, b.nutzer.nachname), "Nach Freigabe sieht der Anbieter A namentlich – B bleibt anonym", r.json.investoren?.map((x) => x.name || x.pseudonym));
  r = await admin.get("/api/admin/dealroom");
  pruefe(r.status === 200 && Array.isArray(r.json.uebersicht?.moderation) && r.json.uebersicht.verfahren.some((x) => x.projektId === pid), "Backoffice-Übersicht (Moderation, Verfahren)", r.json.uebersicht?.kennzahlen);
  r = await anbieter.get("/api/admin/dealroom");
  pruefe(r.status === 403, "Backoffice-Übersicht nur für Admin → 403", r.status);

  // ------------------------------------------------------------ 8. Seiten
  abschnitt("8. Neue Seiten");
  for (const [cl, pfad, soll] of [
    [a, "/portal/pipeline", 200],
    [a, `/portal/dealroom/${pid}?tab=qa`, 200],
    [a, `/portal/dealroom/${pid}?tab=datenraum`, 200],
    [a, `/portal/dealroom/${pid}?tab=bieter`, 200],
    [a, "/portal/boerse/karte", 200],
    [anbieter, `/portal/dealroom/${pid}`, 200],
    [anbieter, `/portal/dealroom/${pid}?tab=zugriffe`, 200],
    [admin, `/portal/dealroom/${pid}?tab=bieter`, 200],
    [admin, "/portal/admin/dealroom", 200],
    [gast, "/projektboerse/karte", 200],
    [anbieter, "/portal/pipeline", 404],
    [anbieter, "/portal/admin/dealroom", 404],
  ]) {
    r = await cl.get(pfad);
    pruefe(soll === 404 ? nichtGefunden(r) : r.status === soll, `${pfad} (${cl.name}) → ${soll}`, r.status);
  }

  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen bestanden")} (${ok} ok)`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.message}`));
  process.exit(1);
});
