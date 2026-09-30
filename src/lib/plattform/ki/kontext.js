// src/lib/plattform/ki/kontext.js
//
// Kontext-Bauer je Anwendungsfall. Grundregel: ERST Rechte prüfen, DANN Kontext zusammenstellen.
// Alle Daten kommen ausschließlich über die Backend-Operationen im Namen des angemeldeten Nutzers
// (b.projekt, b.vorgang, b.flaeche, b.boerseDetail, b.nachrichten …) – diese prüfen Rolle UND
// Eigentum selbst (Demo und Frappe). Was der Nutzer dort nicht sehen darf, kann nie in einen Prompt
// gelangen. Zusätzlich gilt je Fall eine Positivliste der Felder (Datensparsamkeit: z. B. keine
// E-Mail, Telefonnummer oder IP-Adresse im Prompt).
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

const KENNUNG = /^[A-Za-z0-9][A-Za-z0-9_-]{2,60}$/;

export function kennungPruefen(id, was = "Objekt") {
  const s = String(id || "").trim();
  if (!KENNUNG.test(s)) throw new PlattformFehler(422, `${was} fehlt oder ist ungültig.`);
  return s;
}

const kurzText = (s, max) => {
  const t = String(s ?? "").replace(/\r/g, "").trim();
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
      bisherigeHighlights: p.highlights,
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

export async function kontextTriage(b, n, { vorgangId }) {
  const id = kennungPruefen(vorgangId, "Vorgang");
  const v = await b.vorgang(n, id);
  const thread = await b.nachrichten(n, "vorgang", id, { markieren: false });
  const k = v.kontakt || {};
  const zusatz = Object.entries(v.daten || {})
    .filter(([, x]) => x !== "" && x !== null && x !== undefined)
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
      bezeichnung: f.bezeichnung,
      land: LAENDER[f.land],
      bundeslandOderKanton: f.bundesland,
      groesseHa: f.ha,
      nutzung: FLAECHE_NUTZUNG[f.nutzung],
      agriPvGewuenscht: f.agri ? "ja" : "nein",
      statusAktuell: s.label,
      statusErklaerung: s.text,
      ablehnungsgrund: f.status === "abgelehnt" ? f.ablehnGrund : "",
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
      thema: t.titel || BEZUG_LABEL[bezugArt],
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
