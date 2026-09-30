// src/lib/plattform/transaktion/pipeline.js
//
// Verkaufs-Pipeline des Backoffice (Transaktion) über alle Projekte der Börse – reine Funktionen: Phase je Projekt
// aus Projekt-, Interessen-, Bieterverfahren- und Closing-Stand, Abschlusswahrscheinlichkeit (Standard je Phase,
// manuell überschreibbar mit Begründung), erwarteter Kaufpreis, erwartete Provision (gewichtet) und Deal-Bericht.
// Tests: node --test src/lib/plattform/transaktion/pipeline.test.mjs · Python: plattform/transaktion_kern.py

export const PHASEN = [
  { id: "pruefung", label: "Prüfung", wahrscheinlichkeit: 0.05, monate: 12, text: "Projekt eingereicht, Freigabe durch das Backoffice ausstehend." },
  { id: "vermarktung", label: "Vermarktung", wahrscheinlichkeit: 0.1, monate: 9, text: "Veröffentlicht, noch kein freigegebener Datenraum." },
  { id: "datenraum", label: "Datenraum / DD", wahrscheinlichkeit: 0.2, monate: 6, text: "Mindestens ein Investor mit NDA und Datenraumzugang." },
  { id: "angebote", label: "Angebote / Bieterverfahren", wahrscheinlichkeit: 0.35, monate: 4, text: "LOI abgegeben oder Bieterverfahren läuft." },
  { id: "exklusiv", label: "Exklusivität", wahrscheinlichkeit: 0.6, monate: 3, text: "LOI angenommen bzw. Zuschlag, Projekt reserviert." },
  { id: "closing", label: "Signing / Closing", wahrscheinlichkeit: 0.8, monate: 1, text: "Closing-Raum aktiv; nach Signing 90 %." },
  { id: "verkauft", label: "Verkauft", wahrscheinlichkeit: 1, monate: 0, text: "Closing vollzogen, Provision fällig." },
];
export const PHASEN_IDS = PHASEN.map((p) => p.id);
export const PROVISION_STANDARD = 0.015; // Untergrenze der Verkäuferprovision (1,5–3 %), wenn am Projekt kein Satz hinterlegt ist
export const STOCKT_TAGE = 21;

const rund2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;
const zahl = (x) => (Number.isFinite(Number(x)) && x !== null && x !== "" ? Number(x) : null);

/** Gesamtpreis eines Gebots/LOI (€) – proKwp × MWp × 1000 oder Gesamtpreis */
export function preisGesamt(g, mwp) {
  if (!g) return null;
  if (zahl(g.preis)) return Number(g.preis);
  if (zahl(g.betrag)) return Number(g.betrag);
  if (zahl(g.preisProKwp) && zahl(mwp)) return Math.round(Number(g.preisProKwp) * Number(mwp) * 1000);
  return null;
}

/** Phase eines Projekts. kontext: { interessen[], verfahren (aktuell), closing (aktuell) } */
export function phaseVon(p, { interessen = [], verfahren = null, closing = null } = {}) {
  if (p.status === "verkauft" || closing?.status === "vollzogen") return "verkauft";
  if (closing && ["vorbereitung", "signing"].includes(closing.status)) return "closing";
  if (p.status === "reserviert" || interessen.some((i) => i.status === "loi_angenommen") || verfahren?.status === "zuschlag") return "exklusiv";
  if ((verfahren && ["laufend", "auswertung"].includes(verfahren.status)) || interessen.some((i) => i.status === "loi_abgegeben")) return "angebote";
  if (interessen.some((i) => ["nda_freigegeben"].includes(i.status))) return "datenraum";
  if (p.status === "veroeffentlicht") return "vermarktung";
  if (p.status === "pruefung") return "pruefung";
  return null; // Entwurf/abgelehnt → nicht in der Pipeline
}

