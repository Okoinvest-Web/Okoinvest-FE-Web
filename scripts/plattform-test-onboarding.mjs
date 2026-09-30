// scripts/plattform-test-onboarding.mjs
//
// Tests „Onboarding-Assistenten je Rolle und Untertyp“ (Team B1):
//   node scripts/plattform-test-onboarding.mjs [basis-url]      Teil A (Logik) + Teil B (gegen den Dev-Server, Demo-Backend)
//   node scripts/plattform-test-onboarding.mjs --nur-logik      nur Teil A
//
// Teil A: je Rolle der richtige Pfad, Definitionen vollständig (eindeutige Schritte, bekannte Fakten, Links auf
// existierende Routen), Auswertung je Untertyp, Server-Prüfung (fremder Pfad 403, nicht bestätigbar 422, Abschluss
// nur bei erfüllten Kriterien 409), Mail-Fälligkeit, JSON-Export für Frappe aktuell, Rolle `kommune` in Konstanten,
// Menü, Registrierung und Frappe.
// Teil B: echte Konten je Rolle (Präfix „onb-“), Pfad je Rolle, Abschluss nur mit echten Daten, keine fremden Daten,
// Rolle `kommune` (Registrierung, Menü „Gemeinde“, keine Unternehmens-APIs), Team-Sicht nur Leitung, Willkommensmail.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { aufloesungRegistrieren, exportDaten } from "./onboarding-pfade-export.mjs";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NUR_LOGIK = process.argv.includes("--nur-logik");
const BASIS = (process.argv.slice(2).find((a) => !a.startsWith("--")) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
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
const datei = (p) => readFileSync(path.join(WURZEL, p), "utf8");

aufloesungRegistrieren();
const lade = (p) => import(pathToFileURL(path.join(WURZEL, p)).href);

// ================================================================ Teil A – Logik

/** Alle Fakten, die server/onboarding.js liefert (Kriterien dürfen nur diese nutzen) */
const FAKTEN = ["name", "telefon", "firma", "emailBestaetigt", "mailEinstellungen", "zweiFaktor", "organisation", "flaechen", "flaechenDach", "flaechenLand", "flaechenEingereicht", "flaechencheck", "projekte", "projekteBestand", "provision", "datenblatt", "suchprofil", "suchprofilTicket", "suchprofilStruktur", "interessen", "kyc.status", "kyc.angestossen", "kyc.iban", "kyc.eigentum", "termine", "abnahmestellen", "lastgaenge", "beteiligung", "energieVertrag", "vollmacht", "anlagen", "kommuneAnliegen", "kommuneGeprueft", "auftraege", "ausschreibungen", "bankAnfragen", "aufgabenErledigt", "gebiete", "untertyp"];

function faktenIn(k, liste = []) {
  if (!k || typeof k !== "object") return liste;
  if (k.fakt) liste.push(k.fakt);
  for (const x of [...(k.alle || []), ...(k.eines || []), ...(k.nicht ? [k.nicht] : [])]) faktenIn(x, liste);
  return liste;
}

/** Existiert die Route (src/app/…/page.js)? Dynamische Segmente werden nicht verlinkt. */
function routeExistiert(href) {
  const pfad = href.split(/[?#]/)[0].replace(/\/$/, "");
  return existsSync(path.join(WURZEL, "src/app", pfad, "page.js"));
}

const fehlerFn = (status, meldung) => Object.assign(new Error(meldung), { status });
/** true, wenn fn mit genau diesem Status scheitert */
function erwarteFehler(fn, status) {
  try {
    fn();
    return false;
  } catch (e) {
    return e.status === status;
  }
}

async function teilA() {
  const motor = await lade("src/lib/plattform/onboarding/motor.js");
  const pf = await lade("src/lib/plattform/onboarding/pfade/index.js");
  const k = await lade("src/lib/plattform/konstanten.js");

  abschnitt("A1. Je Rolle der richtige Pfad");
  const erwartet = { investor: "investor", anbieter: "verkaeufer", flaeche: "flaeche", landwirt: "flaeche", unternehmen: "kunde", kommune: "kommune", mitglied: "mitglied", gutachter: "gutachter", lieferant: "lieferant", bank: "bank", admin: "backoffice" };
  for (const [rolle, pfadId] of Object.entries(erwartet)) {
    const ids = pf.pfadeFuer([rolle]).map((p) => p.id);
    pruefe(ids.length === 1 && ids[0] === pfadId, `Rolle ${rolle} → Pfad ${pfadId}`, ids);
  }
  pruefe(pf.pfadeFuer(["landwirt", "mitglied"]).map((p) => p.id).join() === "flaeche,mitglied", "Mehrere Rollen → mehrere Pfade, Priorität Fläche vor Mitglied");
  pruefe(pf.pfadeFuer(["admin", "investor"])[0].id === "backoffice", "Backoffice-Konto startet mit der Einarbeitung");
  pruefe(pf.pfadeFuer([]).length === 0, "ohne Rolle kein Pfad");
  pruefe(Object.keys(pf.PFAD_NACH_ID.investor.untertypen).join() === "family_office,fonds,stadtwerk,ipp,privat", "Investor-Untertypen: Family Office, Fonds/AIF, Stadtwerk/EVU, IPP, Privat");
  pruefe(Object.keys(pf.PFAD_NACH_ID.verkaeufer.untertypen).join() === "projektentwickler,bestand", "Verkäufer: getrennte Pfade Projektrechte und Bestandsanlage");
  pruefe(Object.keys(pf.PFAD_NACH_ID.flaeche.untertypen).join() === "eigentuemer,landwirt,dach", "Fläche: Eigentümer, Landwirt, Dach");
  pruefe(Object.keys(pf.PFAD_NACH_ID.kunde.untertypen).join() === "contracting,reststrom", "Unternehmen: Contracting und Reststrom");
  const bo = await lade("src/lib/plattform/rechte.js");
  pruefe(["leitung", "akquise", "transaktion", "buchhaltung", "betrieb", "compliance", "energie", "lesen"].every((r) => pf.PFAD_NACH_ID.backoffice.untertypen[r] && bo.BACKOFFICE_ROLLEN[r]), "Backoffice: Einarbeitung je Unterrolle (Leitung … Nur lesen)");

  abschnitt("A2. Definitionen vollständig");
  const touren = Object.keys(pf.TOUREN);
  for (const p of pf.PFADE) {
    const ids = p.schritte.map((s) => s.id);
    pruefe(new Set(ids).size === ids.length && ids.every((i) => motor.ID_MUSTER.test(i)), `${p.id}: eindeutige, gültige Schritt-IDs (${ids.length})`, ids);
    const unbekannt = p.schritte.flatMap((s) => faktenIn(s.kriterium)).filter((f) => !FAKTEN.includes(f));
    pruefe(unbekannt.length === 0, `${p.id}: Kriterien nutzen nur bekannte Fakten aus echten Daten`, unbekannt);
    const links = p.schritte.flatMap((s) => [...(s.links || []), ...Object.values(s.linksJe || {}).flat()]).map((l) => l.href);
    const tot = links.filter((h) => !routeExistiert(h));
    pruefe(tot.length === 0, `${p.id}: alle Links zeigen auf existierende Routen`, tot);
    const ohneAbschluss = p.schritte.filter((s) => !s.kriterium);
    pruefe(ohneAbschluss.length === 0, `${p.id}: jeder Schritt hat ein Abschlusskriterium`, ohneAbschluss.map((s) => s.id));
    const merkerOhneBestaetigung = p.schritte.filter((s) => JSON.stringify(s.kriterium).includes('"merker":true') && !s.bestaetigbar);
    pruefe(merkerOhneBestaetigung.length === 0, `${p.id}: Merker-Kriterien nur an bestätigbaren Schritten`, merkerOhneBestaetigung.map((s) => s.id));
  }
  pruefe(touren.every((t) => routeExistiert(pf.TOUREN[t].pfad)), "Tour-Hinweise nur an existierenden Seiten", touren.filter((t) => !routeExistiert(pf.TOUREN[t].pfad)));

  abschnitt("A3. Auswertung je Untertyp (Abschluss nur aus echten Daten)");
  const inv = pf.PFAD_NACH_ID.investor;
  let a = motor.pfadAuswerten(inv, {}, {});
  pruefe(a.untertyp === null && a.pflichtOffen.includes("typ") && !a.abschliessbar, "Investor ohne Daten: Typ offen, nicht abschließbar", a.pflichtOffen);
  const invFakten = { name: true, telefon: true, suchprofil: true, suchprofilTicket: true, kyc: { angestossen: true }, interessen: 0 };
  a = motor.pfadAuswerten(inv, invFakten, { untertyp: "privat", bestaetigt: ["nda"] });
  pruefe(a.abschliessbar, "Privatinvestor mit Suchprofil, Ticket, KYC und NDA verstanden → abschließbar (keine Firma nötig)", a.pflichtOffen);
  a = motor.pfadAuswerten(inv, invFakten, { untertyp: "fonds", bestaetigt: ["nda"] });
  pruefe(a.pflichtOffen.join() === "profil", "Fonds: Firma ist Pflicht", a.pflichtOffen);
  a = motor.pfadAuswerten(inv, { ...invFakten, kyc: { angestossen: false } }, { untertyp: "privat", bestaetigt: ["nda", "kyc"] });
  pruefe(a.pflichtOffen.includes("kyc"), "KYC lässt sich nicht per Klick erledigen – nur mit eingereichter Prüfung", a.pflichtOffen);
  a = motor.pfadAuswerten(inv, invFakten, {}, { untertypVorschlag: pf.untertypVorschlag("investor", { nutzer: { suchprofil: { investorTyp: "evu" } } }) });
  pruefe(a.untertyp === "stadtwerk" && !a.untertypGewaehlt, "Investorentyp aus dem Suchprofil wird als Untertyp vorgeschlagen (EVU → Stadtwerk/EVU)", a.untertyp);
  const vk = pf.PFAD_NACH_ID.verkaeufer;
  const vkF = { name: true, telefon: true, firma: true, projekte: 1, projekteBestand: 0, provision: 1, kyc: { angestossen: true } };
  pruefe(motor.pfadAuswerten(vk, vkF, { untertyp: "bestand" }).pflichtOffen.includes("projekt"), "Bestand: Projekt zählt erst in Phase COD");
  pruefe(motor.pfadAuswerten(vk, vkF, { untertyp: "projektentwickler" }).abschliessbar, "Projektentwickler: Projekt, Provision, KYB → abschließbar");
  const fl = pf.PFAD_NACH_ID.flaeche;
  const flDach = motor.pfadAuswerten(fl, {}, { untertyp: "dach" }).schritte.map((s) => s.id);
  pruefe(!flDach.includes("flaechencheck") && flDach.includes("termin"), "Dach: kein Flächencheck, Besichtigung ja", flDach);
  pruefe(motor.pfadAuswerten(fl, { flaechen: 1 }, {}).schritte.find((s) => s.id === "flaeche").erledigt, "Fläche angelegt → Schritt „Fläche“ erledigt");
  const ku = pf.PFAD_NACH_ID.kunde;
  const kuC = motor.pfadAuswerten(ku, {}, { untertyp: "contracting" });
  const kuR = motor.pfadAuswerten(ku, {}, { untertyp: "reststrom" });
  pruefe(kuC.schritte.some((s) => s.id === "solarstrom") && !kuC.schritte.some((s) => s.id === "abnahmestelle"), "Contracting: Mein Solarstrom, Rechnungen, Störung – keine Energie-Stammdaten");
  pruefe(["abnahmestelle", "vertrag"].every((i) => kuR.pflichtOffen.includes(i)) && !kuR.pflichtOffen.includes("lastgang"), "Reststrom: MaLo/Abnahmestelle und Vertrag Pflicht, Lastgang empfohlen", kuR.pflichtOffen);
  const bof = pf.PFAD_NACH_ID.backoffice;
  const boIds = (u) => motor.pfadAuswerten(bof, {}, { untertyp: u }).schritte.map((s) => s.id);
  pruefe(boIds("akquise").includes("gebiete") && boIds("akquise").includes("vorlagen") && !boIds("buchhaltung").includes("gebiete"), "Einarbeitung Akquise: Gebiete, Vorlagen – nicht bei Buchhaltung");
  pruefe(motor.pfadAuswerten(bof, {}, { untertyp: "leitung" }).pflichtOffen.includes("zweifaktor"), "2FA ist Pflicht der Einarbeitung");
  pruefe(!boIds("lesen").includes("aufgabe") && boIds("transaktion").includes("aufgabe"), "„Erste Aufgabe erledigen“ für alle außer Nur lesen");
  pruefe(motor.pfadAuswerten(bof, { aufgabenErledigt: 1 }, { untertyp: "akquise" }).schritte.find((s) => s.id === "aufgabe").erledigt, "Erste Aufgabe erledigt (aus Aufgabenliste)");

  abschnitt("A4. Server-Prüfung der Änderungen");
  const nutzer = { rollen: ["investor"] };
  const erlaubt = (n, fakten = {}) => ({
    pfade: pf.pfadeFuer(n.rollen),
    untertypErlaubt: (p, u) => pf.untertypErlaubt(n, p, u),
    auswertung: (id, pz) => motor.pfadAuswerten(pf.PFAD_NACH_ID[id], fakten, pz),
    touren: pf.TOUREN,
  });
  pruefe(erwarteFehler(() => motor.aenderungPruefen({}, { aktion: "pfad", pfad: "backoffice" }, erlaubt(nutzer), fehlerFn), 403), "fremder Pfad → 403");
  pruefe(erwarteFehler(() => motor.aenderungPruefen({}, { aktion: "untertyp", pfad: "investor", untertyp: "hacker" }, erlaubt(nutzer), fehlerFn), 422), "unbekannter Untertyp → 422");
  pruefe(erwarteFehler(() => motor.aenderungPruefen({}, { aktion: "bestaetigen", pfad: "investor", schritt: "kyc" }, erlaubt(nutzer), fehlerFn), 422), "datenbasierter Schritt (KYC) nicht per Klick → 422");
  pruefe(erwarteFehler(() => motor.aenderungPruefen({}, { aktion: "bestaetigen", pfad: "investor", schritt: "gibtsnicht" }, erlaubt(nutzer), fehlerFn), 422), "unbekannter Schritt → 422");
  pruefe(erwarteFehler(() => motor.aenderungPruefen({}, { aktion: "abschliessen", pfad: "investor" }, erlaubt(nutzer), fehlerFn), 409), "Abschluss mit offenen Pflichtschritten → 409");
  let z = motor.aenderungPruefen({}, { aktion: "untertyp", pfad: "investor", untertyp: "privat" }, erlaubt(nutzer), fehlerFn);
  z = motor.aenderungPruefen(z, { aktion: "bestaetigen", pfad: "investor", schritt: "nda" }, erlaubt(nutzer), fehlerFn);
  z = motor.aenderungPruefen(z, { aktion: "spaeter", pfad: "investor", schritt: "termin" }, erlaubt(nutzer), fehlerFn);
  z = motor.aenderungPruefen(z, { aktion: "abschliessen", pfad: "investor" }, erlaubt(nutzer, invFakten), fehlerFn);
  pruefe(z.pfade.investor.untertyp === "privat" && z.pfade.investor.bestaetigt.join() === "nda" && z.pfade.investor.spaeter.join() === "termin" && !!z.pfade.investor.abgeschlossenAm, "Untertyp, Bestätigung, „später“ und Abschluss bei erfüllten Kriterien", z.pfade.investor);
  const boNutzer = { rollen: ["admin"], backofficeRollen: ["akquise"] };
  pruefe(erwarteFehler(() => motor.aenderungPruefen({}, { aktion: "untertyp", pfad: "backoffice", untertyp: "leitung" }, erlaubt(boNutzer), fehlerFn), 422), "Backoffice: nur eigene Unterrolle als Untertyp");
  pruefe(erwarteFehler(() => motor.aenderungPruefen({}, { aktion: "tour", gesehen: "<script>" }, erlaubt(nutzer), fehlerFn), 422), "unbekannter Tour-Hinweis → 422");
  const bereinigt = motor.pfadZustandBereinigen({ aktiv: "<x>", pfade: { investor: { bestaetigt: ["nda", "<b>", 3], untertyp: "DROP TABLE" }, "../x": {} }, fremd: 1 });
  pruefe(bereinigt.aktiv === null && bereinigt.pfade.investor.bestaetigt.join() === "nda" && bereinigt.pfade.investor.untertyp === null && !bereinigt.pfade["../x"] && !("fremd" in bereinigt), "Zustand: Positivliste und Formatprüfung", bereinigt);

  abschnitt("A5. E-Mail-Serie (Willkommen, Erinnerung nach 3/7 Tagen)");
  const tage = (t) => new Date(Date.now() - t * 86400e3).toISOString();
  const snap = { pfad: "investor", pflichtOffen: ["kyc"], abgeschlossen: false, erledigt: 3, gesamt: 10, quote: 30 };
  pruefe(motor.faelligeMail({ erstelltAm: tage(0.1) }, { mails: {}, auswertung: snap }) === "willkommen", "neues Konto → Willkommen");
  pruefe(motor.faelligeMail({ erstelltAm: tage(60) }, { mails: {}, auswertung: snap }) === null, "Bestandskonto → keine Willkommensmail");
  pruefe(motor.faelligeMail({ erstelltAm: tage(3.5) }, { mails: { willkommen: tage(3) }, auswertung: snap }) === "erinnerung3", "nach 3 Tagen offen → Erinnerung");
  pruefe(motor.faelligeMail({ erstelltAm: tage(7.5) }, { mails: { willkommen: tage(7), erinnerung3: tage(4) }, auswertung: snap }) === "erinnerung7", "nach 7 Tagen → zweite Erinnerung");
  pruefe(motor.faelligeMail({ erstelltAm: tage(7.5), checklisteAus: true }, { mails: { willkommen: tage(7) }, auswertung: snap }) === null, "Checkliste ausgeblendet → keine Erinnerung");
  pruefe(motor.faelligeMail({ erstelltAm: tage(4) }, { mails: { willkommen: tage(4) }, auswertung: { ...snap, pflichtOffen: [] } }) === null, "alles erledigt → keine Erinnerung");
  const m = motor.mailInhalt("erinnerung3", { pfadTitel: "Einstieg für Investoren", offen: 2 });
  pruefe(m.link === "/portal/willkommen" && !/@|€|IBAN/.test(m.text), "Mailtext ohne vertrauliche Inhalte, Link ins Portal");

  abschnitt("A6. Frappe-Export und Rolle „kommune“");
  const json = datei("Backend-Import/oekoinvest_app/oekoinvest_app/plattform/onboarding_pfade.json");
  pruefe(json === JSON.stringify(exportDaten(pf), null, 1) + "\n", "onboarding_pfade.json entspricht den JS-Definitionen (node scripts/onboarding-pfade-export.mjs)");
  pruefe(k.ROLLEN_IDS.includes("kommune") && k.ROLLE_FUER_TYP.kommune === "kommune" && k.rolleLabel("kommune") === "Kommune / Gemeinde", "konstanten.js: Rolle kommune wählbar, Anfrage „kommune“ → Rolle kommune");
  const rahmen = datei("src/components/Portal/PortalRahmen.js");
  pruefe(/hat\("kommune"\) && \{ href: "\/portal\/kommune", label: "Gemeinde"/.test(rahmen) && /kommune: "Gemeinde"/.test(rahmen), "Portal-Menü: „Gemeinde“ → /portal/kommune (+ Brotkrumen)");
  pruefe(!/hat\("unternehmen"[^)]*"kommune"/.test(rahmen), "Kommune bekommt keine Unternehmens-Menüpunkte");
  pruefe(/kommune: Landmark/.test(datei("src/components/Plattform/RegistrierFormular.js")), "Registrierung: Rollenkarte Kommune");
  const py = datei("Backend-Import/oekoinvest_app/oekoinvest_app/plattform/konstanten.py");
  pruefe(/"kommune": \("Plattform Kommune"/.test(py) && /ROLLEN_IDS = \[[^\]]*"kommune"/.test(py) && /"kommune": "kommune"/.test(py), "Frappe konstanten.py: Rolle, wählbar, Anfrage-Zuordnung");
  pruefe(JSON.parse(datei("Backend-Import/oekoinvest_app/oekoinvest_app/fixtures/role.json")).some((r) => r.name === "Plattform Kommune" && r.desk_access === 0), "Frappe-Rolle „Plattform Kommune“ (Website, ohne Desk)");
  const hooks = datei("Backend-Import/oekoinvest_app/oekoinvest_app/hooks.py");
  pruefe(hooks.includes('"Plattform Kommune"') && hooks.includes("plattform.api.onboarding.mail_lauf_taeglich"), "hooks.py: Rollen-Fixture und täglicher Erinnerungslauf");
  pruefe(datei("Backend-Import/oekoinvest_app/oekoinvest_app/patches.txt").includes("oekoinvest_app.patches.kommune_rolle"), "Patch: bestehende Kommune-Konten migrieren");
}

// ================================================================ Teil B – gegen den Dev-Server

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
  put = (p, b, o) => this.anfrage("PUT", p, b ?? {}, o);
  patch = (p, b, o) => this.anfrage("PATCH", p, b ?? {}, o);
  async login(email, passwort = DEMO_PASSWORT) {
    const r = await this.post("/api/auth/login", { email, passwort });
    if (r.status !== 200) throw new Error(`Login ${email} fehlgeschlagen: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.nutzer;
  }
  async registrieren(praefix, rollen) {
    this.email = `onb-${praefix}-${LAUF}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email: this.email, passwort: "Onb-Passwort-2026", vorname: "Onb", nachname: `${praefix} ${LAUF}`, rollen, agb: true });
    if (r.status !== 201) throw new Error(`Registrierung ${praefix} fehlgeschlagen: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.nutzer;
  }
  assistent = () => this.get("/api/portal/onboarding?ansicht=assistent");
  aktion = (body, o) => this.put("/api/portal/onboarding", body, o);
}

async function teilB() {
  abschnitt(`B1. Pfad je Rolle (echte Konten, Server ${BASIS})`);
  const faelle = [["investor", ["investor"], "investor"], ["anbieter", ["anbieter"], "verkaeufer"], ["landwirt", ["landwirt"], "flaeche"], ["firma", ["unternehmen"], "kunde"], ["kommune", ["kommune"], "kommune"], ["mitglied", ["mitglied"], "mitglied"]];
  const konten = {};
  for (const [praefix, rollen, pfadId] of faelle) {
    const c = new Client(praefix);
    const u = await c.registrieren(praefix, rollen);
    c.id = u.id;
    konten[praefix] = c;
    const r = await c.assistent();
    pruefe(r.status === 200 && r.json.pfad?.id === pfadId, `${rollen.join("+")} → Assistent „${pfadId}“`, r.json.pfad?.id || r.json);
    if (praefix === "landwirt") pruefe(r.json.pfad?.untertyp === "landwirt" && r.json.pfad?.schritte.some((s) => s.id === "flaechencheck"), "Landwirt: Untertyp „Landwirt“ vorgeschlagen, Flächencheck-Schritt", r.json.pfad?.untertyp);
    if (praefix === "investor") pruefe(r.json.pfad?.schritte[0]?.id === "typ" && r.json.pfad.pflichtOffen.includes("typ"), "Investor: zuerst Investorentyp wählen");
  }
  const inv = konten.investor;
  const r0 = await inv.assistent();
  pruefe(!("fakten" in r0.json) && !/passwortHash|@example\.com/.test(JSON.stringify(r0.json.pfad)), "Antwort ohne Rohfakten, Hashes oder Adressen");
  const liste = await inv.get("/api/portal/onboarding");
  pruefe(liste.json.liste?.punkte?.every((p) => p.href.startsWith("/portal/willkommen?schritt=")) && liste.json.pfad?.id === "investor", "Checkliste „Erste Schritte“ = Schritte des Pfads, Wiedereinstieg in den Assistenten", liste.json.liste?.punkte?.[0]);

  abschnitt("B2. Server erzwingt erlaubte Schritte");
  let r = await inv.aktion({ aktion: "pfad", pfad: "backoffice" });
  pruefe(r.status === 403, "Investor darf den Backoffice-Pfad nicht wählen → 403", r.status);
  r = await inv.aktion({ aktion: "untertyp", pfad: "investor", untertyp: "leitung" });
  pruefe(r.status === 422, "fremder Untertyp → 422", r.status);
  r = await inv.aktion({ aktion: "bestaetigen", pfad: "investor", schritt: "kyc" });
  pruefe(r.status === 422, "KYC per Klick bestätigen → 422", r.status);
  r = await inv.aktion({ aktion: "abschliessen", pfad: "investor" });
  pruefe(r.status === 409 && /Noch offen/.test(r.json.error || ""), "Abschluss ohne erfüllte Pflichtkriterien → 409 mit offenen Punkten", r.json);
  r = await inv.aktion({ aktion: "untertyp", pfad: "investor", untertyp: "privat" }, { origin: "https://boese.example" });
  pruefe(r.status === 403, "fremde Herkunft → 403", r.status);
  r = await inv.aktion({ aktion: "untertyp", pfad: "investor", untertyp: "privat" });
  pruefe(r.status === 200 && r.json.pfad?.untertyp === "privat" && r.json.pfad.schritte.find((s) => s.id === "typ")?.erledigt, "Untertyp „Privatinvestor“ gewählt → Schritt erledigt", r.json.pfad?.untertyp);
  r = await inv.aktion({ aktion: "bestaetigen", pfad: "investor", schritt: "nda" });
  pruefe(r.status === 200 && r.json.pfad.schritte.find((s) => s.id === "nda")?.erledigt, "NDA-Rahmen verstanden → erledigt");
  r = await inv.aktion({ aktion: "spaeter", pfad: "investor", schritt: "termin" });
  pruefe(r.status === 200 && r.json.pfad.schritte.find((s) => s.id === "termin")?.spaeter, "Termin auf „später“");
  await inv.patch("/api/portal/profil", { vorname: "Onb", nachname: `investor ${LAUF}`, telefon: "+43 660 1234567" });
  await inv.put("/api/portal/suchprofil", { typen: ["freiflaeche"], laender: ["AT"], mwpMin: 1, mwpMax: 20, ticketMin: 500000, ticketMax: 3000000, benachrichtigen: false });
  r = await inv.assistent();
  const offen = r.json.pfad?.pflichtOffen || [];
  pruefe(r.json.pfad?.schritte.find((s) => s.id === "suchprofil")?.erledigt && r.json.pfad.schritte.find((s) => s.id === "ticket")?.erledigt && offen.join() === "kyc", "Profil, Suchprofil, Ticket aus echten Daten erledigt – nur KYC offen", offen);
  const fremd = await konten.mitglied.assistent();
  pruefe(fremd.json.pfad?.id === "mitglied" && !fremd.json.pfad.schritte.some((s) => s.id === "nda"), "anderes Konto unberührt (kein fremder Pfad/Zustand)");

  abschnitt("B3. Abschluss mit echten Daten (Mitglied)");
  const mg = konten.mitglied;
  r = await mg.aktion({ aktion: "abschliessen", pfad: "mitglied" });
  pruefe(r.status === 409, "vor der Vormerkung → 409", r.status);
  await mg.put("/api/portal/fach/mitglied", { art: "geno", daten: { land: "DE", anteile: 2, art: "privat", interessen: ["beteiligung"], bestaetigt: { aufbau: true, risiko: true, kuendigung: true, beratung: true } } });
  await mg.aktion({ aktion: "bestaetigen", pfad: "mitglied", schritt: "pflichthinweise" });
  await mg.aktion({ aktion: "bestaetigen", pfad: "mitglied", schritt: "profil" });
  r = await mg.aktion({ aktion: "abschliessen", pfad: "mitglied" });
  pruefe(r.status === 200 && r.json.pfad?.abgeschlossen, "Beteiligung vorgemerkt + Pflichthinweise → Abschluss 200", r.json);

  abschnitt("B4. Rolle „kommune“");
  const ko = konten.kommune;
  r = await ko.get("/api/auth/ich");
  pruefe(r.json.nutzer?.rollen?.join() === "kommune", "Registrierung mit Rolle kommune", r.json.nutzer?.rollen);
  r = await ko.get("/portal", { origin: null });
  pruefe(r.status === 200 && r.text.includes('href="/portal/kommune"') && !r.text.includes('href="/portal/energie"'), "Menü: „Gemeinde“ statt Unternehmens-Punkte", r.status);
  r = await ko.get("/portal/kommune", { origin: null });
  pruefe(r.status === 200, "/portal/kommune → 200", r.status);
  r = await ko.get("/api/portal/energie");
  pruefe(r.status === 403, "Unternehmens-API (Energiebeschaffung) für Kommune → 403", r.status);
  r = await ko.assistent();
  pruefe(r.json.pfad?.schritte.some((s) => s.id === "gemeinde" && s.pflicht) && r.json.pfad.schritte.some((s) => s.id === "bauleitplanung") && r.json.pfad.schritte.some((s) => s.id === "beteiligung"), "Kommune-Pfad: Gemeindedaten (Pflicht), Bauleitplanung, Bürgerbeteiligung");
  const demoKommune = new Client("kommune-demo");
  await demoKommune.login("kommune@example.com");
  await demoKommune.get("/api/portal/onboarding?ansicht=tour");
  r = await demoKommune.get("/api/auth/ich");
  pruefe(r.json.nutzer?.rollen?.includes("kommune") && !r.json.nutzer.rollen.includes("unternehmen"), "Demo-Konto kommune@ migriert (unternehmen → kommune)", r.json.nutzer?.rollen);

  abschnitt("B5. Backoffice: Einarbeitung und Team-Sicht");
  const leitung = new Client("leitung");
  await leitung.login("admin@example.com");
  r = await leitung.assistent();
  pruefe(r.status === 200 && r.json.pfad?.id === "backoffice" && r.json.pfad.pflichtOffen.includes("zweifaktor") === !r.json.pfad.schritte.find((s) => s.id === "zweifaktor").erledigt, "Backoffice → Einarbeitungs-Assistent mit 2FA-Schritt", r.json.pfad?.id);
  r = await leitung.get("/api/admin/onboarding");
  const boAkquise = r.json.team?.find((t) => t.email === "bo-akquise@example.com");
  pruefe(r.status === 200 && boAkquise?.untertyp === "akquise" && boAkquise.gesamt > 0 && r.json.team.every((t) => Number.isInteger(t.quote)), "Leitung sieht Einarbeitungsstand des Teams (je Unterrolle)", boAkquise);
  pruefe(r.json.team?.every((t) => !("fakten" in t) && !("passwortHash" in t)), "Team-Sicht ohne Rohdaten");
  const akquise = new Client("bo-akquise");
  await akquise.login("bo-akquise@example.com");
  r = await akquise.get("/api/admin/onboarding");
  pruefe(r.status === 403, "Akquise sieht die Team-Sicht nicht → 403", r.status);
  r = await akquise.aktion({ aktion: "untertyp", pfad: "backoffice", untertyp: "leitung" });
  pruefe(r.status === 422, "Akquise kann sich nicht „Leitung“ als Untertyp geben → 422", r.status);
  r = await inv.get("/api/admin/onboarding");
  pruefe(r.status === 403, "Externe → 403", r.status);
  r = await akquise.post("/api/admin/onboarding/lauf", {});
  pruefe(r.status === 403, "Erinnerungslauf nur Leitung → 403", r.status);
  r = await leitung.post("/api/admin/onboarding/lauf", {});
  pruefe(r.status === 200 && Number.isInteger(r.json.versendet), "Erinnerungslauf (Leitung) → 200", r.json);
  r = await leitung.get("/portal/admin/einarbeitung", { origin: null });
  pruefe(r.status === 200 && r.text.includes("Einarbeitung des Teams"), "/portal/admin/einarbeitung → 200", r.status);
  r = await akquise.get("/portal/admin/einarbeitung", { origin: null });
  pruefe((r.status === 404 || /NEXT_HTTP_ERROR_FALLBACK;404/.test(r.text)) && !r.text.includes("Einarbeitung des Teams"), "/portal/admin/einarbeitung für Akquise → nicht gefunden (404-Seite)", r.status);

  abschnitt("B6. Willkommensmail und Tour");
  r = await leitung.get("/api/admin/postausgang?limit=300");
  const mails = (r.json.mails || []).filter((m) => m.an === inv.email && m.art === "onboarding");
  pruefe(mails.length === 1 && /Willkommen/.test(mails[0].betreff) && mails[0].link === "/portal/willkommen", "genau eine Willkommensmail je neuem Konto (Postausgang)", mails.map((m) => m.betreff));
  r = await inv.aktion({ aktion: "tour", gesehen: "boerse" });
  pruefe(r.status === 200 && r.json.tour?.gesehen?.includes("boerse"), "Tour-Hinweis als gesehen gespeichert");
  r = await inv.aktion({ aktion: "tour", aus: true });
  const t = await inv.get("/api/portal/onboarding?ansicht=tour");
  pruefe(t.json.tour?.aus === true, "Tour-Hinweise abschaltbar");

  abschnitt("B7. Seiten");
  for (const [c, pfad] of [[inv, "/portal/willkommen"], [inv, "/portal/willkommen?schritt=ticket"], [konten.firma, "/portal/willkommen"], [leitung, "/portal/willkommen"], [ko, "/portal"]]) {
    r = await c.get(pfad, { origin: null });
    pruefe(r.status === 200 && !/Application error|Unhandled Runtime Error/.test(r.text), `${c.name}: ${pfad} → 200`, r.status);
  }
}

try {
  console.log(`Onboarding-Assistenten – Test (Lauf ${LAUF})`);
  await teilA();
  if (!NUR_LOGIK) await teilB();
} catch (e) {
  fehler++;
  console.log(rot(`Abbruch: ${e.stack || e.message}`));
}
console.log(`\n${ok} bestanden, ${fehler} fehlgeschlagen`);
process.exit(fehler ? 1 : 0);
