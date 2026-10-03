// src/lib/rechner/netzanschluss.js
//
// Netzanschluss-Check für Solarparks: grobe Kosten, Zeitrahmen, Risiken und
// Tipps je nach Größe, Entfernung, Spannungsebene, Netzkapazität, Überbauung
// und Speicher. Reine Funktionen ohne React:
//
//   node src/lib/rechner/netzanschluss.js      → Selbsttest
//
// Grundlagen (DE): § 8 EEG (Anschlusspflicht, Netzverknüpfungspunkt, Fristen),
// § 8a EEG (flexible Netzanschlussvereinbarung / Überbauung), § 16 EEG (Kosten
// des Anschlusses bis zum Verknüpfungspunkt trägt der Anlagenbetreiber),
// § 17 EEG (Kosten der Kapazitätserweiterung trägt der Netzbetreiber).
// Ein Baukostenzuschuss fällt für reine Einspeiser in der Regel nicht an –
// wohl aber für Netzbezug, etwa eines Speichers, der aus dem Netz lädt.
// Kostenbausteine: FREIFLAECHE (+ .netz), SPEICHER.bkzProKw (markt.js).

import { ERLOESE, FREIFLAECHE, REGIONEN, SPEICHER, laenderSperre } from "../invest/markt.js";

const N = FREIFLAECHE.netz;

export const EBENEN = [
  { id: "auto", label: "Automatisch", sub: "nach Leistung" },
  { id: "msLeitung", label: "MS-Leitung", sub: "Einschleifen 20 kV" },
  { id: "uwMs", label: "Umspannwerk", sub: "MS-Sammelschiene" },
  { id: "hs", label: "110 kV", sub: "eigenes Umspannwerk" },
];

export const KAPAZITAETEN = [
  { id: "frei", label: "Bekannt: frei", sub: "Auskunft liegt vor" },
  { id: "unbekannt", label: "Unbekannt", sub: "noch nicht angefragt" },
  { id: "knapp", label: "Bekannt: knapp", sub: "Ausbau nötig" },
];

export const LAENDER = [
  { id: "de", label: "Deutschland" },
  { id: "at", label: "Österreich" },
  { id: "ch", label: "Schweiz" },
];

export const STANDARD = {
  mwp: 10,
  anschlussQuote: 1,
  km: 2,
  ebene: "auto",
  kapazitaet: "unbekannt",
  speicherMw: 0,
  speicherNetzbezug: false,
  cluster: false,
  land: "de",
};

/** Spannweite der Kostenschätzung (Tiefbau, Querungen, Genehmigungen, Materialpreise) */
export const SPANNE = { min: 0.8, max: 1.4 };
/** Anteil gemeinsam genutzter Kosten (Trasse, Umspannwerk), die bei Clusterung mit einem Nachbarprojekt entfallen – eigene Annahme */
export const CLUSTER_ANTEIL = 0.5;

const ERTRAG_DE = Math.round(REGIONEN.filter((r) => r.land === "DE").reduce((s, r) => s + r.ertrag, 0) / REGIONEN.filter((r) => r.land === "DE").length);

/** Energieverlust (Anteil) bei Anschlussleistung/Modulleistung – lineare Interpolation der Tabelle */
export function abregelVerlust(quote) {
  const t = N.abregelung;
  if (quote >= t[0][0]) return 0;
  for (let i = 1; i < t.length; i++) {
    const [q1, v1] = t[i - 1];
    const [q2, v2] = t[i];
    if (quote >= q2) return v1 + ((q1 - quote) / (q1 - q2)) * (v2 - v1);
  }
  return t[t.length - 1][1];
}

export function ebeneFuer(anschlussMw) {
  return anschlussMw <= N.grenzeMsMw ? "msLeitung" : anschlussMw <= N.grenzeUwMw ? "uwMs" : "hs";
}

