// scripts/plattform-test-fach-flaeche.mjs
//
// Fachprüfung Flächen & Kommunen (Team A) gegen den laufenden Dev-Server (Demo-Backend):
//   node scripts/plattform-test-fach-flaeche.mjs [basis-url]
//
// Geprüft: Flurstücksformate DE/AT/CH (Zähler/Nenner, Flur, KG-Nr., Grundstücksnummer mit Punkt, EZ,
// Parzelle, E-GRID), Summenfläche vs. angegebene ha (Einreichen blockiert ab > 10 %), Pflichtangaben je
// Nutzung (Dach, Agri-PV, Eigentum, laufende Pacht), Bereinigung der Fachangaben (Positivliste, Zahlen,
// Gemeindeschlüssel), Agri-PV-Felder, erweitertes Pachtangebot (Validierung, Speicherung, Angebotsbogen),
// Kommune (strukturierte Anfrage, Gemeinde-Sicht nur nach Prüfung, ohne vertrauliche Daten) und
// unveränderte Rechte (fremd 403, Rolle 403, ohne Sitzung 401, CSRF 403, gesperrt ab Vorprüfung 409).
// Pachtakte (Abschnitte 0 und 10): Anliegen Kündigung/Eigentümerwechsel/Erbfall/Aufteilung mit Wirkung, Rückbau bis Abnahme,
// Rückbausicherheit, Vertragsende, Agri-PV-Nachweis (DIN SPEC 91434), Jahresbescheinigung (PDF), Rechte und Seiten.
// Eigene Testkonten mit Präfix „fa-“ (example.com).

// Pachtakte (Team 1): `--nur-logik` prüft nur die reinen Regeln (src/lib/plattform/pachtakte.js) ohne Server.
const NUR_LOGIK = process.argv.includes("--nur-logik");
const BASIS = (process.argv.find((x) => /^https?:/.test(x)) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
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
        break;
      } catch (e) {
        if (versuch >= 3) throw e;
        await new Promise((r) => setTimeout(r, 5000 * versuch));
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
      json = { text: text.slice(0, 300) };
    }
    return { status: res.status, json, text };
  }

  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  patch = (p, b, o) => this.anfrage("PATCH", p, b ?? {}, o);

  async login(email, passwort = DEMO_PASSWORT) {
    const r = await this.post("/api/auth/login", { email, passwort });
    if (r.status !== 200) throw new Error(`Login ${email} fehlgeschlagen: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.nutzer;
  }

  async registrieren(praefix, rollen, extra = {}) {
    const r = await this.post("/api/auth/registrieren", { email: `fa-${praefix}-${LAUF}@example.com`, passwort: "Fa-Passwort-2026", vorname: "Fa", nachname: `${praefix} ${LAUF}`, rollen, agb: true, ...extra });
    if (r.status !== 201) throw new Error(`Registrierung ${praefix} fehlgeschlagen: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json;
  }
}

const basisDE = (x = {}) => ({ bezeichnung: `Fa-Testfläche ${LAUF}`, land: "DE", bundesland: "Bayern", plz: "86825", ort: "Testdorf", ha: 5, nutzung: "acker", eigentum: "eigentum", ...x });

