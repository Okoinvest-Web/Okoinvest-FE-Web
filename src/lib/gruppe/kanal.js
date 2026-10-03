// src/lib/gruppe/kanal.js
//
// Serverseitige Bereinigung der Herkunft für den Gruppen- und Partnerkanal (Welle 2, Paket GRP).
//
// SCHNITTSTELLENVERTRAG für B3 (Lead-Kette, src/app/api/anfrage/route.js):
//
//   import { herkunftBereinigen } from "@/lib/gruppe/kanal";
//   const { kanal, partnerKennung } = herkunftBereinigen(body.herkunft);
//   // → beim Vorgang speichern: herkunft = { ...herkunft, kanal, partnerKennung }
//
//  - `kanal` wird auf dem Server NEU berechnet (src/lib/herkunft.js → kanal()); der vom Browser gemeldete Kanal
//    wird ignoriert. Werte: siehe KANAELE.
//  - `partnerKennung` ist nur gesetzt, wenn utm_source eine im Register WIRKSAME Kennung ist und deren Art zum
//    Kanal passt (gruppe ↔ „Gruppe“, sonst ↔ „Partner“). Im Produktionsmodus greifen nur Einträge mit status
//    "aktiv"; Entwürfe und unbekannte Kennungen werden verworfen (partnerKennung = null).
//  - Wer utm_medium=partner|gruppe ohne gültige Kennung mitschickt, landet bei „Kampagne“ – damit lässt sich der
//    Partnerkanal nicht durch beliebige Links aufblähen. Ein echter Verweis von oekovolt.de/.com (Referrer) bleibt
//    „Gruppe“, auch ohne Kennung.
//  - Keine Personendaten, kein Cookie, kein Versand, keine Provisions- oder Vergütungslogik.
//
// Reine Funktion ohne I/O – auch in Tests und im Demo-Backend nutzbar.

import { kanal as kanalBerechnen } from "../herkunft.js";
import { kanalFuerArt, kennungFinden } from "./partner-register.js";

/** Alle Kanäle, die kanal() liefern kann (inkl. Gruppe/Partner) – z. B. für Frappe-Auswahlfelder. */
export const KANAELE = ["Anzeige", "Social Media", "E-Mail", "Offline/QR", "Kampagne", "Suchmaschine", "KI-Assistent", "Gruppe", "Partner", "Verweis", "Direkt"];

const FELDER = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "referrer", "klick_id_typ"];
const text = (v) => (typeof v === "string" ? v.slice(0, 200) : "");

/**
 * herkunft (vom Browser, untrusted) → { kanal, partnerKennung | null }
 * `optionen.produktion` / `optionen.register` nur für Tests.
 */
export function herkunftBereinigen(herkunft, optionen = {}) {
  const h = herkunft && typeof herkunft === "object" && !Array.isArray(herkunft) ? herkunft : {};
  const sauber = Object.fromEntries(FELDER.map((f) => [f, text(h[f])]).filter(([, v]) => v));
  const kanal = kanalBerechnen(sauber);
  if (kanal !== "Gruppe" && kanal !== "Partner") return { kanal, partnerKennung: null };

  const eintrag = kennungFinden((sauber.utm_source || "").replace(/^www\./i, ""), optionen);
  if (eintrag && kanalFuerArt(eintrag.art) === kanal) return { kanal, partnerKennung: eintrag.kennung };

  // Ohne gültige Kennung: echter Gruppen-Verweis (Referrer) bleibt „Gruppe“, nur behauptete Kanäle fallen zurück.
  if (kanalBerechnen({ referrer: sauber.referrer }) === "Gruppe") return { kanal: "Gruppe", partnerKennung: null };
  return { kanal: "Kampagne", partnerKennung: null };
}

