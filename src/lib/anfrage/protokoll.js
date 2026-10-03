// src/lib/anfrage/protokoll.js
//
// Einwilligungsprotokoll der Lead-Kette (Welle 2, Paket B3; Masterplan 5.3 „H6“). NUR SERVERSEITIG (node:crypto).
//
//  - Pseudonym = HMAC-SHA-256(E-Mail normalisiert, Server-Pepper LEAD_PSEUDONYM_PEPPER aus der Umgebung).
//    Ohne Pepper ist das Pseudonym nicht aus einer E-Mail-Liste zurückzurechnen; mit der E-Mail einer Person lässt
//    sich ihr Nachweis aber jederzeit wiederfinden (auch nach Löschung der Personendaten, Art. 17).
//  - Ein Eintrag enthält NUR: id, pseudonym, art, zweck, textId, textVersion, textHash, kanal, land, zeit (+ prevHash,
//    hash). Jedes Feld hat ein festes Muster – Namen, E-Mail, Telefon oder IP passen in kein Feld (eintragErstellen wirft).
//  - Verkettung über die vorhandene Hash-Kette (src/lib/plattform/hashkette.js, verketten/verifyChain): die Felder
//    werden auf die kanonischen Kettenfelder abgebildet (ketteForm), der Hash deckt jedes Feld ab. Append-only.
//  - Kanal-Ampel: werbekanalErlaubt(kette, pseudonym, zweck) liest die Kette. Ohne ausdrückliche Einwilligung bzw. nach
//    Widerruf → false. Newsletter und Bericht erst nach Double-Opt-in (Eintrag art "doi").
//
// Frappe-Spiegel: Backend-Import/…/plattform/api/einwilligung.py (gleiche Felder, gleiche Abbildung, gleicher Hash).

import { createHmac, randomBytes } from "node:crypto";
import { KETTE_START, verketten, verifyChain } from "../plattform/hashkette.js";
import { PlattformFehler } from "../plattform/fehler.js";
import { landNormal } from "./laender.js";

export const PROTOKOLL_ARTEN = Object.freeze(["hinweis", "einwilligung", "widerruf", "doi"]);
/** Werbe-Zwecke (Kanal-Ampel). „anfrage“ gibt es nur für den Hinweis nach Art. 6 Abs. 1 lit. b (keine Einwilligung). */
export const WERBE_ZWECKE = Object.freeze(["werbeanruf", "newsletter", "weitergabe_partner", "bericht"]);
export const PROTOKOLL_ZWECKE = Object.freeze([...WERBE_ZWECKE, "anfrage"]);
export const ZWECK_LABEL = Object.freeze({ werbeanruf: "Werbeanruf", newsletter: "Newsletter/Alarm", weitergabe_partner: "Weitergabe an benannte Partner", bericht: "Bericht per E-Mail", anfrage: "Bearbeitung der Anfrage" });
/** Zwecke, die erst nach Bestätigung per E-Mail (Double-Opt-in) gelten */
export const DOI_ZWECKE = Object.freeze(["newsletter", "bericht"]);
export const PROTOKOLL_KANAELE = Object.freeze(["web_formular", "portal", "doi_link", "abmeldelink", "backoffice", "telefon", "email", "art17_loeschung"]);

/** IPs (gekürzt) werden nach 30 Tagen gelöscht (Masterplan 5.3) */
export const IP_FRIST_TAGE = 30;
/**
 * Aufbewahrung des Minimaldatensatzes (Pseudonym, Textversion/-Hash, Zeit) nach Löschung der Personendaten.
 * TODO Rechtsabteilung: Frist je Land bestätigen. Arbeitswert 5 Jahre nach DE § 7a Abs. 2 UWG (Nachweis der
 * Einwilligung in Telefonwerbung: 5 Jahre ab Erteilung sowie nach jeder Verwendung,
 * https://www.gesetze-im-internet.de/uwg_2004/__7a.html). AT und CH: zu prüfen.
 */
export const NACHWEIS_FRIST_JAHRE = 5;

