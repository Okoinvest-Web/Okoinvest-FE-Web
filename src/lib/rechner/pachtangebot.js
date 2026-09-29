// src/lib/rechner/pachtangebot.js
//
// Pachtangebot-Check: Ein Eigentümer gibt das Angebot eines Projektierers ein
// und erhält Zahlungsreihe, Summe, Barwert, Marktvergleich und eine Ampel je
// Vertragsklausel mit Erklärung und Fragen an den Projektierer.
// Reine Funktionen ohne React – im Browser UND in Node testbar:
//
//   node src/lib/rechner/pachtangebot.js      → Selbsttest
//
// Marktwerte aus src/lib/invest/markt.js (PACHT, ERLOESE, FREIFLAECHE, BAUART).
// Die Klauselbewertung ist eine fachliche Orientierung, keine Rechtsberatung.

import { BAUART, ERLOESE, FREIFLAECHE, PACHT, regionById } from "../invest/markt.js";

/* ------------------------------------------------------------------ */
/* Auswahllisten                                                       */
/* ------------------------------------------------------------------ */

export const FLAECHENARTEN = [
  { id: "freiflaeche", label: "Freiflächen-PV", sub: "Fläche ganz für den Park" },
  { id: "agri", label: "Agri-PV", sub: "Bewirtschaftung bleibt" },
];

export const MODELLE = [
  { id: "fest", label: "Fest €/ha", sub: "jährliche Pacht" },
  { id: "umsatz", label: "Umsatz", sub: "% der Erlöse" },
  { id: "kombi", label: "Kombiniert", sub: "Umsatz + Mindestpacht" },
];

export const INDEXARTEN = [
  { id: "keine", label: "Keine", sub: "Betrag bleibt gleich" },
  { id: "vpi", label: "VPI", sub: "Verbraucherpreise" },
  { id: "fest", label: "Fest", sub: "% pro Jahr" },
];

export const OPTIONEN = {
  rueckbau: [
    { id: "buergschaft", label: "Bankbürgschaft", sub: "oder Versicherung" },
    { id: "konzern", label: "Konzernbürgschaft", sub: "Mutter haftet" },
    { id: "ruecklage", label: "Rücklage", sub: "Ansparen im Betrieb" },
    { id: "keine", label: "Keine", sub: "nicht geregelt" },
  ],
  rueckbauAb: [
    { id: "baubeginn", label: "Ab Baubeginn" },
    { id: "spaeter", label: "Erst später" },
  ],
  kuendigung: [
    { id: "befristet", label: "Bis Baubeginn", sub: "Rücktritt befristet" },
    { id: "unbefristet", label: "Offen", sub: "Rücktritt ohne Frist" },
    { id: "jederzeit", label: "Jederzeit", sub: "auch im Betrieb" },
  ],
  nebenflaechen: [
    { id: "keine", label: "Keine", sub: "nur Pachtfläche" },
    { id: "verguetet", label: "Vergütet", sub: "Weg, Kabel, Ausgleich" },
    { id: "teilweise", label: "Teilweise", sub: "nur einzelne" },
    { id: "unentgeltlich", label: "Unentgeltlich", sub: "ohne Zahlung" },
  ],
  nichtbau: [
    { id: "entschaedigung", label: "Entschädigung", sub: "+ Rückgabe" },
    { id: "rueckgabe", label: "Nur Rückgabe", sub: "ohne Zahlung" },
    { id: "nichts", label: "Nicht geregelt" },
  ],
  bewirtschaftung: [
    { id: "mitEntschaedigung", label: "Ja + Ausgleich", sub: "Ernteausfall bezahlt" },
    { id: "ohne", label: "Ja, ohne Ausgleich" },
    { id: "nein", label: "Nein", sub: "Fläche ruht" },
  ],
  dienstbarkeit: [
    { id: "baubeginn", label: "Ab Finanzierung", sub: "Eintrag vor Baubeginn" },
    { id: "sofortLoeschung", label: "Sofort", sub: "mit Löschungspflicht" },
    { id: "sofortOhne", label: "Sofort", sub: "ohne Löschungsregel" },
  ],
  anwalt: [
    { id: "voll", label: "Voll", sub: "Pächter zahlt" },
    { id: "gedeckelt", label: "Gedeckelt", sub: "bis Betrag X" },
    { id: "keine", label: "Keine", sub: "Sie zahlen selbst" },
  ],
};

