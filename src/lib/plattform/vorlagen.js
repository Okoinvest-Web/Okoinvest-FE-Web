// src/lib/plattform/vorlagen.js
//
// E-Mail- und Nachrichtenvorlagen mit Platzhaltern wie {{vorname}} oder {{flaeche.ha}}.
// Reine Funktionen (Client + Server): Platzhalterliste, Rendern, Prüfen.
//
// Sicherheit: Vorlagen sind reiner Text (kein HTML, React escaped die Ausgabe; der Postausgang
// zeigt Text). Platzhalter lesen nur aus dem vom Server gebauten Kontext – vertrauliche
// Projektfelder (Gemeinde, Flurstücke, Netzbetreiber …) stehen dort nie zur Verfügung.

export const VORLAGE_KANAELE = { email: "E-Mail", nachricht: "Portal-Nachricht" };

/** Verfügbare Platzhalter (Schlüssel → Beschreibung, Beispielwert) */
export const PLATZHALTER = [
  { gruppe: "Kontakt", schluessel: "anrede", text: "Anrede (Herr/Frau, sonst leer)", beispiel: "Frau" },
  { gruppe: "Kontakt", schluessel: "briefanrede", text: "Vollständige Briefanrede", beispiel: "Sehr geehrte Frau Musterfrau" },
  { gruppe: "Kontakt", schluessel: "vorname", text: "Vorname", beispiel: "Erika" },
  { gruppe: "Kontakt", schluessel: "nachname", text: "Nachname", beispiel: "Musterfrau" },
  { gruppe: "Kontakt", schluessel: "firma", text: "Firma / Organisation", beispiel: "Demo-Hof GbR" },
  { gruppe: "Kontakt", schluessel: "email", text: "E-Mail-Adresse", beispiel: "erika@example.com" },
  { gruppe: "Kontakt", schluessel: "ort", text: "Ort", beispiel: "Demo-Ort" },
  { gruppe: "Vorgang", schluessel: "vorgang.id", text: "Vorgangsnummer", beispiel: "V-26-ABC123" },
  { gruppe: "Vorgang", schluessel: "vorgang.typ", text: "Art der Anfrage", beispiel: "Fläche verpachten" },
  { gruppe: "Vorgang", schluessel: "vorgang.status", text: "Status (Bezeichnung)", beispiel: "In Prüfung" },
  { gruppe: "Fläche", schluessel: "flaeche.bezeichnung", text: "Bezeichnung der Fläche", beispiel: "Acker am Mühlweg" },
  { gruppe: "Fläche", schluessel: "flaeche.ha", text: "Größe in Hektar", beispiel: "18,5" },
  { gruppe: "Fläche", schluessel: "flaeche.ort", text: "Ort der Fläche", beispiel: "Demo-Ort" },
  { gruppe: "Fläche", schluessel: "flaeche.bundesland", text: "Bundesland / Kanton", beispiel: "Bayern" },
  { gruppe: "Fläche", schluessel: "flaeche.score", text: "Flächencheck-Score (0–100)", beispiel: "72" },
  { gruppe: "Fläche", schluessel: "flaeche.mwp", text: "Mögliche Leistung (MWp, grob)", beispiel: "16,8" },
  { gruppe: "Fläche", schluessel: "flaeche.status", text: "Status der Fläche", beispiel: "Vorprüfung" },
  { gruppe: "Projekt", schluessel: "projekt.titel", text: "Öffentlicher Projekttitel", beispiel: "Freiflächen-PV 24 MWp in Niederbayern" },
  { gruppe: "Projekt", schluessel: "projekt.mwp", text: "Leistung MWp", beispiel: "24" },
  { gruppe: "Projekt", schluessel: "projekt.phase", text: "Entwicklungsphase", beispiel: "Satzungsbeschluss / Baurecht" },
  { gruppe: "Projekt", schluessel: "projekt.land", text: "Land", beispiel: "Deutschland" },
  { gruppe: "Projekt", schluessel: "projekt.status", text: "Status des Projekts", beispiel: "Veröffentlicht" },
  { gruppe: "Backoffice", schluessel: "zustaendig.name", text: "Name der zuständigen Person", beispiel: "Backoffice Demo" },
  { gruppe: "Backoffice", schluessel: "zustaendig.vorname", text: "Vorname der zuständigen Person", beispiel: "Backoffice" },
  { gruppe: "Allgemein", schluessel: "portal.link", text: "Link ins Portal zum Objekt", beispiel: "https://www.oekoinvest.com/portal" },
  { gruppe: "Allgemein", schluessel: "heute", text: "Heutiges Datum", beispiel: "30.09.2026" },
  // Akquise-Kampagnen (Serienbrief an Flächeneigentümer, nur im Kampagnen-Kontext befüllt)
  { gruppe: "Akquise-Kampagne", schluessel: "kampagne.name", text: "Name der Kampagne (intern)", beispiel: "Unterallgäu A 96 – Herbst 2026" },
  { gruppe: "Akquise-Kampagne", schluessel: "flaeche.gemeinde", text: "Gemeinde der Zielfläche", beispiel: "Türkheim" },
  { gruppe: "Akquise-Kampagne", schluessel: "flaeche.flurstuecke", text: "Flurstücke/Grundstücke des Empfängers", beispiel: "Gemarkung Türkheim, Flst. 1234/5" },
  { gruppe: "Akquise-Kampagne", schluessel: "flaeche.pachtMin", text: "Pachtspanne von (€/ha und Jahr)", beispiel: "2.800" },
  { gruppe: "Akquise-Kampagne", schluessel: "flaeche.pachtMax", text: "Pachtspanne bis (€/ha und Jahr)", beispiel: "4.500" },
  { gruppe: "Akquise-Kampagne", schluessel: "angebot.link", text: "Persönlicher Link zur Angebotsseite (Einmalcode)", beispiel: "https://www.oekoinvest.com/angebot/ABCDE2345F" },
  { gruppe: "Akquise-Kampagne", schluessel: "angebot.code", text: "Einmalcode (lesbar)", beispiel: "ABCDE-2345F" },
];
export const PLATZHALTER_SCHLUESSEL = new Set(PLATZHALTER.map((p) => p.schluessel));

