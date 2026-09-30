// src/lib/plattform/entwicklung-steuerung.js
//
// Projektentwicklung – Steuerung (reine Funktionen, ohne Node-/Alias-Importe: Browser, Server und Testskripte):
//   Projektampel (Termine, Kosten, Risiken, Flächensicherung, Dokumente) · Pipeline-Bericht MWp je Phase × Land mit
//   Ziel-Abgleich (rund 50 MWp/Jahr) · Kapazitätsplanung der Projektleitungen (Stunden je Monat) · Entscheidungsvorlagen
//   für die Geschäftsführung (Gates, Verwertung Eigenbetrieb/Verkauf/Bau für Investor, SPV, Budget, Abbruch) mit
//   Zustandsautomat und Vier-Augen-Prinzip · Aufgaben aus fälligen Meilensteinen · Grundbuch-Sicherung und Optionsfristen
//   der Projektflächen · Risikokosten (Erwartungswert).
// Frappe-Spiegel: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/entwicklung_steuerung_kern.py (bei Änderungen nachziehen).
//
// Die Planwerte der Kapazitätsplanung und die Wahrscheinlichkeiten der Risikostufen sind INTERNE Planungskonventionen
// (keine Marktzahlen) und im Backoffice je Projektleitung bzw. je Risiko übersteuerbar.

import { ENTWICKLUNG, PHASEN } from "../invest/markt.js";

const TAG = 86400e3;
const tage = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / TAG);
const plusTage = (iso, n) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * TAG).toISOString().slice(0, 10);
const r1 = (x) => Math.round((Number(x) || 0) * 10) / 10;
const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
const de1 = (x) => String(r1(x)).replace(".", ",");
const FERTIG = ["erledigt", "entfaellt"];
export const OFFEN = ["aktiv", "pausiert"];

// ================================================================ Projektampel

export const AMPEL = {
  gruen: { label: "im Plan", ton: "ok" },
  gelb: { label: "beobachten", ton: "info" },
  rot: { label: "kritisch", ton: "warn" },
  grau: { label: "keine Daten", ton: "neutral" },
};
const RANG = { grau: 0, gruen: 1, gelb: 2, rot: 3 };
export const AMPEL_DIMENSIONEN = { termin: "Termine", kosten: "Kosten", risiko: "Risiken", flaeche: "Flächensicherung", dokumente: "Dokumente & Fristen" };

const PHASEN_IDS = PHASEN.map((p) => p.id);
const phaseIndex = (ph) => (ph ? PHASEN_IDS.indexOf(ph) : -1);

/**
 * Ampel je Dimension und gesamt. k: Kennzahlen eines Projekts (projektKurz) + dokumentLuecken (fällige Meilensteine ohne
 * Pflichtdokument) + optionsfristen (Optionen, die in ≤ 60 Tagen ablaufen) + pruefungUeberfaellig (Risiken mit überfälliger Prüfung).
 */