export const STANDARD = {
  ha: 20,
  regionId: "de-sued",
  flaechenart: "freiflaeche",
  modell: "fest",
  proHa: 2400,
  umsatzAnteil: 0.05,
  mindestProHa: 1500,
  laufzeit: 30,
  verlaengerungJahre: 10,
  indexArt: "keine",
  indexSatz: 0.015,
  reservierungProHa: 150,
  vorlaufJahre: 3,
  optionsfrist: 5, // 0 = unbegrenzt
  rueckbau: "konzern",
  rueckbauAb: "baubeginn",
  kuendigung: "unbefristet",
  nebenflaechen: "teilweise",
  nichtbau: "rueckgabe",
  bewirtschaftung: "ohne",
  dienstbarkeit: "sofortLoeschung",
  rangruecktritt: false,
  anwalt: "gedeckelt",
  anwaltBetrag: 1000,
  diskont: PACHT.diskontEigentuemer,
};

/* ------------------------------------------------------------------ */
/* Hilfen                                                              */
/* ------------------------------------------------------------------ */

const fmtDe = (n, s = 0) => (Number.isFinite(n) ? n.toLocaleString("de-DE", { minimumFractionDigits: s, maximumFractionDigits: s }) : "–");
const PUNKTE = { gut: 2, pruefen: 1, kritisch: 0 };

/** Marktspanne €/ha·a je Flächenart */
export function marktSpanne(flaechenart) {
  return flaechenart === "agri" ? PACHT.agriProHa : PACHT.freiflaecheProHa;
}

/** Leistung und Jahresertrag auf der Fläche */
export function parkLeistung(ha, regionId, flaechenart) {
  const haProMwp = flaechenart === "agri" ? BAUART.agriHoch.haProMwp : FREIFLAECHE.haProMwp;
  const faktor = flaechenart === "agri" ? BAUART.agriHoch.faktor : 1;
  const kwp = (ha / haProMwp) * 1000;
  const region = regionById(regionId);
  return { kwp, kwh: kwp * region.ertrag * faktor, region };
}

/** Strompreis (ct/kWh) im Betriebsjahr t (0-basiert): EEG-Wert 20 Jahre, danach Marktwert */
const preisCt = (t) => (t < 20 ? ERLOESE.eegFreiflaecheCt : ERLOESE.merchantCt * Math.pow(1 + ERLOESE.merchantSteigerung, t));

/** Zahlungsreihe (Vorlauf + Betrieb) für ein Angebot */
export function zahlungsreihe(e) {
  const { kwh } = parkLeistung(e.ha, e.regionId, e.flaechenart);
  const jahre = [];
  const index = e.indexArt === "vpi" ? PACHT.indexierung : e.indexArt === "fest" ? e.indexSatz : 0;
  for (let j = 1; j <= e.vorlaufJahre + e.laufzeit; j++) {
    const betrieb = j > e.vorlaufJahre;
    const t = j - e.vorlaufJahre - 1;
    let betrag;
    let umsatz = 0;
    if (!betrieb) betrag = e.ha * e.reservierungProHa;
    else if (e.modell === "fest") betrag = e.ha * e.proHa * Math.pow(1 + index, t);
    else {
      umsatz = kwh * Math.pow(1 - FREIFLAECHE.degradation, t) * (preisCt(t) / 100) * e.umsatzAnteil;
      const mindest = e.modell === "kombi" ? e.ha * e.mindestProHa * Math.pow(1 + index, t) : 0;
      betrag = Math.max(umsatz, mindest);
    }
    jahre.push({ jahr: j, betrieb, betrag, umsatz });
  }
  return jahre;
}

const barwert = (reihe, d) => reihe.reduce((s, x) => s + x.betrag / Math.pow(1 + d, x.jahr), 0);

/* ------------------------------------------------------------------ */
/* Klauselbewertung                                                    */
/* ------------------------------------------------------------------ */

