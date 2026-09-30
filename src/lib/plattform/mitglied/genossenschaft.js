// src/lib/plattform/mitglied/genossenschaft.js
//
// Mitgliederbereich Genossenschaft (DE eG nach GenG, AT eGen nach GenG AT, CH Genossenschaft nach Art. 828 ff. OR):
// Stammdaten der Genossenschaft (Backoffice), Beitrittserklärung, Zulassung, Einzahlung, Geschäftsguthaben, weitere Anteile,
// Kündigung (ganz/teilweise) mit Stichtag und Auszahlungsfrist, Übertragung von Geschäftsguthaben, Ausschüttungen
// (Dividende auf Geschäftsguthaben mit Steuerabzug bzw. Rückvergütung nach Umsatz).
//
// Reine Funktionen, client- und serverseitig nutzbar. Frappe: plattform/mitglied_kern.py (1:1).
// Ehrlicher Stand: Solange eine Genossenschaft „im Aufbau“ ist, gibt es nur die unverbindliche Vormerkung
// (fach/mitglied.js). Beitritt erst, wenn das Backoffice die Eintragung (Register, Prüfungs-/Revisionsverband) hinterlegt.
// KEINE Anlage-, Rechts- oder Steuerberatung – Texte und PDFs sind Muster; verbindlich ist die Satzung.

import { GEMEINSCHAFTEN } from "../../invest/markt.js";
import { MitgliedFehler, auswahl, datum, fehler, ganz, iban, konfliktFehler, mehrzeilig, plusMonate, rund2, text, wahr, zahl } from "./basis.js";

export { MitgliedFehler };

export const STEUER_ABZUG = GEMEINSCHAFTEN.steuerAbzug;

export const GENO_REGISTER = {
  aufbau: { label: "im Aufbau", ton: "warn", text: "Die Genossenschaft ist in Gründung – derzeit nur unverbindliche Vormerkung, keine Zeichnung." },
  eingetragen: { label: "eingetragen – Beitritt möglich", ton: "ok", text: "Die Genossenschaft ist eingetragen und nimmt Beitrittserklärungen entgegen." },
  geschlossen: { label: "Beitritt derzeit geschlossen", ton: "neutral", text: "Derzeit werden keine neuen Mitglieder aufgenommen (z. B. Kapitalbedarf gedeckt)." },
};
export const RECHTSFORM = { DE: "eG", AT: "eGen", CH: "Genossenschaft" };
export const REGISTER_NAME = { DE: "Genossenschaftsregister", AT: "Firmenbuch", CH: "Handelsregister" };
export const VERBAND_NAME = { DE: "Prüfungsverband (§ 54 GenG)", AT: "Revisionsverband (GenRevG 1997)", CH: "Revisionsstelle (Art. 906 OR)" };
export const NACHSCHUSS = { ausgeschlossen: "Nachschusspflicht ausgeschlossen", beschraenkt: "Nachschusspflicht beschränkt auf eine Haftsumme", unbeschraenkt: "Unbeschränkte Nachschusspflicht" };

export const MITGLIED_STATUS = {
  erklaert: { label: "Beitrittserklärung eingegangen", ton: "info" },
  zugelassen: { label: "Zugelassen – Einzahlung offen", ton: "warn" },
  aktiv: { label: "Mitglied", ton: "ok" },
  ausgeschieden: { label: "Ausgeschieden", ton: "neutral" },
  abgelehnt: { label: "Beitritt nicht zugelassen", ton: "neutral" },
  zurueckgezogen: { label: "Erklärung zurückgezogen", ton: "neutral" },
};
/** Mitglieder mit Stimmrecht und Anspruch auf Ausschüttung */
export const MITGLIED_AKTIV = ["aktiv"];

export const MITGLIED_ARTEN = { privat: "Privatperson", landwirt: "Landwirt / Flächeneigentümer", unternehmen: "Unternehmen", kommune: "Kommune / öffentliche Hand", verein: "Verein / Initiative" };
const ORGANISATION = ["unternehmen", "kommune", "verein"];
export const ANREDEN = { frau: "Frau", herr: "Herr", divers: "Divers", firma: "Firma" };