/** Kosten (mittlerer Schätzwert) für eine gegebene Anschlussleistung */
export function kosten(e, anschlussMw, ebene) {
  const posten = [];
  const kabelSysteme = Math.max(1, Math.ceil(anschlussMw / N.msSystemMw - 1e-9));
  const kabelMs = e.km * 1000 * FREIFLAECHE.kabelProMeter * (1 + (kabelSysteme - 1) * N.zusatzSystemFaktor);
  const teil = e.cluster ? 1 - CLUSTER_ANTEIL : 1;

  posten.push({ id: "station", label: "Übergabe- und Trafostationen im Park", eur: e.mwp * FREIFLAECHE.netzanschlussFixProMwp, geteilt: false });
  if (ebene === "msLeitung") {
    posten.push({ id: "einschleifen", label: "Einschleifen in die MS-Leitung", eur: N.einschleifen, geteilt: false });
    posten.push({ id: "kabel", label: `Kabeltrasse 20 kV (${kabelSysteme} ${kabelSysteme > 1 ? "Systeme" : "System"})`, eur: kabelMs * teil, geteilt: e.cluster });
  } else if (ebene === "uwMs") {
    posten.push({ id: "feld", label: `Schaltfeld${kabelSysteme > 1 ? "er" : ""} im Umspannwerk (${kabelSysteme})`, eur: N.uwFeld.mittel * kabelSysteme, geteilt: false });
    posten.push({ id: "kabel", label: `Kabeltrasse 20 kV (${kabelSysteme} ${kabelSysteme > 1 ? "Systeme" : "System"})`, eur: kabelMs * teil, geteilt: e.cluster });
  } else {
    posten.push({ id: "uw", label: "Eigenes Umspannwerk 110/20 kV", eur: (N.kundenUwFix + N.kundenUwProMva * anschlussMw) * teil, geteilt: e.cluster });
    posten.push({ id: "kabel", label: "Kabeltrasse 110 kV", eur: e.km * N.hsKabelProKm.mittel * teil, geteilt: e.cluster });
  }
  if (e.speicherMw > 0 && e.speicherNetzbezug) {
    const satz = ebene === "hs" ? SPEICHER.bkzProKw.hs : SPEICHER.bkzProKw.ms;
    posten.push({ id: "bkz", label: "Baukostenzuschuss für Netzbezug des Speichers", eur: e.speicherMw * 1000 * satz, geteilt: false });
  }
  const summe = posten.reduce((s, p) => s + p.eur, 0);
  return { posten, summe, kabelSysteme };
}

