// src/lib/plattform/energie/pdf.js
//
// PDF-Dokumente der Energiebeschaffung (nur serverseitig): Angebotsvergleich, Zuschlagsschreiben, Beschaffungsvollmacht.
// Grundlage: gemeinsamer PDF-Erzeuger server/pdf.js (Helvetica/WinAnsi, Markenfarben). Frappe: Druckformate
// „Angebotsvergleich Energie“ und „Zuschlagsschreiben Energie“ (plattform/print_format).

import { PdfDokument } from "../server/pdf";
import { RECHTSHINWEISE } from "./texte";

const NAVY = "#03122b";
const GRUEN = "#aed083";
const TINTE = "#151a24";
const GRAU = "#6b7486";
const LINIE = "#dfe3ea";

const eur = (x) => (Number.isFinite(x) ? `${Math.round(x).toLocaleString("de-DE")} €` : "–");
const ct = (x) => (Number.isFinite(x) ? `${x.toLocaleString("de-DE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ct/kWh` : "–");
const datum = (iso) => (iso ? new Date(iso).toLocaleString("de-DE", { timeZone: "Europe/Vienna", dateStyle: "medium", timeStyle: iso.length > 10 ? "short" : undefined }) : "–");

function rahmen(titel, untertitel) {
  const doc = new PdfDokument({ titel, thema: "Energiebeschaffung" });
  const seiten = [];
  let s = null;
  let y = 0;
  const neueSeite = () => {
    s = doc.seite();
    seiten.push(s);
    s.rechteck(0, 0, doc.breite, 64, NAVY);
    s.text(48, 40, "ÖkoInvest", { groesse: 17, fett: true, farbe: "#ffffff" });
    s.text(doc.breite - 48, 40, "ENERGIEBESCHAFFUNG", { groesse: 8.5, fett: true, farbe: GRUEN, ausrichtung: "rechts", zeichenabstand: 1 });
    s.linie(48, doc.hoehe - 44, doc.breite - 48, doc.hoehe - 44, { farbe: LINIE });
    s.text(48, doc.hoehe - 30, `ÖkoInvest GmbH · ${titel}`, { groesse: 7.5, farbe: GRAU });
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
    doc,
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
        s.absatz(210, y, String(v ?? "–"), { breite: doc.breite - 258, groesse: 9.5, farbe: TINTE });
        y += 15;
      }
      y += 6;
    },
    tabelle(kopf, zeilen, breiten) {
      const x0 = 48;
      const zeile = (werte, { fett = false, hinter = null } = {}) => {
        platz(18);
        if (hinter) s.rechteck(x0, y - 11, doc.breite - 96, 16, hinter);
        let x = x0 + 4;
        werte.forEach((w, i) => {
          const rechts = i > 0 && /^[-\d.,\s%€ct/kWh+–]+$/.test(String(w));
          s.text(rechts ? x + breiten[i] - 8 : x, y, String(w ?? "–").slice(0, 60), { groesse: 8.5, fett, farbe: TINTE, ausrichtung: rechts ? "rechts" : "links" });
          x += breiten[i];
        });
        y += 16;
      };
      zeile(kopf, { fett: true, hinter: "#eef1f5" });
      zeilen.forEach((z, i) => zeile(z, { hinter: i % 2 ? "#f8f9fb" : null }));
      y += 8;
    },
    fertig() {
      return doc.alsBuffer();
    },
  };
}

