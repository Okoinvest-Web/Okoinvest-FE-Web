// src/lib/plattform/pachtakte.js
//
// Pachtakte für Flächen-, Dach- und Agri-PV-Eigentümer (Team 1 „Flächeneigentümer, Landwirt, Dacheigentümer“):
// alles, was NACH der Unterschrift des Pachtvertrags passiert – reine Logik, client- und serverseitig nutzbar,
// ohne Node-/React-Importe und nur mit Dateiendungen importiert (läuft auch direkt unter Node für --nur-logik).
//
//   Anliegen            Kündigung, Eigentümerwechsel, Erbfall, Zahlungsaufteilung bei mehreren Eigentümern,
//                       Verlängerungsoption – mit Positivliste, Zustandsautomat, Pflichtunterlagen je Land
//   Fristen             Grundlaufzeit, späteste Frist bis Baubeginn, Erinnerung vor Laufzeitende, Kündigung
//   Rückbau/Sicherheit  Zustandsautomat Rückbau (Ankündigung → Abnahme durch den Eigentümer) und
//                       Rückbausicherheit (vereinbart → hinterlegt → freigegeben erst nach Abnahme)
//   Agri-PV-Nachweis    jährlicher Bewirtschaftungsnachweis nach DIN SPEC 91434 (Referenzjahre vor dem Bau,
//                       Betriebsjahre: ≥ 66 % des Referenzertrags, Flächenverlust ≤ 10 % Kat. I / ≤ 15 % Kat. II)
//   Jahresbescheinigung Summen der Pacht-Gutschriften eines Kalenderjahres mit vorsichtigen Steuerhinweisen
//
// Python-Gegenstück: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/pachtakte_kern.py (gleiche Tabellen).
// Rechtliche Aussagen sind bewusst vorsichtig formuliert („in der Regel“) und vor Livegang juristisch/steuerlich
// gegenzulesen (docs/fachpruefung/flaechenseite.md, Abschnitt „Pachtakte“).

import { PlattformFehler } from "./fehler.js";
import { datumDe, istDatum, plusTage, rund2, tageZwischen } from "./finanzen/basis.js";

const ungueltig = (t) => new PlattformFehler(422, t);
const konflikt = (t) => new PlattformFehler(409, t);

// ---------------------------------------------------------------- kleine Helfer (bewusst lokal, siehe Kopf)