export function rechneNetzanschluss(eingabe = {}) {
  const e = { ...STANDARD, ...eingabe };
  const anschlussMw = e.mwp * e.anschlussQuote;
  const vorschlag = ebeneFuer(anschlussMw);
  const ebene = e.ebene === "auto" ? vorschlag : e.ebene;
  const k = kosten(e, anschlussMw, ebene);

  // Überbauung: Vergleich mit voller Anschlussleistung
  const voll = kosten(e, e.mwp, e.ebene === "auto" ? ebeneFuer(e.mwp) : ebene);
  const einsparung = Math.max(0, voll.summe - k.summe);
  const verlustRoh = abregelVerlust(e.anschlussQuote);
  const kappung = Math.max(0, e.mwp - anschlussMw);
  const speicherAuffang = kappung > 0 ? Math.min(1, e.speicherMw / kappung) * 0.8 : 0;
  const verlust = verlustRoh * (1 - speicherAuffang);
  const ertragKwh = e.mwp * 1000 * ERTRAG_DE;
  const verlustKwh = ertragKwh * verlust;
  const verlustEurJahr = (verlustKwh * ERLOESE.eegFreiflaecheCt) / 100;
  const bwFaktor20 = (1 - Math.pow(1.05, -20)) / 0.05; // Barwert 20 Jahre bei 5 %
  const verlustBarwert = verlustEurJahr * bwFaktor20;

  // Zeitrahmen in Monaten ab vollständigem Netzanschlussbegehren
  const basis = { msLeitung: [9, 18], uwMs: [12, 30], hs: [24, 48] }[ebene];
  const plus = { frei: [0, 0], unbekannt: [0, 12], knapp: [24, 60] }[e.kapazitaet];
  const trasse = e.km > 5 ? [3, 9] : [0, 0];
  const monate = [basis[0] + plus[0] + trasse[0], basis[1] + plus[1] + trasse[1]];

  const capexAnlage = e.mwp * 1000 * FREIFLAECHE.capexProKwp.mittel;

  // Ampel: Kostenanteil an der Anlage und Kapazität
  const anteil = k.summe / capexAnlage;
  const ampel = e.kapazitaet === "knapp" || anteil > 0.3 ? "kritisch" : e.kapazitaet === "unbekannt" || anteil > 0.15 ? "pruefen" : "gut";

  const risiken = [];
  if (e.kapazitaet === "knapp") risiken.push("Netzausbau durch den Netzbetreiber nötig – die Kosten trägt er (§ 17 EEG), die Zeit tragen Sie: oft mehrere Jahre bis zur Einspeisung.");
  if (e.kapazitaet === "unbekannt") risiken.push("Kapazität unbekannt: Die Netzverträglichkeitsprüfung kann einen weiter entfernten Verknüpfungspunkt ergeben – das ändert Kosten und Zeitplan erheblich.");
  if (e.km > 5) risiken.push(`Lange Trasse (${e.km.toLocaleString("de-DE")} km): Jedes Flurstück braucht eine Leitungsdienstbarkeit; Querungen von Straßen, Bahn und Gewässern verlängern Planung und Genehmigung.`);
  if (ebene === "hs") risiken.push("110-kV-Anschluss: eigenes Umspannwerk mit langen Lieferzeiten für Transformatoren und eigenem Genehmigungsverfahren.");
  if (anteil > 0.15) risiken.push(`Der Netzanschluss macht rund ${Math.round(anteil * 100)} % der Anlagenkosten aus – das drückt die Rendite spürbar.`);
  if (e.speicherMw > 0 && e.speicherNetzbezug) risiken.push("Speicher mit Netzbezug: Baukostenzuschuss (BGH, 15.07.2025) und Bezugsnetzentgelte einplanen; Befreiungen nach aktuellem Stand befristet.");
  if (e.anschlussQuote < 0.7 && e.speicherMw === 0) risiken.push("Starke Überbauung ohne Speicher: spürbare Abregelungsverluste – ein Speicher kann sie großteils auffangen.");
  if (risiken.length === 0) risiken.push("Keine auffälligen Risiken aus den Angaben – entscheidend ist die verbindliche Auskunft des Netzbetreibers.");

  const tipps = [];
  if (e.land === "de") {
    tipps.push(`Netzanschlussbegehren früh und vollständig nach § 8 EEG stellen: Der Netzbetreiber muss unverzüglich einen Zeitplan nennen und spätestens nach ${N.pruefWochen} Wochen das Ergebnis der Netzverträglichkeitsprüfung samt Kostenvoranschlag vorlegen (§ 8 Abs. 5 und 6 EEG).`);
    tipps.push("Reservierung klären: Viele Netzbetreiber reservieren Kapazität nur befristet und verlangen Nachweise zum Projektfortschritt (etwa Flächensicherung, Aufstellungsbeschluss) – teils mit Reservierungsentgelt. Die Regeln unterscheiden sich je Netzbetreiber.");
  }
  if (e.land === "at") tipps.push("Österreich: Netzzugang beim Verteilnetzbetreiber beantragen; es fallen Netzzutritts- und ggf. Netzbereitstellungsentgelte an. Kapazitäten werden je Netzbereich veröffentlicht – früh prüfen.");
  if (e.land === "ch") tipps.push("Schweiz: Anschlussbedingungen des Verteilnetzbetreibers maßgeblich; notwendige Netzverstärkungen werden in der Regel über die Netzkosten (Swissgrid) getragen – vorab bestätigen lassen.");
  if (!e.cluster) tipps.push("Clusterung prüfen: Mit Nachbarprojekten eine gemeinsame Trasse oder ein gemeinsames Umspannwerk nutzen – das teilt Kosten und Planungsaufwand.");
  else tipps.push("Clusterung: Kostenaufteilung, Bauabfolge und Haftung bei Verzögerung eines Partners vertraglich regeln.");
  if (e.anschlussQuote >= 0.95) tipps.push("Überbauung erwägen: Mit 70–80 % Anschlussleistung je MWp gehen oft nur wenige Prozent Ertrag verloren; eine flexible Netzanschlussvereinbarung nach § 8a EEG kann Kapazität schneller verfügbar machen.");
  if (e.speicherMw === 0) tipps.push("Speicher am selben Anschluss (Co-Location) glättet die Einspeisespitze, fängt Abregelung auf und schafft zusätzliche Erlöse.");
  tipps.push("Leitungsrechte früh sichern: Dienstbarkeiten entlang der Trasse sind oft der längste Weg – parallel zum B-Plan-Verfahren beginnen.");

  return {
    eingabe: e,
    /** Länder-Sperre AT/CH: Kosten, BKZ und EEG-Verlustbewertung folgen deutschem Recht (markt.js LAENDER_SPERRE) */
    sperre: laenderSperre(e.land),
    anschlussMw,
    ebene,
    vorschlag,
    posten: k.posten,
    kabelSysteme: k.kabelSysteme,
    summe: k.summe,
    spanne: { min: k.summe * SPANNE.min, max: k.summe * SPANNE.max },
    proKwp: k.summe / (e.mwp * 1000),
    anteil,
    ampel,
    ueberbauung: { einsparung, verlust, verlustKwh, verlustEurJahr, verlustBarwert, lohnt: einsparung > verlustBarwert, speicherAuffang },
    monate,
    risiken,
    tipps,
  };
}

