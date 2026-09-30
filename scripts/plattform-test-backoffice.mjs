// scripts/plattform-test-backoffice.mjs
//
// Tests des Backoffice-Ausbaus (CRM, Akquise, Automationen, Vorlagen, Berichte, Unterrollen, Hash-Kette)
// gegen den laufenden Dev-Server (Demo-Backend). Ohne Test-Framework:
//   node scripts/plattform-test-backoffice.mjs [basis-url]
// Eigene Testdaten mit Präfix „bo-“ bzw. Lauf-Kennung; Testregeln werden am Ende gelöscht.

import { verifyChain, verketten, KETTE_START } from "../src/lib/plattform/hashkette.js";

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
  constructor() {
    this.cookie = "";
  }
  async anfrage(methode, pfad, body, { origin = BASIS, roh = false } = {}) {
    const headers = {};
    if (origin) headers.Origin = origin;
    if (this.cookie) headers.Cookie = this.cookie;
    let payload;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
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
    if (roh) return res;
    const text = await res.text();
    // Demo-Datenbank kurzzeitig gesperrt (parallele Testläufe anderer Teams) → einmal wiederholen
    if (res.status === 500 && !this.wiederholt && /später erneut/.test(text)) {
      this.wiederholt = true;
      await new Promise((r) => setTimeout(r, 2500));
      try {
        return await this.anfrage(methode, pfad, body, { origin, roh });
      } finally {
        this.wiederholt = false;
      }
    }
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 200) };
    }
    return { status: res.status, json };
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
/** Status einer Portalseite; notFound() im Stream (portal/loading.js → Status 200 + next-error-Meta) zählt als 404 */
async function seite(c, pfad) {
  const res = await c.anfrage("GET", pfad, undefined, { roh: true, origin: null });
  const html = await res.text();
  return res.status === 200 && /<meta name="next-error" content="not-found"/.test(html) ? 404 : res.status;
}
/** Seite verweigert: 404 – oder (bei Streaming durch portal/loading.js) 200 mit der Portal-Seite „Nicht gefunden“ */
async function gesperrt(c, pfad) {
  const res = await c.anfrage("GET", pfad, undefined, { roh: true, origin: null });
  const html = await res.text();
  return res.status === 404 || (res.status === 200 && /<meta name="next-error" content="not-found"/.test(html));
}

