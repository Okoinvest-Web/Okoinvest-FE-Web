// src/lib/rechner/projektbewertung.js
//
// Orientierende Bewertung von Solarprojekten (Projektrechte) nach Phase –
// reine Logik. Ausgangspunkt sind die Marktspannen je Entwicklungsstand aus
// PHASEN (src/lib/invest/markt.js). Werttreiber und -minderer verschieben die
// Spanne. Ergebnis ist eine Einordnung für ein erstes Gespräch, kein Gutachten:
// Den tatsächlichen Preis bestimmen Due Diligence, Verhandlung und Wettbewerb.

import { PHASEN, phaseById, FREIFLAECHE, ERLOESE } from "../invest/markt.js";

export const LAENDER = [
  { id: "DE", label: "Deutschland" },
  { id: "AT", label: "Österreich" },
  { id: "CH", label: "Schweiz" },
];

export const NETZSTATUS = [
  { id: "offen", label: "Noch offen", sub: "keine Anfrage/Zusage" },
  { id: "anfrage", label: "Angefragt", sub: "Netzprüfung läuft" },
  { id: "zusage", label: "Zusage", sub: "Einspeisepunkt benannt" },
  { id: "reserviert", label: "Reserviert", sub: "Kapazität vertraglich" },
];

export const VERMARKTUNG = [
  { id: "keine", label: "Offen" },
  { id: "eeg", label: "EEG-Zuschlag" },
  { id: "ppa", label: "PPA unterschrieben" },
];

export const STANDARD = { mwp: 10, phase: "satzung", netz: "zusage", netzKm: 1.5, vermarktung: "keine", land: "DE" };

const idx = (id) => PHASEN.findIndex((p) => p.id === id);

/**
 * @returns {{ phase, preisKwp:{min,mittel,max}, gesamt:{min,mittel,max}, risiko, risikoStufe, treiber:[], minderer:[], hinweise:[], monateBisRtb }}
 */
