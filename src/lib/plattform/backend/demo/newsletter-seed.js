// src/lib/plattform/backend/demo/newsletter-seed.js
//
// Demo-Abos für das Newsletter-Backoffice (Plattform-Armee, Paket MARKETING): Ohne Seed zeigt
// /portal/admin/newsletter nur leere Listen. Die Abos entstehen über die ECHTEN Operationen des
// Demo-Backends (newsletterAnlegen/-Bestaetigen/-Abmelden) – so sind Token-Hash, Personenzeile,
// Einwilligungskette (einwilligung → doi → ggf. widerruf) und Postausgang garantiert konsistent.
// Nur fiktive @example.com-Adressen, keine echten Personen. Idempotent über db.newsletterSeed.
// Aufrufer: demo/vorbereiten.js (Schritt "newsletter").

import { aendern } from "./speicher";
import { sha256 } from "@/lib/bericht/anforderung";
import { newsletterAbmelden, newsletterAnlegen, newsletterBestaetigen } from "./newsletter";
import { ABMELDUNG_TEXT_ID, ANMELDUNG_TEXT_ID, DOI, DOI_STUNDEN, NEWSLETTER_TEXT_VERSION, einwilligungsText } from "@/lib/newsletter/texte";

const VERSION = 1;

// Zustände: aktiv (bestätigt), offen (DOI ausstehend), abgemeldet (Grabstein + Widerruf in der Kette)
const ABOS = [
  { email: "nl-landwirt@example.com", land: "DE", sprache: "de", themen: ["fristen_foerderung", "flaechen_pacht"], quelle: "newsletter", kanal: "web", zustand: "aktiv" },
  { email: "nl-stadtwerk@example.com", land: "AT", sprache: "de", themen: ["energiegemeinschaften"], quelle: "footer", kanal: "", zustand: "aktiv" },
  { email: "nl-invest@example.com", land: "CH", sprache: "en", themen: ["marktdaten"], quelle: "marktdaten", kanal: "web", zustand: "aktiv" },
  { email: "nl-offen@example.com", land: "DE", sprache: "de", themen: ["marktdaten"], quelle: "ratgeber", kanal: "", zustand: "offen" },
  { email: "nl-abgemeldet@example.com", land: "AT", sprache: "de", themen: ["fristen_foerderung"], quelle: "newsletter", kanal: "", zustand: "abgemeldet" },
];

/** Deterministischer, nur im Seed verwendeter Token-Hash (kein echter Link nötig) */
const hashFuer = (email) => sha256(`demo-newsletter-seed:${email}`);

/**
 * Demo-Abos einmal anlegen. Idempotent, darf NICHT innerhalb von aendern() laufen
 * (jede Newsletter-Operation ist eine eigene Transaktion).
 */
export async function newsletterSeedBereit() {
  const schonDa = await aendern((db) => {
    if ((db.newsletterSeed || 0) >= VERSION) return true;
    db.newsletterSeed = VERSION;
    return false;
  });
  if (schonDa) return;

  for (const s of ABOS) {
    const tokenHash = hashFuer(s.email);
    await newsletterAnlegen({
      tokenHash,
      email: s.email,
      land: s.land,
      sprache: s.sprache,
      themen: s.themen,
      quelle: s.quelle,
      kanal: s.kanal,
      ablauf: new Date(Date.now() + DOI_STUNDEN * 3600e3).toISOString(),
      protokoll: { textId: ANMELDUNG_TEXT_ID, textVersion: NEWSLETTER_TEXT_VERSION, textHash: sha256(einwilligungsText(s)) },
      mail: { betreff: "Demo: Bitte bestätigen Sie Ihre Anmeldung", text: "Demo-Seed – es wurde nichts versendet.", link: "", linkText: "Bestätigen" },
    });
    if (s.zustand === "offen") continue;
    await newsletterBestaetigen({
      tokenHash,
      doi: (sprache) => ({ textId: DOI.textId, textVersion: NEWSLETTER_TEXT_VERSION, textHash: sha256(DOI[sprache === "en" ? "en" : "de"].text) }),
    });
    if (s.zustand === "abgemeldet") {
      await newsletterAbmelden({ tokenHash, kanal: "abmeldelink", textId: ABMELDUNG_TEXT_ID, textVersion: NEWSLETTER_TEXT_VERSION });
    }
  }
}
