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
// Eigene Identifizierung: Teil 0 (ohne Server, auch einzeln mit --nur-logik) prüft die MRZ-Logik (kycIdent.js) mit den
// offiziellen ICAO-9303-Specimen und den deutschen Musterdaten, Methodenwahl, Video-Checkliste und – falls Python
// vorhanden – die Gleichheit mit plattform/kyc_ident_kern.py. Abschnitte 11–12 prüfen MRZ und Videoidentifizierung
// gegen den Server (verschlüsselte Ablage, Compliance-Ansicht, Risiko, Termin nur bei Compliance, TAN, Protokoll-PDF,
// Vier-Augen Durchführende/r ≠ Zweitfreigabe, Verdacht ohne Tipping-off, Löschfrist).
// Eigene Konten mit Präfix kyc-test-<Lauf>@example.com; Freigabe-Sperren nur für diese Konten (Pilot), am Ende entfernt.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const NUR_LOGIK = process.argv.includes("--nur-logik");
const BASIS = (process.argv.slice(2).find((a) => a.startsWith("http")) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
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

// ---------------------------------------------------------------- Eigene Identifizierung: Helfer

/** Prüfziffer 7-3-1 – unabhängig von kycIdent.js, damit der Test die Implementierung wirklich prüft */
const pz = (s) => [...s].reduce((a, c, i) => a + (c === "<" ? 0 : /\d/.test(c) ? Number(c) : c.charCodeAt(0) - 55) * [7, 3, 1][i % 3], 0) % 10;
const jjmmtt = (iso) => `${iso.slice(2, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}`;
/** Gültige TD1-MRZ (Ausweiskarte, Deutschland „D“) mit berechneten Prüfziffern */
function td1({ nummer = "T22000129", geb, ablauf, nachname, vorname, staat = "D", aussteller = "D" }) {
  const nr = nummer.padEnd(9, "<");
  const a = `ID${aussteller.padEnd(3, "<")}${nr}${pz(nr)}`.padEnd(30, "<");
  const b0 = `${jjmmtt(geb)}${pz(jjmmtt(geb))}F${jjmmtt(ablauf)}${pz(jjmmtt(ablauf))}${staat.padEnd(3, "<")}`.padEnd(29, "<");
  const b = b0 + pz(a.slice(5, 30) + b0.slice(0, 7) + b0.slice(8, 15) + b0.slice(18, 29));
  return [a, b, `${nachname}<<${vorname}`.toUpperCase().padEnd(30, "<")];
}
const nurBuchstaben = (s) => s.replace(/\d/g, (d) => "ABCDEFGHIJ"[d]).toUpperCase();

async function logikTeil() {
  abschnitt("0. Eigene Identifizierung – Logik ohne Server (MRZ ICAO 9303, Wege, Video-Checkliste)");
  const m = await import(pathToFileURL(path.join(process.cwd(), "src/lib/plattform/kycIdent.js")).href);
  const B = m.MRZ_BEISPIELE;
  const h2010 = new Date("2010-01-01T12:00:00Z");
  const ids = (b, ampel) => new Set(b.befunde.filter((x) => !ampel || x.ampel === ampel).map((x) => x.id));
  pruefe(m.mrzPruefziffer("L898902C3") === 6 && m.mrzPruefziffer("740812") === 2 && m.mrzPruefziffer("T22000129") === 3 && pz("D23145890") === m.mrzPruefziffer("D23145890"), "Prüfziffer 7-3-1 (ICAO-Beispiele, deutsche Musterdaten)");
  for (const [k, fmt] of [["icaoTd3", "TD3"], ["icaoTd1", "TD1"], ["icaoTd2", "TD2"], ["deTd1", "TD1"]]) {
    const z = m.mrzZerlegen(B[k], { heute: h2010 });
    pruefe(z.format === fmt && z.pruefziffern.length >= 4 && z.pruefziffern.every((x) => x.ok), `Specimen ${k}: Format ${fmt}, alle Prüfziffern korrekt`, z.pruefziffern);
  }
  const td3 = m.mrzZerlegen(B.icaoTd3, { heute: h2010 }).felder;
  pruefe(td3.nachname === "ERIKSSON" && td3.vornamen === "ANNA MARIA" && td3.geburtsdatum === "1974-08-12" && td3.gueltigBis === "2012-04-15" && td3.dokumentart === "reisepass", "TD3 zerlegt: ERIKSSON ANNA MARIA, 1974-08-12, gültig bis 2012-04-15", td3);
  const anna = m.mrzBefund(B.icaoTd3, { vorname: "Anna Maria", nachname: "Eriksson", geburtsdatum: "1974-08-12", staatsangehoerigkeit: "SE", ausweis: { art: "reisepass", nummer: "L898902C3" } }, { heute: h2010 });
  pruefe(anna.ampel === "gelb" && ids(anna, "gelb").has("muster") && !ids(anna, "rot").size && ids(anna, "gruen").has("name_nachname") && ids(anna, "gruen").has("dokumentnummer"), "ICAO-Specimen: Abgleich grün, Musterdaten als Hinweis (gelb)", [...ids(anna, "gelb")]);
  const erika = m.mrzBefund(B.deTd1, { vorname: "Erika", nachname: "Mustermann", geburtsdatum: "1964-08-12", staatsangehoerigkeit: "DE", ausweis: { art: "personalausweis", nummer: "T22000129", gueltigBis: "2020-10-31" } }, { heute: h2010 });
  pruefe(!ids(erika, "rot").size && [...ids(erika, "gelb")].join() === "muster" && ids(erika, "gruen").has("staatsangehoerigkeit"), "Deutsche Musterdaten MUSTERMANN ERIKA: „D“ → DE, nur Hinweis „Muster“", [...ids(erika, "gelb")]);
  const falsch = [...B.icaoTd3];
  falsch[1] = `${falsch[1].slice(0, 9)}7${falsch[1].slice(10)}`;
  const rot = m.mrzBefund(falsch, {}, { heute: h2010 });
  pruefe(rot.ampel === "rot" && ids(rot, "rot").has("pz_dokumentnummer") && ids(rot, "rot").has("pz_gesamt"), "Prüfziffernfehler → rot (Dokumentnummer + Gesamt)");
  pruefe(ids(m.mrzBefund(B.icaoTd3, {}, { heute: new Date("2026-09-30T12:00:00Z") }), "rot").has("abgelaufen"), "Ablauf in der Vergangenheit → rot");
  const heute = new Date("2026-09-30T12:00:00Z");
  const jung = td1({ geb: "2012-05-05", ablauf: "2030-05-05", nachname: "KLEIN", vorname: "MIA" });
  pruefe(ids(m.mrzBefund(jung, {}, { heute }), "rot").has("minderjaehrig"), "Alter < 18 → rot");
  const mueller = td1({ geb: "1980-02-03", ablauf: "2031-01-01", nachname: "MUELLER", vorname: "JOERG<PETER" });
  const bm = m.mrzBefund(mueller, { vorname: "Jörg", nachname: "Müller", geburtsdatum: "1980-02-03", staatsangehoerigkeit: "DE", ausweis: { art: "personalausweis", nummer: "T22000129", gueltigBis: "2031-01-01" } }, { heute });
  pruefe(bm.ampel === "gruen", "Umlaute/Transliteration tolerant (Müller ↔ MUELLER, Rufname Jörg)", bm.befunde.filter((x) => x.ampel !== "gruen"));
  const gross = td1({ geb: "1980-02-03", ablauf: "2031-01-01", nachname: "GROSS", vorname: "ANNA" });
  pruefe(ids(m.mrzBefund(gross, { nachname: "Groß", vorname: "Anna" }, { heute }), "gruen").has("name_nachname"), "ß → SS");
  const abw = m.mrzBefund(mueller, { vorname: "Jürgen", nachname: "Maier", geburtsdatum: "1980-02-04", staatsangehoerigkeit: "AT", ausweis: { art: "reisepass", nummer: "X1", gueltigBis: "2031-01-02" } }, { heute });
  pruefe([...ids(abw, "rot")].sort().join() === "dokumentnummer,geburtsdatum,name_nachname" && [...ids(abw, "gelb")].sort().join() === "dokumentart,gueltig_bis,name_vorname,staatsangehoerigkeit", "Abweichungen: Nachname/Geburtsdatum/Nummer rot, Vorname/Staat/Art/Gültigkeit gelb", { rot: [...ids(abw, "rot")], gelb: [...ids(abw, "gelb")] });
  pruefe(m.mrzZeilen(B.icaoTd1.join("")).join("|") === B.icaoTd1.join("|") && m.mrzBefund(["ABC"], {}).ampel === "rot", "Einzeilige Eingabe wird aufgeteilt, unbekanntes Format rot");
  const METH = [{ id: "eid", verfuegbar: false }, { id: "video_intern", verfuegbar: true }, { id: "extern", verfuegbar: true }];
  const w1 = Object.fromEntries(m.kycMethodenBewerten(METH, { risiko: "mittel" }).map((x) => [x.id, x]));
  const w2 = Object.fromEntries(m.kycMethodenBewerten(METH.map((x) => ({ ...x, verfuegbar: true })), { risiko: "hoch" }).map((x) => [x.id, x]));
  pruefe(!w1.eid.zulaessig && w1.video_intern.empfohlen && w2.eid.empfohlen && !w2.extern.zulaessig, "Wege: eID erst nach Freischaltung, Empfehlung in Reihenfolge, extern bei Risiko hoch nicht zulässig");
  const alle = Object.fromEntries(m.KYC_VIDEO_PUNKT_IDS.filter((x) => x !== "tan").map((x) => [x, { ok: true }]));
  pruefe(m.videoAbschlussPruefen({ punkte: alle, tan: { bestaetigt: true } }, { ergebnis: "bestanden", begruendung: "Alle Merkmale geprüft." }).ok
    && !m.videoAbschlussPruefen({ punkte: alle, tan: { bestaetigt: false } }, { ergebnis: "bestanden", begruendung: "Alle Merkmale geprüft." }).ok
    && !m.videoAbschlussPruefen({}, { ergebnis: "abgebrochen", begruendung: "Verbindung abgerissen" }).ok
    && !m.videoAbschlussPruefen({}, { ergebnis: "verdacht", begruendung: "kurz" }).ok, "Video: bestanden nur mit allen Pflichtpunkten + TAN, Abbruch mit Grund, jede Entscheidung begründet");
  pruefe(m.KYC_VIDEO_CHECKLISTE.length >= 10 && ["einwilligung", "lichtbild", "hologramm", "rueckseite", "seriennummer", "plausibilitaet", "tan"].every((x) => m.KYC_VIDEO_PUNKT_IDS.includes(x)) && /Muster/.test(m.KYC_VIDEO_HINWEIS), "Pflicht-Checkliste vollständig und als Muster gekennzeichnet");
  // Gleichheit mit Frappe (kyc_ident_kern.py), falls Python vorhanden
  const faelle = { anna: [B.icaoTd3, { vorname: "Anna Maria", nachname: "Eriksson", geburtsdatum: "1974-08-12", staatsangehoerigkeit: "SE", ausweis: { art: "reisepass", nummer: "L898902C3" } }, "2010-01-01"], falsch: [falsch, {}, "2010-01-01"], mueller: [mueller, { vorname: "Jörg", nachname: "Müller", geburtsdatum: "1980-02-03", staatsangehoerigkeit: "DE", ausweis: { art: "personalausweis", nummer: "T22000129", gueltigBis: "2031-01-01" } }, "2026-09-30"], abw: [mueller, { vorname: "Jürgen", nachname: "Maier", geburtsdatum: "1980-02-04", staatsangehoerigkeit: "AT", ausweis: { art: "reisepass", nummer: "X1", gueltigBis: "2031-01-02" } }, "2026-09-30"], td2: [B.icaoTd2, {}, "2010-01-01"], jung: [jung, {}, "2026-09-30"] };
  const py = spawnSync(process.env.PYTHON || "python", ["-c", "import sys,json,datetime;sys.path.insert(0,'Backend-Import/oekoinvest_app');from oekoinvest_app.plattform import kyc_ident_kern as ik;d=json.loads(sys.stdin.buffer.read().decode('utf-8'));print(json.dumps({k:[[b['id'],b['ampel']] for b in ik.mrz_befund(v[0],v[1],datetime.date.fromisoformat(v[2]))['befunde']] for k,v in d.items()}))"], { input: JSON.stringify(faelle), encoding: "utf8", timeout: 30000 });
  if (py.status === 0) {
    const pyErg = JSON.parse(py.stdout);
    const js = Object.fromEntries(Object.entries(faelle).map(([k, [z, soll, tag]]) => [k, m.mrzBefund(z, soll, { heute: new Date(`${tag}T12:00:00Z`) }).befunde.map((b) => [b.id, b.ampel])]));
    pruefe(JSON.stringify(js) === JSON.stringify(pyErg), "JS (kycIdent.js) und Python (kyc_ident_kern.py) liefern identische Befunde", Object.keys(js).filter((k) => JSON.stringify(js[k]) !== JSON.stringify(pyErg[k])));
  } else console.log(`  – Python nicht verfügbar, Gleichheitsprüfung übersprungen (${(py.stderr || py.error?.message || "").slice(0, 120)})`);
}

async function identTeil({ comp, comp2, admin, gast }) {
  let r;
  abschnitt("11. MRZ im KYC-Fall (verschlüsselt, Live-Befund, Compliance-Ansicht, Risiko)");
  const endung = nurBuchstaben(LAUF);
  const mz = new Client("mrz");
  await mz.registrieren("mrz", ["investor"], "Erika", `Probe${endung}`);
  const nach = `Probe${endung}`;
  const gueltig = inTagen(1500);
  r = await mz.patch("/api/portal/kyc", { abschnitt: "kontotyp", daten: { kontotyp: "privat" } });
  const fallMz = r.json.fall?.id;
  await mz.patch("/api/portal/kyc", { abschnitt: "person", daten: person("Erika", nach, "1980-02-03") });
  r = await mz.get("/api/portal/kyc");
  const wege = Object.fromEntries((r.json.methoden || []).map((x) => [x.id, x]));
  const empfohlen = (r.json.methoden || []).find((x) => x.empfohlen);
  pruefe(wege.video_intern?.zulaessig && wege.eid && wege.extern && empfohlen?.id === (r.json.methoden || []).find((x) => x.verfuegbar && x.zulaessig)?.id && r.json.methoden[0].id === "eid", "Methodenwahl: drei Wege in fester Reihenfolge (eID → Video → Anbieter), Empfehlung = erster zulässige", r.json.methoden?.map((x) => `${x.id}:${x.verfuegbar}/${x.zulaessig}/${x.empfohlen}`));
  if (!wege.eid?.verfuegbar) {
    r = await mz.patch("/api/portal/kyc", { abschnitt: "methode", daten: { methode: "eid" } });
    pruefe(r.status === 422, "Nicht verfügbarer Weg (eID) → 422", r.status);
  }
  r = await mz.post("/api/portal/kyc/video", { aktion: "buchen", start: new Date().toISOString() });
  pruefe(r.status === 422, "Videotermin ohne gewählten Weg „Video“ → 422", r.status);
  r = await mz.patch("/api/portal/kyc", { abschnitt: "methode", daten: { methode: "video_intern" } });
  pruefe(r.status === 200 && r.json.fall?.methode === "video_intern" && r.json.anforderungen?.some((a) => a.id === "mrz" && a.pflicht && !a.erfuellt), "Weg „Ausweis + Video“ gewählt → MRZ und Videotermin werden Pflicht", r.json.fall?.methode);
  const zeilen = td1({ geb: "1980-02-03", ablauf: gueltig, nachname: nach, vorname: "Erika" });
  const kaputt = [...zeilen];
  kaputt[1] = `${kaputt[1].slice(0, 6)}${(pz(kaputt[1].slice(0, 6)) + 1) % 10}${kaputt[1].slice(7)}`;
  r = await mz.patch("/api/portal/kyc", { abschnitt: "mrz", daten: { zeilen: kaputt } });
  pruefe(r.status === 200 && r.json.fall?.mrz?.ampel === "rot" && r.json.fall.mrz.befunde.some((b) => b.id === "pz_geburtsdatum" && b.ampel === "rot"), "Server prüft erneut: Prüfziffer Geburtsdatum falsch → rot", r.json.fall?.mrz?.befunde?.filter((b) => b.ampel !== "gruen"));
  r = await mz.patch("/api/portal/kyc", { abschnitt: "mrz", daten: { zeilen } });
  const mrzNutzer = r.json.fall?.mrz;
  pruefe(r.status === 200 && mrzNutzer?.ampel === "gruen" && mrzNutzer.format === "TD1", "Korrekte MRZ (TD1) + Abgleich mit den Angaben → grün", mrzNutzer?.befunde?.filter((b) => b.ampel !== "gruen"));
  pruefe(!JSON.stringify(r.json).includes(zeilen[1]) && !("chiffrat" in (mrzNutzer || {})) && !("zeilen" in (mrzNutzer || {})), "Antwort an den Nutzer ohne MRZ-Zeilen und ohne Chiffrat");
  let roh = readFileSync(path.join(process.cwd(), ".data", "plattform.json"), "utf8");
  pruefe(!roh.includes(zeilen[1]) && !roh.includes(zeilen[0]), "MRZ-Zeilen liegen nicht im Klartext in der Demo-Datenbank (verschlüsselt)");
  r = await mz.patch("/api/portal/kyc", { abschnitt: "mrz", daten: { zeilen: ["P<ZU<KURZ"] } });
  pruefe(r.status === 422, "Unvollständige MRZ → 422", r.status);
  r = await mz.patch("/api/portal/kyc", { abschnitt: "person", daten: person("Erika", "Anders", "1980-02-03") });
  pruefe(r.json.fall?.mrz?.ampel === "rot" && r.json.fall.mrz.befunde.some((b) => b.id === "name_nachname" && b.ampel === "rot"), "Geänderte Personenangaben → MRZ-Abgleich neu bewertet (Nachname rot)", r.json.fall?.mrz?.ampel);
  await mz.patch("/api/portal/kyc", { abschnitt: "person", daten: person("Erika", nach, "1980-02-03") });
  r = await comp.get(`/api/admin/compliance/${fallMz}`);
  pruefe(r.status === 200 && r.json.fall?.mrz?.ampel === "gruen" && r.json.fall.mrz.zeilen?.join("|") === zeilen.join("|") && r.json.fall.methode === "video_intern", "Compliance sieht Befund, Ampel und entschlüsselte Zeilen", r.json.fall?.mrz?.ampel);
  pruefe(Array.isArray(r.json.fall?.identGruende) && r.json.fall.identGruende.some((g) => /noch nicht bestanden/.test(g)), "Freigabe-Hinweis: Videoidentifizierung noch nicht bestanden", r.json.fall?.identGruende);
  r = await admin.get(`/api/admin/compliance/${fallMz}`);
  pruefe(r.status === 403, "Leitung ohne Unterrolle Compliance: keine MRZ (403)", r.status);

  abschnitt("12. Videoidentifizierung durch die Compliance (Termin, Checkliste, TAN, Protokoll, Vier-Augen, Verdacht)");
  r = await comp.get("/api/admin/compliance/einstellungen");
  const vorher = { methoden: r.json.einstellungen?.methoden, videoLink: r.json.einstellungen?.videoLink || "", identifizierungPflicht: !!r.json.einstellungen?.identifizierungPflicht };
  try {
    r = await comp.put("/api/admin/compliance/einstellungen", { videoLink: "http://unsicher.example.org" });
    pruefe(r.status === 422, "Videolink nur mit https:// (422)", r.status);
    r = await comp.put("/api/admin/compliance/einstellungen", { videoLink: "https://meet.example.org/oekoinvest-kyc-demo" });
    pruefe(r.status === 200 && r.json.einstellungen?.videoLink === "https://meet.example.org/oekoinvest-kyc-demo", "Compliance hinterlegt den Link zum Videokonferenz-Werkzeug (Platzhalter)", r.json);
    r = await admin.put("/api/admin/compliance/einstellungen", { methoden: { niedrig: ["eid"] } });
    pruefe(r.status === 403, "Zulässige Wege ändert nur die Compliance (403)", r.status);
    r = await mz.get("/api/portal/kyc/video");
    pruefe(r.status === 200 && r.json.buchbar === true && r.json.slots?.length > 0 && /kein Video auf/.test(r.json.datenschutz || ""), "Nutzer sieht freie Videotermine und den Datenschutzhinweis", { buchbar: r.json.buchbar, slots: r.json.slots?.length });
    r = await admin.get("/api/portal/termine/slots?art=identifizierung");
    const durchfuehrende = new Set((r.json.slots || []).flatMap((s) => (s.mitarbeiter || []).map((x) => x.id)));
    pruefe(r.status === 200 && durchfuehrende.size > 0 && [...durchfuehrende].every((id) => [comp.nutzer.id, comp2.nutzer.id].includes(id)), "Terminart „Identifizierung“: nur Compliance-Mitarbeiter als Durchführende", [...durchfuehrende]);
    const slots = (await mz.get("/api/portal/kyc/video")).json.slots || [];
    r = await mz.post("/api/portal/kyc/video", { aktion: "buchen", start: slots[0]?.start });
    pruefe(r.status === 200 && r.json.video?.status === "gebucht" && r.json.video.termin?.id && r.json.videoLink === "https://meet.example.org/oekoinvest-kyc-demo", "Videotermin gebucht (vorhandene Terminbuchung), Link sichtbar", r.json.video);
    r = await mz.post("/api/portal/kyc/video", { aktion: "buchen", start: slots[1]?.start });
    pruefe(r.status === 409, "Zweiter Termin → 409", r.status);
    r = await mz.get("/api/portal/termine");
    pruefe((r.json.termine || r.json.liste || []).some?.((t) => t.art === "identifizierung") ?? true, "Termin erscheint unter „Meine Termine“", Object.keys(r.json));
    // Einreichen (Termin gebucht genügt), Verifizieren vor bestandenem Gespräch gesperrt
    await hochladen(mz, pdfBytes("Ausweis vorne MRZ"), "vorne.pdf", { art: "ausweis_vorne" });
    await hochladen(mz, pdfBytes("Ausweis hinten MRZ"), "hinten.pdf", { art: "ausweis_hinten" });
    await mz.patch("/api/portal/kyc", { abschnitt: "pep", daten: { istPep: false, naheStehend: false } });
    await mz.patch("/api/portal/kyc", { abschnitt: "mittelherkunft", daten: { ticket: "bis250k", quellen: ["eigenkapital"] } });
    r = await mz.post("/api/portal/kyc/einreichen", {});
    pruefe(r.status === 200 && r.json.fall?.status === "eingereicht", "Einreichen mit MRZ und gebuchtem Videotermin", r.json);
    r = await verifizieren(comp, fallMz);
    pruefe(r.status === 409 && /Videoidentifizierung/.test(r.json.error || ""), "Verifizieren vor bestandener Videoidentifizierung → 409", r.json);
    // Gespräch
    r = await mz.post(`/api/admin/compliance/${fallMz}/video`, { aktion: "start" });
    pruefe(r.status === 403, "Nutzer kann kein Gespräch protokollieren (403)", r.status);
    r = await admin.post(`/api/admin/compliance/${fallMz}/video`, { aktion: "start" });
    pruefe(r.status === 403, "Leitung ohne Unterrolle Compliance → 403", r.status);
    r = await comp.post(`/api/admin/compliance/${fallMz}/video`, { aktion: "start" });
    pruefe(r.status === 200 && r.json.protokollId, "Compliance beginnt das Gespräch (Durchführende/r)", r.json);
    const pid = r.json.protokollId;
    r = await comp2.post(`/api/admin/compliance/${fallMz}/video`, { aktion: "punkt", punkt: "lichtbild", ok: true });
    pruefe(r.status === 409, "Andere Compliance-Person kann das laufende Gespräch nicht protokollieren (409)", r.status);
    r = await comp.post(`/api/admin/compliance/${fallMz}/video`, { aktion: "abschluss", ergebnis: "bestanden", begruendung: "Zu früh abgeschlossen – Test." });
    pruefe(r.status === 422 && /Pflichtpunkte|Einmalcode/.test(r.json.error || ""), "„Bestanden“ ohne Pflichtpunkte/TAN → 422", r.json);
    for (const p of ["einwilligung", "umgebung", "lichtbild", "vorderseite", "rueckseite", "hologramm", "schriftbild", "beschaedigung", "seriennummer", "plausibilitaet"]) {
      r = await comp.post(`/api/admin/compliance/${fallMz}/video`, { aktion: "punkt", punkt: p, ok: true, notiz: p === "hologramm" ? "Kinegramm beim Kippen einwandfrei" : "" });
      if (r.status !== 200) break;
    }
    pruefe(r.status === 200, "Alle Punkte der Pflicht-Checkliste mit Zeitstempel bestätigt", r.json);
    r = await comp.post(`/api/admin/compliance/${fallMz}/video`, { aktion: "tan_senden", kanal: "sms" });
    pruefe(r.status === 422 && /SMS/.test(r.json.error || ""), "SMS-Versand nicht eingerichtet → klare Meldung (422)", r.json);
    r = await comp.post(`/api/admin/compliance/${fallMz}/video`, { aktion: "tan_senden", kanal: "email" });
    pruefe(r.status === 200 && /gesendet/.test(r.json.hinweis || ""), "Einmalcode per E-Mail gesendet (Adresse maskiert)", r.json.hinweis);
    r = await admin.get("/api/admin/postausgang?limit=60");
    const mail = (r.json.mails || []).find((x) => x.an === mz.email && /Bestätigungscode/.test(x.betreff));
    const code = mail?.text?.match(/\b(\d{6})\b/)?.[1];
    pruefe(!!code, "E-Mail mit 6-stelligem Code im (Demo-)Postausgang", mail?.betreff);
    r = await comp.post(`/api/admin/compliance/${fallMz}/video`, { aktion: "tan_pruefen", code: code === "000000" ? "111111" : "000000" });
    pruefe(r.status === 422 && /noch 2 Versuche/.test(r.json.error || ""), "Falscher Code → 422, Versuch gezählt", r.json);
    r = await comp.get(`/api/admin/compliance/${fallMz}`);
    const lauf = (r.json.fall?.video?.protokolle || []).find((p) => p.id === pid);
    pruefe(lauf?.tan?.versuche === 1 && !("hash" in (lauf?.tan || {})) && !JSON.stringify(r.json).includes(`"${code}"`), "Compliance-Ansicht: Fehlversuch gezählt, kein TAN-Hash/Code ausgegeben", lauf?.tan);
    r = await comp.post(`/api/admin/compliance/${fallMz}/video`, { aktion: "tan_pruefen", code });
    pruefe(r.status === 200 && /bestätigt/.test(r.json.hinweis || ""), "Vorgelesener Code bestätigt", r.json);
    r = await comp.post(`/api/admin/compliance/${fallMz}/video`, { aktion: "abschluss", ergebnis: "bestanden", begruendung: "kurz" });
    pruefe(r.status === 422, "Abschluss ohne ausreichende Begründung → 422", r.status);
    r = await comp.post(`/api/admin/compliance/${fallMz}/video`, { aktion: "abschluss", ergebnis: "bestanden", begruendung: "Lichtbild, Sicherheitsmerkmale und Angaben stimmen, TAN bestätigt." });
    pruefe(r.status === 200 && /bestanden/.test(r.json.hinweis || ""), "Videoidentifizierung bestanden", r.json);
    r = await comp.get(`/api/admin/compliance/${fallMz}`);
    const fertig = (r.json.fall?.video?.protokolle || []).find((p) => p.id === pid);
    pruefe(r.json.fall?.video?.status === "bestanden" && /^[0-9a-f]{64}$/.test(fertig?.hash || "") && fertig.eintraege.length >= 14 && fertig.eintraege.every((e) => e.am && e.vonId) && fertig.durchfuehrender, "Protokoll mit Zeitstempeln, Durchführender und SHA-256", { status: r.json.fall?.video?.status, eintraege: fertig?.eintraege?.length });
    pruefe((r.json.fall?.zugriffe || []).some((z) => z.aktion === "kyc_video"), "Gesprächsschritte im Revisionsprotokoll (Hash-Kette)");
    r = await comp.get(`/api/admin/compliance/${fallMz}/video?protokoll=${pid}`, { roh: false });
    pruefe(r.status === 200 && /application\/pdf/.test(r.headers.get("content-type") || "") && r.text.startsWith("%PDF") && /no-store/.test(r.headers.get("cache-control") || ""), "Protokoll als PDF (no-store)", r.status);
    r = await mz.get(`/api/admin/compliance/${fallMz}/video?protokoll=${pid}`);
    pruefe(r.status === 403, "Nutzer: kein Zugriff auf das Protokoll-PDF (403)", r.status);
    r = await gast.get(`/api/admin/compliance/${fallMz}/video?protokoll=${pid}`);
    pruefe(r.status === 401, "ohne Anmeldung → 401", r.status);
    r = await mz.get("/api/portal/kyc");
    pruefe(r.json.fall?.video?.status === "abgeschlossen" && !JSON.stringify(r.json.fall.video).includes("bestanden"), "Nutzer sieht „abgeschlossen“ (kein Ergebnisdetail)", r.json.fall?.video);
    r = await verifizieren(comp, fallMz);
    pruefe(r.status === 200 && r.json.status === "verifiziert", "Niedriges Risiko: Verifizierung nach bestandener Videoidentifizierung", r.json);

    // Vier-Augen: hohes Risiko – wer das Gespräch geführt hat, gibt nicht zweitfrei; zuvor ein abgebrochenes Gespräch
    const vh = new Client("video-hoch");
    await vh.registrieren("vhoch", ["investor"], "Hanna", `Hoch${endung}`);
    const kv = await kycPrivat(vh, { vorname: "Hanna", nachname: `Hoch${endung}`, investor: true, pep: true });
    await vh.patch("/api/portal/kyc", { abschnitt: "methode", daten: { methode: "video_intern" } });
    await vh.patch("/api/portal/kyc", { abschnitt: "mrz", daten: { zeilen: td1({ geb: "1980-02-03", ablauf: gueltig, nachname: `Hoch${endung}`, vorname: "Hanna" }) } });
    const fallVh = kv.fall.id;
    r = await vh.get("/api/portal/kyc");
    pruefe(!(r.json.methoden || []).find((x) => x.id === "extern")?.zulaessig, "PEP → Risiko hoch: externer Anbieter laut Standard-Einstellung nicht zulässig", r.json.methoden?.map((x) => `${x.id}:${x.zulaessig}`));
    let s2 = (await vh.get("/api/portal/kyc/video")).json.slots || [];
    r = await vh.post("/api/portal/kyc/video", { aktion: "buchen", start: s2[2]?.start || s2[0]?.start });
    pruefe(r.status === 200, "Zweites Konto bucht Videotermin", r.json);
    await hochladen(vh, pdfBytes("Nachweis Mittelherkunft"), "mittel.pdf", { art: "mittelherkunft" }); // hohes Risiko (PEP) → Nachweis Pflicht
    await vh.post("/api/portal/kyc/einreichen", {});
    await comp.post(`/api/admin/compliance/${fallVh}/video`, { aktion: "start" });
    r = await comp.post(`/api/admin/compliance/${fallVh}/video`, { aktion: "abschluss", ergebnis: "abgebrochen", begruendung: "Verbindung mehrfach abgerissen, Bild unscharf." });
    pruefe(r.status === 422 && /Abbruchgrund/.test(r.json.error || ""), "Abbruch ohne Abbruchgrund → 422", r.json);
    r = await comp.post(`/api/admin/compliance/${fallVh}/video`, { aktion: "abschluss", ergebnis: "abgebrochen", abbruchgrund: "technik", begruendung: "Verbindung mehrfach abgerissen, Bild unscharf." });
    pruefe(r.status === 200, "Gespräch abgebrochen (Grund: Technik)", r.json);
    r = await vh.get("/api/portal/kyc/video");
    pruefe(r.json.video?.status === "abgebrochen" && r.json.buchbar === true && r.json.video.gespraeche === 1, "Nutzer: Gespräch abgebrochen, Termin als stattgefunden verbucht → neuer Termin buchbar", r.json.video);
    r = await vh.get("/api/portal/kyc");
    pruefe(r.json.anforderungen?.some((a) => a.id === "video" && !a.erfuellt && /neuen Termin/.test(a.hinweis || "")), "Anforderung „Videotermin“ wieder offen mit Hinweis", r.json.anforderungen?.find((a) => a.id === "video"));
    s2 = (await vh.get("/api/portal/kyc/video")).json.slots || [];
    r = await vh.post("/api/portal/kyc/video", { aktion: "buchen", start: s2[3]?.start || s2[0]?.start });
    r = await vh.post("/api/portal/kyc/video", { aktion: "stornieren" });
    pruefe(r.status === 200 && r.json.buchbar === true && !r.json.video?.termin, "Termin abgesagt (vorhandene Terminverwaltung) → wieder buchbar", r.json.video);
    s2 = r.json.slots || [];
    r = await vh.post("/api/portal/kyc/video", { aktion: "buchen", start: s2[3]?.start || s2[0]?.start });
    pruefe(r.status === 200 && r.json.video?.status === "gebucht", "Neuer Termin gebucht", r.json.video);
    await comp.post(`/api/admin/compliance/${fallVh}/video`, { aktion: "start" });
    for (const p of ["einwilligung", "umgebung", "lichtbild", "vorderseite", "rueckseite", "hologramm", "schriftbild", "beschaedigung", "seriennummer", "plausibilitaet"]) await comp.post(`/api/admin/compliance/${fallVh}/video`, { aktion: "punkt", punkt: p, ok: true });
    await comp.post(`/api/admin/compliance/${fallVh}/video`, { aktion: "tan_senden", kanal: "email" });
    const code2 = ((await admin.get("/api/admin/postausgang?limit=60")).json.mails || []).find((x) => x.an === vh.email && /Bestätigungscode/.test(x.betreff))?.text?.match(/\b(\d{6})\b/)?.[1];
    await comp.post(`/api/admin/compliance/${fallVh}/video`, { aktion: "tan_pruefen", code: code2 });
    r = await comp.post(`/api/admin/compliance/${fallVh}/video`, { aktion: "abschluss", ergebnis: "bestanden", begruendung: "Alle Merkmale geprüft, Person eindeutig identifiziert." });
    pruefe(r.status === 200, "Zweites Gespräch bestanden", r.json);
    r = await verifizieren(comp2, fallVh);
    pruefe(r.status === 200 && r.json.status === "zweitpruefung", "Risiko hoch: Erstprüfung durch die zweite Compliance-Person → Zweitfreigabe nötig", r.json);
    r = await comp.post(`/api/admin/compliance/${fallVh}`, { aktion: "zweitfreigabe", ergebnis: "verifiziert", grund: "Zweitprüfung" });
    pruefe(r.status === 409 && /Videoidentifizierung durchgeführt/.test(r.json.error || ""), "Vier-Augen: Durchführende/r des Gesprächs darf nicht zweitfreigeben (409)", r.json);

    // Verdacht: Risiko hoch, Verifizierung gesperrt, Person erfährt nichts
    const vd = new Client("video-verdacht");
    await vd.registrieren("vvogel", ["investor"], "Veit", `Vogel${endung}`);
    const kd = await kycPrivat(vd, { vorname: "Veit", nachname: `Vogel${endung}`, investor: true });
    await vd.patch("/api/portal/kyc", { abschnitt: "methode", daten: { methode: "video_intern" } });
    await vd.patch("/api/portal/kyc", { abschnitt: "mrz", daten: { zeilen: td1({ geb: "1980-02-03", ablauf: gueltig, nachname: `Vogel${endung}`, vorname: "Veit" }) } });
    const s3 = (await vd.get("/api/portal/kyc/video")).json.slots || [];
    await vd.post("/api/portal/kyc/video", { aktion: "buchen", start: s3[4]?.start || s3[0]?.start });
    await vd.post("/api/portal/kyc/einreichen", {});
    await comp.post(`/api/admin/compliance/${kd.fall.id}/video`, { aktion: "start" });
    r = await comp.post(`/api/admin/compliance/${kd.fall.id}/video`, { aktion: "abschluss", ergebnis: "verdacht", begruendung: "Lichtbild weicht deutlich ab, Hologramm beim Kippen ohne Farbwechsel." });
    pruefe(r.status === 200 && /nicht informiert/.test(r.json.hinweis || ""), "Verdacht dokumentiert (Hinweis: Person nicht informieren)", r.json);
    r = await comp.get(`/api/admin/compliance/${kd.fall.id}`);
    pruefe(r.json.fall?.risiko === "hoch" && r.json.fall.risikoRegel?.gruende?.some((g) => /Videoidentifizierung: Verdacht/.test(g)) && r.json.fall.video?.status === "verdacht", "Verdacht fließt in die Risikobewertung ein (hoch)", r.json.fall?.risikoRegel);
    r = await verifizieren(comp2, kd.fall.id);
    pruefe(r.status === 409 && /Verdacht/.test(r.json.error || ""), "Verifizierung bei Verdacht gesperrt (409)", r.json);
    r = await vd.get("/api/portal/kyc");
    pruefe(r.json.fall?.video?.status === "abgeschlossen" && !/verdacht/i.test(JSON.stringify(r.json)), "Nutzer sieht nur „abgeschlossen“ – kein Hinweis auf Verdacht (Tipping-off)", r.json.fall?.video);
    r = await vd.get("/api/portal/benachrichtigungen");
    pruefe(!JSON.stringify(r.json).includes("Verdacht –") && !/mit Verdacht/.test(JSON.stringify(r.json)), "Keine Benachrichtigung über den Verdacht an die Person");

    // Löschfrist: MRZ und Videoprotokolle fallen mit dem Fall
    r = await comp.post(`/api/admin/compliance/${fallMz}`, { aktion: "beziehungEnde", datum: "2020-03-31" });
    r = await comp.post("/api/admin/compliance/fristen", { fallId: fallMz });
    pruefe(r.status === 200 && r.json.geloescht === 1, "Löschfrist abgelaufen → Fall gelöscht", r.json);
    r = await comp.get(`/api/admin/compliance/${fallMz}`);
    pruefe(!r.json.fall?.mrz && !(r.json.fall?.video?.protokolle || []).length, "MRZ (verschlüsselt) und Videoprotokolle mitgelöscht", { mrz: r.json.fall?.mrz, video: r.json.fall?.video?.anzahl });
    roh = readFileSync(path.join(process.cwd(), ".data", "plattform.json"), "utf8");
    pruefe(!roh.includes(`"${fallMz}:mrz"`) && !roh.includes(zeilen[2]), "Keine MRZ-Reste in der Datenbank");

    abschnitt("12b. Seiten mit Identifizierung");
    for (const [c, pf] of [[vh, "/portal/verifizierung"], [comp, `/portal/admin/compliance/${fallVh}`], [comp, "/portal/admin/compliance"]]) {
      r = await c.get(pf);
      pruefe(r.status === 200 && !/Application error|Unhandled Runtime Error/.test(r.text), `${pf} (${c.name}) → 200`, r.status);
    }
    r = await vh.get("/portal/verifizierung");
    pruefe(!r.text.includes(td1({ geb: "1980-02-03", ablauf: gueltig, nachname: `Hoch${endung}`, vorname: "Hanna" })[1]), "Verifizierungsseite enthält die MRZ nicht im Klartext");
  } finally {
    await comp.put("/api/admin/compliance/einstellungen", vorher.methoden ? { methoden: vorher.methoden, videoLink: vorher.videoLink, identifizierungPflicht: vorher.identifizierungPflicht } : { videoLink: vorher.videoLink }).catch(() => {});
  }
}

async function main() {
  await logikTeil();
  if (NUR_LOGIK) {
    console.log(`\n${ok} bestanden, ${fehler} fehlgeschlagen (nur Logik)`);
    process.exit(fehler ? 1 : 0);
  }
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

    abschnitt("9b. Investorentyp aus dem Suchprofil (Portal-Logik)");
    const fo = new Client("family office");
    await fo.registrieren("fo", ["investor"], "Fiona", `Office${LAUF}`);
    r = await fo.put("/api/portal/suchprofil", { typen: ["freiflaeche"], laender: ["DE"], investorTyp: "family_office", benachrichtigen: false });
    pruefe(r.status === 200 && r.json.suchprofil?.investorTyp === "family_office", "Suchprofil mit Investorentyp Family Office gespeichert", r.json);
    r = await fo.get("/api/portal/kyc");
    pruefe(r.status === 200 && !r.json.fall && r.json.investorVorgaben?.kontotyp === "unternehmen", "Ohne Fall: Vorschlag Kontotyp „Unternehmen“ aus dem Suchprofil", r.json.investorVorgaben);
    r = await fo.patch("/api/portal/kyc", { abschnitt: "kontotyp", daten: {} });
    const fa = r.json.fall;
    pruefe(r.status === 200 && fa?.investorTyp === "family_office" && fa?.kontotyp === "unternehmen", "KYC-Fall übernimmt Investorentyp, Kontotyp aus dem Typ vorbelegt", fa && { investorTyp: fa.investorTyp, kontotyp: fa.kontotyp });
    const anfFo = Object.fromEntries((r.json.anforderungen || []).map((x) => [x.id, x]));
    pruefe(anfFo.investortyp?.erfuellt && /Family Office/.test(anfFo.investortyp.label) && anfFo.doc_gesellschafterliste?.pflicht === true, "Anforderungen je Typ: Hinweis + Gesellschafterliste Pflicht", { investortyp: anfFo.investortyp?.label, gl: anfFo.doc_gesellschafterliste });
    r = await fo.put("/api/portal/suchprofil", { typen: ["freiflaeche"], laender: ["DE"], investorTyp: "genossenschaft", benachrichtigen: false });
    r = await fo.patch("/api/portal/kyc", { abschnitt: "pep", daten: { istPep: false, naheStehend: false } });
    const anfGe = Object.fromEntries((r.json.anforderungen || []).map((x) => [x.id, x]));
    pruefe(r.json.fall?.investorTyp === "genossenschaft" && anfGe.doc_satzung?.pflicht === true && anfGe.doc_gesellschafterliste?.pflicht === false, "Geänderter Investorentyp wird übernommen (Genossenschaft: Satzung Pflicht)", { typ: r.json.fall?.investorTyp, satzung: anfGe.doc_satzung?.pflicht });
    r = await comp.get(`/api/admin/compliance/${r.json.fall?.id}`);
    pruefe(r.status === 200 && r.json.fall?.investorTyp === "genossenschaft" && /genossenschaft/i.test(r.json.fall?.investorTypLabel || ""), "Compliance sieht den Investorentyp am Fall", r.json.fall?.investorTypLabel);
    r = await sank.get("/api/portal/kyc");
    pruefe(r.status === 200 && !r.json.investorVorgaben, "Ohne Investorentyp im Suchprofil kein Vorschlag", r.json.investorVorgaben);

    await identTeil({ comp, comp2, admin, gast }); // Eigene Identifizierung: MRZ, Videoidentifizierung

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
