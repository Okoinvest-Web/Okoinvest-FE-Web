// src/components/formular – gemeinsame Formular- und Assistenten-Bausteine (Team T5, DESIGN.md § 4 „Formulare“)
//
// Einzelimporte bevorzugen (Client-Bausteine): z. B. import Textfeld from "@/components/formular/Textfeld".
// Übersicht:
//   stil.js         Klassen (feldKlasse, labelKlasse, …) und beschreibungIds()
//   FeldRahmen.js   Label + Hilfetext/Fehler
//   Textfeld.js     Eingabe/Textbereich/Auswahl mit Erfolgshäkchen
//   PasswortFeld.js Anzeigen/Verbergen, Feststelltaste, Stärkeanzeige
//   CodeEingabe.js  Einmalcode als Einzelfelder (Einfügen, Autofill, Pfeiltasten)
//   useFormular.js  Zustand + Inline-Validierung (beim Verlassen), Fokus auf ersten Fehler + Schütteln
//   Absenden.js     AbsendeKnopf + useAbsenden (Laden → Haken → Toast)
//   Schritte.js     SchrittFortschritt, SchrittBuehne, useSchrittRichtung
//   Entwurf.js      useEntwurf + AutosaveHinweis (sessionStorage)
//   Meldungen.js    FormFehler, FormErfolg, ErfolgsAnsicht, Zusammenfassung

export { default as FeldRahmen, FeldMeldung, FehlerIcon } from "./FeldRahmen";
export { default as Textfeld, ErfolgsZeichen } from "./Textfeld";
export { default as PasswortFeld, StaerkeAnzeige } from "./PasswortFeld";
export { default as CodeEingabe } from "./CodeEingabe";
export { default as useFormular, regel } from "./useFormular";
export { AbsendeKnopf, useAbsenden } from "./Absenden";
export { SchrittFortschritt, SchrittBuehne, useSchrittRichtung } from "./Schritte";
export { useEntwurf, AutosaveHinweis, entwurfVorbelegen } from "./Entwurf";
export { FormFehler, FormErfolg, ErfolgsAnsicht, Zusammenfassung } from "./Meldungen";
export * from "./stil";
export { default as AusfuellFortschritt, pflichtErfuellt } from "./AusfuellFortschritt";
