// src/lib/plattform/akquise-kampagne.js
//
// Akquise-Kampagnen (Backoffice, Ausbaustufe A1b): reine Funktionen und Stammlisten für Client und Server.
//   Kampagne  = Kandidatenmenge aus der Akquise-Karte (Auswahl, Filter oder Gemeinde) → Zielflächen
//   Ziel      = Kandidatenfläche mit Eigentümer-Ermittlung (Grundbuch-Aufgabe je Ziel, Ergebnis manuell) und Empfängern
//   Empfänger = ermittelte Eigentümerin bzw. ermittelter Eigentümer mit Einmalcode für /angebot/[code], Briefen,
//               Rücklauf (Aufrufe, Anfrage, Termin), Einwilligungen und Nachfassstufen
//   Sperrliste = Widerspruch → nie wieder anschreiben, über alle Kampagnen (Person UND Flurstücke)
// Python-Gegenstück: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/akquise_kampagne_kern.py (gleiche Regeln).
//
// Rechtlicher Rahmen (Details docs/AKQUISE-GEODATEN.md Abschnitt 10; keine Rechtsberatung):
//  - Erstkontakt nur per BRIEF (Art. 6 Abs. 1 lit. f DSGVO, Informationspflicht Art. 14, Widerspruch Art. 21).
//  - Telefon nur mit vorheriger ausdrücklicher Einwilligung (DE § 7 Abs. 2 Nr. 1 UWG, AT § 174 TKG 2021), E-Mail ebenso.
//  - Österreich: DSB hält eine EINMALIGE Zusendung für zulässig → zweiter Brief standardmäßig aus.

import { PACHT } from "../invest/markt.js";

export const KAMPAGNE_STATUS = { entwurf: "Entwurf", aktiv: "Aktiv", abgeschlossen: "Abgeschlossen" };
export const ZIEL_STATUS = {
  offen: "Eigentümer offen",
  grundbuch: "Grundbuchabfrage läuft",
  ermittelt: "Eigentümer ermittelt",
  angeschrieben: "Angeschrieben",
  reaktion: "Reaktion",
  termin: "Termin vereinbart",
  gesichert: "Gesichert",
  abgelehnt: "Kein Interesse",
  gesperrt: "Gesperrt (Widerspruch)",
};
export const EMPFAENGER_STATUS = { neu: "Noch nicht angeschrieben", angeschrieben: "Angeschrieben", reaktion: "Reaktion", termin: "Termin", gesichert: "Gesichert", abgelehnt: "Kein Interesse", widerspruch: "Widerspruch (gesperrt)" };
export const SPERR_GRUENDE = { widerspruch: "Widerspruch (Art. 21 DSGVO)", kein_interesse: "Dauerhaft kein Interesse", verstorben: "Verstorben / Nachlass", sonstiges: "Sonstiges" };
export const SPERR_QUELLEN = { online: "Online (Angebotsseite)", brief: "Brief", telefon: "Telefon", email: "E-Mail", persoenlich: "Persönlich" };
export const QUELLE_ART = { auswahl: "Kartenauswahl", filter: "Filter", gemeinde: "Gemeinde" };

/**
 * Kosten der Eigentümer-Ermittlung je Grundbuchblatt bzw. Auszug (Schätzung, vor Einsatz prüfen):
 *  DE: Abruf bzw. unbeglaubigter Ausdruck aus dem Grundbuch ca. 8–10 € je Blatt (JVKostG/GNotKG – Gebührennummern vor Einsatz prüfen);
 *      Einsicht nur mit berechtigtem Interesse (§ 12 GBO; für Solarprojektierer ab 750 kW in der Regel § 43a GBV)
 *  AT: Grundbuchauszug 4,89 € Gerichtsgebühr + Entgelt der Verrechnungsstelle (Annahme ≈ 2,60 €)
 *  CH: Eigentümerauskunft nach Art. 970 Abs. 2 ZGB je Kanton meist kostenlos online; Auszug mit Gebühr (Annahme 20 CHF)
 */
