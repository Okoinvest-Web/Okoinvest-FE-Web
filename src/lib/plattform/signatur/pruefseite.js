// src/lib/plattform/signatur/pruefseite.js
//
// Prüfseite der elektronischen Unterschrift und signiertes PDF (Original + angehängte Prüfseite als
// inkrementelles Update, siehe pdfAnhang.js). Genutzt vom Demo-Backend und – im Frappe-Betrieb – vom
// Frappe-Adapter (die Website erzeugt das PDF, Frappe prüft „beginnt mit Original“ und speichert).
//
// Inhalt der Prüfseite: Kennzeichnung EES (eIDAS), Vorgang, Dokument, SHA-256 der Originaldatei, je
// Unterzeichner Zeitpunkt, Art (gezeichnet mit Bild | getippt), bestätigter E-Mail-Code, IP, Browser,
// Prüfsumme des unterschriebenen Dokuments; Prüfanleitung und Rechtshinweis.
//
// Nur serverseitig.

import { createHash } from "node:crypto";
import { PdfDokument, umbrechen } from "../server/pdf";
import { pngLesen } from "../server/png";
import { pdfSeitenAnhaengen } from "./pdfAnhang";
import { SIGNATUR_ARTEN_UNTERSCHRIFT, SIGNATUR_KENNZEICHNUNG, SIGNATUR_RECHTSHINWEIS, signaturArtLabel } from "./index";
import { datumZeit } from "../format";

const F = {
  navy950: "#03122b", navy900: "#041d42", ov300: "#aed083", ov500: "#669933", ov50: "#f4f9ee",
  ink900: "#151a24", ink700: "#394050", ink500: "#6b7486", ink200: "#dfe3ea", ink50: "#f7f8fa", weiss: "#ffffff",
};
const RAND = 48;

export const sha256Hex = (b) => createHash("sha256").update(b).digest("hex");

/** Browser-Kennung kürzen (Prüfseite) */
const uaKurz = (ua) => String(ua || "–").replace(/\s+/g, " ").slice(0, 150);