/** Angebotsvergleich (Backoffice: alle Zeilen mit Versorger; Kunde: beste Angebote je Versorger) */
export function angebotsvergleichPdf(daten) {
  const a = daten.ausschreibung;
  const admin = daten.rolle === "admin";
  const p = rahmen("Angebotsvergleich Strom", `${a.titel} · Stand ${datum(new Date().toISOString())} · vertraulich`);
  p.angaben([
    ["Lieferbeginn", a.lieferbeginn?.split("-").reverse().join("/")],
    ["Gebotszone", a.zone === "AT" ? "Österreich (AT)" : "Deutschland (DE-LU)"],
    ...(admin ? [["Kunden", a.kunden.map((k) => k.firma || k.name).join(", ")], ["Normierungsmenge", `${Math.round((a.vergleich?.ctx?.kwh || 0) / 1000).toLocaleString("de-DE")} MWh/Jahr`], ["Terminpreis Base (Normierung)", `${(a.vergleich?.ctx?.baseEurMwh ?? 0).toLocaleString("de-DE")} €/MWh`]] : [["Kunde", daten.kunde?.firma || daten.kunde?.name]]),
  ]);
  p.absatz("Normierung: Jede Angebotsposition wird auf das Verbrauchsprofil des Loses (erstes Lieferjahr) gerechnet – Festpreis × Menge, Spot-Index und Tranchen mit dem lastgewichteten Terminpreis (Peak/Offpeak je Monat) plus Aufschlag, jeweils zuzüglich Grundpreis und Herkunftsnachweisen. Netzentgelte, Umlagen, Abgaben und Steuern sind nicht enthalten (unabhängig vom Lieferanten).", { groesse: 8.5 });
  const zeilen = admin ? a.vergleich.zeilen : daten.ausschreibung.vergleich?.zeilen || [];
  p.ueberschrift(admin ? "Alle Angebotspositionen (Ranking)" : "Beste Angebote je Versorger");
  p.tabelle(
    ["Rang", "Versorger", "Produkt", "ct/kWh", "€/Jahr", "Abstand"],
    zeilen.slice(0, 40).map((z) => [z.rang, admin ? z.lieferant : z.lieferant, `${z.produkt}${admin ? ` · R${z.runde}` : ""}`, ct(z.ctKwh).replace(" ct/kWh", ""), eur(z.eurJahr).replace(" €", ""), `${(z.abstandProzent ?? 0).toLocaleString("de-DE")} %`]),
    [34, 130, 190, 50, 55, 40]
  );
  if (zeilen.length) {
    p.ueberschrift("Sensitivität (€/Jahr bei Marktbewegung)");
    const sz = daten.ausschreibung.vergleich?.szenarien || [-30, -15, 15, 30];
    p.tabelle(["Versorger / Produkt", ...sz.map((s) => `${s > 0 ? "+" : ""}${s} %`)], zeilen.slice(0, 12).map((z) => [`${z.lieferant} – ${z.produkt}`.slice(0, 55), ...sz.map((s) => eur(z.sensitivitaet?.[s]).replace(" €", ""))]), [259, 55, 55, 55, 55]);
    p.absatz("Festpreise sind gegen Marktbewegungen gesichert; Spot-Index trägt die Bewegung voll, das Tranchenmodell näherungsweise zur Hälfte (je nach Beschaffungsfortschritt).", { groesse: 8.5 });
  }
  const zs = admin ? a.zuschlag : null;
  if (zs) p.angaben([["Zuschlagsvorschlag", `${zs.lieferant || ""} (${zs.produktId})`], ["Begründung", zs.begruendung || "–"], ["Kundenfreigaben", Object.values(zs.kundenFreigaben || {}).filter((x) => x.entscheidung === "freigegeben").length + ` von ${a.kunden.length}`]]);
  if (!admin && daten.ausschreibung.vorschlag) {
    const v = daten.ausschreibung.vorschlag;
    p.ueberschrift("Vorschlag von ÖkoInvest");
    p.angaben([["Versorger", v.lieferant], ["Produkt", v.produkt], ["Normierter Preis", ct(v.ctKwh)], ["Kosten Energie", `${eur(v.eurJahr)} pro Jahr`], ["Bisheriger Energiepreis", ct(v.altCt)], ["Ersparnis (rechnerisch)", v.ersparnisEurJahr !== null ? `${eur(v.ersparnisEurJahr)} pro Jahr` : "–"], ["Bindefrist", datum(v.bindefristBis)], ["Begründung", v.begruendung || "–"]]);
  }
  p.absatz(RECHTSHINWEISE.privat, { groesse: 8 });
  return p.fertig();
}