export function projektAmpel(k = {}) {
  // Kennzahlen (projektKurz) oder vollständige Meilensteinliste (Projektdetail) – beides zulässig
  const ms = Array.isArray(k.meilensteine)
    ? { ueberfaellig: k.meilensteine.filter((m) => m.ueberfaellig).length, kritischUeberfaellig: k.meilensteine.filter((m) => m.ueberfaellig && m.kritisch).length }
    : k.meilensteine || {};
  const d = {};
  // Termine
  if ((ms.kritischUeberfaellig || 0) > 0 || (k.codVerzugMonate || 0) >= 6) d.termin = { farbe: "rot", grund: ms.kritischUeberfaellig ? `${ms.kritischUeberfaellig} überfällig auf dem kritischen Pfad` : `COD +${k.codVerzugMonate} Monate` };
  else if ((ms.ueberfaellig || 0) > 0 || (k.codVerzugMonate || 0) >= 1) d.termin = { farbe: "gelb", grund: ms.ueberfaellig ? `${ms.ueberfaellig} Meilenstein(e) überfällig` : `COD +${k.codVerzugMonate} Monat(e)` };
  else d.termin = { farbe: "gruen", grund: "Termine im Plan" };
  // Kosten (Entwicklungsbudget Soll/Ist)
  const plan = Number(k.budgetPlan) || 0;
  const ist = Number(k.budgetIst) || 0;
  if (plan <= 0) d.kosten = ist > 0 ? { farbe: "rot", grund: "Ist-Kosten ohne freigegebenes Budget" } : { farbe: "grau", grund: "Kein Budget erfasst" };
  else {
    const q = ist / plan;
    d.kosten = q > 1.1 ? { farbe: "rot", grund: `Budget um ${Math.round((q - 1) * 100)} % überschritten` } : q > 0.9 ? { farbe: "gelb", grund: `Budget zu ${Math.round(q * 100)} % ausgeschöpft` } : { farbe: "gruen", grund: `${Math.round(q * 100)} % des Budgets verbraucht` };
  }
  // Risiken
  const rm = Number(k.risikoMax) || 0;
  d.risiko = rm >= 15 ? { farbe: "rot", grund: `Höchstes Risiko ${rm}/25` } : rm >= 8 ? { farbe: "gelb", grund: `Höchstes Risiko ${rm}/25` } : { farbe: "gruen", grund: rm ? `Höchstes Risiko ${rm}/25` : "Keine offenen Risiken" };
  if ((k.pruefungUeberfaellig || 0) > 0 && d.risiko.farbe === "gruen") d.risiko = { farbe: "gelb", grund: `${k.pruefungUeberfaellig} Risikoprüfung(en) überfällig` };
  // Flächensicherung
  const ha = Number(k.flaecheHa) || 0;
  const gesichert = Number(k.flaecheGesichertHa) || 0;
  if (ha <= 0) d.flaeche = { farbe: "rot", grund: "Keine Projektfläche erfasst" };
  else {
    const q = gesichert / ha;
    if (q >= 0.999) d.flaeche = { farbe: "gruen", grund: `${de1(gesichert)} ha gesichert` };
    else d.flaeche = { farbe: phaseIndex(k.phase) >= phaseIndex("netz") ? "rot" : "gelb", grund: `${de1(gesichert)} von ${de1(ha)} ha gesichert` };
  }
  if ((k.optionsfristen || 0) > 0 && d.flaeche.farbe === "gruen") d.flaeche = { farbe: "gelb", grund: `${k.optionsfristen} Optionsfrist(en) ≤ 60 Tage` };
  // Dokumente
  d.dokumente = (k.dokumentLuecken || 0) > 0 ? { farbe: "gelb", grund: `${k.dokumentLuecken} fällige(r) Meilenstein(e) ohne Pflichtdokument` } : { farbe: "gruen", grund: "Pflichtdokumente vollständig" };

  const schlecht = Object.entries(d).filter(([, x]) => x.farbe !== "grau").sort((a, b) => RANG[b[1].farbe] - RANG[a[1].farbe]);
  const farbe = schlecht.length ? schlecht[0][1].farbe : "grau";
  const gruende = schlecht.filter(([, x]) => x.farbe === farbe && farbe !== "gruen").map(([id, x]) => `${AMPEL_DIMENSIONEN[id]}: ${x.grund}`);
  return { ...d, gesamt: { farbe, label: AMPEL[farbe].label, grund: gruende.join(" · ") || "Alle Dimensionen im Plan" } };
}

/** Zählung der Ampeln über Projekte: { gruen, gelb, rot, grau } */
export function ampelVerteilung(liste) {
  const z = { gruen: 0, gelb: 0, rot: 0, grau: 0 };
  for (const a of liste) z[a?.gesamt?.farbe || "grau"]++;
  return z;
}

