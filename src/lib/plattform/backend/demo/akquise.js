// src/lib/plattform/backend/demo/akquise.js
//
// Akquise-Pipeline Flächen im Demo-Backend: Scoring (Flächencheck), Priorität (automatisch,
// manuell überschreibbar), Zuständigkeit und Gebietszuordnung (PLZ-Bereiche/Bundesland/Land →
// Mitarbeiter), SLA-Ampel Erstkontakt < 2 Werktage, Massen-Zuweisung.

import * as v from "../../validierung";
import { nichtGefunden } from "../../fehler";
import { BUNDESLAENDER, LAENDER } from "../../konstanten";
import { statusLabel } from "../../prozesse";
import { AKQUISE_BESONDERHEITEN, AKQUISE_NETZ, flaechenScore, gebietFuer, prioritaetAuto, slaStatus } from "../../akquise";
import { jetzt, neueId } from "./hilfen";
import { W, boAendern, boLesen, eingangAm, erstkontaktAm, info, kontaktVon, kurzKonto, nameVon, nutzerVon, objektVon, rechtNoetig, tagsVon } from "./bo-kern";
import { fristenBeiBedarf } from "./automation";

const OFFEN = ["entwurf", "eingegangen", "vorpruefung", "standortanalyse", "pachtangebot", "vertrag", "planung"];

function zeile(db, f) {
  const i = info(db, "flaeche", f.id);
  const s = flaechenScore(f, i);
  const auto = prioritaetAuto(s.score, f.ha);
  const ein = eingangAm(db, "flaeche", f);
  const sla = f.status === "entwurf" && !f.vorgangId ? { ampel: "grau", status: "entwurf", text: "Noch nicht eingereicht" } : slaStatus(ein, erstkontaktAm(db, "flaeche", f, ein));
  const g = gebietFuer(db.bo.gebiete, { land: f.land, bundesland: f.bundesland, plz: f.plz });
  const k = kontaktVon(db, "flaeche", f);
  const eigentuemer = nutzerVon(db, f.nutzerId);
  return {
    id: f.id,
    bezeichnung: f.bezeichnung,
    land: f.land,
    bundesland: f.bundesland,
    plz: f.plz,
    ort: f.ort,
    ha: f.ha,
    nutzung: f.nutzung,
    agri: !!f.agri,
    status: f.status,
    statusLabel: statusLabel("flaeche", f.status),
    vorgangId: f.vorgangId || null,
    score: s.score,
    ampel: s.ampel,
    mwp: s.mwp,
    gruende: s.gruende,
    prioritaet: i.prioritaet || auto,
    prioritaetManuell: !!i.prioritaet,
    prioritaetAuto: auto,
    besonderheiten: i.besonderheiten || [],
    netz: i.netz || "unbekannt",
    tags: tagsVon(db, "flaeche", f.id),
    zustaendig: kurzKonto(nutzerVon(db, f.zustaendigId)),
    gebiet: g ? { id: g.gebiet.id, name: g.gebiet.name, grund: g.grund, mitarbeiter: kurzKonto(nutzerVon(db, g.gebiet.mitarbeiterId)) } : null,
    sla,
    eingangAm: ein,
    kontakt: k ? { id: k.id || null, name: [k.vorname, k.nachname].filter(Boolean).join(" ") || k.email, email: k.email || eigentuemer?.email || "" } : null,
    geaendertAm: f.geaendertAm,
  };
}

const PRIO_RANG = { A: 0, B: 1, C: 2 };
const SLA_RANG = { rot: 0, gelb: 1, gruen: 2, grau: 3 };

