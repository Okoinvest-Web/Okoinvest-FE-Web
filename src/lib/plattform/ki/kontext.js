// src/lib/plattform/ki/kontext.js
//
// Kontext-Bauer je Anwendungsfall. Grundregel: ERST Rechte prüfen, DANN Kontext zusammenstellen.
// Alle Daten kommen ausschließlich über die Backend-Operationen im Namen des angemeldeten Nutzers
// (b.projekt, b.vorgang, b.flaeche, b.boerseDetail, b.nachrichten …) – diese prüfen Rolle UND
// Eigentum selbst (Demo und Frappe). Was der Nutzer dort nicht sehen darf, kann nie in einen Prompt
// gelangen. Zusätzlich gilt je Fall eine Positivliste der Felder (Datensparsamkeit: z. B. keine
// E-Mail, Telefonnummer oder IP-Adresse im Prompt).
//
// PII-Schwärzung (Paket B, Welle 1): Alle Freitexte (Beschreibungen, Angaben, Nachrichtenverläufe, Kommentare)
// laufen vor dem Prompt durch schwaerzen(): E-Mail-Adressen, Telefonnummern und IBANs werden ersetzt.
// Grenze: Namen in Freitexten werden NICHT erkannt; Telefonnummern ohne führende 0/+ und ohne Stichwort
// („Tel.“, „Mobil“ …) ebenfalls nicht. Der Schalter unten ist deshalb Standard AUS.
//
// KI-Triage-Schalter: Die Triage verarbeitet Anfragen Dritter (Name, Ort, Freitexte). Bis Drittland-Übermittlung
// und Datenschutzerklärung zum KI-Dienst geklärt sind (Strang R), ist sie im KI-Modus gesperrt.
// Freischalten nur mit KI_TRIAGE=an (Umgebungsvariable). Ohne aktiven KI-Dienst (kein Schlüssel, KI_AUS=1)
// bleibt der regelbasierte Vorschlag wie bisher nutzbar – dabei verlässt nichts den Server.
//
// Rückgabe: { objektArt, objektId, daten: {…}, quellen: [{ id, titel, text }], meta: {…} }

import { PlattformFehler } from "../fehler";
import { FLAECHE_NUTZUNG, LAENDER, NETZANSCHLUSS, PROJEKT_TYPEN, VORGANG_TYPEN, BEZUG_ARTEN, BEZUG_LABEL } from "../konstanten";
import { PROZESSE, statusInfo } from "../prozesse";
import { VERTRAULICH_FELDER } from "../oeffentlich";
import { checklisteFlaeche } from "../checkliste";
import { datum, feldLabel, preisText, wertText } from "../format";
import { phaseById } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { kiAktiv } from "./konfig";

const KENNUNG = /^[A-Za-z0-9][A-Za-z0-9_-]{2,60}$/;

export function kennungPruefen(id, was = "Objekt") {
  const s = String(id || "").trim();
  if (!KENNUNG.test(s)) throw new PlattformFehler(422, `${was} fehlt oder ist ungültig.`);
  return s;
}

// ------------------------------------------------------------------ PII-Schwärzung

const E_MAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/gu;
const IBAN = /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]){11,30}\b/gi;
// Telefon: beginnt mit +, 00 oder 0 und hat danach mindestens 7 Ziffern (Trenner: Leerzeichen / - . ( ))
const TELEFON = /(?<![\p{L}\p{N}])(?:\+|00|0)(?:[\s/.()-]*\d){7,}/gu;
// Telefon nach Stichwort, auch ohne führende 0 („Tel. 664 1234567“, „erreichbar unter 1234 5678“)
const TELEFON_STICHWORT = /((?:tel(?:efon)?|phone|mobil|handy|fax|whats ?app|erreichbar unter|rufnummer)\.?:?\s*)\+?\d(?:[\s/.()-]*\d){5,}/giu;
const DATUM = /^\d{1,2}\.\d{1,2}\.\d{2,4}$/;

/** E-Mail-Adressen, Telefonnummern und IBANs in einem Freitext ersetzen (exportiert für Tests). */
export function schwaerzen(text) {
  return String(text ?? "")
    .replace(E_MAIL, "[E-Mail entfernt]")
    .replace(IBAN, (m) => (/\d{8,}/.test(m.replace(/\s/g, "")) ? "[IBAN entfernt]" : m))
    .replace(TELEFON_STICHWORT, (_, vor) => `${vor}[Telefon entfernt]`)
    .replace(TELEFON, (m) => (DATUM.test(m.trim()) ? m : "[Telefon entfernt]"));
}

/** Darf die Triage im KI-Modus laufen? Nur mit KI_TRIAGE=an (Standard: aus). */
export function kiTriageFreigegeben() {
  return String(process.env.KI_TRIAGE || "").trim().toLowerCase() === "an";
}

