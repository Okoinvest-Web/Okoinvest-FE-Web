// src/lib/eg-angebot/fakten.js – ElWG-Aussagen der EG-Software-Seiten aus dem Faktenregister (Paket B7)
//
// Die Seiten (Preisblatt, Wechsel-Check, White-Label) zeigen Rechts- und Prozessaussagen nur aus
// src/lib/fakten/daten/eg-at.js – mit Quelle, Stand und Prüfstatus. Ein abgelaufener Fakt erscheint nie
// als aktuell, sondern mit „Stand abgelaufen, wird geprüft“ (Masterplan H7).
// Englisch: Das Register bleibt deutsch und maßgeblich; die englischen Anzeigetexte stehen hier je Fakt-id
// (Muster wie src/lib/sprache/faktenEn.js, eigene Datei, damit das Paket keine gemeinsame Datei ändert).

import { fakt } from "../fakten/index.js";
import { HINWEIS_ABGELAUFEN, STATUS_TEXT, anzeigeStatus, datumDe } from "../fakten/schema.js";

export const EG_FAKTEN = Object.freeze({
  elwg: "recht.elwg.gemeinschaftenAb",
  netzgebiet: "recht.elwg.netzbetreiberEinschraenkung",
  ohneNeuanmeldung: "prozess.eda.anbieterwechselOhneNeuanmeldung",
  modellwechsel: "prozess.eda.modellwechselNeuanmeldung",
});

const EN = {
  "recht.elwg.gemeinschaftenAb":
    "The new ElWG rules for sharing energy (§§ 65 to 72 of Austria’s Electricity Industry Act) have applied since 1 October 2026. Existing communities are carried over and do not have to be re-founded; their contracts should be adapted to the new rules.",
  "recht.elwg.netzbetreiberEinschraenkung":
    "Since 5 October 2026, the new models can initially only be set up with metering points of the same grid operator; across grid operators or throughout Austria probably from April 2027.",
  "prozess.eda.anbieterwechselOhneNeuanmeldung":
    "The market partner ID belongs to the community. If only the software or operations provider changes, the metering points stay registered and the members’ consents remain in place; the new provider receives access or a power of attorney, the previous one is removed.",
  "prozess.eda.modellwechselNeuanmeldung":
    "Changing the allocation model or switching between local and regional means a new contract with the grid operator, a new community ID and deregistering and re-registering all metering points – regardless of the software provider.",
};

const STATUS_EN = { geprueft: "checked against the original", zu_pruefen: "review pending", entwurf: "draft", abgelaufen: "outdated, being reviewed" };
const datumEn = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

/**
 * Anzeigedaten eines Fakts (für Server- und – als Props – Client-Komponenten).
 * @returns {{ id, text, quelle, url, stand, status, statusText, abgelaufen } | null}
 */
export function egFakt(schluessel, { sprache = "de", stichtag = new Date() } = {}) {
  const id = EG_FAKTEN[schluessel] || schluessel;
  const f = fakt(id, "AT", { stichtag });
  if (!f) return null;
  const en = sprache === "en";
  const status = anzeigeStatus(f, stichtag);
  const abgelaufen = status === "abgelaufen";
  return {
    id,
    text: abgelaufen ? (en ? "Status outdated, being reviewed." : `${HINWEIS_ABGELAUFEN}.`) : en ? EN[id] || f.wert : f.wert,
    quelle: f.quelle.titel,
    url: f.quelle.url || null,
    stand: en ? datumEn(f.abruf) : datumDe(f.abruf),
    status,
    statusText: en ? STATUS_EN[status] : STATUS_TEXT[status],
    abgelaufen,
  };
}

/** Alle vier Aussagen auf einmal (Schlüssel wie EG_FAKTEN). */
export function egFakten(optionen) {
  return Object.fromEntries(Object.keys(EG_FAKTEN).map((k) => [k, egFakt(k, optionen)]));
}