/** Fällige Meilensteine ohne Pflichtdokument (offen, Soll-Ende ≤ heute + 30 Tage, Pflicht nicht erfüllt, kein Verzicht) */
export function dokumentLuecken(meilensteine, dokumente, { heute, tage: vorlauf = 30 } = {}) {
  const bis = plusTage(heute, vorlauf);
  return meilensteine.filter((m) => {
    if (FERTIG.includes(m.status) || !m.sollEnde || m.sollEnde > bis || !(m.dokumentPflicht || []).length) return false;
    if ((m.nachweisVerzicht || "").length >= 10) return false;
    const doks = dokumente.filter((d) => d.meilensteinId === m.id);
    return (m.dokumentPflicht || []).some((pf) => !doks.some((d) => d.pflicht === pf));
  });
}

// ================================================================ Pipeline-Bericht

const PHASE_ZEILEN = [{ id: null, label: "Akquise" }, ...PHASEN.map((p) => ({ id: p.id, label: p.kurz }))];

/**
 * MWp je Phase × Land (nur offene Projekte). projekte: [{ land, phase, mwp, status, pipeline: { gewichtetMwp, wert } }]
 * Liefert { zeilen: [{ phase, label, zellen: { DE: { anzahl, mwp, mwpGewichtet, wert } … }, summe }], spalten, gesamt }.
 */
export function pipelineMatrix(projekte, { laender = ["DE", "AT", "CH"] } = {}) {
  const leer = () => ({ anzahl: 0, mwp: 0, mwpGewichtet: 0, wert: 0 });
  const add = (z, p) => {
    z.anzahl++;
    z.mwp = r2(z.mwp + (Number(p.mwp) || 0));
    z.mwpGewichtet = r2(z.mwpGewichtet + (Number(p.pipeline?.gewichtetMwp) || 0));
    z.wert += Number(p.pipeline?.wert) || 0;
  };
  const offen = projekte.filter((p) => OFFEN.includes(p.status));
  const spalten = Object.fromEntries(laender.map((l) => [l, leer()]));
  const gesamt = leer();
  const zeilen = PHASE_ZEILEN.map((ph) => {
    const zellen = Object.fromEntries(laender.map((l) => [l, leer()]));
    const summe = leer();
    for (const p of offen.filter((x) => (x.phase || null) === ph.id)) {
      if (zellen[p.land]) {
        add(zellen[p.land], p);
        add(spalten[p.land], p);
      }
      add(summe, p);
      add(gesamt, p);
    }
    return { phase: ph.id, label: ph.label, zellen, summe };
  });
  return { zeilen, spalten, gesamt, laender };
}

/** Ziel-Abgleich je Inbetriebnahmejahr: Deckung gewichtet/Ziel, Lücke in MWp (gewichtet) */
export function zielAbgleich(jeJahr, { ziel = ENTWICKLUNG.zielMwpJahr, abJahr, jahre = 5 } = {}) {
  const start = abJahr || Number(String(new Date().toISOString()).slice(0, 4));
  return Array.from({ length: jahre }, (_, i) => {
    const jahr = start + i;
    const e = jeJahr.find((x) => x.jahr === jahr) || { mwp: 0, mwpGewichtet: 0, anzahl: 0 };
    const deckung = ziel ? e.mwpGewichtet / ziel : 0;
    return { jahr, anzahl: e.anzahl || 0, mwp: r2(e.mwp), mwpGewichtet: r2(e.mwpGewichtet), ziel, deckung: r2(deckung), luecke: r2(Math.max(0, ziel - e.mwpGewichtet)), farbe: deckung >= 1 ? "gruen" : deckung >= 0.6 ? "gelb" : "rot" };
  });
}

// ================================================================ Kapazitätsplanung

/** Interne Planwerte (Stunden) – je Projektleitung übersteuerbar (Kapazität), Aufwände als transparente Konvention */
export const KAPAZITAET = {
  stundenMonat: 120, // verfügbare Stunden je Monat für Projektentwicklung (Vollzeit abzüglich Urlaub, Termine, Sonstiges)
  grundlastProjekt: 8, // Koordination, Jour fixe, Eigentümer- und Gemeindekontakt je aktivem Projekt und Monat
  jeMeilenstein: 6, // intern bearbeiteter Meilenstein (Anträge, Abstimmung, Unterlagen) je laufendem Monat
  jeGutachten: 3, // extern beauftragtes Gutachten (Steuerung, Prüfung) je laufendem Monat
  gelbAb: 0.85,
  rotAb: 1.0,
  min: 10,
  max: 200,
};

