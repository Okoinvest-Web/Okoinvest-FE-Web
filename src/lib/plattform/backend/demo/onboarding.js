// src/lib/plattform/backend/demo/onboarding.js
//
// Demo-Backend „Onboarding-Assistenten je Rolle und Untertyp“ (Team B1).
//   onbZustand(n)                        → Pfad-Zustand des eigenen Kontos (bereinigt) + einmalige Migration Kommune-Konten
//   onbSpeichern(n, zustand, {protokollText}) → speichert den (vom Server geprüften) Zustand am eigenen Konto
//   onbMail(n, art, inhalt)              → Willkommens-/Erinnerungsmail in den Postausgang, Versand am Zustand vermerken (einmalig je Art)
//   onbTeam(n)                           → Einarbeitungsstand aller Backoffice-Konten (nur Unterrolle Leitung)
//   onbMailLauf(n|null)                  → Erinnerungen nach 3/7 Tagen für alle Konten (Scheduler-Ersatz; Frappe: täglich)
// Geprüft wird im Server (server/onboarding.js mit onboarding/motor.js); hier nur eigenes Konto bzw. Leitung.

import { aendern, lesen } from "./speicher";
import { jetzt } from "./hilfen";
import { mailAblegen } from "./service-kern";
import { mitZweiFaktor } from "./sicherheit";
import { intern } from "../demo";
import { PlattformFehler } from "../../fehler";
import { unterrollen } from "../../rechte";
import { faelligeMail, mailInhalt, pfadAuswerten, pfadZustandBereinigen } from "../../onboarding/motor";
import { PFAD_NACH_ID, untertypVorschlag } from "../../onboarding/pfade";
import { onboardingBereinigen } from "../../onboarding";

const angemeldet = (n) => {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
};
const MAIL_ARTEN = ["willkommen", "erinnerung3", "erinnerung7"];

/**
 * Einmalige Migration: Konten mit kommunalem Anliegen, die bisher die Rolle „unternehmen“ bekamen, erhalten die Rolle
 * „kommune“. „unternehmen“ bleibt nur, wenn das Konto auch Unternehmens-Anliegen hat (Reststrom, Carport, Speicher).
 */
function kommuneMigrieren(db) {
  if (db.onboardingMigration?.kommune) return false;
  const UNTERNEHMEN_TYPEN = ["reststrom", "carport", "speicher"];
  for (const u of db.nutzer) {
    const eigene = db.vorgaenge.filter((v) => v.nutzerId === u.id);
    if (!eigene.some((v) => v.typ === "kommune") || u.rollen.includes("kommune")) continue;
    u.rollen = [...u.rollen.filter((r) => r !== "unternehmen" || eigene.some((v) => UNTERNEHMEN_TYPEN.includes(v.typ))), "kommune"];
  }
  db.onboardingMigration = { ...(db.onboardingMigration || {}), kommune: jetzt() };
  return true;
}

export async function onbZustand(n) {
  angemeldet(n);
  let db = await lesen();
  if (!db.onboardingMigration?.kommune) {
    await aendern((d) => void kommuneMigrieren(d));
    db = await lesen();
  }
  const u = db.nutzer.find((x) => x.id === n.id);
  if (!u) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  return pfadZustandBereinigen(u.onboardingPfade);
}

export async function onbSpeichern(n, zustand, { protokollText = "" } = {}) {
  angemeldet(n);
  return aendern((db) => {
    const u = db.nutzer.find((x) => x.id === n.id);
    if (!u) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
    const neu = pfadZustandBereinigen(zustand);
    neu.mails = pfadZustandBereinigen(u.onboardingPfade).mails; // Mail-Vermerke setzt nur onbMail/onbMailLauf
    u.onboardingPfade = neu;
    if (protokollText) intern.protokoll(db, u, "onboarding", "nutzer", u.id, protokollText.slice(0, 200));
    return neu;
  });
}

export async function onbMail(n, art, { pfadTitel = "", offen = 0 } = {}) {
  angemeldet(n);
  if (!MAIL_ARTEN.includes(art)) throw new PlattformFehler(422, "Unbekannte Mail.");
  return aendern((db) => {
    const u = db.nutzer.find((x) => x.id === n.id);
    if (!u) return false;
    const z = pfadZustandBereinigen(u.onboardingPfade);
    if (z.mails[art]) return false;
    const m = mailInhalt(art, { pfadTitel, offen });
    mailAblegen(db, { an: u.email, anName: [u.vorname, u.nachname].filter(Boolean).join(" "), nutzerId: u.id, art: "onboarding", betreff: m.betreff, text: m.text, link: m.link, linkText: m.linkText });
    z.mails[art] = jetzt();
    u.onboardingPfade = z;
    return true;
  });
}

