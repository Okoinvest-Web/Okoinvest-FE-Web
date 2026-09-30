// src/lib/plattform/backend/demo/flaecheFach.js
//
// Demo-Backend „Fachprüfung Flächen & Kommunen“ (Team A):
//  - fachDemoBereit(): ergänzt EINMALIG die Demo-Flächen um realistische Fachangaben (Flurstücke mit
//    Katasterfläche, Boden, Lasten, Agri-PV-Konzept) und ein vollständiges Pachtangebot, legt das
//    Demo-Konto kommune@example.com mit geprüftem kommunalem Anliegen an. Kein Neuaufbau der Datenbank.
//  - kommuneUebersicht(n, { vorgangId }): Gemeinde-Sicht (Rechte: eigenes kommunales Anliegen;
//    Projekte nur bei geprüftem Anliegen, nur ab Planungsphase, nur vereinfacht). Backoffice: je Anliegen.
// Alle Daten fiktiv.

import { aendern, lesen } from "./speicher";
import { neueId, vorTagen } from "./hilfen";
import { PlattformFehler, nichtGefunden, verboten } from "../../fehler";
import * as v from "../../validierung";
import { KOMMUNE_GEPRUEFT, KOMMUNE_SICHTBAR, flaecheImGebiet, projektFuerGemeinde } from "../../kommune";
import { pachtangebotBereinigen } from "../../flaecheFach";
import { VORGANG_TYPEN } from "../../konstanten";

const VERSION = 1;

