// src/lib/plattform/server/expose.js
//
// Projekt-Exposé als PDF im Markenstil (Navy/Grün/Sand), mehrseitig:
//  - vertrauliche Fassung (Investor nach NDA-Freigabe, Anbieter, Backoffice): alle Kennzahlen,
//    Phase, Beschreibung, vertrauliche Angaben, Datenraum-Index, Vertraulichkeitshinweis mit
//    Empfänger (jede Seite), Projektdatenblatt (ausgefüllte Felder je Bereich, Vollständigkeit, Kennzahlen) –
//    der Download wird vom Backend protokolliert
//  - öffentlicher Teaser: nur Felder der Positivliste (oeffentlich.js), kein Datenraum
// Daten liefert das Backend (Operation `exposeDaten` bzw. `boerseDetail`), das Layout entsteht hier.

import { PdfDokument, textBreite, umbrechen } from "./pdf";
import { LAENDER, NETZANSCHLUSS, PROJEKT_TYPEN, DOKUMENT_KATEGORIEN, NDA } from "../konstanten";
import { VERTRAULICH_FELDER } from "../oeffentlich";
import { datum, datumZeit, mwp, preisText, preisGesamt } from "../format";
import { PHASEN, phaseById } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { DATENBLATT_BEREICHE, datenblattKennzahlen, datenblattVollstaendigkeit, feldAnzeige } from "../fach/datenblatt";

const F = {
  navy950: "#03122b", navy900: "#041d42", navy700: "#003473", ov300: "#aed083", ov500: "#669933", ov600: "#558227", ov50: "#f4f9ee",
  ink900: "#151a24", ink700: "#394050", ink500: "#6b7486", ink400: "#97a0b0", ink200: "#dfe3ea", ink100: "#eef0f4", ink50: "#f7f8fa",
  sand100: "#f5f3ea", sun400: "#ffc53d", sun50: "#fff6dc", weiss: "#ffffff",
};
const RAND = 48;
const FUSS = 62;

/** Preis je kWp (angegeben oder aus Gesamtpreis errechnet) */
export function preisJeKwp(p) {
  if (p?.preisModus === "proKwp" && p.preisProKwp) return p.preisProKwp;
  const g = preisGesamt(p);
  return g && p?.mwp ? g / (p.mwp * 1000) : null;
}

