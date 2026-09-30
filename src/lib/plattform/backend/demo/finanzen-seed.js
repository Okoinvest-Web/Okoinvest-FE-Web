// src/lib/plattform/backend/demo/finanzen-seed.js
//
// Demo-Daten „Finanzen & Abrechnung“ (einmalig unter db.finanzen ergänzt, alle Angaben fiktiv):
//   - vier Pachtverträge der Demo-Eigentümer: indexiert (VPI DE, Inbetriebnahme 2023), Umsatzbeteiligung mit
//     Mindestpacht (verknüpft mit der Demo-Freiflächenanlage), Dachpacht monatlich vorschüssig, Agri-PV (AT) in der
//     Reservierungsphase – Eigentümer noch nicht verifiziert (Auszahlung gesperrt)
//   - Gutschriften-Historie, Contracting-Rechnungen der letzten drei Monate (eine überfällig), Provisionsrechnungen
//   - Kostenträger der Projektentwicklung mit Ist-Kosten, Anlagen-Aktivierung (AfA) einer Contracting-Anlage
// Bankverbindungen sind gültig gebildete, fiktive IBANs (Prüfziffer korrekt, kein echtes Konto).

import * as F from "../../finanzen/index.js";
import { neueId } from "./hilfen";
import { laufAusfuehren, SYSTEM_FINANZEN } from "./finanzen-kern";

const email = (db, e) => db.nutzer.find((u) => u.email === e) || null;