function demoErgaenzen(db) {
  const admin = db.nutzer.find((u) => u.email === "admin@example.com");
  const eigentuemer = db.nutzer.find((u) => u.email === "flaeche@example.com");
  if (!admin || !eigentuemer) return;
  const finde = (teil) => db.flaechen.find((f) => f.demo !== false && String(f.bezeichnung || "").includes(teil));

  // Acker am Mühlweg (Bayern – dort gibt es keine Fluren): Katasterflächen, Grundbuch, Lasten, vollständiges Angebot
  const f1 = finde("Acker am Mühlweg");
  if (f1 && !f1.fach) {
    f1.flurstuecke = [
      { gemarkung: "Musterfeld", gemarkungNr: "", flur: "", nummer: "211", grundbuch: "Musterfeld", blatt: "1234", m2: 92100 },
      { gemarkung: "Musterfeld", gemarkungNr: "", flur: "", nummer: "212", grundbuch: "Musterfeld", blatt: "1234", m2: 93400 },
    ];
    f1.fach = {
      boden: { ackerzahl: 38, quelle: "Katasterauszug (Demo)" },
      bewirtschaftung: { art: "verpachtet", paechter: "Nachbarbetrieb (Demo)", pachtEnde: "2027-10" },
      foerderung: { gap: "ja", aukm: "nein" },
      schutz: { natura2000: "nein", nsg: "nein", lsg: "nein", wsg: "nein", ueberschwemmung: "nein", denkmal: "unbekannt" },
      lage: { hangneigung: 2, exposition: "s", zufahrt: "oeffentlich", waldAngrenzend: "nein", leitungen: "ja", leitungenText: "20-kV-Freileitung am Nordrand (Demo)", netzKm: 2.1 },
      eigentum: { vertretung: "selbst", belastungen: ["grundschuld", "leitungsrecht"], lastenBekannt: "ja", glaeubiger: "Demo-Bank (fiktiv)" },
    };
    if (f1.pachtangebot) {
      f1.pachtangebot = pachtangebotBereinigen(
        {
          ...f1.pachtangebot,
          modell: "fest",
          indexierung: "vpi",
          reservierungProHaJahr: 200,
          laufzeitBeginn: "inbetriebnahme",
          verlaengerungJahre: 10,
          optionsfristJahre: 5,
          vorlaufJahre: 3,
          bewirtschaftung: "mitEntschaedigung",
          nichtbau: "rueckgabe",
          kuendigung: "befristet",
          rueckbau: "buergschaft",
          rueckbauAb: "baubeginn",
          rueckbauEuro: 450000,
          dienstbarkeit: "sofortLoeschung",
          rangruecktritt: true,
          nebenflaechen: "teilweise",
          nebenflaechenText: "Kabeltrasse 2,1 km über Wirtschaftswege, Zuwegung über Flst. 211 (Demo)",
          anwalt: "gedeckelt",
          anwaltEuro: 2500,
          gueltigBis: vorTagen(-27).slice(0, 10),
        },
        { am: f1.pachtangebot.am }
      );
    }
  }

  const f2 = finde("Wiese Hinterfeld");
  if (f2 && !f2.fach) f2.fach = { lage: { hangneigung: 9, exposition: "sw", zufahrt: "privatweg" }, schutz: { lsg: "unbekannt" }, bewirtschaftung: { art: "selbst" } };

  // Agri-PV in Oberösterreich: KG-Nummer, Einlagezahl, ÖPUL-Bindung, Bewirtschaftungskonzept
  const f3 = finde("Agri-PV Schlag Nord");
  if (f3 && !f3.fach) {
    f3.flurstuecke = [{ gemarkung: "Demo-KG", gemarkungNr: "46123", nummer: "1234/5", blatt: "87", m2: 98000 }];
    f3.fach = {
      boden: { bodenklimazahl: 47 },
      bewirtschaftung: { art: "selbst" },
      foerderung: { gap: "ja", aukm: "ja", aukmArt: "ÖPUL – Umweltgerechte und biodiversitätsfördernde Bewirtschaftung (Demo)", aukmEnde: 2027 },
      lage: { hangneigung: 3, exposition: "eben", zufahrt: "oeffentlich" },
      agri: { kategorie: "2", system: "vertikal", kultur: "getreide", arbeitsbreiteM: 9, durchfahrtshoeheM: 4, gassenbreiteM: 12, referenzertrag: 72, referenzEinheit: "dt", referenzQuelle: "eigen", nachweis66: "geplant", gapWeiter: "ja" },
      eigentum: { vertretung: "selbst", lastenBekannt: "ja" },
    };
  }

  // Kommune: Demo-Konto mit geprüftem Anliegen der „Demo-Stadt“ (dort liegt die Konversionsfläche in Planung)
  if (!db.nutzer.some((u) => u.email === "kommune@example.com")) {
    const u = {
      id: neueId("U"),
      email: "kommune@example.com",
      vorname: "Greta",
      nachname: "Gemeinde (Demo)",
      firma: "Stadt Demo-Stadt (fiktiv)",
      telefon: "",
      rollen: ["kommune"], // Onboarding B1: eigene Rolle Kommune (vorher „unternehmen“)
      passwortHash: eigentuemer.passwortHash,
      sitzungVersion: 0,
      aktiv: true,
      emailBestaetigt: true,
      erstelltAm: vorTagen(40),
      letzterLogin: null,
      suchprofil: null,
      demo: true,
    };
    db.nutzer.push(u);
    const kontakt = { vorname: u.vorname, nachname: u.nachname, email: u.email, firma: u.firma, plz: "04416", ort: "Demo-Stadt", land: "DE" };
    db.vorgaenge.push({
      id: neueId("V"),
      typ: "kommune",
      status: "qualifiziert",
      statusVerlauf: [
        { status: "eingegangen", am: vorTagen(38), vonId: u.id, vonRolle: "eigentuemer", kommentar: "" },
        { status: "in_pruefung", am: vorTagen(37), vonId: admin.id, vonRolle: "admin", kommentar: "" },
        { status: "qualifiziert", am: vorTagen(30), vonId: admin.id, vonRolle: "admin", kommentar: "Gemeinde bestätigt (Rückruf über die Zentrale der Stadtverwaltung). Gemeinde-Sicht freigeschaltet." },
      ],
      nutzerId: u.id,
      email: u.email,
      kontakt,
      daten: { absender: "gemeinde", gemeinde: "Demo-Stadt", gemeindeSchluessel: "", rolle: "bauamt", gemeindeFlaechenHa: 12, interesse6: "ja", buergerbeteiligung: ["genossenschaft"], bauleitplanung: "aufstellung", kriterienkatalog: "ja", themen: ["solarpark", "beteiligung"] },
      herkunft: { kanal: "Direkt" },
      ip: "",
      einwilligung: { am: vorTagen(38), text: "Einwilligung Anfrageformular (Demo)" },
      zustaendigId: admin.id,
      flaecheId: null,
      erstelltAm: vorTagen(38),
      geaendertAm: vorTagen(30),
      demo: true,
    });
  }
}

