// src/lib/plattform/dienste/register/basis.js
//
// Registerauskünfte AT/DE/CH – gemeinsame Regeln (client- und serverseitig, keine Node-Importe):
// Register je Land, Nummernformate, Normalisierung von Firmennamen, Ähnlichkeit und Firmennamen-Prüfung
// (Vorprüfung für den Gründungsassistenten – die verbindliche Prüfung machen Firmenbuchgericht, Registergericht/IHK
// bzw. Handelsregisteramt).
// Frappe-Gegenstück: plattform/dienste_kern.py (firmenname_pruefen, name_normalisieren).

export const REGISTER_LAENDER = {
  AT: {
    register: "Firmenbuch",
    behoerde: "Landes- bzw. Handelsgericht (Firmenbuchgericht)",
    nummer: "FN 123456a",
    muster: /^FN\s?\d{1,6}\s?[a-z]$/i,
    abruf: "Firmenbuchauszug über eine Verrechnungsstelle (kostenpflichtig) bzw. Basisdaten über die HVD-Schnittstelle der Justiz",
    ubo: "Register der wirtschaftlichen Eigentümer (WiEReG)",
  },
  DE: {
    register: "Handelsregister",
    behoerde: "Amtsgericht (Registergericht)",
    nummer: "HRB 12345 (Amtsgericht München)",
    muster: /^(HR[AB]|GnR|PR|VR)\s?\d{1,7}(\s?[A-Z]{1,3})?$/i,
    abruf: "handelsregister.de (Abruf kostenfrei seit 01.08.2022), Unternehmensregister",
    ubo: "Transparenzregister",
  },
  CH: {
    register: "Handelsregister (Zefix)",
    behoerde: "Kantonales Handelsregisteramt",
    nummer: "CHE-123.456.789",
    muster: /^CHE-?\d{3}\.?\d{3}\.?\d{3}$/i,
    abruf: "Zefix – zentraler Firmenindex (öffentliche REST-Schnittstelle, Zugang auf Antrag)",
    ubo: "Verzeichnis der wirtschaftlich Berechtigten (Art. 790a OR); Transparenzregister in Vorbereitung",
  },
};

/** Registernummer bereinigen und Format prüfen */
export function registernummerPruefen(land, nummer) {
  const r = REGISTER_LAENDER[land];
  const n = String(nummer || "").trim().replace(/\s+/g, " ");
  if (!r) return { ok: false, nummer: n, fehler: "Unbekanntes Land." };
  if (!n) return { ok: false, nummer: n, fehler: "Bitte geben Sie eine Registernummer an." };
  if (!r.muster.test(n)) return { ok: false, nummer: n, fehler: `Format nicht erkannt – erwartet z. B. „${r.nummer}“.` };
  let norm = n;
  if (land === "AT") norm = n.replace(/^FN\s?(\d+)\s?([a-z])$/i, (_, z, b) => `FN ${z}${b.toLowerCase()}`);
  if (land === "CH") norm = n.replace(/^CHE-?(\d{3})\.?(\d{3})\.?(\d{3})$/i, "CHE-$1.$2.$3");
  if (land === "DE") norm = n.toUpperCase().replace(/^(HR[AB]|GNR|PR|VR)\s?/, (m) => `${m.trim()} `);
  return { ok: true, nummer: norm, fehler: "" };
}

/** UID CH: Prüfziffer (Modulo 11, Gewichte 5 4 3 2 7 6 5 4) – eCH-0097 */
export function uidChPruefen(uid) {
  const z = String(uid || "").replace(/\D/g, "");
  if (z.length !== 9) return false;
  const g = [5, 4, 3, 2, 7, 6, 5, 4];
  const s = g.reduce((a, w, i) => a + w * Number(z[i]), 0);
  let p = 11 - (s % 11);
  if (p === 11) p = 0;
  if (p === 10) return false;
  return p === Number(z[8]);
}

// ---------------------------------------------------------------- Namen

// Rechtsformzusätze als ganze Wörter (nach Normalisierung auf a–z/0–9 und Leerzeichen)
const RECHTSFORM_PHRASEN = [/\bgesellschaft mit beschraenkter haftung\b/g, /\bunternehmergesellschaft\b/g, /\bhaftungsbeschraenkt\b/g, /\bflexible kapitalgesellschaft\b/g, /\bin gruendung\b/g, /\bco kg\b/g];
const RECHTSFORM_WOERTER = new Set(["gmbh", "ug", "ag", "kg", "og", "ohg", "co", "ig", "sarl", "sagl", "ltd", "se", "eg", "eu", "flexco", "mbh"]);

export function firmaNormalisieren(s) {
  let t = String(s || "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/\((demo|fiktiv|test)\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ");
  for (const re of RECHTSFORM_PHRASEN) t = t.replace(re, " ");
  return t.split(" ").filter((w) => w && !RECHTSFORM_WOERTER.has(w)).join(" ");
}

