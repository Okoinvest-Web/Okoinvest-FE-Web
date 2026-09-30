// scripts/plattform-test-gutachter-bank.mjs
//
// Test „Gutachter/Planer und Bank“: reine Logik (Node) + End-to-End gegen den laufenden Dev-Server (Demo-Backend).
//   node scripts/plattform-test-gutachter-bank.mjs [basis-url]      (--nur-logik: ohne Server; --nur-berichte: nur Abschnitt B5)
//
// Logik (gleiche Fälle wie Backend-Import/…/tests/test_gutachter_bank_kern.py): Zustandsautomat Gutachterauftrag, Honorar
// (pauschal/Stunden, Nebenkosten, USt), Rechnungsgrenzen (Abschlag ≤ Anteil, Summe ≤ Auftragssumme, Schluss nach Abnahme),
// IBAN, Bewertung (kaufmännisch gerundet), Angebotsvergleich, Fristen; Bank-Teamrollen, Kreditentscheidung, Auszahlung nur mit
// bestätigten CPs, Anforderungen, Akte-Stand.
// API Gutachter: Anfrage an Gutachter → Angebot → Beauftragung (nur Backoffice schreibend) → PDF → Bestätigung (Zuweisung
// Meilenstein) → Termine → Zwischenstand → Abschlag → Lieferung Entwurf → Mängel → Endfassung → Freigabe → Abnahme → Schluss-
// rechnung → Prüfung → Zahlung nur mit Finanzen-Schreibrecht (Ist-Kosten am Projekt) → Bewertung (für den Gutachter unsichtbar),
// fremde Konten 403, CSRF, Seiten.
// API Bank: Anforderung (Sachbearbeitung) → Lieferung mit Baustein-Freigabe → Akzeptanz · Q&A mit Datei · Team (Einladung gleiche
// Domain, Rolle „Nur lesen“ ohne Schreibrechte, Entfernen) · Kreditentscheidung (nur Leitung, erst nach Auswahl) · CP-Bestätigung
// (verfällt bei erneutem Abhaken) · Auszahlung (Freigabe Leitung, Valuta) · Covenant-Report als PDF, Bericht prüfen · Seiten.
// Eigene Konten gb-test-<Lauf>-…@example.com.

import {
  AUFTRAG_UEBERGAENGE, angebotBereinigen, angebotVergleich, anfrageBereinigen, auftragFristen, berichtBereinigen, bewertungBereinigen, bewertungSchnitt,
  ibanPruefen, naechsteVersion, rechnungBereinigen, rechnungsStand, uebergang,
} from "../src/lib/plattform/gutachter/kern.js";
import { BANK_AKTION_ROLLE, akteStand, anforderungenBereinigen, auszahlungBereinigen, bankRolleAus, bankRolleReicht, berichtBereinigen as bankBericht, kreditentscheidungBereinigen } from "../src/lib/plattform/finanzierung/bankakte.js";

const BASIS = (process.argv.find((a) => /^https?:/.test(a)) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const NUR_LOGIK = process.argv.includes("--nur-logik");
const NUR_BERICHTE = process.argv.includes("--nur-berichte"); // nur Abschnitt B5 (Monitoring-Berichte der Bank)
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);
const PASSWORT = "GutachterBank-Test-Passwort-26";
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const HEUTE = new Date().toISOString().slice(0, 10);
const tag = (t) => new Date(Date.now() + t * 86400e3).toISOString().slice(0, 10);

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
const wirft = (fn, status) => {
  try {
    fn();
    return false;
  } catch (e) {
    return status ? e.status === status : true;
  }
};

// ================================================================ Logik

