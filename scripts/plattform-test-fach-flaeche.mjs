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
// Eigene Testkonten mit Präfix „fa-“ (example.com).

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

  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen bestanden")} (${ok} ok)`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.message}`));
  process.exit(1);
});
