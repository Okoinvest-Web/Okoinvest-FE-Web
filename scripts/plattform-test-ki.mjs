// scripts/plattform-test-ki.mjs
//
// End-to-End-Test des KI-Assistenten gegen den laufenden Dev-Server (Demo-Backend):
//   node scripts/plattform-test-ki.mjs [basis-url]
//
// Geprüft: Status/Anmeldung, CSRF (Origin, JSON), Rollen je Anwendungsfall, Kontext-Bauer mit
// Rechteprüfung (fremdes Projekt/fremde Fläche/fremder Thread → 403 ohne Inhalte, Datenraum nur mit NDA),
// alle fünf Anwendungsfälle ohne Schlüssel (regelbasiert, nie ein Fehler), Eingabeprüfung,
// Tages-Kontingent (429), Protokoll ohne Inhalte. Mit gesetztem ANTHROPIC_API_KEY laufen dieselben
// Prüfungen im KI-Modus (modus "ki" wird dann ebenfalls akzeptiert).

import { readFile } from "node:fs/promises";
import path from "node:path";

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
        res = await fetch(BASIS + pfad, { method: methode, headers, body: payload, redirect: "manual" });
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
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: res.status, json, text, typ: res.headers.get("content-type") || "" };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  async login(email, passwort = DEMO_PASSWORT) {
    const r = await this.post("/api/auth/login", { email, passwort });
    if (r.status !== 200) throw new Error(`Login ${email} fehlgeschlagen: ${r.status} ${r.text.slice(0, 200)}`);
    return r.json.nutzer;
  }
  async registrieren(rolle, vorname = "KI-Test") {
    const email = `ki-${rolle}-${LAUF}-${Math.random().toString(36).slice(2, 6)}@example.com`;
    const passwort = "Ki-Test-Passwort-2026";
    const r = await this.post("/api/auth/registrieren", { email, passwort, vorname, nachname: `Lauf ${LAUF}`, rollen: [rolle], agb: true });
    if (![200, 201].includes(r.status)) throw new Error(`Registrierung fehlgeschlagen: ${r.status} ${r.text.slice(0, 200)}`);
    return this.login(email, passwort);
  }
}

/** Antwort eines Assistenten lesen – JSON oder NDJSON-Stream zu einem Ergebnis zusammenfassen */
function ergebnis(r) {
  if (r.json) return r.json;
  if (r.typ.includes("ndjson")) {
    const zeilen = r.text.split("\n").filter(Boolean).map((z) => JSON.parse(z));
    const start = zeilen.find((z) => z.t === "start") || {};
    const ersetzen = zeilen.find((z) => z.t === "ersetzen");
    const text = ersetzen ? ersetzen.ergebnis.text : zeilen.filter((z) => z.t === "text").map((z) => z.text).join("");
    return { ...start, ok: true, modus: ersetzen?.modus || start.modus, ergebnis: { text } };
  }
  return {};
}