export const GRUNDBUCH_KOSTEN = {
  DE: { jeAbfrage: 10, waehrung: "EUR", text: "Grundbuchausdruck bzw. Abruf ca. 8–10 € je Blatt (Schätzung, Gebühren vor Einsatz prüfen)" },
  AT: { jeAbfrage: 7.5, waehrung: "EUR", text: "Grundbuchauszug 4,89 € Gerichtsgebühr + Entgelt Verrechnungsstelle (Annahme)" },
  CH: { jeAbfrage: 20, waehrung: "CHF", text: "Eigentümerauskunft (Art. 970 ZGB) meist kostenlos, Auszug je Kanton mit Gebühr (Annahme)" },
};

/** Versandkosten je Brief (Annahmen, in der Kampagne überschreibbar): Porto Standardbrief + Druck/Kuvertierung */
export const VERSAND_KOSTEN = {
  DE: { porto: 0.95, druck: 0.35 },
  AT: { porto: 0.95, druck: 0.35 },
  CH: { porto: 1.2, druck: 0.35 },
};

/** Nachfassstufen (Automationsregeln der Kampagne): nach X Tagen ohne Reaktion eine Aufgabe */
export const NACHFASS_ARTEN = {
  zweiter_brief: { label: "Zweiter Brief (einmalig)", text: "Nach X Tagen ohne Reaktion: Aufgabe „Zweiten Brief senden“. Nicht bei Widerspruch, nie mehr als zwei Briefe. Österreich: standardmäßig aus (DSB: einmalige Zusendung)." },
  anruf_einwilligung: { label: "Anruf nur mit Einwilligung", text: "Nach X Tagen ohne Reaktion: Aufgabe „Anruf“ – NUR wenn eine ausdrückliche Einwilligung für Telefon vorliegt, sonst übersprungen (UWG/TKG)." },
};

export function nachfassStandard(land = "DE") {
  return [
    { id: "s1", art: "zweiter_brief", nachTagen: 28, aktiv: land !== "AT" },
    { id: "s2", art: "anruf_einwilligung", nachTagen: 42, aktiv: true },
  ];
}

/** Nachfassstufen bereinigen (max. 4, 7–180 Tage, bekannte Arten) */
export function nachfassBereinigen(liste, land = "DE") {
  if (!Array.isArray(liste)) return nachfassStandard(land);
  return liste
    .slice(0, 4)
    .map((s, i) => ({ id: /^s\d$/.test(s?.id) ? s.id : `s${i + 1}`, art: NACHFASS_ARTEN[s?.art] ? s.art : null, nachTagen: Math.max(7, Math.min(180, Math.round(Number(s?.nachTagen) || 28))), aktiv: s?.aktiv !== false }))
    .filter((s) => s.art);
}

// ---------------------------------------------------------------- Einmalcode

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // ohne 0/O/1/I
export const CODE_LAENGE = 10; // 32^10 ≈ 1,1 · 10^15 (50 Bit) – zusätzlich Rate-Limit je IP

/** Zufälliger Einmalcode (Web Crypto – Browser und Node ≥ 19) */
export function codeErzeugen(zufall = globalThis.crypto) {
  const b = new Uint8Array(CODE_LAENGE);
  zufall.getRandomValues(b);
  let s = "";
  for (let i = 0; i < CODE_LAENGE; i++) s += CODE_ALPHABET[b[i] % CODE_ALPHABET.length];
  return s;
}

/** Eingabe normalisieren (Groß, ohne Leer-/Bindestriche, 0→O? nein: ungültige Zeichen → ungültig) */
export function codeNormalisieren(s) {
  const c = String(s || "").toUpperCase().replace(/[\s-]/g, "");
  return c.length === CODE_LAENGE && [...c].every((z) => CODE_ALPHABET.includes(z)) ? c : "";
}

/** Druckform „ABCDE-FGHJK“ */
export const codeLesbar = (c) => (c ? `${c.slice(0, 5)}-${c.slice(5)}` : "");

// ---------------------------------------------------------------- Sperrliste (Schlüssel, ohne Klartext zu speichern)