export const KUENDIGUNG_STATUS = { eingereicht: "Eingereicht", bestaetigt: "Bestätigt", wirksam: "Wirksam – Auszahlung offen", ausgezahlt: "Ausgezahlt", zurueckgenommen: "Zurückgenommen" };
export const UEBERTRAGUNG_STATUS = { angefragt: "Wartet auf Annahme", angenommen: "Angenommen – Zustimmung des Vorstands offen", genehmigt: "Übertragen", abgelehnt: "Abgelehnt" };
export const ZEICHNUNG_STATUS = { beantragt: "Beantragt", zugelassen: "Zugelassen", abgelehnt: "Abgelehnt" };
export const AUSSCHUETTUNG_ARTEN = { dividende: "Dividende auf das Geschäftsguthaben", rueckverguetung: "Rückvergütung nach Strombezug" };
export const AUSSCHUETTUNG_STATUS = { entwurf: "Entwurf (Vorschlag)", beschlossen: "Beschlossen", ausgezahlt: "Ausgezahlt" };

/** Pflichtbestätigungen der Beitrittserklärung je Land (Nachschuss nur bei Nachschusspflicht) */
export function beitrittHinweise(geno) {
  const land = geno?.land || "DE";
  const satzung = geno?.satzungStand ? ` (Stand ${String(geno.satzungStand).split("-").reverse().join(".")})` : "";
  const h = [
    { id: "satzung", text: `Ich habe die Satzung${satzung} erhalten und gelesen. Die Satzung ist für meine Mitgliedschaft verbindlich.` },
    {
      id: "einzahlung",
      text: land === "DE"
        ? "Ich verpflichte mich, die nach Gesetz und Satzung geschuldeten Einzahlungen auf den Geschäftsanteil bzw. die Geschäftsanteile zu leisten (§ 15a GenG)."
        : "Ich verpflichte mich, die nach Gesetz und Satzung geschuldeten Einzahlungen auf die gezeichneten Geschäftsanteile fristgerecht zu leisten.",
    },
    { id: "risiko", text: "Mir ist bewusst, dass Geschäftsanteile eine unternehmerische Beteiligung sind: Es gibt keine Einlagensicherung, Ausschüttungen sind nicht garantiert und im ungünstigsten Fall kann das eingezahlte Geld verloren gehen." },
    { id: "beratung", text: "ÖkoInvest und die Genossenschaft erbringen keine Anlage-, Rechts- oder Steuerberatung. Ich entscheide auf Grundlage der Satzung und der Informationen zur Beteiligung selbst." },
    {
      id: "mitgliederliste",
      text: land === "DE"
        ? "Ich bin einverstanden, dass meine Angaben in die Mitgliederliste aufgenommen werden (§ 30 GenG); Mitglieder können nach § 31 GenG Einsicht in ihre eigenen Daten verlangen."
        : "Ich bin einverstanden, dass meine Angaben in das Mitgliederverzeichnis der Genossenschaft aufgenommen werden.",
    },
  ];
  if (geno?.nachschusspflicht && geno.nachschusspflicht !== "ausgeschlossen") {
    h.splice(2, 0, {
      id: "nachschuss",
      text: geno.nachschusspflicht === "beschraenkt"
        ? `Die Satzung sieht Nachschüsse zur Insolvenzmasse bis zu einer Haftsumme von ${fmtEur(geno.haftsummeEur || 0)} je Geschäftsanteil vor. Ich verpflichte mich, diese Nachschüsse im Insolvenzfall zu leisten.`
        : "Die Satzung sieht eine unbeschränkte Nachschusspflicht zur Insolvenzmasse vor. Ich verpflichte mich, die zur Befriedigung der Gläubiger erforderlichen Nachschüsse zu leisten.",
    });
  }
  return h;
}
export const beitrittBestaetigungen = (geno) => beitrittHinweise(geno).map((h) => h.id);

