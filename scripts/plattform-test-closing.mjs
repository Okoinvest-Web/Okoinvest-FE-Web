// scripts/plattform-test-closing.mjs
//
// Grundbuch & Dienstbarkeiten + Deal-Abschluss (Closing) – Team B0b/B4.
//   node scripts/plattform-test-closing.mjs [basis-url]        (--nur-logik: nur Teil A, ohne Server)
//
// Teil A – reine Logik: Schrittfolge je Land (DE/AT/CH), Reihenfolge/Pflichtnachweise, Gesamtstatus, Fristen, Kostenschätzer
//   (GNotKG-Tabelle B, AT/CH), Closing-Regeln (Signing nur mit KYC beider Seiten, CPs vollständig → Closing), CP-Vorlagen je
//   Struktur/LOI, Meilensteine, Muster-Texte (MUSTER-Kennzeichnung, Formhinweise).
// Teil B – gegen den laufenden Dev-Server (eigene Konten cl-test-<Lauf>@example.com, Demo-Daten bleiben unberührt):
//   Grundbuch-Schrittfolge über die API (409/422), Eigentümer sieht nur eigene Akte (fremd → 403, Seite 404), Muster-PDF,
//   Signatur-Modul, Unterrollen, CSRF; Closing: KYC beider Seiten Pflicht (unverifiziert → 409), Anonymität bis zur
//   Kontaktfreigabe, CP melden nur in eigener Verantwortung, CPs vollständig + Zahlung → Closing → Projekt verkauft,
//   Provision und Provisionsrechnung, PDFs/ICS, fremde → 403, Seiten.

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lade = (p) => import(pathToFileURL(path.join(WURZEL, p)).href);
const NUR_LOGIK = process.argv.includes("--nur-logik");
const BASIS = (process.argv.find((a) => a.startsWith("http")) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);
const PASSWORT = "Closing-Test-2026";

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
const wirft = (fn) => {
  try {
    fn();
    return null;
  } catch (e) {
    return e;
  }
};

// ================================================================ Teil A – Logik