export function normText(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(str\.|strasse)\b/g, "str")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Personen-Schlüssel (vor dem Hashen): Name bzw. Firma + PLZ. Die Straße zählt bewusst NICHT (Schreibweisen „Str.“/
 * „Straße 5a“ …) – lieber einmal zu viel gesperrt als ein Widerspruch übersehen. Gleiche Person → gleicher Schlüssel.
 */
export function personSchluessel({ vorname = "", nachname = "", firma = "", plz = "" } = {}) {
  const name = firma && !nachname ? normText(firma) : `${normText(nachname)}|${normText(vorname)}`;
  return `p|${name}|${String(plz || "").replace(/\s/g, "").toUpperCase()}`;
}

/** Flurstücks-Schlüssel (Land, Gemarkung/KG-Nummer, Flurstücks-/Grundstücksnummer) */
export const flurstueckSchluessel = (land, kgNr, gstNr) => `f|${land || ""}|${String(kgNr || "").trim()}|${String(gstNr || "").trim()}`;

/** Anzeige einer gesperrten Person ohne Klartext-Namen: „M. M***, 87787“ */
export function personMaskiert({ vorname = "", nachname = "", firma = "", plz = "" } = {}) {
  const n = firma && !nachname ? firma : nachname;
  return `${vorname ? `${vorname[0]}. ` : ""}${n ? `${n[0]}***` : "***"}${plz ? `, ${plz}` : ""}`;
}

// ---------------------------------------------------------------- Kosten, Pacht, Kennzahlen

/** Grundbuch-Kostenschätzung für ein Ziel: je Flurstück eine Abfrage (konservativ – mehrere Flurstücke auf einem Blatt sind günstiger) */
export function grundbuchSchaetzung(land, anzahlFlurstuecke) {
  const k = GRUNDBUCH_KOSTEN[land] || GRUNDBUCH_KOSTEN.DE;
  const n = Math.max(1, Number(anzahlFlurstuecke) || 1);
  return { anzahl: n, jeAbfrage: k.jeAbfrage, betrag: Math.round(n * k.jeAbfrage * 100) / 100, waehrung: k.waehrung, text: k.text };
}

/** Unverbindliche Pachtspanne je ha und Jahr nach Ampel (grün: obere Hälfte, gelb: untere Hälfte) */
export function pachtspanne(ha, ampel = "gelb") {
  const p = PACHT.freiflaecheProHa;
  const [min, max] = ampel === "gruen" ? [p.mittel, p.max] : [p.min, p.mittel];
  const h = Number(ha) || 0;
  return { proHaMin: min, proHaMax: max, jahrMin: Math.round((h * min) / 100) * 100, jahrMax: Math.round((h * max) / 100) * 100 };
}

const tageZwischen = (a, b) => Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400e3);

/** Hat der Empfänger reagiert (Anfrage, Termin, Widerspruch, Rückmeldung per Brief/Telefon)? Ein bloßer Seitenaufruf zählt nicht. */
export const hatReagiert = (e) => !!(e.anfragen?.length || e.termine?.length || e.widerspruchAm || e.rueckmeldungAm || ["reaktion", "termin", "gesichert", "abgelehnt", "widerspruch"].includes(e.status));

/**
 * Fällige Nachfassstufen eines Empfängers: [{ stufe, ergebnis: "aufgabe" | "uebersprungen", grund }].
 * Bedingungen: Kampagne aktiv, Erstbrief versandt, keine Reaktion, nicht gesperrt, Stufe noch nicht erledigt, Frist erreicht.
 */
export function nachfassFaellig(kampagne, empfaenger, heute = new Date().toISOString()) {
  if (kampagne?.status !== "aktiv" || !empfaenger) return [];
  const erst = (empfaenger.briefe || []).find((b) => b.nr === 1);
  if (!erst || empfaenger.gesperrt || hatReagiert(empfaenger)) return [];
  const tage = tageZwischen(erst.am, heute);
  const erledigt = empfaenger.nachfass || {};
  const out = [];
  for (const s of kampagne.nachfass || []) {
    if (!s.aktiv || erledigt[s.id] || tage < s.nachTagen) continue;
    if (s.art === "zweiter_brief") {
      if ((empfaenger.briefe || []).length >= 2) out.push({ stufe: s, ergebnis: "uebersprungen", grund: "Bereits zwei Briefe versandt." });
      else out.push({ stufe: s, ergebnis: "aufgabe", grund: "" });
    } else if (s.art === "anruf_einwilligung") {
      if (empfaenger.einwilligungTelefon?.am) out.push({ stufe: s, ergebnis: "aufgabe", grund: "" });
      else out.push({ stufe: s, ergebnis: "uebersprungen", grund: "Keine Einwilligung für Telefon – kein Anruf (UWG/TKG). Nur Brief möglich." });
    }
  }
  return out;
}

