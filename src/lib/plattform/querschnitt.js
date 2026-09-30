// src/lib/plattform/querschnitt.js
//
// Querschnittsfunktionen (Team 10) – reine Logik, client- und serverseitig nutzbar (keine Node-Importe):
//  - Dokumente: Freigabestatus, Versionsketten
//  - Benachrichtigungen: Zustellrhythmus (sofort | Tages-Digest), Digest-Text ohne Inhalte
//  - Revisionsprotokoll: Such-/Filterlogik (Demo; Frappe spiegelt sie in plattform/querschnitt_kern.py)
//  - Kontexthilfe: Hilfe- und Handbuch-Verweise je Portalseite
// Frappe-Gegenstück: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/querschnitt_kern.py (gleiche Regeln).

// ---------------------------------------------------------------- Dokumente

/** Freigabestatus eines Dokuments (Backoffice setzt ihn; Nutzer sehen ihn an ihren Uploads) */
export const DOKUMENT_FREIGABE = {
  eingegangen: { label: "Eingegangen", ton: "neutral", text: "Liegt dem Backoffice vor, noch nicht geprüft." },
  in_pruefung: { label: "In Prüfung", ton: "info", text: "Wird vom Backoffice geprüft." },
  freigegeben: { label: "Freigegeben", ton: "ok", text: "Geprüft und freigegeben." },
  abgelehnt: { label: "Nachbesserung nötig", ton: "warn", text: "Bitte eine neue Version hochladen (Begründung siehe Hinweis)." },
};
export const DOKUMENT_FREIGABE_IDS = Object.keys(DOKUMENT_FREIGABE);

/** Freigabestatus eines Dokuments (ohne Angabe: eingegangen) */
export const freigabeVon = (d) => (d?.freigabe?.status && DOKUMENT_FREIGABE[d.freigabe.status] ? d.freigabe.status : "eingegangen");

/**
 * Nur aktuelle Versionen (ohne `ersetztDurch`) mit Anzahl der Vorversionen. Reihenfolge bleibt erhalten.
 * `dokumente` = Liste von Metadaten mit { id, version, vorgaengerId, ersetztDurch }.
 */
export function aktuelleVersionen(dokumente = []) {
  const nachId = new Map(dokumente.map((d) => [d.id, d]));
  return dokumente
    .filter((d) => !d.ersetztDurch || !nachId.has(d.ersetztDurch))
    .map((d) => {
      let n = 0;
      let x = d;
      const gesehen = new Set([d.id]);
      while (x?.vorgaengerId && !gesehen.has(x.vorgaengerId)) {
        gesehen.add(x.vorgaengerId);
        n++;
        x = nachId.get(x.vorgaengerId);
      }
      return { ...d, vorversionen: Math.max(n, (Number(d.version) || 1) - 1) };
    });
}

/** Freitextsuche + Filter über die Dokumentliste (Name, Bezug, Kategorie) */
export function dokumenteFiltern(dokumente = [], { q = "", kategorie = "", bezugArt = "", freigabe = "" } = {}) {
  const such = String(q || "").trim().toLowerCase().slice(0, 80);
  return dokumente.filter(
    (d) =>
      (!kategorie || d.kategorie === kategorie) &&
      (!bezugArt || d.bezugArt === bezugArt) &&
      (!freigabe || freigabeVon(d) === freigabe) &&
      (!such || [d.name, d.bezugTitel, d.bezugId, d.kategorie].join(" ").toLowerCase().includes(such))
  );
}

// ---------------------------------------------------------------- Benachrichtigungen

export const MAIL_RHYTHMEN = {
  sofort: { label: "Sofort", text: "Je Ereignis eine kurze E-Mail mit Link ins Portal." },
  taeglich: { label: "Tages-Digest", text: "Höchstens eine E-Mail am Tag mit der Anzahl neuer Ereignisse je Art." },
};
export const MAIL_RHYTHMUS_IDS = Object.keys(MAIL_RHYTHMEN);
/** Arten, die nie gesammelt werden (sofort per E-Mail, nicht abschaltbar) */
export const DIGEST_AUSNAHMEN = ["sicherheit"];

/**
 * Text des Tages-Digests: nur Anzahl je Ereignisart, keine Inhalte (Vertraulichkeit wie bei Einzel-Mails).
 * `eintraege` = offene Digest-Benachrichtigungen [{ art }], `arten` = BENACHRICHTIGUNG_ARTEN.
 */
