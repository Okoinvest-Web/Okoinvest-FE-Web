// scripts/plattform-test-buchhaltung.mjs
//
// End-to-End-Test „Backoffice-Werkzeuge“ (Team 8: Transaktion, Compliance, Buchhaltung) gegen den laufenden Dev-Server
// (Demo-Backend):   node scripts/plattform-test-buchhaltung.mjs [basis-url]
//
// Prüft: Buchhaltung – Übersicht/OP-Liste, Mahnwesen-Konfiguration (Validierung), Mahnlauf (Vorschau, echte Mahnung mit
// MA-Nummer + PDF, Frist sperrt Folge-Mahnung), Mahnsperre, Kontoauszug CSV/CAMT (Dublette 409, Zuordnung → bezahlt und
// Provision „bezahlt“, Teilzahlung), Storno mit ST-Nummer (Erstattung, Empfänger sieht Stornobeleg + PDF, Fremde 403),
// DATEV-/BMD-/OP-Export, Monatsabschluss (Pflichtpunkte, Begründung). Compliance – DSGVO-Anfrage mit Frist und
// Zustandsautomat, Datenexport, Anonymisierung bei Löschersuchen, VVT-Export, SLA; Verdachtsfall (Hinweis aller Rollen,
// Akte nur Compliance, Vier-Augen, Meldevermerk). Transaktion – Deal-Pipeline, Prognose mit Begründung, Deal-Bericht.
// Rechte je Unterrolle, CSRF, Seiten. Eigene Konten bw-test-<Lauf>-…@example.com; Demo-Daten: nur Vorschau-Mahnlauf,
// höchstens eine echte Mahnung auf einer fiktiven überfälligen Demo-Rechnung.