const HEX64 = /^[0-9a-f]{64}$/;
const TEXT_ID = /^[a-z][a-z0-9_.-]{0,59}$/;
const VERSION = /^[A-Za-z][A-Za-z0-9_.:-]{0,39}$/; // beginnt mit Buchstabe: keine IP, keine Telefonnummer
const ID = /^EP-[0-9A-Z]{10,20}$/;
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const ENTWICKLUNG_PEPPER = "nur-entwicklung-oekoinvest-lead-pseudonym-pepper-2026"; // nie in Produktion (siehe pepper())

/** Server-Pepper aus der Umgebung (mind. 32 Zeichen). Produktion ohne Pepper → 503, Entwicklung → fester Testwert. */
export function pepper(env = process.env) {
  const p = String(env.LEAD_PSEUDONYM_PEPPER || "");
  if (p.length >= 32) return p;
  if (env.NODE_ENV === "production") throw new PlattformFehler(503, "Die Plattform ist nicht vollständig eingerichtet.", "nicht_konfiguriert");
  return ENTWICKLUNG_PEPPER;
}

/** E-Mail normalisieren (Unicode NFC, ohne Leerraum, klein) */
export const emailNormal = (email) => String(email ?? "").normalize("NFC").trim().toLowerCase();

/** Pseudonym einer E-Mail-Adresse (64 Hex-Zeichen). Leere Adresse → Fehler ohne Inhalt. */
export function pseudonym(email, { pepper: p } = {}) {
  const e = emailNormal(email);
  if (!e || !e.includes("@")) throw new PlattformFehler(422, "Für das Protokoll fehlt eine gültige E-Mail-Adresse.");
  return createHmac("sha256", p || pepper()).update(e, "utf8").digest("hex");
}

export function neueEintragId() {
  const b = randomBytes(12);
  return `EP-${Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join("")}`;
}

function pruefen(bedingung, feld) {
  if (!bedingung) throw new PlattformFehler(422, `Protokolleintrag ungültig (${feld}).`);
}

/**
 * Eintragsform: nur die erlaubten Felder, jedes mit festem Muster. Wirft bei Abweichung (ohne den Wert zu nennen).
 * zeit: ISO-Zeitstempel (Standard jetzt). land: DE|AT|CH|unbekannt. textHash darf nur beim Widerruf leer sein.
 */
export function eintragErstellen({ id, pseudonym: ps, art, zweck, textId, textVersion, textHash = "", kanal, land, zeit } = {}) {
  pruefen(typeof ps === "string" && HEX64.test(ps), "pseudonym");
  pruefen(PROTOKOLL_ARTEN.includes(art), "art");
  pruefen(PROTOKOLL_ZWECKE.includes(zweck), "zweck");
  pruefen((art === "hinweis") === (zweck === "anfrage"), "zweck");
  pruefen(typeof textId === "string" && TEXT_ID.test(textId), "textId");
  pruefen(typeof textVersion === "string" && VERSION.test(textVersion), "textVersion");
  pruefen(typeof textHash === "string" && (HEX64.test(textHash) || (art === "widerruf" && textHash === "")), "textHash");
  pruefen(PROTOKOLL_KANAELE.includes(kanal), "kanal");
  const l = land === "unbekannt" ? "unbekannt" : landNormal(land) || "unbekannt";
  const t = zeit === undefined ? new Date() : new Date(zeit);
  pruefen(!Number.isNaN(t.getTime()), "zeit");
  const eid = id === undefined ? neueEintragId() : id;
  pruefen(typeof eid === "string" && ID.test(eid), "id");
  return { id: eid, pseudonym: ps, art, zweck, textId, textVersion, textHash, kanal, land: l, zeit: t.toISOString() };
}

/** Abbildung auf die kanonischen Felder der Hash-Kette (hashkette.js KETTE_FELDER) – jedes Feld fließt in den Hash */
export function ketteForm(e) {
  return {
    id: e.id,
    am: e.zeit,
    nutzerId: "",
    aktion: e.art,
    objektArt: e.zweck,
    objektId: e.pseudonym,
    text: JSON.stringify([e.textId, e.textVersion, e.textHash, e.kanal, e.land]),
    ip: "",
  };
}

const NUR_FELDER = ["id", "pseudonym", "art", "zweck", "textId", "textVersion", "textHash", "kanal", "land", "zeit"];

/**
 * Eintrag an die Kette anhängen (append-only; verändert `kette`). Liefert den gespeicherten Eintrag (mit prevHash/hash).
 * anker: { hash } nach einer Archivierung (wie hashkette.js).
 */