async function main() {
  console.log(`Backoffice-Test gegen ${BASIS} (Lauf ${LAUF})`);
  const gast = new Client();
  const admin = new Client();
  const adminKonto = await admin.login("admin@example.com");
  const aufraeumen = [];

  // ------------------------------------------------------------ 1. Hash-Kette (Einheit)
  abschnitt("1. Hash-Kette: Verfahren erkennt Manipulation");
  const kette = [];
  let prev = KETTE_START;
  for (let i = 0; i < 6; i++) {
    const e = verketten({ id: `A-26-TEST0${i}`, am: new Date(Date.UTC(2026, 8, 1, 10, i)).toISOString(), nutzerId: "U-26-TESTER", aktion: "status", objektArt: "vorgang", objektId: `V-26-TEST0${i}`, text: `Eintrag ${i}`, ip: "" }, prev);
    prev = e.hash;
    kette.push(e);
  }
  pruefe(verifyChain(kette).ok && verifyChain(kette).geprueft === 6, "unveränderte Kette ist gültig");
  const geaendert = structuredClone(kette);
  geaendert[3].text = "manipuliert";
  let v = verifyChain(geaendert);
  pruefe(!v.ok && v.fehler[0].index === 3 && /verändert/.test(v.fehler[0].grund), "geänderter Text wird an der richtigen Stelle erkannt", v.fehler);
  const geloescht = structuredClone(kette);
  geloescht.splice(2, 1);
  v = verifyChain(geloescht);
  pruefe(!v.ok && v.fehler[0].index === 2, "gelöschter Eintrag wird erkannt", v.fehler);
  const vertauscht = structuredClone(kette);
  [vertauscht[1], vertauscht[2]] = [vertauscht[2], vertauscht[1]];
  pruefe(!verifyChain(vertauscht).ok, "vertauschte Reihenfolge wird erkannt");
  const neuGehasht = structuredClone(kette);
  neuGehasht[4].text = "gefälscht";
  verketten(neuGehasht[4], neuGehasht[3].hash); // Fälscher rechnet nur den einen Hash neu
  v = verifyChain(neuGehasht);
  pruefe(!v.ok && v.fehler[0].index === 5, "neu berechneter Hash bricht die Kette beim Nachfolger", v.fehler);
  pruefe(verifyChain(kette.slice(3), { anker: { hash: kette[2].hash } }).ok, "Prüfung ab Archiv-Anker");

  abschnitt("1b. Hash-Kette im Backend");
  let r = await admin.get("/api/admin/protokoll?limit=5");
  pruefe(r.status === 200 && r.json.kette?.ok === true && r.json.kette.geprueft > 0, "Aktivitätsprotokoll: verify_chain ok", r.json.kette && { ok: r.json.kette.ok, fehler: r.json.kette.fehler?.slice(0, 2) });
  pruefe(r.json.kette?.eintraege?.every((e) => /^[0-9a-f]{64}$/.test(e.hash) && /^[0-9a-f]{64}$/.test(e.prevHash)), "jeder Eintrag trägt prevHash und hash (SHA-256)");
  pruefe(r.json.kette?.eintraege?.[1] && r.json.kette.eintraege[0].prevHash === r.json.kette.eintraege[1].hash, "neuester Eintrag verweist auf den Vorgänger");

  // ------------------------------------------------------------ 2. Leads aus Anfragen
  abschnitt("2. Lead aus /api/anfrage wird Kontakt (ohne Dublette)");
  const leadMail = `bo-lead-${LAUF}@example.com`;
  r = await gast.post("/api/anfrage", { typ: "kommune", kontakt: { vorname: "Lea", nachname: `Lead ${LAUF}`, firma: `Gemeinde Bo-${LAUF}`, email: leadMail, plz: "86825", land: "DE" }, daten: {}, einwilligung: true, herkunft: { kanal: `BO-${LAUF}`, utm_campaign: "bo-test" } });
  pruefe(r.status === 200, "Anfrage (Kommune) angelegt", r.json);
  const leadVorgang = r.json.id;
  r = await admin.get(`/api/admin/crm/kontakte?q=${encodeURIComponent(leadMail)}`);
  const lead = r.json.kontakte?.find((k) => k.email === leadMail);
  pruefe(lead && lead.quelle === "anfrage" && lead.rollen.includes("gemeinde") && lead.bezuege === 1, "Kontakt aus Anfrage mit Rolle und Beziehung", lead);
  pruefe(lead?.organisation === `Gemeinde Bo-${LAUF}`, "Organisation (Gemeinde) automatisch angelegt", lead?.organisation);
  r = await gast.post("/api/anfrage", { typ: "carport", kontakt: { vorname: "Lea", nachname: `Lead ${LAUF}`, email: leadMail.toUpperCase() }, daten: {}, einwilligung: true });
  r = await admin.get(`/api/admin/crm/kontakte?q=${encodeURIComponent(leadMail)}`);
  const leads = r.json.kontakte?.filter((k) => k.email === leadMail) || [];
  pruefe(leads.length === 1 && leads[0].bezuege === 2 && leads[0].rollen.includes("unternehmen"), "zweite Anfrage gleicher E-Mail → selber Kontakt, zweite Beziehung", leads);
  r = await admin.get(`/api/admin/crm/kontakte/${lead?.id}`);
  pruefe(r.status === 200 && r.json.kontakt.verlauf.some((e) => /Anfrage eingegangen/.test(e.titel)) && r.json.kontakt.verlauf.some((e) => e.art === "status"), "Verlauf je Kontakt (Aktivität + Status)", r.json.kontakt?.verlauf?.slice(0, 3));

  // ------------------------------------------------------------ 3. Dubletten
  abschnitt("3. Dublettenerkennung und Zusammenführen");
  const dub = { vorname: "Doris", nachname: `Doppelt ${LAUF}`, plz: "80331", ort: "München", rollen: ["gutachter"] };
  r = await admin.post("/api/admin/crm/kontakte", { ...dub, email: `bo-doris-${LAUF}@example.com` });
  pruefe(r.status === 200, "Kontakt 1 angelegt", r.json);
  const k1 = r.json.kontakt?.id;
  r = await admin.post("/api/admin/crm/kontakte", { ...dub, email: `bo-doris-privat-${LAUF}@example.com`, telefon: "+49 000 1234567" });
  const k2 = r.json.kontakt?.id;
  pruefe(r.status === 200 && k2, "Kontakt 2 (gleicher Name, gleiche PLZ, andere E-Mail) angelegt", r);
  r = await admin.post("/api/admin/crm/kontakte", { vorname: "Dora", nachname: "Anders", email: `BO-DORIS-${LAUF}@example.com` });
  pruefe(r.status === 409, "gleiche E-Mail (andere Schreibweise) → 409", r.status);
  r = await admin.post("/api/admin/crm/kontakte", { vorname: "Dora", nachname: "Anders", email: `bo-doris-${LAUF}@example.com`, trotzdem: true });
  const k3 = r.json.kontakt?.id;
  r = await admin.get("/api/admin/crm/dubletten");
  const paar12 = r.json.dubletten?.find((p) => [p.a.id, p.b.id].sort().join() === [k1, k2].sort().join());
  const paar13 = r.json.dubletten?.find((p) => [p.a.id, p.b.id].sort().join() === [k1, k3].sort().join());
  pruefe(paar12 && paar12.score >= 85 && paar12.gruende.some((g) => /Name und gleiche PLZ/.test(g)), "Name + PLZ erkannt (≥ 85 %)", paar12);
  pruefe(paar13 && paar13.score === 100, "gleiche E-Mail erkannt (100 %)", paar13);
  pruefe(!r.json.dubletten?.some((p) => [p.a.id, p.b.id].includes(lead?.id)), "eindeutiger Kontakt ist keine Dublette");
  r = await admin.post("/api/admin/crm/dubletten", { zielId: k1, quelleId: k2 });
  pruefe(r.status === 200 && r.json.kontakt?.telefon === "+49 000 1234567", "zusammengeführt, leere Felder ergänzt", r.json);
  r = await admin.get(`/api/admin/crm/kontakte/${k2}`);
  pruefe(r.status === 404, "Quelle nach dem Zusammenführen entfernt", r.status);

  // ------------------------------------------------------------ 4. Aktivität mit Wiedervorlage
  abschnitt("4. CRM-Aktivität mit Wiedervorlage");
  const morgen = new Date(Date.now() + 86400e3).toISOString().slice(0, 10);
  r = await admin.post("/api/admin/crm/aktivitaeten", { kontaktId: k1, typ: "anruf", betreff: `Rückruf ${LAUF}`, text: "Termin abstimmen", wiedervorlageAm: morgen, bezugArt: "vorgang", bezugId: leadVorgang });
  pruefe(r.status === 200 && r.json.aktivitaet?.wiedervorlage?.faelligAm === morgen, "Anruf mit Wiedervorlage gespeichert", r.json);
  r = await admin.get("/api/admin/aufgaben?ansicht=meine");
  pruefe(r.json.aufgaben?.some((a) => a.titel.includes(`Rückruf ${LAUF}`) && a.bezugId === leadVorgang), "Wiedervorlage erscheint unter „Meine Aufgaben“", r.json.aufgaben?.length);
  r = await admin.post("/api/admin/crm/aktivitaeten", { kontaktId: k1, typ: "anruf", betreff: "x" });
  pruefe(r.status === 422, "zu kurzer Betreff → 422", r.status);
  r = await admin.post("/api/admin/crm/kontakte", { vorname: "Ohne", nachname: "Origin" }, { origin: null });
  pruefe(r.status === 403, "Mutation ohne Origin → 403 (CSRF)", r.status);

  // ------------------------------------------------------------ 5. Automation feuert korrekt / nicht
  abschnitt("5. Automationsregel: feuert bei passender Bedingung, sonst nicht");
  const tag = `bo-test-${LAUF}`;
  r = await admin.post("/api/admin/automationen", { name: `BO-Test Großfläche ${LAUF}`, aktiv: true, ausloeser: { typ: "vorgang_neu" }, bedingungen: [{ feld: "kanal", op: "gleich", wert: `BO-${LAUF}` }, { feld: "ha", op: "min", wert: 20 }], aktionen: [{ typ: "tag", tag }, { typ: "aufgabe", titel: "BO-Test Rückruf {{nachname}}", faelligInTagen: 1, zustaendig: "zustaendig" }] });
  pruefe(r.status === 200 && r.json.regel?.id, "Regel angelegt", r.json);
  const regelId = r.json.regel?.id;
  aufraeumen.push(regelId);
  r = await admin.post("/api/admin/automationen", { name: "x", ausloeser: { typ: "vorgang_neu" }, aktionen: [] });
  pruefe(r.status === 422, "Regel ohne Name/Aktion → 422", r.status);
  r = await admin.post("/api/admin/automationen", { name: "Ungültiger Status", ausloeser: { typ: "vorgang_neu" }, aktionen: [{ typ: "status", nach: "verkauft" }] });
  pruefe(r.status === 422, "Statusaktion mit unpassendem Zielstatus → 422", r.status);
  const gross = await gast.post("/api/anfrage", { typ: "flaeche", kontakt: { vorname: "Grete", nachname: `Groß ${LAUF}`, email: `bo-gross-${LAUF}@example.com`, plz: "86825", ort: "Testdorf", land: "DE" }, daten: { ha: 25 }, einwilligung: true, herkunft: { kanal: `BO-${LAUF}` } });
  const klein = await gast.post("/api/anfrage", { typ: "flaeche", kontakt: { vorname: "Karl", nachname: `Klein ${LAUF}`, email: `bo-klein-${LAUF}@example.com`, plz: "86825", land: "DE" }, daten: { ha: 5 }, einwilligung: true, herkunft: { kanal: `BO-${LAUF}` } });
  pruefe(gross.status === 200 && klein.status === 200, "zwei Anfragen (25 ha / 5 ha)");
  r = await admin.get(`/api/admin/automationen?regel=${regelId}&limit=50`);
  const lGross = r.json.protokoll?.find((l) => l.objektId === gross.json.id);
  const lKlein = r.json.protokoll?.find((l) => l.objektId === klein.json.id);
  pruefe(lGross?.status === "ausgefuehrt" && lGross.aktionen.every((a) => a.ok), "Regel feuert bei 25 ha (alle Aktionen ok)", lGross);
  pruefe(lKlein?.status === "nicht_erfuellt" && lKlein.bedingungen.some((b) => b.feld === "ha" && !b.erfuellt && b.ist === 5), "Regel feuert nicht bei 5 ha (Bedingung protokolliert)", lKlein);
  r = await admin.get(`/api/admin/aufgaben?bezug=vorgang:${gross.json.id}`);
  pruefe(r.json.aufgaben?.some((a) => a.titel === `BO-Test Rückruf Groß ${LAUF}`), "Aufgabe mit Platzhalter angelegt", r.json.aufgaben?.map((a) => a.titel));
  const aufgabenGross = r.json.aufgaben?.length || 0;
  r = await admin.get(`/api/admin/aufgaben?bezug=vorgang:${klein.json.id}`);
  pruefe(!r.json.aufgaben?.some((a) => a.titel.startsWith("BO-Test")), "keine Aufgabe bei nicht erfüllter Bedingung", r.json.aufgaben?.map((a) => a.titel));
  r = await admin.get(`/api/admin/akquise?q=${encodeURIComponent(`Groß ${LAUF}`)}`);
  const zeile = r.json.flaechen?.find((f) => f.vorgangId === gross.json.id);
  pruefe(zeile && typeof zeile.score === "number" && zeile.gebiet?.name && ["gruen", "gelb", "rot"].includes(zeile.sla.ampel), "Akquise: Score, Gebiet (PLZ-Bereich) und SLA-Ampel", zeile && { score: zeile.score, gebiet: zeile.gebiet, sla: zeile.sla });

  abschnitt("5b. Testlauf – was würde passieren (ohne Wirkung)");
  r = await admin.post("/api/admin/automationen/testlauf", { regelId, bezugArt: "vorgang", bezugId: gross.json.id });
  pruefe(r.status === 200 && r.json.testlauf?.modus === "objekt" && r.json.testlauf.aenderungen.aufgaben.length >= 1 && r.json.testlauf.protokoll[0]?.testlauf === true, "Testlauf zeigt die Aufgabe, die entstehen würde", r.json.testlauf?.aenderungen);
  r = await admin.get(`/api/admin/aufgaben?bezug=vorgang:${gross.json.id}`);
  pruefe((r.json.aufgaben?.length || 0) === aufgabenGross, "Testlauf hat nichts gespeichert", [aufgabenGross, r.json.aufgaben?.length]);
  r = await admin.post("/api/admin/automationen/testlauf", { regelId, bezugArt: "vorgang", bezugId: klein.json.id });
  pruefe(r.json.testlauf?.protokoll?.[0]?.status === "nicht_erfuellt" && r.json.testlauf.aenderungen.aufgaben.length === 0, "Testlauf mit unpassendem Objekt: nichts würde passieren", r.json.testlauf?.protokoll);
  r = await admin.post("/api/admin/automationen/testlauf", { regelId });
  pruefe(r.json.testlauf?.modus === "rueckblick" && r.json.testlauf.treffer >= 1, "Rückblick über die letzten Objekte", r.json.testlauf && { treffer: r.json.testlauf.treffer, geprueft: r.json.testlauf.geprueft });

  // ------------------------------------------------------------ 6. Schleifenschutz
  abschnitt("6. Schleifenschutz (veröffentlicht ↔ reserviert)");
  const anbieter = new Client();
  await anbieter.login("anbieter@example.com");
  r = await anbieter.post("/api/portal/projekte", { titel: `BO-Schleife 5 MWp ${LAUF}` });
  const pid = r.json.projekt?.id;
  await anbieter.patch(`/api/portal/projekte/${pid}`, { titel: `BO-Schleife 5 MWp ${LAUF}`, typ: "freiflaeche", land: "DE", bundesland: "Bayern", region: "Schwaben (Test)", mwp: 5, phase: "rtb", netzanschluss: "zusage", preisModus: "proKwp", preisProKwp: 80, beschreibung: "Testprojekt des Backoffice-Tests für den Schleifenschutz. Keine echten Angaben, wird nicht weiter verwendet." });
  await anbieter.post(`/api/portal/projekte/${pid}/provision`, { akzeptiert: true });
  await anbieter.post("/api/portal/status", { art: "projekt", id: pid, nach: "pruefung" });
  r = await admin.post("/api/admin/status", { art: "projekt", id: pid, nach: "veroeffentlicht", extra: { provisionSatz: 2 } });
  pruefe(r.status === 200, "Testprojekt veröffentlicht", r.json);
  const schleifenTag = `bo-loop-${LAUF}`;
  r = await admin.post("/api/admin/automationen/tags", { art: "projekt", id: pid, tag: schleifenTag });
  pruefe(r.status === 200 && r.json.tags?.includes(schleifenTag), "Tag am Projekt gesetzt", r.json);
  const bed = [{ feld: "tag", op: "gleich", wert: schleifenTag }];
  const rA = await admin.post("/api/admin/automationen", { name: `BO-Schleife A ${LAUF}`, ausloeser: { typ: "status", art: "projekt", nach: "reserviert" }, bedingungen: bed, aktionen: [{ typ: "status", nach: "veroeffentlicht", kommentar: "Test A" }] });
  const rB = await admin.post("/api/admin/automationen", { name: `BO-Schleife B ${LAUF}`, ausloeser: { typ: "status", art: "projekt", nach: "veroeffentlicht" }, bedingungen: bed, aktionen: [{ typ: "status", nach: "reserviert", kommentar: "Test B" }] });
  aufraeumen.push(rA.json.regel?.id, rB.json.regel?.id);
  pruefe(rA.status === 200 && rB.status === 200, "zwei sich gegenseitig auslösende Regeln angelegt");
  const t0 = Date.now();
  r = await admin.post("/api/admin/status", { art: "projekt", id: pid, nach: "reserviert" });
  pruefe(r.status === 200 && Date.now() - t0 < 60000, "Statuswechsel kehrt zurück (keine Endlosschleife)", r.status);
  r = await admin.get("/api/admin/automationen?limit=300");
  const laeufe = r.json.protokoll?.filter((l) => l.objektId === pid && [rA.json.regel?.id, rB.json.regel?.id].includes(l.regelId)) || [];
  pruefe(laeufe.some((l) => l.status === "schleife"), "Schleife erkannt und protokolliert", laeufe.map((l) => [l.regelName, l.status, l.tiefe]));
  pruefe(laeufe.filter((l) => l.status === "ausgefuehrt" && l.regelId === rA.json.regel?.id).length === 1 && laeufe.filter((l) => l.status === "ausgefuehrt" && l.regelId === rB.json.regel?.id).length === 1, "jede Regel feuerte genau einmal", laeufe.map((l) => [l.regelName, l.status]));
  r = await admin.get("/api/admin/projekte?status=reserviert");
  pruefe(r.json.projekte?.some((p) => p.id === pid), "Endstatus stabil (reserviert, über den Automaten)", r.json.projekte?.length);
  for (const id of [rA.json.regel?.id, rB.json.regel?.id]) await admin.del(`/api/admin/automationen/${id}`);

  // ------------------------------------------------------------ 7. Vorlagen
  abschnitt("7. Vorlagen: Platzhalter, Vorschau, Versionen");
  r = await admin.post("/api/admin/vorlagen", { name: `BO-Vorlage ${LAUF}`, kanal: "email", betreff: "Hallo {{vorname}}", text: "Das ist {{unbekannt.feld}} – zu kurz?" });
  pruefe(r.status === 422 && /Unbekannte Platzhalter/.test(r.json.error), "unbekannter Platzhalter → 422", r.json);
  r = await admin.post("/api/admin/vorlagen", { name: `BO-Vorlage ${LAUF}`, kanal: "email", betreff: "Ihre Fläche {{flaeche.ha}} ha", text: "{{briefanrede}}, danke für Ihre Anfrage ({{vorgang.id}})." });
  pruefe(r.status === 200 && r.json.vorlage?.version === 1, "Vorlage angelegt (Version 1)", r.json);
  const vlId = r.json.vorlage?.id;
  r = await admin.patch(`/api/admin/vorlagen/${vlId}`, { name: `BO-Vorlage ${LAUF}`, kanal: "email", betreff: "Ihre Fläche mit {{flaeche.ha}} ha", text: "{{briefanrede}}, vielen Dank für Ihre Anfrage ({{vorgang.id}}).", kommentar: "Ton" });
  pruefe(r.json.vorlage?.version === 2 && r.json.vorlage.versionen.length === 2, "Änderung = neue Version", r.json.vorlage?.version);
  r = await admin.post(`/api/admin/vorlagen/${vlId}/wiederherstellen`, { version: 1 });
  pruefe(r.json.vorlage?.version === 3 && r.json.vorlage.betreff === "Ihre Fläche {{flaeche.ha}} ha", "Version 1 als Version 3 wiederhergestellt", r.json.vorlage?.betreff);
  r = await admin.post("/api/admin/vorlagen/vorschau", { vorlageId: vlId, bezugArt: "vorgang", bezugId: gross.json.id });
  pruefe(r.status === 200 && r.json.vorschau.betreff === "Ihre Fläche 25 ha" && r.json.vorschau.text.includes(gross.json.id) && r.json.vorschau.text.includes(`Groß ${LAUF}`), "Vorschau mit echten Werten", r.json.vorschau);

  // ------------------------------------------------------------ 8. Unterrollen
  abschnitt("8. Backoffice-Unterrollen: Rechte-Matrix wird durchgesetzt");
  const bo = new Client();
  const boMail = `bo-rolle-${LAUF}@example.com`;
  r = await bo.post("/api/auth/registrieren", { email: boMail, passwort: "Bo-Test-Passwort-1", vorname: "Rolf", nachname: `Rolle ${LAUF}`, rollen: ["flaeche"], agb: true });
  const boId = r.json.nutzer?.id;
  r = await admin.patch(`/api/admin/nutzer/${boId}`, { rollen: ["admin"] });
  pruefe(r.status === 200, "Konto ins Backoffice aufgenommen", r.status);
  const rollen = async (liste) => (await admin.patch(`/api/admin/rechte/${boId}`, { backofficeRollen: liste })).status;
  pruefe((await rollen(["lesen"])) === 200, "Unterrolle „Nur lesen“ gesetzt");
  pruefe((await bo.get("/api/admin/vorgaenge")).status === 200, "lesen: Vorgänge lesen 200");
  pruefe((await bo.post("/api/admin/status", { art: "vorgang", id: leadVorgang, nach: "in_pruefung" })).status === 403, "lesen: Statuswechsel 403");
  pruefe((await bo.post("/api/admin/crm/kontakte", { nachname: "Verboten" })).status === 403, "lesen: Kontakt anlegen 403");
  pruefe((await bo.post("/api/admin/automationen", { name: "Verboten" })).status === 403, "lesen: Regel anlegen 403");
  pruefe((await bo.get("/api/admin/export/vorgaenge")).status === 403, "lesen: CSV-Export 403");
  pruefe((await bo.get("/api/admin/rechte")).status === 403, "lesen: Rechteverwaltung 403");
  pruefe((await gesperrt(bo, "/portal/admin/rechte")), "lesen: Seite Rechte → 404");
  pruefe((await seite(bo, "/portal/admin/crm")) === 200, "lesen: Seite CRM → 200");
  pruefe((await rollen(["akquise"])) === 200, "Unterrolle „Akquise“ gesetzt");
  pruefe((await bo.get("/api/admin/provisionen")).status === 403, "akquise: Provisionen 403");
  pruefe((await gesperrt(bo, "/portal/admin/deals")), "akquise: Seite Deals → 404");
  pruefe((await bo.post("/api/admin/crm/kontakte", { nachname: `Akquise-Kontakt ${LAUF}` })).status === 200, "akquise: Kontakt anlegen 200");
  pruefe((await bo.post("/api/admin/status", { art: "vorgang", id: leadVorgang, nach: "in_pruefung" })).status === 200, "akquise: Vorgang-Status 200");
  pruefe((await bo.post("/api/admin/status", { art: "projekt", id: pid, nach: "veroeffentlicht" })).status === 403, "akquise: Projekt-Status 403");
  pruefe((await bo.patch(`/api/admin/rechte/${boId}`, { backofficeRollen: ["leitung"] })).status === 403, "akquise: eigene Rechte erhöhen 403");
  pruefe((await rollen(["buchhaltung"])) === 200, "Unterrolle „Buchhaltung“ gesetzt");
  pruefe((await bo.get("/api/admin/provisionen")).status === 200, "buchhaltung: Provisionen 200");
  pruefe((await bo.get("/api/admin/akquise")).status === 403, "buchhaltung: Akquise 403");
  pruefe((await bo.post("/api/admin/status", { art: "vorgang", id: leadVorgang, nach: "qualifiziert" })).status === 403, "buchhaltung: Vorgang-Status 403");
  const pdfRes = await bo.anfrage("GET", "/api/admin/berichte/pdf", undefined, { roh: true, origin: null });
  const pdfText = Buffer.from(await pdfRes.arrayBuffer()).toString("latin1");
  pruefe(pdfRes.status === 200 && pdfText.startsWith("%PDF-") && /Monatsbericht/.test(pdfText), "buchhaltung: Monatsbericht-PDF 200", pdfRes.status);
  pruefe((await admin.patch(`/api/admin/rechte/${adminKonto.id}`, { backofficeRollen: ["lesen"] })).status === 409, "eigene Leitungsrolle nicht entfernbar → 409");
  pruefe((await admin.get("/api/admin/uebersicht")).status === 200, "Konto ohne Unterrolle = Leitung (Cockpit 200)");
  const investor = new Client();
  await investor.login("investor@example.com");
  pruefe((await investor.get("/api/admin/crm/kontakte")).status === 403, "Nicht-Admin: CRM-API 403");
  pruefe((await gesperrt(investor, "/portal/admin/crm")), "Nicht-Admin: CRM-Seite 404");

  // ------------------------------------------------------------ 9. Berichte, Akquise, Gebiete
  abschnitt("9. Berichte, CSV, Gebiete");
  r = await admin.get("/api/admin/berichte");
  const b = r.json.bericht;
  pruefe(r.status === 200 && b?.zeitraum?.monate?.length >= 12 && b.kohorteTrichter?.length === 5 && Array.isArray(b.quellen) && b.provision && b.durchlauf?.vorgang && b.team?.length, "Bericht mit Trichter, Quellen, Provision, Durchlauf, Team", b && Object.keys(b));
  pruefe(b?.quellen?.some((q) => q.kanal === `BO-${LAUF}` && q.anfragen >= 2), "Konversion je Quelle nutzt die Herkunft der Anfrage", b?.quellen?.map((q) => q.kanal));
  const csvRes = await admin.anfrage("GET", "/api/admin/berichte/csv", undefined, { roh: true, origin: null });
  const csvBytes = Buffer.from(await csvRes.arrayBuffer());
  pruefe(csvRes.status === 200 && csvBytes[0] === 0xef && csvBytes[1] === 0xbb && csvBytes[2] === 0xbf && csvBytes.toString("utf8").includes("Abschnitt;Kennzahl;Dimension;Wert"), "Bericht als CSV (BOM, Semikolon)", csvBytes.subarray(0, 40).toString("utf8"));
  r = await admin.get("/api/admin/berichte?von=2026-99-01");
  pruefe(r.status === 200, "ungültiger Zeitraum → Standardzeitraum statt Fehler", r.status);
  r = await admin.get("/api/admin/akquise/gebiete");
  const gebiete = r.json.gebiete || [];
  r = await admin.put("/api/admin/akquise/gebiete", { gebiete: [...gebiete, { name: "Kaputt", land: "DE", plz: ["8x"], mitarbeiterId: adminKonto.id }] });
  pruefe(r.status === 422, "Gebiet mit ungültigem PLZ-Bereich → 422", r.status);
  r = await admin.post("/api/admin/akquise", { ids: [zeile?.id], modus: "gebiet", ueberschreiben: true });
  pruefe(r.status === 200 && r.json.ergebnis.zugewiesen === 1, "Massen-Zuweisung nach Gebiet", r.json);

  // ------------------------------------------------------------ 10. Seiten
  abschnitt("10. Neue Backoffice-Seiten");
  for (const p of ["/portal/admin/crm", `/portal/admin/crm/${k1}`, "/portal/admin/crm/dubletten", "/portal/admin/akquise", "/portal/admin/automationen", "/portal/admin/vorlagen", "/portal/admin/berichte", "/portal/admin/protokoll", "/portal/admin/rechte"]) {
    pruefe((await seite(admin, p)) === 200, `${p} (Leitung) 200`);
  }
  pruefe((await gesperrt(admin, "/portal/admin/crm/K-26-ZZZZZZ")), "unbekannter Kontakt → 404");

  // ------------------------------------------------------------ Aufräumen
  for (const id of aufraeumen.filter(Boolean)) await admin.del(`/api/admin/automationen/${id}`);
  if (vlId) await admin.patch(`/api/admin/vorlagen/${vlId}`, { name: `BO-Vorlage ${LAUF}`, kanal: "email", betreff: "Ihre Fläche {{flaeche.ha}} ha", text: "{{briefanrede}}, danke für Ihre Anfrage ({{vorgang.id}}).", aktiv: false });
  r = await admin.get("/api/admin/protokoll?limit=3");
  pruefe(r.json.kette?.ok === true, "Hash-Kette nach allen Tests intakt", r.json.kette?.fehler?.slice(0, 2));

  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen bestanden")} (${ok} ok)`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.stack || e.message}`));
  process.exit(1);
});