const monatVon = (iso) => String(iso || "").slice(0, 7);
function monatsliste(heute, n) {
  const [j, m] = heute.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const x = new Date(Date.UTC(j, m - 1 + i, 1));
    return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}
export const auslastungFarbe = (q) => (q > KAPAZITAET.rotAb ? "rot" : q >= KAPAZITAET.gelbAb ? "gelb" : "gruen");

/**
 * Kapazitätsplan der nächsten `monate` Monate je Projektleitung.
 * leiter: [{ id, name, stundenMonat? }] · projekte: [{ id, projektleiterId, status }] ·
 * meilensteine: [{ projektId, status, sollStart, sollEnde, verantwortlichId, gutachten }]
 * Zuordnung eines Meilensteins: Verantwortliche(r), sonst Projektleitung des Projekts. Überfällige offene Meilensteine
 * zählen im laufenden Monat.
 */
export function kapazitaetsplan({ leiter = [], projekte = [], meilensteine = [], heute, monate = 6, planwerte = KAPAZITAET } = {}) {
  const liste = monatsliste(heute, monate);
  const jetzt = liste[0];
  const pl = new Map(projekte.map((p) => [p.id, p]));
  const zeilen = leiter.map((u) => {
    const kap = Number(u.stundenMonat) || planwerte.stundenMonat;
    const eigene = projekte.filter((p) => p.projektleiterId === u.id && OFFEN.includes(p.status));
    const offeneMs = meilensteine.filter((m) => {
      if (FERTIG.includes(m.status)) return false;
      const p = pl.get(m.projektId);
      if (!p || !OFFEN.includes(p.status)) return false;
      return (m.verantwortlichId || p.projektleiterId) === u.id;
    });
    const je = liste.map((monat) => {
      let stunden = eigene.length * planwerte.grundlastProjekt;
      let anzahl = 0;
      for (const m of offeneMs) {
        const von = monatVon(m.sollStart || m.sollEnde);
        let bis = monatVon(m.sollEnde || m.sollStart);
        if (bis && bis < jetzt) bis = jetzt; // überfällig → läuft im aktuellen Monat weiter
        if (von && bis && von <= monat && monat <= bis) {
          stunden += m.gutachten ? planwerte.jeGutachten : planwerte.jeMeilenstein;
          anzahl++;
        }
      }
      const auslastung = r2(stunden / kap);
      return { monat, stunden, meilensteine: anzahl, auslastung, farbe: auslastungFarbe(auslastung) };
    });
    const spitze = je.reduce((a, b) => (b.auslastung > a.auslastung ? b : a), je[0] || { auslastung: 0 });
    return { id: u.id, name: u.name, stundenMonat: kap, individuell: !!u.stundenMonat, projekte: eigene.length, offeneMeilensteine: offeneMs.length, je, spitze: spitze?.auslastung || 0, spitzeMonat: spitze?.monat || jetzt, farbe: auslastungFarbe(spitze?.auslastung || 0), frei: Math.max(0, kap - (je[0]?.stunden || 0)) };
  });
  zeilen.sort((a, b) => b.spitze - a.spitze);
  return { monate: liste, zeilen, planwerte: { ...planwerte } };
}

/** Vorschlag Projektleitung für ein neues Projekt: geringste Spitzenauslastung */
export function projektleiterVorschlag(plan) {
  return [...(plan?.zeilen || [])].sort((a, b) => a.spitze - b.spitze)[0] || null;
}

// ================================================================ Risikokosten