function klauseln(e, r) {
  const spanne = marktSpanne(e.flaechenart);
  const k = [];
  const opt = (liste, id) => OPTIONEN[liste].find((o) => o.id === id);

  // 1 Pachthöhe
  const p1 = r.proHaErstesJahr;
  k.push({
    id: "hoehe",
    titel: "Pachthöhe",
    wert: `${fmtDe(p1)} €/ha im 1. Betriebsjahr`,
    ampel: p1 < spanne.min ? "kritisch" : p1 < spanne.mittel ? "pruefen" : "gut",
    text:
      p1 < spanne.min
        ? `Unter der üblichen Spanne von ${fmtDe(spanne.min)}–${fmtDe(spanne.max)} €/ha. Das kann an Netz, Größe oder Baurecht liegen – lassen Sie sich die Kalkulation erläutern und holen Sie ein Vergleichsangebot ein.`
        : p1 < spanne.mittel
          ? `Im unteren Teil der üblichen Spanne (${fmtDe(spanne.min)}–${fmtDe(spanne.max)} €/ha). Mit nahem Netzanschluss und guter Kulisse ist oft mehr möglich.`
          : `Im oberen Teil der üblichen Spanne (${fmtDe(spanne.min)}–${fmtDe(spanne.max)} €/ha). Achten Sie darauf, dass die übrigen Klauseln die Pacht nicht wieder entwerten.`,
    frage: "Wie setzt sich die angebotene Pacht zusammen, und welche Annahmen zu Netzanschluss, Leistung und Erlösen liegen ihr zugrunde?",
  });

  // 2 Vergütungsmodell
  if (e.modell !== "fest") {
    const u = e.umsatzAnteil;
    const ohneMindest = e.modell === "umsatz";
    k.push({
      id: "modell",
      titel: "Umsatzbeteiligung",
      wert: `${fmtDe(u * 100, 1)} % der Stromerlöse${e.modell === "kombi" ? `, mind. ${fmtDe(e.mindestProHa)} €/ha` : ", ohne Mindestpacht"}`,
      ampel: u < PACHT.umsatzbeteiligung.min ? "kritisch" : ohneMindest || u < (PACHT.umsatzbeteiligung.min + PACHT.umsatzbeteiligung.max) / 2 ? "pruefen" : "gut",
      text: ohneMindest
        ? "Ohne Mindestpacht tragen Sie das volle Preis- und Ertragsrisiko – auch bei Abregelung und negativen Strompreisen. Üblich ist eine Kombination mit Mindestpacht."
        : `Üblich sind ${fmtDe(PACHT.umsatzbeteiligung.min * 100)}–${fmtDe(PACHT.umsatzbeteiligung.max * 100)} % der Erlöse. Wichtig: Worauf genau bezieht sich der Prozentsatz (Netto-Stromerlös, inkl. Marktprämie, nach Direktvermarktungskosten?) und welches Einsichtsrecht haben Sie?`,
      frage: "Auf welche Erlöse bezieht sich die Umsatzbeteiligung genau, wie wird sie abgerechnet und welches Einsichtsrecht in die Abrechnung habe ich?",
    });
  }

  // 3 Indexierung
  const idxWirkt = e.modell !== "umsatz";
  const kaufkraft = 1 / Math.pow(1 + FREIFLAECHE.inflation, e.laufzeit);
  const idxSatz = e.indexArt === "vpi" ? PACHT.indexierung : e.indexArt === "fest" ? e.indexSatz : 0;
  k.push({
    id: "index",
    titel: "Wertsicherung (Indexierung)",
    wert: !idxWirkt ? "über Umsatz" : e.indexArt === "keine" ? "keine" : e.indexArt === "vpi" ? "Verbraucherpreisindex" : `fest ${fmtDe(e.indexSatz * 100, 1)} % p. a.`,
    ampel: !idxWirkt ? "gut" : e.indexArt === "keine" ? "kritisch" : idxSatz < 0.01 ? "pruefen" : "gut",
    text: !idxWirkt
      ? "Eine reine Umsatzbeteiligung wächst mit Strompreis und Erzeugung – eine eigene Indexierung ist nicht nötig."
      : e.indexArt === "keine"
        ? `Ohne Wertsicherung hat die letzte Jahrespacht bei ${fmtDe(FREIFLAECHE.inflation * 100)} % Inflation nur noch rund ${fmtDe(kaufkraft * 100)} % der heutigen Kaufkraft. Üblich ist eine Anpassung an den Verbraucherpreisindex oder eine feste Staffel.`
        : idxSatz < 0.01
          ? "Die Steigerung liegt unter der üblichen Inflation – die Pacht verliert real an Wert."
          : "Die Pacht ist gegen Geldentwertung gesichert. Prüfen Sie, ob die Anpassung jährlich oder erst ab einer Schwelle greift und ob sie auch nach unten wirken kann.",
    frage: "Wie wird die Pacht wertgesichert – Index, Basisjahr, Anpassungsrhythmus, Schwelle – und gilt das auch für die Mindestpacht?",
  });

  // 4 Laufzeit
  const gesamt = e.laufzeit + e.verlaengerungJahre;
  k.push({
    id: "laufzeit",
    titel: "Laufzeit und Verlängerung",
    wert: `${e.laufzeit} Jahre fest${e.verlaengerungJahre ? ` + ${e.verlaengerungJahre} Jahre Option` : ""}`,
    ampel:
      e.laufzeit > PACHT.festlaufzeitMax + 5 || gesamt > 45
        ? "kritisch"
        : e.laufzeit > PACHT.festlaufzeitMax || e.verlaengerungJahre > PACHT.verlaengerungMax || e.laufzeit < 20
          ? "pruefen"
          : "gut",
    text:
      e.laufzeit < 20
        ? "Unter 20 Jahren ist ein Solarpark schwer zu finanzieren – das kann das Projekt selbst gefährden. Fragen Sie nach, ob der Projektierer damit bauen kann."
        : e.laufzeit > PACHT.festlaufzeitMax + 5 || gesamt > 45
          ? `Eine Bindung über ${gesamt} Jahre reicht weit in die nächste Generation. Üblich sind ${PACHT.laufzeit} Jahre fest plus ${PACHT.verlaengerung}.`
          : e.laufzeit > PACHT.festlaufzeitMax || e.verlaengerungJahre > PACHT.verlaengerungMax
            ? `Etwas länger als üblich (${PACHT.laufzeit} Jahre + ${PACHT.verlaengerung}). Achten Sie darauf, dass Verlängerungen nur zu angepassten Konditionen und mit Frist ausgeübt werden können.`
            : "Marktüblich. Wichtig: Beginnt die Laufzeit mit Vertragsschluss oder erst mit Baubeginn/Inbetriebnahme – und endet sie spätestens zu einem festen Datum?",
    frage: "Ab wann läuft die Festlaufzeit, zu welchen Konditionen werden Optionen ausgeübt und gibt es ein spätestes Enddatum?",
  });

  // 5 Reservierungsprämie
  const res = e.reservierungProHa;
  k.push({
    id: "reservierung",
    titel: "Reservierungsprämie bis Baubeginn",
    wert: res > 0 ? `${fmtDe(res)} €/ha pro Jahr` : "keine",
    ampel: res <= 0 ? "kritisch" : res < PACHT.reservierungProHa.min ? "pruefen" : "gut",
    text:
      res <= 0
        ? `Ohne Prämie binden Sie die Fläche für Jahre, ohne dafür bezahlt zu werden. Üblich sind ${fmtDe(PACHT.reservierungProHa.min)}–${fmtDe(PACHT.reservierungProHa.max)} €/ha und Jahr bis Baubeginn.`
        : res < PACHT.reservierungProHa.min
          ? `Unter dem Üblichen (${fmtDe(PACHT.reservierungProHa.min)}–${fmtDe(PACHT.reservierungProHa.max)} €/ha·a).`
          : "Marktüblich. Sie bewirtschaften die Fläche bis Baubeginn in der Regel weiter.",
    frage: "Wird die Reservierungsprämie jährlich im Voraus gezahlt, und wird sie auf die spätere Pacht angerechnet?",
  });

  // 6 Optionsfrist
  const of = e.optionsfrist;
  k.push({
    id: "optionsfrist",
    titel: "Längste Frist bis Baubeginn",
    wert: of === 0 ? "unbegrenzt" : `${of} Jahre`,
    ampel: of === 0 || of > PACHT.reservierungJahre.max ? "kritisch" : of > PACHT.reservierungJahre.ueblich ? "pruefen" : "gut",
    text:
      of === 0
        ? "Ohne spätestes Datum für den Baubeginn kann die Fläche unbegrenzt blockiert sein. Vereinbaren Sie eine feste Frist mit automatischem Vertragsende."
        : of > PACHT.reservierungJahre.max
          ? `Länger als üblich. Planung und Genehmigung dauern oft ${PACHT.reservierungJahre.ueblich}–${PACHT.reservierungJahre.max} Jahre – eine Verlängerung sollte nur gegen höhere Prämie möglich sein.`
          : of > PACHT.reservierungJahre.ueblich
            ? "Vertretbar, wenn die Prämie in der Verlängerung steigt und Sie danach frei werden."
            : "Kurz und klar. Prüfen Sie, ob der Projektierer realistisch in dieser Zeit Baurecht und Netzanschluss erreicht.",
    frage: "Bis zu welchem Datum muss spätestens gebaut werden, und was passiert automatisch, wenn es nicht dazu kommt?",
  });

  // 7 Rückbausicherheit
  const rb = e.rueckbau;
  k.push({
    id: "rueckbau",
    titel: "Rückbausicherheit",
    wert: `${opt("rueckbau", rb).label}${rb !== "keine" ? (e.rueckbauAb === "baubeginn" ? ", ab Baubeginn" : ", erst später") : ""}`,
    ampel: rb === "keine" ? "kritisch" : rb === "buergschaft" && e.rueckbauAb === "baubeginn" ? "gut" : "pruefen",
    text:
      rb === "keine"
        ? `Ohne Sicherheit bleiben Sie im schlimmsten Fall auf dem Rückbau sitzen – Größenordnung ${fmtDe(Math.round(r.rueckbauKosten / 1000) * 1000)} € für diese Fläche. Eine Bankbürgschaft ist Standard.`
        : rb === "buergschaft"
          ? e.rueckbauAb === "baubeginn"
            ? `Standard. Achten Sie auf eine unbefristete, selbstschuldnerische Bürgschaft eines Kreditinstituts oder Versicherers über mindestens die Rückbaukosten (Größenordnung ${fmtDe(Math.round(r.rueckbauKosten / 1000) * 1000)} €) und eine regelmäßige Anpassung.`
            : "Die Bürgschaft sollte spätestens mit Baubeginn vorliegen – nicht erst Jahre später."
          : rb === "konzern"
            ? "Eine Konzernbürgschaft ist nur so viel wert wie die Muttergesellschaft in 30 Jahren. Besser ist eine Bank- oder Versicherungsbürgschaft."
            : "Eine Rücklage aus dem laufenden Betrieb fehlt, wenn die Betreibergesellschaft vorher insolvent wird. Verlangen Sie eine Bürgschaft ab Baubeginn.",
    frage: "Wer stellt die Rückbausicherheit, in welcher Höhe, ab wann, und wie wird sie an steigende Kosten angepasst?",
  });

  // 8 Kündigungsrechte
  k.push({
    id: "kuendigung",
    titel: "Kündigungs- und Rücktrittsrechte",
    wert: opt("kuendigung", e.kuendigung).label + " – " + opt("kuendigung", e.kuendigung).sub,
    ampel: e.kuendigung === "befristet" ? "gut" : e.kuendigung === "unbefristet" ? "pruefen" : "kritisch",
    text:
      e.kuendigung === "befristet"
        ? "Üblich: Der Projektierer darf zurücktreten, solange nicht gebaut ist – aber nur bis zu einem festen Datum. Sie selbst sind ordentlich meist nicht kündbar."
        : e.kuendigung === "unbefristet"
          ? "Ein Rücktrittsrecht ohne Frist lässt Sie jahrelang im Unklaren. Koppeln Sie es an das späteste Baubeginn-Datum."
          : "Kann der Pächter auch im Betrieb jederzeit kündigen, tragen Sie das Risiko, dass der Park bei schlechten Strompreisen vorzeitig verschwindet – samt Pacht. Das ist unüblich.",
    frage: "Welche Kündigungs- und Rücktrittsrechte haben beide Seiten – vor und nach Baubeginn – und was gilt bei Insolvenz des Betreibers?",
  });

  // 9 Nebenflächen
  const nf = e.nebenflaechen;
  k.push({
    id: "nebenflaechen",
    titel: "Nebenflächen (Zuwegung, Kabel, Ausgleich)",
    wert: opt("nebenflaechen", nf).label,
    ampel: nf === "keine" || nf === "verguetet" ? "gut" : "pruefen",
    text:
      nf === "keine"
        ? "Es werden keine weiteren Flächen beansprucht. Klären Sie, ob Kabeltrasse und Ausgleichsflächen später doch über Ihr Land laufen sollen."
        : nf === "verguetet"
          ? "Gut: Wege, Kabeltrassen und naturschutzrechtliche Ausgleichsflächen werden gesondert bezahlt."
          : "Kabeltrassen, Zufahrten und Ausgleichsflächen belasten weitere Grundstücke, oft über Dienstbarkeiten für Jahrzehnte. Verlangen Sie eine eigene Vergütung je Meter oder Hektar.",
    frage: "Welche weiteren Flächen (Zuwegung, Kabeltrasse, Ausgleichsflächen) werden genutzt, und wie werden sie vergütet?",
  });

  // 10 Ausgleich bei Nichtbau
  k.push({
    id: "nichtbau",
    titel: "Ausgleich, wenn nicht gebaut wird",
    wert: opt("nichtbau", e.nichtbau).label,
    ampel: e.nichtbau === "entschaedigung" ? "gut" : e.nichtbau === "rueckgabe" ? "pruefen" : "kritisch",
    text:
      e.nichtbau === "entschaedigung"
        ? "Gut: Scheitert das Projekt, erhalten Sie eine Entschädigung und die Fläche unbelastet zurück (inkl. Löschung aller Einträge)."
        : e.nichtbau === "rueckgabe"
          ? "Die Fläche kommt zurück, aber ohne Ausgleich für die Jahre der Bindung. Eine Abstandszahlung ist verhandelbar."
          : "Nicht geregelt heißt: Streit ist programmiert. Vereinbaren Sie Rückgabe, Löschung der Grundbucheinträge und eine Abstandszahlung.",
    frage: "Was erhalte ich, wenn das Projekt nicht gebaut wird – Entschädigung, Löschung der Einträge, Übergabe der Gutachten?",
  });

  // 11 Bewirtschaftung bis Baubeginn
  k.push({
    id: "bewirtschaftung",
    titel: "Bewirtschaftung bis Baubeginn",
    wert: opt("bewirtschaftung", e.bewirtschaftung).label,
    ampel: e.bewirtschaftung === "mitEntschaedigung" ? "gut" : e.bewirtschaftung === "ohne" ? "pruefen" : "kritisch",
    text:
      e.bewirtschaftung === "mitEntschaedigung"
        ? "Gut: Sie bewirtschaften weiter, Ernteausfälle durch Bodengutachten, Vermessung oder Baubeginn werden ersetzt."
        : e.bewirtschaftung === "ohne"
          ? "Üblich ist, weiter zu bewirtschaften – aber Flurschäden und Ernteausfälle sollten ersetzt werden, und der Baubeginn sollte mit Vorlauf angekündigt werden."
          : "Ruht die Fläche ohne Pacht, verlieren Sie Deckungsbeitrag und ggf. Direktzahlungen. Das ist unüblich.",
    frage: "Darf ich bis Baubeginn weiter bewirtschaften, mit welcher Ankündigungsfrist beginnt der Bau, und wer ersetzt Flurschäden?",
  });

  // 12 Dienstbarkeit/Rang
  const db = e.dienstbarkeit;
  let dAmpel = db === "baubeginn" ? "gut" : db === "sofortLoeschung" ? "pruefen" : "kritisch";
  if (e.rangruecktritt && dAmpel === "gut") dAmpel = "pruefen";
  k.push({
    id: "dienstbarkeit",
    titel: "Dienstbarkeit und Rang im Grundbuch",
    wert: `${opt("dienstbarkeit", db).label} ${opt("dienstbarkeit", db).sub}${e.rangruecktritt ? ", Rangrücktritt gefordert" : ""}`,
    ampel: dAmpel,
    text:
      (db === "baubeginn"
        ? "Die beschränkte persönliche Dienstbarkeit ist für die Finanzierung nötig und üblich – gut, wenn sie erst eingetragen wird, wenn der Bau wirklich kommt."
        : db === "sofortLoeschung"
          ? "Eine sofortige Eintragung (oder Vormerkung) ist verbreitet. Wichtig ist die Pflicht zur Löschung auf Kosten des Pächters, falls nicht gebaut wird."
          : "Eine sofortige Eintragung ohne Löschungsregel kann Ihr Grundstück auf Dauer belasten – auch wenn das Projekt nie kommt.") +
      (e.rangruecktritt
        ? " Die Banken des Parks verlangen meist den ersten Rang: Bestehende Grundschulden müssen zurücktreten – sprechen Sie früh mit Ihrer Bank, das kann Ihre eigene Finanzierung berühren."
        : ""),
    frage: "Wann wird die Dienstbarkeit eingetragen, welchen Rang braucht sie, wer trägt die Kosten und wann wird sie gelöscht?",
  });

  // 13 Anwalt/Notar
  const aw = e.anwalt;
  k.push({
    id: "anwalt",
    titel: "Kosten für Anwalt und Notar",
    wert: aw === "gedeckelt" ? `gedeckelt bis ${fmtDe(e.anwaltBetrag)} €` : opt("anwalt", aw).label,
    ampel: aw === "voll" || (aw === "gedeckelt" && e.anwaltBetrag >= PACHT.anwaltskosten.min) ? "gut" : "pruefen",
    text:
      aw === "keine"
        ? `Verbreitet ist, dass der Projektierer die anwaltliche Prüfung für den Eigentümer übernimmt – häufig ${fmtDe(PACHT.anwaltskosten.min)}–${fmtDe(PACHT.anwaltskosten.max)} €. Notar- und Grundbuchkosten trägt in der Regel der Pächter.`
        : aw === "gedeckelt" && e.anwaltBetrag < PACHT.anwaltskosten.min
          ? `Der Deckel ist knapp – eine gründliche Prüfung kostet oft ${fmtDe(PACHT.anwaltskosten.min)}–${fmtDe(PACHT.anwaltskosten.max)} €.`
          : "Gut – nutzen Sie eine unabhängige Kanzlei Ihrer Wahl, nicht die des Projektierers.",
    frage: "Übernehmen Sie die Kosten einer unabhängigen anwaltlichen Prüfung meiner Wahl sowie Notar- und Grundbuchkosten?",
  });

  return k;
}