export function anhaengen(kette, eintrag, { anker = null } = {}) {
  const e = eintragErstellen(eintrag); // erneut prüfen: nur bekannte Felder, feste Muster
  const zusatz = Object.keys(eintrag || {}).filter((k) => !NUR_FELDER.includes(k));
  pruefen(zusatz.length === 0, "unbekanntes Feld");
  pruefen(!kette.some((x) => x.id === e.id), "id doppelt");
  const prev = kette.length ? kette[kette.length - 1].hash : anker?.hash || KETTE_START;
  const k = verketten(ketteForm(e), prev);
  e.prevHash = k.prevHash;
  e.hash = k.hash;
  kette.push(e);
  return e;
}

/** Kette prüfen (alle Brüche) – Ergebnis wie verifyChain */
export function protokollPruefen(kette = [], { anker = null } = {}) {
  return verifyChain(kette.map((e) => ({ ...ketteForm(e), prevHash: e.prevHash, hash: e.hash })), { anker, alleFehler: true });
}

/**
 * Kanal-Ampel für ein Pseudonym und einen Werbe-Zweck.
 * → { erlaubt, stand: keine|erteilt|doi_ausstehend|widerrufen, seit, eintragId }
 */
export function kanalAmpel(kette, ps, zweck) {
  let stand = "keine";
  let seit = null;
  let eintragId = null;
  if (!WERBE_ZWECKE.includes(zweck) || typeof ps !== "string" || !HEX64.test(ps)) return { erlaubt: false, stand, seit, eintragId };
  for (const e of kette || []) {
    if (e.pseudonym !== ps || e.zweck !== zweck) continue;
    if (e.art === "einwilligung") stand = DOI_ZWECKE.includes(zweck) ? "doi_ausstehend" : "erteilt";
    else if (e.art === "doi" && stand === "doi_ausstehend") stand = "erteilt";
    else if (e.art === "widerruf") stand = "widerrufen";
    else continue;
    seit = e.zeit;
    eintragId = e.id;
  }
  return { erlaubt: stand === "erteilt", stand, seit, eintragId };
}

export const werbekanalErlaubt = (kette, ps, zweck) => kanalAmpel(kette, ps, zweck).erlaubt;

/** Für Versandstellen: wirft 403, wenn der Werbekanal gesperrt ist (Meldung ohne Personendaten) */
export function werbekanalSicherstellen(kette, ps, zweck) {
  if (!werbekanalErlaubt(kette, ps, zweck)) throw new PlattformFehler(403, `Werbekontakt gesperrt: Es liegt keine gültige Einwilligung für „${ZWECK_LABEL[zweck] || "diesen Zweck"}“ vor.`, "einwilligung_fehlt");
  return true;
}

/** IP kürzen: IPv4 → letztes Oktett 0, IPv6 → /48 (erste drei Gruppen). Unbekanntes Format → "" */
export function ipKuerzen(ip) {
  const s = String(ip ?? "").trim();
  const v4 = s.replace(/^::ffff:/i, "").match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) return v4.slice(1, 5).every((x) => Number(x) <= 255) ? `${v4[1]}.${v4[2]}.${v4[3]}.0` : "";
  if (/^[0-9a-f:]+$/i.test(s) && s.includes(":")) {
    const [kopf] = s.split("::");
    const gruppen = kopf.split(":").filter(Boolean);
    const voll = s.includes("::") ? [...gruppen, "0", "0", "0"].slice(0, 3) : s.split(":").slice(0, 3);
    return voll.every((g) => /^[0-9a-f]{1,4}$/i.test(g)) ? `${voll.join(":").toLowerCase()}::` : "";
  }
  return "";
}

/** Zeitpunkt, ab dem die gekürzte IP zu löschen ist */
export const ipLoeschenAb = (zeit = new Date()) => new Date(new Date(zeit).getTime() + IP_FRIST_TAGE * 86400000).toISOString();

/** Ende der Nachweisfrist ab einem Zeitpunkt (TODO Rechtsabteilung, siehe NACHWEIS_FRIST_JAHRE) */
export function nachweisBis(ab = new Date()) {
  const d = new Date(ab);
  d.setUTCFullYear(d.getUTCFullYear() + NACHWEIS_FRIST_JAHRE);
  return d.toISOString();
}