/** Feldnamen, deren Inhalt grundsätzlich nicht in einen Prompt gehört */
const PII_FELD = /mail|telefon|phone|^tel$|mobil|handy|fax|iban|bic|^ip$|ipadresse|geburt|ausweis|steuer.?id|passwort|token/i;

const kurzText = (s, max) => {
  const t = schwaerzen(String(s ?? "").replace(/\r/g, "")).trim();
  return t.length > max ? `${t.slice(0, max)} …` : t;
};

const nichtLeer = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length)));

// ------------------------------------------------------------------ Exposé (Anbieter/Admin)

/** Vertrauliche Felder, die als Einordnung dienen dürfen – nie Ortsbezug (Gemeinde, Flurstücke, Netzbetreiber, Einspeisepunkt) */
const EXPOSE_VERTRAULICH_EINORDNUNG = ["sicherung", "planungsrecht", "ertragKwhKwp", "entfernungNetzKm", "verguetung"];

export async function kontextExpose(b, n, { projektId }) {
  const id = kennungPruefen(projektId, "Projekt");
  const p = await b.projekt(n, id); // 404/403 bei fremdem Projekt (Backend prüft Eigentum)
  const phase = p.phase ? phaseById(p.phase) : null;
  const vt = p.vertraulich || {};
  const erfuellt = (p.checkliste?.punkte || []).filter((x) => x.erwartet && x.vorhanden).map((x) => x.label);
  const offen = (p.checkliste?.punkte || []).filter((x) => x.erwartet && x.pflicht && !x.vorhanden).map((x) => x.label);
  return {
    objektArt: "projekt",
    objektId: p.id,
    daten: nichtLeer({
      projekttyp: PROJEKT_TYPEN[p.typ],
      land: LAENDER[p.land],
      bundeslandOderKanton: p.bundesland,
      regionGrob: p.region,
      leistungMwp: p.mwp,
      speicherMwh: p.mwhSpeicher,
      flaecheHa: p.flaecheHa,
      phase: phase?.label,
      typischesRisikoDerPhase: phase?.risiko,
      netzanschluss: NETZANSCHLUSS[p.netzanschluss],
      inbetriebnahmeGeplant: p.codGeplant,
      preisindikation: preisText(p),
      bisherigeBeschreibung: kurzText(p.beschreibung, 4000),
      bisherigeHighlights: (p.highlights || []).map((h) => kurzText(h, 300)),
      einordnungIntern: nichtLeer(Object.fromEntries(EXPOSE_VERTRAULICH_EINORDNUNG.map((k) => [VERTRAULICH_FELDER[k], vt[k]]))),
      unterlagenVorhanden: erfuellt,
      unterlagenFehlend: offen,
      datenraumQualitaetProzent: p.checkliste?.quote,
    }),
    quellen: [],
    meta: { projekt: p },
  };
}

// ------------------------------------------------------------------ Triage (Backoffice)

// nurRegel: Aufruf aus ki/index.js im Regelmodus (Schalter aus) – der Kontext geht dann nicht an den KI-Dienst.
export async function kontextTriage(b, n, { vorgangId }, { nurRegel = false } = {}) {
  if (!nurRegel && kiAktiv() && !kiTriageFreigegeben()) {
    throw new PlattformFehler(
      403,
      "Die KI-Triage ist abgeschaltet, bis der Datenschutz beim KI-Dienst geklärt ist. Bitte die Anfrage manuell sichten.",
      "ki_triage_aus"
    );
  }
  const id = kennungPruefen(vorgangId, "Vorgang");
  const v = await b.vorgang(n, id);
  const thread = await b.nachrichten(n, "vorgang", id, { markieren: false });
  const k = v.kontakt || {};
  const zusatz = Object.entries(v.daten || {})
    .filter(([key, x]) => x !== "" && x !== null && x !== undefined && !PII_FELD.test(key))
    .map(([key, x]) => [feldLabel(key), kurzText(wertText(x), 1500)]);
  const nachrichten = (thread?.nachrichten || [])
    .filter((m) => !m.system)
    .slice(-10)
    .map((m) => ({ von: m.vonAdmin ? "Backoffice" : "Anfragende Person", am: datum(m.am), text: kurzText(m.text, 1500) }));
  return {
    objektArt: "vorgang",
    objektId: v.id,
    daten: nichtLeer({
      vorgangsnummer: v.id,
      typ: VORGANG_TYPEN[v.typ] || v.typ,
      typSchluessel: v.typ,
      status: statusInfo("vorgang", v.status).label,
      eingegangenAm: datum(v.erstelltAm),
      kontakt: nichtLeer({
        anrede: k.anrede,
        vorname: k.vorname,
        nachname: k.nachname,
        unternehmen: k.firma,
        ort: [k.plz, k.ort].filter(Boolean).join(" "),
        land: LAENDER[k.land],
        telefonAngegeben: k.telefon ? "ja" : "nein",
        kontoVorhanden: v.nutzer ? "ja" : "nein",
      }),
      angaben: Object.fromEntries(zusatz),
      nachrichten,
    }),
    quellen: [],
    meta: { vorgang: v, nachrichten: thread?.nachrichten || [] },
  };
}

