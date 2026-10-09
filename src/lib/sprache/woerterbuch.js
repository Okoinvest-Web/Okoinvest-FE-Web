// src/lib/sprache/woerterbuch.js – Übersetzungs-Schnittstelle (für die Übersetzer-Teams)
//
// Grundsatz: Eine Seite, ein Design. Sprachen unterscheiden sich nur in Texten – nie in Layout,
// Komponenten, Bildern oder Zahlen. Jede Seite bzw. Komponente führt ihr Wörterbuch selbst:
//
//   const TEXTE = {
//     de: { titel: "Fläche prüfen", liste: [{ k: "Lage", icon: MapPin }, { k: "Netz", icon: Cable }] },
//     en: { titel: "Check your land", liste: [{ k: "Location" }, { k: "Grid" }] },
//   };
//
// 1) Sprache holen
//    Server-Seite:      const land = await seitenLand(params);  const sprache = spracheDerAnfrage();
//                       (src/lib/land/seite.js – seitenLand() liest params.sprache mit)
//    Server-Baustein:   const sprache = spracheDerAnfrage();
//    Client-Baustein:   const sprache = useSprache();      // src/components/Sprache/SpracheKontext.js
//
// 2) Texte
//    const t = uebersetze(TEXTE, sprache);     // Server und Client
//    const t = useTexte(TEXTE);                // Client-Kurzform (src/components/Sprache/SpracheKontext.js)
//    Regeln (getestet in woerterbuch.test.mjs):
//      - "de" ist Pflicht und vollständig. Fehlt "en" oder ein Schlüssel darin → deutscher Text.
//      - Objekte werden TIEF zusammengeführt: "en" enthält nur Texte; Icons, hrefs, Bilder und
//        Zahlen kommen aus "de".
//      - Listen werden je Index zusammengeführt (Länge = deutsche Liste). Eine englische Liste
//        mit anderer Länge → als Funktion angeben: en: { liste: (de) => [...] }.
//      - Funktionen in "en" bekommen den deutschen Wert und geben den englischen zurück.
//      - React-Elemente, Strings und Zahlen ersetzen den deutschen Wert.
//
// 3) Länder UND Sprache
//    const t = inhaltFuerSprache({ de: { gemeinsam, AT, CH }, en: { gemeinsam, AT? } }, land, sprache);
//    Gibt es deutschen Länderinhalt (de.AT), aber noch keine englische Fassung (en.AT), bleibt der
//    deutsche Länderinhalt stehen – nie der englische Text der gemeinsamen Seite mit deutschen
//    Werten (Leitplanke „keine falschen Länderinhalte“).
//
// 4) Zahlen: fmtZahl(n, stellen, sprache) – "de" 1.234,5 · "en" 1,234.5 (src/lib/sprache/format.js)
//
// 5) Freigabe: Eintrag in UEBERSETZT (src/lib/sprache/seiten.js). Danach gelten index, canonical,
//    hreflang "en" und Sitemap automatisch, der Hinweis „not yet available in English“ entfällt.

import { inhaltFuer } from "../land/inhalte.js";
import { landCode } from "../land/laender.js";

const istObjekt = (x) => x !== null && typeof x === "object" && !Array.isArray(x) && !x.$$typeof && Object.getPrototypeOf(x) === Object.prototype;

/** Englischen Wert tief über den deutschen legen (Regeln siehe oben). */
export function zusammenfuehren(de, en) {
  if (en === undefined || en === null) return de;
  if (typeof en === "function" && typeof de !== "function") return en(de);
  if (Array.isArray(de) && Array.isArray(en)) return de.map((d, i) => zusammenfuehren(d, en[i]));
  if (istObjekt(de) && istObjekt(en)) {
    const out = { ...de };
    for (const k of Object.keys(en)) out[k] = Object.hasOwn(de, k) ? zusammenfuehren(de[k], en[k]) : en[k];
    return out;
  }
  return en;
}

/**
 * Texte in der Sprache mit Rückfall auf Deutsch.
 * @template T
 * @param {{ de: T, en?: any }} texte
 * @param {string|null} sprache "de" | "en"
 * @returns {T}
 */
export function uebersetze(texte, sprache) {
  if (!texte || !Object.hasOwn(texte, "de")) throw new Error("uebersetze: Eintrag „de“ fehlt");
  if (sprache !== "en" || !Object.hasOwn(texte, "en")) return texte.de;
  return zusammenfuehren(texte.de, texte.en);
}

/**
 * Länderinhalt UND Sprache.
 * @param {{ de: { gemeinsam: any, DE?: any, AT?: any, CH?: any }, en?: { gemeinsam?: any, DE?: any, AT?: any, CH?: any } }} inhalte
 * @param {string|null} land
 * @param {string|null} sprache
 */
export function inhaltFuerSprache(inhalte, land, sprache) {
  const de = inhaltFuer(inhalte.de, land);
  if (sprache !== "en" || !inhalte.en) return de;
  const l = landCode(land);
  const eigenesLand = l && Object.hasOwn(inhalte.de, l) && inhalte.de[l] !== undefined;
  if (eigenesLand) {
    if (!Object.hasOwn(inhalte.en, l)) return de; // Länderinhalt noch nicht übersetzt → deutsch
    // Schlüssel, die das Land selbst setzt, bekommen NUR die englische Länderfassung – sonst würden
    // Werte der englischen gemeinsamen Fassung (z. B. eine Zahl für Deutschland) den Länderwert überschreiben.
    const deLand = inhalte.de[l];
    const enGemeinsam =
      istObjekt(deLand) && istObjekt(inhalte.en.gemeinsam)
        ? Object.fromEntries(Object.entries(inhalte.en.gemeinsam).filter(([k]) => !Object.hasOwn(deLand, k)))
        : inhalte.en.gemeinsam;
    return zusammenfuehren(de, zusammenfuehren(enGemeinsam ?? {}, inhalte.en[l]));
  }
  return zusammenfuehren(de, inhalte.en.gemeinsam);
}

/**
 * Texte, die im englischen Wörterbuch fehlen (für Tests der Übersetzer-Teams):
 * Jeder String im deutschen Baum braucht einen englischen Wert an derselben Stelle – ausgenommen
 * technische Felder (href, id, slug, bild, src, icon, ton, typ) und Pfade/Adressen ("/…", "#…", "http…").
 * @returns {string[]} Pfade wie "liste.2.text"
 */
const TECHNISCHE_FELDER = new Set(["href", "id", "slug", "bild", "src", "icon", "ton", "typ"]);

export function fehlendeTexte(de, en, pfad = "") {
  if (TECHNISCHE_FELDER.has(String(pfad).split(".").pop())) return [];
  if (typeof de === "string") return /^(\/|#|https?:)/.test(de) || (en !== undefined && en !== null) ? []: [pfad || "(wurzel)"];
  if (typeof en === "function" || typeof de !== "object" || de === null || de.$$typeof) return [];
  if (typeof en === "string" || (en && en.$$typeof)) return [];
  const e = en ?? (Array.isArray(de) ? [] : {});
  const fehlt = [];
  for (const k of Object.keys(de)) fehlt.push(...fehlendeTexte(de[k], e[k], pfad ? `${pfad}.${k}` : String(k)));
  return fehlt;
}
