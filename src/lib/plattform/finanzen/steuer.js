// src/lib/plattform/finanzen/steuer.js
//
// Umsatzsteuer je Land und Vorgang als KONFIGURIERBARE VORLAGEN – reine Funktionen.
//
// WICHTIG: Die Zuordnung ist ein Vorschlag nach aktuellem Stand und ersetzt keine Steuerberatung. Jede Vorlage trägt
// den Hinweis „mit Steuerberatung abstimmen“; je Vertrag/Beleg kann das Backoffice eine andere Vorlage wählen.
// In ERPNext entsprechen die Vorlagen „Sales/Purchase Taxes and Charges Template“ (Setup-Assistent legt sie an).
//
// Leistender/Empfänger aus Sicht der ÖkoInvest GmbH (Sitz Österreich):
//   pacht        Eigentümer verpachtet an ÖkoInvest → Gutschrift (Leistungsort: Lage des Grundstücks)
//   contracting  ÖkoInvest liefert Strom an ein Unternehmen (Lieferort in der Regel: Ort des Verbrauchs)
//   provision    ÖkoInvest erbringt eine Vermittlungsleistung an den Anbieter (B2B-Grundregel: Sitz des Empfängers;
//                bei Grundstücksbezug kann der Leistungsort am Grundstück liegen)

import { HINWEIS_STEUERBERATUNG } from "./konstanten.js";
import { rund2 } from "./basis.js";

export const STEUERVORLAGEN = {
  "AT-USt-20": { land: "AT", satz: 0.2, art: "ust", label: "AT Umsatzsteuer 20 %", text: "", rechtsgrundlage: "§ 10 Abs. 1 UStG 1994" },
  "AT-Pacht-frei": { land: "AT", satz: 0, art: "steuerfrei", label: "AT Pacht steuerfrei (Grundstück)", text: "Steuerfreie Grundstücksvermietung gemäß § 6 Abs. 1 Z 16 UStG 1994.", rechtsgrundlage: "§ 6 Abs. 1 Z 16 UStG 1994" },
  "AT-Pacht-Option": { land: "AT", satz: 0.2, art: "ust", label: "AT Pacht mit Option zur Steuerpflicht 20 %", text: "Option zur Steuerpflicht gemäß § 6 Abs. 2 UStG 1994.", rechtsgrundlage: "§ 6 Abs. 2 UStG 1994" },
  "AT-Kleinunternehmer": { land: "AT", satz: 0, art: "kleinunternehmer", label: "AT Kleinunternehmer (ohne USt)", text: "Umsatzsteuerbefreit – Kleinunternehmer gemäß § 6 Abs. 1 Z 27 UStG 1994.", rechtsgrundlage: "§ 6 Abs. 1 Z 27 UStG 1994" },
  "AT-RC-EU": { land: "AT", satz: 0, art: "reverse_charge", label: "Reverse Charge EU (B2B-Dienstleistung)", text: "Übergang der Steuerschuld auf den Leistungsempfänger (Reverse Charge). UID des Empfängers siehe oben.", rechtsgrundlage: "§ 3a Abs. 6 UStG 1994, Art. 196 MwSt-Richtlinie" },
  "AT-Drittland": { land: "AT", satz: 0, art: "nicht_steuerbar", label: "Nicht steuerbar in AT (Drittland)", text: "Nicht im Inland steuerbare Leistung (Leistungsort beim Empfänger im Drittland).", rechtsgrundlage: "§ 3a Abs. 6 UStG 1994" },
  "DE-USt-19": { land: "DE", satz: 0.19, art: "ust", label: "DE Umsatzsteuer 19 %", text: "", rechtsgrundlage: "§ 12 Abs. 1 UStG" },
  "DE-Pacht-frei": { land: "DE", satz: 0, art: "steuerfrei", label: "DE Pacht steuerfrei (Grundstück)", text: "Steuerfreie Verpachtung gemäß § 4 Nr. 12 Buchst. a UStG.", rechtsgrundlage: "§ 4 Nr. 12 Buchst. a UStG" },
  "DE-Pacht-Option": { land: "DE", satz: 0.19, art: "ust", label: "DE Pacht mit Option zur Steuerpflicht 19 %", text: "Verzicht auf die Steuerbefreiung gemäß § 9 UStG.", rechtsgrundlage: "§ 9 UStG" },
  "DE-Kleinunternehmer": { land: "DE", satz: 0, art: "kleinunternehmer", label: "DE Kleinunternehmer (ohne USt)", text: "Steuerfreier Umsatz nach § 19 Abs. 1 UStG (Kleinunternehmer).", rechtsgrundlage: "§ 19 UStG" },
  "DE-RC-13b": { land: "DE", satz: 0, art: "reverse_charge", label: "DE Steuerschuldnerschaft des Leistungsempfängers", text: "Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG).", rechtsgrundlage: "§ 13b Abs. 2 Nr. 5 Buchst. a UStG (Elektrizität durch im Ausland ansässigen Unternehmer)" },
  "CH-MWST-81": { land: "CH", satz: 0.081, art: "ust", label: "CH MWST 8,1 %", text: "", rechtsgrundlage: "Art. 25 MWSTG" },
  "CH-Pacht-ausgenommen": { land: "CH", satz: 0, art: "steuerfrei", label: "CH Pacht von der MWST ausgenommen", text: "Von der Steuer ausgenommene Überlassung von Grundstücken (Art. 21 Abs. 2 Ziff. 21 MWSTG).", rechtsgrundlage: "Art. 21 Abs. 2 Ziff. 21 MWSTG" },
  "CH-Pacht-Option": { land: "CH", satz: 0.081, art: "ust", label: "CH Pacht mit Option 8,1 %", text: "Option für die Versteuerung gemäß Art. 22 MWSTG.", rechtsgrundlage: "Art. 22 MWSTG" },
};

