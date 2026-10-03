// src/lib/bericht/dienst.js
//
// Bericht-Baustein (Welle 2, Paket B4): Ablauf Anfordern → Double-Opt-in → Bericht. Nur serverseitig.
//
//  1. anfordern: Versand erlaubt? (sonst 503 „Berichtsversand startet mit dem Livegang.“ – ohne Personendaten
//     anzunehmen) → Neuberechnung (Positivliste, Eingabeprüfung) → Kontakt prüfen (Telefon freiwillig) →
//     Protokoll art "einwilligung" zweck "bericht" → Speichern (nur Token-Hash) + Bestätigungs-Mail.
//     Es entsteht KEIN Vorgang und KEIN Bericht.
//  2. bestaetigen (POST vom Knopf der Bestätigungsseite, nie per GET): Protokoll art "doi" zweck "bericht"
//     (ohne Personendaten, B3-Vertrag) → erst DANN backend.anfrageAnlegen (typ aus dem Rechner, Land,
//     strukturierte Rechnerdaten, die freiwilligen Häkchen) → Bericht 30 Tage abrufbar.
//  3. lesen: Bericht ohne Personendaten; abgelaufen → 410.
//
// Abhängigkeiten sind injizierbar (Tests); Standard: aktive Backends.

import { PlattformFehler } from "@/lib/plattform/fehler";
import { backend } from "@/lib/plattform/backend";
import { berichtBackend } from "@/lib/plattform/backend/bericht";
import { protokollAnhaengen } from "@/lib/plattform/backend/leadkette";
import { herkunftBereinigen } from "@/lib/gruppe/kanal";
import { RECHNER, neuRechnen } from "./neuRechnen";
import { annahmenbuchFuer } from "./annahmenbuch";
import { BESTAETIGUNG_STUNDEN, berichtBis, bestaetigungBis, tokenErzeugen, tokenHash } from "./token";
import { VERSAND_AUS_TEXT, bestaetigungsMail, versandErlaubt } from "./versand";
import { einwilligungenPruefen, kontaktPruefen, sha256 } from "./anforderung";
import { ANFORDERUNG, BERICHT_TEXT_VERSION, DOI } from "./texte";
import { berichtZaehlen } from "./zaehler";

const standard = (d = {}) => ({
  bericht: d.bericht || berichtBackend(),
  anfrage: d.anfrage || backend(),
  kette: d.kette || { protokollAnhaengen },
  versandErlaubt: d.versandErlaubt || (() => versandErlaubt()),
  jetzt: d.jetzt || (() => new Date()),
});

const objekt = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x : {});
export const ANTWORT_ANGEFORDERT = `Fast geschafft: Wir haben Ihnen einen Bestätigungslink geschickt. Bitte öffnen Sie ihn innerhalb von ${BESTAETIGUNG_STUNDEN} Stunden – erst dann erstellen wir den Bericht.`;

/** POST /api/rechner/bericht */
export async function berichtAnfordern({ body, basisUrl }, deps) {
  const b = objekt(body);
  const merkmale = { rechner: b.rechner, land: typeof b.land === "string" ? b.land.toUpperCase() : "" };
  if (b.website) {
    berichtZaehlen({ ...merkmale, ereignis: "abgelehnt" });
    return { ok: true, versand: true, hinweis: ANTWORT_ANGEFORDERT }; // Honeypot: still verwerfen
  }
  const d = standard(deps);
  if (!d.versandErlaubt()) {
    berichtZaehlen({ ...merkmale, ereignis: "abgelehnt" });
    throw new PlattformFehler(503, VERSAND_AUS_TEXT, "versand_aus");
  }
  try {
    // Die Route übergibt body.ergebnis o. Ä. nie weiter – gerechnet wird ausschließlich hier.
    const r = neuRechnen({ rechner: b.rechner, eingaben: b.eingaben, land: b.land });
    const kontakt = kontaktPruefen(b.kontakt);
    const am = d.jetzt();
    const einwilligungen = einwilligungenPruefen(b.einwilligungen, { telefon: kontakt.telefon, am: am.toISOString() });
    const { kanal } = herkunftBereinigen(objekt(b.herkunft));
    const annahmen = annahmenbuchFuer(r.rechner, r.eingaben);
    const { token, hash } = tokenErzeugen();
    const link = `${String(basisUrl || "").replace(/\/$/, "")}/bericht/${token}`;

    await d.kette.protokollAnhaengen({
      email: kontakt.email,
      art: "einwilligung",
      zweck: "bericht",
      textId: ANFORDERUNG.textId,
      textVersion: BERICHT_TEXT_VERSION,
      textHash: sha256(ANFORDERUNG.text),
      kanal: "web_formular",
      land: r.land,
      zeit: am.toISOString(),
    });
    await d.bericht.berichtAnlegen({
      tokenHash: hash,
      rechner: r.rechner,
      land: r.land,
      eingaben: r.eingaben,
      ergebnis: { titel: r.titel, ...r.ergebnis, annahmen },
      pruefId: r.pruefId,
      stand: r.stand,
      ablauf: bestaetigungBis(am),
      kontakt,
      einwilligungen,
      kanal,
      mail: bestaetigungsMail({ rechnerTitel: r.titel, link, stunden: BESTAETIGUNG_STUNDEN }),
    });
    berichtZaehlen({ rechner: r.rechner, land: r.land, ereignis: "angefordert" });
    return { ok: true, versand: true, hinweis: ANTWORT_ANGEFORDERT };
  } catch (e) {
    berichtZaehlen({ ...merkmale, ereignis: "abgelehnt" });
    throw e;
  }
}

