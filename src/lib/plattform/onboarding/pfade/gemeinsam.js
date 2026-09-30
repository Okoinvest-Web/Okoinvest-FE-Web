// src/lib/plattform/onboarding/pfade/gemeinsam.js
//
// Wiederkehrende Schritte der Onboarding-Pfade (Profil, Benachrichtigungen, Verifizierung, Termin, Ansprechpartner,
// Zwei-Faktor). Nur Daten – JSON-fähig (Export nach Frappe: scripts/onboarding-pfade-export.mjs).
// Schrittfelder: id, titel, kurz, art (formular|aktion|info), formular, text, texte{untertyp}, punkte[], punkteJe{untertyp},
// links[{href,label,primaer}], linksJe{untertyp}, pflicht (bool | [untertypen]), kriterium, bestaetigbar, bestaetigenText,
// nurFuer [untertypen], begriff (Lexikon-ID).

/** Untertyp wählen (erster Schritt bei Pfaden mit Untertypen) */
export const untertypSchritt = (titel, text) => ({
  id: "typ", titel, kurz: "Ihr Typ", art: "formular", formular: "untertyp", text,
  pflicht: true, kriterium: { fakt: "untertyp" },
});

/** Profil: Name + Telefon (+ Firma, wenn firmaPflicht) */
export function profilSchritt({ firmaPflicht = false, firmaAusser = [], text, titel = "Kontaktdaten und Firma", firmaLabel = "Firma / Organisation" } = {}) {
  const firma = firmaAusser.length ? { eines: [{ fakt: "firma" }, { untertyp: firmaAusser }] } : { fakt: "firma" };
  return {
    id: "profil", titel, kurz: "Profil", art: "formular", formular: "profil", firmaLabel,
    text: text || "Name, Telefon und – falls Sie für ein Unternehmen handeln – die Firma. Mit Telefonnummer klären wir Rückfragen schneller.",
    pflicht: true,
    kriterium: firmaPflicht ? { alle: [{ fakt: "name" }, { fakt: "telefon" }, firma] } : { alle: [{ fakt: "name" }, { eines: [{ fakt: "telefon" }, { merker: true }] }] },
    bestaetigbar: !firmaPflicht,
    bestaetigenText: firmaPflicht ? null : "Ohne Telefon weiter",
  };
}

export const benachrichtigungenSchritt = (text) => ({
  id: "benachrichtigungen", titel: "E-Mail-Benachrichtigungen festlegen", kurz: "Benachrichtigungen", art: "formular", formular: "benachrichtigungen",
  text: text || "Im Portal sehen Sie alles in der Glocke. Per E-Mail kommt nur, was Sie hier wählen – ohne vertrauliche Inhalte.",
  pflicht: false, kriterium: { eines: [{ fakt: "mailEinstellungen" }, { merker: true }] }, bestaetigbar: true, bestaetigenText: "Standard übernehmen",
});

/** Verifizierung (KYC/KYB) anstoßen – erledigt, sobald eingereicht (bzw. in Prüfung/verifiziert) */
export function kycSchritt({ titel = "Verifizierung starten (KYC/KYB)", text, texte, punkte = [], punkteJe, pflicht = true } = {}) {
  return {
    id: "kyc", titel, kurz: "Verifizierung", art: "aktion",
    text: text || "Geldwäscherechtlich müssen wir wissen, mit wem wir Verträge schließen. Die Prüfung ist einmalig und gilt für alle Vorgänge Ihres Kontos.",
    texte, punkte, punkteJe,
    links: [{ href: "/portal/verifizierung", label: "Verifizierung öffnen", primaer: true }],
    pflicht, kriterium: { fakt: "kyc.angestossen" },
  };
}

export function terminSchritt({ art = "beratung_video", titel, text, pflicht = false, label = "Termin wählen" }) {
  return {
    id: "termin", titel, kurz: "Termin", art: "aktion", text,
    links: [{ href: `/portal/termine?art=${art}`, label, primaer: true }],
    pflicht, kriterium: { eines: [{ fakt: "termine" }, { merker: true }] }, bestaetigbar: true, bestaetigenText: "Später selbst buchen",
  };
}

export const ansprechpartnerSchritt = (text) => ({
  id: "ansprechpartner", titel: "Ihr Ansprechpartner", kurz: "Ansprechpartner", art: "info",
  text: text || "Fragen stellen Sie am schnellsten über „Nachrichten“ – direkt am Vorgang, damit nichts verloren geht. Für dringende technische Themen gibt es den Support mit Ticketnummer.",
  punkte: [
    "Nachrichten am Objekt (Fläche, Projekt, Anlage, Anfrage) landen bei der zuständigen Person im Backoffice.",
    "Telefon und E-Mail-Adresse Ihres Ansprechpartners erhalten Sie mit der ersten Antwort – bis dahin bitte über das Portal.",
    "Rückruf gewünscht? Buchen Sie eine Beratung am Telefon unter „Termine“.",
  ],
  links: [{ href: "/portal/nachrichten", label: "Nachrichten öffnen" }, { href: "/portal/support", label: "Support" }],
  pflicht: false, kriterium: { merker: true }, bestaetigbar: true, bestaetigenText: "Verstanden",
});

export const zweiFaktorSchritt = ({ pflicht = false, text } = {}) => ({
  id: "zweifaktor", titel: "Zwei-Faktor-Anmeldung einrichten", kurz: "2FA", art: "aktion",
  text: text || "Eine App wie Google Authenticator, Microsoft Authenticator oder 1Password erzeugt alle 30 Sekunden einen Code. Schützt Ihr Konto, auch wenn das Passwort bekannt würde.",
  links: [{ href: "/portal/sicherheit", label: "Sicherheit öffnen", primaer: true }],
  pflicht, kriterium: { fakt: "zweiFaktor" },
});

export const schnellsucheSchritt = () => ({
  id: "bedienung", titel: "Schnellsuche und Tastenkürzel", kurz: "Schnellsuche", art: "info",
  text: "Mit Strg + K (Mac: ⌘ + K) oder „/“ finden Sie Objekte, Vorgänge und Aktionen ohne Maus. „?“ zeigt alle Tastenkürzel.",
  punkte: ["„g“ und danach ein Buchstabe springt in einen Bereich (z. B. g d = Übersicht).", "Einzeltasten-Kürzel lassen sich in der Hilfe abschalten."],
  links: [{ href: "/portal/hilfe", label: "Hilfe öffnen" }],
  pflicht: false, kriterium: { merker: true }, bestaetigbar: true, bestaetigenText: "Ausprobiert",
});
