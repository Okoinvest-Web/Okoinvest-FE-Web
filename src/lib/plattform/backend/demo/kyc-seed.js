// src/lib/plattform/backend/demo/kyc-seed.js
//
// Demo-Daten „KYC/KYB“ – ALLES FIKTIV (Namen mit „(Demo)“, Unterlagen sind Platzhalter-PDFs ohne echte Ausweisdaten).
// Wird beim ersten Zugriff auf db.kyc einmalig ergänzt (backend/demo/kyc.js → lesenBereit); übrige Daten unverändert.
//
//  - Backoffice-Konten bo-compliance@example.com und bo-compliance2@example.com (Unterrolle „Compliance“, Vier-Augen)
//  - investor@example.com: KYB verifiziert (Demo Capital GmbH, Risiko mittel)
//  - anbieter@example.com: KYB verifiziert (Muster Projektentwicklung GmbH)
//  - flaeche@example.com: KYC eingereicht (Privatperson, IBAN, Eigentumsnachweis) – wartet in der Warteschlange
//  - landwirt@example.com: Unterlagen nachgefordert (Rückseite des Ausweises fehlt)
//  - mitglied@example.com: in Prüfung mit möglichem Sanktionstreffer (fiktive Testliste) und PEP-Angabe → Risiko hoch
//  - unternehmen@example.com: noch nicht begonnen
// Freigabe-Sperren im Entwicklungsbetrieb nur für Pilot-Konten: flaeche@ und landwirt@ (Auszahlung vorführbar).

import { jetzt, neueId, sha256, vorTagen } from "./hilfen";
import { kycVerschluesseln } from "../../server/kycKrypto";
import { kycRisiko, monateSpaeter, heuteIso } from "../../kyc";

const MAIL_AUS = { status: false, nachricht: false, nda: false, suchprofil: false, anfrage: false, aufgabe: false, stoerung: false };
const inTagen = (t) => new Date(Date.now() + t * 86400e3).toISOString().slice(0, 10);