export function exposePdf({ projekt: p, vertraulich = null, datenblatt = null, dokumente = [], teaser = false, empfaenger = null, erstelltAm = new Date().toISOString(), portalUrl = "" }) {
  const doc = new PdfDokument({
    titel: `${teaser ? "Teaser" : "Exposé"}: ${p.titel}`,
    thema: teaser ? "Öffentlicher Projekt-Teaser" : "Vertrauliches Projekt-Exposé",
  });
  const B = doc.breite - 2 * RAND;
  let s = null;
  let y = 0;

  const kopfFolgeseite = () => {
    s.rechteck(0, 0, doc.breite, 34, F.navy950);
    s.text(RAND, 22, "ÖkoInvest", { groesse: 10.5, fett: true, farbe: F.weiss });
    const t = umbrechen(p.titel, B - 150, 8.5)[0];
    s.text(doc.breite - RAND, 22, t, { groesse: 8.5, farbe: F.ov300, ausrichtung: "rechts" });
    y = 64;
  };
  const neueSeite = () => {
    s = doc.seite();
    kopfFolgeseite();
  };
  const platz = (h) => {
    if (y + h > doc.hoehe - FUSS - 8) neueSeite();
  };
  const ueberschrift = (t) => {
    platz(46);
    y += 14;
    s.text(RAND, y, t, { groesse: 12.5, fett: true, farbe: F.navy900 });
    s.rechteck(RAND, y + 5, 26, 2.2, F.ov500);
    y += 20;
  };
  const absatz = (t, { groesse = 10, farbe = F.ink700, fett = false, einzug = 0, breite = B } = {}) => {
    for (const z of umbrechen(t, breite - einzug, groesse, fett)) {
      platz(groesse * 1.5);
      s.text(RAND + einzug, y + groesse, z, { groesse, farbe, fett });
      y += groesse * 1.5;
    }
  };

  // ---------------------------------------------------------------- Seite 1: Kopf
  s = doc.seite();
  s.rechteck(0, 0, doc.breite, 124, F.navy950);
  s.rechteck(doc.breite - 150, 0, 150, 124, F.navy900);
  s.text(RAND, 48, "ÖkoInvest", { groesse: 22, fett: true, farbe: F.weiss });
  s.text(RAND, 64, "Projektbörse · Teil der ÖKOVOLT Gruppe", { groesse: 8.5, farbe: F.ink400 });
  s.text(RAND, 100, `${teaser ? "PROJEKT-TEASER" : "PROJEKT-EXPOSÉ"} · ${p.id}`, { groesse: 8.5, fett: true, farbe: F.ov300, zeichenabstand: 0.8 });
  const badge = teaser ? "ÖFFENTLICH" : "VERTRAULICH";
  const bb = textBreite(badge, 8, true) + 0.8 * (badge.length - 1) + 20;
  s.rechteck(doc.breite - RAND - bb, 36, bb, 20, teaser ? F.ov500 : F.sun400);
  s.text(doc.breite - RAND - bb / 2, 49, badge, { groesse: 8, fett: true, farbe: teaser ? F.weiss : F.navy950, ausrichtung: "mitte", zeichenabstand: 0.8 });
  if (p.demo) s.text(doc.breite - RAND, 100, "DEMO – fiktive Angaben", { groesse: 8, fett: true, farbe: F.sun400, ausrichtung: "rechts" });

  y = 160;
  for (const z of umbrechen(p.titel, B, 20, true)) {
    s.text(RAND, y, z, { groesse: 20, fett: true, farbe: F.ink900 });
    y += 25;
  }
  y -= 6;
  s.text(RAND, y + 12, [PROJEKT_TYPEN[p.typ], [p.region, p.bundesland].filter(Boolean).join(", "), LAENDER[p.land]].filter(Boolean).join("  ·  "), { groesse: 10.5, farbe: F.ink500 });
  y += 22;
  if (!teaser) {
    hinweisBox();
    y += 4;
  }
  y += 12;

  // ---------------------------------------------------------------- Kennzahlen (3 × 2)
  const kwp = preisJeKwp(p);
  const kacheln = [
    ["Leistung", `${p.typ === "speicher" ? `${fmt(p.mwp, p.mwp < 10 ? 1 : 0)} MW` : mwp(p.mwp)}${p.mwhSpeicher ? ` / ${fmt(p.mwhSpeicher)} MWh` : ""}`],
    ["Preisindikation", preisText(p)],
    p.preisModus === "proKwp"
      ? ["Kaufpreis gesamt (indikativ)", preisGesamt(p) ? (preisGesamt(p) >= 1e6 ? `${fmt(preisGesamt(p) / 1e6, 2)} Mio. €` : `${fmt(preisGesamt(p))} €`) : "auf Anfrage"]
      : ["Preis je kWp", kwp ? `${fmt(kwp, kwp < 100 ? 1 : 0)} €/kWp` : "auf Anfrage"],
    ["Netzanschluss", NETZANSCHLUSS[p.netzanschluss] || "offen"],
    ["Geplante Inbetriebnahme", p.codGeplant || "–"],
    ["Fläche", p.flaecheHa ? `${fmt(p.flaecheHa, 1)} ha` : "–"],
  ];
  const kb = (B - 2 * 10) / 3;
  kacheln.forEach(([label, wert], i) => {
    const x = RAND + (i % 3) * (kb + 10);
    const yy = y + Math.floor(i / 3) * 62;
    s.rechteck(x, yy, kb, 52, F.sand100);
    s.text(x + 12, yy + 18, label, { groesse: 8, farbe: F.ink500 });
    const zeilen = umbrechen(wert, kb - 24, 12, true);
    if (zeilen.length === 1) s.text(x + 12, yy + 38, zeilen[0], { groesse: 12, fett: true, farbe: F.ink900 });
    else umbrechen(wert, kb - 24, 9.5, true).slice(0, 2).forEach((z, j) => s.text(x + 12, yy + 33 + j * 11.5, z, { groesse: 9.5, fett: true, farbe: F.ink900 }));
  });
  y += 2 * 62 + 8;

  // ---------------------------------------------------------------- Phase
  const ph = phaseById(p.phase);
  const idx = PHASEN.findIndex((x) => x.id === ph.id);
  s.text(RAND, y + 10, "Entwicklungsphase", { groesse: 8, farbe: F.ink500 });
  s.text(RAND + textBreite("Entwicklungsphase", 8) + 8, y + 10, ph.label, { groesse: 10, fett: true, farbe: F.ink900 });
  y += 20;
  const sb = (B - 5 * 4) / 6;
  PHASEN.forEach((x, i) => {
    const xx = RAND + i * (sb + 4);
    s.rechteck(xx, y, sb, 7, i <= idx ? F.ov500 : F.ink200);
    s.text(xx, y + 19, x.kurz, { groesse: 6.8, fett: i === idx, farbe: i === idx ? F.ink900 : F.ink500 });
  });
  y += 32;
  s.text(RAND, y + 8, `Typisches Risiko: ${ph.risiko}  ·  Marktspanne der Phase: ${fmt(ph.preisProKwp.min)}–${fmt(ph.preisProKwp.max)} €/kWp${typeof p.datenraumQualitaet === "number" ? `  ·  Datenraum-Qualität: ${p.datenraumQualitaet} %` : ""}`, { groesse: 8.5, farbe: F.ink500 });
  y += 18;

  // ---------------------------------------------------------------- Beschreibung & Highlights
  ueberschrift("Projektbeschreibung");
  absatz(p.beschreibung || "Keine Beschreibung hinterlegt.");
  if (p.highlights?.length) {
    ueberschrift("Highlights");
    for (const h of p.highlights) {
      platz(16);
      s.rechteck(RAND + 2, y + 4, 5, 5, F.ov500);
      absatz(h, { einzug: 16, farbe: F.ink900 });
      y += 2;
    }
  }

  // ---------------------------------------------------------------- Vertrauliche Angaben / Datenraum
  if (!teaser) {
    ueberschrift("Vertrauliche Angaben");
    const eintraege = Object.entries(vertraulich || {}).filter(([, w]) => w !== "" && w !== null && w !== undefined);
    if (!eintraege.length) absatz("Der Anbieter hat keine vertraulichen Angaben hinterlegt – Unterlagen siehe Datenraum.", { farbe: F.ink500 });
    eintraege.forEach(([k, w], i) => {
      const label = VERTRAULICH_FELDER[k] || k;
      const wert = typeof w === "number" ? fmt(w, Number.isInteger(w) ? 0 : 1) : String(w);
      const zeilen = umbrechen(wert, B - 218, 9.5);
      const labels = umbrechen(label, 180, 8.5);
      const h = Math.max(zeilen.length, labels.length) * 13.5 + 10;
      platz(h);
      if (i % 2 === 0) s.rechteck(RAND, y, B, h, F.ink50);
      labels.forEach((z, j) => s.text(RAND + 8, y + 16 + j * 13.5, z, { groesse: 8.5, farbe: F.ink500 }));
      zeilen.forEach((z, j) => s.text(RAND + 204, y + 16 + j * 13.5, z, { groesse: 9.5, farbe: F.ink900 }));
      y += h;
    });

    datenblattAbschnitt();

    ueberschrift("Datenraum");
    if (!dokumente.length) absatz("Noch keine Unterlagen im Datenraum.", { farbe: F.ink500 });
    for (const d of dokumente) {
      platz(18);
      s.text(RAND, y + 11, "•", { groesse: 10, farbe: F.ov600 });
      const name = umbrechen(d.name, B - 190, 9.5)[0];
      s.text(RAND + 12, y + 11, name, { groesse: 9.5, farbe: F.ink900 });
      s.text(RAND + B, y + 11, `${DOKUMENT_KATEGORIEN[d.kategorie] || d.kategorie} · ${datum(d.am)}`, { groesse: 8, farbe: F.ink500, ausrichtung: "rechts" });
      y += 17;
    }
  } else {
    ueberschrift("Vertrauliche Angaben & Datenraum");
    absatz(
      `Gemeinde, Flurstücke, Netzbetreiber, Einspeisepunkt, spezifischer Ertrag und alle Unterlagen erhalten registrierte Investoren nach Annahme der Klick-NDA und Freigabe durch das Backoffice von ÖkoInvest.${portalUrl ? ` Zum Projekt im Portal: ${portalUrl}` : ""}`
    );
  }

  if (teaser) hinweisBox();

  // Projektdatenblatt (nur vertrauliche Fassung): ausgefüllte Felder je Bereich; Felder aus `vertraulich` stehen oben
  function datenblattAbschnitt() {
    const pv = { ...p, datenblatt: datenblatt || {}, vertraulich: vertraulich || {} };
    const vs = datenblattVollstaendigkeit(pv);
    const kz = datenblattKennzahlen(pv);
    ueberschrift("Projektdatenblatt");
    const kennzahlen = [
      `Vollständigkeit ${vs.quote} % (${vs.erfuellt} von ${vs.erwartet} erwarteten Angaben der Phase)`,
      kz.dcAc ? `DC/AC ${fmt(kz.dcAc, 2)}` : "",
      kz.mwpProHa ? `${fmt(kz.mwpProHa, 2)} MWp/ha` : "",
      kz.p90ZuP50 ? `P90/P50 ${fmt(kz.p90ZuP50 * 100, 1)} %` : "",
      kz.jahresertragP50Mwh ? `Jahresertrag P50 ${fmt(kz.jahresertragP50Mwh)} MWh` : "",
    ].filter(Boolean);
    absatz(kennzahlen.join("  ·  "), { groesse: 9, farbe: F.ink500 });
    y += 4;
    let leer = true;
    for (const b of DATENBLATT_BEREICHE) {
      const zeilen = b.felder
        .filter((f) => f.pfad !== "vertraulich")
        .map((f) => [f.label, feldAnzeige(f, pv.datenblatt[f.id])])
        .filter(([, w]) => w);
      if (!zeilen.length) continue;
      leer = false;
      platz(40);
      y += 6;
      s.text(RAND, y + 10, b.titel, { groesse: 9.5, fett: true, farbe: F.navy700 });
      y += 16;
      zeilen.forEach(([label, wert], i) => {
        const wz = umbrechen(wert, B - 218, 9.5);
        const lz = umbrechen(label, 180, 8.5);
        const h = Math.max(wz.length, lz.length) * 13.5 + 10;
        platz(h);
        if (i % 2 === 0) s.rechteck(RAND, y, B, h, F.ink50);
        lz.forEach((z, j) => s.text(RAND + 8, y + 16 + j * 13.5, z, { groesse: 8.5, farbe: F.ink500 }));
        wz.forEach((z, j) => s.text(RAND + 204, y + 16 + j * 13.5, z, { groesse: 9.5, farbe: F.ink900 }));
        y += h;
      });
    }
    if (leer) absatz("Der Anbieter hat das Standard-Projektdatenblatt noch nicht ausgefüllt – Angaben siehe Datenraum.", { farbe: F.ink500 });
  }

  // Vertraulichkeits- bzw. Teaser-Hinweis (vertraulich: oben auf Seite 1, Teaser: am Ende)
  function hinweisBox() {
    const hinweis = teaser
      ? "Unverbindlicher Teaser. Die Angaben stammen vom Anbieter und wurden von ÖkoInvest auf Plausibilität geprüft; sie ersetzen keine eigene Prüfung und stellen keine Anlageberatung dar. Maßgeblich sind die Unterlagen im Datenraum und der Kaufvertrag."
      : `Vertraulich. Erstellt am ${datumZeit(erstelltAm)} für ${empfaenger?.name || "–"}${empfaenger?.firma ? ` (${empfaenger.firma})` : ""}${empfaenger?.email ? `, ${empfaenger.email}` : ""}. ${empfaenger?.rolle === "investor" ? `Es gilt die Vertraulichkeitsvereinbarung (Klick-NDA, Version ${NDA.version}): Weitergabe nur an zur Verschwiegenheit verpflichtete Berater, kein direkter Kontakt zu Anbieter, Eigentümern, Netzbetreiber oder Gemeinde ohne Abstimmung mit ÖkoInvest. ` : ""}Der Abruf dieses Exposés wurde protokolliert. Alle Angaben ohne Gewähr; maßgeblich sind die Unterlagen im Datenraum und der Kaufvertrag.`;
    const hz = umbrechen(hinweis, B - 28, 8.8);
    const hh = hz.length * 12.5 + 22;
    platz(hh + 14);
    y += 14;
    s.rechteck(RAND, y, B, hh, teaser ? F.ov50 : F.sun50, { rand: teaser ? "#cde3b1" : F.sun400 });
    hz.forEach((z, j) => s.text(RAND + 14, y + 19 + j * 12.5, z, { groesse: 8.8, farbe: F.ink900 }));
    y += hh;
  }

  // ---------------------------------------------------------------- Fußzeilen (alle Seiten)
  const gesamt = doc.seiten.length;
  doc.seiten.forEach((seite, i) => {
    const fy = doc.hoehe - FUSS + 18;
    seite.linie(RAND, fy - 12, doc.breite - RAND, fy - 12);
    seite.text(RAND, fy, "ÖkoInvest GmbH · Gewerbegebiet 10 · 5121 Ostermiething · Österreich", { groesse: 7.5, farbe: F.ink500 });
    seite.text(doc.breite - RAND, fy, `Seite ${i + 1} von ${gesamt}`, { groesse: 7.5, farbe: F.ink500, ausrichtung: "rechts" });
    const zeile2 = teaser
      ? `Öffentlicher Teaser · Stand ${datum(erstelltAm)}${p.demo ? " · Demo-Projekt mit fiktiven Angaben" : ""}`
      : `VERTRAULICH – erstellt für ${empfaenger?.email || empfaenger?.name || "–"} am ${datumZeit(erstelltAm)}${p.demo ? " · Demo-Projekt" : ""}`;
    seite.text(RAND, fy + 12, zeile2, { groesse: 7.5, fett: !teaser, farbe: teaser ? F.ink400 : F.navy700 });
  });

  return doc.alsBuffer();
}

/** Dateiname für den Download, z. B. oekoinvest-expose-P-26-ABCD12.pdf */
export const exposeDateiname = (p, teaser = false) => `oekoinvest-${teaser ? "teaser" : "expose"}-${p.id}.pdf`;