/** Offene Rechtspunkte – im Backoffice sichtbar, vor dem ersten echten Beitritt anwaltlich zu klären */
export const RECHT_OFFEN = [
  { id: "prospekt", titel: "Prospekt- und Informationspflichten", text: "DE: Genossenschaftsanteile sind nach § 2 Abs. 1 Nr. 1 VermAnlG nur dann von der Prospektpflicht ausgenommen, wenn für den Vertrieb keine erfolgsabhängige Vergütung gezahlt wird – Plattform-Vergütung prüfen. AT: KMG 2019 bzw. AltFG (Schwellenwerte, Informationsblatt). CH: FIDLEG (Prospektpflicht und Ausnahmen). Bis zur Klärung: keine öffentliche Werbung für die Zeichnung, nur Information der Interessenten." },
  { id: "form", titel: "Form der Beitrittserklärung", text: "Nach § 15 GenG (DE) bzw. Satzung ist die Beitrittserklärung zu unterzeichnen. Ob eine elektronische Erklärung (Textform/qualifizierte elektronische Signatur) genügt, ist zu prüfen. Bis dahin: Erklärung im Portal ausfüllen, als PDF drucken, unterschreiben und hochladen bzw. einsenden – der Vorstand lässt erst nach Eingang der Unterschrift zu." },
  { id: "online_gv", titel: "Online-Generalversammlung und elektronische Abstimmung", text: "Nur zulässig, wenn die Satzung sie vorsieht (DE § 43b GenG; AT und CH nach Gesetz und Statuten, nach aktuellem Stand mit Satzungsgrundlage). Einladungsfristen und Beschlussmehrheiten laut Satzung." },
  { id: "gwg", titel: "Geldwäsche und Identifizierung", text: "Ob und in welchem Umfang eine Identifizierung der Mitglieder nötig ist (GwG, FM-GwG, GwG CH), ist zu klären; die Plattform kann den vorhandenen KYC-Ablauf nutzen." },
  { id: "steuer", titel: "Steuern auf Ausschüttungen", text: "Kapitalertragsteuer/KESt bzw. Verrechnungssteuer, Freistellungsaufträge und die Behandlung von Rückvergütungen mit der Steuerberatung abstimmen; die Berechnung im Portal ist vereinfacht." },
  { id: "einlagen", titel: "Kein Einlagengeschäft", text: "Die Genossenschaft nimmt nur Einzahlungen auf gezeichnete Geschäftsanteile entgegen – keine sonstigen rückzahlbaren Gelder (KWG/BWG/BankG)." },
];

const fmtEur = (x) => `${Number(x || 0).toLocaleString("de-DE", { maximumFractionDigits: 2 })} €`;

// ---------------------------------------------------------------- Stammdaten der Genossenschaft (Backoffice)