export async function akquise(n, { land, prioritaet, sla, zustaendigId, status, q, alle = false } = {}) {
  rechtNoetig(n, "akquise", 1);
  await fristenBeiBedarf();
  const db = await boLesen();
  let liste = db.flaechen.filter((f) => alle || OFFEN.includes(f.status)).map((f) => zeile(db, f));
  const alleZeilen = liste;
  if (land) liste = liste.filter((z) => z.land === land);
  if (prioritaet) liste = liste.filter((z) => z.prioritaet === prioritaet);
  if (sla) liste = liste.filter((z) => z.sla.ampel === sla);
  if (zustaendigId === "ohne") liste = liste.filter((z) => !z.zustaendig);
  else if (zustaendigId) liste = liste.filter((z) => z.zustaendig?.id === zustaendigId);
  if (status) liste = liste.filter((z) => z.status === status);
  if (q) {
    const s = String(q).toLowerCase();
    liste = liste.filter((z) => [z.id, z.bezeichnung, z.ort, z.plz, z.bundesland, z.kontakt?.name, z.kontakt?.email, z.tags.join(" ")].join(" ").toLowerCase().includes(s));
  }
  liste.sort((a, b) => PRIO_RANG[a.prioritaet] - PRIO_RANG[b.prioritaet] || SLA_RANG[a.sla.ampel] - SLA_RANG[b.sla.ampel] || b.score - a.score);
  const summe = (l, f) => Math.round(l.reduce((s, z) => s + (Number(z[f]) || 0), 0) * 10) / 10;
  return {
    flaechen: liste,
    kennzahlen: {
      anzahl: alleZeilen.length,
      ha: summe(alleZeilen, "ha"),
      mwp: summe(alleZeilen, "mwp"),
      slaRot: alleZeilen.filter((z) => z.sla.ampel === "rot").length,
      slaGelb: alleZeilen.filter((z) => z.sla.ampel === "gelb").length,
      ohneZustaendig: alleZeilen.filter((z) => !z.zustaendig).length,
      prioA: alleZeilen.filter((z) => z.prioritaet === "A").length,
      scoreMittel: alleZeilen.length ? Math.round(alleZeilen.reduce((s, z) => s + z.score, 0) / alleZeilen.length) : 0,
    },
    konten: db.nutzer.filter((u) => u.aktiv && u.rollen.includes("admin")).map(kurzKonto),
    gebiete: db.bo.gebiete.map((g) => ({ ...g, mitarbeiter: kurzKonto(nutzerVon(db, g.mitarbeiterId)) })),
  };
}

export async function akquiseSetzen(n, flaecheId, daten = {}) {
  rechtNoetig(n, "akquise", 2);
  return boAendern((db) => {
    const f = objektVon(db, "flaeche", v.kennung(flaecheId));
    if (!f) throw nichtGefunden("Fläche nicht gefunden.");
    const i = info(db, "flaeche", f.id, true);
    const teile = [];
    if (daten.prioritaet !== undefined) {
      i.prioritaet = ["A", "B", "C"].includes(daten.prioritaet) ? daten.prioritaet : null;
      teile.push(`Priorität ${i.prioritaet || "automatisch"}`);
    }
    if (daten.besonderheiten !== undefined) {
      i.besonderheiten = v.mehrfach(daten.besonderheiten, AKQUISE_BESONDERHEITEN.map((b) => b.id));
      teile.push("Besonderheiten");
    }
    if (daten.netz !== undefined) {
      i.netz = v.auswahl(daten.netz, AKQUISE_NETZ.map((x) => x.id), "unbekannt");
      teile.push("Netzentfernung");
    }
    W.protokoll(db, n, "akquise", "flaeche", f.id, `Akquise: ${teile.join(", ") || "gespeichert"}`);
    return zeile(db, f);
  });
}

export async function gebiete(n) {
  rechtNoetig(n, "akquise", 1);
  const db = await boLesen();
  return { gebiete: db.bo.gebiete.map((g) => ({ ...g, mitarbeiter: kurzKonto(nutzerVon(db, g.mitarbeiterId)) })), konten: db.nutzer.filter((u) => u.aktiv && u.rollen.includes("admin")).map(kurzKonto) };
}

