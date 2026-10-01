// src/lib/plattform/eg/eda/xml.js
//
// Kleiner, sicherer XML-Leser und -Schreiber für EDA-Nachrichten (ohne Abhängigkeiten, Browser/Server/Node-Tests).
// Python-Spiegel: plattform/eg_eda_kern.py (xml_schreiben, xml_lesen) – gleiche Ausgabe Byte für Byte (Testvektoren).
//
// Sicherheit: keine DOCTYPE/Entitäten-Deklarationen (kein XXE, keine Entity-Expansion), Größen- und Tiefenlimit,
// nur die fünf Standard-Entitäten und numerische Zeichenreferenzen. Namensraum-Präfixe werden beim Lesen entfernt
// (lokale Namen), xmlns-Attribute ignoriert. Kein regulärer Ausdruck mit Zeichenklassen (Tailwind-Falle, BRIEFING).

export const XML_MAX_BYTES = 8 * 1024 * 1024;
export const XML_MAX_TIEFE = 40;

export class XmlFehler extends Error {
  constructor(msg) {
    super(msg);
    this.name = "XmlFehler";
  }
}

export function xmlEscape(s) {
  return String(s ?? "").split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split('"').join("&quot;").split("'").join("&apos;");
}

/**
 * Knoten schreiben. Knoten: { name, attrs?: {k: v}, text?: string, kinder?: Knoten[] }. Einrückung zwei Leerzeichen,
 * Zeilenende „\n“, Attribute in angegebener Reihenfolge.
 */
export function xmlSchreiben(knoten, { deklaration = true } = {}) {
  const zeilen = [];
  if (deklaration) zeilen.push('<?xml version="1.0" encoding="UTF-8"?>');
  const schreib = (k, tiefe) => {
    const einr = "  ".repeat(tiefe);
    const attrs = Object.entries(k.attrs || {}).filter(([, v]) => v !== undefined && v !== null).map(([a, v]) => ` ${a}="${xmlEscape(v)}"`).join("");
    const kinder = (k.kinder || []).filter(Boolean);
    if (kinder.length) {
      zeilen.push(`${einr}<${k.name}${attrs}>`);
      for (const c of kinder) schreib(c, tiefe + 1);
      zeilen.push(`${einr}</${k.name}>`);
    } else if (k.text !== undefined && k.text !== null && String(k.text) !== "") {
      zeilen.push(`${einr}<${k.name}${attrs}>${xmlEscape(k.text)}</${k.name}>`);
    } else {
      zeilen.push(`${einr}<${k.name}${attrs}/>`);
    }
  };
  schreib(knoten, 0);
  return `${zeilen.join("\n")}\n`;
}

// Klammern als Unicode-Escape (Tailwind-Falle)
const CDATA_AUF = "<!\u005BCDATA\u005B";
const CDATA_ZU = "\u005D\u005D>";

const lokal = (n) => {
  const i = n.indexOf(":");
  return i >= 0 ? n.slice(i + 1) : n;
};
const istLeer = (c) => c === " " || c === "\n" || c === "\r" || c === "\t";
const istNamensZeichen = (c) => {
  const k = c.charCodeAt(0);
  return (k >= 48 && k <= 57) || (k >= 65 && k <= 90) || (k >= 97 && k <= 122) || c === "_" || c === "-" || c === "." || c === ":" || k > 127;
};

function entitaeten(s) {
  if (s.indexOf("&") < 0) return s;
  let aus = "";
  let i = 0;
  while (i < s.length) {
    const amp = s.indexOf("&", i);
    if (amp < 0) {
      aus += s.slice(i);
      break;
    }
    aus += s.slice(i, amp);
    const semi = s.indexOf(";", amp);
    if (semi < 0 || semi - amp > 10) throw new XmlFehler("Ungültige Zeichenreferenz.");
    const e = s.slice(amp + 1, semi);
    const fest = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[e];
    if (fest !== undefined) aus += fest;
    else if (e.startsWith("#x") || e.startsWith("#X")) aus += String.fromCodePoint(parseInt(e.slice(2), 16));
    else if (e.startsWith("#")) aus += String.fromCodePoint(parseInt(e.slice(1), 10));
    else throw new XmlFehler(`Unbekannte Entität „${e}“.`);
    i = semi + 1;
  }
  return aus;
}

/**
 * XML lesen → Wurzelknoten { name (lokal), attrs, kinder[], text }. Wirft XmlFehler bei ungültigem Aufbau.
 */