async function main() {
  await pachtakteLogik(); // Abschnitt 0: reine Regeln der Pachtakte (ohne Server)
  if (NUR_LOGIK) {
    console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Logik-Prüfungen bestanden")} (${ok} ok)`);
    process.exit(fehler ? 1 : 0);
  }
  console.log(`Fachprüfung Flächen & Kommunen – Test gegen ${BASIS} (Lauf ${LAUF})`);
  const gast = new Client("gast");
  const eigen = new Client("eigentümer");
  const fremd = new Client("fremder");
  const landwirt = new Client("landwirt");
  const investor = new Client("investor");
  const admin = new Client("admin");
  const kommune = new Client("kommune");
  let r;

  await eigen.registrieren("eigen", ["flaeche"]);
  await fremd.registrieren("fremd", ["flaeche"]);
  await landwirt.registrieren("landwirt", ["landwirt"]);
  await investor.login("investor@example.com");
  await admin.login("admin@example.com");

  // ------------------------------------------------------------ 1. Flurstücke DE
  abschnitt("1. Flurstücke Deutschland (Gemarkung, Flur, Zähler/Nenner, Grundbuch, Katasterfläche)");
  r = await eigen.post("/api/portal/flaechen", basisDE({ flurstuecke: [{ gemarkung: "Testfeld", flur: "3", nummer: "211 / 3", grundbuch: "Testfeld", blatt: "1234", m2: "50.000" }, { gemarkung: "", flur: "", nummer: "" }] }));
  pruefe(r.status === 200, "gültiges DE-Flurstück wird angenommen", r.json);
  const fDe = r.json.flaeche;
  pruefe(fDe?.flurstuecke?.length === 1, "leere Zeilen fallen weg", fDe?.flurstuecke);
  pruefe(fDe?.flurstuecke?.[0]?.nummer === "211/3" && fDe.flurstuecke[0].m2 === 50000 && fDe.flurstuecke[0].blatt === "1234", "Zähler/Nenner normalisiert, m² mit Tausenderpunkt erkannt", fDe?.flurstuecke?.[0]);
  pruefe(!("egrid" in (fDe?.flurstuecke?.[0] || {})), "Felder anderer Länder werden nicht gespeichert (kein E-GRID bei DE)", fDe?.flurstuecke?.[0]);
  for (const [fs, text] of [
    [{ gemarkung: "Testfeld", nummer: "21a/b" }, "Flurstücksnummer mit Buchstaben"],
    [{ gemarkung: "Testfeld", nummer: "211/12345" }, "Nenner mit mehr als 4 Stellen"],
    [{ gemarkung: "Testfeld", flur: "1234", nummer: "12" }, "Flur mit 4 Stellen"],
    [{ gemarkung: "Testfeld", flur: "1" }, "Flurstücksnummer fehlt"],
    [{ nummer: "12" }, "Gemarkung fehlt"],
    [{ gemarkung: "Testfeld", nummer: "12", blatt: "12-A" }, "Grundbuchblatt ungültig"],
    [{ gemarkung: "Testfeld", gemarkungNr: "12", nummer: "12" }, "Gemarkungsschlüssel zu kurz"],
  ]) {
    r = await eigen.post("/api/portal/flaechen", basisDE({ flurstuecke: [fs] }));
    pruefe(r.status === 422 && /Flurstück 1/.test(r.json.error || ""), `DE: ${text} → 422`, r.json);
  }
  r = await eigen.post("/api/portal/flaechen", basisDE({ flurstuecke: [{ gemarkung: "A", nummer: "1" }, { gemarkung: "A", nummer: "x" }] }));
  pruefe(r.status === 422 && /Flurstück 2/.test(r.json.error || ""), "Fehlermeldung nennt das betroffene Flurstück (Nr. 2)", r.json);

  // ------------------------------------------------------------ 2. AT / CH
  abschnitt("2. Österreich (KG-Nr., Grundstücksnummer, EZ) und Schweiz (Parzelle, E-GRID)");
  const basisAT = (fs) => ({ bezeichnung: `Fa-AT ${LAUF}`, land: "AT", bundesland: "Oberösterreich", plz: "5120", ort: "Testgemeinde", ha: 2, flurstuecke: fs });
  r = await eigen.post("/api/portal/flaechen", basisAT([{ gemarkung: "Testdorf", gemarkungNr: "46123", nummer: ".12", blatt: "87", flur: "9", m2: 20000 }]));
  pruefe(r.status === 200 && r.json.flaeche?.flurstuecke?.[0]?.nummer === ".12" && r.json.flaeche.flurstuecke[0].blatt === "87", "AT: Baufläche „.12“ mit KG-Nr. und EZ angenommen", r.json);
  pruefe(r.status === 200 && !("flur" in (r.json.flaeche?.flurstuecke?.[0] || {})), "AT: keine Flur gespeichert", r.json.flaeche?.flurstuecke?.[0]);
  const fAt = r.json.flaeche;
  for (const [fs, text] of [
    [{ gemarkungNr: "4612", nummer: "1234/5" }, "KG-Nr. mit 4 Stellen"],
    [{ gemarkung: "Testdorf", nummer: "1234/5" }, "KG-Nr. fehlt"],
    [{ gemarkungNr: "46123", nummer: "12,5" }, "Grundstücksnummer mit Komma"],
    [{ gemarkungNr: "46123", nummer: "12", blatt: "123456" }, "EZ mit 6 Stellen"],
  ]) {
    r = await eigen.post("/api/portal/flaechen", basisAT([fs]));
    pruefe(r.status === 422, `AT: ${text} → 422`, r.json);
  }
  const basisCH = (fs, x = {}) => ({ bezeichnung: `Fa-CH ${LAUF}`, land: "CH", bundesland: "Bern", plz: "3000", ort: "Testgemeinde", ha: 3, flurstuecke: fs, ...x });
  r = await eigen.post("/api/portal/flaechen", basisCH([{ gemarkung: "Testgemeinde", gemarkungNr: "351", nummer: "1234-1", egrid: "ch 1234 5678 9012" }]));
  pruefe(r.status === 200 && r.json.flaeche?.flurstuecke?.[0]?.egrid === "CH123456789012", "CH: E-GRID normalisiert (Leerzeichen, Großbuchstaben)", r.json);
  for (const [fs, text] of [
    [{ gemarkung: "Testgemeinde", nummer: "12", egrid: "CH12" }, "E-GRID zu kurz"],
    [{ gemarkung: "Testgemeinde", nummer: "12/34/56" }, "Parzellennummer mit zwei Trennern"],
    [{ gemarkung: "Testgemeinde", gemarkungNr: "12345", nummer: "12" }, "BFS-Nr. mit 5 Stellen"],
    [{ egrid: "CH123456789012" }, "Parzellennummer fehlt"],
  ]) {
    r = await eigen.post("/api/portal/flaechen", basisCH([fs]));
    pruefe(r.status === 422, `CH: ${text} → 422`, r.json);
  }

  // ------------------------------------------------------------ 3. Summenfläche
  abschnitt("3. Summenfläche laut Kataster vs. angegebene Größe");
  r = await eigen.post("/api/portal/flaechen", basisDE({ ha: 12, flurstuecke: [{ gemarkung: "Testfeld", nummer: "1", m2: 50000 }, { gemarkung: "Testfeld", nummer: "2", m2: 50000 }], einreichen: true }));
  pruefe(r.status === 422 && /Katasterfläche/.test(r.json.error || ""), "12 ha bei 10 ha Katasterfläche: Einreichen → 422", r.json);
  r = await eigen.post("/api/portal/flaechen", basisDE({ ha: 12, flurstuecke: [{ gemarkung: "Testfeld", nummer: "1", m2: 50000 }, { gemarkung: "Testfeld", nummer: "2", m2: 50000 }] }));
  pruefe(r.status === 200 && r.json.flaeche?.status === "entwurf", "als Entwurf trotzdem speicherbar", r.json);
  const fSumme = r.json.flaeche;
  r = await eigen.post("/api/portal/status", { art: "flaeche", id: fSumme.id, nach: "eingegangen" });
  pruefe(r.status === 422 && /Katasterfläche/.test(r.json.error || ""), "Einreichen des Entwurfs → 422", r.json);
  r = await eigen.patch(`/api/portal/flaechen/${fSumme.id}`, { ...basisDE(), ha: 10.1 });
  pruefe(r.status === 200 && r.json.flaeche?.flurstuecke?.length === 2, "Größe korrigiert, Flurstücke bleiben (Teil-Update)", r.json.flaeche?.flurstuecke);
  r = await eigen.post("/api/portal/status", { art: "flaeche", id: fSumme.id, nach: "eingegangen" });
  pruefe(r.status === 200, "10,1 ha bei 10 ha Kataster (Toleranz) → einreichbar", r.json);
  r = await eigen.post("/api/portal/flaechen", basisDE({ ha: 4, flurstuecke: [{ gemarkung: "Testfeld", nummer: "3", m2: 100000 }], einreichen: true }));
  pruefe(r.status === 200 && r.json.flaeche?.status === "eingegangen", "Teilfläche (4 von 10 ha) ist einreichbar", r.json);

  // ------------------------------------------------------------ 4. Pflichtangaben je Nutzung
  abschnitt("4. Pflichtangaben je Nutzung und Eigentum");
  r = await eigen.post("/api/portal/flaechen", basisDE({ einreichen: true }));
  pruefe(r.status === 200 && r.json.flaeche?.status === "eingegangen", "Acker ohne Fachangaben bleibt einreichbar (bisheriges Verhalten)", r.json);
  r = await eigen.post("/api/portal/flaechen", basisDE({ nutzung: "dach", ha: 0.4, einreichen: true }));
  pruefe(r.status === 422 && /Dachart/.test(r.json.error) && /Asbest/.test(r.json.error) && /Nutzung des Gebäudes/.test(r.json.error), "Dach ohne Dachart/Asbest/Nutzer → 422", r.json);
  r = await eigen.post("/api/portal/flaechen", basisDE({ nutzung: "dach", ha: 0.4, agri: true, fach: { dach: { dachart: "trapez", asbest: "nein", nutzer: "vermietet", statik: "reserve", statikReserveKn: "0,3", baujahrDach: "2008", dachflaecheM2: "4.000", unbekannt: "x" } }, einreichen: true }));
  pruefe(r.status === 200 && r.json.flaeche?.status === "eingegangen", "Dach mit Pflichtangaben → eingereicht", r.json);
  const d = r.json.flaeche?.fach?.dach || {};
  pruefe(d.statikReserveKn === 0.3 && d.baujahrDach === 2008 && d.dachflaecheM2 === 4000 && !("unbekannt" in d), "Dachangaben bereinigt (Dezimalkomma, Jahr, m², Positivliste)", d);
  pruefe(r.json.flaeche?.agri === true || r.json.flaeche?.agri === false, "Agri-Kennzeichen bleibt boolesch", r.json.flaeche?.agri);
  r = await eigen.post("/api/portal/flaechen", basisDE({ nutzung: "dach", ha: 0.4, fach: { dach: { dachart: "faserzement", asbest: "vielleicht", nutzer: "eigen" } }, einreichen: true }));
  pruefe(r.status === 422 && /Asbest/.test(r.json.error), "ungültige Asbest-Angabe zählt als fehlend → 422", r.json);
  r = await eigen.post("/api/portal/flaechen", basisDE({ eigentum: "erbengemeinschaft", einreichen: true }));
  pruefe(r.status === 422 && /Vertretung/.test(r.json.error), "Erbengemeinschaft ohne Vertretung → 422", r.json);
  r = await eigen.post("/api/portal/flaechen", basisDE({ eigentum: "erbengemeinschaft", fach: { eigentum: { vertretung: "vollmacht", anzahl: "3", belastungen: ["grundschuld", "erfunden", "niessbrauch"] } }, einreichen: true }));
  pruefe(r.status === 200 && JSON.stringify(r.json.flaeche?.fach?.eigentum?.belastungen) === JSON.stringify(["grundschuld", "niessbrauch"]), "mit Vertretung eingereicht, Belastungen nur aus der Positivliste", r.json.flaeche?.fach?.eigentum);
  pruefe(r.json.flaeche?.checkliste?.punkte?.some((p) => p.id === "vollmacht" && p.erwartet), "Checkliste verlangt Vollmacht bei Erbengemeinschaft", r.json.flaeche?.checkliste?.punkte?.map((p) => [p.id, p.erwartet]));
  r = await eigen.post("/api/portal/flaechen", basisDE({ fach: { bewirtschaftung: { art: "verpachtet" } }, einreichen: true }));
  pruefe(r.status === 422 && /Pacht/.test(r.json.error), "laufende Pacht ohne Ende/Kündigungsfrist → 422", r.json);
  r = await eigen.post("/api/portal/flaechen", basisDE({ fach: { bewirtschaftung: { art: "verpachtet", pachtEnde: "2028-09" }, foerderung: { aukm: "ja", aukmEnde: "2027" } }, einreichen: true }));
  pruefe(r.status === 200 && r.json.flaeche?.fach?.bewirtschaftung?.pachtEnde === "2028-09" && r.json.flaeche.fach.foerderung.aukmEnde === 2027, "mit Pachtende eingereicht (Monat, AUKM-Ende)", r.json.flaeche?.fach);
  r = await eigen.post("/api/portal/flaechen", basisDE({ fach: { bewirtschaftung: { art: "verpachtet", pachtEnde: "morgen" } } }));
  pruefe(r.status === 200 && !r.json.flaeche?.fach?.bewirtschaftung?.pachtEnde, "ungültiges Pachtende wird verworfen", r.json.flaeche?.fach);

  // ------------------------------------------------------------ 5. Agri-PV
  abschnitt("5. Agri-PV-Angaben (DIN SPEC 91434, Bewirtschaftung, Referenzertrag, Privilegierung)");
  r = await landwirt.post("/api/portal/flaechen", basisDE({ agri: true, ha: 2.2, einreichen: true }));
  pruefe(r.status === 422 && /Kultur/.test(r.json.error), "Agri-PV ohne Kultur → 422", r.json);
  r = await landwirt.post("/api/portal/flaechen", basisDE({
    agri: true, ha: 2.2, einreichen: true,
    fach: { agri: { kategorie: "1", system: "hoch", kultur: "obst", arbeitsbreiteM: "3,5", durchfahrtshoeheM: "2,8", gassenbreiteM: "6", referenzertrag: "250", referenzEinheit: "dt", referenzQuelle: "eigen", nachweis66: "geplant", gapWeiter: "ja", hofbezug: "ja", hofEntfernungM: "300", preis: 1 }, lage: { gemeindeSchluessel: "09 778 123" } },
  }));
  pruefe(r.status === 200 && r.json.flaeche?.status === "eingegangen", "Agri-PV mit Kultur eingereicht", r.json);
  const a = r.json.flaeche?.fach?.agri || {};
  pruefe(a.kategorie === "1" && a.durchfahrtshoeheM === 2.8 && a.arbeitsbreiteM === 3.5 && a.referenzertrag === 250 && a.hofbezug === "ja" && !("preis" in a), "Agri-Felder bereinigt (Kategorie, Höhen, Referenzertrag, Hofbezug)", a);
  pruefe(r.json.flaeche?.fach?.lage?.gemeindeSchluessel === "09778123", "AGS mit Leerzeichen normalisiert", r.json.flaeche?.fach?.lage);
  const fAgri = r.json.flaeche;
  r = await landwirt.post("/api/portal/flaechen", basisDE({ agri: true, fach: { agri: { kategorie: "9", kultur: "banane" } } }));
  pruefe(r.status === 200 && !r.json.flaeche?.fach?.agri, "unbekannte Kategorie/Kultur werden verworfen", r.json.flaeche?.fach);
  r = await landwirt.post("/api/portal/flaechen", basisDE({ fach: { lage: { gemeindeSchluessel: "1234" } } }));
  pruefe(r.status === 422 && /AGS/.test(r.json.error), "DE: AGS mit 4 Ziffern → 422", r.json);
  r = await landwirt.post("/api/portal/flaechen", { ...basisAT([]), fach: { lage: { gemeindeSchluessel: "41234" }, boden: { bodenklimazahl: "47", ertragsmesszahl: "4.700" } } });
  pruefe(r.status === 200 && r.json.flaeche?.fach?.lage?.gemeindeSchluessel === "41234" && r.json.flaeche.fach.boden.bodenklimazahl === 47, "AT: Gemeindekennziffer (5 Ziffern) und Bodenklimazahl", r.json.flaeche?.fach);
  r = await landwirt.post("/api/portal/flaechen", { ...basisDE(), fach: { boden: { ackerzahl: "130" } } });
  pruefe(r.status === 200 && !r.json.flaeche?.fach?.boden, "Ackerzahl außerhalb 1–120 wird verworfen", r.json.flaeche?.fach);
  r = await landwirt.get(`/portal/flaechen/${fAgri.id}`, { origin: null });
  pruefe(r.status === 200 && r.text.includes("Fachliche Vorprüfung") && r.text.includes("Privilegierung möglich") && r.text.includes("Was passiert jetzt?"), "Flächenseite zeigt Vorprüfung (Privilegierung) und Pipeline-Erklärung", r.status);

  // ------------------------------------------------------------ 6. Rechte unverändert
  abschnitt("6. Rechte unverändert");
  r = await fremd.get(`/api/portal/flaechen/${fDe.id}`);
  pruefe(r.status === 403, "fremder Eigentümer liest fremde Fläche → 403", r.status);
  r = await fremd.patch(`/api/portal/flaechen/${fDe.id}`, { ...basisDE(), fach: { boden: { ackerzahl: 99 } } });
  pruefe(r.status === 403, "fremder Eigentümer ändert Fachangaben → 403", r.status);
  r = await investor.post("/api/portal/flaechen", basisDE());
  pruefe(r.status === 403, "Investor legt keine Fläche an → 403", r.status);
  r = await gast.get(`/api/portal/flaechen/${fDe.id}`);
  pruefe(r.status === 401, "ohne Sitzung → 401", r.status);
  r = await eigen.patch(`/api/portal/flaechen/${fDe.id}`, { ...basisDE(), fach: { boden: { ackerzahl: 40 } } }, { origin: "https://boese.example.org" });
  pruefe(r.status === 403, "PATCH mit fremdem Origin → 403 (CSRF)", r.status);
  r = await eigen.patch(`/api/portal/flaechen/${fDe.id}`, { ...basisDE(), fach: { boden: { ackerzahl: 40 } } });
  pruefe(r.status === 200 && r.json.flaeche?.fach?.boden?.ackerzahl === 40 && r.json.flaeche.flurstuecke?.length === 1, "Eigentümer ergänzt Fachangaben im Entwurf", r.json.flaeche?.fach);
  r = await eigen.post("/api/portal/status", { art: "flaeche", id: fDe.id, nach: "eingegangen" });
  pruefe(r.status === 200, "Fläche eingereicht", r.json);
  r = await admin.post("/api/admin/status", { art: "flaeche", id: fDe.id, nach: "vorpruefung" });
  pruefe(r.status === 200, "Admin startet Vorprüfung", r.json);
  r = await eigen.patch(`/api/portal/flaechen/${fDe.id}`, { ...basisDE(), fach: { boden: { ackerzahl: 41 } } });
  pruefe(r.status === 409, "nach Beginn der Vorprüfung: Eigentümer ändert nicht mehr → 409", r.status);
  r = await admin.patch(`/api/portal/flaechen/${fDe.id}`, { ...basisDE(), fach: { schutz: { lsg: "nein", wsg: "zone3" } } });
  pruefe(r.status === 200 && r.json.flaeche?.fach?.schutz?.wsg === "zone3" && r.json.flaeche.fach.boden?.ackerzahl === 40, "Backoffice ergänzt Schutzgebiete, übrige Bereiche bleiben", r.json.flaeche?.fach);
  r = await admin.get(`/api/admin/aktivitaeten?objektId=${fDe.id}`);
  if (r.status === 200) pruefe(JSON.stringify(r.json).includes("Fachangaben"), "Aktivitätsprotokoll nennt „Fachangaben“ als geänderte Felder", r.status);

  // ------------------------------------------------------------ 7. Pachtangebot (vollständig)
  abschnitt("7. Pachtangebot mit allen Vertragspunkten und Angebotsbogen");
  r = await admin.post("/api/admin/status", { art: "flaeche", id: fDe.id, nach: "standortanalyse" });
  pruefe(r.status === 200, "Standortanalyse", r.json);
  r = await admin.post("/api/admin/status", { art: "flaeche", id: fDe.id, nach: "pachtangebot", extra: { pachtangebot: { modell: "umsatz", laufzeitJahre: 30 } } });
  pruefe(r.status === 422 && /Umsatzanteil/.test(r.json.error), "Umsatzmodell ohne Umsatzanteil → 422", r.json);
  r = await admin.post("/api/admin/status", { art: "flaeche", id: fDe.id, nach: "pachtangebot", extra: { pachtangebot: { modell: "kombi", umsatzProzent: 6, laufzeitJahre: 30 } } });
  pruefe(r.status === 422 && /Mindestpacht/.test(r.json.error), "Kombimodell ohne Mindestpacht → 422", r.json);
  r = await admin.post("/api/admin/status", { art: "flaeche", id: fDe.id, nach: "pachtangebot", extra: { pachtangebot: { euroProHaJahr: 30, laufzeitJahre: 30 } } });
  pruefe(r.status === 422, "Pacht unter 50 €/ha → 422", r.json);
  const angebot = {
    modell: "fest", euroProHaJahr: "2.600", indexierung: "vpi", reservierungProHaJahr: 180, laufzeitJahre: 30, laufzeitBeginn: "inbetriebnahme", verlaengerungJahre: 10,
    optionsfristJahre: 5, vorlaufJahre: 3, bewirtschaftung: "mitEntschaedigung", nichtbau: "entschaedigung", nichtbauEuroProHa: 500, kuendigung: "befristet",
    rueckbau: "buergschaft", rueckbauAb: "baubeginn", rueckbauEuro: 150000, dienstbarkeit: "sofortLoeschung", rangruecktritt: "true", nebenflaechen: "verguetet",
    nebenflaechenText: "Kabeltrasse 1,2 km", anwalt: "gedeckelt", anwaltEuro: 2500, gueltigBis: "2026-12-31", text: "Testangebot", boese: "<script>", am: "1999-01-01",
  };
  r = await admin.post("/api/admin/status", { art: "flaeche", id: fDe.id, nach: "pachtangebot", extra: { pachtangebot: { ...angebot, rueckbau: "irgendwas" }, kommentar: "Angebot anbei." } });
  pruefe(r.status === 200, "vollständiges Pachtangebot gesendet", r.json);
  r = await eigen.get(`/api/portal/flaechen/${fDe.id}`);
  const pa = r.json.flaeche?.pachtangebot || {};
  pruefe(pa.euroProHaJahr === 2600 && pa.indexierung === "vpi" && pa.reservierungProHaJahr === 180 && pa.laufzeitBeginn === "inbetriebnahme" && pa.rueckbauEuro === 150000 && pa.rangruecktritt === true && pa.anwaltEuro === 2500, "alle Vertragspunkte gespeichert (Tausenderpunkt, Wahrheitswert)", pa);
  pruefe(!("rueckbau" in pa) && !("boese" in pa) && pa.am !== "1999-01-01", "ungültige Auswahl, fremde Felder und Zeitstempel des Clients werden verworfen", pa);
  r = await eigen.get(`/portal/flaechen/${fDe.id}`, { origin: null });
  pruefe(r.status === 200 && r.text.includes("Angebotsbogen") && r.text.includes("Fragen, die Sie stellen sollten") && r.text.includes("Rückbausicherheit"), "Eigentümer sieht den Angebotsbogen mit Fragen", r.status);
  pruefe(r.text.includes("Nicht geregelt") || r.text.includes("im Angebot nicht angegeben"), "nicht geregelte Punkte werden als „nicht geregelt“ markiert (Rückbausicherheit ungültig)", null);
  r = await fremd.get(`/portal/flaechen/${fDe.id}`, { origin: null });
  pruefe([200, 404].includes(r.status) && !r.text.includes("Kabeltrasse 1,2 km") && !r.text.includes("Angebotsbogen"), "fremder Nutzer sieht das Angebot nicht (Nicht-gefunden-Seite)", r.status);
  r = await eigen.post("/api/portal/status", { art: "flaeche", id: fDe.id, nach: "vertrag" });
  pruefe(r.status === 200, "Eigentümer nimmt an (Übergang unverändert)", r.json);

  // ------------------------------------------------------------ 8. Kommune
  abschnitt("8. Kommune: strukturierte Anfrage und Gemeinde-Sicht");
  const kommuneMail = `fa-gemeinde-${LAUF}@example.com`;
  const kontakt = { vorname: "Kora", nachname: `Kommune ${LAUF}`, email: kommuneMail, firma: `Stadtverwaltung Demo-Stadt ${LAUF}`, land: "DE" };
  r = await gast.post("/api/anfrage", { typ: "kommune", kontakt, daten: { gemeinde: "Demo-Stadt", gemeindeSchluessel: "123" }, einwilligung: true });
  pruefe(r.status === 422 && /AGS/.test(r.json.error || ""), "ungültiger AGS → 422", r.json);
  r = await gast.post("/api/anfrage", { typ: "kommune", kontakt: { ...kontakt, land: "" }, daten: { land: "AT", gemeinde: "Testgemeinde", gemeindeSchluessel: "41234", absender: "stadtwerk" }, einwilligung: true });
  pruefe(r.status === 200, "AT-Gemeindekennziffer über daten.land geprüft", r.json);
  r = await gast.post("/api/anfrage", {
    typ: "kommune", kontakt,
    daten: { absender: "gemeinde", gemeinde: "Demo-Stadt", rolle: "bauamt", gemeindeFlaechenHa: "12,5", interesse6: "ja", buergerbeteiligung: ["genossenschaft", "boese"], bauleitplanung: "kriterien", kriterienkatalog: "arbeit", themen: ["solarpark"] },
    einwilligung: true,
  });
  pruefe(r.status === 200 && r.json.id, "strukturierte Anfrage angenommen", r.json);
  const kVorgang = r.json.id;
  const reg = await kommune.post("/api/auth/registrieren", { email: kommuneMail, passwort: "Fa-Passwort-2026", vorname: "Kora", nachname: `Kommune ${LAUF}`, rollen: ["unternehmen"], vorgang: kVorgang, agb: true });
  pruefe(reg.status === 201 && reg.json.vorgangVerknuepft === kVorgang, "Registrierung verknüpft das Anliegen", reg.json);
  r = await kommune.get(`/api/portal/vorgaenge/${kVorgang}`);
  const dk = r.json.vorgang?.daten || {};
  pruefe(dk.gemeindeFlaechenHa === 12.5 && JSON.stringify(dk.buergerbeteiligung) === JSON.stringify(["genossenschaft"]) && dk.kriterienkatalog === "arbeit", "Anfrage-Angaben bereinigt (Zahl, Mehrfachauswahl, Auswahl)", dk);
  r = await kommune.get("/api/portal/kommune");
  pruefe(r.status === 200 && r.json.anliegen?.length === 1 && r.json.geprueft === false && r.json.gemeinden?.length === 0, "ungeprüftes Anliegen: keine Projektdaten", r.json);
  r = await admin.post("/api/admin/status", { art: "vorgang", id: kVorgang, nach: "in_pruefung" });
  r = await admin.post("/api/admin/status", { art: "vorgang", id: kVorgang, nach: "qualifiziert" });
  pruefe(r.status === 200, "Backoffice qualifiziert das Anliegen", r.json);
  r = await kommune.get("/api/portal/kommune");
  const g = r.json.gemeinden?.[0];
  pruefe(r.status === 200 && r.json.geprueft === true && g?.name === "Demo-Stadt", "nach Prüfung: Gemeinde-Sicht aktiv", r.json);
  pruefe(Array.isArray(g?.projekte) && g.projekte.every((p) => ["planung", "bau", "betrieb"].includes(p.status)), "nur Projekte ab Bauleitplanung", g?.projekte);
  pruefe(g?.projekte?.length >= 1 && g.projekte[0].par6?.euroProJahr > 0, "§ 6 EEG geschätzt (DE)", g?.projekte?.[0]);
  const roh = JSON.stringify(r.json);
  pruefe(!/nutzerId|flurstuecke|pachtangebot|eigentuemer|hinweise|@example\.com|"id":"F-/.test(roh), "keine Eigentümer, Flurstücke, Pachtdaten, Kennungen oder E-Mails in der Gemeinde-Sicht", roh.slice(0, 300));
  r = await fremd.get("/api/portal/kommune");
  pruefe(r.status === 200 && r.json.anliegen.length === 0 && r.json.gemeinden.length === 0, "Konto ohne kommunales Anliegen sieht nichts", r.json);
  r = await gast.get("/api/portal/kommune");
  pruefe(r.status === 401, "ohne Sitzung → 401", r.status);
  r = await admin.get("/api/portal/kommune");
  pruefe(r.status === 200 && r.json.admin === true && r.json.anliegen.some((x) => x.id === kVorgang) && r.json.gemeinden.length === 0, "Backoffice: Liste der Anliegen ohne Projektdaten", r.json.anliegen?.length);
  r = await admin.get(`/api/portal/kommune?vorgang=${kVorgang}`);
  pruefe(r.status === 200 && r.json.gemeinden?.[0]?.name === "Demo-Stadt", "Backoffice: Sicht einer Gemeinde je Anliegen", r.json.gemeinden?.length);
  r = await admin.get(`/api/portal/kommune?vorgang=${fDe.vorgangId || "V-26-XXXXXX"}`);
  pruefe([403, 404].includes(r.status), "Backoffice: kein kommunales Anliegen → 403/404", r.status);
  await kommune.post("/api/auth/logout");
  await kommune.login("kommune@example.com");
  r = await kommune.get("/api/portal/kommune");
  pruefe(r.status === 200 && r.json.geprueft && r.json.gemeinden?.[0]?.projekte?.length >= 1, "Demo-Konto kommune@example.com sieht Projekte in Demo-Stadt", r.json.gemeinden);
  r = await kommune.get("/portal/kommune", { origin: null });
  pruefe(r.status === 200 && r.text.includes("Solarprojekte in Ihrer Gemeinde") && r.text.includes("Bauleitplanung"), "Seite /portal/kommune", r.status);

  // ------------------------------------------------------------ 9. Seiten
  abschnitt("9. Seiten");
  r = await eigen.get("/portal/flaechen/neu", { origin: null });
  pruefe(r.status === 200 && r.text.includes("Fachangaben") && r.text.includes("Eigentum &amp; Grundbuch"), "Formular „Fläche hinzufügen“ mit Fachangaben", r.status);
  r = await gast.get("/kommunen", { origin: null });
  pruefe(r.status === 200 && r.text.includes("Amtlicher Gemeindeschlüssel"), "/kommunen mit strukturierter Anfrage", r.status);
  r = await gast.get("/wissen/lexikon", { origin: null });
  pruefe(r.status === 200 && r.text.includes("Katastralgemeinde") && r.text.includes("Referenzertrag"), "Lexikon mit neuen Fachbegriffen", r.status);
  const flaecheDemo = new Client("demo-eigentümer");
  await flaecheDemo.login("flaeche@example.com");
  r = await flaecheDemo.get("/api/portal/flaechen");
  const muehlweg = r.json.flaechen?.find((f) => /Mühlweg/.test(f.bezeichnung));
  if (muehlweg) {
    r = await flaecheDemo.get(`/portal/flaechen/${muehlweg.id}`, { origin: null });
    pruefe(r.status === 200 && r.text.includes("Angebotsbogen") && r.text.includes("Grundpfandrecht"), "Demo-Fläche „Acker am Mühlweg“: Angebotsbogen und Hinweis Rangrücktritt", r.status);
  }

  await pachtakteServer({ gast, eigen, fremd, landwirt, investor, admin }); // Abschnitt 10: Pachtakte gegen den Server

  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen bestanden")} (${ok} ok)`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.message}`));
  process.exit(1);
});

