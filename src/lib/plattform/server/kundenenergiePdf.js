// src/lib/plattform/server/kundenenergiePdf.js
//
// PDF-Dokumente der Kundenseite Energie (nur serverseitig, gemeinsamer PDF-Erzeuger server/pdf.js):
//   anliegenPdf       Eingangsbestätigung bzw. Entscheidung zu Einspruch, Kündigung, Verlängerung, Übernahme (Kunde, Backoffice)
//   vertragsdatenPdf  Vertragsdatenblatt für den bezuschlagten Versorger (Kundendaten, Lokationen, Konditionen)
//   kostenberichtPdf  Energiekostenbericht eines Jahres (Kunde)
// Beide Backends liefern nur die Daten (kundenAnliegenDokument, vertragsdaten, kostenbericht) – das PDF erzeugt die Website.

import { PdfDokument } from "./pdf";
import { ANLIEGEN_STATUS } from "../kundenenergie";

const NAVY = "#03122b";
const GRUEN = "#aed083";
const TINTE = "#151a24";
const GRAU = "#6b7486";
const LINIE = "#dfe3ea";

const eur = (x, s = 2) => (Number.isFinite(x) ? `${x.toLocaleString("de-DE", { minimumFractionDigits: s, maximumFractionDigits: s })} €` : "–");
const zahl = (x, s = 0) => (Number.isFinite(x) ? x.toLocaleString("de-DE", { minimumFractionDigits: s, maximumFractionDigits: s }) : "–");
const tag = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "–");

function rahmen(titel, untertitel, kopf) {
  const doc = new PdfDokument({ titel, thema: kopf });
  const seiten = [];
  let s = null;
  let y = 0;
  const neueSeite = () => {
    s = doc.seite();
    seiten.push(s);
    s.rechteck(0, 0, doc.breite, 64, NAVY);
    s.text(48, 40, "ÖkoInvest", { groesse: 17, fett: true, farbe: "#ffffff" });
    s.text(doc.breite - 48, 40, kopf.toUpperCase(), { groesse: 8.5, fett: true, farbe: GRUEN, ausrichtung: "rechts", zeichenabstand: 1 });
    s.linie(48, doc.hoehe - 44, doc.breite - 48, doc.hoehe - 44, { farbe: LINIE });
    s.text(48, doc.hoehe - 30, `ÖkoInvest GmbH · Gewerbegebiet 10 · 5121 Ostermiething · ${titel}`, { groesse: 7.5, farbe: GRAU });
    s.text(doc.breite - 48, doc.hoehe - 30, `Seite ${seiten.length}`, { groesse: 7.5, farbe: GRAU, ausrichtung: "rechts" });
    y = 100;
  };
  neueSeite();
  y = s.absatz(48, y, titel, { breite: doc.breite - 96, groesse: 19, fett: true, farbe: TINTE, zeilenhoehe: 24 }) + 18;
  if (untertitel) y = s.absatz(48, y, untertitel, { breite: doc.breite - 96, groesse: 10, farbe: GRAU }) + 20;
  const platz = (h) => {
    if (y + h > doc.hoehe - 70) neueSeite();
  };
  return {
    absatz(text, { groesse = 10, fett = false, farbe = "#394050", abstand = 10 } = {}) {
      platz(groesse * 3);
      y = s.absatz(48, y, text, { breite: doc.breite - 96, groesse, fett, farbe }) + groesse + abstand;
    },
    ueberschrift(text) {
      platz(40);
      y += 6;
      s.text(48, y, text, { groesse: 12, fett: true, farbe: TINTE });
      y += 18;
    },
    angaben(liste) {
      for (const [k, v] of liste) {
        platz(16);
        s.text(48, y, k, { groesse: 9, farbe: GRAU });
        y = Math.max(y + 15, s.absatz(210, y, String(v ?? "–"), { breite: doc.breite - 258, groesse: 9.5, farbe: TINTE }) + 15);
      }
      y += 6;
    },
    tabelle(kopf, zeilen, breiten, { rechts = [] } = {}) {
      const x0 = 48;
      const zeile = (werte, { fett = false, hinter = null } = {}) => {
        platz(18);
        if (hinter) s.rechteck(x0, y - 11, doc.breite - 96, 16, hinter);
        let x = x0 + 4;
        werte.forEach((w, i) => {
          const r = rechts.includes(i);
          s.text(r ? x + breiten[i] - 8 : x, y, String(w ?? "–").slice(0, 48), { groesse: 8.5, fett, farbe: TINTE, ausrichtung: r ? "rechts" : "links" });
          x += breiten[i];
        });
        y += 16;
      };
      zeile(kopf, { fett: true, hinter: "#eef1f5" });
      zeilen.forEach((z, i) => zeile(z, { hinter: i % 2 ? "#f8f9fb" : null, fett: z.fett }));
      y += 8;
    },
    fertig: () => doc.alsBuffer(),
  };
}

