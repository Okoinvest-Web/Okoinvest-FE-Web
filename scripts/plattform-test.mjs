// scripts/plattform-test.mjs
//
// End-to-End-Test der Plattform-Kernprozesse gegen den laufenden Dev-Server
// (Demo-Backend). Ohne Test-Framework:  node scripts/plattform-test.mjs [basis-url]
//
// Spielt durch: Anfrage → Registrierung (verknüpft) → Login → Fläche anlegen/einreichen →
// Admin-Statuswechsel → Nutzer sieht Status + Nachricht → Pachtangebot annehmen →
// Projekt anlegen/Provision/einreichen → Admin veröffentlicht → öffentliche Börse ohne
// vertrauliche Felder → NDA anfragen/freigeben → Datenraum-Upload/Download → LOI →
// Verkauf mit automatischer Provision → Passwort vergessen/setzen → Rechteverletzungen (401/403).

const BASIS = (process.argv[2] || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);

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

function abschnitt(titel) {
  console.log(`\n${titel}`);
}

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
    const res = await fetch(BASIS + pfad, { method: methode, headers, body: payload, redirect: "manual" });
    const gesetzt = res.headers.getSetCookie?.() || [];
    for (const c of gesetzt) {
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
    return { status: res.status, json, headers: res.headers };
  }

  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  patch = (p, b, o) => this.anfrage("PATCH", p, b ?? {}, o);
  put = (p, b, o) => this.anfrage("PUT", p, b ?? {}, o);
  del = (p, o) => this.anfrage("DELETE", p, undefined, o);

  async login(email, passwort = DEMO_PASSWORT) {
    const r = await this.post("/api/auth/login", { email, passwort });
    if (r.status !== 200) throw new Error(`Login ${email} fehlgeschlagen: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.nutzer;
  }
}

/** Minimales gültiges PDF */
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

async function main() {
  console.log(`Plattform-Test gegen ${BASIS} (Lauf ${LAUF})`);
  const gast = new Client("gast");
  const eigentuemer = new Client("eigentuemer");
  const admin = new Client("admin");
  const anbieter = new Client("anbieter");
  const investor = new Client("investor");
  const fremd = new Client("fremder investor");

  // ------------------------------------------------------------ 1. Anfrage
  abschnitt("1. Öffentliche Anfrage");
  const email = `test-${LAUF}@example.com`;
  const kontakt = { vorname: "Testlauf", nachname: `Eigentümer ${LAUF}`, email, plz: "86825", land: "DE" };
  let r = await gast.post("/api/anfrage", { typ: "flaeche", kontakt, daten: { ha: 9.5 }, einwilligung: true, herkunft: { kanal: "Direkt", einstieg: "/flaeche-verpachten" } });
  pruefe(r.status === 200 && r.json.ok && /^V-/.test(r.json.id), "Anfrage erzeugt Vorgang", r.json);
  const vorgangId = r.json.id;
  const flaecheAusAnfrage = r.json.vorgang?.flaecheId;
  pruefe(!!flaecheAusAnfrage, "typ flaeche erzeugt zusätzlich einen Flächen-Entwurf", r.json);

  r = await gast.post("/api/anfrage", { typ: "flaeche", kontakt, daten: {}, einwilligung: false });
  pruefe(r.status === 422, "ohne Einwilligung → 422", r);
  r = await gast.post("/api/anfrage", { typ: "flaeche", kontakt, einwilligung: true }, { origin: null });
  pruefe(r.status === 403, "ohne Origin-Kopfzeile → 403 (CSRF)", r.status);
  r = await gast.post("/api/anfrage", { typ: "flaeche", kontakt, einwilligung: true }, { origin: "https://boese.example" });
  pruefe(r.status === 403, "fremde Origin → 403 (CSRF)", r.status);
  r = await gast.anfrage("POST", "/api/anfrage", "typ=flaeche", { kopf: { "Content-Type": "application/x-www-form-urlencoded" } });
  pruefe(r.status === 415, "Formular-POST statt JSON → 415", r.status);
  r = await gast.post("/api/anfrage", { typ: "gibtsnicht", kontakt, einwilligung: true });
  pruefe(r.status === 422, "unbekannter Typ → 422", r.status);

  // ------------------------------------------------------------ 2. Registrierung
  abschnitt("2. Registrierung verknüpft die Anfrage");
  r = await eigentuemer.post("/api/auth/registrieren", { email, passwort: "kurz", vorname: "Testlauf", nachname: "E", rollen: ["flaeche"], agb: true });
  pruefe(r.status === 422, "zu kurzes Passwort → 422", r.json);
  r = await eigentuemer.post("/api/auth/registrieren", { email, passwort: "Test-Passwort-2026", vorname: "Testlauf", nachname: "E", rollen: ["admin"], agb: true });
  pruefe(r.status === 422, "Rolle admin nicht selbst wählbar → 422", r.json);
  r = await eigentuemer.post("/api/auth/registrieren", { email, passwort: "Test-Passwort-2026", vorname: "Testlauf", nachname: `Eigentümer ${LAUF}`, rollen: ["flaeche"], vorgang: vorgangId, agb: true });
  pruefe(r.status === 201 && r.json.vorgangVerknuepft === vorgangId, "Registrierung (201) verknüpft Vorgang über ?vorgang + E-Mail", r.json);
  pruefe(!!eigentuemer.cookie, "Sitzungscookie gesetzt (HttpOnly, signiert)");
  r = await gast.post("/api/auth/registrieren", { email, passwort: "Test-Passwort-2026", vorname: "X", nachname: "Y", rollen: ["flaeche"], agb: true });
  pruefe(r.status === 409, "doppelte E-Mail → 409", r.status);
  r = await eigentuemer.get("/api/auth/ich");
  pruefe(r.json.nutzer?.email === email && !("passwortHash" in (r.json.nutzer || {})), "/api/auth/ich liefert Nutzer ohne Passwort-Hash", r.json);
  r = await eigentuemer.get("/api/portal/vorgaenge");
  pruefe(r.json.vorgaenge?.some((v) => v.id === vorgangId), "Vorgang erscheint im Portal", r.json);
  r = await eigentuemer.get("/api/portal/flaechen");
  pruefe(r.json.flaechen?.some((f) => f.id === flaecheAusAnfrage && f.status === "entwurf"), "Flächen-Entwurf aus Anfrage erscheint im Portal", r.json);

  // ------------------------------------------------------------ 3. Logout / Login
  abschnitt("3. Logout und Login");
  const alterCookie = eigentuemer.cookie;
  await eigentuemer.post("/api/auth/logout");
  pruefe(!eigentuemer.cookie, "Logout löscht Cookie");
  r = await eigentuemer.get("/api/portal/vorgaenge");
  pruefe(r.status === 401, "ohne Sitzung → 401", r.status);
  r = await eigentuemer.post("/api/auth/login", { email, passwort: "falsch-falsch-1" });
  pruefe(r.status === 401, "falsches Passwort → 401", r.status);
  r = await eigentuemer.post("/api/auth/login", { email, passwort: "Test-Passwort-2026" });
  pruefe(r.status === 200 && !!eigentuemer.cookie, "Login ok", r.json);
  const manipuliert = new Client("manipuliert");
  manipuliert.cookie = alterCookie.replace(/\.[^.]+$/, ".AAAA");
  r = await manipuliert.get("/api/portal/vorgaenge");
  pruefe(r.status === 401, "manipulierte Signatur → 401", r.status);
  const portal = await gast.get("/portal/flaechen", { origin: null });
  pruefe([302, 303, 307, 308].includes(portal.status) && /\/login\?weiter=%2Fportal%2Fflaechen/.test(portal.headers.get("location") || ""), "/portal ohne Sitzung → Weiterleitung /login?weiter=…", portal.headers.get("location"));

  // ------------------------------------------------------------ 4. Flächen
  abschnitt("4. Fläche anlegen und einreichen");
  r = await eigentuemer.post("/api/portal/flaechen", {
    bezeichnung: `Testfläche ${LAUF}`, land: "DE", bundesland: "Bayern", plz: "86825", ort: "Testdorf", ha: 12.4, nutzung: "acker",
    flurstuecke: [{ gemarkung: "Testfeld", flur: "1", nummer: "100/2" }], einreichen: true,
  });
  pruefe(r.status === 200 && r.json.flaeche?.status === "eingegangen", "Fläche angelegt und direkt eingereicht", r.json);
  const flaecheId = r.json.flaeche?.id;
  r = await eigentuemer.post("/api/portal/status", { art: "flaeche", id: flaecheAusAnfrage, nach: "eingegangen" });
  pruefe(r.status === 422, "Entwurf ohne Ort kann nicht eingereicht werden → 422", r.json);
  r = await eigentuemer.patch(`/api/portal/flaechen/${flaecheAusAnfrage}`, { bezeichnung: "Fläche aus Anfrage", land: "DE", plz: "86825", ort: "Testdorf", ha: 9.5 });
  pruefe(r.status === 200, "Entwurf ergänzt", r.json);
  r = await eigentuemer.post("/api/portal/status", { art: "flaeche", id: flaecheAusAnfrage, nach: "eingegangen" });
  pruefe(r.status === 200 && r.json.objekt.status === "eingegangen", "Entwurf eingereicht", r.json);
  r = await eigentuemer.post("/api/portal/status", { art: "flaeche", id: flaecheId, nach: "vorpruefung" });
  pruefe(r.status === 403, "Eigentümer darf Admin-Schritt nicht auslösen → 403", r.json);

  // ------------------------------------------------------------ 5. Admin qualifiziert
  abschnitt("5. Admin: Statuswechsel mit Kommentar");
  await admin.login("admin@example.com");
  r = await admin.post("/api/admin/status", { art: "vorgang", id: vorgangId, nach: "in_pruefung", extra: { kommentar: "Wir prüfen Ihre Fläche." } });
  pruefe(r.status === 200 && r.json.objekt.status === "in_pruefung", "Vorgang → In Prüfung", r.json);
  r = await admin.post("/api/admin/status", { art: "vorgang", id: vorgangId, nach: "abgeschlossen" });
  pruefe(r.status === 409, "nicht vorgesehener Übergang → 409", r.json);
  r = await admin.post("/api/admin/status", { art: "vorgang", id: vorgangId, nach: "qualifiziert", extra: { kommentar: `Fläche passt (${LAUF}).` } });
  pruefe(r.status === 200, "Vorgang → Qualifiziert", r.json);
  const adminKonto = (await admin.get("/api/auth/ich")).json.nutzer;
  r = await admin.post("/api/admin/zuweisen", { art: "vorgang", id: vorgangId, zustaendigId: adminKonto.id });
  pruefe(r.status === 200, "Zuständigen setzen", r.json);
  for (const nach of ["vorpruefung", "standortanalyse"]) {
    r = await admin.post("/api/admin/status", { art: "flaeche", id: flaecheId, nach });
    pruefe(r.status === 200, `Fläche → ${nach}`, r.json);
  }
  r = await admin.post("/api/admin/status", { art: "flaeche", id: flaecheId, nach: "pachtangebot" });
  pruefe(r.status === 422, "Pachtangebot ohne Angebot → 422", r.json);
  r = await admin.post("/api/admin/status", { art: "flaeche", id: flaecheId, nach: "pachtangebot", extra: { pachtangebot: { euroProHaJahr: 2800, laufzeitJahre: 30, text: "Testangebot" }, kommentar: "Angebot anbei." } });
  pruefe(r.status === 200, "Fläche → Pachtangebot", r.json);
  r = await admin.post("/api/admin/status", { art: "flaeche", id: flaecheAusAnfrage, nach: "abgelehnt" });
  pruefe(r.status === 422, "Ablehnen ohne Grund → 422", r.json);

  // ------------------------------------------------------------ 6. Nutzer sieht Status
  abschnitt("6. Nutzer sieht Status und Nachricht");
  r = await eigentuemer.get(`/api/portal/vorgaenge/${vorgangId}`);
  pruefe(r.json.vorgang?.status === "qualifiziert" && r.json.vorgang?.statusVerlauf?.length >= 3, "Status und Verlauf sichtbar", r.json.vorgang?.status);
  r = await eigentuemer.get("/api/portal/nachrichten");
  const thread = r.json.threads?.find((t) => t.bezugArt === "vorgang" && t.bezugId === vorgangId);
  pruefe(thread && thread.ungelesen >= 2, "Statuswechsel erzeugen ungelesene Nachrichten", r.json.threads?.map((t) => [t.bezugArt, t.ungelesen]));
  r = await eigentuemer.get(`/api/portal/nachrichten?bezug=vorgang:${vorgangId}`);
  pruefe(r.json.thread?.nachrichten?.some((m) => m.text.includes(`Fläche passt (${LAUF})`)), "Kommentar des Admins erscheint beim Nutzer", r.json);
  r = await eigentuemer.post("/api/portal/nachrichten", { bezugArt: "flaeche", bezugId: flaecheId, text: "Rückfrage zum Pachtangebot: Ist eine Indexierung vorgesehen?" });
  pruefe(r.status === 200, "Rückfrage als Nachricht", r.json);
  r = await eigentuemer.post("/api/portal/status", { art: "flaeche", id: flaecheId, nach: "vertrag" });
  pruefe(r.status === 200 && r.json.objekt.status === "vertrag", "Pachtangebot angenommen → Vertrag", r.json);

  // ------------------------------------------------------------ 7. Rechteverletzungen
  abschnitt("7. Rechte: Rolle und Eigentum");
  r = await eigentuemer.post("/api/admin/status", { art: "vorgang", id: vorgangId, nach: "angebot" });
  pruefe(r.status === 403, "Nicht-Admin → /api/admin/status 403", r.status);
  r = await eigentuemer.get("/api/admin/vorgaenge");
  pruefe(r.status === 403, "Nicht-Admin → /api/admin/vorgaenge 403", r.status);
  r = await eigentuemer.get("/api/portal/projekte");
  pruefe(r.status === 403, "Flächeneigentümer → Projekte (Rolle anbieter) 403", r.status);
  const alleFlaechen = (await admin.get("/api/admin/flaechen")).json.flaechen || [];
  const fremdeFlaeche = alleFlaechen.find((f) => f.eigentuemer && f.eigentuemer.email !== email);
  r = await eigentuemer.get(`/api/portal/flaechen/${fremdeFlaeche?.id}`);
  pruefe(r.status === 403, "fremde Fläche lesen → 403", r.status);
  r = await eigentuemer.patch(`/api/portal/flaechen/${fremdeFlaeche?.id}`, { bezeichnung: "gekapert" });
  pruefe(r.status === 403, "fremde Fläche ändern → 403", r.status);
  r = await eigentuemer.get(`/api/portal/nachrichten?bezug=flaeche:${fremdeFlaeche?.id}`);
  pruefe(r.status === 403, "fremden Nachrichten-Thread lesen → 403", r.status);
  r = await gast.get("/api/admin/uebersicht");
  pruefe(r.status === 401, "Gast → Admin-API 401", r.status);

  // ------------------------------------------------------------ 8. Projekt einreichen und freigeben
  abschnitt("8. Anbieter: Projekt einreichen, Admin gibt frei");
  await anbieter.login("anbieter@example.com");
  r = await anbieter.post("/api/portal/projekte", { titel: `Testprojekt Freifläche 7,5 MWp ${LAUF}` });
  pruefe(r.status === 200 && r.json.projekt.status === "entwurf", "Projekt als Entwurf angelegt", r.json);
  const projekt = r.json.projekt;
  const vollstaendig = {
    titel: `Testprojekt Freifläche 7,5 MWp ${LAUF}`, typ: "freiflaeche", land: "DE", bundesland: "Bayern", region: "Oberbayern (Test)", mwp: 7.5, phase: "rtb",
    netzanschluss: "zusage", codGeplant: "2027-10", preisModus: "proKwp", preisProKwp: 90,
    beschreibung: "Testprojekt aus dem automatischen Plattform-Test. Baureif, Netzzusage vorhanden, Pachtverträge gesichert. Keine echten Angaben.",
    highlights: ["Baureif", "Netzzusage"],
    vertraulich: { gemeinde: `Geheimgemeinde-${LAUF}`, netzbetreiber: "Test-Netz" },
  };
  r = await anbieter.patch(`/api/portal/projekte/${projekt.id}`, vollstaendig);
  pruefe(r.status === 200, "Projekt vervollständigt", r.json);
  r = await anbieter.post("/api/portal/status", { art: "projekt", id: projekt.id, nach: "pruefung" });
  pruefe(r.status === 422 && /Provision/.test(r.json.error), "Einreichen ohne Provisionsvereinbarung → 422", r.json);
  r = await anbieter.post(`/api/portal/projekte/${projekt.id}/provision`, { akzeptiert: true });
  pruefe(r.status === 200 && r.json.projekt.provisionAkzeptiert?.am, "Provisionsvereinbarung akzeptiert (Zeitstempel)", r.json);
  r = await anbieter.post("/api/portal/status", { art: "projekt", id: projekt.id, nach: "pruefung" });
  pruefe(r.status === 200 && r.json.objekt.status === "pruefung", "Projekt zur Prüfung eingereicht", r.json);
  r = await anbieter.patch(`/api/portal/projekte/${projekt.id}`, { ...vollstaendig, mwp: 99 });
  pruefe(r.status === 409, "Bearbeiten in Prüfung → 409", r.status);
  r = await anbieter.post("/api/admin/status", { art: "projekt", id: projekt.id, nach: "veroeffentlicht", extra: { provisionSatz: 2 } });
  pruefe(r.status === 403, "Anbieter kann nicht selbst veröffentlichen → 403", r.status);
  r = await admin.post("/api/admin/status", { art: "projekt", id: projekt.id, nach: "veroeffentlicht" });
  pruefe(r.status === 422, "Veröffentlichen ohne Provisionssatz → 422", r.json);
  r = await admin.post("/api/admin/status", { art: "projekt", id: projekt.id, nach: "veroeffentlicht", extra: { provisionSatz: 5 } });
  pruefe(r.status === 422, "Provisionssatz außerhalb 1,5–3 % → 422", r.json);
  r = await admin.post("/api/admin/status", { art: "projekt", id: projekt.id, nach: "veroeffentlicht", extra: { provisionSatz: 2, kommentar: "Geprüft." } });
  pruefe(r.status === 200, "Admin veröffentlicht (2 %)", r.json);

  // ------------------------------------------------------------ 9. Öffentliche Börse
  abschnitt("9. Öffentliche Börse ohne vertrauliche Angaben");
  r = await gast.get("/api/boerse");
  const teaser = r.json.projekte?.find((p) => p.id === projekt.id);
  pruefe(!!teaser, "Projekt in öffentlicher Liste", r.json.projekte?.length);
  pruefe(!JSON.stringify(r.json).includes(`Geheimgemeinde-${LAUF}`) && teaser && !("vertraulich" in teaser) && !("anbieterId" in teaser), "Liste enthält keine vertraulichen Felder/Anbieterdaten");
  r = await gast.get(`/api/boerse/${teaser?.slug}`);
  pruefe(r.status === 200 && r.json.zugriff === "oeffentlich" && r.json.vertraulich === null && !JSON.stringify(r.json).includes("Geheimgemeinde"), "Exposé öffentlich nur als Teaser", r.json.zugriff);
  r = await gast.get("/api/boerse?land=AT");
  pruefe(r.json.projekte?.every((p) => p.land === "AT"), "Filter Land wirkt", r.json.projekte?.map((p) => p.land));

  // ------------------------------------------------------------ 10. NDA
  abschnitt("10. Investor: merken, NDA, Datenraum");
  await investor.login("investor@example.com");
  r = await investor.post(`/api/portal/boerse/${projekt.id}/merken`, { an: true });
  pruefe(r.status === 200 && r.json.interesse.gemerkt, "Projekt gemerkt", r.json);
  r = await investor.post(`/api/portal/boerse/${projekt.id}/nda`, { akzeptiert: false });
  pruefe(r.status === 422, "NDA ohne Zustimmung → 422", r.json);
  r = await investor.post(`/api/portal/boerse/${projekt.id}/nda`, { akzeptiert: true });
  pruefe(r.status === 200 && r.json.interesse.status === "nda_angefragt" && r.json.interesse.nda?.am, "Klick-NDA protokolliert, Status NDA angefragt", r.json);
  const interesseId = r.json.interesse.id;
  r = await investor.get(`/api/boerse/${projekt.id}`);
  pruefe(r.json.zugriff === "oeffentlich" && r.json.vertraulich === null, "vor Freigabe weiterhin gesperrt", r.json.zugriff);
  r = await eigentuemer.post(`/api/portal/boerse/${projekt.id}/nda`, { akzeptiert: true });
  pruefe(r.status === 403, "Nicht-Investor → NDA 403", r.status);
  r = await investor.post("/api/portal/status", { art: "interesse", id: interesseId, nach: "nda_freigegeben" });
  pruefe(r.status === 403, "Investor kann NDA nicht selbst freigeben → 403", r.status);
  r = await admin.get("/api/admin/interessen?status=nda_angefragt");
  pruefe(r.json.interessen?.some((i) => i.id === interesseId && i.investor?.email === "investor@example.com"), "NDA-Anfrage in Admin-Liste", r.json.interessen?.length);
  r = await admin.post("/api/admin/status", { art: "interesse", id: interesseId, nach: "nda_freigegeben" });
  pruefe(r.status === 200, "Admin gibt Datenraum frei", r.json);

  // Datenraum-Upload durch Anbieter
  const fd = new FormData();
  fd.append("datei", pdf(`Testexpose ${LAUF}`), "Test-Exposé.pdf");
  fd.append("bezugArt", "projekt");
  fd.append("bezugId", projekt.id);
  fd.append("kategorie", "datenraum");
  r = await anbieter.anfrage("POST", "/api/portal/dokumente", fd);
  pruefe(r.status === 403, "Upload ohne X-Plattform-Upload → 403", r.status);
  const fd2 = new FormData();
  fd2.append("datei", pdf(`Testexpose ${LAUF}`), "Test-Exposé.pdf");
  fd2.append("bezugArt", "projekt");
  fd2.append("bezugId", projekt.id);
  fd2.append("kategorie", "datenraum");
  r = await anbieter.anfrage("POST", "/api/portal/dokumente", fd2, { kopf: { "X-Plattform-Upload": "1" } });
  pruefe(r.status === 200 && r.json.dokument?.id, "Anbieter lädt Datenraum-PDF hoch", r.json);
  const dokId = r.json.dokument?.id;
  const fd3 = new FormData();
  fd3.append("datei", new Blob(["<html>kein pdf</html>"], { type: "application/pdf" }), "falsch.pdf");
  fd3.append("bezugArt", "projekt");
  fd3.append("bezugId", projekt.id);
  r = await anbieter.anfrage("POST", "/api/portal/dokumente", fd3, { kopf: { "X-Plattform-Upload": "1" } });
  pruefe(r.status === 415, "falscher Dateiinhalt (Magic Bytes) → 415", r.status);
  const fd4 = new FormData();
  fd4.append("datei", pdf("x"), "fremd.pdf");
  fd4.append("bezugArt", "projekt");
  fd4.append("bezugId", projekt.id);
  r = await investor.anfrage("POST", "/api/portal/dokumente", fd4, { kopf: { "X-Plattform-Upload": "1" } });
  pruefe(r.status === 403, "Investor darf nicht in fremdes Projekt hochladen → 403", r.status);

  r = await investor.get(`/api/boerse/${projekt.id}`);
  pruefe(r.json.zugriff === "nda" && r.json.vertraulich?.gemeinde === `Geheimgemeinde-${LAUF}` && r.json.dokumente?.some((d) => d.id === dokId), "nach Freigabe: vertrauliche Angaben + Datenraum", r.json.zugriff);
  const download = await investor.anfrage("GET", `/api/portal/dokumente/${dokId}`, undefined, { roh: true });
  const bytes = new Uint8Array(await download.arrayBuffer());
  pruefe(download.status === 200 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-", "Download für berechtigten Investor", download.status);

  await fremd.post("/api/auth/registrieren", { email: `fremd-${LAUF}@example.com`, passwort: "Fremd-Passwort-1", vorname: "Fremder", nachname: "Investor", rollen: ["investor"], agb: true });
  r = await fremd.get(`/api/portal/dokumente/${dokId}`);
  pruefe(r.status === 403, "Download ohne NDA → 403", r.status);
  r = await fremd.get(`/api/boerse/${projekt.id}`);
  pruefe(r.json.vertraulich === null, "anderer Investor sieht keine vertraulichen Angaben", r.json.zugriff);
  r = await gast.get(`/api/portal/dokumente/${dokId}`);
  pruefe(r.status === 401, "Download als Gast → 401", r.status);

  // ------------------------------------------------------------ 11. LOI & Verkauf
  abschnitt("11. LOI, Reservierung, Verkauf, Provision");
  r = await investor.post("/api/portal/status", { art: "interesse", id: interesseId, nach: "loi_abgegeben", extra: { loi: { betrag: 600000, text: "Indikatives Angebot aus dem Test." } } });
  pruefe(r.status === 200 && r.json.objekt.status === "loi_abgegeben", "LOI abgegeben", r.json);
  r = await admin.post("/api/admin/status", { art: "interesse", id: interesseId, nach: "loi_angenommen" });
  pruefe(r.status === 200, "LOI angenommen", r.json);
  r = await anbieter.get(`/api/portal/projekte/${projekt.id}`);
  pruefe(r.json.projekt?.status === "reserviert" && r.json.projekt?.statistik?.ndaAnfragen >= 1, "Projekt automatisch reserviert, Statistik zählt NDA", r.json.projekt?.statistik);
  r = await admin.post("/api/admin/status", { art: "projekt", id: projekt.id, nach: "verkauft", extra: { interesseId, kaufpreis: 675000 } });
  pruefe(r.status === 200 && r.json.objekt.status === "verkauft", "Verkauf abgeschlossen", r.json);
  r = await admin.get("/api/admin/provisionen");
  const pv = r.json.provisionen?.find((x) => x.projektId === projekt.id);
  pruefe(pv && pv.betrag === 13500 && pv.status === "offen", "Provision automatisch berechnet (675.000 € × 2 % = 13.500 €)", pv);
  r = await investor.get("/api/portal/interessen");
  pruefe(r.json.interessen?.find((i) => i.id === interesseId)?.status === "abgeschlossen", "Interesse des Käufers abgeschlossen", r.json.interessen?.length);
  r = await admin.post("/api/admin/status", { art: "provision", id: pv?.id, nach: "in_rechnung" });
  pruefe(r.status === 200, "Provision → in Rechnung", r.json);
  r = await gast.get(`/api/boerse/${projekt.id}`);
  pruefe(r.status === 404, "verkauftes Projekt nicht mehr öffentlich", r.status);

  // ------------------------------------------------------------ 12. Passwort vergessen
  abschnitt("12. Passwort vergessen / E-Mail bestätigen");
  const sitzungVorher = eigentuemer.cookie;
  r = await gast.post("/api/auth/passwort-vergessen", { email });
  pruefe(r.status === 200 && r.json.ok, "Passwort-vergessen antwortet immer ok", r.json);
  r = await gast.post("/api/auth/passwort-vergessen", { email: `gibtesnicht-${LAUF}@example.com` });
  pruefe(r.status === 200 && r.json.ok, "auch für unbekannte Adresse ok (keine Enumeration)", r.json);
  r = await admin.get("/api/admin/demo-links");
  const reset = r.json.links?.find((l) => l.email === email && l.art === "reset");
  const bestaetigen = r.json.links?.find((l) => l.email === email && l.art === "email");
  pruefe(!!reset && !!bestaetigen, "Demo: Links im Admin sichtbar", r.json.links?.length);
  const token = reset ? new URL(reset.link).searchParams.get("token") : "";
  r = await gast.post("/api/auth/passwort-setzen", { token, passwort: "Neues-Passwort-2026" });
  pruefe(r.status === 200, "Neues Passwort gesetzt", r.json);
  r = await gast.post("/api/auth/passwort-setzen", { token, passwort: "Noch-ein-Passwort-1" });
  pruefe(r.status === 422, "Token nur einmal verwendbar → 422", r.status);
  eigentuemer.cookie = sitzungVorher;
  r = await eigentuemer.get("/api/portal/vorgaenge");
  pruefe(r.status === 401, "alte Sitzung nach Passwortwechsel ungültig → 401", r.status);
  await eigentuemer.login(email, "Neues-Passwort-2026");
  const bestaetigung = await gast.anfrage("GET", new URL(bestaetigen.link).pathname + new URL(bestaetigen.link).search, undefined, { roh: true, origin: null });
  pruefe([302, 303, 307].includes(bestaetigung.status), "Bestätigungslink leitet weiter", bestaetigung.status);

  // ------------------------------------------------------------ 13. Admin-Sperre
  abschnitt("13. Admin sperrt Konto");
  const fremdNutzer = (await fremd.get("/api/auth/ich")).json.nutzer;
  r = await admin.patch(`/api/admin/nutzer/${fremdNutzer.id}`, { aktiv: false });
  pruefe(r.status === 200 && r.json.nutzer.aktiv === false, "Konto gesperrt", r.json);
  r = await fremd.get("/api/portal/interessen");
  pruefe(r.status === 401, "gesperrtes Konto sofort abgemeldet → 401", r.status);
  r = await admin.patch(`/api/admin/nutzer/${adminKonto.id}`, { rollen: ["flaeche"] });
  pruefe(r.status === 409, "eigene Admin-Rolle nicht entfernbar → 409", r.status);

  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen bestanden")} (${ok} ok)`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.message}`));
  process.exit(1);
});