const bigramme = (s) => {
  const t = ` ${s} `;
  const m = new Map();
  for (let i = 0; i < t.length - 1; i++) m.set(t.slice(i, i + 2), (m.get(t.slice(i, i + 2)) || 0) + 1);
  return m;
};

/** Ähnlichkeit 0–1 (Dice-Koeffizient über Buchstabenpaare der normalisierten Namen) */
export function namensAehnlichkeit(a, b) {
  const x = firmaNormalisieren(a);
  const y = firmaNormalisieren(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const A = bigramme(x);
  const B = bigramme(y);
  let schnitt = 0;
  let summe = 0;
  for (const [k, n] of A) {
    schnitt += Math.min(n, B.get(k) || 0);
    summe += n;
  }
  for (const n of B.values()) summe += n;
  return summe ? (2 * schnitt) / summe : 0;
}

/** Pflicht-Rechtsformzusatz je Rechtsform (Kurzprüfung) */
const ZUSATZ = {
  at_gmbh: /\bGmbH\b|Gesellschaft mit beschränkter Haftung/i,
  de_gmbh: /\bGmbH\b|Gesellschaft mit beschränkter Haftung/i,
  de_ug: /UG \(haftungsbeschränkt\)|Unternehmergesellschaft \(haftungsbeschränkt\)/i,
  de_gmbh_co_kg: /GmbH\s?&\s?Co\.?\s?KG/i,
  ch_gmbh: /\bGmbH\b|\bSàrl\b|\bSagl\b|\bSarl\b/i,
};

const IRREFUEHREND = [/\bbank\b/i, /\bsparkasse\b/i, /\bversicherung\b/i, /\bkapitalanlagegesellschaft\b/i, /\binvestmentfonds\b/i, /\bstaatlich\b/i, /\bbundes/i, /\bamt\b/i];

/**
 * Firmennamen-Vorprüfung. treffer: Registertreffer [{ name, nummer, status }] der Suche.
 * Liefert { ergebnis: frei|aehnlich|belegt|unzulaessig, hinweise[], aehnlich[{name,nummer,aehnlichkeit}] }
 */
export function firmennamePruefen(name, rechtsform, treffer = []) {
  const n = String(name || "").trim();
  const hinweise = [];
  if (n.length < 3) return { ergebnis: "unzulaessig", hinweise: ["Bitte geben Sie einen Firmennamen an."], aehnlich: [] };
  if (ZUSATZ[rechtsform] && !ZUSATZ[rechtsform].test(n)) hinweise.push("Der Rechtsformzusatz fehlt oder passt nicht zur gewählten Rechtsform (z. B. „GmbH“ bzw. „GmbH & Co. KG“).");
  if (IRREFUEHREND.some((re) => re.test(n))) hinweise.push("Der Name enthält Begriffe, die in der Regel geschützt sind oder irreführen können (z. B. Bank, Versicherung, amtlich klingende Zusätze).");
  if (firmaNormalisieren(n).length < 3) hinweise.push("Der Name braucht einen unterscheidungskräftigen Bestandteil neben dem Rechtsformzusatz.");
  const aehnlich = treffer
    .map((t) => ({ name: t.name, nummer: t.nummer || "", sitz: t.sitz || "", status: t.status || "", aehnlichkeit: Math.round(namensAehnlichkeit(n, t.name) * 100) / 100 }))
    .filter((t) => t.aehnlichkeit >= 0.6)
    .sort((a, b) => b.aehnlichkeit - a.aehnlichkeit)
    .slice(0, 8);
  let ergebnis = "frei";
  if (aehnlich.some((t) => t.aehnlichkeit >= 0.95 && t.status !== "geloescht")) ergebnis = "belegt";
  else if (aehnlich.length) ergebnis = "aehnlich";
  if (hinweise.length && ergebnis !== "belegt") ergebnis = "unzulaessig"; // unzulässiger Name hat Vorrang vor „ähnlich“
  if (ergebnis === "belegt") hinweise.unshift("Ein gleichlautender Name ist bereits eingetragen – bitte einen anderen Namen wählen.");
  if (ergebnis === "aehnlich") hinweise.unshift("Es gibt ähnliche Namen. Am Sitz muss sich die Firma deutlich unterscheiden (Firmenausschließlichkeit) – Abstimmung mit dem Notariat empfohlen.");
  return { ergebnis, hinweise, aehnlich };
}

export const NAMENSPRUEFUNG_LABEL = {
  frei: { label: "Kein Konflikt gefunden", ton: "ok" },
  aehnlich: { label: "Ähnliche Namen vorhanden", ton: "warn" },
  belegt: { label: "Name bereits vergeben", ton: "warn" },
  unzulaessig: { label: "Name so nicht zulässig", ton: "warn" },
};
