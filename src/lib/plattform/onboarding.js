// src/lib/plattform/onboarding.js
//
// Geführter Einstieg je Rolle + Checkliste „Erste Schritte“ (rein, ohne Hooks –
// Server und Browser). Der gespeicherte Zustand liegt serverseitig am Konto
// (Demo: nutzer.onboarding, Frappe: Plattform Konto.onboarding, JSON):
//
//   { status: "neu"|"laufend"|"erledigt"|"uebersprungen", schritt: 0…, erledigt: [schrittIds…],
//     checklisteAus: false, aktualisiertAm }
//
// Ob ein Checklisten-Punkt erledigt ist, wird aus echten Daten abgeleitet
// (Fläche vorhanden, Suchprofil gespeichert …) – der gespeicherte Zustand ergänzt nur,
// was sich nicht ablesen lässt (Benachrichtigungen angesehen, Befehlspalette ausprobiert).

export const ONBOARDING_STATUS = ["neu", "laufend", "erledigt", "uebersprungen"];
export const ONBOARDING_SCHRITTE = ["profil", "objekt", "benachrichtigungen", "fertig"];
/** Punkte, die nur über den gespeicherten Zustand erledigt werden können */
export const ONBOARDING_MERKER = ["profil", "objekt", "benachrichtigungen", "bedienung", "fertig"];

export function onboardingLeer() {
  return { status: "neu", schritt: 0, erledigt: [], checklisteAus: false, aktualisiertAm: null };
}

/** Gespeicherten Zustand bereinigen (Positivliste – Server UND Client) */
export function onboardingBereinigen(roh, basis = onboardingLeer()) {
  const o = roh && typeof roh === "object" && !Array.isArray(roh) ? roh : {};
  const status = ONBOARDING_STATUS.includes(o.status) ? o.status : basis.status;
  const schritt = Number.isInteger(o.schritt) && o.schritt >= 0 && o.schritt < ONBOARDING_SCHRITTE.length ? o.schritt : basis.schritt;
  const erledigt = Array.isArray(o.erledigt) ? [...new Set(o.erledigt.filter((x) => ONBOARDING_MERKER.includes(x)))] : basis.erledigt;
  const checklisteAus = typeof o.checklisteAus === "boolean" ? o.checklisteAus : basis.checklisteAus;
  return { status, schritt, erledigt, checklisteAus, aktualisiertAm: basis.aktualisiertAm || null };
}

/** Änderung auf bestehenden Zustand anwenden ({ status?, schritt?, erledigt?: [..] (wird ergänzt), checklisteAus? }) */
export function onboardingAnwenden(alt, aenderung) {
  const a = onboardingBereinigen(alt);
  const neu = onboardingBereinigen({ ...a, ...aenderung, erledigt: [...a.erledigt, ...(Array.isArray(aenderung?.erledigt) ? aenderung.erledigt : [])] }, a);
  // Status nie von „erledigt“ zurück auf „neu“
  if (a.status === "erledigt" && neu.status === "neu") neu.status = "erledigt";
  return neu;
}

const hat = (rollen, ...r) => r.some((x) => rollen.includes(x));

/** Hauptrolle für den Objekt-Schritt des Assistenten */
export function hauptRolle(rollen = []) {
  if (hat(rollen, "flaeche", "landwirt")) return "flaeche";
  if (hat(rollen, "anbieter")) return "anbieter";
  if (hat(rollen, "investor")) return "investor";
  if (hat(rollen, "unternehmen")) return "unternehmen";
  if (hat(rollen, "mitglied")) return "mitglied";
  if (hat(rollen, "admin")) return "admin";
  return "mitglied";
}

