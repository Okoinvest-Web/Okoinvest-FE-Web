// src/lib/plattform/fach/mitglied.js
//
// Mitglieder: Interesse an der Genossenschaft (im Aufbau – keine Zeichnung, nur Vormerkung) und Teilnahme an
// Energiegemeinschaften DE/AT/CH (Stammdaten über energie.js). Reine Funktionen; Frappe: plattform/fach/mitglied.py.
//
// Ehrlicher Stand: Die Genossenschaft ist im Aufbau. Satzung, Höhe des Geschäftsanteils, Mindestbeteiligung und
// Prüfungsverband stehen noch nicht fest – die Plattform nimmt nur unverbindliche Interessenbekundungen entgegen.

import { GEMEINSCHAFTEN } from "../../invest/markt.js";

export const GENO_STATUS = { text: "im Aufbau", hinweis: "Die Genossenschaft ist in Gründung. Eine Beitrittserklärung ist erst nach Eintragung ins Genossenschaftsregister und Aufnahme in einen Prüfungsverband möglich." };
/** Beispielwert eines Geschäftsanteils (markt.js, ausdrücklich Beispiel – Satzung legt fest) */
export const ANTEIL_BEISPIEL_EUR = GEMEINSCHAFTEN.beteiligung.anteilEur;

export const MITGLIED_ARTEN = { privat: "Privatperson", landwirt: "Landwirt / Flächeneigentümer", unternehmen: "Unternehmen", kommune: "Kommune / öffentliche Hand", verein: "Verein / Initiative" };
export const MITGLIED_INTERESSEN = { beteiligung: "Finanzielle Beteiligung an Solarparks", strom: "Strombezug aus eigenen Anlagen (Energiegemeinschaft)", mitwirkung: "Mitwirkung (Generalversammlung, Projekte vor Ort)", flaeche: "Fläche für ein Projekt einbringen" };

/** Rechtliche Hinweise je Land – vorsichtig formuliert, verbindlich ist allein die Satzung */
export const GENO_HINWEISE = {
  DE: [
    { id: "aufbau", titel: "Genossenschaft im Aufbau", text: GENO_STATUS.hinweis },
    { id: "risiko", titel: "Verlustrisiko und Nachschusspflicht", text: "Geschäftsanteile sind eine unternehmerische Beteiligung – im ungünstigsten Fall ist der eingezahlte Betrag verloren. Ob Mitglieder im Insolvenzfall Nachschüsse leisten müssen, legt die Satzung fest (§ 6 Nr. 3 GenG); bei Energiegenossenschaften wird eine Nachschusspflicht üblicherweise ausgeschlossen." },
    { id: "kuendigung", titel: "Kündigung und Auszahlung", text: "Die Mitgliedschaft kann nur zum Schluss eines Geschäftsjahres gekündigt werden, mit mindestens drei Monaten Frist; die Satzung kann eine längere Frist von bis zu fünf Jahren vorsehen (§ 65 GenG). Das Auseinandersetzungsguthaben wird in der Regel binnen sechs Monaten nach dem Ausscheiden auf Basis des Jahresabschlusses ausgezahlt (§ 73 GenG)." },
    { id: "beratung", titel: "Keine Anlageberatung", text: "ÖkoInvest erbringt keine Anlage- oder Steuerberatung. Informationen auf der Plattform ersetzen nicht die Satzung, die Informationen zur Beteiligung und eine persönliche Beratung." },
  ],
  AT: [
    { id: "aufbau", titel: "Genossenschaft im Aufbau", text: "Die Genossenschaft ist in Gründung. Ein Beitritt ist erst nach Eintragung ins Firmenbuch und Aufnahme in einen Revisionsverband möglich." },
    { id: "risiko", titel: "Verlustrisiko und Haftung", text: "Geschäftsanteile können im ungünstigsten Fall verloren gehen. Bei einer Genossenschaft mit beschränkter Haftung haften Mitglieder nach dem österreichischen Genossenschaftsgesetz im Insolvenzfall in der Regel zusätzlich mit einem Betrag in Höhe ihrer Geschäftsanteile, sofern die Satzung nichts anderes bestimmt – bitte die Satzung prüfen." },
    { id: "kuendigung", titel: "Kündigung und Auszahlung", text: "Kündigungsfristen und Auszahlung regelt die Satzung; üblich ist eine Kündigung zum Ende des Geschäftsjahres." },
    { id: "beratung", titel: "Keine Anlageberatung", text: "ÖkoInvest erbringt keine Anlage- oder Steuerberatung." },
  ],
  CH: [
    { id: "aufbau", titel: "Genossenschaft im Aufbau", text: "Die Genossenschaft ist in Gründung. Ein Beitritt ist erst nach Eintragung ins Handelsregister möglich." },
    { id: "risiko", titel: "Verlustrisiko und Haftung", text: "Für Verbindlichkeiten haftet grundsätzlich nur das Genossenschaftsvermögen; die Statuten können eine persönliche Haftung oder Nachschusspflicht vorsehen (Art. 868 ff. OR)." },
    { id: "kuendigung", titel: "Austritt", text: "Ohne abweichende Regelung in den Statuten ist der Austritt nur auf Schluss des Geschäftsjahres mit einjähriger Kündigungsfrist möglich (Art. 844 OR)." },
    { id: "beratung", titel: "Keine Anlageberatung", text: "ÖkoInvest erbringt keine Anlage- oder Steuerberatung." },
  ],
};
export const GENO_BESTAETIGUNGEN = ["aufbau", "risiko", "kuendigung", "beratung"];

class MitgliedFehler extends Error {
  constructor(msg) {
    super(msg);
    this.status = 422;
  }
}

/** Interessenbekundung Genossenschaft bereinigen/prüfen */
export function genoInteresseBereinigen(d = {}) {
  const land = ["DE", "AT", "CH"].includes(d?.land) ? d.land : "DE";
  const anteile = Number.isFinite(Number(d?.anteile)) ? Math.round(Number(d.anteile)) : NaN;
  if (!(anteile >= 1 && anteile <= 1000)) throw new MitgliedFehler("Bitte geben Sie an, wie viele Anteile Sie voraussichtlich zeichnen möchten (1–1.000).");
  const art = Object.prototype.hasOwnProperty.call(MITGLIED_ARTEN, d?.art) ? d.art : "";
  if (!art) throw new MitgliedFehler("Bitte wählen Sie, als wer Sie beitreten möchten.");
  const interessen = Array.isArray(d?.interessen) ? [...new Set(d.interessen.filter((x) => MITGLIED_INTERESSEN[x]))] : [];
  if (!interessen.length) throw new MitgliedFehler("Bitte wählen Sie mindestens ein Interesse.");
  const best = d?.bestaetigt && typeof d.bestaetigt === "object" ? d.bestaetigt : {};
  const fehlt = GENO_BESTAETIGUNGEN.filter((k) => best[k] !== true);
  if (fehlt.length) throw new MitgliedFehler("Bitte bestätigen Sie, dass Sie die Hinweise zur Genossenschaft gelesen haben.");
  return {
    land,
    anteile,
    betragBeispielEur: anteile * ANTEIL_BEISPIEL_EUR,
    art,
    interessen,
    bestaetigt: Object.fromEntries(GENO_BESTAETIGUNGEN.map((k) => [k, true])),
    bemerkung: String(d?.bemerkung ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 500),
  };
}

export { MitgliedFehler };
