// src/lib/plattform/buchhaltung/mahnwesen.js
//
// Mahnwesen – reine Funktionen (ohne Node-/React-Importe). Stufen, Fristen und Gebühren sind KONFIGURIERBAR
// (Demo: db.buchhaltung.mahnwesen, Frappe: „Plattform Buchhaltung Einstellungen“). Python-Gegenstück:
// Backend-Import/oekoinvest_app/oekoinvest_app/plattform/buchhaltung_kern.py
//
// Rechtlicher Rahmen (Orientierung, keine Rechtsberatung – vor Einsatz mit Steuer-/Rechtsberatung abstimmen):
//   Verzugszinsen B2B   DE 9 Prozentpunkte über dem Basiszinssatz (§ 288 Abs. 2 BGB), AT 9,2 Prozentpunkte über dem
//                       Basiszinssatz (§ 456 UGB), CH 5 % p. a. (Art. 104 OR)
//   Verzugszinsen B2C   DE 5 Prozentpunkte über dem Basiszinssatz (§ 288 Abs. 1 BGB), AT 4 % p. a. (§ 1000 ABGB), CH 5 %
//   Pauschale B2B       40 € (DE § 288 Abs. 5 BGB, AT § 458 UGB) – nur gegenüber Unternehmern, einmal je Forderung
//   Verzug              DE bei Entgeltforderungen spätestens 30 Tage nach Fälligkeit und Zugang der Rechnung (§ 286 Abs. 3 BGB);
//                       vorher begründet in der Regel erst die (erste) Mahnung den Verzug – Gebühren daher erst ab Stufe 2.
// Der Basiszinssatz wird NICHT vorbelegt: amtlicher Wert (Deutsche Bundesbank § 247 BGB bzw. OeNB) ist in der
// Konfiguration zu pflegen; ohne Wert werden keine Zinsen berechnet.

import { istDatum, plusTage, rund2, tageZwischen, datumDe, euro } from "../finanzen/basis.js";

export const MAHN_STANDARD = Object.freeze({
  stufen: [
    { stufe: 1, label: "Zahlungserinnerung", abTagen: 7, gebuehr: 0, fristTage: 7 },
    { stufe: 2, label: "1. Mahnung", abTagen: 21, gebuehr: 5, fristTage: 10 },
    { stufe: 3, label: "2. Mahnung", abTagen: 35, gebuehr: 10, fristTage: 10 },
  ],
  verzugszinsen: false,
  basiszinssatz: null, // % p. a. (amtlich, manuell pflegen)
  pauschaleB2b: false, // 40 € Verzugspauschale (DE/AT, nur Unternehmer)
  mindestBetrag: 5, // unter diesem offenen Betrag keine Mahnung (€)
  aufschlagStufe: 3, // ab dieser Stufe Hinweis „Übergabe Inkasso/Rechtsanwalt prüfen“
});

export const ZINS_REGELN = {
  AT: { b2b: { aufschlag: 9.2, basis: true, norm: "§ 456 UGB" }, b2c: { fix: 4, norm: "§ 1000 Abs. 1 ABGB" } },
  DE: { b2b: { aufschlag: 9, basis: true, norm: "§ 288 Abs. 2 BGB" }, b2c: { aufschlag: 5, basis: true, norm: "§ 288 Abs. 1 BGB" } },
  CH: { b2b: { fix: 5, norm: "Art. 104 OR" }, b2c: { fix: 5, norm: "Art. 104 OR" } },
};
export const PAUSCHALE_B2B = { betrag: 40, norm: { DE: "§ 288 Abs. 5 BGB", AT: "§ 458 UGB" } };

const zahlOder = (x, std) => (Number.isFinite(Number(x)) && x !== null && x !== "" ? Number(x) : std);