/**
 * Daten für den Offenlegungs-Hinweis (src/components/Gruppe/Offenlegung.js) aus der Browser-Herkunft – oder null,
 * wenn der Besuch nicht über einen Gruppen- oder Partnerverweis kam. Gleiche Regeln wie herkunftBereinigen():
 * nur wirksame Kennungen nennen einen Namen; ein echter Gruppen-Verweis ohne Kennung zeigt den Gruppen-Hinweis.
 * Rückgabe: { kanal, kennung|null, art|null, land|null, name|null, text|null }
 */
export function offenlegungDaten(herkunft, optionen = {}) {
  const { kanal, partnerKennung } = herkunftBereinigen(herkunft, optionen);
  if (kanal !== "Gruppe" && kanal !== "Partner") return null;
  const e = partnerKennung ? kennungFinden(partnerKennung, optionen) : null;
  return { kanal, kennung: e?.kennung || null, art: e?.art || null, land: e?.land || null, name: e?.name || null, text: e?.offenlegung || null };
}

const LAND_OHNE = "–";

/**
 * Auswertung Leads je Gruppen-/Partnerkanal und Kennung je Land – OHNE Personendaten (nur Zählwerte).
 * vorgaenge: [{ status, erstelltAm, land, herkunft }] (herkunft wie beim Vorgang gespeichert).
 * Gespeicherte `herkunft.partnerKennung` (ab Anbindung B3) hat Vorrang; ältere Vorgänge werden nachträglich mit
 * herkunftBereinigen() eingeordnet. Gezählt werden nur die Kanäle „Gruppe“ und „Partner“, dazu die Gesamtzahl.
 */
export function kanalAuswertung(vorgaenge = [], optionen = {}) {
  const leerLaender = () => ({ DE: 0, AT: 0, CH: 0, [LAND_OHNE]: 0 });
  const kanaele = { Gruppe: { kanal: "Gruppe", anfragen: 0, abgeschlossen: 0, laender: leerLaender() }, Partner: { kanal: "Partner", anfragen: 0, abgeschlossen: 0, laender: leerLaender() } };
  const kennungen = new Map();
  let gesamt = 0;
  for (const vg of Array.isArray(vorgaenge) ? vorgaenge : []) {
    if (!vg || typeof vg !== "object") continue;
    gesamt++;
    const h = vg.herkunft && typeof vg.herkunft === "object" ? vg.herkunft : {};
    const gespeichert = typeof h.partnerKennung === "string" && h.partnerKennung && (h.kanal === "Gruppe" || h.kanal === "Partner");
    const { kanal, partnerKennung } = gespeichert ? { kanal: h.kanal, partnerKennung: h.partnerKennung } : herkunftBereinigen(h, optionen);
    if (!kanaele[kanal]) continue;
    const land = ["DE", "AT", "CH"].includes(vg.land) ? vg.land : LAND_OHNE;
    const fertig = vg.status === "abgeschlossen";
    const k = kanaele[kanal];
    k.anfragen++;
    k.laender[land]++;
    if (fertig) k.abgeschlossen++;
    const schluessel = partnerKennung || `ohne-kennung:${kanal}`;
    const e = kennungen.get(schluessel) || { kennung: partnerKennung || null, kanal, anfragen: 0, abgeschlossen: 0, laender: leerLaender() };
    e.anfragen++;
    e.laender[land]++;
    if (fertig) e.abgeschlossen++;
    kennungen.set(schluessel, e);
  }
  const zeilen = [...kennungen.values()]
    .map((e) => {
      const r = e.kennung ? kennungFinden(e.kennung, optionen) : null;
      return { ...e, art: r?.art || null, registerLand: r?.land || null, registerStatus: r ? r.status : e.kennung ? "nicht im Register" : null };
    })
    .sort((a, b) => b.anfragen - a.anfragen || String(a.kennung).localeCompare(String(b.kennung)));
  return { gesamt, kanaele: [kanaele.Gruppe, kanaele.Partner], kennungen: zeilen, laender: ["DE", "AT", "CH", LAND_OHNE] };
}