export function finanzenSeed(db, { vorab = { anlagen: {} }, heute = F.heute() } = {}) {
  const fl = email(db, "flaeche@example.com");
  const lw = email(db, "landwirt@example.com");
  const un = email(db, "unternehmen@example.com");
  const an = email(db, "anbieter@example.com");
  const fin = db.finanzen;

  // ---------------------------------------------------------------- Stammdaten Zahlungsempfänger (nur, solange das KYC-Modul keine Daten hat)
  if (fl) fin.kycDemo[fl.id] = { status: "verifiziert", bankGeprueft: true, iban: F.ibanBauen("DE", "720501010012345678"), bic: "", kontoinhaber: `${fl.vorname} ${fl.nachname}`, anschrift: "Mühlweg 3, 86836 Musterfeld, Deutschland (Demo)", land: "DE", eigentum: [] };
  if (lw) fin.kycDemo[lw.id] = { status: "eingereicht", bankGeprueft: false, iban: F.ibanBauen("AT", "3400000001234567"), kontoinhaber: `${lw.vorname} ${lw.nachname}`, anschrift: "Hofstraße 7, 5121 Musterdorf, Österreich (Demo)", land: "AT", eigentum: [] };
  if (un) fin.kycDemo[un.id] = { status: "verifiziert", firma: "Muster Logistik GmbH (fiktiv)", anschrift: "Logistikring 1, 86150 Augsburg, Deutschland (Demo)", land: "DE", uid: "DE000000000 (Demo)" };
  if (an) fin.kycDemo[an.id] = { status: "verifiziert", firma: an.firma || "Muster Projektentwicklung GmbH (fiktiv)", anschrift: "Planerstraße 5, 80331 München, Deutschland (Demo)", land: "DE", uid: "DE000000001 (Demo)" };

  const anlage = (name) => (db.anlagen?.anlagen || []).find((a) => a.name === name) || null;
  const werkNord = anlage("Freifläche mit Direktleitung Werk Nord (Demo)");
  const agri = db.flaechen.find((f) => f.bezeichnung === "Agri-PV Schlag Nord (Demo)" && f.nutzerId === lw?.id);
  const t = new Date().toISOString();
  const pt = (d) => ({ id: neueId("PT"), objektArt: "flaeche", flaecheId: null, anlageId: null, index: null, umsatz: null, reservierungJahr: 0, steuervorlage: "", steuerOption: false, kleinunternehmer: false, zahlungszielTage: 14, status: "aktiv", bemerkung: "", erstelltAm: t, geaendertAm: t, ...d });

  if (fl) {
    fin.pachtvertraege.push(
      pt({ eigentuemerId: fl.id, bezeichnung: "Pachtfläche Solarpark Lechfeld (Demo)", land: "DE", flaecheHa: 12, modell: "indexiert", pachtJahr: 33600, index: { reihe: "VPI-DE-2020", basisJahr: 2022, basisIndex: null, schwellePct: 0, anteilPct: 100, nurErhoehung: false }, reservierungJahr: 1800, vertragsdatum: "2022-04-01", beginnArt: "inbetriebnahme", beginn: "2023-07-01", laufzeitJahre: 30, faelligkeit: "jaehrlich", zahlweise: "vorschuessig", bemerkung: "Wertsicherung jährlich, voll. Reservierungsprämie 150 €/ha bis zur Inbetriebnahme. (Demo)" }),
      pt({ eigentuemerId: fl.id, bezeichnung: "Dachfläche Hofhalle (Demo)", objektArt: "dach", land: "DE", flaecheHa: 0, modell: "fest", pachtJahr: 4800, vertragsdatum: "2024-02-01", beginnArt: "inbetriebnahme", beginn: "2024-05-01", laufzeitJahre: 20, faelligkeit: "monatlich", zahlweise: "vorschuessig", zahlungszielTage: 5, steuerOption: true, bemerkung: "Eigentümer hat zur Umsatzsteuer optiert (Erklärung liegt vor). (Demo)" })
    );
    if (werkNord) fin.pachtvertraege.push(pt({ eigentuemerId: fl.id, bezeichnung: "Pachtfläche Werk Nord – Umsatzmodell (Demo)", land: "DE", flaecheHa: 5, anlageId: werkNord.id, modell: "umsatz", pachtJahr: 0, umsatz: { anteil: 0.05, erloesCtKwh: 7.5, mindestJahr: 9000 }, vertragsdatum: "2025-06-01", beginnArt: "inbetriebnahme", beginn: "2025-10-01", laufzeitJahre: 25, faelligkeit: "quartalsweise", zahlweise: "nachschuessig", bemerkung: "5 % der Stromerlöse (vereinbarter Erlös 7,5 ct/kWh), mindestens 1.800 €/ha. (Demo)" }));
  }
  if (lw) fin.pachtvertraege.push(pt({ eigentuemerId: lw.id, bezeichnung: "Agri-PV Schlag Nord (Demo)", flaecheId: agri?.id || null, land: "AT", flaecheHa: 9.8, modell: "indexiert", pachtJahr: 11760, index: { reihe: "VPI-AT-2020", basisJahr: 2025, basisIndex: null, schwellePct: 5, anteilPct: 100, nurErhoehung: false }, reservierungJahr: 1960, vertragsdatum: "2026-01-01", beginnArt: "baubeginn", beginn: "", laufzeitJahre: 25, faelligkeit: "halbjaehrlich", zahlweise: "nachschuessig", bemerkung: "Reservierungsprämie 200 €/ha bis Baubeginn; Wertsicherung ab 5 % Indexänderung. (Demo)" }));

  // ---------------------------------------------------------------- Historie: Pacht monatsweise nachfahren (Rechnungsdatum = Stichtag)
  const ohneMeldung = { melden: false };
  for (let j = 2023; j <= Number(heute.slice(0, 4)); j++) {
    for (let m = 1; m <= 12; m++) {
      const stichtag = `${j}-${String(m).padStart(2, "0")}-01`;
      if (stichtag > heute) break;
      laufAusfuehren(db, SYSTEM_FINANZEN, { art: "pacht", stichtag, rechnungsdatum: stichtag, vorab, ...ohneMeldung });
    }
  }
  laufAusfuehren(db, SYSTEM_FINANZEN, { art: "pacht", stichtag: heute, rechnungsdatum: heute, vorab, ...ohneMeldung });

  // Contracting: drei Vormonate
  const monat0 = heute.slice(0, 7);
  const m1 = F.vormonat(monat0);
  const m2 = F.vormonat(m1);
  const m3 = F.vormonat(m2);
  for (const [monat, rd] of [[m3, F.plusTage(F.monatsZeitraum(m2).von, 4)], [m2, F.plusTage(F.monatsZeitraum(m1).von, 4)], [m1, F.plusTage(heute, -10)]]) {
    laufAusfuehren(db, SYSTEM_FINANZEN, { art: "contracting", stichtag: rd, monat, rechnungsdatum: rd, vorab, ...ohneMeldung });
  }
  // Provisionen (bereits verkaufte Demo-Projekte)
  laufAusfuehren(db, SYSTEM_FINANZEN, { art: "provision", stichtag: F.plusTage(heute, -20), rechnungsdatum: F.plusTage(heute, -20), ...ohneMeldung });

  // Zahlungsstatus: Älteres ist bezahlt; offen bleiben aktuelle Belege, eine überfällige Contracting-Rechnung und
  // die Gutschrift des (noch nicht verifizierten) Landwirts
  const grenze = F.plusTage(heute, -20);
  let ueberfaellig = false;
  for (const b of fin.belege) {
    const kyc = b.art === "pacht" ? fin.kycDemo[b.empfaengerId] : null;
    if (b.art === "pacht" && kyc?.status !== "verifiziert") continue;
    if (b.art === "provision") continue;
    if (b.art === "contracting" && b.bezug?.monat === m2 && !ueberfaellig) {
      ueberfaellig = true;
      continue;
    }
    if (b.faelligAm < grenze) {
      b.status = "bezahlt";
      b.bezahltAm = b.art === "pacht" ? F.plusTage(b.faelligAm, -1) : F.plusTage(b.faelligAm, -3);
    }
  }
  for (const b of fin.belege) b.erstelltAm = `${b.rechnungsdatum}T08:00:00.000Z`;

  // ---------------------------------------------------------------- Anlagenbuchhaltung, Projektcontrolling
  if (werkNord) fin.assets.push({ id: neueId("AA"), anlageId: werkNord.id, anschaffungswert: 2940000, nutzungsdauerJahre: 20, inbetriebnahme: werkNord.inbetriebnahme || "2022-08-01", regel: "DE", erpnextAsset: null, bemerkung: "Aktivierung inkl. Direktleitung (Demo)", erstelltAm: t });
  const kt1 = { id: neueId("KT"), bezeichnung: "Entwicklung Freifläche Schwaben 12 MWp (Demo)", mwp: 12, budget: 240000, kostenstelle: "Projektentwicklung", erpnextProject: null, erstelltAm: t };
  const kt2 = { id: neueId("KT"), bezeichnung: "Entwicklung Agri-PV Innviertel 6 MWp (Demo)", mwp: 6, budget: 150000, kostenstelle: "Projektentwicklung", erpnextProject: null, erstelltAm: t };
  fin.kostentraeger.push(kt1, kt2);
  const k = (kt, kostenart, betrag, datum, beschreibung, quelle = "Eingangsrechnung") => fin.kosten.push({ id: neueId("PK"), projektId: kt.id, kostenart, betrag, datum, beleg: `ER-${datum.replace(/-/g, "").slice(2)}`, beschreibung, quelle, erstelltAm: t });
  k(kt1, "planung", 38500, "2025-11-12", "Vorentwurf und Lageplan (Demo)");
  k(kt1, "netz", 24000, "2026-01-20", "Netzverträglichkeitsprüfung (Demo)");
  k(kt1, "genehmigung", 61200, "2026-03-05", "Umweltgutachten und Artenschutz (Demo)");
  k(kt1, "flaeche", 21600, "2026-04-01", "Reservierungsprämien 2025/26 (Demo)", "Journalbuchung");
  k(kt1, "personal", 52800, "2026-08-31", "Projektleitung 440 h (Demo)", "Zeiterfassung");
  k(kt2, "planung", 18400, "2026-02-10", "Agri-PV-Konzept nach DIN SPEC 91434 (Demo)");
  k(kt2, "genehmigung", 9500, "2026-06-18", "Umwidmung Grünland-PV, Verfahrenskosten (Demo)");
  k(kt2, "personal", 21600, "2026-08-31", "Projektleitung 180 h (Demo)", "Zeiterfassung");
}