/** Erwarteter Kaufpreis und Quelle */
export function erwarteterPreis(p, { interessen = [], gebote = [], closing = null } = {}) {
  if (closing && zahl(closing.kaufpreis)) return { preis: Number(closing.kaufpreis), quelle: "Closing-Raum (Kaufpreis)" };
  const zuschlag = gebote.find((g) => g.status === "zuschlag");
  if (zuschlag) return { preis: preisGesamt(zuschlag, p.mwp), quelle: "Zuschlag im Bieterverfahren" };
  const loi = interessen.filter((i) => ["loi_angenommen", "loi_abgegeben"].includes(i.status) && zahl(i.loi?.betrag)).sort((a, b) => (a.status === "loi_angenommen" ? -1 : 1) - (b.status === "loi_angenommen" ? -1 : 1) || Number(b.loi.betrag) - Number(a.loi.betrag))[0];
  if (loi) return { preis: Number(loi.loi.betrag), quelle: loi.status === "loi_angenommen" ? "angenommene LOI" : "höchste LOI" };
  const bestes = gebote.filter((g) => !["zurueckgezogen", "abgelehnt"].includes(g.status)).map((g) => preisGesamt(g, p.mwp)).filter(Boolean).sort((a, b) => b - a)[0];
  if (bestes) return { preis: bestes, quelle: "bestes Gebot" };
  if (zahl(p.kaufpreis)) return { preis: Number(p.kaufpreis), quelle: "Kaufpreis" };
  if (zahl(p.preis)) return { preis: Number(p.preis), quelle: "Preisvorstellung Anbieter" };
  if (zahl(p.preisProKwp) && zahl(p.mwp)) return { preis: Math.round(Number(p.preisProKwp) * Number(p.mwp) * 1000), quelle: "Preisvorstellung €/kWp × Leistung" };
  return { preis: null, quelle: "kein Preis – bitte Preisvorstellung erfassen" };
}

const plusMonate = (iso, n) => {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};
const quartal = (monat) => (monat ? `${monat.slice(0, 4)}-Q${Math.ceil(Number(monat.slice(5, 7)) / 3)}` : "");

/**
 * Pipeline-Karte. override: { wahrscheinlichkeit (0–100), closingErwartet (JJJJ-MM), notiz, vonName, am }.
 * Rückgabe null für Projekte außerhalb der Pipeline.
 */
export function dealKarte(p, kontext = {}, override = null, heute = new Date().toISOString().slice(0, 10)) {
  const phase = phaseVon(p, kontext);
  if (!phase) return null;
  const ph = PHASEN.find((x) => x.id === phase);
  const { preis, quelle } = erwarteterPreis(p, kontext);
  const satz = zahl(p.provisionSatz) ?? PROVISION_STANDARD;
  const signed = kontext.closing?.status === "signing";
  const standardW = phase === "closing" && signed ? 0.9 : ph.wahrscheinlichkeit;
  const manuell = override && zahl(override.wahrscheinlichkeit) !== null && phase !== "verkauft";
  const w = manuell ? Math.min(1, Math.max(0, Number(override.wahrscheinlichkeit) / 100)) : standardW;
  const provision = preis ? rund2(preis * satz) : null;
  const aktiv = (kontext.interessen || []).filter((i) => !["abgelehnt", "gemerkt"].includes(i.status));
  const letzte = [p.geaendertAm, ...aktiv.map((i) => i.geaendertAm), kontext.closing?.geaendertAm, kontext.verfahren?.verlauf?.at?.(-1)?.am].filter(Boolean).sort().pop() || p.erstelltAm;
  const tageRuhig = letzte ? Math.max(0, Math.round((new Date(`${heute}T00:00:00Z`) - new Date(String(letzte).slice(0, 10) + "T00:00:00Z")) / 86400000)) : null;
  const verkauftAm = phase === "verkauft" ? String(kontext.closing?.geaendertAm || p.geaendertAm || heute).slice(0, 7) : null;
  const closingErwartet = verkauftAm || (override?.closingErwartet && /^20\d\d-(0[1-9]|1[0-2])$/.test(override.closingErwartet) ? override.closingErwartet : plusMonate(heute, ph.monate));
  return {
    projektId: p.id, titel: p.titel, land: p.land, typ: p.typ, mwp: p.mwp ?? null, projektStatus: p.status,
    phase, phaseLabel: ph.label, wahrscheinlichkeit: rund2(w), wahrscheinlichkeitStandard: standardW, manuell: !!manuell,
    preis, preisQuelle: quelle, provisionSatz: satz, provisionSatzAnnahme: zahl(p.provisionSatz) === null,
    provision, provisionGewichtet: provision !== null ? rund2(provision * w) : null,
    interessenten: aktiv.length, lois: aktiv.filter((i) => ["loi_abgegeben", "loi_angenommen"].includes(i.status)).length,
    bieterverfahren: kontext.verfahren ? { id: kontext.verfahren.id, status: kontext.verfahren.status } : null,
    closing: kontext.closing ? { id: kontext.closing.id, status: kontext.closing.status } : null,
    closingErwartet, quartal: quartal(closingErwartet), tageRuhig, stockt: phase !== "verkauft" && tageRuhig !== null && tageRuhig > STOCKT_TAGE,
    notiz: override?.notiz || "", override: override ? { vonName: override.vonName || "", am: override.am || "" } : null,
  };
}

