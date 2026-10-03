// src/lib/land/zonen.js – Zonenmodell (Masterplan Abschnitt 4, ADR-L1)
//
//  - Länderzonen /de, /at, /ch: alles, was rechtlich, rechnerisch oder sprachlich je Land abweicht.
//    Welche Seiten es dort gibt, steht in stufen.js.
//  - Neutraler Stamm: GESCHLOSSENE Liste aus dem Masterplan. Erweitern nur mit Entscheidung
//    des Inhabers (Masterplan ändern, dann hier eintragen; ein Test vergleicht beide Listen).
//  - Ohne Präfix: /en, Portal, Login, Einladungen, API sowie die Token-Strecken /bericht und /p.
//
// Ein Pfad gehört zum Stamm bzw. zu „ohne Präfix“, wenn er gleich einem Eintrag ist oder
// darunter liegt (/projektboerse/karte gehört zu /projektboerse). Der Stamm-Eintrag "/" gilt
// nur für die Startseite selbst.

/** Neutraler Stamm (geschlossene Liste, Masterplan Abschnitt 4 „Zonenmodell“). */
export const STAMM = Object.freeze([
  "/",
  "/wissen",
  "/projektboerse",
  "/investoren",
  "/unternehmen",
  "/referenzen",
  "/kontakt",
  "/impressum",
  "/datenschutz",
  "/presse",
  "/hinweisgeber",
  "/quellen",
  "/sicherheit",
]);

/** Ohne Präfix laut Masterplan: /en, Portal, Login, Einladungen, API – dazu /bericht und /p (Welle 2, B4/GRP). */
export const OHNE_PRAEFIX = Object.freeze(["/en", "/portal", "/login", "/einladung", "/api", "/bericht", "/p"]);

/**
 * Bestehende Seiten, die der Masterplan nicht ausdrücklich einordnet. Sie bleiben ohne Präfix,
 * weil sie keine Länderinhalte tragen (Strecken der Anmeldung, Token-Seiten, interner
 * Styleguide) oder Rechtstexte sind, die die Rechtsabteilung gesamthaft prüft.
 * Abweichung vom Plan, im Bericht vermerkt – Einordnung je Eintrag bestätigen (TODO-Inhaber).
 */
export const OHNE_PRAEFIX_ERGAENZT = Object.freeze([
  { pfad: "/registrieren", grund: "Teil der Anmeldestrecke (wie /login)" },
  { pfad: "/passwort-vergessen", grund: "Teil der Anmeldestrecke (wie /login)" },
  { pfad: "/angebot", grund: "Briefcode-Strecke mit persönlichem Code (wie /einladung)" },
  { pfad: "/termin", grund: "Terminbuchung für alle Länder, Land wird im Formular gewählt" },
  { pfad: "/design", grund: "interner Styleguide (noindex)" },
  { pfad: "/barrierefreiheit", grund: "Rechtstext (Barrierefreiheitserklärung) – Prüfung Rechtsabteilung, ob Stamm" },
  { pfad: "/nutzungsbedingungen", grund: "Rechtstext (Entwurf) – Prüfung Rechtsabteilung, ob Stamm oder je Land" },
  { pfad: "/bedingungen", grund: "Rechtstexte (Entwürfe) – Prüfung Rechtsabteilung, ob Stamm oder je Land" },
]);

/**
 * Technische Dateien der Website (Next.js-Metadaten-Routen, Bilder, Skripte). Sie sind keine
 * Seiten und gehören zu keiner Zone; die Linkprüfung ignoriert sie.
 */
export const TECHNISCH = Object.freeze(["/_next", "/img", "/geo", "/sitemap", "/robots.txt", "/manifest.webmanifest", "/llms.txt", "/icon", "/apple-touch-icon.png", "/favicon.ico", "/portal.webmanifest", "/sw-portal.js", "/portal-offline.html"]);

/** Alte Pfade, die beim Umzug den Namen wechseln und im Stamm bleiben (Ratgeber gehört zum Wissen). */
export const UMBENANNT = Object.freeze([{ alt: "/ratgeber", neu: "/wissen/ratgeber" }]);

const unter = (pfad, basis) => (basis === "/" ? pfad === "/" : pfad === basis || pfad.startsWith(`${basis}/`));

/** Pfad ohne Query und Anker; "" → "/" */
export function nurPfad(pfad) {
  const s = String(pfad ?? "").split(/[?#]/)[0];
  if (!s) return "/";
  return s.length > 1 ? s.replace(/\/+$/, "") || "/" : s;
}

/**
 * Zone eines Pfads OHNE Länderpräfix.
 * @returns {"stamm" | "ohne-praefix" | "technisch" | "land"}
 */
export function zoneFuer(pfad) {
  const p = nurPfad(pfad);
  if (STAMM.some((b) => unter(p, b))) return "stamm";
  if (OHNE_PRAEFIX.some((b) => unter(p, b)) || OHNE_PRAEFIX_ERGAENZT.some((e) => unter(p, e.pfad))) return "ohne-praefix";
  if (TECHNISCH.some((b) => p === b || p.startsWith(b))) return "technisch";
  return "land";
}

/** Bekommt dieser (präfixlose) Pfad niemals ein Länderpräfix? */
export const ohnePraefixImmer = (pfad) => zoneFuer(pfad) !== "land";

/** Alter Pfad im Stamm mit neuem Namen ("/ratgeber/x" → "/wissen/ratgeber/x"); sonst null */
export function umbenannt(pfad) {
  const p = nurPfad(pfad);
  for (const u of UMBENANNT) if (unter(p, u.alt)) return u.neu + p.slice(u.alt.length);
  return null;
}