const BASIS = (process.argv[2] || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);
const PASSWORT = "Werkzeuge-Test-Passwort-26";

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
const nichtGefunden = (r) => r.status === 404 || String(r.text || "").includes("NEXT_HTTP_ERROR_FALLBACK;404");
const heute = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Vienna" }).format(new Date());
const datumDe = (iso) => iso.split("-").reverse().join(".");

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
      await new Promise((w) => setTimeout(w, 8000 * versuch));
    }
    if (r.status !== 200) throw new Error(`Login ${email} fehlgeschlagen: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }

  async registrieren(schluessel, rollen, vorname, nachname, firma = "") {
    const email = `bw-test-${LAUF}-${schluessel}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email, passwort: PASSWORT, vorname, nachname, firma, rollen, agb: true });
    if (r.status !== 201) throw new Error(`Registrierung ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    this.email = email;
    this.anmeldung = [email, PASSWORT];
    return r.json.nutzer;
  }
}

async function verkauf(admin, anbieter, investor, titel, preis) {
  let r = await anbieter.post("/api/portal/projekte", { titel });
  const pid = r.json.projekt?.id;
  await anbieter.patch(`/api/portal/projekte/${pid}`, { titel, typ: "freiflaeche", land: "DE", bundesland: "Bayern", region: "Schwaben (Test)", mwp: 5, phase: "rtb", netzanschluss: "zusage", codGeplant: "2027-10", preisModus: "gesamt", preis, beschreibung: "Testprojekt aus dem automatischen Test der Backoffice-Werkzeuge. Keine echten Angaben, keine echten Personen." });
  await anbieter.post(`/api/portal/projekte/${pid}/provision`, { akzeptiert: true });
  await anbieter.post("/api/portal/status", { art: "projekt", id: pid, nach: "pruefung" });
  await admin.post("/api/admin/status", { art: "projekt", id: pid, nach: "veroeffentlicht", extra: { provisionSatz: 2 } });
  r = await investor.post(`/api/portal/boerse/${pid}/nda`, { akzeptiert: true });
  const iid = r.json.interesse?.id;
  await admin.post("/api/admin/status", { art: "interesse", id: iid, nach: "nda_freigegeben" });
  r = await admin.post("/api/admin/status", { art: "projekt", id: pid, nach: "verkauft", extra: { interesseId: iid, kaufpreis: preis } });
  const verkauft = r.status === 200 && r.json.objekt?.status === "verkauft";
  r = await anbieter.get("/api/portal/finanzen");
  const beleg = (r.json.provision?.belege || []).find((b) => String(b.bezugText || "").includes(titel) || b.bezug?.projektId === pid) || (r.json.provision?.belege || [])[0];
  return { pid, iid, verkauft, beleg };
}

async function main() {
  console.log(`Backoffice-Werkzeuge-Test gegen ${BASIS} (Lauf ${LAUF})`);
  const admin = new Client("admin (Leitung)");
  const bh = new Client("bo-buchhaltung");
  const lesen = new Client("bo-lesen");
  const akquise = new Client("bo-akquise");
  const tr = new Client("bo-transaktion");
  const comp = new Client("bo-compliance");
  const comp2 = new Client("bo-compliance2");
  const anbieter = new Client("anbieter");
  const investor = new Client("investor");
  const loesch = new Client("löschkonto");
  let r;

  abschnitt("1. Vorbereitung");
  await admin.login("admin@example.com");
  await bh.login("bo-buchhaltung@example.com");
  await lesen.login("bo-lesen@example.com");
  await akquise.login("bo-akquise@example.com");
  await tr.login("bo-transaktion@example.com");
  await comp.login("bo-compliance@example.com");
  await comp2.login("bo-compliance2@example.com");
  await anbieter.registrieren("anbieter", ["anbieter"], "Anna", `Werkzeug${LAUF}`, `Werkzeugtest Entwicklung ${LAUF} GmbH`);
  await investor.registrieren("investor", ["investor"], "Ivo", `Werkzeug${LAUF}`);
  await loesch.registrieren("loesch", ["flaeche"], "Lotte", `Loesch${LAUF}`);
  pruefe(true, "Backoffice-Konten angemeldet, Testkonten registriert");
  const A = await verkauf(admin, anbieter, investor, `Werkzeugtest A 5 MWp ${LAUF}`, 1000000);
  const Bv = await verkauf(admin, anbieter, investor, `Werkzeugtest B 5 MWp ${LAUF}`, 500000);
  pruefe(A.verkauft && Bv.verkauft && /^PR-/.test(A.beleg?.nummer || "") && /^PR-/.test(Bv.beleg?.nummer || ""), "Zwei Verkäufe → zwei Provisionsrechnungen (PR-…)", [A.beleg?.nummer, Bv.beleg?.nummer]);
  const belegA = A.beleg;
  const belegB = (await anbieter.get("/api/portal/finanzen")).json.provision?.belege?.find((b) => b.id !== belegA?.id && b.bezug?.projektId === Bv.pid) || Bv.beleg;

  // ------------------------------------------------------------ 2. Übersicht, Rechte, Einstellungen
  abschnitt("2. Buchhaltung: Übersicht, Rechte, Mahnwesen-Konfiguration");
  r = await bh.get("/api/admin/finanzen/buchhaltung");
  pruefe(r.status === 200 && r.json.op?.summen && Array.isArray(r.json.nummernkreise) && r.json.darfSchreiben, "Übersicht (OP-Summen, Nummernkreise) für die Buchhaltung", r.status);
  pruefe((r.json.op?.posten || []).some((p) => p.id === belegA?.id), "Eigene offene Provisionsrechnung in der OP-Liste", r.json.op?.anzahl);
  pruefe(r.json.nummernkreise.some((k) => k.kreis === "ST") && r.json.nummernkreise.some((k) => k.kreis === "MA"), "Nummernkreise enthalten Storno (ST) und Mahnung (MA)");
  const mahnAlt = r.json.mahnwesen;
  r = await akquise.get("/api/admin/finanzen/buchhaltung");
  pruefe(r.status === 403, "Akquise ohne Finanzrecht → 403", r.status);
  r = await lesen.post("/api/admin/finanzen/buchhaltung/mahnlauf", { trockenlauf: true });
  pruefe(r.status === 403, "Nur-lesen darf keinen Mahnlauf → 403", r.status);
  r = await bh.post("/api/admin/finanzen/buchhaltung/einstellungen", { mahnwesen: { stufen: [{ label: "A", abTagen: 20, gebuehr: 0, fristTage: 7 }, { label: "B", abTagen: 10, gebuehr: 5, fristTage: 7 }] } });
  pruefe(r.status === 422 && /aufsteigend/.test(r.json.error || ""), "Absteigende Mahnstufen → 422", r.json);
  r = await bh.post("/api/admin/finanzen/buchhaltung/einstellungen", { mahnwesen: { ...mahnAlt, basiszinssatz: 50 } });
  pruefe(r.status === 422, "Unplausibler Basiszinssatz → 422", r.status);
  r = await bh.post("/api/admin/finanzen/buchhaltung/einstellungen", { mahnwesen: mahnAlt });
  pruefe(r.status === 200 && r.json.mahnwesen?.stufen?.length === mahnAlt.stufen.length, "Gültige Konfiguration gespeichert", r.status);

  // ------------------------------------------------------------ 3. Mahnlauf
  abschnitt("3. Mahnwesen: Vorschau, Mahnung mit Nummer und PDF");
  r = await bh.post("/api/admin/finanzen/buchhaltung/mahnlauf", { trockenlauf: true });
  pruefe(r.status === 200 && r.json.trockenlauf === true && r.json.erzeugt.every((m) => m.nr === "(Vorschau)" && m.gesamt >= m.offen), "Vorschau-Mahnlauf ohne Belegnummer, Gesamt ≥ offen", r.json.anzahl);
  r = await bh.post("/api/admin/finanzen/buchhaltung/mahnlauf", { ids: [belegA?.id] });
  pruefe(r.status === 200 && r.json.anzahl === 0 && r.json.uebersprungen?.length === 1, "Nicht überfällige Rechnung wird nicht gemahnt (Grund angegeben)", r.json.uebersprungen);
  const uebersicht = (await bh.get("/api/admin/finanzen/buchhaltung")).json;
  const faellig = (uebersicht.mahnvorschlaege || []).find((m) => m.faellig);
  if (faellig) {
    r = await bh.post("/api/admin/finanzen/buchhaltung/mahnlauf", { ids: [faellig.belegId] });
    const m = r.json.erzeugt?.[0];
    pruefe(r.status === 200 && /^MA-\d{4}-\d{5}$/.test(m?.nr || ""), `Mahnung ${m?.nr} (${m?.label}) zu fiktiver Demo-Rechnung ${faellig.nummer}`, r.json);
    r = await bh.post("/api/admin/finanzen/buchhaltung/mahnlauf", { ids: [faellig.belegId] });
    pruefe(r.status === 200 && r.json.anzahl === 0, "Folge-Mahnung während laufender Frist gesperrt", r.json.uebersprungen);
    r = await bh.anfrage("GET", `/api/admin/finanzen/buchhaltung/belege/${faellig.belegId}/dokument?art=mahnung&nr=${encodeURIComponent(m?.nr || "")}`, undefined, { roh: true });
    const pdf = Buffer.from(await r.arrayBuffer());
    pruefe(r.status === 200 && /application\/pdf/.test(r.headers.get("content-type") || "") && pdf.subarray(0, 5).toString() === "%PDF-", "Mahnschreiben als PDF", r.status);
  } else pruefe(true, "Keine überfällige Demo-Rechnung – echte Mahnung übersprungen");

  // ------------------------------------------------------------ 4. Zahlungseingang
  abschnitt("4. Zahlungseingang: CSV und CAMT, Zuordnung, Teilzahlung, Dubletten");
  const csv = `Kontoinhaber;OekoInvest GmbH\n\nBuchungsdatum;Valuta;Auftraggeber/Empfänger;Verwendungszweck;Betrag;Währung\n${datumDe(heute())};${datumDe(heute())};Werkzeugtest Entwicklung ${LAUF} GmbH;Rechnung ${belegA?.nummer} Lauf ${LAUF};${belegA?.brutto.toFixed(2).replace(".", ",")};EUR\n`;
  r = await bh.post("/api/admin/finanzen/buchhaltung/zahlungen", { inhalt: csv, dateiname: `auszug-${LAUF}.csv` });
  const eA = (r.json.buchungen || [])[0];
  pruefe(r.status === 200 && r.json.import?.neu === 1 && eA?.vorschlag?.art === "sicher" && eA.vorschlag.belegId === belegA?.id, "CSV eingelesen, Treffer „sicher“ (Nummer + Betrag)", r.json);
  r = await bh.post("/api/admin/finanzen/buchhaltung/zahlungen", { inhalt: csv, dateiname: `auszug-${LAUF}.csv` });
  pruefe(r.status === 409, "Gleiche Datei erneut → 409", r.status);
  r = await lesen.post(`/api/admin/finanzen/buchhaltung/zahlungen/${eA?.id}`, { aktion: "zuordnen", belegId: belegA?.id });
  pruefe(r.status === 403, "Nur-lesen darf nicht zuordnen → 403", r.status);
  r = await bh.post(`/api/admin/finanzen/buchhaltung/zahlungen/${eA?.id}`, { aktion: "zuordnen", belegId: belegA?.id });
  pruefe(r.status === 200 && r.json.beleg?.status === "bezahlt", "Zuordnung → Rechnung bezahlt", r.json);
  r = await admin.get("/api/admin/provisionen");
  pruefe((r.json.provisionen || []).find((p) => p.projektId === A.pid)?.status === "bezahlt", "Provision automatisch „bezahlt“", (r.json.provisionen || []).find((p) => p.projektId === A.pid)?.status);
  r = await bh.post(`/api/admin/finanzen/buchhaltung/zahlungen/${eA?.id}`, { aktion: "zuordnen", belegId: belegA?.id });
  pruefe(r.status === 409, "Doppelt zuordnen → 409", r.status);
  const teil = Math.round((belegB?.brutto || 1000) * 0.4 * 100) / 100;
  const camt = `<?xml version="1.0" encoding="UTF-8"?><Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08"><BkToCstmrStmt><GrpHdr><MsgId>T${LAUF}</MsgId></GrpHdr><Stmt><Ntry><Amt Ccy="EUR">${teil.toFixed(2)}</Amt><CdtDbtInd>CRDT</CdtDbtInd><Sts><Cd>BOOK</Cd></Sts><BookgDt><Dt>${heute()}</Dt></BookgDt><ValDt><Dt>${heute()}</Dt></ValDt><AcctSvcrRef>REF-${LAUF}</AcctSvcrRef><NtryDtls><TxDtls><Refs><EndToEndId>NOTPROVIDED</EndToEndId></Refs><RltdPties><Dbtr><Pty><Nm>Werkzeugtest Entwicklung ${LAUF} GmbH</Nm></Pty></Dbtr><DbtrAcct><Id><IBAN>DE02120300000000202051</IBAN></Id></DbtrAcct></RltdPties><RmtInf><Ustrd>Teilzahlung ${belegB?.nummer}</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry></Stmt></BkToCstmrStmt></Document>`;
  r = await bh.post("/api/admin/finanzen/buchhaltung/zahlungen", { inhalt: camt, dateiname: `camt-${LAUF}.xml` });
  const eB = (r.json.buchungen || [])[0];
  pruefe(r.status === 200 && r.json.import?.format === "camt" && eB?.vorschlag?.art === "nummer" && eB.iban.includes("*"), "CAMT.053 eingelesen: Teilzahlung erkannt, IBAN maskiert", eB);
  r = await bh.post(`/api/admin/finanzen/buchhaltung/zahlungen/${eB?.id}`, { aktion: "zuordnen", belegId: belegB?.id });
  pruefe(r.status === 200 && r.json.beleg?.status === "offen" && Math.abs(r.json.beleg.offen - (belegB.brutto - teil)) < 0.01, "Teilzahlung verbucht, Restbetrag offen", r.json.beleg);
  r = await bh.post("/api/admin/finanzen/buchhaltung/zahlungen", { inhalt: "kein;kontoauszug\n1;2", dateiname: "falsch.csv" });
  pruefe(r.status === 422, "Unlesbare Datei → 422 mit Hinweis", r.json.error);

  // ------------------------------------------------------------ 5. Mahnsperre und Storno
  abschnitt("5. Mahnsperre, Storno-/Korrekturbeleg");
  r = await bh.post(`/api/admin/finanzen/buchhaltung/belege/${belegB?.id}`, { aktion: "mahnsperre", bis: "2020-01-01", grund: "Einwand des Kunden" });
  pruefe(r.status === 422, "Mahnsperre in der Vergangenheit → 422", r.status);
  const bis = new Date(Date.now() + 20 * 86400e3).toISOString().slice(0, 10);
  r = await bh.post(`/api/admin/finanzen/buchhaltung/belege/${belegB?.id}`, { aktion: "mahnsperre", bis, grund: "Einwand zur Provisionshöhe in Klärung" });
  pruefe(r.status === 200 && r.json.mahnsperre?.bis === bis, "Mahnsperre gesetzt", r.json);
  r = await bh.post(`/api/admin/finanzen/buchhaltung/belege/${belegB?.id}`, { aktion: "storno", grund: "kurz" });
  pruefe(r.status === 422, "Storno ohne ausreichenden Grund → 422", r.status);
  r = await tr.post(`/api/admin/finanzen/buchhaltung/belege/${belegB?.id}`, { aktion: "storno", grund: "Transaktion darf nicht stornieren" });
  pruefe(r.status === 403, "Transaktion (Finanzen nur lesen) → 403", r.status);
  r = await bh.post(`/api/admin/finanzen/buchhaltung/belege/${belegB?.id}`, { aktion: "storno", grund: "Kaufpreis nachträglich korrigiert (Test)", provisionStornieren: false });
  const st = r.json.storno;
  pruefe(r.status === 200 && /^ST-\d{4}-\d{5}$/.test(st?.nummer || "") && st.brutto === -belegB.brutto && st.erstattung?.betrag === teil, "Stornobeleg mit eigener Nummer, negativer Betrag, Erstattung der Teilzahlung", r.json);
  pruefe(/neue \(korrigierte\) Provisionsrechnung/.test(r.json.hinweis || ""), "Hinweis: Provision bleibt, korrigierte Rechnung folgt", r.json.hinweis);
  r = await bh.post(`/api/admin/finanzen/buchhaltung/belege/${belegB?.id}`, { aktion: "storno", grund: "Kaufpreis nachträglich korrigiert (Test)" });
  pruefe(r.status === 409, "Zweites Storno → 409", r.status);
  r = await anbieter.get("/api/portal/finanzen/dokumente");
  pruefe(r.status === 200 && (r.json.dokumente || []).some((d) => d.art === "storno" && d.nr === st?.nummer), "Anbieter sieht den Stornobeleg im Portal", r.json.dokumente);
  r = await anbieter.anfrage("GET", `/api/portal/finanzen/${belegB?.id}/dokument?art=storno`, undefined, { roh: true });
  const spdf = Buffer.from(await r.arrayBuffer());
  pruefe(r.status === 200 && spdf.subarray(0, 5).toString() === "%PDF-", "Stornobeleg als PDF für den Empfänger", r.status);
  r = await investor.get(`/api/portal/finanzen/${belegB?.id}/dokument?art=storno`);
  pruefe(r.status === 403, "Fremdes Konto → 403", r.status);
  r = await anbieter.get("/api/portal/benachrichtigungen?limit=30");
  pruefe((r.json.eintraege || []).some((b) => /Storno/.test(b.titel)) && (r.json.eintraege || []).some((b) => /Teilzahlung/.test(b.titel)), "Benachrichtigungen: Teilzahlung und Stornobeleg", (r.json.eintraege || []).map((b) => b.titel).slice(0, 8));
  r = await bh.get("/api/admin/finanzen/buchhaltung");
  pruefe((r.json.stornos || []).some((s) => s.nummer === st?.nummer && s.erstattung), "Stornobeleg in der Übersicht (mit Erstattung)", r.json.stornos?.length);

  // ------------------------------------------------------------ 6. Export
  abschnitt("6. DATEV-, BMD- und OP-Export");
  const monatsanfang = `${heute().slice(0, 7)}-01`;
  r = await bh.anfrage("GET", `/api/admin/finanzen/buchhaltung/export?format=datev&von=${monatsanfang}&bis=${heute()}`, undefined, { roh: true });
  const datev = Buffer.from(await r.arrayBuffer()).toString("latin1");
  pruefe(r.status === 200 && /iso-8859-1/.test(r.headers.get("content-type") || "") && datev.startsWith('"EXTF";700;21;"Buchungsstapel"') && datev.includes(belegA?.nummer) && datev.includes(st?.nummer), "DATEV-Buchungsstapel (EXTF, ISO-8859-1) mit Rechnung und Storno", datev.slice(0, 80));
  r = await bh.anfrage("GET", `/api/admin/finanzen/buchhaltung/export?format=bmd&von=${monatsanfang}&bis=${heute()}`, undefined, { roh: true });
  const bmd = Buffer.from(await r.arrayBuffer());
  pruefe(r.status === 200 && bmd[0] === 0xef && bmd.toString("utf8").includes("satzart;konto;gkonto;belegnr"), "BMD-Buchungsimport (UTF-8 mit BOM)", bmd.subarray(0, 40).toString());
  r = await bh.anfrage("GET", "/api/admin/finanzen/buchhaltung/export?format=op", undefined, { roh: true });
  pruefe(r.status === 200 && Buffer.from(await r.arrayBuffer()).toString("utf8").includes("Altersklasse"), "OP-Liste als CSV", r.status);
  r = await bh.get("/api/admin/finanzen/buchhaltung/export?format=datev&von=2026-12-01&bis=2026-01-01");
  pruefe(r.status === 422, "Ungültiger Zeitraum → 422", r.status);
  r = await lesen.get(`/api/admin/finanzen/buchhaltung/export?format=datev&von=${monatsanfang}&bis=${heute()}`);
  pruefe(r.status === 403, "Nur-lesen ohne Exportrecht → 403", r.status);

  // ------------------------------------------------------------ 7. Monatsabschluss
  abschnitt("7. Monatsabschluss");
  const [j, mo] = heute().split("-").map(Number);
  const vormonat = mo === 1 ? `${j - 1}-12` : `${j}-${String(mo - 1).padStart(2, "0")}`;
  r = await bh.get(`/api/admin/finanzen/buchhaltung/abschluss/${vormonat}`);
  pruefe(r.status === 200 && r.json.abschluss?.punkte?.length >= 10 && r.json.abschluss.fristen?.length === 3, "Checkliste mit automatischen Punkten und Steuerfristen AT/DE/CH", r.json.abschluss?.offen);
  r = await bh.post(`/api/admin/finanzen/buchhaltung/abschluss/${vormonat}`, { aktion: "punkt", punkt: "klaerfaelle", erledigt: true, notiz: "" });
  pruefe(r.status === 422, "Automatischen Punkt ohne Begründung manuell bestätigen → 422", r.status);
  r = await bh.post(`/api/admin/finanzen/buchhaltung/abschluss/${vormonat}`, { aktion: "punkt", punkt: "op_abgestimmt", erledigt: true, notiz: "Salden abgestimmt (Test)" });
  pruefe(r.status === 200 && r.json.abschluss.punkte.find((p) => p.id === "op_abgestimmt").erledigt, "Manueller Punkt „OP-Liste abgestimmt“", r.status);
  if (!r.json.abschluss?.bereit) {
    r = await bh.post(`/api/admin/finanzen/buchhaltung/abschluss/${vormonat}`, { aktion: "abschliessen" });
    pruefe(r.status === 409 && /Noch offen/.test(r.json.error || ""), "Abschließen mit offenen Pflichtpunkten → 409 mit Liste", r.json.error);
  } else pruefe(true, "Alle Pflichtpunkte bereits erfüllt");
  r = await bh.post(`/api/admin/finanzen/buchhaltung/abschluss/${heute().slice(0, 7)}`, { aktion: "abschliessen" });
  pruefe(r.status === 409, "Laufender Monat kann nicht abgeschlossen werden → 409", r.status);
  r = await bh.post(`/api/admin/finanzen/buchhaltung/abschluss/${vormonat}`, { aktion: "punkt", punkt: "op_abgestimmt", erledigt: false });
  pruefe(r.status === 200, "Punkt zurückgenommen (Testdaten aufgeräumt)", r.status);

  // ------------------------------------------------------------ 8. Datenschutz (DSGVO)
  abschnitt("8. Compliance: Betroffenenanfragen (Art. 15/17 DSGVO)");
  r = await comp.post("/api/admin/compliance/datenschutz", { art: "auskunft", name: `Ivo Werkzeug${LAUF}`, email: investor.email, eingangAm: heute(), land: "AT", kanal: "email", beschreibung: "Bitte um Auskunft über meine gespeicherten Daten (Test)." });
  const ds = r.json.anfrage;
  pruefe(r.status === 200 && ds?.kontoId === investor.nutzer.id && ds.frist > heute() && ds.status === "eingegangen", "Auskunftsersuchen erfasst, Konto über E-Mail verknüpft, Frist 1 Monat", ds && { frist: ds.frist, konto: ds.kontoId });
  r = await bh.post("/api/admin/compliance/datenschutz", { art: "auskunft", name: "X Y" });
  pruefe(r.status === 403, "Buchhaltung darf keine Anfragen erfassen → 403", r.status);
  r = await admin.get("/api/admin/compliance/datenschutz?status=alle");
  pruefe(r.status === 200 && (r.json.anfragen || []).some((a) => a.id === ds?.id) && r.json.darfSchreiben === false, "Leitung sieht die Anfragen (nur lesen)", r.status);
  r = await comp.post(`/api/admin/compliance/datenschutz/${ds?.id}`, { aktion: "erledigen", ergebnis: "zu früh erledigt (Test)" });
  pruefe(r.status === 409, "Erledigen vor Identitätsprüfung → 409", r.status);
  r = await comp.post(`/api/admin/compliance/datenschutz/${ds?.id}`, { aktion: "identitaet_bestaetigen", notiz: "Anfrage aus der verifizierten E-Mail-Adresse" });
  pruefe(r.status === 200 && r.json.anfrage?.status === "in_bearbeitung", "Identität bestätigt → in Bearbeitung", r.json.anfrage?.status);
  r = await comp.post(`/api/admin/compliance/datenschutz/${ds?.id}`, { aktion: "erledigen", ergebnis: "Auskunft per Portal übermittelt (Test)" });
  pruefe(r.status === 409 && /Datenexport/.test(r.json.error || ""), "Erledigen ohne Datenexport → 409", r.json.error);
  r = await comp.anfrage("GET", `/api/admin/compliance/datenschutz/${ds?.id}/export`, undefined, { roh: true });
  const exp = await r.text();
  pruefe(r.status === 200 && exp.includes(investor.email) && exp.includes("informationenArt15") && !exp.includes("passwortHash"), "Datenexport (JSON) mit Art.-15-Informationen, ohne Geheimnisse", r.status);
  r = await comp.post(`/api/admin/compliance/datenschutz/${ds?.id}`, { aktion: "verlaengern", begruendung: "Umfangreiche Datenbestände in mehreren Modulen (Test)" });
  pruefe(r.status === 200 && r.json.anfrage?.status === "verlaengert" && r.json.anfrage.frist > ds.frist, "Frist verlängert (+2 Monate, Begründung Pflicht)", r.json.anfrage?.frist);
  r = await comp.post(`/api/admin/compliance/datenschutz/${ds?.id}`, { aktion: "erledigen", ergebnis: "Auskunft per Portal übermittelt (Test)" });
  pruefe(r.status === 200 && r.json.anfrage?.status === "erledigt", "Anfrage erledigt", r.json.anfrage?.status);
  r = await investor.get("/api/portal/benachrichtigungen?limit=20");
  pruefe((r.json.eintraege || []).filter((b) => /Datenschutzanfrage/.test(b.titel)).length >= 2, "Betroffene Person informiert (Eingang, Verlängerung, Erledigung)", (r.json.eintraege || []).map((b) => b.titel).slice(0, 6));
  r = await comp.post("/api/admin/compliance/datenschutz", { art: "loeschung", name: `Lotte Loesch${LAUF}`, kontoId: loesch.nutzer.id, eingangAm: heute(), land: "DE" });
  const dl = r.json.anfrage;
  await comp.post(`/api/admin/compliance/datenschutz/${dl?.id}`, { aktion: "identitaet_bestaetigen", notiz: "Anfrage aus dem angemeldeten Konto" });
  r = await comp.post(`/api/admin/compliance/datenschutz/${dl?.id}`, { aktion: "anonymisieren", bestaetigung: "nein", aufbewahrungGeprueft: true });
  pruefe(r.status === 422, "Anonymisieren ohne Bestätigung LÖSCHEN → 422", r.status);
  r = await comp.post(`/api/admin/compliance/datenschutz/${dl?.id}`, { aktion: "anonymisieren", bestaetigung: "LÖSCHEN", aufbewahrungGeprueft: true });
  pruefe(r.status === 200 && r.json.anfrage?.konto?.geloescht && r.json.anfrage.loeschErgebnis === "geloescht", "Konto anonymisiert (Löschersuchen)", r.json.anfrage?.konto);
  r = await new Client("probe").post("/api/auth/login", { email: loesch.email, passwort: PASSWORT });
  pruefe(r.status !== 200, "Anmeldung mit dem gelöschten Konto nicht mehr möglich", r.status);
  r = await comp.post(`/api/admin/compliance/datenschutz/${dl?.id}`, { aktion: "erledigen", ergebnis: "Konto anonymisiert, Belege gesperrt", loeschErgebnis: "geloescht" });
  pruefe(r.status === 200 && r.json.anfrage?.status === "erledigt", "Löschersuchen erledigt", r.json.anfrage?.status);
  r = await comp.anfrage("GET", "/api/admin/compliance/vvt?format=csv", undefined, { roh: true });
  const vvt = Buffer.from(await r.arrayBuffer());
  pruefe(r.status === 200 && vvt[0] === 0xef && vvt.toString("utf8").includes("Art. 30 DSGVO"), "Verzeichnis der Verarbeitungstätigkeiten als CSV", r.status);
  r = await comp.get("/api/admin/compliance/vvt?format=json");
  pruefe(r.status === 200 && r.json.entwurf === true && r.json.taetigkeiten?.length >= 10, "VVT als JSON (Entwurf)", r.json.taetigkeiten?.length);
  r = await comp.get("/api/admin/compliance/sla");
  pruefe(r.status === 200 && r.json.sla?.kyc === 3 && Array.isArray(r.json.faelle), "SLA der KYC-Warteschlange", r.json.sla);

  // ------------------------------------------------------------ 9. Verdachtsfall
  abschnitt("9. Compliance: interner Geldwäsche-Verdachtsfall");
  r = await akquise.post("/api/admin/hinweis", { anlass: "herkunft", land: "DE", sachverhalt: `Test ${LAUF}: Käufer kündigt Zahlung über Drittlandkonto an, Mittelherkunft unklar.` });
  const gw = r.json.id;
  pruefe(r.status === 200 && /^GW-/.test(gw || ""), "Akquise gibt vertraulichen Hinweis (keine Außenwirkung)", r.json);
  r = await akquise.get("/api/admin/compliance/verdacht");
  pruefe(r.status === 403, "Meldende Person sieht die Akte nicht → 403", r.status);
  r = await admin.get("/api/admin/compliance/verdacht");
  pruefe(r.status === 403, "Auch Leitung ohne Compliance-Rolle → 403 (Need-to-know)", r.status);
  r = await akquise.post("/api/admin/hinweis", { anlass: "herkunft", sachverhalt: "zu kurz" });
  pruefe(r.status === 422, "Hinweis ohne konkreten Sachverhalt → 422", r.status);
  r = await comp.get("/api/admin/compliance/verdacht");
  pruefe(r.status === 200 && (r.json.faelle || []).some((f) => f.id === gw), "Compliance sieht den Fall in der Warteschlange", r.json.kennzahlen);
  r = await comp.post(`/api/admin/compliance/verdacht/${gw}`, { aktion: "keine_meldung", begruendung: "Überspringen der Prüfung ist nicht erlaubt (Test)" });
  pruefe(r.status === 409, "Entscheidung ohne Prüfung → 409 (Zustandsautomat)", r.status);
  await comp.post(`/api/admin/compliance/verdacht/${gw}`, { aktion: "pruefen" });
  r = await comp.post(`/api/admin/compliance/verdacht/${gw}`, { aktion: "meldung_vorbereiten", begruendung: "Mittelherkunft nicht plausibel belegt, Drittlandbezug (Test)" });
  pruefe(r.status === 200 && r.json.fall?.status === "meldung_vorbereitet", "Meldung vorbereitet", r.json.fall?.status);
  const morgen = new Date(Date.now() + 2 * 86400e3).toISOString().slice(0, 10); // +2 Tage: Serverdatum Europe/Vienna
  r = await comp.post(`/api/admin/compliance/verdacht/${gw}`, { aktion: "gemeldet", aktenzeichen: "TEST-123", gemeldetAm: morgen });
  pruefe(r.status === 409, "Meldedatum in der Zukunft → 409", r.status);
  r = await comp.post(`/api/admin/compliance/verdacht/${gw}`, { aktion: "gemeldet", aktenzeichen: `TEST-${LAUF}`, gemeldetAm: heute() });
  pruefe(r.status === 200 && r.json.fall?.meldung?.stelle?.includes("FIU"), "Meldevermerk (manuell über goAML) mit Aktenzeichen", r.json.fall?.meldung);
  r = await comp.post(`/api/admin/compliance/verdacht/${gw}`, { aktion: "abschliessen" });
  pruefe(r.status === 200 && /^\d{4}-12-31$/.test(r.json.fall?.aufbewahrenBis || ""), "Abgeschlossen mit Aufbewahrungsfrist", r.json.fall?.aufbewahrenBis);
  r = await comp.post("/api/admin/compliance/verdacht", { anlass: "identitaet", sachverhalt: `Test ${LAUF}: Ausweiskopie mit Unstimmigkeiten bei Geburtsdatum und Foto.` });
  const gw2 = r.json.id;
  await comp.post(`/api/admin/compliance/verdacht/${gw2}`, { aktion: "pruefen" });
  r = await comp.post(`/api/admin/compliance/verdacht/${gw2}`, { aktion: "keine_meldung", begruendung: "Selbst erfasst und selbst entschieden (Test)" });
  pruefe(r.status === 409 && /Vier-Augen/.test(r.json.error || ""), "Vier-Augen: erfassende Person entscheidet nicht → 409", r.json.error);
  r = await comp2.post(`/api/admin/compliance/verdacht/${gw2}`, { aktion: "keine_meldung", begruendung: "Neue Ausweiskopie vorgelegt, Unstimmigkeit aufgeklärt (Test)" });
  pruefe(r.status === 200 && r.json.fall?.status === "keine_meldung", "Zweite Compliance-Person dokumentiert „keine Meldung“", r.json.fall?.status);

  // ------------------------------------------------------------ 10. Deal-Pipeline
  abschnitt("10. Transaktion: Deal-Pipeline, Prognose, Deal-Bericht");
  r = await tr.get("/api/admin/projekte/pipeline");
  pruefe(r.status === 200 && r.json.spalten?.length === 7 && r.json.summen && r.json.darfSchreiben, "Pipeline mit 7 Phasen und Summen", r.json.summen);
  const karte = (r.json.karten || []).find((k) => k.phase !== "verkauft");
  const verkaufteA = (r.json.karten || []).find((k) => k.projektId === A.pid);
  pruefe(verkaufteA?.phase === "verkauft" && verkaufteA.provision === 20000, "Verkauftes Testprojekt in „Verkauft“ mit Provision 20.000 €", verkaufteA);
  r = await bh.post(`/api/admin/projekte/pipeline/${karte?.projektId}`, { wahrscheinlichkeit: 50, notiz: "Buchhaltung darf nicht" });
  pruefe(r.status === 403, "Buchhaltung ändert keine Prognose → 403", r.status);
  r = await tr.post(`/api/admin/projekte/pipeline/${karte?.projektId}`, { wahrscheinlichkeit: 50 });
  pruefe(r.status === 422, "Eigene Wahrscheinlichkeit ohne Begründung → 422", r.status);
  r = await tr.post(`/api/admin/projekte/pipeline/${karte?.projektId}`, { wahrscheinlichkeit: 55, closingErwartet: "2027-03", notiz: `Investor signalisiert Signing im März (Test ${LAUF})` });
  pruefe(r.status === 200 && r.json.karte?.manuell && r.json.karte.wahrscheinlichkeit === 0.55 && r.json.karte.quartal === "2027-Q1", "Prognose gespeichert (55 %, Closing Q1/2027)", r.json.karte);
  r = await tr.post(`/api/admin/projekte/pipeline/${karte?.projektId}`, { wahrscheinlichkeit: null, closingErwartet: "", notiz: "" });
  pruefe(r.status === 200 && r.json.karte?.manuell === false, "Prognose auf Standard zurückgesetzt", r.json.karte?.wahrscheinlichkeit);
  r = await tr.anfrage("GET", "/api/admin/projekte/pipeline?format=csv", undefined, { roh: true });
  const bericht = Buffer.from(await r.arrayBuffer());
  pruefe(r.status === 200 && bericht[0] === 0xef && bericht.toString("utf8").includes("Provision gewichtet"), "Deal-Bericht als CSV", r.status);
  r = await comp.get("/api/admin/projekte/pipeline");
  pruefe(r.status === 403, "Compliance ohne Projektrecht → 403", r.status);

  // ------------------------------------------------------------ 11. CSRF und Seiten
  abschnitt("11. CSRF und Seiten");
  r = await bh.post("/api/admin/finanzen/buchhaltung/mahnlauf", { trockenlauf: true }, { origin: "https://fremd.example" });
  pruefe(r.status === 403, "Fremder Origin → 403", r.status);
  const seiten = [
    [bh, "/portal/admin/finanzen/buchhaltung", 200], [bh, "/portal/admin/finanzen/buchhaltung?tab=mahnwesen", 200], [bh, "/portal/admin/finanzen/buchhaltung?tab=zahlungen", 200],
    [bh, "/portal/admin/finanzen/buchhaltung?tab=storno", 200], [bh, "/portal/admin/finanzen/buchhaltung?tab=export", 200], [bh, "/portal/admin/finanzen/buchhaltung?tab=abschluss", 200],
    [bh, "/portal/admin/finanzen/buchhaltung?tab=nummern", 200], [akquise, "/portal/admin/finanzen/buchhaltung", 404],
    [comp, "/portal/admin/compliance/datenschutz", 200], [admin, "/portal/admin/compliance/datenschutz", 200], [bh, "/portal/admin/compliance/datenschutz", 404],
    [comp, "/portal/admin/compliance/gwg", 200], [admin, "/portal/admin/compliance/gwg", 200], [comp, "/portal/admin/compliance", 200],
    [tr, "/portal/admin/deals/pipeline", 200], [bh, "/portal/admin/hinweis", 200], [anbieter, "/portal/abrechnungen", 200], [anbieter, "/portal/admin/hinweis", 404],
  ];
  for (const [cl, pfad, soll] of seiten) {
    r = await cl.get(pfad);
    pruefe(soll === 404 ? nichtGefunden(r) : r.status === 200 && !nichtGefunden(r) && !r.text.includes("Application error"), `${pfad} (${cl.name}) → ${soll}`, r.status);
  }
  r = await anbieter.get("/portal/abrechnungen");
  pruefe(r.text.includes("Mahnungen &amp; Stornobelege") || r.text.includes("Mahnungen & Stornobelege"), "Portal „Abrechnungen“ zeigt Mahnungen & Stornobelege");
  r = await comp.get("/portal/admin/compliance");
  pruefe(r.text.includes("Datenschutz (DSGVO)"), "KYC-Warteschlange verlinkt Datenschutz und Geldwäsche-Verdacht");

  console.log(`\n${ok} ok, ${fehler} Fehler`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e?.stack || e}`));
  process.exit(2);
});