/** Gebiete vollständig ersetzen (Liste aus dem Editor) */
export async function gebieteSpeichern(n, liste = []) {
  rechtNoetig(n, "akquise", 2);
  v.pflicht(Array.isArray(liste) && liste.length <= 100, "Höchstens 100 Gebiete.");
  return boAendern((db) => {
    const neu = liste.map((g) => {
      const land = v.auswahl(g.land, LAENDER, "");
      const name = v.text(g.name, 80);
      v.pflicht(name.length >= 2, "Jedes Gebiet braucht einen Namen.");
      const mitarbeiterId = v.kennung(g.mitarbeiterId);
      const u = nutzerVon(db, mitarbeiterId);
      v.pflicht(u && u.aktiv && u.rollen.includes("admin"), `Gebiet „${name}“: Zuständig kann nur ein aktives Backoffice-Konto sein.`);
      const plz = (Array.isArray(g.plz) ? g.plz : String(g.plz || "").split(","))
        .map((x) => String(x).replace(/\s/g, ""))
        .filter(Boolean)
        .slice(0, 30);
      v.pflicht(plz.every((x) => /^\d{1,5}(-\d{1,5})?$/.test(x)), `Gebiet „${name}“: PLZ-Bereiche wie „80-87“ oder „9“ angeben.`);
      const bl = v.mehrfach(g.bundeslaender, land ? BUNDESLAENDER[land] || [] : Object.values(BUNDESLAENDER).flat());
      v.pflicht(land || plz.length || bl.length, `Gebiet „${name}“: Land, Bundesland oder PLZ-Bereich angeben.`);
      return { id: v.kennung(g.id) || neueId("GE"), name, land, bundeslaender: bl, plz, mitarbeiterId, aktiv: g.aktiv !== false };
    });
    db.bo.gebiete = neu;
    W.protokoll(db, n, "akquise", "gebiete", "gebiete", `Gebietszuordnung gespeichert (${neu.length} Gebiete)`);
    return { gebiete: neu.map((g) => ({ ...g, mitarbeiter: kurzKonto(nutzerVon(db, g.mitarbeiterId)) })), gespeichertAm: jetzt() };
  });
}

/** Massen-Zuweisung: nach Gebiet oder an eine Person. Vorgang zur Fläche erhält dieselbe Person, wenn frei. */
export async function akquiseZuweisen(n, { ids = [], modus = "gebiet", zustaendigId, ueberschreiben = false } = {}) {
  rechtNoetig(n, "akquise", 2);
  rechtNoetig(n, "flaechen", 2);
  return boAendern((db) => {
    const liste = (Array.isArray(ids) ? ids : []).map(v.kennung).filter(Boolean).slice(0, 500);
    v.pflicht(liste.length, "Bitte Flächen auswählen.");
    if (modus !== "gebiet") {
      const u = nutzerVon(db, zustaendigId);
      v.pflicht(u && u.aktiv && u.rollen.includes("admin"), "Zuständig kann nur ein aktives Backoffice-Konto sein.");
    }
    const ergebnis = { zugewiesen: 0, uebersprungen: 0, ohneGebiet: 0 };
    for (const id of liste) {
      const f = objektVon(db, "flaeche", id);
      if (!f) continue;
      if (f.zustaendigId && !ueberschreiben) {
        ergebnis.uebersprungen++;
        continue;
      }
      let ziel = zustaendigId;
      let grund = "manuell";
      if (modus === "gebiet") {
        const g = gebietFuer(db.bo.gebiete, { land: f.land, bundesland: f.bundesland, plz: f.plz });
        if (!g) {
          ergebnis.ohneGebiet++;
          continue;
        }
        ziel = g.gebiet.mitarbeiterId;
        grund = `Gebiet „${g.gebiet.name}“`;
      }
      f.zustaendigId = ziel;
      f.geaendertAm = jetzt();
      const vg = f.vorgangId ? objektVon(db, "vorgang", f.vorgangId) : null;
      if (vg && (!vg.zustaendigId || ueberschreiben)) vg.zustaendigId = ziel;
      W.protokoll(db, n, "zuweisen", "flaeche", f.id, `Zuständig: ${nameVon(db, ziel)} (${grund})`);
      ergebnis.zugewiesen++;
    }
    return ergebnis;
  });
}