function logik() {
  const H = "2026-10-01";
  const angebot = (x = {}) => angebotBereinigen({ honorarArt: "pauschal", honorarNetto: 10000, nebenkostenPct: 5, ustPct: 19, liefertermin: "2026-12-01", abschlagPct: 30, zahlungszielTage: 30, ...x }, { heute: H, land: "DE" });

  abschnitt("L1. Zustandsautomat Gutachterauftrag");
  pruefe(uebergang("angebot_abgeben", { status: "angefragt", wer: "gutachter" }).nach === "angebot" && uebergang("beauftragen", { status: "angebot", wer: "bo" }).nach === "beauftragt" && uebergang("auftrag_bestaetigen", { status: "beauftragt", wer: "gutachter" }).nach === "in_arbeit", "Anfrage → Angebot → Beauftragung → Bestätigung");
  pruefe(wirft(() => uebergang("beauftragen", { status: "angebot", wer: "gutachter" }), 403) && wirft(() => uebergang("abnehmen", { status: "in_arbeit", wer: "bo" }), 409), "Falsche Seite → 403, falscher Status → 409");
  pruefe(wirft(() => uebergang("stornieren", { status: "abgenommen", wer: "bo" }), 409) && !AUFTRAG_UEBERGAENGE.stornieren.von.includes("abgerechnet"), "Nach Abnahme keine Stornierung");

  abschnitt("L2. Honorar und Angebot");
  const a = angebot();
  pruefe([a.honorar, a.nebenkosten, a.summeNetto, a.summeUst, a.summeBrutto].join() === "10000,500,10500,1995,12495", "Pauschal 10.000 € + 5 % NK + 19 % USt = 12.495 € brutto", a);
  const s = angebot({ honorarArt: "stunden", stundensatz: 95, stunden: 120.5, nebenkostenPct: 0, ustPct: 20 });
  pruefe(s.summeNetto === 11447.5 && s.summeBrutto === 13737, "Stunden: 120,5 h × 95 € = 11.447,50 € netto, 20 % USt (AT)", s);
  pruefe(wirft(() => angebot({ honorarNetto: 0 })) && wirft(() => angebot({ liefertermin: "2026-09-01" })) && wirft(() => angebot({ ustPct: 0 })), "Pflichtangaben: Honorar, Liefertermin in der Zukunft, Grund bei 0 % USt");
  pruefe(angebot({ ustPct: 0, ustHinweis: "Reverse Charge" }).summeUst === 0 && angebot({ ustPct: 33 }).ustPct === 19, "0 % mit Hinweis; unzulässiger Satz → Landesstandard");
  pruefe(wirft(() => anfrageBereinigen({ titel: "Blendgutachten", fachgebiet: "blendung", leistung: "zu kurz", angebotsfrist: "2026-10-15" }, { heute: H, fachgebiete: ["blendung"] })), "Leistungsbeschreibung Pflicht (mind. 20 Zeichen)");

  abschnitt("L3. Rechnungen");
  const auf = { status: "in_arbeit", angebot: a, rechnungen: [] };
  const r = rechnungBereinigen({ art: "abschlag", nummer: "R-1", datum: "2026-09-30", leistungVon: "2026-09-01", leistungBis: "2026-09-30", netto: 3150 }, auf, { heute: H });
  pruefe(r.ust === 598.5 && r.brutto === 3748.5 && r.faelligAm === "2026-10-30", "Abschlag 30 %: 3.150 € + USt, fällig nach 30 Tagen", r);
  auf.rechnungen.push({ ...r, status: "eingereicht" });
  const re = (x) => ({ datum: "2026-09-30", leistungVon: "2026-09-01", leistungBis: "2026-09-30", ...x });
  pruefe(wirft(() => rechnungBereinigen(re({ art: "abschlag", nummer: "R-2", netto: 1 }), auf, { heute: H })), "Abschläge über dem vereinbarten Anteil → abgelehnt");
  pruefe(wirft(() => rechnungBereinigen(re({ art: "schluss", nummer: "R-3", netto: 100 }), auf, { heute: H }), 409), "Schlussrechnung vor Abnahme → 409");
  auf.status = "abgenommen";
  pruefe(wirft(() => rechnungBereinigen(re({ art: "schluss", nummer: "R-3", netto: 7351 }), auf, { heute: H })) && wirft(() => rechnungBereinigen(re({ art: "schluss", nummer: "R-1", netto: 100 }), auf, { heute: H })), "Summe > Auftragssumme bzw. doppelte Nummer → abgelehnt");
  const sr = rechnungBereinigen(re({ art: "schluss", nummer: "R-3", netto: 7350 }), auf, { heute: H });
  auf.rechnungen.push({ ...sr, status: "eingereicht" });
  const st = rechnungsStand(auf, "2026-11-15");
  pruefe(st.berechnetNetto === 10500 && st.restNetto === 0 && st.ueberfaellig === 2 && st.schlussVorhanden, "Rechnungsstand: voll berechnet, 2 überfällig", st);
  pruefe(ibanPruefen("DE89 3704 0044 0532 0130 00") && ibanPruefen("AT611904300234573201") && !ibanPruefen("DE89370400440532013001"), "IBAN-Prüfziffer (ISO 13616)");

  abschnitt("L4. Bewertung, Vergleich, Fristen");
  const b = bewertungBereinigen({ qualitaet: 5, termintreue: 4, kommunikation: 5, preisLeistung: 3 });
  pruefe(b.schnitt === 4.3 && bewertungSchnitt([b, { schnitt: 3.7 }]).schnitt === 4, "Durchschnitt kaufmännisch gerundet (4,25 → 4,3) – identisch mit Python", b.schnitt);
  const z = angebotVergleich([
    { id: "A", angebot: { summeNetto: 10000, liefertermin: "2026-12-01" }, bewertung: 3 },
    { id: "B", angebot: { summeNetto: 12000, liefertermin: "2026-12-01" }, bewertung: 5 },
    { id: "C", angebot: { summeNetto: 9000, liefertermin: "2027-03-31" }, bewertung: null },
  ]);
  pruefe(z.map((x) => x.id).join() === "B,A,C" && z.find((x) => x.id === "C").guenstigstes, "Angebotsvergleich 50 % Preis / 25 % Termin / 25 % Bewertung", z);
  const f = auftragFristen({ status: "in_arbeit", beauftragung: { liefertermin: "2026-09-28" }, termine: [{ id: "T", art: "begehung", datum: "2026-10-03", status: "bestaetigt" }], rechnungen: [] }, H);
  pruefe(f.map((x) => `${x.art}:${x.ueberfaellig}`).join() === "liefertermin:true,termin:false", "Fristen: Liefertermin überfällig, Begehung anstehend", f);
  pruefe(wirft(() => berichtBereinigen({ text: "Kartierung läuft planmäßig", fortschritt: 40 }, { letzter: 60 })) && naechsteVersion([{ version: 1 }, { version: 2 }]) === 3, "Fortschritt nie rückwärts; Versionen fortlaufend");

  abschnitt("L5. Bank-Akte");
  const mg = [{ bankId: "FB-1", nutzerId: "U-2", rolle: "lesen", status: "aktiv" }, { bankId: "FB-1", nutzerId: "U-3", rolle: "sachbearbeiter", status: "entfernt" }];
  const bank = { id: "FB-1", nutzerIds: ["U-1", "U-2", "U-3"] };
  pruefe(bankRolleAus(mg, bank, "U-1") === "leitung" && bankRolleAus(mg, bank, "U-2") === "lesen" && bankRolleAus(mg, bank, "U-3") === null && bankRolleAus(mg, bank, "U-9") === null, "Teamrollen: Erstkontakt = Leitung, Mitglied, entfernt, fremd");
  pruefe(bankRolleReicht("leitung", BANK_AKTION_ROLLE.kreditentscheidung) && !bankRolleReicht("sachbearbeiter", BANK_AKTION_ROLLE.kreditentscheidung) && !bankRolleReicht("lesen", BANK_AKTION_ROLLE.termsheet), "Kreditentscheidung nur Leitung, Term Sheet nicht mit „Nur lesen“");
  pruefe(wirft(() => kreditentscheidungBereinigen({ ergebnis: "genehmigt" }, { anfrageStatus: "termsheet" }), 409), "Kreditentscheidung erst nach Auswahl");
  const k = kreditentscheidungBereinigen({ ergebnis: "genehmigt_auflagen", beschlussAm: "2026-09-30", betrag: 10_500_000, gueltigBis: "2026-12-31", auflagen: "Zweites Ertragsgutachten\nRangrücktritt" }, { anfrageStatus: "ausgewaehlt", termsheetBetrag: 10_000_000, heute: H });
  pruefe(k.auflagen.length === 2 && wirft(() => kreditentscheidungBereinigen({ ergebnis: "genehmigt", beschlussAm: "2026-09-30", betrag: 11_100_000, gueltigBis: "2026-12-31" }, { anfrageStatus: "ausgewaehlt", termsheetBetrag: 10_000_000, heute: H })), "Auflagen; Betrag > 110 % des Term Sheets → abgelehnt");
  const cps = [{ id: "a", label: "Kreditvertrag", erledigt: true }, { id: "b", label: "EK", erledigt: true }];
  pruefe(wirft(() => auszahlungBereinigen({ betrag: 100000, wunschDatum: "2026-10-05", zweck: "EPC-Rate 1" }, { kreditvertrag: { betrag: 1e6 }, cps, cpBank: { a: { status: "bestaetigt" } }, auszahlungen: [], heute: H }), 409), "Auszahlung ohne alle bestätigten CPs → 409");
  const okCp = { a: { status: "bestaetigt" }, b: { status: "bestaetigt" } };
  pruefe(auszahlungBereinigen({ betrag: 400000, wunschDatum: "2026-10-05", zweck: "EPC-Rate 1" }, { kreditvertrag: { betrag: 1e6 }, cps, cpBank: okCp, auszahlungen: [{ betrag: 600000, status: "ausgezahlt" }], heute: H }).betrag === 400000
    && wirft(() => auszahlungBereinigen({ betrag: 400001, wunschDatum: "2026-10-05", zweck: "EPC-Rate 1" }, { kreditvertrag: { betrag: 1e6 }, cps, cpBank: okCp, auszahlungen: [{ betrag: 600000, status: "ausgezahlt" }], heute: H })), "Ziehungen bis genau zum Kreditbetrag");
  const liste = anforderungenBereinigen({ punkte: [{ titel: "Bodengutachten", frist: "2026-10-10", baustein: "epc" }, { titel: "Mietvertrag UW", frist: "2026-10-12", baustein: "unbekannt" }] }, { heute: H, bausteine: ["epc"] });
  pruefe(liste.map((x) => x.baustein).join() === "epc," && wirft(() => anforderungenBereinigen({ punkte: [{ titel: "Bodengutachten", frist: "2026-09-10" }] }, { heute: H })), "Anforderungen: Baustein geprüft, Frist in der Zukunft");
  const sa = akteStand({ anforderungen: [{ status: "offen", frist: "2026-09-01" }, { status: "geliefert" }], qa: [{ status: "offen" }], berichte: [{ status: "angefordert", faelligAm: "2026-09-30" }] }, H);
  pruefe(sa.anforderungenOffen === 1 && sa.anforderungenUeberfaellig === 1 && sa.anforderungenZuPruefen === 1 && sa.fragenOffen === 1 && sa.berichteUeberfaellig === 1, "Akte-Stand (offen, überfällig, zur Prüfung)", sa);
  pruefe(wirft(() => bankBericht({ art: "covenant", periode: "Q3/2026", faelligAm: "2026-09-01" }, { heute: H })), "Bericht: Fälligkeit nicht in der Vergangenheit");
}

