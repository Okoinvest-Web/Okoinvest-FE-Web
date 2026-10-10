// src/lib/plattform/buchhaltung/abschluss.js
//
// Monatsabschluss-Checkliste – reine Funktionen. Automatische Punkte werden aus Fakten des Backends bewertet
// (Läufe, Klärfälle, Zahlungseingänge, Zahlungsläufe, Mahnungen, Pflichtangaben, Export); manuelle Punkte hakt die
// Buchhaltung mit Notiz ab. Abschließen erst, wenn alle Pflichtpunkte erfüllt sind (sonst 409 mit Liste).
// Python-Gegenstück: plattform/buchhaltung_kern.py
//
// Fristen (Orientierung nach aktuellem Stand, mit der Steuerberatung abstimmen):
//   AT  UVA bis 15. des zweitfolgenden Monats (§ 21 Abs. 1 UStG 1994); Zusammenfassende Meldung bis Ende des Folgemonats
//   DE  UStVA bis 10. des Folgemonats (§ 18 Abs. 1 UStG; Dauerfristverlängerung + 1 Monat); ZM bis 25. des Folgemonats (§ 18a UStG)
//   CH  MWST-Abrechnung in der Regel quartalsweise, 60 Tage nach Periodenende (Art. 71 MWSTG)

import { monatsZeitraum, plusTage, datumDe, rund2 } from "../finanzen/basis.js";
import { STEUERVORLAGEN } from "../finanzen/steuer.js";

export const ABSCHLUSS_PUNKTE = [
  { id: "contracting_lauf", titel: "Contracting-Abrechnung des Monats erstellt", auto: true, pflicht: true, text: "Abrechnungslauf Contracting für den Monat ausgeführt (Monatswerte der Messpunkte)." },
  { id: "pacht_lauf", titel: "Pacht-Gutschriften mit Fälligkeit im Monat erzeugt", auto: true, pflicht: true, text: "Alle im Monat fälligen Perioden der aktiven Pachtverträge haben einen Beleg." },
  { id: "klaerfaelle", titel: "Keine offenen Klärfälle", auto: true, pflicht: true, text: "Fehlende Monatswerte, Index oder Empfänger geklärt." },
  { id: "zahlungseingaenge", titel: "Kontoauszüge importiert und zugeordnet", auto: true, pflicht: true, text: "CAMT/CSV des Monats eingelesen, keine Buchung ohne Zuordnung/Entscheidung." },
  { id: "zahlungslaeufe", titel: "SEPA-Zahlungsläufe bestätigt oder verworfen", auto: true, pflicht: true, text: "Kein Zahlungslauf mehr im Status „eingereicht?“." },
  { id: "mahnlauf", titel: "Mahnlauf durchgeführt", auto: true, pflicht: false, text: "Keine fällige Mahnstufe ohne Mahnung." },
  { id: "pflichtangaben", titel: "Pflichtangaben der Belege vollständig", auto: true, pflicht: true, text: "Keine Belege des Monats mit fehlenden Pflichtangaben (UID, Anschrift, Steuerhinweis)." },
  { id: "op_abgestimmt", titel: "OP-Liste mit Bankkonto und Personenkonten abgestimmt", auto: false, pflicht: true, text: "Summe offener Posten = Salden Debitoren/Kreditoren." },
  { id: "afa", titel: "Abschreibungen (AfA) gebucht", auto: false, pflicht: false, text: "Monatliche AfA der aktivierten Anlagen (ERPNext: Depreciation Entry)." },
  { id: "ust", titel: "Umsatzsteuer-Voranmeldung und Zusammenfassende Meldung vorbereitet", auto: false, pflicht: true, text: "" },
  { id: "export", titel: "Buchungsexport an die Steuerberatung übergeben", auto: true, pflicht: true, text: "DATEV- oder BMD-Export für den Monat erstellt." },
];

export const ABSCHLUSS_STATUS = { offen: "Offen", abgeschlossen: "Abgeschlossen", wiedereroeffnet: "Wiedereröffnet" };

/** Steuerfristen zum Monat (Hinweis) */
export function steuerFristen(monat) {
  const { bis } = monatsZeitraum(monat);
  const [j, m] = monat.split("-").map(Number);
  const tag = (jj, mm, tt) => new Date(Date.UTC(jj, mm - 1, tt)).toISOString().slice(0, 10);
  return [
    { land: "AT", text: `UVA ${monat.split("-").reverse().join("/")} bis ${datumDe(tag(j, m + 2, 15))} (§ 21 Abs. 1 UStG 1994), Zusammenfassende Meldung bis ${datumDe(tag(j, m + 2, 0))}` },
    { land: "DE", text: `falls in DE registriert: UStVA bis ${datumDe(tag(j, m + 1, 10))} (ohne Dauerfristverlängerung), ZM bis ${datumDe(tag(j, m + 1, 25))}` },
    { land: "CH", text: `falls in CH registriert: MWST-Abrechnung je Quartal, 60 Tage nach Quartalsende (z. B. ${datumDe(plusTage(bis, 60))} bei Quartalsende ${datumDe(bis)})` },
  ];
}

/**
 * Checkliste bewerten. fakten: { contractingLauf, pachtFehlend, klaerfaelleOffen, eingaengeOffen, zahlungslaeufeOffen,
 * mahnungenFaellig, pflichtFehlt, exportErstellt }; manuell: { [punktId]: { erledigt, notiz, vonName, am } }
 */