// ------------------------------------------------------------------ Frag das Projekt (Investor mit Datenraum)

export async function kontextFrage(b, n, { projektId }) {
  const id = kennungPruefen(projektId, "Projekt");
  const d = await b.boerseDetail(n, id, { zaehlen: false });
  // Rechteprüfung VOR dem Zusammenstellen: nur mit freigegebenem Datenraum (NDA), als Anbieter oder Backoffice
  if (!d || !["nda", "eigentuemer", "admin"].includes(d.zugriff)) {
    throw new PlattformFehler(403, "„Frag das Projekt“ steht nach Freigabe Ihres Datenraums (NDA) zur Verfügung.", "verboten");
  }
  const p = d.projekt || {};
  const phase = p.phase ? phaseById(p.phase) : null;
  const quellen = [];
  const q = (titel, text) => {
    const t = String(text ?? "").trim();
    if (!t) return;
    quellen.push({ id: `Q${quellen.length + 1}`, titel, text: kurzText(t, 3000) });
  };
  q(
    "Projektsteckbrief",
    [
      ["Projekttyp", PROJEKT_TYPEN[p.typ]],
      ["Land", LAENDER[p.land]],
      ["Bundesland/Kanton", p.bundesland],
      ["Region", p.region],
      ["Leistung", p.mwp ? `${fmt(p.mwp, 1)} MWp` : ""],
      ["Speicher", p.mwhSpeicher ? `${fmt(p.mwhSpeicher)} MWh` : ""],
      ["Fläche", p.flaecheHa ? `${fmt(p.flaecheHa, 1)} ha` : ""],
      ["Phase", phase?.label],
      ["Netzanschluss", NETZANSCHLUSS[p.netzanschluss]],
      ["Geplante Inbetriebnahme", p.codGeplant],
      ["Preisindikation", preisText(p)],
      ["Datenraum-Qualität", typeof p.datenraumQualitaet === "number" ? `${p.datenraumQualitaet} %` : ""],
    ]
      .filter(([, w]) => w)
      .map(([l, w]) => `${l}: ${w}`)
      .join("\n")
  );
  q("Exposé – Beschreibung", p.beschreibung);
  if (p.highlights?.length) q("Exposé – Highlights", p.highlights.map((h) => `- ${h}`).join("\n"));
  for (const [k, label] of Object.entries(VERTRAULICH_FELDER)) {
    const w = d.vertraulich?.[k];
    if (w !== undefined && w !== null && w !== "") q(`Vertrauliche Angabe – ${label}`, String(w));
  }
  const doks = (d.dokumente || []).slice(0, 60);
  if (doks.length) {
    q(
      "Datenraum – Dokumentenliste (nur Metadaten, Inhalte liegen nicht vor)",
      doks.map((x) => `- ${x.name} · Kategorie ${x.kategorie}${x.checkliste ? ` · Checklistenpunkt ${x.checkliste}` : ""} · hochgeladen ${datum(x.am)}`).join("\n")
    );
  }
  if (phase) q("ÖkoInvest-Marktdaten zur Phase (allgemein, nicht projektspezifisch)", `Übliche Preisspanne „${phase.label}“: ${fmt(phase.preisProKwp.min)}–${fmt(phase.preisProKwp.max)} €/kWp · typisches Risiko: ${phase.risiko}`);
  return { objektArt: "projekt", objektId: p.id, daten: { projekttitel: p.titel }, quellen, meta: { zugriff: d.zugriff, projekt: p, interesseId: d.interesse?.id || null } };
}

// ------------------------------------------------------------------ Flächen-Assistent (Eigentümer/Landwirt)

/** Was nach dem aktuellen Status passiert – in einfacher Sprache */
export const NAECHSTER_SCHRITT_FLAECHE = {
  entwurf: "Sobald Sie die Angaben vervollständigt und eingereicht haben, prüfen wir Ihre Fläche.",
  eingegangen: "Wir starten die Vorprüfung: Größe, Lage, Schutzgebiete und Planungsrecht.",
  vorpruefung: "Passt die Fläche grundsätzlich, folgt die Standortanalyse mit Netzanschluss, Ertrag und Genehmigungsfähigkeit. Danach erhalten Sie ein konkretes Pachtangebot im Portal.",
  standortanalyse: "Nach der Detailprüfung erhalten Sie ein konkretes Pachtangebot im Portal.",
  pachtangebot: "Nehmen Sie das Angebot an, bereiten wir den Pachtvertrag vor. Rückfragen können Sie vorher per Nachricht stellen.",
  vertrag: "Nach Vertragsabschluss starten Bauleitplanung bzw. Genehmigung und die Anfrage beim Netzbetreiber.",
  planung: "Liegen Genehmigung und Netzanschluss vor, folgt der Bau der Anlage.",
  bau: "Nach der Fertigstellung geht die Anlage in Betrieb.",
  betrieb: "Die Anlage läuft; die Pacht wird gemäß Vertrag gezahlt.",
  abgelehnt: "Bei Fragen zur Begründung schreiben Sie uns gern eine Nachricht.",
};