function bereit(db) {
  if (db.fachFlaeche?.v === VERSION) return;
  db.fachFlaeche = { v: VERSION, am: new Date().toISOString() };
  try {
    demoErgaenzen(db);
  } catch (e) {
    console.warn("[plattform-demo] Fachprüfung-Demodaten nicht ergänzt:", e?.message);
  }
}

/** Einmalige Ergänzung sicherstellen (Seiten rufen das im Demo-Betrieb vor dem Laden auf) */
export async function fachDemoBereit() {
  const db = await lesen();
  if (db.fachFlaeche?.v === VERSION) return;
  await aendern((d) => void bereit(d));
}

const kurzName = (u) => (u ? { vorname: u.vorname, nachname: u.nachname } : null);

/**
 * Gemeinde-Sicht. Nicht-Admins: nur eigene kommunale Anliegen; Projekte erst, wenn das Backoffice
 * ein Anliegen geprüft hat (Status qualifiziert/angebot/abgeschlossen). Backoffice: `vorgangId` Pflicht.
 */
export async function kommuneUebersicht(n, { vorgangId } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  await fachDemoBereit();
  const db = await lesen();
  const admin = n.rollen?.includes("admin");
  let anliegen;
  if (admin) {
    const id = v.kennung(vorgangId);
    if (!id) {
      // Backoffice-Übersicht: alle kommunalen Anliegen (ohne Projekte)
      return {
        admin: true,
        anliegen: db.vorgaenge.filter((x) => x.typ === "kommune").map((x) => anliegenAusgabe(x)),
        gemeinden: [],
        geprueft: false,
      };
    }
    const vg = db.vorgaenge.find((x) => x.id === id);
    if (!vg) throw nichtGefunden("Anliegen nicht gefunden.");
    if (vg.typ !== "kommune") throw verboten("Kein kommunales Anliegen.");
    anliegen = [vg];
  } else {
    anliegen = db.vorgaenge.filter((x) => x.typ === "kommune" && x.nutzerId === n.id);
  }
  const geprueft = anliegen.filter((x) => KOMMUNE_GEPRUEFT.includes(x.status));
  const gemeinden = [];
  for (const vg of geprueft) {
    const g = { name: vg.daten?.gemeinde || vg.kontakt?.firma || "", land: vg.kontakt?.land || vg.daten?.land || "DE", schluessel: vg.daten?.gemeindeSchluessel || "" };
    if (!g.name && !g.schluessel) continue;
    if (gemeinden.some((x) => x.name === g.name && x.land === g.land)) continue;
    const flaechen = db.flaechen.filter((f) => KOMMUNE_SICHTBAR.includes(f.status) && flaecheImGebiet(f, g));
    const projekte = flaechen.map(projektFuerGemeinde);
    const par6 = projekte.reduce((s, p) => s + (p.par6?.euroProJahr || 0), 0);
    const zust = db.nutzer.find((u) => u.id === vg.zustaendigId);
    gemeinden.push({ ...g, vorgangId: vg.id, projekte, summe: { anzahl: projekte.length, ha: projekte.reduce((s, p) => s + p.ha, 0), par6EuroProJahr: g.land === "DE" ? par6 : null }, ansprechpartner: kurzName(zust) });
  }
  return { admin, anliegen: anliegen.map((x) => anliegenAusgabe(x)), gemeinden, geprueft: geprueft.length > 0 };
}

function anliegenAusgabe(vg) {
  return {
    id: vg.id,
    status: vg.status,
    typ: VORGANG_TYPEN[vg.typ] || vg.typ,
    gemeinde: vg.daten?.gemeinde || vg.kontakt?.firma || "",
    land: vg.kontakt?.land || vg.daten?.land || "DE",
    daten: {
      absender: vg.daten?.absender || "",
      rolle: vg.daten?.rolle || "",
      bauleitplanung: vg.daten?.bauleitplanung || "",
      kriterienkatalog: vg.daten?.kriterienkatalog || "",
      interesse6: vg.daten?.interesse6 || "",
      buergerbeteiligung: Array.isArray(vg.daten?.buergerbeteiligung) ? vg.daten.buergerbeteiligung : [],
      gemeindeFlaechenHa: vg.daten?.gemeindeFlaechenHa ?? null,
      themen: Array.isArray(vg.daten?.themen) ? vg.daten.themen : [],
    },
    erstelltAm: vg.erstelltAm,
  };
}