/** Eingangsbestätigung bzw. Entscheidung zu einem Kundenanliegen */
export function anliegenPdf(d) {
  const a = d.anliegen;
  const entschieden = !ANLIEGEN_STATUS[a.status]?.offen;
  const titel = a.status === "angebot" ? "Angebot" : entschieden ? "Entscheidung zu Ihrem Anliegen" : "Eingangsbestätigung";
  const p = rahmen(titel, `${a.artLabel} · ${a.id} · Stand ${tag(new Date().toISOString())}`, "Kundenservice Energie");
  p.absatz(`An: ${d.kunde.firma || d.kunde.name}${d.kunde.firma ? `, z. H. ${d.kunde.name}` : ""}`, { fett: true });
  p.angaben([
    ["Anliegen", a.artLabel],
    ["Eingereicht am", tag(a.eingereichtAm)],
    ["Status", a.statusLabel],
    a.belegNummer ? ["Rechnung", `${a.belegNummer}${a.belegZeitraum ? ` (${tag(a.belegZeitraum.von)} – ${tag(a.belegZeitraum.bis)})` : ""}${Number.isFinite(a.belegBrutto) ? ` · ${eur(a.belegBrutto)} brutto` : ""}`] : null,
    a.anlageName ? ["Anlage", a.anlageName] : null,
    a.grundLabel ? ["Grund", a.grundLabel] : null,
    Number.isFinite(a.betragStrittigEur) ? ["Strittiger Betrag", eur(a.betragStrittigEur)] : null,
    a.wirksamZum ? ["Kündigung wirksam zum", tag(a.wirksamZum)] : null,
    a.stichtag ? ["Fristgerecht bis", tag(a.stichtag)] : null,
    a.wunschJahre ? ["Gewünschte Verlängerung", `${a.wunschJahre} Jahre`] : null,
    a.art === "kaufoption" && a.wunschTermin ? ["Wunschtermin Übernahme", tag(a.wunschTermin)] : null,
    !entschieden ? ["Bearbeitungsziel", tag(a.zielAm)] : ["Entschieden am", tag(a.entschiedenAm)],
  ].filter(Boolean));
  if (a.text) {
    p.ueberschrift("Ihre Angaben");
    p.absatz(a.text, { groesse: 9.5 });
  }
  if (a.angebot) {
    p.ueberschrift(a.art === "kaufoption" ? "Angebot zur Übernahme der Anlage" : "Angebot zur Verlängerung");
    p.angaben(a.art === "kaufoption"
      ? [["Kaufpreis (netto)", eur(a.angebot.betragEur)], ["Übergabestichtag", tag(a.angebot.stichtag)], ["Angebot gültig bis", tag(a.angebot.gueltigBis)]]
      : [["Verlängerung", `${a.angebot.jahre} Jahre`], ["Arbeitspreis", `${zahl(a.angebot.preisCt, 3)} ct/kWh netto`], ["Grundgebühr", Number.isFinite(a.angebot.grundgebuehrMonat) ? `${eur(a.angebot.grundgebuehrMonat)} je Monat netto` : "unverändert"], ["Angebot gültig bis", tag(a.angebot.gueltigBis)]]);
    if (a.angebot.text) p.absatz(a.angebot.text, { groesse: 9.5 });
    p.absatz("Das Angebot nehmen Sie im Portal an. Der verbindliche Vertrag (Nachtrag bzw. Kaufvertrag) wird Ihnen anschließend zur Unterschrift übermittelt.", { groesse: 8.5 });
  }
  if (entschieden && a.begruendung) {
    p.ueberschrift(a.status === "abgelehnt" ? "Begründung" : "Ergebnis");
    p.absatz(a.begruendung, { groesse: 9.5 });
  }
  if (Number.isFinite(a.korrekturEur)) p.angaben([["Korrektur (Gutschrift)", `${eur(a.korrekturEur)} – die Gutschrift bzw. Korrekturrechnung erhalten Sie gesondert`]]);
  if (a.art === "einspruch" && !entschieden) p.absatz("Solange wir Ihren Einspruch prüfen, ist die Rechnung von Mahnungen ausgenommen. Unstrittige Beträge bitten wir fristgerecht zu begleichen. Vertragliche Einwendungsfristen bleiben unberührt.", { groesse: 8.5 });
  if (a.art === "kuendigung" && a.status === "bestaetigt") p.absatz(`Wir bestätigen die Kündigung des Stromliefervertrags zum ${tag(a.wirksamZum)}. Die vertraglich vereinbarte Endschaftsregelung (z. B. Übernahme, Rückbau oder Verlängerung) bleibt davon unberührt; zu den nächsten Schritten melden wir uns.`, { groesse: 9 });
  p.ueberschrift("Verlauf");
  p.angaben((a.verlauf || []).slice(-14).map((x) => [tag(x.am), x.text]));
  p.absatz(`Mit freundlichen Grüßen\n${d.eigentuemer && d.eigentuemer !== "ÖkoInvest GmbH" ? `${d.eigentuemer}, vertreten durch die Betriebsführung ÖkoInvest GmbH` : "ÖkoInvest GmbH"}, Ostermiething`, { abstand: 4 });
  return p.fertig();
}