/** Eintrittswahrscheinlichkeit je Stufe (interne Konvention zur Risikovorsorge) */
export const RISIKO_WAHRSCHEINLICHKEIT = { 1: 0.05, 2: 0.15, 3: 0.35, 4: 0.6, 5: 0.85 };

/** Risikokosten = Schadenshöhe × Wahrscheinlichkeit; Restrisiko nach Maßnahme (restEintritt/restAuswirkung) */
export function risikoBewertung(r = {}) {
  const e = Math.min(5, Math.max(1, Math.round(Number(r.eintritt) || 1)));
  const a = Math.min(5, Math.max(1, Math.round(Number(r.auswirkung) || 1)));
  const re = r.restEintritt ? Math.min(5, Math.max(1, Math.round(Number(r.restEintritt)))) : null;
  const ra = r.restAuswirkung ? Math.min(5, Math.max(1, Math.round(Number(r.restAuswirkung)))) : null;
  const kosten = Math.max(0, Number(r.kostenEur) || 0);
  return {
    score: e * a,
    restScore: re || ra ? (re || e) * (ra || a) : null,
    erwartet: Math.round(kosten * RISIKO_WAHRSCHEINLICHKEIT[e]),
    erwartetRest: re ? Math.round(kosten * RISIKO_WAHRSCHEINLICHKEIT[re]) : null,
  };
}

// ================================================================ Entscheidungsvorlagen (Geschäftsführung)

export const VORLAGE_ARTEN = {
  gate_entwicklung: { label: "Gate 1 – Entwicklungsfreigabe", text: "Flächensicherung abgeschlossen bzw. absehbar: Freigabe Entwicklungsbudget für Netzanfrage, Gemeindegespräch und erste Gutachten.", budget: true },
  gate_genehmigung: { label: "Gate 2 – Genehmigungsverfahren", text: "Netzzusage bzw. positive Netzauskunft liegt vor: Freigabe Gutachten und Bauleitplanung (DE) bzw. Umwidmung (AT) / Nutzungsplanung (CH).", budget: true },
  gate_rtb: { label: "Gate 3 – Baureife & Verwertung", text: "Baurecht/Bewilligung liegt vor oder ist absehbar: Verwertung festlegen (Eigenbetrieb, Verkauf, Bau für Investor).", verwertung: true },
  verwertung: { label: "Verwertungsentscheidung", text: "Eigenbetrieb mit Bankfinanzierung, Verkauf über die Projektbörse oder Bau für einen Investor.", verwertung: true },
  spv: { label: "Gründung Projektgesellschaft (SPV)", text: "Gründung einer Projektgesellschaft zur Bündelung von Rechten, Verträgen und Finanzierung." },
  budget: { label: "Budgeterhöhung", text: "Zusätzliches Entwicklungsbudget (z. B. Nachforderungen der Behörden, zusätzliche Gutachten).", budget: true },
  abbruch: { label: "Projektabbruch", text: "Einstellung der Entwicklung (K.-o.-Kriterium, Wirtschaftlichkeit, Akzeptanz)." },
};
export const VORLAGE_ART_IDS = Object.keys(VORLAGE_ARTEN);

export const VERWERTUNG = {
  eigenbetrieb: { label: "Eigenbetrieb mit Bankfinanzierung (Bestand ÖkoInvest bzw. SPV)", geschaeftsmodell: "eigenbetrieb", folge: "Finanzierungsfall anlegen, Bankenpaket zusammenstellen und Banken anfragen (/portal/admin/finanzierung)." },
  verkauf: { label: "Verkauf der Projektrechte bzw. der SPV über die Projektbörse", geschaeftsmodell: "verkauf", folge: "Übergabe an die Projektbörse vorbereiten (Exposé, Datenraum, Bieterverfahren über die Transaktion)." },
  bau_investor: { label: "Bau für einen Investor (Forward-Verkauf, EPC durch ÖKOVOLT)", geschaeftsmodell: "verkauf", folge: "Investor über Projektbörse/Deal-Room gewinnen, EPC-Angebot und Forward-Kaufvertrag vorbereiten." },
};
export const VERWERTUNG_IDS = Object.keys(VERWERTUNG);