/** Konfiguration prüfen und normalisieren (wirft Error mit deutscher Meldung) */
export function mahnKonfigPruefen(k = {}) {
  const roh = Array.isArray(k.stufen) && k.stufen.length ? k.stufen : MAHN_STANDARD.stufen;
  if (roh.length > 5) throw new Error("Höchstens fünf Mahnstufen.");
  const stufen = roh.map((s, i) => ({
    stufe: i + 1,
    label: String(s.label || `${i + 1}. Stufe`).trim().slice(0, 60),
    abTagen: Math.round(zahlOder(s.abTagen, 0)),
    gebuehr: rund2(zahlOder(s.gebuehr, 0)),
    fristTage: Math.round(zahlOder(s.fristTage, 7)),
  }));
  for (const [i, s] of stufen.entries()) {
    if (s.abTagen < 1 || s.abTagen > 365) throw new Error(`Stufe ${s.stufe}: „ab Tagen“ muss zwischen 1 und 365 liegen.`);
    if (s.gebuehr < 0 || s.gebuehr > 100) throw new Error(`Stufe ${s.stufe}: Mahngebühr zwischen 0 und 100 €.`);
    if (s.fristTage < 3 || s.fristTage > 60) throw new Error(`Stufe ${s.stufe}: Zahlungsfrist zwischen 3 und 60 Tagen.`);
    if (i > 0 && s.abTagen <= stufen[i - 1].abTagen) throw new Error("Die Stufen müssen nach Tagen aufsteigend sein.");
  }
  const basis = k.basiszinssatz === null || k.basiszinssatz === "" || k.basiszinssatz === undefined ? null : Number(k.basiszinssatz);
  if (basis !== null && (!Number.isFinite(basis) || basis < -5 || basis > 15)) throw new Error("Basiszinssatz unplausibel (−5 bis 15 %).");
  const mindest = rund2(zahlOder(k.mindestBetrag, MAHN_STANDARD.mindestBetrag));
  if (mindest < 0 || mindest > 1000) throw new Error("Mindestbetrag zwischen 0 und 1.000 €.");
  return {
    stufen,
    verzugszinsen: !!k.verzugszinsen,
    basiszinssatz: basis,
    pauschaleB2b: !!k.pauschaleB2b,
    mindestBetrag: mindest,
    aufschlagStufe: Math.min(stufen.length, Math.max(1, Math.round(zahlOder(k.aufschlagStufe, stufen.length)))),
  };
}

/** Unternehmer (B2B)? – Annahme: Empfänger mit UID bzw. Organisation */
export const istB2b = (partei = {}) => !!(partei.uid || partei.organisation || partei.firma);

/** Verzugszinssatz in % p. a. (null = nicht berechenbar, z. B. Basiszinssatz fehlt) */
export function verzugszinsSatz(land, b2b, basiszinssatz) {
  const r = (ZINS_REGELN[land] || ZINS_REGELN.AT)[b2b ? "b2b" : "b2c"];
  if (r.fix !== undefined) return { satz: r.fix, norm: r.norm };
  if (basiszinssatz === null || basiszinssatz === undefined || !Number.isFinite(Number(basiszinssatz))) return { satz: null, norm: r.norm };
  return { satz: rund2(Number(basiszinssatz) + r.aufschlag), norm: r.norm };
}

/** Summe der erfassten Zahlungen (Teilzahlungen) eines Belegs */
export const gezahlt = (b) => rund2((b.zahlungen || []).reduce((s, z) => s + (Number(z.betrag) || 0), 0));
/** Offener Betrag einer Rechnung (brutto − Teilzahlungen, nie negativ) */
export const offenerBetrag = (b) => (["bezahlt", "storniert"].includes(b.status) ? 0 : Math.max(0, rund2(Number(b.brutto) - gezahlt(b))));
/** Offene Mahnkosten (Gebühren + Zinsen + Pauschale) */
export const mahnkosten = (b) => rund2((b.mahnungen || []).reduce((s, m) => s + (Number(m.gebuehr) || 0) + (Number(m.zinsen) || 0) + (Number(m.pauschale) || 0), 0));

/**
 * Vorschlag für die nächste Mahnung. Rückgabe null (kein Mahnbeleg möglich) oder
 * { stufe, label, tage, offen, gebuehr, zinsen, zinssatz, zinsNorm, pauschale, gesamt, frist, faellig, grund, eskalation }.
 * faellig=false mit grund → Stufe noch nicht erreicht bzw. Frist der letzten Mahnung läuft.
 */