const STEUER = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
export function text(x, max = 200) {
  return String(x ?? "").replace(STEUER, "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
}
export function mehrzeilig(x, max = 2000) {
  return String(x ?? "").replace(STEUER, "").replace(/\r\n?/g, "\n").trim().slice(0, max);
}
const auswahl = (x, erlaubt, standard = "") => (Object.prototype.hasOwnProperty.call(erlaubt, String(x ?? "")) ? String(x) : standard);
function zahl(x, { min = -Infinity, max = Infinity, stellen = 2 } = {}) {
  if (x === null || x === undefined || x === "") return null;
  const n = typeof x === "number" ? x : Number(String(x).replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  const f = 10 ** stellen;
  return Math.round(n * f) / f;
}
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[^\s@<>()[\]\\,;:"]{1,190}\.[a-z]{2,24}$/i;
function email(x) {
  const e = text(x, 254).toLowerCase();
  if (!e) return "";
  if (!EMAIL.test(e)) throw ungueltig(`Ungültige E-Mail-Adresse: ${e.slice(0, 60)}`);
  return e;
}
const datum = (x) => (istDatum(x) ? String(x) : "");
const plusMonate = (tag, m) => {
  const [j, mo, t] = String(tag).split("-").map(Number);
  const d = new Date(Date.UTC(j, mo - 1 + m, 1));
  const letzter = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(t, letzter)).padStart(2, "0")}`;
};
const plusJahre = (tag, j) => plusMonate(tag, 12 * j);

export const LAND_TEXT = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" };
const landVon = (l) => (["DE", "AT", "CH"].includes(l) ? l : "DE");

// ================================================================ Anliegen

export const ANLIEGEN_STATUS = {
  eingereicht: { label: "Eingereicht", ton: "info", text: "Ihr Anliegen ist eingegangen – wir melden uns in der Regel innerhalb von 10 Werktagen." },
  in_pruefung: { label: "In Bearbeitung", ton: "info", text: "Wir prüfen Ihr Anliegen und die Unterlagen." },
  rueckfrage: { label: "Rückfrage", ton: "warn", text: "Wir brauchen noch eine Angabe oder Unterlage von Ihnen." },
  erledigt: { label: "Erledigt", ton: "ok", text: "Ihr Anliegen ist abgeschlossen – das Ergebnis steht unten." },
  abgelehnt: { label: "Abgelehnt", ton: "neutral", text: "Ihr Anliegen konnte so nicht umgesetzt werden – Begründung siehe Verlauf." },
  zurueckgezogen: { label: "Zurückgezogen", ton: "neutral", text: "Sie haben das Anliegen zurückgezogen." },
};
export const ANLIEGEN_OFFEN = ["eingereicht", "in_pruefung", "rueckfrage"];
/** Bearbeitungsziel des Backoffice in Kalendertagen (interne Frist, keine Zusage) */
export const ANLIEGEN_BEARBEITUNG_TAGE = 14;

export const KUENDIGUNG_GRUENDE = {
  ordentlich: "Ordentliche Kündigung zum Laufzeitende",
  ausserordentlich: "Außerordentliche Kündigung aus wichtigem Grund",
  nichtbau: "Rücktritt/Kündigung, weil nicht (rechtzeitig) gebaut wird",
  einvernehmlich: "Einvernehmliche Aufhebung (Wunsch nach Gespräch)",
};
export const WECHSEL_ANLAESSE = { verkauf: "Verkauf", schenkung: "Schenkung / vorweggenommene Erbfolge", hofuebergabe: "Hofübergabe", einbringung: "Einbringung in eine Gesellschaft", sonstiges: "Sonstiges" };
export const ERBNACHWEISE = {
  DE: { erbschein: "Erbschein", testament: "Notarielles Testament/Erbvertrag mit Eröffnungsniederschrift", enz: "Europäisches Nachlasszeugnis", folgt: "Nachweis folgt (Verfahren läuft)" },
  AT: { einantwortung: "Einantwortungsbeschluss", amtsbestaetigung: "Amtsbestätigung des Gerichtskommissärs (Vertretung der Verlassenschaft)", enz: "Europäisches Nachlasszeugnis", folgt: "Nachweis folgt (Verlassenschaftsverfahren läuft)" },
  CH: { erbbescheinigung: "Erbbescheinigung", willensvollstrecker: "Willensvollstreckerzeugnis", folgt: "Nachweis folgt" },
};
export const AUFTEILUNG_GRUNDLAGEN = { miteigentum: "Miteigentum nach Bruchteilen", erbengemeinschaft: "Erbengemeinschaft", gesellschaft: "Gesellschaft (GbR, OG/KG, einfache Gesellschaft)", sonstiges: "Sonstige Vereinbarung" };
export const VERLAENGERUNG_WUENSCHE = { ausueben: "Verlängerungsoption ausüben / verlängern", nicht_ausueben: "Nicht verlängern – Rückbau zum Laufzeitende", gespraech: "Gespräch über Verlängerung oder neue Konditionen" };

/**
 * Anliegen-Arten mit Hinweisen und Pflichtunterlagen je Land. `nurStatus` = Vertragsstatus, in denen das Anliegen
 * gestellt werden kann. Die Unterlagen lädt der Eigentümer unter „Dokumente“ der Fläche hoch (bzw. per Nachricht).
 */
export const ANLIEGEN_ARTEN = {
  kuendigung: {
    label: "Kündigung / Vertragsende",
    kurz: "Kündigung",
    text: "Sie möchten den Pachtvertrag beenden oder vom Vertrag zurücktreten.",
    nurStatus: ["aktiv"],
    hinweise: {
      DE: [
        "Pachtverträge für Solarparks sind in der Regel fest befristet – eine ordentliche Kündigung vor Ablauf der Grundlaufzeit ist dann meist ausgeschlossen. Maßgeblich ist Ihr Vertrag.",
        "Eine außerordentliche Kündigung setzt einen wichtigen Grund voraus (z. B. erheblicher Zahlungsverzug), § 543 BGB i. V. m. § 581 Abs. 2 BGB – lassen Sie das anwaltlich prüfen.",
        "Die Dienstbarkeit im Grundbuch erlischt nicht von selbst mit dem Vertragsende; sie wird nach Rückbau mit einer Löschungsbewilligung gelöscht.",
      ],
      AT: [
        "Befristete Bestandverträge enden in der Regel durch Zeitablauf; eine vorzeitige Auflösung ist nur aus wichtigem Grund möglich (u. a. §§ 1117, 1118 ABGB). Maßgeblich ist Ihr Vertrag.",
        "Die verbücherte Dienstbarkeit (Servitut) bleibt bestehen, bis eine Löschungserklärung vorliegt – das regeln wir nach dem Rückbau.",
      ],
      CH: [
        "Befristete Pachtverträge enden in der Regel mit Ablauf der Dauer; eine vorzeitige Kündigung ist nur aus wichtigen Gründen möglich (Art. 297 OR). Maßgeblich ist Ihr Vertrag.",
        "Eine im Grundbuch eingetragene Dienstbarkeit bleibt bis zur Löschung bestehen – das regeln wir nach dem Rückbau.",
      ],
    },
    unterlagen: { DE: [], AT: [], CH: [] },
  },
  eigentuemerwechsel: {
    label: "Eigentümerwechsel (Verkauf, Schenkung, Hofübergabe)",
    kurz: "Eigentümerwechsel",
    text: "Die Fläche bzw. das Gebäude geht auf eine andere Person oder Gesellschaft über.",
    nurStatus: ["aktiv", "gekuendigt"],
    hinweise: {
      DE: [
        "Bei einer Veräußerung tritt der Erwerber in der Regel in den bestehenden Pachtvertrag ein (§ 566 BGB i. V. m. § 581 Abs. 2 bzw. § 593b BGB). Die Dienstbarkeit bleibt dinglich bestehen.",
        "Die Pacht steht bis zum Übergang von Nutzen und Lasten Ihnen zu, danach dem Erwerber – ausgezahlt wird erst nach dessen Verifizierung.",
        "Bitte weisen Sie den Erwerber im Kaufvertrag auf den Pachtvertrag und die Dienstbarkeit hin.",
      ],
      AT: [
        "Wichtig in Österreich: Ein nicht verbüchertes Bestandrecht kann der Erwerber unter Umständen aufkündigen (§ 1120 ABGB). Deshalb sichern wir das Nutzungsrecht als Servitut im Grundbuch – bitte informieren Sie den Erwerber darüber.",
        "Die Pacht steht bis zum Stichtag des Übergangs Ihnen zu, danach dem neuen Eigentümer (nach dessen Verifizierung).",
      ],
      CH: [
        "Nach aktuellem Stand geht ein Pachtverhältnis bei Veräußerung in der Regel auf den Erwerber über (Art. 290 OR); Einzelheiten sind im Einzelfall zu prüfen. Die im Grundbuch eingetragene Dienstbarkeit sichert zusätzlich ab.",
        "Die Pacht steht bis zum Stichtag des Übergangs Ihnen zu, danach dem neuen Eigentümer (nach dessen Verifizierung).",
      ],
    },
    unterlagen: {
      DE: ["Kaufvertrag bzw. Übergabevertrag (Auszug mit Stichtag und Pachtvertrag-Klausel)", "Grundbuchauszug nach Eintragung des Erwerbers"],
      AT: ["Kauf- bzw. Übergabevertrag (Auszug mit Stichtag)", "Grundbuchauszug nach Einverleibung des Erwerbers"],
      CH: ["Kauf- bzw. Abtretungsvertrag (Auszug mit Stichtag)", "Grundbuchauszug nach Eintragung des Erwerbers"],
    },
  },
  erbfall: {
    label: "Erbfall",
    kurz: "Erbfall",
    text: "Der bisherige Eigentümer ist verstorben – die Erben treten in den Pachtvertrag ein.",
    nurStatus: ["aktiv", "gekuendigt"],
    hinweise: {
      DE: [
        "Mit dem Erbfall gehen Eigentum und Pachtvertrag auf die Erben über (§ 1922 BGB). Mehrere Erben handeln als Erbengemeinschaft grundsätzlich gemeinsam (§§ 2038, 2040 BGB).",
        "Bis zur Klärung zahlen wir auf ein Konto der Erbengemeinschaft oder an eine bevollmächtigte Person – nie an Einzelne ohne Nachweis.",
        "Steuerlicher Hinweis: Erwerbe von Todes wegen sind in Deutschland binnen drei Monaten dem Finanzamt anzuzeigen (§ 30 ErbStG) – bitte mit Ihrer Steuerberatung klären.",
      ],
      AT: [
        "In Österreich geht der Nachlass erst mit der Einantwortung auf die Erben über; bis dahin handelt die Verlassenschaft, vertreten laut Amtsbestätigung des Gerichtskommissärs.",
        "Bis zur Einantwortung zahlen wir an das Verlassenschaftskonto bzw. die in der Amtsbestätigung genannte Person.",
      ],
      CH: [
        "Die Erben erwerben die Erbschaft von Gesetzes wegen (Art. 560 ZGB) und bilden bis zur Teilung eine Erbengemeinschaft (Art. 602 ZGB).",
        "Bis zur Teilung zahlen wir an ein Konto der Erbengemeinschaft oder eine bevollmächtigte Person (z. B. Willensvollstrecker).",
      ],
    },
    unterlagen: {
      DE: ["Sterbeurkunde", "Erbnachweis (Erbschein, notarielles Testament mit Eröffnungsniederschrift oder Europäisches Nachlasszeugnis)", "Vollmacht der Miterben, falls eine Person für alle handelt"],
      AT: ["Sterbeurkunde", "Amtsbestätigung bzw. Einantwortungsbeschluss", "Vollmacht der Miterben, falls eine Person für alle handelt"],
      CH: ["Todesschein", "Erbbescheinigung bzw. Willensvollstreckerzeugnis", "Vollmacht der Miterben, falls eine Person für alle handelt"],
    },
  },
  zahlungsaufteilung: {
    label: "Mehrere Eigentümer: Pacht aufteilen",
    kurz: "Zahlungsaufteilung",
    text: "Die Pacht soll nach Anteilen an mehrere Miteigentümer bzw. Erben gezahlt werden.",
    nurStatus: ["aktiv", "gekuendigt"],
    hinweise: {
      DE: ["Bei Miteigentum nach Bruchteilen steht die Pacht den Miteigentümern in der Regel nach ihren Anteilen zu (§ 743 BGB) – eine abweichende Vereinbarung ist möglich.", "Jede empfangende Person braucht eine eigene Verifizierung mit Bankverbindung; alternativ zahlen wir auf ein gemeinsames Konto."],
      AT: ["Bei Miteigentum gebühren die Nutzungen in der Regel nach Anteilen (§ 839 ABGB) – eine abweichende Vereinbarung ist möglich.", "Jede empfangende Person braucht eine eigene Verifizierung mit Bankverbindung; alternativ zahlen wir auf ein gemeinsames Konto."],
      CH: ["Bei Miteigentum werden die Erträge in der Regel nach Anteilen verteilt – eine abweichende Vereinbarung ist möglich.", "Jede empfangende Person braucht eine eigene Verifizierung mit Bankverbindung; alternativ zahlen wir auf ein gemeinsames Konto."],
    },
    unterlagen: {
      DE: ["Grundbuchauszug mit den Anteilen oder schriftliche Vereinbarung aller Eigentümer über die Aufteilung"],
      AT: ["Grundbuchauszug (B-Blatt mit Anteilen) oder schriftliche Vereinbarung aller Eigentümer"],
      CH: ["Grundbuchauszug mit den Anteilen oder schriftliche Vereinbarung aller Eigentümer"],
    },
  },
  verlaengerung: {
    label: "Verlängerung / Laufzeitende",
    kurz: "Verlängerung",
    text: "Sie möchten eine Verlängerungsoption nutzen, nicht verlängern oder über neue Konditionen sprechen.",
    nurStatus: ["aktiv"],
    hinweise: {
      DE: ["Ob und bis wann eine Verlängerungsoption ausgeübt werden muss, regelt Ihr Vertrag. Wir bestätigen Ihnen den Eingang schriftlich."],
      AT: ["Ob und bis wann eine Verlängerungsoption ausgeübt werden muss, regelt Ihr Vertrag. Wir bestätigen Ihnen den Eingang schriftlich."],
      CH: ["Ob und bis wann eine Verlängerungsoption ausgeübt werden muss, regelt Ihr Vertrag. Wir bestätigen Ihnen den Eingang schriftlich."],
    },
    unterlagen: { DE: [], AT: [], CH: [] },
  },
};
export const ANLIEGEN_ART_IDS = Object.keys(ANLIEGEN_ARTEN);

/** Übergänge der Anliegen (wer: eigentuemer | admin) */
export const ANLIEGEN_UEBERGAENGE = [
  { von: ["eingereicht"], nach: "in_pruefung", wer: "admin", aktion: "Bearbeitung beginnen" },
  { von: ["eingereicht", "in_pruefung"], nach: "rueckfrage", wer: "admin", aktion: "Rückfrage stellen", pflicht: ["kommentar"] },
  { von: ["rueckfrage"], nach: "eingereicht", wer: "eigentuemer", aktion: "Antwort senden", pflicht: ["kommentar"] },
  { von: ["in_pruefung"], nach: "erledigt", wer: "admin", aktion: "Erledigen", pflicht: ["kommentar"] },
  { von: ["eingereicht", "in_pruefung"], nach: "abgelehnt", wer: "admin", aktion: "Ablehnen", pflicht: ["kommentar"] },
  { von: ["eingereicht", "rueckfrage"], nach: "zurueckgezogen", wer: "eigentuemer", aktion: "Zurückziehen" },
];

export function anliegenAktionen(status, wer) {
  return ANLIEGEN_UEBERGAENGE.filter((u) => u.wer === wer && u.von.includes(status));
}

/** Anliegen darf für einen Vertrag gestellt werden? Wirft 409 mit Begründung. */
export function anliegenErlaubt(art, vertrag, offene = []) {
  const a = ANLIEGEN_ARTEN[art];
  if (!a) throw ungueltig("Unbekannte Art des Anliegens.");
  if (!vertrag) throw ungueltig("Pachtvertrag angeben.");
  if (!a.nurStatus.includes(vertrag.status)) {
    throw konflikt(vertrag.status === "beendet" ? "Der Pachtvertrag ist bereits beendet." : vertrag.status === "gekuendigt" ? "Der Pachtvertrag ist bereits gekündigt." : "Für diesen Vertrag ist das Anliegen derzeit nicht möglich.");
  }
  if (offene.some((x) => x.art === art && ANLIEGEN_OFFEN.includes(x.status))) throw konflikt(`Zu diesem Vertrag ist bereits ein Anliegen „${a.kurz}“ in Bearbeitung.`);
  return true;
}

function personListe(roh, { mitAnteil = false, pflichtAnteil = false, min = 1, max = 20, was = "Person" } = {}) {
  const liste = (Array.isArray(roh) ? roh : []).slice(0, max + 1);
  if (liste.length > max) throw ungueltig(`Höchstens ${max} Einträge.`);
  const aus = liste
    .map((p) => ({ name: text(p?.name, 120), email: email(p?.email), ...(mitAnteil ? { anteilProzent: zahl(p?.anteilProzent, { min: 0, max: 100, stellen: 4 }) } : {}) }))
    .filter((p) => p.name || p.email);
  if (aus.length < min) throw ungueltig(min === 1 ? `Bitte mindestens eine ${was} angeben.` : `Bitte mindestens ${min} Einträge angeben.`);
  if (aus.some((p) => !p.name)) throw ungueltig(`Bitte zu jeder ${was} den Namen angeben.`);
  if (mitAnteil) {
    const mit = aus.filter((p) => p.anteilProzent !== null);
    if (pflichtAnteil && mit.length !== aus.length) throw ungueltig("Bitte zu jeder Person den Anteil in % angeben.");
    if (mit.length && mit.length !== aus.length) throw ungueltig("Anteile bitte für alle oder für niemanden angeben.");
    if (mit.some((p) => !(p.anteilProzent > 0))) throw ungueltig("Anteile müssen größer als 0 % sein.");
    if (mit.length) {
      const s = mit.reduce((x, p) => x + p.anteilProzent, 0);
      if (Math.abs(s - 100) > 0.01) throw ungueltig(`Die Anteile ergeben zusammen ${String(rund2(s)).replace(".", ",")} % – sie müssen genau 100 % ergeben.`);
    }
  }
  return aus;
}

/** Angaben eines Anliegens bereinigen (Positivliste, Pflichtfelder, Plausibilität). Wirft 422. */
export function anliegenBereinigen(art, roh = {}, { heute, land = "DE", vertrag = null } = {}) {
  const d = roh && typeof roh === "object" ? roh : {};
  const L = landVon(land);
  const bemerkung = mehrzeilig(d.bemerkung, 2000);
  if (art === "kuendigung") {
    const grund = auswahl(d.grund, KUENDIGUNG_GRUENDE);
    if (!grund) throw ungueltig("Bitte den Grund der Kündigung wählen.");
    const zumDatum = datum(d.zumDatum);
    if (!zumDatum) throw ungueltig("Bitte angeben, zu welchem Datum der Vertrag enden soll.");
    if (heute && zumDatum < heute) throw ungueltig("Das Datum der Beendigung darf nicht in der Vergangenheit liegen.");
    const begruendung = mehrzeilig(d.begruendung, 3000);
    if (grund === "ausserordentlich" && begruendung.length < 20) throw ungueltig("Bitte den wichtigen Grund kurz beschreiben (mindestens 20 Zeichen).");
    return { grund, zumDatum, begruendung, bemerkung };
  }
  if (art === "eigentuemerwechsel") {
    const anlass = auswahl(d.anlass, WECHSEL_ANLAESSE);
    if (!anlass) throw ungueltig("Bitte den Anlass des Eigentümerwechsels wählen.");
    const stichtag = datum(d.stichtag);
    if (!stichtag) throw ungueltig("Bitte den Stichtag angeben (Übergang von Nutzen und Lasten).");
    const e = d.erwerber && typeof d.erwerber === "object" ? d.erwerber : {};
    const erwerber = { name: text(e.name, 160), email: email(e.email), anschrift: text(e.anschrift, 240) };
    if (!erwerber.name) throw ungueltig("Bitte den Namen des neuen Eigentümers angeben.");
    const anteilProzent = zahl(d.anteilProzent, { min: 0.01, max: 100, stellen: 4 });
    return { anlass, stichtag, erwerber, anteilProzent: anteilProzent ?? 100, bemerkung };
  }
  if (art === "erbfall") {
    const verstorben = text(d.verstorben, 160);
    if (!verstorben) throw ungueltig("Bitte den Namen der verstorbenen Person angeben.");
    const todestag = datum(d.todestag);
    if (!todestag) throw ungueltig("Bitte das Todesdatum angeben.");
    if (heute && todestag > heute) throw ungueltig("Das Todesdatum darf nicht in der Zukunft liegen.");
    const nachweis = auswahl(d.nachweis, ERBNACHWEISE[L]);
    if (!nachweis) throw ungueltig("Bitte den Erbnachweis wählen (oder „Nachweis folgt“).");
    const erben = personListe(d.erben, { mitAnteil: true, was: "erbende Person" });
    const vertreter = text(d.vertreter, 160);
    if (erben.length > 1 && !vertreter) throw ungueltig("Bei mehreren Erben bitte angeben, wer bis zur Auseinandersetzung für alle handelt (Vertretung).");
    return { verstorben, todestag, nachweis, erben, vertreter, bemerkung };
  }
  if (art === "zahlungsaufteilung") {
    const grundlage = auswahl(d.grundlage, AUFTEILUNG_GRUNDLAGEN);
    if (!grundlage) throw ungueltig("Bitte die Grundlage der Aufteilung wählen.");
    const empfaenger = personListe(d.empfaenger, { mitAnteil: true, pflichtAnteil: true, min: 2, was: "empfangende Person" });
    const ab = datum(d.ab);
    return { grundlage, empfaenger, ab, bemerkung };
  }
  if (art === "verlaengerung") {
    const wunsch = auswahl(d.wunsch, VERLAENGERUNG_WUENSCHE);
    if (!wunsch) throw ungueltig("Bitte wählen, was Sie möchten.");
    const jahre = zahl(d.jahre, { min: 1, max: 40, stellen: 0 });
    if (wunsch === "ausueben" && vertrag && !(vertrag.laufzeitJahre > 0)) throw ungueltig("Für diesen Vertrag ist keine Laufzeit hinterlegt.");
    return { wunsch, jahre, bemerkung };
  }
  throw ungueltig("Unbekannte Art des Anliegens.");
}

/**
 * Übergang eines Anliegens prüfen. `wer` eigentuemer | admin, `eingabe` { kommentar, wirksamZum, neuesKontoId }.
 * Rückgabe { von, nach, aktion, kommentar, ergebnis } – wirft 409/422.
 */
export function anliegenUebergang(anliegen, nach, wer, eingabe = {}, { heute } = {}) {
  const u = ANLIEGEN_UEBERGAENGE.find((x) => x.nach === nach && x.wer === wer && x.von.includes(anliegen.status));
  if (!u) throw konflikt(`Von „${ANLIEGEN_STATUS[anliegen.status]?.label || anliegen.status}“ ist dieser Schritt nicht möglich.`);
  const kommentar = mehrzeilig(eingabe.kommentar, 2000);
  if ((u.pflicht || []).includes("kommentar") && kommentar.length < 3) throw ungueltig(nach === "erledigt" ? "Bitte das Ergebnis für den Eigentümer beschreiben." : "Bitte eine Begründung bzw. Nachricht angeben.");
  const ergebnis = {};
  if (nach === "erledigt") {
    if (anliegen.art === "kuendigung") {
      const wz = datum(eingabe.wirksamZum) || anliegen.daten?.zumDatum || "";
      if (!wz) throw ungueltig("Bitte angeben, zu welchem Datum die Kündigung wirksam wird.");
      ergebnis.wirksamZum = wz;
    }
    if (["eigentuemerwechsel", "erbfall"].includes(anliegen.art) && eingabe.neuesKontoId) ergebnis.neuesKontoId = text(eingabe.neuesKontoId, 40);
    if (anliegen.art === "eigentuemerwechsel") ergebnis.ab = datum(eingabe.ab) || anliegen.daten?.stichtag || "";
  }
  return { von: anliegen.status, nach, aktion: u.aktion, kommentar, ergebnis, am: heute || "" };
}

/** Pflichtunterlagen und Hinweise eines Anliegens für das Land der Fläche */
export function anliegenInfo(art, land) {
  const a = ANLIEGEN_ARTEN[art];
  const L = landVon(land);
  return a ? { label: a.label, kurz: a.kurz, text: a.text, hinweise: a.hinweise[L] || [], unterlagen: a.unterlagen[L] || [] } : null;
}

/** Kurztext eines Anliegens für Listen und Benachrichtigungen */
export function anliegenZusammenfassung(a) {
  const d = a?.daten || {};
  switch (a?.art) {
    case "kuendigung": return `${KUENDIGUNG_GRUENDE[d.grund] || "Kündigung"} zum ${datumDe(d.zumDatum)}`;
    case "eigentuemerwechsel": return `${WECHSEL_ANLAESSE[d.anlass] || "Wechsel"} an ${d.erwerber?.name || "–"} zum ${datumDe(d.stichtag)}`;
    case "erbfall": return `Erbfall ${d.verstorben || ""} – ${(d.erben || []).length} ${(d.erben || []).length === 1 ? "Erbe" : "Erben"}`;
    case "zahlungsaufteilung": return `Aufteilung auf ${(d.empfaenger || []).length} Empfänger (${(d.empfaenger || []).map((p) => `${String(p.anteilProzent).replace(".", ",")} %`).join(" / ")})`;
    case "verlaengerung": return `${VERLAENGERUNG_WUENSCHE[d.wunsch] || "Verlängerung"}${d.jahre ? ` (${d.jahre} Jahre)` : ""}`;
    default: return "";
  }
}

// ================================================================ Fristen

/**
 * Fristen eines Pachtvertrags aus Vertrag (Finanzen) und Pachtangebot der Fläche.
 * vertrag: { vertragsdatum, beginn, laufzeitJahre, ende, status, kuendigungZum? }; angebot: Pachtangebot (optional).
 * Rückgabe sortiert: [{ id, datum, titel, text, ton, tage }]
 */
export function vertragsFristen(vertrag, angebot = null, { heute } = {}) {
  const f = [];
  const pa = angebot || {};
  const add = (id, d, titel, t) => {
    if (!istDatum(d)) return;
    const tage = heute ? tageZwischen(heute, d) : null;
    f.push({ id, datum: d, titel, text: t, tage, ton: tage === null ? "info" : tage < 0 ? "neutral" : tage <= 180 ? "warn" : "info" });
  };
  if (!vertrag) return f;
  if (!istDatum(vertrag.beginn) && istDatum(vertrag.vertragsdatum) && pa.vorlaufJahre > 0) {
    const nb = { entschaedigung: "Sie erhalten die Fläche zurück und eine Entschädigung.", rueckgabe: "Sie erhalten die Fläche zurück.", nichts: "Der Vertrag regelt die Folgen nicht ausdrücklich – bitte ansprechen." }[pa.nichtbau] || "Die Folgen regelt Ihr Vertrag.";
    add("baubeginn", plusJahre(vertrag.vertragsdatum, pa.vorlaufJahre), "Späteste Frist bis Baubeginn", `Wird bis dahin nicht gebaut: ${nb}`);
  }
  const ende = vertrag.ende || "";
  if (istDatum(ende)) {
    add("ende", ende, "Ende der Grundlaufzeit", pa.verlaengerungJahre > 0 ? `Danach ist eine Verlängerung um ${pa.verlaengerungJahre} Jahre vorgesehen – Voraussetzungen und Fristen laut Vertrag.` : "Danach endet der Vertrag, sofern nichts anderes vereinbart ist; es folgt der Rückbau.");
    add("vorbereitung", plusMonate(ende, -24), "Verlängerung oder Rückbau abstimmen", "Zwei Jahre vor Laufzeitende besprechen wir mit Ihnen Verlängerung, neue Konditionen oder den Rückbau.");
  }
  if (istDatum(vertrag.kuendigungZum)) add("kuendigung", vertrag.kuendigungZum, "Vertragsende laut Kündigung", "Zu diesem Datum endet der Vertrag; Rückbau und Rückgabe der Fläche folgen nach Vertrag.");
  return f.sort((a, b) => a.datum.localeCompare(b.datum));
}

// ================================================================ Rückbau und Rückbausicherheit

export const RUECKBAU_STATUS = {
  offen: { label: "Nicht begonnen", ton: "neutral", text: "Die Anlage steht; der Rückbau ist erst nach Vertragsende vorgesehen." },
  angekuendigt: { label: "Angekündigt", ton: "info", text: "Der Rückbau ist angekündigt – Termin siehe unten." },
  laufend: { label: "Rückbau läuft", ton: "info", text: "Module, Gestelle, Kabel und Fundamente werden entfernt, Boden und Zufahrten wiederhergestellt." },
  abnahme_bereit: { label: "Zur Abnahme bereit", ton: "warn", text: "Der Rückbau ist fertig – bitte prüfen Sie die Fläche und bestätigen Sie die Abnahme oder melden Sie Mängel." },
  maengel: { label: "Mängel gemeldet", ton: "warn", text: "Sie haben Mängel gemeldet – wir arbeiten nach." },
  abgenommen: { label: "Abgenommen", ton: "ok", text: "Die Fläche ist zurückgegeben. Danach werden Sicherheit und Dienstbarkeit freigegeben bzw. gelöscht." },
};
export const RUECKBAU_UEBERGAENGE = [
  { von: ["offen"], nach: "angekuendigt", wer: "admin", aktion: "Rückbau ankündigen", pflicht: ["termin"] },
  { von: ["angekuendigt"], nach: "laufend", wer: "admin", aktion: "Rückbau beginnen" },
  { von: ["laufend"], nach: "abnahme_bereit", wer: "admin", aktion: "Zur Abnahme melden", pflicht: ["termin"] },
  { von: ["abnahme_bereit"], nach: "abgenommen", wer: "eigentuemer", aktion: "Abnahme bestätigen" },
  { von: ["abnahme_bereit"], nach: "maengel", wer: "eigentuemer", aktion: "Mängel melden", pflicht: ["kommentar"] },
  { von: ["abnahme_bereit"], nach: "abgenommen", wer: "admin", aktion: "Abnahme erfassen (Protokoll liegt vor)", pflicht: ["kommentar"] },
  { von: ["maengel"], nach: "laufend", wer: "admin", aktion: "Nacharbeiten beginnen" },
];
export const SICHERHEIT_STATUS = {
  keine: { label: "Nicht vereinbart", ton: "neutral" },
  vorgesehen: { label: "Vereinbart, noch nicht hinterlegt", ton: "warn" },
  hinterlegt: { label: "Hinterlegt", ton: "ok" },
  freigegeben: { label: "Freigegeben", ton: "neutral" },
};
export const SICHERHEIT_ARTEN = { buergschaft: "Bankbürgschaft / Kautionsversicherung", konzern: "Konzernbürgschaft", ruecklage: "Rücklage (verpfändetes Konto)" };

/** Anfangszustand der Akte aus dem Pachtangebot */
export function akteStart(angebot = null) {
  const pa = angebot || {};
  const vereinbart = pa.rueckbau && pa.rueckbau !== "keine";
  return {
    rueckbau: { status: "offen", termin: "", verlauf: [] },
    sicherheit: { status: vereinbart ? "vorgesehen" : "keine", art: vereinbart ? pa.rueckbau : "", betrag: vereinbart && pa.rueckbauEuro ? pa.rueckbauEuro : null, ab: pa.rueckbauAb || "", geber: "", hinterlegtAm: "", verlauf: [] },
  };
}

/** Rückbau darf angekündigt werden: gekündigt, beendet oder ≤ 24 Monate vor Laufzeitende */
export function rueckbauMoeglich(vertrag, heute) {
  if (!vertrag) return false;
  if (["gekuendigt", "beendet"].includes(vertrag.status)) return true;
  return istDatum(vertrag.ende) && istDatum(heute) && plusMonate(vertrag.ende, -24) <= heute;
}

export function rueckbauUebergang(akte, nach, wer, eingabe = {}, { vertrag, heute } = {}) {
  const st = akte?.rueckbau?.status || "offen";
  const u = RUECKBAU_UEBERGAENGE.find((x) => x.nach === nach && x.wer === wer && x.von.includes(st));
  if (!u) throw konflikt(`Rückbau: Von „${RUECKBAU_STATUS[st]?.label || st}“ ist dieser Schritt nicht möglich.`);
  if (nach === "angekuendigt" && !rueckbauMoeglich(vertrag, heute)) throw konflikt("Der Rückbau kann erst nach Kündigung oder in den letzten 24 Monaten vor Laufzeitende angekündigt werden.");
  const kommentar = mehrzeilig(eingabe.kommentar, 2000);
  if ((u.pflicht || []).includes("kommentar") && kommentar.length < 3) throw ungueltig(nach === "maengel" ? "Bitte die Mängel beschreiben." : "Bitte einen Kommentar angeben.");
  const termin = datum(eingabe.termin);
  if ((u.pflicht || []).includes("termin") && !termin) throw ungueltig(nach === "angekuendigt" ? "Bitte den geplanten Beginn des Rückbaus angeben." : "Bitte einen Termin für die Abnahme angeben.");
  return { von: st, nach, aktion: u.aktion, kommentar, termin };
}

/** Rückbausicherheit: hinterlegen (Art, Betrag, Geber, Datum) oder nach Abnahme freigeben */
export function sicherheitUebergang(akte, nach, eingabe = {}) {
  const s = akte?.sicherheit || { status: "keine" };
  if (nach === "hinterlegt") {
    if (!["keine", "vorgesehen"].includes(s.status)) throw konflikt("Die Sicherheit ist bereits hinterlegt oder freigegeben.");
    const art = auswahl(eingabe.art, SICHERHEIT_ARTEN);
    const betrag = zahl(eingabe.betrag, { min: 1, max: 100000000, stellen: 2 });
    const geber = text(eingabe.geber, 160);
    const hinterlegtAm = datum(eingabe.hinterlegtAm);
    if (!art || betrag === null || !geber || !hinterlegtAm) throw ungueltig("Bitte Art, Betrag, Sicherungsgeber (z. B. Bank) und Datum der Hinterlegung angeben.");
    return { von: s.status, nach, art, betrag, geber, hinterlegtAm, kommentar: mehrzeilig(eingabe.kommentar, 1000) };
  }
  if (nach === "freigegeben") {
    if (s.status !== "hinterlegt") throw konflikt("Freigeben lässt sich nur eine hinterlegte Sicherheit.");
    if (akte?.rueckbau?.status !== "abgenommen") throw konflikt("Die Rückbausicherheit wird erst nach Abnahme des Rückbaus durch den Eigentümer freigegeben.");
    const kommentar = mehrzeilig(eingabe.kommentar, 1000);
    if (kommentar.length < 3) throw ungueltig("Bitte die Freigabe kurz dokumentieren (z. B. Rückgabe der Bürgschaftsurkunde).");
    return { von: s.status, nach, kommentar };
  }
  throw ungueltig("Unbekannter Schritt für die Sicherheit.");
}

/** Vertrag nach Rückbau beenden: erst nach Abnahme und ohne noch hinterlegte Sicherheit */
export function beendenPruefen(akte) {
  if (akte?.rueckbau?.status !== "abgenommen") throw konflikt("Der Vertrag kann erst nach Abnahme des Rückbaus beendet werden.");
  if (akte?.sicherheit?.status === "hinterlegt") throw konflikt("Bitte zuerst die Rückbausicherheit freigeben.");
  return true;
}

/** Hinweise zur Sicherheit (z. B. vereinbart ab Baubeginn, aber noch nicht hinterlegt) */
export function sicherheitHinweise(akte, vertrag) {
  const s = akte?.sicherheit || {};
  const h = [];
  if (s.status === "vorgesehen" && s.ab === "baubeginn" && istDatum(vertrag?.beginn)) h.push({ ton: "warn", text: "Die Rückbausicherheit ist ab Baubeginn vereinbart, aber noch nicht als hinterlegt erfasst – wir klären das und melden uns." });
  if (s.status === "keine") h.push({ ton: "info", text: "Für diesen Vertrag ist keine Rückbausicherheit erfasst. Der Rückbau ist trotzdem Pflicht des Pächters – Einzelheiten regelt der Vertrag." });
  return h;
}

// ================================================================ Agri-PV-Bewirtschaftungsnachweis (DIN SPEC 91434)

export const AGRI_NACHWEIS_ARTEN = { referenz: "Referenzjahr (ohne Anlage)", betrieb: "Betriebsjahr (mit Anlage)" };
export const AGRI_NACHWEIS_STATUS = {
  entwurf: { label: "Entwurf", ton: "neutral" },
  eingereicht: { label: "Eingereicht", ton: "info" },
  rueckfrage: { label: "Rückfrage", ton: "warn" },
  bestaetigt: { label: "Bestätigt", ton: "ok" },
};
/** gleiche Schlüssel wie AGRI_KULTUREN / REFERENZ_EINHEIT in flaecheFach.js */
export const AGRI_NACHWEIS_KULTUREN = {
  getreide: "Getreide", mais: "Mais", raps: "Raps", hackfruechte: "Kartoffeln / Rüben", gemuese: "Feldgemüse", gruenland: "Grünland (Mahd, Futterbau)",
  weide: "Weide (Rinder, Schafe, Geflügel)", obst: "Obst", beeren: "Beeren", wein: "Wein", hopfen: "Hopfen", sonstige: "Sonstige Kultur",
};
export const AGRI_NACHWEIS_EINHEITEN = { dt: "dt/ha", ttm: "t TM/ha", eur: "€/ha Marktleistung" };
export const AGRI_BEWIRTSCHAFTER = { selbst: "Selbst bewirtschaftet", paechter: "Durch Pächter/Bewirtschafter" };
export const JA_NEIN_ENTFAELLT = { ja: "Ja", nein: "Nein", entfaellt: "Entfällt" };
/** DIN SPEC 91434 – Werte wie AGRI in src/lib/invest/markt.js (hier dupliziert, damit die Datei ohne Alias lädt) */
export const DIN_91434 = { mindestErtrag: 0.66, flaechenverlustMaxKat1: 0.1, flaechenverlustMaxKat2: 0.15 };

export function agriNachweisBereinigen(roh = {}, { heute } = {}) {
  const d = roh && typeof roh === "object" ? roh : {};
  const jahrHeute = heute ? Number(String(heute).slice(0, 4)) : new Date().getFullYear();
  const jahr = zahl(d.jahr, { min: 2000, max: jahrHeute, stellen: 0 });
  if (jahr === null) throw ungueltig(`Bitte das Wirtschaftsjahr angeben (2000–${jahrHeute}).`);
  const art = auswahl(d.art, AGRI_NACHWEIS_ARTEN);
  if (!art) throw ungueltig("Bitte wählen: Referenzjahr (ohne Anlage) oder Betriebsjahr (mit Anlage).");
  const kultur = auswahl(d.kultur, AGRI_NACHWEIS_KULTUREN);
  if (!kultur) throw ungueltig("Bitte die angebaute Kultur wählen.");
  const gesamtHa = zahl(d.gesamtHa, { min: 0.01, max: 5000, stellen: 2 });
  if (gesamtHa === null) throw ungueltig("Bitte die Gesamtfläche des Schlags in ha angeben.");
  const bewirtschaftetHa = zahl(d.bewirtschaftetHa, { min: 0, max: 5000, stellen: 2 });
  if (bewirtschaftetHa === null) throw ungueltig("Bitte die landwirtschaftlich genutzte Fläche in ha angeben.");
  if (bewirtschaftetHa > gesamtHa) throw ungueltig("Die bewirtschaftete Fläche kann nicht größer als die Gesamtfläche sein.");
  const ertrag = zahl(d.ertrag, { min: 0, max: 100000, stellen: 1 });
  if (ertrag === null) throw ungueltig("Bitte den Ertrag je ha angeben.");
  const einheit = auswahl(d.einheit, AGRI_NACHWEIS_EINHEITEN);
  if (!einheit) throw ungueltig("Bitte die Einheit des Ertrags wählen.");
  const bewirtschafter = auswahl(d.bewirtschafter, AGRI_BEWIRTSCHAFTER, "selbst");
  const bewirtschafterName = text(d.bewirtschafterName, 160);
  if (bewirtschafter === "paechter" && !bewirtschafterName) throw ungueltig("Bitte angeben, wer die Fläche bewirtschaftet.");
  return {
    jahr, art, kultur, kulturText: text(d.kulturText, 120), gesamtHa, bewirtschaftetHa, ertrag, einheit, bewirtschafter, bewirtschafterName,
    gap: auswahl(d.gap, JA_NEIN_ENTFAELLT, ""), gapAktenzeichen: text(d.gapAktenzeichen, 60), besonderheiten: mehrzeilig(d.besonderheiten, 2000),
  };
}

/** Vergleichswert: Ø der Referenzjahre (gleiche Einheit) – sonst der Referenzertrag aus den Fachangaben der Fläche */
export function agriReferenz(nachweise = [], fachAgri = null, einheit = "") {
  const ref = nachweise.filter((x) => x.daten?.art === "referenz" && x.status !== "entwurf" && (!einheit || x.daten.einheit === einheit));
  if (ref.length) {
    const e = einheit || ref[0].daten.einheit;
    const gl = ref.filter((x) => x.daten.einheit === e);
    return { wert: rund2(gl.reduce((s, x) => s + x.daten.ertrag, 0) / gl.length), einheit: e, quelle: `Ø ${gl.length} Referenzjahr${gl.length === 1 ? "" : "e"} (${gl.map((x) => x.daten.jahr).sort().join(", ")})` };
  }
  if (fachAgri?.referenzertrag > 0 && (!einheit || !fachAgri.referenzEinheit || fachAgri.referenzEinheit === einheit)) {
    return { wert: fachAgri.referenzertrag, einheit: fachAgri.referenzEinheit || einheit, quelle: "Referenzertrag aus Ihren Flächenangaben" };
  }
  return null;
}

/**
 * Nachweis einordnen: Ertragsquote (nur Betriebsjahr, gleiche Einheit), Flächenverlust nach Kategorie, GAP-Hinweis.
 * Rückgabe { punkte[{id,stufe,titel,text}], quote, flaechenverlust, erfuellt (true|false|null) }
 */
export function agriNachweisPruefen(daten, { kategorie = "", referenz = null, land = "DE" } = {}) {
  const p = [];
  const add = (id, stufe, titel, t) => p.push({ id, stufe, titel, text: t });
  const pct = (x) => `${String(Math.round(x * 1000) / 10).replace(".", ",")} %`;
  let quote = null;
  let erfuellt = null;
  const verlust = daten.gesamtHa > 0 ? rund2((1 - daten.bewirtschaftetHa / daten.gesamtHa) * 10000) / 10000 : null;
  if (daten.art === "betrieb") {
    if (referenz && referenz.einheit === daten.einheit && referenz.wert > 0) {
      quote = Math.round((daten.ertrag / referenz.wert) * 10000) / 10000;
      const ok = quote >= DIN_91434.mindestErtrag;
      erfuellt = ok;
      add("quote", ok ? "ok" : "risiko", `Ertrag ${pct(quote)} des Referenzertrags`, ok
        ? `DIN SPEC 91434 verlangt mindestens ${pct(DIN_91434.mindestErtrag)} (Vergleich: ${referenz.quelle}).`
        : `Unter der Schwelle von ${pct(DIN_91434.mindestErtrag)} nach DIN SPEC 91434 (Vergleich: ${referenz.quelle}). Einzelne Jahre können witterungsbedingt abweichen – bitte Besonderheiten angeben; wir prüfen gemeinsam Bewirtschaftung und Anlage.`);
    } else {
      add("quote", "hinweis", "Kein Vergleich möglich", referenz ? `Der Referenzertrag liegt in einer anderen Einheit vor (${AGRI_NACHWEIS_EINHEITEN[referenz.einheit] || referenz.einheit}).` : "Es gibt noch keinen Referenzertrag – bitte Referenzjahre vor dem Bau erfassen oder den Referenzertrag in den Flächenangaben ergänzen.");
    }
  } else {
    add("referenz", "hinweis", "Referenzjahr", "Referenzjahre ohne Anlage bilden den Vergleichswert für die späteren Betriebsjahre (Ø mehrerer Jahre, gleiche Kultur und Einheit).");
  }
  if (daten.art === "betrieb" && verlust !== null) {
    const max = kategorie === "1" ? DIN_91434.flaechenverlustMaxKat1 : kategorie === "2" ? DIN_91434.flaechenverlustMaxKat2 : null;
    if (max === null) add("verlust", "hinweis", `Flächenverlust ${pct(verlust)}`, `Grenze nach DIN SPEC 91434: höchstens ${pct(DIN_91434.flaechenverlustMaxKat1)} (Kategorie I) bzw. ${pct(DIN_91434.flaechenverlustMaxKat2)} (Kategorie II) – Kategorie in den Flächenangaben ergänzen.`);
    else {
      const ok = verlust <= max + 1e-9;
      if (!ok) erfuellt = false;
      add("verlust", ok ? "ok" : "risiko", `Flächenverlust ${pct(verlust)}`, `Grenze für Kategorie ${kategorie === "1" ? "I" : "II"} nach DIN SPEC 91434: höchstens ${pct(max)} der Fläche.`);
    }
  }
  const L = landVon(land);
  if (daten.gap === "nein") {
    add("gap", "hinweis", "Kein Antrag auf Direktzahlungen", {
      DE: "In Deutschland bleiben Agri-PV-Flächen nach DIN SPEC 91434 nach aktuellem Stand in der Regel zu 85 % förderfähig (GAPDZV) – ohne Antrag entfallen die Direktzahlungen.",
      AT: "Die Förderfähigkeit im Mehrfachantrag (INVEKOS/AMA) bitte mit Ihrer Landwirtschaftskammer klären – die Regeln für Agri-PV sind nach aktuellem Stand im Einzelfall zu prüfen.",
      CH: "Die Beitragsberechtigung für Direktzahlungen bitte mit dem kantonalen Landwirtschaftsamt klären.",
    }[L]);
  }
  return { punkte: p, quote, flaechenverlust: verlust, erfuellt };
}

export const AGRI_NACHWEIS_UEBERGAENGE = [
  { von: ["entwurf", "rueckfrage"], nach: "eingereicht", wer: "eigentuemer", aktion: "Nachweis einreichen" },
  { von: ["eingereicht"], nach: "bestaetigt", wer: "admin", aktion: "Nachweis bestätigen" },
  { von: ["eingereicht"], nach: "rueckfrage", wer: "admin", aktion: "Rückfrage stellen", pflicht: ["kommentar"] },
];
export function agriUebergang(nachweis, nach, wer, eingabe = {}) {
  const u = AGRI_NACHWEIS_UEBERGAENGE.find((x) => x.nach === nach && x.wer === wer && x.von.includes(nachweis.status));
  if (!u) throw konflikt(`Nachweis: Von „${AGRI_NACHWEIS_STATUS[nachweis.status]?.label || nachweis.status}“ ist dieser Schritt nicht möglich.`);
  const kommentar = mehrzeilig(eingabe.kommentar, 2000);
  if ((u.pflicht || []).includes("kommentar") && kommentar.length < 3) throw ungueltig("Bitte die Rückfrage formulieren.");
  return { von: nachweis.status, nach, aktion: u.aktion, kommentar };
}
/** Bearbeiten nur im Entwurf oder bei Rückfrage */
export const agriBearbeitbar = (nachweis) => !nachweis || ["entwurf", "rueckfrage"].includes(nachweis.status);

// ================================================================ Jahresbescheinigung

export const STEUER_HINWEISE_PACHT = {
  DE: [
    "Pachteinnahmen gehören in der Regel zu den Einkünften aus Vermietung und Verpachtung (§ 21 EStG); gehört die Fläche zu einem Betriebsvermögen (z. B. Land- und Forstwirtschaft), sind es betriebliche Einnahmen.",
    "Umsatzsteuer: Die Verpachtung von Grundstücken ist grundsätzlich steuerfrei (§ 4 Nr. 12 UStG); bei Option (§ 9 UStG) ist die ausgewiesene Umsatzsteuer abzuführen.",
    "Die Verpachtung für Photovoltaik kann Folgen für Grund- und Erbschaftsteuer haben (Zuordnung zum land- und forstwirtschaftlichen Vermögen) – bitte mit Ihrer Steuerberatung klären.",
  ],
  AT: [
    "Pachteinnahmen gehören in der Regel zu den Einkünften aus Vermietung und Verpachtung (§ 28 EStG 1988) bzw. bei betrieblichen Flächen zu den betrieblichen Einkünften; Besonderheiten bei pauschalierten land- und forstwirtschaftlichen Betrieben bitte prüfen lassen.",
    "Umsatzsteuer: Die Vermietung und Verpachtung von Grundstücken ist grundsätzlich unecht steuerbefreit (§ 6 Abs. 1 Z 16 UStG 1994), eine Option ist möglich (§ 6 Abs. 2 UStG 1994).",
    "Widmung und Nutzung als Photovoltaikfläche können Einheitswert und Grundsteuer beeinflussen – bitte mit Ihrer Steuerberatung klären.",
  ],
  CH: [
    "Pachtzinsen sind in der Regel steuerbares Einkommen aus unbeweglichem Vermögen (Art. 21 DBG sowie kantonales Recht).",
    "MWST: Die Überlassung von Grundstücken ist grundsätzlich von der Steuer ausgenommen (Art. 21 Abs. 2 Ziff. 21 MWSTG), eine Option ist möglich (Art. 22 MWSTG).",
  ],
};

/**
 * Jahresbescheinigung aus den Pacht-Gutschriften (nicht storniert) eines Kalenderjahres (Leistungszeitraum-Beginn).
 * belege: [{ art, status, zeitraum{von}, netto, steuerBetrag, brutto, bezug{pachtvertragId}, bezahltAm }]
 * vertraege: [{ id, bezeichnung, land }]
 */
export function jahresbescheinigung(belege = [], vertraege = [], jahr) {
  const j = String(jahr);
  const imJahr = belege.filter((b) => b.art === "pacht" && b.status !== "storniert" && String(b.zeitraum?.von || "").startsWith(j));
  const zeilen = [];
  for (const b of imJahr) {
    const vid = b.bezug?.pachtvertragId || "";
    let z = zeilen.find((x) => x.vertragId === vid);
    if (!z) {
      const vt = vertraege.find((x) => x.id === vid) || {};
      z = { vertragId: vid, bezeichnung: vt.bezeichnung || b.bezugText || "Pachtvertrag", land: vt.land || "", anzahl: 0, netto: 0, steuer: 0, brutto: 0, bezahlt: 0, offen: 0, belege: [] };
      zeilen.push(z);
    }
    z.anzahl += 1;
    z.netto = rund2(z.netto + (Number(b.netto) || 0));
    z.steuer = rund2(z.steuer + (Number(b.steuerBetrag ?? b.steuer?.betrag) || 0));
    z.brutto = rund2(z.brutto + (Number(b.brutto) || 0));
    if (b.status === "bezahlt") z.bezahlt = rund2(z.bezahlt + (Number(b.brutto) || 0));
    else z.offen = rund2(z.offen + (Number(b.brutto) || 0));
    z.belege.push({ nummer: b.nummer, von: b.zeitraum?.von, bis: b.zeitraum?.bis, brutto: b.brutto, status: b.status, bezahltAm: b.bezahltAm || "" });
  }
  const summe = zeilen.reduce((s, z) => ({ netto: rund2(s.netto + z.netto), steuer: rund2(s.steuer + z.steuer), brutto: rund2(s.brutto + z.brutto), bezahlt: rund2(s.bezahlt + z.bezahlt), offen: rund2(s.offen + z.offen) }), { netto: 0, steuer: 0, brutto: 0, bezahlt: 0, offen: 0 });
  const laender = [...new Set(zeilen.map((z) => z.land).filter((l) => STEUER_HINWEISE_PACHT[l]))];
  return { jahr: Number(j), zeilen, summe, anzahl: imJahr.length, laender, steuerhinweise: laender.map((l) => ({ land: l, landText: LAND_TEXT[l], hinweise: STEUER_HINWEISE_PACHT[l] })) };
}

/** Jahre mit Pacht-Gutschriften (absteigend) */
export function bescheinigungsJahre(belege = []) {
  return [...new Set(belege.filter((b) => b.art === "pacht" && b.status !== "storniert").map((b) => Number(String(b.zeitraum?.von || "").slice(0, 4))).filter(Boolean))].sort((a, b) => b - a);
}

export { datumDe, plusMonate, plusJahre, plusTage };
