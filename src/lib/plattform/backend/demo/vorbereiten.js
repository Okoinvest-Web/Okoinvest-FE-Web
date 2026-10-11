// src/lib/plattform/backend/demo/vorbereiten.js
//
// Demo-Datenbank vollständig vorbereiten: Die Fachmodule legen ihre Demo-Daten (und weitere
// Demo-Konten wie bo-akquise@, bank@, lieferant@, eg-obmann@ …) erst beim ersten Zugriff an
// („lazy Seeds“). Auf einer frischen Datenbank scheiterten deshalb Anmeldungen mit diesen Konten.
// demoVorbereiten() stößt alle Module einmal an – über ihre normalen Lesewege (eigene
// Transaktionen, nie verschachtelt in aendern()). Idempotent: Jeder Seed prüft seinen eigenen
// Versionsstand, bestehende Konten und Daten werden nicht überschrieben.
//
// Aufrufer: speicher.js nach dem allerersten Seed (über nachSeedSetzen in demo.js) und
// demo.js anmelden(), wenn eine @example.com-Adresse nicht gefunden wird (einmal pro Prozess).

import { aendern, lesen } from "./speicher";

// Systemleser mit vollem Backoffice-Leserecht (wie SYSTEM in closing.js/portfolio.js)
const SYSTEM = Object.freeze({ id: "SYSTEM-DEMO-VORBEREITEN", rollen: ["admin"], backofficeRollen: ["leitung"], aktiv: true, vorname: "Demo-Vorbereitung", nachname: "", system: true });

/**
 * Schritte in Abhängigkeitsreihenfolge (Konten zuerst, die andere Seeds per E-Mail suchen).
 * Einige Lesewege werfen nach dem Seed bewusst einen Fehler (fehlender Fall/Parameter) –
 * der Seed ist dann trotzdem gelaufen; Fehler werden nur gesammelt.
 */
const SCHRITTE = [
  ["backoffice", async () => {
    await import("./backoffice"); // registriert boSeed (boSeedSetzen) – sonst entstünde db.bo ohne Demo-Daten
    await (await import("./bo-kern")).boLesen();
  }],
  ["teams", async () => {
    const { orgSeed } = await import("./teams");
    if (!(await lesen()).orgSeed) await aendern((d) => void orgSeed(d));
  }],
  ["fach", async () => (await import("./fach")).fachBereit()],
  ["flaecheFach", async () => (await import("./flaecheFach")).fachDemoBereit()],
  ["mitglied", async () => (await import("./mitglied")).mitgliedBereit()],
  ["anlagen", async () => (await import("./anlagen")).anlagen(SYSTEM)],
  ["entwicklung", async () => (await import("./entwicklung")).entwicklungAuswahl(SYSTEM)],
  ["kyc", async () => (await import("./kyc")).kycStatus(null, { kontoId: "U-00-000000" })],
  ["energie", async () => (await import("./energie")).energieTermin(SYSTEM)],
  ["service", async () => (await import("./service-kern")).lesenBereit()],
  ["dienste", async () => (await import("./dienste")).identStatus(SYSTEM)],
  ["finanzen", async () => (await import("./finanzen")).finanzAbrechnungen(SYSTEM, { limit: 1 })],
  ["finanzierung", async () => (await import("./finanzierung")).fzBankZaehler({ id: SYSTEM.id, rollen: ["bank"] })],
  ["bankakte", async () => (await import("./bankakte")).baStaende(SYSTEM)],
  ["closing", async () => (await import("./closing")).clListe(SYSTEM)],
  ["portfolio", async () => (await import("./portfolio")).pfUebersicht(SYSTEM)],
  ["betrieb", async () => (await import("./betrieb")).betriebUebersicht(SYSTEM)],
  ["buchhaltung", async () => (await import("./buchhaltung")).bhUebersicht(SYSTEM)],
  ["dealroom", async () => (await import("./dealroom")).dealroomUebersicht(SYSTEM)],
  ["gutachter", async () => (await import("./gutachter")).gaUebersicht(SYSTEM)],
  ["planung", async () => (await import("./planung")).planungMeine(SYSTEM)],
  ["gemeinde", async () => (await import("./gemeinde")).gdCockpit(SYSTEM, {})],
  ["eg-stamm", async () => (await import("./eg-stamm")).egGemeinschaften(SYSTEM)],
  ["eg-eda", async () => (await import("./eg-eda")).edaGemeinschaftBereit(SYSTEM, { gemeinschaftId: "" })],
  ["eg-gruendung", async () => (await import("./eg-gruendung")).grAuftraege(SYSTEM)],
  ["eg-abrechnung", async () => (await import("./eg-abrechnung")).abPerioden(SYSTEM, "")], // wirft nach dem Seed (keine Gemeinschaft)
  ["kycIdent", async () => (await import("./kycIdent")).kycVideo(SYSTEM)], // wirft nach dem Seed (kein eigener Fall)
  ["pachtakte", async () => {
    // Lesezugriff nur für Eigentümer – mit dem Demo-Flächenkonto (nur lesen, Akten werden ergänzt)
    const fl = (await lesen()).nutzer.find((u) => u.email === "flaeche@example.com" && u.demo !== false);
    if (fl) await (await import("./pachtakte")).meinePachtakte({ ...fl, passwortHash: undefined });
  }],
  ["newsletter", async () => (await import("./newsletter-seed")).newsletterSeedBereit()], // Plattform-Armee, MARKETING: Demo-Abos fürs Backoffice
];

// Erwartete Fehler einzelner Lesewege nach erfolgtem Seed (kein Problem)
const ERWARTET = new Set(["eg-abrechnung", "kycIdent"]);

/**
 * Alle Fachmodul-Seeds einmal anstoßen. Idempotent; darf NICHT innerhalb von aendern() laufen.
 * Liefert { ok: [schritte], fehler: [{ schritt, meldung }] }.
 */
export async function demoVorbereiten() {
  const ok = [];
  const fehler = [];
  for (const [schritt, fn] of SCHRITTE) {
    try {
      await fn();
      ok.push(schritt);
    } catch (e) {
      if (ERWARTET.has(schritt) && e?.status) ok.push(schritt);
      else {
        fehler.push({ schritt, meldung: e?.message || String(e) });
        console.warn(`[plattform-demo] Demo-Vorbereitung „${schritt}“:`, e?.message || e);
      }
    }
  }
  return { ok, fehler };
}

// Einmal pro Prozess (auf globalThis, weil Next.js Module mehrfach laden kann)
const LAUF = Symbol.for("oekoinvest.demo.vorbereitet");

/** demoVorbereiten() höchstens einmal pro Prozess; gleichzeitige Aufrufer warten auf denselben Lauf. */
export function demoVorbereitenEinmal() {
  globalThis[LAUF] ||= demoVorbereiten().catch((e) => {
    console.warn("[plattform-demo] Demo-Vorbereitung fehlgeschlagen:", e?.message || e);
    return { ok: [], fehler: [{ schritt: "gesamt", meldung: e?.message || String(e) }] };
  });
  return globalThis[LAUF];
}