export function mahnVorschlag(b, heute, konfig = MAHN_STANDARD, { land = "AT" } = {}) {
  const k = konfig?.stufen ? konfig : mahnKonfigPruefen(konfig);
  if (!b || b.beleg !== "rechnung" || b.status !== "offen" || !istDatum(b.faelligAm) || !istDatum(heute)) return null;
  const tage = tageZwischen(b.faelligAm, heute);
  if (tage <= 0) return null;
  const offen = offenerBetrag(b);
  if (offen <= 0) return null;
  const bisher = (b.mahnungen || []).filter((m) => !m.storniert);
  const letzte = bisher.reduce((m, x) => (Number(x.stufe) > Number(m?.stufe || 0) ? x : m), null);
  const letzteStufe = Number(letzte?.stufe || 0);
  const naechste = k.stufen[letzteStufe];
  const basis = { tage, offen, stufe: naechste?.stufe || letzteStufe, label: naechste?.label || "Alle Stufen ausgeschöpft" };
  // Mahnsperre: befristet (Buchhaltung, `bis`) oder unbefristet (z. B. Einspruch des Kunden, `anliegenId` – Team Kundenenergie)
  if (b.mahnsperre && (!b.mahnsperre.bis || heute <= b.mahnsperre.bis)) return { ...basis, faellig: false, grund: `Mahnsperre${b.mahnsperre.bis ? ` bis ${datumDe(b.mahnsperre.bis)}` : ""}: ${b.mahnsperre.grund || "Einwand/Klärung"}`, gesperrt: true };
  if (!naechste) return { ...basis, faellig: false, grund: "Alle Mahnstufen ausgeschöpft – Übergabe an Inkasso/Rechtsanwalt bzw. Klärung prüfen.", eskalation: true };
  if (offen < k.mindestBetrag) return { ...basis, faellig: false, grund: `Offener Betrag unter dem Mindestbetrag (${euro(k.mindestBetrag)}).` };
  if (tage < naechste.abTagen) return { ...basis, faellig: false, grund: `${naechste.label} ab ${naechste.abTagen} Tagen Überfälligkeit (aktuell ${tage}).` };
  const letzteFrist = letzte ? letzte.frist || plusTage(String(letzte.am).slice(0, 10), 7) : null;
  if (letzteFrist && heute <= letzteFrist) return { ...basis, faellig: false, grund: `Frist der ${letzte.label || "letzten Mahnung"} läuft bis ${datumDe(letzteFrist)}.` };
  const b2b = istB2b(b.partei);
  let zinsen = 0;
  let zinssatz = null;
  let zinsNorm = "";
  if (k.verzugszinsen) {
    const z = verzugszinsSatz(land, b2b, k.basiszinssatz);
    zinsNorm = z.norm;
    if (z.satz !== null) {
      zinssatz = z.satz;
      const bereits = rund2(bisher.reduce((s, m) => s + (Number(m.zinsen) || 0), 0));
      zinsen = Math.max(0, rund2((offen * (z.satz / 100) * tage) / 365 - bereits));
    }
  }
  const pauschaleSchon = bisher.some((m) => Number(m.pauschale) > 0);
  const pauschale = k.pauschaleB2b && b2b && ["DE", "AT"].includes(land) && !pauschaleSchon && naechste.stufe >= 2 ? PAUSCHALE_B2B.betrag : 0;
  const gebuehr = naechste.gebuehr;
  const kosten = rund2(mahnkosten({ mahnungen: bisher }) + gebuehr + zinsen + pauschale);
  return {
    ...basis,
    faellig: true,
    gebuehr,
    zinsen,
    zinssatz,
    zinsNorm,
    pauschale,
    pauschaleNorm: pauschale ? PAUSCHALE_B2B.norm[land] : "",
    kostenGesamt: kosten,
    gesamt: rund2(offen + kosten),
    frist: plusTage(heute, naechste.fristTage),
    eskalation: naechste.stufe >= k.aufschlagStufe,
    b2b,
  };
}

/** Mahntext (Brief/PDF/E-Mail) – sachlich, ohne Drohung; Hinweis bei Eskalationsstufe */
export function mahnText(b, m) {
  const zeilen = [
    m.stufe === 1
      ? `sicher ist es Ihrer Aufmerksamkeit entgangen: Zur Rechnung ${b.nummer} vom ${datumDe(b.rechnungsdatum)} (fällig am ${datumDe(b.faelligAm)}) konnten wir noch keinen Zahlungseingang feststellen.`
      : `trotz unserer bisherigen Erinnerung ist die Rechnung ${b.nummer} vom ${datumDe(b.rechnungsdatum)} (fällig am ${datumDe(b.faelligAm)}) weiterhin offen.`,
    `Wir bitten Sie, den offenen Betrag von ${euro(m.gesamt)} bis zum ${datumDe(m.frist)} zu überweisen.`,
    "Sollten Sie die Zahlung bereits veranlasst haben, betrachten Sie dieses Schreiben bitte als gegenstandslos. Bei Rückfragen oder Einwänden zur Rechnung antworten Sie bitte über das Portal.",
  ];
  if (m.eskalation) zeilen.push("Sollte bis zum genannten Termin keine Zahlung eingehen, behalten wir uns weitere Schritte zur Durchsetzung der Forderung vor.");
  return zeilen;
}
