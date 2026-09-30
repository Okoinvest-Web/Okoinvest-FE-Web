// src/lib/plattform/automation.js
//
// Automationsregeln „Wenn – Und – Dann“ ohne Code. Hier stehen die Bausteine (Auslöser, Bedingungen,
// Aktionen), die Bereinigung einer Regel und die Auswertung der Bedingungen – reine Funktionen für
// Client (Regel-Editor) und Server (Ausführung im Backend: backend/demo/automation.js, Frappe
// plattform/api/automation.py).
//
// Ausführung (Server):
//  - Ereignisse: neuer Vorgang, Statuswechsel, Frist überschritten, Suchprofil-Treffer, Dokument hochgeladen.
//  - Statuswechsel als Aktion NUR über den bestehenden Automaten (prozesse.js, als admin, inkl. Pflichtangaben).
//  - Schleifenschutz: Tiefe höchstens SCHLEIFE.tiefe, jede Regel je Objekt höchstens einmal je Ereigniskette,
//    höchstens SCHLEIFE.proStunde Ausführungen je Regel und Objekt pro Stunde.
//  - Jede Ausführung (auch Testlauf, übersprungen, Fehler) landet im Ausführungsprotokoll.

import { PROZESSE } from "./prozesse";
import { LAENDER, PROJEKT_TYPEN, VORGANG_TYPEN, DOKUMENT_KATEGORIEN } from "./konstanten";

export const SCHLEIFE = { tiefe: 3, proStunde: 3 };

export const OBJEKT_ARTEN = { vorgang: "Anfrage (Vorgang)", flaeche: "Fläche", projekt: "Projekt", interesse: "Projektinteresse", provision: "Provision" };

export const AUSLOESER = {
  vorgang_neu: { label: "Neuer Vorgang", text: "Eine Anfrage geht über die Website ein (optional nur bestimmte Typen – über Bedingung „Typ“)." },
  status: { label: "Statuswechsel", text: "Ein Objekt wechselt in einen Status (optional: von einem bestimmten Status)." },
  frist: { label: "Frist überschritten", text: "Erstkontakt-SLA verletzt, Objekt zu lange im selben Status oder Aufgabe überfällig." },
  suchprofil: { label: "Suchprofil-Treffer", text: "Ein neu veröffentlichtes Projekt passt zum Suchprofil eines Investors." },
  dokument: { label: "Dokument hochgeladen", text: "An einem Vorgang, einer Fläche, einem Projekt oder Interesse wird ein Dokument hochgeladen." },
};

export const FRISTEN = {
  sla_erstkontakt: { label: "Erstkontakt-SLA verletzt", text: "Neue Fläche/Anfrage ohne Erstkontakt nach 2 Werktagen." },
  status_dauer: { label: "Zu lange im Status", text: "Objekt liegt länger als X Tage im gewählten Status." },
  aufgabe_ueberfaellig: { label: "Aufgabe überfällig", text: "Eine offene Aufgabe am Objekt ist überfällig." },
};

/** Felder für Bedingungen (Fakten baut der Server je Ereignis) */
export const BEDINGUNG_FELDER = {
  typ: { label: "Typ", art: "auswahl", werte: { ...VORGANG_TYPEN, ...PROJEKT_TYPEN } },
  land: { label: "Land", art: "auswahl", werte: LAENDER },
  bundesland: { label: "Bundesland / Kanton", art: "text" },
  plz: { label: "PLZ", art: "text" },
  mwp: { label: "MWp", art: "zahl" },
  ha: { label: "Fläche (ha)", art: "zahl" },
  score: { label: "Score (Flächencheck bzw. Suchprofil-Passung)", art: "zahl" },
  kanal: { label: "Herkunft / Kanal", art: "text" },
  status: { label: "Status", art: "text" },
  kategorie: { label: "Dokument-Kategorie", art: "auswahl", werte: DOKUMENT_KATEGORIEN },
  tag: { label: "Tag vorhanden", art: "text" },
};

export const OPERATOREN = {
  gleich: "ist",
  ungleich: "ist nicht",
  in: "ist eines von",
  min: "mindestens",
  max: "höchstens",
  enthaelt: "enthält",
  beginnt: "beginnt mit",
};

