// src/lib/newsletter/dienst.js – Newsletter je Land: Anmelden → Double-Opt-in → Abmelden (Welle 3, Paket NL). Nur Server.
//
//  1. anmelden: aktiv? (sonst 503 ohne Daten anzunehmen) → E-Mail, Land, Themen prüfen (keine Vorauswahl; mindestens
//     ein Thema) → Protokoll „einwilligung“ (Hash des gezeigten Wortlauts inkl. Land und Themen) → Abo mit Token-Hash
//     + Bestätigungs-Mail (Demo-Postausgang). Antwort immer gleich – keine Auskunft, ob die Adresse schon angemeldet ist.
//  2. bestaetigen (POST vom Knopf der Seite /newsletter/abo/[token], nie per GET): Protokoll „doi“ → Abo aktiv →
//     Willkommens-Mail mit Abmeldelink (List-Unsubscribe + List-Unsubscribe-Post nach RFC 8058).
//  3. abmelden (ein Klick, auch RFC 8058 aus dem Mailprogramm): Protokoll „widerruf“, Abo und Personenzeile weg.
//  4. lesen: Zustand und Themen für die Seite – nie Personendaten.
//
// Ein Token je Abo: vor der Bestätigung öffnet der Link die Bestätigung, danach dieselbe Adresse die Verwaltung mit
// der Abmeldung. Gespeichert wird nur der SHA-256 (src/lib/bericht/token.js). Abhängigkeiten injizierbar (Tests).

import { PlattformFehler } from "@/lib/plattform/fehler";
import * as v from "@/lib/plattform/validierung";
import { newsletterBackend } from "@/lib/plattform/backend/newsletter";
import { herkunftBereinigen } from "@/lib/gruppe/kanal";
import { sha256 } from "@/lib/bericht/anforderung";
import { tokenErzeugen, tokenHash } from "@/lib/bericht/token";
import { newsletterAktiv } from "./versand";
import { newsletterLand, newsletterSprache, themenNormal } from "./themen";
import { ABMELDUNG_TEXT_ID, ANMELDUNG_TEXT_ID, ANTWORT, DOI, DOI_STUNDEN, NEWSLETTER_TEXT_VERSION, bestaetigungsMail, einwilligungsText, willkommensMail } from "./texte";

/** Erlaubte Quellen (wo der Baustein steht) – nur für die Auswertung, nie Personendaten */
export const QUELLEN = Object.freeze(["newsletter", "marktdaten", "footer", "ratgeber", "newsroom", "sonstige"]);

const objekt = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x : {});
const basis = (url) => String(url || "").replace(/\/$/, "");

const standard = (d = {}) => ({
  nl: d.nl || newsletterBackend(),
  aktiv: d.aktiv || (() => newsletterAktiv()),
  jetzt: d.jetzt || (() => new Date()),
});

/** Eingaben prüfen → { email, land, sprache, themen, quelle } oder 422 (ohne den Wert zu nennen) */
export function anmeldungPruefen(roh) {
  const b = objekt(roh);
  const sprache = newsletterSprache(b.sprache);
  const en = sprache === "en";
  const email = v.email(b.email);
  if (!email) throw new PlattformFehler(422, en ? "Please enter a valid e-mail address." : "Bitte geben Sie eine gültige E-Mail-Adresse an.", "email");
  const land = newsletterLand(b.land);
  if (!land) throw new PlattformFehler(422, en ? "Please choose your country." : "Bitte wählen Sie Ihr Land.", "land");
  const themen = themenNormal(b.themen);
  if (!themen.length) throw new PlattformFehler(422, en ? "Please choose at least one topic." : "Bitte wählen Sie mindestens ein Thema.", "themen");
  const quelle = QUELLEN.includes(b.quelle) ? b.quelle : "sonstige";
  return { email, land, sprache, themen, quelle };
}