// ================================================================ Pachtakte (Team 1)

async function pachtakteLogik() {
  abschnitt("0. Pachtakte – reine Regeln (src/lib/plattform/pachtakte.js)");
  const P = await import(new URL("../src/lib/plattform/pachtakte.js", import.meta.url).href);
  const H = "2026-09-30";
  const wirft = (fn, status) => {
    try {
      fn();
      return false;
    } catch (e) {
      return status ? e.status === status : true;
    }
  };
  pruefe(Object.keys(P.ANLIEGEN_ARTEN).length === 5 && Object.values(P.ANLIEGEN_ARTEN).every((a) => ["DE", "AT", "CH"].every((l) => a.hinweise[l]?.length > 0)), "Anliegen-Arten mit Hinweisen für DE, AT, CH");
  pruefe(P.ANLIEGEN_ARTEN.eigentuemerwechsel.hinweise.AT.some((h) => h.includes("§ 1120 ABGB")) && P.ANLIEGEN_ARTEN.eigentuemerwechsel.hinweise.DE.some((h) => h.includes("§ 566 BGB")), "Eigentümerwechsel: § 566 BGB (DE) und § 1120 ABGB (AT) erklärt");
  pruefe(wirft(() => P.anliegenBereinigen("kuendigung", { grund: "ordentlich", zumDatum: "2020-01-01" }, { heute: H }), 422), "Kündigung in die Vergangenheit → 422");
  pruefe(wirft(() => P.anliegenBereinigen("kuendigung", { grund: "ausserordentlich", zumDatum: "2027-01-01", begruendung: "kurz" }, { heute: H }), 422), "außerordentliche Kündigung ohne Begründung → 422");
  const k = P.anliegenBereinigen("kuendigung", { grund: "einvernehmlich", zumDatum: "2027-12-31", fremd: "x" }, { heute: H });
  pruefe(k.zumDatum === "2027-12-31" && !("fremd" in k), "Kündigung: Positivliste, fremde Felder fallen weg", k);
  pruefe(wirft(() => P.anliegenBereinigen("erbfall", { verstorben: "A", todestag: "2026-05-01", nachweis: "einantwortung", erben: [{ name: "X" }] }, { heute: H, land: "DE" }), 422), "Erbnachweis je Land (Einantwortung gilt nicht für DE)");
  pruefe(wirft(() => P.anliegenBereinigen("erbfall", { verstorben: "A", todestag: "2026-05-01", nachweis: "erbschein", erben: [{ name: "X" }, { name: "Y" }] }, { heute: H }), 422), "mehrere Erben ohne Vertretung → 422");
  pruefe(wirft(() => P.anliegenBereinigen("zahlungsaufteilung", { grundlage: "miteigentum", empfaenger: [{ name: "a", anteilProzent: 60 }, { name: "b", anteilProzent: 30 }] }), 422), "Zahlungsaufteilung ≠ 100 % → 422");
  pruefe(P.anliegenBereinigen("zahlungsaufteilung", { grundlage: "miteigentum", empfaenger: [{ name: "a", anteilProzent: "33,3333" }, { name: "b", anteilProzent: 66.6667 }] }).empfaenger.length === 2, "Zahlungsaufteilung 33,3333 % + 66,6667 % akzeptiert");
  pruefe(wirft(() => P.anliegenErlaubt("kuendigung", { status: "gekuendigt" }), 409), "gekündigter Vertrag: keine zweite Kündigung (409)");
  pruefe(wirft(() => P.anliegenUebergang({ status: "eingereicht", art: "kuendigung" }, "erledigt", "eigentuemer", { kommentar: "x" }), 409), "Eigentümer kann nicht selbst erledigen (409)");
  const u = P.anliegenUebergang({ status: "in_pruefung", art: "kuendigung", daten: { zumDatum: "2027-12-31" } }, "erledigt", "admin", { kommentar: "bestätigt" });
  pruefe(u.ergebnis.wirksamZum === "2027-12-31", "Erledigen übernimmt das gewünschte Vertragsende", u);
  const fr = P.vertragsFristen({ vertragsdatum: "2022-04-01", beginn: "2023-07-01", laufzeitJahre: 30, ende: "2053-06-30", status: "aktiv" }, { verlaengerungJahre: 10 }, { heute: H });
  pruefe(fr.map((x) => x.id).join(",") === "vorbereitung,ende" && fr[0].datum === "2051-06-30" && /10 Jahre/.test(fr[1].text), "Fristen: Laufzeitende, Verlängerungsoption, Erinnerung 24 Monate vorher", fr);
  const fb = P.vertragsFristen({ vertragsdatum: "2026-01-01", beginn: "", laufzeitJahre: 25, status: "aktiv" }, { vorlaufJahre: 3, nichtbau: "entschaedigung" }, { heute: H });
  pruefe(fb[0]?.id === "baubeginn" && fb[0].datum === "2029-01-01" && /Entschädigung/.test(fb[0].text), "späteste Frist bis Baubeginn mit Nichtbau-Regel", fb);
  const akte = P.akteStart({ rueckbau: "buergschaft", rueckbauEuro: 450000, rueckbauAb: "baubeginn" });
  pruefe(akte.sicherheit.status === "vorgesehen" && P.sicherheitHinweise(akte, { beginn: "2024-01-01" })[0]?.ton === "warn", "Rückbausicherheit ab Baubeginn vereinbart, aber nicht hinterlegt → Warnung");
  pruefe(wirft(() => P.rueckbauUebergang(akte, "angekuendigt", "admin", { termin: "2027-01-01" }, { vertrag: { status: "aktiv", ende: "2053-06-30" }, heute: H }), 409), "Rückbau vor Kündigung bzw. > 24 Monate vor Ende → 409");
  pruefe(wirft(() => P.sicherheitUebergang({ ...akte, sicherheit: { status: "hinterlegt" } }, "freigegeben", { kommentar: "zurück" }), 409), "Sicherheit erst nach Abnahme freigeben (409)");
  pruefe(wirft(() => P.beendenPruefen({ rueckbau: { status: "abgenommen" }, sicherheit: { status: "hinterlegt" } }), 409), "Vertragsende erst nach Freigabe der Sicherheit (409)");
  const d = P.agriNachweisBereinigen({ jahr: 2026, art: "betrieb", kultur: "getreide", gesamtHa: "10", bewirtschaftetHa: "8,8", ertrag: "50", einheit: "dt", gap: "nein" }, { heute: H });
  const pr = P.agriNachweisPruefen(d, { kategorie: "1", referenz: { wert: 70, einheit: "dt", quelle: "Test" }, land: "DE" });
  pruefe(pr.quote === 0.7143 && pr.flaechenverlust === 0.12 && pr.erfuellt === false, "DIN SPEC 91434: 71,4 % Ertrag ok, 12 % Flächenverlust > 10 % (Kat. I) → nicht erfüllt", pr);
  pruefe(P.agriNachweisPruefen(d, { kategorie: "2", referenz: { wert: 70, einheit: "dt", quelle: "Test" } }).erfuellt === true, "Kategorie II: 12 % ≤ 15 % → erfüllt");
  pruefe(pr.punkte.some((p) => p.id === "gap" && /85 %/.test(p.text)), "Hinweis GAP-Förderfähigkeit 85 % (DE)");
  pruefe(wirft(() => P.agriNachweisBereinigen({ ...d, bewirtschaftetHa: 11 }, { heute: H }), 422), "bewirtschaftete Fläche > Gesamtfläche → 422");
  const ref = P.agriReferenz([{ status: "bestaetigt", daten: { art: "referenz", jahr: 2024, ertrag: 70, einheit: "dt" } }, { status: "eingereicht", daten: { art: "referenz", jahr: 2025, ertrag: 74, einheit: "dt" } }, { status: "entwurf", daten: { art: "referenz", jahr: 2023, ertrag: 1, einheit: "dt" } }], null, "dt");
  pruefe(ref?.wert === 72, "Referenzertrag = Ø eingereichter Referenzjahre (ohne Entwürfe)", ref);
  const jb = P.jahresbescheinigung([
    { art: "pacht", status: "bezahlt", zeitraum: { von: "2025-01-01" }, netto: 1000, steuerBetrag: 190, brutto: 1190, bezug: { pachtvertragId: "PT-1" } },
    { art: "pacht", status: "offen", zeitraum: { von: "2025-07-01" }, netto: 1000, steuerBetrag: 190, brutto: 1190, bezug: { pachtvertragId: "PT-1" } },
    { art: "pacht", status: "storniert", zeitraum: { von: "2025-07-01" }, netto: 9, brutto: 9, bezug: { pachtvertragId: "PT-1" } },
  ], [{ id: "PT-1", bezeichnung: "Acker", land: "DE" }], 2025);
  pruefe(jb.summe.brutto === 2380 && jb.summe.bezahlt === 1190 && jb.summe.offen === 1190 && jb.steuerhinweise[0]?.land === "DE", "Jahresbescheinigung: Summen ohne Storno, Steuerhinweise je Land", jb.summe);
}