export function genoBereinigen(d = {}) {
  const land = auswahl(d.land, RECHTSFORM, "DE");
  const g = {
    name: text(d.name, 120),
    land,
    rechtsform: RECHTSFORM[land],
    registerStatus: auswahl(d.registerStatus, GENO_REGISTER, "aufbau"),
    registerNr: text(d.registerNr, 60),
    registergericht: text(d.registergericht, 120),
    pruefungsverband: text(d.pruefungsverband, 160),
    sitz: text(d.sitz, 120),
    vorstand: text(d.vorstand, 200),
    anteilEur: zahl(d.anteilEur, 1, 100000, 2),
    minAnteile: ganz(d.minAnteile, 1, 1000) ?? 1,
    maxAnteile: ganz(d.maxAnteile, 1, 100000) ?? 100,
    eintrittsgeldEur: zahl(d.eintrittsgeldEur, 0, 10000, 2) ?? 0,
    einzahlungsfristTage: ganz(d.einzahlungsfristTage, 1, 365) ?? 14,
    kuendigungsfristMonate: ganz(d.kuendigungsfristMonate, 1, 60) ?? (land === "CH" ? 12 : 3),
    geschaeftsjahrEnde: /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(d.geschaeftsjahrEnde || "")) ? d.geschaeftsjahrEnde : "12-31",
    nachschusspflicht: auswahl(d.nachschusspflicht, NACHSCHUSS, "ausgeschlossen"),
    haftsummeEur: zahl(d.haftsummeEur, 0, 1000000, 2) ?? 0,
    iban: d.iban ? iban(d.iban) : "",
    bic: text(d.bic, 11).toUpperCase(),
    kontoinhaber: text(d.kontoinhaber, 120),
    satzungStand: datum(d.satzungStand),
    onlineGv: wahr(d.onlineGv),
    einladungsfristTage: ganz(d.einladungsfristTage, 1, 90) ?? null,
    info: mehrzeilig(d.info, 2000),
  };
  if (!g.name) throw fehler("Bitte geben Sie den Namen der Genossenschaft an.", "name");
  if (!g.anteilEur) throw fehler("Bitte geben Sie den Betrag eines Geschäftsanteils laut Satzung an.", "anteilEur");
  if (g.maxAnteile < g.minAnteile) throw fehler("Die Höchstzahl der Anteile muss mindestens der Pflichtbeteiligung entsprechen.", "maxAnteile");
  if (d.iban && !g.iban) throw fehler("Die IBAN der Genossenschaft ist ungültig (Prüfziffer).", "iban");
  if (g.nachschusspflicht === "beschraenkt" && !(g.haftsummeEur > 0)) throw fehler("Bei beschränkter Nachschusspflicht ist die Haftsumme je Anteil anzugeben.", "haftsummeEur");
  if (g.registerStatus === "eingetragen") {
    if (!g.registerNr) throw fehler(`Für den Beitritt muss die Eintragung im ${REGISTER_NAME[land]} hinterlegt sein.`, "registerNr");
    if (land !== "CH" && !g.pruefungsverband) throw fehler(`Für den Beitritt muss der ${VERBAND_NAME[land]} hinterlegt sein.`, "pruefungsverband");
    if (!g.iban) throw fehler("Für die Einzahlungen wird das Konto der Genossenschaft benötigt.", "iban");
    if (!g.satzungStand) throw fehler("Bitte geben Sie den Stand der Satzung an.", "satzungStand");
  }
  return g;
}

export const beitrittMoeglich = (geno) => geno?.registerStatus === "eingetragen";

/** Mindestfrist der Einladung zur Generalversammlung (Tage) je Land – DE § 46 Abs. 1 GenG, CH Art. 882 OR; AT laut Satzung */
export const EINLADUNGSFRIST_MIN = { DE: 14, AT: 7, CH: 5 };
export const einladungsfrist = (geno) => Math.max(EINLADUNGSFRIST_MIN[geno?.land] || 14, Number(geno?.einladungsfristTage) || 0);

// ---------------------------------------------------------------- Beitrittserklärung

