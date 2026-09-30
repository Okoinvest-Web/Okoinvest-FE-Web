// src/lib/plattform/backend/demo/bo-seed.js
//
// Beispieldaten des Backoffice-Ausbaus (CRM, Gebiete, Vorlagen, Regeln, Unterrollen-Konten).
// ALLES FIKTIV: Namen mit „(Demo)“, Adressen unter example.com. Wird beim ersten Zugriff auf
// db.bo einmalig ausgeführt – die übrige Demo-Datenbank bleibt unverändert (nur Ergänzungen).

import { jetzt, neueId, vorTagen } from "./hilfen";
import { crmAusKonto, crmAusVorgang } from "./crm";

const tagPlus = (t) => new Date(Date.now() + t * 86400e3).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });

/** Zusätzliche Backoffice-Konten mit Unterrollen (Passwort wie alle Demo-Konten) */
export const BO_DEMO_KONTEN = [
  { email: "bo-akquise@example.com", vorname: "Anna", nachname: "Akquise (Demo)", rollen: ["akquise"] },
  { email: "bo-transaktion@example.com", vorname: "Tim", nachname: "Transaktion (Demo)", rollen: ["transaktion"] },
  { email: "bo-buchhaltung@example.com", vorname: "Berta", nachname: "Buchhaltung (Demo)", rollen: ["buchhaltung"] },
  { email: "bo-lesen@example.com", vorname: "Lena", nachname: "Leserin (Demo)", rollen: ["lesen"] },
];

const MAIL_AUS = { status: false, nachricht: false, nda: false, suchprofil: false, anfrage: false, aufgabe: false };

function kontenAnlegen(db) {
  const admin = db.nutzer.find((u) => u.email === "admin@example.com" && u.demo);
  if (!admin) return {};
  const ids = { admin: admin.id };
  for (const k of BO_DEMO_KONTEN) {
    let u = db.nutzer.find((x) => x.email === k.email);
    if (!u) {
      u = {
        id: neueId("U"),
        email: k.email,
        vorname: k.vorname,
        nachname: k.nachname,
        firma: "ÖkoInvest (Demo-Konto)",
        telefon: "",
        rollen: ["admin"],
        backofficeRollen: k.rollen,
        passwortHash: admin.passwortHash,
        sitzungVersion: 0,
        aktiv: true,
        emailBestaetigt: true,
        erstelltAm: vorTagen(60),
        letzterLogin: null,
        suchprofil: null,
        mailEinstellungen: MAIL_AUS,
        demo: true,
      };
      db.nutzer.push(u);
    }
    ids[k.rollen[0]] = u.id;
  }
  return ids;
}