export const VORLAGE_STATUS = {
  entwurf: { label: "Entwurf", ton: "neutral" },
  eingereicht: { label: "Zur Entscheidung eingereicht", ton: "info" },
  genehmigt: { label: "Genehmigt", ton: "ok" },
  abgelehnt: { label: "Abgelehnt", ton: "warn" },
  zurueckgestellt: { label: "Zurückgestellt (Nacharbeit)", ton: "warn" },
  zurueckgezogen: { label: "Zurückgezogen", ton: "neutral" },
};
export const VORLAGE_OFFEN = ["entwurf", "eingereicht", "zurueckgestellt"];

/** Zustandsautomat: aktion → { von[], nach, wer (schreiben|leitung), begruendung (Pflicht ≥ 10 Zeichen) } */
export const VORLAGE_AKTIONEN = {
  einreichen: { label: "Zur Entscheidung einreichen", von: ["entwurf", "zurueckgestellt"], nach: "eingereicht", wer: "schreiben", begruendung: false },
  zurueckziehen: { label: "Zurückziehen", von: ["entwurf", "eingereicht", "zurueckgestellt"], nach: "zurueckgezogen", wer: "schreiben", begruendung: false },
  genehmigen: { label: "Genehmigen", von: ["eingereicht"], nach: "genehmigt", wer: "leitung", begruendung: false },
  ablehnen: { label: "Ablehnen", von: ["eingereicht"], nach: "abgelehnt", wer: "leitung", begruendung: true },
  zurueckstellen: { label: "Zurückstellen (Nacharbeit)", von: ["eingereicht"], nach: "zurueckgestellt", wer: "leitung", begruendung: true },
};

/** Prüft einen Übergang. Liefert { ok, fehler?, nach, status (HTTP) } */
export function vorlageUebergang(vorlage, aktion, { leitung = false, schreiben = false, nutzerId = null, begruendung = "", option = "" } = {}) {
  const a = VORLAGE_AKTIONEN[aktion];
  if (!a) return { ok: false, status: 400, fehler: "Unbekannte Aktion." };
  if (!a.von.includes(vorlage.status)) return { ok: false, status: 409, fehler: `„${a.label}“ ist im Status „${VORLAGE_STATUS[vorlage.status]?.label || vorlage.status}“ nicht möglich.` };
  if (a.wer === "leitung" && !leitung) return { ok: false, status: 403, fehler: "Über Entscheidungsvorlagen entscheidet die Leitung (Geschäftsführung)." };
  if (a.wer === "schreiben" && !schreiben) return { ok: false, status: 403, fehler: "Ihre Rolle erlaubt keine Bearbeitung von Entscheidungsvorlagen." };
  if (a.wer === "leitung" && nutzerId && vorlage.eingereichtVon === nutzerId) return { ok: false, status: 409, fehler: "Vier-Augen-Prinzip: Wer die Vorlage eingereicht hat, entscheidet nicht selbst darüber." };
  if (a.begruendung && String(begruendung || "").trim().length < 10) return { ok: false, status: 422, fehler: "Bitte begründen Sie die Entscheidung (mind. 10 Zeichen)." };
  if (aktion === "einreichen") {
    const f = vorlagePruefen(vorlage);
    if (f.length) return { ok: false, status: 422, fehler: f.join(" ") };
  }
  if (aktion === "genehmigen" && VORLAGE_ARTEN[vorlage.art]?.verwertung) {
    const o = option || vorlage.empfehlung;
    if (!VERWERTUNG[o]) return { ok: false, status: 422, fehler: "Bitte die gewählte Verwertung angeben." };
  }
  return { ok: true, nach: a.nach };
}