/** Texte des Objekt-Schritts je Hauptrolle */
export const OBJEKT_SCHRITT = {
  flaeche: { titel: "Erste Fläche anlegen", kurz: "Fläche", text: "Bezeichnung, Ort und ungefähre Größe genügen. Flurstücke und Unterlagen können Sie später ergänzen." },
  investor: { titel: "Suchprofil anlegen", kurz: "Suchprofil", text: "Welche Projekte suchen Sie? Wir berechnen daraus für jedes Projekt einen Matching-Score und melden neue Treffer." },
  anbieter: { titel: "Erstes Projekt vorbereiten", kurz: "Projekt", text: "Ihr Projekt erscheint anonym als Teaser; vertrauliche Angaben sehen nur Investoren mit NDA. Provision fällt nur bei Abschluss an." },
  unternehmen: { titel: "Anliegen wählen", kurz: "Anliegen", text: "Reststrom-Pool, Solarcarport oder Großspeicher – wählen Sie, womit wir beginnen." },
  mitglied: { titel: "Beteiligung wählen", kurz: "Beteiligung", text: "Genossenschaft oder Energiegemeinschaft – wählen Sie, was Sie interessiert." },
  admin: { titel: "Backoffice kennenlernen", kurz: "Backoffice", text: "Cockpit, Aufgaben und Vorgänge – mit Befehlspalette und Tastenkürzeln geht alles ohne Maus." },
};

/**
 * Checkliste „Erste Schritte“.
 * fakten: { rollen, telefon, emailBestaetigt, suchprofil, flaechen, projekte, vorgaenge, mailEinstellungen }
 */
export function ersteSchritte(fakten, zustand) {
  const z = onboardingBereinigen(zustand);
  const r = fakten.rollen || [];
  const merker = (id) => z.erledigt.includes(id);
  const punkte = [
    { id: "profil", titel: "Profil vervollständigen", text: "Name und Telefonnummer – damit wir Sie bei Rückfragen schnell erreichen.", href: "/portal/profil", erledigt: !!fakten.telefon || merker("profil") },
    { id: "email", titel: "E-Mail-Adresse bestätigen", text: "Danach ordnen wir frühere Anfragen mit Ihrer Adresse automatisch zu.", href: "/portal/profil", erledigt: !!fakten.emailBestaetigt },
  ];
  if (hat(r, "flaeche", "landwirt")) punkte.push({ id: "flaeche", titel: "Erste Fläche anlegen", text: "Die Vorprüfung ist kostenlos und unverbindlich.", href: "/portal/flaechen/neu", erledigt: (fakten.flaechen || 0) > 0 });
  if (hat(r, "investor")) punkte.push({ id: "suchprofil", titel: "Suchprofil anlegen", text: "Passende Projekte erscheinen dann zuerst – mit Matching-Score.", href: "/portal/profil#suchprofil", erledigt: !!fakten.suchprofil });
  if (hat(r, "anbieter")) punkte.push({ id: "projekt", titel: "Erstes Projekt anlegen", text: "Anonymer Teaser, vertraulicher Datenraum, Provision nur bei Abschluss.", href: "/portal/projekte/neu", erledigt: (fakten.projekte || 0) > 0 });
  if (!hat(r, "flaeche", "landwirt", "investor", "anbieter", "admin")) punkte.push({ id: "anfrage", titel: "Erste Anfrage stellen", text: "Reststrom, Carport, Genossenschaft oder Energiegemeinschaft – wir melden uns.", href: "/portal/willkommen?schritt=objekt", erledigt: (fakten.vorgaenge || 0) > 0 });
  punkte.push({ id: "benachrichtigungen", titel: "Benachrichtigungen festlegen", text: "Bestimmen Sie, worüber wir Sie per E-Mail informieren.", href: "/portal/benachrichtigungen", erledigt: merker("benachrichtigungen") || !!fakten.mailEinstellungen });
  punkte.push({ id: "bedienung", titel: "Schnellsuche ausprobieren", text: "Mit Strg + K (Mac: ⌘ + K) finden Sie Flächen, Projekte und Aktionen sofort.", href: "/portal/hilfe", erledigt: merker("bedienung") });
  const erledigt = punkte.filter((p) => p.erledigt).length;
  return { punkte, erledigt, gesamt: punkte.length, quote: Math.round((erledigt / punkte.length) * 100), fertig: erledigt === punkte.length };
}

/** Checkliste im Dashboard zeigen? (bis alles erledigt oder ausgeblendet) */
export function checklisteZeigen(liste, zustand) {
  const z = onboardingBereinigen(zustand);
  return !z.checklisteAus && !liste.fertig;
}