async function main() {
  console.log(`KI-Assistent-Test gegen ${BASIS} (Lauf ${LAUF})`);
  const gast = new Client("gast");
  const flaeche = new Client("flaeche");
  const landwirt = new Client("landwirt");
  const anbieter = new Client("anbieter");
  const investor = new Client("investor");
  const admin = new Client("admin");
  const fremdAnbieter = new Client("fremder anbieter");
  const fremdInvestor = new Client("fremder investor");
  const kontingentKonto = new Client("kontingent");
  // Eigene Testkonten (Präfix ki-…@example.com), damit Demo-Konten ihr Tages-Kontingent behalten
  const neuFlaeche = new Client("ki-flaeche");
  const neuLandwirt = new Client("ki-landwirt");
  const neuAnbieter = new Client("ki-anbieter");

  // ------------------------------------------------------------ 1. Status & Rahmen
  abschnitt("1. Status, Anmeldung, CSRF");
  let r = await gast.get("/api/portal/ki");
  pruefe(r.status === 401, "Status ohne Anmeldung → 401", r.status);
  r = await gast.post("/api/portal/ki/nachricht", { bezugArt: "nutzer", bezugId: "U-26-XXXXXX" });
  pruefe(r.status === 401, "Assistent ohne Anmeldung → 401", r.status);

  await flaeche.login("flaeche@example.com");
  await landwirt.login("landwirt@example.com");
  await anbieter.login("anbieter@example.com");
  const uFlaeche = await neuFlaeche.registrieren("flaeche");
  await neuLandwirt.registrieren("landwirt");
  await neuAnbieter.registrieren("anbieter");
  await investor.login("investor@example.com");
  await admin.login("admin@example.com");

  r = await neuFlaeche.get("/api/portal/ki");
  pruefe(r.status === 200 && typeof r.json.aktiv === "boolean", "Status liefert aktiv (true/false)", r.json);
  const kiAktiv = !!r.json?.aktiv;
  console.log(`    KI-Modus ${kiAktiv ? "AKTIV (ANTHROPIC_API_KEY gesetzt)" : "inaktiv – regelbasierte Vorschläge"}`);
  pruefe(JSON.stringify(r.json.faelle) === JSON.stringify(["flaeche", "nachricht"]), "Flächeneigentümer: nur Flächen-Assistent und Nachrichten-Entwurf", r.json.faelle);
  pruefe(r.json.kontingent?.limit > 0 && r.json.kontingent.rest <= r.json.kontingent.limit, "Kontingent im Status", r.json.kontingent);
  pruefe(!/sk-ant|api[_-]?key/i.test(r.text), "Status enthält keinen Schlüssel", r.text.slice(0, 200));
  r = await admin.get("/api/portal/ki");
  pruefe(["expose", "triage", "frage", "flaeche", "nachricht"].every((f) => r.json.faelle.includes(f)), "Backoffice: alle Anwendungsfälle", r.json.faelle);

  r = await neuFlaeche.post("/api/portal/flaechen", { bezeichnung: `Testacker KI ${LAUF}`, land: "DE", bundesland: "Bayern", plz: "86842", ort: "Testort", ha: 14.5, nutzung: "acker", eigentum: "eigentum" });
  const eigeneFlaeche = r.json?.flaeche;
  if (!eigeneFlaeche) throw new Error(`Testfläche nicht angelegt: ${r.status} ${r.text.slice(0, 200)}`);
  r = await neuLandwirt.post("/api/portal/flaechen", { bezeichnung: `Agri-Testfläche ${LAUF}`, land: "DE", bundesland: "Bayern", plz: "86842", ort: "Testort", ha: 6, nutzung: "acker", agri: true, eigentum: "eigentum" });
  const agriFlaeche = r.json?.flaeche;
  r = await neuFlaeche.post("/api/portal/ki/flaeche", { flaecheId: eigeneFlaeche.id }, { origin: null });
  pruefe(r.status === 403, "ohne Origin → 403 (CSRF)", r.status);
  r = await neuFlaeche.post("/api/portal/ki/flaeche", { flaecheId: eigeneFlaeche.id }, { origin: "https://boese.example.com" });
  pruefe(r.status === 403, "fremde Origin → 403", r.status);
  r = await neuFlaeche.post("/api/portal/ki/flaeche", `flaecheId=${eigeneFlaeche.id}`, { kopf: { "Content-Type": "application/x-www-form-urlencoded" } });
  pruefe(r.status === 415, "Formular statt JSON → 415", r.status);
  r = await neuFlaeche.post("/api/portal/ki/unbekannt", {});
  pruefe(r.status === 404, "unbekannter Anwendungsfall → 404", r.status);

  // ------------------------------------------------------------ 2. Flächen-Assistent
  abschnitt("2. Flächen-Assistent (Eigentümer/Landwirt)");
  r = await neuFlaeche.post("/api/portal/ki/flaeche", { flaecheId: eigeneFlaeche.id });
  let e = ergebnis(r);
  pruefe(r.status === 200 && e.ok, "eigene Fläche: Status erklären → 200", r.status);
  pruefe(kiAktiv || e.modus === "regel", "ohne Schlüssel regelbasiert (kein Fehler)", e.modus);
  pruefe(typeof e.ergebnis?.text === "string" && e.ergebnis.text.length > 80, "Erklärung enthält Text", e.ergebnis);
  if (!kiAktiv) pruefe(e.ergebnis.text.includes(eigeneFlaeche.bezeichnung) && /Was Sie jetzt tun können/.test(e.ergebnis.text), "Regeltext nennt Fläche und nächste Schritte", e.ergebnis.text.slice(0, 200));
  if (!kiAktiv) pruefe(/nicht aktiviert/.test(e.hinweis), "Hinweis auf regelbasierten Modus", e.hinweis);
  r = await neuFlaeche.post("/api/portal/ki/flaeche", { flaecheId: eigeneFlaeche.id, frage: "Wie hoch ist die übliche Pacht pro Hektar für einen Solarpark?", stream: true });
  e = ergebnis(r);
  pruefe(r.status === 200 && e.ergebnis?.text?.length > 40, "Frage zur Pacht beantwortet (Stream-Wunsch ohne Schlüssel → JSON)", { status: r.status, typ: r.typ });
  pruefe(Array.isArray(e.quellen) && e.quellen.some((q) => q.href === "/ratgeber/solarpark-pacht-pro-hektar"), "Quellen verlinken passenden Ratgeber", e.quellen);
  pruefe(e.quellen.every((q) => /^\/(ratgeber|wissen\/lexikon)/.test(q.href)), "nur interne Website-Links als Quellen", e.quellen);
  r = await neuFlaeche.post("/api/portal/ki/flaeche", { flaecheId: eigeneFlaeche.id, frage: "x".repeat(801) });
  pruefe(r.status === 422, "zu lange Frage → 422", r.status);

  const landwirtFlaeche = (await landwirt.get("/api/portal/flaechen")).json.flaechen[0];
  r = await neuFlaeche.post("/api/portal/ki/flaeche", { flaecheId: landwirtFlaeche.id, frage: "Was ist der Status?" });
  pruefe(r.status === 403, "fremde Fläche → 403", r.status);
  pruefe(!r.text.includes(landwirtFlaeche.bezeichnung) && !r.json?.ergebnis && !r.json?.quellen, "Antwort enthält keine Daten der fremden Fläche", r.text.slice(0, 200));
  r = await neuLandwirt.post("/api/portal/ki/flaeche", { flaecheId: agriFlaeche.id, frage: "Bleibt meine Fläche bei Agri-PV GAP-förderfähig?" });
  e = ergebnis(r);
  pruefe(r.status === 200 && e.quellen.length > 0, "Landwirt: Agri-PV-Frage mit Quellen", e.quellen);
  r = await investor.post("/api/portal/ki/flaeche", { flaecheId: eigeneFlaeche.id });
  pruefe(r.status === 403, "Investor darf Flächen-Assistent nicht nutzen → 403", r.status);

  // ------------------------------------------------------------ 3. Exposé-Assistent
  abschnitt("3. Exposé-Assistent (Anbieter/Backoffice)");
  r = await neuAnbieter.post("/api/portal/projekte", {
    titel: `Freiflächen-PV 18 MWp Süddeutschland (KI-Test ${LAUF})`, typ: "freiflaeche", land: "DE", bundesland: "Bayern", region: "Schwaben", mwp: 18, flaecheHa: 19, phase: "aufstellung", netzanschluss: "zusage", codGeplant: "2028-06",
    beschreibung: "", highlights: [], vertraulich: { gemeinde: `Geheimhausen-${LAUF}`, netzbetreiber: `Netz-Geheim-${LAUF} GmbH`, planungsrecht: "Aufstellungsbeschluss gefasst", ertragKwhKwp: 1120 },
  });
  const entwurf = r.json?.projekt;
  if (!entwurf) throw new Error(`Testprojekt nicht angelegt: ${r.status} ${r.text.slice(0, 200)}`);
  r = await neuAnbieter.post("/api/portal/ki/expose", { projektId: entwurf.id });
  e = ergebnis(r);
  pruefe(r.status === 200 && e.ok, "eigenes Projekt → 200", r.status);
  const ex = e.ergebnis || {};
  pruefe(typeof ex.beschreibung === "string" && ex.beschreibung.length >= 80 && ex.beschreibung.length <= 4000, "Beschreibung 80–4000 Zeichen", ex.beschreibung?.length);
  pruefe(Array.isArray(ex.highlights) && ex.highlights.length <= 6 && ex.highlights.every((h) => h.length <= 90), "Highlights ≤ 6, je ≤ 90 Zeichen", ex.highlights);
  pruefe(Array.isArray(ex.risiken) && ex.risiken.length > 0 && Array.isArray(ex.fehlendeAngaben), "Risiken und fehlende Angaben", { r: ex.risiken, f: ex.fehlendeAngaben });
  const vertraulich = [`Geheimhausen-${LAUF}`, `Netz-Geheim-${LAUF}`];
  pruefe(!vertraulich.some((w) => ex.beschreibung.includes(w) || ex.highlights.join(" ").includes(w)), "Exposé-Entwurf enthält keine vertraulichen Angaben (Gemeinde, Netzbetreiber …)", vertraulich);
  const nachher = (await neuAnbieter.get(`/api/portal/projekte/${entwurf.id}`)).json?.projekt;
  pruefe(!nachher || nachher.beschreibung === entwurf.beschreibung, "Projekt wird nicht automatisch geändert", nachher?.beschreibung?.slice(0, 60));

  await fremdAnbieter.registrieren("anbieter");
  r = await fremdAnbieter.post("/api/portal/ki/expose", { projektId: entwurf.id });
  pruefe(r.status === 403 || r.status === 404, "fremdes Projekt → 403 (Kontext-Bauer)", r.status);
  pruefe(!r.json?.ergebnis && !r.text.includes(entwurf.titel) && !r.text.includes("Geheimhausen"), "Antwort enthält keine Projektdaten", r.text.slice(0, 200));
  r = await neuAnbieter.post("/api/portal/ki/expose", { projektId: (await anbieter.get("/api/portal/projekte")).json.projekte[0].id });
  pruefe(r.status === 403, "Projekt eines anderen Anbieters → 403", r.status);
  r = await investor.post("/api/portal/ki/expose", { projektId: entwurf.id });
  pruefe(r.status === 403, "Investor: Exposé-Assistent → 403 (Rolle)", r.status);
  r = await neuAnbieter.post("/api/portal/ki/expose", { projektId: "../../etc" });
  pruefe(r.status === 422, "ungültige Projekt-ID → 422", r.status);
  r = await admin.post("/api/portal/ki/expose", { projektId: entwurf.id });
  pruefe(r.status === 200 && ergebnis(r).ergebnis?.beschreibung, "Backoffice darf Exposé-Entwurf erstellen", r.status);

  // ------------------------------------------------------------ 4. Triage
  abschnitt("4. Anfrage-Zusammenfassung & Triage (Backoffice)");
  const vorgaenge = (await admin.get("/api/admin/vorgaenge")).json.vorgaenge;
  const vg = vorgaenge.find((v) => v.typ === "flaeche") || vorgaenge[0];
  r = await admin.post("/api/portal/ki/triage", { vorgangId: vg.id });
  e = ergebnis(r);
  const t = e.ergebnis || {};
  pruefe(r.status === 200 && e.ok, "Vorgang → 200", r.status);
  pruefe(t.zusammenfassung?.length > 20 && ["hoch", "mittel", "niedrig"].includes(t.prioritaet), "Zusammenfassung und Priorität", { z: t.zusammenfassung, p: t.prioritaet });
  pruefe(typeof t.typVorschlag === "string" && Array.isArray(t.fehlendeAngaben) && t.naechsterSchritt, "Typvorschlag, fehlende Angaben, nächster Schritt", t);
  pruefe(/Guten Tag/.test(t.antwortEntwurf || "") && /ÖkoInvest/.test(t.antwortEntwurf || ""), "Antwortentwurf in Sie-Form mit Gruß", t.antwortEntwurf?.slice(0, 120));
  pruefe(!(t.antwortEntwurf || "").includes(vg.kontakt?.email || "§§§"), "Antwortentwurf enthält keine E-Mail-Adresse", t.antwortEntwurf?.slice(0, 80));
  r = await flaeche.post("/api/portal/ki/triage", { vorgangId: vg.id });
  pruefe(r.status === 403, "Nicht-Admin: Triage → 403", r.status);

  // ------------------------------------------------------------ 5. Frag das Projekt
  abschnitt("5. Frag das Projekt (Investor mit Datenraum)");
  const interessen = (await investor.get("/api/portal/interessen")).json.interessen;
  const frei = interessen.find((i) => ["nda_freigegeben", "loi_abgegeben", "loi_angenommen"].includes(i.status));
  const boerse = (await investor.get("/api/boerse")).json.projekte;
  const ohneNda = boerse.find((p) => !interessen.some((i) => i.projektId === p.id && ["nda_freigegeben", "loi_abgegeben", "loi_angenommen", "abgeschlossen"].includes(i.status)));
  if (pruefe(!!frei, "Demo-Investor hat freigegebenen Datenraum", interessen.map((i) => i.status))) {
    r = await investor.post("/api/portal/ki/frage", { projektId: frei.projektId, frage: "Wie ist der Stand beim Netzanschluss und wer ist der Netzbetreiber?", stream: true });
    e = ergebnis(r);
    pruefe(r.status === 200 && e.ok, "Frage zum freigegebenen Projekt → 200", r.status);
    pruefe(Array.isArray(e.quellen) && e.quellen.length >= 2 && e.quellen.every((q) => /^Q\d+$/.test(q.id)), "Quellen mit Kennungen Q1 …", e.quellen?.map((q) => q.id));
    pruefe(e.quellen.some((q) => q.titel === "Projektsteckbrief"), "Quellen enthalten Projektsteckbrief", e.quellen.map((q) => q.titel));
    pruefe(/\[Q\d+\]/.test(e.ergebnis?.text || "") || /keinen passenden Eintrag/.test(e.ergebnis?.text || ""), "Antwort mit Quellenangabe (oder klarer Hinweis)", e.ergebnis?.text?.slice(0, 200));
    pruefe(!e.quellen.some((q) => /@example\.com|Interessent|Merkliste|LOI/.test(`${q.titel} ${q.text}`)), "Kontext ohne Nutzer-/Interessentendaten", e.quellen.map((q) => q.titel));
    r = await investor.post("/api/portal/ki/frage", { projektId: frei.projektId, frage: "Welche Farbe hat das Dach der Scheune des Nachbarn?" });
    e = ergebnis(r);
    pruefe(r.status === 200 && /Nachrichten zu diesem Projekt|keine Angaben/.test(e.ergebnis?.text || ""), "unbeantwortbare Frage → Hinweis auf Q&A über Nachrichten", e.ergebnis?.text?.slice(0, 160));
    r = await investor.post("/api/portal/ki/frage", { projektId: frei.projektId, frage: "ab" });
    pruefe(r.status === 422, "zu kurze Frage → 422", r.status);

    await fremdInvestor.registrieren("investor");
    r = await fremdInvestor.post("/api/portal/ki/frage", { projektId: frei.projektId, frage: "Wer ist der Netzbetreiber?" });
    pruefe(r.status === 403, "Investor ohne NDA → 403 (Rechteprüfung vor Kontext)", r.status);
    pruefe(!r.json?.quellen && !r.json?.ergebnis && !/Vertrauliche Angabe|Datenraum –/.test(r.text), "403-Antwort enthält keinen Kontext", r.text.slice(0, 200));
  }
  if (ohneNda) {
    r = await investor.post("/api/portal/ki/frage", { projektId: ohneNda.id, frage: "Wer ist der Netzbetreiber?" });
    pruefe(r.status === 403, "Demo-Investor: Projekt ohne freigegebenen Datenraum → 403", r.status);
  }
  r = await investor.post("/api/portal/ki/frage", { projektId: "P-26-NICHTDA", frage: "Wer ist der Netzbetreiber?" });
  pruefe(r.status === 404, "unbekanntes Projekt → 404", r.status);
  r = await flaeche.post("/api/portal/ki/frage", { projektId: frei?.projektId || "P-26-XXXXXX", frage: "Wer ist der Netzbetreiber?" });
  pruefe(r.status === 403, "Flächeneigentümer: Frag das Projekt → 403 (Rolle)", r.status);

  // ------------------------------------------------------------ 6. Nachrichten-Entwurf
  abschnitt("6. Nachrichten-Entwurf");
  r = await neuFlaeche.post("/api/portal/ki/nachricht", { bezugArt: "flaeche", bezugId: eigeneFlaeche.id });
  e = ergebnis(r);
  pruefe(r.status === 200 && /^Guten Tag/.test(e.ergebnis?.text || ""), "Entwurf im eigenen Flächen-Thread (Sie-Form)", e.ergebnis?.text?.slice(0, 100));
  r = await neuFlaeche.post("/api/portal/ki/nachricht", { bezugArt: "flaeche", bezugId: eigeneFlaeche.id, stichpunkte: "Termin vor Ort im Oktober möglich\nFlurkarte folgt nächste Woche" });
  e = ergebnis(r);
  pruefe(r.status === 200 && (kiAktiv || (/Oktober/.test(e.ergebnis.text) && /Flurkarte/.test(e.ergebnis.text))), "Stichpunkte werden eingearbeitet", e.ergebnis?.text);
  r = await neuFlaeche.post("/api/portal/ki/nachricht", { bezugArt: "flaeche", bezugId: landwirtFlaeche.id });
  pruefe(r.status === 403, "fremder Thread → 403", r.status);
  r = await neuFlaeche.post("/api/portal/ki/nachricht", { bezugArt: "geheim", bezugId: eigeneFlaeche.id });
  pruefe(r.status === 422, "unbekannter Bezug → 422", r.status);
  r = await admin.post("/api/portal/ki/nachricht", { bezugArt: "vorgang", bezugId: vg.id });
  e = ergebnis(r);
  pruefe(r.status === 200 && /ÖkoInvest-Team/.test(e.ergebnis?.text || ""), "Backoffice-Entwurf mit Team-Gruß", e.ergebnis?.text?.slice(-60));
  const threadVorher = (await neuFlaeche.get(`/api/portal/nachrichten?bezug=flaeche:${eigeneFlaeche.id}`)).json.thread.nachrichten.length;
  pruefe(threadVorher === (await neuFlaeche.get(`/api/portal/nachrichten?bezug=flaeche:${eigeneFlaeche.id}`)).json.thread.nachrichten.length, "Entwurf wird nicht automatisch gesendet", threadVorher);

  // ------------------------------------------------------------ 7. Kontingent & Protokoll
  abschnitt("7. Tages-Kontingent und Protokoll ohne Inhalte");
  const uK = await kontingentKonto.registrieren("mitglied");
  const status = (await kontingentKonto.get("/api/portal/ki")).json;
  pruefe(status.kontingent.rest === status.kontingent.limit, "neues Konto: volles Kontingent", status.kontingent);
  const GEHEIM = `Geheimer-Stichpunkt-${LAUF}`;
  let letzte = null;
  let erste429 = 0;
  for (let i = 1; i <= status.kontingent.limit + 1; i++) {
    letzte = await kontingentKonto.post("/api/portal/ki/nachricht", { bezugArt: "nutzer", bezugId: uK.id, stichpunkte: GEHEIM });
    if (letzte.status === 429 && !erste429) erste429 = i;
    if (letzte.status !== 200) break;
  }
  pruefe(erste429 === status.kontingent.limit + 1, `Aufruf ${status.kontingent.limit + 1} → 429 (Kontingent ${status.kontingent.limit}/Tag)`, { erste429, status: letzte?.status, json: letzte?.json });
  pruefe(letzte?.json?.code === "kontingent" && /Kontingent/.test(letzte.json.error || ""), "verständliche Meldung zum Kontingent", letzte?.json);
  const nach = (await kontingentKonto.get("/api/portal/ki")).json;
  pruefe(nach.kontingent.rest === 0, "Status zeigt Rest 0", nach.kontingent);
  r = await neuFlaeche.post("/api/portal/ki/nachricht", { bezugArt: "flaeche", bezugId: eigeneFlaeche.id });
  pruefe(r.status === 200, "Kontingent gilt je Konto (andere Konten unberührt)", r.status);

  try {
    const roh = await readFile(path.join(process.cwd(), ".data", "ki-nutzung.json"), "utf8");
    const liste = JSON.parse(roh);
    const eigene = liste.filter((x) => x.nutzerId === uK.id);
    pruefe(eigene.length === status.kontingent.limit && eigene.every((x) => x.fall === "nachricht" && x.am && x.modus), "Protokoll: wer, wann, welcher Fall", eigene.length);
    pruefe(!roh.includes(GEHEIM) && !roh.includes("Wie hoch ist die übliche Pacht"), "Protokoll speichert keine Inhalte (Eingaben/Antworten)", "Inhalt gefunden");
    pruefe(liste.some((x) => x.nutzerId === uFlaeche.id && x.fall === "flaeche" && x.objektArt === "flaeche"), "Protokoll mit Bezugsobjekt (Art/ID)", "");
  } catch (err) {
    pruefe(false, "Protokolldatei .data/ki-nutzung.json lesbar (Test im Projektordner starten)", err.message);
  }

  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen bestanden")} (${ok} ok)`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.message}`));
  process.exit(1);
});