/** Fakten eines Backoffice-Kontos direkt aus der Demo-Datenbank (für die Team-Sicht der Leitung) */
function backofficeFakten(db, u) {
  const mit2fa = mitZweiFaktor(db, u);
  return {
    name: !!(u.vorname && u.nachname), telefon: !!u.telefon, firma: !!u.firma, mailEinstellungen: !!u.mailEinstellungen, zweiFaktor: !!mit2fa.zweiFaktorAktiv,
    aufgabenErledigt: (db.aufgaben || []).filter((a) => a.zustaendigId === u.id && a.status === "erledigt").length,
    gebiete: (db.bo?.gebiete || []).filter((g) => g.mitarbeiterId === u.id).length,
  };
}

export async function onbTeam(n) {
  angemeldet(n);
  if (!unterrollen(n).includes("leitung")) throw new PlattformFehler(403, "Den Einarbeitungsstand des Teams sieht nur die Leitung.");
  const db = await lesen();
  const pfad = PFAD_NACH_ID.backoffice;
  return db.nutzer
    .filter((u) => u.aktiv && u.rollen?.includes("admin"))
    .map((u) => {
      const z = pfadZustandBereinigen(u.onboardingPfade);
      const pz = z.pfade.backoffice || {};
      const legacy = onboardingBereinigen(u.onboarding).erledigt;
      const a = pfadAuswerten(pfad, backofficeFakten(db, u), pz, { untertypVorschlag: untertypVorschlag("backoffice", { nutzer: u }), legacyMerker: legacy });
      return {
        id: u.id, name: [u.vorname, u.nachname].filter(Boolean).join(" ") || u.email, email: u.email, unterrollen: unterrollen(u),
        untertyp: a.untertyp, erledigt: a.erledigt, gesamt: a.gesamt, quote: a.quote, abgeschlossen: a.abgeschlossen,
        offen: a.schritte.filter((s) => !s.erledigt).map((s) => ({ id: s.id, kurz: s.kurz, pflicht: s.pflicht })),
        gestartetAm: pz.gestartetAm || null, letzterLogin: u.letzterLogin || null, erstelltAm: u.erstelltAm || null,
      };
    })
    .sort((x, y) => x.quote - y.quote || x.name.localeCompare(y.name, "de"));
}

/** Erinnerungslauf (Scheduler-Ersatz). n = Leitung (Knopf im Backoffice) oder null (System). */
export async function onbMailLauf(n = null) {
  if (n && !unterrollen(n).includes("leitung")) throw new PlattformFehler(403, "Den Erinnerungslauf startet nur die Leitung.");
  const jetztMs = Date.now();
  return aendern((db) => {
    let versendet = 0;
    for (const u of db.nutzer) {
      if (!u.aktiv || !u.email || u.rollen?.includes("admin")) continue;
      const z = pfadZustandBereinigen(u.onboardingPfade);
      const legacy = onboardingBereinigen(u.onboarding);
      const art = faelligeMail({ erstelltAm: u.erstelltAm, checklisteAus: legacy.checklisteAus }, z, jetztMs);
      if (!art || art === "willkommen") continue; // Willkommen kommt beim ersten Aufruf des Portals (mit Pfadtitel)
      const a = z.auswertung;
      const m = mailInhalt(art, { pfadTitel: PFAD_NACH_ID[a.pfad]?.titel || "Ihr Einstieg", offen: a.pflichtOffen.length });
      mailAblegen(db, { an: u.email, anName: [u.vorname, u.nachname].filter(Boolean).join(" "), nutzerId: u.id, art: "onboarding", betreff: m.betreff, text: m.text, link: m.link, linkText: m.linkText });
      z.mails[art] = new Date(jetztMs).toISOString();
      u.onboardingPfade = z;
      versendet++;
    }
    if (n) intern.protokoll(db, n, "onboarding", "nutzer", n.id, `Erinnerungslauf Onboarding: ${versendet} E-Mail(s)`);
    return { versendet };
  });
}