/**
 * Kennzahlen einer Kampagne aus Zielen/Empfängern:
 * Ziele, Flurstücke, ha/MWp, Briefe, Aufrufe (Empfänger mit ≥ 1 Aufruf und Summe), Anfragen, Termine, Widersprüche,
 * gesicherte ha, Kosten (Grundbuch Ist + Versand + sonstige) und Kosten je gesichertem ha, Rücklaufquote.
 */
export function kampagnenKennzahlen(kampagne, ziele = []) {
  const land = kampagne?.land || "DE";
  const vk = { ...(VERSAND_KOSTEN[land] || VERSAND_KOSTEN.DE), ...(kampagne?.kosten || {}) };
  const empf = ziele.flatMap((z) => z.empfaenger || []);
  const briefe = empf.reduce((s, e) => s + (e.briefe || []).length, 0);
  const aufrufeSumme = empf.reduce((s, e) => s + (Number(e.aufrufe) || 0), 0);
  const mitAufruf = empf.filter((e) => Number(e.aufrufe) > 0).length;
  const anfragen = empf.reduce((s, e) => s + (e.anfragen || []).length, 0);
  const termine = empf.reduce((s, e) => s + (e.termine || []).length, 0);
  const widersprueche = empf.filter((e) => e.widerspruchAm).length;
  const gesichertHa = Math.round(ziele.reduce((s, z) => s + (z.status === "gesichert" ? Number(z.gesichertHa ?? z.ha) || 0 : 0), 0) * 100) / 100;
  const grundbuch = ziele.reduce((s, z) => s + (Number(z.grundbuch?.kostenIst) || 0), 0);
  const grundbuchPlan = ziele.reduce((s, z) => s + (Number(z.grundbuch?.schaetzung?.betrag) || 0), 0);
  const versand = Math.round(briefe * ((Number(vk.porto) || 0) + (Number(vk.druck) || 0)) * 100) / 100;
  const sonstige = Number(kampagne?.kosten?.sonstige) || 0;
  const kosten = Math.round((grundbuch + versand + sonstige) * 100) / 100;
  return {
    ziele: ziele.length,
    flurstuecke: ziele.reduce((s, z) => s + (z.parzellen || []).length, 0),
    ha: Math.round(ziele.reduce((s, z) => s + (Number(z.ha) || 0), 0) * 10) / 10,
    mwp: Math.round(ziele.reduce((s, z) => s + (Number(z.mwp) || 0), 0) * 10) / 10,
    empfaenger: empf.length,
    gesperrt: empf.filter((e) => e.gesperrt).length,
    briefe,
    aufrufe: aufrufeSumme,
    empfaengerMitAufruf: mitAufruf,
    anfragen,
    termine,
    widersprueche,
    gesichertHa,
    kosten: { grundbuch: Math.round(grundbuch * 100) / 100, grundbuchPlan: Math.round(grundbuchPlan * 100) / 100, versand, sonstige, summe: kosten, waehrung: (GRUNDBUCH_KOSTEN[land] || GRUNDBUCH_KOSTEN.DE).waehrung },
    kostenJeHa: gesichertHa > 0 ? Math.round(kosten / gesichertHa) : null,
    ruecklaufQuote: briefe ? Math.round(((anfragen + termine) / Math.max(1, empf.filter((e) => (e.briefe || []).length).length)) * 1000) / 10 : null,
    aufrufQuote: briefe ? Math.round((mitAufruf / Math.max(1, empf.filter((e) => (e.briefe || []).length).length)) * 1000) / 10 : null,
  };
}
