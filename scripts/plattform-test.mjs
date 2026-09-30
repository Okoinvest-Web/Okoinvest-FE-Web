// scripts/plattform-test.mjs
//
// End-to-End-Test der Plattform-Kernprozesse gegen den laufenden Dev-Server
// (Demo-Backend). Ohne Test-Framework:  node scripts/plattform-test.mjs [basis-url]
//
// Spielt durch: Anfrage → Registrierung (verknüpft) → Login → Fläche anlegen/einreichen →
// Admin-Statuswechsel → Nutzer sieht Status + Nachricht → Pachtangebot annehmen →
// Projekt anlegen/Provision/einreichen → Admin veröffentlicht → öffentliche Börse ohne
// vertrauliche Felder → NDA anfragen/freigeben → Datenraum-Upload/Download → LOI →
// Verkauf mit automatischer Provision → Exposé-PDF/Teaser → Suchprofil-Alarm → Checklisten/Datenraum-Qualität →
// Benachrichtigungen/E-Mail-Einstellungen → Postausgang → Aufgaben/Wiedervorlagen → Aktivitäts-Feed → CSV-Export →
// neue Portalseiten → Passwort vergessen/setzen → Rechteverletzungen (401/403).

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
    // Dev-Server kann beim Kompilieren Verbindungen abbrechen: Netzwerkfehler bis zu 3-mal wiederholen
    let res;
    for (let versuch = 1; ; versuch++) {
      try {
        res = await fetch(BASIS + pfad, { method: methode, headers, body: payload, redirect: "manual" });
        // Fehlerseite des Dev-Servers (Neukompilierung) statt API-Antwort → wiederholen
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
  r = await eigentuemer.get("/api/portal/benachrichtigungen");
  pruefe(r.status === 200 && r.json.eintraege?.some((b) => b.art === "status" && b.objektId === vorgangId && !b.gelesen) && r.json.ungelesen >= 1, "Glocke: ungelesene Benachrichtigung zum Statuswechsel", r.json);
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

  // ------------------------------------------------------------ 11a. Exposé-PDF
  abschnitt("11a. Exposé als PDF (vertraulich nur mit NDA) und öffentlicher Teaser");
  const pdfText = async (res) => Buffer.from(await res.arrayBuffer()).toString("latin1");
  let roh = await investor.anfrage("GET", `/api/portal/projekte/${projekt.id}/expose`, undefined, { roh: true });
  let inhalt = await pdfText(roh);
  pruefe(roh.status === 200 && inhalt.startsWith("%PDF-") && /attachment/.test(roh.headers.get("content-disposition") || ""), "Investor mit Datenraum erhält Exposé-PDF (Download)", roh.status);
  pruefe(inhalt.includes(`Geheimgemeinde-${LAUF}`) && inhalt.includes("investor@example.com") && inhalt.includes("VERTRAULICH"), "Exposé enthält vertrauliche Angaben und den Empfänger (Vertraulichkeitshinweis)");
  pruefe(/\/Type \/Pages \/Kids \[/.test(inhalt) && /%%EOF\s*$/.test(inhalt), "PDF mit gültigem Seitenbaum und Abschluss");
  r = await fremd.get(`/api/portal/projekte/${projekt.id}/expose`);
  pruefe(r.status === 403 || r.status === 404, "Investor ohne NDA → kein Exposé (403/404)", r.status);
  r = await gast.get(`/api/portal/projekte/${projekt.id}/expose`);
  pruefe(r.status === 401, "Exposé als Gast → 401", r.status);
  r = await eigentuemer.get(`/api/portal/projekte/${projekt.id}/expose`);
  pruefe(r.status === 403 || r.status === 404, "Flächeneigentümer → kein Exposé fremder Projekte", r.status);
  roh = await anbieter.anfrage("GET", `/api/portal/projekte/${projekt.id}/expose`, undefined, { roh: true });
  pruefe(roh.status === 200 && (await pdfText(roh)).startsWith("%PDF-"), "Anbieter erhält Exposé des eigenen Projekts", roh.status);
  r = await admin.get(`/api/admin/aktivitaeten?objekt=${projekt.id}&limit=200`);
  pruefe(r.json.aktivitaeten?.filter((a) => a.aktion === "expose").length >= 2, "Exposé-Downloads werden protokolliert", r.json.aktivitaeten?.map((a) => a.aktion));

  // ------------------------------------------------------------ 11b. Suchprofil-Alarm, Checkliste, Teaser
  abschnitt("11b. Suchprofil-Alarm, Dokumenten-Checkliste, Datenraum-Qualität, Teaser-PDF");
  const alarm = new Client("alarm-investor");
  r = await alarm.post("/api/auth/registrieren", { email: `alarm-${LAUF}@example.com`, passwort: "Alarm-Passwort-1", vorname: "Alarm", nachname: "Investor", rollen: ["investor"], agb: true });
  pruefe(r.status === 201, "zweiter Investor registriert", r.status);
  r = await alarm.put("/api/portal/suchprofil", { typen: ["speicher"], phasen: ["cod"], laender: ["CH"], benachrichtigen: true, schwelle: 100 });
  pruefe(r.status === 200 && r.json.suchprofil?.schwelle === 100, "Suchprofil mit Schwelle 100 gespeichert", r.json);
  r = await alarm.put("/api/portal/suchprofil", { benachrichtigen: true, schwelle: 20 });
  pruefe(r.status === 200 && r.json.suchprofil?.schwelle === 70, "Schwelle außerhalb 50–100 → Standard 70", r.json.suchprofil);
  await alarm.put("/api/portal/suchprofil", { typen: ["speicher"], phasen: ["cod"], laender: ["CH"], benachrichtigen: true, schwelle: 100 });
  const investorVorher = (await investor.get("/api/portal/benachrichtigungen?limit=200")).json;
  r = await anbieter.post("/api/portal/projekte", { ...vollstaendig, titel: `Zweites Testprojekt 12 MWp ${LAUF}`, mwp: 12, vertraulich: { gemeinde: `Geheimdorf-${LAUF}` } });
  const projekt2 = r.json.projekt;
  pruefe(r.status === 200 && projekt2?.checkliste?.punkte?.length > 0, "Projekt liefert Dokumenten-Checkliste je Phase", projekt2?.checkliste);
  pruefe(projekt2?.checkliste?.punkte?.some((p) => p.id === "baugenehmigung" && p.erwartet) && projekt2?.checkliste?.punkte?.some((p) => p.id === "betrieb" && !p.erwartet), "Phase „Baureif“: Baugenehmigung erwartet, Betriebsdaten später", projekt2?.checkliste?.punkte?.map((p) => [p.id, p.erwartet]));
  const quoteVorher = projekt2?.checkliste?.quote;
  const fdc = new FormData();
  fdc.append("datei", pdf(`Pacht ${LAUF}`), "Pachtvertrag.pdf");
  fdc.append("bezugArt", "projekt");
  fdc.append("bezugId", projekt2.id);
  fdc.append("kategorie", "datenraum");
  fdc.append("checkliste", "pacht");
  r = await anbieter.anfrage("POST", "/api/portal/dokumente", fdc, { kopf: { "X-Plattform-Upload": "1" } });
  pruefe(r.status === 200 && r.json.dokument?.checkliste === "pacht", "Upload direkt am Checklisten-Punkt", r.json);
  const fdx = new FormData();
  fdx.append("datei", pdf("x"), "egal.pdf");
  fdx.append("bezugArt", "projekt");
  fdx.append("bezugId", projekt2.id);
  fdx.append("checkliste", "gibtsnicht");
  r = await anbieter.anfrage("POST", "/api/portal/dokumente", fdx, { kopf: { "X-Plattform-Upload": "1" } });
  pruefe(r.status === 200 && r.json.dokument?.checkliste === "", "unbekannter Checklisten-Schlüssel wird verworfen", r.json.dokument);
  r = await anbieter.get(`/api/portal/projekte/${projekt2.id}`);
  const punktPacht = r.json.projekt?.checkliste?.punkte?.find((p) => p.id === "pacht");
  pruefe(punktPacht?.vorhanden && r.json.projekt.checkliste.quote > quoteVorher, "Punkt „Pachtverträge“ erfüllt, Vollständigkeit steigt", [quoteVorher, r.json.projekt?.checkliste?.quote]);
  const quote2 = r.json.projekt?.checkliste?.quote;
  await anbieter.post(`/api/portal/projekte/${projekt2.id}/provision`, { akzeptiert: true });
  await anbieter.post("/api/portal/status", { art: "projekt", id: projekt2.id, nach: "pruefung" });
  r = await admin.post("/api/admin/status", { art: "projekt", id: projekt2.id, nach: "veroeffentlicht", extra: { provisionSatz: 2.5 } });
  pruefe(r.status === 200, "zweites Projekt veröffentlicht", r.json);
  r = await investor.get("/api/portal/benachrichtigungen?limit=200");
  const treffer = r.json.eintraege?.find((b) => b.art === "suchprofil" && b.objektId === projekt2.id);
  pruefe(!!treffer && !treffer.gelesen && r.json.ungelesen > investorVorher.ungelesen, "Suchprofil-Alarm: passender Investor erhält Benachrichtigung", r.json.eintraege?.slice(0, 3));
  pruefe(treffer && /\d+ % Passung/.test(treffer.text) && treffer.link === `/portal/boerse/${projekt2.id}`, "Benachrichtigung mit Passung und Link zum Exposé", treffer);
  r = await alarm.get("/api/portal/benachrichtigungen");
  pruefe(!r.json.eintraege?.some((b) => b.art === "suchprofil" && b.objektId === projekt2.id), "Investor unter seiner Schwelle erhält keinen Alarm", r.json.eintraege?.map((b) => b.art));
  r = await admin.get("/api/admin/postausgang?limit=500");
  const alarmMail = r.json.mails?.find((m) => m.art === "suchprofil" && m.an === "investor@example.com" && m.link === `/portal/boerse/${projekt2.id}`);
  pruefe(!!alarmMail && !JSON.stringify(alarmMail).includes(`Geheimdorf-${LAUF}`), "Suchprofil-Treffer als E-Mail im Postausgang – ohne vertrauliche Angaben", alarmMail);
  r = await gast.get("/api/boerse");
  const karte2 = r.json.projekte?.find((p) => p.id === projekt2.id);
  pruefe(karte2 && karte2.datenraumQualitaet === quote2 && !("checkliste" in karte2), "Börsenkarte zeigt Datenraum-Qualität (nur Kennzahl)", karte2?.datenraumQualitaet);
  roh = await gast.anfrage("GET", `/api/boerse/${karte2?.slug}/teaser`, undefined, { roh: true, origin: null });
  inhalt = await pdfText(roh);
  pruefe(roh.status === 200 && inhalt.startsWith("%PDF-") && !inhalt.includes(`Geheimdorf-${LAUF}`) && inhalt.includes("TEASER"), "öffentlicher Teaser-PDF ohne vertrauliche Angaben", roh.status);
  r = await gast.get(`/api/boerse/${projekt.slug}/teaser`);
  pruefe(r.status === 404, "Teaser verkaufter Projekte nicht öffentlich → 404", r.status);
  r = await eigentuemer.get(`/api/portal/flaechen/${flaecheId}`);
  pruefe(r.json.flaeche?.checkliste?.punkte?.some((p) => p.id === "grundbuch" && p.erwartet && !p.vorhanden), "Fläche: Checkliste mit Grundbuchauszug (fehlt)", r.json.flaeche?.checkliste);
  const fdf = new FormData();
  fdf.append("datei", pdf("Grundbuch"), "Grundbuch.pdf");
  fdf.append("bezugArt", "flaeche");
  fdf.append("bezugId", flaecheId);
  fdf.append("checkliste", "grundbuch");
  await eigentuemer.anfrage("POST", "/api/portal/dokumente", fdf, { kopf: { "X-Plattform-Upload": "1" } });
  r = await eigentuemer.get(`/api/portal/flaechen/${flaecheId}`);
  pruefe(r.json.flaeche?.checkliste?.punkte?.find((p) => p.id === "grundbuch")?.vorhanden, "Grundbuchauszug hochgeladen → Punkt erfüllt", r.json.flaeche?.checkliste?.quote);

  // ------------------------------------------------------------ 11c. Benachrichtigungen
  abschnitt("11c. Benachrichtigungszentrale und E-Mail-Einstellungen");
  r = await gast.get("/api/portal/benachrichtigungen");
  pruefe(r.status === 401, "Benachrichtigungen als Gast → 401", r.status);
  r = await eigentuemer.get("/api/portal/benachrichtigungen?limit=200");
  const eigeneHinweise = r.json.eintraege || [];
  pruefe(eigeneHinweise.some((b) => b.art === "status" && b.objektId === vorgangId) && eigeneHinweise.some((b) => b.art === "status" && b.objektId === flaecheId), "Statuswechsel an Vorgang und Fläche erzeugen Benachrichtigungen", eigeneHinweise.map((b) => [b.art, b.objektId]).slice(0, 8));
  pruefe(eigeneHinweise.filter((b) => b.objektId === vorgangId).every((b) => b.gelesen), "Lesen des Threads markiert zugehörige Benachrichtigungen als gelesen");
  pruefe(eigeneHinweise.every((b) => b.nutzerId === eigeneHinweise[0].nutzerId && b.link.startsWith("/portal")), "nur eigene Benachrichtigungen, nur interne Links");
  const offenerHinweis = eigeneHinweise.find((b) => !b.gelesen);
  r = await eigentuemer.post("/api/portal/benachrichtigungen", {});
  pruefe(r.status === 422, "als gelesen markieren ohne Auswahl → 422", r.status);
  r = await eigentuemer.post("/api/portal/benachrichtigungen", { ids: [offenerHinweis?.id] }, { origin: null });
  pruefe(r.status === 403, "Markieren ohne Origin → 403 (CSRF)", r.status);
  const investorHinweis = (await investor.get("/api/portal/benachrichtigungen")).json.eintraege?.find((b) => !b.gelesen);
  r = await eigentuemer.post("/api/portal/benachrichtigungen", { ids: [investorHinweis?.id] });
  pruefe(r.status === 200 && r.json.geaendert === 0, "fremde Benachrichtigung kann nicht markiert werden", r.json);
  r = await investor.get("/api/portal/benachrichtigungen");
  pruefe(r.json.eintraege?.find((b) => b.id === investorHinweis?.id)?.gelesen === false, "fremde Benachrichtigung bleibt ungelesen");
  if (offenerHinweis) {
    r = await eigentuemer.post("/api/portal/benachrichtigungen", { ids: [offenerHinweis.id] });
    pruefe(r.status === 200 && r.json.geaendert === 1, "eigene Benachrichtigung als gelesen markiert", r.json);
  }
  r = await eigentuemer.post("/api/portal/benachrichtigungen", { alle: true });
  pruefe(r.status === 200 && r.json.ungelesen === 0, "„Alle als gelesen“ setzt Zähler auf 0", r.json);
  r = await admin.get("/api/portal/benachrichtigungen?limit=200");
  pruefe(r.json.eintraege?.some((b) => b.art === "anfrage" && b.objektId === vorgangId), "Backoffice erhält Benachrichtigung zu neuen Anfragen", r.json.eintraege?.length);
  r = await eigentuemer.put("/api/portal/benachrichtigungen", { einstellungen: { status: false, nachricht: true, unbekannt: true } });
  pruefe(r.status === 200 && r.json.einstellungen.status === false && r.json.einstellungen.nachricht === true && !("unbekannt" in r.json.einstellungen), "E-Mail-Einstellungen je Ereignisart speichern (Positivliste)", r.json);
  const mailsVorher = (await admin.get("/api/admin/postausgang?limit=500")).json.mails.filter((m) => m.an === email).length;
  r = await admin.post("/api/admin/status", { art: "flaeche", id: flaecheId, nach: "planung", extra: { kommentar: "Planung startet." } });
  pruefe(r.status === 200, "weiterer Statuswechsel an der Fläche", r.json);
  r = await eigentuemer.get("/api/portal/benachrichtigungen");
  const planung = r.json.eintraege?.find((b) => b.objektId === flaecheId && /Planung/.test(b.text));
  pruefe(planung && !planung.gelesen && planung.mail === false, "Benachrichtigung im Portal, aber keine E-Mail (Einstellung aus)", planung);
  const mailsNachher = (await admin.get("/api/admin/postausgang?limit=500")).json.mails.filter((m) => m.an === email).length;
  pruefe(mailsNachher === mailsVorher, "Postausgang: keine Statusmail bei abgeschalteter Einstellung", [mailsVorher, mailsNachher]);
  await admin.post("/api/portal/nachrichten", { bezugArt: "flaeche", bezugId: flaecheId, text: `Rückfrage zur Planung (${LAUF}).` });
  r = await admin.get("/api/admin/postausgang?limit=500");
  const nachrichtMail = r.json.mails?.find((m) => m.an === email && m.art === "nachricht");
  pruefe(!!nachrichtMail && !JSON.stringify(nachrichtMail).includes(`Rückfrage zur Planung (${LAUF})`), "Nachricht des Backoffice → E-Mail-Hinweis ohne Inhalt", nachrichtMail);

  // ------------------------------------------------------------ 11d. Postausgang
  abschnitt("11d. E-Mail-Postausgang (Demo)");
  r = await admin.get("/api/admin/postausgang?limit=500");
  pruefe(r.status === 200 && r.json.mails?.some((m) => m.an === email && m.art === "bestaetigung" && /email-bestaetigen\?token=/.test(m.link)), "Bestätigungsmail der Registrierung im Postausgang", r.json.mails?.length);
  pruefe(r.json.mails?.every((m) => m.betreff && m.an && m.am), "jede Mail mit Empfänger, Betreff, Zeitpunkt");
  r = await investor.get("/api/admin/postausgang");
  pruefe(r.status === 403, "Postausgang nur für das Backoffice → 403", r.status);

  // ------------------------------------------------------------ 11e. Aufgaben
  abschnitt("11e. Backoffice-Aufgaben und Wiedervorlagen");
  const gestern = new Date(Date.now() - 86400e3).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
  const morgen = new Date(Date.now() + 86400e3).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
  r = await admin.post("/api/admin/aufgaben", { titel: `Rückruf Eigentümer ${LAUF}`, faelligAm: gestern, bezugArt: "vorgang", bezugId: vorgangId });
  pruefe(r.status === 200 && r.json.aufgabe?.ueberfaellig === true && r.json.aufgabe?.bezugLink === `/portal/admin/vorgaenge/${vorgangId}`, "Aufgabe am Vorgang angelegt (überfällig)", r.json);
  const aufgabeId = r.json.aufgabe?.id;
  r = await admin.post("/api/admin/aufgaben", { titel: "Ohne Datum", faelligAm: "2026-02-31" });
  pruefe(r.status === 422, "ungültiges Fälligkeitsdatum → 422", r.status);
  r = await admin.post("/api/admin/aufgaben", { titel: "Fremder Bezug", faelligAm: morgen, bezugArt: "projekt", bezugId: "P-26-ZZZZZZ" });
  pruefe(r.status === 404, "unbekannter Bezug → 404", r.status);
  r = await admin.post("/api/admin/aufgaben", { titel: "Falscher Zuständiger", faelligAm: morgen, zustaendigId: (await investor.get("/api/auth/ich")).json.nutzer.id });
  pruefe(r.status === 422, "Zuständig nur Backoffice-Konten → 422", r.status);
  r = await eigentuemer.post("/api/admin/aufgaben", { titel: "Nicht erlaubt", faelligAm: morgen });
  pruefe(r.status === 403, "Aufgaben nur für das Backoffice → 403", r.status);
  r = await admin.get("/api/admin/aufgaben?ansicht=meine");
  pruefe(r.json.aufgaben?.some((a) => a.id === aufgabeId), "„Meine Aufgaben“ enthält die Aufgabe", r.json.aufgaben?.length);
  r = await admin.get(`/api/admin/aufgaben?bezug=vorgang:${vorgangId}`);
  pruefe(r.json.aufgaben?.length === 1 && r.json.aufgaben[0].id === aufgabeId, "Aufgaben je Objekt", r.json.aufgaben?.length);
  r = await admin.get("/api/admin/uebersicht");
  pruefe(r.json.uebersicht?.aufgaben?.meineUeberfaellig >= 1, "Cockpit meldet überfällige Wiedervorlagen", r.json.uebersicht?.aufgaben);
  r = await admin.get("/api/portal/benachrichtigungen?limit=200");
  pruefe(r.json.eintraege?.some((b) => b.art === "aufgabe" && /Wiedervorlage fällig/.test(b.titel) && b.objektId === vorgangId), "fällige Wiedervorlage erscheint in der Glocke", r.json.eintraege?.slice(0, 3));
  const kollege = new Client("zweiter admin");
  r = await kollege.post("/api/auth/registrieren", { email: `kollege-${LAUF}@example.com`, passwort: "Kollege-Passwort-1", vorname: "Kolle", nachname: "Ge", rollen: ["flaeche"], agb: true });
  const kollegeId = r.json.nutzer?.id;
  r = await admin.patch(`/api/admin/nutzer/${kollegeId}`, { rollen: ["admin"] });
  pruefe(r.status === 200, "zweites Backoffice-Konto", r.status);
  r = await admin.patch(`/api/admin/aufgaben/${aufgabeId}`, { zustaendigId: kollegeId, faelligAm: morgen });
  pruefe(r.status === 200 && r.json.aufgabe?.zustaendigId === kollegeId && r.json.aufgabe?.ueberfaellig === false, "Aufgabe neu zugewiesen und verschoben", r.json);
  r = await kollege.get("/api/portal/benachrichtigungen");
  pruefe(r.json.eintraege?.some((b) => b.art === "aufgabe" && b.titel.includes(`Rückruf Eigentümer ${LAUF}`)), "neuer Zuständiger wird benachrichtigt", r.json.eintraege?.map((b) => b.titel));
  r = await kollege.patch(`/api/admin/aufgaben/${aufgabeId}`, { status: "erledigt" });
  pruefe(r.status === 200 && r.json.aufgabe?.status === "erledigt" && r.json.aufgabe?.erledigtAm, "Aufgabe erledigt", r.json.aufgabe?.status);
  r = await kollege.get("/api/admin/aufgaben?ansicht=meine");
  pruefe(!r.json.aufgaben?.some((a) => a.id === aufgabeId), "erledigte Aufgabe nicht mehr unter „Meine“", r.json.aufgaben?.length);
  r = await kollege.patch(`/api/admin/aufgaben/${aufgabeId}`, { status: "unklar" });
  pruefe(r.status === 422, "unbekannter Aufgabenstatus → 422", r.status);

  // ------------------------------------------------------------ 11f. Aktivitäts-Feed & CSV
  abschnitt("11f. Aktivitäts-Feed je Objekt und CSV-Export");
  r = await admin.get(`/api/admin/aktivitaeten?objekt=${vorgangId}`);
  pruefe(r.json.aktivitaeten?.some((a) => a.aktion === "aufgabe") && r.json.aktivitaeten?.some((a) => a.aktion === "status"), "Feed des Vorgangs: Status und Aufgaben", r.json.aktivitaeten?.map((a) => a.aktion));
  r = await admin.get(`/api/admin/aktivitaeten?objekt=${flaecheAusAnfrage}`);
  pruefe(r.json.aktivitaeten?.some((a) => a.aktion === "aendern" && /Fläche bearbeitet: .*Ort/.test(a.text)), "Feed nennt geänderte Felder („wer hat was geändert“)", r.json.aktivitaeten?.map((a) => a.text));
  r = await admin.get(`/api/admin/aktivitaeten?objekte=${projekt.id},${interesseId}`);
  pruefe(r.json.aktivitaeten?.some((a) => a.objektId === interesseId) && r.json.aktivitaeten?.some((a) => a.objektId === projekt.id), "Feed über mehrere Objekte (Projekt + Interessen)", r.json.aktivitaeten?.length);
  r = await gast.post("/api/anfrage", { typ: "kontakt", kontakt: { vorname: "=HYPERLINK(\"http://boese.example\")", nachname: `Formel ${LAUF}`, email: `formel-${LAUF}@example.com` }, daten: {}, einwilligung: true });
  pruefe(r.status === 200, "Anfrage mit Formel im Namen angenommen (wird beim Export entschärft)", r.json);
  roh = await admin.anfrage("GET", "/api/admin/export/vorgaenge", undefined, { roh: true });
  // fetch().text() entfernt ein BOM – daher Bytes lesen und ohne BOM-Entfernung dekodieren
  const csvLesen = async (res) => new TextDecoder("utf-8", { ignoreBOM: true }).decode(await res.arrayBuffer());
  const csvText = await csvLesen(roh);
  pruefe(roh.status === 200 && /text\/csv/.test(roh.headers.get("content-type") || "") && /attachment; filename="oekoinvest-vorgaenge-/.test(roh.headers.get("content-disposition") || ""), "CSV-Export Vorgänge als Download", roh.status);
  pruefe(csvText.charCodeAt(0) === 0xfeff && csvText.split("\r\n")[0].includes(";") && csvText.includes(vorgangId), "UTF-8-BOM, Semikolon, CRLF, Daten enthalten", csvText.slice(0, 80));
  pruefe(csvText.includes(`"'=HYPERLINK(""http://boese.example"")"`) && !/;=HYPERLINK/.test(csvText), "Formel-Injektion wird entschärft", csvText.split("\r\n").find((z) => z.includes(`Formel ${LAUF}`)));
  for (const art of ["flaechen", "projekte", "interessen", "provisionen"]) {
    roh = await admin.anfrage("GET", `/api/admin/export/${art}`, undefined, { roh: true });
    const t = await csvLesen(roh);
    pruefe(roh.status === 200 && t.charCodeAt(0) === 0xfeff && t.split("\r\n").length > 2, `CSV-Export ${art}`, roh.status);
  }
  r = await admin.get("/api/admin/export/nutzer");
  pruefe(r.status === 404, "unbekannter Export → 404", r.status);
  r = await investor.get("/api/admin/export/projekte");
  pruefe(r.status === 403, "CSV-Export nur für das Backoffice → 403", r.status);
  r = await admin.get("/api/admin/aktivitaeten?limit=50");
  pruefe(r.json.aktivitaeten?.some((a) => a.aktion === "export" && a.objektId === "vorgaenge"), "Export wird protokolliert", r.json.aktivitaeten?.slice(0, 5).map((a) => a.aktion));

  // ------------------------------------------------------------ 11g. Neue Portalseiten
  abschnitt("11g. Neue Portalseiten und Rechte");
  const seite = async (c, pfad) => (await c.anfrage("GET", pfad, undefined, { roh: true, origin: null })).status;
  // Seiten mit loading.js streamen: notFound() liefert dann 200 mit der Nicht-gefunden-Ansicht statt 404
  const verborgen = async (c, pfad) => {
    const res = await c.anfrage("GET", pfad, undefined, { roh: true, origin: null });
    const html = await res.text();
    return res.status === 404 || (res.status === 200 && html.includes("Diesen Eintrag gibt es nicht"));
  };
  pruefe((await seite(investor, "/portal/benachrichtigungen")) === 200, "/portal/benachrichtigungen (Investor) 200");
  pruefe((await seite(investor, "/portal/boerse/vergleich")) === 200, "/portal/boerse/vergleich (Investor) 200");
  pruefe(await verborgen(eigentuemer, "/portal/boerse/vergleich"), "Projektvergleich ohne Rolle Investor → „Nicht gefunden“");
  pruefe((await seite(admin, "/portal/admin/aufgaben")) === 200, "/portal/admin/aufgaben (Admin) 200");
  pruefe((await seite(admin, "/portal/admin/postausgang")) === 200, "/portal/admin/postausgang (Admin) 200");
  pruefe(await verborgen(investor, "/portal/admin/postausgang"), "Postausgang für Nicht-Admin → „Nicht gefunden“");
  pruefe(await verborgen(investor, "/portal/admin/aufgaben"), "Aufgaben-Seite für Nicht-Admin → „Nicht gefunden“");

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
  r = await admin.get("/api/admin/postausgang?limit=500");
  pruefe(r.json.mails?.some((m) => m.an === email && m.art === "passwort" && m.link === reset?.link) && !r.json.mails?.some((m) => m.an === `gibtesnicht-${LAUF}@example.com`), "Passwort-Mail im Postausgang, keine Mail an unbekannte Adressen", r.json.mails?.length);
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