export function boSeed(db) {
  const bo = db.bo;
  const ids = kontenAnlegen(db);
  const admin = ids.admin || db.nutzer.find((u) => u.rollen.includes("admin"))?.id || null;
  const akquise = ids.akquise || admin;

  // ------------------------------------------------ Gebiete
  bo.gebiete = [
    { id: neueId("GE"), name: "Oberbayern & Schwaben (PLZ 80–87)", land: "DE", bundeslaender: [], plz: ["80-87"], mitarbeiterId: akquise, aktiv: true },
    { id: neueId("GE"), name: "Bayern übrige", land: "DE", bundeslaender: ["Bayern"], plz: [], mitarbeiterId: admin, aktiv: true },
    { id: neueId("GE"), name: "Baden-Württemberg", land: "DE", bundeslaender: ["Baden-Württemberg"], plz: [], mitarbeiterId: akquise, aktiv: true },
    { id: neueId("GE"), name: "Ostdeutschland", land: "DE", bundeslaender: ["Brandenburg", "Berlin", "Sachsen", "Sachsen-Anhalt", "Thüringen", "Mecklenburg-Vorpommern"], plz: [], mitarbeiterId: admin, aktiv: true },
    { id: neueId("GE"), name: "Österreich", land: "AT", bundeslaender: [], plz: [], mitarbeiterId: akquise, aktiv: true },
    { id: neueId("GE"), name: "Schweiz", land: "CH", bundeslaender: [], plz: [], mitarbeiterId: admin, aktiv: true },
  ];

  // ------------------------------------------------ Organisationen
  const O = (x) => ({ id: neueId("KO"), strasse: "", website: "", telefon: "", email: "", tags: [], notiz: "", bundesland: "", erstelltAm: vorTagen(50), geaendertAm: vorTagen(5), ...x });
  const gemeinde = O({ name: "Gemeinde Demo-Ort (fiktiv)", art: "gemeinde", plz: "86825", ort: "Demo-Ort", land: "DE", bundesland: "Bayern", tags: ["B-Plan"], notiz: "Gemeinderat tagt monatlich; Aufstellungsbeschluss für Fläche Mühlweg in Vorbereitung. (Demo)" });
  const netz = O({ name: "Demo-Netz GmbH (fiktiv)", art: "netzbetreiber", plz: "86899", ort: "Musterstadt", land: "DE", bundesland: "Bayern", tags: ["Verteilnetz"] });
  const gutachter = O({ name: "Gutachterbüro Beispiel (fiktiv)", art: "gutachter", plz: "80331", ort: "München", land: "DE", bundesland: "Bayern", tags: ["Blendgutachten", "Artenschutz"] });
  const bank = O({ name: "Demo-Regionalbank eG (fiktiv)", art: "bank", plz: "86150", ort: "Augsburg", land: "DE", bundesland: "Bayern", tags: ["Projektfinanzierung"] });
  const markt = O({ name: "Marktgemeinde Demo-Gemeinde (fiktiv)", art: "gemeinde", plz: "5120", ort: "Demo-Gemeinde", land: "AT", bundesland: "Oberösterreich", tags: ["Widmung PV"] });
  bo.organisationen = [gemeinde, netz, gutachter, bank, markt];

  // ------------------------------------------------ Kontakte: Leads aus allen Vorgängen, Portal-Konten, Ansprechpartner
  for (const vg of [...db.vorgaenge].sort((a, b) => String(a.erstelltAm).localeCompare(String(b.erstelltAm)))) {
    const k = crmAusVorgang(db, vg);
    if (k) {
      k.erstelltAm = vg.erstelltAm;
      k.zustaendigId = vg.zustaendigId || null;
    }
  }
  bo.aktivitaeten = bo.aktivitaeten.map((a) => {
    const vg = db.vorgaenge.find((x) => x.id === a.bezugId);
    return vg ? { ...a, am: vg.erstelltAm, erstelltAm: vg.erstelltAm } : a;
  });
  for (const u of db.nutzer) crmAusKonto(db, u);
  const K = (x) => ({ id: neueId("K"), anrede: "", titel: "", firma: "", funktion: "", telefon: "", email: "", plz: "", ort: "", land: "DE", rollen: [], tags: [], notiz: "", zustaendigId: admin, nutzerId: null, quelle: "manuell", herkunft: "", bezuege: [], erstelltAm: vorTagen(40), geaendertAm: vorTagen(3), ...x });
  const flaecheMuehlweg = db.flaechen.find((f) => /Mühlweg/.test(f.bezeichnung));
  const buergermeisterin = K({ anrede: "Frau", vorname: "Hanna", nachname: "Beispiel (Demo)", funktion: "Erste Bürgermeisterin", email: "rathaus-demo-ort@example.com", telefon: "+49 000 000 100", plz: "86825", ort: "Demo-Ort", organisationId: gemeinde.id, rollen: ["gemeinde"], tags: ["Entscheider"], bezuege: flaecheMuehlweg ? [{ art: "flaeche", id: flaecheMuehlweg.id, rolle: "Gemeinde", am: vorTagen(20) }] : [] });
  const netzplaner = K({ anrede: "Herr", vorname: "Stefan", nachname: "Muster (Demo)", funktion: "Netzplanung Mittelspannung", email: "netzplanung@example.com", telefon: "+49 000 000 200", plz: "86899", ort: "Musterstadt", organisationId: netz.id, rollen: ["netzbetreiber"], bezuege: flaecheMuehlweg ? [{ art: "flaeche", id: flaecheMuehlweg.id, rolle: "Netzbetreiber", am: vorTagen(15) }] : [] });
  const gutachterin = K({ anrede: "Frau", titel: "Dr.", vorname: "Greta", nachname: "Gutachter (Demo)", funktion: "Landschaftsplanung", email: "gutachten@example.com", plz: "80331", ort: "München", organisationId: gutachter.id, rollen: ["gutachter"], tags: ["Artenschutz"] });
  const bankberater = K({ anrede: "Herr", vorname: "Bernd", nachname: "Bank (Demo)", funktion: "Firmenkunden Erneuerbare", email: "finanzierung@example.com", telefon: "+49 000 000 300", plz: "86150", ort: "Augsburg", organisationId: bank.id, rollen: ["bank"] });
  const amtsleiter = K({ anrede: "Herr", vorname: "Alois", nachname: "Amtmann (Demo)", funktion: "Amtsleiter", email: "gemeindeamt-demo@example.com", plz: "5120", ort: "Demo-Gemeinde", land: "AT", organisationId: markt.id, rollen: ["gemeinde"], zustaendigId: akquise });
  // bewusste Dublette (Demo): gleiche Person wie das Portal-Konto flaeche@example.com, andere Adresse, gleiche PLZ
  const erika = db.nutzer.find((u) => u.email === "flaeche@example.com");
  const dublette = K({ anrede: "Frau", vorname: "Erika", nachname: "Musterfrau (Demo)", email: "erika.musterfrau@example.com", telefon: "+49 000 000 400", plz: "86825", ort: "Demo-Ort", rollen: ["eigentuemer"], notiz: "Auf der Messe erfasst (Demo) – Dublette zum Portal-Konto?", quelle: "manuell", erstelltAm: vorTagen(8) });
  bo.kontakte.push(buergermeisterin, netzplaner, gutachterin, bankberater, amtsleiter, dublette);
  const erikaKontakt = erika ? bo.kontakte.find((k) => k.nutzerId === erika.id) : null;
  if (erikaKontakt) erikaKontakt.plz = erikaKontakt.plz || "86825";

  // ------------------------------------------------ Aktivitäten
  const A = (x) => ({ id: neueId("KA"), organisationId: null, text: "", bezugArt: null, bezugId: null, vonId: admin, system: false, aufgabeId: null, wiedervorlageAm: null, dauerMin: null, ergebnis: "", erstelltAm: x.am, ...x });
  const wv = { id: neueId("AF"), titel: "Wiedervorlage: Termin Gemeinderat abstimmen (Hanna Beispiel (Demo))", beschreibung: `Anruf vom ${new Date(Date.now() - 2 * 86400e3).toLocaleDateString("de-DE")}: Gemeinderat im nächsten Monat, Unterlagen vorab.\nCRM: /portal/admin/crm/${buergermeisterin.id}`, faelligAm: tagPlus(3), zustaendigId: admin, bezugArt: flaecheMuehlweg ? "flaeche" : null, bezugId: flaecheMuehlweg?.id || null, status: "offen", erstelltVon: admin, erstelltAm: vorTagen(2), erledigtAm: null, erledigtVon: null, erinnertAm: null, crmKontaktId: buergermeisterin.id };
  db.aufgaben.push(wv);
  bo.aktivitaeten.push(
    A({ kontaktId: buergermeisterin.id, organisationId: gemeinde.id, typ: "anruf", betreff: "Termin Gemeinderat abstimmen", text: "Gemeinderat im nächsten Monat, Unterlagen (Lageplan, Visualisierung) vorab senden. (Demo)", am: vorTagen(2), dauerMin: 15, ergebnis: "Termin in Aussicht", bezugArt: flaecheMuehlweg ? "flaeche" : null, bezugId: flaecheMuehlweg?.id || null, aufgabeId: wv.id, wiedervorlageAm: wv.faelligAm }),
    A({ kontaktId: netzplaner.id, organisationId: netz.id, typ: "email", betreff: "Netzanschlussanfrage 16 MVA eingereicht", text: "Antwort in 8 Wochen zugesagt. (Demo)", am: vorTagen(12), bezugArt: flaecheMuehlweg ? "flaeche" : null, bezugId: flaecheMuehlweg?.id || null }),
    A({ kontaktId: gutachterin.id, organisationId: gutachter.id, typ: "termin", betreff: "Begehung Artenschutz (Feldlerche)", text: "Kartierung März–Juni nötig. (Demo)", am: vorTagen(20), dauerMin: 90 }),
    A({ kontaktId: bankberater.id, organisationId: bank.id, typ: "notiz", betreff: "Rahmen für Zwischenfinanzierung", text: "Bis 5 Mio. € für baureife Projekte denkbar, Due-Diligence-Checkliste angefordert. (Demo)", am: vorTagen(9) }),
    A({ kontaktId: amtsleiter.id, organisationId: markt.id, typ: "anruf", betreff: "Widmung Grünland-Photovoltaik", text: "Gemeinde prüft Umwidmung, Landes-Zonierung abwarten. (Demo)", am: vorTagen(5), vonId: akquise }),
  );

  // ------------------------------------------------ Vorlagen
  const VL = (name, kanal, versionen) => ({ id: neueId("VL"), name, kanal, aktiv: true, version: versionen.length, versionen: versionen.map((x, i) => ({ version: i + 1, am: vorTagen(30 - i * 10), vonId: admin, kommentar: i ? "Überarbeitet" : "Erste Fassung", ...x })), erstelltAm: vorTagen(30) });
  const vEingang = VL("Eingangsbestätigung Fläche", "email", [
    { betreff: "Ihre Fläche – Eingangsbestätigung", text: "{{briefanrede}},\n\nvielen Dank für Ihre Anfrage. Wir melden uns in Kürze.\n\nFreundliche Grüße\n{{zustaendig.name}}" },
    { betreff: "Ihre Fläche in {{flaeche.ort}} – Eingangsbestätigung ({{vorgang.id}})", text: "{{briefanrede}},\n\nvielen Dank für Ihre Anfrage zu Ihrer Fläche „{{flaeche.bezeichnung}}“ ({{flaeche.ha}} ha). Wir prüfen Lage, Schutzgebiete, Netzanschluss und Planungsrecht zunächst am Kartentisch – kostenfrei und unverbindlich.\n\nIhr Ansprechpartner meldet sich innerhalb von zwei Werktagen telefonisch bei Ihnen. Den Stand sehen Sie jederzeit im Portal: {{portal.link}}\n\nFreundliche Grüße\n{{zustaendig.name}}\nÖkoInvest GmbH" },
  ]);
  const vErstkontakt = VL("Erstkontakt Flächeneigentümer", "email", [
    { betreff: "Rückruf zu Ihrer Fläche in {{flaeche.ort}}", text: "{{briefanrede}},\n\nwir haben Sie leider telefonisch nicht erreicht. Gern besprechen wir die nächsten Schritte für Ihre Fläche „{{flaeche.bezeichnung}}“ – nennen Sie uns im Portal einfach einen passenden Termin: {{portal.link}}\n\nFreundliche Grüße\n{{zustaendig.name}}" },
  ]);
  const vKommune = VL("Kommune – Informationspaket", "email", [
    { betreff: "Solarpark und Bürgerbeteiligung – Informationen für {{firma}}", text: "{{briefanrede}},\n\nvielen Dank für Ihr Interesse. Gern stellen wir Ihnen vor, wie Freiflächen-PV, Agri-PV oder Solarcarports in Ihrer Gemeinde umgesetzt werden können – mit Kommunalbeteiligung und Bürgerenergie.\n\nWir schlagen ein kurzes Gespräch mit Bürgermeisterin bzw. Bürgermeister und Bauamt vor. Ihr Ansprechpartner: {{zustaendig.name}}.\n\nFreundliche Grüße\nÖkoInvest GmbH" },
  ]);
  const vDatenraum = VL("Hinweis Datenraum aktualisiert", "nachricht", [
    { betreff: "", text: "{{briefanrede}},\n\nim Datenraum zu „{{projekt.titel}}“ ({{projekt.mwp}} MWp, {{projekt.phase}}) liegen neue Unterlagen. Bei Fragen melden Sie sich gern hier im Portal.\n\nIhr ÖkoInvest-Backoffice" },
  ]);
  const vSla = VL("Intern: Erstkontakt überfällig", "email", [
    { betreff: "SLA: Erstkontakt überfällig – {{flaeche.bezeichnung}}", text: "Hallo {{zustaendig.vorname}},\n\nfür die Fläche „{{flaeche.bezeichnung}}“ ({{flaeche.ha}} ha, Score {{flaeche.score}}) von {{vorname}} {{nachname}} ist der Erstkontakt seit mehr als zwei Werktagen offen. Bitte heute anrufen oder eine E-Mail senden.\n\nAutomatische Nachricht aus dem Backoffice" },
  ]);
  bo.vorlagen = [vEingang, vErstkontakt, vKommune, vDatenraum, vSla];

  // ------------------------------------------------ Regeln
  const R = (x) => ({ id: neueId("R"), beschreibung: "", erstelltVon: admin, erstelltAm: vorTagen(25), geaendertAm: vorTagen(25), zaehler: { ausgefuehrt: 0, zuletzt: null }, ...x });
  bo.regeln = [
    R({ name: "Großfläche priorisieren und nach Gebiet zuweisen", aktiv: true, beschreibung: "Flächen ab 20 ha sofort in Priorität A, zuständig nach Gebiet, Standortanalyse vorbereiten.", ausloeser: { typ: "vorgang_neu", art: "vorgang" }, bedingungen: [{ feld: "typ", op: "in", wert: ["flaeche", "agri"] }, { feld: "ha", op: "min", wert: 20 }], aktionen: [{ typ: "prioritaet", wert: "A" }, { typ: "zustaendig", mitarbeiterId: "gebiet" }, { typ: "tag", tag: "Großfläche" }, { typ: "aufgabe", titel: "Erstkontakt Großfläche {{flaeche.ha}} ha ({{nachname}})", faelligInTagen: 1, zustaendig: "zustaendig", beschreibung: "Score {{flaeche.score}} – Flurstücke erfragen, Netzanfrage vorbereiten." }] }),
    R({ name: "Kommunale Anfrage: Informationspaket", aktiv: true, beschreibung: "Kommunen erhalten sofort das Informationspaket; Rückruf in zwei Tagen.", ausloeser: { typ: "vorgang_neu", art: "vorgang" }, bedingungen: [{ feld: "typ", op: "gleich", wert: "kommune" }], aktionen: [{ typ: "mail", vorlageId: vKommune.id, an: "kontakt" }, { typ: "tag", tag: "Kommune" }, { typ: "aufgabe", titel: "Gemeinde anrufen: Gesprächstermin ({{firma}})", faelligInTagen: 2, zustaendig: "gebiet" }] }),
    R({ name: "Top-Treffer Suchprofil: Investor anrufen", aktiv: true, beschreibung: "Passung ab 90 % – persönlich nachfassen.", ausloeser: { typ: "suchprofil", art: "projekt" }, bedingungen: [{ feld: "score", op: "min", wert: 90 }], aktionen: [{ typ: "aufgabe", titel: "Investor zu Top-Treffer anrufen: {{projekt.titel}}", faelligInTagen: 1, zustaendig: "zustaendig" }] }),
    R({ name: "Datenraum-Upload markieren", aktiv: true, ausloeser: { typ: "dokument", art: "projekt" }, bedingungen: [{ feld: "kategorie", op: "gleich", wert: "datenraum" }], aktionen: [{ typ: "tag", tag: "Datenraum aktualisiert" }] }),
    R({ name: "SLA Erstkontakt verletzt: eskalieren", aktiv: false, beschreibung: "Aktivieren, sobald alle Gebiete besetzt sind (prüft beim Öffnen der Akquise und täglich).", ausloeser: { typ: "frist", frist: "sla_erstkontakt", art: "flaeche" }, bedingungen: [], aktionen: [{ typ: "tag", tag: "SLA verletzt" }, { typ: "mail", vorlageId: vSla.id, an: "zustaendig" }, { typ: "prioritaet", wert: "A" }] }),
    R({ name: "Qualifizierte Anfrage: Angebot vorbereiten", aktiv: false, ausloeser: { typ: "status", art: "vorgang", nach: "qualifiziert" }, bedingungen: [], aktionen: [{ typ: "aufgabe", titel: "Angebot / Gespräch vorbereiten ({{vorgang.typ}})", faelligInTagen: 3, zustaendig: "zustaendig" }] }),
    R({ name: "Eingangsbestätigung für Flächen", aktiv: false, beschreibung: "Bestätigung mit Vorlage „Eingangsbestätigung Fläche“ an den Anfragenden.", ausloeser: { typ: "vorgang_neu", art: "vorgang" }, bedingungen: [{ feld: "typ", op: "in", wert: ["flaeche", "agri"] }], aktionen: [{ typ: "mail", vorlageId: vEingang.id, an: "kontakt" }] }),
  ];
  bo.gesaetAm = jetzt();
}
