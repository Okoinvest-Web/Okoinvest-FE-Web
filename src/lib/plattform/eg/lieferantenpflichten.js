// src/lib/plattform/eg/lieferantenpflichten.js
//
// WP5 – Lieferantenpflichten nach § 69 ElWG für Gemeinschaften mit Erzeugungsanlagen über 100 kW (Haushalte über 30 kW):
// Schwelle (über eg/anlage.js erzeugungsleistung, inkl. Prognose mit geplanten Anlagen), Pflichten-Checkliste mit Status
// (AGB, Informationsblatt vor Vertragsabschluss, Rechnungsinhalte, Wahl Monats-/Jahresrechnung, kostenlose Rechnung,
// Änderungsinformation einen Monat vorher) und Übernahme durch ÖkoInvest als Organisator (§ 68 Abs. 2, § 69 Abs. 4).
// Quellen: Fachkonzept 0 Punkt 4, 1.2, 2.4, 2.5, 6.1 Punkt 8; Marktanalyse 1.5. Auslegung der Schwelle (Summe aller
// Anlagen bzw. der Haushaltsanlagen) wie WP1 (eg/anlage.js) – (zu bestätigen).
// Reine Funktionen; Python-Spiegel plattform/eg_gruendung_kern.py (Testvektoren eg/testdaten/gruendung/lieferantenpflichten.json).

import { LIEFERANTENPFLICHT_KW } from "./modell.js";
import { erzeugungsleistung } from "./anlage.js";
import { tageBis } from "./gruendung.js";

export const AENDERUNG_VORLAUF_TAGE = 30; // „mindestens einen Monat“ (§ 21 ElWG laut Fachkonzept 6.1) – als 30 Tage gerechnet (zu bestätigen)

/**
 * Pflichten prüfen.
 * @param {{modell?:string, anlagen?:object[], organisator?:boolean, organisatorAngezeigtAm?:string, dokumente?:{vorlage:string, stand:string}[],
 *          mitglieder?:object[], tarife?:object[], heute:string}} k
 */
export function lieferantenpflichten({ anlagen = [], organisator = false, organisatorAngezeigtAm = "", dokumente = [], mitglieder = [], tarife = [], heute = "" } = {}) {
  const ist = erzeugungsleistung(anlagen);
  const prognose = erzeugungsleistung(anlagen.map((a) => (a.status === "geplant" ? { ...a, status: "aktiv" } : a)));
  const pflicht = ist.lieferantenpflichten;
  const bald = !pflicht && prognose.lieferantenpflichten;
  const hat = (v) => dokumente.find((d) => d.vorlage === v && String(d.stand || "") >= "2026-10-01") || null;
  const aktiv = mitglieder.filter((m) => ["aufgenommen", "aktiv"].includes(m.status));
  const ohneRhythmus = aktiv.filter((m) => !m.abrechnungsrhythmus).length;
  const knapp = tarife.filter((t) => ["entwurf", "beschlossen"].includes(t.status) && t.gueltigAb && heute && tageBis(heute, t.gueltigAb) < AENDERUNG_VORLAUF_TAGE && tageBis(heute, t.gueltigAb) >= 0);
  const pfl = (id, titel, quelle, erfuellt, hinweis, vorlage = "") => ({ id, titel, quelle, erfuellt: !!erfuellt, hinweis, vorlage, status: !pflicht && !bald ? "nicht_noetig" : erfuellt ? "erfuellt" : "offen" });
  const liste = [
    pfl("agb", "Allgemeine Lieferbedingungen (AGB)", "ElWG § 69 Abs. 1 Z 1 mit § 20", hat("agb"), hat("agb") ? `Stand ${hat("agb").stand.split("-").reverse().join(".")}` : "Vorlage „Allgemeine Lieferbedingungen“ erzeugen und beschließen.", "agb"),
    pfl("informationsblatt", "Informationsblatt vor Vertragsabschluss", "ElWG § 69 Abs. 1 Z 2", hat("informationsblatt"), "Im Beitrittsprozess (WP6) vor der Unterschrift anzeigen.", "informationsblatt"),
    pfl("rechnung", "Rechnung nach § 42 mit Pflichtinhalten (Betrag, Fälligkeit, Energiewerte, Vertragspartner, Zählpunktbezeichnung)", "ElWG § 69 Abs. 1 Z 4, § 42", true, "Belege der Abrechnung (WP4) enthalten die Pflichtinhalte."),
    pfl("rhythmus", "Wahl zwischen Monats- und Jahresrechnung", "ElWG § 69 Abs. 3", ohneRhythmus === 0, ohneRhythmus ? `${ohneRhythmus} aktive Mitglied(er) ohne gewählten Rhythmus – Massenaktion „Abrechnungsrhythmus“ (WP1).` : "Für alle aktiven Mitglieder erfasst."),
    pfl("kostenlos", "Rechnung mindestens jährlich kostenlos, Erläuterung auf Verlangen", "ElWG § 69 Abs. 1 Z 5–6", true, "Erläuterungsseite je Beleg (WP4/WP6)."),
    pfl("aenderung", "Änderungsinformation mindestens einen Monat vor Wirksamkeit", "ElWG § 21 (laut Fachkonzept 6.1)", knapp.length === 0, knapp.length ? `Tarif ab ${knapp[0].gueltigAb.split("-").reverse().join(".")} – Vorlauf unter einem Monat.` : "Keine Tarifänderung mit zu kurzem Vorlauf."),
    pfl("organisator", "Übernahme der Pflichten durch den Organisator", "ElWG § 68 Abs. 2, § 69 Abs. 4", organisator && !!organisatorAngezeigtAm, organisator ? (organisatorAngezeigtAm ? "ÖkoInvest ist Organisator und angezeigt." : "Organisator bestellt – Anzeige an den Netzbetreiber fehlt.") : "Optional: ÖkoInvest übernimmt die Pflichten als Organisator.", "vollmacht_organisator"),
  ];
  liste[6].pflichtpunkt = false;
  return {
    pflicht, bald, gesamtKw: ist.gesamtKw, haushaltKw: ist.haushaltKw, prognoseKw: prognose.gesamtKw, schwelle: LIEFERANTENPFLICHT_KW,
    grund: pflicht ? `Erzeugungsleistung ${ist.gesamtKw} kW (Haushalte ${ist.haushaltKw} kW) – Schwelle über ${LIEFERANTENPFLICHT_KW.allgemein} kW bzw. ${LIEFERANTENPFLICHT_KW.haushalt} kW überschritten.` : bald ? `Mit den geplanten Anlagen ${prognose.gesamtKw} kW – die Schwelle wird voraussichtlich überschritten. Pflichten vorbereiten.` : `Erzeugungsleistung ${ist.gesamtKw} kW – unter der Schwelle.`,
    pflichten: liste, offen: liste.filter((x) => x.status === "offen" && x.pflichtpunkt !== false).length,
    quelle: "ElWG §§ 68–69; Fachkonzept 1.2, 6.1 Punkt 8",
  };
}