export const AKTIONEN = {
  zustaendig: { label: "Zuständigen setzen", text: "Fest oder nach Gebietszuordnung (PLZ/Bundesland/Land)." },
  aufgabe: { label: "Aufgabe anlegen", text: "Wiedervorlage für die zuständige Person, fällig in X Tagen." },
  mail: { label: "E-Mail aus Vorlage", text: "An den Kontakt des Objekts oder die zuständige Person (Postausgang)." },
  nachricht: { label: "Portal-Nachricht aus Vorlage", text: "Nachricht im Thread des Objekts – der Nutzer sieht sie im Portal." },
  tag: { label: "Tag setzen", text: "Schlagwort am Objekt (für Filter, Berichte und weitere Regeln)." },
  status: { label: "Status setzen", text: "Nur erlaubte Übergänge des Automaten (als Backoffice)." },
  prioritaet: { label: "Priorität setzen", text: "A / B / C in der Akquise-Pipeline (nur Flächen)." },
};

export const PRIORITAETEN = { A: "A – sofort", B: "B – normal", C: "C – später" };

const txt = (v, max = 160) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const mehr = (v, max = 2000) => String(v ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").trim().slice(0, max);
const kenn = (v) => (/^[A-Z]{1,3}-[0-9A-Z-]{4,40}$/.test(String(v || "")) ? String(v) : "");

function bedingungBereinigen(b) {
  const feld = BEDINGUNG_FELDER[b?.feld] ? b.feld : null;
  const op = OPERATOREN[b?.op] ? b.op : null;
  if (!feld || !op) return null;
  const def = BEDINGUNG_FELDER[feld];
  if (["min", "max"].includes(op)) {
    const z = Number(String(b.wert).replace(",", "."));
    return Number.isFinite(z) ? { feld, op, wert: z } : null;
  }
  if (op === "in") {
    const liste = (Array.isArray(b.wert) ? b.wert : String(b.wert || "").split(",")).map((x) => txt(x, 60)).filter(Boolean).slice(0, 30);
    return liste.length ? { feld, op, wert: liste } : null;
  }
  const w = txt(b.wert, 80);
  if (!w) return null;
  if (def.art === "auswahl" && def.werte && !def.werte[w]) return null;
  return { feld, op, wert: w };
}

function aktionBereinigen(a) {
  const typ = AKTIONEN[a?.typ] ? a.typ : null;
  if (!typ) return { fehler: "Unbekannte Aktion." };
  switch (typ) {
    case "zustaendig": {
      const ziel = a.mitarbeiterId === "gebiet" ? "gebiet" : kenn(a.mitarbeiterId);
      return ziel ? { typ, mitarbeiterId: ziel } : { fehler: "Zuständigen setzen: Person oder „nach Gebiet“ wählen." };
    }
    case "aufgabe": {
      const titel = txt(a.titel, 160);
      const tage = Math.max(0, Math.min(60, Math.round(Number(a.faelligInTagen) || 0)));
      const z = ["zustaendig", "gebiet"].includes(a.zustaendig) ? a.zustaendig : kenn(a.zustaendig) || "zustaendig";
      return titel.length >= 3 ? { typ, titel, faelligInTagen: tage, zustaendig: z, beschreibung: mehr(a.beschreibung, 1000) } : { fehler: "Aufgabe: Titel mit mind. 3 Zeichen." };
    }
    case "mail":
    case "nachricht": {
      const vorlageId = kenn(a.vorlageId);
      const an = typ === "mail" ? (a.an === "zustaendig" ? "zustaendig" : "kontakt") : undefined;
      return vorlageId ? { typ, vorlageId, ...(an ? { an } : {}) } : { fehler: "Bitte eine Vorlage wählen." };
    }
    case "tag": {
      const tag = txt(a.tag, 40);
      return tag.length >= 2 ? { typ, tag } : { fehler: "Tag: mind. 2 Zeichen." };
    }
    case "status": {
      const nach = txt(a.nach, 40);
      return nach ? { typ, nach, kommentar: mehr(a.kommentar, 500) } : { fehler: "Status setzen: Zielstatus wählen." };
    }
    case "prioritaet":
      return PRIORITAETEN[a.wert] ? { typ, wert: a.wert } : { fehler: "Priorität A, B oder C." };
    default:
      return { fehler: "Unbekannte Aktion." };
  }
}

/** Regel aus Formulareingaben bereinigen. Liefert { regel } oder { fehler } */
export function regelBereinigen(roh = {}) {
  const name = txt(roh.name, 120);
  if (name.length < 3) return { fehler: "Bitte einen Namen (mind. 3 Zeichen) angeben." };
  const a = roh.ausloeser || {};
  const typ = AUSLOESER[a.typ] ? a.typ : null;
  if (!typ) return { fehler: "Bitte einen Auslöser wählen." };
  const ausloeser = { typ };
  if (typ === "vorgang_neu") ausloeser.art = "vorgang";
  if (typ === "suchprofil") ausloeser.art = "projekt";
  if (typ === "status" || typ === "dokument" || typ === "frist") {
    const art = OBJEKT_ARTEN[a.art] ? a.art : typ === "dokument" ? "" : null;
    if (art === null) return { fehler: "Bitte die Objektart wählen." };
    if (typ === "dokument" && art === "provision") return { fehler: "An Provisionen gibt es keine Dokumente." };
    if (art) ausloeser.art = art;
  }
  if (typ === "status") {
    const st = PROZESSE[ausloeser.art]?.status || {};
    if (a.nach && !st[a.nach]) return { fehler: "Unbekannter Zielstatus." };
    if (a.von && !st[a.von]) return { fehler: "Unbekannter Ausgangsstatus." };
    if (a.nach) ausloeser.nach = a.nach;
    if (a.von) ausloeser.von = a.von;
  }
  if (typ === "frist") {
    if (!FRISTEN[a.frist]) return { fehler: "Bitte die Frist wählen." };
    ausloeser.frist = a.frist;
    if (a.frist === "sla_erstkontakt" && !["vorgang", "flaeche"].includes(ausloeser.art)) ausloeser.art = "flaeche";
    if (a.frist === "status_dauer") {
      const st = PROZESSE[ausloeser.art]?.status || {};
      if (!st[a.status]) return { fehler: "Zu lange im Status: Status wählen." };
      ausloeser.status = a.status;
      ausloeser.tage = Math.max(1, Math.min(365, Math.round(Number(a.tage) || 14)));
    }
  }
  const bedingungen = (Array.isArray(roh.bedingungen) ? roh.bedingungen : []).slice(0, 10).map(bedingungBereinigen).filter(Boolean);
  const aktionen = [];
  for (const x of (Array.isArray(roh.aktionen) ? roh.aktionen : []).slice(0, 8)) {
    const r = aktionBereinigen(x);
    if (r.fehler) return { fehler: r.fehler };
    if (r.typ === "status" && !PROZESSE[ausloeser.art || "vorgang"]?.status?.[r.nach]) return { fehler: "Status setzen: Zielstatus passt nicht zur Objektart." };
    if (r.typ === "prioritaet" && !["flaeche", "vorgang"].includes(ausloeser.art)) return { fehler: "Priorität gibt es nur für Flächen bzw. Flächen-Anfragen." };
    aktionen.push(r);
  }
  if (!aktionen.length) return { fehler: "Bitte mindestens eine Aktion festlegen." };
  return { regel: { name, aktiv: roh.aktiv !== false, beschreibung: mehr(roh.beschreibung, 500), ausloeser, bedingungen, aktionen } };
}

const norm = (v) => String(v ?? "").toLowerCase().trim();

/** Eine Bedingung gegen die Fakten eines Ereignisses prüfen */
export function bedingungErfuellt(b, fakten = {}) {
  if (b.feld === "tag") {
    const tags = (fakten.tags || []).map(norm);
    const w = norm(b.wert);
    if (b.op === "ungleich") return !tags.includes(w);
    if (b.op === "in") return b.wert.some((x) => tags.includes(norm(x)));
    return tags.includes(w);
  }
  const f = fakten[b.feld];
  switch (b.op) {
    case "gleich":
      return norm(f) === norm(b.wert);
    case "ungleich":
      return norm(f) !== norm(b.wert);
    case "in":
      return b.wert.map(norm).includes(norm(f));
    case "min":
      return Number.isFinite(Number(f)) && f !== null && f !== "" && Number(f) >= b.wert;
    case "max":
      return Number.isFinite(Number(f)) && f !== null && f !== "" && Number(f) <= b.wert;
    case "enthaelt":
      return norm(f).includes(norm(b.wert));
    case "beginnt":
      return norm(f).startsWith(norm(b.wert));
    default:
      return false;
  }
}

/** Passt der Auslöser der Regel zum Ereignis? */
export function ausloeserPasst(regel, ereignis) {
  const a = regel.ausloeser || {};
  if (a.typ !== ereignis.typ) return false;
  if (a.art && ereignis.art && a.art !== ereignis.art) return false;
  if (a.typ === "status") {
    if (a.nach && a.nach !== ereignis.nach) return false;
    if (a.von && a.von !== ereignis.von) return false;
  }
  if (a.typ === "frist" && a.frist !== ereignis.frist) return false;
  return true;
}

/** Bedingungen auswerten: { passt, ergebnisse: [{ bedingung, erfuellt, istWert }] } */
export function bedingungenPruefen(regel, fakten) {
  const ergebnisse = (regel.bedingungen || []).map((b) => ({ bedingung: b, erfuellt: bedingungErfuellt(b, fakten), istWert: b.feld === "tag" ? (fakten.tags || []).join(", ") : fakten[b.feld] ?? null }));
  return { passt: ergebnisse.every((e) => e.erfuellt), ergebnisse };
}

/** Kurzbeschreibung für Listen („Wenn … und … dann …“) */
export function regelText(regel, { vorlagen = {}, konten = {} } = {}) {
  const a = regel.ausloeser || {};
  let wenn = AUSLOESER[a.typ]?.label || a.typ;
  if (a.typ === "status") wenn = `${OBJEKT_ARTEN[a.art] || ""} wechselt${a.von ? ` von „${PROZESSE[a.art]?.status?.[a.von]?.label}“` : ""}${a.nach ? ` nach „${PROZESSE[a.art]?.status?.[a.nach]?.label}“` : ""}`;
  if (a.typ === "frist") wenn = `${FRISTEN[a.frist]?.label}${a.frist === "status_dauer" ? ` (${OBJEKT_ARTEN[a.art]} > ${a.tage} Tage „${PROZESSE[a.art]?.status?.[a.status]?.label}“)` : a.art ? ` (${OBJEKT_ARTEN[a.art]})` : ""}`;
  if (a.typ === "dokument" && a.art) wenn = `Dokument an ${OBJEKT_ARTEN[a.art]}`;
  const und = (regel.bedingungen || []).map((b) => {
    const def = BEDINGUNG_FELDER[b.feld];
    const w = Array.isArray(b.wert) ? b.wert.map((x) => def.werte?.[x] || x).join(", ") : def.werte?.[b.wert] || b.wert;
    return `${def.label} ${OPERATOREN[b.op]} ${w}`;
  });
  const dann = (regel.aktionen || []).map((x) => {
    if (x.typ === "zustaendig") return x.mitarbeiterId === "gebiet" ? "Zuständig nach Gebiet" : `Zuständig: ${konten[x.mitarbeiterId] || x.mitarbeiterId}`;
    if (x.typ === "aufgabe") return `Aufgabe „${x.titel}“ (${x.faelligInTagen} Tg.)`;
    if (x.typ === "mail") return `E-Mail „${vorlagen[x.vorlageId] || x.vorlageId}“ an ${x.an === "zustaendig" ? "Zuständige" : "Kontakt"}`;
    if (x.typ === "nachricht") return `Nachricht „${vorlagen[x.vorlageId] || x.vorlageId}“`;
    if (x.typ === "tag") return `Tag „${x.tag}“`;
    if (x.typ === "status") return `Status → ${PROZESSE[a.art || "vorgang"]?.status?.[x.nach]?.label || x.nach}`;
    if (x.typ === "prioritaet") return `Priorität ${x.wert}`;
    return x.typ;
  });
  return { wenn, und, dann };
}