function platzhalterPdf(titel) {
  const inhalt = `BT /F1 14 Tf 50 780 Td (${titel.replace(/[()\\]/g, "")}) Tj 0 -24 Td /F1 10 Tf (Fiktive Demo-Unterlage - keine echten Daten) Tj ET`;
  const obj = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${inhalt.length} >>\nstream\n${inhalt}\nendstream`,
  ];
  let s = "%PDF-1.4\n";
  const off = [];
  obj.forEach((o, i) => {
    off.push(s.length);
    s += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const x = s.length;
  s += `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n${off.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${obj.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(s, "latin1");
}

function konto(db, email, { vorname, nachname, rolle }) {
  let u = db.nutzer.find((x) => x.email === email);
  const admin = db.nutzer.find((x) => x.email === "admin@example.com");
  if (u || !admin) return u || null;
  u = {
    id: neueId("U"), email, vorname, nachname, firma: "ÖkoInvest (Demo-Konto)", telefon: "", rollen: ["admin"], backofficeRollen: [rolle],
    passwortHash: admin.passwortHash, sitzungVersion: 0, aktiv: true, emailBestaetigt: true, erstelltAm: vorTagen(30), letzterLogin: null,
    suchprofil: null, mailEinstellungen: MAIL_AUS, demo: true,
  };
  db.nutzer.push(u);
  return u;
}

export async function kycSeed(db, { dateiSchreiben, abgleichen }) {
  const c1 = konto(db, "bo-compliance@example.com", { vorname: "Carla", nachname: "Compliance (Demo)", rolle: "compliance" });
  const c2 = konto(db, "bo-compliance2@example.com", { vorname: "Conrad", nachname: "Zweitprüfer (Demo)", rolle: "compliance" });
  const u = (email) => db.nutzer.find((x) => x.email === email) || null;
  const e = db.kyc.einstellungen;

  const dok = (f, art, extra = {}, status = "ok") => {
    const id = neueId("KD");
    const daten = platzhalterPdf(`${art} - ${f.id} (Demo)`);
    const datei = `${id}-${sha256(`${id}${Math.random()}`).slice(0, 16)}.bin`;
    dateiSchreiben(datei, kycVerschluesseln(daten, id));
    const d = { id, fallId: f.id, kontoId: f.kontoId, art, flaecheId: null, personId: null, ausgestelltAm: null, name: `${art}-demo.pdf`, mime: "application/pdf", groesse: daten.length, sha256: sha256(daten), datei, am: vorTagen(8), hochgeladenVon: f.kontoId, status, pruefung: status === "ok" ? { punkte: {}, notiz: "", vonId: c1?.id || null, am: vorTagen(5) } : null, geloescht: false, ...extra };
    db.kyc.dokumente.push(d);
    return d;
  };
  const fall = (kontoId, basis) => {
    const f = { id: neueId("KY"), kontoId, organisationId: null, verlauf: [], erstelltAm: vorTagen(14), geaendertAm: vorTagen(2), ...basis };
    db.kyc.faelle.push(f);
    return f;
  };
  const vl = (status, tage, kommentar, rolle = "compliance", oeffentlich = true) => ({ status, am: vorTagen(tage), vonId: null, rolle, kommentar, oeffentlich });
  const person = (vorname, nachname, geb, ort, land = "DE", art = "personalausweis") => ({
    vorname, nachname, geburtsdatum: geb, geburtsort: ort, staatsangehoerigkeit: land,
    adresse: { strasse: "Musterweg 1 (Demo)", plz: land === "AT" ? "5121" : "86842", ort: `${ort} (Demo)`, land },
    ausweis: { art, nummer: "L01X00T47", behoerde: `Stadt ${ort} (Demo)`, gueltigBis: inTagen(900) },
  });

  // Investor: KYB verifiziert
  const inv = u("investor@example.com");
  if (inv) {
    const org = (db.organisationen || []).find((o) => /Demo Capital/.test(o.name));
    const f = fall(inv.id, {
      kontotyp: "unternehmen", organisationId: org?.id || null, status: "verifiziert",
      person: person("Clara", "Probe (Demo)", "1979-03-14", "Augsburg"),
      firma: { name: "Demo Capital GmbH (fiktiv)", rechtsform: "GmbH", registernummer: "HRB 00000 (Demo)", registergericht: "Amtsgericht Augsburg (Demo)", land: "DE", sitz: "Augsburg (Demo)", mehrstufig: false, treuhand: false },
      einreicherVertretungsberechtigt: true,
      ubos: [{ id: "wb-inv-1", vorname: "Clara", nachname: "Probe (Demo)", geburtsdatum: "1979-03-14", staatsangehoerigkeit: "DE", wohnsitzland: "DE", anteil: 60, kontrolleArt: "anteil", pep: false }],
      vertreter: [{ id: "vt-inv-1", vorname: "Clara", nachname: "Probe (Demo)", geburtsdatum: "1979-03-14", funktion: "Geschäftsführerin", istEinreicher: true }],
      pep: { istPep: false, naheStehend: false, funktion: "", angaben: "" },
      mittelherkunft: { ticket: "bis5m", quellen: ["eigenkapital", "fonds"], text: "Eigenkapital der Gesellschaft und Mittel eines Demo-Fonds (fiktiv)." },
      steuer: { land: "DE", steuerId: "" },
      eingereichtAm: vorTagen(12), verifiziertAm: vorTagen(9), naechstePruefung: monateSpaeter(heuteIso(), 23),
      verlauf: [vl("offen", 14, "Verifizierung begonnen.", "nutzer"), vl("eingereicht", 12, "Zur Prüfung eingereicht.", "nutzer"), vl("in_pruefung", 11, "Prüfung begonnen."), vl("verifiziert", 9, "Verifizierung abgeschlossen.")],
      pruefung: { erstPrueferId: c1?.id || null, erstAm: vorTagen(9) }, entscheidung: { ergebnis: "verifiziert", grund: "", vonId: c1?.id || null, am: vorTagen(9) },
    });
    for (const a of ["ausweis_vorne", "ausweis_hinten", "registerauszug", "transparenzregister", "mittelherkunft"]) dok(f, a, a === "registerauszug" ? { ausgestelltAm: inTagen(-20) } : {});
    abgleichen(f);
    f.risiko = { ...kycRisiko(f, e), manuell: false };
  }

  // Anbieter: KYB verifiziert
  const anb = u("anbieter@example.com");
  if (anb) {
    const org = (db.organisationen || []).find((o) => /Muster Projektentwicklung/.test(o.name));
    const f = fall(anb.id, {
      kontotyp: "unternehmen", organisationId: org?.id || null, status: "verifiziert",
      person: person("Paul", "Platzhalter (Demo)", "1983-07-02", "Ulm"),
      firma: { name: "Muster Projektentwicklung GmbH (fiktiv)", rechtsform: "GmbH", registernummer: "HRB 11111 (Demo)", registergericht: "Amtsgericht Ulm (Demo)", land: "DE", sitz: "Ulm (Demo)" },
      einreicherVertretungsberechtigt: true,
      ubos: [{ id: "wb-anb-1", vorname: "Paul", nachname: "Platzhalter (Demo)", geburtsdatum: "1983-07-02", staatsangehoerigkeit: "DE", wohnsitzland: "DE", anteil: 100, kontrolleArt: "anteil", pep: false }],
      vertreter: [{ id: "vt-anb-1", vorname: "Paul", nachname: "Platzhalter (Demo)", geburtsdatum: "1983-07-02", funktion: "Geschäftsführer", istEinreicher: true }],
      pep: { istPep: false, naheStehend: false }, steuer: { land: "DE" },
      eingereichtAm: vorTagen(20), verifiziertAm: vorTagen(18), naechstePruefung: monateSpaeter(heuteIso(), 35),
      verlauf: [vl("eingereicht", 20, "Zur Prüfung eingereicht.", "nutzer"), vl("verifiziert", 18, "Verifizierung abgeschlossen.")],
    });
    for (const a of ["ausweis_vorne", "ausweis_hinten", "registerauszug", "transparenzregister"]) dok(f, a, a === "registerauszug" ? { ausgestelltAm: inTagen(-30) } : {});
    abgleichen(f);
    f.risiko = { ...kycRisiko(f, e), manuell: false };
  }

  // Flächeneigentümerin: eingereicht, wartet
  const fl = u("flaeche@example.com");
  if (fl) {
    const fla = (db.flaechen || []).find((x) => x.nutzerId === fl.id);
    const f = fall(fl.id, {
      kontotyp: "privat", status: "eingereicht", person: person("Erika", "Musterfrau (Demo)", "1961-11-23", "Nördlingen"),
      pep: { istPep: false, naheStehend: false }, steuer: { land: "DE" },
      bank: { iban: "DE89370400440532013000", bic: "", kontoinhaber: "Erika Musterfrau", ibanOk: true, geprueft: false, inhaberPasst: true },
      eingereichtAm: vorTagen(1), verlauf: [vl("offen", 3, "Verifizierung begonnen.", "nutzer"), vl("eingereicht", 1, "Zur Prüfung eingereicht.", "nutzer")],
    });
    for (const a of ["ausweis_vorne", "ausweis_hinten"]) dok(f, a, {}, "neu");
    if (fla) dok(f, "eigentumsnachweis", { flaecheId: fla.id }, "neu");
    abgleichen(f);
    f.risiko = { ...kycRisiko(f, e), manuell: false };
    e.pilotKonten = [...new Set([...(e.pilotKonten || []), fl.id])];
  }

  // Landwirt: nachgefordert
  const lw = u("landwirt@example.com");
  if (lw) {
    const f = fall(lw.id, {
      kontotyp: "privat", status: "nachgefordert", person: person("Josef", "Beispiel (Demo)", "1972-05-30", "Ried im Innkreis", "AT"),
      pep: { istPep: false, naheStehend: false },
      bank: { iban: "AT611904300234573201", kontoinhaber: "Josef Beispiel", ibanOk: true, geprueft: false },
      nachforderung: "Bitte laden Sie die Rückseite Ihres Personalausweises hoch – die Vorderseite allein genügt nicht.",
      eingereichtAm: vorTagen(6),
      verlauf: [vl("eingereicht", 6, "Zur Prüfung eingereicht.", "nutzer"), vl("in_pruefung", 5, "Prüfung begonnen."), vl("nachgefordert", 4, "Bitte laden Sie die Rückseite Ihres Personalausweises hoch – die Vorderseite allein genügt nicht.")],
    });
    dok(f, "ausweis_vorne");
    abgleichen(f);
    f.risiko = { ...kycRisiko(f, e), manuell: false };
    e.pilotKonten = [...new Set([...(e.pilotKonten || []), lw.id])];
  }

  // Mitglied: in Prüfung mit möglichem Treffer (fiktive Liste) + PEP-Angabe
  const mg = u("mitglied@example.com");
  if (mg) {
    const f = fall(mg.id, {
      kontotyp: "privat", status: "in_pruefung", bearbeiterId: c1?.id || null, person: { ...person("Viktor", "Fiktivow", "1961-04-12", "Linz", "AT") },
      pep: { istPep: false, naheStehend: true, funktion: "Bruder eines Mitglieds eines nationalen Parlaments (fiktiv)", angaben: "" },
      eingereichtAm: vorTagen(2), verlauf: [vl("eingereicht", 2, "Zur Prüfung eingereicht.", "nutzer"), vl("in_pruefung", 1, "Prüfung begonnen.")],
    });
    dok(f, "pass_datenseite", {}, "neu");
    f.person.ausweis.art = "reisepass";
    abgleichen(f);
    f.risiko = { ...kycRisiko(f, e), manuell: false };
  }
  db.kyc.seedAm = jetzt();
  return { compliance: [c1?.id, c2?.id] };
}