const MUSTER = /\{\{\s*([a-zA-Z][a-zA-Z0-9_.]{0,60})\s*\}\}/g;

function aufloesen(kontext, schluessel) {
  let v = kontext;
  for (const t of schluessel.split(".")) {
    if (v === null || v === undefined || typeof v !== "object" || !Object.prototype.hasOwnProperty.call(v, t)) return undefined;
    v = v[t];
  }
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toLocaleString("de-DE", { maximumFractionDigits: 1 });
  if (typeof v === "object") return undefined;
  return String(v);
}

/** Platzhalter im Text finden */
export function platzhalterIn(text) {
  return [...String(text || "").matchAll(MUSTER)].map((m) => m[1]);
}

/**
 * Text rendern. Liefert { text, unbekannt: [..], leer: [..] }:
 * unbekannt = Platzhalter, die es nicht gibt; leer = bekannte ohne Wert (z. B. keine Fläche am Vorgang).
 */
export function rendern(vorlagenText, kontext = {}) {
  const unbekannt = new Set();
  const leer = new Set();
  const text = String(vorlagenText || "").replace(MUSTER, (_, k) => {
    if (!PLATZHALTER_SCHLUESSEL.has(k)) {
      unbekannt.add(k);
      return "";
    }
    const v = aufloesen(kontext, k);
    if (v === undefined || v === "") {
      leer.add(k);
      return "";
    }
    return v;
  });
  return { text: text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n"), unbekannt: [...unbekannt], leer: [...leer] };
}

/** Beispielkontext für die Vorschau ohne Objekt */
export function beispielKontext() {
  const k = {};
  for (const p of PLATZHALTER) {
    const teile = p.schluessel.split(".");
    let z = k;
    teile.forEach((t, i) => {
      if (i === teile.length - 1) z[t] = p.beispiel;
      else z = z[t] = z[t] || {};
    });
  }
  return k;
}

/** Vorlage prüfen (Server): Pflichtfelder, unbekannte Platzhalter → Fehlermeldung oder "" */
export function vorlageFehler({ name, kanal, betreff, text }) {
  if (!name || String(name).trim().length < 3) return "Bitte einen Namen (mind. 3 Zeichen) angeben.";
  if (!VORLAGE_KANAELE[kanal]) return "Unbekannter Kanal.";
  if (kanal === "email" && (!betreff || String(betreff).trim().length < 3)) return "Bitte einen Betreff angeben.";
  if (!text || String(text).trim().length < 10) return "Der Text ist zu kurz (mind. 10 Zeichen).";
  const unbekannt = [...platzhalterIn(betreff), ...platzhalterIn(text)].filter((k) => !PLATZHALTER_SCHLUESSEL.has(k));
  if (unbekannt.length) return `Unbekannte Platzhalter: ${[...new Set(unbekannt)].map((k) => `{{${k}}}`).join(", ")}`;
  return "";
}