export function beitrittBereinigen(d = {}, geno, { heute } = {}) {
  if (!beitrittMoeglich(geno)) throw konfliktFehler(geno?.registerStatus === "geschlossen" ? "Die Genossenschaft nimmt derzeit keine neuen Mitglieder auf." : "Die Genossenschaft ist noch im Aufbau – bitte nutzen Sie die unverbindliche Vormerkung.");
  const art = auswahl(d.art, MITGLIED_ARTEN, "");
  if (!art) throw fehler("Bitte wählen Sie, als wer Sie beitreten.", "art");
  const org = ORGANISATION.includes(art);
  const anteile = ganz(d.anteile, 1, 100000);
  if (!anteile || anteile < geno.minAnteile || anteile > geno.maxAnteile) throw fehler(`Bitte zeichnen Sie zwischen ${geno.minAnteile} und ${geno.maxAnteile} Geschäftsanteile.`, "anteile");
  const b = {
    art,
    anrede: auswahl(d.anrede, ANREDEN, org ? "firma" : ""),
    vorname: text(d.vorname, 80),
    nachname: text(d.nachname, 80),
    firma: text(d.firma, 160),
    vertretung: text(d.vertretung, 160),
    strasse: text(d.strasse, 120),
    plz: text(d.plz, 10),
    ort: text(d.ort, 80),
    land: auswahl(d.land, RECHTSFORM, geno.land),
    geburtsdatum: datum(d.geburtsdatum),
    kontoinhaber: text(d.kontoinhaber, 120),
    iban: iban(d.iban),
    freistellung: geno.land === "DE" && !org ? wahr(d.freistellung) : false,
    anteile,
  };
  if (!b.nachname || (!org && !b.vorname)) throw fehler("Bitte geben Sie Vor- und Nachnamen an.", "nachname");
  if (org && !b.firma) throw fehler("Bitte geben Sie den Namen des Unternehmens, der Kommune bzw. des Vereins an.", "firma");
  if (org && !b.vertretung) throw fehler("Bitte geben Sie an, wer die Organisation beim Beitritt vertritt.", "vertretung");
  if (!b.strasse || !b.plz || !b.ort) throw fehler("Bitte geben Sie die vollständige Anschrift an (Mitgliederliste).", "strasse");
  if (!b.iban) throw fehler("Bitte geben Sie eine gültige IBAN für Auszahlungen an (Prüfziffer).", "iban");
  if (!b.kontoinhaber) b.kontoinhaber = org ? b.firma : `${b.vorname} ${b.nachname}`;
  if (b.geburtsdatum && heute && b.geburtsdatum > heute) throw fehler("Das Geburtsdatum liegt in der Zukunft.", "geburtsdatum");
  if (!org && b.geburtsdatum && heute && plusMonate(b.geburtsdatum, 18 * 12) > heute) throw fehler("Minderjährige können nur mit Zustimmung der gesetzlichen Vertreter beitreten – bitte wenden Sie sich an uns.", "geburtsdatum");
  const best = d.bestaetigt && typeof d.bestaetigt === "object" ? d.bestaetigt : {};
  const fehlt = beitrittBestaetigungen(geno).filter((k) => best[k] !== true);
  if (fehlt.length) throw fehler("Bitte bestätigen Sie alle Erklärungen der Beitrittserklärung.", `bestaetigt.${fehlt[0]}`);
  b.bestaetigt = Object.fromEntries(beitrittBestaetigungen(geno).map((k) => [k, true]));
  b.betragEur = rund2(anteile * geno.anteilEur);
  b.eintrittsgeldEur = geno.eintrittsgeldEur || 0;
  return b;
}

/** Pflichteinzahlung (alle gezeichneten Anteile + Eintrittsgeld) */
export const pflichtBetrag = (m, geno) => rund2((Number(m?.anteile) || 0) * (Number(geno?.anteilEur) || 0) + (Number(geno?.eintrittsgeldEur) || 0));
export const offenerBetrag = (m, geno) => Math.max(0, rund2(pflichtBetrag(m, geno) - (Number(m?.eingezahltEur) || 0)));
/** Geschäftsguthaben: Einzahlungen auf Anteile (ohne Eintrittsgeld), höchstens Nennwert der Anteile */
export const geschaeftsguthaben = (m, geno) => rund2(Math.min(Math.max(0, (Number(m?.eingezahltEur) || 0) - (Number(geno?.eintrittsgeldEur) || 0)), (Number(m?.anteile) || 0) * (Number(geno?.anteilEur) || 0)));

export function einzahlungBereinigen(d = {}, { heute } = {}) {
  const betragEur = zahl(d.betragEur, 0.01, 10000000, 2);
  if (!betragEur) throw fehler("Bitte geben Sie den eingegangenen Betrag an.", "betragEur");
  const am = datum(d.am) || heute;
  if (heute && am > heute) throw fehler("Der Zahlungseingang kann nicht in der Zukunft liegen.", "am");
  return { betragEur, am, referenz: text(d.referenz, 80) };
}

/** Verwendungszweck für die Einzahlung (Mitgliedsnummer, sonst Kennung) */
export const verwendungszweck = (m) => `Geschäftsanteile ${m?.nr || m?.id || ""}`.trim();