async function pachtakteServer({ gast, eigen, fremd, landwirt, investor, admin }) {
  abschnitt("10. Pachtakte: Anliegen, Rückbau, Sicherheit, Agri-PV-Nachweis, Jahresbescheinigung, Rechte");
  let r = await admin.get("/api/admin/pachtakte");
  const konten = r.json.konten || [];
  const idVon = (praefix) => konten.find((k) => k.email === `fa-${praefix}-${LAUF}@example.com`)?.id;
  const eigenId = idVon("eigen");
  const landwirtId = idVon("landwirt");
  pruefe(r.status === 200 && eigenId && landwirtId, "Backoffice-Arbeitsliste mit Kontenauswahl", { status: r.status, anzahl: konten.length });
  const vertrag = async (daten) => (await admin.post("/api/admin/finanzen/pachtvertraege", { daten: { land: "DE", flaecheHa: 5, modell: "fest", pachtJahr: 10000, vertragsdatum: "2024-01-01", beginnArt: "inbetriebnahme", beginn: "2024-07-01", laufzeitJahre: 20, faelligkeit: "jaehrlich", zahlweise: "vorschuessig", status: "aktiv", ...daten } })).json.vertrag;
  const v1 = await vertrag({ eigentuemerId: eigenId, bezeichnung: `Fa-Pacht Kündigung ${LAUF}` });
  const v2 = await vertrag({ eigentuemerId: eigenId, bezeichnung: `Fa-Pacht Wechsel ${LAUF}` });
  pruefe(v1?.id && v2?.id, "Testverträge angelegt (Finanzen)", { v1, v2 });
  if (!v1?.id || !v2?.id) return;

  r = await eigen.get("/api/portal/pachtakte");
  const a1 = r.json.vertraege?.find((x) => x.vertrag.id === v1.id);
  pruefe(r.status === 200 && a1 && a1.fristen.some((f) => f.id === "ende" && f.datum === "2044-06-30") && a1.sicherheit.status === "keine" && a1.rueckbau.status === "offen", "Eigentümer sieht Vertrag mit Laufzeitende, Sicherheit und Rückbau", a1?.fristen);
  r = await fremd.get("/api/portal/pachtakte");
  pruefe(r.status === 200 && !r.json.vertraege.some((x) => [v1.id, v2.id].includes(x.vertrag.id)), "fremdes Konto sieht fremde Verträge nicht", r.json.vertraege?.length);
  pruefe((await investor.get("/api/portal/pachtakte")).status === 403, "Rolle Investor → 403");
  pruefe((await gast.get("/api/portal/pachtakte")).status === 401, "ohne Sitzung → 401");
  pruefe((await eigen.post("/api/portal/pachtakte/anliegen", { vertragId: v1.id, art: "verlaengerung", daten: { wunsch: "gespraech" } }, { origin: "https://fremd.example" })).status === 403, "fremde Herkunft (CSRF) → 403");
  pruefe((await fremd.post("/api/portal/pachtakte/anliegen", { vertragId: v1.id, art: "verlaengerung", daten: { wunsch: "gespraech" } })).status === 403, "Anliegen zu fremdem Vertrag → 403");

  // Kündigung mit Rückfrage und Wirkung
  r = await eigen.post("/api/portal/pachtakte/anliegen", { vertragId: v1.id, art: "kuendigung", daten: { grund: "ordentlich", zumDatum: "2020-01-01" } });
  pruefe(r.status === 422, "Kündigung in die Vergangenheit → 422", r.json);
  r = await eigen.post("/api/portal/pachtakte/anliegen", { vertragId: v1.id, art: "kuendigung", daten: { grund: "einvernehmlich", zumDatum: "2030-12-31", begruendung: "Hofaufgabe" } });
  const k1 = r.json.anliegen;
  pruefe(r.status === 200 && k1?.status === "eingereicht" && k1.bearbeitungBis, "Kündigung eingereicht mit Bearbeitungsziel", r.json);
  if (!k1?.id) return;
  pruefe((await eigen.post("/api/portal/pachtakte/anliegen", { vertragId: v1.id, art: "kuendigung", daten: { grund: "einvernehmlich", zumDatum: "2030-12-31" } })).status === 409, "zweite offene Kündigung → 409");
  r = await admin.get("/api/admin/pachtakte");
  pruefe(r.json.anliegen?.some((a) => a.id === k1.id && a.email === `fa-eigen-${LAUF}@example.com`), "Anliegen in der Backoffice-Arbeitsliste");
  pruefe((await eigen.post(`/api/portal/pachtakte/anliegen/${k1.id}`, { nach: "erledigt", kommentar: "selbst" })).status === 422, "Eigentümer kann nicht erledigen (422)");
  pruefe((await admin.post(`/api/admin/pachtakte/anliegen/${k1.id}`, { nach: "rueckfrage" })).status === 422, "Rückfrage ohne Text → 422");
  r = await admin.post(`/api/admin/pachtakte/anliegen/${k1.id}`, { nach: "rueckfrage", kommentar: "Bitte Unterschrift aller Miteigentümer nachreichen." });
  pruefe(r.status === 200 && r.json.anliegen.status === "rueckfrage", "Backoffice stellt Rückfrage", r.json);
  r = await eigen.post(`/api/portal/pachtakte/anliegen/${k1.id}`, { nach: "eingereicht", kommentar: "Unterschriften hochgeladen." });
  pruefe(r.status === 200 && r.json.anliegen.status === "eingereicht", "Eigentümer antwortet auf die Rückfrage", r.json);
  await admin.post(`/api/admin/pachtakte/anliegen/${k1.id}`, { nach: "in_pruefung" });
  r = await admin.post(`/api/admin/pachtakte/anliegen/${k1.id}`, { nach: "erledigt", kommentar: "Aufhebung zum 31.12.2030 bestätigt." });
  pruefe(r.status === 200 && r.json.anliegen.ergebnis?.wirksamZum === "2030-12-31", "Kündigung erledigt – wirksam zum gewünschten Datum", r.json);
  r = await eigen.get("/api/portal/pachtakte");
  const a1b = r.json.vertraege?.find((x) => x.vertrag.id === v1.id);
  pruefe(a1b?.vertrag.status === "gekuendigt" && a1b.vertrag.kuendigungZum === "2030-12-31" && a1b.fristen.some((f) => f.id === "kuendigung"), "Vertrag gekündigt, Frist „Vertragsende laut Kündigung“", a1b?.vertrag);
  pruefe((await eigen.post("/api/portal/pachtakte/anliegen", { vertragId: v1.id, art: "kuendigung", daten: { grund: "ordentlich", zumDatum: "2031-01-01" } })).status === 409, "gekündigter Vertrag: keine weitere Kündigung (409)");
  const bn = await eigen.get("/api/portal/benachrichtigungen");
  pruefe(bn.status === 200 && JSON.stringify(bn.json).includes("Anliegen erledigt"), "Eigentümer erhält Benachrichtigung „Anliegen erledigt“", bn.status);

  // Rückbau bis Abnahme, Sicherheit, Vertragsende
  const rb = (c, body, portal = false) => c.post(portal ? `/api/portal/pachtakte/rueckbau/${v1.id}` : `/api/admin/pachtakte/rueckbau/${v1.id}`, body);
  pruefe((await rb(eigen, { nach: "abgenommen" }, true)).status === 409, "Abnahme vor Rückbau → 409");
  pruefe((await rb(eigen, { ziel: "rueckbau", nach: "angekuendigt", termin: "2031-01-15" })).status === 403, "Eigentümer: Backoffice-Schritt → 403");
  pruefe((await rb(admin, { ziel: "rueckbau", nach: "angekuendigt" })).status === 422, "Rückbau ankündigen ohne Termin → 422");
  pruefe((await rb(admin, { ziel: "rueckbau", nach: "angekuendigt", termin: "2031-01-15" })).status === 200, "Rückbau angekündigt");
  await rb(admin, { ziel: "rueckbau", nach: "laufend" });
  r = await rb(admin, { ziel: "sicherheit", nach: "hinterlegt", art: "buergschaft", betrag: "90.000", geber: "Testbank AG", hinterlegtAm: "2024-06-01" });
  pruefe(r.status === 200 && r.json.akte.sicherheit.status === "hinterlegt" && r.json.akte.sicherheit.betrag === 90000, "Rückbausicherheit hinterlegt (Betrag mit Tausenderpunkt)", r.json.akte?.sicherheit);
  await rb(admin, { ziel: "rueckbau", nach: "abnahme_bereit", termin: "2031-03-01" });
  pruefe((await rb(admin, { ziel: "sicherheit", nach: "freigegeben", kommentar: "zu früh" })).status === 409, "Sicherheit vor Abnahme freigeben → 409");
  pruefe((await rb(admin, { ziel: "vertrag", nach: "beendet", kommentar: "zu früh" })).status === 409, "Vertrag vor Abnahme beenden → 409");
  pruefe((await rb(eigen, { nach: "maengel" }, true)).status === 422, "Mängel ohne Beschreibung → 422");
  r = await rb(eigen, { nach: "maengel", kommentar: "Fundamentreste im Nordteil." }, true);
  pruefe(r.status === 200 && r.json.akte.rueckbau.status === "maengel", "Eigentümer meldet Mängel", r.json.akte?.rueckbau?.status);
  await rb(admin, { ziel: "rueckbau", nach: "laufend" });
  await rb(admin, { ziel: "rueckbau", nach: "abnahme_bereit", termin: "2031-04-01" });
  r = await rb(eigen, { nach: "abgenommen" }, true);
  pruefe(r.status === 200 && r.json.akte.rueckbau.status === "abgenommen", "Eigentümer bestätigt die Abnahme", r.json.akte?.rueckbau?.status);
  pruefe((await rb(admin, { ziel: "vertrag", nach: "beendet", kommentar: "Löschung" })).status === 409, "Vertragsende erst nach Freigabe der Sicherheit (409)");
  await rb(admin, { ziel: "sicherheit", nach: "freigegeben", kommentar: "Bürgschaftsurkunde zurückgegeben." });
  pruefe((await rb(admin, { ziel: "vertrag", nach: "beendet" })).status === 422, "Vertragsende ohne Dokumentation → 422");
  r = await rb(admin, { ziel: "vertrag", nach: "beendet", kommentar: "Löschungsbewilligung der Dienstbarkeit erteilt." });
  pruefe(r.status === 200 && r.json.akte.vertrag.status === "beendet", "Pachtvertrag beendet", r.json.akte?.vertrag?.status);
  pruefe((await eigen.post("/api/portal/pachtakte/anliegen", { vertragId: v1.id, art: "verlaengerung", daten: { wunsch: "gespraech" } })).status === 409, "beendeter Vertrag: keine Anliegen (409)");

  // Eigentümerwechsel mit Übertragung auf ein anderes Konto
  pruefe((await eigen.post("/api/portal/pachtakte/anliegen", { vertragId: v2.id, art: "eigentuemerwechsel", daten: { anlass: "hofuebergabe", stichtag: "2026-11-01", erwerber: { name: "Hofnachfolge", email: "kaputt" } } })).status === 422, "Eigentümerwechsel mit ungültiger E-Mail → 422");
  r = await eigen.post("/api/portal/pachtakte/anliegen", { vertragId: v2.id, art: "eigentuemerwechsel", daten: { anlass: "hofuebergabe", stichtag: "2026-11-01", erwerber: { name: "Hofnachfolge", email: `fa-landwirt-${LAUF}@example.com` } } });
  const w = r.json.anliegen;
  pruefe(r.status === 200 && w?.unterlagen?.length > 0, "Eigentümerwechsel eingereicht, Pflichtunterlagen genannt", r.json);
  if (w?.id) {
    await admin.post(`/api/admin/pachtakte/anliegen/${w.id}`, { nach: "in_pruefung" });
    pruefe((await admin.post(`/api/admin/pachtakte/anliegen/${w.id}`, { nach: "erledigt", kommentar: "ok", neuesKontoId: "U-26-XXXXXX" })).status === 422, "Übertragung auf unbekanntes Konto → 422");
    r = await admin.post(`/api/admin/pachtakte/anliegen/${w.id}`, { nach: "erledigt", kommentar: "Übergabevertrag und Grundbuchauszug geprüft.", neuesKontoId: landwirtId });
    pruefe(r.status === 200 && r.json.anliegen.status === "erledigt", "Eigentümerwechsel erledigt", r.json);
  }
  r = await eigen.get("/api/portal/pachtakte");
  pruefe(!r.json.vertraege.some((x) => x.vertrag.id === v2.id) && r.json.frueher.some((x) => x.id === v2.id && x.uebergabe?.ab === "2026-11-01"), "bisheriger Eigentümer: Vertrag unter „Übertragene Verträge“", r.json.frueher);
  r = await landwirt.get("/api/portal/pachtakte");
  pruefe(r.json.vertraege?.some((x) => x.vertrag.id === v2.id), "neuer Eigentümer sieht den übernommenen Vertrag", r.json.vertraege?.length);
  pruefe((await landwirt.post("/api/portal/pachtakte/anliegen", { vertragId: v2.id, art: "zahlungsaufteilung", daten: { grundlage: "miteigentum", empfaenger: [{ name: "A", anteilProzent: 50 }, { name: "B", anteilProzent: 40 }] } })).status === 422, "Zahlungsaufteilung ≠ 100 % → 422");
  r = await landwirt.post("/api/portal/pachtakte/anliegen", { vertragId: v2.id, art: "zahlungsaufteilung", daten: { grundlage: "miteigentum", empfaenger: [{ name: "A", anteilProzent: 50 }, { name: "B", anteilProzent: "50" }] } });
  pruefe(r.status === 200 && /50 % \/ 50 %/.test(r.json.anliegen?.zusammenfassung || ""), "Zahlungsaufteilung 50/50 eingereicht", r.json.anliegen?.zusammenfassung);
  if (r.json.anliegen?.id) {
    r = await landwirt.post(`/api/portal/pachtakte/anliegen/${r.json.anliegen.id}`, { nach: "zurueckgezogen" });
    pruefe(r.status === 200 && r.json.anliegen.status === "zurueckgezogen", "Eigentümer zieht ein Anliegen zurück", r.json.anliegen?.status);
  }

  // Agri-PV-Bewirtschaftungsnachweis
  r = await landwirt.post("/api/portal/flaechen", { bezeichnung: `Fa-Agri ${LAUF}`, land: "AT", bundesland: "Oberösterreich", plz: "5120", ort: "Testgemeinde", ha: 4, nutzung: "acker", agri: true, eigentum: "eigentum" });
  const fAgri = r.json.flaeche;
  const v3 = fAgri?.id ? await vertrag({ eigentuemerId: landwirtId, bezeichnung: `Fa-Agri-Pacht ${LAUF}`, land: "AT", flaecheHa: 4, flaecheId: fAgri.id, beginn: "", beginnArt: "baubeginn", laufzeitJahre: 25, vertragsdatum: "2026-01-01" }) : null;
  pruefe(v3?.id, "Agri-PV-Fläche mit Pachtvertrag (Reservierungsphase)", { f: fAgri?.id, v3 });
  if (v3?.id) {
    const nw = (c, daten, einreichen = true, id, vertragId = v3.id) => c.anfrage("PUT", "/api/portal/pachtakte/agri", { vertragId, id, daten: { jahr: 2025, art: "referenz", kultur: "getreide", gesamtHa: "4", bewirtschaftetHa: "4", ertrag: "72", einheit: "dt", gap: "ja", ...daten }, einreichen });
    pruefe((await nw(landwirt, { art: "betrieb" })).status === 422, "Betriebsjahr vor Pachtbeginn → 422");
    r = await nw(landwirt, {}, false);
    pruefe(r.status === 200 && r.json.nachweis.status === "entwurf", "Referenzjahr als Entwurf gespeichert", r.json);
    r = await nw(landwirt, { ertrag: "70" }, true, r.json.nachweis?.id);
    const n1 = r.json.nachweis;
    pruefe(r.status === 200 && n1?.status === "eingereicht" && n1.daten.ertrag === 70, "Entwurf ergänzt und eingereicht", r.json);
    pruefe((await nw(landwirt, {}, true)).status === 409, "zweiter Nachweis für dasselbe Jahr → 409");
    pruefe((await nw(landwirt, { ertrag: "1" }, true, n1?.id)).status === 409, "eingereichter Nachweis nicht mehr änderbar (409)");
    pruefe((await nw(eigen, {}, true)).status === 403, "Nachweis zu fremdem Vertrag → 403");
    pruefe((await nw(eigen, {}, true, undefined, v2.id)).status === 403, "Nachweis für übertragenen Vertrag (nicht mehr Eigentümer) → 403");
    pruefe((await nw(landwirt, {}, true, undefined, v2.id)).status === 409, "Vertrag ohne Agri-PV-Fläche → 409");
    if (n1?.id) {
      pruefe((await admin.post(`/api/admin/pachtakte/agri/${n1.id}`, { nach: "rueckfrage" })).status === 422, "Rückfrage zum Nachweis ohne Text → 422");
      r = await admin.post(`/api/admin/pachtakte/agri/${n1.id}`, { nach: "bestaetigt" });
      pruefe(r.status === 200 && r.json.nachweis.status === "bestaetigt", "Backoffice bestätigt den Nachweis", r.json);
    }
    r = await landwirt.get("/api/portal/pachtakte");
    const a3 = r.json.vertraege?.find((x) => x.vertrag.id === v3.id);
    pruefe(a3?.agri?.moeglich && a3.agri.referenz?.wert === 70 && a3.fristen.some((f) => f.id === "ende") === false, "Referenzertrag aus dem Nachweis (Reservierungsphase ohne Laufzeitende)", { referenz: a3?.agri?.referenz, fristen: a3?.fristen });
  }

  // Rechte der Backoffice-Unterrollen
  const bt = new Client("bo-transaktion");
  const be = new Client("bo-energie");
  try {
    await bt.login("bo-transaktion@example.com");
    pruefe((await bt.get("/api/admin/pachtakte")).status === 200 && (await bt.post(`/api/admin/pachtakte/anliegen/${k1.id}`, { nach: "in_pruefung" })).status === 403, "Unterrolle Transaktion: lesen ja, schreiben 403");
  } catch (e) {
    pruefe(false, "Unterrolle Transaktion", e.message);
  }
  try {
    await be.login("bo-energie@example.com");
    pruefe((await be.get("/api/admin/pachtakte")).status === 403, "Unterrolle Energie: kein Zugriff (403)");
  } catch (e) {
    pruefe(false, "Unterrolle Energie", e.message);
  }

  // Jahresbescheinigung und Seiten mit dem Demo-Eigentümer
  const demo = new Client("demo-eigentümer-pacht");
  await demo.login("flaeche@example.com");
  r = await demo.get("/api/portal/pachtakte");
  const lech = r.json.vertraege?.find((x) => /Lechfeld/.test(x.vertrag.bezeichnung));
  pruefe(r.status === 200 && lech?.sicherheit.status === "hinterlegt" && r.json.bescheinigungsJahre?.length > 0, "Demo: Lechfeld mit hinterlegter Bürgschaft, Bescheinigungsjahre vorhanden", r.json.bescheinigungsJahre);
  const jahr = r.json.bescheinigungsJahre?.[0];
  if (jahr) {
    const pdf = await demo.get(`/api/portal/pachtakte/bescheinigung/${jahr}`);
    pruefe(pdf.status === 200 && pdf.text.startsWith("%PDF"), `Jahresbescheinigung ${jahr} als PDF`, pdf.status);
  }
  pruefe((await demo.get("/api/portal/pachtakte/bescheinigung/1999")).status === 404, "Jahr ohne Gutschriften → 404");
  pruefe((await eigen.get(`/api/portal/pachtakte/bescheinigung/${jahr || 2025}`)).status === 404, "Konto ohne Gutschriften → 404");
  r = await demo.get("/portal/pachtvertraege", { origin: null });
  pruefe(r.status === 200 && r.text.includes("Jahresbescheinigungen") && r.text.includes("Rückbausicherheit") && r.text.includes("Lechfeld"), "Seite /portal/pachtvertraege", r.status);
  r = await admin.get("/portal/admin/pachtakten", { origin: null });
  pruefe(r.status === 200 && r.text.includes("Pachtakten") && r.text.includes("Offene Anliegen"), "Seite /portal/admin/pachtakten", r.status);
  r = await admin.get(`/portal/admin/pachtakten/${v2.id}`, { origin: null });
  pruefe(r.status === 200 && r.text.includes("Eigentümerhistorie") && r.text.includes(`Fa-Pacht Wechsel ${LAUF}`), "Seite Pachtakte im Backoffice", r.status);
}