/** POST /api/newsletter */
export async function anmelden({ body, basisUrl }, deps) {
  const b = objekt(body);
  const sprache = newsletterSprache(b.sprache);
  const antwort = { ok: true, hinweis: ANTWORT[sprache].angefordert };
  if (b.website) return antwort; // Honeypot: still verwerfen
  const d = standard(deps);
  if (!d.aktiv()) throw new PlattformFehler(503, ANTWORT[sprache].aus, "newsletter_aus");
  const e = anmeldungPruefen(b);
  const am = d.jetzt();
  const { token, hash } = tokenErzeugen();
  const { kanal } = herkunftBereinigen(objekt(b.herkunft));
  await d.nl.newsletterAnlegen({
    tokenHash: hash,
    email: e.email,
    land: e.land,
    sprache: e.sprache,
    themen: e.themen,
    quelle: e.quelle,
    kanal,
    ablauf: new Date(am.getTime() + DOI_STUNDEN * 3600e3).toISOString(),
    protokoll: { textId: ANMELDUNG_TEXT_ID, textVersion: NEWSLETTER_TEXT_VERSION, textHash: sha256(einwilligungsText(e)) },
    mail: bestaetigungsMail({ link: `${basis(basisUrl)}/newsletter/abo/${token}`, sprache: e.sprache, land: e.land }),
  });
  return antwort;
}

/** POST /api/newsletter/bestaetigen { token } */
export async function bestaetigen({ token, basisUrl }, deps) {
  const hash = tokenHash(token);
  if (!hash) throw new PlattformFehler(404, "Dieser Link ist ungültig.", "nicht_gefunden");
  const d = standard(deps);
  const r = await d.nl.newsletterBestaetigen({
    tokenHash: hash,
    jetztMs: d.jetzt().getTime(),
    // Wortlaut der Bestätigungsseite in der Sprache des Abos (Hash → Protokoll art "doi")
    doi: (sprache) => ({ textId: DOI.textId, textVersion: NEWSLETTER_TEXT_VERSION, textHash: sha256(DOI[sprache === "en" ? "en" : "de"].text) }),
    willkommen: ({ land, sprache, themen }) =>
      willkommensMail({ link: `${basis(basisUrl)}/newsletter/abo/${token}`, abmeldeUrl: `${basis(basisUrl)}/api/newsletter/abmelden?token=${token}`, sprache, land, themen }),
  });
  if (!r || r.zustand === null) throw new PlattformFehler(404, "Dieser Link ist ungültig.", "nicht_gefunden");
  if (r.zustand === "abgelaufen") throw new PlattformFehler(410, "Dieser Link ist abgelaufen. Bitte melden Sie sich neu an.", "abgelaufen");
  if (r.zustand !== "aktiv") throw new PlattformFehler(409, "Diese Anmeldung besteht nicht mehr.", "beendet");
  return { ok: true, bereits: !!r.bereits };
}

/** POST /api/newsletter/abmelden { token } bzw. RFC 8058 */
export async function abmelden({ token, kanal = "abmeldelink" }, deps) {
  const hash = tokenHash(token);
  if (!hash) throw new PlattformFehler(404, "Dieser Link ist ungültig.", "nicht_gefunden");
  const d = standard(deps);
  const r = await d.nl.newsletterAbmelden({ tokenHash: hash, kanal, textId: ABMELDUNG_TEXT_ID, textVersion: NEWSLETTER_TEXT_VERSION, jetztMs: d.jetzt().getTime() });
  if (!r || r.zustand === null) throw new PlattformFehler(404, "Dieser Link ist ungültig.", "nicht_gefunden");
  return { ok: true, bereits: !!r.bereits };
}

/** Für die Seite /newsletter/abo/[token]: { zustand, abo? } – nie Personendaten */
export async function lesen({ token }, deps) {
  const hash = tokenHash(token);
  if (!hash) return { zustand: null };
  const d = { nl: deps?.nl || newsletterBackend(), jetzt: deps?.jetzt || (() => new Date()) };
  return d.nl.newsletterLesen({ tokenHash: hash, jetztMs: d.jetzt().getTime() });
}