/** Strukturierte Rechnerdaten für den Vorgang (keine Personendaten) */
export function vorgangDaten(e) {
  const ein = objekt(e.eingaben);
  return {
    quelle: `bericht_${e.rechner}`,
    land: e.land,
    ...(Number.isFinite(ein.ha) ? { ha: ein.ha } : {}),
    ...(ein.regionId ? { regionId: ein.regionId } : {}),
    ...(e.rechner === "flaechencheck" && ein.nutzung ? { nutzung: ein.nutzung } : {}),
    bericht: {
      rechner: e.rechner,
      pruefId: e.pruefId,
      stand: e.stand,
      kennzahlen: (e.ergebnis?.kennzahlen || []).slice(0, 12).map((k) => `${k.label}: ${k.wert}${k.zusatz ? ` (${k.zusatz})` : ""}`),
    },
    eingaben: ein,
  };
}

/** POST /api/rechner/bericht/bestaetigen { token } */
export async function berichtBestaetigen({ token, ip = "" }, deps) {
  const hash = tokenHash(token);
  if (!hash) throw new PlattformFehler(404, "Dieser Link ist ungültig.", "nicht_gefunden");
  const d = standard(deps);
  const start = await d.bericht.berichtBestaetigungBeginnen({ tokenHash: hash, jetztMs: d.jetzt().getTime() });
  if (!start || start.zustand === null) throw new PlattformFehler(404, "Dieser Link ist ungültig.", "nicht_gefunden");
  if (start.zustand === "abgelaufen") throw new PlattformFehler(410, "Dieser Link ist abgelaufen. Bitte fordern Sie den Bericht im Rechner neu an.", "abgelaufen");
  if (start.zustand === "bestaetigt") return { ok: true, bereits: true };
  if (start.zustand === "in_bestaetigung") throw new PlattformFehler(409, "Die Bestätigung läuft bereits – bitte laden Sie die Seite in einem Moment neu.", "konflikt");
  const e = start.eintrag;
  try {
    await d.kette.protokollAnhaengen({
      email: e.kontakt.email,
      art: "doi",
      zweck: "bericht",
      textId: DOI.textId,
      textVersion: BERICHT_TEXT_VERSION,
      textHash: sha256(DOI.text),
      kanal: "doi_link",
      land: e.land,
    });
    const anfrage = await d.anfrage.anfrageAnlegen({
      typ: RECHNER[e.rechner].vorgangTyp,
      kontakt: { ...e.kontakt, land: e.land },
      daten: vorgangDaten(e),
      herkunft: { kanal: e.kanal || "Direkt" },
      ip,
      einwilligungText: ANFORDERUNG.hinweis,
      hinweis: { id: "hinweis_bericht", version: BERICHT_TEXT_VERSION, rechtsgrundlage: "Art. 6 Abs. 1 lit. b DSGVO", textHash: sha256(ANFORDERUNG.hinweis) },
      einwilligungen: Array.isArray(e.einwilligungen) ? e.einwilligungen : [],
      nutzer: null,
    });
    await d.bericht.berichtBestaetigungAbschliessen({ tokenHash: hash, vorgangId: anfrage.id, ablauf: berichtBis(d.jetzt()), jetztMs: d.jetzt().getTime() });
    berichtZaehlen({ rechner: e.rechner, land: e.land, ereignis: "bestaetigt" });
    return { ok: true, bereits: false };
  } catch (err) {
    await d.bericht.berichtBestaetigungZuruecksetzen({ tokenHash: hash }).catch(() => {});
    berichtZaehlen({ rechner: e.rechner, land: e.land, ereignis: "abgelehnt" });
    throw err;
  }
}

/** Für die Seite /bericht/[token] und GET der Bestätigungs-API: { zustand, bericht? } – nie Personendaten */
export async function berichtLesen({ token }, deps) {
  const hash = tokenHash(token);
  if (!hash) return { zustand: null };
  const d = { bericht: deps?.bericht || berichtBackend(), jetzt: deps?.jetzt || (() => new Date()) };
  return d.bericht.berichtLesen({ tokenHash: hash, jetztMs: d.jetzt().getTime() });
}