/** Inhaltliche Pflichtangaben vor dem Einreichen */
export function vorlagePruefen(v = {}) {
  const f = [];
  const art = VORLAGE_ARTEN[v.art];
  if (!art) f.push("Bitte die Art der Vorlage wählen.");
  if (String(v.titel || "").trim().length < 5) f.push("Titel fehlt (mind. 5 Zeichen).");
  if (String(v.beschlussvorschlag || "").trim().length < 20) f.push("Beschlussvorschlag fehlt (mind. 20 Zeichen).");
  if (String(v.sachverhalt || "").trim().length < 20) f.push("Sachverhalt fehlt (mind. 20 Zeichen).");
  if (art?.budget && !(Number(v.budgetEur) > 0)) f.push("Bitte den beantragten Budgetbetrag angeben.");
  if (art?.verwertung && !VERWERTUNG[v.empfehlung]) f.push("Bitte eine empfohlene Verwertung wählen.");
  if (v.art === "abbruch" && String(v.beschlussvorschlag || "").length < 40) f.push("Beim Abbruch den Grund im Beschlussvorschlag ausführen (mind. 40 Zeichen).");
  return f;
}

/** Folgeaktionen nach Genehmigung (Aufgaben, Budget, Status) – werden vom Backend ausgeführt */
export function vorlageFolgen(vorlage, { option = "" } = {}) {
  const art = vorlage.art;
  const erg = { aufgaben: [], budgetEur: 0, status: null, verwertung: null, entscheidungArt: "go" };
  if (VORLAGE_ARTEN[art]?.budget && Number(vorlage.budgetEur) > 0) erg.budgetEur = Math.round(Number(vorlage.budgetEur));
  if (art === "gate_entwicklung") erg.aufgaben.push({ titel: "Gate 1 genehmigt: Netzanfrage stellen und Gemeindetermin vereinbaren", tage: 14 });
  if (art === "gate_genehmigung") erg.aufgaben.push({ titel: "Gate 2 genehmigt: Gutachter beauftragen und Planungsverfahren einleiten", tage: 14 });
  if (VORLAGE_ARTEN[art]?.verwertung) {
    const o = VERWERTUNG[option] ? option : vorlage.empfehlung;
    erg.verwertung = o;
    erg.entscheidungArt = "strategie";
    erg.aufgaben.push({ titel: `Verwertung „${VERWERTUNG[o]?.label || o}“ umsetzen`, text: VERWERTUNG[o]?.folge || "", tage: 21 });
  }
  if (art === "spv") erg.aufgaben.push({ titel: "SPV-Gründung im Gründungsassistenten anlegen", text: "Gesellschaftsvertrag, Notartermin, Firmenbuch/Handelsregister, WiEReG/Transparenzregister, Bankkonto: /portal/admin/gesellschaften.", tage: 14 });
  if (art === "budget") erg.entscheidungArt = "budget";
  if (art === "abbruch") {
    erg.status = "abgebrochen";
    erg.entscheidungArt = "nogo";
    erg.aufgaben.push({ titel: "Projektabbruch: Eigentümer, Gemeinde und Gutachter informieren, Verträge/Optionen kündigen", tage: 14 });
  }
  return erg;
}

// ================================================================ Aufgaben aus Meilensteinen

/** Offene Meilensteine, deren Soll-Ende in ≤ vorlaufTage liegt (oder überfällig ist) und die noch keine Aufgabe haben */
export function aufgabenFaellig(meilensteine, { heute, vorlaufTage = 14 } = {}) {
  const bis = plusTage(heute, vorlaufTage);
  return meilensteine.filter((m) => !FERTIG.includes(m.status) && m.sollEnde && m.sollEnde <= bis && !m.aufgabeId);
}

// ================================================================ Flächensicherung (Grundbuch, Optionsfristen)

export const GRUNDBUCH_SICHERUNG = {
  keine: { label: "Keine Eintragung", ton: "neutral" },
  beantragt: { label: "Eintragung beantragt", ton: "info" },
  vorgemerkt: { label: "Rang gesichert / vorgemerkt", ton: "info" },
  eingetragen: { label: "Dienstbarkeit eingetragen", ton: "ok" },
};
export const GRUNDBUCH_SICHERUNG_IDS = Object.keys(GRUNDBUCH_SICHERUNG);