/** Prüfseite(n) als eigenständiges PDF (wird anschließend an das Original angehängt) */
export function pruefseitePdf(vorgang, { erzeugtAm = new Date().toISOString() } = {}) {
  const doc = new PdfDokument({ titel: `Prüfseite: ${vorgang.titel}`, thema: "Prüfseite elektronische Signatur (EES)" });
  const B = doc.breite - 2 * RAND;
  let s = doc.seite();
  let y = 0;

  const kopf = (folge = false) => {
    s.rechteck(0, 0, doc.breite, folge ? 40 : 86, F.navy950);
    s.text(RAND, folge ? 26 : 38, "ÖkoInvest", { groesse: folge ? 11 : 17, fett: true, farbe: F.weiss });
    s.text(doc.breite - RAND, folge ? 26 : 38, "PRÜFSEITE · ELEKTRONISCHE SIGNATUR", { groesse: 8, fett: true, farbe: F.ov300, ausrichtung: "rechts", zeichenabstand: 0.8 });
    if (!folge) s.text(RAND, 64, "Einfache elektronische Signatur (EES) – Art. 3 Nr. 10 eIDAS-VO", { groesse: 9.5, farbe: F.ov300 });
    y = folge ? 70 : 118;
  };
  const platz = (h) => {
    if (y + h > doc.hoehe - 70) {
      s = doc.seite();
      kopf(true);
    }
  };
  const zeile = (label, wert, { mono = false } = {}) => {
    const zeilen = umbrechen(String(wert ?? "–"), B - 150, mono ? 8.5 : 9.5);
    platz(14 * zeilen.length + 4);
    s.text(RAND, y, label, { groesse: 8.5, farbe: F.ink500 });
    zeilen.forEach((z, i) => s.text(RAND + 150, y + i * 12.5, z, { groesse: mono ? 8.5 : 9.5, farbe: F.ink900 }));
    y += 12.5 * zeilen.length + 4;
  };

  kopf();
  s.text(RAND, y, vorgang.titel, { groesse: 16, fett: true, farbe: F.ink900 });
  y += 22;
  s.rechteck(RAND, y - 8, 26, 2.2, F.ov500);
  y += 12;
  zeile("Vorgang", vorgang.id);
  zeile("Dokumentart", signaturArtLabel(vorgang.art));
  zeile("Originaldatei", `${vorgang.dokumentName || "dokument.pdf"}${vorgang.seitenOriginal ? ` (${vorgang.seitenOriginal} ${vorgang.seitenOriginal === 1 ? "Seite" : "Seiten"})` : ""}`);
  zeile("SHA-256 Original", vorgang.sha256Original, { mono: true });
  zeile("Bereitgestellt", `${datumZeit(vorgang.erstelltAm)} Uhr${vorgang.ersteller?.name ? ` durch ${vorgang.ersteller.name}` : ""} (ÖkoInvest GmbH)`);
  zeile("Abgeschlossen", `${datumZeit(vorgang.abgeschlossenAm || erzeugtAm)} Uhr`);
  zeile("Reihenfolge", vorgang.reihenfolge === false ? "beliebig" : "fest (Unterzeichner nacheinander)");
  y += 8;

  const liste = [...(vorgang.unterzeichner || [])].sort((a, b) => a.position - b.position);
  liste.forEach((u, i) => {
    const us = u.unterschrift || {};
    let bild = null;
    if (us.art === "gezeichnet" && us.bildPngBase64) {
      try {
        bild = pngLesen(Buffer.from(us.bildPngBase64, "base64"));
      } catch {
        bild = null;
      }
    }
    const hoehe = 160;
    platz(hoehe);
    s.rechteck(RAND, y, B, hoehe - 12, F.ink50, { rand: F.ink200 });
    const x0 = RAND + 14;
    const fb = 172; // Signaturfeld rechts (Breite)
    const fx = RAND + B - fb - 14;
    const wertX = x0 + 104;
    const wertBreite = fx - wertX - 10;
    let yy = y + 22;
    s.text(x0, yy, `${i + 1}. ${umbrechen(u.name, B - 150, 11.5, true)[0]}`, { groesse: 11.5, fett: true, farbe: F.navy900 });
    s.text(RAND + B - 14, yy, u.status === "unterschrieben" ? "UNTERSCHRIEBEN" : String(u.status || "").toUpperCase(), { groesse: 8, fett: true, farbe: u.status === "unterschrieben" ? F.ov500 : F.ink500, ausrichtung: "rechts", zeichenabstand: 0.6 });
    yy += 16;
    const kv = (label, wert) => {
      const z = umbrechen(String(wert ?? "–"), wertBreite, 8.5);
      s.text(x0, yy, label, { groesse: 8, farbe: F.ink500 });
      s.text(wertX, yy, (z[0] || "–") + (z.length > 1 ? "…" : ""), { groesse: 8.5, farbe: F.ink900 });
      yy += 12;
    };
    kv("E-Mail", u.email);
    kv("Zeitpunkt", us.am ? `${datumZeit(us.am)} Uhr` : "–");
    kv("Art", SIGNATUR_ARTEN_UNTERSCHRIFT[us.art] || "–");
    kv("Code bestätigt", us.codeBestaetigtAm ? `${datumZeit(us.codeBestaetigtAm)} Uhr (E-Mail)` : "–");
    kv("IP-Adresse", us.ip || "–");
    kv("Browser", uaKurz(us.userAgent));
    // volle Breite unter dem Signaturfeld: Prüfsumme, UTC-Zeitpunkt, Zustimmung
    yy = y + 126;
    s.text(x0, yy, "SHA-256 Dokument", { groesse: 8, farbe: F.ink500 });
    s.text(wertX, yy, String(us.sha256Dokument || "–").slice(0, 64), { groesse: 7.6, farbe: F.ink900 });
    yy += 11.5;
    s.text(x0, yy, "Zeitpunkt (UTC)", { groesse: 8, farbe: F.ink500 });
    s.text(wertX, yy, `${us.am || "–"} · Zustimmung ${us.zustimmung ? "erteilt (Wortlaut im Protokoll)" : "–"}`, { groesse: 8, farbe: F.ink900 });

    // Signaturfeld rechts
    const fy = y + 34;
    s.rechteck(fx, fy, fb, 62, F.weiss, { rand: F.ink200 });
    if (bild) {
      const skal = Math.min((fb - 12) / bild.breite, 52 / bild.hoehe);
      const bw = bild.breite * skal;
      const bh = bild.hoehe * skal;
      s.bild(fx + (fb - bw) / 2, fy + (62 - bh) / 2, bw, bh, bild);
    } else if (us.name) {
      s.text(fx + fb / 2, fy + 37, umbrechen(us.name, fb - 16, 14, true)[0], { groesse: 14, fett: true, farbe: F.navy900, ausrichtung: "mitte" });
    }
    s.linie(fx + 10, fy + 52, fx + fb - 10, fy + 52, { farbe: F.ink200 });
    s.text(fx + fb / 2, fy + 73, us.art === "getippt" ? "getippter Name" : us.art === "gezeichnet" ? "gezeichnete Unterschrift" : "", { groesse: 7.5, farbe: F.ink500, ausrichtung: "mitte" });
    y += hoehe;
  });

  // Prüfanleitung und Rechtshinweis: Platz aus der tatsächlichen Zeilenzahl
  const pruefText = "Diese Prüfseite wurde als inkrementelles Update an die unveränderte Originaldatei angehängt. Die ersten Bytes dieser Datei entsprechen exakt dem Original; dessen SHA-256-Prüfsumme steht oben. Die Prüfsumme dieser signierten Gesamtdatei ist im Portal von ÖkoInvest beim Vorgang und im Signaturprotokoll hinterlegt. Weicht eine Prüfsumme ab, wurde die Datei nachträglich verändert.";
  const rechtText = `${SIGNATUR_KENNZEICHNUNG} ${SIGNATUR_RECHTSHINWEIS}`;
  platz(40 + 11 * (umbrechen(pruefText, B, 8).length + umbrechen(rechtText, B, 8).length));
  y += 2;
  s.text(RAND, y, "So prüfen Sie dieses Dokument", { groesse: 10, fett: true, farbe: F.navy900 });
  y += 13;
  y = s.absatz(RAND, y, pruefText, { breite: B, groesse: 8, farbe: F.ink700, zeilenhoehe: 11 }) + 15;
  s.text(RAND, y, "Rechtlicher Hinweis", { groesse: 10, fett: true, farbe: F.navy900 });
  y += 13;
  y = s.absatz(RAND, y, rechtText, { breite: B, groesse: 8, farbe: F.ink700, zeilenhoehe: 11 });

  doc.seiten.forEach((seite, i) => {
    seite.linie(RAND, doc.hoehe - 44, doc.breite - RAND, doc.hoehe - 44);
    seite.text(RAND, doc.hoehe - 30, `ÖkoInvest GmbH · Prüfseite zu Vorgang ${vorgang.id} · erzeugt ${datumZeit(erzeugtAm)} Uhr`, { groesse: 7.5, farbe: F.ink500 });
    seite.text(doc.breite - RAND, doc.hoehe - 30, `Prüfseite ${i + 1}/${doc.seiten.length}`, { groesse: 7.5, farbe: F.ink500, ausrichtung: "rechts" });
  });
  return doc.alsBuffer();
}