export function naechsteSchritteFlaeche(f) {
  return NAECHSTER_SCHRITT_FLAECHE[f.status] || "";
}

export async function kontextFlaeche(b, n, { flaecheId }) {
  const id = kennungPruefen(flaecheId, "Fläche");
  const f = await b.flaeche(n, id);
  const cl = f.checkliste || checklisteFlaeche(f, []);
  const s = statusInfo("flaeche", f.status);
  const pa = f.pachtangebot;
  const verlauf = (f.statusVerlauf || []).slice(-3).map((e) => nichtLeer({ status: statusInfo("flaeche", e.status).label, am: datum(e.am), kommentar: kurzText(e.kommentar, 600) }));
  return {
    objektArt: "flaeche",
    objektId: f.id,
    daten: nichtLeer({
      bezeichnung: kurzText(f.bezeichnung, 200),
      land: LAENDER[f.land],
      bundeslandOderKanton: f.bundesland,
      groesseHa: f.ha,
      nutzung: FLAECHE_NUTZUNG[f.nutzung],
      agriPvGewuenscht: f.agri ? "ja" : "nein",
      statusAktuell: s.label,
      statusErklaerung: s.text,
      ablehnungsgrund: f.status === "abgelehnt" ? kurzText(f.ablehnGrund, 1000) : "",
      schrittImAblauf: PROZESSE.flaeche.pipeline.includes(f.status) ? `${PROZESSE.flaeche.pipeline.indexOf(f.status) + 1} von ${PROZESSE.flaeche.pipeline.length}` : "",
      wieEsWeitergeht: naechsteSchritteFlaeche(f),
      pachtangebot: pa ? nichtLeer({ euroProHaUndJahr: pa.euroProHaJahr, laufzeitJahre: pa.laufzeitJahre, verlaengerung: pa.verlaengerung, erlaeuterung: kurzText(pa.text, 1500), vom: datum(pa.am) }) : null,
      fehlendeUnterlagen: (cl.punkte || []).filter((x) => x.erwartet && x.pflicht && !x.vorhanden).map((x) => `${x.label} – ${x.text}`),
      letzteSchritte: verlauf,
    }),
    quellen: [],
    meta: { flaeche: f, checkliste: cl },
  };
}

// ------------------------------------------------------------------ Nachrichten-Entwurf (alle Threads)

export async function kontextNachricht(b, n, { bezugArt, bezugId }) {
  if (!BEZUG_ARTEN.includes(bezugArt)) throw new PlattformFehler(422, "Unbekannter Bezug.");
  const id = kennungPruefen(bezugId, "Bezug");
  const t = await b.nachrichten(n, bezugArt, id, { markieren: false }); // prüft Eigentum/Admin
  const admin = !!n.rollen?.includes("admin");
  // Backoffice-Konten schreiben in fremden Threads als „ÖkoInvest Backoffice“ (wie nachrichtSenden)
  const alsBackoffice = admin && !(bezugArt === "nutzer" && id === n.id);
  const verlauf = (t.nachrichten || [])
    .slice(-12)
    .map((m) => ({ von: m.system ? "System" : m.eigene ? "Ich" : m.vonAdmin ? "ÖkoInvest Backoffice" : m.vonName || "Gegenüber", am: datum(m.am), text: kurzText(m.text, 1200) }));
  return {
    objektArt: bezugArt,
    objektId: id,
    daten: nichtLeer({
      thema: kurzText(t.titel, 200) || BEZUG_LABEL[bezugArt],
      bezugsart: BEZUG_LABEL[bezugArt],
      ichSchreibeAls: alsBackoffice ? "ÖkoInvest Backoffice" : "Kundin/Kunde der Plattform an das ÖkoInvest-Backoffice",
      meinName: [n.vorname, n.nachname].filter(Boolean).join(" "),
      gegenueber: alsBackoffice ? t.gegenueber : "ÖkoInvest Backoffice",
      verlauf,
    }),
    quellen: [],
    meta: { alsBackoffice, gegenueber: alsBackoffice ? t.gegenueber : "", nachrichten: t.nachrichten || [], meinName: [n.vorname, n.nachname].filter(Boolean).join(" ") },
  };
}