export function digestText(eintraege = [], arten = {}) {
  const je = new Map();
  for (const e of eintraege) je.set(e.art, (je.get(e.art) || 0) + 1);
  const zeilen = [...je.entries()].sort((a, b) => b[1] - a[1]).map(([art, anzahl]) => `${arten[art]?.label || art}: ${anzahl}`);
  const summe = eintraege.length;
  return {
    betreff: `${summe} ${summe === 1 ? "neues Ereignis" : "neue Ereignisse"} im Portal – ÖkoInvest`,
    text: `Ihre Zusammenfassung des Tages:\n${zeilen.join("\n")}\n\nDetails finden Sie im Portal unter „Benachrichtigungen“.`,
    anzahl: summe,
  };
}

// ---------------------------------------------------------------- Revisionsprotokoll

const TAG = /^\d{4}-\d{2}-\d{2}$/;

/** Filter bereinigen (Positivliste, Längen) – Demo und Frappe identisch */
export function protokollFilterBereinigen(f = {}) {
  const t = (x, l) => String(x ?? "").trim().slice(0, l);
  return {
    q: t(f.q, 80),
    aktion: t(f.aktion, 40).replace(/[^a-z0-9_-]/gi, ""),
    objektArt: t(f.objektArt, 40).replace(/[^a-z0-9_-]/gi, ""),
    nutzer: t(f.nutzer, 80),
    von: TAG.test(t(f.von, 10)) ? t(f.von, 10) : "",
    bis: TAG.test(t(f.bis, 10)) ? t(f.bis, 10) : "",
    seite: Math.max(1, Math.min(500, Math.floor(Number(f.seite) || 1))),
    proSeite: Math.max(10, Math.min(200, Math.floor(Number(f.proSeite) || 50))),
    alle: f.alle === true, // CSV-Export: alle Treffer (höchstens 5000)
  };
}

/**
 * Einträge filtern (neueste zuerst). `eintraege` = [{ id, am, aktion, objektArt, objektId, text, nutzer, nutzerId, ip }]
 * Freitext `q` durchsucht Text, Objekt-ID, Aktion, Nutzername und Eintrags-ID; `nutzer` = ID oder Namensteil.
 */
