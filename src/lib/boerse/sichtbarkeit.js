// src/lib/boerse/sichtbarkeit.js
//
// Was von der Projektbörse ÖFFENTLICH gezeigt werden darf (Paket D, Welle 1).
// Grund: § 5/§ 5a UWG – Test- und Vorführdatensätze dürfen nicht als echte
// Angebote erscheinen (MASTERPLAN-DACH Abschnitt 3, Befund 11; Visuelle
// Kontrolle: „Zweites Testprojekt … (Test)“ stand auf der Startseite).
//
// Regeln:
//  - Testdatensätze (Flag `test`/`istTest` oder „test“ in Titel, Region, Slug)
//    werden nie öffentlich gezeigt – auch nicht im Demo-Modus.
//  - Demo-Projekte (`demo: true`, fiktive Vorführdaten) nur im Demo-Modus, dort
//    immer mit sichtbarem Hinweis „Vorführdaten“.
//  - „Live“ nur, wenn kein Demo-Modus aktiv ist und echte Projekte da sind.
//
// Die Erkennung über den Namen ist bewusst grob (lieber ein echtes Projekt zu
// wenig als ein Testprojekt zu viel). Dauerhaft gehört ein Feld `test` in die
// Projektion (src/lib/plattform/oeffentlich.js + Frappe boerse_eintrag) – siehe
// Bericht Paket D, offene Punkte.
//
// Reines Modul ohne Server-Abhängigkeiten, damit es mit node --test prüfbar ist.

const TEST_IM_TEXT = /test/i;

/** true, wenn der Datensatz ein Test- oder Prüfprojekt ist. */
export function istTestprojekt(p) {
  if (!p) return false;
  if (p.test === true || p.istTest === true) return true;
  return [p.titel, p.region, p.slug].some((t) => typeof t === "string" && TEST_IM_TEXT.test(t));
}

/**
 * Darf das Projekt öffentlich (Liste, Startseite, Exposé ohne Sonderrechte) erscheinen?
 * @param {object} p        öffentliche Projektion
 * @param {{demo?: boolean}} opt  demo = Plattform läuft im Demo-Modus
 */
export function istOeffentlichSichtbar(p, { demo = false } = {}) {
  if (!p || istTestprojekt(p)) return false;
  if (p.demo === true && !demo) return false;
  return true;
}

/** Filtert eine Projektliste auf das, was öffentlich gezeigt werden darf. */
export function sichtbareProjekte(projekte, opt = {}) {
  return (Array.isArray(projekte) ? projekte : []).filter((p) => istOeffentlichSichtbar(p, opt));
}

/**
 * Demo-Modus aus Sicht der Seite: Demo-Backend ODER das Backend meldet selbst,
 * dass Vorführdaten in der Börse stehen (Frappe: `demo` in boerse.liste).
 */
export function istDemoAnsicht({ backendDemo = false, daten = null } = {}) {
  return backendDemo === true || daten?.demo === true;
}

/**
 * Hero-Pill der Börse: „Live“ nur ohne Demo und nur mit echten Projekten;
 * die Zahl stammt aus der gefilterten Liste, nicht aus den Rohkennzahlen.
 * @returns {{marke: string, text: string}}
 */
export function boersePill(projekte, { demo = false } = {}) {
  const anzahl = sichtbareProjekte(projekte, { demo }).length;
  if (demo) return { marke: "Demo", text: "Vorführdaten – fiktive Beispielprojekte" };
  if (anzahl === 0) return { marke: "DACH", text: "Projektbörse für Solar und Speicher" };
  return { marke: "Live", text: `${anzahl} ${anzahl === 1 ? "Projekt" : "Projekte"} – jetzt durchsuchen` };
}

/**
 * Eigenprojekt der ÖKOVOLT Gruppe? Nur wenn das Backend das ausdrücklich meldet
 * (`eigenprojekt: true`). Heute liefert die öffentliche Projektion das Feld
 * noch nicht – dann gibt es kein Badge und keine Verkäufer-/Markenangabe.
 */
export function istEigenprojekt(p) {
  return p?.eigenprojekt === true;
}