/** Standardfragen, die unabhängig vom Angebot geklärt werden sollten */
export const STANDARDFRAGEN = [
  "Wer ist Vertragspartner – eine Projektgesellschaft? Darf der Vertrag ohne meine Zustimmung an Dritte übertragen werden?",
  "Welche Versicherungen bestehen (Haftpflicht, Schäden an Nachbarflächen), und wer haftet für Schäden am Boden?",
  "Wie ist der Zustand der Fläche nach dem Rückbau definiert (Fundamente, Kabel, Bodenverdichtung)?",
  "Was bedeutet die Verpachtung für Erbschaft- und Grundsteuer sowie für die Zuordnung zum land- und forstwirtschaftlichen Vermögen? (Steuerberatung einbeziehen)",
  "Welche Unterlagen erhalte ich, und darf ich die Fläche nach einem gescheiterten Projekt anderweitig anbieten?",
];

/* ------------------------------------------------------------------ */
/* Hauptrechnung                                                       */
/* ------------------------------------------------------------------ */

export function pruefePachtangebot(eingabe = {}) {
  const e = { ...STANDARD, ...eingabe };
  const { kwp, kwh, region } = parkLeistung(e.ha, e.regionId, e.flaechenart);
  const jahre = zahlungsreihe(e);
  const summe = jahre.reduce((s, x) => s + x.betrag, 0);
  const summeVorlauf = jahre.filter((x) => !x.betrieb).reduce((s, x) => s + x.betrag, 0);
  const bw = barwert(jahre, e.diskont);
  const erstes = jahre.find((x) => x.betrieb);
  const proHaErstesJahr = erstes ? erstes.betrag / e.ha : 0;

  // Vergleich: marktübliches Angebot (untere / mittlere / obere Pacht, VPI, übliche Prämie) bei gleichem Vorlauf
  const spanne = marktSpanne(e.flaechenart);
  const markt = (proHa, resProHa) =>
    barwert(zahlungsreihe({ ...e, modell: "fest", indexArt: "vpi", proHa, reservierungProHa: resProHa }), e.diskont);
  const resMitte = (PACHT.reservierungProHa.min + PACHT.reservierungProHa.max) / 2;
  const marktBw = { min: markt(spanne.min, PACHT.reservierungProHa.min), mittel: markt(spanne.mittel, resMitte), max: markt(spanne.max, PACHT.reservierungProHa.max) };
  const imMarkt = (bw - marktBw.min) / (marktBw.max - marktBw.min);

  const rueckbauKosten = kwp * FREIFLAECHE.rueckbauProKwp;
  const r = { kwp, kwh, region, jahre, summe, summeVorlauf, barwert: bw, proHaErstesJahr, rueckbauKosten };
  const liste = klauseln(e, r);
  const zaehler = { gut: 0, pruefen: 0, kritisch: 0 };
  liste.forEach((k) => (zaehler[k.ampel] += 1));
  const punkte = liste.reduce((s, k) => s + PUNKTE[k.ampel], 0) / (liste.length * 2);
  const hoeheKritisch = liste.find((k) => k.id === "hoehe").ampel === "kritisch";
  const urteil =
    zaehler.kritisch === 0 && punkte >= 0.8
      ? { id: "gut", titel: "Solides Angebot", text: "Die wesentlichen Punkte sind marktüblich geregelt. Lassen Sie den Vertragstext trotzdem anwaltlich prüfen." }
      : zaehler.kritisch >= 3 || hoeheKritisch
        ? { id: "kritisch", titel: "Deutlich nachverhandeln", text: "Mehrere zentrale Punkte liegen unter dem Marktüblichen. Unterschreiben Sie nicht, bevor diese geklärt sind." }
        : { id: "pruefen", titel: "Nachverhandeln", text: "Die Richtung stimmt, einzelne Klauseln sollten Sie aber verbessern oder schriftlich klarstellen lassen." };

  const fragen = [...liste.filter((k) => k.ampel !== "gut").map((k) => ({ thema: k.titel, frage: k.frage, ampel: k.ampel })), ...STANDARDFRAGEN.map((f) => ({ thema: "Allgemein", frage: f, ampel: "standard" }))];

  return {
    eingabe: e,
    ...r,
    durchschnittProHa: summe / jahre.length / e.ha,
    marktBw,
    imMarkt,
    anteilMarktMittel: marktBw.mittel > 0 ? bw / marktBw.mittel : null,
    klauseln: liste,
    zaehler,
    punkte,
    urteil,
    fragen,
    spanne,
  };
}