export function abschlussBewerten(monat, fakten = {}, manuell = {}) {
  const auto = {
    contracting_lauf: { ok: !!fakten.contractingLauf, info: fakten.contractingLauf ? "Lauf vorhanden" : fakten.contractingAnlagen ? "noch kein Lauf für den Monat" : "keine Contracting-Anlagen" },
    pacht_lauf: { ok: !(fakten.pachtFehlend > 0), info: fakten.pachtFehlend > 0 ? `${fakten.pachtFehlend} Perioden ohne Beleg` : "vollständig" },
    klaerfaelle: { ok: !(fakten.klaerfaelleOffen > 0), info: fakten.klaerfaelleOffen > 0 ? `${fakten.klaerfaelleOffen} offen` : "keine" },
    zahlungseingaenge: { ok: !!fakten.importVorhanden && !(fakten.eingaengeOffen > 0), info: !fakten.importVorhanden ? "kein Kontoauszug für den Monat importiert" : fakten.eingaengeOffen > 0 ? `${fakten.eingaengeOffen} Buchungen ohne Zuordnung` : "alle zugeordnet" },
    zahlungslaeufe: { ok: !(fakten.zahlungslaeufeOffen > 0), info: fakten.zahlungslaeufeOffen > 0 ? `${fakten.zahlungslaeufeOffen} unbestätigt` : "alle bestätigt" },
    mahnlauf: { ok: !(fakten.mahnungenFaellig > 0), info: fakten.mahnungenFaellig > 0 ? `${fakten.mahnungenFaellig} Mahnungen fällig` : "nichts fällig" },
    pflichtangaben: { ok: !(fakten.pflichtFehlt > 0), info: fakten.pflichtFehlt > 0 ? `${fakten.pflichtFehlt} Belege unvollständig` : "vollständig" },
    export: { ok: !!fakten.exportErstellt, info: fakten.exportErstellt ? `erstellt (${fakten.exportErstellt})` : "noch kein Export für den Monat" },
  };
  const fristen = steuerFristen(monat);
  const punkte = ABSCHLUSS_PUNKTE.map((p) => {
    const m = manuell[p.id] || {};
    const a = auto[p.id];
    // Automatische Punkte können mit Begründung manuell bestätigt werden (z. B. Klärfall bewusst in den Folgemonat)
    const erledigt = a ? a.ok || !!m.erledigt : !!m.erledigt;
    return {
      ...p,
      text: p.id === "ust" ? fristen.map((f) => `${f.land}: ${f.text}`).join(" · ") : p.text,
      erledigt,
      automatisch: a ? a.ok : null,
      info: a?.info || "",
      notiz: m.notiz || "",
      vonName: m.vonName || "",
      am: m.am || "",
      uebersteuert: !!(a && !a.ok && m.erledigt),
    };
  });
  const offen = punkte.filter((p) => p.pflicht && !p.erledigt);
  return { monat, punkte, offen: offen.map((p) => p.titel), bereit: offen.length === 0, erledigt: punkte.filter((p) => p.erledigt).length, gesamt: punkte.length, fristen };
}

// ------------------------------------------------------------------ USt-Verprobung

/**
 * Umsatzsteuer-Verprobung eines Monats als Vorbereitung von UVA/UStVA/MWST-Abrechnung: Summen Netto/Steuer/Brutto
 * je Steuervorlage aus Belegen (nach Rechnungsdatum, auch später stornierte – der Storno zählt in seinem Monat
 * negativ). KEINE Steuermeldung, nur die Zahlen für die Steuerberatung (Soll-Besteuerung nach Rechnungsdatum).
 */
export function ustVerprobung(monat, belege = [], stornos = []) {
  const { von, bis } = monatsZeitraum(monat);
  const im = (d) => d && String(d).slice(0, 10) >= von && String(d).slice(0, 10) <= bis;
  const je = {};
  const zaehle = (vorlageId, netto, steuer, storno) => {
    const id = vorlageId || "ohne";
    const v = STEUERVORLAGEN[id];
    const z = (je[id] ||= { vorlage: id, label: v?.label || "Ohne Steuervorlage", land: v?.land || "", satz: v?.satz ?? null, art: v?.art || "unbekannt", anzahl: 0, stornos: 0, netto: 0, steuer: 0, brutto: 0 });
    z[storno ? "stornos" : "anzahl"]++;
    z.netto = rund2(z.netto + (Number(netto) || 0));
    z.steuer = rund2(z.steuer + (Number(steuer) || 0));
    z.brutto = rund2(z.netto + z.steuer);
  };
  for (const b of belege) if (im(b.rechnungsdatum)) zaehle(b.steuer?.vorlage, b.netto, b.steuer?.betrag, false);
  for (const s of stornos) if (im(s.datum)) zaehle(s.steuer?.vorlage, s.netto, s.steuer?.betrag, true);
  const zeilen = Object.values(je).sort((a, b) => String(a.vorlage).localeCompare(String(b.vorlage)));
  return {
    monat,
    zeilen,
    summen: {
      netto: rund2(zeilen.reduce((s, z) => s + z.netto, 0)),
      steuer: rund2(zeilen.reduce((s, z) => s + z.steuer, 0)),
      brutto: rund2(zeilen.reduce((s, z) => s + z.brutto, 0)),
      belege: zeilen.reduce((s, z) => s + z.anzahl + z.stornos, 0),
    },
    ohneVorlage: je.ohne ? je.ohne.anzahl + je.ohne.stornos : 0,
    hinweis: "Verprobung nach Rechnungsdatum (Soll-Besteuerung) – Grundlage für UVA/UStVA/MWST, keine Steuermeldung. Mit der Steuerberatung abstimmen (Ist-Besteuerung, Vorsteuer und Sonderfälle sind nicht enthalten).",
  };
}