/** Nächste Mitgliedsnummer „0001“… aus vorhandenen Nummern */
export function naechsteNummer(vorhandene = []) {
  const max = vorhandene.reduce((x, n) => Math.max(x, Number(String(n || "").replace(/\D/g, "")) || 0), 0);
  return String(max + 1).padStart(4, "0");
}

// ---------------------------------------------------------------- Weitere Anteile, Kündigung, Übertragung

export function zeichnungBereinigen(d = {}, m, geno) {
  if (!m || m.status !== "aktiv") throw konfliktFehler("Weitere Anteile können nur aktive Mitglieder zeichnen.");
  if (!beitrittMoeglich(geno)) throw konfliktFehler("Die Genossenschaft nimmt derzeit keine weiteren Anteile an.");
  const anteile = ganz(d.anteile, 1, 100000);
  if (!anteile) throw fehler("Bitte geben Sie an, wie viele weitere Anteile Sie zeichnen möchten.", "anteile");
  const offen = (m.zeichnungen || []).filter((z) => z.status === "beantragt").reduce((s, z) => s + z.anteile, 0);
  if (m.anteile + offen + anteile > geno.maxAnteile) throw fehler(`Höchstens ${geno.maxAnteile} Anteile je Mitglied laut Satzung (derzeit ${m.anteile}${offen ? `, ${offen} beantragt` : ""}).`, "anteile");
  const best = d.bestaetigt && typeof d.bestaetigt === "object" ? d.bestaetigt : {};
  if (best.einzahlung !== true) throw fehler(geno.land === "DE" ? "Bitte bestätigen Sie die Einzahlungsverpflichtung für die weiteren Anteile (§ 15b GenG)." : "Bitte bestätigen Sie die Einzahlungsverpflichtung für die weiteren Anteile.", "bestaetigt.einzahlung");
  return { anteile, betragEur: rund2(anteile * geno.anteilEur) };
}

/**
 * Stichtag einer Kündigung: frühestes Geschäftsjahresende, zu dem die Kündigungsfrist eingehalten ist
 * (DE § 65 Abs. 2 GenG: mindestens 3 Monate zum Schluss eines Geschäftsjahres, Satzung bis 5 Jahre; CH Art. 844 OR: 1 Jahr).
 */
export function kuendigungsStichtag(eingang, fristMonate, gjEnde = "12-31") {
  const [mm, tt] = gjEnde.split("-").map(Number);
  const frueh = plusMonate(eingang, fristMonate);
  let jahr = Number(String(eingang).slice(0, 4));
  for (let i = 0; i < 80; i++, jahr++) {
    const letzter = new Date(Date.UTC(jahr, mm, 0)).getUTCDate();
    const e = `${jahr}-${String(mm).padStart(2, "0")}-${String(Math.min(tt, letzter)).padStart(2, "0")}`;
    if (e >= frueh) return e;
  }
  return frueh;
}
/** Auszahlung des Auseinandersetzungsguthabens: DE binnen sechs Monaten nach dem Ausscheiden (§ 73 Abs. 2 GenG); AT/CH laut Satzung */
export const auszahlungBis = (stichtag, land) => (land === "DE" ? plusMonate(stichtag, 6) : null);