/** Vertragsdatenblatt für den bezuschlagten Versorger */
export function vertragsdatenPdf(d) {
  const a = d.ausschreibung;
  const p = rahmen("Vertragsdatenblatt Stromlieferung", `${a.titel} · Zuschlag vom ${tag(a.zuschlagAm)} · vertraulich`, "Energiebeschaffung");
  p.angaben([
    ["Versorger", d.lieferant],
    ["Lieferbeginn", `01.${a.lieferbeginn.slice(5)}.${a.lieferbeginn.slice(0, 4)}`],
    ["Gebotszone", a.zone === "AT" ? "Österreich (AT)" : "Deutschland (DE-LU)"],
    ["Produkt", `${d.produkt.id || ""} · ${d.produkt.art || ""} · ${d.produkt.laufzeitJahre || "–"} Jahr(e)`],
    ["Arbeitspreis / Aufschlag", Number.isFinite(d.produkt.arbeitspreisCt) ? `${zahl(d.produkt.arbeitspreisCt, 3)} ct/kWh` : Number.isFinite(d.produkt.aufschlagCt) ? `Aufschlag ${zahl(d.produkt.aufschlagCt, 3)} ct/kWh` : "–"],
    ["Grundpreis", Number.isFinite(d.produkt.grundpreisEurMonat) ? `${eur(d.produkt.grundpreisEurMonat)} je Monat` : "–"],
    ["Herkunftsnachweise", Number.isFinite(d.produkt.hknCt) && d.produkt.hknCt ? `${zahl(d.produkt.hknCt, 3)} ct/kWh` : "–"],
    ["Zahlungsziel", `${d.angebot.zahlungszielTage} Tage`],
  ]);
  for (const k of d.kunden) {
    p.ueberschrift(k.firma || k.ansprechpartner);
    p.angaben([["Ansprechpartner", k.ansprechpartner], ["E-Mail", k.email], k.telefon ? ["Telefon", k.telefon] : null, ["Jahresmenge (Los)", k.jahresKwh ? `${zahl(k.jahresKwh)} kWh` : "–"], ["Vertragslaufzeit", `${tag(k.beginn)} – ${tag(k.vertragEnde)}`]].filter(Boolean));
    p.tabelle(
      ["Abnahmestelle", "PLZ / Ort", "MaLo / Zählpunkt", "MeLo", "Messart", "kWh/Jahr"],
      k.abnahmestellen.map((s) => [s.bezeichnung, `${s.plz} ${s.ort}`.trim(), s.maloId || s.zaehlpunkt || "–", s.meloId || "–", String(s.messart || "").toUpperCase(), zahl(s.jahresverbrauchKwh)]),
      [110, 80, 125, 80, 44, 60],
      { rechts: [5] }
    );
    if (!k.abnahmestellen.length) p.absatz("Keine Abnahmestellen hinterlegt – ÖkoInvest reicht die Lokationsdaten nach.", { groesse: 9 });
  }
  p.absatz(d.hinweis, { groesse: 8.5 });
  p.absatz("Bitte stellen Sie den Liefervertrag im Portal bereit (Schritt „Liefervertrag bereitgestellt“) und bestätigen Sie dort die Anmeldung beim Netzbetreiber und den Lieferbeginn.", { groesse: 8.5 });
  return p.fertig();
}