export function bewerteProjekt(eingabe = {}) {
  const e = { ...STANDARD, ...eingabe };
  const phase = phaseById(e.phase);
  const pi = idx(phase.id);
  const bestand = phase.id === "cod";
  const kwp = e.mwp * 1000;

  let { min, max } = phase.preisProKwp;
  const treiber = [];
  const minderer = [];
  const hinweise = [];
  let risikoStufe = pi <= 0 ? 5 : pi === 1 ? 4 : pi === 2 ? 3 : pi === 3 ? 2 : 1; // 5 sehr hoch … 0 sehr gering
  if (bestand) risikoStufe = 0;

  // Faktoren multiplizieren die Spanne, Abzüge (€/kWp) verschieben sie
  let faktor = 1;
  let abzug = 0;

  /* --- Netzanschluss ------------------------------------------------ */
  if (!bestand) {
    const netzPhase = idx("netz");
    if (e.netz === "reserviert") {
      faktor *= 1.1;
      treiber.push("Netzkapazität vertraglich reserviert – der größte Engpass im Markt ist gelöst.");
      if (pi < netzPhase) risikoStufe -= 1;
    } else if (e.netz === "zusage") {
      if (pi < netzPhase) {
        faktor *= 1.25;
        risikoStufe -= 1;
        treiber.push("Netzzusage liegt schon vor der üblichen Phase vor – deutlicher Wertsprung.");
      } else {
        treiber.push("Netzzusage mit benanntem Einspeisepunkt.");
      }
    } else if (e.netz === "anfrage") {
      if (pi >= netzPhase) {
        faktor *= 0.7;
        risikoStufe += 1;
        minderer.push("Für diese Phase fehlt die Netzzusage noch – Käufer preisen Verzögerung und Kosten ein.");
      } else {
        hinweise.push("Netzanfrage gestellt: Mit der Zusage steigt der Wert typischerweise spürbar.");
      }
    } else {
      if (pi >= netzPhase) {
        faktor *= 0.5;
        risikoStufe += 2;
        minderer.push("Ohne Netzanfrage ist der Anschluss das zentrale Risiko – viele Käufer steigen erst mit Zusage ein.");
      } else {
        minderer.push("Netzanschluss noch nicht angefragt – in vielen Regionen der Engpass Nummer eins.");
      }
    }

    // Kabeltrasse: Mehrkosten gegenüber ~1 km Standard mindern den Wert direkt
    const mehrKm = Math.max(0, e.netzKm - 1);
    if (mehrKm > 0) {
      abzug += (mehrKm * 1000 * FREIFLAECHE.kabelProMeter) / kwp;
      const eurKwp = Math.round((mehrKm * 1000 * FREIFLAECHE.kabelProMeter) / kwp);
      if (eurKwp >= 5) minderer.push(`Kabeltrasse ${String(e.netzKm).replace(".", ",")} km: rund ${eurKwp} €/kWp Mehrkosten für den Käufer.`);
    } else {
      treiber.push("Einspeisepunkt in unmittelbarer Nähe – geringe Anschlusskosten.");
    }
    if (e.netzKm > 8) {
      risikoStufe += 1;
      minderer.push("Lange Trasse bedeutet zusätzliche Wegerechte und Genehmigungen.");
    }
  }

  /* --- Größe ----------------------------------------------------------- */
  if (e.mwp < 3) {
    faktor *= 0.75;
    minderer.push("Unter 3 MWp: Fixkosten für Netz, Gutachten und Due Diligence verteilen sich auf wenig Leistung – kleinerer Käuferkreis.");
  } else if (e.mwp < 8) {
    faktor *= 0.9;
    minderer.push("Unter 8 MWp: für institutionelle Käufer oft unter der Mindestgröße.");
  } else if (e.mwp >= 50) {
    faktor *= 1.12;
    treiber.push("Ab 50 MWp: interessant für institutionelle Investoren und Portfoliokäufer.");
  } else if (e.mwp >= 20) {
    faktor *= 1.06;
    treiber.push("Ab 20 MWp: breiter Käuferkreis, Skaleneffekte bei Bau und Betrieb.");
  }

  /* --- Vermarktung ---------------------------------------------------- */
  if (e.vermarktung === "eeg") {
    if (e.land !== "DE") {
      hinweise.push("EEG-Zuschlag gibt es nur in Deutschland – in Österreich entspricht dem die EAG-Marktprämie aus der Ausschreibung.");
    }
    if (pi >= idx("satzung") || bestand) {
      faktor *= 1.12;
      risikoStufe -= 1;
      treiber.push("Zuschlag gesichert: 20 Jahre Marktprämie als Erlösboden – bankfähig.");
    } else {
      hinweise.push("Ein Zuschlag setzt in der Regel Baurecht voraus – bitte Phase prüfen.");
    }
  } else if (e.vermarktung === "ppa") {
    faktor *= 1.1;
    risikoStufe -= 1;
    treiber.push("Unterschriebener PPA: planbare Erlöse, erleichtert die Finanzierung.");
  } else if (pi >= idx("satzung")) {
    hinweise.push(`Noch ohne Vermarktung: Zuletzt lagen EEG-Zuschläge um ${String(ERLOESE.eegFreiflaecheCt).replace(".", ",")} ct/kWh, PPA-Preise grob zwischen ${String(ERLOESE.ppaCt.min).replace(".", ",")} und ${String(ERLOESE.ppaCt.max).replace(".", ",")} ct/kWh.`);
  }

  /* --- Land ------------------------------------------------------------ */
  if (e.land === "AT") {
    hinweise.push("Österreich: Flächenwidmung (z. B. Grünland-Photovoltaik) und Förderung nach EAG (Marktprämie bzw. Investitionszuschuss) prägen den Wert; ab bestimmten Größen ist eine UVP-Prüfung nötig.");
  } else if (e.land === "CH") {
    faktor *= 0.9;
    hinweise.push("Schweiz: kleiner Markt für Freiflächenprojekte, Bewilligung meist über Nutzungsplanung bzw. Solarexpress (alpine Anlagen) – Vergleichswerte sind rar, die Spanne ist unsicherer.");
  }

  if (!bestand && pi < idx("aufstellung")) {
    hinweise.push("Frühe Phase: Viele Käufer zahlen gestaffelt – ein Teil bei Signing, der Rest bei Meilensteinen (Satzungsbeschluss, RTB).");
  }
  if (bestand) {
    hinweise.push("Bestandsanlage: Maßgeblich sind Erlöse, Restlaufzeit von Förderung/PPA, Pachtvertrag, technischer Zustand und Ertragshistorie – der Wert folgt dem Barwert der Cashflows.");
  }

  const clamp = (v) => Math.max(0, v);
  const preisKwp = {
    min: clamp(min * faktor - abzug),
    max: clamp(max * faktor - abzug),
  };
  preisKwp.mittel = (preisKwp.min + preisKwp.max) / 2;
  const gesamt = { min: preisKwp.min * kwp, mittel: preisKwp.mittel * kwp, max: preisKwp.max * kwp };

  // Vor Inbetriebnahme bleibt immer ein Rest-Risiko (Bau, Netz, Vermarktung)
  risikoStufe = Math.max(bestand ? 0 : 1, Math.min(5, risikoStufe));
  const RISIKO = ["sehr gering", "gering", "mittel", "mittel–hoch", "hoch", "sehr hoch"];

  return {
    eingabe: e,
    phase,
    phaseIndex: pi,
    kwp,
    faktor,
    abzugKwp: abzug,
    preisKwp,
    gesamt,
    risiko: RISIKO[risikoStufe],
    risikoStufe,
    treiber,
    minderer,
    hinweise,
    monateBisRtb: phase.monateBisRtb,
    kaufpreisNull: preisKwp.max <= 0,
  };
}