export function kuendigungBereinigen(d = {}, m, geno, { heute } = {}) {
  if (!m || m.status !== "aktiv") throw konfliktFehler("Kündigen können nur aktive Mitglieder.");
  if ((m.kuendigungen || []).some((k) => ["eingereicht", "bestaetigt"].includes(k.status))) throw konfliktFehler("Es liegt bereits eine offene Kündigung vor.");
  const art = auswahl(d.art, { voll: 1, teil: 1 }, "");
  if (!art) throw fehler("Bitte wählen Sie, ob Sie die Mitgliedschaft oder einzelne Anteile kündigen.", "art");
  let anteile = m.anteile;
  if (art === "teil") {
    anteile = ganz(d.anteile, 1, 100000);
    if (!anteile || anteile >= m.anteile) throw fehler("Bitte geben Sie an, wie viele Anteile Sie kündigen (weniger als alle – sonst Mitgliedschaft kündigen).", "anteile");
    if (m.anteile - anteile < geno.minAnteile) throw fehler(`Die Pflichtbeteiligung von ${geno.minAnteile} Anteil(en) muss bestehen bleiben (${geno.land === "DE" ? "§ 67b GenG, " : ""}Satzung).`, "anteile");
  }
  if (d.bestaetigt !== true) throw fehler("Bitte bestätigen Sie die Kündigung.", "bestaetigt");
  const wirksamZum = kuendigungsStichtag(heute, geno.kuendigungsfristMonate, geno.geschaeftsjahrEnde);
  return { art, anteile, eingereichtAm: heute, wirksamZum, auszahlungBis: auszahlungBis(wirksamZum, geno.land), grund: text(d.grund, 300) };
}

/** Auseinandersetzungsguthaben für gekündigte Anteile (vereinfacht: anteiliges Geschäftsguthaben; Verlustanteil laut Bilanz möglich) */
export function auseinandersetzung(m, geno, anteile) {
  const g = geschaeftsguthaben(m, geno);
  const n = Number(m?.anteile) || 0;
  if (!n) return 0;
  return rund2(Math.min(g, (anteile / n) * g));
}

export function uebertragungBereinigen(d = {}, m, geno) {
  if (!m || m.status !== "aktiv") throw konfliktFehler("Übertragen können nur aktive Mitglieder.");
  if (offenerBetrag(m, geno) > 0) throw konfliktFehler("Übertragen werden kann nur voll eingezahltes Geschäftsguthaben – bitte zuerst die offene Einzahlung leisten.");
  if ((m.kuendigungen || []).some((k) => ["eingereicht", "bestaetigt"].includes(k.status))) throw konfliktFehler("Während einer offenen Kündigung ist keine Übertragung möglich.");
  const an = String(d.anEmail || "").trim().toLowerCase().slice(0, 190);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(an)) throw fehler("Bitte geben Sie die E-Mail-Adresse des Empfängers an (Konto auf der Plattform).", "anEmail");
  const art = auswahl(d.art, { voll: 1, teil: 1 }, "teil");
  const anteile = art === "voll" ? m.anteile : ganz(d.anteile, 1, 100000);
  if (!anteile || anteile > m.anteile) throw fehler("Bitte geben Sie eine gültige Anzahl Anteile an.", "anteile");
  if (art === "teil" && anteile === m.anteile) throw fehler("Für alle Anteile bitte „gesamtes Geschäftsguthaben übertragen“ wählen – Sie scheiden dann aus.", "art");
  if (art === "teil" && m.anteile - anteile < geno.minAnteile) throw fehler(`Die Pflichtbeteiligung von ${geno.minAnteile} Anteil(en) muss bestehen bleiben.`, "anteile");
  if (d.bestaetigt !== true) throw fehler(geno.land === "DE" ? "Bitte bestätigen Sie die Übertragungsvereinbarung (§ 76 GenG, schriftliche Vereinbarung)." : "Bitte bestätigen Sie die Übertragungsvereinbarung.", "bestaetigt");
  return { art, anteile, anEmail: an, betragEur: rund2((anteile / m.anteile) * geschaeftsguthaben(m, geno)) };
}
/** Empfänger einer Übertragung: aktives Mitglied, Höchstzahl der Anteile beachten */
export function uebertragungEmpfaengerPruefen(empf, anteile, geno) {
  if (!empf || empf.status !== "aktiv") throw konfliktFehler("Der Empfänger muss Mitglied der Genossenschaft sein (ggf. zuerst beitreten).");
  if (empf.anteile + anteile > geno.maxAnteile) throw konfliktFehler(`Der Empfänger würde die Höchstzahl von ${geno.maxAnteile} Anteilen überschreiten.`);
}

// ---------------------------------------------------------------- Ausschüttungen