/**
 * Vorschlag der Steuervorlage.
 * vorgang: pacht | contracting | provision
 * land:    pacht = Lage des Grundstücks; contracting = Land der Anlage (Verbrauch); provision = Sitz des Anbieters
 * optionen: { option (Pacht: Option zur Steuerpflicht), kleinunternehmer (Eigentümer), grundstuecksbezug (Provision) }
 * Rückgabe { vorlage, hinweise[] }
 */
export function steuerVorschlag(vorgang, land, { option = false, kleinunternehmer = false, grundstuecksbezug = false } = {}) {
  const L = ["AT", "DE", "CH"].includes(land) ? land : "AT";
  const hinweise = [HINWEIS_STEUERBERATUNG];
  if (vorgang === "pacht") {
    if (kleinunternehmer && L !== "CH") return { vorlage: `${L}-Kleinunternehmer`, hinweise };
    if (option) {
      hinweise.push(L === "DE" ? "Option nach § 9 UStG nur, wenn der Pächter das Grundstück für steuerpflichtige Umsätze nutzt – Erklärung des Eigentümers erforderlich." : "Option zur Steuerpflicht nur mit ausdrücklicher Erklärung des Eigentümers.");
      return { vorlage: `${L}-Pacht-Option`, hinweise };
    }
    if (L !== "AT") hinweise.push("Grundstück außerhalb Österreichs: Leistungsort ist die Lage des Grundstücks – ggf. Registrierung/Vorsteuervergütung prüfen.");
    return { vorlage: L === "CH" ? "CH-Pacht-ausgenommen" : `${L}-Pacht-frei`, hinweise };
  }
  if (vorgang === "contracting") {
    if (L === "AT") return { vorlage: "AT-USt-20", hinweise };
    if (L === "DE") {
      hinweise.push("Stromlieferung an ein Unternehmen in Deutschland durch einen im Ausland ansässigen Unternehmer: Steuerschuld geht nach § 13b UStG über – entfällt, wenn eine deutsche Betriebsstätte beteiligt ist.");
      return { vorlage: "DE-RC-13b", hinweise };
    }
    hinweise.push("Lieferung in der Schweiz: MWST-Pflicht in der Schweiz (Registrierung/Steuervertretung) prüfen.");
    return { vorlage: "CH-MWST-81", hinweise };
  }
  // provision
  if (grundstuecksbezug) hinweise.push("Vermittlung mit Grundstücksbezug: Leistungsort kann am Grundstück liegen (Art. 31a MwSt-Durchführungsverordnung).");
  if (L === "AT") return { vorlage: "AT-USt-20", hinweise };
  if (L === "CH") return { vorlage: "AT-Drittland", hinweise };
  hinweise.push("Reverse Charge nur mit gültiger UID des Empfängers (Stufe-2-Abfrage) und Angabe beider UID auf der Rechnung.");
  return { vorlage: "AT-RC-EU", hinweise };
}

/** Steuer auf einen Nettobetrag nach Vorlage (unbekannte Vorlage → 0 % mit Hinweis) */
export function steuerBerechnen(netto, vorlageId, vorlagen = STEUERVORLAGEN) {
  const v = vorlagen[vorlageId];
  const n = rund2(netto);
  if (!v) return { vorlage: vorlageId || null, label: "Keine Steuervorlage", satz: 0, art: "unbekannt", betrag: 0, netto: n, brutto: n, text: "Steuerliche Behandlung ungeklärt – bitte Steuervorlage wählen.", rechtsgrundlage: "" };
  const betrag = rund2(n * v.satz);
  return { vorlage: vorlageId, label: v.label, satz: v.satz, art: v.art, betrag, netto: n, brutto: rund2(n + betrag), text: v.text, rechtsgrundlage: v.rechtsgrundlage };
}