// ================================================================ API

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
    const buf = Buffer.from(await res.arrayBuffer());
    const text = buf.toString("utf8");
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 200) };
    }
    return { status: res.status, json, headers: res.headers, text, buf };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  hoch(p, felder = {}, name = "test.pdf", daten = PDF) {
    const fd = new FormData();
    fd.append("datei", new Blob([daten], { type: "application/pdf" }), name);
    for (const [k, w] of Object.entries(felder)) fd.append(k, typeof w === "object" ? JSON.stringify(w) : String(w));
    return this.anfrage("POST", p, fd, { kopf: { "X-Plattform-Upload": "1" } });
  }
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
  async registrieren(schluessel, rollen, vorname, nachname, email = null) {
    const e = email || `gb-test-${LAUF}-${schluessel}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email: e, passwort: PASSWORT, vorname, nachname, firma: "", rollen, agb: true });
    if (r.status !== 201) throw new Error(`Registrierung ${e}: ${r.status} ${JSON.stringify(r.json)}`);
    this.email = e;
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }
}

const istPdf = (r) => r.status === 200 && r.buf.slice(0, 5).toString() === "%PDF-";
const seite404 = (r) => r.status === 404 || r.text.includes("NEXT_HTTP_ERROR_FALLBACK;404");

async function apiGutachter(k) {
  const { admin, pl, gut, buch, lesen, fremd, inv } = k;
  abschnitt("G1. Leistungsanfrage (Backoffice)");
  let r = await admin.get("/api/admin/gutachter");
  pruefe(r.status === 200 && Array.isArray(r.json.auftraege) && r.json.gutachter.some((g) => g.email === "gutachter@example.com"), "Übersicht mit Gutachterliste", r.status);
  pruefe(r.json.auftraege?.some((a) => a.status === "abgerechnet" && a.rechnungsstand.ueberfaellig > 0) && r.json.gutachter.find((g) => g.email === "gutachter@example.com")?.schnitt?.anzahl >= 1, "Demo: überfällige Gutachter-Rechnung und Bewertung vorhanden");
  const gutId = r.json.gutachter.find((g) => g.email === "gutachter@example.com")?.id;
  const belegt = new Set((r.json.auftraege || []).filter((a) => a.gutachter.id === gutId && !["abgeschlossen", "abgelehnt", "nicht_beauftragt", "storniert"].includes(a.status)).map((a) => a.projekt?.meilenstein?.id));
  const projekt = r.json.projekte.find((p) => p.titel.startsWith("Freifläche Thurgau")) || r.json.projekte.find((p) => p.meilensteine.length > 2);
  const ms = projekt?.meilensteine.find((m) => !belegt.has(m.id));
  pruefe(!!projekt && !!ms, "Projekt mit offenem Meilenstein gefunden", projekt?.titel);
  const anfrage = { projektId: projekt?.id, meilensteinId: ms?.id, gutachterIds: [gutId], titel: `gb-test-${LAUF} Blendgutachten`, fachgebiet: "blendung", leistung: "Blendgutachten nach den LAI-Hinweisen für die angrenzende Kantonsstrasse, Immissionsorte, Maßnahmenvorschläge.", angebotsfrist: tag(10), wunschtermin: tag(60) };
  r = await admin.post("/api/admin/gutachter", { ...anfrage, leistung: "zu kurz" });
  pruefe(r.status === 422, "Leistungsbeschreibung zu kurz → 422", r.status);
  r = await admin.post("/api/admin/gutachter", { ...anfrage, angebotsfrist: tag(-1) });
  pruefe(r.status === 422, "Angebotsfrist in der Vergangenheit → 422", r.status);
  r = await lesen.post("/api/admin/gutachter", anfrage);
  pruefe(r.status === 403, "Unterrolle Lesen → 403", r.status);
  r = await admin.post("/api/admin/gutachter", anfrage, { origin: "https://boese.example" });
  pruefe(r.status === 403, "CSRF → 403", r.status);
  r = await admin.post("/api/admin/gutachter", anfrage);
  const id = r.json.ids?.[0];
  pruefe(r.status === 201 && !!id, "Anfrage angelegt", r.json);
  r = await admin.post("/api/admin/gutachter", anfrage);
  pruefe(r.status === 409, "Doppelte offene Anfrage → 409", r.status);

  abschnitt("G2. Angebot (Gutachter) und Rechte");
  r = await gut.get("/api/portal/gutachter");
  pruefe(r.status === 200 && r.json.auftraege.some((a) => a.id === id) && r.json.kennzahlen.anfragen >= 1, "Gutachter sieht die Anfrage", r.status);
  r = await gut.get(`/api/portal/gutachter/${id}`);
  pruefe(r.status === 200 && r.json.auftrag.rechte.angebot && r.json.auftrag.unterlagen.length === 0 && !("bewertung" in r.json.auftrag) && r.json.auftrag.notiz === undefined, "Vor Beauftragung: keine Unterlagen, keine internen Felder");
  for (const [cl, soll] of [[fremd, 403], [inv, 403]]) {
    r = await cl.get(`/api/portal/gutachter/${id}`);
    pruefe(r.status === soll, `${cl.name} → ${soll}`, r.status);
  }
  const ang = { honorarArt: "pauschal", honorarNetto: 8000, nebenkostenPct: 5, ustPct: 8.1, liefertermin: tag(45), gueltigBis: tag(30), abschlagPct: 30, zahlungszielTage: 30 };
  r = await gut.post(`/api/portal/gutachter/${id}`, { aktion: "angebot_abgeben", angebot: { ...ang, ustPct: 0 } });
  pruefe(r.status === 422, "0 % USt ohne Begründung → 422", r.status);
  r = await gut.post(`/api/portal/gutachter/${id}`, { aktion: "angebot_abgeben", angebot: ang });
  pruefe(r.status === 200 && r.json.auftrag.status === "angebot" && r.json.auftrag.angebot.summeNetto === 8400 && r.json.auftrag.angebot.summeBrutto === 9080.4, "Angebot: 8.400 € netto, 9.080,40 € brutto (CH 8,1 %)", r.json.auftrag?.angebot);
  r = await gut.post(`/api/portal/gutachter/${id}`, { aktion: "beauftragen" });
  pruefe(r.status === 403, "Gutachter kann sich nicht selbst beauftragen → 403", r.status);

  abschnitt("G3. Beauftragung, Auftragsbestätigung, Bestätigung");
  r = await lesen.post(`/api/admin/gutachter/${id}`, { aktion: "beauftragen" });
  pruefe(r.status === 403, "Unterrolle Lesen beauftragt nicht → 403", r.status);
  r = await pl.post(`/api/admin/gutachter/${id}`, { aktion: "beauftragen", bedingungen: "Abstimmung mit dem kantonalen Tiefbauamt vorab." });
  pruefe(r.status === 200 && r.json.auftrag.status === "beauftragt" && /^GA-\d{4}-/.test(r.json.auftrag.beauftragung?.nummer || ""), "Projektleitung beauftragt (Auftragsnummer)", r.json.auftrag?.beauftragung);
  r = await gut.get(`/api/portal/gutachter/${id}/pdf?art=auftrag`);
  pruefe(istPdf(r), "Auftragsbestätigung als PDF (Gutachter)", r.status);
  r = await gut.get(`/api/portal/gutachter/${id}/pdf?art=abnahme`);
  pruefe(r.status === 409, "Abnahmeprotokoll vor der Abnahme → 409", r.status);
  r = await gut.hoch(`/api/portal/gutachter/${id}/dateien`, { zweck: "lieferung", art: "entwurf" });
  pruefe(r.status === 409, "Lieferung vor Bestätigung → 409", r.status);
  r = await gut.post(`/api/portal/gutachter/${id}`, { aktion: "auftrag_bestaetigen" });
  pruefe(r.status === 422, "Bestätigung ohne Zustimmung → 422", r.status);
  r = await gut.post(`/api/portal/gutachter/${id}`, { aktion: "auftrag_bestaetigen", zustimmung: true });
  pruefe(r.status === 200 && r.json.auftrag.status === "in_arbeit" && !!r.json.auftrag.beauftragung.bestaetigtAm, "Gutachter bestätigt → in Bearbeitung", r.json.auftrag?.status);
  r = await gut.get(`/api/portal/entwicklung/${projekt?.id}`);
  pruefe(r.status === 200 && r.json.projekt?.gutachter?.auftraege?.some((m) => m.id === ms?.id), "Zuweisung am Meilenstein (Projektentwicklung sichtbar)", r.status);

  abschnitt("G4. Termine, Zwischenstand, Abschlag");
  r = await gut.post(`/api/portal/gutachter/${id}`, { aktion: "termin", termin: { art: "begehung", datum: tag(-2) } });
  pruefe(r.status === 422, "Termin in der Vergangenheit → 422", r.status);
  r = await gut.post(`/api/portal/gutachter/${id}`, { aktion: "termin", termin: { art: "begehung", datum: tag(5), uhrzeit: "09:30", ort: "Parkplatz Nord" } });
  const tid = r.json.auftrag?.termine?.[0]?.id;
  pruefe(r.status === 200 && !!tid, "Gutachter schlägt Begehung vor", r.status);
  r = await gut.post(`/api/portal/gutachter/${id}`, { aktion: "termin_status", terminId: tid, status: "bestaetigt" });
  pruefe(r.status === 409, "Eigenen Vorschlag bestätigen → 409", r.status);
  r = await pl.post(`/api/admin/gutachter/${id}`, { aktion: "termin_status", terminId: tid, status: "bestaetigt" });
  pruefe(r.status === 200 && r.json.auftrag.termine[0].status === "bestaetigt", "Projektleitung bestätigt den Termin", r.status);
  r = await gut.post(`/api/portal/gutachter/${id}`, { aktion: "bericht", text: "Sichtachsen aufgenommen, Simulation läuft.", fortschritt: 40 });
  pruefe(r.status === 200 && r.json.auftrag.fortschritt === 40, "Zwischenstand 40 %", r.status);
  r = await gut.post(`/api/portal/gutachter/${id}`, { aktion: "bericht", text: "Rückschritt ist nicht erlaubt.", fortschritt: 20 });
  pruefe(r.status === 422, "Fortschritt rückwärts → 422", r.status);
  const reDaten = (x) => ({ art: "abschlag", nummer: `A-${LAUF}`, datum: HEUTE, leistungVon: HEUTE, leistungBis: HEUTE, netto: 2520, ustPct: 8.1, ...x });
  r = await gut.hoch(`/api/portal/gutachter/${id}/dateien`, { zweck: "rechnung", rechnung: reDaten({ netto: 2521 }) }, "abschlag.pdf");
  pruefe(r.status === 422, "Abschlag über 30 % → 422", r.status);
  r = await gut.hoch(`/api/portal/gutachter/${id}/dateien`, { zweck: "rechnung", rechnung: reDaten({ iban: "DE00123456780000000000" }) }, "abschlag.pdf");
  pruefe(r.status === 422, "Ungültige IBAN → 422", r.status);
  r = await gut.hoch(`/api/portal/gutachter/${id}/dateien`, { zweck: "rechnung", rechnung: reDaten({}) }, "abschlag.pdf");
  const abschlagId = r.json.rechnung?.id;
  pruefe(r.status === 201 && r.json.rechnung?.brutto === 2724.12, "Abschlagsrechnung 2.520 € + 8,1 % eingereicht", r.json.rechnung);

  abschnitt("G5. Lieferungen, Mängel, Freigabe, Abnahme");
  r = await gut.hoch(`/api/portal/gutachter/${id}/dateien`, { zweck: "lieferung", art: "entwurf", kommentar: "Entwurf" }, "entwurf.pdf");
  const l1 = r.json.lieferung;
  pruefe(r.status === 201 && l1?.version === 1 && r.json.auftrag.status === "in_pruefung", "Entwurf Version 1 → in Prüfung", r.json.auftrag?.status);
  r = await admin.get(`/api/admin/entwicklung/${projekt?.id}`);
  pruefe(r.status === 200 && JSON.stringify(r.json).includes("entwurf.pdf (Version 1)"), "Lieferung erscheint in der Entwicklungsakte", r.status);
  r = await pl.post(`/api/admin/gutachter/${id}`, { aktion: "maengel", lieferungId: l1?.id, maengel: ["x"] });
  pruefe(r.status === 422, "Mangel ohne Text → 422", r.status);
  r = await pl.post(`/api/admin/gutachter/${id}`, { aktion: "maengel", lieferungId: l1?.id, maengel: ["Immissionsort IO 3 fehlt", "Kartenmaßstab angeben"] });
  pruefe(r.status === 200 && r.json.auftrag.status === "nachbesserung", "Mängel gemeldet → Nachbesserung", r.json.auftrag?.status);
  r = await gut.get(`/api/portal/gutachter/${id}`);
  pruefe(r.json.auftrag?.lieferungen?.[0]?.maengel?.length === 2, "Gutachter sieht die Mängelliste");
  r = await gut.hoch(`/api/portal/gutachter/${id}/dateien`, { zweck: "lieferung", art: "endfassung", kommentar: "Mängel behoben" }, "endfassung.pdf");
  const l2 = r.json.lieferung;
  pruefe(r.status === 201 && l2?.version === 2, "Endfassung Version 2 eingereicht", l2);
  r = await gut.hoch(`/api/portal/gutachter/${id}/dateien`, { zweck: "rechnung", rechnung: reDaten({ art: "schluss", nummer: `S-${LAUF}`, netto: 5880 }) }, "schluss.pdf");
  pruefe(r.status === 409, "Schlussrechnung vor Abnahme → 409", r.status);
  r = await pl.post(`/api/admin/gutachter/${id}`, { aktion: "abnehmen" });
  pruefe(r.status === 409, "Abnahme ohne Freigabe → 409", r.status);
  r = await pl.post(`/api/admin/gutachter/${id}`, { aktion: "freigeben", lieferungId: l2?.id });
  pruefe(r.status === 200 && r.json.auftrag.status === "abnahmebereit", "Endfassung freigegeben → Abnahme offen", r.json.auftrag?.status);
  r = await pl.post(`/api/admin/gutachter/${id}`, { aktion: "abnehmen", vorbehalt: "" });
  pruefe(r.status === 200 && r.json.auftrag.status === "abgenommen" && r.json.auftrag.abnahme?.version === 2, "Abgenommen (Version 2)", r.json.auftrag?.abnahme);
  r = await admin.get(`/api/admin/gutachter/${id}/pdf?art=abnahme`);
  pruefe(istPdf(r), "Abnahmeprotokoll als PDF (Backoffice)", r.status);
  r = await pl.post(`/api/admin/gutachter/${id}`, { aktion: "stornieren", grund: "Test: Storno nach Abnahme" });
  pruefe(r.status === 409, "Storno nach Abnahme → 409", r.status);

  abschnitt("G6. Schlussrechnung, Prüfung, Zahlung, Ist-Kosten");
  r = await gut.hoch(`/api/portal/gutachter/${id}/dateien`, { zweck: "rechnung", rechnung: reDaten({ art: "schluss", nummer: `S-${LAUF}`, netto: 5881 }) }, "schluss.pdf");
  pruefe(r.status === 422, "Schlussrechnung über der Auftragssumme → 422", r.status);
  r = await gut.hoch(`/api/portal/gutachter/${id}/dateien`, { zweck: "rechnung", rechnung: reDaten({ art: "schluss", nummer: `A-${LAUF}`, netto: 100 }) }, "schluss.pdf");
  pruefe(r.status === 409, "Doppelte Rechnungsnummer → 409", r.status);
  r = await gut.hoch(`/api/portal/gutachter/${id}/dateien`, { zweck: "rechnung", rechnung: reDaten({ art: "schluss", nummer: `S-${LAUF}`, netto: 5880 }) }, "schluss.pdf");
  const schlussId = r.json.rechnung?.id;
  pruefe(r.status === 201 && r.json.auftrag.status === "abgerechnet" && r.json.auftrag.rechnungsstand.restNetto === 0, "Schlussrechnung → abgerechnet, Rest 0", r.json.auftrag?.rechnungsstand);
  const dateiLink = r.json.auftrag?.rechnungen?.[0]?.datei?.link;
  r = await gut.get(dateiLink || "/x");
  pruefe(r.status === 200 && r.buf.slice(0, 5).toString() === "%PDF-", "Gutachter lädt eigene Rechnung herunter", r.status);
  r = await fremd.get(dateiLink || "/x");
  pruefe(r.status === 403, "Fremdes Konto → 403", r.status);
  r = await buch.post(`/api/admin/gutachter/${id}/zahlung`, { rechnungId: abschlagId });
  pruefe(r.status === 409, "Zahlung einer ungeprüften Rechnung → 409", r.status);
  for (const rid of [abschlagId, schlussId]) {
    r = await pl.post(`/api/admin/gutachter/${id}`, { aktion: "rechnung_pruefen", rechnungId: rid, ergebnis: "geprueft" });
  }
  pruefe(r.status === 200 && r.json.auftrag.rechnungen.every((x) => x.status === "geprueft"), "Projektleitung prüft beide Rechnungen sachlich", r.status);
  await admin.get(`/api/admin/finanzen/entwicklung/${projekt?.id}`); // Finanzen-Demo sicherstellen
  r = await pl.post(`/api/admin/gutachter/${id}/zahlung`, { rechnungId: schlussId });
  pruefe(r.status === 403, "Projektleitung ohne Finanzen-Schreibrecht → 403", r.status);
  r = await buch.post(`/api/admin/gutachter/${id}/zahlung`, { rechnungId: schlussId, betrag: 1 });
  pruefe(r.status === 422, "Abweichender Zahlbetrag → 422", r.status);
  r = await buch.post(`/api/admin/gutachter/${id}/zahlung`, { rechnungId: abschlagId });
  r = await buch.post(`/api/admin/gutachter/${id}/zahlung`, { rechnungId: schlussId });
  pruefe(r.status === 200 && r.json.auftrag.status === "abgeschlossen" && r.json.auftrag.rechnungsstand.offenBrutto === 0, "Buchhaltung bucht beide Zahlungen → abgeschlossen", r.json.auftrag?.status);
  r = await admin.get(`/api/admin/finanzen/entwicklung/${projekt?.id}`);
  pruefe(r.status === 200 && (r.json.ist?.positionen || []).some((p) => p.beleg === `S-${LAUF}` && p.kostenart === "planung" && p.betrag === 5880), "Ist-Kosten am Projekt (Planung & Gutachten, netto)", r.json.ist?.positionen?.slice(0, 2));
  r = await gut.get(`/api/portal/gutachter/${id}`);
  pruefe(r.json.auftrag?.rechnungen?.every((x) => x.status === "bezahlt" && x.zahlung?.am), "Gutachter sieht den Zahlungsstatus");

  abschnitt("G7. Bewertung, Fristen, Seiten");
  r = await pl.post(`/api/admin/gutachter/${id}`, { aktion: "bewerten", bewertung: { qualitaet: 5, termintreue: 4, kommunikation: 5, preisLeistung: 3, kommentar: `intern-${LAUF}` } });
  pruefe(r.status === 200 && r.json.auftrag.bewertung?.schnitt === 4.3, "Interne Bewertung 4,3", r.json.auftrag?.bewertung);
  r = await gut.get(`/api/portal/gutachter/${id}`);
  pruefe(r.status === 200 && !r.text.includes(`intern-${LAUF}`) && !r.text.includes("\"bewertung\""), "Bewertung für den Gutachter unsichtbar");
  r = await admin.post("/api/admin/gutachter/fristen", {});
  pruefe(r.status === 200 && Number.isFinite(r.json.erinnerungen), "Fristen-Lauf von Hand", r.json);
  for (const [cl, pfad, soll] of [
    [gut, "/portal/gutachter", 200], [gut, `/portal/gutachter/${id}`, 200], [admin, "/portal/admin/gutachter", 200], [admin, `/portal/admin/gutachter/${id}`, 200],
    [admin, `/portal/admin/gutachter?projekt=${projekt?.id}`, 200], [inv, "/portal/gutachter", 404], [fremd, `/portal/gutachter/${id}`, 404],
  ]) {
    r = await cl.get(pfad);
    pruefe(soll === 404 ? seite404(r) : r.status === 200 && !seite404(r), `${pfad} (${cl.name}) → ${soll}`, r.status);
  }
}

async function apiBank(k) {
  const { admin, bank, sb, fremd } = k;
  abschnitt("B1. Bank-Akte: Anforderungen und Baustein-Freigabe");
  let r = await bank.get("/api/portal/bank");
  if (NUR_BERICHTE) return apiBerichte(k, r);
  const a1 = (r.json.anfragen || []).find((a) => ["termsheet", "in_pruefung", "offen"].includes(a.status));
  // Bestandsfinanzierung der Demo-Bank: ausgewählte Anfrage mit Covenant-Monitoring und angeforderten Berichten (andere Testläufe
  // können weitere ausgewählte Anfragen ohne Anlage hinterlassen)
  let a2 = null;
  for (const x of (r.json.anfragen || []).filter((y) => y.status === "ausgewaehlt")) {
    const ak = (await bank.get(`/api/portal/bank/${x.id}/akte`)).json.akte;
    if (ak?.kreditvertrag && ak.berichte?.some((b) => b.art === "jahresabschluss")) {
      a2 = x;
      break;
    }
  }
  pruefe(r.status === 200 && !!a1 && !!a2, "Bank sieht laufende Anfrage und Bestandsfinanzierung", r.json.anfragen?.map((a) => a.status));
  r = await bank.get(`/api/portal/bank/${a1?.id}/akte`);
  pruefe(r.status === 200 && r.json.akte.rolle === "leitung" && r.json.akte.team.length >= 2, "Akte: Rolle Leitung, Team mit mehreren Konten", r.json.akte?.team);
  r = await sb.get(`/api/portal/bank/${a1?.id}/akte`);
  pruefe(r.status === 200 && r.json.akte.rolle === "sachbearbeiter", "Kollege: Rolle Sachbearbeitung", r.json.akte?.rolle);
  r = await fremd.get(`/api/portal/bank/${a1?.id}/akte`);
  pruefe(r.status === 403, "Konto ohne Bank-Rolle → 403", r.status);
  r = await sb.post(`/api/portal/bank/${a1?.id}/akte`, { aktion: "anforderung", punkte: [{ titel: "Bodengutachten", frist: tag(-1) }] });
  pruefe(r.status === 422, "Frist in der Vergangenheit → 422", r.status);
  r = await sb.post(`/api/portal/bank/${a1?.id}/akte`, { aktion: "anforderung", punkte: [{ titel: `gb-test-${LAUF} EPC-Entwurf`, frist: tag(7), baustein: "om" }, { titel: `gb-test-${LAUF} Versicherungskonzept`, frist: tag(14) }] });
  const anf = (r.json.akte?.anforderungen || []).find((x) => x.titel === `gb-test-${LAUF} EPC-Entwurf`);
  pruefe(r.status === 200 && !!anf && anf.status === "offen", "Sachbearbeitung fordert zwei Unterlagen an", r.status);
  r = await sb.post(`/api/admin/finanzierung/bankakte/${a1?.id}`, { aktion: "anforderung_liefern", anforderungId: anf?.id, text: "x" });
  pruefe(r.status === 403, "Bank im Backoffice-Pfad → 403", r.status);
  r = await admin.hoch(`/api/admin/finanzierung/bankakte/${a1?.id}/dateien`, {}, "om-vertrag.pdf");
  const datei = r.json.datei;
  pruefe(r.status === 201 && !!datei?.id, "Backoffice lädt Unterlage zur Akte", r.status);
  r = await admin.post(`/api/admin/finanzierung/bankakte/${a1?.id}`, { aktion: "anforderung_liefern", anforderungId: anf?.id, text: "O&M-Vertrag anbei", dateiIds: [datei?.id], bausteinFreigeben: true });
  pruefe(r.status === 200 && r.json.akte.anforderungen.find((x) => x.id === anf?.id)?.status === "geliefert", "Geliefert (Datei + Baustein freigegeben)", r.status);
  r = await bank.get(`/api/portal/bank/${a1?.id}`);
  pruefe(r.status === 200 && r.json.paket.some((b) => b.id === "om"), "Baustein erscheint im Bankenpaket der Bank", r.json.paket?.map((b) => b.id));
  r = await sb.get(`/api/portal/bank/${a1?.id}/akte`);
  const lDatei = r.json.akte?.anforderungen?.find((x) => x.id === anf?.id)?.lieferung?.dateien?.[0];
  r = await sb.get(lDatei?.link || "/x");
  pruefe(r.status === 200 && r.buf.slice(0, 5).toString() === "%PDF-", "Bank lädt die gelieferte Datei", r.status);
  r = await sb.post(`/api/portal/bank/${a1?.id}/akte`, { aktion: "anforderung_pruefen", anforderungId: anf?.id, ergebnis: "akzeptiert" });
  pruefe(r.status === 200 && r.json.akte.anforderungen.find((x) => x.id === anf?.id)?.status === "akzeptiert", "Bank akzeptiert die Unterlage", r.status);

  abschnitt("B2. Q&A");
  r = await sb.post(`/api/portal/bank/${a1?.id}/akte`, { aktion: "frage", kategorie: "recht", frage: `gb-test-${LAUF}: Liegt ein Rangrücktritt der Grundpfandgläubiger vor?` });
  const frage = (r.json.akte?.qa || []).find((q) => q.frage.startsWith(`gb-test-${LAUF}`));
  pruefe(r.status === 200 && frage?.status === "offen", "Bank stellt Frage", r.status);
  r = await admin.post(`/api/admin/finanzierung/bankakte/${a1?.id}`, { aktion: "antwort", frageId: frage?.id, text: "Ja, Muster im Datenraum.", dateiIds: [datei?.id] });
  pruefe(r.status === 200 && r.json.akte.qa.find((q) => q.id === frage?.id)?.antwort?.dateien?.length === 1, "ÖkoInvest antwortet mit Anlage", r.status);

  abschnitt("B3. Bank-Team: Einladung, Rolle „Nur lesen“, Entfernen");
  r = await bank.get("/api/portal/bank/team");
  pruefe(r.status === 200 && r.json.team.darfVerwalten && r.json.team.mitglieder.length >= 2, "Team: Leitung verwaltet", r.status);
  r = await sb.post("/api/portal/bank/team", { aktion: "einladen", email: `gb-test-${LAUF}-x@example.com`, rolle: "lesen" });
  pruefe(r.status === 403, "Sachbearbeitung lädt nicht ein → 403", r.status);
  r = await bank.post("/api/portal/bank/team", { aktion: "einladen", email: `gb-test-${LAUF}@andere-bank.example`, rolle: "lesen" });
  pruefe(r.status === 422, "Fremde E-Mail-Domain → 422", r.status);
  const leserMail = `gb-test-${LAUF}-leser@example.com`;
  r = await bank.post("/api/portal/bank/team", { aktion: "einladen", email: leserMail, rolle: "lesen" });
  const tok = String(r.json.demoLink || "").split("/einladung/bankteam/")[1];
  pruefe(r.status === 200 && !!tok, "Einladung mit persönlichem Link (Demo)", r.status);
  const leser = new Client("Bank-Leser (Test)");
  await leser.registrieren("leser", ["unternehmen"], "Lea", "Leserin (Test)", leserMail);
  r = await fremd.post("/api/portal/bank/team/einladung", { token: tok });
  pruefe(r.status === 403, "Andere E-Mail nimmt nicht an → 403", r.status);
  r = await leser.post("/api/portal/bank/team/einladung", { token: tok });
  pruefe(r.status === 200, "Eingeladene Adresse tritt bei", r.json);
  r = await leser.post("/api/portal/bank/team/einladung", { token: tok });
  pruefe(r.status === 422, "Einladung nur einmal nutzbar", r.status);
  r = await leser.get(`/api/portal/bank/${a1?.id}/akte`);
  pruefe(r.status === 200 && r.json.akte.rolle === "lesen", "Neues Mitglied liest die Akte (Nur lesen)", r.json.akte?.rolle);
  r = await leser.post(`/api/portal/bank/${a1?.id}/akte`, { aktion: "frage", frage: "Darf ich fragen?" });
  pruefe(r.status === 403, "Nur lesen: keine Frage → 403", r.status);
  r = await leser.post(`/api/portal/bank/${a1?.id}`, { aktion: "rueckfrage", text: "Rückfrage über den alten Weg" });
  pruefe(r.status === 403, "Nur lesen: auch keine Rückfrage/Term Sheet über das Bank-Portal → 403", r.status);
  r = await bank.post("/api/portal/bank/team", { aktion: "entfernen", nutzerId: leser.nutzer?.id });
  pruefe(r.status === 200, "Leitung entfernt das Mitglied", r.status);
  r = await leser.get(`/api/portal/bank/${a1?.id}/akte`);
  pruefe(r.status === 403, "Entferntes Mitglied → 403", r.status);

  abschnitt("B4. Kreditentscheidung, CPs, Auszahlung (eigener Fall)");
  r = await admin.get("/api/admin/finanzierung");
  const bank1 = (r.json.banken || []).find((b) => b.email === "bank@example.com");
  r = await admin.post("/api/admin/finanzierung", { bezugArt: "frei", titel: `gb-test-${LAUF} Fall`, betragWunsch: 5_000_000 });
  const fall = r.json.fall;
  pruefe(r.status === 201 && !!fall?.id, "Finanzierungsfall angelegt", r.status);
  const F = `/api/admin/finanzierung/${fall?.id}`;
  r = await admin.post(`${F}/aktion`, { aktion: "anfragen", bankIds: [bank1?.id], frist: tag(10) });
  const an = r.json.fall?.anfragen?.[0];
  r = await sb.post(`/api/portal/bank/${an?.id}/akte`, { aktion: "kreditentscheidung", entscheidung: { ergebnis: "genehmigt", beschlussAm: HEUTE, betrag: 4_000_000, gueltigBis: tag(60) } });
  pruefe(r.status === 403, "Kreditentscheidung durch Sachbearbeitung → 403", r.status);
  r = await bank.post(`/api/portal/bank/${an?.id}/akte`, { aktion: "kreditentscheidung", entscheidung: { ergebnis: "genehmigt", beschlussAm: HEUTE, betrag: 4_000_000, gueltigBis: tag(60) } });
  pruefe(r.status === 409, "Kreditentscheidung vor der Auswahl → 409", r.status);
  const ts = { betrag: 4_000_000, laufzeitJahre: 18, zinsArt: "fix", zinsPct: 4.3, tilgungsprofil: "annuitaet", dscrCovenant: 1.05, dscrLockup: 1.1, dsraMonate: 6 };
  r = await sb.post(`/api/portal/bank/${an?.id}`, { aktion: "termsheet", termsheet: ts });
  pruefe(r.status === 200, "Sachbearbeitung gibt Term Sheet ab", r.status);
  r = await admin.post(`${F}/aktion`, { aktion: "entscheidung", anfrageId: an?.id, begruendung: "Einziges Angebot, Covenants haltbar (Test)" });
  pruefe(r.status === 200 && r.json.fall.status === "entschieden", "Leitung ÖkoInvest wählt die Bank aus", r.status);
  r = await bank.post(`/api/portal/bank/${an?.id}/akte`, { aktion: "kreditentscheidung", entscheidung: { ergebnis: "genehmigt", beschlussAm: HEUTE, betrag: 4_500_000, gueltigBis: tag(60) } });
  pruefe(r.status === 422, "Genehmigter Betrag > 110 % des Term Sheets → 422", r.status);
  r = await bank.post(`/api/portal/bank/${an?.id}/akte`, { aktion: "kreditentscheidung", entscheidung: { ergebnis: "genehmigt_auflagen", gremium: "Kreditausschuss", beschlussAm: HEUTE, betrag: 4_000_000, gueltigBis: tag(60), auflagen: "Zweites Ertragsgutachten" } });
  pruefe(r.status === 200 && r.json.akte.kreditentscheidung?.ergebnis === "genehmigt_auflagen", "Leitung der Bank meldet Kreditzusage mit Auflagen", r.status);
  r = await admin.post(`${F}/aktion`, { aktion: "kreditvertrag", kreditvertrag: { nummer: `KV-GB-${LAUF}`, unterzeichnetAm: HEUTE } });
  pruefe(r.status === 200 && r.json.fall.status === "vertrag", "Kreditvertrag erfasst", r.status);
  const cps = r.json.fall?.cps || [];
  r = await admin.post(`/api/admin/finanzierung/bankakte/${an?.id}`, { aktion: "auszahlung_beantragen", betrag: 1_000_000, wunschDatum: tag(3), zweck: "EPC-Anzahlung laut Zahlungsplan" });
  pruefe(r.status === 409, "Auszahlung vor Erfüllung der CPs → 409", r.status);
  r = await bank.post(`/api/portal/bank/${an?.id}/akte`, { aktion: "cp_bestaetigen", cpId: cps[0]?.id, status: "bestaetigt" });
  pruefe(r.status === 409, "Nicht erfüllte CP kann die Bank nicht bestätigen → 409", r.status);
  for (const c of cps) await admin.post(`${F}/aktion`, { aktion: "cp", cpId: c.id, erledigt: true, nachweis: "Test" });
  for (const c of cps) r = await sb.post(`/api/portal/bank/${an?.id}/akte`, { aktion: "cp_bestaetigen", cpId: c.id, status: "bestaetigt" });
  pruefe(r.status === 200 && r.json.akte.cpOffen === 0, `Alle ${cps.length} CPs erfüllt und von der Bank bestätigt`, r.json.akte?.cpOffen);
  await admin.post(`${F}/aktion`, { aktion: "cp", cpId: cps[0]?.id, erledigt: false });
  await admin.post(`${F}/aktion`, { aktion: "cp", cpId: cps[0]?.id, erledigt: true, nachweis: "neu" });
  r = await sb.get(`/api/portal/bank/${an?.id}/akte`);
  pruefe(r.json.akte?.cpOffen === 1, "Erneut abgehakte CP braucht eine neue Bestätigung", r.json.akte?.cpOffen);
  await sb.post(`/api/portal/bank/${an?.id}/akte`, { aktion: "cp_bestaetigen", cpId: cps[0]?.id, status: "bestaetigt" });
  r = await admin.post(`/api/admin/finanzierung/bankakte/${an?.id}`, { aktion: "auszahlung_beantragen", betrag: 4_000_001, wunschDatum: tag(3), zweck: "EPC-Anzahlung laut Zahlungsplan" });
  pruefe(r.status === 422, "Ziehung über dem Kreditbetrag → 422", r.status);
  r = await admin.post(`/api/admin/finanzierung/bankakte/${an?.id}`, { aktion: "auszahlung_beantragen", betrag: 1_000_000, wunschDatum: tag(3), zweck: "EPC-Anzahlung laut Zahlungsplan" });
  const az = r.json.akte?.auszahlungen?.[0];
  pruefe(r.status === 200 && az?.status === "beantragt", "Auszahlung beantragt", r.status);
  r = await sb.post(`/api/portal/bank/${an?.id}/akte`, { aktion: "auszahlung_entscheiden", auszahlungId: az?.id, ergebnis: "freigegeben" });
  pruefe(r.status === 403, "Freigabe durch Sachbearbeitung → 403", r.status);
  r = await bank.post(`/api/portal/bank/${an?.id}/akte`, { aktion: "auszahlung_entscheiden", auszahlungId: az?.id, ergebnis: "ausgezahlt", valuta: HEUTE });
  pruefe(r.status === 409, "Ausgezahlt ohne Freigabe → 409", r.status);
  r = await bank.post(`/api/portal/bank/${an?.id}/akte`, { aktion: "auszahlung_entscheiden", auszahlungId: az?.id, ergebnis: "freigegeben" });
  r = await bank.post(`/api/portal/bank/${an?.id}/akte`, { aktion: "auszahlung_entscheiden", auszahlungId: az?.id, ergebnis: "ausgezahlt", valuta: HEUTE });
  pruefe(r.status === 200 && r.json.akte.ausgezahlt === 1_000_000, "Freigegeben und ausgezahlt (Valuta heute)", r.json.akte?.ausgezahlt);
  r = await admin.get(F);
  pruefe(r.json.fall?.status === "auszahlung" && r.json.fall?.kreditvertrag?.auszahlungAm === HEUTE, "Fall wechselt auf „Ausgezahlt / Betrieb“", r.json.fall?.status);

  await apiBerichte(k, r, a2);
  await seiten(k, [[bank, "/portal/bank", 200], [bank, `/portal/bank/${a1?.id}`, 200], [bank, `/portal/bank/${a2?.id}`, 200], [sb, "/portal/bank/team", 200], [admin, `/portal/admin/finanzierung/${fall?.id}/bank/${an?.id}`, 200], [fremd, "/portal/bank/team", 404]]);
}

async function seiten(k, liste) {
  abschnitt("B6. Seiten");
  let r;
  for (const [cl, pfad, soll] of liste) {
    r = await cl.get(pfad);
    pruefe(soll === 404 ? seite404(r) : r.status === 200 && !seite404(r), `${pfad} (${cl.name}) → ${soll}`, r.status);
  }
}

async function apiBerichte(k, r0, a2vorgabe = null) {
  const { admin, bank, sb } = k;
  let r = r0;
  let a2 = a2vorgabe;
  if (!a2) {
    for (const x of (r0.json.anfragen || []).filter((y) => y.status === "ausgewaehlt")) {
      const ak = (await bank.get(`/api/portal/bank/${x.id}/akte`)).json.akte;
      if (ak?.kreditvertrag && ak.berichte?.some((b) => b.art === "jahresabschluss")) {
        a2 = x;
        break;
      }
    }
  }
  abschnitt("B5. Monitoring-Berichte (Bestandsfinanzierung)");
  await admin.post("/api/admin/finanzierung/covenants", {});
  r = await sb.post(`/api/portal/bank/${a2?.id}/akte`, { aktion: "bericht_anfordern", art: "covenant", periode: `Q3-${LAUF}`, faelligAm: tag(20) });
  const ber = (r.json.akte?.berichte || []).find((b) => b.periode === `Q3-${LAUF}`);
  pruefe(r.status === 200 && ber?.status === "angefordert", "Bank fordert Covenant-Report an", r.status);
  r = await admin.get(`/api/admin/finanzierung/bankakte/${a2?.id}`);
  const ja = (r.json.akte?.berichte || []).find((b) => b.art === "jahresabschluss" && b.status === "angefordert");
  pruefe(r.status === 200 && ja?.ueberfaellig, "Demo: Jahresabschluss angefordert und überfällig", ja);
  r = await admin.post(`/api/admin/finanzierung/bankakte/${a2?.id}`, { aktion: "bericht_einreichen", berichtId: ja?.id });
  pruefe(r.status === 422, "Jahresabschluss ohne Datei → 422", r.status);
  r = await admin.post(`/api/admin/finanzierung/bankakte/${a2?.id}`, { aktion: "bericht_einreichen", berichtId: ber?.id, bemerkung: "Automatisch aus den Zählerwerten" });
  const bx = (r.json.akte?.berichte || []).find((b) => b.id === ber?.id);
  pruefe(r.status === 200 && bx?.status === "eingereicht" && bx?.kennzahlen?.dscr > 0 && !!bx?.pdf, "Covenant-Report eingereicht (Momentaufnahme DSCR/LLCR)", bx?.kennzahlen);
  r = await sb.get(`/api/portal/bank/${a2?.id}/akte/berichte/${ber?.id}`);
  pruefe(istPdf(r), "Bank lädt den Covenant-Report als PDF", r.status);
  r = await sb.post(`/api/portal/bank/${a2?.id}/akte`, { aktion: "bericht_pruefen", berichtId: ber?.id, ergebnis: "geprueft" });
  pruefe(r.status === 200 && r.json.akte.berichte.find((b) => b.id === ber?.id)?.status === "geprueft", "Bank prüft den Bericht", r.status);
  r = await bank.post(`/api/portal/bank/${a2?.id}/akte`, { aktion: "anforderung", punkte: [{ titel: "x", frist: tag(5) }] }, { origin: "https://boese.example" });
  pruefe(r.status === 403, "CSRF im Bank-Portal → 403", r.status);

}

async function main() {
  console.log(`Gutachter/Planer und Bank – Test (Lauf ${LAUF})${NUR_LOGIK ? " – nur Logik" : ` gegen ${BASIS}`}`);
  logik();
  if (!NUR_LOGIK) {
    const k = { admin: new Client("admin (Leitung)"), pl: new Client("bo-projektleitung"), gut: new Client("gutachter (Demo)"), buch: new Client("bo-buchhaltung"), lesen: new Client("bo-lesen"), fremd: new Client("fremd (Test)"), inv: new Client("investor (Demo)"), bank: new Client("bank (Leitung)"), sb: new Client("bank-sachbearbeitung") };
    await k.admin.login("admin@example.com");
    if (!NUR_BERICHTE) {
      await k.pl.login("bo-projektleitung@example.com");
      await k.gut.login("gutachter@example.com");
      await k.buch.login("bo-buchhaltung@example.com");
      await k.lesen.login("bo-lesen@example.com");
      await k.inv.login("investor@example.com");
      await k.fremd.registrieren("fremd", ["flaeche"], "Fritz", "Fremd (Test)");
      await apiGutachter(k);
    }
    await k.bank.login("bank@example.com");
    await k.bank.get("/api/portal/bank/team"); // Bank-Akten-Demo (inkl. Konto der Sachbearbeitung) sicherstellen
    await k.sb.login("bank-sachbearbeitung@example.com");
    await apiBank(k);
  }
  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen bestanden")} (${ok} ok)`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.stack || e.message}`));
  process.exit(1);
});