/** Zuschlagsschreiben (an den Versorger bzw. zur Ablage im Backoffice) */
export function zuschlagPdf(daten) {
  const a = daten.ausschreibung;
  const admin = daten.rolle === "admin";
  const p = rahmen("Zuschlagsschreiben", `${admin ? a.titel : a.titel} · ${a.los || ""}`);
  const lf = admin ? a.zuschlag?.lieferant : daten.lieferant;
  const angebot = admin ? a.angebote?.find((g) => g.id === a.zuschlag?.angebotId) : a.eigeneAngebote?.find((g) => g.status === "zuschlag");
  const pos = angebot?.positionen?.find((x) => x.produktId === (admin ? a.zuschlag?.produktId : x.produktId));
  const produkt = a.produkte?.find((x) => x.id === pos?.produktId);
  p.absatz(`An: ${lf || "Versorger"}`, { fett: true });
  p.absatz(`Sehr geehrte Damen und Herren,\n\nwir bedanken uns für Ihr Angebot und teilen Ihnen mit, dass Sie für die oben genannte Angebotsanfrage den Zuschlag erhalten. Die Kunden haben den Zuschlag im Portal freigegeben.`);
  p.angaben([
    ["Produkt", produkt?.label || produkt?.art || "–"],
    ["Arbeitspreis / Aufschlag", pos?.arbeitspreisCt ? ct(pos.arbeitspreisCt) : pos?.aufschlagCt !== undefined ? `${ct(pos.aufschlagCt)} Aufschlag` : "–"],
    ["Grundpreis", pos ? `${(pos.grundpreisEurMonat ?? 0).toLocaleString("de-DE")} € je Monat` : "–"],
    ["Herkunftsnachweise", pos?.hknCt ? ct(pos.hknCt) : "–"],
    ["Lieferbeginn", a.lieferbeginn?.split("-").reverse().join("/")],
    ["Zahlungsziel", angebot ? `${angebot.zahlungszielTage} Tage` : "–"],
    ["Bindefrist des Angebots", datum(angebot?.bindefristBis)],
    ["Zuschlag am", datum(admin ? a.zuschlag?.am : new Date().toISOString())],
  ]);
  p.absatz("Die Kundendaten (Firmenname, Anschrift, Markt- bzw. Messlokations-ID/Zählpunkt) sowie die Unterlagen für die Anmeldung zum Lieferbeginn übermitteln wir Ihnen gesondert. Der Liefervertrag kommt mit dem Kunden zustande; bitte senden Sie die Vertragsunterlagen an ÖkoInvest zur Weiterleitung.");
  p.absatz(`${RECHTSHINWEISE.wechselDe} ${RECHTSHINWEISE.wechselAt}`, { groesse: 8 });
  p.absatz("Mit freundlichen Grüßen\nÖkoInvest GmbH, Ostermiething", { abstand: 4 });
  return p.fertig();
}

/** Beschaffungsvollmacht mit Nachweis der Erteilung */
export function vollmachtPdf(daten) {
  const vm = daten.vollmacht;
  const p = rahmen("Beschaffungsvollmacht", `Version ${daten.version}`);
  p.angaben([["Unternehmen", daten.kunde?.firma || "–"], ["Vertreten durch", daten.kunde?.name || "–"], ["E-Mail", daten.kunde?.email || "–"]]);
  p.absatz(daten.text, { groesse: 9.5 });
  p.ueberschrift("Nachweis");
  p.angaben(
    vm
      ? [["Status", vm.status === "erteilt" ? "erteilt" : "widerrufen"], ["Erteilt am", datum(vm.am)], ["IP-Adresse", vm.ip || "–"], ["Prüfsumme Text (SHA-256)", String(vm.textHash || "").slice(0, 32) + "…"], ...(vm.widerrufenAm ? [["Widerrufen am", datum(vm.widerrufenAm)]] : []), ...(vm.signaturId ? [["Elektronische Unterschrift", vm.signaturId]] : [])]
      : [["Status", "noch nicht erteilt"]]
  );
  p.absatz("Erteilt im Portal durch Bestätigung (Klick) des angemeldeten Kontos. Für eine zusätzliche einfache elektronische Signatur (EES) kann das Backoffice die Vollmacht über das Signatur-Modul zur Unterschrift senden.", { groesse: 8 });
  return p.fertig();
}