/** Kanban-Spalten + Summen */
export function pipelineAuswerten(karten) {
  const spalten = PHASEN.map((ph) => {
    const k = karten.filter((x) => x.phase === ph.id);
    return { ...ph, karten: k, anzahl: k.length, volumen: rund2(k.reduce((s, x) => s + (x.preis || 0), 0)), provisionGewichtet: rund2(k.reduce((s, x) => s + (x.provisionGewichtet || 0), 0)) };
  });
  const offen = karten.filter((k) => k.phase !== "verkauft");
  const quartale = {};
  for (const k of offen) {
    const q = (quartale[k.quartal] ||= { quartal: k.quartal, anzahl: 0, provision: 0, provisionGewichtet: 0 });
    q.anzahl++;
    q.provision = rund2(q.provision + (k.provision || 0));
    q.provisionGewichtet = rund2(q.provisionGewichtet + (k.provisionGewichtet || 0));
  }
  return {
    spalten,
    summen: {
      deals: offen.length,
      volumen: rund2(offen.reduce((s, x) => s + (x.preis || 0), 0)),
      provisionMoeglich: rund2(offen.reduce((s, x) => s + (x.provision || 0), 0)),
      provisionGewichtet: rund2(offen.reduce((s, x) => s + (x.provisionGewichtet || 0), 0)),
      verkauft: karten.filter((k) => k.phase === "verkauft").length,
      provisionVerkauft: rund2(karten.filter((k) => k.phase === "verkauft").reduce((s, x) => s + (x.provision || 0), 0)),
      stockend: offen.filter((k) => k.stockt).length,
      ohnePreis: offen.filter((k) => !k.preis).length,
    },
    prognose: Object.values(quartale).sort((a, b) => a.quartal.localeCompare(b.quartal)),
  };
}

/** Override prüfen: { wahrscheinlichkeit 0–100 | null, closingErwartet JJJJ-MM | "", notiz ≥ 10 Zeichen bei Wahrscheinlichkeit } */
export function overridePruefen(d = {}) {
  const w = d.wahrscheinlichkeit === null || d.wahrscheinlichkeit === "" || d.wahrscheinlichkeit === undefined ? null : Number(d.wahrscheinlichkeit);
  if (w !== null && (!Number.isFinite(w) || w < 0 || w > 100)) throw new Error("Wahrscheinlichkeit zwischen 0 und 100 %.");
  const c = String(d.closingErwartet || "");
  if (c && !/^20\d\d-(0[1-9]|1[0-2])$/.test(c)) throw new Error("Erwartetes Closing als Monat (JJJJ-MM).");
  const notiz = String(d.notiz || "").replace(/\s+/g, " ").trim().slice(0, 500);
  if (w !== null && notiz.length < 10) throw new Error("Bitte die abweichende Wahrscheinlichkeit begründen (mind. 10 Zeichen).");
  return { wahrscheinlichkeit: w === null ? null : Math.round(w), closingErwartet: c, notiz };
}

const feld = (v) => {
  let s = v === null || v === undefined ? "" : typeof v === "number" ? String(v).replace(".", ",") : String(v);
  if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Deal-Bericht als Excel-CSV */
export function dealBerichtCsv(karten) {
  const kopf = ["Projekt", "Titel", "Land", "MWp", "Phase", "Wahrscheinlichkeit %", "manuell", "Erwarteter Kaufpreis €", "Preisquelle", "Provisionssatz %", "Provision €", "Provision gewichtet €", "Interessenten", "LOIs", "Closing erwartet", "Tage ohne Aktivität", "Notiz"];
  const z = karten.map((k) => [k.projektId, k.titel, k.land, k.mwp, k.phaseLabel, Math.round(k.wahrscheinlichkeit * 100), k.manuell ? "ja" : "nein", k.preis, k.preisQuelle, rund2(k.provisionSatz * 100), k.provision, k.provisionGewichtet, k.interessenten, k.lois, k.closingErwartet, k.tageRuhig, k.notiz].map(feld).join(";"));
  return "﻿" + [kopf.join(";"), ...z].join("\r\n") + "\r\n";
}