/**
 * Signiertes PDF = Original + Prüfseite(n). Liefert { pdf, sha256, seitenVorher, seitenNachher }.
 * Prüft vorab, dass das Original zur protokollierten Prüfsumme passt.
 */
export function signiertesPdf(original, vorgang, { erzeugtAm } = {}) {
  const hash = sha256Hex(original);
  if (vorgang.sha256Original && hash !== vorgang.sha256Original) {
    const e = new Error("Die Originaldatei stimmt nicht mehr mit der protokollierten Prüfsumme überein.");
    e.hashAbweichung = true;
    throw e;
  }
  const pruef = pruefseitePdf(vorgang, { erzeugtAm });
  const r = pdfSeitenAnhaengen(original, pruef);
  return { pdf: r.pdf, sha256: sha256Hex(r.pdf), seitenVorher: r.seitenVorher, seitenNachher: r.seitenNachher };
}

/** Standard-Erklärung (NDA / Provisionsvereinbarung) als PDF zur Unterschrift – aus den bestehenden Texten */
export function standardErklaerungPdf({ titel, untertitel, absaetze = [], hinweis = "", unterzeichner = "" }) {
  const doc = new PdfDokument({ titel, thema: "Zur elektronischen Unterschrift" });
  const B = doc.breite - 2 * RAND;
  const s = doc.seite();
  s.rechteck(0, 0, doc.breite, 70, F.navy950);
  s.text(RAND, 42, "ÖkoInvest", { groesse: 18, fett: true, farbe: F.weiss });
  s.text(doc.breite - RAND, 42, "ZUR ELEKTRONISCHEN UNTERSCHRIFT", { groesse: 8, fett: true, farbe: F.ov300, ausrichtung: "rechts", zeichenabstand: 0.8 });
  let y = s.absatz(RAND, 118, titel, { breite: B, groesse: 19, fett: true, farbe: F.ink900, zeilenhoehe: 24 });
  if (untertitel) y = s.absatz(RAND, y + 22, untertitel, { breite: B, groesse: 10, farbe: F.ink500 });
  y += 30;
  absaetze.forEach((a, i) => {
    y = s.absatz(RAND, y, `${i + 1}. ${a}`, { breite: B, groesse: 11, farbe: F.ink700, zeilenhoehe: 16 }) + 18;
  });
  if (unterzeichner) {
    y += 10;
    s.text(RAND, y, `Erklärende Partei: ${unterzeichner}`, { groesse: 10, fett: true, farbe: F.ink900 });
    y += 18;
  }
  if (hinweis) s.absatz(RAND, y + 6, hinweis, { breite: B, groesse: 8.5, farbe: F.ink500, zeilenhoehe: 12 });
  s.linie(RAND, doc.hoehe - 48, doc.breite - RAND, doc.hoehe - 48);
  s.text(RAND, doc.hoehe - 34, "ÖkoInvest GmbH · Ostermiething (AT) · Unterschrift und Prüfprotokoll folgen auf der angehängten Prüfseite", { groesse: 7.5, farbe: F.ink500 });
  return doc.alsBuffer();
}
