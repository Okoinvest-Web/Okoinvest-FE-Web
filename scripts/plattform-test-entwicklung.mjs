// scripts/plattform-test-entwicklung.mjs
//
// End-to-End-Test „Projektentwicklung“ gegen den laufenden Dev-Server (Demo-Backend).
//   node scripts/plattform-test-entwicklung.mjs [basis-url]
//
// Prüft: Portfolio (Summen, Ziel 50 MWp, Verzug, Fristen, Auslastung) · Pipeline-Werte = MWp × 1000 × Mitte PHASEN-Spanne ×
// Wahrscheinlichkeit (Phase aus erledigten Meilensteinen) · Meilenstein-Abhängigkeiten (Vorgänger offen → 409, Kreis → 409,
// Dokumentenpflicht → 422, Verzicht mit Begründung) · Eigentümer sieht nur die vereinfachte Sicht SEINER Fläche (keine Risiken,
// Kosten, Namen, Notizen, fremden Flächen) + Benachrichtigung bei erledigtem Meilenstein · Gutachter nur Zugewiesenes
// (Einladung, Upload, Meldung, Rückfrage; fremde Meilensteine/Projekte → 403) · Co-Investor nur mit Freigabe, nur externe Risiken ·
// fremde → 403 · Co-Development nur mit verifiziertem KYC/KYB (Freigabe/Zugriff sonst 409 „kyc“, Pilot-Geltung nur für
// eigene Testkonten) · Übergabe an Börse erzeugt Projekt (zweimal → 409) · Übergabe Bau vor RTB → 409 · Unterrollen · CSRF · Seiten.
// Eigene Konten ent-test-<Lauf>-…@example.com und eigene Projekte – Demo-Daten bleiben unberührt.

import { PHASEN, ENTWICKLUNG } from "../src/lib/invest/markt.js";