/** Übliche Sicherungsinstrumente je Land (Orientierung, keine Rechtsberatung) */
export const GRUNDBUCH_HINWEIS = {
  DE: "In der Regel Vormerkung (§ 883 BGB) auf eine beschränkte persönliche Dienstbarkeit (§ 1090 BGB) mit notariell beglaubigter Bewilligung; Rangrücktritt vorrangiger Grundpfandrechte klären.",
  AT: "In der Regel Anmerkung der Rangordnung (§§ 53 ff. GBG) bzw. Einverleibung einer Dienstbarkeit (§§ 472 ff. ABGB) mit beglaubigter Unterschrift; Zustimmung von Pfandgläubigern prüfen.",
  CH: "In der Regel Vormerkung persönlicher Rechte (Art. 959 ZGB) bzw. Dienstbarkeit oder Baurecht (Art. 779 ZGB), Vertrag meist öffentlich beurkundet; Zustimmung von Grundpfandgläubigern prüfen.",
};

/** Optionsverträge, deren Ausübungsfrist in ≤ tage abläuft (oder abgelaufen ist) */
export function optionsfristen(flaechen, { heute, tage: vorlauf = 60 } = {}) {
  return flaechen
    .filter((f) => f.pachtStatus === "option" && f.optionBis)
    .map((f) => ({ ...f, inTagen: tage(heute, f.optionBis) }))
    .filter((f) => f.inTagen <= vorlauf)
    .sort((a, b) => a.inTagen - b.inTagen);
}

/** Sicherungsgrad der Fläche: gesichert (Option/Pacht) UND im Grundbuch gesichert (vorgemerkt/eingetragen) */
export function sicherungsgrad(flaechen) {
  const ha = flaechen.reduce((s, f) => s + (Number(f.ha) || 0), 0);
  const vertrag = flaechen.filter((f) => ["option", "pachtvertrag"].includes(f.pachtStatus)).reduce((s, f) => s + (Number(f.ha) || 0), 0);
  const grundbuch = flaechen.filter((f) => ["option", "pachtvertrag"].includes(f.pachtStatus) && ["vorgemerkt", "eingetragen"].includes(f.grundbuch)).reduce((s, f) => s + (Number(f.ha) || 0), 0);
  return { ha: r1(ha), vertragHa: r1(vertrag), grundbuchHa: r1(grundbuch), vertragQuote: ha ? r2(vertrag / ha) : 0, grundbuchQuote: ha ? r2(grundbuch / ha) : 0 };
}

// ================================================================ Verwertung: Geschäftsmodell-Vergleich (Kurzform)

/** Kurzform von geschaeftsmodellVergleich() (finanzierung/geschaeftsmodell.js) für Projektsicht, Vorlage und PDF */
export function geschaeftsmodellKurz(vgl, { quelle = "", gewaehlt = null } = {}) {
  if (!vgl?.zeilen?.length) return null;
  const beste = vgl.zeilen.find((z) => z.id === vgl.beste) || vgl.zeilen[0];
  return {
    quelle,
    zeilen: vgl.zeilen.map((z) => ({ id: z.id, label: z.label, barwert: Math.round(z.barwert), kapitalbindung: Math.round(z.kapitalbindung || 0), irr: Number.isFinite(z.irr) ? z.irr : null })),
    beste: beste.id, bestLabel: beste.label, empfehlung: vgl.empfehlung || "", gewaehlt: gewaehlt || null,
  };
}

/** Eingaben für den Vergleich ohne Finanzierungsfall: Standard je Typ und Land */
export const geschaeftsmodellEingabenStandard = (p) => ({ land: p.land, typ: p.typ === "agri" ? "agri" : p.typ === "speicher" ? "speicher" : "freiflaeche", mwp: Number(p.mwp) || (Number(p.mwh) || 0) / 2 || 1 });
