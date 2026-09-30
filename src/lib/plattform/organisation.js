// src/lib/plattform/organisation.js
//
// Firmenkonten (Organisationen & Teams) und Konto-Komfort – Stammlisten und Rechtematrix.
// Client- und serverseitig nutzbar (keine Node-Importe). Frappe: plattform/konstanten.py (identisch).
//
// Rechte je Teamrolle (gelten für Objekte der Organisation: Flächen, Projekte, Interessen, Suchprofil):
//   lesen     – sehen (Listen im Organisationskontext, Detailseiten, Nachrichten, Dokumente, Datenraum nach NDA)
//   mitglied  – zusätzlich bearbeiten, Statusschritte als Eigentümer, hochladen, Nachrichten senden, anlegen
//   admin     – zusätzlich Mitglieder einladen/entfernen, Rollen bis „Admin“ vergeben, Stammdaten ändern
//   inhaber   – zusätzlich Inhaberschaft übertragen, Organisation löschen (genau ein Inhaber)

export const ORGANISATION_ARTEN = {
  investmenthaus: { label: "Investmenthaus / Investor", text: "Projekte prüfen, NDA und Datenraum im Team, gemeinsames Suchprofil." },
  projektentwickler: { label: "Projektentwickler", text: "Projekte gemeinsam in die Börse stellen und Interessenten betreuen." },
  stadtwerk: { label: "Stadtwerk / Kommune", text: "Flächen, Projekte und Beteiligungsmodelle im Team verfolgen." },
  betrieb: { label: "Betrieb / Unternehmen", text: "Flächen, Anfragen und Unterlagen des Betriebs an einem Ort." },
};
export const ORGANISATION_ART_IDS = Object.keys(ORGANISATION_ARTEN);

export const TEAM_ROLLEN = {
  inhaber: { label: "Inhaber", stufe: 4, text: "Volle Rechte, überträgt die Inhaberschaft, löscht die Organisation." },
  admin: { label: "Admin", stufe: 3, text: "Verwaltet Mitglieder und Einladungen, bearbeitet alles." },
  mitglied: { label: "Mitglied", stufe: 2, text: "Sieht und bearbeitet die Objekte der Organisation." },
  lesen: { label: "Nur lesen", stufe: 1, text: "Sieht die Objekte der Organisation, ändert nichts." },
};
export const TEAM_ROLLEN_IDS = Object.keys(TEAM_ROLLEN);
/** Rollen, die per Einladung vergeben werden können (Inhaber nur per Übertragung) */
export const EINLADUNG_ROLLEN = ["admin", "mitglied", "lesen"];

export const teamStufe = (rolle) => TEAM_ROLLEN[rolle]?.stufe || 0;
export const darfTeamLesen = (rolle) => teamStufe(rolle) >= 1;
export const darfTeamSchreiben = (rolle) => teamStufe(rolle) >= 2;
export const darfTeamVerwalten = (rolle) => teamStufe(rolle) >= 3;
export const teamRolleLabel = (r) => TEAM_ROLLEN[r]?.label || r;

/** Objektarten, die einer Organisation gehören können */
export const ORGANISATION_OBJEKTE = ["flaeche", "projekt", "interesse"];

/** Einladung: Gültigkeit in Tagen */
export const EINLADUNG_TAGE = 7;
export const MAX_MITGLIEDER = 200;

// ---------------------------------------------------------------- Konto-Komfort

/** Avatarfarben – ausschließlich Tokens des Design-Systems */
export const AVATAR_FARBEN = {
  navy: { label: "Navy", klasse: "bg-navy-700 text-white" },
  gruen: { label: "Grün", klasse: "bg-ov-600 text-white" },
  dunkelgruen: { label: "Dunkelgrün", klasse: "bg-ov-800 text-white" },
  sonne: { label: "Sonne", klasse: "bg-sun-400 text-navy-950" },
  sand: { label: "Sand", klasse: "bg-sand-100 text-ink-900 ring-1 ring-inset ring-ink-200" },
  grau: { label: "Grau", klasse: "bg-ink-700 text-white" },
};
export const avatarKlasse = (farbe) => (AVATAR_FARBEN[farbe] || AVATAR_FARBEN.navy).klasse;

export const SPRACHEN = { de: "Deutsch", en: "English (in Vorbereitung)" };

export function komfortStandard() {
  return { farbe: "navy", sprache: "de", kanaele: { email: true, sicherheitEmail: true } };
}

/** Komfort-Einstellungen bereinigen (Positivliste) */
export function komfortBereinigen(k = {}, basis = komfortStandard()) {
  const kanaele = k?.kanaele && typeof k.kanaele === "object" ? k.kanaele : {};
  return {
    farbe: Object.hasOwn(AVATAR_FARBEN, k?.farbe) ? k.farbe : basis.farbe,
    sprache: Object.hasOwn(SPRACHEN, k?.sprache) ? k.sprache : basis.sprache,
    kanaele: {
      email: typeof kanaele.email === "boolean" ? kanaele.email : basis.kanaele?.email ?? true,
      // Sicherheitsmeldungen (neues Gerät, 2FA, E-Mail-Änderung) gehen immer per E-Mail – nicht abschaltbar
      sicherheitEmail: true,
    },
  };
}