/* ------------------------------------------------------------------ */
/* Selbsttest: node src/lib/rechner/netzanschluss.js                   */
/* ------------------------------------------------------------------ */

export function selbsttest() {
  const fehler = [];
  const pruefe = (ok, t) => ok || fehler.push(t);

  pruefe(abregelVerlust(1) === 0 && Math.abs(abregelVerlust(0.7) - 0.04) < 1e-9, "Abregelungstabelle exakt an Stützstellen");
  pruefe(Math.abs(abregelVerlust(0.75) - 0.0275) < 1e-9, "Interpolation zwischen 0,8 und 0,7");
  pruefe(ebeneFuer(8) === "msLeitung" && ebeneFuer(25) === "uwMs" && ebeneFuer(60) === "hs", "Ebenenvorschlag nach Leistung");

  const r = rechneNetzanschluss({ mwp: 10, km: 2, anschlussQuote: 1, kapazitaet: "frei" });
  const kabel = 2000 * FREIFLAECHE.kabelProMeter;
  pruefe(r.ebene === "msLeitung", "10 MW → MS-Leitung");
  pruefe(Math.abs(r.summe - (10 * FREIFLAECHE.netzanschlussFixProMwp + N.einschleifen + kabel)) < 1, "Kostensumme MS = Stationen + Einschleifen + Kabel");
  pruefe(r.monate[0] === 9 && r.monate[1] === 18, "Zeitrahmen MS frei 9–18 Monate");

  const gross = rechneNetzanschluss({ mwp: 30, km: 3 });
  pruefe(gross.ebene === "uwMs" && gross.kabelSysteme === 3, "30 MW → Umspannwerk, 3 Kabelsysteme");
  const ueber = rechneNetzanschluss({ mwp: 30, km: 3, anschlussQuote: 0.7 });
  pruefe(ueber.kabelSysteme === 2 && ueber.summe < gross.summe, "Überbauung spart ein Kabelsystem");
  pruefe(ueber.ueberbauung.einsparung > 0 && ueber.ueberbauung.verlust > 0, "Überbauung: Einsparung und Verlust ausgewiesen");
  const mitSp = rechneNetzanschluss({ mwp: 30, km: 3, anschlussQuote: 0.7, speicherMw: 9 });
  pruefe(mitSp.ueberbauung.verlust < ueber.ueberbauung.verlust, "Speicher fängt Abregelung auf");
  const hs = rechneNetzanschluss({ mwp: 80, km: 4 });
  pruefe(hs.ebene === "hs" && hs.summe > 5e6, "80 MW → 110 kV mit mehreren Mio. €");
  const cl = rechneNetzanschluss({ mwp: 80, km: 4, cluster: true });
  pruefe(cl.summe < hs.summe, "Clusterung senkt die Kosten");
  const bkz = rechneNetzanschluss({ mwp: 10, speicherMw: 5, speicherNetzbezug: true });
  pruefe(bkz.posten.some((p) => p.id === "bkz"), "Speicher mit Netzbezug → Baukostenzuschuss");
  pruefe(rechneNetzanschluss({ kapazitaet: "knapp" }).ampel === "kritisch", "knappe Kapazität → kritisch");
  pruefe(Math.abs(r.spanne.max / r.summe - SPANNE.max) < 1e-9, "Spanne konsistent");
  return { fehler, beispiel: r };
}

if (typeof process !== "undefined" && process.argv?.[1] && /netzanschluss\.js$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const { fehler } = selbsttest();
  for (const [mwp, km, q] of [[5, 1, 1], [10, 2, 1], [30, 3, 0.8], [80, 6, 0.8]]) {
    const r = rechneNetzanschluss({ mwp, km, anschlussQuote: q });
    console.log(`${mwp} MWp, ${km} km, ${q * 100} %: ${r.ebene}, ${Math.round(r.summe / 1000)} T€ (${Math.round(r.proKwp)} €/kWp, ${Math.round(r.anteil * 100)} % der Anlage), ${r.monate.join("–")} Monate`);
  }
  if (fehler.length) {
    console.error("FEHLER:\n- " + fehler.join("\n- "));
    process.exit(1);
  }
  console.log("Selbsttest netzanschluss.js: alle Prüfungen bestanden.");
}