/* ------------------------------------------------------------------ */
/* Selbsttest: node src/lib/rechner/pachtangebot.js                    */
/* ------------------------------------------------------------------ */

export function selbsttest() {
  const fehler = [];
  const pruefe = (ok, text) => ok || fehler.push(text);

  const fest = pruefePachtangebot({ ha: 10, modell: "fest", proHa: 3000, indexArt: "keine", vorlaufJahre: 0, laufzeit: 30 });
  pruefe(Math.abs(fest.summe - 900000) < 1, "Festpacht 10 ha × 3.000 € × 30 J. = 900.000 €");
  pruefe(fest.jahre.length === 30, "30 Zahlungsjahre ohne Vorlauf");
  const bwSoll = 30000 * ((1 - Math.pow(1.03, -30)) / 0.03);
  pruefe(Math.abs(fest.barwert - bwSoll) < 1, `Barwert = Rentenbarwert (${Math.round(bwSoll)})`);

  const vorlauf = pruefePachtangebot({ ha: 10, modell: "fest", proHa: 3000, indexArt: "keine", vorlaufJahre: 2, reservierungProHa: 200, laufzeit: 30 });
  pruefe(Math.abs(vorlauf.summeVorlauf - 4000) < 1, "Vorlauf 2 J. × 10 ha × 200 € = 4.000 €");
  pruefe(vorlauf.jahre.length === 32, "Vorlauf verlängert die Zahlungsreihe");

  const idx = pruefePachtangebot({ ha: 10, modell: "fest", proHa: 3000, indexArt: "vpi", vorlaufJahre: 0 });
  pruefe(idx.summe > fest.summe, "Indexierung erhöht die Summe");
  pruefe(idx.klauseln.find((k) => k.id === "index").ampel === "gut", "VPI → grün");
  pruefe(fest.klauseln.find((k) => k.id === "index").ampel === "kritisch", "keine Indexierung → kritisch");

  const niedrig = pruefePachtangebot({ proHa: 1000 });
  pruefe(niedrig.klauseln[0].ampel === "kritisch" && niedrig.urteil.id === "kritisch", "Pacht unter Marktspanne → kritisch, Urteil deutlich nachverhandeln");

  const umsatz = pruefePachtangebot({ ha: 10, modell: "umsatz", umsatzAnteil: 0.06, vorlaufJahre: 0, regionId: "de-sued" });
  const erwartet = (10 / FREIFLAECHE.haProMwp) * 1000 * 1100 * (ERLOESE.eegFreiflaecheCt / 100) * 0.06;
  pruefe(Math.abs(umsatz.jahre[0].betrag - erwartet) < 1, "Umsatzbeteiligung Jahr 1 = kWh × EEG-Wert × Anteil");
  const kombi = pruefePachtangebot({ ha: 10, modell: "kombi", umsatzAnteil: 0.01, mindestProHa: 2000, indexArt: "keine", vorlaufJahre: 0 });
  pruefe(Math.abs(kombi.jahre[0].betrag - 20000) < 1, "Mindestpacht greift bei niedrigem Umsatz");

  const top = pruefePachtangebot({
    proHa: 3500, indexArt: "vpi", reservierungProHa: 250, optionsfrist: 3, rueckbau: "buergschaft", rueckbauAb: "baubeginn", kuendigung: "befristet",
    nebenflaechen: "verguetet", nichtbau: "entschaedigung", bewirtschaftung: "mitEntschaedigung", dienstbarkeit: "baubeginn", anwalt: "voll", verlaengerungJahre: 10,
  });
  pruefe(top.zaehler.kritisch === 0 && top.urteil.id === "gut", "Marktübliches Top-Angebot → Solides Angebot");
  pruefe(top.imMarkt > 0.5, "Top-Angebot liegt in der oberen Markthälfte");
  pruefe(top.fragen.length === STANDARDFRAGEN.length, "bei nur grünen Klauseln nur Standardfragen");
  pruefe(pruefePachtangebot({ optionsfrist: 0 }).klauseln.find((k) => k.id === "optionsfrist").ampel === "kritisch", "unbegrenzte Optionsfrist → kritisch");
  pruefe(pruefePachtangebot({ laufzeit: 40, verlaengerungJahre: 10 }).klauseln.find((k) => k.id === "laufzeit").ampel === "kritisch", "40 + 10 Jahre → kritisch");
  pruefe(pruefePachtangebot({ flaechenart: "agri", proHa: 1300 }).klauseln[0].ampel === "gut", "Agri: 1.300 €/ha über Mitte der Agri-Spanne → grün");
  return { fehler, beispiel: pruefePachtangebot() };
}

if (typeof process !== "undefined" && process.argv?.[1] && /pachtangebot\.js$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const { fehler, beispiel: r } = selbsttest();
  console.log(
    `Beispiel 20 ha, 2.400 €/ha fest: Summe ${Math.round(r.summe)} €, Barwert ${Math.round(r.barwert)} €, Marktposition ${(r.imMarkt * 100).toFixed(0)} %, ` +
      `Ampel ${r.zaehler.gut}/${r.zaehler.pruefen}/${r.zaehler.kritisch} → ${r.urteil.titel}`
  );
  if (fehler.length) {
    console.error("FEHLER:\n- " + fehler.join("\n- "));
    process.exit(1);
  }
  console.log("Selbsttest pachtangebot.js: alle Prüfungen bestanden.");
}