async function logik() {
  const G = await lade("src/lib/plattform/closing/grundbuch.js");
  const C = await lade("src/lib/plattform/closing/closing.js");
  const M = await lade("src/lib/plattform/closing/muster.js");
  const heute = "2026-09-30";

  abschnitt("A1. Schrittfolge je Land");
  const k = (land) => G.schritteFuer(land).map((s) => s.schluessel).join(",");
  pruefe(k("DE") === "vertrag,unterschrift,beglaubigung,rang,antrag,eintragung", "DE: Vertrag → Unterschrift → Beglaubigung (§ 29 GBO) → Rangrücktritt → Antrag → Eintragung", k("DE"));
  pruefe(k("AT") === "vertrag,unterschrift,beglaubigung,rang,antrag,eintragung" && G.schritteFuer("AT").find((s) => s.schluessel === "antrag").label.includes("Grundbuchsgesuch"), "AT: Grundbuchsgesuch, Vorrangseinräumung, Einverleibung");
  pruefe(/Aufsandungserklärung/.test(G.schritteFuer("AT")[0].text) && /§ 31 GBG/.test(G.schritteFuer("AT")[2].text), "AT: Aufsandungserklärung und beglaubigte Unterschrift (§ 31 GBG) im Text");
  pruefe(k("CH") === "vertrag,beurkundung,rang,antrag,eintragung", "CH: öffentliche Beurkundung statt Unterschrift + Beglaubigung", k("CH"));
  pruefe(G.schritteFuer("XX") === G.schritteFuer("DE"), "Unbekanntes Land → DE");
  const neu = G.schritteAnlegen("DE", { ohnePfandrecht: true });
  pruefe(neu.find((s) => s.schluessel === "rang").status === "entfaellt" && neu.filter((s) => s.status === "offen").length === 5, "Ohne Grundpfandrecht: Rang-Schritt entfällt");

  abschnitt("A2. Regeln: Reihenfolge, Nachweise, Status");
  const akte = { land: "DE", erstelltAm: "2026-09-01", schritte: G.schritteAnlegen("DE") };
  const setze = (schluessel, status, extra = {}) => {
    const s = G.schrittPruefen(akte, { schluessel, status, ...extra }, { heute });
    Object.assign(akte.schritte.find((x) => x.schluessel === schluessel), s);
  };
  let e = wirft(() => G.schrittPruefen(akte, { schluessel: "eintragung", status: "erledigt", nachweisWert: "Abt. II Nr. 1" }, { heute }));
  pruefe(e?.status === 409 && /Zuerst erledigen/.test(e.message), "Eintragung vor dem Antrag → 409", e?.message);
  e = wirft(() => G.schrittPruefen(akte, { schluessel: "beglaubigung", status: "entfaellt" }, { heute }));
  pruefe(e?.status === 422, "Pflichtschritt kann nicht entfallen → 422");
  e = wirft(() => G.schrittPruefen(akte, { schluessel: "vertrag", status: "erledigt", datum: "2027-01-01" }, { heute }));
  pruefe(e?.status === 422, "Erledigungsdatum in der Zukunft → 422");
  pruefe(G.akteStatus(akte) === "vorbereitung", "Status: Vorbereitung");
  setze("vertrag", "erledigt", { datum: "2026-09-05" });
  pruefe(G.akteStatus(akte) === "unterschrift", "Nach Vertrag: Zur Unterschrift");
  setze("unterschrift", "erledigt", { datum: "2026-09-10" });
  setze("beglaubigung", "erledigt", { datum: "2026-09-12" });
  e = wirft(() => G.schrittPruefen(akte, { schluessel: "antrag", status: "erledigt" }, { heute }));
  pruefe(e?.status === 422 && /Aktenzeichen/.test(e.message), "Antrag ohne Aktenzeichen → 422", e?.message);
  setze("antrag", "erledigt", { datum: "2026-09-15", nachweisWert: "Az. 12/2026" });
  pruefe(G.akteStatus(akte) === "eingereicht" && G.anlagenDienstbarkeitStatus(akte) === "beantragt", "Status eingereicht, Anlage „beantragt“");
  e = wirft(() => G.schrittPruefen(akte, { schluessel: "eintragung", status: "erledigt", nachweisWert: "Abt. II Nr. 3" }, { heute }));
  pruefe(e?.status === 409 && /Rangrücktritt/.test(e.message), "Eintragung vor Rangrücktritt → 409", e?.message);
  pruefe(!G.zuruecksetzenErlaubt(akte, "beglaubigung") && G.zuruecksetzenErlaubt(akte, "antrag"), "Zurücksetzen nur ohne erledigten Nachfolger");
  setze("rang", "erledigt", { datum: "2026-09-20", nachweisWert: "Erklärung Bank 20.09." });
  setze("eintragung", "erledigt", { datum: "2026-09-28", nachweisWert: "Abt. II Nr. 3" });
  pruefe(G.akteStatus(akte) === "eingetragen" && G.anlagenDienstbarkeitStatus(akte) === "eingetragen" && G.fortschritt(akte).quote === 1, "Alle Schritte → eingetragen (Anlage ebenso)");
  const f = G.fristenBerechnen({ land: "DE", erstelltAm: "2026-08-01", schritte: G.schritteAnlegen("DE") }, { heute });
  pruefe(f.find((s) => s.schluessel === "vertrag").fristBerechnet === "2026-08-15" && f.find((s) => s.schluessel === "vertrag").ueberfaellig && !f.find((s) => s.schluessel === "unterschrift").fristBerechnet, "Fristen: ab Anlage bzw. Vorgänger, überfällig erkannt");

  abschnitt("A3. Kostenschätzer");
  pruefe(G.gnotkgTabelleB(100000) === 273 && G.gnotkgTabelleB(500000) === 935 && G.gnotkgTabelleB(1000000) === 1735 && G.gnotkgTabelleB(5000) === 45, "GNotKG Tabelle B (Stufen 2013): 5 T€ 45 €, 100 T€ 273 €, 500 T€ 935 €, 1 Mio. € 1.735 €");
  const de = G.grundbuchKosten({ land: "DE", entgeltJahr: 30000, laufzeitJahre: 30, rangruecktritt: 1 });
  pruefe(de.geschaeftswert === 600000 && de.positionen.some((p) => /KV 14121/.test(p.quelle)) && de.positionen.some((p) => /14130/.test(p.quelle)), "DE: Geschäftswert max. 20 Jahreswerte (§ 52 GNotKG), Eintragung + Rangänderung mit Quelle", de);
  const at = G.grundbuchKosten({ land: "AT", entgeltJahr: 10000, laufzeitJahre: 25 });
  pruefe(at.positionen.some((p) => /§ 33 TP 9 GebG/.test(p.quelle) && p.betrag === 5000) && at.waehrung === "EUR", "AT: Rechtsgeschäftsgebühr 2 % (§ 33 TP 9 GebG) und GGG", at.positionen[0]);
  const ch = G.grundbuchKosten({ land: "CH", entgeltJahr: 5000 });
  pruefe(ch.waehrung === "CHF" && /kantonal/.test(ch.hinweis), "CH: CHF, kantonale Gebühren");

  abschnitt("A4. Closing-Regeln");
  const cps = C.cpsAnlegen("share", { loiBedingungen: ["gremien", "kartell", "keine"], heute });
  pruefe(cps.some((c) => c.schluessel === "abtretung_form") && cps.some((c) => c.schluessel === "gremien_kaeufer" && c.verantwortlich === "kaeufer") && cps.some((c) => c.schluessel === "kartell") && !cps.some((c) => c.schluessel === "vertragsuebernahme"), "Share Deal: Formvorschrift + LOI-Bedingungen, keine Vertragsübernahme-CP");
  pruefe(C.cpsAnlegen("asset").some((c) => c.schluessel === "vertragsuebernahme"), "Asset Deal: Zustimmung zur Vertragsübernahme");
  const cl = { status: "vorbereitung", kaufpreis: 5e6, struktur: "share", signing: { punkte: C.signingAnlegen() }, cps, zahlung: {}, notar: {} };
  let p = C.signingPruefen(cl, { kycKaeufer: false, kycVerkaeufer: true });
  pruefe(!p.ok && p.gruende.some((g) => /Käufers/.test(g)), "Signing ohne KYC des Käufers gesperrt", p.gruende);
  p = C.signingPruefen(cl, { kycKaeufer: true, kycVerkaeufer: false });
  pruefe(!p.ok && p.gruende.some((g) => /Verkäufers/.test(g)), "Signing ohne KYC des Verkäufers gesperrt");
  for (const s of cl.signing.punkte) s.erledigt = true;
  p = C.signingPruefen(cl, { kycKaeufer: true, kycVerkaeufer: true });
  pruefe(p.ok, "Signing mit KYC beider Seiten + Checkliste möglich", p.gruende);
  pruefe(C.signingStand(cl, { kycKaeufer: false, kycVerkaeufer: true }).find((x) => x.schluessel === "kyc_kaeufer").erledigt === false, "KYC-Punkte kommen aus dem KYC-Modul (nicht manuell)");
  cl.status = "signing";
  p = C.closingPruefen(cl, { kycKaeufer: true, kycVerkaeufer: true });
  pruefe(!p.ok && p.gruende.some((g) => /Closing Condition/.test(g)) && p.gruende.some((g) => /Zahlungseingang|Treuhand/.test(g)) && p.gruende.some((g) => /Notartermin/.test(g)), "Closing gesperrt: CPs offen, Zahlung fehlt, Notartermin (Share Deal) fehlt", p.gruende);
  for (const c of cl.cps) c.status = "erfuellt";
  cl.cps[0].status = "verzichtet";
  cl.zahlung = { eingangAm: heute };
  cl.notar = { termin: "2026-10-10T08:00:00Z" };
  pruefe(C.closingPruefen(cl, { kycKaeufer: true, kycVerkaeufer: true }).ok, "CPs erfüllt/verzichtet + Zahlung + Notar → Closing möglich");
  pruefe(!C.closingPruefen(cl, { kycKaeufer: true, kycVerkaeufer: false }).ok, "Closing prüft KYC erneut (abgelaufen → gesperrt)");
  pruefe(C.kaufpreisAbleiten({ gebotGesamt: 4.2e6, loi: { betrag: 4e6 } }).quelle === "zuschlag" && C.kaufpreisAbleiten({ loi: { preisProKwp: 90 }, mwp: 10 }).betrag === 900000, "Kaufpreis aus Zuschlag vor LOI, LOI je kWp × MWp");
  e = wirft(() => C.meilensteineBereinigen([{ label: "A", betrag: 3e6 }, { label: "B", betrag: 3e6 }], 5e6));
  pruefe(e?.status === 422, "Meilensteine über dem Kaufpreis → 422");
  pruefe(C.formHinweise("share", "DE").some((h) => /§ 15 Abs\. 3 und 4 GmbHG/.test(h)) && C.formHinweise("share", "AT").some((h) => /Notariatsakt/.test(h)) && C.formHinweise("share", "CH").some((h) => /Art\. 785 OR/.test(h)), "Formhinweise: DE § 15 GmbHG, AT Notariatsakt, CH Art. 785 OR");

  abschnitt("A5. Muster");
  const a = { id: "GR-26-TEST01", land: "AT", objektArt: "dach", recht: "servitut", titel: "Test", grundstueck: { grundbuch: "KG 1 EZ 2" }, pfandglaeubiger: [{ name: "Bank" }], entgeltJahr: 1000, laufzeitJahre: 20 };
  const d1 = M.grundbuchMuster(a, "dachnutzung_servitut")[0];
  const txt = JSON.stringify(d1);
  pruefe(/MUSTER/.test(txt) && /Aufsandungserklärung/.test(txt) && /Superädifikat/.test(txt), "Dachnutzungs-/Servitutsvertrag AT: MUSTER, Aufsandung, Superädifikat");
  pruefe(/§ 95 BGB/.test(JSON.stringify(M.grundbuchMuster({ ...a, land: "DE", recht: "bpd", objektArt: "freiflaeche" }, "dienstbarkeit_freiflaeche"))), "Dienstbarkeitsvertrag DE: Scheinbestandteil § 95 BGB");
  pruefe(/Vorrangseinräumung/.test(JSON.stringify(M.grundbuchMuster(a, "rangruecktritt"))) && /Löschung/.test(JSON.stringify(M.grundbuchMuster(a, "loeschung_hinweis"))), "Rangrücktritts-Ersuchen und Löschungs-Hinweis");
  const spa = JSON.stringify(M.spaMuster({ id: "CL-1", struktur: "share", land: "DE", kaufpreis: 1e6, cps, kaeufer: { anzeige: "K" }, verkaeufer: { anzeige: "V" }, projekt: { titel: "P", mwp: 10, land: "DE" }, zahlung: { treuhand: true } }));
  pruefe(/MUSTER/.test(spa) && /Material Adverse Change/.test(spa) && /Notaranderkonto/.test(spa) && /Closing Conditions/.test(spa), "SPA-Muster: MUSTER, CPs, MAC, Notaranderkonto");
}