const BASIS = (process.argv[2] || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);
const PASSWORT = "Entwicklung-Test-Passwort-26";
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

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
      if (body instanceof FormData) payload = body;
      else {
        headers["Content-Type"] ||= "application/json";
        payload = typeof body === "string" ? body : JSON.stringify(body);
      }
    }
    let res;
    for (let versuch = 1; ; versuch++) {
      try {
        res = await fetch(BASIS + pfad, { method: methode, headers, body: payload, redirect: "manual" });
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
  put = (p, b, o) => this.anfrage("PUT", p, b ?? {}, o);

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

  async registrieren(schluessel, rollen, vorname, nachname, firma = "") {
    const email = `ent-test-${LAUF}-${schluessel}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email, passwort: PASSWORT, vorname, nachname, firma, rollen, agb: true });
    if (r.status !== 201) throw new Error(`Registrierung ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    this.email = email;
    return r.json.nutzer;
  }

  async hochladen(felder) {
    const fd = new FormData();
    fd.append("datei", new Blob([PDF], { type: "application/pdf" }), "gutachten-test.pdf");
    for (const [k, w] of Object.entries(felder)) fd.append(k, w);
    return this.anfrage("POST", "/api/portal/entwicklung/dokumente", fd, { kopf: { "X-Plattform-Upload": "1" } });
  }
}

/** Erwarteter Pipeline-Wert wie src/lib/plattform/entwicklung.js → pipelineWert */
function erwartet(mwp, phase) {
  const p = PHASEN.find((x) => x.id === phase) || PHASEN[0];
  const preis = (p.preisProKwp.min + p.preisProKwp.max) / 2;
  const w = ENTWICKLUNG.wahrscheinlichkeit[phase || "akquise"];
  const volumen = Math.round(mwp * 1000 * preis);
  return { preis, w, volumen, wert: Math.round(volumen * w) };
}

async function main() {
  console.log(`Projektentwicklung – Test gegen ${BASIS} (Lauf ${LAUF})`);
  const admin = new Client("admin");
  const lesen = new Client("bo-lesen");
  const pl = new Client("bo-projektleitung");
  const investorDemo = new Client("investor (Demo)");
  const eig = new Client("Eigentümer (Test)");
  const fremd = new Client("fremder Eigentümer");
  const gut = new Client("Gutachter (Test)");
  const inv = new Client("Investor (Test)");
  const gast = new Client("gast");
  await admin.login("admin@example.com");
  await lesen.login("bo-lesen@example.com");

  // ------------------------------------------------------------ 1. Portfolio & Pipeline-Werte
  abschnitt("1. Portfolio und Pipeline-Werte");
  let r = await admin.get("/api/admin/entwicklung");
  pruefe(r.status === 200 && r.json.projekte?.length >= 7, "Portfolio mit Demo-Projekten (≥ 7)", r.status);
  await pl.login("bo-projektleitung@example.com");
  await investorDemo.login("investor@example.com");
  const pf = r.json;
  const offen = (pf.projekte || []).filter((p) => ["aktiv", "pausiert"].includes(p.status));
  pruefe(pf.summen?.zielMwpJahr === 50, "Ziellinie 50 MWp/Jahr", pf.summen?.zielMwpJahr);
  pruefe(offen.every((p) => { const e = erwartet(p.typ === "speicher" ? p.mwp || p.mwh / 2 : p.mwp, p.phase); return p.pipeline.preisProKwp === e.preis && p.pipeline.wahrscheinlichkeit === e.w && p.pipeline.wert === e.wert; }), "Pipeline-Wert je Projekt = MWp × 1000 × Mitte PHASEN × Wahrscheinlichkeit", offen.map((p) => [p.titel, p.phase, p.pipeline]).slice(0, 3));
  pruefe(pf.summen.wert === offen.reduce((s, p) => s + p.pipeline.wert, 0), "Summe Pipeline-Wert = Summe der Projekte");
  pruefe(pf.summen.jePhase.reduce((s, x) => s + x.anzahl, 0) === offen.length && pf.summen.jeLand.reduce((s, x) => s + x.anzahl, 0) === offen.length, "Summen je Phase und Land decken alle offenen Projekte ab");
  pruefe(new Set(offen.map((p) => p.phase)).size >= 4, "Demo-Projekte in mehreren Phasen (≥ 4)", [...new Set(offen.map((p) => p.phase))]);
  pruefe(pf.summen.jeJahr.length >= 2 && pf.summen.jeJahr.every((j) => j.mwp >= j.mwpGewichtet), "MWp je COD-Jahr (gewichtet ≤ gesamt)", pf.summen.jeJahr);
  pruefe(pf.verzug.length >= 2 && pf.verzug.some((x) => x.kritisch) && pf.verzug.every((x) => x.tage > 0), "Verzugsliste mit kritischen, überfälligen Meilensteinen", pf.verzug.slice(0, 2));
  pruefe(Array.isArray(pf.fristen) && pf.fristen.every((x) => x.inTagen >= 0 && x.inTagen <= 31), "Fristen der nächsten 30 Tage", pf.fristen.slice(0, 2));
  pruefe(pf.auslastung.length >= 1 && pf.auslastung.every((a) => a.name && a.projekte >= 0), "Auslastung je Projektleitung", pf.auslastung);
  const muehl = pf.projekte.find((p) => /Mühlweg/.test(p.titel));
  const randstreifen = pf.projekte.find((p) => /Randstreifen/.test(p.titel));
  pruefe(muehl?.phase === "aufstellung" && randstreifen?.phase === "rtb", "Phase aus erledigten Meilensteinen (Mühlweg: Aufstellung, Randstreifen: RTB)", [muehl?.phase, randstreifen?.phase]);

  r = await admin.get(`/api/admin/entwicklung/${muehl.id}`);
  const muehlDetail = r.json.projekt;
  pruefe(r.status === 200 && muehlDetail.meilensteine.length >= 15, "Projektdetail mit Meilenstein-Plan", r.status);
  pruefe(muehlDetail.meilensteine.some((m) => m.kritisch) && muehlDetail.meilensteine.some((m) => m.ueberfaellig), "Kritischer Pfad und Verzug markiert");
  pruefe(muehlDetail.kontakte.length >= 3 && muehlDetail.kontakte.every((k) => k.kontakt?.name), "Behörden-/Stakeholder-Kontakte aus dem CRM", muehlDetail.kontakte.length);
  pruefe(muehlDetail.risiken.length >= 3 && muehlDetail.risiken[0].score >= muehlDetail.risiken.at(-1).score, "Risikoregister (Eintritt × Auswirkung, absteigend)");

  // ------------------------------------------------------------ 2. Anlegen, Abhängigkeiten, Dokumentenpflicht
  abschnitt("2. Eigenes Projekt: Vorlage, Abhängigkeiten, Dokumentenpflicht, Pipeline");
  r = await admin.post("/api/admin/entwicklung", { titel: `ent-test-${LAUF} Solarpark`, typ: "freiflaeche", land: "DE", bundesland: "Bayern", gemeinde: "Testdorf", mwp: 10, vermarktung: "eeg" });
  pruefe(r.status === 201 && r.json.projekt?.meilensteine?.length >= 18, "Projekt angelegt mit DE-Vorlage (≥ 18 Meilensteine)", r.status);
  let p = r.json.projekt;
  const pid = p.id;
  const M = (s) => p.meilensteine.find((m) => m.schluessel === s);
  pruefe(p.meilensteine.every((m) => m.sollStart && m.sollEnde && m.sollEnde >= m.sollStart), "Soll-Termine vorwärts gerechnet");
  pruefe(M("aufstellungsbeschluss").sollStart >= M("gemeinde_vorgespraech").sollEnde && M("offenlage").sollStart >= M("umweltbericht").sollEnde, "Nachfolger beginnen nach dem Ende der Vorgänger");
  pruefe(p.phase === null && p.pipeline.wert === erwartet(10, null).wert, "Akquise: Pipeline-Wert mit Akquise-Wahrscheinlichkeit", p.pipeline);
  pruefe(!!p.zielCod && p.meilensteine.some((m) => m.kritisch), "Ziel-COD aus Plan, kritischer Pfad vorhanden", p.zielCod);

  const eintrag = (cl, art, daten, id = null) => cl.post(`/api/admin/entwicklung/${pid}/eintraege`, { art, id, daten });
  r = await eintrag(admin, "meilenstein", { status: "erledigt" }, M("netzzusage").id);
  pruefe(r.status === 409 && /Vorgänger/.test(r.json.error), "Erledigen mit offenem Vorgänger → 409", r.json);
  r = await eintrag(admin, "meilenstein", { nach: [M("netzanfrage").id] }, M("flaechensicherung").id);
  pruefe(r.status === 409 && /Kreis/.test(r.json.error), "Zirkuläre Abhängigkeit → 409", r.json);
  r = await eintrag(admin, "meilenstein", { status: "erledigt" }, M("flaechensicherung").id);
  pruefe(r.status === 422 && /Dokumentenpflicht/.test(r.json.error), "Dokumentenpflicht ohne Nachweis → 422", r.json);

  // Eigentümer mit eigener Fläche verknüpfen (vor dem Erledigen → Benachrichtigung)
  await eig.registrieren("eig", ["flaeche"], "Erna", "Eigen (Test)");
  await fremd.registrieren("fremd", ["flaeche"], "Fritz", "Fremd (Test)");
  r = await eig.post("/api/portal/flaechen", { bezeichnung: `ent-test-${LAUF} Acker`, land: "DE", bundesland: "Bayern", plz: "86825", ort: "Testdorf", ha: 11, nutzung: "acker" });
  pruefe([200, 201].includes(r.status) && r.json.flaeche?.id, "Eigentümer legt Fläche an", r.status);
  const fid = r.json.flaeche?.id;
  r = await eintrag(admin, "flaeche", { flaecheId: fid, pachtStatus: "option", pachtEurHa: 1900, notiz: `INTERN-NOTIZ-${LAUF}` });
  pruefe(r.status === 200 && r.json.eintrag?.flaecheId === fid, "Projektfläche mit Plattform-Fläche verknüpft", r.json);
  r = await eintrag(admin, "flaeche", { bezeichnung: `Geheime Nachbarfläche ${LAUF}`, eigentuemerName: `Nachbar Geheim ${LAUF}`, ha: 4, pachtStatus: "verhandlung" });
  pruefe(r.status === 200, "Zweite Projektfläche (ohne Konto) angelegt");
  r = await eintrag(admin, "risiko", { titel: `Internes Risiko ${LAUF}`, kategorie: "akzeptanz", eintritt: 4, auswirkung: 5, massnahme: "intern", extern: false });
  pruefe(r.status === 200 && r.json.eintrag?.score === 20, "Risiko mit Score 4 × 5 = 20", r.json.eintrag);
  r = await eintrag(admin, "risiko", { titel: `Externes Risiko ${LAUF}`, kategorie: "netz", eintritt: 2, auswirkung: 3, extern: true });
  r = await eintrag(admin, "budget", { kategorie: "gutachten", bezeichnung: `Budget ${LAUF}`, planEur: 12345, istEur: 999 });
  pruefe(r.status === 200 && r.json.projekt?.budgetPlan === 12345 && r.json.projekt?.budgetIst === 999, "Budgetposition Plan/Ist", r.json.projekt?.budgetPlan);
  r = await eintrag(admin, "entscheidung", { titel: `Go ${LAUF}`, art: "go", beschluss: "Weiter mit Flächensicherung." });
  pruefe(r.status === 200, "Entscheidung protokolliert");
  r = await eintrag(admin, "entscheidung", { titel: "Änderung" }, r.json.eintrag?.id);
  pruefe(r.status === 409, "Entscheidungen sind unveränderlich → 409", r.status);

  r = await eintrag(admin, "meilenstein", { status: "erledigt", nachweisVerzicht: "Vertrag liegt im Original in der Projektakte." }, M("flaechensicherung").id);
  pruefe(r.status === 200 && r.json.projekt?.phase === "flaeche", "Mit begründetem Verzicht erledigt → Phase Flächensicherung", r.json.projekt?.phase ?? r.json);
  p = r.json.projekt;
  pruefe(p.pipeline.wert === erwartet(10, "flaeche").wert && p.pipeline.wert > erwartet(10, null).wert, "Pipeline-Wert steigt mit der Phase", p.pipeline);
  // Dokumentenpflicht per Upload erfüllen
  r = await admin.hochladen({ projektId: pid, meilensteinId: M("netzanfrage").id, pflicht: "Netzanschlussbegehren" });
  pruefe(r.status === 200 && r.json.dokument?.pflicht === "Netzanschlussbegehren", "Pflichtdokument hochgeladen", r.json);
  r = await eintrag(admin, "meilenstein", { status: "erledigt" }, M("netzanfrage").id);
  pruefe(r.status === 200, "Nach Upload ohne Verzicht erledigt (Dokumentenpflicht erfüllt)", r.json);
  r = await eintrag(admin, "meilenstein", { status: "offen" }, M("flaechensicherung").id);
  pruefe(r.status === 409, "Zurücksetzen mit erledigtem Nachfolger → 409", r.status);

  // ------------------------------------------------------------ 3. Eigentümer: vereinfachte Sicht nur seiner Fläche
  abschnitt("3. Flächeneigentümer: „Wo steht mein Projekt?“");
  r = await eig.get("/api/portal/entwicklung");
  const eigListe = r.json.projekte || [];
  pruefe(r.status === 200 && eigListe.length === 1 && eigListe[0].id === pid, "Eigentümer sieht genau sein Projekt", eigListe.map((x) => x.id));
  r = await eig.get(`/api/portal/entwicklung/${pid}`);
  const sicht = r.json.projekt;
  pruefe(r.status === 200 && sicht?.eigentuemer?.schritte?.length >= 5, "Vereinfachter Fortschritt (Schritte)", r.status);
  pruefe(sicht.eigentuemer.schritte.some((s) => s.stand === "erledigt" && /Flächensicherung/.test(s.titel)), "Erledigter Schritt in einfacher Sprache");
  pruefe(sicht.eigentuemer.schritte.every((s) => /^Q[1-4] 20\d\d$/.test(s.zeitraum)), "Zeiträume nur als Quartal", sicht.eigentuemer.schritte.slice(0, 2));
  const txt = r.text;
  pruefe(!/risiken|budget|entscheidungen|kontakte|verantwortlich|notiz|eigentuemerName|pachtEurHa|pipeline/i.test(txt), "Keine internen Felder (Risiken, Kosten, Entscheidungen, Kontakte, Verantwortliche, Notizen, Pipeline)");
  pruefe(!txt.includes(`Nachbar Geheim ${LAUF}`) && !txt.includes(`Geheime Nachbarfläche ${LAUF}`) && !txt.includes(`INTERN-NOTIZ-${LAUF}`), "Keine fremden Flächen, Eigentümernamen oder Notizen");
  pruefe(!txt.includes("Dokumentenpflicht") && !/Artenschutz \(saP/.test(txt) && !txt.includes("Abwägung (§"), "Nur externe Titel, keine internen Meilensteine");
  pruefe(sicht.eigentuemer.meineFlaechen.length === 1 && sicht.eigentuemer.meineFlaechen[0].flaecheId === fid, "Nur die eigene Fläche mit Pachtstatus");
  r = await eig.get("/api/portal/benachrichtigungen");
  const hinweise = r.json.eintraege || r.json.benachrichtigungen || [];
  pruefe(hinweise.some((b) => b.art === "entwicklung" && /Fortschritt/.test(b.titel)), "Benachrichtigung „Neuer Fortschritt“ nach erledigtem Meilenstein", hinweise.map((b) => b.titel).slice(0, 3));
  r = await eig.get(`/api/admin/entwicklung/${pid}`);
  pruefe(r.status === 403, "Eigentümer → Backoffice-API 403", r.status);
  r = await eig.get(`/api/portal/entwicklung/${muehl.id}`);
  pruefe(r.status === 403 && !r.text.includes("Mühlweg"), "Eigentümer → fremdes Projekt 403 ohne Inhalte", r.status);
  r = await fremd.get(`/api/portal/entwicklung/${pid}`);
  pruefe(r.status === 403, "Fremder Flächeneigentümer → 403", r.status);
  r = await fremd.get("/api/portal/entwicklung");
  pruefe(r.status === 200 && r.json.projekte.length === 0, "Fremder sieht leere Liste");
  r = await gast.get(`/api/portal/entwicklung/${pid}`);
  pruefe(r.status === 401, "Ohne Anmeldung → 401", r.status);

  // ------------------------------------------------------------ 4. Gutachter: Einladung und nur Zugewiesenes
  abschnitt("4. Gutachter/Planer: Einladung, nur zugewiesene Meilensteine");
  const artenschutz = M("gutachten_artenschutz");
  const gutEmail = `ent-test-${LAUF}-gut@example.com`;
  r = await admin.post(`/api/admin/entwicklung/${pid}/gutachter`, { email: gutEmail, meilensteinIds: [artenschutz.id], fachgebiete: ["artenschutz", "ffh"], qualifikation: "oebuv", buero: "Test Umweltplanung (Test)" });
  pruefe(r.status === 200 && r.json.demoLink?.includes("/einladung/gutachter/"), "Einladung angelegt (Link im Demo-Betrieb)", r.json);
  const token = (r.json.demoLink || "").split("/").pop();
  r = await eig.post("/api/portal/entwicklung/einladung", { token });
  pruefe(r.status === 403, "Einladung mit falschem Konto → 403", r.status);
  await gut.registrieren("gut", ["flaeche"], "Greta", "Gutachterin (Test)", "Test Umweltplanung (Test)");
  r = await gut.post("/api/portal/entwicklung/einladung", { token });
  pruefe(r.status === 200 && r.json.projektId === pid, "Gutachter nimmt Einladung an", r.json);
  r = await gut.post("/api/portal/entwicklung/einladung", { token });
  pruefe(r.status === 422, "Einladung nur einmal verwendbar", r.status);
  r = await admin.get(`/api/admin/entwicklung/${pid}`);
  const gp = (r.json.projekt?.gutachterProfile || []).find((x) => x.email === gutEmail);
  pruefe(gp?.qualifikation === "oebuv" && gp.fachgebiete.includes("artenschutz") && gp.buero === "Test Umweltplanung (Test)", "Gutachter-Profil (Fachgebiet, öffentlich bestellt und vereidigt) aus der Einladung übernommen", gp);
  r = await admin.post(`/api/admin/entwicklung/${pid}/eintraege`, { art: "gutachterprofil", id: gp?.nutzerId, daten: { fachgebiete: ["artenschutz", "ffh", "landschaft"] } });
  pruefe(r.status === 200 && r.json.eintrag?.fachgebiete?.length === 3 && r.json.eintrag.qualifikation === "oebuv", "Profil im Backoffice pflegbar", r.json);
  r = await gut.get("/api/auth/ich");
  pruefe((r.json.nutzer?.rollen || []).includes("gutachter"), "Konto hat jetzt die Rolle Gutachter", r.json.nutzer?.rollen);
  r = await gut.get(`/api/portal/entwicklung/${pid}`);
  const gs = r.json.projekt;
  pruefe(r.status === 200 && gs.gutachter?.auftraege?.length === 1 && gs.gutachter.auftraege[0].id === artenschutz.id, "Gutachter sieht nur seinen Meilenstein", gs?.gutachter?.auftraege?.map((a) => a.titel));
  pruefe(!gs.investor && !gs.eigentuemer && !/risiken|budget|Satzungsbeschluss|Netzzusage|pipeline|eigentuemerName/.test(r.text), "Keine Risiken, Kosten, andere Meilensteine oder Eigentümer", r.text.slice(0, 200));
  r = await gut.post(`/api/portal/entwicklung/${pid}/meilensteine/${M("satzungsbeschluss").id}`, { aktion: "in_arbeit" });
  pruefe(r.status === 403, "Nicht zugewiesener Meilenstein → 403", r.status);
  r = await gut.post(`/api/portal/entwicklung/${pid}/meilensteine/${artenschutz.id}`, { aktion: "eingereicht" });
  pruefe(r.status === 422, "„Eingereicht“ erst nach Upload → 422", r.status);
  r = await gut.hochladen({ projektId: pid, meilensteinId: M("umweltbericht").id });
  pruefe(r.status === 403, "Upload an fremden Meilenstein → 403", r.status);
  r = await gut.hochladen({ projektId: pid, meilensteinId: artenschutz.id, pflicht: "Artenschutzgutachten", freigabeInvestor: "1" });
  pruefe(r.status === 200 && r.json.dokument?.freigabeInvestor === false, "Gutachten hochgeladen (Freigabe an Investoren nur durch Backoffice)", r.json);
  const gutDok = r.json.dokument?.id;
  r = await gut.post(`/api/portal/entwicklung/${pid}/meilensteine/${artenschutz.id}`, { aktion: "eingereicht" });
  pruefe(r.status === 200 && r.json.projekt?.gutachter?.auftraege?.[0]?.eingereichtAm, "Gutachten eingereicht", r.status);
  r = await gut.post(`/api/admin/entwicklung/${pid}/eintraege`, { art: "meilenstein", id: artenschutz.id, daten: { status: "erledigt" } });
  pruefe(r.status === 403, "Gutachter kann nicht erledigen (Backoffice-API) → 403", r.status);
  r = await gut.post(`/api/portal/entwicklung/${pid}/rueckfragen`, { meilensteinId: artenschutz.id, text: "Gibt es Kartierdaten aus Vorjahren?" });
  pruefe(r.status === 200, "Rückfrage an die Projektleitung", r.status);
  r = await gut.post(`/api/portal/entwicklung/${pid}/rueckfragen`, { meilensteinId: M("umweltbericht").id, text: "Frage zu fremdem Meilenstein" });
  pruefe(r.status === 403, "Rückfrage zu fremdem Meilenstein → 403", r.status);
  r = await admin.post(`/api/admin/entwicklung/${pid}/rueckfrage`, { meilensteinId: artenschutz.id, text: "Ja, liegen bei." });
  pruefe(r.status === 200, "Backoffice antwortet dem Gutachter");
  r = await gut.get(`/api/portal/entwicklung/${pid}`);
  pruefe(r.json.projekt?.gutachter?.auftraege?.[0]?.rueckfragen?.length === 2, "Gutachter sieht Frage und Antwort", r.json.projekt?.gutachter?.auftraege?.[0]?.rueckfragen);
  r = await gut.get(`/api/portal/entwicklung/${muehl.id}`);
  pruefe(r.status === 403, "Gutachter → fremdes Projekt 403", r.status);
  r = await gut.get("/api/admin/entwicklung");
  pruefe(r.status === 403, "Gutachter → Portfolio 403", r.status);
  r = await gut.get(`/api/portal/entwicklung/dokumente/${gutDok}`);
  pruefe(r.status === 200 && (r.headers.get("content-type") || "").includes("pdf"), "Gutachter lädt eigenes Dokument", r.status);
  r = await eig.get(`/api/portal/entwicklung/dokumente/${gutDok}`);
  pruefe(r.status === 403, "Eigentümer → Gutachten-Dokument 403", r.status);

  // ------------------------------------------------------------ 5. Co-Development-Investor
  abschnitt("5. Co-Development-Investor");
  await inv.registrieren("inv", ["investor"], "Ivo", "Investor (Test)", "Test Capital (Test)");
  r = await inv.get(`/api/portal/entwicklung/${pid}`);
  pruefe(r.status === 403, "Ohne Freigabe → 403", r.status);
  r = await eintrag(admin, "freigabe", { nutzerId: inv.nutzer.id, risiken: true, dokumente: true });
  pruefe(r.status === 200, "Freigabe erteilt", r.json);
  r = await eintrag(admin, "freigabe", { nutzerId: eig.nutzer.id });
  pruefe(r.status === 422, "Freigabe nur für Investorenkonten", r.status);
  r = await inv.get(`/api/portal/entwicklung/${pid}`);
  const is = r.json.projekt?.investor;
  pruefe(r.status === 200 && is?.meilensteine?.length >= 15, "Investor sieht Fortschritt und Termine", r.status);
  pruefe(is.risiken.length === 1 && is.risiken[0].titel === `Externes Risiko ${LAUF}` && !r.text.includes(`Internes Risiko ${LAUF}`), "Nur freigegebene (externe) Risiken", is.risiken);
  pruefe(!/budget|entscheidungen|eigentuemerName|pachtEurHa|notiz/.test(r.text) && !r.text.includes(`Nachbar Geheim ${LAUF}`), "Keine Kosten, Entscheidungen, Eigentümer oder Notizen");
  pruefe(is.dokumente.length === 0, "Gutachten ohne Backoffice-Freigabe nicht sichtbar");
  r = await inv.get(`/api/portal/entwicklung/dokumente/${gutDok}`);
  pruefe(r.status === 403, "Investor → nicht freigegebenes Dokument 403", r.status);
  r = await investorDemo.get(`/api/portal/entwicklung/${muehl.id}`);
  pruefe(r.status === 200 && r.json.projekt?.investor && !r.text.includes("Einwände aus der Nachbarschaft"), "Demo-Investor: Mühlweg freigegeben, interne Risiken ausgeblendet", r.status);

  // KYC/KYB: Co-Development-Freigabe und -Zugriff nur mit verifiziertem Investor. Die Sperre gilt in der Entwicklung nur
  // für Pilot-Konten (PLATTFORM_KYC_GATING) – eigene Testkonten werden aufgenommen und am Ende wieder entfernt.
  abschnitt("5b. Co-Development nur mit verifiziertem KYC/KYB");
  const comp = new Client("bo-compliance");
  await comp.login("bo-compliance@example.com");
  const inv2 = new Client("Investor ohne KYC (Test)");
  await inv2.registrieren("inv2", ["investor"], "Ina", "Unverifiziert (Test)");
  const pilot = [inv2, inv];
  try {
    for (const c of pilot) r = await comp.put("/api/admin/compliance/einstellungen", { pilotKonto: { id: c.nutzer.id, an: true } });
    pruefe(r.status === 200, "Testkonten im Pilotbetrieb der KYC-Sperren", r.status);
    r = await eintrag(admin, "freigabe", { nutzerId: inv2.nutzer.id });
    pruefe(r.status === 409 && r.json.code === "kyc" && /verifiziert/.test(r.json.error || ""), "Freigabe für nicht verifizierten Investor → 409 (kyc)", r.json);
    r = await admin.get(`/api/admin/entwicklung/${pid}`);
    pruefe(!(r.json.projekt?.freigaben || []).some((x) => x.nutzerId === inv2.nutzer.id), "Keine Freigabe angelegt", (r.json.projekt?.freigaben || []).length);
    r = await inv.get(`/api/portal/entwicklung/${pid}`);
    pruefe(r.status === 409 && r.json.code === "kyc" && !r.text.includes(`Externes Risiko ${LAUF}`) && !r.text.includes("meilensteine"), "Bestehende Freigabe ohne KYC → 409 (kyc), keine Projektdaten", { status: r.status, code: r.json.code });
    r = await inv.get("/api/portal/entwicklung");
    const eintragKyc = (r.json.projekte || []).find((x) => x.id === pid);
    pruefe(r.status === 200 && eintragKyc?.kycErforderlich?.schritt === "codevelopment" && !eintragKyc.investor, "Übersicht: Projekt mit Hinweis „Verifizierung erforderlich“, ohne Co-Investor-Sicht", eintragKyc && { kyc: eintragKyc.kycErforderlich, investor: !!eintragKyc.investor });
    r = await inv.get(`/api/portal/kyc/freigabe?schritt=codevelopment`);
    pruefe(r.status === 200 && r.json.freigabe?.ok === false && r.json.freigabe?.aktiv === true, "KYC-Freigabeprüfung kennt den Schritt „codevelopment“", r.json.freigabe);
    r = await inv.get(`/portal/entwicklung/${pid}`);
    pruefe(r.status === 200 && r.text.includes("Verifizierung erforderlich") && !r.text.includes(`Externes Risiko ${LAUF}`), "Seite zeigt Hinweis zur Verifizierung statt Projektdaten", r.status);
  } finally {
    for (const c of pilot) if (c.nutzer) await comp.put("/api/admin/compliance/einstellungen", { pilotKonto: { id: c.nutzer.id, an: false } }).catch(() => {});
  }
  r = await inv.get(`/api/portal/entwicklung/${pid}`);
  pruefe(r.status === 200 && r.json.projekt?.investor, "Ohne KYC-Sperre (kein Pilot-Konto): Zugriff wie zuvor", r.status);

  // ------------------------------------------------------------ 6. Übergaben
  abschnitt("6. Übergabe an Börse und Bau");
  r = await admin.post(`/api/admin/entwicklung/${pid}/aktion`, { aktion: "uebergabe_anlage" });
  pruefe(r.status === 409 && /RTB/.test(r.json.error), "Übergabe an Bau vor RTB → 409", r.json);
  r = await admin.post(`/api/admin/entwicklung/${pid}/aktion`, { aktion: "uebergabe_boerse" });
  pruefe(r.status === 200 && /^P-/.test(r.json.boerseProjektId || ""), "Übergabe an Börse erzeugt Projekt", r.json);
  const bid = r.json.boerseProjektId;
  r = await admin.get(`/api/portal/projekte/${bid}`);
  const bp = r.json.projekt;
  pruefe(r.status === 200 && bp?.status === "entwurf" && bp.mwp === 10 && bp.phase === "flaeche" && bp.bundesland === "Bayern", "Börsen-Projekt: Entwurf mit MWp, Phase, Region", bp && { status: bp.status, mwp: bp.mwp, phase: bp.phase });
  pruefe(bp?.netzanschluss === "angefragt" && bp?.vertraulich?.gemeinde === "Testdorf", "Netzstatus und vertrauliche Angaben übernommen", bp?.vertraulich);
  r = await admin.post(`/api/admin/entwicklung/${pid}/aktion`, { aktion: "uebergabe_boerse" });
  pruefe(r.status === 409, "Zweite Übergabe → 409", r.status);
  r = await admin.get(`/api/admin/entwicklung/${pid}`);
  pruefe(r.json.projekt?.status === "boerse" && r.json.projekt?.boerseProjektId === bid && r.json.projekt.entscheidungen.some((e) => /börse/i.test(e.titel)), "Projekt verknüpft, Status und Entscheidung protokolliert");

  // ------------------------------------------------------------ 7. Assistent, Unterrollen, CSRF
  abschnitt("7. Assistent, Unterrollen, CSRF");
  r = await admin.get(`/api/admin/entwicklung/assistent?flaecheId=${fid}`);
  pruefe(r.status === 200 && r.json.vorschlag?.typ === "freiflaeche" && r.json.vorschlag.mwp === 10 && r.json.flaeche?.bereitsVerknuepft === true, "Assistent: Vorschlag aus Fläche (11 ha → 10 MWp), bereits verknüpft", r.json.vorschlag);
  r = await admin.get("/api/admin/entwicklung/assistent?land=DE&typ=freiflaeche");
  const titelDe = (r.json.plan || []).map((m) => m.titel).join(" | ");
  pruefe(["Rammtests", "Kampfmittel", "Archäologische", "Schallgutachten", "Entwässerung", "FFH-Vorprüfung", "Landschaftsbild", "Netzverträglichkeit"].every((x) => titelDe.includes(x)) && !titelDe.includes("DIN SPEC 91434"), "Vorlage DE/Freifläche: vollständige Gutachtenliste (Fachprüfung)", titelDe.slice(0, 300));
  r = await admin.get("/api/admin/entwicklung/assistent?land=DE&typ=agri");
  pruefe(r.json.plan.some((m) => /DIN SPEC 91434/.test(m.titel)), "Vorlage DE/Agri-PV: landwirtschaftliches Nutzungskonzept");
  r = await admin.get("/api/admin/entwicklung/assistent?land=CH&typ=dach");
  pruefe(r.status === 200 && r.json.plan.some((m) => /Art\. 18a RPG/.test(m.titel)) && !r.json.plan.some((m) => /Richtplan/.test(m.titel)), "Vorlage CH/Dach: Meldeverfahren statt Richtplan");
  r = await admin.get("/api/admin/entwicklung/assistent?land=AT&typ=freiflaeche");
  pruefe(r.json.plan.some((m) => /Grünland-Photovoltaik/.test(m.titel)) && r.json.plan.some((m) => /EAG/.test(m.titel)) && r.json.plan.some((m) => /Naturverträglichkeit/.test(m.titel)) && r.json.plan.some((m) => /Geotechnisches/.test(m.titel)), "Vorlage AT: Widmung Grünland-PV, EAG, Naturverträglichkeit, Geotechnik");
  r = await lesen.get("/api/admin/entwicklung");
  pruefe(r.status === 200, "Unterrolle „lesen“ sieht das Portfolio", r.status);
  r = await lesen.post("/api/admin/entwicklung", { titel: "Darf nicht", typ: "freiflaeche", land: "DE", bundesland: "Bayern", mwp: 1 });
  pruefe(r.status === 403, "Unterrolle „lesen“ → Anlegen 403", r.status);
  r = await pl.post(`/api/admin/entwicklung/${pid}/eintraege`, { art: "risiko", daten: { titel: `PL-Risiko ${LAUF}`, eintritt: 2, auswirkung: 2 } });
  pruefe(r.status === 200, "Unterrolle „Projektleitung“ pflegt Risiken", r.status);
  r = await pl.get("/api/admin/provisionen");
  pruefe(r.status === 403, "Projektleitung → Provisionen 403", r.status);
  r = await admin.post(`/api/admin/entwicklung/${pid}/eintraege`, { art: "risiko", daten: { titel: "CSRF" } }, { origin: "https://boese.example" });
  pruefe(r.status === 403, "Fremde Herkunft → 403", r.status);
  r = await admin.post("/api/admin/entwicklung/fristen", {});
  pruefe(r.status === 200 && typeof r.json.verzug === "number", "Fristen-Erinnerungen ausführbar", r.json);

  // ------------------------------------------------------------ 8. Seiten
  abschnitt("8. Seiten");
  for (const [cl, pfad, soll] of [
    [admin, "/portal/admin/entwicklung", 200],
    [admin, "/portal/admin/entwicklung?ansicht=kanban", 200],
    [admin, `/portal/admin/entwicklung/${muehl.id}`, 200],
    [admin, `/portal/admin/entwicklung/${muehl.id}?reiter=plan`, 200],
    [admin, "/portal/admin/entwicklung/neu", 200],
    [eig, "/portal/entwicklung", 200],
    [eig, `/portal/entwicklung/${pid}`, 200],
    [eig, `/portal/entwicklung/${muehl.id}`, 404],
    [eig, "/portal/admin/entwicklung", 404],
    [gut, `/portal/entwicklung/${pid}`, 200],
    [inv, `/portal/entwicklung/${pid}`, 200],
    [fremd, `/portal/entwicklung/${pid}`, 404],
  ]) {
    r = await cl.get(pfad);
    const nichtGefunden = r.status === 404 || r.text.includes("NEXT_HTTP_ERROR_FALLBACK;404");
    pruefe(soll === 404 ? nichtGefunden && !r.text.includes("Solarpark Mühlweg") : r.status === 200 && !nichtGefunden, `${pfad} (${cl.name}) → ${soll}`, r.status);
  }

  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen bestanden")} (${ok} ok)`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.message}`));
  process.exit(1);
});