export function protokollFiltern(eintraege = [], filter = {}) {
  const f = protokollFilterBereinigen(filter);
  const q = f.q.toLowerCase();
  const nu = f.nutzer.toLowerCase();
  const treffer = eintraege.filter((e) => {
    const tag = String(e.am || "").slice(0, 10);
    if (f.aktion && e.aktion !== f.aktion) return false;
    if (f.objektArt && e.objektArt !== f.objektArt) return false;
    if (f.von && tag < f.von) return false;
    if (f.bis && tag > f.bis) return false;
    if (nu && !(String(e.nutzerId || "").toLowerCase() === nu || String(e.nutzer || "").toLowerCase().includes(nu))) return false;
    if (q && ![e.text, e.objektId, e.aktion, e.nutzer, e.id].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
  treffer.sort((a, b) => String(b.am).localeCompare(String(a.am)));
  const zaehle = (feld) => {
    const m = new Map();
    for (const e of treffer) if (e[feld]) m.set(e[feld], (m.get(e[feld]) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([wert, anzahl]) => ({ wert, anzahl }));
  };
  const start = (f.seite - 1) * f.proSeite;
  return { filter: f, gesamt: treffer.length, eintraege: f.alle ? treffer.slice(0, 5000) : treffer.slice(start, start + f.proSeite), facetten: { aktion: zaehle("aktion"), objektArt: zaehle("objektArt") }, seiten: Math.max(1, Math.ceil(treffer.length / f.proSeite)) };
}

// ---------------------------------------------------------------- Kontexthilfe je Seite

/** Handbücher (docs/handbuch/*.md) – werden unter /portal/hilfe/handbuch/[id] angezeigt */
export const HANDBUECHER = {
  "rolle-eigentuemer": { titel: "Eigentümer, Landwirte, Dachflächen", rollen: ["flaeche", "landwirt"] },
  "rolle-investor": { titel: "Investor", rollen: ["investor"] },
  "rolle-anbieter": { titel: "Anbieter / Verkäufer", rollen: ["anbieter"] },
  "rolle-contracting-kunde": { titel: "Contracting-Kunde", rollen: ["unternehmen"] },
  "rolle-energiebeschaffung-kunde": { titel: "Energiebeschaffung", rollen: ["unternehmen"] },
  "rolle-kommune": { titel: "Kommune", rollen: ["kommune"] },
  "rolle-gutachter": { titel: "Gutachter / Planer", rollen: ["gutachter"] },
  "rolle-lieferant": { titel: "Energieversorger", rollen: ["lieferant"] },
  "rolle-bank": { titel: "Bank", rollen: ["bank"] },
  "rolle-mitglied": { titel: "Mitglied / Bürger", rollen: ["mitglied"] },
  "backoffice-leitung": { titel: "Backoffice: Leitung", rollen: ["admin"] },
  "backoffice-akquise": { titel: "Backoffice: Akquise", rollen: ["admin"] },
  "backoffice-transaktion": { titel: "Backoffice: Transaktion", rollen: ["admin"] },
  "backoffice-buchhaltung": { titel: "Backoffice: Buchhaltung", rollen: ["admin"] },
  "backoffice-betrieb": { titel: "Backoffice: Betrieb", rollen: ["admin"] },
  "backoffice-compliance": { titel: "Backoffice: Compliance", rollen: ["admin"] },
  "backoffice-energie": { titel: "Backoffice: Energie", rollen: ["admin"] },
  "backoffice-projektleitung": { titel: "Backoffice: Projektleitung", rollen: ["admin"] },
};
export const HANDBUCH_IDS = Object.keys(HANDBUECHER);

/** Darf ein Konto dieses Handbuch sehen? (Backoffice-Handbücher nur für das Backoffice) */
export function handbuchErlaubt(id, rollen = []) {
  const h = HANDBUECHER[id];
  if (!h) return false;
  if (rollen.includes("admin")) return true;
  return h.rollen.some((r) => rollen.includes(r));
}

/** Seiten-Hilfe: längster passender Präfix gewinnt. handbuch = Handbuch-ID (optional je Rolle als Funktion) */
const HILFE = [
  { p: "/portal", titel: "Übersicht", text: "Ihre wichtigsten Vorgänge, offenen Schritte und Neuigkeiten auf einen Blick. Mit Strg + K finden Sie alles, mit ? sehen Sie die Tastenkürzel." },
  { p: "/portal/anfragen", titel: "Meine Anfragen", text: "Jede Anfrage zeigt Status, Fortschritt und den Nachrichtenverlauf mit dem Backoffice." },
  { p: "/portal/flaechen", titel: "Flächen", text: "Flächen anlegen, Unterlagen laut Checkliste ergänzen und Pachtangebote prüfen.", handbuch: "rolle-eigentuemer" },
  { p: "/portal/projekte", titel: "Meine Projekte", text: "Projekte einreichen, Datenblatt und Datenraum pflegen, Interessenten und Statistik sehen.", handbuch: "rolle-anbieter" },
  { p: "/portal/boerse", titel: "Projektbörse", text: "Projekte filtern, merken und vergleichen. Vertrauliche Daten öffnen sich nach der NDA-Freigabe.", handbuch: "rolle-investor" },
  { p: "/portal/pipeline", titel: "Deal-Pipeline", text: "Ihre Projekte je Stufe, Notizen und Suchprofile.", handbuch: "rolle-investor" },
  { p: "/portal/finanzierung", titel: "Finanzierungscockpit", text: "Rendite und Finanzierungsvarianten vergleichen, Szenarien speichern und als PDF ausgeben." },
  { p: "/portal/anlagen", titel: "Mein Solarstrom", text: "Erzeugung, Verbrauch und Störungen Ihrer Anlagen – live und als Verlauf.", handbuch: "rolle-contracting-kunde" },
  { p: "/portal/energie", titel: "Energie & Lastgang", text: "Abnahmestellen, Lastgang und Beschaffung über den Reststrom-Pool.", handbuch: "rolle-energiebeschaffung-kunde" },
  { p: "/portal/ausschreibungen", titel: "Angebotsanfragen", text: "Preisblätter abgeben, Fristen und Ergebnisse der Ausschreibungen.", handbuch: "rolle-lieferant" },
  { p: "/portal/bank", titel: "Finanzierungsanfragen", text: "Freigegebene Unterlagen, Term Sheet abgeben, Rückfragen.", handbuch: "rolle-bank" },
  { p: "/portal/kommune", titel: "Gemeinde", text: "Anliegen, Projekte im Gemeindegebiet und Ansprechpartner.", handbuch: "rolle-kommune" },
  { p: "/portal/beteiligung", titel: "Genossenschaft & Gemeinschaft", text: "Stand Ihrer Beteiligung und Pflichthinweise.", handbuch: "rolle-mitglied" },
  { p: "/portal/entwicklung", titel: "Projektentwicklung", text: "Wo steht das Projekt? Meilensteine, Rückfragen und Gutachten-Aufträge.", handbuch: (r) => (r.includes("gutachter") ? "rolle-gutachter" : r.includes("investor") ? "rolle-investor" : "rolle-eigentuemer") },
  { p: "/portal/nachrichten", titel: "Nachrichten", text: "Ein Verlauf je Anfrage, Fläche und Projekt. Anhänge (PDF, JPG, PNG) direkt mitsenden; ein Häkchen zeigt, dass das Gegenüber die Nachricht gelesen hat." },
  { p: "/portal/benachrichtigungen", titel: "Benachrichtigungen", text: "Alle Ereignisse im Portal. Je Ereignisart legen Sie fest, ob zusätzlich eine E-Mail kommt – sofort oder gesammelt als Tages-Digest." },
  { p: "/portal/dokumente", titel: "Dokumente", text: "Zentrale Ablage Ihrer Unterlagen: suchen, filtern, neue Version hochladen und den Prüfstatus des Backoffice sehen." },
  { p: "/portal/profil", titel: "Profil", text: "Stammdaten, Kontaktwege, Benachrichtigungskanäle, Datenexport (Art. 20 DSGVO) und Kontolöschung (Art. 17 DSGVO)." },
  { p: "/portal/sicherheit", titel: "Sicherheit", text: "Zwei-Faktor-Anmeldung, aktive Sitzungen, bekannte Geräte und Anmeldehistorie." },
  { p: "/portal/organisation", titel: "Organisation & Team", text: "Kolleginnen und Kollegen einladen und Teamrollen vergeben (Inhaber, Admin, Mitglied, Nur lesen)." },
  { p: "/portal/verifizierung", titel: "Verifizierung", text: "Identität bzw. Unternehmen prüfen lassen – Voraussetzung für Datenraum, LOI und Auszahlungen." },
  { p: "/portal/termine", titel: "Termine", text: "Termine buchen, umbuchen oder absagen; Einladungen kommen als Kalenderdatei." },
  { p: "/portal/signatur", titel: "Unterschriften", text: "Dokumente elektronisch unterschreiben (einfache elektronische Signatur)." },
  { p: "/portal/support", titel: "Support", text: "Anliegen melden und den Bearbeitungsstand verfolgen." },
  { p: "/portal/abrechnungen", titel: "Abrechnungen", text: "Gutschriften, Rechnungen und Zahlungen mit PDF je Beleg." },
  { p: "/portal/grundbuch", titel: "Grundbuch", text: "Stand der Dienstbarkeit Schritt für Schritt erklärt.", handbuch: "rolle-eigentuemer" },
  { p: "/portal/closing", titel: "Deal-Abschluss", text: "Closing-Bedingungen, Termine und eigene Nachweise." },
  { p: "/portal/admin", titel: "Backoffice-Cockpit", text: "Was heute entschieden werden muss: Freigaben, neue Vorgänge, überfällige Wiedervorlagen.", handbuch: "backoffice-leitung" },
  { p: "/portal/admin/leitung", titel: "Leitungs-Cockpit", text: "Unternehmens-Kennzahlen aller Bereiche und Management-Bericht als PDF.", handbuch: "backoffice-leitung" },
  { p: "/portal/admin/protokoll", titel: "Revisionsprotokoll", text: "Hash-Kette prüfen und Einträge nach Text, Aktion, Objekt, Nutzer und Zeitraum durchsuchen; Treffer als CSV.", handbuch: "backoffice-leitung" },
  { p: "/portal/admin/rechte", titel: "Rechte", text: "Unterrollen je Konto zuweisen; die Matrix zeigt Lesen/Schreiben je Bereich.", handbuch: "backoffice-leitung" },
  { p: "/portal/admin/vorgaenge", titel: "Vorgänge", text: "Anfragen triagieren, zuweisen und beantworten (SLA 2 Werktage).", handbuch: "backoffice-akquise" },
  { p: "/portal/admin/flaechen", titel: "Flächen-Pipeline", text: "Kanban der Flächen von Eingang bis Vertrag.", handbuch: "backoffice-akquise" },
  { p: "/portal/admin/akquise", titel: "Akquise", text: "Priorisierung, Gebiete, Karte und Kampagnen.", handbuch: "backoffice-akquise" },
  { p: "/portal/admin/crm", titel: "CRM", text: "Kontakte, Organisationen, Aktivitäten und Wiedervorlagen.", handbuch: "backoffice-akquise" },
  { p: "/portal/admin/projekte", titel: "Projekt-Freigabe", text: "Eingereichte Projekte prüfen und mit Provisionssatz freigeben.", handbuch: "backoffice-transaktion" },
  { p: "/portal/admin/interessen", titel: "NDA & LOI", text: "NDA-Anfragen und LOIs entscheiden.", handbuch: "backoffice-transaktion" },
  { p: "/portal/admin/dealroom", titel: "Deal-Room", text: "Q&A moderieren, Bieterverfahren steuern.", handbuch: "backoffice-transaktion" },
  { p: "/portal/admin/closing", titel: "Deal-Abschluss", text: "Closing-Räume mit Bedingungen, Notartermin und Kaufpreiszahlung.", handbuch: "backoffice-transaktion" },
  { p: "/portal/admin/deals", titel: "Deals & Provisionen", text: "Provisionen von offen bis bezahlt.", handbuch: "backoffice-buchhaltung" },
  { p: "/portal/admin/finanzen", titel: "Finanzen & Abrechnung", text: "Abrechnungsläufe, offene Posten, Klärfälle und SEPA.", handbuch: "backoffice-buchhaltung" },
  { p: "/portal/admin/anlagen", titel: "Anlagen & Störungen", text: "Störungs-Leitstand, Anlagenpflege und Geräte.", handbuch: "backoffice-betrieb" },
  { p: "/portal/admin/compliance", titel: "Compliance (KYC)", text: "Warteschlange, Prüfung, Sanktionsabgleich und Vier-Augen-Freigabe.", handbuch: "backoffice-compliance" },
  { p: "/portal/admin/energie", titel: "Energie-Handelsdesk", text: "Spot, Termin, Pool, Wechselanalyse und Ausschreibungen.", handbuch: "backoffice-energie" },
  { p: "/portal/admin/entwicklung/steuerung", titel: "Steuerung & Entscheidungen", text: "Projektampel, Pipeline-Bericht je Phase und Land, Kapazität, Risiken, Optionsfristen und Entscheidungsvorlagen.", handbuch: "backoffice-projektleitung" },
  { p: "/portal/admin/entwicklung", titel: "Projektentwicklung", text: "Portfolio, Gantt, Risiken und Übergaben.", handbuch: "backoffice-projektleitung" },
  { p: "/portal/admin/aufgaben", titel: "Aufgaben & Wiedervorlagen", text: "Eigene und zugewiesene Aufgaben, überfällige zuerst." },
  { p: "/portal/admin/kalender", titel: "Kalender", text: "Termine des Teams je Woche/Monat, Verfügbarkeiten und Abwesenheiten." },
];

/** Hilfe zur Seite (oder null). rollen = Rollen des Kontos (für Handbuch-Auswahl und -Recht) */
export function hilfeFuer(pfad, rollen = []) {
  const p = String(pfad || "").split("?")[0];
  let best = null;
  for (const h of HILFE) if ((p === h.p || p.startsWith(h.p + "/")) && (!best || h.p.length > best.p.length)) best = h;
  if (!best) return null;
  let handbuch = typeof best.handbuch === "function" ? best.handbuch(rollen) : best.handbuch || null;
  if (!handbuch || !handbuchErlaubt(handbuch, rollen)) handbuch = standardHandbuch(rollen);
  return { titel: best.titel, text: best.text, handbuch, handbuchTitel: handbuch ? HANDBUECHER[handbuch].titel : null };
}

/** Passendes Handbuch zur ersten Rolle des Kontos */
export function standardHandbuch(rollen = []) {
  if (rollen.includes("admin")) return "backoffice-leitung";
  for (const [id, h] of Object.entries(HANDBUECHER)) if (h.rollen.some((r) => rollen.includes(r)) && !id.startsWith("backoffice")) return id;
  return null;
}