/**
 * Kleinbetragsrechnungen: erleichterte Pflichtangaben bis zur Bruttogrenze (DE § 33 UStDV 250 €,
 * AT § 11 Abs. 6 UStG 1994 400 €). Gilt NICHT bei Reverse Charge / nicht steuerbaren Leistungen
 * (DE § 33 Satz 2 UStDV; AT: Übergang der Steuerschuld verlangt die volle Rechnung) und nicht für
 * Gutschriften (Gutschriftsverfahren). CH (Art. 26 Abs. 3 MWSTG, 400 CHF) ist nicht abgebildet.
 */
export const KLEINBETRAG_GRENZEN = {
  AT: { betrag: 400, norm: "§ 11 Abs. 6 UStG 1994" },
  DE: { betrag: 250, norm: "§ 33 UStDV" },
};

/** { kleinbetrag, grenze, norm } – ob der Beleg als Kleinbetragsrechnung gilt */
export function kleinbetragInfo(beleg = {}) {
  const g = KLEINBETRAG_GRENZEN[beleg.aussteller?.land];
  const brutto = Number(beleg.brutto);
  const art = beleg.steuer?.art;
  const kleinbetrag = !!g && beleg.beleg !== "gutschrift" && Number.isFinite(brutto) && brutto > 0 && brutto <= g.betrag
    && !["reverse_charge", "nicht_steuerbar"].includes(art);
  return { kleinbetrag, grenze: g?.betrag ?? null, norm: g?.norm ?? "" };
}

/**
 * Pflichtangaben einer Rechnung/Gutschrift (§ 14 Abs. 4 UStG DE, § 11 Abs. 1 UStG 1994 AT; Gutschrift § 14 Abs. 2
 * UStG bzw. § 11 Abs. 7 UStG 1994) – prüft einen Beleg und liefert fehlende Punkte (leere Liste = vollständig).
 * Kleinbetragsrechnungen (siehe KLEINBETRAG_GRENZEN) brauchen keine Empfängerangaben, in DE keinen Leistungszeitraum.
 */
export function pflichtangabenPruefen(beleg) {
  const fehlt = [];
  const a = beleg.aussteller || {};
  const e = beleg.empfaenger || {};
  const { kleinbetrag } = kleinbetragInfo(beleg);
  if (!a.name || !a.anschrift) fehlt.push("Name und Anschrift des leistenden Unternehmers");
  if (!kleinbetrag && !e.name) fehlt.push("Name des Leistungsempfängers");
  if (!kleinbetrag && !e.anschrift) fehlt.push("Anschrift des Leistungsempfängers");
  if (!kleinbetrag && !a.uid && !a.steuernummer && beleg.art !== "pacht") fehlt.push("UID bzw. Steuernummer des Ausstellers");
  if (!beleg.nummer) fehlt.push("Fortlaufende Rechnungsnummer");
  if (!beleg.rechnungsdatum) fehlt.push("Ausstellungsdatum");
  if (!(kleinbetrag && a.land === "DE") && (!beleg.zeitraum?.von || !beleg.zeitraum?.bis)) fehlt.push("Leistungszeitraum");
  if (!beleg.positionen?.length) fehlt.push("Menge und Art der Leistung");
  if (!Number.isFinite(Number(beleg.netto))) fehlt.push("Entgelt (netto)");
  if (!beleg.steuer?.vorlage) fehlt.push("Steuersatz bzw. Hinweis auf Steuerbefreiung");
  if (beleg.steuer && beleg.steuer.satz === 0 && !beleg.steuer.text) fehlt.push("Hinweis auf Steuerbefreiung / Reverse Charge");
  if (beleg.steuer?.art === "reverse_charge" && !e.uid) fehlt.push("UID des Leistungsempfängers (Reverse Charge)");
  if (beleg.beleg === "gutschrift" && !/gutschrift/i.test(beleg.titel || "")) fehlt.push("Bezeichnung „Gutschrift“");
  // AT: Rechnungen über 10.000 € brutto brauchen die UID des Empfängers (§ 11 Abs. 1 Z 3 lit. i UStG 1994)
  if (beleg.aussteller?.land === "AT" && Number(beleg.brutto) > 10000 && beleg.beleg !== "gutschrift" && !e.uid) fehlt.push("UID des Empfängers (AT: Rechnungsbetrag über 10.000 €)");
  return fehlt;
}
