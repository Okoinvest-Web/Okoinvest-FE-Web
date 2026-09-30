// src/lib/plattform/server/mitglied-pdf.js
//
// PDFs des Mitgliederbereichs und des Gemeindecockpits (gemeinsamer PDF-Erzeuger server/pdf.js, Markenfarben wie Exposé):
//  Beitrittserklärung (Muster zum Unterschreiben), Anteilsbestätigung, Ausschüttungsmitteilung, Einladung und Protokoll
//  der Generalversammlung, Monatsabrechnung Energiegemeinschaft, Bürgerinfo-Material/Pressetext (Entwurf).
// Alle Dokumente sind als MUSTER gekennzeichnet – keine Anlage-, Rechts- oder Steuerberatung, verbindlich ist die Satzung.

import { PdfDokument } from "./pdf";
import { GV_ARTEN, GV_FORMEN, MEHRHEITEN, STIMMEN } from "../mitglied/versammlung";
import { AUSSCHUETTUNG_ARTEN, MITGLIED_ARTEN, NACHSCHUSS } from "../mitglied/genossenschaft";

const F = { navy950: "#03122b", navy900: "#041d42", ov300: "#aed083", ov500: "#669933", ov700: "#3d6b1f", ink900: "#151a24", ink700: "#394050", ink500: "#6b7486", ink200: "#dfe3ea", ink50: "#f7f8fa", weiss: "#ffffff", rot: "#b42318" };
const RAND = 48;
const FUSS = 64;
const eur = (x) => `${(Math.round((Number(x) || 0) * 100) / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const zahl = (x, s = 0) => (Number.isFinite(Number(x)) ? Number(x).toLocaleString("de-DE", { maximumFractionDigits: s }) : "–");
const d = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "–");
const dz = (s) => (s ? `${d(s)}, ${String(s).slice(11, 16)} Uhr` : "–");
const dateiname = (s) => String(s || "dokument").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 80);

/** Einfacher Briefbogen mit Kopf, Abschnitten, Tabellen und Fußzeile (Muster-Hinweis auf jeder Seite) */
class Bogen {
  constructor({ titel, kopfzeile, untertitel = "", fuss, demo = false }) {
    this.doc = new PdfDokument({ titel, thema: kopfzeile });
    this.B = this.doc.breite - 2 * RAND;
    this.titel = titel;
    this.kopfzeile = kopfzeile;
    this.untertitel = untertitel;
    this.fussText = fuss;
    this.demo = demo;
    this.s = null;
    this.y = 0;
    this.neueSeite(true);
  }
  fuss() {
    const y = this.doc.hoehe - 34;
    this.s.linie(RAND, y - 14, this.doc.breite - RAND, y - 14, { farbe: F.ink200 });
    this.s.absatz(RAND, y - 2, `${this.demo ? "DEMO – fiktive Daten. " : ""}${this.fussText}`, { breite: this.B - 50, groesse: 6.8, farbe: F.ink500, zeilenhoehe: 8.6 });
    this.s.text(this.doc.breite - RAND, y - 2, `Seite ${this.doc.seiten.length}`, { groesse: 7, farbe: F.ink500, ausrichtung: "rechts" });
  }
  neueSeite(erste = false) {
    if (this.s) this.fuss();
    this.s = this.doc.seite();
    if (erste) {
      this.s.rechteck(0, 0, this.doc.breite, 104, F.navy950);
      this.s.text(RAND, 38, "ÖkoInvest", { groesse: 17, fett: true, farbe: F.weiss });
      this.s.text(this.doc.breite - RAND, 38, this.kopfzeile.toUpperCase().slice(0, 60), { groesse: 8, fett: true, farbe: F.ov300, ausrichtung: "rechts", zeichenabstand: 0.8 });
      this.s.text(RAND, 72, this.titel.slice(0, 72), { groesse: 17, fett: true, farbe: F.weiss });
      if (this.untertitel) this.s.text(RAND, 90, this.untertitel.slice(0, 110), { groesse: 8.8, farbe: F.ov300 });
      this.y = 132;
    } else {
      this.s.rechteck(0, 0, this.doc.breite, 30, F.navy950);
      this.s.text(RAND, 20, "ÖkoInvest", { groesse: 10, fett: true, farbe: F.weiss });
      this.s.text(this.doc.breite - RAND, 20, this.titel.slice(0, 80), { groesse: 8, farbe: F.ov300, ausrichtung: "rechts" });
      this.y = 56;
    }
  }
  platz(h) {
    if (this.y + h > this.doc.hoehe - FUSS) this.neueSeite();
  }
  ueberschrift(t) {
    this.platz(46);
    this.y += 6;
    this.s.text(RAND, this.y, t, { groesse: 11.5, fett: true, farbe: F.navy900 });
    this.s.rechteck(RAND, this.y + 5, 22, 2.2, F.ov500);
    this.y += 20;
  }
  absatz(t, { groesse = 9, farbe = F.ink700, fett = false } = {}) {
    if (!t) return;
    for (const teil of String(t).split("\n")) {
      this.platz(18);
      this.y = this.s.absatz(RAND, this.y, teil || " ", { breite: this.B, groesse, farbe, fett }) + groesse * 1.55;
    }
  }
  /** Schlüssel-Wert-Zeilen */
  angaben(liste) {
    for (const [k, v] of liste.filter((x) => x && x[1] !== undefined && x[1] !== null && x[1] !== "")) {
      this.platz(16);
      this.s.text(RAND, this.y, k, { groesse: 8.4, farbe: F.ink500 });
      this.y = this.s.absatz(RAND + 170, this.y, String(v), { breite: this.B - 170, groesse: 9, farbe: F.ink900 }) + 14;
    }
    this.y += 4;
  }
  kacheln(liste) {
    this.platz(58);
    const b = (this.B - (liste.length - 1) * 8) / liste.length;
    liste.forEach(([label, wert], i) => {
      const x = RAND + i * (b + 8);
      this.s.rechteck(x, this.y - 10, b, 46, F.ink50);
      this.s.text(x + 9, this.y + 3, label, { groesse: 7.4, farbe: F.ink500 });
      this.s.text(x + 9, this.y + 24, wert, { groesse: 12.5, fett: true, farbe: F.ink900 });
    });
    this.y += 52;
  }
  tabelle(spalten, zeilen) {
    const summe = spalten.reduce((x, c) => x + c.b, 0);
    const br = spalten.map((c) => (c.b / summe) * this.B);
    const kopf = () => {
      this.s.rechteck(RAND, this.y - 10, this.B, 15, F.ink50);
      let x = RAND;
      spalten.forEach((c, i) => {
        this.s.text(c.rechts ? x + br[i] - 4 : x + 4, this.y, c.label, { groesse: 7.2, fett: true, farbe: F.ink500, ausrichtung: c.rechts ? "rechts" : "links" });
        x += br[i];
      });
      this.y += 15;
    };
    this.platz(34);
    kopf();
    for (const z of zeilen) {
      if (this.y + 14 > this.doc.hoehe - FUSS) {
        this.neueSeite();
        kopf();
      }
      const werte = z.werte || z;
      if (z.hinterlegt) this.s.rechteck(RAND, this.y - 9, this.B, 13, F.ink50);
      let x = RAND;
      werte.forEach((w, i) => {
        const c = spalten[i];
        this.s.text(c.rechts ? x + br[i] - 4 : x + 4, this.y, String(w ?? "").slice(0, Math.max(8, Math.floor(br[i] / 4.4))), { groesse: 8, fett: !!z.fett, farbe: F.ink900, ausrichtung: c.rechts ? "rechts" : "links" });
        x += br[i];
      });
      this.s.linie(RAND, this.y + 4, RAND + this.B, this.y + 4, { farbe: F.ink200, breite: 0.4 });
      this.y += 13.5;
    }
    this.y += 8;
  }
  kaestchen(t) {
    this.platz(20);
    this.s.rechteck(RAND, this.y - 8, 8, 8, null, { rand: F.ink700, randBreite: 0.8 });
    this.s.text(RAND + 3.2, this.y - 1.2, "x", { groesse: 7, farbe: F.ink900 });
    this.y = this.s.absatz(RAND + 16, this.y, t, { breite: this.B - 16, groesse: 8.6, farbe: F.ink700 }) + 14;
  }
  unterschrift(links, rechts) {
    this.platz(70);
    this.y += 34;
    const b = (this.B - 30) / 2;
    this.s.linie(RAND, this.y, RAND + b, this.y, { farbe: F.ink700 });
    this.s.linie(RAND + b + 30, this.y, RAND + 2 * b + 30, this.y, { farbe: F.ink700 });
    this.s.text(RAND, this.y + 11, links, { groesse: 7.6, farbe: F.ink500 });
    this.s.text(RAND + b + 30, this.y + 11, rechts, { groesse: 7.6, farbe: F.ink500 });
    this.y += 28;
  }
  fertig(name) {
    this.fuss();
    return { pdf: this.doc.alsBuffer(), name: `${dateiname(name)}.pdf` };
  }
}

const MUSTER = "MUSTER – keine Anlage-, Rechts- oder Steuerberatung; verbindlich sind Satzung und Beschlüsse der Genossenschaft. Erstellt über die ÖkoInvest-Plattform.";
const anschrift = (b) => [b?.strasse, [b?.plz, b?.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
const person = (b) => (b?.firma ? `${b.firma}${b.vertretung ? `, vertreten durch ${b.vertretung}` : ""}` : [b?.vorname, b?.nachname].filter(Boolean).join(" "));

// ---------------------------------------------------------------- Genossenschaft

function beitrittPdf({ geno: g, mitglied: m, demo }) {
  const b = m.beitritt || {};
  const p = new Bogen({ titel: "Beitrittserklärung", kopfzeile: `${g.name} · Muster`, untertitel: `${g.rechtsform} · ${g.registerName} ${g.registerNr || ""}`.trim(), fuss: MUSTER, demo });
  p.absatz(`An den Vorstand der ${g.name}${g.sitz ? `, ${g.sitz}` : ""}`, { fett: true, farbe: F.ink900 });
  p.ueberschrift("Beitretende Person bzw. Organisation");
  p.angaben([["Name", person(b)], ["Beitritt als", MITGLIED_ARTEN[b.art] || b.art], ["Anschrift", anschrift(b)], ["Geburtsdatum", b.geburtsdatum ? d(b.geburtsdatum) : ""], ["E-Mail", b.email], ["Konto für Auszahlungen", `${b.iban || ""}${b.kontoinhaber ? ` (${b.kontoinhaber})` : ""}`]]);
  p.ueberschrift("Erklärung");
  p.absatz(`Ich erkläre hiermit unbedingt meinen Beitritt zur ${g.name} und beteilige mich mit ${zahl(m.anteile)} Geschäftsanteil(en) zu je ${eur(g.anteilEur)}, insgesamt ${eur(m.anteile * g.anteilEur)}${g.eintrittsgeldEur ? ` zuzüglich Eintrittsgeld ${eur(g.eintrittsgeldEur)}` : ""}.`, { farbe: F.ink900 });
  for (const h of g.hinweise || []) p.kaestchen(h.text);
  p.angaben([["Nachschusspflicht laut Satzung", NACHSCHUSS[g.nachschusspflicht] || "–"], ["Kündigungsfrist laut Satzung", `${g.kuendigungsfristMonate} Monate zum Ende des Geschäftsjahres`], ["Online erklärt am", m.erklaertAm ? `${d(m.erklaertAm)} (Kennung ${m.id})` : ""]]);
  p.unterschrift("Ort, Datum", "Unterschrift der beitretenden Person bzw. vertretungsberechtigte Unterschrift");
  p.ueberschrift("Zulassung durch die Genossenschaft (vom Vorstand auszufüllen)");
  p.absatz("Der Beitritt wird zugelassen. Mitgliedsnummer: ____________  Eintragung in die Mitgliederliste am: ____________");
  p.unterschrift("Ort, Datum", "Vorstand");
  p.absatz(g.land === "DE" ? "Hinweis: Die Mitgliedschaft entsteht mit der Zulassung durch die Genossenschaft (§ 15 GenG). Bitte senden Sie die unterschriebene Erklärung an die Genossenschaft bzw. laden Sie einen Scan im Portal hoch." : "Hinweis: Die Mitgliedschaft entsteht mit der Zulassung durch die Genossenschaft laut Satzung. Bitte senden Sie die unterschriebene Erklärung ein bzw. laden Sie einen Scan im Portal hoch.", { groesse: 8, farbe: F.ink500 });
  return p.fertig(`Beitrittserklaerung-${m.id}`);
}

function bestaetigungPdf({ geno: g, mitglied: m, stand, demo }) {
  const b = m.beitritt || {};
  const k = m.kennzahlen || {};
  const p = new Bogen({ titel: "Bestätigung über Geschäftsanteile", kopfzeile: `${g.name}`, untertitel: `Mitglied Nr. ${m.nr} · Stand ${d(stand)}`, fuss: `${MUSTER} Die Bestätigung ist kein Wertpapier und nicht übertragbar.`, demo });
  p.absatz(`Hiermit bestätigt die ${g.name}, dass`, { farbe: F.ink900 });
  p.absatz(person(b), { fett: true, farbe: F.ink900, groesse: 11 });
  p.absatz(`${anschrift(b)}\nseit dem ${d(m.aktivSeit)} Mitglied der Genossenschaft ist (Mitgliedsnummer ${m.nr}).`);
  p.kacheln([["Geschäftsanteile", zahl(m.anteile)], ["Nennwert", eur(k.nennwertEur)], ["Eingezahlt", eur(k.eingezahltEur)], ["Geschäftsguthaben", eur(k.guthabenEur)]]);
  if (m.einzahlungen?.length) {
    p.ueberschrift("Einzahlungen");
    p.tabelle([{ label: "Datum", b: 1 }, { label: "Referenz", b: 2.4 }, { label: "Betrag", b: 1, rechts: true }], m.einzahlungen.map((e) => [d(e.am), e.referenz || "–", eur(e.betragEur)]));
  }
  p.angaben([["Register", `${g.registerName} ${g.registerNr}${g.registergericht ? `, ${g.registergericht}` : ""}`], [g.land === "CH" ? "Revisionsstelle" : "Prüfungsverband", g.pruefungsverband], ["Satzung", g.satzungStand ? `Stand ${d(g.satzungStand)}` : ""]]);
  p.absatz("Das Geschäftsguthaben ist keine Einlage im Sinne des Bankrechts und nicht durch eine Einlagensicherung geschützt. Ausschüttungen beschließt die Generalversammlung.", { groesse: 8, farbe: F.ink500 });
  p.unterschrift("Ort, Datum", "Vorstand der Genossenschaft");
  return p.fertig(`Anteilsbestaetigung-${m.nr || m.id}`);
}

function ausschuettungPdf({ geno: g, ausschuettung: a, empfaenger: m, demo }) {
  const div = a.art === "dividende";
  const p = new Bogen({ titel: div ? "Dividendenmitteilung" : "Mitteilung über die Rückvergütung", kopfzeile: g.name, untertitel: `Geschäftsjahr ${a.geschaeftsjahr} · ${AUSSCHUETTUNG_ARTEN[a.art]}`, fuss: `${MUSTER} Steuerabzug vereinfacht dargestellt – maßgeblich ist die Steuerbescheinigung.`, demo });
  if (m) p.absatz(`${person(m.beitritt)} · Mitglied Nr. ${m.nr}\n${anschrift(m.beitritt)}`, { farbe: F.ink900 });
  p.angaben([["Beschluss der Generalversammlung", d(a.beschlussDatum)], ["Stichtag", d(a.stichtag)], [div ? "Satz" : "Rückvergütung", div ? `${zahl(a.satzPct, 2)} % des Geschäftsguthabens` : `${zahl(a.ctProKwh, 3)} ct je kWh Strombezug`], ["Ausgezahlt am", a.ausgezahltAm ? d(a.ausgezahltAm) : "offen"]]);
  p.tabelle(
    [{ label: "Mitglied", b: 2.2 }, { label: div ? "Guthaben" : "kWh", b: 1.2, rechts: true }, { label: "Brutto", b: 1.1, rechts: true }, { label: div ? "Steuerabzug" : "Abzug", b: 1.1, rechts: true }, { label: "Netto", b: 1.1, rechts: true }],
    a.positionen.map((x) => [`${x.nr ? `Nr. ${x.nr} ` : ""}${x.name}`, div ? eur(x.basis) : zahl(x.basis), eur(x.bruttoEur), eur(x.steuerEur), eur(x.nettoEur)])
  );
  if (a.summe) p.angaben([["Summe brutto", eur(a.summe.bruttoEur)], ["Summe Steuerabzug", eur(a.summe.steuerEur)], ["Summe netto", eur(a.summe.nettoEur)]]);
  p.absatz(div ? (g.land === "DE" ? "Einbehalten wurden Kapitalertragsteuer und Solidaritätszuschlag (ohne Kirchensteuer). Liegt ein Freistellungsauftrag vor, bleibt der Sparer-Pauschbetrag steuerfrei." : g.land === "AT" ? "Einbehalten wurde die Kapitalertragsteuer (KESt) von 27,5 %." : "Einbehalten wurde die Verrechnungssteuer von 35 %; sie kann bei ordnungsgemäßer Deklaration zurückgefordert werden.") : "Die Rückvergütung wurde ohne Steuerabzug berechnet; die steuerliche Behandlung ist mit der Steuerberatung abzustimmen.", { groesse: 8, farbe: F.ink500 });
  return p.fertig(`${div ? "Dividende" : "Rueckverguetung"}-${a.geschaeftsjahr}${m?.nr ? `-${m.nr}` : ""}`);
}

function einladungPdf({ gv, demo }) {
  const g = gv.geno;
  const p = new Bogen({ titel: gv.titel, kopfzeile: `${g.name} · Einladung`, untertitel: `${GV_ARTEN[gv.art]} · ${GV_FORMEN[gv.form]}`, fuss: MUSTER, demo });
  p.angaben([["Termin", dz(gv.datum)], ["Ort", gv.ort], ["Online-Teilnahme", gv.zugang], ["Online-Abstimmung bis", gv.abstimmungBis ? dz(gv.abstimmungBis) : ""], ["Eingeladen am", gv.eingeladenAm ? d(gv.eingeladenAm) : ""]]);
  if (gv.einleitung) p.absatz(gv.einleitung);
  p.ueberschrift("Tagesordnung");
  gv.tagesordnung.forEach((t, i) => {
    p.absatz(`${i + 1}. ${t.titel}${t.beschluss ? ` (Beschluss, ${MEHRHEITEN[t.mehrheit]?.label || "einfache Mehrheit"})` : ""}`, { fett: true, farbe: F.ink900 });
    if (t.text) p.absatz(t.text, { groesse: 8.6 });
  });
  if (gv.unterlagen?.length) {
    p.ueberschrift("Unterlagen");
    for (const u of gv.unterlagen) {
      p.absatz(u.titel, { fett: true, farbe: F.ink900 });
      if (u.text) p.absatz(u.text, { groesse: 8.6 });
    }
  }
  p.absatz("Jedes Mitglied hat eine Stimme. Die Online-Stimmabgabe ist im Mitgliederbereich des Portals möglich, sofern die Satzung sie vorsieht.", { groesse: 8, farbe: F.ink500 });
  return p.fertig(`Einladung-${gv.id}`);
}

function protokollPdf({ gv, demo }) {
  const g = gv.geno;
  const e = gv.ergebnis || { tops: [] };
  const pr = gv.protokoll || {};
  const p = new Bogen({ titel: `Niederschrift: ${gv.titel}`, kopfzeile: `${g.name} · Protokoll`, untertitel: `${GV_ARTEN[gv.art]} am ${dz(gv.datum)}`, fuss: `${MUSTER} Prüfsumme der Stimmzettel (SHA-256): ${pr.hash || "–"}`, demo });
  p.angaben([["Form", GV_FORMEN[gv.form]], ["Ort", gv.ort], ["Versammlungsleitung", pr.versammlungsleiter], ["Protokollführung", pr.protokollfuehrer], ["Stimmberechtigte Mitglieder", zahl(e.stimmberechtigt)], ["Teilnehmende", `${zahl(e.teilgenommen)} (online ${zahl(e.online)}${e.anwesend ? `, im Saal ${zahl(e.anwesend)}` : ""}) – Beteiligung ${zahl(e.beteiligungPct, 1)} %`], ["Abgeschlossen am", gv.abgeschlossenAm ? d(gv.abgeschlossenAm) : ""]]);
  p.ueberschrift("Beschlüsse");
  p.tabelle(
    [{ label: "Beschlusspunkt", b: 3.4 }, { label: "Mehrheit", b: 1.1 }, { label: STIMMEN.ja, b: 0.6, rechts: true }, { label: STIMMEN.nein, b: 0.6, rechts: true }, { label: "Enth.", b: 0.6, rechts: true }, { label: "Ergebnis", b: 1.1 }],
    e.tops.map((t) => [t.titel, MEHRHEITEN[t.mehrheit]?.label || "", zahl(t.ja), zahl(t.nein), zahl(t.enthaltung), t.angenommen ? "angenommen" : "abgelehnt"])
  );
  p.absatz("Enthaltungen zählen nicht als abgegebene Stimmen. Die Einzelstimmen werden nicht veröffentlicht; die Prüfsumme in der Fußzeile belegt den unveränderten Bestand der Stimmzettel.", { groesse: 8, farbe: F.ink500 });
  if (pr.notiz) {
    p.ueberschrift("Weitere Feststellungen");
    p.absatz(pr.notiz);
  }
  p.unterschrift("Versammlungsleitung", "Protokollführung");
  return p.fertig(`Protokoll-${gv.id}`);
}

function egPdf({ abrechnung: a, gemeinschaft: eg, teilnahme: t, empfaenger, demo }) {
  const w = eg.waehrung || { w: "€", ct: "ct" };
  const geld = (x) => (w.w === "CHF" ? `CHF ${(Math.round((Number(x) || 0) * 100) / 100).toLocaleString("de-CH", { minimumFractionDigits: 2 })}` : eur(x));
  const p = new Bogen({ titel: `Abrechnung ${a.monat.split("-").reverse().join("/")}`, kopfzeile: eg.name, untertitel: `${eg.formLabel} · Verteilschlüssel ${eg.verteilschluessel}`, fuss: `MUSTER – vereinfachte Monatsabrechnung der Energiegemeinschaft${a.geschaetzt ? " auf Basis geschätzter Werte" : ""}. Netzentgelte und Abgaben rechnet Ihr Lieferant bzw. Netzbetreiber ab.`, demo });
  p.angaben([["Teilnehmer", empfaenger], ["Zählpunkt", t?.stamm?.zaehlpunkt || t?.stamm?.maloId || ""], ["Netzbetreiber", eg.netzbetreiber], ["Werte", a.geschaetzt ? "geschätzt aus Stammdaten (Messwerte folgen)" : "gemessen"]]);
  p.kacheln([["Verbrauch", `${zahl(a.verbrauchKwh)} kWh`], ["Aus der Gemeinschaft", `${zahl(a.bezugGemeinschaftKwh, 1)} kWh`], ["Deckung", `${zahl(a.deckungPct, 1)} %`], ["Saldo", geld(a.saldoEur)]]);
  p.tabelle(
    [{ label: "Position", b: 3 }, { label: "Menge", b: 1.2, rechts: true }, { label: "Preis", b: 1.1, rechts: true }, { label: "Betrag", b: 1.2, rechts: true }],
    [
      ["Bezug aus der Gemeinschaft", `${zahl(a.bezugGemeinschaftKwh, 1)} kWh`, `${zahl(eg.tarifBezugCt, 2)} ${w.ct}`, geld(-a.bezugEur)],
      ...(a.einspeisungGemeinschaftKwh ? [["Einspeisung in die Gemeinschaft (Gutschrift)", `${zahl(a.einspeisungGemeinschaftKwh, 1)} kWh`, `${zahl(eg.tarifEinspeisungCt, 2)} ${w.ct}`, geld(a.gutschriftEur)]] : []),
      ["Mitglieds- bzw. Grundgebühr", "1 Monat", "", geld(-a.grundgebuehrEur)],
      { werte: ["Saldo (Gutschrift + / Zahlung −)", "", "", geld(a.saldoEur)], fett: true, hinterlegt: true },
    ]
  );
  p.absatz(`Geschätzter Vorteil gegenüber dem Bezug vom Lieferanten: ${geld(a.ersparnisEur)} (Energiepreis, ${eg.rabatt?.label || "Netzentgelt"} und entfallende Abgaben, Orientierungswerte).`, { groesse: 8.4 });
  return p.fertig(`EG-Abrechnung-${a.monat}`);
}

/** PDF zu mgDokument-Daten */
export function mitgliedPdf(daten, { demo = false } = {}) {
  const x = { ...daten, demo };
  if (daten.art === "beitritt") return beitrittPdf(x);
  if (daten.art === "bestaetigung") return bestaetigungPdf(x);
  if (daten.art === "ausschuettung") return ausschuettungPdf(x);
  if (daten.art === "einladung") return einladungPdf(x);
  if (daten.art === "protokoll") return protokollPdf(x);
  if (daten.art === "eg") return egPdf(x);
  throw new Error("Unbekanntes Dokument");
}

/** Bürgerinfo-Material / Pressetext (Entwurf) als PDF */
export function gemeindeMaterialPdf(m, { demo = false } = {}) {
  const p = new Bogen({ titel: m.titel, kopfzeile: `${m.gemeinde?.name || "Gemeinde"} · ${m.label}`, untertitel: "Entwurf – vor Veröffentlichung abstimmen", fuss: `ENTWURF – ${m.hinweis} Keine Rechtsberatung.`, demo });
  for (const a of m.absaetze) p.absatz(a, { groesse: 10, farbe: F.ink900 });
  return p.fertig(`${m.art}-${m.gemeinde?.name || "gemeinde"}`);
}