/* ------------------------------------------------------------------ */
/* Selbsttest: node src/lib/rechner/projektbewertung.js                */
/* ------------------------------------------------------------------ */

export function selbsttest() {
  const fehler = [];
  const pruefe = (ok, text) => {
    if (!ok) fehler.push(text);
  };
  const neutral = bewerteProjekt({ mwp: 10, phase: "rtb", netz: "zusage", netzKm: 1, vermarktung: "keine", land: "DE" });
  pruefe(neutral.preisKwp.min === 60 && neutral.preisKwp.max === 130, "RTB neutral = PHASEN-Spanne");
  pruefe(neutral.gesamt.min === 600000, "10 MWp × 60 €/kWp = 600.000 €");

  for (let i = 1; i < PHASEN.length; i++) {
    const a = bewerteProjekt({ phase: PHASEN[i - 1].id, netz: "zusage", netzKm: 1 });
    const b = bewerteProjekt({ phase: PHASEN[i].id, netz: "zusage", netzKm: 1 });
    pruefe(b.preisKwp.mittel >= a.preisKwp.mittel * 0.9, `Wert steigt tendenziell mit der Phase (${PHASEN[i].id})`);
  }
  const ohneNetz = bewerteProjekt({ phase: "rtb", netz: "offen" });
  pruefe(ohneNetz.preisKwp.mittel < neutral.preisKwp.mittel, "fehlende Netzanfrage mindert den Wert");
  const weit = bewerteProjekt({ phase: "rtb", netz: "zusage", netzKm: 6 });
  pruefe(weit.preisKwp.mittel < neutral.preisKwp.mittel && weit.minderer.length > 0, "lange Trasse mindert den Wert");
  const klein = bewerteProjekt({ mwp: 2, phase: "rtb", netz: "zusage", netzKm: 1 });
  pruefe(klein.preisKwp.mittel < neutral.preisKwp.mittel, "kleine Projekte je kWp günstiger");
  const eeg = bewerteProjekt({ phase: "rtb", netz: "zusage", netzKm: 1, vermarktung: "eeg" });
  pruefe(eeg.preisKwp.mittel > neutral.preisKwp.mittel && eeg.risikoStufe <= neutral.risikoStufe, "Zuschlag erhöht Wert, senkt Risiko");
  const extrem = bewerteProjekt({ mwp: 1, phase: "flaeche", netz: "offen", netzKm: 20 });
  pruefe(extrem.preisKwp.min >= 0 && extrem.preisKwp.max >= 0, "nie negative Preise");
  pruefe(bewerteProjekt({ phase: "cod" }).preisKwp.min > 300, "Bestand bewertet als Anlage");
  return fehler;
}

if (typeof process !== "undefined" && process.argv?.[1] && /projektbewertung\.js$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const f = selbsttest();
  for (const p of PHASEN) {
    const r = bewerteProjekt({ phase: p.id });
    console.log(p.id.padEnd(12), Math.round(r.preisKwp.min), "–", Math.round(r.preisKwp.max), "€/kWp", r.risiko);
  }
  if (f.length) {
    console.error("FEHLER:\n- " + f.join("\n- "));
    process.exit(1);
  }
  console.log("Selbsttest projektbewertung.js: alle Prüfungen bestanden.");
}