export function xmlLesen(xml) {
  const s = String(xml ?? "");
  if (!s.trim()) throw new XmlFehler("Leere Nachricht.");
  if (s.length > XML_MAX_BYTES) throw new XmlFehler("Nachricht zu groß.");
  let i = 0;
  const stapel = [];
  let wurzel = null;
  const textAn = (t) => {
    if (!stapel.length) {
      if (t.trim()) throw new XmlFehler("Text außerhalb des Wurzelelements.");
      return;
    }
    stapel[stapel.length - 1]._text += t;
  };
  while (i < s.length) {
    const lt = s.indexOf("<", i);
    if (lt < 0) {
      textAn(s.slice(i));
      break;
    }
    if (lt > i) textAn(s.slice(i, lt));
    if (s.startsWith("<?", lt)) {
      const e = s.indexOf("?>", lt);
      if (e < 0) throw new XmlFehler("Verarbeitungsanweisung nicht geschlossen.");
      i = e + 2;
      continue;
    }
    if (s.startsWith("<!--", lt)) {
      const e = s.indexOf("-->", lt);
      if (e < 0) throw new XmlFehler("Kommentar nicht geschlossen.");
      i = e + 3;
      continue;
    }
    if (s.startsWith(CDATA_AUF, lt)) {
      const e = s.indexOf(CDATA_ZU, lt);
      if (e < 0) throw new XmlFehler("CDATA nicht geschlossen.");
      textAn(s.slice(lt + 9, e));
      i = e + 3;
      continue;
    }
    if (s.startsWith("<!", lt)) throw new XmlFehler("DOCTYPE und Deklarationen sind nicht erlaubt.");
    if (s[lt + 1] === "/") {
      const e = s.indexOf(">", lt);
      if (e < 0) throw new XmlFehler("Endtag nicht geschlossen.");
      const name = lokal(s.slice(lt + 2, e).trim());
      const k = stapel.pop();
      if (!k || k.name !== name) throw new XmlFehler(`Endtag „${name}“ passt nicht.`);
      k.text = entitaeten(k._text).trim();
      delete k._text;
      i = e + 1;
      continue;
    }
    // Starttag
    let j = lt + 1;
    while (j < s.length && istNamensZeichen(s[j])) j++;
    const roh = s.slice(lt + 1, j);
    if (!roh) throw new XmlFehler("Ungültiger Elementname.");
    const k = { name: lokal(roh), attrs: {}, kinder: [], text: "", _text: "" };
    let zu = false;
    for (;;) {
      while (j < s.length && istLeer(s[j])) j++;
      if (j >= s.length) throw new XmlFehler("Starttag nicht geschlossen.");
      if (s[j] === ">") {
        j++;
        break;
      }
      if (s[j] === "/" && s[j + 1] === ">") {
        zu = true;
        j += 2;
        break;
      }
      const a0 = j;
      while (j < s.length && istNamensZeichen(s[j])) j++;
      const an = s.slice(a0, j);
      if (!an) throw new XmlFehler("Ungültiges Attribut.");
      while (j < s.length && istLeer(s[j])) j++;
      if (s[j] !== "=") throw new XmlFehler("Attribut ohne Wert.");
      j++;
      while (j < s.length && istLeer(s[j])) j++;
      const q = s[j];
      if (q !== '"' && q !== "'") throw new XmlFehler("Attributwert ohne Anführungszeichen.");
      const e = s.indexOf(q, j + 1);
      if (e < 0) throw new XmlFehler("Attributwert nicht geschlossen.");
      if (!an.startsWith("xmlns")) k.attrs[lokal(an)] = entitaeten(s.slice(j + 1, e));
      j = e + 1;
    }
    if (stapel.length) stapel[stapel.length - 1].kinder.push(k);
    else if (wurzel) throw new XmlFehler("Mehr als ein Wurzelelement.");
    else wurzel = k;
    if (zu) {
      delete k._text;
    } else {
      stapel.push(k);
      if (stapel.length > XML_MAX_TIEFE) throw new XmlFehler("Verschachtelung zu tief.");
    }
    i = j;
  }
  if (stapel.length) throw new XmlFehler(`Element „${stapel[stapel.length - 1].name}“ nicht geschlossen.`);
  if (!wurzel) throw new XmlFehler("Kein Wurzelelement.");
  return wurzel;
}

/** Erstes Kind mit Namen (lokal) */
export const kind = (k, name) => (k?.kinder || []).find((c) => c.name === name) || null;
/** Alle Kinder mit Namen */
export const kinderMit = (k, name) => (k?.kinder || []).filter((c) => c.name === name);
/** Text des Kindes (oder "") */
export const kindText = (k, name) => kind(k, name)?.text ?? "";
