// src/lib/plattform/crm.js
//
// CRM des Backoffice: Stammlisten (Rollen, Organisationsarten, Aktivitätstypen) und
// Dubletten-Erkennung (E-Mail, Name + PLZ, Name + Organisation, Telefon). Reine Funktionen.

export const KONTAKT_ROLLEN = {
  eigentuemer: "Flächeneigentümer",
  landwirt: "Landwirt",
  investor: "Investor",
  anbieter: "Projektentwickler / Anbieter",
  unternehmen: "Unternehmen",
  mitglied: "Mitglied / Bürger",
  gemeinde: "Gemeinde / Kommune",
  netzbetreiber: "Netzbetreiber",
  gutachter: "Gutachter / Planer",
  bank: "Bank / Finanzierung",
  behoerde: "Behörde",
  berater: "Berater (Recht, Steuer)",
  sonstige: "Sonstige",
};

export const ORG_ARTEN = {
  gemeinde: "Gemeinde / Kommune",
  netzbetreiber: "Netzbetreiber",
  gutachter: "Gutachter / Planungsbüro",
  bank: "Bank / Finanzierer",
  investor: "Investor",
  entwickler: "Projektentwickler",
  unternehmen: "Unternehmen",
  landwirtschaft: "Landwirtschaftlicher Betrieb",
  behoerde: "Behörde",
  verband: "Verband / Genossenschaft",
  sonstige: "Sonstige",
  stadtwerk: "Stadtwerk / kommunales Unternehmen", // Fachprüfung Kommunen
};

export const AKTIVITAET_TYPEN = {
  anruf: "Anruf",
  termin: "Termin",
  email: "E-Mail",
  notiz: "Notiz",
};

export const BEZUG_ROLLEN = ["Anfragender", "Eigentümer", "Ansprechpartner", "Gemeinde", "Netzbetreiber", "Gutachter", "Finanzierer", "Investor", "Anbieter", "Sonstige"];

/** CRM-Rolle je Anfragetyp (Lead aus /api/anfrage) */
export const CRM_ROLLE_FUER_TYP = {
  flaeche: "eigentuemer",
  agri: "landwirt",
  investor: "investor",
  projekt: "anbieter",
  reststrom: "unternehmen",
  carport: "unternehmen",
  speicher: "unternehmen",
  kommune: "gemeinde",
  genossenschaft: "mitglied",
  energiegemeinschaft: "mitglied",
  kontakt: "sonstige",
};

/** CRM-Rolle je Portal-Rolle */
export const CRM_ROLLE_FUER_KONTO = { flaeche: "eigentuemer", landwirt: "landwirt", investor: "investor", anbieter: "anbieter", unternehmen: "unternehmen", mitglied: "mitglied", kommune: "gemeinde" };

// ------------------------------------------------------------ Normalisierung

export function normText(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\((demo|fiktiv)\)/g, " ")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(dr|prof|dipl|ing|herr|frau)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
export const normEmail = (e) => String(e || "").trim().toLowerCase();
export const normTelefon = (t) => {
  const z = String(t || "").replace(/\D/g, "");
  return z.length >= 7 ? z.slice(-9) : "";
};
export const normName = (k) => normText(`${k?.vorname || ""} ${k?.nachname || ""}`);
export const normPlz = (p) => String(p || "").replace(/\D/g, "");

/**
 * Ähnlichkeit zweier Kontakte. Liefert { score, gruende } – score 0 = keine Dublette.
 * 100 gleiche E-Mail · 85 Name + PLZ · 75 Name + Organisation/Firma · 70 Telefon · 60 Nachname + PLZ + Initiale
 */
export function dublettenScore(a, b, orgName = () => "") {
  const gruende = [];
  let score = 0;
  const ea = normEmail(a.email);
  if (ea && ea === normEmail(b.email)) {
    score = 100;
    gruende.push("gleiche E-Mail-Adresse");
  }
  const na = normName(a);
  const gleicherName = na.length >= 5 && na === normName(b);
  const pa = normPlz(a.plz);
  if (gleicherName && pa && pa === normPlz(b.plz)) {
    score = Math.max(score, 85);
    gruende.push("gleicher Name und gleiche PLZ");
  }
  const oa = normText(a.firma || orgName(a.organisationId));
  if (gleicherName && oa && oa === normText(b.firma || orgName(b.organisationId))) {
    score = Math.max(score, 75);
    gruende.push("gleicher Name und gleiche Organisation");
  }
  const ta = normTelefon(a.telefon);
  if (ta && ta === normTelefon(b.telefon)) {
    score = Math.max(score, 70);
    gruende.push("gleiche Telefonnummer");
  }
  const nnA = normText(a.nachname);
  if (!gleicherName && nnA.length >= 3 && nnA === normText(b.nachname) && pa && pa === normPlz(b.plz) && normText(a.vorname)[0] && normText(a.vorname)[0] === normText(b.vorname)[0]) {
    score = Math.max(score, 60);
    gruende.push("gleicher Nachname, Initiale und PLZ");
  }
  return { score, gruende };
}

/** Alle Dubletten-Paare (score ≥ schwelle), bestes zuerst. O(n²) – für einige Tausend Kontakte ausreichend. */
export function dublettenFinden(kontakte, { schwelle = 60, orgName } = {}) {
  const paare = [];
  // Vorsortierung über Schlüssel, damit nicht jede Kombination voll verglichen wird
  const gruppen = new Map();
  const add = (schluessel, k) => {
    if (!schluessel) return;
    if (!gruppen.has(schluessel)) gruppen.set(schluessel, []);
    gruppen.get(schluessel).push(k);
  };
  for (const k of kontakte) {
    add(`e:${normEmail(k.email)}`, k);
    add(normText(k.nachname).length >= 3 ? `n:${normText(k.nachname)}` : "", k);
    add(normTelefon(k.telefon) ? `t:${normTelefon(k.telefon)}` : "", k);
  }
  const gesehen = new Set();
  for (const [schluessel, liste] of gruppen) {
    if (schluessel === "e:" || liste.length < 2) continue;
    for (let i = 0; i < liste.length; i++) {
      for (let j = i + 1; j < liste.length; j++) {
        const [a, b] = [liste[i], liste[j]];
        const id = [a.id, b.id].sort().join("|");
        if (gesehen.has(id)) continue;
        gesehen.add(id);
        const r = dublettenScore(a, b, orgName);
        if (r.score >= schwelle) paare.push({ a, b, ...r });
      }
    }
  }
  return paare.sort((x, y) => y.score - x.score);
}