export function ausschuettungBereinigen(d = {}, { heute } = {}) {
  const art = auswahl(d.art, AUSSCHUETTUNG_ARTEN, "");
  if (!art) throw fehler("Bitte wählen Sie Dividende oder Rückvergütung.", "art");
  const geschaeftsjahr = ganz(d.geschaeftsjahr, 2000, 2100);
  if (!geschaeftsjahr) throw fehler("Bitte geben Sie das Geschäftsjahr an.", "geschaeftsjahr");
  if (heute && geschaeftsjahr > Number(heute.slice(0, 4))) throw fehler("Ausgeschüttet wird nur für abgeschlossene Geschäftsjahre.", "geschaeftsjahr");
  const a = { art, geschaeftsjahr, stichtag: datum(d.stichtag) || `${geschaeftsjahr}-12-31`, satzPct: null, ctProKwh: null, notiz: text(d.notiz, 300) };
  if (art === "dividende") {
    a.satzPct = zahl(d.satzPct, 0.01, 15, 2);
    if (!a.satzPct) throw fehler("Bitte geben Sie den Dividendensatz in % des Geschäftsguthabens an (0,01–15 %).", "satzPct");
  } else {
    a.ctProKwh = zahl(d.ctProKwh, 0.01, 20, 3);
    if (!a.ctProKwh) throw fehler("Bitte geben Sie die Rückvergütung in ct/kWh an (0,01–20 ct).", "ctProKwh");
  }
  return a;
}

/**
 * Positionen einer Ausschüttung. mitglieder: [{ mitgliedId, nutzerId, name, nr, land, freistellung, guthabenEur, umsatzKwh }].
 * Dividende: Satz × Geschäftsguthaben zum Stichtag, Steuerabzug je Land (DE mit Freistellungsauftrag bis Sparer-Pauschbetrag).
 * Rückvergütung: ct/kWh × Strombezug aus der Gemeinschaft im Geschäftsjahr, ohne Abzug.
 */
export function ausschuettungBerechnen(a, mitglieder = [], geno) {
  const satz = STEUER_ABZUG[geno?.land] ?? STEUER_ABZUG.DE;
  const positionen = [];
  for (const x of mitglieder) {
    const basis = a.art === "dividende" ? Number(x.guthabenEur) || 0 : Number(x.umsatzKwh) || 0;
    if (!(basis > 0)) continue;
    const brutto = rund2(a.art === "dividende" ? (basis * a.satzPct) / 100 : (basis * a.ctProKwh) / 100);
    if (!(brutto > 0)) continue;
    let steuer = 0;
    if (a.art === "dividende") {
      const bemessung = geno?.land === "DE" && x.freistellung ? Math.max(0, brutto - STEUER_ABZUG.freibetragDeEur) : brutto;
      steuer = rund2(bemessung * satz);
    }
    positionen.push({ mitgliedId: x.mitgliedId, nutzerId: x.nutzerId || null, name: x.name || "", nr: x.nr || "", basis: rund2(basis), bruttoEur: brutto, steuerEur: steuer, nettoEur: rund2(brutto - steuer), freistellung: !!x.freistellung });
  }
  const summe = positionen.reduce((s, p) => ({ bruttoEur: rund2(s.bruttoEur + p.bruttoEur), steuerEur: rund2(s.steuerEur + p.steuerEur), nettoEur: rund2(s.nettoEur + p.nettoEur) }), { bruttoEur: 0, steuerEur: 0, nettoEur: 0 });
  return { positionen, summe, steuersatz: a.art === "dividende" ? satz : 0, anzahl: positionen.length };
}

/** Kurzfassung einer Mitgliedschaft für das Mitglied (ohne interne Notizen) */
export function mitgliedKennzahlen(m, geno) {
  return {
    pflichtEur: pflichtBetrag(m, geno),
    eingezahltEur: rund2(Number(m?.eingezahltEur) || 0),
    offenEur: offenerBetrag(m, geno),
    guthabenEur: geschaeftsguthaben(m, geno),
    nennwertEur: rund2((Number(m?.anteile) || 0) * (Number(geno?.anteilEur) || 0)),
  };
}