/** Energiekostenbericht eines Jahres */
export function kostenberichtPdf(d) {
  const p = rahmen(`Energiekostenbericht ${d.jahr}`, `${d.kunde.firma || d.kunde.name} · Stand ${tag(new Date().toISOString())}`, "Energiebeschaffung");
  const s = d.summe;
  p.angaben([
    ["Strombezug gesamt", `${zahl(s.gesamtKwh)} kWh`],
    ["davon Solarstrom vor Ort", `${zahl(s.pvKwh)} kWh${Number.isFinite(s.pvAnteil) ? ` (${zahl(s.pvAnteil * 100, 1)} %)` : ""}`],
    ["Energiekosten gesamt (netto)", eur(s.gesamtEur, 0)],
    ["Mischpreis Energie", Number.isFinite(s.mischpreisCt) ? `${zahl(s.mischpreisCt, 2)} ct/kWh` : "–"],
    ["Vorteil Solarstrom ggü. Energiepreis (ohne Netzentgelte)", eur(s.pvErsparnisEur, 0)],
    ["Quelle Netzbezug", d.quelleNetz],
  ]);
  p.tabelle(
    ["Monat", "Netz kWh", "ct/kWh", "Netz €", "Solar kWh", "Solar €", "Gesamt €", "Misch ct"],
    [
      ...d.monate.map((m) => [`${m.monat.slice(5)}/${m.monat.slice(0, 4)}${m.netzGeschaetzt ? "*" : ""}`, zahl(m.netzKwh), zahl(m.netzCt, 2), zahl(m.netzEur), zahl(m.pvKwh), zahl(m.pvEur), zahl(m.gesamtEur), zahl(m.mischpreisCt, 2)]),
      Object.assign(["Summe", zahl(s.netzKwh), "", zahl(s.netzEur), zahl(s.pvKwh), zahl(s.pvEur), zahl(s.gesamtEur), zahl(s.mischpreisCt, 2)], { fett: true }),
    ],
    [60, 66, 50, 62, 64, 62, 70, 65],
    { rechts: [1, 2, 3, 4, 5, 6, 7] }
  );
  p.absatz("* Netzbezug geschätzt (Jahresmenge ÷ 12).", { groesse: 8 });
  for (const h of d.hinweise) p.absatz(h, { groesse: 8.5, abstand: 4 });
  p.absatz("Grundlage: Energiepreise Ihrer im Portal erfassten Stromverträge, Monatssummen des hochgeladenen Lastgangs sowie die Contracting-Rechnungen aus geeichten Zählerständen. Keine Rechts-, Steuer- oder Energieberatung.", { groesse: 8 });
  return p.fertig();
}