// ================================================================ Teil B – HTTP

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
        res = await fetch(BASIS + pfad, { method: methode, headers, body: payload, redirect: "manual", signal: AbortSignal.timeout(180000) });
        if (res.status >= 500 && /text\/html/.test(res.headers.get("content-type") || "") && pfad.startsWith("/api/") && versuch < 4) {
          await new Promise((r) => setTimeout(r, 3000 * versuch));
          continue;
        }
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
    if (roh) return { status: res.status, typ: res.headers.get("content-type") || "", daten: Buffer.from(await res.arrayBuffer()) };
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 200) };
    }
    return { status: res.status, json, text };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  patch = (p, b, o) => this.anfrage("PATCH", p, b ?? {}, o);
  async login(email, passwort = DEMO_PASSWORT) {
    let r = await this.post("/api/auth/login", { email, passwort });
    for (let i = 1; r.status >= 500 && i <= 3; i++) {
      await new Promise((x) => setTimeout(x, 4000 * i)); // parallele Teams: Sperrdatei kurz belegt
      r = await this.post("/api/auth/login", { email, passwort });
    }
    if (r.status !== 200) throw new Error(`Login ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }
  async registrieren(schluessel, rollen, firma = "") {
    const email = `cl-test-${LAUF}-${schluessel}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email, passwort: PASSWORT, vorname: "Closing", nachname: `Test ${schluessel}`, firma, rollen, agb: true });
    this.email = email;
    if (r.status === 409) return this.login(email, PASSWORT); // Wiederholung nach Zeitüberschreitung: Konto besteht schon
    if (r.status !== 201) throw new Error(`Registrierung ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }
}

async function projektMitLoi(anbieter, investor, admin, titel, loi) {
  let r = await anbieter.post("/api/portal/projekte", { titel });
  const pid = r.json.projekt?.id;
  await anbieter.patch(`/api/portal/projekte/${pid}`, {
    titel, typ: "freiflaeche", land: "DE", bundesland: "Bayern", region: "Schwaben (Test)", mwp: 8, phase: "rtb", netzanschluss: "zusage", codGeplant: "2027-10", preisModus: "proKwp", preisProKwp: 95,
    beschreibung: "Testprojekt aus dem automatischen Closing-Test. Baureif, Netzzusage vorhanden. Keine echten Angaben.", vertraulich: { gemeinde: `Closinggemeinde-${LAUF}` },
  });
  await anbieter.post(`/api/portal/projekte/${pid}/provision`, { akzeptiert: true });
  await anbieter.post("/api/portal/status", { art: "projekt", id: pid, nach: "pruefung" });
  r = await admin.post("/api/admin/status", { art: "projekt", id: pid, nach: "veroeffentlicht", extra: { provisionSatz: 2 } });
  if (r.status !== 200) throw new Error(`Veröffentlichen: ${r.status} ${JSON.stringify(r.json)}`);
  r = await investor.post(`/api/portal/boerse/${pid}/nda`, { akzeptiert: true });
  const iid = r.json.interesse?.id;
  r = await admin.post("/api/admin/status", { art: "interesse", id: iid, nach: "nda_freigegeben" });
  if (r.status !== 200) throw new Error(`NDA: ${r.status} ${JSON.stringify(r.json)}`);
  r = await investor.post("/api/portal/status", { art: "interesse", id: iid, nach: "loi_abgegeben", extra: { loi } });
  if (r.status !== 200) throw new Error(`LOI: ${r.status} ${JSON.stringify(r.json)}`);
  r = await admin.post("/api/admin/status", { art: "interesse", id: iid, nach: "loi_angenommen" });
  if (r.status !== 200) throw new Error(`LOI annehmen: ${r.status} ${JSON.stringify(r.json)}`);
  return { pid, iid };
}

async function http() {
  const admin = new Client("admin");
  const akquise = new Client("bo-akquise");
  const buchhaltung = new Client("bo-buchhaltung");
  const eigentuemer = new Client("eigentümer");
  const fremd = new Client("fremd");
  const flaeche = new Client("flaeche");
  const landwirt = new Client("landwirt");
  let r;

  abschnitt("B1. Vorbereitung & Demo-Akten");
  await admin.login("admin@example.com");
  await akquise.login("bo-akquise@example.com");
  await buchhaltung.login("bo-buchhaltung@example.com");
  await flaeche.login("flaeche@example.com");
  await landwirt.login("landwirt@example.com");
  await eigentuemer.registrieren("eigentuemer", ["flaeche"]);
  await fremd.registrieren("fremd", ["flaeche"]);
  r = await admin.get("/api/admin/grundbuch?status=");
  pruefe(r.status === 200 && r.json.akten?.length >= 3 && Array.isArray(r.json.bericht) && r.json.kennzahlen, "Backoffice: Akten, Kennzahlen und Bericht „offene Eintragungen“", r.json);
  const demoAkten = r.json.akten || [];
  const deDemo = demoAkten.find((a) => a.land === "DE" && a.bezug?.art === "flaeche");
  const atDemo = demoAkten.find((a) => a.land === "AT" && /Schlag Nord/.test(a.titel));
  pruefe(!!deDemo && !!atDemo && demoAkten.some((a) => a.land === "CH"), "Demo-Akten DE (Fläche), AT und CH vorhanden");
  r = await flaeche.get("/api/portal/grundbuch");
  pruefe(r.status === 200 && r.json.akten.length >= 1 && r.json.akten.every((a) => a.meineRolle === "eigentuemer") && !r.json.akten.some((a) => a.id === atDemo?.id), "Eigentümerin sieht nur eigene Akten", r.json.akten?.map((a) => a.id));
  if (atDemo) {
    r = await flaeche.get(`/api/portal/grundbuch/${atDemo.id}`);
    pruefe(r.status === 403, "Fremde Akte (AT, Landwirt) → 403", r.status);
    r = await landwirt.get(`/api/portal/grundbuch/${atDemo.id}`);
    pruefe(r.status === 200 && r.json.akte.schritte.every((s) => s.portal && s.text === undefined && s.notiz === undefined) && r.json.akte.eigentuemerId === undefined, "Eigentümer-Sicht vereinfacht („Was bedeutet das für Sie?“, keine internen Notizen)", { status: r.status, fehler: r.json?.error, schritt: r.json?.akte?.schritte?.[0] });
    r = await flaeche.get(`/portal/grundbuch/${atDemo.id}`);
    pruefe(r.status === 404 || !r.text.includes(atDemo.titel), "Seite fremder Akte → 404 (ohne Inhalte)", r.status);
  }
  r = await admin.get("/api/admin/grundbuch/auswahl");
  pruefe(r.status === 200 && Array.isArray(r.json.flaechen) && Array.isArray(r.json.anlagen), "Auswahl Flächen/Anlagen für neue Akte");

  abschnitt("B2. Grundbuch-Schrittfolge DE über die API");
  r = await admin.post("/api/admin/grundbuch", { bezugArt: "frei", titel: `Testakte DE ${LAUF}`, eigentuemerName: "Closing Test Eigentümer", eigentuemerEmail: eigentuemer.email, land: "DE", objektArt: "freiflaeche", pfandglaeubiger: [{ name: "Testbank eG", recht: "Grundschuld Abt. III Nr. 1" }], entgeltJahr: 20000, laufzeitJahre: 30 });
  pruefe(r.status === 201 && r.json.akte?.schritte?.length === 6 && r.json.akte.status === "vorbereitung", "Akte DE angelegt (6 Schritte, Vorbereitung)", r.json);
  const gid = r.json.akte?.id;
  const schritt = (c, body) => c.post(`/api/admin/grundbuch/${gid}/schritt`, body);
  r = await schritt(admin, { schluessel: "eintragung", status: "erledigt", nachweisWert: "Abt. II Nr. 9" });
  pruefe(r.status === 409, "Eintragung vor den übrigen Schritten → 409", r.json);
  r = await schritt(admin, { schluessel: "rang", status: "entfaellt" });
  pruefe(r.status === 200, "Rang kann (optional) entfallen – danach wieder offen setzen", r.json);
  r = await schritt(admin, { schluessel: "rang", status: "offen" });
  pruefe(r.status === 200 && r.json.akte.schritte.find((x) => x.schluessel === "rang").status === "offen", "Rang wieder offen", r.json);
  r = await schritt(buchhaltung, { schluessel: "vertrag", status: "erledigt" });
  pruefe(r.status === 403, "Unterrolle Buchhaltung (nur lesen) → 403", r.status);
  r = await admin.post(`/api/admin/grundbuch/${gid}/schritt`, { schluessel: "vertrag", status: "erledigt" }, { origin: "https://boese.example" });
  pruefe(r.status === 403, "CSRF: fremde Herkunft → 403", r.status);
  r = await schritt(akquise, { schluessel: "vertrag", status: "erledigt" });
  pruefe(r.status === 200 && r.json.akte.status === "unterschrift", "Akquise erledigt „Vertrag“ → Zur Unterschrift", r.json.akte?.status);
  r = await admin.post(`/api/admin/grundbuch/${gid}/signatur`, {});
  pruefe(r.status === 200 && /^S/.test(r.json.signaturId || "") && r.json.akte.schritte.find((s) => s.schluessel === "unterschrift").status === "in_arbeit", "Vertrag über das Signatur-Modul an den Eigentümer gesendet", r.json);
  r = await eigentuemer.get("/api/portal/signatur");
  pruefe(r.status === 200 && JSON.stringify(r.json).includes(`Testakte DE ${LAUF}`), "Eigentümer sieht den Signaturvorgang", r.status);
  r = await schritt(admin, { schluessel: "unterschrift", status: "erledigt" });
  r = await schritt(admin, { schluessel: "antrag", status: "erledigt", nachweisWert: "Az. 1/2026" });
  pruefe(r.status === 409, "Antrag vor der Beglaubigung → 409", r.json);
  r = await schritt(admin, { schluessel: "beglaubigung", status: "erledigt" });
  r = await schritt(admin, { schluessel: "antrag", status: "erledigt" });
  pruefe(r.status === 422, "Antrag ohne Aktenzeichen → 422", r.json);
  r = await schritt(admin, { schluessel: "antrag", status: "erledigt", nachweisWert: `Az. GBA ${LAUF}` });
  pruefe(r.status === 200 && r.json.akte.status === "eingereicht", "Antrag mit Aktenzeichen → eingereicht", r.json.akte?.status);
  r = await schritt(admin, { schluessel: "eintragung", status: "erledigt", nachweisWert: "Abt. II Nr. 4" });
  pruefe(r.status === 409, "Eintragung ohne Rangrücktritt der Bank → 409", r.json);
  r = await schritt(admin, { schluessel: "rang", status: "erledigt", nachweisWert: "Rangrücktritt Testbank" });
  pruefe(r.status === 200, "Rangrücktritt mit Nachweis erledigt", r.json);
  const fd = new FormData();
  fd.append("datei", new Blob([Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n")], { type: "application/pdf" }), "grundbuchauszug.pdf");
  fd.append("schritt", "eintragung");
  r = await admin.anfrage("POST", `/api/admin/grundbuch/${gid}/dokumente`, fd, { kopf: { "X-Plattform-Upload": "1" } });
  pruefe(r.status === 200 && r.json.dokument?.id, "Grundbuchauszug hochgeladen (Magic Bytes)", r.json);
  const dokId = r.json.dokument?.id;
  r = await schritt(admin, { schluessel: "eintragung", status: "erledigt" });
  pruefe(r.status === 200 && r.json.akte.status === "eingetragen", "Eintragung mit Dokument als Nachweis → eingetragen", r.json);
  r = await schritt(admin, { schluessel: "antrag", status: "offen" });
  pruefe(r.status === 409, "Zurücksetzen mit erledigtem Nachfolger → 409", r.status);
  r = await eigentuemer.get(`/api/portal/grundbuch/${gid}`);
  pruefe(r.status === 200 && r.json.akte.status === "eingetragen" && r.json.akte.dokumente.length === 1, "Eigentümer sieht eigene Akte inkl. Grundbuchauszug", r.json.akte?.dokumente);
  r = await eigentuemer.get(`/api/portal/grundbuch/${gid}/dokumente/${dokId}`, { roh: true });
  pruefe(r.status === 200 && r.daten.subarray(0, 4).toString() === "%PDF", "Eigentümer lädt den Grundbuchauszug", r.status);
  r = await fremd.get(`/api/portal/grundbuch/${gid}`);
  pruefe(r.status === 403, "Fremdes Konto → 403", r.status);
  r = await fremd.get(`/api/portal/grundbuch/${gid}/muster?vorlage=rangruecktritt`, { roh: true });
  pruefe(r.status === 403, "Fremdes Konto: Muster → 403", r.status);
  r = await eigentuemer.get(`/api/portal/grundbuch/${gid}/muster?vorlage=rangruecktritt`, { roh: true });
  pruefe(r.status === 200 && /pdf/.test(r.typ) && r.daten.subarray(0, 4).toString() === "%PDF", "Muster „Rangrücktritt“ als PDF", r.status);
  r = await fremd.get("/api/admin/grundbuch");
  pruefe(r.status === 403, "Portal-Konto auf Backoffice-API → 403", r.status);

  abschnitt("B3. Schrittfolge AT/CH");
  r = await admin.post("/api/admin/grundbuch", { bezugArt: "frei", titel: `Testakte AT ${LAUF}`, eigentuemerName: "Test AT", land: "AT", objektArt: "dach", ohnePfandrecht: true });
  pruefe(r.status === 201 && r.json.akte.schritte.find((s) => s.schluessel === "rang").status === "entfaellt" && r.json.akte.schritte.some((s) => /Grundbuchsgesuch/.test(s.label)) && r.json.akte.vorlagen.some((v) => v.id === "dachnutzung_servitut"), "AT-Dach: Rang entfällt ohne Pfandrecht, Grundbuchsgesuch, Dachnutzungs-Muster", r.json.akte?.schritte?.map((s) => s.status));
  const atId = r.json.akte?.id;
  r = await admin.post(`/api/admin/grundbuch/${atId}/signatur`, {});
  pruefe(r.status === 409, "Signatur ohne Portal-Konto des Eigentümers → 409", r.json);
  r = await admin.post("/api/admin/grundbuch", { bezugArt: "frei", titel: `Testakte CH ${LAUF}`, eigentuemerName: "Test CH", land: "CH", recht: "baurecht" });
  pruefe(r.status === 201 && r.json.akte.schritte.some((s) => s.schluessel === "beurkundung") && !r.json.akte.schritte.some((s) => s.schluessel === "unterschrift") && r.json.akte.kosten.waehrung === "CHF", "CH: Beurkundung, Kosten in CHF", r.json.akte?.schritte?.map((s) => s.schluessel));
  const chId = r.json.akte?.id;
  r = await admin.post(`/api/admin/grundbuch/${chId}/schritt`, { schluessel: "antrag", status: "erledigt", nachweisWert: "TB 1" });
  pruefe(r.status === 409, "CH: Anmeldung vor Beurkundung → 409", r.status);
  r = await admin.patch(`/api/admin/grundbuch/${chId}`, { abgebrochen: true, grund: "Test: Projekt nicht realisiert" });
  pruefe(r.status === 200 && r.json.akte.status === "abgebrochen", "Akte abbrechen mit Grund", r.json.akte?.status);

  abschnitt("B4. Closing: KYC beider Seiten Pflicht (unverifizierte Parteien)");
  const tAnbieter = new Client("test-anbieter");
  const tInvestor = new Client("test-investor");
  await tAnbieter.registrieren("anbieter", ["anbieter"], `Closing Entwicklung ${LAUF}`);
  await tInvestor.registrieren("investor", ["investor"], `Closing Capital ${LAUF}`);
  const loi = { struktur: true, text: "Indikatives Angebot aus dem Closing-Test.", preisbasis: "proKwp", preisProKwp: 92, transaktion: "share", zahlung: "einmal", bedingungenListe: ["gremien"], finanzierung: "ek", gueltigBis: new Date(Date.now() + 60 * 86400e3).toISOString().slice(0, 10) };
  let unver = null;
  try {
    unver = await projektMitLoi(tAnbieter, tInvestor, admin, `Closing-Test unverifiziert ${LAUF}`, loi);
  } catch (e) {
    pruefe(false, "Projekt mit angenommener LOI (unverifizierte Parteien)", e.message);
  }
  if (unver) {
    r = await admin.post("/api/admin/closing", { projektId: unver.pid, interesseId: unver.iid, struktur: "share" });
    pruefe(r.status === 201 && r.json.closing.status === "vorbereitung" && r.json.closing.kaufpreis === 92 * 8000, "Closing-Raum aus angenommener LOI (Kaufpreis aus LOI)", r.json.closing?.kaufpreis);
    const cid = r.json.closing?.id;
    for (const s of ["bonitaet", "finanzierung", "gremien", "dd", "spa"]) await admin.post(`/api/admin/closing/${cid}/aktion`, { aktion: "signing_punkt", schluessel: s, erledigt: true });
    await admin.post("/api/admin/dealroom/freigabe", { projektId: unver.pid, interesseId: unver.iid });
    r = await admin.post(`/api/admin/closing/${cid}/aktion`, { aktion: "signing" });
    pruefe(r.status === 409 && r.json.code === "kyc" && /KYC/.test(r.json.error), "Signing ohne KYC beider Seiten → 409 (code kyc)", r.json);
    r = await admin.post(`/api/admin/closing/${cid}/aktion`, { aktion: "signing_punkt", schluessel: "kyc_kaeufer", erledigt: true });
    pruefe(r.status === 409, "KYC-Punkt nicht manuell abhakbar → 409", r.status);
    r = await admin.post(`/api/admin/closing/${cid}/aktion`, { aktion: "closing" });
    pruefe(r.status === 409, "Closing vor Signing → 409", r.status);
    r = await admin.post(`/api/admin/closing/${cid}/aktion`, { aktion: "abbrechen", grund: "Testlauf beendet" });
    pruefe(r.status === 200 && r.json.closing.status === "abgebrochen", "Closing-Raum abbrechen", r.json.closing?.status);
  }

  abschnitt("B5. Closing end-to-end (verifizierte Parteien: anbieter@ / investor@)");
  const anbieter = new Client("anbieter");
  const investor = new Client("investor");
  await anbieter.login("anbieter@example.com");
  await investor.login("investor@example.com");
  let deal = null;
  try {
    deal = await projektMitLoi(anbieter, investor, admin, `Closing-Test verifiziert ${LAUF}`, { ...loi, bedingungenListe: ["gremien", "netz"] });
  } catch (e) {
    pruefe(false, "Projekt mit angenommener LOI (anbieter@ → investor@)", e.message);
  }
  if (!deal) return;
  r = await admin.get("/api/admin/closing");
  pruefe(r.status === 200 && r.json.kandidaten.some((k) => k.interesseId === deal.iid && k.herkunft === "loi"), "Kandidat (angenommene LOI) erscheint", r.json.kandidaten?.length);
  r = await akquise.get("/api/admin/closing");
  pruefe(r.status === 403, "Unterrolle Akquise hat keinen Zugriff auf Closing → 403", r.status);
  r = await admin.post("/api/admin/closing", { projektId: deal.pid, interesseId: deal.iid, struktur: "share", spvName: `Test SPV ${LAUF} GmbH` });
  pruefe(r.status === 201 && r.json.closing.cps.some((c) => c.schluessel === "gremien_kaeufer") && r.json.closing.cps.some((c) => c.schluessel === "netz"), "Closing-Raum eröffnet, CPs aus LOI-Bedingungen", r.json.closing?.cps?.map((c) => c.schluessel));
  const cid = r.json.closing?.id;
  r = await admin.post("/api/admin/closing", { projektId: deal.pid, interesseId: deal.iid });
  pruefe(r.status === 409, "Zweiter Closing-Raum für dasselbe Projekt → 409", r.status);
  r = await investor.get(`/api/portal/closing/${cid}`);
  pruefe(r.status === 200 && r.json.closing.meineRolle === "kaeufer" && r.json.closing.verkaeufer.anonym === true && !JSON.stringify(r.json.closing.verkaeufer).includes("anbieter@example.com") && r.json.closing.provision === null, "Käufer sieht Closing, Verkäufer anonym bis Kontaktfreigabe, keine Provision", r.json.closing?.verkaeufer);
  r = await anbieter.get(`/api/portal/closing/${cid}`);
  pruefe(r.status === 200 && r.json.closing.meineRolle === "verkaeufer" && r.json.closing.kaeufer.anonym === true, "Verkäufer sieht Closing, Käufer anonym", r.json.closing?.kaeufer);
  r = await tInvestor.get(`/api/portal/closing/${cid}`);
  pruefe(r.status === 403, "Fremder Investor → 403", r.status);
  r = await fremd.get(`/portal/closing/${cid}`);
  pruefe(r.status === 404 || !r.text.includes(`Closing-Test verifiziert ${LAUF}`), "Seite fremder Closing-Raum → 404 (ohne Inhalte)", r.status);
  r = await investor.get("/api/portal/closing");
  pruefe(r.status === 200 && r.json.closings.some((c) => c.id === cid), "Käufer: Liste eigener Closings");

  r = await admin.post(`/api/admin/closing/${cid}/aktion`, { aktion: "signing" });
  pruefe(r.status === 409 && r.json.code === "signing" && /Offen:/.test(r.json.error), "Signing mit offener Checkliste → 409 (KYC ok)", r.json);
  for (const s of ["bonitaet", "finanzierung", "gremien", "dd", "spa"]) await admin.post(`/api/admin/closing/${cid}/aktion`, { aktion: "signing_punkt", schluessel: s, erledigt: true });
  r = await admin.post(`/api/admin/closing/${cid}/aktion`, { aktion: "signing" });
  pruefe(r.status === 409 && /Kontaktfreigabe/.test(r.json.error), "Signing ohne Kontaktfreigabe → 409", r.json.error);
  r = await admin.post("/api/admin/dealroom/freigabe", { projektId: deal.pid, interesseId: deal.iid });
  r = await admin.post(`/api/admin/closing/${cid}/aktion`, { aktion: "signing" });
  pruefe(r.status === 200 && r.json.closing.status === "signing" && r.json.closing.kyc.kaeufer && r.json.closing.kyc.verkaeufer, "Signing bestätigt (KYC beider Seiten verifiziert)", r.json);
  r = await investor.get(`/api/portal/closing/${cid}`);
  pruefe(r.json.closing?.verkaeufer?.anonym === false, "Nach Kontaktfreigabe: Verkäufer namentlich sichtbar");

  const cps = r.json.closing?.cps || [];
  const eigeneCp = cps.find((c) => c.verantwortlich === "kaeufer");
  const fremdeCp = cps.find((c) => c.verantwortlich === "verkaeufer");
  r = await investor.post(`/api/portal/closing/${cid}`, { aktion: "cp_melden", schluessel: fremdeCp.schluessel, nachweis: "Test-Nachweis Käufer" });
  pruefe(r.status === 403, "Käufer kann CP des Verkäufers nicht melden → 403", r.status);
  r = await investor.post(`/api/portal/closing/${cid}`, { aktion: "cp_melden", schluessel: eigeneCp.schluessel, nachweis: "Beschluss Investment Committee (Test)" });
  pruefe(r.status === 200 && r.json.closing.cps.find((c) => c.schluessel === eigeneCp.schluessel).status === "gemeldet", "Käufer meldet eigene CP als erfüllt", r.json);
  r = await admin.post(`/api/admin/closing/${cid}/aktion`, { aktion: "closing" });
  pruefe(r.status === 409 && /Closing Condition/.test(r.json.error), "Closing mit offenen CPs → 409", r.json.error);
  r = await admin.post(`/api/admin/closing/${cid}/aktion`, { aktion: "cp", schluessel: fremdeCp.schluessel, status: "erfuellt", nachweis: "" });
  pruefe(r.status === 422, "CP „erfüllt“ ohne Nachweis → 422", r.status);
  for (const c of cps) await admin.post(`/api/admin/closing/${cid}/aktion`, { aktion: "cp", schluessel: c.schluessel, status: c.schluessel === "kein_mac" ? "verzichtet" : "erfuellt", nachweis: `Nachweis Test ${c.schluessel} vom 30.09.` });
  r = await admin.post(`/api/admin/closing/${cid}/aktion`, { aktion: "closing" });
  pruefe(r.status === 409 && /Zahlungseingang|Treuhand/.test(r.json.error) && /Notartermin/.test(r.json.error), "Closing ohne Zahlung und Notartermin → 409", r.json.error);
  r = await admin.patch(`/api/admin/closing/${cid}`, { notar: { name: "Dr. Test Notar", kanzlei: "Notariat Test", ort: "Teststraße 1, Testort", termin: new Date(Date.now() + 86400e3).toISOString() }, zahlung: { treuhand: true, kontoHinweis: "Notaranderkonto (Test)" } });
  pruefe(r.status === 200 && r.json.closing.notar.termin, "Notartermin und Treuhand eingetragen", r.status);
  r = await investor.get(`/api/portal/closing/${cid}/termin`, { roh: true });
  pruefe(r.status === 200 && /text\/calendar/.test(r.typ) && r.daten.toString().includes("BEGIN:VEVENT"), "Käufer lädt Notartermin als .ics", r.status);
  r = await admin.post(`/api/admin/closing/${cid}/aktion`, { aktion: "zahlung_eingang", betrag: 1000 });
  pruefe(r.status === 422, "Zahlungseingang unter Kaufpreis → 422", r.json);
  r = await admin.post(`/api/admin/closing/${cid}/aktion`, { aktion: "zahlung_eingang" });
  pruefe(r.status === 200 && r.json.closing.zahlung.eingangAm, "Zahlungseingang (Treuhand) bestätigt", r.status);
  r = await buchhaltung.post(`/api/admin/closing/${cid}/aktion`, { aktion: "closing" });
  pruefe(r.status === 403, "Unterrolle Buchhaltung kann Closing nicht vollziehen → 403", r.status);
  r = await admin.post(`/api/admin/closing/${cid}/aktion`, { aktion: "closing" });
  pruefe(r.status === 200 && r.json.closing.status === "vollzogen", "Closing vollzogen", r.json);
  const c = r.json.closing || {};
  pruefe(c.provision && c.provision.betrag === Math.round(c.kaufpreis * 0.02), "Provision automatisch angelegt (2 % des Kaufpreises)", c.provision);
  pruefe(!!c.rechnung?.nummer, "Provisionsrechnung über das Finanzen-Modul erzeugt", c.rechnung);
  r = await anbieter.get(`/api/portal/projekte/${deal.pid}`);
  pruefe(r.status === 200 && r.json.projekt?.status === "verkauft", "Projekt ist verkauft", r.json.projekt?.status);
  r = await anbieter.get(`/api/portal/closing/${cid}`);
  pruefe(r.json.closing?.provision && r.json.closing.rechnung, "Verkäufer sieht Provision und Rechnung");
  r = await investor.get(`/api/portal/closing/${cid}`);
  pruefe(r.json.closing?.provision === null && r.json.closing?.rechnung === null, "Käufer sieht keine Provision");
  r = await investor.get(`/api/portal/closing/${cid}/pdf?art=bericht`, { roh: true });
  pruefe(r.status === 200 && r.daten.subarray(0, 4).toString() === "%PDF", "Abschlussbericht als PDF", r.status);
  r = await investor.get(`/api/portal/closing/${cid}/pdf?art=spa`, { roh: true });
  pruefe(r.status === 200 && r.daten.subarray(0, 4).toString() === "%PDF", "SPA-Muster als PDF", r.status);
  r = await admin.post(`/api/admin/closing/${cid}/aktion`, { aktion: "uebergabe", schluessel: "unterlagen", erledigt: true });
  pruefe(r.status === 200 && r.json.closing.uebergabe.find((u) => u.schluessel === "unterlagen").erledigt, "Übergabe-Punkt erledigt", r.status);
  r = await admin.post(`/api/admin/closing/${cid}/aktion`, { aktion: "cp", schluessel: cps[0].schluessel, status: "offen" });
  pruefe(r.status === 409, "Nach Closing keine Änderungen an CPs → 409", r.status);

  abschnitt("B6. Seiten");
  for (const [cl, pfad, merkmal] of [[admin, "/portal/admin/grundbuch", "offene Grundbuch-Eintragungen"], [admin, `/portal/admin/grundbuch/${gid}`, "Kostenschätzung"], [admin, "/portal/admin/closing", "Closing-Räume"], [admin, `/portal/admin/closing/${cid}`, "Closing Conditions"], [eigentuemer, `/portal/grundbuch/${gid}`, "Was bedeutet das für Sie?"], [eigentuemer, "/portal/grundbuch", "Ihre Grundbuch-Akten"], [investor, `/portal/closing/${cid}`, "Closing Conditions"], [anbieter, "/portal/closing", "Ihre Closing-Räume"]]) {
    r = await cl.get(pfad);
    pruefe(r.status === 200 && r.text.includes(merkmal), `Seite ${pfad} (${cl.name}) → 200 mit „${merkmal}“`, r.status);
  }
  r = await akquise.get("/portal/admin/closing");
  pruefe(r.status === 404 || !r.text.includes("Closing-Räume"), "Seite Closing für Unterrolle Akquise → 404", r.status);
}

async function main() {
  console.log(`Grundbuch & Closing – Test (${NUR_LOGIK ? "nur Logik" : BASIS}, Lauf ${LAUF})`);
  await logik();
  if (!NUR_LOGIK) await http();
  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen bestanden")} · ${ok} ok`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
